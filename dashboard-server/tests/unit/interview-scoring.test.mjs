// dashboard-server/tests/unit/interview-scoring.test.mjs
//
// Tests for Scoring, Session Submit, Results Aggregation, and Decision APIs
// (Groups 4, 5, 6).

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestCandidate, createTestHiringPosition, createTestInterviewQuestion, createTestInterviewConfig } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

/**
 * Shared setup: admin, interviewer, second user, client, position, candidate,
 * two questions, an active config with one session for the interviewer.
 */
async function fullSetup() {
  const admin = await createTestUser({ role: 'admin', username: 'admin1' });
  const interviewer = await createTestUser({ role: 'member', username: 'interviewer1' });
  const otherUser = await createTestUser({ role: 'member', username: 'other1' });
  const adminToken = await mintSession(admin.id);
  const interviewerToken = await mintSession(interviewer.id);
  const otherToken = await mintSession(otherUser.id);

  const client = await createTestClient({ name: 'Scoring Client' });
  const position = await createTestHiringPosition({ client_id: client.id, title: 'Lead Dev' });
  const candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Alice Test', role: 'Developer' });

  const q1 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'Tech Q1' });
  const q2 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'culture', question_text: 'Culture Q2' });

  const { config, sessions } = await createTestInterviewConfig({
    candidate_id: candidate.id,
    position_id: position.id,
    created_by: admin.id,
    question_ids: [q1.id, q2.id],
    interviewer_ids: [interviewer.id],
    status: 'active',
  });

  const session = sessions[0];

  return {
    admin, interviewer, otherUser,
    adminToken, interviewerToken, otherToken,
    client, position, candidate,
    q1, q2, config, session,
  };
}

