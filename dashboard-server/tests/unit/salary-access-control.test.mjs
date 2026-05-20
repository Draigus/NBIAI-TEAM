// dashboard-server/tests/unit/salary-access-control.test.mjs
//
// Security: salary_range must be visible to NBI users but hidden from
// client-scoped users when listing hiring positions.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser,
  createTestClient,
  createTestHiringPosition,
} = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Salary access control — GET /api/hiring-positions', () => {
  it('admin user sees salary_range in positions list', async () => {
    const client = await createTestClient({ name: 'Acme' });
    const admin = await createTestUser({ role: 'admin' });
    await createTestHiringPosition({
      client_id: client.id,
      title: 'Senior Engineer',
      salary_range: '£80,000–£100,000',
    });

    const token = await mintSession(admin.id);
    const res = await request(app)
      .get('/api/hiring-positions')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].salary_range).toBe('£80,000–£100,000');
  });

  it('client user does NOT see salary_range in positions list', async () => {
    const client = await createTestClient({ name: 'Acme' });
    const clientUser = await createTestUser({
      role: 'member',
      client_id: client.id,
      client_role: 'member',
    });
    const admin = await createTestUser({ role: 'admin' });
    const adminToken = await mintSession(admin.id);

    // Create position as admin (only admins can create positions)
    await request(app)
      .post('/api/hiring-positions')
      .set('Cookie', `nbi_session=${adminToken}`)
      .send({ title: 'Senior Engineer', client_id: client.id })
      .expect(201);

    // Also set salary_range directly via fixture so it's definitely present in the DB
    await createTestHiringPosition({
      client_id: client.id,
      title: 'Another Role',
      salary_range: '£50,000',
    });

    const token = await mintSession(clientUser.id);
    const res = await request(app)
      .get('/api/hiring-positions')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    for (const position of res.body) {
      expect(position.salary_range).toBeUndefined();
    }
  });

  it('NBI non-admin user (no clientId) still sees salary_range', async () => {
    const client = await createTestClient({ name: 'Acme' });
    const nbiMember = await createTestUser({ role: 'member' }); // no client_id
    await createTestHiringPosition({
      client_id: client.id,
      title: 'Designer',
      salary_range: '£60,000',
    });

    const token = await mintSession(nbiMember.id);
    const res = await request(app)
      .get('/api/hiring-positions')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].salary_range).toBe('£60,000');
  });
});
