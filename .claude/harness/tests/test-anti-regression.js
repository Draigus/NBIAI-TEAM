#!/usr/bin/env node
'use strict';
// Tests Phase 6: anti-regression mechanics.
// Run: node .claude/harness/tests/test-anti-regression.js

const fs = require('fs');
const os = require('os');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

function assertEq(actual, expected, msg) {
  if (actual === expected) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); }
}

// --- Setup temp project dir ---
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rho-antiregression-'));
const harnessDir = path.join(tmpDir, '.claude', 'harness');
const proposalsDir = path.join(harnessDir, 'proposals');
const eventsDir = path.join(harnessDir, 'data', 'events');
const dataDir = path.join(harnessDir, 'data');
fs.mkdirSync(proposalsDir, { recursive: true });
fs.mkdirSync(eventsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

process.env.CLAUDE_PROJECT_DIR = tmpDir;
delete require.cache[require.resolve('../lib/anti-regression.js')];
const ar = require('../lib/anti-regression.js');

// ===== extractKey =====

console.log('\nTest: extractKey\n');

const proposalWithKey = {
  id: 'RHO-2026-W25-001',
  risk: 'LOW',
  target_file: '.claude/skills/test-driven-development/SKILL.md',
  classification: 'skill_deficiency',
  failure_code: 'test_mock_misuse',
  anti_regression: {
    key: ['skill_routing', 'skill_deficiency', 'dashboard', 'test_mock_misuse', 'RHO-2026-W25-001'],
    check: 'Next dashboard DB test uses real pg connection'
  }
};

const key = ar.extractKey(proposalWithKey);
assert(key !== null, 'extractKey returns non-null for valid proposal');
assertEq(key.component, 'skill_routing', 'key.component extracted');
assertEq(key.classification, 'skill_deficiency', 'key.classification extracted');
assertEq(key.domain, 'dashboard', 'key.domain extracted');
assertEq(key.failure_code, 'test_mock_misuse', 'key.failure_code extracted');
assertEq(key.fix_id, 'RHO-2026-W25-001', 'key.fix_id extracted');

// No anti_regression field
assertEq(ar.extractKey({}), null, 'extractKey returns null for no anti_regression');
assertEq(ar.extractKey(null), null, 'extractKey returns null for null');

// Short key array
const shortKey = { anti_regression: { key: ['a', 'b'] } };
assertEq(ar.extractKey(shortKey), null, 'extractKey returns null for key with fewer than 4 elements');

// Key without fix_id uses proposal.id
const noFixId = {
  id: 'RHO-2026-W25-002',
  anti_regression: { key: ['comp', 'class', 'dom', 'code'] }
};
const k2 = ar.extractKey(noFixId);
assertEq(k2.fix_id, 'RHO-2026-W25-002', 'fix_id falls back to proposal.id');

// ===== eventMatchesKey =====

console.log('\n--- eventMatchesKey ---');

const testKey = {
  component: 'skill_routing',
  classification: 'skill_deficiency',
  domain: 'dashboard',
  failure_code: 'test_mock_misuse'
};

// Matching intervention
const interventionEvent = {
  type: 'intervention',
  confirmed: true,
  harness_component: 'skill_routing',
  metadata: { classification: 'skill_deficiency' }
};
assert(ar.eventMatchesKey(interventionEvent, testKey), 'confirmed intervention with matching component matches');

// Non-matching intervention
const diffIntervention = {
  type: 'intervention',
  confirmed: true,
  harness_component: 'context',
  metadata: { classification: 'context_failure' }
};
assert(!ar.eventMatchesKey(diffIntervention, testKey), 'intervention with different component does not match');

// Unconfirmed intervention does not match
const unconfirmed = {
  type: 'intervention',
  confirmed: false,
  harness_component: 'skill_routing',
  metadata: { classification: 'skill_deficiency' }
};
assert(!ar.eventMatchesKey(unconfirmed, testKey), 'unconfirmed intervention does not match');

// Null event
assert(!ar.eventMatchesKey(null, testKey), 'null event does not match');
assert(!ar.eventMatchesKey(interventionEvent, null), 'null key does not match');

// ===== readEventsInRange =====

console.log('\n--- readEventsInRange ---');

// Write test events
const dateDir = path.join(eventsDir, '2026-06-10');
fs.mkdirSync(dateDir, { recursive: true });
const testEvents = [
  { event_id: 'evt_001', type: 'intervention', confirmed: true, harness_component: 'context', ts: '2026-06-10T10:00:00Z' },
  { event_id: 'evt_002', type: 'tool_outcome', result: 'success', ts: '2026-06-10T11:00:00Z', metadata: { task_domain: 'dashboard' } },
  { event_id: 'evt_003', type: 'entropy_signal', category: 'code', severity: 2, detail: 'unused_import', ts: '2026-06-10T12:00:00Z' }
];
fs.writeFileSync(
  path.join(dateDir, 'ses_test.jsonl'),
  testEvents.map(function(e) { return JSON.stringify(e); }).join('\n') + '\n'
);

// Write events in another date
const dateDir2 = path.join(eventsDir, '2026-06-15');
fs.mkdirSync(dateDir2, { recursive: true });
fs.writeFileSync(
  path.join(dateDir2, 'ses_test2.jsonl'),
  JSON.stringify({ event_id: 'evt_004', type: 'tool_outcome', result: 'failure', ts: '2026-06-15T10:00:00Z' }) + '\n'
);

const allEvents = ar.readEventsInRange(new Date('2026-06-10'), new Date('2026-06-15'));
assertEq(allEvents.length, 4, 'readEventsInRange reads all events in range');

const partialEvents = ar.readEventsInRange(new Date('2026-06-11'), new Date('2026-06-15'));
assertEq(partialEvents.length, 1, 'readEventsInRange respects sinceDate');

const emptyEvents = ar.readEventsInRange(new Date('2026-07-01'), new Date('2026-07-31'));
assertEq(emptyEvents.length, 0, 'readEventsInRange returns empty for no matching dates');

// ===== computeStatus =====

console.log('\n--- computeStatus ---');

// Proposal not applied — should return not_applied
const notAppliedResult = ar.computeStatus(proposalWithKey, { now: new Date('2026-07-15') });
assertEq(notAppliedResult.status, 'not_applied', 'not-applied proposal returns not_applied');

// Write applied status
fs.writeFileSync(path.join(dataDir, 'proposal_status.jsonl'),
  JSON.stringify({
    event_id: 'pse_001',
    proposal_id: 'RHO-2026-W25-001',
    proposal_hash: 'sha256:abc',
    ts: '2026-06-08T10:00:00Z',
    actor: 'applier',
    from_status: 'pending',
    to_status: 'applied',
    reason: 'test'
  }) + '\n'
);

// Re-require to pick up new status file
delete require.cache[require.resolve('../lib/anti-regression.js')];
const ar2 = require('../lib/anti-regression.js');

// Within monitoring window — should return monitoring
const monitoringResult = ar2.computeStatus(proposalWithKey, { now: new Date('2026-06-12'), windowWeeks: 4 });
assertEq(monitoringResult.status, 'monitoring', 'within window returns monitoring');

// After window, no failures, but has positive evidence — validated_by_evidence
const evidenceResult = ar2.computeStatus(proposalWithKey, { now: new Date('2026-07-15'), windowWeeks: 4 });
assertEq(evidenceResult.status, 'validated_by_evidence', 'positive evidence returns validated_by_evidence');

// No anti_regression key
const noKeyProposal = { id: 'RHO-2026-W25-001' };
const noKeyResult = ar2.computeStatus(noKeyProposal);
assertEq(noKeyResult.status, 'no_key', 'proposal without key returns no_key');

// ===== generateRollbackProposal =====

console.log('\n--- generateRollbackProposal ---');

const rollback = ar.generateRollbackProposal(proposalWithKey, [
  { event_id: 'evt_100' },
  { event_id: 'evt_101' }
]);
assert(rollback !== null, 'rollback proposal generated');
assertEq(rollback.status, 'pending', 'rollback status is pending');
assert(rollback.diagnosis.includes('RHO-2026-W25-001'), 'rollback diagnosis references original proposal');
assert(rollback.diagnosis.includes('2'), 'rollback diagnosis includes failure count');
assertEq(rollback.evidence.length, 2, 'rollback evidence contains matching events');
assertEq(rollback.rollback_of, 'RHO-2026-W25-001', 'rollback_of set to original proposal ID');
assert(rollback.anti_regression !== null, 'rollback has anti_regression key');
assert(rollback.anti_regression.key[4].startsWith('rollback-'), 'rollback fix_id prefixed with rollback-');

// LOW proposal promotes to HIGH
assertEq(rollback.risk, 'HIGH', 'LOW proposal rollback promoted to HIGH');

// Null input
assertEq(ar.generateRollbackProposal(null, []), null, 'null proposal returns null');
assertEq(ar.generateRollbackProposal({}, []), null, 'proposal without id returns null');

// String evidence IDs
const rollback2 = ar.generateRollbackProposal(proposalWithKey, ['evt_200', 'evt_201']);
assertEq(rollback2.evidence[0], 'evt_200', 'string evidence IDs preserved');

// ===== listAllProposals =====

console.log('\n--- listAllProposals ---');

// Write test proposals
const weekDir = path.join(proposalsDir, '2026-W25');
fs.mkdirSync(weekDir, { recursive: true });
fs.writeFileSync(path.join(weekDir, 'RHO-2026-W25-001.json'), JSON.stringify(proposalWithKey));
fs.writeFileSync(path.join(weekDir, 'RHO-2026-W25-002.json'), JSON.stringify({
  id: 'RHO-2026-W25-002',
  target_file: 'test.md',
  anti_regression: { key: ['a', 'b', 'c', 'd'] }
}));

delete require.cache[require.resolve('../lib/anti-regression.js')];
const ar3 = require('../lib/anti-regression.js');

const allProposals = ar3.listAllProposals();
assertEq(allProposals.length, 2, 'listAllProposals finds 2 proposals');
assert(allProposals.some(function(p) { return p.id === 'RHO-2026-W25-001'; }), 'finds proposal 001');
assert(allProposals.some(function(p) { return p.id === 'RHO-2026-W25-002'; }), 'finds proposal 002');

// ===== checkAllApplied =====

console.log('\n--- checkAllApplied ---');

const checkResults = ar3.checkAllApplied({ now: new Date('2026-07-15'), windowWeeks: 4 });
assert(checkResults.length >= 1, 'checkAllApplied returns results for applied proposals');
var found001 = checkResults.find(function(r) { return r.proposal_id === 'RHO-2026-W25-001'; });
assert(found001 !== undefined, 'checkAllApplied includes applied proposal');
assert(found001.computed_status === 'validated_by_evidence' || found001.computed_status === 'validated_by_absence',
  'applied proposal has validation status');

// ===== Cleanup =====
fs.rmSync(tmpDir, { recursive: true, force: true });

// ===== Summary =====
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
