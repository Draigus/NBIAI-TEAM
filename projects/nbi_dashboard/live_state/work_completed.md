# Work Completed

Append-only. Every feature/fix completed gets logged here immediately.

---

## 2026-04-04 (Sessions a + b)

All 26 features from Glen's approved roadmap built. See `session_handoffs/handoff_2026-04-04b_feature_blitz.md` for full list.

Quality-of-life improvements: sorting controls, bulk operations, user management, undo system (Ctrl+Z), expanded search, filter persistence, loading/sync indicators, conflict alerts.

## 2026-04-04 (Session c)

1. **Excel analysis completed** -- Read `clean client list.xlsx`, extracted all 32 columns, 41 rows, identified data quality issues, mapped current fields to CRM best practices.
2. **CRM best practice research completed** -- Pipeline stages, recommended fields, UI patterns, consulting-specific features documented.
3. **Session continuity system built** -- append-only logging in CLAUDE.md, memory files, live_state directory, session_logs directory.

## 2026-04-05

4. **Client Leads Tracker -- COMPLETE** -- 7 new tables, full CRUD, 4 views (kanban, table, pipeline, by-client), detail panel, quick-add, settings config, follow-up reminders
5. **QA Pass + Security Fixes -- COMPLETE** -- static file serving fix, path traversal fix, admin role checks, XSS sanitiser, global error handler
6. **File Attachments Bug -- FIXED** -- downloads now use authFetch + blob
7. **Expense Reports -- COMPLETE** -- 3 tables, full CRUD, receipt management, approval workflow
8. **Manage Clients Sub-view -- COMPLETE** -- inline-editable client list, contact management, add/delete
9. **Server Crash Protection -- COMPLETE** -- express-async-errors, unhandledRejection handler
10. **Full UI/UX Review + QA -- COMPLETE** -- all 10 views tested, zero JS errors
11. **UX Fixes** (6 of 8): NaN, duplicate dropdown, changelog, missing tabs, breadcrumbs, board width
12. **Theme System** -- 7 themes with dropdown picker
13. **Dashboard Layout Overhaul** -- side-by-side charts, content scaling, text sizes
14. **Tactical/Strategic Dashboard** with standup view
15. **Mobile Fixes** -- dvh, swipeable leads, overflow-x lock
16. **Infrastructure** -- .env, daily backup, compression, auth cache, config cache, 18 indexes, conflict detection
17. **Task Dependencies** -- DB, soft-block confirm, Gantt arrows
18. **Universal File Uploads** -- 200MB, any entity type
19. **Client Status Reports** -- PDF + shareable HTML
20. **Resource Planning** -- capacity heatmap + deal readiness
21. **Contract Import Wizard** -- 3-step modal
22. **Codebase Cleanup + Commenting** -- both server and frontend

## 2026-04-06

23. **Downloads Scanner & File Importer** -- scans Downloads folder for Excel/CSV, 5 format detectors, 2-step wizard, imported 968 tasks from 19 MS Teams Planner exports
24. **Navigation Restructure** -- 10 tabs reduced to 8, Incomplete/Changelog removed, tabs renamed (Dashboard<->Workload swap), tab order changed, sidebar updated
25. **MD/PM/IC Toggle Removed** from Workload view
26. **Workload View Overhaul** -- date header, project-focused KPIs (7 metrics, clickable, trend arrows), layout rearranged (Overdue+This Week top, Blocked+At Risk bottom), overdue shows all items with client grouping and severity bands, Blocked/At Risk split into separate sections with one-line reasons
27. **Standup Improvements** -- urgency sort, collapsed by default, active-work-only filter (no backlog), done-this-week with checkmark, available people collapsed into one line, first-name fuzzy matching fix
28. **Dashboard Portfolio Table** -- sortable columns (Project, Client, Tasks, Done, Active, Blocked, %, Estimate, Actual), client filter dropdown, clickable rows, mini progress bars
29. **Tasks View Improvements** -- assignee dropdown filter, Enter-to-search, Incomplete toggle, breadcrumb/filter bar, quick-add, board leaf-only, calendar expand, filter-aware right panel
30. **Assignee Dropdown** -- chips with remove + multi-select from team members (replaces free text)
31. **Task Title Editable** -- first field in Properties, editable input in both panel types
32. **Description Auto-Expand** -- auto-sizes on render and input, draggable
33. **Finance KPI Additions** -- Op. Margin + Utilisation moved from Dashboard
34. **Header/Tab Z-Index Fix** -- all navigation clickable even with detail panel open
35. **Print Current View** -- prints whatever view you're on, not forced to Report
36. **Client Ordering** -- paying clients first (CH, LH, SU, GO) everywhere
37. **Project Click-Through** -- Dashboard portfolio rows navigate to Tasks tree view
38. **Data Fixes** -- Bryan inactive, Goals Studio created, contractor labels removed, Glen/Tom name merges, Jonas task assigned

