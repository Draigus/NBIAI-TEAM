#!/usr/bin/env node
'use strict';
// test-apply-gate.js — Tests for apply-gate.js and proposal-utils.js.
// Covers T-AG1 through T-AG36 from phase1-apply-gate-hardening-plan.md.

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

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

// --- Test constants ---

const EV1 = 'evt_01AAAAAAAAAAAAAAAAAAAAAA';
const EV2 = 'evt_02BBBBBBBBBBBBBBBBBBBBBB';
const EV3 = 'evt_03CCCCCCCCCCCCCCCCCCCCCC';
const EVIDENCE = [EV1, EV2, EV3];

const PROD_POLICY = {
  LOW: {
    rules: [
      { target: '.claude/skills/**/SKILL.md', constraint: 'additive_only', mode: 'edit_existing_only', description: 'skill edits' },
      { target: 'roles/*/AGENT.md', constraint: 'knowledge_section_only', mode: 'edit_existing_only', description: 'role edits' },
      { target: 'memory/feedback_*.md', constraint: 'frontmatter_schema_required', mode: 'create_new_or_edit_existing', description: 'feedback' },
      { target: 'memory/MEMORY.md', constraint: 'index_entry_only', mode: 'append_only', description: 'index' },
      { target: '.claude/harness/changelog.md', constraint: 'append_only', description: 'changelog' }
    ]
  },
  HIGH: {
    rules: [
      { target: 'CLAUDE.md', description: 'structural' },
      { target: '.claude/skills/**', action: 'create_or_delete', description: 'skill create/delete' },
      { condition: 'confidence_below_70', description: 'low confidence' }
    ]
  },
  BLOCKED_TO_APPLY: {
    rules: [
      { target: '.claude/harness/config/**', description: 'config' },
      { target: '.claude/harness/lib/**', description: 'engine' }
    ]
  }
};

const SECTION_BOUNDARIES = {
  knowledge_section_headings: [
    '## Domain Knowledge', '## Known Issues', '## Common Patterns',
    '## Reference Data', '## Industry Context', '## Technical Notes'
  ],
  heading_level_boundary: '##'
};

// --- Helpers ---

var origDir = process.env.CLAUDE_PROJECT_DIR || '';

function makeTempProject(opts) {
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-test-'));
  var configDir = path.join(tmpDir, '.claude', 'harness', 'config');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'risk-policy.json'),
    JSON.stringify((opts && opts.policy) || PROD_POLICY));
  fs.writeFileSync(path.join(configDir, 'section-boundaries.json'),
    JSON.stringify(SECTION_BOUNDARIES));
  var evDir = path.join(tmpDir, '.claude', 'harness', 'data', 'events', '2026-06-17');
  fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(path.join(evDir, 'session.jsonl'),
    EVIDENCE.map(function(id) { return JSON.stringify({ event_id: id }); }).join('\n') + '\n');
  fs.mkdirSync(path.join(tmpDir, 'memory'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, '.claude', 'skills', 'test-skill'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'roles', 'test-role'), { recursive: true });
  return tmpDir;
}

function loadGate(projectDir) {
  var gp = path.resolve(__dirname, '..', 'lib', 'apply-gate.js');
  var up = path.resolve(__dirname, '..', 'lib', 'proposal-utils.js');
  var cp = path.resolve(__dirname, '..', 'lib', 'risk-classify.js');
  delete require.cache[require.resolve(gp)];
  delete require.cache[require.resolve(up)];
  delete require.cache[require.resolve(cp)];
  process.env.CLAUDE_PROJECT_DIR = projectDir;
  require(up);
  require(cp);
  return require(gp);
}

function loadUtils(projectDir) {
  var up = path.resolve(__dirname, '..', 'lib', 'proposal-utils.js');
  delete require.cache[require.resolve(up)];
  process.env.CLAUDE_PROJECT_DIR = projectDir || origDir;
  return require(up);
}

function computeHash(p) {
  var c = Object.assign({}, p);
  c.content_hash = '';
  var s = {};
  Object.keys(c).sort().forEach(function(k) { s[k] = c[k]; });
  return 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(s), 'utf8').digest('hex');
}

