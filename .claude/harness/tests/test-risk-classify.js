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
  const resolvePath = path.resolve(__dirname, '..', 'lib', 'resolve.js');
  delete require.cache[require.resolve(resolvePath)];
  delete require.cache[require.resolve(modPath)];
  const origDir = process.env.CLAUDE_PROJECT_DIR;
  const origHarness = process.env.HARNESS_DIR;
  process.env.CLAUDE_PROJECT_DIR = projectDir;
  process.env.HARNESS_DIR = path.join(projectDir, '.claude', 'harness');
  const mod = require(modPath);
  process.env.CLAUDE_PROJECT_DIR = origDir || '';
  if (origHarness === undefined) delete process.env.HARNESS_DIR;
  else process.env.HARNESS_DIR = origHarness;
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
// 8. Operation-aware classification (Phase 1)
// -------------------------------------------------------------------
console.log('\n--- T8: Operation-aware classification ---');
(function () {
  const opPolicy = {
    LOW: {
      rules: [
        { target: '.claude/skills/**/SKILL.md', constraint: 'additive_only', mode: 'edit_existing_only', description: 'Skill edits' },
        { target: 'roles/*/AGENT.md', constraint: 'knowledge_section_only', mode: 'edit_existing_only', description: 'Role knowledge edits' },
        { target: 'memory/feedback_*.md', constraint: 'frontmatter_schema_required', mode: 'create_new_or_edit_existing', description: 'Feedback memories' },
        { target: 'memory/MEMORY.md', constraint: 'index_entry_only', mode: 'append_only', description: 'Memory index' }
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
  const tmpDir = makeTempProject(opPolicy);
  const mod = loadModule(tmpDir);

  test('T-RC1: skill edit reaches LOW', function () {
    const result = mod.classify({ target_file: '.claude/skills/compile-bank/SKILL.md', operation: 'edit', evidence: makeEvidence(3) });
    assert.strictEqual(result.risk, 'LOW', 'expected LOW, got ' + result.risk);
    assert.strictEqual(result.matched_rule.constraint, 'additive_only', 'expected additive_only constraint');
  });

  test('T-RC2: skill create reaches HIGH', function () {
    const result = mod.classify({ target_file: '.claude/skills/new-skill/SKILL.md', operation: 'create', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'HIGH', 'expected HIGH, got ' + result.risk);
    assert.strictEqual(result.matched_rule.action, 'create_or_delete', 'should match create_or_delete rule');
  });

  test('T-RC3: skill delete reaches HIGH', function () {
    const result = mod.classify({ target_file: '.claude/skills/old-skill/SKILL.md', operation: 'delete', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'HIGH', 'expected HIGH, got ' + result.risk);
    assert.strictEqual(result.matched_rule.action, 'create_or_delete', 'should match create_or_delete rule');
  });

  test('T-RC4: AGENT.md edit reaches LOW', function () {
    const result = mod.classify({ target_file: 'roles/senior_engineer/AGENT.md', operation: 'edit', evidence: makeEvidence(3) });
    assert.strictEqual(result.risk, 'LOW', 'expected LOW, got ' + result.risk);
    assert.strictEqual(result.matched_rule.constraint, 'knowledge_section_only', 'expected knowledge_section_only constraint');
  });

  test('T-RC5: AGENT.md create reaches LOW (gate blocks via mode)', function () {
    const result = mod.classify({ target_file: 'roles/new_role/AGENT.md', operation: 'create', evidence: makeEvidence(3) });
    assert.strictEqual(result.risk, 'LOW', 'expected LOW — gate enforces mode, not classifier');
    assert.strictEqual(result.matched_rule.mode, 'edit_existing_only', 'mode should be edit_existing_only for gate to block');
  });

  test('T-RC6: no operation param matches action-backed HIGH rule (backward compat)', function () {
    // The real backward compat test: HIGH rule has action: create_or_delete,
    // no operation provided. Must still match HIGH, not fall through to LOW.
    const result = mod.classify({ target_file: '.claude/skills/test/SKILL.md', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'HIGH', 'action-backed HIGH must match when operation is undefined, got ' + result.risk);
    assert.strictEqual(result.matched_rule.action, 'create_or_delete', 'should match the action-backed rule');
  });

  test('T-RC7: all existing tests still pass with operation-aware code', function () {
    // Verify basic LOW/HIGH/BLOCKED still work with no operation
    const lowResult = mod.classify({ target_file: 'memory/feedback_test.md', evidence: makeEvidence(5) });
    assert.strictEqual(lowResult.risk, 'LOW', 'LOW backward compat');
    const highResult = mod.classify({ target_file: 'CLAUDE.md', evidence: makeEvidence(5) });
    assert.strictEqual(highResult.risk, 'HIGH', 'HIGH backward compat');
    const blockedResult = mod.classify({ target_file: '.claude/harness/config/test.json', evidence: makeEvidence(5) });
    assert.strictEqual(blockedResult.risk, 'BLOCKED_TO_APPLY', 'BLOCKED backward compat');
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// 9. actionMatches function edge cases
// -------------------------------------------------------------------
console.log('\n--- T9: actionMatches edge cases ---');
(function () {
  const tmpDir = makeTempProject(STANDARD_POLICY);
  const mod = loadModule(tmpDir);

  test('actionMatches: no action field matches all operations', function () {
    assert.strictEqual(mod.actionMatches(undefined, 'edit'), true);
    assert.strictEqual(mod.actionMatches(undefined, 'create'), true);
    assert.strictEqual(mod.actionMatches(undefined, 'delete'), true);
    assert.strictEqual(mod.actionMatches(undefined, undefined), true);
  });

  test('actionMatches: unknown action string fails closed', function () {
    assert.strictEqual(mod.actionMatches('some_unknown_action', 'edit'), false);
    assert.strictEqual(mod.actionMatches('create_or_delete', 'edit'), false);
  });

  test('actionMatches: create_or_delete matches create and delete only', function () {
    assert.strictEqual(mod.actionMatches('create_or_delete', 'create'), true);
    assert.strictEqual(mod.actionMatches('create_or_delete', 'delete'), true);
    assert.strictEqual(mod.actionMatches('create_or_delete', 'edit'), false);
    assert.strictEqual(mod.actionMatches('create_or_delete', 'append'), false);
  });

  test('actionMatches: create_or_edit matches create and edit only', function () {
    assert.strictEqual(mod.actionMatches('create_or_edit', 'create'), true);
    assert.strictEqual(mod.actionMatches('create_or_edit', 'edit'), true);
    assert.strictEqual(mod.actionMatches('create_or_edit', 'delete'), false);
  });

  test('actionMatches: undefined operation matches all (backward compat)', function () {
    assert.strictEqual(mod.actionMatches('create_or_delete', undefined), true);
  });

  test('actionMatches: null operation does not match action-backed rule', function () {
    // null is not undefined — only undefined triggers backward compat
    assert.strictEqual(mod.actionMatches('create_or_delete', null), false);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// 10. Action-only rules (no target) are skipped by findMatch
// -------------------------------------------------------------------
console.log('\n--- T10: Action-only rules skipped ---');
(function () {
  const actionOnlyPolicy = {
    LOW: {
      rules: [
        { action: 'flag_stale_memory', description: 'Flagging stale memories' },
        { target: 'memory/feedback_*.md', constraint: 'additive_only', description: 'Feedback memories' }
      ]
    },
    HIGH: { rules: [] },
    BLOCKED_TO_APPLY: { rules: [] }
  };
  const tmpDir = makeTempProject(actionOnlyPolicy);
  const mod = loadModule(tmpDir);

  test('action-only rules skipped — target-based rule still matches', function () {
    const result = mod.classify({ target_file: 'memory/feedback_test.md', operation: 'edit', evidence: makeEvidence(3) });
    assert.strictEqual(result.risk, 'LOW', 'should match target-based rule, not action-only');
    assert.strictEqual(result.matched_rule.target, 'memory/feedback_*.md', 'matched correct rule');
  });

  test('no target rules match arbitrary path — falls to fail safe', function () {
    const result = mod.classify({ target_file: 'some/random/path.md', operation: 'edit', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'HIGH', 'no match should fail safe to HIGH');
    assert.strictEqual(result.matched_rule, null, 'no rule matched');
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// 11. Policy validation — unknown action strings
// -------------------------------------------------------------------
console.log('\n--- T11: Policy validation ---');
(function () {
  const typoPolicy = {
    LOW: {
      rules: [
        { target: '.claude/skills/**/SKILL.md', constraint: 'additive_only', description: 'Skill edits' }
      ]
    },
    HIGH: {
      rules: [
        { target: '.claude/skills/**', action: 'create_or_delte', description: 'Typo in action' }
      ]
    },
    BLOCKED_TO_APPLY: { rules: [] }
  };
  const tmpDir = makeTempProject(typoPolicy);
  const mod = loadModule(tmpDir);

  test('policy with unknown action string returns BLOCKED_TO_APPLY', function () {
    const result = mod.classify({ target_file: '.claude/skills/test/SKILL.md', operation: 'create', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'BLOCKED_TO_APPLY', 'typo in action should fail closed, got ' + result.risk);
    assert.ok(result.reason.includes('create_or_delte'), 'reason should mention the bad action string');
  });

  test('validatePolicyActions catches unknown action', function () {
    const check = mod.validatePolicyActions(typoPolicy);
    assert.strictEqual(check.valid, false, 'should be invalid');
    assert.ok(check.reason.includes('create_or_delte'), 'should name the bad action');
  });

  test('validatePolicyActions passes clean policy', function () {
    const cleanPolicy = {
      LOW: { rules: [{ target: 'test.md', constraint: 'additive_only' }] },
      HIGH: { rules: [{ target: '.claude/skills/**', action: 'create_or_delete' }] },
      BLOCKED_TO_APPLY: { rules: [] }
    };
    const check = mod.validatePolicyActions(cleanPolicy);
    assert.strictEqual(check.valid, true, 'clean policy should pass');
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// 12. Overlapping rules — no operation backward compat end-to-end
// -------------------------------------------------------------------
console.log('\n--- T12: Overlapping rules backward compat ---');
(function () {
  const overlapPolicy = {
    LOW: {
      rules: [
        { target: '.claude/skills/**/SKILL.md', constraint: 'additive_only', description: 'Skill edits' }
      ]
    },
    HIGH: {
      rules: [
        { target: '.claude/skills/**', action: 'create_or_delete', description: 'Skill creation/deletion' }
      ]
    },
    BLOCKED_TO_APPLY: { rules: [] }
  };
  const tmpDir = makeTempProject(overlapPolicy);
  const mod = loadModule(tmpDir);

  test('no operation + overlapping action HIGH rule = HIGH (not LOW fallthrough)', function () {
    const result = mod.classify({ target_file: '.claude/skills/test/SKILL.md', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'HIGH', 'must not fall through to LOW when operation is undefined');
  });

  test('edit operation + overlapping action HIGH rule = LOW (action skipped)', function () {
    const result = mod.classify({ target_file: '.claude/skills/test/SKILL.md', operation: 'edit', evidence: makeEvidence(3) });
    assert.strictEqual(result.risk, 'LOW', 'edit should skip create_or_delete HIGH rule');
  });

  test('create operation + overlapping action HIGH rule = HIGH (action matches)', function () {
    const result = mod.classify({ target_file: '.claude/skills/test/SKILL.md', operation: 'create', evidence: makeEvidence(5) });
    assert.strictEqual(result.risk, 'HIGH', 'create should match create_or_delete HIGH rule');
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
})();

// -------------------------------------------------------------------
// 13. Case-insensitive path matching
// -------------------------------------------------------------------
console.log('\n--- T13: Case insensitive ---');
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
