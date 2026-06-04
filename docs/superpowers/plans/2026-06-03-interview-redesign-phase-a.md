# Interview UX Redesign — Phase A: Database Migration + API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the database and API foundation for the unified round-based interview system. After this phase, all new endpoints work and are tested, old endpoints return 410 Gone, and existing frontend continues to work (it still calls the old endpoints but gracefully handles 410s).

**Architecture:** Single migration (062) handles all schema changes + data migration from `interview_rounds`. New `hiring_decisions` table for candidate-level decisions. Extended `interview_configs` with scheduling/round fields. New PATCH/DELETE endpoints. Blind scoring gate. Session decline. Audit trail on scores. 410 retirement of old routes.

**Tech Stack:** Node.js/Express, PostgreSQL (via `pg`), Vitest (unit tests)

**Spec:** `docs/superpowers/specs/2026-06-03-interview-ux-redesign.md` (v3)

**Phase sequence:** This is Phase A of 3. Phase B = frontend candidate panel. Phase C = Add/Edit/Delete modals + calendar.

---

## Task 1: Write migration 062

**Files:**
- Create: `dashboard-server/migrations/062_interview_redesign.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 062_interview_redesign.sql
-- Interview UX Redesign: merge rounds into configs, add hiring_decisions,
-- blind scoring, session decline, audit trail, FK cascade fixes.

-- ===== 1. New table: hiring_decisions =====
CREATE TABLE IF NOT EXISTS hiring_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('advance', 'hold', 'reject')),
  rejection_category TEXT,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hd_candidate ON hiring_decisions(candidate_id);

-- ===== 2. Add round/scheduling columns to interview_configs =====
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS round_type TEXT DEFAULT 'Technical';
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS round_type_custom TEXT;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS round_number INT;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 60;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS interviewer_name TEXT;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS outcome TEXT DEFAULT 'pending';
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

-- Add CHECK constraints (safe even if column already exists with data)
DO $$ BEGIN
  ALTER TABLE interview_configs ADD CONSTRAINT chk_ic_round_type
    CHECK (round_type IN ('Phone Screen','Technical','Cultural','Final','Other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE interview_configs ADD CONSTRAINT chk_ic_outcome
    CHECK (outcome IN ('pending','passed','failed','rescheduled','no_show','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE interview_configs ADD CONSTRAINT chk_ic_duration
    CHECK (duration_minutes >= 5 AND duration_minutes <= 480);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== 3. Fix candidate_id FK: SET NULL -> CASCADE, make NOT NULL =====
-- First, delete any configs with NULL candidate_id (orphans)
DELETE FROM interview_configs WHERE candidate_id IS NULL;

-- Drop old FK, add NOT NULL, add new FK with CASCADE
ALTER TABLE interview_configs DROP CONSTRAINT IF EXISTS interview_configs_candidate_id_fkey;
ALTER TABLE interview_configs ALTER COLUMN candidate_id SET NOT NULL;
ALTER TABLE interview_configs ADD CONSTRAINT interview_configs_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE;

-- ===== 4. Unique constraint on (candidate_id, round_number) =====
-- Backfill round_number for existing configs (ordered by created_at)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY candidate_id ORDER BY created_at) AS rn
  FROM interview_configs
  WHERE round_number IS NULL
)
UPDATE interview_configs SET round_number = numbered.rn
FROM numbered WHERE interview_configs.id = numbered.id;

DO $$ BEGIN
  ALTER TABLE interview_configs ADD CONSTRAINT uq_ic_candidate_round
    UNIQUE (candidate_id, round_number);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== 5. Session decline status =====
ALTER TABLE interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_status_check;
ALTER TABLE interview_sessions ADD CONSTRAINT interview_sessions_status_check
  CHECK (status IN ('assigned', 'in_progress', 'submitted', 'declined'));

-- ===== 6. Audit columns on interview_scores =====
ALTER TABLE interview_scores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE interview_scores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ===== 7. Change question FKs to ON DELETE SET NULL =====
-- interview_config_questions
ALTER TABLE interview_config_questions DROP CONSTRAINT IF EXISTS interview_config_questions_question_id_fkey;
ALTER TABLE interview_config_questions ALTER COLUMN question_id DROP NOT NULL;
ALTER TABLE interview_config_questions ADD CONSTRAINT interview_config_questions_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES interview_question_bank(id) ON DELETE SET NULL;

-- interview_scores
ALTER TABLE interview_scores DROP CONSTRAINT IF EXISTS interview_scores_question_id_fkey;
ALTER TABLE interview_scores ALTER COLUMN question_id DROP NOT NULL;
ALTER TABLE interview_scores ADD CONSTRAINT interview_scores_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES interview_question_bank(id) ON DELETE SET NULL;

-- ===== 8. Calendar performance index =====
CREATE INDEX IF NOT EXISTS idx_ic_scheduled ON interview_configs(scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- ===== 9. Migrate interview_rounds data into interview_configs =====
INSERT INTO interview_configs (
  candidate_id, position_id, created_by, status,
  round_type, round_type_custom, round_number,
  scheduled_at, duration_minutes, location, interviewer_name,
  outcome, outcome_notes, created_at, updated_at
)
SELECT
  ir.candidate_id,
  ca.position_id,
  NULL, -- created_by unknown for old rounds
  'completed', -- Phone Screens are self-contained
  CASE
    WHEN LOWER(ir.title) LIKE '%phone%' THEN 'Phone Screen'
    WHEN LOWER(ir.title) LIKE '%technical%' THEN 'Technical'
    WHEN LOWER(ir.title) LIKE '%cultural%' THEN 'Cultural'
    WHEN LOWER(ir.title) LIKE '%final%' THEN 'Final'
    ELSE 'Other'
  END,
  CASE
    WHEN LOWER(ir.title) NOT LIKE '%phone%'
     AND LOWER(ir.title) NOT LIKE '%technical%'
     AND LOWER(ir.title) NOT LIKE '%cultural%'
     AND LOWER(ir.title) NOT LIKE '%final%'
    THEN ir.title
    ELSE NULL
  END,
  ir.round_number,
  ir.scheduled_at,
  ir.duration_minutes,
  ir.location,
  ir.interviewer_name,
  CASE
    WHEN ir.outcome = 'pass' THEN 'passed'
    WHEN ir.outcome = 'fail' THEN 'failed'
    WHEN ir.outcome = 'on-hold' THEN 'pending'
    WHEN ir.status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END,
  ir.outcome_notes,
  ir.created_at,
  COALESCE(ir.updated_at, ir.created_at)
FROM interview_rounds ir
LEFT JOIN candidates ca ON ir.candidate_id = ca.id
WHERE NOT EXISTS (
  SELECT 1 FROM interview_configs ic
  WHERE ic.candidate_id = ir.candidate_id
    AND ic.round_number = ir.round_number
);

-- Set round_type NOT NULL now that all rows have a value
ALTER TABLE interview_configs ALTER COLUMN round_type SET NOT NULL;
```

