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
  createTestInterviewRound,
  createTestScorecard,
  createTestHiringPosition,
} = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

// ---------------------------------------------------------------------------
// Interview Rounds CRUD
// ---------------------------------------------------------------------------

describe('Interview Rounds — POST', () => {
  it('creates a round with auto-incrementing round_number', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Alice' });

    const r1 = await request(app)
      .post(`/api/candidates/${candidate.id}/interviews`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ title: 'Phone Screen' })
      .expect(201);

    const r2 = await request(app)
      .post(`/api/candidates/${candidate.id}/interviews`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ title: 'Technical Interview' })
      .expect(201);

    expect(r1.body.round_number).toBe(1);
    expect(r2.body.round_number).toBe(2);
    expect(r1.body.title).toBe('Phone Screen');
    expect(r2.body.title).toBe('Technical Interview');
  });

  it('client user cannot create rounds (requireNBI returns 403)', async () => {
    const client = await createTestClient({ name: 'ClientA' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const candidate = await createTestCandidate({ name: 'Bob', client_id: client.id });
    const token = await mintSession(clientUser.id);

    await request(app)
      .post(`/api/candidates/${candidate.id}/interviews`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ title: 'Phone Screen' })
      .expect(403);
  });
});

describe('Interview Rounds — GET', () => {
  it('lists rounds ordered by round_number ASC', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Carol' });

    // Insert out of order intentionally
    await createTestInterviewRound({ candidate_id: candidate.id, round_number: 3, title: 'Final' });
    await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });
    await createTestInterviewRound({ candidate_id: candidate.id, round_number: 2, title: 'Technical' });

    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/interviews`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(3);
    expect(res.body[0].round_number).toBe(1);
    expect(res.body[1].round_number).toBe(2);
    expect(res.body[2].round_number).toBe(3);
  });

  it('client user can view rounds for their own candidates', async () => {
    const client = await createTestClient({ name: 'ClientB' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const candidate = await createTestCandidate({ name: 'Dana', client_id: client.id });
    await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Intro Call' });

    const token = await mintSession(clientUser.id);
    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/interviews`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Intro Call');
  });
});

describe('Interview Rounds — PATCH', () => {
  it('updates round fields (status, outcome, outcome_notes)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Eve' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}/interviews/${round.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ status: 'completed', outcome: 'pass', outcome_notes: 'Strong candidate' })
      .expect(200);

    expect(res.body.status).toBe('completed');
    expect(res.body.outcome).toBe('pass');
    expect(res.body.outcome_notes).toBe('Strong candidate');
  });

  it('rejects invalid status value', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Frank' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}/interviews/${round.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ status: 'unknown-status' })
      .expect(400);
  });

  it('rejects invalid outcome value', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Grace' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}/interviews/${round.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ outcome: 'maybe' })
      .expect(400);
  });
});

describe('Interview Rounds — DELETE', () => {
  it('member gets 403; admin gets 200', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const member = await createTestUser({ role: 'member' });
    const candidate = await createTestCandidate({ name: 'Hank' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });

    // Member cannot delete
    const memberToken = await mintSession(member.id);
    await request(app)
      .delete(`/api/candidates/${candidate.id}/interviews/${round.id}`)
      .set('Cookie', `nbi_session=${memberToken}`)
      .expect(403);

    // Admin can delete
    const adminToken = await mintSession(admin.id);
    await request(app)
      .delete(`/api/candidates/${candidate.id}/interviews/${round.id}`)
      .set('Cookie', `nbi_session=${adminToken}`)
      .expect(200);

    // Verify gone
    const { rows } = await pool.query('SELECT * FROM interview_rounds WHERE id = $1', [round.id]);
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Scorecards CRUD
// ---------------------------------------------------------------------------

describe('Scorecards — POST', () => {
  it('creates scorecard with default criteria template (4 items)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Ivy' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(201);

    expect(Array.isArray(res.body.criteria)).toBe(true);
    expect(res.body.criteria).toHaveLength(4);
    expect(res.body.criteria[0].name).toBe('Technical competence');
    expect(res.body.criteria[0].rating).toBeNull();
    expect(res.body.interviewer_user_id).toBe(admin.id);
  });

  it('uses position scorecard_criteria when available', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'ClientC' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Designer' });

    // Set custom criteria on position
    const customCriteria = [
      { name: 'Portfolio quality', rating: null, notes: '' },
      { name: 'Design process', rating: null, notes: '' },
    ];
    await pool.query(
      'UPDATE hiring_positions SET scorecard_criteria = $1 WHERE id = $2',
      [JSON.stringify(customCriteria), position.id]
    );

    const candidate = await createTestCandidate({ name: 'Jake', client_id: client.id, position_id: position.id });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Design Review' });

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(201);

    expect(res.body.criteria).toHaveLength(2);
    expect(res.body.criteria[0].name).toBe('Portfolio quality');
    expect(res.body.criteria[1].name).toBe('Design process');
  });

  it('rejects duplicate scorecard per round per user (409)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Kim' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });

    await request(app)
      .post(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(201);

    await request(app)
      .post(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(409);
  });
});

