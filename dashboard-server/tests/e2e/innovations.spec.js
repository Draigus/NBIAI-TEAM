// dashboard-server/tests/e2e/innovations.spec.js
//
// E2E tests for the innovation items:
// - Finance entries server API
// - Client health scores
// - Activity feed
// - Client status reports
// - Dashboard UI rendering

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestCandidate } = require('../helpers/fixtures');
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

  test('metrics role filter dropdown filters candidates by role', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Metrics Filter Co' });

    // Create candidates with different roles
    await createTestCandidate({ client_id: client.id, name: 'Alice Engineer', role: 'Senior Engineer', stage: 'interviews' });
    await createTestCandidate({ client_id: client.id, name: 'Bob Engineer', role: 'Senior Engineer', stage: 'sourcing' });
    await createTestCandidate({ client_id: client.id, name: 'Carol Designer', role: 'UI Designer', stage: 'offer' });
    await createTestCandidate({ client_id: client.id, name: 'Dave PM', role: 'Product Manager', stage: 'sourcing' });

    // Login
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    // Navigate to Hiring view via sidebar
    await page.click('#si_Hiring');
    await page.waitForTimeout(2000);

    // Click the Metrics tab
    await page.click('.ats-tab:has-text("Metrics")');
    await page.waitForTimeout(1000);

    // Verify role filter dropdown exists with the 3 roles
    const roleDropdown = page.locator('select').filter({ hasText: 'All roles' });
    await expect(roleDropdown).toBeVisible({ timeout: 5000 });

    // Verify "Senior Engineer (2)" option exists
    const engineerOption = roleDropdown.locator('option:has-text("Senior Engineer")');
    await expect(engineerOption).toHaveCount(1);

    // Select "Senior Engineer" — should filter to 2 candidates
    await roleDropdown.selectOption('Senior Engineer');
    await page.waitForTimeout(1500);

    // After filtering, the "Active candidates" stat should show 2
    const filteredCount = await page.evaluate(() => {
      const cards = document.querySelectorAll('div[style*="border-left:3px"]');
      for (const card of cards) {
        if (card.textContent.includes('Active candidates')) {
          return card.querySelector('div[style*="font-size:24px"]')?.textContent?.trim();
        }
      }
      return null;
    });
    expect(filteredCount).toBe('2');

    // Clear filter button should be visible and work
    const clearBtn = page.locator('button:has-text("Clear")');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await page.waitForTimeout(1500);

    // After clearing, should show all 4 again
    const allCount = await page.evaluate(() => {
      const cards = document.querySelectorAll('div[style*="border-left:3px"]');
      for (const card of cards) {
        if (card.textContent.includes('Active candidates')) {
          return card.querySelector('div[style*="font-size:24px"]')?.textContent?.trim();
        }
      }
      return null;
    });
    expect(allCount).toBe('4');
  });

  test('hiring calendar shows empty state when no interviews', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });

    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    await page.click('#si_Hiring');
    await page.waitForTimeout(2000);
    await page.evaluate(() => { document.querySelectorAll('.ats-tab').forEach(t => { if (t.textContent.trim() === 'Calendar') t.click(); }); });
    await page.waitForTimeout(1500);

    const emptyMsg = await page.textContent('body');
    expect(emptyMsg).toContain('No interviews scheduled this week');
  });

  test('database tab stage dropdown includes rejected and declined options', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Stage Dropdown Co' });
    await createTestCandidate({ client_id: client.id, name: 'Test Candidate', role: 'Engineer', stage: 'interviews' });

    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    await page.click('#si_Hiring');
    await page.waitForTimeout(2000);
    await page.click('.ats-tab:has-text("Database")');
    await page.waitForTimeout(1000);

    // Find the stage dropdown for the candidate
    const stageSelect = page.locator('select.ats-inline-select').first();
    await expect(stageSelect).toBeVisible({ timeout: 5000 });

    // Verify it has Rejected and Declined options
    const options = await stageSelect.locator('option').allTextContents();
    expect(options).toContain('Rejected');
    expect(options).toContain('Declined');

    // Select "Declined" — should show confirmation dialog
    await stageSelect.selectOption('_declined');
    await page.waitForTimeout(500);

    // Themed confirm dialog should appear
    const confirmDialog = page.locator('#confirmModal, .modal-overlay:has-text("declined")');
    await expect(confirmDialog).toBeVisible({ timeout: 3000 });
  });
});
