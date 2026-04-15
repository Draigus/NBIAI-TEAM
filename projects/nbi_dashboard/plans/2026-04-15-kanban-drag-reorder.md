# Kanban drag-to-reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `position` integer column to `tasks`, `bug_reports`, `candidates`, and `leads`, scoped by status/stage, with server-side reorder transactions and frontend drag-to-reorder on all four Kanban boards.

**Architecture:** Dense integer positions, 0-indexed within a group, with renumber-on-move. Two shared server helpers (`shiftForInsert`, `reorderInGroup`) wrap the SQL inside Postgres transactions. POST handlers shift the target group +1 then INSERT at position 0. PATCH handlers detect `position` and/or status/stage changes and run a single transaction that shifts the old and new groups and updates the row. Frontend renders cards sorted by `position`, computes drop indices via `getBoundingClientRect()`, and PATCHes with `{ status, position }` (or `{ stage_id, position }`).

**Tech Stack:** Node 20 / Express CJS server, vanilla JS frontend (single 16k-line HTML file), PostgreSQL 16, Vitest 2.x (`.test.mjs` ESM) + supertest for server tests, Playwright + Chromium for E2E.

**Spec:** `projects/nbi_dashboard/specs/2026-04-15-kanban-drag-reorder-design.md` (commit `47a9a04`, decision D79).

**Worktree:** `D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\worktrees\kanban-drag-reorder` on branch `kanban-drag-reorder` from master HEAD `6dc9fbc`.

---

## Critical context the implementer needs before starting

1. **Test database lifecycle.** `tests/helpers/db.js` exports a module-cached `pool` and a `truncate()` helper. Each test file uses `beforeEach(async () => { await truncate(); })`. The truncate list does **not** include `lead_pipeline_stages` — so any seed lead stages survive between tests, but the baseline schema dump contains the table definition only, with **no seed rows**. Tests that need leads must seed at least one `lead_pipeline_stages` row.
2. **Vitest test files use `.test.mjs` (ESM) and import CJS modules via `createRequire(import.meta.url)`.** See `tests/unit/escape.test.mjs` for the canonical pattern.
3. **Never call `pool.end()` in a test file.** The pool is shared across files; the first `end()` closes it for everyone.
4. **Do not use `waitForLoadState('networkidle')` in Playwright specs.** The dashboard polls. Use `waitForResponse`, locator timeouts, or `waitForSelector`.
5. **Server is CJS (CommonJS).** Do not refactor it to ESM. Add helpers inline using `function name(...) { }` near the existing helper area (`buildPatchQuery` lives at `server.js:236`).
6. **The `tasks` table uses TEXT statuses** like `'Not started'`, `'In progress'`, `'Done'`, etc. The `bug_reports` table uses lower-case slugs `'open' | 'in_progress' | 'please_review' | 'resolved' | 'wontfix'`. The `candidates` table uses lower-case stage slugs (default `'sourced'`). The `leads` table uses `stage_id UUID` referencing `lead_pipeline_stages.id`.
7. **`position` is dense INTEGER.** Backfill orders by `created_at DESC` within each group. New rows go to position 0. Deletes leave gaps — that's fine, gaps are harmless.
8. **The existing `priority` column on `tasks` and `leads` is misused as a position proxy.** This plan REMOVES that misuse. The `priority` enum stays as the "client need" classification (Urgent/High/Medium/Low — Tasks, or P1-P5 integers — Leads), and is no longer touched by drag handlers.
9. **Pre-existing express-rate-limit IPv6 deprecation warning at `server.js:324`.** Non-fatal. Tests pass with it. Do NOT fix as part of this plan — it's a separate follow-up.

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `dashboard-server/migrations/021_kanban_position.sql` | CREATE | Add `position` column + index + backfill on all four tables |
| `dashboard-server/server.js` | MODIFY | Add `shiftForInsert` and `reorderInGroup` helpers near line 245; modify 4 POST and 4 PATCH handlers |
| `dashboard-server/tests/helpers/fixtures.js` | MODIFY | Add `createTestCandidate`, `createTestLead`, `createTestLeadStage` factories |
| `dashboard-server/tests/unit/kanban-position.test.mjs` | CREATE | Server-side integration tests (POST + PATCH for all 4 tables) and helper unit tests |
| `dashboard-server/tests/unit/migration-021.test.mjs` | CREATE | Migration 021 idempotency + backfill assertion test |
| `dashboard-server/tests/unit/helpers.test.mjs` | MODIFY | Add sanity tests for the new fixtures |
| `dashboard-server/tests/e2e/kanban-drag.spec.js` | CREATE | Playwright drag specs for all four boards |
| `nbi_project_dashboard.html` | MODIFY | Sort by position in 4 render functions; replace priority-as-position drag handlers; add full drag support to Bug Tracker |
| `projects/nbi_dashboard/deliverables/2026-04-15-kanban-drag-reorder.md` | CREATE | Deliverable note at end |
| `projects/nbi_dashboard/live_state/decisions.md` | APPEND | Mark D79 as Implemented |
| `projects/nbi_dashboard/live_state/work_completed.md` | APPEND | Add the merged commit hash |

---

## Phase 0 — Setup: extend test fixtures

### Task 0a: Add `createTestLeadStage` fixture

**Files:**
- Modify: `dashboard-server/tests/helpers/fixtures.js`

- [ ] **Step 1: Write the failing test**

Append to `dashboard-server/tests/unit/helpers.test.mjs` inside the existing `describe('helpers', ...)` block:

```js
  it('createTestLeadStage inserts a lead pipeline stage and returns it', async () => {
    const { createTestLeadStage } = require('../helpers/fixtures.js');
    const stage = await createTestLeadStage({ name: 'Qualified' });
    expect(stage.id).toBeTruthy();
    expect(stage.name).toBe('Qualified');
    const { rows } = await pool.query('SELECT name FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
    expect(rows[0].name).toBe('Qualified');
    // Cleanup so the next test doesn't leak a stage row (lead_pipeline_stages is NOT truncated)
    await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
  });
```

