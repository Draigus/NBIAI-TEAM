#!/usr/bin/env node
'use strict';
// test-risk-classify.js — Tests for deterministic risk classification.
// Verifies precedence (BLOCKED > HIGH > LOW), confidence check, and fail-safe.

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
  } catch (e) {
    failed++;
    console.log('  FAIL: ' + name);
    console.log('        ' + e.message);
  }
}

function makeTempProject(policy) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-test-'));
  const configDir = path.join(tmpDir, '.claude', 'harness', 'config');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'risk-policy.json'), JSON.stringify(policy));
  return tmpDir;
}

function loadModule(projectDir) {
  const modPath = path.resolve(__dirname, '..', 'lib', 'risk-classify.js');
  // Clear require cache to get fresh module with new env
  delete require.cache[require.resolve(modPath)];
  const origDir = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = projectDir;
  const mod = require(modPath);
  process.env.CLAUDE_PROJECT_DIR = origDir || '';
  return mod;
}

const STANDARD_POLICY = {
  LOW: {
    rules: [
      { target: 'memory/feedback_*.md', constraint: 'additive_only', description: 'Feedback memories' },
      { target: 'memory/MEMORY.md', constraint: 'index_entry_only', description: 'Memory index' },
      { target: '.claude/harness/changelog.md', constraint: 'append_only', description: 'Changelog entries' }
    ]
  },
  HIGH: {
    rules: [
      { target: 'CLAUDE.md', description: 'Structural edits' },
      { target: '.claude/skills/**', action: 'create_or_delete', description: 'Skill creation/deletion' }
    ]
  },
  BLOCKED_TO_APPLY: {
    rules: [
      { target: '.claude/harness/config/**', description: 'Governance config' },
      { target: '.claude/harness/lib/**', description: 'Engine code' }
    ]
  }
};

function makeEvidence(count) {
  const evidence = [];
  for (let i = 0; i < count; i++) {
    evidence.push({ event_id: 'evt_' + i, type: 'tool_outcome', description: 'evidence ' + i });
  }
  return evidence;
}

console.log('risk-classify tests\n');

