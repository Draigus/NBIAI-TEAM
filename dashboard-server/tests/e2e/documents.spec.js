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

    await page.goto('/nbi_project_dashboard.html#tasks');
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
      _apiClientsCache['E2E Client'] = { id: cid, name: 'E2E Client', has_active_work: true };
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
    await page.waitForSelector('.docs-nbi-block', { timeout: 5000 });
    await page.locator('.docs-nbi-block').click();
    await page.keyboard.type('secret content');
    await expect(page.locator('.docs-nbi-block')).toContainText('secret content');
  });

  test('right-click shows context menu, hide/unhide toggles page visibility', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/nbi_project_dashboard.html#tasks');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(2000);

    const clientId = client.id;
    await page.evaluate((cid) => {
      _apiClientsCache['E2E Client'] = { id: cid, name: 'E2E Client', has_active_work: true };
      _docsState.clientId = cid;
      switchView('documentation');
    }, clientId);

    await page.waitForSelector('.docs__hdr', { timeout: 25000 });

    // Create a page
    await page.locator('.docs__add-root').click();
    await page.waitForSelector('.docs__title', { timeout: 10000 });
    const titleInput = page.locator('.docs__title');
    await titleInput.fill('Context Menu Test');
    await page.waitForTimeout(1000);

    // Right-click the tree item
    const treeItem = page.locator('.docs__tree-li').first();
    await treeItem.click({ button: 'right' });

    // Context menu should appear
    await expect(page.locator('#docsCtxMenu')).toHaveClass(/docs__ctx-menu--open/);

    // Click Hide
    await page.locator('.docs__ctx-item[data-action="hide"]').click();
    await page.waitForTimeout(1500);

    // Page should now have hidden styling
    await expect(page.locator('.docs__tree-li--hidden')).toBeVisible();

    // Right-click again — label should say "Unhide"
    const hiddenItem = page.locator('.docs__tree-li').first();
    await hiddenItem.click({ button: 'right' });
    await expect(page.locator('.docs__ctx-item[data-action="hide"]')).toContainText('Unhide');

    // Click Unhide
    await page.locator('.docs__ctx-item[data-action="hide"]').click();
    await page.waitForTimeout(1500);

    // Hidden styling should be gone
    await expect(page.locator('.docs__tree-li--hidden')).toHaveCount(0);
  });

  test('right-click rename allows inline title editing', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/nbi_project_dashboard.html#tasks');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(2000);

    const clientId = client.id;
    await page.evaluate((cid) => {
      _apiClientsCache['E2E Client'] = { id: cid, name: 'E2E Client', has_active_work: true };
      _docsState.clientId = cid;
      switchView('documentation');
    }, clientId);

    await page.waitForSelector('.docs__hdr', { timeout: 25000 });

    // Create a page
    await page.locator('.docs__add-root').click();
    await page.waitForSelector('.docs__title', { timeout: 10000 });

    // Right-click the last tree item (the newly created page)
    const treeItem = page.locator('.docs__tree-li').last();
    await treeItem.click({ button: 'right' });
    await page.locator('.docs__ctx-item[data-action="rename"]').click();

    // Should see an inline input
    const renameInput = page.locator('.docs__tree-rename');
    await expect(renameInput).toBeVisible();
    await renameInput.fill('Renamed Page');
    await renameInput.press('Enter');

    // Wait for save and tree re-render
    await page.waitForTimeout(2500);

    // Tree should contain the new title somewhere
    await expect(page.locator('.docs__tree-row span').filter({ hasText: 'Renamed Page' })).toBeVisible({ timeout: 10000 });
  });
});
