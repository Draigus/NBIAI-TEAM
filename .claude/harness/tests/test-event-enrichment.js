#!/usr/bin/env node
'use strict';
// Tests Phase 5 event capture enrichments:
// - skill_usage mandatory/task_type from config
// - detect_secondary for context_pressure and role_dispatch
// Run: node .claude/harness/tests/test-event-enrichment.js

const fs = require('fs');
const os = require('os');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

function assertEq(actual, expected, msg) {
  if (actual === expected) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); }
}

// --- Setup: create temp project dir with mandatory-skills.json ---
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rho-enrichment-'));
const harnessDir = path.join(tmpDir, '.claude', 'harness');
const configDir = path.join(harnessDir, 'config');
const dataDir = path.join(harnessDir, 'data');
fs.mkdirSync(configDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

// Write mandatory-skills config
fs.writeFileSync(path.join(configDir, 'mandatory-skills.json'), JSON.stringify({
  skills: {
    'systematic-debugging': { mandatory: true, task_type: 'bug_fix' },
    'brainstorming': { mandatory: true, task_type: 'feature' },
    'test-driven-development': { mandatory: true, task_type: 'feature' },
    'verification-before-completion': { mandatory: true, task_type: null }
  }
}));

// Write minimal redaction config (required by applyRedaction)
fs.writeFileSync(path.join(configDir, 'redaction.json'), JSON.stringify({
  patterns: [],
  client_sensitive_fields: {}
}));

// Write session logs dir (for writeSessionIdToLog)
const sessionLogsDir = path.join(tmpDir, 'projects', 'nbi_dashboard', 'session_logs');
fs.mkdirSync(sessionLogsDir, { recursive: true });

// Point module at temp dir
process.env.CLAUDE_PROJECT_DIR = tmpDir;
process.env.HARNESS_DIR = harnessDir;

// Clear require cache to pick up new env
delete require.cache[require.resolve('../lib/resolve.js')];
delete require.cache[require.resolve('../lib/emit-event.js')];
const emitEvent = require('../lib/emit-event.js');
const R = require(path.resolve(__dirname, '..', 'lib', 'resolve.js'));
fs.mkdirSync(R.PROJECT_DATA_DIR, { recursive: true });

// ===== Mandatory skills enrichment =====

console.log('\nTest: mandatory skills enrichment\n');

emitEvent._resetMandatorySkillsCache();

// Test enrichSkillUsage for mandatory skill
const debugEnrich = emitEvent.enrichSkillUsage('systematic-debugging');
assertEq(debugEnrich.mandatory, true, 'systematic-debugging is mandatory');
assertEq(debugEnrich.task_type, 'bug_fix', 'systematic-debugging task_type is bug_fix');

const brainstormEnrich = emitEvent.enrichSkillUsage('brainstorming');
assertEq(brainstormEnrich.mandatory, true, 'brainstorming is mandatory');
assertEq(brainstormEnrich.task_type, 'feature', 'brainstorming task_type is feature');

const verifyEnrich = emitEvent.enrichSkillUsage('verification-before-completion');
assertEq(verifyEnrich.mandatory, true, 'verification-before-completion is mandatory');
assertEq(verifyEnrich.task_type, null, 'verification-before-completion task_type is null');

// Test non-mandatory skill
const unknownEnrich = emitEvent.enrichSkillUsage('some-random-skill');
assertEq(unknownEnrich.mandatory, false, 'unknown skill is not mandatory');
assertEq(unknownEnrich.task_type, null, 'unknown skill task_type is null');

// Test empty skill name
const emptyEnrich = emitEvent.enrichSkillUsage('');
assertEq(emptyEnrich.mandatory, false, 'empty skill name is not mandatory');

// Test buildEvent populates enrichment
const skillEvent = emitEvent.buildEvent('skill_usage', {
  tool_input: { skill: 'systematic-debugging' }
});
assertEq(skillEvent.mandatory, true, 'buildEvent: mandatory populated for skill_usage');
assertEq(skillEvent.task_type, 'bug_fix', 'buildEvent: task_type populated for skill_usage');
assertEq(skillEvent.skill, 'systematic-debugging', 'buildEvent: skill name preserved');
assertEq(skillEvent.action, 'invoked', 'buildEvent: action is invoked');

const nonMandatoryEvent = emitEvent.buildEvent('skill_usage', {
  tool_input: { skill: 'some-other-skill' }
});
assertEq(nonMandatoryEvent.mandatory, false, 'buildEvent: non-mandatory skill is false');
assertEq(nonMandatoryEvent.task_type, null, 'buildEvent: non-mandatory task_type is null');

// ===== loadMandatorySkills =====

console.log('\n--- loadMandatorySkills ---');

emitEvent._resetMandatorySkillsCache();
const skills = emitEvent.loadMandatorySkills();
assert(typeof skills === 'object', 'loadMandatorySkills returns object');
assert(skills['systematic-debugging'] !== undefined, 'systematic-debugging in config');
assert(skills['brainstorming'] !== undefined, 'brainstorming in config');

// Test with missing config
emitEvent._resetMandatorySkillsCache();
const origPath = process.env.CLAUDE_PROJECT_DIR;
const origHarness = process.env.HARNESS_DIR;
const nonExistentDir = path.join(os.tmpdir(), 'nonexistent-' + Date.now());
process.env.CLAUDE_PROJECT_DIR = nonExistentDir;
process.env.HARNESS_DIR = path.join(nonExistentDir, '.claude', 'harness');
delete require.cache[require.resolve('../lib/resolve.js')];
delete require.cache[require.resolve('../lib/emit-event.js')];
const emitEvent2 = require('../lib/emit-event.js');
emitEvent2._resetMandatorySkillsCache();
const emptySkills = emitEvent2.loadMandatorySkills();
assert(typeof emptySkills === 'object', 'loadMandatorySkills returns object when config missing');
assertEq(Object.keys(emptySkills).length, 0, 'loadMandatorySkills returns empty when config missing');
process.env.CLAUDE_PROJECT_DIR = origPath;
process.env.HARNESS_DIR = origHarness;
delete require.cache[require.resolve('../lib/resolve.js')];

// ===== normalisePath =====

console.log('\n--- normalisePath ---');

assertEq(emitEvent.normalisePath('d:\\roles\\senior_engineer\\AGENT.md'), 'd:/roles/senior_engineer/AGENT.md', 'backslashes normalised');
assertEq(emitEvent.normalisePath('roles/cmo/AGENT.md'), 'roles/cmo/AGENT.md', 'forward slashes preserved');
assertEq(emitEvent.normalisePath(''), '', 'empty string returns empty');
assertEq(emitEvent.normalisePath(null), '', 'null returns empty');
assertEq(emitEvent.normalisePath(undefined), '', 'undefined returns empty');

// ===== detectSecondaryEvents — role_dispatch =====

console.log('\n--- detectSecondaryEvents: role_dispatch ---');

const roleReadInput = {
  tool_name: 'Read',
  tool_input: { file_path: 'd:\\OneDrive\\Claude_code\\NBIAI_TEAM\\roles\\senior_engineer\\AGENT.md' }
};
const roleEvents = emitEvent.detectSecondaryEvents(roleReadInput);
assertEq(roleEvents.length, 1, 'role read produces 1 secondary event');
assertEq(roleEvents[0].type, 'role_dispatch', 'secondary event is role_dispatch');
assertEq(roleEvents[0].role, 'senior_engineer', 'role name extracted correctly');
assertEq(roleEvents[0].trigger, 'file_read', 'trigger is file_read');

// Forward-slash path
const roleReadUnix = {
  tool_name: 'Read',
  tool_input: { file_path: '/project/roles/cmo/AGENT.md' }
};
const roleEventsUnix = emitEvent.detectSecondaryEvents(roleReadUnix);
assertEq(roleEventsUnix.length, 1, 'unix-style role path produces event');
assertEq(roleEventsUnix[0].role, 'cmo', 'role name extracted from unix path');

// Non-role read — no event
const normalRead = {
  tool_name: 'Read',
  tool_input: { file_path: 'd:\\some\\other\\file.js' }
};
const noEvents = emitEvent.detectSecondaryEvents(normalRead);
assertEq(noEvents.length, 0, 'non-role read produces no secondary events');

// ===== detectSecondaryEvents — context_pressure (bank_load) =====

console.log('\n--- detectSecondaryEvents: bank_load ---');

const bankReadInput = {
  tool_name: 'Read',
  tool_input: { file_path: 'd:\\project\\intelligence\\banks\\production_methods.md' }
};
const bankEvents = emitEvent.detectSecondaryEvents(bankReadInput);
assertEq(bankEvents.length, 1, 'bank read produces 1 secondary event');
assertEq(bankEvents[0].type, 'context_pressure', 'secondary event is context_pressure');
assertEq(bankEvents[0].event, 'bank_load', 'event is bank_load');
assertEq(bankEvents[0].banks_loaded[0], 'production_methods', 'bank name extracted');

// ===== detectSecondaryEvents — context_pressure (handoff) =====

console.log('\n--- detectSecondaryEvents: handoff ---');

const handoffWriteInput = {
  tool_name: 'Write',
  tool_input: { file_path: 'd:\\project\\docs\\HANDOFF.md' }
};
const handoffEvents = emitEvent.detectSecondaryEvents(handoffWriteInput);
assertEq(handoffEvents.length, 1, 'HANDOFF.md write produces 1 secondary event');
assertEq(handoffEvents[0].type, 'context_pressure', 'secondary event is context_pressure');
assertEq(handoffEvents[0].event, 'handoff', 'event is handoff');

const sessionHandoffInput = {
  tool_name: 'Edit',
  tool_input: { file_path: '/project/session_handoffs/2026-06-18.md' }
};
const shEvents = emitEvent.detectSecondaryEvents(sessionHandoffInput);
assertEq(shEvents.length, 1, 'session_handoffs edit produces 1 secondary event');
assertEq(shEvents[0].event, 'handoff', 'session_handoffs event is handoff');

// Non-handoff write — no event
const normalWrite = {
  tool_name: 'Write',
  tool_input: { file_path: '/project/src/server.js' }
};
const noWriteEvents = emitEvent.detectSecondaryEvents(normalWrite);
assertEq(noWriteEvents.length, 0, 'non-handoff write produces no secondary events');

// ===== detectSecondaryEvents — edge cases =====

console.log('\n--- detectSecondaryEvents: edge cases ---');

// No file_path
const noPath = { tool_name: 'Read', tool_input: {} };
assertEq(emitEvent.detectSecondaryEvents(noPath).length, 0, 'no file_path produces no events');

// No tool_input
const noInput = { tool_name: 'Read' };
assertEq(emitEvent.detectSecondaryEvents(noInput).length, 0, 'no tool_input produces no events');

// Unknown tool
const unknownTool = {
  tool_name: 'Bash',
  tool_input: { file_path: 'roles/x/AGENT.md' }
};
assertEq(emitEvent.detectSecondaryEvents(unknownTool).length, 0, 'Bash tool does not trigger role_dispatch');

// Role + bank in same path (shouldn't happen but tests independence)
const bankOnlyRead = {
  tool_name: 'Read',
  tool_input: { file_path: '/intelligence/banks/client_couch_heroes.md' }
};
const bankOnlyEvents = emitEvent.detectSecondaryEvents(bankOnlyRead);
assertEq(bankOnlyEvents.length, 1, 'bank read produces exactly 1 event');
assertEq(bankOnlyEvents[0].type, 'context_pressure', 'bank read is context_pressure not role_dispatch');

// ===== Cleanup =====
fs.rmSync(tmpDir, { recursive: true, force: true });

// ===== Summary =====
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
