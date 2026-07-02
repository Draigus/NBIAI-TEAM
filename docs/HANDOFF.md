# Handoff: Detail Panel Renderer Unification

**Date:** 2 July 2026 (session C)
**Previous session delivered:** Configurable hierarchy feature, COMPLETE and deployed
**Resume in a fresh session**

## State at handoff

- Branch master at `3c52155`. Working tree has only docs/session-log changes (committed with this handoff).
- Configurable hierarchy is LIVE on :8888. 14 commits total (11 feature via merge `6b34950` + 2 Codex fixes `dc195e4`, `3c52155`).
- Hierarchy unit tests: 44/44 green (`tests/unit/hierarchy-helpers.test.mjs` 33, `tests/unit/retype.test.mjs` 11).
- Glen has UAT'd the type pill: confirmed working ("Yeah, it looks like it's working now").
- Migration 075 applied to production DB: 8 `'General'` initiative roots created, 0 non-initiative root items remain, `clients.hierarchy_levels` JSONB live, `retype_undo_tokens` table live.
- Full e2e suite NOT run since the merge. Hierarchy e2e specs (plan Task 12) were never written. See "Also pending".

## THE TASK: Unify the two detail panel renderers

Glen asked why there are two detail rendering engines and agreed the section-level unification is the right fix. This was scoped in session C conversation (2 July, evening).

### The problem

Two functions build near-identical detail panel HTML independently:

1. **`openDetailOverlay`** — `dashboard-server/public/js/views/nbi-detail.js:77-291`. Full-screen overlay. Flat sections. Element IDs `detail-*`. Has Comments (API-backed), Move Under (reparent selector), incomplete-task banner. Writes to `#detailPanel` innerHTML directly, then calls `loadTimeEntries(id)` + `loadComments(id)`.
2. **`renderInlineTaskDetail`** — `dashboard-server/public/js/views/nbi-kanban.js:119-282`. Side panel on Tasks view (>1024px). Accordion sections via `_accWrap(key, title, body, collapsed)`. Element IDs `inline-detail-*`. Has SoW selector (root items only), merged Prerequisites+Dependents, children capped at 8. RETURNS an HTML string (callers insert it: nbi-detail.js:771, nbi-gantt.js:1111, nbi-tasks.js:128).