Note: the existing `helpers.test.mjs` already imports `pool`. If it doesn't, add `const { pool } = require('../helpers/db.js');` near the top.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd dashboard-server
npm test -- tests/unit/helpers.test.mjs
```

Expected: FAIL with `createTestLeadStage is not a function` or similar.

- [ ] **Step 3: Add the factory to `fixtures.js`**

Add this function inside `dashboard-server/tests/helpers/fixtures.js`, immediately before the `module.exports = {` line:

```js
/**
 * Create a lead_pipeline_stages row. Note: lead_pipeline_stages is NOT in
 * the truncate list (system-of-record). Tests that create a stage should
 * delete it themselves at the end of the test, OR rely on the unique name
 * constraint and reuse a stage across tests.
 */
async function createTestLeadStage(opts = {}) {
  const name = opts.name || uniq('TestStage');
  const sort_order = opts.sort_order || 0;
  const colour = opts.colour || '#666666';
  const { rows } = await pool.query(
    `INSERT INTO lead_pipeline_stages (name, sort_order, colour, is_closed, is_won)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, sort_order, colour, !!opts.is_closed, !!opts.is_won]
  );
  return rows[0];
}
```

And add it to the exports:

```js
module.exports = {
  uniq,
  createTestUser,
  createTestClient,
  createTestTask,
  createTestBugReport,
  createTestCandidate,
  createTestLead,
  createTestLeadStage,
};
```

(The `createTestCandidate` and `createTestLead` functions are added in tasks 0b and 0c — exporting them now means the next two tests will compile cleanly.)

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- tests/unit/helpers.test.mjs
```

Expected: the new test passes; old tests still pass; the export list now references functions that don't exist yet, so `helpers.test.mjs` may fail at import time on the missing `createTestCandidate` / `createTestLead` lines. If so, add temporary stub `function createTestCandidate() {}` and `function createTestLead() {}` definitions above the export to keep the module valid until tasks 0b and 0c replace them. **Note for the engineer:** if the imports compile, skip the stubs. Either way, end Step 4 with the lead stage test passing.

- [ ] **Step 5: Commit**

```bash
cd D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/kanban-drag-reorder
git add dashboard-server/tests/helpers/fixtures.js dashboard-server/tests/unit/helpers.test.mjs
git commit -m "test: add createTestLeadStage fixture + sanity test"
```

---

### Task 0b: Add `createTestCandidate` fixture

**Files:**
- Modify: `dashboard-server/tests/helpers/fixtures.js`
- Modify: `dashboard-server/tests/unit/helpers.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `helpers.test.mjs`:

```js
  it('createTestCandidate inserts a candidate row with sane defaults', async () => {
    const { createTestCandidate } = require('../helpers/fixtures.js');
    const c = await createTestCandidate({ name: 'Alice', stage: 'screening' });
    expect(c.id).toBeTruthy();
    expect(c.name).toBe('Alice');
    expect(c.stage).toBe('screening');
    const { rows } = await pool.query('SELECT name, stage FROM candidates WHERE id = $1', [c.id]);
    expect(rows[0]).toEqual({ name: 'Alice', stage: 'screening' });
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/helpers.test.mjs
```

Expected: FAIL with `createTestCandidate is not a function` (or, if the stub was added in 0a, FAIL with `Cannot read properties of undefined (reading 'id')`).

- [ ] **Step 3: Replace the stub (or add the factory)**

In `dashboard-server/tests/helpers/fixtures.js`, add (or replace the stub):

```js
/**
 * Create a candidate row. Stage defaults to 'sourced' (matches schema default).
 */
async function createTestCandidate(opts = {}) {
  const name = opts.name || uniq('TestCandidate');
  const stage = opts.stage || 'sourced';
  const { rows } = await pool.query(
    `INSERT INTO candidates (client_id, position_id, name, role, linkedin_url, due_date, stage, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      opts.client_id || null,
      opts.position_id || null,
      name,
      opts.role || null,
      opts.linkedin_url || null,
      opts.due_date || null,
      stage,
      opts.notes || null,
    ]
  );
  return rows[0];
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- tests/unit/helpers.test.mjs
```

Expected: the new test passes; previous tests still pass.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/tests/helpers/fixtures.js dashboard-server/tests/unit/helpers.test.mjs
git commit -m "test: add createTestCandidate fixture + sanity test"
```

---

### Task 0c: Add `createTestLead` fixture

**Files:**
- Modify: `dashboard-server/tests/helpers/fixtures.js`
- Modify: `dashboard-server/tests/unit/helpers.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `helpers.test.mjs`:

```js
  it('createTestLead inserts a lead row, requires a stage_id', async () => {
    const { createTestLead, createTestLeadStage } = require('../helpers/fixtures.js');
    const stage = await createTestLeadStage({ name: 'New' });
    try {
      const lead = await createTestLead({ title: 'Big Deal', stage_id: stage.id });
      expect(lead.id).toBeTruthy();
      expect(lead.title).toBe('Big Deal');
      expect(lead.stage_id).toBe(stage.id);
      const { rows } = await pool.query('SELECT title FROM leads WHERE id = $1', [lead.id]);
      expect(rows[0].title).toBe('Big Deal');
    } finally {
      await pool.query('DELETE FROM leads WHERE stage_id = $1', [stage.id]);
      await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/helpers.test.mjs
```

Expected: FAIL with `createTestLead is not a function` (or stub error).

- [ ] **Step 3: Replace the stub (or add the factory)**

Add to `fixtures.js`:

```js
/**
 * Create a lead row. stage_id is required (FK to lead_pipeline_stages.id).
 */
async function createTestLead(opts = {}) {
  if (!opts.stage_id) throw new Error('createTestLead: stage_id required');
  const title = opts.title || uniq('TestLead');
  const { rows } = await pool.query(
    `INSERT INTO leads (client_id, title, work_type, service_line, stage_id, priority, currency, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      opts.client_id || null,
      title,
      opts.work_type || null,
      opts.service_line || null,
      opts.stage_id,
      opts.priority || null,
      opts.currency || 'GBP',
      opts.created_by || 'test',
    ]
  );
  return rows[0];
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- tests/unit/helpers.test.mjs
```

Expected: passes.

- [ ] **Step 5: Run the full unit suite to make sure nothing regressed**

```bash
npm test
```

Expected: all 16 original tests + 3 new helper tests = 19 tests pass.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/tests/helpers/fixtures.js dashboard-server/tests/unit/helpers.test.mjs
git commit -m "test: add createTestLead fixture + sanity test"
```

---

## Phase 1 — Migration 021

### Task 1a: Write failing migration test

**Files:**
- Create: `dashboard-server/tests/unit/migration-021.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// dashboard-server/tests/unit/migration-021.test.mjs
//
// Asserts the position column exists on all four kanban tables after
// migration 021 has been applied (which the global setup already ran).
// Also asserts the indexes exist and the column is dense within each
// group for any seed data the test creates.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate } = require('../helpers/db.js');
const { createTestUser, createTestBugReport, createTestTask, createTestCandidate, createTestLead, createTestLeadStage } = require('../helpers/fixtures.js');

beforeEach(async () => { await truncate(); });

describe('migration 021 — kanban position column', () => {
  it('adds a NOT NULL position column on tasks, bug_reports, candidates, leads', async () => {
    const tables = ['tasks', 'bug_reports', 'candidates', 'leads'];
    for (const table of tables) {
      const { rows } = await pool.query(
        `SELECT column_name, is_nullable, data_type, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'position'`,
        [table]
      );
      expect(rows.length, `${table}.position must exist`).toBe(1);
      expect(rows[0].data_type).toBe('integer');
      expect(rows[0].is_nullable).toBe('NO');
      expect(rows[0].column_default).toMatch(/^0/);
    }
  });

  it('creates a (group, position) index on each kanban table', async () => {
    const expected = [
      ['tasks', 'idx_tasks_status_position'],
      ['bug_reports', 'idx_bug_reports_status_position'],
      ['candidates', 'idx_candidates_stage_position'],
      ['leads', 'idx_leads_stage_position'],
    ];
    for (const [table, idx] of expected) {
      const { rows } = await pool.query(
        `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`,
        [table, idx]
      );
      expect(rows.length, `${idx} must exist on ${table}`).toBe(1);
    }
  });

  it('migration 021 is recorded in schema_migrations', async () => {
    const { rows } = await pool.query(
      `SELECT version FROM schema_migrations WHERE version = 21`
    );
    expect(rows.length).toBe(1);
  });

  it('newly-inserted rows default position to 0', async () => {
    // Direct INSERTs (not via the API helpers) should accept the default
    const u = await createTestUser({ role: 'admin' });
    const bug = await createTestBugReport({ user_id: u.id });
    const task = await createTestTask();
    const cand = await createTestCandidate();
    expect(bug.position).toBe(0);
    expect(task.position).toBe(0);
    expect(cand.position).toBe(0);

    const stage = await createTestLeadStage();
    try {
      const lead = await createTestLead({ stage_id: stage.id });
      expect(lead.position).toBe(0);
      await pool.query('DELETE FROM leads WHERE stage_id = $1', [stage.id]);
    } finally {
      await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd dashboard-server
npm test -- tests/unit/migration-021.test.mjs
```

Expected: FAIL with `tasks.position must exist` (and the other table assertions). `schema_migrations` query returns 0 rows.

- [ ] **Step 3: Commit the failing test**

```bash
git add dashboard-server/tests/unit/migration-021.test.mjs
git commit -m "test: failing migration 021 spec — kanban position column + indexes"
```

---

### Task 1b: Write migration 021 SQL

**Files:**
- Create: `dashboard-server/migrations/021_kanban_position.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration 021: Add a `position` column to all four kanban tables.
--
-- Spec: projects/nbi_dashboard/specs/2026-04-15-kanban-drag-reorder-design.md
-- Decision: D79 (live_state/decisions.md)
--
-- Each kanban board (tasks, bug_reports, candidates, leads) gains a dense
-- integer `position` field scoped by its group key (status / status / stage /
-- stage_id). The frontend will sort by this column on render and PATCH the
-- server with new positions when the user drags a card.
--
-- Backfill orders existing rows by created_at DESC within each group, so the
-- newest rows land at position 0, matching the going-forward "new cards at top"
-- rule. This makes pre-existing data feel consistent with the new behaviour.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, and the
-- backfill UPDATE is no-op-safe because ROW_NUMBER will reproduce the same
-- positions if nothing has been inserted since the last run.

ALTER TABLE tasks        ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bug_reports  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE candidates   ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads        ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_status_position       ON tasks       (status, position);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status_position ON bug_reports (status, position);
CREATE INDEX IF NOT EXISTS idx_candidates_stage_position   ON candidates  (stage, position);
CREATE INDEX IF NOT EXISTS idx_leads_stage_position        ON leads       (stage_id, position);

-- Backfill: dense integer positions per group, newest first.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) - 1 AS new_pos
  FROM tasks
)
UPDATE tasks SET position = numbered.new_pos
FROM numbered WHERE tasks.id = numbered.id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) - 1 AS new_pos
  FROM bug_reports
)
UPDATE bug_reports SET position = numbered.new_pos
FROM numbered WHERE bug_reports.id = numbered.id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY stage ORDER BY created_at DESC) - 1 AS new_pos
  FROM candidates
)
UPDATE candidates SET position = numbered.new_pos
FROM numbered WHERE candidates.id = numbered.id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY stage_id ORDER BY created_at DESC) - 1 AS new_pos
  FROM leads
)
UPDATE leads SET position = numbered.new_pos
FROM numbered WHERE leads.id = numbered.id;
```

- [ ] **Step 2: Re-run the migration via the test global setup**

The test runner calls `tests/setup/reset-db.js` on every full run, which loads the baseline schema then runs the migration runner. Force a full re-reset:

```bash
npm test -- tests/unit/migration-021.test.mjs
```

Expected: PASS. All four columns exist with the right type/default, all four indexes exist, version 21 is in `schema_migrations`, and direct fixture inserts default `position` to 0.

If the test reports the column is missing, the migration didn't run. Manually trigger the reset:

```bash
node -e "require('./tests/setup/reset-db.js').default || require('./tests/setup/reset-db.js')"
```

(Or just delete the row from `schema_migrations` in the test DB and rerun the suite — vitest's globalSetup will pick it up.)

- [ ] **Step 3: Run the existing migrations idempotency test to confirm 021 didn't break it**

```bash
npm test -- tests/unit/migrations.test.mjs
```

Expected: PASS — running the runner twice is still a no-op the second time, and 021 is recorded once.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/migrations/021_kanban_position.sql dashboard-server/tests/unit/migration-021.test.mjs
git commit -m "feat(db): migration 021 — kanban position column + indexes + backfill"
```

---

### Task 1c: Test the backfill ordering against newest-first

**Files:**
- Modify: `dashboard-server/tests/unit/migration-021.test.mjs`

The migration ran on an empty test DB so the backfill assigned 0 to every group. We need a separate test that proves the backfill **ordering** is correct: insert known rows with increasing `created_at`, run the backfill SQL inline, and assert positions land newest-first.

- [ ] **Step 1: Write the failing test (append to the existing describe block)**

```js
  it('backfill assigns dense positions newest-first within a group', async () => {
    // Reset positions to a known bad state, then re-run the backfill SQL inline
    const u = await createTestUser({ role: 'admin' });
    // Three bugs with controllable created_at
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, created_at, position)
       VALUES ($1, 'bug', 'oldest', '', 'open', NOW() - INTERVAL '3 days', 99),
              ($1, 'bug', 'middle', '', 'open', NOW() - INTERVAL '2 days', 99),
              ($1, 'bug', 'newest', '', 'open', NOW() - INTERVAL '1 day',  99)`,
      [u.id]
    );

    // Re-run the backfill (same WITH-numbered UPDATE the migration uses)
    await pool.query(`
      WITH numbered AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) - 1 AS new_pos
        FROM bug_reports
      )
      UPDATE bug_reports SET position = numbered.new_pos
      FROM numbered WHERE bug_reports.id = numbered.id;
    `);

    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'open' ORDER BY position`
    );
    expect(rows).toEqual([
      { title: 'newest', position: 0 },
      { title: 'middle', position: 1 },
      { title: 'oldest', position: 2 },
    ]);
  });
```

- [ ] **Step 2: Run the test to verify it passes**

```bash
npm test -- tests/unit/migration-021.test.mjs
```

Expected: PASS — the inline backfill SQL produces dense, newest-first positions.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/tests/unit/migration-021.test.mjs
git commit -m "test: assert backfill orders newest-first within group"
```

---

## Phase 2 — Server-side helpers (`shiftForInsert`, `reorderInGroup`)

These are the two reusable transaction-aware helpers used by all 8 modified handlers. Build them with isolated unit tests against `bug_reports` first (smallest schema), then reuse for the other three tables.

### Task 2a: Failing test for `shiftForInsert` (POST insert-at-0 helper)

**Files:**
- Create: `dashboard-server/tests/unit/kanban-position.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// dashboard-server/tests/unit/kanban-position.test.mjs
//
// Server-side tests for the kanban position feature.
//
// Sections:
//   1. Helper unit tests (shiftForInsert, reorderInGroup) — direct calls
//   2. POST integration tests — newly created rows land at position 0
//   3. PATCH integration tests — drag-to-reorder via API

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser,
  createTestBugReport,
  createTestTask,
  createTestCandidate,
  createTestLead,
  createTestLeadStage,
} = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

// ============================================================================
// 1. Helper unit tests
// ============================================================================

describe('shiftForInsert', () => {
  it('shifts every row in the target group down by 1', async () => {
    const u = await createTestUser({ role: 'admin' });
    // Manually insert three bugs with positions 0, 1, 2 in 'open'
    const bugA = await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'A', '', 'open', 0) RETURNING id`, [u.id]);
    const bugB = await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'B', '', 'open', 1) RETURNING id`, [u.id]);
    const bugC = await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'C', '', 'open', 2) RETURNING id`, [u.id]);

    const { shiftForInsert } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await shiftForInsert(client, 'bug_reports', 'status', 'open');
      await client.query('COMMIT');
    } finally {
      client.release();
    }

    const { rows } = await pool.query(
      `SELECT id, position FROM bug_reports WHERE status = 'open' ORDER BY position`
    );
    // After shift, A B C should now be at 1 2 3 (none at 0; the caller will INSERT at 0 next)
    expect(rows.map(r => r.position)).toEqual([1, 2, 3]);
  });

  it('does not touch rows in other groups', async () => {
    const u = await createTestUser({ role: 'admin' });
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'open0', '', 'open', 0),
              ($1, 'bug', 'closed0', '', 'resolved', 0)`,
      [u.id]
    );
    const { shiftForInsert } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await shiftForInsert(client, 'bug_reports', 'status', 'open');
      await client.query('COMMIT');
    } finally {
      client.release();
    }
    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports ORDER BY title`
    );
    expect(rows).toEqual([
      { title: 'closed0', position: 0 }, // untouched
      { title: 'open0',   position: 1 }, // shifted
    ]);
  });

  it('rejects unknown table or group key (SQL injection guard)', async () => {
    const { shiftForInsert } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await expect(shiftForInsert(client, 'tasks; DROP TABLE users; --', 'status', 'open'))
        .rejects.toThrow(/invalid table/i);
      await expect(shiftForInsert(client, 'tasks', 'status; DROP', 'open'))
        .rejects.toThrow(/invalid column/i);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: FAIL with `shiftForInsert is not a function` (or `Cannot destructure property`).

---

### Task 2b: Implement `shiftForInsert` and export it

**Files:**
- Modify: `dashboard-server/server.js` (add helper near line 245, export at the bottom near `module.exports = app`)

- [ ] **Step 1: Add the helper above `buildPatchQuery` is fine, but cleaner is right after it. Insert after line 245:**

```js
// =============================================================================
// Kanban position helpers (migration 021 / decision D79)
// =============================================================================

// Whitelists for SQL-injectable identifiers. Only these table+column pairs
// are accepted by the position helpers. Adding a new kanban board means
// adding it here.
const POSITION_TABLES = {
  tasks:        { groupCol: 'status' },
  bug_reports:  { groupCol: 'status' },
  candidates:   { groupCol: 'stage' },
  leads:        { groupCol: 'stage_id' },
};

function _validatePositionTable(table, groupCol) {
  if (!POSITION_TABLES[table]) throw new Error(`Invalid table for position helper: ${table}`);
  if (POSITION_TABLES[table].groupCol !== groupCol) {
    throw new Error(`Invalid column for position helper on ${table}: ${groupCol}`);
  }
}

/**
 * Shift every row in the target group down by 1 to make room for an INSERT
 * at position 0. MUST be called inside an active transaction (caller passes
 * the pg client). Caller then runs the actual INSERT with position = 0.
 *
 * @param {pg.PoolClient} client - active transaction client
 * @param {string} table - one of POSITION_TABLES keys
 * @param {string} groupCol - the group key column (e.g. 'status', 'stage_id')
 * @param {*} groupVal - the group value to shift
 */
async function shiftForInsert(client, table, groupCol, groupVal) {
  _validatePositionTable(table, groupCol);
  await client.query(
    `UPDATE ${table} SET position = position + 1 WHERE ${groupCol} = $1`,
    [groupVal]
  );
}
```

- [ ] **Step 2: Export the helper so the test can import it**

Find `module.exports = app;` at the bottom of `server.js` and replace with:

```js
module.exports = app;
module.exports.shiftForInsert = shiftForInsert;
```

(Both lines. The first one keeps the existing supertest pattern working; the second exposes the helper for unit tests. Later tasks add `reorderInGroup` to this export the same way.)

- [ ] **Step 3: Run the test to verify it passes**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: All three `shiftForInsert` tests pass.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/kanban-position.test.mjs
git commit -m "feat(server): shiftForInsert helper for kanban POST handlers"
```

---

### Task 2c: Failing test for `reorderInGroup` (PATCH reorder helper)

**Files:**
- Modify: `dashboard-server/tests/unit/kanban-position.test.mjs`

- [ ] **Step 1: Write the failing tests (append after the `shiftForInsert` describe block)**

```js
describe('reorderInGroup', () => {
  // Helper to build 5 bug rows in 'open' at positions 0..4
  async function seedBugs() {
    const u = await createTestUser({ role: 'admin' });
    const ids = [];
    for (let i = 0; i < 5; i++) {
      const { rows } = await pool.query(
        `INSERT INTO bug_reports (user_id, type, title, description, status, position)
         VALUES ($1, 'bug', $2, '', 'open', $3) RETURNING id`,
        [u.id, `bug${i}`, i]
      );
      ids.push(rows[0].id);
    }
    return ids;
  }

  async function readOrder(status = 'open') {
    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = $1 ORDER BY position`,
      [status]
    );
    return rows;
  }

  it('intra-column move up: 4 → 1 shifts 1..3 down by +1', async () => {
    const ids = await seedBugs();
    const { reorderInGroup } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await reorderInGroup(client, 'bug_reports', 'status', ids[4], 'open', 1);
      await client.query('COMMIT');
    } finally { client.release(); }
    expect(await readOrder()).toEqual([
      { title: 'bug0', position: 0 },
      { title: 'bug4', position: 1 },
      { title: 'bug1', position: 2 },
      { title: 'bug2', position: 3 },
      { title: 'bug3', position: 4 },
    ]);
  });

  it('intra-column move down: 1 → 3 shifts 2..3 up by -1', async () => {
    const ids = await seedBugs();
    const { reorderInGroup } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await reorderInGroup(client, 'bug_reports', 'status', ids[1], 'open', 3);
      await client.query('COMMIT');
    } finally { client.release(); }
    expect(await readOrder()).toEqual([
      { title: 'bug0', position: 0 },
      { title: 'bug2', position: 1 },
      { title: 'bug3', position: 2 },
      { title: 'bug1', position: 3 },
      { title: 'bug4', position: 4 },
    ]);
  });

  it('same-position no-op leaves all rows untouched', async () => {
    const ids = await seedBugs();
    const { reorderInGroup } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await reorderInGroup(client, 'bug_reports', 'status', ids[2], 'open', 2);
      await client.query('COMMIT');
    } finally { client.release(); }
    expect(await readOrder()).toEqual([
      { title: 'bug0', position: 0 },
      { title: 'bug1', position: 1 },
      { title: 'bug2', position: 2 },
      { title: 'bug3', position: 3 },
      { title: 'bug4', position: 4 },
    ]);
  });

  it('clamps positions past the end of the column to the column length - 1', async () => {
    const ids = await seedBugs(); // length 5, valid positions 0..4
    const { reorderInGroup } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Try to move bug0 to position 99
      await reorderInGroup(client, 'bug_reports', 'status', ids[0], 'open', 99);
      await client.query('COMMIT');
    } finally { client.release(); }
    expect(await readOrder()).toEqual([
      { title: 'bug1', position: 0 },
      { title: 'bug2', position: 1 },
      { title: 'bug3', position: 2 },
      { title: 'bug4', position: 3 },
      { title: 'bug0', position: 4 }, // clamped to end
    ]);
  });

  it('cross-column move: closes gap in old group, opens slot in new group', async () => {
    const ids = await seedBugs(); // 5 bugs in 'open'
    // Plus two bugs in 'in_progress'
    const u = (await pool.query('SELECT id FROM users LIMIT 1')).rows[0];
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'p0', '', 'in_progress', 0),
              ($1, 'bug', 'p1', '', 'in_progress', 1)`,
      [u.id]
    );
    const { reorderInGroup } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Move bug2 (open, pos 2) → in_progress, pos 1
      await reorderInGroup(client, 'bug_reports', 'status', ids[2], 'in_progress', 1);
      await client.query('COMMIT');
    } finally { client.release(); }

    expect(await readOrder('open')).toEqual([
      { title: 'bug0', position: 0 },
      { title: 'bug1', position: 1 },
      { title: 'bug3', position: 2 },
      { title: 'bug4', position: 3 },
    ]);
    expect(await readOrder('in_progress')).toEqual([
      { title: 'p0',   position: 0 },
      { title: 'bug2', position: 1 },
      { title: 'p1',   position: 2 },
    ]);
  });

  it('cross-column move with newPos=0 puts the card at the top', async () => {
    const ids = await seedBugs();
    const u = (await pool.query('SELECT id FROM users LIMIT 1')).rows[0];
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'r0', '', 'resolved', 0)`,
      [u.id]
    );
    const { reorderInGroup } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await reorderInGroup(client, 'bug_reports', 'status', ids[3], 'resolved', 0);
      await client.query('COMMIT');
    } finally { client.release(); }
    expect(await readOrder('resolved')).toEqual([
      { title: 'bug3', position: 0 },
      { title: 'r0',   position: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: 6 new failing tests with `reorderInGroup is not a function`.

---

### Task 2d: Implement `reorderInGroup`

**Files:**
- Modify: `dashboard-server/server.js`

- [ ] **Step 1: Add `reorderInGroup` after `shiftForInsert` in server.js**

```js
/**
 * Move a row to a new (group, position) inside an active transaction.
 *
 * Steps inside the txn:
 *   1. Fetch the row's current group + position.
 *   2. Compute target column length (excluding the moved row when same-group).
 *      Clamp newPosition to [0, length - 1] when same-group, or [0, length]
 *      when cross-group.
 *   3. If group + position unchanged: no-op.
 *   4. If group changed: shift old group above the vacated slot up by -1.
 *   5. Shift target group from newPosition onwards down by +1 (excluding rowId).
 *   6. UPDATE the row's group + position.
 *
 * @param {pg.PoolClient} client - active transaction client
 * @param {string} table - one of POSITION_TABLES keys
 * @param {string} groupCol - the group key column name
 * @param {string} rowId - UUID of the row to move
 * @param {*} newGroup - target group value (e.g. new status, new stage_id)
 * @param {number} newPos - target 0-indexed position in newGroup
 * @returns {Promise<void>}
 */
async function reorderInGroup(client, table, groupCol, rowId, newGroup, newPos) {
  _validatePositionTable(table, groupCol);
  if (!Number.isInteger(newPos) || newPos < 0) {
    throw new Error(`reorderInGroup: newPos must be a non-negative integer, got ${newPos}`);
  }

  // 1. Fetch current row
  const cur = await client.query(
    `SELECT ${groupCol} AS grp, position FROM ${table} WHERE id = $1 FOR UPDATE`,
    [rowId]
  );
  if (cur.rows.length === 0) throw new Error(`reorderInGroup: row not found ${rowId}`);
  const oldGroup = cur.rows[0].grp;
  const oldPos = cur.rows[0].position;
  const sameGroup = oldGroup === newGroup
    || (oldGroup != null && newGroup != null && String(oldGroup) === String(newGroup));

  // 2. Length of target group, used for clamping
  const lengthRes = await client.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${groupCol} = $1`,
    [newGroup]
  );
  const targetLen = lengthRes.rows[0].n;
  // When same-group, the moved row is already counted; valid positions are 0..targetLen-1.
  // When cross-group, the moved row is NOT yet in the target group; valid positions are 0..targetLen.
  const maxPos = sameGroup ? Math.max(0, targetLen - 1) : targetLen;
  const clampedPos = Math.min(newPos, maxPos);

  // 3. Same group + same position → no-op
  if (sameGroup && clampedPos === oldPos) return;

  if (sameGroup) {
    // Intra-column reorder
    if (clampedPos < oldPos) {
      // Move up: shift [clampedPos .. oldPos-1] down by +1
      await client.query(
        `UPDATE ${table} SET position = position + 1
         WHERE ${groupCol} = $1 AND position >= $2 AND position < $3 AND id <> $4`,
        [oldGroup, clampedPos, oldPos, rowId]
      );
    } else {
      // Move down: shift (oldPos .. clampedPos] up by -1
      await client.query(
        `UPDATE ${table} SET position = position - 1
         WHERE ${groupCol} = $1 AND position > $2 AND position <= $3 AND id <> $4`,
        [oldGroup, oldPos, clampedPos, rowId]
      );
    }
  } else {
    // Cross-column move
    // 4. Close gap in old group
    await client.query(
      `UPDATE ${table} SET position = position - 1
       WHERE ${groupCol} = $1 AND position > $2`,
      [oldGroup, oldPos]
    );
    // 5. Open slot in new group
    await client.query(
      `UPDATE ${table} SET position = position + 1
       WHERE ${groupCol} = $1 AND position >= $2 AND id <> $3`,
      [newGroup, clampedPos, rowId]
    );
  }

  // 6. Update the moved row
  await client.query(
    `UPDATE ${table} SET ${groupCol} = $1, position = $2, updated_at = NOW() WHERE id = $3`,
    [newGroup, clampedPos, rowId]
  );
}
```

**Note on `updated_at`:** all four tables have an `updated_at` column. The `tasks.updated_at` is `timestamp with time zone DEFAULT now()` (verified in the baseline schema). The query above sets it explicitly so reorder counts as a touch.

- [ ] **Step 2: Add to the export**

Find `module.exports.shiftForInsert = shiftForInsert;` and add the new line:

```js
module.exports = app;
module.exports.shiftForInsert = shiftForInsert;
module.exports.reorderInGroup = reorderInGroup;
```

- [ ] **Step 3: Run the tests to verify they pass**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: all 9 tests in this file (3 shiftForInsert + 6 reorderInGroup) pass.

- [ ] **Step 4: Run the full unit suite for regression**

```bash
npm test
```

Expected: all previous tests still pass.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/kanban-position.test.mjs
git commit -m "feat(server): reorderInGroup helper with intra/cross-column shift logic"
```

---

## Phase 3 — Server endpoints, table by table

We do bug_reports first because its handlers are the most contained (one POST, one PATCH, no transaction yet, only ~120 lines total). Once that pattern is locked in, tasks/candidates/leads follow the same shape.

For each table we have **two** server-side tasks: POST inserts at position 0, then PATCH accepts a `position` field.

### Task 3a: bug_reports POST inserts at position 0 (failing test)

**Files:**
- Modify: `dashboard-server/tests/unit/kanban-position.test.mjs`

- [ ] **Step 1: Append the failing tests to the file**

```js
// ============================================================================
// 2. POST integration tests — newly created rows land at position 0
// ============================================================================

describe('POST /api/bug-reports — inserts at position 0', () => {
  it('first bug in a status lands at position 0', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'bug', title: 'first', description: 'first' });
    expect(res.status).toBe(201);
    expect(res.body.position).toBe(0);
  });

  it('subsequent bugs push older ones down', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    for (const title of ['first', 'second', 'third']) {
      const res = await request(app)
        .post('/api/bug-reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'bug', title, description: '' });
      expect(res.status).toBe(201);
    }
    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'open' ORDER BY position`
    );
    expect(rows).toEqual([
      { title: 'third',  position: 0 },
      { title: 'second', position: 1 },
      { title: 'first',  position: 2 },
    ]);
  });

  it('insert into one status does not touch positions in another status', async () => {
    const u = await createTestUser({ role: 'admin' });
    // Manually seed a bug in 'resolved' at position 0
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'old-resolved', '', 'resolved', 0)`,
      [u.id]
    );
    const token = await mintSession(u.id);
    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'bug', title: 'new-open', description: '' });
    expect(res.status).toBe(201);
    const { rows } = await pool.query(
      `SELECT title, status, position FROM bug_reports ORDER BY status, position`
    );
    expect(rows).toEqual([
      { title: 'new-open',     status: 'open',     position: 0 },
      { title: 'old-resolved', status: 'resolved', position: 0 },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: the `subsequent bugs push older ones down` test fails — currently all bugs land at position 0 because the default is 0 and there's no shift. The single-bug test may pass coincidentally (default 0).

---

### Task 3b: bug_reports POST — implement insert at 0

**Files:**
- Modify: `dashboard-server/server.js` (handler at lines 5325-5352)

- [ ] **Step 1: Replace the handler**

Find `app.post('/api/bug-reports', async (req, res) => {` at server.js:5325 and replace the body. The change wraps the existing INSERT in a transaction and calls `shiftForInsert` first. New status defaults to `'open'` (as the existing schema does).

```js
app.post('/api/bug-reports', async (req, res) => {
  const { type, title, description, page, screenshot, priority } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  const descErr = validateLength(description, 'description');
  if (descErr) return res.status(400).json({ error: descErr });
  const validTypes = ['bug', 'feature'];
  const rType = validTypes.includes(type) ? type : 'bug';
  const validPriorities = ['critical', 'high', 'medium', 'low'];
  let safePriority = null;
  if (priority !== undefined && priority !== null && priority !== '') {
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
    }
    if (req.user.role === 'admin') safePriority = priority;
  }
  const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
  const safeScreenshot = (screenshot && screenshot.length <= MAX_SCREENSHOT_BYTES) ? screenshot : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Shift everything in the target column (default 'open') down by 1
    await shiftForInsert(client, 'bug_reports', 'status', 'open');
    const { rows } = await client.query(
      `INSERT INTO bug_reports (user_id, type, title, description, page, screenshot, priority, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0) RETURNING *`,
      [req.user.id, rType, title.trim(), description || null, page || null, safeScreenshot, safePriority]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    log('error', 'BugReports', 'POST failed', { error: err.message });
    res.status(500).json({ error: 'Failed to create bug report' });
  } finally {
    client.release();
  }
});
```

- [ ] **Step 2: Run the tests to verify they pass**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: all three POST bug_reports tests pass.

- [ ] **Step 3: Run the existing escape regression test to confirm we didn't break the round-trip**

```bash
npm test -- tests/unit/escape.test.mjs
```

Expected: still passes.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/kanban-position.test.mjs
git commit -m "feat(api): POST /api/bug-reports inserts at position 0 in transaction"
```

---

### Task 3c: bug_reports PATCH — accept position field (failing test)

- [ ] **Step 1: Append failing PATCH tests to `kanban-position.test.mjs`**

```js
// ============================================================================
// 3. PATCH integration tests
// ============================================================================

describe('PATCH /api/bug-reports/:id — drag-to-reorder', () => {
  async function makeBugs(token, count) {
    // Create N bugs in reverse order so positions go 0..N-1 with bug_{N-1} at top
    const ids = [];
    for (let i = 0; i < count; i++) {
      const res = await request(app)
        .post('/api/bug-reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'bug', title: `bug${i}`, description: '' });
      ids.push(res.body.id);
    }
    // After this loop, bug_{count-1} is at position 0 and bug_0 is at position count-1
    return ids;
  }

  it('intra-column move: PATCH position changes the row position and shifts others', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const ids = await makeBugs(token, 4); // bug3@0, bug2@1, bug1@2, bug0@3

    // Move bug0 (currently at position 3) to position 0
    const res = await request(app)
      .patch(`/api/bug-reports/${ids[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ position: 0 });
    expect(res.status).toBe(200);
    expect(res.body.position).toBe(0);

    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'open' ORDER BY position`
    );
    expect(rows).toEqual([
      { title: 'bug0', position: 0 },
      { title: 'bug3', position: 1 },
      { title: 'bug2', position: 2 },
      { title: 'bug1', position: 3 },
    ]);
  });

  it('cross-column move: PATCH status + position closes the old gap', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const ids = await makeBugs(token, 3); // bug2@0, bug1@1, bug0@2  (all 'open')

    const res = await request(app)
      .patch(`/api/bug-reports/${ids[1]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress', position: 0 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
    expect(res.body.position).toBe(0);

    const open = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'open' ORDER BY position`
    );
    expect(open.rows).toEqual([
      { title: 'bug2', position: 0 },
      { title: 'bug0', position: 1 },
    ]);
    const inProgress = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'in_progress' ORDER BY position`
    );
    expect(inProgress.rows).toEqual([
      { title: 'bug1', position: 0 },
    ]);
  });

  it('status change without explicit position lands at position 0 of the new column', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const ids = await makeBugs(token, 3); // bug2@0, bug1@1, bug0@2

    // Pre-seed a bug in resolved
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'old-resolved', '', 'resolved', 0)`, [u.id]
    );

    // Move bug1 to resolved WITHOUT specifying position
    const res = await request(app)
      .patch(`/api/bug-reports/${ids[1]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'resolved' });
    expect(res.status).toBe(200);
    expect(res.body.position).toBe(0);

    const resolved = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'resolved' ORDER BY position`
    );
    expect(resolved.rows).toEqual([
      { title: 'bug1',          position: 0 },
      { title: 'old-resolved',  position: 1 },
    ]);
  });

  it('PATCH with neither status nor position still updates other fields', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const ids = await makeBugs(token, 2);

    const res = await request(app)
      .patch(`/api/bug-reports/${ids[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'renamed' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('renamed');
    // Position must not have changed
    expect(res.body.position).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: the four new PATCH tests fail because the PATCH handler ignores the `position` field and doesn't auto-zero on status change.

---

### Task 3d: Implement bug_reports PATCH position handling

**Files:**
- Modify: `dashboard-server/server.js` (handler at lines 5356-5449)

- [ ] **Step 1: Modify the PATCH handler to wrap the update in a transaction and call `reorderInGroup` when status or position changes**

The change is surgical: keep the existing validation/permission/notification logic, but wrap the actual UPDATE in a transaction and add a position branch. Add this logic right after the existing field validation block (after the `if (description !== undefined)` block at ~line 5418), before the `vals.push(req.params.id)` line:

Replace the section from line 5393 (`const sets = ['updated_at = NOW()'];`) through line 5448 (`res.json(rows[0]);`) with:

```js
  const sets = ['updated_at = NOW()'];
  const vals = [];
  let idx = 1;

  if (status) {
    const validStatuses = ['open', 'in_progress', 'please_review', 'resolved', 'wontfix'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }
  if (priority !== undefined) {
    const validPriorities = ['critical', 'high', 'medium', 'low', null];
    if (priority !== null && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: critical, high, medium, low` });
    }
    sets.push(`priority = $${idx++}`);
    vals.push(priority);
  }
  if (title !== undefined) {
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title cannot be empty' });
    const titleErr = validateLength(title, 'title');
    if (titleErr) return res.status(400).json({ error: titleErr });
    sets.push(`title = $${idx++}`);
    vals.push(String(title).trim());
  }
  if (description !== undefined) {
    const descErr = validateLength(description, 'description');
    if (descErr) return res.status(400).json({ error: descErr });
    sets.push(`description = $${idx++}`);
    vals.push(description);
  }

  // Position / status: handled by the reorder helper inside a transaction
  const wantsReorder = (status !== undefined) || (req.body.position !== undefined);
  const newPosition = req.body.position;

  const client = await pool.connect();
  let resultRow;
  try {
    await client.query('BEGIN');

    if (wantsReorder) {
      const targetStatus = status || report.old_status;
      const targetPos = (typeof newPosition === 'number' && Number.isInteger(newPosition))
        ? newPosition
        : 0; // status-without-position defaults to top of new column
      await reorderInGroup(client, 'bug_reports', 'status', req.params.id, targetStatus, targetPos);
    }

    // Apply the non-position field updates if any
    if (sets.length > 1 || (sets.length === 1 && vals.length > 0)) {
      vals.push(req.params.id);
      await client.query(`UPDATE bug_reports SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    }

    // Re-fetch the row so we return the post-reorder state
    const fresh = await client.query('SELECT * FROM bug_reports WHERE id = $1', [req.params.id]);
    resultRow = fresh.rows[0];
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    log('error', 'BugReports', 'PATCH failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to update bug report' });
  } finally {
    client.release();
  }

  await auditLog('bug_report', req.params.id, 'update', req.user?.displayName || 'unknown', {
    status, priority,
    description: description !== undefined,
    title: title !== undefined,
    position: newPosition !== undefined ? newPosition : undefined,
  });

  // Send notifications for status and priority changes
  const notifyUser = report.reporter_username;
  if (notifyUser && notifyUser !== req.user.username) {
    try {
      if (status && status !== report.old_status) {
        const statusLabels = { in_progress: 'In Progress', please_review: 'Please Review', resolved: 'Resolved', wontfix: "Won't Fix", open: 'Open' };
        await createNotification(notifyUser, status === 'resolved' ? 'success' : 'info',
          `Report ${statusLabels[status] || status}`,
          `"${report.title}" has been updated to ${statusLabels[status] || status}.`,
          '/nbi_project_dashboard.html#bugs');
      }
      if (priority !== undefined && priority !== report.old_priority) {
        await createNotification(notifyUser, 'info', 'Priority updated',
          `"${report.title}" priority set to ${priority || 'unset'}.`,
          '/nbi_project_dashboard.html#bugs');
      }
    } catch (e) { log('error', 'BugReports', 'Failed to send notification', { error: e.message }); }
  }

  res.json(resultRow);
});
```

**Note:** the original handler set `status = $idx` inside the dynamic `sets` array. This new version pulls status out of `sets` and routes it through `reorderInGroup` instead. The reorder helper writes the new status itself (step 6 of the helper UPDATEs `${groupCol}`), so we never need a `status = $N` assignment in the SET clause.

- [ ] **Step 2: Run the kanban-position PATCH tests to verify they pass**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: all 4 PATCH bug_reports tests pass.

- [ ] **Step 3: Run the auth + escape + migration tests to confirm no regression**

```bash
npm test
```

Expected: 16 original tests + helper additions + 21 new kanban-position tests pass.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/kanban-position.test.mjs
git commit -m "feat(api): PATCH /api/bug-reports/:id supports position + status reorder"
```

---

### Task 4a-4b: tasks POST + PATCH (mirror of Task 3)

**Files:**
- Modify: `dashboard-server/tests/unit/kanban-position.test.mjs`
- Modify: `dashboard-server/server.js` (POST at lines 3233-3290, PATCH at lines 3297-3530+)

- [ ] **Step 1: Add failing tests for tasks POST**

Append to `kanban-position.test.mjs`:

```js
describe('POST /api/tasks — inserts at position 0', () => {
  it('first task in a status lands at position 0', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'first', status: 'Not started' });
    expect(res.status).toBe(201);
    expect(res.body.position).toBe(0);
  });

  it('subsequent tasks push older ones down', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    for (const title of ['t1', 't2', 't3']) {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title, status: 'Not started' });
      expect(res.status).toBe(201);
    }
    const { rows } = await pool.query(
      `SELECT title, position FROM tasks WHERE status = 'Not started' ORDER BY position`
    );
    expect(rows).toEqual([
      { title: 't3', position: 0 },
      { title: 't2', position: 1 },
      { title: 't1', position: 2 },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: the second test fails (all three tasks land at position 0).

- [ ] **Step 3: Modify the tasks POST handler**

In `server.js`, replace the existing INSERT at lines 5325-ish (the tasks POST handler at `app.post('/api/tasks', ...)` around line 3233). The current INSERT is at lines 3282-3287:

```js
const { rows } = await pool.query(
  `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, health_state, description, assignees, hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, planner_task_id, source)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
  [title, parent_id || null, client_id || null, resolvedType, status || 'Not started', priority || '', health_state || '', description || '',
   assignees || [], parsedHoursEst, parsedHoursSpent, due_date || '', start_date || '', end_date || '', dependencies || [], planner_task_id || '', source || 'manual']
);
```

Wrap the INSERT in a transaction with a shift call. Replace those lines with:

```js
const targetStatus = status || 'Not started';
const client = await pool.connect();
let createdRow;
try {
  await client.query('BEGIN');
  await shiftForInsert(client, 'tasks', 'status', targetStatus);
  const { rows } = await client.query(
    `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, health_state, description, assignees, hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, planner_task_id, source, position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,0) RETURNING *`,
    [title, parent_id || null, client_id || null, resolvedType, targetStatus, priority || '', health_state || '', description || '',
     assignees || [], parsedHoursEst, parsedHoursSpent, due_date || '', start_date || '', end_date || '', dependencies || [], planner_task_id || '', source || 'manual']
  );
  createdRow = rows[0];
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  log('error', 'Tasks', 'POST failed', { error: err.message });
  return res.status(500).json({ error: 'Failed to create task' });
} finally {
  client.release();
}

// Replace the original `await auditLog(...)` line that referenced rows[0].id with createdRow.id
await auditLog('task', createdRow.id, 'create', req.user?.displayName, { title, item_type: resolvedType });
res.status(201).json(createdRow);
```

**The audit log call and `res.status(201).json(rows[0])` lines that came after the INSERT in the original handler must be deleted because they're now inside the try block.** Specifically, find the lines after the original `pool.query(...)` call (around server.js:3288-3289):

```js
await auditLog('task', rows[0].id, 'create', req.user?.displayName, { title, item_type: resolvedType });
res.status(201).json(rows[0]);
```

— delete them. The new version handles both inside/after the transaction block.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: both tasks POST tests pass.

- [ ] **Step 5: Add failing tests for tasks PATCH (append to file)**

```js
describe('PATCH /api/tasks/:id — drag-to-reorder', () => {
  async function makeTasks(token, count, status = 'Not started') {
    const ids = [];
    for (let i = 0; i < count; i++) {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: `t${i}`, status });
      ids.push(res.body.id);
    }
    return ids;
  }

  it('intra-column position move shifts others', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const ids = await makeTasks(token, 4); // t3@0, t2@1, t1@2, t0@3

    const res = await request(app)
      .patch(`/api/tasks/${ids[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ position: 0 });
    expect(res.status).toBe(200);
    expect(res.body.position).toBe(0);

    const { rows } = await pool.query(
      `SELECT title, position FROM tasks WHERE status = 'Not started' ORDER BY position`
    );
    expect(rows.map(r => r.title)).toEqual(['t0', 't3', 't2', 't1']);
  });

  it('cross-column move with explicit position', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const ids = await makeTasks(token, 3);

    const res = await request(app)
      .patch(`/api/tasks/${ids[1]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'In progress', position: 0 });
    expect(res.status).toBe(200);

    const inProg = await pool.query(
      `SELECT title FROM tasks WHERE status = 'In progress' ORDER BY position`
    );
    expect(inProg.rows.map(r => r.title)).toEqual(['t1']);

    const notStarted = await pool.query(
      `SELECT title, position FROM tasks WHERE status = 'Not started' ORDER BY position`
    );
    expect(notStarted.rows).toEqual([
      { title: 't2', position: 0 },
      { title: 't0', position: 1 },
    ]);
  });

  it('status change without explicit position lands at position 0', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const ids = await makeTasks(token, 2);
    // Pre-seed a task in 'In progress'
    await pool.query(
      `INSERT INTO tasks (title, status, position, item_type)
       VALUES ('old', 'In progress', 0, 'task')`
    );

    const res = await request(app)
      .patch(`/api/tasks/${ids[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'In progress' });
    expect(res.status).toBe(200);
    expect(res.body.position).toBe(0);

    const inProg = await pool.query(
      `SELECT title, position FROM tasks WHERE status = 'In progress' ORDER BY position`
    );
    expect(inProg.rows).toEqual([
      { title: 't0',  position: 0 },
      { title: 'old', position: 1 },
    ]);
  });
});
```

- [ ] **Step 6: Run to verify failure**

Expected: all three tasks PATCH tests fail because the existing handler doesn't know about position.

- [ ] **Step 7: Modify the tasks PATCH handler**

The tasks PATCH handler is more complex than bug_reports — it has cascade UPDATEs (lines 3452-3461), repeat-task clone logic (line 3478+), and uses `buildPatchQuery`. We need to NOT add `position` to the `allowedFields` list (or, if we add it, the buildPatchQuery still works) — and instead route status/position through `reorderInGroup`.

Find the `allowedFields` array at server.js:3331:

```js
const allowedFields = ['title', 'parent_id', 'client_id', 'item_type', 'status', 'priority', 'health_state', 'description', 'assignees', 'hours_estimated', 'hours_spent', 'due_date', 'start_date', 'end_date', 'dependencies', 'collaborations', 'success_factor', 'repeat_rule', 'blocker_info', 'practice_area'];
```

REMOVE `'status'` from this list (it will be handled by `reorderInGroup` instead). Do not add `'position'` here either. New value:

```js
const allowedFields = ['title', 'parent_id', 'client_id', 'item_type', 'priority', 'health_state', 'description', 'assignees', 'hours_estimated', 'hours_spent', 'due_date', 'start_date', 'end_date', 'dependencies', 'collaborations', 'success_factor', 'repeat_rule', 'blocker_info', 'practice_area'];
```

Then find the line `const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowedFields);` (around line 3332) and immediately before it, add the reorder transaction wrapper.

The existing handler structure ends with (around line 3431):

```js
const { rows } = await pool.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
```

Replace the entire body from `const { updates, vals, nextIdx } = buildPatchQuery(...)` through the cascade-status logic (lines 3332 → 3463) with a transaction wrapper that does:

1. Reorder if status or position changed
2. Run the rest of the field updates (if any)
3. Run the cascade-status logic (if status was set — fetch the new status from the row first)
4. Re-fetch the row and return it

Concrete replacement, slotted into the existing handler at the position where `buildPatchQuery` was called:

```js
const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowedFields);
const wantsReorder = (req.body.status !== undefined) || (req.body.position !== undefined);

if (!wantsReorder && updates.length === 0) {
  return res.status(400).json({ error: 'No valid fields to update' });
}

// Validate status if provided
if (req.body.status !== undefined) {
  // Tasks use TEXT statuses; the existing code did not validate them strictly
  // but we keep the same behaviour: any non-empty string is accepted.
  if (typeof req.body.status !== 'string' || !req.body.status.trim()) {
    return res.status(400).json({ error: 'Status must be a non-empty string' });
  }
}

// Fetch the old row for change detection (existing behaviour)
const oldResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
const oldTask = oldResult.rows[0];

const dbClient = await pool.connect();
let updatedRow;
try {
  await dbClient.query('BEGIN');

  if (wantsReorder) {
    const targetStatus = (req.body.status !== undefined) ? req.body.status : oldTask.status;
    const targetPos = (typeof req.body.position === 'number' && Number.isInteger(req.body.position))
      ? req.body.position
      : 0; // status-without-position → top of new column
    await reorderInGroup(dbClient, 'tasks', 'status', req.params.id, targetStatus, targetPos);
  }

  if (updates.length > 0) {
    updates.push(`updated_at = NOW()`);
    vals.push(req.params.id);
    await dbClient.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${nextIdx}`,
      vals
    );
  }

  const fresh = await dbClient.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  updatedRow = fresh.rows[0];
  await dbClient.query('COMMIT');
} catch (err) {
  await dbClient.query('ROLLBACK');
  log('error', 'Tasks', 'PATCH failed', { error: err.message });
  return res.status(500).json({ error: 'Failed to update task' });
} finally {
  dbClient.release();
}

