// dashboard-server/tests/e2e/warnings-light-theme.spec.js
//
// O3: visual QA pass for the warnings sidebar in light theme.
// Captures four screenshots (dark/light × closed/open) at desktop width
// so any contrast or hover regressions are visible side-by-side.
// Tagged @mobile-audit so it runs alongside the other capture spec.

const { test } = require('@playwright/test');
const path = require('path');
const { createTestUser, createTestTask } = require('../helpers/fixtures');
const { truncate, pool } = require('../helpers/db');

const SHOT_DIR = path.resolve(__dirname, '../../../projects/nbi_dashboard/deliverables/2026-04-15-warnings-light-theme');

async function loginAs(page, username, rawPassword) {
  // Use #tasks to avoid dashboard infinite milestone loop on empty DB
  await page.goto('/nbi_project_dashboard.html#tasks');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(username);
  await page.locator('#loginPass').fill(rawPassword);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  // NOTE: page.waitForFunction's explicit timeout param is ignored in
  // Playwright 1.59 (always uses actionTimeout from config), so we use
  // waitForSelector which correctly respects its timeout parameter.
  await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });
}

test.describe('@mobile-audit warnings sidebar light theme QA', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('capture warnings sidebar dark + light', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });

    // Seed warning-worthy tasks: overdue, imminent, and blocked
    // assignees must include the test user's display_name so they own them
    await pool.query(
      `INSERT INTO tasks (title, status, priority, item_type, assignees, due_date, position)
       VALUES ('Overdue 5 days', 'In progress', 'High', 'project', ARRAY[$1::text], (CURRENT_DATE - 5)::text, 0),
              ('Due tomorrow',    'In progress', 'High', 'project', ARRAY[$1::text], (CURRENT_DATE + 1)::text, 1),
              ('Blocked task',    'Blocked',     'High', 'project', ARRAY[$1::text], (CURRENT_DATE + 7)::text, 2),
              ('Critical late',   'In progress', 'High', 'project', ARRAY[$1::text], (CURRENT_DATE - 14)::text, 3)`,
      [user.display_name]
    );

    await loginAs(page, user.username, user.raw_password);

    // ---- DARK THEME (default) ----
    await page.evaluate(() => { if (typeof setTheme === 'function') setTheme('matrix'); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOT_DIR, '01-dark-closed.png'), fullPage: false });

    // Open the warnings panel
    await page.evaluate(() => { if (typeof toggleWarnAlertSidebar === 'function') toggleWarnAlertSidebar(); });
    await page.waitForSelector('.warn-alert-panel.open', { timeout: 5000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOT_DIR, '02-dark-open.png'), fullPage: false });
    // Close
    await page.evaluate(() => { if (typeof toggleWarnAlertSidebar === 'function') toggleWarnAlertSidebar(); });
    await page.waitForTimeout(200);

    // ---- LIGHT THEME ----
    await page.evaluate(() => { if (typeof setTheme === 'function') setTheme('light'); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOT_DIR, '03-light-closed.png'), fullPage: false });

    await page.evaluate(() => { if (typeof toggleWarnAlertSidebar === 'function') toggleWarnAlertSidebar(); });
    await page.waitForSelector('.warn-alert-panel.open', { timeout: 5000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOT_DIR, '04-light-open.png'), fullPage: false });

    // Hover state on a warning item — useful for spotting hover-bg contrast issues
    const firstItem = page.locator('.warn-item').first();
    if (await firstItem.count() > 0) {
      await firstItem.hover();
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(SHOT_DIR, '05-light-open-hover.png'), fullPage: false });
    }
  });
});
