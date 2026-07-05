import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  buildRoutingClientBlocks, buildRoutingProjectBlocks, mergeRoutingIntoRecipe, applyRouting,
} = require('../../lib/bot-handlers');

describe('buildRoutingClientBlocks', () => {
  it('returns section + select with AIOS Inbox first, then clients alphabetically', () => {
    const clients = [
      { id: 'c-2', name: 'Couch Heroes' },
      { id: 'c-1', name: 'Activision' },
    ];
    const blocks = buildRoutingClientBlocks({ id: 'act-1', title: 'Follow up' }, clients);
    const section = blocks.find(b => b.type === 'section');
    expect(section.text.text).toContain('Where should this go?');
    const actions = blocks.find(b => b.type === 'actions');
    const select = actions.elements.find(e => e.action_id === 'aios_route_client');
    expect(select.options[0].text.text).toBe('AIOS Inbox (no client)');
    expect(select.options[0].value).toBe('act-1:none');
    expect(select.options[1].value).toBe('act-1:c-1');
    expect(select.options[2].value).toBe('act-1:c-2');
  });

  it('returns only inbox option when client list is empty', () => {
    const blocks = buildRoutingClientBlocks({ id: 'act-2', title: 'Test' }, []);
    const actions = blocks.find(b => b.type === 'actions');
    const select = actions.elements.find(e => e.action_id === 'aios_route_client');
    expect(select.options).toHaveLength(1);
    expect(select.options[0].value).toBe('act-2:none');
  });
});

describe('buildRoutingProjectBlocks', () => {
  it('returns select with initiatives + New in AIOS Inbox when multiple', () => {
    const initiatives = [
      { id: 'i-1', title: 'Sprint 1' },
      { id: 'i-2', title: 'Backlog' },
    ];
    const blocks = buildRoutingProjectBlocks({ id: 'act-1' }, 'c-1', 'Couch Heroes', initiatives);
    const section = blocks.find(b => b.type === 'section');
    expect(section.text.text).toContain('Couch Heroes');
    const actions = blocks.find(b => b.type === 'actions');
    const select = actions.elements.find(e => e.action_id === 'aios_route_project');
    expect(select.options).toHaveLength(3);
    expect(select.options[0].value).toBe('act-1:c-1:i-1');
    expect(select.options[1].value).toBe('act-1:c-1:i-2');
    expect(select.options[2].text.text).toBe('New in AIOS Inbox');
    expect(select.options[2].value).toBe('act-1:c-1:inbox');
  });

  it('returns null when zero initiatives (caller should auto-route)', () => {
    const result = buildRoutingProjectBlocks({ id: 'act-1' }, 'c-1', 'Couch Heroes', []);
    expect(result).toBeNull();
  });

  it('returns null when exactly one initiative (caller should auto-select)', () => {
    const result = buildRoutingProjectBlocks({ id: 'act-1' }, 'c-1', 'CH', [{ id: 'i-1', title: 'Only' }]);
    expect(result).toBeNull();
  });
});

describe('mergeRoutingIntoRecipe', () => {
  it('sets client_id and parent_id, clears client_slug when client_id set', () => {
    const recipe = { type: 'task_create', client_slug: 'couch_heroes', some_field: 'keep' };
    const merged = mergeRoutingIntoRecipe(recipe, { clientId: 'c-1', parentId: 'p-1' });
    expect(merged.client_id).toBe('c-1');
    expect(merged.parent_id).toBe('p-1');
    expect(merged.client_slug).toBeUndefined();
    expect(merged.some_field).toBe('keep');
    expect(merged.type).toBe('task_create');
  });

  it('keeps client_slug when clientId is null', () => {
    const recipe = { type: 'task_create', client_slug: 'couch_heroes' };
    const merged = mergeRoutingIntoRecipe(recipe, { clientId: null, parentId: null });
    expect(merged.client_id).toBeNull();
    expect(merged.parent_id).toBeNull();
    expect(merged.client_slug).toBe('couch_heroes');
  });

  it('handles null recipe (creates new object)', () => {
    const merged = mergeRoutingIntoRecipe(null, { clientId: 'c-1', parentId: null });
    expect(merged.client_id).toBe('c-1');
    expect(merged.parent_id).toBeNull();
  });
});

describe('applyRouting', () => {
  it('updates execution_recipe and sets execution_state to pending', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: 'a-1', execution_state: 'pending', execution_recipe: { type: 'task_create', client_id: 'c-1' } }],
        rowCount: 1,
      }),
    };
    const result = await applyRouting(pool, 'a-1', { type: 'task_create', client_id: 'c-1' });
    expect(result.id).toBe('a-1');
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('execution_recipe');
    expect(sql).toContain("execution_state = 'pending'");
    expect(params[0]).toContain('"client_id"');
    expect(params[1]).toBe('a-1');
  });

  it('rejects when action is not in awaiting_routing state', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
    const result = await applyRouting(pool, 'a-1', { type: 'task_create' });
    expect(result).toBeNull();
  });
});
