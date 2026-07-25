// dashboard-server/tests/unit/hiring-plan-export.test.mjs
//
// Tests for GET /api/hiring-plan/export.xlsx. Verifies permission-safe
// workbook generation: financial users see all 4 sheets, non-financial
// users see only Hiring Plan + Pipeline Summary with no leaked data.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const ExcelJS = require('exceljs');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser, createTestClient, createTestCandidate,
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
       fx_rate_to_gbp, on_cost_override_pct, target_start_month, priority,
       department_id, seniority, description
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
    [
      clientId, merged.title, merged.status, merged.closed_reason,
      merged.approval_status, merged.planning_version, merged.employment_type,
      merged.compensation_currency, merged.compensation_basis,
      merged.budgeted_compensation || null, merged.expected_workdays_per_month || null,
      merged.fx_rate_to_gbp || null, merged.on_cost_override_pct || null,
      merged.target_start_month || null, merged.priority != null ? merged.priority : null,
      merged.department_id || null, merged.seniority || null, merged.description || null,
    ]
  );
  return rows[0];
}

async function seedExportScenario() {
  const client = await createTestClient({ name: 'ExportCo' });

  const nbiAdmin = await createTestUser({ role: 'admin', display_name: 'NBI Admin' });
  const coo = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin', display_name: 'COO' });
  const finance = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Finance Dir' });
  const director = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Dept Director' });
  const recruiter = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Recruiter' });

  const dept = await createTestHiringDepartment({ client_id: client.id, name: 'Engineering', director_user_id: director.id });
  await createTestHiringSettings({
    client_id: client.id,
    coo_user_id: coo.id,
    finance_director_user_id: finance.id,
    fte_on_cost_pct: 10,
    contractor_on_cost_pct: 15,
    psc_on_cost_pct: 2,
    permitted_currencies: ['GBP', 'EUR'],
  });
  await createTestHiringRecruiter({ client_id: client.id, user_id: recruiter.id });

  const role1 = await insertPlanRole(client.id, {
    title: 'Senior Producer',
    approval_status: 'approved',
    target_start_month: '2026-08-01',
    budgeted_compensation: '72000',
    department_id: dept.id,
    seniority: 'Senior',
    priority: 1,
    description: 'Owns delivery programme.',
  });

  const role2 = await insertPlanRole(client.id, {
    title: 'Junior Engineer',
    approval_status: 'pending',
    target_start_month: '2026-10-01',
    budgeted_compensation: '36000',
    department_id: dept.id,
    seniority: 'Junior',
    priority: 2,
  });

  await createTestCandidate({ client_id: client.id, position_id: role1.id, name: 'Alice', stage: 'screening' });
  await createTestCandidate({ client_id: client.id, position_id: role1.id, name: 'Bob', stage: 'interview' });
  await createTestCandidate({ client_id: client.id, position_id: role2.id, name: 'Charlie', stage: 'sourcing' });

  const tokens = {
    nbiAdmin: await mintSession(nbiAdmin.id),
    coo: await mintSession(coo.id),
    finance: await mintSession(finance.id),
    director: await mintSession(director.id),
    recruiter: await mintSession(recruiter.id),
  };

  return { client, dept, tokens, role1, role2 };
}

function binaryParser(res, callback) {
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

async function loadWorkbook(response) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(response.body);
  return wb;
}

function allCellValues(worksheet) {
  const values = [];
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.value !== null && cell.value !== undefined) {
        values.push(String(cell.value));
      }
    });
  });
  return values;
}

// ---------------------------------------------------------------------------
// GET /api/hiring-plan/export.xlsx
// ---------------------------------------------------------------------------

