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

// ── git-push command filter (live implementation) ──
// git-push.js requires an ANCHORED commit gate from isGateTarget: git at
// command position, semantic segment parsing, wrapper unwrapping. These
// tests exercise the exact predicate the hook uses, plus the Codex round-1
// adversarial probes (2026-07-16 review).

function wouldTriggerPush(cmd) {
  return commandDetector.isGateTarget(cmd).some(function(g) {
    return g.gate === 'commit' && g.metadata && g.metadata.anchored;
  });
}

const SHOULD_MATCH_COMMIT = [
  'git commit -m "test"',
  'git commit --amend',
  'git -c user.name="X" commit -m "test"',
  'git -C /path commit -m "msg"',
  'cd /tmp && git commit -m "test"',
  // Codex round-1: git global options before the subcommand
  'git --no-pager commit -m "x"',
  'git --git-dir=.git --work-tree=. commit -m "x"',
  'git -c "user.name=X" commit -m "x"',
  // Codex round-1: shell-exec wrappers carrying the real commit
  'bash -lc "git commit -m x"',
  'bash -c "git commit -m x"',
  'sh -c "git commit -m x"',
  'powershell -Command "git commit -m x"',
  'pwsh -c "git commit -m x"',
  'cmd /c "git commit -m x"',
  // env prefix does not break anchoring
  'HUSKY=0 git commit -m "x"',
  // Codex round-2: long git global options with space-separated values
  'git --work-tree . commit -m x',
  'git --git-dir .git --work-tree . commit -m x',
  'git --exec-path /tmp commit -m x',
  // Codex round-2: unquoted PowerShell/cmd wrapper payloads
  'powershell -Command git commit -m x',
  'pwsh -Command git commit -m x',
  'cmd /c git commit -m x',
  'cmd /s /c git commit -m x',
  'powershell -NoProfile -Command git commit -m x',
  // pipeline stages anchor independently
  'echo y | git commit -m x',
  // subshell and transparent wrappers
  '(git commit -m "x")',
  'time git commit -m "x"',
  'sudo git commit -m "x"',
  // Codex round-3: |& pipelines, quoted env values, cmd inline-value flags
  'echo y |& git commit -m x',
  'FOO="bar baz" git commit -m x',
  'cmd /v:on /c git commit -m x',
  'cmd /q /d /s /c git commit -m x',
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
  // Codex round-1: unquoted text arguments and comments
  'echo git commit',
  'grep git commit file',
  '# git commit -m x',
  // Codex round-1: git plumbing sharing the commit prefix
  'git commit-tree HEAD^{tree}',
  'git commit-graph write',
  // wrapper with a data argument, not a command string
  'bash script.sh "git commit"',
  // wrapper whose payload is not a commit
  'powershell -Command "Get-ChildItem"',
  'cmd /c "echo git commit"',
  // Codex round-2: POSIX unquoted -c only executes the first word
  'bash -c git commit',
];

// ── Codex round-2: text arguments must emit ZERO gates of ANY type ──

const NO_GATES_AT_ALL = [
  'grep git push file',
  'grep pm2 restart file',
  'grep gh pr create file',
  'grep curl /api/bug please_review file',
  'bash -lc "grep git push file"',
  'bash -lc "grep pm2 restart file"',
  'bash -lc "grep gh pr create file"',
  'bash -lc "grep curl /api/bug please_review file"',
  'cat notes.md | grep git commit',
  'node script.js git push',
  // Codex round-3: same-tool later text and trailing comments
  'git status # git commit -m x',
  'git status # git push',
  'git status git commit -m x',
  'git log git push',
  'pm2 list pm2 restart nbi-dashboard',
  'gh auth status gh pr create',
  // curl without a mutation flag is not a bug status update
  'curl http://localhost:8888/health /api/bug please_review',
  // Codex round-4: variable indirection is a documented residual -- it must
  // be consistently undetected, not half-matched as canonical git
  '$GIT push',
  '$GIT commit -m x',
  // Codex round-5: heredoc body text is data, not commands
  'cat <<EOF\n&& git push\nEOF',
  'cat <<EOF\ngit commit -m x\nEOF',
  "cat <<'EOF'\ngit push\nEOF",
  // Codex round-6: multiple heredocs on one line -- every body is data
  'cat <<A <<B\nbody a\nA\ngit commit -m "feat: fake"\nB',
  'cat <<A <<B\nbody a\nA\ngit push\nB',
  'cat <<A <<B\nbody a\nA\ngit commit -m "snapshot: fake" && git push\nB',
  // an introducer-looking token inside a body is data, not a heredoc
  'cat <<A\n<<B\ngit push\nA',
  // Codex round-5: $((...)) is arithmetic expansion, not command substitution
  '$((git push))',
  '$((git commit -m x))',
];

