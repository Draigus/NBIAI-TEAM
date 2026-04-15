// dashboard-server/tests/e2e/auth.spec.js
//
// Retroactive E2E test of the login → dashboard → logout flow.
// Creates a test user via the fixtures helper (shared with the
// vitest unit suite), then drives the UI through Playwright.

const { test, expect } = require('@playwright/test');
const { createTestUser } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

test('user can log in via the form and see the dashboard', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });

  await page.goto('/nbi_project_dashboard.html');
  // Wait for the login screen to be visible (the app shows it once
  // it determines there's no valid session)
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });

  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  await page.locator('#loginBtn').click();

  // After login, the login screen is hidden and the main app shows.
  // Use the loginScreen visibility flip as the success signal.
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
});

test('login with wrong password keeps user on the login screen', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });

  await page.goto('/nbi_project_dashboard.html');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });

  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill('definitely_wrong');
  await page.locator('#loginBtn').click();

  // Login screen should still be visible after the failed attempt
  await page.waitForTimeout(500);
  await expect(page.locator('#loginScreen')).toBeVisible();
});
