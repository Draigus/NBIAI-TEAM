#!/usr/bin/env node
'use strict';
// test-verification-posthook.js -- Tests for PostToolUse evidence recording
// and dirty-state nudge hook. Spawns as child process with controlled stdin.

const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════

const TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'vph-test-'));
const TEMP_HARNESS = path.join(TEMP_ROOT, 'harness');
const TEMP_PROJECT = path.join(TEMP_ROOT, 'project');
const TEMP_CONFIG = path.join(TEMP_HARNESS, 'config');
const TEMP_LIB = path.join(TEMP_HARNESS, 'lib');

fs.mkdirSync(TEMP_CONFIG, { recursive: true });
fs.mkdirSync(TEMP_LIB, { recursive: true });
fs.mkdirSync(TEMP_PROJECT, { recursive: true });

execSync('git init', { cwd: TEMP_PROJECT, stdio: 'ignore' });
execSync('git config user.email "test@test.com"', { cwd: TEMP_PROJECT, stdio: 'ignore' });
execSync('git config user.name "Test"', { cwd: TEMP_PROJECT, stdio: 'ignore' });
fs.writeFileSync(path.join(TEMP_PROJECT, 'README.md'), '# test\n');
execSync('git add . && git commit -m "init"', { cwd: TEMP_PROJECT, stdio: 'ignore' });

// Copy config from the real source harness
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

// Copy lib files (existing + new from staging)
const libSource = path.join(SOURCE_HARNESS, 'lib');
for (const f of fs.readdirSync(libSource)) {
  if (f.endsWith('.js')) {
    fs.copyFileSync(path.join(libSource, f), path.join(TEMP_LIB, f));
  }
}
const stagingLib = path.resolve(__dirname, '..', 'lib');
for (const f of fs.readdirSync(stagingLib)) {
  if (f.endsWith('.js')) {
    fs.copyFileSync(path.join(stagingLib, f), path.join(TEMP_LIB, f));
  }
}

const HOOK_PATH = path.join(TEMP_LIB, 'verification-posthook.js');

function projectSlug() {
  var resolved = path.resolve(TEMP_PROJECT);
  var base = path.basename(resolved).replace(/[^a-zA-Z0-9_-]/g, '_') || 'root';
  var hash = crypto.createHash('md5')
    .update(resolved.replace(/\\/g, '/').toLowerCase())
    .digest('hex').slice(0, 6);
  return base + '_' + hash;
}

const PROJECT_DATA_DIR = path.join(TEMP_HARNESS, 'data', projectSlug());
fs.mkdirSync(PROJECT_DATA_DIR, { recursive: true });
const LEDGER_FILE = path.join(PROJECT_DATA_DIR, 'evidence_ledger.jsonl');

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════

