// dashboard-server/tests/e2e/innovations.spec.js
//
// E2E tests for the innovation items:
// - Finance entries server API
// - Client health scores
// - Activity feed
// - Client status reports
// - Dashboard UI rendering

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient } = require('../helpers/fixtures');
const { mintSession } = require('../helpers/auth');
const { truncate } = require('../helpers/db');

test.describe('Innovation items', () => {

  test('finance entries API — create, list, delete', async ({ request }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const create = await request.post('/api/finance/entries', {
      headers: { Cookie: `nbi_session=${token}` },
      data: { name: 'Test Expense', amount: 500, category: 'expense', type: 'one-off' },
    });
    expect(create.status()).toBe(201);
    const entry = await create.json();
    expect(entry.name).toBe('Test Expense');
    expect(parseFloat(entry.amount)).toBe(500);
    expect(entry.id).toBeTruthy();

    const list = await request.get('/api/finance/entries', {
      headers: { Cookie: `nbi_session=${token}` },
    });
    expect(list.status()).toBe(200);
    const entries = await list.json();
    expect(entries.some(e => e.id === entry.id)).toBe(true);

    const del = await request.delete('/api/finance/entries/' + entry.id, {
      headers: { Cookie: `nbi_session=${token}` },
    });
    expect(del.status()).toBe(200);
  });

  test('client health scores API returns valid structure', async ({ request }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const resp = await request.get('/api/dashboard/health-scores', {
      headers: { Cookie: `nbi_session=${token}` },
    });
    expect(resp.status()).toBe(200);
    const scores = await resp.json();
    expect(Array.isArray(scores)).toBe(true);
    for (const s of scores) {
      expect(typeof s.score).toBe('number');
      expect(['green', 'amber', 'red']).toContain(s.grade);
    }
  });

  test('activity feed returns audit entries', async ({ request }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const resp = await request.get('/api/dashboard/activity?limit=5', {
      headers: { Cookie: `nbi_session=${token}` },
    });
    expect(resp.status()).toBe(200);
    const items = await resp.json();
    expect(Array.isArray(items)).toBe(true);
  });

  test('client status report returns aggregated data', async ({ request }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);
    const client = await createTestClient({ name: 'Report Test Co' });

    const resp = await request.get('/api/clients/' + client.id + '/status-report', {
      headers: { Cookie: `nbi_session=${token}` },
    });
    const body = await resp.json();
    if (resp.status() !== 200) console.log('STATUS REPORT ERROR:', JSON.stringify(body));
    expect(resp.status()).toBe(200);
    expect(body.client).toBeTruthy();
    expect(body.client.name).toBe('Report Test Co');
    expect(body.summary).toBeTruthy();
    expect(typeof body.summary.total_tasks).toBe('number');
    expect(Array.isArray(body.completed)).toBe(true);
    expect(Array.isArray(body.overdue)).toBe(true);
    expect(Array.isArray(body.blocked)).toBe(true);
  });

  test('finance entries bulk import works', async ({ request }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const resp = await request.post('/api/finance/entries/bulk', {
      headers: { Cookie: `nbi_session=${token}`, 'Content-Type': 'application/json' },
      data: { entries: [
        { name: 'Rent', amount: 1000, category: 'expense', type: 'recurring' },
        { name: 'Software', amount: 200, category: 'expense', type: 'recurring' },
      ]},
    });
    expect(resp.status()).toBe(201);
    const result = await resp.json();
    expect(result.count).toBe(2);
    expect(result.entries.length).toBe(2);
  });
});
