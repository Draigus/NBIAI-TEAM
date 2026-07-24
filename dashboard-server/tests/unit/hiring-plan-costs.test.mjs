// dashboard-server/tests/unit/hiring-plan-costs.test.mjs
//
// Tests for GET /api/hiring-plan/costs endpoint. Verifies the API layer that
// wraps the pure cost engine (lib/hiring-costs.js) with auth, validation,
// permission checks, and response formatting.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser, createTestClient,
  createTestHiringDepartment, createTestHiringSettings, createTestHiringRecruiter,
} = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

async function insertPlanRole(clientId, fields) {
  const defaults = {
    status: 'open',
    closed_reason: null,
    approval_status: 'pending',
    planning_version: 1,
    employment_type: 'fte',
    compensation_currency: 'GBP',
    compensation_basis: 'annual',
  };
  const merged = { ...defaults, ...fields };
  const { rows } = await pool.query(
    `INSERT INTO hiring_positions (
       client_id, title, status, closed_reason, approval_status, planning_version,
       employment_type, compensation_currency, compensation_basis,
       budgeted_compensation, expected_workdays_per_month,
       fx_rate_to_gbp, on_cost_override_pct, target_start_month, priority
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [
      clientId,
      merged.title,
      merged.status,
      merged.closed_reason,
      merged.approval_status,
      merged.planning_version,
      merged.employment_type,
      merged.compensation_currency,
      merged.compensation_basis,
      merged.budgeted_compensation || null,
      merged.expected_workdays_per_month || null,
      merged.fx_rate_to_gbp || null,
      merged.on_cost_override_pct || null,
      merged.target_start_month || null,
      merged.priority != null ? merged.priority : null,
    ]
  );
  return rows[0];
}

async function seedCostScenario() {
  const client = await createTestClient({ name: 'CostCo' });

  const nbiAdmin = await createTestUser({ role: 'admin', display_name: 'NBI Admin' });
  const coo = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin', display_name: 'COO' });
  const finance = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Finance Dir' });
  const recruiter = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Recruiter' });

  await createTestHiringSettings({
    client_id: client.id,
    coo_user_id: coo.id,
    finance_director_user_id: finance.id,
    fte_on_cost_pct: 10,
    contractor_on_cost_pct: 15,
    psc_on_cost_pct: 2,
  });
  await createTestHiringRecruiter({ client_id: client.id, user_id: recruiter.id });

  // HIRED, approved, GBP annual £60000 FTE, target July 2026.
  // First payment: August 2026 (one-month delay).
  // Monthly: 5000 * 100 = 500000p base, * 1.10 = 550000p loaded.
  await insertPlanRole(client.id, {
    title: 'July Producer',
    status: 'closed', closed_reason: 'filled',
    approval_status: 'approved',
    target_start_month: '2026-07-01',
    budgeted_compensation: '60000',
    priority: 1,
  });

  // PLANNED (open), pending, GBP annual £48000, target September 2026.
  // Unfilled → zero across all months.
  await insertPlanRole(client.id, {
    title: 'September Engineer',
    approval_status: 'pending',
    target_start_month: '2026-09-01',
    budgeted_compensation: '48000',
    priority: 1,
  });

  // PLANNED (open), approved, no start month, monthly contractor £3000.
  // Unfilled → zero across all months.
  await insertPlanRole(client.id, {
    title: 'Undated Contractor',
    approval_status: 'approved',
    employment_type: 'contractor',
    compensation_basis: 'monthly',
    budgeted_compensation: '3000',
    priority: 1,
  });

  // Denied, GBP annual £72000, starts August 2026.
  // Excluded → zeros, not in totals.
  await insertPlanRole(client.id, {
    title: 'Denied Designer',
    approval_status: 'denied',
    target_start_month: '2026-08-01',
    budgeted_compensation: '72000',
    priority: 1,
  });

  // HIRED but incomplete (no salary), target July 2026.
  // Null cells and incomplete flag.
  await insertPlanRole(client.id, {
    title: 'Incomplete Analyst',
    status: 'closed', closed_reason: 'filled',
    approval_status: 'approved',
    target_start_month: '2026-07-01',
    budgeted_compensation: null,
    priority: 2,
  });

  const tokens = {
    nbiAdmin: await mintSession(nbiAdmin.id),
    coo: await mintSession(coo.id),
    finance: await mintSession(finance.id),
    recruiter: await mintSession(recruiter.id),
  };

  return { client, tokens };
}

// ---------------------------------------------------------------------------
// GET /api/hiring-plan/costs
// ---------------------------------------------------------------------------

describe('GET /api/hiring-plan/costs', () => {
  it('returns 401 without auth', async () => {
    await request(app)
      .get('/api/hiring-plan/costs?client_id=fake&start_month=2026-07-01&months=12')
      .expect(401);
  });

  it('returns 400 when months is not 12, 24, or 36', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=18`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(400);
    expect(res.body.error).toMatch(/12.*24.*36/);
  });

  it('returns 400 when start_month is missing', async () => {
    const { client, tokens } = await seedCostScenario();
    await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(400);
  });

  it('returns 400 when start_month is not first of month', async () => {
    const { client, tokens } = await seedCostScenario();
    await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-15&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(400);
  });

  it('returns 403 for recruiter (no view_financials)', async () => {
    const { client, tokens } = await seedCostScenario();
    await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.recruiter}`)
      .expect(403);
  });

  it('NBI admin gets correct 12-month cost matrix', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    const { months, rows, totals, incompleteRoleIds } = res.body;

    // 12 month keys from 2026-07 to 2027-06
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2026-07');
    expect(months[11]).toBe('2027-06');

    // 5 rows: hired first, then planned soonest-first (nulls last), denied last.
    expect(rows).toHaveLength(5);
    expect(rows.map(r => r.title)).toEqual([
      'July Producer',
      'Incomplete Analyst',
      'September Engineer',
      'Undated Contractor',
      'Denied Designer',
    ]);
  });

  it('hired rows include title, formatted GBP strings, and first-payment-month delay', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    const producer = res.body.rows.find(r => r.title === 'July Producer');
    expect(producer.monthly_base_gbp_pence).toBe(500000);
    expect(producer.monthly_loaded_gbp_pence).toBe(550000);
    expect(producer.monthly_base_gbp).toBe('£5,000.00');
    expect(producer.monthly_loaded_gbp).toBe('£5,500.00');
    expect(producer.state).toBe('hired');
    expect(producer.excluded).toBe(false);
    expect(producer.incomplete).toBe(false);
    // Target Jul → first payment Aug. Index 0 (Jul) = 0, indices 1-11 = costs.
    expect(producer.base_gbp_pence[0]).toBe(0);
    expect(producer.base_gbp_pence[1]).toBe(500000);
    expect(producer.base_gbp_pence.slice(1).every(v => v === 500000)).toBe(true);
    expect(producer.loaded_gbp_pence[0]).toBe(0);
    expect(producer.loaded_gbp_pence.slice(1).every(v => v === 550000)).toBe(true);
  });

  it('planned (unfilled) roles show zero costs', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    const engineer = res.body.rows.find(r => r.title === 'September Engineer');
    expect(engineer.state).toBe('planned');
    expect(engineer.incomplete).toBe(false);
    expect(engineer.base_gbp_pence.every(v => v === 0)).toBe(true);
    expect(engineer.loaded_gbp_pence.every(v => v === 0)).toBe(true);
    // Per-unit cost metadata still computed for the detail view
    expect(engineer.monthly_base_gbp_pence).toBe(400000);
    expect(engineer.monthly_loaded_gbp_pence).toBe(440000);
  });

  it('denied roles appear with zeros and excluded flag', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    const denied = res.body.rows.find(r => r.title === 'Denied Designer');
    expect(denied.state).toBe('excluded');
    expect(denied.excluded).toBe(true);
    expect(denied.base_gbp_pence.every(v => v === 0)).toBe(true);
    expect(denied.loaded_gbp_pence.every(v => v === 0)).toBe(true);
  });

  it('hired incomplete roles have null cells from first payment month', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    const incomplete = res.body.rows.find(r => r.title === 'Incomplete Analyst');
    expect(incomplete.state).toBe('hired');
    expect(incomplete.incomplete).toBe(true);
    // Target Jul → first payment Aug. Jul=0, Aug onwards=null (no salary to compute).
    expect(incomplete.base_gbp_pence[0]).toBe(0);
    expect(incomplete.base_gbp_pence.slice(1).every(v => v === null)).toBe(true);
    expect(incomplete.loaded_gbp_pence.slice(1).every(v => v === null)).toBe(true);

    expect(res.body.incompleteRoleIds).toContain(incomplete.role_id);
  });

  it('planned undated roles show zero (not null)', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    const undated = res.body.rows.find(r => r.title === 'Undated Contractor');
    expect(undated.state).toBe('planned');
    expect(undated.incomplete).toBe(false);
    expect(undated.base_gbp_pence.every(v => v === 0)).toBe(true);
  });

  it('totals reflect only hired roles (planned contribute zero)', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    const { totals } = res.body;

    // Approved: July Producer (hired) → first payment Aug. Jul=0, Aug-Jun=500000/550000 (11 months).
    // Incomplete Analyst (hired, no salary) → null cells, flags incomplete.
    // Undated Contractor (planned) → zero.
    expect(totals.approved.base_gbp_pence[0]).toBe(0);       // Jul: before first payment
    expect(totals.approved.base_gbp_pence[1]).toBe(500000);  // Aug onwards
    expect(totals.approved.loaded_gbp_pence[0]).toBe(0);
    expect(totals.approved.loaded_gbp_pence[1]).toBe(550000);
    expect(totals.approved.horizon_base_gbp_pence).toBe(500000 * 11);
    expect(totals.approved.horizon_loaded_gbp_pence).toBe(550000 * 11);
    expect(totals.approved.incomplete).toBe(true);

    // Pending: September Engineer is planned → zero contribution.
    expect(totals.pending.base_gbp_pence[0]).toBe(0);
    expect(totals.pending.horizon_base_gbp_pence).toBe(0);
    expect(totals.pending.horizon_loaded_gbp_pence).toBe(0);
    expect(totals.pending.incomplete).toBe(false);

    // Combined: just July Producer's costs.
    expect(totals.combined.base_gbp_pence[0]).toBe(0);
    expect(totals.combined.base_gbp_pence[1]).toBe(500000);
    expect(totals.combined.horizon_base_gbp_pence).toBe(500000 * 11);
    expect(totals.combined.incomplete).toBe(true);
  });

  it('totals include formatted horizon strings', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    const { totals } = res.body;
    // 11 months of £5,000 = £55,000; loaded = £60,500
    expect(totals.approved.horizon_base_gbp).toBe('£55,000.00');
    expect(totals.approved.horizon_loaded_gbp).toBe('£60,500.00');
    // Combined same (pending is zero).
    expect(totals.combined.horizon_base_gbp).toBe('£55,000.00');
    expect(totals.combined.horizon_loaded_gbp).toBe('£60,500.00');
  });

  it('COO and Finance Director also have access', async () => {
    const { client, tokens } = await seedCostScenario();

    await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .expect(200);

    await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.finance}`)
      .expect(200);
  });

  it('accepts 24 and 36 month horizons', async () => {
    const { client, tokens } = await seedCostScenario();

    const res24 = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=24`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);
    expect(res24.body.months).toHaveLength(24);

    const res36 = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=36`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);
    expect(res36.body.months).toHaveLength(36);
  });

  it('returns 400 when client_id is missing', async () => {
    const { tokens } = await seedCostScenario();
    await request(app)
      .get('/api/hiring-plan/costs?start_month=2026-07-01&months=12')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(400);
  });
});

