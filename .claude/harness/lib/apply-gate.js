#!/usr/bin/env node
'use strict';
// apply-gate.js — Mechanical auto-apply gate for the RHO harness.
// Validates AND performs writes for LOW-risk proposals only.
// The cadence prompt must use this script instead of writing directly.
//
// Phase 1 rewrite: proposal JSON input, validate-before-write, operation-aware
// classification, 6 constraint validators, mode enforcement, execFileSync.
//
// Usage: node apply-gate.js <proposal_json_path>
// Exit 0 = write performed. Exit 1 = blocked (reason on stdout as JSON).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const GOVERNED_PATHS = [
  '.claude/harness/config/',
  '.claude/harness/lib/',
  '.claude/harness/tests/',
  '.claude/settings.json',
  '.claude/settings.local.json'
];

const KNOWN_CONSTRAINTS = [
  'additive_only',
  'knowledge_section_only',
  'frontmatter_schema_required',
  'index_entry_only',
  'append_only'
];

const SECTION_BOUNDARIES_PATH = path.join(
  PROJECT_DIR, '.claude', 'harness', 'config', 'section-boundaries.json'
);

// --- Result helpers ---

function blockResult(code, detail) {
  return { ok: false, code: code, detail: detail };
}

function successResult(target, operation, constraint) {
  return { ok: true, paths_written: [target], operation: operation, constraint: constraint };
}

// --- Path utilities ---

function canonicalize(targetPath) {
  const norm = targetPath.replace(/\\/g, '/');
  const parts = norm.split('/');
  const resolved = [];
  for (const part of parts) {
    if (part === '..') {
      if (resolved.length > 0) resolved.pop();
    } else if (part !== '' && part !== '.') {
      resolved.push(part);
    }
  }
  const canonical = resolved.join('/');
  const fullResolved = path.resolve(PROJECT_DIR, canonical);
  const normProject = PROJECT_DIR.replace(/\\/g, '/').replace(/\/$/, '');
  const normResolved = fullResolved.replace(/\\/g, '/');
  if (!normResolved.toLowerCase().startsWith(normProject.toLowerCase() + '/')) {
    return null;
  }
  return canonical;
}

function isGovernedPath(canonical) {
  const lower = canonical.toLowerCase();
  for (const gov of GOVERNED_PATHS) {
    if (lower.startsWith(gov.toLowerCase()) || lower === gov.replace(/\/$/, '').toLowerCase()) {
      return gov;
    }
  }
  return null;
}

// --- Mode enforcement ---

const MODE_ALLOWED_OPS = {
  'edit_existing_only': ['edit'],
  'create_new_or_edit_existing': ['create', 'edit'],
  'append_only': ['append'],
};

function checkModeEnforcement(mode, operation) {
  if (!mode) return null;
  const allowed = MODE_ALLOWED_OPS[mode];
  if (!allowed) return 'unknown mode "' + mode + '" in policy rule';
  if (!allowed.includes(operation)) {
    return 'operation "' + operation + '" not allowed by mode "' + mode + '"';
  }
  return null;
}

// --- Constraint validators ---

function validateAdditiveOnly(oldContent, newContent) {
  if (!oldContent && oldContent !== '') return null;
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  let oldIdx = 0;
  for (let newIdx = 0; newIdx < newLines.length; newIdx++) {
    if (oldIdx < oldLines.length && newLines[newIdx] === oldLines[oldIdx]) {
      oldIdx++;
    }
  }
  if (oldIdx < oldLines.length) {
    return 'line removed or modified at old line ' + (oldIdx + 1) + ': "' +
      oldLines[oldIdx].slice(0, 80) + '"';
  }
  return null;
}

