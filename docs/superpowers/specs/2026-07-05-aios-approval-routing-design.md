# AIOS Approval Client-Routing -- Design Spec

**Date:** 2026-07-05
**Directive:** Glen 2026-07-05 16:20 -- "it should also check anything that's approved to ask if should be a project item to add to a client."
**Scope:** All recipe types (task_create, initiative_build, research_brief), both Slack and Dashboard surfaces.
**Approach:** Sequential routing messages (Approach A from brainstorming).

## Problem

Approved AIOS actions auto-execute into the global AIOS Inbox initiative. There is no opportunity to route them to a specific client's project tree. Glen wants every approved action to go through a routing step: which client, and which project under that client (or keep in AIOS Inbox).

## Design

### 1. Database

**Migration `080_aios_routing.sql`:** Add `awaiting_routing` to the `execution_state` CHECK constraint.

```sql
ALTER TABLE aios_actions DROP CONSTRAINT aios_actions_execution_state_check;
ALTER TABLE aios_actions ADD CONSTRAINT aios_actions_execution_state_check
  CHECK (execution_state IN ('pending', 'in_progress', 'completed', 'failed', 'awaiting_routing'));
```

No new columns. Routing choices (selected `client_id` and `parent_id`) are merged into the existing `execution_recipe` JSONB column before execution fires.