// Change detection for audit logging (existing behaviour, run AFTER the txn)
const allowedForChanges = [...allowedFields, 'status', 'position'];
const changes = {};
for (const f of allowedForChanges) {
  if (req.body[f] !== undefined) {
    const oldVal = oldTask[f];
    const newVal = updatedRow[f];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[f] = { from: oldVal, to: newVal };
    }
  }
}
if (Object.keys(changes).length > 0) {
  await auditLog('task', req.params.id, 'update', req.user?.displayName, changes);
}

// IMPORTANT: the existing handler had a cascade block that propagated status
// changes from a parent task to its children. Preserve it here, AFTER the
// reorder transaction commits. Find the original cascade lines (3447-3461)
// and copy them verbatim to AFTER the auditLog call. They take `req.body.status`
// and run `UPDATE tasks SET status = ... WHERE parent_id = req.params.id`.
// They do NOT need to be inside the transaction.

// (Repeat-task clone logic — lines 3478+ in the original — also stays where
// it was, after the cascade block.)

res.json(updatedRow);
```

**Important:** the engineer must read the current handler (server.js:3297-3530) carefully and preserve the cascade-status block, the repeat-task clone block, and any notification logic. The new transaction wrapper replaces ONLY the part from `buildPatchQuery` to `await pool.query(...UPDATE tasks)`. The other blocks stay.

If line numbers differ from what's documented (post-merge drift is possible), search for the strings `const allowedFields = [` and `const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowedFields);` to locate the splice points.

- [ ] **Step 8: Run the tests to verify they pass**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: all tasks POST + PATCH tests pass.

- [ ] **Step 9: Run the full unit suite for regression**

```bash
npm test
```

Expected: every test still green.

- [ ] **Step 10: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/kanban-position.test.mjs
git commit -m "feat(api): tasks POST inserts at 0; PATCH supports position + status reorder"
```