NO_GATES_AT_ALL.forEach(function(cmd) {
  test('zero gates for text-argument command: ' + cmd, function() {
    var gates = commandDetector.isGateTarget(cmd);
    assert.deepStrictEqual(gates, [],
      'Expected zero gates for "' + cmd + '" but got: ' + JSON.stringify(gates));
  });
});

// ── anchored gates still fire for legitimate prefixed/piped forms ──

const ANCHORED_GATE_CASES = [
  { cmd: 'bash -lc "git push"', gate: 'push' },
  { cmd: 'time git push', gate: 'push' },
  { cmd: 'sudo pm2 restart nbi-dashboard', gate: 'pm2' },
  { cmd: 'echo y | git push', gate: 'push' },
  // Codex round-3: |& pipes stderr but still executes the right-hand command
  { cmd: 'echo y |& git push', gate: 'push' },
  { cmd: 'curl -X PATCH http://localhost:8888/api/bug/123 -d \'{"status":"please_review"}\'', gate: 'bugstatus' },
  // Codex round-4: quoted duplicate text must not shadow the real command
  { cmd: 'echo "git push" && git push', gate: 'push' },
  { cmd: 'printf "git push"; git push', gate: 'push' },
  { cmd: 'echo "git commit -m x" && git commit -m x', gate: 'commit' },
  { cmd: 'echo "pm2 restart nbi-dashboard" && pm2 restart nbi-dashboard', gate: 'pm2' },
  { cmd: 'echo "gh pr create --title x" && gh pr create --title x', gate: 'pr' },
  { cmd: 'echo "curl -X PATCH http://localhost:8888/api/bug/1 -d s=please_review" && curl -X PATCH http://localhost:8888/api/bug/1 -d s=please_review', gate: 'bugstatus' },
  // command substitution executes its content
  { cmd: '$(git push)', gate: 'push' },
  // Codex round-5 adjacent: newline is a command separator -- anchored
  // matching must see multiline commands as separate segments
  { cmd: 'git status\ngit push', gate: 'push' },
  { cmd: 'echo hi\ngit commit -m "x"', gate: 'commit' },
  // Codex round-6: real commands around heredocs still detected
  { cmd: 'cat <<A <<B\nbody a\nA\nbody b\nB\ngit push', gate: 'push' },
  { cmd: 'cat <<EOF && git push\nbody\nEOF', gate: 'push' },
];

ANCHORED_GATE_CASES.forEach(function(tc) {
  test('anchored gate ' + tc.gate + ' fires for: ' + tc.cmd, function() {
    var gates = commandDetector.isGateTarget(tc.cmd).map(function(g) { return g.gate; });
    assert(gates.indexOf(tc.gate) !== -1,
      'Expected gate "' + tc.gate + '" for "' + tc.cmd + '" but got: ' + JSON.stringify(gates));
  });
});

// ── evidence anchoring: text arguments must not mint evidence ──

const NO_FALSE_EVIDENCE = [
  { cmd: 'grep npm test file', cwd: 'D:/x/dashboard-server' },
  { cmd: 'grep "npm run test:all" README.md', cwd: 'D:/x/dashboard-server' },
  { cmd: 'node script.js npm test', cwd: 'D:/x/dashboard-server' },
];

NO_FALSE_EVIDENCE.forEach(function(tc) {
  test('no false evidence for: ' + tc.cmd, function() {
    assert.strictEqual(commandDetector.detectEvidenceType(tc.cmd, tc.cwd), null,
      'Expected null evidence for "' + tc.cmd + '"');
  });
});

test('anchored evidence still fires: time npm test in dashboard-server', function() {
  var r = commandDetector.detectEvidenceType('time npm test', 'D:/x/dashboard-server');
  assert(r && r.type === 'unit_test', 'Expected unit_test evidence, got: ' + JSON.stringify(r));
});