function makeP(f) {
  var p = {
    proposal_id: f.proposal_id || 'P_TEST',
    target_file: f.target_file,
    operation: f.operation,
    content: f.content || '',
    content_hash: '',
    evidence: f.evidence || EVIDENCE.slice(),
    risk: f.risk || 'LOW',
    constraint: f.constraint
  };
  p.content_hash = f.content_hash || computeHash(p);
  return p;
}

function writeP(dir, p) {
  var fp = path.join(dir, 'proposal.json');
  fs.writeFileSync(fp, JSON.stringify(p));
  return fp;
}

var VALID_FM = '---\nname: test-fb\ndescription: A test feedback memory\nmetadata:\n  type: feedback\nsource: harness_rho\nauto_generated: true\ngenerated_by: P_TEST\n---\nBody content.\n';

var AGENT_OLD = '# Test Role\n\n## Core Responsibilities\n- Primary duties\n\n## Domain Knowledge\n- Industry expertise\n\n## Communication Style\n- Direct and clear\n';

var SKILL_OLD = 'Line 1\nLine 2\nLine 3\n';

// ===================================================================
console.log('apply-gate + proposal-utils tests\n');

// -------------------------------------------------------------------
// 1. Proposal-utils: content hash
// -------------------------------------------------------------------
console.log('--- T-PU: Content Hash ---');

(function() {
  var pu = loadUtils();

  test('T-PU1: canonicalJson sorts keys and blanks content_hash', function() {
    var cj = pu.canonicalJson({ z: 1, a: 2, content_hash: 'old' });
    var parsed = JSON.parse(cj);
    var keys = Object.keys(parsed);
    assert.strictEqual(keys[0], 'a');
    assert.strictEqual(keys[keys.length - 1], 'z');
    assert.strictEqual(parsed.content_hash, '');
  });

  test('T-PU2: computeContentHash produces sha256: prefix', function() {
    var h = pu.computeContentHash({ x: 1, content_hash: '' });
    assert.ok(h.startsWith('sha256:'));
    assert.strictEqual(h.length, 7 + 64);
  });

  test('T-PU3: verifyContentHash passes correct hash', function() {
    var p = { x: 1, content_hash: '' };
    p.content_hash = pu.computeContentHash(p);
    assert.deepStrictEqual(pu.verifyContentHash(p), { valid: true });
  });

  test('T-PU4: verifyContentHash fails wrong hash', function() {
    var p = { x: 1, content_hash: 'sha256:' + '0'.repeat(64) };
    var r = pu.verifyContentHash(p);
    assert.strictEqual(r.valid, false);
    assert.ok(r.reason.includes('mismatch'));
  });

  test('T-PU5: verifyContentHash fails missing hash', function() {
    assert.strictEqual(pu.verifyContentHash({ x: 1 }).valid, false);
  });

  test('T-AG31: hash stability across key insertion order', function() {
    var a = { proposal_id: 'P1', target_file: 'a.md', operation: 'create',
      content: 'x', content_hash: '', evidence: [], risk: 'LOW', constraint: 'c' };
    var b = { constraint: 'c', content: 'x', evidence: [], operation: 'create',
      proposal_id: 'P1', risk: 'LOW', target_file: 'a.md', content_hash: '' };
    assert.strictEqual(pu.computeContentHash(a), pu.computeContentHash(b));
  });
})();

// -------------------------------------------------------------------
// 2. Proposal-utils: schema validation
// -------------------------------------------------------------------
console.log('\n--- T-PU: Schema ---');

(function() {
  var pu = loadUtils();

  test('T-PU6: valid schema passes', function() {
    var p = makeP({ target_file: 'a.md', operation: 'create', content: 'x', constraint: 'c' });
    assert.deepStrictEqual(pu.validateProposalSchema(p), { valid: true });
  });

  test('T-PU7: missing required field fails', function() {
    assert.strictEqual(pu.validateProposalSchema({ proposal_id: 'P1' }).valid, false);
  });

  test('T-PU8: invalid operation fails', function() {
    var p = makeP({ target_file: 'a.md', operation: 'create', content: 'x', constraint: 'c' });
    p.operation = 'destroy';
    p.content_hash = computeHash(p);
    assert.strictEqual(pu.validateProposalSchema(p).valid, false);
  });

  test('T-PU9: invalid risk fails', function() {
    var p = makeP({ target_file: 'a.md', operation: 'create', content: 'x',
      risk: 'MEDIUM', constraint: 'c' });
    assert.strictEqual(pu.validateProposalSchema(p).valid, false);
  });
})();

