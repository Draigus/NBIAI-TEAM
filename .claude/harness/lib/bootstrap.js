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
const MEMORY_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'projects', 'd--OneDrive-Claude-code-NBIAI-TEAM', 'memory');

let emitted = 0;

function emitEvent(type, data) {
  data.source = 'bootstrap';
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

// --- Main ---
function main() {
  console.log('Bootstrap normaliser — seeding harness with historical data\n');

  // Check if bootstrap already ran
  const markerPath = path.join(PROJECT_DIR, '.claude', 'harness', 'data', 'bootstrap_complete.json');
  if (fs.existsSync(markerPath)) {
    console.log('Bootstrap already completed (' + markerPath + '). Delete this file to re-run.');
    process.exit(0);
  }

  processSessionLogs();
  processFeedbackMemories();

  // Write completion marker
  fs.writeFileSync(markerPath, JSON.stringify({
    completed: new Date().toISOString(),
    events_emitted: emitted
  }));

  console.log('\nBootstrap complete. ' + emitted + ' events emitted.');
  console.log('These events are tagged source=bootstrap and will receive lower difficulty scores in coreset selection.');
}

try { main(); } catch (e) { console.error('Bootstrap failed:', e.message); process.exit(1); }
