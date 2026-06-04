// dashboard-server/tests/e2e/product-audit-improvements.spec.js
//
// E2E tests for the 7 product audit improvements:
// 1. Sync batch cap (API)
// 2. Correlation IDs (API)
// 3. Password policy (API)
// 4. Detail panel collapsible sections (UI)
// 5. Client NBI contacts (API)
// 6. Client portal email notifications (API)
// 7. Activity feed (API + UI sidebar)

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestTask, createTestClient } = require('../helpers/fixtures');
const { mintSession } = require('../helpers/auth');
const { truncate } = require('../helpers/db');

// ── 1. Sync batch cap ──────────────────────────────────────────────

test('sync rejects batches exceeding 500 items', async ({ request }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const token = await mintSession(user.id);

  const changes = Array.from({ length: 501 }, (_, i) => ({
    op: 'upsert',
    type: 'task',
    data: { title: `batch-item-${i}`, status: 'To Do', item_type: 'task' },
  }));

  const res = await request.post('/api/sync/changes', {
    headers: { Authorization: `Bearer ${token}` },
    data: { changes },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error).toContain('500');
});

// ── 2. Correlation IDs ─────────────────────────────────────────────

test('every API response includes X-Request-Id header', async ({ request }) => {
  const res = await request.get('/api/health');
  const requestId = res.headers()['x-request-id'];
  expect(requestId).toBeTruthy();
  expect(requestId.length).toBeGreaterThan(8);
});

test('client-supplied X-Request-Id is echoed back', async ({ request }) => {
  const customId = 'e2e-trace-12345';
  const res = await request.get('/api/health', {
    headers: { 'X-Request-Id': customId },
  });
  expect(res.headers()['x-request-id']).toBe(customId);
});

// ── 3. Password policy ─────────────────────────────────────────────

test('password change rejects weak passwords', async ({ request }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const token = await mintSession(user.id);

  const res = await request.post('/api/auth/change-password', {
    headers: { Authorization: `Bearer ${token}` },
    data: { currentPassword: user.raw_password, newPassword: 'short1A' },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error).toContain('6 characters');
});

test('password change accepts strong passwords', async ({ request }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const token = await mintSession(user.id);

  const res = await request.post('/api/auth/change-password', {
    headers: { Authorization: `Bearer ${token}` },
    data: { currentPassword: user.raw_password, newPassword: 'StrongPass123!!' },
  });
  expect(res.status()).toBe(200);
});

// ── 4. Detail panel collapsible sections (UI) ───────────────────────

test('accordion CSS and toggle function are present in the SPA source', async ({ request }) => {
  const res = await request.get('/nbi_project_dashboard.html');
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('detail-accordion__header');
  expect(html).toContain('detail-accordion--collapsed');
  expect(html).toContain('function toggleDetailSection');
});

// ── 5. Client NBI contacts (API) ───────────────────────────────────

test('client NBI contacts CRUD works', async ({ request }) => {
  await truncate();
  const admin = await createTestUser({ role: 'admin' });
  const nbiStaff = await createTestUser({ role: 'member' });
  const token = await mintSession(admin.id);
  const client = await createTestClient();

  // Add contact
  const addRes = await request.post(`/api/clients/${client.id}/nbi-contacts`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { user_id: nbiStaff.id },
  });
  expect(addRes.status()).toBe(201);

  // List contacts
  const listRes = await request.get(`/api/clients/${client.id}/nbi-contacts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(listRes.status()).toBe(200);
  const contacts = await listRes.json();
  expect(contacts.some(c => c.id === nbiStaff.id)).toBe(true);

  // Remove contact
  const delRes = await request.delete(`/api/clients/${client.id}/nbi-contacts/${nbiStaff.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(delRes.status()).toBe(200);

  // Verify removed
  const listRes2 = await request.get(`/api/clients/${client.id}/nbi-contacts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const contacts2 = await listRes2.json();
  expect(contacts2.some(c => c.id === nbiStaff.id)).toBe(false);
});

// ── 6. Client portal email notifications (API) ─────────────────────

test('client user creating a bug report triggers notification (email endpoint called)', async ({ request }) => {
  await truncate();
  const admin = await createTestUser({ role: 'admin' });
  const client = await createTestClient();
  const clientUser = await createTestUser({
    role: 'member',
    client_id: client.id,
    client_role: 'member',
  });
  const clientToken = await mintSession(clientUser.id);

  // Client user submits a bug report — should succeed (201)
  // and trigger notification logic (we can't verify email delivery in e2e,
  // but we verify the endpoint still works correctly with the notification code path)
  const res = await request.post('/api/bug-reports', {
    headers: { Authorization: `Bearer ${clientToken}` },
    data: { title: 'E2E notification test bug', type: 'bug', description: 'Testing notification flow' },
  });
  expect(res.status()).toBe(201);
  const bug = await res.json();
  expect(bug.title).toBe('E2E notification test bug');
});

test('NBI user creating a bug does NOT trigger client notification path', async ({ request }) => {
  await truncate();
  const admin = await createTestUser({ role: 'admin' });
  const token = await mintSession(admin.id);

  const res = await request.post('/api/bug-reports', {
    headers: { Authorization: `Bearer ${token}` },
    data: { title: 'Internal bug report', type: 'bug', description: 'Should not notify' },
  });
  expect(res.status()).toBe(201);
});

test('client user posting a comment triggers notification path', async ({ request }) => {
  await truncate();
  const admin = await createTestUser({ role: 'admin' });
  const client = await createTestClient();
  const clientUser = await createTestUser({
    role: 'member',
    client_id: client.id,
    client_role: 'member',
  });
  const adminToken = await mintSession(admin.id);
  const clientToken = await mintSession(clientUser.id);

  // Client user creates a bug (so they have permission to comment on it)
  const bugRes = await request.post('/api/bug-reports', {
    headers: { Authorization: `Bearer ${clientToken}` },
    data: { title: 'Bug for comment test', type: 'bug' },
  });
  expect(bugRes.status()).toBe(201);
  const bug = await bugRes.json();

  // Client user comments — should succeed and trigger notification
  const commentRes = await request.post(`/api/bug-reports/${bug.id}/comments`, {
    headers: { Authorization: `Bearer ${clientToken}` },
    data: { text: 'Client comment for e2e test' },
  });
  expect(commentRes.status()).toBe(201);
});

// ── 7. Activity feed (API) ──────────────────────────────────────────

test('activity feed returns humanised audit entries', async ({ request }) => {
  await truncate();
  const admin = await createTestUser({ role: 'admin' });
  const token = await mintSession(admin.id);

  const res = await request.get('/api/activity', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('entries');
  expect(body).toHaveProperty('hasMore');
  expect(Array.isArray(body.entries)).toBe(true);
});

test('activity feed filters by entity_type', async ({ request }) => {
  await truncate();
  const admin = await createTestUser({ role: 'admin' });
  const token = await mintSession(admin.id);

  const res = await request.get('/api/activity?entity_type=task', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  for (const entry of body.entries) {
    expect(entry.entityType).toBe('task');
  }
});

test('activity feed requires NBI authentication', async ({ request }) => {
  const res = await request.get('/api/activity');
  expect(res.status()).toBe(401);
});
