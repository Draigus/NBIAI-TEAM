#!/usr/bin/env node
// write-bank-verified.js — writes a verification artifact for a bank.
// Usage: node scripts/write-bank-verified.js <slug> [verdict] [notes]
//
// Creates intelligence/banks/.verified/{slug}.json with timestamp.
// The bank-verify-gate.js hook checks these artifacts before allowing
// commits that touch intelligence/banks/*.md.

const fs = require('fs');
const path = require('path');

const slug = process.argv[2];
const verdict = process.argv[3] || 'PASS';
const notes = process.argv[4] || '';

if (!slug) {
  console.error('Usage: node scripts/write-bank-verified.js <slug> [verdict] [notes]');
  process.exit(1);
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const verifiedDir = path.join(projectDir, 'intelligence', 'banks', '.verified');

if (!fs.existsSync(verifiedDir)) {
  fs.mkdirSync(verifiedDir, { recursive: true });
}

const artifact = {
  slug,
  verified_at: new Date().toISOString(),
  verdict,
  notes,
  checks: ['source_tag_validity', 'factual_spot_check', 'anonymisation_compliance']
};

const artifactPath = path.join(verifiedDir, `${slug}.json`);
fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2) + '\n');
console.log(`Wrote verification artifact: ${artifactPath}`);
