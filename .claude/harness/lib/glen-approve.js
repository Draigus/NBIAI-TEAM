#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const R = require('./resolve');

if (!process.stdin.isTTY) {
  process.stderr.write('ERROR: glen-approve.js requires an interactive terminal.\n');
  process.stderr.write('This script must be run directly by Glen, not through Claude Code.\n');
  process.exit(1);
}

const VALID_SURFACES = [
  'server', 'frontend', 'tests', 'migrations', 'config',
  'client_deliverables', 'intelligence', 'harness'
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('\n=== Glen Approval Token Creator ===\n');
  console.log('Available surfaces: ' + VALID_SURFACES.join(', '));
  console.log('');

  const surfaceInput = await ask('Surfaces to approve (comma-separated, or "all"): ');
  let surfaces;
  if (surfaceInput.trim().toLowerCase() === 'all') {
    surfaces = [...VALID_SURFACES];
  } else {
    surfaces = surfaceInput.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const invalid = surfaces.filter(s => !VALID_SURFACES.includes(s));
    if (invalid.length > 0) {
      console.error('Invalid surfaces: ' + invalid.join(', '));
      rl.close();
      process.exit(1);
    }
    if (surfaces.length === 0) {
      console.error('No surfaces specified.');
      rl.close();
      process.exit(1);
    }
  }

  const reason = await ask('Reason for approval: ');
  if (!reason.trim()) {
    console.error('Reason is required.');
    rl.close();
    process.exit(1);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

  const token = {
    approved_at: now.toISOString(),
    surfaces: surfaces,
    expires_at: expiresAt.toISOString(),
    reason: reason.trim()
  };

  const tokenPath = path.join(R.PROJECT_DATA_DIR, 'glen_approval.json');
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2) + '\n');

  console.log('\nApproval token created:');
  console.log('  Surfaces: ' + surfaces.join(', '));
  console.log('  Expires: ' + expiresAt.toISOString() + ' (30 minutes)');
  console.log('  Path: ' + tokenPath);
  console.log('\nThe next verified commit will consume this token.');

  rl.close();
}

main().catch(err => {
  console.error('Error: ' + err.message);
  rl.close();
  process.exit(1);
});
