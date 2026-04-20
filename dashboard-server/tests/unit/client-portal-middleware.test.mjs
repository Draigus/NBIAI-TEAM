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
