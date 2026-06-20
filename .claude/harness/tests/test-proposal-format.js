#!/usr/bin/env node
'use strict';
// test-proposal-format.js — Phase 2 tests: ISO week, proposal I/O,
// status transitions, full schema validation, digest generation.

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

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

var origDir = process.env.CLAUDE_PROJECT_DIR || '';

function computeSlug(dir) {
  var resolved = path.resolve(dir);
  var base = path.basename(resolved).replace(/[^a-zA-Z0-9_-]/g, '_') || 'root';
  var hash = crypto.createHash('md5').update(resolved.replace(/\\/g, '/').toLowerCase()).digest('hex').slice(0, 6);
  return base + '_' + hash;
}

function makeTempProject() {
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fmt-test-'));
  var harnessDir = path.join(tmpDir, '.claude', 'harness');
  var dataDir = path.join(harnessDir, 'data');
  var slug = computeSlug(tmpDir);
  fs.mkdirSync(dataDir, { recursive: true });
  var evDir = path.join(dataDir, slug, 'events', '2026-06-17');
  fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(path.join(evDir, 'session.jsonl'),
    JSON.stringify({ event_id: 'evt_01AAAAAAAAAAAAAAAAAAAAAA' }) + '\n');
  var proposalsDir = path.join(harnessDir, 'proposals');
  fs.mkdirSync(proposalsDir, { recursive: true });
  return tmpDir;
}

function loadUtils(projectDir) {
  var up = path.resolve(__dirname, '..', 'lib', 'proposal-utils.js');
  var rp = path.resolve(__dirname, '..', 'lib', 'resolve.js');
  delete require.cache[require.resolve(rp)];
  delete require.cache[require.resolve(up)];
  process.env.CLAUDE_PROJECT_DIR = projectDir || origDir;
  process.env.HARNESS_DIR = projectDir
    ? path.join(projectDir, '.claude', 'harness')
    : path.resolve(__dirname, '..');
  return require(up);
}

function makeFullProposal(overrides) {
  var p = {
    id: 'RHO-2026-W25-001',
    created: '2026-06-17T08:00:00Z',
    classification: 'skill_deficiency',
    failure_code: 'test_mock_misuse',
    target_file: '.claude/skills/tdd/SKILL.md',
    risk: 'LOW',
    evidence: ['evt_01AAAAAAAAAAAAAAAAAAAAAA:intervention:2026-06-04'],
    diagnosis: 'TDD skill missing DB test guidance',
    proposed_change: 'Add section on integration tests',
    diff_preview: '+ ## Integration Tests\n+ Use real DB.',
    content_hash: 'sha256:' + 'a'.repeat(64),
    anti_regression: { key: ['skill_deficiency', 'test_mock_misuse'], check: 'Next DB test uses real pg' },
    status: 'pending'
  };
  if (overrides) {
    for (var k in overrides) p[k] = overrides[k];
  }
  return p;
}

// ===================================================================
console.log('proposal-format tests (Phase 2)\n');

// -------------------------------------------------------------------
// 1. ISO Week computation
// -------------------------------------------------------------------
console.log('--- ISO Week ---');

(function() {
  var pu = loadUtils(makeTempProject());

  test('ISO week for 2026-06-17 (Tuesday) = 2026-W25', function() {
    assert.strictEqual(pu.computeIsoWeek('2026-06-17'), '2026-W25');
  });

  test('ISO week for 2026-01-01 (Thursday) = 2026-W01', function() {
    assert.strictEqual(pu.computeIsoWeek('2026-01-01'), '2026-W01');
  });

  test('ISO week for 2025-12-29 (Monday) = 2026-W01', function() {
    assert.strictEqual(pu.computeIsoWeek('2025-12-29'), '2026-W01');
  });

  test('ISO week for 2025-12-28 (Sunday) = 2025-W52', function() {
    assert.strictEqual(pu.computeIsoWeek('2025-12-28'), '2025-W52');
  });

  test('ISO week for 2026-06-22 (Monday) = 2026-W26', function() {
    assert.strictEqual(pu.computeIsoWeek('2026-06-22'), '2026-W26');
  });
})();

// -------------------------------------------------------------------
// 2. Proposal ID generation
// -------------------------------------------------------------------
console.log('\n--- Proposal ID ---');

(function() {
  var tmpDir = makeTempProject();
  var pu = loadUtils(tmpDir);

  test('nextProposalId empty dir = 001', function() {
    var id = pu.nextProposalId('2026-W25');
    assert.strictEqual(id, 'RHO-2026-W25-001');
  });

  test('nextProposalId with existing proposals increments', function() {
    var dir = pu.ensureProposalDir('2026-W25');
    fs.writeFileSync(path.join(dir, 'RHO-2026-W25-001.json'), '{}');
    fs.writeFileSync(path.join(dir, 'RHO-2026-W25-002.json'), '{}');
    var id = pu.nextProposalId('2026-W25');
    assert.strictEqual(id, 'RHO-2026-W25-003');
  });

  test('nextProposalId ignores non-proposal files', function() {
    var dir = pu.ensureProposalDir('2026-W24');
    fs.writeFileSync(path.join(dir, 'DIGEST.md'), '# Digest');
    fs.writeFileSync(path.join(dir, 'RHO-2026-W24-005.json'), '{}');
    var id = pu.nextProposalId('2026-W24');
    assert.strictEqual(id, 'RHO-2026-W24-006');
  });
})();

