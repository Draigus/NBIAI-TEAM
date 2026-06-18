#!/usr/bin/env node
'use strict';
// proposal-utils.js — Proposal validation utilities for the RHO harness apply-gate.
// Provides: content-hash computation, proposal schema validation, evidence ID validation.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const EVENTS_DIR = path.join(PROJECT_DIR, '.claude', 'harness', 'data', 'events');

// --- Content Hash ---

function canonicalJson(proposal) {
  const copy = Object.assign({}, proposal);
  copy.content_hash = '';
  const sorted = {};
  for (const key of Object.keys(copy).sort()) {
    sorted[key] = copy[key];
  }
  return JSON.stringify(sorted);
}

function computeContentHash(proposal) {
  const canonical = canonicalJson(proposal);
  return 'sha256:' + crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function verifyContentHash(proposal) {
  if (!proposal.content_hash) return { valid: false, reason: 'content_hash field missing' };
  const expected = computeContentHash(proposal);
  if (proposal.content_hash !== expected) {
    return { valid: false, reason: 'content_hash mismatch: expected ' + expected + ', got ' + proposal.content_hash };
  }
  return { valid: true };
}

// --- Proposal Schema Validation ---

const REQUIRED_FIELDS = ['proposal_id', 'target_file', 'operation', 'content', 'content_hash', 'evidence', 'risk', 'constraint'];
const VALID_OPERATIONS = ['create', 'edit', 'append'];
const VALID_RISKS = ['LOW', 'HIGH', 'BLOCKED_TO_APPLY'];

function validateProposalSchema(proposal) {
  if (!proposal || typeof proposal !== 'object') {
    return { valid: false, reason: 'proposal is not an object' };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in proposal)) {
      return { valid: false, reason: 'missing required field: ' + field };
    }
  }

  if (typeof proposal.proposal_id !== 'string' || !proposal.proposal_id) {
    return { valid: false, reason: 'proposal_id must be a non-empty string' };
  }
  if (typeof proposal.target_file !== 'string' || !proposal.target_file) {
    return { valid: false, reason: 'target_file must be a non-empty string' };
  }
  if (!VALID_OPERATIONS.includes(proposal.operation)) {
    return { valid: false, reason: 'operation must be one of: ' + VALID_OPERATIONS.join(', ') };
  }
  if (typeof proposal.content !== 'string') {
    return { valid: false, reason: 'content must be a string' };
  }
  if (typeof proposal.content_hash !== 'string' || !proposal.content_hash.startsWith('sha256:')) {
    return { valid: false, reason: 'content_hash must be a string starting with sha256:' };
  }
  if (!Array.isArray(proposal.evidence)) {
    return { valid: false, reason: 'evidence must be an array' };
  }
  if (!VALID_RISKS.includes(proposal.risk)) {
    return { valid: false, reason: 'risk must be one of: ' + VALID_RISKS.join(', ') };
  }
  if (typeof proposal.constraint !== 'string') {
    return { valid: false, reason: 'constraint must be a string' };
  }

  return { valid: true };
}

// --- Evidence ID Validation ---

// Accept both bare IDs (evt_01JXYZ...) and suffixed (evt_01JXYZ...:intervention:2026-06-04)
const CROCKFORD_BASE32 = /^[0-9A-HJKMNP-TV-Z]{20,}$/i;

function extractEvidenceId(evidenceEntry) {
  if (typeof evidenceEntry !== 'string') return null;
  const colonIdx = evidenceEntry.indexOf(':');
  const bareId = colonIdx === -1 ? evidenceEntry : evidenceEntry.slice(0, colonIdx);
  return bareId;
}

function validateEvidenceId(bareId) {
  if (!bareId || typeof bareId !== 'string') return false;
  if (!bareId.startsWith('evt_')) return false;
  const suffix = bareId.slice(4);
  return CROCKFORD_BASE32.test(suffix);
}

