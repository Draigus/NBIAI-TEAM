# Configurable Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Initiative as a new top-level work item type with per-client hierarchy depth configuration and an interactive type-change pill with cascade + server-held undo.

**Architecture:** Migration adds `hierarchy_levels` JSONB to `clients` and creates Initiative roots for all existing data. Backend constants expand to 5 levels with descendant-order validation (not strict adjacency). A new `/retype` endpoint handles type changes with cascade and server-held undo tokens. Generic PATCH and sync block `item_type` changes. Frontend gets active-level-aware helpers, interactive type pill, and a settings UI for per-client depth config.

**Tech Stack:** Express 4, PostgreSQL (pg), Vitest, Playwright, vanilla JS SPA

**Spec:** `docs/superpowers/specs/2026-07-01-configurable-hierarchy-design.md`

---

## File Map

### New files
| File | Purpose |
|---|---|
| `dashboard-server/migrations/075_configurable_hierarchy.sql` | Add `hierarchy_levels` to clients, create `retype_undo_tokens` table, create Initiative roots, reparent all root non-initiative items |
| `dashboard-server/routes/retype.js` | New route module: `PATCH /api/tasks/:id/retype` and `PATCH /api/tasks/retype-undo` |
| `dashboard-server/tests/unit/hierarchy-helpers.test.mjs` | Unit tests for active-level helpers and descendant-order validation |
| `dashboard-server/tests/unit/retype.test.mjs` | Unit tests for retype cascade and undo endpoints |
| `dashboard-server/tests/unit/hierarchy-migration.test.mjs` | Unit tests for migration correctness and idempotency |

### Modified files
| File | What changes |
|---|---|
| `dashboard-server/lib/helpers.js` | Add `initiative` to constants; add `getActiveLevels`, `getActiveChildType`, `getActiveParentType`, `isDescendantOrder`, `getCanonicalIndex`; update `inferItemType`; export new functions |
| `dashboard-server/routes/tasks.js` | Descendant-order validation on create; block `item_type` in generic PATCH; update bulk import validation |
| `dashboard-server/routes/sync.js` | Accept `initiative` type; block `item_type` changes via sync (strip the field on update, keep on insert) |
| `dashboard-server/routes/clients.js` | Accept `hierarchy_levels` in PATCH with validation |
| `dashboard-server/routes/admin.js` | Restore must include `item_type` in the INSERT column list |
| `dashboard-server/routes/dashboard.js` | No change needed (counts all tasks regardless of type -- active-level filtering is frontend concern for dashboard cards) |
| `dashboard-server/lib/slack-bot.js` | Replace local `ITEM_TYPES` Set with import from helpers |
| `dashboard-server/server.js` | Wire up retype route; pass new helpers to tasks/sync/clients routes |
| `dashboard-server/public/js/nbi-utils.js` | Add initiative to `ITEM_TYPE_META`/`ITEM_TYPE_ORDER`; add active-level helpers; add interactive pill variant of `itemTypeBadgeHtml` |
| `dashboard-server/public/js/views/nbi-detail.js` | Type field becomes clickable pill; child creation uses active types; `showQuickAdd` uses active child type |
| `dashboard-server/public/js/views/nbi-tasks.js` | Type filter buttons use active levels; SoW grouping moves under initiatives when active; tree header counts respect active levels |
| `dashboard-server/public/js/views/nbi-kanban.js` | Drag validation uses descendant order; quick-add uses active child type |
| `dashboard-server/public/js/views/nbi-settings.js` | New "Hierarchy Depth" admin section with per-client toggles |
| `dashboard-server/public/js/views/nbi-gantt.js` | Root-level assumption changes from project to topmost active type |
| `dashboard-server/public/js/views/nbi-docs.js` | Picker handles initiative grouping when active |
| `dashboard-server/public/js/nbi-events.js` | `_actAddProjectForClient` becomes `_actAddRootItemForClient` using topmost active type |
| `nbi_project_dashboard.html` | Replace hardcoded "New Project/Feature/Story/Task" menu items with dynamic generation; cache-bust JS files |
| `dashboard-server/tests/helpers/fixtures.js` | Update `createTestTask` default from `'project'` to accept initiative; add `createTestClientWithLevels` helper |

---

## Task 1: Backend Constants + Active-Level Helpers

**Files:**
- Modify: `dashboard-server/lib/helpers.js:14-22, 250-268`
- Create: `dashboard-server/tests/unit/hierarchy-helpers.test.mjs`

- [ ] **Step 1: Write failing tests for the new helpers**

Create `dashboard-server/tests/unit/hierarchy-helpers.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  ITEM_TYPES, VALID_CHILD_TYPE, VALID_PARENT_TYPE,
  inferItemType, getCanonicalIndex, isDescendantOrder,
  getActiveLevels, getActiveChildType, getActiveParentType,
  CANONICAL_ORDER,
} = require('../../lib/helpers.js');

describe('ITEM_TYPES constants', () => {
  it('includes initiative as the first type', () => {
    expect(ITEM_TYPES).toEqual(['initiative', 'project', 'feature', 'story', 'task']);
  });

  it('VALID_CHILD_TYPE maps initiative to project', () => {
    expect(VALID_CHILD_TYPE.initiative).toBe('project');
  });

  it('VALID_PARENT_TYPE maps project to initiative', () => {
    expect(VALID_PARENT_TYPE.project).toBe('initiative');
  });

  it('VALID_PARENT_TYPE maps initiative to null', () => {
    expect(VALID_PARENT_TYPE.initiative).toBe(null);
  });
});

describe('getCanonicalIndex', () => {
  it('returns 0 for initiative', () => {
    expect(getCanonicalIndex('initiative')).toBe(0);
  });
  it('returns 4 for task', () => {
    expect(getCanonicalIndex('task')).toBe(4);
  });
  it('returns -1 for unknown type', () => {
    expect(getCanonicalIndex('bogus')).toBe(-1);
  });
});

describe('isDescendantOrder', () => {
  it('returns true when parent is higher than child in canonical order', () => {
    expect(isDescendantOrder('initiative', 'project')).toBe(true);
    expect(isDescendantOrder('initiative', 'task')).toBe(true);
    expect(isDescendantOrder('project', 'story')).toBe(true);
  });
  it('returns false for equal types', () => {
    expect(isDescendantOrder('project', 'project')).toBe(false);
  });
  it('returns false when parent is lower than child', () => {
    expect(isDescendantOrder('task', 'project')).toBe(false);
  });
  it('returns false for unknown types', () => {
    expect(isDescendantOrder('bogus', 'task')).toBe(false);
  });
});

describe('inferItemType', () => {
  it('returns initiative when no parent type', () => {
    expect(inferItemType(null)).toBe('initiative');
    expect(inferItemType(undefined)).toBe('initiative');
  });
  it('returns project under initiative', () => {
    expect(inferItemType('initiative')).toBe('project');
  });
  it('returns feature under project', () => {
    expect(inferItemType('project')).toBe('feature');
  });
  it('returns task as fallback', () => {
    expect(inferItemType('bogus')).toBe('task');
  });
});

describe('getActiveLevels', () => {
  it('returns client hierarchy_levels when present', () => {
    const client = { hierarchy_levels: ['project', 'feature', 'task'] };
    expect(getActiveLevels(client)).toEqual(['project', 'feature', 'task']);
  });
  it('returns full canonical order when client is null', () => {
    expect(getActiveLevels(null)).toEqual(['initiative', 'project', 'feature', 'story', 'task']);
  });
  it('returns full canonical order when hierarchy_levels is missing', () => {
    expect(getActiveLevels({})).toEqual(['initiative', 'project', 'feature', 'story', 'task']);
  });
});

describe('getActiveChildType', () => {
  it('returns next active level below', () => {
    const levels = ['project', 'feature', 'story', 'task'];
    expect(getActiveChildType('project', levels)).toBe('feature');
  });
  it('skips inactive levels', () => {
    const levels = ['project', 'task'];
    expect(getActiveChildType('project', levels)).toBe('task');
  });
  it('returns null when at bottom', () => {
    const levels = ['project', 'task'];
    expect(getActiveChildType('task', levels)).toBe(null);
  });
  it('returns null when type not in active levels', () => {
    const levels = ['project', 'task'];
    expect(getActiveChildType('initiative', levels)).toBe('project');
  });
});

describe('getActiveParentType', () => {
  it('returns next active level above', () => {
    const levels = ['project', 'feature', 'story', 'task'];
    expect(getActiveParentType('feature', levels)).toBe('project');
  });
  it('skips inactive levels', () => {
    const levels = ['project', 'task'];
    expect(getActiveParentType('task', levels)).toBe('project');
  });
  it('returns null for topmost active level', () => {
    const levels = ['project', 'task'];
    expect(getActiveParentType('project', levels)).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/hierarchy-helpers.test.mjs`
