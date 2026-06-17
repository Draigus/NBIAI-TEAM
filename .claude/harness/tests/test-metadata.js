#!/usr/bin/env node
'use strict';
// test-metadata.js — Tests for M7 bootstrap metadata preservation.
// Verifies buildEvent() preserves allowlisted metadata fields from hookInput
// across all event types.

const path = require('path');
const assert = require('assert');

// buildEvent calls getSessionId which needs filesystem. Set up env first.
const os = require('os');
const fs = require('fs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-test-'));
const dataDir = path.join(tmpDir, '.claude', 'harness', 'data');
const locksDir = path.join(dataDir, '.locks');
const logsDir = path.join(tmpDir, 'projects', 'nbi_dashboard', 'session_logs');
fs.mkdirSync(locksDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });
process.env.CLAUDE_PROJECT_DIR = tmpDir;

const { buildEvent } = require(path.resolve(__dirname, '..', 'lib', 'emit-event.js'));

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

const METADATA_INPUT = {
  source: 'bootstrap',
  confidence: 'high',
  parse_warnings: ['test warning'],
  source_file: '2026-06-14_session.md',
  capture_method: 'bootstrap',
  task_type_inferred: 'bug_fix'
};

// ═══════════════════════════════════════════════════════
// Group 1: metadata preserved on tool_outcome
// ═══════════════════════════════════════════════════════
console.log('\nGroup 1: metadata on tool_outcome');

test('tool_outcome preserves metadata fields', () => {
  const input = Object.assign({}, METADATA_INPUT, {
    tool_name: 'Bash',
    tool_input: { command: 'npm test' }
  });
  const event = buildEvent('tool_outcome', input);
  assert.ok(event.metadata, 'metadata object should exist');
  assert.strictEqual(event.metadata.source, 'bootstrap');
  assert.strictEqual(event.metadata.confidence, 'high');
  assert.deepStrictEqual(event.metadata.parse_warnings, ['test warning']);
  assert.strictEqual(event.metadata.source_file, '2026-06-14_session.md');
  assert.strictEqual(event.metadata.capture_method, 'bootstrap');
  assert.strictEqual(event.metadata.task_type_inferred, 'bug_fix');
});

test('tool_outcome without metadata has no metadata field', () => {
  const input = { tool_name: 'Bash', tool_input: { command: 'ls' } };
  const event = buildEvent('tool_outcome', input);
  assert.strictEqual(event.metadata, undefined, 'no metadata when none provided');
});

// ═══════════════════════════════════════════════════════
// Group 2: metadata preserved on skill_usage
// ═══════════════════════════════════════════════════════
console.log('\nGroup 2: metadata on skill_usage');

test('skill_usage preserves metadata fields', () => {
  const input = Object.assign({}, METADATA_INPUT, {
    tool_input: { skill: 'session-inference' }
  });
  const event = buildEvent('skill_usage', input);
  assert.ok(event.metadata, 'metadata object should exist');
  assert.strictEqual(event.metadata.source, 'bootstrap');
  assert.strictEqual(event.metadata.task_type_inferred, 'bug_fix');
});

// ═══════════════════════════════════════════════════════
// Group 3: metadata preserved on intervention
// ═══════════════════════════════════════════════════════
console.log('\nGroup 3: metadata on intervention');

test('intervention preserves metadata fields', () => {
  const input = Object.assign({}, METADATA_INPUT, {
    severity: 'correction',
    harness_component: 'context',
    description: 'test'
  });
  const event = buildEvent('intervention', input);
  assert.ok(event.metadata, 'metadata object should exist');
  assert.strictEqual(event.metadata.source, 'bootstrap');
  assert.strictEqual(event.metadata.confidence, 'high');
  assert.deepStrictEqual(event.metadata.parse_warnings, ['test warning']);
});

// ═══════════════════════════════════════════════════════
// Group 4: metadata preserved on default event type
// ═══════════════════════════════════════════════════════
console.log('\nGroup 4: metadata on default event type');

test('unknown event type preserves metadata fields', () => {
  const input = Object.assign({}, METADATA_INPUT, { custom_field: 'test' });
  const event = buildEvent('custom_type', input);
  assert.ok(event.metadata, 'metadata object should exist');
  assert.strictEqual(event.metadata.source, 'bootstrap');
  assert.strictEqual(event.metadata.capture_method, 'bootstrap');
});

