const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestInterviewQuestion } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

test.describe('Interview Question Bank Tab', () => {
  let admin, client;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Bank Test Client' });
    admin = await createTestUser({ role: 'admin' });
    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'Bank Eng Q1' });
    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Art', category: 'culture', question_text: 'Bank Art Q1' });
  });

  test('Questions tab is visible for NBI admin users', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(admin.username);
    await page.locator('#loginPass').fill(admin.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    await page.evaluate(() => { switchView('hiring'); });
    await page.waitForTimeout(1000);

    const questionsTab = page.locator('.ats-tab:has-text("Questions")');
    await expect(questionsTab).toBeVisible({ timeout: 5000 });
    await questionsTab.click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=Bank Eng Q1')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Bank Art Q1')).toBeVisible();
  });

  test('discipline filter narrows results', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(admin.username);
    await page.locator('#loginPass').fill(admin.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    await page.evaluate(() => { window._hiringActiveTab = 'questions'; switchView('hiring'); });
    await page.waitForTimeout(1000);

    await page.locator('select').nth(1).selectOption('Engineering');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Bank Eng Q1')).toBeVisible();
    await expect(page.locator('text=Bank Art Q1')).not.toBeVisible();
  });
});
