// dashboard-server/tests/unit/per-client-stages.test.mjs
//
// Tests for Spec D Tasks 2 & 3: Per-Client Stages API + Dynamic Stage Validation.
//
// 14 tests total:
//   9 for the stages CRUD API (GET/PUT/DELETE /api/clients/:id/hiring-stages)
//   5 for dynamic stage validation in candidate endpoints

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestCandidate } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

// ---------------------------------------------------------------------------
// Stages API
// ---------------------------------------------------------------------------

describe('GET /api/clients/:id/hiring-stages', () => {
  it('returns global default when no custom stages set (isCustom: false, 5 stages)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Acme' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .get(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.isCustom).toBe(false);
    expect(Array.isArray(res.body.stages)).toBe(true);
    expect(res.body.stages).toHaveLength(6);
    // Check known default keys present
    const keys = res.body.stages.map(s => s.key);
    expect(keys).toContain('sourcing');
    expect(keys).toContain('onboarded');
    expect(keys).toContain('process_closed');
  });

  it('client user can GET stages for their own client', async () => {
    const client = await createTestClient({ name: 'ClientA' });
    const user = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(user.id);

    const res = await request(app)
      .get(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.stages).toBeDefined();
  });

  it('client user cannot GET stages for another client', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(userA.id);

    await request(app)
      .get(`/api/clients/${clientB.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(403);
  });
});

describe('PUT /api/clients/:id/hiring-stages', () => {
  it('saves custom stages and GET then returns isCustom: true', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Acme' });
    const token = await mintSession(admin.id);

    const customStages = [
      { key: 'applied', label: 'Applied' },
      { key: 'phone-screen', label: 'Phone Screen' },
      { key: 'onboarded', label: 'Onboarded', is_onboarding: false },
    ];

    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: customStages })
      .expect(200);

    const res = await request(app)
      .get(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.isCustom).toBe(true);
    expect(res.body.stages).toHaveLength(3);
    expect(res.body.stages[0].key).toBe('applied');
  });

  it('rejects stages without terminal key "onboarded"', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Acme' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [
        { key: 'applied', label: 'Applied' },
        { key: 'hired', label: 'Hired' },
      ]})
      .expect(400);

    expect(res.body.error).toMatch(/onboarded/i);
  });

  it('rejects fewer than 2 stages', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Acme' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [{ key: 'onboarded', label: 'Onboarded' }] })
      .expect(400);

    expect(res.body.error).toMatch(/at least 2/i);
  });

  it('rejects duplicate stage keys', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Acme' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [
        { key: 'applied', label: 'Applied' },
        { key: 'applied', label: 'Applied Again' },
        { key: 'onboarded', label: 'Onboarded' },
      ]})
      .expect(400);

    expect(res.body.error).toMatch(/duplicate/i);
  });

  it('non-admin NBI user cannot PUT stages', async () => {
    const member = await createTestUser({ role: 'member' });
    const client = await createTestClient({ name: 'Acme' });
    const token = await mintSession(member.id);

    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [
        { key: 'applied', label: 'Applied' },
        { key: 'onboarded', label: 'Onboarded' },
      ]})
      .expect(403);
  });
});

describe('DELETE /api/clients/:id/hiring-stages', () => {
  it('resets custom stages back to default (isCustom: false)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Acme' });
    const token = await mintSession(admin.id);

    // First set custom stages
    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [
        { key: 'applied', label: 'Applied' },
        { key: 'onboarded', label: 'Onboarded' },
      ]})
      .expect(200);

    // Then delete
    await request(app)
      .delete(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    // Now verify default is back
    const res = await request(app)
      .get(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.isCustom).toBe(false);
    expect(res.body.stages).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Dynamic Stage Validation
// ---------------------------------------------------------------------------

describe('Dynamic stage validation — POST /api/candidates', () => {
  it('accepts a custom stage key when client has custom stages', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Acme' });
    const token = await mintSession(admin.id);

    // Set custom stages with a non-default key
    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [
        { key: 'applied', label: 'Applied' },
        { key: 'onboarded', label: 'Onboarded' },
      ]})
      .expect(200);

    const res = await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Alice', client_id: client.id, stage: 'applied' })
      .expect(201);

    expect(res.body.stage).toBe('applied');
  });

  it('rejects a global-default stage key not in client custom stages', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Acme' });
    const token = await mintSession(admin.id);

    // Set custom stages without 'sourcing'
    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [
        { key: 'applied', label: 'Applied' },
        { key: 'onboarded', label: 'Onboarded' },
      ]})
      .expect(200);

    const res = await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Bob', client_id: client.id, stage: 'sourcing' })
      .expect(400);

    expect(res.body.error).toMatch(/invalid stage/i);
  });
});

describe('Dynamic stage validation — PATCH /api/candidates/:id', () => {
  it('validates stage against custom stages when patching', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Acme' });
    const token = await mintSession(admin.id);

    // Set custom stages
    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [
        { key: 'applied', label: 'Applied' },
        { key: 'onboarded', label: 'Onboarded' },
      ]})
      .expect(200);

    // Create candidate with custom stage
    const candidate = await createTestCandidate({ name: 'Carol', client_id: client.id, stage: 'applied' });

    // Try patching to a stage not in custom list
    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'interviews' })
      .expect(400);

    expect(res.body.error).toMatch(/invalid stage/i);
  });
});

describe('Rejection enforcement — dynamic terminal stage', () => {
  it('uses dynamic terminal stage for rejection enforcement', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const client = await createTestClient({ name: 'Acme' });
    const token = await mintSession(admin.id);

    // Set custom stages — terminal is still 'onboarded' per the rule
    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [
        { key: 'applied', label: 'Applied' },
        { key: 'onboarded', label: 'Onboarded' },
      ]})
      .expect(200);

    // Candidate in non-terminal stage — archiving without rejection_category must fail
    const candidate = await createTestCandidate({ name: 'Dave', client_id: client.id, stage: 'applied' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ archived_at: new Date().toISOString() })
      .expect(400);

    expect(res.body.error).toMatch(/rejection category/i);
  });

  it('rejection enforcement uses global default terminal for candidate with NULL client_id', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    // Candidate with no client (global default stages)
    const candidate = await createTestCandidate({ name: 'Eve', stage: 'sourcing' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ archived_at: new Date().toISOString() })
      .expect(400);

    expect(res.body.error).toMatch(/rejection category/i);
  });
});
