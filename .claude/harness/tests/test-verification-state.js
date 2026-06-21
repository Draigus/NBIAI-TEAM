#!/usr/bin/env node
'use strict';
// test-verification-state.js — Tests for verification state machine.
// Verifies surface classification, fingerprinting, dirty state scanning, and state persistence.
// Uses Node's built-in assert — no test framework dependency.
// Run: node d:/tmp/verification-impl/tests/test-verification-state.js

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ---------------------------------------------------------------------------
// Test harness (matches existing harness test patterns)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Environment setup — temp harness dir with surface-map.json, real project dir
// ---------------------------------------------------------------------------
const PROJECT_DIR = 'd:\\OneDrive\\Claude_code\\NBIAI_TEAM';
const tmpHarness = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-test-'));
const tmpConfigDir = path.join(tmpHarness, 'config');
const tmpDataDir = path.join(tmpHarness, 'data');
fs.mkdirSync(tmpConfigDir, { recursive: true });
fs.mkdirSync(tmpDataDir, { recursive: true });

// Write surface-map.json to temp config
const surfaceMap = {
  server: [
    'dashboard-server/routes/**',
    'dashboard-server/lib/**',
    'dashboard-server/server.js',
    'dashboard-server/cron/**',
    'dashboard-server/scripts/**',
    'dashboard-server/*.js'
  ],
  frontend: [
    'nbi_project_dashboard.html',
    'dashboard-server/public/js/**',
    'dashboard-server/public/css/**'
  ],
  tests: ['dashboard-server/tests/**'],
  migrations: ['dashboard-server/migrations/**'],
  config: [
    'dashboard-server/package.json',
    'dashboard-server/package-lock.json',
    'dashboard-server/ecosystem.config.js'
  ],
  docs: ['*.md', 'docs/**', 'brain/**', 'roles/**'],
  client_deliverables: ['Clients/**'],
  intelligence: ['intelligence/**'],
  harness: ['.claude/harness/**']
};
fs.writeFileSync(path.join(tmpConfigDir, 'surface-map.json'), JSON.stringify(surfaceMap));

// Set env vars BEFORE requiring the module so resolve.js picks them up
process.env.HARNESS_DIR = tmpHarness;
process.env.CLAUDE_PROJECT_DIR = PROJECT_DIR;

// Clear module caches so resolve.js re-evaluates with our env
const resolvePath = path.resolve(__dirname, '..', 'lib', 'resolve.js');
const modulePath = path.resolve(__dirname, '..', 'lib', 'verification-state.js');
delete require.cache[require.resolve(resolvePath)];
delete require.cache[require.resolve(modulePath)];

const vs = require(modulePath);
const R = require(resolvePath);

// ---------------------------------------------------------------------------
// T1: classifySurface — basic surface matching
// ---------------------------------------------------------------------------
console.log('verification-state tests\n');
console.log('--- T1: classifySurface basic matching ---');

test('server route file → server', function () {
  assert.strictEqual(vs.classifySurface('dashboard-server/routes/tasks.js'), 'server');
});

test('frontend JS file → frontend', function () {
  assert.strictEqual(vs.classifySurface('dashboard-server/public/js/app.js'), 'frontend');
});

test('SPA HTML file → frontend', function () {
  assert.strictEqual(vs.classifySurface('nbi_project_dashboard.html'), 'frontend');
});

test('unit test file → tests', function () {
  assert.strictEqual(vs.classifySurface('dashboard-server/tests/unit/foo.test.js'), 'tests');
});

test('migration file → migrations', function () {
  assert.strictEqual(vs.classifySurface('dashboard-server/migrations/001_init.sql'), 'migrations');
});

test('package.json → config', function () {
  assert.strictEqual(vs.classifySurface('dashboard-server/package.json'), 'config');
});

test('root markdown → docs', function () {
  assert.strictEqual(vs.classifySurface('README.md'), 'docs');
});

test('docs subfolder → docs', function () {
  assert.strictEqual(vs.classifySurface('docs/HANDOFF.md'), 'docs');
});

test('client deliverable → client_deliverables', function () {
  assert.strictEqual(vs.classifySurface('Clients/foo/report.md'), 'client_deliverables');
});

test('intelligence bank → intelligence', function () {
  assert.strictEqual(vs.classifySurface('intelligence/banks/foo.md'), 'intelligence');
});

test('harness lib file → harness', function () {
  assert.strictEqual(vs.classifySurface('.claude/harness/lib/foo.js'), 'harness');
});

test('unclassified file → null', function () {
  assert.strictEqual(vs.classifySurface('random/unknown/file.xyz'), null);
});

// ---------------------------------------------------------------------------
// T2: classifySurface — longest prefix wins (specificity)
// ---------------------------------------------------------------------------
console.log('\n--- T2: classifySurface specificity ---');