function parseSections(content, boundaryLevel) {
  const lines = content.split('\n');
  const sections = [];
  let currentHeading = null;
  let currentLines = [];
  let preambleLines = [];
  const headingRe = new RegExp('^(' + boundaryLevel.replace(/#/g, '#') + '|#)\\s');
  for (const line of lines) {
    if (headingRe.test(line)) {
      if (currentHeading !== null) {
        sections.push({ heading: currentHeading, content: currentLines.join('\n') });
      } else {
        preambleLines = currentLines.slice();
      }
      currentHeading = line;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading !== null) {
    sections.push({ heading: currentHeading, content: currentLines.join('\n') });
  }
  return { sections: sections, preamble: preambleLines.join('\n') };
}

function validateKnowledgeSectionOnly(oldContent, newContent) {
  let boundaries;
  try {
    boundaries = JSON.parse(fs.readFileSync(SECTION_BOUNDARIES_PATH, 'utf8'));
  } catch {
    return 'section-boundaries.json missing or corrupt';
  }
  const allowedHeadings = boundaries.knowledge_section_headings || [];
  const boundaryLevel = boundaries.heading_level_boundary || '##';
  if (allowedHeadings.length === 0) {
    return 'no allowed headings defined in section-boundaries.json';
  }

  var oldParsed = parseSections(oldContent, boundaryLevel);
  var newParsed = parseSections(newContent, boundaryLevel);
  var oldSections = oldParsed.sections;
  var newSections = newParsed.sections;

  if (oldParsed.preamble !== newParsed.preamble) {
    return 'changes in content before first heading';
  }

  if (oldSections.length === 0 || newSections.length === 0) {
    return 'no section headings found in file (fail closed)';
  }

  var oldHeadingSet = {};
  for (var si = 0; si < oldSections.length; si++) {
    if (oldHeadingSet[oldSections[si].heading]) {
      return 'duplicate heading in file: "' + oldSections[si].heading.slice(0, 80) + '" (fail closed)';
    }
    oldHeadingSet[oldSections[si].heading] = true;
  }
  var newHeadingSet = {};
  for (var sj = 0; sj < newSections.length; sj++) {
    if (newHeadingSet[newSections[sj].heading]) {
      return 'duplicate heading in file: "' + newSections[sj].heading.slice(0, 80) + '" (fail closed)';
    }
    newHeadingSet[newSections[sj].heading] = true;
  }

  const oldMap = {};
  for (const s of oldSections) oldMap[s.heading] = s.content;
  const newMap = {};
  for (const s of newSections) newMap[s.heading] = s.content;

  function isAllowedHeading(heading) {
    const trimmed = heading.trim();
    for (const pattern of allowedHeadings) {
      if (trimmed === pattern || trimmed.startsWith(pattern + ' ') || trimmed === pattern.trim()) {
        return true;
      }
    }
    return false;
  }

  for (const s of oldSections) {
    if (!(s.heading in newMap)) {
      return 'section removed: "' + s.heading.slice(0, 80) + '"';
    }
    if (s.heading in newMap && newMap[s.heading] !== oldMap[s.heading]) {
      if (!isAllowedHeading(s.heading)) {
        return 'changes in non-knowledge section: "' + s.heading.slice(0, 80) + '"';
      }
    }
  }

  for (const s of newSections) {
    if (!(s.heading in oldMap)) {
      if (!isAllowedHeading(s.heading)) {
        return 'new section under non-knowledge heading: "' + s.heading.slice(0, 80) + '"';
      }
    }
  }

  return null;
}

function validateFrontmatterSchema(content, operation) {
  const lines = content.split('\n');
  if (lines[0] !== '---') return 'missing frontmatter opening ---';
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { endIdx = i; break; }
  }
  if (endIdx === -1) return 'missing frontmatter closing ---';
  const frontmatter = lines.slice(1, endIdx).join('\n');

  const required = {
    'name': /^name:\s*\S/m,
    'description': /^description:\s*\S/m,
    'source': /^source:\s*harness_rho\s*$/m,
    'auto_generated': /^auto_generated:\s*true\s*$/m,
    'generated_by': /^generated_by:\s*\S/m
  };

  for (const [field, pattern] of Object.entries(required)) {
    if (!pattern.test(frontmatter)) {
      return 'missing or invalid frontmatter field: ' + field;
    }
  }

  var fmLines = frontmatter.split('\n');
  var inMetadata = false;
  var foundType = false;
  for (var fi = 0; fi < fmLines.length; fi++) {
    if (/^metadata:\s*$/.test(fmLines[fi])) { inMetadata = true; continue; }
    if (inMetadata) {
      if (/^\s+type:\s*\S/.test(fmLines[fi])) { foundType = true; break; }
      if (/^\S/.test(fmLines[fi])) break;
    }
  }
  if (!inMetadata) return 'missing or invalid frontmatter field: metadata';
  if (!foundType) return 'missing or invalid frontmatter field: metadata.type (must be under metadata:)';

  return null;
}

function validateIndexEntryOnly(content) {
  const trimmed = content.replace(/\n$/, '');
  if (trimmed.includes('\n')) return 'index entry must be exactly one line';
  const pattern = /^- \[.+\]\([^/\\]+\.md\) — .+$/;
  if (!pattern.test(trimmed)) {
    return 'index entry format invalid: expected "- [Title](filename.md) — description"';
  }
  const filenameMatch = trimmed.match(/\]\(([^)]+)\)/);
  if (filenameMatch) {
    const filename = filenameMatch[1];
    if (filename.includes('..') || filename.includes('\0')) {
      return 'index entry filename contains path traversal';
    }
  }
  return null;
}

