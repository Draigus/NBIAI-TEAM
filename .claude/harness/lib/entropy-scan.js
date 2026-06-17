#!/usr/bin/env node
'use strict';
// entropy-scan.js — Fast entropy scan on the last git commit's diff.
// Checks for code residue, test integrity weakening, file residue.
// Emits entropy_signal events via emit-event.js. Target: <15 seconds.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CHECKS_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'config', 'entropy-checks.json');
const EMIT_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'lib', 'emit-event.js');
const TREND_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'data', 'entropy_trend.jsonl');

function main() {
  let checks;
  try { checks = JSON.parse(fs.readFileSync(CHECKS_PATH, 'utf8')); }
  catch { return; }

  let diff;
  try {
    diff = execSync('git diff HEAD~1 HEAD', {
      cwd: PROJECT_DIR, encoding: 'utf8', timeout: 10000
    });
  } catch { return; }

  if (!diff || diff.length < 10) return;

  const lines = diff.split('\n');
  const addedLines = lines.filter(l => l.startsWith('+') && !l.startsWith('+++'));
  const removedLines = lines.filter(l => l.startsWith('-') && !l.startsWith('---'));
  const signals = [];

  // Code residue
  const fast = checks.fast_scan || {};
  for (const check of (fast.code_residue || [])) {
    const re = new RegExp(check.regex, check.flags || 'gm');
    const hits = addedLines.filter(l => { re.lastIndex = 0; return re.test(l); });
    if (hits.length > 0) {
      const sev = hits.length > (check.threshold || 3) ? (check.severity_many || 2) : (check.severity_one || 1);
      signals.push({
        category: 'code',
        severity: sev,
        detail: check.name + ': ' + hits.length + ' instances in added lines',
        scan_tier: 'fast'
      });
    }
  }

  // Test integrity
  const ti = fast.test_integrity || {};
  const testDiffSections = [];
  let inTestFile = false;
  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      inTestFile = /\.(test|spec)\.|\/tests\//.test(line);
    }
    if (inTestFile) testDiffSections.push(line);
  }

  if (testDiffSections.length > 0) {
    const weakened = ti.weakened_assertions
      ? testDiffSections.filter(l => l.startsWith('-') && new RegExp(ti.weakened_assertions).test(l))
      : [];
    const skips = ti.added_skips
      ? testDiffSections.filter(l => l.startsWith('+') && new RegExp(ti.added_skips).test(l))
      : [];
    if (weakened.length > 0 || skips.length > 0) {
      signals.push({
        category: 'test',
        severity: ti.severity || 3,
        detail: 'Test integrity: ' + weakened.length + ' assertions removed, ' + skips.length + ' skips added',
        scan_tier: 'fast'
      });
    }
  }

  // File residue
  const fr = fast.file_residue || {};
  const newFiles = lines
    .filter(l => l.startsWith('diff --git'))
    .map(l => { const m = l.match(/ b\/(.+)$/); return m ? m[1] : ''; })
    .filter(f => f && (fr.temp_patterns || []).some(p => new RegExp(p, 'i').test(path.basename(f))));
  if (newFiles.length > 0) {
    signals.push({
      category: 'file_residue',
      severity: fr.severity || 1,
      detail: 'Possible temp/debug files: ' + newFiles.join(', '),
      scan_tier: 'fast'
    });
  }

  // Dependency hygiene
  const dh = fast.dependency_hygiene || {};
  if (dh.new_require || dh.new_import) {
    const reqRe = dh.new_require ? new RegExp(dh.new_require, 'gm') : null;
    const impRe = dh.new_import ? new RegExp(dh.new_import, 'gm') : null;
    const reqHits = reqRe ? addedLines.filter(l => { reqRe.lastIndex = 0; return reqRe.test(l); }) : [];
    const impHits = impRe ? addedLines.filter(l => { impRe.lastIndex = 0; return impRe.test(l); }) : [];
    if (reqHits.length > 0 || impHits.length > 0) {
      signals.push({
        category: 'dependency',
        severity: dh.severity || 1,
        detail: 'New dependencies: ' + reqHits.length + ' require(), ' + impHits.length + ' import statements',
        scan_tier: 'fast'
      });
    }
  }

  // Emit signals via emit-event.js
  for (const sig of signals) {
    try {
      const payload = JSON.stringify(sig);
      execSync('node "' + EMIT_PATH + '" entropy_signal', {
        cwd: PROJECT_DIR,
        input: payload,
        encoding: 'utf8',
        timeout: 5000
      });
    } catch { /* don't break commit flow */ }
  }

  // Append to entropy trend
  if (signals.length > 0) {
    const score = signals.reduce((s, sig) => s + sig.severity, 0);
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      score: score,
      signal_count: signals.length,
      categories: [...new Set(signals.map(s => s.category))]
    });
    try {
      fs.mkdirSync(path.dirname(TREND_PATH), { recursive: true });
      fs.appendFileSync(TREND_PATH, entry + '\n');
    } catch {}
  }
}

try { main(); } catch { /* never break hook chain */ }