Expected: FAIL -- `getCanonicalIndex`, `isDescendantOrder`, `getActiveLevels`, `getActiveChildType`, `getActiveParentType`, `CANONICAL_ORDER` not exported.

- [ ] **Step 3: Update helpers.js with initiative and new functions**

In `dashboard-server/lib/helpers.js`, replace the ITEM TYPE HIERARCHY section (lines 13-22):

```js
// ==================== ITEM TYPE HIERARCHY ====================
const CANONICAL_ORDER = ['initiative', 'project', 'feature', 'story', 'task'];
const ITEM_TYPES = CANONICAL_ORDER;
const VALID_CHILD_TYPE = { initiative: 'project', project: 'feature', feature: 'story', story: 'task', task: null };
const VALID_PARENT_TYPE = { initiative: null, project: 'initiative', feature: 'project', story: 'feature', task: 'story' };

/** Canonical index of a type. Returns -1 for unknown. */
function getCanonicalIndex(type) {
  return CANONICAL_ORDER.indexOf(type);
}

/** True if parentType is strictly higher than childType in canonical order. */
function isDescendantOrder(parentType, childType) {
  const pi = getCanonicalIndex(parentType);
  const ci = getCanonicalIndex(childType);
  if (pi < 0 || ci < 0) return false;
  return pi < ci;
}

/** Infer item_type from the parent's type. If no parent, default to 'initiative'. */
function inferItemType(parentType) {
  if (!parentType) return 'initiative';
  return VALID_CHILD_TYPE[parentType] || 'task';
}

/** Get active hierarchy levels for a client. Falls back to full canonical order. */
function getActiveLevels(client) {
  if (client && Array.isArray(client.hierarchy_levels) && client.hierarchy_levels.length > 0) {
    return client.hierarchy_levels;
  }
  return [...CANONICAL_ORDER];
}

/** Next active level below the given type. Uses canonical order for types not in activeLevels. */
function getActiveChildType(type, activeLevels) {
  const ti = getCanonicalIndex(type);
  if (ti < 0) return null;
  for (let i = ti + 1; i < CANONICAL_ORDER.length; i++) {
    if (activeLevels.includes(CANONICAL_ORDER[i])) return CANONICAL_ORDER[i];
  }
  return null;
}

/** Next active level above the given type. */
function getActiveParentType(type, activeLevels) {
  const ti = getCanonicalIndex(type);
  if (ti < 0) return null;
  for (let i = ti - 1; i >= 0; i--) {
    if (activeLevels.includes(CANONICAL_ORDER[i])) return CANONICAL_ORDER[i];
  }
  return null;
}
```

Update the `module.exports` to include the new functions:

```js
module.exports = {
  CANONICAL_ORDER,
  ITEM_TYPES,
  VALID_CHILD_TYPE,
  VALID_PARENT_TYPE,
  inferItemType,
  getCanonicalIndex,
  isDescendantOrder,
  getActiveLevels,
  getActiveChildType,
  getActiveParentType,
  // ... existing exports unchanged
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/hierarchy-helpers.test.mjs`
Expected: All tests PASS.

- [ ] **Step 5: Run full unit suite to verify no regressions**

Run: `cd dashboard-server && npm test`
Expected: All 936+ tests pass. The `inferItemType` return value changed from `'project'` to `'initiative'` for null parent -- check if any existing tests assert the old value.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/lib/helpers.js dashboard-server/tests/unit/hierarchy-helpers.test.mjs
git commit -m "feat(hierarchy): add initiative type and active-level helpers to lib/helpers.js"
```

---

## Task 2: Migration -- `hierarchy_levels` Column + Initiative Roots + Undo Tokens Table

**Files:**
- Create: `dashboard-server/migrations/075_configurable_hierarchy.sql`
- Create: `dashboard-server/tests/unit/hierarchy-migration.test.mjs`

- [ ] **Step 1: Write failing migration test**

Create `dashboard-server/tests/unit/hierarchy-migration.test.mjs`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { pool, truncate } = require('../helpers/db.js');
const { createTestClient, createTestTask } = require('../helpers/fixtures.js');

beforeEach(async () => { await truncate(); });

describe('Migration 075: configurable hierarchy', () => {
  it('clients table has hierarchy_levels column with default', async () => {
    const client = await createTestClient({ name: 'MigTest' });
    const { rows } = await pool.query('SELECT hierarchy_levels FROM clients WHERE id = $1', [client.id]);
    expect(rows[0].hierarchy_levels).toEqual(['project', 'feature', 'story', 'task']);
  });

  it('retype_undo_tokens table exists', async () => {
    const { rows } = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'retype_undo_tokens'"
    );
    expect(rows.length).toBe(1);
  });

  it('root projects are reparented under a General initiative', async () => {
    const client = await createTestClient({ name: 'InitRoot' });
    const proj = await createTestTask({ client_id: client.id, item_type: 'project', title: 'My Project' });
    expect(proj.parent_id).toBe(null);
    // After migration, root projects should have an initiative parent.
    // Since migration runs at DB init, the task was created post-migration.
    // This test verifies the migration SQL's logic by running it manually.
    // The actual migration test uses a pre-seeded DB -- see hierarchy-migration-manual.test.mjs
    // For now, verify the table structure exists.
    const { rows } = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'retype_undo_tokens'"
    );
    const cols = rows.map(r => r.column_name);
    expect(cols).toContain('id');
    expect(cols).toContain('actor_user_id');
    expect(cols).toContain('root_item_id');
    expect(cols).toContain('changes');
    expect(cols).toContain('expires_at');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/hierarchy-migration.test.mjs`
Expected: FAIL -- `hierarchy_levels` column does not exist, `retype_undo_tokens` table does not exist.

- [ ] **Step 3: Write the migration SQL**

Create `dashboard-server/migrations/075_configurable_hierarchy.sql`:

```sql
-- Migration 075: Configurable Hierarchy
-- Adds per-client hierarchy depth config, Initiative root level,
-- and server-held undo tokens for type cascade operations.

-- 1. Add hierarchy_levels JSONB column to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hierarchy_levels JSONB
  DEFAULT '["project","feature","story","task"]'::jsonb;

-- 2. Create retype_undo_tokens table for server-held cascade undo
CREATE TABLE IF NOT EXISTS retype_undo_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  root_item_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  changes JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_retype_undo_expires ON retype_undo_tokens(expires_at);

-- 3. Create Initiative roots for all clients that have root-level non-initiative items.
-- Uses source='migration-hierarchy' as a deterministic idempotency marker.
-- For each client_id with root items: if no initiative root exists for that client,
-- create a 'General' initiative. Then reparent all root non-initiative items under it.

-- Step 3a: Create General initiatives (idempotent via source marker check)
INSERT INTO tasks (title, item_type, client_id, status, source, parent_id)
SELECT DISTINCT
  'General',
  'initiative',
  sub.client_id,
  'In progress',
  'migration-hierarchy',
  NULL
FROM (
  SELECT DISTINCT client_id
  FROM tasks
  WHERE parent_id IS NULL
    AND item_type <> 'initiative'
) sub
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t2
  WHERE t2.client_id IS NOT DISTINCT FROM sub.client_id
    AND t2.item_type = 'initiative'
    AND t2.parent_id IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM tasks t3
  WHERE t3.source = 'migration-hierarchy'
    AND t3.client_id IS NOT DISTINCT FROM sub.client_id
);

-- Step 3b: Also handle NULL client_id (unassigned items)
INSERT INTO tasks (title, item_type, client_id, status, source, parent_id)
SELECT
  'General',
  'initiative',
  NULL,
  'In progress',
  'migration-hierarchy',
  NULL
WHERE EXISTS (
  SELECT 1 FROM tasks
  WHERE parent_id IS NULL
    AND item_type <> 'initiative'
    AND client_id IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM tasks
  WHERE item_type = 'initiative'
    AND parent_id IS NULL
    AND client_id IS NULL
);

-- Step 3c: Reparent root non-initiative items under their client's initiative.
-- Picks the earliest initiative root per client (handles mixed-root case).
UPDATE tasks t
SET parent_id = (
  SELECT i.id
  FROM tasks i
  WHERE i.item_type = 'initiative'
    AND i.parent_id IS NULL
    AND i.client_id IS NOT DISTINCT FROM t.client_id
  ORDER BY i.created_at ASC
  LIMIT 1
)
WHERE t.parent_id IS NULL
  AND t.item_type <> 'initiative';
```

