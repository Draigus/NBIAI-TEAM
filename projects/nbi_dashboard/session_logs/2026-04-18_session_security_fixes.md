# Session Log: 2026-04-18 — Security Fixes Sprint (Execution)

## Starting State
- Loaded handoff: `docs/HANDOFF.md`
- Loaded plan: `docs/superpowers/plans/2026-04-18-worksage-security-fixes.md`
- HEAD: `17d6153` (master)
- No code changes from previous session — plan ready for cold execution
- Glen approved Tasks 1-6 (B-B3/B-B4, B-N9, B-B13, B-B19, B-C2, F-B20), then F-C2 separately

## Log

### Entry 1: Session start
- Read full handoff and implementation plan
- Verified all line numbers match plan exactly
- Executing Tasks 1-6 with TDD, then Task 7 verification

### Entry 2: All 6 security fixes implemented and tested
- **Task 1 (B-B3/B-B4):** Added `AND u.is_active = true` to auth/me and requireAuth queries. Added session deletion + cache clear on password change. 3 new tests, all pass.
- **Task 2 (B-N9):** getClientScopes now returns ALWAYS_VISIBLE_CLIENTS (or sentinel UUID) for teamless users instead of null/unrestricted. 1 new test, passes.
- **Task 3 (B-B13):** Scoped 5 endpoints: GET /api/settings (allow-list for external users), GET /api/dashboard/summary (byClient filtered), GET /api/leads/reminders, /pipeline/summary, /pipeline/forecast (all filtered by getClientScopes). 3 new tests, all pass.
- **Task 4 (B-B19):** Removed `helloworld` demo key. OCR_API_KEY must be set explicitly; without it falls back to local Tesseract only. No PII leaves the server.
- **Task 5 (B-C2):** Added per-table validation to /api/restore: UUID format, required fields, status enum, settings key format. All checked before BEGIN transaction. 6 new tests, all pass. Fixed duplicate UUID_RE const declaration.
- **Task 6 (F-B20):** Converted getRootAncestor from recursion to iterative with visited Set. Added visited Set param to getDescendants. Both now break on circular parentId.
- **Task 7:** Full test suite: 120 tests across 19 files, all green. PM2 restarted. Site returns 200 on / and /api/health.

### Files changed
- `dashboard-server/server.js` — all server fixes
- `dashboard-server/tests/unit/auth.test.mjs` — 3 new tests
- `dashboard-server/tests/unit/client-scope.test.mjs` — 4 new tests
- `dashboard-server/tests/unit/restore-validation.test.mjs` — new file, 6 tests
- `nbi_project_dashboard.html` — cycle guard fixes

### Entry 3: Config changes
- Removed `DISABLE_AUTO_COMPACT=1` — auto-compact now enabled for future sessions
- Updated CLAUDE.md session continuity section to work with compaction
- Added PostToolUse hooks on Edit/Write to enforce session log updates after every code change
- Glen's decision: trust real-time disk logging as compaction safety net

