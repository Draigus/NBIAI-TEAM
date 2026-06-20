#!/usr/bin/env node
'use strict';
// Unit tests for token-aware locking, session ID race fix, and Atomics.wait.
// Tests exercise acquireLock, releaseLock, getSessionId directly via exports.
// All file operations use isolated temp directories.

const fs = require('fs');
const path = require('path');
const os = require('os');

// We need to set CLAUDE_PROJECT_DIR to a temp dir BEFORE requiring emit-event,
// because the module reads it at load time for path constants.
const TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-lock-test-'));
const TEMP_HARNESS = path.join(TEMP_ROOT, '.claude', 'harness');
const TEMP_DATA = path.join(TEMP_HARNESS, 'data');
const TEMP_LOCKS = path.join(TEMP_DATA, '.locks');
const TEMP_CONFIG = path.join(TEMP_HARNESS, 'config');

fs.mkdirSync(TEMP_CONFIG, { recursive: true });
fs.mkdirSync(TEMP_DATA, { recursive: true });
fs.mkdirSync(TEMP_LOCKS, { recursive: true });

// Write a minimal redaction config so the module loads cleanly
fs.writeFileSync(path.join(TEMP_CONFIG, 'redaction.json'), JSON.stringify({ patterns: [] }));

// Set env before require
process.env.CLAUDE_PROJECT_DIR = TEMP_ROOT;
process.env.HARNESS_DIR = TEMP_HARNESS;

const emitPath = path.resolve(__dirname, '..', 'lib', 'emit-event.js');
const emit = require(emitPath);
const R = require(path.resolve(__dirname, '..', 'lib', 'resolve.js'));
fs.mkdirSync(R.PROJECT_DATA_DIR, { recursive: true });

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

