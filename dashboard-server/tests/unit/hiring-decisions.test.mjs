import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestCandidate, createTestHiringPosition } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Hiring Decisions API', () => {
  async function setup() {
    const admin = await createTestUser({ role: 'admin', username: 'hd_admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'HD Client' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer' });
    const candidate = await createTestCandidate({
      client_id: client.id,
      position_id: position.id,
      name: 'Test Candidate',
      role: 'Engineer',
      stage: 'interviews',
    });
    return { admin, token, client, position, candidate };
  }

  it('POST creates advance decision and moves candidate to offer', async () => {
    const { token, candidate } = await setup();
    const res = await request(app)
      .post('/api/hiring-decisions')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'advance', notes: 'Strong candidate' });
    expect(res.status).toBe(201);
    expect(res.body.decision).toBe('advance');
    const { rows } = await pool.query('SELECT stage FROM candidates WHERE id = $1', [candidate.id]);
    expect(rows[0].stage).toBe('offer');
  });

  it('POST creates reject decision and archives candidate', async () => {
    const { token, candidate } = await setup();
    const res = await request(app)
      .post('/api/hiring-decisions')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'reject', rejection_category: 'skills-mismatch', notes: 'Not a fit' });
    expect(res.status).toBe(201);
    const { rows } = await pool.query('SELECT archived_at FROM candidates WHERE id = $1', [candidate.id]);
    expect(rows[0].archived_at).not.toBeNull();
  });

  it('POST creates hold decision with no stage change', async () => {
    const { token, candidate } = await setup();
    const res = await request(app)
      .post('/api/hiring-decisions')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'hold', notes: 'Waiting for final round' });
    expect(res.status).toBe(201);
    const { rows } = await pool.query('SELECT stage FROM candidates WHERE id = $1', [candidate.id]);
    expect(rows[0].stage).toBe('interviews');
  });

  it('POST rejects missing notes', async () => {
    const { token, candidate } = await setup();
    const res = await request(app)
      .post('/api/hiring-decisions')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'advance' });
    expect(res.status).toBe(400);
  });

  it('POST rejects non-admin', async () => {
    const { candidate } = await setup();
    const member = await createTestUser({ role: 'member', username: 'hd_member' });
    const memberToken = await mintSession(member.id);
    const res = await request(app)
      .post('/api/hiring-decisions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ candidate_id: candidate.id, decision: 'advance', notes: 'Test' });
    expect(res.status).toBe(403);
  });

  it('POST reject requires rejection_category', async () => {
    const { token, candidate } = await setup();
    const res = await request(app)
      .post('/api/hiring-decisions')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'reject', notes: 'Not a fit' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('rejection_category');
  });

  it('GET returns decisions newest first', async () => {
    const { token, candidate } = await setup();
    await request(app).post('/api/hiring-decisions').set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'hold', notes: 'First' });
    await request(app).post('/api/hiring-decisions').set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'advance', notes: 'Second' });
    const res = await request(app)
      .get('/api/hiring-decisions?candidate_id=' + candidate.id)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].decision).toBe('advance');
    expect(res.body[1].decision).toBe('hold');
  });
});