### Entry 4: Starting F-C2 (HttpOnly cookie migration)
- Glen approved carrying on in this session
- Researched full auth flow: 8 localStorage refs, 1 XHR with _authToken, init checks _authToken
- Added 4 failing tests to auth.test.mjs for cookie auth: login sets HttpOnly cookie, auth/me works with cookie only, requireAuth works with cookie only, logout clears cookie
- Tests confirmed failing (4 fail, 8 pass)
- Added cookie helpers to server.js after line 148: SESSION_COOKIE_NAME, getSessionCookieOpts(req), getCookieToken(req). No dependency on cookie-parser — manual regex parse.
- Login handler: added `res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOpts(req))` before `res.json()`
- auth/me: reads token from cookie first via `getCookieToken(req)`, falls back to Authorization header
- requireAuth: reads token from cookie first via `getCookieToken(req)`, falls back to Authorization header (line ~797)
- Logout: reads token from cookie first, clears cookie with `res.clearCookie()` (line ~759)
- Change-password: added `res.clearCookie()` after session deletion (line ~1073)
- All 5 server-side cookie changes done. All 12 auth tests pass (8 original + 4 new cookie tests).
- Starting frontend changes. Line 2346: removed localStorage.getItem from _authToken init — now starts as null.
- authFetch: replaced Authorization header + localStorage.removeItem with `credentials: 'include'` (line ~2468)
- Login handler: removed `_authToken = data.token` and `localStorage.setItem` (line ~2533)
- Logout: removed `_authToken = null` and `localStorage.removeItem` (line ~2576)
- 4 file uploads: all switched from explicit token/Authorization to `credentials: 'include'` (task attachments ~7724, receipt ~10841, expense receipt ~10879, SOW ~12739)
- XHR upload: replaced `xhr.setRequestHeader('Authorization', ...)` with `xhr.withCredentials = true` (line ~16124)
- Init function: removed `if (_authToken)` guard, now always calls `fetch('/api/auth/me', { credentials: 'include' })` to check session cookie (line ~17813)
- All frontend localStorage references removed. Verified: 0 localStorage refs, 0 _authToken usage.
- Removed unused `let _authToken = null;` declaration entirely.
- F-C2 frontend changes complete. Running full test suite now.

## Portfolio Dashboard Redesign (evening session)

### Changes made to nbi_project_dashboard.html:
1. **New portfolio CSS** (~50 lines): `.portfolio-strip`, `.portfolio-card`, `.portfolio-project` classes for executive view
2. **New `renderPortfolioDashboard()` function**: Replaces old tactical dashboard as landing page
3. **Commented out** `renderTacticalDashboard()` call in `renderDashboard()` — old code intact for revert
4. **Sidebar routing fixed**: "Dashboard" now points to portfolio view (was pointing to report view). Old "Report" view removed from sidebar and tabs but code kept.
5. **`LEGACY_ROUTES`**: Added `report: 'dashboard'` so old `#report` URLs redirect to portfolio view
6. **Metrics strip enhanced (in progress)**: Replaced "Needs Attention" + "Complete %" with Overdue, Blocked, At Risk, Hours Spent, Hours Est — per Glen's feedback
7. **Still in progress**: Adding "Nearly Complete" and "Upcoming Milestones" sections, and enhanced expanded card body with "Needs Attention" drill-down showing WHY items are red/blocked

### Glen's feedback incorporated:
- One card per client is correct design
- Show all active projects per client (not top 3)
- Top metrics should show actionable numbers: overdue, blocked, at risk, hours — not aggregate % complete
- Red dots without context are useless — need drill-down to see what's wrong
- Expanded cards should show attention items with reasons + project completion breakdown
- Comment out old code, don't delete — revert safety net

### Portfolio dashboard v2 — enhanced function body
Replaced client cards section and added milestones. Changes:
- **Metrics strip**: Now 6 items: Active Projects, Overdue, Blocked, At Risk, Hours Spent, Hours Est.
- **Nearly Complete section**: Projects 60-99% done, sorted by %, shows client + title + progress bar
- **Upcoming Milestones section**: Root tasks with due dates in next 14 days, colour-coded urgency
- **Client card header**: Now shows separate overdue/blocked/at risk counts (was just overdue + blocked)
- **Client card expanded body — hours**: Shows hrs spent, hrs est, burn % per client
- **Client card expanded body — Needs Attention**: Red-highlighted panel listing every blocked/at-risk/overdue task with: reason badge (BLOCKED, AT RISK, Xd overdue), parent project name, task title, assignee. Each row clickable to open detail overlay.
- **Project list**: Now shows done/total count alongside % (e.g. "12/20 60%")

