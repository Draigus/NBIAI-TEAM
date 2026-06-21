#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const R = require('./resolve');

const LEDGER_FILE = path.join(R.PROJECT_DATA_DIR, 'evidence_ledger.jsonl');
const RETENTION_DAYS = 7;

/**
 * Generate a unique evidence ID: EV-YYYYMMDD-HHMMSS-{type}
 */
function generateEvidenceId(type) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const h = String(now.getUTCHours()).padStart(2, '0');
  const mi = String(now.getUTCMinutes()).padStart(2, '0');
  const s = String(now.getUTCSeconds()).padStart(2, '0');
  const ms = String(now.getUTCMilliseconds()).padStart(3, '0');
  return 'EV-' + y + mo + d + '-' + h + mi + s + ms + '-' + type;
}

/**
 * Read git HEAD short hash, defaulting to 'unknown'.
 */
function getGitHead() {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000
    }).trim();
  } catch (_) {
    return 'unknown';
  }
}

/**
 * Read current git branch, defaulting to 'unknown'.
 */
function getGitBranch() {
  try {
    return execSync('git branch --show-current', {
      cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000
    }).trim();
  } catch (_) {
    return 'unknown';
  }
}

/**
 * Read session ID from .session_id file, defaulting to 'unknown'.
 */
function getSessionId() {
  try {
    return fs.readFileSync(
      path.join(R.PROJECT_DATA_DIR, '.session_id'), 'utf8'
    ).trim();
  } catch (_) {
    return 'unknown';
  }
}

/**
 * Record a verification evidence entry.
 *
 * @param {string} type - Evidence type (e.g. 'unit_test', 'e2e', 'browser_check')
 * @param {string|object} command - Command string or {raw, resolved, cwd} object
 * @param {number} exitCode - Process exit code
 * @param {string} resultSummary - Human-readable result summary
 * @param {object} surfaceFingerprints - Map of surface name to fingerprint hash
 */
function recordEvidence(type, command, exitCode, resultSummary, surfaceFingerprints) {
  fs.mkdirSync(R.PROJECT_DATA_DIR, { recursive: true });

  var cmd;
  if (typeof command === 'string') {
    cmd = { raw: command, resolved: command, cwd: R.PROJECT_DIR };
  } else {
    cmd = {
      raw: command.raw || '',
      resolved: command.resolved || command.raw || '',
      cwd: command.cwd || R.PROJECT_DIR
    };
  }

  var record = {
    id: generateEvidenceId(type),
    ts: new Date().toISOString(),
    type: type,
    command: cmd,
    exit_code: exitCode,
    git_head: getGitHead(),
    branch: getGitBranch(),
    surface_fingerprints: surfaceFingerprints || {},
    surfaces_covered: Object.keys(surfaceFingerprints || {}),
    result_summary: resultSummary,
    session_id: getSessionId()
  };

  fs.appendFileSync(LEDGER_FILE, JSON.stringify(record) + '\n');
  return record;
}

/**
 * Record browser-based verification evidence.
 *
 * @param {string} url - URL navigated to
 * @param {string} action - Action performed (e.g. 'navigate + snapshot')
 * @param {number} consoleErrors - Count of JS console errors
 * @param {string} assertion - Human-readable assertion
 * @param {object} surfaceFingerprints - Map of surface name to fingerprint hash
 */
function recordBrowserEvidence(url, action, consoleErrors, assertion, surfaceFingerprints) {
  fs.mkdirSync(R.PROJECT_DATA_DIR, { recursive: true });

  var record = {
    id: generateEvidenceId('browser_check'),
    ts: new Date().toISOString(),
    type: 'browser_check',
    command: { raw: 'browser', resolved: 'browser', cwd: R.PROJECT_DIR },
    exit_code: consoleErrors > 0 ? 1 : 0,
    git_head: getGitHead(),
    branch: getGitBranch(),
    surface_fingerprints: surfaceFingerprints || {},
    surfaces_covered: Object.keys(surfaceFingerprints || {}),
    result_summary: assertion,
    session_id: getSessionId(),
    browser_evidence: {
      url: url,
      action: action,
      console_errors: consoleErrors,
      assertion: assertion
    }
  };

  fs.appendFileSync(LEDGER_FILE, JSON.stringify(record) + '\n');
  return record;
}

/**
 * Read ledger file, parse each line, apply 7-day retention window.
 * Returns array of record objects. Returns [] if file does not exist.
 */
function readLedger() {
  if (!fs.existsSync(LEDGER_FILE)) return [];

  var cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  var content = fs.readFileSync(LEDGER_FILE, 'utf8').trim();
  if (!content) return [];

  var records = [];
  var lines = content.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    try {
      var rec = JSON.parse(line);
      if (rec.ts && new Date(rec.ts) >= cutoff) {
        records.push(rec);
      }
    } catch (_) {
      // skip malformed lines
    }
  }
  return records;
}

/**
 * Get evidence entries that are still valid against current surface fingerprints.
 * An entry is valid if exit_code === 0 AND at least one surface fingerprint matches.
 *
 * @param {object} currentFingerprints - Map of surface name to current fingerprint hash
 * @returns {Array} Filtered array of valid evidence records
 */
function getValidEvidence(currentFingerprints) {
  var all = readLedger();
  if (!currentFingerprints || Object.keys(currentFingerprints).length === 0) return [];

  return all.filter(function(rec) {
    if (rec.exit_code !== 0) return false;
    if (!rec.surfaces_covered || !rec.surface_fingerprints) return false;

    for (var j = 0; j < rec.surfaces_covered.length; j++) {
      var surface = rec.surfaces_covered[j];
      if (rec.surface_fingerprints[surface] === currentFingerprints[surface]) {
        return true;
      }
    }
    return false;
  });
}

module.exports = {
  generateEvidenceId,
  recordEvidence,
  recordBrowserEvidence,
  readLedger,
  getValidEvidence
};
