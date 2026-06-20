#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const R = require('./resolve');

// Safety: only push if project has remote 'origin'
try {
  const remotes = execSync('git remote', { cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000 });
  if (!remotes.split('\n').map(r => r.trim()).includes('origin')) {
    process.exit(0);
  }
} catch { process.exit(0); }

try {
  execSync('git push origin HEAD', { cwd: R.PROJECT_DIR, timeout: 60000, stdio: 'inherit' });
  process.exit(0);
} catch (e) {
  const msg = 'git push failed: ' + (e.message || String(e));
  process.stderr.write(msg + '\n');
  try {
    process.stdout.write(JSON.stringify({ systemMessage: 'git push failed -- check remote' }) + '\n');
  } catch (_) {}
  process.exit(1);
}