// ---------------------------------------------------------------------------
// settings_configured + incomplete_reasons (2026-07-24 Monthly Costs honesty
// fix): the response must say WHETHER client cost defaults exist and WHY each
// incomplete row cannot be costed, so the UI can stop mislabelling every
// incomplete role as "no salary on record".
// ---------------------------------------------------------------------------

describe('GET /api/hiring-plan/costs settings_configured and incomplete_reasons', () => {
  it('hired role without settings: settings_configured=false and missing_on_cost_default', async () => {
    const client = await createTestClient({ name: 'NoSettingsCo' });
    const nbiAdmin = await createTestUser({ role: 'admin', display_name: 'NBI Admin NS' });
    const token = await mintSession(nbiAdmin.id);
    await insertPlanRole(client.id, {
      title: 'Salaried But Uncosted',
      status: 'closed', closed_reason: 'filled',
      approval_status: 'approved',
      target_start_month: '2026-07-01',
      budgeted_compensation: '60000',
      priority: 1,
    });

    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.settings_configured).toBe(false);
    expect(res.body.rows[0].state).toBe('hired');
    expect(res.body.rows[0].incomplete).toBe(true);
    expect(res.body.rows[0].incomplete_reasons).toEqual(['missing_on_cost_default']);
    // Base cost still computes from salary alone:
    // 60000/12 = £5,000 = 500000 pence. Only the loaded figure is unset.
    expect(res.body.rows[0].monthly_base_gbp_pence).toBe(500000);
    expect(res.body.rows[0].monthly_base_gbp).toBe('£5,000.00');
    expect(res.body.rows[0].monthly_loaded_gbp_pence).toBeNull();
    expect(res.body.rows[0].monthly_loaded_gbp).toBeNull();
    // Target Jul → first payment Aug (index 1). Jul (index 0) = 0.
    expect(res.body.rows[0].base_gbp_pence[0]).toBe(0);
    expect(res.body.rows[0].base_gbp_pence[1]).toBe(500000);
    expect(res.body.rows[0].loaded_gbp_pence[1]).toBeNull();
    expect(res.body.totals.approved.base_only_gbp_pence[0]).toBe(0);
    expect(res.body.totals.approved.base_only_gbp_pence[1]).toBe(500000);
  });

  it('planned role without settings: zero costs, not incomplete', async () => {
    const client = await createTestClient({ name: 'NoSettingsPlanned' });
    const nbiAdmin = await createTestUser({ role: 'admin', display_name: 'NBI Admin NP' });
    const token = await mintSession(nbiAdmin.id);
    await insertPlanRole(client.id, {
      title: 'Planned No Settings',
      approval_status: 'approved',
      target_start_month: '2026-07-01',
      budgeted_compensation: '60000',
      priority: 1,
    });

    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.rows[0].state).toBe('planned');
    expect(res.body.rows[0].incomplete).toBe(false);
    expect(res.body.rows[0].base_gbp_pence.every(v => v === 0)).toBe(true);
  });

  it('reports settings_configured=true and per-row reasons when the settings row exists', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    expect(res.body.settings_configured).toBe(true);
    const complete = res.body.rows.find(r => r.title === 'July Producer');
    expect(complete.incomplete_reasons).toEqual([]);
    const noSalary = res.body.rows.find(r => r.title === 'Incomplete Analyst');
    expect(noSalary.incomplete_reasons).toEqual(['missing_salary']);
    // Undated Contractor is planned → not incomplete, empty reasons.
    const undated = res.body.rows.find(r => r.title === 'Undated Contractor');
    expect(undated.state).toBe('planned');
    expect(undated.incomplete_reasons).toEqual([]);
  });
});