function validateAppendOnly() {
  return null;
}

function runConstraintValidator(constraint, oldContent, newContent, operation) {
  if (!constraint) return blockResult('blocked_missing_constraint', 'policy rule has target but no constraint');
  if (!KNOWN_CONSTRAINTS.includes(constraint)) {
    return blockResult('blocked_unknown_constraint', 'constraint "' + constraint + '" is not recognised');
  }

  var violation = null;
  switch (constraint) {
    case 'additive_only':
      violation = validateAdditiveOnly(oldContent, newContent);
      if (violation) return blockResult('blocked_additive_only_violation', violation);
      break;
    case 'knowledge_section_only':
      violation = validateKnowledgeSectionOnly(oldContent, newContent);
      if (violation) return blockResult('blocked_knowledge_section_violation', violation);
      break;
    case 'frontmatter_schema_required':
      violation = validateFrontmatterSchema(newContent, operation);
      if (violation) return blockResult('blocked_frontmatter_invalid', violation);
      break;
    case 'index_entry_only':
      var entryContent = (operation === 'append' && oldContent !== null)
        ? newContent.slice(oldContent.length) : newContent;
      violation = validateIndexEntryOnly(entryContent);
      if (violation) return blockResult('blocked_index_format_invalid', violation);
      break;
    case 'append_only':
      violation = validateAppendOnly();
      break;
  }
  return null;
}

// --- Evidence validation ---

function buildEventIdSet() {
  const EVENTS_DIR = path.join(PROJECT_DIR, '.claude', 'harness', 'data', 'events');
  const ids = new Set();
  try {
    const dateDirs = fs.readdirSync(EVENTS_DIR);
    for (const dateDir of dateDirs) {
      const dirPath = path.join(EVENTS_DIR, dateDir);
      try { if (!fs.statSync(dirPath).isDirectory()) continue; } catch { continue; }
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;
        const content = fs.readFileSync(path.join(dirPath, file), 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try { const evt = JSON.parse(line); if (evt.event_id) ids.add(evt.event_id); }
          catch { /* skip corrupt */ }
        }
      }
    }
  } catch { /* EVENTS_DIR missing */ }
  return ids;
}

