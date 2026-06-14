#!/usr/bin/env node
'use strict';
// write-guard.js — PreToolUse hook that blocks writes to harness governance files.
// Reads write-matrix.json. Only fires on paths within .claude/harness/.
//
// Principal model:
//   HARNESS_CADENCE=true  → "recorder" principal (restricted to recorder_allowed)
//   No env var            → "development" principal (recorder_allowed + development_allowed)
//   applier_allowed paths NEVER pass through write-guard — they go through apply-gate.js.
//   blocked is checked FIRST, before any allowlist.
//   Unknown/unmatched paths are blocked (fail closed).

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MATRIX_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'config', 'write-matrix.json');

// matchGlob expects forward-slash normalised paths (caller must normalise).
function matchGlob(filePath, pattern) {
  if (typeof pattern !== 'string') return false;
  const re = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00/g, '.*');
  return new RegExp('^' + re + '$').test(filePath);
}

// HARNESS_CADENCE is env-var-based and can be spoofed by any process that sets
// it before invoking Claude. This is a known limitation — cryptographic principal
// identity is deferred. Do not treat this as a hard security boundary.
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

function main() {
  // stdin is provided by the hook runner; if unreadable, the path is unknown
  // so we cannot determine whether it is a harness path — exit 0 (allow).
  let stdin = '';
  try { stdin = fs.readFileSync(0, 'utf8'); } catch { process.exit(0); }

  let hookData = {};
  try { hookData = JSON.parse(stdin); } catch { process.exit(0); }

  const filePath = (hookData.tool_input || {}).file_path || '';
  if (!filePath) process.exit(0);

  const norm = filePath.replace(/\\/g, '/');
  const marker = '.claude/harness/';
  const idx = norm.indexOf(marker);
  if (idx === -1) process.exit(0);

  const relPath = norm.slice(idx);

  let matrix;
  try { matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8')); }
  catch { block(relPath, 'write-matrix.json missing or corrupt — failing closed'); return; }

  const principal = getPrincipal();

  // 1. Blocked paths checked FIRST — always, regardless of principal.
  for (const entry of (matrix.blocked || [])) {
    if (matchGlob(relPath, entry.path)) {
      block(relPath, entry.reason + ' [principal: ' + principal + ']');
      return;
    }
  }

  // 2. applier_allowed paths NEVER pass through write-guard.
  //    They must go through apply-gate.js. Block them here for any principal.
  for (const entry of (matrix.applier_allowed || [])) {
    if (matchGlob(relPath, entry.path)) {
      block(relPath, 'applier_allowed path must go through apply-gate.js, not write-guard [principal: ' + principal + ']');
      return;
    }
  }

  // 3. Check principal-appropriate allowlists.
  //    Recorder: recorder_allowed only.
  //    Development: recorder_allowed + development_allowed.
  for (const entry of (matrix.recorder_allowed || [])) {
    if (matchGlob(relPath, entry.path)) {
      process.exit(0);
    }
  }

  if (principal === 'development') {
    for (const entry of (matrix.development_allowed || [])) {
      if (matchGlob(relPath, entry.path)) {
        process.exit(0);
      }
    }
  }

  // 4. Fail closed: path not in any allowlist for this principal.
  block(relPath, 'path not in any allowlist for principal ' + principal + ' in write-matrix.json');
}

try { main(); } catch (e) {
  process.stderr.write('write-guard: unexpected error: ' + (e.message || e) + '\n');
  // Fail closed: emit block so the hook framework does not silently allow the write.
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'HARNESS_WRITE_DENIED: unexpected error in write-guard — failing closed'
  }));
  process.exit(0);
}
