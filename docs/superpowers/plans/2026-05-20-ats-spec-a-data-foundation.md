# ATS Spec A: Data Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the data layer the ATS builds on — stage transition history, candidate email/source/tags, enriched positions, threaded comments, GDPR retention flags — plus the `onboarded` stage to complete the default hiring pipeline.

**Architecture:** Migration 046 adds all schema changes in one file. Two new route files (`candidate-comments.js`, `candidate-history.js`) for sub-resources. Existing `hiring.js` gains new allowed fields, stage transition recording, and GDPR logic inside the PATCH transaction. Frontend `openCandidateDetail` is decomposed into helper functions before adding new sections. Candidate sync polling is added to the 10-second sync cycle.

**Tech Stack:** Node.js + Express 4, PostgreSQL (`pg`), Vitest + supertest for tests, monolithic SPA (`nbi_project_dashboard.html`).

**Spec:** `docs/superpowers/specs/2026-05-20-ats-spec-a-data-foundation.md`

---

## Implementation Problem Resolution

The handoff identified 13 implementation problems. This plan resolves every one — either fixing it directly (if it falls within Spec A scope) or documenting the exact resolution deferred to the correct spec.

| # | Problem | Resolution | Where |
|---|---------|------------|-------|
| 1 | `_cachedTeamMembers` is name strings, not user objects — panel editor needs `user_id` | Interview panel dropdown uses `_cachedUsers` (which has `id`, `display_name`), not `_cachedTeamMembers` | Task 8, Step 5 |
| 2 | `createNotification` takes `username` not `user_id` — need lookup | Deferred to Spec C. The function signature stays as-is; Spec C adds a `resolveDisplayNameToUsername()` server-side helper using the same `users` table query. Stage assignees are display names → look up username via `SELECT username FROM users WHERE display_name = $1` | Spec C plan |
| 3 | Hiring route context in `server.js` missing `createNotification`, `sendEmailAsync`, `EMAIL_FROM` | Deferred to Spec C. The `server.js:441` mount call adds these to the context object when Spec C's notification/email features are implemented | Spec C plan |
| 4 | Detail panel needs skeleton + lazy-load (3+ API calls for sub-resources) | `openCandidateDetail` fetches candidate first (instant render with skeleton placeholders), then loads comments and history in parallel. Skeleton shown until sub-resources resolve | Task 10, Steps 3-4 |
| 5 | PATCH candidate endpoint becoming god function — need clear side-effect ordering | Side-effects ordered explicitly inside the transaction: (1) ownership check, (2) validation, (3) reorderInGroup if stage change, (4) stage history INSERT if stage changed, (5) consent date auto-stamp, (6) buildPatchQuery UPDATE, (7) fresh SELECT, (8) COMMIT. Each side-effect is a clearly commented block | Task 3, Steps 3-5 |
| 6 | `validateLength` needs explicit max for new fields not in `MAX_LENGTHS` | Add `source_detail: 500`, `linkedin_url: 2000` to `MAX_LENGTHS`. Comment body uses explicit override `validateLength(body, 'body', 5000)`. Email uses existing `MAX_LENGTHS.email` (254) | Task 2, Step 3; Task 6, Step 3 |
| 7 | Comment count badge stale after posting — need local increment | After successful POST to comments API, increment `_candidatesData[idx].comment_count` locally and re-render the card. No full reload needed | Task 10, Step 9 |
| 8 | No multi-user sync for hiring data (only tasks polled) | Add candidate polling to the existing 10-second sync interval. New endpoint `GET /api/candidates/poll?since=<ISO>` returns candidates with `updated_at > since`. Frontend merges into `_candidatesData` and re-renders if changes detected | Task 11 |
| 9 | Notification deep-link format `#hiring/candidate/{uuid}` needed | Deferred to Spec C. When notifications are created, `link` field is set to `#hiring/candidate/${candidateId}`. Frontend notification click handler checks for this prefix and calls `openCandidateDetail(uuid)` | Spec C plan |
| 10 | `openCandidateDetail` needs decomposition into helper functions | Decomposed before adding new sections: `buildCandidateHeaderHtml()`, `buildCandidateProfileHtml()`, `buildCandidateStageHtml()`, `buildCandidateAssigneesHtml()`, `buildCandidateStageSubHtml()`, `buildCandidateNotesHtml()` (replaced by comments), `buildCandidateActionsHtml()`. New helpers: `buildCandidateTimelineHtml()`, `buildCandidateCommentsHtml()`, `buildCandidateGdprHtml()` | Task 10, Steps 1-4 |
| 11 | Charts are CSS-only (flex bars) — no library | Deferred to Spec C. Decision: CSS-only flex bars for the initial metrics view (consistent with existing portfolio charts). Chart.js can be added later if the CSS approach proves insufficient for funnel/pie charts | Spec C plan |
| 12 | `sendEmailAsync` doesn't support reply-to — needs `replyTo` in Graph API payload | Deferred to Spec C. Add `replyTo` array to the Graph API message body in `_sendViaGraph()` at `email.js:38-45` when `mailOptions.replyTo` is set | Spec C plan |
| 13 | Client users can't see NBI user IDs — correct but needs acknowledging | Acknowledged. Client users see interview panel member names (display strings stored in JSONB), not user IDs. The `user_id` in the JSONB is for server-side matching only — the frontend renders the `name` field. No change needed | N/A |

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `dashboard-server/migrations/046_ats_data_foundation.sql` | Create | All schema changes: `candidate_stage_history` table, `candidate_comments` table, new columns on `candidates` and `hiring_positions`, notes→comments migration, GDPR backfill |
| `dashboard-server/routes/candidate-history.js` | Create | `GET /api/candidates/:id/history` — stage transition read endpoint |
| `dashboard-server/routes/candidate-comments.js` | Create | `GET/POST/DELETE /api/candidates/:id/comments` — threaded comments CRUD |
| `dashboard-server/routes/hiring.js` | Modify | Add `onboarded` to `HIRING_STAGES`, expand `buildPatchQuery` allowed fields, add stage history INSERT to PATCH/POST transactions, add GDPR auto-defaults, add `email`/`source`/`tags` validation, expand GET SELECT, add retention filter, add candidate poll endpoint |
| `dashboard-server/server.js` | Modify | Mount `candidate-history.js` and `candidate-comments.js`, pass required context |
| `dashboard-server/lib/helpers.js` | Modify | Add `source_detail` and `linkedin_url` to `MAX_LENGTHS` |
| `dashboard-server/tests/helpers/fixtures.js` | Modify | Update `createTestCandidate` to accept new fields, add `createTestHiringPosition` factory |
| `dashboard-server/tests/unit/ats-data-foundation.test.mjs` | Create | Tests for stage history, comments, new fields, GDPR, validation |
| `nbi_project_dashboard.html` | Modify | Add `onboarded` stage, decompose `openCandidateDetail`, add new detail panel sections (email, source, tags, timeline, comments, GDPR), update `hiringConfirmHire` to use `onboarded`, add candidate polling, update create modal |

---

## Task 1: Migration — Schema Changes

**Files:**
- Create: `dashboard-server/migrations/046_ats_data_foundation.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 046_ats_data_foundation.sql
-- ATS Data Foundation: stage history, comments, candidate fields, position fields, GDPR

-- 1. Stage transition history
CREATE TABLE IF NOT EXISTS candidate_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  moved_by TEXT NOT NULL,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_csh_candidate ON candidate_stage_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_csh_moved_at ON candidate_stage_history(moved_at);

-- 2. Candidate new columns
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source_detail TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS consent_date TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;

-- 3. Enriched hiring positions
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS salary_range TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'permanent';
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS interview_panel JSONB DEFAULT '[]'::jsonb;

-- 4. Threaded comments
CREATE TABLE IF NOT EXISTS candidate_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cc_candidate ON candidate_comments(candidate_id);

-- 5. Migrate existing notes to comments (one-time, idempotent)
INSERT INTO candidate_comments (candidate_id, author, body, internal, created_at)
SELECT id, 'System Migration', notes, true, COALESCE(updated_at, created_at, NOW())
FROM candidates
WHERE notes IS NOT NULL AND notes != ''
  AND id NOT IN (SELECT DISTINCT candidate_id FROM candidate_comments);

-- 6. GDPR retention backfill for existing candidates
UPDATE candidates SET retention_expires_at = created_at + INTERVAL '12 months'
WHERE retention_expires_at IS NULL;
```

- [ ] **Step 2: Run the migration**

Run from `dashboard-server/`:
```
npm run init-db
```

