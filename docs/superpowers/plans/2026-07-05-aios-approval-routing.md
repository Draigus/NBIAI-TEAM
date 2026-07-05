# AIOS Approval Client-Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After approving an AIOS action, route it to a specific client's project tree (or AIOS Inbox) before execution fires, on both Slack and Dashboard surfaces.

**Architecture:** New `awaiting_routing` execution state gates approved-but-unrouted actions. Slack posts sequential dropdowns (client, then project). Dashboard gets a new AIOS Queue page with a routing modal. A shared `executeAndReport` function handles execution + error marking for both surfaces.

**Tech Stack:** Node.js/Express, PostgreSQL, @slack/bolt (Socket Mode), Vitest, Playwright, vanilla JS SPA.

**Spec:** `docs/superpowers/specs/2026-07-05-aios-approval-routing-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `migrations/080_aios_routing.sql` | Add `awaiting_routing` to execution_state CHECK |
| `lib/bot-handlers.js` | Pure routing block builders, recipe merger, apply-routing DB call |
| `lib/execute-and-report.js` (new) | Shared execute + mark-state + error handling |
| `slack-bot.js` | Two new `app.action` handlers, modify approve flow to route |
| `routes/aios.js` | Modify approve, add approve-and-route/route/routing-data endpoints |
| `public/js/views/nbi-aios-queue.js` (new) | AIOS Queue view + routing modal rendering |
| `public/js/nbi-sidebar.js` | Sidebar entry + known route for 'aios' |
| `public/js/views/nbi-settings.js` | Add 'aios' to RBAC pages array |
| `nbi_project_dashboard.html` | Script tag for nbi-aios-queue.js, view case |
| `tests/unit/bot-handlers-routing.test.mjs` (new) | Unit tests for routing block builders + recipe merger |
| `tests/unit/execute-and-report.test.mjs` (new) | Unit tests for shared execution function |
| `tests/unit/aios-routes.test.mjs` | Extend with approve-and-route, route, routing-data tests |

---

### Task 1: Database Migration

**Files:**
- Create: `dashboard-server/migrations/080_aios_routing.sql`

- [ ] **Step 1: Write migration**

```sql
-- 080_aios_routing.sql
-- Add 'awaiting_routing' to execution_state CHECK constraint for AIOS
-- approval client-routing feature. Actions with recipes enter this state
-- on approval; routing completes before execution fires.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aios_actions') THEN
    ALTER TABLE aios_actions DROP CONSTRAINT IF EXISTS aios_actions_execution_state_check;
    ALTER TABLE aios_actions ADD CONSTRAINT aios_actions_execution_state_check
      CHECK (execution_state IN ('pending', 'in_progress', 'completed', 'failed', 'awaiting_routing'));
  END IF;
END $$;
```

- [ ] **Step 2: Apply migration by restarting nbi-dashboard**

Run from `dashboard-server/`:
```bash
pm2 restart nbi-dashboard
```
Check logs for: `Applied migration 080`
```bash
pm2 logs nbi-dashboard --lines 20
```

- [ ] **Step 3: Verify constraint accepts new value**

```bash
node -e "
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  // Should succeed
  await pool.query(\"INSERT INTO aios_actions (source_system, action_type, title, execution_state, idempotency_key) VALUES ('test', 'task', 'routing-test', 'awaiting_routing', 'test:routing:080')\");
  // Clean up
  await pool.query(\"DELETE FROM aios_actions WHERE idempotency_key = 'test:routing:080'\");
  console.log('PASS: awaiting_routing accepted');
  await pool.end();
})().catch(e => { console.log('FAIL:', e.message); process.exit(1); });
"
```

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/migrations/080_aios_routing.sql
git commit -m "feat(aios): add awaiting_routing execution state for approval routing"
```

---

### Task 2: Shared Execute-and-Report Function

**Files:**
- Create: `dashboard-server/lib/execute-and-report.js`
- Create: `dashboard-server/tests/unit/execute-and-report.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `dashboard-server/tests/unit/execute-and-report.test.mjs`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

function makeMockPool(queuedResults = []) {
  const queue = [...queuedResults];
  return {
    query: vi.fn(async () => {
      if (queue.length === 0) return { rows: [], rowCount: 0 };
      return queue.shift();
    }),
  };
}

describe('executeAndReport', () => {
  let mod;
  beforeEach(() => {
    vi.resetModules();
  });

  it('marks in_progress then completed on success', async () => {
    const action = {
      id: 'a-1', title: 'Test', execution_recipe: { type: 'task_create', parent_id: 'p-1' },
    };
    const pool = makeMockPool([
      { rows: [action], rowCount: 1 }, // SELECT for action
    ]);
    const mockExecutor = {
      getRecipeType: vi.fn(() => 'task_create'),
      markExecutionState: vi.fn(),
      executeAction: vi.fn().mockResolvedValue({ success: true, created_id: 't-1' }),
    };
    mod = require('../../lib/execute-and-report');
    const result = await mod.executeAndReport(pool, 'a-1', {}, vi.fn(), mockExecutor);
    expect(result.success).toBe(true);
    expect(mockExecutor.markExecutionState).toHaveBeenCalledWith(pool, 'a-1', 'in_progress', null);
    expect(mockExecutor.markExecutionState).toHaveBeenCalledWith(pool, 'a-1', 'completed', expect.objectContaining({ success: true }));
  });

  it('marks in_progress then failed on execution error', async () => {
    const action = {
      id: 'a-2', title: 'Broken', execution_recipe: { type: 'task_create' },
    };
    const pool = makeMockPool([
      { rows: [action], rowCount: 1 },
    ]);
    const mockExecutor = {
      getRecipeType: vi.fn(() => 'task_create'),
      markExecutionState: vi.fn(),
      executeAction: vi.fn().mockRejectedValue(new Error('DB down')),
    };
    mod = require('../../lib/execute-and-report');
    const result = await mod.executeAndReport(pool, 'a-2', {}, vi.fn(), mockExecutor);
    expect(result.success).toBe(false);
    expect(result.error).toBe('DB down');
    expect(mockExecutor.markExecutionState).toHaveBeenCalledWith(pool, 'a-2', 'failed', expect.objectContaining({ error: 'DB down' }));
  });

  it('returns error without marking in_progress for unknown recipe', async () => {
    const action = {
      id: 'a-3', title: 'No recipe', execution_recipe: null,
    };
    const pool = makeMockPool([
      { rows: [action], rowCount: 1 },
    ]);
    const mockExecutor = {
      getRecipeType: vi.fn(() => 'unknown'),
      markExecutionState: vi.fn(),
      executeAction: vi.fn(),
    };
    mod = require('../../lib/execute-and-report');
    const result = await mod.executeAndReport(pool, 'a-3', {}, vi.fn(), mockExecutor);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No executable recipe');
    expect(mockExecutor.markExecutionState).not.toHaveBeenCalled();
  });

  it('returns error when action not found', async () => {
    const pool = makeMockPool([
      { rows: [], rowCount: 0 },
    ]);
    const mockExecutor = {
      getRecipeType: vi.fn(),
      markExecutionState: vi.fn(),
      executeAction: vi.fn(),
    };
    mod = require('../../lib/execute-and-report');
    const result = await mod.executeAndReport(pool, 'nonexistent', {}, vi.fn(), mockExecutor);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `dashboard-server/`:
```bash
npx vitest run tests/unit/execute-and-report.test.mjs
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement execute-and-report.js**