// -------------------------------------------------------------------
// 3. Proposal-utils: evidence ID format
// -------------------------------------------------------------------
console.log('\n--- T-PU: Evidence Format ---');

(function() {
  var pu = loadUtils();

  test('T-PU10: extractEvidenceId bare ID', function() {
    assert.strictEqual(pu.extractEvidenceId(EV1), EV1);
  });

  test('T-PU11: extractEvidenceId suffixed ID', function() {
    assert.strictEqual(pu.extractEvidenceId(EV1 + ':intervention:2026-06-17'), EV1);
  });

  test('T-PU12: validateEvidenceId valid', function() {
    assert.strictEqual(pu.validateEvidenceId(EV1), true);
  });

  test('T-PU13: validateEvidenceId no evt_ prefix', function() {
    assert.strictEqual(pu.validateEvidenceId('01AAAAAAAAAAAAAAAAAAAAAA'), false);
  });

  test('T-PU14: validateEvidenceId invalid Crockford chars (I/L/O/U)', function() {
    assert.strictEqual(pu.validateEvidenceId('evt_01IIIIIIIIIIIIIIIIIIIIII'), false);
  });
})();

// -------------------------------------------------------------------
// 4. Constraint validators (unit tests via exported functions)
// -------------------------------------------------------------------
console.log('\n--- Constraint Validators ---');

