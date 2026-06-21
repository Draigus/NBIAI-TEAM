'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-finish-'));
process.env.HARNESS_DIR = tmpDir;
process.env.CLAUDE_PROJECT_DIR = path.resolve(__dirname, '..', '..', '..');
delete require.cache[require.resolve('../lib/resolve')];

const configDir = path.join(tmpDir, 'config');
fs.mkdirSync(configDir, { recursive: true });
fs.copyFileSync(
  path.join(__dirname, '..', 'config', 'verification-requirements.json'),
  path.join(configDir, 'verification-requirements.json')
);
fs.copyFileSync(
  path.join(__dirname, '..', 'config', 'surface-map.json'),
  path.join(configDir, 'surface-map.json')
);

const { run } = require('../lib/finish-task');

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

console.log('test-finish-task');

test('run returns an object with verified property', () => {
  const origLog = console.log;
  const lines = [];
  console.log = (msg) => lines.push(msg);
  try {
    const result = run();
    assert.ok(typeof result === 'object', 'should return object');
    assert.ok(typeof result.verified === 'boolean', 'should have verified boolean');
  } finally {
    console.log = origLog;
  }
});

test('run outputs TASK COMPLETION REPORT header', () => {
  const origLog = console.log;
  const lines = [];
  console.log = (msg) => lines.push(msg);
  try {
    run();
    assert.ok(lines.some(l => l.includes('TASK COMPLETION REPORT')), 'should include report header');
    assert.ok(lines.some(l => l.includes('======')), 'should include separator');
  } finally {
    console.log = origLog;
  }
});

test('run outputs Status line', () => {
  const origLog = console.log;
  const lines = [];
  console.log = (msg) => lines.push(msg);
  try {
    run();
    assert.ok(lines.some(l => l.includes('Status:')), 'should include Status line');
  } finally {
    console.log = origLog;
  }
});

test('run outputs dirty surfaces when they exist', () => {
  const origLog = console.log;
  const lines = [];
  console.log = (msg) => lines.push(msg);
  try {
    const result = run();
    const hasDirtySurfaces = lines.some(l => l.startsWith('Dirty surfaces:'));
    const hasClean = lines.some(l => l.includes('CLEAN'));
    assert.ok(hasDirtySurfaces || hasClean, 'should report dirty surfaces or clean state');
  } finally {
    console.log = origLog;
  }
});

// Cleanup
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