// -------------------------------------------------------------------
// 3. Full proposal schema validation
// -------------------------------------------------------------------
console.log('\n--- Full Proposal Schema ---');

(function() {
  var pu = loadUtils(makeTempProject());

  test('valid full proposal passes', function() {
    var p = makeFullProposal();
    assert.deepStrictEqual(pu.validateFullProposalSchema(p), { valid: true });
  });

  test('missing required field fails', function() {
    var p = makeFullProposal();
    delete p.diagnosis;
    assert.strictEqual(pu.validateFullProposalSchema(p).valid, false);
  });

  test('invalid id format fails', function() {
    var p = makeFullProposal({ id: 'P001' });
    var r = pu.validateFullProposalSchema(p);
    assert.strictEqual(r.valid, false);
    assert.ok(r.reason.includes('RHO-YYYY-WNN-NNN'));
  });

  test('non-pending initial status fails', function() {
    var p = makeFullProposal({ status: 'applied' });
    assert.strictEqual(pu.validateFullProposalSchema(p).valid, false);
  });

  test('invalid risk fails', function() {
    var p = makeFullProposal({ risk: 'MEDIUM' });
    assert.strictEqual(pu.validateFullProposalSchema(p).valid, false);
  });

  test('invalid created format fails', function() {
    var p = makeFullProposal({ created: '17 June 2026' });
    assert.strictEqual(pu.validateFullProposalSchema(p).valid, false);
  });

  test('empty classification fails', function() {
    var p = makeFullProposal({ classification: '' });
    assert.strictEqual(pu.validateFullProposalSchema(p).valid, false);
  });

  test('missing content_hash prefix fails', function() {
    var p = makeFullProposal({ content_hash: 'abc123' });
    assert.strictEqual(pu.validateFullProposalSchema(p).valid, false);
  });
})();

// -------------------------------------------------------------------
// 4. Proposal I/O
// -------------------------------------------------------------------
console.log('\n--- Proposal I/O ---');

(function() {
  var tmpDir = makeTempProject();
  var pu = loadUtils(tmpDir);

  test('writeProposal creates file', function() {
    var p = makeFullProposal();
    var result = pu.writeProposal(p);
    assert.strictEqual(result.ok, true);
    assert.ok(fs.existsSync(result.path));
    var read = JSON.parse(fs.readFileSync(result.path, 'utf8'));
    assert.strictEqual(read.id, 'RHO-2026-W25-001');
  });

  test('writeProposal rejects duplicate (immutable)', function() {
    var p = makeFullProposal();
    var result = pu.writeProposal(p);
    assert.strictEqual(result.ok, false);
    assert.ok(result.reason.includes('immutable'));
  });

  test('readProposal retrieves written proposal', function() {
    var p = pu.readProposal('RHO-2026-W25-001');
    assert.ok(p !== null);
    assert.strictEqual(p.id, 'RHO-2026-W25-001');
    assert.strictEqual(p.diagnosis, 'TDD skill missing DB test guidance');
  });

  test('readProposal returns null for missing', function() {
    assert.strictEqual(pu.readProposal('RHO-2026-W99-001'), null);
  });

  test('readProposal returns null for invalid id', function() {
    assert.strictEqual(pu.readProposal('P001'), null);
  });

  test('listProposals returns sorted ids', function() {
    var p2 = makeFullProposal({ id: 'RHO-2026-W25-002' });
    pu.writeProposal(p2);
    var list = pu.listProposals('2026-W25');
    assert.deepStrictEqual(list, ['RHO-2026-W25-001', 'RHO-2026-W25-002']);
  });

  test('listProposals empty week returns []', function() {
    assert.deepStrictEqual(pu.listProposals('2026-W99'), []);
  });

  test('writeProposal rejects invalid id format', function() {
    var p = makeFullProposal({ id: 'BADFORMAT' });
    var result = pu.writeProposal(p);
    assert.strictEqual(result.ok, false);
  });
})();

// -------------------------------------------------------------------
// 5. Status transitions
// -------------------------------------------------------------------
console.log('\n--- Status Transitions ---');