function validateEvidenceIds(evidenceArray) {
  const CROCKFORD_BASE32 = /^[0-9A-HJKMNP-TV-Z]{20,}$/i;
  const seenIds = {};
  const knownIds = buildEventIdSet();

  for (let i = 0; i < evidenceArray.length; i++) {
    const entry = evidenceArray[i];
    if (typeof entry !== 'string') {
      return 'evidence[' + i + ']: not a string';
    }
    const colonIdx = entry.indexOf(':');
    const bareId = colonIdx === -1 ? entry : entry.slice(0, colonIdx);
    if (!bareId.startsWith('evt_')) {
      return 'evidence[' + i + ']: missing evt_ prefix';
    }
    if (!CROCKFORD_BASE32.test(bareId.slice(4))) {
      return 'evidence[' + i + ']: invalid Crockford Base32 after evt_ prefix';
    }
    if (seenIds[bareId]) {
      return 'evidence[' + i + ']: duplicate ID ' + bareId;
    }
    seenIds[bareId] = true;

    if (!knownIds.has(bareId)) {
      return 'evidence[' + i + ']: ID ' + bareId + ' not found in event files';
    }
  }
  return null;
}

// --- Dirty-tree preflight ---

function dirtyTreePreflight(writtenPaths) {
  let output;
  try {
    output = execFileSync('git', ['status', '--porcelain'], {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
      timeout: 10000
    });
  } catch (e) {
    return { clean: false, reason: 'blocked_git_status_failed', detail: e.message || String(e) };
  }

  const lines = output.split('\n').filter(Boolean);
  const writtenSet = new Set(writtenPaths.map(function(p) { return p.replace(/\\/g, '/'); }));

  for (const line of lines) {
    const xy = line.slice(0, 2);
    const filePath = line.slice(3).replace(/^"/, '').replace(/"$/, '').replace(/\\/g, '/');
    const staged = xy[0] !== ' ' && xy[0] !== '?';
    const unstaged = xy[1] !== ' ' && xy[1] !== '?';

    if (staged && writtenSet.has(filePath)) {
      return { clean: false, reason: 'blocked_pre_staged_content', path: filePath };
    }
    if (staged && !writtenSet.has(filePath)) {
      return { clean: false, reason: 'blocked_foreign_staged_content', path: filePath };
    }
    if (unstaged && !writtenSet.has(filePath) && xy[0] !== '?') {
      return { clean: false, reason: 'blocked_dirty_owned_path', path: filePath };
    }
  }

  return { clean: true, paths: writtenPaths };
}

// --- Main apply function ---

