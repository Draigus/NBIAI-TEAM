# Session Handoff -- 2026-04-11b (Hierarchy, Dependencies, Timeline)

## Session Overview
Major architecture session: 4-level work item hierarchy, prerequisites/dependents system with hard-blocking, full timeline overhaul with dependency linking and critical path view, code audit + fixes, documentation.

## Server State
- **Port:** 8888 (PM2 managed, auto-restarts)
- **PM2 processes:** `nbi-dashboard` (id 0) + `cloudflare-tunnel` (id 1)
- **Production URL:** https://worksage.nbi-consulting.com
- **Local URL:** http://localhost:8888/nbi_project_dashboard.html
- **DB:** postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard
- **Server file:** `dashboard-server/server.js` (~4,950 lines)
- **Frontend file:** `nbi_project_dashboard.html` (~13,000 lines)

## Logins
All passwords: nbi2026. glen=admin, tom=admin, magnus=member.

---

## What Was Done This Session

### 1. Bug Fixes
- **Fee income bug:** `PUT /api/finance` changed from admin-only to any authenticated user. Added error toasts for auth failures. Tom notified.
- **Finance data recovery:** Tom's finance data (v77, 3215 bytes) was overwritten by empty seed. Restored from append-only `finance_data` table. Added safeguard: `saveFinanceData()` refuses to push empty data when server has real data.
- **Bug report sort:** 5 sortable columns (Reporter, Title, Page, Status, Date) with directional arrows.
- **Assignee panel refresh:** Overlay detail panel now refreshes after add/remove assignee regardless of view.
- **Robin removed:** Robin Jubber removed from task assignments (was Couch Heroes employee, not NBI).

### 2. Work Item Hierarchy (Project > Feature > Story > Task)
- **Database:** Migration `008_item_type_hierarchy.sql` -- added `item_type` column, recursive CTE assigned types by depth (38 projects, 154 features, 924 stories, 4 tasks), index on `item_type`.
- **Server:** Hierarchy constants (`VALID_CHILD_TYPE`, `VALID_PARENT_TYPE`), validation on POST/PATCH/sync, item_type whitelist, cascade DELETE in transaction, UUID validation.
- **Frontend:**
  - Sidebar: "Tasks" -> "Projects", "My Tasks" -> "My Work"
  - Split "+ New" dropdown: New Project / Feature / Story / Task with parent picker modal
  - Type badges (coloured P/F/S/T) in tree, board, timeline, detail panels
  - Nesting enforcement on drag-drop, reparent, "Move Under" dropdown
  - Board: type filter buttons (All / Projects / Features / Stories / Tasks)
  - Detail panels: Type row, dynamic children labels ("Features" under project, etc.)
  - Delete: cascade warning with descendant type counts
  - ~15 string replacements (search, empty states, bulk ops, etc.)
  - `createTaskObject()` factory (deduplicated 3 constructors)
  - `clientGroupKey()` helper (deduplicated key sanitisation)
  - `isTaskIncomplete()` helper (deduplicated 3 boolean expressions)

### 3. Collapse/Expand System
- Default load: collapsed to client level with all parent items collapsed
- "Collapse All": collapses everything (client groups + all parents)
- "Expand to" dropdown: Projects / Features / Stories / Tasks (all) levels
- Fixed key format mismatch bug (sanitised vs raw client names)
- Fixed lazy-render client name lookup via `data-client-name` attribute
- Re-collapse on view navigation (`switchView` resets `_tasksInitialCollapse`)

### 4. Prerequisites & Dependents System
- **Helpers:** `getIncompletePrereqs(task)`, `wouldCreateCycle(taskId, depId)`, `getDependents(taskId)`
- **Hard-block on Done:** `toggleDone`, `updateTask`, `onBoardDrop`, `bulkSetField` all check prerequisites
- **Soft-warn on In Progress:** `updateTask` shows warning with override option
- **Circular prevention:** `addDependency` checks for cycles before adding
- **Detail panels:** "Dependencies" renamed to "Prerequisites" (with status icons, type badges, "All met" indicator). New "Dependents" section (reverse lookup, read-only). Both in inline AND overlay panels.
- **Visual indicators:** Lock icon on tree rows and board cards with incomplete prerequisites
- **Stale cleanup:** `deleteTask` removes deleted IDs from other tasks' `dependencies` arrays

