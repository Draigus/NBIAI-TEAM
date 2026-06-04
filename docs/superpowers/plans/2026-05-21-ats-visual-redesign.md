# ATS Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the hiring UI from basic kanban cards into a full ATS with 5 tabbed views (Pipeline, Positions, Database, Calendar, Metrics), rich candidate cards, interview scheduling, activity trails, and proper spacing.

**Architecture:** Backend is 80% done — migrations 046-050 already created `candidate_comments`, `candidate_stage_history`, `interview_rounds`, `interview_scorecards`, rejection fields, source/tags/email on candidates, and enriched position fields. This plan adds 2 small migrations, ~6 new API endpoints, and a complete frontend rebuild of the hiring section in `nbi_project_dashboard.html` (~2000 lines of JS/HTML to replace/add) and hiring CSS inline styles.

**Tech Stack:** Express 4 + PostgreSQL (existing), vanilla JS SPA in `nbi_project_dashboard.html`, inline `<style>` blocks for CSS.

**Spec:** `docs/superpowers/specs/2026-05-21-ats-visual-redesign-design.md`

**Key codebase facts:**
- All frontend hiring code is in `nbi_project_dashboard.html` (no modular JS/CSS files for hiring)
- Server routes: `dashboard-server/routes/hiring.js` (935 lines), `dashboard-server/routes/hiring-metrics.js` (229 lines)
- Existing tables used: `candidates`, `hiring_positions`, `candidate_comments`, `candidate_stage_history`, `interview_rounds`, `interview_scorecards`, `onboarding_checklist_items`
- Existing fields on candidates: source, source_detail, email, tags, rejection_reason, rejection_category, consent_given, consent_date, retention_expires_at
- `VALID_SOURCES` in hiring.js: `['referral', 'linkedin', 'inbound', 'agency', 'job-board', 'internal', 'other']`
- `VALID_REJECTION_CATEGORIES`: `['unqualified', 'culture-mismatch', 'compensation', 'candidate-withdrew', 'position-filled', 'no-response', 'failed-interview', 'other']`
- Stages: `['sourcing', 'interviews', 'offer', 'onboarding', 'onboarded']` (per-client custom via `clients.hiring_stages`)
- Tests: `dashboard-server/tests/unit/` (Vitest), `dashboard-server/tests/e2e/` (Playwright)

**Spec-to-code mapping (where the spec assumed new tables, use existing ones):**
| Spec concept | Actual implementation |
|---|---|
| `interviews` table | Use existing `interview_rounds` + `interview_scorecards` |
| `candidate_comments` table | Already exists (migration 046) |
| `archive_reason` / `archive_detail` | Use existing `rejection_reason` / `rejection_category` |
| Activity trail | Combine `candidate_stage_history` (stage changes) + new `candidate_activity` (other events) |
| `candidates.source` | Already exists (migration 046) |

---

## Task 1: Migration — stage_changed_at Column

**Files:**
- Create: `dashboard-server/migrations/051_stage_changed_at.sql`

- [ ] **Step 1: Write migration**

```sql
-- 051_stage_changed_at.sql
-- Add stage_changed_at for days-in-stage calculation on cards.
-- Backfill from candidate_stage_history (most recent transition per candidate).

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ;

-- Backfill from stage history where available
UPDATE candidates ca SET stage_changed_at = sub.last_move
FROM (
  SELECT candidate_id, MAX(moved_at) AS last_move
  FROM candidate_stage_history
  GROUP BY candidate_id
) sub
WHERE ca.id = sub.candidate_id AND ca.stage_changed_at IS NULL;

-- For candidates with no stage history, fall back to updated_at
UPDATE candidates SET stage_changed_at = COALESCE(updated_at, created_at)
WHERE stage_changed_at IS NULL;

-- Set default for new candidates
ALTER TABLE candidates ALTER COLUMN stage_changed_at SET DEFAULT NOW();
```

- [ ] **Step 2: Apply migration**

Run: `cd dashboard-server && node init-db.js`
Expected: Migration 051 applies without error.

- [ ] **Step 3: Verify**

Run: `cd dashboard-server && node -e "const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query('SELECT id, stage, stage_changed_at FROM candidates LIMIT 5').then(r=>{console.log(r.rows);p.end()})"`
Expected: All rows have non-null `stage_changed_at` values.

- [ ] **Step 4: Update PATCH to auto-stamp stage_changed_at**

In `dashboard-server/routes/hiring.js`, find the stage change block inside the PATCH endpoint (around line 773, the `INSERT INTO candidate_stage_history` block). Add `stage_changed_at` to the UPDATE:

After line 777 (`[req.params.id, oldStage, body.stage, req.user.displayName || 'unknown']`), add:

```javascript
        await dbClient.query(
          'UPDATE candidates SET stage_changed_at = NOW() WHERE id = $1',
          [req.params.id]
        );
```

- [ ] **Step 5: Add stage_changed_at to GET /api/candidates query**

In `dashboard-server/routes/hiring.js`, find the GET `/api/candidates` query (line 468). Add `ca.stage_changed_at` to the SELECT list, after `ca.rejection_category,`:

Change line 474 from:
```
               ca.rejection_reason, ca.rejection_category,
```
to:
```
               ca.rejection_reason, ca.rejection_category, ca.stage_changed_at,
```

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/migrations/051_stage_changed_at.sql dashboard-server/routes/hiring.js
git commit -m "feat: add stage_changed_at column for days-in-stage calculation"
```

---

## Task 2: Migration — candidate_activity Table

**Files:**
- Create: `dashboard-server/migrations/052_candidate_activity.sql`

- [ ] **Step 1: Write migration**

```sql
-- 052_candidate_activity.sql
-- General activity log for non-stage events (CV uploads, source changes, etc.)
-- Stage changes remain in candidate_stage_history; this table covers everything else.

