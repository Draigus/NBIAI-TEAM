# Configurable Work Item Hierarchy -- Design Spec

**Date:** 2026-07-01
**Status:** Draft for Glen review
**Requested by:** Couch Heroes (client request via Glen)
**Repo:** NBIAI_TEAM (`dashboard-server/` + `nbi_project_dashboard.html`)

## 1. Summary

Add **Initiative** as a new top-level work item type, making the full hierarchy:

**Client > Initiative > Project > Feature > Story > Task**

Three capabilities ship together:

1. **Initiative level.** New `item_type` value `'initiative'`, mandatory true root of the item tree. Same field set as all other types (status, dates, assignee, health, estimates, prerequisites). No structural special-casing.
2. **Clickable type pill.** The item-type badge becomes an interactive control. Clicking it opens a dropdown of the active levels for that item's client; selecting one re-types the item and cascades its whole subtree by the same offset. A toast with a ~10 second **Undo** reverts the entire subtree change.
3. **Per-client hierarchy depth.** Each client configures which levels are active (e.g. NBI: `project/feature/story/task`; Couch Heroes: all five). Inactive levels are hidden from every UI surface but preserved in the database. Reactivating a level reveals the items unchanged.

## 2. Decisions Made (Glen, 2026-07-01)

| Decision | Choice |
|---|---|
| Initiative root | **Mandatory.** Everything nests under an Initiative. Uniform in data; visibility per client. |
| Type change with children | **Cascade.** Whole subtree shifts by the same level offset. |
| Contracting depth with existing items | **Hide in UI, preserve in DB.** Reversible, non-destructive. |
| Depth config scope | **Per-client.** NBI keeps current 4 levels visible; Couch Heroes activates Initiative. |
| Initiative fields | **Identical to other types.** Dates can stay empty for evergreen initiatives. |
| Hidden level display | **Clean skip.** No hidden-level indicators; nesting renders as direct. |
| Pill dropdown options | **All active levels**, with undo toast as the safety net. |
| Accidental change protection | **Apply immediately + undo toast** (~10s), Gmail-style. No blocking modal. |

## 3. Data Model

### 3.1 `item_type` extension

- `'initiative'` joins the valid set: `['initiative', 'project', 'feature', 'story', 'task']`.
- No change to the `tasks` table schema; `item_type` remains text.

### 3.2 Per-client depth config

- New column: `clients.hierarchy_levels JSONB` -- ordered array of active level names.
- **Canonical order constant** (single source of truth): `['initiative','project','feature','story','task']`. Active levels are always a filtered view of this.
- Application default for new clients: the full 5-level array.
- Migration seeds existing clients with `["project","feature","story","task"]`, so every current client (including NBI) sees exactly what they see today. Couch Heroes is then switched to the full array via the settings UI after deploy. The DB data is uniformly 5-level regardless (3.3); `hierarchy_levels` controls presentation and creation only.
- API validation constraints (admin-only write): non-empty, a subset of the canonical order, in canonical order, must include `task`. `initiative` may be inactive -- it always exists in the data as the true root; the topmost *active* level acts as the visible root (clean-skipped above that).
- Items whose client is unassigned use the full-depth default.

### 3.3 Migration (new numbered migration, next in sequence)

