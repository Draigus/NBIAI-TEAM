import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Audit fixes 2026-07-05: executor must use the internal work-items endpoint
// (finding 1), resolve a valid parent for bare tasks (finding 3), and never
// pass deliverable text through a shell string to Codex (finding 2).

function makeMockPool(queuedResults = []) {
  const queue = [...queuedResults];
  return {
    query: vi.fn(async () => {
      if (queue.length === 0) return { rows: [], rowCount: 0 };
      return queue.shift();
    }),
  };
}

describe('executor audit fixes', () => {
  let executor;
  beforeEach(async () => {
    vi.resetModules();
    executor = require('../../lib/executor');
  });

  describe('executeTaskRecipe endpoint (finding 1)', () => {
    it('posts to the internal work-items endpoint, never /api/tasks', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 't-created', title: 'New task' }),
      });
      const result = await executor.executeTaskRecipe(
        { title: 'Follow up', execution_recipe: { type: 'task_create', parent_id: 'parent-1' } },
        { internalToken: 'tok', baseUrl: 'http://localhost:8888', fetch: mockFetch, pool: makeMockPool() }
      );
      expect(result.success).toBe(true);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:8888/api/internal/aios/work-items');
      expect(opts.headers['x-nbi-internal-token']).toBe('tok');
      expect(opts.headers.Cookie).toBeUndefined();
    });
  });

  describe('parent resolution (finding 3)', () => {
    it('uses recipe.parent_id directly when present (no inbox lookup)', async () => {
      const pool = makeMockPool();
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 't-1' }) });
      await executor.executeTaskRecipe(
        { title: 'T', execution_recipe: { type: 'task_create', parent_id: 'explicit-parent' } },
        { internalToken: 'tok', baseUrl: 'http://x', fetch: mockFetch, pool }
      );
      expect(pool.query).not.toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.parent_id).toBe('explicit-parent');
      expect(body.item_type).toBe('task');
    });

    it('files bare tasks under an existing AIOS Inbox initiative for the client', async () => {
      const pool = makeMockPool([
        { rows: [{ id: 'client-ch' }], rowCount: 1 },   // client lookup by slug
        { rows: [{ id: 'inbox-1' }], rowCount: 1 },     // existing AIOS Inbox
      ]);
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 't-2' }) });
      const result = await executor.executeTaskRecipe(
        { title: 'Commitment', execution_recipe: { type: 'task_create', client_slug: 'couch_heroes' } },
        { internalToken: 'tok', baseUrl: 'http://x', fetch: mockFetch, pool }
      );
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.parent_id).toBe('inbox-1');
      expect(body.client_id).toBe('client-ch');
    });

    it('creates the AIOS Inbox initiative when missing, then files the task under it', async () => {
      const pool = makeMockPool([
        { rows: [], rowCount: 0 },  // client lookup: no slug given -> skipped; this is inbox lookup (none)
      ]);
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'inbox-new', item_type: 'initiative' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 't-3' }) });
      const result = await executor.executeTaskRecipe(
        { title: 'Orphan commitment', execution_recipe: { type: 'task_create' } },
        { internalToken: 'tok', baseUrl: 'http://x', fetch: mockFetch, pool }
      );
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const inboxBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(inboxBody.item_type).toBe('initiative');
      expect(inboxBody.title).toBe('AIOS Inbox');
      const taskBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(taskBody.parent_id).toBe('inbox-new');
    });
  });

  describe('resolveClientId', () => {
    it('matches client by slug-derived name', async () => {
      const pool = makeMockPool([{ rows: [{ id: 'c-1' }], rowCount: 1 }]);
      const id = await executor.resolveClientId(pool, 'couch_heroes');
      expect(id).toBe('c-1');
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('lower(name)');
      expect(params[0]).toBe('%couch heroes%');
    });

    it('returns null when no slug or no match', async () => {
      expect(await executor.resolveClientId(makeMockPool(), null)).toBeNull();
      expect(await executor.resolveClientId(makeMockPool([{ rows: [], rowCount: 0 }]), 'nobody')).toBeNull();
    });
  });

  describe('codex critique command (finding 2)', () => {
    it('references only the prompt file path, never inline deliverable text', () => {
      const cmd = executor.buildCodexCritiqueCommand('C:\\tmp\\aios-codex-critique-abc.md');
      expect(cmd).toContain('codex');
      expect(cmd).toContain('aios-codex-critique-abc.md');
      // The command must be fully static apart from the controlled temp path
      expect(cmd).not.toContain('Brief output');
      expect(cmd).not.toContain('\\"');
    });
  });

  describe('buildInitiativePrompt endpoint (finding 1)', () => {
    it('directs headless runs at the internal work-items endpoint with the token', () => {
      const prompt = executor.buildInitiativePrompt({
        title: 'Finance Build-Out',
        execution_recipe: { type: 'initiative_build', roles: ['head_of_people'], task_tree: { initiative: 'Finance Build-Out', children: [] } },
      });
      expect(prompt).toContain('/api/internal/aios/work-items');
      expect(prompt).toContain('x-nbi-internal-token');
      expect(prompt).not.toContain('8888/api/tasks');
    });
  });
});
