// dashboard-server/tests/unit/interview-questions.test.mjs
//
// Tests for the Interview Question Bank CRUD API (Group 1).

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestInterviewQuestion } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Interview Question Bank API', () => {

  // ---- GET /api/interview-questions ----

  describe('GET /api/interview-questions', () => {
    it('returns questions filtered by client_id', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = await mintSession(admin.id);
      const clientA = await createTestClient({ name: 'Client A' });
      const clientB = await createTestClient({ name: 'Client B' });

      await createTestInterviewQuestion({ client_id: clientA.id, discipline: 'Engineering', category: 'technical', question_text: 'Q for A' });
      await createTestInterviewQuestion({ client_id: clientB.id, discipline: 'Design', category: 'culture', question_text: 'Q for B' });

      const res = await request(app)
        .get('/api/interview-questions')
        .query({ client_id: clientA.id })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].question_text).toBe('Q for A');
      expect(res.body[0].client_name).toBe('Client A');
    });

    it('returns questions filtered by discipline', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = await mintSession(admin.id);

      await createTestInterviewQuestion({ discipline: 'Engineering', category: 'technical', question_text: 'Eng Q' });
      await createTestInterviewQuestion({ discipline: 'Design', category: 'culture', question_text: 'Design Q' });

      const res = await request(app)
        .get('/api/interview-questions')
        .query({ discipline: 'Engineering' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].question_text).toBe('Eng Q');
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/interview-questions');
      expect(res.status).toBe(401);
    });
  });

  // ---- POST /api/interview-questions ----

  describe('POST /api/interview-questions', () => {
    it('creates a question with correct source and created_by', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = await mintSession(admin.id);

      const res = await request(app)
        .post('/api/interview-questions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question_text: 'Describe your approach to code reviews',
          discipline: 'Engineering',
          category: 'collaboration',
        });

      expect(res.status).toBe(201);
      expect(res.body.question_text).toBe('Describe your approach to code reviews');
      expect(res.body.discipline).toBe('Engineering');
      expect(res.body.category).toBe('collaboration');
      expect(res.body.source).toBe('custom');
      expect(res.body.created_by).toBe(admin.id);
    });

    it('rejects invalid category with 400', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = await mintSession(admin.id);

      const res = await request(app)
        .post('/api/interview-questions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question_text: 'Some question',
          discipline: 'Engineering',
          category: 'invalid_category',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid category');
    });

    it('rejects missing question_text with 400', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = await mintSession(admin.id);

      const res = await request(app)
        .post('/api/interview-questions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          discipline: 'Engineering',
          category: 'technical',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('question_text');
    });
  });

  // ---- PATCH /api/interview-questions/:id ----

  describe('PATCH /api/interview-questions/:id', () => {
    it('updates question text and category', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = await mintSession(admin.id);
      const q = await createTestInterviewQuestion({
        created_by: admin.id,
        question_text: 'Original text',
        category: 'technical',
      });

      const res = await request(app)
        .patch(`/api/interview-questions/${q.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ question_text: 'Updated text', category: 'leadership' });

      expect(res.status).toBe(200);
      expect(res.body.question_text).toBe('Updated text');
      expect(res.body.category).toBe('leadership');
    });
  });

  // ---- DELETE /api/interview-questions/:id ----

  describe('DELETE /api/interview-questions/:id', () => {
    it('works for admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = await mintSession(admin.id);
      const q = await createTestInterviewQuestion({ created_by: admin.id });

      const res = await request(app)
        .delete(`/api/interview-questions/${q.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);

      // Verify it's gone
      const { rows } = await pool.query('SELECT id FROM interview_question_bank WHERE id = $1', [q.id]);
      expect(rows).toHaveLength(0);
    });

    it('rejects non-admin with 403', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const member = await createTestUser({ role: 'member', username: 'member1' });
      const memberToken = await mintSession(member.id);
      const q = await createTestInterviewQuestion({ created_by: admin.id });

      const res = await request(app)
        .delete(`/api/interview-questions/${q.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });
  });
});
