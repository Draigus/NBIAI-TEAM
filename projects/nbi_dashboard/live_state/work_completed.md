# Work Completed

Append-only. Every feature/fix completed gets logged here immediately.

---

## 2026-04-15 (Late-night session — quick wins + team calendar events)

Context refactor after the previous session hit a 20MB request-size error.
Used surgical Grep/Read instead of loading full files.

### 5 quick-win bugs (Phase A of the remaining workload)
- **6b581233 — New button legibility** (`fe4f925`): bumped to 0.875rem/600
- **afe33305 — Bug Tracker Priority/Type column overlap** (`fe4f925`): added spacing to feature rows
- **420ee3b6 — Standup click jumps to top** (`52c5325`): `openDetailOverlay` snapshots and restores `scrollY` + `mainContent.scrollTop` in a requestAnimationFrame so the fixed overlay + textarea auto-resize can't reset the dashboard scroll
- **9a8010a7 — Cancelled items crossed out** (`f8bfe14`): `.task-row--cancelled`, `.standup-task--cancelled`, `.board-card--cancelled` CSS with strikethrough, grayscale, and 45-50% opacity. Task row status icon shows × for Cancelled
- **53f56fe0 — Kanban density** (`f0dce5c`): tightened padding, fonts, and column widths across all four boards. Projects (160→140 lane, 0.82→0.76 title), Bug Tracker (280→220 lane), Hiring (180x100→150x78 card), Leads (220-280→180-240 lane). ~25-30% smaller cards, no legibility loss at 0.65rem minimum

### People → Calendar auto-scale + admin firm-closure quick-add (`7c8a462`)
- Roster table: `table-layout: fixed`, day columns share remaining width via `width: auto` with a 110px sticky name column; wrap max-height ties to `calc(100dvh - header - 260)` and scrolls internally
- Month grid: `grid-auto-rows: minmax(72px, 1fr)` + fixed height so cells divide remaining vertical space instead of pushing the page
- Admin-only "× Firm Closed (All)" button next to "+ Add Event" in the People Calendar controls bar; prefills a `firm_closed` event with today's date range and "Firm Closed — All Day" title. Modal opens pre-populated so admin can extend the range or edit the label before saving
- Wired `prefill.title` through to the modal input (was previously ignored)

### 2 more calendar fixes
- **1d3d811e — My Work → Workload expand on click** (`4b3a9c1`): new `navigateToTaskInTree` helper walks up `parentId` uncollapsing every ancestor + the client group, switches to Projects, opens detail, and `scrollIntoView({block: 'center'})` on the target row
- **e49be05e — Calendar declutter** (`4b3a9c1`): "Show events from others" toggle now appears on the People → Calendar controls bar (previously only Projects → Calendar). `firm_closed` events are exempted from the filter everywhere — always visible since they apply to the whole team

### d4367137 — Team events on calendar (`e116433`)
**Server** (migration 023 + server.js):
- Migration 023: nullable `team_id` FK on `calendar_events`, indexed
- POST accepts `team_id`; non-admin must be a member of the target team (403 otherwise); admin can target any team. When `team_id` set, `user_id` forced to null
- PATCH allowlist extended with `team_id`
- GET joins `teams.name` as `team_name`
- `buildCalendarVisibilityClause` extended: team events only visible to their own team members or admins, even if `visibility='team'`. Tagging an event to a team is implicitly team-private
- `GET /api/teams?include=members` adds `member_display_names` inline so calendar can fan team events onto each member's row in one round trip

