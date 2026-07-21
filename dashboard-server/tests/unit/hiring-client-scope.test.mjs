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
const { createTestUser, createTestClient, createTestCandidate, createTestHiringPosition } = require('../helpers/fixtures.js');
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

  it('client admin can update a hiring position for their own client', async () => {
    const client = await createTestClient({ name: 'ClientA' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer', seniority: 'mid' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .patch(`/api/hiring-positions/${position.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ seniority: 'senior', discipline: 'Engineering' })
      .expect(200);

    expect(res.body.seniority).toBe('senior');
    expect(res.body.discipline).toBe('Engineering');
  });

  it('client admin cannot update another client\'s hiring position', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientAdminA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'admin' });
    const positionB = await createTestHiringPosition({ client_id: clientB.id, title: 'Engineer' });
    const token = await mintSession(clientAdminA.id);

    await request(app)
      .patch(`/api/hiring-positions/${positionB.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ seniority: 'lead' })
      .expect(403);
  });

  it('ordinary client member can update editable fields on their own hiring position', async () => {
    const client = await createTestClient({ name: 'ClientA' });
    const clientMember = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer' });
    const token = await mintSession(clientMember.id);

    const res = await request(app)
      .patch(`/api/hiring-positions/${position.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ seniority: 'lead', location: 'Remote' })
      .expect(200);

    expect(res.body.seniority).toBe('lead');
    expect(res.body.location).toBe('Remote');
  });

  it('ordinary client member cannot close their own hiring position', async () => {
    const client = await createTestClient({ name: 'ClientA' });
    const clientMember = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer' });
    const token = await mintSession(clientMember.id);

    await request(app)
      .patch(`/api/hiring-positions/${position.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ status: 'closed', closed_reason: 'shut_down', closed_at: new Date().toISOString() })
      .expect(403);
  });

  it('ordinary client member cannot reopen a role closed by an admin', async () => {
    const client = await createTestClient({ name: 'ClientA' });
    const clientMember = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Closed Engineer', status: 'closed' });
    const token = await mintSession(clientMember.id);

    const fieldUpdateRes = await request(app)
      .patch(`/api/hiring-positions/${position.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ location: 'Remote' })
      .expect(200);

    expect(fieldUpdateRes.body.location).toBe('Remote');

    await request(app)
      .patch(`/api/hiring-positions/${position.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ status: 'open' })
      .expect(403);
  });

  it('ordinary NBI member can update role fields but cannot close a role', async () => {
    const client = await createTestClient({ name: 'ClientA' });
    const nbiMember = await createTestUser({ role: 'member' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer' });
    const token = await mintSession(nbiMember.id);

    const updateRes = await request(app)
      .patch(`/api/hiring-positions/${position.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ discipline: 'Engineering', salary_range: '£70,000-£80,000' })
      .expect(200);

    expect(updateRes.body.discipline).toBe('Engineering');
    expect(updateRes.body.salary_range).toBe('£70,000-£80,000');

    await request(app)
      .patch(`/api/hiring-positions/${position.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ status: 'closed', closed_reason: 'shut_down', closed_at: new Date().toISOString() })
      .expect(403);
  });

  it('client admin cannot reassign a hiring position to another client', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientAdminA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'admin' });
    const positionA = await createTestHiringPosition({ client_id: clientA.id, title: 'Engineer' });
    const token = await mintSession(clientAdminA.id);

    await request(app)
      .patch(`/api/hiring-positions/${positionA.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ client_id: clientB.id })
      .expect(403);
  });

  it('client admin can close their own position with a candidate from that position', async () => {
    const client = await createTestClient({ name: 'ClientA' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer' });
    const candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Selected Candidate' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .patch(`/api/hiring-positions/${position.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({
        status: 'closed',
        closed_reason: 'filled',
        filled_by_candidate_id: candidate.id,
        closed_at: new Date().toISOString(),
      })
      .expect(200);

    expect(res.body.filled_by_candidate_id).toBe(candidate.id);
  });

  it('NBI admin can close a hiring position', async () => {
    const client = await createTestClient({ name: 'ClientA' });
    const admin = await createTestUser({ role: 'admin' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .patch(`/api/hiring-positions/${position.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({
        status: 'closed',
        closed_reason: 'shut_down',
        closed_at: new Date().toISOString(),
      })
      .expect(200);

    expect(res.body.status).toBe('closed');
    expect(res.body.closed_reason).toBe('shut_down');
  });

  it('client admin cannot close a position with another position\'s candidate', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientAdminA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'admin' });
    const positionA = await createTestHiringPosition({ client_id: clientA.id, title: 'Engineer A' });
    const positionB = await createTestHiringPosition({ client_id: clientB.id, title: 'Engineer B' });
    const candidateB = await createTestCandidate({ client_id: clientB.id, position_id: positionB.id, name: 'Other Candidate' });
    const token = await mintSession(clientAdminA.id);

    await request(app)
      .patch(`/api/hiring-positions/${positionA.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({
        status: 'closed',
        closed_reason: 'filled',
        filled_by_candidate_id: candidateB.id,
        closed_at: new Date().toISOString(),
      })
      .expect(403);
  });

  it('client admin cannot delete hiring positions', async () => {
    const client = await createTestClient({ name: 'ClientA' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer' });
    const token = await mintSession(clientAdmin.id);

    await request(app)
      .delete(`/api/hiring-positions/${position.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(403);
  });

  it('NBI admin can delete hiring positions', async () => {
    const client = await createTestClient({ name: 'ClientA' });
    const admin = await createTestUser({ role: 'admin' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer' });
    const token = await mintSession(admin.id);

    await request(app)
      .delete(`/api/hiring-positions/${position.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    const { rows } = await pool.query('SELECT id FROM hiring_positions WHERE id = $1', [position.id]);
    expect(rows).toHaveLength(0);
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
