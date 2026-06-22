#!/usr/bin/env node
'use strict';
// verification-gate.js -- PreToolUse hook (Bash|PowerShell) that mechanically
// blocks downstream actions when verification requirements are not met.
//
// Gates:
//   1. git commit  -- blocks unverified commits (snapshot: prefix escapes commit but not push)
//   2. pm2 restart -- blocks deploy with unverified server/config changes
//   3. gh pr create -- blocks PRs with unverified changes (no snapshot escape)
//   4. curl /api/bug please_review -- blocks bug status updates without verification
//   5. git push    -- blocks pushing snapshot: commits or unverified changes (scoped to pushed surfaces)
//
// All gates run a synchronous rescan before deciding.
// Compound commands: if ANY gate blocks, the entire command is blocked.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const R = require('./resolve');

const commandDetector = require('./command-detector');
const verificationState = require('./verification-state');
const evidenceLedger = require('./evidence-ledger');
const verificationResolver = require('./verification-resolver');

function readApprovalToken() {
  var tokenPath = path.join(R.PROJECT_DATA_DIR, 'glen_approval.json');
  try {
    return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function consumeApprovalToken() {
  var tokenPath = path.join(R.PROJECT_DATA_DIR, 'glen_approval.json');
  try { fs.unlinkSync(tokenPath); } catch (_) {}
}

function isTokenValid(token, dirtySurfaces) {
  if (!token || !token.expires_at) return false;
  if (new Date(token.expires_at) <= new Date()) return false;
  if (!token.surfaces || !Array.isArray(token.surfaces)) return false;
  var approved = new Set(token.surfaces);
  for (var i = 0; i < dirtySurfaces.length; i++) {
    if (!approved.has(dirtySurfaces[i])) return false;
  }
  return true;
}

function getSnapshotCommits() {
  try {
    var log = execSync('git log origin/HEAD..HEAD --oneline', {
      cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000
    });
    return log.split('\n')
      .filter(function(line) { return /^\w+\s+snapshot:/.test(line.trim()); })
      .map(function(line) { return line.trim(); });
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
      return fallbackLog.split('\n')
        .filter(function(line) { return /^\w+\s+snapshot:/.test(line.trim()); })
        .map(function(line) { return line.trim(); });
    } catch (_2) {
      // Fail closed: if we cannot determine branch history, assume snapshot exists
      return ['UNKNOWN snapshot: branch-comparison-failed -- fail closed'];
    }
  }
}

function getPushedSurfaces() {
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

  if (pushedFiles === null) return null;

  var surfaces = {};
  pushedFiles.split('\n').filter(Boolean).forEach(function(f) {
    var s = verificationState.classifySurface(f.trim());
    if (s) surfaces[s] = true;
  });
  return surfaces;
}

function runRescanAndResolve() {
  var state = verificationState.scanDirtyState();
  var currentFingerprints = {};
  var dirtySurfaces = [];
  var dirtyNonDoc = false;

  for (var surface in state.surfaces) {
    var info = state.surfaces[surface];
    currentFingerprints[surface] = info.fingerprint;
    if (info.dirty) {
      dirtySurfaces.push(surface);
      if (surface !== 'docs') dirtyNonDoc = true;
    }
  }

  if (!dirtyNonDoc) {
    return { clean: true, resolution: null, dirtySurfaces: [], currentFingerprints: currentFingerprints };
  }

  var validEvidence = evidenceLedger.getValidEvidence(currentFingerprints);
  var resolution = verificationResolver.resolve(currentFingerprints, validEvidence);

  var unsatisfiedSurfaces = [];
  for (var s in resolution.surfaces) {
    if (resolution.surfaces[s].missing && resolution.surfaces[s].missing.length > 0) {
      unsatisfiedSurfaces.push(s);
    }
  }

  return {
    clean: false,
    resolution: resolution,
    dirtySurfaces: dirtySurfaces,
    unsatisfiedSurfaces: unsatisfiedSurfaces,
    currentFingerprints: currentFingerprints
  };
}

function checkSnapshotInCommand(rawCommand) {
  var gitPushRe = /\bgit\s+(?:(?:-[Cc]\s+\S+\s+))*push\b/;
  var gitCommitRe = /\bgit\s+(?:(?:-[Cc]\s+\S+\s+))*commit\b/;
  var segments = commandDetector.parseCommand(rawCommand);
  for (var i = 0; i < segments.length; i++) {
    if (gitPushRe.test(segments[i])) {
      for (var j = 0; j < segments.length; j++) {
        if (gitCommitRe.test(segments[j]) && /snapshot:/.test(segments[j])) {
          return true;
        }
      }
    }
  }
  return false;
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason: reason }));
  process.exit(0);
}

