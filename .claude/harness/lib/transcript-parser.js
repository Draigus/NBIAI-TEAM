#!/usr/bin/env node
'use strict';
// transcript-parser.js — Scans session log files for correction indicators.
// Outputs candidate_signal events to candidate_signals.jsonl.
// Called by the weekly routine or manually.
// Usage: node .claude/harness/lib/transcript-parser.js [session-log-path]
// If no path given, scans the most recent session log.

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const LOGS_DIR = path.join(PROJECT_DIR, 'projects', 'nbi_dashboard', 'session_logs');
const SIGNALS_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'data', 'candidate_signals.jsonl');

const CORRECTION_PATTERNS = [
  { pattern: /\b(no[, ]+not that|don't do that|stop doing|that's wrong|that's not right)\b/gi, severity: 'correction' },
  { pattern: /\b(you need to (fucking )?fix|what the fuck|how dare you)\b/gi, severity: 'rejection' },
  { pattern: /\b(actually[, ]+do .+ instead|no[, ]+I (want|need|meant))\b/gi, severity: 'redirect' },
  { pattern: /\b(that's not what I asked|I said .+ not)\b/gi, severity: 'rejection' },
  { pattern: /\b(wrong approach|missed the point|you're not listening)\b/gi, severity: 'rejection' }
];

function findSessionLog(targetPath) {
  if (targetPath) return targetPath;
  try {
    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    return files.length > 0 ? path.join(LOGS_DIR, files[0]) : null;
  } catch { return null; }
}

function extractSignals(content, filePath) {
  const signals = [];
  const lines = content.split('\n');

  const basename = path.basename(filePath, '.md');
  const sessionLogId = 'log_' + basename.replace(/_session$/, '');

  const sidMatch = content.match(/<!-- session_id: (ses_\w+) -->/);
  const emittedSessionId = sidMatch ? sidMatch[1] : null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { pattern, severity } of CORRECTION_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match) {
        const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(' ').slice(0, 300);
        signals.push({
          source_file: path.basename(filePath),
          source_line: i + 1,
          matched_text: match[0],
          severity: severity,
          context: context,
          confidence: 'low',
          confirmed: false,
          capture_method: 'transcript_parser',
          session_log_id: sessionLogId,
          emitted_session_id: emittedSessionId,
          ts: new Date().toISOString()
        });
        break;
      }
    }
  }

  return signals;
}

function main() {
  const targetPath = process.argv[2] || null;
  const logPath = findSessionLog(targetPath);
  if (!logPath || !fs.existsSync(logPath)) {
    console.log('No session log found');
    process.exit(0);
  }

  const content = fs.readFileSync(logPath, 'utf8');
  const signals = extractSignals(content, logPath);

  if (signals.length === 0) {
    console.log('No candidate signals found in ' + path.basename(logPath));
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(SIGNALS_PATH), { recursive: true });
  const lines = signals.map(s => JSON.stringify(s)).join('\n') + '\n';
  fs.appendFileSync(SIGNALS_PATH, lines);
  console.log('Found ' + signals.length + ' candidate signals in ' + path.basename(logPath));
}

try { main(); } catch (e) { console.error(e.message); }
