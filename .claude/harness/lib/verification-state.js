#!/usr/bin/env node
'use strict';
// verification-state.js -- Tracks which code surfaces have unverified changes.
// Uses git diff and content fingerprints to detect dirty surfaces.
// Surfaces are defined in config/surface-map.json (glob patterns per category).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const R = require('./resolve');

// Module-level cache for surface map. Cleared when HARNESS_DIR changes (test isolation).
let _surfaceMap = null;
let _surfaceMapHarnessDir = null;

/**
 * Load surface-map.json from R.CONFIG_DIR. Cached per HARNESS_DIR value.
 * Returns object mapping surface name to array of glob patterns, or empty object on failure.
 */
function loadSurfaceMap() {
  if (_surfaceMap && _surfaceMapHarnessDir === R.HARNESS_DIR) return _surfaceMap;
  const mapPath = path.join(R.CONFIG_DIR, 'surface-map.json');
  try {
    _surfaceMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    _surfaceMapHarnessDir = R.HARNESS_DIR;
  } catch (_e) {
    _surfaceMap = {};
    _surfaceMapHarnessDir = R.HARNESS_DIR;
  }
  return _surfaceMap;
}

/**
 * Reset the cached surface map. Used for test isolation when env changes
 * but the module is not re-required.
 */
function resetCache() {
  _surfaceMap = null;
  _surfaceMapHarnessDir = null;
}

/**
 * Match a file path against a glob pattern.
 * Supported syntax:
 *   ** matches any path segments (including nested)
 *   *  matches anything except /
 *   Exact filenames match exactly
 *
 * @param {string} filePath - Forward-slash normalised file path
 * @param {string} pattern  - Glob pattern from surface-map.json
 * @returns {boolean}
 */
function globMatch(filePath, pattern) {
  // Normalise both to forward slashes for consistent matching
  const fp = filePath.replace(/\\/g, '/');
  const pat = pattern.replace(/\\/g, '/');

  // Convert glob pattern to regex
  let regex = '';
  let i = 0;
  while (i < pat.length) {
    if (pat[i] === '*' && pat[i + 1] === '*') {
      // ** matches any path segments
      if (pat[i + 2] === '/') {
        regex += '(?:.+/|)'; // match zero or more path segments
        i += 3;
      } else {
        regex += '.*'; // trailing ** matches everything
        i += 2;
      }
    } else if (pat[i] === '*') {
      regex += '[^/]*'; // * matches anything except /
      i++;
    } else if (pat[i] === '.') {
      regex += '\\.';
      i++;
    } else if (pat[i] === '?') {
      regex += '[^/]';
      i++;
    } else {
      regex += pat[i];
      i++;
    }
  }

  return new RegExp('^' + regex + '$', 'i').test(fp);
}

/**
 * Compute the specificity of a glob pattern for longest-prefix-wins tie-breaking.
 * More literal (non-wildcard) path segments = higher specificity.
 * Exact filenames (no wildcards at all) get the highest score.
 *
 * @param {string} pattern - Glob pattern
 * @returns {number} Specificity score (higher = more specific)
 */
function patternSpecificity(pattern) {
  const pat = pattern.replace(/\\/g, '/');
  // Count literal path segments (those without * or ?)
  const segments = pat.split('/');
  let score = 0;
  for (const seg of segments) {
    if (seg.includes('*') || seg.includes('?')) {
      score += 1; // wildcard segment gets partial credit
    } else {
      score += 10; // literal segment gets full credit
    }
  }
  // Exact filenames (no wildcards at all) get a bonus
  if (!pat.includes('*') && !pat.includes('?')) {
    score += 100;
  }
  return score;
}

/**
 * Classify a file path into its surface category.
 * Uses longest-prefix-wins for files matching multiple surfaces.
 *
 * @param {string} filePath - File path relative to project root
 * @returns {string|null} Surface name or null if unclassified
 */