test('server.js matches server (exact filename) not config (*.js wildcard)', function () {
  const result = vs.classifySurface('dashboard-server/server.js');
  assert.strictEqual(result, 'server',
    'dashboard-server/server.js should be server (exact match), got ' + result);
});

test('dashboard-server/lib/auth.js → server (not harness)', function () {
  assert.strictEqual(vs.classifySurface('dashboard-server/lib/auth.js'), 'server');
});

test('dashboard-server/public/css/dashboard.css → frontend', function () {
  assert.strictEqual(vs.classifySurface('dashboard-server/public/css/dashboard.css'), 'frontend');
});

test('brain/clients_detailed.md → docs', function () {
  assert.strictEqual(vs.classifySurface('brain/clients_detailed.md'), 'docs');
});

test('roles/senior_engineer/AGENT.md → docs', function () {
  assert.strictEqual(vs.classifySurface('roles/senior_engineer/AGENT.md'), 'docs');
});

// ---------------------------------------------------------------------------
// T3: classifySurface — backslash normalisation
// ---------------------------------------------------------------------------
console.log('\n--- T3: classifySurface backslash normalisation ---');

test('backslash path normalised correctly', function () {
  assert.strictEqual(
    vs.classifySurface('dashboard-server\\routes\\tasks.js'),
    'server'
  );
});

test('backslash in nested path', function () {
  assert.strictEqual(
    vs.classifySurface('dashboard-server\\public\\js\\app.js'),
    'frontend'
  );
});

// ---------------------------------------------------------------------------
// T4: globMatch edge cases
// ---------------------------------------------------------------------------
console.log('\n--- T4: globMatch edge cases ---');

test('** matches deeply nested paths', function () {
  assert.strictEqual(vs._globMatch('a/b/c/d/e.js', 'a/**'), true);
});

test('* does not match across /', function () {
  assert.strictEqual(vs._globMatch('a/b/c.js', 'a/*.js'), false);
});

test('* matches within single segment', function () {
  assert.strictEqual(vs._globMatch('a/file.js', 'a/*.js'), true);
});

test('exact match works', function () {
  assert.strictEqual(vs._globMatch('nbi_project_dashboard.html', 'nbi_project_dashboard.html'), true);
});

test('exact match rejects different file', function () {
  assert.strictEqual(vs._globMatch('other.html', 'nbi_project_dashboard.html'), false);
});

test('case insensitive matching', function () {
  assert.strictEqual(vs._globMatch('README.MD', '*.md'), true);
});

test('**/ at start matches any prefix', function () {
  assert.strictEqual(vs._globMatch('deep/nested/file.js', '**/file.js'), true);
});

test('**/ matches zero segments (file at root)', function () {
  assert.strictEqual(vs._globMatch('file.js', '**/file.js'), true);
});

// ---------------------------------------------------------------------------
// T5: patternSpecificity
// ---------------------------------------------------------------------------
console.log('\n--- T5: patternSpecificity ---');

test('exact filename has highest specificity', function () {
  const exact = vs._patternSpecificity('dashboard-server/server.js');
  const wildcard = vs._patternSpecificity('dashboard-server/*.js');
  assert.ok(exact > wildcard,
    'exact (' + exact + ') should beat wildcard (' + wildcard + ')');
});

test('deeper literal path beats shallower', function () {
  const deep = vs._patternSpecificity('dashboard-server/routes/**');
  const shallow = vs._patternSpecificity('dashboard-server/**');
  assert.ok(deep > shallow,
    'deep (' + deep + ') should beat shallow (' + shallow + ')');
});

test('no wildcards get exact-match bonus', function () {
  const exact = vs._patternSpecificity('nbi_project_dashboard.html');
  const glob = vs._patternSpecificity('*.html');
  assert.ok(exact > glob,
    'exact (' + exact + ') should beat glob (' + glob + ')');
});

// ---------------------------------------------------------------------------
// T6: computeFingerprint
// ---------------------------------------------------------------------------
console.log('\n--- T6: computeFingerprint ---');

test('empty array → null', function () {
  assert.strictEqual(vs.computeFingerprint([]), null);
});

test('null input → null', function () {
  assert.strictEqual(vs.computeFingerprint(null), null);
});

test('undefined input → null', function () {
  assert.strictEqual(vs.computeFingerprint(undefined), null);
});

test('non-empty array → hex string of length 64', function () {
  // Use a file we know exists in the project
  const fp = vs.computeFingerprint(['CLAUDE.md']);
  assert.ok(fp !== null, 'fingerprint should not be null');
  assert.strictEqual(typeof fp, 'string', 'fingerprint should be a string');
  assert.strictEqual(fp.length, 64, 'sha256 hex should be 64 chars, got ' + fp.length);
  assert.ok(/^[0-9a-f]{64}$/.test(fp), 'should be valid hex: ' + fp);
});

