#!/usr/bin/env node
'use strict';
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
  var loadRequirements = require('./verification-resolver').loadRequirements;
  verificationLoaded = true;
} catch (_) {}

if (verificationLoaded) {
  // Gate A: snapshot commits
  var snapshotFound = false;
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
    } catch (_2) {}
  }

  if (snapshotFound) {
    process.stdout.write(JSON.stringify({
      systemMessage: 'PUSH BLOCKED: branch contains snapshot: commits that must be squashed before pushing.'
    }) + '\n');
    process.exit(0);
  }

  // Gate B: verification of pushed surfaces
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
      } catch (_2) { /* pushedFiles stays null */ }
    }

    // Finding 2 fix: fail closed when pushed surfaces can't be determined
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
      var requirements = loadRequirements();

      for (var surface in state.surfaces) {
        var info = state.surfaces[surface];
        currentFingerprints[surface] = info.fingerprint;
      }

      // Check each pushed surface that has verification requirements
      var blocked = [];
      for (var surf in pushedSurfaces) {
        if (surf === 'docs') continue;
        var req = requirements[surf];
        if (!req || !req.required || req.required.length === 0) continue;

        var surfInfo = state.surfaces[surf];
        if (surfInfo && surfInfo.dirty) {
          // Surface is dirty in working tree -- check evidence with current fingerprints
          var validEvidence = getValidEvidence(currentFingerprints);
          var resolution = resolveVerification(currentFingerprints, validEvidence);
          var surfRes = resolution.surfaces[surf];
          if (surfRes && surfRes.missing && surfRes.missing.length > 0) {
            blocked.push(surf + ': ' + surfRes.missing.join(', '));
          }
        } else {
          // Surface is clean in working tree but has pushed changes.
          // The commit gate (PreToolUse) is the primary enforcement -- it
          // blocks non-snapshot commits with unverified surfaces. The push
          // gate is defence-in-depth. For clean surfaces, we verify that
          // recent evidence exists for ALL required types within a 10-minute
          // window. This covers the post-commit case where evidence was
          // recorded pre-commit.
          //
          // Limitation: evidence is matched by type and recency, not by
          // committed content fingerprint. The commit gate prevents the
          // scenario where evidence is for different content (it would have
          // blocked the commit). The only bypass paths are snapshot: commits
          // (caught by Gate A) or external terminal commits (out of scope).
          var recentCutoff = Date.now() - 10 * 60 * 1000;
          var ledgerPath = path.join(R.PROJECT_DATA_DIR, 'evidence_ledger.jsonl');
          var recentTypes = {};
          try {
            var lines = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean);
            for (var i = lines.length - 1; i >= 0; i--) {
              try {
                var entry = JSON.parse(lines[i]);
                var entryTime = new Date(entry.ts).getTime();
                if (entryTime < recentCutoff) break;
                if (entry.exit_code !== 0) continue;
                var fps = entry.surface_fingerprints || {};
                if (!fps[surf]) continue;
                recentTypes[entry.type] = true;
              } catch (_) {}
            }
          } catch (_) {}

          var missingReqs = [];
          var reqItems = req.required;
          for (var r = 0; r < reqItems.length; r++) {
            var alts = reqItems[r].split('|').map(function(s) { return s.trim(); });
            var satisfied = alts.some(function(alt) { return recentTypes[alt]; });
            if (!satisfied) missingReqs.push(reqItems[r]);
          }
          if (missingReqs.length > 0) {
            blocked.push(surf + ': ' + missingReqs.join(', ') + ' (clean surface, no recent evidence)');
          }
        }
      }

      if (blocked.length > 0) {
        process.stdout.write(JSON.stringify({
          systemMessage: 'PUSH BLOCKED: ' + blocked.join('; ') + '.'
        }) + '\n');
        process.exit(0);
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
