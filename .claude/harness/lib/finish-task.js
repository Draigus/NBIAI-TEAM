#!/usr/bin/env node
'use strict';
const R = require('./resolve');
const { scanDirtyState } = require('./verification-state');
const { readLedger, getValidEvidence } = require('./evidence-ledger');
const { resolve } = require('./verification-resolver');

function run() {
  const state = scanDirtyState();
  if (!state) {
    console.log('TASK COMPLETION REPORT');
    console.log('======================');
    console.log('Status: UNABLE TO SCAN -- not a git repository or scan failed.');
    return { verified: false, reason: 'scan_failed' };
  }

  const currentFingerprints = {};
  let hasDirty = false;
  for (const [surface, info] of Object.entries(state.surfaces)) {
    currentFingerprints[surface] = info.fingerprint;
    if (info.dirty) hasDirty = true;
  }

  if (!hasDirty) {
    console.log('TASK COMPLETION REPORT');
    console.log('======================');
    console.log('Dirty surfaces: none');
    console.log('Status: CLEAN -- no uncommitted changes detected.');
    return { verified: true, reason: 'clean' };
  }

  const validEvidence = getValidEvidence(currentFingerprints);
  const resolution = resolve(currentFingerprints, validEvidence);

  console.log('TASK COMPLETION REPORT');
  console.log('======================');

  const dirtySurfaces = Object.entries(state.surfaces)
    .filter(([, info]) => info.dirty)
    .map(([name]) => name);
  console.log('Dirty surfaces: ' + dirtySurfaces.join(', '));

  if (validEvidence.length > 0) {
    console.log('Evidence:');
    for (const ev of validEvidence) {
      const cmd = typeof ev.command === 'object' ? ev.command.raw : ev.command;
      const surfaces = (ev.surfaces_covered || []).join(', ');
      console.log('  - ' + ev.id + ': ' + cmd + ', ' + ev.result_summary + ' (' + surfaces + ')');
    }
  } else {
    console.log('Evidence: none');
  }

  console.log('Fingerprints: ' + dirtySurfaces.map(s => {
    const fp = currentFingerprints[s];
    if (!fp) return s + ' null';
    const hasMatch = validEvidence.some(
      ev => ev.surface_fingerprints && ev.surface_fingerprints[s] === fp
    );
    return s + ' ' + fp.slice(0, 6) + ' ' + (hasMatch ? 'MATCH' : 'NO EVIDENCE');
  }).join(', '));

  console.log('Resolver: ' + resolution.summary);

  if (resolution.all_satisfied) {
    console.log('Status: VERIFIED -- safe to commit and claim complete.');
    return { verified: true, reason: 'satisfied', resolution };
  } else {
    console.log('Status: NOT VERIFIED -- ' + resolution.summary);
    return { verified: false, reason: 'unsatisfied', resolution };
  }
}

if (require.main === module) {
  const result = run();
  process.exit(result.verified ? 0 : 1);
}

module.exports = { run };
