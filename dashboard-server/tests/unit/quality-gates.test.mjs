import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { validateContract, buildCritiquePrompt, requiresCodexReview, CONTRACTS } = require('../../lib/quality-gates');

describe('quality-gates', () => {
  describe('CONTRACTS', () => {
    it('defines contracts for initiative_build, research_brief, draft, corrective', () => {
      expect(CONTRACTS.initiative_build).toBeDefined();
      expect(CONTRACTS.research_brief).toBeDefined();
      expect(CONTRACTS.draft).toBeDefined();
      expect(CONTRACTS.corrective).toBeDefined();
    });
  });

  describe('validateContract', () => {
    it('passes a valid initiative build', () => {
      const result = validateContract('initiative_build', {
        objective: 'Build finance function',
        success_criteria: ['Monthly close within 5 days', 'Board pack automated'],
        tasks: [
          { title: 'P&L ownership', definition_of_done: 'Monthly P&L reviewed by CEO' },
          { title: 'Cash flow model', definition_of_done: '13-week rolling forecast live' },
        ],
        supporting_artefacts: ['Cap table template'],
      });
      expect(result.valid).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('fails initiative build missing objective', () => {
      const result = validateContract('initiative_build', {
        success_criteria: ['Test'],
        tasks: [{ title: 'T', definition_of_done: 'D' }],
      });
      expect(result.valid).toBe(false);
      expect(result.failures.some(f => f.includes('objective'))).toBe(true);
    });

    it('fails initiative build with tasks missing definition_of_done', () => {
      const result = validateContract('initiative_build', {
        objective: 'Build X',
        success_criteria: ['Test'],
        tasks: [{ title: 'T' }],
      });
      expect(result.valid).toBe(false);
      expect(result.failures.some(f => f.includes('definition_of_done'))).toBe(true);
    });

    it('passes a valid research brief', () => {
      const result = validateContract('research_brief', {
        method: 'Comparative analysis across 4 dimensions',
        findings: [
          { claim: 'Tab-target retains better in Asian markets', sources: ['url1', 'url2', 'url3'] },
        ],
        confidence_labels: { 'Tab-target retention': 'high' },
        gaps: ['No data on hybrid combat retention in Western markets'],
      });
      expect(result.valid).toBe(true);
    });

    it('fails research brief with insufficient sources', () => {
      const result = validateContract('research_brief', {
        method: 'Test',
        findings: [
          { claim: 'Bold claim', sources: ['one_source'] },
        ],
        gaps: [],
      });
      expect(result.valid).toBe(false);
      expect(result.failures.some(f => f.includes('source'))).toBe(true);
    });
  });

  describe('buildCritiquePrompt', () => {
    it('includes contract requirements and refute-first instruction', () => {
      const prompt = buildCritiquePrompt('initiative_build', { objective: 'Test', tasks: [] });
      expect(prompt).toContain('refute');
      expect(prompt).toContain('objective');
      expect(prompt).toContain('definition_of_done');
    });
  });

  describe('requiresCodexReview', () => {
    it('requires codex for research_brief on fallback models', () => {
      expect(requiresCodexReview('research_brief', 'claude-opus-4-6')).toBe(true);
    });

    it('requires codex for initiative_build on fallback models', () => {
      expect(requiresCodexReview('initiative_build', 'claude-opus-4-6')).toBe(true);
    });

    it('does not require codex on primary model for simple tasks', () => {
      expect(requiresCodexReview('task_create', 'claude-fable-5')).toBe(false);
    });

    it('always requires codex for research_brief regardless of model', () => {
      expect(requiresCodexReview('research_brief', 'claude-fable-5')).toBe(true);
    });
  });
});
