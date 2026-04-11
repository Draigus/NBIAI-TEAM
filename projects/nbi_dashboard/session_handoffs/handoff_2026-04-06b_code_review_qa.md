# Handoff -- 2026-04-06b -- Code Review, QA Pass, UI/UX Audit

## Session Summary
Completed Glen's three requested tasks: (1) full code review + commenting of both files (~12,800 lines), (2) formal QA test plan + execution pass, (3) MD file updates. Additionally started a comprehensive UI/UX audit as Glen requested.

## What's Running
- **Server:** `node dashboard-server/server.js` on port 8888
- **DB:** PostgreSQL at `postgresql://nbiai:***@localhost:5432/nbi_dashboard`
- **Files:** `dashboard-server/server.js` (3,324 lines), `nbi_project_dashboard.html` (9,594 lines) -- total 12,918
- **Auth:** Token-based, default password `nbi2026`, Glen's username `glen`

---

## Code Review -- Bugs Fixed (server.js)

### FIX 1: `safeName` crash bug (CRITICAL)
- **Line:** ~806
- **Issue:** `/api/import/parse-file` referenced `safeName` which was never defined. The variable was `safeParts` but `safeName` was used for `path.extname()` and the response filename. Endpoint was completely broken -- would crash with ReferenceError on every call.
- **Fix:** Added `const safeName = safeParts.join('/')` after safeParts definition.

### FIX 2: Error handler ordering (HIGH)
- **Issue:** Global error handler was registered at line 2859, BEFORE the client status reports routes (2866+). Errors in those routes would crash the server instead of returning 500.
- **Fix:** Moved error handler to after ALL route definitions, right before the STARTUP section.

### FIX 3: XSS in public HTML report (HIGH)
- **Issue:** `/api/reports/:token/html` is a public (no-auth) endpoint that renders client data directly into HTML without escaping. Attacker could inject `<script>` tags via task titles, client names, or assignee names.
- **Fix:** Added `escHtml()` server-side helper. Applied to all user data interpolations in the public report template: clientName, generatedBy, date, status labels, project titles, task titles, assignees, health states.

### FIX 4: `_failedLogins` memory leak (MEDIUM)
- **Issue:** Failed login tracking object grows unboundedly -- every unique username/email gets an entry that is only cleared on successful login. An attacker could exhaust memory by submitting logins with random usernames.
- **Fix:** Added cleanup in the existing 10-minute cache interval -- evicts entries older than 1 hour.

### FIX 5: No graceful shutdown (MEDIUM)
- **Issue:** No SIGTERM/SIGINT handler. On PM2 restart or deployment, DB connections dropped mid-transaction, HTTP requests killed mid-response.
- **Fix:** Added `gracefulShutdown()` function that closes the HTTP server, then the DB pool, with a 10-second forced exit timeout.

### FIX 6: `require()` calls scattered (LOW)
- **Issue:** `pdfkit` required at line 2868, `node-cron` and `./backup` at line 3232 -- far from the other imports at the top. If these modules were missing, the error appeared unrelated to the real cause.
- **Fix:** Moved all requires to the top of the file. Wrapped optional deps (`node-cron`, `./backup`) in try/catch so missing modules don't crash the server.

### FIX 7: `setInterval` blocking shutdown (LOW)
- **Issue:** Cache cleanup interval kept the Node.js event loop alive, preventing graceful shutdown.
- **Fix:** Added `.unref()` to the interval timer.

### FIX 8: `buildPatchQuery` dead code (NOTE)
- **Issue:** Helper function defined at line 156 but never called. 10+ PATCH handlers inline the same pattern.
- **Fix:** Added a NOTE comment. Refactoring all handlers to use it is a future cleanup task.

---

## Code Review -- Bugs Fixed (nbi_project_dashboard.html)

