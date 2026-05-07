// Verification tests for the 2026-05-07 bug batch fixes.

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestTask, createTestClient } = require('../helpers/fixtures');
const { pool, truncate } = require('../helpers/db');

test.setTimeout(60000);

test('bug batch: sort order + auto dates + year validation + warnings', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const client = await createTestClient({ name: 'VerifyClient' });

  // Insert projects with identical created_at to trigger the tiebreaker
  const ts = '2026-05-07T00:00:00.000Z';
  for (const title of ['Charlie Project', 'Alpha Project', 'Bravo Project']) {
    await pool.query(
      `INSERT INTO tasks (title, item_type, client_id, status, created_at) VALUES ($1, 'project', $2, 'Not started', $3)`,
      [title, client.id, ts]
    );
  }

  const feature = await createTestTask({ title: 'DateFeature', item_type: 'feature', client_id: client.id });
  await createTestTask({ title: 'ChildStory', item_type: 'story', client_id: client.id, parent_id: feature.id, due_date: '2026-06-30' });
  await createTestTask({ title: 'OverdueTask', item_type: 'task', client_id: client.id, status: 'In progress', due_date: '2026-01-01', assignees: [user.display_name] });

  await page.goto('/nbi_project_dashboard.html');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

  await page.evaluate(() => { if (typeof switchView === 'function') switchView('tasks'); });

  // Expand all items
  await page.evaluate(() => {
    return new Promise(resolve => {
      setTimeout(() => {
        if (typeof expandToLevel === 'function') expandToLevel('task');
        setTimeout(resolve, 1000);
      }, 1000);
    });
  });

  // FIX 1: Sort order — same created_at, should be alphabetical
  const titles = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.task-row .task-row__title'))
      .map(el => el.textContent.trim());
  });
  const a = titles.indexOf('Alpha Project');
  const b = titles.indexOf('Bravo Project');
  const c = titles.indexOf('Charlie Project');
  expect(a).toBeGreaterThanOrEqual(0);
  expect(a).toBeLessThan(b);
  expect(b).toBeLessThan(c);
  await page.screenshot({ path: 'test-results/fix1-sort-order.png' });

  // FIX 4: Year validation — invalid year should be rejected
  const yearResult = await page.evaluate(() => {
    const t = tasks.find(t => t.title === 'Alpha Project');
    if (!t) return { error: 'task not found' };
    const before = t.dueDate;
    updateTask(t.id, 'dueDate', '20266-05-07');
    return { before, after: t.dueDate, blocked: t.dueDate !== '20266-05-07' };
  });
  expect(yearResult.blocked).toBe(true);

  // FIX 6: Auto dates — feature with child should have disabled date inputs
  await page.evaluate((fid) => {
    if (typeof openDetailOverlay === 'function') openDetailOverlay(fid);
  }, feature.id);
  await page.evaluate(() => new Promise(r => setTimeout(r, 1000)));
  const disabledDates = await page.evaluate(() => {
    const panel = document.getElementById('detailPanel');
    if (!panel) return -1;
    return panel.querySelectorAll('input[type="date"][disabled]').length;
  });
  expect(disabledDates).toBeGreaterThanOrEqual(1);
  await page.screenshot({ path: 'test-results/fix6-auto-dates.png' });

  await page.evaluate(() => { if (typeof closeDetail === 'function') closeDetail(); });

  // FIX 8: Warning timestamps
  await page.evaluate(() => {
    const btn = document.getElementById('headerAlertsBtn');
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));
  const warningMeta = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.warn-item__meta')).map(el => el.textContent);
  });
  if (warningMeta.length > 0) {
    const hasTimestamp = warningMeta.some(t => /\d+[dhm] ago|just now|\d+ \w{3}/.test(t));
    expect(hasTimestamp).toBe(true);
    await page.screenshot({ path: 'test-results/fix8-warnings.png' });
  }

  await page.screenshot({ path: 'test-results/dashboard-healthy.png' });
});
