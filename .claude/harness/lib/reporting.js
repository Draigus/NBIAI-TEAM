#!/usr/bin/env node
'use strict';
// reporting.js — Phase 8: Reporting and hygiene for the RHO harness.
// Generates HARNESS_HEALTH.md, computes trend lines, handles retention cleanup.
// Spec reference: §9 Reporting.
// Zero external dependencies — Node.js built-ins only.

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const HARNESS_DIR = path.join(PROJECT_DIR, '.claude', 'harness');
const DATA_DIR = path.join(HARNESS_DIR, 'data');
const EVENTS_DIR = path.join(DATA_DIR, 'events');
const TREND_PATH = path.join(DATA_DIR, 'entropy_trend.jsonl');
const STATUS_PATH = path.join(DATA_DIR, 'proposal_status.jsonl');
const PROPOSALS_DIR = path.join(HARNESS_DIR, 'proposals');
const HEALTH_PATH = path.join(HARNESS_DIR, 'HARNESS_HEALTH.md');

var DEFAULT_TREND_WEEKS = 4;
var DEFAULT_RETENTION_DAYS = 90;

// --- Trend line computation ---

function readEntropyTrend(trendPath, weeks) {
  trendPath = trendPath || TREND_PATH;
  weeks = weeks || DEFAULT_TREND_WEEKS;

  if (!fs.existsSync(trendPath)) return { entries: [], rolling: [] };

  var entries = [];
  try {
    var lines = fs.readFileSync(trendPath, 'utf8').split('\n');
    for (var i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      try { entries.push(JSON.parse(lines[i])); } catch { /* skip corrupt */ }
    }
  } catch { /* unreadable */ }

  entries.sort(function(a, b) {
    return (a.ts || a.date || '') < (b.ts || b.date || '') ? -1 : 1;
  });

  var rolling = computeRollingAverage(entries, weeks);
  return { entries: entries, rolling: rolling };
}

function computeRollingAverage(entries, weeks) {
  if (entries.length === 0) return [];
  var windowMs = weeks * 7 * 24 * 3600 * 1000;
  var result = [];

  for (var i = 0; i < entries.length; i++) {
    var entryTs = new Date(entries[i].ts || entries[i].date).getTime();
    var windowStart = entryTs - windowMs;
    var sum = 0;
    var count = 0;

    for (var j = 0; j <= i; j++) {
      var jTs = new Date(entries[j].ts || entries[j].date).getTime();
      if (jTs >= windowStart) {
        sum += (entries[j].score || entries[j].entropy_score || 0);
        count++;
      }
    }

    result.push({
      date: entries[i].ts || entries[i].date || '',
      score: entries[i].score || entries[i].entropy_score || 0,
      rolling_avg: count > 0 ? Math.round((sum / count) * 100) / 100 : 0,
      window_size: count
    });
  }

  return result;
}

// --- Event volume ---

function countEventsByType(sinceDate, untilDate) {
  var counts = {};
  if (!fs.existsSync(EVENTS_DIR)) return counts;

  var sinceStr = sinceDate ? sinceDate.toISOString().slice(0, 10) : '0000-00-00';
  var untilStr = untilDate ? untilDate.toISOString().slice(0, 10) : '9999-12-31';

  try {
    var dateDirs = fs.readdirSync(EVENTS_DIR).filter(function(d) {
      return d >= sinceStr && d <= untilStr;
    });

    for (var di = 0; di < dateDirs.length; di++) {
      var dirPath = path.join(EVENTS_DIR, dateDirs[di]);
      try {
        if (!fs.statSync(dirPath).isDirectory()) continue;
      } catch { continue; }

      var files = fs.readdirSync(dirPath).filter(function(f) {
        return f.endsWith('.jsonl');
      });

      for (var fi = 0; fi < files.length; fi++) {
        try {
          var content = fs.readFileSync(path.join(dirPath, files[fi]), 'utf8');
          var lines = content.split('\n');
          for (var li = 0; li < lines.length; li++) {
            if (!lines[li].trim()) continue;
            try {
              var ev = JSON.parse(lines[li]);
              var type = ev.type || 'unknown';
              counts[type] = (counts[type] || 0) + 1;
            } catch { /* skip corrupt */ }
          }
        } catch { continue; }
      }
    }
  } catch { /* dir unreadable */ }

  return counts;
}

