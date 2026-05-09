# Handoff — Server Modularisation (In Progress)

**Date:** 9 May 2026 (continued)
**Session:** Server modularisation — Waves 1-2 complete, starting Wave 3
**Status:** Tasks 1-11 of 18 complete. server.js: 10,696 → 7,441 lines. 18 route files + 9 lib modules. Resume from Task 12.

---

## Server Modularisation — Resume Here

### Location

- **Worktree:** `D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/modularise-server`
- **Branch:** `modularise-server`
- **Latest commit:** `3f3fa11` — "refactor: extract 8 medium route groups"
- **Restore point:** git tag `pre-modularise` on master
- **Main working tree:** untouched, on `feature/portfolio-v5-redesign`
- **Plan:** `docs/superpowers/plans/2026-05-09-server-modularisation.md`

### What's Done (Tasks 1-9 — Wave 1 complete)

Nine lib/ modules extracted from server.js. All 387 tests pass in the worktree.

**lib/logger.js** (26 lines) — `log()`, `LOG_LEVELS`, `LOG_LEVEL`.

**lib/db.js** (41 lines) — `createPool(connectionString)` factory.

**lib/helpers.js** (247 lines) — Item types, business days, buildPatchQuery, kanban position helpers, UUID validation, hashToken, escHtml.

**lib/email.js** (108 lines) — MSAL config, Graph API, `sendEmailAsync`, `buildEmailHtml/Table/Section`. Uses `setEmailCounter()` setter for Prometheus counter.

**lib/auth-middleware.js** (200 lines) — Factory `createAuthMiddleware(pool)` returns: `requireAuth`, `requireAdmin`, `requireNBI`, `requireClientAdmin`, `requireTaskAccess`, `getClientScope`, `getClientScopes`, token cache (`cacheToken`, `getCachedToken`, `invalidateToken`, `invalidateUserTokens`, `clearTokenCache`), session cookie helpers, brute-force protection.

**lib/audit.js** (75 lines) — Factory `createAudit(pool)` returns: `auditLog`, `sanitiseAuditData`, `computeNextRepeatDate`.

**lib/notifications.js** (8 lines) — Factory `createNotifications(pool)` returns: `createNotification`.

**lib/import-parser.js** (326 lines) — `detectImportFormat`, `parseExcelFile`, `parseCSVFile`, `mapRowsToTasks`. Pure functions, no pool dependency.

**lib/metrics.js** (64 lines) — `setupMetrics(app, pool)` returns counters: `syncConflicts`, `authFailures`, `ocrRequests`, `emailSends`.

**Current server.js:** 9,612 lines (was 10,451 after tasks 1-3, originally 10,696).

### What's Next (Tasks 10-18)

The full plan is at `docs/superpowers/plans/2026-05-09-server-modularisation.md`. Resume from **Task 10**.

**Wave 2 (Tasks 10-12) — route extractions:**
- Task 10: 10 small route groups (settings, finance, time-entries, time-off, queue, contacts, client-notes, notifications, templates, slack)
- Task 11: 8 medium route groups (auth, users, clients, milestones, sows, teams, calendar, attachments)
- Task 12: 7 large route groups (leads, expenses, bugs, hiring, reports, resource-planning, dashboard)

**Wave 3 (Tasks 13-16) — complex extractions:**
- Task 13: routes/documents.js (ETag concurrency, cycle detection, permissions)
- Task 14: routes/tasks.js + routes/sync.js (the two biggest — PATCH tasks ~358 lines, sync/changes ~390 lines)
- Task 15: routes/admin.js (backup, restore, cleanse, import, health)
- Task 16: cron/ directory (PM report, due warnings, inbound email, FX rates, cleanup)

**Wave 4 (Tasks 17-18) — finalize:**
- Task 17: Slim server.js to ~300-line orchestrator
- Task 18: Verification, documentation

### Route Module Pattern

