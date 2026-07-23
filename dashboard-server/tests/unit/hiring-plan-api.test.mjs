// dashboard-server/tests/unit/hiring-plan-api.test.mjs
//
// Tests for hiring plan role CRUD endpoints in routes/hiring-plan.js.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser, createTestClient, createTestCandidate,
  createTestHiringDepartment, createTestHiringSettings, createTestHiringRecruiter,
} = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

async function seedPlanScenario() {
  const client = await createTestClient({ name: 'PlanCo' });

  const nbiAdmin = await createTestUser({ role: 'admin', display_name: 'NBI Admin' });
  const coo = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin', display_name: 'COO' });
  const finance = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Finance Dir' });
  const director = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Dept Director' });
  const recruiter = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Recruiter' });
  const clientMember = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Client Member' });

  const dept = await createTestHiringDepartment({ client_id: client.id, name: 'Engineering', director_user_id: director.id });
  await createTestHiringSettings({
    client_id: client.id,
    coo_user_id: coo.id,
    finance_director_user_id: finance.id,
    fte_on_cost_pct: 18,
    permitted_currencies: ['GBP', 'EUR'],
  });
  await createTestHiringRecruiter({ client_id: client.id, user_id: recruiter.id });

  const tokens = {
    nbiAdmin: await mintSession(nbiAdmin.id),
    coo: await mintSession(coo.id),
    finance: await mintSession(finance.id),
    director: await mintSession(director.id),
    recruiter: await mintSession(recruiter.id),
    clientMember: await mintSession(clientMember.id),
  };

  return { client, nbiAdmin, coo, finance, director, recruiter, clientMember, dept, tokens };
}

function operationalRole(dept, director) {
  return {
    title: 'Senior Producer',
    priority: 1,
    department_id: dept.id,
    description: 'Own delivery across the client programme.',
    hiring_manager_user_id: director.id,
    target_start_month: '2026-10-01',
    requirement_type: 'new',
    employment_type: 'fte',
  };
}

// ---------------------------------------------------------------------------
// POST /api/hiring-plan
// ---------------------------------------------------------------------------

