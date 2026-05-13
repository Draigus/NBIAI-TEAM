// dashboard-server/tests/e2e/mobile-screenshots.spec.js
//
// Not a regression test — this file is a one-shot capture of iPhone 11
// portrait screenshots (414×896) for the G3 deliverable note. Tagged with
// test.skip() in CI by default so it doesn't run during npm run test:all.
//
// Run manually with: npx playwright test tests/e2e/mobile-screenshots.spec.js
// --project=chromium --grep @mobile-audit

const { test, expect } = require('@playwright/test');
const path = require('path');
const { createTestUser, createTestTask, createTestClient, createTestBugReport, createTestCandidate, createTestLeadStage } = require('../helpers/fixtures');
const { truncate, pool } = require('../helpers/db');

const IPHONE_11 = { width: 414, height: 896 };
const SHOT_DIR = path.resolve(__dirname, '../../../projects/nbi_dashboard/deliverables/2026-04-15-mobile-screenshots');

async function loginAs(page, username, rawPassword) {
  // Use #tasks to avoid dashboard infinite milestone loop on empty DB
  await page.goto('/nbi_project_dashboard.html#tasks');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(username);
  await page.locator('#loginPass').fill(rawPassword);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  // NOTE: page.waitForFunction's explicit timeout param is ignored in
  // Playwright 1.59 (always uses actionTimeout from config), so we use
  // waitForSelector which correctly respects its timeout parameter.
  await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });
}

test.describe('@mobile-audit iPhone 11 portrait screenshots', () => {
  test.use({ viewport: IPHONE_11 });

  test('capture all audit targets', async ({ page }) => {
    page.on('pageerror', err => console.log('[pageerror]', err.message, err.stack?.split('\n').slice(0,5).join(' | ')));
    page.on('console', msg => { if (msg.type() === 'error' || msg.type() === 'warning') console.log('[browser', msg.type() + ']', msg.text()); });
    // Seed just enough data to make every view render something real
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Mobile Test Client' });

    // Tasks for Projects, People, Reports views
    for (let i = 1; i <= 3; i++) {
      await createTestTask({
        title: `Mobile task ${i}`,
        item_type: 'project',
        client_id: client.id,
        status: 'Not started',
      });
    }
    // Assign via raw SQL since fixtures don't expose assignees
    await pool.query(
      `UPDATE tasks SET assignees = ARRAY['Glen Pryer', 'Magnus Pryer'], hours_estimated = 12, hours_spent = 4`
    );

    // Bug reports for Bug Tracker
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'Top bug',    '', 'open', 0),
              ($1, 'bug', 'Mid bug',    '', 'open', 1),
              ($1, 'bug', 'In-prog bug','', 'in_progress', 0)`,
      [user.id]
    );

    // Candidates for Hiring kanban
    await pool.query(
      `INSERT INTO candidates (name, stage, position)
       VALUES ('Alice Candidate', 'sourcing',    0),
              ('Bob Candidate',   'interviews', 0)`
    );

    // Leads for Leads kanban
    const stage = await createTestLeadStage({ name: `Mobile Active ${Date.now()}` });
    await pool.query(
      `INSERT INTO leads (title, stage_id, priority, currency, position, created_by)
       VALUES ('Mobile Lead A', $1, 1, 'GBP', 0, 'test'),
              ('Mobile Lead B', $1, 2, 'GBP', 1, 'test')`,
      [stage.id]
    );

    await loginAs(page, user.username, user.raw_password);

    // Helper: preload data needed by a view then switch to it
    const capture = async (name, switchFn) => {
      await page.evaluate(switchFn);
      await page.waitForTimeout(600); // let the render settle
      await page.screenshot({ path: path.join(SHOT_DIR, name + '.png'), fullPage: false });
    };

    await capture('01-dashboard', () => { if (typeof switchView === 'function') switchView('report'); });

    await capture('02-workload', () => { if (typeof switchView === 'function') switchView('dashboard'); });

    // Projects (tree) — default subview. Captures filter bar layout too.
    await page.evaluate(() => { if (typeof switchView === 'function') switchView('tasks'); });
    await page.waitForSelector('.task-subview-btn', { timeout: 5000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOT_DIR, '03a-projects-tree.png'), fullPage: false });

    // Projects Board — click the subview button since taskSubView is let-scoped
    await page.locator('.task-subview-btn', { hasText: 'Board' }).click();
    await page.waitForSelector('.board-card', { timeout: 5000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOT_DIR, '03-projects-board.png'), fullPage: false });

    await capture('04-people', () => { if (typeof switchView === 'function') switchView('people'); });

    // People → Calendar sub-view was removed in the People redesign (2026-04-20).
    // Screenshots 04b/04c no longer applicable.

    await capture('05-reports', async () => {
      if (typeof switchView === 'function') switchView('report');
      if (typeof renderContent === 'function') renderContent();
    });

    await capture('06-bug-tracker-kanban', async () => {
      if (typeof loadBugReports === 'function') await loadBugReports();
      window._btViewMode = 'kanban';
      if (typeof switchView === 'function') switchView('bugs');
    });

    await capture('07-hiring-kanban', async () => {
      if (typeof loadCandidates === 'function') await loadCandidates();
      if (typeof loadHiringPositions === 'function') await loadHiringPositions();
      window._hiringLoaded = true;
      if (typeof switchView === 'function') switchView('hiring');
    });

    await capture('08-leads-kanban', async () => {
      if (typeof loadLeadsConfig === 'function') await loadLeadsConfig();
      if (typeof loadLeads === 'function') await loadLeads();
      if (typeof switchView === 'function') switchView('leads');
    });

    // Cleanup leads fixture since lead_pipeline_stages isn't in truncate list
    await pool.query('DELETE FROM lead_activities WHERE lead_id IN (SELECT id FROM leads WHERE stage_id = $1)', [stage.id]);
    await pool.query('DELETE FROM leads WHERE stage_id = $1', [stage.id]);
    await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
  });
});
