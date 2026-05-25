// dashboard-server/tests/unit/client-scope.test.mjs
//
// Tests for client-scoped users:
//   - data isolation (scoped user only sees their client's data)
//   - 403 blocks on internal-only endpoints (finance, leads)
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
const { createTestUser, createTestClient, createTestTask, createTestLead, createTestLeadStage } = require('../helpers/fixtures.js');
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

  it('internal user with no team gets empty scope (not unrestricted)', async () => {
    const clientA = await createTestClient({ name: 'Client A' });
    const clientB = await createTestClient({ name: 'Client B' });

    const noTeam = await createTestUser({ username: 'orphan', role: 'member' });
    const noTeamToken = await mintSession(noTeam.id);

    await createTestTask({ title: 'Task A', client_id: clientA.id });
    await createTestTask({ title: 'Task B', client_id: clientB.id });

    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${noTeamToken}`);
    expect(res.status).toBe(200);
    const titles = res.body.map(t => t.title);
    expect(titles).not.toContain('Task A');
    expect(titles).not.toContain('Task B');
  });

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

  it('scoped user can access bug reports (own company only)', async () => {
    const { scopedToken } = await createScopedSetup();
    const res = await request(app)
      .get('/api/bug-reports')
      .set('Authorization', `Bearer ${scopedToken}`);
    expect(res.status).toBe(200);
  });

  it('scoped user cannot create tasks for other clients', async () => {
    const { scopedToken, clientB } = await createScopedSetup();
    // Client scoping guard rejects any attempt to create a task for a client
    // the user does not belong to, returning 403.
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
        password: 'TestClient1234!',
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

  it('scoped user only sees whitelisted settings from GET /api/settings', async () => {
    const { adminToken, scopedToken } = await createScopedSetup();

    await pool.query("INSERT INTO settings (key, value) VALUES ('expense_approver', '\"tom\"') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value");
    await pool.query("INSERT INTO settings (key, value) VALUES ('currency', '\"GBP\"') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value");

    const adminRes = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body).toHaveProperty('expense_approver');
    expect(adminRes.body).toHaveProperty('currency');

    const scopedRes = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${scopedToken}`);
    expect(scopedRes.status).toBe(200);
    expect(scopedRes.body).not.toHaveProperty('expense_approver');
    expect(scopedRes.body).toHaveProperty('currency');
  });

  it('scoped user gets 403 on leads endpoints', async () => {
    const { scopedToken } = await createScopedSetup();
    const res = await request(app)
      .get('/api/leads/pipeline/summary')
      .set('Authorization', `Bearer ${scopedToken}`);
    expect(res.status).toBe(403);
  });

  it('dashboard summary is scoped for external users', async () => {
    const { scopedToken } = await createScopedSetup();
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${scopedToken}`);
    expect(res.status).toBe(200);
    const clientNames = res.body.by_client.map(c => c.name);
    expect(clientNames).not.toContain('Client B');
  });

});

describe('Client portal — task endpoint changes', () => {
  it('client user can create tasks via POST /api/tasks within their scope', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientUser = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Client task', item_type: 'project' });
    expect(res.status).toBe(201);
    expect(res.body.client_id).toBe(clientA.id);
  });

  it('client user cannot create tasks for another client', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientUser = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Sneaky', item_type: 'project', client_id: clientB.id });
    expect(res.status).toBe(403);
  });

  it('client user cannot change client_id on a task via PATCH', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientUser = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);
    const task = await createTestTask({ title: 'My task', client_id: clientA.id });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ client_id: clientB.id });
    // Field was stripped — verify client_id didn't change.
    // 200 = field silently stripped; 400 = body was empty after strip; 403 = access denied.
    // All three mean the mutation was blocked.
    if (res.status === 200) {
      const { rows } = await pool.query('SELECT client_id FROM tasks WHERE id = $1', [task.id]);
      expect(rows[0].client_id).toBe(clientA.id);
    } else {
      expect([400, 403]).toContain(res.status);
    }
  });

  it('admin can still change client_id on a task (regression)', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const task = await createTestTask({ title: 'Admin task', client_id: clientA.id });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ client_id: clientB.id });
    expect(res.status).toBe(200);
  });
});
