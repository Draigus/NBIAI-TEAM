#!/usr/bin/env node
'use strict';
// apply-gate.js — Mechanical auto-apply gate for the RHO harness.
// Validates AND performs writes. The cadence prompt must use this script
// instead of writing directly — it is the only approved write path for
// LOW-risk auto-apply during the weekly routine.
//
// Calls risk-classify.js internally for deterministic risk classification.
// Only LOW-risk proposals with sufficient evidence pass through.
//
// Usage: <content> | node .claude/harness/lib/apply-gate.js <target_path> <operation> [evidence_json]
//   operation: create | append
//   evidence_json: optional JSON array of evidence events (for confidence check)
//   content: passed via stdin
// Exit 0 = write performed. Exit 1 = blocked (reason on stderr).

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const GOVERNED_PATHS = [
  '.claude/harness/config/',
  '.claude/harness/lib/',
  '.claude/harness/tests/',
  '.claude/settings.json',
  '.claude/settings.local.json'
];

const ALLOWED_OPERATIONS = ['create', 'append'];

function fail(reason) {
  process.stderr.write('APPLY_GATE_BLOCKED: ' + reason + '\n');
  process.exit(1);
}

function canonicalize(targetPath) {
  const resolved = path.resolve(PROJECT_DIR, targetPath);
  const normProject = PROJECT_DIR.replace(/\\/g, '/').replace(/\/$/, '');
  const normResolved = resolved.replace(/\\/g, '/');

  if (!normResolved.toLowerCase().startsWith(normProject.toLowerCase() + '/')) {
    return null;
  }

  return normResolved.slice(normProject.length + 1).replace(/\\/g, '/');
}

function main() {
  const targetPath = process.argv[2];
  const operation = process.argv[3];
  const evidenceArg = process.argv[4];

  if (!targetPath || !operation) {
    fail('Usage: <content> | apply-gate.js <target_path> <operation> [evidence_json]');
  }

  let content = '';
  try { content = fs.readFileSync(0, 'utf8'); } catch {}
  if (!content) {
    fail('no content provided on stdin');
  }

  const canonical = canonicalize(targetPath);
  if (canonical === null) {
    fail('target resolves outside project root');
  }

  // Block 1: governed paths are never auto-apply targets
  const canonicalLower = canonical.toLowerCase();
  for (const gov of GOVERNED_PATHS) {
    if (canonicalLower.startsWith(gov.toLowerCase()) || canonicalLower === gov.replace(/\/$/, '').toLowerCase()) {
      fail('target is under governed path ' + gov);
    }
  }

  // Block 2: only additive operations allowed
  if (!ALLOWED_OPERATIONS.includes(operation)) {
    fail('operation "' + operation + '" is not additive');
  }

  // Block 3: deterministic risk classification via risk-classify.js
  let evidence = [];
  if (evidenceArg) {
    try { evidence = JSON.parse(evidenceArg); } catch {
      fail('evidence_json is not valid JSON');
    }
  }

  const riskClassify = require('./risk-classify.js');
  const classification = riskClassify.classify({
    target_file: canonical,
    evidence: evidence
  });

  if (classification.risk !== 'LOW') {
    fail('risk classification is ' + classification.risk + ' (must be LOW for auto-apply) — ' + classification.reason);
  }

  // Block 4: operation-specific checks and write
  const fullPath = path.resolve(PROJECT_DIR, canonical);

  if (operation === 'create') {
    if (fs.existsSync(fullPath)) {
      fail('operation is "create" but target already exists');
    }
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  } else if (operation === 'append') {
    if (!fs.existsSync(fullPath)) {
      fail('operation is "append" but target does not exist');
    }
    fs.appendFileSync(fullPath, content);
  }

  process.stdout.write('APPLY_GATE_WRITE_OK: ' + canonical + ' (' + operation + ', ' + content.length + ' bytes, risk: LOW)\n');
  process.exit(0);
}

main();