- [ ] **Step 2: Commit the migration file**

```bash
git add dashboard-server/migrations/062_interview_redesign.sql
git commit -m "feat(interview): migration 062 — interview redesign schema changes + data migration"
```

---

## Task 2: Apply migration and verify

**Files:**
- None (database operation)

- [ ] **Step 1: Apply the migration**

Run from `dashboard-server/`:
```powershell
node -e "require('dotenv').config(); const {Pool}=require('pg'); const pool=new Pool({connectionString:process.env.DATABASE_URL}); require('./migrations/runner')(pool, console.log).then(()=>pool.end())"
```
Expected: migration 062 applied, no errors.

- [ ] **Step 2: Verify hiring_decisions table exists**

```powershell
node -e "require('dotenv').config(); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='hiring_decisions' ORDER BY ordinal_position`).then(r=>{console.log(r.rows);p.end()})"
```

- [ ] **Step 3: Verify interview_configs has new columns**

```powershell
node -e "require('dotenv').config(); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='interview_configs' ORDER BY ordinal_position`).then(r=>{console.log(r.rows.map(r=>r.column_name));p.end()})"
```
Expected: includes `round_type`, `round_number`, `scheduled_at`, `duration_minutes`, `location`, `interviewer_name`, `outcome`, `outcome_notes`.

- [ ] **Step 4: Verify interview_sessions accepts 'declined' status**

```powershell
node -e "require('dotenv').config(); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query(`SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='interview_sessions'::regclass AND contype='c'`).then(r=>{console.log(r.rows);p.end()})"
```
Expected: status check includes 'declined'.

- [ ] **Step 5: Verify data migration (if interview_rounds had data)**

```powershell
node -e "require('dotenv').config(); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query(`SELECT round_type, COUNT(*)::int as cnt FROM interview_configs WHERE round_type IS NOT NULL GROUP BY round_type`).then(r=>{console.log(r.rows);p.end()})"
```

---

## Task 3: Hiring decisions API endpoints

**Files:**
- Modify: `dashboard-server/routes/interview.js` (add at end, before `return router`)

- [ ] **Step 1: Write unit test for POST /api/hiring-decisions**

Create `dashboard-server/tests/unit/hiring-decisions.test.mjs`:

```js
import { describe, test, expect, beforeEach } from 'vitest';
import { createTestUser, createTestClient, createTestCandidate, createTestHiringPosition } from '../helpers/fixtures.js';
import { mintSession } from '../helpers/auth.js';
import { truncate, pool } from '../helpers/db.js';
import app from '../../server.js';
import request from 'supertest';

describe('Hiring Decisions API', () => {
  let admin, token, client, position, candidate;

  beforeEach(async () => {
    await truncate();
    admin = await createTestUser({ role: 'admin' });
    token = await mintSession(admin.id);
    client = await createTestClient({ name: 'Test Client' });
    position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer' });
    candidate = await createTestCandidate({
      client_id: client.id,
      position_id: position.id,
      name: 'Test Candidate',
      role: 'Engineer',
      stage: 'interviews',
    });
  });

  test('POST /api/hiring-decisions creates advance decision and moves to offer', async () => {
    const res = await request(app)
      .post('/api/hiring-decisions')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'advance', notes: 'Strong candidate' });
    expect(res.status).toBe(201);
    expect(res.body.decision).toBe('advance');
    // Verify candidate moved to offer
    const { rows } = await pool.query('SELECT stage FROM candidates WHERE id = $1', [candidate.id]);
    expect(rows[0].stage).toBe('offer');
  });

  test('POST /api/hiring-decisions creates reject decision and archives', async () => {
    const res = await request(app)
      .post('/api/hiring-decisions')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'reject', rejection_category: 'skills-mismatch', notes: 'Not a fit' });
    expect(res.status).toBe(201);
    const { rows } = await pool.query('SELECT archived_at FROM candidates WHERE id = $1', [candidate.id]);
    expect(rows[0].archived_at).not.toBeNull();
  });

  test('POST /api/hiring-decisions creates hold decision with no stage change', async () => {
    const res = await request(app)
      .post('/api/hiring-decisions')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'hold', notes: 'Waiting for final round' });
    expect(res.status).toBe(201);
    const { rows } = await pool.query('SELECT stage FROM candidates WHERE id = $1', [candidate.id]);
    expect(rows[0].stage).toBe('interviews');
  });

  test('POST /api/hiring-decisions rejects missing notes', async () => {
    const res = await request(app)
      .post('/api/hiring-decisions')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'advance' });
    expect(res.status).toBe(400);
  });

  test('POST /api/hiring-decisions rejects non-admin', async () => {
    const member = await createTestUser({ role: 'member' });
    const memberToken = await mintSession(member.id);
    const res = await request(app)
      .post('/api/hiring-decisions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ candidate_id: candidate.id, decision: 'advance', notes: 'Test' });
    expect(res.status).toBe(403);
  });

  test('POST /api/hiring-decisions reject requires rejection_category', async () => {
    const res = await request(app)
      .post('/api/hiring-decisions')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'reject', notes: 'Not a fit' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('rejection_category');
  });

  test('GET /api/hiring-decisions returns decisions newest first', async () => {
    await request(app).post('/api/hiring-decisions').set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'hold', notes: 'First' });
    await request(app).post('/api/hiring-decisions').set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, decision: 'advance', notes: 'Second' });
    const res = await request(app)
      .get('/api/hiring-decisions?candidate_id=' + candidate.id)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].decision).toBe('advance');
    expect(res.body[1].decision).toBe('hold');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx vitest run tests/unit/hiring-decisions.test.mjs
