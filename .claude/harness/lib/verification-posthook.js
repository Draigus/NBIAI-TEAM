#!/usr/bin/env node
'use strict';
// verification-posthook.js -- PostToolUse hook for evidence recording and
// dirty-state nudge injection.
//
// Handles multiple tool types via tool_name dispatch:
//   Bash/PowerShell: command-detector evidence + dirty-state scan + nudge
//   Edit/Write:      dirty-state scan + nudge
//   Read:            bank_read evidence for intelligence/banks/**
//   WebSearch:       web_search evidence for client_deliverables
//   Playwright MCP:  browser_check evidence (navigate + inspect pairs)
//
// Evidence recording is synchronous (fast). Dirty-state scan uses the async
// cache for nudges (Layer 5 -- model compliance, not enforcement).

const fs = require('fs');
const path = require('path');
const R = require('./resolve');

var commandDetector, verificationState, evidenceLedger;
try {
  commandDetector = require('./command-detector');
  verificationState = require('./verification-state');
  evidenceLedger = require('./evidence-ledger');
} catch (_) {
  process.exit(0);
}

var BROWSER_STATE_FILE = path.join(R.PROJECT_DATA_DIR, '.browser_navigate_state.json');

function output(obj) {
  process.stdout.write(JSON.stringify(obj));
}

function getCurrentFingerprints() {
  var state = verificationState.scanDirtyState();
  var fps = {};
  for (var surface in state.surfaces) {
    if (state.surfaces[surface].fingerprint) {
      fps[surface] = state.surfaces[surface].fingerprint;
    }
  }
  return fps;
}

function getSurfaceFingerprints(surfacesCovered, allFingerprints) {
  var fps = {};
  for (var i = 0; i < surfacesCovered.length; i++) {
    var s = surfacesCovered[i];
    if (allFingerprints[s]) fps[s] = allFingerprints[s];
  }
  return fps;
}

function buildNudgeMessage(state) {
  if (!state || !state.surfaces) return null;

  var dirtySurfaces = [];
  for (var surface in state.surfaces) {
    if (state.surfaces[surface].dirty && surface !== 'docs') {
      dirtySurfaces.push(surface);
    }
  }

  if (dirtySurfaces.length === 0) return null;

  var validEvidence = evidenceLedger.getValidEvidence(
    (function() {
      var fps = {};
      for (var s in state.surfaces) fps[s] = state.surfaces[s].fingerprint;
      return fps;
    })()
  );

  var resolver = require('./verification-resolver');
  var fps = {};
  for (var s in state.surfaces) fps[s] = state.surfaces[s].fingerprint;
  var resolution = resolver.resolve(fps, validEvidence);

  if (resolution.all_satisfied) return null;

  var missing = [];
  for (var surf in resolution.surfaces) {
    var info = resolution.surfaces[surf];
    if (info.missing && info.missing.length > 0) {
      missing.push(surf + ': ' + info.missing.join(', '));
    }
  }

  return 'VERIFICATION STATE: surfaces dirty: [' + dirtySurfaces.join(', ') +
    ']. Missing: ' + missing.join('; ') +
    '. Do not claim completion until verification passes.';
}

function handleBashPowerShell(hookData) {
  var command = (hookData.tool_input || {}).command || '';
  var toolResult = hookData.tool_result || {};
  var exitCode = typeof toolResult.exitCode === 'number' ? toolResult.exitCode :
                 typeof toolResult.exit_code === 'number' ? toolResult.exit_code : 0;

  if (!command) return;

  var cwd = toolResult.cwd || R.PROJECT_DIR;
  var detected = commandDetector.detectEvidenceType(command, cwd);

  if (detected !== null && exitCode !== null) {
    var allFingerprints = getCurrentFingerprints();

    if (Array.isArray(detected)) {
      for (var i = 0; i < detected.length; i++) {
        var d = detected[i];
        var fps = getSurfaceFingerprints(d.surfacesCovered, allFingerprints);
        var summary = exitCode === 0 ? 'passed' : 'failed';
        evidenceLedger.recordEvidence(
          d.type,
          { raw: command, resolved: command, cwd: cwd },
          exitCode,
          summary,
          fps
        );
      }
    } else {
      var fps = getSurfaceFingerprints(detected.surfacesCovered, allFingerprints);
      var summary = exitCode === 0 ? 'passed' : 'failed';
      evidenceLedger.recordEvidence(
        detected.type,
        { raw: command, resolved: command, cwd: cwd },
        exitCode,
        summary,
        fps
      );
    }
  }

  var state = verificationState.scanDirtyState();
  var nudge = buildNudgeMessage(state);
  if (nudge) output({ hookSpecificOutput: nudge });
}