### 5. Timeline Overhaul
- **Hierarchical rendering:** Full Project > Feature > Story > Task tree with indentation and type badges
- **Collapsible rows:** Toggle arrows on parent items, child count badge when collapsed
- **Time navigation:** Back/Forward arrows (1 month), "Today" button
- **Zoom:** +/- buttons (8px to 60px per day)
- **Today column:** Semi-transparent green column (was thin red line), DST-safe date calculation
- **Bar fixes:** Status-coloured single-day bars (was yellow dots), clamped to prevent rendering behind label column
- **Resizable detail panels:** Drag left edge to widen/narrow (both inline and overlay)

### 6. Dependency Link Mode
- **Dependencies dropdown button:** Consolidates Link Mode, Show Arrows, Dependency View
- **Link Mode:** Click button -> crosshair cursor -> drag from prerequisite bar to dependent bar -> dashed preview arrow -> release to create dependency. Source glows orange, target glows blue.
- **Interactive arrows:** Click to select (blue highlight), Delete/Backspace to remove, drag selected arrow to reconnect to new target, Escape to deselect, click empty space to deselect. Wide invisible hit areas for easy clicking.
- **Show/Hide Arrows:** Toggle all dependency arrows on/off
- **Critical Path View:** Filtered timeline showing only items in dependency chains, topologically sorted, indented by chain depth, with lock icons on blocked items
- **Arrow redraw:** Arrows update after bar move/resize via `requestAnimationFrame`

### 7. Code Quality
- **Server audit (15 issues fixed):** Schema drift in init-db.js (added `start_date`, `end_date`, `dependencies`, `idx_tasks_item_type`), item_type validation in PATCH + sync/changes, DELETE wrapped in transaction with audit log after commit, UUID validation on PATCH/DELETE, cleaned up `resolvedType` initialisation.
- **Frontend audit (10 issues fixed):** Added `.item-type-badge` CSS rule, `.picker-row` CSS class with :hover, JSDoc on 10+ helper functions, `createTaskObject()` factory, removed orphaned JSDoc, stale dependency cleanup.
- **QA pass:** Clean across all 5 categories (syntax, function refs, scope, server consistency, data flow).
- **README:** `dashboard-server/README.md` with architecture, setup, API reference, schema, file structure.

---

## Git Commit History (this session)
```
33d3718 Work item hierarchy, prerequisites system, timeline overhaul
```

## Decisions Log (this session)
- D68: Fixed 4-level hierarchy: Project > Feature > Story > Task (not "Tickets")
- D69: Sidebar: "Tasks" -> "Projects", "My Tasks" -> "My Work"
- D70: Delete cascade with strong warning showing descendant counts
- D71: Prerequisites terminology (not "Dependencies" or "Blocked By")
- D72: Hard-block Done + soft-warn In Progress for prerequisite enforcement
- D73: Timeline zoom as +/- buttons (not Week/Month/Day/Detail presets)
- D74: Dependency link mode via drag arrow (not floating applet)
- D75: Dependencies dropdown consolidating Link, Show Arrows, Dependency View
- D76: Critical path view as filtered Gantt (not tree list)
- D77: Today marker as green column (not red line)

## Key Files
- Frontend: `nbi_project_dashboard.html` (~13,000 lines)
- Server: `dashboard-server/server.js` (~4,950 lines)
- Schema: `dashboard-server/init-db.js`
- Migration: `dashboard-server/migrations/008_item_type_hierarchy.sql`
- README: `dashboard-server/README.md`
- Session log: `projects/nbi_dashboard/session_logs/2026-04-11_session_b.md`

## What to Do Next Session

### Remaining Feature Requests (14 items from bug triage)
1. Embed files via Sharepoint links on items
2. Multi-select filters for items
3. Time-based filters (Imminent = due in 3 days, Late = overdue)
4. Calendar view dependency display
5. Warnings & Alerts Sidebar (right-hand notifications panel)
6. Due & Late item email warnings
7. PM Report System (daily email summaries)
8. Client Page (studio size, contacts, contract values)
9. SoW Upload on leads
10. "Complete" marker for Won leads
11. Hiring Page (candidate pipeline cards)
12. HC/Org Performance Page & Board
13. Report Editing post-submission
14. Work Organisation: add SoW layer (Client > SoW > Project > Feature > Story > Task)

### Data Issue
- Two hiring tasks ("Align on Hourly Rates", "Role Pay Lock-In") are parented under Couch Heroes project but should be under NBI OPS > Hiring Plan. Glen aware, may fix manually.
