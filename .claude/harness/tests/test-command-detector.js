#!/usr/bin/env node
'use strict';
// test-command-detector.js -- Tests for command-detector.js
// Uses Node's built-in assert -- no test framework dependency.
// Matches existing harness test patterns.

const assert = require('assert');
const path = require('path');

// Set HARNESS_DIR for test isolation before requiring the module
process.env.HARNESS_DIR = __dirname;

const {
  parseCommand,
  resolveWorkingDirectory,
  detectEvidenceType,
  isGateTarget,
  _maskQuoted: maskQuoted,
} = require('../lib/command-detector');

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

// ═══════════════════════════════════════════════════════════════════
// parseCommand
// ═══════════════════════════════════════════════════════════════════
console.log('\n--- parseCommand ---');

test('simple command returns single segment', function () {
  const result = parseCommand('npm test');
  assert.deepStrictEqual(result, ['npm test']);
});

test('compound && splits into two segments', function () {
  const result = parseCommand('cd dir && npm test');
  assert.deepStrictEqual(result, ['cd dir', 'npm test']);
});

test('compound ; splits into two segments', function () {
  const result = parseCommand('npm test; echo done');
  assert.deepStrictEqual(result, ['npm test', 'echo done']);
});

test('compound || splits into two segments', function () {
  const result = parseCommand('npm test || echo fail');
  assert.deepStrictEqual(result, ['npm test', 'echo fail']);
});

test('quoted string containing && does not split', function () {
  const result = parseCommand('echo "a && b"');
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].includes('a && b'), 'should preserve quoted content');
});

test('single-quoted string containing ; does not split', function () {
  const result = parseCommand("echo 'a; b'");
  assert.strictEqual(result.length, 1);
});

test('empty command returns empty array', function () {
  assert.deepStrictEqual(parseCommand(''), []);
  assert.deepStrictEqual(parseCommand(null), []);
  assert.deepStrictEqual(parseCommand(undefined), []);
});

test('triple compound: a && b && c', function () {
  const result = parseCommand('cd foo && npm install && npm test');
  assert.deepStrictEqual(result, ['cd foo', 'npm install', 'npm test']);
});

test('mixed combinators: a && b; c || d', function () {
  const result = parseCommand('cd dir && npm test; echo ok || echo fail');
  assert.strictEqual(result.length, 4);
  assert.strictEqual(result[0], 'cd dir');
  assert.strictEqual(result[1], 'npm test');
  assert.strictEqual(result[2], 'echo ok');
  assert.strictEqual(result[3], 'echo fail');
});

// ═══════════════════════════════════════════════════════════════════
// resolveWorkingDirectory
// ═══════════════════════════════════════════════════════════════════
console.log('\n--- resolveWorkingDirectory ---');

test('no cd prefix returns defaultCwd', function () {
  const result = resolveWorkingDirectory('npm test', '/project');
  assert.strictEqual(result, '/project');
});

test('cd prefix resolves relative to defaultCwd', function () {
  const result = resolveWorkingDirectory('cd dashboard-server && npm test', '/project');
  assert.strictEqual(result, path.resolve('/project', 'dashboard-server'));
});

test('nested cd resolves correctly', function () {
  const result = resolveWorkingDirectory('cd foo/bar', '/root');
  assert.strictEqual(result, path.resolve('/root', 'foo/bar'));
});

test('multiple cd segments chain correctly', function () {
  const result = resolveWorkingDirectory('cd src && cd tests && npm test', '/project');
  assert.strictEqual(result, path.resolve('/project', 'src', 'tests'));
});

test('null command returns defaultCwd', function () {
  const result = resolveWorkingDirectory(null, '/project');
  assert.strictEqual(result, '/project');
});

// ═══════════════════════════════════════════════════════════════════
// detectEvidenceType
// ═══════════════════════════════════════════════════════════════════
console.log('\n--- detectEvidenceType ---');

// Helper: a cwd that ends with dashboard-server
const DS_CWD = path.resolve('/project/dashboard-server');

