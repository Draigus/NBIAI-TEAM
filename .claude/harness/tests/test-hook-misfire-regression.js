#!/usr/bin/env node
'use strict';
// Regression tests for hook misfire scenarios identified in the
// 2026-07-10 harness efficiency overhaul design session.
//
// Two observed misfires:
// 1. git-push.js PostToolUse emitted "PUSH BLOCKED" after ls/grep commands
//    because it has no command filtering -- runs full logic on every Bash call.
// 2. Verification-posthook dirty-state nudge firing after innocent read commands.
//
// These tests verify that command-detector.js correctly returns empty results
// for innocent commands, and that the proposed git-push command filter
// (once patched) rejects non-commit commands.

const assert = require('assert');
const path = require('path');

// Use source harness if available, fall back to runtime
const harnessDir = process.env.HARNESS_DIR || path.join(__dirname, '..');
const commandDetector = require(path.join(harnessDir, 'lib', 'command-detector'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    console.error('FAIL: ' + name);
    console.error('  ' + e.message);
  }
}

// ── Innocent commands that must trigger ZERO gates ──

const INNOCENT_COMMANDS = [
  'ls',
  'ls -la',
  'ls .claude/harness/data/',
  'grep -r "function" .claude/harness/lib/',
  'grep "pm2 restart" session_logs/2026-07-10_session.md',
  'cat .claude/harness/lib/git-push.js',
  'head -50 .claude/harness/lib/verification-gate.js',
  'npm install',
  'npm run build',
  'echo "testing"',
  'echo "do not git commit this"',
  'echo "pm2 restart after grep"',
  'cd dashboard-server && ls',
  'wc -l .claude/harness/lib/*.js',
  'find .claude/harness -name "*.js" -type f',
  'git status',
  'git log --oneline -5',
  'git diff HEAD',
  'git branch --list',
  'git stash list',
  'node --version',
  'node --check .claude/harness/lib/git-push.js',
  'pwd',
  'whoami',
  'date',
  'pm2 list',
  'pm2 logs nbi-dashboard --lines 50 --nostream',
  'pm2 status',
  'curl -s http://localhost:8888/health',
];

INNOCENT_COMMANDS.forEach(function(cmd) {
  test('isGateTarget returns empty for: ' + cmd, function() {
    var gates = commandDetector.isGateTarget(cmd);
    assert.deepStrictEqual(gates, [],
      'Expected zero gates for "' + cmd + '" but got: ' + JSON.stringify(gates));
  });
});

// ── Guarded commands that MUST trigger the correct gate ──

const GUARDED_COMMANDS = [
  { cmd: 'git commit -m "feat: add feature"', gate: 'commit' },
  { cmd: 'git commit --amend', gate: 'commit' },
  { cmd: 'git -c user.name="X" commit -m "test"', gate: 'commit' },
  { cmd: 'git push', gate: 'push' },
  { cmd: 'git push origin master', gate: 'push' },
  { cmd: 'git push -u origin feature/x', gate: 'push' },
  { cmd: 'pm2 restart nbi-dashboard', gate: 'pm2' },
  { cmd: 'pm2 restart nbi-dashboard-staging', gate: 'pm2' },
  { cmd: 'gh pr create --title "test"', gate: 'pr' },
];

GUARDED_COMMANDS.forEach(function(tc) {
  test('isGateTarget detects ' + tc.gate + ' for: ' + tc.cmd, function() {
    var gates = commandDetector.isGateTarget(tc.cmd);
    var gateNames = gates.map(function(g) { return g.gate; });
    assert(gateNames.indexOf(tc.gate) !== -1,
      'Expected gate "' + tc.gate + '" for "' + tc.cmd + '" but got: ' + JSON.stringify(gateNames));
  });
});

// ── Innocent commands that must produce NO evidence ──

const NO_EVIDENCE_COMMANDS = [
  { cmd: 'ls', cwd: '/tmp' },
  { cmd: 'grep "test" file.js', cwd: '/tmp' },
  { cmd: 'echo "npm test"', cwd: '/tmp' },
  { cmd: 'cat package.json', cwd: '/tmp' },
];

NO_EVIDENCE_COMMANDS.forEach(function(tc) {
  test('detectEvidenceType returns null for: ' + tc.cmd, function() {
    var result = commandDetector.detectEvidenceType(tc.cmd, tc.cwd);
    assert.strictEqual(result, null,
      'Expected null evidence for "' + tc.cmd + '" but got: ' + JSON.stringify(result));
  });
});

// ── git-push command filter (proposed patch) ──
// Once patched, git-push.js will mask quoted content then test with this regex.
// These tests verify the maskQuoted + regex combination matches correctly.

const maskQuoted = commandDetector._maskQuoted;
const GIT_COMMIT_REGEX = /\bgit\s+(?:-[cC]\s+\S+\s+)*commit\b/;

function wouldTriggerPush(cmd) {
  return GIT_COMMIT_REGEX.test(maskQuoted(cmd));
}

const SHOULD_MATCH_COMMIT = [
  'git commit -m "test"',
  'git commit --amend',
  'git -c user.name="X" commit -m "test"',
  'git -C /path commit -m "msg"',
  'cd /tmp && git commit -m "test"',
];

const SHOULD_NOT_MATCH_COMMIT = [
  'ls',
  'grep "git commit" file.md',
  'echo "git commit"',
  'git status',
  'git push',
  'git log --oneline',
  'git diff',
  'npm test',
  'pm2 restart nbi-dashboard',
  'cat git-commit-guide.md',
];

SHOULD_MATCH_COMMIT.forEach(function(cmd) {
  test('git-push filter matches commit: ' + cmd, function() {
    assert(wouldTriggerPush(cmd),
      'Expected filter to match "' + cmd + '"');
  });
});

SHOULD_NOT_MATCH_COMMIT.forEach(function(cmd) {
  test('git-push filter rejects non-commit: ' + cmd, function() {
    assert(!wouldTriggerPush(cmd),
      'Expected filter to NOT match "' + cmd + '"');
  });
});

// ── Summary ──

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
