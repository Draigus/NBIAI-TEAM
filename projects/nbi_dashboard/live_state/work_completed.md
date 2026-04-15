# Work Completed

Append-only. Every feature/fix completed gets logged here immediately.

---

## 2026-04-14 (Session b — Deferred Audit Items)

Picked up the overnight backlog after session a ran into context limits mid-review. Finished the deferred audit items that were not blocked on external input.

**Frontend a11y/UX sweep** (nbi_project_dashboard.html):
- C1 Light theme badge contrast: darkened --danger/--warning/--success/--purple/--cyan text tokens to WCAG AA shades. priority-critical uses weight 800 + underline for distinction
- C3 Task detail panels: 20 form inputs got unique IDs and `<label for="...">` associations (inline + overlay variants, done by subagent)
- C6 Mobile overflow at 375px: Settings/Leads/Finances/Report all respect viewport. overflow-x auto on inner tables
- C7 Added `<main id="mainLandmark">` wrapping content; skip link updated
- H1 Calendar events keyboard accessible (role=button, tabindex, Enter/Space handler)
- H2 Warning sidebar: removed nested `<button>` inside `role="button"`. Refactored to plain div wrapper + inner button class
- H4 Sidebar sections are now collapsible, state persisted in localStorage per-section
- H5/H6 Active sidebar items get `aria-current="page"`; label+count combined in `aria-label`
- H7 Bug rows get full `aria-label` with type/status/priority/reporter/comment-count
- H9 Client research stub copy: honest "not yet connected to a live search backend" messaging
- H10/H11 Candidate and Team modals: `aria-labelledby`, Escape handler, focus management

**Server hardening** (dashboard-server/server.js):
- Code review H3: Cycle detection replaced with single recursive CTE (was O(M*N))
- Code review H5: SoW INSERT failures log client_id + title + uploader
- Code review M5: POST /api/clients/:id/reports is now admin-only, UUID-validated, audit-logged, 30-day expiry (was 90)
- Code review M6: Hiring CV uploads restricted to PDF (MIME + extension check)
- Code review M8: SoW zero-paragraph error surfaces filter stats + hint
- Code review M9: Calendar visibility DB failures now log('warn', ...) instead of silent swallow
- Security M10: Public report HTML adds X-Robots-Tag, Referrer-Policy, meta robots, meta referrer

**Verification:**
- Frontend: badge colors correct in light theme, sidebar collapse toggles + persists, bug rows expose aria-labels, mobile 375px zero overflow
- Server: task PATCH + cycle detection self-dep, CV PDF-only, report admin gate all return expected status codes via curl
- Production URL 200 OK after cloudflared auto-restart

**Deferred (too risky without user awake):**
- Security H4 httpOnly cookie migration (1-2 days)
- Security H1 xlsx replacement (days)
- Code review H1 double-escape storage migration (affects every text field)
- Skeleton screens on remaining views (cosmetic)

Commit: 5db75a9

---

## 2026-04-14 (Phase 9 - Organisational Practice)

WorkSage backlog Phase 9 — Organisational Practice page and rename HC.

- **Migration 018_practice_areas.sql**: added `practice_area` column to `leads`, `tasks`, `clients`; partial btree indexes; seeded 7 new work types (Barrier analysis, Market research, Change management, AI readiness, Advanced analytics, Training, Other for organisational performance); renamed legacy `client_sector='Human Capital'` to `Organisational` and back-filled `clients.sector`.
- **Server (server.js)**: `practice_area` added to allowed PATCH fields on `/api/leads/:id`, `/api/tasks/:id`, `/api/clients/:id`. `/api/sync/load`, `/api/sync/poll`, and `/api/sync/changes` insert+update paths now read/write `practice_area` (mapped to camelCase `practiceArea` for the frontend).
- **Frontend (nbi_project_dashboard.html)**: new `PRACTICES` constant, `currentFilter.practice` state, `filterByPractice()` action, `getTaskPractice()` parent-walking helper. Sidebar grew a "Practices" section (All / Organisational / Gaming / General) with combined task+lead counts. Practice filter applies inside `getFilteredTasks`, `renderLeadsContent`, and `renderManageClients`. Practice dropdown added to inline + overlay task detail panels, lead detail Deal Info section, and client management row. Breadcrumb chip + clear button included.
- **Seed file (migrate-leads.js)**: updated so a clean install gets the new work types and "Organisational" sector by default.
- **DB cleanup**: removed pre-existing duplicate title-case work_type rows (Barrier Analysis / Market Research / Change Management / AI Readiness / Advanced Analytics / Other) and the US-spelling "Organizational Performance" sector option.
- **Verification**: migration applied via PM2 reload (logs confirm `Applied migration 018_practice_areas.sql`). Direct DB writes confirmed practice_area accepted on all three tables. server.js syntax check clean.

WorkSage backlog items addressed:
- `a6c82c8c` Organisational Practice Page and Board — please_review
- `9a10d8d1` Rename HC to Organisational — please_review
- `c5f0705e` More work types for leads — please_review

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

## 2026-04-09 (Move-to-9 + Production Deploy)

