#!/usr/bin/env node
'use strict';
// Unit tests for S1+S2+S3 redaction overhaul in emit-event.js.
// Tests: recursive field-aware redaction, fail-closed stub, client_sensitive_fields.
// Uses isolated temp directories so tests never touch live harness data.

const fs = require('fs');
const path = require('path');
const os = require('os');

const REAL_PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..', '..');
const LIB_PATH = path.join(REAL_PROJECT_DIR, '.claude', 'harness', 'lib', 'emit-event.js');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

// Helper: create a temp project dir with a given redaction.json config
function makeTempProject(configObj) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'redact-test-'));
  const configDir = path.join(tmpRoot, '.claude', 'harness', 'config');
  fs.mkdirSync(configDir, { recursive: true });
  if (configObj !== null && configObj !== undefined) {
    fs.writeFileSync(path.join(configDir, 'redaction.json'), JSON.stringify(configObj));
  }
  // else: no config file at all (missing config test)
  return tmpRoot;
}

// Helper: load emit-event.js with CLAUDE_PROJECT_DIR overridden
// We need fresh require each time to pick up different PROJECT_DIR
function loadModule(projectDir) {
  // Clear the require cache for emit-event.js so it re-reads PROJECT_DIR
  delete require.cache[require.resolve(LIB_PATH)];
  const origDir = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = projectDir;
  const mod = require(LIB_PATH);
  if (origDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = origDir;
  return mod;
}

// ============================================================
// Test 1: Pattern match redacts API keys in nested values
// ============================================================
console.log('\n--- Test 1: Pattern match redacts API keys in nested values ---');
(function() {
  const tmpRoot = makeTempProject({
    patterns: [
      'API_KEY\\s*=\\s*[^\\s]+',
      'Bearer\\s+[A-Za-z0-9._~+/=-]+'
    ],
    client_sensitive_fields: {}
  });
  const mod = loadModule(tmpRoot);

  const event = {
    event_id: 'evt_TEST1',
    session_id: 'ses_TEST',
    schema_version: 1,
    type: 'tool_outcome',
    ts: '2026-06-14T00:00:00.000Z',
    redacted: false,
    tool: 'Bash',
    command_summary: 'API_KEY = sk-secret-12345 and Bearer eyJhbGciOi.token',
    nested: {
      deep: {
        value: 'DATABASE_URL has API_KEY = another-secret'
      }
    }
  };

  const result = mod.applyRedaction(event);
  assert(typeof result === 'object', 'applyRedaction returns an object');
  assert(result.event !== undefined, 'result has event property');
  assert(result.redacted === true, 'result.redacted is true');
  assert(result.event.redacted === true, 'event.redacted flag set');

  // Check top-level string was redacted
  assert(!result.event.command_summary.includes('sk-secret-12345'),
    'API key value redacted from command_summary');
  assert(!result.event.command_summary.includes('eyJhbGciOi'),
    'Bearer token redacted from command_summary');

  // Check nested string was redacted
  assert(!result.event.nested.deep.value.includes('another-secret'),
    'API key redacted from deeply nested value');

  // Structural fields preserved
  assert(result.event.event_id === 'evt_TEST1', 'event_id preserved');
  assert(result.event.session_id === 'ses_TEST', 'session_id preserved');
  assert(result.event.type === 'tool_outcome', 'type preserved');
})();

// ============================================================
// Test 2: client_sensitive_fields redacts matching field keys
// ============================================================
console.log('\n--- Test 2: client_sensitive_fields redacts matching field keys ---');
(function() {
  const tmpRoot = makeTempProject({
    patterns: [],
    client_sensitive_fields: {
      couch_heroes: ['salary_amount', 'bank_details'],
      lighthouse: ['revenue_figures']
    }
  });
  const mod = loadModule(tmpRoot);

  const event = {
    event_id: 'evt_TEST2',
    session_id: 'ses_TEST',
    schema_version: 1,
    type: 'tool_outcome',
    ts: '2026-06-14T00:00:00.000Z',
    redacted: false,
    tool: 'Read',
    command_summary: 'read file',
    salary_amount: '85000',
    bank_details: 'HSBC 12345678',
    revenue_figures: '2.5M',
    safe_field: 'this should remain'
  };

  const result = mod.applyRedaction(event);
  assert(result.event.salary_amount === '[REDACTED]',
    'salary_amount field redacted by client_sensitive_fields');
  assert(result.event.bank_details === '[REDACTED]',
    'bank_details field redacted by client_sensitive_fields');
  assert(result.event.revenue_figures === '[REDACTED]',
    'revenue_figures field redacted by client_sensitive_fields');
  assert(result.event.safe_field === 'this should remain',
    'non-sensitive field left intact');
  assert(result.event.redacted === true, 'redacted flag set');
})();

// ============================================================
// Test 3: Missing redaction config produces minimal safe stub event
// ============================================================
console.log('\n--- Test 3: Missing redaction config produces minimal safe stub ---');
(function() {
  const tmpRoot = makeTempProject(null); // no config file written

  const mod = loadModule(tmpRoot);

  const event = {
    event_id: 'evt_TEST3',
    session_id: 'ses_TEST',
    schema_version: 1,
    type: 'tool_outcome',
    ts: '2026-06-14T00:00:00.000Z',
    redacted: false,
    tool: 'Bash',
    command_summary: 'SECRET_KEY = mysecret'
  };

  const result = mod.applyRedaction(event);

  // Fail-closed: should return a stub with only safe structural fields
  assert(result.event.event_id === 'evt_TEST3', 'stub preserves event_id');
  assert(result.event.session_id === 'ses_TEST', 'stub preserves session_id');
  assert(result.event.type === 'tool_outcome', 'stub preserves type');
  assert(result.event.ts === '2026-06-14T00:00:00.000Z', 'stub preserves ts');
  assert(result.event.redacted === true, 'stub has redacted: true');
  assert(result.event.redaction_error === true, 'stub has redaction_error: true');

  // Stub must NOT contain the sensitive data
  assert(result.event.command_summary === undefined, 'stub strips command_summary');
  assert(result.event.tool === undefined, 'stub strips tool field');
  assert(result.redacted === true, 'result.redacted is true');
})();

// ============================================================
// Test 4: Corrupt redaction config produces minimal safe stub event
// ============================================================
console.log('\n--- Test 4: Corrupt redaction config produces minimal safe stub ---');
(function() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'redact-test-'));
  const configDir = path.join(tmpRoot, '.claude', 'harness', 'config');
  fs.mkdirSync(configDir, { recursive: true });
  // Write invalid JSON
  fs.writeFileSync(path.join(configDir, 'redaction.json'), '{{{not valid json!!!');

  const mod = loadModule(tmpRoot);

  const event = {
    event_id: 'evt_TEST4',
    session_id: 'ses_TEST',
    schema_version: 1,
    type: 'intervention',
    ts: '2026-06-14T00:00:00.000Z',
    redacted: false,
    description: 'SECRET_KEY = supersecret'
  };

  const result = mod.applyRedaction(event);

  assert(result.event.event_id === 'evt_TEST4', 'stub preserves event_id on corrupt config');
  assert(result.event.redacted === true, 'stub has redacted: true on corrupt config');
  assert(result.event.redaction_error === true, 'stub has redaction_error: true on corrupt config');
  assert(result.event.description === undefined, 'stub strips description on corrupt config');
  assert(result.redacted === true, 'result.redacted true on corrupt config');
})();

