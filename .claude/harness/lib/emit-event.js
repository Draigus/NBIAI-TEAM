#!/usr/bin/env node
'use strict';
// emit-event.js — Core event capture utility for the harness improvement system.
// Called by PostToolUse/PreToolUse hooks. Reads hook JSON from stdin, builds a
// structured event, applies redaction, appends atomically to session JSONL.
// Usage: <hook_stdin> | node .claude/harness/lib/emit-event.js <event_type>
// Zero external dependencies — Node.js built-ins only.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const HARNESS_DIR = path.join(PROJECT_DIR, '.claude', 'harness');
const DATA_DIR = path.join(HARNESS_DIR, 'data');
const EVENTS_DIR = path.join(DATA_DIR, 'events');
const LOCKS_DIR = path.join(DATA_DIR, '.locks');
const REDACTION_PATH = path.join(HARNESS_DIR, 'config', 'redaction.json');

// --- ULID generation (timestamp + random, no deps) ---
function ulid() {
  const CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const ts = Date.now();
  let encoded = '';
  let t = ts;
  for (let i = 9; i >= 0; i--) {
    encoded = CHARS[t % 32] + encoded;
    t = Math.floor(t / 32);
  }
  const rand = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) {
    encoded += CHARS[rand[i] % 32];
  }
  return encoded;
}

// --- Session ID management ---
function getSessionId() {
  const sessionFile = path.join(DATA_DIR, '.session_id');
  const lockFile = path.join(LOCKS_DIR, 'session.lock');
  fs.mkdirSync(LOCKS_DIR, { recursive: true });
  const token = acquireLock(lockFile, 5000, 3);
  try {
    try {
      const raw = fs.readFileSync(sessionFile, 'utf8');
      const data = JSON.parse(raw);
      if (Date.now() - data.created < 4 * 3600 * 1000) return data.id;
    } catch { /* missing or stale */ }

    const id = 'ses_' + ulid();
    fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
    fs.writeFileSync(sessionFile, JSON.stringify({ id, created: Date.now() }));
    return id;
  } finally {
    if (token) releaseLock(lockFile, token);
  }
}

// --- Redaction (S1+S2+S3: field-aware, fails closed, client fields) ---

function loadRedactionConfig() {
  try {
    const raw = fs.readFileSync(REDACTION_PATH, 'utf8');
    const cfg = JSON.parse(raw);

    const patterns = (cfg.patterns || []).map(p => new RegExp(p, 'gi'));

    // S1: flatten client_sensitive_fields into a single array of lowercase key patterns
    const sensitiveKeys = [];
    const csf = cfg.client_sensitive_fields || {};
    for (const client of Object.keys(csf)) {
      if (client === '_comment') continue;
      const fields = csf[client];
      if (Array.isArray(fields)) {
        for (const f of fields) {
          const lc = String(f).toLowerCase();
          if (lc.length >= 4 && !sensitiveKeys.includes(lc)) sensitiveKeys.push(lc);
        }
      }
    }

    return { patterns, sensitiveKeys };
  } catch {
    return null; // S2: fail closed
  }
}

function redactValue(value, patterns) {
  if (typeof value !== 'string') return { value, hit: false };
  let hit = false;
  for (const re of patterns) {
    re.lastIndex = 0;
    if (re.test(value)) {
      re.lastIndex = 0;
      value = value.replace(re, '[REDACTED]');
      hit = true;
    }
  }
  return { value, hit };
}

function redactObject(obj, patterns, sensitiveKeys) {
  if (typeof obj !== 'object' || obj === null) return false;

  // Handle arrays
  if (Array.isArray(obj)) {
    let anyHit = false;
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'string') {
        const { value, hit } = redactValue(obj[i], patterns);
        obj[i] = value;
        if (hit) anyHit = true;
      } else if (typeof obj[i] === 'object' && obj[i] !== null) {
        if (redactObject(obj[i], patterns, sensitiveKeys)) anyHit = true;
      }
    }
    return anyHit;
  }

  // Handle plain objects
  let anyHit = false;
  for (const key of Object.keys(obj)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      obj[key] = '[REDACTED]';
      anyHit = true;
      continue;
    }
    if (typeof obj[key] === 'string') {
      const { value, hit } = redactValue(obj[key], patterns);
      obj[key] = value;
      if (hit) anyHit = true;
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (redactObject(obj[key], patterns, sensitiveKeys)) anyHit = true;
    }
  }
  return anyHit;
}

function makeRedactionStub(eventId, sessionId, type, ts) {
  return {
    event_id: eventId,
    session_id: sessionId,
    schema_version: 1,
    type: type,
    ts: ts,
    redacted: true,
    redaction_error: true
  };
}