// Gate 1: git commit
function gateCommit(metadata, rescanResult, rawCommand) {
  if (rescanResult.clean) return;

  if (rescanResult.resolution.all_satisfied) return;

  var msg = metadata.message || '';
  if (msg.startsWith('snapshot:')) return;

  var token = readApprovalToken();
  if (isTokenValid(token, rescanResult.unsatisfiedSurfaces)) {
    consumeApprovalToken();
    return;
  }

  block('VERIFICATION GATE: ' + rescanResult.resolution.summary);
}

// Gate 2: pm2 restart
function gatePm2(rescanResult) {
  if (rescanResult.clean) return;

  var serverInfo = rescanResult.resolution.surfaces.server;
  var configInfo = rescanResult.resolution.surfaces.config;

  var serverBlocked = serverInfo && serverInfo.missing && serverInfo.missing.length > 0;
  var configBlocked = configInfo && configInfo.missing && configInfo.missing.length > 0;

  if (serverBlocked || configBlocked) {
    var parts = [];
    if (serverBlocked) parts.push('server: ' + serverInfo.missing.join(', '));
    if (configBlocked) parts.push('config: ' + configInfo.missing.join(', '));
    block('DEPLOY GATE: Unverified changes. Missing: ' + parts.join('; ') + '. Run npm test before deploying.');
  }
}

// Gate 3: gh pr create
function gatePr(rescanResult) {
  if (rescanResult.clean) return;

  if (!rescanResult.resolution.all_satisfied) {
    block('PR GATE: ' + rescanResult.resolution.summary);
  }
}

// Gate 4: curl /api/bug please_review
function gateBugStatus(rescanResult) {
  if (rescanResult.clean) return;

  if (!rescanResult.resolution.all_satisfied) {
    block('BUG STATUS GATE: ' + rescanResult.resolution.summary);
  }
}

// Gate 5: git push -- scoped to pushed surfaces only
function gatePush(rescanResult, rawCommand) {
  if (checkSnapshotInCommand(rawCommand)) {
    block('PUSH GATE: Command contains snapshot: commit + push. Snapshot commits cannot be pushed.');
  }

  var snapshots = getSnapshotCommits();
  if (snapshots.length > 0) {
    block('PUSH GATE: Branch contains snapshot: commits that must be squashed before pushing. Commits: ' + snapshots.join(', '));
  }

  var pushedSurfaces = getPushedSurfaces();
  if (pushedSurfaces === null) {
    block('PUSH GATE: cannot determine pushed files -- failing closed.');
  }

  if (rescanResult.clean) return;

  var pushedBlocked = false;
  var blockedDetails = [];
  for (var s in rescanResult.resolution.surfaces) {
    if (!pushedSurfaces[s]) continue;
    var info = rescanResult.resolution.surfaces[s];
    if (info.missing && info.missing.length > 0) {
      pushedBlocked = true;
      blockedDetails.push(s + ': ' + info.missing.join(', '));
    }
  }

  if (pushedBlocked) {
    block('PUSH GATE: ' + blockedDetails.join('; ') + '.');
  }
}

function main() {
  var stdin = '';
  try { stdin = fs.readFileSync(0, 'utf8'); } catch (_) { process.exit(0); }

  var hookData = {};
  try { hookData = JSON.parse(stdin); } catch (_) { process.exit(0); }

  var command = (hookData.tool_input || {}).command || '';
  if (!command) process.exit(0);

  var gates = commandDetector.isGateTarget(command);
  if (gates.length === 0) process.exit(0);

  var rescanResult = runRescanAndResolve();

  for (var i = 0; i < gates.length; i++) {
    var gate = gates[i];
    switch (gate.gate) {
      case 'commit':
        gateCommit(gate.metadata, rescanResult, command);
        break;
      case 'push':
        gatePush(rescanResult, command);
        break;
      case 'pm2':
        gatePm2(rescanResult);
        break;
      case 'pr':
        gatePr(rescanResult);
        break;
      case 'bugstatus':
        gateBugStatus(rescanResult);
        break;
    }
  }

  process.exit(0);
}

try { main(); } catch (e) {
  process.stderr.write('verification-gate: unexpected error: ' + (e.message || e) + '\n');
  block('VERIFICATION GATE: unexpected error -- failing closed');
}