(function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);

  // additive_only
  test('T-CV1: additive_only passes lines added', function() {
    assert.strictEqual(gate.validateAdditiveOnly('A\nB\n', 'A\nX\nB\n'), null);
  });

  test('T-CV2: additive_only fails line removed', function() {
    var r = gate.validateAdditiveOnly('A\nB\nC\n', 'A\nC\n');
    assert.ok(r !== null);
    assert.ok(r.includes('removed or modified'));
  });

  test('T-CV3: additive_only passes lines appended', function() {
    assert.strictEqual(gate.validateAdditiveOnly('A\nB\n', 'A\nB\nC\n'), null);
  });

  test('T-CV4: additive_only passes no old content (create)', function() {
    assert.strictEqual(gate.validateAdditiveOnly(null, 'new file\n'), null);
  });

  // knowledge_section_only
  test('T-AG5 unit: change under allowed heading passes', function() {
    var newC = '# Test Role\n\n## Core Responsibilities\n- Primary duties\n\n## Domain Knowledge\n- Industry expertise\n- New entry\n\n## Communication Style\n- Direct and clear\n';
    assert.strictEqual(gate.validateKnowledgeSectionOnly(AGENT_OLD, newC), null);
  });

  test('T-AG6 unit: change under non-allowed heading fails', function() {
    var newC = '# Test Role\n\n## Core Responsibilities\n- Primary duties\n- New duty\n\n## Domain Knowledge\n- Industry expertise\n\n## Communication Style\n- Direct and clear\n';
    var r = gate.validateKnowledgeSectionOnly(AGENT_OLD, newC);
    assert.ok(r !== null);
    assert.ok(r.includes('non-knowledge section'));
  });

  test('T-AG7 unit: heading renamed = section removed', function() {
    var newC = '# Test Role\n\n## Core Responsibilities\n- Primary duties\n\n## Deep Knowledge\n- Industry expertise\n\n## Communication Style\n- Direct and clear\n';
    var r = gate.validateKnowledgeSectionOnly(AGENT_OLD, newC);
    assert.ok(r !== null);
    assert.ok(r.includes('removed'));
  });

  test('T-AG8 unit: no section headings fails closed', function() {
    var r = gate.validateKnowledgeSectionOnly('plain text\n', 'different text\n');
    assert.ok(r !== null);
    assert.ok(r.includes('no section headings'));
  });

  test('preamble change before first heading blocked', function() {
    var oldC = '---\nrole: engineer\n---\n# Role\n\n## Domain Knowledge\n- K\n';
    var newC = '---\nrole: admin\n---\n# Role\n\n## Domain Knowledge\n- K\n';
    var r = gate.validateKnowledgeSectionOnly(oldC, newC);
    assert.ok(r !== null);
    assert.ok(r.includes('before first heading'));
  });

  test('duplicate heading fails closed', function() {
    var oldC = '# Role\n\n## Core Responsibilities\n- A\n\n## Domain Knowledge\n- K\n\n## Core Responsibilities\n- B\n';
    var newC = '# Role\n\n## Core Responsibilities\n- Changed\n\n## Domain Knowledge\n- K\n\n## Core Responsibilities\n- B\n';
    var r = gate.validateKnowledgeSectionOnly(oldC, newC);
    assert.ok(r !== null);
    assert.ok(r.includes('duplicate heading'));
  });

  test('no-heading old rewritten to headed format blocked', function() {
    var oldC = 'plain preamble\n';
    var newC = '## Domain Knowledge\n- new entry\n';
    var r = gate.validateKnowledgeSectionOnly(oldC, newC);
    assert.ok(r !== null, 'expected fail-closed for headingless old file');
  });

  test('type: under wrong YAML key blocked', function() {
    var c = '---\nname: x\ndescription: y\nmetadata:\nother:\n  type: feedback\nsource: harness_rho\nauto_generated: true\ngenerated_by: P\n---\nBody.\n';
    var r = gate.validateFrontmatterSchema(c, 'create');
    assert.ok(r !== null, 'type: under other: should fail');
    assert.ok(r.includes('metadata.type'));
  });

  // frontmatter_schema_required
  test('T-CV8: valid frontmatter passes', function() {
    assert.strictEqual(gate.validateFrontmatterSchema(VALID_FM, 'create'), null);
  });

  test('T-AG9: frontmatter missing name', function() {
    var c = '---\ndescription: Test\nmetadata:\n  type: feedback\nsource: harness_rho\nauto_generated: true\ngenerated_by: P_TEST\n---\nBody.\n';
    assert.ok(gate.validateFrontmatterSchema(c, 'create') !== null);
  });

  test('T-AG10: frontmatter missing generated_by', function() {
    var c = '---\nname: test\ndescription: Test\nmetadata:\n  type: feedback\nsource: harness_rho\nauto_generated: true\n---\nBody.\n';
    assert.ok(gate.validateFrontmatterSchema(c, 'create') !== null);
  });

  test('T-AG11: frontmatter source removed on edit', function() {
    var c = '---\nname: test\ndescription: Test\nmetadata:\n  type: feedback\nauto_generated: true\ngenerated_by: P_TEST\n---\nBody.\n';
    assert.ok(gate.validateFrontmatterSchema(c, 'edit') !== null);
  });

  test('frontmatter without metadata: header fails', function() {
    var c = '---\nname: test\ndescription: Test\ntype: feedback\nsource: harness_rho\nauto_generated: true\ngenerated_by: P_TEST\n---\nBody.\n';
    var r = gate.validateFrontmatterSchema(c, 'create');
    assert.ok(r !== null, 'expected failure for missing metadata: header');
  });

  // index_entry_only
  test('T-CV10: valid index entry passes', function() {
    assert.strictEqual(gate.validateIndexEntryOnly('- [Title](file.md) — description\n'), null);
  });

  test('T-AG12: index entry wrong dash', function() {
    var r = gate.validateIndexEntryOnly('- [Title](file.md) -- description\n');
    assert.ok(r !== null);
    assert.ok(r.includes('format invalid'));
  });

  test('T-AG13: index entry path traversal caught by regex', function() {
    assert.ok(gate.validateIndexEntryOnly('- [T](../../etc/passwd.md) — x\n') !== null);
  });

  test('T-CV11: index entry multi-line fails', function() {
    var r = gate.validateIndexEntryOnly('- [A](a.md) — x\n- [B](b.md) — y\n');
    assert.ok(r !== null);
    assert.ok(r.includes('one line'));
  });

  // runConstraintValidator edge cases
  test('T-AG20 unit: unknown constraint blocked', function() {
    var r = gate.runConstraintValidator('foobar', '', '', 'edit');
    assert.ok(r !== null);
    assert.strictEqual(r.code, 'blocked_unknown_constraint');
  });

  test('T-AG21 unit: missing constraint blocked', function() {
    var r = gate.runConstraintValidator(undefined, '', '', 'edit');
    assert.ok(r !== null);
    assert.strictEqual(r.code, 'blocked_missing_constraint');
  });

  test('T-AG21b unit: null constraint blocked', function() {
    var r = gate.runConstraintValidator(null, '', '', 'edit');
    assert.ok(r !== null);
    assert.strictEqual(r.code, 'blocked_missing_constraint');
  });
})();

