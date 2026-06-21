#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const R = require('./resolve');

function loadRequirements() {
  const reqPath = path.join(R.CONFIG_DIR, 'verification-requirements.json');
  try {
    return JSON.parse(fs.readFileSync(reqPath, 'utf8')).requirements;
  } catch {
    return {};
  }
}

function resolve(currentFingerprints, validEvidence) {
  const requirements = loadRequirements();
  const result = { all_satisfied: true, surfaces: {}, summary: '' };
  const missing = [];

  for (const [surface, fingerprint] of Object.entries(currentFingerprints)) {
    if (!fingerprint) continue;

    const req = requirements[surface];
    if (!req || !req.required || req.required.length === 0) {
      result.surfaces[surface] = {
        dirty: true,
        fingerprint: fingerprint,
        required: [],
        satisfied: [],
        missing: [],
        evidence_ids: []
      };
      continue;
    }

    const surfaceEvidence = validEvidence.filter(
      e => e.surface_fingerprints && e.surface_fingerprints[surface] === fingerprint
    );

    const satisfiedTypes = new Set();
    const evidenceIds = [];
    for (const ev of surfaceEvidence) {
      satisfiedTypes.add(ev.type);
      evidenceIds.push(ev.id);
    }

    const satisfied = [];
    const surfaceMissing = [];

    for (const reqItem of req.required) {
      const alternatives = reqItem.split('|').map(s => s.trim());
      const found = alternatives.some(alt => satisfiedTypes.has(alt));
      if (found) {
        satisfied.push(reqItem);
      } else {
        surfaceMissing.push(reqItem);
      }
    }

    if (surfaceMissing.length > 0) {
      result.all_satisfied = false;
      missing.push({ surface, missing: surfaceMissing });
    }

    result.surfaces[surface] = {
      dirty: true,
      fingerprint: fingerprint,
      required: req.required,
      satisfied: satisfied,
      missing: surfaceMissing,
      evidence_ids: evidenceIds
    };
  }

  result.summary = formatSummary(result);
  return result;
}

function formatSummary(resolution) {
  if (resolution.all_satisfied) return 'ALL SATISFIED';

  const parts = [];
  for (const [surface, info] of Object.entries(resolution.surfaces)) {
    if (info.missing && info.missing.length > 0) {
      const missingStr = info.missing.map(m => {
        if (m.includes('|')) {
          return m.split('|').join(' or ');
        }
        return m;
      }).join(', ');
      parts.push(surface + ': ' + missingStr);
    }
  }

  if (parts.length === 0) return 'ALL SATISFIED';

  const actions = [];
  const allMissing = parts.join('; ');
  if (allMissing.includes('unit_test')) actions.push('npm test');
  if (allMissing.includes('e2e_test') || allMissing.includes('browser_check')) {
    actions.push('npm run test:e2e or browser check');
  }
  if (allMissing.includes('web_search')) actions.push('web search for fact verification');
  if (allMissing.includes('bank_read')) actions.push('read the bank content');

  let summary = 'Missing: ' + allMissing + '.';
  if (actions.length > 0) {
    summary += ' Run ' + actions.join(', ') + '.';
  }
  return summary;
}

module.exports = { loadRequirements, resolve, formatSummary };