function runHook(toolName, toolInput, toolResult) {
  var stdinObj = {
    tool_name: toolName,
    tool_input: toolInput || {},
    tool_result: toolResult || {}
  };
  var result = spawnSync('node', [HOOK_PATH], {
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

function readLedger() {
  try {
    var content = fs.readFileSync(LEDGER_FILE, 'utf8').trim();
    if (!content) return [];
    return content.split('\n').map(function(l) { return JSON.parse(l); });
  } catch { return []; }
}

function clearLedger() {
  try { fs.unlinkSync(LEDGER_FILE); } catch {}
}

function makeDirtyFile(surface) {
  var dirMap = {
    server: 'dashboard-server/routes',
    frontend: 'dashboard-server/public/js',
    tests: 'dashboard-server/tests/unit',
    config: 'dashboard-server'
  };
  var dir = dirMap[surface] || 'dashboard-server/routes';
  var fullDir = path.join(TEMP_PROJECT, dir);
  fs.mkdirSync(fullDir, { recursive: true });
  var filename = surface + '-dirty-' + Date.now() + '.js';
  fs.writeFileSync(path.join(fullDir, filename), '// dirty\n');
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
// Group 1: Bash evidence recording
// ═══════════════════════════════════════════════════════
console.log('\nGroup 1: Bash evidence recording');

test('npm test records unit_test evidence', () => {
  clearLedger();
  // Create dashboard-server dir so isDashboardServerCwd matches
  var dsDir = path.join(TEMP_PROJECT, 'dashboard-server');
  fs.mkdirSync(dsDir, { recursive: true });

  runHook('Bash',
    { command: 'npm test' },
    { exitCode: 0, cwd: dsDir }
  );
  var entries = readLedger();
  assert.ok(entries.length >= 1, 'should record evidence');
  assert.strictEqual(entries[entries.length - 1].type, 'unit_test');
  assert.strictEqual(entries[entries.length - 1].exit_code, 0);
});

test('npm run test:all records TWO entries', () => {
  clearLedger();
  var dsDir = path.join(TEMP_PROJECT, 'dashboard-server');
  fs.mkdirSync(dsDir, { recursive: true });

  runHook('Bash',
    { command: 'npm run test:all' },
    { exitCode: 0, cwd: dsDir }
  );
  var entries = readLedger();
  assert.ok(entries.length >= 2, 'should record 2 entries');
  var types = entries.map(function(e) { return e.type; });
  assert.ok(types.includes('unit_test'), 'should have unit_test');
  assert.ok(types.includes('e2e_test'), 'should have e2e_test');
});

test('failed npm test records evidence with exit_code 1', () => {
  clearLedger();
  var dsDir = path.join(TEMP_PROJECT, 'dashboard-server');
  fs.mkdirSync(dsDir, { recursive: true });

  runHook('Bash',
    { command: 'npm test' },
    { exitCode: 1, cwd: dsDir }
  );
  var entries = readLedger();
  assert.ok(entries.length >= 1, 'should record evidence');
  assert.strictEqual(entries[entries.length - 1].exit_code, 1);
});

test('non-evidence command does not record', () => {
  clearLedger();
  runHook('Bash', { command: 'ls -la' }, { exitCode: 0 });
  var entries = readLedger();
  assert.strictEqual(entries.length, 0, 'should not record for ls');
});

test('curl health check records evidence', () => {
  clearLedger();
  runHook('Bash',
    { command: 'curl -s http://localhost:8888/api/health' },
    { exitCode: 0 }
  );
  var entries = readLedger();
  assert.ok(entries.length >= 1);
  assert.strictEqual(entries[entries.length - 1].type, 'health_check');
});

// ═══════════════════════════════════════════════════════
// Group 2: Dirty-state nudge
// ═══════════════════════════════════════════════════════
console.log('\nGroup 2: Dirty-state nudge');

test('Edit on server file produces VERIFICATION STATE nudge', () => {
  clearLedger();
  makeDirtyFile('server');
  var filePath = path.join(TEMP_PROJECT, 'dashboard-server', 'routes', 'test.js');
  fs.writeFileSync(filePath, '// test\n');

  var r = runHook('Edit', { file_path: filePath }, {});
  var out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.ok(out.hookSpecificOutput, 'should have hookSpecificOutput');
  assert.ok(out.hookSpecificOutput.includes('VERIFICATION STATE'));
});

test('Edit on docs file does not produce nudge', () => {
  // Clean up server dirty files
  var routesDir = path.join(TEMP_PROJECT, 'dashboard-server', 'routes');
  try {
    for (var f of fs.readdirSync(routesDir)) {
      if (f.includes('dirty') || f === 'test.js') fs.unlinkSync(path.join(routesDir, f));
    }
  } catch {}

  var filePath = path.join(TEMP_PROJECT, 'docs', 'test.md');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '# test\n');

  var r = runHook('Edit', { file_path: filePath }, {});
  var out = parseOutput(r);
  assert.strictEqual(out, null, 'docs edit should not produce nudge');
});

// ═══════════════════════════════════════════════════════
// Group 3: Read bank evidence
// ═══════════════════════════════════════════════════════
console.log('\nGroup 3: Read bank evidence');

test('Read of intelligence/banks/ file records bank_read', () => {
  clearLedger();
  var bankDir = path.join(TEMP_PROJECT, 'intelligence', 'banks');
  fs.mkdirSync(bankDir, { recursive: true });
  var bankFile = path.join(bankDir, 'test-bank.md');
  fs.writeFileSync(bankFile, '# bank\n');

  runHook('Read', { file_path: bankFile }, {});
  var entries = readLedger();
  assert.ok(entries.length >= 1);
  assert.strictEqual(entries[entries.length - 1].type, 'bank_read');
});

test('Read of non-bank file does not record', () => {
  clearLedger();
  var filePath = path.join(TEMP_PROJECT, 'README.md');
  runHook('Read', { file_path: filePath }, {});
  var entries = readLedger();
  assert.strictEqual(entries.length, 0);
});

// ═══════════════════════════════════════════════════════
// Group 4: WebSearch evidence
// ═══════════════════════════════════════════════════════
console.log('\nGroup 4: WebSearch evidence');

test('WebSearch records web_search evidence', () => {
  clearLedger();
  runHook('WebSearch', { query: 'test query' }, {});
  var entries = readLedger();
  assert.ok(entries.length >= 1);
  assert.strictEqual(entries[entries.length - 1].type, 'web_search');
  assert.ok(entries[entries.length - 1].result_summary.includes('test query'));
});

// ═══════════════════════════════════════════════════════
// Group 5: Browser evidence (navigate + inspect pair)
// ═══════════════════════════════════════════════════════
console.log('\nGroup 5: Browser evidence');

test('navigate then snapshot records browser_check', () => {
  clearLedger();
  // Step 1: navigate
  runHook('mcp__playwright__browser_navigate',
    { url: 'http://localhost:8888/test' }, {});

  // Check state file exists
  var stateFile = path.join(PROJECT_DATA_DIR, '.browser_navigate_state.json');
  assert.ok(fs.existsSync(stateFile), 'navigate state should exist');

  // Step 2: snapshot
  runHook('mcp__playwright__browser_snapshot', {}, { content: 'page content' });

  var entries = readLedger();
  assert.ok(entries.length >= 1, 'should record browser evidence');
  assert.strictEqual(entries[entries.length - 1].type, 'browser_check');
  assert.ok(entries[entries.length - 1].browser_evidence.url.includes('localhost:8888'));

  // State file should be consumed
  assert.ok(!fs.existsSync(stateFile), 'state should be consumed');
});

test('snapshot without prior navigate does not record', () => {
  clearLedger();
  runHook('mcp__playwright__browser_snapshot', {}, { content: 'page content' });
  var entries = readLedger();
  assert.strictEqual(entries.length, 0, 'no evidence without prior navigate');
});

test('navigate then console_messages also records browser_check', () => {
  clearLedger();
  runHook('mcp__playwright__browser_navigate',
    { url: 'http://localhost:8888/test' }, {});
  runHook('mcp__playwright__browser_console_messages', {}, { content: '' });

  var entries = readLedger();
  assert.ok(entries.length >= 1);
  assert.strictEqual(entries[entries.length - 1].type, 'browser_check');
});

// ═══════════════════════════════════════════════════════
// Group 6: Edge cases
// ═══════════════════════════════════════════════════════
console.log('\nGroup 6: Edge cases');

test('invalid stdin exits cleanly', () => {
  var result = spawnSync('node', [HOOK_PATH], {
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

test('unknown tool name exits cleanly', () => {
  var r = runHook('Agent', { prompt: 'test' }, {});
  assert.strictEqual(r.status, 0);
});

test('Bash npm test without cd prefix does not record (cwd not dashboard-server)', () => {
  clearLedger();
  var dsDir = path.join(TEMP_PROJECT, 'dashboard-server');
  fs.mkdirSync(dsDir, { recursive: true });
  runHook('Bash', { command: 'npm test' }, {});
  var entries = readLedger();
  assert.strictEqual(entries.length, 0, 'cwd does not resolve to dashboard-server without cd prefix');
});

test('Bash cd dashboard-server && npm test with empty tool_result records evidence', () => {
  clearLedger();
  var dsDir = path.join(TEMP_PROJECT, 'dashboard-server');
  fs.mkdirSync(dsDir, { recursive: true });
  makeDirtyFile('server');
  runHook('Bash', { command: 'cd dashboard-server && npm test' }, {});
  var entries = readLedger();
  assert.ok(entries.length > 0, 'should record evidence when cd prefix resolves to dashboard-server');
  assert.strictEqual(entries[0].type, 'unit_test');
  assert.strictEqual(entries[0].exit_code, 0, 'defaults to 0 when tool_result has no exitCode');
});

test('Bash with explicit exitCode 1 records evidence but marked as failed', () => {
  clearLedger();
  var dsDir = path.join(TEMP_PROJECT, 'dashboard-server');
  fs.mkdirSync(dsDir, { recursive: true });
  makeDirtyFile('server');
  runHook('Bash', { command: 'cd dashboard-server && npm test' }, { exitCode: 1 });
  var entries = readLedger();
  assert.ok(entries.length > 0, 'records evidence even for failures (for audit)');
  assert.strictEqual(entries[0].exit_code, 1, 'preserves the actual exit code');
  assert.strictEqual(entries[0].result_summary, 'failed', 'summary reflects failure');
});

test('Bash with no tool_result at all records evidence (PostToolUse success-only)', () => {
  clearLedger();
  var dsDir = path.join(TEMP_PROJECT, 'dashboard-server');
  fs.mkdirSync(dsDir, { recursive: true });
  makeDirtyFile('server');
  // Simulate Claude Code hook data: no tool_result field at all
  var stdinObj = {
    tool_name: 'Bash',
    tool_input: { command: 'cd dashboard-server && npm test' }
  };
  var result = require('child_process').spawnSync('node', [HOOK_PATH], {
    input: JSON.stringify(stdinObj),
    env: { ...process.env, HARNESS_DIR: TEMP_HARNESS, CLAUDE_PROJECT_DIR: TEMP_PROJECT },
    encoding: 'utf8',
    timeout: 10000
  });
  var entries = readLedger();
  assert.ok(entries.length > 0, 'missing tool_result defaults exitCode to 0 and records');
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
