// dashboard-server/tests/unit/bugs.test.mjs
//
// Tests for GET /api/bug-reports/:id — single bug report fetch for deep-linking.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient } = require('../helpers/fixtures.js');
const app = require('../../server.js');

async function createBugReport(userId, opts = {}) {
  const { rows } = await pool.query(
    `INSERT INTO bug_reports (user_id, type, title, description, status, reporter_client_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, opts.type || 'bug', opts.title || 'Test bug', opts.description || null, opts.status || 'open', opts.reporter_client_id || null]
  );
  return rows[0];
}

beforeEach(async () => { await truncate(); });

describe('GET /api/bug-reports/:id', () => {
  it('returns the bug report for admin', async () => {
    const admin = await createTestUser({ username: 'bugadmin', role: 'admin' });
    const adminToken = await mintSession(admin.id);
    const bug = await createBugReport(admin.id, { title: 'Admin bug' });
    const res = await request(app)
      .get(`/api/bug-reports/${bug.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(bug.id);
    expect(res.body.title).toBe('Admin bug');
  });

  it('returns 404 for missing UUID', async () => {
    const admin = await createTestUser({ username: 'bugadmin2', role: 'admin' });
    const adminToken = await mintSession(admin.id);
    const res = await request(app)
      .get('/api/bug-reports/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID', async () => {
    const admin = await createTestUser({ username: 'bugadmin3', role: 'admin' });
    const adminToken = await mintSession(admin.id);
    const res = await request(app)
      .get('/api/bug-reports/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('client user can see own client bug', async () => {
    const client = await createTestClient({ name: 'Bug Client A' });
    const user = await createTestUser({ username: 'bugclient', role: 'member' });
    await pool.query('UPDATE users SET client_id = $1 WHERE id = $2', [client.id, user.id]);
    const token = await mintSession(user.id);
    const bug = await createBugReport(user.id, { title: 'Client bug', reporter_client_id: client.id });
    const res = await request(app)
      .get(`/api/bug-reports/${bug.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(bug.id);
  });

  it('client user cannot see other client bug', async () => {
    const clientA = await createTestClient({ name: 'Bug Client A' });
    const clientB = await createTestClient({ name: 'Bug Client B' });
    const adminUser = await createTestUser({ username: 'bugmaker', role: 'admin' });
    const scopedUser = await createTestUser({ username: 'bugscopedB', role: 'member' });
    await pool.query('UPDATE users SET client_id = $1 WHERE id = $2', [clientB.id, scopedUser.id]);
    const scopedToken = await mintSession(scopedUser.id);
    const bug = await createBugReport(adminUser.id, { title: 'Secret bug', reporter_client_id: clientA.id });
    const res = await request(app)
      .get(`/api/bug-reports/${bug.id}`)
      .set('Authorization', `Bearer ${scopedToken}`);
    expect(res.status).toBe(404);
  });
});
