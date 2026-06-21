'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-resolver-'));
process.env.HARNESS_DIR = tmpDir;
process.env.CLAUDE_PROJECT_DIR = path.resolve(__dirname, '..', '..', '..');
delete require.cache[require.resolve('../lib/resolve')];

const configDir = path.join(tmpDir, 'config');
fs.mkdirSync(configDir, { recursive: true });
fs.copyFileSync(
  path.join(__dirname, '..', 'config', 'verification-requirements.json'),
  path.join(configDir, 'verification-requirements.json')
);

const { loadRequirements, resolve, formatSummary } = require('../lib/verification-resolver');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
  } catch (e) {
    failed++;
    console.log('  FAIL: ' + name + ' -- ' + e.message);
  }
}

console.log('test-verification-resolver');

test('loadRequirements returns object with surface keys', () => {
  const reqs = loadRequirements();
  assert.ok(reqs.server, 'should have server');
  assert.ok(reqs.frontend, 'should have frontend');
  assert.ok(reqs.docs, 'should have docs');
  assert.deepStrictEqual(reqs.server.required, ['unit_test']);
  assert.deepStrictEqual(reqs.docs.required, []);
});

test('resolve: all clean surfaces returns all_satisfied', () => {
  const fingerprints = { server: null, frontend: null };
  const result = resolve(fingerprints, []);
  assert.strictEqual(result.all_satisfied, true);
});

test('resolve: dirty server with matching evidence is satisfied', () => {
  const fingerprints = { server: 'abc123' };
  const evidence = [{
    id: 'EV-test-unit',
    type: 'unit_test',
    exit_code: 0,
    surface_fingerprints: { server: 'abc123' },
    surfaces_covered: ['server']
  }];
  const result = resolve(fingerprints, evidence);
  assert.strictEqual(result.all_satisfied, true);
  assert.deepStrictEqual(result.surfaces.server.satisfied, ['unit_test']);
  assert.deepStrictEqual(result.surfaces.server.missing, []);
});

test('resolve: dirty server without evidence is not satisfied', () => {
  const fingerprints = { server: 'abc123' };
  const result = resolve(fingerprints, []);
  assert.strictEqual(result.all_satisfied, false);
  assert.deepStrictEqual(result.surfaces.server.missing, ['unit_test']);
});

test('resolve: stale fingerprint does not satisfy', () => {
  const fingerprints = { server: 'abc123' };
  const evidence = [{
    id: 'EV-test-unit',
    type: 'unit_test',
    exit_code: 0,
    surface_fingerprints: { server: 'DIFFERENT' },
    surfaces_covered: ['server']
  }];
  const result = resolve(fingerprints, evidence);
  assert.strictEqual(result.all_satisfied, false);
});

test('resolve: frontend requires unit_test AND (e2e_test|browser_check)', () => {
  const fingerprints = { frontend: 'fp1' };
  const evidenceUnitOnly = [{
    id: 'EV-unit', type: 'unit_test', exit_code: 0,
    surface_fingerprints: { frontend: 'fp1' }, surfaces_covered: ['frontend']
  }];
  const result1 = resolve(fingerprints, evidenceUnitOnly);
  assert.strictEqual(result1.all_satisfied, false);
  assert.deepStrictEqual(result1.surfaces.frontend.missing, ['e2e_test|browser_check']);

  const evidenceBoth = [
    ...evidenceUnitOnly,
    { id: 'EV-e2e', type: 'e2e_test', exit_code: 0,
      surface_fingerprints: { frontend: 'fp1' }, surfaces_covered: ['frontend'] }
  ];
  const result2 = resolve(fingerprints, evidenceBoth);
  assert.strictEqual(result2.all_satisfied, true);
});

test('resolve: browser_check satisfies the e2e_test|browser_check requirement', () => {
  const fingerprints = { frontend: 'fp1' };
  const evidence = [
    { id: 'EV-unit', type: 'unit_test', exit_code: 0,
      surface_fingerprints: { frontend: 'fp1' }, surfaces_covered: ['frontend'] },
    { id: 'EV-browser', type: 'browser_check', exit_code: 0,
      surface_fingerprints: { frontend: 'fp1' }, surfaces_covered: ['frontend'] }
  ];
  const result = resolve(fingerprints, evidence);
  assert.strictEqual(result.all_satisfied, true);
});

test('resolve: docs surface has no requirements (always satisfied)', () => {
  const fingerprints = { docs: 'fp1' };
  const result = resolve(fingerprints, []);
  assert.strictEqual(result.all_satisfied, true);
});

test('resolve: tests surface requires unit_test (R6)', () => {
  const fingerprints = { tests: 'fp1' };
  const result = resolve(fingerprints, []);
  assert.strictEqual(result.all_satisfied, false);
  assert.deepStrictEqual(result.surfaces.tests.missing, ['unit_test']);
});

test('resolve: mixed dirty and clean surfaces', () => {
  const fingerprints = { server: 'fp1', docs: 'fp2', frontend: null };
  const evidence = [{
    id: 'EV-unit', type: 'unit_test', exit_code: 0,
    surface_fingerprints: { server: 'fp1' }, surfaces_covered: ['server']
  }];
  const result = resolve(fingerprints, evidence);
  assert.strictEqual(result.all_satisfied, true);
});

test('formatSummary: satisfied returns ALL SATISFIED', () => {
  const res = { all_satisfied: true, surfaces: {} };
  assert.strictEqual(formatSummary(res), 'ALL SATISFIED');
});

test('formatSummary: unsatisfied includes surface and missing type', () => {
  const res = {
    all_satisfied: false,
    surfaces: { server: { missing: ['unit_test'] } }
  };
  const summary = formatSummary(res);
  assert.ok(summary.includes('server'), 'should mention server');
  assert.ok(summary.includes('unit_test'), 'should mention unit_test');
  assert.ok(summary.includes('npm test'), 'should suggest npm test');
});

// Cleanup
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