describe('Interview Scoring API', () => {

  // ---- GET /api/interview-sessions/:id ----

  describe('GET /api/interview-sessions/:id', () => {
    it('returns session with questions for the assigned interviewer', async () => {
      const { interviewerToken, session, q1, q2 } = await fullSetup();

      const res = await request(app)
        .get(`/api/interview-sessions/${session.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.session).toBeDefined();
      expect(res.body.session.id).toBe(session.id);
      expect(res.body.session.candidate_name).toBe('Alice Test');
      expect(res.body.questions).toHaveLength(2);
      expect(res.body.questions[0].question_id).toBe(q1.id);
      expect(res.body.questions[1].question_id).toBe(q2.id);
      // No scores yet
      expect(res.body.questions[0].score).toBeNull();
    });

    it('rejects another user with 403', async () => {
      const { otherToken, session } = await fullSetup();

      const res = await request(app)
        .get(`/api/interview-sessions/${session.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it('allows admin access', async () => {
      const { adminToken, session } = await fullSetup();

      const res = await request(app)
        .get(`/api/interview-sessions/${session.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.session.id).toBe(session.id);
    });
  });

  // ---- PUT /api/interview-scores/:session_id/:question_id ----

  describe('PUT /api/interview-scores/:session_id/:question_id', () => {
    it('upserts correctly (create then update)', async () => {
      const { interviewerToken, session, q1 } = await fullSetup();

      // Create
      const res1 = await request(app)
        .put(`/api/interview-scores/${session.id}/${q1.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 3, notes: 'Good start' });

      expect(res1.status).toBe(200);
      expect(res1.body.score).toBe(3);
      expect(res1.body.notes).toBe('Good start');

      // Update
      const res2 = await request(app)
        .put(`/api/interview-scores/${session.id}/${q1.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 4, notes: 'Actually better' });

      expect(res2.status).toBe(200);
      expect(res2.body.score).toBe(4);
      expect(res2.body.notes).toBe('Actually better');

      // Only one row in DB
      const { rows } = await pool.query(
        'SELECT * FROM interview_scores WHERE session_id = $1 AND question_id = $2',
        [session.id, q1.id]
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].score).toBe(4);
    });

    it('rejects score outside 1-5', async () => {
      const { interviewerToken, session, q1 } = await fullSetup();

      const res0 = await request(app)
        .put(`/api/interview-scores/${session.id}/${q1.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 0 });

      expect(res0.status).toBe(400);
      expect(res0.body.error).toContain('between 1 and 5');

      const res6 = await request(app)
        .put(`/api/interview-scores/${session.id}/${q1.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 6 });

      expect(res6.status).toBe(400);
    });

    it('rejects scoring on a submitted session', async () => {
      const { interviewerToken, session, q1, q2 } = await fullSetup();

      // Score both questions and submit
      await request(app)
        .put(`/api/interview-scores/${session.id}/${q1.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 4 });
      await request(app)
        .put(`/api/interview-scores/${session.id}/${q2.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 3 });
      await request(app)
        .post(`/api/interview-sessions/${session.id}/submit`)
        .set('Authorization', `Bearer ${interviewerToken}`);

      // Now try to score again
      const res = await request(app)
        .put(`/api/interview-scores/${session.id}/${q1.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('submitted');
    });

    it('sets session to in_progress on first score', async () => {
      const { interviewerToken, session, q1 } = await fullSetup();

      // Session starts as 'assigned'
      const { rows: before } = await pool.query('SELECT status FROM interview_sessions WHERE id = $1', [session.id]);
      expect(before[0].status).toBe('assigned');

      await request(app)
        .put(`/api/interview-scores/${session.id}/${q1.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 4 });

      const { rows: after } = await pool.query('SELECT status, started_at FROM interview_sessions WHERE id = $1', [session.id]);
      expect(after[0].status).toBe('in_progress');
      expect(after[0].started_at).not.toBeNull();
    });
  });

  // ---- POST /api/interview-sessions/:id/submit ----

  describe('POST /api/interview-sessions/:id/submit', () => {
    it('succeeds when all questions are scored', async () => {
      const { interviewerToken, session, q1, q2 } = await fullSetup();

      // Score both
      await request(app)
        .put(`/api/interview-scores/${session.id}/${q1.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 4 });
      await request(app)
        .put(`/api/interview-scores/${session.id}/${q2.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 5 });

      const res = await request(app)
        .post(`/api/interview-sessions/${session.id}/submit`)
        .set('Authorization', `Bearer ${interviewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.submitted).toBe(true);

      // Verify session status in DB
      const { rows } = await pool.query('SELECT status, submitted_at FROM interview_sessions WHERE id = $1', [session.id]);
      expect(rows[0].status).toBe('submitted');
      expect(rows[0].submitted_at).not.toBeNull();
    });

    it('rejects when questions are unscored', async () => {
      const { interviewerToken, session, q1 } = await fullSetup();

      // Score only one of two questions
      await request(app)
        .put(`/api/interview-scores/${session.id}/${q1.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 3 });

      const res = await request(app)
        .post(`/api/interview-sessions/${session.id}/submit`)
        .set('Authorization', `Bearer ${interviewerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('1 of 2 scored');
    });
  });

  // ---- GET /api/interview-results/:config_id ----

  describe('GET /api/interview-results/:config_id', () => {
    it('returns aggregated data for admin', async () => {
      const { admin, adminToken, interviewerToken, session, q1, q2, config } = await fullSetup();

      // Score and submit
      await request(app)
        .put(`/api/interview-scores/${session.id}/${q1.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 4, notes: 'Strong technical' });
      await request(app)
        .put(`/api/interview-scores/${session.id}/${q2.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ score: 3, notes: 'OK culture fit' });
      await request(app)
        .post(`/api/interview-sessions/${session.id}/submit`)
        .set('Authorization', `Bearer ${interviewerToken}`);

      const res = await request(app)
        .get(`/api/interview-results/${config.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.config).toBeDefined();
      expect(res.body.config.candidate_name).toBe('Alice Test');
      expect(res.body.questions).toHaveLength(2);
      expect(res.body.sessions).toHaveLength(1);
      expect(res.body.scores).toHaveLength(2);
      expect(res.body.summary.overall_avg).toBe(3.5);
      expect(res.body.summary.category_avgs.technical).toBe(4);
      expect(res.body.summary.category_avgs.culture).toBe(3);
      expect(res.body.decision).toBeNull();
    });

    it('rejects non-admin with 403', async () => {
      const { interviewerToken, config } = await fullSetup();

      const res = await request(app)
        .get(`/api/interview-results/${config.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ---- POST /api/interview-decisions ----

  describe('POST /api/interview-decisions', () => {
    it('records decision and updates config to completed', async () => {
      const { adminToken, config, candidate } = await fullSetup();

      const res = await request(app)
        .post('/api/interview-decisions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          config_id: config.id,
          decision: 'advance',
          notes: 'Strong candidate, moving to offer stage.',
        });

      expect(res.status).toBe(201);
      expect(res.body.decision).toBe('advance');
      expect(res.body.notes).toBe('Strong candidate, moving to offer stage.');
      expect(res.body.config_id).toBe(config.id);

      // Config should be completed
      const { rows: configRows } = await pool.query('SELECT status FROM interview_configs WHERE id = $1', [config.id]);
      expect(configRows[0].status).toBe('completed');

      // Candidate should be moved to 'offer' stage
      const { rows: candRows } = await pool.query('SELECT stage FROM candidates WHERE id = $1', [candidate.id]);
      expect(candRows[0].stage).toBe('offer');
    });

    it('rejects invalid decision value', async () => {
      const { adminToken, config } = await fullSetup();

      const res = await request(app)
        .post('/api/interview-decisions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          config_id: config.id,
          decision: 'maybe',
          notes: 'Not sure',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid decision');
    });

    it('rejects missing notes', async () => {
      const { adminToken, config } = await fullSetup();

      const res = await request(app)
        .post('/api/interview-decisions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          config_id: config.id,
          decision: 'reject',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('notes');
    });
  });
});