describe('Scorecards — PATCH', () => {
  it('updates draft scorecard fields', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Leo' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });
    const sc = await createTestScorecard({
      round_id: round.id,
      interviewer_user_id: admin.id,
      interviewer_name: admin.display_name,
    });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards/${sc.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ overall_rating: 4, recommendation: 'hire', strengths: 'Excellent communicator' })
      .expect(200);

    expect(res.body.overall_rating).toBe(4);
    expect(res.body.recommendation).toBe('hire');
    expect(res.body.strengths).toBe('Excellent communicator');
  });

  it('rejects PATCH on submitted scorecard (403)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Mia' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });
    const sc = await createTestScorecard({
      round_id: round.id,
      interviewer_user_id: admin.id,
      interviewer_name: admin.display_name,
      submitted_at: new Date().toISOString(),
    });

    await request(app)
      .patch(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards/${sc.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ strengths: 'Updated after submission' })
      .expect(403);
  });
});

describe('Scorecards — Submit', () => {
  it('submit requires overall_rating and recommendation (400 if missing)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Ned' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });
    const sc = await createTestScorecard({
      round_id: round.id,
      interviewer_user_id: admin.id,
      interviewer_name: admin.display_name,
    });

    await request(app)
      .post(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards/${sc.id}/submit`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(400);
  });

  it('submit sets submitted_at timestamp', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Olive' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });
    const sc = await createTestScorecard({
      round_id: round.id,
      interviewer_user_id: admin.id,
      interviewer_name: admin.display_name,
      overall_rating: 4,
      recommendation: 'hire',
    });

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards/${sc.id}/submit`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.submitted_at).toBeTruthy();
    const ts = new Date(res.body.submitted_at);
    expect(ts.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    expect(ts.getTime()).toBeGreaterThan(Date.now() - 10000);
  });
});

describe('Scorecards — Visibility', () => {
  it('unsubmitted panel member sees only their own draft', async () => {
    const interviewer1 = await createTestUser({ role: 'member', display_name: 'Interviewer1' });
    const interviewer2 = await createTestUser({ role: 'member', display_name: 'Interviewer2' });
    const candidate = await createTestCandidate({ name: 'Pat' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });

    // Two scorecards, both unsubmitted
    await createTestScorecard({
      round_id: round.id,
      interviewer_user_id: interviewer1.id,
      interviewer_name: interviewer1.display_name,
    });
    await createTestScorecard({
      round_id: round.id,
      interviewer_user_id: interviewer2.id,
      interviewer_name: interviewer2.display_name,
    });

    // interviewer1 has not submitted — should see only their own draft (anti-anchoring)
    const token = await mintSession(interviewer1.id);
    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].interviewer_user_id).toBe(interviewer1.id);
  });

  it('submitted panel member sees all submitted scorecards', async () => {
    const panelA = await createTestUser({ role: 'member', display_name: 'PanelA' });
    const panelB = await createTestUser({ role: 'member', display_name: 'PanelB' });
    const candidate = await createTestCandidate({ name: 'Quinn' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });

    const submittedAt = new Date().toISOString();
    await createTestScorecard({
      round_id: round.id,
      interviewer_user_id: panelA.id,
      interviewer_name: panelA.display_name,
      overall_rating: 5,
      recommendation: 'strong-hire',
      submitted_at: submittedAt,
    });
    await createTestScorecard({
      round_id: round.id,
      interviewer_user_id: panelB.id,
      interviewer_name: panelB.display_name,
      overall_rating: 4,
      recommendation: 'hire',
      submitted_at: submittedAt,
    });

    // panelA has submitted — should see both submitted scorecards
    const token = await mintSession(panelA.id);
    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
  });

  it('admin sees all scorecards including drafts', async () => {
    const admin = await createTestUser({ role: 'admin', display_name: 'SuperAdmin' });
    const member1 = await createTestUser({ role: 'member', display_name: 'Panelist1' });
    const member2 = await createTestUser({ role: 'member', display_name: 'Panelist2' });
    const candidate = await createTestCandidate({ name: 'Rosa' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });

    // One draft, one submitted — admin is NOT on the panel
    await createTestScorecard({
      round_id: round.id,
      interviewer_user_id: member1.id,
      interviewer_name: member1.display_name,
    });
    await createTestScorecard({
      round_id: round.id,
      interviewer_user_id: member2.id,
      interviewer_name: member2.display_name,
      submitted_at: new Date().toISOString(),
    });

    const token = await mintSession(admin.id);
    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
  });

  it('client user sees only submitted scorecards', async () => {
    const clientA = await createTestClient({ name: 'ClientD' });
    const clientUser = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const nbiMember = await createTestUser({ role: 'member', display_name: 'NBI Panelist' });
    const candidate = await createTestCandidate({ name: 'Sam', client_id: clientA.id });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Screen' });

    const nbiMember2 = await createTestUser({ role: 'member', display_name: 'NBI Panelist 2' });

    // Draft scorecard — client should NOT see
    await createTestScorecard({
      round_id: round.id,
      interviewer_user_id: nbiMember.id,
      interviewer_name: nbiMember.display_name,
    });
    // Submitted scorecard — client SHOULD see
    await createTestScorecard({
      round_id: round.id,
      interviewer_user_id: nbiMember2.id,
      interviewer_name: nbiMember2.display_name,
      submitted_at: new Date().toISOString(),
    });

    const token = await mintSession(clientUser.id);
    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].submitted_at).toBeTruthy();
  });
});
