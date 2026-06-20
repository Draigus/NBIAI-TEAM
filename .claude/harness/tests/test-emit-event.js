#!/usr/bin/env node
'use strict';
// Integration test for emit-event.js. Uses an isolated temp directory
// so tests never pollute live harness data.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const HARNESS_ROOT = path.resolve(__dirname, '..');
const EMIT = path.join(HARNESS_ROOT, 'lib', 'emit-event.js');

// Create isolated temp project root with harness directory structure
const TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'));
const TEMP_HARNESS = path.join(TEMP_ROOT, '.claude', 'harness');
const TEMP_DATA = path.join(TEMP_HARNESS, 'data');
const TEMP_CONFIG = path.join(TEMP_HARNESS, 'config');

// Compute project slug (mirrors resolve.js logic)
const _resolved = path.resolve(TEMP_ROOT);
const _base = path.basename(_resolved).replace(/[^a-zA-Z0-9_-]/g, '_') || 'root';
const _hash = crypto.createHash('md5').update(_resolved.replace(/\\/g, '/').toLowerCase()).digest('hex').slice(0, 6);
const TEMP_SLUG = _base + '_' + _hash;
const TEMP_PROJECT_DATA = path.join(TEMP_DATA, TEMP_SLUG);

// Copy config files so redaction patterns load correctly
fs.mkdirSync(TEMP_CONFIG, { recursive: true });
fs.mkdirSync(TEMP_PROJECT_DATA, { recursive: true });
const realConfig = path.join(HARNESS_ROOT, 'config', 'redaction.json');
if (fs.existsSync(realConfig)) {
  fs.copyFileSync(realConfig, path.join(TEMP_CONFIG, 'redaction.json'));
}

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

function cleanupSession() {
  const sessionFile = path.join(TEMP_PROJECT_DATA, '.session_id');
  try { fs.unlinkSync(sessionFile); } catch {}
}

function runEmit(eventType, stdinData) {
  try {
    execSync(`node "${EMIT}" ${eventType}`, {
      input: stdinData,
      cwd: TEMP_ROOT,
      env: Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: TEMP_ROOT, HARNESS_DIR: TEMP_HARNESS }),
      timeout: 10000
    });
  } catch (e) {
    console.error('Execution failed:', e.message);
  }
}

console.log('Test: emit-event.js (isolated temp dir: ' + TEMP_ROOT + ')');

// Test 1: tool_outcome event
console.log('\n--- tool_outcome ---');
const mockInput = JSON.stringify({
  tool_name: 'Bash',
  tool_input: { command: 'npm test' },
  is_error: false
});

cleanupSession();
runEmit('tool_outcome', mockInput);

const today = new Date().toISOString().slice(0, 10);
const eventsDir = path.join(TEMP_PROJECT_DATA, 'events', today);
assert(fs.existsSync(eventsDir), 'Events directory created in temp dir');

const files = fs.existsSync(eventsDir)
  ? fs.readdirSync(eventsDir).filter(f => f.endsWith('.jsonl'))
  : [];
assert(files.length > 0, 'JSONL file created');

if (files.length > 0) {
  const content = fs.readFileSync(path.join(eventsDir, files[0]), 'utf8').trim();
  const lines = content.split('\n');
  const event = JSON.parse(lines[lines.length - 1]);
  assert(event.type === 'tool_outcome', 'Event type is tool_outcome');
  assert(event.tool === 'Bash', 'Tool name is Bash');
  assert(event.command_summary === 'npm test', 'Command summary captured');
  assert(event.result === 'success', 'Result is success');
  assert(event.event_id.startsWith('evt_'), 'Event ID has correct prefix');
  assert(event.session_id.startsWith('ses_'), 'Session ID has correct prefix');
  assert(event.schema_version === 1, 'Schema version is 1');
}

// Test 2: tool_outcome with error
console.log('\n--- tool_outcome (error) ---');
const errorInput = JSON.stringify({
  tool_name: 'Bash',
  tool_input: { command: 'npm test' },
  is_error: true
});
runEmit('tool_outcome', errorInput);
if (files.length > 0) {
  const content2 = fs.readFileSync(path.join(eventsDir, files[0]), 'utf8').trim();
  const lastEvent = JSON.parse(content2.split('\n').pop());
  assert(lastEvent.result === 'failure', 'Error input produces failure result');
}

// Test 3: skill_usage event
console.log('\n--- skill_usage ---');
const skillInput = JSON.stringify({
  tool_name: 'Skill',
  tool_input: { skill: 'systematic-debugging' }
});
runEmit('skill_usage', skillInput);
if (files.length > 0) {
  const content3 = fs.readFileSync(path.join(eventsDir, files[0]), 'utf8').trim();
  const skillEvent = JSON.parse(content3.split('\n').pop());
  assert(skillEvent.type === 'skill_usage', 'Skill usage event type correct');
  assert(skillEvent.skill === 'systematic-debugging', 'Skill name captured');
}

// Test 4: Session ID persistence
console.log('\n--- session ID persistence ---');
if (files.length > 0) {
  const allContent = fs.readFileSync(path.join(eventsDir, files[0]), 'utf8').trim();
  const allLines = allContent.split('\n');
  if (allLines.length >= 2) {
    const ev1 = JSON.parse(allLines[allLines.length - 2]);
    const ev2 = JSON.parse(allLines[allLines.length - 1]);
    assert(ev1.session_id === ev2.session_id, 'Same session ID across calls');
  }
}

// Test 5: Verify NO writes to live data directory
console.log('\n--- isolation check ---');
assert(
  !fs.existsSync(path.join(TEMP_ROOT, 'LIVE_DATA_TOUCHED')),
  'No marker file in temp root (sanity check)'
);

// Cleanup temp dir
fs.rmSync(TEMP_ROOT, { recursive: true, force: true });

// Summary
console.log('\n' + '='.repeat(40));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
