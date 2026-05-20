import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestCandidate } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Stage transition history', () => {
  it('records history on candidate creation (from_stage = NULL)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'TestCo' });

    const res = await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Alice', client_id: client.id, stage: 'sourcing' })
      .expect(201);

    const { rows } = await pool.query(
      'SELECT * FROM candidate_stage_history WHERE candidate_id = $1 ORDER BY moved_at',
      [res.body.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].from_stage).toBeNull();
    expect(rows[0].to_stage).toBe('sourcing');
    expect(rows[0].moved_by).toBe(admin.display_name);
  });

  it('records history on stage change via PATCH', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Bob', stage: 'sourcing' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'interviews' })
      .expect(200);

    const { rows } = await pool.query(
      'SELECT * FROM candidate_stage_history WHERE candidate_id = $1 ORDER BY moved_at',
      [candidate.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].from_stage).toBe('sourcing');
    expect(rows[0].to_stage).toBe('interviews');
  });

  it('does NOT record history when stage is unchanged', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Carla', stage: 'sourcing' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'sourcing', role: 'Engineer' })
      .expect(200);

    const { rows } = await pool.query(
      'SELECT * FROM candidate_stage_history WHERE candidate_id = $1',
      [candidate.id]
    );
    expect(rows).toHaveLength(0);
  });

  it('accepts onboarded as a valid stage', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Dan', stage: 'offer' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'onboarded' })
      .expect(200);

    expect(res.body.stage).toBe('onboarded');
  });
});

describe('GET /api/candidates/:id/history', () => {
  it('returns transition history ordered by moved_at ASC', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Eve', stage: 'sourcing' });

    // Create two history entries
    await pool.query(
      "INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by, moved_at) VALUES ($1, NULL, 'sourcing', 'Admin', NOW() - INTERVAL '2 days')",
      [candidate.id]
    );
    await pool.query(
      "INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by, moved_at) VALUES ($1, 'sourcing', 'interviews', 'Admin', NOW() - INTERVAL '1 day')",
      [candidate.id]
    );

    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/history`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].to_stage).toBe('sourcing');
    expect(res.body[1].to_stage).toBe('interviews');
  });

  it('client user can only view history for their own candidates', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const candidateB = await createTestCandidate({ name: 'Fiona', client_id: clientB.id });

    const token = await mintSession(userA.id);
    await request(app)
      .get(`/api/candidates/${candidateB.id}/history`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(403);
  });
});

const VALID_SOURCES = ['referral', 'linkedin', 'inbound', 'agency', 'job-board', 'internal', 'other'];

describe('Candidate new fields — email, source, tags', () => {
  it('POST accepts email, source, source_detail', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Grace', email: 'grace@example.com', source: 'referral', source_detail: 'From Glen' })
      .expect(201);

    expect(res.body.email).toBe('grace@example.com');
    expect(res.body.source).toBe('referral');
    expect(res.body.source_detail).toBe('From Glen');
  });

  it('rejects invalid source value', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Hank', source: 'invalid-source' })
      .expect(400);
  });

  it('rejects malformed email', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Ivan', email: 'not-an-email' })
      .expect(400);
  });

  it('PATCH updates tags — normalises to lowercase, deduplicates', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Jill' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ tags: ['Senior', ' SENIOR ', 'greek-speaking', ''] })
      .expect(200);

    expect(res.body.tags).toEqual(['senior', 'greek-speaking']);
  });

  it('rejects tags exceeding 20 items', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Karl' });
    const tooMany = Array.from({ length: 21 }, (_, i) => `tag-${i}`);

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ tags: tooMany })
      .expect(400);
  });

  it('rejects tag longer than 50 characters', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Lara' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ tags: ['a'.repeat(51)] })
      .expect(400);
  });

  it('GET candidates list includes new fields', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    await createTestCandidate({ name: 'Mona', email: 'm@test.com', source: 'linkedin', tags: ['senior'] });

    const res = await request(app)
      .get('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body[0].email).toBe('m@test.com');
    expect(res.body[0].source).toBe('linkedin');
    expect(res.body[0].tags).toEqual(['senior']);
  });

  it('rejects source_detail exceeding 500 characters', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Ned', source: 'referral', source_detail: 'x'.repeat(501) })
      .expect(400);
  });
});
