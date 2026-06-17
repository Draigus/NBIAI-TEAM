#!/usr/bin/env node
'use strict';
// test-bootstrap-git.js — Tests for S12 bootstrap git history ingestion.

const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const BOOTSTRAP_PATH = path.resolve(__dirname, '..', 'lib', 'bootstrap.js');

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

function setupMockRepo(commits) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bs-git-'));
  const configDir = path.join(tmpDir, '.claude', 'harness', 'config');
  const dataDir = path.join(tmpDir, '.claude', 'harness', 'data');
  const libDir = path.join(tmpDir, '.claude', 'harness', 'lib');
  const logsDir = path.join(tmpDir, 'projects', 'nbi_dashboard', 'session_logs');
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(path.join(dataDir, '.locks'), { recursive: true });
  fs.mkdirSync(libDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });

  fs.writeFileSync(path.join(configDir, 'redaction.json'), JSON.stringify({
    patterns: [], client_sensitive_fields: {}
  }));

  const emitSrc = path.resolve(__dirname, '..', 'lib', 'emit-event.js');
  fs.copyFileSync(emitSrc, path.join(libDir, 'emit-event.js'));

  execSync('git init', { cwd: tmpDir });
  execSync('git config user.email "t@t"', { cwd: tmpDir });
  execSync('git config user.name "T"', { cwd: tmpDir });

  for (const msg of commits) {
    fs.appendFileSync(path.join(tmpDir, 'file.txt'), msg + '\n');
    execSync('git add -A && git commit -m "' + msg.replace(/"/g, '\\"') + '"', {
      cwd: tmpDir, encoding: 'utf8'
    });
  }

  return tmpDir;
}

function runBootstrap(tmpDir) {
  const result = spawnSync('node', [BOOTSTRAP_PATH], {
    cwd: tmpDir,
    env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
    encoding: 'utf8',
    timeout: 30000
  });
  const eventsDir = path.join(tmpDir, '.claude', 'harness', 'data', 'events');
  let events = [];
  try {
    const dates = fs.readdirSync(eventsDir);
    for (const d of dates) {
      const files = fs.readdirSync(path.join(eventsDir, d));
      for (const f of files) {
        const lines = fs.readFileSync(path.join(eventsDir, d, f), 'utf8').trim().split('\n');
        events.push(...lines.map(l => JSON.parse(l)));
      }
    }
  } catch {}
  const markerPath = path.join(tmpDir, '.claude', 'harness', 'data', 'bootstrap_complete.json');
  let marker = null;
  try { marker = JSON.parse(fs.readFileSync(markerPath, 'utf8')); } catch {}
  return { stdout: result.stdout, stderr: result.stderr, status: result.status, events, marker };
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ═══════════════════════════════════════════════════════
// Group 1: domain inference from commit prefix
// ═══════════════════════════════════════════════════════
console.log('\nGroup 1: domain inference');

test('feat commit inferred as feature', () => {
  const tmpDir = setupMockRepo(['feat(dashboard): add kanban view']);
  const { events } = runBootstrap(tmpDir);
  cleanup(tmpDir);
  const git = events.filter(e => e.metadata && e.metadata.source === 'git_history');
  assert.ok(git.length > 0, 'should have git history events');
  assert.strictEqual(git[0].metadata.task_type_inferred, 'feature');
});

test('fix(harness) commit inferred as harness', () => {
  const tmpDir = setupMockRepo(['fix(harness): M2 shell guard']);
  const { events } = runBootstrap(tmpDir);
  cleanup(tmpDir);
  const git = events.filter(e => e.metadata && e.metadata.source === 'git_history');
  assert.ok(git.length > 0, 'should have git history events');
  assert.strictEqual(git[0].metadata.task_type_inferred, 'harness');
});

test('intel commit inferred as intelligence', () => {
  const tmpDir = setupMockRepo(['intel(ingest): granola 8 extracts']);
  const { events } = runBootstrap(tmpDir);
  cleanup(tmpDir);
  const git = events.filter(e => e.metadata && e.metadata.source === 'git_history');
  assert.strictEqual(git[0].metadata.task_type_inferred, 'intelligence');
});

test('feat mentioning harness in body inferred as feature not harness', () => {
  const tmpDir = setupMockRepo(['feat: add harness telemetry']);
  const { events } = runBootstrap(tmpDir);
  cleanup(tmpDir);
  const git = events.filter(e => e.metadata && e.metadata.source === 'git_history');
  assert.ok(git.length > 0);
  assert.strictEqual(git[0].metadata.task_type_inferred, 'feature');
});

test('unknown prefix inferred as unknown', () => {
  const tmpDir = setupMockRepo(['random commit message']);
  const { events } = runBootstrap(tmpDir);
  cleanup(tmpDir);
  const git = events.filter(e => e.metadata && e.metadata.source === 'git_history');
  assert.strictEqual(git[0].metadata.task_type_inferred, 'unknown');
});

// ═══════════════════════════════════════════════════════
// Group 2: idempotency
// ═══════════════════════════════════════════════════════
console.log('\nGroup 2: idempotency');

test('second run skips git history when flag is set', () => {
  const tmpDir = setupMockRepo(['feat: first', 'fix: second']);
  runBootstrap(tmpDir);
  const r2 = runBootstrap(tmpDir);
  cleanup(tmpDir);
  assert.ok(r2.stdout.includes('already completed'), 'second run should skip');
});

test('marker includes git_history_bootstrapped flag', () => {
  const tmpDir = setupMockRepo(['feat: test']);
  const { marker } = runBootstrap(tmpDir);
  cleanup(tmpDir);
  assert.strictEqual(marker.git_history_bootstrapped, true);
  assert.ok(marker.completed, 'should have completed timestamp');
});

// ═══════════════════════════════════════════════════════
// Group 3: event fields
// ═══════════════════════════════════════════════════════
console.log('\nGroup 3: event fields');

test('git history events have correct metadata fields', () => {
  const tmpDir = setupMockRepo(['fix(dashboard): resolve bug']);
  const { events } = runBootstrap(tmpDir);
  cleanup(tmpDir);
  const git = events.filter(e => e.metadata && e.metadata.source === 'git_history');
  assert.ok(git.length > 0);
  assert.strictEqual(git[0].metadata.capture_method, 'bootstrap');
  assert.strictEqual(git[0].metadata.confidence, 'low');
  assert.ok(git[0].metadata.source_file, 'should have commit hash as source_file');
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
