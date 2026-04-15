// dashboard-server/tests/unit/clients-practice.test.mjs
//
// G2 regression: practice_area is mandatory on client creation and must
// be one of the two valid slugs (gaming | organisational_health). "general"
// is rejected going forward (Glen decision D84, 2026-04-15).

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('POST /api/clients — practice_area is mandatory (G2)', () => {
  it('rejects a create without practice_area', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Missing Practice Co' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/practice_area/i);
  });

  it('rejects a create with practice_area = "general"', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'General Co', practice_area: 'general' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gaming|organisational_health/i);
  });

  it('accepts a create with practice_area = "gaming"', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Gaming Co', practice_area: 'gaming' });

    expect(res.status).toBe(201);
    expect(res.body.practice_area).toBe('gaming');
  });

  it('accepts a create with practice_area = "organisational_health"', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Org Health Co', practice_area: 'organisational_health' });

    expect(res.status).toBe(201);
    expect(res.body.practice_area).toBe('organisational_health');
  });
});