---

### Task 5a-5b: candidates POST + PATCH

**Files:**
- Modify: `dashboard-server/tests/unit/kanban-position.test.mjs`
- Modify: `dashboard-server/server.js` (POST at lines 5742-5778, PATCH at lines 5781-5826)

- [ ] **Step 1: Append failing tests to `kanban-position.test.mjs`**

```js
describe('POST /api/candidates — inserts at position 0', () => {
  it('first candidate in a stage lands at position 0', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const res = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Alice', stage: 'sourced' });
    expect(res.status).toBe(201);
    expect(res.body.position).toBe(0);
  });

  it('subsequent candidates push older ones down', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    for (const name of ['c1', 'c2', 'c3']) {
      await request(app)
        .post('/api/candidates')
        .set('Authorization', `Bearer ${token}`)
        .send({ name, stage: 'sourced' });
    }
    const { rows } = await pool.query(
      `SELECT name, position FROM candidates WHERE stage = 'sourced' ORDER BY position`
    );
    expect(rows.map(r => r.name)).toEqual(['c3', 'c2', 'c1']);
  });
});

describe('PATCH /api/candidates/:id — drag-to-reorder', () => {
  it('intra-stage position change shifts others', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const ids = [];
    for (const name of ['c0', 'c1', 'c2']) {
      const r = await request(app).post('/api/candidates')
        .set('Authorization', `Bearer ${token}`).send({ name, stage: 'sourced' });
      ids.push(r.body.id); // After loop: c2@0, c1@1, c0@2
    }
    const res = await request(app)
      .patch(`/api/candidates/${ids[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ position: 0 });
    expect(res.status).toBe(200);
    const { rows } = await pool.query(
      `SELECT name, position FROM candidates WHERE stage = 'sourced' ORDER BY position`
    );
    expect(rows.map(r => r.name)).toEqual(['c0', 'c2', 'c1']);
  });

  it('stage change without explicit position lands at position 0 of new stage', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const r = await request(app).post('/api/candidates')
      .set('Authorization', `Bearer ${token}`).send({ name: 'mover', stage: 'sourced' });
    // Pre-seed a candidate already in 'screening'
    await pool.query(
      `INSERT INTO candidates (name, stage, position) VALUES ('existing', 'screening', 0)`
    );
    const res = await request(app)
      .patch(`/api/candidates/${r.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stage: 'screening' });
    expect(res.status).toBe(200);
    expect(res.body.stage).toBe('screening');
    expect(res.body.position).toBe(0);
    const { rows } = await pool.query(
      `SELECT name, position FROM candidates WHERE stage = 'screening' ORDER BY position`
    );
    expect(rows).toEqual([
      { name: 'mover',    position: 0 },
      { name: 'existing', position: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

- [ ] **Step 3: Modify the candidates POST handler**

Replace the INSERT block at server.js:5758-5771 with a transaction wrapper. The current code:

```js
const { rows } = await pool.query(
  `INSERT INTO candidates (client_id, position_id, name, role, linkedin_url, due_date, stage, notes)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
  [
    client_id || null,
    position_id || null,
    name.trim(),
    role || null,
    linkedin_url || null,
    due_date || null,
    stage || 'sourced',
    notes || null
  ]
);
```

Becomes:

```js
const targetStage = stage || 'sourced';
const client = await pool.connect();
let createdRow;
try {
  await client.query('BEGIN');
  await shiftForInsert(client, 'candidates', 'stage', targetStage);
  const { rows } = await client.query(
    `INSERT INTO candidates (client_id, position_id, name, role, linkedin_url, due_date, stage, notes, position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0) RETURNING *`,
    [
      client_id || null,
      position_id || null,
      name.trim(),
      role || null,
      linkedin_url || null,
      due_date || null,
      targetStage,
      notes || null,
    ]
  );
  createdRow = rows[0];
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  log('error', 'Candidates', 'POST failed', { error: err.message });
  return res.status(500).json({ error: 'Failed to create candidate' });
} finally {
  client.release();
}

// Update the audit log call to use createdRow.id (was rows[0].id at line 5772)
await auditLog('candidate', createdRow.id, 'create', req.user.displayName || 'unknown', { name: name.trim(), client_id: client_id || null });
res.status(201).json(createdRow);
```

**Delete** the original `await auditLog(...)` and `res.status(201).json(rows[0])` lines that came after the original INSERT.

**Note:** the column `name` here is a JS local from `req.body.name` (already trimmed in the validation block). Don't shadow it with the migration-021 `name` from the WITH clause — that only exists in the SQL.

- [ ] **Step 4: Modify the candidates PATCH handler**

The current PATCH at server.js:5781-5826 uses `buildPatchQuery` with these fields:

```js
const { updates, vals, nextIdx } = buildPatchQuery(body, ['client_id', 'position_id', 'name', 'role', 'linkedin_url', 'due_date', 'stage', 'notes']);
```

REMOVE `'stage'` from that list (route through `reorderInGroup` instead). Replace the line with:

```js
const { updates, vals, nextIdx } = buildPatchQuery(body, ['client_id', 'position_id', 'name', 'role', 'linkedin_url', 'due_date', 'notes']);
```

Then wrap the `if (updates.length === 0) return ...` check + the UPDATE in a transaction with the reorder branch. The new flow replaces lines 5810-5821 with:

```js
const wantsReorder = (body.stage !== undefined) || (body.position !== undefined);
if (!wantsReorder && updates.length === 0) {
  return res.status(400).json({ error: 'No valid fields to update' });
}

// Validate stage if provided (free-form text — match existing leniency)
if (body.stage !== undefined && (typeof body.stage !== 'string' || !body.stage.trim())) {
  return res.status(400).json({ error: 'Stage must be a non-empty string' });
}

const client = await pool.connect();
let updatedRow;
try {
  await client.query('BEGIN');

  if (wantsReorder) {
    const oldRow = await client.query('SELECT stage FROM candidates WHERE id = $1', [req.params.id]);
    if (oldRow.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Candidate not found' });
    }
    const targetStage = (body.stage !== undefined) ? body.stage : oldRow.rows[0].stage;
    const targetPos = (typeof body.position === 'number' && Number.isInteger(body.position))
      ? body.position
      : 0;
    await reorderInGroup(client, 'candidates', 'stage', req.params.id, targetStage, targetPos);
  }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    vals.push(req.params.id);
    await client.query(
      `UPDATE candidates SET ${updates.join(', ')} WHERE id = $${nextIdx}`,
      vals
    );
  }

  const fresh = await client.query('SELECT * FROM candidates WHERE id = $1', [req.params.id]);
  updatedRow = fresh.rows[0];
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  log('error', 'Candidates', 'PATCH failed', { error: err.message });
  return res.status(500).json({ error: 'Failed to update candidate' });
} finally {
  client.release();
}

await auditLog('candidate', req.params.id, 'update', req.user.displayName || 'unknown', { fields: Object.keys(req.body) });
res.json(updatedRow);
```

— and DELETE the original `const { rows } = await pool.query(...UPDATE candidates...)` and the `res.json(rows[0])` line. Audit log moves above.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: all candidates tests pass.

- [ ] **Step 6: Run the full unit suite**

```bash
npm test
```

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/kanban-position.test.mjs
git commit -m "feat(api): candidates POST inserts at 0; PATCH supports position + stage reorder"
```

---

### Task 6a-6b: leads POST + PATCH

**Files:**
- Modify: `dashboard-server/tests/unit/kanban-position.test.mjs`
- Modify: `dashboard-server/server.js` (POST at lines 4590-4657 — already in a transaction, PATCH at lines 4664-4736)

- [ ] **Step 1: Append failing tests**

```js
describe('POST /api/leads — inserts at position 0', () => {
  it('first lead in a stage lands at position 0', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const stage = await createTestLeadStage();
    try {
      const res = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Big Deal', stage_id: stage.id });
      expect(res.status).toBe(201);
      expect(res.body.position).toBe(0);
    } finally {
      await pool.query('DELETE FROM leads WHERE stage_id = $1', [stage.id]);
      await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
    }
  });

  it('subsequent leads push older ones down within the same stage', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const stage = await createTestLeadStage();
    try {
      for (const title of ['L1', 'L2', 'L3']) {
        await request(app)
          .post('/api/leads')
          .set('Authorization', `Bearer ${token}`)
          .send({ title, stage_id: stage.id });
      }
      const { rows } = await pool.query(
        `SELECT title, position FROM leads WHERE stage_id = $1 ORDER BY position`,
        [stage.id]
      );
      expect(rows.map(r => r.title)).toEqual(['L3', 'L2', 'L1']);
    } finally {
      await pool.query('DELETE FROM leads WHERE stage_id = $1', [stage.id]);
      await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
    }
  });
});

describe('PATCH /api/leads/:id — drag-to-reorder', () => {
  it('intra-stage move shifts others', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const stage = await createTestLeadStage();
    const ids = [];
    try {
      for (const title of ['L0', 'L1', 'L2']) {
        const r = await request(app).post('/api/leads')
          .set('Authorization', `Bearer ${token}`)
          .send({ title, stage_id: stage.id });
        ids.push(r.body.id); // After loop: L2@0, L1@1, L0@2
      }
      const res = await request(app)
        .patch(`/api/leads/${ids[0]}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ position: 0 });
      expect(res.status).toBe(200);
      expect(res.body.position).toBe(0);
      const { rows } = await pool.query(
        `SELECT title, position FROM leads WHERE stage_id = $1 ORDER BY position`,
        [stage.id]
      );
      expect(rows.map(r => r.title)).toEqual(['L0', 'L2', 'L1']);
    } finally {
      await pool.query('DELETE FROM leads WHERE stage_id = $1', [stage.id]);
      await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
    }
  });

  it('cross-stage move closes old gap and opens new slot', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const stageA = await createTestLeadStage({ name: 'A' });
    const stageB = await createTestLeadStage({ name: 'B' });
    try {
      const r1 = await request(app).post('/api/leads')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'A0', stage_id: stageA.id });
      const r2 = await request(app).post('/api/leads')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'A1', stage_id: stageA.id }); // A1@0, A0@1
      await request(app).post('/api/leads')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'B0', stage_id: stageB.id });

      // Move A1 → B at position 0 (top of B)
      const res = await request(app)
        .patch(`/api/leads/${r2.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stage_id: stageB.id, position: 0 });
      expect(res.status).toBe(200);

      const a = await pool.query(
        `SELECT title, position FROM leads WHERE stage_id = $1 ORDER BY position`,
        [stageA.id]
      );
      expect(a.rows).toEqual([{ title: 'A0', position: 0 }]);

      const b = await pool.query(
        `SELECT title, position FROM leads WHERE stage_id = $1 ORDER BY position`,
        [stageB.id]
      );
      expect(b.rows.map(r => r.title)).toEqual(['A1', 'B0']);
    } finally {
      await pool.query('DELETE FROM leads WHERE stage_id IN ($1, $2)', [stageA.id, stageB.id]);
      await pool.query('DELETE FROM lead_pipeline_stages WHERE id IN ($1, $2)', [stageA.id, stageB.id]);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

- [ ] **Step 3: Modify the leads POST handler**

The leads POST is already wrapped in `pool.connect()` + `BEGIN`/`COMMIT` (lines 4602-4640). Add a `shiftForInsert` call before the INSERT.

Find the INSERT at server.js:4605 (`const { rows } = await conn.query(...)`). Immediately before it, add:

```js
await shiftForInsert(conn, 'leads', 'stage_id', stage_id);
```

And modify the INSERT itself to write `position = 0`. Change the column list and value list:

```js
const { rows } = await conn.query(
  `INSERT INTO leads (client_id, title, work_type, service_line, stage_id, priority, currency,
    rom_min, rom_max, rom_text, win_probability, primary_contact_id, deal_owner,
    lead_source, est_start_date, expected_close_date, last_contacted,
    next_followup_date, next_action, location, notes, time_estimate, created_by, position)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,0) RETURNING *`,
  [client_id || null, title, work_type || null, service_line || null, stage_id,
    priority || null, currency || 'GBP',
    rom_min || null, rom_max || null, rom_text || null, win_probability || null,
    primary_contact_id || null, deal_owner || null, lead_source || null,
    est_start_date || null, expected_close_date || null, last_contacted || null,
    next_followup_date || null, next_action || null, location || null,
    notes || null, time_estimate || null, req.user?.displayName || 'unknown']
);
```

(Added the `position` column at the end of the column list and a literal `,0` at the end of the values list; the params array stays unchanged.)

- [ ] **Step 4: Modify the leads PATCH handler**

Find `patchFields` at server.js:4667. REMOVE `'stage_id'` from the list. New value:

```js
const patchFields = ['client_id', 'title', 'work_type', 'service_line', 'priority',
  'currency', 'rom_min', 'rom_max', 'rom_text', 'win_probability',
  'primary_contact_id', 'deal_owner', 'lead_source',
  'est_start_date', 'expected_close_date', 'last_contacted',
  'next_followup_date', 'next_action', 'location', 'notes', 'time_estimate',
  'completed_at', 'practice_area'];
```

Then wrap the `await pool.query(\`UPDATE leads SET ...\`)` line and surrounding logic in a transaction with reorder branch. The new flow goes after the existing change-detection prep (line 4694) and replaces lines 4694-4725 with:

```js
const wantsReorder = (sanitisedBody.stage_id !== undefined) || (req.body.position !== undefined);
if (!wantsReorder && updates.length === 0) {
  return res.status(400).json({ error: 'No valid fields to update' });
}

const conn = await pool.connect();
let updatedRow;
try {
  await conn.query('BEGIN');

  if (wantsReorder) {
    const targetStage = (sanitisedBody.stage_id !== undefined) ? sanitisedBody.stage_id : oldLead.stage_id;
    const targetPos = (typeof req.body.position === 'number' && Number.isInteger(req.body.position))
      ? req.body.position
      : 0;
    await reorderInGroup(conn, 'leads', 'stage_id', req.params.id, targetStage, targetPos);
  }

  if (updates.length > 0) {
    updates.push(`updated_at = NOW()`);
    vals.push(req.params.id);
    await conn.query(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = $${nextIdx}`,
      vals
    );
  }

  const fresh = await conn.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
  updatedRow = fresh.rows[0];
  await conn.query('COMMIT');
} catch (err) {
  await conn.query('ROLLBACK');
  log('error', 'Leads', 'PATCH failed', { error: err.message });
  return res.status(500).json({ error: 'Failed to update lead' });
} finally {
  conn.release();
}

// Recompute changes against the freshly-fetched updated row
const changes = {};
const allowedForChanges = [...patchFields, 'stage_id', 'position'];
for (const f of allowedForChanges) {
  if ((sanitisedBody[f] !== undefined) || (f === 'position' && req.body.position !== undefined)) {
    const oldVal = oldLead[f];
    const newVal = updatedRow[f];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[f] = { from: oldVal, to: newVal };
    }
  }
}