Create `dashboard-server/lib/execute-and-report.js`:

```js
'use strict';

async function executeAndReport(pool, actionId, ctx, log, executorOverride) {
  const executor = executorOverride || require('./executor');
  const { rows } = await pool.query('SELECT * FROM aios_actions WHERE id = $1', [actionId]);
  const action = rows[0];
  if (!action) {
    return { success: false, error: 'Action not found' };
  }
  if (executor.getRecipeType(action) === 'unknown') {
    return { success: false, error: 'No executable recipe' };
  }
  await executor.markExecutionState(pool, action.id, 'in_progress', null);
  try {
    const result = await executor.executeAction(action, ctx);
    await executor.markExecutionState(pool, action.id, result.success ? 'completed' : 'failed', result);
    return result;
  } catch (err) {
    const errorResult = { success: false, error: err.message };
    await executor.markExecutionState(pool, action.id, 'failed', errorResult);
    return errorResult;
  }
}

module.exports = { executeAndReport };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/execute-and-report.test.mjs
```
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/lib/execute-and-report.js dashboard-server/tests/unit/execute-and-report.test.mjs
git commit -m "feat(aios): shared executeAndReport function for Slack + dashboard execution"
```

---

### Task 3: Bot-Handlers Routing Functions

**Files:**
- Modify: `dashboard-server/lib/bot-handlers.js`
- Create: `dashboard-server/tests/unit/bot-handlers-routing.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `dashboard-server/tests/unit/bot-handlers-routing.test.mjs`:

```js
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  buildRoutingClientBlocks, buildRoutingProjectBlocks, mergeRoutingIntoRecipe, applyRouting,
} = require('../../lib/bot-handlers');

describe('buildRoutingClientBlocks', () => {
  it('returns section + select with AIOS Inbox first, then clients alphabetically', () => {
    const clients = [
      { id: 'c-2', name: 'Couch Heroes' },
      { id: 'c-1', name: 'Activision' },
    ];
    const blocks = buildRoutingClientBlocks({ id: 'act-1', title: 'Follow up' }, clients);
    const section = blocks.find(b => b.type === 'section');
    expect(section.text.text).toContain('Where should this go?');
    const actions = blocks.find(b => b.type === 'actions');
    const select = actions.elements.find(e => e.action_id === 'aios_route_client');
    expect(select.options[0].text.text).toBe('AIOS Inbox (no client)');
    expect(select.options[0].value).toBe('act-1:none');
    expect(select.options[1].value).toBe('act-1:c-1');
    expect(select.options[2].value).toBe('act-1:c-2');
  });

  it('returns only inbox option when client list is empty', () => {
    const blocks = buildRoutingClientBlocks({ id: 'act-2', title: 'Test' }, []);
    const actions = blocks.find(b => b.type === 'actions');
    const select = actions.elements.find(e => e.action_id === 'aios_route_client');
    expect(select.options).toHaveLength(1);
    expect(select.options[0].value).toBe('act-2:none');
  });
});

describe('buildRoutingProjectBlocks', () => {
  it('returns select with initiatives + New in AIOS Inbox when multiple', () => {
    const initiatives = [
      { id: 'i-1', title: 'Sprint 1' },
      { id: 'i-2', title: 'Backlog' },
    ];
    const blocks = buildRoutingProjectBlocks({ id: 'act-1' }, 'c-1', 'Couch Heroes', initiatives);
    const section = blocks.find(b => b.type === 'section');
    expect(section.text.text).toContain('Couch Heroes');
    const actions = blocks.find(b => b.type === 'actions');
    const select = actions.elements.find(e => e.action_id === 'aios_route_project');
    expect(select.options).toHaveLength(3);
    expect(select.options[0].value).toBe('act-1:c-1:i-1');
    expect(select.options[1].value).toBe('act-1:c-1:i-2');
    expect(select.options[2].text.text).toBe('New in AIOS Inbox');
    expect(select.options[2].value).toBe('act-1:c-1:inbox');
  });

  it('returns null when zero initiatives (caller should auto-route)', () => {
    const result = buildRoutingProjectBlocks({ id: 'act-1' }, 'c-1', 'Couch Heroes', []);
    expect(result).toBeNull();
  });

  it('returns null when exactly one initiative (caller should auto-select)', () => {
    const result = buildRoutingProjectBlocks({ id: 'act-1' }, 'c-1', 'CH', [{ id: 'i-1', title: 'Only' }]);
    expect(result).toBeNull();
  });
});

describe('mergeRoutingIntoRecipe', () => {
  it('sets client_id and parent_id, clears client_slug when client_id set', () => {
    const recipe = { type: 'task_create', client_slug: 'couch_heroes', some_field: 'keep' };
    const merged = mergeRoutingIntoRecipe(recipe, { clientId: 'c-1', parentId: 'p-1' });
    expect(merged.client_id).toBe('c-1');
    expect(merged.parent_id).toBe('p-1');
    expect(merged.client_slug).toBeUndefined();
    expect(merged.some_field).toBe('keep');
    expect(merged.type).toBe('task_create');
  });

  it('keeps client_slug when clientId is null', () => {
    const recipe = { type: 'task_create', client_slug: 'couch_heroes' };
    const merged = mergeRoutingIntoRecipe(recipe, { clientId: null, parentId: null });
    expect(merged.client_id).toBeNull();
    expect(merged.parent_id).toBeNull();
    expect(merged.client_slug).toBe('couch_heroes');
  });

  it('handles null recipe (creates new object)', () => {
    const merged = mergeRoutingIntoRecipe(null, { clientId: 'c-1', parentId: null });
    expect(merged.client_id).toBe('c-1');
    expect(merged.parent_id).toBeNull();
  });
});

describe('applyRouting', () => {
  it('updates execution_recipe and sets execution_state to pending', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: 'a-1', execution_state: 'pending', execution_recipe: { type: 'task_create', client_id: 'c-1' } }],
        rowCount: 1,
      }),
    };
    const result = await applyRouting(pool, 'a-1', { type: 'task_create', client_id: 'c-1' });
    expect(result.id).toBe('a-1');
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('execution_recipe');
    expect(sql).toContain("execution_state = 'pending'");
    expect(params[0]).toContain('"client_id"');
    expect(params[1]).toBe('a-1');
  });

  it('rejects when action is not in awaiting_routing state', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
    const result = await applyRouting(pool, 'a-1', { type: 'task_create' });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/bot-handlers-routing.test.mjs
```
Expected: FAIL (functions not exported)

- [ ] **Step 3: Implement routing functions in bot-handlers.js**

Add to `dashboard-server/lib/bot-handlers.js` before the `module.exports`:

