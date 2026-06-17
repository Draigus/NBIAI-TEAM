#!/usr/bin/env node
'use strict';
// anti-regression.js — Phase 6: Anti-regression mechanics for the RHO harness.
// Tracks whether applied proposals actually prevent the failures they targeted.
// Spec reference: §6 Anti-Regression.
// Zero external dependencies — Node.js built-ins only.

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const HARNESS_DIR = path.join(PROJECT_DIR, '.claude', 'harness');
const PROPOSALS_DIR = path.join(HARNESS_DIR, 'proposals');
const EVENTS_DIR = path.join(HARNESS_DIR, 'data', 'events');
const STATUS_PATH = path.join(HARNESS_DIR, 'data', 'proposal_status.jsonl');

const DEFAULT_WINDOW_WEEKS = 4;
const MS_PER_WEEK = 7 * 24 * 3600 * 1000;

// --- Key extraction ---

function extractKey(proposal) {
  if (!proposal) return null;
  var ar = proposal.anti_regression;
  if (!ar || !Array.isArray(ar.key) || ar.key.length < 4) return null;
  return {
    component: ar.key[0] || '',
    classification: ar.key[1] || '',
    domain: ar.key[2] || '',
    failure_code: ar.key[3] || '',
    fix_id: ar.key[4] || proposal.id || ''
  };
}

// --- Event scanning ---

function readEventsInRange(sinceDate, untilDate) {
  var events = [];
  if (!fs.existsSync(EVENTS_DIR)) return events;

  var sinceStr = sinceDate.toISOString().slice(0, 10);
  var untilStr = untilDate ? untilDate.toISOString().slice(0, 10) : '9999-12-31';

  try {
    var dateDirs = fs.readdirSync(EVENTS_DIR).filter(function(d) {
      return d >= sinceStr && d <= untilStr;
    }).sort();

    for (var di = 0; di < dateDirs.length; di++) {
      var dirPath = path.join(EVENTS_DIR, dateDirs[di]);
      try {
        var stat = fs.statSync(dirPath);
        if (!stat.isDirectory()) continue;
      } catch { continue; }

      var files = fs.readdirSync(dirPath).filter(function(f) {
        return f.endsWith('.jsonl');
      });

      for (var fi = 0; fi < files.length; fi++) {
        var content = '';
        try { content = fs.readFileSync(path.join(dirPath, files[fi]), 'utf8'); } catch { continue; }
        var lines = content.split('\n');
        for (var li = 0; li < lines.length; li++) {
          if (!lines[li].trim()) continue;
          try { events.push(JSON.parse(lines[li])); } catch { /* skip corrupt */ }
        }
      }
    }
  } catch { /* events dir unreadable */ }

  return events;
}

function eventMatchesKey(event, key) {
  if (!event || !key) return false;

  if (event.type === 'intervention' && event.confirmed) {
    return (event.harness_component === key.component) &&
      (event.metadata && event.metadata.classification === key.classification ||
       !key.classification);
  }

  if (event.type === 'skill_usage' && event.action === 'skipped' && key.failure_code === 'mandatory_skill_skipped') {
    return true;
  }

  if (event.type === 'tool_outcome' && event.result === 'failure') {
    var domain = event.metadata && event.metadata.task_domain || '';
    return domain === key.domain || !key.domain;
  }

  if (event.type === 'entropy_signal') {
    return event.category === key.component || event.detail.includes(key.failure_code);
  }

  return false;
}

function findMatchingFailures(key, sinceDate, untilDate) {
  var events = readEventsInRange(sinceDate, untilDate);
  var matches = [];
  for (var i = 0; i < events.length; i++) {
    if (eventMatchesKey(events[i], key)) {
      matches.push(events[i]);
    }
  }
  return matches;
}

function findPositiveEvidence(key, sinceDate, untilDate) {
  var events = readEventsInRange(sinceDate, untilDate);
  var positives = [];
  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    if (ev.type === 'tool_outcome' && ev.result === 'success') {
      var domain = ev.metadata && ev.metadata.task_domain || '';
      if (domain === key.domain || !key.domain) {
        positives.push(ev);
      }
    }
    if (ev.type === 'skill_usage' && ev.action === 'invoked') {
      positives.push(ev);
    }
  }
  return positives;
}

// --- Status computation ---

function readStatusEvents() {
  if (!fs.existsSync(STATUS_PATH)) return [];
  var events = [];
  try {
    var lines = fs.readFileSync(STATUS_PATH, 'utf8').split('\n');
    for (var i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      try { events.push(JSON.parse(lines[i])); } catch { /* skip */ }
    }
  } catch { /* unreadable */ }
  return events;
}

function getCurrentStatus(proposalId) {
  var events = readStatusEvents();
  var latest = null;
  for (var i = 0; i < events.length; i++) {
    if (events[i].proposal_id === proposalId) {
      if (!latest || events[i].ts > latest.ts) {
        latest = events[i];
      }
    }
  }
  return latest ? latest.to_status : 'pending';
}

function getAppliedDate(proposalId) {
  var events = readStatusEvents();
  for (var i = 0; i < events.length; i++) {
    if (events[i].proposal_id === proposalId && events[i].to_status === 'applied') {
      return new Date(events[i].ts);
    }
  }
  return null;
}