```
Expected: FAIL (endpoints don't exist yet).

- [ ] **Step 3: Implement the endpoints in interview.js**

Add before `return router;` at the end of `routes/interview.js`:

```js
  // ---------- Group 6: Hiring Decisions (candidate-level) ----------

  const REJECTION_CATEGORIES = [
    'skills-mismatch', 'culture-fit', 'experience-level', 'salary-expectations',
    'better-candidate', 'position-filled', 'candidate-withdrew', 'other'
  ];

  /** POST /api/hiring-decisions — Record a candidate-level decision */
  router.post('/api/hiring-decisions', requireNBI, requireAdmin, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { candidate_id, decision, rejection_category, notes } = req.body;
    if (!candidate_id || !isValidUuid(candidate_id)) return res.status(400).json({ error: 'Valid candidate_id is required' });
    if (!['advance', 'hold', 'reject'].includes(decision)) return res.status(400).json({ error: 'decision must be advance, hold, or reject' });
    if (!notes || !notes.trim()) return res.status(400).json({ error: 'notes are required' });
    if (decision === 'reject' && !rejection_category) return res.status(400).json({ error: 'rejection_category is required for reject decisions' });

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      const { rows: candRows } = await conn.query('SELECT * FROM candidates WHERE id = $1', [candidate_id]);
      if (!candRows[0]) { await conn.query('ROLLBACK'); return res.status(404).json({ error: 'Candidate not found' }); }
      const cand = candRows[0];

      // Insert decision
      const { rows: decRows } = await conn.query(
        `INSERT INTO hiring_decisions (candidate_id, decision, rejection_category, decided_by, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [candidate_id, decision, rejection_category || null, req.user.id, notes.trim()]
      );

      // Stage side effects
      if (decision === 'advance' && cand.stage === 'interviews') {
        await conn.query(`UPDATE candidates SET stage = 'offer', updated_at = NOW() WHERE id = $1`, [candidate_id]);
        await conn.query(
          `INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, changed_by)
           VALUES ($1, $2, 'offer', $3)`,
          [candidate_id, cand.stage, req.user.id]
        );
      } else if (decision === 'reject') {
        await conn.query(
          `UPDATE candidates SET archived_at = NOW(), rejection_category = $2, updated_at = NOW() WHERE id = $1`,
          [candidate_id, rejection_category]
        );
        await conn.query(
          `INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, changed_by)
           VALUES ($1, $2, 'rejected', $3)`,
          [candidate_id, cand.stage, req.user.id]
        );
      }

      await conn.query('COMMIT');
      auditLog(req, 'hiring_decision', decRows[0].id, { decision, candidate_id });
      res.status(201).json(decRows[0]);
    } catch (e) {
      await conn.query('ROLLBACK');
      log('error', 'Interview', 'Failed to create hiring decision', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      conn.release();
    }
  });

  /** GET /api/hiring-decisions — List decisions for a candidate */
  router.get('/api/hiring-decisions', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { candidate_id } = req.query;
    if (!candidate_id || !isValidUuid(candidate_id)) return res.status(400).json({ error: 'candidate_id is required' });
    try {
      const { rows } = await pool.query(
        `SELECT hd.*, u.display_name AS decided_by_name
         FROM hiring_decisions hd
         LEFT JOIN users u ON hd.decided_by = u.id
         WHERE hd.candidate_id = $1
         ORDER BY hd.decided_at DESC`,
        [candidate_id]
      );
      res.json(rows);
    } catch (e) {
      log('error', 'Interview', 'Failed to list hiring decisions', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npx vitest run tests/unit/hiring-decisions.test.mjs
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/routes/interview.js dashboard-server/tests/unit/hiring-decisions.test.mjs
git commit -m "feat(interview): POST/GET /api/hiring-decisions — candidate-level advance/hold/reject with stage mapping"
```

---

## Task 4: Modify POST /api/interview-configs for round fields

**Files:**
- Modify: `dashboard-server/routes/interview.js:244-295` (POST handler)

- [ ] **Step 1: Write test for new round fields**

Add to `dashboard-server/tests/unit/interview-configs.test.mjs` (or create if needed — the existing file has 4 tests):

```js
test('POST /api/interview-configs accepts round_type and scheduling fields', async () => {
  const q = await createTestInterviewQuestion({ client_id: client.id });
  const res = await request(app)
    .post('/api/interview-configs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      candidate_id: candidate.id,
      position_id: position.id,
      question_ids: [q.id],
      interviewer_ids: [admin.id],
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

test('POST /api/interview-configs Phone Screen does not require questions or interviewers', async () => {
  const res = await request(app)
    .post('/api/interview-configs')
    .set('Authorization', `Bearer ${token}`)
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

test('POST /api/interview-configs scored type requires questions and interviewers', async () => {
  const res = await request(app)
    .post('/api/interview-configs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      candidate_id: candidate.id,
      round_type: 'Cultural',
    });
  expect(res.status).toBe(400);
  expect(res.body.error).toContain('question_ids');
});

test('POST /api/interview-configs auto-increments round_number per candidate', async () => {
  const q = await createTestInterviewQuestion({ client_id: client.id });
  // Round 1
  await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${token}`)
    .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Glen' });
  // Round 2
  const res = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${token}`)
    .send({ candidate_id: candidate.id, question_ids: [q.id], interviewer_ids: [admin.id], round_type: 'Technical' });
  expect(res.body.config.round_number).toBe(2);
});

test('POST /api/interview-configs rejects Phone Screen with interviewer_ids', async () => {
  const res = await request(app)
    .post('/api/interview-configs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      candidate_id: candidate.id,
      round_type: 'Phone Screen',
      interviewer_ids: [admin.id],
    });
  expect(res.status).toBe(400);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npx vitest run tests/unit/interview-configs.test.mjs
```

