// dashboard-server/tests/e2e/quick-add.spec.js
//
// E2E specs for the inline quick-add feature.
// Verifies: plus button appears on hover, form opens, item creates inline,
// form stays open for rapid entry, escape closes, empty parent gets container.

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures');
const { truncate, pool } = require('../helpers/db');

async function loginAs(page, username, rawPassword) {
  await page.goto('/nbi_project_dashboard.html#tasks');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(username);
  await page.locator('#loginPass').fill(rawPassword);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });
}

// The Projects tree default-collapses to client level on every visit
// (_tasksInitialCollapse in nbi-tasks.js), so no .task-row exists until the
// tree is expanded. Mirrors the "Expand to: Tasks (all)" control.
async function openTasksExpanded(page) {
  await page.evaluate(() => switchView('tasks'));
  await page.waitForTimeout(500);
  await page.evaluate(() => expandToLevel('task'));
  await page.waitForSelector('.task-row', { state: 'attached', timeout: 10000 });
}

test.describe('Inline Quick-Add', () => {
  let user, client, project, featureTask;

  test.beforeEach(async () => {
    await truncate();
    user = await createTestUser({ username: 'qatest', password: 'test123', role: 'admin', display_name: 'QA Tester' });
    client = await createTestClient({ name: 'Test Client' });
    project = await createTestTask({ title: 'Test Project', item_type: 'project', client_id: client.id });
    featureTask = await createTestTask({ title: 'Test Feature', item_type: 'feature', parent_id: project.id, client_id: client.id });
  });

  test.afterEach(async () => { await truncate(); });

  test('plus button appears on feature row hover and opens form', async ({ page }) => {
    await loginAs(page, user.username, user.raw_password);
    await openTasksExpanded(page);

    const featureRow = page.locator(`.task-row[data-task-id="${featureTask.id}"]`);
    await expect(featureRow).toBeVisible();

    const plusBtn = featureRow.locator('.quick-add-btn');
    await expect(plusBtn).toHaveCSS('opacity', '0');

    await featureRow.hover();
    await expect(plusBtn).toHaveCSS('opacity', '1');

    await plusBtn.click();
    const form = page.locator('#quickAddForm');
    await expect(form).toBeVisible();

    const nameInput = page.locator('#qaName');
    await expect(nameInput).toBeFocused();
  });

  test('submitting creates item inline and keeps form open', async ({ page }) => {
    await loginAs(page, user.username, user.raw_password);
    await openTasksExpanded(page);

    const featureRow = page.locator(`.task-row[data-task-id="${featureTask.id}"]`);
    await featureRow.hover();
    await featureRow.locator('.quick-add-btn').click();

    await page.locator('#qaName').fill('My New Story');
    await page.locator('#qaName').press('Enter');

    const newRow = page.locator('.task-row:has-text("My New Story")');
    await expect(newRow).toBeVisible();

    await expect(page.locator('#quickAddForm')).toBeVisible();

    const nameInput = page.locator('#qaName');
    await expect(nameInput).toHaveValue('');
    await expect(nameInput).toBeFocused();
  });

  test('escape closes form without creating', async ({ page }) => {
    await loginAs(page, user.username, user.raw_password);
    await openTasksExpanded(page);

    const featureRow = page.locator(`.task-row[data-task-id="${featureTask.id}"]`);
    await featureRow.hover();
    await featureRow.locator('.quick-add-btn').click();
    await expect(page.locator('#quickAddForm')).toBeVisible();

    await page.locator('#qaName').press('Escape');
    await expect(page.locator('#quickAddForm')).not.toBeVisible();
  });

  test('empty name shows validation error', async ({ page }) => {
    await loginAs(page, user.username, user.raw_password);
    await openTasksExpanded(page);

    const featureRow = page.locator(`.task-row[data-task-id="${featureTask.id}"]`);
    await featureRow.hover();
    await featureRow.locator('.quick-add-btn').click();

    await page.locator('#qaName').press('Enter');

    await expect(page.locator('#quickAddForm')).toBeVisible();
    await expect(page.locator('#qaName')).toHaveClass(/quick-add-form__error/);
  });

  test('only one form open at a time', async ({ page }) => {
    // Create a second feature
    await createTestTask({ title: 'Second Feature', item_type: 'feature', parent_id: project.id, client_id: client.id });

    await loginAs(page, user.username, user.raw_password);
    await openTasksExpanded(page);

    const rows = page.locator('.task-row:has(.quick-add-btn)');
    const first = rows.first();
    await first.hover();
    await first.locator('.quick-add-btn').click();
    await expect(page.locator('#quickAddForm')).toBeVisible();

    const second = rows.nth(1);
    await second.hover();
    await second.locator('.quick-add-btn').click();
    const forms = page.locator('#quickAddForm');
    await expect(forms).toHaveCount(1);
  });

  test('plus on empty parent creates container and adds item', async ({ page }) => {
    // featureTask has no stories, so no children container exists
    await loginAs(page, user.username, user.raw_password);
    await openTasksExpanded(page);

    const featureRow = page.locator(`.task-row[data-task-id="${featureTask.id}"]`);
    await featureRow.hover();
    await featureRow.locator('.quick-add-btn').click();

    await page.locator('#qaName').fill('Story Under Empty Feature');
    await page.locator('#qaName').press('Enter');

    const newRow = page.locator('.task-row:has-text("Story Under Empty Feature")');
    await expect(newRow).toBeVisible();
  });
});
