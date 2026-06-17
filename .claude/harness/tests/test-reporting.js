#!/usr/bin/env node
'use strict';
// Tests Phase 8: reporting and hygiene.
// Run: node .claude/harness/tests/test-reporting.js

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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rho-reporting-'));
const harnessDir = path.join(tmpDir, '.claude', 'harness');
const dataDir = path.join(harnessDir, 'data');
const eventsDir = path.join(dataDir, 'events');
const proposalsDir = path.join(harnessDir, 'proposals');
fs.mkdirSync(eventsDir, { recursive: true });
fs.mkdirSync(proposalsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

process.env.CLAUDE_PROJECT_DIR = tmpDir;
delete require.cache[require.resolve('../lib/reporting.js')];
const rpt = require('../lib/reporting.js');

// ===== computeRollingAverage =====

console.log('\nTest: computeRollingAverage\n');

const entries = [
  { ts: '2026-06-01T00:00:00Z', score: 2 },
  { ts: '2026-06-03T00:00:00Z', score: 4 },
  { ts: '2026-06-05T00:00:00Z', score: 6 },
  { ts: '2026-06-07T00:00:00Z', score: 8 },
  { ts: '2026-06-10T00:00:00Z', score: 3 }
];

const rolling = rpt.computeRollingAverage(entries, 1);
assertEq(rolling.length, 5, 'rolling has same length as entries');
assert(rolling[0].rolling_avg > 0, 'first entry has non-zero rolling avg');
assertEq(rolling[0].score, 2, 'first entry score preserved');

// All entries in window (large window)
const rollingWide = rpt.computeRollingAverage(entries, 52);
assert(rollingWide[4].window_size === 5, 'wide window includes all entries');

// Empty entries
const rollingEmpty = rpt.computeRollingAverage([], 4);
assertEq(rollingEmpty.length, 0, 'empty entries produce empty rolling');

// ===== readEntropyTrend =====

console.log('\n--- readEntropyTrend ---');

// Write trend data
const trendPath = path.join(dataDir, 'entropy_trend.jsonl');
fs.writeFileSync(trendPath, entries.map(function(e) { return JSON.stringify(e); }).join('\n') + '\n');

delete require.cache[require.resolve('../lib/reporting.js')];
const rpt2 = require('../lib/reporting.js');

const trend = rpt2.readEntropyTrend(trendPath, 4);
assertEq(trend.entries.length, 5, 'readEntropyTrend reads 5 entries');
assertEq(trend.rolling.length, 5, 'readEntropyTrend produces 5 rolling entries');

// Missing file
const missingTrend = rpt2.readEntropyTrend('/nonexistent/path.jsonl', 4);
assertEq(missingTrend.entries.length, 0, 'missing file produces empty entries');

// ===== countEventsByType =====

console.log('\n--- countEventsByType ---');

// Write test events
const dateDir1 = path.join(eventsDir, '2026-06-10');
fs.mkdirSync(dateDir1, { recursive: true });
fs.writeFileSync(path.join(dateDir1, 'ses_test.jsonl'), [
  JSON.stringify({ type: 'tool_outcome', result: 'success', ts: '2026-06-10T10:00:00Z' }),
  JSON.stringify({ type: 'tool_outcome', result: 'failure', ts: '2026-06-10T11:00:00Z' }),
  JSON.stringify({ type: 'skill_usage', skill: 'debugging', ts: '2026-06-10T12:00:00Z' }),
  JSON.stringify({ type: 'intervention', confirmed: true, ts: '2026-06-10T13:00:00Z' }),
  JSON.stringify({ type: 'entropy_signal', category: 'code', ts: '2026-06-10T14:00:00Z' })
].join('\n') + '\n');

const dateDir2 = path.join(eventsDir, '2026-06-12');
fs.mkdirSync(dateDir2, { recursive: true });
fs.writeFileSync(path.join(dateDir2, 'ses_test2.jsonl'), [
  JSON.stringify({ type: 'tool_outcome', result: 'success', ts: '2026-06-12T10:00:00Z' }),
  JSON.stringify({ type: 'context_pressure', event: 'bank_load', ts: '2026-06-12T11:00:00Z' })
].join('\n') + '\n');

const counts = rpt2.countEventsByType(new Date('2026-06-10'), new Date('2026-06-12'));
assertEq(counts.tool_outcome, 3, 'counted 3 tool_outcome events');
assertEq(counts.skill_usage, 1, 'counted 1 skill_usage event');
assertEq(counts.intervention, 1, 'counted 1 intervention event');
assertEq(counts.entropy_signal, 1, 'counted 1 entropy_signal event');
assertEq(counts.context_pressure, 1, 'counted 1 context_pressure event');

// Partial range
const partialCounts = rpt2.countEventsByType(new Date('2026-06-11'), new Date('2026-06-12'));
assertEq(partialCounts.tool_outcome, 1, 'partial range counted 1 tool_outcome');
assert(!partialCounts.intervention, 'partial range has no intervention');

// ===== countTotalEvents =====

console.log('\n--- countTotalEvents ---');

const total = rpt2.countTotalEvents(new Date('2026-06-10'), new Date('2026-06-12'));
assertEq(total, 7, 'total events is 7');

// ===== computeInterventionRate =====

console.log('\n--- computeInterventionRate ---');

const intRate = rpt2.computeInterventionRate(new Date('2026-06-10'), new Date('2026-06-12'));
assertEq(intRate.interventions, 1, 'intervention count is 1');
assertEq(intRate.total_events, 7, 'total events is 7');
assert(intRate.rate > 0 && intRate.rate < 100, 'intervention rate is between 0 and 100');
assertEq(intRate.rate, 14.29, 'intervention rate is 14.29%');

// ===== aggregateProposalStats =====

console.log('\n--- aggregateProposalStats ---');

// Write test proposals
const weekDir = path.join(proposalsDir, '2026-W25');
fs.mkdirSync(weekDir, { recursive: true });
fs.writeFileSync(path.join(weekDir, 'RHO-2026-W25-001.json'), JSON.stringify({
  id: 'RHO-2026-W25-001', risk: 'LOW', target_file: 'test1.md',
  classification: 'skill_gap', failure_code: 'test', diagnosis: 'test',
  proposed_change: 'test', evidence: [], content_hash: 'sha256:abc', status: 'pending'
}));
fs.writeFileSync(path.join(weekDir, 'RHO-2026-W25-002.json'), JSON.stringify({
  id: 'RHO-2026-W25-002', risk: 'HIGH', target_file: 'test2.md',
  classification: 'rule_gap', failure_code: 'test', diagnosis: 'test',
  proposed_change: 'test', evidence: [], content_hash: 'sha256:def', status: 'pending'
}));

// Write status: proposal 001 applied
fs.writeFileSync(path.join(dataDir, 'proposal_status.jsonl'),
  JSON.stringify({
    event_id: 'pse_001', proposal_id: 'RHO-2026-W25-001', proposal_hash: 'sha256:abc',
    ts: '2026-06-10T10:00:00Z', actor: 'applier', from_status: 'pending', to_status: 'applied',
    reason: 'auto-apply'
  }) + '\n' +
  JSON.stringify({
    event_id: 'pse_002', proposal_id: 'RHO-2026-W25-002', proposal_hash: 'sha256:def',
    ts: '2026-06-10T11:00:00Z', actor: 'glen', from_status: 'pending', to_status: 'rejected',
    reason: 'not needed'
  }) + '\n'
);

delete require.cache[require.resolve('../lib/reporting.js')];
const rpt3 = require('../lib/reporting.js');

const pStats = rpt3.aggregateProposalStats();
assertEq(pStats.total, 2, 'total proposals is 2');
assertEq(pStats.by_risk.LOW, 1, '1 LOW proposal');
assertEq(pStats.by_risk.HIGH, 1, '1 HIGH proposal');
assertEq(pStats.by_status.applied, 1, '1 applied');
assertEq(pStats.by_status.rejected, 1, '1 rejected');
assertEq(pStats.acceptance_rate, 50, 'acceptance rate is 50%');

// ===== cleanupOldEvents =====

console.log('\n--- cleanupOldEvents ---');

// Create old event dir (200 days ago)
const oldDate = new Date(Date.now() - 200 * 24 * 3600 * 1000);
const oldDateStr = oldDate.toISOString().slice(0, 10);
const oldDir = path.join(eventsDir, oldDateStr);
fs.mkdirSync(oldDir, { recursive: true });
fs.writeFileSync(path.join(oldDir, 'ses_old.jsonl'), '{"type":"test"}\n');

// Create recent event dir
const recentDate = new Date(Date.now() - 10 * 24 * 3600 * 1000);
const recentDateStr = recentDate.toISOString().slice(0, 10);
const recentDir = path.join(eventsDir, recentDateStr);
fs.mkdirSync(recentDir, { recursive: true });
fs.writeFileSync(path.join(recentDir, 'ses_recent.jsonl'), '{"type":"test"}\n');

const cleanup = rpt3.cleanupOldEvents(90);
assertEq(cleanup.deleted, 1, 'deleted 1 old event file');
assertEq(cleanup.dirs_removed, 1, 'removed 1 old dir');
assert(!fs.existsSync(oldDir), 'old event dir removed');
assert(fs.existsSync(recentDir), 'recent event dir preserved');

// Run again — nothing to clean
const cleanup2 = rpt3.cleanupOldEvents(90);
assertEq(cleanup2.deleted, 0, 'second cleanup deletes nothing');

// ===== generateHealthReport =====

console.log('\n--- generateHealthReport ---');

const report = rpt3.generateHealthReport({
  now: new Date('2026-06-15T00:00:00Z'),
  sinceDate: new Date('2026-06-08T00:00:00Z'),
  trendWeeks: 4
});

assert(typeof report === 'string', 'report is a string');
assert(report.includes('# HARNESS_HEALTH.md'), 'report has title');
assert(report.includes('## Trend Lines'), 'report has trend section');
assert(report.includes('## Intervention Rate'), 'report has intervention section');
assert(report.includes('## Event Volume'), 'report has event volume section');
assert(report.includes('## Proposal Statistics'), 'report has proposal section');
assert(report.includes('## Open Proposals'), 'report has open proposals section');
assert(report.includes('## Validation States'), 'report has validation section');
assert(report.includes('## Blocked Attempt Log'), 'report has blocked section');
assert(report.includes('## Coverage Limitations'), 'report has limitations section');
assert(report.includes('Total proposals: 2'), 'report includes proposal count');
assert(report.includes('tool_outcome'), 'report includes event type names');

// ===== findBlockedAttempts =====

console.log('\n--- findBlockedAttempts ---');

// Write a blocked event
const blockDir = path.join(eventsDir, '2026-06-11');
fs.mkdirSync(blockDir, { recursive: true });
fs.writeFileSync(path.join(blockDir, 'ses_blocked.jsonl'),
  JSON.stringify({
    type: 'tool_outcome', result: 'failure',
    command_summary: 'write-guard blocked',
    metadata: { description: 'HARNESS_WRITE_DENIED' },
    ts: '2026-06-11T10:00:00Z'
  }) + '\n'
);

const blocked = rpt3.findBlockedAttempts(new Date('2026-06-10'), new Date('2026-06-12'));
assertEq(blocked.length, 1, 'found 1 blocked attempt');

const noBlocked = rpt3.findBlockedAttempts(new Date('2026-07-01'), new Date('2026-07-31'));
assertEq(noBlocked.length, 0, 'no blocked attempts in empty range');

// ===== listAllProposalFiles =====

console.log('\n--- listAllProposalFiles ---');

const allP = rpt3.listAllProposalFiles();
assertEq(allP.length, 2, 'listAllProposalFiles finds 2 proposals');

// ===== Cleanup =====
fs.rmSync(tmpDir, { recursive: true, force: true });

// ===== Summary =====
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
