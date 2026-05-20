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
