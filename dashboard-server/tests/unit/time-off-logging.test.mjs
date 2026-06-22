// Verify time-off.js uses the correct auditLog signature and produces
// audit_log rows with proper entity_type, action, and changed_by fields.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

let token, user;
beforeEach(async () => {
  await truncate();
  user = await createTestUser({ role: 'admin' });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: user.username, password: user.raw_password });
  token = login.body.token;
});

describe('time-off audit logging', () => {
  it('POST time-off creates an audit_log row with entity_type=time_off', async () => {
    const res = await request(app)
      .post(`/api/users/${user.id}/time-off`)
      .set('Authorization', `Bearer ${token}`)
      .send({ start_date: '2026-07-01', end_date: '2026-07-05', label: 'Holiday' });
    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      "SELECT * FROM audit_log WHERE entity_type = 'time_off' AND action = 'create'"
    );
    expect(rows.length).toBe(1);
    expect(rows[0].changed_by).toBe(user.display_name);
    const changes = typeof rows[0].changes === 'string' ? JSON.parse(rows[0].changes) : rows[0].changes;
    expect(changes.start_date).toBe('2026-07-01');
    expect(changes.end_date).toBe('2026-07-05');
  });

  it('DELETE time-off creates an audit_log row with entity_type=time_off and retains details', async () => {
    const createRes = await request(app)
      .post(`/api/users/${user.id}/time-off`)
      .set('Authorization', `Bearer ${token}`)
      .send({ start_date: '2026-08-01', end_date: '2026-08-03' });
    expect(createRes.status).toBe(201);
    const timeOffId = createRes.body.id;

    const delRes = await request(app)
      .delete(`/api/time-off/${timeOffId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    const { rows } = await pool.query(
      "SELECT * FROM audit_log WHERE entity_type = 'time_off' AND action = 'delete'"
    );
    expect(rows.length).toBe(1);
    expect(rows[0].entity_id).toBe(timeOffId);
    expect(rows[0].changed_by).toBe(user.display_name);
    const changes = typeof rows[0].changes === 'string' ? JSON.parse(rows[0].changes) : rows[0].changes;
    expect(changes).toBeTruthy();
    expect(changes.user_id).toBe(user.id);
  });

  it('auditLog calls in time-off.js use correct signature (not req as first arg)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../../routes/time-off.js'), 'utf8');
    expect(src).not.toMatch(/auditLog\(req\b/);
    const auditCalls = src.match(/auditLog\('time_off'/g);
    expect(auditCalls).not.toBeNull();
    expect(auditCalls.length).toBe(2);
  });
});
