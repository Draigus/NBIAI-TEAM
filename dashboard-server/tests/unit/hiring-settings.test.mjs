// dashboard-server/tests/unit/hiring-settings.test.mjs
//
// Tests for routes/hiring-plan.js settings and department endpoints.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser, createTestClient, createTestHiringPosition,
  createTestHiringDepartment, createTestHiringSettings, createTestHiringRecruiter,
} = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedScenario() {
  const client = await createTestClient({ name: 'AcmeCo' });
  const nbiAdmin = await createTestUser({ role: 'admin', display_name: 'NBI Admin' });
  const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin', display_name: 'Client Admin' });
  const clientMember = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member', display_name: 'Client Member' });
  const nbiMember = await createTestUser({ role: 'member', display_name: 'NBI Member' });

  const nbiToken = await mintSession(nbiAdmin.id);
  const clientAdminToken = await mintSession(clientAdmin.id);
  const clientMemberToken = await mintSession(clientMember.id);
  const nbiMemberToken = await mintSession(nbiMember.id);

  return { client, nbiAdmin, clientAdmin, clientMember, nbiMember, nbiToken, clientAdminToken, clientMemberToken, nbiMemberToken };
}

// ---------------------------------------------------------------------------
// GET /api/hiring-settings
// ---------------------------------------------------------------------------