- [ ] **Step 3: Rewrite the POST handler**

Replace the existing POST handler (starting at `router.post('/api/interview-configs'`) with:

```js
  const ROUND_TYPES = ['Phone Screen', 'Technical', 'Cultural', 'Final', 'Other'];

  /** POST /api/interview-configs — Create a round (config + optional questions + sessions) */
  router.post('/api/interview-configs', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { candidate_id, position_id, question_ids, interviewer_ids, round_type, round_type_custom,
            scheduled_at, duration_minutes, location, interviewer_name } = req.body;

    if (!candidate_id || !isValidUuid(candidate_id)) return res.status(400).json({ error: 'Valid candidate_id is required' });
    if (position_id && !isValidUuid(position_id)) return res.status(400).json({ error: 'Invalid position_id' });

    const rt = round_type || 'Technical';
    if (!ROUND_TYPES.includes(rt)) return res.status(400).json({ error: `round_type must be one of: ${ROUND_TYPES.join(', ')}` });
    if (rt === 'Other' && (!round_type_custom || !round_type_custom.trim())) return res.status(400).json({ error: 'round_type_custom is required when round_type is Other' });
    if (rt === 'Other' && round_type_custom.trim().length > 40) return res.status(400).json({ error: 'round_type_custom must be 40 characters or fewer' });

    const isPhoneScreen = rt === 'Phone Screen';

    if (isPhoneScreen && interviewer_ids && interviewer_ids.length > 0) {
      return res.status(400).json({ error: 'Phone Screen does not support scored interviewers. Use interviewer_name instead.' });
    }

    if (!isPhoneScreen) {
      if (!Array.isArray(question_ids) || question_ids.length === 0) return res.status(400).json({ error: 'question_ids must be a non-empty array for scored round types' });
      if (!Array.isArray(interviewer_ids) || interviewer_ids.length === 0) return res.status(400).json({ error: 'interviewer_ids must be a non-empty array for scored round types' });
      for (const qid of question_ids) { if (!isValidUuid(qid)) return res.status(400).json({ error: `Invalid question_id: ${qid}` }); }
      for (const iid of interviewer_ids) { if (!isValidUuid(iid)) return res.status(400).json({ error: `Invalid interviewer_id: ${iid}` }); }
    }

    if (duration_minutes !== undefined) {
      const dur = parseInt(duration_minutes);
      if (isNaN(dur) || dur < 5 || dur > 480) return res.status(400).json({ error: 'duration_minutes must be between 5 and 480' });
    }

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');

      // Lock candidate row for round_number concurrency safety
      await conn.query('SELECT id FROM candidates WHERE id = $1 FOR UPDATE', [candidate_id]);

      // Auto-increment round_number
      const { rows: rnRows } = await conn.query(
        'SELECT COALESCE(MAX(round_number), 0) AS max_rn FROM interview_configs WHERE candidate_id = $1',
        [candidate_id]
      );
      const nextRoundNumber = rnRows[0].max_rn + 1;

      // Resolve position_id from candidate if not provided
      let resolvedPositionId = position_id || null;
      if (!resolvedPositionId) {
        const { rows: candRows } = await conn.query('SELECT position_id FROM candidates WHERE id = $1', [candidate_id]);
        resolvedPositionId = candRows[0]?.position_id || null;
      }

      const configStatus = isPhoneScreen ? 'completed' : 'draft';

      const { rows: configRows } = await conn.query(
        `INSERT INTO interview_configs (candidate_id, position_id, created_by, status,
         round_type, round_type_custom, round_number, scheduled_at, duration_minutes, location, interviewer_name, outcome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending') RETURNING *`,
        [candidate_id, resolvedPositionId, req.user.id, configStatus,
         rt, rt === 'Other' ? round_type_custom.trim() : null, nextRoundNumber,
         scheduled_at || null, duration_minutes || 60, location || null, interviewer_name || null]
      );
      const config = configRows[0];

      // Attach questions (scored types only)
      const questions = [];
      if (!isPhoneScreen && question_ids) {
        for (let idx = 0; idx < question_ids.length; idx++) {
          const { rows } = await conn.query(
            `INSERT INTO interview_config_questions (config_id, question_id, sort_order) VALUES ($1, $2, $3) RETURNING *`,
            [config.id, question_ids[idx], idx]
          );
          questions.push(rows[0]);
        }
      }

      // Create sessions (scored types only)
      const sessions = [];
      if (!isPhoneScreen && interviewer_ids) {
        for (const iid of interviewer_ids) {
          const { rows } = await conn.query(
            `INSERT INTO interview_sessions (config_id, interviewer_id, status) VALUES ($1, $2, 'assigned') RETURNING *`,
            [config.id, iid]
          );
          sessions.push(rows[0]);
        }
      }

      await conn.query('COMMIT');
      res.status(201).json({ config, questions, sessions });
    } catch (e) {
      await conn.query('ROLLBACK');
      log('error', 'Interview', 'Failed to create config', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      conn.release();
    }
  });
```

- [ ] **Step 4: Run tests**

```powershell
npx vitest run tests/unit/interview-configs.test.mjs
```
Expected: all tests pass (both old and new).

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/routes/interview.js dashboard-server/tests/unit/interview-configs.test.mjs
git commit -m "feat(interview): POST /api/interview-configs — round_type, scheduling fields, Phone Screen support, FOR UPDATE lock"
```

---

## Task 5: PATCH /api/interview-configs/:id

**Files:**
- Modify: `dashboard-server/routes/interview.js` (add after clone endpoint)

- [ ] **Step 1: Write tests**

Add to `interview-configs.test.mjs`:

