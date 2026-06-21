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

// Verification gate (C1): check for snapshot: commits and dirty unverified surfaces
// FAIL CLOSED: if verification modules can't load, block the push
var verificationLoaded = false;
try {
  var scanDirtyState = require('./verification-state').scanDirtyState;
  var getValidEvidence = require('./evidence-ledger').getValidEvidence;
  var resolveVerification = require('./verification-resolver').resolve;
  verificationLoaded = true;
} catch (_) {
  // Verification modules not available -- will fail closed below
}

if (verificationLoaded) {
  // Check for snapshot: commits on the branch
  var snapshotFound = false;
  try {
    var log = execSync('git log origin/HEAD..HEAD --oneline', {
      cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000
    });
    var snapshotCommits = log.split('\n')
      .filter(function(line) { return /^\w+\s+snapshot:/.test(line.trim()); });
    if (snapshotCommits.length > 0) snapshotFound = true;
  } catch (_) {
    // origin/HEAD failed -- try merge-base fallback
    try {
      var defaultBranch = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
        cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000
      }).trim().replace('refs/remotes/', '');
      var mergeBase = execSync('git merge-base ' + defaultBranch + ' HEAD', {
        cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000
      }).trim();
      var fallbackLog = execSync('git log ' + mergeBase + '..HEAD --oneline', {
        cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000
      });
      var fallbackSnapshots = fallbackLog.split('\n')
        .filter(function(line) { return /^\w+\s+snapshot:/.test(line.trim()); });
      if (fallbackSnapshots.length > 0) snapshotFound = true;
    } catch (_2) {
      // Both origin/HEAD and merge-base failed -- skip snapshot check for fresh repos
    }
  }

  if (snapshotFound) {
    process.stdout.write(JSON.stringify({
      systemMessage: 'PUSH BLOCKED: branch contains snapshot: commits that must be squashed before pushing.'
    }) + '\n');
    process.exit(0);
  }

  // Check dirty surfaces against verification resolver
  try {
    var state = scanDirtyState();
    if (state) {
      var currentFingerprints = {};
      var hasDirtyNonDoc = false;
      for (var surface in state.surfaces) {
        var info = state.surfaces[surface];
        currentFingerprints[surface] = info.fingerprint;
        if (info.dirty && surface !== 'docs') hasDirtyNonDoc = true;
      }

      if (hasDirtyNonDoc) {
        var validEvidence = getValidEvidence(currentFingerprints);
        var resolution = resolveVerification(currentFingerprints, validEvidence);
        if (!resolution.all_satisfied) {
          process.stdout.write(JSON.stringify({
            systemMessage: 'PUSH BLOCKED: ' + resolution.summary
          }) + '\n');
          process.exit(0);
        }
      }
    }
  } catch (e) {
    // Verification scan/resolve failed -- fail closed
    process.stdout.write(JSON.stringify({
      systemMessage: 'PUSH BLOCKED: verification scan failed -- ' + (e.message || 'unknown error')
    }) + '\n');
    process.exit(0);
  }
} else {
  // Verification modules not available -- fail closed (C1: push only after checks pass)
  process.stdout.write(JSON.stringify({
    systemMessage: 'PUSH BLOCKED: verification modules not available -- cannot verify push safety'
  }) + '\n');
  process.exit(0);
}

try {
  execSync('git push origin HEAD', { cwd: R.PROJECT_DIR, timeout: 60000, stdio: 'inherit' });
  process.exit(0);
} catch (e) {
  var msg = 'git push failed: ' + (e.message || String(e));
  process.stderr.write(msg + '\n');
  try {
    process.stdout.write(JSON.stringify({ systemMessage: 'git push failed -- check remote' }) + '\n');
  } catch (_) {}
  process.exit(1);
}
