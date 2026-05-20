# ATS Spec B: Interview Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured interview management — rounds per candidate, scorecards with criteria ratings, independent feedback with anti-anchoring visibility rules, and criteria templates from positions.

**Architecture:** Migration 048 creates `interview_rounds` and `interview_scorecards` tables plus `scorecard_criteria` on `hiring_positions`. A single new route file `interview-rounds.js` handles all CRUD for rounds and scorecards. The frontend adds an "Interviews" section to the candidate detail panel with round management, scorecard forms, and panel feedback display.

**Tech Stack:** Node.js + Express 4, PostgreSQL (`pg`), Vitest + supertest, monolithic SPA.

**Spec:** `docs/superpowers/specs/2026-05-20-ats-spec-b-interview-management.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `dashboard-server/migrations/048_interview_management.sql` | Create | `interview_rounds` table, `interview_scorecards` table, `scorecard_criteria` on `hiring_positions` |
| `dashboard-server/routes/interview-rounds.js` | Create | All CRUD: rounds (GET/POST/PATCH/DELETE) + scorecards (GET/POST/PATCH/submit/DELETE) |
| `dashboard-server/server.js` | Modify | Mount `interview-rounds.js` |
| `dashboard-server/routes/hiring.js` | Modify | Add `scorecard_criteria` to position GET SELECT and PATCH allowed fields |
| `dashboard-server/tests/helpers/fixtures.js` | Modify | Add `createTestInterviewRound` and `createTestScorecard` factories |
| `dashboard-server/tests/unit/interview-management.test.mjs` | Create | Tests for rounds CRUD, scorecards CRUD, visibility rules, criteria templates |
| `nbi_project_dashboard.html` | Modify | Interviews section in candidate detail, scorecard forms, panel feedback display |

---

## Task 1: Migration 048

**Files:**
- Create: `dashboard-server/migrations/048_interview_management.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 048_interview_management.sql
-- Interview rounds and scorecards for structured hiring evaluation

CREATE TABLE IF NOT EXISTS interview_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  round_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  outcome TEXT,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ir_candidate ON interview_rounds(candidate_id);

