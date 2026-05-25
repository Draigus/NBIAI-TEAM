// dashboard-server/tests/unit/client-nbi-contacts.test.mjs
//
// Tests for the client_nbi_contacts feature:
//   - GET  /api/clients/:id/nbi-contacts (admin only)
//   - POST /api/clients/:id/nbi-contacts (admin only, adds mapping)
//   - DELETE /api/clients/:id/nbi-contacts/:userId (admin only, removes mapping)
//   - GET /api/users scoping — client users see NBI contacts from DB table

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

/**
 * Common setup: one client, an NBI admin, two NBI staff (no client_id),
 * and a client member.
 */
async function setup() {
  const client = await createTestClient({ name: 'Test Client' });

  const admin = await createTestUser({ role: 'admin', display_name: 'NBI Admin' });
  const adminToken = await mintSession(admin.id);

  const nbiStaff1 = await createTestUser({ role: 'member', display_name: 'Glen Pryer' });
  const nbiStaff2 = await createTestUser({ role: 'member', display_name: 'Magnus Pryer' });

  const clientMember = await createTestUser({
    role: 'member', client_id: client.id, client_role: 'member',
    display_name: 'Client Member',
  });
  const clientMemberToken = await mintSession(clientMember.id);

  return { client, admin, adminToken, nbiStaff1, nbiStaff2, clientMember, clientMemberToken };
}

// ==================== GET /api/clients/:id/nbi-contacts ====================