// Codex round-3: evidence commands in non-first pipeline stages must record
test('piped evidence fires: cat input | npm test', function() {
  var r = commandDetector.detectEvidenceType('cat input | npm test', 'D:/x/dashboard-server');
  assert(r && r.type === 'unit_test', 'Expected unit_test evidence, got: ' + JSON.stringify(r));
});

test('piped evidence fires: echo y | npx vitest run', function() {
  var r = commandDetector.detectEvidenceType('echo y | npx vitest run', 'D:/x/dashboard-server');
  assert(r && r.type === 'unit_test', 'Expected unit_test evidence, got: ' + JSON.stringify(r));
});

test('evidence control still fires: npm test | tee log', function() {
  var r = commandDetector.detectEvidenceType('npm test | tee log', 'D:/x/dashboard-server');
  assert(r && r.type === 'unit_test', 'Expected unit_test evidence, got: ' + JSON.stringify(r));
});

// Codex round-4: a later quoted duplicate must not shadow real evidence
test('evidence fires despite trailing quoted duplicate: npm test && echo "npm test"', function() {
  var r = commandDetector.detectEvidenceType('npm test && echo "npm test"', 'D:/x/dashboard-server');
  assert(r && r.type === 'unit_test', 'Expected unit_test evidence, got: ' + JSON.stringify(r));
});

// Codex round-5: heredoc body text must never mint evidence
test('no false evidence from heredoc body: cat <<EOF && npm test EOF', function() {
  var r = commandDetector.detectEvidenceType('cat <<EOF\n&& npm test\nEOF', 'D:/x/dashboard-server');
  assert.strictEqual(r, null, 'Expected null evidence, got: ' + JSON.stringify(r));
});

test('no false evidence from quoted-delimiter heredoc body', function() {
  var r = commandDetector.detectEvidenceType("cat <<'EOF'\nnpm run test:all\nEOF", 'D:/x/dashboard-server');
  assert.strictEqual(r, null, 'Expected null evidence, got: ' + JSON.stringify(r));
});

// Codex round-5 adjacent: newline-separated evidence commands still record
test('multiline evidence fires: cd dashboard-server then npm test on next line', function() {
  var r = commandDetector.detectEvidenceType('cd dashboard-server\nnpm test', 'D:/x');
  assert(r && r.type === 'unit_test', 'Expected unit_test evidence, got: ' + JSON.stringify(r));
});

// real-world heredoc commit: quoted heredoc inside -m "$(...)" still commits
test('git commit with heredoc message still matches', function() {
  var cmd = 'git commit -m "$(cat <<\'EOF\'\nfeat: thing\nEOF\n)"';
  assert(wouldTriggerPush(cmd), 'Expected heredoc-message commit to match');
});

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

// ── hook payload extraction (Codex round-1 MEDIUM/LOW findings) ──
// git-push.js exits silently on unusable payloads; these tests make that
// behaviour deliberate for every payload shape.

const PAYLOAD_CASES = [
  { name: 'canonical Bash payload', payload: { tool_name: 'Bash', tool_input: { command: 'git commit -m "x"' } }, expect: 'git commit -m "x"' },
  { name: 'canonical PowerShell payload', payload: { tool_name: 'PowerShell', tool_input: { command: 'git commit -m "x"' } }, expect: 'git commit -m "x"' },
  { name: 'flattened payload', payload: { command: 'git commit -m "x"' }, expect: 'git commit -m "x"' },
  { name: 'empty object', payload: {}, expect: '' },
  { name: 'null payload', payload: null, expect: '' },
  { name: 'missing command field', payload: { tool_input: {} }, expect: '' },
  { name: 'non-string command', payload: { tool_input: { command: 42 } }, expect: '' },
  { name: 'tool_input takes precedence over flattened', payload: { command: 'ls', tool_input: { command: 'git commit' } }, expect: 'git commit' },
];

PAYLOAD_CASES.forEach(function(tc) {
  test('extractHookCommand: ' + tc.name, function() {
    assert.strictEqual(commandDetector.extractHookCommand(tc.payload), tc.expect);
  });
});

// ── Summary ──

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