CREATE TABLE IF NOT EXISTS candidate_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    detail TEXT,
    actor TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_candidate_activity_candidate ON candidate_activity(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_activity_created ON candidate_activity(created_at);
```

- [ ] **Step 2: Apply migration**

Run: `cd dashboard-server && node init-db.js`
Expected: Migration 052 applies without error.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/migrations/052_candidate_activity.sql
git commit -m "feat: add candidate_activity table for non-stage event logging"
```

---

## Task 3: API — Comments CRUD

**Files:**
- Modify: `dashboard-server/routes/hiring.js` (add endpoints after the existing candidate routes, before `return router`)
- Create: `dashboard-server/tests/unit/hiring-comments.test.mjs`

- [ ] **Step 1: Write tests**

Create `dashboard-server/tests/unit/hiring-comments.test.mjs`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

function buildMockCtx(queryResults = {}) {
  const pool = {
    query: vi.fn(async (sql) => {
      for (const [pattern, result] of Object.entries(queryResults)) {
        if (sql.includes(pattern)) return result;
      }
      return { rows: [] };
    }),
  };
  return {
    pool,
    log: vi.fn(),
    requireNBI: (req, res, next) => next(),
    requireAdmin: (req, res, next) => next(),
    isValidUuid: (v) => /^[0-9a-f]{8}-/.test(v),
    validateLength: () => null,
    auditLog: vi.fn(),
  };
}

describe('Candidate Comments API', () => {
  it('GET /api/candidates/:id/comments returns comments', async () => {
    const ctx = buildMockCtx({
      'FROM candidate_comments': {
        rows: [
          { id: 'c1', candidate_id: 'cand1', author: 'Glen', body: 'Great candidate', internal: false, created_at: new Date() },
        ],
      },
    });
    const router = (await import('../../routes/hiring.js')).default(ctx);
    // Verify the route was registered
    const routes = router.stack.filter(r => r.route && r.route.path === '/api/candidates/:id/comments');
    expect(routes.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/hiring-comments.test.mjs`
Expected: FAIL — no route matching `/api/candidates/:id/comments`.

- [ ] **Step 3: Add comments endpoints to hiring.js**

In `dashboard-server/routes/hiring.js`, before `return router;` (last line), add:

```javascript
  // ==================== CANDIDATE COMMENTS ====================

  router.get('/api/candidates/:id/comments', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    const internalFilter = req.user.clientId ? 'AND cc.internal = false' : '';
    try {
      const { rows } = await pool.query(
        `SELECT cc.id, cc.candidate_id, cc.author, cc.body, cc.internal, cc.created_at, cc.updated_at
         FROM candidate_comments cc
         WHERE cc.candidate_id = $1 ${internalFilter}
         ORDER BY cc.created_at DESC`,
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      log('error', 'Hiring', 'Failed to list comments', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.post('/api/candidates/:id/comments', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    const { body: commentBody, internal } = req.body || {};
    if (!commentBody || !commentBody.trim()) return res.status(400).json({ error: 'body is required' });
    const lenErr = validateLength(commentBody, 'body');
    if (lenErr) return res.status(400).json({ error: lenErr });
    const isInternal = req.user.clientId ? false : (internal === true);
    try {
      const { rows } = await pool.query(
        `INSERT INTO candidate_comments (candidate_id, author, author_user_id, body, internal)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.id, req.user.displayName || 'unknown', req.user.id || null, commentBody.trim(), isInternal]
      );
      await pool.query(
        `INSERT INTO candidate_activity (candidate_id, event_type, detail, actor)
         VALUES ($1, 'comment_added', $2, $3)`,
        [req.params.id, commentBody.trim().slice(0, 80), req.user.displayName || 'unknown']
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      log('error', 'Hiring', 'Failed to create comment', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.delete('/api/candidates/:id/comments/:commentId', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.commentId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    try {
      const { rowCount } = await pool.query(
        'DELETE FROM candidate_comments WHERE id = $1 AND candidate_id = $2',
        [req.params.commentId, req.params.id]
      );
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Hiring', 'Failed to delete comment', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/hiring-comments.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/hiring-comments.test.mjs
git commit -m "feat: add candidate comments CRUD endpoints"
```

---

## Task 4: API — Interview Rounds CRUD + Conflict Check

**Files:**
- Modify: `dashboard-server/routes/hiring.js`
- Create: `dashboard-server/tests/unit/hiring-interviews.test.mjs`

The existing `interview_rounds` table has: id, candidate_id, round_number, title, scheduled_at, duration_minutes, location, status, outcome, outcome_notes, created_at, updated_at. The related `interview_scorecards` table has per-interviewer feedback.

- [ ] **Step 1: Write tests**

Create `dashboard-server/tests/unit/hiring-interviews.test.mjs`:

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('Interview Rounds API', () => {
  it('should have GET /api/interview-rounds route registered', async () => {
    const ctx = {
      pool: { query: vi.fn(async () => ({ rows: [] })) },
      log: vi.fn(),
      requireNBI: (req, res, next) => next(),
      requireAdmin: (req, res, next) => next(),
      isValidUuid: (v) => /^[0-9a-f]{8}-/.test(v),
      validateLength: () => null,
      auditLog: vi.fn(),
      upload: { single: () => (req, res, next) => next() },
      uploadDir: '/tmp',
      shiftForInsert: vi.fn(),
      reorderInGroup: vi.fn(),
      buildPatchQuery: vi.fn(() => ({ updates: [], vals: [], nextIdx: 1 })),
      createNotification: vi.fn(),
    };
    const router = (await import('../../routes/hiring.js')).default(ctx);
    const routes = router.stack
      .filter(r => r.route)
      .map(r => `${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`);
    expect(routes).toContain('GET /api/interview-rounds');
    expect(routes).toContain('GET /api/interview-rounds/check-conflict');
    expect(routes).toContain('POST /api/interview-rounds');
    expect(routes).toContain('PATCH /api/interview-rounds/:id');
    expect(routes).toContain('DELETE /api/interview-rounds/:id');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/hiring-interviews.test.mjs`
Expected: FAIL — routes not registered.

- [ ] **Step 3: Add interview endpoints to hiring.js**

In `dashboard-server/routes/hiring.js`, before the comments section, add:

```javascript
  // ==================== INTERVIEW ROUNDS ====================

  const VALID_INTERVIEW_STATUSES = ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'];
  const VALID_INTERVIEW_OUTCOMES = ['pending', 'passed', 'failed', 'rescheduled', 'no_show'];

  router.get('/api/interview-rounds', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { candidate_id, from, to, interviewer } = req.query;
    const where = [];
    const vals = [];
    let i = 1;
    if (candidate_id) {
      if (!isValidUuid(candidate_id)) return res.status(400).json({ error: 'Invalid candidate_id' });
      where.push(`ir.candidate_id = $${i++}`); vals.push(candidate_id);
    }
    if (from) { where.push(`ir.scheduled_at >= $${i++}::timestamptz`); vals.push(from); }
    if (to) { where.push(`ir.scheduled_at < ($${i++}::date + INTERVAL '1 day')`); vals.push(to); }
    if (interviewer) {
      where.push(`EXISTS (SELECT 1 FROM interview_scorecards isc WHERE isc.round_id = ir.id AND isc.interviewer_name ILIKE $${i++})`);
      vals.push(`%${interviewer}%`);
    }
    if (req.user.clientId) {
      where.push(`ca.client_id = $${i++}`); vals.push(req.user.clientId);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    try {
      const { rows } = await pool.query(`
        SELECT ir.*, ca.name AS candidate_name, ca.role AS candidate_role,
               ca.client_id, c.name AS client_name,
               (SELECT json_agg(json_build_object('id', isc.id, 'interviewer_name', isc.interviewer_name, 'overall_rating', isc.overall_rating, 'recommendation', isc.recommendation))
                FROM interview_scorecards isc WHERE isc.round_id = ir.id) AS scorecards
        FROM interview_rounds ir
        JOIN candidates ca ON ca.id = ir.candidate_id
        LEFT JOIN clients c ON c.id = ca.client_id
        ${whereClause}
        ORDER BY ir.scheduled_at ASC
      `, vals);
      res.json(rows);
    } catch (e) {
      log('error', 'Hiring', 'Failed to list interview rounds', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.get('/api/interview-rounds/check-conflict', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { interviewer_name, scheduled_at, duration_minutes, exclude_id } = req.query;
    if (!interviewer_name || !scheduled_at) return res.status(400).json({ error: 'interviewer_name and scheduled_at required' });
    const duration = parseInt(duration_minutes) || 60;
    const startTime = new Date(scheduled_at);
    const endTime = new Date(startTime.getTime() + duration * 60000);
    try {
      const excludeClause = exclude_id && isValidUuid(exclude_id) ? 'AND ir.id != $4' : '';
      const vals = [interviewer_name, startTime.toISOString(), endTime.toISOString()];
      if (exclude_id && isValidUuid(exclude_id)) vals.push(exclude_id);
      const { rows } = await pool.query(`
        SELECT ir.id, ir.scheduled_at, ir.duration_minutes, ir.title,
               ca.name AS candidate_name
        FROM interview_rounds ir
        JOIN candidates ca ON ca.id = ir.candidate_id
        JOIN interview_scorecards isc ON isc.round_id = ir.id
        WHERE isc.interviewer_name = $1
          AND ir.status NOT IN ('cancelled')
          AND ir.scheduled_at < $3::timestamptz
          AND (ir.scheduled_at + (ir.duration_minutes || ' minutes')::interval) > $2::timestamptz
          ${excludeClause}
        LIMIT 1
      `, vals);
      if (rows.length > 0) {
        res.json({ conflict: true, conflicting_interview: rows[0] });
      } else {
        res.json({ conflict: false });
      }
    } catch (e) {
      log('error', 'Hiring', 'Conflict check failed', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.post('/api/interview-rounds', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { candidate_id, title, scheduled_at, duration_minutes, location, interviewer_name } = req.body || {};
    if (!candidate_id || !isValidUuid(candidate_id)) return res.status(400).json({ error: 'Valid candidate_id required' });
    if (!title || !title.trim()) return res.status(400).json({ error: 'title required' });
    try {
      const { rows: [maxRound] } = await pool.query(
        'SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round FROM interview_rounds WHERE candidate_id = $1',
        [candidate_id]
      );
      const { rows } = await pool.query(
        `INSERT INTO interview_rounds (candidate_id, round_number, title, scheduled_at, duration_minutes, location, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'scheduled') RETURNING *`,
        [candidate_id, maxRound.next_round, title.trim(), scheduled_at || null, duration_minutes || 60, location || null]
      );
      const roundId = rows[0].id;
      if (interviewer_name) {
        await pool.query(
          `INSERT INTO interview_scorecards (round_id, interviewer_name) VALUES ($1, $2)`,
          [roundId, interviewer_name]
        );
      }
      await pool.query(
        `INSERT INTO candidate_activity (candidate_id, event_type, detail, actor)
         VALUES ($1, 'interview_scheduled', $2, $3)`,
        [candidate_id, `${title} ${scheduled_at ? 'on ' + new Date(scheduled_at).toLocaleDateString() : '(unscheduled)'}`, req.user.displayName || 'unknown']
      );
      const { rows: fullRows } = await pool.query(`
        SELECT ir.*, (SELECT json_agg(json_build_object('id', isc.id, 'interviewer_name', isc.interviewer_name))
                      FROM interview_scorecards isc WHERE isc.round_id = ir.id) AS scorecards
        FROM interview_rounds ir WHERE ir.id = $1
      `, [roundId]);
      res.status(201).json(fullRows[0]);
    } catch (e) {
      log('error', 'Hiring', 'Failed to create interview round', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.patch('/api/interview-rounds/:id', requireNBI, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
    const allowed = ['title', 'scheduled_at', 'duration_minutes', 'location', 'status', 'outcome', 'outcome_notes'];
    const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowed);
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    updates.push('updated_at = NOW()');
    vals.push(req.params.id);
    try {
      const { rows } = await pool.query(
        `UPDATE interview_rounds SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
        vals
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      if (req.body.outcome && req.body.outcome !== 'pending') {
        await pool.query(
          `INSERT INTO candidate_activity (candidate_id, event_type, detail, actor)
           VALUES ($1, 'interview_outcome', $2, $3)`,
          [rows[0].candidate_id, `${rows[0].title}: ${req.body.outcome}`, req.user.displayName || 'unknown']
        );
      }
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Hiring', 'Failed to update interview round', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.delete('/api/interview-rounds/:id', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
    try {
      const { rowCount } = await pool.query('DELETE FROM interview_rounds WHERE id = $1', [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Hiring', 'Failed to delete interview round', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/hiring-interviews.test.mjs`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `cd dashboard-server && npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/hiring-interviews.test.mjs
git commit -m "feat: add interview rounds CRUD + conflict check endpoints"
```

---

## Task 5: API — Activity + Stage History Read Endpoints

**Files:**
- Modify: `dashboard-server/routes/hiring.js`

- [ ] **Step 1: Add unified activity timeline endpoint**

In `dashboard-server/routes/hiring.js`, before the comments section, add:

```javascript
  // ==================== ACTIVITY TIMELINE ====================

  router.get('/api/candidates/:id/activity', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    try {
      // Merge stage_history + candidate_activity + comments into one timeline
      const { rows } = await pool.query(`
        (
          SELECT 'stage_change' AS event_type,
                 ('Stage: ' || COALESCE(from_stage, '?') || ' → ' || to_stage) AS detail,
                 moved_by AS actor,
                 moved_at AS created_at
          FROM candidate_stage_history
          WHERE candidate_id = $1
        )
        UNION ALL
        (
          SELECT event_type, detail, actor, created_at
          FROM candidate_activity
          WHERE candidate_id = $1
        )
        UNION ALL
        (
          SELECT 'comment' AS event_type,
                 body AS detail,
                 author AS actor,
                 created_at
          FROM candidate_comments
          WHERE candidate_id = $1
                ${req.user.clientId ? 'AND internal = false' : ''}
        )
        ORDER BY created_at DESC
        LIMIT $2
      `, [req.params.id, limit]);
      res.json(rows);
    } catch (e) {
      log('error', 'Hiring', 'Failed to load activity', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 2: Add activity logging to existing PATCH (CV upload, source change)**

In `dashboard-server/routes/hiring.js`, find the CV upload endpoint (around line 878, `router.post('/api/candidates/:id/cv'`). After the successful UPDATE query that sets `cv_filename`, add:

```javascript
      await pool.query(
        `INSERT INTO candidate_activity (candidate_id, event_type, detail, actor)
         VALUES ($1, 'cv_uploaded', $2, $3)`,
        [req.params.id, req.file.originalname, req.user.displayName || 'unknown']
      );
```

- [ ] **Step 3: Run tests**

Run: `cd dashboard-server && npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/routes/hiring.js
git commit -m "feat: add unified activity timeline endpoint + activity auto-logging"
```

---

## Task 6: Frontend — Tab Navigation System + Summary Banner

**Files:**
- Modify: `nbi_project_dashboard.html` — the `renderHiringView` function (starts ~line 19530)

This is the foundation for all subsequent frontend tasks. Replace the current kanban/by-client toggle with a 5-tab system.

- [ ] **Step 1: Add CSS for tab navigation and summary banner**

Find the hiring CSS block in `nbi_project_dashboard.html` (starts around line 2106). Add these styles:

```css
/* ATS Tab Navigation */
.ats-tabs { display: flex; gap: 2px; border-bottom: 2px solid rgba(255,255,255,0.06); margin-bottom: 16px; }
.ats-tab { padding: 10px 20px; font-size: 13px; color: #888; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 0.15s, border-color 0.15s; }
.ats-tab:hover { color: #ccc; }
.ats-tab.active { color: #7c3aed; border-bottom-color: #7c3aed; font-weight: 600; }

/* Summary Banner */
.ats-summary { display: flex; gap: 24px; padding: 10px 16px; background: rgba(124,58,237,0.06); border-radius: 8px; margin-bottom: 14px; font-size: 12px; }
.ats-summary-item { display: flex; align-items: center; gap: 6px; color: #aaa; cursor: pointer; transition: color 0.15s; }
.ats-summary-item:hover { color: #fff; }
.ats-summary-item .ats-summary-count { font-weight: 700; font-size: 14px; color: #e0e0e0; }
.ats-summary-item .ats-summary-count.warn { color: #f59e0b; }
.ats-summary-item .ats-summary-count.danger { color: #ef4444; }

/* ATS Controls Bar */
.ats-controls { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.ats-search { flex: 1; min-width: 200px; background: #23234a; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 7px 12px; color: #e0e0e0; font-size: 13px; outline: none; }
.ats-search:focus { border-color: #7c3aed; }
.ats-filter-btn { background: #23234a; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 7px 12px; color: #60a5fa; font-size: 12px; cursor: pointer; }
.ats-filter-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.ats-chip { background: rgba(245,158,11,0.12); color: #f59e0b; padding: 3px 10px; border-radius: 12px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
.ats-chip .remove { opacity: 0.6; }
.ats-chip .remove:hover { opacity: 1; }
```

- [ ] **Step 2: Replace renderHiringView with tab-based system**

Find `async function renderHiringView(container)` (starts ~line 19530 in `nbi_project_dashboard.html`). This function is ~80 lines that builds the kanban or by-client view. Replace its body to render the tab system. The function must:

1. Render the summary banner (computed from `_candidatesData`)
2. Render 5 tabs: Pipeline, Positions, Database, Calendar, Metrics
3. Render sub-controls specific to the active tab
4. Call the appropriate render function: `renderPipelineTab()`, `renderPositionsTab()`, `renderDatabaseTab()`, `renderCalendarTab()`, `renderMetricsTab()`

The tab state uses `window._hiringActiveTab` (default: 'pipeline').

Replace the function body with:

```javascript
async function renderHiringView(container) {
  if (!window._hiringLoaded) {
    window._hiringLoaded = true;
    await Promise.all([loadCandidates(), loadHiringPositions()]);
  }
  const candidates = window._candidatesData || [];
  const active = candidates.filter(c => !c.archived_at);
  const activeTab = window._hiringActiveTab || 'pipeline';

  // Summary banner
  const today = new Date().toISOString().slice(0, 10);
  const needsAction = active.filter(c => {
    if (!c.stage_changed_at) return false;
    const days = Math.floor((Date.now() - new Date(c.stage_changed_at).getTime()) / 86400000);
    return days > 14 || !c.stage_assignees || Object.values(c.stage_assignees).flat().length === 0;
  }).length;
  const offersCount = active.filter(c => c.stage === 'offer').length;
  const openPositions = (window._hiringPositionsData || []).filter(p => p.status === 'open').length;

  let html = `
    <div class="ats-summary">
      <div class="ats-summary-item" onclick="window._hiringActiveTab='calendar';renderContent()">
        <span class="ats-summary-count">${window._interviewsTodayCount || 0}</span> interviews today
      </div>
      <div class="ats-summary-item" onclick="window._hiringActiveTab='database';window._hiringDbSort='days_desc';renderContent()">
        <span class="ats-summary-count ${needsAction > 0 ? 'danger' : ''}">${needsAction}</span> needs action
      </div>
      <div class="ats-summary-item" onclick="window._hiringActiveTab='pipeline';window._hiringFilterStage='offer';renderContent()">
        <span class="ats-summary-count ${offersCount > 0 ? 'warn' : ''}">${offersCount}</span> offers pending
      </div>
      <div class="ats-summary-item" onclick="window._hiringActiveTab='positions';renderContent()">
        <span class="ats-summary-count">${openPositions}</span> open positions
      </div>
    </div>

    <div class="ats-tabs">
      ${['pipeline','positions','database','calendar','metrics'].map(t =>
        `<div class="ats-tab ${activeTab === t ? 'active' : ''}" onclick="window._hiringActiveTab='${t}';renderContent()">${t.charAt(0).toUpperCase() + t.slice(1)}</div>`
      ).join('')}
    </div>

    <div id="ats-tab-content"></div>
  `;
  container.innerHTML = html;

  const tabEl = container.querySelector('#ats-tab-content');
  switch (activeTab) {
    case 'pipeline': renderPipelineTab(tabEl); break;
    case 'positions': renderPositionsTab(tabEl); break;
    case 'database': renderDatabaseTab(tabEl); break;
    case 'calendar': await renderCalendarTab(tabEl); break;
    case 'metrics': renderMetricsTab(tabEl); break;
  }
}
```

- [ ] **Step 3: Add renderPipelineTab that wraps existing kanban code**

Below `renderHiringView`, add a new function that contains the existing kanban rendering logic. This preserves all existing drag-drop and card rendering while wrapping it in the tab:

```javascript
function renderPipelineTab(container) {
  // Sub-controls: Kanban/By Client toggle + filters + Add Candidate
  const viewMode = window._hiringViewMode || 'kanban';
  const filterClient = window._hiringFilterClient || '';
  const filterStage = window._hiringFilterStage || '';

  // ... (move the existing renderHiringView kanban/by-client HTML generation here)
  // This is the existing code that builds the kanban lanes or client grid
}
```

Note: The actual code to move is the body of the old `renderHiringView` from after the header controls down to the kanban/client rendering. This is a cut-and-paste refactor — no logic changes.

- [ ] **Step 4: Add stub functions for new tabs**

```javascript
function renderPositionsTab(container) {
  container.innerHTML = '<p style="color:#888;padding:20px;">Positions view — coming in Task 10</p>';
}
function renderDatabaseTab(container) {
  container.innerHTML = '<p style="color:#888;padding:20px;">Database view — coming in Task 8</p>';
}
async function renderCalendarTab(container) {
  container.innerHTML = '<p style="color:#888;padding:20px;">Calendar view — coming in Task 9</p>';
}
function renderMetricsTab(container) {
  container.innerHTML = '<p style="color:#888;padding:20px;">Metrics view — coming in Task 11</p>';
}
```

- [ ] **Step 5: Test in browser**

Run: `pm2 restart nbi-dashboard`
Open: `http://localhost:8888/nbi_project_dashboard.html`
Navigate to hiring view. Verify:
- Summary banner shows with 4 stats
- 5 tabs visible, Pipeline active by default
- Clicking tabs switches content
- Pipeline tab shows existing kanban
- Other tabs show placeholder text
- Existing drag-drop still works

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: ATS tab navigation system + summary banner"
```

---

## Task 7: Frontend — Candidate Card Redesign

**Files:**
- Modify: `nbi_project_dashboard.html` — the `renderHiringCard` function (~line 19319) and hiring CSS

This replaces the 150px card with the approved 220px design: avatar, source badge, assignee faces, days-in-stage, comment count.

- [ ] **Step 1: Add avatar helper function**

Above `renderHiringCard`, add:

```javascript
function candidateAvatarHtml(name, size = 38) {
  const initials = (name || '??').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hues = [262, 220, 340, 160, 30, 200, 280, 120, 0, 50];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash + (name || '').charCodeAt(i)) | 0;
  const hue = hues[Math.abs(hash) % hues.length];
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:hsl(${hue},55%,45%);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.37)}px;font-weight:700;color:white;flex-shrink:0;">${esc(initials)}</div>`;
}

function daysInStageHtml(stageChangedAt) {
  if (!stageChangedAt) return '';
  const days = Math.floor((Date.now() - new Date(stageChangedAt).getTime()) / 86400000);
  let label, cls;
  if (days >= 7 * 2) { label = Math.floor(days / 7) + 'w'; } else { label = days + 'd'; }
  if (days > 14) cls = 'color:#ef4444;font-weight:600;';
  else if (days > 7) cls = 'color:#f59e0b;font-weight:600;';
  else cls = 'color:#888;';
  return `<span style="font-size:11px;${cls}" title="${days} days in stage">${label}</span>`;
}
```

- [ ] **Step 2: Add card CSS**

Add to the hiring CSS block:

```css
/* ATS Candidate Card (220px) */
.ats-card { width: 220px; background: #23234a; border-radius: 10px; padding: 14px; cursor: pointer; transition: transform 0.1s, box-shadow 0.15s; position: relative; }
.ats-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.ats-card.dragging { opacity: 0.5; }
.ats-card.archived { opacity: 0.45; filter: grayscale(0.5); }
.ats-card--border-red { border-left: 3px solid #ef4444; }
.ats-card--border-amber { border-left: 3px solid #f59e0b; }
.ats-card--border-default { border-left: 3px solid #444; }
.ats-card-identity { display: flex; gap: 10px; margin-bottom: 10px; }
.ats-card-name { font-size: 14px; font-weight: 600; color: #e0e0e0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ats-card-role { font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ats-card-badges { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.ats-source-badge { font-size: 10px; background: rgba(59,130,246,0.12); color: #60a5fa; padding: 2px 7px; border-radius: 4px; }
.ats-card-meta { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04); }
.ats-assignee-faces { display: flex; }
.ats-assignee-face { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; color: white; border: 2px solid #23234a; }
.ats-assignee-face + .ats-assignee-face { margin-left: -6px; }
.ats-card-indicators { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #888; }

/* ATS Kanban lanes (wider) */
.ats-kanban { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px; }
.ats-lane { min-width: 240px; width: 240px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
.ats-lane-header { font-size: 12px; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 0; display: flex; justify-content: space-between; }
.ats-lane-count { font-weight: 400; color: #666; }
```

- [ ] **Step 3: Replace renderHiringCard function**

Replace the `renderHiringCard` function (~line 19319) with:

```javascript
function renderHiringCard(c, draggable = true) {
  const isArchived = !!c.archived_at;
  const days = c.stage_changed_at ? Math.floor((Date.now() - new Date(c.stage_changed_at).getTime()) / 86400000) : 0;
  const assignees = c.stage_assignees && c.stage_assignees[c.stage] ? c.stage_assignees[c.stage] : [];
  const hasAssignee = assignees.length > 0;
  const borderClass = isArchived ? 'ats-card--border-default' : (!hasAssignee || days > 14) ? 'ats-card--border-red' : days > 7 ? 'ats-card--border-amber' : 'ats-card--border-default';

  const stageLabel = (c.stage || 'sourcing').toUpperCase().replace(/_/g, ' ');
  const stageColor = { sourcing: '#6b7280', interviews: '#f59e0b', offer: '#a855f7', onboarding: '#10b981', onboarded: '#22c55e' }[c.stage] || '#6b7280';
  const sourceLabel = c.source ? c.source.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';

  // Assignee faces (max 3)
  let facesHtml = '';
  const shown = assignees.slice(0, 3);
  shown.forEach(name => { facesHtml += candidateAvatarHtml(name, 22).replace('flex-shrink:0;', 'flex-shrink:0;border:2px solid #23234a;'); });
  if (assignees.length > 3) facesHtml += `<div class="ats-assignee-face" style="background:#555;">+${assignees.length - 3}</div>`;

  return `
    <div class="ats-card ${borderClass} ${isArchived ? 'archived' : ''}"
         ${draggable && !isArchived ? `draggable="true" ondragstart="onHiringCardDragStart(event,'${c.id}')" ondragend="onHiringCardDragEnd(event)"` : ''}
         onclick="_actOpenCandidateDetailIfNotDrag('${c.id}')">
      <div class="ats-card-identity">
        ${candidateAvatarHtml(c.name || c.role || '?', 38)}
        <div style="min-width:0;">
          <div class="ats-card-name">${esc(c.name || c.role || 'Unnamed')}</div>
          ${c.name && c.role ? `<div class="ats-card-role">${esc(c.role)}</div>` : ''}
        </div>
      </div>
      <div class="ats-card-badges">
        ${sourceLabel ? `<span class="ats-source-badge">${esc(sourceLabel)}</span>` : '<span></span>'}
        <span style="font-size:10px;background:${stageColor}20;color:${stageColor};padding:2px 7px;border-radius:4px;">${stageLabel}</span>
      </div>
      <div class="ats-card-meta">
        <div class="ats-assignee-faces">${facesHtml || '<span style="font-size:10px;color:#666;">No assignee</span>'}</div>
        <div class="ats-card-indicators">
          ${c.has_cv ? '<span title="Has CV">📄</span>' : ''}
          ${c.comment_count > 0 ? `<span title="${c.comment_count} comments">💬${c.comment_count}</span>` : ''}
          ${daysInStageHtml(c.stage_changed_at)}
        </div>
      </div>
      ${c.rejection_category ? `<div style="margin-top:6px;"><span style="font-size:9px;background:rgba(239,68,68,0.15);color:#ef4444;padding:2px 6px;border-radius:3px;">Rejected</span></div>` : ''}
    </div>
  `;
}
```

- [ ] **Step 4: Update kanban lane rendering to use new classes**

In `renderPipelineTab`, update the lane HTML to use `.ats-kanban` and `.ats-lane` classes instead of the old `.hiring-kanban` and `.hiring-lane` classes. The lane width is now 240px (set by CSS).

- [ ] **Step 5: Test in browser**

Run: `pm2 restart nbi-dashboard`
Open: `http://localhost:8888/nbi_project_dashboard.html`
Verify:
- Cards show avatar, name, role, source badge, stage badge
- Assignee faces show at bottom
- Days-in-stage shows with amber/red colouring
- Comment count and CV indicator visible where applicable
- Drag-drop still works
- Archived cards are greyed out

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: redesigned candidate cards (220px, avatars, source badges, meta row)"
```

---

## Task 8: Frontend — Database / Search View

**Files:**
- Modify: `nbi_project_dashboard.html` — replace `renderDatabaseTab` stub

- [ ] **Step 1: Implement renderDatabaseTab**

Replace the stub `renderDatabaseTab` function with the full table implementation. This builds: search input, filter dropdowns (Stage, Client, Source, Position), filter chips, sortable table with avatar+name, role, stage badge, source, days, assignees.

```javascript
function renderDatabaseTab(container) {
  const candidates = window._candidatesData || [];
  const positions = window._hiringPositionsData || [];
  const clients = [...new Set(candidates.map(c => c.client_name).filter(Boolean))].sort();
  const sources = [...new Set(candidates.map(c => c.source).filter(Boolean))].sort();
  const stageKeys = (window._resolvedHiringStages || []).map(s => s.key);

  // Filters
  const filters = window._hiringDbFilters || {};
  const searchTerm = (filters.search || '').toLowerCase();

  // Apply filters
  let filtered = candidates;
  if (searchTerm) filtered = filtered.filter(c => [c.name, c.role, c.client_name, c.source].some(f => (f || '').toLowerCase().includes(searchTerm)));
  if (filters.stage) filtered = filtered.filter(c => c.stage === filters.stage);
  if (filters.client) filtered = filtered.filter(c => c.client_name === filters.client);
  if (filters.source) filtered = filtered.filter(c => c.source === filters.source);
  if (filters.position_id) filtered = filtered.filter(c => c.position_id === filters.position_id);
  if (filters.status === 'active') filtered = filtered.filter(c => !c.archived_at);
  else if (filters.status === 'rejected') filtered = filtered.filter(c => c.archived_at && c.rejection_category);
  else if (filters.status === 'hired') filtered = filtered.filter(c => c.archived_at && !c.rejection_category);

  // Sort
  const sort = window._hiringDbSort || 'days_desc';
  filtered.sort((a, b) => {
    switch (sort) {
      case 'name_asc': return (a.name || '').localeCompare(b.name || '');
      case 'name_desc': return (b.name || '').localeCompare(a.name || '');
      case 'days_desc': {
        const da = a.stage_changed_at ? Date.now() - new Date(a.stage_changed_at).getTime() : 0;
        const db = b.stage_changed_at ? Date.now() - new Date(b.stage_changed_at).getTime() : 0;
        return db - da;
      }
      case 'days_asc': {
        const da = a.stage_changed_at ? Date.now() - new Date(a.stage_changed_at).getTime() : 0;
        const db = b.stage_changed_at ? Date.now() - new Date(b.stage_changed_at).getTime() : 0;
        return da - db;
      }
      case 'stage': return stageKeys.indexOf(a.stage) - stageKeys.indexOf(b.stage);
      default: return 0;
    }
  });

  // Build chips
  let chipsHtml = '';
  if (filters.stage) chipsHtml += `<span class="ats-chip" onclick="delete window._hiringDbFilters.stage;renderContent()">${esc(filters.stage)} <span class="remove">✕</span></span>`;
  if (filters.client) chipsHtml += `<span class="ats-chip" onclick="delete window._hiringDbFilters.client;renderContent()">${esc(filters.client)} <span class="remove">✕</span></span>`;
  if (filters.source) chipsHtml += `<span class="ats-chip" onclick="delete window._hiringDbFilters.source;renderContent()">${esc(filters.source)} <span class="remove">✕</span></span>`;

  const sortIcon = (col) => sort.startsWith(col) ? (sort.endsWith('desc') ? ' ▼' : ' ▲') : '';
  const toggleSort = (col) => `window._hiringDbSort = window._hiringDbSort === '${col}_asc' ? '${col}_desc' : '${col}_asc'; renderContent()`;

  container.innerHTML = `
    <div class="ats-controls">
      <input class="ats-search" type="text" placeholder="🔍 Search candidates..." value="${esc(filters.search || '')}"
             oninput="window._hiringDbFilters = window._hiringDbFilters||{}; window._hiringDbFilters.search=this.value; renderContent()">
      <select class="ats-filter-btn" onchange="window._hiringDbFilters=window._hiringDbFilters||{}; window._hiringDbFilters.stage=this.value||undefined; renderContent()">
        <option value="">Stage</option>
        ${stageKeys.map(s => `<option value="${s}" ${filters.stage===s?'selected':''}>${s}</option>`).join('')}
      </select>
      <select class="ats-filter-btn" onchange="window._hiringDbFilters=window._hiringDbFilters||{}; window._hiringDbFilters.client=this.value||undefined; renderContent()">
        <option value="">Client</option>
        ${clients.map(c => `<option value="${esc(c)}" ${filters.client===c?'selected':''}>${esc(c)}</option>`).join('')}
      </select>
      <select class="ats-filter-btn" onchange="window._hiringDbFilters=window._hiringDbFilters||{}; window._hiringDbFilters.source=this.value||undefined; renderContent()">
        <option value="">Source</option>
        ${sources.map(s => `<option value="${esc(s)}" ${filters.source===s?'selected':''}>${esc(s)}</option>`).join('')}
      </select>
      <select class="ats-filter-btn" onchange="window._hiringDbFilters=window._hiringDbFilters||{}; window._hiringDbFilters.position_id=this.value||undefined; renderContent()">
        <option value="">Position</option>
        ${positions.map(p => `<option value="${p.id}" ${filters.position_id===p.id?'selected':''}>${esc(p.title)}</option>`).join('')}
      </select>
    </div>
    ${chipsHtml ? `<div class="ats-filter-chips">${chipsHtml}</div>` : ''}
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="color:#888;border-bottom:1px solid rgba(255,255,255,0.08);text-align:left;">
          <th style="padding:8px 12px;cursor:pointer;" onclick="${toggleSort('name')}">Candidate${sortIcon('name')}</th>
          <th style="padding:8px 12px;">Role</th>
          <th style="padding:8px 12px;cursor:pointer;" onclick="${toggleSort('stage')}">Stage${sortIcon('stage')}</th>
          <th style="padding:8px 12px;">Source</th>
          <th style="padding:8px 12px;cursor:pointer;" onclick="${toggleSort('days')}">Days${sortIcon('days')}</th>
          <th style="padding:8px 12px;">Assignee</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(c => {
          const stageColor = { sourcing: '#6b7280', interviews: '#f59e0b', offer: '#a855f7', onboarding: '#10b981', onboarded: '#22c55e' }[c.stage] || '#6b7280';
          const assignees = c.stage_assignees && c.stage_assignees[c.stage] ? c.stage_assignees[c.stage] : [];
          return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;${c.archived_at ? 'opacity:0.5;' : ''}" onclick="openCandidateDetail('${c.id}')">
              <td style="padding:8px 12px;display:flex;align-items:center;gap:8px;">
                ${candidateAvatarHtml(c.name || c.role, 28)}
                <span style="font-weight:500;">${esc(c.name || 'Unnamed')}</span>
              </td>
              <td style="padding:8px 12px;color:#999;">${esc(c.role || '—')}</td>
              <td style="padding:8px 12px;"><span style="font-size:10px;background:${stageColor}20;color:${stageColor};padding:2px 7px;border-radius:4px;">${esc((c.stage||'').toUpperCase())}</span></td>
              <td style="padding:8px 12px;color:#60a5fa;">${esc(c.source ? c.source.replace(/-/g,' ') : '—')}</td>
              <td style="padding:8px 12px;">${daysInStageHtml(c.stage_changed_at)}</td>
              <td style="padding:8px 12px;">
                <div style="display:flex;">${assignees.slice(0,3).map(n => candidateAvatarHtml(n, 20)).join('')}${assignees.length > 3 ? `<span style="font-size:9px;color:#888;margin-left:4px;">+${assignees.length-3}</span>` : assignees.length === 0 ? '<span style="color:#666;">—</span>' : ''}</div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    <div style="text-align:right;color:#666;font-size:11px;padding:8px 12px;">Showing ${filtered.length} of ${candidates.length} candidates</div>
  `;
}
```

- [ ] **Step 2: Test in browser**

Navigate to Database tab. Verify: search works, filters work, chips appear and are removable, sorting works, clicking a row opens the detail panel.

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: Database/Search view with sortable table, filters, search"
```

---

## Task 9: Frontend — Calendar View

**Files:**
- Modify: `nbi_project_dashboard.html` — replace `renderCalendarTab` stub

This is the most complex UI component. Week grid with 30-min slot rows, interview blocks that span rows based on duration, and overlapping block handling.

- [ ] **Step 1: Add calendar CSS**

```css
/* ATS Calendar */
.ats-calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.ats-calendar-nav { display: flex; align-items: center; gap: 10px; }
.ats-calendar-nav-title { font-size: 16px; font-weight: 600; color: #e0e0e0; }
.ats-calendar-nav-btn { background: none; border: none; color: #888; font-size: 16px; cursor: pointer; padding: 4px 8px; }
.ats-calendar-nav-btn:hover { color: #fff; }
.ats-calendar-toggle { display: flex; gap: 2px; }
.ats-calendar-toggle span { padding: 5px 14px; font-size: 11px; border-radius: 5px; cursor: pointer; }
.ats-calendar-toggle .active { background: #7c3aed; color: white; }
.ats-calendar-toggle .inactive { background: #23234a; color: #888; }
.ats-week-grid { display: grid; grid-template-columns: 54px repeat(5, 1fr); gap: 1px; background: rgba(255,255,255,0.03); border-radius: 8px; overflow: hidden; }
.ats-week-time { background: #1a1a2e; padding: 6px 4px; text-align: right; color: #555; font-size: 9px; height: 32px; }
.ats-week-day-header { background: #1a1a2e; padding: 8px; text-align: center; color: #888; font-size: 11px; }
.ats-week-day-header.today { color: #60a5fa; font-weight: 600; }
.ats-week-cell { background: #23234a; min-height: 32px; position: relative; }
.ats-interview-block { position: absolute; left: 2px; right: 2px; border-radius: 4px; padding: 4px 6px; overflow: hidden; cursor: pointer; z-index: 1; transition: opacity 0.15s; }
.ats-interview-block:hover { opacity: 0.85; }
.ats-interview-block .name { font-weight: 600; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ats-interview-block .meta { font-size: 9px; color: rgba(255,255,255,0.6); }
.ats-interview-block.compact .name { font-size: 10px; }
.ats-calendar-legend { display: flex; gap: 16px; margin-top: 10px; font-size: 10px; color: #888; }
.ats-calendar-legend span::before { content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
```

- [ ] **Step 2: Implement renderCalendarTab**

Replace the stub with the full week grid implementation. The function:
1. Fetches interviews for the displayed week (lazy load via GET `/api/interview-rounds?from=X&to=Y`)
2. Builds a CSS grid with time column + 5 day columns
3. Places interview blocks using absolute positioning within day cells
4. Handles overlapping blocks by subdividing horizontally
5. Includes Schedule Interview button that opens the existing interview modal

This is ~200 lines of JS. The key rendering logic:

```javascript
async function renderCalendarTab(container) {
  const weekOffset = window._calendarWeekOffset || 0;
  const viewMode = window._calendarViewMode || 'week';

  // Calculate week start (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay() || 7; // Sunday=7
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1 + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  // Fetch interviews for this week
  const fromStr = monday.toISOString().slice(0, 10);
  const toStr = new Date(friday.getTime() + 86400000).toISOString().slice(0, 10);

  let interviews = [];
  try {
    const resp = await fetch(`/api/interview-rounds?from=${fromStr}&to=${toStr}`, { headers: { 'Accept': 'application/json' } });
    if (resp.ok) interviews = await resp.json();
  } catch (e) { /* empty week */ }

  // Count today's interviews for the summary banner
  const todayStr = new Date().toISOString().slice(0, 10);
  window._interviewsTodayCount = interviews.filter(iv => iv.scheduled_at && iv.scheduled_at.slice(0, 10) === todayStr).length;

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthYear = `${monthNames[monday.getMonth()]} ${monday.getFullYear()}`;

  // Hours: 8am to 6pm = 20 half-hour slots
  const startHour = 8, endHour = 18;
  const totalSlots = (endHour - startHour) * 2;

  // Build time labels (every hour)
  let timeLabelsHtml = '';
  for (let h = startHour; h < endHour; h++) {
    timeLabelsHtml += `<div class="ats-week-time" style="grid-row: span 2;">${h}:00</div>`;
  }

  // Build day columns with interview blocks
  let dayColumnsHtml = '';
  for (let d = 0; d < 5; d++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + d);
    const dayStr = dayDate.toISOString().slice(0, 10);
    const isToday = dayStr === todayStr;
    const dayInterviews = interviews.filter(iv => iv.scheduled_at && iv.scheduled_at.slice(0, 10) === dayStr);

    // Build cells for this day (one per half hour)
    for (let slot = 0; slot < totalSlots; slot++) {
      const slotHour = startHour + Math.floor(slot / 2);
      const slotMin = (slot % 2) * 30;

      // Find interviews starting in this slot
      const slotInterviews = dayInterviews.filter(iv => {
        const t = new Date(iv.scheduled_at);
        const ivSlot = (t.getHours() - startHour) * 2 + (t.getMinutes() >= 30 ? 1 : 0);
        return ivSlot === slot;
      });

      let blocksHtml = '';
      slotInterviews.forEach((iv, idx) => {
        const duration = iv.duration_minutes || 60;
        const spans = Math.max(1, Math.round(duration / 30));
        const heightPx = spans * 32 - 4;
        const typeColors = { 'Phone Screen': '#3b82f6', 'Technical': '#7c3aed', 'Cultural': '#f59e0b', 'Final': '#10b981' };
        const color = typeColors[iv.title] || '#7c3aed';
        const t = new Date(iv.scheduled_at);
        const endT = new Date(t.getTime() + duration * 60000);
        const timeStr = `${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')} – ${endT.getHours()}:${String(endT.getMinutes()).padStart(2,'0')}`;
        const isCompact = duration <= 30;
        const interviewer = iv.scorecards && iv.scorecards[0] ? iv.scorecards[0].interviewer_name : '';

        blocksHtml += `
          <div class="ats-interview-block ${isCompact ? 'compact' : ''}"
               style="top:0;height:${heightPx}px;background:${color}20;border-left:3px solid ${color};"
               onclick="event.stopPropagation();openCandidateDetail('${iv.candidate_id}')"
               title="${esc(iv.candidate_name)} · ${esc(iv.title)} · ${timeStr}">
            <div style="display:flex;align-items:center;gap:4px;">
              ${candidateAvatarHtml(iv.candidate_name, isCompact ? 14 : 18)}
              <span class="name" style="color:${color}cc;">${esc(iv.candidate_name || 'Unknown')}</span>
            </div>
            ${!isCompact ? `<div class="meta">${esc(iv.title)}</div><div class="meta">${timeStr}${iv.location ? ' · ' + esc(iv.location) : ''}</div>` : ''}
            ${interviewer && !isCompact ? `<div style="position:absolute;bottom:3px;right:3px;">${candidateAvatarHtml(interviewer, 16)}</div>` : ''}
          </div>
        `;
      });

      dayColumnsHtml += `<div class="ats-week-cell">${blocksHtml}</div>`;
    }
  }

  container.innerHTML = `
    <div class="ats-calendar-header">
      <div class="ats-calendar-nav">
        <span class="ats-calendar-nav-title">${monthYear}</span>
        <button class="ats-calendar-nav-btn" onclick="window._calendarWeekOffset=(window._calendarWeekOffset||0)-1;renderContent()">◀</button>
        <button class="ats-calendar-nav-btn" onclick="window._calendarWeekOffset=0;renderContent()">Today</button>
        <button class="ats-calendar-nav-btn" onclick="window._calendarWeekOffset=(window._calendarWeekOffset||0)+1;renderContent()">▶</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <div class="ats-calendar-toggle">
          <span class="${viewMode === 'week' ? 'active' : 'inactive'}" onclick="window._calendarViewMode='week';renderContent()">Week</span>
          <span class="${viewMode === 'month' ? 'active' : 'inactive'}" onclick="window._calendarViewMode='month';renderContent()">Month</span>
        </div>
        <button class="ats-filter-btn" style="background:#7c3aed;color:white;border:none;" onclick="openScheduleInterviewModal()">+ Schedule</button>
      </div>
    </div>
    <div class="ats-week-grid" style="grid-template-rows: auto repeat(${totalSlots}, 32px);">
      <div></div>
      ${[0,1,2,3,4].map(d => {
        const dayDate = new Date(monday); dayDate.setDate(monday.getDate() + d);
        const isToday = dayDate.toISOString().slice(0,10) === todayStr;
        return `<div class="ats-week-day-header ${isToday?'today':''}">${dayNames[d]} ${dayDate.getDate()}</div>`;
      }).join('')}
      ${timeLabelsHtml}
      ${dayColumnsHtml}
    </div>
    <div class="ats-calendar-legend">
      <span style="--dot-color:#7c3aed;">Technical</span>
      <span style="--dot-color:#3b82f6;">Phone Screen</span>
      <span style="--dot-color:#10b981;">Final</span>
      <span style="--dot-color:#f59e0b;">Cultural</span>
      <span style="color:#666;margin-left:auto;">${interviews.length} interview${interviews.length!==1?'s':''} this week</span>
    </div>
  `;
}
```

- [ ] **Step 3: Add Schedule Interview modal**

```javascript
function openScheduleInterviewModal(prefillCandidateId, prefillDate) {
  const candidates = (window._candidatesData || []).filter(c => !c.archived_at);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:500px;">
      <div class="modal-header"><h3>Schedule Interview</h3><button onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div id="schedule-conflict-warn" style="display:none;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#ef4444;"></div>
        <label style="display:block;margin-bottom:10px;">Candidate<br>
          <select id="sched-candidate" class="ats-search" style="width:100%;margin-top:4px;">
            ${candidates.map(c => `<option value="${c.id}" ${c.id===prefillCandidateId?'selected':''}>${esc(c.name || c.role)} — ${esc(c.client_name || '')}</option>`).join('')}
          </select>
        </label>
        <label style="display:block;margin-bottom:10px;">Interview Type<br>
          <select id="sched-type" class="ats-search" style="width:100%;margin-top:4px;">
            <option value="Phone Screen">Phone Screen</option>
            <option value="Technical">Technical</option>
            <option value="Cultural">Cultural</option>
            <option value="Final">Final</option>
          </select>
        </label>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <label style="flex:1;">Date<br><input id="sched-date" type="date" class="ats-search" style="width:100%;margin-top:4px;" value="${prefillDate || new Date().toISOString().slice(0,10)}"></label>
          <label style="flex:1;">Time<br><input id="sched-time" type="time" class="ats-search" style="width:100%;margin-top:4px;" value="09:00"></label>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <label style="flex:1;">Duration<br>
            <select id="sched-duration" class="ats-search" style="width:100%;margin-top:4px;">
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60" selected>60 min</option>
              <option value="90">90 min</option>
            </select>
          </label>
          <label style="flex:1;">Interviewer<br><input id="sched-interviewer" type="text" class="ats-search" style="width:100%;margin-top:4px;" placeholder="Name"></label>
        </div>
        <label style="display:block;margin-bottom:10px;">Location<br><input id="sched-location" type="text" class="ats-search" style="width:100%;margin-top:4px;" placeholder="Zoom link, Office, etc."></label>
        <label style="display:block;margin-bottom:10px;">Notes<br><textarea id="sched-notes" class="ats-search" style="width:100%;margin-top:4px;min-height:60px;"></textarea></label>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;">
        <button onclick="this.closest('.modal-overlay').remove()" style="padding:8px 16px;background:#333;color:#ccc;border:none;border-radius:6px;cursor:pointer;">Cancel</button>
        <button onclick="submitScheduleInterview()" style="padding:8px 16px;background:#7c3aed;color:white;border:none;border-radius:6px;cursor:pointer;">Schedule</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function submitScheduleInterview() {
  const candidateId = document.getElementById('sched-candidate').value;
  const title = document.getElementById('sched-type').value;
  const date = document.getElementById('sched-date').value;
  const time = document.getElementById('sched-time').value;
  const duration = parseInt(document.getElementById('sched-duration').value);
  const interviewer = document.getElementById('sched-interviewer').value.trim();
  const location = document.getElementById('sched-location').value.trim();
  const notes = document.getElementById('sched-notes').value.trim();

  if (!candidateId || !date || !time) return;
  const scheduledAt = new Date(`${date}T${time}`).toISOString();

  // Conflict check
  if (interviewer) {
    try {
      const resp = await fetch(`/api/interview-rounds/check-conflict?interviewer_name=${encodeURIComponent(interviewer)}&scheduled_at=${encodeURIComponent(scheduledAt)}&duration_minutes=${duration}`);
      const check = await resp.json();
      if (check.conflict) {
        const warn = document.getElementById('schedule-conflict-warn');
        warn.style.display = 'block';
        warn.textContent = `⚠ ${interviewer} already has "${check.conflicting_interview.title}" with ${check.conflicting_interview.candidate_name} at that time. Schedule anyway?`;
        // Change button to confirm
        const btn = warn.closest('.modal').querySelector('.modal-footer button:last-child');
        btn.textContent = 'Schedule Anyway';
        btn.onclick = () => doCreateInterview(candidateId, title, scheduledAt, duration, interviewer, location, notes);
        return;
      }
    } catch (e) { /* proceed without check */ }
  }

  await doCreateInterview(candidateId, title, scheduledAt, duration, interviewer, location, notes);
}

async function doCreateInterview(candidateId, title, scheduledAt, duration, interviewer, location, notes) {
  try {
    const resp = await fetch('/api/interview-rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, title, scheduled_at: scheduledAt, duration_minutes: duration, interviewer_name: interviewer || undefined, location: location || undefined }),
    });
    if (resp.ok) {
      document.querySelector('.modal-overlay')?.remove();
      renderContent();
    }
  } catch (e) { /* handle error */ }
}
```

- [ ] **Step 4: Test in browser**

Navigate to Calendar tab. Verify:
- Week grid shows Mon-Fri with time slots
- Navigation arrows change week
- "Today" button returns to current week
- "Schedule" button opens modal
- Scheduling an interview shows it on the grid
- Conflict check warns on double-booking

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: Calendar view with week grid, interview blocks, schedule modal + conflict check"
```

---

## Task 10: Frontend — Candidate Detail Panel Tabs (Profile, Interviews, Activity, Settings)

**Files:**
- Modify: `nbi_project_dashboard.html` — the `openCandidateDetail` function (~line 20679) and `buildCandidateStageBarHtml` (~line 20350)

The existing panel already has tabs from the previous session. This task enriches them with the new data: source field on Profile, interviews list on Interviews tab, unified activity timeline on Activity tab, and reject/decline on Settings tab.

- [ ] **Step 1: Update Profile tab to include source dropdown**

In the Profile section of `openCandidateDetail`, add a source `<select>` after the LinkedIn URL field. Use `VALID_SOURCES` from the server (hardcode the same list client-side):

```javascript
const CANDIDATE_SOURCES = ['referral', 'linkedin', 'inbound', 'agency', 'job-board', 'internal', 'other'];
```

Add source select:
```html
<label>Source<br>
  <select onchange="updateCandidateField('${id}','source',this.value)" style="...">
    <option value="">—</option>
    ${CANDIDATE_SOURCES.map(s => `<option value="${s}" ${c.source===s?'selected':''}>${s.replace(/-/g,' ')}</option>`).join('')}
  </select>
</label>
```

- [ ] **Step 2: Implement Interviews tab content**

When the Interviews tab is active, fetch and display interview rounds:

```javascript
async function loadCandidateInterviews(candidateId, tabEl) {
  const resp = await fetch(`/api/interview-rounds?candidate_id=${candidateId}`);
  if (!resp.ok) return;
  const interviews = await resp.json();

  if (interviews.length === 0) {
    tabEl.innerHTML = `
      <div style="text-align:center;padding:30px;color:#888;">
        <p>No interviews scheduled</p>
        <button onclick="openScheduleInterviewModal('${candidateId}')" style="margin-top:10px;padding:8px 16px;background:#7c3aed;color:white;border:none;border-radius:6px;cursor:pointer;">Schedule first interview</button>
      </div>
    `;
    return;
  }

  tabEl.innerHTML = `
    <button onclick="openScheduleInterviewModal('${candidateId}')" style="margin-bottom:12px;padding:6px 12px;background:#7c3aed;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">+ Schedule Interview</button>
    ${interviews.map(iv => {
      const typeColors = { 'Phone Screen': '#3b82f6', 'Technical': '#7c3aed', 'Cultural': '#f59e0b', 'Final': '#10b981' };
      const color = typeColors[iv.title] || '#7c3aed';
      const outcomeColors = { passed: '#10b981', failed: '#ef4444', rescheduled: '#f59e0b', no_show: '#6b7280' };
      const date = iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleDateString() : 'Unscheduled';
      const time = iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
      const interviewer = iv.scorecards && iv.scorecards[0] ? iv.scorecards[0].interviewer_name : '—';
      return `
        <div style="background:#23234a;border-radius:8px;padding:12px;margin-bottom:8px;border-left:3px solid ${color};">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:12px;font-weight:600;color:${color};">${esc(iv.title)} #${iv.round_number}</span>
            <select onchange="updateInterviewOutcome('${iv.id}',this.value)" style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:#e0e0e0;padding:2px 8px;font-size:11px;">
              <option value="pending" ${iv.outcome==='pending'||!iv.outcome?'selected':''}>Pending</option>
              <option value="passed" ${iv.outcome==='passed'?'selected':''}>Passed</option>
              <option value="failed" ${iv.outcome==='failed'?'selected':''}>Failed</option>
              <option value="rescheduled" ${iv.outcome==='rescheduled'?'selected':''}>Rescheduled</option>
              <option value="no_show" ${iv.outcome==='no_show'?'selected':''}>No-show</option>
            </select>
          </div>
          <div style="font-size:11px;color:#999;">${date} ${time} · ${esc(interviewer)}${iv.location ? ' · ' + esc(iv.location) : ''}</div>
          ${iv.outcome_notes ? `<div style="font-size:11px;color:#888;margin-top:4px;">${esc(iv.outcome_notes)}</div>` : ''}
        </div>
      `;
    }).join('')}
  `;
}

async function updateInterviewOutcome(interviewId, outcome) {
  await fetch(`/api/interview-rounds/${interviewId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome }),
  });
}
```

- [ ] **Step 3: Implement Activity tab content**

```javascript
async function loadCandidateActivity(candidateId, tabEl) {
  const resp = await fetch(`/api/candidates/${candidateId}/activity`);
  if (!resp.ok) return;
  const events = await resp.json();

  const icons = {
    stage_change: '🔄', comment: '💬', comment_added: '💬',
    interview_scheduled: '📅', interview_outcome: '✅',
    cv_uploaded: '📄', cv_removed: '🗑️', source_set: '🔗',
    assignee_added: '👤', assignee_removed: '👤',
    created: '✨', archived: '📦', reopened: '🔓',
  };

  tabEl.innerHTML = `
    <div style="margin-bottom:12px;">
      <div style="display:flex;gap:8px;">
        <input id="activity-comment-input" type="text" placeholder="Add a comment..." class="ats-search" style="flex:1;">
        <button onclick="postCandidateComment('${candidateId}')" style="padding:6px 12px;background:#7c3aed;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">Post</button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${events.map(ev => {
        const icon = icons[ev.event_type] || '📌';
        const ago = timeAgo(new Date(ev.created_at));
        const isComment = ev.event_type === 'comment' || ev.event_type === 'comment_added';
        return `
          <div style="display:flex;gap:10px;padding:8px;${isComment ? 'background:#23234a;border-radius:6px;' : ''}">
            <span style="font-size:14px;">${icon}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;color:#e0e0e0;${isComment ? '' : 'color:#999;'}">${esc(ev.detail || ev.event_type)}</div>
              <div style="font-size:10px;color:#666;margin-top:2px;">${esc(ev.actor)} · ${ago}</div>
            </div>
          </div>
        `;
      }).join('') || '<p style="color:#666;text-align:center;padding:20px;">No activity yet</p>'}
    </div>
  `;
}

function timeAgo(date) {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
  if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
  return Math.floor(secs / 86400) + 'd ago';
}

async function postCandidateComment(candidateId) {
  const input = document.getElementById('activity-comment-input');
  const body = input.value.trim();
  if (!body) return;
  await fetch(`/api/candidates/${candidateId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  input.value = '';
  const tabEl = document.querySelector('#candidate-activity-tab');
  if (tabEl) loadCandidateActivity(candidateId, tabEl);
}
```

- [ ] **Step 4: Update Settings tab with Reject/Decline buttons**

Add reject and decline flows to the Settings tab using the existing `rejection_reason` and `rejection_category` fields:

```javascript
function renderSettingsTab(c, tabEl) {
  // ... existing assignee management code ...

  // Add reject/decline section
  tabEl.innerHTML += `
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
      <div style="font-size:12px;font-weight:600;color:#ef4444;margin-bottom:10px;">Danger Zone</div>
      ${!c.archived_at ? `
        <button onclick="showRejectForm('${c.id}')" style="padding:6px 12px;background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:6px;cursor:pointer;font-size:12px;margin-right:8px;">Reject</button>
        <button onclick="showDeclineForm('${c.id}')" style="padding:6px 12px;background:rgba(107,114,128,0.15);color:#9ca3af;border:1px solid rgba(107,114,128,0.3);border-radius:6px;cursor:pointer;font-size:12px;">Candidate Declined</button>
      ` : `
        <button onclick="hiringReopen('${c.id}')" style="padding:6px 12px;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);border-radius:6px;cursor:pointer;font-size:12px;">Reopen</button>
      `}
      <div id="reject-form-container" style="margin-top:10px;"></div>
    </div>
  `;
}
```

- [ ] **Step 5: Wire up the tab switching in openCandidateDetail**

Update the `switchCandidateTab` function to call the new tab loaders:

```javascript
function switchCandidateTab(candidateId, tabName) {
  document.querySelectorAll('.candidate-detail__tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.querySelectorAll('.candidate-detail__tab-content').forEach(t => t.style.display = t.id === `candidate-${tabName}-tab` ? 'block' : 'none');

  const tabEl = document.getElementById(`candidate-${tabName}-tab`);
  if (tabName === 'interviews' && tabEl && !tabEl.dataset.loaded) {
    tabEl.dataset.loaded = 'true';
    loadCandidateInterviews(candidateId, tabEl);
  }
  if (tabName === 'activity' && tabEl && !tabEl.dataset.loaded) {
    tabEl.dataset.loaded = 'true';
    loadCandidateActivity(candidateId, tabEl);
  }
}
```

- [ ] **Step 6: Update Create Candidate modal to include Source field**

In `openCreateCandidateModal` (~line 20226), add a Source select dropdown:

```html
<label>Source<br>
  <select id="create-candidate-source" style="...">
    <option value="">— Select source —</option>
    <option value="linkedin">LinkedIn</option>
    <option value="referral">Referral</option>
    <option value="agency">Agency</option>
    <option value="job-board">Job Board</option>
    <option value="inbound">Inbound</option>
    <option value="internal">Internal</option>
    <option value="other">Other</option>
  </select>
</label>
```

And include `source` in the POST body.

- [ ] **Step 7: Test in browser**

Open a candidate detail panel. Verify:
- Profile tab shows source dropdown, all existing fields
- Interviews tab loads interviews (or shows empty state)
- Activity tab shows timeline with comments at top
- Settings tab shows reject/decline buttons
- Source field works on create modal

- [ ] **Step 8: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: candidate detail panel tabs (Profile, Interviews, Activity, Settings) + source on create"
```

---

## Task 11: Frontend — Position Cards Redesign

**Files:**
- Modify: `nbi_project_dashboard.html` — replace `renderPositionsTab` stub

- [ ] **Step 1: Implement renderPositionsTab**

```javascript
function renderPositionsTab(container) {
  const positions = window._hiringPositionsData || [];
  const candidates = window._candidatesData || [];
  const isClient = typeof isClientUser === 'function' && isClientUser();
  const stageColors = { sourcing: '#6b7280', interviews: '#f59e0b', offer: '#a855f7', onboarding: '#10b981', onboarded: '#22c55e' };

  container.innerHTML = `
    <div class="ats-controls">
      <span style="color:#e0e0e0;font-weight:600;">${positions.filter(p=>p.status==='open').length} open positions</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
      ${positions.map(p => {
        const posCandidates = candidates.filter(c => c.position_id === p.id);
        const activeCandidates = posCandidates.filter(c => !c.archived_at);
        const statusColors = { open: '#10b981', closed: '#6b7280', 'on-hold': '#f59e0b' };
        const statusColor = statusColors[p.status] || '#6b7280';

        // Pipeline bar segments
        const stageCounts = {};
        activeCandidates.forEach(c => { stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1; });
        const total = activeCandidates.length || 1;
        const barHtml = Object.entries(stageCounts).map(([stage, count]) =>
          `<div style="flex:${count};background:${stageColors[stage] || '#444'};height:12px;" title="${stage}: ${count} candidates"></div>`
        ).join('');

        const daysPosted = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000);

        return `
          <div style="background:#23234a;border-radius:10px;padding:16px;cursor:pointer;" onclick="openPositionDetail('${p.id}')">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:16px;font-weight:600;color:#e0e0e0;">${esc(p.title)}</span>
              <span style="font-size:10px;background:${statusColor}20;color:${statusColor};padding:2px 8px;border-radius:4px;">${esc(p.status)}</span>
            </div>
            <div style="font-size:12px;color:#999;margin-bottom:4px;">
              ${p.seniority ? esc(p.seniority) + ' · ' : ''}${p.employment_type ? esc(p.employment_type) : ''}
              ${p.client_name ? ' · ' + esc(p.client_name) : ''}
            </div>
            ${!isClient && p.salary_range ? `<div style="font-size:12px;color:#10b981;margin-bottom:8px;">${esc(p.salary_range)}</div>` : ''}
            <div style="display:flex;border-radius:6px;overflow:hidden;margin-bottom:8px;">${barHtml || '<div style="flex:1;background:#333;height:12px;"></div>'}</div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#888;">
              <span>${posCandidates.length} candidates</span>
              <div style="display:flex;gap:10px;">
                ${p.jd_filename ? '<span title="Has JD">📄</span>' : ''}
                <span>${daysPosted}d posted</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
```

- [ ] **Step 2: Test and commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: position cards with pipeline bars, salary, seniority, JD indicator"
```

---

## Task 12: Frontend — Metrics View Enhancement

**Files:**
- Modify: `nbi_project_dashboard.html` — replace `renderMetricsTab` stub

- [ ] **Step 1: Implement renderMetricsTab**

Extend the existing `loadHiringMetrics` function or replace `renderMetricsTab` to show: summary stat cards, pipeline funnel, source effectiveness, interview activity, time-in-stage. Use the existing server-side metrics endpoints (`/api/hiring/metrics/time-in-stage`, `/api/hiring/metrics/pipeline`, `/api/hiring/metrics/time-to-hire`) plus client-side computations from loaded data.

- [ ] **Step 2: Test and commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: enhanced metrics view with source effectiveness and interview activity"
```

---

## Task 13: Full Test Suite + Restart

- [ ] **Step 1: Run unit tests**

Run: `cd dashboard-server && npm test`
Expected: All tests pass (including new hiring-comments and hiring-interviews tests).

- [ ] **Step 2: Restart PM2**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Run e2e tests**

Run: `cd dashboard-server && npm run test:e2e`
Expected: All e2e tests pass.

- [ ] **Step 4: Visual verification in browser**

Open `http://localhost:8888/nbi_project_dashboard.html`, navigate to hiring:
- [ ] Summary banner shows 4 stats
- [ ] 5 tabs work (Pipeline, Positions, Database, Calendar, Metrics)
- [ ] Pipeline: cards show avatar, source, assignees, days, comments
- [ ] Database: table with search, filters, sorting, click-to-detail
- [ ] Calendar: week grid, interview blocks, schedule modal, conflict check
- [ ] Positions: cards with pipeline bars, salary, JD indicator
- [ ] Metrics: stat cards, funnel, source chart
- [ ] Detail panel: 4 tabs (Profile with source, Interviews, Activity, Settings with reject/decline)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: ATS visual redesign — 5 views, rich cards, interview scheduling, activity trails"
```
