const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestHiringPosition, createTestCandidate, createTestInterviewQuestion, createTestInterviewConfig } = require('../helpers/fixtures');
const { truncate, pool } = require('../helpers/db');

test.describe('Interview Round Cards Panel', () => {
  let admin, member, client, position, candidate, config1, config2;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Panel Test Client' });
    admin = await createTestUser({ role: 'admin', display_name: 'Admin HM' });
    member = await createTestUser({ role: 'member', username: 'panel_member', display_name: 'Team Member' });
    position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer', discipline: 'Engineering' });
    candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Panel Candidate', role: 'Engineer', stage: 'interviews' });

    const q1 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'Panel Q1' });

    const r1 = await createTestInterviewConfig({
      candidate_id: candidate.id, position_id: position.id, created_by: admin.id,
      round_type: 'Phone Screen', interviewer_name: 'Glen', scheduled_at: '2026-06-01T09:00:00Z',
    });
    config1 = r1.config;

    const r2 = await createTestInterviewConfig({
      candidate_id: candidate.id, position_id: position.id, created_by: admin.id,
      question_ids: [q1.id], interviewer_ids: [admin.id], round_type: 'Technical',
      status: 'active', scheduled_at: '2026-06-05T14:00:00Z',
    });
    config2 = r2.config;

    await pool.query(`INSERT INTO interview_scores (session_id, question_id, score, notes) VALUES ($1, $2, 4, 'Good')`, [r2.sessions[0].id, q1.id]);
    await pool.query(`UPDATE interview_sessions SET status = 'submitted', submitted_at = NOW() WHERE id = $1`, [r2.sessions[0].id]);
  });

  async function loginAs(page, user) {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  }

  test('shows compact round cards that expand on click', async ({ page }) => {
    await loginAs(page, admin);
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidate.id);
    await page.waitForTimeout(1000);

    await page.locator('.candidate-detail__tab[data-tab="interviews"]').click();
    await page.waitForTimeout(300);

    const compact1 = page.locator('.iv-round-compact').first();
    await expect(compact1).toBeVisible({ timeout: 5000 });
    await expect(compact1).toContainText('Phone Screen');

    await compact1.click();
    await page.waitForTimeout(200);

    const expanded1 = page.locator('.iv-round-expanded').first();
    await expect(expanded1).toBeVisible();
    await expect(expanded1).toContainText('Glen');
  });

  test('shows aggregate score after all sessions submitted', async ({ page }) => {
    await loginAs(page, admin);
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidate.id);
    await page.waitForTimeout(1000);

    await page.locator('.candidate-detail__tab[data-tab="interviews"]').click();
    await page.waitForTimeout(300);

    const techCard = page.locator('.iv-round-compact:has-text("Technical")');
    await expect(techCard).toBeVisible({ timeout: 5000 });
    await expect(techCard).toContainText('4.0/5');
  });

  test('admin sees decision bar with advance/hold/reject', async ({ page }) => {
    await loginAs(page, admin);
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidate.id);
    await page.waitForTimeout(1000);

    await page.locator('.candidate-detail__tab[data-tab="interviews"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#cdDecisionBar')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Hiring Decision')).toBeVisible();
    await expect(page.locator('button:has-text("Advance")')).toBeVisible();
    await expect(page.locator('button:has-text("Hold")')).toBeVisible();
    await expect(page.locator('#cdDecisionBar button:has-text("Reject")')).toBeVisible();
  });

  test('member does not see decision bar', async ({ page }) => {
    await loginAs(page, member);
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidate.id);
    await page.waitForTimeout(1000);

    await page.locator('.candidate-detail__tab[data-tab="interviews"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=Hiring Decision')).not.toBeVisible();
  });

  test('admin can advance candidate via decision bar', async ({ page }) => {
    await loginAs(page, admin);
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidate.id);
    await page.waitForTimeout(1000);

    await page.locator('.candidate-detail__tab[data-tab="interviews"]').click();
    await page.waitForTimeout(500);

    await page.locator('#ivBarDecisionNotes').fill('Strong candidate — advancing to offer.');
    await page.locator('button:has-text("Advance")').click();
    await page.waitForTimeout(1000);

    const { rows } = await pool.query('SELECT stage FROM candidates WHERE id = $1', [candidate.id]);
    expect(rows[0].stage).toBe('offer');
  });
});
