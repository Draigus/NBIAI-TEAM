// dashboard-server/tests/unit/task-access.test.mjs
//
// Tests for GET /api/tasks/:id access control — client-scoped users
// must not be able to fetch tasks belonging to other clients.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('GET /api/tasks/:id access control', () => {
  it('returns 403 for client user accessing another client task', async () => {
    const clientA = await createTestClient({ name: 'DeepLink Client A' });
    const clientB = await createTestClient({ name: 'DeepLink Client B' });
    const clientBUser = await createTestUser({ username: 'scopedB', role: 'member' });
    await pool.query('UPDATE users SET client_id = $1 WHERE id = $2', [clientB.id, clientBUser.id]);
    const clientBToken = await mintSession(clientBUser.id);
    const task = await createTestTask({ client_id: clientA.id, title: 'Secret A task' });
    const res = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${clientBToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for admin accessing any task', async () => {
    const clientA = await createTestClient({ name: 'DeepLink Client A' });
    const admin = await createTestUser({ username: 'admin1', role: 'admin' });
    const adminToken = await mintSession(admin.id);
    const task = await createTestTask({ client_id: clientA.id, title: 'Admin visible task' });
    const res = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(task.id);
  });

  it('returns 200 for client user accessing own client task', async () => {
    const clientA = await createTestClient({ name: 'DeepLink Client A' });
    const clientAUser = await createTestUser({ username: 'scopedA', role: 'member' });
    await pool.query('UPDATE users SET client_id = $1 WHERE id = $2', [clientA.id, clientAUser.id]);
    const clientAToken = await mintSession(clientAUser.id);
    const task = await createTestTask({ client_id: clientA.id, title: 'Own client task' });
    const res = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${clientAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(task.id);
  });

  it('returns 404 for non-existent UUID', async () => {
    const admin = await createTestUser({ username: 'admin2', role: 'admin' });
    const adminToken = await mintSession(admin.id);
    const res = await request(app)
      .get('/api/tasks/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
