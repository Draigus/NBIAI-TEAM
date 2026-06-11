#!/usr/bin/env node
'use strict';
// Tests entropy-scan.js pattern matching against mock diffs.
// Does NOT require a real git repo — tests the scan logic directly.
// Run: node .claude/harness/tests/test-entropy-scan.js

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..', '..');
const CHECKS_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'config', 'entropy-checks.json');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

const checks = JSON.parse(fs.readFileSync(CHECKS_PATH, 'utf8'));

console.log('Test: entropy check patterns\n');

// Test code residue patterns against sample diff lines
const codeResidueTests = [
  { line: '+  console.log("debug");', name: 'console.log', shouldMatch: true },
  { line: '+  debugger;', name: 'debugger', shouldMatch: true },
  { line: '+  // TODO: fix this', name: 'TODO added', shouldMatch: true },
  { line: '+  // const oldVar = 5;', name: 'commented-out code', shouldMatch: true },
  { line: '+  const x = 5;', name: 'console.log', shouldMatch: false },
  { line: '-  console.log("removed");', name: 'console.log', shouldMatch: false }
];

console.log('--- Code residue patterns ---');
for (const t of codeResidueTests) {
  const check = checks.fast_scan.code_residue.find(c => c.name === t.name);
  if (!check) { assert(false, 'Pattern not found: ' + t.name); continue; }
  const re = new RegExp(check.regex, check.flags || 'gm');
  const matches = re.test(t.line);
  assert(matches === t.shouldMatch, t.name + ' ' + (t.shouldMatch ? 'matches' : 'rejects') + ': ' + t.line.trim());
}

// Test test integrity patterns
console.log('\n--- Test integrity patterns ---');
const ti = checks.fast_scan.test_integrity;
const weakenedRe = new RegExp(ti.weakened_assertions);
assert(weakenedRe.test('-  expect(result).toBe(5)'), 'Detects removed assertion');
assert(!weakenedRe.test('+  expect(result).toBe(5)'), 'Ignores added assertion');

const skipRe = new RegExp(ti.added_skips);
assert(skipRe.test('+  it.skip("disabled test")'), 'Detects added .skip');
assert(skipRe.test('+  xit("disabled")'), 'Detects xit');
assert(!skipRe.test('-  it.skip("was disabled")'), 'Ignores removed skip');

console.log('\n' + '='.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