function evidenceIdExistsInEvents(bareId) {
  if (!fs.existsSync(EVENTS_DIR)) return false;
  try {
    const dateDirs = fs.readdirSync(EVENTS_DIR);
    for (const dateDir of dateDirs) {
      const dirPath = path.join(EVENTS_DIR, dateDir);
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) continue;
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;
        const filePath = path.join(dirPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(bareId)) return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

function validateEvidence(evidenceArray, opts) {
  const checkExistence = opts && opts.checkExistence;
  const errors = [];

  for (let i = 0; i < evidenceArray.length; i++) {
    const entry = evidenceArray[i];
    const bareId = extractEvidenceId(entry);
    if (!bareId) {
      errors.push('evidence[' + i + ']: not a string');
      continue;
    }
    if (!validateEvidenceId(bareId)) {
      errors.push('evidence[' + i + ']: invalid format — expected evt_ followed by 20+ Crockford Base32 chars, got ' + bareId);
      continue;
    }
    if (checkExistence && !evidenceIdExistsInEvents(bareId)) {
      errors.push('evidence[' + i + ']: ID ' + bareId + ' not found in any event file');
    }
  }

  return errors.length === 0
    ? { valid: true }
    : { valid: false, reason: errors.join('; ') };
}

// --- ISO Week and Proposal Directory ---

const PROPOSALS_DIR = path.join(PROJECT_DIR, '.claude', 'harness', 'proposals');
const STATUS_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'data', 'proposal_status.jsonl');

function computeIsoWeek(date) {
  var d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  var yearStart = new Date(d.getFullYear(), 0, 1);
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getFullYear() + '-W' + String(weekNo).padStart(2, '0');
}

function proposalDirPath(isoWeek) {
  return path.join(PROPOSALS_DIR, isoWeek);
}

function ensureProposalDir(isoWeek) {
  var dir = proposalDirPath(isoWeek);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function nextProposalId(isoWeek) {
  var dir = proposalDirPath(isoWeek);
  var maxNum = 0;
  if (fs.existsSync(dir)) {
    var files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++) {
      var match = files[i].match(/^RHO-.*-(\d{3})\.json$/);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  return 'RHO-' + isoWeek + '-' + String(maxNum + 1).padStart(3, '0');
}

// --- Full Proposal Schema (Recorder output, spec §5.1) ---

var FULL_REQUIRED_FIELDS = [
  'id', 'created', 'classification', 'failure_code', 'target_file',
  'risk', 'evidence', 'diagnosis', 'proposed_change', 'content_hash', 'status'
];

function validateFullProposalSchema(proposal) {
  if (!proposal || typeof proposal !== 'object') {
    return { valid: false, reason: 'proposal is not an object' };
  }
  for (var i = 0; i < FULL_REQUIRED_FIELDS.length; i++) {
    var field = FULL_REQUIRED_FIELDS[i];
    if (!(field in proposal)) {
      return { valid: false, reason: 'missing required field: ' + field };
    }
  }
  if (typeof proposal.id !== 'string' || !/^RHO-\d{4}-W\d{2}-\d{3}$/.test(proposal.id)) {
    return { valid: false, reason: 'id must match RHO-YYYY-WNN-NNN format' };
  }
  if (typeof proposal.created !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(proposal.created)) {
    return { valid: false, reason: 'created must be an ISO 8601 datetime string' };
  }
  if (!VALID_RISKS.includes(proposal.risk)) {
    return { valid: false, reason: 'risk must be one of: ' + VALID_RISKS.join(', ') };
  }
  if (!Array.isArray(proposal.evidence)) {
    return { valid: false, reason: 'evidence must be an array' };
  }
  if (typeof proposal.content_hash !== 'string' || !proposal.content_hash.startsWith('sha256:')) {
    return { valid: false, reason: 'content_hash must start with sha256:' };
  }
  if (proposal.status !== 'pending') {
    return { valid: false, reason: 'initial status must be pending' };
  }
  var stringFields = ['classification', 'failure_code', 'target_file', 'diagnosis', 'proposed_change'];
  for (var j = 0; j < stringFields.length; j++) {
    if (typeof proposal[stringFields[j]] !== 'string' || !proposal[stringFields[j]]) {
      return { valid: false, reason: stringFields[j] + ' must be a non-empty string' };
    }
  }
  return { valid: true };
}

// --- Proposal I/O ---

function writeProposal(proposal) {
  var match = proposal.id.match(/^RHO-(\d{4}-W\d{2})-\d{3}$/);
  if (!match) return { ok: false, reason: 'invalid proposal id format' };
  var isoWeek = match[1];
  var dir = ensureProposalDir(isoWeek);
  var filePath = path.join(dir, proposal.id + '.json');
  if (fs.existsSync(filePath)) {
    return { ok: false, reason: 'proposal file already exists (immutable)' };
  }
  fs.writeFileSync(filePath, JSON.stringify(proposal, null, 2));
  return { ok: true, path: filePath };
}

function readProposal(proposalId) {
  var match = proposalId.match(/^RHO-(\d{4}-W\d{2})-\d{3}$/);
  if (!match) return null;
  var filePath = path.join(PROPOSALS_DIR, match[1], proposalId + '.json');
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch { return null; }
}

function listProposals(isoWeek) {
  var dir = proposalDirPath(isoWeek);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(function(f) { return f.startsWith('RHO-') && f.endsWith('.json'); })
    .map(function(f) { return f.replace('.json', ''); })
    .sort();
}

// --- Status Transitions (spec §5.1) ---

var VALID_TRANSITIONS = {
  'pending': { 'applied': ['applier'], 'approved': ['glen'], 'rejected': ['glen'], 'superseded': ['recorder'] },
  'approved': { 'applied': ['applier'] },
  'applied': { 'validated_by_evidence': ['recorder'], 'validated_by_absence': ['recorder'], 'regressed': ['recorder'] },
  'regressed': { 'rollback_proposed': ['recorder'] }
};

function validateTransition(fromStatus, toStatus, actor) {
  var fromMap = VALID_TRANSITIONS[fromStatus];
  if (!fromMap) return { valid: false, reason: 'invalid from_status: ' + fromStatus };
  var allowedActors = fromMap[toStatus];
  if (!allowedActors) return { valid: false, reason: 'transition ' + fromStatus + ' -> ' + toStatus + ' not allowed' };
  if (!allowedActors.includes(actor)) {
    return { valid: false, reason: 'actor "' + actor + '" cannot perform ' + fromStatus + ' -> ' + toStatus };
  }
  return { valid: true };
}

function appendStatusTransition(event) {
  if (!event || typeof event !== 'object') {
    return { ok: false, reason: 'event is not an object' };
  }
  var required = ['event_id', 'proposal_id', 'proposal_hash', 'ts', 'actor', 'from_status', 'to_status'];
  for (var i = 0; i < required.length; i++) {
    if (typeof event[required[i]] !== 'string' || !event[required[i]]) {
      return { ok: false, reason: 'missing or empty field: ' + required[i] };
    }
  }
  var tv = validateTransition(event.from_status, event.to_status, event.actor);
  if (!tv.valid) return { ok: false, reason: tv.reason };

  // Idempotency: skip if exact (proposal_id, from_status, to_status, actor) already exists
  var existing = readAllStatuses();
  for (var j = 0; j < existing.length; j++) {
    var ex = existing[j];
    if (ex.proposal_id === event.proposal_id && ex.from_status === event.from_status &&
        ex.to_status === event.to_status && ex.actor === event.actor) {
      return { ok: true, idempotent: true };
    }
  }

  var dataDir = path.dirname(STATUS_PATH);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.appendFileSync(STATUS_PATH, JSON.stringify(event) + '\n');
  return { ok: true };
}

function readAllStatuses() {
  if (!fs.existsSync(STATUS_PATH)) return [];
  var lines = fs.readFileSync(STATUS_PATH, 'utf8').split('\n').filter(Boolean);
  var events = [];
  for (var i = 0; i < lines.length; i++) {
    try { events.push(JSON.parse(lines[i])); } catch { /* skip corrupt lines */ }
  }
  return events;
}

function readCurrentStatus(proposalId) {
  var events = readAllStatuses();
  var latest = null;
  for (var i = 0; i < events.length; i++) {
    if (events[i].proposal_id === proposalId) {
      if (!latest || events[i].ts > latest.ts) {
        latest = events[i];
      }
    }
  }
  return latest ? latest.to_status : 'pending';
}

// --- Digest Generation ---

function generateDigest(isoWeek) {
  var ids = listProposals(isoWeek);
  var groups = { LOW: [], HIGH: [], BLOCKED_TO_APPLY: [] };
  for (var i = 0; i < ids.length; i++) {
    var p = readProposal(ids[i]);
    if (!p) continue;
    var status = readCurrentStatus(p.id);
    var group = groups[p.risk] || groups.HIGH;
    group.push({ proposal: p, status: status });
  }

  var lines = ['# Weekly Digest — ' + isoWeek, ''];
  var riskLabels = {
    LOW: '## LOW (Auto-Applied)',
    HIGH: '## HIGH (Glen Review Required)',
    BLOCKED_TO_APPLY: '## BLOCKED_TO_APPLY (Manual Application)'
  };

  var riskOrder = ['LOW', 'HIGH', 'BLOCKED_TO_APPLY'];
  for (var ri = 0; ri < riskOrder.length; ri++) {
    var risk = riskOrder[ri];
    var items = groups[risk];
    if (items.length === 0) continue;
    lines.push(riskLabels[risk]);
    lines.push('');
    for (var j = 0; j < items.length; j++) {
      var entry = items[j];
      var ep = entry.proposal;
      lines.push('### ' + ep.id + ': ' + ep.classification + ' — ' + ep.target_file);
      lines.push('- Diagnosis: ' + ep.diagnosis);
      lines.push('- Change: ' + ep.proposed_change);
      lines.push('- Evidence: ' + ep.evidence.join(', '));
      if (ep.anti_regression) {
        lines.push('- Anti-regression key: ' + (ep.anti_regression.key || []).join('/'));
      }
      lines.push('- Status: ' + entry.status);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function writeDigest(isoWeek) {
  var content = generateDigest(isoWeek);
  var dir = ensureProposalDir(isoWeek);
  var digestPath = path.join(dir, 'DIGEST.md');
  fs.writeFileSync(digestPath, content);
  return digestPath;
}

module.exports = {
  canonicalJson,
  computeContentHash,
  verifyContentHash,
  validateProposalSchema,
  extractEvidenceId,
  validateEvidenceId,
  evidenceIdExistsInEvents,
  validateEvidence,
  REQUIRED_FIELDS,
  VALID_OPERATIONS,
  VALID_RISKS,
  computeIsoWeek,
  proposalDirPath,
  ensureProposalDir,
  nextProposalId,
  validateFullProposalSchema,
  FULL_REQUIRED_FIELDS,
  writeProposal,
  readProposal,
  listProposals,
  VALID_TRANSITIONS,
  validateTransition,
  appendStatusTransition,
  readAllStatuses,
  readCurrentStatus,
  generateDigest,
  writeDigest
};