CREATE TABLE IF NOT EXISTS interview_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES interview_rounds(id) ON DELETE CASCADE,
  interviewer_name TEXT NOT NULL,
  interviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
  recommendation TEXT,
  strengths TEXT,
  concerns TEXT,
  criteria JSONB DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_isc_round_user ON interview_scorecards(round_id, interviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_isc_interviewer ON interview_scorecards(interviewer_user_id);

-- Scorecard criteria templates on positions
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS scorecard_criteria JSONB DEFAULT NULL;
```

- [ ] **Step 2: Run migration**

```
cd dashboard-server && npm run init-db
```

Also apply to prod DB:
```javascript
node -e "require('dotenv').config();const {Pool}=require('pg');const fs=require('fs');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(fs.readFileSync('migrations/048_interview_management.sql','utf8')).then(()=>{console.log('048 applied');p.end()}).catch(e=>{console.error(e);p.end()})"
```

- [ ] **Step 3: Commit**

```
git add dashboard-server/migrations/048_interview_management.sql
git commit -m "feat(ats): migration 048 — interview rounds, scorecards, criteria templates"
```

---

## Task 2: Test Fixtures

**Files:**
- Modify: `dashboard-server/tests/helpers/fixtures.js`

- [ ] **Step 1: Add `createTestInterviewRound` factory**

Add after `createTestHiringPosition`:

```javascript
async function createTestInterviewRound(opts = {}) {
  if (!opts.candidate_id) throw new Error('createTestInterviewRound: candidate_id required');
  const { rows } = await pool.query(
    `INSERT INTO interview_rounds (candidate_id, round_number, title, scheduled_at, duration_minutes, location, status, outcome, outcome_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      opts.candidate_id,
      opts.round_number || 1,
      opts.title || 'Phone Screen',
      opts.scheduled_at || null,
      opts.duration_minutes || null,
      opts.location || null,
      opts.status || 'scheduled',
      opts.outcome || null,
      opts.outcome_notes || null,
    ]
  );
  return rows[0];
}
```

- [ ] **Step 2: Add `createTestScorecard` factory**

```javascript
async function createTestScorecard(opts = {}) {
  if (!opts.round_id) throw new Error('createTestScorecard: round_id required');
  if (!opts.interviewer_user_id) throw new Error('createTestScorecard: interviewer_user_id required');
  const { rows } = await pool.query(
    `INSERT INTO interview_scorecards (round_id, interviewer_name, interviewer_user_id, overall_rating, recommendation, strengths, concerns, criteria, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      opts.round_id,
      opts.interviewer_name || 'Test Interviewer',
      opts.interviewer_user_id,
      opts.overall_rating || null,
      opts.recommendation || null,
      opts.strengths || null,
      opts.concerns || null,
      opts.criteria ? JSON.stringify(opts.criteria) : '[]',
      opts.submitted_at || null,
    ]
  );
  return rows[0];
}
```

- [ ] **Step 3: Add both to exports**

Add `createTestInterviewRound` and `createTestScorecard` to the `module.exports` object.

- [ ] **Step 4: Run tests to verify no regressions**

```
cd dashboard-server && npm test
```

- [ ] **Step 5: Commit**

```
git add dashboard-server/tests/helpers/fixtures.js
git commit -m "feat(ats): test fixtures for interview rounds and scorecards"
```

---

## Task 3: Interview Rounds CRUD Endpoints

**Files:**
- Create: `dashboard-server/routes/interview-rounds.js`
- Modify: `dashboard-server/server.js`
- Create: `dashboard-server/tests/unit/interview-management.test.mjs`

- [ ] **Step 1: Write failing tests for rounds CRUD**

Create `dashboard-server/tests/unit/interview-management.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestCandidate, createTestInterviewRound, createTestScorecard } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Interview rounds CRUD', () => {
  it('POST creates a round with auto-incrementing round_number', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Alice' });

    const r1 = await request(app)
      .post(`/api/candidates/${candidate.id}/interviews`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ title: 'Phone Screen', scheduled_at: '2026-06-01T10:00:00Z', duration_minutes: 30, location: 'Zoom' })
      .expect(201);

    expect(r1.body.round_number).toBe(1);
    expect(r1.body.title).toBe('Phone Screen');
    expect(r1.body.status).toBe('scheduled');

    const r2 = await request(app)
      .post(`/api/candidates/${candidate.id}/interviews`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ title: 'Technical Interview' })
      .expect(201);

    expect(r2.body.round_number).toBe(2);
  });

  it('GET lists rounds ordered by round_number', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Bob' });

    await createTestInterviewRound({ candidate_id: candidate.id, round_number: 1, title: 'Round 1' });
    await createTestInterviewRound({ candidate_id: candidate.id, round_number: 2, title: 'Round 2' });

    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/interviews`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Round 1');
    expect(res.body[1].title).toBe('Round 2');
  });

  it('PATCH updates round fields', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Carla' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Screen' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}/interviews/${round.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ status: 'completed', outcome: 'pass', outcome_notes: 'Strong candidate' })
      .expect(200);

    expect(res.body.status).toBe('completed');
    expect(res.body.outcome).toBe('pass');
  });

  it('rejects invalid status', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Dan' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Screen' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}/interviews/${round.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ status: 'invalid-status' })
      .expect(400);
  });

  it('rejects invalid outcome', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Eve' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Screen' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}/interviews/${round.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ outcome: 'maybe' })
      .expect(400);
  });

  it('DELETE removes a round (admin only)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(admin.id);
    const memberToken = await mintSession(member.id);
    const candidate = await createTestCandidate({ name: 'Fern' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Screen' });

    await request(app)
      .delete(`/api/candidates/${candidate.id}/interviews/${round.id}`)
      .set('Cookie', `nbi_session=${memberToken}`)
      .expect(403);

    await request(app)
      .delete(`/api/candidates/${candidate.id}/interviews/${round.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
  });

  it('client user can view rounds for their own candidates', async () => {
    const client = await createTestClient({ name: 'ClientIR' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const candidate = await createTestCandidate({ name: 'Greta', client_id: client.id });
    await createTestInterviewRound({ candidate_id: candidate.id, title: 'Screen' });

    const token = await mintSession(clientUser.id);
    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/interviews`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
  });

  it('client user cannot create rounds', async () => {
    const client = await createTestClient({ name: 'ClientIR2' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const candidate = await createTestCandidate({ name: 'Hank', client_id: client.id });

    const token = await mintSession(clientUser.id);
    await request(app)
      .post(`/api/candidates/${candidate.id}/interviews`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ title: 'Screen' })
      .expect(403);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```
cd dashboard-server && npx vitest run tests/unit/interview-management.test.mjs
```

- [ ] **Step 3: Create `interview-rounds.js`**

Create `dashboard-server/routes/interview-rounds.js`:

```javascript
'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, requireAdmin, requireNBI, isValidUuid, auditLog, buildPatchQuery } = ctx;

  const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'no-show'];
  const VALID_OUTCOMES = ['pass', 'fail', 'on-hold'];
  const VALID_RECOMMENDATIONS = ['strong-hire', 'hire', 'no-hire', 'strong-no-hire'];

  const DEFAULT_CRITERIA = [
    { name: 'Technical competence', rating: null, notes: '' },
    { name: 'Communication', rating: null, notes: '' },
    { name: 'Culture fit', rating: null, notes: '' },
    { name: 'Problem solving', rating: null, notes: '' },
  ];

  // --- Candidate ownership check (reused by all endpoints) ---
  async function verifyCandidateAccess(req, res, candidateId) {
    const { rows: [candidate] } = await pool.query('SELECT client_id FROM candidates WHERE id = $1', [candidateId]);
    if (!candidate) { res.status(404).json({ error: 'Candidate not found' }); return null; }
    if (req.user.clientId && candidate.client_id !== req.user.clientId) {
      res.status(403).json({ error: 'Access denied' }); return null;
    }
    return candidate;
  }

  // ==================== INTERVIEW ROUNDS ====================

  // GET /api/candidates/:id/interviews
  router.get('/api/candidates/:id/interviews', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;
      const { rows } = await pool.query(
        'SELECT * FROM interview_rounds WHERE candidate_id = $1 ORDER BY round_number ASC',
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      log('error', 'Interviews', 'Failed to list rounds', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // POST /api/candidates/:id/interviews — NBI only
  router.post('/api/candidates/:id/interviews', requireNBI, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    const { title, scheduled_at, duration_minutes, location } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'title required' });
    try {
      const { rows: [candidate] } = await pool.query('SELECT id FROM candidates WHERE id = $1', [req.params.id]);
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

      const dbClient = await pool.connect();
      try {
        await dbClient.query('BEGIN');
        const { rows: [maxRow] } = await dbClient.query(
          'SELECT COALESCE(MAX(round_number), 0) AS max_num FROM interview_rounds WHERE candidate_id = $1',
          [req.params.id]
        );
        const nextNum = (maxRow.max_num || 0) + 1;
        const { rows } = await dbClient.query(
          `INSERT INTO interview_rounds (candidate_id, round_number, title, scheduled_at, duration_minutes, location)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [req.params.id, nextNum, title.trim(), scheduled_at || null, duration_minutes || null, location || null]
        );
        await dbClient.query('COMMIT');
        res.status(201).json(rows[0]);
      } catch (e) {
        await dbClient.query('ROLLBACK');
        throw e;
      } finally {
        dbClient.release();
      }
    } catch (e) {
      log('error', 'Interviews', 'Failed to create round', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // PATCH /api/candidates/:id/interviews/:roundId
  router.patch('/api/candidates/:id/interviews/:roundId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.roundId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    if (req.body.status && !VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (req.body.outcome !== undefined && req.body.outcome !== null && !VALID_OUTCOMES.includes(req.body.outcome)) {
      return res.status(400).json({ error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(', ')}` });
    }
    try {
      const { updates, vals, nextIdx } = buildPatchQuery(req.body, [
        'title', 'scheduled_at', 'duration_minutes', 'location', 'status', 'outcome', 'outcome_notes'
      ]);
      if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
      updates.push('updated_at = NOW()');
      vals.push(req.params.roundId);
      vals.push(req.params.id);
      const { rows } = await pool.query(
        `UPDATE interview_rounds SET ${updates.join(', ')} WHERE id = $${nextIdx} AND candidate_id = $${nextIdx + 1} RETURNING *`,
        vals
      );
      if (!rows[0]) return res.status(404).json({ error: 'Round not found' });
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Interviews', 'Failed to update round', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // DELETE /api/candidates/:id/interviews/:roundId — admin only
  router.delete('/api/candidates/:id/interviews/:roundId', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.roundId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    try {
      const { rowCount } = await pool.query(
        'DELETE FROM interview_rounds WHERE id = $1 AND candidate_id = $2',
        [req.params.roundId, req.params.id]
      );
      if (rowCount === 0) return res.status(404).json({ error: 'Round not found' });
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Interviews', 'Failed to delete round', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // ==================== SCORECARDS ====================

  // GET /api/candidates/:id/interviews/:roundId/scorecards
  router.get('/api/candidates/:id/interviews/:roundId/scorecards', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.roundId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;

      const { rows: allCards } = await pool.query(
        'SELECT * FROM interview_scorecards WHERE round_id = $1 ORDER BY created_at ASC',
        [req.params.roundId]
      );

      const isClientUser = !!req.user.clientId;
      const isAdmin = req.user.role === 'admin';
      const myCard = allCards.find(c => c.interviewer_user_id === req.user.id);
      const hasSubmitted = myCard && myCard.submitted_at;
      const isOnPanel = allCards.some(c => c.interviewer_user_id === req.user.id);

      let visible;
      if (isAdmin) {
        visible = allCards;
      } else if (isClientUser) {
        visible = allCards.filter(c => c.submitted_at);
      } else if (!isOnPanel) {
        visible = allCards.filter(c => c.submitted_at);
      } else if (hasSubmitted) {
        visible = allCards.filter(c => c.submitted_at || c.interviewer_user_id === req.user.id);
      } else {
        visible = allCards.filter(c => c.interviewer_user_id === req.user.id);
      }

      res.json(visible);
    } catch (e) {
      log('error', 'Interviews', 'Failed to list scorecards', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // POST /api/candidates/:id/interviews/:roundId/scorecards
  router.post('/api/candidates/:id/interviews/:roundId/scorecards', requireNBI, async (req, res) => {
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.roundId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    try {
      // Determine criteria template
      let criteria = req.body.criteria;
      if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
        const { rows: [candidate] } = await pool.query('SELECT position_id FROM candidates WHERE id = $1', [req.params.id]);
        if (candidate && candidate.position_id) {
          const { rows: [position] } = await pool.query('SELECT scorecard_criteria FROM hiring_positions WHERE id = $1', [candidate.position_id]);
          if (position && position.scorecard_criteria && Array.isArray(position.scorecard_criteria) && position.scorecard_criteria.length > 0) {
            criteria = position.scorecard_criteria;
          }
        }
        if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
          criteria = DEFAULT_CRITERIA;
        }
      }

      const { rows } = await pool.query(
        `INSERT INTO interview_scorecards (round_id, interviewer_name, interviewer_user_id, criteria)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [req.params.roundId, req.user.displayName || 'Unknown', req.user.id, JSON.stringify(criteria)]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      if (e.code === '23505') {
        return res.status(409).json({ error: 'You already have a scorecard for this round' });
      }
      log('error', 'Interviews', 'Failed to create scorecard', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // PATCH /api/candidates/:id/interviews/:roundId/scorecards/:scId
  router.patch('/api/candidates/:id/interviews/:roundId/scorecards/:scId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.scId)) return res.status(400).json({ error: 'Invalid ID' });
    try {
      const { rows: [existing] } = await pool.query('SELECT * FROM interview_scorecards WHERE id = $1', [req.params.scId]);
      if (!existing) return res.status(404).json({ error: 'Scorecard not found' });
      if (existing.interviewer_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the author can edit this scorecard' });
      }
      if (existing.submitted_at) {
        return res.status(403).json({ error: 'Scorecard already submitted' });
      }

      if (req.body.recommendation && !VALID_RECOMMENDATIONS.includes(req.body.recommendation)) {
        return res.status(400).json({ error: `Invalid recommendation. Must be one of: ${VALID_RECOMMENDATIONS.join(', ')}` });
      }
      if (req.body.overall_rating !== undefined && req.body.overall_rating !== null) {
        const r = Number(req.body.overall_rating);
        if (!Number.isInteger(r) || r < 1 || r > 5) {
          return res.status(400).json({ error: 'overall_rating must be 1-5' });
        }
      }

      const patchBody = { ...req.body };
      if (patchBody.criteria !== undefined) patchBody.criteria = JSON.stringify(patchBody.criteria);
      const { updates, vals, nextIdx } = buildPatchQuery(patchBody, [
        'overall_rating', 'recommendation', 'strengths', 'concerns', 'criteria'
      ]);
      if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
      updates.push('updated_at = NOW()');
      vals.push(req.params.scId);
      const { rows } = await pool.query(
        `UPDATE interview_scorecards SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
        vals
      );
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Interviews', 'Failed to update scorecard', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // POST /api/candidates/:id/interviews/:roundId/scorecards/:scId/submit
  router.post('/api/candidates/:id/interviews/:roundId/scorecards/:scId/submit', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.scId)) return res.status(400).json({ error: 'Invalid ID' });
    try {
      const { rows: [sc] } = await pool.query('SELECT * FROM interview_scorecards WHERE id = $1', [req.params.scId]);
      if (!sc) return res.status(404).json({ error: 'Scorecard not found' });
      if (sc.interviewer_user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only the author can submit this scorecard' });
      }
      if (sc.submitted_at) return res.status(400).json({ error: 'Already submitted' });
      if (!sc.overall_rating) return res.status(400).json({ error: 'overall_rating required before submitting' });
      if (!sc.recommendation) return res.status(400).json({ error: 'recommendation required before submitting' });

      const { rows } = await pool.query(
        'UPDATE interview_scorecards SET submitted_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
        [req.params.scId]
      );
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Interviews', 'Failed to submit scorecard', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // DELETE /api/candidates/:id/interviews/:roundId/scorecards/:scId — admin only
  router.delete('/api/candidates/:id/interviews/:roundId/scorecards/:scId', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.scId)) return res.status(400).json({ error: 'Invalid ID' });
    try {
      const { rowCount } = await pool.query('DELETE FROM interview_scorecards WHERE id = $1', [req.params.scId]);
      if (rowCount === 0) return res.status(404).json({ error: 'Scorecard not found' });
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Interviews', 'Failed to delete scorecard', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
```

- [ ] **Step 4: Mount in `server.js`**

After line 443 (candidate-comments mount), add:

```javascript
app.use(require('./routes/interview-rounds')({ pool, log, requireAdmin, requireNBI, isValidUuid, auditLog, buildPatchQuery }));
```

- [ ] **Step 5: Run tests**

```
cd dashboard-server && npx vitest run tests/unit/interview-management.test.mjs
```

Expected: all 8 tests pass.

- [ ] **Step 6: Commit**

```
git add dashboard-server/routes/interview-rounds.js dashboard-server/server.js dashboard-server/tests/unit/interview-management.test.mjs
git commit -m "feat(ats): interview rounds CRUD with client scoping"
```

---

## Task 4: Scorecard Tests — Visibility Rules + Criteria Templates

**Files:**
- Modify: `dashboard-server/tests/unit/interview-management.test.mjs`

- [ ] **Step 1: Append scorecard tests**

```javascript
describe('Interview scorecards', () => {
  it('POST creates scorecard with default criteria template', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Ivy' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Screen' });

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(201);

    expect(res.body.interviewer_user_id).toBe(admin.id);
    expect(res.body.criteria).toHaveLength(4);
    expect(res.body.criteria[0].name).toBe('Technical competence');
    expect(res.body.submitted_at).toBeNull();
  });

  it('POST uses position scorecard_criteria when available', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'CritCo' });

    // Create position with custom criteria
    await pool.query(
      "UPDATE hiring_positions SET scorecard_criteria = $1 WHERE id = (SELECT id FROM hiring_positions LIMIT 0)",
      ['[]']
    );
    const { rows: [pos] } = await pool.query(
      `INSERT INTO hiring_positions (client_id, title, scorecard_criteria) VALUES ($1, 'Dev', $2) RETURNING *`,
      [client.id, JSON.stringify([{ name: 'React skill', rating: null, notes: '' }, { name: 'System design', rating: null, notes: '' }])]
    );
    const candidate = await createTestCandidate({ name: 'Jake', client_id: client.id, position_id: pos.id });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Technical' });

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(201);

    expect(res.body.criteria).toHaveLength(2);
    expect(res.body.criteria[0].name).toBe('React skill');
  });

  it('rejects duplicate scorecard per round per user', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Kate' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Screen' });

    await request(app)
      .post(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(201);

    await request(app)
      .post(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(409);
  });

  it('PATCH updates draft scorecard', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Leo' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Screen' });
    const sc = await createTestScorecard({ round_id: round.id, interviewer_user_id: admin.id, interviewer_name: admin.display_name });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards/${sc.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ overall_rating: 4, recommendation: 'hire', strengths: 'Great communication' })
      .expect(200);

    expect(res.body.overall_rating).toBe(4);
    expect(res.body.recommendation).toBe('hire');
  });

  it('rejects PATCH on submitted scorecard', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Mia' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Screen' });
    const sc = await createTestScorecard({
      round_id: round.id, interviewer_user_id: admin.id, interviewer_name: admin.display_name,
      overall_rating: 3, recommendation: 'hire', submitted_at: new Date().toISOString(),
    });

    await request(app)
      .patch(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards/${sc.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ overall_rating: 5 })
      .expect(403);
  });

  it('submit requires overall_rating and recommendation', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Nina' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Screen' });
    const sc = await createTestScorecard({ round_id: round.id, interviewer_user_id: admin.id, interviewer_name: admin.display_name });

    await request(app)
      .post(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards/${sc.id}/submit`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(400);
  });

  it('submit sets submitted_at', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Oscar' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Screen' });
    const sc = await createTestScorecard({
      round_id: round.id, interviewer_user_id: admin.id, interviewer_name: admin.display_name,
      overall_rating: 4, recommendation: 'hire',
    });

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards/${sc.id}/submit`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.submitted_at).toBeTruthy();
  });

  it('visibility: unsubmitted panel member sees only own draft', async () => {
    const admin = await createTestUser({ role: 'admin', display_name: 'AdminA' });
    const interviewer1 = await createTestUser({ role: 'member', display_name: 'Int1' });
    const interviewer2 = await createTestUser({ role: 'member', display_name: 'Int2' });
    const candidate = await createTestCandidate({ name: 'Pat' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Panel' });

    // Both have draft scorecards
    await createTestScorecard({ round_id: round.id, interviewer_user_id: interviewer1.id, interviewer_name: 'Int1' });
    await createTestScorecard({ round_id: round.id, interviewer_user_id: interviewer2.id, interviewer_name: 'Int2' });

    // Interviewer1 (not submitted) should only see their own
    const token1 = await mintSession(interviewer1.id);
    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token1}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].interviewer_user_id).toBe(interviewer1.id);
  });

  it('visibility: submitted panel member sees all submitted', async () => {
    const interviewer1 = await createTestUser({ role: 'member', display_name: 'Sub1' });
    const interviewer2 = await createTestUser({ role: 'member', display_name: 'Sub2' });
    const candidate = await createTestCandidate({ name: 'Quinn' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Panel' });

    await createTestScorecard({
      round_id: round.id, interviewer_user_id: interviewer1.id, interviewer_name: 'Sub1',
      overall_rating: 4, recommendation: 'hire', submitted_at: new Date().toISOString(),
    });
    await createTestScorecard({
      round_id: round.id, interviewer_user_id: interviewer2.id, interviewer_name: 'Sub2',
      overall_rating: 3, recommendation: 'no-hire', submitted_at: new Date().toISOString(),
    });

    const token1 = await mintSession(interviewer1.id);
    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token1}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
  });

  it('visibility: admin sees all scorecards including drafts', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const interviewer = await createTestUser({ role: 'member', display_name: 'IntX' });
    const candidate = await createTestCandidate({ name: 'Rita' });
    const round = await createTestInterviewRound({ candidate_id: candidate.id, title: 'Panel' });

    await createTestScorecard({ round_id: round.id, interviewer_user_id: interviewer.id, interviewer_name: 'IntX' });

    const token = await mintSession(admin.id);
    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/interviews/${round.id}/scorecards`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].submitted_at).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests**

```
cd dashboard-server && npx vitest run tests/unit/interview-management.test.mjs
```

Expected: all 19 tests pass (8 rounds + 11 scorecards).

- [ ] **Step 3: Commit**

```
git add dashboard-server/tests/unit/interview-management.test.mjs
git commit -m "test(ats): scorecard tests — visibility rules, criteria templates, submit flow"
```

---

## Task 5: Add `scorecard_criteria` to Position API

**Files:**
- Modify: `dashboard-server/routes/hiring.js`

- [ ] **Step 1: Add `scorecard_criteria` to GET positions SELECT**

In the SELECT (around line 74), after `p.interview_panel,` and before `p.jd_filename`, add:
```
p.scorecard_criteria,
```

- [ ] **Step 2: Add to PATCH allowed fields**

In the PATCH handler (around line 133), add `'scorecard_criteria'` to the `buildPatchQuery` allowed list. Also add stringify logic for it before buildPatchQuery:
```javascript
    if (patchBody.scorecard_criteria !== undefined) patchBody.scorecard_criteria = JSON.stringify(patchBody.scorecard_criteria);
```

- [ ] **Step 3: Run tests**

```
cd dashboard-server && npm test
```

- [ ] **Step 4: Commit**

```
git add dashboard-server/routes/hiring.js
git commit -m "feat(ats): scorecard_criteria on position GET/PATCH"
```

---

## Task 6: Frontend — Interviews Section in Candidate Detail

**Files:**
- Modify: `nbi_project_dashboard.html`

This is the largest frontend task. It adds an "Interviews" section to the candidate detail panel between the stage-specific section and the timeline section.

- [ ] **Step 1: Add interview rendering helpers**

Add these functions near the other candidate detail helpers (before `openCandidateDetail`):

```javascript
function buildCandidateInterviewsHtml(candidateId, rounds, disabledStyle) {
  if (!rounds || rounds.length === 0) {
    return `<div class="candidate-detail__section" id="cdInterviewsSection" style="${disabledStyle}">
      <div class="candidate-detail__section-title">Interviews</div>
      <div style="color:var(--text-muted);font-size:0.78rem;padding:8px 0">No interview rounds yet</div>
      ${!isClientUser() ? `<button class="btn btn--sm" onclick="addInterviewRound('${candidateId}')">+ Add Round</button>` : ''}
    </div>`;
  }

  const roundsHtml = rounds.map(r => {
    const statusColors = { scheduled: 'var(--accent)', completed: 'var(--success)', cancelled: 'var(--text-muted)', 'no-show': 'var(--danger)' };
    const outcomeColors = { pass: 'var(--success)', fail: 'var(--danger)', 'on-hold': '#f59e0b' };
    const schedStr = r.scheduled_at ? new Date(r.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Not scheduled';
    const durStr = r.duration_minutes ? `${r.duration_minutes}min` : '';
    const isAdmin = _currentUser && _currentUser.role === 'admin';

    return `<div style="border:1px solid var(--border-default);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-weight:600;font-size:0.85rem">Round ${r.round_number}: ${esc(r.title)}</div>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="font-size:0.68rem;padding:2px 6px;border-radius:8px;background:color-mix(in srgb, ${statusColors[r.status] || 'var(--text-muted)'} 20%, var(--bg-surface));color:${statusColors[r.status] || 'var(--text-muted)'}">${r.status}</span>
          ${r.outcome ? `<span style="font-size:0.68rem;padding:2px 6px;border-radius:8px;background:color-mix(in srgb, ${outcomeColors[r.outcome] || 'var(--text-muted)'} 20%, var(--bg-surface));color:${outcomeColors[r.outcome] || 'var(--text-muted)'};font-weight:600">${r.outcome}</span>` : ''}
        </div>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted);display:flex;gap:12px;flex-wrap:wrap">
        <span>${schedStr}</span>
        ${durStr ? `<span>${durStr}</span>` : ''}
        ${r.location ? `<span>${esc(r.location)}</span>` : ''}
      </div>
      ${r.outcome_notes ? `<div style="font-size:0.78rem;margin-top:6px;color:var(--text-secondary)">${esc(r.outcome_notes)}</div>` : ''}
      <div style="margin-top:8px" id="cdScorecardsFor_${r.id}">
        <div style="color:var(--text-muted);font-size:0.72rem">Loading scorecards…</div>
      </div>
    </div>`;
  }).join('');

  return `<div class="candidate-detail__section" id="cdInterviewsSection" style="${disabledStyle}">
    <div class="candidate-detail__section-title">Interviews</div>
    ${roundsHtml}
    ${!isClientUser() ? `<button class="btn btn--sm" onclick="addInterviewRound('${candidateId}')">+ Add Round</button>` : ''}
  </div>`;
}
```

- [ ] **Step 2: Add interview management functions**

```javascript
async function addInterviewRound(candidateId) {
  const title = prompt('Interview round title (e.g. Phone Screen, Technical Interview):');
  if (!title || !title.trim()) return;
  const resp = await authFetch(`/api/candidates/${candidateId}/interviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title.trim() }),
  });
  if (resp.ok) {
    toast('Interview round added');
    openCandidateDetail(candidateId);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Failed to add round', 'error');
  }
}

async function loadAndRenderScorecards(candidateId, roundId) {
  const container = document.getElementById(`cdScorecardsFor_${roundId}`);
  if (!container) return;
  try {
    const cards = await apiCall(`/api/candidates/${candidateId}/interviews/${roundId}/scorecards`);
    if (!cards || cards.length === 0) {
      const isNBI = !isClientUser();
      container.innerHTML = isNBI
        ? `<button class="btn btn--sm" onclick="createScorecard('${candidateId}','${roundId}')">Start Evaluation</button>`
        : '<div style="font-size:0.72rem;color:var(--text-muted)">No evaluations yet</div>';
      return;
    }

    const myCard = cards.find(c => c.interviewer_user_id === (_currentUser && _currentUser.id));
    const submitted = cards.filter(c => c.submitted_at);
    const isNBI = !isClientUser();

    let html = '';
    if (isNBI && !myCard) {
      html += `<button class="btn btn--sm" style="margin-bottom:8px" onclick="createScorecard('${candidateId}','${roundId}')">Add Your Assessment</button>`;
    }

    if (submitted.length > 0) {
      const avgRating = (submitted.reduce((s, c) => s + (c.overall_rating || 0), 0) / submitted.length).toFixed(1);
      const recCounts = {};
      submitted.forEach(c => { if (c.recommendation) recCounts[c.recommendation] = (recCounts[c.recommendation] || 0) + 1; });
      const recSummary = Object.entries(recCounts).map(([k, v]) => `${v} ${k.replace('-', ' ')}`).join(', ');

      html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:6px">Avg rating: <strong>${avgRating}/5</strong> | ${recSummary}</div>`;
      submitted.forEach(c => {
        html += `<div style="font-size:0.75rem;padding:6px 0;border-top:1px solid var(--border-default)">
          <span style="font-weight:600">${esc(c.interviewer_name)}</span>
          <span style="color:var(--text-muted)"> — ${c.overall_rating}/5, ${(c.recommendation || '').replace('-', ' ')}</span>
          ${c.strengths ? `<div style="color:var(--success);font-size:0.72rem;margin-top:2px">+ ${esc(c.strengths)}</div>` : ''}
          ${c.concerns ? `<div style="color:var(--danger);font-size:0.72rem">- ${esc(c.concerns)}</div>` : ''}
        </div>`;
      });
    }

    container.innerHTML = html || '<div style="font-size:0.72rem;color:var(--text-muted)">Evaluations in progress</div>';
  } catch (e) {
    container.innerHTML = '<div style="font-size:0.72rem;color:var(--text-muted)">Failed to load scorecards</div>';
  }
}

async function createScorecard(candidateId, roundId) {
  const resp = await authFetch(`/api/candidates/${candidateId}/interviews/${roundId}/scorecards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (resp.ok) {
    toast('Scorecard created');
    openCandidateDetail(candidateId);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Failed to create scorecard', 'error');
  }
}
```

- [ ] **Step 3: Wire interviews into `openCandidateDetail`**

In `openCandidateDetail`, after `buildCandidateStageSubHtml(c)` and before the timeline skeleton section, add the interviews section. Also load rounds data in the `Promise.all`:

After the candidate fetch (`const c = await apiCall(...)`), add an interviews fetch:
```javascript
  const roundsData = await apiCall(`/api/candidates/${id}/interviews`).catch(() => []);
```

Then in the panel HTML, after `${buildCandidateStageSubHtml(c)}`:
```javascript
      ${buildCandidateInterviewsHtml(id, roundsData, disabledStyle)}
```

After the panel is rendered and the history/comments sub-resources are loaded, load scorecards for each round:
```javascript
  // Load scorecards for each interview round
  if (roundsData && roundsData.length > 0) {
    roundsData.forEach(r => loadAndRenderScorecards(id, r.id));
  }
```

- [ ] **Step 4: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(ats): interviews section in candidate detail — rounds + scorecards"
```

---

## Task 7: Verification

- [ ] **Step 1: Run full test suite**

```
cd dashboard-server && npm test
```

- [ ] **Step 2: Run E2E tests**

```
cd dashboard-server && npm run test:e2e
```

- [ ] **Step 3: Restart PM2 and verify**

```
pm2 restart nbi-dashboard
```

Verify:
- Open a candidate detail panel → Interviews section visible
- Click "+ Add Round" → creates a round with auto-incrementing number
- Each round shows status badge, schedule, location
- "Start Evaluation" button creates a scorecard with default criteria
- Scorecard visibility: unsubmitted users see only their own draft
- Position detail: scorecard_criteria field available
