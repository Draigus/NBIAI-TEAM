// Tests for the Codex critique quality gate and post-execution verification
// in the executor recipes (completeness audit findings, 2026-07-05):
//   1. initiative_build never got Codex review despite requiresCodexReview
//      declaring it mandatory on fallback models.
//   2. The research_brief critique ran Codex but discarded the verdict.
//   3. Neither recipe mechanically verified its artefact after dispatch.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

function makeMockPool(queuedResults = []) {
  const queue = [...queuedResults];
  return {
    query: vi.fn(async () => {
      if (queue.length === 0) return { rows: [], rowCount: 0 };
      return queue.shift();
    }),
  };
}

const VALID_INITIATIVE_OUTPUT = {
  initiative_id: 'i-123',
  objective: 'Build the finance function for Couch Heroes',
  success_criteria: ['Monthly close completed within 5 working days'],
  tasks: [
    { title: 'P&L ownership', definition_of_done: 'P&L reviewed and signed off monthly' },
  ],
  created_count: 2,
};

function validResearchOutput(documentPath) {
  return {
    method: 'Web research across 4 dimensions, 2+ sources per claim',
    findings: [
      { claim: 'Action combat retains better in western MMOs', sources: ['url-a', 'url-b'], confidence: 'medium' },
    ],
    gaps: ['No public retention data for hybrid systems'],
    document_path: documentPath,
    finding_count: 1,
    source_count: 2,
  };
}

function dispatchReturning(payload) {
  return vi.fn(async () => ({ text: JSON.stringify(payload), durationMs: 12 }));
}

function codexReturning(verdict) {
  return vi.fn(() => (typeof verdict === 'string' ? verdict : JSON.stringify(verdict)));
}

