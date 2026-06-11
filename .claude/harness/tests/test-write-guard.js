#!/usr/bin/env node
'use strict';
// Tests write-guard.js by feeding mock hook JSON via stdin.
// Run: node .claude/harness/tests/test-write-guard.js

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..', '..');
const GUARD = path.join(PROJECT_DIR, '.claude', 'harness', 'lib', 'write-guard.js');
const env = Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: PROJECT_DIR });

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

function runGuard(filePath) {
  const input = JSON.stringify({ tool_input: { file_path: filePath } });
  try {
    const out = execSync('node "' + GUARD + '"', {
      cwd: PROJECT_DIR, env, timeout: 5000, encoding: 'utf8',
      input: input
    });
    return out.trim() ? JSON.parse(out.trim()) : null;
  } catch (e) {
    if (e.stdout && e.stdout.trim()) return JSON.parse(e.stdout.trim());
    return null;
  }
}

console.log('Test: write-guard.js\n');

// Allowed: data directory
console.log('--- Allowed paths ---');
let r = runGuard(path.join(PROJECT_DIR, '.claude/harness/data/events/2026-06-11/ses_test.jsonl'));
assert(r === null, 'data/events/ path allowed (no output)');

r = runGuard(path.join(PROJECT_DIR, '.claude/harness/proposals/2026-W24/RHO-test.json'));
assert(r === null, 'proposals/ path allowed');

r = runGuard(path.join(PROJECT_DIR, '.claude/harness/HARNESS_HEALTH.md'));
assert(r === null, 'HARNESS_HEALTH.md allowed');

r = runGuard(path.join(PROJECT_DIR, '.claude/harness/changelog.md'));
assert(r === null, 'changelog.md allowed');

r = runGuard(path.join(PROJECT_DIR, '.claude/harness/tests/test-example.js'));
assert(r === null, 'tests/ path allowed (development_allowed)');

// Blocked: config directory
console.log('\n--- Blocked paths ---');
r = runGuard(path.join(PROJECT_DIR, '.claude/harness/config/risk-policy.json'));
assert(r && r.decision === 'block', 'config/risk-policy.json blocked');
assert(r && r.reason.includes('HARNESS_WRITE_DENIED'), 'Block message correct');

r = runGuard(path.join(PROJECT_DIR, '.claude/harness/lib/emit-event.js'));
assert(r && r.decision === 'block', 'lib/emit-event.js blocked');

// Not harness: no restriction
console.log('\n--- Non-harness paths ---');
r = runGuard(path.join(PROJECT_DIR, 'dashboard-server/server.js'));
assert(r === null, 'Non-harness path not restricted');

r = runGuard(path.join(PROJECT_DIR, '.claude/skills/tdd/SKILL.md'));
assert(r === null, 'Skills path not restricted by write guard');

console.log('\n' + '='.repeat(40));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
