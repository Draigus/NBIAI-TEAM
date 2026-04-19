# Session Log — 2026-04-19 Bug Sprint

## Session Start
- Loaded handoff from `docs/HANDOFF.md` (late session — bug sprint prep)
- Starting state: `master` at `48f51d9`, clean tree, all tests green
- Directive: Work ALL 11 in_progress + open bugs and get them closed
- Approach: quick wins first, then medium bugs, then critical/large features, park SMTP-blocked

## Log

### Entry 1 — Session loaded
- Confirmed git state matches handoff (48f51d9)
- Existing session logs from earlier today: audit_sprint, tech_debt, session, portfolio_polish_and_client_portal
- Queried all 11 bugs with full comment history from PostgreSQL

### Entry 2 — Quick wins batch complete
Three bugs fixed in nbi_project_dashboard.html, all tests green (128 unit + 15 E2E):

**Bug #7 (afe33305) — Bug Tracker mobile formatting**
- Root cause: Mobile CSS hid 3 of 7 grid children but only defined 3 columns, leaving the 4th visible child (comments) wrapping to a new row. Type column at 50px too narrow for "FEATURE" badge.
- Fix: Also hide child 7 (comments) on mobile; widen Type column from 50px to 60px. Clean 3-column layout: Type | Title | Status.

**Bug #8 (e49be05e) — Calendar unassigned filter**
- Root cause: `_calShowOthers` toggle only filtered calendar events (leave, holidays) in `calBuildEventDayMap`, but task due-date chips came from `getFilteredTasks()` which ignored the toggle entirely.
- Fix: Added task filter in `renderCalendarView` — when toggle is off, filter `calFiltered` to only tasks where current user is assignee.

**Bug #10 (1d3d811e) — Ticket redirect + folder expand**
- Root cause: `navigateToTaskInTree` called `switchView('tasks')` without setting `taskSubView = 'tree'`. If user's last sub-view was board/gantt/calendar, tree rows didn't exist in DOM. Also, single `requestAnimationFrame` was sometimes too early.
- Fix: Force `taskSubView = 'tree'` + persist to localStorage before switching. Double `requestAnimationFrame` for reliable scroll.

All three bugs set to `please_review` with comments added.

### Entry 3 — Glen's feedback
- "Don't ask if I want to keep going. The answer is always yes unless I tell you to stop."
- Saved to memory. Moving to medium bugs.

### Entry 4 — Medium bugs complete
Three more bugs fixed in nbi_project_dashboard.html, all tests green (128 unit + 15 E2E):

**Bugs #2 (f09303f1) + #9 (c73af494) — My Work Only filter**
- Root cause 1: `renderTreeView` found root ancestors of filtered tasks but then `renderTaskRow` fetched ALL children from global `tasks` array, ignoring the filtered set entirely. The `filtered` parameter was threaded through but never used.
- Root cause 2: `getFilteredTasks()` applied the My Work Only filter globally, leaking to Dashboard/People/etc.
- Fix: (a) When My Work Only is active, `renderTreeView` builds a `visibleIds` Set (filtered task IDs + all ancestors). `renderTaskRow` skips any task not in the set. (b) Scoped the My Work Only filter to `currentView === 'tasks'` only.

**Bug #11 (78e7e36f) — Clear Data doesn't save**
- Root cause: `clearAllTasks()` set `tasks = []` and called `save()`, but `save()` only syncs tasks in `_dirtyTaskIds` or `_deletedTaskIds`. Since nothing was marked as deleted, the sync sent nothing to the server.
- Fix: Added `tasks.forEach(t => markDeleted(t.id))` before clearing the array.

All three bugs set to `please_review` with comments. Moving to bug #1 (Client Visibility by Team — critical).

### Entry 5 — Bug #1 (Client Visibility by Team) complete

**Bug #1 (4af29301) — Client Visibility by Team — CRITICAL**
- Root cause: `GET /api/sync/load` returned ALL tasks and ALL clients with zero scoping. The `sync/poll` endpoint already used `getClientScopes(req)` to filter, but `sync/load` (which runs on initial page load) had no equivalent check. There was also a duplicate in-memory scoping block at the bottom of the handler that re-declared `const scopes` and `const isExternal`, causing a SyntaxError.
- Fix: Added `getClientScopes(req)` filtering to the `sync/load` handler's SQL queries — tasks and clients are now filtered at the database level, same as `sync/poll`. Removed the redundant in-memory scoping block (which re-declared `const scopes` and caused the parse error). Also fixed misleading comment at line 844 (internal-no-teams path said "sees everything" when it actually returns exception clients only).
- All 128 unit + 15 E2E tests green.
- Bug set to `please_review` with comment.

### Entry 6 — Bug #6 (Warnings and Alerts Sidebar) complete

**Bug #6 (686572d9) — Warnings and Alerts Sidebar**
- Magnus feedback: (1) Remove Alerts tab (redundant), keep Warnings + Notifications. (2) Clicking a notification should mark it as seen. (3) Clicking a warning should redirect to the page AND open the ticket.
- Changes in nbi_project_dashboard.html:
  - Removed Alerts tab button from HTML, updated header to "Warnings & Notifications"
  - Removed entire `alerts` tab rendering block from `renderWarnAlertContent()`
  - Added notification ID as `data-arg1` to notification click handler
  - `handleNotificationClick(link, notifId)` now calls `POST /api/notifications/read` with the specific notification ID on click, updating badge count immediately
  - `_actOpenOverlayAndClose` now calls `navigateToTaskInTree(id)` instead of `openDetailOverlay(id)` — navigates to Projects page, expands tree, scrolls to task, opens detail panel
  - Moved `window._lastNotificationCount` update into the Notifications tab renderer (was previously only in the removed Alerts tab)
  - Removed dead `_actHandleNotifAndClose` function
- All 128 unit + 15 E2E tests green.
- Bug set to `please_review` with comment.

### Entry 7 — Bug #5 (Hiring Page stage rewrite) complete

**Bug #5 (b7a2f97f) — Hiring Page stage rewrite**
- Magnus feedback (2026-04-16): Streamline 8 stages to 5: Sourcing, Interviews, Offer, Onboarding, Hired. Hired stage should cross out title and show green tick.
- Changes:
  - New migration `030_hiring_stage_streamline.sql`: remaps old stages to new ones in DB, merges stage_assignees keys, updates column default to 'sourcing'
  - `server.js`: Updated `HIRING_STAGES` constant (5 stages), default stage in POST endpoint
  - `nbi_project_dashboard.html`: Updated `HIRING_STAGES` + `HIRING_STAGE_LABELS` constants, CSS badge/lane classes, stage-specific UI sections (offer=start date, onboarding=links, interviews=notes), create modal default, clear candidate reset stage, hired card title crossed out + green tick
  - Tests: Updated baseline schema default, fixture helper, kanban-drag E2E, mobile-screenshots E2E, kanban-position unit tests
- All 128 unit + 15 E2E tests green.
- Bug set to `please_review` with comment.
