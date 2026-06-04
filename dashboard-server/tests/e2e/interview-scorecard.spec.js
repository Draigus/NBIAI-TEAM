const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestHiringPosition, createTestCandidate, createTestInterviewQuestion, createTestInterviewConfig } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

test.describe('Interview Scorecard', () => {
  let interviewer, client, position, candidate, config, session, questions;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Scorecard Test Client' });
    interviewer = await createTestUser({ role: 'admin', display_name: 'Test Interviewer' });
    position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer', discipline: 'Engineering' });
    candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'SC Candidate', role: 'Engineer', stage: 'interviews' });

    const q1 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'SC Q1' });
    const q2 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'culture', question_text: 'SC Q2' });
    questions = [q1, q2];

    const result = await createTestInterviewConfig({
      candidate_id: candidate.id,
      position_id: position.id,
      created_by: interviewer.id,
      question_ids: [q1.id, q2.id],
      interviewer_ids: [interviewer.id],
    });
    config = result.config;
    session = result.sessions[0];
  });

  test('deep link opens scorecard with splash screen', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html#interview/' + session.id);
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(interviewer.username);
    await page.locator('#loginPass').fill(interviewer.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    await expect(page.locator('text=SC Candidate')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Begin Scoring')).toBeVisible();
  });

  test('can score questions and submit', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(interviewer.username);
    await page.locator('#loginPass').fill(interviewer.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    await page.evaluate((sid) => { openInterviewScorecard(sid); }, session.id);
    await page.waitForTimeout(500);

    await page.locator('text=Begin Scoring').click();
    await page.waitForTimeout(300);

    await expect(page.locator('text=SC Q1')).toBeVisible();
    await page.locator('.interview-scorecard__score-btn--4').click();
    await page.waitForTimeout(300);

    await page.locator('text=Next →').click();
    await page.waitForTimeout(300);

    await expect(page.locator('text=SC Q2')).toBeVisible();
    await page.locator('.interview-scorecard__score-btn--5').click();
    await page.waitForTimeout(300);

    page.on('dialog', dialog => dialog.accept());
    await page.locator('text=Submit Scorecard').click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=Your scorecard has been submitted')).toBeVisible({ timeout: 5000 });
  });
});