function cleanup() {
  // Remove any lock files and session files between tests
  try { fs.rmSync(TEMP_LOCKS, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(TEMP_LOCKS, { recursive: true });
  const sessionFile = path.join(R.PROJECT_DATA_DIR, '.session_id');
  try { fs.unlinkSync(sessionFile); } catch {}
}

console.log('Test: locking (token-aware) — isolated temp dir: ' + TEMP_ROOT);

// ---------------------------------------------------------------
// Test 1: acquireLock returns a token string (not boolean, not null)
// ---------------------------------------------------------------
console.log('\n--- T1: acquireLock returns token string ---');
cleanup();
{
  const lockPath = path.join(TEMP_LOCKS, 't1.lock');
  const token = emit.acquireLock(lockPath, 5000, 3);
  assert(typeof token === 'string', 'acquireLock returns a string');
  assert(token !== 'true' && token !== 'false', 'token is not stringified boolean');
  assert(token !== null && token !== undefined, 'token is not null/undefined');
  assert(token.length > 0, 'token is non-empty');

  // Verify the lock file contains the token
  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  assert(lockData.token === token, 'lock file contains matching token');
  assert(typeof lockData.pid === 'number', 'lock file contains pid');
  assert(typeof lockData.expires_at === 'number', 'lock file contains expires_at');

  // Cleanup
  emit.releaseLock(lockPath, token);
}

// ---------------------------------------------------------------
// Test 2: releaseLock with correct token deletes lock file
// ---------------------------------------------------------------
console.log('\n--- T2: releaseLock with correct token succeeds ---');
cleanup();
{
  const lockPath = path.join(TEMP_LOCKS, 't2.lock');
  const token = emit.acquireLock(lockPath, 5000, 3);
  assert(fs.existsSync(lockPath), 'lock file exists before release');
  emit.releaseLock(lockPath, token);
  assert(!fs.existsSync(lockPath), 'lock file deleted after release with correct token');
}

// ---------------------------------------------------------------
// Test 3: releaseLock with wrong token does NOT delete lock
// ---------------------------------------------------------------
console.log('\n--- T3: releaseLock with wrong token preserves lock ---');
cleanup();
{
  const lockPath = path.join(TEMP_LOCKS, 't3.lock');
  const token = emit.acquireLock(lockPath, 5000, 3);
  assert(fs.existsSync(lockPath), 'lock file exists before wrong-token release');
  emit.releaseLock(lockPath, 'wrong_token_value');
  assert(fs.existsSync(lockPath), 'lock file still exists after wrong-token release');

  // Verify lock contents unchanged
  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  assert(lockData.token === token, 'lock file token unchanged after wrong-token release');

  // Cleanup with correct token
  emit.releaseLock(lockPath, token);
}

// ---------------------------------------------------------------
// Test 4: Stale lock is cleaned up and acquire succeeds
// ---------------------------------------------------------------
console.log('\n--- T4: stale lock cleanup ---');
cleanup();
{
  const lockPath = path.join(TEMP_LOCKS, 't4.lock');
  // Write a lock that expired 5 seconds ago
  fs.writeFileSync(lockPath, JSON.stringify({
    pid: 99999,
    token: 'stale_token',
    expires_at: Date.now() - 5000
  }), { flag: 'wx' });
  assert(fs.existsSync(lockPath), 'stale lock file exists');

  // acquireLock should clean it up and succeed
  const token = emit.acquireLock(lockPath, 5000, 3);
  assert(typeof token === 'string' && token.length > 0, 'acquireLock succeeds after stale lock');
  assert(token !== 'stale_token', 'new token differs from stale token');

  // Verify the lock file now has the new token
  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  assert(lockData.token === token, 'lock file has new token after stale cleanup');

  emit.releaseLock(lockPath, token);
}

// ---------------------------------------------------------------
// Test 5: getSessionId returns consistent ID within 4-hour window
// ---------------------------------------------------------------
console.log('\n--- T5: getSessionId consistency ---');
cleanup();
{
  const id1 = emit.getSessionId();
  assert(typeof id1 === 'string', 'getSessionId returns a string');
  assert(id1.startsWith('ses_'), 'session ID has ses_ prefix');

  const id2 = emit.getSessionId();
  assert(id2 === id1, 'second call returns same session ID');

  const id3 = emit.getSessionId();
  assert(id3 === id1, 'third call returns same session ID');
}

// ---------------------------------------------------------------
// Test 6: getSessionId under lock creates ID atomically
// ---------------------------------------------------------------
console.log('\n--- T6: getSessionId atomic creation ---');
cleanup();
{
  // Verify session file does not exist
  const sessionFile = path.join(R.PROJECT_DATA_DIR, '.session_id');
  assert(!fs.existsSync(sessionFile), 'session file absent before getSessionId');

  const id = emit.getSessionId();
  assert(fs.existsSync(sessionFile), 'session file created after getSessionId');

  // Verify the file content matches the returned ID
  const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
  assert(data.id === id, 'session file content matches returned ID');
  assert(typeof data.created === 'number', 'session file has created timestamp');

  // Verify no stale session lock remains
  const sessionLock = path.join(TEMP_LOCKS, 'session.lock');
  assert(!fs.existsSync(sessionLock), 'session lock cleaned up after getSessionId');
}

// ---------------------------------------------------------------
// Test 7: acquireLock returns null on non-EEXIST failure
// ---------------------------------------------------------------
console.log('\n--- T7: acquireLock returns null on failure ---');
{
  // Try to acquire a lock in a non-existent directory (will fail with ENOENT, not EEXIST)
  const badPath = path.join(TEMP_ROOT, 'nonexistent', 'dir', 'test.lock');
  const result = emit.acquireLock(badPath, 5000, 1);
  assert(result === null, 'acquireLock returns null for non-EEXIST errors');
}

// ---------------------------------------------------------------
// Test 8: Two acquireLock calls — second fails while first held
// ---------------------------------------------------------------
console.log('\n--- T8: second acquireLock fails while first held ---');
cleanup();
{
  const lockPath = path.join(TEMP_LOCKS, 't8.lock');
  const token1 = emit.acquireLock(lockPath, 30000, 1);
  assert(typeof token1 === 'string', 'first acquire succeeds');

  // Second acquire with only 1 retry should fail (lock not stale)
  const token2 = emit.acquireLock(lockPath, 30000, 1);
  assert(token2 === null, 'second acquire returns null while first held');

  // Original lock should still be valid
  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  assert(lockData.token === token1, 'original lock token preserved');

  emit.releaseLock(lockPath, token1);
}

// ---------------------------------------------------------------
// Test 9: Corrupt lock file — NOT blindly deleted if recent
// ---------------------------------------------------------------
console.log('\n--- T9: corrupt lock file not deleted if recent ---');
cleanup();
{
  const lockPath = path.join(TEMP_LOCKS, 't9.lock');
  // Write corrupt (non-JSON) content to the lock file
  fs.writeFileSync(lockPath, 'THIS IS NOT JSON', { flag: 'wx' });

  // acquireLock should fail (corrupt file is recent, not past TTL)
  const token = emit.acquireLock(lockPath, 30000, 1);
  assert(token === null, 'acquireLock returns null when corrupt lock is recent');

  // The corrupt lock file should still exist (not blindly deleted)
  assert(fs.existsSync(lockPath), 'corrupt recent lock file preserved (not blindly deleted)');

  // Clean up
  fs.unlinkSync(lockPath);
}

// ---------------------------------------------------------------
// Test 10: Corrupt lock file — deleted if past TTL (stale)
// ---------------------------------------------------------------
console.log('\n--- T10: corrupt stale lock file cleaned up via mtime ---');
cleanup();
{
  const lockPath = path.join(TEMP_LOCKS, 't10.lock');
  fs.writeFileSync(lockPath, 'CORRUPT OLD LOCK', { flag: 'wx' });

  // Backdate the file mtime to make it stale
  const past = new Date(Date.now() - 60000); // 60 seconds ago
  fs.utimesSync(lockPath, past, past);

  // acquireLock with short TTL (5s) should clean the stale corrupt file and succeed
  const token = emit.acquireLock(lockPath, 5000, 2);
  assert(typeof token === 'string', 'acquireLock succeeds after cleaning stale corrupt lock');

  emit.releaseLock(lockPath, token);
}

// Cleanup temp dir
fs.rmSync(TEMP_ROOT, { recursive: true, force: true });

// Summary
console.log('\n' + '='.repeat(40));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
