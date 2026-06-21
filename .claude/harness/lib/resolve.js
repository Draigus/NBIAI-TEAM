#!/usr/bin/env node
'use strict';
// resolve.js -- Shared path resolution for global harness modules.
// All lib modules require this for HARNESS_DIR, PROJECT_DIR, PROJECT_SLUG, etc.
// HARNESS_DIR: overridable via env for test isolation.
// PROJECT_SLUG: collision-resistant (basename + short hash of resolved absolute path).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HARNESS_DIR = process.env.HARNESS_DIR || path.resolve(__dirname, '..');

// Data always lives in the global harness (hooks write there), even when
// lib is loaded from a project source checkout. Tests override via HARNESS_DIR env.
const os = require('os');
const GLOBAL_HARNESS = path.join(os.homedir(), '.claude', 'harness');
const DATA_ROOT = !process.env.HARNESS_DIR && fs.existsSync(path.join(GLOBAL_HARNESS, 'data'))
  ? GLOBAL_HARNESS : HARNESS_DIR;
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const resolved = path.resolve(PROJECT_DIR);
const base = path.basename(resolved).replace(/[^a-zA-Z0-9_-]/g, '_') || 'root';
const hash = crypto.createHash('md5')
  .update(resolved.replace(/\\/g, '/').toLowerCase())
  .digest('hex').slice(0, 6);
const PROJECT_SLUG = base + '_' + hash;

const DATA_DIR = path.join(DATA_ROOT, 'data');
const PROJECT_DATA_DIR = path.join(DATA_DIR, PROJECT_SLUG);
const EVENTS_DIR = path.join(PROJECT_DATA_DIR, 'events');
const CONFIG_DIR = path.join(HARNESS_DIR, 'config');
const LOCKS_DIR = path.join(DATA_DIR, '.locks');
const PROPOSALS_DIR = path.join(HARNESS_DIR, 'proposals');

module.exports = {
  HARNESS_DIR,
  PROJECT_DIR,
  PROJECT_SLUG,
  DATA_DIR,
  PROJECT_DATA_DIR,
  EVENTS_DIR,
  CONFIG_DIR,
  LOCKS_DIR,
  PROPOSALS_DIR,
};