describe('GET /api/hiring-plan/export.xlsx', () => {
  it('returns 401 without auth', async () => {
    await request(app)
      .get('/api/hiring-plan/export.xlsx?client_id=fake')
      .expect(401);
  });

  it('returns 400 without client_id', async () => {
    const { tokens } = await seedExportScenario();
    await request(app)
      .get('/api/hiring-plan/export.xlsx')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(400);
  });

  it('NBI admin gets all 4 sheets', async () => {
    const { client, tokens } = await seedExportScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);

    const wb = await loadWorkbook(res);
    expect(wb.worksheets.map(s => s.name)).toEqual([
      'Hiring Plan', 'Monthly Costs', 'Pipeline Summary', 'Assumptions',
    ]);
  });

  it('Monthly Costs sheet has frozen panes', async () => {
    const { client, tokens } = await seedExportScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    const costs = wb.getWorksheet('Monthly Costs');
    expect(costs.views[0]).toMatchObject({ state: 'frozen' });
  });

  it('Hiring Plan sheet contains role titles and data', async () => {
    const { client, tokens } = await seedExportScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    const plan = wb.getWorksheet('Hiring Plan');
    const cellValues = allCellValues(plan);
    expect(cellValues).toContain('Senior Producer');
    expect(cellValues).toContain('Junior Engineer');
  });

  it('Hiring Plan sheet includes financial columns for admin', async () => {
    const { client, tokens } = await seedExportScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    const plan = wb.getWorksheet('Hiring Plan');
    const cellValues = allCellValues(plan);
    expect(cellValues.some(v => v.includes('72000') || v.includes('Budget'))).toBe(true);
  });

  it('Pipeline Summary sheet shows candidate counts', async () => {
    const { client, tokens } = await seedExportScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    const pipeline = wb.getWorksheet('Pipeline Summary');
    const cellValues = allCellValues(pipeline);
    expect(cellValues).toContain('Senior Producer');
  });

  it('Assumptions sheet shows on-cost percentages', async () => {
    const { client, tokens } = await seedExportScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    const assumptions = wb.getWorksheet('Assumptions');
    const cellValues = allCellValues(assumptions);
    expect(cellValues.some(v => v.includes('10') || v.includes('FTE'))).toBe(true);
  });

  it('Hiring Plan sheet carries a Day Rate and its basis, so the Assumptions formula describes a figure the workbook actually contains', async () => {
    const { client, tokens } = await seedExportScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    const plan = wb.getWorksheet('Hiring Plan');
    const headers = plan.getRow(1).values.filter(Boolean).map(String);

    expect(headers).toContain('Day Rate');
    expect(headers).toContain('Day Rate Basis');

    const basisCol = headers.indexOf('Day Rate Basis') + 1;
    const rateCol = headers.indexOf('Day Rate') + 1;
    const bases = [];
    const rates = [];
    plan.eachRow((row, n) => {
      if (n === 1) return;
      const b = row.getCell(basisCol).value;
      const r = row.getCell(rateCol).value;
      if (b) bases.push(String(b));
      if (typeof r === 'number') rates.push(r);
    });

    // Every priced role states where its divisor came from, and no role is
    // silently left with an unexplained rate.
    expect(rates.length).toBeGreaterThan(0);
    expect(bases.length).toBeGreaterThan(0);
    expect(bases.every(b => /\/mo \(|recorded day rate/.test(b))).toBe(true);
  });

  it('Recruiter gets only Hiring Plan and Pipeline Summary', async () => {
    const { client, tokens } = await seedExportScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.recruiter}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    expect(wb.worksheets.map(s => s.name)).toEqual([
      'Hiring Plan', 'Pipeline Summary',
    ]);
  });

  it('Director gets only Hiring Plan and Pipeline Summary', async () => {
    const { client, tokens } = await seedExportScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.director}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    expect(wb.worksheets.map(s => s.name)).toEqual([
      'Hiring Plan', 'Pipeline Summary',
    ]);
  });

  it('restricted workbooks contain no budget or compensation data', async () => {
    const { client, tokens } = await seedExportScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.recruiter}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    for (const sheet of wb.worksheets) {
      const cellValues = allCellValues(sheet);
      const forbidden = ['72000', '36000', 'Budget', 'On-Cost', 'FX Rate'];
      for (const term of forbidden) {
        expect(cellValues.some(v => v.includes(term))).toBe(false);
      }
    }
  });

  it('COO and Finance Director get all 4 sheets', async () => {
    const { client, tokens } = await seedExportScenario();

    const resCoo = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .buffer(true).parse(binaryParser)
      .expect(200);
    const wbCoo = await loadWorkbook(resCoo);
    expect(wbCoo.worksheets).toHaveLength(4);

    const resFin = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.finance}`)
      .buffer(true).parse(binaryParser)
      .expect(200);
    const wbFin = await loadWorkbook(resFin);
    expect(wbFin.worksheets).toHaveLength(4);
  });
});