describe('GET /api/hiring-settings', () => {
  it('returns settings for a client (NBI admin with ?client_id)', async () => {
    const { client, nbiAdmin, nbiToken } = await seedScenario();
    await createTestHiringSettings({ client_id: client.id, fte_on_cost_pct: 18 });

    const res = await request(app)
      .get(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .expect(200);

    expect(res.body.client_id).toBe(client.id);
    expect(res.body.fte_on_cost_pct).toBeDefined();
  });

  it('returns settings for a client user scoped to their client', async () => {
    const { client, clientAdminToken } = await seedScenario();
    await createTestHiringSettings({ client_id: client.id, fte_on_cost_pct: 15 });

    const res = await request(app)
      .get('/api/hiring-settings')
      .set('Cookie', `nbi_session=${clientAdminToken}`)
      .expect(200);

    expect(res.body.client_id).toBe(client.id);
  });

  it('returns empty settings when none configured', async () => {
    const { client, nbiToken } = await seedScenario();

    const res = await request(app)
      .get(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .expect(200);

    expect(res.body.client_id).toBe(client.id);
    expect(res.body.coo_user_id).toBeNull();
  });

  it('redacts on-cost percentages for non-financial users', async () => {
    const { client, clientMember, clientMemberToken } = await seedScenario();
    await createTestHiringSettings({ client_id: client.id, fte_on_cost_pct: 18 });

    const res = await request(app)
      .get('/api/hiring-settings')
      .set('Cookie', `nbi_session=${clientMemberToken}`)
      .expect(200);

    expect(res.body).not.toHaveProperty('fte_on_cost_pct');
    expect(res.body).not.toHaveProperty('contractor_on_cost_pct');
    expect(res.body).not.toHaveProperty('psc_on_cost_pct');
    expect(res.body).toHaveProperty('coo_user_id');
  });

  it('shows on-cost percentages to NBI admin', async () => {
    const { client, nbiToken } = await seedScenario();
    await createTestHiringSettings({ client_id: client.id, fte_on_cost_pct: 18 });

    const res = await request(app)
      .get(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('fte_on_cost_pct');
  });

  it('returns 401 without authentication', async () => {
    const { client } = await seedScenario();
    await request(app)
      .get(`/api/hiring-settings?client_id=${client.id}`)
      .expect(401);
  });

  it('includes departments and recruiter_user_ids in the response', async () => {
    const { client, nbiAdmin, nbiToken } = await seedScenario();
    await createTestHiringSettings({ client_id: client.id });
    const dept = await createTestHiringDepartment({ client_id: client.id, name: 'Engineering', director_user_id: nbiAdmin.id });
    await createTestHiringRecruiter({ client_id: client.id, user_id: nbiAdmin.id });

    const res = await request(app)
      .get(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .expect(200);

    expect(res.body.departments).toHaveLength(1);
    expect(res.body.departments[0].name).toBe('Engineering');
    expect(res.body.recruiter_user_ids).toContain(nbiAdmin.id);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/hiring-settings
// ---------------------------------------------------------------------------

describe('PATCH /api/hiring-settings', () => {
  it('NBI admin can configure settings', async () => {
    const { client, nbiAdmin, clientAdmin, nbiToken } = await seedScenario();

    const res = await request(app)
      .patch(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({
        coo_user_id: clientAdmin.id,
        finance_director_user_id: null,
        fte_on_cost_pct: 18.5,
        contractor_on_cost_pct: 3,
        psc_on_cost_pct: 0,
        permitted_currencies: ['GBP', 'EUR'],
      })
      .expect(200);

    expect(res.body.coo_user_id).toBe(clientAdmin.id);
    expect(parseFloat(res.body.fte_on_cost_pct)).toBeCloseTo(18.5);
    expect(res.body.permitted_currencies).toEqual(['GBP', 'EUR']);
  });

  it('client admin can configure settings', async () => {
    const { client, clientAdmin, clientAdminToken } = await seedScenario();

    const res = await request(app)
      .patch('/api/hiring-settings')
      .set('Cookie', `nbi_session=${clientAdminToken}`)
      .send({ fte_on_cost_pct: 20 })
      .expect(200);

    expect(parseFloat(res.body.fte_on_cost_pct)).toBeCloseTo(20);
  });

  it('ordinary client member gets 403', async () => {
    const { client, clientMemberToken } = await seedScenario();

    await request(app)
      .patch('/api/hiring-settings')
      .set('Cookie', `nbi_session=${clientMemberToken}`)
      .send({ fte_on_cost_pct: 99 })
      .expect(403);
  });

  it('NBI member gets 403', async () => {
    const { client, nbiMemberToken } = await seedScenario();

    await request(app)
      .patch(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiMemberToken}`)
      .send({ fte_on_cost_pct: 99 })
      .expect(403);
  });

  it('updates recruiter_user_ids transactionally', async () => {
    const { client, nbiAdmin, clientAdmin, nbiToken } = await seedScenario();

    await request(app)
      .patch(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ recruiter_user_ids: [clientAdmin.id] })
      .expect(200);

    const { rows } = await pool.query('SELECT user_id FROM hiring_recruiters WHERE client_id = $1', [client.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(clientAdmin.id);

    await request(app)
      .patch(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ recruiter_user_ids: [nbiAdmin.id] })
      .expect(200);

    const { rows: updated } = await pool.query('SELECT user_id FROM hiring_recruiters WHERE client_id = $1', [client.id]);
    expect(updated).toHaveLength(1);
    expect(updated[0].user_id).toBe(nbiAdmin.id);
  });

  it('rejects permitted_currencies without GBP', async () => {
    const { client, nbiToken } = await seedScenario();

    await request(app)
      .patch(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ permitted_currencies: ['EUR', 'USD'] })
      .expect(400);
  });

  it('creates an audit log entry', async () => {
    const { client, nbiAdmin, nbiToken } = await seedScenario();

    await request(app)
      .patch(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ fte_on_cost_pct: 22 })
      .expect(200);

    const { rows } = await pool.query(
      "SELECT * FROM audit_log WHERE entity_type = 'hiring_settings' AND entity_id = $1",
      [client.id]
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/hiring-settings/departments
// ---------------------------------------------------------------------------

describe('GET /api/hiring-settings/departments', () => {
  it('returns departments for the scoped client', async () => {
    const { client, nbiAdmin, nbiToken } = await seedScenario();
    await createTestHiringDepartment({ client_id: client.id, name: 'Engineering', director_user_id: nbiAdmin.id });
    await createTestHiringDepartment({ client_id: client.id, name: 'Art' });

    const res = await request(app)
      .get(`/api/hiring-settings/departments?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body.map(d => d.name).sort()).toEqual(['Art', 'Engineering']);
  });

  it('client user sees only their own client departments', async () => {
    const { client, clientAdminToken } = await seedScenario();
    const otherClient = await createTestClient({ name: 'OtherCo' });
    await createTestHiringDepartment({ client_id: client.id, name: 'Eng' });
    await createTestHiringDepartment({ client_id: otherClient.id, name: 'OtherEng' });

    const res = await request(app)
      .get('/api/hiring-settings/departments')
      .set('Cookie', `nbi_session=${clientAdminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Eng');
  });
});

// ---------------------------------------------------------------------------
// POST /api/hiring-settings/departments
// ---------------------------------------------------------------------------

describe('POST /api/hiring-settings/departments', () => {
  it('NBI admin can create a department', async () => {
    const { client, nbiToken } = await seedScenario();

    const res = await request(app)
      .post(`/api/hiring-settings/departments?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ name: 'Design' })
      .expect(201);

    expect(res.body.name).toBe('Design');
    expect(res.body.client_id).toBe(client.id);
    expect(res.body.is_active).toBe(true);
  });

  it('client admin can create a department', async () => {
    const { client, clientAdminToken } = await seedScenario();

    const res = await request(app)
      .post('/api/hiring-settings/departments')
      .set('Cookie', `nbi_session=${clientAdminToken}`)
      .send({ name: 'QA' })
      .expect(201);

    expect(res.body.name).toBe('QA');
  });

  it('ordinary client member gets 403', async () => {
    const { clientMemberToken } = await seedScenario();

    await request(app)
      .post('/api/hiring-settings/departments')
      .set('Cookie', `nbi_session=${clientMemberToken}`)
      .send({ name: 'Nope' })
      .expect(403);
  });

  it('rejects case-insensitive duplicate name for same client', async () => {
    const { client, nbiToken } = await seedScenario();
    await createTestHiringDepartment({ client_id: client.id, name: 'Engineering' });

    await request(app)
      .post(`/api/hiring-settings/departments?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ name: 'engineering' })
      .expect(409);
  });

  it('allows same name for different clients', async () => {
    const { nbiToken } = await seedScenario();
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    await createTestHiringDepartment({ client_id: clientA.id, name: 'Engineering' });

    await request(app)
      .post(`/api/hiring-settings/departments?client_id=${clientB.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ name: 'Engineering' })
      .expect(201);
  });

  it('rejects missing name', async () => {
    const { client, nbiToken } = await seedScenario();

    await request(app)
      .post(`/api/hiring-settings/departments?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({})
      .expect(400);
  });

  it('can assign a director on creation', async () => {
    const { client, clientAdmin, nbiToken } = await seedScenario();

    const res = await request(app)
      .post(`/api/hiring-settings/departments?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ name: 'Art', director_user_id: clientAdmin.id })
      .expect(201);

    expect(res.body.director_user_id).toBe(clientAdmin.id);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/hiring-settings/departments/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/hiring-settings/departments/:id', () => {
  it('renames a department', async () => {
    const { client, nbiToken } = await seedScenario();
    const dept = await createTestHiringDepartment({ client_id: client.id, name: 'Eng' });

    const res = await request(app)
      .patch(`/api/hiring-settings/departments/${dept.id}?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ name: 'Engineering' })
      .expect(200);

    expect(res.body.name).toBe('Engineering');
  });

  it('can assign and clear a director', async () => {
    const { client, clientAdmin, nbiToken } = await seedScenario();
    const dept = await createTestHiringDepartment({ client_id: client.id, name: 'Art' });

    await request(app)
      .patch(`/api/hiring-settings/departments/${dept.id}?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ director_user_id: clientAdmin.id })
      .expect(200);

    const cleared = await request(app)
      .patch(`/api/hiring-settings/departments/${dept.id}?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ director_user_id: null })
      .expect(200);

    expect(cleared.body.director_user_id).toBeNull();
  });

  it('can deactivate a department', async () => {
    const { client, nbiToken } = await seedScenario();
    const dept = await createTestHiringDepartment({ client_id: client.id, name: 'Legacy' });

    const res = await request(app)
      .patch(`/api/hiring-settings/departments/${dept.id}?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ is_active: false })
      .expect(200);

    expect(res.body.is_active).toBe(false);
  });

  it('ordinary member gets 403', async () => {
    const { client, clientMemberToken } = await seedScenario();
    const dept = await createTestHiringDepartment({ client_id: client.id, name: 'Eng' });

    await request(app)
      .patch(`/api/hiring-settings/departments/${dept.id}`)
      .set('Cookie', `nbi_session=${clientMemberToken}`)
      .send({ name: 'No' })
      .expect(403);
  });

  it('cross-client department update returns 403', async () => {
    const { nbiToken } = await seedScenario();
    const otherClient = await createTestClient({ name: 'OtherCo' });
    const dept = await createTestHiringDepartment({ client_id: otherClient.id, name: 'Eng' });
    const user = await createTestUser({ role: 'member', client_id: otherClient.id, client_role: 'member' });

    const crossToken = await mintSession(user.id);
    await request(app)
      .patch(`/api/hiring-settings/departments/${dept.id}`)
      .set('Cookie', `nbi_session=${crossToken}`)
      .send({ name: 'No' })
      .expect(403);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/hiring-settings/departments/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/hiring-settings/departments/:id', () => {
  it('deletes an unreferenced department', async () => {
    const { client, nbiToken } = await seedScenario();
    const dept = await createTestHiringDepartment({ client_id: client.id, name: 'Temp' });

    await request(app)
      .delete(`/api/hiring-settings/departments/${dept.id}?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .expect(204);

    const { rows } = await pool.query('SELECT * FROM hiring_departments WHERE id = $1', [dept.id]);
    expect(rows).toHaveLength(0);
  });

  it('deactivates a referenced department instead of deleting', async () => {
    const { client, nbiToken } = await seedScenario();
    const dept = await createTestHiringDepartment({ client_id: client.id, name: 'Eng' });
    await createTestHiringPosition({ client_id: client.id, department_id: dept.id, title: 'Dev' });

    const res = await request(app)
      .delete(`/api/hiring-settings/departments/${dept.id}?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .expect(200);

    expect(res.body.is_active).toBe(false);
    const { rows } = await pool.query('SELECT * FROM hiring_departments WHERE id = $1', [dept.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].is_active).toBe(false);
  });

  it('ordinary member gets 403', async () => {
    const { client, clientMemberToken } = await seedScenario();
    const dept = await createTestHiringDepartment({ client_id: client.id, name: 'X' });

    await request(app)
      .delete(`/api/hiring-settings/departments/${dept.id}`)
      .set('Cookie', `nbi_session=${clientMemberToken}`)
      .expect(403);
  });
});

// ---------------------------------------------------------------------------
// Unconfigured client honesty (2026-07-24): GET must not fabricate 0% on-cost
// defaults when no settings row exists. A zero presented as configured made
// the sidebar show "+0%" while the cost engine correctly refused to compute.
// ---------------------------------------------------------------------------

describe('GET /api/hiring-settings for an unconfigured client', () => {
  it('returns configured=false and null on-cost pcts (no fake zeros)', async () => {
    const { client, nbiToken } = await seedScenario();
    const res = await request(app)
      .get(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .expect(200);

    expect(res.body.configured).toBe(false);
    expect(res.body.fte_on_cost_pct).toBeNull();
    expect(res.body.contractor_on_cost_pct).toBeNull();
    expect(res.body.psc_on_cost_pct).toBeNull();
  });

  it('returns configured=true when the settings row exists', async () => {
    const { client, nbiToken } = await seedScenario();
    await createTestHiringSettings({ client_id: client.id, fte_on_cost_pct: 18 });
    const res = await request(app)
      .get(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .expect(200);

    expect(res.body.configured).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Partial first configuration (Codex review P2, 2026-07-24): a first-time
// save of only SOME percentages must leave the others NULL (migration 086
// dropped DEFAULT 0 / NOT NULL), never materialise fabricated zeros.
// ---------------------------------------------------------------------------

describe('PATCH /api/hiring-settings partial first configuration', () => {
  it('creates the row with omitted pcts NULL, not 0', async () => {
    const { client, nbiToken } = await seedScenario();

    const patched = await request(app)
      .patch(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ fte_on_cost_pct: 18 })
      .expect(200);
    expect(parseFloat(patched.body.fte_on_cost_pct)).toBeCloseTo(18);
    expect(patched.body.contractor_on_cost_pct).toBeNull();
    expect(patched.body.psc_on_cost_pct).toBeNull();

    const res = await request(app)
      .get(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .expect(200);
    expect(res.body.configured).toBe(true);
    expect(parseFloat(res.body.fte_on_cost_pct)).toBeCloseTo(18);
    expect(res.body.contractor_on_cost_pct).toBeNull();
    expect(res.body.psc_on_cost_pct).toBeNull();
  });
});

describe('PATCH /api/hiring-settings clearing a saved on-cost', () => {
  it('explicit null unsets a previously saved percentage (Codex P2)', async () => {
    const { client, nbiToken } = await seedScenario();
    await createTestHiringSettings({ client_id: client.id, fte_on_cost_pct: 18, contractor_on_cost_pct: 15 });

    const res = await request(app)
      .patch(`/api/hiring-settings?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${nbiToken}`)
      .send({ fte_on_cost_pct: null })
      .expect(200);

    expect(res.body.fte_on_cost_pct).toBeNull();
    expect(parseFloat(res.body.contractor_on_cost_pct)).toBeCloseTo(15);
  });
});
