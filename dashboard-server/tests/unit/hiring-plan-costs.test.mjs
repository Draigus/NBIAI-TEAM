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

  // Approved, GBP annual £60000 FTE, starts July 2026
  // Monthly: 5000 * 100 = 500000p base, * 1.10 = 550000p loaded
  await insertPlanRole(client.id, {
    title: 'July Producer',
    approval_status: 'approved',
    target_start_month: '2026-07-01',
    budgeted_compensation: '60000',
    priority: 1,
  });

  // Pending, GBP annual £48000 FTE, starts September 2026
  // Monthly: 4000 * 100 = 400000p base, * 1.10 = 440000p loaded
  await insertPlanRole(client.id, {
    title: 'September Engineer',
    approval_status: 'pending',
    target_start_month: '2026-09-01',
    budgeted_compensation: '48000',
    priority: 1,
  });

  // Approved, no start month, monthly contractor £3000
  // 300000p base, * 1.15 = 345000p loaded
  await insertPlanRole(client.id, {
    title: 'Undated Contractor',
    approval_status: 'approved',
    employment_type: 'contractor',
    compensation_basis: 'monthly',
    budgeted_compensation: '3000',
    priority: 1,
  });

  // Denied, GBP annual £72000, starts August 2026
  // Should appear in rows with zeros, excluded from totals
  await insertPlanRole(client.id, {
    title: 'Denied Designer',
    approval_status: 'denied',
    target_start_month: '2026-08-01',
    budgeted_compensation: '72000',
    priority: 1,
  });

  // Approved but incomplete (no budgeted_compensation), starts July 2026
  // Should show null cells and flag incomplete
  await insertPlanRole(client.id, {
    title: 'Incomplete Analyst',
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

    // 5 rows in soonest-first order (nulls last)
    expect(rows).toHaveLength(5);
    expect(rows.map(r => r.title)).toEqual([
      'July Producer',
      'Incomplete Analyst',
      'Denied Designer',
      'September Engineer',
      'Undated Contractor',
    ]);
  });

  it('rows include title and formatted GBP strings', async () => {
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
    expect(producer.state).toBe('planned');
    expect(producer.excluded).toBe(false);
    expect(producer.incomplete).toBe(false);
    // All 12 cells populated (starts in first month)
    expect(producer.base_gbp_pence.every(v => v === 500000)).toBe(true);
    expect(producer.loaded_gbp_pence.every(v => v === 550000)).toBe(true);
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

  it('incomplete roles have null cells and flag', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    const incomplete = res.body.rows.find(r => r.title === 'Incomplete Analyst');
    expect(incomplete.incomplete).toBe(true);
    // From start month onward, cells are null (not zero)
    expect(incomplete.base_gbp_pence.every(v => v === null)).toBe(true);
    expect(incomplete.loaded_gbp_pence.every(v => v === null)).toBe(true);

    expect(res.body.incompleteRoleIds).toContain(incomplete.role_id);
  });

  it('undated roles have null cells (unknown start)', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    const undated = res.body.rows.find(r => r.title === 'Undated Contractor');
    expect(undated.incomplete).toBe(true);
    expect(undated.base_gbp_pence.every(v => v === null)).toBe(true);
  });

  it('totals separate approved, pending, and combined correctly', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    const { totals } = res.body;

    // Approved bucket: July Producer contributes 500000/550000 per month for 12 months.
    // Undated Contractor and Incomplete Analyst have null cells (skipped in sums).
    expect(totals.approved.base_gbp_pence[0]).toBe(500000);
    expect(totals.approved.loaded_gbp_pence[0]).toBe(550000);
    expect(totals.approved.horizon_base_gbp_pence).toBe(500000 * 12);
    expect(totals.approved.horizon_loaded_gbp_pence).toBe(550000 * 12);
    expect(totals.approved.incomplete).toBe(true);

    // Pending bucket: September Engineer, 2 zeros then 10 months of 400000/440000
    expect(totals.pending.base_gbp_pence[0]).toBe(0);
    expect(totals.pending.base_gbp_pence[1]).toBe(0);
    expect(totals.pending.base_gbp_pence[2]).toBe(400000);
    expect(totals.pending.horizon_base_gbp_pence).toBe(400000 * 10);
    expect(totals.pending.horizon_loaded_gbp_pence).toBe(440000 * 10);
    expect(totals.pending.incomplete).toBe(false);

    // Combined: approved + pending
    expect(totals.combined.base_gbp_pence[0]).toBe(500000);
    expect(totals.combined.base_gbp_pence[2]).toBe(900000);
    expect(totals.combined.horizon_base_gbp_pence).toBe(500000 * 12 + 400000 * 10);
    expect(totals.combined.incomplete).toBe(true);
  });

  it('totals include formatted horizon strings', async () => {
    const { client, tokens } = await seedCostScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=12`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    const { totals } = res.body;
    expect(totals.approved.horizon_base_gbp).toBe('£60,000.00');
    expect(totals.approved.horizon_loaded_gbp).toBe('£66,000.00');
    expect(totals.combined.horizon_base_gbp).toBe('£100,000.00');
    expect(totals.combined.horizon_loaded_gbp).toBe('£110,000.00');
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