// ============================================================
// Test 5: JSON structure is never broken by redaction
// ============================================================
console.log('\n--- Test 5: JSON structure preserved after redaction ---');
(function() {
  const tmpRoot = makeTempProject({
    patterns: [
      'API_KEY\\s*[:=]\\s*[^\\s"]+',
      'postgres://[^\\s"]+'
    ],
    client_sensitive_fields: {}
  });
  const mod = loadModule(tmpRoot);

  const event = {
    event_id: 'evt_TEST5',
    session_id: 'ses_TEST',
    schema_version: 1,
    type: 'tool_outcome',
    ts: '2026-06-14T00:00:00.000Z',
    redacted: false,
    tool: 'Bash',
    command_summary: 'API_KEY = "secret-with-special-chars:{}\\"[]"',
    nested: {
      connection: 'postgres://user:pass@host:5432/db',
      array: ['normal', 'API_KEY = hidden', 'also normal'],
      deep: {
        deeper: {
          value: 'clean data'
        }
      }
    }
  };

  const result = mod.applyRedaction(event);

  // The critical test: can we re-serialise to valid JSON?
  let jsonStr;
  let parsed;
  try {
    jsonStr = JSON.stringify(result.event);
    parsed = JSON.parse(jsonStr);
    assert(true, 'redacted event serialises to valid JSON');
  } catch (e) {
    assert(false, 'redacted event serialises to valid JSON — got error: ' + e.message);
  }

  // Structure preserved
  assert(typeof result.event.nested === 'object', 'nested object preserved');
  assert(Array.isArray(result.event.nested.array), 'nested array preserved');
  assert(result.event.nested.array.length === 3, 'array length preserved');
  assert(typeof result.event.nested.deep.deeper === 'object', 'deep nesting preserved');
  assert(result.event.nested.deep.deeper.value === 'clean data', 'clean deep value untouched');

  // Pattern redaction worked
  assert(!result.event.nested.connection.includes('user:pass'),
    'postgres URL redacted in nested field');
})();