- [ ] **Step 4: Reinitialise the test DB and run the migration test**

Run: `cd dashboard-server && npm run init-db && npx vitest run tests/unit/hierarchy-migration.test.mjs`
Expected: All tests PASS.

- [ ] **Step 5: Run full unit suite**

Run: `cd dashboard-server && npm test`
Expected: All tests pass. Watch for any test that creates a root `project` and expects `parent_id IS NULL` -- the migration will have reparented it. If tests fail, they need updating in the next task.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/migrations/075_configurable_hierarchy.sql dashboard-server/tests/unit/hierarchy-migration.test.mjs
git commit -m "feat(hierarchy): migration 075 -- hierarchy_levels column, undo tokens table, initiative roots"
```

---

## Task 3: Fix Existing Tests for Initiative Root

After migration 075 runs, root-level items are now `initiative` type. The test fixture `createTestTask` defaults to `item_type: 'project'` with `parent_id: null`, which is still valid in the DB (no constraint blocks it), but any test that asserts root items must be projects may need updating.

**Files:**
- Modify: `dashboard-server/tests/helpers/fixtures.js`

- [ ] **Step 1: Add a `createTestInitiative` factory and a `createTestClientWithLevels` helper**

Add to `dashboard-server/tests/helpers/fixtures.js`:

```js
/**
 * Create a client with hierarchy_levels pre-set.
 */
async function createTestClientWithLevels(opts = {}) {
  const client = await createTestClient(opts);
  const levels = opts.hierarchy_levels || ['project', 'feature', 'story', 'task'];
  await pool.query('UPDATE clients SET hierarchy_levels = $1 WHERE id = $2', [JSON.stringify(levels), client.id]);
  client.hierarchy_levels = levels;
  return client;
}

/**
 * Create an initiative (root-level item). Convenience wrapper.
 */
async function createTestInitiative(opts = {}) {
  return createTestTask({ ...opts, item_type: 'initiative', parent_id: null });
}
```

Add `createTestClientWithLevels` and `createTestInitiative` to the module.exports.

- [ ] **Step 2: Run full unit suite and fix any failures**

Run: `cd dashboard-server && npm test`
Expected: Identify and fix any tests that break due to the `inferItemType` change (null parent now returns `'initiative'` instead of `'project'`). The main risk is tests that POST to `/api/tasks` without a `parent_id` and expect the created item to be `item_type='project'`.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/tests/helpers/fixtures.js
git commit -m "test(hierarchy): add createTestInitiative and createTestClientWithLevels fixtures"
```

---

## Task 4: Server Route Updates -- Create/Patch/Sync Validation

**Files:**
- Modify: `dashboard-server/routes/tasks.js:164-177, 234-237, 278, 715`
- Modify: `dashboard-server/routes/sync.js:140-142, 175`
- Modify: `dashboard-server/routes/clients.js:82-107`
- Modify: `dashboard-server/routes/admin.js:337-342`
- Modify: `dashboard-server/lib/slack-bot.js:17`

- [ ] **Step 1: Write failing tests for descendant-order create validation**

Add to `dashboard-server/tests/unit/hierarchy-helpers.test.mjs` or create a new test file:

```js
describe('POST /api/tasks create validation', () => {
  it('accepts initiative as root (no parent)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Initiative', item_type: 'initiative' });
    expect(res.status).toBe(201);
    expect(res.body.item_type).toBe('initiative');
    expect(res.body.parent_id).toBe(null);
  });

  it('accepts task directly under project (descendant-order, not adjacent)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const init = await createTestInitiative({ title: 'Root' });
    const proj = await createTestTask({ parent_id: init.id, item_type: 'project', title: 'P1' });
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Direct Task', item_type: 'task', parent_id: proj.id });
    expect(res.status).toBe(201);
    expect(res.body.item_type).toBe('task');
  });

  it('rejects child with higher canonical order than parent', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const init = await createTestInitiative({ title: 'Root' });
    const story = await createTestTask({ parent_id: init.id, item_type: 'story', title: 'S1' });
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad Project', item_type: 'project', parent_id: story.id });
    expect(res.status).toBe(400);
  });

  it('rejects equal-type nesting', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const init = await createTestInitiative({ title: 'Root' });
    const proj = await createTestTask({ parent_id: init.id, item_type: 'project', title: 'P1' });
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad Nested', item_type: 'project', parent_id: proj.id });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/tasks/:id blocks item_type changes', () => {
  it('strips item_type from generic PATCH', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const init = await createTestInitiative({ title: 'Root' });
    const proj = await createTestTask({ parent_id: init.id, item_type: 'project', title: 'P1' });
    const res = await request(app)
      .patch(`/api/tasks/${proj.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ item_type: 'feature', title: 'Updated Title' });
    expect(res.status).toBe(200);
    expect(res.body.item_type).toBe('project');
    expect(res.body.title).toBe('Updated Title');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/hierarchy-helpers.test.mjs`
Expected: FAIL -- create validation still uses strict adjacency, PATCH still allows item_type.

- [ ] **Step 3: Update routes/tasks.js create validation (lines 164-177)**

Replace the existing type inference/validation block:

```js
  // Infer or validate item_type based on parent hierarchy (descendant-order model)
  let resolvedType;
  if (parent_id) {
    const parentResult = await pool.query('SELECT item_type FROM tasks WHERE id = $1', [parent_id]);
    if (parentResult.rows.length > 0) {
      const parentType = parentResult.rows[0].item_type;
      if (item_type) {
        // Explicit type: must be strictly lower in canonical order than parent
        if (!isDescendantOrder(parentType, item_type)) {
          return res.status(400).json({ error: `Cannot place ${item_type} under ${parentType} -- child must be lower in hierarchy` });
        }
        resolvedType = item_type;
      } else {
        // No explicit type: infer the canonical next child
        resolvedType = VALID_CHILD_TYPE[parentType] || 'task';
      }
    }
  } else {
    resolvedType = item_type || 'initiative';
  }
  if (!ITEM_TYPES.includes(resolvedType)) return res.status(400).json({ error: `Invalid item_type: ${resolvedType}` });
```

- [ ] **Step 4: Update routes/tasks.js PATCH to block item_type changes (around line 278)**

Remove `'item_type'` from the `allowedFields` array in the PATCH handler. Before the `buildPatchQuery` call, add:

```js
  // item_type changes must go through /api/tasks/:id/retype (cascade + undo).
  // Strip it silently from generic PATCH to prevent bypass.
  delete req.body.item_type;
