import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

describe('executor recipes', () => {
  let executor;
  beforeEach(async () => {
    vi.resetModules();
    executor = require('../../lib/executor');
  });

  describe('initiative_build recipe', () => {
    it('is registered', () => {
      expect(executor.getRecipeType({ execution_recipe: { type: 'initiative_build' } })).toBe('initiative_build');
    });

    it('builds prompt with role AGENT.md paths and brain modules', () => {
      const prompt = executor.buildInitiativePrompt({
        title: 'Finance Function Build-Out',
        description: 'Build finance infrastructure for CH',
        execution_recipe: {
          type: 'initiative_build',
          roles: ['head_of_people'],
          brain_modules: ['financial_resilience.md'],
          client_slug: 'couch_heroes',
          task_tree: {
            initiative: 'Finance Function Build-Out',
            children: [
              { title: 'P&L ownership', type: 'feature' },
              { title: 'Cash flow model', type: 'feature' },
            ],
          },
        },
      });
      expect(prompt).toContain('roles/head_of_people/AGENT.md');
      expect(prompt).toContain('brain/financial_resilience.md');
      expect(prompt).toContain('Finance Function Build-Out');
      expect(prompt).toContain('POST');
      expect(prompt).toContain('/api/tasks');
      expect(prompt).toContain('initiative');
      expect(prompt).toContain('P&L ownership');
    });
  });

  describe('research_brief recipe', () => {
    it('is registered', () => {
      expect(executor.getRecipeType({ execution_recipe: { type: 'research_brief' } })).toBe('research_brief');
    });

    it('builds prompt with research dimensions and role context', () => {
      const prompt = executor.buildResearchPrompt({
        title: 'MMO Combat Model Comparison',
        execution_recipe: {
          type: 'research_brief',
          roles: ['game_economy_consultant', 'gaming_practice_lead'],
          topic: 'MMO combat models',
          dimensions: ['feel', 'retention', 'monetisation', 'cost'],
          output_path: 'projects/couch_heroes/research/',
        },
      });
      expect(prompt).toContain('roles/game_economy_consultant/AGENT.md');
      expect(prompt).toContain('roles/gaming_practice_lead/AGENT.md');
      expect(prompt).toContain('feel');
      expect(prompt).toContain('retention');
      expect(prompt).toContain('projects/couch_heroes/research/');
    });
  });

  describe('parseJsonFromOutput', () => {
    it('extracts JSON from mixed text', () => {
      const text = 'Some preamble text\n{"key": "value", "count": 42}\nMore text';
      const parsed = executor.parseJsonFromOutput(text);
      expect(parsed).toEqual({ key: 'value', count: 42 });
    });

    it('returns null for text without JSON', () => {
      expect(executor.parseJsonFromOutput('no json here')).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      expect(executor.parseJsonFromOutput('{broken json}')).toBeNull();
    });
  });
});
