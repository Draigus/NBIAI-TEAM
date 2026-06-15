#!/usr/bin/env node
'use strict';
// test-shell-guard.js — Tests for shell guard that blocks write primitives
// targeting governed harness paths via Bash/PowerShell.
// Spawns shell-guard.js as a child process with controlled stdin.
// Uses Node's built-in assert — no test framework dependency.

const { spawnSync } = require('child_process');
const path = require('path');
const assert = require('assert');

const GUARD_PATH = path.resolve(__dirname, '..', 'lib', 'shell-guard.js');

function runGuard(command, toolName) {
  toolName = toolName || 'Bash';
  const stdinObj = {
    tool_name: toolName,
    tool_input: { command: command }
  };
  const input = JSON.stringify(stdinObj);
  const result = spawnSync('node', [GUARD_PATH], {
    input,
    env: { ...process.env },
    encoding: 'utf8',
    timeout: 5000
  });
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

function parseOutput(result) {
  if (!result.stdout) return null;
  try { return JSON.parse(result.stdout); } catch { return null; }
}

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log('  FAIL: ' + name);
    console.log('        ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════
// Group 1: BLOCK — redirect to governed config path
// ═══════════════════════════════════════════════════════
console.log('\nGroup 1: Redirect to governed config path');

test('echo redirect to .claude/harness/config/ is blocked', () => {
  const r = runGuard('echo "x" > .claude/harness/config/test.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
  assert.ok(out.reason.includes('SHELL_WRITE_DENIED'), 'reason mentions SHELL_WRITE_DENIED');
});

test('append redirect to config path is blocked', () => {
  const r = runGuard('echo "x" >> .claude/harness/config/risk-policy.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 2: BLOCK — PowerShell write cmdlets to governed lib path
// ═══════════════════════════════════════════════════════
console.log('\nGroup 2: PowerShell write cmdlets to governed lib path');

test('Set-Content to .claude/harness/lib/ is blocked', () => {
  const r = runGuard('Set-Content .claude/harness/lib/test.js -Value "bad"', 'PowerShell');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('Out-File to .claude/harness/lib/ is blocked', () => {
  const r = runGuard('"bad" | Out-File .claude/harness/lib/evil.js', 'PowerShell');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('Add-Content to .claude/harness/config/ is blocked', () => {
  const r = runGuard('Add-Content .claude/harness/config/write-matrix.json "extra"', 'PowerShell');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 3: BLOCK — cp/mv/rm targeting governed paths
// ═══════════════════════════════════════════════════════
console.log('\nGroup 3: cp/mv/rm targeting governed paths');

test('cp to .claude/harness/lib/ is blocked', () => {
  const r = runGuard('cp /tmp/x .claude/harness/lib/emit-event.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('mv to .claude/harness/config/ is blocked', () => {
  const r = runGuard('mv evil.json .claude/harness/config/risk-policy.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('rm targeting .claude/harness/lib/ is blocked', () => {
  const r = runGuard('rm .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('rm -rf targeting .claude/harness/lib/ is blocked', () => {
  const r = runGuard('rm -rf .claude/harness/lib/');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 4: BLOCK — node -e / python -c with fs writes
// ═══════════════════════════════════════════════════════
console.log('\nGroup 4: node -e / python -c with fs writes');

test('node -e with fs.writeFileSync to governed path is blocked', () => {
  const r = runGuard('node -e "fs.writeFileSync(\'.claude/harness/config/x\', \'bad\')"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('python -c with open/write to governed path is blocked', () => {
  const r = runGuard('python -c "open(\'.claude/harness/lib/x.py\',\'w\').write(\'bad\')"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 5: BLOCK — Copy-Item / Move-Item / Remove-Item (PowerShell)
// ═══════════════════════════════════════════════════════
console.log('\nGroup 5: PowerShell Copy-Item/Move-Item/Remove-Item');

test('Copy-Item to .claude/harness/lib/ is blocked', () => {
  const r = runGuard('Copy-Item C:\\tmp\\x.js .claude/harness/lib/evil.js', 'PowerShell');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('Move-Item to .claude/harness/config/ is blocked', () => {
  const r = runGuard('Move-Item bad.json .claude/harness/config/risk-policy.json', 'PowerShell');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('Remove-Item targeting .claude/harness/lib/ is blocked', () => {
  const r = runGuard('Remove-Item .claude/harness/lib/write-guard.js', 'PowerShell');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 6: BLOCK — tee to governed path
// ═══════════════════════════════════════════════════════
console.log('\nGroup 6: tee to governed path');

test('tee to .claude/harness/lib/ is blocked', () => {
  const r = runGuard('echo "x" | tee .claude/harness/lib/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('tee -a to .claude/harness/config/ is blocked', () => {
  const r = runGuard('echo "x" | tee -a .claude/harness/config/extra.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 7: ALLOW — no governed path involved
// ═══════════════════════════════════════════════════════
console.log('\nGroup 7: ALLOW — no governed path');

test('npm test is allowed', () => {
  const r = runGuard('npm test');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('git status is allowed', () => {
  const r = runGuard('git status');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('echo redirect to non-governed path is allowed', () => {
  const r = runGuard('echo "x" > somefile.txt');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('ls is allowed', () => {
  const r = runGuard('ls -la');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

// ═══════════════════════════════════════════════════════
// Group 8: ALLOW — read operations on governed paths
// ═══════════════════════════════════════════════════════
console.log('\nGroup 8: ALLOW — read operations on governed paths');

test('cat of governed file is allowed', () => {
  const r = runGuard('cat .claude/harness/lib/emit-event.js');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('head of governed file is allowed', () => {
  const r = runGuard('head -20 .claude/harness/config/write-matrix.json');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('node --check of governed file is allowed', () => {
  const r = runGuard('node --check .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('grep in governed path is allowed', () => {
  const r = runGuard('grep -r "function" .claude/harness/lib/');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

// ═══════════════════════════════════════════════════════
// Group 9: ALLOW — writes to non-governed harness paths
// ═══════════════════════════════════════════════════════
console.log('\nGroup 9: ALLOW — writes to non-governed harness paths');

test('cp to .claude/harness/data/ is allowed', () => {
  const r = runGuard('cp /tmp/x .claude/harness/data/events/test.jsonl');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('echo redirect to .claude/harness/tests/ is allowed', () => {
  const r = runGuard('echo "x" > .claude/harness/tests/scratch.txt');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

// ═══════════════════════════════════════════════════════
// Group 10: BLOCK — case-insensitive path matching
// ═══════════════════════════════════════════════════════
console.log('\nGroup 10: Case-insensitive path matching');

test('mixed case .Claude/Harness/Lib/ is blocked', () => {
  const r = runGuard('cp /tmp/x .Claude/Harness/Lib/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('uppercase .CLAUDE/HARNESS/CONFIG/ is blocked', () => {
  const r = runGuard('echo "x" > .CLAUDE/HARNESS/CONFIG/bad.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 11: BLOCK — backslash paths (Windows)
// ═══════════════════════════════════════════════════════
console.log('\nGroup 11: Backslash paths (Windows)');

test('backslash path to governed lib is blocked', () => {
  const r = runGuard('cp /tmp/x .claude\\harness\\lib\\evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('backslash path to governed config is blocked', () => {
  const r = runGuard('echo "x" > .claude\\harness\\config\\bad.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 12: BLOCK — traversal attempts
// ═══════════════════════════════════════════════════════
console.log('\nGroup 12: Traversal attempts');

test('traversal via ../lib/ from data/ is blocked', () => {
  const r = runGuard('cp /tmp/x .claude/harness/data/../lib/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('traversal via ../config/ from tests/ is blocked', () => {
  const r = runGuard('echo "x" > .claude/harness/tests/../config/bad.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 13: Edge cases — empty/malformed input
// ═══════════════════════════════════════════════════════
console.log('\nGroup 13: Edge cases');

test('empty command is allowed', () => {
  const r = runGuard('');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('malformed stdin does not crash', () => {
  const result = spawnSync('node', [GUARD_PATH], {
    input: 'not json',
    encoding: 'utf8',
    timeout: 5000
  });
  assert.strictEqual(result.status, 0, 'exits cleanly');
});

test('missing tool_input does not crash', () => {
  const result = spawnSync('node', [GUARD_PATH], {
    input: JSON.stringify({ tool_name: 'Bash' }),
    encoding: 'utf8',
    timeout: 5000
  });
  assert.strictEqual(result.status, 0, 'exits cleanly');
});

// ═══════════════════════════════════════════════════════
// Group 14: ALLOW — text arguments mentioning governed paths (quote-aware)
// ═══════════════════════════════════════════════════════
console.log('\nGroup 14: ALLOW — text arguments mentioning governed paths');

test('codex exec with governed paths in prompt text is allowed', () => {
  const r = runGuard('echo "" | codex exec "Review .claude/harness/lib/write-guard.js for cp and > bypass vectors"');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow — governed paths are in prompt text, not targets');
});

test('echo piped to program discussing governed paths is allowed', () => {
  const r = runGuard('echo "check .claude/harness/config/ for rm issues" | some-tool');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('program with quoted arg mentioning writes and governed paths is allowed', () => {
  const r = runGuard('my-tool "cp /tmp/x .claude/harness/lib/evil.js should be blocked"');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow — cp and path are inside quotes as argument text');
});

// ═══════════════════════════════════════════════════════
// Group 15: BLOCK — cat redirect to governed path
// ═══════════════════════════════════════════════════════
console.log('\nGroup 15: BLOCK — cat redirect to governed path');

test('cat file > .claude/harness/lib/x is blocked (redirect overrides read-only prefix)', () => {
  const r = runGuard('cat /tmp/payload > .claude/harness/lib/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('cat file >> .claude/harness/config/x is blocked', () => {
  const r = runGuard('cat /tmp/payload >> .claude/harness/config/extra.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 16: BLOCK — chained commands
// ═══════════════════════════════════════════════════════
console.log('\nGroup 16: BLOCK — chained commands');

test('safe command && cp to governed path is blocked', () => {
  const r = runGuard('echo ok && cp /tmp/x .claude/harness/lib/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('safe command ; rm governed path is blocked', () => {
  const r = runGuard('echo ok ; rm .claude/harness/config/risk-policy.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 17: CODEX FINDING — read-only prefix chaining bypass
// ═══════════════════════════════════════════════════════
console.log('\nGroup 17: Codex — read-only prefix chaining bypass');

test('cat governed ; rm governed is blocked', () => {
  const r = runGuard('cat .claude/harness/lib/write-guard.js ; rm .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('ls && cp to governed is blocked', () => {
  const r = runGuard('ls . && cp /tmp/x .claude/harness/lib/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('grep || rm governed is blocked', () => {
  const r = runGuard('grep x foo || rm .claude/harness/config/risk-policy.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 18: CODEX FINDING — quote-in-path bypass
// ═══════════════════════════════════════════════════════
console.log('\nGroup 18: Codex — quote-in-path bypass');

test('redirect to path with embedded double quotes is blocked', () => {
  const r = runGuard('echo bad > .claude/harness/"lib"/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('cp to path with leading quoted segment is blocked', () => {
  const r = runGuard('cp /tmp/x ".claude/harness"/lib/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('cp to path with empty single quotes is blocked', () => {
  const r = runGuard("cp /tmp/x .claude/harness/l''ib/evil.js");
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 19: CODEX FINDING — wrapper/interpreter bypass
// ═══════════════════════════════════════════════════════
console.log('\nGroup 19: Codex — wrapper/interpreter bypass');

test('sudo cp to governed is blocked', () => {
  const r = runGuard('sudo cp /tmp/x .claude/harness/lib/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('bash -c with cp governed is blocked', () => {
  const r = runGuard('bash -c "cp /tmp/x .claude/harness/lib/evil.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('sh -c with redirect to governed is blocked', () => {
  const r = runGuard('sh -c "echo bad > .claude/harness/config/x.json"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('env rm governed is blocked', () => {
  const r = runGuard('env rm .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 20: CODEX FINDING — missing write commands
// ═══════════════════════════════════════════════════════
console.log('\nGroup 20: Codex — missing write commands');

test('sed -i on governed file is blocked', () => {
  const r = runGuard('sed -i s/a/b/ .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('touch governed file is blocked', () => {
  const r = runGuard('touch .claude/harness/lib/new.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('ln -sf to governed is blocked', () => {
  const r = runGuard('ln -sf /tmp/x .claude/harness/lib/link');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('tar extract into governed is blocked', () => {
  const r = runGuard('tar -xf /tmp/payload.tar -C .claude/harness/lib/');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('unzip into governed is blocked', () => {
  const r = runGuard('unzip payload.zip -d .claude/harness/config/');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('patch governed file is blocked', () => {
  const r = runGuard('patch .claude/harness/lib/write-guard.js /tmp/patch');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('truncate governed file is blocked', () => {
  const r = runGuard('truncate -s 0 .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('perl -pi -e on governed file is blocked', () => {
  const r = runGuard('perl -pi -e s/a/b/ .claude/harness/config/x.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 21: CODEX FINDING — git write subcommands
// ═══════════════════════════════════════════════════════
console.log('\nGroup 21: Codex — git write subcommands');

test('git checkout -- governed is blocked', () => {
  const r = runGuard('git checkout HEAD -- .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('git restore governed is blocked', () => {
  const r = runGuard('git restore .claude/harness/config/risk-policy.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('git status is allowed (not a write subcommand)', () => {
  const r = runGuard('git status');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('git log governed path is allowed (not a write subcommand)', () => {
  const r = runGuard('git log .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

// ═══════════════════════════════════════════════════════
// Group 22: CODEX FINDING — find -exec/-delete
// ═══════════════════════════════════════════════════════
console.log('\nGroup 22: Codex — find -exec/-delete');

test('find -exec rm governed is blocked', () => {
  const r = runGuard('find . -name x -exec rm .claude/harness/lib/write-guard.js ;');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('find -delete in governed is blocked', () => {
  const r = runGuard('find .claude/harness/lib/ -name "*.bak" -delete');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('find without -exec/-delete is allowed', () => {
  const r = runGuard('find .claude/harness/lib/ -name "*.js" -print');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

// ═══════════════════════════════════════════════════════
// Group 23: BLOCK — backslash escape bypass
// ═══════════════════════════════════════════════════════
console.log('\nGroup 23: BLOCK — backslash escape bypass');

test('cp to path with backslash escape in component is blocked', () => {
  const r = runGuard('cp /tmp/x .claude/harness/l\\ib/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('redirect to path with backslash escape is blocked', () => {
  const r = runGuard('echo bad > .claude/harness/con\\fig/x.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 24: BLOCK — variable assignment with governed path
// ═══════════════════════════════════════════════════════
console.log('\nGroup 24: BLOCK — variable assignment bypass');

test('VAR=governed ; cp $VAR is blocked', () => {
  const r = runGuard('p=.claude/harness/lib/evil.js; cp /tmp/x $p');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('VAR=governed ; echo > $VAR is blocked', () => {
  const r = runGuard('TARGET=.claude/harness/config/x.json; echo bad > $TARGET');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('VAR=governed with cat (no write) is allowed', () => {
  const r = runGuard('p=.claude/harness/lib/write-guard.js; cat $p');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow — cat is not a write command');
});

// ═══════════════════════════════════════════════════════
// Group 26: CODEX R2 — wrapper flags bypass
// ═══════════════════════════════════════════════════════
console.log('\nGroup 26: Codex R2 — wrapper flags bypass');

test('sudo -E cp to governed is blocked', () => {
  const r = runGuard('sudo -E cp /tmp/x .claude/harness/lib/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('env FOO=bar cp to governed is blocked', () => {
  const r = runGuard('env FOO=bar cp /tmp/x .claude/harness/lib/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('xargs -I{} cp to governed is blocked', () => {
  const r = runGuard('xargs -I{} cp {} .claude/harness/lib/evil.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 27: CODEX R2 — bash -lc bypass
// ═══════════════════════════════════════════════════════
console.log('\nGroup 27: Codex R2 — bash -lc bypass');

test('bash -lc with cp governed is blocked', () => {
  const r = runGuard('bash -lc "cp /tmp/x .claude/harness/lib/evil.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 28: CODEX R2 — git options bypass
// ═══════════════════════════════════════════════════════
console.log('\nGroup 28: Codex R2 — git options bypass');

test('git -C . checkout governed is blocked', () => {
  const r = runGuard('git -C . checkout HEAD -- .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('git --git-dir=x checkout governed is blocked', () => {
  const r = runGuard('git --git-dir=.git checkout -- .claude/harness/config/risk-policy.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 29: CODEX R2 — require('fs') bypass
// ═══════════════════════════════════════════════════════
console.log('\nGroup 29: Codex R2 — require fs bypass');

test('node -e require(fs).writeFileSync governed is blocked', () => {
  const r = runGuard("node -e \"require('fs').writeFileSync('.claude/harness/lib/evil.js', 'x')\"");
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 30: CODEX R2 — PowerShell aliases
// ═══════════════════════════════════════════════════════
console.log('\nGroup 30: Codex R2 — PowerShell aliases');

test('copy to governed is blocked', () => {
  const r = runGuard('copy C:\\tmp\\x .claude/harness/lib/evil.js', 'PowerShell');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('del governed is blocked', () => {
  const r = runGuard('del .claude/harness/lib/write-guard.js', 'PowerShell');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('move to governed is blocked', () => {
  const r = runGuard('move evil.js .claude/harness/config/risk-policy.json', 'PowerShell');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('sc governed is blocked', () => {
  const r = runGuard('sc .claude/harness/lib/evil.js "bad content"', 'PowerShell');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 31: CODEX R3 — wrapper + shell-exec/git combinations
// ═══════════════════════════════════════════════════════
console.log('\nGroup 31: Codex R3 — wrapper + shell-exec/git combinations');

test('sudo bash -lc with cp governed is blocked', () => {
  const r = runGuard('sudo bash -lc "cp /tmp/x .claude/harness/lib/evil.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('sudo -u root bash -lc with cp governed is blocked', () => {
  const r = runGuard('sudo -u root bash -lc "cp /tmp/x .claude/harness/lib/evil.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('env FOO=bar bash -lc with redirect governed is blocked', () => {
  const r = runGuard('env FOO=bar bash -lc "echo bad > .claude/harness/config/x.json"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('command bash -lc with cp governed is blocked', () => {
  const r = runGuard('command bash -lc "cp /tmp/x .claude/harness/lib/evil.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('xargs sh -c with cp governed is blocked', () => {
  const r = runGuard('xargs -I{} sh -c "cp {} .claude/harness/lib/evil.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('sudo git -C dir restore governed is blocked', () => {
  const r = runGuard('sudo git -C dir restore .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('env -i git -C dir restore governed is blocked', () => {
  const r = runGuard('env -i git -C dir restore .claude/harness/config/risk-policy.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 32: CODEX R4 — nested wrapper bypass
// ═══════════════════════════════════════════════════════
console.log('\nGroup 32: Codex R4 — nested wrapper bypass');

test('sudo env bash -lc with cp governed is blocked', () => {
  const r = runGuard('sudo env FOO=bar bash -lc "cp /tmp/x .claude/harness/lib/evil.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('env sudo bash -lc with cp governed is blocked', () => {
  const r = runGuard('env FOO=bar sudo bash -lc "cp /tmp/x .claude/harness/lib/evil.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('sudo command git -C dir restore governed is blocked', () => {
  const r = runGuard('sudo command git -C dir restore .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('env command git restore governed is blocked', () => {
  const r = runGuard('env FOO=bar command git -C dir restore .claude/harness/config/risk-policy.json');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('sudo env -i git restore governed is blocked', () => {
  const r = runGuard('sudo env -i git -C dir restore .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

// ═══════════════════════════════════════════════════════
// Group 33: CODEX R5 — env -S unresolvable dispatch
// ═══════════════════════════════════════════════════════
console.log('\nGroup 33: Codex R5 — env -S unresolvable dispatch');

test('env -S "bash -lc" with cp governed is blocked', () => {
  const r = runGuard('env -S "bash -lc" "cp /tmp/x .claude/harness/lib/evil.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('sudo env -S "bash -lc" with cp governed is blocked', () => {
  const r = runGuard('sudo env -S "bash -lc" "cp /tmp/x .claude/harness/lib/evil.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('command env -S "sudo bash -lc" with cp governed is blocked', () => {
  const r = runGuard('command env -S "sudo bash -lc" "cp /tmp/x .claude/harness/config/x.json"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('env -S with non-governed path is allowed', () => {
  const r = runGuard('env -S "bash -lc" "cp /tmp/x /tmp/y"');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

// ═══════════════════════════════════════════════════════
// Group 34: CODEX R6 — env -S git subcommand bypass
// ═══════════════════════════════════════════════════════
console.log('\nGroup 34: Codex R6 — env -S git subcommand bypass');

test('env -S "git restore governed" is blocked', () => {
  const r = runGuard('env -S "git restore .claude/harness/lib/write-guard.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('env -S "git checkout -- governed" is blocked', () => {
  const r = runGuard('env -S "git checkout -- .claude/harness/lib/write-guard.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('sudo env -S "git restore governed" is blocked', () => {
  const r = runGuard('sudo env -S "git restore .claude/harness/lib/write-guard.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('env -S "git clean -f governed" is blocked', () => {
  const r = runGuard('env -S "git clean -f .claude/harness/lib/write-guard.js"');
  const out = parseOutput(r);
  assert.ok(out, 'should produce output');
  assert.strictEqual(out.decision, 'block');
});

test('env -S "git status" is allowed (not a write subcommand)', () => {
  const r = runGuard('env -S "git status"');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

// ═══════════════════════════════════════════════════════
// Group 35: ALLOW — read-only still works
// ═══════════════════════════════════════════════════════
console.log('\nGroup 35: ALLOW — read-only still works after prefix removal');

test('cat governed file still allowed', () => {
  const r = runGuard('cat .claude/harness/lib/emit-event.js');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('grep in governed path still allowed', () => {
  const r = runGuard('grep -r "function" .claude/harness/lib/');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('node --check governed file still allowed', () => {
  const r = runGuard('node --check .claude/harness/lib/write-guard.js');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

test('node .claude/harness/tests/test.js still allowed (run, not write)', () => {
  const r = runGuard('node .claude/harness/tests/test-write-guard.js');
  const out = parseOutput(r);
  assert.strictEqual(out, null, 'no output means allow');
});

// ═══════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  - ' + f.name + ': ' + f.error);
  }
  process.exit(1);
}
console.log('All tests passed.');
