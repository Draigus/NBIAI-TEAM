import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { createWorkItem } = require('../../lib/work-item-create');

function makeMockPool(queuedResults = [], clientResults = []) {
  const queue = [...queuedResults];
  const cQueue = [...clientResults];
  const mockClient = {
    query: vi.fn(async () => {
      if (cQueue.length === 0) return { rows: [], rowCount: 0 };
      return cQueue.shift();
    }),
    release: vi.fn(),
  };
  return {
    query: vi.fn(async () => {
      if (queue.length === 0) return { rows: [], rowCount: 0 };
      return queue.shift();
    }),
    connect: vi.fn().mockResolvedValue(mockClient),
    _client: mockClient,
  };
}

function makeDeps(pool) {
  return { pool, log: vi.fn(), auditLog: vi.fn().mockResolvedValue(undefined) };
}

describe('work-item-create', () => {
  it('rejects missing title with 400', async () => {
    const pool = makeMockPool();
    const result = await createWorkItem(makeDeps(pool), { title: '' }, 'test-actor');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/title/i);
  });

  it('rejects invalid status with 400', async () => {
    const pool = makeMockPool();
    const result = await createWorkItem(makeDeps(pool), { title: 'T', status: 'Bogus' }, 'test-actor');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/status/i);
  });

  it('rejects root non-initiative items with 400', async () => {
    const pool = makeMockPool();
    const result = await createWorkItem(makeDeps(pool), { title: 'T', item_type: 'task' }, 'test-actor');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/initiative/i);
  });

  it('creates a root initiative', async () => {
    const created = { id: 'w-1', title: 'AIOS Inbox', item_type: 'initiative', parent_id: null, status: 'Not started' };
    const pool = makeMockPool(
      [],
      [
        { rows: [], rowCount: 0 },              // BEGIN
        { rows: [], rowCount: 0 },              // shiftForInsert UPDATE
        { rows: [created], rowCount: 1 },       // INSERT RETURNING
        { rows: [], rowCount: 0 },              // COMMIT
      ]
    );
    const deps = makeDeps(pool);
    const result = await createWorkItem(deps, { title: 'AIOS Inbox', item_type: 'initiative' }, 'aios-executor');
    expect(result.ok).toBe(true);
    expect(result.row.id).toBe('w-1');
    expect(deps.auditLog).toHaveBeenCalledWith('task', 'w-1', 'create', 'aios-executor', expect.objectContaining({ item_type: 'initiative' }));
  });

  it('creates a task under an initiative parent (descendant-order allows level skip)', async () => {
    const created = { id: 'w-2', title: 'Follow up', item_type: 'task', parent_id: 'init-1', status: 'Not started' };
    const pool = makeMockPool(
      [
        { rows: [{ item_type: 'initiative', client_id: 'c-1' }], rowCount: 1 }, // parent lookup
      ],
      [
        { rows: [], rowCount: 0 },              // BEGIN
        { rows: [], rowCount: 0 },              // shiftForInsert
        { rows: [created], rowCount: 1 },       // INSERT RETURNING
        { rows: [], rowCount: 0 },              // COMMIT
      ]
    );
    const result = await createWorkItem(makeDeps(pool), { title: 'Follow up', item_type: 'task', parent_id: 'init-1' }, 'aios-executor');
    expect(result.ok).toBe(true);
    expect(result.row.item_type).toBe('task');
  });

  it('rejects child type higher than parent type', async () => {
    const pool = makeMockPool([
      { rows: [{ item_type: 'story', client_id: null }], rowCount: 1 }, // parent lookup
    ]);
    const result = await createWorkItem(makeDeps(pool), { title: 'Bad', item_type: 'project', parent_id: 'story-1' }, 'test-actor');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/hierarchy/i);
  });

  it('rejects negative hours_estimated with 400', async () => {
    const pool = makeMockPool();
    const result = await createWorkItem(makeDeps(pool), { title: 'T', item_type: 'initiative', hours_estimated: -5 }, 'test-actor');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/hours_estimated/i);
  });

  it('rejects start_date after end_date with 400', async () => {
    const pool = makeMockPool();
    const result = await createWorkItem(makeDeps(pool), { title: 'T', item_type: 'initiative', start_date: '2026-08-01', end_date: '2026-07-01' }, 'test-actor');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/start_date/i);
  });

  it('rolls back and returns 500 on insert failure', async () => {
    const pool = makeMockPool(
      [],
      [
        { rows: [], rowCount: 0 }, // BEGIN
        { rows: [], rowCount: 0 }, // shiftForInsert
      ]
    );
    pool._client.query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // shiftForInsert
      .mockRejectedValueOnce(new Error('db exploded'))    // INSERT
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // ROLLBACK
    const result = await createWorkItem(makeDeps(pool), { title: 'T', item_type: 'initiative' }, 'test-actor');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  // Bug fcad389c: Organisation Auto-Set — practice_area accepted, validated,
  // and inherited from the nearest ancestor when omitted on a child item.
  describe('practice_area', () => {
    const insertParamsOf = (pool) => {
      const insertCall = pool._client.query.mock.calls.find(c => /INSERT INTO tasks/.test(c[0]));
      return insertCall ? insertCall[1] : null;
    };

    it('rejects an invalid practice_area with 400', async () => {
      const pool = makeMockPool();
      const result = await createWorkItem(makeDeps(pool), { title: 'T', item_type: 'initiative', practice_area: 'bogus_practice' }, 'test-actor');
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/practice_area/i);
    });

    it('writes an explicit practice_area to the INSERT', async () => {
      const created = { id: 'w-p1', title: 'T', item_type: 'initiative', parent_id: null, status: 'Not started', practice_area: 'gaming' };
      const pool = makeMockPool(
        [],
        [
          { rows: [], rowCount: 0 },              // BEGIN
          { rows: [], rowCount: 0 },              // shiftForInsert
          { rows: [created], rowCount: 1 },       // INSERT RETURNING
          { rows: [], rowCount: 0 },              // COMMIT
        ]
      );
      const result = await createWorkItem(makeDeps(pool), { title: 'T', item_type: 'initiative', practice_area: 'gaming' }, 'test-actor');
      expect(result.ok).toBe(true);
      const params = insertParamsOf(pool);
      expect(params).toContain('gaming');
    });

    it('inherits practice_area from the nearest ancestor when omitted', async () => {
      const created = { id: 'w-p2', title: 'Child', item_type: 'task', parent_id: 'par-1', status: 'Not started', practice_area: 'organisational_performance' };
      const pool = makeMockPool(
        [
          { rows: [{ item_type: 'story', client_id: 'c-1' }], rowCount: 1 },            // parent lookup
          { rows: [{ practice_area: 'organisational_performance' }], rowCount: 1 },     // ancestor practice CTE
        ],
        [
          { rows: [], rowCount: 0 },              // BEGIN
          { rows: [], rowCount: 0 },              // shiftForInsert
          { rows: [created], rowCount: 1 },       // INSERT RETURNING
          { rows: [], rowCount: 0 },              // COMMIT
        ]
      );
      const result = await createWorkItem(makeDeps(pool), { title: 'Child', parent_id: 'par-1', item_type: 'task' }, 'test-actor');
      expect(result.ok).toBe(true);
      const params = insertParamsOf(pool);
      expect(params).toContain('organisational_performance');
    });

    it('leaves practice_area null when no ancestor has one', async () => {
      const created = { id: 'w-p3', title: 'Child', item_type: 'task', parent_id: 'par-1', status: 'Not started', practice_area: null };
      const pool = makeMockPool(
        [
          { rows: [{ item_type: 'story', client_id: 'c-1' }], rowCount: 1 },  // parent lookup
          { rows: [], rowCount: 0 },                                          // ancestor CTE: nothing found
        ],
        [
          { rows: [], rowCount: 0 },              // BEGIN
          { rows: [], rowCount: 0 },              // shiftForInsert
          { rows: [created], rowCount: 1 },       // INSERT RETURNING
          { rows: [], rowCount: 0 },              // COMMIT
        ]
      );
      const result = await createWorkItem(makeDeps(pool), { title: 'Child', parent_id: 'par-1', item_type: 'task' }, 'test-actor');
      expect(result.ok).toBe(true);
      const params = insertParamsOf(pool);
      expect(params).toContain(null);
      expect(params).not.toContain('gaming');
      expect(params).not.toContain('organisational_performance');
    });
  });
});
