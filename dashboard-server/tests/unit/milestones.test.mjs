// dashboard-server/tests/unit/milestones.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask, createTestMilestone } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Milestones API', () => {
  let admin, adminToken, client1;

  beforeEach(async () => {
    admin = await createTestUser({ role: 'admin' });
    adminToken = await mintSession(admin.id);
    client1 = await createTestClient({ name: 'Lighthouse Games', sector: 'gaming' });
  });

  // ---- LIST ----------------------------------------------------------------

  it('GET /api/clients/:clientId/milestones returns empty array initially', async () => {
    const res = await request(app)
      .get(`/api/clients/${client1.id}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('GET /api/clients/:clientId/milestones returns milestones with linked_item_ids', async () => {
    const ms = await createTestMilestone({ client_id: client1.id, title: 'Alpha Playtest', target_date: '2026-07-15' });
    const feat = await createTestTask({ client_id: client1.id, title: 'Core Gameplay', item_type: 'project' });
    await pool.query('INSERT INTO milestone_items (milestone_id, task_id) VALUES ($1, $2)', [ms.id, feat.id]);

    const res = await request(app)
      .get(`/api/clients/${client1.id}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Alpha Playtest');
    expect(res.body[0].linked_item_ids).toEqual([feat.id]);
  });

  it('GET /api/clients/:clientId/milestones does not return milestones from other clients', async () => {
    const client2 = await createTestClient({ name: 'Other Studio' });
    await createTestMilestone({ client_id: client2.id, title: 'Other MS' });

    const res = await request(app)
      .get(`/api/clients/${client1.id}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  // ---- CREATE --------------------------------------------------------------

  it('POST /api/clients/:clientId/milestones creates a milestone', async () => {
    const res = await request(app)
      .post(`/api/clients/${client1.id}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Beta Release', description: 'External beta', target_date: '2026-09-01' })
      .expect(201);

    expect(res.body.title).toBe('Beta Release');
    expect(res.body.description).toBe('External beta');
    expect(res.body.target_date).toContain('2026-09-01');
    expect(res.body.id).toBeTruthy();
    expect(res.body.linked_item_ids).toEqual([]);
  });

  it('POST /api/clients/:clientId/milestones creates with linked_item_ids', async () => {
    const feat = await createTestTask({ client_id: client1.id, title: 'Matchmaking', item_type: 'project' });
    const res = await request(app)
      .post(`/api/clients/${client1.id}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Alpha', target_date: '2026-07-01', linked_item_ids: [feat.id] })
      .expect(201);

    expect(res.body.linked_item_ids).toEqual([feat.id]);
  });

  it('POST rejects missing title', async () => {
    await request(app)
      .post(`/api/clients/${client1.id}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ target_date: '2026-09-01' })
      .expect(400);
  });

  it('POST rejects missing target_date', async () => {
    await request(app)
      .post(`/api/clients/${client1.id}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'No Date' })
      .expect(400);
  });

  it('POST rejects invalid client ID', async () => {
    await request(app)
      .post('/api/clients/not-a-uuid/milestones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'X', target_date: '2026-09-01' })
      .expect(400);
  });

  // ---- UPDATE --------------------------------------------------------------

  it('PUT /api/milestones/:id updates title and target_date', async () => {
    const ms = await createTestMilestone({ client_id: client1.id, title: 'Old Title', target_date: '2026-06-01' });

    const res = await request(app)
      .put(`/api/milestones/${ms.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'New Title', target_date: '2026-08-01' })
      .expect(200);

    expect(res.body.title).toBe('New Title');
    expect(res.body.target_date).toContain('2026-08-01');
  });

  it('PUT /api/milestones/:id replaces linked_item_ids', async () => {
    const ms = await createTestMilestone({ client_id: client1.id });
    const feat1 = await createTestTask({ client_id: client1.id, title: 'F1', item_type: 'project' });
    const feat2 = await createTestTask({ client_id: client1.id, title: 'F2', item_type: 'project' });
    await pool.query('INSERT INTO milestone_items (milestone_id, task_id) VALUES ($1, $2)', [ms.id, feat1.id]);

    const res = await request(app)
      .put(`/api/milestones/${ms.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ linked_item_ids: [feat2.id] })
      .expect(200);

    expect(res.body.linked_item_ids).toEqual([feat2.id]);
  });

  it('PUT returns 404 for nonexistent milestone', async () => {
    await request(app)
      .put('/api/milestones/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'X' })
      .expect(404);
  });

  // ---- DELETE --------------------------------------------------------------

  it('DELETE /api/milestones/:id removes the milestone', async () => {
    const ms = await createTestMilestone({ client_id: client1.id });

    await request(app)
      .delete(`/api/milestones/${ms.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const check = await pool.query('SELECT id FROM milestones WHERE id = $1', [ms.id]);
    expect(check.rows).toHaveLength(0);
  });

  it('DELETE cascades to milestone_items', async () => {
    const ms = await createTestMilestone({ client_id: client1.id });
    const feat = await createTestTask({ client_id: client1.id, item_type: 'project' });
    await pool.query('INSERT INTO milestone_items (milestone_id, task_id) VALUES ($1, $2)', [ms.id, feat.id]);

    await request(app)
      .delete(`/api/milestones/${ms.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const items = await pool.query('SELECT * FROM milestone_items WHERE milestone_id = $1', [ms.id]);
    expect(items.rows).toHaveLength(0);
  });

  it('DELETE returns 404 for nonexistent milestone', async () => {
    await request(app)
      .delete('/api/milestones/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ---- AUTH ----------------------------------------------------------------

  it('all endpoints require authentication', async () => {
    await request(app).get(`/api/clients/${client1.id}/milestones`).expect(401);
    await request(app).post(`/api/clients/${client1.id}/milestones`).send({ title: 'X', target_date: '2026-01-01' }).expect(401);
  });

  it('POST/PUT/DELETE require admin role', async () => {
    const viewer = await createTestUser({ role: 'viewer' });
    const viewerToken = await mintSession(viewer.id);
    await request(app)
      .post(`/api/clients/${client1.id}/milestones`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ title: 'X', target_date: '2026-01-01' })
      .expect(403);
  });
});