```js
test('PATCH /api/interview-configs/:id updates schedule fields', async () => {
  const create = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${token}`)
    .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Glen' });
  const configId = create.body.config.id;
  const res = await request(app)
    .patch('/api/interview-configs/' + configId)
    .set('Authorization', `Bearer ${token}`)
    .set('If-Match', create.body.config.updated_at)
    .send({ scheduled_at: '2026-06-15T14:00:00Z', location: 'Zoom' });
  expect(res.status).toBe(200);
  expect(res.body.location).toBe('Zoom');
});

test('PATCH /api/interview-configs/:id returns 409 on stale If-Match', async () => {
  const create = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${token}`)
    .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Glen' });
  const configId = create.body.config.id;
  const res = await request(app)
    .patch('/api/interview-configs/' + configId)
    .set('Authorization', `Bearer ${token}`)
    .set('If-Match', '2020-01-01T00:00:00.000Z')
    .send({ location: 'Office' });
  expect(res.status).toBe(409);
});

test('PATCH /api/interview-configs/:id updates outcome', async () => {
  const create = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${token}`)
    .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Glen' });
  const res = await request(app)
    .patch('/api/interview-configs/' + create.body.config.id)
    .set('Authorization', `Bearer ${token}`)
    .set('If-Match', create.body.config.updated_at)
    .send({ outcome: 'passed' });
  expect(res.status).toBe(200);
  expect(res.body.outcome).toBe('passed');
});
```

- [ ] **Step 2: Implement PATCH endpoint**

Add in `routes/interview.js` after the clone endpoint:

```js
  const ROUND_OUTCOMES = ['pending', 'passed', 'failed', 'rescheduled', 'no_show', 'cancelled'];

  /** PATCH /api/interview-configs/:id — Edit round schedule/outcome */
  router.patch('/api/interview-configs/:id', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid config ID' });

    const allowed = ['scheduled_at', 'duration_minutes', 'location', 'outcome', 'outcome_notes', 'interviewer_name'];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'outcome' && !ROUND_OUTCOMES.includes(req.body[key])) {
          return res.status(400).json({ error: `outcome must be one of: ${ROUND_OUTCOMES.join(', ')}` });
        }
        if (key === 'duration_minutes') {
          const dur = parseInt(req.body[key]);
          if (isNaN(dur) || dur < 5 || dur > 480) return res.status(400).json({ error: 'duration_minutes must be between 5 and 480' });
        }
        sets.push(`${key} = $${i++}`);
        vals.push(req.body[key]);
      }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    sets.push(`updated_at = NOW()`);

    // Optimistic concurrency via If-Match
    const ifMatch = req.headers['if-match'];
    let concurrencyClause = '';
    if (ifMatch) {
      vals.push(ifMatch);
      concurrencyClause = ` AND updated_at = $${i++}`;
    }

    vals.push(req.params.id);
    try {
      const { rows } = await pool.query(
        `UPDATE interview_configs SET ${sets.join(', ')} WHERE id = $${i}${concurrencyClause} RETURNING *`,
        vals
      );
      if (!rows[0]) {
        if (ifMatch) return res.status(409).json({ error: 'Conflict — the round was modified since you loaded it. Please refresh and try again.' });
        return res.status(404).json({ error: 'Config not found' });
      }
      auditLog(req, 'interview_config_update', req.params.id, { fields: Object.keys(req.body).filter(k => allowed.includes(k)) });
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Interview', 'Failed to update config', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 3: Run tests**

```powershell
npx vitest run tests/unit/interview-configs.test.mjs
```

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/routes/interview.js dashboard-server/tests/unit/interview-configs.test.mjs
git commit -m "feat(interview): PATCH /api/interview-configs/:id — edit schedule, outcome, optimistic concurrency"
```

---

## Task 6: DELETE /api/interview-configs/:id

**Files:**
- Modify: `dashboard-server/routes/interview.js`

- [ ] **Step 1: Write test**

```js
test('DELETE /api/interview-configs/:id admin deletes round with cascade', async () => {
  const create = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${token}`)
    .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Glen' });
  const res = await request(app)
    .delete('/api/interview-configs/' + create.body.config.id)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.deleted).toBe(true);
  // Verify gone
  const { rows } = await pool.query('SELECT id FROM interview_configs WHERE id = $1', [create.body.config.id]);
  expect(rows).toHaveLength(0);
});

test('DELETE /api/interview-configs/:id non-admin gets 403', async () => {
  const member = await createTestUser({ role: 'member' });
  const memberToken = await mintSession(member.id);
  const create = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${token}`)
    .send({ candidate_id: candidate.id, round_type: 'Phone Screen', interviewer_name: 'Glen' });
  const res = await request(app)
    .delete('/api/interview-configs/' + create.body.config.id)
    .set('Authorization', `Bearer ${memberToken}`);
  expect(res.status).toBe(403);
});
```

- [ ] **Step 2: Implement DELETE endpoint**

```js
  /** DELETE /api/interview-configs/:id — Admin only, cascading delete */
  router.delete('/api/interview-configs/:id', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid config ID' });
    try {
      // Count scores before delete for audit
      const { rows: scoreCount } = await pool.query(
        `SELECT COUNT(*)::int AS count FROM interview_scores
         WHERE session_id IN (SELECT id FROM interview_sessions WHERE config_id = $1)`,
        [req.params.id]
      );
      const scoresRemoved = scoreCount[0].count;

      const { rowCount } = await pool.query('DELETE FROM interview_configs WHERE id = $1', [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Config not found' });

      auditLog(req, 'interview_config_delete', req.params.id, { scores_removed: scoresRemoved });
      res.json({ deleted: true, scores_removed: scoresRemoved });
    } catch (e) {
      log('error', 'Interview', 'Failed to delete config', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 3: Run tests and commit**

```powershell
npx vitest run tests/unit/interview-configs.test.mjs
```

```bash
git add dashboard-server/routes/interview.js dashboard-server/tests/unit/interview-configs.test.mjs
git commit -m "feat(interview): DELETE /api/interview-configs/:id — admin-only cascade delete with audit trail"
```

---

## Task 7: GET /api/interview-configs with include=progress

**Files:**
- Modify: `dashboard-server/routes/interview.js:210-241` (GET handler)

- [ ] **Step 1: Write test**

```js
test('GET /api/interview-configs?include=progress returns session progress', async () => {
  const q = await createTestInterviewQuestion({ client_id: client.id });
  const create = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${token}`)
    .send({ candidate_id: candidate.id, question_ids: [q.id], interviewer_ids: [admin.id], round_type: 'Technical' });
  const res = await request(app)
    .get('/api/interview-configs?candidate_id=' + candidate.id + '&include=progress')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body[0].sessions).toBeDefined();
  expect(res.body[0].sessions[0].interviewer_name).toBeDefined();
  expect(res.body[0].round_number).toBe(1);
});
```

- [ ] **Step 2: Modify GET handler to support include=progress and round_number ordering**

Update the GET query to include the new columns and optional progress data. When `include=progress`, add lateral join for session-level progress:

```js
  router.get('/api/interview-configs', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { candidate_id } = req.query;
    const includeProgress = req.query.include === 'progress';
    const where = [];
    const vals = [];
    let i = 1;
    if (candidate_id) {
      if (!isValidUuid(candidate_id)) return res.status(400).json({ error: 'Invalid candidate_id' });
      where.push(`ic.candidate_id = $${i++}`); vals.push(candidate_id);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    try {
      const { rows } = await pool.query(`
        SELECT ic.*, ca.name AS candidate_name, ca.role AS candidate_role,
               hp.title AS position_title, hp.client_id AS position_client_id,
               hp.discipline AS position_discipline,
               cl.name AS client_name, u.display_name AS created_by_name,
               (SELECT COUNT(*)::int FROM interview_config_questions cq WHERE cq.config_id = ic.id) AS question_count,
               (SELECT COUNT(*)::int FROM interview_sessions s WHERE s.config_id = ic.id) AS session_count
        FROM interview_configs ic
        LEFT JOIN candidates ca ON ic.candidate_id = ca.id
        LEFT JOIN hiring_positions hp ON ic.position_id = hp.id
        LEFT JOIN clients cl ON hp.client_id = cl.id
        LEFT JOIN users u ON ic.created_by = u.id
        ${whereClause}
        ORDER BY ic.round_number ASC NULLS LAST, ic.created_at ASC
      `, vals);

      if (includeProgress && rows.length > 0) {
        const configIds = rows.map(r => r.id);
        const { rows: sessRows } = await pool.query(`
          SELECT s.config_id, s.id AS session_id, s.status, s.interviewer_id,
                 u.display_name AS interviewer_name,
                 (SELECT COUNT(*)::int FROM interview_scores sc WHERE sc.session_id = s.id) AS scored_count
          FROM interview_sessions s
          LEFT JOIN users u ON s.interviewer_id = u.id
          WHERE s.config_id = ANY($1)
          ORDER BY s.config_id, s.id
        `, [configIds]);

        const { rows: scoreRows } = await pool.query(`
          SELECT s.config_id, AVG(sc.score)::numeric(3,1) AS avg_score
          FROM interview_scores sc
          JOIN interview_sessions s ON sc.session_id = s.id
          WHERE s.config_id = ANY($1)
          GROUP BY s.config_id
        `, [configIds]);

        const sessMap = {};
        for (const s of sessRows) {
          if (!sessMap[s.config_id]) sessMap[s.config_id] = [];
          sessMap[s.config_id].push(s);
        }
        const scoreMap = {};
        for (const s of scoreRows) scoreMap[s.config_id] = parseFloat(s.avg_score);

        for (const row of rows) {
          row.sessions = sessMap[row.id] || [];
          row.aggregate_score = scoreMap[row.id] || null;
        }
      }

      res.json(rows);
    } catch (e) {
      log('error', 'Interview', 'Failed to list configs', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 3: Run tests and commit**

```powershell
npx vitest run tests/unit/interview-configs.test.mjs
```

```bash
git add dashboard-server/routes/interview.js dashboard-server/tests/unit/interview-configs.test.mjs
git commit -m "feat(interview): GET /api/interview-configs — round_number ordering, include=progress for session-level data"
```

---

## Task 8: Audit trail on score upserts

**Files:**
- Modify: `dashboard-server/routes/interview.js` (PUT /api/interview-scores handler)

- [ ] **Step 1: Find and update the score upsert**

In the existing `PUT /api/interview-scores/:session_id/:question_id` handler, modify the INSERT ... ON CONFLICT to set `updated_at = NOW()` on update, and add `auditLog` after the upsert:

Change the existing query from:
```sql
INSERT INTO interview_scores (session_id, question_id, score, notes)
VALUES ($1, $2, $3, $4)
ON CONFLICT (session_id, question_id) DO UPDATE SET score = $3, notes = $4, scored_at = NOW()
```
To:
```sql
INSERT INTO interview_scores (session_id, question_id, score, notes, created_at, updated_at)
VALUES ($1, $2, $3, $4, NOW(), NOW())
ON CONFLICT (session_id, question_id) DO UPDATE SET score = $3, notes = $4, scored_at = NOW(), updated_at = NOW()
```

Add after the successful upsert:
```js
auditLog(req, 'interview_score', result.rows[0].id, { session_id: req.params.session_id, question_id: req.params.question_id, score });
```

- [ ] **Step 2: Run existing scoring tests to confirm no regression**

```powershell
npx vitest run tests/unit/interview-scoring.test.mjs
```

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/routes/interview.js
git commit -m "feat(interview): audit trail on score upserts — updated_at + auditLog"
```

---

## Task 9: Blind scoring gate on results + session decline

**Files:**
- Modify: `dashboard-server/routes/interview.js` (GET /api/interview-results and session endpoints)

- [ ] **Step 1: Write test for blind scoring gate**

```js
test('GET /api/interview-results rejects interviewer who has not submitted', async () => {
  // Create config with two interviewers
  const q = await createTestInterviewQuestion({ client_id: client.id });
  const interviewer = await createTestUser({ role: 'member' });
  const interviewerToken = await mintSession(interviewer.id);
  const create = await request(app).post('/api/interview-configs').set('Authorization', `Bearer ${token}`)
    .send({ candidate_id: candidate.id, question_ids: [q.id], interviewer_ids: [interviewer.id], round_type: 'Technical' });
  await request(app).post('/api/interview-configs/' + create.body.config.id + '/activate').set('Authorization', `Bearer ${token}`);

  // Interviewer tries to view results before submitting
  const res = await request(app)
    .get('/api/interview-results/' + create.body.config.id)
    .set('Authorization', `Bearer ${interviewerToken}`);
  expect(res.status).toBe(403);
  expect(res.body.error).toContain('submit your scorecard');
});
```

- [ ] **Step 2: Modify GET /api/interview-results to enforce blind scoring**

In the existing `GET /api/interview-results/:config_id` handler, after checking `requireAdmin`, add a blind scoring check for non-admin users:

```js
    // Blind scoring: non-admin interviewers must submit their own scorecard first
    if (req.user.role !== 'admin') {
      const { rows: mySession } = await pool.query(
        `SELECT status FROM interview_sessions WHERE config_id = $1 AND interviewer_id = $2`,
        [req.params.config_id, req.user.id]
      );
      if (mySession.length > 0 && mySession[0].status !== 'submitted') {
        return res.status(403).json({ error: 'Please submit your scorecard before viewing results.' });
      }
    }
```

Note: this means changing the endpoint from `requireAdmin` to `requireNBI` with the blind-scoring check replacing the admin gate.

- [ ] **Step 3: Add session decline endpoint**

Add a new endpoint for declining a session:

```js
  /** POST /api/interview-sessions/:id/decline — Interviewer declines assignment */
  router.post('/api/interview-sessions/:id/decline', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid session ID' });
    try {
      const { rows } = await pool.query(
        `UPDATE interview_sessions SET status = 'declined' WHERE id = $1 AND interviewer_id = $2 AND status = 'assigned' RETURNING *`,
        [req.params.id, req.user.id]
      );
      if (!rows[0]) return res.status(400).json({ error: 'Session not found or cannot be declined (must be assigned to you)' });
      auditLog(req, 'interview_session_decline', req.params.id, {});
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Interview', 'Failed to decline session', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 4: Update submit endpoint to exclude declined sessions from the "all scored" check**

In the existing `POST /api/interview-sessions/:id/submit` handler, change the pending sessions check from:
```sql
SELECT COUNT(*)::int AS count FROM interview_sessions WHERE config_id = $1 AND status != 'submitted'
```
To:
```sql
SELECT COUNT(*)::int AS count FROM interview_sessions WHERE config_id = $1 AND status NOT IN ('submitted', 'declined')
```

- [ ] **Step 5: Run tests and commit**

```powershell
npx vitest run tests/unit/interview-scoring.test.mjs
```

```bash
git add dashboard-server/routes/interview.js dashboard-server/tests/unit/interview-scoring.test.mjs
git commit -m "feat(interview): blind scoring gate on results + session decline + exclude declined from completion check"
```

---

## Task 10: Update clone endpoint

**Files:**
- Modify: `dashboard-server/routes/interview.js` (clone handler)

- [ ] **Step 1: Update clone to copy round_type and interviewer panel**

In the existing clone handler, change the INSERT to include new fields:

```js
      const { rows: newRows } = await conn.query(
        `INSERT INTO interview_configs (candidate_id, position_id, created_by, status,
         round_type, round_type_custom, round_number, duration_minutes)
         VALUES ($1, $2, $3, 'draft', $4, $5,
           (SELECT COALESCE(MAX(round_number), 0) + 1 FROM interview_configs WHERE candidate_id = $1),
           $6) RETURNING *`,
        [candidate_id, orig.position_id, req.user.id,
         orig.round_type || 'Technical', orig.round_type_custom, orig.duration_minutes || 60]
      );
```

After cloning questions, also clone interviewer sessions:

```js
      // Clone interviewer sessions from original
      const { rows: origSessions } = await conn.query(
        `SELECT interviewer_id FROM interview_sessions WHERE config_id = $1`,
        [req.params.id]
      );
      const sessions = [];
      for (const os of origSessions) {
        const { rows } = await conn.query(
          `INSERT INTO interview_sessions (config_id, interviewer_id, status) VALUES ($1, $2, 'assigned') RETURNING *`,
          [newConfig.id, os.interviewer_id]
        );
        sessions.push(rows[0]);
      }
```

Update the response to include sessions:
```js
      res.status(201).json({ config: newConfig, questions, sessions });
```

- [ ] **Step 2: Run tests and commit**

```powershell
npx vitest run tests/unit/interview-configs.test.mjs
```

```bash
git add dashboard-server/routes/interview.js
git commit -m "feat(interview): clone endpoint copies round_type, duration, and interviewer panel"
```

---

## Task 11: Retire old interview_rounds endpoints

**Files:**
- Modify: `dashboard-server/routes/hiring.js` (lines 1084-1275)
- Modify: `dashboard-server/routes/interview-rounds.js` (entire file)

- [ ] **Step 1: Replace interview_rounds routes in hiring.js**

Find the section starting with `/** GET /api/interview-rounds` (around line 1084) through `DELETE /api/interview-rounds/:id` (around line 1275). Replace the entire block with:

```js
  // ---------- RETIRED: interview_rounds routes (replaced by interview_configs) ----------
  const retiredMsg = { error: 'This endpoint has been retired. Use /api/interview-configs instead.' };
  router.get('/api/interview-rounds', (req, res) => { log('warn', 'Hiring', 'Retired endpoint hit: GET /api/interview-rounds'); res.status(410).json(retiredMsg); });
  router.get('/api/interview-rounds/check-conflict', (req, res) => { log('warn', 'Hiring', 'Retired endpoint hit: GET /api/interview-rounds/check-conflict'); res.status(410).json(retiredMsg); });
  router.post('/api/interview-rounds', (req, res) => { log('warn', 'Hiring', 'Retired endpoint hit: POST /api/interview-rounds'); res.status(410).json(retiredMsg); });
  router.patch('/api/interview-rounds/:id', (req, res) => { log('warn', 'Hiring', 'Retired endpoint hit: PATCH /api/interview-rounds/:id'); res.status(410).json(retiredMsg); });
  router.delete('/api/interview-rounds/:id', (req, res) => { log('warn', 'Hiring', 'Retired endpoint hit: DELETE /api/interview-rounds/:id'); res.status(410).json(retiredMsg); });
```

- [ ] **Step 2: Replace interview-rounds.js routes**

Replace the entire route registration in `routes/interview-rounds.js` with 410 handlers for all its routes:

```js
'use strict';
module.exports = function (ctx) {
  const router = require('express').Router();
  const { log } = ctx;
  const retiredMsg = { error: 'This endpoint has been retired. Use /api/interview-configs instead.' };
  const warn = (method, path) => { log('warn', 'Hiring', `Retired endpoint hit: ${method} ${path}`); };

  router.get('/api/candidates/:id/interviews', (req, res) => { warn('GET', req.path); res.status(410).json(retiredMsg); });
  router.post('/api/candidates/:id/interviews', (req, res) => { warn('POST', req.path); res.status(410).json(retiredMsg); });
  router.patch('/api/candidates/:id/interviews/:roundId', (req, res) => { warn('PATCH', req.path); res.status(410).json(retiredMsg); });
  router.delete('/api/candidates/:id/interviews/:roundId', (req, res) => { warn('DELETE', req.path); res.status(410).json(retiredMsg); });
  router.get('/api/candidates/:id/interviews/:roundId/scorecards', (req, res) => { warn('GET', req.path); res.status(410).json(retiredMsg); });
  router.post('/api/candidates/:id/interviews/:roundId/scorecards', (req, res) => { warn('POST', req.path); res.status(410).json(retiredMsg); });
  router.patch('/api/candidates/:id/interviews/:roundId/scorecards/:scId', (req, res) => { warn('PATCH', req.path); res.status(410).json(retiredMsg); });
  router.post('/api/candidates/:id/interviews/:roundId/scorecards/:scId/submit', (req, res) => { warn('POST', req.path); res.status(410).json(retiredMsg); });

  return router;
};
```

- [ ] **Step 3: Run full test suite to check for breakage**

```powershell
npm test
```

Note: `interview-management.test.mjs` tests the old round/scorecard endpoints and will now get 410s. These tests need updating — change expected status codes from 200/201 to 410 for any test that hits the retired endpoints, or remove those tests entirely.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/routes/hiring.js dashboard-server/routes/interview-rounds.js
git commit -m "feat(interview): retire all /api/interview-rounds and /api/candidates/:id/interviews endpoints — 410 Gone"
```

---

## Task 12: Update test fixtures

**Files:**
- Modify: `dashboard-server/tests/helpers/fixtures.js`

- [ ] **Step 1: Update createTestInterviewConfig to accept round fields**

In `fixtures.js`, update `createTestInterviewConfig` to accept and insert the new columns:

```js
async function createTestInterviewConfig(opts = {}) {
  if (!opts.candidate_id) throw new Error('createTestInterviewConfig: candidate_id required');

  const roundType = opts.round_type || 'Technical';
  const status = opts.status || (roundType === 'Phone Screen' ? 'completed' : 'draft');

  // Lock candidate for round_number
  await pool.query('SELECT id FROM candidates WHERE id = $1 FOR UPDATE', [opts.candidate_id]);
  const { rows: rnRows } = await pool.query(
    'SELECT COALESCE(MAX(round_number), 0) AS max_rn FROM interview_configs WHERE candidate_id = $1',
    [opts.candidate_id]
  );

  const { rows: configRows } = await pool.query(
    `INSERT INTO interview_configs (candidate_id, position_id, created_by, status,
     round_type, round_type_custom, round_number, scheduled_at, duration_minutes, location, interviewer_name, outcome)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [opts.candidate_id, opts.position_id || null, opts.created_by || null, status,
     roundType, opts.round_type_custom || null, rnRows[0].max_rn + 1,
     opts.scheduled_at || null, opts.duration_minutes || 60, opts.location || null,
     opts.interviewer_name || null, opts.outcome || 'pending']
  );
  const config = configRows[0];

  // ... rest of question/session creation unchanged ...
```

- [ ] **Step 2: Run full test suite**

```powershell
npm test
```

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/tests/helpers/fixtures.js
git commit -m "feat(interview): update test fixtures for round-based interview configs"
```

---

## Task 13: Final verification — full test suite + PM2 restart

- [ ] **Step 1: Run full unit test suite**

```powershell
npm test
```

All interview-related tests should pass. Pre-existing failures in documents/import-hierarchy are acceptable.

- [ ] **Step 2: Restart PM2**

```powershell
pm2 restart nbi-dashboard
```

- [ ] **Step 3: Verify migration applied on production DB**

Open http://localhost:8888/nbi_project_dashboard.html and confirm the dashboard loads without errors. The frontend still uses old endpoints which now return 410 — the interview section on candidate cards will stop showing rounds (expected — this is addressed in Phase B).

- [ ] **Step 4: Commit any remaining changes and update session log**

```bash
git add -A
git commit -m "feat(interview): Phase A complete — DB migration + API for unified round-based interview system"
```

---

## Summary — What Phase A delivers

After this phase:
- `hiring_decisions` table exists with POST/GET endpoints
- `interview_configs` has all round/scheduling fields with proper constraints
- `interview_rounds` data is migrated into `interview_configs`
- POST creates rounds with type-driven validation (Phone Screen vs scored)
- PATCH edits schedule/outcome with optimistic concurrency
- DELETE cascade with audit trail
- Blind scoring gate on results
- Session decline flow
- Audit trail on score changes
- All old endpoints return 410 Gone
- Test fixtures updated for round-based configs

**Next:** Phase B — Frontend candidate detail panel (unified round cards, decision bar, blind scoring UI)
