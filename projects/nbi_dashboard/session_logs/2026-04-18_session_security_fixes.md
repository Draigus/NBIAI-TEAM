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