if (changes.stage_id) {
  const oldStage = await pool.query('SELECT name FROM lead_pipeline_stages WHERE id = $1', [changes.stage_id.from]);
  const newStage = await pool.query('SELECT name FROM lead_pipeline_stages WHERE id = $1', [changes.stage_id.to]);
  const desc = `Stage changed from ${oldStage.rows[0]?.name || '?'} to ${newStage.rows[0]?.name || '?'}`;
  await pool.query(
    'INSERT INTO lead_activities (lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4)',
    [req.params.id, 'stage_change', desc, req.user?.displayName || 'unknown']
  );
}
if (changes.priority) {
  await pool.query(
    'INSERT INTO lead_activities (lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4)',
    [req.params.id, 'priority_change', `Priority changed from ${changes.priority.from || 'none'} to ${changes.priority.to || 'none'}`, req.user?.displayName || 'unknown']
  );
}

if (Object.keys(changes).length > 0) {
  await auditLog('lead', req.params.id, 'update', req.user?.displayName, changes);
}

res.json(updatedRow);
```

— and DELETE the original `const { rows } = await pool.query(\`UPDATE leads ...\`)` and `res.json(rows[0])` lines.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- tests/unit/kanban-position.test.mjs
```

Expected: all leads tests pass.

- [ ] **Step 6: Run full suite**

```bash
npm test
```

Expected: all tests pass. This concludes the server-side phase.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/kanban-position.test.mjs
git commit -m "feat(api): leads POST inserts at 0; PATCH supports position + stage_id reorder"
```

---

## Phase 7 — Frontend: Bug Tracker (NEW drag support)

The Bug Tracker board has no drag support today. We add it from scratch and write a Playwright spec to lock in the behaviour.

### Task 7a: Sort the bug tracker render by position

**Files:**
- Modify: `nbi_project_dashboard.html` (function `renderBugTrackerKanban` at lines ~12814-12865)

- [ ] **Step 1: Find `renderBugTrackerKanban` and add a sort**

Search for `function renderBugTrackerKanban(filtered) {`. The current loop is:

```js
STATUSES.forEach(s => {
  const items = filtered.filter(r => r.status === s.key);
```

Replace with:

```js
STATUSES.forEach(s => {
  const items = filtered.filter(r => r.status === s.key)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
```

- [ ] **Step 2: Quick smoke check — open the dashboard, make sure the board still renders**

For now, just verify nothing broke at the top level. Bring up the existing PM2 instance is overkill — instead, run the existing Playwright smoke spec:

```bash
cd dashboard-server
npm run test:e2e -- tests/e2e/smoke.spec.js
```

Expected: still passes.

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): bug tracker kanban renders sorted by position"
```

---

### Task 7b: Add drag attributes + handlers to bug cards

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: In `renderBugTrackerKanban`, find the card markup**

The current card is rendered as:

```js
html += `<button type="button" class="bug-card" onclick="openBugDetail('${r.id}')"
```