function apply(proposalPath) {
  // 1. Read and parse proposal JSON
  let proposalRaw;
  try {
    proposalRaw = fs.readFileSync(proposalPath, 'utf8');
  } catch (e) {
    return blockResult('blocked_proposal_read_failed', 'cannot read proposal file: ' + (e.message || e));
  }

  let proposal;
  try {
    proposal = JSON.parse(proposalRaw);
  } catch (e) {
    return blockResult('blocked_proposal_parse_failed', 'invalid JSON in proposal: ' + (e.message || e));
  }

  // 2. Schema validation
  const proposalUtils = require('./proposal-utils.js');
  const schemaCheck = proposalUtils.validateProposalSchema(proposal);
  if (!schemaCheck.valid) {
    return blockResult('blocked_proposal_schema_invalid', schemaCheck.reason);
  }

  // 3. Content-hash verification
  const hashCheck = proposalUtils.verifyContentHash(proposal);
  if (!hashCheck.valid) {
    return blockResult('blocked_content_hash_mismatch', hashCheck.reason);
  }

  // 4. Canonicalize target path
  const canonical = canonicalize(proposal.target_file);
  if (canonical === null) {
    return blockResult('blocked_path_traversal', 'target resolves outside project root');
  }
  if (canonical !== proposal.target_file.replace(/\\/g, '/')) {
    return blockResult('blocked_proposal_policy_mismatch',
      'target_file "' + proposal.target_file + '" is not canonical (expected "' + canonical + '")');
  }

  // 5. Governed paths check
  const govPath = isGovernedPath(canonical);
  if (govPath) {
    return blockResult('blocked_governed_path', 'target is under governed path ' + govPath);
  }

  // 6. Risk classification (operation-aware)
  const riskClassify = require('./risk-classify.js');
  const classification = riskClassify.classify({
    target_file: canonical,
    evidence: proposal.evidence,
    operation: proposal.operation
  });

  if (classification.risk !== 'LOW') {
    return blockResult('blocked_risk_not_low', 'risk is ' + classification.risk + ': ' + classification.reason);
  }

  // 7. Cross-check proposal fields against classifier output
  if (proposal.risk !== classification.risk) {
    return blockResult('blocked_proposal_policy_mismatch',
      'proposal claims risk ' + proposal.risk + ' but classifier returned ' + classification.risk);
  }
  const derivedConstraint = classification.matched_rule ? classification.matched_rule.constraint : null;
  if (derivedConstraint && proposal.constraint !== derivedConstraint) {
    return blockResult('blocked_proposal_policy_mismatch',
      'proposal claims constraint "' + proposal.constraint + '" but policy rule has "' + derivedConstraint + '"');
  }

  // 8. Evidence validation
  const evidenceError = validateEvidenceIds(proposal.evidence);
  if (evidenceError) {
    return blockResult('blocked_evidence_invalid', evidenceError);
  }

  // 9. Mode enforcement
  const matchedMode = classification.matched_rule ? classification.matched_rule.mode : null;
  const modeError = checkModeEnforcement(matchedMode, proposal.operation);
  if (modeError) {
    return blockResult('blocked_operation_mode_violation', modeError);
  }

  // 10. Operation-specific file existence checks
  const fullPath = path.resolve(PROJECT_DIR, canonical);
  if (proposal.operation === 'create' && fs.existsSync(fullPath)) {
    return blockResult('blocked_file_exists', 'operation is create but target already exists');
  }
  if ((proposal.operation === 'edit' || proposal.operation === 'append') && !fs.existsSync(fullPath)) {
    return blockResult('blocked_file_missing', 'operation is ' + proposal.operation + ' but target does not exist');
  }

  // 11. Pre-write dirty check — block if target has uncommitted changes
  if (proposal.operation === 'edit' || proposal.operation === 'append') {
    try {
      var targetStatus = execFileSync('git', ['status', '--porcelain', '--', canonical], {
        cwd: PROJECT_DIR, encoding: 'utf8', timeout: 10000
      });
      if (targetStatus.trim()) {
        return blockResult('blocked_target_dirty', 'target file has uncommitted changes');
      }
    } catch (e) { /* not a git repo or git unavailable — skip */ }
  }

  // 12. Pre-write constraint validation (validate-before-write)
  let oldContent = null;
  if (proposal.operation === 'edit' || proposal.operation === 'append') {
    oldContent = fs.readFileSync(fullPath, 'utf8');
  }

  let newContent;
  if (proposal.operation === 'append') {
    newContent = oldContent + proposal.content;
  } else {
    newContent = proposal.content;
  }

  const constraintResult = runConstraintValidator(derivedConstraint, oldContent, newContent, proposal.operation);
  if (constraintResult) {
    return constraintResult;
  }

  // 12. Perform the write
  if (proposal.operation === 'create') {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  }
  if (proposal.operation === 'append') {
    fs.appendFileSync(fullPath, proposal.content);
  } else {
    fs.writeFileSync(fullPath, newContent);
  }

  return successResult(canonical, proposal.operation, derivedConstraint);
}

// --- CLI entrypoint ---

if (require.main === module) {
  const proposalPath = process.argv[2];
  if (!proposalPath) {
    process.stdout.write(JSON.stringify({ ok: false, code: 'missing_argument', detail: 'Usage: node apply-gate.js <proposal_json_path>' }) + '\n');
    process.exit(1);
  }
  const result = apply(proposalPath);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.ok ? 0 : 1);
}

module.exports = { apply, dirtyTreePreflight, canonicalize, isGovernedPath, checkModeEnforcement,
  validateAdditiveOnly, validateKnowledgeSectionOnly, validateFrontmatterSchema,
  validateIndexEntryOnly, runConstraintValidator, validateEvidenceIds };