#!/usr/bin/env node
'use strict';
// git-push.js -- PostToolUse async hook (fires after git commit).
// Attempts auto-push to origin. Gates:
//   A. Snapshot commits block push
//   B. Pushed surfaces with dirty unverified working-tree files block push
//
// Policy is aligned with verification-gate.js gatePush (PreToolUse):
// both scope to pushed surfaces and check dirty fingerprint evidence.
// Clean pushed surfaces pass -- the commit gate is primary enforcement.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const R = require('./resolve');

// Safety: only push if project has remote 'origin'
try {
  const remotes = execSync('git remote', { cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000 });
  if (!remotes.split('\n').map(r => r.trim()).includes('origin')) {
    process.exit(0);
  }
} catch { process.exit(0); }

var verificationLoaded = false;
try {
  var scanDirtyState = require('./verification-state').scanDirtyState;
  var classifySurface = require('./verification-state').classifySurface;
  var getValidEvidence = require('./evidence-ledger').getValidEvidence;
  var resolveVerification = require('./verification-resolver').resolve;
  verificationLoaded = true;
} catch (_) {}

if (verificationLoaded) {
  // Gate A: snapshot commits -- fail closed on comparison failure
  var snapshotFound = false;
  var snapshotCheckFailed = false;
  try {
    var log = execSync('git log origin/HEAD..HEAD --oneline', {
      cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000
    });
    var snapshotCommits = log.split('\n')
      .filter(function(line) { return /^\w+\s+snapshot:/.test(line.trim()); });
    if (snapshotCommits.length > 0) snapshotFound = true;
  } catch (_) {
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
      snapshotCheckFailed = true;
    }
  }

  if (snapshotFound) {
    process.stdout.write(JSON.stringify({
      systemMessage: 'PUSH BLOCKED: branch contains snapshot: commits that must be squashed before pushing.'
    }) + '\n');
    process.exit(0);
  }

  if (snapshotCheckFailed) {
    process.stdout.write(JSON.stringify({
      systemMessage: 'PUSH BLOCKED: cannot determine snapshot status -- failing closed.'
    }) + '\n');
    process.exit(0);
  }

  // Gate B: pushed surfaces verification (aligned with verification-gate.js)
  try {
    var pushedFiles = null;
    try {
      pushedFiles = execSync('git diff --name-only origin/HEAD..HEAD', {
        cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000
      });
    } catch (_) {
      try {
        var db = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
          cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000
        }).trim().replace('refs/remotes/', '');
        var mb = execSync('git merge-base ' + db + ' HEAD', {
          cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000
        }).trim();
        pushedFiles = execSync('git diff --name-only ' + mb + '..HEAD', {
          cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000
        });
      } catch (_2) { /* stays null */ }
    }

    if (pushedFiles === null) {
      process.stdout.write(JSON.stringify({
        systemMessage: 'PUSH BLOCKED: cannot determine pushed files -- failing closed.'
      }) + '\n');
      process.exit(0);
    }

    var pushedSurfaces = {};
    pushedFiles.split('\n').filter(Boolean).forEach(function(f) {
      var s = classifySurface(f.trim());
      if (s) pushedSurfaces[s] = true;
    });

    var state = scanDirtyState();
    if (state) {
      var currentFingerprints = {};
      for (var surface in state.surfaces) {
        currentFingerprints[surface] = state.surfaces[surface].fingerprint;
      }

      // Only check pushed surfaces that are dirty in working tree
      var hasDirtyPushed = false;
      for (var surf in pushedSurfaces) {
        var info = state.surfaces[surf];
        if (info && info.dirty && surf !== 'docs') {
          hasDirtyPushed = true;
          break;
        }
      }

      if (hasDirtyPushed) {
        var validEvidence = getValidEvidence(currentFingerprints);
        var resolution = resolveVerification(currentFingerprints, validEvidence);

        var blockedDetails = [];
        for (var s in resolution.surfaces) {
          if (!pushedSurfaces[s]) continue;
          var sInfo = resolution.surfaces[s];
          if (sInfo.missing && sInfo.missing.length > 0) {
            blockedDetails.push(s + ': ' + sInfo.missing.join(', '));
          }
        }

        if (blockedDetails.length > 0) {
          process.stdout.write(JSON.stringify({
            systemMessage: 'PUSH BLOCKED: ' + blockedDetails.join('; ') + '.'
          }) + '\n');
          process.exit(0);
        }
      }
    }
  } catch (e) {
    process.stdout.write(JSON.stringify({
      systemMessage: 'PUSH BLOCKED: verification scan failed -- ' + (e.message || 'unknown error')
    }) + '\n');
    process.exit(0);
  }
} else {
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