Every route file follows this pattern:
```javascript
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, log, requireAuth, requireAdmin } = ctx;
  router.get('/api/example', requireAuth, async (req, res) => { ... });
  return router;
};
```

server.js mounts them:
```javascript
const ctx = { pool, log, app, upload, sendEmailAsync, requireAuth, requireAdmin, ... };
app.use(require('./routes/auth')(ctx));
```

### Critical Constraints

1. **All 387 tests must pass after every task.** Tests import from `require('../../server.js')` — both `app` and named exports.
2. **server.js must re-export everything.** Current exports at bottom of server.js:
   - `module.exports = app` (default)
   - Named: `getClientScope`, `getClientScopes`, `requireNBI`, `requireAdmin`, `shiftForInsert`, `reorderInGroup`, `addBusinessDays`, `businessDaysBetween`, `buildEmailHtml`, `buildEmailTable`, `buildEmailSection`, `buildDueWarningEmails`, `buildPmReportEmails`, `matchSubjectToTask`, `processOneInboundEmail`, `processInboundEmails`, `extractLinksFromHtml`, `detectImportFormat`, `mapRowsToTasks`, `runAttachmentSweep`
3. **No API surface changes.** No route paths, methods, or response shapes change.
4. **Work in the worktree only.** `D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/modularise-server`
5. **Error handler must be registered AFTER all route mounts** in server.js.
6. **CommonJS only** — `require`/`module.exports`, not ESM.

### Architecture Corrections Noted (not yet applied)

These were identified during the critique phase — apply during execution:
- Prometheus counters (syncConflicts, authFailures, ocrRequests, emailSends) must flow to route modules via ctx after lib/metrics.js extraction
- Admin/cleanse routes are registered after the error handler in original code — fix ordering when extracting
- `upload` multer instance must be in ctx for SoW upload, document attachments, expense receipts, candidate CV routes

---

## Portfolio v5 Redesign + Reporting Improvements (feature/portfolio-v5-redesign branch)

**Branch:** `feature/portfolio-v5-redesign` (~30 commits, NOT merged to master yet)
**Status:** Live on production (:8888). Glen UAT in progress with iterative feedback.

### What Was Built

**Portfolio page completely rewritten** from v4 sidebar+panels to v5 neumorphic design:
- 7 render functions rewritten, ~370 lines dead v4 code removed
- Layout: KPIs (5 cards) -> Client Table + Status Overview (2:1 side-by-side) -> Near Completion + Milestones -> Needs Attention + Team Workload
- Viewport-fit: no outer scroll. Only Needs Attention scrolls internally.
- Client table: health diamonds, progress bars, key risk column, click-to-filter, "All Clients" back button
- Command theme: dark glass cards with radial cyan gradient from all 4 corners, neural network background image (`dashboard-server/public/images/command-bg.jpg`), backdrop-filter blur
- Command glass treatment applied across all views: Workload, People, Leads, Expenses, Reports (not Finances)
- 8 themes total including new Command theme in picker

**Reporting timeline improvements:**
- Milestone vertical lines on timeline (cyan future, red overdue) with labels
- Feature bars: stacked status model (purple=done, green=in progress, red=blocked/overdue, grey=not started)
- Story bars in drawer use same stacked model, computed from leaf task status
- Owner column: falls back to most common child assignee if feature has no direct assignee
- Team field: collects all unique assignees from descendant tasks, semicolon-separated

**Workload improvements:**
- Overdue tasks show red "Xd OVERDUE" badge when person is expanded
- Overdue/blocked counts in person header now exclude Done and Cancelled tasks (was counting completed tasks with past due dates)

**Data fixes:**
- Deleted stale clients: Lighthouse Studios, Sarge Universe (both 0 tasks)
- Set client_id on Amir Didar, Stavros, Ruan (linked to Lighthouse Games)

**QA bugs fixed:**
- Invalid `color-mix(200%)` CSS
- Snapshot date timezone shift (UTC vs local)
- Milestone "No other clients" message in filtered view
- Negative margin overshoot on attention/milestone rows
- Duplicate backlogFillPct variable
- Detail/milestone slide-out panels opaque in Command theme
- PM2 crash from modularisation branch server.js bleeding into working directory