test('npm test in dashboard-server cwd returns unit_test', function () {
  const result = detectEvidenceType('npm test', DS_CWD);
  assert.ok(result, 'should not be null');
  assert.strictEqual(result.type, 'unit_test');
  assert.ok(Array.isArray(result.surfacesCovered));
  assert.ok(result.surfacesCovered.includes('server'));
  assert.ok(result.surfacesCovered.includes('frontend'));
  assert.ok(result.surfacesCovered.includes('migrations'));
  assert.ok(result.surfacesCovered.includes('tests'));
});

test('npm test in wrong cwd returns null', function () {
  const result = detectEvidenceType('npm test', '/some/other/dir');
  assert.strictEqual(result, null);
});

test('npx vitest run in dashboard-server returns unit_test', function () {
  const result = detectEvidenceType('npx vitest run', DS_CWD);
  assert.ok(result);
  assert.strictEqual(result.type, 'unit_test');
});

test('npm run test:e2e in dashboard-server returns e2e_test', function () {
  const result = detectEvidenceType('npm run test:e2e', DS_CWD);
  assert.ok(result);
  assert.strictEqual(result.type, 'e2e_test');
  assert.ok(result.surfacesCovered.includes('server'));
  assert.ok(result.surfacesCovered.includes('frontend'));
});

test('npx playwright test in dashboard-server returns e2e_test', function () {
  const result = detectEvidenceType('npx playwright test', DS_CWD);
  assert.ok(result);
  assert.strictEqual(result.type, 'e2e_test');
});

test('npm run test:all returns array of two results', function () {
  const result = detectEvidenceType('npm run test:all', DS_CWD);
  assert.ok(Array.isArray(result), 'should return array for test:all');
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].type, 'unit_test');
  assert.strictEqual(result[1].type, 'e2e_test');
});

test('echo "npm test" returns null (inside quotes)', function () {
  const result = detectEvidenceType('echo "npm test"', DS_CWD);
  assert.strictEqual(result, null);
});

test('printf "npm test" returns null', function () {
  const result = detectEvidenceType('printf "npm test"', DS_CWD);
  assert.strictEqual(result, null);
});

test('curl http://localhost:8888/health returns health_check', function () {
  const result = detectEvidenceType('curl http://localhost:8888/health', '/any/dir');
  assert.ok(result);
  assert.strictEqual(result.type, 'health_check');
  assert.ok(result.surfacesCovered.includes('server'));
});

test('curl to non-8888 port returns null', function () {
  const result = detectEvidenceType('curl http://localhost:3000/health', '/any/dir');
  assert.strictEqual(result, null);
});

test('cd dashboard-server && npm test detects with resolved cwd', function () {
  const result = detectEvidenceType('cd dashboard-server && npm test', '/project');
  assert.ok(result, 'should detect unit_test via resolved cwd');
  assert.strictEqual(result.type, 'unit_test');
});

test('cd dashboard-server && npm run test:e2e detects e2e', function () {
  const result = detectEvidenceType('cd dashboard-server && npm run test:e2e', '/project');
  assert.ok(result);
  assert.strictEqual(result.type, 'e2e_test');
});

test('null command returns null', function () {
  assert.strictEqual(detectEvidenceType(null, DS_CWD), null);
  assert.strictEqual(detectEvidenceType('', DS_CWD), null);
});

test('ls -la returns null (not a verification command)', function () {
  assert.strictEqual(detectEvidenceType('ls -la', DS_CWD), null);
});

test('npm test in dashboard-server subdir detects correctly', function () {
  const subCwd = path.resolve(DS_CWD, 'tests');
  const result = detectEvidenceType('npm test', subCwd);
  assert.ok(result, 'subdirectory of dashboard-server should match');
  assert.strictEqual(result.type, 'unit_test');
});

// ═══════════════════════════════════════════════════════════════════
// isGateTarget
// ═══════════════════════════════════════════════════════════════════
console.log('\n--- isGateTarget ---');

test('git commit -m "feat: add feature" returns commit gate', function () {
  const result = isGateTarget('git commit -m "feat: add feature"');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].gate, 'commit');
  assert.strictEqual(result[0].metadata.message, 'feat: add feature');
});

