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
const DEDUP_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'data', '.entropy_dedup.json');
const DEDUP_TTL_MS = 4 * 60 * 60 * 1000;

function loadDedup() {
  try {
    var data = JSON.parse(fs.readFileSync(DEDUP_PATH, 'utf8'));
    if (data.ts && (Date.now() - new Date(data.ts).getTime()) > DEDUP_TTL_MS) return {};
    return data.seen || {};
  } catch { return {}; }
}

function saveDedup(seen) {
  try {
    fs.mkdirSync(path.dirname(DEDUP_PATH), { recursive: true });
    fs.writeFileSync(DEDUP_PATH, JSON.stringify({ ts: new Date().toISOString(), seen: seen }));
  } catch { /* non-critical */ }
}

function dedupKey(sig) { return sig.category + ':' + sig.detail; }

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

  // New-file cross-reference (S9)
  const EXCLUDED_NEW = /\.(gitkeep|gitignore|env\.example)$|(^|\/)fixtures\/|(^|\/)test-data\//i;
  try {
    const nameStatus = execSync('git diff --find-renames --name-status HEAD~1 HEAD', {
      cwd: PROJECT_DIR, encoding: 'utf8', timeout: 5000
    });
    const newFilePaths = nameStatus.split('\n')
      .filter(l => /^A\t/.test(l))
      .map(l => l.replace(/^A\t/, '').trim())
      .filter(f => f && !EXCLUDED_NEW.test(f));

    if (newFilePaths.length > 0) {
      // Build per-file added-lines map from the diff for cross-reference
      const diffSections = diff.split(/^diff --git /m).slice(1);
      const addedByFile = {};
      for (const sec of diffSections) {
        const fileMatch = sec.match(/ b\/(.+)$/m);
        if (!fileMatch) continue;
        const fp = fileMatch[1];
        addedByFile[fp] = sec.split('\n')
          .filter(l => l.startsWith('+') && !l.startsWith('+++'))
          .join('\n');
      }

      for (const nf of newFilePaths) {
        const basename = path.basename(nf);
        const esc = basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const refRe = new RegExp(esc + '(?![.\\w])', 'i');
        const referenced = Object.keys(addedByFile).some(cf => {
          if (cf === nf) return false;
          const added = addedByFile[cf];
          return added && (refRe.test(added) || added.includes(nf));
        });

        signals.push({
          category: 'file_residue',
          severity: referenced ? 1 : 2,
          detail: (referenced ? 'new_dependency_introduced' : 'new_unreferenced_file') + ': ' + nf,
          scan_tier: 'fast'
        });
      }
    }
  } catch { /* git command failed, skip */ }

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

  // Session-level deduplication (P004)
  var seen = loadDedup();
  var newSignals = signals.filter(function(sig) { return !seen[dedupKey(sig)]; });

  for (var ei = 0; ei < newSignals.length; ei++) {
    var sig = newSignals[ei];
    try {
      var payload = JSON.stringify(sig);
      execSync('node "' + EMIT_PATH + '" entropy_signal', {
        cwd: PROJECT_DIR,
        input: payload,
        encoding: 'utf8',
        timeout: 5000
      });
    } catch { /* don't break commit flow */ }
    seen[dedupKey(sig)] = true;
  }
  if (newSignals.length > 0) saveDedup(seen);

  // Append to entropy trend. Zero-score entries written only once per day to avoid spam.
  var score = newSignals.reduce(function(s, sig) { return s + sig.severity; }, 0);
  var writeEntry = true;
  if (score === 0) {
    try {
      var existing = fs.readFileSync(TREND_PATH, 'utf8');
      var today = new Date().toISOString().slice(0, 10);
      var trendLines = existing.split('\n').filter(Boolean);
      for (var zi = trendLines.length - 1; zi >= 0; zi--) {
        try {
          var prev = JSON.parse(trendLines[zi]);
          if ((prev.ts || '').startsWith(today) && prev.score === 0) { writeEntry = false; break; }
          if (!(prev.ts || '').startsWith(today)) break;
        } catch { break; }
      }
    } catch { /* file doesn't exist yet, write it */ }
  }
  if (writeEntry) {
    var entry = JSON.stringify({
      ts: new Date().toISOString(),
      score: score,
      signal_count: newSignals.length,
      categories: newSignals.length > 0 ? [...new Set(newSignals.map(function(s) { return s.category; }))] : []
    });
    try {
      fs.mkdirSync(path.dirname(TREND_PATH), { recursive: true });
      fs.appendFileSync(TREND_PATH, entry + '\n');
    } catch {}
  }
}

