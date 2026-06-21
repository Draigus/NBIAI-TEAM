#!/usr/bin/env node
'use strict';
// Tests for evidence-ledger.js. Uses an isolated temp directory
// so tests never pollute live data.
// Run: node tests/test-evidence-ledger.js

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// --- Setup temp isolation ---
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-evidence-'));
process.env.HARNESS_DIR = tmpDir;
process.env.CLAUDE_PROJECT_DIR = path.resolve(__dirname, '..', '..', '..');

// Clear resolve cache so it picks up env overrides
delete require.cache[require.resolve('../lib/resolve')];
const R = require('../lib/resolve');

// Create project data directory
fs.mkdirSync(R.PROJECT_DATA_DIR, { recursive: true });

// Clear ledger module cache and load fresh
delete require.cache[require.resolve('../lib/evidence-ledger')];
const ledger = require('../lib/evidence-ledger');

let passed = 0;
let failed = 0;

function pass(msg) {
  passed++;
  console.log('  PASS: ' + msg);
}

function fail(msg, detail) {
  failed++;
  console.error('  FAIL: ' + msg + (detail ? ' -- ' + detail : ''));
}

function assertEq(actual, expected, msg) {
  if (actual === expected) { pass(msg); }
  else { fail(msg, 'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); }
}

function assertTrue(cond, msg) {
  if (cond) { pass(msg); }
  else { fail(msg); }
}

// ===== generateEvidenceId =====

console.log('\nTest: generateEvidenceId\n');

var id1 = ledger.generateEvidenceId('unit_test');
assertTrue(typeof id1 === 'string' && id1.startsWith('EV-'), 'returns string starting with EV-');
assertTrue(id1.endsWith('-unit_test'), 'contains the type at the end');

var id2 = ledger.generateEvidenceId('e2e');
assertTrue(id2.endsWith('-e2e'), 'different type produces different suffix');
assertTrue(id1 !== id2, 'two calls with different types produce different IDs');

// Format check: EV-YYYYMMDD-HHMMSS-type
var formatRe = /^EV-\d{8}-\d{9}-.+$/;
assertTrue(formatRe.test(id1), 'format matches EV-YYYYMMDD-HHMMSS-type pattern');

// ===== recordEvidence =====

console.log('\n--- recordEvidence ---');

var ledgerFile = path.join(R.PROJECT_DATA_DIR, 'evidence_ledger.jsonl');

// Ensure file does not exist before first record
try { fs.unlinkSync(ledgerFile); } catch (_) {}

var rec1 = ledger.recordEvidence(
  'unit_test',
  'npm test',
  0,
  '767/767 passed',
  { server: 'abc123', frontend: 'def456' }
);

assertTrue(fs.existsSync(ledgerFile), 'creates the ledger file if it does not exist');

var content = fs.readFileSync(ledgerFile, 'utf8').trim();
var lines = content.split('\n');
assertEq(lines.length, 1, 'first call appends one line');

var parsed = JSON.parse(lines[0]);
assertTrue(parsed.id.startsWith('EV-'), 'record has id field starting with EV-');
assertTrue(!!parsed.ts, 'record has ts field');
assertEq(parsed.type, 'unit_test', 'record has correct type');
assertEq(parsed.command.raw, 'npm test', 'command.raw preserved for string input');
assertEq(parsed.command.resolved, 'npm test', 'command.resolved matches raw for string input');
assertEq(parsed.exit_code, 0, 'exit_code preserved (0)');
assertEq(parsed.result_summary, '767/767 passed', 'result_summary preserved');
assertTrue(Array.isArray(parsed.surfaces_covered), 'surfaces_covered is array');
assertEq(parsed.surfaces_covered.length, 2, 'surfaces_covered has 2 entries');
assertEq(parsed.surface_fingerprints.server, 'abc123', 'surface fingerprint server preserved');
assertEq(parsed.surface_fingerprints.frontend, 'def456', 'surface fingerprint frontend preserved');

// Multiple calls append multiple lines
var rec2 = ledger.recordEvidence(
  'e2e',
  { raw: 'npx playwright test', resolved: 'npx playwright test', cwd: '/app' },
  1,
  '3/10 failed',
  { frontend: 'ghi789' }
);

var content2 = fs.readFileSync(ledgerFile, 'utf8').trim();
var lines2 = content2.split('\n');
assertEq(lines2.length, 2, 'multiple calls append multiple lines');

var parsed2 = JSON.parse(lines2[1]);
assertEq(parsed2.exit_code, 1, 'exit_code preserved (non-zero)');
assertEq(parsed2.command.cwd, '/app', 'command object cwd preserved');

// ===== recordBrowserEvidence =====

console.log('\n--- recordBrowserEvidence ---');

var browseRec = ledger.recordBrowserEvidence(
  'http://localhost:8888/dashboard',
  'navigate + snapshot',
  0,
  'Dashboard loaded, no JS errors',
  { frontend: 'xyz999' }
);

var content3 = fs.readFileSync(ledgerFile, 'utf8').trim();
var lines3 = content3.split('\n');
var browserParsed = JSON.parse(lines3[lines3.length - 1]);

assertEq(browserParsed.type, 'browser_check', 'creates a record with type browser_check');
assertTrue(!!browserParsed.browser_evidence, 'has browser_evidence field');
assertEq(browserParsed.browser_evidence.url, 'http://localhost:8888/dashboard', 'browser_evidence.url correct');
assertEq(browserParsed.browser_evidence.action, 'navigate + snapshot', 'browser_evidence.action correct');
assertEq(browserParsed.browser_evidence.console_errors, 0, 'browser_evidence.console_errors correct');
assertEq(browserParsed.browser_evidence.assertion, 'Dashboard loaded, no JS errors', 'browser_evidence.assertion correct');

// Browser evidence with console errors sets exit_code to 1
var browseRecErr = ledger.recordBrowserEvidence(
  'http://localhost:8888/broken',
  'navigate',
  3,
  'JS errors found',
  { frontend: 'broken1' }
);
var content3b = fs.readFileSync(ledgerFile, 'utf8').trim();
var browserErrParsed = JSON.parse(content3b.split('\n').pop());
assertEq(browserErrParsed.exit_code, 1, 'browser evidence with console errors has exit_code 1');

// ===== readLedger =====

console.log('\n--- readLedger ---');

// Remove ledger and test empty state
try { fs.unlinkSync(ledgerFile); } catch (_) {}
var emptyResult = ledger.readLedger();
assertTrue(Array.isArray(emptyResult), 'returns array when no file exists');
assertEq(emptyResult.length, 0, 'returns empty array when no file exists');

// Write fresh records for readLedger tests
ledger.recordEvidence('unit_test', 'npm test', 0, 'all passed', { server: 'a1' });
ledger.recordEvidence('e2e', 'npx playwright', 0, 'all passed', { frontend: 'b2' });

var readResult = ledger.readLedger();
assertTrue(Array.isArray(readResult), 'returns array of parsed records');
assertEq(readResult.length, 2, 'returns correct number of records');
assertEq(readResult[0].type, 'unit_test', 'first record type correct');
assertEq(readResult[1].type, 'e2e', 'second record type correct');

// Test 7-day retention filter: inject an old record manually
var oldRecord = {
  id: 'EV-20260101-000000-old',
  ts: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  type: 'unit_test',
  command: { raw: 'old test', resolved: 'old test', cwd: '/' },
  exit_code: 0,
  git_head: 'abc',
  branch: 'main',
  surface_fingerprints: { server: 'old' },
  surfaces_covered: ['server'],
  result_summary: 'old result',
  session_id: 'unknown'
};
fs.appendFileSync(ledgerFile, JSON.stringify(oldRecord) + '\n');

var afterOld = ledger.readLedger();
assertEq(afterOld.length, 2, 'filters out records older than 7 days');
assertTrue(
  !afterOld.some(function(r) { return r.id === 'EV-20260101-000000-old'; }),
  'old record excluded from results'
);

// ===== getValidEvidence =====

console.log('\n--- getValidEvidence ---');

// Reset ledger with controlled records
try { fs.unlinkSync(ledgerFile); } catch (_) {}

// Record 1: exit_code 0, server fingerprint 'fp_server_1'
ledger.recordEvidence('unit_test', 'npm test', 0, 'passed', { server: 'fp_server_1' });

// Record 2: exit_code 1 (failure), server fingerprint 'fp_server_1'
ledger.recordEvidence('unit_test', 'npm test', 1, 'failed', { server: 'fp_server_1' });

// Record 3: exit_code 0, frontend fingerprint 'fp_front_1'
ledger.recordEvidence('e2e', 'playwright', 0, 'passed', { frontend: 'fp_front_1' });

// Record 4: exit_code 0, server fingerprint 'fp_server_OLD' (no longer matches)
ledger.recordEvidence('unit_test', 'npm test', 0, 'passed', { server: 'fp_server_OLD' });

// Query with current fingerprints where server matches record 1
var valid1 = ledger.getValidEvidence({ server: 'fp_server_1' });
assertEq(valid1.length, 1, 'returns 1 record matching fingerprint with exit_code 0');
assertEq(valid1[0].type, 'unit_test', 'matching record is unit_test');
assertEq(valid1[0].exit_code, 0, 'matching record has exit_code 0');

// Query with fingerprint that matches nothing
var validNone = ledger.getValidEvidence({ server: 'no_match' });
assertEq(validNone.length, 0, 'returns empty array when no fingerprints match');

// Query with empty fingerprints
var validEmpty = ledger.getValidEvidence({});
assertEq(validEmpty.length, 0, 'returns empty array for empty fingerprints');

// Query with null fingerprints
var validNull = ledger.getValidEvidence(null);
assertEq(validNull.length, 0, 'returns empty array for null fingerprints');

// Query matching frontend fingerprint
var validFront = ledger.getValidEvidence({ frontend: 'fp_front_1' });
assertEq(validFront.length, 1, 'returns matching frontend record');
assertEq(validFront[0].type, 'e2e', 'frontend match is the e2e record');

// Query matching both surfaces
var validBoth = ledger.getValidEvidence({ server: 'fp_server_1', frontend: 'fp_front_1' });
assertEq(validBoth.length, 2, 'returns records matching either surface');

// Excludes exit_code != 0 even when fingerprint matches
var failFingerprint = ledger.getValidEvidence({ server: 'fp_server_1' });
assertTrue(
  failFingerprint.every(function(r) { return r.exit_code === 0; }),
  'excludes records with exit_code != 0 even if fingerprint matches'
);

// Excludes records with non-matching fingerprint even if exit_code is 0
var oldFpResult = ledger.getValidEvidence({ server: 'fp_server_NEW' });
assertEq(oldFpResult.length, 0, 'excludes records where fingerprint does not match even if exit_code is 0');

// ===== Cleanup =====
fs.rmSync(tmpDir, { recursive: true, force: true });

// ===== Summary =====
console.log('\n' + '='.repeat(40));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
