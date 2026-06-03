import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestCandidate } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Retired Interview Rounds endpoints — 410 Gone', () => {
  async function setup() {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Alice' });
    return { admin, token, candidate };
  }

  it('GET /api/candidates/:id/interviews returns 410', async () => {
    const { token, candidate } = await setup();
    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/interviews`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(410);
    expect(res.body.error).toContain('retired');
  });

  it('POST /api/candidates/:id/interviews returns 410', async () => {
    const { token, candidate } = await setup();
    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/interviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Phone Screen' });
    expect(res.status).toBe(410);
  });

  it('GET /api/interview-rounds returns 410', async () => {
    const { token } = await setup();
    const res = await request(app)
      .get('/api/interview-rounds')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(410);
  });

  it('POST /api/interview-rounds returns 410', async () => {
    const { token, candidate } = await setup();
    const res = await request(app)
      .post('/api/interview-rounds')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, title: 'Technical' });
    expect(res.status).toBe(410);
  });
});
