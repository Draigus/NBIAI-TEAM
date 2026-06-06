const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestHiringPosition, createTestCandidate, createTestInterviewQuestion } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

test.describe('Interview Question Picker', () => {
  let admin, client, position, candidate;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Picker Test Client' });
    admin = await createTestUser({ role: 'admin' });
    position = await createTestHiringPosition({ client_id: client.id, title: 'Senior Engineer', discipline: 'Engineering' });
    candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Test Candidate', role: 'Engineer', stage: 'interviews' });

    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'Eng technical Q' });
    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'culture', question_text: 'Eng culture Q' });
    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Art', category: 'technical', question_text: 'Art technical Q' });
  });

  test('shows discipline-grouped questions with position discipline expanded', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(admin.username);
    await page.locator('#loginPass').fill(admin.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    // Navigate to hiring view and open candidate detail first (required for the config modal overlay)
    await page.evaluate(() => { switchView('hiring'); });
    await page.waitForTimeout(500);
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidate.id);
    await page.waitForSelector('#candidateDetailPanel.open', { timeout: 5000 });

    await page.evaluate(({ cid, clid, pid }) => {
      openInterviewConfig(cid, clid, pid);
    }, { cid: candidate.id, clid: client.id, pid: position.id });
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Eng technical Q')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Eng culture Q')).toBeVisible();
    await expect(page.locator('text=Art technical Q')).not.toBeVisible();
  });
});
