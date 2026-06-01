# Interview Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured interview tool to the WorkSage hiring page — question bank management, interviewer scoring, and results aggregation with decision tracking.

**Architecture:** Extends the existing hiring kanban with 6 new database tables, ~15 API endpoints in server.js, a new `interview.js` frontend module for the focused interview mode, and additions to the existing `hiring.js` for the configure/results views. AI question generation via the Anthropic SDK (new dependency).

**Tech Stack:** Express 4, PostgreSQL (pg), Vitest + supertest, Playwright, @anthropic-ai/sdk, existing sendEmailAsync email infrastructure.

**Codebase:** `d:\OneDrive\Claude_code\nbi-modularise\dashboard-server\` (server), `d:\OneDrive\Claude_code\nbi-modularise\dashboard-server\public\js\views\` (frontend modules), `d:\OneDrive\Claude_code\nbi-modularise\nbi_project_dashboard.html` (SPA shell).

**Spec:** `d:\OneDrive\Claude_code\NBIAI_TEAM\docs\superpowers\specs\2026-06-01-interview-tool-design.md`

---

## File Map

### New Files

| File | Responsibility |
|---|---|
| `dashboard-server/migrations/032_interview_tool.sql` | Schema: 6 new tables with indices, FKs, constraints |
| `dashboard-server/tests/unit/interview-questions.test.mjs` | Unit tests: question bank CRUD + AI generation endpoint |
| `dashboard-server/tests/unit/interview-configs.test.mjs` | Unit tests: config CRUD, activation, cloning, session creation |
| `dashboard-server/tests/unit/interview-scoring.test.mjs` | Unit tests: score upsert, session submit, results aggregation, decisions |
| `dashboard-server/public/js/views/interview.js` | Frontend: focused interview mode (full-page scoring view) |
| `dashboard-server/lib/interview-questions-prompt.js` | AI prompt builder for question generation |

### Modified Files

| File | Changes |
|---|---|
| `dashboard-server/server.js` | Add ~15 API endpoints (question bank, configs, sessions, scores, results, decisions) |
| `dashboard-server/public/js/views/hiring.js` | Add "Configure Interview" button, question picker UI, results view, interviewer assignment |
| `dashboard-server/public/js/app.js` | Import the new `interview.js` module |
| `dashboard-server/tests/helpers/fixtures.js` | Add factory functions for interview test data |
| `dashboard-server/package.json` | Add `@anthropic-ai/sdk` dependency |

---

## Task 1: Database Migration

Create the schema for all 6 interview tables.

**Files:**
- Create: `dashboard-server/migrations/032_interview_tool.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 032_interview_tool.sql
-- Interview Tool: question bank, configs, sessions, scores, decisions

-- ===== QUESTION BANK =====
CREATE TABLE IF NOT EXISTS interview_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  discipline TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('culture', 'technical', 'collaboration', 'leadership', 'depth')),
  question_text TEXT NOT NULL,
  depth_type TEXT CHECK (depth_type IN ('code', 'art_style', 'narrative', NULL)),
  source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('ai_generated', 'custom', 'curated')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_iqb_client_discipline ON interview_question_bank(client_id, discipline);
CREATE INDEX IF NOT EXISTS idx_iqb_client_category ON interview_question_bank(client_id, category);

-- ===== INTERVIEW CONFIGS =====
CREATE TABLE IF NOT EXISTS interview_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  position_id UUID REFERENCES hiring_positions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ic_candidate ON interview_configs(candidate_id);

