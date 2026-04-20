// dashboard-server/tests/unit/client-portal-middleware.test.mjs
//
// Baseline tests for auth middleware used by the client portal:
//   - requireAdmin: blocks non-admin users (403)
//   - requireNBI (renamed from requireInternal): blocks client-scoped users (403)

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('requireAdmin middleware', () => {
  it('admin can delete a task', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const task = await createTestTask({ title: 'To delete' });

    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('member cannot delete a task (403)', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    const task = await createTestTask({ title: 'Undeletable' });

    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('requireNBI (renamed from requireInternal)', () => {
  it('NBI member can access finance endpoint', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);

    const res = await request(app)
      .get('/api/finance')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).not.toBe(403);
  });

  it('client user gets 403 on finance endpoint', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .get('/api/finance')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('client user gets 403 on expense endpoint', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('requireAuth attaches client fields', () => {
  it('req.user includes clientRole for client users', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.clientRole).toBe('admin');
    expect(res.body.user.isNBI).toBe(false);
    expect(res.body.user.isClientAdmin).toBe(true);
  });

  it('req.user.isNBI is true for internal users', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.isNBI).toBe(true);
    expect(res.body.user.isClientAdmin).toBe(false);
  });

  it('login response includes clientRole and mustChangePassword', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientUser = await createTestUser({
      role: 'member', client_id: client.id, client_role: 'member', must_change_password: true
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: clientUser.username, password: clientUser.raw_password });
    expect(res.status).toBe(200);
    expect(res.body.user.clientRole).toBe('member');
    expect(res.body.user.mustChangePassword).toBe(true);
  });
});

describe('requireTaskAccess', () => {
  it('client user can access tasks belonging to their client', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);
    const task = await createTestTask({ title: 'My task', client_id: client.id });

    const res = await request(app)
      .get(`/api/tasks/${task.id}/comments`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('client user cannot access tasks belonging to another client (403)', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientUser = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);
    const taskB = await createTestTask({ title: 'Other task', client_id: clientB.id });

    const res = await request(app)
      .get(`/api/tasks/${taskB.id}/comments`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('NBI user can access any task regardless of client', async () => {
    const clientB = await createTestClient({ name: 'ClientB' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const taskB = await createTestTask({ title: 'Any task', client_id: clientB.id });

    const res = await request(app)
      .get(`/api/tasks/${taskB.id}/comments`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('requireTaskAccess walks parent chain to root', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientUser = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);

    const parent = await createTestTask({ title: 'Parent', client_id: clientB.id, item_type: 'project' });
    const child = await createTestTask({ title: 'Child', parent_id: parent.id, client_id: clientB.id, item_type: 'feature' });

    const res = await request(app)
      .get(`/api/tasks/${child.id}/comments`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
