#!/usr/bin/env node
'use strict';
// deploy.js -- Deploys harness from repo source to global ~/.claude/harness/.
// Copies lib/, config/, and tests/. Data and proposals are NOT deployed
// (those are runtime state).
// Usage: node .claude/harness/deploy.js

const fs = require('fs');
const path = require('path');
const os = require('os');

const SRC = path.resolve(__dirname);
const DST = path.join(os.homedir(), '.claude', 'harness');

const DEPLOY_DIRS = ['lib', 'config', 'tests'];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dst) {
  ensureDir(dst);
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const dstPath = path.join(dst, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

// Create global structure
ensureDir(path.join(DST, 'data'));
ensureDir(path.join(DST, 'proposals'));

// Deploy lib, config, and tests (clean destination first to prune stale files)
for (const dir of DEPLOY_DIRS) {
  const srcDir = path.join(SRC, dir);
  const dstDir = path.join(DST, dir);
  if (fs.existsSync(srcDir)) {
    if (fs.existsSync(dstDir)) fs.rmSync(dstDir, { recursive: true, force: true });
    copyDir(srcDir, dstDir);
    console.log('Deployed ' + dir + '/ (' + fs.readdirSync(dstDir).length + ' files)');
  }
}

// Copy changelog if present
const cl = path.join(SRC, 'changelog.md');
if (fs.existsSync(cl)) {
  fs.copyFileSync(cl, path.join(DST, 'changelog.md'));
  console.log('Deployed changelog.md');
}

console.log('Global harness deployed to ' + DST);