describe('GET /api/hiring-plan/costs weighting is FTE-only', () => {
  it('FTE weights with the blanket %; contractors are complete and unweighted', async () => {
    const client = await createTestClient({ name: 'PartialCo' });
    const nbiAdmin = await createTestUser({ role: 'admin', display_name: 'NBI Admin Partial' });
    const token = await mintSession(nbiAdmin.id);
    // Only the blanket FTE % exists — the contractor needs nothing.
    await pool.query(
      'INSERT INTO hiring_client_settings (client_id, fte_on_cost_pct) VALUES ($1, $2)',
      [client.id, 10]
    );
    await insertPlanRole(client.id, {
      title: 'Costed FTE',
      status: 'closed', closed_reason: 'filled',
      approval_status: 'approved',
      target_start_month: '2026-07-01',
      budgeted_compensation: '60000',
      priority: 1,
    });
    await insertPlanRole(client.id, {
      title: 'Hired Contractor',
      status: 'closed', closed_reason: 'filled',
      approval_status: 'approved',
      employment_type: 'contractor',
      target_start_month: '2026-07-01',
      budgeted_compensation: '60000',
      priority: 2,
    });

    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.settings_configured).toBe(true);
    const fte = res.body.rows.find(r => r.title === 'Costed FTE');
    expect(fte.state).toBe('hired');
    expect(fte.incomplete).toBe(false);
    expect(fte.monthly_loaded_gbp_pence).toBe(550000);
    // Contractor: weighted cost IS the base cost. Never flagged incomplete
    // for weighting, never amber.
    const contractor = res.body.rows.find(r => r.title === 'Hired Contractor');
    expect(contractor.state).toBe('hired');
    expect(contractor.incomplete).toBe(false);
    expect(contractor.incomplete_reasons).toEqual([]);
    expect(contractor.monthly_base_gbp_pence).toBe(500000);
    expect(contractor.monthly_loaded_gbp_pence).toBe(500000);
    expect(contractor.on_cost_pct).toBe(0);
  });
});
