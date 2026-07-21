// dashboard-server/tests/e2e/ats-workflow.spec.js
//
// ATS interview workflow regression suite. Covers the single-flow interview
// wizard (Wave 2 redesign) plus the scorecard fixes from the 2026-06-09
// walkthrough:
//   - Bug 1/2: scorecard was a blank page with dead scoring buttons
//   - Bug 3: configure-after-create produced duplicate rounds
//   - Wizard: one panel (type + schedule + questions + interviewers + send)
//   - Inline discipline prompt persists to the position and filters questions
//
// Tests run sequentially (workers: 1) and share fixture state per describe.

const { test, expect } = require('@playwright/test');
const {
  createTestUser, createTestClient, createTestHiringPosition,
  createTestCandidate, createTestInterviewQuestion,
} = require('../helpers/fixtures');
const { truncate, pool } = require('../helpers/db');

async function login(page, user) {
  await page.goto('/nbi_project_dashboard.html#hiring');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });
}

async function openHiringAndWizard(page, candidateId) {
  await page.evaluate(() => switchView('hiring'));
  await page.waitForTimeout(1500);
  await page.evaluate((id) => openAddRoundModal(id), candidateId);
  await page.waitForSelector('#ivAddSubmitBtn', { state: 'attached', timeout: 10000 });
  await page.waitForTimeout(500);
}

