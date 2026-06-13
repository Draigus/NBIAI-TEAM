// dashboard-server/tests/unit/duplicate-subtree.test.mjs
//
// Server-side guarantees the frontend subtree duplicate (bug 0e8b4144)
// relies on: a single /api/sync/changes batch containing a new parent
// followed by new children (pre-order) must insert all rows with the
// parent_id chain intact — tasks.parent_id is a non-deferrable FK, so
// order inside the transaction matters. Also pins dependency arrays
// passing through inserts untouched (the frontend remaps them).

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

const ids = {
  proj: '11111111-1111-4111-8111-111111111111',
  feat: '22222222-2222-4222-8222-222222222222',
  story: '33333333-3333-4333-8333-333333333333',
};

describe('POST /api/sync/changes — pre-order subtree insert', () => {
  it('inserts parent + children in one batch with FK chain and dependencies intact', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app)
      .post('/api/sync/changes')
      .set('Authorization', `Bearer ${token}`)
      .send({ changes: [
        { action: 'upsert', entity: 'task', data: { id: ids.proj, title: 'Copied project', status: 'Not started', itemType: 'project' } },
        { action: 'upsert', entity: 'task', data: { id: ids.feat, title: 'Copied feature', status: 'Not started', itemType: 'feature', parentId: ids.proj } },
        { action: 'upsert', entity: 'task', data: { id: ids.story, title: 'Copied story', status: 'Not started', itemType: 'story', parentId: ids.feat, dependencies: [ids.feat] } },
      ] });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(3);

    const { rows } = await pool.query('SELECT id, parent_id, dependencies FROM tasks WHERE id = ANY($1) ORDER BY title', [Object.values(ids)]);
    expect(rows.length).toBe(3);
    const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    expect(byId[ids.feat].parent_id).toBe(ids.proj);
    expect(byId[ids.story].parent_id).toBe(ids.feat);
    expect(byId[ids.story].dependencies).toEqual([ids.feat]);
  });

  it('child-before-parent order fails the batch (documents why pre-order matters)', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app)
      .post('/api/sync/changes')
      .set('Authorization', `Bearer ${token}`)
      .send({ changes: [
        { action: 'upsert', entity: 'task', data: { id: ids.feat, title: 'Orphan feature', status: 'Not started', itemType: 'feature', parentId: ids.proj } },
        { action: 'upsert', entity: 'task', data: { id: ids.proj, title: 'Late project', status: 'Not started', itemType: 'project' } },
      ] });
    // The transaction rolls back on the FK violation — server must not 500-crash
    // and must not leave partial rows behind.
    expect(res.status).toBeGreaterThanOrEqual(400);
    const { rows } = await pool.query('SELECT id FROM tasks WHERE id = ANY($1)', [[ids.proj, ids.feat]]);
    expect(rows.length).toBe(0);
  });
});
