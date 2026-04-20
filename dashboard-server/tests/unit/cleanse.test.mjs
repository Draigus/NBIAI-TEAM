import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask, createTestContact, createTestLead, createTestLeadStage, createTestExpense, createTestSow, createTestClientNote, createTestBugReport } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('GET /api/admin/cleanse/preview', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/admin/cleanse/preview');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin users', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    const res = await request(app)
      .get('/api/admin/cleanse/preview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejects client-portal users', async () => {
    const client = await createTestClient();
    const user = await createTestUser({ role: 'admin', client_id: client.id, client_role: 'admin' });
    const token = await mintSession(user.id);
    const res = await request(app)
      .get('/api/admin/cleanse/preview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns category list with correct counts', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient();
    await createTestTask({ client_id: client.id });
    await createTestTask({ client_id: client.id });
    await createTestContact({ client_id: client.id });

    const res = await request(app)
      .get('/api/admin/cleanse/preview')
      .set('Authorization', `Bearer ${token}`)
      .set('X-API-Version', '2');
    expect(res.status).toBe(200);

    const categories = res.body.data.categories;
    expect(Array.isArray(categories)).toBe(true);

    const tasksCat = categories.find(c => c.id === 'tasks');
    expect(tasksCat).toBeDefined();
    expect(tasksCat.count).toBe(2);
    expect(tasksCat.label).toBe('Projects & Tasks');

    const clientsCat = categories.find(c => c.id === 'clients');
    expect(clientsCat).toBeDefined();
    expect(clientsCat.count).toBe(1);
    expect(clientsCat.tier).toBe('nuclear');
    expect(clientsCat.cascades).toContain('contacts');
  });

  it('returns zero counts for empty categories', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .get('/api/admin/cleanse/preview')
      .set('Authorization', `Bearer ${token}`)
      .set('X-API-Version', '2');
    expect(res.status).toBe(200);

    const categories = res.body.data.categories;
    const tasksCat = categories.find(c => c.id === 'tasks');
    expect(tasksCat.count).toBe(0);
  });
});
