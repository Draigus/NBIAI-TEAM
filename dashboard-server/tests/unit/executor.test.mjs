import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('executor', () => {
  let executor;
  beforeEach(async () => {
    vi.resetModules();
    executor = require('../../lib/executor');
  });

  describe('fetchPendingExecutions', () => {
    it('returns approved actions with pending execution state', async () => {
      const actions = [
        { id: 'a-1', title: 'Task', execution_recipe: { type: 'task_create' }, execution_state: 'pending' },
      ];
      const pool = makeMockPool([{ rows: actions, rowCount: 1 }]);
      const result = await executor.fetchPendingExecutions(pool);
      expect(result).toHaveLength(1);
      const [sql] = pool.query.mock.calls[0];
      expect(sql).toContain("approval_state = 'approved'");
      expect(sql).toContain("execution_state = 'pending'");
    });
  });

  describe('markExecutionState', () => {
    it('updates execution_state and result', async () => {
      const pool = makeMockPool([{ rows: [{ id: 'a-1' }], rowCount: 1 }]);
      await executor.markExecutionState(pool, 'a-1', 'completed', { created: true });
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('execution_state');
      expect(params).toContain('completed');
    });
  });

  describe('executeTaskRecipe', () => {
    it('creates a WorkSage task via API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 't-created', title: 'New task' }),
      });
      const result = await executor.executeTaskRecipe(
        { title: 'Follow up with Jen', execution_recipe: { type: 'task_create', client_slug: null } },
        { internalToken: 'tok', baseUrl: 'http://localhost:8888', fetch: mockFetch }
      );
      expect(result.success).toBe(true);
      expect(result.created_id).toBe('t-created');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8888/api/tasks',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('reports failure on API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Title required' }),
      });
      const result = await executor.executeTaskRecipe(
        { title: '', execution_recipe: { type: 'task_create' } },
        { internalToken: 'tok', baseUrl: 'http://localhost:8888', fetch: mockFetch }
      );
      expect(result.success).toBe(false);
    });
  });

  describe('getRecipeType', () => {
    it('extracts type from execution_recipe', () => {
      expect(executor.getRecipeType({ execution_recipe: { type: 'task_create' } })).toBe('task_create');
      expect(executor.getRecipeType({ execution_recipe: { type: 'initiative_build' } })).toBe('initiative_build');
      expect(executor.getRecipeType({ execution_recipe: null })).toBe('unknown');
      expect(executor.getRecipeType({})).toBe('unknown');
    });
  });
});