function handleEditWrite(hookData) {
  var filePath = (hookData.tool_input || {}).file_path || '';
  if (!filePath) return;

  var surface = verificationState.classifySurface(
    path.relative(R.PROJECT_DIR, filePath).replace(/\\/g, '/')
  );
  if (!surface || surface === 'docs') return;

  var state = verificationState.scanDirtyState();
  var nudge = buildNudgeMessage(state);
  if (nudge) output({ hookSpecificOutput: nudge });
}

function handleRead(hookData) {
  var filePath = (hookData.tool_input || {}).file_path || '';
  if (!filePath) return;

  var rel = path.relative(R.PROJECT_DIR, filePath).replace(/\\/g, '/');
  if (!/^intelligence\/banks\//.test(rel)) return;

  var allFingerprints = getCurrentFingerprints();
  var fps = {};
  if (allFingerprints.intelligence) fps.intelligence = allFingerprints.intelligence;

  evidenceLedger.recordEvidence(
    'bank_read',
    { raw: 'Read ' + rel, resolved: 'Read ' + rel, cwd: R.PROJECT_DIR },
    0,
    'Read bank: ' + path.basename(filePath),
    fps
  );
}

function handleWebSearch(hookData) {
  var query = (hookData.tool_input || {}).query || '';

  var allFingerprints = getCurrentFingerprints();
  var fps = {};
  if (allFingerprints.client_deliverables) {
    fps.client_deliverables = allFingerprints.client_deliverables;
  }

  evidenceLedger.recordEvidence(
    'web_search',
    { raw: 'WebSearch: ' + query, resolved: 'WebSearch', cwd: R.PROJECT_DIR },
    0,
    'Web search: ' + (query || '').slice(0, 100),
    fps
  );
}

function handlePlaywrightNavigate(hookData) {
  var url = (hookData.tool_input || {}).url || '';
  if (!url) return;

  fs.mkdirSync(R.PROJECT_DATA_DIR, { recursive: true });
  fs.writeFileSync(BROWSER_STATE_FILE, JSON.stringify({
    url: url,
    ts: new Date().toISOString()
  }), 'utf8');
}

function handlePlaywrightInspect(hookData) {
  var navigateState;
  try {
    navigateState = JSON.parse(fs.readFileSync(BROWSER_STATE_FILE, 'utf8'));
  } catch (_) {
    return;
  }

  if (!navigateState || !navigateState.url) return;

  var stateAge = Date.now() - new Date(navigateState.ts).getTime();
  if (stateAge > 5 * 60 * 1000) return;

  var toolName = hookData.tool_name || '';
  var action = 'navigate + ' + (toolName.includes('snapshot') ? 'snapshot' : 'console_messages');

  var toolResult = hookData.tool_result || {};
  var consoleErrors = 0;
  if (toolResult.content && typeof toolResult.content === 'string') {
    var errorMatches = toolResult.content.match(/error/gi);
    consoleErrors = errorMatches ? errorMatches.length : 0;
  }

  var allFingerprints = getCurrentFingerprints();
  var fps = {};
  if (allFingerprints.frontend) fps.frontend = allFingerprints.frontend;

  evidenceLedger.recordBrowserEvidence(
    navigateState.url,
    action,
    consoleErrors,
    action + ' -- ' + navigateState.url,
    fps
  );

  try { fs.unlinkSync(BROWSER_STATE_FILE); } catch (_) {}
}

function main() {
  var stdin = '';
  try { stdin = fs.readFileSync(0, 'utf8'); } catch (_) { process.exit(0); }

  var hookData = {};
  try { hookData = JSON.parse(stdin); } catch (_) { process.exit(0); }

  var toolName = hookData.tool_name || '';

  if (toolName === 'Bash' || toolName === 'PowerShell') {
    handleBashPowerShell(hookData);
  } else if (toolName === 'Edit' || toolName === 'Write' || toolName === 'MultiEdit') {
    handleEditWrite(hookData);
  } else if (toolName === 'Read') {
    handleRead(hookData);
  } else if (toolName === 'WebSearch') {
    handleWebSearch(hookData);
  } else if (toolName === 'mcp__playwright__browser_navigate') {
    handlePlaywrightNavigate(hookData);
  } else if (toolName === 'mcp__playwright__browser_snapshot' ||
             toolName === 'mcp__playwright__browser_console_messages') {
    handlePlaywrightInspect(hookData);
  }

  process.exit(0);
}

try { main(); } catch (e) {
  process.stderr.write('verification-posthook: ' + (e.message || e) + '\n');
  process.exit(0);
}