### Entry 2: Resumed after previous session locked up (new chat)
- Loaded HANDOFF.md and plan. Discovered uncommitted work from the crashed session:
  - F-C2 server+tests (complete, 124/124 tests passing)
  - F-C2 frontend auth migration in nbi_project_dashboard.html
  - Portfolio dashboard feature (CSS + JS) also in the HTML — unrelated to F-C2
  - CLAUDE.md edits switching from "auto-compact disabled" to "auto-compact enabled"
- Glen switched `.claude/settings.local.json` model to `opus[1m]` for 1M context (takes effect next session)
- Glen: "commit the FC2"
- Plan: separate F-C2 from portfolio in HTML
  1. Backed up working HTML (with F-C2 + portfolio) to /tmp/html_with_everything.html
  2. `git checkout HEAD -- nbi_project_dashboard.html` to reset to clean HEAD version
  3. Applied ONLY F-C2 edits to clean HTML (10 individual Edits):
     - Remove `let _authToken = localStorage.getItem(...)` global
     - Rewrite `authFetch()` to use `credentials: 'include'` (no more Bearer header)
     - Remove `_authToken =` and localStorage token reads/writes from login, logout, authFetch 401 handler
     - Add `credentials: 'include'` to login fetch call
     - Convert 4 upload fetches (task attachments, receipt OCR, expense receipt, SOW upload) to `credentials: 'include'`
     - Convert XHR at uploadEntityFile from `setRequestHeader('Authorization'...)` to `xhr.withCredentials = true`
     - Rewrite `init()` to check cookie via `/api/auth/me` with `credentials: 'include'` (no more localStorage-gated check)
- Server.js + auth.test.mjs F-C2 changes were already complete from the crashed session, left as-is.
- Next: verify HTML syntax, stage + commit F-C2 files only, then restore /tmp/html_with_everything.html to get portfolio back in working dir for a separate commit later.

### Entry 3 (new chat): F-C2 committed + handoff written
- Applied 10 F-C2 edits to clean HEAD version of nbi_project_dashboard.html
- Verified HTML JS syntax (920983 chars, parses clean); diff shrank from 360 → 85 lines (F-C2 only)
- Confirmed 0 _authToken refs and 0 nbi_auth_token localStorage refs remain
- Staged: server.js, auth.test.mjs, nbi_project_dashboard.html, this session log
- Committed F-C2 as `b4f818e`: "fix(hub): migrate auth tokens from localStorage to HttpOnly cookie (F-C2)"
- Restored /tmp/html_with_everything.html to working tree — portfolio changes back as uncommitted
- Restarted PM2 nbi-dashboard (pid 492); /api/health returned 200
- Rewrote docs/HANDOFF.md to reflect: b4f818e F-C2 commit, uncommitted portfolio/CLAUDE.md/settings, 1M context model change takes effect next session, browser verification checklist for F-C2
- End of this session's coding. Next session: browser-verify F-C2 + portfolio, then commit portfolio or iterate.

### Entry 4: Model ID corrected
- Glen wants Opus 4.6 specifically with 1M context, not the floating "opus" alias which resolves to latest (4.7).
- `.claude/settings.local.json` model: `opus[1m]` → `claude-opus-4-6[1m]`
- Pins to 4.6 explicitly with the [1m] suffix for 1M context window.
- Takes effect next session.

### Entry 5: Portfolio dashboard v2 — continued iteration

**Loaded handoff:** `handoff_2026-04-18_portfolio_dashboard_v2.md`

**Glen's corrections:**
- PlaySage goes under NBI OPS, NOT PlayGoals (previous session misheard)
- V2 dashboard "still needs a ton of work"