describe('POST /api/hiring-plan', () => {
  it('Department Director creates a pending role for own department', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const res = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.director}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    expect(res.body).toMatchObject({
      approval_status: 'pending',
      planning_version: 1,
      title: 'Senior Producer',
      employment_type: 'fte',
    });
    expect(res.body.requested_by_user_id).toBe(director.id);
    expect(res.body.approval_submitted_at).toBeTruthy();
  });

  it('NBI admin creates a role for any client', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const res = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    expect(res.body.approval_status).toBe('pending');
  });

  it('ordinary client member cannot create', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.clientMember}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(403);
  });

  it('rejects missing title', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();
    const body = { client_id: client.id, ...operationalRole(dept, director) };
    delete body.title;

    await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.director}`)
      .send(body)
      .expect(400);
  });

  it('enforces annual basis for FTE', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({
        client_id: client.id,
        ...operationalRole(dept, director),
        compensation_basis: 'daily',
        budgeted_compensation: 500,
        compensation_currency: 'GBP',
      })
      .expect(400);
  });

  it('strips financial fields from director input', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const res = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.director}`)
      .send({
        client_id: client.id,
        ...operationalRole(dept, director),
        budgeted_compensation: 90000,
        fx_rate_to_gbp: 1,
      })
      .expect(201);

    expect(res.body.budgeted_compensation).toBeNull();
    expect(res.body.fx_rate_to_gbp).toBeNull();
  });

  it('Finance can include financial fields', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const res = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.finance}`)
      .send({
        client_id: client.id,
        ...operationalRole(dept, director),
        budgeted_compensation: 90000,
        compensation_min: 80000,
        compensation_max: 100000,
        compensation_currency: 'GBP',
        compensation_basis: 'annual',
        fx_rate_to_gbp: 1,
      })
      .expect(201);

    expect(res.body.budgeted_compensation).not.toBeNull();
  });

  it('validates permitted currencies', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({
        client_id: client.id,
        ...operationalRole(dept, director),
        compensation_currency: 'JPY',
        compensation_basis: 'annual',
        budgeted_compensation: 5000000,
      })
      .expect(400);
  });

  it('requires target_start_month to be first of month', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director), target_start_month: '2026-10-15' })
      .expect(400);
  });

  it('accepts legacy employment type aliases', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const res = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director), employment_type: 'permanent' })
      .expect(201);

    expect(res.body.employment_type).toBe('fte');
  });
});

// ---------------------------------------------------------------------------
// GET /api/hiring-plan
// ---------------------------------------------------------------------------

describe('GET /api/hiring-plan', () => {
  it('returns roles with capabilities for the client', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    const res = await request(app)
      .get(`/api/hiring-plan?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    expect(res.body.roles).toHaveLength(1);
    expect(res.body.roles[0].title).toBe('Senior Producer');
    expect(res.body.capabilities).toBeDefined();
    expect(res.body.capabilities.view_financials).toBe(true);
  });

  it('derives recruiting_status hired for closed roles filled by a candidate', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const created = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    await pool.query(
      `UPDATE hiring_positions SET status = 'closed', closed_reason = 'filled', closed_at = NOW() WHERE id = $1`,
      [created.body.id]
    );

    const res = await request(app)
      .get(`/api/hiring-plan?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    expect(res.body.roles[0].recruiting_status).toBe('hired');
  });

  it('derives recruiting_status closed for closed roles not filled', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const created = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    await pool.query(
      `UPDATE hiring_positions SET status = 'closed', closed_reason = 'shut_down', closed_at = NOW() WHERE id = $1`,
      [created.body.id]
    );

    const res = await request(app)
      .get(`/api/hiring-plan?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    expect(res.body.roles[0].recruiting_status).toBe('closed');
  });

  it('POST /:id/recruiting starts and clears recruiting on an approved role', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const created = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    const approved = await request(app)
      .post(`/api/hiring-plan/${created.body.id}/approve`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ planning_version: created.body.planning_version })
      .expect(200);

    const started = await request(app)
      .post(`/api/hiring-plan/${created.body.id}/recruiting`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ planning_version: approved.body.planning_version, started: true })
      .expect(200);
    expect(started.body.recruiting_status).toBe('recruiting');
    expect(started.body.days_open).toBe(0);

    const cleared = await request(app)
      .post(`/api/hiring-plan/${created.body.id}/recruiting`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ planning_version: started.body.planning_version, started: false })
      .expect(200);
    expect(cleared.body.recruiting_status).toBe('not_started');
    expect(cleared.body.days_open).toBeNull();
  });

  it('POST /:id/recruiting enforces version conflict and closed-role guard', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const created = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    const approved = await request(app)
      .post(`/api/hiring-plan/${created.body.id}/approve`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ planning_version: created.body.planning_version })
      .expect(200);

    await request(app)
      .post(`/api/hiring-plan/${created.body.id}/recruiting`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ planning_version: 999, started: true })
      .expect(409);

    await pool.query(
      `UPDATE hiring_positions SET status = 'closed', closed_reason = 'filled', closed_at = NOW() WHERE id = $1`,
      [created.body.id]
    );
    await request(app)
      .post(`/api/hiring-plan/${created.body.id}/recruiting`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ planning_version: approved.body.planning_version, started: true })
      .expect(400);
  });

  it('redacts financial fields for Department Director', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({
        client_id: client.id,
        ...operationalRole(dept, director),
        budgeted_compensation: 90000,
        compensation_currency: 'GBP',
        compensation_basis: 'annual',
        fx_rate_to_gbp: 1,
      })
      .expect(201);

    const res = await request(app)
      .get(`/api/hiring-plan?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.director}`)
      .expect(200);

    expect(res.body.roles[0]).not.toHaveProperty('budgeted_compensation');
    expect(res.body.roles[0]).not.toHaveProperty('compensation_min');
    expect(res.body.roles[0]).toHaveProperty('title');
  });

  it('includes candidate_counts from linked candidates', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const created = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    await createTestCandidate({ client_id: client.id, position_id: created.body.id, stage: 'sourcing' });
    await createTestCandidate({ client_id: client.id, position_id: created.body.id, stage: 'interviews' });
    await createTestCandidate({ client_id: client.id, position_id: created.body.id, stage: 'sourcing' });

    const res = await request(app)
      .get(`/api/hiring-plan?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    expect(res.body.roles[0].candidate_counts).toBeDefined();
    expect(res.body.roles[0].candidate_counts.sourcing).toBe(2);
    expect(res.body.roles[0].candidate_counts.interviews).toBe(1);
    expect(res.body.roles[0].candidate_total).toBe(3);
  });

  it('sorts null-start roles last', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director), title: 'No Start', target_start_month: null })
      .expect(201);

    await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director), title: 'Oct Start' })
      .expect(201);

    const res = await request(app)
      .get(`/api/hiring-plan?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    expect(res.body.roles[0].title).toBe('Oct Start');
    expect(res.body.roles[1].title).toBe('No Start');
  });

  it('ordinary client member can view but not create', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    const res = await request(app)
      .get('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.clientMember}`)
      .expect(200);

    expect(res.body.roles).toHaveLength(1);
    expect(res.body.capabilities.create_requirement).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/hiring-plan/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/hiring-plan/:id', () => {
  it('updates operational fields with version bump', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const created = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    const res = await request(app)
      .patch(`/api/hiring-plan/${created.body.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ planning_version: 1, title: 'Lead Producer' })
      .expect(200);

    expect(res.body.title).toBe('Lead Producer');
    expect(res.body.planning_version).toBe(2);
  });

  it('returns 409 on version conflict', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const created = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    await request(app)
      .patch(`/api/hiring-plan/${created.body.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ planning_version: 1, title: 'First Edit' })
      .expect(200);

    const conflict = await request(app)
      .patch(`/api/hiring-plan/${created.body.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ planning_version: 1, title: 'Stale Edit' })
      .expect(409);

    expect(conflict.body.current).toBeDefined();
    expect(conflict.body.current.planning_version).toBe(2);
  });

  it('Finance can edit financial fields', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const created = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    const res = await request(app)
      .patch(`/api/hiring-plan/${created.body.id}`)
      .set('Cookie', `nbi_session=${tokens.finance}`)
      .send({
        planning_version: 1,
        budgeted_compensation: 90000,
        compensation_currency: 'GBP',
        compensation_basis: 'annual',
        fx_rate_to_gbp: 1,
      })
      .expect(200);

    expect(parseFloat(res.body.budgeted_compensation)).toBe(90000);
  });

  it('Director cannot edit financial fields', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const created = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({
        client_id: client.id,
        ...operationalRole(dept, director),
        budgeted_compensation: 90000,
        compensation_currency: 'GBP',
        compensation_basis: 'annual',
        fx_rate_to_gbp: 1,
      })
      .expect(201);

    const res = await request(app)
      .patch(`/api/hiring-plan/${created.body.id}`)
      .set('Cookie', `nbi_session=${tokens.director}`)
      .send({ planning_version: 1, title: 'Updated Title', budgeted_compensation: 999999 })
      .expect(200);

    expect(res.body.title).toBe('Updated Title');
    const { rows: [role] } = await pool.query('SELECT budgeted_compensation FROM hiring_positions WHERE id = $1', [created.body.id]);
    expect(parseFloat(role.budgeted_compensation)).toBe(90000);
  });

  it('requires planning_version', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const created = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    await request(app)
      .patch(`/api/hiring-plan/${created.body.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ title: 'No Version' })
      .expect(400);
  });

  it('ordinary client member cannot edit', async () => {
    const { client, director, dept, tokens } = await seedPlanScenario();

    const created = await request(app)
      .post('/api/hiring-plan')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ client_id: client.id, ...operationalRole(dept, director) })
      .expect(201);

    await request(app)
      .patch(`/api/hiring-plan/${created.body.id}`)
      .set('Cookie', `nbi_session=${tokens.clientMember}`)
      .send({ planning_version: 1, title: 'Nope' })
      .expect(403);
  });
});
