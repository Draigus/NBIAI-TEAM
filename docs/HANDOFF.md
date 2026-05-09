# Handoff — Server Modularisation (Complete)

**Date:** 9 May 2026 (evening, session 2)
**Session:** Server modularisation — All tasks complete
**Status:** Tasks 1-17 of 18 complete (Task 18 README update pending). server.js: 10,696 → 549 lines. 29 route files + 13 lib modules + 1 cron module. Ready for merge.

---

## Server Modularisation — DONE

### Location

- **Worktree:** `D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/modularise-server`
- **Branch:** `modularise-server` (14 commits)
- **Latest commit:** `5f236cd` — "refactor: move remaining inline routes to modules, slim server.js to orchestrator"
- **Restore point:** git tag `pre-modularise` on master
- **Main working tree:** untouched, on `feature/portfolio-v5-redesign`
- **Plan:** `docs/superpowers/plans/2026-05-09-server-modularisation.md`

### What's Done (All Tasks — Modularisation Complete)

server.js: 10,696 → 549 lines (94.9% reduction). All 387 tests pass.

**13 lib/ modules** (1,911 lines total): logger, db, helpers, email, auth-middleware, audit, notifications, import-parser, metrics, slack-bot, sow-extractor, redact-nbi-internal, attachment-sweep.

**29 route files** (8,258 lines total): auth, users, tasks (867 lines incl. comments/attachments/link), sync (623), documents (682), clients, milestones, sows, teams, contacts, client-notes, calendar, leads (607), expenses (976), bugs, hiring (438), reports, resource-planning, dashboard, admin (918 — audit-log/health/seed/backup/restore/import/cleanse), settings, finance, time-entries, time-off, queue, notifications, templates, slack, attachments.

**1 cron module** (940 lines): cron/index.js — factory returning all builder/helper functions (buildPmReportEmails, buildDueWarningEmails, matchSubjectToTask, processOneInboundEmail, processInboundEmails, extractLinksFromHtml, runAttachmentSweep, computeDashboardSnapshot) + registering all cron schedules.

**server.js** (549 lines) is now a thin orchestrator: dependency loading, shared dep creation, middleware mounting, route mounting, cron registration, error handler, startup, and re-exports for tests.

### What's Next

1. **Task 18: Update README** — Add directory structure section documenting the new module layout
2. **Merge to master** — Once Glen approves, squash-merge or regular merge the `modularise-server` branch to master
3. **PM2 restart** — After merge, restart `nbi-dashboard` on :8888

### Architecture Notes

- **Route module pattern:** Every route file exports a factory `function(ctx)` returning an Express Router. server.js passes shared deps via ctx object.
- **Test compatibility:** server.js re-exports all test-imported functions (20+ named exports). Tests still `require('../../server.js')`.
- **CommonJS only** — `require`/`module.exports`, not ESM.
- **Cleanse routes** moved from after-error-handler to before (bug fix — they now get proper 500 responses on unhandled errors).

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
