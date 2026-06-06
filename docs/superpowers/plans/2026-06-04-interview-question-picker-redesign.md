# Interview Question Picker Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-candidate question picker modal with a position-level template system (stepper wizard) that pre-fills candidate interviews.

**Architecture:** New `position_question_templates` junction table links positions to their default questions. Position detail panel gets a collapsible stepper wizard for template setup. The existing `openInterviewConfig` modal pre-loads from the template on first round, with inline override. All saves are immediate (no batch save button).

**Tech Stack:** Express 4 routes in `dashboard-server/routes/interview.js`, PostgreSQL via `pg`, monolithic SPA `nbi_project_dashboard.html`, Vitest unit tests.

**Spec:** `docs/superpowers/specs/2026-06-04-interview-question-picker-redesign.md`

---

### Task 1: Migration 067 — position_question_templates + from_template column

**Files:**
- Create: `dashboard-server/migrations/067_position_question_templates.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 067_position_question_templates.sql
-- Position-level interview question templates

CREATE TABLE position_question_templates (
  position_id UUID NOT NULL REFERENCES hiring_positions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_question_bank(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (position_id, question_id)
);

CREATE INDEX idx_pqt_position ON position_question_templates(position_id);

ALTER TABLE interview_configs ADD COLUMN from_template BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply the migration**

Run: `cd dashboard-server && node scripts/init-db.js`
Expected: Migration 067 applied, table created, column added.

- [ ] **Step 3: Verify**

Run: `cd dashboard-server && node -e "require('dotenv').config();const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='position_question_templates' ORDER BY ordinal_position\").then(r=>{r.rows.forEach(x=>console.log(x.column_name));p.end()})"`
Expected: position_id, question_id, sort_order, added_by, added_at

- [ ] **Step 4: Add to truncate list in test helper**

In `dashboard-server/tests/helpers/db.js`, add `'position_question_templates'` to the `TRUNCATE_TABLES` array. It must appear BEFORE `'interview_question_bank'` and BEFORE `'hiring_positions'` (FK dependency order).

Add this line after line 78 (`'interview_config_questions'`):

```javascript
  'position_question_templates',
```

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/migrations/067_position_question_templates.sql dashboard-server/tests/helpers/db.js
git commit -m "feat(interview): migration 067 — position_question_templates table + from_template column"
```

---

### Task 2: Template CRUD API Endpoints + Unit Tests

**Files:**
- Modify: `dashboard-server/routes/interview.js` (add after line 65, before the generate endpoint)
- Create: `dashboard-server/tests/unit/position-question-templates.test.mjs`
- Modify: `dashboard-server/tests/helpers/fixtures.js` (add `createTestPositionTemplate` helper)

- [ ] **Step 1: Add fixture helper**

In `dashboard-server/tests/helpers/fixtures.js`, add this function before the `module.exports` block, and add `createTestPositionTemplate` to the exports:

```javascript
async function createTestPositionTemplate(opts = {}) {
  if (!opts.position_id) throw new Error('createTestPositionTemplate: position_id required');
  if (!opts.question_id) throw new Error('createTestPositionTemplate: question_id required');
  const { rows } = await pool.query(
    `INSERT INTO position_question_templates (position_id, question_id, sort_order, added_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [opts.position_id, opts.question_id, opts.sort_order || 0, opts.added_by || null]
  );
  return rows[0];
}
```

- [ ] **Step 2: Write the failing tests**

Create `dashboard-server/tests/unit/position-question-templates.test.mjs`:

```javascript
// Tests for position question template CRUD API

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestInterviewQuestion,
        createTestPositionTemplate } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

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