test('git commit -m \'fix: bug\' extracts single-quoted message', function () {
  const result = isGateTarget("git commit -m 'fix: bug'");
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].gate, 'commit');
  assert.strictEqual(result[0].metadata.message, 'fix: bug');
});

test('git commit without -m returns commit with null message', function () {
  const result = isGateTarget('git commit');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].gate, 'commit');
  assert.strictEqual(result[0].metadata.message, null);
});

test('git push returns push gate', function () {
  const result = isGateTarget('git push');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].gate, 'push');
  assert.deepStrictEqual(result[0].metadata, {});
});

test('git push origin main returns push gate', function () {
  const result = isGateTarget('git push origin main');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].gate, 'push');
});

test('pm2 restart nbi-dashboard returns pm2 gate', function () {
  const result = isGateTarget('pm2 restart nbi-dashboard');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].gate, 'pm2');
  assert.deepStrictEqual(result[0].metadata, {});
});

test('gh pr create --title "test" returns pr gate', function () {
  const result = isGateTarget('gh pr create --title "test"');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].gate, 'pr');
  assert.deepStrictEqual(result[0].metadata, {});
});

test('echo "git push" returns empty (inside quotes)', function () {
  const result = isGateTarget('echo "git push"');
  assert.deepStrictEqual(result, []);
});

test('echo "git commit -m test" returns empty', function () {
  const result = isGateTarget('echo "git commit -m test"');
  assert.deepStrictEqual(result, []);
});

test('git commit && git push returns TWO gates', function () {
  const result = isGateTarget('git commit -m "snapshot: wip" && git push');
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].gate, 'commit');
  assert.strictEqual(result[0].metadata.message, 'snapshot: wip');
  assert.strictEqual(result[1].gate, 'push');
});

test('ls -la returns empty array', function () {
  const result = isGateTarget('ls -la');
  assert.deepStrictEqual(result, []);
});

test('npm install returns empty array', function () {
  const result = isGateTarget('npm install');
  assert.deepStrictEqual(result, []);
});

test('null/empty returns empty array', function () {
  assert.deepStrictEqual(isGateTarget(null), []);
  assert.deepStrictEqual(isGateTarget(''), []);
  assert.deepStrictEqual(isGateTarget(undefined), []);
});

test('curl /api/bug with please_review returns bugstatus gate', function () {
  const result = isGateTarget('curl -X PATCH http://localhost:8888/api/bug/123 -d \'{"status":"please_review"}\'');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].gate, 'bugstatus');
});

test('pm2 restart in compound: npm test && pm2 restart nbi-dashboard', function () {
  const result = isGateTarget('npm test && pm2 restart nbi-dashboard');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].gate, 'pm2');
});

test('triple gate: git commit && git push && pm2 restart x', function () {
  const result = isGateTarget('git commit -m "deploy" && git push && pm2 restart nbi-dashboard');
  assert.strictEqual(result.length, 3);
  assert.strictEqual(result[0].gate, 'commit');
  assert.strictEqual(result[1].gate, 'push');
  assert.strictEqual(result[2].gate, 'pm2');
});

test('# git push in comment returns empty', function () {
  const result = isGateTarget('# git push origin main');
  assert.deepStrictEqual(result, []);
});

// ═══════════════════════════════════════════════════════════════════
// maskQuoted (internal helper, exposed for testing)
// ═══════════════════════════════════════════════════════════════════
console.log('\n--- maskQuoted (internal) ---');

test('masks double-quoted content', function () {
  const result = maskQuoted('echo "hello world"');
  assert.ok(!result.includes('hello'));
  assert.ok(!result.includes('world'));
  assert.ok(result.startsWith('echo'));
});

test('masks single-quoted content', function () {
  const result = maskQuoted("echo 'hello world'");
  assert.ok(!result.includes('hello'));
});

test('preserves unquoted content', function () {
  const result = maskQuoted('npm test');
  assert.strictEqual(result, 'npm test');
});

// ═══════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  - ' + f.name + ': ' + f.error);
  }
  process.exit(1);
}
