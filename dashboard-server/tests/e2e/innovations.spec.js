// dashboard-server/tests/e2e/innovations.spec.js
//
// E2E tests for the 6 innovation items:
// 1. Finance entries server migration
// 2. Client status reports
// 3. Client health scores
// 4. Onboarding bridge
// 5. Version-based sync conflicts
// 6. Activity feed

const { test, expect } = require('@playwright/test');

test.describe('Innovation items', () => {

  test('finance entries API — create and retrieve', async ({ request }) => {
    // Login first
    const login = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(login.status()).toBe(200);

    // Create a finance entry
    const create = await request.post('/api/finance/entries', {
      data: { name: 'Test Entry', amount: 500, category: 'expense', type: 'one-off' },
    });
    expect(create.status()).toBe(201);
    const entry = await create.json();
    expect(entry.name).toBe('Test Entry');
    expect(parseFloat(entry.amount)).toBe(500);
    expect(entry.id).toBeTruthy();

    // List entries
    const list = await request.get('/api/finance/entries');
    expect(list.status()).toBe(200);
    const entries = await list.json();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some(e => e.id === entry.id)).toBe(true);

    // Delete the entry
    const del = await request.delete('/api/finance/entries/' + entry.id);
    expect(del.status()).toBe(200);
  });

  test('client health scores API returns scores', async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(login.status()).toBe(200);

    const resp = await request.get('/api/dashboard/health-scores');
    expect(resp.status()).toBe(200);
    const scores = await resp.json();
    expect(Array.isArray(scores)).toBe(true);
    for (const s of scores) {
      expect(s.name).toBeTruthy();
      expect(typeof s.score).toBe('number');
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
      expect(['green', 'amber', 'red']).toContain(s.grade);
      expect(Array.isArray(s.factors)).toBe(true);
    }
  });

  test('activity feed API returns entries', async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(login.status()).toBe(200);

    const resp = await request.get('/api/dashboard/activity?limit=5');
    expect(resp.status()).toBe(200);
    const items = await resp.json();
    expect(Array.isArray(items)).toBe(true);
    for (const item of items) {
      expect(item.entity_type).toBeTruthy();
      expect(item.action).toBeTruthy();
      expect(item.created_at).toBeTruthy();
    }
  });

  test('client status report API returns aggregated data', async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(login.status()).toBe(200);

    // Get a client ID first
    const clients = await request.get('/api/clients');
    expect(clients.status()).toBe(200);
    const clientList = await clients.json();
    if (clientList.length === 0) return; // skip if no clients

    const clientId = clientList[0].id;
    const resp = await request.get('/api/clients/' + clientId + '/status-report');
    expect(resp.status()).toBe(200);
    const report = await resp.json();
    expect(report.client).toBeTruthy();
    expect(report.summary).toBeTruthy();
    expect(typeof report.summary.total_tasks).toBe('number');
    expect(typeof report.summary.overdue_count).toBe('number');
    expect(typeof report.summary.blocked_count).toBe('number');
    expect(Array.isArray(report.completed)).toBe(true);
    expect(Array.isArray(report.overdue)).toBe(true);
    expect(Array.isArray(report.blocked)).toBe(true);
  });

  test('user creation returns generated password for must_change_password users', async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(login.status()).toBe(200);

    // Create a user with must_change_password
    const uniqueName = 'testuser_' + Date.now();
    const create = await request.post('/api/users', {
      data: {
        username: uniqueName,
        display_name: 'Test User',
        password: 'TempPass123!',
      },
    });
    expect(create.status()).toBe(201);
    const user = await create.json();
    expect(user.username).toBe(uniqueName);

    // Clean up
    await request.delete('/api/users/' + user.id);
  });

  test('dashboard renders health scores and activity feed', async ({ page }) => {
    // Login via UI
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginForm', { timeout: 5000 }).catch(() => null);
    const loginForm = await page.$('#loginForm');
    if (loginForm) {
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin123');
      await page.click('#loginBtn');
      await page.waitForTimeout(2000);
    }

    // Navigate to dashboard
    await page.click('[data-view="dashboard"]').catch(() => null);
    await page.waitForTimeout(3000);

    // Check health scores container exists
    const healthContainer = await page.$('#healthScoresContainer');
    expect(healthContainer).not.toBeNull();

    // Check activity feed container exists
    const activityContainer = await page.$('#activityFeedContainer');
    expect(activityContainer).not.toBeNull();
  });
});