// -------------------------------------------------------------------
// 5. Path utilities
// -------------------------------------------------------------------
console.log('\n--- Path Utilities ---');

(function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);

  test('canonicalize normalises slashes', function() {
    var r = gate.canonicalize('memory\\feedback_test.md');
    assert.strictEqual(r, 'memory/feedback_test.md');
  });

  test('canonicalize clamps traversal to project root', function() {
    assert.strictEqual(gate.canonicalize('../../../etc/passwd'), 'etc/passwd');
  });

  test('canonicalize rejects pure traversal (empty result)', function() {
    assert.strictEqual(gate.canonicalize('../../..'), null);
  });

  test('canonicalize resolves dot segments', function() {
    assert.strictEqual(gate.canonicalize('./memory/../memory/test.md'), 'memory/test.md');
  });

  test('isGovernedPath detects harness lib', function() {
    assert.ok(gate.isGovernedPath('.claude/harness/lib/apply-gate.js') !== null);
  });

  test('isGovernedPath allows memory/', function() {
    assert.strictEqual(gate.isGovernedPath('memory/feedback_test.md'), null);
  });

  test('checkModeEnforcement edit on edit_existing_only passes', function() {
    assert.strictEqual(gate.checkModeEnforcement('edit_existing_only', 'edit'), null);
  });

  test('checkModeEnforcement create on edit_existing_only fails', function() {
    assert.ok(gate.checkModeEnforcement('edit_existing_only', 'create') !== null);
  });

  test('checkModeEnforcement append on append_only passes', function() {
    assert.strictEqual(gate.checkModeEnforcement('append_only', 'append'), null);
  });

  test('checkModeEnforcement null mode passes (no restriction)', function() {
    assert.strictEqual(gate.checkModeEnforcement(null, 'create'), null);
  });
})();

// -------------------------------------------------------------------
// 6. Apply gate integration: success cases
// -------------------------------------------------------------------
console.log('\n--- Apply Gate: Success ---');

test('T-AG1: valid create memory with frontmatter', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: 'memory/feedback_test.md', operation: 'create',
    content: VALID_FM, constraint: 'frontmatter_schema_required' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, true, 'expected ok: ' + JSON.stringify(r));
  var written = fs.readFileSync(path.join(tmpDir, 'memory', 'feedback_test.md'), 'utf8');
  assert.strictEqual(written, VALID_FM);
});

test('T-AG2: valid append to MEMORY.md', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'memory', 'MEMORY.md'), '# Memory Index\n');
  var entry = '- [Test](test.md) — Test description\n';
  var p = makeP({ target_file: 'memory/MEMORY.md', operation: 'append',
    content: entry, constraint: 'index_entry_only' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, true, 'expected ok: ' + JSON.stringify(r));
  var final = fs.readFileSync(path.join(tmpDir, 'memory', 'MEMORY.md'), 'utf8');
  assert.ok(final.endsWith(entry), 'file should end with appended entry');
});

test('T-AG3: valid edit skill additive only', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, '.claude', 'skills', 'test-skill', 'SKILL.md'), SKILL_OLD);
  var newC = 'Line 1\nNew line\nLine 2\nLine 3\n';
  var p = makeP({ target_file: '.claude/skills/test-skill/SKILL.md', operation: 'edit',
    content: newC, constraint: 'additive_only' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, true, 'expected ok: ' + JSON.stringify(r));
  assert.strictEqual(fs.readFileSync(path.join(tmpDir, '.claude', 'skills', 'test-skill', 'SKILL.md'), 'utf8'), newC);
});

