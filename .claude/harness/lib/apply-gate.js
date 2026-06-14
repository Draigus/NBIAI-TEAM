#!/usr/bin/env node
'use strict';
// apply-gate.js — Mechanical auto-apply gate for the RHO harness.
// Validates AND performs writes. The cadence prompt must use this script
// instead of writing directly — it is the only approved write path for
// LOW-risk auto-apply during the weekly routine.
//
// Validates: target is LOW-risk in risk-policy.json, operation is additive,
// target is not under governed paths, path is canonical (no traversal).
// If all checks pass, performs the write itself.
//
// Usage: <content> | node .claude/harness/lib/apply-gate.js <target_path> <operation>
//   operation: create | append
//   content: passed via stdin
// Exit 0 = write performed. Exit 1 = blocked (reason on stderr).

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const POLICY_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'config', 'risk-policy.json');

const GOVERNED_PATHS = [
  '.claude/harness/config/',
  '.claude/harness/lib/',
  '.claude/harness/tests/',
  '.claude/settings.json',
  '.claude/settings.local.json'
];

const ALLOWED_OPERATIONS = ['create', 'append'];

function matchGlob(filePath, pattern) {
  const re = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00/g, '.*');
  return new RegExp('^' + re + '$').test(filePath);
}

function fail(reason) {
  process.stderr.write('APPLY_GATE_BLOCKED: ' + reason + '\n');
  process.exit(1);
}

function canonicalize(targetPath) {
  const resolved = path.resolve(PROJECT_DIR, targetPath);
  const normProject = PROJECT_DIR.replace(/\\/g, '/').replace(/\/$/, '');
  const normResolved = resolved.replace(/\\/g, '/');

  if (!normResolved.startsWith(normProject + '/')) {
    return null;
  }

  return normResolved.slice(normProject.length + 1);
}

function main() {
  const targetPath = process.argv[2];
  const operation = process.argv[3];

  if (!targetPath || !operation) {
    fail('Usage: <content> | apply-gate.js <target_path> <operation>');
  }

  // Read content from stdin
  let content = '';
  try { content = fs.readFileSync(0, 'utf8'); } catch {}
  if (!content) {
    fail('no content provided on stdin');
  }

  // Canonicalize: resolve to absolute, verify under PROJECT_DIR, convert to repo-relative
  const canonical = canonicalize(targetPath);
  if (canonical === null) {
    fail('target resolves outside project root');
  }

  // Block 1: governed paths are never auto-apply targets
  for (const gov of GOVERNED_PATHS) {
    if (canonical.startsWith(gov) || canonical === gov.replace(/\/$/, '')) {
      fail('target is under governed path ' + gov);
    }
  }

  // Block 2: only additive operations allowed (create or append, not overwrite)
  if (!ALLOWED_OPERATIONS.includes(operation)) {
    fail('operation "' + operation + '" is not additive');
  }

  // Block 3: target must match a LOW-risk rule in risk-policy.json
  let policy;
  try {
    policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  } catch (e) {
    fail('cannot load risk-policy.json: ' + (e.message || e));
  }

  const lowRules = (policy.LOW || {}).rules || [];
  let matched = false;

  for (const rule of lowRules) {
    if (!rule.target) continue;
    if (matchGlob(canonical, rule.target)) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    fail('target "' + canonical + '" does not match any LOW-risk rule in risk-policy.json');
  }

  // Block 4: operation-specific checks and write
  const fullPath = path.resolve(PROJECT_DIR, canonical);

  if (operation === 'create') {
    if (fs.existsSync(fullPath)) {
      fail('operation is "create" but target already exists');
    }
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  } else if (operation === 'append') {
    if (!fs.existsSync(fullPath)) {
      fail('operation is "append" but target does not exist');
    }
    fs.appendFileSync(fullPath, content);
  }

  process.stdout.write('APPLY_GATE_WRITE_OK: ' + canonical + ' (' + operation + ', ' + content.length + ' bytes)\n');
  process.exit(0);
}

main();
