#!/usr/bin/env node
'use strict';
// write-guard.js - PreToolUse hook that blocks writes to harness governance files.
// Reads write-matrix.json. Only fires on paths within .claude/harness/.
//
// Principal model:
//   HARNESS_CADENCE=true  -> "recorder" principal (restricted to recorder_allowed)
//   No env var            -> "development" principal (recorder_allowed + development_allowed)
//   applier_allowed paths NEVER pass through write-guard - they go through apply-gate.js.
//   blocked is checked FIRST, before any allowlist.
//   Unknown/unmatched paths are blocked (fail closed).
//
// Mode enforcement (M4+D3):
//   Each allowlist entry has an optional `mode` field. After an allowlist match,
//   the mode is checked before allowing the write:
//     create_only       - file must NOT exist (immutable once written)
//     append_or_create  - always allowed
//     append            - file MUST exist; Write tool blocked (only Edit allowed)
//     overwrite         - always allowed
//     create_or_overwrite - always allowed
//     undefined/missing - allowed (backwards compat)
//
// Path canonicalization:
//   All paths are lowercased for matching (Windows case-insensitive filesystem).
//   Path traversal segments (..) are resolved before matching to prevent
//   bypass via data/../lib/evil.js matching data/** but resolving to lib/.

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MATRIX_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'config', 'write-matrix.json');

function matchGlob(filePath, pattern) {
  if (typeof pattern !== 'string') return false;
  const re = pattern.toLowerCase()
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00/g, '.*');
  return new RegExp('^' + re + '$').test(filePath);
}

function getPrincipal() {
  return process.env.HARNESS_CADENCE === 'true' ? 'recorder' : 'development';
}

function block(relPath, reason) {
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'HARNESS_WRITE_DENIED: ' + reason + ' — path: ' + relPath
  }));
  process.exit(0);
}

function checkMode(entry, relPath, filePath, toolName) {
  const mode = entry.mode;
  if (!mode) return true;

  if (mode === 'append_or_create' || mode === 'overwrite' || mode === 'create_or_overwrite') {
    return true;
  }

  const resolvedPath = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(PROJECT_DIR, relPath);

  if (mode === 'create_only') {
    if (fs.existsSync(resolvedPath)) {
      block(relPath, 'create_only mode: file already exists — proposals are immutable once written');
      return false;
    }
    return true;
  }

  if (mode === 'append') {
    if (!fs.existsSync(resolvedPath)) {
      block(relPath, 'append mode: file does not exist — append requires an existing file');
      return false;
    }
    if (toolName === 'Write') {
      block(relPath, 'append mode: Write tool overwrites entire file — only Edit allowed for append-only files');
      return false;
    }
    return true;
  }

  block(relPath, 'unknown mode "' + mode + '" in write-matrix.json — failing closed');
  return false;
}

// Canonicalize: resolve .. segments, collapse ., remove empty segments.
function canonicalizePath(rawPath) {
  const parts = rawPath.split('/');
  const resolved = [];
  for (const part of parts) {
    if (part === '..') {
      if (resolved.length > 0) resolved.pop();
    } else if (part !== '' && part !== '.') {
      resolved.push(part);
    }
  }
  return resolved.join('/');
}

function main() {
  let stdin = '';
  try { stdin = fs.readFileSync(0, 'utf8'); } catch { process.exit(0); }

  let hookData = {};
  try { hookData = JSON.parse(stdin); } catch { process.exit(0); }

  const filePath = (hookData.tool_input || {}).file_path || '';
  if (!filePath) process.exit(0);

  const toolName = hookData.tool_name || '';

  const norm = filePath.replace(/\\/g, '/');
  const principal = getPrincipal();

  // Compute project-relative path for cadence_governed matching
  var projectNorm = PROJECT_DIR.replace(/\\/g, '/').replace(/\/$/, '');
  var projectRel = norm;
  var projLower = norm.toLowerCase();
  var projBase = projectNorm.toLowerCase();
  if (projLower.startsWith(projBase + '/')) {
    projectRel = norm.slice(projectNorm.length + 1);
  } else if (projLower.startsWith(projBase + '\\')) {
    projectRel = norm.slice(projectNorm.length + 1);
  }
  projectRel = canonicalizePath(projectRel).toLowerCase();

  // Cadence-governed targets: during cadence, writes to governed paths
  // outside .claude/harness/ must go through apply-gate, not tool writes.
  if (principal === 'recorder') {
    var matrix0;
    try { matrix0 = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8')); } catch { /* checked below */ }
    if (matrix0) {
      var govTargets = matrix0.cadence_governed || [];
      for (var gi = 0; gi < govTargets.length; gi++) {
        if (matchGlob(projectRel, govTargets[gi].path)) {
          block(projectRel, govTargets[gi].reason + ' [principal: recorder]');
          return;
        }
      }
    }
  }

  // Case-insensitive marker detection (Windows filesystem is case-insensitive)
  const marker = '.claude/harness/';
  const idx = norm.toLowerCase().indexOf(marker);
  if (idx === -1) process.exit(0);

  // Extract harness-relative portion, canonicalize, and lowercase for matching
  const rawRel = norm.slice(idx);
  const relPath = canonicalizePath(rawRel).toLowerCase();

  // After canonicalization, verify path is still within harness
  // (traversal like data/../../../CLAUDE.md would resolve outside)
  if (!relPath.startsWith(marker)) process.exit(0);

  var matrix;
  try { matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8')); }
  catch { block(relPath, 'write-matrix.json missing or corrupt — failing closed'); return; }

  // 1. Blocked paths checked FIRST - always, regardless of principal.
  for (const entry of (matrix.blocked || [])) {
    if (matchGlob(relPath, entry.path)) {
      block(relPath, entry.reason + ' [principal: ' + principal + ']');
      return;
    }
  }

  // 2. applier_allowed paths NEVER pass through write-guard.
  for (const entry of (matrix.applier_allowed || [])) {
    if (matchGlob(relPath, entry.path)) {
      block(relPath, 'applier_allowed path must go through apply-gate.js, not write-guard [principal: ' + principal + ']');
      return;
    }
  }

  // 3. Check principal-appropriate allowlists.
  for (const entry of (matrix.recorder_allowed || [])) {
    if (matchGlob(relPath, entry.path)) {
      if (checkMode(entry, relPath, filePath, toolName)) {
        process.exit(0);
      }
      return;
    }
  }

  if (principal === 'development') {
    for (const entry of (matrix.development_allowed || [])) {
      if (matchGlob(relPath, entry.path)) {
        if (checkMode(entry, relPath, filePath, toolName)) {
          process.exit(0);
        }
        return;
      }
    }
  }

  // 4. Fail closed: path not in any allowlist for this principal.
  block(relPath, 'path not in any allowlist for principal ' + principal + ' in write-matrix.json');
}

try { main(); } catch (e) {
  process.stderr.write('write-guard: unexpected error: ' + (e.message || e) + '\n');
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'HARNESS_WRITE_DENIED: unexpected error in write-guard — failing closed'
  }));
  process.exit(0);
}