// ============================================================
// Test 6: Redacted event has redacted: true flag
// ============================================================
console.log('\n--- Test 6: redacted flag set correctly ---');
(function() {
  const tmpRoot = makeTempProject({
    patterns: ['SECRET\\s*=\\s*[^\\s]+'],
    client_sensitive_fields: {}
  });
  const mod = loadModule(tmpRoot);

  // Event WITH sensitive data
  const sensitiveEvent = {
    event_id: 'evt_TEST6A',
    session_id: 'ses_TEST',
    schema_version: 1,
    type: 'tool_outcome',
    ts: '2026-06-14T00:00:00.000Z',
    redacted: false,
    command_summary: 'SECRET = mysecret'
  };

  const r1 = mod.applyRedaction(sensitiveEvent);
  assert(r1.event.redacted === true, 'redacted: true when sensitive content found');
  assert(r1.redacted === true, 'result.redacted true when sensitive content found');

  // Event WITHOUT sensitive data
  const cleanEvent = {
    event_id: 'evt_TEST6B',
    session_id: 'ses_TEST',
    schema_version: 1,
    type: 'tool_outcome',
    ts: '2026-06-14T00:00:00.000Z',
    redacted: false,
    command_summary: 'npm test'
  };

  const r2 = mod.applyRedaction(cleanEvent);
  assert(r2.event.redacted === false, 'redacted: false when no sensitive content');
  assert(r2.redacted === false, 'result.redacted false when no sensitive content');
})();

// ============================================================
// Test 7: loadRedactionConfig returns structured config
// ============================================================
console.log('\n--- Test 7: loadRedactionConfig structure ---');
(function() {
  const tmpRoot = makeTempProject({
    patterns: ['SECRET\\s*=\\s*[^\\s]+'],
    client_sensitive_fields: {
      acme: ['salary', 'bank_details']
    }
  });
  const mod = loadModule(tmpRoot);

  const cfg = mod.loadRedactionConfig();
  assert(cfg !== null, 'loadRedactionConfig returns non-null for valid config');
  assert(Array.isArray(cfg.patterns), 'config.patterns is an array');
  assert(cfg.patterns.length === 1, 'config has 1 pattern');
  assert(cfg.patterns[0] instanceof RegExp, 'patterns are RegExp objects');
  assert(Array.isArray(cfg.sensitiveKeys), 'config.sensitiveKeys is an array');
  assert(cfg.sensitiveKeys.includes('salary'), 'sensitiveKeys includes salary');
  assert(cfg.sensitiveKeys.includes('bank_details'), 'sensitiveKeys includes bank_details');
})();

// ============================================================
// Test 8: loadRedactionConfig returns null on missing config
// ============================================================
console.log('\n--- Test 8: loadRedactionConfig returns null on missing config ---');
(function() {
  const tmpRoot = makeTempProject(null);
  const mod = loadModule(tmpRoot);

  const cfg = mod.loadRedactionConfig();
  assert(cfg === null, 'loadRedactionConfig returns null when config file missing');
})();

// ============================================================
// Test 9: loadRedactionConfig returns null on corrupt config
// ============================================================
console.log('\n--- Test 9: loadRedactionConfig returns null on corrupt config ---');
(function() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'redact-test-'));
  const configDir = path.join(tmpRoot, '.claude', 'harness', 'config');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'redaction.json'), 'NOT JSON');

  const mod = loadModule(tmpRoot);

  const cfg = mod.loadRedactionConfig();
  assert(cfg === null, 'loadRedactionConfig returns null on corrupt JSON');
})();

