#!/usr/bin/env node
'use strict';
// Tests entropy-scan.js pattern matching against mock diffs.
// Does NOT require a real git repo — tests the scan logic directly.
// Run: node .claude/harness/tests/test-entropy-scan.js

const fs = require('fs');
const os = require('os');
const path = require('path');

const CHECKS_PATH = path.resolve(__dirname, '..', 'config', 'entropy-checks.json');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

const checks = JSON.parse(fs.readFileSync(CHECKS_PATH, 'utf8'));

console.log('Test: entropy check patterns\n');

// Test code residue patterns against sample diff lines
const codeResidueTests = [
  { line: '+  console.log("debug");', name: 'console.log', shouldMatch: true },
  { line: '+  debugger;', name: 'debugger', shouldMatch: true },
  { line: '+  // TODO: fix this', name: 'TODO added', shouldMatch: true },
  { line: '+  // const oldVar = 5;', name: 'commented-out code', shouldMatch: true },
  { line: '+  const x = 5;', name: 'console.log', shouldMatch: false },
  { line: '-  console.log("removed");', name: 'console.log', shouldMatch: false }
];

console.log('--- Code residue patterns ---');
for (const t of codeResidueTests) {
  const check = checks.fast_scan.code_residue.find(c => c.name === t.name);
  if (!check) { assert(false, 'Pattern not found: ' + t.name); continue; }
  const re = new RegExp(check.regex, check.flags || 'gm');
  const matches = re.test(t.line);
  assert(matches === t.shouldMatch, t.name + ' ' + (t.shouldMatch ? 'matches' : 'rejects') + ': ' + t.line.trim());
}

// Test test integrity patterns
console.log('\n--- Test integrity patterns ---');
const ti = checks.fast_scan.test_integrity;
const weakenedRe = new RegExp(ti.weakened_assertions);
assert(weakenedRe.test('-  expect(result).toBe(5)'), 'Detects removed assertion');
assert(!weakenedRe.test('+  expect(result).toBe(5)'), 'Ignores added assertion');

const skipRe = new RegExp(ti.added_skips);
assert(skipRe.test('+  it.skip("disabled test")'), 'Detects added .skip');
assert(skipRe.test('+  xit("disabled")'), 'Detects xit');
assert(!skipRe.test('-  it.skip("was disabled")'), 'Ignores removed skip');

// -------------------------------------------------------------------
// Phase 4: Session dedup + slow scan
// -------------------------------------------------------------------
console.log('\n--- Phase 4: Session Dedup ---');

var origDir = process.env.CLAUDE_PROJECT_DIR || '';

function makeTempProject() {
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ent-test-'));
  var dataDir = path.join(tmpDir, '.claude', 'harness', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  return tmpDir;
}

function loadScanModule(projectDir) {
  var mp = path.resolve(__dirname, '..', 'lib', 'entropy-scan.js');
  var rp = path.resolve(__dirname, '..', 'lib', 'resolve.js');
  delete require.cache[require.resolve(rp)];
  delete require.cache[require.resolve(mp)];
  process.env.CLAUDE_PROJECT_DIR = projectDir;
  process.env.HARNESS_DIR = path.join(projectDir, '.claude', 'harness');
  return require(mp);
}

(function() {
  var tmpDir = makeTempProject();
  var mod = loadScanModule(tmpDir);
  var R = require(path.resolve(__dirname, '..', 'lib', 'resolve.js'));
  fs.mkdirSync(R.PROJECT_DATA_DIR, { recursive: true });

  assert(mod.dedupKey({ category: 'code', detail: 'debug: 3' }) === 'code:debug: 3', 'dedupKey produces category:detail string');

  var empty = mod.loadDedup();
  assert(Object.keys(empty).length === 0, 'loadDedup returns {} on missing file');

  mod.saveDedup({ 'code:test': true, 'test:skip': true });
  var loaded = mod.loadDedup();
  assert(loaded['code:test'] === true && loaded['test:skip'] === true, 'saveDedup then loadDedup roundtrips');

  var staleTs = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
  var dedupPath = path.join(R.PROJECT_DATA_DIR, '.entropy_dedup.json');
  fs.writeFileSync(dedupPath, JSON.stringify({ ts: staleTs, seen: { 'old:sig': true } }));
  var staleLoaded = mod.loadDedup();
  assert(Object.keys(staleLoaded).length === 0, 'loadDedup resets stale data (>4h TTL)');

  var freshTs = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
  fs.writeFileSync(dedupPath, JSON.stringify({ ts: freshTs, seen: { 'fresh:sig': true } }));
  assert(mod.loadDedup()['fresh:sig'] === true, 'loadDedup keeps fresh data (<4h)');
})();

console.log('\n--- Phase 4: Slow Scan ---');

(function() {
  var tmpDir = makeTempProject();
  var mod = loadScanModule(tmpDir);
  var signals = mod.slowScan();
  assert(Array.isArray(signals), 'slowScan runs without error on non-git dir');

  fs.mkdirSync(path.join(tmpDir, 'projects', 'nbi_dashboard', 'session_logs'), { recursive: true });
  mod = loadScanModule(tmpDir);
  signals = mod.slowScan();
  var wf = signals.filter(function(s) { return s.category === 'workflow'; });
  assert(wf.length > 0 && wf[0].detail.includes('no session log'), 'slowScan detects missing session log');

  var today = new Date().toISOString().slice(0, 10);
  var logDir = path.join(tmpDir, 'projects', 'nbi_dashboard', 'session_logs');
  fs.writeFileSync(path.join(logDir, today + '_session.md'), '# Log');
  mod = loadScanModule(tmpDir);
  signals = mod.slowScan();
  wf = signals.filter(function(s) { return s.category === 'workflow'; });
  assert(wf.length === 0, 'slowScan does not flag when session log exists');

  mod = loadScanModule(tmpDir);
  signals = mod.slowScan();
  var allSlow = signals.every(function(s) { return s.scan_tier === 'slow'; });
  assert(signals.length === 0 || allSlow, 'slowScan signals have slow tier');
})();

console.log('\n--- Phase 4: CLI ---');

(function() {
  var tmpDir = makeTempProject();
  fs.mkdirSync(path.join(tmpDir, 'projects', 'nbi_dashboard', 'session_logs'), { recursive: true });
  var scanPath = path.resolve(__dirname, '..', 'lib', 'entropy-scan.js');
  var result = require('child_process').execFileSync('node', [scanPath, '--slow'], {
    cwd: tmpDir, encoding: 'utf8', timeout: 15000,
    env: Object.assign({}, process.env, {
      CLAUDE_PROJECT_DIR: tmpDir,
      HARNESS_DIR: path.join(tmpDir, '.claude', 'harness')
    })
  });
  var parsed = JSON.parse(result.trim());
  assert(parsed.signals && parsed.scan_tier === 'slow', '--slow flag produces JSON output with scan_tier');
})();

process.env.CLAUDE_PROJECT_DIR = origDir;
console.log('\n' + '='.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
