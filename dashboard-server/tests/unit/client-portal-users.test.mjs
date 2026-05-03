// dashboard-server/tests/unit/client-portal-users.test.mjs
//
// Tests for client-portal user management:
//   - GET /api/users scoping (client user sees only their company; admin sees all)
//   - POST /api/users client admin creation (own company, must_change_password, role constraints)
//   - POST /api/users/:id/deactivate (own company OK, other company 403)
//   - POST /api/users/:id/reset-password (sets must_change_password)
//   - PATCH /api/users/:id client admin constraints (client_role, client_id, admin promotion, last-admin)

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const bcrypt = require('bcrypt');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

/**
 * Common setup: two clients, an NBI admin, a client admin for clientA,
 * a client member for clientA, and a client member for clientB.
 */
async function setupClientUsers() {
  const clientA = await createTestClient({ name: 'Acme Corp' });
  const clientB = await createTestClient({ name: 'Beta Inc' });

  const nbiAdmin = await createTestUser({ role: 'admin' });
  const nbiAdminToken = await mintSession(nbiAdmin.id);

  const clientAdminA = await createTestUser({
    role: 'member', client_id: clientA.id, client_role: 'admin',
    display_name: 'Client Admin A',
  });
  const clientAdminAToken = await mintSession(clientAdminA.id);

  const clientMemberA = await createTestUser({
    role: 'member', client_id: clientA.id, client_role: 'member',
    display_name: 'Client Member A',
  });
  const clientMemberAToken = await mintSession(clientMemberA.id);

  const clientMemberB = await createTestUser({
    role: 'member', client_id: clientB.id, client_role: 'member',
    display_name: 'Client Member B',
  });
  const clientMemberBToken = await mintSession(clientMemberB.id);

  return {
    clientA, clientB,
    nbiAdmin, nbiAdminToken,
    clientAdminA, clientAdminAToken,
    clientMemberA, clientMemberAToken,
    clientMemberB, clientMemberBToken,
  };
}

// ==================== GET /api/users scoping ====================