## 2026-04-06 (Session B -- Code Review + QA)

39. **Code Review -- server.js** -- Fixed 8 bugs: safeName crash in import endpoint, error handler ordering (moved after all routes), XSS in public HTML report (added escHtml), _failedLogins memory leak (periodic cleanup), graceful shutdown handler (SIGTERM/SIGINT), require() consolidation (pdfkit/node-cron at top), unref() on intervals. Added JSDoc to uncommented routes.
40. **Code Review -- nbi_project_dashboard.html** -- Added section headers and JSDoc comments throughout JS (agent-assisted). Stripped raw markdown from At Risk description text. Made column dividers more visible (border-strong).
41. **QA Test Plan** -- 118 test cases across 15 categories: auth, navigation, all 8 views, detail panels, cross-cutting concerns, responsive, API endpoints. Written to deliverables/qa_test_plan.md.
42. **QA Pass** -- All views tested and verified. API endpoint tests all passing. XSS prevention confirmed. Keyboard shortcuts working. Theme switching across all 7 themes verified. Task detail overlay fields verified.
43. **MD File Updates** -- decisions.md (D25-D46), work_completed.md, pending_tasks.md, conversation_context.md, session log all updated.

## 2026-04-06 (Session C -- Glen UAT + Feature Build)

44. **Timer Removed** from task detail panel (accidentally added). Client field shows text+badge when set, dropdown only when empty.
45. **Standup Inline Editing** -- All task fields (status, priority, health, assignee, dates, hours, deps) editable directly on the standup Work by Person bar. `standupUpdateTask()` bypasses `renderAll()` for no-scroll-reset updates.
46. **Standup Sort Order** -- blocked > overdue > planning > in progress > drafted > in review > done (sprint only). `standupSortOrder` map.
47. **At Risk/Blocked Grid Layout** -- CSS grid cards with `repeat(auto-fill, minmax(340px, 1fr))`. `.risk-grid` and `.risk-card` classes.
48. **Scroll Preservation** -- 3-mechanism fix: (1) `standupUpdateTask` targeted DOM updates, (2) `_scrollRestoreTarget` for deferred scroll restore after `renderAll()`, (3) sync poll cooldown (`_lastLocalSyncTime`, 15s) to suppress own-change re-renders.
49. **Finance P&L Sidebar** -- Cash Runway metric, P&L Summary waterfall added.
50. **Project Filter Dropdown** -- Added to shared filter bar after People dropdown. Uses `getRootTasks()`. Applies to Board, Gantt, Tree, Calendar via `getFilteredTasks()`.
51. **Settings Tabbed Overhaul** -- 5 tabs (Account, Team, Config, Data, Changelog). Inline editable display_name and email. Fixed incomplete names (Ruan Pearce-Authers, Stavros Kylakos, Patrice Love).
52. **Board Drag-and-Drop** -- `onBoardDragOver()` with drop indicators, `onBoardDrop()` for cross-lane status change and within-lane priority reorder.
53. **Leads Drag-and-Drop** -- `onLeadLaneDragOver/Leave/Drop()` with position-based priority.
54. **Lead Detail Contact Info** -- Inline editable name, email, phone on lead card. `patchContact()` and `addContactFromDetail()`. DB migration for email/phone columns.
55. **Expense Receipt Upload + OCR** -- OCR.space API (Engine 2) with Tesseract.js fallback. sharp resize for phone photos. `extractReceiptFields()` for amounts, dates, currency (explicit text only, not symbols), vendor, itemization (fare, tip, VAT, subtotal, service fee, discount, booking fee, delivery). Currency falls back to user's last expense, then GBP.
56. **Save & Close Button** on expense detail panel.
57. **Mobile Expense View** -- Card-based layout for <768px. Tappable cards replace table. Header stacks vertically. Summary KPIs 2-column grid.

