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

describe('executeAndReport', () => {
  let mod;
  beforeEach(() => {
    vi.resetModules();
  });

  it('marks in_progress then completed on success', async () => {
    const action = {
      id: 'a-1', title: 'Test', execution_recipe: { type: 'task_create', parent_id: 'p-1' },
    };
    const pool = makeMockPool([
      { rows: [action], rowCount: 1 },
    ]);
    const mockExecutor = {
      getRecipeType: vi.fn(() => 'task_create'),
      markExecutionState: vi.fn(),
      executeAction: vi.fn().mockResolvedValue({ success: true, created_id: 't-1' }),
    };
    mod = require('../../lib/execute-and-report');
    const result = await mod.executeAndReport(pool, 'a-1', {}, vi.fn(), mockExecutor);
    expect(result.success).toBe(true);
    expect(mockExecutor.markExecutionState).toHaveBeenCalledWith(pool, 'a-1', 'in_progress', null);
    expect(mockExecutor.markExecutionState).toHaveBeenCalledWith(pool, 'a-1', 'completed', expect.objectContaining({ success: true }));
  });

  it('marks in_progress then failed on execution error', async () => {
    const action = {
      id: 'a-2', title: 'Broken', execution_recipe: { type: 'task_create' },
    };
    const pool = makeMockPool([
      { rows: [action], rowCount: 1 },
    ]);
    const mockExecutor = {
      getRecipeType: vi.fn(() => 'task_create'),
      markExecutionState: vi.fn(),
      executeAction: vi.fn().mockRejectedValue(new Error('DB down')),
    };
    mod = require('../../lib/execute-and-report');
    const result = await mod.executeAndReport(pool, 'a-2', {}, vi.fn(), mockExecutor);
    expect(result.success).toBe(false);
    expect(result.error).toBe('DB down');
    expect(mockExecutor.markExecutionState).toHaveBeenCalledWith(pool, 'a-2', 'failed', expect.objectContaining({ error: 'DB down' }));
  });

  it('returns error without marking in_progress for unknown recipe', async () => {
    const action = {
      id: 'a-3', title: 'No recipe', execution_recipe: null,
    };
    const pool = makeMockPool([
      { rows: [action], rowCount: 1 },
    ]);
    const mockExecutor = {
      getRecipeType: vi.fn(() => 'unknown'),
      markExecutionState: vi.fn(),
      executeAction: vi.fn(),
    };
    mod = require('../../lib/execute-and-report');
    const result = await mod.executeAndReport(pool, 'a-3', {}, vi.fn(), mockExecutor);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No executable recipe');
    expect(mockExecutor.markExecutionState).not.toHaveBeenCalled();
  });

  it('returns error when action not found', async () => {
    const pool = makeMockPool([
      { rows: [], rowCount: 0 },
    ]);
    const mockExecutor = {
      getRecipeType: vi.fn(),
      markExecutionState: vi.fn(),
      executeAction: vi.fn(),
    };
    mod = require('../../lib/execute-and-report');
    const result = await mod.executeAndReport(pool, 'nonexistent', {}, vi.fn(), mockExecutor);
    expect(result.success).toBe(false);
  });
});