function countTotalEvents(sinceDate, untilDate) {
  var byType = countEventsByType(sinceDate, untilDate);
  var total = 0;
  for (var t in byType) total += byType[t];
  return total;
}

// --- Intervention rate ---

function computeInterventionRate(sinceDate, untilDate) {
  var counts = countEventsByType(sinceDate, untilDate);
  var interventions = counts.intervention || 0;
  var total = 0;
  for (var t in counts) total += counts[t];
  return {
    interventions: interventions,
    total_events: total,
    rate: total > 0 ? Math.round((interventions / total) * 10000) / 100 : 0
  };
}

// --- Proposal statistics ---

function readAllStatuses() {
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

function aggregateProposalStats() {
  var statusEvents = readAllStatuses();

  var latestByProposal = {};
  for (var i = 0; i < statusEvents.length; i++) {
    var ev = statusEvents[i];
    var pid = ev.proposal_id;
    if (!latestByProposal[pid] || ev.ts > latestByProposal[pid].ts) {
      latestByProposal[pid] = ev;
    }
  }

  var stats = {
    total: 0,
    by_status: {},
    by_risk: { LOW: 0, HIGH: 0, BLOCKED_TO_APPLY: 0 },
    acceptance_rate: 0
  };

  var proposalFiles = listAllProposalFiles();
  stats.total = proposalFiles.length;

  var applied = 0;
  var rejected = 0;

  for (var j = 0; j < proposalFiles.length; j++) {
    var p = proposalFiles[j];
    var currentStatus = 'pending';
    if (latestByProposal[p.id]) {
      currentStatus = latestByProposal[p.id].to_status;
    }

    stats.by_status[currentStatus] = (stats.by_status[currentStatus] || 0) + 1;

    if (p.risk) {
      stats.by_risk[p.risk] = (stats.by_risk[p.risk] || 0) + 1;
    }

    if (currentStatus === 'applied' || currentStatus === 'validated_by_evidence' ||
        currentStatus === 'validated_by_absence') {
      applied++;
    }
    if (currentStatus === 'rejected') rejected++;
  }

  var decided = applied + rejected;
  stats.acceptance_rate = decided > 0 ? Math.round((applied / decided) * 10000) / 100 : 0;

  return stats;
}

function listAllProposalFiles() {
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
        } catch { /* skip */ }
      }
    }
  } catch { /* dir unreadable */ }

  return proposals;
}

// --- Blocked attempt log ---

function findBlockedAttempts(sinceDate, untilDate) {
  var blocked = [];
  if (!fs.existsSync(EVENTS_DIR)) return blocked;

  var sinceStr = sinceDate ? sinceDate.toISOString().slice(0, 10) : '0000-00-00';
  var untilStr = untilDate ? untilDate.toISOString().slice(0, 10) : '9999-12-31';

  try {
    var dateDirs = fs.readdirSync(EVENTS_DIR).filter(function(d) {
      return d >= sinceStr && d <= untilStr;
    });

    for (var di = 0; di < dateDirs.length; di++) {
      var dirPath = path.join(EVENTS_DIR, dateDirs[di]);
      try {
        if (!fs.statSync(dirPath).isDirectory()) continue;
      } catch { continue; }

      var files = fs.readdirSync(dirPath).filter(function(f) {
        return f.endsWith('.jsonl');
      });

      for (var fi = 0; fi < files.length; fi++) {
        try {
          var content = fs.readFileSync(path.join(dirPath, files[fi]), 'utf8');
          var lines = content.split('\n');
          for (var li = 0; li < lines.length; li++) {
            if (!lines[li].trim()) continue;
            try {
              var ev = JSON.parse(lines[li]);
              if (ev.type === 'tool_outcome' && ev.result === 'failure' &&
                  ev.command_summary && /write.guard|shell.guard|HARNESS_WRITE_DENIED/i.test(
                    ev.command_summary + ' ' + (ev.metadata && ev.metadata.description || ''))) {
                blocked.push(ev);
              }
            } catch { /* skip */ }
          }
        } catch { continue; }
      }
    }
  } catch { /* dir unreadable */ }

  return blocked;
}