// -------------------------------------------------------------------
// 1. Memory file matches LOW
// -------------------------------------------------------------------
console.log('--- T1: LOW risk matching ---');
(function () {
  const tmpDir = makeTempProject(STANDARD_POLICY);
  const mod = loadModule(tmpDir);

  test('memory file matches LOW', function () {
    const result = mod.classify({ target_file: 'memory/feedback_test.md', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'LOW', 'expected LOW, got ' + result.risk);
    assert.ok(result.matched_rule, 'should have matched_rule');
  });

  test('changelog.md matches LOW', function () {
    const result = mod.classify({ target_file: '.claude/harness/changelog.md', evidence: makeEvidence(3) });
    assert.strictEqual(result.risk, 'LOW', 'expected LOW, got ' + result.risk);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// 2. CLAUDE.md matches HIGH
// -------------------------------------------------------------------
console.log('\n--- T2: HIGH risk matching ---');
(function () {
  const tmpDir = makeTempProject(STANDARD_POLICY);
  const mod = loadModule(tmpDir);

  test('CLAUDE.md matches HIGH', function () {
    const result = mod.classify({ target_file: 'CLAUDE.md', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'HIGH', 'expected HIGH, got ' + result.risk);
  });

  test('skill file matches HIGH', function () {
    const result = mod.classify({ target_file: '.claude/skills/test/SKILL.md', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'HIGH', 'expected HIGH, got ' + result.risk);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// 3. Harness config matches BLOCKED_TO_APPLY
// -------------------------------------------------------------------
console.log('\n--- T3: BLOCKED_TO_APPLY matching ---');
(function () {
  const tmpDir = makeTempProject(STANDARD_POLICY);
  const mod = loadModule(tmpDir);

  test('harness config matches BLOCKED_TO_APPLY', function () {
    const result = mod.classify({ target_file: '.claude/harness/config/risk-policy.json', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'BLOCKED_TO_APPLY', 'expected BLOCKED_TO_APPLY, got ' + result.risk);
  });

  test('harness lib matches BLOCKED_TO_APPLY', function () {
    const result = mod.classify({ target_file: '.claude/harness/lib/emit-event.js', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'BLOCKED_TO_APPLY', 'expected BLOCKED_TO_APPLY, got ' + result.risk);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// 4. Precedence: BLOCKED > HIGH > LOW when multiple rules match
// -------------------------------------------------------------------
console.log('\n--- T4: Precedence ---');
(function () {
  // Create a policy where a path matches rules in multiple tiers
  const overlapPolicy = {
    LOW: { rules: [{ target: '.claude/harness/**', description: 'catches all harness' }] },
    HIGH: { rules: [{ target: '.claude/harness/config/**', description: 'catches config' }] },
    BLOCKED_TO_APPLY: { rules: [{ target: '.claude/harness/config/risk-policy.json', description: 'catches specific file' }] }
  };
  const tmpDir = makeTempProject(overlapPolicy);
  const mod = loadModule(tmpDir);

  test('BLOCKED_TO_APPLY wins over HIGH and LOW', function () {
    const result = mod.classify({ target_file: '.claude/harness/config/risk-policy.json', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'BLOCKED_TO_APPLY', 'BLOCKED should win, got ' + result.risk);
  });

  test('HIGH wins over LOW', function () {
    const result = mod.classify({ target_file: '.claude/harness/config/other.json', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'HIGH', 'HIGH should win over LOW, got ' + result.risk);
  });

  test('LOW applies when no higher match', function () {
    const result = mod.classify({ target_file: '.claude/harness/data/event.jsonl', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'LOW', 'LOW should apply, got ' + result.risk);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// 5. < 3 evidence events forces HIGH regardless of target
// -------------------------------------------------------------------
console.log('\n--- T5: Confidence check ---');
(function () {
  const tmpDir = makeTempProject(STANDARD_POLICY);
  const mod = loadModule(tmpDir);

  test('< 3 evidence forces HIGH even for LOW target', function () {
    const result = mod.classify({ target_file: 'memory/feedback_test.md', evidence: makeEvidence(2) });
    assert.strictEqual(result.risk, 'HIGH', 'expected HIGH due to low confidence, got ' + result.risk);
    assert.ok(result.reason.toLowerCase().includes('confidence') || result.reason.toLowerCase().includes('evidence'),
      'reason should mention confidence/evidence: ' + result.reason);
  });

  test('0 evidence forces HIGH', function () {
    const result = mod.classify({ target_file: 'memory/feedback_test.md', evidence: [] });
    assert.strictEqual(result.risk, 'HIGH', 'expected HIGH for 0 evidence, got ' + result.risk);
  });

  test('exactly 3 evidence stays LOW', function () {
    const result = mod.classify({ target_file: 'memory/feedback_test.md', evidence: makeEvidence(3) });
    assert.strictEqual(result.risk, 'LOW', 'expected LOW for 3 evidence, got ' + result.risk);
  });

  test('< 3 evidence does NOT override BLOCKED_TO_APPLY', function () {
    const result = mod.classify({ target_file: '.claude/harness/config/test.json', evidence: makeEvidence(1) });
    assert.strictEqual(result.risk, 'BLOCKED_TO_APPLY', 'BLOCKED should not be downgraded by confidence, got ' + result.risk);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// 6. Unknown target returns HIGH (fail safe)
// -------------------------------------------------------------------
console.log('\n--- T6: Fail safe ---');
(function () {
  const tmpDir = makeTempProject(STANDARD_POLICY);
  const mod = loadModule(tmpDir);

  test('unknown target returns HIGH', function () {
    const result = mod.classify({ target_file: 'some/random/file.txt', evidence: makeEvidence(10) });
    assert.strictEqual(result.risk, 'HIGH', 'unknown target should be HIGH, got ' + result.risk);
    assert.ok(result.reason.includes('no matching rule'), 'reason should say no matching rule: ' + result.reason);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// 7. Missing/corrupt policy fails safe
// -------------------------------------------------------------------
console.log('\n--- T7: Missing policy ---');
(function () {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-test-'));
  // No config dir, no policy file
  const mod = loadModule(tmpDir);

  test('missing risk-policy.json returns BLOCKED_TO_APPLY', function () {
    const result = mod.classify({ target_file: 'memory/feedback_test.md', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'BLOCKED_TO_APPLY', 'missing policy should be BLOCKED, got ' + result.risk);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// 8. Case-insensitive path matching
// -------------------------------------------------------------------
console.log('\n--- T8: Case insensitive ---');
(function () {
  const tmpDir = makeTempProject(STANDARD_POLICY);
  const mod = loadModule(tmpDir);

  test('uppercase CLAUDE.MD matches HIGH', function () {
    const result = mod.classify({ target_file: 'CLAUDE.MD', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'HIGH', 'case-insensitive match expected HIGH, got ' + result.risk);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
