// dashboard-server/tests/e2e/hiring-plan.spec.js
//
// E2E tests for the Hiring Plan feature. Covers navigation, plan table,
// monthly cost matrix, export, and permission-based visibility.

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestHiringSettings, createTestHiringDepartment, createTestHiringRecruiter } = require('../helpers/fixtures');
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

async function insertPlanRole(clientId, fields) {
  const defaults = { status: 'open', approval_status: 'pending', planning_version: 1, employment_type: 'fte', compensation_currency: 'GBP', compensation_basis: 'annual' };
  const m = { ...defaults, ...fields };
  const { rows } = await pool.query(
    `INSERT INTO hiring_positions (client_id, title, status, approval_status, planning_version, employment_type, compensation_currency, compensation_basis, budgeted_compensation, target_start_month, priority, department_id, seniority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [clientId, m.title, m.status, m.approval_status, m.planning_version, m.employment_type, m.compensation_currency, m.compensation_basis, m.budgeted_compensation || null, m.target_start_month || null, m.priority != null ? m.priority : null, m.department_id || null, m.seniority || null]
  );
  return rows[0];
}

test.describe('Hiring Plan navigation', () => {
  let admin, client;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Plan Nav Client' });
    admin = await createTestUser({ role: 'admin', display_name: 'Plan Admin' });
  });

  test('Hiring Plan tab exists and Positions tab does not', async ({ page }) => {
    await login(page, admin);
    await page.evaluate(() => switchView('hiring'));
    await page.waitForTimeout(2000);

    const planTab = page.getByRole('tab', { name: 'Hiring Plan' });
    await expect(planTab).toBeVisible();

    const positionsTab = page.getByRole('tab', { name: 'Positions' });
    await expect(positionsTab).toHaveCount(0);

    const pipelineTab = page.getByRole('tab', { name: 'Pipeline' });
    await expect(pipelineTab).toBeVisible();
  });

  test('Hiring Plan tab prompts for client, then shows plan view buttons', async ({ page }) => {
    await login(page, admin);
    await page.evaluate(() => switchView('hiring'));
    await page.waitForTimeout(2000);

    await page.getByRole('tab', { name: 'Hiring Plan' }).click();
    await page.waitForTimeout(1500);

    // NBI admin with no client selected: prompt + selector, no views yet
    await expect(page.getByText('Select a client to view their hiring plan.')).toBeVisible();

    await page.evaluate((id) => changeHiringPlanClient(id), client.id);

    const planBtn = page.locator('.hiring-plan-view-btn', { hasText: 'Plan' });
    await expect(planBtn).toBeVisible({ timeout: 15000 });

    const rolesBtn = page.locator('.hiring-plan-view-btn', { hasText: 'Roles' });
    await expect(rolesBtn).toBeVisible();
  });
});

test.describe('Plan table', () => {
  let admin, client, dept;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Plan Table Client' });
    admin = await createTestUser({ role: 'admin', display_name: 'Table Admin' });
    dept = await createTestHiringDepartment({ client_id: client.id, name: 'Engineering' });
    await createTestHiringSettings({
      client_id: client.id,
      coo_user_id: admin.id,
      finance_director_user_id: admin.id,
      fte_on_cost_pct: 10,
    });

    await insertPlanRole(client.id, {
      title: 'Lead Producer',
      approval_status: 'approved',
      target_start_month: '2026-08-01',
      budgeted_compensation: '72000',
      department_id: dept.id,
      seniority: 'Lead',
      priority: 1,
    });
    await insertPlanRole(client.id, {
      title: 'Junior Engineer',
      approval_status: 'pending',
      target_start_month: '2026-10-01',
      budgeted_compensation: '36000',
      department_id: dept.id,
      priority: 2,
    });
  });

  test('NBI admin must select a client, then sees the plan table', async ({ page }) => {
    await login(page, admin);
    await page.evaluate(() => switchView('hiring'));
    await page.waitForTimeout(2000);
    await page.getByRole('tab', { name: 'Hiring Plan' }).click();
    await page.waitForTimeout(1500);

    // No client selected yet: explicit prompt, no doomed API calls
    await expect(page.getByText('Select a client to view their hiring plan.')).toBeVisible();
    await expect(page.locator('#hpClientSelect')).toBeVisible();

    // Select the client through the real handler
    await page.evaluate((id) => changeHiringPlanClient(id), client.id);
    await expect(page.locator('.hiring-plan-table')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.hiring-plan-row')).toHaveCount(2);
    await expect(page.locator('text=Lead Producer')).toBeVisible();
    await expect(page.locator('text=Junior Engineer')).toBeVisible();
  });

  test('NBI admin sees financial columns', async ({ page }) => {
    await login(page, admin);
    await page.evaluate(() => switchView('hiring'));
    await page.waitForTimeout(2000);
    await page.getByRole('tab', { name: 'Hiring Plan' }).click();
    await page.waitForTimeout(1500);
    await page.evaluate((id) => changeHiringPlanClient(id), client.id);
    await expect(page.locator('.hiring-plan-table')).toBeVisible({ timeout: 15000 });

    await expect(page.locator('th', { hasText: 'Budget' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Full control sweep: every button/select/input in the Hiring Plan feature.
// Every test carries an uncaught-JS-error trap — any pageerror fails it.
// ---------------------------------------------------------------------------

test.describe('Hiring Plan control sweep', () => {
  let admin, client, clientB, dept;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Sweep Client' });
    clientB = await createTestClient({ name: 'Sweep Client B' });
    admin = await createTestUser({ role: 'admin', display_name: 'Sweep Admin' });
    dept = await createTestHiringDepartment({ client_id: client.id, name: 'Engineering' });
    await createTestHiringDepartment({ client_id: client.id, name: 'Art' });
    await createTestHiringSettings({
      client_id: client.id,
      coo_user_id: admin.id,
      finance_director_user_id: admin.id,
      fte_on_cost_pct: 10,
      contractor_on_cost_pct: 15,
      psc_on_cost_pct: 2,
    });

    const approved = await insertPlanRole(client.id, {
      title: 'Sweep Producer',
      approval_status: 'approved',
      target_start_month: '2026-08-01',
      budgeted_compensation: '72000',
      department_id: dept.id,
      seniority: 'Lead',
      priority: 1,
    });
    await insertPlanRole(client.id, {
      title: 'Sweep Engineer',
      approval_status: 'pending',
      target_start_month: '2026-10-01',
      budgeted_compensation: '36000',
      priority: 2,
    });
    await insertPlanRole(client.id, {
      title: 'Sweep Denied',
      approval_status: 'denied',
      target_start_month: '2026-09-01',
      budgeted_compensation: '50000',
      priority: 3,
    });
    const { createTestCandidate } = require('../helpers/fixtures');
    await createTestCandidate({ client_id: client.id, position_id: approved.id, name: 'Sweep Candidate', stage: 'sourcing' });
  });

  function trapErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    return errors;
  }

  async function openPlan(page) {
    await login(page, admin);
    await page.evaluate(() => switchView('hiring'));
    await page.waitForTimeout(2000);
    await page.getByRole('tab', { name: 'Hiring Plan' }).click();
    await page.waitForTimeout(1500);
    await page.evaluate((id) => changeHiringPlanClient(id), client.id);
    await expect(page.locator('.hiring-plan-table')).toBeVisible({ timeout: 15000 });
  }

  test('all four view buttons render their views', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    await page.locator('.hiring-plan-view-btn', { hasText: 'Roles' }).click();
    await expect(page.locator('.position-card')).toHaveCount(3, { timeout: 10000 });

    await page.locator('.hiring-plan-view-btn', { hasText: 'Monthly Costs' }).click();
    await expect(page.locator('.hiring-plan-matrix')).toBeVisible({ timeout: 10000 });

    await page.locator('.hiring-plan-view-btn', { hasText: 'Settings' }).click();
    await expect(page.locator('#settingsOverlay')).toBeVisible();
    await page.locator('#settingsOverlay button', { hasText: 'Cancel' }).click();
    await expect(page.locator('#settingsOverlay')).toHaveCount(0);

    await page.locator('.hiring-plan-view-btn', { hasText: 'Plan' }).first().click();
    await expect(page.locator('.hiring-plan-table')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('filters and search narrow the table', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    await page.locator('#hpFilterApproval').selectOption('approved');
    await expect(page.locator('.hiring-plan-row')).toHaveCount(1);

    await page.locator('#hpFilterApproval').selectOption('');
    await expect(page.locator('.hiring-plan-row')).toHaveCount(3);

    await page.locator('#hpFilterDept').selectOption({ label: 'Engineering' });
    await expect(page.locator('.hiring-plan-row')).toHaveCount(1);
    await page.locator('#hpFilterDept').selectOption('');

    await page.locator('#hpFilterEngagement').selectOption('fte');
    await expect(page.locator('.hiring-plan-row')).toHaveCount(3);
    await page.locator('#hpFilterEngagement').selectOption('');

    await page.locator('#hpSearch').fill('Denied');
    await expect(page.locator('.hiring-plan-row')).toHaveCount(1, { timeout: 5000 });
    await page.locator('#hpSearch').fill('');
    await expect(page.locator('.hiring-plan-row')).toHaveCount(3, { timeout: 5000 });

    expect(errors).toEqual([]);
  });

  test('row click and Enter key open the role sidebar', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    // Click the role cell specifically: other cells are inline editors.
    await page.locator('.hiring-plan-row', { hasText: 'Sweep Producer' }).locator('.hiring-plan-role-cell').click();
    await expect(page.locator('#positionDetailPanel')).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');

    const row = page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' });
    await row.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#positionDetailPanel')).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('column headers sort the table', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    // Sort by Priority ascending: P1 Sweep Producer first
    await page.locator('.hiring-plan-th-sort', { hasText: 'Priority' }).click();
    await expect(page.locator('.hiring-plan-row').first()).toContainText('Sweep Producer');

    // Toggle to descending: P3 Sweep Denied first
    await page.locator('.hiring-plan-th-sort', { hasText: 'Priority' }).click();
    await expect(page.locator('.hiring-plan-row').first()).toContainText('Sweep Denied');

    // Sort by Role title ascending
    await page.locator('.hiring-plan-th-sort', { hasText: 'Role' }).click();
    await expect(page.locator('.hiring-plan-row').first()).toContainText('Sweep Denied');

    expect(errors).toEqual([]);
  });

  test('inline edits: priority, engagement, recruiting, approval', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    const row = page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' });

    // Priority: click pill cell, select P0
    await row.locator('td').nth(1).click();
    await row.locator('.hiring-plan-inline-select').selectOption('0');
    await expect(page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' }).locator('.hiring-plan-prio--0')).toBeVisible({ timeout: 10000 });

    // Engagement: fte -> contractor
    const row2 = page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' });
    await row2.locator('td').nth(3).click();
    await row2.locator('.hiring-plan-inline-select').selectOption('contractor');
    await expect(page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' }).locator('td').nth(3)).toContainText('Contractor', { timeout: 10000 });

    // Recruiting: not started -> recruiting (wait for cell to be editable after engagement re-render)
    const row3 = page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' });
    await expect(row3.locator('td').nth(5)).toHaveAttribute('title', 'Click to change recruiting state', { timeout: 10000 });
    await row3.locator('td').nth(5).click();
    await row3.locator('.hiring-plan-inline-select').selectOption('started');
    await expect(page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' }).locator('td').nth(5)).toContainText('Recruiting', { timeout: 10000 });

    // Approval: pending -> approved
    const row4 = page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' });
    await row4.locator('td').nth(4).click();
    await row4.locator('.hiring-plan-inline-select').selectOption('approved');
    await expect(page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' }).locator('td').nth(4)).toContainText('Approved', { timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('deny modal requires reason and records denial', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    const row = page.locator('.hiring-plan-row', { hasText: 'Sweep Producer' });
    await row.locator('td').nth(4).click();
    await row.locator('.hiring-plan-inline-select').selectOption('denied');
    await expect(page.locator('#denyRoleOverlay')).toBeVisible();

    await page.locator('#denyReason').selectOption('not_current_priority');
    await page.locator('#denyRoleOverlay button', { hasText: 'Deny role' }).click();
    await expect(page.locator('#denyRoleOverlay')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('.hiring-plan-row', { hasText: 'Sweep Producer' }).locator('td').nth(4)).toContainText('Denied', { timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('rate selector switches budget between annual, monthly and daily', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    // Sweep Denied still has 50,000 annual
    const row = () => page.locator('.hiring-plan-row', { hasText: 'Sweep Denied' });
    await expect(row().locator('.hiring-plan-money').first()).toContainText('50,000');

    await page.locator('#hpRateSeg button', { hasText: 'Monthly' }).click();
    await expect(row().locator('.hiring-plan-money').first()).toContainText('4,167', { timeout: 10000 });

    await page.locator('#hpRateSeg button', { hasText: 'Daily' }).click();
    await expect(row().locator('.hiring-plan-money').first()).toContainText('198', { timeout: 10000 });

    await page.locator('#hpRateSeg button', { hasText: 'Annual' }).click();
    await expect(row().locator('.hiring-plan-money').first()).toContainText('50,000', { timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('roles view cards open the sidebar', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    await page.locator('.hiring-plan-view-btn', { hasText: 'Roles' }).click();
    await expect(page.locator('.position-card')).toHaveCount(3, { timeout: 10000 });
    await page.locator('.position-card', { hasText: 'Sweep Producer' }).click();
    await expect(page.locator('#positionDetailPanel')).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('Add Role: cancel, validation, and create', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    await page.locator('button', { hasText: '+ Add Role' }).click();
    await expect(page.locator('#addRoleOverlay')).toBeVisible();
    await page.locator('#addRoleOverlay button', { hasText: 'Cancel' }).click();
    await expect(page.locator('#addRoleOverlay')).toHaveCount(0);

    await page.locator('button', { hasText: '+ Add Role' }).click();
    await page.locator('#addRoleOverlay button', { hasText: 'Create' }).click();
    // Empty title: modal must stay open
    await expect(page.locator('#addRoleOverlay')).toBeVisible();

    await page.locator('#arTitle').fill('Sweep Created Role');
    await page.locator('#addRoleOverlay button', { hasText: 'Create' }).click();
    await expect(page.locator('#positionDetailPanel')).toBeVisible({ timeout: 15000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('.hiring-plan-row', { hasText: 'Sweep Created Role' })).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('Export Excel downloads a workbook', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.locator('button', { hasText: 'Export Excel' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^Hiring_Plan_.*\.xlsx$/);

    expect(errors).toEqual([]);
  });

  test('Monthly Costs: horizon, mode, and row click', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    await page.locator('.hiring-plan-view-btn', { hasText: 'Monthly Costs' }).click();
    await expect(page.locator('.hiring-plan-matrix')).toBeVisible({ timeout: 10000 });
    // Default 24 months: Role column + 24 month headers
    await expect(page.locator('.hiring-plan-matrix thead th')).toHaveCount(25);

    await page.locator('#hpCostMonths').selectOption('12');
    await expect(page.locator('.hiring-plan-matrix thead th')).toHaveCount(13, { timeout: 10000 });

    await page.locator('#hpCostMode').selectOption('base');
    await expect(page.locator('.hiring-plan-matrix')).toBeVisible();

    await page.locator('.hiring-plan-matrix tbody tr', { hasText: 'Sweep Producer' }).click();
    await expect(page.locator('#positionDetailPanel')).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('Settings: add department and save', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    await page.locator('.hiring-plan-view-btn', { hasText: 'Settings' }).click();
    await expect(page.locator('#settingsOverlay')).toBeVisible();

    await page.locator('#hsNewDept').fill('Sweep Dept');
    await page.locator('#settingsOverlay button', { hasText: 'Add' }).click();
    // Modal reopens with the new department listed
    await expect(page.locator('#settingsOverlay', { hasText: 'Sweep Dept' })).toBeVisible({ timeout: 10000 });

    await page.locator('#hsFte').fill('12.5');
    await page.locator('#settingsOverlay button', { hasText: 'Save' }).click();
    await expect(page.locator('#settingsOverlay')).toHaveCount(0, { timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('client selector switches context', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    await page.evaluate((id) => changeHiringPlanClient(id), clientB.id);
    await expect(page.locator('.hiring-plan-table')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('No roles match the current filters')).toBeVisible();

    await page.evaluate((id) => changeHiringPlanClient(id), client.id);
    await expect(page.locator('.hiring-plan-row', { hasText: 'Sweep Producer' })).toBeVisible({ timeout: 15000 });

    expect(errors).toEqual([]);
  });
});
