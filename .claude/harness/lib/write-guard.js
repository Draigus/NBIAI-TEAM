#!/usr/bin/env node
'use strict';
// write-guard.js — PreToolUse hook that blocks writes to harness governance files.
// Reads write-matrix.json. Only fires on paths within .claude/harness/.
// Paths outside harness scope are not affected (apply allowlist is enforced by
// CLAUDE.md rules and the weekly routine prompt, not by this hook).

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MATRIX_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'config', 'write-matrix.json');

function matchGlob(filePath, pattern) {
  const re = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00/g, '.*');
  return new RegExp('^' + re + '$').test(filePath);
}

function main() {
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
  catch { process.exit(0); }

  for (const entry of (matrix.recorder_allowed || [])) {
    if (matchGlob(relPath, entry.path)) process.exit(0);
  }
  for (const entry of (matrix.applier_allowed || [])) {
    if (matchGlob(relPath, entry.path)) process.exit(0);
  }
  for (const entry of (matrix.development_allowed || [])) {
    if (matchGlob(relPath, entry.path)) process.exit(0);
  }

  for (const entry of (matrix.blocked || [])) {
    if (matchGlob(relPath, entry.path)) {
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: 'HARNESS_WRITE_DENIED: ' + entry.reason + ' — path: ' + relPath
      }));
      process.exit(0);
    }
  }

  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'HARNESS_WRITE_DENIED: path ' + relPath + ' is not in any allowlist entry in write-matrix.json.'
  }));
}

try { main(); } catch { /* never break hook chain */ }
