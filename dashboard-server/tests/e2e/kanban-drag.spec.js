// dashboard-server/tests/e2e/kanban-drag.spec.js
//
// E2E smoke specs for kanban drag-to-reorder (decision D79).
//
// One intra-column drag test per board + one cross-lane test for Bug
// Tracker (since it's the newest drag code). Server-side drag logic is
// comprehensively tested in tests/unit/kanban-position.test.mjs; these
// specs catch the "frontend stopped talking to the server" regression
// class and verify the drop-index calculation + PATCH wiring end-to-end.
//
// Navigation pattern: we call the global `switchView(...)` function via
// `page.evaluate()` rather than clicking sidebar buttons — the sidebar
// render races with the post-login async data load, so direct function
// calls are more reliable. Same pattern as tests/e2e/tasks.spec.js.

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestLeadStage, createTestTask } = require('../helpers/fixtures');
const { truncate, pool } = require('../helpers/db');

// The frontend's renderContent() short-circuits to an "empty state" when
// tasks.length === 0, which means tests for non-Tasks views also need at
// least one task in the DB or the view they're testing never renders.
async function seedDummyTaskForEmptyStateBypass() {
  await createTestTask({ title: 'dummy-task-for-empty-state-bypass', item_type: 'project' });
}

async function loginAs(page, username, rawPassword) {
  // Navigate with #tasks hash to avoid the dashboard view's infinite milestone
  // reload loop (when _apiClientsCache is empty, loadAllMilestones resolves
  // immediately but _milestonesCache stays empty, causing renderContent to
  // re-trigger loadAllMilestones in a tight microtask loop that starves the
  // macrotask queue and prevents page.evaluate/waitForSelector from running).
  await page.goto('/nbi_project_dashboard.html#tasks');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(username);
  await page.locator('#loginPass').fill(rawPassword);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  // Wait for the post-login renderAll() to complete — signalled by the
  // sidebar nav buttons being fully rendered. We wait for a sidebar__item
  // element to exist, which proves renderSidebar() ran inside renderAll().
  // NOTE: page.waitForFunction's explicit timeout param is ignored in
  // Playwright 1.59 (always uses actionTimeout from config), so we use
  // waitForSelector which correctly respects its timeout parameter.
  await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });
}

// -----------------------------------------------------------------------------
// Bug Tracker
// -----------------------------------------------------------------------------