function computeStatus(proposal, opts) {
  opts = opts || {};
  var windowWeeks = opts.windowWeeks || DEFAULT_WINDOW_WEEKS;
  var now = opts.now || new Date();

  var key = extractKey(proposal);
  if (!key) {
    return { status: 'no_key', reason: 'proposal has no anti_regression key' };
  }

  var appliedDate = getAppliedDate(proposal.id);
  if (!appliedDate) {
    return { status: 'not_applied', reason: 'proposal has not been applied' };
  }

  var windowEnd = new Date(appliedDate.getTime() + windowWeeks * MS_PER_WEEK);
  if (now < windowEnd) {
    return { status: 'monitoring', reason: 'within ' + windowWeeks + '-week monitoring window', window_end: windowEnd.toISOString() };
  }

  var failures = findMatchingFailures(key, appliedDate, now);
  if (failures.length > 0) {
    return {
      status: 'regressed',
      reason: 'failure pattern recurred ' + failures.length + ' time(s) after fix',
      matching_events: failures.map(function(e) { return e.event_id; }),
      first_recurrence: failures[0].ts
    };
  }

  var positives = findPositiveEvidence(key, appliedDate, now);
  if (positives.length > 0) {
    return {
      status: 'validated_by_evidence',
      reason: positives.length + ' successful instance(s) without failure recurrence',
      evidence_count: positives.length
    };
  }

  return {
    status: 'validated_by_absence',
    reason: 'no recurrence and no evidence — task type may not have occurred'
  };
}

// --- Check all applied proposals ---

function listAllProposals() {
  var proposals = [];
  if (!fs.existsSync(PROPOSALS_DIR)) return proposals;

  try {
    var weekDirs = fs.readdirSync(PROPOSALS_DIR);
    for (var i = 0; i < weekDirs.length; i++) {
      var weekPath = path.join(PROPOSALS_DIR, weekDirs[i]);
      try {
        if (!fs.statSync(weekPath).isDirectory()) continue;
      } catch { continue; }

      var files = fs.readdirSync(weekPath).filter(function(f) {
        return f.startsWith('RHO-') && f.endsWith('.json');
      });

      for (var j = 0; j < files.length; j++) {
        try {
          var content = fs.readFileSync(path.join(weekPath, files[j]), 'utf8');
          proposals.push(JSON.parse(content));
        } catch { /* skip corrupt */ }
      }
    }
  } catch { /* proposals dir unreadable */ }

  return proposals;
}

function checkAllApplied(opts) {
  opts = opts || {};
  var proposals = listAllProposals();
  var results = [];

  for (var i = 0; i < proposals.length; i++) {
    var p = proposals[i];
    var currentStatus = getCurrentStatus(p.id);
    if (currentStatus !== 'applied' && currentStatus !== 'validated_by_evidence' &&
        currentStatus !== 'validated_by_absence') {
      continue;
    }

    var result = computeStatus(p, opts);
    results.push({
      proposal_id: p.id,
      target_file: p.target_file,
      current_status: currentStatus,
      computed_status: result.status,
      reason: result.reason,
      matching_events: result.matching_events || [],
      evidence_count: result.evidence_count || 0
    });
  }

  return results;
}

// --- Rollback proposal generation ---

function generateRollbackProposal(proposal, matchingEvents) {
  if (!proposal || !proposal.id) return null;

  var key = extractKey(proposal);
  return {
    classification: proposal.classification || 'unknown',
    failure_code: proposal.failure_code || 'unknown',
    target_file: proposal.target_file || '',
    risk: proposal.risk === 'LOW' ? 'HIGH' : proposal.risk,
    evidence: (matchingEvents || []).map(function(e) {
      return typeof e === 'string' ? e : e.event_id;
    }),
    diagnosis: 'Rollback of ' + proposal.id + ': original fix did not prevent recurrence. ' +
      (matchingEvents ? matchingEvents.length : 0) + ' matching failure(s) detected.',
    proposed_change: 'Revert changes applied by ' + proposal.id + ' to ' + (proposal.target_file || 'unknown') +
      ' and investigate alternative fix.',
    anti_regression: key ? {
      key: [key.component, key.classification, key.domain, key.failure_code, 'rollback-' + proposal.id],
      check: 'Verify original failure pattern does not recur after rollback + re-fix'
    } : null,
    status: 'pending',
    rollback_of: proposal.id
  };
}

// --- CLI entry point ---

function main() {
  var arg = process.argv[2];
  if (arg === '--check-all') {
    var results = checkAllApplied();
    console.log(JSON.stringify(results, null, 2));
  } else if (arg === '--help') {
    console.log('Usage: node anti-regression.js --check-all');
    console.log('  Checks all applied proposals for recurrence within the monitoring window.');
  } else {
    console.log('anti-regression: no action specified. Use --check-all or --help.');
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('anti-regression error:', e.message); process.exit(1); }
}

module.exports = {
  extractKey,
  readEventsInRange,
  eventMatchesKey,
  findMatchingFailures,
  findPositiveEvidence,
  readStatusEvents,
  getCurrentStatus,
  getAppliedDate,
  computeStatus,
  listAllProposals,
  checkAllApplied,
  generateRollbackProposal
};