test('T-AG5: edit AGENT.md under allowed heading', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'roles', 'test-role', 'AGENT.md'), AGENT_OLD);
  var newC = '# Test Role\n\n## Core Responsibilities\n- Primary duties\n\n## Domain Knowledge\n- Industry expertise\n- New knowledge entry\n\n## Communication Style\n- Direct and clear\n';
  var p = makeP({ target_file: 'roles/test-role/AGENT.md', operation: 'edit',
    content: newC, constraint: 'knowledge_section_only' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, true, 'expected ok: ' + JSON.stringify(r));
});

test('T-AG23: evidence suffixed format passes', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var suffixed = [EV1 + ':intervention:2026-06-17', EV2 + ':tool_outcome:2026-06-17', EV3 + ':skill:2026-06-17'];
  var p = makeP({ target_file: 'memory/feedback_suf.md', operation: 'create',
    content: VALID_FM, constraint: 'frontmatter_schema_required', evidence: suffixed });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, true, 'expected ok: ' + JSON.stringify(r));
});

test('T-AG26: shell metachar in filename passes', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: 'memory/feedback_$(whoami).md', operation: 'create',
    content: VALID_FM, constraint: 'frontmatter_schema_required' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, true, 'expected ok: ' + JSON.stringify(r));
  assert.ok(fs.existsSync(path.join(tmpDir, 'memory', 'feedback_$(whoami).md')));
});

// -------------------------------------------------------------------
// 7. Apply gate integration: failure cases
// -------------------------------------------------------------------
console.log('\n--- Apply Gate: Failures ---');

test('T-AG4: edit with deletions blocked', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, '.claude', 'skills', 'test-skill', 'SKILL.md'), SKILL_OLD);
  var newC = 'Line 1\nLine 3\n';
  var p = makeP({ target_file: '.claude/skills/test-skill/SKILL.md', operation: 'edit',
    content: newC, constraint: 'additive_only' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_additive_only_violation');
});

test('T-AG6: edit AGENT.md under wrong heading', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'roles', 'test-role', 'AGENT.md'), AGENT_OLD);
  var newC = '# Test Role\n\n## Core Responsibilities\n- Primary duties\n- New duty\n\n## Domain Knowledge\n- Industry expertise\n\n## Communication Style\n- Direct and clear\n';
  var p = makeP({ target_file: 'roles/test-role/AGENT.md', operation: 'edit',
    content: newC, constraint: 'knowledge_section_only' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_knowledge_section_violation');
});

test('T-AG7: edit changing heading text blocked', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'roles', 'test-role', 'AGENT.md'), AGENT_OLD);
  var newC = '# Test Role\n\n## Core Responsibilities\n- Primary duties\n\n## Deep Knowledge\n- Industry expertise\n\n## Communication Style\n- Direct and clear\n';
  var p = makeP({ target_file: 'roles/test-role/AGENT.md', operation: 'edit',
    content: newC, constraint: 'knowledge_section_only' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_knowledge_section_violation');
});

test('T-AG8: no section headings fails closed', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'roles', 'test-role', 'AGENT.md'), 'Plain text only.\n');
  var p = makeP({ target_file: 'roles/test-role/AGENT.md', operation: 'edit',
    content: 'Different plain text.\n', constraint: 'knowledge_section_only' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_knowledge_section_violation');
});

test('T-AG14: content-hash mismatch', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: 'memory/feedback_hash.md', operation: 'create',
    content: VALID_FM, constraint: 'frontmatter_schema_required',
    content_hash: 'sha256:' + '0'.repeat(64) });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_content_hash_mismatch');
});

test('T-AG17: mode violation create on edit_existing_only', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: 'roles/test-role/AGENT.md', operation: 'create',
    content: AGENT_OLD, constraint: 'knowledge_section_only' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_operation_mode_violation');
});

