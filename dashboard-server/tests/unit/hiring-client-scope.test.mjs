// dashboard-server/tests/unit/hiring-client-scope.test.mjs
//
// Tests for hiring endpoint client scoping:
//   - client user sees only their own candidates
//   - client user cannot see another client's candidates
//   - client user can create candidates (auto-scoped to their client)
//   - client user can update their own candidates
//   - client user cannot update another client's candidates
//   - NBI user sees all candidates
//   - NBI user can filter by client_id query param

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestCandidate } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Hiring — client scoping', () => {
  it('client user only sees candidates for their own client', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });

    await createTestCandidate({ name: 'Alice', client_id: clientA.id });
    await createTestCandidate({ name: 'Bob', client_id: clientB.id });
    await createTestCandidate({ name: 'Charlie' }); // no client

    const token = await mintSession(userA.id);
    const res = await request(app)
      .get('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Alice');
  });

  it('client user cannot override scope with client_id query param', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });

    await createTestCandidate({ name: 'Bob', client_id: clientB.id });

    const token = await mintSession(userA.id);
    const res = await request(app)
      .get(`/api/candidates?client_id=${clientB.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('client user cannot view another client\'s candidate by ID', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });

    const bob = await createTestCandidate({ name: 'Bob', client_id: clientB.id });

    const token = await mintSession(userA.id);
    await request(app)
      .get(`/api/candidates/${bob.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(403);
  });

  it('client user can create a candidate (auto-scoped to their client)', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });

    const token = await mintSession(userA.id);
    const res = await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'New Hire', role: 'Engineer' })
      .expect(201);

    expect(res.body.client_id).toBe(clientA.id);
  });

  it('client user cannot create a candidate for another client', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });

    const token = await mintSession(userA.id);
    await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Sneaky', client_id: clientB.id })
      .expect(403);
  });

  it('client user can update their own candidate', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const cand = await createTestCandidate({ name: 'Alice', client_id: clientA.id });

    const token = await mintSession(userA.id);
    const res = await request(app)
      .patch(`/api/candidates/${cand.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ role: 'Senior Engineer' })
      .expect(200);

    expect(res.body.role).toBe('Senior Engineer');
  });

  it('client user can drag a candidate to a new stage', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const cand = await createTestCandidate({ name: 'Alice', client_id: clientA.id, stage: 'sourcing' });

    const token = await mintSession(userA.id);
    const res = await request(app)
      .patch(`/api/candidates/${cand.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'interviews', position: 0 })
      .expect(200);

    expect(res.body.stage).toBe('interviews');
  });

  it('client user cannot update another client\'s candidate', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const bob = await createTestCandidate({ name: 'Bob', client_id: clientB.id });

    const token = await mintSession(userA.id);
    await request(app)
      .patch(`/api/candidates/${bob.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ role: 'Hacked' })
      .expect(403);
  });

  it('client user cannot reassign candidate to another client', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const cand = await createTestCandidate({ name: 'Alice', client_id: clientA.id });

    const token = await mintSession(userA.id);
    await request(app)
      .patch(`/api/candidates/${cand.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ client_id: clientB.id })
      .expect(403);
  });

  it('NBI user sees all candidates', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const nbiUser = await createTestUser({ role: 'admin' });

    await createTestCandidate({ name: 'Alice', client_id: clientA.id });
    await createTestCandidate({ name: 'Bob', client_id: clientB.id });
    await createTestCandidate({ name: 'Charlie' });

    const token = await mintSession(nbiUser.id);
    const res = await request(app)
      .get('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(3);
  });

  it('NBI user can filter by client_id query param', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const nbiUser = await createTestUser({ role: 'admin' });

    await createTestCandidate({ name: 'Alice', client_id: clientA.id });
    await createTestCandidate({ name: 'Bob' });

    const token = await mintSession(nbiUser.id);
    const res = await request(app)
      .get(`/api/candidates?client_id=${clientA.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Alice');
  });

  it('client user sees only their own hiring positions', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const admin = await createTestUser({ role: 'admin' });
    const adminToken = await mintSession(admin.id);

    // Create positions as admin (only admins can create positions)
    await request(app).post('/api/hiring-positions').set('Cookie', `nbi_session=${adminToken}`)
      .send({ title: 'Eng for A', client_id: clientA.id }).expect(201);
    await request(app).post('/api/hiring-positions').set('Cookie', `nbi_session=${adminToken}`)
      .send({ title: 'Eng for B', client_id: clientB.id }).expect(201);

    const token = await mintSession(userA.id);
    const res = await request(app)
      .get('/api/hiring-positions')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Eng for A');
  });

  it('client user cannot delete candidates (admin only)', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const cand = await createTestCandidate({ name: 'Alice', client_id: clientA.id });

    const token = await mintSession(userA.id);
    await request(app)
      .delete(`/api/candidates/${cand.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(403);
  });
});
