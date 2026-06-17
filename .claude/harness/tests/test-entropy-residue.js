#!/usr/bin/env node
'use strict';
// test-entropy-residue.js — Tests for S9 new-file cross-reference in entropy-scan.
// Uses a mock git repo to test file residue detection.

const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const SCAN_PATH = path.resolve(__dirname, '..', 'lib', 'entropy-scan.js');

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

function setupMockRepo(files, referencing) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ent-res-'));
  const configDir = path.join(tmpDir, '.claude', 'harness', 'config');
  const dataDir = path.join(tmpDir, '.claude', 'harness', 'data');
  const libDir = path.join(tmpDir, '.claude', 'harness', 'lib');
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(libDir, { recursive: true });

  fs.writeFileSync(path.join(configDir, 'entropy-checks.json'), JSON.stringify({
    fast_scan: { code_residue: [], test_integrity: {}, file_residue: { temp_patterns: [], severity: 1 } }
  }));
  fs.writeFileSync(path.join(configDir, 'redaction.json'), JSON.stringify({
    patterns: [], client_sensitive_fields: {}
  }));

  // Copy emit-event.js for signal emission
  const emitSrc = path.resolve(__dirname, '..', 'lib', 'emit-event.js');
  fs.copyFileSync(emitSrc, path.join(libDir, 'emit-event.js'));
  fs.mkdirSync(path.join(dataDir, '.locks'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'projects', 'nbi_dashboard', 'session_logs'), { recursive: true });

  // Init git repo with initial commit
  execSync('git init', { cwd: tmpDir, encoding: 'utf8' });
  execSync('git config user.email "test@test.com"', { cwd: tmpDir });
  execSync('git config user.name "Test"', { cwd: tmpDir });
  fs.writeFileSync(path.join(tmpDir, 'initial.txt'), 'initial');
  execSync('git add -A && git commit -m "initial"', { cwd: tmpDir, encoding: 'utf8' });

  // Create new files and optionally reference them
  for (const f of files) {
    const fp = path.join(tmpDir, f);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, '// new file: ' + f);
  }
  if (referencing) {
    for (const r of referencing) {
      const fp = path.join(tmpDir, r.file);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, r.content);
    }
  }
  execSync('git add -A && git commit -m "add files"', { cwd: tmpDir, encoding: 'utf8' });

  return tmpDir;
}

function runScan(tmpDir) {
  const result = spawnSync('node', [SCAN_PATH], {
    cwd: tmpDir,
    env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
    encoding: 'utf8',
    timeout: 15000
  });
  // Read trend file for signals
  const trendPath = path.join(tmpDir, '.claude', 'harness', 'data', 'entropy_trend.jsonl');
  let trend = null;
  try { trend = JSON.parse(fs.readFileSync(trendPath, 'utf8').trim().split('\n').pop()); } catch {}
  // Read event files for signal details
  const eventsDir = path.join(tmpDir, '.claude', 'harness', 'data', 'events');
  let events = [];
  try {
    const dates = fs.readdirSync(eventsDir);
    for (const d of dates) {
      const dateDir = path.join(eventsDir, d);
      const files = fs.readdirSync(dateDir);
      for (const f of files) {
        const lines = fs.readFileSync(path.join(dateDir, f), 'utf8').trim().split('\n');
        events.push(...lines.map(l => JSON.parse(l)));
      }
    }
  } catch {}
  return { stdout: result.stdout, stderr: result.stderr, status: result.status, trend, events };
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ═══════════════════════════════════════════════════════
// Group 1: unreferenced new file
// ═══════════════════════════════════════════════════════
console.log('\nGroup 1: unreferenced new file');

test('new file not referenced by any other file produces severity 2', () => {
  const tmpDir = setupMockRepo(['src/orphan.js'], []);
  const { events } = runScan(tmpDir);
  cleanup(tmpDir);
  const residue = events.filter(e => e.type === 'entropy_signal' && e.detail && e.detail.includes('new_unreferenced_file'));
  assert.ok(residue.length > 0, 'should detect unreferenced file');
  assert.ok(residue[0].detail.includes('orphan.js'), 'detail mentions the file');
  assert.strictEqual(residue[0].severity, 2);
});

// ═══════════════════════════════════════════════════════
// Group 2: referenced new file (dependency introduced)
// ═══════════════════════════════════════════════════════
console.log('\nGroup 2: referenced new file');

test('new file referenced by another changed file produces severity 1', () => {
  const tmpDir = setupMockRepo(
    ['lib/helper.js'],
    [{ file: 'main.js', content: "const h = require('./lib/helper.js');\nconsole.log(h);" }]
  );
  const { events } = runScan(tmpDir);
  cleanup(tmpDir);
  const dep = events.filter(e => e.type === 'entropy_signal' && e.detail && e.detail.includes('new_dependency_introduced'));
  assert.ok(dep.length > 0, 'should detect referenced file as new dependency');
  assert.strictEqual(dep[0].severity, 1);
});

// ═══════════════════════════════════════════════════════
// Group 3: excluded patterns
// ═══════════════════════════════════════════════════════
console.log('\nGroup 3: excluded patterns');

test('.gitkeep is excluded from new-file check', () => {
  const tmpDir = setupMockRepo(['empty-dir/.gitkeep'], []);
  const { events } = runScan(tmpDir);
  cleanup(tmpDir);
  const residue = events.filter(e => e.type === 'entropy_signal' && e.detail && e.detail.includes('gitkeep'));
  assert.strictEqual(residue.length, 0, 'gitkeep should be excluded');
});

// ═══════════════════════════════════════════════════════
// Group 4: no new files — no signal
// ═══════════════════════════════════════════════════════
console.log('\nGroup 4: no new files');

test('modified-only commit produces no file residue signal', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ent-res-'));
  const configDir = path.join(tmpDir, '.claude', 'harness', 'config');
  const dataDir = path.join(tmpDir, '.claude', 'harness', 'data');
  const libDir = path.join(tmpDir, '.claude', 'harness', 'lib');
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(dataDir, '.locks'), { recursive: true });
  fs.mkdirSync(libDir, { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'projects', 'nbi_dashboard', 'session_logs'), { recursive: true });
  fs.writeFileSync(path.join(configDir, 'entropy-checks.json'), JSON.stringify({
    fast_scan: { code_residue: [], test_integrity: {}, file_residue: { temp_patterns: [], severity: 1 } }
  }));
  fs.writeFileSync(path.join(configDir, 'redaction.json'), JSON.stringify({
    patterns: [], client_sensitive_fields: {}
  }));
  const emitSrc = path.resolve(__dirname, '..', 'lib', 'emit-event.js');
  fs.copyFileSync(emitSrc, path.join(libDir, 'emit-event.js'));
  execSync('git init', { cwd: tmpDir, encoding: 'utf8' });
  execSync('git config user.email "test@test.com"', { cwd: tmpDir });
  execSync('git config user.name "Test"', { cwd: tmpDir });
  fs.writeFileSync(path.join(tmpDir, 'existing.txt'), 'v1');
  execSync('git add -A && git commit -m "initial"', { cwd: tmpDir, encoding: 'utf8' });
  fs.writeFileSync(path.join(tmpDir, 'existing.txt'), 'v2');
  execSync('git add -A && git commit -m "modify"', { cwd: tmpDir, encoding: 'utf8' });
  const { events } = runScan(tmpDir);
  cleanup(tmpDir);
  const residue = events.filter(e => e.type === 'entropy_signal' && e.detail && (e.detail.includes('new_unreferenced') || e.detail.includes('new_dependency')));
  assert.strictEqual(residue.length, 0, 'no new-file signals expected');
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