function classifySurface(filePath) {
  const map = loadSurfaceMap();
  const fp = filePath.replace(/\\/g, '/');

  let bestSurface = null;
  let bestSpecificity = -1;

  for (const [surface, patterns] of Object.entries(map)) {
    for (const pattern of patterns) {
      if (globMatch(fp, pattern)) {
        const spec = patternSpecificity(pattern);
        if (spec > bestSpecificity) {
          bestSpecificity = spec;
          bestSurface = surface;
        }
      }
    }
  }

  return bestSurface;
}

/**
 * Run a git command in the project directory.
 * Returns trimmed stdout or empty string on failure.
 *
 * @param {string} cmd - Git command arguments (without 'git' prefix)
 * @returns {string}
 */
function git(cmd) {
  try {
    return execSync('git ' + cmd, {
      cwd: R.PROJECT_DIR,
      encoding: 'utf8',
      timeout: 10000,
    }).trim();
  } catch (_e) {
    return '';
  }
}

/**
 * Compute a fingerprint for a set of files using their git blob hashes.
 * Files are sorted before hashing for order-independence.
 *
 * @param {string[]} files - Array of file paths relative to project root
 * @returns {string|null} SHA-256 hex digest, or null if files array is empty
 */
function computeFingerprint(files) {
  if (!files || files.length === 0) return null;

  const pairs = [];
  for (const file of files) {
    let blobHash;
    try {
      blobHash = execSync('git hash-object ' + JSON.stringify(file), {
        cwd: R.PROJECT_DIR,
        encoding: 'utf8',
        timeout: 10000,
      }).trim();
    } catch (_e) {
      // File might not exist or git might fail -- use a placeholder
      blobHash = 'untracked';
    }
    pairs.push(file.replace(/\\/g, '/') + ':' + blobHash);
  }

  pairs.sort();
  return crypto.createHash('sha256').update(pairs.join('\n')).digest('hex');
}

/**
 * Scan the current git state and classify all changed files into surfaces.
 * Writes verification_state.json to PROJECT_DATA_DIR.
 *
 * @returns {object} State object with surfaces and scan_head
 */
function scanDirtyState() {
  // Gather all changed files from three git sources
  const modified = git('diff --name-only');
  const staged = git('diff --cached --name-only');
  const untracked = git('ls-files --others --exclude-standard');

  // Combine and deduplicate
  const allFiles = new Set();
  for (const output of [modified, staged, untracked]) {
    if (output) {
      for (const line of output.split('\n')) {
        const trimmed = line.trim();
        if (trimmed) allFiles.add(trimmed);
      }
    }
  }

  // Get all known surfaces from the map
  const map = loadSurfaceMap();
  const surfaceNames = Object.keys(map);

  // Classify files into surfaces
  const surfaceFiles = {};
  for (const name of surfaceNames) {
    surfaceFiles[name] = [];
  }

  for (const file of allFiles) {
    const surface = classifySurface(file);
    if (surface && surfaceFiles[surface]) {
      surfaceFiles[surface].push(file);
    }
    // Unclassified files are silently skipped -- they don't belong to any surface
  }

  // Build the state object
  const surfaces = {};
  for (const name of surfaceNames) {
    const files = surfaceFiles[name].sort();
    surfaces[name] = {
      dirty: files.length > 0,
      files: files,
      fingerprint: files.length > 0 ? computeFingerprint(files) : null,
    };
  }

  // Get current HEAD
  const scanHead = git('rev-parse --short HEAD') || 'unknown';

  const state = { surfaces, scan_head: scanHead };

  // Ensure data directory exists and write state
  fs.mkdirSync(R.PROJECT_DATA_DIR, { recursive: true });
  const statePath = path.join(R.PROJECT_DATA_DIR, 'verification_state.json');
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return state;
}

/**
 * Read the cached verification state from disk.
 *
 * @returns {object|null} Parsed state object, or null if no state file exists
 */
function readState() {
  const statePath = path.join(R.PROJECT_DATA_DIR, 'verification_state.json');
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (_e) {
    return null;
  }
}

module.exports = {
  classifySurface,
  computeFingerprint,
  scanDirtyState,
  readState,
  // Exposed for testing only
  _resetCache: resetCache,
  _globMatch: globMatch,
  _patternSpecificity: patternSpecificity,
};