~70% content overlap. This duplication already caused a shipped bug this session: the interactive type pill was added to the overlay only; the inline panel (the one actually visible in Glen's screenshots) still had the static badge. Fixed in `3c52155`.

### Agreed architecture (from session C discussion)

**Section-level unification, NOT panel-level.** Each shared section becomes a function `renderDetailSection<Name>(task, opts)` where `opts = { idPrefix: 'detail' | 'inline-detail', accordion: bool, ... }`. The two panels become thin composition shells: each composes the sections it wants, in its order, with its own chrome.

- Panel-specific sections stay with their owner, NOT unified: Comments + Move Under + incomplete banner (overlay only), SoW selector (inline only).
- Shared sections to extract: Properties (Type/Name/Client/Team/Status/Priority/Health/Assignee/Practice/WorkType/Dates/Repeat), Time Tracking, Description+Collaborations+SuccessFactor, Notes, Attachments, Prerequisites, Dependents, Children, Actions.
- Move `renderInlineTaskDetail` out of nbi-kanban.js into nbi-detail.js as part of the cleanup (it never belonged in kanban; it is used by tasks/gantt/detail views).

### CRITICAL constraints (breakage traps found by reading the code)

1. **Both panels can be in the DOM simultaneously.** The inline panel's Actions section has an "Expand" button (`data-action="openDetailOverlay"`) that opens the overlay ON TOP of the inline panel. Element IDs must therefore remain distinct per panel — that is what the `idPrefix` opt is for. Never collapse the two ID namespaces.
2. **Parallel helper functions are keyed to those IDs:**
   - `logTimeEntry` reads `#logHours`/`#logDesc`; `logTimeEntryInline` reads `#inlineLogHours`/`#inlineLogDesc`
   - `loadTimeEntries` writes `#timeEntriesList`; the inline panel expects `#inlineTimeEntriesList`
   - `addNote` reads `#noteInput`; `addNoteInline` reads `#inlineNoteInput`
   - `detailSelect(label, field, value, options, required)` in nbi-detail.js:508 vs `inlineDetailSelect(label, field, value, options, taskId, required)` in nbi-kanban.js:285 — note the DIFFERENT signatures
3. **Inline accordion state:** `_accWrap` and `_accordionTaskId` (set at nbi-kanban.js:126) manage per-task accordion open/closed state. Preserve exactly.
4. **Attachments entity-type semantics differ:** inline uses `isRoot ? 'project' : 'task'` (nbi-kanban.js:221); overlay always uses `'task'` (nbi-detail.js:190). This LOOKS like accidental drift but may be intentional — investigate before unifying; ask Glen if unclear.
5. **Children click actions differ:** inline children rows use `data-action="openDetail"`; overlay children rows use `data-action="openDetailOverlay"` (so nested navigation stays in overlay mode). Keep per-panel.
6. **Both files are cache-busted:** currently `nbi-detail.js?v=5`, `nbi-kanban.js?v=6` in `nbi_project_dashboard.html`. Bump both after edits.

### MANDATORY safety method: characterisation testing

Agreed with Glen in-session. Before ANY refactor:

1. Write a snapshot harness that renders both panels' HTML for a representative task set: root project (with SoW, with work type), feature with >8 children, blocked task (blocker box), task with prerequisites+dependents, task with notes, task with auto-calculated dates (feature/story with children), incomplete task (overlay banner).
2. Since `renderInlineTaskDetail` returns a string, snapshot it directly. For `openDetailOverlay`, extract its HTML-building body into a `buildDetailOverlayHtml(id)` string-returning function first (mechanical extraction, panel write + async loads stay in the caller) — snapshot that.
3. After the refactor the output must be **byte-identical** for every sample. Any diff is a bug.
4. The harness can be a Vitest unit test with a JSDOM-ish approach OR a Playwright evaluate capturing `outerHTML` for the sample tasks. Vitest is preferable (fast, deterministic); the frontend files are global-scope scripts with no module system, so load them in the test via reading the file + `new Function` or run snapshots through Playwright against :8888. Decide at plan time; do not skip the harness.
5. Then `npm run test:all` + Playwright visual pass on both panels.

### Process

1. This touches 2+ frontend files heavily: **worktree mandatory** (using-git-worktrees skill).
2. brainstorming skill is NOT needed (design agreed in session C); writing-plans IS needed.
3. Codex review of the plan, then of the implementation (`codex review --base master` from the worktree branch).
4. Definition of done: snapshot tests byte-identical, `npm run test:all` green, Codex clean, cache-busts bumped, PM2 restart, Glen UAT of both panels (inline side panel on Tasks view wide screen; overlay via "Expand" button and via any non-Tasks view).

## Also pending (do not lose)

- **Hierarchy e2e tests were never written** (plan `docs/superpowers/plans/2026-07-02-configurable-hierarchy.md` Task 12: tree renders initiative for full-depth client, pill retype cascade + undo, settings toggles, drag-drop descendant order). The feature is UAT'd by Glen but has no automated e2e coverage. The renderer refactor session should add them, or a session soon after. Residual risk: hierarchy regressions will not be caught by `npm run test:e2e`.
- **Full e2e suite not run since hierarchy merge.** Run `npm run test:all` early in the next session to establish a baseline before refactoring.
- **Test DB baseline fixture is stale** — `tests/fixtures/baseline-schema.sql` contains data violating current FKs (client_id not in clients), causing intermittent global-setup failures and 99 pre-existing unit failures in the MAIN checkout (worktree was fine after `npm run init-db`). Needs a regenerated baseline. This blocks trustworthy full-suite runs in the main checkout.
- **Squash `snapshot:` commits before any push** (9+ cadence snapshots on master, Gate 5 blocks push until squashed). Carried from previous handoffs.
- **Worktree cleanup:** `.worktrees/configurable-hierarchy` + branch `feature/configurable-hierarchy` (MERGED, safe to remove: `git worktree remove .worktrees/configurable-hierarchy` then `git branch -d feature/configurable-hierarchy`). Also `.worktrees/ats-wizard` + `feature/ats-interview-wizard` if still present (Windows lock previously prevented removal; worktree list no longer shows it but check `git branch` for the stale branch).
- **CH director performance reviews:** Robin Jubber, Mustafa Sibai, Graeme Monk Q() entries need the rewrite treatment David received. HTML file: `C:\Users\gpbea\AppData\Local\Temp\claude\d--OneDrive-Claude-code-NBIAI-TEAM\40c1ea42-9d1b-42fe-b98e-5b883d89f8ae\scratchpad\CH_Performance_Reviews.html`. Full instructions in the 2026-07-01 handoff (git history of this file).

## Key reference points

- Configurable hierarchy spec: `docs/superpowers/specs/2026-07-01-configurable-hierarchy-design.md` (post-Codex, sections 9-10 record all resolutions)
- Configurable hierarchy plan: `docs/superpowers/plans/2026-07-02-configurable-hierarchy.md`
- Session log: `projects/nbi_dashboard/session_logs/2026-07-02_session_c.md` (full task-by-task commit table)
- Retype endpoints: `PATCH /api/tasks/:id/retype`, `PATCH /api/tasks/retype-undo` in `dashboard-server/routes/retype.js` (registered BEFORE tasks routes in server.js:486 — order matters, `/retype-undo` would otherwise be swallowed by `PATCH /api/tasks/:id`)
- Frontend active-level helpers: `nbi-utils.js` (`getClientActiveLevels`, `getActiveChildType`, `getTopmostActiveType`, `isTypeActive`, `itemTypePillHtml`)
- Backend helpers: `lib/helpers.js` (`CANONICAL_ORDER`, `isDescendantOrder`, `getActiveLevels`, `getActiveChildType`)

## Resume sequence

1. Read this handoff + `projects/nbi_dashboard/session_logs/2026-07-02_session_c.md`.
2. Run `npm run test:all` from `dashboard-server/` for a baseline (expect unit noise from the stale test-DB fixture — fix or note).
3. Clean up merged worktrees (see Also pending).
4. writing-plans skill for the renderer unification, honouring the constraints and characterisation-test method above.
5. Codex review of plan -> worktree -> snapshot harness FIRST -> refactor -> byte-identical check -> test:all -> Codex review -> cache-bust -> PM2 -> Glen UAT.
