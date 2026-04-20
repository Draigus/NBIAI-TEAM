// dashboard-server/tests/unit/client-portal-isolation.test.mjs
//
// Tests for client-scoped bug report isolation and attachment auth:
//   - client user can submit bug reports (tagged with source + reporter_client_id)
//   - client user only sees their company's bug reports
//   - admin still sees all bug reports (regression)
//   - attachment endpoints are protected by global requireAuth (401 without token)

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestBugReport } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Bug reports — client scoping', () => {
  it('client user can submit a bug report', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Something broken', type: 'bug', description: 'Details here' });
    expect(res.status).toBe(201);
    expect(res.body.source).toBe('client');
    expect(res.body.reporter_client_id).toBe(client.id);
  });

  it('client user only sees their company bug reports', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const admin = await createTestUser({ role: 'admin' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const userB = await createTestUser({ role: 'member', client_id: clientB.id, client_role: 'member' });

    await createTestBugReport({ user_id: admin.id, title: 'Internal bug' });
    // source defaults to 'internal', reporter_client_id defaults to null

    await createTestBugReport({ user_id: userA.id, title: 'ClientA bug' });
    await pool.query('UPDATE bug_reports SET source = $1, reporter_client_id = $2 WHERE title = $3', ['client', clientA.id, 'ClientA bug']);

    await createTestBugReport({ user_id: userB.id, title: 'ClientB bug' });
    await pool.query('UPDATE bug_reports SET source = $1, reporter_client_id = $2 WHERE title = $3', ['client', clientB.id, 'ClientB bug']);

    const tokenA = await mintSession(userA.id);
    const res = await request(app)
      .get('/api/bug-reports')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const titles = res.body.reports.map(r => r.title);
    expect(titles).toContain('ClientA bug');
    expect(titles).not.toContain('ClientB bug');
    expect(titles).not.toContain('Internal bug');
  });

  it('admin still sees all bug reports (regression)', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const admin = await createTestUser({ role: 'admin' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });

    await createTestBugReport({ user_id: admin.id, title: 'Admin bug' });
    await createTestBugReport({ user_id: clientUser.id, title: 'Client bug' });
    await pool.query('UPDATE bug_reports SET source = $1, reporter_client_id = $2 WHERE title = $3', ['client', client.id, 'Client bug']);

    const token = await mintSession(admin.id);
    const res = await request(app)
      .get('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.reports.length).toBeGreaterThanOrEqual(2);
  });

  it('client user can only PATCH their own company bug reports', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const userB = await createTestUser({ role: 'member', client_id: clientB.id, client_role: 'member' });

    const bugB = await createTestBugReport({ user_id: userB.id, title: 'ClientB bug' });
    await pool.query('UPDATE bug_reports SET source = $1, reporter_client_id = $2 WHERE id = $3', ['client', clientB.id, bugB.id]);

    const tokenA = await mintSession(userA.id);
    const res = await request(app)
      .patch(`/api/bug-reports/${bugB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Hijacked' });
    expect(res.status).toBe(403);
  });

  it('client user can access comments on their own company bug reports', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });

    const bug = await createTestBugReport({ user_id: userA.id, title: 'ClientA bug' });
    await pool.query('UPDATE bug_reports SET source = $1, reporter_client_id = $2 WHERE id = $3', ['client', clientA.id, bug.id]);

    const tokenA = await mintSession(userA.id);
    const res = await request(app)
      .get(`/api/bug-reports/${bug.id}/comments`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
  });

  it('client user cannot access comments on another company bug report', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const userB = await createTestUser({ role: 'member', client_id: clientB.id, client_role: 'member' });

    const bugB = await createTestBugReport({ user_id: userB.id, title: 'ClientB bug' });
    await pool.query('UPDATE bug_reports SET source = $1, reporter_client_id = $2 WHERE id = $3', ['client', clientB.id, bugB.id]);

    const tokenA = await mintSession(userA.id);
    const res = await request(app)
      .get(`/api/bug-reports/${bugB.id}/comments`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(403);
  });
});

describe('Attachment endpoints — auth verification', () => {
  it('unauthenticated request to GET /api/attachments/test.txt returns 401', async () => {
    const res = await request(app).get('/api/attachments/test.txt');
    expect(res.status).toBe(401);
  });

  it('unauthenticated request to GET /api/attachments/download/test.txt returns 401', async () => {
    const res = await request(app).get('/api/attachments/download/test.txt');
    expect(res.status).toBe(401);
  });
});
