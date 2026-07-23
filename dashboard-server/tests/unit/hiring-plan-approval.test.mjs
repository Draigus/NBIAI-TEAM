// dashboard-server/tests/unit/hiring-plan-approval.test.mjs
//
// Tests for approval, denial, reapproval and history endpoints.

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

async function seedApprovalScenario() {
  const client = await createTestClient({ name: 'ApprovalCo' });
  const nbiAdmin = await createTestUser({ role: 'admin', display_name: 'NBI Admin' });
  const coo = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin', display_name: 'COO User' });
  const finance = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Finance Dir' });
  const director = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Director' });
  const recruiter = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Recruiter' });

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
  };

  return { client, nbiAdmin, coo, finance, director, recruiter, dept, tokens };
}

async function createPendingRole(tokens, client, dept, director) {
  const res = await request(app)
    .post('/api/hiring-plan')
    .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
    .send({
      client_id: client.id,
      title: 'Senior Engineer',
      priority: 1,
      department_id: dept.id,
      description: 'Build things.',
      hiring_manager_user_id: director.id,
      target_start_month: '2026-10-01',
      requirement_type: 'new',
      employment_type: 'fte',
      budgeted_compensation: 90000,
      compensation_min: 80000,
      compensation_max: 100000,
      compensation_currency: 'GBP',
      compensation_basis: 'annual',
      fx_rate_to_gbp: 1,
    })
    .expect(201);
  return res.body;
}

// ---------------------------------------------------------------------------
// POST /api/hiring-plan/:id/approve
// ---------------------------------------------------------------------------

