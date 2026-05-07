// dashboard-server/tests/unit/sort-order.test.mjs
//
// Regression test: /api/sync/load must return tasks in deterministic order
// even when multiple tasks share an identical created_at timestamp.
// Root cause was ORDER BY t.created_at with no tiebreaker; Postgres can
// return rows in any order when the sort key is not unique.
// Fix: ORDER BY t.created_at, t.title, t.id

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('GET /api/sync/load — task sort order', () => {
  it('returns tasks in deterministic order when created_at is identical', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const now = new Date().toISOString();

    // Insert three tasks with identical created_at to force the tiebreaker
    for (const title of ['Charlie', 'Alpha', 'Bravo']) {
      await pool.query(
        `INSERT INTO tasks (title, status, item_type, created_at)
         VALUES ($1, 'Not started', 'project', $2)`,
        [title, now]
      );
    }

    const res1 = await request(app)
      .get('/api/sync/load')
      .set('Authorization', `Bearer ${token}`);

    const res2 = await request(app)
      .get('/api/sync/load')
      .set('Authorization', `Bearer ${token}`);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const titles1 = res1.body.tasks.map(t => t.title);
    const titles2 = res2.body.tasks.map(t => t.title);

    // Both responses must be identical (deterministic)
    expect(titles1).toEqual(titles2);
    // And must be alphabetically sorted (title tiebreaker)
    expect(titles1).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });
});