Expected: migration applies without error. Verify with:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'candidates' AND column_name IN ('email', 'source', 'tags', 'consent_given', 'retention_expires_at');
```
Should return 5 rows.

- [ ] **Step 3: Commit**

```
git add dashboard-server/migrations/046_ats_data_foundation.sql
git commit -m "feat(ats): migration 046 — stage history, comments, candidate fields, GDPR"
```

---

## Task 2: Test Fixtures — Update `createTestCandidate`, Add `createTestHiringPosition`

**Files:**
- Modify: `dashboard-server/tests/helpers/fixtures.js:108-126`

- [ ] **Step 1: Update `createTestCandidate` to accept new fields**

At `fixtures.js:108-126`, replace the existing `createTestCandidate` function:

```javascript
async function createTestCandidate(opts = {}) {
  const name = opts.name || uniq('TestCandidate');
  const stage = opts.stage || 'sourcing';
  const { rows } = await pool.query(
    `INSERT INTO candidates (client_id, position_id, name, role, linkedin_url, due_date, stage, notes, email, source, source_detail, tags, consent_given, consent_date, retention_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
    [
      opts.client_id || null,
      opts.position_id || null,
      name,
      opts.role || null,
      opts.linkedin_url || null,
      opts.due_date || null,
      stage,
      opts.notes || null,
      opts.email || null,
      opts.source || null,
      opts.source_detail || null,
      opts.tags ? JSON.stringify(opts.tags) : '[]',
      opts.consent_given || false,
      opts.consent_date || null,
      opts.retention_expires_at || null,
    ]
  );
  return rows[0];
}
```

- [ ] **Step 2: Add `createTestHiringPosition` factory**

Add after `createTestCandidate`, before the module.exports block:

```javascript
async function createTestHiringPosition(opts = {}) {
  const title = opts.title || uniq('TestPosition');
  const { rows } = await pool.query(
    `INSERT INTO hiring_positions (client_id, sow_id, title, description, seniority, status, salary_range, employment_type, location, requirements, interview_panel)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      opts.client_id || null,
      opts.sow_id || null,
      title,
      opts.description || null,
      opts.seniority || null,
      opts.status || 'open',
      opts.salary_range || null,
      opts.employment_type || 'permanent',
      opts.location || null,
      opts.requirements ? JSON.stringify(opts.requirements) : '[]',
      opts.interview_panel ? JSON.stringify(opts.interview_panel) : '[]',
    ]
  );
  return rows[0];
}
```

- [ ] **Step 3: Add `source_detail` and `linkedin_url` to `MAX_LENGTHS`**

In `dashboard-server/lib/helpers.js:198`, update `MAX_LENGTHS`:

```javascript
const MAX_LENGTHS = { title: 500, description: 10000, notes: 5000, name: 200, email: 254, body: 50000, source_detail: 500, linkedin_url: 2000 };
```

- [ ] **Step 4: Add `createTestHiringPosition` to the exports**

In `fixtures.js`, add `createTestHiringPosition` to the `module.exports` object (around line 289).

- [ ] **Step 5: Run existing tests to confirm nothing broke**

```
npm test
```

Expected: all 447 tests pass.

- [ ] **Step 6: Commit**

```
git add dashboard-server/tests/helpers/fixtures.js dashboard-server/lib/helpers.js
git commit -m "feat(ats): update test fixtures for ATS data foundation fields"
```

---

## Task 3: Server — Stage History Recording + `onboarded` Stage + PATCH Side-Effect Ordering

**Files:**
- Modify: `dashboard-server/routes/hiring.js:32-38` (HIRING_STAGES), `hiring.js:205-257` (POST), `hiring.js:295-339` (PATCH)

This task restructures the PATCH endpoint to have clear side-effect ordering (Problem #5) and adds stage transition history recording to both POST and PATCH.

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/ats-data-foundation.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestCandidate } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Stage transition history', () => {
  it('records history on candidate creation (from_stage = NULL)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'TestCo' });

    const res = await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Alice', client_id: client.id, stage: 'sourcing' })
      .expect(201);

    const { rows } = await pool.query(
      'SELECT * FROM candidate_stage_history WHERE candidate_id = $1 ORDER BY moved_at',
      [res.body.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].from_stage).toBeNull();
    expect(rows[0].to_stage).toBe('sourcing');
    expect(rows[0].moved_by).toBe(admin.display_name);
  });

  it('records history on stage change via PATCH', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Bob', stage: 'sourcing' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'interviews' })
      .expect(200);

    const { rows } = await pool.query(
      'SELECT * FROM candidate_stage_history WHERE candidate_id = $1 ORDER BY moved_at',
      [candidate.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].from_stage).toBe('sourcing');
    expect(rows[0].to_stage).toBe('interviews');
  });

  it('does NOT record history when stage is unchanged', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Carla', stage: 'sourcing' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'sourcing', role: 'Engineer' })
      .expect(200);

    const { rows } = await pool.query(
      'SELECT * FROM candidate_stage_history WHERE candidate_id = $1',
      [candidate.id]
    );
    expect(rows).toHaveLength(0);
  });

  it('accepts onboarded as a valid stage', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Dan', stage: 'offer' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'onboarded' })
      .expect(200);

    expect(res.body.stage).toBe('onboarded');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

Expected: failures — `onboarded` rejected by validation, no history rows created.

- [ ] **Step 3: Add `onboarded` to `HIRING_STAGES`**

In `hiring.js:32-38`, update:

```javascript
const HIRING_STAGES = [
  'sourcing',
  'interviews',
  'offer',
  'onboarding',
  'onboarded',
];
```

Note: `hired` is removed. The spec says `onboarded` is the new terminal stage. Existing candidates in `hired` stage are already archived (they have `archived_at` set). No data migration needed — archived candidates stay in their archived stage. The kanban only shows non-archived candidates by default.

- [ ] **Step 4: Add stage history INSERT to POST `/api/candidates`**

In `hiring.js`, inside the POST endpoint transaction, after the INSERT RETURNING (after line 246 `createdRow = rows[0];`) and before `await dbClient.query('COMMIT');` (line 247), add:

```javascript
      // Record initial stage entry in transition history
      await dbClient.query(
        'INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by) VALUES ($1, $2, $3, $4)',
        [createdRow.id, null, targetStage, req.user.displayName || 'unknown']
      );
```

- [ ] **Step 5: Add stage history INSERT to PATCH `/api/candidates/:id`**

In `hiring.js`, inside the PATCH endpoint transaction, after the `reorderInGroup` call (after line 321) and before the `if (updates.length > 0)` block (line 324), add:

```javascript
        // Record stage transition if stage actually changed
        const oldStage = oldRow.rows[0].stage;
        if (body.stage !== undefined && body.stage !== oldStage) {
          await dbClient.query(
            'INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by) VALUES ($1, $2, $3, $4)',
            [req.params.id, oldStage, body.stage, req.user.displayName || 'unknown']
          );
        }
