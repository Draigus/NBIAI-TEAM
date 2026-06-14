#!/usr/bin/env node
'use strict';
// test-write-guard.js — Tests for principal-aware write guard.
// Spawns write-guard.js as a child process with controlled env/stdin.
// Uses Node's built-in assert — no test framework dependency.

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const GUARD_PATH = path.resolve(__dirname, '..', 'lib', 'write-guard.js');

const STANDARD_MATRIX = {
  recorder_allowed: [
    { path: '.claude/harness/data/**', mode: 'append_or_create' },
    { path: '.claude/harness/proposals/**', mode: 'create_only' },
    { path: '.claude/harness/HARNESS_HEALTH.md', mode: 'overwrite' }
  ],
  applier_allowed: [
    { path: '.claude/harness/changelog.md', mode: 'append' }
  ],
  blocked: [
    { path: '.claude/harness/config/**', reason: 'BLOCKED_TO_APPLY: governance config' },
    { path: '.claude/harness/lib/**', reason: 'BLOCKED_TO_APPLY: harness engine code' }
  ],
  development_allowed: [
    { path: '.claude/harness/tests/**', mode: 'create_or_overwrite' }
  ]
};

function runGuard(filePath, matrix, envOverrides) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-test-'));
  const configDir = path.join(tmpDir, '.claude', 'harness', 'config');
  fs.mkdirSync(configDir, { recursive: true });
  if (matrix !== null) {
    fs.writeFileSync(path.join(configDir, 'write-matrix.json'), JSON.stringify(matrix));
  }
  const input = JSON.stringify({ tool_input: { file_path: filePath } });
  const env = { ...process.env, CLAUDE_PROJECT_DIR: tmpDir };
  // Remove HARNESS_CADENCE unless explicitly provided
  delete env.HARNESS_CADENCE;
  if (envOverrides) {
    Object.assign(env, envOverrides);
  }
  const result = spawnSync('node', [GUARD_PATH], { input, env, encoding: 'utf8', timeout: 5000 });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

function parseOutput(result) {
  if (!result.stdout) return null;
  try { return JSON.parse(result.stdout); } catch { return null; }
}

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

console.log('write-guard principal-aware tests\n');

// -------------------------------------------------------------------
// 1. Blocked path always blocked regardless of principal
// -------------------------------------------------------------------
test('blocked path blocked in recorder mode (HARNESS_CADENCE=true)', function () {
  const r = runGuard('/project/.claude/harness/config/test.json', STANDARD_MATRIX, { HARNESS_CADENCE: 'true' });
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON output, got: ' + r.stdout);
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('HARNESS_WRITE_DENIED'), 'reason should include HARNESS_WRITE_DENIED');
});

test('blocked path blocked in development mode (no HARNESS_CADENCE)', function () {
  const r = runGuard('/project/.claude/harness/config/test.json', STANDARD_MATRIX, {});
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON output, got: ' + r.stdout);
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('HARNESS_WRITE_DENIED'), 'reason should include HARNESS_WRITE_DENIED');
});

test('blocked lib path blocked in recorder mode', function () {
  const r = runGuard('/project/.claude/harness/lib/something.js', STANDARD_MATRIX, { HARNESS_CADENCE: 'true' });
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON output, got: ' + r.stdout);
  assert.strictEqual(out.decision, 'block');
});

test('blocked lib path blocked in development mode', function () {
  const r = runGuard('/project/.claude/harness/lib/something.js', STANDARD_MATRIX, {});
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON output, got: ' + r.stdout);
  assert.strictEqual(out.decision, 'block');
});

// -------------------------------------------------------------------
// 2. Recorder path allowed when HARNESS_CADENCE=true
// -------------------------------------------------------------------
test('recorder path (data/) allowed in recorder mode', function () {
  const r = runGuard('/project/.claude/harness/data/event.jsonl', STANDARD_MATRIX, { HARNESS_CADENCE: 'true' });
  const out = parseOutput(r);
  // Allowed = no output (silent exit 0)
  assert.strictEqual(r.stdout, '', 'expected no output for allowed path, got: ' + r.stdout);
  assert.strictEqual(r.status, 0);
});

test('recorder path (proposals/) allowed in recorder mode', function () {
  const r = runGuard('/project/.claude/harness/proposals/prop-001.md', STANDARD_MATRIX, { HARNESS_CADENCE: 'true' });
  assert.strictEqual(r.stdout, '', 'expected no output for allowed path');
  assert.strictEqual(r.status, 0);
});

test('recorder path (HARNESS_HEALTH.md) allowed in recorder mode', function () {
  const r = runGuard('/project/.claude/harness/HARNESS_HEALTH.md', STANDARD_MATRIX, { HARNESS_CADENCE: 'true' });
  assert.strictEqual(r.stdout, '', 'expected no output for allowed path');
  assert.strictEqual(r.status, 0);
});

// -------------------------------------------------------------------
// 3. Applier path BLOCKED when HARNESS_CADENCE=true
// -------------------------------------------------------------------
test('applier path (changelog.md) blocked in recorder mode', function () {
  const r = runGuard('/project/.claude/harness/changelog.md', STANDARD_MATRIX, { HARNESS_CADENCE: 'true' });
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON block output, got: ' + r.stdout);
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('HARNESS_WRITE_DENIED'), 'reason should include HARNESS_WRITE_DENIED');
});

// -------------------------------------------------------------------
// 4. Applier path BLOCKED in development mode (no env var)
// -------------------------------------------------------------------
test('applier path (changelog.md) blocked in development mode', function () {
  const r = runGuard('/project/.claude/harness/changelog.md', STANDARD_MATRIX, {});
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON block output, got: ' + r.stdout);
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('HARNESS_WRITE_DENIED'), 'reason should include HARNESS_WRITE_DENIED');
});