test('same files in different order → same fingerprint', function () {
  const fp1 = vs.computeFingerprint(['CLAUDE.md', 'NBI_Brain.md']);
  const fp2 = vs.computeFingerprint(['NBI_Brain.md', 'CLAUDE.md']);
  assert.strictEqual(fp1, fp2, 'order should not matter');
});

test('different files → different fingerprint', function () {
  const fp1 = vs.computeFingerprint(['CLAUDE.md']);
  const fp2 = vs.computeFingerprint(['NBI_Brain.md']);
  assert.notStrictEqual(fp1, fp2, 'different files should produce different fingerprints');
});

test('single file fingerprint is deterministic', function () {
  const fp1 = vs.computeFingerprint(['CLAUDE.md']);
  const fp2 = vs.computeFingerprint(['CLAUDE.md']);
  assert.strictEqual(fp1, fp2, 'same file should produce same fingerprint');
});

// ---------------------------------------------------------------------------
// T7: scanDirtyState — structure
// ---------------------------------------------------------------------------
console.log('\n--- T7: scanDirtyState structure ---');

test('returns object with surfaces and scan_head', function () {
  const state = vs.scanDirtyState();
  assert.ok(state !== null, 'state should not be null');
  assert.ok(typeof state === 'object', 'state should be an object');
  assert.ok('surfaces' in state, 'state should have surfaces key');
  assert.ok('scan_head' in state, 'state should have scan_head key');
});

test('scan_head is a non-empty string', function () {
  const state = vs.scanDirtyState();
  assert.ok(typeof state.scan_head === 'string', 'scan_head should be a string');
  assert.ok(state.scan_head.length > 0, 'scan_head should not be empty');
});

test('each surface has dirty, files, and fingerprint properties', function () {
  const state = vs.scanDirtyState();
  for (const [name, surface] of Object.entries(state.surfaces)) {
    assert.ok('dirty' in surface, name + ' should have dirty property');
    assert.ok('files' in surface, name + ' should have files property');
    assert.ok('fingerprint' in surface, name + ' should have fingerprint property');
    assert.ok(typeof surface.dirty === 'boolean', name + '.dirty should be boolean');
    assert.ok(Array.isArray(surface.files), name + '.files should be an array');
  }
});

test('all defined surfaces are present in state', function () {
  const state = vs.scanDirtyState();
  const expected = Object.keys(surfaceMap);
  for (const name of expected) {
    assert.ok(name in state.surfaces, 'surface ' + name + ' should be present');
  }
});

test('clean surfaces have dirty=false, empty files, null fingerprint', function () {
  const state = vs.scanDirtyState();
  for (const [name, surface] of Object.entries(state.surfaces)) {
    if (!surface.dirty) {
      assert.deepStrictEqual(surface.files, [],
        name + ' (clean) should have empty files array');
      assert.strictEqual(surface.fingerprint, null,
        name + ' (clean) should have null fingerprint');
    }
  }
});

test('dirty surfaces have non-empty files and non-null fingerprint', function () {
  const state = vs.scanDirtyState();
  for (const [name, surface] of Object.entries(state.surfaces)) {
    if (surface.dirty) {
      assert.ok(surface.files.length > 0,
        name + ' (dirty) should have files');
      assert.ok(surface.fingerprint !== null,
        name + ' (dirty) should have a fingerprint');
      assert.strictEqual(typeof surface.fingerprint, 'string',
        name + ' fingerprint should be a string');
    }
  }
});

// ---------------------------------------------------------------------------
// T8: scanDirtyState — state file persistence
// ---------------------------------------------------------------------------
console.log('\n--- T8: State file persistence ---');

test('state file is written to PROJECT_DATA_DIR', function () {
  vs.scanDirtyState();
  const statePath = path.join(R.PROJECT_DATA_DIR, 'verification_state.json');
  assert.ok(fs.existsSync(statePath),
    'verification_state.json should exist at ' + statePath);
});

test('state file is valid JSON', function () {
  vs.scanDirtyState();
  const statePath = path.join(R.PROJECT_DATA_DIR, 'verification_state.json');
  const content = fs.readFileSync(statePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    assert.fail('state file should be valid JSON: ' + e.message);
  }
  assert.ok('surfaces' in parsed, 'parsed state should have surfaces');
  assert.ok('scan_head' in parsed, 'parsed state should have scan_head');
});