### FIX 9: Column divider barely visible (MEDIUM)
- **Issue:** Blocked and At Risk sections use CSS `column-rule` for the vertical divider between left/right columns, but used `--border-default` (#2a2a2a) which is nearly invisible against the card background (#141414). Glen explicitly said the formatting looked "terrible".
- **Fix:** Changed to `--border-strong` (#3a3a3a) and increased column-gap from 24px to 32px.

### FIX 10: Markdown `**` showing in At Risk descriptions (LOW)
- **Issue:** At Risk items show a one-line reason from the task's last note or description. Many Planner-imported tasks have descriptions starting with `**Description of Work:**` and the raw markdown asterisks were displayed literally.
- **Fix:** Added `.replace(/\*\*/g, '').replace(/\n/g, ' ')` to strip markdown bold markers and newlines from the reason preview. Applied to both Workload and Dashboard views.

### FIX 11: Trend arrows crammed against labels (LOW)
- **Issue:** KPI metric trend arrows (e.g. "▲7") were inline between the value number and the label text, making them look like "10▲7OVERDUE" at small sizes.
- **Fix:** Added `display:block` and `margin-top:-2px` to the trend arrow span so it renders on its own line below the value.

### FIX 12: Undefined CSS variable `--bg-inset` (MEDIUM)
- **Issue:** 4 CSS rules referenced `var(--bg-inset)` but the variable was never defined in any theme. Elements (inline detail close button, sub-view toggle, board lanes, drag-over state) had transparent backgrounds as a result.
- **Fix:** Replaced all 4 occurrences with `var(--bg-surface)` which is the semantically correct equivalent.

### FIX 13: `loadClientNotes` using bare `fetch()` (MEDIUM)
- **Issue:** Line 2049 used `fetch()` instead of `authFetch()` for the client notes API call. Would fail with 401 if the endpoint requires authentication.
- **Fix:** Changed to `authFetch()`.

### FIX 14: Dead code removal (~280 lines)
- **Removed:** `renderStrategicDashboard()` (~130 lines) -- never called after D26 killed the MD/PM/IC toggle
- **Removed:** `renderIncompleteReport()` (~116 lines) -- replaced by `currentFilter.incomplete` flag on Tasks view
- **Removed:** `renderChangelogView()` (~42 lines) -- dispatcher redirects `changelog` to `settings` before reaching it
- **Removed:** `findRoot()` (~12 lines) -- duplicate of `getRootAncestor()`, never called
- **Removed:** `_dashboardRole` and `_dashboardMode` variables -- only used by removed strategic dashboard

---

## Code Review -- Comments Added

### server.js
- JSDoc comments added to uncommented routes and functions throughout the file
- Section headers verified and maintained
- Inline comments on complex logic (date arithmetic, sync endpoints, import format detection)

### nbi_project_dashboard.html
- Section headers (`// ==================== SECTION ====================`) added to logically group the JS code
- JSDoc comments added to render functions, event handlers, and data transformation functions
- Inline comments on non-obvious logic

---

## QA Test Plan

Written to `projects/nbi_dashboard/deliverables/qa_test_plan.md`
- **118 test cases** across 15 categories
- Categories: Authentication (8), Navigation (10), Dashboard (9), Workload (16), Tasks (18), People (4), Leads (8), Expenses (5), Finances (4), Settings (6), Downloads Import (7), Detail Panels (12), Cross-cutting (8), Responsive (6), API (7)
- Regression checklist for the tab restructuring

## QA Pass Results

### All Passing
- Authentication: login, logout, wrong password, unknown user, brute-force protection
- All 8 views render correctly with data
- API CRUD: tasks, clients, users, leads, expenses, finance
- Unauthenticated requests rejected (401)
- XSS prevention: `esc()` function properly escapes `<script>` tags
- Keyboard shortcuts: g+t (tasks), g+d (dashboard), g+f (finances), g+l (leads), etc.
- Theme switching: dark and light themes verified, clean rendering
- Task detail overlay: all fields present (title, client, status, priority, health, assignees, dates, hours, description, notes, files, dependencies, comments)
- Escape key closes panels
- Header/tabs remain clickable with detail panel open (z-index fix)

### Issues Found During QA (all fixed)
- safeName crash (FIX 1)
- Error handler ordering (FIX 2)
- XSS in public report (FIX 3)
- Column divider visibility (FIX 9)
- Markdown in descriptions (FIX 10)
- Trend arrow layout (FIX 11)

---

## UI/UX Audit -- 31 Findings (4 P0, 11 P1, 10 P2, 6 P3)

Full audit report saved by the audit agent. Key findings below.

### P0 -- FIXED
1. **People Capacity: "nullh/null%"** -- Server API returned null for committed/utilisation. Added null-coalescing (`?? 0`).
2. **Board Blocked column empty** -- Blocked tasks had `healthState: 'Blocked'` but various statuses (In Progress, etc.). Board only checked `status === 'Blocked'`. Fixed to also route health-blocked tasks to the Blocked lane.
3. **"New Task" garbage in portfolio** -- Placeholder root tasks with title "New Task" polluting the portfolio table. Filtered out.
4. **At Risk missing assignee** -- "Analytics & Telemetry" has no assignee. Data issue (unassigned task), not a code bug. UI correctly shows "Unassigned".

### P1 -- FIXED
5. **"1 tasks" grammar** -- Fixed pluralisation in Workload by Assignee.
6. **Board "Hr Est: 0.0h" noise** -- Hidden the hours badge when estimate is zero.

### P1 -- NOT FIXED (data/design decisions for Glen)
7. **Health chart nearly invisible** -- Dashboard distribution chart shows a tiny bar. Needs redesign to a donut chart.
8. **EST/ACTUAL columns all 0.0h** -- Progress by Project table is noise when no time data exists. Consider hiding.
9. **Truncated At Risk descriptions/assignees** -- CSS columns force truncation. Could be improved with tooltips or wider columns.
10. **Finance bars flat** -- Revenue vs Expenses chart shows identical bars for all months (projected data). Need actual/projected differentiation.
11. **Leads typos** -- "Mutliple" (should be "Multiple"), "insomniac" lowercase.

### P2 -- NOT FIXED (polish items for future)
12. **Duplicate portfolio tables** -- PROJECT PORTFOLIO and PROGRESS BY PROJECT are very similar. Consider merging.
13. **Blizzard "TBD" in P&L** -- Placeholder row in fee income.
14. **Sidebar health dots too small** -- 6px dots hard to see.
15. **Standup expand affordance** -- Chevrons nearly invisible.
16. **Settings incomplete display names** -- "Patrice", "Ruan", "Stavros" missing surnames.

### P3 -- NOT FIXED (nice-to-have)
17-22. Toggle button styling, quick filter expansion, revenue bar clipping, lead column accessibility, print testing, page permissions.

---

## Known Issues NOT Fixed This Session

1. **Finance P&L Enhancement** -- Glen wants "a little more of a true P&L view". Consulting metrics sidebar should dynamically reflect P&L data. NOT addressed.
2. **Board view project filter** -- Not yet built.
3. **Gantt scope selector** -- Not yet built.
4. **Drag-and-drop in By Project** -- Not yet built.
5. **1088 "Not Set" health states** -- Glen will clean up manually.

---

## Files Changed This Session

### Modified
- `dashboard-server/server.js` -- 8 bug fixes, JSDoc comments, require consolidation, graceful shutdown
- `nbi_project_dashboard.html` -- 3 visual fixes, section headers and JSDoc throughout
- `projects/nbi_dashboard/live_state/decisions.md` -- D25-D46 appended
- `projects/nbi_dashboard/live_state/work_completed.md` -- items 39-43
- `projects/nbi_dashboard/live_state/pending_tasks.md` -- refreshed
- `projects/nbi_dashboard/live_state/conversation_context.md` -- updated

### Created
- `projects/nbi_dashboard/deliverables/qa_test_plan.md` -- 118 test cases
- `projects/nbi_dashboard/session_logs/2026-04-06_session_b.md` -- session log
- `projects/nbi_dashboard/session_handoffs/handoff_2026-04-06b_code_review_qa.md` -- this file

---

## How to Start
```bash
cd D:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
node server.js
# Server runs on http://localhost:8888
# Dashboard at http://localhost:8888/nbi_project_dashboard.html
# Login: glen / nbi2026
```

## Next Session Instructions

1. **Load this handoff** -- `projects/nbi_dashboard/session_handoffs/handoff_2026-04-06b_code_review_qa.md`
2. **Glen UAT** -- Glen will review the dashboard himself and provide feedback
3. **Finance P&L Enhancement** -- Glen's D37 request for a more detailed P&L view
4. **Board view project filter** -- Add project filter dropdown to the Board sub-view
5. **Gantt scope selector** -- Add scope filter to Timeline view
6. **At Risk parent filtering** -- Consider filtering At Risk to leaf tasks only for cleaner presentation