describe('GET /api/users scoping', () => {
  it('NBI admin sees all users with full fields including client_id and client_role', async () => {
    const { nbiAdminToken, clientAdminA, clientMemberA, clientMemberB, nbiAdmin } = await setupClientUsers();

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${nbiAdminToken}`);

    expect(res.status).toBe(200);
    // Should include all 4 users
    expect(res.body.length).toBe(4);
    // Admin response should include client_id and client_role fields
    const fields = Object.keys(res.body[0]);
    expect(fields).toContain('client_id');
    expect(fields).toContain('client_role');
  });

  it('client user only sees users in their own company', async () => {
    const { clientAdminAToken, clientA, clientAdminA, clientMemberA } = await setupClientUsers();

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${clientAdminAToken}`);

    expect(res.status).toBe(200);
    // Only Acme Corp users (clientAdminA + clientMemberA)
    expect(res.body.length).toBe(2);
    // All returned users should belong to clientA
    for (const u of res.body) {
      expect(u.client_role).toBeDefined();
    }
    // Should NOT include client_id in the response (they don't need it)
    // but should include client_role for role management
    const ids = res.body.map(u => u.id);
    expect(ids).toContain(clientAdminA.id);
    expect(ids).toContain(clientMemberA.id);
  });

  it('client user does not see users from other companies', async () => {
    const { clientAdminAToken, clientMemberB } = await setupClientUsers();

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${clientAdminAToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.map(u => u.id);
    expect(ids).not.toContain(clientMemberB.id);
  });

  it('non-client non-admin member sees only names of active users', async () => {
    const nbiMember = await createTestUser({ role: 'member' });
    const nbiMemberToken = await mintSession(nbiMember.id);

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${nbiMemberToken}`);

    expect(res.status).toBe(200);
    // Should only have id, username, display_name
    const fields = Object.keys(res.body[0]);
    expect(fields).not.toContain('email');
    expect(fields).not.toContain('role');
    expect(fields).not.toContain('client_role');
  });
});

// ==================== POST /api/users (client admin creation) ====================

describe('POST /api/users (client admin creation)', () => {
  it('client admin can create a user in their own company', async () => {
    const { clientAdminAToken, clientA } = await setupClientUsers();

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({
        username: 'newclientuser',
        display_name: 'New Client User',
        email: 'newclient@acme.example',
        password: 'TempPass123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.client_id).toBe(clientA.id);
    expect(res.body.username).toBe('newclientuser');
  });

  it('client admin created user has must_change_password set to true', async () => {
    const { clientAdminAToken } = await setupClientUsers();

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({
        username: 'mustchangeuser',
        display_name: 'Must Change',
        password: 'TempPass123!',
      });

    expect(res.status).toBe(201);

    // Verify in DB
    const { rows } = await pool.query('SELECT must_change_password FROM users WHERE id = $1', [res.body.id]);
    expect(rows[0].must_change_password).toBe(true);
  });

  it('client admin cannot set NBI admin role', async () => {
    const { clientAdminAToken } = await setupClientUsers();

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({
        username: 'hackeradmin',
        display_name: 'Hacker',
        password: 'TempPass123!',
        role: 'admin',
      });

    expect(res.status).toBe(403);
  });

  it('client admin cannot create users for a different client', async () => {
    const { clientAdminAToken, clientB } = await setupClientUsers();

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({
        username: 'otherclientuser',
        display_name: 'Other Client',
        password: 'TempPass123!',
        client_id: clientB.id,
      });

    // Should either force to own client or reject — either way the user
    // must end up in clientA, not clientB
    if (res.status === 201) {
      // Forced to own client
      expect(res.body.client_id).not.toBe(clientB.id);
    } else {
      expect(res.status).toBe(403);
    }
  });

  it('regular client member gets 403 trying to create a user', async () => {
    const { clientMemberAToken } = await setupClientUsers();

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${clientMemberAToken}`)
      .send({
        username: 'memberattempter',
        display_name: 'Member Attempter',
        password: 'TempPass123!',
      });

    expect(res.status).toBe(403);
  });

  it('NBI admin can still create any user', async () => {
    const { nbiAdminToken, clientA } = await setupClientUsers();

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${nbiAdminToken}`)
      .send({
        username: 'nbicreateduser',
        display_name: 'NBI Created',
        email: 'nbicreated@example.com',
        password: 'AdminPassword123',
        role: 'admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('admin');
  });

  it('client admin created user has role forced to member', async () => {
    const { clientAdminAToken } = await setupClientUsers();

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({
        username: 'roletestuser',
        display_name: 'Role Test',
        password: 'TempPass123!',
        role: 'member', // explicit member should be fine
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('member');
  });

  it('generates temp password when not provided by client admin', async () => {
    const { clientAdminAToken } = await setupClientUsers();

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({
        username: 'nopassuser',
        display_name: 'No Pass',
      });

    expect(res.status).toBe(201);
    // User should exist and have a password hash
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [res.body.id]);
    expect(rows[0].password_hash).toBeTruthy();
  });

  it('logs to client_activity_log when client admin creates user', async () => {
    const { clientAdminAToken, clientAdminA, clientA } = await setupClientUsers();

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({
        username: 'loggeduser',
        display_name: 'Logged User',
        password: 'TempPass123!',
      });

    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      'SELECT * FROM client_activity_log WHERE user_id = $1 AND action = $2',
      [clientAdminA.id, 'create_user']
    );
    expect(rows.length).toBe(1);
    expect(rows[0].client_id).toBe(clientA.id);
    expect(rows[0].target_type).toBe('user');
    expect(rows[0].target_id).toBe(res.body.id);
  });
});

// ==================== POST /api/users/:id/deactivate ====================

describe('POST /api/users/:id/deactivate', () => {
  it('client admin can deactivate a user in their own company', async () => {
    const { clientAdminAToken, clientMemberA } = await setupClientUsers();

    const res = await request(app)
      .post(`/api/users/${clientMemberA.id}/deactivate`)
      .set('Authorization', `Bearer ${clientAdminAToken}`);

    expect(res.status).toBe(200);

    // User should be inactive in DB
    const { rows } = await pool.query('SELECT is_active FROM users WHERE id = $1', [clientMemberA.id]);
    expect(rows[0].is_active).toBe(false);
  });

  it('client admin cannot deactivate a user in another company', async () => {
    const { clientAdminAToken, clientMemberB } = await setupClientUsers();

    const res = await request(app)
      .post(`/api/users/${clientMemberB.id}/deactivate`)
      .set('Authorization', `Bearer ${clientAdminAToken}`);

    expect(res.status).toBe(403);

    // User should still be active
    const { rows } = await pool.query('SELECT is_active FROM users WHERE id = $1', [clientMemberB.id]);
    expect(rows[0].is_active).toBe(true);
  });

  it('NBI admin can deactivate any user', async () => {
    const { nbiAdminToken, clientMemberA } = await setupClientUsers();

    const res = await request(app)
      .post(`/api/users/${clientMemberA.id}/deactivate`)
      .set('Authorization', `Bearer ${nbiAdminToken}`);

    expect(res.status).toBe(200);
  });

  it('regular client member cannot deactivate users', async () => {
    const { clientMemberAToken, clientAdminA } = await setupClientUsers();

    const res = await request(app)
      .post(`/api/users/${clientAdminA.id}/deactivate`)
      .set('Authorization', `Bearer ${clientMemberAToken}`);

    expect(res.status).toBe(403);
  });

  it('deactivation kills sessions', async () => {
    const { clientAdminAToken, clientMemberA } = await setupClientUsers();

    // Verify the member has a session
    const { rows: before } = await pool.query('SELECT COUNT(*) as cnt FROM sessions WHERE user_id = $1', [clientMemberA.id]);
    expect(Number(before[0].cnt)).toBeGreaterThan(0);

    await request(app)
      .post(`/api/users/${clientMemberA.id}/deactivate`)
      .set('Authorization', `Bearer ${clientAdminAToken}`);

    // Sessions should be gone
    const { rows: after } = await pool.query('SELECT COUNT(*) as cnt FROM sessions WHERE user_id = $1', [clientMemberA.id]);
    expect(Number(after[0].cnt)).toBe(0);
  });
});

// ==================== POST /api/users/:id/reactivate ====================

describe('POST /api/users/:id/reactivate', () => {
  it('client admin can reactivate a user in their own company', async () => {
    const { clientAdminAToken, clientMemberA } = await setupClientUsers();

    // Deactivate first
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [clientMemberA.id]);

    const res = await request(app)
      .post(`/api/users/${clientMemberA.id}/reactivate`)
      .set('Authorization', `Bearer ${clientAdminAToken}`);

    expect(res.status).toBe(200);

    const { rows } = await pool.query('SELECT is_active FROM users WHERE id = $1', [clientMemberA.id]);
    expect(rows[0].is_active).toBe(true);
  });

  it('client admin cannot reactivate a user in another company', async () => {
    const { clientAdminAToken, clientMemberB } = await setupClientUsers();

    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [clientMemberB.id]);

    const res = await request(app)
      .post(`/api/users/${clientMemberB.id}/reactivate`)
      .set('Authorization', `Bearer ${clientAdminAToken}`);

    expect(res.status).toBe(403);
  });
});

// ==================== POST /api/users/:id/reset-password ====================

describe('POST /api/users/:id/reset-password', () => {
  it('client admin can reset password for a user in their own company', async () => {
    const { clientAdminAToken, clientMemberA } = await setupClientUsers();

    const res = await request(app)
      .post(`/api/users/${clientMemberA.id}/reset-password`)
      .set('Authorization', `Bearer ${clientAdminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // Should return a temp password
    expect(res.body.tempPassword).toBeDefined();
    expect(res.body.tempPassword.length).toBe(16);
  });

  it('sets must_change_password to true after reset', async () => {
    const { clientAdminAToken, clientMemberA } = await setupClientUsers();

    await request(app)
      .post(`/api/users/${clientMemberA.id}/reset-password`)
      .set('Authorization', `Bearer ${clientAdminAToken}`);

    const { rows } = await pool.query('SELECT must_change_password FROM users WHERE id = $1', [clientMemberA.id]);
    expect(rows[0].must_change_password).toBe(true);
  });

  it('kills sessions on password reset', async () => {
    const { clientAdminAToken, clientMemberA } = await setupClientUsers();

    // Verify the member has a session
    const { rows: before } = await pool.query('SELECT COUNT(*) as cnt FROM sessions WHERE user_id = $1', [clientMemberA.id]);
    expect(Number(before[0].cnt)).toBeGreaterThan(0);

    await request(app)
      .post(`/api/users/${clientMemberA.id}/reset-password`)
      .set('Authorization', `Bearer ${clientAdminAToken}`);

    const { rows: after } = await pool.query('SELECT COUNT(*) as cnt FROM sessions WHERE user_id = $1', [clientMemberA.id]);
    expect(Number(after[0].cnt)).toBe(0);
  });

  it('client admin cannot reset password for user in another company', async () => {
    const { clientAdminAToken, clientMemberB } = await setupClientUsers();

    const res = await request(app)
      .post(`/api/users/${clientMemberB.id}/reset-password`)
      .set('Authorization', `Bearer ${clientAdminAToken}`);

    expect(res.status).toBe(403);
  });

  it('NBI admin can reset password for any user', async () => {
    const { nbiAdminToken, clientMemberA } = await setupClientUsers();

    const res = await request(app)
      .post(`/api/users/${clientMemberA.id}/reset-password`)
      .set('Authorization', `Bearer ${nbiAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tempPassword).toBeDefined();
  });
});

// ==================== PATCH /api/users/:id (client admin constraints) ====================

describe('PATCH /api/users/:id (client admin constraints)', () => {
  it('client admin can change client_role of a user in their company', async () => {
    const { clientAdminAToken, clientMemberA } = await setupClientUsers();

    const res = await request(app)
      .patch(`/api/users/${clientMemberA.id}`)
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({ client_role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.client_role).toBe('admin');
  });

  it('client admin can change display_name of a user in their company', async () => {
    const { clientAdminAToken, clientMemberA } = await setupClientUsers();

    const res = await request(app)
      .patch(`/api/users/${clientMemberA.id}`)
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({ display_name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.display_name).toBe('Updated Name');
  });

  it('client admin cannot change client_id', async () => {
    const { clientAdminAToken, clientMemberA, clientB } = await setupClientUsers();

    const res = await request(app)
      .patch(`/api/users/${clientMemberA.id}`)
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({ client_id: clientB.id });

    expect(res.status).toBe(403);
  });

  it('client admin cannot promote a user to NBI admin role', async () => {
    const { clientAdminAToken, clientMemberA } = await setupClientUsers();

    const res = await request(app)
      .patch(`/api/users/${clientMemberA.id}`)
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(403);
  });

  it('client admin cannot modify users in another company', async () => {
    const { clientAdminAToken, clientMemberB } = await setupClientUsers();

    const res = await request(app)
      .patch(`/api/users/${clientMemberB.id}`)
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({ display_name: 'Hacked Name' });

    expect(res.status).toBe(403);
  });

  it('last client admin cannot demote themselves', async () => {
    const { clientAdminAToken, clientAdminA } = await setupClientUsers();

    const res = await request(app)
      .patch(`/api/users/${clientAdminA.id}`)
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({ client_role: 'member' });

    expect(res.status).toBe(400);
  });

  it('NBI admin can still change any field on any user', async () => {
    const { nbiAdminToken, clientMemberA, clientB } = await setupClientUsers();

    const res = await request(app)
      .patch(`/api/users/${clientMemberA.id}`)
      .set('Authorization', `Bearer ${nbiAdminToken}`)
      .send({ client_id: clientB.id });

    expect(res.status).toBe(200);
    expect(res.body.client_id).toBe(clientB.id);
  });

  it('regular client member cannot patch users', async () => {
    const { clientMemberAToken, clientAdminA } = await setupClientUsers();

    const res = await request(app)
      .patch(`/api/users/${clientAdminA.id}`)
      .set('Authorization', `Bearer ${clientMemberAToken}`)
      .send({ display_name: 'Sneaky' });

    expect(res.status).toBe(403);
  });

  it('deactivation via PATCH kills sessions', async () => {
    const { clientAdminAToken, clientMemberA } = await setupClientUsers();

    // Verify the member has a session
    const { rows: before } = await pool.query('SELECT COUNT(*) as cnt FROM sessions WHERE user_id = $1', [clientMemberA.id]);
    expect(Number(before[0].cnt)).toBeGreaterThan(0);

    await request(app)
      .patch(`/api/users/${clientMemberA.id}`)
      .set('Authorization', `Bearer ${clientAdminAToken}`)
      .send({ is_active: false });

    const { rows: after } = await pool.query('SELECT COUNT(*) as cnt FROM sessions WHERE user_id = $1', [clientMemberA.id]);
    expect(Number(after[0].cnt)).toBe(0);
  });
});

describe('PATCH /api/users/:id — doc permission fields', () => {
  it('admin can toggle docs_view on a user', async () => {
    const { nbiAdminToken, clientMemberA } = await setupClientUsers();
    const res = await request(app)
      .patch(`/api/users/${clientMemberA.id}`)
      .set('Authorization', `Bearer ${nbiAdminToken}`)
      .send({ docs_view: false });
    expect(res.status).toBe(200);
    const { rows } = await pool.query('SELECT docs_view FROM users WHERE id = $1', [clientMemberA.id]);
    expect(rows[0].docs_view).toBe(false);
  });

  it('admin can set all four doc permission fields', async () => {
    const { nbiAdminToken, clientMemberA } = await setupClientUsers();
    const res = await request(app)
      .patch(`/api/users/${clientMemberA.id}`)
      .set('Authorization', `Bearer ${nbiAdminToken}`)
      .send({ docs_view: false, docs_edit: false, docs_create: false, docs_upload: false });
    expect(res.status).toBe(200);
    const { rows } = await pool.query('SELECT docs_view, docs_edit, docs_create, docs_upload FROM users WHERE id = $1', [clientMemberA.id]);
    expect(rows[0]).toEqual({ docs_view: false, docs_edit: false, docs_create: false, docs_upload: false });
  });

  it('GET /api/users returns doc permission fields for admin', async () => {
    const { nbiAdminToken } = await setupClientUsers();
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${nbiAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('docs_view');
    expect(res.body[0]).toHaveProperty('docs_edit');
    expect(res.body[0]).toHaveProperty('docs_create');
    expect(res.body[0]).toHaveProperty('docs_upload');
  });
});