// --- Retention cleanup ---

function cleanupOldEvents(retentionDays) {
  retentionDays = retentionDays || DEFAULT_RETENTION_DAYS;
  if (!fs.existsSync(EVENTS_DIR)) return { deleted: 0, dirs_removed: 0 };

  var cutoff = new Date(Date.now() - retentionDays * 24 * 3600 * 1000);
  var cutoffStr = cutoff.toISOString().slice(0, 10);
  var deleted = 0;
  var dirsRemoved = 0;

  try {
    var dateDirs = fs.readdirSync(EVENTS_DIR).filter(function(d) {
      return d < cutoffStr && /^\d{4}-\d{2}-\d{2}$/.test(d);
    });

    for (var i = 0; i < dateDirs.length; i++) {
      var dirPath = path.join(EVENTS_DIR, dateDirs[i]);
      try {
        var files = fs.readdirSync(dirPath);
        for (var j = 0; j < files.length; j++) {
          fs.unlinkSync(path.join(dirPath, files[j]));
          deleted++;
        }
        fs.rmdirSync(dirPath);
        dirsRemoved++;
      } catch { /* skip on error */ }
    }
  } catch { /* dir unreadable */ }

  return { deleted: deleted, dirs_removed: dirsRemoved };
}

// --- HARNESS_HEALTH.md generation ---

function generateHealthReport(opts) {
  opts = opts || {};
  var now = opts.now || new Date();
  var trendWeeks = opts.trendWeeks || DEFAULT_TREND_WEEKS;
  var sinceDate = opts.sinceDate || new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  var lines = [];
  lines.push('# HARNESS_HEALTH.md');
  lines.push('');
  lines.push('Generated: ' + now.toISOString());
  lines.push('');

  // Trend lines
  lines.push('## Trend Lines (' + trendWeeks + '-week rolling)');
  lines.push('');
  var trend = readEntropyTrend(null, trendWeeks);
  if (trend.rolling.length === 0) {
    lines.push('No entropy trend data available.');
  } else {
    lines.push('| Date | Score | Rolling Avg |');
    lines.push('|---|---|---|');
    var recentEntries = trend.rolling.slice(-10);
    for (var ti = 0; ti < recentEntries.length; ti++) {
      var te = recentEntries[ti];
      lines.push('| ' + (te.date || '').slice(0, 10) + ' | ' + te.score + ' | ' + te.rolling_avg + ' |');
    }
  }
  lines.push('');

  // Intervention rate
  lines.push('## Intervention Rate');
  lines.push('');
  var intRate = computeInterventionRate(sinceDate, now);
  lines.push('- Interventions this period: ' + intRate.interventions);
  lines.push('- Total events this period: ' + intRate.total_events);
  lines.push('- Rate: ' + intRate.rate + '%');
  lines.push('');

  // Event volume
  lines.push('## Event Volume (this period)');
  lines.push('');
  var eventCounts = countEventsByType(sinceDate, now);
  var eventTypes = Object.keys(eventCounts).sort();
  if (eventTypes.length === 0) {
    lines.push('No events captured this period.');
  } else {
    lines.push('| Type | Count |');
    lines.push('|---|---|');
    for (var ei = 0; ei < eventTypes.length; ei++) {
      lines.push('| ' + eventTypes[ei] + ' | ' + eventCounts[eventTypes[ei]] + ' |');
    }
  }
  lines.push('');

  // Proposal statistics
  lines.push('## Proposal Statistics');
  lines.push('');
  var pStats = aggregateProposalStats();
  lines.push('- Total proposals: ' + pStats.total);
  lines.push('- Acceptance rate: ' + pStats.acceptance_rate + '%');
  lines.push('- By risk: LOW=' + pStats.by_risk.LOW + ', HIGH=' + pStats.by_risk.HIGH +
    ', BLOCKED=' + pStats.by_risk.BLOCKED_TO_APPLY);
  if (Object.keys(pStats.by_status).length > 0) {
    lines.push('- By status:');
    var statuses = Object.keys(pStats.by_status).sort();
    for (var si = 0; si < statuses.length; si++) {
      lines.push('  - ' + statuses[si] + ': ' + pStats.by_status[statuses[si]]);
    }
  }
  lines.push('');

  // Open proposals
  lines.push('## Open Proposals');
  lines.push('');
  var allProposals = listAllProposalFiles();
  var statusEvents = readAllStatuses();
  var latestStatus = {};
  for (var k = 0; k < statusEvents.length; k++) {
    var se = statusEvents[k];
    if (!latestStatus[se.proposal_id] || se.ts > latestStatus[se.proposal_id].ts) {
      latestStatus[se.proposal_id] = se;
    }
  }
  var openCount = 0;
  for (var pi = 0; pi < allProposals.length; pi++) {
    var p = allProposals[pi];
    var status = latestStatus[p.id] ? latestStatus[p.id].to_status : 'pending';
    if (status === 'pending' || status === 'approved') {
      lines.push('- **' + p.id + '** [' + (p.risk || '?') + '] ' + (p.target_file || '') +
        ' — ' + (p.diagnosis || '').slice(0, 100));
      openCount++;
    }
  }
  if (openCount === 0) lines.push('No open proposals.');
  lines.push('');

  // Validation states
  lines.push('## Validation States');
  lines.push('');
  var validatedCount = 0;
  for (var vi = 0; vi < allProposals.length; vi++) {
    var vp = allProposals[vi];
    var vs = latestStatus[vp.id] ? latestStatus[vp.id].to_status : 'pending';
    if (vs === 'validated_by_evidence' || vs === 'validated_by_absence' || vs === 'regressed') {
      lines.push('- **' + vp.id + '** — ' + vs);
      validatedCount++;
    }
  }
  if (validatedCount === 0) lines.push('No validation data yet.');
  lines.push('');

  // Blocked attempts
  lines.push('## Blocked Attempt Log');
  lines.push('');
  var blockedAttempts = findBlockedAttempts(sinceDate, now);
  if (blockedAttempts.length === 0) {
    lines.push('No blocked write attempts this period.');
  } else {
    for (var bi = 0; bi < blockedAttempts.length; bi++) {
      var ba = blockedAttempts[bi];
      lines.push('- ' + (ba.ts || '') + ' — ' + (ba.command_summary || '').slice(0, 100));
    }
  }
  lines.push('');

  // Coverage limitations
  lines.push('## Coverage Limitations');
  lines.push('');
  lines.push('The fast entropy scan uses pattern matching on git diffs. It cannot detect:');
  lines.push('- Semantic test weakening (assertions that pass but test less)');
  lines.push('- Renamed bypasses (same antipattern under a new name)');
  lines.push('- Generated-file drift (build outputs diverging from source)');
  lines.push('- Dependency behaviour changes where diff text looks harmless');
  lines.push('- Context pressure from system compaction (no hook available)');
  lines.push('');

  return lines.join('\n');
}