**Font sizes:** All inline font-size values below 0.7rem bumped to 0.7rem (~12px minimum)

### Outstanding Items (Next Session)

1. **Text truncation in reporting drawer** — Story names like "Engagement & Retention..." are truncated at 160px with ellipsis. Need to allow text to wrap or expand the name column. Same issue in the feature row FEATURE column (220px fixed width). Glen wants no truncation.

2. **Reporting drawer: month headers above stories** — Glen wants the same month/quarter header that appears on the main timeline to also appear above the story bars in the expanded drawer, so you can see when each story lands relative to the calendar.

3. **Reporting: dates/lead/team fields editable** — Lead and Team are currently display-only (computed from child tasks). Glen may want to set them explicitly on the feature. Currently you'd assign the feature directly via the detail panel.

4. **Reporting: verify 18% completion accuracy** — Glen questioned whether the percentages are correct. The calculation is leaf-task Done count / total leaf tasks. May need to audit specific features against the raw data.

5. **Portfolio layout: Team Workload may still scroll** on viewports shorter than ~900px. The flex distribution gives it auto-height but 8 staff bars need ~280px.

6. **Status Overview chart scaling** — Uses @media min-height queries but the donut/backlog bar are still small on wide screens. May need viewport-width-based scaling.

7. **Merge to master** — Branch has ~30 commits. Once Glen approves the portfolio layout, squash-merge to master.

### Key Decisions This Session

1. Alert banner killed (Glen: "kill this box")
2. Table + Status Overview side-by-side (Glen's suggestion)
3. Layout: Near Completion + Milestones middle, Needs Attention + Team Workload bottom (Glen's swap)
4. Only Needs Attention scrolls; everything else fits viewport
5. All staff shown in Team Workload (not filtered to NBI-only)
6. Command theme: glass cards with radial cyan gradient from all corners, neural network bg image
7. Reporting bars: purple=done, green=in progress, red=blocked/overdue, grey=not started
8. Minimum font size 12px (0.7rem) across entire app
9. No truncation wanted on reporting story/feature names

---

## Earlier Work This Session (all on master, deployed to production)

### Wave 5 Features
- `3db9947`: Not Started warning in daily PM report emails
- `da45126`: Standup overdue dates red, blocked badge purple, late starts amber
- `6e05dec`: SoW on lead cards (migration 042) + time-off tracking (migration 043)

### Bug Triage
- Triaged 44 bugs: 4 closed stale, 2 resolved duplicates, 5 fixed, rest confirmed please_review
- 0 open bugs remain. 55 items at please_review for team UAT.

### Colour Scheme (`4169435`)
- Blocked=red (#ef4444), In Progress=green (#22c55e), Done=purple (#a855f7)
- Applied across all views: badges, icons, gantt bars, kanban cards, progress bars, charts, KPIs

### Other Fixes
- `7fe22be`: Collapsible milestones panel
- `73d9dbe`: Inline UI updates for title/assignee + sync retry with backoff
- `e7753cf`: Endangered items red on kanban + gantt (overdue, Red health, blocked)
- `11795be`: Warnings panel crash (timeAgo string vs Date)
- `410c594`: Backup validation false positives

### Key Decisions
- Bug review ownership: please_review items are for the team, never bulk-resolve on Glen's behalf
- Colour scheme confirmed by Glen: Blocked+Late=red, In Progress=green, Done=purple
- Server modularisation approved — server first, frontend later, incremental

---

## Environment

- PM2 `nbi-dashboard` on :8888 (production, master branch)
- PM2 `nbi-dashboard-staging` on :8887
- PostgreSQL: 43 migrations applied (latest: 043_user_time_off.sql)
- Worktree for modularisation: `.worktrees/modularise-server` on branch `modularise-server`