test.describe('ATS workflow — interview wizard end-to-end', () => {
  let admin, client, audioPosition, noDiscPosition;
  let wizardCandidate, discCandidate, phoneCandidate;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'ATS Wizard Client' });
    admin = await createTestUser({ role: 'admin', display_name: 'ATS Admin' });
    audioPosition = await createTestHiringPosition({ client_id: client.id, title: 'Audio Lead', discipline: 'Audio' });
    noDiscPosition = await createTestHiringPosition({ client_id: client.id, title: 'Concept Artist' }); // no discipline

    for (const cat of ['culture', 'technical', 'collaboration']) {
      await createTestInterviewQuestion({ client_id: client.id, discipline: 'Audio', category: cat, question_text: `Audio ${cat} wizard question` });
    }
    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Art', category: 'technical', question_text: 'Art discipline filter question' });

    wizardCandidate = await createTestCandidate({ client_id: client.id, position_id: audioPosition.id, name: 'Wizard Flow Candidate', role: 'Audio Designer', stage: 'interviews' });
    discCandidate = await createTestCandidate({ client_id: client.id, position_id: noDiscPosition.id, name: 'Discipline Prompt Candidate', role: 'Concept Artist', stage: 'interviews' });
    phoneCandidate = await createTestCandidate({ client_id: client.id, position_id: audioPosition.id, name: 'Phone Screen Candidate', role: 'Audio Designer', stage: 'sourcing' });
  });

  test('scored round sends in one flow with no duplicate configs', async ({ page }) => {
    await login(page, admin);
    await openHiringAndWizard(page, wizardCandidate.id);

    // Switch to Technical — scored sections appear, send disabled until selections
    await page.locator('#ivAddType').selectOption('Technical');
    await expect(page.locator('#ivwScoredSections')).toBeVisible();
    await expect(page.locator('#ivAddSubmitBtn')).toHaveText('Send Interviews');
    await expect(page.locator('#ivAddSubmitBtn')).toBeDisabled();

    await page.locator('#ivAddDate').fill('2026-07-01');
    await page.locator('#ivAddTime').fill('14:00');
    await page.locator('#ivAddLocation').fill('Remote — Teams');

    // Question list is filtered to the position discipline
    await expect(page.locator('#ivwQuestionList')).toContainText('Showing questions for:');
    await expect(page.locator('#ivwQuestionList')).toContainText('Audio');

    // Select all 3 Audio questions
    const qChecks = page.locator('#ivwQuestionList input[type=checkbox]');
    const qCount = await qChecks.count();
    expect(qCount).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < 3; i++) await qChecks.nth(i).check();

    // Filter interviewers by typing letter-by-letter (regression: input must keep focus)
    const filter = page.locator('#ivwScoredSections input[placeholder="Filter by name..."]');
    await filter.click();
    await filter.pressSequentially('ats admin', { delay: 80 });
    await expect(filter).toHaveValue('ats admin');
    await expect(page.locator('#ivwInterviewerList label')).toHaveCount(1);
    await page.locator('#ivwInterviewerList input[type=checkbox]').first().check();

    await expect(page.locator('#ivwCount')).toHaveText('3 questions · 1 interviewers');
    await expect(page.locator('#ivAddSubmitBtn')).toBeEnabled();
    await page.locator('#ivAddSubmitBtn').click();
    await page.waitForSelector('#ivAddSubmitBtn', { state: 'detached', timeout: 10000 });

    // Exactly ONE config: active, 3 questions, 1 session — no orphaned draft
    const { rows: configs } = await pool.query(
      'SELECT id, status, round_type, scheduled_at, location FROM interview_configs WHERE candidate_id = $1', [wizardCandidate.id]);
    expect(configs.length).toBe(1);
    expect(configs[0].status).toBe('active');
    expect(configs[0].round_type).toBe('Technical');
    expect(configs[0].location).toBe('Remote — Teams');
    expect(configs[0].scheduled_at).not.toBeNull();

    const { rows: [qc] } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM interview_config_questions WHERE config_id = $1', [configs[0].id]);
    expect(qc.n).toBe(3);
    const { rows: sessions } = await pool.query(
      'SELECT id, interviewer_id, status FROM interview_sessions WHERE config_id = $1', [configs[0].id]);
    expect(sessions.length).toBe(1);
    expect(sessions[0].interviewer_id).toBe(admin.id);
  });

  test('inline discipline prompt filters questions and persists to the position', async ({ page }) => {
    await login(page, admin);
    await openHiringAndWizard(page, discCandidate.id);

    await page.locator('#ivAddType').selectOption('Technical');
    await expect(page.locator('#ivwDiscipline')).toBeVisible();

    await page.locator('#ivwDiscipline').selectOption('Art');
    await expect(page.locator('#ivwQuestionList')).toContainText('Showing questions for:');
    await expect(page.locator('#ivwQuestionList')).toContainText('Art');

    // Persisted to the position via PATCH
    await expect.poll(async () => {
      const { rows } = await pool.query('SELECT discipline FROM hiring_positions WHERE id = $1', [noDiscPosition.id]);
      return rows[0]?.discipline;
    }, { timeout: 5000 }).toBe('Art');
  });

  test('phone screen creates a simple completed round', async ({ page }) => {
    await login(page, admin);
    await openHiringAndWizard(page, phoneCandidate.id);

    // Phone Screen is the default — scored sections hidden, simple form shown
    await expect(page.locator('#ivwScoredSections')).toBeHidden();
    await expect(page.locator('#ivAddSubmitBtn')).toHaveText('Create Round');

    await page.locator('#ivAddDate').fill('2026-07-02');
    await page.locator('#ivAddTime').fill('09:30');
    await page.locator('#ivAddInterviewer').fill('ATS Admin');
    await page.locator('#ivAddSubmitBtn').click();
    await page.waitForSelector('#ivAddSubmitBtn', { state: 'detached', timeout: 10000 });

    const { rows } = await pool.query(
      'SELECT round_type, status, interviewer_name FROM interview_configs WHERE candidate_id = $1', [phoneCandidate.id]);
    expect(rows.length).toBe(1);
    expect(rows[0].round_type).toBe('Phone Screen');
    expect(rows[0].status).toBe('completed');
    expect(rows[0].interviewer_name).toBe('ATS Admin');
  });

  test('scorecard deep link: score all questions and submit (regression for blank-page + dead-buttons bugs)', async ({ page }) => {
    // Uses the active session created by the first test
    const { rows: sessions } = await pool.query(
      `SELECT s.id FROM interview_sessions s
       JOIN interview_configs c ON s.config_id = c.id
       WHERE c.candidate_id = $1`, [wizardCandidate.id]);
    expect(sessions.length).toBe(1);
    const sessionId = sessions[0].id;

    await login(page, admin);
    await page.evaluate(async (sid) => { await openInterviewScorecard(sid); }, sessionId);

    // Splash renders (Bug 2 regression: container must be visible, not blank)
    await expect(page.locator('#interviewScorecardView h2')).toHaveText(/Wizard Flow Candidate/, { timeout: 10000 });
    await expect(page.locator('#interviewScorecardView')).toContainText('Begin Scoring');

    // Begin scoring — the _sc* handlers must exist (Bug 1 regression: early return killed them)
    const handlers = await page.evaluate(() => {
      window._scStart();
      return { score: typeof window._scScore, nav: typeof window._scNav, submit: typeof window._scSubmit };
    });
    expect(handlers.score).toBe('function');
    expect(handlers.nav).toBe('function');
    expect(handlers.submit).toBe('function');

    // Score all 3 questions
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window._scScore(4));
      await page.waitForTimeout(400);
      if (i < 2) { await page.evaluate(() => window._scNav(1)); await page.waitForTimeout(200); }
    }

    page.on('dialog', dialog => dialog.accept());
    await page.evaluate(() => window._scSubmit());
    await expect(page.locator('#interviewScorecardView')).toContainText('Your scorecard has been submitted', { timeout: 10000 });

    const { rows: [s] } = await pool.query('SELECT status FROM interview_sessions WHERE id = $1', [sessionId]);
    expect(s.status).toBe('submitted');
  });

  test('advance decision moves the candidate to offer', async ({ page }) => {
    const { rows: configs } = await pool.query(
      'SELECT id FROM interview_configs WHERE candidate_id = $1', [wizardCandidate.id]);
    const configId = configs[0].id;

    await login(page, admin);
    const decision = await page.evaluate(async (cfgId) => {
      const resp = await authFetch('/api/interview-decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_id: cfgId, decision: 'advance', notes: 'E2E regression — advancing after 4/5 average' }),
      });
      return resp.status;
    }, configId);
    expect([200, 201]).toContain(decision);

    const { rows: [cand] } = await pool.query('SELECT stage FROM candidates WHERE id = $1', [wizardCandidate.id]);
    expect(cand.stage).toBe('offer');

    const { rows: [cfg] } = await pool.query('SELECT status FROM interview_configs WHERE id = $1', [configId]);
    expect(cfg.status).toBe('completed');
  });
});

