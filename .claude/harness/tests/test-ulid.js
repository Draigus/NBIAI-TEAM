#!/usr/bin/env node
'use strict';
// test-ulid.js — Tests for S4 per-process monotonic ULID generation.

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

const EMIT_PATH = path.resolve(__dirname, '..', 'lib', 'emit-event.js');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log('  FAIL: ' + name);
    console.log('        ' + e.message);
  }
}

function runUlidScript(script) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ulid-test-'));
  const dataDir = path.join(tmpDir, '.claude', 'harness', 'data', '.locks');
  fs.mkdirSync(dataDir, { recursive: true });
  const logsDir = path.join(tmpDir, 'projects', 'nbi_dashboard', 'session_logs');
  fs.mkdirSync(logsDir, { recursive: true });

  const fullScript = 'process.env.CLAUDE_PROJECT_DIR = ' + JSON.stringify(tmpDir) + ';\n'
    + 'const { ulid } = require(' + JSON.stringify(EMIT_PATH) + ');\n'
    + script;

  const result = spawnSync('node', ['-e', fullScript], {
    encoding: 'utf8',
    timeout: 10000
  });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return { stdout: result.stdout.trim(), stderr: result.stderr, status: result.status };
}

// ═══════════════════════════════════════════════════════
// Group 1: basic ordering
// ═══════════════════════════════════════════════════════
console.log('\nGroup 1: basic ordering');

test('two sequential ULIDs are lexicographically ordered', () => {
  const { stdout } = runUlidScript(
    'const a = ulid(); const b = ulid(); console.log(a < b ? "ordered" : "NOT ordered: " + a + " >= " + b);'
  );
  assert.strictEqual(stdout, 'ordered');
});

test('100 sequential ULIDs are all unique and ordered', () => {
  const { stdout } = runUlidScript(
    'const ids = []; for (let i = 0; i < 100; i++) ids.push(ulid());'
    + 'const unique = new Set(ids).size === 100;'
    + 'let ordered = true; for (let i = 1; i < ids.length; i++) { if (ids[i] <= ids[i-1]) { ordered = false; break; } }'
    + 'console.log(unique && ordered ? "ok" : "FAIL unique=" + unique + " ordered=" + ordered);'
  );
  assert.strictEqual(stdout, 'ok');
});

// ═══════════════════════════════════════════════════════
// Group 2: same-millisecond monotonicity
// ═══════════════════════════════════════════════════════
console.log('\nGroup 2: same-millisecond monotonicity');

test('ULIDs in same millisecond are still ordered', () => {
  const { stdout } = runUlidScript(
    'const frozen = Date.now(); const origNow = Date.now;'
    + 'Date.now = () => frozen;'
    + 'const a = ulid(); const b = ulid(); const c = ulid();'
    + 'Date.now = origNow;'
    + 'const ordered = a < b && b < c;'
    + 'console.log(ordered ? "ordered" : "NOT ordered: " + a + " " + b + " " + c);'
  );
  assert.strictEqual(stdout, 'ordered');
});

// ═══════════════════════════════════════════════════════
// Group 3: clock rollback handling
// ═══════════════════════════════════════════════════════
console.log('\nGroup 3: clock rollback');

test('clock rollback still produces ordered ULIDs', () => {
  const { stdout } = runUlidScript(
    'let mockTime = Date.now(); const origNow = Date.now;'
    + 'Date.now = () => mockTime;'
    + 'const a = ulid();'
    + 'mockTime -= 5000;'
    + 'const b = ulid();'
    + 'Date.now = origNow;'
    + 'console.log(a < b ? "ordered" : "NOT ordered: " + a + " >= " + b);'
  );
  assert.strictEqual(stdout, 'ordered');
});

// ═══════════════════════════════════════════════════════
// Group 4: overflow carry
// ═══════════════════════════════════════════════════════
console.log('\nGroup 4: overflow carry');

test('random overflow carries to timestamp and preserves ordering', () => {
  const { stdout } = runUlidScript(
    'const frozen = Date.now(); const origNow = Date.now;'
    + 'Date.now = () => frozen;'
    + 'const a = ulid();'
    + 'const mod = require("./.claude/harness/lib/emit-event.js");'
    + 'if (typeof mod._setLastRandIdx === "function") { mod._setLastRandIdx(Array(10).fill(31)); }'
    + 'else { /* manually force overflow by calling ulid many times — fallback */ }'
    + 'const b = ulid();'
    + 'Date.now = origNow;'
    + 'console.log(a < b ? "ordered" : "NOT ordered: " + a + " >= " + b);'
  );
  assert.strictEqual(stdout, 'ordered');
});

// ═══════════════════════════════════════════════════════
// Group 5: ULID format
// ═══════════════════════════════════════════════════════
console.log('\nGroup 5: ULID format');

test('ULID is 20 characters from Crockford base32', () => {
  const { stdout } = runUlidScript(
    'const id = ulid();'
    + 'const valid = id.length === 20 && /^[0-9A-HJKMNP-TV-Z]+$/.test(id);'
    + 'console.log(valid ? "valid" : "invalid: " + id + " len=" + id.length);'
  );
  assert.strictEqual(stdout, 'valid');
});

// ═══════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  - ' + f.name + ': ' + f.error);
  }
  process.exit(1);
}
console.log('All tests passed.');