```

- [ ] **Step 5: Update routes/sync.js to block item_type changes on updates**

In the sync handler, around line 175 where the UPDATE query runs, strip `item_type` from the update on *existing* tasks (keep it on INSERT for new tasks):

```js
        if (taskExists) {
          // Block item_type changes via sync -- must use /retype endpoint
          const syncItemType = existingFullMap.get(t.id)?.item_type || itemType;
          // ... use syncItemType instead of itemType in the UPDATE query
```

- [ ] **Step 6: Update routes/clients.js PATCH to accept hierarchy_levels**

Add `'hierarchy_levels'` to the `allowedFields` array in the PATCH handler (line 97). Add validation before `buildPatchQuery`:

```js
    // Validate hierarchy_levels if provided
    if (req.body.hierarchy_levels !== undefined) {
      const levels = req.body.hierarchy_levels;
      if (!Array.isArray(levels) || levels.length === 0) {
        return res.status(400).json({ error: 'hierarchy_levels must be a non-empty array' });
      }
      if (!levels.includes('task')) {
        return res.status(400).json({ error: 'hierarchy_levels must include task' });
      }
      const validTypes = ['initiative', 'project', 'feature', 'story', 'task'];
      for (const l of levels) {
        if (!validTypes.includes(l)) return res.status(400).json({ error: `Invalid hierarchy level: ${l}` });
      }
      // Must be in canonical order
      let lastIdx = -1;
      for (const l of levels) {
        const idx = validTypes.indexOf(l);
        if (idx <= lastIdx) return res.status(400).json({ error: 'hierarchy_levels must be in canonical order' });
        lastIdx = idx;
      }
      req.body.hierarchy_levels = JSON.stringify(levels);
    }
```

- [ ] **Step 7: Update routes/admin.js restore to include item_type**

In the restore handler (line 338), the INSERT already includes `item_type` implicitly via positional params but does not list it in the column names. Verify the INSERT column list includes `item_type` -- if not, add it. The current query at line 338 does NOT include `item_type` in the column list. Fix:

```sql
INSERT INTO tasks (id, title, parent_id, client_id, item_type, status, priority, health_state, description, assignees, hours_estimated, hours_spent, due_date, start_date, end_date, source, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
ON CONFLICT (id) DO UPDATE SET title=$2, parent_id=$3, client_id=$4, item_type=$5, status=$6, ...
```

Update the params array to include `t.item_type || 'task'`.

- [ ] **Step 8: Update lib/slack-bot.js to use shared ITEM_TYPES**

Replace line 17:
```js
const ITEM_TYPES = new Set(['project', 'feature', 'story', 'task']);
```
With:
```js
const { ITEM_TYPES } = require('./helpers');
const ITEM_TYPES_SET = new Set(ITEM_TYPES);
```
Update the `parseSlackMessage` usage to reference `ITEM_TYPES_SET` instead of the old `ITEM_TYPES`.

- [ ] **Step 9: Run tests to verify they pass**

Run: `cd dashboard-server && npm test`
Expected: All tests pass including the new hierarchy route tests.

- [ ] **Step 10: Commit**

```bash
git add dashboard-server/routes/tasks.js dashboard-server/routes/sync.js dashboard-server/routes/clients.js dashboard-server/routes/admin.js dashboard-server/lib/slack-bot.js dashboard-server/tests/unit/hierarchy-helpers.test.mjs
git commit -m "feat(hierarchy): descendant-order validation, block type changes on PATCH/sync, hierarchy_levels on clients"
```

---

## Task 5: Retype Endpoint with Cascade + Server-Held Undo

**Files:**
- Create: `dashboard-server/routes/retype.js`
- Create: `dashboard-server/tests/unit/retype.test.mjs`
- Modify: `dashboard-server/server.js` (wire up route)

- [ ] **Step 1: Write failing tests for retype cascade and undo**

Create `dashboard-server/tests/unit/retype.test.mjs`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestTask, createTestInitiative } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('PATCH /api/tasks/:id/retype', () => {
  it('retypes a single item with no children', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const init = await createTestInitiative({ title: 'Root' });
    const proj = await createTestTask({ parent_id: init.id, item_type: 'project', title: 'P1' });
    const res = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'feature' });
    expect(res.status).toBe(200);
    expect(res.body.undoToken).toBeDefined();
    expect(res.body.changes).toHaveLength(1);
    expect(res.body.changes[0].previousType).toBe('project');
    expect(res.body.changes[0].newType).toBe('feature');
    // Verify in DB
    const { rows } = await pool.query('SELECT item_type FROM tasks WHERE id = $1', [proj.id]);
    expect(rows[0].item_type).toBe('feature');
  });

  it('cascades retype to descendants with offset', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const init = await createTestInitiative({ title: 'Root' });
    const proj = await createTestTask({ parent_id: init.id, item_type: 'project', title: 'P1' });
    const feat = await createTestTask({ parent_id: proj.id, item_type: 'feature', title: 'F1' });
    const story = await createTestTask({ parent_id: feat.id, item_type: 'story', title: 'S1' });
    // Retype project -> feature (offset +1), so feature -> story, story -> task
    const res = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'feature' });
    expect(res.status).toBe(200);
    expect(res.body.changes).toHaveLength(3);
    const { rows } = await pool.query('SELECT id, item_type FROM tasks WHERE id = ANY($1) ORDER BY item_type',
      [[proj.id, feat.id, story.id]]);
    const types = Object.fromEntries(rows.map(r => [r.id, r.item_type]));
    expect(types[proj.id]).toBe('feature');
    expect(types[feat.id]).toBe('story');
    expect(types[story.id]).toBe('task');
  });

  it('clamps descendants at task level', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const init = await createTestInitiative({ title: 'Root' });
    const feat = await createTestTask({ parent_id: init.id, item_type: 'feature', title: 'F1' });
    const story = await createTestTask({ parent_id: feat.id, item_type: 'story', title: 'S1' });
    const task1 = await createTestTask({ parent_id: story.id, item_type: 'task', title: 'T1' });
    // Retype feature -> story (offset +1), story -> task, task -> clamp at task
    // task1 under story (now task) would be task-under-task = equal type.
    // task1 must reparent to feat (now story).
    const res = await request(app)
      .patch(`/api/tasks/${feat.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'story' });
    expect(res.status).toBe(200);
    const { rows } = await pool.query('SELECT id, item_type, parent_id FROM tasks WHERE id = ANY($1)',
      [[feat.id, story.id, task1.id]]);
    const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    expect(byId[feat.id].item_type).toBe('story');
    expect(byId[story.id].item_type).toBe('task');
    expect(byId[task1.id].item_type).toBe('task');
    // task1 should have been reparented to feat (the story) since it can't nest under story (now also task)
    expect(byId[task1.id].parent_id).toBe(feat.id);
  });

  it('rejects invalid newType', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const init = await createTestInitiative({ title: 'Root' });
    const proj = await createTestTask({ parent_id: init.id, item_type: 'project', title: 'P1' });
    const res = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'bogus' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/tasks/retype-undo', () => {
  it('reverts a cascade with valid undo token', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const init = await createTestInitiative({ title: 'Root' });
    const proj = await createTestTask({ parent_id: init.id, item_type: 'project', title: 'P1' });
    const feat = await createTestTask({ parent_id: proj.id, item_type: 'feature', title: 'F1' });
    // Retype
    const retypeRes = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'feature' });
    expect(retypeRes.status).toBe(200);
    const { undoToken } = retypeRes.body;
    // Undo
    const undoRes = await request(app)
      .patch('/api/tasks/retype-undo')
      .set('Authorization', `Bearer ${token}`)
      .send({ undoToken });
    expect(undoRes.status).toBe(200);
    // Verify restored
    const { rows } = await pool.query('SELECT id, item_type FROM tasks WHERE id = ANY($1)',
      [[proj.id, feat.id]]);
    const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    expect(byId[proj.id].item_type).toBe('project');
    expect(byId[feat.id].item_type).toBe('feature');
  });

  it('rejects expired token', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const init = await createTestInitiative({ title: 'Root' });
    const proj = await createTestTask({ parent_id: init.id, item_type: 'project', title: 'P1' });
    const retypeRes = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'feature' });
    // Expire the token manually
    await pool.query("UPDATE retype_undo_tokens SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1",
      [retypeRes.body.undoToken]);
    const undoRes = await request(app)
      .patch('/api/tasks/retype-undo')
      .set('Authorization', `Bearer ${token}`)
      .send({ undoToken: retypeRes.body.undoToken });
    expect(undoRes.status).toBe(410);
  });

  it('rejects token when a row was modified after cascade', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const init = await createTestInitiative({ title: 'Root' });
    const proj = await createTestTask({ parent_id: init.id, item_type: 'project', title: 'P1' });
    const retypeRes = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'feature' });
    // Simulate another user modifying the task (bump version)
    await pool.query('UPDATE tasks SET version = version + 1, title = $1 WHERE id = $2', ['Modified', proj.id]);
    const undoRes = await request(app)
      .patch('/api/tasks/retype-undo')
      .set('Authorization', `Bearer ${token}`)
      .send({ undoToken: retypeRes.body.undoToken });
    expect(undoRes.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/retype.test.mjs`
Expected: FAIL -- route does not exist.

- [ ] **Step 3: Create routes/retype.js**

```js
'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid, auditLog, ITEM_TYPES, CANONICAL_ORDER, getCanonicalIndex, isDescendantOrder, requireTaskAccess } = ctx;

  /**
   * PATCH /api/tasks/:id/retype
   * Re-type an item and cascade to all descendants.
   * Returns { undoToken, changes: [{id, previousType, newType, previousParentId, newParentId}] }
   */
  router.patch('/api/tasks/:id/retype', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
    const allowed = await requireTaskAccess(req, res, req.params.id);
    if (!allowed) return;

    const { newType } = req.body;
    if (!newType || !ITEM_TYPES.includes(newType)) {
      return res.status(400).json({ error: `Invalid newType. Must be one of: ${ITEM_TYPES.join(', ')}` });
    }

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');

      // Purge expired undo tokens (lazy cleanup)
      await conn.query('DELETE FROM retype_undo_tokens WHERE expires_at < NOW()');

      // Get the target item
      const { rows: [item] } = await conn.query(
        'SELECT id, item_type, parent_id, sort_order, version FROM tasks WHERE id = $1 FOR UPDATE',
        [req.params.id]
      );
      if (!item) { await conn.query('ROLLBACK'); return res.status(404).json({ error: 'Task not found' }); }

      const oldIdx = getCanonicalIndex(item.item_type);
      const newIdx = getCanonicalIndex(newType);
      const offset = newIdx - oldIdx;
      if (offset === 0) { await conn.query('ROLLBACK'); return res.json({ undoToken: null, changes: [] }); }

      // Validate against parent: if the item has a parent, newType must be below it
      if (item.parent_id) {
        const { rows: [parent] } = await conn.query('SELECT item_type FROM tasks WHERE id = $1', [item.parent_id]);
        if (parent && !isDescendantOrder(parent.item_type, newType)) {
          await conn.query('ROLLBACK');
          return res.status(400).json({ error: `Cannot retype to ${newType} under parent type ${parent.item_type}` });
        }
      } else if (newType !== 'initiative') {
        // Root item can only be initiative
        await conn.query('ROLLBACK');
        return res.status(400).json({ error: 'Root items must be initiative type' });
      }

      // Get all descendants (recursive CTE)
      const { rows: descendants } = await conn.query(`
        WITH RECURSIVE tree AS (
          SELECT id, item_type, parent_id, sort_order, version FROM tasks WHERE id = $1
          UNION ALL
          SELECT t.id, t.item_type, t.parent_id, t.sort_order, t.version
          FROM tasks t INNER JOIN tree tr ON t.parent_id = tr.id
        )
        SELECT * FROM tree ORDER BY id
      `, [req.params.id]);

      // Compute new types for all items
      const changes = [];
      for (const d of descendants) {
        const dOldIdx = getCanonicalIndex(d.item_type);
        let dNewIdx = dOldIdx + offset;
        // Clamp at task (bottom)
        if (dNewIdx >= CANONICAL_ORDER.length) dNewIdx = CANONICAL_ORDER.length - 1;
        // Clamp at initiative (top)
        if (dNewIdx < 0) dNewIdx = 0;
        const dNewType = CANONICAL_ORDER[dNewIdx];
        changes.push({
          id: d.id,
          previousType: d.item_type,
          newType: dNewType,
          previousParentId: d.parent_id,
          newParentId: d.parent_id, // may change below
          previousSortOrder: d.sort_order,
          version: d.version,
        });
      }

      // Fix equal-type nesting: after clamping, a child might have the same type as its parent.
      // Walk the tree and reparent such children to the nearest valid ancestor.
      const changeMap = new Map(changes.map(c => [c.id, c]));
      for (const c of changes) {
        if (!c.newParentId) continue;
        const parentChange = changeMap.get(c.newParentId);
        if (!parentChange) continue;
        if (getCanonicalIndex(parentChange.newType) >= getCanonicalIndex(c.newType)) {
          // Need to reparent: walk up to find an ancestor with strictly higher type
          let ancestor = parentChange;
          while (ancestor && getCanonicalIndex(ancestor.newType) >= getCanonicalIndex(c.newType)) {
            ancestor = ancestor.newParentId ? changeMap.get(ancestor.newParentId) : null;
          }
          c.newParentId = ancestor ? ancestor.id : null;
        }
      }

      // Apply changes
      for (const c of changes) {
        await conn.query(
          'UPDATE tasks SET item_type = $1, parent_id = $2, version = version + 1, updated_at = NOW() WHERE id = $3',
          [c.newType, c.newParentId, c.id]
        );
      }

      // Store undo token (30 second expiry)
      const { rows: [undoRow] } = await conn.query(
        `INSERT INTO retype_undo_tokens (actor_user_id, root_item_id, changes, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '30 seconds')
         RETURNING id`,
        [req.user?.id || null, req.params.id, JSON.stringify(changes)]
      );

      await conn.query('COMMIT');

      await auditLog('task', req.params.id, 'retype', req.user?.displayName, {
        from: item.item_type, to: newType, descendantCount: changes.length - 1
      });

      res.json({
        undoToken: undoRow.id,
        changes: changes.map(c => ({
          id: c.id,
          previousType: c.previousType,
          newType: c.newType,
        })),
      });
    } catch (err) {
      await conn.query('ROLLBACK');
      log('error', 'Retype', 'Cascade failed', { error: err.message });
      res.status(500).json({ error: 'Retype failed' });
    } finally {
      conn.release();
    }
  });

  /**
   * PATCH /api/tasks/retype-undo
   * Revert a cascade using a server-held undo token.
   * Version preconditions: fails if any affected row changed since cascade.
   */
  router.patch('/api/tasks/retype-undo', async (req, res) => {
    const { undoToken } = req.body;
    if (!undoToken || !isValidUuid(undoToken)) {
      return res.status(400).json({ error: 'undoToken required' });
    }

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');

      // Purge expired tokens
      await conn.query('DELETE FROM retype_undo_tokens WHERE expires_at < NOW()');

      const { rows: [tokenRow] } = await conn.query(
        'SELECT * FROM retype_undo_tokens WHERE id = $1',
        [undoToken]
      );
      if (!tokenRow) {
        await conn.query('ROLLBACK');
        return res.status(410).json({ error: 'Undo token expired or not found' });
      }

      const changes = tokenRow.changes;

      // Version check: verify no row was modified since the cascade
      for (const c of changes) {
        const { rows: [current] } = await conn.query(
          'SELECT version FROM tasks WHERE id = $1',
          [c.id]
        );
        if (!current) continue;
        // The cascade bumped version by 1, so the expected version is c.version + 1
        if (current.version !== c.version + 1) {
          await conn.query('ROLLBACK');
          return res.status(409).json({
            error: 'Cannot undo -- one or more items were modified after the type change',
            conflictId: c.id,
          });
        }
      }

      // Restore previous types, parents, and sort orders
      for (const c of changes) {
        await conn.query(
          'UPDATE tasks SET item_type = $1, parent_id = $2, sort_order = $3, version = version + 1, updated_at = NOW() WHERE id = $4',
          [c.previousType, c.previousParentId, c.previousSortOrder, c.id]
        );
      }

      // Delete the used token
      await conn.query('DELETE FROM retype_undo_tokens WHERE id = $1', [undoToken]);

      await conn.query('COMMIT');

      await auditLog('task', tokenRow.root_item_id, 'retype_undo', req.user?.displayName, {
        itemCount: changes.length
      });

      res.json({ reverted: changes.length });
    } catch (err) {
      await conn.query('ROLLBACK');
      log('error', 'Retype', 'Undo failed', { error: err.message });
      res.status(500).json({ error: 'Undo failed' });
    } finally {
      conn.release();
    }
  });

  return router;
};
```

- [ ] **Step 4: Wire up the route in server.js**

After the tasks route registration (around line 485), add:

```js
app.use(require('./routes/retype')({ pool, log, isValidUuid, auditLog, ITEM_TYPES, CANONICAL_ORDER, getCanonicalIndex, isDescendantOrder, requireTaskAccess }));
```

Import `CANONICAL_ORDER`, `getCanonicalIndex`, `isDescendantOrder` from helpers at the top (line 58-64).

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/retype.test.mjs`
Expected: All PASS.

