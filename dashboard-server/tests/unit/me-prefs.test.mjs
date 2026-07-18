// dashboard-server/tests/unit/me-prefs.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('GET/PATCH /api/me/prefs', () => {
  it('returns {} for a fresh user and merges patches', async () => {
    const user = await createTestUser({ role: 'member', ui_prefs: {} });
    const token = await mintSession(user.id);
    const get1 = await request(app).get('/api/me/prefs').set('Authorization', `Bearer ${token}`);
    expect(get1.status).toBe(200);
    expect(get1.body).toEqual({});

    const patch1 = await request(app).patch('/api/me/prefs').set('Authorization', `Bearer ${token}`)
      .send({ tour_completed: true });
    expect(patch1.status).toBe(200);
    const patch2 = await request(app).patch('/api/me/prefs').set('Authorization', `Bearer ${token}`)
      .send({ setup_completed: true });
    expect(patch2.body).toEqual({ tour_completed: true, setup_completed: true });
  });

  it('rejects non-object bodies and oversized payloads', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    expect((await request(app).patch('/api/me/prefs').set('Authorization', `Bearer ${token}`).send([1, 2])).status).toBe(400);
    const big = { x: 'a'.repeat(20000) };
    expect((await request(app).patch('/api/me/prefs').set('Authorization', `Bearer ${token}`).send(big)).status).toBe(400);
  });

  it('requires auth', async () => {
    expect((await request(app).get('/api/me/prefs')).status).toBe(401);
  });
});
