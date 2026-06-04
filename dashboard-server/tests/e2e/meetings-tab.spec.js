const { test, expect } = require('@playwright/test');
const { createTestUser } = require('../helpers/fixtures');
const { mintSession } = require('../helpers/auth');

test.describe('Meetings Intelligence CRUD', () => {

  test('create, read, update, delete an item', async ({ request }) => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    // Create
    const create = await request.post('/api/meetings/items', {
      headers: { Cookie: `nbi_session=${token}`, 'Content-Type': 'application/json' },
      data: { section: 'actions', data: { description: 'E2E test action', status: 'open', workstream: 'nbi' } },
    });
    expect(create.status()).toBe(201);
    const item = await create.json();
    expect(item.id).toBeTruthy();
    expect(item.description).toBe('E2E test action');

    // Read
    const read = await request.get('/api/meetings/compiled', {
      headers: { Cookie: `nbi_session=${token}` },
    });
    expect(read.status()).toBe(200);
    const compiled = await read.json();
    expect(compiled.sections.actions.some(a => a.id === item.id)).toBe(true);

    // Update
    const update = await request.patch('/api/meetings/items/' + item.id, {
      headers: { Cookie: `nbi_session=${token}`, 'Content-Type': 'application/json' },
      data: { data: { status: 'done' } },
    });
    expect(update.status()).toBe(200);
    const updated = await update.json();
    expect(updated.status).toBe('done');

    // Delete
    const del = await request.delete('/api/meetings/items/' + item.id, {
      headers: { Cookie: `nbi_session=${token}` },
    });
    expect(del.status()).toBe(200);
  });

  test('rejects invalid section', async ({ request }) => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const res = await request.post('/api/meetings/items', {
      headers: { Cookie: `nbi_session=${token}`, 'Content-Type': 'application/json' },
      data: { section: 'bogus', data: { x: 1 } },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects missing required fields', async ({ request }) => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const res = await request.post('/api/meetings/items', {
      headers: { Cookie: `nbi_session=${token}`, 'Content-Type': 'application/json' },
      data: { section: 'actions', data: { description: 'no status field' } },
    });
    expect(res.status()).toBe(400);
  });

  test('stats endpoint returns counts', async ({ request }) => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const res = await request.get('/api/meetings/stats', {
      headers: { Cookie: `nbi_session=${token}` },
    });
    expect(res.status()).toBe(200);
    const stats = await res.json();
    expect(typeof stats.action_count).toBe('number');
  });

  test('meeting record CRUD lifecycle', async ({ request }) => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const create = await request.post('/api/meetings/items', {
      headers: { Cookie: `nbi_session=${token}`, 'Content-Type': 'application/json' },
      data: { section: 'meetings', data: { title: 'E2E Test Meeting', date: '2026-04-15', attendees: ['Glen', 'Aris'], summary: 'Test summary' } },
    });
    expect(create.status()).toBe(201);
    const mtg = await create.json();
    expect(mtg.id).toMatch(/^mtg_20260415_e2e-test-meeting$/);

    const compiled = await request.get('/api/meetings/compiled', {
      headers: { Cookie: `nbi_session=${token}` },
    });
    const body = await compiled.json();
    expect(body.sections.meetings.some(m => m.id === mtg.id)).toBe(true);

    await request.delete('/api/meetings/items/' + mtg.id, {
      headers: { Cookie: `nbi_session=${token}` },
    }).then(r => expect(r.status()).toBe(200));
  });
});
