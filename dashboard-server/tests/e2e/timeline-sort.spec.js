// dashboard-server/tests/e2e/timeline-sort.spec.js
//
// The filter-bar sort dropdown must reorder PROJECT rows in the Timeline
// (gantt) sub-view, not just the tree/board views. Regression for Glen's
// 2026-07-23 report: "the sort order is there, but it's not yet wired to
// the projects in the timeline view."

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestTask, createTestClient } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

// Due-date order: Alpha (Oct) → Bravo (Nov) → Charlie (Dec)
// Priority order: Bravo (Urgent) → Charlie (Medium) → Alpha (Low)
// Due-desc order: Charlie → Bravo → Alpha
// The three orders are pairwise different, so a hard-coded due-date sort
// cannot pass the priority or due-desc assertions by accident.
const PROJECTS = [
  { title: 'Alpha Sort Project', due_date: '2026-10-01', priority: 'Low' },
  { title: 'Bravo Sort Project', due_date: '2026-11-01', priority: 'Urgent' },
  { title: 'Charlie Sort Project', due_date: '2026-12-01', priority: 'Medium' },
];

async function labelOrder(page) {
  const texts = await page.locator('.gantt__row-label').allInnerTexts();
  const order = [];
  for (const t of texts) {
    for (const p of PROJECTS) {
      if (t.includes(p.title)) order.push(p.title);
    }
  }
  return order;
}

test('timeline view projects follow the sort dropdown', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const client = await createTestClient({ name: 'Timeline Sort Client' });
  for (const p of PROJECTS) {
    await createTestTask({ ...p, item_type: 'project', client_id: client.id });
  }

  await page.goto('/nbi_project_dashboard.html#tasks');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });
  await page.evaluate(() => { if (typeof switchView === 'function') switchView('tasks'); });

  // Switch to the Timeline sub-view
  await page.locator('.task-subview-btn', { hasText: 'Timeline' }).click();
  await expect(page.locator('.gantt__row-label', { hasText: 'Alpha Sort Project' })).toBeAttached({ timeout: 15000 });

  const sortSelect = () => page.locator('.filter-bar select').filter({ hasText: 'Recently Updated' });

  // Default: due date earliest
  expect(await labelOrder(page)).toEqual(['Alpha Sort Project', 'Bravo Sort Project', 'Charlie Sort Project']);

  // Priority (highest): Urgent → Medium → Low
  await sortSelect().selectOption('priority');
  await expect(page.locator('.gantt__row-label', { hasText: 'Bravo Sort Project' })).toBeAttached({ timeout: 10000 });
  expect(await labelOrder(page)).toEqual(['Bravo Sort Project', 'Charlie Sort Project', 'Alpha Sort Project']);

  // Due Date (latest): reversed
  await sortSelect().selectOption('due-desc');
  await expect(page.locator('.gantt__row-label', { hasText: 'Charlie Sort Project' })).toBeAttached({ timeout: 10000 });
  expect(await labelOrder(page)).toEqual(['Charlie Sort Project', 'Bravo Sort Project', 'Alpha Sort Project']);

  // Back to default restores due date earliest
  await sortSelect().selectOption('default');
  await expect(page.locator('.gantt__row-label', { hasText: 'Alpha Sort Project' })).toBeAttached({ timeout: 10000 });
  expect(await labelOrder(page)).toEqual(['Alpha Sort Project', 'Bravo Sort Project', 'Charlie Sort Project']);

  expect(errors).toEqual([]);
});