(Find the line that opens the `<button>` element. It's inside the `items.forEach(r => { ... })` loop.)

Convert from `<button>` to a `<div>` with role="button" and drag attributes. Replace the opening tag and surrounding context. The div needs:
- `class="bug-card"`
- `role="button"`
- `tabindex="0"`
- `data-bug-id="${r.id}"`
- `data-position="${r.position || 0}"`
- `draggable="true"`
- `ondragstart="onBugCardDragStart(event,'${r.id}','${s.key}')"`
- `ondragend="onBugCardDragEnd(event)"`
- `onclick="openBugDetail('${r.id}')"`
- The existing aria-label

The closing tag changes from `</button>` to `</div>`.

Find the existing button declaration (around line 12848 in the original) and modify it. Concrete replacement of the opening tag:

Before (something like):
```js
html += `<button type="button" class="bug-card" onclick="openBugDetail('${r.id}')" aria-label="${esc(cardAria)}">
```

After:
```js
html += `<div class="bug-card" role="button" tabindex="0" data-bug-id="${r.id}" data-position="${r.position || 0}" draggable="true" ondragstart="onBugCardDragStart(event,'${r.id}','${s.key}')" ondragend="onBugCardDragEnd(event)" onclick="if(!window._bugDragActive)openBugDetail('${r.id}')" aria-label="${esc(cardAria)}">
```

And find the matching `</button>` (still inside the loop) and change to `</div>`.

The lane body needs drop handlers. Find the `<div class="bug-lane__body">` line and change to:

```js
html += `<div class="bug-lane__body"
  ondragover="onBugLaneDragOver(event)"
  ondragleave="onBugLaneDragLeave(event)"
  ondrop="onBugLaneDrop(event,'${s.key}')">`;
```

- [ ] **Step 2: Add the handler functions**

Add the four handlers (`onBugCardDragStart`, `onBugCardDragEnd`, `onBugLaneDragOver`, `onBugLaneDragLeave`, `onBugLaneDrop`) immediately after `renderBugTrackerKanban` ends. Find the closing `}` of that function and add:

```js
// =========================================================================
// Bug Tracker Kanban drag-to-reorder (decision D79)
// =========================================================================

let _bugDragId = null;
let _bugDragSourceStatus = null;
window._bugDragActive = false;

function onBugCardDragStart(ev, bugId, sourceStatus) {
  _bugDragId = bugId;
  _bugDragSourceStatus = sourceStatus;
  window._bugDragActive = true;
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', bugId);
  }
  if (ev.currentTarget && ev.currentTarget.classList) {
    ev.currentTarget.classList.add('dragging');
  }
}

function onBugCardDragEnd(ev) {
  if (ev.currentTarget && ev.currentTarget.classList) {
    ev.currentTarget.classList.remove('dragging');
  }
  // Defer clearing the drag-active flag so the click handler doesn't fire
  setTimeout(() => { window._bugDragActive = false; }, 0);
}

function onBugLaneDragOver(ev) {
  if (!_bugDragId) return;
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
  const lane = ev.currentTarget;
  lane.classList.add('drag-over');
  // Insertion indicator
  const cards = [...lane.querySelectorAll('.bug-card:not(.dragging)')];
  lane.querySelectorAll('.bug-drop-indicator').forEach(d => d.remove());
  const afterCard = cards.reduce((closest, card) => {
    const box = card.getBoundingClientRect();
    const offset = ev.clientY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, el: card };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, el: null }).el;
  const indicator = document.createElement('div');
  indicator.className = 'bug-drop-indicator';
  if (afterCard) lane.insertBefore(indicator, afterCard);
  else lane.appendChild(indicator);
}

function onBugLaneDragLeave(ev) {
  const lane = ev.currentTarget;
  // Only clear when the cursor truly leaves the lane (not a child)
  if (lane.contains(ev.relatedTarget)) return;
  lane.classList.remove('drag-over');
  lane.querySelectorAll('.bug-drop-indicator').forEach(d => d.remove());
}

async function onBugLaneDrop(ev, targetStatus) {
  ev.preventDefault();
  const lane = ev.currentTarget;
  lane.classList.remove('drag-over');
  lane.querySelectorAll('.bug-drop-indicator').forEach(d => d.remove());
  if (!_bugDragId) return;

  // Compute drop index against the visible (unfiltered, since the bug
  // tracker doesn't filter on the kanban view) cards in this lane.
  const cards = [...lane.querySelectorAll('.bug-card:not(.dragging)')];
  const afterCard = cards.reduce((closest, card) => {
    const box = card.getBoundingClientRect();
    const offset = ev.clientY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, el: card };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, el: null }).el;
  const dropIdx = afterCard ? cards.indexOf(afterCard) : cards.length;

  const patch = { position: dropIdx };
  if (targetStatus !== _bugDragSourceStatus) patch.status = targetStatus;

  const bugId = _bugDragId;
  _bugDragId = null;
  _bugDragSourceStatus = null;

  try {
    const res = await authFetch(`/api/bug-reports/${bugId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast('Failed to move bug', 'error');
      return;
    }
    // Refetch to converge with server-side ordering
    if (typeof loadBugReports === 'function') {
      await loadBugReports();
      renderContent();
    }
  } catch (e) {
    console.error('Bug drop failed', e);
    toast('Failed to move bug', 'error');
  }
}
```

(`authFetch`, `toast`, `loadBugReports`, and `renderContent` already exist in the file. `authFetch` is at lines 2185-2199. If `loadBugReports` doesn't exist by that exact name, find the bug-tracker fetch function via `grep -n "_bugReportsData =" nbi_project_dashboard.html` and call that instead.)

- [ ] **Step 2.5: Add minimal CSS for the drop indicator**

Find the existing `.bug-card` styles in the `<style>` block and add nearby:

```css
.bug-drop-indicator {
  height: 2px;
  background: var(--accent, #2ea3ff);
  border-radius: 1px;
  margin: 4px 0;
}
.bug-card.dragging {
  opacity: 0.4;
}
.bug-lane__body.drag-over {
  background: rgba(46, 163, 255, 0.06);
}
```

- [ ] **Step 3: Run the existing E2E suite for regression**

```bash
npm run test:e2e
```

Expected: all 7 existing E2E tests still pass. The new drag handlers don't interfere because nothing exercises them yet.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): add drag-to-reorder support to Bug Tracker kanban"
```

---

### Task 7c: Playwright spec for bug tracker drag

**Files:**
- Create: `dashboard-server/tests/e2e/kanban-drag.spec.js`

- [ ] **Step 1: Write the failing test**

```js
// dashboard-server/tests/e2e/kanban-drag.spec.js
//
// E2E specs for kanban drag-to-reorder (decision D79).
// One describe block per board.

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestBugReport, createTestTask, createTestCandidate, createTestLead, createTestLeadStage } = require('../helpers/fixtures');
const { mintSession } = require('../helpers/auth');
const { truncate, pool } = require('../helpers/db');

async function loginAs(page, username, rawPassword) {
  await page.goto('/nbi_project_dashboard.html');
  await page.waitForSelector('#loginScreen', { state: 'visible' });
  await page.locator('#loginUser').fill(username);
  await page.locator('#loginPass').fill(rawPassword);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden' });
}

test.describe('Bug Tracker kanban drag', () => {
  test('drag reorders within a column and persists via PATCH', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    // Three open bugs created via the API — the helper bypasses the position
    // shift so we set positions explicitly.
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'Top bug',    '', 'open', 0),
              ($1, 'bug', 'Middle bug', '', 'open', 1),
              ($1, 'bug', 'Bottom bug', '', 'open', 2)`,
      [user.id]
    );

    await loginAs(page, user.username, user.raw_password);

    // Navigate to bug tracker
    await page.locator('button').filter({ hasText: /^Bug Tracker/ }).first().click();
    await page.waitForSelector('.bug-tracker__kanban', { state: 'visible' });

    // Wait for the three bug cards to be present
    const cards = page.locator('.bug-card');
    await expect(cards).toHaveCount(3);
    const titles = await cards.allTextContents();
    expect(titles[0]).toContain('Top bug');
    expect(titles[1]).toContain('Middle bug');
    expect(titles[2]).toContain('Bottom bug');

    // Drag "Bottom bug" to before "Top bug"
    const bottom = page.locator('.bug-card', { hasText: 'Bottom bug' });
    const top = page.locator('.bug-card', { hasText: 'Top bug' });

    // Wait for the API call so we can assert on it
    const patchPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/bug-reports/') && resp.request().method() === 'PATCH'
    );
    await bottom.dragTo(top);
    const patchResp = await patchPromise;

    expect(patchResp.status()).toBe(200);
    const body = await patchResp.json();
    expect(body.position).toBe(0);

    // After refetch, the DOM should reflect the new order
    await expect(page.locator('.bug-card').first()).toContainText('Bottom bug');

    // And the DB row matches
    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'open' ORDER BY position`
    );
    expect(rows.map(r => r.title)).toEqual(['Bottom bug', 'Top bug', 'Middle bug']);
  });

  test('drag across lanes changes status + position', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'movable', '', 'open', 0)`,
      [user.id]
    );

    await loginAs(page, user.username, user.raw_password);
    await page.locator('button').filter({ hasText: /^Bug Tracker/ }).first().click();
    await page.waitForSelector('.bug-tracker__kanban');

    const card = page.locator('.bug-card', { hasText: 'movable' });
    const inProgressLane = page.locator('.bug-lane', { hasText: /^In Progress/ }).locator('.bug-lane__body');

    const patchPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/bug-reports/') && resp.request().method() === 'PATCH'
    );
    await card.dragTo(inProgressLane);
    await patchPromise;

    const { rows } = await pool.query(
      `SELECT status, position FROM bug_reports WHERE title = 'movable'`
    );
    expect(rows[0].status).toBe('in_progress');
    expect(rows[0].position).toBe(0);
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
npm run test:e2e -- tests/e2e/kanban-drag.spec.js
```

Expected: both bug tracker drag tests pass. If they fail with timing issues, the most common cause is the bug tracker DOM not re-rendering after the click on the sidebar button. The handoff documented this — try `page.locator('button').filter({ hasText: /^Bug Tracker/ }).first().click()` then `await page.locator('.bug-tracker__kanban').waitFor()` (already in the spec). If it's still flaky, add `await page.waitForTimeout(200)` after the click as a temporary diagnostic, then find the proper hook (a class change, a poll completion) and use that instead.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/tests/e2e/kanban-drag.spec.js
git commit -m "test(e2e): bug tracker drag-to-reorder + cross-lane drop"
```