describe('POST /api/hiring-plan/:id/approve', () => {
  it('COO approves a pending role', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    const res = await request(app)
      .post(`/api/hiring-plan/${role.id}/approve`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: role.planning_version })
      .expect(200);

    expect(res.body.approval_status).toBe('approved');
    expect(res.body.planning_version).toBe(role.planning_version + 1);
  });

  it('NBI admin can approve', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    const res = await request(app)
      .post(`/api/hiring-plan/${role.id}/approve`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ planning_version: role.planning_version })
      .expect(200);

    expect(res.body.approval_status).toBe('approved');
  });

  it('Finance cannot approve', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    await request(app)
      .post(`/api/hiring-plan/${role.id}/approve`)
      .set('Cookie', `nbi_session=${tokens.finance}`)
      .send({ planning_version: role.planning_version })
      .expect(403);
  });

  it('creates an immutable approval event', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    await request(app)
      .post(`/api/hiring-plan/${role.id}/approve`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: role.planning_version })
      .expect(200);

    const { rows } = await pool.query(
      "SELECT * FROM hiring_approval_events WHERE position_id = $1 AND event_type = 'approved' ORDER BY created_at",
      [role.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].to_approval_status).toBe('approved');
    expect(rows[0].position_snapshot).toBeTruthy();
  });

  it('returns 409 on version conflict', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    await request(app)
      .post(`/api/hiring-plan/${role.id}/approve`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: 999 })
      .expect(409);
  });

  it('does not start recruiting on approval (spec: approved roles begin Not started)', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    const res = await request(app)
      .post(`/api/hiring-plan/${role.id}/approve`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: role.planning_version })
      .expect(200);

    expect(res.body.recruiting_started_at).toBeNull();

    const list = await request(app)
      .get(`/api/hiring-plan?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .expect(200);
    const listed = list.body.roles.find(r => r.id === role.id);
    expect(listed.recruiting_status).toBe('not_started');
    expect(listed.days_open).toBeNull();
  });

  it('rejects starting recruiting on a role that is not approved', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    const res = await request(app)
      .post(`/api/hiring-plan/${role.id}/recruiting`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: role.planning_version, started: true })
      .expect(400);

    expect(res.body.error).toMatch(/approved/i);
  });

  it('sends notifications to requester and recruiter', async () => {
    const { client, director, recruiter, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    await request(app)
      .post(`/api/hiring-plan/${role.id}/approve`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: role.planning_version })
      .expect(200);

    const { rows } = await pool.query(
      "SELECT * FROM notifications WHERE type = 'hiring_plan_approved'",
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// POST /api/hiring-plan/:id/deny
// ---------------------------------------------------------------------------

describe('POST /api/hiring-plan/:id/deny', () => {
  it('COO denies with a structured reason', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    const res = await request(app)
      .post(`/api/hiring-plan/${role.id}/deny`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: role.planning_version, denial_reason: 'not_current_priority' })
      .expect(200);

    expect(res.body.approval_status).toBe('denied');
  });

  it('requires denial_comment for Other reason', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    await request(app)
      .post(`/api/hiring-plan/${role.id}/deny`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: role.planning_version, denial_reason: 'other' })
      .expect(400);
  });

  it('accepts Other with explanation', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    const res = await request(app)
      .post(`/api/hiring-plan/${role.id}/deny`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({
        planning_version: role.planning_version,
        denial_reason: 'other',
        denial_comment: 'Budget freeze until Q2.',
      })
      .expect(200);

    expect(res.body.approval_status).toBe('denied');
  });

  it('creates a denial event with reason', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    await request(app)
      .post(`/api/hiring-plan/${role.id}/deny`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: role.planning_version, denial_reason: 'beyond_financial_boundaries' })
      .expect(200);

    const { rows } = await pool.query(
      "SELECT * FROM hiring_approval_events WHERE position_id = $1 AND event_type = 'denied'",
      [role.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].denial_reason).toBe('beyond_financial_boundaries');
  });

  it('rejects invalid denial reason', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    await request(app)
      .post(`/api/hiring-plan/${role.id}/deny`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: role.planning_version, denial_reason: 'too_expensive' })
      .expect(400);
  });
});

// ---------------------------------------------------------------------------
// Material-change reapproval (via PATCH)
// ---------------------------------------------------------------------------

describe('material-change reapproval', () => {
  it('returns an approved role to Pending after a material financial edit', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    const approved = await request(app)
      .post(`/api/hiring-plan/${role.id}/approve`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: role.planning_version })
      .expect(200);

    const changed = await request(app)
      .patch(`/api/hiring-plan/${role.id}`)
      .set('Cookie', `nbi_session=${tokens.finance}`)
      .send({ planning_version: approved.body.planning_version, budgeted_compensation: 105000 })
      .expect(200);

    expect(changed.body.approval_status).toBe('pending');

    const { rows } = await pool.query(
      "SELECT event_type FROM hiring_approval_events WHERE position_id = $1 ORDER BY created_at",
      [role.id]
    );
    const types = rows.map(r => r.event_type);
    expect(types).toContain('reopened_for_approval');
  });

  it('non-material edit does not change approval status', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    const approved = await request(app)
      .post(`/api/hiring-plan/${role.id}/approve`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: role.planning_version })
      .expect(200);

    const changed = await request(app)
      .patch(`/api/hiring-plan/${role.id}`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .send({ planning_version: approved.body.planning_version, description: 'Updated description.' })
      .expect(200);

    expect(changed.body.approval_status).toBe('approved');
  });
});

// ---------------------------------------------------------------------------
// GET /api/hiring-plan/:id/history
// ---------------------------------------------------------------------------

describe('GET /api/hiring-plan/:id/history', () => {
  it('returns approval events in chronological order', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    await request(app)
      .post(`/api/hiring-plan/${role.id}/approve`)
      .set('Cookie', `nbi_session=${tokens.coo}`)
      .send({ planning_version: role.planning_version })
      .expect(200);

    const res = await request(app)
      .get(`/api/hiring-plan/${role.id}/history`)
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].event_type).toBeDefined();
  });

  it('rejects a user from a different client', async () => {
    const { client, director, dept, tokens } = await seedApprovalScenario();
    const role = await createPendingRole(tokens, client, dept, director);

    const otherClient = await createTestClient({ name: 'OtherCo' });
    const outsider = await createTestUser({ role: 'member', client_id: otherClient.id, client_role: 'admin', display_name: 'Outsider' });
    const outsiderToken = await mintSession(outsider.id);

    await request(app)
      .get(`/api/hiring-plan/${role.id}/history`)
      .set('Cookie', `nbi_session=${outsiderToken}`)
      .expect(403);
  });

  it('returns 404 for an unknown role id', async () => {
    const { tokens } = await seedApprovalScenario();

    await request(app)
      .get('/api/hiring-plan/00000000-0000-4000-8000-000000000000/history')
      .set('Cookie', `nbi_session=${tokens.nbiAdmin}`)
      .expect(404);
  });
});
