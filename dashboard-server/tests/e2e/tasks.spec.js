// dashboard-server/tests/e2e/tasks.spec.js
//
// Retroactive E2E test that creates a task via the API, then logs
// into the UI as the test admin and verifies the task appears in
// the rendered DOM somewhere on the tasks view.
//
// "Feature alive" smoke check, not exhaustive CRUD coverage.

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestTask, createTestClient } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

test('newly created project task appears on the dashboard after login', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const client = await createTestClient({ name: 'E2E Test Client' });
  const task = await createTestTask({
    title: 'E2E spec test project',
    item_type: 'project',
    client_id: client.id,
  });

  // Use #tasks to avoid dashboard infinite milestone loop on empty DB
  await page.goto('/nbi_project_dashboard.html#tasks');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  // Wait for the post-login data load including /api/sync/load (or whatever
  // returns the tasks). We can't predict the exact endpoint, so we just
  // wait for network idle after login completes.
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

  // Wait for post-login renderAll() to complete before switching views.
  // The sidebar items appearing proves the async load chain finished.
  await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });

  // Switch to the tasks view explicitly so the task is rendered.
  // Don't waitForLoadState('networkidle') — the dashboard polls and
  // never goes idle, so the assertion timeout drives the wait instead.
  await page.evaluate(() => { if (typeof switchView === 'function') switchView('tasks'); });

  // The task title should be present in the DOM somewhere — could be in
  // a card, a sidebar, a dropdown <option>, etc. Presence proves the
  // post-login data load fetched and rendered the task. We don't assert
  // visibility because some renderings (parent-task <select> dropdowns)
  // are hidden until the user opens a panel.
  await expect(page.getByText(task.title).first()).toBeAttached({ timeout: 10000 });
});
