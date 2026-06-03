const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestHiringPosition, createTestCandidate, createTestInterviewQuestion, createTestInterviewConfig } = require('../helpers/fixtures');
const { truncate, pool } = require('../helpers/db');
const { mintSession } = require('../helpers/auth');

test.describe('Interview UAT — Persona A: Hiring Manager (Admin)', () => {
  let hm, client, position, candidateWithRounds, candidateAllDone, candidateNew;
  let techConfig, phoneConfig;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'UAT Client' });
    hm = await createTestUser({ role: 'admin', display_name: 'Glen (HM)', username: 'uat_hm' });
    const interviewer = await createTestUser({ role: 'member', display_name: 'Stavros', username: 'uat_stavros' });
    position = await createTestHiringPosition({ client_id: client.id, title: 'Game Designer', discipline: 'Design' });

    candidateWithRounds = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Alice Active', role: 'Game Designer', stage: 'interviews' });
    candidateAllDone = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Bob Complete', role: 'Game Designer', stage: 'interviews' });
    candidateNew = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Charlie New', role: 'Game Designer', stage: 'interviews' });

    const q1 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Design', category: 'technical', question_text: 'Describe your design process' });
    const q2 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Design', category: 'culture', question_text: 'How do you handle feedback?' });

    const r1 = await createTestInterviewConfig({
      candidate_id: candidateWithRounds.id, position_id: position.id, created_by: hm.id,
      round_type: 'Phone Screen', interviewer_name: 'Glen', outcome: 'passed',
      scheduled_at: '2026-05-28T09:00:00Z',
    });
    phoneConfig = r1.config;

    const r2 = await createTestInterviewConfig({
      candidate_id: candidateWithRounds.id, position_id: position.id, created_by: hm.id,
      question_ids: [q1.id, q2.id], interviewer_ids: [interviewer.id],
      round_type: 'Technical', status: 'active', scheduled_at: '2026-06-05T14:00:00Z',
    });
    techConfig = r2.config;
    await pool.query(`INSERT INTO interview_scores (session_id, question_id, score, notes) VALUES ($1, $2, 4, 'Solid')`, [r2.sessions[0].id, q1.id]);
    await pool.query(`INSERT INTO interview_scores (session_id, question_id, score, notes) VALUES ($1, $2, 5, 'Excellent')`, [r2.sessions[0].id, q2.id]);
    await pool.query(`UPDATE interview_sessions SET status = 'submitted', submitted_at = NOW() WHERE id = $1`, [r2.sessions[0].id]);

    const r3 = await createTestInterviewConfig({
      candidate_id: candidateAllDone.id, position_id: position.id, created_by: hm.id,
      round_type: 'Phone Screen', interviewer_name: 'Glen', outcome: 'passed',
      scheduled_at: '2026-05-25T09:00:00Z',
    });
    const r4 = await createTestInterviewConfig({
      candidate_id: candidateAllDone.id, position_id: position.id, created_by: hm.id,
      question_ids: [q1.id], interviewer_ids: [hm.id],
      round_type: 'Cultural', status: 'active', scheduled_at: '2026-05-30T10:00:00Z',
    });
    await pool.query(`INSERT INTO interview_scores (session_id, question_id, score, notes) VALUES ($1, $2, 3, 'OK')`, [r4.sessions[0].id, q1.id]);
    await pool.query(`UPDATE interview_sessions SET status = 'submitted', submitted_at = NOW() WHERE id = $1`, [r4.sessions[0].id]);
  });

  async function loginAs(page, user) {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  }

  test('HM sees round cards for candidate with interviews', async ({ page }) => {
    await loginAs(page, hm);
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidateWithRounds.id);
    await page.waitForTimeout(1000);
    await page.locator('.candidate-detail__tab[data-tab="interviews"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('.iv-round-compact')).toHaveCount(2);
    await expect(page.locator('.iv-round-compact').first()).toContainText('Phone Screen');
    await expect(page.locator('.iv-round-compact').nth(1)).toContainText('Technical');
  });

  test('HM expands Technical round and sees blind score summary', async ({ page }) => {
    await loginAs(page, hm);
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidateWithRounds.id);
    await page.waitForTimeout(1000);
    await page.locator('.candidate-detail__tab[data-tab="interviews"]').click();
    await page.waitForTimeout(300);

    const techCard = page.locator('.iv-round-compact:has-text("Technical")');
    await techCard.click();
    await page.waitForTimeout(200);

    const expanded = page.locator('.iv-round-expanded:has-text("Technical")');
    await expect(expanded).toBeVisible();
    await expect(expanded).toContainText('1 of 1 interviewers scored');
  });

  test('HM sees empty state for new candidate and can add round', async ({ page }) => {
    await loginAs(page, hm);
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidateNew.id);
    await page.waitForTimeout(1000);
    await page.locator('.candidate-detail__tab[data-tab="interviews"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('text=No interviews scheduled')).toBeVisible();
    await expect(page.locator('text=+ Add Round')).toBeVisible();
  });

  test('HM can advance candidate via decision bar', async ({ page }) => {
    await loginAs(page, hm);
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidateAllDone.id);
    await page.waitForTimeout(1000);
    await page.locator('.candidate-detail__tab[data-tab="interviews"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=Hiring Decision')).toBeVisible({ timeout: 5000 });
    await page.locator('#ivBarDecisionNotes').fill('Strong portfolio, advancing to offer stage.');
    await page.locator('button:has-text("Advance")').click();
    await page.waitForTimeout(1000);

    const { rows } = await pool.query('SELECT stage FROM candidates WHERE id = $1', [candidateAllDone.id]);
    expect(rows[0].stage).toBe('offer');
  });
});