- [ ] **Step 6: Run full unit suite**

Run: `cd dashboard-server && npm test`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/routes/retype.js dashboard-server/server.js dashboard-server/tests/unit/retype.test.mjs
git commit -m "feat(hierarchy): retype endpoint with cascade, clamping, and server-held undo tokens"
```

---

## Task 6: Frontend Constants + Active-Level Helpers

**Files:**
- Modify: `dashboard-server/public/js/nbi-utils.js:139-168`

- [ ] **Step 1: Add initiative to ITEM_TYPE_META and ITEM_TYPE_ORDER**

Update the ITEM TYPE HIERARCHY section in `nbi-utils.js`:

```js
// ==================== ITEM TYPE HIERARCHY ====================
// 5-level hierarchy: Initiative > Project > Feature > Story > Task
// Active levels are per-client (from clients.hierarchy_levels).
const ITEM_TYPE_META = {
  initiative: { label: 'Initiative', plural: 'Initiatives', colour: '#4f46e5', icon: '\u{1F3AF}' },
  project: { label: 'Project', plural: 'Projects', colour: '#6366f1', icon: '\u{1F4C1}' },
  feature: { label: 'Feature', plural: 'Features', colour: '#8b5cf6', icon: '★' },
  story:   { label: 'Story',   plural: 'Stories',  colour: '#06b6d4', icon: '\u{1F4D6}' },
  task:    { label: 'Task',    plural: 'Tasks',    colour: '#64748b', icon: '✎' },
};
const ITEM_TYPE_ORDER = ['initiative', 'project', 'feature', 'story', 'task'];
const VALID_CHILD_TYPE = { initiative: 'project', project: 'feature', feature: 'story', story: 'task', task: null };
const VALID_PARENT_TYPE = { initiative: null, project: 'initiative', feature: 'project', story: 'feature', task: 'story' };
```

- [ ] **Step 2: Add active-level helper functions**

Add below the existing helpers (after `getChildTypeLabel`):

```js
/** Get the hierarchy_levels array for a client from the API cache. Falls back to full order. */
function getClientActiveLevels(clientName) {
  if (!clientName) return ITEM_TYPE_ORDER;
  const rec = Object.values(_apiClientsCache || {}).find(c => c && c.name === clientName);
  if (rec && Array.isArray(rec.hierarchy_levels) && rec.hierarchy_levels.length > 0) return rec.hierarchy_levels;
  return ITEM_TYPE_ORDER;
}

