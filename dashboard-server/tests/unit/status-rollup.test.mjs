// dashboard-server/tests/unit/status-rollup.test.mjs
//
// Upward activation roll-up (bug c2c2b046): when any descendant becomes
// active (Planning / In progress / In Review / Drafted), every ancestor
// still sitting at 'Not started' must become active too. Ancestors with
// any other status (Done, Blocked, Cancelled, manually-set active) are
// never touched, and there is no reverse roll-up.
//
// Mapping: child Planning -> ancestor Planning; anything stronger -> In progress.
// Covers both write paths: POST /api/sync/changes (what the SPA uses) and
// the REST PATCH /api/tasks/:id, plus inserts arriving already-active.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestTask, createTestClient } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

async function seedTree() {
  const client = await createTestClient({ name: 'RollupCo' });
  const project = await createTestTask({ item_type: 'project', client_id: client.id, status: 'Not started' });
  const feature = await createTestTask({ item_type: 'feature', parent_id: project.id, status: 'Not started' });
  const story = await createTestTask({ item_type: 'story', parent_id: feature.id, status: 'Not started' });
  return { client, project, feature, story };
}

async function statusOf(id) {
  const { rows } = await pool.query('SELECT status FROM tasks WHERE id = $1', [id]);
  return rows[0].status;
}

describe('Status activation roll-up — sync path', () => {
  it('child set to In progress activates Not started ancestors and returns their timestamps', async () => {
    const { project, feature, story } = await seedTree();
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const { rows: [s] } = await pool.query('SELECT updated_at FROM tasks WHERE id = $1', [story.id]);

    const res = await request(app)
      .post('/api/sync/changes')
      .set('Authorization', `Bearer ${token}`)
      .send({ changes: [{ action: 'upsert', entity: 'task', data: { id: story.id, title: story.title, status: 'In progress', item_type: 'story', parentId: feature.id, _serverUpdatedAt: s.updated_at } }] });
    expect(res.status).toBe(200);
    expect(await statusOf(feature.id)).toBe('In progress');
    expect(await statusOf(project.id)).toBe('In progress');
    // Cascaded ancestors must be in updatedTimestamps so clients refresh _serverUpdatedAt
    expect(res.body.updatedTimestamps).toBeTruthy();
    expect(Object.keys(res.body.updatedTimestamps)).toEqual(expect.arrayContaining([feature.id, project.id]));
  });

  it('child set to Planning maps ancestors to Planning', async () => {
    const { project, feature, story } = await seedTree();
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const { rows: [s] } = await pool.query('SELECT updated_at FROM tasks WHERE id = $1', [story.id]);

    await request(app)
      .post('/api/sync/changes')
      .set('Authorization', `Bearer ${token}`)
      .send({ changes: [{ action: 'upsert', entity: 'task', data: { id: story.id, title: story.title, status: 'Planning', item_type: 'story', parentId: feature.id, _serverUpdatedAt: s.updated_at } }] });
    expect(await statusOf(feature.id)).toBe('Planning');
    expect(await statusOf(project.id)).toBe('Planning');
  });

  it('never overwrites ancestors that are not Not started', async () => {
    const { project, feature, story } = await seedTree();
    await pool.query("UPDATE tasks SET status = 'Done' WHERE id = $1", [feature.id]);
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const { rows: [s] } = await pool.query('SELECT updated_at FROM tasks WHERE id = $1', [story.id]);

    await request(app)
      .post('/api/sync/changes')
      .set('Authorization', `Bearer ${token}`)
      .send({ changes: [{ action: 'upsert', entity: 'task', data: { id: story.id, title: story.title, status: 'In progress', item_type: 'story', parentId: feature.id, _serverUpdatedAt: s.updated_at } }] });
    expect(await statusOf(feature.id)).toBe('Done');          // untouched
    expect(await statusOf(project.id)).toBe('In progress');   // still rolled up past it
  });

  it('a NEW task inserted via sync with an active status rolls up', async () => {
    const { project, feature } = await seedTree();
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app)
      .post('/api/sync/changes')
      .set('Authorization', `Bearer ${token}`)
      .send({ changes: [{ action: 'upsert', entity: 'task', data: { id: '7f9e4567-e89b-12d3-a456-426614174999', title: 'fresh active task', status: 'In progress', itemType: 'task', parentId: feature.id } }] });
    expect(res.status).toBe(200);
    expect(await statusOf(feature.id)).toBe('In progress');
    expect(await statusOf(project.id)).toBe('In progress');
  });

  it('no reverse roll-up: reverting child to Not started leaves ancestors active', async () => {
    const { project, feature, story } = await seedTree();
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    let { rows: [s] } = await pool.query('SELECT updated_at FROM tasks WHERE id = $1', [story.id]);
    await request(app).post('/api/sync/changes').set('Authorization', `Bearer ${token}`)
      .send({ changes: [{ action: 'upsert', entity: 'task', data: { id: story.id, title: story.title, status: 'In progress', item_type: 'story', parentId: feature.id, _serverUpdatedAt: s.updated_at } }] });
    ({ rows: [s] } = await pool.query('SELECT updated_at FROM tasks WHERE id = $1', [story.id]));
    await request(app).post('/api/sync/changes').set('Authorization', `Bearer ${token}`)
      .send({ changes: [{ action: 'upsert', entity: 'task', data: { id: story.id, title: story.title, status: 'Not started', item_type: 'story', parentId: feature.id, _serverUpdatedAt: s.updated_at } }] });
    expect(await statusOf(feature.id)).toBe('In progress');
    expect(await statusOf(project.id)).toBe('In progress');
  });
});

describe('Status activation roll-up — REST paths', () => {
  it('PATCH /api/tasks/:id with an active status activates ancestors', async () => {
    const { project, feature, story } = await seedTree();
    // PATCH to an active status enforces mandatory fields on leaf tasks — satisfy them
    await pool.query(
      `UPDATE tasks SET hours_estimated = 5, priority = 'High', assignees = '{Glen Pryer}',
       due_date = '2026-12-01', description = 'A description longer than fifteen characters' WHERE id = $1`, [story.id]);
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app)
      .patch(`/api/tasks/${story.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'In Review' });
    expect(res.status).toBe(200);
    expect(await statusOf(feature.id)).toBe('In progress');
    expect(await statusOf(project.id)).toBe('In progress');
  });

  it('POST /api/tasks creating an active child activates ancestors', async () => {
    const { project, feature } = await seedTree();
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'new active task', parent_id: feature.id, item_type: 'story', status: 'In progress' });
    expect([200, 201]).toContain(res.status);
    expect(await statusOf(feature.id)).toBe('In progress');
    expect(await statusOf(project.id)).toBe('In progress');
  });

  it('bulk endpoint accepts Drafted and In Review statuses (validation gap)', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const res = await request(app)
      .post('/api/tasks/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ tasks: [
        { title: 'drafted item', itemType: 'project', status: 'Drafted' },
        { title: 'review item', itemType: 'project', status: 'In Review' },
      ] });
    expect(res.status).not.toBe(400);
  });
});
