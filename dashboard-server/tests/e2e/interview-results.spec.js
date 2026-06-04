const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestHiringPosition, createTestCandidate, createTestInterviewQuestion, createTestInterviewConfig } = require('../helpers/fixtures');
const { truncate, pool } = require('../helpers/db');

test.describe('Interview Results', () => {
  let admin, client, position, candidate, config;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Results Test Client' });
    admin = await createTestUser({ role: 'admin', display_name: 'Admin User' });
    position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer', discipline: 'Engineering' });
    candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Results Candidate', role: 'Engineer', stage: 'interviews' });

    const q1 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'Results Q1' });
    const q2 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'culture', question_text: 'Results Q2' });

    const result = await createTestInterviewConfig({
      candidate_id: candidate.id,
      position_id: position.id,
      created_by: admin.id,
      question_ids: [q1.id, q2.id],
      interviewer_ids: [admin.id],
      status: 'active',
    });
    config = result.config;
    const session = result.sessions[0];

    await pool.query(`INSERT INTO interview_scores (session_id, question_id, score, notes) VALUES ($1, $2, 4, 'Good')`, [session.id, q1.id]);
    await pool.query(`INSERT INTO interview_scores (session_id, question_id, score, notes) VALUES ($1, $2, 5, 'Excellent')`, [session.id, q2.id]);
    await pool.query(`UPDATE interview_sessions SET status = 'submitted', submitted_at = NOW() WHERE id = $1`, [session.id]);
    await pool.query(`UPDATE interview_configs SET status = 'active' WHERE id = $1`, [config.id]);
  });

  test('shows aggregated results with category averages', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(admin.username);
    await page.locator('#loginPass').fill(admin.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    await page.evaluate((cid) => { openInterviewResults(cid); }, config.id);
    await page.waitForTimeout(500);

    await expect(page.locator('text=Results Candidate')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=4.5')).toBeVisible();
  });

  test('can record a decision', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(admin.username);
    await page.locator('#loginPass').fill(admin.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    await page.evaluate((cid) => { openInterviewResults(cid); }, config.id);
    await page.waitForTimeout(500);

    await page.locator('#ivDecisionNotes').fill('Strong candidate, advancing to offer.');
    await page.locator('text=Advance').click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=ADVANCE')).toBeVisible({ timeout: 5000 });
  });
});
