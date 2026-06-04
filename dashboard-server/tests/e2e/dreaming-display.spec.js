// dashboard-server/tests/e2e/dreaming-display.spec.js
//
// Verifies the Dreaming Engine's overnight insights render on the
// Command Centre Work tab and persist across 30-second poll cycles.

const { test, expect } = require('@playwright/test');
const { createTestUser } = require('../helpers/fixtures');
const { truncate, pool } = require('../helpers/db');

test.describe('Dreaming Engine display', () => {
  test.beforeEach(async () => {
    await truncate();
  });

  test('overnight insights render when dreaming data exists in snapshot', async ({ page }) => {
    const user = await createTestUser({ role: 'admin' });

    // Seed a cc_snapshot with dreaming data
    const dreamingData = {
      generated_at: new Date().toISOString(),
      duration_ms: 100,
      analysers_run: 7,
      analysers_failed: 0,
      insights: [
        {
          id: 'test001',
          category: 'risk',
          severity: 'warning',
          title: 'Bug backlog growing',
          body: '10 bugs opened, only 3 closed.',
          evidence: ['opened_7d:10', 'closed_7d:3'],
          action: 'Prioritise bug triage.',
          related_4c: 'capabilities',
        },
        {
          id: 'test002',
          category: 'achievement',
          severity: 'info',
          title: 'Tom cleared overdue backlog',
          body: 'All previously overdue items completed.',
          evidence: ['assignee:Tom'],
          action: null,
          related_4c: null,
        },
      ],
      trends: {
        bugs_velocity: { opened_7d: 10, closed_7d: 3, net: 7, trend: 'worsening' },
        task_velocity: { completed_7d: 5, added_7d: 8, net: -3, trend: 'stable' },
      },
      stale_report: { memory_files: [], brain_modules: [], skills_without_learnings: [], roles_without_knowledge: [] },
      cross_refs: { brain_db_drift: [], orphaned_decisions: [] },
    };

    const snapshotData = {
      four_cs: {
        context: { score: 8, max: 10, details: [] },
        connections: { score: 6, max: 10, details: [] },
        capabilities: { score: 7, max: 10, details: [] },
        cadence: { score: 3, max: 10, details: [] },
      },
      dreaming: dreamingData,
      skills: [],
      memory: { files: [], health: { total: 0, fresh: 0, stale: 0, score: 0 } },
      connections: { local_mcp: [], cloud_mcp: [], buckets: {} },
      brain: { core: null, modules: [], roles: [] },
      sessions: { recent: [], stats: { total_this_week: 0, avg_per_day: 0 }, live_state: {} },
      bugs: { by_status: {}, by_priority: {}, recent_activity: [], open_bugs: [] },
      tests: { last_run: null, trend: [] },
    };

    const today = new Date().toISOString().slice(0, 10);
    await pool.query(
      'INSERT INTO cc_snapshots (snapshot_date, data) VALUES ($1, $2) ON CONFLICT (snapshot_date) DO UPDATE SET data = $2',
      [today, JSON.stringify(snapshotData)]
    );

    // Login and navigate to Command Centre
    await page.goto('/nbi_project_dashboard.html#commandcentre');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    // Wait for Command Centre to render
    await page.waitForSelector('.cc-page', { timeout: 15000 });

    // Check for overnight insights section
    const insightsHeader = page.locator('text=Overnight Insights');
    await expect(insightsHeader).toBeVisible({ timeout: 10000 });

    // Check that the bug backlog insight rendered
    const bugInsight = page.locator('text=Bug backlog growing');
    await expect(bugInsight).toBeVisible({ timeout: 5000 });

    // Check that the achievement insight rendered
    const achievementInsight = page.locator('text=Tom cleared overdue backlog');
    await expect(achievementInsight).toBeVisible({ timeout: 5000 });

    // Check trends section
    const trendsHeader = page.locator('text=Trends');
    await expect(trendsHeader).toBeVisible({ timeout: 5000 });

    // Verify the action button exists and is clickable
    const actionBtn = page.locator('button:has-text("View bugs")');
    await expect(actionBtn).toBeVisible({ timeout: 5000 });
  });

  test('placeholder shows when no dreaming data exists', async ({ page }) => {
    const user = await createTestUser({ role: 'admin' });

    // Seed a snapshot WITHOUT dreaming
    const snapshotData = {
      four_cs: {
        context: { score: 5, max: 10, details: [] },
        connections: { score: 5, max: 10, details: [] },
        capabilities: { score: 5, max: 10, details: [] },
        cadence: { score: 2, max: 10, details: [] },
      },
      skills: [],
      memory: { files: [], health: { total: 0, fresh: 0, stale: 0, score: 0 } },
      connections: { local_mcp: [], cloud_mcp: [], buckets: {} },
      brain: { core: null, modules: [], roles: [] },
      sessions: { recent: [], stats: { total_this_week: 0, avg_per_day: 0 }, live_state: {} },
      bugs: { by_status: {}, by_priority: {}, recent_activity: [], open_bugs: [] },
      tests: { last_run: null, trend: [] },
    };

    const today = new Date().toISOString().slice(0, 10);
    await pool.query(
      'INSERT INTO cc_snapshots (snapshot_date, data) VALUES ($1, $2) ON CONFLICT (snapshot_date) DO UPDATE SET data = $2',
      [today, JSON.stringify(snapshotData)]
    );

    await page.goto('/nbi_project_dashboard.html#commandcentre');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('.cc-page', { timeout: 15000 });

    // Should show placeholder
    const placeholder = page.locator('text=Overnight analysis will appear here');
    await expect(placeholder).toBeVisible({ timeout: 10000 });
  });

  test('dreaming section survives 30-second poll refresh', async ({ page }) => {
    const user = await createTestUser({ role: 'admin' });

    const dreamingData = {
      generated_at: new Date().toISOString(),
      duration_ms: 50,
      analysers_run: 1,
      analysers_failed: 0,
      insights: [{
        id: 'persist01',
        category: 'achievement',
        severity: 'info',
        title: 'Persistence test insight',
        body: 'This should survive a poll cycle.',
        evidence: [],
        action: null,
        related_4c: null,
      }],
      trends: {},
      stale_report: { memory_files: [], brain_modules: [], skills_without_learnings: [], roles_without_knowledge: [] },
      cross_refs: { brain_db_drift: [], orphaned_decisions: [] },
    };

    const snapshotData = {
      four_cs: {
        context: { score: 8, max: 10, details: [] },
        connections: { score: 6, max: 10, details: [] },
        capabilities: { score: 7, max: 10, details: [] },
        cadence: { score: 3, max: 10, details: [] },
      },
      dreaming: dreamingData,
      skills: [],
      memory: { files: [], health: { total: 0, fresh: 0, stale: 0, score: 0 } },
      connections: { local_mcp: [], cloud_mcp: [], buckets: {} },
      brain: { core: null, modules: [], roles: [] },
      sessions: { recent: [], stats: { total_this_week: 0, avg_per_day: 0 }, live_state: {} },
      bugs: { by_status: {}, by_priority: {}, recent_activity: [], open_bugs: [] },
      tests: { last_run: null, trend: [] },
    };

    const today = new Date().toISOString().slice(0, 10);
    await pool.query(
      'INSERT INTO cc_snapshots (snapshot_date, data) VALUES ($1, $2) ON CONFLICT (snapshot_date) DO UPDATE SET data = $2',
      [today, JSON.stringify(snapshotData)]
    );

    await page.goto('/nbi_project_dashboard.html#commandcentre');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('.cc-page', { timeout: 15000 });

    // Verify insight appears initially
    const insight = page.locator('text=Persistence test insight');
    await expect(insight).toBeVisible({ timeout: 10000 });

    // Wait for a poll cycle (30s + buffer)
    await page.waitForTimeout(35000);

    // Verify it's still there after the poll
    await expect(insight).toBeVisible({ timeout: 5000 });
  });
});
