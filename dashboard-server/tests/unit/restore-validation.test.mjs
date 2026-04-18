import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('POST /api/restore — input validation', () => {
  async function adminSetup() {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    return { admin, token };
  }

  it('rejects non-admin', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    const res = await request(app)
      .post('/api/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({ backup: { tables: {} } });
    expect(res.status).toBe(403);
  });

  it('rejects client row with invalid UUID id', async () => {
    const { token } = await adminSetup();
    const res = await request(app)
      .post('/api/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({
        backup: {
          tables: {
            clients: [{ id: 'not-a-uuid', name: 'Bad Client' }],
          },
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/validation/i);
  });

  it('rejects client row with missing name', async () => {
    const { token } = await adminSetup();
    const res = await request(app)
      .post('/api/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({
        backup: {
          tables: {
            clients: [{ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: '' }],
          },
        },
      });
    expect(res.status).toBe(400);
  });

  it('rejects task row with invalid status', async () => {
    const { token } = await adminSetup();
    const res = await request(app)
      .post('/api/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({
        backup: {
          tables: {
            tasks: [{
              id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
              title: 'X',
              status: 'INVALID_STATUS',
            }],
          },
        },
      });
    expect(res.status).toBe(400);
  });

  it('rejects settings row with disallowed key', async () => {
    const { token } = await adminSetup();
    const res = await request(app)
      .post('/api/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({
        backup: {
          tables: {
            settings: [{ key: '__proto__', value: '{}' }],
          },
        },
      });
    expect(res.status).toBe(400);
  });

  it('accepts valid backup data', async () => {
    const { token } = await adminSetup();
    const res = await request(app)
      .post('/api/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({
        backup: {
          tables: {
            clients: [{
              id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
              name: 'Valid Client',
              created_at: '2026-01-01T00:00:00Z',
            }],
          },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