test('can be called twice without error (idempotent)', function () {
  const state1 = vs.scanDirtyState();
  const state2 = vs.scanDirtyState();
  assert.ok(state1 !== null, 'first call should return state');
  assert.ok(state2 !== null, 'second call should return state');
  // Same HEAD and same dirty files should produce same fingerprints
  assert.strictEqual(state1.scan_head, state2.scan_head, 'scan_head should be stable');
});

// ---------------------------------------------------------------------------
// T9: readState
// ---------------------------------------------------------------------------
console.log('\n--- T9: readState ---');

test('returns null when no state file exists', function () {
  // Use a fresh temp dir with no state file
  const freshTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-read-'));
  const freshDataDir = path.join(freshTmp, 'data', 'test_project');
  fs.mkdirSync(freshDataDir, { recursive: true });

  // Temporarily swap env to point to the fresh dir
  const origHarness = process.env.HARNESS_DIR;
  const origProject = process.env.CLAUDE_PROJECT_DIR;
  process.env.HARNESS_DIR = freshTmp;
  process.env.CLAUDE_PROJECT_DIR = PROJECT_DIR;
  delete require.cache[require.resolve(resolvePath)];
  delete require.cache[require.resolve(modulePath)];
  const freshVs = require(modulePath);

  const result = freshVs.readState();
  assert.strictEqual(result, null, 'readState should return null when no file exists');

  // Restore
  process.env.HARNESS_DIR = origHarness;
  process.env.CLAUDE_PROJECT_DIR = origProject;
  delete require.cache[require.resolve(resolvePath)];
  delete require.cache[require.resolve(modulePath)];
  fs.rmSync(freshTmp, { recursive: true, force: true });
});

test('returns parsed state after scanDirtyState has been called', function () {
  // Re-require with original env
  delete require.cache[require.resolve(resolvePath)];
  delete require.cache[require.resolve(modulePath)];
  process.env.HARNESS_DIR = tmpHarness;
  process.env.CLAUDE_PROJECT_DIR = PROJECT_DIR;
  const freshVs = require(modulePath);
  const freshR = require(resolvePath);

  freshVs.scanDirtyState();
  const state = freshVs.readState();
  assert.ok(state !== null, 'readState should return parsed state');
  assert.ok('surfaces' in state, 'state should have surfaces');
  assert.ok('scan_head' in state, 'state should have scan_head');
});

test('readState matches last scanDirtyState output', function () {
  delete require.cache[require.resolve(resolvePath)];
  delete require.cache[require.resolve(modulePath)];
  process.env.HARNESS_DIR = tmpHarness;
  process.env.CLAUDE_PROJECT_DIR = PROJECT_DIR;
  const freshVs = require(modulePath);

  const scanned = freshVs.scanDirtyState();
  const read = freshVs.readState();
  assert.deepStrictEqual(read, scanned,
    'readState output should match scanDirtyState output');
});

// ---------------------------------------------------------------------------
// T10: scanDirtyState — real dirty files (this repo has uncommitted changes)
// ---------------------------------------------------------------------------
console.log('\n--- T10: Real dirty file detection ---');

test('detects at least one dirty surface in this repo', function () {
  delete require.cache[require.resolve(resolvePath)];
  delete require.cache[require.resolve(modulePath)];
  process.env.HARNESS_DIR = tmpHarness;
  process.env.CLAUDE_PROJECT_DIR = PROJECT_DIR;
  const freshVs = require(modulePath);

  const state = freshVs.scanDirtyState();
  const dirtySurfaces = Object.entries(state.surfaces)
    .filter(([_, s]) => s.dirty)
    .map(([name]) => name);
  assert.ok(dirtySurfaces.length > 0,
    'repo has uncommitted changes, should have dirty surfaces, found: ' + dirtySurfaces.join(', '));
});

test('dirty surface files are all strings with forward slashes', function () {
  delete require.cache[require.resolve(resolvePath)];
  delete require.cache[require.resolve(modulePath)];
  process.env.HARNESS_DIR = tmpHarness;
  process.env.CLAUDE_PROJECT_DIR = PROJECT_DIR;
  const freshVs = require(modulePath);

  const state = freshVs.scanDirtyState();
  for (const [name, surface] of Object.entries(state.surfaces)) {
    if (surface.dirty) {
      for (const f of surface.files) {
        assert.strictEqual(typeof f, 'string',
          name + ' file entry should be a string');
        assert.ok(f.length > 0,
          name + ' file entry should be non-empty');
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
console.log('\n--- Cleanup ---');
try {
  fs.rmSync(tmpHarness, { recursive: true, force: true });
  console.log('  Temp directory cleaned up: ' + tmpHarness);
} catch (e) {
  console.log('  Warning: could not clean temp dir: ' + e.message);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  - ' + f.name + ': ' + f.error);
  }
}
if (failed > 0) process.exit(1);