test('T-AG18: mode violation edit on append_only', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'memory', 'MEMORY.md'), '# Index\n');
  var p = makeP({ target_file: 'memory/MEMORY.md', operation: 'edit',
    content: '# New Index\n', constraint: 'index_entry_only' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_operation_mode_violation');
});

test('T-AG19: mode violation append on edit_existing_only', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'roles', 'test-role', 'AGENT.md'), AGENT_OLD);
  var p = makeP({ target_file: 'roles/test-role/AGENT.md', operation: 'append',
    content: '\nMore.\n', constraint: 'knowledge_section_only' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_operation_mode_violation');
});

test('T-AG20: unknown constraint in policy blocked', function() {
  var policy = JSON.parse(JSON.stringify(PROD_POLICY));
  policy.LOW.rules[2] = { target: 'memory/feedback_*.md', constraint: 'foobar',
    mode: 'create_new_or_edit_existing', description: 'bad' };
  var tmpDir = makeTempProject({ policy: policy });
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: 'memory/feedback_unk.md', operation: 'create',
    content: VALID_FM, constraint: 'foobar' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_unknown_constraint');
});

test('T-AG21: missing constraint on target rule blocked', function() {
  var policy = JSON.parse(JSON.stringify(PROD_POLICY));
  policy.LOW.rules[2] = { target: 'memory/feedback_*.md',
    mode: 'create_new_or_edit_existing', description: 'no constraint' };
  var tmpDir = makeTempProject({ policy: policy });
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: 'memory/feedback_miss.md', operation: 'create',
    content: VALID_FM, constraint: '' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_missing_constraint');
});

test('T-AG24: evidence ID not found in event files', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var fake = ['evt_99ZZZZZZZZZZZZZZZZZZZZZZ', EV2, EV3];
  var p = makeP({ target_file: 'memory/feedback_noev.md', operation: 'create',
    content: VALID_FM, constraint: 'frontmatter_schema_required', evidence: fake });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_evidence_invalid');
});

test('T-AG25: evidence count < 3 returns HIGH', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: 'memory/feedback_few.md', operation: 'create',
    content: VALID_FM, constraint: 'frontmatter_schema_required', evidence: [EV1, EV2] });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_risk_not_low');
});

test('T-AG27: governed path blocked', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: '.claude/harness/lib/evil.js', operation: 'create',
    content: 'bad', constraint: 'additive_only' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_governed_path');
});

test('T-AG28: validate-before-write file unchanged on violation', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var sp = path.join(tmpDir, '.claude', 'skills', 'test-skill', 'SKILL.md');
  fs.writeFileSync(sp, SKILL_OLD);
  var newC = 'Line 1\nLine 3\n';
  var p = makeP({ target_file: '.claude/skills/test-skill/SKILL.md', operation: 'edit',
    content: newC, constraint: 'additive_only' });
  gate.apply(writeP(tmpDir, p));
  assert.strictEqual(fs.readFileSync(sp, 'utf8'), SKILL_OLD, 'file must be unchanged');
});

test('T-AG29: constraint mismatch blocked', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'memory', 'MEMORY.md'), '# Index\n');
  var p = makeP({ target_file: 'memory/MEMORY.md', operation: 'append',
    content: '- [T](t.md) — d\n', constraint: 'additive_only' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_proposal_policy_mismatch');
});

test('T-AG30: risk mismatch HIGH target', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Rules\n');
  var p = makeP({ target_file: 'CLAUDE.md', operation: 'edit',
    content: '# New Rules\n', constraint: '', risk: 'LOW' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_risk_not_low');
});

test('non-canonical path caught by cross-check', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: '../../../etc/passwd', operation: 'create',
    content: 'x', constraint: 'c' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_proposal_policy_mismatch');
});

test('dot-segment path caught by cross-check', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: './memory/feedback_dot.md', operation: 'create',
    content: VALID_FM, constraint: 'frontmatter_schema_required' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_proposal_policy_mismatch');
});

test('pure traversal path blocked', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: '../../..', operation: 'create',
    content: 'x', constraint: 'c' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_path_traversal');
});

test('file already exists blocks create', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'memory', 'feedback_exists.md'), 'old');
  var p = makeP({ target_file: 'memory/feedback_exists.md', operation: 'create',
    content: VALID_FM, constraint: 'frontmatter_schema_required' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_file_exists');
});

