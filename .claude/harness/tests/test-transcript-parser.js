#!/usr/bin/env node
'use strict';
// test-transcript-parser.js — Tests for session join key in transcript parser.
// Creates temp session log files, runs extractSignals, verifies session_log_id,
// emitted_session_id, and capture_method fields.
// Uses Node's built-in assert — no test framework dependency.

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

// We need to require transcript-parser's extractSignals.
// The module currently runs main() on require. We need to extract the function.
// For testing, we'll load the file and extract the function via a child process
// or by modifying the module to export. Let's use the child process approach
// similar to other harness tests, OR we can require it if it exports.

// First, let's check if we need to modify transcript-parser.js to export extractSignals.
// For now, we'll test by spawning it with a temp session log and checking output.
// But the plan says to add session_log_id to the signals — we need to verify the
// JSONL output contains the fields.

const PARSER_PATH = path.resolve(__dirname, '..', 'lib', 'transcript-parser.js');

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

function createTempLog(filename, content) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-test-'));
  const logsDir = path.join(tmpDir, 'projects', 'nbi_dashboard', 'session_logs');
  const dataDir = path.join(tmpDir, '.claude', 'harness', 'data');
  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  const filePath = path.join(logsDir, filename);
  fs.writeFileSync(filePath, content);
  return { tmpDir, filePath, dataDir };
}

function runParser(filePath, tmpDir) {
  const { spawnSync } = require('child_process');
  const result = spawnSync('node', [PARSER_PATH, filePath], {
    env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
    encoding: 'utf8',
    timeout: 5000
  });
  // Read the candidate_signals.jsonl output
  const signalsPath = path.join(tmpDir, '.claude', 'harness', 'data', 'candidate_signals.jsonl');
  let signals = [];
  try {
    const raw = fs.readFileSync(signalsPath, 'utf8').trim();
    if (raw) signals = raw.split('\n').map(l => JSON.parse(l));
  } catch { /* no signals file */ }
  return { stdout: result.stdout, stderr: result.stderr, status: result.status, signals };
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ═══════════════════════════════════════════════════════
// Group 1: session_log_id derived from filename
// ═══════════════════════════════════════════════════════
console.log('\nGroup 1: session_log_id derived from filename');

test('signal includes session_log_id derived from filename', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n\nGlen said: no, not that approach\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.ok(signals.length > 0, 'should find at least one signal');
  assert.strictEqual(signals[0].session_log_id, 'log_2026-06-14',
    'session_log_id should be derived from filename');
});

test('session_log_id handles non-standard filenames', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_deep-linking-audit.md',
    '# Audit\n\nThat\'s wrong, fix it\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.ok(signals.length > 0, 'should find at least one signal');
  assert.strictEqual(signals[0].session_log_id, 'log_2026-06-14_deep-linking-audit',
    'non-standard filename should use full basename minus .md');
});

// ═══════════════════════════════════════════════════════
// Group 2: capture_method field
// ═══════════════════════════════════════════════════════
console.log('\nGroup 2: capture_method field');

test('signal has capture_method set to transcript_parser', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-15_session.md',
    '# Session\n\nStop doing that immediately\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.ok(signals.length > 0, 'should find at least one signal');
  assert.strictEqual(signals[0].capture_method, 'transcript_parser');
});

// ═══════════════════════════════════════════════════════
// Group 3: multiple signals share same session_log_id
// ═══════════════════════════════════════════════════════
console.log('\nGroup 3: multiple signals share same session_log_id');

test('multiple signals from same file share session_log_id', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n\nNo, not that approach\n\nSome work happened\n\nThat\'s wrong, try again\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.ok(signals.length >= 2, 'should find at least 2 signals, found ' + signals.length);
  assert.strictEqual(signals[0].session_log_id, signals[1].session_log_id,
    'all signals from same file should share session_log_id');
});

// ═══════════════════════════════════════════════════════
// Group 4: emitted_session_id extraction
// ═══════════════════════════════════════════════════════
console.log('\nGroup 4: emitted_session_id extraction');

test('extracts emitted_session_id from session log HTML comment', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n<!-- session_id: ses_01KV3G95JWJR6GSN4XR0 -->\n\nNo, not that\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.ok(signals.length > 0, 'should find at least one signal');
  assert.strictEqual(signals[0].emitted_session_id, 'ses_01KV3G95JWJR6GSN4XR0');
});

test('emitted_session_id is null when no comment present', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n\nNo, not that approach\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.ok(signals.length > 0, 'should find at least one signal');
  assert.strictEqual(signals[0].emitted_session_id, null);
});

// ═══════════════════════════════════════════════════════
// Group 5: code fence skipping
// ═══════════════════════════════════════════════════════
console.log('\nGroup 5: code fence skipping');

test('correction inside code fence is not detected', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n\n```\nno, not that approach\nstop doing that\n```\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.strictEqual(signals.length, 0, 'code fence content should be skipped');
});

test('correction after code fence is still detected', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n\n```\nsome code\n```\n\nno, not that approach\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.ok(signals.length > 0, 'correction after fence should be detected');
});

// ═══════════════════════════════════════════════════════
// Group 6: nested code fences
// ═══════════════════════════════════════════════════════
console.log('\nGroup 6: nested code fences');

test('correction inside four-backtick fence with inner three-backtick is not detected', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n\n````\n```\nno, not that approach\n```\n````\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.strictEqual(signals.length, 0, 'nested fence content should be skipped');
});

test('correction after nested fence closes is detected', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n\n````\n```\ncode\n```\n````\n\nno, not that approach\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.ok(signals.length > 0, 'correction after nested fence should be detected');
});

// ═══════════════════════════════════════════════════════
// Group 7: blockquote skipping
// ═══════════════════════════════════════════════════════
console.log('\nGroup 7: blockquote skipping');

test('correction inside blockquote is not detected', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n\n> no, not that approach\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.strictEqual(signals.length, 0, 'blockquote content should be skipped');
});

test('indented blockquote is also skipped', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n\n  > no, not that approach\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.strictEqual(signals.length, 0, 'indented blockquote should be skipped');
});

// ═══════════════════════════════════════════════════════
// Group 7: metadata header skipping
// ═══════════════════════════════════════════════════════
console.log('\nGroup 7: metadata header skipping');

test('correction in metadata header is not detected', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n\n**What:** no, not that approach was used here\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.strictEqual(signals.length, 0, 'metadata header should be skipped');
});

test('correction in Decision header is not detected', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n\n**Decision:** stop doing the old approach\n');
  const { signals } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.strictEqual(signals.length, 0, 'Decision header should be skipped');
});

// ═══════════════════════════════════════════════════════
// Group 8: no signals — no crash
// ═══════════════════════════════════════════════════════
console.log('\nGroup 5: no signals — no crash');

test('file with no correction patterns produces no signals', () => {
  const { tmpDir, filePath } = createTempLog('2026-06-14_session.md',
    '# Session\n\nEverything went well today\n');
  const { signals, status } = runParser(filePath, tmpDir);
  cleanup(tmpDir);
  assert.strictEqual(signals.length, 0, 'no signals expected');
  assert.strictEqual(status, 0, 'should exit cleanly');
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
