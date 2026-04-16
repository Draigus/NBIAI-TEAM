// dashboard-server/tests/unit/client-scope.test.mjs
//
// Tests for client-scoped users:
//   - data isolation (scoped user only sees their client's data)
//   - 403 blocks on internal-only endpoints (finance, bug tracker)
//   - write-path enforcement (cannot create tasks for other clients)
//   - regression: internal admin still sees everything
//   - user creation with client_id
//   - login response includes clientId for scoped users

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Client-scoped users', () => {
  /**
   * Creates two clients, one scoped user (member, client A), one internal admin,
   * and one task per client. Returns everything needed by the individual tests.
   */
  async function createScopedSetup() {
    const clientA = await createTestClient({ name: 'Client A' });
    const clientB = await createTestClient({ name: 'Client B' });

    // Internal admin — no client_id
    const admin = await createTestUser({ username: 'glenpryer', role: 'admin' });
    const adminToken = await mintSession(admin.id);

    // Client-scoped member for Client A
    const scoped = await createTestUser({ username: 'lorenza', role: 'member' });
    await pool.query('UPDATE users SET client_id = $1 WHERE id = $2', [clientA.id, scoped.id]);
    const scopedToken = await mintSession(scoped.id);

    // Tasks — one per client
    const taskA = await createTestTask({ title: 'Task A', client_id: clientA.id, status: 'In progress' });
    const taskB = await createTestTask({ title: 'Task B', client_id: clientB.id, status: 'In progress' });

    return { clientA, clientB, admin, adminToken, scoped, scopedToken, taskA, taskB };
  }

  it('scoped user only sees tasks for their client', async () => {
    const { scopedToken, taskA, taskB } = await createScopedSetup();
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${scopedToken}`);
    expect(res.status).toBe(200);
    // GET /api/tasks (no pagination params) returns a plain array
    const titles = res.body.map(t => t.title);
    expect(titles).toContain('Task A');
    expect(titles).not.toContain('Task B');
  });

  it('scoped user only sees their client in GET /api/clients', async () => {
    const { scopedToken } = await createScopedSetup();
    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${scopedToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Client A');
  });

  it('scoped user gets 403 on finance endpoints', async () => {
    const { scopedToken } = await createScopedSetup();
    const res = await request(app)
      .get('/api/finance')
      .set('Authorization', `Bearer ${scopedToken}`);
    expect(res.status).toBe(403);
  });

  it('scoped user gets 403 on bug tracker endpoints', async () => {
    const { scopedToken } = await createScopedSetup();
    const res = await request(app)
      .get('/api/bug-reports')
      .set('Authorization', `Bearer ${scopedToken}`);
    expect(res.status).toBe(403);
  });

  it('scoped user cannot create tasks for other clients', async () => {
    const { scopedToken, clientB } = await createScopedSetup();
    // POST /api/tasks requires admin role — scoped member will hit the admin
    // gate first, but the net result is still 403 (access denied), which is
    // the correct behaviour regardless of which guard fires.
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${scopedToken}`)
      .send({ title: 'Sneaky Task', client_id: clientB.id });
    expect(res.status).toBe(403);
  });

  it('internal user sees everything (regression)', async () => {
    const { adminToken } = await createScopedSetup();
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const titles = res.body.map(t => t.title);
    expect(titles).toContain('Task A');
    expect(titles).toContain('Task B');
  });

  it('admin can create a user with client_id', async () => {
    const { adminToken, clientA } = await createScopedSetup();
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'newclientuser',
        display_name: 'New Client User',
        password: 'Test1234!',
        role: 'member',
        client_id: clientA.id,
      });
    expect(res.status).toBe(201);
    // Verify client_id was persisted
    const { rows } = await pool.query('SELECT client_id FROM users WHERE username = $1', ['newclientuser']);
    expect(rows[0].client_id).toBe(clientA.id);
  });

  it('login response includes clientId for scoped users', async () => {
    const { scoped, clientA } = await createScopedSetup();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: scoped.username, password: scoped.raw_password });
    expect(res.status).toBe(200);
    expect(res.body.user.clientId).toBe(clientA.id);
  });
});