## 2026-04-07

See `session_handoffs/handoff_2026-04-07c_bugfixes_qa.md` for items 61-77 (bug fixes, My Tasks view, Timeline fixes, Pipeline KPI restructure, page permissions, PM2 setup, full 57-test QA pass).

## 2026-04-08

78. **UI/UX Audit Re-Validation** -- Verified all 20 audit items against current code. 4 fixed, 6 partially fixed, 22 still valid. Audit document updated with validation status.
79. **Accessibility Overhaul (6 items)** -- ARIA attributes on toasts/nav/tabs/modals, :focus-visible rings replacing outline:none, WCAG AA contrast fixes, tabindex+role on 60+ interactive divs via MutationObserver, skip-to-content link, focus trapping on all modals.
80. **Themed Confirmation Dialogs** -- Replaced all 24 native confirm() calls with themed async themedConfirm(). 7 functions made async. New #confirmModal HTML element.
81. **Form Validation + UX Helpers** -- .is-invalid CSS, validateField/clearFieldErrors JS, withButtonLoading async button helper, skeleton screen CSS+JS, .field-required indicator.
82. **Visual/Consistency Fixes** -- Removed unused Orbitron font (~40KB), added modal width tokens, max-width 1800px on main content, spacing tokens extended (3xl/4xl).
83. **Mobile/Touch Fixes** -- Gantt handle 14px, filter chip close 28px, 44px touch targets at 1024px, finance table overflow-x, mobile sidebar Escape key.
84. **Mobile Header Restructure** -- Single-line header on mobile. Print/Report/Theme/SignOut moved to overflow ⋮ menu. +Task icon-only.
85. **Mobile Sidebar Overhaul** -- 280px slide-in with animation, forced single-column layout with !important overrides, 44px touch targets, collapsed state override, sections explicitly flex-direction:column.
86. **Tab Bar Mobile Fix** -- Horizontal scroll at all widths below 1024px, tabs never wrap.
87. **Standup Collapsed by Default** -- Collapsible with sessionStorage persistence. Chevron toggle.
88. **Zero-Delta Trend Indicator** -- Shows em-dash + 0 when delta is zero instead of blank.
89. **Textarea Auto-Resize Fallback** -- JS fallback for Firefox/Safari where field-sizing:content not supported.

## 2026-04-08 (Session B -- Comprehensive 6-Sprint Improvement)