// ============================================================
// Test 10: redactValue handles strings with patterns
// ============================================================
console.log('\n--- Test 10: redactValue function ---');
(function() {
  const tmpRoot = makeTempProject({ patterns: [], client_sensitive_fields: {} });
  const mod = loadModule(tmpRoot);

  const patterns = [/SECRET\s*=\s*[^\s]+/gi];

  const r1 = mod.redactValue('SECRET = mysecret', patterns);
  assert(r1.hit === true, 'redactValue detects match');
  assert(r1.value.includes('[REDACTED]'), 'redactValue replaces match');
  assert(!r1.value.includes('mysecret'), 'secret value removed');

  const r1b = mod.redactValue('SECRET = anothersecret', patterns);
  assert(r1b.hit === true, 'redactValue is stateless across repeated matching calls');

  const r2 = mod.redactValue('clean string', patterns);
  assert(r2.hit === false, 'redactValue returns hit=false for clean string');
  assert(r2.value === 'clean string', 'clean string unchanged');

  const r3 = mod.redactValue(42, patterns);
  assert(r3.hit === false, 'redactValue returns hit=false for non-string');
  assert(r3.value === 42, 'non-string value unchanged');
})();

// ============================================================
// Test 11: redactObject recursive traversal
// ============================================================
console.log('\n--- Test 11: redactObject recursive traversal ---');
(function() {
  const tmpRoot = makeTempProject({ patterns: [], client_sensitive_fields: {} });
  const mod = loadModule(tmpRoot);

  const patterns = [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi];
  const sensitiveKeys = ['password', 'secret'];

  const obj = {
    name: 'test',
    password: 'hunter2',
    nested: {
      token_value: 'Bearer eyJhbGciOi.token.value',
      secret: 'should-be-redacted',
      clean: 'stays clean'
    }
  };

  const anyHit = mod.redactObject(obj, patterns, sensitiveKeys);
  assert(anyHit === true, 'redactObject returns true when redaction occurred');
  assert(obj.password === '[REDACTED]', 'sensitive key "password" redacted');
  assert(obj.nested.secret === '[REDACTED]', 'nested sensitive key "secret" redacted');
  assert(!obj.nested.token_value.includes('eyJhbGciOi'), 'Bearer token pattern redacted');
  assert(obj.nested.clean === 'stays clean', 'clean value untouched');
})();

// ============================================================
// Test 12: makeRedactionStub produces minimal safe event
// ============================================================
console.log('\n--- Test 12: makeRedactionStub structure ---');
(function() {
  const tmpRoot = makeTempProject({ patterns: [], client_sensitive_fields: {} });
  const mod = loadModule(tmpRoot);

  const stub = mod.makeRedactionStub('evt_STUB', 'ses_STUB', 'tool_outcome', '2026-06-14T00:00:00.000Z');
  assert(stub.event_id === 'evt_STUB', 'stub has correct event_id');
  assert(stub.session_id === 'ses_STUB', 'stub has correct session_id');
  assert(stub.schema_version === 1, 'stub has schema_version');
  assert(stub.type === 'tool_outcome', 'stub has correct type');
  assert(stub.ts === '2026-06-14T00:00:00.000Z', 'stub has correct ts');
  assert(stub.redacted === true, 'stub has redacted: true');
  assert(stub.redaction_error === true, 'stub has redaction_error: true');

  // Verify stub has ONLY these fields
  const keys = Object.keys(stub);
  assert(keys.length === 7, 'stub has exactly 7 fields (got ' + keys.length + ': ' + keys.join(', ') + ')');
})();

// ============================================================
// Test 13: Arrays inside events are traversed correctly
// ============================================================
console.log('\n--- Test 13: Array traversal in redactObject ---');
(function() {
  const tmpRoot = makeTempProject({
    patterns: ['SECRET\\s*=\\s*[^\\s]+'],
    client_sensitive_fields: {}
  });
  const mod = loadModule(tmpRoot);

  const event = {
    event_id: 'evt_TEST13',
    session_id: 'ses_TEST',
    schema_version: 1,
    type: 'tool_outcome',
    ts: '2026-06-14T00:00:00.000Z',
    redacted: false,
    items: [
      { label: 'clean' },
      { label: 'SECRET = hidden123' },
      { nested: { value: 'SECRET = nested456' } }
    ]
  };

  const result = mod.applyRedaction(event);
  assert(!JSON.stringify(result.event).includes('hidden123'),
    'secret in array object redacted');
  assert(!JSON.stringify(result.event).includes('nested456'),
    'secret in nested array object redacted');
  assert(result.event.items[0].label === 'clean', 'clean array entry untouched');
  assert(result.event.items.length === 3, 'array length preserved');
})();

// ============================================================
// Summary
// ============================================================
console.log('\n' + passed + '/' + (passed + failed) + ' passed');
process.exit(failed > 0 ? 1 : 0);
