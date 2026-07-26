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
    // The seeded roles are both FTE. A day rate is a contract term (088), so
    // one contractor is needed for there to be a day rate in the workbook at
    // all. Same salary as the Senior Producer, which makes the FTE-versus-
    // contractor difference in the assertions below unambiguous.
    await insertPlanRole(client.id, {
      title: 'Contract Gameplay Engineer',
      approval_status: 'approved',
      employment_type: 'contractor',
      budgeted_compensation: '72000',
      target_start_month: '2026-09-01',
      priority: 3,
    });

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

    const titleCol = headers.indexOf('Title') + 1;
    const basisCol = headers.indexOf('Day Rate Basis') + 1;
    const rateCol = headers.indexOf('Day Rate') + 1;
    const byTitle = {};
    plan.eachRow((row, n) => {
      if (n === 1) return;
      byTitle[String(row.getCell(titleCol).value)] = {
        rate: row.getCell(rateCol).value,
        basis: String(row.getCell(basisCol).value || ''),
      };
    });

    // The contractor carries a rate and states where its divisor came from.
    // 72,000 / 12 / 18 = 333.33, the standard basis with no client figure set.
    const contractor = byTitle['Contract Gameplay Engineer'];
    expect(typeof contractor.rate).toBe('number');
    expect(Math.round(contractor.rate)).toBe(333);
    expect(contractor.basis).toMatch(/18\/mo \(standard/);

    // Staff carry NO day rate, and the basis cell says why rather than leaving
    // a blank that reads as missing data. Deriving one would put a figure in a
    // client workbook that no contract supports.
    const fte = byTitle['Senior Producer'];
    expect(fte.rate).toBeFalsy();
    expect(fte.basis).toBe('n/a, salaried');
  });

  it('refuses a day rate for a contractor whose currency was never recorded, matching the screen', async () => {
    const { client, tokens } = await seedExportScenario();
    // compensation_currency is as nullable as the basis (084) and the cost
    // engine refuses such a role with missing_currency. The screen suppresses
    // the figure; a workbook printing 333.33 beside a blank Currency cell is
    // the same invented-assumption defect one column to the left.
    await insertPlanRole(client.id, {
      title: 'Contract Engineer No Currency',
      approval_status: 'approved',
      employment_type: 'contractor',
      budgeted_compensation: '72000',
      compensation_currency: null,
      target_start_month: '2026-09-01',
      priority: 3,
    });

    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    const plan = wb.getWorksheet('Hiring Plan');
    const headers = plan.getRow(1).values.filter(Boolean).map(String);
    const titleCol = headers.indexOf('Title') + 1;
    const basisCol = headers.indexOf('Day Rate Basis') + 1;
    const rateCol = headers.indexOf('Day Rate') + 1;

    let row = null;
    plan.eachRow((r, n) => {
      if (n === 1) return;
      if (String(r.getCell(titleCol).value) === 'Contract Engineer No Currency') {
        row = { rate: r.getCell(rateCol).value, basis: String(r.getCell(basisCol).value || '') };
      }
    });

    expect(row).not.toBeNull();
    expect(row.rate).toBeFalsy();
    expect(row.basis).toBe('no currency recorded');
  });

  it('derives a monthly contract day rate from the monthly amount, and the Assumptions formula states every branch', async () => {
    const { client, tokens } = await seedExportScenario();
    // A monthly contract divides by workdays alone. The old Assumptions text
    // claimed annual / 12 / days for everything, so a client reproducing the
    // arithmetic on a monthly contractor got a figure 12x out.
    await insertPlanRole(client.id, {
      title: 'Contract Engineer Monthly',
      approval_status: 'approved',
      employment_type: 'contractor',
      budgeted_compensation: '6000',
      compensation_basis: 'monthly',
      target_start_month: '2026-09-01',
      priority: 3,
    });

    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    const plan = wb.getWorksheet('Hiring Plan');
    const headers = plan.getRow(1).values.filter(Boolean).map(String);
    const titleCol = headers.indexOf('Title') + 1;
    const rateCol = headers.indexOf('Day Rate') + 1;

    let rate = null;
    plan.eachRow((r, n) => {
      if (n === 1) return;
      if (String(r.getCell(titleCol).value) === 'Contract Engineer Monthly') {
        rate = r.getCell(rateCol).value;
      }
    });

    // 6,000 / 18 = 333.33 -- NOT 6,000 / 12 / 18.
    expect(typeof rate).toBe('number');
    expect(Math.round(rate)).toBe(333);

    // The stated formula must cover the branch this row used.
    const joined = allCellValues(wb.getWorksheet('Assumptions')).join(' | ');
    expect(joined).toMatch(/[Aa]nnual contracts?: value \/ 12 \/ contractor working days/);
    expect(joined).toMatch(/[Mm]onthly contracts?: value \/ contractor working days/);
    expect(joined).toMatch(/recorded rate, with no division/);
  });

  it('refuses a day rate for a contractor whose pay basis was never recorded, rather than assuming annual', async () => {
    const { client, tokens } = await seedExportScenario();
    // compensation_basis is nullable (migration 084 added it to existing rows)
    // and the cost engine REFUSES such a role with missing_basis. Treating the
    // gap as "annual" divides an unknown-basis figure by 12 and puts a day
    // rate no contract supports into a workbook handed to the client.
    await insertPlanRole(client.id, {
      title: 'Contract Engineer No Basis',
      approval_status: 'approved',
      employment_type: 'contractor',
      budgeted_compensation: '72000',
      compensation_basis: null,
      target_start_month: '2026-09-01',
      priority: 3,
    });

    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    const plan = wb.getWorksheet('Hiring Plan');
    const headers = plan.getRow(1).values.filter(Boolean).map(String);
    const titleCol = headers.indexOf('Title') + 1;
    const basisCol = headers.indexOf('Day Rate Basis') + 1;
    const rateCol = headers.indexOf('Day Rate') + 1;

    let row = null;
    plan.eachRow((r, n) => {
      if (n === 1) return;
      if (String(r.getCell(titleCol).value) === 'Contract Engineer No Basis') {
        row = { rate: r.getCell(rateCol).value, basis: String(r.getCell(basisCol).value || '') };
      }
    });

    expect(row).not.toBeNull();
    // No fabricated 333.33: the cell is empty because the figure is unknowable.
    expect(row.rate).toBeFalsy();
    // And it says WHY, naming the missing input so someone can go and fix it.
    expect(row.basis).toBe('no pay basis recorded');
  });

  it('Assumptions sheet states that day rates are a contractor term and gives the standard divisor', async () => {
    const { client, tokens } = await seedExportScenario();
    const res = await request(app)
      .get(`/api/hiring-plan/export.xlsx?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .buffer(true).parse(binaryParser)
      .expect(200);

    const wb = await loadWorkbook(res);
    const cellValues = allCellValues(wb.getWorksheet('Assumptions'));
    const joined = cellValues.join(' | ');

    expect(joined).toContain('Day Rate Applies To');
    expect(joined).toMatch(/Contractors and PSCs only/);
    // No client figure is seeded, so the sheet must say so rather than
    // presenting the fallback as a chosen setting.
    expect(joined).toMatch(/not set, using the standard 18/);
    // Glen's hard rule, and one of these strings ships inside a client workbook.
    expect(joined.includes('—')).toBe(false);
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
