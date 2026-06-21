#!/usr/bin/env node
'use strict';
// test-verification-gate.js -- Tests for the PreToolUse verification gate.
// Spawns verification-gate.js as a child process with controlled stdin.
// Sets up a temp git repo + harness structure for realistic testing.

const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

// ═══════════════════════════════════════════════════════
// Setup: temp harness + git repo
// ═══════════════════════════════════════════════════════

const TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'vg-test-'));
const TEMP_HARNESS = path.join(TEMP_ROOT, 'harness');
const TEMP_PROJECT = path.join(TEMP_ROOT, 'project');
const TEMP_CONFIG = path.join(TEMP_HARNESS, 'config');
const TEMP_LIB = path.join(TEMP_HARNESS, 'lib');
const TEMP_DATA = path.join(TEMP_HARNESS, 'data');

fs.mkdirSync(TEMP_CONFIG, { recursive: true });
fs.mkdirSync(TEMP_LIB, { recursive: true });
fs.mkdirSync(TEMP_DATA, { recursive: true });
fs.mkdirSync(TEMP_PROJECT, { recursive: true });

// Init git repo
execSync('git init', { cwd: TEMP_PROJECT, stdio: 'ignore' });
execSync('git config user.email "test@test.com"', { cwd: TEMP_PROJECT, stdio: 'ignore' });
execSync('git config user.name "Test"', { cwd: TEMP_PROJECT, stdio: 'ignore' });
fs.writeFileSync(path.join(TEMP_PROJECT, 'README.md'), '# test\n');
execSync('git add . && git commit -m "init"', { cwd: TEMP_PROJECT, stdio: 'ignore' });

// Copy config files from the real source harness
const SOURCE_HARNESS = process.env.SOURCE_HARNESS ||
  path.resolve('d:/OneDrive/Claude_code/NBIAI_TEAM/.claude/harness');
fs.copyFileSync(
  path.join(SOURCE_HARNESS, 'config', 'surface-map.json'),
  path.join(TEMP_CONFIG, 'surface-map.json')
);
fs.copyFileSync(
  path.join(SOURCE_HARNESS, 'config', 'verification-requirements.json'),
  path.join(TEMP_CONFIG, 'verification-requirements.json')
);

// Copy all lib files (existing modules + new gate/posthook)
const libSource = path.join(SOURCE_HARNESS, 'lib');
for (const f of fs.readdirSync(libSource)) {
  if (f.endsWith('.js')) {
    fs.copyFileSync(path.join(libSource, f), path.join(TEMP_LIB, f));
  }
}
// Copy new files from staging (overwrite if already present)
const stagingLib = path.resolve(__dirname, '..', 'lib');
for (const f of fs.readdirSync(stagingLib)) {
  if (f.endsWith('.js')) {
    fs.copyFileSync(path.join(stagingLib, f), path.join(TEMP_LIB, f));
  }
}

const GATE_PATH = path.join(TEMP_LIB, 'verification-gate.js');

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════