function applyRedaction(eventObj) {
  const cfg = loadRedactionConfig();
  if (cfg === null) {
    return {
      event: makeRedactionStub(eventObj.event_id, eventObj.session_id, eventObj.type, eventObj.ts),
      redacted: true
    };
  }

  try {
    const clone = JSON.parse(JSON.stringify(eventObj));
    const anyHit = redactObject(clone, cfg.patterns, cfg.sensitiveKeys);
    if (anyHit) clone.redacted = true;
    return { event: clone, redacted: anyHit };
  } catch {
    return {
      event: makeRedactionStub(eventObj.event_id, eventObj.session_id, eventObj.type, eventObj.ts),
      redacted: true
    };
  }
}

// --- File locking (token-aware) ---
function acquireLock(lockPath, ttlMs, retries) {
  ttlMs = ttlMs || 10000;
  retries = retries || 3;
  const token = crypto.randomBytes(8).toString('hex');
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      fs.writeFileSync(lockPath, JSON.stringify({
        pid: process.pid, token: token, expires_at: Date.now() + ttlMs
      }), { flag: 'wx' });
      return token;
    } catch (e) {
      if (e.code === 'EEXIST') {
        try {
          const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          if (lock.expires_at < Date.now()) {
            const recheck = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
            if (recheck.token === lock.token) fs.unlinkSync(lockPath);
            continue;
          }
        } catch {
          try { fs.unlinkSync(lockPath); } catch {}
          continue;
        }
        if (attempt < retries - 1) {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
        }
      } else {
        return null;
      }
    }
  }
  return null;
}

function releaseLock(lockPath, token) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (lock.token === token) fs.unlinkSync(lockPath);
  } catch { /* lock already gone or unreadable */ }
}

// --- Event construction ---
function buildEvent(type, hookInput) {
  const ts = new Date().toISOString();
  const base = {
    event_id: 'evt_' + ulid(),
    session_id: getSessionId(),
    schema_version: 1,
    type: type,
    ts: ts,
    redacted: false
  };

  const ti = hookInput.tool_input || {};
  const toolName = hookInput.tool_name || '';
  const isError = hookInput.is_error === true;

  switch (type) {
    case 'tool_outcome':
      return Object.assign(base, {
        tool: toolName,
        command_summary: String(ti.command || ti.file_path || ti.pattern || ti.skill || '').slice(0, 200),
        result: isError ? 'failure' : 'success',
        recovery_action: null,
        duration_ms: null
      });

    case 'skill_usage':
      return Object.assign(base, {
        skill: ti.skill || '',
        action: 'invoked',
        task_type: null,
        mandatory: null,
        skip_reason: null
      });

    case 'context_pressure':
      return Object.assign(base, {
        event: ti.event || 'unknown',
        context_pct: ti.context_pct || null,
        files_in_context: ti.files_in_context || null,
        banks_loaded: ti.banks_loaded || []
      });

    case 'role_dispatch':
      return Object.assign(base, {
        role: ti.role || '',
        trigger: ti.trigger || '',
        task_domain: ti.task_domain || '',
        intervention_followed: false
      });

    case 'entropy_signal':
      return Object.assign(base, {
        category: hookInput.category || '',
        severity: hookInput.severity || 0,
        file: hookInput.file || '',
        detail: hookInput.detail || '',
        scan_tier: hookInput.scan_tier || 'fast'
      });

    case 'intervention':
      return Object.assign(base, {
        severity: hookInput.severity || 'correction',
        harness_component: hookInput.harness_component || '',
        description: hookInput.description || '',
        task_context: hookInput.task_context || '',
        avoidable: hookInput.avoidable || false,
        existing_rule_missed: hookInput.existing_rule_missed || null,
        proposed_fix: hookInput.proposed_fix || null,
        confirmed: hookInput.confirmed || false,
        capture_method: hookInput.capture_method || 'explicit_command'
      });

    default:
      return Object.assign(base, { raw: hookInput });
  }
}

// --- Main ---
function main() {
  const eventType = process.argv[2];
  if (!eventType) process.exit(0);

  let stdin = '';
  try { stdin = fs.readFileSync(0, 'utf8'); } catch {}

  let hookInput = {};
  try { hookInput = JSON.parse(stdin); } catch {}

  const event = buildEvent(eventType, hookInput);
  const { event: redacted } = applyRedaction(event);

  const dateStr = redacted.ts.slice(0, 10);
  const eventDir = path.join(EVENTS_DIR, dateStr);
  fs.mkdirSync(eventDir, { recursive: true });

  const outFile = path.join(eventDir, redacted.session_id + '.jsonl');
  const lockFile = path.join(LOCKS_DIR, 'write.lock');
  fs.mkdirSync(LOCKS_DIR, { recursive: true });

  const token = acquireLock(lockFile);
  if (token) {
    try {
      fs.appendFileSync(outFile, JSON.stringify(redacted) + '\n');
    } finally {
      releaseLock(lockFile, token);
    }
  }
}

// Run main only when executed directly (not when required as module)
if (require.main === module) {
  try { main(); } catch { /* never break the hook chain */ }
}

// Export internals for testing
if (typeof module !== 'undefined') {
  module.exports = {
    acquireLock, releaseLock, getSessionId, ulid,
    loadRedactionConfig, redactValue, redactObject, makeRedactionStub, applyRedaction
  };
}