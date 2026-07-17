// dashboard-server/tests/unit/views-api.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

const CONFIG = { filters: { status: ['In progress'] }, sort: 'due-asc', groupBy: 'assignee' };

describe('Saved views API', () => {
  it('POST creates a view and GET returns it for the owner', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    const post = await request(app).post('/api/views').set('Authorization', `Bearer ${token}`)
      .send({ section: 'tasks', name: 'My WIP', config: CONFIG });
    expect(post.status).toBe(201);
    expect(post.body.name).toBe('My WIP');

    const get = await request(app).get('/api/views?section=tasks').set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.length).toBe(1);
    expect(get.body[0].config.sort).toBe('due-asc');
  });

  it('GET does not return another user\'s private views', async () => {
    const a = await createTestUser({ role: 'member' });
    const b = await createTestUser({ role: 'member' });
    const tokenA = await mintSession(a.id);
    const tokenB = await mintSession(b.id);
    await request(app).post('/api/views').set('Authorization', `Bearer ${tokenA}`)
      .send({ section: 'tasks', name: 'Private', config: CONFIG });
    const get = await request(app).get('/api/views?section=tasks').set('Authorization', `Bearer ${tokenB}`);
    expect(get.body.length).toBe(0);
  });

  it('admin-created shared views are visible to everyone', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const member = await createTestUser({ role: 'member' });
    const adminToken = await mintSession(admin.id);
    const memberToken = await mintSession(member.id);
    await request(app).post('/api/views').set('Authorization', `Bearer ${adminToken}`)
      .send({ section: 'tasks', name: 'Team Default', config: CONFIG, is_shared: true });
    const get = await request(app).get('/api/views?section=tasks').set('Authorization', `Bearer ${memberToken}`);
    expect(get.body.length).toBe(1);
    expect(get.body[0].is_shared).toBe(true);
  });

  it('non-admin cannot create a shared view', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    const post = await request(app).post('/api/views').set('Authorization', `Bearer ${token}`)
      .send({ section: 'tasks', name: 'Sneaky', config: CONFIG, is_shared: true });
    expect(post.status).toBe(403);
  });

  it('setting is_default unsets the previous default for that user+section', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    const v1 = await request(app).post('/api/views').set('Authorization', `Bearer ${token}`)
      .send({ section: 'tasks', name: 'One', config: CONFIG, is_default: true });
    await request(app).post('/api/views').set('Authorization', `Bearer ${token}`)
      .send({ section: 'tasks', name: 'Two', config: CONFIG, is_default: true });
    const get = await request(app).get('/api/views?section=tasks').set('Authorization', `Bearer ${token}`);
    const defaults = get.body.filter(v => v.is_default);
    expect(defaults.length).toBe(1);
    expect(defaults[0].name).toBe('Two');
    expect(get.body.find(v => v.id === v1.body.id).is_default).toBe(false);
  });

  it('PATCH updates own view; 404 on someone else\'s', async () => {
    const a = await createTestUser({ role: 'member' });
    const b = await createTestUser({ role: 'member' });
    const tokenA = await mintSession(a.id);
    const tokenB = await mintSession(b.id);
    const post = await request(app).post('/api/views').set('Authorization', `Bearer ${tokenA}`)
      .send({ section: 'tasks', name: 'Mine', config: CONFIG });
    const patch = await request(app).patch(`/api/views/${post.body.id}`).set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Renamed' });
    expect(patch.status).toBe(200);
    expect(patch.body.name).toBe('Renamed');
    const forbidden = await request(app).patch(`/api/views/${post.body.id}`).set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hijack' });
    expect(forbidden.status).toBe(404);
  });

  it('DELETE removes own view; duplicate name in same section returns 409', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    const post = await request(app).post('/api/views').set('Authorization', `Bearer ${token}`)
      .send({ section: 'tasks', name: 'Dup', config: CONFIG });
    const dup = await request(app).post('/api/views').set('Authorization', `Bearer ${token}`)
      .send({ section: 'tasks', name: 'Dup', config: CONFIG });
    expect(dup.status).toBe(409);
    const del = await request(app).delete(`/api/views/${post.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });

  it('rejects missing/invalid fields with 400', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    expect((await request(app).post('/api/views').set('Authorization', `Bearer ${token}`).send({ name: 'x', config: {} })).status).toBe(400);
    expect((await request(app).post('/api/views').set('Authorization', `Bearer ${token}`).send({ section: 'tasks', config: {} })).status).toBe(400);
    expect((await request(app).post('/api/views').set('Authorization', `Bearer ${token}`).send({ section: 'tasks', name: 'x' })).status).toBe(400);
    expect((await request(app).get('/api/views')).status).toBe(401);
  });
});