90. **Structured JSON Logger** -- Replaced 55 console.* calls with `log(level, prefix, message, data)`. JSON to stdout/stderr.
91. **Session Token Hashing** -- SHA-256 hash stored in DB, plaintext returned to client. Token cache keyed by hash.
92. **Error Response Sanitisation** -- 13+ `e.message` leaks replaced with generic messages. Full errors logged server-side.
93. **buildPatchQuery() Consolidation** -- 11 PATCH handlers refactored to use shared helper. Dead "unused" comment removed.
94. **N+1 Query Fixes** -- clients/:id and leads/:id combined into single queries with json_agg subqueries.
95. **Sync Poll Pagination** -- LIMIT 500 + hasMore flag. Prevents unbounded payloads.
96. **Async Email** -- Fire-and-forget `sendEmailAsync()` replacing blocking sendMail calls.
97. **FX Rate Auto-Refresh** -- Daily cron at 06:00 fetches from frankfurter.dev, stores in settings, invalidates cache.
98. **Input Length Validation** -- MAX_LENGTHS + validateLength() on 6 endpoints.
99. **Database Indexes** -- 6 new indexes on tasks.status, leads.priority, expenses.category_id, audit_log.created_at, audit_log.entity, notifications.username.
100. **Statement Timeout** -- 30s query timeout on pool.
101. **PM2 Ecosystem Config** -- ecosystem.config.js with memory limits, log files, autorestart.
102. **Audit Log Redaction** -- Strips password, token, reset_token, secret, api_key before persisting.
103. **Expense Approver from DB** -- Moved from hardcoded env var to settings table lookup.
104. **Atomic User Creation** -- INSERT ON CONFLICT replacing SELECT-then-INSERT race condition.
105. **escAttrJs XSS Fixes** -- 11 gaps fixed in inline onclick handlers (client names, filenames, template names, user page access).
106. **Cache Invalidation** -- invalidateCache() calls after expense category and user profile changes.
107. **SMTP Retry** -- Simple 3-attempt retry with backoff (where implemented).
108. **renderAll() Decomposition** -- 106 call sites reduced to 16. renderContent() and renderSidebarCounts() for targeted updates.
109. **Event Listener Registry** -- addManagedListener() + cleanupListeners() on logout. 9 listeners converted.
110. **Conflict Resolution Modal** -- Field-by-field diff with Keep Mine / Use Server Version buttons. Replaces silent toast.
111. **Offline Indicator** -- Banner below header on navigator.offline. Triggers syncToAPI on reconnect.
112. **localStorage Quota Handling** -- try/catch on setItem, warning toast on QuotaExceededError.
113. **Responsive Fixes** -- Modal min() sizing, tablet tactical grid 2-col, tab bar overflow indicator.
114. **PATCH Empty Field Validation** -- Blocks empty title on tasks/leads, empty name on clients, empty display_name on users.
115. **Performance Timing** -- console.debug when renderAll/renderContent exceeds 100ms.
116. **Backup Uploads Manifest** -- GET /api/backup includes uploadManifest with file metadata.
117. **Dead Code Removal** -- Removed unused _fe() function.
118. **Excel Import Template** -- NBI_Dashboard_Import_Template_v2.xlsx with Tasks, Leads, Clients, Reference sheets.

## 2026-04-06 (Session D)

58. **Expense Report Workflow** -- New `expense_reports` table (auto-migration). 7 API endpoints: list, create, get, update, delete, submit, add/remove expenses. Expense view reworked: report cards as primary view, unassigned expenses table below. Report detail panel: expense list, totals by currency, add/remove expenses, submit button. Submit notifies Tom Rieger via in-app notification + email (SMTP when configured). Admin approve/reject cascades status to all expenses in report. Deep-link support for notification clicks and direct URLs (`#expenses/report/{id}`).
59. **Bug/Feature Report Button** -- Yellow "Report" button in header bar. Modal with bug/feature toggle, title, description, automatic screenshot (html2canvas CDN with 5s timeout fallback). `bug_reports` table (auto-migration). 5 API endpoints: list, create, update status, delete, serve screenshot. Settings > "Bug Reporting" tab with filterable index: type, reporter, title, page, status, date. Click-to-view detail modal with screenshot. Admin inline status change (open/resolved/won't fix).
60. **Code commenting pass** -- Added section-level and state variable comments to all new expense report and bug report code in both server.js and HTML.