---

## Phase 8 — Frontend: Tasks (REMOVE priority-as-position)

### Task 8a: Sort `renderBoardView` by position + remove priority misuse

**Files:**
- Modify: `nbi_project_dashboard.html` (`renderBoardView` at lines ~4763-4800, `onBoardDrop` at ~6621-6680)

- [ ] **Step 1: In `renderBoardView`, when filtering tasks per lane, add a position sort**

Find the line `let allFiltered = _boardTypeFilter ? filtered.filter(t => getItemType(t) === _boardTypeFilter) : filtered;` and the subsequent split into `cancelled` / `active` / `blockedByHealth` / `notBlockedByHealth`.

The lane render loop is further down. Find where each lane's tasks are filtered (search for `dataset.laneStatuses` or the lane header HTML inside `renderBoardView`). At the point where the per-lane task array is built, sort by position. Concretely, search for a line like:

```js
const laneTasks = notBlockedByHealth.filter(t => statuses.includes(t.status));
```

and replace with:

```js
const laneTasks = notBlockedByHealth.filter(t => statuses.includes(t.status))
  .sort((a, b) => (a.position || 0) - (b.position || 0));
```

(If the variable name differs, the engineer should grep for `.filter(t => statuses` or `dataset.laneStatuses` to find the per-lane filter and apply the same sort.)

The blocked lane and cancelled lane should also get the sort. Apply `.sort((a, b) => (a.position || 0) - (b.position || 0))` to whatever array each one renders from.

- [ ] **Step 2: Replace the `onBoardDrop` priority-as-position block**

Find `function onBoardDrop(e) {` (around line 6621). Inside it, find the `priorityMap` block:

```js
// Map drop position to priority: top = Critical ACT, bottom = Low
const priorityMap = ['Critical ACT', 'Urgent', 'High', 'Medium', 'Low'];
const newPriority = priorityMap[Math.min(dropIdx, priorityMap.length - 1)] || 'Medium';
```

DELETE these lines and the subsequent `priority` assignment in the PATCH call. Replace with:

```js
// Drop index is the new position in the target lane.
// (Priority is decoupled from drag order — see decision D79.)
```

Then find where the handler PATCHes the server. The current handler probably does something like:

```js
task.priority = newPriority;
// ... build payload like { status: targetStatus, priority: newPriority }
```

Replace the payload construction with:

```js
const targetStatus = laneStatuses.split(',')[0]; // first status in this lane
const payload = { position: dropIdx };
if (task.status !== targetStatus) payload.status = targetStatus;
```

And the fetch call should look like:

```js
const res = await authFetch(`/api/tasks/${task.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
if (!res.ok) {
  toast('Failed to move task', 'error');
  return;
}
// Optimistically update local state then refetch to converge
if (payload.status) task.status = payload.status;
task.position = dropIdx;
if (typeof syncTasks === 'function') {
  await syncTasks();
}
renderContent();
```

(The exact local-state update depends on what variable holds the in-memory tasks array — it's `tasks` per the explore agent at line 2425. Confirm that the existing handler also touched local state before its PATCH; preserve any `tasks.find(...)` lookup it did and adjust to remove the priority assignment.)

**The engineer should preserve any existing optimistic-update or refetch logic in the original `onBoardDrop`.** The minimum change needed is: stop writing `priority` on drop, start writing `position`, send the new field to the server.

- [ ] **Step 3: Run the existing E2E smoke spec to confirm we didn't break the page**

```bash
npm run test:e2e -- tests/e2e/smoke.spec.js tests/e2e/tasks.spec.js
```

Expected: both still pass.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): tasks kanban sorts by position; remove priority-as-position misuse"
```

---

### Task 8b: Playwright spec for tasks kanban drag

**Files:**
- Modify: `dashboard-server/tests/e2e/kanban-drag.spec.js`

- [ ] **Step 1: Append a tasks describe block**

```js
test.describe('Tasks kanban drag', () => {
  test('drag within a column reorders by position, leaves priority untouched', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    // Three projects in 'Not started' with explicit positions and priorities.
    // We assert priority does NOT change after the drag.
    await pool.query(
      `INSERT INTO tasks (title, status, priority, position, item_type)
       VALUES ('Top task',    'Not started', 'High',   0, 'project'),
              ('Middle task', 'Not started', 'Medium', 1, 'project'),
              ('Bottom task', 'Not started', 'Low',    2, 'project')`
    );

    await loginAs(page, user.username, user.raw_password);

    // Navigate to the Board view if not already there
    await page.locator('button').filter({ hasText: /^Board/ }).first().click();
    await page.waitForSelector('.board-card');

    const cards = page.locator('.board-card');
    await expect(cards).toHaveCount(3);

    const bottom = page.locator('.board-card', { hasText: 'Bottom task' });
    const top = page.locator('.board-card', { hasText: 'Top task' });

    const patchPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/tasks/') && resp.request().method() === 'PATCH'
    );
    await bottom.dragTo(top);
    await patchPromise;

    const { rows } = await pool.query(
      `SELECT title, position, priority FROM tasks WHERE status = 'Not started' ORDER BY position`
    );
    expect(rows.map(r => r.title)).toEqual(['Bottom task', 'Top task', 'Middle task']);
    // Priorities preserved — the drag MUST NOT touch them
    expect(rows.find(r => r.title === 'Bottom task').priority).toBe('Low');
    expect(rows.find(r => r.title === 'Top task').priority).toBe('High');
    expect(rows.find(r => r.title === 'Middle task').priority).toBe('Medium');
  });
});
```

- [ ] **Step 2: Run**

```bash
npm run test:e2e -- tests/e2e/kanban-drag.spec.js
```

Expected: bug tracker tests still pass + tasks test passes. If the dragTo timing is unreliable, switch to manual drag dispatching:

```js
const box = await bottom.boundingBox();
const targetBox = await top.boundingBox();
await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
await page.mouse.down();
await page.mouse.move(targetBox.x + targetBox.width/2, targetBox.y + 5, { steps: 10 });
await page.mouse.up();
```

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/tests/e2e/kanban-drag.spec.js
git commit -m "test(e2e): tasks kanban drag preserves priority and reorders by position"
```

---

## Phase 9 — Frontend: Leads (REMOVE priority-as-position)

### Task 9a: Sort `renderLeadsKanban` by position + replace `onLeadDrop` priority logic

**Files:**
- Modify: `nbi_project_dashboard.html` (`renderLeadsKanban` at lines ~10763-10850, `onLeadDrop` at ~10854-10890)

- [ ] **Step 1: In `renderLeadsKanban`, replace the priority sort with a position sort**

Find the line:

```js
const stageLeads = leads.filter(l => l.stage_id === stage.id).sort((a,b) => (a.priority||99) - (b.priority||99));
```

Replace with:

```js
const stageLeads = leads.filter(l => l.stage_id === stage.id)
  .sort((a, b) => (a.position || 0) - (b.position || 0));
```

- [ ] **Step 2: In `onLeadDrop`, remove the priority assignment**

Find:

```js
// Determine new priority: assign P1 to top, incrementing down
const newPriority = Math.max(1, Math.min(5, dropIdx + 1));

const patch = { priority: newPriority };
if (stageId !== _leadsDragStage) patch.stage_id = stageId;
```

Replace with:

```js
// Drop index is the new position in the target stage.
// Priority (P1-P5) is the client need indicator and is unchanged by drag.
const patch = { position: dropIdx };
if (stageId !== _leadsDragStage) patch.stage_id = stageId;
```

The rest of the handler (the `authFetch` call, the refetch) stays the same. The PATCH body is now `{ position }` or `{ stage_id, position }`.

- [ ] **Step 3: Run smoke spec for regression**

```bash
npm run test:e2e -- tests/e2e/smoke.spec.js
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): leads kanban sorts by position; drag no longer overwrites priority"
```

---

### Task 9b: Playwright spec for leads kanban drag

**Files:**
- Modify: `dashboard-server/tests/e2e/kanban-drag.spec.js`

- [ ] **Step 1: Append a leads describe block**

```js
test.describe('Leads kanban drag', () => {
  test('drag within a stage reorders by position, leaves priority untouched', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    const stage = await createTestLeadStage({ name: 'Active' });
    try {
      await pool.query(
        `INSERT INTO leads (title, stage_id, priority, currency, position, created_by)
         VALUES ('Top lead',    $1, 1, 'GBP', 0, 'test'),
                ('Middle lead', $1, 2, 'GBP', 1, 'test'),
                ('Bottom lead', $1, 3, 'GBP', 2, 'test')`,
        [stage.id]
      );

      await loginAs(page, user.username, user.raw_password);
      await page.locator('button').filter({ hasText: /^Leads/ }).first().click();
      await page.waitForSelector('.leads-kanban__card');

      const cards = page.locator('.leads-kanban__card');
      await expect(cards).toHaveCount(3);

      const bottom = page.locator('.leads-kanban__card', { hasText: 'Bottom lead' });
      const top = page.locator('.leads-kanban__card', { hasText: 'Top lead' });

      const patchPromise = page.waitForResponse(resp =>
        resp.url().includes('/api/leads/') && resp.request().method() === 'PATCH'
      );
      await bottom.dragTo(top);
      await patchPromise;

      const { rows } = await pool.query(
        `SELECT title, position, priority FROM leads WHERE stage_id = $1 ORDER BY position`,
        [stage.id]
      );
      expect(rows.map(r => r.title)).toEqual(['Bottom lead', 'Top lead', 'Middle lead']);
      // Priorities preserved
      expect(rows.find(r => r.title === 'Bottom lead').priority).toBe(3);
      expect(rows.find(r => r.title === 'Top lead').priority).toBe(1);
    } finally {
      await pool.query('DELETE FROM leads WHERE stage_id = $1', [stage.id]);
      await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
    }
  });
});
```

- [ ] **Step 2: Run**

```bash
npm run test:e2e -- tests/e2e/kanban-drag.spec.js
```

Expected: all kanban-drag specs pass.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/tests/e2e/kanban-drag.spec.js
git commit -m "test(e2e): leads kanban drag preserves priority and reorders by position"
```

---

## Phase 10 — Frontend: Hiring (ADD intra-column drop)

The Hiring board already has cross-column drag (via `updateCandidateField('stage', newStage)`). We extend it to support intra-column reorder by computing a drop position and including it in the PATCH.

### Task 10a: Sort hiring kanban by position + extend `onHiringLaneDrop`

**Files:**
- Modify: `nbi_project_dashboard.html` (`renderHiringView` Kanban branch at lines ~13375+, `onHiringLaneDrop` at ~13355-13371)

- [ ] **Step 1: Sort hiring lane candidates by position**

Find the loop that filters candidates per stage in `renderHiringView`:

```js
HIRING_STAGES.forEach(stage => {
  const stageCandidates = filtered.filter(c => c.stage === stage);
```

Replace with:

```js
HIRING_STAGES.forEach(stage => {
  const stageCandidates = filtered.filter(c => c.stage === stage)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
```

- [ ] **Step 2: Replace `onHiringLaneDrop` with a position-aware version**

Find:

```js
async function onHiringLaneDrop(ev, newStage) {
  ev.preventDefault();
  const lane = ev.currentTarget.closest('.hiring-lane');
  if (lane) lane.classList.remove('drag-over');
  const candidateId = ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : '';
  if (!candidateId) return;
  const candidate = (_candidatesData || []).find(c => c.id === candidateId);
  if (!candidate) { toast('Candidate not found', 'error'); return; }
  if (candidate.stage === newStage) return; // dropped in the same lane
  // Call the existing update path so the server validates and persists
  await updateCandidateField(candidateId, 'stage', newStage);
}
```

Replace with:

