import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestCandidate, createTestHiringPosition, createTestEmailTemplate, createTestOnboardingItem } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

const VALID_REJECTION_CATEGORIES = ['unqualified', 'culture-mismatch', 'compensation', 'candidate-withdrew', 'position-filled', 'no-response', 'failed-interview', 'other'];

describe('Rejection enforcement', () => {
  it('requires rejection_category when archiving a non-terminal candidate', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Alice', stage: 'interviews' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ archived_at: new Date().toISOString() })
      .expect(400);
  });

  it('accepts archiving with rejection_category', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Bob', stage: 'interviews' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ archived_at: new Date().toISOString(), rejection_category: 'unqualified', rejection_reason: 'Lacks required experience' })
      .expect(200);

    expect(res.body.rejection_category).toBe('unqualified');
    expect(res.body.rejection_reason).toBe('Lacks required experience');
  });

  it('does NOT require rejection when archiving at terminal stage (onboarded)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Carla', stage: 'onboarded' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ archived_at: new Date().toISOString() })
      .expect(200);
  });

  it('rejects invalid rejection_category', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Dan', stage: 'sourcing' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ archived_at: new Date().toISOString(), rejection_category: 'bad-vibes' })
      .expect(400);
  });
});

describe('Stage-change notifications', () => {
  it('creates notification for stage assignees when candidate moves stages', async () => {
    const admin = await createTestUser({ role: 'admin', username: 'admin_notif' });
    const assignee = await createTestUser({ role: 'member', display_name: 'Assignee User', username: 'assignee_notif' });
    const token = await mintSession(admin.id);

    // Create candidate with stage_assignees for the target stage
    const candidate = await createTestCandidate({ name: 'Notification Test', stage: 'sourcing' });
    // Set stage_assignees via direct DB update (the fixture doesn't handle JSONB objects well)
    await pool.query(
      'UPDATE candidates SET stage_assignees = $1 WHERE id = $2',
      [JSON.stringify({ interviews: [assignee.display_name] }), candidate.id]
    );

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'interviews' })
      .expect(200);

    // Give the async notification a moment to fire
    await new Promise(r => setTimeout(r, 200));

    const { rows } = await pool.query(
      "SELECT * FROM notifications WHERE username = $1 AND type = 'hiring_stage_change'",
      [assignee.username]
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].link).toContain(candidate.id);
  });
});

describe('Hiring metrics', () => {
  it('GET time-in-stage returns stage durations', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'MetricsCo' });
    const candidate = await createTestCandidate({ name: 'MetricsCandidate', client_id: client.id });

    await pool.query(
      "INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by, moved_at) VALUES ($1, NULL, 'sourcing', 'Admin', NOW() - INTERVAL '10 days')",
      [candidate.id]
    );
    await pool.query(
      "INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by, moved_at) VALUES ($1, 'sourcing', 'interviews', 'Admin', NOW() - INTERVAL '5 days')",
      [candidate.id]
    );

    const res = await request(app)
      .get(`/api/hiring/metrics/time-in-stage?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.stages).toBeDefined();
    expect(Array.isArray(res.body.stages)).toBe(true);
    const sourcing = res.body.stages.find(s => s.stage === 'sourcing');
    expect(sourcing).toBeDefined();
    expect(Number(sourcing.avg_days)).toBeGreaterThanOrEqual(4);
  });

  it('GET time-to-hire returns hire duration', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'HireCo' });
    const candidate = await createTestCandidate({ name: 'HiredPerson', client_id: client.id, stage: 'onboarded' });

    await pool.query(
      "INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by, moved_at) VALUES ($1, NULL, 'sourcing', 'Admin', NOW() - INTERVAL '30 days')",
      [candidate.id]
    );
    await pool.query(
      "INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by, moved_at) VALUES ($1, 'offer', 'onboarded', 'Admin', NOW() - INTERVAL '2 days')",
      [candidate.id]
    );

    const res = await request(app)
      .get(`/api/hiring/metrics/time-to-hire?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.candidates).toBeDefined();
    expect(res.body.candidates.length).toBeGreaterThanOrEqual(1);
  });

  it('GET pipeline returns snapshot and conversions', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'PipelineCo' });
    await createTestCandidate({ name: 'PipeA', client_id: client.id, stage: 'sourcing' });
    await createTestCandidate({ name: 'PipeB', client_id: client.id, stage: 'interviews' });

    const res = await request(app)
      .get(`/api/hiring/metrics/pipeline?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.snapshot).toBeDefined();
    expect(Array.isArray(res.body.snapshot)).toBe(true);
    expect(res.body.snapshot.length).toBeGreaterThanOrEqual(1);
  });

  it('client user cannot query metrics for another client', async () => {
    const clientA = await createTestClient({ name: 'MetricsA' });
    const clientB = await createTestClient({ name: 'MetricsB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(userA.id);

    await request(app)
      .get(`/api/hiring/metrics/time-in-stage?client_id=${clientB.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(403);
  });
});