```js
function buildRoutingClientBlocks(action, clients) {
  const sorted = [...clients].sort((a, b) => a.name.localeCompare(b.name));
  const options = [
    { text: { type: 'plain_text', text: 'AIOS Inbox (no client)' }, value: `${action.id}:none` },
    ...sorted.map(c => ({
      text: { type: 'plain_text', text: c.name },
      value: `${action.id}:${c.id}`,
    })),
  ];
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `Where should this go?\n_${action.title}_` },
    },
    {
      type: 'actions',
      elements: [{
        type: 'static_select',
        action_id: 'aios_route_client',
        placeholder: { type: 'plain_text', text: 'Select destination...' },
        options,
      }],
    },
  ];
}

function buildRoutingProjectBlocks(action, clientId, clientName, initiatives) {
  if (initiatives.length <= 1) return null;
  const options = [
    ...initiatives.map(i => ({
      text: { type: 'plain_text', text: i.title },
      value: `${action.id}:${clientId}:${i.id}`,
    })),
    { text: { type: 'plain_text', text: 'New in AIOS Inbox' }, value: `${action.id}:${clientId}:inbox` },
  ];
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `Which project under *${clientName}*?` },
    },
    {
      type: 'actions',
      elements: [{
        type: 'static_select',
        action_id: 'aios_route_project',
        placeholder: { type: 'plain_text', text: 'Select project...' },
        options,
      }],
    },
  ];
}

function mergeRoutingIntoRecipe(recipe, { clientId, parentId }) {
  const base = recipe ? { ...recipe } : {};
  base.client_id = clientId;
  base.parent_id = parentId;
  if (clientId != null) {
    delete base.client_slug;
  }
  return base;
}

async function applyRouting(pool, actionId, mergedRecipe) {
  const { rows } = await pool.query(
    `UPDATE aios_actions
     SET execution_recipe = $1, execution_state = 'pending', updated_at = NOW()
     WHERE id = $2 AND execution_state = 'awaiting_routing'
     RETURNING *`,
    [JSON.stringify(mergedRecipe), actionId]
  );
  return rows[0] || null;
}
```

Update the `module.exports` at the bottom of `bot-handlers.js`:

```js
module.exports = {
  isAuthorised, buildActionBlocks, handleButtonAction, buildDispatchPrompt, truncateForSlack,
  buildTranscript, createChannelQueue, ACK_TEXT,
  buildRoutingClientBlocks, buildRoutingProjectBlocks, mergeRoutingIntoRecipe, applyRouting,
};
```

- [ ] **Step 4: Modify handleButtonAction approve branch**

In `bot-handlers.js`, change the approve branch (lines 35-47) to set `awaiting_routing` when the action has a recipe:

Replace:
```js
  if (verb === 'approve') {
    const { rows } = await pool.query(
      `UPDATE aios_actions SET approval_state = 'approved', feedback_signal = 'approved_unchanged', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [actionId]
    );
    if (rows.length === 0) return { ok: false, message: 'Action not found (already handled elsewhere?)' };
    const action = rows[0];
    const recipeType = action.execution_recipe?.type;
    if (recipeType) {
      return { ok: true, message: `Approved: ${action.title}. Executor will process shortly (recipe: ${recipeType}).`, triggerExecutor: true, actionId: action.id };
    }
    return { ok: true, message: `Approved: ${action.title}. Recorded.` };
  }
