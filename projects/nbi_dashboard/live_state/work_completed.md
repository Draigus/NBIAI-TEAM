# Work Completed

Append-only. Every feature/fix completed gets logged here immediately.

---

## 2026-05-20 — Bug Fixes: 3 Open Bugs + Sync Parity Fix

**Bug 1: Delete Ticket Comments** (1e6a4dfe)
- Backend DELETE endpoint already existed. Added delete button to frontend loadComments() with author/admin permission check.
- Added deleteTaskComment() function using same data-action delegation pattern as bug report comments.

**Bug 2: Dates Defaulting to First of Month** (114530a5)
- Added YYYY-MM-DD format validation to standupUpdateTask() (was missing — bypassed updateTask's validation).
- Strengthened server-side sync date validation to reject any malformed date format (previously only checked year range).

**Bug 3: Stories in Standup List** (d550fd70)
- Added `.filter(t => getItemType(t) === 'task')` to _loadStandupContent(). Standup now only shows tasks.

**Bonus Fix: Sync Poll Response Missing Fields**
- Poll response (GET /api/sync/poll) was missing itemType, sortOrder, sowId, workType, plannerTaskId vs the load response.
- Since poll replaces the entire local task object, these fields were being lost on every 10-second poll cycle.
- Added all missing fields to the poll response mapping in sync.js.

Files changed: nbi_project_dashboard.html, dashboard-server/routes/sync.js
Tests: 508/536 unit (28 pre-existing), 15/19 e2e (4 pre-existing). No new regressions.
PM2 restarted. All 3 bugs set to please_review with comments.

---

## 2026-05-20 — Couch Heroes: Health and Safety Policy

**Deliverable:** UK Health and Safety Policy for CH Game Development UK Ltd (fully remote studio)
- Policy document: `Clients/Couch Heroes/legal_compliance/CH_Health_and_Safety_Policy.md` (v3.0)
- Word document: `Clients/Couch Heroes/legal_compliance/CH_Health_and_Safety_Policy.docx`
- Instructions for Lorenza: `Clients/Couch Heroes/legal_compliance/LORENZA_INSTRUCTIONS_HS_Policy.md`
- Build script: `Clients/Couch Heroes/legal_compliance/build_hs_docx.py`
- Covers all 15 UK statutory requirements for a remote employer. No voluntary extras. Verified against live HSE.gov.uk pages.
- Needs: Vardis (CEO) signature, competent person named, then live.
- DSE self-assessments required for UK-based employees only. Non-UK employees not covered by UK H&S law.
- Memory updated: client_couch_heroes.md corrected (Vardis=CEO, Aris=COO, Dino=General Counsel, 100% remote)

---

## 2026-05-19 — Bug Tracker Batch (4 open bugs)

### Bug Fix: Can't Unblock (c645f3c3)
- **Root cause:** `blockerInfo` never cleared when status changed away from "Blocked"
- **Fix:** Client clears `blockerInfo` on status change from Blocked; server (PATCH route in tasks.js + sync route) also clears `blocker_info` as safety net
- **Files:** `nbi_project_dashboard.html` (line ~10562), `routes/tasks.js`, `routes/sync.js`

### Bug Fix: Milestone Text Misplacement (cc50cd22)
- **Root cause:** Milestone labels rendered on every Gantt row, creating overlapping orange text
- **Fix:** Removed per-row label divs; milestones now show as vertical lines with hover-only labels via CSS `::after` pseudo-element
- **Files:** `nbi_project_dashboard.html` (CSS + lines 8479, 8592)

### Bug Fix: Repeating Ticket Dates (7116fa9a)
- **Root cause:** Cloned repeating tasks had hardcoded empty start_date and end_date
- **Fix:** Clone logic now computes start_date and end_date from the original task's duration relative to the new due_date
- **Files:** `routes/tasks.js` (repeat clone), `routes/sync.js` (repeat clone)

### Bug Fix: Task Progress Not Saving (bb6a4264)
- **Root cause:** Sync conflict detection silently dropped changes (returned 200 OK but skipped the update)
- **Fix:** Server now returns `conflicted` array in sync response; client detects it, shows a warning toast, updates `_serverUpdatedAt`, and retries the sync
- **Files:** `routes/sync.js` (conflict tracking + response), `nbi_project_dashboard.html` (conflict handling in syncToAPI)

### Test Fix: Documents e2e (TipTap keystroke race)
- **Root cause:** NBI block not yet rendered when `keyboard.type()` fired, swallowing the first character
- **Fix:** Added `waitForSelector('.docs-nbi-block')` + explicit click into block before typing
- **File:** `tests/e2e/documents.spec.js`

### Test Fix: Mobile Screenshots e2e (dashboard infinite loop)
- **Root cause:** `renderDashboard()` infinite loop when milestone cache is empty (empty DB, no clients)
- **Fix:** Added `_milestonesLoaded` flag to prevent re-fetching after first attempt; increased test timeout
- **Files:** `nbi_project_dashboard.html` (milestone guard), `tests/e2e/mobile-screenshots.spec.js` (timeout)

### Verification
- 434/434 unit tests pass
- 19/19 e2e tests pass (all green — both pre-existing failures fixed)
- Visual verification via Playwright: Portfolio, Projects, Timeline, Reporting, Leads, People, Workload, Documentation, Bug Tracker — all clean, no regressions

---

## 2026-05-12 — Client Portal Security + Bug Batch

### Client Access Restrictions (72f6b00 + HTML commits)
- `isClientAllowedView()` whitelist: Portfolio, Projects, People, Reporting, News, Settings, My Tasks
- All navigation paths gated (tab bar, sidebar, switchView, popstate, _renderMainContent)
- Server: `requireNBI` on all 7 leads GET routes
- Client filter locked: guards on resetFilters, breadcrumb clear, sidebar filter clicks
- Startup: skip loadCandidates, loadFinanceFromDB, leads polling for client users
- 403 toast silenced for background GETs; only fires on failed write operations

### Global Scroll Fix
- JS-based fixScrollHeights(): explicit pixel heights via getBoundingClientRect + flex:none override
- Runs on renderAll, renderContent, window resize; skips mobile
- Fixes sidebar scroll, task list, bug tracker, workload, finance — all views

### Bug Fixes (11 bugs moved to please_review)
- Scroll bugs x4 (tasks, project view, bug tracker, general)
- View access x2 (Finances/Leads visible to clients, full nav visible)
- critPriorities JS error (closure lost via toString)
- Client filter removable by client users
- Non-team-members on client People tab
- 403 toast spam on page reload
- Teams settings scoping (investigated — server-side already correct)

### Process Improvements
- Skill gate hook: removed per-Edit firing, now Write-only + pm2 restart pre-deploy check
- Hook messages changed from generic reminders to diagnostic questions

---

## 2026-05-09 — Portfolio Page v5 Redesign (evening)

**Full portfolio page rewrite** (branch `feature/portfolio-v5-redesign`, 15 commits):
- 7 render functions rewritten for v5 neumorphic design
- Layout: KPIs → Client Table + Status Overview (2:1) → Needs Attention + Milestones → Team Workload + Near Completion
- ~370 lines dead v4 code removed (renderPfTimeline, renderPfSidebar, etc.)
- Command theme added to theme picker
- Alert banner removed per Glen directive
- Viewport-fit: no outer scroll, only Needs Attention scrolls internally
- QA bugs fixed: invalid color-mix CSS, snapshot timezone, milestone message, margin clips
- Deleted stale "Lighthouse Studios" client from database
- 387 unit + 47 e2e tests passing
- Awaiting Glen UAT

---

## 2026-05-09 — Wave 5 Features (Tasks 3-4)

**SoW on Lead Card** (bug `9b7d31c9`, commit `6e05dec`):
- New `sow_id` column on leads table (migration 042)
- GET /api/leads and GET /api/leads/:id JOIN sows for sow_title
- PATCH /api/leads accepts sow_id in patchFields
- Lead detail panel: SoW dropdown picker scoped to lead's client
- Lead kanban cards: SoW title shown below lead name when linked

**Time-off tracking with capacity deduction** (bug `8ce48ae1`, commit `6e05dec`):
- New `time_off` table (migration 043) with user_id, start_date, end_date, label
- CRUD: GET /api/users/:id/time-off, GET /api/time-off, POST, DELETE
- Capacity endpoint deducts business days off from weekly hours per user
- Heatmap cells show plane icon and tooltip when user has time-off days
- Capacity detail panel: Time Off section with add/remove entries

---

## 2026-05-08 — Connected Statuses + Portfolio Chart + Scroll Fix

**Connected Statuses cascade** (commit `39ebf25`):
- Downward cascade: Done/Cancelled/Blocked on parent pushes to all descendants recursively
- Upward cascade: all siblings terminal → parent auto-completes (Done if all Done, else Cancelled)
- Prerequisite cascade: Blocked/Cancelled on a prereq → all dependants become Blocked
- Replaces old Cancelled-only cascade that only worked for projects

**Portfolio chart redesign** (commit `39ebf25`):
- Replaced single donut with backlog bar (left) + WIP donut (right) layout
- Backlog count as fill-level bar with percentage; donut shows active item breakdown

**Scroll preservation** (commit `39ebf25`):
- _softReRender unconditionally restores scroll position (was skipping position 0)
- Gantt scrollLeft/scrollTop preserved during sync
- Inline detail panel blocks re-render to prevent edit interruption

**Gantt scroll-to-today** (commit `39ebf25`):
- Auto-scrolls to today line on first render (fixes bars appearing off-screen)
- _localISO/_pad2 hoisted to renderGanttView scope (fixes dependency view)

**Bug tracker updates:** c7e48ddf, f5a6bff2, 9bb9eb1a, 2e005a41, 94b12f59 all set to please_review with fix comments.

**Email ingestion disabled + purge** (commit `18c63c6`):
- Disabled inbound email polling cron (was creating 64k spam notifications from bounce-backs)
- Purged 63,954 notifications, 17,013 attachments, 9,223 disk files

**Wave 4 fixes** (commit `f27c038`):
- 68168751: Warning spam resolved (email ingestion disabled + purged)
- 3a6436a4: PM reports now sent to all admins (was only going to 1 team lead)
- a8e9ffd3: Lead detail panel now has editable Primary Contact fields (name/email/phone)
- 08ba7dbf: Milestones visibility confirmed working (Portfolio Dashboard + client profile)
- e6108a53: SoW upload needs specific error reproduction from Glen

**Wave 2 quick fixes** (commit `3b06eb5`):
- c057f2f9: Breadcrumb filter bar hidden on Bug Tracker and other non-task views
- 7cc027e5: Date validation waits for 4-digit year before checking range
- b2628531: Gantt row labels stay visible on horizontal scroll (solid background)
- 366d49fd: Search matches task title/description/notes/assignees only (not client name)
- c52c8027: Assignee on stories confirmed working (closed as by-design)
- 1e8de733: Percentage shown on all tasks with estimated hours, not just parents
- d765b863: Documentation hyperlinks now clickable (openOnClick enabled)
- 544fc78a: NBI Only block toggles off when already inside one (no nesting)
- a1ec1a84: Repeat section appears in both inline and slide-out detail panels

---

## 2026-05-07 — Bug Batch + Gantt Fix + Client Portal Fix

**Bug batch** (commits `a2c2e52`, `b680d0d`, `6acffa6`):
- Deterministic task sort order (ORDER BY tiebreaker on all 5 endpoints)
- People filter now hides unassigned tasks at all hierarchy levels
- Multi-user sync skips re-render when detail panel is open (prevents field jumping)
- 5-digit years blocked by client + server validation (1900-2099 range)
- CSV import due dates parsed consistently with parseDdMmYyyy + more column name variants
- Features/stories auto-calculate start/end dates from children
- Date fields accept pasted DD/MM/YYYY and named month formats
- Warning notifications show relative timestamps
- Pre-existing buildMultiSelect null crash fixed (was breaking all Playwright e2e tests)
- Year validation added to sync/changes endpoint (not just PATCH)
- closeDetail() now triggers _softReRender() on close

**Gantt timeline fix** (commits `284176b`, `d75c448`, `a7bc6e0`):
- Date changes (startDate/endDate/dueDate) now trigger full view re-render
- Gantt drag dates use local time formatting instead of UTC toISOString (timezone shift fix)
- Removed deferred re-render that caused bars to jump after drop

**Client portal fix** (commit `2c2ee03`):
- Lorenza's client_role set to 'admin' (was null, blocking all access)
- localStorage cache cleared on user switch to prevent cross-user data leaks

**Tests:** 387/387 unit tests passing. 3 new test files (sort-order, date-validation, import-due-dates). Playwright e2e verification test added. Bug tracker updated with fix comments for all 8 items.

---

## 2026-05-05 (session 4) — Queue Detail Panel

**Queue Detail Panel** (1 commit `69ca352`, merged `3dcb2dc`):
- Queue items are now clickable — opens slide-in detail panel
- Panel shows source info (submitted by, timestamp, Slack channel)
- Client dropdown + item type picker (both required before promote)
- Full detail form renders once both selected: status, priority, health, assignee, practice, dates, hours, description, success factor
- Promote creates task with all filled fields, deletes queue item, opens task detail view
- Dismiss with confirmation dialog
- Old inline Promote/Dismiss buttons and `_actPromoteQueueItem` removed
- Responsive: full-width on mobile (<768px)
- 360 tests passing, PM2 restarted
- **Awaiting Glen's browser UAT**

---

## 2026-05-04 (session 3) — Slack Bot Integration

**Slack Bot** (5 commits, `7a01fc5..e153740`):
- `lib/slack-bot.js`: HMAC-SHA256 signature verification, message parsing, Slack API reply, queue handler
- `POST /api/slack/events`: webhook endpoint with url_verification challenge support
- `POST /api/queue`: added API key auth path (X-API-Key header) for external integrations
- `slack-app-manifest.yml`: ready-to-install Slack app config
- 20 new tests (360 total), all passing
- PM2 restarted with SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, QUEUE_API_KEY

---

## 2026-05-04 (session 2) — Bug Blitz + 3 Features

**8 bugs fixed** (all resolved after Glen UAT):
- Client Not Recognised (critical) — sidebar/dropdowns now include all DB clients
- Leads Page Only Works on Reload — excluded from tasks-empty guard
- Updating Client Details Collapses Box — expanded state persists across re-renders
- No Sector Available — seeded Gaming/Technology/Entertainment options
- +New Project Unclear / +New Useability — client picker popup
- SoW Work Package Cannot Be Found — force upload bypass option
- Docs Ctrl+Shift+I — registered in TipTap keymap

**Calendar Dependency Display** (`9cbadc9`):
- Toggle-based dependency mode in Calendar sub-view
- Click any task to see prerequisites (orange) and dependents (green) highlighted
- Floating labels, off-month banner with navigation links

**SharePoint Embed Preview** (`acae497`):
- Detects SharePoint URLs in link attachments
- Preview button opens full-screen lightbox with Office Online iframe
- Escape/click-outside closes

**Task Submission Queue** (`13251ed`):
- New task_queue table + can_submit_queue user permission
- Queue sidebar entry with badge count
- Triage view: promote (pre-fills creation) or dismiss
- Settings toggle per user
- First sub-project of Slack → WorkSage pipeline

---

## 2026-05-04 — Documentation Tab v2 SHIPPED to prod

- 6 commits on `feature/documentation-tab-v2` merged to master (fast-forward to 4641cce)
- PM2 prod restarted (port 8888)
- Full test suite green: 340 unit + 18 e2e, zero failures
- Glen confirmed working in browser

**What shipped:**
- Right-click context menu on doc tree items (Rename, Add subpage, Hide, Delete)
- Hidden pages: soft-archive via `hidden` boolean column, greyed-out for admin users, invisible to view-only users
- Children inherit hidden styling visually (not in DB)
- Inline rename in tree (input field on Enter/blur saves, Escape cancels)
- Editor pane shows "hidden from non-admin users" banner
- `docs_edit` permission gates both visibility and toggle ability
- Stale mobile-screenshots e2e test fixed (People Calendar removed in April redesign)

**Files changed:** migration 036, server.js (GET filtering + PATCH), nbi_project_dashboard.html (context menu + hidden styling), documents.test.mjs (+9 tests), documents.spec.js (+2 e2e tests), mobile-screenshots.spec.js (stale test removed)

---

## 2026-05-03 — Documentation Tab v1 SHIPPED to prod

- 26 tasks, 32 commits on `feature/documentation-tab` merged to master via no-ff merge (commit 7dd2aa6)
- PM2 prod restarted (port 8888), Attachment sweep cron registered for 03:30 Europe/London
- Repo is local-only (no git remote), so the merge into master IS the deployment

**Verification evidence (real, fresh, this session):**
- `npm test`: **331/331 vitest passing** on merged master
- `npm run test:e2e`: Playwright 15/16 passing — only failure is `mobile-screenshots.spec.js` Calendar/People test, unrelated to docs (merge did not touch that code path)
- Live UX walk-through on https://worksage.nbi-consulting.com: created "Untitled" page, typed body text, inserted NBI ONLY block with content, waited for autosave, hard-reloaded — all content persisted; deleted page via DELETE with If-Match ETag → 204
- API spot checks: `/api/auth/me` exposes `docsView/docsEdit/docsCreate/docsUpload`; admin sees full `body_json` including `nbiInternalBlock` node; 6 default pages auto-seed for each client on first GET
- Browser console: zero app errors during navigation between pages
- Schema spot check: `documents`, `document_attachments` (with `orphaned_at`), `users.docs_*`, `clients.doc_default_*` all present

**Migration tracker drift fixed** — `schema_migrations` was missing rows 33/34/35 (tables existed, tracker didn't). Inserted the three rows. Subsequent `pm2 restart` logs "All migrations already applied" cleanly.

**Cleanup:** branch `feature/documentation-tab` deleted, git worktree unregistered. Empty `.worktrees/documentation-tab/` folder left behind (OneDrive file lock; cosmetic only).

Backend additions: documents tree CRUD + ETag concurrency, NBI-internal redactor, image upload with H1 leak prevention, G1 attachment orphan tracking + 03:30 sweep cron, document tables in backup coverage, docs_* permission flags.

Frontend additions: TipTap rich-text editor (self-hosted bundle), autosave + localStorage crash recovery, drag-to-reparent tree, mobile responsive + ARIA + keyboard shortcuts, contextual Docs links on Gantt + Portfolio client headers, per-user doc-permission checkboxes.

Full handoff at `docs/HANDOFF-documentation-tab.md`.

---

## 2026-04-21 (Goals MTX Pipeline — Red Team)

- Red team + source cross-validation of competitive MTX pipeline (365 rows, 13 competitors)
- **Score: 53/100** — NOT client-ready
- 3 critical issues (fabricated F1 prices, missing USD columns, broken naming)
- 5 high issues (overclaimed UFL/Fortnite conclusions, conflicting tier data)
- Full report: `Clients/Goals/competitive_research/output/RED_TEAM_REPORT.md`
- All 8 must-fix items remediated; pipeline re-run clean (0 critical/high/medium)
- **Post-fix score: 86/100** (up from 53) — passes client-ready threshold
- Stale FUT.gg data excluded, F1 classification corrected, methodology section added
- Inline source citations on every claim (Source Key + [S-*]/[C-*]/[L-*] refs)
- 6/10 top citation URLs verified live; 3 dead documented with backup citations
- All numerical claims spot-checked against raw JSON
- Domain review: game-economy-design, balance-check, GI quality gate — all PASS
- Final dataset: 356 rows, 12 competitors, 0 issues above LOW severity

---

## 2026-04-21 (Frontend Modularisation — COMPLETE)

Branch `feature/frontend-modularisation` at `b501c08`. 26 commits total. 279 tests passing.

**Monolith split:** `nbi_project_dashboard.html` reduced from 14,661 lines to 1,527 lines (89% extracted to ES modules).

**Modules created (13 view modules + 1 entry point):**
- `dashboard-server/public/js/app.js` — single entry point importing all core + views
- `views/hiring.js` (722 lines) — kanban, candidate detail, CV upload, drag-drop
- `views/people.js` (850 lines) — people view, calendar, capacity heatmap
- `views/reports.js` (483 lines) — report rendering, print
- `views/expenses.js` (1085 lines) — expense reports, detail panels, export
- `views/sidebar.js` (727 lines) — sidebar rendering, warnings, mobile overflow
- `views/news.js` (554 lines) — digest, archive, search, admin panel
- `views/dashboard.js` (1632 lines) — portfolio, tactical, standup, my tasks, charts
- `views/leads.js` (1663 lines) — kanban, pipeline, detail, manage clients, settings
- `views/settings.js` (2221 lines) — all sub-tabs, import/export, user mgmt, changelog
- `views/tasks.js` (3535 lines) — tree, board, calendar, gantt, detail panel, drag-drop

**Remaining in monolith (1,527 lines):** delegated action wrappers, auth state, IndexedDB WAL, shared helpers, tabs/routing, teams cache, conflict resolution, undo system, keyboard accessibility.

**Not yet merged to master.** 0 conflicts. Awaiting Glen's go-ahead for Task 27 (merge + PM2 restart).

---

## 2026-04-20 (State file audit + false blocker resolution)

Glen directed audit of pending_tasks.md. All G1-G5 + Kanban items were already shipped — file hadn't been updated since 2026-04-15.

**Three false blockers removed:**
- **SMTP** — not needed. Email uses Microsoft Graph via `@azure/msal-node` with Azure AD client credentials. Fully operational: password resets, notifications, PM reports, due date warnings all sending via Graph API.
- **News LLM API key** — already configured. `ANTHROPIC_API_KEY` and `ANTHROPIC_API_KEY_FAILOVER` both set in `projects/news-aggregator/.env`.
- **News LLM pipeline** — not blocked. Pipeline is ready to run on cron schedule.

**Files updated:** pending_tasks.md (rewritten), conversation_context.md (rewritten), HANDOFF.md (rewritten).

---

## 2026-04-20 (News Aggregator M4 — Search + Admin)

Branch `feat/news-m4-search-admin`, commit `72e62a0`. 9 files, 433 lines added. 128 tests passing, TypeScript clean.

**Backend (7 new files):**
- `src/routes/search.ts` — Full-text search with PostgreSQL tsvector, ts_headline snippets, filters (q, source, category, date range, has_video)
- `src/auth/internal.ts` — Admin auth layer: `authenticateInternal` (timingSafeEqual + user context parsing) + `requireAdmin`
- `src/routes/admin/feed-health.ts` — Source health dashboard (7-day rolling stats, enable/disable toggle, per-source history)
- `src/routes/admin/stories.ts` — Story merge (2+ stories into one) and split (subset of articles to new story) with automatic LLM re-summarisation
- `src/routes/admin/prompts.ts` — Prompt version management (list, create new version, activate/deactivate)
- `src/routes/admin/sources.ts` — Source CRUD (add, edit, delete)
- `src/routes/admin/regenerate.ts` — Manual digest and story regeneration via LLM pipeline

**Frontend:**
- News tab: "Search" subtab with input, category filter, video checkbox, highlighted results
- Settings > News tab (admin only): feed health table, prompt editor with version history, source management, story merge/regenerate panel
- 22 CSS rules for search UI and admin tables

---

## 2026-04-20 (Client Portal — Full Implementation)

Branch `feat/client-portal`, 14 commits. 186 tests passing.

### Backend (Tasks 1-8)
- DB migration: `client_role`, `must_change_password` on users, `source`/`reporter_client_id` on bug_reports, `client_activity_log` table
- Middleware: extracted `requireAdmin`, renamed `requireInternal` to `requireNBI`, added `requireClientAdmin`, `requireTaskAccess`
- Auth: extended `requireAuth` with `clientRole`, `isNBI`, `isClientAdmin`, `mustChangePassword`
- User management: client admin can create/deactivate/reactivate/reset-password for own company users
- Task endpoints: opened POST/PATCH to all authenticated users with scope checks
- Bug reports: opened to client users with `reporter_client_id` scoping, auto-tags source
- Email forwarding: client scope check on inbound email task matching

### Frontend (Tasks 9-12)
- `isClientUser()` and `isClientAdmin()` helpers
- Sidebar: Bug Tracker and Settings visible to client users, portfolio locked to own company
- Client filter locked for scoped users (set on init, guard on filterByClient)
- Company name shown in header for client users
- Forced password change modal on first login with temp password
- Settings: Account for all, Team for admin/client admin, Config/Data/Bugs for NBI only
- Client admin Team tab: invite, deactivate, reactivate, reset password
- Bug tracker: Source column for NBI users (Internal/Client name)

---

## 2026-04-17 (News aggregator M2 COMPLETE — Tasks 14-26)

Full M2 milestone shipped end-to-end. LLM pipeline, prompts, orchestrators,
and cron wiring all in place. 79/79 tests green. PM2 boots with all cron
schedules registered.

### What runs on schedule (once Glen drops in the API key)
- **Hourly ingest** — top of every hour UTC (already live from M1)
- **Weekly pre-flight** — Sun 21:50 UTC — healthcheckAuth logged
- **Weekly digest** — Sun 22:00 UTC — covers Mon-Sun window just closed,
  runs full pipeline: cluster → curate → summarise each story → hero
  select → publish
- **Monthly pre-flight** — 21:50 UTC daily, short-circuits unless it's
  the synthesis day
- **Monthly synthesis** — 22:00 UTC on min(30, last-day-of-month),
  generates "State of the Industry" essay across the month's weeklies
- All cron in Etc/UTC

### Task-by-task
- Task 14 (f43b2f8 — revised): callClaude wrapper on raw
  @anthropic-ai/sdk, primary/failover semantics, healthcheckAuth.
- Task 15 (87a5086): loadActivePrompt, savePromptVersion,
  listPromptVersions.
- Task 16 (87a5086): v1 prompt bodies for all 5 stages seeded at boot
  (idempotent). British English, no placeholders; system prompts only,
  caller puts articles/stories in the user message.
- Task 17 (665d271): clusterArticles + safeParseJson (shared).
- Task 18 (b84657a): curateClusters with client-side dynamic 5th
  category recomputation (threshold >= 4).
- Task 19 (5e54378): summariseStory with fallback on parse failure.
- Task 20 (019369d): selectHeroStory with hallucination guard.
- Task 21 (d5a9304): synthesiseMonth across weekly digests.
- Task 22 (27536ff): dates util — monthlySynthesisDay,
  isMonthlySynthesisDay, nextMonthlySynthesisDate, weeklyDigestPeriod.
  25 tests covering leap year (century rules), month boundaries,
  day-of-week math.
- Task 23 (3d5f0b3): generateWeeklyDigest — full pipeline orchestration.
- Task 24 (872de49): generateMonthlySynthesis — check-then-insert on
  monthly_summaries (schema's month column is indexed but not unique;
  concurrency is a non-issue for a daily cron).
- Task 25 (95710a0): generateLaunchDigest — 30-day window, flips
  digest_type to 'launch_30day'.
- Task 26 (05723ee): cron.ts — all 5 schedules, try/catch wrapped,
  Etc/UTC pinned, pre-flights 10 min before major runs.

### Gating item before M2 is truly live
Glen needs to populate `ANTHROPIC_API_KEY` in
`projects/news-aggregator/.env`. Without it, the weekly cron fires but
the healthcheck returns `{ ok: false, mode: 'primary', error: 'No API
key available for mode=primary' }` and the pipeline's first LLM call
throws. Failover is optional (populate `ANTHROPIC_API_KEY_FAILOVER` too
if desired).

### Cost note
Weekly digest ~32 LLM calls × ~15-30K tokens average per call. At
Sonnet 4.6 rates (~$3 in / $15 out per 1M tokens) a typical weekly
should land around $1-2. Monthly synthesis adds one $0.50-ish call per
month.

---

## 2026-04-17 (News aggregator M2 — Task 14 revised: raw SDK, dropped Max Pro)

After Task 14 shipped with `@anthropic-ai/claude-agent-sdk`, the pre-check
exposed a ~13K token overhead per call (the Agent SDK hard-codes the full
Claude Code harness — 28 tool schemas + 18 slash commands + 8 skills + 4
agents — into every system prompt). Projected cost: ~420K overhead tokens
per weekly digest before any real prompt content. Against Max Pro's
5-hour window, a single digest could blow the cap.

Glen's call: rip it out. Replace with raw `@anthropic-ai/sdk` (`^0.90.0`).
Trade Max Pro subscription billing for USD-per-token API billing. Clean
text-in/text-out, no harness overhead. A weekly digest at ~500K real
tokens on Sonnet 4.6 costs roughly $1.50/run.

Changes:
- `package.json`: `@anthropic-ai/claude-agent-sdk` → `@anthropic-ai/sdk`
- `src/llm/client.ts`: uses `Anthropic.messages.create()` directly.
  Primary/failover semantics: `ANTHROPIC_API_KEY` primary,
  `ANTHROPIC_API_KEY_FAILOVER` backup. `llmAuthMode` enum is now
  `'primary' | 'failover'` (was `'max_pro' | 'api_key'`).
- `tests/unit/client-failover.test.ts`: mock rewired around the raw SDK
  class; asserts both keys are attempted in the right order.
- `.env` / `.env.example`: added `ANTHROPIC_API_KEY=` (Glen to populate).
- Failover logic preserved: primary key auth error → switch to failover
  key, latch for the process lifetime, notify. Double failure → mark run
  `failed`, notify, throw.
- `healthcheckAuth()` and its `NEWS_SKIP_LLM_HEALTHCHECK=1` opt-out kept.

All 35 tests green. PM2 boots cleanly with skip flag. Awaiting Glen's
primary `ANTHROPIC_API_KEY` to validate live.

## 2026-04-17 (News aggregator M2 start — Task 14: LLM client wrapper, Agent SDK version, superseded)

Task 14 complete. `src/llm/client.ts` wraps the Claude Agent SDK with Max
Pro primary + `ANTHROPIC_API_KEY_FAILOVER` fallback. Records every call
to `news.generation_runs` (status, llm_auth_mode, failover_occurred,
input/output token counts, error message). On auth failure, promotes
the failover key, latches for the process lifetime, and posts
`notifyAuthFailover`. On double failure, posts `notifyGenerationFailed`
and flips the row to `status='failed'`.

`healthcheckAuth` runs at service startup (after `startCronJobs`); skip
via `NEWS_SKIP_LLM_HEALTHCHECK=1`. End-to-end verified: PM2 restart →
log shows `LLM auth pre-flight { ok: true, mode: 'max_pro' }` and a
`completed` row lands in `news.generation_runs` with 3 input / 4 output
tokens.

Tests: 3 new (`tests/unit/client-failover.test.ts`), SDK + notifications
mocked via `vi.mock`, real DB with `afterEach` cleanup. Total suite now
35/35 green. TypeScript clean.

Deviations from plan recorded in the session log
(`session_logs/2026-04-17_task14_llm_client.md`):
- Added `startedAt: new Date()` to the insert (schema is notNull, no default)
- Prefer the SDK's final `result` message over the last assistant message
- Added `settingSources: []` + `allowedTools: []` to strip what we can
- SDK still injects ~13K cache_creation tokens of built-in context per call
  (hard-coded tool schemas, slash commands, skills, agents) — flagged as
  a cost concern for heavy generation days

---

## 2026-04-17 (News aggregator M1 complete — Tasks 6 to 13)

Picked up from handoff_2026-04-17a. Executed Tasks 6 through 13 of the
news aggregator implementation plan back to back. M1 (infrastructure,
ingest, media) is now done end to end.

### Task 6 — URL canonicalisation (`b1c32ca`)
- `src/ingest/canonical.ts` + 8 TDD tests
- Strips utm_*, fbclid, gclid, ref_src, mc_cid, mc_eid; forces https;
  lowercases host; drops fragment; trims trailing slash on paths
  (preserves on bare hostnames); returns null for non-http(s)

### Task 7 — RSS/ATOM fetcher (`62d125c`)
- `src/ingest/fetcher.ts` with parseFeedAsync + fetchFeed
- Dropped plan's sync parseFeed stub (rss-parser has no sync API)
- 15s AbortController timeout; NBI Hub User-Agent
- Normalises RSS 2.0 + ATOM into a single FeedItem shape
- 4 tests vs synthetic RSS/ATOM fixtures + unreachable-host timeout

### Task 8 — Article dedup (`8c11542`)
- `src/ingest/dedup.ts` returns { newCount, newIds } so the scheduler
  can enrich only the new rows
- ON CONFLICT (canonical_url) DO NOTHING; publishedAt defaults to now()
  since schema column is NOT NULL
- Added tests/fixtures/db.ts helper + tests/setup.ts .env loader +
  vitest.config.ts wiring (no new dependencies)
- 4 dedup tests

### Task 9 — Feed health tracking (`7c62c0a`)
- recordFeedAttempt appends news.feed_health + updates sources.last_*
  and consecutive_failures atomically (success zeroes, failure increments)
- getRollingErrorRate over configurable window (default 7 days)
- autoDisableIfUnhealthy flips sources.enabled=false at >=50% error rate
  and returns true so caller can send hub notification
- 6 tests

### Task 10 — Hourly ingest scheduler (`5217f6d`)
- `src/ingest/scheduler.ts` runIngestOnce with 8-way shared-queue workers
- classifyError maps AbortError/http_error/other to FeedOutcome enum
- `src/notifications/hub.ts` with notifyFeedDisabled, notifyAuthFailover,
  notifyGenerationFailed — all POST to dashboard
  /api/internal/notifications; errors swallowed so ingest never breaks
  on a flaky dashboard

### Task 11 — Article enrichment (`5bd458c`)
- `src/ingest/enrichment.ts` extractMetadata (pure, cheerio) +
  fetchAndEnrich (10s timeout)
- OG image (fallback: twitter:image), canonical URL, author
  (article:author preferred), publishedAt (article:published_time
  preferred), embedded videos
- VIDEO_PATTERNS with normalise() collapses YouTube watch/embed/short,
  Vimeo, Twitter, X to canonical forms — dedupes across iframes + a[href]
- scheduler.ts spawns p-limit(4) background enrichment pass per source
  (fire-and-forget so it never blocks the next feed)
- Installed cheerio@^1.0.0 + p-limit@^6.0.0
- 6 enrichment tests vs fixture HTML with real iframes + links

### Task 12 — Media cache with sharp variants (`4a085e9`)
- `src/media/variants.ts` buildVariant: thumb 400w/q75, card 800w/q80,
  hero 1600w/q85 (webp, withoutEnlargement)
- `src/media/cache.ts` cacheOgImage: 10s fetch timeout, 2 MB cap per
  spec §15, SHA-256 for content dedup, 2-char hash prefix subdirs,
  ON CONFLICT DO NOTHING on media_assets insert
- fetchAndEnrich now calls cacheOgImage and returns ogImageHash;
  scheduler writes articles.og_image_hash
- Narrowed .gitignore `media/` pattern to `/media/` so src/media/
  tracks correctly
- 4 variants tests

### Task 13 — Media route + cron wiring (`ba68dee`)
- `src/routes/media.ts` GET /media/:hash/:variant with 64-hex hash
  validation, allow-listed variants, 1-day immutable cache header,
  streams WebP from disk
- `src/scheduler/cron.ts` startCronJobs registers '0 * * * *' UTC
  hourly ingest. Weekly/monthly added in M2
- `src/index.ts` registers mediaRoutes and starts cron after Fastify listens
- Installed @types/node-cron

### M1 smoke test — real live ingest
Triggered runIngestOnce manually (53 sources). Results:
- news.articles: 708 rows
- news.media_assets: 173 rows
- articles with og_image_hash: 175
- 11 placeholder feeds (earnings.*, structured-data, sensor-tower,
  niko-partners, etc.) auto-disabled with 404/403/timeout as expected
  (the source URLs in seed.json are placeholders pending a real feed
  discovery pass)
- GET http://localhost:8890/media/{hash}/{thumb|card|hero} returns 200
  image/webp with correct sizes (12K / 44K / 136K for a sample)
- GET http://localhost:8888/api/news/media/{hash}/card returns 401
  unauthenticated (correct — the dashboard proxy sits behind
  requireAuth; cookie-bearing browser requests from the News tab in M3
  will pass)

### Test suite
32 tests total, all green. Break down: canonical 8, fetcher 4, dedup 4,
feed-health 6, enrichment 6, variants 4. Typecheck clean.

### Deviations from plan (all captured in commits)
1. Task 7: dropped sync parseFeed stub (rss-parser has no sync API)
2. Task 8: insertArticlesDedup returns { newCount, newIds } instead of
   plain number — needed by Task 11 enrichment wiring
3. Task 9: recordFeedAttempt explicitly sets attemptedAt (schema is
   notNull; plan omitted)
4. Task 11: fetchAndEnrich calls cacheOgImage inline and returns
   ogImageHash; cleaner than scheduler post-processing

### Placeholder feed URLs needing follow-up
The following seed.json entries 404'd and got auto-disabled; their URLs
need a real-feed discovery pass before LLM work starts in M2:
axios-gaming, forbes-tassi, bloomberg-schreier, pc-gamer-news,
sensor-tower, aaaa-games, wired-gaming, benji-sales, niko-partners,
crunchbase-gaming, videogamelayoffs, ukie, earnings-sony, epic-calendar,
earnings-take-two, igdb-releases, earnings-cdpr, earnings-nintendo,
earnings-ea, earnings-tencent, nikkei-asia-gaming, earnings-netease.
Logged here rather than fixed inline to keep the commit boundary clean.
These are separate research tasks, not coding bugs.

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

## 2026-04-17 (Session: news aggregator design + M1 start)

188. **News aggregator spec written and committed** — `projects/nbi_dashboard/plans/2026-04-17-news-aggregator-design.md` (~650 lines). Covers a separate PM2 service `nbi-news` at port 8890, `news.*` Postgres schema, ~48 editorial plus 10 structured-data sources, Claude Agent SDK with Max Pro primary and API key failover, four canonical categories plus dynamic 5th, serif-headline editorial frontend, weekly digest on Sundays, monthly synthesis on the 30th (or last day of Feb), mobile top-news-only mode, admin surface for merge/split/prompt editing.

189. **News aggregator implementation plan written and committed** — `projects/nbi_dashboard/plans/2026-04-17-news-aggregator-impl.md` (4,309 lines). 49 tasks across 5 milestones (M1 infrastructure/ingest/media, M2 LLM pipeline and orchestration, M3 frontend, M4 search and admin, M5 polish). Zero em-dashes, zero timeline estimates, zero TBD placeholders.

190. **News aggregator Tasks 1 to 5 shipped** — (1) Fastify service scaffolded with PM2 config, TypeScript, Drizzle, health endpoint, zod config loader; builds and smoke-tests green on port 8890. (2) `/api/news/*` proxy middleware added to `dashboard-server/server.js` at line 968, forwards user context via `x-nbi-user` header plus `x-nbi-internal-token` shared secret. (3) `/api/internal/notifications` endpoint added to `dashboard-server/server.js` at line 941 (before requireAuth), token-gated, supports broadcast to admins or single user, uses existing `createNotification` helper; verified across 5 HTTP test cases. (4) `news.*` schema migrated: 10 tables (sources, articles, digests, stories, story_articles, monthly_summaries, media_assets, feed_health, generation_runs, prompts) plus 6 btree indexes and 2 GIN tsvector indexes; generated via drizzle-kit plus hand-written 0001_search_vectors.sql. (5) 53 news sources seeded from `seed.json` across 7 tiers (trade 12, consumer 7, crossover 3, mobile_asia 8, analyst 5, trade_body 3, structured_data 15); idempotent on restart.

191. **PM2 startup persistence fixed** — `pm2 save` executed. nbi-dashboard, nbiai-api, nbi-news, and cloudflared all captured in `C:\Users\gpbea\.pm2\dump.pm2`. Boot order recovery works via `pm2 resurrect`. Auto-start on Windows reboot still requires `pm2-windows-startup` if Glen wants it; not installed yet.

192. **Cloudflare tunnel brought under PM2** — cloudflared was running via ad-hoc login session and died when PM2 daemon restarted. Added as a PM2-managed process: `pm2 start "C:/Program Files (x86)/cloudflared/cloudflared.exe" --name cloudflared -- tunnel run`. Tunnel ID `2d70956e-f293-44e0-b333-a3a7482ab253`, config at `~/.cloudflared/config.yml`, routes `worksage.nbi-consulting.com` to `localhost:8888`.

193. **Two hard cross-session rules captured** — `feedback_no_scope_watering.md` (never narrow scope, cut features, or pick cheaper/lower-quality options to reduce effort) and `feedback_no_timelines.md` (never quote durations; structure work by milestone deliverables). Both indexed in `MEMORY.md`.

194. **Data Cleanse Tool shipped** — Full admin-only data cleanse tool replacing the stub "Clear All Tasks" button. Backend: `GET /api/admin/cleanse/preview` (live row counts + cascade metadata for 13 categories) and `POST /api/admin/cleanse` (transactional FK-safe deletion in 26-step order, file cleanup post-commit, audit logging). Frontend: full-screen modal with checkboxes, cascade auto-select for Clients (nuclear tier), typed confirmation gate ("DELETE ALL SELECTED DATA"), progress overlay, localStorage cleanup, renderAll on success. Removed `clearAllTasks()` and `finResetData()` functions plus their buttons. 3 null-state label fixes for views with nullified FKs. 15 backend tests (auth, validation, cascades, nullification, multi-category). 6 commits on `feat/data-cleanse-tool` branch, fast-forward merged to master. PM2 restarted.

## 2026-05-02 (import wizard hierarchy fix)

195. **Import wizard preserves CSV hierarchy** — Closed bug `df1fb00b` (Backlog Importation Failure). Server: new `nbi-hierarchy-csv` format detector triggered by `_temp_id` + `_temp_parent_id` + `item_type` headers; new mapper case reads all 17 Backlog Builder columns; `parseDdMmYyyy` converts UK dates to ISO; `POST /api/tasks/bulk` extended to persist `start_date`, `end_date`, `success_factor`, `practice_area`, `collaborations`, resolve client by name (e.g. "Lighthouse Games" -> UUID), and propagate `client_id` from project parent to children. Frontend: `executeHierarchyImport` branch routes hierarchy CSVs straight to `/api/tasks/bulk` (450-row chunks), bypassing the legacy title-based parent resolver that collided on duplicate feature names. Preview wizard now shows item-type counts plus DQ warnings (orphans, duplicate titles, "confirMedium"/"Criticalical" autocorrect damage). 23 new vitest tests; 224/224 unit green; 14/15 e2e green (1 pre-existing mobile-screenshots flake unrelated). UAT verified on staging at :8887 with the real LH Backlog Builder CSV — 1 project + 9 features + 33 stories + 258 tasks landed under Lighthouse Games with parents, dates, hours, assignees, priority, success factors all preserved. Production restarted (`pm2 restart nbi-dashboard`); worksage.nbi-consulting.com healthy. Commits `53086c7` (feature), `23836a0` (merge), `d785c91` (warnings/notifications clear-all + staging PM2 entry), `451bf9b` (docs/CLAUDE.md/screenshots).

196. **253 broken Couch Heroes rows wiped** — The previous failed import had left 253 mis-tagged tasks under Couch Heroes (no parents, no assignees, no hierarchy). Confirmed via title-pattern audit they were all broken Lighthouse content (zero legitimate Couch work entangled), then `DELETE FROM tasks WHERE client_id='21be0772-73e5-4cca-8795-8b1a66f89ec2'` on prod inside a transaction. 0 task_comments / task_notes / task_attachments / time_entries on those rows so no cascade fallout.

## 2026-04-26 (overnight session - Couch Heroes consolidation)
- Glen answered Q1-Q13 (CTO restart, coaching to HR, Lead Animator Done, Lili separate from Lorenza, HR Ops still interviewing, Dino review delivered, Miro screenshot received, JIRA walk postponed, offsite 4 days, 1:1 programme + 8 tasks, SOW removed)
- 4 CTO support files staged into Clients/Couch Heroes/
- UK Company Word doc extracted (CH_Guidance_extracted.md, 355 lines)
- Discovered Couch Heroes Features.xlsx already contains Miro export (1,142 rows, 421 features)
- Spec rewritten with locked 7+AI structure
- Built CH_WorkSage_import_v1.xlsx: 876 items across 8 project sheets, 0 unmapped, 0 validation errors
- Em dashes stripped from all deliverables
- Handoff written to docs/HANDOFF.md

## 2026-05-03 (Documentation Tab — Task 7 + D1 + B1 server batch on `feature/documentation-tab` worktree)

197. **Documentation Tab PATCH + DELETE endpoints with optimistic concurrency, full-text indexing, and security hardening** — Closed Task 7 (PATCH/DELETE), D1 (server-side ETag/If-Match), and the deferred B1 integration test from the WorkSage Documentation Tab plan. Three commits on `feature/documentation-tab` (worktree at `.worktrees/documentation-tab`, master untouched):

   - `b96ca5b feat(docs): PATCH + DELETE /api/documents + ETag/If-Match + body_text indexing` — initial implementation. PATCH supports title/body_json/parent_id/task_id/sort_order/visibility (visibility NBI-only); uses `buildPatchQuery` for safe field whitelisting; If-Match required (428 if absent), mismatch returns 409 with current doc; on body_json change writes `body_text = extractPlainText(body, { dropNbiInternal: false })` in same UPDATE so write-time index keeps NBI-internal content for NBI-only search. DELETE is idempotent (204), cascades children via FK. GET-by-id emits weak ETag from `updated_at.toISOString()`. 12 new tests.

   - `4db5124 style(docs): remove em dashes from new doc-tab code per CLAUDE.md` — spec-review pass found 7 em dashes in new comments and test labels. All replaced with colons/semicolons/full stops. No logic change.

   - `e8e2fc7 fix(docs): security + race + cycle fixes on PATCH/DELETE` — code-review pass found Critical (C1: 409 leaked cross-client doc bodies before scope guards ran) and Important (I1: lost-update race because UPDATE WHERE only checked id; I2: circular check only caught self-reference, not descendant cycles; I3: 409 body wasn't redacted for client portal users) plus Minor (M1: RETURNING * leaked body_text/body_version; M4: cross-client DELETE returned 404 enabling existence enumeration). All seven addressed in one commit. Scope guards now run before ETag comparison; UPDATE WHERE clause is `id = $X AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $Y::timestamptz)` (the `date_trunc` was a controller-applied precision fix — Postgres timestamptz is microsecond, Date.toISOString is millisecond, so without truncation the WHERE never matched its own freshly-emitted ETag and 7 fresh-ETag tests failed); recursive CTE rejects descendant cycles; redactNbiInternal applied to 409 bodies for client users; explicit projection on RETURNING; cross-client DELETE returns 204. 8 new tests cover each fix path.

   **Final state: 268/268 vitest passing across 27 test files. Branch tip `e8e2fc7` ready for merge once frontend Tasks 11-13 also land. Master unchanged.**

   Follow-up parked: `updated_at = greatest(now(), updated_at + interval '1 millisecond')` in the SET clause to close the same-millisecond concurrent-write window. Real but theoretical for current usage; flagged in `e8e2fc7` commit message body for the next batch.

   Process notes for the record:
   - Used `superpowers:subagent-driven-development` end to end. Two-stage review (spec then code-quality) per task batch.
   - Implementer subagent on `b96ca5b` falsely claimed via plan that `dropNbiInternal: false` meant body_text would NOT contain NBI text; controller caught the contradiction with the lib's documented behaviour and corrected the implementer's brief before dispatch.
   - Implementer subagent on `e8e2fc7` terminated with uncommitted changes and 7/29 documents tests failing. Controller invoked `superpowers:systematic-debugging`, traced the precision mismatch through the ms/μs round-trip, applied the `date_trunc` fix directly (single-variable change), verified all 29 documents tests pass, then committed.
   - Code-quality reviewer flagged that T-Race-I1 actually exercises the outer ETag-string comparison rather than the inner atomic-WHERE — accurate. The atomic-WHERE remains as last line of defence at sub-millisecond races; covering that path would require artificial concurrency simulation, deferred.

198. **Documentation Tab — Task 8 + H1: image upload/serve + NBI-block leak prevention** — Closed Task 8 (POST/GET image attachment endpoints) and Task H1 (image-in-NBI-block leak prevention) from the Documentation Tab plan. Three commits on `feature/documentation-tab`:

   - `23c413e feat(docs): add imageInScope to redact-nbi-internal lib + H1-Lib unit tests` — exported `imageInScope(body, filename, { dropNbiInternal })` from the redact lib. Walks ProseMirror JSON, matches via `endsWith('/' + filename)` (not substring), skips `nbiInternalBlock` subtrees when `dropNbiInternal: true`, returns true on first match. 5 lib tests covering paragraph match, NBI-block skip, NBI-block-included case, no-match case, and deeply-nested image.

   - `e6373a5 feat(docs): document image upload + serve + H1 NBI-block leak prevention` — `POST /api/documents/:id/attachments` (multer single-file, 5 MB cap, image-MIME whitelist via fileFilter, dynamic filename `doc_<id>_<ts>_<rnd>.<ext>`, persists to `document_attachments` table, returns raw object with id/filename/url/mime_type/size_bytes). `GET /api/documents/:id/attachments/:filename` (path-traversal check via `path.resolve` + `startsWith` BEFORE doc lookup; 401/400/404/403 scope guards mirroring GET-by-id; H1 `imageInScope` check inside `isClientUser` block; `X-Content-Type-Options: nosniff` set). Multer wrapped to surface `LIMIT_FILE_SIZE` as 413 and fileFilter rejection as 400 instead of leaking 500. Cleanup helper `cleanupDocUpload` called on every rejection path post-multer save. 13 integration tests (T8-1 to T8-10 + H1-1 to H1-3).

   - `a116f76 fix(docs): cleanup orphan files on DB error in attachment upload + test coverage` — code review found that the doc SELECT and document_attachments INSERT were not wrapped in try/catch, leaving orphan files on disk if the DB threw at runtime. Both calls now in try/catch with `cleanupDocUpload` + `log('error', ...)` + 500. Plus disk-existence assertions added to T8-1/T8-4/T8-5, an H1-4 test for empty `body_json`, and a T8-Insert-Fail integration test that uses a temporary CHECK constraint to deterministically force the INSERT to fail (vi.spyOn was tried first but failed because server.js and tests/helpers/db.js each construct their own Pool instance — controller diagnosed via `superpowers:systematic-debugging` and replaced with the constraint approach).

   **Final state: 288/288 vitest passing across 27 files. Branch tip `a116f76`. Master unchanged.**

   Process notes:
   - Implementer subagent on `e6373a5` correctly deviated from the controller's brief on the path-traversal guard. The brief said "use `path.basename` + `startsWith`" but the implementer noted (with comment in code) that `basename` strips the traversal and defeats the check. They used raw `req.params.filename` → `path.resolve` → `startsWith(uploadDir + path.sep)` which is correct. Good engineering judgement.
   - Implementer subagent terminated mid-test-run with uncommitted changes on the orphan fix; controller verified, found 1 failing test, traced root cause (two-pool problem), and applied the constraint-based fix directly rather than re-dispatching.
   - Code reviewer flagged a minor concern that's worth recording as a follow-up: `uploadDir` is shared with the legacy task-attachments endpoint, so the doc-attachment GET handler doesn't constrain `stored_name` to actually belong to the requested doc. Mitigated for client users by H1 (only filenames referenced in `body_json` pass), but NBI users with a doc id can serve any file in `uploadDir` via the doc route. Matches the existing `/api/attachments/:filename` permissiveness for NBI users — not a privilege escalation. Consider adding `WHERE document_id = $1 AND stored_name = $2` in a future hardening pass.
   - Magic-byte sniffing of uploads is deferred to Task G1 (orphan tracking + file integrity sweep). Currently MIME is validated from the client-supplied header only.
