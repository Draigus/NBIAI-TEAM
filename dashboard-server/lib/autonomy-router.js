'use strict';

// Autonomy Router -- confidence x risk routing matrix with hard exclusions.
//
// Pure logic. No database access. Determines whether an AIOS action
// auto-executes or queues for Glen's approval.
//
// Hard exclusions: recipe types that NEVER auto-execute regardless of
// confidence score. These map to NBI's approval gates (external comms,
// Brain canon, financial commitments, client-facing content).

const HARD_EXCLUSION_TYPES = [
  'email_draft', 'slack_message', 'external_comms',
  'brain_edit', 'decisions_edit', 'claude_md_edit',
  'invoice', 'pricing_change', 'contract', 'financial_commitment',
  'client_report', 'client_proposal', 'client_deliverable', 'client_facing',
];

const HARD_EXCLUSION_CATEGORIES = [
  'external_comms', 'brain_canon', 'financial', 'client_facing',
];

/**
 * Check whether an action is hard-excluded from auto-execution.
 * Hard-excluded actions always require Glen's approval.
 *
 * @param {object} action - The action to check
 * @param {string} action.action_type - Category of the action
 * @param {object} action.execution_recipe - Recipe with a `type` field
 * @returns {boolean} true if hard-excluded
 */
function isHardExcluded(action) {
  const recipeType = action.execution_recipe?.type || '';
  if (HARD_EXCLUSION_TYPES.includes(recipeType)) return true;
  if (action.action_type === 'draft' && recipeType.includes('email')) return true;
  return false;
}

/**
 * Route an action through the confidence x risk matrix.
 *
 * Returns a routing decision with:
 *   - approval_state: 'approved' | 'pending'
 *   - auto_execute: boolean
 *   - hard_excluded: boolean
 *   - pre_actioned: boolean (work done, waiting for one-tap approval)
 *   - priority: 'critical' | 'high' | 'medium' | 'low'
 *   - reason: human-readable explanation
 *
 * @param {object} action - The action to route
 * @param {string} action.confidence - 'high' | 'medium' | 'low'
 * @param {string} action.risk_class - 'low' | 'medium' | 'high' | 'critical'
 * @param {string} action.action_type - Category of the action
 * @param {object} action.execution_recipe - Recipe with a `type` field
 * @param {object} [options] - Routing options
 * @param {string[]} [options.autoCategories] - Action types enabled for auto-execution
 * @returns {object} Routing decision
 */
function routeAction(action, options) {
  const { autoCategories = [] } = options || {};
  const { confidence, risk_class, action_type } = action;
  const hardExcluded = isHardExcluded(action);
  const categoryEnabled = autoCategories.includes(action_type);

  // Hard exclusions: never auto-execute, regardless of confidence or risk
  if (hardExcluded) {
    return {
      approval_state: 'pending',
      auto_execute: false,
      hard_excluded: true,
      pre_actioned: false,
      priority: risk_class === 'critical' ? 'critical' : 'high',
      reason: 'Hard exclusion: never auto-execute',
    };
  }

  // Critical risk: always requires approval, even at high confidence
  if (risk_class === 'critical') {
    return {
      approval_state: 'pending',
      auto_execute: false,
      hard_excluded: false,
      pre_actioned: true,
      priority: 'critical',
      reason: 'Critical risk: requires approval',
    };
  }

  // High confidence + low risk: auto-execute if category is enabled
  if (confidence === 'high' && risk_class === 'low') {
    if (categoryEnabled) {
      return {
        approval_state: 'approved',
        auto_execute: true,
        hard_excluded: false,
        pre_actioned: true,
        priority: 'high',
        reason: 'High confidence, low risk, category enabled: auto-execute',
      };
    }
    return {
      approval_state: 'pending',
      auto_execute: false,
      hard_excluded: false,
      pre_actioned: true,
      priority: 'high',
      reason: 'High confidence, low risk, category not yet enabled: queue for approval',
    };
  }

  // High confidence + medium risk: pre-action but queue for one-tap approval
  if (confidence === 'high' && risk_class === 'medium') {
    return {
      approval_state: 'pending',
      auto_execute: false,
      hard_excluded: false,
      pre_actioned: true,
      priority: 'high',
      reason: 'High confidence, medium risk: pre-actioned, queue for one-tap approval',
    };
  }

  // Medium confidence: queue for approval
  if (confidence === 'medium') {
    return {
      approval_state: 'pending',
      auto_execute: false,
      hard_excluded: false,
      pre_actioned: false,
      priority: 'medium',
      reason: 'Medium confidence: queue for approval',
    };
  }

  // Low confidence or anything else: low-priority approval queue
  return {
    approval_state: 'pending',
    auto_execute: false,
    hard_excluded: false,
    pre_actioned: false,
    priority: 'low',
    reason: 'Low confidence or ambiguous: low-priority approval queue',
  };
}

module.exports = { routeAction, isHardExcluded, HARD_EXCLUSION_TYPES, HARD_EXCLUSION_CATEGORIES };
