#!/usr/bin/env node
'use strict';
// git-push.js — PostToolUse hook that pushes to origin after git commit.
// Surfaces failures via JSON systemMessage so the hook framework can inform the user.
// Hook commands run with cwd = project root (set by Claude Code hook engine).

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR
  || path.resolve(__dirname, '..', '..', '..');

try {
  execSync('git push origin', { cwd: PROJECT_DIR, timeout: 60000, stdio: 'inherit' });
  process.exit(0);
} catch (e) {
  const msg = 'git push failed — check remote: ' + (e.message || String(e));
  process.stderr.write(msg + '\n');
  try {
    process.stdout.write(JSON.stringify({ systemMessage: 'git push failed — check remote' }) + '\n');
  } catch (_) { /* stdout write failed, nothing we can do */ }
  process.exit(1);
}