test.describe('ATS workflow - client hiring administration', () => {
  test('client admin manages own hiring position without destructive controls', async ({ page }) => {
    await truncate();
    const client = await createTestClient({ name: 'Client Hiring Admin' });
    const clientAdmin = await createTestUser({
      role: 'member',
      client_id: client.id,
      client_role: 'admin',
      display_name: 'Client Hiring Admin',
    });
    const position = await createTestHiringPosition({
      client_id: client.id,
      title: 'Lead Developer',
      seniority: 'lead',
      discipline: 'Engineering',
      salary_range: '£92,000',
      employment_type: 'permanent',
      location: 'Remote',
      description: 'Recruitment Status: Confirmed',
    });

    await login(page, clientAdmin);
    const appShell = await page.request.get('/nbi_project_dashboard.html');
    expect(await appShell.text()).toContain('/public/js/domains/nbi-hiring.js?v=29');
    await page.evaluate(() => switchView('hiring'));
    await expect.poll(
      () => page.evaluate(() => _hiringPositionsData.length),
      { timeout: 10000 },
    ).toBe(1);
    await page.evaluate((positionId) => openPositionDetail(positionId), position.id);

    const panel = page.locator('#positionDetailPanel');
    await expect(panel.getByText('Status', { exact: true })).toBeVisible();
    await expect(panel.getByText('Seniority', { exact: true })).toBeVisible();
    await expect(panel.getByText('Discipline', { exact: true })).toBeVisible();
    await expect(panel.getByText('Salary Range', { exact: true })).toBeVisible();
    await expect(panel.getByText('Employment Type', { exact: true })).toBeVisible();
    await expect(panel.getByText('Location', { exact: true })).toBeVisible();
    await expect(panel.getByText('Interview Panel', { exact: true })).toBeVisible();
    await expect(panel.getByText('Description', { exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Delete Position' })).toHaveCount(0);

    const statusSelect = panel.getByText('Status', { exact: true }).locator('..').locator('select');
    await expect(statusSelect.locator('option[value="closed"]')).toHaveCount(1);

    const senioritySelect = panel.getByText('Seniority', { exact: true }).locator('..').locator('select');
    await senioritySelect.selectOption('senior');
    await expect.poll(async () => {
      const { rows } = await pool.query('SELECT seniority FROM hiring_positions WHERE id = $1', [position.id]);
      return rows[0]?.seniority;
    }, { timeout: 5000 }).toBe('senior');
  });

  test('ordinary client user sees candidates and edits role fields but cannot close the role', async ({ page }) => {
    await truncate();
    const client = await createTestClient({ name: 'Client Hiring User' });
    const clientUser = await createTestUser({
      role: 'member',
      client_id: client.id,
      client_role: 'member',
      display_name: 'Client Hiring User',
    });
    const position = await createTestHiringPosition({
      client_id: client.id,
      title: 'Senior Producer',
      seniority: 'senior',
      discipline: 'Production',
      salary_range: '£70,000',
      employment_type: 'permanent',
      location: 'London',
      description: 'Own the production plan',
    });
    const closedPosition = await createTestHiringPosition({
      client_id: client.id,
      title: 'Closed Producer',
      status: 'closed',
    });
    const candidate = await createTestCandidate({
      client_id: client.id,
      position_id: position.id,
      name: 'Visible Client Candidate',
      role: 'Producer',
      stage: 'sourcing',
    });

    await login(page, clientUser);
    await expect(page.getByRole('tab', { name: 'Database' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Positions' })).toBeVisible();

    await page.getByRole('tab', { name: 'Database' }).click();
    await expect(page.getByText(candidate.name, { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Positions' }).click();
    await page.evaluate((positionId) => openPositionDetail(positionId), position.id);

    const panel = page.locator('#positionDetailPanel');
    for (const label of ['Status', 'Seniority', 'Discipline', 'Salary Range', 'Employment Type', 'Location', 'Job Description', 'Interview Panel', 'Description']) {
      await expect(panel.getByText(label, { exact: true })).toBeVisible();
    }
    const statusSelect = panel.getByText('Status', { exact: true }).locator('..').locator('select');
    await expect(statusSelect.locator('option[value="closed"]')).toHaveCount(0);
    await expect(panel.getByText(candidate.name, { exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Delete Position' })).toHaveCount(0);

    const locationInput = panel.getByText('Location', { exact: true }).locator('..').locator('input');
    await locationInput.fill('Remote');
    await locationInput.blur();
    await expect.poll(async () => {
      const { rows } = await pool.query('SELECT location FROM hiring_positions WHERE id = $1', [position.id]);
      return rows[0]?.location;
    }, { timeout: 5000 }).toBe('Remote');

    await expect.poll(() => page.evaluate((positionId) => {
      const role = (_hiringPositionsData || []).find((item) => item.id === positionId);
      return role?.status || null;
    }, closedPosition.id), { timeout: 5000 }).toBe('closed');
    await page.evaluate((positionId) => openPositionDetail(positionId), closedPosition.id);
    const closedStatusSelect = panel.getByText('Status', { exact: true }).locator('..').locator('select');
    await expect(closedStatusSelect).toBeDisabled();
  });
});

test.describe('ATS workflow - Hiring Database session recovery', () => {
  test('successful re-login clears retained Hiring Database filters', async ({ page }) => {
    await truncate();
    const admin = await createTestUser({ role: 'admin', display_name: 'Hiring Database Admin' });
    const client = await createTestClient({ name: 'Hiring Database Client' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Visible Position' });
    const candidate = await createTestCandidate({
      client_id: client.id,
      position_id: position.id,
      name: 'Visible Candidate',
      role: 'Producer',
      stage: 'sourcing',
    });

    await login(page, admin);
    await page.evaluate(() => {
      window._hiringActiveTab = 'database';
      renderContent();
    });
    await expect(page.getByText(candidate.name, { exact: true })).toBeVisible();

    await page.evaluate(() => {
      window._hiringDbFilters = { position_id: '00000000-0000-0000-0000-000000000001' };
      renderContent();
    });
    await expect(page.getByText(candidate.name, { exact: true })).toHaveCount(0);

    await page.evaluate(() => handleLogout());
    await page.waitForSelector('#loginScreen', { state: 'visible' });
    await page.locator('#loginUser').fill(admin.username);
    await page.locator('#loginPass').fill(admin.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden' });
    await page.evaluate(() => {
      window._hiringActiveTab = 'database';
      renderContent();
    });

    expect(await page.evaluate(() => window._hiringDbFilters)).toEqual({});
    await expect(page.getByText(candidate.name, { exact: true })).toBeVisible();
  });

  test('zero matching candidates explains active filters and offers recovery', async ({ page }) => {
    await truncate();
    const admin = await createTestUser({ role: 'admin', display_name: 'Hiring Filter Admin' });
    const client = await createTestClient({ name: 'Hiring Filter Client' });
    const candidatePosition = await createTestHiringPosition({ client_id: client.id, title: 'Candidate Position' });
    const emptyPosition = await createTestHiringPosition({ client_id: client.id, title: 'Empty Position' });
    const candidate = await createTestCandidate({
      client_id: client.id,
      position_id: candidatePosition.id,
      name: 'Recoverable Candidate',
      role: 'Analyst',
      stage: 'sourcing',
    });

    await login(page, admin);
    await page.evaluate((positionId) => {
      window._hiringActiveTab = 'database';
      window._hiringDbFilters = { position_id: positionId };
      renderContent();
    }, emptyPosition.id);

    await expect(page.getByText(candidate.name, { exact: true })).toHaveCount(0);
    await expect(page.getByText('No candidates match the current filters.', { exact: true })).toBeVisible();
    await expect(page.locator('.ats-filter-chips')).toContainText(emptyPosition.title);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByText(candidate.name, { exact: true })).toBeVisible();
  });
});
