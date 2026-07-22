// dashboard-server/tests/e2e/onboarding-wizard.spec.js
//
// The Foundation 4 setup wizard (Company -> Team -> First client -> First
// project) is FIRST-RUN setup. It must only fire on an empty workspace,
// never for an admin logging into a system that already has data (regression:
// Glen got the wizard on production, 2026-07-22). The guided tour is per-user
// and is unaffected by workspace data.

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient } = require('../helpers/fixtures');
const { truncate, pool } = require('../helpers/db');

async function login(page, user) {
  await page.goto('/nbi_project_dashboard.html');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });
}

test.describe('setup wizard first-run gating', () => {
  test('admin on a populated workspace never sees the wizard and the flag self-heals', async ({ page }) => {
    await truncate();
    await createTestClient({ name: 'Established Client' });
    const admin = await createTestUser({
      role: 'admin',
      display_name: 'Returning Admin',
      // tour done, setup flag never written — Glen's production state
      ui_prefs: { tour_completed: true },
    });

    await login(page, admin);
    await page.waitForTimeout(2500);

    await expect(page.locator('#wizOverlay')).toHaveCount(0);

    // The flag quietly self-heals so the check never re-fires
    await expect.poll(async () => {
      const { rows } = await pool.query('SELECT ui_prefs FROM users WHERE id = $1', [admin.id]);
      return rows[0]?.ui_prefs?.setup_completed === true;
    }, { timeout: 5000 }).toBe(true);
  });

  test('admin on an empty workspace still gets the wizard', async ({ page }) => {
    await truncate();
    const admin = await createTestUser({
      role: 'admin',
      display_name: 'Fresh Admin',
      ui_prefs: { tour_completed: true },
    });

    await login(page, admin);

    await expect(page.locator('#wizOverlay')).toBeVisible({ timeout: 10000 });
  });
});
