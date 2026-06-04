// dashboard-server/tests/unit/interview-configs.test.mjs
//
// Tests for Interview Configs, Sessions, Clone, and Activate APIs (Group 2 + 3).

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestCandidate, createTestHiringPosition, createTestInterviewQuestion, createTestInterviewConfig } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Interview Configs API', () => {

  /**
   * Shared setup: admin + member users, client, position, candidate, 2 questions.
   */
  async function setupConfigData() {
    const admin = await createTestUser({ role: 'admin', username: 'admin1' });
    const interviewer = await createTestUser({ role: 'member', username: 'interviewer1' });
    const adminToken = await mintSession(admin.id);
    const client = await createTestClient({ name: 'Config Client' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Senior Engineer' });
    const candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Jane Doe', role: 'Engineer' });
    const q1 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'Q1' });
    const q2 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'culture', question_text: 'Q2' });
    return { admin, interviewer, adminToken, client, position, candidate, q1, q2 };
  }

  // ---- POST /api/interview-configs ----

  describe('POST /api/interview-configs', () => {
    it('creates draft config with questions and sessions', async () => {
      const { admin, interviewer, adminToken, candidate, position, q1, q2 } = await setupConfigData();

      const res = await request(app)
        .post('/api/interview-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidate_id: candidate.id,
          position_id: position.id,
          question_ids: [q1.id, q2.id],
          interviewer_ids: [interviewer.id],
        });

      expect(res.status).toBe(201);
      expect(res.body.config).toBeDefined();
      expect(res.body.config.status).toBe('draft');
      expect(res.body.config.candidate_id).toBe(candidate.id);
      expect(res.body.config.created_by).toBe(admin.id);
      expect(res.body.questions).toHaveLength(2);
      expect(res.body.questions[0].sort_order).toBe(0);
      expect(res.body.questions[1].sort_order).toBe(1);
      expect(res.body.sessions).toHaveLength(1);
      expect(res.body.sessions[0].interviewer_id).toBe(interviewer.id);
      expect(res.body.sessions[0].status).toBe('assigned');
    });

    it('accepts round_type and scheduling fields', async () => {
      const { admin, interviewer, adminToken, candidate, position, q1 } = await setupConfigData();
      const res = await request(app)
        .post('/api/interview-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidate_id: candidate.id,
          position_id: position.id,
          question_ids: [q1.id],
          interviewer_ids: [interviewer.id],
          round_type: 'Technical',
          scheduled_at: '2026-06-10T10:00:00Z',
          duration_minutes: 90,
          location: 'Office',
        });
      expect(res.status).toBe(201);
      expect(res.body.config.round_type).toBe('Technical');
      expect(res.body.config.round_number).toBe(1);
      expect(res.body.config.duration_minutes).toBe(90);
      expect(res.body.config.location).toBe('Office');
    });

    it('Phone Screen does not require questions or interviewers', async () => {
      const { adminToken, candidate } = await setupConfigData();
      const res = await request(app)
        .post('/api/interview-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidate_id: candidate.id,
          round_type: 'Phone Screen',
          scheduled_at: '2026-06-10T09:00:00Z',
          duration_minutes: 30,
          interviewer_name: 'Glen',
        });
      expect(res.status).toBe(201);
      expect(res.body.config.round_type).toBe('Phone Screen');
      expect(res.body.config.status).toBe('completed');
      expect(res.body.config.interviewer_name).toBe('Glen');
    });

    it('scored round type creates config with empty questions when none provided and no template', async () => {
      const { adminToken, candidate } = await setupConfigData();
      const res = await request(app)
        .post('/api/interview-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidate_id: candidate.id,
          round_type: 'Cultural',
        });
      expect(res.status).toBe(201);
      expect(res.body.questions).toHaveLength(0);
    });

    it('auto-increments round_number per candidate', async () => {
      const { admin, interviewer, adminToken, candidate, q1 } = await setupConfigData();
      await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${adminToken}`)
        .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Glen' });
      const res = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${adminToken}`)
        .send({ candidate_id: candidate.id, question_ids: [q1.id], interviewer_ids: [interviewer.id], round_type: 'Technical' });
      expect(res.body.config.round_number).toBe(2);
    });

    it('rejects Phone Screen with interviewer_ids', async () => {
      const { interviewer, adminToken, candidate } = await setupConfigData();
      const res = await request(app)
        .post('/api/interview-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidate_id: candidate.id,
          round_type: 'Phone Screen',
          interviewer_ids: [interviewer.id],
        });
      expect(res.status).toBe(400);
    });
  });

  // ---- GET /api/interview-configs ----

  describe('GET /api/interview-configs', () => {
    it('returns configs for a candidate', async () => {
      const { admin, interviewer, adminToken, candidate, position, q1 } = await setupConfigData();

      // Create config via fixture
      await createTestInterviewConfig({
        candidate_id: candidate.id,
        position_id: position.id,
        created_by: admin.id,
        question_ids: [q1.id],
        interviewer_ids: [interviewer.id],
      });

      const res = await request(app)
        .get('/api/interview-configs')
        .query({ candidate_id: candidate.id })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].candidate_name).toBe('Jane Doe');
      expect(res.body[0].question_count).toBe(1);
      expect(res.body[0].session_count).toBe(1);
    });

    it('include=progress returns session details', async () => {
      const { admin, interviewer, adminToken, candidate, position, q1 } = await setupConfigData();
      await createTestInterviewConfig({
        candidate_id: candidate.id,
        position_id: position.id,
        created_by: admin.id,
        question_ids: [q1.id],
        interviewer_ids: [interviewer.id],
      });
      const res = await request(app)
        .get('/api/interview-configs')
        .query({ candidate_id: candidate.id, include: 'progress' })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body[0].sessions).toBeDefined();
      expect(res.body[0].sessions[0].interviewer_name).toBeDefined();
      expect(res.body[0].round_number).toBe(1);
    });
  });

  // ---- POST /api/interview-configs/:id/activate ----

  describe('POST /api/interview-configs/:id/activate', () => {
    it('sets status to active and notified_at on sessions', async () => {
      const { admin, interviewer, adminToken, candidate, position, q1, q2 } = await setupConfigData();

      const { config, sessions } = await createTestInterviewConfig({
        candidate_id: candidate.id,
        position_id: position.id,
        created_by: admin.id,
        question_ids: [q1.id, q2.id],
        interviewer_ids: [interviewer.id],
      });

      // Sessions should not have notified_at yet
      expect(sessions[0].notified_at).toBeNull();

      const res = await request(app)
        .post(`/api/interview-configs/${config.id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.activated).toBe(true);
      expect(res.body.sessions_notified).toBe(1);

      // Verify config status in DB
      const { rows: configRows } = await pool.query('SELECT status FROM interview_configs WHERE id = $1', [config.id]);
      expect(configRows[0].status).toBe('active');

      // Verify notified_at is set on sessions
      const { rows: sessRows } = await pool.query('SELECT notified_at FROM interview_sessions WHERE config_id = $1', [config.id]);
      expect(sessRows[0].notified_at).not.toBeNull();
    });
  });

  // ---- POST /api/interview-configs/:id/clone ----

  describe('POST /api/interview-configs/:id/clone', () => {
    it('creates new config with same questions for a different candidate', async () => {
      const { admin, interviewer, adminToken, client, candidate, position, q1, q2 } = await setupConfigData();

      const { config: origConfig } = await createTestInterviewConfig({
        candidate_id: candidate.id,
        position_id: position.id,
        created_by: admin.id,
        question_ids: [q1.id, q2.id],
        interviewer_ids: [interviewer.id],
      });

      // Create a second candidate to clone to
      const candidate2 = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'John Smith', role: 'Engineer' });

      const res = await request(app)
        .post(`/api/interview-configs/${origConfig.id}/clone`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ candidate_id: candidate2.id });

      expect(res.status).toBe(201);
      expect(res.body.config).toBeDefined();
      expect(res.body.config.candidate_id).toBe(candidate2.id);
      expect(res.body.config.status).toBe('draft');
      expect(res.body.config.id).not.toBe(origConfig.id);
      expect(res.body.questions).toHaveLength(2);
      // Verify same question_ids in same order
      expect(res.body.questions[0].question_id).toBe(q1.id);
      expect(res.body.questions[1].question_id).toBe(q2.id);
    });
  });

  // ---- PATCH /api/interview-configs/:id ----

  describe('PATCH /api/interview-configs/:id', () => {
    it('updates schedule fields', async () => {
      const { adminToken, candidate } = await setupConfigData();
      const create = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${adminToken}`)
        .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Glen' });
      const configId = create.body.config.id;
      const res = await request(app)
        .patch('/api/interview-configs/' + configId)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('If-Match', create.body.config.updated_at)
        .send({ scheduled_at: '2026-06-15T14:00:00Z', location: 'Zoom' });
      expect(res.status).toBe(200);
      expect(res.body.location).toBe('Zoom');
    });

    it('returns 409 on stale If-Match', async () => {
      const { adminToken, candidate } = await setupConfigData();
      const create = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${adminToken}`)
        .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Glen' });
      const res = await request(app)
        .patch('/api/interview-configs/' + create.body.config.id)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('If-Match', '2020-01-01T00:00:00.000Z')
        .send({ location: 'Office' });
      expect(res.status).toBe(409);
    });

    it('updates outcome', async () => {
      const { adminToken, candidate } = await setupConfigData();
      const create = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${adminToken}`)
        .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Glen' });
      const res = await request(app)
        .patch('/api/interview-configs/' + create.body.config.id)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('If-Match', create.body.config.updated_at)
        .send({ outcome: 'passed' });
      expect(res.status).toBe(200);
      expect(res.body.outcome).toBe('passed');
    });
  });

  // ---- DELETE /api/interview-configs/:id ----

  describe('DELETE /api/interview-configs/:id', () => {
    it('admin deletes round with cascade', async () => {
      const { adminToken, candidate } = await setupConfigData();
      const create = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${adminToken}`)
        .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Glen' });
      const res = await request(app)
        .delete('/api/interview-configs/' + create.body.config.id)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
      const { rows } = await pool.query('SELECT id FROM interview_configs WHERE id = $1', [create.body.config.id]);
      expect(rows).toHaveLength(0);
    });

    it('non-admin gets 403', async () => {
      const { adminToken, candidate } = await setupConfigData();
      const member = await createTestUser({ role: 'member', username: 'del_member' });
      const memberToken = await mintSession(member.id);
      const create = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${adminToken}`)
        .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Glen' });
      const res = await request(app)
        .delete('/api/interview-configs/' + create.body.config.id)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });
  });
});