```

This goes inside the `if (wantsReorder)` block, using the `dbClient` transaction connection. The `oldStage` comparison ensures no history row when the stage is unchanged (e.g. a position-only reorder within the same stage).

- [ ] **Step 6: Run tests to verify they pass**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

Expected: all 4 tests pass.

- [ ] **Step 7: Commit**

```
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/ats-data-foundation.test.mjs
git commit -m "feat(ats): stage transition history + onboarded stage"
```

---

## Task 4: Server — Candidate History Read Endpoint

**Files:**
- Create: `dashboard-server/routes/candidate-history.js`
- Modify: `dashboard-server/server.js:441` (mount)

- [ ] **Step 1: Write failing tests**

Append to `ats-data-foundation.test.mjs`:

```javascript
describe('GET /api/candidates/:id/history', () => {
  it('returns transition history ordered by moved_at ASC', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Eve', stage: 'sourcing' });

    // Create two history entries
    await pool.query(
      "INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by, moved_at) VALUES ($1, NULL, 'sourcing', 'Admin', NOW() - INTERVAL '2 days')",
      [candidate.id]
    );
    await pool.query(
      "INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by, moved_at) VALUES ($1, 'sourcing', 'interviews', 'Admin', NOW() - INTERVAL '1 day')",
      [candidate.id]
    );

    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/history`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].to_stage).toBe('sourcing');
    expect(res.body[1].to_stage).toBe('interviews');
  });

  it('client user can only view history for their own candidates', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const candidateB = await createTestCandidate({ name: 'Fiona', client_id: clientB.id });

    const token = await mintSession(userA.id);
    await request(app)
      .get(`/api/candidates/${candidateB.id}/history`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(403);
  });
});
```

- [ ] **Step 2: Run tests — expect failure (404, route not mounted)**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

- [ ] **Step 3: Create `candidate-history.js`**

```javascript
'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid } = ctx;

  router.get('/api/candidates/:id/history', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });

    try {
      // Verify candidate exists and check ownership for client users
      const { rows: [candidate] } = await pool.query('SELECT client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

      if (req.user.clientId && candidate.client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { rows } = await pool.query(
        'SELECT id, candidate_id, from_stage, to_stage, moved_by, moved_at, notes FROM candidate_stage_history WHERE candidate_id = $1 ORDER BY moved_at ASC',
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      log('error', 'CandidateHistory', 'Failed to get history', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
```

- [ ] **Step 4: Mount in `server.js`**

After the hiring routes mount at `server.js:441`, add:

```javascript
app.use(require('./routes/candidate-history')({ pool, log, isValidUuid }));
```

- [ ] **Step 5: Run tests to verify they pass**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

Expected: all 6 tests pass.

- [ ] **Step 6: Commit**

```
git add dashboard-server/routes/candidate-history.js dashboard-server/server.js dashboard-server/tests/unit/ats-data-foundation.test.mjs
git commit -m "feat(ats): candidate history read endpoint with client scoping"
```

---

## Task 5: Server — New Candidate Fields (Email, Source, Tags)

**Files:**
- Modify: `dashboard-server/routes/hiring.js:158-170` (GET SELECT), `hiring.js:205-257` (POST), `hiring.js:295-339` (PATCH)

- [ ] **Step 1: Write failing tests**

Append to `ats-data-foundation.test.mjs`:

```javascript
const VALID_SOURCES = ['referral', 'linkedin', 'inbound', 'agency', 'job-board', 'internal', 'other'];

describe('Candidate new fields — email, source, tags', () => {
  it('POST accepts email, source, source_detail', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Grace', email: 'grace@example.com', source: 'referral', source_detail: 'From Glen' })
      .expect(201);

    expect(res.body.email).toBe('grace@example.com');
    expect(res.body.source).toBe('referral');
    expect(res.body.source_detail).toBe('From Glen');
  });

  it('rejects invalid source value', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Hank', source: 'invalid-source' })
      .expect(400);
  });

  it('rejects malformed email', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Ivan', email: 'not-an-email' })
      .expect(400);
  });

  it('PATCH updates tags — normalises to lowercase, deduplicates', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Jill' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ tags: ['Senior', ' SENIOR ', 'greek-speaking', ''] })
      .expect(200);

    expect(res.body.tags).toEqual(['senior', 'greek-speaking']);
  });

  it('rejects tags exceeding 20 items', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Karl' });
    const tooMany = Array.from({ length: 21 }, (_, i) => `tag-${i}`);

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ tags: tooMany })
      .expect(400);
  });

  it('rejects tag longer than 50 characters', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Lara' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ tags: ['a'.repeat(51)] })
      .expect(400);
  });

  it('GET candidates list includes new fields', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    await createTestCandidate({ name: 'Mona', email: 'm@test.com', source: 'linkedin', tags: ['senior'] });

    const res = await request(app)
      .get('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body[0].email).toBe('m@test.com');
    expect(res.body[0].source).toBe('linkedin');
    expect(res.body[0].tags).toEqual(['senior']);
  });

  it('rejects source_detail exceeding 500 characters', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Ned', source: 'referral', source_detail: 'x'.repeat(501) })
      .expect(400);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

- [ ] **Step 3: Add validation constants and helpers to `hiring.js`**

After the `HIRING_STAGES` array (after line 38), add:

```javascript
  const VALID_SOURCES = ['referral', 'linkedin', 'inbound', 'agency', 'job-board', 'internal', 'other'];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateAndNormaliseTags(tags) {
    if (!Array.isArray(tags)) return { error: 'tags must be an array' };
    const normalised = [...new Set(
      tags.map(t => typeof t === 'string' ? t.trim().toLowerCase() : '')
          .filter(t => t.length > 0)
    )];
    if (normalised.length > 20) return { error: 'Maximum 20 tags allowed' };
    const tooLong = normalised.find(t => t.length > 50);
    if (tooLong) return { error: 'Each tag must be 50 characters or fewer' };
    return { value: normalised };
  }
```

- [ ] **Step 4: Add validation to POST `/api/candidates`**

In the POST endpoint, after the existing `notes` validation block (around line 224) and before `const targetStage = ...` (line 226), add:

```javascript
    const { email, source, source_detail, tags } = req.body || {};
    if (email !== undefined && email !== null && email !== '') {
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email format' });
      const emailErr = validateLength(email, 'email');
      if (emailErr) return res.status(400).json({ error: emailErr });
    }
    if (source !== undefined && source !== null && source !== '') {
      if (!VALID_SOURCES.includes(source)) return res.status(400).json({ error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` });
    }
    if (source_detail !== undefined) {
      const sdErr = validateLength(source_detail, 'source_detail');
      if (sdErr) return res.status(400).json({ error: sdErr });
    }
    if (tags !== undefined) {
      const tagResult = validateAndNormaliseTags(tags);
      if (tagResult.error) return res.status(400).json({ error: tagResult.error });
      req.body.tags = tagResult.value;
    }
```

Update the INSERT query in POST to include the new fields:

```javascript
      const { rows } = await dbClient.query(
        `INSERT INTO candidates (client_id, position_id, name, role, linkedin_url, due_date, stage, notes, position, email, source, source_detail, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9,$10,$11,$12) RETURNING *`,
        [
          client_id || null,
          position_id || null,
          name.trim(),
          role || null,
          linkedin_url || null,
          due_date || null,
          targetStage,
          notes || null,
          email || null,
          source || null,
          source_detail || null,
          req.body.tags ? JSON.stringify(req.body.tags) : '[]',
        ]
      );
```

- [ ] **Step 5: Add validation to PATCH `/api/candidates/:id`**

Before the `buildPatchQuery` call at line 302, add validation for the new fields:

```javascript
    if (body.email !== undefined && body.email !== null && body.email !== '') {
      if (!EMAIL_RE.test(body.email)) return res.status(400).json({ error: 'Invalid email format' });
      const emailErr = validateLength(body.email, 'email');
      if (emailErr) return res.status(400).json({ error: emailErr });
    }
    if (body.source !== undefined && body.source !== null && body.source !== '') {
      if (!VALID_SOURCES.includes(body.source)) return res.status(400).json({ error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` });
    }
    if (body.source_detail !== undefined) {
      const sdErr = validateLength(body.source_detail, 'source_detail');
      if (sdErr) return res.status(400).json({ error: sdErr });
    }
    if (body.tags !== undefined) {
      const tagResult = validateAndNormaliseTags(body.tags);
      if (tagResult.error) return res.status(400).json({ error: tagResult.error });
      body.tags = tagResult.value;
    }
```

Expand the `buildPatchQuery` allowed fields list:

```javascript
    const { updates, vals, nextIdx } = buildPatchQuery(body, ['client_id', 'position_id', 'name', 'role', 'linkedin_url', 'due_date', 'notes', 'stage_assignees', 'start_date', 'onboarding_links', 'archived_at', 'email', 'source', 'source_detail', 'tags']);
```

- [ ] **Step 6: Expand the GET `/api/candidates` SELECT**

At `hiring.js:158-164`, add the new columns:

```sql
SELECT ca.id, ca.position_id, ca.client_id, ca.name, ca.role, ca.linkedin_url,
       ca.cv_filename, ca.due_date, ca.stage, ca.notes, ca.position, ca.created_at, ca.updated_at,
       ca.archived_at, ca.stage_assignees,
       ca.email, ca.source, ca.source_detail, ca.tags,
       ca.consent_given, ca.consent_date, ca.retention_expires_at,
       c.name AS client_name,
       p.title AS position_title,
       (ca.cv_filename IS NOT NULL) AS has_cv
```

- [ ] **Step 7: Run tests to verify they pass**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/ats-data-foundation.test.mjs
git commit -m "feat(ats): email, source, tags fields with validation"
```

---

## Task 6: Server — Threaded Comments Endpoint

**Files:**
- Create: `dashboard-server/routes/candidate-comments.js`
- Modify: `dashboard-server/server.js` (mount)
- Modify: `dashboard-server/routes/hiring.js` (comment count subquery in GET)

- [ ] **Step 1: Write failing tests**

Append to `ats-data-foundation.test.mjs`:

```javascript
describe('Candidate comments', () => {
  it('POST creates a comment', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Olive' });

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/comments`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ body: 'Great candidate, strong React skills.' })
      .expect(201);

    expect(res.body.body).toBe('Great candidate, strong React skills.');
    expect(res.body.author).toBe(admin.display_name);
    expect(res.body.author_user_id).toBe(admin.id);
    expect(res.body.internal).toBe(false);
  });

  it('GET returns comments ordered by created_at ASC', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Pat' });

    await pool.query(
      "INSERT INTO candidate_comments (candidate_id, author, author_user_id, body, created_at) VALUES ($1, 'A', $2, 'First', NOW() - INTERVAL '1 hour')",
      [candidate.id, admin.id]
    );
    await pool.query(
      "INSERT INTO candidate_comments (candidate_id, author, author_user_id, body, created_at) VALUES ($1, 'A', $2, 'Second', NOW())",
      [candidate.id, admin.id]
    );

    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/comments`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].body).toBe('First');
    expect(res.body[1].body).toBe('Second');
  });

  it('client user cannot see internal comments', async () => {
    const client = await createTestClient({ name: 'ClientX' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const candidate = await createTestCandidate({ name: 'Quinn', client_id: client.id });

    await pool.query(
      "INSERT INTO candidate_comments (candidate_id, author, body, internal) VALUES ($1, 'NBI', 'Internal note', true)",
      [candidate.id]
    );
    await pool.query(
      "INSERT INTO candidate_comments (candidate_id, author, body, internal) VALUES ($1, 'NBI', 'Public note', false)",
      [candidate.id]
    );

    const token = await mintSession(clientUser.id);
    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/comments`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].body).toBe('Public note');
  });

  it('client user comments are always public (internal ignored)', async () => {
    const client = await createTestClient({ name: 'ClientY' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const candidate = await createTestCandidate({ name: 'Rosa', client_id: client.id });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/comments`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ body: 'Client comment', internal: true })
      .expect(201);

    expect(res.body.internal).toBe(false);
  });

  it('DELETE only allowed by comment author', async () => {
    const admin1 = await createTestUser({ role: 'admin', display_name: 'Admin1' });
    const admin2 = await createTestUser({ role: 'admin', display_name: 'Admin2' });
    const candidate = await createTestCandidate({ name: 'Sam' });

    const { rows: [comment] } = await pool.query(
      'INSERT INTO candidate_comments (candidate_id, author, author_user_id, body) VALUES ($1, $2, $3, $4) RETURNING *',
      [candidate.id, admin1.display_name, admin1.id, 'My comment']
    );

    const token2 = await mintSession(admin2.id);
    await request(app)
      .delete(`/api/candidates/${candidate.id}/comments/${comment.id}`)
      .set('Cookie', `nbi_session=${token2}`)
      .expect(403);

    const token1 = await mintSession(admin1.id);
    await request(app)
      .delete(`/api/candidates/${candidate.id}/comments/${comment.id}`)
      .set('Cookie', `nbi_session=${token1}`)
      .expect(200);
  });

  it('rejects empty comment body', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Tina' });

    await request(app)
      .post(`/api/candidates/${candidate.id}/comments`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ body: '' })
      .expect(400);
  });

  it('rejects comment body exceeding 5000 characters', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Uma' });

    await request(app)
      .post(`/api/candidates/${candidate.id}/comments`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ body: 'x'.repeat(5001) })
      .expect(400);
  });

  it('comment_count appears in GET /api/candidates list', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Vera' });

    await pool.query(
      "INSERT INTO candidate_comments (candidate_id, author, body) VALUES ($1, 'A', 'Note 1')",
      [candidate.id]
    );
    await pool.query(
      "INSERT INTO candidate_comments (candidate_id, author, body) VALUES ($1, 'A', 'Note 2')",
      [candidate.id]
    );

    const res = await request(app)
      .get('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    const c = res.body.find(x => x.id === candidate.id);
    expect(c.comment_count).toBe(2);
  });

  it('client user comment_count excludes internal comments', async () => {
    const client = await createTestClient({ name: 'ClientZ' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const candidate = await createTestCandidate({ name: 'Walt', client_id: client.id });

    await pool.query(
      "INSERT INTO candidate_comments (candidate_id, author, body, internal) VALUES ($1, 'A', 'Internal', true)",
      [candidate.id]
    );
    await pool.query(
      "INSERT INTO candidate_comments (candidate_id, author, body, internal) VALUES ($1, 'A', 'Public', false)",
      [candidate.id]
    );

    const token = await mintSession(clientUser.id);
    const res = await request(app)
      .get('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body[0].comment_count).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

- [ ] **Step 3: Create `candidate-comments.js`**

```javascript
'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid, validateLength } = ctx;

  // GET /api/candidates/:id/comments
  router.get('/api/candidates/:id/comments', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });

    try {
      const { rows: [candidate] } = await pool.query('SELECT client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
      if (req.user.clientId && candidate.client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const isClientUser = !!req.user.clientId;
      let query = 'SELECT * FROM candidate_comments WHERE candidate_id = $1';
      if (isClientUser) query += ' AND internal = false';
      query += ' ORDER BY created_at ASC';

      const { rows } = await pool.query(query, [req.params.id]);
      res.json(rows);
    } catch (e) {
      log('error', 'CandidateComments', 'Failed to list comments', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // POST /api/candidates/:id/comments
  router.post('/api/candidates/:id/comments', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });

    const { body: commentBody } = req.body || {};
    if (!commentBody || !commentBody.trim()) return res.status(400).json({ error: 'Comment body required' });
    const lenErr = validateLength(commentBody, 'body', 5000);
    if (lenErr) return res.status(400).json({ error: lenErr });

    try {
      const { rows: [candidate] } = await pool.query('SELECT client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
      if (req.user.clientId && candidate.client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Client users cannot post internal comments
      const isClientUser = !!req.user.clientId;
      const internal = isClientUser ? false : (req.body.internal === true);

      const { rows } = await pool.query(
        `INSERT INTO candidate_comments (candidate_id, author, author_user_id, body, internal)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.id, req.user.displayName || 'Unknown', req.user.id, commentBody.trim(), internal]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      log('error', 'CandidateComments', 'Failed to create comment', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // DELETE /api/candidates/:id/comments/:commentId
  router.delete('/api/candidates/:id/comments/:commentId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.commentId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
      const { rows: [comment] } = await pool.query(
        'SELECT author_user_id FROM candidate_comments WHERE id = $1 AND candidate_id = $2',
        [req.params.commentId, req.params.id]
      );
      if (!comment) return res.status(404).json({ error: 'Comment not found' });

      const isAdmin = req.user.role === 'admin';
      if (comment.author_user_id !== req.user.id && !isAdmin) {
        return res.status(403).json({ error: 'Only the author or admin can delete this comment' });
      }

      await pool.query('DELETE FROM candidate_comments WHERE id = $1', [req.params.commentId]);
      res.json({ ok: true });
    } catch (e) {
      log('error', 'CandidateComments', 'Failed to delete comment', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
```

- [ ] **Step 4: Mount in `server.js`**

After the `candidate-history` mount, add:

```javascript
app.use(require('./routes/candidate-comments')({ pool, log, isValidUuid, validateLength }));
```

- [ ] **Step 5: Add `comment_count` subquery to GET `/api/candidates`**

In `hiring.js`, in the GET `/api/candidates` handler, before the main SELECT query (around line 157), add:

```javascript
    const commentCountSql = req.user.clientId
      ? '(SELECT COUNT(*)::int FROM candidate_comments cc WHERE cc.candidate_id = ca.id AND cc.internal = false) AS comment_count'
      : '(SELECT COUNT(*)::int FROM candidate_comments cc WHERE cc.candidate_id = ca.id) AS comment_count';
```

Then add `${commentCountSql}` to the SELECT column list, after the `(ca.cv_filename IS NOT NULL) AS has_cv` line:

```sql
       (ca.cv_filename IS NOT NULL) AS has_cv,
       ${commentCountSql}
```

Note: `commentCountSql` is a static SQL fragment chosen by a server-side boolean (`req.user.clientId`), not interpolated from user input. This is safe — no parameterised input needed.

- [ ] **Step 6: Run tests**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```
git add dashboard-server/routes/candidate-comments.js dashboard-server/server.js dashboard-server/routes/hiring.js dashboard-server/tests/unit/ats-data-foundation.test.mjs
git commit -m "feat(ats): threaded comments with internal visibility + comment count"
```

---

## Task 7: Server — GDPR Retention Fields

**Files:**
- Modify: `dashboard-server/routes/hiring.js` (PATCH, POST, GET)

- [ ] **Step 1: Write failing tests**

Append to `ats-data-foundation.test.mjs`:

```javascript
describe('GDPR retention fields', () => {
  it('POST auto-sets retention_expires_at to 12 months from now', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Ava' })
      .expect(201);

    expect(res.body.retention_expires_at).toBeTruthy();
    const expiry = new Date(res.body.retention_expires_at);
    const now = new Date();
    const diffMonths = (expiry.getFullYear() - now.getFullYear()) * 12 + (expiry.getMonth() - now.getMonth());
    expect(diffMonths).toBeGreaterThanOrEqual(11);
    expect(diffMonths).toBeLessThanOrEqual(12);
  });

  it('PATCH auto-stamps consent_date when consent_given set to true', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Ben' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ consent_given: true })
      .expect(200);

    expect(res.body.consent_given).toBe(true);
    expect(res.body.consent_date).toBeTruthy();
  });

  it('PATCH does not overwrite explicit consent_date', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Chloe' });
    const explicitDate = '2026-01-15T12:00:00.000Z';

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ consent_given: true, consent_date: explicitDate })
      .expect(200);

    expect(new Date(res.body.consent_date).toISOString()).toBe(explicitDate);
  });

  it('GET with retention=expiring returns only candidates near/past expiry', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000 * 90).toISOString();
    const within30 = new Date(Date.now() + 86400000 * 15).toISOString();

    await createTestCandidate({ name: 'Expired', retention_expires_at: past });
    await createTestCandidate({ name: 'FarFuture', retention_expires_at: future });
    await createTestCandidate({ name: 'SoonExpiring', retention_expires_at: within30 });

    const res = await request(app)
      .get('/api/candidates?retention=expiring')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    const names = res.body.map(c => c.name);
    expect(names).toContain('Expired');
    expect(names).toContain('SoonExpiring');
    expect(names).not.toContain('FarFuture');
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

- [ ] **Step 3: Add GDPR fields to PATCH allowed fields**

The GDPR columns (`consent_given`, `consent_date`, `retention_expires_at`) were already added to the GET SELECT in Task 5. Now add them to the `buildPatchQuery` allowed list:

```javascript
    const { updates, vals, nextIdx } = buildPatchQuery(body, ['client_id', 'position_id', 'name', 'role', 'linkedin_url', 'due_date', 'notes', 'stage_assignees', 'start_date', 'onboarding_links', 'archived_at', 'email', 'source', 'source_detail', 'tags', 'consent_given', 'consent_date', 'retention_expires_at']);
```

- [ ] **Step 4: Add consent_date auto-stamp in PATCH**

After the tag normalisation block added in Task 5 and before `buildPatchQuery`, add:

```javascript
    // Auto-stamp consent_date when consent_given is set to true without an explicit date
    if (body.consent_given === true && body.consent_date === undefined) {
      body.consent_date = new Date().toISOString();
    }
```

- [ ] **Step 5: Add retention auto-default in POST**

In the POST endpoint, update the INSERT query to include GDPR fields. After the `tags` parameter in the INSERT, add `consent_given`, `consent_date`, `retention_expires_at`. The `retention_expires_at` uses a SQL expression for server-side default:

Replace the INSERT query with:

```javascript
      const retentionExpiry = req.body.retention_expires_at || null;
      const { rows } = await dbClient.query(
        `INSERT INTO candidates (client_id, position_id, name, role, linkedin_url, due_date, stage, notes, position, email, source, source_detail, tags, consent_given, consent_date, retention_expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9,$10,$11,$12,$13,$14, COALESCE($15, NOW() + INTERVAL '12 months')) RETURNING *`,
        [
          client_id || null,
          position_id || null,
          name.trim(),
          role || null,
          linkedin_url || null,
          due_date || null,
          targetStage,
          notes || null,
          email || null,
          source || null,
          source_detail || null,
          req.body.tags ? JSON.stringify(req.body.tags) : '[]',
          req.body.consent_given || false,
          req.body.consent_date || null,
          retentionExpiry,
        ]
      );
```

- [ ] **Step 6: Add retention filter to GET `/api/candidates`**

In the GET handler, after the existing `position_id` filter (around line 151) and before `const whereClause`:

```javascript
    if (req.query.retention === 'expiring') {
      if (req.user.clientId) return res.status(403).json({ error: 'Retention filter is NBI-only' });
      where.push(`ca.retention_expires_at <= NOW() + INTERVAL '30 days'`);
    }
```

- [ ] **Step 7: Run tests**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

Expected: all tests pass.

- [ ] **Step 8: Run full test suite**

```
npm test
```

Expected: all tests pass (existing + new).

- [ ] **Step 9: Commit**

```
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/ats-data-foundation.test.mjs
git commit -m "feat(ats): GDPR retention fields with auto-defaults and expiring filter"
```

---

## Task 8: Server — Enriched Hiring Positions

**Files:**
- Modify: `dashboard-server/routes/hiring.js:42-72` (GET), `hiring.js:75-94` (POST), `hiring.js:97-118` (PATCH)

- [ ] **Step 1: Write failing tests**

Append to `ats-data-foundation.test.mjs`. Add `createTestHiringPosition` to the imports at the top:

```javascript
const { createTestUser, createTestClient, createTestCandidate, createTestHiringPosition } = require('../helpers/fixtures.js');
```

Then add:

```javascript
describe('Enriched hiring positions', () => {
  it('POST creates position with new fields', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'Acme' });

    const res = await request(app)
      .post('/api/hiring-positions')
      .set('Cookie', `nbi_session=${token}`)
      .send({
        client_id: client.id,
        title: 'Senior Dev',
        salary_range: '£45,000-£55,000',
        employment_type: 'permanent',
        location: 'Remote',
        requirements: ['React', 'Node.js', 'PostgreSQL'],
        interview_panel: [{ user_id: admin.id, name: admin.display_name, role: 'Final interview' }],
      })
      .expect(201);

    expect(res.body.salary_range).toBe('£45,000-£55,000');
    expect(res.body.employment_type).toBe('permanent');
    expect(res.body.location).toBe('Remote');
    expect(res.body.requirements).toEqual(['React', 'Node.js', 'PostgreSQL']);
    expect(res.body.interview_panel[0].user_id).toBe(admin.id);
  });

  it('rejects invalid employment_type', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    await request(app)
      .post('/api/hiring-positions')
      .set('Cookie', `nbi_session=${token}`)
      .send({ title: 'Bad Type', employment_type: 'intern' })
      .expect(400);
  });

  it('GET includes new position fields', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    await createTestHiringPosition({ title: 'PM', salary_range: '£60k', location: 'London' });

    const res = await request(app)
      .get('/api/hiring-positions')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    const p = res.body.find(x => x.title === 'PM');
    expect(p.salary_range).toBe('£60k');
    expect(p.location).toBe('London');
  });

  it('PATCH updates position fields', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const pos = await createTestHiringPosition({ title: 'QA Lead' });

    const res = await request(app)
      .patch(`/api/hiring-positions/${pos.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ salary_range: '£50k-£65k', requirements: ['Playwright', 'CI/CD'] })
      .expect(200);

    expect(res.body.salary_range).toBe('£50k-£65k');
    expect(res.body.requirements).toEqual(['Playwright', 'CI/CD']);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

- [ ] **Step 3: Add new fields to GET positions SELECT**

At `hiring.js:55-60`, update the SELECT:

```sql
        SELECT p.id, p.client_id, p.sow_id, p.title, p.description, p.seniority,
               p.status, p.created_at, p.updated_at,
               p.salary_range, p.employment_type, p.location, p.requirements, p.interview_panel,
               c.name AS client_name,
               s.title AS sow_title,
               (SELECT COUNT(*)::int FROM candidates ca WHERE ca.position_id = p.id) AS candidate_count
```

- [ ] **Step 4: Add new fields to POST positions**

At `hiring.js:75-94`, add validation and expand the INSERT. Add after the existing `sow_id` validation (around line 81):

```javascript
    const VALID_EMPLOYMENT_TYPES = ['permanent', 'contract', 'freelance'];
    if (req.body.employment_type && !VALID_EMPLOYMENT_TYPES.includes(req.body.employment_type)) {
      return res.status(400).json({ error: `Invalid employment_type. Must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}` });
    }
```

Update the INSERT:

```javascript
      const { rows } = await pool.query(
        `INSERT INTO hiring_positions (client_id, sow_id, title, description, seniority, status, salary_range, employment_type, location, requirements, interview_panel)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          client_id || null, sow_id || null, title.trim(), description || null,
          seniority || null, status || 'open',
          req.body.salary_range || null,
          req.body.employment_type || 'permanent',
          req.body.location || null,
          req.body.requirements ? JSON.stringify(req.body.requirements) : '[]',
          req.body.interview_panel ? JSON.stringify(req.body.interview_panel) : '[]',
        ]
      );
```

- [ ] **Step 5: Add new fields to PATCH positions**

At `hiring.js:99`, expand the allowed fields:

```javascript
    const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['client_id', 'sow_id', 'title', 'description', 'seniority', 'status', 'salary_range', 'employment_type', 'location', 'requirements', 'interview_panel']);
```

Add `employment_type` validation before `buildPatchQuery`:

```javascript
    const VALID_EMPLOYMENT_TYPES = ['permanent', 'contract', 'freelance'];
    if (req.body.employment_type && !VALID_EMPLOYMENT_TYPES.includes(req.body.employment_type)) {
      return res.status(400).json({ error: `Invalid employment_type. Must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}` });
    }
```

- [ ] **Step 6: Run tests**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/ats-data-foundation.test.mjs
git commit -m "feat(ats): enriched position fields — salary, type, location, requirements, panel"
```

---

## Task 9: Server — Candidate Polling Endpoint

**Files:**
- Modify: `dashboard-server/routes/hiring.js`

This resolves Problem #8 — no multi-user sync for hiring data.

- [ ] **Step 1: Write failing tests**

Append to `ats-data-foundation.test.mjs`:

```javascript
describe('Candidate polling', () => {
  it('returns candidates updated after the since timestamp', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const old = await createTestCandidate({ name: 'Old' });
    // Manually set updated_at to the past
    await pool.query("UPDATE candidates SET updated_at = NOW() - INTERVAL '1 hour' WHERE id = $1", [old.id]);

    const recent = await createTestCandidate({ name: 'Recent' });

    const since = new Date(Date.now() - 30000).toISOString(); // 30 seconds ago
    const res = await request(app)
      .get(`/api/candidates/poll?since=${since}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.updated.some(c => c.name === 'Recent')).toBe(true);
    expect(res.body.updated.some(c => c.name === 'Old')).toBe(false);
    expect(Array.isArray(res.body.allIds)).toBe(true);
  });

  it('client user poll is scoped to their client', async () => {
    const clientA = await createTestClient({ name: 'PollClientA' });
    const clientB = await createTestClient({ name: 'PollClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });

    await createTestCandidate({ name: 'MyCandidate', client_id: clientA.id });
    await createTestCandidate({ name: 'OtherCandidate', client_id: clientB.id });

    const since = new Date(Date.now() - 60000).toISOString();
    const token = await mintSession(userA.id);
    const res = await request(app)
      .get(`/api/candidates/poll?since=${since}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.updated.every(c => c.client_id === clientA.id)).toBe(true);
    expect(res.body.allIds.length).toBe(1);
  });

  it('rejects missing since parameter', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    await request(app)
      .get('/api/candidates/poll')
      .set('Cookie', `nbi_session=${token}`)
      .expect(400);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

- [ ] **Step 3: Add the poll endpoint**

In `hiring.js`, add before the PATCH endpoint (this must be placed before the `/:id` route to avoid path collision):

```javascript
  /** GET /api/candidates/poll?since=<ISO> — Lightweight polling for multi-user sync.
   *  Returns candidates updated after the given timestamp + full ID list for deletion detection. */
  router.get('/api/candidates/poll', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const since = req.query.since;
    if (!since) return res.status(400).json({ error: 'since parameter required' });
    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) return res.status(400).json({ error: 'Invalid timestamp' });

    const scopedClientId = req.user.clientId || null;
    try {
      let updatedQuery, idQuery;
      const vals = [sinceDate.toISOString()];

      if (scopedClientId) {
        vals.push(scopedClientId);
        updatedQuery = `SELECT ca.*, c.name AS client_name, p.title AS position_title, (ca.cv_filename IS NOT NULL) AS has_cv
          FROM candidates ca LEFT JOIN clients c ON ca.client_id = c.id LEFT JOIN hiring_positions p ON ca.position_id = p.id
          WHERE ca.updated_at > $1 AND ca.client_id = $2`;
        idQuery = 'SELECT id FROM candidates WHERE client_id = $2';
      } else {
        updatedQuery = `SELECT ca.*, c.name AS client_name, p.title AS position_title, (ca.cv_filename IS NOT NULL) AS has_cv
          FROM candidates ca LEFT JOIN clients c ON ca.client_id = c.id LEFT JOIN hiring_positions p ON ca.position_id = p.id
          WHERE ca.updated_at > $1`;
        idQuery = 'SELECT id FROM candidates';
      }

      const [updated, allIdRows] = await Promise.all([
        pool.query(updatedQuery, vals),
        pool.query(idQuery, scopedClientId ? [scopedClientId] : []),
      ]);

      res.json({
        updated: updated.rows,
        allIds: allIdRows.rows.map(r => r.id),
      });
    } catch (e) {
      log('error', 'Hiring', 'Failed to poll candidates', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

**Important placement note:** This route MUST be declared before `router.get('/api/candidates/:id', ...)` (currently at line 180). Otherwise Express will match `/api/candidates/poll` as `/:id` with `id = "poll"` and return a UUID validation error. Place it directly after the GET `/api/candidates` list endpoint.

- [ ] **Step 4: Run tests**

```
npx vitest run tests/unit/ats-data-foundation.test.mjs
```

Expected: all tests pass.

- [ ] **Step 5: Run full test suite**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/ats-data-foundation.test.mjs
git commit -m "feat(ats): candidate poll endpoint for multi-user sync"
```

---

## Task 10: Frontend — Decompose `openCandidateDetail` + Add New Sections

**Files:**
- Modify: `nbi_project_dashboard.html`

This is the largest frontend task. It resolves Problem #10 (decomposition), Problem #4 (skeleton + lazy-load), and Problem #7 (comment count badge staleness). It also adds all new Spec A sections to the detail panel.

- [ ] **Step 1: Add `onboarded` to frontend stage constants**

At `nbi_project_dashboard.html:19081-19094`, update:

```javascript
const HIRING_STAGES = [
  'sourcing',
  'interviews',
  'offer',
  'onboarding',
  'onboarded',
];
const HIRING_STAGE_LABELS = {
  sourcing:    'Sourcing',
  interviews:  'Interviews',
  offer:       'Offer',
  onboarding:  'Onboarding',
  onboarded:   'Onboarded',
};
```

- [ ] **Step 2: Update `hiringConfirmHire` to use `onboarded`**

At `nbi_project_dashboard.html:19965-19989`, update the function:

```javascript
async function hiringConfirmHire(id) {
  const c = _candidatesData.find(x => x.id === id);
  if (!c) return;
  const prev = c.stage;
  const ok = await themedConfirm('Close Candidate Card?\nThis will mark the candidate as Onboarded and archive the card.', 'Close Candidate Card', 'Confirm');
  if (!ok) {
    if (document.getElementById('candidateDetailPanel')?.classList.contains('open')) openCandidateDetail(id);
    return;
  }
  const resp = await authFetch('/api/candidates/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'onboarded', archived_at: new Date().toISOString() })
  });
  if (resp.ok) {
    toast('Candidate archived');
    await loadCandidates();
    if (currentView === 'hiring') renderContent();
    renderSidebar();
    if (document.getElementById('candidateDetailPanel')?.classList.contains('open')) openCandidateDetail(id);
  } else {
    toast('Failed to archive', 'error');
  }
}
```

- [ ] **Step 3: Decompose `openCandidateDetail` into helper functions**

Replace the monolithic function at lines 19782-19911 with helper functions and a coordinator. Add the helpers BEFORE `openCandidateDetail`:

```javascript
function buildCandidateHeaderHtml(c, isArchived) {
  const header = c.name && c.name.trim() ? c.name : (c.role || 'Unnamed candidate');
  const subheader = c.name && c.name.trim() && c.role ? c.role : '';
  return `<div class="candidate-detail__header">
    <div style="flex:1;min-width:0">
      <div style="display:flex;gap:var(--space-sm);align-items:center;margin-bottom:6px;flex-wrap:wrap">
        <span class="hiring-stage-badge hiring-stage-badge--${c.stage}">${HIRING_STAGE_LABELS[c.stage] || c.stage}</span>
        ${c.client_name ? `<span style="font-size:0.78rem;color:var(--text-muted)">${esc(c.client_name)}</span>` : ''}
        ${isArchived ? '<span style="background:var(--success);color:#fff;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:700">ARCHIVED &#10003;</span>' : ''}
      </div>
      <h3 style="font-size:1rem;font-weight:600;margin:0;word-break:break-word">${esc(header)}</h3>
      ${subheader ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">${esc(subheader)}</div>` : ''}
    </div>
    <button class="btn btn--ghost btn--sm" data-action="closeCandidateDetail" aria-label="Close" style="flex-shrink:0">&times;</button>
  </div>`;
}

function buildCandidateProfileHtml(c, isDetailScoped, clientList, positions, disabledStyle) {
  return `<div class="candidate-detail__section" style="${disabledStyle}">
    <div class="candidate-detail__section-title">Profile</div>
    <div class="candidate-detail__field"><label>Name</label><input type="text" id="cdName" value="${esc(c.name || '')}" placeholder="Leave blank to show role as header" onchange="updateCandidateField('${c.id}','name',this.value)"></div>
    <div class="candidate-detail__field"><label>Role</label><input type="text" id="cdRole" value="${esc(c.role || '')}" placeholder="e.g. Senior Backend Engineer" onchange="updateCandidateField('${c.id}','role',this.value)"></div>
    <div class="candidate-detail__field"><label>Email</label><input type="email" id="cdEmail" value="${esc(c.email || '')}" placeholder="candidate@example.com" onchange="updateCandidateField('${c.id}','email',this.value||null)"></div>
    <div class="candidate-detail__field"><label>LinkedIn URL</label><input type="url" id="cdLinkedIn" value="${esc(c.linkedin_url || '')}" placeholder="https://linkedin.com/in/..." onchange="updateCandidateField('${c.id}','linkedin_url',this.value)"></div>
    <div class="candidate-detail__field"><label>Due date</label><input type="date" id="cdDue" value="${c.due_date ? c.due_date.slice(0,10) : ''}" onchange="updateCandidateField('${c.id}','due_date',this.value||null)"></div>
    <div class="candidate-detail__field">
      <label>Source</label>
      <select id="cdSource" onchange="updateCandidateField('${c.id}','source',this.value||null)">
        <option value="">— None —</option>
        ${['referral','linkedin','inbound','agency','job-board','internal','other'].map(s => `<option value="${s}" ${c.source===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1).replace('-',' ')}</option>`).join('')}
      </select>
    </div>
    <div class="candidate-detail__field"><label>Source detail</label><input type="text" id="cdSourceDetail" value="${esc(c.source_detail || '')}" placeholder="${c.source==='referral'?'Referrer name':c.source==='agency'?'Agency name':'Details'}" onchange="updateCandidateField('${c.id}','source_detail',this.value||null)"></div>
    ${!isDetailScoped ? `<div class="candidate-detail__field"><label>Client</label><select id="cdClient" onchange="updateCandidateField('${c.id}','client_id',this.value||null)"><option value="">— None —</option>${clientList.map(cl => `<option value="${cl.id}" ${c.client_id===cl.id?'selected':''}>${esc(cl.name)}</option>`).join('')}</select></div>` : ''}
    <div class="candidate-detail__field">
      <label>CV</label>
      <div class="candidate-cv">
        ${c.cv_filename ? `<span class="candidate-cv__name">${esc(c.cv_filename)}</span><button class="btn btn--sm" data-action="downloadCandidateCV" data-arg0="${c.id}">Download</button>` : '<span style="color:var(--text-muted);font-size:0.78rem">No CV uploaded</span>'}
        <input type="file" id="cdCvFile" style="display:none" onchange="uploadCandidateCV('${c.id}',this)">
        <button class="btn btn--sm" data-action="_actModalClick" data-arg0="cdCvFile">${c.cv_filename ? 'Replace' : 'Upload'}</button>
      </div>
    </div>
    ${positions.length > 0 ? `<div class="candidate-detail__field"><label>Hiring Position (template)</label><select id="cdPosition" onchange="updateCandidateField('${c.id}','position_id',this.value||null)"><option value="">— None —</option>${positions.filter(p => !c.client_id || p.client_id === c.client_id).map(p => `<option value="${p.id}" ${c.position_id===p.id?'selected':''}>${esc(p.title)}</option>`).join('')}</select></div>` : ''}
  </div>`;
}

function buildCandidateStageHtml(c, isArchived, disabledStyle) {
  const prev = hiringPrevStage(c.stage);
  const next = hiringNextStage(c.stage);
  const stageAssignees = (c.stage_assignees && typeof c.stage_assignees === 'object') ? c.stage_assignees : {};
  const currentStageAssignees = Array.isArray(stageAssignees[c.stage]) ? stageAssignees[c.stage] : [];
  const unassigned = !isArchived && currentStageAssignees.length === 0;

  return `<div class="candidate-detail__section" style="${disabledStyle}">
    <div class="candidate-detail__section-title">Stage</div>
    <div style="display:flex;align-items:center;gap:6px">
      <button class="btn btn--sm" style="min-width:36px;background:var(--bg-surface);color:${prev ? 'var(--text-secondary)' : 'var(--text-faint)'};border:1px solid var(--border-default)" ${prev ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${prev}" title="Previous: ${HIRING_STAGE_LABELS[prev]}"` : 'disabled'}>&larr;</button>
      <select id="cdStageSel" onchange="hiringStageSelectChange('${c.id}',this.value)" style="flex:1;font-weight:600;text-align:center;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">
        ${HIRING_STAGES.map(s => `<option value="${s}" ${c.stage===s?'selected':''}>${HIRING_STAGE_LABELS[s]}</option>`).join('')}
      </select>
      <button class="btn btn--sm" style="min-width:36px;background:color-mix(in srgb, var(--success) 30%, var(--bg-surface));color:#fff;border:1px solid var(--success)" ${next ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${next}" title="Next: ${HIRING_STAGE_LABELS[next]}"` : `data-action="hiringConfirmHire" data-arg0="${c.id}" title="Confirm Onboarded"`}>&rarr;</button>
    </div>
    ${unassigned ? '<div style="color:var(--danger);font-size:0.72rem;margin-top:6px">&#9888; No assignee on this stage</div>' : ''}
  </div>

  <div class="candidate-detail__section" style="${disabledStyle}">
    <div class="candidate-detail__section-title">Assigned to this stage</div>
    <div id="cdStageAssignees" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
      ${currentStageAssignees.map((name, i) => `<span style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:10px;padding:2px 8px;font-size:0.72rem;display:inline-flex;align-items:center;gap:4px">${esc(name)} <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.75rem" data-action="hiringRemoveStageAssignee" data-arg0="${c.id}" data-arg1="${esc(c.stage)}" data-arg2="${i}">&times;</button></span>`).join('')}
      ${currentStageAssignees.length === 0 ? '<span style="color:var(--danger);font-size:0.72rem;padding:2px 0">Unassigned — add someone</span>' : ''}
    </div>
    <div style="display:flex;gap:4px"><select id="cdStageAssigneeAdd" style="flex:1;font-size:0.78rem;padding:3px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)"><option value="">+ Add assignee…</option>${(_cachedTeamMembers || []).map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}</select><button class="btn btn--sm" data-action="hiringAddStageAssignee" data-arg0="${c.id}" data-arg1="${esc(c.stage)}">Add</button></div>
  </div>`;
}

function buildCandidateTagsHtml(c, disabledStyle) {
  const tags = Array.isArray(c.tags) ? c.tags : [];
  return `<div class="candidate-detail__section" style="${disabledStyle}">
    <div class="candidate-detail__section-title">Tags</div>
    <div id="cdTagsContainer" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
      ${tags.map(t => `<span style="background:var(--accent-muted);color:var(--accent-text);border-radius:10px;padding:2px 8px;font-size:0.72rem;display:inline-flex;align-items:center;gap:4px">${esc(t)} <button style="background:none;border:none;color:var(--accent-text);cursor:pointer;font-size:0.75rem" onclick="hiringRemoveTag('${c.id}','${esc(t)}')">&times;</button></span>`).join('')}
      ${tags.length === 0 ? '<span style="color:var(--text-muted);font-size:0.72rem">No tags</span>' : ''}
    </div>
    <div style="display:flex;gap:4px"><input type="text" id="cdTagInput" placeholder="Add tag (Enter or comma)" style="flex:1;font-size:0.78rem;padding:3px 6px" onkeydown="if(event.key==='Enter'||event.key===','){event.preventDefault();hiringAddTag('${c.id}',this.value);this.value='';}"><button class="btn btn--sm" onclick="hiringAddTag('${c.id}',document.getElementById('cdTagInput').value);document.getElementById('cdTagInput').value='';">Add</button></div>
  </div>`;
}

function buildCandidateStageSubHtml(c) {
  if (c.stage === 'offer') {
    return `<div class="candidate-detail__section"><div class="candidate-detail__section-title">Offer details</div><div class="candidate-detail__field"><label>Start date</label><input type="date" id="cdStartDate" value="${c.start_date ? String(c.start_date).slice(0,10) : ''}" onchange="updateCandidateField('${c.id}','start_date',this.value||null)"></div></div>`;
  } else if (c.stage === 'onboarding') {
    const links = Array.isArray(c.onboarding_links) ? c.onboarding_links : [];
    const linksHtml = links.length > 0
      ? links.map((l, i) => `<div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;padding:4px 0"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.type === 'file' ? '&#128196;' : '&#128279;'} <a href="${safeUrl(l.value)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-text)">${esc(l.value)}</a></span><button class="btn btn--sm btn--ghost" data-action="removeOnboardingLink" data-arg0="${c.id}" data-arg1="${i}" title="Remove">&times;</button></div>`).join('')
      : '<div style="color:var(--text-muted);font-size:0.78rem;padding:4px 0">No onboarding docs yet</div>';
    return `<div class="candidate-detail__section"><div class="candidate-detail__section-title">Onboarding documents</div>${linksHtml}<div style="display:flex;gap:6px;margin-top:6px"><input type="text" id="cdOnboardLink" placeholder="Paste a link (Google Doc, Drive, etc.)" style="flex:1"><button class="btn btn--sm" data-action="addOnboardingLink" data-arg0="${c.id}">Add link</button></div></div>`;
  }
  return '';
}

function buildCandidateGdprHtml(c, disabledStyle) {
  const expiresAt = c.retention_expires_at ? new Date(c.retention_expires_at) : null;
  const isExpiring = expiresAt && (expiresAt.getTime() - Date.now()) < 30 * 86400000;
  const isPast = expiresAt && expiresAt.getTime() < Date.now();
  return `<div class="candidate-detail__section" style="${disabledStyle}">
    <div class="candidate-detail__section-title">Data Consent</div>
    <div class="candidate-detail__field" style="display:flex;align-items:center;gap:8px">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="cdConsent" ${c.consent_given ? 'checked' : ''} onchange="updateCandidateField('${c.id}','consent_given',this.checked)">
        Consent given
      </label>
      ${c.consent_date ? `<span style="font-size:0.72rem;color:var(--text-muted)">${new Date(c.consent_date).toLocaleDateString()}</span>` : ''}
    </div>
    <div class="candidate-detail__field">
      <label>Retention expires${isPast ? ' <span style="color:var(--danger);font-weight:600">EXPIRED</span>' : isExpiring ? ' <span style="color:var(--warning);font-weight:600">EXPIRING SOON</span>' : ''}</label>
      <input type="date" id="cdRetention" value="${expiresAt ? expiresAt.toISOString().slice(0,10) : ''}" onchange="updateCandidateField('${c.id}','retention_expires_at',this.value||null)" style="${isPast ? 'border-color:var(--danger)' : isExpiring ? 'border-color:var(--warning)' : ''}">
    </div>
  </div>`;
}

function buildCandidateActionsHtml(c, isArchived, isAdmin) {
  return `<div style="display:flex;gap:var(--space-sm);margin-top:var(--space-lg);padding-top:var(--space-md);border-top:1px solid var(--border-default);flex-wrap:wrap">
    ${isArchived
      ? `<button class="btn btn--sm" style="background:var(--accent);color:#fff" data-action="hiringReopen" data-arg0="${c.id}">Reopen Card</button>`
      : `<button class="btn btn--sm" style="background:transparent;color:var(--danger);border:1px solid var(--danger)" data-action="hiringClearCandidate" data-arg0="${c.id}" title="Void candidate fields but keep the role">Clear Candidate</button>`
    }
    ${isAdmin ? `<button class="btn btn--danger btn--sm" data-action="deleteCandidate" data-arg0="${c.id}">Delete</button>` : ''}
  </div>`;
}
```

- [ ] **Step 4: Rewrite `openCandidateDetail` with skeleton loading**

Replace the existing function:

```javascript
async function openCandidateDetail(id) {
  const overlay = document.getElementById('candidateDetailOverlay');
  const panel = document.getElementById('candidateDetailPanel');
  if (!overlay || !panel) return;

  const c = await apiCall('/api/candidates/' + id);
  if (!c) return;

  const isAdmin = _currentUser && _currentUser.role === 'admin';
  const isDetailScoped = isClientUser();
  let clientList = getContractedClientRecords();
  if (c.client_id && !clientList.some(cl => cl.id === c.client_id)) {
    const existing = Object.values(_apiClientsCache || {}).find(cl => cl && cl.id === c.client_id);
    if (existing) clientList = [...clientList, existing].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  const positions = _hiringPositionsData || [];
  const isArchived = !!c.archived_at;
  const disabledStyle = isArchived ? 'pointer-events:none;opacity:0.55' : '';

  // Render main panel immediately with skeleton placeholders for sub-resources
  panel.innerHTML = `
    ${buildCandidateHeaderHtml(c, isArchived)}
    <div class="candidate-detail__body">
      ${buildCandidateProfileHtml(c, isDetailScoped, clientList, positions, disabledStyle)}
      ${buildCandidateStageHtml(c, isArchived, disabledStyle)}
      ${buildCandidateTagsHtml(c, disabledStyle)}
      ${buildCandidateStageSubHtml(c)}

      <!-- Timeline: skeleton until loaded -->
      <div class="candidate-detail__section" id="cdTimelineSection">
        <div class="candidate-detail__section-title">Timeline</div>
        <div style="color:var(--text-muted);font-size:0.78rem;padding:8px 0">Loading history…</div>
      </div>

      <!-- Comments: skeleton until loaded -->
      <div class="candidate-detail__section" id="cdCommentsSection" style="${disabledStyle}">
        <div class="candidate-detail__section-title">Comments <span id="cdCommentCount" style="font-size:0.72rem;color:var(--text-muted)">(${c.comment_count || 0})</span></div>
        <div style="color:var(--text-muted);font-size:0.78rem;padding:8px 0">Loading comments…</div>
      </div>

      ${buildCandidateGdprHtml(c, disabledStyle)}
      ${buildCandidateActionsHtml(c, isArchived, isAdmin)}
    </div>`;

  overlay.style.display = 'block';
  overlay.onclick = (e) => { if (e.target === overlay) closeCandidateDetail(); };
  panel.classList.add('open');
  window._candidateDetailPreviousFocus = document.activeElement;
  if (typeof _trapFocus === 'function') _trapFocus(panel);
  window._candidateDetailEscHandler = (e) => { if (e.key === 'Escape') closeCandidateDetail(); };
  document.addEventListener('keydown', window._candidateDetailEscHandler);

  // Lazy-load sub-resources in parallel
  const [historyData, commentsData] = await Promise.all([
    apiCall(`/api/candidates/${id}/history`).catch(() => []),
    apiCall(`/api/candidates/${id}/comments`).catch(() => []),
  ]);

  // Render timeline
  const timelineEl = document.getElementById('cdTimelineSection');
  if (timelineEl) {
    if (!historyData || historyData.length === 0) {
      timelineEl.innerHTML = `<div class="candidate-detail__section-title">Timeline</div><div style="color:var(--text-muted);font-size:0.78rem;padding:8px 0">No stage transitions recorded</div>`;
    } else {
      timelineEl.innerHTML = `<div class="candidate-detail__section-title">Timeline</div>
        ${historyData.map(h => {
          const ago = _relativeTime(new Date(h.moved_at));
          const fromLabel = h.from_stage ? (HIRING_STAGE_LABELS[h.from_stage] || h.from_stage) : 'New';
          const toLabel = HIRING_STAGE_LABELS[h.to_stage] || h.to_stage;
          return `<div style="display:flex;gap:8px;padding:4px 0;font-size:0.78rem;border-left:2px solid var(--border-default);padding-left:12px;margin-left:4px">
            <div style="flex:1"><span class="hiring-stage-badge hiring-stage-badge--${h.to_stage}" style="font-size:0.65rem;padding:1px 6px">${fromLabel} → ${toLabel}</span> <span style="color:var(--text-muted)">by ${esc(h.moved_by)}</span></div>
            <div style="color:var(--text-muted);white-space:nowrap">${ago}</div>
          </div>`;
        }).join('')}`;
    }
  }

  // Render comments
  renderCandidateComments(id, commentsData, disabledStyle);
}
```

- [ ] **Step 5: Add `renderCandidateComments` function**

```javascript
function renderCandidateComments(candidateId, comments, disabledStyle) {
  const section = document.getElementById('cdCommentsSection');
  if (!section) return;
  const isNBI = !isClientUser();

  const commentsHtml = (comments && comments.length > 0)
    ? comments.map(cm => {
        const ago = _relativeTime(new Date(cm.created_at));
        const canDelete = cm.author_user_id === (_currentUser && _currentUser.id) || (_currentUser && _currentUser.role === 'admin');
        const migrated = cm.author === 'System Migration';
        return `<div style="padding:8px 0;border-bottom:1px solid var(--border-default);font-size:0.78rem">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-weight:600">${esc(cm.author)}${cm.internal ? ' <span style="font-size:0.65rem;background:var(--warning);color:#000;padding:1px 4px;border-radius:4px">INTERNAL</span>' : ''}${migrated ? ' <span style="font-size:0.65rem;color:var(--text-muted)">(migrated from notes)</span>' : ''}</span>
            <span style="color:var(--text-muted);font-size:0.72rem">${ago}</span>
          </div>
          <div style="white-space:pre-wrap;word-break:break-word">${esc(cm.body)}</div>
          ${canDelete ? `<button class="btn btn--ghost btn--sm" style="font-size:0.68rem;color:var(--danger);margin-top:4px" onclick="deleteCandidateComment('${candidateId}','${cm.id}')">Delete</button>` : ''}
        </div>`;
      }).join('')
    : '<div style="color:var(--text-muted);font-size:0.78rem;padding:8px 0">No comments yet</div>';

  section.innerHTML = `<div class="candidate-detail__section-title">Comments <span id="cdCommentCount" style="font-size:0.72rem;color:var(--text-muted)">(${comments ? comments.length : 0})</span></div>
    ${commentsHtml}
    <div style="display:flex;gap:6px;margin-top:8px;${disabledStyle}">
      ${isNBI ? '<label style="display:flex;align-items:center;gap:4px;font-size:0.72rem;color:var(--text-muted)"><input type="checkbox" id="cdCommentInternal"> Internal</label>' : ''}
      <input type="text" id="cdCommentBody" placeholder="Add a comment…" style="flex:1;font-size:0.78rem;padding:4px 8px" onkeydown="if(event.key==='Enter'){event.preventDefault();postCandidateComment('${candidateId}');}">
      <button class="btn btn--sm" onclick="postCandidateComment('${candidateId}')">Post</button>
    </div>`;
}
```

- [ ] **Step 6: Add tag helper functions**

```javascript
async function hiringAddTag(candidateId, tagInput) {
  if (!tagInput || !tagInput.trim()) return;
  const c = _candidatesData.find(x => x.id === candidateId);
  if (!c) return;
  const current = Array.isArray(c.tags) ? [...c.tags] : [];
  const newTag = tagInput.trim().toLowerCase();
  if (current.includes(newTag)) return;
  current.push(newTag);
  await updateCandidateField(candidateId, 'tags', current);
}

async function hiringRemoveTag(candidateId, tag) {
  const c = _candidatesData.find(x => x.id === candidateId);
  if (!c) return;
  const current = Array.isArray(c.tags) ? c.tags.filter(t => t !== tag) : [];
  await updateCandidateField(candidateId, 'tags', current);
}
```

- [ ] **Step 7: Add comment helper functions**

```javascript
async function postCandidateComment(candidateId) {
  const bodyEl = document.getElementById('cdCommentBody');
  const internalEl = document.getElementById('cdCommentInternal');
  if (!bodyEl || !bodyEl.value.trim()) return;

  const resp = await authFetch(`/api/candidates/${candidateId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: bodyEl.value.trim(), internal: internalEl ? internalEl.checked : false }),
  });
  if (resp.ok) {
    // Increment local comment count to avoid stale badge (Problem #7)
    const idx = _candidatesData.findIndex(x => x.id === candidateId);
    if (idx >= 0 && typeof _candidatesData[idx].comment_count === 'number') {
      _candidatesData[idx].comment_count++;
    }
    // Re-fetch comments and re-render section
    const comments = await apiCall(`/api/candidates/${candidateId}/comments`).catch(() => []);
    const isArchived = _candidatesData[idx] && !!_candidatesData[idx].archived_at;
    renderCandidateComments(candidateId, comments, isArchived ? 'pointer-events:none;opacity:0.55' : '');
    // Re-render the card in kanban to update badge
    if (currentView === 'hiring') renderContent();
  } else {
    toast('Failed to post comment', 'error');
  }
}

async function deleteCandidateComment(candidateId, commentId) {
  const resp = await authFetch(`/api/candidates/${candidateId}/comments/${commentId}`, { method: 'DELETE' });
  if (resp.ok) {
    const idx = _candidatesData.findIndex(x => x.id === candidateId);
    if (idx >= 0 && typeof _candidatesData[idx].comment_count === 'number' && _candidatesData[idx].comment_count > 0) {
      _candidatesData[idx].comment_count--;
    }
    const comments = await apiCall(`/api/candidates/${candidateId}/comments`).catch(() => []);
    const isArchived = _candidatesData[idx] && !!_candidatesData[idx].archived_at;
    renderCandidateComments(candidateId, comments, isArchived ? 'pointer-events:none;opacity:0.55' : '');
    if (currentView === 'hiring') renderContent();
  } else {
    toast('Failed to delete comment', 'error');
  }
}
```

- [ ] **Step 8: Update `renderHiringCard` to show tags and GDPR warning**

Find the `renderHiringCard` function. After the existing card content (name, role, due date/client, stage badge), add tag chips and retention warning:

```javascript
// Inside renderHiringCard, after the stage badge line:
const tags = Array.isArray(c.tags) ? c.tags : [];
const tagChips = tags.length > 0
  ? `<div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:4px">${tags.slice(0,2).map(t => `<span style="background:var(--accent-muted);color:var(--accent-text);border-radius:8px;padding:1px 6px;font-size:0.65rem">${esc(t)}</span>`).join('')}${tags.length > 2 ? `<span style="color:var(--text-muted);font-size:0.65rem">+${tags.length-2}</span>` : ''}</div>`
  : '';

const retExpiry = c.retention_expires_at ? new Date(c.retention_expires_at) : null;
const retWarning = retExpiry && (retExpiry.getTime() - Date.now()) < 30 * 86400000
  ? '<span style="color:var(--danger);font-size:0.65rem" title="Data retention expiring">&#9888; GDPR</span>'
  : '';

const commentBadge = c.comment_count > 0
  ? `<span style="font-size:0.65rem;color:var(--text-muted)" title="${c.comment_count} comment${c.comment_count !== 1 ? 's' : ''}">&#128172; ${c.comment_count}</span>`
  : '';
```

Add `${tagChips}` and a row with `${retWarning} ${commentBadge}` to the card HTML output.

- [ ] **Step 9: Update create candidate modal to include email and source**

In the create candidate modal (around line 19706-19716), add email and source fields after the role field:

```javascript
// After the role input:
`<div class="candidate-detail__field"><label>Email</label><input type="email" id="ccEmail" placeholder="candidate@example.com"></div>
<div class="candidate-detail__field"><label>Source</label><select id="ccSource"><option value="">— None —</option>${['referral','linkedin','inbound','agency','job-board','internal','other'].map(s => `<option value="${s}">${s.charAt(0).toUpperCase()+s.slice(1).replace('-',' ')}</option>`).join('')}</select></div>`
```

In the POST submission handler (around line 19753), include the new fields:

```javascript
const postBody = {
  name: name || null,
  client_id: client_id || null,
  role: role || null,
  due_date: due_date || null,
  email: document.getElementById('ccEmail')?.value?.trim() || null,
  source: document.getElementById('ccSource')?.value || null,
  stage: 'sourcing',
};
```

- [ ] **Step 10: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(ats): frontend — decomposed detail panel, comments, tags, GDPR, onboarded stage"
```

---

## Task 11: Frontend — Candidate Sync Polling

**Files:**
- Modify: `nbi_project_dashboard.html`

This resolves Problem #8 — adding candidate data to the 10-second sync cycle.

- [ ] **Step 1: Add candidate polling to the sync interval**

Find the existing sync polling interval (around line 4337 — `setInterval(async () => {`). Inside that interval callback, after the existing task sync logic, add:

```javascript
    // Candidate sync for multi-user hiring updates
    if (typeof _candidatesData !== 'undefined' && _candidatesData.length > 0 && typeof _lastCandidatePollTime !== 'undefined') {
      try {
        const candResp = await authFetch(`/api/candidates/poll?since=${_lastCandidatePollTime}`);
        if (candResp.ok) {
          const { updated, allIds } = await candResp.json();
          if (updated.length > 0 || allIds.length !== _candidatesData.length) {
            // Merge updated candidates
            for (const u of updated) {
              const idx = _candidatesData.findIndex(c => c.id === u.id);
              if (idx >= 0) _candidatesData[idx] = u;
              else _candidatesData.push(u);
            }
            // Remove deleted candidates
            _candidatesData = _candidatesData.filter(c => allIds.includes(c.id));
            if (currentView === 'hiring') renderContent();
          }
          _lastCandidatePollTime = new Date().toISOString();
        }
      } catch (e) { /* silent — retry next cycle */ }
    }
```

- [ ] **Step 2: Initialise the poll timestamp**

Find the `loadCandidates` function. After it successfully loads candidates, set:

```javascript
window._lastCandidatePollTime = new Date().toISOString();
```

- [ ] **Step 3: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(ats): candidate sync polling in 10-second cycle"
```

---

## Task 12: Frontend — Position Detail Panel Updates

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Find the position detail/edit UI**

Search for the position card rendering and detail display. Add the new fields to the position detail view:

- Salary range: text input
- Employment type: dropdown (`permanent`, `contract`, `freelance`)
- Location: text input
- Requirements: editable list (add/remove items like onboarding links)
- Interview panel: editable list with user dropdown from `_cachedUsers` (not `_cachedTeamMembers` — Problem #1). Each row has a user dropdown (showing `display_name`, storing `user_id` and `name`), a role text input, and a remove button.

The interview panel dropdown must use `_cachedUsers` to get both `id` and `display_name`:

```javascript
const panelDropdownHtml = (_cachedUsers || []).map(u =>
  `<option value="${u.id}" data-name="${esc(u.display_name)}">${esc(u.display_name)}</option>`
).join('');
```

When a user is selected, both `user_id` (the option value) and `name` (from `data-name` attribute or the option text) are stored in the JSONB array entry.

- [ ] **Step 2: Update position card in kanban/list to show salary and location**

In the position card rendering, add a metadata row showing salary range and location when set.

- [ ] **Step 3: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(ats): enriched position fields in frontend — salary, type, location, panel"
```

---

## Task 13: Verification

- [ ] **Step 1: Run full test suite**

```
cd dashboard-server && npm test
```

Expected: all tests pass (existing + new ATS tests).

- [ ] **Step 2: Run E2E tests**

```
npm run test:e2e
```

Expected: all Playwright specs pass. No regressions in existing hiring flows.

- [ ] **Step 3: Restart PM2 and verify visually**

```
pm2 restart nbi-dashboard
```

Open http://localhost:8888/nbi_project_dashboard.html and verify:
- Kanban shows 5 lanes: Sourcing, Interviews, Offer, Onboarding, Onboarded
- Opening a candidate detail panel shows all new sections: Email, Source, Tags, Timeline, Comments, GDPR
- Creating a candidate includes email and source fields
- Moving a candidate between stages creates a timeline entry
- Posting a comment works, comment count updates on the card
- Position detail shows salary, employment type, location, requirements, interview panel
- Right arrow on last non-terminal stage triggers "Confirm Onboarded" flow
- Retention expiry warning appears on cards with near/past expiry
- Tags display on cards (max 2 + overflow count)

- [ ] **Step 4: Commit any fixes from verification**

If anything needed fixing, commit the fixes.

- [ ] **Step 5: Update session state files**

Update `projects/nbi_dashboard/live_state/work_completed.md` with Spec A completion.
Update `projects/nbi_dashboard/live_state/pending_tasks.md` — mark Spec A as done, note Spec B is next.
