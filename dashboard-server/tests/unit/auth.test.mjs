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
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
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

  it('deactivated user is rejected by GET /api/auth/me', async () => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [user.id]);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('deactivated user is rejected by requireAuth middleware', async () => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [user.id]);
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('change-password invalidates other sessions', async () => {
    const user = await createTestUser({ role: 'admin' });
    const token1 = await mintSession(user.id);
    const token2 = await mintSession(user.id);

    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token1}`)
      .send({ currentPassword: user.raw_password, newPassword: 'NewPass123!' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(401);
  });
});

describe('HttpOnly cookie auth (F-C2)', () => {
  it('login sets an HttpOnly session cookie', async () => {
    const user = await createTestUser({ role: 'admin' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: user.raw_password });
    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const sessionCookie = cookies.find(c => c.startsWith('nbi_session='));
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie).toMatch(/HttpOnly/i);
    expect(sessionCookie).toMatch(/SameSite=Lax/i);
  });

  it('auth/me works with cookie only (no Authorization header)', async () => {
    const user = await createTestUser({ role: 'admin' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: user.raw_password });
    const cookies = login.headers['set-cookie'];
    const sessionCookie = cookies.find(c => c.startsWith('nbi_session='));
    const cookieValue = sessionCookie.split(';')[0];

    const me = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookieValue);
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe(user.username);
  });

  it('requireAuth works with cookie only (no Authorization header)', async () => {
    const user = await createTestUser({ role: 'admin' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: user.raw_password });
    const cookies = login.headers['set-cookie'];
    const cookieValue = cookies.find(c => c.startsWith('nbi_session=')).split(';')[0];

    const res = await request(app)
      .get('/api/tasks')
      .set('Cookie', cookieValue);
    expect(res.status).toBe(200);
  });

  it('logout clears the session cookie', async () => {
    const user = await createTestUser({ role: 'admin' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: user.raw_password });
    const cookies = login.headers['set-cookie'];
    const cookieValue = cookies.find(c => c.startsWith('nbi_session=')).split(';')[0];

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieValue);
    expect(logout.status).toBe(200);
    const clearCookies = logout.headers['set-cookie'];
    const cleared = clearCookies?.find(c => c.startsWith('nbi_session='));
    expect(cleared).toMatch(/nbi_session=;|Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });
});
