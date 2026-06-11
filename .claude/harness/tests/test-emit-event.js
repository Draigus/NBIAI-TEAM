#!/usr/bin/env node
'use strict';
// Integration test for emit-event.js. Runs the script with mock stdin and
// verifies JSONL output. Run: node .claude/harness/tests/test-emit-event.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..', '..');
const EMIT = path.join(PROJECT_DIR, '.claude', 'harness', 'lib', 'emit-event.js');
const DATA_DIR = path.join(PROJECT_DIR, '.claude', 'harness', 'data');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

function cleanup() {
  const sessionFile = path.join(DATA_DIR, '.session_id');
  try { fs.unlinkSync(sessionFile); } catch {}
}

console.log('Test: emit-event.js');

// Test 1: tool_outcome event
console.log('\n--- tool_outcome ---');
const mockInput = JSON.stringify({
  tool_name: 'Bash',
  tool_input: { command: 'npm test' },
  is_error: false
});

cleanup();
try {
  execSync(`node "${EMIT}" tool_outcome`, {
    input: mockInput,
    cwd: PROJECT_DIR,
    env: Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: PROJECT_DIR }),
    timeout: 10000
  });
} catch (e) {
  console.error('Execution failed:', e.message);
}

const today = new Date().toISOString().slice(0, 10);
const eventsDir = path.join(DATA_DIR, 'events', today);
const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.jsonl'));
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
try {
  execSync(`node "${EMIT}" tool_outcome`, {
    input: errorInput,
    cwd: PROJECT_DIR,
    env: Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: PROJECT_DIR }),
    timeout: 10000
  });
} catch {}
const content2 = fs.readFileSync(path.join(eventsDir, files[0]), 'utf8').trim();
const lastEvent = JSON.parse(content2.split('\n').pop());
assert(lastEvent.result === 'failure', 'Error input produces failure result');

// Test 3: skill_usage event
console.log('\n--- skill_usage ---');
const skillInput = JSON.stringify({
  tool_name: 'Skill',
  tool_input: { skill: 'systematic-debugging' }
});
try {
  execSync(`node "${EMIT}" skill_usage`, {
    input: skillInput,
    cwd: PROJECT_DIR,
    env: Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: PROJECT_DIR }),
    timeout: 10000
  });
} catch {}
const content3 = fs.readFileSync(path.join(eventsDir, files[0]), 'utf8').trim();
const skillEvent = JSON.parse(content3.split('\n').pop());
assert(skillEvent.type === 'skill_usage', 'Skill usage event type correct');
assert(skillEvent.skill === 'systematic-debugging', 'Skill name captured');

// Test 4: Session ID persistence
console.log('\n--- session ID persistence ---');
assert(lastEvent.session_id === skillEvent.session_id, 'Same session ID across calls');

// Summary
console.log('\n' + '='.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
