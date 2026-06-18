#!/usr/bin/env node
'use strict';
// risk-classify.js — Deterministic risk classification for the RHO harness.
// Standalone script AND importable module.
//
// Input (as module): { target_file, evidence: [], operation?: string }
// Output: { risk: 'LOW'|'HIGH'|'BLOCKED_TO_APPLY', matched_rule, reason }
//
// Precedence: BLOCKED_TO_APPLY > HIGH > LOW.
// Confidence check: < 3 evidence events forces HIGH (unless BLOCKED_TO_APPLY).
// Unknown target: HIGH (fail safe).
// Missing/corrupt policy: BLOCKED_TO_APPLY (fail closed).
//
// Operation-aware matching (Phase 1):
//   Rules with an `action` field only match when the requested operation is
//   included in the action's allowed set. Rules without `action` match all
//   operations. When operation is undefined, all rules match (backward compat).
//   Unknown action strings in the policy are caught by validatePolicyActions
//   before classification begins (fail closed to BLOCKED_TO_APPLY).

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const POLICY_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'config', 'risk-policy.json');

function matchGlob(filePath, pattern) {
  if (typeof pattern !== 'string') return false;
  const re = pattern.toLowerCase()
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00/g, '.*');
  return new RegExp('^' + re + '$').test(filePath);
}

function loadPolicy() {
  try {
    return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  } catch {
    return null;
  }
}

const ACTION_MAP = {
  'create_or_delete': ['create', 'delete'],
  'create_or_edit': ['create', 'edit'],
  'create_or_edit_or_delete': ['create', 'edit', 'delete'],
};

function actionMatches(ruleAction, operation) {
  if (!ruleAction) return true;
  if (operation === undefined) return true;
  const allowed = ACTION_MAP[ruleAction];
  if (!allowed) return false;
  return allowed.includes(operation);
}

function validatePolicyActions(policy) {
  for (const tier of ['BLOCKED_TO_APPLY', 'HIGH', 'LOW']) {
    const rules = (policy[tier] || {}).rules || [];
    for (const rule of rules) {
      if (rule.target && rule.action && !ACTION_MAP[rule.action]) {
        return { valid: false, reason: 'unknown action "' + rule.action + '" in ' + tier + ' tier' };
      }
    }
  }
  return { valid: true };
}

function findMatch(rules, targetFile, operation) {
  if (!Array.isArray(rules)) return null;
  for (const rule of rules) {
    if (rule.target) {
      if (!matchGlob(targetFile, rule.target)) continue;
      if (!actionMatches(rule.action, operation)) continue;
      return rule;
    }
    if (rule.action && !rule.target) {
      if (operation && actionMatches(rule.action, operation)) return rule;
    }
    if (rule.condition && !rule.target) {
      continue;
    }
  }
  return null;
}

function classify(proposal) {
  const targetFile = (proposal.target_file || '').replace(/\\/g, '/').toLowerCase();
  const evidence = proposal.evidence || [];
  const operation = proposal.operation;

  const policy = loadPolicy();
  if (!policy) {
    return {
      risk: 'BLOCKED_TO_APPLY',
      matched_rule: null,
      reason: 'risk-policy.json missing or corrupt — failing closed'
    };
  }

  var policyCheck = validatePolicyActions(policy);
  if (!policyCheck.valid) {
    return {
      risk: 'BLOCKED_TO_APPLY',
      matched_rule: null,
      reason: 'policy validation failed: ' + policyCheck.reason
    };
  }

  // Check tiers in precedence order: BLOCKED_TO_APPLY > HIGH > LOW
  const blockedRules = (policy.BLOCKED_TO_APPLY || {}).rules || [];
  const blockedMatch = findMatch(blockedRules, targetFile, operation);
  if (blockedMatch) {
    return {
      risk: 'BLOCKED_TO_APPLY',
      matched_rule: blockedMatch,
      reason: blockedMatch.description || 'matched BLOCKED_TO_APPLY rule'
    };
  }

  const highRules = (policy.HIGH || {}).rules || [];
  const highMatch = findMatch(highRules, targetFile, operation);
  if (highMatch) {
    return {
      risk: 'HIGH',
      matched_rule: highMatch,
      reason: highMatch.description || 'matched HIGH rule'
    };
  }

  const lowRules = (policy.LOW || {}).rules || [];
  const lowMatch = findMatch(lowRules, targetFile, operation);
  if (lowMatch) {
    if (evidence.length < 3) {
      return {
        risk: 'HIGH',
        matched_rule: lowMatch,
        reason: 'target matches LOW but insufficient evidence (' + evidence.length + '/3 minimum) — confidence too low for auto-apply'
      };
    }
    return {
      risk: 'LOW',
      matched_rule: lowMatch,
      reason: lowMatch.description || 'matched LOW rule'
    };
  }

  return {
    risk: 'HIGH',
    matched_rule: null,
    reason: 'no matching rule in risk-policy.json — defaulting to HIGH (fail safe)'
  };
}

if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    process.stderr.write('Usage: node risk-classify.js \'{"target_file":"...", "evidence":[...], "operation":"edit"}\'\n');
    process.exit(1);
  }
  try {
    const proposal = JSON.parse(input);
    const result = classify(proposal);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exit(result.risk === 'LOW' ? 0 : 1);
  } catch (e) {
    process.stderr.write('Invalid JSON: ' + (e.message || e) + '\n');
    process.exit(1);
  }
}

module.exports = { classify, matchGlob, loadPolicy, actionMatches, validatePolicyActions };