119. **Migration Framework** -- schema_migrations table, runner.js, 7 numbered SQL files. First-run detection marks existing schema applied.
120. **DB Pool Scaling** -- min 5, max 50 connections (was 2/20). Per-user rate limiting 60 req/min keyed by token hash.
121. **Prometheus Metrics** -- prom-client, /metrics endpoint. Request duration histogram, pool stats gauge, custom counters (sync conflicts, auth failures, OCR, email).
122. **Retry + Circuit Breaker** -- resilience.js module. OCR (2 retries, 60s circuit), FX (3 retries, 300s circuit), email (2 retries). Exponential backoff.
123. **Backup Validation** -- backup-validate.js. JSON integrity, table completeness, row count drift detection. Weekly validation cron. Admin notification on failure. Restore expanded to all 7 tables.
124. **Response Envelope** -- v2 middleware wraps in {data, error, meta} via X-API-Version header. 37 GET endpoints migrated to apiCall(). Backward compatible.
125. **Cursor-Based Pagination** -- Audit log, leads, tasks endpoints converted. Returns nextCursor + hasMore. OFFSET kept as fallback.
126. **IndexedDB Write-Ahead Log** -- nbi_dashboard IndexedDB with wal + data_cache stores. Dual-write to localStorage + IDB. WAL recovery on startup. 50MB+ quota.
127. **Native Button Elements** -- 6 div role=button converted to native button. Sidebar toggle, sidebarItem(), inline filters, standup section.
128. **Production Deploy** -- Cloudflare account, nbi-consulting.com DNS moved to Cloudflare. Named tunnel nbi-worksage. URL: worksage.nbi-consulting.com. PM2 managed. Free, persistent, SSL.

## 2026-04-06 (Session D)

