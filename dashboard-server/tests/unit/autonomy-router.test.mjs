import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { routeAction, isHardExcluded, HARD_EXCLUSION_CATEGORIES } = require('../../lib/autonomy-router');

describe('autonomy-router', () => {
  describe('isHardExcluded', () => {
    it('excludes external comms', () => {
      expect(isHardExcluded({ action_type: 'draft', execution_recipe: { type: 'email_draft' } })).toBe(true);
    });

    it('excludes brain canon edits', () => {
      expect(isHardExcluded({ execution_recipe: { type: 'brain_edit' } })).toBe(true);
    });

    it('excludes financial commitments', () => {
      expect(isHardExcluded({ execution_recipe: { type: 'invoice' } })).toBe(true);
      expect(isHardExcluded({ execution_recipe: { type: 'pricing_change' } })).toBe(true);
    });

    it('excludes client-facing content', () => {
      expect(isHardExcluded({ execution_recipe: { type: 'client_report' } })).toBe(true);
      expect(isHardExcluded({ execution_recipe: { type: 'client_proposal' } })).toBe(true);
    });

    it('does not exclude internal tasks', () => {
      expect(isHardExcluded({ action_type: 'task', execution_recipe: { type: 'task_create' } })).toBe(false);
    });

    it('does not exclude initiative builds', () => {
      expect(isHardExcluded({ action_type: 'proposal', execution_recipe: { type: 'initiative_build' } })).toBe(false);
    });
  });

  describe('routeAction', () => {
    it('high confidence + low risk -> auto-approve (when category enabled)', () => {
      const result = routeAction(
        { confidence: 'high', risk_class: 'low', action_type: 'task', execution_recipe: { type: 'task_create' } },
        { autoCategories: ['task'] }
      );
      expect(result.approval_state).toBe('approved');
      expect(result.auto_execute).toBe(true);
    });

    it('high confidence + low risk -> pending when category NOT enabled', () => {
      const result = routeAction(
        { confidence: 'high', risk_class: 'low', action_type: 'task', execution_recipe: { type: 'task_create' } },
        { autoCategories: [] }
      );
      expect(result.approval_state).toBe('pending');
      expect(result.auto_execute).toBe(false);
    });

    it('high confidence + medium risk -> pending with pre-action', () => {
      const result = routeAction(
        { confidence: 'high', risk_class: 'medium', action_type: 'proposal', execution_recipe: { type: 'initiative_build' } },
        { autoCategories: ['proposal'] }
      );
      expect(result.approval_state).toBe('pending');
      expect(result.pre_actioned).toBe(true);
    });

    it('hard-excluded actions are always pending regardless of confidence', () => {
      const result = routeAction(
        { confidence: 'high', risk_class: 'low', action_type: 'draft', execution_recipe: { type: 'email_draft' } },
        { autoCategories: ['draft'] }
      );
      expect(result.approval_state).toBe('pending');
      expect(result.auto_execute).toBe(false);
      expect(result.hard_excluded).toBe(true);
    });

    it('low confidence -> pending at low priority', () => {
      const result = routeAction(
        { confidence: 'low', risk_class: 'low', action_type: 'task', execution_recipe: { type: 'task_create' } },
        { autoCategories: ['task'] }
      );
      expect(result.approval_state).toBe('pending');
      expect(result.priority).toBe('low');
    });

    it('critical risk -> pending regardless', () => {
      const result = routeAction(
        { confidence: 'high', risk_class: 'critical', action_type: 'risk', execution_recipe: { type: 'risk_flag' } },
        { autoCategories: ['risk'] }
      );
      expect(result.approval_state).toBe('pending');
    });

    it('defaults autoCategories to empty when not provided', () => {
      const result = routeAction(
        { confidence: 'high', risk_class: 'low', action_type: 'task', execution_recipe: { type: 'task_create' } }
      );
      expect(result.approval_state).toBe('pending');
      expect(result.auto_execute).toBe(false);
    });
  });
});