test.describe('Bug Tracker kanban drag', () => {
  test('intra-column drag reorders by position and PATCHes the server', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    await seedDummyTaskForEmptyStateBypass();
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'Top bug',    '', 'open', 0),
              ($1, 'bug', 'Middle bug', '', 'open', 1),
              ($1, 'bug', 'Bottom bug', '', 'open', 2)`,
      [user.id]
    );

    await loginAs(page, user.username, user.raw_password);

    // Refresh bug reports data then switch to the Bug Tracker kanban view.
    // loadBugReports was called on login but we inserted bugs AFTER login finished.
    await page.evaluate(async () => {
      if (typeof loadBugReports === 'function') await loadBugReports();
      window._btViewMode = 'kanban';
      if (typeof switchView === 'function') switchView('bugs');
    });

    await page.waitForSelector('.bug-tracker__kanban', { timeout: 15000 });
    await expect(page.locator('.bug-card')).toHaveCount(3);

    const titlesBefore = await page.locator('.bug-card').allTextContents();
    expect(titlesBefore[0]).toContain('Top bug');
    expect(titlesBefore[2]).toContain('Bottom bug');

    // Drag "Bottom bug" onto "Top bug"
    const bottom = page.locator('.bug-card', { hasText: 'Bottom bug' });
    const top = page.locator('.bug-card', { hasText: 'Top bug' });

    const patchPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/bug-reports/') && resp.request().method() === 'PATCH'
    );
    await bottom.dragTo(top);
    const patchResp = await patchPromise;
    expect(patchResp.status()).toBe(200);

    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'open' ORDER BY position`
    );
    expect(rows[0].title).toBe('Bottom bug');
    expect(rows[0].position).toBe(0);
  });

  test('cross-lane drag changes status + lands at position 0 of new lane', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    await seedDummyTaskForEmptyStateBypass();
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'movable', '', 'open', 0)`,
      [user.id]
    );

    await loginAs(page, user.username, user.raw_password);
    await page.evaluate(async () => {
      if (typeof loadBugReports === 'function') await loadBugReports();
      window._btViewMode = 'kanban';
      if (typeof switchView === 'function') switchView('bugs');
    });
    await page.waitForSelector('.bug-tracker__kanban', { timeout: 15000 });

    const card = page.locator('.bug-card', { hasText: 'movable' });
    const inProgressLane = page.locator('.bug-lane', { hasText: /In Progress/ }).locator('.bug-lane__body');

    const patchPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/bug-reports/') && resp.request().method() === 'PATCH'
    );
    await card.dragTo(inProgressLane);
    await patchPromise;

    const { rows } = await pool.query(
      `SELECT status, position FROM bug_reports WHERE title = 'movable'`
    );
    expect(rows[0].status).toBe('in_progress');
    expect(rows[0].position).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// Tasks board
// -----------------------------------------------------------------------------

test.describe('Tasks kanban drag', () => {
  test('intra-column drag reorders by position, priority untouched', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    await pool.query(
      `INSERT INTO tasks (title, status, priority, position, item_type)
       VALUES ('Top task',    'Not started', 'High',   0, 'project'),
              ('Middle task', 'Not started', 'Medium', 1, 'project'),
              ('Bottom task', 'Not started', 'Low',    2, 'project')`
    );

    await loginAs(page, user.username, user.raw_password);
    await page.evaluate(() => {
      if (typeof switchView === 'function') switchView('tasks');
      // taskSubView is a global let, not window.*, so assign via eval-context
      window.taskSubView = 'board';
      // The code actually uses the bare `taskSubView` let binding. Since
      // page.evaluate runs in the page context, the let binding is module-local
      // and not reachable. Instead, click the subview button that exists after
      // switchView() renders the tasks view.
    });
    // After switchView('tasks'), the subview buttons render
    await page.waitForSelector('.task-subview-btn', { timeout: 10000 });
    await page.locator('.task-subview-btn', { hasText: 'Board' }).click();
    await page.waitForSelector('.board-card', { timeout: 10000 });
    await expect(page.locator('.board-card')).toHaveCount(3);

    const bottom = page.locator('.board-card', { hasText: 'Bottom task' });
    const top = page.locator('.board-card', { hasText: 'Top task' });

    const patchPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/tasks/') && resp.request().method() === 'PATCH'
    );
    await bottom.dragTo(top);
    await patchPromise;

    const { rows } = await pool.query(
      `SELECT title, position, priority FROM tasks WHERE status = 'Not started' ORDER BY position`
    );
    expect(rows[0].title).toBe('Bottom task');
    expect(rows[0].position).toBe(0);
    // Priority preserved
    expect(rows.find(r => r.title === 'Bottom task').priority).toBe('Low');
    expect(rows.find(r => r.title === 'Top task').priority).toBe('High');
    expect(rows.find(r => r.title === 'Middle task').priority).toBe('Medium');
  });

  test('board sub-view renders when nbi_task_subview is "board" in localStorage', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    await pool.query(
      `INSERT INTO tasks (title, status, priority, position, item_type)
       VALUES ('Board task A', 'Not started', 'Medium', 0, 'project'),
              ('Board task B', 'In progress', 'High',   0, 'project')`
    );

    // Set localStorage BEFORE the script initialises taskSubView. The let
    // binding reads localStorage once at parse time, so we must navigate,
    // write to localStorage, then reload so the script sees 'board'.
    // Navigate, set localStorage, then reload so the script reads 'board'
    // at parse time. Use #tasks hash to avoid dashboard infinite loop.
    await page.goto('/nbi_project_dashboard.html#tasks');
    await page.evaluate(() => localStorage.setItem('nbi_task_subview', 'board'));
    await page.reload();
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });

    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    // Navigate to Projects — board sub-view should render from localStorage.
    // Wait for sidebar items to prove renderAll() completed (switchView is defined).
    await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });
    await page.evaluate(() => switchView('tasks'));
    await page.waitForSelector('.board-card', { timeout: 15000 });

    const cards = page.locator('.board-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.filter({ hasText: 'Board task A' })).toHaveCount(1);
    await expect(cards.filter({ hasText: 'Board task B' })).toHaveCount(1);
  });
});

// -----------------------------------------------------------------------------
// Leads
// -----------------------------------------------------------------------------

test.describe('Leads kanban drag', () => {
  test('intra-stage drag reorders by position, priority untouched', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    await seedDummyTaskForEmptyStateBypass();

    await loginAs(page, user.username, user.raw_password);

    // Create stage via API (not direct DB) so the server-side leads_config
    // cache is invalidated. Direct DB inserts bypass invalidateCache().
    const stage = await page.evaluate(async () => {
      const resp = await fetch('/api/leads/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Active-Test', sort_order: 0, colour: '#666666' }),
      });
      return resp.json();
    });

    await pool.query(
      `INSERT INTO leads (title, stage_id, priority, currency, position, created_by)
       VALUES ('Top lead',    $1, 1, 'GBP', 0, 'test'),
              ('Middle lead', $1, 2, 'GBP', 1, 'test'),
              ('Bottom lead', $1, 3, 'GBP', 2, 'test')`,
      [stage.id]
    );

    try {
      await page.evaluate(async () => {
        // _leadsConfig is a top-level `let` — not on `window`. Reset the
        // binding directly so loadLeadsConfig re-fetches from the API
        // (server cache was invalidated by the POST above).
        _leadsConfig = null;
        _leadsData = null;
        if (typeof loadLeadsConfig === 'function') await loadLeadsConfig();
        if (typeof loadLeads === 'function') await loadLeads();
        if (typeof switchView === 'function') switchView('leads');
      });
      // Leads default sub-view is kanban
      await page.waitForSelector('.leads-kanban__card', { timeout: 20000 });
      await expect(page.locator('.leads-kanban__card')).toHaveCount(3);

      const bottom = page.locator('.leads-kanban__card', { hasText: 'Bottom lead' });
      const top = page.locator('.leads-kanban__card', { hasText: 'Top lead' });

      const patchPromise = page.waitForResponse(resp =>
        resp.url().includes('/api/leads/') && resp.request().method() === 'PATCH'
      );
      await bottom.dragTo(top);
      await patchPromise;

      const { rows } = await pool.query(
        `SELECT title, position, priority FROM leads WHERE stage_id = $1 ORDER BY position`,
        [stage.id]
      );
      expect(rows[0].title).toBe('Bottom lead');
      expect(rows[0].position).toBe(0);
      expect(rows.find(r => r.title === 'Bottom lead').priority).toBe(3);
      expect(rows.find(r => r.title === 'Top lead').priority).toBe(1);
    } finally {
      await pool.query('DELETE FROM lead_activities WHERE lead_id IN (SELECT id FROM leads WHERE stage_id = $1)', [stage.id]);
      await pool.query('DELETE FROM leads WHERE stage_id = $1', [stage.id]);
      await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
    }
  });
});

// -----------------------------------------------------------------------------
// Hiring
// -----------------------------------------------------------------------------

test.describe('Hiring kanban drag', () => {
  test('intra-stage drag reorders by position', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    await seedDummyTaskForEmptyStateBypass();
    await pool.query(
      `INSERT INTO candidates (name, stage, position)
       VALUES ('Alice', 'sourcing', 0),
              ('Bob',   'sourcing', 1),
              ('Carol', 'sourcing', 2)`
    );

    await loginAs(page, user.username, user.raw_password);
    await page.evaluate(async () => {
      // Pre-load candidates + positions then mark loaded so renderHiringView
      // skips the "Loading..." branch on first visit.
      if (typeof loadCandidates === 'function') await loadCandidates();
      if (typeof loadHiringPositions === 'function') await loadHiringPositions();
      window._hiringLoaded = true;
      if (typeof switchView === 'function') switchView('hiring');
    });
    await page.waitForSelector('.hiring-card', { timeout: 15000 });
    await expect(page.locator('.hiring-card')).toHaveCount(3);

    const carol = page.locator('.hiring-card', { hasText: 'Carol' });
    const alice = page.locator('.hiring-card', { hasText: 'Alice' });

    const patchPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/candidates/') && resp.request().method() === 'PATCH'
    );
    await carol.dragTo(alice);
    await patchPromise;

    const { rows } = await pool.query(
      `SELECT name, position FROM candidates WHERE stage = 'sourcing' ORDER BY position`
    );
    expect(rows[0].name).toBe('Carol');
    expect(rows[0].position).toBe(0);
  });
});