58. **Expense Report Workflow** -- New `expense_reports` table (auto-migration). 7 API endpoints: list, create, get, update, delete, submit, add/remove expenses. Expense view reworked: report cards as primary view, unassigned expenses table below. Report detail panel: expense list, totals by currency, add/remove expenses, submit button. Submit notifies Tom Rieger via in-app notification + email (SMTP when configured). Admin approve/reject cascades status to all expenses in report. Deep-link support for notification clicks and direct URLs (`#expenses/report/{id}`).
59. **Bug/Feature Report Button** -- Yellow "Report" button in header bar. Modal with bug/feature toggle, title, description, automatic screenshot (html2canvas CDN with 5s timeout fallback). `bug_reports` table (auto-migration). 5 API endpoints: list, create, update status, delete, serve screenshot. Settings > "Bug Reporting" tab with filterable index: type, reporter, title, page, status, date. Click-to-view detail modal with screenshot. Admin inline status change (open/resolved/won't fix).
60. **Code commenting pass** -- Added section-level and state variable comments to all new expense report and bug report code in both server.js and HTML.

## 2026-04-11 (Session A -- Bug Fixes + Production)

See items 78-128 above (already logged from earlier sessions).

## 2026-04-11 (Session B -- Hierarchy, Dependencies, Timeline)

155. **Work Item Hierarchy** -- 4-level system: Project > Feature > Story > Task. Migration 008 assigned types by depth (38 projects, 154 features, 924 stories, 4 tasks). Validation on all CRUD + sync. Type badges (P/F/S/T) in tree, board, timeline, detail panels. Split "+ New" dropdown with parent picker modal. Nesting enforcement on drag-drop and reparent. Board type filter buttons.
156. **Collapse/Expand System** -- Default load: collapsed to client level. "Collapse All" and "Expand to" dropdown (Projects/Features/Stories/Tasks). Re-collapse on view navigation. Fixed key format mismatch bug.
157. **Prerequisites & Dependents System** -- Hard-block on Done, soft-warn on In Progress. Circular prevention. Detail panels show "Prerequisites" with status icons and "Dependents" (reverse lookup, read-only). Lock icons on tree rows and board cards. Stale cleanup on delete.
158. **Timeline Overhaul** -- Hierarchical rendering (Project > Feature > Story > Task tree with indentation). Collapsible rows. Time navigation (back/forward arrows + Today button). Zoom (8px-60px per day). Today column (green). Status-coloured bars. Resizable detail panels.
159. **Dependency Link Mode** -- Dependencies dropdown (Link Mode + Show Arrows + Dependency View). Drag-to-create dependencies with preview arrow. Interactive arrows (click to select, Delete to remove, drag to reconnect). Show/Hide toggle. Critical Path View (filtered Gantt, topologically sorted).
160. **Code Quality Pass** -- Server: 15 issues fixed (schema drift, item_type validation, DELETE transaction, UUID validation). Frontend: 10 issues (CSS rules, JSDoc, createTaskObject factory, clientGroupKey helper, isTaskIncomplete helper). README written.
161. **Bug Fixes** -- Fee income auth changed to any user. Finance data recovery from append-only table. Bug report sort (5 columns). Assignee panel refresh. Robin removed from assignments.

## 2026-04-11 (Session C -- Code Review & Quality)

162. **Server Code Review -- ALL issues fixed** -- Metrics endpoint restricted to localhost. Orphaned JSDoc fixed. Full JSDoc added to 8 functions. Dead code removed. console.error replaced with structured log. archiver moved to top-level require with fallback. Screenshot size limit (5MB). UUID validation on 8 sub-resource endpoints. Entity type whitelist on attachments. Auth bypass tightened (explicit regex). N+1 query fix in sync/changes. Audit log returns 500 on error.
163. **Frontend Code Review** -- 16 dead functions removed. 5 stale comments removed. 8 dead CSS rules removed. 3 empty CSS rules removed. 4 duplicate CSS rules fixed. 45 JSDoc additions (100% coverage, 403 functions). Inline hover handlers replaced with CSS.
164. **QA Test Plan Extended** -- 118 cases expanded to 175 (6 new sections: hierarchy, prerequisites, timeline, dependency links, collapse/expand, server quality).
165. **QA Execution** -- 175 cases run. 169 pass. 3 high-severity prereq bugs found and fixed. 2 false positives (rate limit, wrong endpoint). 1 low fixed (legacy routes).
166. **Server-Side Prerequisite Enforcement** -- PATCH /api/tasks/:id now blocks Done status when prerequisites incomplete. Circular dependency detection via BFS walk. DELETE cascade cleans up orphaned dependency references from dependent items (text[] array fix).
167. **Legacy Hash Route Redirects** -- LEGACY_ROUTES map redirects #incomplete to #tasks, #changelog to #settings. Applied to switchView() and popstate handler.

## 2026-04-13 (Session A -- QA Bugs, Accessibility, UX Polish, Features, Hub QA)

168. **QA Bug Fixes (4 closed)** -- BUG-002: amount <= 0 rejected. BUG-003: XSS input sanitisation on 7 endpoints (12 fields). BUG-004: UUID validation on expense GET/DELETE. BUG-006: admin RBAC on PUT /api/finance.
169. **Accessibility Overhaul** -- ARIA on modals/tabs. Contrast boost across 7 themes (WCAG AA). Focus trapping in modals. MutationObserver for dynamic keyboard access (tabindex/role auto-patching). Delegated keydown for Enter/Space on onclick divs.
170. **UX Polish** -- withButtonLoading on 5 submit forms. Required field indicators on 7 labels. Inline validation (showFieldError/clearFieldErrors) on 5 form handlers.
171. **Medium Fixes** -- max-width 1800px on main content. Resize handles 6px to 12px. Finance table mobile scroll. Modal width tokens (--modal-sm/md/lg/xl). Zebra striping on report tables.
172. **Multi-Select Filters** -- Status, health, assignee converted from single-select to multi-select checkbox dropdowns. Click-outside-to-close. Backward-compatible history states.
173. **Imminent Time Filter** -- Tasks due within 3 days shown as amber "Imminent" metric with panel section. Labels: Today/Tomorrow/Xd.
174. **Client Page Fields** -- studio_size (INTEGER) and contract_value (NUMERIC 12,2) added to clients table (migration 009). Server POST/PATCH updated. Frontend inputs in detail panel + collapsed row + profile header.
175. **Hub Infra + Security (prior commit)** -- 25 cross-app issues fixed. user.id to user.sub data corruption. Board role escalation removed. Bcrypt dummy hash. Company scoping on queue routes. 11 frontend API endpoints corrected. ESM config fix.
176. **Hub QA (68 tests)** -- First functional test. 63 pass, 5 bugs found and fixed: duplicate agent 500->409, UUID validation on 14 handlers across 6 route files, error response format standardised.
177. **Hub Build** -- TypeScript compiles clean. PM2 running from dist/index.js in fork mode.

## 2026-04-15 (Session g -- double-escape storage migration)

178. **W1: escHtml() removed from all write paths (commit 203dad6)** -- 21 call sites across tasks / leads / expenses / bug_reports / bug_report_comments / candidates POSTs and PATCHes, plus the monthly expense-reminder notification body at line 6804 (missed by the handoff). escHtml() kept on the 3 legitimate surfaces: function definition, password-reset email HTML, public client-report HTML document.
179. **W2: Migration 020_decode_double_escape.sql (commit abac7f2)** -- decode_html_entities(TEXT) plpgsql fixpoint function with &amp; replaced FIRST so nested sequences collapse correctly across iterations. 19 rows decoded: tasks.description 2, bug_reports.description 14, bug_report_comments.text 3. Defensive no-op UPDATE statements on all other affected tables for idempotency. Migration function left in place for future manual use.
180. **Round-trip test** -- Minted a short-lived admin test session (cleaned up after), POSTed / PATCHed a bug report + comment with `can't "quoted" & <tag>`, confirmed raw storage at DB + API-response level. GET list round-trips raw. Frontend esc() at nbi_project_dashboard.html:3243 unchanged, 412 call sites untouched.
181. **Pre-migration backup** -- pg_dump saved to dashboard-server/backups/pre_migration_020_20260415_032100.sql (4.3 MB). Rollback procedure documented in deliverables/double_escape_migration_2026-04-15.md.