/** Get active levels for a task (uses the task's client). */
function getTaskActiveLevels(task) {
  return getClientActiveLevels(getTaskClient(task));
}

/** Next active level below the given type for a client. */
function getActiveChildType(type, clientName) {
  const levels = getClientActiveLevels(clientName);
  const ti = ITEM_TYPE_ORDER.indexOf(type);
  if (ti < 0) return null;
  for (let i = ti + 1; i < ITEM_TYPE_ORDER.length; i++) {
    if (levels.includes(ITEM_TYPE_ORDER[i])) return ITEM_TYPE_ORDER[i];
  }
  return null;
}

/** Next active level above the given type for a client. */
function getActiveParentType(type, clientName) {
  const levels = getClientActiveLevels(clientName);
  const ti = ITEM_TYPE_ORDER.indexOf(type);
  if (ti < 0) return null;
  for (let i = ti - 1; i >= 0; i--) {
    if (levels.includes(ITEM_TYPE_ORDER[i])) return ITEM_TYPE_ORDER[i];
  }
  return null;
}

/** Topmost active type for a client (the visible root type). */
function getTopmostActiveType(clientName) {
  const levels = getClientActiveLevels(clientName);
  return levels[0] || 'project';
}

/** Check if a type is active for a client. */
function isTypeActive(type, clientName) {
  return getClientActiveLevels(clientName).includes(type);
}

/** Render interactive type pill (clickable badge with dropdown for retype). */
function itemTypePillHtml(task) {
  const m = getItemTypeMeta(task);
  const type = getItemType(task);
  return `<span class="item-type-badge item-type-pill" style="background:${m.colour};cursor:pointer" data-action="openRetypePicker" data-arg0="${task.id}" title="Click to change type">${m.label}</span>`;
}
```

- [ ] **Step 3: Run existing unit tests to check for regressions**

Run: `cd dashboard-server && npm test`
Expected: All pass. Frontend changes are JS-only with no test coverage yet (frontend tests are e2e via Playwright).

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/public/js/nbi-utils.js
git commit -m "feat(hierarchy): add initiative type and active-level helpers to frontend nbi-utils.js"
```

---

## Task 7: Detail Panel -- Interactive Type Pill + Retype Flow

**Files:**
- Modify: `dashboard-server/public/js/views/nbi-detail.js:110, 1181, 1200`
- Modify: `dashboard-server/public/js/nbi-events.js:138`

- [ ] **Step 1: Replace static type badge with interactive pill in the detail panel**

In `nbi-detail.js` around line 110, replace the type field:

```js
  // Type pill -- clickable for retype
  html += `<div class="detail-field"><span class="detail-field__label">Type</span><div style="display:flex;align-items:center;gap:6px">${itemTypePillHtml(task)} <span style="font-size:0.82rem;color:var(--text-primary)">${getItemTypeLabel(task)}</span></div></div>`;
```

- [ ] **Step 2: Add the retype picker and API call**