// ═══════════════════════════════════════════════════════
// Group 5: partial metadata — only provided fields
// ═══════════════════════════════════════════════════════
console.log('\nGroup 5: partial metadata');

test('only provided metadata fields are included', () => {
  const input = { tool_name: 'Edit', tool_input: { file_path: 'test.js' }, source: 'bootstrap' };
  const event = buildEvent('tool_outcome', input);
  assert.ok(event.metadata, 'metadata should exist');
  assert.strictEqual(event.metadata.source, 'bootstrap');
  assert.strictEqual(event.metadata.confidence, undefined, 'unprovided field should be absent');
  assert.strictEqual(Object.keys(event.metadata).length, 1, 'only 1 metadata field');
});

// ═══════════════════════════════════════════════════════
// Group 6: metadata on all remaining event types
// ═══════════════════════════════════════════════════════
console.log('\nGroup 6: metadata on remaining event types');

test('context_pressure preserves metadata', () => {
  const input = Object.assign({}, METADATA_INPUT, { tool_input: { event: 'high' } });
  const event = buildEvent('context_pressure', input);
  assert.ok(event.metadata, 'metadata should exist');
  assert.strictEqual(event.metadata.source, 'bootstrap');
});

test('entropy_signal preserves metadata', () => {
  const input = Object.assign({}, METADATA_INPUT, { category: 'secret', file: 'test.js' });
  const event = buildEvent('entropy_signal', input);
  assert.ok(event.metadata, 'metadata should exist');
  assert.strictEqual(event.metadata.source, 'bootstrap');
});

test('role_dispatch preserves metadata', () => {
  const input = Object.assign({}, METADATA_INPUT, { tool_input: { role: 'engineer' } });
  const event = buildEvent('role_dispatch', input);
  assert.ok(event.metadata, 'metadata should exist');
  assert.strictEqual(event.metadata.source, 'bootstrap');
});

// ═══════════════════════════════════════════════════════
// Group 7: S10 tool outcome — timeout detection + duration
// ═══════════════════════════════════════════════════════
console.log('\nGroup 7: S10 tool outcome improvements');

test('success result when no error', () => {
  const event = buildEvent('tool_outcome', { tool_name: 'Bash', tool_input: { command: 'ls' } });
  assert.strictEqual(event.result, 'success');
  assert.strictEqual(event.duration_ms, null);
});

test('failure result when is_error true', () => {
  const event = buildEvent('tool_outcome', { tool_name: 'Bash', tool_input: { command: 'bad' }, is_error: true });
  assert.strictEqual(event.result, 'failure');
});

test('timeout result when response_time_ms > 120000', () => {
  const event = buildEvent('tool_outcome', {
    tool_name: 'Bash', tool_input: { command: 'slow' },
    is_error: true, response_time_ms: 130000
  });
  assert.strictEqual(event.result, 'timeout');
  assert.strictEqual(event.duration_ms, 130000);
});

test('timeout result when tool_response contains timeout keyword', () => {
  const event = buildEvent('tool_outcome', {
    tool_name: 'Bash', tool_input: { command: 'cmd' },
    is_error: true, tool_response: 'Error: command timed out after 120s'
  });
  assert.strictEqual(event.result, 'timeout');
});

test('timeout detected even without is_error (response_time_ms)', () => {
  const event = buildEvent('tool_outcome', {
    tool_name: 'Bash', tool_input: { command: 'cmd' },
    response_time_ms: 200000
  });
  assert.strictEqual(event.result, 'timeout');
  assert.strictEqual(event.duration_ms, 200000);
});

test('duration_ms populated from response_time_ms', () => {
  const event = buildEvent('tool_outcome', {
    tool_name: 'Edit', tool_input: { file_path: 'x.js' },
    response_time_ms: 450
  });
  assert.strictEqual(event.result, 'success');
  assert.strictEqual(event.duration_ms, 450);
});

test('ETIMEDOUT in response triggers timeout', () => {
  const event = buildEvent('tool_outcome', {
    tool_name: 'Bash', tool_input: { command: 'curl' },
    is_error: true, tool_response: 'connect ETIMEDOUT 1.2.3.4:443'
  });
  assert.strictEqual(event.result, 'timeout');
});

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });

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