(function() {
  var tmpDir = makeTempProject();
  var pu = loadUtils(tmpDir);

  test('valid transition pending -> applied by applier', function() {
    assert.deepStrictEqual(
      pu.validateTransition('pending', 'applied', 'applier'),
      { valid: true });
  });

  test('valid transition pending -> approved by glen', function() {
    assert.deepStrictEqual(
      pu.validateTransition('pending', 'approved', 'glen'),
      { valid: true });
  });

  test('valid transition pending -> rejected by glen', function() {
    assert.deepStrictEqual(
      pu.validateTransition('pending', 'rejected', 'glen'),
      { valid: true });
  });

  test('valid transition applied -> regressed by recorder', function() {
    assert.deepStrictEqual(
      pu.validateTransition('applied', 'regressed', 'recorder'),
      { valid: true });
  });

  test('invalid transition pending -> regressed', function() {
    var r = pu.validateTransition('pending', 'regressed', 'recorder');
    assert.strictEqual(r.valid, false);
    assert.ok(r.reason.includes('not allowed'));
  });

  test('wrong actor for transition', function() {
    var r = pu.validateTransition('pending', 'approved', 'applier');
    assert.strictEqual(r.valid, false);
    assert.ok(r.reason.includes('cannot perform'));
  });

  test('invalid from_status', function() {
    var r = pu.validateTransition('unknown', 'applied', 'applier');
    assert.strictEqual(r.valid, false);
  });

  test('appendStatusTransition writes valid event', function() {
    var ev = {
      event_id: 'pse_001',
      proposal_id: 'RHO-2026-W25-001',
      proposal_hash: 'sha256:abc',
      ts: '2026-06-17T10:00:00Z',
      actor: 'applier',
      from_status: 'pending',
      to_status: 'applied',
      reason: 'LOW auto-apply'
    };
    var result = pu.appendStatusTransition(ev);
    assert.strictEqual(result.ok, true, 'expected ok: ' + JSON.stringify(result));
  });

  test('appendStatusTransition rejects invalid transition', function() {
    var ev = {
      event_id: 'pse_002',
      proposal_id: 'RHO-2026-W25-001',
      proposal_hash: 'sha256:abc',
      ts: '2026-06-17T10:05:00Z',
      actor: 'recorder',
      from_status: 'pending',
      to_status: 'applied'
    };
    var result = pu.appendStatusTransition(ev);
    assert.strictEqual(result.ok, false);
  });

  test('appendStatusTransition rejects missing field', function() {
    var result = pu.appendStatusTransition({ event_id: 'pse_003' });
    assert.strictEqual(result.ok, false);
  });

  test('readCurrentStatus returns latest status', function() {
    var status = pu.readCurrentStatus('RHO-2026-W25-001');
    assert.strictEqual(status, 'applied');
  });

  test('readCurrentStatus returns pending for unknown proposal', function() {
    var status = pu.readCurrentStatus('RHO-2026-W99-001');
    assert.strictEqual(status, 'pending');
  });

  test('readAllStatuses returns all events', function() {
    var all = pu.readAllStatuses();
    assert.ok(all.length >= 1);
    assert.strictEqual(all[0].proposal_id, 'RHO-2026-W25-001');
  });
})();

// -------------------------------------------------------------------
// 6. Digest generation
// -------------------------------------------------------------------
console.log('\n--- Digest Generation ---');

(function() {
  var tmpDir = makeTempProject();
  var pu = loadUtils(tmpDir);

  var lowP = makeFullProposal({ id: 'RHO-2026-W25-001', risk: 'LOW' });
  pu.writeProposal(lowP);
  var highP = makeFullProposal({ id: 'RHO-2026-W25-002', risk: 'HIGH',
    classification: 'hook_change', target_file: '.claude/hooks/test.js',
    diagnosis: 'Hook needs update', proposed_change: 'Modify hook matcher' });
  pu.writeProposal(highP);

  test('generateDigest produces markdown with header', function() {
    var digest = pu.generateDigest('2026-W25');
    assert.ok(digest.includes('# Weekly Digest — 2026-W25'));
  });

  test('generateDigest groups by risk level', function() {
    var digest = pu.generateDigest('2026-W25');
    assert.ok(digest.includes('## LOW (Auto-Applied)'));
    assert.ok(digest.includes('## HIGH (Glen Review Required)'));
  });

  test('generateDigest includes proposal details', function() {
    var digest = pu.generateDigest('2026-W25');
    assert.ok(digest.includes('RHO-2026-W25-001'));
    assert.ok(digest.includes('skill_deficiency'));
    assert.ok(digest.includes('TDD skill missing DB test guidance'));
  });

  test('generateDigest includes HIGH proposals', function() {
    var digest = pu.generateDigest('2026-W25');
    assert.ok(digest.includes('RHO-2026-W25-002'));
    assert.ok(digest.includes('hook_change'));
  });

  test('generateDigest empty week returns header only', function() {
    var digest = pu.generateDigest('2026-W99');
    assert.ok(digest.includes('# Weekly Digest — 2026-W99'));
    assert.ok(!digest.includes('## LOW'));
  });

  test('writeDigest creates file', function() {
    var digestPath = pu.writeDigest('2026-W25');
    assert.ok(fs.existsSync(digestPath));
    var content = fs.readFileSync(digestPath, 'utf8');
    assert.ok(content.includes('# Weekly Digest'));
  });
})();

// -------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------
process.env.CLAUDE_PROJECT_DIR = origDir;
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