```js
async function onHiringLaneDrop(ev, newStage) {
  ev.preventDefault();
  const lane = ev.currentTarget.closest('.hiring-lane');
  if (lane) lane.classList.remove('drag-over');
  const candidateId = ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : '';
  if (!candidateId) return;
  const candidate = (_candidatesData || []).find(c => c.id === candidateId);
  if (!candidate) { toast('Candidate not found', 'error'); return; }

  // Compute drop index against the lane body's visible cards (excluding the dragged one)
  const body = ev.currentTarget;
  const cards = [...body.querySelectorAll('.hiring-card:not(.dragging)')];
  const afterCard = cards.reduce((closest, card) => {
    const box = card.getBoundingClientRect();
    const offset = ev.clientY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, el: card };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, el: null }).el;
  const dropIdx = afterCard ? cards.indexOf(afterCard) : cards.length;

  const patch = { position: dropIdx };
  if (candidate.stage !== newStage) patch.stage = newStage;

  try {
    const res = await authFetch(`/api/candidates/${candidateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast('Failed to move candidate', 'error');
      return;
    }
    if (typeof loadCandidates === 'function') {
      await loadCandidates();
    }
    renderContent();
  } catch (e) {
    console.error('Hiring drop failed', e);
    toast('Failed to move candidate', 'error');
  }
}
```

(`updateCandidateField` is no longer the path — the handler now PATCHes directly with both position and optional stage in one call. The old single-field path remains in use elsewhere in the code where stage is changed via a dropdown; do NOT delete `updateCandidateField`.)

- [ ] **Step 3: Run smoke spec**

```bash
npm run test:e2e -- tests/e2e/smoke.spec.js
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): hiring kanban supports intra-stage drop position"
```

---

### Task 10b: Playwright spec for hiring kanban drag

**Files:**
- Modify: `dashboard-server/tests/e2e/kanban-drag.spec.js`

- [ ] **Step 1: Append a hiring describe block**

```js
test.describe('Hiring kanban drag', () => {
  test('drag within a stage reorders by position', async ({ page }) => {
    await truncate();
    const user = await createTestUser({ role: 'admin' });
    await pool.query(
      `INSERT INTO candidates (name, stage, position)
       VALUES ('Alice', 'sourced', 0),
              ('Bob',   'sourced', 1),
              ('Carol', 'sourced', 2)`
    );

    await loginAs(page, user.username, user.raw_password);
    await page.locator('button').filter({ hasText: /^Hiring/ }).first().click();
    // Switch to Kanban view if not the default
    const kanbanButton = page.locator('button', { hasText: /Kanban/ }).first();
    if (await kanbanButton.count()) await kanbanButton.click();
    await page.waitForSelector('.hiring-card');

    const carol = page.locator('.hiring-card', { hasText: 'Carol' });
    const alice = page.locator('.hiring-card', { hasText: 'Alice' });

    const patchPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/candidates/') && resp.request().method() === 'PATCH'
    );
    await carol.dragTo(alice);
    await patchPromise;

    const { rows } = await pool.query(
      `SELECT name, position FROM candidates WHERE stage = 'sourced' ORDER BY position`
    );
    expect(rows.map(r => r.name)).toEqual(['Carol', 'Alice', 'Bob']);
  });
});
```

- [ ] **Step 2: Run the full E2E suite**

```bash
npm run test:e2e
```

Expected: 7 original tests + 4 new kanban-drag tests = 11 E2E tests pass.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/tests/e2e/kanban-drag.spec.js
git commit -m "test(e2e): hiring kanban drag reorders by position"
```

---

## Phase 11 — Wrap-up

### Task 11a: Run the full test suite end-to-end

- [ ] **Step 1: Run everything**

```bash
cd dashboard-server
npm run test:all
```

Expected: vitest passes (16 original + helpers + migration-021 + kanban-position = ~40 tests), playwright passes (7 original + 4 kanban-drag = 11 tests). Total runtime under 30s + under 5min respectively.

If anything is red, **stop and fix before continuing.** Do not commit failing tests. Do not skip tests with `.skip`.

---

### Task 11b: Manual smoke test against the dev DB (optional but recommended)

The migration runs against the test DB on every `npm test` invocation, but it has not yet been applied to the dev/production database. Before merging, manually apply migration 021 to the dev DB:

- [ ] **Step 1: Apply migration 021 to dev DB**

```bash
cd D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/kanban-drag-reorder/dashboard-server
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard' });
const runMigrations = require('./migrations/runner.js');
runMigrations(pool, (lvl, p, m, d) => console.log(lvl, p, m, d || '')).then(() => pool.end());
"
```

Expected: `Applied migration 021_kanban_position.sql`. (Or, if it has already been run for any reason, `All migrations already applied`.)

- [ ] **Step 2: Verify with psql**

```bash
"/c/Program Files/PostgreSQL/16/bin/psql.exe" -h localhost -U nbiai -d nbi_dashboard -c "SELECT version, name FROM schema_migrations WHERE version = 21;"
```

Expected: one row showing version 21 and name `021_kanban_position.sql`.

- [ ] **Step 3: Spot check the backfill on production data**

```bash
"/c/Program Files/PostgreSQL/16/bin/psql.exe" -h localhost -U nbiai -d nbi_dashboard -c "
SELECT status, COUNT(*) AS rows, MIN(position) AS min_pos, MAX(position) AS max_pos
FROM bug_reports GROUP BY status ORDER BY status;
"
```

Expected: every status has positions 0..count-1 (dense, contiguous).

If the dev DB looks healthy, PM2 doesn't need a restart for this change because no server.js code path is exercised yet — the worktree is on a separate branch and the running PM2 process has the old code.

---

### Task 11c: Write the deliverable note

**Files:**
- Create: `projects/nbi_dashboard/deliverables/2026-04-15-kanban-drag-reorder.md`

- [ ] **Step 1: Write the deliverable**

```markdown
# Deliverable: Kanban drag-to-reorder

**Date:** 2026-04-15
**Spec:** projects/nbi_dashboard/specs/2026-04-15-kanban-drag-reorder-design.md
**Plan:** projects/nbi_dashboard/plans/2026-04-15-kanban-drag-reorder.md
**Decision:** D79 (live_state/decisions.md)
**Branch:** kanban-drag-reorder, merged to master as commit <FILL_IN_AFTER_MERGE>

## What shipped

A `position` integer column on `tasks`, `bug_reports`, `candidates`, and `leads`. Every Kanban column (Tasks board, Bug Tracker, Hiring, Leads) now sorts cards by `position` ascending, with `position = 0` at the top. Drag-to-reorder works on all four boards. Bug Tracker gained drag support from scratch (it had none before).

## Server behaviour

- POST handlers wrap their INSERT in a transaction, call `shiftForInsert(client, table, groupCol, groupVal)` to push existing rows in the target column down by 1, and then INSERT with `position = 0`. New cards always land at the top of their column.
- PATCH handlers detect a `position` field, a status/stage change, or both, and route through `reorderInGroup(client, table, groupCol, rowId, newGroup, newPos)`. The helper handles intra-column shifts (move up or down), cross-column shifts (close gap in old, open slot in new), same-position no-ops, and end-of-column clamping.
- A status/stage change without an explicit position defaults to `position = 0` (the card lands at the top of its new column). This matches the spec's "any status change is effectively 'this card just joined this column' from a queue perspective" rule.
- Both helpers live in `dashboard-server/server.js` near the existing `buildPatchQuery` helper. Table and column names are validated against a `POSITION_TABLES` whitelist to prevent SQL injection.

## Frontend behaviour

- All four Kanban renderers sort by `position` before rendering each lane.
- Bug Tracker cards are now `<div role="button">` with `draggable="true"` instead of `<button>`. New drag handlers (`onBugCardDragStart`, `onBugLaneDragOver`, etc.) compute the drop index and PATCH the server with `{ position }` (and `status` if cross-lane).
- Tasks Kanban: removed the `priorityMap = ['Critical ACT', 'Urgent', 'High', 'Medium', 'Low']` block in `onBoardDrop`. The drag now sets `position`, never `priority`. The `priority` enum stays as the "client need" classification.
- Leads Kanban: removed the `priority = dropIdx + 1` assignment in `onLeadDrop`. Same fix.
- Hiring Kanban: extended the existing `onHiringLaneDrop` (which previously delegated to `updateCandidateField('stage', newStage)`) with a drop-index calculation, and PATCHes with both `position` and `stage` in a single call.

## Tests

- **Unit (vitest):** `tests/unit/kanban-position.test.mjs` exercises both helpers in isolation and integration tests every POST + PATCH endpoint for all four tables. `tests/unit/migration-021.test.mjs` asserts the schema, indexes, and backfill ordering. <COUNT> total tests, runtime under 10s.
- **E2E (Playwright):** `tests/e2e/kanban-drag.spec.js` covers drag-and-drop for all four boards via the real browser, asserting both the DOM order and the DB state after each drop. 4 tests, runtime under 30s.
- Full suite (`npm run test:all`) is green at <NUM> tests in <SECS>s.

## Migration

- File: `dashboard-server/migrations/021_kanban_position.sql`
- Idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- Applied to dev DB on 2026-04-15. Production DB will pick it up automatically on the next PM2 restart (the runner is wired into `init-db.js`).
- Backfill row counts (from dev): <FILL IN FROM Step 11b QUERY>.

## Gotchas / notes for future work

- `lead_pipeline_stages` is NOT in the test truncate list. Tests that create stages must clean them up themselves (the new fixtures do this in `try`/`finally`).
- The `tasks` cascade-status block (parent → children) and the `tasks` repeat-task clone block were preserved as-is. Both run AFTER the reorder transaction commits, outside it.
- The express-rate-limit IPv6 deprecation warning at `server.js:324` is still pre-existing — flagged for a separate follow-up.
- If you ever need to migrate to fractional ranks (LexoRank-style), the helper interface (`reorderInGroup`) doesn't change — only its body does.
```

- [ ] **Step 2: Fill in the placeholders**

The placeholders marked with `<...>` need real values. Get them from:

- `<FILL_IN_AFTER_MERGE>` — fill in after Step 11d
- `<COUNT>` — count `it(...)` calls in `kanban-position.test.mjs`
- `<NUM>` and `<SECS>` — last run of `npm run test:all`
- `<FILL IN FROM Step 11b QUERY>` — the row counts from the spot check

- [ ] **Step 3: Commit**

```bash
git add projects/nbi_dashboard/deliverables/2026-04-15-kanban-drag-reorder.md
git commit -m "docs: kanban drag-to-reorder deliverable note"
```

---

### Task 11d: Update live state and merge to master

**Files:**
- Modify: `projects/nbi_dashboard/live_state/decisions.md`
- Modify: `projects/nbi_dashboard/live_state/work_completed.md`

- [ ] **Step 1: Append to `decisions.md`**

Find the entry for D79 (probably the most recent one) and add a status line:

```markdown
**Status:** Implemented 2026-04-15 (commit <FILL_IN_AFTER_MERGE>, branch kanban-drag-reorder).
```

- [ ] **Step 2: Append to `work_completed.md`**

```markdown
## 2026-04-15 — Kanban drag-to-reorder (D79)

- Migration 021 adds `position` column + index + backfill on `tasks`, `bug_reports`, `candidates`, `leads`.
- Server: `shiftForInsert` and `reorderInGroup` helpers in `server.js`. All 8 POST/PATCH handlers transactional.
- Frontend: Bug Tracker gains drag support; Tasks/Leads no longer abuse `priority` as a position proxy; Hiring extended with intra-stage drop position.
- Tests: kanban-position.test.mjs (unit/integration), migration-021.test.mjs, kanban-drag.spec.js (Playwright). All green.
- Deliverable: projects/nbi_dashboard/deliverables/2026-04-15-kanban-drag-reorder.md
- Merged to master as commit <FILL_IN_AFTER_MERGE>
```

- [ ] **Step 3: Commit live state**

```bash
git add projects/nbi_dashboard/live_state/decisions.md projects/nbi_dashboard/live_state/work_completed.md
git commit -m "live_state: D79 implemented — kanban drag-to-reorder"
```

- [ ] **Step 4: Run the full suite ONE more time before merging**

```bash
cd dashboard-server
npm run test:all
```

Expected: green.

- [ ] **Step 5: Merge to master with `--no-ff`**

```bash
cd D:/OneDrive/Claude_code/NBIAI_TEAM
git checkout master
git merge --no-ff kanban-drag-reorder -m "Merge kanban-drag-reorder: position column + drag-to-reorder on all four boards"
```

Capture the merge commit hash from `git log -1 --pretty=%H` and back-fill the deliverable note + decisions.md + work_completed.md with it. Amend or follow-up commit, your choice — but the placeholders need to become real values before the worktree is removed.

- [ ] **Step 6: Remove the worktree and delete the branch**

```bash
git worktree remove .claude/worktrees/kanban-drag-reorder
git branch -d kanban-drag-reorder
```

- [ ] **Step 7: Verify master is healthy**

```bash
cd dashboard-server
npm run test:all
```

Expected: green from the main checkout.

- [ ] **Step 8: Done.**

The Kanban drag-to-reorder feature is live on master. The dev DB has the migration applied. PM2 still runs the old server.js — restart it (`pm2 restart nbi-dashboard`) only when you're ready to deploy the new behaviour to the running instance. Save the PM2 dump after restart.

---

## Self-review notes

**Spec coverage:**
- Section 2 (user-facing behaviour): all rules covered — sort by position, drag inside / across columns, clamp past end, new cards at 0, status change → 0, shared order via API, filters work via existing render → drop is computed against rendered cards (the bug tracker doesn't filter the kanban, leads/tasks/hiring filter the rendered list, so the drop index naturally targets the rendered column even when filters are active).
- Section 3 (data model): migration 021 covers all four tables + indexes + backfill.
- Section 4 (storage model): `reorderInGroup` is the dense-integer renumber.
- Section 5 (API): PATCH handlers route status/position through the helper; POST handlers shift then insert at 0; status-without-position defaults to 0.
- Section 6 (frontend): all four boards covered with sort + drag + drop position calculation.
- Section 7 (edge cases): drop past end → clamped by `reorderInGroup`. Same position → no-op. Cross-column → handled. Status-via-form → `position = 0` default in PATCH branch.
- Section 9 (rollout sequence): the spec's W1/W2/W3/W4 are realised as Phases 1, 3-6, 7-10, 11. The order is migration → server → frontend → docs, same as the spec.
- Section 10 (testing plan): every numbered test in the spec maps to at least one task here, plus we have automated coverage instead of manual psql checks.

**Placeholder check:** The deliverable note has placeholders marked with `<...>` that the engineer fills in at the end. Every step in the implementation tasks contains real code, real commands, real expected output. No "TBD" / "implement later" / "add error handling" left behind.

**Type / signature consistency:**
- `shiftForInsert(client, table, groupCol, groupVal)` — same signature in helper, in tests, in all 4 POST callers.
- `reorderInGroup(client, table, groupCol, rowId, newGroup, newPos)` — same signature in helper, tests, and all 4 PATCH callers.
- `POSITION_TABLES` whitelist is the single source of truth for table+column validity.
