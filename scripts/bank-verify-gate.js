#!/usr/bin/env node
// bank-verify-gate.js — PreToolUse hook for git commit
// Blocks commits that include intelligence/banks/*.md files unless a
// corresponding verification artifact exists at
// intelligence/banks/.verified/{slug}.json with a timestamp < 24h old.
//
// The verification artifact is written by write-bank-verified.js after
// an adversarial verification pass reads the bank and checks source tags,
// factual accuracy, and anonymisation/sensitivity compliance.
//
// Bypass: if the commit message contains "[skip-bank-verify]" the gate
// passes. This exists for cadence runs doing incremental compiles
// (threshold-gated, small changes) — but it must be used deliberately.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// The hook framework passes tool input via stdin as JSON.
// Read it, but if stdin is empty or unparseable, fall back to checking
// $ARGUMENTS env var, then just check staged files unconditionally
// (worst case: we check on every Bash/PowerShell call, which is cheap).
let command = '';
try {
  const chunks = [];
  const fd = fs.openSync(0, 'r');
  const buf = Buffer.alloc(4096);
  let n;
  while ((n = fs.readSync(fd, buf)) > 0) chunks.push(buf.slice(0, n));
  fs.closeSync(fd);
  const input = Buffer.concat(chunks).toString('utf8');
  if (input) {
    const parsed = JSON.parse(input);
    command = (parsed.tool_input || parsed).command || '';
  }
} catch {}

if (!command) {
  command = process.env.ARGUMENTS || '';
}

// Only gate on git commit commands — exit silently for anything else
if (!command.includes('git commit')) {
  process.exit(0);
}

if (command.includes('[skip-bank-verify]')) {
  process.exit(0);
}

let staged = '';
try {
  staged = execSync('git diff --cached --name-only', {
    cwd: projectDir,
    encoding: 'utf8',
    timeout: 5000
  });
} catch {
  process.exit(0);
}

const bankFiles = staged.split('\n')
  .filter(f => f.match(/^intelligence\/banks\/[^/]+\.md$/))
  .map(f => path.basename(f, '.md'));

if (bankFiles.length === 0) {
  process.exit(0);
}

const verifiedDir = path.join(projectDir, 'intelligence', 'banks', '.verified');
const maxAge = 24 * 60 * 60 * 1000;
const now = Date.now();
const missing = [];

for (const slug of bankFiles) {
  const artifactPath = path.join(verifiedDir, `${slug}.json`);
  if (!fs.existsSync(artifactPath)) {
    missing.push(slug);
    continue;
  }
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const ts = new Date(artifact.verified_at).getTime();
    if (now - ts > maxAge) {
      missing.push(`${slug} (artifact expired: ${artifact.verified_at})`);
    }
  } catch {
    missing.push(`${slug} (artifact unreadable)`);
  }
}

if (missing.length > 0) {
  const msg = `BANK VERIFICATION GATE: ${missing.length} bank(s) staged without verification:\n` +
    missing.map(m => `  - ${m}`).join('\n') +
    '\n\nFix: run adversarial verification, then: node scripts/write-bank-verified.js <slug>\n' +
    'Bypass (cadence incremental only): include [skip-bank-verify] in commit message.';
  console.log(JSON.stringify({ decision: 'block', reason: msg }));
} else {
  process.exit(0);
}
