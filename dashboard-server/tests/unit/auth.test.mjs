// dashboard-server/tests/unit/auth.test.mjs
//
// Retroactive test of the auth flow: login with valid creds, hit a
// protected endpoint, logout, hit it again and get 401.
//
// Covers the most basic security guarantee of the app. If this fails,
// either auth is broken or somebody made an authenticated route public.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { truncate } = require('../helpers/db.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('auth flow', () => {
  it('valid login returns a token', async () => {
    const user = await createTestUser({ role: 'admin' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: user.raw_password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('invalid login returns 401', async () => {
    const user = await createTestUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: 'wrong_password' });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me with valid token returns the user', async () => {
    const user = await createTestUser({ role: 'admin' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: user.raw_password });
    const token = login.body.token;

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe(user.username);
  });

  it('GET /api/auth/me without a token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/logout invalidates the token', async () => {
    const user = await createTestUser({ role: 'admin' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: user.raw_password });
    const token = login.body.token;

    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const after = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(after.status).toBe(401);
  });
});
