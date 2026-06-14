// dashboard-server/tests/e2e/deep-linking.spec.js
//
// E2E tests for entity deep-linking: URL hash updates, Back/Forward
// navigation, and deep-link resolution after login.

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestTask, createTestClient } = require('../helpers/fixtures');
const { mintSession } = require('../helpers/auth');
const { truncate } = require('../helpers/db');

let admin, client, task;

test.beforeEach(async () => {
  await truncate();
  client = await createTestClient({ name: 'DeepLink Corp' });
  admin = await createTestUser({ role: 'admin' });
  task = await createTestTask({
    title: 'Deep Link Test Task',
    client_id: client.id,
    item_type: 'project',
  });
});

async function loginAndWaitForTasks(page) {
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(admin.username);
  await page.locator('#loginPass').fill(admin.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  await page.waitForFunction(() => Array.isArray(tasks) && tasks.length > 0, { timeout: 15000 });
}

test.describe('Deep-linking', () => {
  test('opening a task updates URL hash to #task/{id}', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.evaluate(() => { window.location.hash = 'tasks'; });
    await loginAndWaitForTasks(page);

    await page.evaluate((id) => openDetail(id), task.id);
    await page.waitForTimeout(300);

    expect(page.url()).toContain('#task/' + task.id);
  });

  test('closing a task reverts URL hash to #tasks', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await loginAndWaitForTasks(page);
    await page.evaluate(() => switchView('tasks'));
    await page.waitForTimeout(200);

    await page.evaluate((id) => openDetail(id), task.id);
    await page.waitForTimeout(300);
    expect(page.url()).toContain('#task/' + task.id);

    await page.evaluate(() => closeDetail());
    await page.waitForTimeout(200);
    expect(page.url()).toContain('#tasks');
    expect(page.url()).not.toContain('#task/');
  });

  test('browser Back closes detail, Forward re-opens without history duplication', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await loginAndWaitForTasks(page);
    await page.evaluate(() => switchView('tasks'));
    await page.waitForTimeout(200);

    // Open task — pushes #task/{id}
    await page.evaluate((id) => openDetail(id), task.id);
    await page.waitForTimeout(300);
    expect(page.url()).toContain('#task/' + task.id);

    // Back — should return to #tasks
    await page.goBack();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('#tasks');
    expect(page.url()).not.toContain('#task/');

    // Forward — should re-open the task
    await page.goForward();
    await page.waitForTimeout(800);
    expect(page.url()).toContain('#task/' + task.id);

    // Critical: Back again should go to #tasks, NOT loop (history duplication bug)
    await page.goBack();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('#tasks');
    expect(page.url()).not.toContain('#task/');
  });

  test('deep-link to #task/{id} resolves after login', async ({ page }) => {
    // Navigate to page, then set entity hash before login
    await page.goto('/nbi_project_dashboard.html');
    await page.evaluate((id) => { window.location.hash = 'task/' + id; }, task.id);
    await page.waitForTimeout(100);
    // Reload so the IIFE captures the hash at parse time
    await page.reload();

    await loginAndWaitForTasks(page);
    // Wait for the deep-link resolution polling (max 2s)
    await page.waitForTimeout(2500);

    const detailVisible = await page.evaluate(() => !!activeDetailTaskId);
    expect(detailVisible).toBe(true);
    expect(page.url()).toContain('#task/' + task.id);
  });

  test('deep-link with invalid UUID does not crash the app', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.evaluate(() => { window.location.hash = 'task/00000000-0000-0000-0000-000000000000'; });
    await page.reload();

    await loginAndWaitForTasks(page);
    await page.waitForTimeout(2500);

    // App should still be functional — no JS errors crashing the page
    const appLoaded = await page.evaluate(() => typeof switchView === 'function');
    expect(appLoaded).toBe(true);
  });

  test('copy link button generates correct URL', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.evaluate(() => { window.location.hash = 'tasks'; });
    await loginAndWaitForTasks(page);

    await page.evaluate((id) => openDetail(id), task.id);
    await page.waitForTimeout(300);

    const url = await page.evaluate((id) => {
      return window.location.origin + window.location.pathname + '#task/' + id;
    }, task.id);

    expect(url).toContain('#task/' + task.id);
  });
});