test('file missing blocks edit', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: 'memory/feedback_ghost.md', operation: 'edit',
    content: VALID_FM, constraint: 'frontmatter_schema_required' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_file_missing');
});

test('invalid JSON proposal blocked', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var badPath = path.join(tmpDir, 'bad.json');
  fs.writeFileSync(badPath, '{ broken json');
  var r = gate.apply(badPath);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_proposal_parse_failed');
});

test('duplicate evidence IDs blocked', function() {
  var tmpDir = makeTempProject();
  var gate = loadGate(tmpDir);
  var p = makeP({ target_file: 'memory/feedback_dup.md', operation: 'create',
    content: VALID_FM, constraint: 'frontmatter_schema_required',
    evidence: [EV1, EV1, EV1] });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_evidence_invalid');
});

function initGitRepo(dir) {
  var opts = { cwd: dir, encoding: 'utf8', stdio: 'pipe' };
  execFileSync('git', ['init'], opts);
  execFileSync('git', ['config', 'user.email', 'test@test.com'], opts);
  execFileSync('git', ['config', 'user.name', 'Test'], opts);
  fs.writeFileSync(path.join(dir, '.gitkeep'), '');
  execFileSync('git', ['add', '.gitkeep'], opts);
  execFileSync('git', ['commit', '-m', 'init'], opts);
}

test('dirty target file blocked on edit', function() {
  var tmpDir = makeTempProject();
  initGitRepo(tmpDir);
  var gate = loadGate(tmpDir);
  var target = 'memory/feedback_dirty.md';
  fs.writeFileSync(path.join(tmpDir, target), VALID_FM);
  var opts = { cwd: tmpDir, encoding: 'utf8', stdio: 'pipe' };
  execFileSync('git', ['add', target], opts);
  execFileSync('git', ['commit', '-m', 'add target'], opts);
  fs.writeFileSync(path.join(tmpDir, target), VALID_FM + '\nManual edit.\n');
  var newContent = VALID_FM.replace('Body content.', 'Updated body.');
  var p = makeP({ target_file: target, operation: 'edit',
    content: newContent, constraint: 'frontmatter_schema_required' });
  var r = gate.apply(writeP(tmpDir, p));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'blocked_target_dirty');
});

// -------------------------------------------------------------------
// 8. Dirty-tree preflight
// -------------------------------------------------------------------
console.log('\n--- Dirty-Tree Preflight ---');

test('T-AG34: preflight clean tree', function() {
  var tmpDir = makeTempProject();
  initGitRepo(tmpDir);
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'memory', 'feedback_pf.md'), 'content');
  var r = gate.dirtyTreePreflight(['memory/feedback_pf.md']);
  assert.strictEqual(r.clean, true, 'expected clean: ' + JSON.stringify(r));
});

test('T-AG35: preflight foreign staged content', function() {
  var tmpDir = makeTempProject();
  initGitRepo(tmpDir);
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'memory', 'feedback_pf2.md'), 'content');
  fs.writeFileSync(path.join(tmpDir, 'foreign.md'), 'staged');
  execFileSync('git', ['add', 'foreign.md'], { cwd: tmpDir, encoding: 'utf8', stdio: 'pipe' });
  var r = gate.dirtyTreePreflight(['memory/feedback_pf2.md']);
  assert.strictEqual(r.clean, false);
  assert.strictEqual(r.reason, 'blocked_foreign_staged_content');
});

test('T-AG36: preflight pre-staged content', function() {
  var tmpDir = makeTempProject();
  initGitRepo(tmpDir);
  var gate = loadGate(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'memory', 'feedback_pf3.md'), 'content');
  execFileSync('git', ['add', 'memory/feedback_pf3.md'], { cwd: tmpDir, encoding: 'utf8', stdio: 'pipe' });
  var r = gate.dirtyTreePreflight(['memory/feedback_pf3.md']);
  assert.strictEqual(r.clean, false);
  assert.strictEqual(r.reason, 'blocked_pre_staged_content');
});

// -------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------
process.env.CLAUDE_PROJECT_DIR = origDir;
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