test.describe('Interview UAT — Persona B: Interviewer (Member)', () => {
  let hm, interviewer, client, position, candidate, config, session;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'UAT Interviewer Client' });
    hm = await createTestUser({ role: 'admin', display_name: 'HM Admin', username: 'uat_hm2' });
    interviewer = await createTestUser({ role: 'member', display_name: 'Interview Member', username: 'uat_iv' });
    position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer', discipline: 'Engineering' });
    candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Diana Interviewee', role: 'Engineer', stage: 'interviews' });

    const q1 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'Describe a complex system you built' });

    const r = await createTestInterviewConfig({
      candidate_id: candidate.id, position_id: position.id, created_by: hm.id,
      question_ids: [q1.id], interviewer_ids: [interviewer.id],
      round_type: 'Technical', status: 'active', scheduled_at: '2026-06-10T10:00:00Z',
    });
    config = r.config;
    session = r.sessions[0];
  });

  async function loginAs(page, user) {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  }

  test('interviewer sees round cards but no decision bar', async ({ page }) => {
    await loginAs(page, interviewer);
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidate.id);
    await page.waitForTimeout(1000);
    await page.locator('.candidate-detail__tab[data-tab="interviews"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.iv-round-compact')).toHaveCount(1);
    await expect(page.locator('text=Hiring Decision')).not.toBeVisible();
  });

  test('interviewer can open scorecard via evaluate', async ({ page }) => {
    await loginAs(page, interviewer);
    await page.evaluate((sid) => { openInterviewScorecard(sid); }, session.id);
    await page.waitForSelector('#interviewScorecardView', { state: 'visible', timeout: 10000 });
    await expect(page.locator('text=Begin Scoring')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Interview UAT — Persona C: Client User', () => {
  let clientUser, client, position, candidate;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'UAT Client User Corp' });
    const admin = await createTestUser({ role: 'admin', username: 'uat_admin3' });
    clientUser = await createTestUser({ role: 'member', username: 'uat_client', client_id: client.id, client_role: 'member' });
    position = await createTestHiringPosition({ client_id: client.id, title: 'Artist', discipline: 'Art' });
    candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Eve Client Candidate', role: 'Artist', stage: 'interviews' });

    await createTestInterviewConfig({
      candidate_id: candidate.id, position_id: position.id, created_by: admin.id,
      round_type: 'Phone Screen', interviewer_name: 'Glen', outcome: 'passed',
    });
  });

  async function loginAs(page, user) {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  }

  test('client user sees interviews tab but no Add Round button, no decision bar', async ({ page }) => {
    await loginAs(page, clientUser);
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidate.id);
    await page.waitForTimeout(1000);
    await page.locator('.candidate-detail__tab[data-tab="interviews"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=+ Add Round')).not.toBeVisible();
    await expect(page.locator('text=Hiring Decision')).not.toBeVisible();
  });
});
