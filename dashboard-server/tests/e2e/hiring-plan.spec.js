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
  const defaults = { status: 'open', closed_reason: null, approval_status: 'pending', planning_version: 1, employment_type: 'fte', compensation_currency: 'GBP', compensation_basis: 'annual' };
  const m = { ...defaults, ...fields };
  const { rows } = await pool.query(
    `INSERT INTO hiring_positions (client_id, title, status, closed_reason, approval_status, planning_version, employment_type, compensation_currency, compensation_basis, budgeted_compensation, target_start_month, priority, department_id, seniority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [clientId, m.title, m.status, m.closed_reason, m.approval_status, m.planning_version, m.employment_type, m.compensation_currency, m.compensation_basis, m.budgeted_compensation || null, m.target_start_month || null, m.priority != null ? m.priority : null, m.department_id || null, m.seniority || null]
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

  // Column order: 0 Role, 1 Priority, 2 Start, 3 Type, 4 Approval, 5 Manager,
  // 6 Days open, 7 Recruiting, 8 Engagement, 9 Pipeline, then financial.
  test('inline edits: priority, engagement, approval, then recruiting', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    const row = page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' });

    // Priority: click pill cell, select P0
    await row.locator('td').nth(1).click();
    await row.locator('.hiring-plan-inline-select').selectOption('0');
    await expect(page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' }).locator('.hiring-plan-prio--0')).toBeVisible({ timeout: 10000 });

    // Engagement: fte -> contractor
    const row2 = page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' });
    await row2.locator('td').nth(8).click();
    await row2.locator('.hiring-plan-inline-select').selectOption('contractor');
    await expect(page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' }).locator('td').nth(8)).toContainText('Contractor', { timeout: 10000 });

    // Recruiting on a pending role is not editable (dash, no title attr)
    const rowPending = page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' });
    await expect(rowPending.locator('td').nth(7)).not.toHaveAttribute('title', 'Click to change recruiting state');
    await expect(rowPending.locator('td').nth(7)).toContainText('—');

    // Approval: pending -> approved
    const row4 = page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' });
    await row4.locator('td').nth(4).click();
    await row4.locator('.hiring-plan-inline-select').selectOption('approved');
    await expect(page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' }).locator('td').nth(4)).toContainText('Approved', { timeout: 10000 });

    // Recruiting: unlocked by approval — not started -> recruiting
    const row3 = page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' });
    await expect(row3.locator('td').nth(7)).toHaveAttribute('title', 'Click to change recruiting state', { timeout: 10000 });
    await row3.locator('td').nth(7).click();
    await row3.locator('.hiring-plan-inline-select').selectOption('started');
    await expect(page.locator('.hiring-plan-row', { hasText: 'Sweep Engineer' }).locator('td').nth(7)).toContainText('Recruiting', { timeout: 10000 });

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
    // Default 24 months: Role + Approval + Start + 24 months + Horizon total
    await expect(page.locator('.hiring-plan-matrix thead th')).toHaveCount(28);

    await page.locator('#hpCostMonths').selectOption('12');
    await expect(page.locator('.hiring-plan-matrix thead th')).toHaveCount(16, { timeout: 10000 });

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

// ---------------------------------------------------------------------------
// Mockup-parity sweep: day rate column, closed-role cards toggle, recruiting
// and priority filters, sidebar planning/cost/approval/history sections,
// pipeline chip navigation, matrix sticky columns and horizon totals.
// ---------------------------------------------------------------------------

test.describe('Hiring Plan mockup parity', () => {
  let admin, client, dept;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Deep Client' });
    admin = await createTestUser({ role: 'admin', display_name: 'Deep Admin' });
    dept = await createTestHiringDepartment({ client_id: client.id, name: 'Engineering' });
    await createTestHiringSettings({
      client_id: client.id,
      coo_user_id: admin.id,
      finance_director_user_id: admin.id,
      fte_on_cost_pct: 10,
    });

    const producer = await insertPlanRole(client.id, {
      title: 'Deep Producer',
      approval_status: 'approved',
      target_start_month: '2026-08-01',
      budgeted_compensation: '72000',
      department_id: dept.id,
      priority: 1,
    });
    await insertPlanRole(client.id, {
      title: 'Deep Pending',
      approval_status: 'pending',
      target_start_month: '2026-10-01',
      budgeted_compensation: '36000',
      department_id: dept.id,
      priority: 2,
    });
    const filled = await insertPlanRole(client.id, {
      title: 'Deep Filled',
      approval_status: 'approved',
      target_start_month: '2026-07-01',
      budgeted_compensation: '50000',
      department_id: dept.id,
      priority: 0,
    });
    await pool.query(
      `UPDATE hiring_positions SET status = 'closed', closed_reason = 'filled', closed_at = NOW() WHERE id = $1`,
      [filled.id]
    );

    const { createTestCandidate } = require('../helpers/fixtures');
    await createTestCandidate({ client_id: client.id, position_id: producer.id, name: 'Deep Candidate A', stage: 'sourcing' });
    await createTestCandidate({ client_id: client.id, position_id: producer.id, name: 'Deep Candidate B', stage: 'interviews' });
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

  test('day rate column sits in front of Loaded/mo and converts the budget', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    const headers = await page.locator('.hiring-plan-table thead th').allTextContents();
    const clean = headers.map(h => h.replace(/[▲▼]/g, '').trim());
    const budgetIdx = clean.indexOf('Budget');
    const dayRateIdx = clean.indexOf('Day rate');
    const loadedIdx = clean.indexOf('Weighted/mo');
    expect(budgetIdx).toBeGreaterThan(-1);
    expect(dayRateIdx).toBe(budgetIdx + 1);
    expect(loadedIdx).toBe(dayRateIdx + 1);

    // 72,000 annual -> 72,000/12/21 = 285.7 -> £286/day
    const producerRow = page.locator('.hiring-plan-row', { hasText: 'Deep Producer' });
    await expect(producerRow.locator('td').nth(dayRateIdx)).toContainText('286');

    expect(errors).toEqual([]);
  });

  test('closed roles are hidden from priority cards until toggled', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    await page.locator('.hiring-plan-view-btn', { hasText: 'Roles' }).click();
    await expect(page.locator('.position-card')).toHaveCount(2, { timeout: 10000 });
    await expect(page.locator('.position-card', { hasText: 'Deep Filled' })).toHaveCount(0);

    await page.locator('#hpToggleClosed').click();
    await expect(page.locator('.position-card')).toHaveCount(3, { timeout: 10000 });
    await expect(page.locator('.position-card', { hasText: 'Deep Filled' })).toContainText('Hired');

    await page.locator('#hpToggleClosed').click();
    await expect(page.locator('.position-card')).toHaveCount(2, { timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('recruiting and priority filters narrow the table', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    await page.locator('#hpFilterRecruiting').selectOption('hired');
    await expect(page.locator('.hiring-plan-row')).toHaveCount(1);
    await expect(page.locator('.hiring-plan-row').first()).toContainText('Deep Filled');
    await page.locator('#hpFilterRecruiting').selectOption('');

    await page.locator('#hpFilterPriority').selectOption('1');
    await expect(page.locator('.hiring-plan-row')).toHaveCount(1);
    await expect(page.locator('.hiring-plan-row').first()).toContainText('Deep Producer');
    await page.locator('#hpFilterPriority').selectOption('');
    await expect(page.locator('.hiring-plan-row')).toHaveCount(3);

    expect(errors).toEqual([]);
  });

  test('sidebar shows planning details, cost assumptions, approval action and history', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    await page.locator('.hiring-plan-row', { hasText: 'Deep Pending' }).locator('.hiring-plan-role-cell').click();
    await expect(page.locator('#positionDetailPanel')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('.hp-sb-section h3', { hasText: 'Planning details' })).toBeVisible();
    await expect(page.locator('.hp-sb-section h3', { hasText: 'Compensation & cost assumptions' })).toBeVisible();
    await expect(page.locator('.hp-sb-item', { hasText: 'Day rate' })).toBeVisible();
    await expect(page.locator('.hp-sb-section h3', { hasText: 'Approval & change history' })).toBeVisible();

    // Approve from the sidebar; panel reopens with the new state and the
    // immutable history records the event.
    await page.locator('.hp-btn-approve').click();
    await expect(page.locator('#positionDetailPanel .hiring-plan-badge--success', { hasText: 'Approved' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#hpSbHistory')).toContainText('Approved', { timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('pipeline chip shows stage counts and navigates to filtered candidates', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    const chip = page.locator('.hiring-plan-row', { hasText: 'Deep Producer' }).locator('.hiring-plan-pipeline');
    await expect(chip).toContainText('2');
    await expect(chip).toContainText('Sou 1');
    await expect(chip).toContainText('Int 1');

    await chip.click();
    await expect(page.locator('.ats-tab.active')).toContainText('Pipeline', { timeout: 10000 });
    await expect(page.getByText('Deep Candidate A')).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('matrix shows approval and start sticky columns with horizon totals', async ({ page }) => {
    const errors = trapErrors(page);
    await openPlan(page);

    await page.locator('.hiring-plan-view-btn', { hasText: 'Monthly Costs' }).click();
    await expect(page.locator('.hiring-plan-matrix')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('.hiring-plan-matrix thead th', { hasText: 'Approval' })).toBeVisible();
    await expect(page.locator('.hiring-plan-matrix thead th', { hasText: 'Start' })).toBeVisible();
    await expect(page.locator('.hiring-plan-matrix thead th', { hasText: 'Horizon total' })).toBeVisible();

    const producerRow = page.locator('.hiring-plan-matrix tbody tr', { hasText: 'Deep Producer' });
    await expect(producerRow).toContainText('Approved');
    await expect(producerRow).toContainText('Aug 2026');
    await expect(producerRow.locator('.hiring-plan-horizon-cell')).not.toContainText('—');

    await expect(page.locator('.hiring-plan-total-row', { hasText: 'Combined Total' })).toBeVisible();

    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Unconfigured cost defaults (2026-07-24 Monthly Costs honesty fix).
// Reproduces the Couch Heroes UAT state: salaried roles, no
// hiring_client_settings row. The matrix must explain the real blocker and
// the settings modal must be the working one-step fix.
// ---------------------------------------------------------------------------

test.describe('Unconfigured cost defaults', () => {
  let admin, client;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Unconfigured Client' });
    admin = await createTestUser({ role: 'admin', display_name: 'Unconfig Admin' });
    // HIRED salaried role with NO settings row: must NOT read "no salary on record".
    await insertPlanRole(client.id, {
      title: 'Salaried Producer',
      status: 'closed', closed_reason: 'filled',
      approval_status: 'approved',
      target_start_month: '2026-08-01',
      budgeted_compensation: '72000',
      priority: 1,
    });
    // HIRED genuinely salary-less role: must KEEP the "no salary" label.
    await insertPlanRole(client.id, {
      title: 'Unsalaried Designer',
      status: 'closed', closed_reason: 'filled',
      approval_status: 'approved',
      target_start_month: '2026-08-01',
      budgeted_compensation: null,
      priority: 2,
    });
  });

  test('matrix names the missing defaults and settings save populates it', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await login(page, admin);
    await page.evaluate(() => switchView('hiring'));
    await page.waitForTimeout(2000);
    await page.getByRole('tab', { name: 'Hiring Plan' }).click();
    await page.waitForTimeout(1500);
    await page.evaluate((id) => changeHiringPlanClient(id), client.id);
    await expect(page.locator('.hiring-plan-table')).toBeVisible({ timeout: 15000 });

    await page.locator('.hiring-plan-view-btn', { hasText: 'Monthly Costs' }).click();
    await expect(page.locator('.hiring-plan-matrix')).toBeVisible({ timeout: 10000 });

    // Banner explains the model in plain English: FTE weighting missing,
    // contractors never weighted.
    const banner = page.locator('.hiring-plan-settings-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('FTE weighting is not set');

    // Salaried FTE shows its REAL base salary (72000/12 = £6,000) in amber
    // even before the weighting exists — never a blank row.
    const salaried = page.locator('.hiring-plan-matrix tbody tr', { hasText: 'Salaried Producer' });
    await expect(salaried).toContainText('FTE weighting % not set');
    await expect(salaried).not.toContainText('no salary on record');
    await expect(salaried.locator('.hiring-plan-cell--baseonly').first()).toContainText('£6,000');
    // Genuinely salary-less role stays honestly uncosted.
    const unsalaried = page.locator('.hiring-plan-matrix tbody tr', { hasText: 'Unsalaried Designer' });
    await expect(unsalaried).toContainText('no salary on record');
    await expect(unsalaried.locator('.hiring-plan-cell--baseonly')).toHaveCount(0);

    // Fix it through the banner's button.
    await banner.locator('button', { hasText: 'Open Settings' }).click();
    await expect(page.locator('#settingsOverlay')).toBeVisible();

    // The modal explains itself and offers ONE weighting input (FTE only —
    // contractor/PSC weighting no longer exists as a concept).
    await expect(page.locator('#settingsOverlay')).toContainText('Contractors are never weighted');
    await expect(page.locator('#hsFte')).toHaveValue('');
    await expect(page.locator('#hsContractor')).toHaveCount(0);
    await expect(page.locator('#hsPsc')).toHaveCount(0);

    await page.locator('#hsFte').fill('18');
    await page.locator('#settingsOverlay button', { hasText: 'Save' }).click();
    await expect(page.locator('#settingsOverlay')).toHaveCount(0, { timeout: 10000 });

    // Matrix now shows real numbers: 72000/12 = £6,000 base, ×1.18 = £7,080.
    await page.locator('.hiring-plan-view-btn', { hasText: 'Monthly Costs' }).click();
    await expect(page.locator('.hiring-plan-matrix')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.hiring-plan-settings-banner')).toHaveCount(0);
    const salariedAfter = page.locator('.hiring-plan-matrix tbody tr', { hasText: 'Salaried Producer' });
    await expect(salariedAfter).toContainText('£7,080');
    // The salary-less role stays honestly incomplete.
    const unsalariedAfter = page.locator('.hiring-plan-matrix tbody tr', { hasText: 'Unsalaried Designer' });
    await expect(unsalariedAfter).toContainText('no salary on record');

    expect(errors).toEqual([]);
  });
});