describe('Position Question Template API', () => {

  describe('GET /api/positions/:id/question-template', () => {
    it('returns empty array when no template exists', async () => {
      const { token, position } = await createPositionWithQuestion();
      const res = await request(app)
        .get(`/api/positions/${position.id}/question-template`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns template questions with text and category', async () => {
      const { token, admin, position, question } = await createPositionWithQuestion();
      await createTestPositionTemplate({
        position_id: position.id,
        question_id: question.id,
        sort_order: 0,
        added_by: admin.id,
      });
      const res = await request(app)
        .get(`/api/positions/${position.id}/question-template`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].question_text).toBe('Walk me through your state machine architecture.');
      expect(res.body[0].category).toBe('technical');
      expect(res.body[0].sort_order).toBe(0);
    });

    it('rejects unauthenticated requests', async () => {
      const { position } = await createPositionWithQuestion();
      const res = await request(app)
        .get(`/api/positions/${position.id}/question-template`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/positions/:id/question-template/questions', () => {
    it('adds a question to template with auto sort_order', async () => {
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
      const { token, admin, position, question, client } = await createPositionWithQuestion();
      await createTestPositionTemplate({ position_id: position.id, question_id: question.id, sort_order: 0, added_by: admin.id });
      const q2 = await createTestInterviewQuestion({
        client_id: client.id, category: 'culture', question_text: 'Second question', position_titles: ['Lead Animator'],
      });
      const res = await request(app)
        .post(`/api/positions/${position.id}/question-template/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ question_id: q2.id });
      expect(res.status).toBe(201);
      expect(res.body.sort_order).toBe(1);
    });

    it('rejects duplicate question_id', async () => {
      const { token, admin, position, question } = await createPositionWithQuestion();
      await createTestPositionTemplate({ position_id: position.id, question_id: question.id, sort_order: 0, added_by: admin.id });
      const res = await request(app)
        .post(`/api/positions/${position.id}/question-template/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ question_id: question.id });
      expect(res.status).toBe(409);
    });

    it('rejects invalid question_id', async () => {
      const { token, position } = await createPositionWithQuestion();
      const res = await request(app)
        .post(`/api/positions/${position.id}/question-template/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ question_id: 'not-a-uuid' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/positions/:id/question-template/questions/:questionId', () => {
    it('removes a question from template', async () => {
      const { token, admin, position, question } = await createPositionWithQuestion();
      await createTestPositionTemplate({ position_id: position.id, question_id: question.id, sort_order: 0, added_by: admin.id });
      const res = await request(app)
        .delete(`/api/positions/${position.id}/question-template/questions/${question.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);

      const getRes = await request(app)
        .get(`/api/positions/${position.id}/question-template`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.body).toHaveLength(0);
    });

    it('returns 404 for non-existent template entry', async () => {
      const { token, position, question } = await createPositionWithQuestion();
      const res = await request(app)
        .delete(`/api/positions/${position.id}/question-template/questions/${question.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/position-question-templates.test.mjs`
Expected: All tests FAIL (endpoints don't exist yet)

- [ ] **Step 4: Implement the template CRUD endpoints**

In `dashboard-server/routes/interview.js`, add after line 65 (after the closing of the GET /api/interview-questions handler) and before line 67 (the generate endpoint):

```javascript
  // ---------- Group 1b: Position Question Templates ----------

  /** GET /api/positions/:id/question-template — Get template questions for a position */
  router.get('/api/positions/:id/question-template', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { id } = req.params;
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid position id' });
    try {
      const { rows } = await pool.query(`
        SELECT pqt.position_id, pqt.question_id, pqt.sort_order, pqt.added_at,
               q.question_text, q.category, q.discipline, q.source, q.depth_type
        FROM position_question_templates pqt
        JOIN interview_question_bank q ON pqt.question_id = q.id
        WHERE pqt.position_id = $1
        ORDER BY pqt.sort_order ASC
      `, [id]);
      res.json(rows);
    } catch (e) {
      log('error', 'Interview', 'Failed to get position template', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** POST /api/positions/:id/question-template/questions — Add question to template */
  router.post('/api/positions/:id/question-template/questions', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { id } = req.params;
    const { question_id } = req.body;
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid position id' });
    if (!question_id || !isValidUuid(question_id)) return res.status(400).json({ error: 'Valid question_id is required' });
    try {
      const { rows: maxRows } = await pool.query(
        'SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM position_question_templates WHERE position_id = $1',
        [id]
      );
      const nextSort = maxRows[0].max_sort + 1;
      const { rows } = await pool.query(
        `INSERT INTO position_question_templates (position_id, question_id, sort_order, added_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [id, question_id, nextSort, req.user.id]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'Question already in template' });
      if (e.code === '23503') return res.status(404).json({ error: 'Position or question not found' });
      log('error', 'Interview', 'Failed to add template question', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** DELETE /api/positions/:id/question-template/questions/:questionId — Remove question from template */
  router.delete('/api/positions/:id/question-template/questions/:questionId', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { id, questionId } = req.params;
    if (!isValidUuid(id) || !isValidUuid(questionId)) return res.status(400).json({ error: 'Invalid id' });
    try {
      const { rowCount } = await pool.query(
        'DELETE FROM position_question_templates WHERE position_id = $1 AND question_id = $2',
        [id, questionId]
      );
      if (rowCount === 0) return res.status(404).json({ error: 'Template entry not found' });
      res.json({ deleted: true });
    } catch (e) {
      log('error', 'Interview', 'Failed to remove template question', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/position-question-templates.test.mjs`
Expected: All 8 tests PASS

- [ ] **Step 6: Run full test suite to check for regressions**

Run: `cd dashboard-server && npm test`
Expected: All existing tests still pass

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/routes/interview.js dashboard-server/tests/unit/position-question-templates.test.mjs dashboard-server/tests/helpers/fixtures.js
git commit -m "feat(interview): position question template CRUD API + tests"
```

---

### Task 3: Modify POST /api/interview-configs for Template Auto-Load

**Files:**
- Modify: `dashboard-server/routes/interview.js:284-377` (POST /api/interview-configs handler)
- Modify: `dashboard-server/tests/unit/position-question-templates.test.mjs` (add auto-load tests)

- [ ] **Step 1: Write the failing test for auto-load**

Add to `dashboard-server/tests/unit/position-question-templates.test.mjs`:

```javascript
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

    // Create first round
    await request(app)
      .post('/api/interview-configs')
      .set('Authorization', `Bearer ${token}`)
      .send({ candidate_id: candidate.id, round_type: 'Technical', interviewer_ids: [admin.id] });

    // Create second round without question_ids
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
```

You will also need to add `createTestCandidate` to the imports at the top of the test file.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/position-question-templates.test.mjs`
Expected: The 4 new tests FAIL (from_template column not in INSERT, auto-load not implemented)

- [ ] **Step 3: Modify POST /api/interview-configs**

In `dashboard-server/routes/interview.js`, modify the POST /api/interview-configs handler (lines 284-377). The changes are:

**a)** After `const config = configRows[0];` (line 344), add template auto-load logic. Replace the existing question insertion block (lines 346-355) with:

```javascript
      const questions = [];
      let fromTemplate = false;

      if (!isPhoneScreen) {
        let effectiveQuestionIds = question_ids || null;

        // Auto-load from position template on first round if no explicit question_ids
        if (!effectiveQuestionIds && nextRoundNumber === 1 && resolvedPositionId) {
          const { rows: templateRows } = await conn.query(
            'SELECT question_id FROM position_question_templates WHERE position_id = $1 ORDER BY sort_order ASC',
            [resolvedPositionId]
          );
          if (templateRows.length > 0) {
            effectiveQuestionIds = templateRows.map(r => r.question_id);
            fromTemplate = true;
          }
        }

        if (effectiveQuestionIds) {
          for (let idx = 0; idx < effectiveQuestionIds.length; idx++) {
            const { rows } = await conn.query(
              `INSERT INTO interview_config_questions (config_id, question_id, sort_order) VALUES ($1, $2, $3) RETURNING *`,
              [config.id, effectiveQuestionIds[idx], idx]
            );
            questions.push(rows[0]);
          }
        }

        if (fromTemplate) {
          await conn.query('UPDATE interview_configs SET from_template = true WHERE id = $1', [config.id]);
          config.from_template = true;
        }
      }
```

**b)** Update the INSERT statement for interview_configs (line 336-343) to include `from_template`:

Change the INSERT to include the column with default `false` — no change needed since the column has a DEFAULT, but the returned `config` object needs it. The `UPDATE` after template load handles setting it to `true`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/position-question-templates.test.mjs`
Expected: All 12 tests PASS (8 CRUD + 4 auto-load)

- [ ] **Step 5: Run full test suite**

Run: `cd dashboard-server && npm test`
Expected: All tests pass, no regressions

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/routes/interview.js dashboard-server/tests/unit/position-question-templates.test.mjs
git commit -m "feat(interview): auto-load position template on first round interview config"
```

---

### Task 4: Position Detail — Collapsible Interview Questions Section with Stepper Wizard

**Files:**
- Modify: `nbi_project_dashboard.html:21392-21505` (position detail panel body, `openPositionDetail` function)

This is the largest frontend task. The stepper wizard renders inside the position detail slide-in panel as a collapsible section below the candidates table.

- [ ] **Step 1: Add CSS for the stepper wizard**

Add these styles near the existing `.position-detail__` styles (around line 2404 in the CSS section):

```css
.pqt-section { margin-top: var(--space-lg); border-top: 1px solid var(--border-default); padding-top: var(--space-md); }
.pqt-header { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px 0; user-select: none; }
.pqt-header__chevron { transition: transform 0.15s; font-size: 10px; color: var(--text-muted); }
.pqt-header__chevron.open { transform: rotate(90deg); }
.pqt-header__title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 600; }
.pqt-header__badge { font-size: 0.7rem; padding: 1px 6px; border-radius: 8px; background: var(--accent); color: #fff; font-weight: 600; }
.pqt-stepper { display: flex; gap: 3px; margin-bottom: 12px; }
.pqt-step { flex: 1; padding: 6px 4px; text-align: center; border-radius: 4px; font-size: 0.68rem; cursor: pointer; transition: background 0.15s, border-color 0.15s; border: 1px solid transparent; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pqt-step--done { background: color-mix(in srgb, var(--success) 15%, var(--bg-card)); color: var(--success); }
.pqt-step--active { background: color-mix(in srgb, var(--accent) 12%, var(--bg-card)); color: var(--accent); border-color: var(--accent); font-weight: 600; }
.pqt-step--pending { background: var(--bg-elevated); color: var(--text-muted); }
.pqt-question { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; border-radius: 6px; margin-bottom: 3px; cursor: pointer; transition: background 0.1s; border: 1px solid transparent; }
.pqt-question:hover { background: var(--bg-elevated); }
.pqt-question--selected { background: color-mix(in srgb, var(--accent) 8%, var(--bg-card)); border-color: var(--accent); }
.pqt-question__text { font-size: 0.82rem; line-height: 1.5; color: var(--text-primary); }
.pqt-question--selected .pqt-question__text { color: var(--text-primary); }
.pqt-question:not(.pqt-question--selected) .pqt-question__text { color: var(--text-muted); }
.pqt-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--border-default); }
.pqt-total { font-size: 0.78rem; color: var(--accent); font-weight: 600; }
```

- [ ] **Step 2: Add the stepper wizard rendering logic**

Add a new function `renderPositionQuestionTemplate(positionId, positionTitle, clientId)` in the Hiring section of the JS (near `openPositionDetail`, around line 21500). This function:

1. Fetches available questions via `GET /api/interview-questions?position_title={title}&client_id={clientId}`
2. Fetches current template via `GET /api/positions/{id}/question-template`
3. Renders the stepper wizard with 5 category steps
4. Handles checkbox clicks (POST/DELETE to template API with optimistic UI)

```javascript
async function renderPositionQuestionTemplate(positionId, positionTitle, clientId) {
  const container = document.getElementById('pqtContainer_' + positionId.replace(/-/g, ''));
  if (!container) return;

  const categoryOrder = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
  const categoryLabels = { culture: 'Culture', technical: 'Technical', collaboration: 'Collab', leadership: 'Leadership', depth: 'Depth' };

  let allQuestions = [];
  let templateIds = new Set();
  let activeStep = 0;

  try {
    const params = new URLSearchParams();
    if (positionTitle) params.set('position_title', positionTitle);
    if (clientId) params.set('client_id', clientId);
    const [qResp, tResp] = await Promise.all([
      authFetch('/api/interview-questions?' + params),
      authFetch('/api/positions/' + positionId + '/question-template'),
    ]);
    allQuestions = await qResp.json();
    const templateRows = await tResp.json();
    templateIds = new Set(templateRows.map(r => r.question_id));
  } catch (e) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0">Failed to load questions.</div>';
    return;
  }

  if (allQuestions.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0;font-style:italic">No questions found for ' + esc(positionTitle || 'this position') + '. Questions can be added in the Question Bank tab.</div>';
    return;
  }

  const byCategory = {};
  for (const cat of categoryOrder) byCategory[cat] = allQuestions.filter(q => q.category === cat);

  function render() {
    const cat = categoryOrder[activeStep];
    const catQuestions = byCategory[cat] || [];
    const catSelected = catQuestions.filter(q => templateIds.has(q.id)).length;
    const totalSelected = allQuestions.filter(q => templateIds.has(q.id)).length;

    let html = '<div class="pqt-stepper">';
    for (let i = 0; i < categoryOrder.length; i++) {
      const c = categoryOrder[i];
      const count = (byCategory[c] || []).filter(q => templateIds.has(q.id)).length;
      const cls = i === activeStep ? 'pqt-step--active' : count > 0 ? 'pqt-step--done' : 'pqt-step--pending';
      html += '<div class="pqt-step ' + cls + '" onclick="window._pqtSetStep(' + i + ')">';
      html += (count > 0 && i !== activeStep ? '&#10003; ' : '') + esc(categoryLabels[c]) + (count > 0 ? ' (' + count + ')' : '');
      html += '</div>';
    }
    html += '</div>';

    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    html += '<div><div style="font-weight:600;font-size:0.9rem;color:var(--text-primary)">' + esc(categoryLabels[cat]) + ' Questions</div>';
    html += '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">' + catQuestions.length + ' available' + (positionTitle ? ' for ' + esc(positionTitle) : '') + ' · ' + catSelected + ' selected</div></div>';
    html += '<div style="display:flex;gap:6px">';
    html += '<button class="btn btn--ghost" style="font-size:0.7rem;padding:2px 8px" onclick="window._pqtSelectAll()">Select All</button>';
    html += '<button class="btn btn--ghost" style="font-size:0.7rem;padding:2px 8px" onclick="window._pqtClearAll()">Clear</button>';
    html += '</div></div>';

    for (const q of catQuestions) {
      const sel = templateIds.has(q.id);
      html += '<div class="pqt-question ' + (sel ? 'pqt-question--selected' : '') + '" onclick="window._pqtToggle(\'' + q.id + '\')">';
      html += '<span style="font-size:16px;margin-top:-2px;flex-shrink:0;color:' + (sel ? 'var(--accent)' : 'var(--text-muted)') + '">' + (sel ? '&#9745;' : '&#9744;') + '</span>';
      html += '<span class="pqt-question__text">' + esc(q.question_text) + '</span>';
      html += '</div>';
    }

    html += '<div class="pqt-nav">';
    html += activeStep > 0 ? '<button class="btn btn--sm" onclick="window._pqtSetStep(' + (activeStep - 1) + ')">&larr; ' + esc(categoryLabels[categoryOrder[activeStep - 1]]) + '</button>' : '<span></span>';
    html += '<span class="pqt-total">' + totalSelected + ' of ' + allQuestions.length + ' selected</span>';
    html += activeStep < 4 ? '<button class="btn btn--sm btn--primary" onclick="window._pqtSetStep(' + (activeStep + 1) + ')">' + esc(categoryLabels[categoryOrder[activeStep + 1]]) + ' &rarr;</button>' : '<span></span>';
    html += '</div>';

    container.innerHTML = html;
  }

  window._pqtSetStep = function(i) { activeStep = i; render(); };

  window._pqtToggle = async function(qId) {
    const wasSelected = templateIds.has(qId);
    if (wasSelected) { templateIds.delete(qId); } else { templateIds.add(qId); }
    render();
    // Update badge count
    const badge = document.getElementById('pqtBadge_' + positionId.replace(/-/g, ''));
    if (badge) badge.textContent = templateIds.size;
    try {
      if (wasSelected) {
        await authFetch('/api/positions/' + positionId + '/question-template/questions/' + qId, { method: 'DELETE' });
      } else {
        await authFetch('/api/positions/' + positionId + '/question-template/questions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_id: qId }),
        });
      }
    } catch (e) {
      if (wasSelected) { templateIds.add(qId); } else { templateIds.delete(qId); }
      render();
      showToast('Failed to save question — try again', 'error');
    }
  };

  window._pqtSelectAll = async function() {
    const cat = categoryOrder[activeStep];
    const catQuestions = byCategory[cat] || [];
    for (const q of catQuestions) {
      if (!templateIds.has(q.id)) {
        templateIds.add(q.id);
        authFetch('/api/positions/' + positionId + '/question-template/questions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_id: q.id }),
        }).catch(function() {});
      }
    }
    render();
    const badge = document.getElementById('pqtBadge_' + positionId.replace(/-/g, ''));
    if (badge) badge.textContent = templateIds.size;
  };

  window._pqtClearAll = async function() {
    const cat = categoryOrder[activeStep];
    const catQuestions = byCategory[cat] || [];
    for (const q of catQuestions) {
      if (templateIds.has(q.id)) {
        templateIds.delete(q.id);
        authFetch('/api/positions/' + positionId + '/question-template/questions/' + q.id, { method: 'DELETE' }).catch(function() {});
      }
    }
    render();
    const badge = document.getElementById('pqtBadge_' + positionId.replace(/-/g, ''));
    if (badge) badge.textContent = templateIds.size;
  };

  render();
}
```

- [ ] **Step 3: Add the collapsible section to the position detail panel**

In the `openPositionDetail` function, add the Interview Questions section just before the closing `</div>` of `.position-detail__body` (line 21505). Insert before `</div>`;`:

```javascript
      ${!isClientUser() ? `<div class="pqt-section">
        <div class="pqt-header" onclick="var c=document.getElementById('pqtContainer_${p.id.replace(/-/g, '')}');var ch=this.querySelector('.pqt-header__chevron');if(c.style.display==='none'){c.style.display='block';ch.classList.add('open');renderPositionQuestionTemplate('${p.id}','${esc(p.title)}','${p.client_id||''}')}else{c.style.display='none';ch.classList.remove('open')}">
          <span class="pqt-header__chevron">&#9654;</span>
          <span class="pqt-header__title">Interview Questions</span>
          <span class="pqt-header__badge" id="pqtBadge_${p.id.replace(/-/g, '')}">—</span>
        </div>
        <div id="pqtContainer_${p.id.replace(/-/g, '')}" style="display:none">
          <div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0">Loading...</div>
        </div>
      </div>` : ''}
```

Also fetch the template count on panel open to populate the badge. Add after `overlay.style.display = 'block';` (line 21507):

```javascript
  if (!isClientUser()) {
    authFetch('/api/positions/' + p.id + '/question-template').then(r => r.json()).then(rows => {
      const badge = document.getElementById('pqtBadge_' + p.id.replace(/-/g, ''));
      if (badge) badge.textContent = rows.length || '0';
    }).catch(() => {});
  }
```

- [ ] **Step 4: Test visually**

1. Restart PM2: `pm2 restart nbi-dashboard`
2. Open http://localhost:8888/nbi_project_dashboard.html
3. Navigate to Hiring > Positions tab
4. Click on a position (e.g. "Lead Animator" for Couch Heroes)
5. Verify: "Interview Questions" collapsible section appears at bottom of panel
6. Click to expand — stepper wizard loads with 5 category pills
7. Click questions to select/deselect — verify optimistic toggle + API calls
8. Click category pills to navigate between steps
9. Verify Select All / Clear work
10. Close and reopen panel — badge should show correct count

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(interview): position detail stepper wizard for question template setup"
```

---

### Task 5: Modify openInterviewConfig — Pre-Fill from Template

**Files:**
- Modify: `nbi_project_dashboard.html:22094-22259` (`openInterviewConfig` function)

- [ ] **Step 1: Modify openInterviewConfig to fetch and pre-fill template**

Replace the data fetching block at the top of `openInterviewConfig` (lines 22098-22107) with:

```javascript
  let allQuestions = [];
  let users = [];
  let templateQuestionIds = [];
  try {
    const fetches = [
      authFetch('/api/interview-questions?' + params),
      authFetch('/api/users'),
    ];
    if (positionId) {
      fetches.push(authFetch('/api/positions/' + positionId + '/question-template'));
    }
    const responses = await Promise.all(fetches);
    allQuestions = await responses[0].json();
    users = await responses[1].json();
    if (responses[2]) {
      const templateRows = await responses[2].json();
      templateQuestionIds = templateRows.map(r => r.question_id);
    }
  } catch (e) {}
```

- [ ] **Step 2: Pre-fill selectedIds from template on first round**

After `const selectedIds = new Set();` (line 22117), add:

```javascript
  // Pre-fill from position template if this is the first round
  if (templateQuestionIds.length > 0) {
    // Check if candidate already has interview configs (i.e. not first round)
    let isFirstRound = true;
    try {
      const configResp = await authFetch('/api/interview-configs?candidate_id=' + candidateId);
      const configs = await configResp.json();
      if (Array.isArray(configs) && configs.length > 0) isFirstRound = false;
    } catch (e) {}

    if (isFirstRound) {
      for (const qId of templateQuestionIds) selectedIds.add(qId);
    }
  }
```

- [ ] **Step 3: Add template info banner**

In the `renderConfigPanel` function, add a banner when template questions are pre-loaded. After the tab bar HTML (line 22194), add before the questions content:

```javascript
      (activeTab === 'questions'
        ? (templateQuestionIds.length > 0 && selectedIds.size > 0
          ? '<div style="background:color-mix(in srgb, var(--accent) 8%, var(--bg-card));border:1px solid color-mix(in srgb, var(--accent) 30%, transparent);border-radius:6px;padding:8px 12px;font-size:0.78rem;color:var(--accent);margin-bottom:12px">&#9432; Pre-loaded ' + selectedIds.size + ' questions from ' + esc(position ? position.title : 'position') + ' template. You can add or remove questions for this candidate.</div>'
          : '')
        + '<div style="display:flex; ...'   // rest of existing code
```

- [ ] **Step 4: Test visually**

1. Set up a position template (e.g. add 5 questions to Lead Animator template via the stepper)
2. Create a new candidate for that position
3. Open "Configure Interview" for the candidate
4. Verify: 5 questions are pre-selected, info banner shows
5. Verify: can remove pre-selected questions (X or uncheck)
6. Verify: can add additional questions
7. Create a second interview round for the same candidate — verify template does NOT pre-fill

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(interview): pre-fill interview config from position template on first round"
```

---

### Task 6: Final — Restart PM2, Run All Tests, Verify E2E

**Files:** None (verification only)

- [ ] **Step 1: Restart PM2**

```bash
pm2 restart nbi-dashboard
```

- [ ] **Step 2: Run full unit test suite**

```bash
cd dashboard-server && npm test
```

Expected: All tests pass including the new `position-question-templates.test.mjs`

- [ ] **Step 3: Run E2E tests**

```bash
cd dashboard-server && npm run test:e2e
```

Expected: All existing E2E tests still pass

- [ ] **Step 4: Manual verification checklist**

Open http://localhost:8888/nbi_project_dashboard.html and verify:

1. **Position detail stepper:** Open a position → expand Interview Questions → stepper wizard loads with 5 categories → can select/deselect questions → badge updates → navigation works
2. **Template persistence:** Select questions, close panel, reopen → selections persist
3. **Candidate pre-fill:** Create interview for a candidate whose position has a template → questions pre-loaded → banner shows → can override
4. **Second round:** Create another round for same candidate → no pre-fill → manual selection works
5. **Phone Screen:** Create Phone Screen round → no questions section shown
6. **No template:** Open interview config for a candidate with no position → existing picker works as before
7. **Existing functionality:** Scorecard flow still works, question bank tab still works

- [ ] **Step 5: Commit any fixes**

If any issues found during verification, fix and commit separately.

- [ ] **Step 6: Update session log**

Update `projects/nbi_dashboard/session_logs/2026-06-04_session.md` and `projects/nbi_dashboard/live_state/work_completed.md`.
