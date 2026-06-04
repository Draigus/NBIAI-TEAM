// dashboard-server/tests/unit/position-question-templates.test.mjs
//
// Tests for the position question template CRUD API:
//   GET  /api/positions/:id/question-template
//   POST /api/positions/:id/question-template/questions
//   DELETE /api/positions/:id/question-template/questions/:questionId

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser,
  createTestClient,
  createTestCandidate,
  createTestInterviewQuestion,
  createTestPositionTemplate,
} = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

// ---- shared setup ----

async function createPositionWithQuestion() {
  const admin = await createTestUser({ role: 'admin' });
  const token = await mintSession(admin.id);
  const client = await createTestClient({ name: 'Test Studio' });
  const { rows: [position] } = await pool.query(
    `INSERT INTO hiring_positions (title, client_id, status) VALUES ($1, $2, 'open') RETURNING *`,
    ['Lead Animator', client.id]
  );
  const question = await createTestInterviewQuestion({
    client_id: client.id,
    discipline: 'Art',
    category: 'technical',
    question_text: 'Walk me through your state machine architecture.',
    position_titles: ['Lead Animator'],
  });
  return { admin, token, client, position, question };
}

// ---- GET /api/positions/:id/question-template ----

describe('GET /api/positions/:id/question-template', () => {
  it('returns empty array when no template exists', async () => {
    const { token, position } = await createPositionWithQuestion();

    const res = await request(app)
      .get(`/api/positions/${position.id}/question-template`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns template questions with text, category, and sort_order', async () => {
    const { token, position, question } = await createPositionWithQuestion();
    await createTestPositionTemplate({ position_id: position.id, question_id: question.id, sort_order: 0 });

    const res = await request(app)
      .get(`/api/positions/${position.id}/question-template`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].question_text).toBe('Walk me through your state machine architecture.');
    expect(res.body[0].category).toBe('technical');
    expect(res.body[0].sort_order).toBe(0);
    expect(res.body[0].position_id).toBe(position.id);
    expect(res.body[0].question_id).toBe(question.id);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const { position } = await createPositionWithQuestion();

    const res = await request(app)
      .get(`/api/positions/${position.id}/question-template`);

    expect(res.status).toBe(401);
  });
});

// ---- POST /api/positions/:id/question-template/questions ----

describe('POST /api/positions/:id/question-template/questions', () => {
  it('adds a question with auto sort_order and returns 201', async () => {
    const { token, position, question } = await createPositionWithQuestion();

    const res = await request(app)
      .post(`/api/positions/${position.id}/question-template/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ question_id: question.id });

    expect(res.status).toBe(201);
    expect(res.body.position_id).toBe(position.id);
    expect(res.body.question_id).toBe(question.id);
    expect(res.body.sort_order).toBe(0);
  });

  it('auto-increments sort_order for subsequent additions', async () => {
    const { token, client, position, question } = await createPositionWithQuestion();

    // Seed first question directly via fixture
    await createTestPositionTemplate({ position_id: position.id, question_id: question.id, sort_order: 0 });

    // Create a second question
    const question2 = await createTestInterviewQuestion({
      client_id: client.id,
      discipline: 'Art',
      category: 'culture',
      question_text: 'How do you collaborate with animators?',
    });

    const res = await request(app)
      .post(`/api/positions/${position.id}/question-template/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ question_id: question2.id });

    expect(res.status).toBe(201);
    expect(res.body.sort_order).toBe(1);
  });

  it('rejects duplicate question_id with 409', async () => {
    const { token, position, question } = await createPositionWithQuestion();
    await createTestPositionTemplate({ position_id: position.id, question_id: question.id, sort_order: 0 });

    const res = await request(app)
      .post(`/api/positions/${position.id}/question-template/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ question_id: question.id });

    expect(res.status).toBe(409);
  });

  it('rejects invalid (non-UUID) question_id with 400', async () => {
    const { token, position } = await createPositionWithQuestion();

    const res = await request(app)
      .post(`/api/positions/${position.id}/question-template/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ question_id: 'not-a-uuid' });

    expect(res.status).toBe(400);
  });
});

// ---- DELETE /api/positions/:id/question-template/questions/:questionId ----

describe('DELETE /api/positions/:id/question-template/questions/:questionId', () => {
  it('removes the question and returns { deleted: true }', async () => {
    const { token, position, question } = await createPositionWithQuestion();
    await createTestPositionTemplate({ position_id: position.id, question_id: question.id, sort_order: 0 });

    const res = await request(app)
      .delete(`/api/positions/${position.id}/question-template/questions/${question.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });

    // Verify it is gone
    const { rows } = await pool.query(
      'SELECT * FROM position_question_templates WHERE position_id = $1 AND question_id = $2',
      [position.id, question.id]
    );
    expect(rows).toHaveLength(0);
  });

  it('returns 404 for a non-existent entry', async () => {
    const { token, position, question } = await createPositionWithQuestion();

    const res = await request(app)
      .delete(`/api/positions/${position.id}/question-template/questions/${question.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/interview-configs — template auto-load', () => {
  it('auto-loads template questions on first round when question_ids not provided', async () => {
    const { token, admin, position, question, client } = await createPositionWithQuestion();
    await createTestPositionTemplate({ position_id: position.id, question_id: question.id, sort_order: 0, added_by: admin.id });
    const candidate = await createTestCandidate({ client_id: client.id, position_id: position.id });

    const res = await request(app)
      .post('/api/interview-configs')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, round_type: 'Technical', interviewer_ids: [admin.id] });

    expect(res.status).toBe(201);
    expect(res.body.config.from_template).toBe(true);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].question_id).toBe(question.id);
  });

  it('does not auto-load on second round', async () => {
    const { token, admin, position, question, client } = await createPositionWithQuestion();
    await createTestPositionTemplate({ position_id: position.id, question_id: question.id, sort_order: 0, added_by: admin.id });
    const candidate = await createTestCandidate({ client_id: client.id, position_id: position.id });

    await request(app)
      .post('/api/interview-configs')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, round_type: 'Technical', interviewer_ids: [admin.id] });

    const res = await request(app)
      .post('/api/interview-configs')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, round_type: 'Cultural', interviewer_ids: [admin.id] });

    expect(res.status).toBe(201);
    expect(res.body.config.from_template).toBe(false);
    expect(res.body.questions).toHaveLength(0);
  });

  it('uses explicit question_ids over template when provided', async () => {
    const { token, admin, position, question, client } = await createPositionWithQuestion();
    await createTestPositionTemplate({ position_id: position.id, question_id: question.id, sort_order: 0, added_by: admin.id });
    const candidate = await createTestCandidate({ client_id: client.id, position_id: position.id });
    const q2 = await createTestInterviewQuestion({ client_id: client.id, category: 'culture', question_text: 'Override Q' });

    const res = await request(app)
      .post('/api/interview-configs')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, round_type: 'Technical', question_ids: [q2.id], interviewer_ids: [admin.id] });

    expect(res.status).toBe(201);
    expect(res.body.config.from_template).toBe(false);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].question_id).toBe(q2.id);
  });

  it('skips template for Phone Screen rounds', async () => {
    const { token, admin, position, question, client } = await createPositionWithQuestion();
    await createTestPositionTemplate({ position_id: position.id, question_id: question.id, sort_order: 0, added_by: admin.id });
    const candidate = await createTestCandidate({ client_id: client.id, position_id: position.id });

    const res = await request(app)
      .post('/api/interview-configs')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Jane' });

    expect(res.status).toBe(201);
    expect(res.body.config.from_template).toBe(false);
    expect(res.body.questions).toHaveLength(0);
  });
});