**Merge semantics:** Routing writes `client_id` (uuid or null) and `parent_id` (uuid or null) into `execution_recipe`. If `client_id` is set, `client_slug` is cleared (prevents the executor's `resolveClientId` from re-resolving from the slug and ignoring the routing choice). Routing values overwrite whatever the signal engine originally set.

**Cron compatibility:** `fetchPendingExecutions` already filters `execution_state = 'pending'`, so `awaiting_routing` rows are automatically skipped. No changes to the cron.

### 2. Slack Routing Flow

#### Trigger

In `slack-bot.js`, the approve button handler currently calls `executeAction` immediately when `triggerExecutor` is true. The new flow intercepts here:

1. Check if the action has a recipe (`execution_recipe IS NOT NULL`).
2. If yes: set `execution_state = 'awaiting_routing'`, post routing question. Do NOT execute.
3. If no recipe: current behaviour (approval is terminal, no execution).

**Message change:** `handleButtonAction` currently returns `message: "Approved: {title}. Executor will process shortly (recipe: {type})."` when `triggerExecutor` is true. Change this to return a new flag `needsRouting: true` alongside `triggerExecutor`. The Slack handler uses this to post "Approved: {title}. Routing..." instead of the "will process shortly" text, then immediately follows with the routing question. This prevents the confusing sequence of "will process shortly" followed by "Where should this go?"

#### Step 1 -- Client question

Post a message in the same thread: "Where should this go?" with a `static_select` (action_id: `aios_route_client`).

Options:
- First: "AIOS Inbox (no client)" with value `{actionId}:none`
- Then: all clients alphabetically from `SELECT id, name FROM clients ORDER BY name`, each with value `{actionId}:{clientId}`

#### Step 2 -- Handle client selection

New `app.action('aios_route_client')` handler:

- **Guard:** Query `execution_state` for the action. If not `awaiting_routing`, reply "Already routed" and return. (Handles the stale-routing-question race where Glen routes from the dashboard while a Slack question is pending.)
- **"No client" selected:** Merge `{ client_id: null, client_slug: null, parent_id: null }` into `execution_recipe`. Set `execution_state = 'pending'`. Trigger immediate execution (shared execute-and-report function). Done.
- **Client selected:** Query existing initiatives: `SELECT id, title FROM tasks WHERE client_id = $1 AND parent_id IS NULL AND item_type = 'initiative' AND status NOT IN ('Done', 'Cancelled') ORDER BY title`.
  - If zero initiatives: skip the project dropdown entirely. Auto-route to "New in AIOS Inbox" for that client (parent_id = null, resolveInboxParentId creates it on execution). Merge, set pending, execute.
  - If one initiative: skip the dropdown. Show read-only text "Filing under {initiativeName}" and auto-select that initiative as parent_id. Merge, set pending, execute.
  - If multiple: Post second message "Which project under {clientName}?" with `static_select` (action_id: `aios_route_project`). Options: each initiative with value `{actionId}:{clientId}:{initiativeId}`, plus "New in AIOS Inbox" with value `{actionId}:{clientId}:inbox`.

#### Step 3 -- Handle project selection

New `app.action('aios_route_project')` handler:

- **Guard:** Same `awaiting_routing` check.
- **"inbox" selected:** Merge `{ client_id, client_slug: null, parent_id: null }`. `resolveInboxParentId` will find-or-create the inbox for this client on execution.
- **Initiative selected:** Merge `{ client_id, client_slug: null, parent_id: initiativeId }`. Executor uses this parent directly.
- Set `execution_state = 'pending'`. Trigger immediate execution.
- Post confirmation: "Filed under {clientName} > {projectTitle}. Executing..."

#### New pure functions in bot-handlers.js

- `buildRoutingClientBlocks(action, clients)` -- returns Slack block array for the client routing question.
- `buildRoutingProjectBlocks(action, clientName, initiatives)` -- returns Slack block array for the project routing question.
- `mergeRoutingIntoRecipe(recipe, { clientId, parentId })` -- returns new recipe JSONB with routing values merged, `client_slug` cleared if `clientId` set. Pure, no DB access.
- `applyRouting(pool, actionId, mergedRecipe)` -- UPDATE execution_recipe and set execution_state = 'pending'. Returns the updated action row.

### 3. API Changes

All new endpoints live in `routes/aios.js` behind `requireAdmin`.

#### 3a. Modify existing approve endpoint

`PATCH /api/aios/actions/:id/approve` -- after setting `approval_state = 'approved'`, check if the action has `execution_recipe IS NOT NULL`:
- If yes: set `execution_state = 'awaiting_routing'` (not `pending`).
- If no: leave `execution_state = 'pending'` (no execution needed, current behaviour).

This closes the backdoor: no approval path can bypass routing for recipe actions.

#### 3b. New approve-and-route endpoint

`PATCH /api/aios/actions/:id/approve-and-route`

Request body:
```json
{
  "feedback": "approved_unchanged",
  "client_id": "uuid-or-null",
  "parent_id": "uuid-or-null"
}
```

Behaviour:
1. Set `approval_state = 'approved'`, `feedback_signal = feedback || 'approved_unchanged'`.
2. Merge routing into `execution_recipe` (same `mergeRoutingIntoRecipe` function).
3. If action has a recipe, trigger inline execution:
   a. Set `execution_state = 'in_progress'`.
   b. Call `executeAction`.
   c. On success: set `execution_state = 'completed'`, `execution_result = result`.
   d. On error: set `execution_state = 'failed'`, `execution_result = { error: message }`.
   e. Return the updated action with execution result.
4. If no recipe: set `execution_state = 'pending'`, return action.
5. Audit-logged.

#### 3c. Route-only endpoint (for actions already approved but awaiting routing)

`PATCH /api/aios/actions/:id/route`

Request body:
```json
{
  "client_id": "uuid-or-null",
  "parent_id": "uuid-or-null"
}
```

Behaviour:
1. Guard: action must be `approval_state = 'approved'` AND `execution_state = 'awaiting_routing'`. Otherwise 409.
2. Merge routing into recipe, trigger execution (same pattern as approve-and-route).

#### 3d. Routing data endpoints

- `GET /api/aios/routing/clients` -- `SELECT id, name FROM clients ORDER BY name`. Admin-only.
- `GET /api/aios/routing/projects?client_id=uuid` -- `SELECT id, title, item_type FROM tasks WHERE client_id = $1 AND parent_id IS NULL AND item_type = 'initiative' AND status NOT IN ('Done', 'Cancelled') ORDER BY title`. Admin-only.

#### 3e. Execution state filter

Existing `GET /api/aios/actions` gains optional `execution_state` query parameter:
`?state=approved&execution_state=awaiting_routing` returns actions stuck waiting for routing.

### 4. Dashboard UI -- AIOS Queue Page

#### Navigation

New sidebar item "AIOS Queue" in the Views section, admin-only (`hasPageAccess('aios')`). SVG icon: inbox/routing motif. Position: after Bug Tracker.

#### View registration

- New case `'aios'` in `_renderMainContent` calling `renderAiosQueueView(content)`.
- New JS module: `public/js/nbi-aios-queue.js`, loaded via `<script>` tag in `nbi_project_dashboard.html`.
- Add `'aios'` to the `known` array in the hash router (line ~785 of nbi-sidebar.js).
- Add `'aios'` to the `pages` array in `public/js/views/nbi-settings.js` (line ~284) so it appears in the RBAC configuration panel. `hasPageAccess('aios')` returns true for admins by default (no server-side config needed), but adding it to the settings page lets admins grant access to non-admin users if desired.

#### Page layout

Header: "AIOS Action Queue" with tab bar for state filters:
- **Pending** (default) -- actions awaiting Glen's approval
- **Awaiting Routing** -- approved but not yet routed (sorted by age, oldest first)
- **In Progress** -- currently executing
- **Completed** -- successfully executed (most recent first)
- **Failed** -- execution failed (most recent first, with error summary)

Each action renders as a card:
- Title (bold), action_type badge, risk_class badge (colour-coded), source_system
- Truncated description (first 150 chars)
- Created timestamp, relative age
- Recipe type badge if present

Card actions by state:
- **Pending:** Approve (opens routing modal), Skip, Snooze, Tell me more (expand description)
- **Awaiting Routing:** "Route Now" (opens routing modal), Skip (sets rejected)
- **In Progress:** Read-only, spinner
- **Completed:** Read-only, execution result summary (created_id, title, parent)
- **Failed:** Read-only, error message, "Retry" button (re-opens routing modal to approve-and-route again)

#### Routing modal

Slide-in panel (same pattern as milestone detail panel):
- ESC to close, overlay click to close
- Step 1: Client select dropdown. Options from `GET /api/aios/routing/clients`. First option: "AIOS Inbox (no client)".
- Step 2: When a client is selected, project dropdown loads from `GET /api/aios/routing/projects?client_id=X`.
  - If zero initiatives for client: show message "No existing projects. Will create AIOS Inbox under {client}." No dropdown.
  - If one initiative: auto-select it, show as read-only text.
  - If multiple: dropdown with initiatives + "New in AIOS Inbox" option.
- Confirm button: calls `PATCH /api/aios/actions/:id/approve-and-route` (for pending actions) or `PATCH /api/aios/actions/:id/route` (for awaiting_routing actions).
- Loading state while execution runs. Result displayed on completion.

#### Data loading

`apiCall('/api/aios/actions?state=pending')` on view entry. State changes via tab clicks reload with the appropriate state parameter. Polling every 30 seconds for the active tab.

### 5. Executor Changes

Minimal. The executor runs AFTER routing, so `execution_recipe` already contains the correct `client_id` and `parent_id`.

**`executeTaskRecipe`:** No changes. Existing logic:
- If `parent_id` set (from routing): use directly.
- If `parent_id` null but `client_id` set (from routing): `resolveInboxParentId(ctx, clientId)` creates/finds inbox.
- If neither set: `resolveClientId` from `client_slug` (cleared by routing, so falls through to global inbox).

**`executeInitiativeRecipe`:** The `buildInitiativePrompt` has a conditional for `client_slug`. Extend to also check `client_id`: if present, query client name and inject `Set client_id to {id}` in the prompt (skip the LIKE lookup instruction). Small prompt change.

**`executeResearchRecipe`:** The `buildResearchPrompt` doesn't reference clients. Client-specific output paths for research briefs are out of scope for this feature. Research briefs execute with their existing output path regardless of routing. The routing `client_id` is available in the recipe if a future enhancement needs it.

**Shared execute-and-report function:** Extract from the Slack bot's inline execution block into `lib/execute-and-report.js`:
```js
async function executeAndReport(pool, actionId, ctx, log) {
  const { executeAction, getRecipeType, markExecutionState } = require('./executor');
  const { rows: [action] } = await pool.query('SELECT * FROM aios_actions WHERE id = $1', [actionId]);
  if (!action || getRecipeType(action) === 'unknown') {
    return { success: false, error: 'No executable recipe' };
  }
  await markExecutionState(pool, action.id, 'in_progress', null);
  try {
    const result = await executeAction(action, ctx);
    await markExecutionState(pool, action.id, result.success ? 'completed' : 'failed', result);
    return result;
  } catch (err) {
    await markExecutionState(pool, action.id, 'failed', { error: err.message });
    return { success: false, error: err.message };
  }
}
```

Both Slack and dashboard API use this. No duplication of error handling.

### 6. Testing

#### Unit tests -- bot-handlers (bot-handlers.test.mjs or extend existing)

- `buildRoutingClientBlocks`: returns correct Slack blocks with client list + "AIOS Inbox" first option. Action IDs encode correctly. Empty client list produces only the inbox option.
- `buildRoutingProjectBlocks`: returns correct blocks with initiatives + "New in AIOS Inbox". Empty initiative list returns null (signals auto-route, no dropdown needed).
- `mergeRoutingIntoRecipe`: client_id set clears client_slug. parent_id preserved. Existing recipe fields not clobbered. Null client_id keeps recipe unchanged except routing fields.
- Stale routing guard: `applyRouting` rejects when action is not `awaiting_routing`.

#### Unit tests -- routes/aios (aios-routes.test.mjs or extend existing)

- `approve` sets `awaiting_routing` for recipe actions, `pending` for non-recipe.
- `approve-and-route` merges recipe, triggers execution, returns result.
- `approve-and-route` marks `failed` on execution error (not stuck in `in_progress`).
- `route` rejects non-awaiting_routing actions with 409.
- `routing/clients` returns alphabetical client list.
- `routing/projects` returns initiatives for client, excludes Done/Cancelled.
- Execution state filter: `?execution_state=awaiting_routing` works.

#### Unit tests -- execute-and-report (execute-and-report.test.mjs)

- Success path: marks in_progress then completed.
- Error path: marks in_progress then failed with error message.
- Unknown recipe: returns error without marking in_progress.

#### Migration test

- Insert a row with `execution_state = 'awaiting_routing'` succeeds after migration.
- CHECK constraint still rejects invalid values.

#### E2E (Playwright)

- Navigate to `#aios`, verify page loads with action cards.
- Click Approve on a pending action, routing modal appears.
- Select a client, project dropdown loads.
- Confirm, action moves to completed/failed state.
- Requires test seed data in `aios_actions` with a recipe.

### 7. Files Touched

| File | Change |
|---|---|
| `migrations/080_aios_routing.sql` | New. CHECK constraint update. |
| `lib/bot-handlers.js` | New functions: buildRoutingClientBlocks, buildRoutingProjectBlocks, mergeRoutingIntoRecipe, applyRouting. |
| `lib/execute-and-report.js` | New. Shared execution + error handling. |
| `slack-bot.js` | Two new `app.action` handlers (aios_route_client, aios_route_project). Modify approve handler to route instead of execute. |
| `routes/aios.js` | Modify approve endpoint. New endpoints: approve-and-route, route, routing/clients, routing/projects. Execution state filter. |
| `public/js/nbi-aios-queue.js` | New. AIOS Queue view rendering + routing modal. |
| `nbi_project_dashboard.html` | New script tag for nbi-aios-queue.js. |
| `public/js/nbi-sidebar.js` | New sidebar item. Add 'aios' to known routes. |
| `public/js/views/nbi-settings.js` | Add 'aios' to RBAC `pages` array (line ~284). |
| `tests/` | New test files for routing logic, API endpoints, execute-and-report. |

### 8. Worktree

This touches 8+ files across lib, routes, frontend, and migrations. Per CLAUDE.md rules: worktree required.

### 9. Open Questions (resolved during brainstorming)

All resolved:
- **Which recipe types?** All (task_create, initiative_build, research_brief).
- **Which surfaces?** Both Slack and Dashboard (full UI).
- **Granularity?** Client + existing project (two-step).
- **Backdoor?** Closed. Existing approve endpoint sets awaiting_routing for recipe actions.
- **Stale routing?** Guarded. Slack handler checks execution_state before acting.
- **Single-option dropdown?** Skipped. Auto-route when zero or one initiatives.
- **Merge semantics?** Explicit. Routing client_id overwrites, client_slug cleared.
- **Stuck actions?** Visible in dashboard Awaiting Routing tab, sorted by age.
- **Error handling?** Shared function, same pattern both surfaces, marks failed on throw.