**Frontend**:
- Calendar event modal gains a "For" dropdown (Myself | Team: X | ...)
- `loadCalendarEvents` fetches `/api/teams?include=members` in parallel and caches `team_id → [display_name, ...]` in `_teamMembersCache`
- `renderPeopleCalendarView` fans out team events onto every member's row; falls back to a synthetic "Team: <name>" row when membership cache misses
- "Show events from others" filter exempts team events (user still sees team events they're a member of regardless of toggle)

**Tests**: 5 new regression tests in `calendar-team-events.test.mjs`:
- Member can create for own team
- Non-member gets 403 for foreign team
- Admin can create for any team
- GET returns `team_name` joined
- Team members see private team event, non-members don't

### CLAUDE.md — Bug triage pipeline (`fe4f925`)
Documented Glen's 7-step mandatory pipeline for every bug_reports item:
receive → review → plan → prioritise → fix → test → update+comment.
Plain English comments only (no jargon), must start with "Fixed."/"Done."
and end with "Please test by..."

### Magnus permissions cleanup earlier in session (`16831ef`)
Already committed: `users.role` member → admin, `page_permissions` wiped
of all `magnus` allow-list entries, 26 stale sessions deleted, `init-db.js`
seed role updated.

### 2f1b052a — Complete marker for Won leads (already shipped, moved to please_review)
Verified the `Mark Complete` button at line ~12467, the `.lead-detail--complete`
CSS that locks inputs, the `completeLead`/`uncompleteLead` API functions, and the
visual markers across kanban/table/card-list views. Extended from kanban-only to
all three lead views earlier today in Phase 5 polish commit.

### Test suite state
- 71 vitest tests (was 66 at start of session — added 5 team-events tests)
- 14 playwright tests
- **85 total, all green**
- All migrations applied to dev DB (021, 022, 023)
- PM2 restarted clean at 22:41ish with new pid 40468

### Bug tracker state
- **19 please_review** total (was 15 at start of session)
- 11 items added to please_review this session:
  - 5 quick wins (the 5 bugs I worked through in pipeline order)
  - 4 calendar-related fixes/features (1d3d811e, e49be05e, d4367137, 2f1b052a)
  - 2 earlier completions from the overnight push (not counted twice — already logged)

### Remaining in_progress / open
- **a6c82c8c HC Page and Board** — in_progress, big feature (Z7), needs brainstorming
- **b7a2f97f Hiring Page** — in_progress, basic kanban shipped but Glen's detailed spec (arrows, stage-specific fields, "Clear Candidate" button, auto-archive on Hired) would be a rewrite
- **86be4df5 Gantt Chart** — in_progress, dependency arrows in calendar detail (O6), needs brainstorming
- **cb32b7f9 Work Organisation in Tasks Menu (SoW layer)** — open, Z6 in master plan, needs brainstorming
- **c73af494 By Employee Sort Incomplete** — open, semantically ambiguous (sort vs filter), needs Glen input

### Blocked on Glen
- **ae561c32 PM Report System** — needs SMTP provider
- **f3a5e888 Due & Late Ticket Warning System** — needs SMTP provider

---

## 2026-04-15 (Session — Kanban merge + Phase 1 cleanup)

### Kanban drag-to-reorder (D79) — MERGED
- Merge commit `e9b6166` on master. 22 commits from `kanban-drag-reorder` branch.
- Migration 021 applied to dev DB; backfill verified dense across all four tables.
- Full test suite green: 53 vitest + 7 playwright = 60 tests.
- PM2 restarted, dev server running the new code on port 8888.
- Deliverable note lives in the plan file (`.claude/plans/iridescent-imagining-kitten.md`); not written as a separate deliverable doc yet.

### Phase 1: Cleanup (Master Workload Roadmap)

**B1 — express-rate-limit IPv6 fix** — commit `69f4129`
- `dashboard-server/server.js:44` — imported `ipKeyGenerator` from `express-rate-limit`
- `dashboard-server/server.js:443-447` — keyGenerator now delegates to `ipKeyGenerator(req)` for the fallback path
- PM2 restart at 12:07:25 produced a clean boot log (no ValidationError)

**B2 — Sync endpoint [[]] malformed array fix** — commit `6d33612`
- `dashboard-server/server.js:3838-3860` — added `normaliseStringArray()` helper in the sync upsert loop. Flattens + string-filters `t.assignees` and `t.dependencies` and logs `warn 'Sync' 'Normalised non-flat array field'` with taskId + before/after when it has to rewrite a payload.
- `dashboard-server/tests/unit/sync.test.mjs` — new file, 3 tests covering [[]] input, well-formed input, and mixed-garbage normalisation.
- Existing PM2 log spam was from the frontend sending `[[]]`; the defensive normalisation catches it at the server boundary. Frontend source still pending identification from the next live warn-log hit.

**Phase 1 status:** done. Test count 56/56 (56 vitest + 7 playwright pending). Next: Phase 2 (K1 — Playwright drag specs).

### Phase 2: Test debt

**K1 — Playwright drag specs for all four boards** — commit `26b04be`
- `dashboard-server/tests/e2e/kanban-drag.spec.js` — 5 new E2E tests: Bug Tracker intra-column, Bug Tracker cross-lane, Tasks intra-column (priority preservation), Leads intra-stage (priority preservation), Hiring intra-stage.
- Navigation uses `page.evaluate(() => switchView(...))` + direct function calls (loadBugReports, loadCandidates, etc.) rather than clicking sidebar buttons — the sidebar render races with post-login data load.
- Dummy task seeded per test to bypass `renderContent`'s `tasks.length === 0` empty-state shortcut (root cause discovery during first test run).
- Total suite now 56 vitest + 12 playwright = 68 tests.

### Phase 3: Overnight wins

**G1 — Collapsible sidebar with client/practice abbreviations** — commit `357c542`
- Existing collapse mechanism (`.sidebar.collapsed`, `toggleSidebarCollapse()`) just hid client/practice labels. Now shows a 2-letter abbrev chip instead.
- Added `.sidebar__item__abbrev` CSS (hidden normally, shown when collapsed).
- Sidebar render functions build a `<span class="sidebar__item__abbrev">` for every client (via `clientPrefix()`) and every practice (via `PRACTICES[i].abbrev`).
- Widened collapsed sidebar from 48px to 56px to fit 3-char `NSI`.
- Dev DB: set abbreviations for 5 clients (Goals Studio→GS, Lighthouse Games→LH, Lighthouse Studios→LS, NSI→NSI, Playsage→PS). Couch Heroes (CH) and Sarge Universe (SU) were already set.

**G2 — Practice model: Gaming + Organizational Health only** — commit `a99c9c7`
- Migration 022 applied to dev DB. Backfilled 1122 tasks + 43 leads + 44 clients to `gaming`. Zero rows left as `general`, `organisational`, or NULL.
- `POST /api/clients` now requires `practice_area` ∈ {gaming, organisational_health}. 4 new vitest regression tests.
- Frontend `PRACTICES` array reduced to 2 entries with shortLabel + abbrev fields. General removed.
- Manage Clients view now has a required practice dropdown on the create form. `createClientFromManage()` validates client-side before POSTing.

**G4 — Sortable People-tab tables** — commit `56231a2`
- 4 sort-state globals added: `_peopleWorkloadSort`, `_peopleCapacitySort`, `_peopleClientHoursSort`, `_peopleTaskSummarySort`.
- Workload Overview bar chart has a sort toolbar (Name / Tasks / Hours Spent / Hours Est.).
- Capacity Planning, Hours by Person per Client, and Task Summary by Person all have clickable sortable headers with ▲▼ indicators. Pattern mirrors `_rptProgressSort` from the Reports view (commit dd87753).
- Row-building refactored so sort runs on an object array independent of render.

**Phase 3 status:** done. Test count 60 vitest + 12 playwright = 72 tests green. PM2 restarted at 12:38:52 — clean boot, no warnings, no sync errors.

### Ad-hoc cleanups during Phase 3 check-in

**Magnus → admin (D88)** — commit `16831ef`
- Dev DB: `users.role` for Magnus flipped member → admin
- Dev DB: `settings.page_permissions` — per-user entries (`{"leads": ["magnus"], ...}`) replaced with default `{"leads": "admin", "expenses": "admin", "finances": "admin"}`
- `dashboard-server/init-db.js:176` — default seed role changed member → admin (existing DBs unaffected by `ON CONFLICT DO NOTHING`)
- 26 existing Magnus sessions deleted so she re-logs-in with fresh admin role
- Zero code-path changes — all Magnus refs in source are historical comments with no runtime effect

**Warnings user-specific (D89)** — commit `739ea6a`
- `nbi_project_dashboard.html:computeWarnings()` removed the `isAdmin` short-circuit
- Added `_ownsViaAncestor(task)` walking parentId up 20 levels with per-root cache
- Warnings now fire only for tasks the user is an assignee on OR on an ancestor in the hierarchy
- Alerts tab was already server-scoped via `WHERE username = req.user.username`

**Calendar DATE timezone fix (D90)** — commit `1e93661`
- pg driver's default DATE parser was converting `'2026-04-16'` → JS Date at local midnight → `'2026-04-15T23:00:00.000Z'` ISO
- Frontend concatenated `'T00:00:00'` onto the ISO string → Invalid Date → silent drop in day-building loop
- Every calendar event Glen and Magnus created today was affected
- Fix: `pgTypes.setTypeParser(1082, v => v)` at top of `server.js` — returns DATE as bare YYYY-MM-DD string
- 2 new regression tests in `tests/unit/calendar-date.test.mjs` proving no `'T'` leaks through

### Phase 4: Mobile UI pass (G3)

**G3 — iPhone 11 (414×896) CSS fixes** — commit `1033c1a`
- Audit found three kanban boards lacked scroll-snap mobile treatment: Bug Tracker, Hiring, Tasks Board. At 414px portrait they showed "one lane plus a sliver" — Glen's "some views looked awful" complaint.
- Added `@media (max-width: 480px)` rules: `.bug-tracker__kanban`, `.hiring-kanban`, `.board` all now use `display: flex; overflow-x: auto; scroll-snap-type: x mandatory`. Lane widths: 100% for Bug Tracker/Hiring, 92% for Board (so the next lane peeks through).
- People tab G4 sort toolbar gains `flex-wrap: wrap`, and `.rw-name` column shrinks from 100px to 72px so the bar has room to render.
- Deliverable: `projects/nbi_dashboard/deliverables/2026-04-15-mobile-ui-pass.md` with 8 screenshots at 414x896 covering Dashboard, Workload, Projects Board, People, Reports, Bug Tracker, Hiring, Leads.
- Capture harness: `dashboard-server/tests/e2e/mobile-screenshots.spec.js` — seeds fixture data per run, walks each view, saves PNGs to `deliverables/2026-04-15-mobile-screenshots/`. Tagged `@mobile-audit` so it runs when explicitly invoked.

**Phase 4 status:** done. Test count 62 vitest + 12 playwright = 74 green. PM2 restarted at 14:02:xx, clean boot.

### Ad-hoc fixes during Phase 4 → 5 transition

**Projects mobile filter bar (D91)** — commit `2560417`
- `.filter-bar` at 1024px gained `align-items: stretch` so multi-select chips, subview toggle, and Incomplete button fill rows instead of collapsing centered. Quick-add bar got a `.quick-add-bar` class so it can stack on mobile.

**Calendar team filter render loop (D91)** — same commit
- One-line fix: `visibleKey` now includes the team filter suffix so the cache check converges. Was previously crashing the tab when picking a team.

**People → Calendar sub-view + firm_closed (D92)** — commit `24d168e`
- New `firm_closed` event type, admin-only at server level, 4 vitest regression tests
- New People-tab Calendar sub-view with roster + month grid layouts
- Inline click-to-create via existing modal, prefilled with date and target user
- New `_cachedUsers` global for ID lookups

### Phase 5: Older actionable polish

**O1 — Dashboard standup collapse-by-default**: ALREADY SHIPPED in a prior session ("Phase 12.2 / 12.4"). Verified via comment at `nbi_project_dashboard.html:3988` and the existing `sessionStorage.getItem('nbi_standup_expanded') === '1'` default-collapse logic. No work needed.

**O3 — Warnings sidebar light theme QA** — commit `a547788`
- The `.warn-item:hover` background was `--bg-hover` (#e8e8ec), only ~5% darker than `--bg-card` (#ffffff) in light theme — making the hover state nearly invisible. Bumped to a 6% accent tint with an accent-tinted border so hover is unambiguous.
- `.warn-item__sev--medium` was using bg-surface fallback. Now uses a real amber palette (#fef3c7 + #92400e) for a clearer "medium severity" feel.
- `.warn-item__sev--low` gets its own grey palette (#f3f4f6 + #4b5563).
- New `tests/e2e/warnings-light-theme.spec.js` captures dark/light/hover screenshots in `2026-04-15-warnings-light-theme/`. Tagged `@mobile-audit`.

**O4 — Skeleton screens for async-loaded views** — same commit
- `renderHiringView`: replaced "Loading hiring data..." text with `.skeleton skeleton-card` + 5x `.skeleton-row` (matches Leads/Expenses pattern).
- `renderBugTrackerView`: added skeleton placeholder for the `_bugReportsData === null` path so users navigating before the post-login Promise.all resolves see loading state instead of a misleading "No reports found".
- `renderReport`: skeleton when tasks is empty and `window._initialLoadComplete` is false.
- `renderManageClients`: skeleton instead of "Loading clients..." text.

**O7 — Won lead complete marker on table + card-list views** — same commit
- Kanban view already had `.lead-card--complete` (opacity 0.6 + green checkmark `::after`) from a prior session.
- Table view: rows with `completed_at` set get `.leads-table__row--complete` which mutes text colour and strikes through the title cell via a linear-gradient background. Title also gets a leading `✓`.
- Card-list view (mobile): completed leads get a green "✓ Won" badge in the top bar plus the `.lead-card--complete` opacity treatment.

**Phase 5 status:** done. Test count 66 vitest + 14 playwright = 80 green. PM2 restarted, clean boot.

Next: Phase 6 (brainstorming-required items: G5 client-scoped users, L1-L4, plus O2/O5/O6/O8/Z3/Z6) — Glen picks the order. These each need a dedicated brainstorming session before implementation.

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

## 2026-04-15 (Session g cont. -- test infrastructure project)

182. **Sortable Reports columns (commit dd87753)** -- Progress by Project table on the Reports view: all 9 column headers now clickable to sort, mirrors the Project Portfolio table pattern. Independent _rptProgressSort state.
183. **Brainstorming + spec for Kanban drag-to-reorder** -- Glen approved design covering all four Kanban boards. New `position` integer column per table scoped by status/stage. Existing priority enum is the "client need" classification, drag-order is the work queue. New cards land at top. Cross-column drops at exact position. Spec at projects/nbi_dashboard/specs/2026-04-15-kanban-drag-reorder-design.md (commit 47a9a04). D79.
184. **Brainstorming + spec + plan for test infrastructure** -- Glen pushed back on deferred frontend tests, approved Vitest+supertest server unit + Playwright+chromium E2E. Built in the test-infra-setup worktree. Spec at projects/nbi_dashboard/specs/2026-04-15-test-infrastructure-design.md, plan at projects/nbi_dashboard/plans/2026-04-15-test-infrastructure-plan.md. D80.
185. **Test infrastructure built and green** -- 16 vitest unit tests across 5 files (smoke, helpers sanity, retroactive escape round-trip, retroactive auth flow, retroactive migration runner idempotency) + 7 Playwright E2E tests across 4 files (smoke, auth login flow, tasks visibility, bug API + comment API). All pass on a fresh clone. Total runtime ~19.5s (vitest 7.2s, playwright 9.3s). Far under the 30s + 5min targets.
186. **Test infrastructure components** -- vitest.config.js (single fork, ESM .mjs files), tests/setup/{create-test-db,reset-db,global-setup,global-teardown,load-env}.js, tests/helpers/{db,auth,fixtures}.js, tests/fixtures/baseline-schema.sql (pg_dump of dev DB schema + schema_migrations data), tests/e2e/playwright.config.js with chromium-only single-worker setup, tests/README.md (227 lines documenting both runners), .env.test gitignored, package.json scripts test / test:watch / test:e2e / test:all / postinstall, server.js exports app via module.exports + listener wrapped in require.main guard.
187. **Test infrastructure gotchas captured** -- (a) Vitest 2.x requires ESM, so test files are .mjs while server.js stays CJS. (b) Migration runner can't reproduce schema from scratch because migrations 003+ assume tables created by standalone scripts not in the runner's path; baseline schema dump is the workaround. (c) Pool is module-cached so test files must NOT call end() — vitest fork termination cleans up. (d) Don't waitForLoadState('networkidle') — dashboard polls so it never goes idle. (e) Bug tracker DOM rendering after sidebar click was flaky; replaced with API-level coverage that's more reliable (Kanban project will exercise DOM with proper waits). (f) express-rate-limit ERR_ERL_KEY_GEN_IPV6 deprecation warning at server.js:324 is pre-existing, non-fatal, flagged for follow-up.
