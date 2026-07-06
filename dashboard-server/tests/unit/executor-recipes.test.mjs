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

    it('demands a JSON summary containing the quality-gate contract fields (Codex round-2 finding 1)', () => {
      const prompt = executor.buildInitiativePrompt({
        title: 'Finance Function Build-Out',
        execution_recipe: { type: 'initiative_build', roles: ['head_of_people'] },
      });
      expect(prompt).toContain('"objective"');
      expect(prompt).toContain('"success_criteria"');
      expect(prompt).toContain('"tasks"');
      expect(prompt).toContain('"definition_of_done"');
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

    it('demands a JSON summary containing the research contract fields (Codex round-2 finding 1)', () => {
      const prompt = executor.buildResearchPrompt({
        title: 'MMO Combat Model Comparison',
        execution_recipe: { type: 'research_brief', topic: 'MMO combat', dimensions: ['feel'] },
      });
      expect(prompt).toContain('"method"');
      expect(prompt).toContain('"findings"');
      expect(prompt).toContain('"claim"');
      expect(prompt).toContain('"sources"');
      expect(prompt).toContain('"gaps"');
    });
  });

  describe('email_draft recipe', () => {
    it('is registered: executeAction dispatches email_draft to the real handler', async () => {
      // Real dispatch through registerRecipe/executeAction -- no recipient means
      // the handler returns early with a note and never spawns a process.
      const result = await executor.executeAction(
        { execution_recipe: { type: 'email_draft', to: null, subject: 'X' } },
        {}
      );
      expect(result.success).toBe(true);
      expect(result.recipe_type).toBe('email_draft');
      expect(result.note).toContain('no recipient email available');
    });

    it('builds a createDraft argument array (never sendEmail)', () => {
      const cmd = executor.buildDraftCommand({
        execution_recipe: {
          type: 'email_draft',
          to: 'jen@example.com',
          subject: 'Following up - Jen',
          body: 'Hi Jen, ...',
        },
      });
      expect(Array.isArray(cmd)).toBe(true);
      expect(cmd[0]).toBe('node');
      const joined = cmd.join(' ');
      expect(joined).toContain('msgraph');
      expect(joined).toContain('createDraft');
      expect(joined).not.toContain('sendEmail');
      expect(joined).not.toContain('sendMail');
      expect(cmd[cmd.indexOf('--to') + 1]).toBe('jen@example.com');
      expect(cmd[cmd.indexOf('--subject') + 1]).toBe('Following up - Jen');
    });

    it('passes hostile content verbatim as argv entries (no shell interpretation)', () => {
      const cmd = executor.buildDraftCommand({
        execution_recipe: {
          type: 'email_draft',
          to: 'jen@example.com',
          subject: 'x" & calc & "y',
          body: 'Line one\nLine "two" & del *',
        },
      });
      // Argument array: content is passed as-is, only newlines become <br>.
      expect(cmd[cmd.indexOf('--subject') + 1]).toBe('x" & calc & "y');
      expect(cmd[cmd.indexOf('--body') + 1]).toBe('Line one<br>Line "two" & del *');
    });

    it('returns a no-recipient marker command when email is missing', () => {
      const cmd = executor.buildDraftCommand({
        execution_recipe: {
          type: 'email_draft',
          to: null,
          subject: 'Follow up',
          body: 'Draft body',
        },
      });
      expect(Array.isArray(cmd)).toBe(true);
      expect(cmd).not.toContain('--to');
      expect(cmd.join(' ')).toContain('[NO RECIPIENT]');
      expect(cmd.join(' ')).toContain('Follow up');
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