function runGate(command, toolName) {
  var stdinObj = {
    tool_name: toolName || 'Bash',
    tool_input: { command: command }
  };
  var result = spawnSync('node', [GATE_PATH], {
    input: JSON.stringify(stdinObj),
    env: {
      ...process.env,
      HARNESS_DIR: TEMP_HARNESS,
      CLAUDE_PROJECT_DIR: TEMP_PROJECT
    },
    encoding: 'utf8',
    timeout: 10000
  });
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

function parseOutput(result) {
  if (!result.stdout) return null;
  try { return JSON.parse(result.stdout); } catch { return null; }
}

function makeDirtyFile(surface) {
  var dirMap = {
    server: 'dashboard-server/routes',
    frontend: 'dashboard-server/public/js',
    tests: 'dashboard-server/tests/unit',
    migrations: 'dashboard-server/migrations',
    config: 'dashboard-server'
  };
  var dir = dirMap[surface] || 'dashboard-server/routes';
  var fullDir = path.join(TEMP_PROJECT, dir);
  fs.mkdirSync(fullDir, { recursive: true });
  var filename = surface + '-dirty-' + Date.now() + '.js';
  fs.writeFileSync(path.join(fullDir, filename), '// dirty\n');
  return path.join(dir, filename).replace(/\\/g, '/');
}

function addEvidence(type, surfacesCovered, fingerprints, exitCode) {
  var R_resolve = path.join(TEMP_HARNESS, 'data');
  // Compute project slug the same way resolve.js does
  var crypto = require('crypto');
  var resolved = path.resolve(TEMP_PROJECT);
  var base = path.basename(resolved).replace(/[^a-zA-Z0-9_-]/g, '_') || 'root';
  var hash = crypto.createHash('md5')
    .update(resolved.replace(/\\/g, '/').toLowerCase())
    .digest('hex').slice(0, 6);
  var slug = base + '_' + hash;
  var projectDataDir = path.join(TEMP_HARNESS, 'data', slug);
  fs.mkdirSync(projectDataDir, { recursive: true });

  var record = {
    id: 'EV-test-' + type + '-' + Date.now(),
    ts: new Date().toISOString(),
    type: type,
    command: { raw: 'test', resolved: 'test', cwd: TEMP_PROJECT },
    exit_code: exitCode === undefined ? 0 : exitCode,
    git_head: 'test123',
    branch: 'master',
    surface_fingerprints: fingerprints || {},
    surfaces_covered: surfacesCovered || [],
    result_summary: 'test evidence',
    session_id: 'test'
  };
  var ledgerFile = path.join(projectDataDir, 'evidence_ledger.jsonl');
  fs.appendFileSync(ledgerFile, JSON.stringify(record) + '\n');
  return record;
}

function writeApprovalToken(surfaces, expiresMinutes) {
  var crypto = require('crypto');
  var resolved = path.resolve(TEMP_PROJECT);
  var base = path.basename(resolved).replace(/[^a-zA-Z0-9_-]/g, '_') || 'root';
  var hash = crypto.createHash('md5')
    .update(resolved.replace(/\\/g, '/').toLowerCase())
    .digest('hex').slice(0, 6);
  var slug = base + '_' + hash;
  var projectDataDir = path.join(TEMP_HARNESS, 'data', slug);
  fs.mkdirSync(projectDataDir, { recursive: true });

  var expiry = new Date(Date.now() + (expiresMinutes || 30) * 60000);
  var token = {
    approved_at: new Date().toISOString(),
    surfaces: surfaces,
    expires_at: expiry.toISOString(),
    reason: 'Test approval'
  };
  fs.writeFileSync(
    path.join(projectDataDir, 'glen_approval.json'),
    JSON.stringify(token), 'utf8'
  );
  return path.join(projectDataDir, 'glen_approval.json');
}

function clearLedger() {
  var crypto = require('crypto');
  var resolved = path.resolve(TEMP_PROJECT);
  var base = path.basename(resolved).replace(/[^a-zA-Z0-9_-]/g, '_') || 'root';
  var hash = crypto.createHash('md5')
    .update(resolved.replace(/\\/g, '/').toLowerCase())
    .digest('hex').slice(0, 6);
  var slug = base + '_' + hash;
  var ledgerFile = path.join(TEMP_HARNESS, 'data', slug, 'evidence_ledger.jsonl');
  try { fs.unlinkSync(ledgerFile); } catch {}
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

// ═══════════════════════════════════════════════════════
// Group 1: Non-gate commands pass through
// ═══════════════════════════════════════════════════════
console.log('\nGroup 1: Non-gate commands pass through');

test('ls command passes through', () => {
  var r = runGate('ls -la');
  var out = parseOutput(r);
  assert.strictEqual(out, null, 'should produce no output (pass)');
  assert.strictEqual(r.status, 0);
});

test('npm test passes through', () => {
  var r = runGate('npm test');
  var out = parseOutput(r);
  assert.strictEqual(out, null);
});

test('git status passes through', () => {
  var r = runGate('git status');
  var out = parseOutput(r);
  assert.strictEqual(out, null);
});

test('empty command passes through', () => {
  var r = runGate('');
  assert.strictEqual(r.status, 0);
});

// ═══════════════════════════════════════════════════════
// Group 2: Gate 1 - git commit
// ═══════════════════════════════════════════════════════
console.log('\nGroup 2: Gate 1 - git commit');

test('git commit with clean repo passes through', () => {
  var r = runGate('git commit -m "test: clean commit"');
  var out = parseOutput(r);
  // With no dirty non-doc surfaces, should pass
  assert.strictEqual(out, null, 'clean repo should pass');
});

test('git commit with dirty server and no evidence blocks', () => {
  clearLedger();
  makeDirtyFile('server');
  var r = runGate('git commit -m "feat: something"');
  var out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('VERIFICATION GATE'), 'reason includes gate name');
});

test('git commit with snapshot: prefix passes despite dirty surfaces', () => {
  clearLedger();
  makeDirtyFile('server');
  var r = runGate('git commit -m "snapshot: work in progress"');
  var out = parseOutput(r);
  assert.strictEqual(out, null, 'snapshot: should pass commit gate');
});

test('git commit with --message flag detected', () => {
  clearLedger();
  makeDirtyFile('server');
  var r = runGate('git commit --message "feat: something"');
  var out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('git -C dir commit detected as gate', () => {
  clearLedger();
  makeDirtyFile('server');
  var r = runGate('git -C /some/dir commit -m "feat: test"');
  var out = parseOutput(r);
  assert.ok(out, 'should detect git -C commit as gate');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 3: Gate 1 - Glen approval token
// ═══════════════════════════════════════════════════════
console.log('\nGroup 3: Glen approval token');

test('git commit with valid approval token passes and consumes token', () => {
  clearLedger();
  makeDirtyFile('server');
  var tokenPath = writeApprovalToken(['server'], 30);
  assert.ok(fs.existsSync(tokenPath), 'token should exist before');

  var r = runGate('git commit -m "feat: approved"');
  var out = parseOutput(r);
  assert.strictEqual(out, null, 'should pass with valid token');
  assert.ok(!fs.existsSync(tokenPath), 'token should be consumed (deleted)');
});

test('git commit with expired token blocks', () => {
  clearLedger();
  makeDirtyFile('server');
  writeApprovalToken(['server'], -5); // expired 5 minutes ago

  var r = runGate('git commit -m "feat: expired"');
  var out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('git commit with token missing required surface blocks', () => {
  clearLedger();
  makeDirtyFile('server');
  makeDirtyFile('frontend');
  writeApprovalToken(['server'], 30); // only approves server, not frontend

  var r = runGate('git commit -m "feat: partial"');
  var out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 4: Gate 2 - pm2 restart
// ═══════════════════════════════════════════════════════
console.log('\nGroup 4: Gate 2 - pm2 restart');

test('pm2 restart with clean repo passes', () => {
  // Clean up dirty files
  var routesDir = path.join(TEMP_PROJECT, 'dashboard-server', 'routes');
  try {
    for (var f of fs.readdirSync(routesDir)) {
      if (f.includes('dirty')) fs.unlinkSync(path.join(routesDir, f));
    }
  } catch {}
  var publicDir = path.join(TEMP_PROJECT, 'dashboard-server', 'public', 'js');
  try {
    for (var f of fs.readdirSync(publicDir)) {
      if (f.includes('dirty')) fs.unlinkSync(path.join(publicDir, f));
    }
  } catch {}

  var r = runGate('pm2 restart nbi-dashboard');
  var out = parseOutput(r);
  assert.strictEqual(out, null, 'clean pm2 restart should pass');
});

test('pm2 restart with dirty server blocks', () => {
  clearLedger();
  makeDirtyFile('server');
  var r = runGate('pm2 restart nbi-dashboard');
  var out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('DEPLOY GATE'));
});

// ═══════════════════════════════════════════════════════
// Group 5: Gate 3 - gh pr create
// ═══════════════════════════════════════════════════════
console.log('\nGroup 5: Gate 3 - gh pr create');

test('gh pr create with dirty server blocks', () => {
  clearLedger();
  makeDirtyFile('server');
  var r = runGate('gh pr create --title "test" --body "test"');
  var out = parseOutput(r);
  assert.ok(out);
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('PR GATE'));
});

// ═══════════════════════════════════════════════════════
// Group 6: Gate 4 - bug status update
// ═══════════════════════════════════════════════════════
console.log('\nGroup 6: Gate 4 - bug status update');

test('curl to /api/bug with please_review and dirty server blocks', () => {
  clearLedger();
  makeDirtyFile('server');
  var r = runGate('curl -X PATCH http://localhost:8888/api/bug/123 -d \'{"status":"please_review"}\'');
  var out = parseOutput(r);
  assert.ok(out);
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('BUG STATUS GATE'));
});

// ═══════════════════════════════════════════════════════
// Group 7: Gate 5 - git push
// ═══════════════════════════════════════════════════════
console.log('\nGroup 7: Gate 5 - git push');

test('git push with dirty server blocks', () => {
  clearLedger();
  makeDirtyFile('server');
  var r = runGate('git push origin master');
  var out = parseOutput(r);
  assert.ok(out);
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('PUSH GATE'));
});

// ═══════════════════════════════════════════════════════
// Group 8: Compound commands
// ═══════════════════════════════════════════════════════
console.log('\nGroup 8: Compound commands');

test('git commit && git push -- commit gate fires for compound', () => {
  clearLedger();
  makeDirtyFile('server');
  var r = runGate('git commit -m "feat: test" && git push');
  var out = parseOutput(r);
  assert.ok(out);
  assert.strictEqual(out.decision, 'block');
});

test('snapshot: commit + push in same command blocks (push gate catches)', () => {
  clearLedger();
  makeDirtyFile('server');
  var r = runGate('git commit -m "snapshot: wip" && git push');
  var out = parseOutput(r);
  assert.ok(out);
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('PUSH GATE'));
});

// ═══════════════════════════════════════════════════════
// Group 9: Docs-only changes
// ═══════════════════════════════════════════════════════
console.log('\nGroup 9: Docs-only changes');

test('git commit with only docs changes passes', () => {
  // Clean up all non-docs dirty files
  var dashDir = path.join(TEMP_PROJECT, 'dashboard-server');
  try { fs.rmSync(dashDir, { recursive: true, force: true }); } catch {}
  clearLedger();

  // Create only a docs change
  fs.writeFileSync(path.join(TEMP_PROJECT, 'NOTES.md'), '# notes\n');
  var r = runGate('git commit -m "docs: update notes"');
  var out = parseOutput(r);
  assert.strictEqual(out, null, 'docs-only commit should pass');
});

// ═══════════════════════════════════════════════════════
// Group 10: Fail-closed on error
// ═══════════════════════════════════════════════════════
console.log('\nGroup 10: Fail-closed behaviour');

test('invalid stdin JSON exits cleanly', () => {
  var result = spawnSync('node', [GATE_PATH], {
    input: 'not json',
    env: {
      ...process.env,
      HARNESS_DIR: TEMP_HARNESS,
      CLAUDE_PROJECT_DIR: TEMP_PROJECT
    },
    encoding: 'utf8',
    timeout: 10000
  });
  assert.strictEqual(result.status, 0);
});

test('no stdin exits cleanly', () => {
  var result = spawnSync('node', [GATE_PATH], {
    input: '',
    env: {
      ...process.env,
      HARNESS_DIR: TEMP_HARNESS,
      CLAUDE_PROJECT_DIR: TEMP_PROJECT
    },
    encoding: 'utf8',
    timeout: 10000
  });
  assert.strictEqual(result.status, 0);
});

// ═══════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════
try { fs.rmSync(TEMP_ROOT, { recursive: true, force: true }); } catch {}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailures:');
  for (var f of failures) console.log('  ' + f.name + ': ' + f.error);
}
if (failed > 0) process.exit(1);
