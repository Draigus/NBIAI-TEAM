#!/usr/bin/env node
'use strict';
// bootstrap.js — One-time normaliser for historical data.
// Processes existing session logs and feedback memories into harness events.
// Run once: node .claude/harness/lib/bootstrap.js
// Spec §4.6.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const EMIT = path.join(PROJECT_DIR, '.claude', 'harness', 'lib', 'emit-event.js');
const LOGS_DIR = path.join(PROJECT_DIR, 'projects', 'nbi_dashboard', 'session_logs');
const MEMORY_DIR = path.join(PROJECT_DIR, 'memory');

let emitted = 0;

function emitEvent(type, data) {
  if (!data.source) data.source = 'bootstrap';
  try {
    execSync('node "' + EMIT + '" ' + type, {
      cwd: PROJECT_DIR,
      input: JSON.stringify(data),
      encoding: 'utf8',
      timeout: 5000
    });
    emitted++;
  } catch {}
}

// --- Parse session logs for intervention indicators ---
function processSessionLogs() {
  console.log('Processing session logs...');
  let files;
  try { files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.md')).sort(); }
  catch { console.log('  No session logs found'); return; }

  const correctionRe = /\b(Glen:.*?(corrected?|rejected?|redirected?|wrong|stop|don't|no[, ]+not))\b/gi;
  const bugFixRe = /\b(bug\s*fix|hotfix|fixed|resolved|root\s*cause)\b/gi;
  const featureRe = /\b(feature|implement|built|created|added)\b/gi;

  for (const file of files) {
    const content = fs.readFileSync(path.join(LOGS_DIR, file), 'utf8');
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    const sessionDate = dateMatch ? dateMatch[1] : 'unknown';

    // Extract correction patterns
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      correctionRe.lastIndex = 0;
      if (correctionRe.test(lines[i])) {
        const context = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join(' ').slice(0, 300);
        emitEvent('intervention', {
          severity: 'correction',
          harness_component: 'context',
          description: context,
          task_context: 'Session ' + sessionDate,
          avoidable: false,
          confirmed: false,
          capture_method: 'bootstrap',
          source_file: file,
          source_line: i + 1,
          confidence: 'low',
          parse_warnings: ['bootstrap: regex-matched from session log']
        });
      }
    }

    // Infer task types for skill coverage analysis
    bugFixRe.lastIndex = 0;
    featureRe.lastIndex = 0;
    const hasBugFix = bugFixRe.test(content);
    const hasFeature = featureRe.test(content);

    if (hasBugFix) {
      emitEvent('skill_usage', {
        tool_input: { skill: 'session-inference' },
        task_type_inferred: 'bug_fix',
        source_file: file,
        confidence: 'medium'
      });
    }
    if (hasFeature) {
      emitEvent('skill_usage', {
        tool_input: { skill: 'session-inference' },
        task_type_inferred: 'feature',
        source_file: file,
        confidence: 'medium'
      });
    }
  }

  console.log('  Processed ' + files.length + ' session logs');
}

// --- Parse feedback memories as implicit interventions ---
function processFeedbackMemories() {
  console.log('Processing feedback memories...');
  let files;
  try { files = fs.readdirSync(MEMORY_DIR).filter(f => f.startsWith('feedback_') && f.endsWith('.md')); }
  catch { console.log('  No feedback memories found'); return; }

  for (const file of files) {
    const content = fs.readFileSync(path.join(MEMORY_DIR, file), 'utf8');

    // Extract frontmatter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;

    const description = (content.match(/description:\s*"?([^"\n]+)"?/) || [])[1] || '';
    const body = content.slice(fmMatch[0].length).trim();

    // Each feedback memory represents at least one intervention
    const whyMatch = body.match(/\*\*Why:\*\*\s*(.+)/);
    const reason = whyMatch ? whyMatch[1].trim() : '';

    // Determine harness component from content
    let component = 'context';
    if (/verify|check|test|confirm/i.test(description)) component = 'verification';
    if (/skill|routing|dispatch/i.test(description)) component = 'skill_routing';
    if (/memory|remember|forget/i.test(description)) component = 'memory';
    if (/permission|approval|gate/i.test(description)) component = 'permission';
    if (/tool|bash|command/i.test(description)) component = 'tool_use';

    emitEvent('intervention', {
      severity: 'correction',
      harness_component: component,
      description: description + (reason ? ' — ' + reason : ''),
      task_context: 'Feedback memory: ' + file,
      avoidable: true,
      existing_rule_missed: null,
      confirmed: true,
      capture_method: 'bootstrap',
      confidence: 'high',
      parse_warnings: ['bootstrap: derived from feedback memory']
    });
  }

  console.log('  Processed ' + files.length + ' feedback memories');
}

// --- Parse git history for task domain inference ---
const DOMAIN_MAP = [
  { prefix: 'feat', domain: 'feature' },
  { prefix: 'fix', domain: 'bug_fix' },
  { prefix: 'docs', domain: 'documentation' },
  { prefix: 'intel', domain: 'intelligence' },
  { prefix: 'test', domain: 'testing' },
  { prefix: 'chore', domain: 'maintenance' },
  { prefix: 'refactor', domain: 'refactor' },
];

function inferDomain(message) {
  const lower = message.toLowerCase();
  if (/^(fix|feat|chore|refactor|test|docs)\(harness\)/.test(lower)) return 'harness';
  for (const { prefix, domain } of DOMAIN_MAP) {
    if (lower.startsWith(prefix + '(') || lower.startsWith(prefix + ':')) return domain;
  }
  return 'unknown';
}

function processGitHistory() {
  console.log('Processing git history...');
  let log;
  try {
    log = execSync('git log --oneline -50', {
      cwd: PROJECT_DIR, encoding: 'utf8', timeout: 10000
    });
  } catch { console.log('  Git log failed'); return false; }

  const lines = log.trim().split('\n').filter(l => l.trim());
  for (const line of lines) {
    const spaceIdx = line.indexOf(' ');
    if (spaceIdx === -1) continue;
    const hash = line.slice(0, spaceIdx);
    const message = line.slice(spaceIdx + 1);

    emitEvent('skill_usage', {
      tool_input: { skill: 'git-history-inference' },
      description: message.slice(0, 200),
      task_type_inferred: inferDomain(message),
      source_file: hash,
      source: 'git_history',
      capture_method: 'bootstrap',
      confidence: 'low',
      parse_warnings: ['bootstrap: inferred from commit message']
    });
  }

  console.log('  Processed ' + lines.length + ' commits');
  return true;
}

// --- Main ---
function main() {
  console.log('Bootstrap normaliser — seeding harness with historical data\n');

  const markerPath = path.join(PROJECT_DIR, '.claude', 'harness', 'data', 'bootstrap_complete.json');
  let marker = {};
  if (fs.existsSync(markerPath)) {
    try { marker = JSON.parse(fs.readFileSync(markerPath, 'utf8')); } catch {}
  }

  if (marker.completed && marker.git_history_bootstrapped) {
    console.log('Bootstrap already completed (all phases). Delete ' + markerPath + ' to re-run.');
    process.exit(0);
  }

  if (!marker.completed) {
    processSessionLogs();
    processFeedbackMemories();
  } else {
    console.log('Session logs and feedback memories already bootstrapped, skipping.');
  }

  let gitSuccess = false;
  if (!marker.git_history_bootstrapped) {
    gitSuccess = processGitHistory() !== false;
  } else {
    gitSuccess = true;
    console.log('Git history already bootstrapped, skipping.');
  }

  // Write/update completion marker
  fs.writeFileSync(markerPath, JSON.stringify({
    completed: marker.completed || new Date().toISOString(),
    git_history_bootstrapped: marker.git_history_bootstrapped || gitSuccess,
    events_emitted: (marker.events_emitted || 0) + emitted
  }));

  console.log('\nBootstrap complete. ' + emitted + ' events emitted.');
  console.log('These events are tagged source=bootstrap and will receive lower difficulty scores in coreset selection.');
}

try { main(); } catch (e) { console.error('Bootstrap failed:', e.message); process.exit(1); }