```

With:
```js
  if (verb === 'approve') {
    const hasRecipe = 'checkRecipe';
    const { rows: preRows } = await pool.query('SELECT execution_recipe FROM aios_actions WHERE id = $1', [actionId]);
    const recipeExists = preRows.length > 0 && preRows[0].execution_recipe != null;
    const newExecState = recipeExists ? 'awaiting_routing' : 'pending';
    const { rows } = await pool.query(
      `UPDATE aios_actions SET approval_state = 'approved', feedback_signal = 'approved_unchanged',
       execution_state = $2, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [actionId, newExecState]
    );
    if (rows.length === 0) return { ok: false, message: 'Action not found (already handled elsewhere?)' };
    const action = rows[0];
    if (recipeExists) {
      return { ok: true, message: `Approved: ${action.title}. Routing...`, needsRouting: true, actionId: action.id };
    }
    return { ok: true, message: `Approved: ${action.title}. Recorded.` };
  }
```

- [ ] **Step 5: Run all bot-handlers tests**

```bash
npx vitest run tests/unit/bot-handlers.test.mjs tests/unit/bot-handlers-routing.test.mjs
```
Expected: all PASS. The existing `handleButtonAction` approve test checks `result.message` contains 'Approved' -- it still will. It also checks `result.ok` is true. The test uses a mock pool that returns a row without `execution_recipe`, so `recipeExists` will be false and it follows the old path. Verify this.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/lib/bot-handlers.js dashboard-server/tests/unit/bot-handlers-routing.test.mjs
git commit -m "feat(aios): routing block builders, recipe merger, and awaiting_routing on approve"
```

---

### Task 4: Slack Bot Routing Handlers

**Files:**
- Modify: `dashboard-server/slack-bot.js`

- [ ] **Step 1: Replace the inline executor block with routing flow**

In `slack-bot.js`, the approve button handler (lines 61-95) currently does inline execution when `result.triggerExecutor` is true. Replace the entire `if (result.triggerExecutor && result.actionId)` block (lines 61-95) with routing logic:

```js
      if (result.needsRouting && result.actionId) {
        try {
          const { buildRoutingClientBlocks } = require('./lib/bot-handlers');
          const { rows: clientRows } = await pool.query('SELECT id, name FROM clients ORDER BY name');
          const blocks = buildRoutingClientBlocks({ id: result.actionId, title: result.message.replace('Approved: ', '').replace('. Routing...', '') }, clientRows);
          await client.chat.postMessage({
            channel: body.channel.id,
            thread_ts: body.message && body.message.ts,
            blocks,
            text: 'Where should this go?',
          });
        } catch (routeErr) {
          log('error', 'SlackBot', 'Failed to post routing question', { error: routeErr.message });
          await client.chat.postMessage({
            channel: body.channel.id,
            thread_ts: body.message && body.message.ts,
            text: `Approved but could not post routing question: ${routeErr.message}. Route from dashboard.`,
          });
        }
      }
```

- [ ] **Step 2: Add aios_route_client action handler**

Add after the existing `for (const verb of ['approve', 'skip', 'more'])` block (after line 102):

```js
// --- Routing: client selection ---
app.action('aios_route_client', async ({ ack, body, action, client }) => {
  await ack();
  const userId = body.user && body.user.id;
  if (userId !== GLEN_ID) return;

  const val = action.selected_option?.value || '';
  const [actionId, clientIdOrNone] = val.split(':');
  if (!actionId) return;

  try {
    const { mergeRoutingIntoRecipe, applyRouting, buildRoutingProjectBlocks } = require('./lib/bot-handlers');
    const { executeAndReport } = require('./lib/execute-and-report');
    const threadTs = body.message && body.message.ts;

    // Guard: check action is still awaiting routing
    const { rows: checkRows } = await pool.query('SELECT execution_state, execution_recipe FROM aios_actions WHERE id = $1', [actionId]);
    if (checkRows.length === 0 || checkRows[0].execution_state !== 'awaiting_routing') {
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Already routed.' });
      return;
    }

    if (clientIdOrNone === 'none') {
      // No client -- route to global AIOS Inbox
      const merged = mergeRoutingIntoRecipe(checkRows[0].execution_recipe, { clientId: null, parentId: null });
      const applied = await applyRouting(pool, actionId, merged);
      if (!applied) {
        await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Already routed.' });
        return;
      }
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Filed in AIOS Inbox. Executing...' });
      const execResult = await executeAndReport(pool, actionId, {
        internalToken: process.env.AIOS_INTERNAL_TOKEN,
        baseUrl: `http://localhost:${process.env.PORT || 8888}`,
        fetch: globalThis.fetch, pool, log,
        repoRoot: path.resolve(__dirname, '..'),
      }, log);
      const status = execResult.success ? 'Done' : 'Failed';
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: `${status}: ${JSON.stringify(execResult)}` });
      return;
    }

    // Client selected -- check for initiatives under this client
    const clientId = clientIdOrNone;
    const { rows: clientNameRows } = await pool.query('SELECT name FROM clients WHERE id = $1', [clientId]);
    const clientName = clientNameRows[0]?.name || 'Unknown';
    const { rows: initiatives } = await pool.query(
      `SELECT id, title FROM tasks
       WHERE client_id = $1 AND parent_id IS NULL AND item_type = 'initiative'
         AND status NOT IN ('Done', 'Cancelled')
       ORDER BY title`,
      [clientId]
    );

    if (initiatives.length === 0) {
      // Zero initiatives -- auto-route to new AIOS Inbox for this client
      const merged = mergeRoutingIntoRecipe(checkRows[0].execution_recipe, { clientId, parentId: null });
      const applied = await applyRouting(pool, actionId, merged);
      if (!applied) { await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Already routed.' }); return; }
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: `Filed under ${clientName} (new AIOS Inbox). Executing...` });
      const execResult = await executeAndReport(pool, actionId, {
        internalToken: process.env.AIOS_INTERNAL_TOKEN, baseUrl: `http://localhost:${process.env.PORT || 8888}`,
        fetch: globalThis.fetch, pool, log, repoRoot: path.resolve(__dirname, '..'),
      }, log);
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: `${execResult.success ? 'Done' : 'Failed'}: ${JSON.stringify(execResult)}` });
      return;
    }

    if (initiatives.length === 1) {
      // One initiative -- auto-select it
      const merged = mergeRoutingIntoRecipe(checkRows[0].execution_recipe, { clientId, parentId: initiatives[0].id });
      const applied = await applyRouting(pool, actionId, merged);
      if (!applied) { await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Already routed.' }); return; }
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: `Filed under ${clientName} > ${initiatives[0].title}. Executing...` });
      const execResult = await executeAndReport(pool, actionId, {
        internalToken: process.env.AIOS_INTERNAL_TOKEN, baseUrl: `http://localhost:${process.env.PORT || 8888}`,
        fetch: globalThis.fetch, pool, log, repoRoot: path.resolve(__dirname, '..'),
      }, log);
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: `${execResult.success ? 'Done' : 'Failed'}: ${JSON.stringify(execResult)}` });
      return;
    }

    // Multiple initiatives -- post project selection
    const projBlocks = buildRoutingProjectBlocks({ id: actionId }, clientId, clientName, initiatives);
    await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, blocks: projBlocks, text: `Which project under ${clientName}?` });
  } catch (err) {
    log('error', 'SlackBot', 'Client routing failed', { error: err.message });
    await client.chat.postMessage({ channel: body.channel.id, text: `Routing failed: ${err.message}` });
  }
});
```

- [ ] **Step 3: Add aios_route_project action handler**

Add after the `aios_route_client` handler:

```js
// --- Routing: project selection ---
app.action('aios_route_project', async ({ ack, body, action, client }) => {
  await ack();
  const userId = body.user && body.user.id;
  if (userId !== GLEN_ID) return;

  const val = action.selected_option?.value || '';
  const parts = val.split(':');
  const actionId = parts[0];
  const clientId = parts[1];
  const parentIdOrInbox = parts[2];
  if (!actionId || !clientId) return;

  try {
    const { mergeRoutingIntoRecipe, applyRouting } = require('./lib/bot-handlers');
    const { executeAndReport } = require('./lib/execute-and-report');
    const threadTs = body.message && body.message.ts;

    const { rows: checkRows } = await pool.query('SELECT execution_state, execution_recipe FROM aios_actions WHERE id = $1', [actionId]);
    if (checkRows.length === 0 || checkRows[0].execution_state !== 'awaiting_routing') {
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Already routed.' });
      return;
    }

    const parentId = parentIdOrInbox === 'inbox' ? null : parentIdOrInbox;
    const merged = mergeRoutingIntoRecipe(checkRows[0].execution_recipe, { clientId, parentId });
    const applied = await applyRouting(pool, actionId, merged);
    if (!applied) {
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Already routed.' });
      return;
    }

    // Build confirmation message
    const { rows: clientNameRows } = await pool.query('SELECT name FROM clients WHERE id = $1', [clientId]);
    const clientName = clientNameRows[0]?.name || 'Unknown';
    let destLabel = `${clientName} (new AIOS Inbox)`;
    if (parentId) {
      const { rows: parentRows } = await pool.query('SELECT title FROM tasks WHERE id = $1', [parentId]);
      destLabel = `${clientName} > ${parentRows[0]?.title || parentId}`;
    }

    await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: `Filed under ${destLabel}. Executing...` });

    const execResult = await executeAndReport(pool, actionId, {
      internalToken: process.env.AIOS_INTERNAL_TOKEN,
      baseUrl: `http://localhost:${process.env.PORT || 8888}`,
      fetch: globalThis.fetch, pool, log,
      repoRoot: path.resolve(__dirname, '..'),
    }, log);
    await client.chat.postMessage({
      channel: body.channel.id, thread_ts: threadTs,
      text: `${execResult.success ? 'Done' : 'Failed'}: ${JSON.stringify(execResult)}`,
    });
  } catch (err) {
    log('error', 'SlackBot', 'Project routing failed', { error: err.message });
    await client.chat.postMessage({ channel: body.channel.id, text: `Routing failed: ${err.message}` });
  }
});
```

- [ ] **Step 4: Run existing slack-bot tests to check nothing broke**

```bash
npx vitest run tests/unit/slack-bot.test.mjs tests/unit/bot-handlers.test.mjs
```
Expected: all existing tests PASS.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/slack-bot.js
git commit -m "feat(aios): Slack routing handlers for client and project selection"
```

---

### Task 5: API Endpoints (routes/aios.js)

**Files:**
- Modify: `dashboard-server/routes/aios.js`
- Modify: `dashboard-server/tests/unit/aios-routes.test.mjs`

- [ ] **Step 1: Write failing tests for new endpoints**

Append to `dashboard-server/tests/unit/aios-routes.test.mjs`, inside the `describe('AIOS admin routes')` block:

