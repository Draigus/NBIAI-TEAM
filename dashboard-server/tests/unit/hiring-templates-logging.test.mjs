// Verify hiring-templates.js uses log() as a function (not log.error)
// and that catch blocks produce structured error logs, not TypeErrors.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

let token;
beforeEach(async () => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: user.username, password: user.raw_password });
  token = login.body.token;
});

describe('hiring-templates error logging', () => {
  it('GET /api/hiring-templates returns 200 (log.error crash is fixed)', async () => {
    const res = await request(app)
      .get('/api/hiring-templates')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/hiring-templates validates and returns 400 without crashing', async () => {
    const res = await request(app)
      .post('/api/hiring-templates')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('PATCH /api/hiring-templates/:id with invalid UUID returns 400', async () => {
    const res = await request(app)
      .patch('/api/hiring-templates/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/hiring-templates/:id with missing template returns 404', async () => {
    const res = await request(app)
      .delete('/api/hiring-templates/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('log() calls in hiring-templates use function syntax not method syntax', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../../routes/hiring-templates.js'), 'utf8');
    expect(src).not.toContain('log.error');
    expect(src).not.toContain('log.warn');
    expect(src).not.toContain('log.info');
    const logCalls = src.match(/log\('error'/g);
    expect(logCalls).not.toBeNull();
    expect(logCalls.length).toBe(5);
  });
});
