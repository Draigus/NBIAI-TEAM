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
2. For each client that has root-level projects (`item_type='project' AND parent_id IS NULL`): create one Initiative row (`item_type='initiative'`, `parent_id NULL`, title `'General'`, same `client_id`/client assignment as the client, status `'In progress'`), then reparent that client's root projects under it.
3. For root projects with no client: create a single unassigned `'General'` Initiative and reparent them under it.
4. Root-level enforcement flips from `project` to `initiative` server-side.
5. Migration must be idempotent (`IF NOT EXISTS` / guarded inserts) per repo convention. Never edit committed migrations.

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

**Key rule:** the database always holds canonically valid trees (initiative root, strict adjacency). The active-level layer governs what the UI offers and how the server fills gaps. When a user creates an item under a parent where intermediate levels are inactive (e.g. Task directly under Project when Feature/Story are hidden), the server **auto-creates the hidden intermediate items** or -- simpler and preferred -- **relaxes canonical adjacency to "descendant order" in data**: a child's type must simply be *lower* in canonical order than its parent's, not necessarily adjacent.

**Decision needed at plan review (flagged for Codex + Glen):** the two options in the key rule above differ materially.
- **Option A (auto-create hidden intermediates):** DB stays strictly adjacent; hidden wrapper items multiply; re-expanding depth shows auto-created noise.
- **Option B (relax to descendant-order):** `parent.item_type` must precede `child.item_type` in canonical order; no wrapper noise; re-expanding depth shows real structure only; validation maps become order comparisons.
- **Spec recommendation: Option B.** It matches the "clean skip" decision (nesting really is direct), avoids junk items, and makes the cascade/undo logic simpler. The migration still creates Initiative roots (section 3.3) because the root must exist; but *interior* gaps are legal. `VALID_CHILD_TYPE`/`VALID_PARENT_TYPE` are then only used to pick *default* types for creation flows, not to hard-block.

### 4.3 Server surfaces to change

| Surface | File | What changes |
|---|---|---|
| Create validation | [routes/tasks.js:169-177](dashboard-server/routes/tasks.js#L169-L177) | Adjacency check becomes descendant-order check; root must be `initiative`; type inference uses active levels of the item's client |
| Patch validation | [routes/tasks.js:235-236](dashboard-server/routes/tasks.js#L235-L236) | `ITEM_TYPES` includes initiative; re-type triggers cascade endpoint (4.5) |
| Bulk import | [routes/tasks.js:715](dashboard-server/routes/tasks.js#L715) | Same order rules |
| Sync sanitisation | [routes/sync.js:142](dashboard-server/routes/sync.js#L142) | Unknown types still fall back to `task`; initiative accepted |
| Type inference | `lib/helpers.js` `inferItemType` | No parent -> `initiative` (was `project`); else next active level below parent for the client |
| Slack bot | [lib/slack-bot.js:17](dashboard-server/lib/slack-bot.js#L17) | Import shared `ITEM_TYPES` from helpers |
| Status cascade (project Cancelled) | server routes | Extend to initiative-level cascade with same semantics |
| Clients API | routes for clients | Expose + accept `hierarchy_levels` (admin-only write, validated) |

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
4. Response returns the full list of `{id, previousType, newType}` changed.
5. Client shows toast: `Changed to Story. 4 children cascaded. Undo` (~10s).
6. Undo -> `PATCH /api/tasks/retype-undo` with the change list (or a server-held undo token); server restores previous types in one transaction. Undo state is client-held and discarded when the toast expires.

**Edge rules:**
- Re-typing that would place the item at an invalid position relative to its *parent* (e.g. promoting a Story to Project while its parent is a Feature) reparents the item to the nearest valid ancestor (walk up until an ancestor of higher canonical order is found; promote to root if the new type is `initiative`).
- **Equal types cannot nest** (descendant order is strict). Clamping at `task` can therefore not leave a Task nested under a Task: when clamping would create equal-type nesting, the clamped children reparent to the lowest ancestor that still has strictly higher canonical order. The undo list captures `previousParentId` as well as `previousType` so undo fully reverses both the re-typing and any flattening.
- Multi-user safety: cascade runs server-side in a transaction; the 10-second polling sync picks it up like any other change. Undo is last-write-wins like all other edits (existing optimistic concurrency model, no new mechanism).

### 4.6 Clean-skip rendering rule (shared)

A single helper (frontend) computes the **visible tree**: for each item, its *visible parent* is the nearest ancestor whose type is active for the client (or root). All views (tree, Gantt, pickers, breadcrumbs) render from the visible tree. Hidden items themselves do not render at all; their children render under the visible ancestor. This helper is the one place the skip logic lives.

**Consequence to verify in QA:** counts and rollups (e.g. child counts at [nbi-detail.js:1095](dashboard-server/public/js/views/nbi-detail.js#L1095), board type counts) must count only active-level items in UI displays.

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

## 9. Open Items (to resolve in plan review)

1. **Option A vs B in 4.2** -- spec recommends B (descendant-order data model); needs Codex + Glen confirmation because it relaxes a server invariant.
2. **SoW grouping interaction** -- tree view groups projects under Statements of Work per client. With Initiative roots, confirm whether SoW buckets group initiatives or remain project-level within an initiative. To be checked against live `nbi-tasks.js` during planning.
3. **Default Initiative naming** -- migration uses `'General'`; Glen may prefer client-specific names. Trivially renameable in-app afterwards.
4. **`nbi_project_dashboard.html` residual constants** -- verify whether the shell still holds its own hierarchy constants or fully defers to `nbi-utils.js`.