-- ===== CONFIG <-> QUESTIONS JUNCTION =====
CREATE TABLE IF NOT EXISTS interview_config_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES interview_configs(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_question_bank(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_icq_config_sort ON interview_config_questions(config_id, sort_order);

-- ===== INTERVIEW SESSIONS =====
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES interview_configs(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'submitted')),
  notified_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_is_config ON interview_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_is_interviewer ON interview_sessions(interviewer_id);

-- ===== SCORES =====
CREATE TABLE IF NOT EXISTS interview_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_question_bank(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  notes TEXT,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_isc_session ON interview_scores(session_id);

-- ===== DECISIONS =====
CREATE TABLE IF NOT EXISTS interview_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL UNIQUE REFERENCES interview_configs(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('advance', 'reject', 'hold')),
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Apply the migration locally and verify**

Run:
```bash
cd dashboard-server && node migrations/runner.js
```
Expected: migration 032 applied successfully. Then verify tables exist:
```bash
psql $DATABASE_URL -c "\dt interview_*"
```
Expected: 6 tables listed.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/migrations/032_interview_tool.sql
git commit -m "feat(interview): add database schema — 6 tables for question bank, configs, sessions, scores, decisions"
```

---

## Task 2: Test Fixtures

Add factory functions for creating interview test data.

**Files:**
- Modify: `dashboard-server/tests/helpers/fixtures.js`

- [ ] **Step 1: Read the existing fixtures file end to find the module.exports**

Run: read the last 20 lines of `dashboard-server/tests/helpers/fixtures.js` to find the exports block.

- [ ] **Step 2: Add interview fixture factories before the module.exports**

Add these functions before the `module.exports` line:

```javascript
/**
 * Create a hiring_positions row for interview testing.
 */
async function createTestHiringPosition(opts = {}) {
  const title = opts.title || uniq('TestPosition');
  const { rows } = await pool.query(
    `INSERT INTO hiring_positions (client_id, title, description, seniority, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [opts.client_id || null, title, opts.description || '', opts.seniority || 'mid', opts.status || 'open']
  );
  return rows[0];
}

/**
 * Create an interview_question_bank row.
 */
async function createTestInterviewQuestion(opts = {}) {
  const { rows } = await pool.query(
    `INSERT INTO interview_question_bank (client_id, discipline, category, question_text, depth_type, source, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      opts.client_id || null,
      opts.discipline || 'Engineering',
      opts.category || 'technical',
      opts.question_text || uniq('Test interview question'),
      opts.depth_type || null,
      opts.source || 'custom',
      opts.created_by || null,
    ]
  );
  return rows[0];
}

/**
 * Create an interview_configs row with optional questions and sessions.
 * Returns { config, questions: [...], sessions: [...] }.
 */
async function createTestInterviewConfig(opts = {}) {
  if (!opts.candidate_id) throw new Error('createTestInterviewConfig: candidate_id required');

  const { rows: configRows } = await pool.query(
    `INSERT INTO interview_configs (candidate_id, position_id, created_by, status)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [opts.candidate_id, opts.position_id || null, opts.created_by || null, opts.status || 'draft']
  );
  const config = configRows[0];

  const questions = [];
  if (opts.question_ids && opts.question_ids.length > 0) {
    for (let i = 0; i < opts.question_ids.length; i++) {
      const { rows } = await pool.query(
        `INSERT INTO interview_config_questions (config_id, question_id, sort_order)
         VALUES ($1, $2, $3) RETURNING *`,
        [config.id, opts.question_ids[i], i]
      );
      questions.push(rows[0]);
    }
  }

  const sessions = [];
  if (opts.interviewer_ids && opts.interviewer_ids.length > 0) {
    for (const iid of opts.interviewer_ids) {
      const { rows } = await pool.query(
        `INSERT INTO interview_sessions (config_id, interviewer_id, status)
         VALUES ($1, $2, $3) RETURNING *`,
        [config.id, iid, 'assigned']
      );
      sessions.push(rows[0]);
    }
  }

  return { config, questions, sessions };
}
```

- [ ] **Step 3: Add the new factories to module.exports**

Add `createTestHiringPosition`, `createTestInterviewQuestion`, and `createTestInterviewConfig` to the existing `module.exports` object.

- [ ] **Step 4: Add interview tables to the TRUNCATE_TABLES array in db.js**

Open `dashboard-server/tests/helpers/db.js` and add these tables to the `TRUNCATE_TABLES` array (order matters for FK cascading — children first):

```javascript
'interview_decisions',
'interview_scores',
'interview_sessions',
'interview_config_questions',
'interview_configs',
'interview_question_bank',
```

- [ ] **Step 5: Verify test DB can truncate cleanly**

Run:
```bash
cd dashboard-server && npx vitest run tests/unit/smoke.test.mjs
```
Expected: PASS — confirms the truncate list is valid.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/tests/helpers/fixtures.js dashboard-server/tests/helpers/db.js
git commit -m "test(interview): add fixture factories and truncate tables for interview tool"
```

---

## Task 3: Question Bank API + Tests

CRUD endpoints for the interview question bank.

**Files:**
- Modify: `dashboard-server/server.js` (add endpoints after the hiring section, around line 7366)
- Create: `dashboard-server/tests/unit/interview-questions.test.mjs`

- [ ] **Step 1: Write failing tests for GET /api/interview-questions**

Create `dashboard-server/tests/unit/interview-questions.test.mjs`:

```javascript
// dashboard-server/tests/unit/interview-questions.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser, createTestClient, createTestInterviewQuestion,
} = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('GET /api/interview-questions', () => {
  it('returns questions filtered by client_id and discipline', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'Couch Heroes' });

    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'Q1' });
    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'culture', question_text: 'Q2' });
    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Art', category: 'depth', question_text: 'Q3' });

    const res = await request(app)
      .get('/api/interview-questions')
      .query({ client_id: client.id, discipline: 'Engineering' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body.map(q => q.question_text).sort()).toEqual(['Q1', 'Q2']);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/interview-questions');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/interview-questions', () => {
  it('creates a question in the bank', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'Couch Heroes' });

    const res = await request(app)
      .post('/api/interview-questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        client_id: client.id,
        discipline: 'Engineering',
        category: 'technical',
        question_text: 'Describe your approach to code review.',
        source: 'custom',
      });

    expect(res.status).toBe(201);
    expect(res.body.question_text).toBe('Describe your approach to code review.');
    expect(res.body.source).toBe('custom');
    expect(res.body.created_by).toBe(admin.id);
  });

  it('rejects invalid category', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .post('/api/interview-questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ discipline: 'Engineering', category: 'invalid', question_text: 'Q' });

    expect(res.status).toBe(400);
  });

  it('rejects missing question_text', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .post('/api/interview-questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ discipline: 'Engineering', category: 'technical' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/interview-questions/:id', () => {
  it('updates question text and category', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const q = await createTestInterviewQuestion({ created_by: admin.id });

    const res = await request(app)
      .patch(`/api/interview-questions/${q.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ question_text: 'Updated question', category: 'culture' });

    expect(res.status).toBe(200);
    expect(res.body.question_text).toBe('Updated question');
    expect(res.body.category).toBe('culture');
  });
});

describe('DELETE /api/interview-questions/:id', () => {
  it('admin can delete a question', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const q = await createTestInterviewQuestion({ created_by: admin.id });

    const res = await request(app)
      .delete(`/api/interview-questions/${q.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const check = await pool.query('SELECT id FROM interview_question_bank WHERE id = $1', [q.id]);
    expect(check.rows.length).toBe(0);
  });

  it('non-admin cannot delete', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const member = await createTestUser({ role: 'member' });
    const memberToken = await mintSession(member.id);
    const q = await createTestInterviewQuestion({ created_by: admin.id });

    const res = await request(app)
      .delete(`/api/interview-questions/${q.id}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd dashboard-server && npx vitest run tests/unit/interview-questions.test.mjs
```
Expected: FAIL — endpoints don't exist yet.

- [ ] **Step 3: Implement question bank endpoints in server.js**

Add these endpoints after the existing hiring section (around line 7366) in `dashboard-server/server.js`:

```javascript
// ==================== INTERVIEW QUESTION BANK ====================

const INTERVIEW_CATEGORIES = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
const INTERVIEW_SOURCES = ['ai_generated', 'custom', 'curated'];
const INTERVIEW_DEPTH_TYPES = ['code', 'art_style', 'narrative'];

app.get('/api/interview-questions', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const { client_id, discipline, category } = req.query;
  const where = [];
  const vals = [];
  let i = 1;
  if (client_id) {
    if (!isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
    where.push(`client_id = $${i++}`); vals.push(client_id);
  }
  if (discipline) { where.push(`discipline = $${i++}`); vals.push(discipline); }
  if (category) {
    if (!INTERVIEW_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
    where.push(`category = $${i++}`); vals.push(category);
  }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try {
    const { rows } = await pool.query(
      `SELECT * FROM interview_question_bank ${whereClause} ORDER BY category, created_at`, vals
    );
    res.json(rows);
  } catch (e) {
    log('error', 'Interview', 'Failed to list questions', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

app.post('/api/interview-questions', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const { client_id, discipline, category, question_text, depth_type, source } = req.body || {};
  if (!discipline || !discipline.trim()) return res.status(400).json({ error: 'discipline required' });
  if (!category || !INTERVIEW_CATEGORIES.includes(category)) return res.status(400).json({ error: `category must be one of: ${INTERVIEW_CATEGORIES.join(', ')}` });
  if (!question_text || !question_text.trim()) return res.status(400).json({ error: 'question_text required' });
  if (client_id && !isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
  if (depth_type && !INTERVIEW_DEPTH_TYPES.includes(depth_type)) return res.status(400).json({ error: `depth_type must be one of: ${INTERVIEW_DEPTH_TYPES.join(', ')}` });
  if (source && !INTERVIEW_SOURCES.includes(source)) return res.status(400).json({ error: `source must be one of: ${INTERVIEW_SOURCES.join(', ')}` });
  try {
    const { rows } = await pool.query(
      `INSERT INTO interview_question_bank (client_id, discipline, category, question_text, depth_type, source, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [client_id || null, discipline.trim(), category, question_text.trim(), depth_type || null, source || 'custom', req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    log('error', 'Interview', 'Failed to create question', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

app.patch('/api/interview-questions/:id', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid question ID' });
  const { question_text, category, discipline, depth_type } = req.body || {};
  const sets = [];
  const vals = [];
  let i = 1;
  if (question_text !== undefined) { sets.push(`question_text = $${i++}`); vals.push(question_text.trim()); }
  if (category !== undefined) {
    if (!INTERVIEW_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
    sets.push(`category = $${i++}`); vals.push(category);
  }
  if (discipline !== undefined) { sets.push(`discipline = $${i++}`); vals.push(discipline.trim()); }
  if (depth_type !== undefined) {
    if (depth_type !== null && !INTERVIEW_DEPTH_TYPES.includes(depth_type)) return res.status(400).json({ error: 'Invalid depth_type' });
    sets.push(`depth_type = $${i++}`); vals.push(depth_type);
  }
  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
  sets.push(`updated_at = NOW()`);
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE interview_question_bank SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Question not found' });
    res.json(rows[0]);
  } catch (e) {
    log('error', 'Interview', 'Failed to update question', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

app.delete('/api/interview-questions/:id', requireNBI, requireAdmin, async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid question ID' });
  try {
    const { rowCount } = await pool.query('DELETE FROM interview_question_bank WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Question not found' });
    res.json({ deleted: true });
  } catch (e) {
    log('error', 'Interview', 'Failed to delete question', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd dashboard-server && npx vitest run tests/unit/interview-questions.test.mjs
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/interview-questions.test.mjs
git commit -m "feat(interview): question bank CRUD API with tests"
```

---

## Task 4: Interview Config + Session API + Tests

Endpoints for creating configs, activating (with email), and cloning.

**Files:**
- Modify: `dashboard-server/server.js`
- Create: `dashboard-server/tests/unit/interview-configs.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `dashboard-server/tests/unit/interview-configs.test.mjs`:

```javascript
// dashboard-server/tests/unit/interview-configs.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser, createTestClient, createTestCandidate,
  createTestHiringPosition, createTestInterviewQuestion, createTestInterviewConfig,
} = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('POST /api/interview-configs', () => {
  it('creates a draft config with questions and interviewers', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'Couch Heroes' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Senior Engineer' });
    const candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, stage: 'interviews' });
    const interviewer = await createTestUser({ role: 'member' });

    const q1 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', question_text: 'Q1' });
    const q2 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', question_text: 'Q2' });

    const res = await request(app)
      .post('/api/interview-configs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        candidate_id: candidate.id,
        position_id: position.id,
        question_ids: [q1.id, q2.id],
        interviewer_ids: [interviewer.id],
      });

    expect(res.status).toBe(201);
    expect(res.body.config.status).toBe('draft');
    expect(res.body.questions.length).toBe(2);
    expect(res.body.sessions.length).toBe(1);
    expect(res.body.sessions[0].interviewer_id).toBe(interviewer.id);
    expect(res.body.sessions[0].status).toBe('assigned');
  });
});

describe('GET /api/interview-configs', () => {
  it('returns config for a candidate', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient();
    const candidate = await createTestCandidate({ client_id: client.id, stage: 'interviews' });
    const q = await createTestInterviewQuestion({ client_id: client.id });

    await createTestInterviewConfig({
      candidate_id: candidate.id,
      created_by: admin.id,
      question_ids: [q.id],
    });

    const res = await request(app)
      .get('/api/interview-configs')
      .query({ candidate_id: candidate.id })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].candidate_id).toBe(candidate.id);
  });
});

describe('POST /api/interview-configs/:id/activate', () => {
  it('activates config and sets notified_at on sessions', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient();
    const candidate = await createTestCandidate({ client_id: client.id, stage: 'interviews', name: 'Sarah Mitchell' });
    const interviewer = await createTestUser({ role: 'member', email: 'interviewer@example.invalid' });
    const q = await createTestInterviewQuestion({ client_id: client.id });

    const { config } = await createTestInterviewConfig({
      candidate_id: candidate.id,
      created_by: admin.id,
      question_ids: [q.id],
      interviewer_ids: [interviewer.id],
    });

    const res = await request(app)
      .post(`/api/interview-configs/${config.id}/activate`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');

    // Check session was marked as notified
    const { rows: sessions } = await pool.query(
      'SELECT * FROM interview_sessions WHERE config_id = $1', [config.id]
    );
    expect(sessions[0].notified_at).not.toBeNull();
  });
});

describe('POST /api/interview-configs/:id/clone', () => {
  it('clones question selection to a new candidate', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient();
    const position = await createTestHiringPosition({ client_id: client.id });
    const candidate1 = await createTestCandidate({ client_id: client.id, position_id: position.id, stage: 'interviews' });
    const candidate2 = await createTestCandidate({ client_id: client.id, position_id: position.id, stage: 'interviews' });
    const q1 = await createTestInterviewQuestion({ client_id: client.id });
    const q2 = await createTestInterviewQuestion({ client_id: client.id });

    const { config } = await createTestInterviewConfig({
      candidate_id: candidate1.id,
      position_id: position.id,
      created_by: admin.id,
      question_ids: [q1.id, q2.id],
    });

    const res = await request(app)
      .post(`/api/interview-configs/${config.id}/clone`)
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate2.id });

    expect(res.status).toBe(201);
    expect(res.body.config.candidate_id).toBe(candidate2.id);
    expect(res.body.questions.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd dashboard-server && npx vitest run tests/unit/interview-configs.test.mjs
```
Expected: FAIL.

- [ ] **Step 3: Implement config endpoints in server.js**

Add after the question bank endpoints:

```javascript
// ==================== INTERVIEW CONFIGS ====================

const INTERVIEW_CONFIG_STATUSES = ['draft', 'active', 'completed'];

app.get('/api/interview-configs', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const { candidate_id } = req.query;
  const where = [];
  const vals = [];
  let i = 1;
  if (candidate_id) {
    if (!isValidUuid(candidate_id)) return res.status(400).json({ error: 'Invalid candidate_id' });
    where.push(`ic.candidate_id = $${i++}`); vals.push(candidate_id);
  }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try {
    const { rows } = await pool.query(
      `SELECT ic.*, c.name AS candidate_name, c.role AS candidate_role,
              hp.title AS position_title, u.display_name AS created_by_name
       FROM interview_configs ic
       LEFT JOIN candidates c ON ic.candidate_id = c.id
       LEFT JOIN hiring_positions hp ON ic.position_id = hp.id
       LEFT JOIN users u ON ic.created_by = u.id
       ${whereClause}
       ORDER BY ic.created_at DESC`, vals
    );
    res.json(rows);
  } catch (e) {
    log('error', 'Interview', 'Failed to list configs', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

app.post('/api/interview-configs', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const { candidate_id, position_id, question_ids, interviewer_ids } = req.body || {};
  if (!candidate_id || !isValidUuid(candidate_id)) return res.status(400).json({ error: 'Valid candidate_id required' });
  if (position_id && !isValidUuid(position_id)) return res.status(400).json({ error: 'Invalid position_id' });
  if (!Array.isArray(question_ids) || question_ids.length === 0) return res.status(400).json({ error: 'question_ids array required' });

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const { rows: configRows } = await dbClient.query(
      `INSERT INTO interview_configs (candidate_id, position_id, created_by, status)
       VALUES ($1, $2, $3, 'draft') RETURNING *`,
      [candidate_id, position_id || null, req.user.id]
    );
    const config = configRows[0];

    const questions = [];
    for (let idx = 0; idx < question_ids.length; idx++) {
      const qid = question_ids[idx];
      if (!isValidUuid(qid)) { await dbClient.query('ROLLBACK'); return res.status(400).json({ error: `Invalid question_id: ${qid}` }); }
      const { rows } = await dbClient.query(
        `INSERT INTO interview_config_questions (config_id, question_id, sort_order)
         VALUES ($1, $2, $3) RETURNING *`,
        [config.id, qid, idx]
      );
      questions.push(rows[0]);
    }

    const sessions = [];
    if (Array.isArray(interviewer_ids)) {
      for (const iid of interviewer_ids) {
        if (!isValidUuid(iid)) { await dbClient.query('ROLLBACK'); return res.status(400).json({ error: `Invalid interviewer_id: ${iid}` }); }
        const { rows } = await dbClient.query(
          `INSERT INTO interview_sessions (config_id, interviewer_id, status)
           VALUES ($1, $2, 'assigned') RETURNING *`,
          [config.id, iid]
        );
        sessions.push(rows[0]);
      }
    }

    await dbClient.query('COMMIT');
    res.status(201).json({ config, questions, sessions });
  } catch (e) {
    await dbClient.query('ROLLBACK');
    log('error', 'Interview', 'Failed to create config', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    dbClient.release();
  }
});

app.post('/api/interview-configs/:id/activate', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid config ID' });

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const { rows: configRows } = await dbClient.query(
      `UPDATE interview_configs SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND status = 'draft' RETURNING *`, [req.params.id]
    );
    if (!configRows.length) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ error: 'Config not found or already activated' });
    }
    const config = configRows[0];

    await dbClient.query(
      `UPDATE interview_sessions SET notified_at = NOW() WHERE config_id = $1`, [config.id]
    );

    await dbClient.query('COMMIT');

    // Send notification emails (fire-and-forget)
    const { rows: sessions } = await pool.query(
      `SELECT s.id, s.interviewer_id, u.email, u.display_name
       FROM interview_sessions s JOIN users u ON s.interviewer_id = u.id
       WHERE s.config_id = $1`, [config.id]
    );
    const { rows: candidateRows } = await pool.query(
      `SELECT c.name, c.role, cl.name AS client_name
       FROM candidates c LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE c.id = $1`, [config.candidate_id]
    );
    const cand = candidateRows[0] || {};
    const { rows: questionCount } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM interview_config_questions WHERE config_id = $1`, [config.id]
    );

    for (const s of sessions) {
      if (!s.email) continue;
      const interviewUrl = `${APP_URL}/nbi_project_dashboard.html#interview/${s.id}`;
      sendEmailAsync({
        from: EMAIL_FROM,
        to: s.email,
        subject: `Interview assigned: ${cand.name || 'Candidate'} — ${cand.role || 'Role'}`,
        html: buildEmailHtml(
          'Interview Assigned',
          `<p>Hi ${escHtml(s.display_name || 'there')},</p>
           <p>You've been assigned to interview <strong>${escHtml(cand.name || 'a candidate')}</strong> for the <strong>${escHtml(cand.role || 'open')} position</strong> at ${escHtml(cand.client_name || 'the client')}.</p>
           <p>There are <strong>${questionCount[0]?.cnt || 0} questions</strong> to score.</p>
           <p><a href="${escHtml(interviewUrl)}" style="display:inline-block;padding:10px 24px;background:#4ecdc4;color:#1a1a2e;text-decoration:none;border-radius:6px;font-weight:600">Start Interview</a></p>
           <p style="color:#666;font-size:0.85em">Assigned by ${escHtml(req.user.displayName || req.user.display_name || 'the hiring manager')}.</p>`
        ),
      });
    }

    res.json(config);
  } catch (e) {
    await dbClient.query('ROLLBACK');
    log('error', 'Interview', 'Failed to activate config', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    dbClient.release();
  }
});

app.post('/api/interview-configs/:id/clone', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid config ID' });
  const { candidate_id } = req.body || {};
  if (!candidate_id || !isValidUuid(candidate_id)) return res.status(400).json({ error: 'Valid candidate_id required' });

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const { rows: srcRows } = await dbClient.query(
      'SELECT * FROM interview_configs WHERE id = $1', [req.params.id]
    );
    if (!srcRows.length) { await dbClient.query('ROLLBACK'); return res.status(404).json({ error: 'Source config not found' }); }
    const src = srcRows[0];

    const { rows: configRows } = await dbClient.query(
      `INSERT INTO interview_configs (candidate_id, position_id, created_by, status)
       VALUES ($1, $2, $3, 'draft') RETURNING *`,
      [candidate_id, src.position_id, req.user.id]
    );
    const config = configRows[0];

    const { rows: srcQuestions } = await dbClient.query(
      'SELECT question_id, sort_order FROM interview_config_questions WHERE config_id = $1 ORDER BY sort_order',
      [req.params.id]
    );
    const questions = [];
    for (const sq of srcQuestions) {
      const { rows } = await dbClient.query(
        `INSERT INTO interview_config_questions (config_id, question_id, sort_order)
         VALUES ($1, $2, $3) RETURNING *`,
        [config.id, sq.question_id, sq.sort_order]
      );
      questions.push(rows[0]);
    }

    await dbClient.query('COMMIT');
    res.status(201).json({ config, questions, sessions: [] });
  } catch (e) {
    await dbClient.query('ROLLBACK');
    log('error', 'Interview', 'Failed to clone config', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    dbClient.release();
  }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd dashboard-server && npx vitest run tests/unit/interview-configs.test.mjs
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/interview-configs.test.mjs
git commit -m "feat(interview): config, session, clone, and activate APIs with email notifications"
```

---

## Task 5: Scoring, Session, Results & Decision API + Tests

Endpoints for interviewers to score, submit, and for HMs to view aggregated results and record decisions.

**Files:**
- Modify: `dashboard-server/server.js`
- Create: `dashboard-server/tests/unit/interview-scoring.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `dashboard-server/tests/unit/interview-scoring.test.mjs`:

```javascript
// dashboard-server/tests/unit/interview-scoring.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser, createTestClient, createTestCandidate,
  createTestInterviewQuestion, createTestInterviewConfig,
} = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

// Helper: build a full interview setup
async function setupInterview() {
  const admin = await createTestUser({ role: 'admin' });
  const adminToken = await mintSession(admin.id);
  const interviewer1 = await createTestUser({ role: 'member', display_name: 'Alex T' });
  const i1Token = await mintSession(interviewer1.id);
  const interviewer2 = await createTestUser({ role: 'member', display_name: 'Maria K' });
  const i2Token = await mintSession(interviewer2.id);

  const client = await createTestClient({ name: 'Couch Heroes' });
  const candidate = await createTestCandidate({ client_id: client.id, stage: 'interviews', name: 'Sarah Mitchell' });

  const q1 = await createTestInterviewQuestion({ client_id: client.id, category: 'culture', question_text: 'Culture Q1' });
  const q2 = await createTestInterviewQuestion({ client_id: client.id, category: 'technical', question_text: 'Technical Q1' });
  const q3 = await createTestInterviewQuestion({ client_id: client.id, category: 'depth', question_text: 'Depth Q1', depth_type: 'code' });

  const { config, sessions } = await createTestInterviewConfig({
    candidate_id: candidate.id,
    created_by: admin.id,
    status: 'active',
    question_ids: [q1.id, q2.id, q3.id],
    interviewer_ids: [interviewer1.id, interviewer2.id],
  });

  return {
    admin, adminToken, interviewer1, i1Token, interviewer2, i2Token,
    client, candidate, config, sessions, questions: [q1, q2, q3],
  };
}

describe('GET /api/interview-sessions/:id', () => {
  it('interviewer can see their own session with questions', async () => {
    const { i1Token, sessions, questions } = await setupInterview();
    const session = sessions[0];

    const res = await request(app)
      .get(`/api/interview-sessions/${session.id}`)
      .set('Authorization', `Bearer ${i1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe(session.id);
    expect(res.body.questions.length).toBe(3);
    expect(res.body.questions[0].question_text).toBeDefined();
  });

  it('another user cannot see someone else\'s session', async () => {
    const { i2Token, sessions } = await setupInterview();
    const session1 = sessions[0]; // belongs to interviewer1

    const res = await request(app)
      .get(`/api/interview-sessions/${session1.id}`)
      .set('Authorization', `Bearer ${i2Token}`);

    expect(res.status).toBe(403);
  });

  it('admin can see any session', async () => {
    const { adminToken, sessions } = await setupInterview();

    const res = await request(app)
      .get(`/api/interview-sessions/${sessions[0].id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

describe('PUT /api/interview-scores/:session_id/:question_id', () => {
  it('upserts a score with notes (auto-save)', async () => {
    const { i1Token, sessions, questions } = await setupInterview();
    const session = sessions[0];

    const res = await request(app)
      .put(`/api/interview-scores/${session.id}/${questions[0].id}`)
      .set('Authorization', `Bearer ${i1Token}`)
      .send({ score: 4, notes: 'Good culture fit' });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(4);
    expect(res.body.notes).toBe('Good culture fit');

    // Update the same score
    const res2 = await request(app)
      .put(`/api/interview-scores/${session.id}/${questions[0].id}`)
      .set('Authorization', `Bearer ${i1Token}`)
      .send({ score: 5, notes: 'Revised — excellent' });

    expect(res2.status).toBe(200);
    expect(res2.body.score).toBe(5);
  });

  it('rejects score outside 1-5', async () => {
    const { i1Token, sessions, questions } = await setupInterview();

    const res = await request(app)
      .put(`/api/interview-scores/${sessions[0].id}/${questions[0].id}`)
      .set('Authorization', `Bearer ${i1Token}`)
      .send({ score: 6 });

    expect(res.status).toBe(400);
  });

  it('rejects scoring on a submitted session', async () => {
    const { i1Token, sessions, questions } = await setupInterview();
    await pool.query(`UPDATE interview_sessions SET status = 'submitted' WHERE id = $1`, [sessions[0].id]);

    const res = await request(app)
      .put(`/api/interview-scores/${sessions[0].id}/${questions[0].id}`)
      .set('Authorization', `Bearer ${i1Token}`)
      .send({ score: 3 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/submitted/i);
  });

  it('sets session status to in_progress on first score', async () => {
    const { i1Token, sessions, questions } = await setupInterview();

    await request(app)
      .put(`/api/interview-scores/${sessions[0].id}/${questions[0].id}`)
      .set('Authorization', `Bearer ${i1Token}`)
      .send({ score: 3 });

    const { rows } = await pool.query('SELECT status, started_at FROM interview_sessions WHERE id = $1', [sessions[0].id]);
    expect(rows[0].status).toBe('in_progress');
    expect(rows[0].started_at).not.toBeNull();
  });
});

describe('POST /api/interview-sessions/:id/submit', () => {
  it('submits when all questions are scored', async () => {
    const { i1Token, sessions, questions } = await setupInterview();
    const session = sessions[0];

    // Score all 3 questions
    for (const q of questions) {
      await request(app)
        .put(`/api/interview-scores/${session.id}/${q.id}`)
        .set('Authorization', `Bearer ${i1Token}`)
        .send({ score: 4 });
    }

    const res = await request(app)
      .post(`/api/interview-sessions/${session.id}/submit`)
      .set('Authorization', `Bearer ${i1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('submitted');
    expect(res.body.submitted_at).not.toBeNull();
  });

  it('rejects submission when questions are unscored', async () => {
    const { i1Token, sessions, questions } = await setupInterview();

    // Score only 1 of 3
    await request(app)
      .put(`/api/interview-scores/${sessions[0].id}/${questions[0].id}`)
      .set('Authorization', `Bearer ${i1Token}`)
      .send({ score: 4 });

    const res = await request(app)
      .post(`/api/interview-sessions/${sessions[0].id}/submit`)
      .set('Authorization', `Bearer ${i1Token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unscored/i);
  });
});

describe('GET /api/interview-results/:config_id', () => {
  it('returns aggregated results for admin', async () => {
    const { adminToken, i1Token, i2Token, config, sessions, questions } = await setupInterview();

    // Interviewer 1 scores all
    for (const q of questions) {
      await request(app)
        .put(`/api/interview-scores/${sessions[0].id}/${q.id}`)
        .set('Authorization', `Bearer ${i1Token}`)
        .send({ score: 4, notes: 'Good' });
    }
    await request(app).post(`/api/interview-sessions/${sessions[0].id}/submit`).set('Authorization', `Bearer ${i1Token}`);

    // Interviewer 2 scores all
    for (const q of questions) {
      await request(app)
        .put(`/api/interview-scores/${sessions[1].id}/${q.id}`)
        .set('Authorization', `Bearer ${i2Token}`)
        .send({ score: 3 });
    }
    await request(app).post(`/api/interview-sessions/${sessions[1].id}/submit`).set('Authorization', `Bearer ${i2Token}`);

    const res = await request(app)
      .get(`/api/interview-results/${config.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sessions.length).toBe(2);
    expect(res.body.scores).toBeDefined();
    expect(res.body.questions.length).toBe(3);
    expect(res.body.summary.overall_avg).toBeCloseTo(3.5, 1);
  });

  it('rejects non-admin interviewer access to results', async () => {
    const { i1Token, config } = await setupInterview();

    const res = await request(app)
      .get(`/api/interview-results/${config.id}`)
      .set('Authorization', `Bearer ${i1Token}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/interview-decisions', () => {
  it('records an advance decision and updates config status', async () => {
    const { adminToken, config } = await setupInterview();

    const res = await request(app)
      .post('/api/interview-decisions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ config_id: config.id, decision: 'advance', notes: 'Strong candidate' });

    expect(res.status).toBe(201);
    expect(res.body.decision).toBe('advance');

    const { rows } = await pool.query('SELECT status FROM interview_configs WHERE id = $1', [config.id]);
    expect(rows[0].status).toBe('completed');
  });

  it('rejects invalid decision value', async () => {
    const { adminToken, config } = await setupInterview();

    const res = await request(app)
      .post('/api/interview-decisions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ config_id: config.id, decision: 'maybe', notes: 'Not sure' });

    expect(res.status).toBe(400);
  });

  it('rejects missing notes', async () => {
    const { adminToken, config } = await setupInterview();

    const res = await request(app)
      .post('/api/interview-decisions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ config_id: config.id, decision: 'advance' });

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd dashboard-server && npx vitest run tests/unit/interview-scoring.test.mjs
```
Expected: FAIL.

- [ ] **Step 3: Implement session, score, results, and decision endpoints**

Add after the config endpoints in `dashboard-server/server.js`:

```javascript
// ==================== INTERVIEW SESSIONS ====================

app.get('/api/interview-sessions/mine', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  try {
    const { rows } = await pool.query(
      `SELECT s.*, c.name AS candidate_name, c.role AS candidate_role,
              cl.name AS client_name, ic.status AS config_status
       FROM interview_sessions s
       JOIN interview_configs ic ON s.config_id = ic.id
       LEFT JOIN candidates c ON ic.candidate_id = c.id
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE s.interviewer_id = $1
       ORDER BY s.notified_at DESC NULLS LAST`, [req.user.id]
    );
    res.json(rows);
  } catch (e) {
    log('error', 'Interview', 'Failed to list my sessions', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

app.get('/api/interview-sessions/:id', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid session ID' });
  try {
    const { rows: sessionRows } = await pool.query(
      `SELECT s.*, c.name AS candidate_name, c.role AS candidate_role, cl.name AS client_name
       FROM interview_sessions s
       JOIN interview_configs ic ON s.config_id = ic.id
       LEFT JOIN candidates c ON ic.candidate_id = c.id
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE s.id = $1`, [req.params.id]
    );
    if (!sessionRows.length) return res.status(404).json({ error: 'Session not found' });
    const session = sessionRows[0];

    // Only the assigned interviewer or admin can view
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && session.interviewer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your session' });
    }

    const { rows: questions } = await pool.query(
      `SELECT iqb.*, icq.sort_order
       FROM interview_config_questions icq
       JOIN interview_question_bank iqb ON icq.question_id = iqb.id
       WHERE icq.config_id = $1
       ORDER BY icq.sort_order`, [session.config_id]
    );

    const { rows: scores } = await pool.query(
      'SELECT * FROM interview_scores WHERE session_id = $1', [session.id]
    );

    res.json({ session, questions, scores });
  } catch (e) {
    log('error', 'Interview', 'Failed to get session', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// ==================== INTERVIEW SCORES ====================

app.put('/api/interview-scores/:session_id/:question_id', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.session_id) || !isValidUuid(req.params.question_id)) {
    return res.status(400).json({ error: 'Invalid IDs' });
  }
  const { score, notes } = req.body || {};
  if (typeof score !== 'number' || score < 1 || score > 5) {
    return res.status(400).json({ error: 'score must be 1-5' });
  }

  try {
    // Verify session belongs to user and is not submitted
    const { rows: sessionRows } = await pool.query(
      'SELECT * FROM interview_sessions WHERE id = $1', [req.params.session_id]
    );
    if (!sessionRows.length) return res.status(404).json({ error: 'Session not found' });
    const session = sessionRows[0];
    if (session.interviewer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your session' });
    }
    if (session.status === 'submitted') {
      return res.status(400).json({ error: 'Cannot score a submitted session' });
    }

    // Upsert the score
    const { rows } = await pool.query(
      `INSERT INTO interview_scores (session_id, question_id, score, notes, scored_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (session_id, question_id)
       DO UPDATE SET score = EXCLUDED.score, notes = EXCLUDED.notes, scored_at = NOW()
       RETURNING *`,
      [req.params.session_id, req.params.question_id, score, notes || null]
    );

    // If session is still 'assigned', advance to 'in_progress'
    if (session.status === 'assigned') {
      await pool.query(
        `UPDATE interview_sessions SET status = 'in_progress', started_at = NOW() WHERE id = $1`,
        [session.id]
      );
    }

    res.json(rows[0]);
  } catch (e) {
    log('error', 'Interview', 'Failed to upsert score', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

app.get('/api/interview-scores/:session_id', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.session_id)) return res.status(400).json({ error: 'Invalid session ID' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM interview_scores WHERE session_id = $1 ORDER BY scored_at', [req.params.session_id]
    );
    res.json(rows);
  } catch (e) {
    log('error', 'Interview', 'Failed to list scores', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// ==================== SESSION SUBMIT ====================

app.post('/api/interview-sessions/:id/submit', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid session ID' });

  try {
    const { rows: sessionRows } = await pool.query(
      'SELECT * FROM interview_sessions WHERE id = $1', [req.params.id]
    );
    if (!sessionRows.length) return res.status(404).json({ error: 'Session not found' });
    const session = sessionRows[0];
    if (session.interviewer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your session' });
    }
    if (session.status === 'submitted') return res.status(400).json({ error: 'Already submitted' });

    // Check all questions are scored
    const { rows: questionCount } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM interview_config_questions WHERE config_id = $1', [session.config_id]
    );
    const { rows: scoreCount } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM interview_scores WHERE session_id = $1', [session.id]
    );
    const totalQuestions = parseInt(questionCount[0].cnt, 10);
    const totalScored = parseInt(scoreCount[0].cnt, 10);
    if (totalScored < totalQuestions) {
      return res.status(400).json({ error: `${totalQuestions - totalScored} unscored questions remain` });
    }

    const { rows: updated } = await pool.query(
      `UPDATE interview_sessions SET status = 'submitted', submitted_at = NOW() WHERE id = $1 RETURNING *`,
      [session.id]
    );

    // Check if all sessions for this config are now submitted — send appropriate email
    const { rows: remaining } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM interview_sessions WHERE config_id = $1 AND status != 'submitted'`,
      [session.config_id]
    );
    const { rows: configRows } = await pool.query(
      `SELECT ic.*, c.name AS candidate_name, c.role AS candidate_role, u.email AS hm_email, u.display_name AS hm_name
       FROM interview_configs ic
       LEFT JOIN candidates c ON ic.candidate_id = c.id
       LEFT JOIN users u ON ic.created_by = u.id
       WHERE ic.id = $1`, [session.config_id]
    );
    const cfg = configRows[0];
    if (cfg && cfg.hm_email) {
      const allDone = parseInt(remaining[0].cnt, 10) === 0;
      if (allDone) {
        sendEmailAsync({
          from: EMAIL_FROM,
          to: cfg.hm_email,
          subject: `All interviews complete for ${cfg.candidate_name || 'candidate'} — ready for decision`,
          html: buildEmailHtml('All Interviews Complete',
            `<p>Hi ${escHtml(cfg.hm_name || 'there')},</p>
             <p>All interviewers have submitted their scorecards for <strong>${escHtml(cfg.candidate_name || 'the candidate')}</strong> (${escHtml(cfg.candidate_role || 'role')}).</p>
             <p><a href="${escHtml(APP_URL)}/nbi_project_dashboard.html#hiring" style="display:inline-block;padding:10px 24px;background:#4ecdc4;color:#1a1a2e;text-decoration:none;border-radius:6px;font-weight:600">Review Results</a></p>`
          ),
        });
      } else {
        sendEmailAsync({
          from: EMAIL_FROM,
          to: cfg.hm_email,
          subject: `${req.user.displayName || req.user.display_name || 'An interviewer'} submitted scorecard for ${cfg.candidate_name || 'candidate'}`,
          html: buildEmailHtml('Scorecard Submitted',
            `<p>${escHtml(req.user.displayName || req.user.display_name || 'An interviewer')} has submitted their scorecard for <strong>${escHtml(cfg.candidate_name || 'the candidate')}</strong>.</p>
             <p>${remaining[0].cnt} scorecard(s) still pending.</p>`
          ),
        });
      }
    }

    res.json(updated[0]);
  } catch (e) {
    log('error', 'Interview', 'Failed to submit session', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// ==================== INTERVIEW RESULTS ====================

app.get('/api/interview-results/:config_id', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.config_id)) return res.status(400).json({ error: 'Invalid config ID' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  try {
    const { rows: configRows } = await pool.query(
      `SELECT ic.*, c.name AS candidate_name, c.role AS candidate_role, c.stage AS candidate_stage,
              cl.name AS client_name
       FROM interview_configs ic
       LEFT JOIN candidates c ON ic.candidate_id = c.id
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE ic.id = $1`, [req.params.config_id]
    );
    if (!configRows.length) return res.status(404).json({ error: 'Config not found' });

    const { rows: questions } = await pool.query(
      `SELECT iqb.*, icq.sort_order
       FROM interview_config_questions icq
       JOIN interview_question_bank iqb ON icq.question_id = iqb.id
       WHERE icq.config_id = $1
       ORDER BY icq.sort_order`, [req.params.config_id]
    );

    const { rows: sessions } = await pool.query(
      `SELECT s.*, u.display_name AS interviewer_name
       FROM interview_sessions s
       JOIN users u ON s.interviewer_id = u.id
       WHERE s.config_id = $1
       ORDER BY s.notified_at`, [req.params.config_id]
    );

    const { rows: scores } = await pool.query(
      `SELECT isc.* FROM interview_scores isc
       JOIN interview_sessions s ON isc.session_id = s.id
       WHERE s.config_id = $1`, [req.params.config_id]
    );

    const { rows: decisions } = await pool.query(
      'SELECT * FROM interview_decisions WHERE config_id = $1', [req.params.config_id]
    );

    // Compute summary
    const allScores = scores.map(s => s.score);
    const overall_avg = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    const category_avgs = {};
    for (const q of questions) {
      const qScores = scores.filter(s => s.question_id === q.id).map(s => s.score);
      if (!category_avgs[q.category]) category_avgs[q.category] = [];
      category_avgs[q.category].push(...qScores);
    }
    for (const cat of Object.keys(category_avgs)) {
      const arr = category_avgs[cat];
      category_avgs[cat] = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    }

    res.json({
      config: configRows[0],
      questions,
      sessions,
      scores,
      decision: decisions[0] || null,
      summary: { overall_avg, category_avgs },
    });
  } catch (e) {
    log('error', 'Interview', 'Failed to get results', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// ==================== INTERVIEW DECISIONS ====================

const INTERVIEW_DECISIONS = ['advance', 'reject', 'hold'];

app.post('/api/interview-decisions', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { config_id, decision, notes } = req.body || {};
  if (!config_id || !isValidUuid(config_id)) return res.status(400).json({ error: 'Valid config_id required' });
  if (!decision || !INTERVIEW_DECISIONS.includes(decision)) return res.status(400).json({ error: `decision must be one of: ${INTERVIEW_DECISIONS.join(', ')}` });
  if (!notes || !notes.trim()) return res.status(400).json({ error: 'notes required' });

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const { rows } = await dbClient.query(
      `INSERT INTO interview_decisions (config_id, decision, decided_by, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [config_id, decision, req.user.id, notes.trim()]
    );

    await dbClient.query(
      `UPDATE interview_configs SET status = 'completed', updated_at = NOW() WHERE id = $1`, [config_id]
    );

    // If decision is 'advance', move candidate to 'offer' stage
    if (decision === 'advance') {
      const { rows: cfgRows } = await dbClient.query('SELECT candidate_id FROM interview_configs WHERE id = $1', [config_id]);
      if (cfgRows.length && cfgRows[0].candidate_id) {
        await dbClient.query(`UPDATE candidates SET stage = 'offer', updated_at = NOW() WHERE id = $1`, [cfgRows[0].candidate_id]);
      }
    }
    // If decision is 'reject', archive the candidate
    if (decision === 'reject') {
      const { rows: cfgRows } = await dbClient.query('SELECT candidate_id FROM interview_configs WHERE id = $1', [config_id]);
      if (cfgRows.length && cfgRows[0].candidate_id) {
        await dbClient.query(`UPDATE candidates SET archived_at = NOW(), updated_at = NOW() WHERE id = $1`, [cfgRows[0].candidate_id]);
      }
    }

    await dbClient.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) {
    await dbClient.query('ROLLBACK');
    if (e.code === '23505') return res.status(409).json({ error: 'Decision already recorded for this config' });
    log('error', 'Interview', 'Failed to record decision', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    dbClient.release();
  }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd dashboard-server && npx vitest run tests/unit/interview-scoring.test.mjs
```
Expected: all tests PASS.

- [ ] **Step 5: Run full test suite to check for regressions**

Run:
```bash
cd dashboard-server && npm test
```
Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/interview-scoring.test.mjs
git commit -m "feat(interview): scoring, session submit, results aggregation, and decision APIs with tests"
```

---

## Task 6: AI Question Generation

Install Anthropic SDK and add the generation endpoint.

**Files:**
- Modify: `dashboard-server/package.json` (add dependency)
- Create: `dashboard-server/lib/interview-questions-prompt.js`
- Modify: `dashboard-server/server.js` (add generation endpoint)

- [ ] **Step 1: Install the Anthropic SDK**

Run:
```bash
cd dashboard-server && npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Create the prompt builder module**

Create `dashboard-server/lib/interview-questions-prompt.js`:

```javascript
// dashboard-server/lib/interview-questions-prompt.js
//
// Builds the Claude API prompt for generating interview questions.
// Returns a structured prompt that produces JSON output.

const DEPTH_FOCUS = {
  Engineering: { type: 'code', focus: 'Architecture, algorithms, debugging, code review, system design, performance optimisation' },
  Art: { type: 'art_style', focus: 'Visual direction, art pipeline, style adaptation, technical art, portfolio critique' },
  'Narrative/Writing': { type: 'narrative', focus: 'Story structure, world-building, dialogue craft, editorial process, narrative design' },
  'Game Design': { type: 'code', focus: 'Systems design, player psychology, balance, prototyping, economy design' },
  QA: { type: 'code', focus: 'Test strategy, automation frameworks, regression, pipeline integration, edge case identification' },
  Production: { type: null, focus: 'Scheduling, risk management, stakeholder communication, process improvement, team coordination' },
  Audio: { type: 'art_style', focus: 'Sound design, implementation, middleware (Wwise/FMOD), mix process, adaptive audio' },
  'HR/People': { type: null, focus: 'Policy, employee relations, compliance, culture building, conflict resolution' },
  Leadership: { type: null, focus: 'Vision, team building, cross-functional collaboration, strategy, mentoring' },
};

function buildGenerationPrompt({ jdText, clientName, discipline, seniority }) {
  const depthInfo = DEPTH_FOCUS[discipline] || { type: null, focus: 'Domain-specific mastery' };

  return {
    system: `You are an expert interviewer for ${clientName || 'a game studio'}. Generate interview questions that are specific, probing, and calibrated to the candidate's seniority level. Every question must require the candidate to demonstrate real competency — not just talk about it. No generic "tell me about a time" questions. Each question must be grounded in the specific role, discipline, and company context.`,
    user: `Generate exactly 25 interview questions for a ${seniority || 'mid-level'} ${discipline} position at ${clientName || 'the studio'}.

Job Description:
${jdText || 'No JD provided — generate broadly for the discipline.'}

Generate 5 questions for EACH of these categories:

1. CULTURE — Values alignment, working style, remote collaboration habits specific to a ${clientName ? clientName + ' (fully remote game studio)' : 'game studio'} environment.

2. TECHNICAL — Domain knowledge, tools, methodologies specific to ${discipline}.

3. COLLABORATION — Teamwork, communication, conflict resolution in a cross-discipline game development context.

4. LEADERSHIP — Initiative, mentoring, decision-making calibrated to ${seniority || 'mid-level'} seniority. For junior roles, focus on growth mindset and learning approach.

5. DEPTH — ${depthInfo.focus}

Return a JSON array of objects with this structure:
[
  { "category": "culture", "question_text": "...", "depth_type": null },
  { "category": "technical", "question_text": "...", "depth_type": null },
  { "category": "depth", "question_text": "...", "depth_type": "${depthInfo.type || 'null'}" },
  ...
]

Return ONLY the JSON array, no markdown fencing, no explanation.`,
  };
}

module.exports = { buildGenerationPrompt, DEPTH_FOCUS };
```

- [ ] **Step 3: Add the generation endpoint to server.js**

At the top of server.js, after the existing requires (around line 63), add:

```javascript
let Anthropic;
try { Anthropic = require('@anthropic-ai/sdk'); } catch (e) { /* optional: AI question generation disabled */ }
const { buildGenerationPrompt } = require('./lib/interview-questions-prompt');
```

Then add the endpoint after the other interview-questions routes:

```javascript
app.post('/api/interview-questions/generate', requireNBI, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI question generation not configured — set ANTHROPIC_API_KEY' });
  }
  const { position_id, client_id, discipline, seniority } = req.body || {};
  if (!discipline) return res.status(400).json({ error: 'discipline required' });

  try {
    // Get JD text from position if provided
    let jdText = '';
    let clientName = '';
    if (position_id && isValidUuid(position_id)) {
      const { rows } = await pool.query(
        `SELECT hp.description, hp.title, c.name AS client_name
         FROM hiring_positions hp LEFT JOIN clients c ON hp.client_id = c.id
         WHERE hp.id = $1`, [position_id]
      );
      if (rows.length) {
        jdText = rows[0].description || '';
        clientName = rows[0].client_name || '';
      }
    }
    if (client_id && isValidUuid(client_id) && !clientName) {
      const { rows } = await pool.query('SELECT name FROM clients WHERE id = $1', [client_id]);
      if (rows.length) clientName = rows[0].name;
    }

    const prompt = buildGenerationPrompt({ jdText, clientName, discipline, seniority });
    const client = new Anthropic.default();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });

    const text = message.content[0]?.text || '[]';
    let questions;
    try {
      questions = JSON.parse(text);
    } catch (parseErr) {
      // Try to extract JSON from markdown fencing
      const match = text.match(/\[[\s\S]*\]/);
      questions = match ? JSON.parse(match[0]) : [];
    }

    if (!Array.isArray(questions)) return res.status(500).json({ error: 'AI returned invalid format' });

    // Insert into question bank
    const inserted = [];
    for (const q of questions) {
      if (!q.question_text || !q.category) continue;
      const cat = q.category.toLowerCase();
      if (!INTERVIEW_CATEGORIES.includes(cat)) continue;
      const { rows } = await pool.query(
        `INSERT INTO interview_question_bank (client_id, discipline, category, question_text, depth_type, source, created_by)
         VALUES ($1, $2, $3, $4, $5, 'ai_generated', $6) RETURNING *`,
        [client_id || null, discipline, cat, q.question_text.trim(), q.depth_type || null, req.user.id]
      );
      inserted.push(rows[0]);
    }

    log('info', 'Interview', `AI generated ${inserted.length} questions for ${discipline} at ${clientName}`, {});
    res.status(201).json(inserted);
  } catch (e) {
    log('error', 'Interview', 'Failed to generate questions', { error: e.message });
    res.status(500).json({ error: 'Question generation failed: ' + e.message });
  }
});
```

**Important:** This endpoint must be registered BEFORE the `app.post('/api/interview-questions', ...)` route in server.js, because Express matches `/api/interview-questions/generate` before the generic POST if it comes first. Alternatively, place it after but ensure the route path `/api/interview-questions/generate` is distinct from `/api/interview-questions` (it is, because POST to the base path has no trailing segments).

- [ ] **Step 4: Run all interview tests to verify nothing broke**

Run:
```bash
cd dashboard-server && npx vitest run tests/unit/interview-questions.test.mjs tests/unit/interview-configs.test.mjs tests/unit/interview-scoring.test.mjs
```
Expected: all PASS. (The generation endpoint itself needs a real API key to test end-to-end — unit tests cover the prompt builder, integration testing is manual.)

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/package.json dashboard-server/package-lock.json dashboard-server/lib/interview-questions-prompt.js dashboard-server/server.js
git commit -m "feat(interview): AI question generation via Anthropic SDK"
```

---

## Task 7: Frontend — Interview Button on Candidate Card + Question Picker

Add the "Configure Interview" / "View Interview" / "Interview Results" button to the candidate detail panel, and build the question picker and interviewer assignment UI.

**Files:**
- Modify: `dashboard-server/public/js/views/hiring.js`

- [ ] **Step 1: Read the full openCandidateDetail function to understand the panel HTML structure**

Read `dashboard-server/public/js/views/hiring.js` from the `openCandidateDetail` function through to the end of the panel.innerHTML template literal. Identify where to add the interview button — it should go in the interviews stage section (where `stageSubHtml` is built for `c.stage === 'interviews'`).

- [ ] **Step 2: Add interview config state loading in openCandidateDetail**

After the `const c = await apiCall(...)` line in `openCandidateDetail`, add a fetch for the interview config:

```javascript
// Fetch interview config if candidate is in interviews stage
let interviewConfig = null;
if (c.stage === 'interviews' || c.stage === 'offer' || c.stage === 'hired') {
  const configs = await apiCall(`/api/interview-configs?candidate_id=${c.id}`);
  if (configs && configs.length > 0) interviewConfig = configs[0];
}
```

- [ ] **Step 3: Replace the interviews stageSubHtml with the interview button**

Replace the `c.stage === 'interviews'` block in the `stageSubHtml` building with:

```javascript
} else if (c.stage === 'interviews') {
  let interviewBtnLabel = 'Configure Interview';
  let interviewBtnAction = `openInterviewConfig('${c.id}', '${c.client_id || ''}', '${c.position_id || ''}')`;
  if (interviewConfig && interviewConfig.status === 'active') {
    interviewBtnLabel = 'View Interview';
    interviewBtnAction = `openInterviewResults('${interviewConfig.id}')`;
  } else if (interviewConfig && interviewConfig.status === 'completed') {
    interviewBtnLabel = 'Interview Results';
    interviewBtnAction = `openInterviewResults('${interviewConfig.id}')`;
  }
  stageSubHtml = `<div class="candidate-detail__field"><label>Interview</label>
    <button class="btn btn--primary" onclick="${interviewBtnAction}">${interviewBtnLabel}</button>
  </div>`;
}
```

- [ ] **Step 4: Build the question picker overlay functions**

Add at the bottom of `hiring.js` (before the `registerView` export):

```javascript
// ==================== INTERVIEW CONFIG ====================

async function openInterviewConfig(candidateId, clientId, positionId) {
  // Fetch available questions for this client
  const params = new URLSearchParams();
  if (clientId) params.set('client_id', clientId);
  const allQuestions = await apiCall(`/api/interview-questions?${params}`);
  const users = await apiCall('/api/users');

  // Build the config overlay
  const overlay = document.getElementById('candidateDetailOverlay');
  const panel = document.getElementById('candidateDetailPanel');
  if (!overlay || !panel) return;

  const categories = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
  const selectedIds = new Set();
  let activeTab = 'questions';
  const selectedInterviewers = new Set();

  function renderConfigPanel() {
    const grouped = {};
    for (const cat of categories) grouped[cat] = (allQuestions || []).filter(q => q.category === cat);

    const filterHtml = categories.map(cat =>
      `<span class="chip ${activeTab === 'questions' ? '' : 'chip--muted'}" onclick="window._ivFilterCategory='${cat}';window._ivRenderConfig()">${cat} (${grouped[cat]?.filter(q => selectedIds.has(q.id)).length || 0})</span>`
    ).join('');

    const questionsHtml = categories.map(cat => {
      const qs = grouped[cat] || [];
      if (qs.length === 0) return '';
      return `<div style="margin-bottom:16px">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${cat} <span style="color:var(--accent)">(${qs.filter(q => selectedIds.has(q.id)).length} selected)</span></div>
        ${qs.map(q => `<label style="display:flex;align-items:flex-start;gap:8px;padding:8px;border-radius:6px;cursor:pointer;background:${selectedIds.has(q.id) ? 'var(--bg-elevated)' : 'transparent'};margin-bottom:4px;border:1px solid ${selectedIds.has(q.id) ? 'var(--accent)' : 'var(--border)'}">
          <input type="checkbox" ${selectedIds.has(q.id) ? 'checked' : ''} onchange="window._ivToggleQ('${q.id}')" style="margin-top:4px">
          <div>
            <div style="font-size:14px;line-height:1.5">${esc(q.question_text)}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:4px">${q.source}${q.depth_type ? ' · ' + q.depth_type : ''}</div>
          </div>
        </label>`).join('')}
      </div>`;
    }).join('');

    const interviewersHtml = (users || []).filter(u => u.role !== 'client_role' && u.is_active !== false).map(u =>
      `<label style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-bottom:1px solid var(--border)">
        <input type="checkbox" ${selectedInterviewers.has(u.id) ? 'checked' : ''} onchange="window._ivToggleInterviewer('${u.id}')">
        <span>${esc(u.display_name || u.username)}</span>
        <span style="color:var(--text-muted);font-size:12px">${esc(u.email || '')}</span>
      </label>`
    ).join('');

    panel.innerHTML = `
      <div class="candidate-detail__header">
        <h3>Configure Interview</h3>
        <button class="btn btn--sm" onclick="openCandidateDetail('${candidateId}')">Back</button>
      </div>
      <div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:12px">
        <div style="padding:10px 16px;cursor:pointer;font-weight:${activeTab === 'questions' ? '600' : '400'};border-bottom:2px solid ${activeTab === 'questions' ? 'var(--accent)' : 'transparent'}" onclick="window._ivSetTab('questions')">Questions</div>
        <div style="padding:10px 16px;cursor:pointer;font-weight:${activeTab === 'interviewers' ? '600' : '400'};border-bottom:2px solid ${activeTab === 'interviewers' ? 'var(--accent)' : 'transparent'}" onclick="window._ivSetTab('interviewers')">Interviewers</div>
      </div>
      ${activeTab === 'questions' ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          ${filterHtml}
          <button class="btn btn--sm" style="margin-left:auto" onclick="window._ivGenerateQuestions()">Generate from JD</button>
          <button class="btn btn--sm" onclick="window._ivAddCustom()">+ Custom</button>
        </div>
        <div style="font-weight:600;margin-bottom:8px;color:var(--accent)">${selectedIds.size} selected</div>
        <div style="max-height:400px;overflow-y:auto">${questionsHtml || '<p style="color:var(--text-muted)">No questions in bank. Generate from JD or add custom questions.</p>'}</div>
      ` : `
        <div style="max-height:400px;overflow-y:auto">${interviewersHtml || '<p style="color:var(--text-muted)">No team members found.</p>'}</div>
      `}
      <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:12px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--text-muted);font-size:13px">${selectedIds.size} questions · ${selectedInterviewers.size} interviewers</span>
        <button class="btn btn--primary" ${selectedIds.size === 0 || selectedInterviewers.size === 0 ? 'disabled' : ''} onclick="window._ivSendInterviews()">Send Interviews</button>
      </div>
    `;
  }

  window._ivRenderConfig = renderConfigPanel;
  window._ivSetTab = (tab) => { activeTab = tab; renderConfigPanel(); };
  window._ivToggleQ = (id) => { selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id); renderConfigPanel(); };
  window._ivToggleInterviewer = (id) => { selectedInterviewers.has(id) ? selectedInterviewers.delete(id) : selectedInterviewers.add(id); renderConfigPanel(); };

  window._ivGenerateQuestions = async () => {
    const btn = panel.querySelector('[onclick*="ivGenerateQuestions"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
    const generated = await apiCall('/api/interview-questions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position_id: positionId || null, client_id: clientId || null, discipline: 'Engineering' }),
    });
    if (generated && Array.isArray(generated)) {
      allQuestions.push(...generated);
      generated.forEach(q => selectedIds.add(q.id));
    }
    renderConfigPanel();
  };

  window._ivAddCustom = () => {
    const text = prompt('Enter your custom question:');
    if (!text || !text.trim()) return;
    const cat = prompt('Category (culture, technical, collaboration, leadership, depth):') || 'technical';
    apiCall('/api/interview-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId || null, discipline: 'Engineering', category: cat, question_text: text }),
    }).then(q => {
      if (q) { allQuestions.push(q); selectedIds.add(q.id); renderConfigPanel(); }
    });
  };

  window._ivSendInterviews = async () => {
    const config = await apiCall('/api/interview-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: candidateId,
        position_id: positionId || null,
        question_ids: [...selectedIds],
        interviewer_ids: [...selectedInterviewers],
      }),
    });
    if (!config || !config.config) return;
    await apiCall(`/api/interview-configs/${config.config.id}/activate`, { method: 'POST' });
    openCandidateDetail(candidateId);
  };

  renderConfigPanel();
}
window.openInterviewConfig = openInterviewConfig;

async function openInterviewResults(configId) {
  const results = await apiCall(`/api/interview-results/${configId}`);
  if (!results) return;

  const overlay = document.getElementById('candidateDetailOverlay');
  const panel = document.getElementById('candidateDetailPanel');
  if (!overlay || !panel) return;

  const { config, questions, sessions, scores, decision, summary } = results;
  const categories = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];

  // Build category bars
  const barsHtml = categories.map(cat => {
    const avg = summary.category_avgs[cat] || 0;
    const pct = (avg / 5) * 100;
    const colour = cat === 'depth' ? '#e8a87c' : 'var(--accent)';
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="width:100px;font-size:12px;text-align:right;color:var(--text-muted)">${cat}</span>
      <div style="flex:1;background:var(--bg-elevated);border-radius:4px;height:18px;position:relative">
        <div style="background:${colour};width:${pct}%;height:100%;border-radius:4px"></div>
        <span style="position:absolute;right:6px;top:1px;font-size:11px;font-weight:600">${avg.toFixed(1)}</span>
      </div>
    </div>`;
  }).join('');

  // Build comparison table
  const submittedSessions = sessions.filter(s => s.status === 'submitted');
  const headerCols = submittedSessions.map(s => `<th style="font-size:11px;color:var(--text-muted);text-align:center;padding:6px">${esc(s.interviewer_name)}</th>`).join('');

  let tableRows = '';
  let currentCat = '';
  for (const q of questions) {
    if (q.category !== currentCat) {
      currentCat = q.category;
      tableRows += `<tr><td colspan="${submittedSessions.length + 2}" style="background:var(--bg-elevated);padding:4px 8px;font-size:10px;text-transform:uppercase;color:var(--accent);letter-spacing:1px">${currentCat}</td></tr>`;
    }
    const qScores = submittedSessions.map(s => {
      const sc = scores.find(sc => sc.session_id === s.id && sc.question_id === q.id);
      if (!sc) return '<td style="text-align:center;padding:6px;color:var(--text-muted)">—</td>';
      const colour = sc.score >= 4 ? '#2d4a2d' : sc.score === 3 ? '#4a4a2d' : '#4a2d2d';
      const textColour = sc.score >= 4 ? '#7dce7d' : sc.score === 3 ? '#e8d87c' : '#e87d7d';
      return `<td style="text-align:center;padding:6px"><span style="background:${colour};color:${textColour};padding:2px 8px;border-radius:4px;font-weight:600">${sc.score}</span>${sc.notes ? ' <span title="${esc(sc.notes)}" style="cursor:help;font-size:10px">💬</span>' : ''}</td>`;
    }).join('');
    const qAvgScores = scores.filter(sc => sc.question_id === q.id).map(sc => sc.score);
    const qAvg = qAvgScores.length > 0 ? (qAvgScores.reduce((a, b) => a + b, 0) / qAvgScores.length).toFixed(1) : '—';

    // Check divergence
    const minScore = qAvgScores.length > 0 ? Math.min(...qAvgScores) : 0;
    const maxScore = qAvgScores.length > 0 ? Math.max(...qAvgScores) : 0;
    const divergent = (maxScore - minScore) >= 3;

    tableRows += `<tr style="${divergent ? 'border-left:3px solid #e8a87c;background:rgba(232,168,124,0.06)' : ''}">
      <td style="padding:6px 8px;font-size:13px;max-width:300px">${esc(q.question_text)}${divergent ? ' <span style="font-size:10px;color:#e8a87c;background:#2a2218;padding:1px 6px;border-radius:4px">DIVERGENT</span>' : ''}</td>
      ${qScores}
      <td style="text-align:center;padding:6px;font-weight:600;color:var(--accent)">${qAvg}</td>
    </tr>`;
  }

  const pendingCount = sessions.filter(s => s.status !== 'submitted').length;
  const totalCount = sessions.length;

  panel.innerHTML = `
    <div class="candidate-detail__header">
      <h3>Interview Results — ${esc(config.candidate_name || 'Candidate')}</h3>
      <button class="btn btn--sm" onclick="openCandidateDetail('${config.candidate_id}')">Back</button>
    </div>
    <div style="display:flex;gap:16px;margin-bottom:16px">
      <div style="text-align:center;min-width:80px">
        <div style="font-size:32px;font-weight:700;color:var(--accent)">${summary.overall_avg.toFixed(1)}</div>
        <div style="font-size:11px;color:var(--text-muted)">Overall</div>
      </div>
      <div style="flex:1">${barsHtml}</div>
      <div style="text-align:center;min-width:100px">
        <span style="background:${pendingCount === 0 ? '#2d4a2d' : '#4a4a2d'};color:${pendingCount === 0 ? '#7dce7d' : '#e8d87c'};padding:4px 12px;border-radius:12px;font-size:12px">${totalCount - pendingCount} of ${totalCount} submitted</span>
      </div>
    </div>
    ${config.candidate_stage && config.candidate_stage !== 'interviews' ? `<div style="background:#4a4a2d;color:#e8d87c;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:13px">Candidate has been moved to "${config.candidate_stage}" stage</div>` : ''}
    <div style="overflow-x:auto;margin-bottom:16px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr><th style="text-align:left;padding:6px 8px;font-size:11px;color:var(--text-muted)">Question</th>${headerCols}<th style="font-size:11px;color:var(--text-muted);text-align:center;padding:6px">Avg</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    ${!decision ? `
      <div style="border-top:1px solid var(--border);padding-top:12px">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Decision</div>
        <div style="display:flex;gap:8px;align-items:flex-start">
          <button class="btn" style="background:#2d4a2d;color:#7dce7d;border:1px solid #3a6a3a" onclick="window._ivDecide('advance')">Advance</button>
          <button class="btn" style="background:var(--bg-elevated);color:#e8d87c;border:1px solid #4a4a2d" onclick="window._ivDecide('hold')">Hold</button>
          <button class="btn" style="background:var(--bg-elevated);color:#e87d7d;border:1px solid #4a2d2d" onclick="window._ivDecide('reject')">Reject</button>
          <textarea id="ivDecisionNotes" placeholder="Decision notes (required)" rows="2" style="flex:1;font-size:13px"></textarea>
        </div>
      </div>
    ` : `
      <div style="border-top:1px solid var(--border);padding-top:12px;color:var(--text-muted)">
        Decision: <strong style="color:${decision.decision === 'advance' ? '#7dce7d' : decision.decision === 'reject' ? '#e87d7d' : '#e8d87c'}">${decision.decision.toUpperCase()}</strong>
        — ${esc(decision.notes)}
      </div>
    `}
  `;

  window._ivDecide = async (d) => {
    const notes = document.getElementById('ivDecisionNotes')?.value;
    if (!notes || !notes.trim()) { alert('Please add decision notes.'); return; }
    await apiCall('/api/interview-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config_id: configId, decision: d, notes }),
    });
    openInterviewResults(configId);
  };
}
window.openInterviewResults = openInterviewResults;
```

- [ ] **Step 5: Restart the dev server and manually verify the interview button appears on a candidate in the interviews stage**

Run:
```bash
cd dashboard-server && npm start
```
Open http://localhost:8888/nbi_project_dashboard.html, navigate to Hiring, click a candidate in the "interviews" column, verify "Configure Interview" button appears.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/public/js/views/hiring.js
git commit -m "feat(interview): question picker, interviewer assignment, and results view in hiring UI"
```

---

## Task 8: Frontend — Focused Interview Mode

The full-page view interviewers use to score questions.

**Files:**
- Create: `dashboard-server/public/js/views/interview.js`
- Modify: `dashboard-server/public/js/app.js` (add import)

- [ ] **Step 1: Create the interview.js module**

Create `dashboard-server/public/js/views/interview.js`:

```javascript
// ==================== INTERVIEW MODE ====================
// Focused, distraction-free interview scoring view.
// Launched via URL hash #interview/{session_id} or email link.

import { registerView } from '../core/router.js';

async function renderInterviewMode(container, sessionId) {
  if (!sessionId) { container.innerHTML = '<p>No session ID provided.</p>'; return; }

  const data = await apiCall(`/api/interview-sessions/${sessionId}`);
  if (!data || !data.session) {
    container.innerHTML = '<p style="padding:40px;text-align:center;color:var(--text-muted)">Interview session not found or access denied.</p>';
    return;
  }

  const { session, questions, scores: existingScores } = data;
  const scoreMap = {};
  const notesMap = {};
  for (const s of existingScores) {
    scoreMap[s.question_id] = s.score;
    notesMap[s.question_id] = s.notes || '';
  }

  let currentIndex = 0;
  const categories = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
  const SCORE_LABELS = { 1: 'Poor', 2: 'Below', 3: 'Average', 4: 'Good', 5: 'Excellent' };

  function scoredCount() { return questions.filter(q => scoreMap[q.id] !== undefined).length; }

  function categoryProgress() {
    const progress = {};
    for (const cat of categories) {
      const catQs = questions.filter(q => q.category === cat);
      const scored = catQs.filter(q => scoreMap[q.id] !== undefined).length;
      progress[cat] = { scored, total: catQs.length };
    }
    return progress;
  }

  async function saveScore(questionId, score, notes) {
    scoreMap[questionId] = score;
    if (notes !== undefined) notesMap[questionId] = notes;
    await apiCall(`/api/interview-scores/${sessionId}/${questionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, notes: notesMap[questionId] || null }),
    });
  }

  async function saveNotes(questionId, notes) {
    notesMap[questionId] = notes;
    if (scoreMap[questionId] !== undefined) {
      await apiCall(`/api/interview-scores/${sessionId}/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: scoreMap[questionId], notes: notes || null }),
      });
    }
  }

  function render() {
    const q = questions[currentIndex];
    if (!q) return;

    const cp = categoryProgress();
    const progressBars = categories.map(cat => {
      const p = cp[cat];
      const pct = p.total > 0 ? (p.scored / p.total) * 100 : 0;
      const colour = cat === 'depth' ? '#e8a87c' : '#4ecdc4';
      return `<div style="flex:1">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#8888aa;margin-bottom:4px"><span>${cat}</span><span>${p.scored}/${p.total}</span></div>
        <div style="background:#2a2a4a;border-radius:4px;height:6px"><div style="background:${colour};width:${pct}%;height:100%;border-radius:4px"></div></div>
      </div>`;
    }).join('');

    const dots = questions.map((dq, i) => {
      const scored = scoreMap[dq.id] !== undefined;
      const current = i === currentIndex;
      const size = current ? '10px' : '8px';
      const bg = scored ? '#4ecdc4' : '#333';
      const border = current ? '2px solid #4ecdc4' : 'none';
      return `<span onclick="window._ivGoTo(${i})" style="width:${size};height:${size};border-radius:50%;background:${current ? '#fff' : bg};border:${border};display:inline-block;cursor:pointer"></span>`;
    }).join('');

    const scoreButtons = [1, 2, 3, 4, 5].map(s => {
      const selected = scoreMap[q.id] === s;
      const bg = selected ? '#1a3a3a' : '#1e1e3a';
      const border = selected ? '#4ecdc4' : '#333355';
      const colour = selected ? '#4ecdc4' : '#888';
      return `<button onclick="window._ivScore(${s})" style="width:64px;height:48px;border-radius:8px;border:2px solid ${border};background:${bg};color:${colour};font-size:16px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <span style="font-weight:700">${s}</span>
        <span style="font-size:9px">${SCORE_LABELS[s]}</span>
      </button>`;
    }).join('');

    const allScored = scoredCount() === questions.length;
    const isSubmitted = session.status === 'submitted';

    container.innerHTML = `
      <div style="background:#1a1a2e;color:#e0e0e0;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <div style="background:#16213e;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #2a2a4a">
          <div>
            <span style="font-size:18px;font-weight:600;color:#fff">${esc(session.candidate_name || 'Candidate')}</span>
            <span style="color:#8888aa;margin-left:12px">${esc(session.candidate_role || '')}</span>
            <span style="color:#6c6c8a;margin-left:8px">${esc(session.client_name || '')}</span>
          </div>
          <div style="display:flex;gap:12px;align-items:center">
            <span style="background:#2d4a2d;color:#7dce7d;padding:4px 12px;border-radius:12px;font-size:13px">${scoredCount()} of ${questions.length} scored</span>
            <button onclick="window.location.hash='hiring'" style="background:#333355;color:#aaa;border:1px solid #444;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:13px">Save & Exit</button>
          </div>
        </div>
        <div style="padding:12px 24px;background:#1e1e3a;display:flex;gap:16px;border-bottom:1px solid #2a2a4a">${progressBars}</div>
        <div style="padding:32px 48px;max-width:800px;margin:0 auto">
          <div style="margin-bottom:12px">
            <span style="background:#2d3a5a;color:#7da8e8;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:500;text-transform:uppercase">${q.category}</span>
            <span style="color:#555;font-size:13px;margin-left:12px">Question ${currentIndex + 1} of ${questions.length}</span>
          </div>
          <div style="font-size:20px;font-weight:500;color:#fff;line-height:1.5;margin-bottom:28px">${esc(q.question_text)}</div>
          ${!isSubmitted ? `
            <div style="margin-bottom:24px">
              <div style="font-size:12px;color:#8888aa;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">Score</div>
              <div style="display:flex;gap:8px">${scoreButtons}</div>
            </div>
            <div style="margin-bottom:32px">
              <div style="font-size:12px;color:#8888aa;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">Notes <span style="color:#555;text-transform:none;letter-spacing:0">(optional)</span></div>
              <textarea id="ivNotes" rows="3" style="width:100%;background:#1e1e3a;border:1px solid #333355;border-radius:8px;padding:14px;color:#e0e0e0;font-size:14px;resize:vertical" onblur="window._ivSaveNotes()">${esc(notesMap[q.id] || '')}</textarea>
            </div>
          ` : `
            <div style="margin-bottom:24px;color:#666">Score: <strong style="color:#4ecdc4">${scoreMap[q.id] || '—'}</strong></div>
            ${notesMap[q.id] ? `<div style="color:#888;font-size:14px;margin-bottom:24px">${esc(notesMap[q.id])}</div>` : ''}
          `}
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #2a2a4a;padding-top:20px">
            <button onclick="window._ivPrev()" ${currentIndex === 0 ? 'disabled' : ''} style="background:#2a2a4a;color:#aaa;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:14px">&larr; Previous</button>
            <div style="display:flex;gap:4px;flex-wrap:wrap;max-width:400px;justify-content:center">${dots}</div>
            <div style="display:flex;gap:8px">
              ${currentIndex < questions.length - 1 ? `
                <button onclick="window._ivSkip()" style="background:#2a2a4a;color:#aaa;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:14px">Skip</button>
                <button onclick="window._ivNext()" style="background:#4ecdc4;color:#1a1a2e;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600">Next &rarr;</button>
              ` : ''}
              ${allScored && !isSubmitted ? `<button onclick="window._ivSubmit()" style="background:#2d4a2d;color:#7dce7d;border:2px solid #3a6a3a;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Submit Interview</button>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window._ivScore = (s) => { saveScore(questions[currentIndex].id, s, notesMap[questions[currentIndex].id]); render(); };
  window._ivSaveNotes = () => { const el = document.getElementById('ivNotes'); if (el) saveNotes(questions[currentIndex].id, el.value); };
  window._ivNext = () => { if (currentIndex < questions.length - 1) { currentIndex++; render(); } };
  window._ivPrev = () => { if (currentIndex > 0) { currentIndex--; render(); } };
  window._ivSkip = () => { if (currentIndex < questions.length - 1) { currentIndex++; render(); } };
  window._ivGoTo = (i) => { currentIndex = i; render(); };
  window._ivSubmit = async () => {
    if (!confirm('Submit your interview? Scores cannot be changed after submission.')) return;
    await apiCall(`/api/interview-sessions/${sessionId}/submit`, { method: 'POST' });
    session.status = 'submitted';
    render();
  };

  render();
}

registerView('interview', (container, params) => {
  const sessionId = params?.id || window.location.hash.split('/')[1];
  renderInterviewMode(container, sessionId);
});
```

- [ ] **Step 2: Add the import to app.js**

Open `dashboard-server/public/js/app.js` and add after the `import './views/hiring.js';` line:

```javascript
import './views/interview.js';
```

- [ ] **Step 3: Verify the router handles #interview/{session_id} hash routing**

Read the router.js file to understand how hash-based routing works. The `registerView('interview', ...)` call should hook into the existing router pattern. If the router splits `#interview/abc-123` into view `interview` with params `{ id: 'abc-123' }`, no changes needed. If not, add the hash parsing logic to extract the session ID from the hash.

- [ ] **Step 4: Restart dev server and test the interview mode**

Create a test interview config via the UI, activate it, then navigate to `#interview/{session_id}` to verify the focused interview mode loads.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/views/interview.js dashboard-server/public/js/app.js
git commit -m "feat(interview): focused interview mode — full-page scoring view for interviewers"
```

---

## Task 9: Couch Heroes Question Bank Seed

Generate the initial question bank for all 9 Couch Heroes disciplines.

**Files:**
- Create: `dashboard-server/scripts/seed-interview-questions.js`

- [ ] **Step 1: Create the seed script**

Create `dashboard-server/scripts/seed-interview-questions.js`:

```javascript
// Seed script: generate interview question banks for all Couch Heroes disciplines.
// Run: ANTHROPIC_API_KEY=... node scripts/seed-interview-questions.js
//
// Requires the server's .env for DATABASE_URL and an ANTHROPIC_API_KEY.

require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');
const { buildGenerationPrompt, DEPTH_FOCUS } = require('../lib/interview-questions-prompt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DISCIPLINES = Object.keys(DEPTH_FOCUS);

async function main() {
  const client = new Anthropic.default();

  // Find Couch Heroes client
  const { rows: clientRows } = await pool.query("SELECT id FROM clients WHERE name ILIKE '%couch heroes%' LIMIT 1");
  if (!clientRows.length) {
    console.error('Couch Heroes client not found in database. Create it first.');
    process.exit(1);
  }
  const clientId = clientRows[0].id;

  // Find an admin user for created_by
  const { rows: adminRows } = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  const createdBy = adminRows.length ? adminRows[0].id : null;

  for (const discipline of DISCIPLINES) {
    console.log(`\nGenerating questions for ${discipline}...`);

    // Check if questions already exist
    const { rows: existing } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM interview_question_bank WHERE client_id = $1 AND discipline = $2',
      [clientId, discipline]
    );
    if (parseInt(existing[0].cnt, 10) > 0) {
      console.log(`  Skipping — ${existing[0].cnt} questions already exist for ${discipline}`);
      continue;
    }

    const prompt = buildGenerationPrompt({
      jdText: `${discipline} role at Couch Heroes, a fully remote game studio (~55 people, UK + Greece) building multiplayer games.`,
      clientName: 'Couch Heroes',
      discipline,
      seniority: 'mid-to-senior',
    });

    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      });

      const text = message.content[0]?.text || '[]';
      let questions;
      try {
        questions = JSON.parse(text);
      } catch {
        const match = text.match(/\[[\s\S]*\]/);
        questions = match ? JSON.parse(match[0]) : [];
      }

      let inserted = 0;
      for (const q of questions) {
        if (!q.question_text || !q.category) continue;
        const cat = q.category.toLowerCase();
        const validCats = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
        if (!validCats.includes(cat)) continue;
        await pool.query(
          `INSERT INTO interview_question_bank (client_id, discipline, category, question_text, depth_type, source, created_by)
           VALUES ($1, $2, $3, $4, $5, 'ai_generated', $6)`,
          [clientId, discipline, cat, q.question_text.trim(), q.depth_type || null, createdBy]
        );
        inserted++;
      }
      console.log(`  Inserted ${inserted} questions for ${discipline}`);
    } catch (e) {
      console.error(`  Failed for ${discipline}: ${e.message}`);
    }
  }

  console.log('\nDone.');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the seed script**

Run:
```bash
cd dashboard-server && ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY node scripts/seed-interview-questions.js
```
Expected: ~25 questions generated for each of the 9 disciplines (225 total). Review a sample in the database to verify quality.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/scripts/seed-interview-questions.js
git commit -m "feat(interview): Couch Heroes question bank seed script for all 9 disciplines"
```

---

## Task 10: E2E Smoke Test

A Playwright test that exercises the critical path.

**Files:**
- Create: `dashboard-server/tests/e2e/interview.spec.js` (or `.mjs` depending on existing pattern)

- [ ] **Step 1: Check the existing Playwright test pattern**

Read an existing e2e test file to understand the pattern (selectors, page.goto URL, authentication approach, assertions).

- [ ] **Step 2: Write the E2E test**

Create a Playwright test that:
1. Logs in as admin
2. Navigates to Hiring
3. Opens a candidate in the "interviews" stage
4. Clicks "Configure Interview"
5. Verifies the question picker UI renders
6. Navigates to `#interview/{session_id}` for a pre-configured session
7. Verifies the focused interview mode renders with questions, score buttons, and navigation

The exact implementation depends on the existing Playwright patterns — match them exactly.

- [ ] **Step 3: Run the E2E test**

Run:
```bash
cd dashboard-server && npm run test:e2e -- --grep "interview"
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/tests/e2e/interview.spec.js
git commit -m "test(interview): E2E smoke test for interview tool critical path"
```

---

## Task 11: Full Test Suite Verification

- [ ] **Step 1: Run all unit tests**

Run:
```bash
cd dashboard-server && npm test
```
Expected: all tests PASS, including the 3 new interview test files.

- [ ] **Step 2: Run E2E tests**

Run:
```bash
cd dashboard-server && npm run test:e2e
```
Expected: all tests PASS.

- [ ] **Step 3: Verify the dashboard loads correctly**

Open http://localhost:8888/nbi_project_dashboard.html in a browser. Navigate to Hiring. Verify:
- Candidate cards render normally
- A candidate in "interviews" stage shows the "Configure Interview" button
- No console errors

- [ ] **Step 4: Final commit message if any cleanup was needed**

```bash
git commit -m "chore(interview): final cleanup and verification"
```