// -------------------------------------------------------------------
// 5. Development path allowed in development mode
// -------------------------------------------------------------------
test('development path (tests/) allowed in development mode', function () {
  const r = runGuard('/project/.claude/harness/tests/test-foo.js', STANDARD_MATRIX, {});
  assert.strictEqual(r.stdout, '', 'expected no output for allowed path');
  assert.strictEqual(r.status, 0);
});

// -------------------------------------------------------------------
// 6. Development path BLOCKED when HARNESS_CADENCE=true
// -------------------------------------------------------------------
test('development path (tests/) blocked in recorder mode', function () {
  const r = runGuard('/project/.claude/harness/tests/test-foo.js', STANDARD_MATRIX, { HARNESS_CADENCE: 'true' });
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON block output, got: ' + r.stdout);
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('HARNESS_WRITE_DENIED'), 'reason should include HARNESS_WRITE_DENIED');
});

// -------------------------------------------------------------------
// 7. Unknown path blocked in both modes
// -------------------------------------------------------------------
test('unknown path blocked in development mode', function () {
  const r = runGuard('/project/.claude/harness/unknown/file.txt', STANDARD_MATRIX, {});
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON block output, got: ' + r.stdout);
  assert.strictEqual(out.decision, 'block');
});

test('unknown path blocked in recorder mode', function () {
  const r = runGuard('/project/.claude/harness/unknown/file.txt', STANDARD_MATRIX, { HARNESS_CADENCE: 'true' });
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON block output, got: ' + r.stdout);
  assert.strictEqual(out.decision, 'block');
});

// -------------------------------------------------------------------
// 8. Missing write-matrix.json fails closed
// -------------------------------------------------------------------
test('missing write-matrix.json fails closed', function () {
  const r = runGuard('/project/.claude/harness/data/event.jsonl', null, {});
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON block output, got: ' + r.stdout);
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('missing or corrupt'), 'reason should mention missing/corrupt');
});

// -------------------------------------------------------------------
// 9. Block message includes active principal name
// -------------------------------------------------------------------
test('block message includes principal "recorder" when HARNESS_CADENCE=true', function () {
  const r = runGuard('/project/.claude/harness/unknown/file.txt', STANDARD_MATRIX, { HARNESS_CADENCE: 'true' });
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON block output');
  assert.ok(out.reason.toLowerCase().includes('recorder'), 'block reason should include principal name "recorder", got: ' + out.reason);
});

test('block message includes principal "development" when no HARNESS_CADENCE', function () {
  const r = runGuard('/project/.claude/harness/unknown/file.txt', STANDARD_MATRIX, {});
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON block output');
  assert.ok(out.reason.toLowerCase().includes('development'), 'block reason should include principal name "development", got: ' + out.reason);
});

// -------------------------------------------------------------------
// 10. Recorder paths also allowed in development mode (superset)
// -------------------------------------------------------------------
test('recorder path (data/) allowed in development mode', function () {
  const r = runGuard('/project/.claude/harness/data/event.jsonl', STANDARD_MATRIX, {});
  assert.strictEqual(r.stdout, '', 'expected no output for allowed path');
  assert.strictEqual(r.status, 0);
});

// -------------------------------------------------------------------
// 11. Path outside harness is not affected (passthrough)
// -------------------------------------------------------------------
test('path outside harness passes through (no block)', function () {
  const r = runGuard('/project/src/index.js', STANDARD_MATRIX, {});
  assert.strictEqual(r.stdout, '', 'expected no output for non-harness path');
  assert.strictEqual(r.status, 0);
});

// -------------------------------------------------------------------
// 12. Blocked takes priority over allowlist overlap
// -------------------------------------------------------------------
test('blocked takes priority even if path also matches an allowlist', function () {
  // Create a matrix where a path matches both blocked and recorder_allowed
  const overlapMatrix = JSON.parse(JSON.stringify(STANDARD_MATRIX));
  overlapMatrix.recorder_allowed.push({ path: '.claude/harness/config/special.json', mode: 'overwrite' });
  const r = runGuard('/project/.claude/harness/config/special.json', overlapMatrix, { HARNESS_CADENCE: 'true' });
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON block output');
  assert.strictEqual(out.decision, 'block', 'blocked should take priority over allowlist');
});

// -------------------------------------------------------------------
// 13. Malformed blocked entry (missing path field) does not crash
// -------------------------------------------------------------------
test('malformed blocked entry (no path) fails closed', function () {
  const badMatrix = JSON.parse(JSON.stringify(STANDARD_MATRIX));
  badMatrix.blocked.push({ reason: 'no path field' });
  const r = runGuard('/project/.claude/harness/data/event.jsonl', badMatrix, {});
  // Should still allow the data/ path — the malformed entry is skipped by matchGlob
  assert.strictEqual(r.stdout, '', 'malformed entry should not crash or block valid paths');
  assert.strictEqual(r.status, 0);
});

// -------------------------------------------------------------------
// 14. Empty matrix ({}) — all sections missing — fails closed
// -------------------------------------------------------------------
test('empty matrix object fails closed for harness paths', function () {
  const r = runGuard('/project/.claude/harness/data/event.jsonl', {}, {});
  const out = parseOutput(r);
  assert.ok(out, 'expected JSON block output for empty matrix');
  assert.strictEqual(out.decision, 'block');
});

// -------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  - ' + f.name + ': ' + f.error);
  }
  process.exit(1);
}
