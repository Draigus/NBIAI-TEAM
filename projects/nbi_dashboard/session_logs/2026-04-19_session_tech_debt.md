# Session Log -- 2026-04-19 Tech Debt Sprint

## Session start

Loaded handoff: `handoff_2026-04-19_tech_debt_sprint.md`
HEAD: `3622880` on master
PM2: nbi-dashboard running, 128 vitest tests green
All 20 Critical bugs resolved. Moving to tech debt work order.

### Work order (Glen-approved)
1. F-B8: Route board drag-drop through sync pipeline
2. F-B17: Merge renderAll/renderContent
3. F-B22: Migrate ~211 inline onclick to event delegation
4. F-B16: Consolidate window globals into state object

### Starting state
- Permissions verified: all three settings files have defaultMode: dontAsk
- Branch: master at 3622880

---

## Work log

### F-B8: Board drag-drop through sync pipeline -- DONE

Rewrote `onBoardDrop()` at nbi_project_dashboard.html:8020 to route status changes through `updateTask()` instead of direct PATCH. This gives board drags:
- Conflict detection via `_serverUpdatedAt` in the sync pipeline
- Blocked popup (was missing -- drags to Blocked lane skipped the popup entirely)
- Cancelled cascade confirmation for projects
- In-progress soft-block warning for incomplete prerequisites
- Undo support

Position changes still use direct PATCH to `/api/tasks/:id` for server-side `reorderInGroup` sibling shifting.

Added `_pendingBoardDropPosition` mechanism so that dragging to Blocked lane stores the target position, and `saveMarkAsBlocked` applies it after the popup completes. `cancelMarkAsBlocked` clears it.

Files changed: `nbi_project_dashboard.html` only
- Line 7969: added `_pendingBoardDropPosition` state variable
- Lines 8018-8091: replaced `onBoardDrop` + added `_patchBoardPosition` helper
- Line 8897: `cancelMarkAsBlocked` clears pending position
- Lines 8942-8946: `saveMarkAsBlocked` applies pending position after popup save

128 vitest tests green. PM2 restarted (pid 42012).

Manual testing needed: drag within lane (reorder), drag across lanes (status change), drag to Done with incomplete prereqs (should block), drag to Blocked (should trigger popup), drag to Cancelled for a project (should cascade confirm).

---

### F-B17: Merge renderAll/renderContent -- DONE

Extracted shared view-dispatch logic into `_renderMainContent(content)` at nbi_project_dashboard.html:4065.

Before: `renderContent` and `renderAll` each had their own copy of the view redirect logic (incomplete->tasks, changelog->settings), empty-state check, 12-branch view dispatcher, and gantt arrow draw. The copies had drifted: different ordering of redirects vs empty-state, and renderAll didn't restore scroll.

After: Both call `_renderMainContent(content)`. `renderContent` wraps it with scroll save/restore. `renderAll` wraps it with sidebar/tabs/breadcrumbs. Zero duplicated logic.

128 vitest tests green.

---

### F-B22: Migrate inline onclick to event delegation -- DONE

Migrated 431 out of 433 inline `onclick` handlers to `data-action` + `data-arg*` event delegation.

**Delegation handler** at nbi_project_dashboard.html:2437-2455:
- `data-action="funcName"` maps to `window[funcName]`
- `data-arg0`, `data-arg1`, etc. for positional args (strings; 'true'/'false'/'null' auto-coerced)
- `data-pass-event` passes the click event as first arg
- `data-pass-el` passes the clicked element as last arg
- `data-stop` / `data-prevent` for stopPropagation/preventDefault

**90 wrapper functions** added at lines 2457-2560 (`_act*` prefix) for complex patterns:
- State setters (e.g. `_actSetMyTasksSort`, `_actSetTaskSubView`)
- Calendar/gantt navigation (`_actCalNext`, `_actGanttFwd`)
- Filter operations (`_actSetFilterAssignee`, `_actClearFilterClient`)
- Sort togglers (`_actTogglePeopleCapacitySort`)
- Modal helpers (`_actModalRemove`, `_actModalClick`)
- Conditional handlers (`_actOpenBugDetailIfNotDrag`)
- Button-loading wrappers (`_actWithLoading`, `_actSubmitCalEvent`)
- DOM manipulation wrappers (`_actToggleStandupSection`, `_actToggleCollapsed`)

**2 onclick handlers intentionally kept:**
1. Dynamic sidebar button (line 3869): `onclick="(${onclick.toString()})()"` - function reference is a parameter
2. Previously `...` (ellipsis placeholder) - disappeared during cleanup

**Escaping fix:** All `data-arg*` attributes now use `esc()` (HTML escaping) instead of `escAttrJs()` (JS+HTML escaping). `escAttrJs()` leaves stray backslashes in data attributes; `esc()` produces correct browser-decoded values. Updated docstrings for both functions.

128 vitest tests green. PM2 restarted (pid 7656).

Manual testing needed: click through every panel (tasks, bugs, people, calendar, gantt, reports, finances, settings, hiring, leads, clients) and verify buttons/links/sort-headers/filters still work. The delegation system is transparent to the user -- identical behaviour, no visual change.

### F-B22 QA pass -- 2 bugs found and fixed

**Bug 1: `removeRepeatDate` strict equality (line 8980)**
`dates.filter((_, i) => i !== idx)` -- `idx` is now a string from data-arg, so `2 !== '2'` is always true and NO dates would be removed. Fixed by adding `parseInt(idx, 10)` before the comparison.

**Bug 2: `_actSetInlineDetail` _BOOL type mismatch (line 2465)**
`inlineDetailVisible = (v === 'true')` -- the delegation handler's _BOOL map converts the string 'true' to boolean true before the function receives it. So `true === 'true'` is false, meaning inline detail visible would always be false. Fixed by changing to `!!v`.

**43 flagged `this` references -- all false positives.** Every instance was the English word "this" in user-facing strings like "Delete this item?", not DOM element references. The `this` context change (element in onclick vs null in fn.apply) has no functional impact because onclick's `this` only applies to the attribute handler scope, not inside called functions.

**Numeric args via data attributes -- 6 functions checked**, all use coercing operations (splice, arithmetic comparisons) that handle string→number transparently. Only `removeRepeatDate` used `!==` which requires type-exact comparison.

128 vitest + 47 Playwright tests green after fixes.

---