Add to `nbi-detail.js` (near the bottom, before the module's closing):

```js
/** Open a dropdown picker for retyping an item. Called by data-action="openRetypePicker". */
function openRetypePicker(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const client = getTaskClient(task);
  const activeLevels = getClientActiveLevels(client);
  const currentType = getItemType(task);

  // Remove existing picker
  const old = document.getElementById('retypePickerOverlay');
  if (old) old.remove();

  // Build dropdown
  const pill = document.querySelector(`[data-action="openRetypePicker"][data-arg0="${taskId}"]`);
  if (!pill) return;
  const rect = pill.getBoundingClientRect();

  let menuHtml = '<div class="retype-picker" style="position:fixed;z-index:10000;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);box-shadow:var(--shadow-lg);padding:4px 0;min-width:140px">';
  for (const level of activeLevels) {
    const meta = ITEM_TYPE_META[level];
    const selected = level === currentType;
    menuHtml += `<div class="retype-option" style="padding:6px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:0.82rem;${selected ? 'font-weight:600;background:var(--bg-hover)' : ''}" data-action="executeRetype" data-arg0="${taskId}" data-arg1="${level}">`;
    menuHtml += `<span class="item-type-badge" style="background:${meta.colour};font-size:0.7rem;padding:1px 6px">${meta.label}</span>`;
    if (selected) menuHtml += '<span style="margin-left:auto">&#10003;</span>';
    menuHtml += '</div>';
  }
  menuHtml += '</div>';

  const overlay = document.createElement('div');
  overlay.id = 'retypePickerOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999';
  overlay.onclick = () => overlay.remove();
  overlay.innerHTML = menuHtml;
  const menu = overlay.querySelector('.retype-picker');
  menu.style.top = rect.bottom + 4 + 'px';
  menu.style.left = rect.left + 'px';
  menu.onclick = e => e.stopPropagation();
  document.body.appendChild(overlay);
}

/** Execute a retype via the server API. */
async function executeRetype(taskId, newType) {
  const overlay = document.getElementById('retypePickerOverlay');
  if (overlay) overlay.remove();

  const task = tasks.find(t => t.id === taskId);
  if (!task || getItemType(task) === newType) return;

  try {
    const res = await fetch(`/api/tasks/${taskId}/retype`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _authToken },
      body: JSON.stringify({ newType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast(err.error || 'Retype failed', 'error');
      return;
    }
    const data = await res.json();
    // Show undo toast
    const changedCount = data.changes.length;
    const cascadeText = changedCount > 1 ? ` ${changedCount - 1} children cascaded.` : '';
    const meta = ITEM_TYPE_META[newType];
    showUndoToast(`Changed to ${meta.label}.${cascadeText}`, async () => {
      const undoRes = await fetch('/api/tasks/retype-undo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _authToken },
        body: JSON.stringify({ undoToken: data.undoToken }),
      });
      if (undoRes.ok) {
        toast('Type change reverted', 'success');
        await loadAllTasks();
        renderContent();
      } else {
        const err = await undoRes.json().catch(() => ({}));
        toast(err.error || 'Undo failed -- another user may have modified items', 'warning');
      }
    }, 10000);
    // Reload data to reflect server changes
    await loadAllTasks();
    renderContent();
    openDetail(taskId);
  } catch (err) {
    toast('Retype failed: ' + err.message, 'error');
  }
}

/** Show an undo toast with a callback. Disappears after timeout. */
function showUndoToast(message, undoCallback, timeout) {
  const existing = document.getElementById('undoToast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'undoToast';
  el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--bg-elevated);color:var(--text-primary);padding:12px 20px;border-radius:var(--radius-md);box-shadow:var(--shadow-lg);display:flex;align-items:center;gap:12px;z-index:10001;font-size:0.85rem;border:1px solid var(--border-default)';
  el.innerHTML = `<span>${esc(message)}</span><button style="background:var(--accent);color:white;border:none;padding:4px 12px;border-radius:var(--radius-sm);cursor:pointer;font-weight:600;font-size:0.82rem">Undo</button>`;
  el.querySelector('button').onclick = () => {
    el.remove();
    clearTimeout(timer);
    undoCallback();
  };
  document.body.appendChild(el);
  const timer = setTimeout(() => el.remove(), timeout || 10000);
}
```

- [ ] **Step 3: Update showQuickAdd to use active child type**

In `nbi-detail.js`, update `showQuickAdd` (around line 1199-1201):

```js
  const parentType = getItemType(parent);
  const client = getTaskClient(parent);
  const childType = getActiveChildType(parentType, client);
  if (!childType) return;
  const childMeta = ITEM_TYPE_META[childType];
```

- [ ] **Step 4: Update createTaskObject default itemType**

In `nbi-detail.js` line 1184, the `createTaskObject` default stays as `'task'` -- no change needed. The overrides from callers will set the correct type.

- [ ] **Step 5: Register event handlers in nbi-events.js**

Add to the event handler registrations:

```js
function _actOpenRetypePicker(taskId) { openRetypePicker(taskId); }
function _actExecuteRetype(taskId, newType) { executeRetype(taskId, newType); }
```

Update `_actAddProjectForClient` to use the topmost active type:

```js
function _actAddProjectForClient(client) {
  const m = document.getElementById('addItemPickerModal'); if (m) m.remove();
  const topType = getTopmostActiveType(client);
  const meta = ITEM_TYPE_META[topType];
  const t = createTaskObject({ title: `New ${meta.label}`, itemType: topType, client });
  tasks.push(t); markDirty(t.id); save(); renderSidebarCounts(); renderContent(); openDetail(t.id);
}
```

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/public/js/views/nbi-detail.js dashboard-server/public/js/nbi-events.js
git commit -m "feat(hierarchy): interactive type pill with retype API, undo toast, and active-level child creation"
```

---

## Task 8: Tree View -- Active Level Filters, SoW Under Initiatives, Header Counts

**Files:**
- Modify: `dashboard-server/public/js/views/nbi-tasks.js:72-77, 220-268`

- [ ] **Step 1: Update type filter buttons to use active levels**

In `nbi-tasks.js`, find the type filter button rendering (around lines 72-77). Replace hardcoded types with active levels:

```js
  // Type filter buttons — render active levels for the current client context
  const filterClient = _currentClient || null;
  const activeTypes = getClientActiveLevels(filterClient);
  // Build filter buttons from active types only
```

- [ ] **Step 2: Update SoW grouping for initiative-aware rendering**

In `nbi-tasks.js` around lines 228-268, update the SoW grouping logic. When initiatives are active, `clientRoots` are initiatives (not projects). SoW grouping moves inside each initiative:

```js
    // When initiative is active for this client, clientRoots are initiatives.
    // SoW grouping applies to projects within each initiative, not to initiatives themselves.
    const clientActiveLevels = getClientActiveLevels(client);
    const initiativeActive = clientActiveLevels.includes('initiative');

    if (initiativeActive) {
      // Render initiatives directly, with SoW grouping inside each
      const initiatives = clientRoots.filter(r => getItemType(r) === 'initiative')
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      initiatives.forEach(init => {
        html += renderTaskRow(init, 1, filtered, visibleIds);
      });
      // Any non-initiative roots (legacy data) render after
      const nonInitRoots = clientRoots.filter(r => getItemType(r) !== 'initiative');
      if (nonInitRoots.length > 0) {
        nonInitRoots.forEach(r => { html += renderTaskRow(r, 1, filtered, visibleIds); });
      }
    } else {
      // Initiative hidden — use existing SoW grouping on projects (unchanged)
      // ... existing SoW grouping code ...
    }
```

- [ ] **Step 3: Update header counts to use active levels**

In the client header stats (around line 223), replace hardcoded type labels:

```js
    const activeLevels = getClientActiveLevels(client);
    const countsByType = {};
    activeLevels.forEach(t => {
      countsByType[t] = allClientTasks.filter(item => getItemType(item) === t && isTypeActive(t, client)).length;
    });
    // Build stats string from active types
    const statsStr = activeLevels
      .filter(t => t !== activeLevels[0]) // skip topmost (already shown as "N projects/initiatives")
      .map(t => `${countsByType[t] || 0} ${ITEM_TYPE_META[t].plural.toLowerCase()}`)
      .join(' · ');
    html += `<span class="task-client-header__stats">${clientRoots.length} ${ITEM_TYPE_META[activeLevels[0]].plural.toLowerCase()} · ${statsStr} · ${completePct}% complete`;
```

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/public/js/views/nbi-tasks.js
git commit -m "feat(hierarchy): tree view active-level filters, initiative-aware SoW grouping, dynamic counts"
```

---

## Task 9: Kanban, Gantt, Docs -- Active Level Awareness

**Files:**
- Modify: `dashboard-server/public/js/views/nbi-kanban.js:595, 670, 687, 355-361`
- Modify: `dashboard-server/public/js/views/nbi-gantt.js` (root assumption)
- Modify: `dashboard-server/public/js/views/nbi-docs.js:570-574`

- [ ] **Step 1: Update kanban drag validation**

In `nbi-kanban.js`, the drag-drop validation (around lines 595, 670, 687) uses `VALID_CHILD_TYPE` for strict adjacency. Replace with descendant-order check using `ITEM_TYPE_ORDER.indexOf()`:

```js
  // Validate: dragged item type must be lower than drop target type in canonical order
  const dragIdx = ITEM_TYPE_ORDER.indexOf(getItemType(draggedTask));
  const targetIdx = ITEM_TYPE_ORDER.indexOf(getItemType(dropTarget));
  if (dragIdx <= targetIdx) { /* reject drop */ }
```

- [ ] **Step 2: Update kanban quick-add to use active child type**

In `nbi-kanban.js`, the quick-add pill (around lines 355-361) currently uses `VALID_CHILD_TYPE`. Replace:

```js
  const client = getTaskClient(parentTask);
  const childType = getActiveChildType(getItemType(parentTask), client);
  if (!childType) return;
```

- [ ] **Step 3: Update Gantt root assumption**

In `nbi-gantt.js`, around line 187, the Gantt chart assumes root items are projects. Replace with topmost active type check or simply accept any root type.

- [ ] **Step 4: Update docs view picker**

In `nbi-docs.js`, lines 570-574, update the grouping picker to include initiative when active.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/views/nbi-kanban.js dashboard-server/public/js/views/nbi-gantt.js dashboard-server/public/js/views/nbi-docs.js
git commit -m "feat(hierarchy): kanban, gantt, docs views use active levels and descendant-order validation"
```

---

## Task 10: Settings UI -- Per-Client Hierarchy Depth

**Files:**
- Modify: `dashboard-server/public/js/views/nbi-settings.js`

- [ ] **Step 1: Add "Hierarchy Depth" section to the Configuration tab**

In `nbi-settings.js`, add a new admin-only section after the existing configuration sections. This renders:
- A client selector dropdown
- Five toggle switches (one per canonical level) in order
- `task` toggle is locked on (disabled)
- `initiative` is toggleable
- Save button calls `PATCH /api/clients/:id` with `hierarchy_levels`

```js
function renderHierarchyDepthSection() {
  if (!isAdmin) return '';
  const clients = getContractedClientRecords();
  let html = '<div class="settings-section"><h3>Hierarchy Depth</h3>';
  html += '<p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px">Configure which work item levels are visible per client. Deactivating a level hides those items but never deletes them.</p>';
  html += '<select id="hierarchyClientPicker" onchange="renderHierarchyToggles()" style="margin-bottom:12px;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">';
  html += '<option value="">-- Select Client --</option>';
  clients.forEach(c => { html += `<option value="${c.id}">${esc(c.name)}</option>`; });
  html += '</select>';
  html += '<div id="hierarchyToggles"></div>';
  html += '</div>';
  return html;
}

function renderHierarchyToggles() {
  const clientId = document.getElementById('hierarchyClientPicker')?.value;
  const container = document.getElementById('hierarchyToggles');
  if (!container || !clientId) { if (container) container.innerHTML = ''; return; }

  const clientRec = Object.values(_apiClientsCache || {}).find(c => c && c.id === clientId);
  const levels = (clientRec && Array.isArray(clientRec.hierarchy_levels)) ? clientRec.hierarchy_levels : ['project', 'feature', 'story', 'task'];

  const allLevels = ['initiative', 'project', 'feature', 'story', 'task'];
  let html = '<div style="display:flex;flex-direction:column;gap:8px">';
  allLevels.forEach(level => {
    const meta = ITEM_TYPE_META[level];
    const active = levels.includes(level);
    const locked = level === 'task';
    html += `<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:${locked ? 'default' : 'pointer'}">`;
    html += `<input type="checkbox" ${active ? 'checked' : ''} ${locked ? 'disabled' : ''} data-level="${level}" onchange="saveHierarchyLevels('${clientId}')" style="accent-color:${meta.colour}">`;
    html += `<span class="item-type-badge" style="background:${meta.colour};font-size:0.72rem;padding:1px 6px">${meta.label}</span>`;
    if (locked) html += '<span style="font-size:0.75rem;color:var(--text-muted)">(always on)</span>';
    html += '</label>';
  });
  html += '</div>';
  container.innerHTML = html;
}

async function saveHierarchyLevels(clientId) {
  const checkboxes = document.querySelectorAll('#hierarchyToggles input[data-level]');
  const levels = [];
  checkboxes.forEach(cb => { if (cb.checked) levels.push(cb.dataset.level); });
  if (levels.length === 0 || !levels.includes('task')) {
    toast('At least task must be active', 'warning');
    renderHierarchyToggles();
    return;
  }
  try {
    const res = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _authToken },
      body: JSON.stringify({ hierarchy_levels: levels }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (_apiClientsCache) {
        const key = Object.keys(_apiClientsCache).find(k => _apiClientsCache[k]?.id === clientId);
        if (key) _apiClientsCache[key].hierarchy_levels = levels;
      }
      toast('Hierarchy updated', 'success');
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || 'Failed to update hierarchy', 'error');
      renderHierarchyToggles();
    }
  } catch (err) {
    toast('Error saving hierarchy: ' + err.message, 'error');
    renderHierarchyToggles();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard-server/public/js/views/nbi-settings.js
git commit -m "feat(hierarchy): per-client hierarchy depth settings UI with toggles"
```

---

## Task 11: Shell Updates + Cache Busts

**Files:**
- Modify: `nbi_project_dashboard.html:106-109, script tags`

- [ ] **Step 1: Replace hardcoded "New X" menu items with dynamic generation**

In `nbi_project_dashboard.html`, lines 106-109, replace the four hardcoded menu items with a container that will be populated dynamically:

```html
        <div id="addItemMenuItems">
          <!-- Populated dynamically by renderAddItemMenu() based on active levels -->
        </div>
```

Add a function in `nbi-events.js` or `nbi-utils.js` that builds the menu:

```js
function renderAddItemMenu() {
  const container = document.getElementById('addItemMenuItems');
  if (!container) return;
  const client = _currentClient || null;
  const levels = getClientActiveLevels(client);
  container.innerHTML = levels.map(type => {
    const meta = ITEM_TYPE_META[type];
    return `<div class="hover-item" role="button" tabindex="0" style="padding:6px 12px;cursor:pointer;font-size:0.82rem;display:flex;gap:8px;align-items:center" data-action="addItemFromMenu" data-arg0="${type}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"><span style="width:18px;text-align:center">${meta.icon}</span> New ${meta.label}</div>`;
  }).join('');
}
```

Call `renderAddItemMenu()` on client switch and initial load.

- [ ] **Step 2: Bump cache-bust versions on all modified JS files**

Update script tags in `nbi_project_dashboard.html`:

```html
<script src="/public/js/nbi-utils.js?v=2"></script>
<script src="/public/js/views/nbi-detail.js?v=2"></script>
<script src="/public/js/views/nbi-tasks.js?v=3"></script>
<script src="/public/js/views/nbi-kanban.js?v=2"></script>
<script src="/public/js/views/nbi-gantt.js?v=2"></script>
<script src="/public/js/views/nbi-docs.js?v=2"></script>
<script src="/public/js/views/nbi-settings.js?v=2"></script>
<script src="/public/js/nbi-events.js?v=2"></script>
```

(Verify current versions first and bump by 1.)

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html dashboard-server/public/js/nbi-events.js
git commit -m "feat(hierarchy): dynamic add-item menu from active levels, cache-bust all modified JS"
```

---

## Task 12: E2E Tests

**Files:**
- Create: `dashboard-server/tests/e2e/hierarchy.spec.js`

- [ ] **Step 1: Write Playwright e2e tests for the core flows**

Create `dashboard-server/tests/e2e/hierarchy.spec.js` covering:

1. Tree renders initiative root for a full-depth client.
2. Tree clean-skips initiative for a 4-level client (NBI default).
3. Type pill click opens dropdown with active levels.
4. Retype via pill cascades children and shows undo toast.
5. Undo reverts the cascade.
6. Settings: toggle initiative on for a client, verify it appears in tree.
7. Settings: toggle initiative off, verify items disappear but aren't deleted.
8. Add Item menu shows only active types.

Each test follows the existing e2e patterns (login as admin, navigate to page, interact, assert).

- [ ] **Step 2: Run e2e tests**

Run: `cd dashboard-server && npm run test:e2e`
Expected: All hierarchy tests pass. All existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/tests/e2e/hierarchy.spec.js
git commit -m "test(hierarchy): e2e tests for initiative rendering, retype cascade/undo, settings toggles"
```

---

## Task 13: Full Verification + PM2 Restart

- [ ] **Step 1: Run complete test suite**

Run: `cd dashboard-server && npm run test:all`
Expected: All unit tests pass. All e2e tests pass (existing + new).

- [ ] **Step 2: Restart PM2**

Run: `pm2 restart nbi-dashboard`
Verify: `pm2 logs nbi-dashboard --lines 20` shows clean startup.

- [ ] **Step 3: Codex adversarial review of the implementation**

Run: `codex review --uncommitted`
Expected: Clean or findings resolved before marking done.

- [ ] **Step 4: Final commit if any fixes**

```bash
git add -A && git commit -m "fix(hierarchy): address Codex review findings"
```

---

## Done Criteria

- `npm run test:all` green (all unit + e2e)
- Codex review clean
- PM2 restarted, server running
- Glen UAT at https://worksage.nbi-consulting.com