1. Add `hierarchy_levels` column to `clients` with default `'["project","feature","story","task"]'::jsonb` for existing rows; application default for new clients is the full 5-level array.
2. **Preflight: handle ALL root types, not just projects (Codex finding #7).** Query `SELECT item_type, client_id, COUNT(*) FROM tasks WHERE parent_id IS NULL GROUP BY item_type, client_id`. Any root `feature`, `story`, or `task` rows must also be reparented under an Initiative.
3. For each client that has root-level items (`parent_id IS NULL AND item_type <> 'initiative'`): create one Initiative row (`item_type='initiative'`, `parent_id NULL`, title `'General'`, same `client_id`/client assignment as the client, status `'In progress'`, **`source='migration-hierarchy'`** for deterministic idempotency), then reparent all that client's root non-initiative items under it.
4. For root items with no client: create a single unassigned `'General'` Initiative (`source='migration-hierarchy'`) and reparent them under it.
5. **Mixed-root policy (Codex finding #9):** if a client already has a root Initiative, root non-initiative items for that client reparent under the *existing* Initiative (do not create a duplicate General). If a client has multiple root Initiatives, root items go under the first one by `created_at` order.
6. Root-level enforcement flips from `project` to `initiative` server-side.
7. Migration must be idempotent: use `source='migration-hierarchy'` marker to detect prior runs and skip re-creation. Never edit committed migrations.

## 4. Hierarchy Logic Becomes Dynamic

### 4.1 Current static maps (to be replaced)

**Backend** ([lib/helpers.js:15-16](dashboard-server/lib/helpers.js#L15-L16), exported at 251-252, consumed by `server.js:59/485/488`, `routes/tasks.js`, `routes/sync.js`):

```js
const ITEM_TYPES = ['project', 'feature', 'story', 'task'];
const VALID_CHILD_TYPE = { project: 'feature', ... };
const VALID_PARENT_TYPE = { project: null, ... };
```

**Duplicate backend copy:** [lib/slack-bot.js:17](dashboard-server/lib/slack-bot.js#L17) has its own `ITEM_TYPES` Set. This must be unified with the helpers export, not left as a second source of truth.

**Frontend** ([nbi-utils.js:141-162](dashboard-server/public/js/nbi-utils.js#L141-L162)): `ITEM_TYPE_META`, `ITEM_TYPE_ORDER`, `VALID_CHILD_TYPE`, `VALID_PARENT_TYPE`, plus helpers `getItemTypeMeta/Label`, `getAllowedChildType`, `getChildTypeLabel`.

### 4.2 New shape

**Canonical (client-independent) layer** -- unchanged semantics, new value:

- `ITEM_TYPES = ['initiative','project','feature','story','task']`
- `VALID_CHILD_TYPE` / `VALID_PARENT_TYPE` extended with initiative entries. These express the *canonical* adjacency and remain the source of truth for **data validity** (what may parent what in the DB).

**Active-level (client-aware) layer** -- new functions, used by UI and by API surfaces that create/re-type items on a user's behalf:

- `getActiveLevels(client)` -> ordered array from `clients.hierarchy_levels`, full depth if absent.
- `getActiveChildType(type, activeLevels)` -> next active level below `type`, or null.
- `getActiveParentType(type, activeLevels)` -> next active level above `type`, or null.

**Key rule (DECIDED -- Option B confirmed, Codex adversarial review 2026-07-02):** the database uses **descendant-order validation** for interior nesting. Strict adjacency is replaced with these invariants:

1. **Only `initiative` may have `parent_id IS NULL`.** Every non-initiative must have a parent.
2. **Parent type must be strictly higher** in canonical order than child type. No equal-type nesting.
3. **No cycles.** Existing cycle detection remains.
4. **Client scope must remain valid.** Child inherits or matches parent's client assignment.
5. Interior gaps are legal -- a Project can directly contain a Task when Feature/Story are inactive. No auto-created wrapper items.
6. `VALID_CHILD_TYPE`/`VALID_PARENT_TYPE` are used to pick *default* types for creation flows, not to hard-block. Validation uses canonical order index comparison.

**Why not Option A (auto-create hidden intermediates):** creates permanent hidden data noise, duplicate wrapper race conditions, meaningless generated rows visible on reactivation, audit/dependency/SoW pollution. Rejected by Codex review.

### 4.3 Server surfaces to change

| Surface | File | What changes |
|---|---|---|
| Create validation | [routes/tasks.js:169-177](dashboard-server/routes/tasks.js#L169-L177) | Adjacency check becomes descendant-order check; root must be `initiative`; type inference uses active levels of the item's client |
| Patch validation | [routes/tasks.js:235-236](dashboard-server/routes/tasks.js#L235-L236) | `ITEM_TYPES` includes initiative; **reject `item_type` changes via generic PATCH** -- route through `/retype` only (Codex finding #3) |
| Bulk import | [routes/tasks.js:715](dashboard-server/routes/tasks.js#L715) | Same order rules |
| Sync sanitisation | [routes/sync.js:142](dashboard-server/routes/sync.js#L142) | Unknown types still fall back to `task`; initiative accepted; **reject `item_type` changes via sync** -- type changes only through `/retype` endpoint (Codex finding #3) |
| Type inference | `lib/helpers.js` `inferItemType` | No parent -> `initiative` (was `project`); else next active level below parent for the client |
| Slack bot | [lib/slack-bot.js:17](dashboard-server/lib/slack-bot.js#L17) | Import shared `ITEM_TYPES` from helpers |
| Status cascade (project Cancelled) | server routes | Extend to initiative-level cascade with same semantics |
| Clients API | routes for clients | Expose + accept `hierarchy_levels` (admin-only write, validated) |
| Backup/restore | [routes/admin.js:338](dashboard-server/routes/admin.js#L338) | Restore must preserve `item_type`; reject rows with missing/invalid type (Codex finding #12) |
| Dashboard counts | [routes/dashboard.js:21](dashboard-server/routes/dashboard.js#L21) | Server-side counts must respect active levels per client (Codex finding #10) |

### 4.4 Frontend surfaces to change

| Surface | File | What changes |
|---|---|---|
| Constants + helpers | [nbi-utils.js:141-167](dashboard-server/public/js/nbi-utils.js#L141-L167) | Add initiative to `ITEM_TYPE_META`/`ITEM_TYPE_ORDER`; add active-level helper functions taking the item's client; `itemTypeBadgeHtml` gains interactive pill variant |
| Tree view | `views/nbi-tasks.js` (type filter at 72-77, tree render, expand-to-level, SoW grouping) | Filter buttons render active levels for the current client context; tree render clean-skips inactive levels (children of a hidden item render under its nearest visible ancestor); expand-to-level operates on active levels |
| Kanban/board | [views/nbi-kanban.js](dashboard-server/public/js/views/nbi-kanban.js) (drag validation at 595/670/687, quick-add pill at 355-361, card badge) | Drag-drop validates descendant order + active levels; quick-add offers active child type; root drop target accepts topmost active level |
| Detail panel | [views/nbi-detail.js](dashboard-server/public/js/views/nbi-detail.js) (type field at 110, parent selector at 257, child creation 1200-1544) | Type field becomes the clickable pill; parent selector lists items of the active parent type; child-creation flows use active types |
| Gantt | `views/nbi-gantt.js` | Depth/indent derived from *visible* ancestor chain, not raw depth; initiative rows render at top level |
| Docs view | [views/nbi-docs.js:570-574](dashboard-server/public/js/views/nbi-docs.js#L570-L574) | Picker handles initiative grouping when active |
| Settings | `views/nbi-settings.js` | New per-client "Hierarchy depth" admin section (5.3); queue-detail type buttons (line 680) use active levels |
| Shell constants | `nbi_project_dashboard.html` | Any residual inline hierarchy constants updated to match nbi-utils.js (verify during implementation; live copies must not diverge) |

### 4.5 Type pill change + cascade + undo

**Interaction:**
1. Click pill -> dropdown of active levels for the item's client (current level marked).
2. Select level -> `PATCH /api/tasks/:id/retype` (new endpoint) with `{ newType }`.
3. Server computes the level offset (in canonical order) and re-types the item and **every descendant** by the same offset in one transaction. Descendants that would pass below `task` clamp to `task`. Item moving to the visible root level gets `parent_id` handling per its new type (an item re-typed to `initiative` moves to root).
4. Response returns `{ undoToken, changes: [{id, previousType, newType}] }`. The **undo token is server-held** (stored in a `retype_undo_tokens` table with: token UUID, actor user ID, root item ID, affected IDs array, previous types/parents/sort_orders, row versions at cascade time, expiry timestamp ~30s). Client-held undo state is unsafe (Codex finding #4).
5. Client shows toast: `Changed to Story. 4 children cascaded. Undo` (~10s).
6. Undo -> `PATCH /api/tasks/retype-undo` with `{ undoToken }`. Server loads the token, checks each affected row's current version matches the version captured at cascade time. If any row was modified by another user, undo fails with a conflict response and the client shows "Undo expired -- another user modified items" (Codex finding #5). On success, restores previous types, parents, and sort_orders in one transaction. Token is single-use and deleted after use or expiry.

**Edge rules:**
- Re-typing that would place the item at an invalid position relative to its *parent* (e.g. promoting a Story to Project while its parent is a Feature) reparents the item to the nearest valid ancestor (walk up until an ancestor of higher canonical order is found; promote to root if the new type is `initiative`).
- **Equal types cannot nest** (descendant order is strict). Clamping at `task` can therefore not leave a Task nested under a Task: when clamping would create equal-type nesting, the clamped children reparent to the lowest ancestor that still has strictly higher canonical order. The server-held undo token captures `previousParentId`, `previousType`, `previousSortOrder`, and row `version` for each affected item, so undo fully reverses both the re-typing and any flattening (Codex finding #6).
- Multi-user safety: cascade runs server-side in a transaction; the 10-second polling sync picks it up like any other change. Undo uses version preconditions -- if any affected row changed since the cascade, undo fails cleanly rather than silently overwriting another user's changes (Codex finding #5).

### 4.6 Clean-skip rendering rule (shared)

**Frontend:** a single helper computes the **visible tree**: for each item, its *visible parent* is the nearest ancestor whose type is active for the client (or root). All views (tree, Gantt, pickers, breadcrumbs) render from the visible tree. Hidden items themselves do not render at all; their children render under the visible ancestor. This helper is the one place the frontend skip logic lives.

**Server-side (Codex finding #10):** active-level awareness must also apply to server-computed counts and aggregations. Dashboard summary counts ([routes/dashboard.js:21](dashboard-server/routes/dashboard.js#L21)), reports, workload, client portal, and exports must filter by active levels for the requesting user's client context. The server uses the same `getActiveLevels(clientId)` helper from `lib/helpers.js`.

**All Clients view (Codex finding #11):** when no single client is selected, clients may have different active levels. Rule: the tree renders per-client active levels (each item uses its own client's config). Type filter buttons show the **union** of all active levels across visible clients. Items whose type is inactive for their client are still hidden.

**Consequence to verify in QA:** counts and rollups (e.g. child counts at [nbi-detail.js:1095](dashboard-server/public/js/views/nbi-detail.js#L1095), board type counts, tree header counts at [nbi-tasks.js:220](dashboard-server/public/js/views/nbi-tasks.js#L220)) must count only active-level items in UI displays. Gantt must not assume root tasks are projects ([nbi-gantt.js:187](dashboard-server/public/js/views/nbi-gantt.js#L187)).

## 5. Settings UI

### 5.1 Location

Settings -> Configuration tab -> new **"Hierarchy depth"** section. Admin-only (same gating as existing admin sections).

### 5.2 Interaction

- Client selector (dropdown of clients), then the 5 levels shown in canonical order with a toggle each.
- `task` locked on. `initiative` toggleable (off = client sees a Project-rooted world, like NBI today).
- Toggling updates `clients.hierarchy_levels` via the clients API. Change applies on next data refresh (10s poll) for other users; immediately for the actor.
- Copy under the section explains: deactivating a level hides those items but never deletes them; reactivating restores them.

### 5.3 Guard rails

- Server validates the array (canonical subset, order, `task` present, non-empty).
- Non-admins get read-only view or no section (match existing settings patterns).

## 6. Initiative Visual Identity

Added to `ITEM_TYPE_META`:

```js
initiative: { label: 'Initiative', plural: 'Initiatives', colour: '#4f46e5', icon: '\u{1F3AF}' } // deep indigo, target icon
```

Colour is one step deeper than Project's `#6366f1` to read as "above Project". Exact colour/icon can be adjusted during visual QA. All type badges/pills pick this up automatically via `ITEM_TYPE_META`.

## 7. Testing Strategy

### 7.1 Unit (Vitest, `dashboard-server/tests/unit/`)

- Active-level helpers: `getActiveLevels`, `getActiveChildType/ParentType`, visible-tree computation (skip logic), descendant-order validation, cascade offset computation incl. clamping and flattening, undo restoration.
- Route tests: create/patch/retype/retype-undo/import/sync with initiative types, per-client active levels, invalid configs rejected.
- Migration test: seed 4-level data, run migration, assert Initiative roots created per client + unassigned bucket, all prior roots reparented, idempotent on second run.

### 7.2 E2E (Playwright, `npm run test:e2e`)

- Tree renders Initiative root for a full-depth client; clean-skips for a contracted client.
- Pill click -> change type -> children cascade -> undo restores exactly.
- Settings: toggle a level off -> items disappear from tree/board/filters; toggle on -> reappear.
- Drag-drop respects active levels and descendant order.
- Create flows: quick-add at root creates topmost active level; "Add item" menu shows active levels only.

### 7.3 Visual QA

- Playwright screenshots of tree, board, Gantt, detail panel, settings section, in both full-depth (CH-style) and contracted (NBI-style) configs. Verified in a real browser through the auth stack per repo hard rule.

### 7.4 Process gates

1. Spec (this doc) -> **Codex adversarial review** -> iterate.
2. Implementation plan (writing-plans skill) -> **Codex review of plan** -> iterate.
3. Implement in a **git worktree** (multi-file risky change rule).
4. `npm test` + `npm run test:all` green.
5. **Codex review of implementation** (`codex review --base master`) -> fix all findings, every severity.
6. QA pass: e2e + visual verification.
7. Glen UAT at the end (production check at worksage.nbi-consulting.com is Glen's).

## 8. Out of Scope

- Renaming levels per client (labels stay global).
- More than 5 levels or custom level insertion.
- Per-initiative depth overrides (config is per-client only).
- Slack bot UX for creating initiatives (bot merely accepts the type as valid).

## 9. Resolved Items (Codex adversarial review 2026-07-02)

1. **Option A vs B in 4.2** -- RESOLVED: Option B (descendant-order) confirmed. Option A rejected (data pollution). Spec section 4.2 updated with explicit invariants.
2. **Generic PATCH/sync type bypass** -- RESOLVED: spec now blocks `item_type` changes via generic PATCH and sync; route through `/retype` only.
3. **Undo safety** -- RESOLVED: server-held undo tokens with version preconditions replace client-held state.
4. **Migration scope** -- RESOLVED: handles all root types, deterministic markers, mixed-root policy defined.
5. **Clean-skip scope** -- RESOLVED: extends to server-side counts, dashboard, reports. All Clients view uses union of active levels.
6. **Backup/restore** -- RESOLVED: admin restore must preserve `item_type`.

## 10. Resolved During Planning Prep (2026-07-02)

1. **SoW grouping interaction** -- RESOLVED. SoWs are contractual scopes that group *projects*, not initiatives. Behaviour:
   - Initiative active: Client > Initiative (rendered directly) > SoW > Project. The SoW grouping logic in [nbi-tasks.js:234-268](dashboard-server/public/js/views/nbi-tasks.js#L234-L268) moves from `clientRoots` to the children of each initiative. Initiatives render without SoW headers.
   - Initiative hidden: Client > SoW > Project (same as today, no change).
   - The `sow_id` field remains project-level. Initiatives do not have SoW assignments.
2. **Default Initiative naming** -- RESOLVED. Migration uses `'General'`. Trivially renameable in-app afterwards.
3. **`nbi_project_dashboard.html` residual constants** -- CONFIRMED. Lines 106-109 have hardcoded "New Project/Feature/Story/Task" menu items. These must be dynamically generated from active levels for the current client context (same approach as other type-aware UI surfaces).
4. **`retype_undo_tokens` table cleanup** -- lazy purge: delete expired tokens on each retype or undo call. No separate cron needed -- the volume is low (one token per retype, 30s TTL).