**Section reorder (Glen's directive):**
- Old order: KPI strip → Nearly Complete + Upcoming Milestones → Client cards
- New order: KPI strip → Client cards → Nearly Complete + Upcoming Milestones
- Implementation: moved the nearComplete/upcoming computation and HTML block from between the KPI strip and clientMap to after the portfolio-grid closing tag, before `return html`. No logic changed, just position in the output.

**"Unassigned" removed from portfolio + client enforcement:**
- Portfolio dashboard `clientMap` builder now skips tasks with no client (line ~4267: `if (!client) return;`)
- `addTask()` (line ~4467): requires `currentFilter.client`; shows warning toast if no client selected
- `quickAddTask()` (line ~4531): same enforcement
- `addItem()` at root level (line ~4491): falls back to `currentFilter.client`, blocks with toast if empty
- Inline detail panel client dropdown (line ~6963): removed empty `-- None --` option; blank value disabled with `-- Select Client --` placeholder; `onchange` blocks clearing to empty with toast
- Overlay detail panel client dropdown (line ~7629): same treatment as inline panel
- Glen's directive: "something can't be unassigned. It has to be assigned to something."

**Card layout fixes (Glen: "cards are too thin, formatting on Lighthouse is fucked up"):**
- `.portfolio-grid` min column width bumped from 420px to 520px — fewer cards per row, wider cards
- `.portfolio-card__header` added `flex-wrap: wrap` so stats wrap below name instead of overflowing/truncating

**Balanced flexbox grid (Glen: "4 on one row, 3 stretch to fill the next"):**
- Switched `.portfolio-grid` from CSS Grid (`auto-fill`) to flexbox (`flex-wrap: wrap`)
- Cards use `flex: 1 1 var(--portfolio-basis)` + `min-width: var(--portfolio-basis)` — last-row cards stretch to fill full width, zero dead space
- Added `bestGridColumns(count, maxCols)` function (after `clientSortOrder`): picks column count where last row is closest to full. E.g. 7 cards with max 5 → picks 4 (4+3, ratio 0.75) over 5 (5+2, ratio 0.4)
- Responsive maxCols: mobile(<600)=1, tablet(<1024)=2, desktop(<1600)=3, widescreen=4
- `--portfolio-basis` CSS variable calculated per render: `calc((100% - gaps) / cols)`
- Card header `min-height: 68px` + `padding: 18px` to match KPI strip height
- Card header stats `flex-shrink: 1; flex-wrap: wrap` so they wrap instead of truncating
- Card name `min-width: 80px` so it doesn't collapse to nothing
- Mobile breakpoint: cards forced to `100%` width, name wraps to multiple lines

**Card height doubled (Glen: "double the vertical width"):**
- `.portfolio-card__header` padding 18px → 28px, min-height 68px → 100px

**server.js syntax fix:** Removed orphaned closing brackets at server.js:4830-4846 — leftover from B-B16 PUT /api/sync/tasks removal. The `void 0;` anchor was correct but the closing `); } } } } }`, `COMMIT`, `catch`, `finally`, `});` below it were dead code from the deleted endpoint body, causing a SyntaxError on startup.

**Spacing + font polish:**
- `.portfolio-grid` added `margin-bottom: var(--space-lg)` — matches KPI strip → cards gap, so cards → Nearly Complete spacing is equal
- `.portfolio-card__name` font-size 0.95rem → 1.1rem

**Lighter card backgrounds (Glen: "a little bit lighter to differentiate from background"):**
- `.portfolio-strip__item`, `.portfolio-card`, `.tactical-section` all changed from `var(--bg-card)` to `color-mix(in srgb, var(--bg-card) 85%, var(--text-muted))` — blends 15% of the muted text colour into the card bg, lifting them slightly above the dark base without being jarring. Works across all themes via the CSS variables.

### Entry 6: Portfolio dashboard v3 brainstorming (visual companion)

Started brainstorming session for major portfolio dashboard redesign. Visual companion server running at localhost:62113.

**Glen's architecture decisions (from wireframe review):**
1. Client cards move to a narrow LEFT COLUMN (stacked vertically, scrollable)
2. "Portfolio" card at top = aggregate summary across all clients
3. Clicking a client card FILTERS the 4 viz panels (no more expand/collapse on cards)
4. KPI trend deltas = week-over-week comparison (needs historical snapshot DB table)
5. Four viz panels in 2x2 grid to the right of client column
6. Bottom row: Nearly Complete + 2 TBD panels

**Wireframes shown:**
- `layout-architecture.html` — overall layout structure (approved)
- `viz-panels.html` — mockups for all 4 viz panels with specific content proposals

**Awaiting Glen's feedback on:** panel content specifics, bottom TBD panel ideas, charting approach

**Glen's v2 feedback:**
- Timeline panel must replicate the actual Projects Gantt view, not a simplified version
- Visual quality across all panels was poor ("looks like shit")
- Work Completed needs three data series: existing backlog, new work added, completed
- Glen clarified he's not frustrated, just correcting a mistake

**v3 wireframe (`viz-panels-v3.html`):**
- Timeline now replicates actual Gantt: label column with P/F type badges, client group headers, day/month headers, today line, zoom+nav controls, status-coloured bars, hierarchy indentation
- Work Completed: cleaner with grid lines, three series, current week highlight, net summary
- Health Scorecard: tighter layout with dot-in-cell RAG treatment
- Needs Attention: two-line items with project context, cleaner spacing

**Glen's v3 feedback + v4 wireframe (`viz-panels-v4.html`):**
- Health Scorecard: reverted to plain dots in a simple table — the tinted cells made it worse
- Work Completed: now three side-by-side bars per week (Planned/Added/Completed), not stacked
- Timeline: approved (v3)
- Needs Attention: approved (v3)
- Interaction model: clicking any item in any panel opens `openDetailOverlay()` as pop-out, no page navigation

**Implementation plan written:** `docs/superpowers/plans/2026-04-18-portfolio-dashboard-v3.md`
- 14 tasks: migration, server (cron+API+bootstrap), CSS layout, state vars, orchestrator rewrite, KPI strip, client sidebar, Work Completed chart, Health Scorecard, Timeline Gantt, Needs Attention, bottom row (3 panels), v2 cleanup, smoke test

### Entry 7: Portfolio v3 implementation (worktree d:/tmp/portfolio-v3, branch portfolio-dashboard-v3)

**Completed Tasks 1-2 (server):**
- `516a21c` — migration 028_dashboard_snapshots.sql
- `4a37e23` — computeDashboardSnapshot(), GET /api/dashboard/snapshots, daily cron 00:05 UTC, startup bootstrap, 4 tests passing

**Completed Tasks 3-12 (frontend):**
- `dc1de9b` — full frontend rewrite: CSS (.pf__* classes), state variables, renderPortfolioDashboard() orchestrator, 9 panel render functions (Strip, Sidebar, WorkCompleted, HealthScorecard, Timeline, NeedsAttention, CompletingSoon, UpcomingMilestones, TeamWorkload)

**Task 13 cleanup (in progress):**
- Removed `togglePortfolioCard()` — no longer called (cards don't expand)
- Removed `bestGridColumns()` — no longer called (sidebar layout replaces grid)

**v5 wireframe (`work-completed-v5.html`):**
- Work Completed: Planned + Added stacked as left bar, Completed as right bar per week. Stacked bar = total workload, green bar = output. Green shorter than stacked = backlog growing.

**Bottom row wireframe (`bottom-row.html`):**
- Nearly Complete: projects 60-99% done, progress bars, click opens overlay
- Upcoming Milestones: root tasks due within 14 days, urgency-coded badges
- Team Workload: horizontal bars per person, active task count, red/amber/green by load thresholds
- Glen renamed "Nearly Complete" to "Completing Soon"
- Bottom row approved

**Design spec written:** `docs/superpowers/specs/2026-04-18-portfolio-dashboard-v3-design.md`
- Full spec covering: layout architecture, KPI strip with WoW deltas, client sidebar, 4 viz panels (Work Completed, Client Health, Project Timeline, Needs Attention), bottom row (Completing Soon, Upcoming Milestones, Team Workload), interaction model, new `dashboard_snapshots` DB table + cron + API endpoint