// --- Slow scan (weekly diagnosis, invoked via --slow) ---

function slowScan() {
  var signals = [];

  // 1. Architecture consistency: check for files outside expected directories
  try {
    var recent = execSync('git log --name-only --diff-filter=A --pretty=format: -20', {
      cwd: PROJECT_DIR, encoding: 'utf8', timeout: 10000
    }).split('\n').filter(Boolean);
    var expectedPatterns = [
      { re: /^dashboard-server\/routes\//, desc: 'route file' },
      { re: /^dashboard-server\/lib\//, desc: 'lib module' },
      { re: /^dashboard-server\/tests\//, desc: 'test file' },
      { re: /^\.claude\/harness\//, desc: 'harness file' }
    ];
    for (var i = 0; i < recent.length; i++) {
      var f = recent[i];
      if (!/\.(js|mjs)$/.test(f)) continue;
      var matched = expectedPatterns.some(function(p) { return p.re.test(f); });
      if (!matched && !f.includes('scripts/') && !f.includes('public/js/')) {
        signals.push({ category: 'architecture', severity: 1,
          detail: 'new JS file outside expected directories: ' + f, scan_tier: 'slow' });
      }
    }
  } catch { /* git command failed */ }

  // 2. Documentation drift: modified JS files without corresponding tests
  try {
    var modified = execSync('git log --name-only --diff-filter=M --pretty=format: -20', {
      cwd: PROJECT_DIR, encoding: 'utf8', timeout: 10000
    }).split('\n').filter(Boolean);
    for (var j = 0; j < modified.length; j++) {
      var mf = modified[j];
      if (!/dashboard-server\/(routes|lib)\/.*\.js$/.test(mf)) continue;
      var testName = path.basename(mf).replace('.js', '.test.js');
      var testExists = false;
      try {
        var testSearch = execSync('git ls-files "**/tests/' + testName + '" "**/tests/**/' + testName + '"', {
          cwd: PROJECT_DIR, encoding: 'utf8', timeout: 5000
        });
        testExists = testSearch.trim().length > 0;
      } catch { /* ignore */ }
      if (!testExists) {
        signals.push({ category: 'documentation', severity: 1,
          detail: 'modified file has no test: ' + mf, scan_tier: 'slow' });
      }
    }
  } catch { /* git failed */ }

  // 3. Workflow state: check session logs are current
  try {
    var today = new Date().toISOString().slice(0, 10);
    var sessionDir = path.join(PROJECT_DIR, 'projects', 'nbi_dashboard', 'session_logs');
    if (fs.existsSync(sessionDir)) {
      var logs = fs.readdirSync(sessionDir).filter(function(f) { return f.startsWith(today); });
      if (logs.length === 0) {
        signals.push({ category: 'workflow', severity: 2,
          detail: 'no session log for today (' + today + ')', scan_tier: 'slow' });
      }
    }
  } catch { /* ignore */ }

  // Output results as JSON (for cadence prompt consumption)
  process.stdout.write(JSON.stringify({ signals: signals, scan_tier: 'slow' }) + '\n');
  return signals;
}

// --- CLI entrypoint ---
if (require.main === module) {
  if (process.argv.includes('--slow')) {
    try { slowScan(); } catch { /* never crash */ }
  } else {
    try { main(); } catch { /* never break hook chain */ }
  }
}

module.exports = { main: main, slowScan: slowScan, loadDedup: loadDedup, saveDedup: saveDedup, dedupKey: dedupKey };