describe('GET /api/clients/:id/nbi-contacts', () => {
  it('returns NBI contacts assigned to a client', async () => {
    const { client, admin, adminToken, nbiStaff1, nbiStaff2 } = await setup();

    // Seed two contacts
    await pool.query(
      'INSERT INTO client_nbi_contacts (client_id, user_id) VALUES ($1, $2), ($1, $3)',
      [client.id, nbiStaff1.id, nbiStaff2.id]
    );

    const res = await request(app)
      .get(`/api/clients/${client.id}/nbi-contacts`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    const names = res.body.map(u => u.display_name).sort();
    expect(names).toEqual(['Glen Pryer', 'Magnus Pryer']);
    // Each entry should have id, display_name, email
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('display_name');
    expect(res.body[0]).toHaveProperty('email');
  });

  it('returns empty array when no contacts assigned', async () => {
    const { client, adminToken } = await setup();

    const res = await request(app)
      .get(`/api/clients/${client.id}/nbi-contacts`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('non-admin gets 403', async () => {
    const { client, clientMemberToken } = await setup();

    const res = await request(app)
      .get(`/api/clients/${client.id}/nbi-contacts`)
      .set('Authorization', `Bearer ${clientMemberToken}`);

    expect(res.status).toBe(403);
  });
});

// ==================== POST /api/clients/:id/nbi-contacts ====================

describe('POST /api/clients/:id/nbi-contacts', () => {
  it('admin can add an NBI contact to a client', async () => {
    const { client, adminToken, nbiStaff1 } = await setup();

    const res = await request(app)
      .post(`/api/clients/${client.id}/nbi-contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ user_id: nbiStaff1.id });

    expect(res.status).toBe(201);
    expect(res.body.client_id).toBe(client.id);
    expect(res.body.user_id).toBe(nbiStaff1.id);

    // Verify in DB
    const { rows } = await pool.query(
      'SELECT * FROM client_nbi_contacts WHERE client_id = $1 AND user_id = $2',
      [client.id, nbiStaff1.id]
    );
    expect(rows.length).toBe(1);
  });

  it('returns 409 when contact already assigned', async () => {
    const { client, adminToken, nbiStaff1 } = await setup();

    // First insert
    await request(app)
      .post(`/api/clients/${client.id}/nbi-contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ user_id: nbiStaff1.id });

    // Duplicate
    const res = await request(app)
      .post(`/api/clients/${client.id}/nbi-contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ user_id: nbiStaff1.id });

    expect(res.status).toBe(409);
  });

  it('returns 400 for missing user_id', async () => {
    const { client, adminToken } = await setup();

    const res = await request(app)
      .post(`/api/clients/${client.id}/nbi-contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid user_id', async () => {
    const { client, adminToken } = await setup();

    const res = await request(app)
      .post(`/api/clients/${client.id}/nbi-contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ user_id: 'not-a-uuid' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for non-existent user_id (FK violation)', async () => {
    const { client, adminToken } = await setup();

    const res = await request(app)
      .post(`/api/clients/${client.id}/nbi-contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ user_id: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('non-admin gets 403', async () => {
    const { client, clientMemberToken, nbiStaff1 } = await setup();

    const res = await request(app)
      .post(`/api/clients/${client.id}/nbi-contacts`)
      .set('Authorization', `Bearer ${clientMemberToken}`)
      .send({ user_id: nbiStaff1.id });

    expect(res.status).toBe(403);
  });
});

// ==================== DELETE /api/clients/:id/nbi-contacts/:userId ====================

describe('DELETE /api/clients/:id/nbi-contacts/:userId', () => {
  it('admin can remove an NBI contact from a client', async () => {
    const { client, adminToken, nbiStaff1 } = await setup();

    // Seed
    await pool.query(
      'INSERT INTO client_nbi_contacts (client_id, user_id) VALUES ($1, $2)',
      [client.id, nbiStaff1.id]
    );

    const res = await request(app)
      .delete(`/api/clients/${client.id}/nbi-contacts/${nbiStaff1.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Verify gone from DB
    const { rows } = await pool.query(
      'SELECT * FROM client_nbi_contacts WHERE client_id = $1 AND user_id = $2',
      [client.id, nbiStaff1.id]
    );
    expect(rows.length).toBe(0);
  });

  it('returns 404 when mapping does not exist', async () => {
    const { client, adminToken, nbiStaff1 } = await setup();

    const res = await request(app)
      .delete(`/api/clients/${client.id}/nbi-contacts/${nbiStaff1.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('non-admin gets 403', async () => {
    const { client, clientMemberToken, nbiStaff1 } = await setup();

    const res = await request(app)
      .delete(`/api/clients/${client.id}/nbi-contacts/${nbiStaff1.id}`)
      .set('Authorization', `Bearer ${clientMemberToken}`);

    expect(res.status).toBe(403);
  });
});

// ==================== GET /api/users — client scoping via DB ====================

describe('GET /api/users — client sees NBI contacts from DB', () => {
  it('client user sees own staff plus assigned NBI contacts', async () => {
    const { client, clientMemberToken, clientMember, nbiStaff1, nbiStaff2 } = await setup();

    // Assign nbiStaff1 as a contact for this client
    await pool.query(
      'INSERT INTO client_nbi_contacts (client_id, user_id) VALUES ($1, $2)',
      [client.id, nbiStaff1.id]
    );

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${clientMemberToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.map(u => u.id);
    // Should include the client's own member
    expect(ids).toContain(clientMember.id);
    // Should include the assigned NBI contact
    expect(ids).toContain(nbiStaff1.id);
    // Should NOT include the unassigned NBI staff member
    expect(ids).not.toContain(nbiStaff2.id);
  });

  it('client user sees no NBI contacts when none assigned', async () => {
    const { clientMemberToken, clientMember, nbiStaff1, nbiStaff2 } = await setup();

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${clientMemberToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.map(u => u.id);
    // Only the client member themselves
    expect(ids).toContain(clientMember.id);
    expect(ids).not.toContain(nbiStaff1.id);
    expect(ids).not.toContain(nbiStaff2.id);
  });

  it('inactive NBI contacts are excluded', async () => {
    const { client, clientMemberToken, nbiStaff1 } = await setup();

    // Assign and then deactivate
    await pool.query(
      'INSERT INTO client_nbi_contacts (client_id, user_id) VALUES ($1, $2)',
      [client.id, nbiStaff1.id]
    );
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [nbiStaff1.id]);

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${clientMemberToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.map(u => u.id);
    expect(ids).not.toContain(nbiStaff1.id);
  });
});
