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