describe('executor critique gate + post-execution verification', () => {
  let executor;
  const savedModel = process.env.AIOS_DISPATCH_MODEL;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.AIOS_DISPATCH_MODEL; // default = claude-opus-4-6 (fallback tier)
    executor = require('../../lib/executor');
  });

  afterEach(() => {
    if (savedModel === undefined) delete process.env.AIOS_DISPATCH_MODEL;
    else process.env.AIOS_DISPATCH_MODEL = savedModel;
  });

  describe('runCodexCritique', () => {
    const action = { id: 'a1b2c3d4-0000-0000-0000-000000000000' };

    it('returns pass when Codex outputs a passing JSON verdict', async () => {
      const codexExec = codexReturning({ pass: true, failures: [], score: 8 });
      const result = await executor.runCodexCritique('initiative_build', VALID_INITIATIVE_OUTPUT, action, { codexExec });
      expect(result.status).toBe('pass');
      expect(result.score).toBe(8);
      expect(codexExec).toHaveBeenCalledTimes(1);
    });

    it('returns fail with failures when Codex outputs a failing verdict', async () => {
      const codexExec = codexReturning({ pass: false, failures: ['Success criteria are not measurable'], score: 3 });
      const result = await executor.runCodexCritique('initiative_build', VALID_INITIATIVE_OUTPUT, action, { codexExec });
      expect(result.status).toBe('fail');
      expect(result.failures).toEqual(['Success criteria are not measurable']);
    });

    it('returns unavailable when the Codex CLI throws', async () => {
      const codexExec = vi.fn(() => { throw new Error('codex not found'); });
      const log = vi.fn();
      const result = await executor.runCodexCritique('initiative_build', VALID_INITIATIVE_OUTPUT, action, { codexExec, log });
      expect(result.status).toBe('unavailable');
      expect(result.error).toMatch(/codex not found/);
    });

    it('returns unparseable when Codex output has no JSON verdict', async () => {
      const codexExec = codexReturning('The deliverable looks fine to me overall.');
      const result = await executor.runCodexCritique('initiative_build', VALID_INITIATIVE_OUTPUT, action, { codexExec });
      expect(result.status).toBe('unparseable');
    });

    it('extracts the verdict even when Codex wraps it in prose with braces', async () => {
      const codexExec = codexReturning(
        'Reviewing {contract} requirements...\nDone.\n{"pass": false, "failures": ["Objective is vague"], "score": 4}\n');
      const result = await executor.runCodexCritique('initiative_build', VALID_INITIATIVE_OUTPUT, action, { codexExec });
      expect(result.status).toBe('fail');
      expect(result.failures).toEqual(['Objective is vague']);
    });

    it('writes the quality-gates critique prompt to a temp file and removes it afterwards', async () => {
      let promptContent = null;
      let critiquePath = null;
      const codexExec = vi.fn((command) => {
        const match = command.match(/Read the file at (.+?\.md)/);
        critiquePath = match && match[1];
        if (critiquePath) promptContent = fs.readFileSync(critiquePath, 'utf8');
        return JSON.stringify({ pass: true, failures: [], score: 9 });
      });
      await executor.runCodexCritique('initiative_build', VALID_INITIATIVE_OUTPUT, action, { codexExec });
      expect(critiquePath).toBeTruthy();
      expect(promptContent).toContain('refute');
      expect(promptContent).toContain('definition_of_done');
      expect(fs.existsSync(critiquePath)).toBe(false);
    });
  });

  describe('executeInitiativeRecipe', () => {
    const action = {
      id: 'a1b2c3d4-0000-0000-0000-000000000001',
      title: 'Finance Function Build-Out',
      execution_recipe: { type: 'initiative_build', roles: ['head_of_people'] },
    };

    it('succeeds with codex_review pass when artefact exists and critique passes', async () => {
      const pool = makeMockPool([{ rows: [{ id: 'i-123', item_type: 'initiative' }], rowCount: 1 }]);
      const codexExec = codexReturning({ pass: true, failures: [], score: 8 });
      const result = await executor.executeInitiativeRecipe(action, {
        dispatch: dispatchReturning(VALID_INITIATIVE_OUTPUT), pool, codexExec, repoRoot: '.',
      });
      expect(result.success).toBe(true);
      expect(result.codex_review).toBe('pass');
      expect(result.initiative_id).toBe('i-123');
    });

    it('blocks the action when the Codex critique verdict is fail', async () => {
      const pool = makeMockPool([{ rows: [{ id: 'i-123', item_type: 'initiative' }], rowCount: 1 }]);
      const codexExec = codexReturning({ pass: false, failures: ['Tasks lack definitions of done'], score: 2 });
      const result = await executor.executeInitiativeRecipe(action, {
        dispatch: dispatchReturning(VALID_INITIATIVE_OUTPUT), pool, codexExec, repoRoot: '.',
      });
      expect(result.success).toBe(false);
      expect(result.below_bar).toBe(true);
      expect(result.codex_review).toBe('fail');
      expect(result.failures).toEqual(['Tasks lack definitions of done']);
    });

    it('fails post-execution verification when the initiative row is missing, without calling Codex', async () => {
      const pool = makeMockPool([{ rows: [], rowCount: 0 }]);
      const codexExec = vi.fn();
      const result = await executor.executeInitiativeRecipe(action, {
        dispatch: dispatchReturning(VALID_INITIATIVE_OUTPUT), pool, codexExec, repoRoot: '.',
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Post-execution verification/);
      expect(codexExec).not.toHaveBeenCalled();
    });

    it('fails post-execution verification when the row is not an initiative (Codex round-2 finding 2)', async () => {
      const pool = makeMockPool([{ rows: [{ id: 'i-123', item_type: 'task' }], rowCount: 1 }]);
      const codexExec = vi.fn();
      const result = await executor.executeInitiativeRecipe(action, {
        dispatch: dispatchReturning(VALID_INITIATIVE_OUTPUT), pool, codexExec, repoRoot: '.',
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Post-execution verification/);
      expect(result.error).toMatch(/initiative/);
      expect(codexExec).not.toHaveBeenCalled();
    });

    it('fails post-execution verification when the output has no initiative_id', async () => {
      const pool = makeMockPool();
      const output = { ...VALID_INITIATIVE_OUTPUT };
      delete output.initiative_id;
      const result = await executor.executeInitiativeRecipe(action, {
        dispatch: dispatchReturning(output), pool, codexExec: vi.fn(), repoRoot: '.',
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Post-execution verification/);
    });

    it('does not block when Codex is unavailable, but records it honestly', async () => {
      const pool = makeMockPool([{ rows: [{ id: 'i-123', item_type: 'initiative' }], rowCount: 1 }]);
      const codexExec = vi.fn(() => { throw new Error('spawn failed'); });
      const log = vi.fn();
      const result = await executor.executeInitiativeRecipe(action, {
        dispatch: dispatchReturning(VALID_INITIATIVE_OUTPUT), pool, codexExec, log, repoRoot: '.',
      });
      expect(result.success).toBe(true);
      expect(result.codex_review).toBe('unavailable');
    });

    it('skips Codex on non-fallback models and records not_required', async () => {
      process.env.AIOS_DISPATCH_MODEL = 'claude-fable-5';
      const pool = makeMockPool([{ rows: [{ id: 'i-123', item_type: 'initiative' }], rowCount: 1 }]);
      const codexExec = vi.fn();
      const result = await executor.executeInitiativeRecipe(action, {
        dispatch: dispatchReturning(VALID_INITIATIVE_OUTPUT), pool, codexExec, repoRoot: '.',
      });
      expect(result.success).toBe(true);
      expect(result.codex_review).toBe('not_required');
      expect(codexExec).not.toHaveBeenCalled();
    });
  });

  describe('executeResearchRecipe', () => {
    const action = {
      id: 'a1b2c3d4-0000-0000-0000-000000000002',
      title: 'MMO Combat Model Comparison',
      execution_recipe: { type: 'research_brief', topic: 'MMO combat models', dimensions: ['feel'] },
    };
    let briefFile;

    beforeEach(() => {
      briefFile = path.join(os.tmpdir(), `aios-test-brief-${Date.now()}-${process.pid}.md`);
      fs.writeFileSync(briefFile, '# Research brief\nContent.');
    });

    afterEach(() => {
      try { fs.unlinkSync(briefFile); } catch { /* already gone */ }
    });

    it('succeeds when the document exists on disk and the critique passes', async () => {
      const codexExec = codexReturning({ pass: true, failures: [], score: 7 });
      const result = await executor.executeResearchRecipe(action, {
        dispatch: dispatchReturning(validResearchOutput(briefFile)), codexExec, repoRoot: os.tmpdir(),
      });
      expect(result.success).toBe(true);
      expect(result.codex_review).toBe('pass');
    });

    it('blocks the action when the Codex critique verdict is fail', async () => {
      const codexExec = codexReturning({ pass: false, failures: ['Finding 1 cites only one source'], score: 3 });
      const result = await executor.executeResearchRecipe(action, {
        dispatch: dispatchReturning(validResearchOutput(briefFile)), codexExec, repoRoot: os.tmpdir(),
      });
      expect(result.success).toBe(false);
      expect(result.below_bar).toBe(true);
      expect(result.failures).toEqual(['Finding 1 cites only one source']);
    });

    it('fails post-execution verification when the document does not exist on disk', async () => {
      const missingPath = path.join(os.tmpdir(), 'aios-test-brief-does-not-exist.md');
      const codexExec = vi.fn();
      const result = await executor.executeResearchRecipe(action, {
        dispatch: dispatchReturning(validResearchOutput(missingPath)), codexExec, repoRoot: os.tmpdir(),
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Post-execution verification/);
      expect(codexExec).not.toHaveBeenCalled();
    });

    it('fails when the document predates this execution (Codex round-2 finding 3)', async () => {
      const hourAgo = new Date(Date.now() - 3600 * 1000);
      fs.utimesSync(briefFile, hourAgo, hourAgo);
      const codexExec = vi.fn();
      const result = await executor.executeResearchRecipe(action, {
        dispatch: dispatchReturning(validResearchOutput(briefFile)), codexExec, repoRoot: os.tmpdir(),
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Post-execution verification/);
      expect(result.error).toMatch(/predates/);
      expect(codexExec).not.toHaveBeenCalled();
    });

    it('fails when the document resolves outside the repository root (Codex round-2 finding 3)', async () => {
      const codexExec = vi.fn();
      const result = await executor.executeResearchRecipe(action, {
        dispatch: dispatchReturning(validResearchOutput(briefFile)),
        codexExec,
        repoRoot: path.join(os.tmpdir(), 'aios-nonexistent-repo-root'),
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Post-execution verification/);
      expect(result.error).toMatch(/outside/);
      expect(codexExec).not.toHaveBeenCalled();
    });
  });
});
