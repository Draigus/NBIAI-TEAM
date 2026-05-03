// dashboard-server/tests/e2e/documents.spec.js
//
// Playwright E2E smoke test for the Documentation tab.
// Covers: login, navigate to Documentation, create page, type + bold,
// autosave confirmation, NBI block insertion.

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

test.describe('Documentation tab', () => {
  let user, client;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'E2E Client' });
    user = await createTestUser({ role: 'admin' });
  });

  test('admin can create page, type, bold, and see autosave', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    // Wait for initial load to settle
    await page.waitForTimeout(2000);

    // Seed the clients cache and switch to Documentation view
    const clientId = client.id;
    await page.evaluate((cid) => {
      _apiClientsCache['E2E Client'] = { id: cid, name: 'E2E Client' };
      _docsState.clientId = cid;
      switchView('documentation');
    }, clientId);

    // Wait for the Documentation view header to render (TipTap loads async)
    await page.waitForSelector('.docs__hdr', { timeout: 25000 });

    // Create a new page
    await page.locator('.docs__add-root').click();
    await page.waitForSelector('.docs__title', { timeout: 10000 });

    // Type a title
    const titleInput = page.locator('.docs__title');
    await titleInput.fill('e2e test page');

    // Type in the editor
    await page.locator('.ProseMirror').click();
    await page.keyboard.type('Hello world');

    // Bold some text
    await page.locator('.docs__tb-btn[aria-label*="Bold"]').click();
    await page.keyboard.type(' bolded');

    // Wait for autosave
    await expect(page.locator('#docsSavedIndicator')).toContainText('Saved', { timeout: 10000 });

    // Insert NBI block
    await page.locator('.ProseMirror').click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.locator('.docs__tb-btn[aria-label*="NBI"]').click();
    await page.keyboard.type('secret content');
    await expect(page.locator('.docs-nbi-block')).toContainText('secret content');
  });
});