```js
  it('PATCH /api/aios/actions/:id/approve sets awaiting_routing for recipe actions', async () => {
    pool._push({ rows: [{ id: 'a1', execution_recipe: { type: 'task_create' } }], rowCount: 1 }); // pre-check
    pool._push({ rows: [{ id: 'a1', approval_state: 'approved', execution_state: 'awaiting_routing' }], rowCount: 1 }); // update
    const res = await request(app).patch('/api/aios/actions/a1/approve').expect(200);
    expect(res.body.execution_state).toBe('awaiting_routing');
  });

  it('PATCH /api/aios/actions/:id/approve-and-route merges recipe and returns action', async () => {
    pool._push({ rows: [{ id: 'a1', approval_state: 'approved', execution_recipe: { type: 'task_create' }, execution_state: 'pending' }], rowCount: 1 });
    const res = await request(app)
      .patch('/api/aios/actions/a1/approve-and-route')
      .send({ client_id: 'c-1', parent_id: 'p-1' })
      .expect(200);
    expect(res.body.id).toBe('a1');
  });

  it('PATCH /api/aios/actions/:id/approve-and-route returns 404 for missing action', async () => {
    pool._push({ rows: [], rowCount: 0 });
    await request(app)
      .patch('/api/aios/actions/missing/approve-and-route')
      .send({ client_id: null })
      .expect(404);
  });

  it('PATCH /api/aios/actions/:id/route rejects non-awaiting_routing action with 409', async () => {
    pool._push({ rows: [{ id: 'a1', execution_state: 'pending' }], rowCount: 1 }); // SELECT check
    const res = await request(app)
      .patch('/api/aios/actions/a1/route')
      .send({ client_id: 'c-1' })
      .expect(409);
    expect(res.body.error).toContain('awaiting_routing');
  });

  it('PATCH /api/aios/actions/:id/route succeeds for awaiting_routing action', async () => {
    pool._push({ rows: [{ id: 'a1', execution_state: 'awaiting_routing', execution_recipe: { type: 'task_create' } }], rowCount: 1 }); // SELECT check
    pool._push({ rows: [{ id: 'a1', execution_state: 'pending', execution_recipe: { type: 'task_create', client_id: 'c-1' } }], rowCount: 1 }); // UPDATE
    const res = await request(app)
      .patch('/api/aios/actions/a1/route')
      .send({ client_id: 'c-1', parent_id: null })
      .expect(200);
    expect(res.body.id).toBe('a1');
  });

  it('GET /api/aios/routing/clients returns client list', async () => {
    pool._push({ rows: [{ id: 'c-1', name: 'Activision' }, { id: 'c-2', name: 'Couch Heroes' }], rowCount: 2 });
    const res = await request(app).get('/api/aios/routing/clients').expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('Activision');
  });

  it('GET /api/aios/routing/projects returns initiatives for a client', async () => {
    pool._push({ rows: [{ id: 'i-1', title: 'Sprint 1', item_type: 'initiative' }], rowCount: 1 });
    const res = await request(app).get('/api/aios/routing/projects?client_id=c-1').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Sprint 1');
  });

  it('GET /api/aios/routing/projects rejects missing client_id', async () => {
    await request(app).get('/api/aios/routing/projects').expect(400);
  });

  it('GET /api/aios/actions supports execution_state filter', async () => {
    pool._push({ rows: [{ id: 'a1', execution_state: 'awaiting_routing' }], rowCount: 1 });
    const res = await request(app).get('/api/aios/actions?state=approved&execution_state=awaiting_routing').expect(200);
    expect(res.body).toHaveLength(1);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/aios-routes.test.mjs
```
Expected: new tests FAIL (endpoints don't exist yet).

- [ ] **Step 3: Modify approve endpoint in createAdminRoutes**

In `routes/aios.js`, replace the existing approve handler (lines 162-177):

```js
  router.patch('/api/aios/actions/:id/approve', requireAdmin, async (req, res) => {
    const { feedback } = req.body || {};
    try {
      // Check if action has a recipe -- recipe actions enter awaiting_routing
      const { rows: preRows } = await pool.query('SELECT execution_recipe FROM aios_actions WHERE id = $1', [req.params.id]);
      if (preRows.length === 0) return res.status(404).json({ error: 'Not found' });
      const recipeExists = preRows[0].execution_recipe != null;
      const newExecState = recipeExists ? 'awaiting_routing' : 'pending';
      const { rows } = await pool.query(
        `UPDATE aios_actions SET approval_state = 'approved', feedback_signal = $2,
         execution_state = $3, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [req.params.id, feedback || 'approved_unchanged', newExecState]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      await auditLog(req.user.username, 'aios_action_approved', { actionId: req.params.id });
      res.json(rows[0]);
    } catch (err) {
      log('error', 'AIOS-admin', 'Approve failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });
```

- [ ] **Step 4: Add approve-and-route endpoint**

Add after the approve handler:

```js
  router.patch('/api/aios/actions/:id/approve-and-route', requireAdmin, async (req, res) => {
    const { feedback, client_id, parent_id } = req.body || {};
    try {
      const { mergeRoutingIntoRecipe } = require('../lib/bot-handlers');
      const { rows: preRows } = await pool.query('SELECT * FROM aios_actions WHERE id = $1', [req.params.id]);
      if (preRows.length === 0) return res.status(404).json({ error: 'Not found' });
      const action = preRows[0];
      const merged = mergeRoutingIntoRecipe(action.execution_recipe, {
        clientId: client_id === undefined ? null : client_id,
        parentId: parent_id === undefined ? null : parent_id,
      });
      const { rows } = await pool.query(
        `UPDATE aios_actions SET approval_state = 'approved', feedback_signal = $2,
         execution_recipe = $3, execution_state = 'pending', updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [req.params.id, feedback || 'approved_unchanged', JSON.stringify(merged)]
      );
      await auditLog(req.user.username, 'aios_action_approved_routed', { actionId: req.params.id, client_id, parent_id });
      res.json(rows[0]);
    } catch (err) {
      log('error', 'AIOS-admin', 'Approve-and-route failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });
```

- [ ] **Step 5: Add route-only endpoint**

```js
  router.patch('/api/aios/actions/:id/route', requireAdmin, async (req, res) => {
    const { client_id, parent_id } = req.body || {};
    try {
      const { rows: preRows } = await pool.query('SELECT * FROM aios_actions WHERE id = $1', [req.params.id]);
      if (preRows.length === 0) return res.status(404).json({ error: 'Not found' });
      if (preRows[0].execution_state !== 'awaiting_routing') {
        return res.status(409).json({ error: 'Action is not in awaiting_routing state' });
      }
      const { mergeRoutingIntoRecipe } = require('../lib/bot-handlers');
      const merged = mergeRoutingIntoRecipe(preRows[0].execution_recipe, {
        clientId: client_id === undefined ? null : client_id,
        parentId: parent_id === undefined ? null : parent_id,
      });
      const { rows } = await pool.query(
        `UPDATE aios_actions SET execution_recipe = $2, execution_state = 'pending', updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [req.params.id, JSON.stringify(merged)]
      );
      await auditLog(req.user.username, 'aios_action_routed', { actionId: req.params.id, client_id, parent_id });
      res.json(rows[0]);
    } catch (err) {
      log('error', 'AIOS-admin', 'Route failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });
```

- [ ] **Step 6: Add routing data endpoints**

```js
  router.get('/api/aios/routing/clients', requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT id, name FROM clients ORDER BY name');
      res.json(rows);
    } catch (err) {
      log('error', 'AIOS-admin', 'List routing clients failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });

  router.get('/api/aios/routing/projects', requireAdmin, async (req, res) => {
    const clientId = req.query.client_id;
    if (!clientId) return res.status(400).json({ error: 'client_id required' });
    try {
      const { rows } = await pool.query(
        `SELECT id, title, item_type FROM tasks
         WHERE client_id = $1 AND parent_id IS NULL AND item_type = 'initiative'
           AND status NOT IN ('Done', 'Cancelled')
         ORDER BY title`,
        [clientId]
      );
      res.json(rows);
    } catch (err) {
      log('error', 'AIOS-admin', 'List routing projects failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });
```

- [ ] **Step 7: Add execution_state filter to GET /api/aios/actions**

In the existing `GET /api/aios/actions` handler in `createAdminRoutes`, add execution_state filter support. Replace the query:

```js
  router.get('/api/aios/actions', requireAdmin, async (req, res) => {
    const state = req.query.state || 'pending';
    const validStates = ['pending', 'approved', 'rejected', 'snoozed'];
    if (!validStates.includes(state)) {
      return res.status(400).json({ error: `invalid state: ${state}` });
    }
    const execState = req.query.execution_state || null;
    const validExecStates = ['pending', 'in_progress', 'completed', 'failed', 'awaiting_routing'];
    if (execState && !validExecStates.includes(execState)) {
      return res.status(400).json({ error: `invalid execution_state: ${execState}` });
    }
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 50, 200));
    try {
      let sql = `SELECT * FROM aios_actions WHERE approval_state = $1`;
      const params = [state];
      if (execState) {
        sql += ` AND execution_state = $2`;
        params.push(execState);
      }
      sql += ` ORDER BY array_position(ARRAY['critical','high','medium','low']::text[], risk_class) ASC, created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      log('error', 'AIOS-admin', 'List actions failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });
```

- [ ] **Step 8: Run tests**

```bash
npx vitest run tests/unit/aios-routes.test.mjs
```
Expected: all tests PASS (old and new).

- [ ] **Step 9: Commit**

```bash
git add dashboard-server/routes/aios.js dashboard-server/tests/unit/aios-routes.test.mjs
git commit -m "feat(aios): approve-and-route, route, routing data endpoints + execution_state filter"
```

---

### Task 6: Dashboard UI -- AIOS Queue Page

**Files:**
- Create: `dashboard-server/public/js/views/nbi-aios-queue.js`
- Modify: `dashboard-server/public/js/nbi-sidebar.js`
- Modify: `dashboard-server/public/js/views/nbi-settings.js`
- Modify: `dashboard-server/nbi_project_dashboard.html` (repo root: `nbi_project_dashboard.html`)

- [ ] **Step 1: Create nbi-aios-queue.js**

Create `dashboard-server/public/js/views/nbi-aios-queue.js`:

```js
// ==================== AIOS ACTION QUEUE ====================
// Admin-only page for reviewing, approving, and routing AIOS actions.

let _aiosData = null;
let _aiosTab = 'pending';
let _aiosRoutingActionId = null;
let _aiosRoutingAction = null;
let _aiosRoutingClients = null;
let _aiosRoutingProjects = null;
let _aiosRoutingSelectedClientId = null;
let _aiosPollingTimer = null;

async function loadAiosActions(state) {
  try {
    const params = new URLSearchParams({ state });
    if (state === 'approved' && _aiosTab === 'awaiting_routing') {
      params.set('execution_state', 'awaiting_routing');
    }
    const data = await apiCall('/api/aios/actions?' + params.toString());
    _aiosData = data || [];
  } catch (e) {
    _aiosData = [];
  }
}

function _aiosTabState() {
  if (_aiosTab === 'awaiting_routing') return 'approved';
  if (_aiosTab === 'in_progress') return 'approved';
  if (_aiosTab === 'completed') return 'approved';
  if (_aiosTab === 'failed') return 'approved';
  return _aiosTab;
}

async function switchAiosTab(tab) {
  _aiosTab = tab;
  _aiosData = null;
  renderContent();
  const state = _aiosTabState();
  const params = new URLSearchParams({ state });
  if (tab === 'awaiting_routing') params.set('execution_state', 'awaiting_routing');
  else if (tab === 'in_progress') params.set('execution_state', 'in_progress');
  else if (tab === 'completed') params.set('execution_state', 'completed');
  else if (tab === 'failed') params.set('execution_state', 'failed');
  try {
    _aiosData = await apiCall('/api/aios/actions?' + params.toString()) || [];
  } catch (e) {
    _aiosData = [];
  }
  renderContent();
}

function _aiosRiskColour(risk) {
  if (risk === 'critical') return 'var(--danger)';
  if (risk === 'high') return 'var(--warning)';
  if (risk === 'medium') return 'var(--accent)';
  return 'var(--text-muted)';
}

function _aiosRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function renderAiosQueueView(container) {
  if (_aiosData === null) {
    container.innerHTML = '<div style="padding:24px"><div class="skeleton skeleton-card"></div>' +
      Array(4).fill('<div class="skeleton skeleton-row"></div>').join('') +
      '<span class="visually-hidden">Loading AIOS actions</span></div>';
    loadAiosActions(_aiosTabState()).then(() => { if (currentView === 'aios') renderContent(); });
    return;
  }

  const tabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'awaiting_routing', label: 'Awaiting Routing' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'failed', label: 'Failed' },
  ];

  let html = '<div style="padding:var(--space-xl)">';
  html += '<h2 style="font-family:var(--font-display);font-size:1.25rem;margin-bottom:var(--space-lg)">AIOS Action Queue</h2>';

  // Tab bar
  html += '<div style="display:flex;gap:4px;margin-bottom:var(--space-lg);border-bottom:1px solid var(--border-default)">';
  tabs.forEach(t => {
    const active = _aiosTab === t.key;
    html += `<button class="btn btn--sm ${active ? 'btn--primary' : 'btn--ghost'}" style="border-radius:var(--radius-md) var(--radius-md) 0 0;border-bottom:none" data-action="switchAiosTab" data-arg0="${t.key}">${esc(t.label)}</button>`;
  });
  html += '</div>';

  // Action cards
  if (_aiosData.length === 0) {
    html += '<div style="padding:24px;text-align:center;color:var(--text-muted);border:1px dashed var(--border-default);border-radius:var(--radius-md)">No actions in this state.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:var(--space-md)">';
    _aiosData.forEach(a => {
      html += _renderAiosCard(a);
    });
    html += '</div>';
  }

  html += '</div>';

  // Routing modal overlay + panel
  html += '<div id="aiosRoutingOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:999" data-action="closeAiosRouting"></div>';
  html += '<div id="aiosRoutingPanel" style="display:none;position:fixed;top:0;right:0;width:400px;max-width:90vw;height:100vh;background:var(--bg-surface);border-left:1px solid var(--border-default);z-index:1000;overflow-y:auto;padding:var(--space-xl);box-shadow:-4px 0 24px rgba(0,0,0,0.2)"></div>';

  container.innerHTML = html;

  // Start polling
  if (_aiosPollingTimer) clearInterval(_aiosPollingTimer);
  _aiosPollingTimer = setInterval(async () => {
    if (currentView !== 'aios') { clearInterval(_aiosPollingTimer); _aiosPollingTimer = null; return; }
    const state = _aiosTabState();
    const params = new URLSearchParams({ state });
    if (_aiosTab === 'awaiting_routing') params.set('execution_state', 'awaiting_routing');
    else if (_aiosTab === 'in_progress') params.set('execution_state', 'in_progress');
    else if (_aiosTab === 'completed') params.set('execution_state', 'completed');
    else if (_aiosTab === 'failed') params.set('execution_state', 'failed');
    try {
      _aiosData = await apiCall('/api/aios/actions?' + params.toString()) || [];
      if (currentView === 'aios' && !_aiosRoutingActionId) renderContent();
    } catch (e) { /* silent */ }
  }, 30000);
}

function _renderAiosCard(a) {
  const riskCol = _aiosRiskColour(a.risk_class);
  const recipeType = a.execution_recipe?.type || '';
  let html = `<div style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:var(--space-md) var(--space-lg)">`;
  // Header row
  html += `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">`;
  html += `<div style="flex:1"><strong style="color:var(--text-primary);font-size:0.9rem">${esc(a.title)}</strong>`;
  html += `<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">`;
  html += `<span style="font-size:0.7rem;padding:1px 6px;border-radius:10px;background:var(--bg-input);color:var(--text-muted)">${esc(a.action_type)}</span>`;
  html += `<span style="font-size:0.7rem;padding:1px 6px;border-radius:10px;background:var(--bg-input);color:${riskCol}">${esc(a.risk_class)}</span>`;
  if (recipeType) html += `<span style="font-size:0.7rem;padding:1px 6px;border-radius:10px;background:var(--bg-input);color:var(--accent)">${esc(recipeType)}</span>`;
  html += `<span style="font-size:0.7rem;color:var(--text-muted)">${esc(a.source_system || '')}</span>`;
  html += `</div></div>`;
  html += `<span style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap">${_aiosRelativeTime(a.created_at)}</span>`;
  html += `</div>`;
  // Description
  if (a.description) {
    const desc = a.description.length > 150 ? a.description.slice(0, 150) + '...' : a.description;
    html += `<div style="margin-top:8px;font-size:0.82rem;color:var(--text-secondary)">${esc(desc)}</div>`;
  }
  // Actions
  html += `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">`;
  if (_aiosTab === 'pending') {
    html += `<button class="btn btn--sm btn--primary" data-action="openAiosRouting" data-arg0="${a.id}">Approve</button>`;
    html += `<button class="btn btn--sm btn--ghost" data-action="aiosSkip" data-arg0="${a.id}">Skip</button>`;
    html += `<button class="btn btn--sm btn--ghost" data-action="aiosSnooze" data-arg0="${a.id}">Snooze</button>`;
  } else if (_aiosTab === 'awaiting_routing') {
    html += `<button class="btn btn--sm btn--primary" data-action="openAiosRouting" data-arg0="${a.id}">Route Now</button>`;
    html += `<button class="btn btn--sm btn--ghost" data-action="aiosSkip" data-arg0="${a.id}">Skip</button>`;
  } else if (_aiosTab === 'completed' || _aiosTab === 'failed') {
    const result = a.execution_result || {};
    const summary = a.execution_state === 'failed' ? (result.error || 'Unknown error') : (result.created_id ? `Created: ${result.created_id}` : 'Done');
    html += `<span style="font-size:0.78rem;color:${a.execution_state === 'failed' ? 'var(--danger)' : 'var(--success)'}">${esc(summary)}</span>`;
    if (_aiosTab === 'failed') {
      html += `<button class="btn btn--sm btn--ghost" data-action="openAiosRouting" data-arg0="${a.id}">Retry</button>`;
    }
  } else if (_aiosTab === 'in_progress') {
    html += `<span style="font-size:0.78rem;color:var(--accent)">Executing...</span>`;
  }
  html += `</div></div>`;
  return html;
}

async function openAiosRouting(actionId) {
  _aiosRoutingActionId = actionId;
  _aiosRoutingAction = (_aiosData || []).find(a => a.id === actionId) || null;
  _aiosRoutingSelectedClientId = null;
  _aiosRoutingProjects = null;
  // Load clients
  try {
    _aiosRoutingClients = await apiCall('/api/aios/routing/clients');
  } catch (e) {
    _aiosRoutingClients = [];
  }
  _renderAiosRoutingPanel();
  const overlay = document.getElementById('aiosRoutingOverlay');
  const panel = document.getElementById('aiosRoutingPanel');
  if (overlay) overlay.style.display = 'block';
  if (panel) panel.style.display = 'block';
}

function closeAiosRouting() {
  _aiosRoutingActionId = null;
  _aiosRoutingAction = null;
  _aiosRoutingClients = null;
  _aiosRoutingProjects = null;
  _aiosRoutingSelectedClientId = null;
  const overlay = document.getElementById('aiosRoutingOverlay');
  const panel = document.getElementById('aiosRoutingPanel');
  if (overlay) overlay.style.display = 'none';
  if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
}

function _renderAiosRoutingPanel() {
  const panel = document.getElementById('aiosRoutingPanel');
  if (!panel || !_aiosRoutingAction) return;
  const a = _aiosRoutingAction;
  const clients = _aiosRoutingClients || [];

  let html = '';
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)">`;
  html += `<h3 style="font-family:var(--font-display);font-size:1rem;margin:0">Route Action</h3>`;
  html += `<button class="btn btn--sm btn--ghost" data-action="closeAiosRouting">&times;</button>`;
  html += `</div>`;
  html += `<div style="margin-bottom:var(--space-lg);padding:var(--space-md);background:var(--bg-input);border-radius:var(--radius-md)">`;
  html += `<strong>${esc(a.title)}</strong>`;
  if (a.description) html += `<div style="margin-top:4px;font-size:0.82rem;color:var(--text-secondary)">${esc(a.description)}</div>`;
  html += `</div>`;

  // Step 1: Client select
  html += `<label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">Destination Client</label>`;
  html += `<select id="aiosRoutingClientSelect" onchange="_aiosOnClientSelect(this.value)" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem;margin-bottom:var(--space-md)">`;
  html += `<option value="">Select...</option>`;
  html += `<option value="none">AIOS Inbox (no client)</option>`;
  clients.forEach(c => {
    const sel = _aiosRoutingSelectedClientId === c.id ? ' selected' : '';
    html += `<option value="${esc(c.id)}"${sel}>${esc(c.name)}</option>`;
  });
  html += `</select>`;

  // Step 2: Project select (if client selected)
  if (_aiosRoutingSelectedClientId && _aiosRoutingSelectedClientId !== 'none') {
    if (_aiosRoutingProjects === null) {
      html += `<div style="color:var(--text-muted);font-size:0.82rem">Loading projects...</div>`;
    } else if (_aiosRoutingProjects.length === 0) {
      html += `<div style="padding:8px;color:var(--text-muted);font-size:0.82rem;border:1px dashed var(--border-default);border-radius:var(--radius-md);margin-bottom:var(--space-md)">No existing projects. Will create AIOS Inbox under this client.</div>`;
    } else if (_aiosRoutingProjects.length === 1) {
      html += `<div style="padding:8px;font-size:0.82rem;color:var(--text-secondary);margin-bottom:var(--space-md)">Filing under: <strong>${esc(_aiosRoutingProjects[0].title)}</strong></div>`;
    } else {
      html += `<label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">Destination Project</label>`;
      html += `<select id="aiosRoutingProjectSelect" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem;margin-bottom:var(--space-md)">`;
      _aiosRoutingProjects.forEach(p => {
        html += `<option value="${esc(p.id)}">${esc(p.title)}</option>`;
      });
      html += `<option value="inbox">New in AIOS Inbox</option>`;
      html += `</select>`;
    }
  }

  // Confirm button
  const canConfirm = _aiosRoutingSelectedClientId != null;
  html += `<div style="margin-top:var(--space-lg);display:flex;gap:8px">`;
  html += `<button class="btn btn--primary" ${canConfirm ? '' : 'disabled'} data-action="confirmAiosRouting" style="flex:1">Confirm & Execute</button>`;
  html += `<button class="btn" data-action="closeAiosRouting">Cancel</button>`;
  html += `</div>`;

  // Result area
  html += `<div id="aiosRoutingResult" style="margin-top:var(--space-md)"></div>`;

  panel.innerHTML = html;
}

async function _aiosOnClientSelect(val) {
  if (!val) { _aiosRoutingSelectedClientId = null; _aiosRoutingProjects = null; _renderAiosRoutingPanel(); return; }
  _aiosRoutingSelectedClientId = val;
  _aiosRoutingProjects = null;
  _renderAiosRoutingPanel();
  if (val !== 'none') {
    try {
      _aiosRoutingProjects = await apiCall('/api/aios/routing/projects?client_id=' + encodeURIComponent(val));
    } catch (e) {
      _aiosRoutingProjects = [];
    }
    _renderAiosRoutingPanel();
  }
}

async function confirmAiosRouting() {
  if (!_aiosRoutingActionId || !_aiosRoutingSelectedClientId) return;
  const resultEl = document.getElementById('aiosRoutingResult');
  if (resultEl) resultEl.innerHTML = '<div style="color:var(--accent);font-size:0.82rem">Executing...</div>';

  const clientId = _aiosRoutingSelectedClientId === 'none' ? null : _aiosRoutingSelectedClientId;
  let parentId = null;
  if (clientId && _aiosRoutingProjects) {
    if (_aiosRoutingProjects.length === 1) {
      parentId = _aiosRoutingProjects[0].id;
    } else if (_aiosRoutingProjects.length > 1) {
      const sel = document.getElementById('aiosRoutingProjectSelect');
      const selVal = sel ? sel.value : null;
      parentId = selVal === 'inbox' ? null : selVal;
    }
  }

  const isPending = _aiosRoutingAction && _aiosRoutingAction.approval_state === 'pending';
  const endpoint = isPending
    ? `/api/aios/actions/${_aiosRoutingActionId}/approve-and-route`
    : `/api/aios/actions/${_aiosRoutingActionId}/route`;

  try {
    const body = { client_id: clientId, parent_id: parentId };
    if (isPending) body.feedback = 'approved_unchanged';
    const res = await apiCall(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resultEl) resultEl.innerHTML = `<div style="color:var(--success);font-size:0.82rem">Routed successfully.</div>`;
    setTimeout(() => { closeAiosRouting(); switchAiosTab(_aiosTab); }, 1500);
  } catch (e) {
    if (resultEl) resultEl.innerHTML = `<div style="color:var(--danger);font-size:0.82rem">Failed: ${esc(e.message || 'Unknown error')}</div>`;
  }
}

async function aiosSkip(actionId) {
  try {
    await apiCall(`/api/aios/actions/${actionId}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Skipped from AIOS Queue', feedback: 'rejected_not_worth' }),
    });
    switchAiosTab(_aiosTab);
  } catch (e) {
    toast('Skip failed: ' + (e.message || ''), 'error');
  }
}

async function aiosSnooze(actionId) {
  try {
    await apiCall(`/api/aios/actions/${actionId}/snooze`, { method: 'PATCH' });
    switchAiosTab(_aiosTab);
  } catch (e) {
    toast('Snooze failed: ' + (e.message || ''), 'error');
  }
}
```

- [ ] **Step 2: Add sidebar entry in nbi-sidebar.js**

In `dashboard-server/public/js/nbi-sidebar.js`, after the Bug Tracker sidebar item (after line 107, before `html += sidebarSectionClose();`), add:

```js
  const svgAios = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12v8H2z"/><path d="M8 4v8M2 8h12"/><circle cx="5" cy="6" r="1" fill="currentColor" stroke="none"/><path d="M11 10l-2-2"/></svg>';
  if (!isScoped && hasPageAccess('aios')) {
    html += sidebarItem(svgAios, 'AIOS Queue', '', () => switchView('aios'), currentView==='aios');
  }
```

- [ ] **Step 3: Add 'aios' to known routes in nbi-sidebar.js**

In `nbi-sidebar.js` line 785, add `'aios'` to the known array:

Change:
```js
  const known = ['report','dashboard','tasks','people','leads','expenses','finances','news','bugs','settings','mytasks','queue','reporting','documentation','workload','hiring','commandcentre'];
```
To:
```js
  const known = ['report','dashboard','tasks','people','leads','expenses','finances','news','bugs','settings','mytasks','queue','reporting','documentation','workload','hiring','commandcentre','aios'];
```

- [ ] **Step 4: Add view case in _renderMainContent in nbi-sidebar.js**

In `nbi-sidebar.js`, after the `else if (currentView === 'activity')` line (line 914), add:

```js
  else if (currentView === 'aios') renderAiosQueueView(content);
```

- [ ] **Step 5: Add 'aios' to RBAC pages in nbi-settings.js**

In `dashboard-server/public/js/views/nbi-settings.js` line 284, change:
```js
      const pages = ['finances', 'leads', 'expenses'];
```
To:
```js
      const pages = ['finances', 'leads', 'expenses', 'aios'];
```

- [ ] **Step 6: Add script tag in nbi_project_dashboard.html**

In `nbi_project_dashboard.html`, before the nbi-sidebar.js script tag (before line 351), add:

```html
<script src="/public/js/views/nbi-aios-queue.js?v=1"></script>
```

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/public/js/views/nbi-aios-queue.js dashboard-server/public/js/nbi-sidebar.js dashboard-server/public/js/views/nbi-settings.js nbi_project_dashboard.html
git commit -m "feat(aios): AIOS Queue dashboard page with approval routing modal"
```

---

### Task 7: Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full unit test suite**

```bash
cd dashboard-server && npm test
```
Expected: all tests pass, zero failures.

- [ ] **Step 2: Restart dashboard and apply migration**

```bash
pm2 restart nbi-dashboard
pm2 logs nbi-dashboard --lines 30
```
Expected: "Applied migration 080" in logs, server healthy.

- [ ] **Step 3: Verify AIOS Queue page loads in browser**

Open `http://localhost:8888/nbi_project_dashboard.html#aios` and verify:
- Page loads without JS errors (check browser console)
- Tab bar renders (Pending, Awaiting Routing, etc.)
- If there are pending actions, they appear as cards
- Clicking Approve opens the routing modal
- Client dropdown populates from the database

- [ ] **Step 4: Run e2e test suite**

```bash
cd dashboard-server && npm run test:e2e
```
Expected: all existing e2e tests pass (no regressions).

- [ ] **Step 5: Restart slack bot**

```bash
pm2 restart nbi-slack-bot
pm2 logs nbi-slack-bot --lines 10
```
Expected: "Slack bot running (Socket Mode)" in logs.

- [ ] **Step 6: Commit any fixes from integration**

If any fixes were needed, commit them:
```bash
git add -A
git commit -m "fix(aios): integration fixes from routing verification"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Migration: Task 1
- [x] Shared execute-and-report: Task 2
- [x] Bot-handlers routing functions + handleButtonAction modify: Task 3
- [x] Slack routing handlers (client + project): Task 4
- [x] API: approve modify, approve-and-route, route, routing/clients, routing/projects, execution_state filter: Task 5
- [x] Dashboard UI: AIOS Queue page, routing modal, sidebar, RBAC: Task 6
- [x] Integration verification: Task 7
- [x] Spec requirement: "needsRouting flag" -- Task 3 step 4
- [x] Spec requirement: "auto-select single initiative" -- Task 4 step 2 (zero/one initiative branches)
- [x] Spec requirement: "stale routing guard" -- Task 4 steps 2-3 (execution_state check)
- [x] Spec requirement: "merge clears client_slug" -- Task 3 step 3 (mergeRoutingIntoRecipe)
- [x] Spec requirement: "no backdoor on approve" -- Task 3 step 4 + Task 5 step 3

**Placeholder scan:** No TBD, TODO, or vague "add appropriate" language found.

**Type consistency:**
- `mergeRoutingIntoRecipe(recipe, { clientId, parentId })` -- used consistently in Tasks 3, 4, 5
- `applyRouting(pool, actionId, mergedRecipe)` -- used consistently in Tasks 3, 4
- `executeAndReport(pool, actionId, ctx, log, executorOverride?)` -- consistent in Tasks 2, 4
- `buildRoutingClientBlocks(action, clients)` / `buildRoutingProjectBlocks(action, clientId, clientName, initiatives)` -- consistent in Tasks 3, 4