describe('Onboarding checklist', () => {
  it('POST creates a checklist item', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'OnboardA', stage: 'onboarding' });

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/onboarding`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ title: 'Order laptop' })
      .expect(201);

    expect(res.body.title).toBe('Order laptop');
    expect(res.body.completed).toBe(false);
  });

  it('GET lists items ordered by sort_order', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'OnboardB' });

    await createTestOnboardingItem({ candidate_id: candidate.id, title: 'Second', sort_order: 2 });
    await createTestOnboardingItem({ candidate_id: candidate.id, title: 'First', sort_order: 1 });

    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/onboarding`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('First');
  });

  it('PATCH marks item completed with auto-timestamp', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'OnboardC' });
    const item = await createTestOnboardingItem({ candidate_id: candidate.id, title: 'Create email' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}/onboarding/${item.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ completed: true })
      .expect(200);

    expect(res.body.completed).toBe(true);
    expect(res.body.completed_at).toBeTruthy();
    expect(res.body.completed_by).toBe(admin.display_name);
  });

  it('DELETE removes an item', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'OnboardD' });
    const item = await createTestOnboardingItem({ candidate_id: candidate.id, title: 'Remove me' });

    await request(app)
      .delete(`/api/candidates/${candidate.id}/onboarding/${item.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
  });

  it('auto-populates from position onboarding_template on stage change', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'OnboardCo' });

    const { rows: [pos] } = await pool.query(
      `INSERT INTO hiring_positions (client_id, title, onboarding_template) VALUES ($1, 'Dev', $2) RETURNING *`,
      [client.id, JSON.stringify([{ title: 'Order laptop' }, { title: 'Create email' }, { title: 'Schedule induction' }])]
    );

    const candidate = await createTestCandidate({ name: 'OnboardE', client_id: client.id, position_id: pos.id, stage: 'offer' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'onboarding' })
      .expect(200);

    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/onboarding`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(3);
    expect(res.body[0].title).toBe('Order laptop');
    expect(res.body[1].title).toBe('Create email');
    expect(res.body[2].title).toBe('Schedule induction');
  });
});

describe('Email templates', () => {
  it('POST creates a template (admin only)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .post('/api/hiring-templates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Offer Letter', subject: 'Offer from {{client_name}}', body: 'Dear {{candidate_name}}, we offer you {{position_title}}.' })
      .expect(201);

    expect(res.body.name).toBe('Offer Letter');
  });

  it('GET lists templates (global + client-specific)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'TemplateCo' });

    await createTestEmailTemplate({ name: 'Global Template' });
    await createTestEmailTemplate({ name: 'Client Template', client_id: client.id });

    const res = await request(app)
      .get(`/api/hiring-templates?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('POST /send returns 400 when candidate has no email', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'NoEmail' });
    const template = await createTestEmailTemplate({ name: 'Welcome', subject: 'Hi {{candidate_name}}', body: 'Hello' });

    await request(app)
      .post(`/api/hiring-templates/${template.id}/send`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ candidate_id: candidate.id })
      .expect(400);
  });

  it('POST /send succeeds when candidate has email', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'HasEmail', email: 'test@example.com' });
    const template = await createTestEmailTemplate({ name: 'Welcome', subject: 'Hi {{candidate_name}}', body: 'Hello {{candidate_name}}' });

    const res = await request(app)
      .post(`/api/hiring-templates/${template.id}/send`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ candidate_id: candidate.id })
      .expect(200);

    expect(res.body.to).toBe('test@example.com');
    expect(res.body.subject).toBe('Hi HasEmail');
  });

  it('PATCH updates a template', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const template = await createTestEmailTemplate({ name: 'Old Name' });

    const res = await request(app)
      .patch(`/api/hiring-templates/${template.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'New Name' })
      .expect(200);

    expect(res.body.name).toBe('New Name');
  });

  it('DELETE removes a template', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const template = await createTestEmailTemplate({ name: 'Delete Me' });

    await request(app)
      .delete(`/api/hiring-templates/${template.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
  });
});
