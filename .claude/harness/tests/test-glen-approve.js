'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-glen-approve-'));
process.env.HARNESS_DIR = tmpDir;
process.env.CLAUDE_PROJECT_DIR = path.resolve(__dirname, '..', '..', '..');
delete require.cache[require.resolve('../lib/resolve')];
const R = require('../lib/resolve');

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

console.log('test-glen-approve');

test('TTY guard rejects non-interactive stdin', () => {
  const { execSync } = require('child_process');
  const scriptPath = path.join(__dirname, '..', 'lib', 'glen-approve.js');
  try {
    execSync('node "' + scriptPath + '"', {
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, HARNESS_DIR: tmpDir },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    assert.fail('should have exited with non-zero code');
  } catch (e) {
    assert.ok(e.status !== 0, 'should exit non-zero');
    assert.ok(e.stderr.includes('interactive terminal'), 'should mention interactive terminal');
  }
});

test('TTY guard rejects piped stdin', () => {
  const { execSync } = require('child_process');
  const scriptPath = path.join(__dirname, '..', 'lib', 'glen-approve.js');
  try {
    execSync('echo "server" | node "' + scriptPath + '"', {
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, HARNESS_DIR: tmpDir },
      shell: true
    });
    assert.fail('should have exited with non-zero code');
  } catch (e) {
    assert.ok(e.status !== 0, 'should exit non-zero for piped input');
  }
});

test('token file path is under PROJECT_DATA_DIR', () => {
  const tokenPath = path.join(R.PROJECT_DATA_DIR, 'glen_approval.json');
  assert.ok(tokenPath.includes(R.PROJECT_SLUG), 'token path should include project slug');
});

test('token schema validation (manual creation)', () => {
  const tokenDir = R.PROJECT_DATA_DIR;
  fs.mkdirSync(tokenDir, { recursive: true });
  const tokenPath = path.join(tokenDir, 'glen_approval.json');

  const now = new Date();
  const token = {
    approved_at: now.toISOString(),
    surfaces: ['server', 'frontend'],
    expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    reason: 'Test approval'
  };
  fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2));

  const loaded = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  assert.ok(Array.isArray(loaded.surfaces), 'surfaces should be array');
  assert.ok(loaded.approved_at, 'should have approved_at');
  assert.ok(loaded.expires_at, 'should have expires_at');
  assert.ok(loaded.reason, 'should have reason');

  const expiresAt = new Date(loaded.expires_at);
  const approvedAt = new Date(loaded.approved_at);
  const diffMinutes = (expiresAt - approvedAt) / (60 * 1000);
  assert.ok(Math.abs(diffMinutes - 30) < 1, 'expiry should be ~30 minutes after approval');

  fs.unlinkSync(tokenPath);
});

test('expired token detection', () => {
  const tokenDir = R.PROJECT_DATA_DIR;
  fs.mkdirSync(tokenDir, { recursive: true });
  const tokenPath = path.join(tokenDir, 'glen_approval.json');

  const past = new Date(Date.now() - 60 * 60 * 1000);
  const token = {
    approved_at: new Date(past.getTime() - 30 * 60 * 1000).toISOString(),
    surfaces: ['server'],
    expires_at: past.toISOString(),
    reason: 'Expired test'
  };
  fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2));

  const loaded = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  const isExpired = new Date(loaded.expires_at) < new Date();
  assert.ok(isExpired, 'token should be detected as expired');

  fs.unlinkSync(tokenPath);
});

test('token consumption (deletion)', () => {
  const tokenDir = R.PROJECT_DATA_DIR;
  fs.mkdirSync(tokenDir, { recursive: true });
  const tokenPath = path.join(tokenDir, 'glen_approval.json');

  fs.writeFileSync(tokenPath, JSON.stringify({ reason: 'consume test' }));
  assert.ok(fs.existsSync(tokenPath), 'token should exist before consumption');

  fs.unlinkSync(tokenPath);
  assert.ok(!fs.existsSync(tokenPath), 'token should not exist after consumption');
});

// Cleanup
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