function writeHealthReport(opts) {
  var content = generateHealthReport(opts);
  fs.mkdirSync(path.dirname(HEALTH_PATH), { recursive: true });
  fs.writeFileSync(HEALTH_PATH, content);
  return HEALTH_PATH;
}

// --- CLI entry point ---

function main() {
  var arg = process.argv[2];
  if (arg === '--generate') {
    var reportPath = writeHealthReport();
    console.log('HARNESS_HEALTH.md generated at: ' + reportPath);
  } else if (arg === '--cleanup') {
    var days = parseInt(process.argv[3], 10) || DEFAULT_RETENTION_DAYS;
    var result = cleanupOldEvents(days);
    console.log('Cleanup: ' + result.deleted + ' files deleted, ' + result.dirs_removed + ' dirs removed');
  } else if (arg === '--stats') {
    console.log(JSON.stringify(aggregateProposalStats(), null, 2));
  } else {
    console.log('Usage: node reporting.js --generate | --cleanup [days] | --stats');
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('reporting error:', e.message); process.exit(1); }
}

module.exports = {
  readEntropyTrend,
  computeRollingAverage,
  countEventsByType,
  countTotalEvents,
  computeInterventionRate,
  readAllStatuses,
  aggregateProposalStats,
  listAllProposalFiles,
  findBlockedAttempts,
  cleanupOldEvents,
  generateHealthReport,
  writeHealthReport
};
