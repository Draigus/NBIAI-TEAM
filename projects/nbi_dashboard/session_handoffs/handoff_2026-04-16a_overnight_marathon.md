# Handoff — 2026-04-16a Overnight Marathon Session

**Written:** 2026-04-16 ~01:30 BST
**Author:** Claude (Opus 4.6)
**Reason:** Glen relaunching Claude Code for version update (1.2773.0). PM2 + DB unaffected.

---

## Server State

| Service | PID | Port | Status | Uptime |
|---|---|---|---|---|
| nbi-dashboard (PM2 cluster) | 39648 | 8888 | online | 20m at time of handoff |
| nbiai-api (Hub) | 25276 | 3001 | online | 16h |
| PostgreSQL | system | 5432 | connected | stable |

**Health check:** `GET http://localhost:8888/api/health` → `{"status":"ok","db":"connected"}`

**PM2 dump saved:** Yes (restart count 30 for nbi-dashboard during this session).

**DB credentials:** `PGPASSWORD='NbiAi2026!SecureDb'` / user `nbiai` / database `nbi_dashboard` / host `localhost`

**Test DB:** `nbi_dashboard_test` on same server. `.env.test` in `dashboard-server/` with `TEST_PORT=8889`.

---

## What This Session Shipped

This was a massive overnight session. 25 commits on master since the session started. Here's everything, grouped by category:

### Phase 1-5 (from the Master Workload Plan)

These were the first items from the approved plan at `projects/nbi_dashboard/plans/2026-04-15-kanban-drag-reorder.md`:

| Commit | Item | What |
|---|---|---|
| `fe4f925` | B1 + B2 | express-rate-limit IPv6 fix + sync `[[]]` array-literal fix |
| `26b04be` | K1 | Playwright drag specs (5 new E2E tests for all 4 kanban boards) |
| `357c542` | G1 | Collapsible sidebar with client abbreviations (CH/LH/SU/GS/NSI/PS) |
| `a99c9c7` | G2 | Practice model: Gaming + Organizational Health, migration 022 |
| `56231a2` | G4 | Sortable People-tab tables (all 4 tables + bar chart) |
| `1033c1a` | G3 | Mobile CSS pass for iPhone 11 viewport (8 screenshots) |
| `a547788` | O3/O4/O7 | Warnings light-theme QA, skeleton screens, Won lead marker extension |

### Ad-hoc Fixes (Glen-reported during session)

| Commit | Bug ID / Decision | What |
|---|---|---|
| `16831ef` | D88 | Magnus → admin, custom permissions wiped, sessions cleared |
| `739ea6a` | D89 | Warnings/alerts now user-specific (no admin firehose) |
| `1e93661` | D90 | Calendar DATE timezone fix (pg DATE → raw YYYY-MM-DD strings) |
| `2560417` | D91 | Calendar team filter infinite loop + projects mobile filter bar |
| `24d168e` | D92 | People → Calendar sub-view + firm_closed event type |
| `52c5325` | 420ee3b6 | Standup click scroll-to-top fix (save/restore scrollY) |
| `f8bfe14` | 9a8010a7 | Cancelled items crossed out everywhere (task-row, standup, board card) |
| `f0dce5c` | 53f56fe0 | Kanban density pass across all 4 boards (~25-30% smaller cards) |
| `7c8a462` | — | People Calendar auto-scale to viewport + admin firm-closure quick-add button |
| `4b3a9c1` | 1d3d811e + e49be05e | My Work → Projects tree expand-and-scroll + calendar declutter (firm_closed always visible) |
| `e116433` | d4367137 | Team events on calendar (migration 023, team_id FK, visibility ACL) |
| `3d79202` | D93 | Capacity Planning deducts time off from calendar events |
| `ef55dc7` | — | Firm-closed events fan out to every person's roster row |
| `05a254a` | — | Overlapping firm_closed events collapse to one bar per day |

### Remaining Backlog Items (shipped after "why would we pause?")

| Commit | Bug ID | What |
|---|---|---|
| `74e839d` | 86be4df5 | Calendar detail panel uses inline right-side panel (was bypassing to overlay) |
| `f1038d8` | c73af494 | "My Work Only" sort filter (renamed from Assignee, now filters to current user) |
| `226ab6b` | cb32b7f9 | Client → SoW → Project → Tickets hierarchy (sow_id wired end-to-end, tree grouping) |
| `e0cb54c` | a6c82c8c | HC Page via practice-mode banner on Projects view |
| `c0b8aee` | b7a2f97f | Hiring page 8-stage rewrite (migration 024, arrow nav, per-stage assignees, clear/archive/reopen) |

### Practice Rename: Organizational Health → Organizational Performance

| Commit | What |
|---|---|
| `9913ec3` | Slug `organisational_health` → `organisational_performance`, label/shortLabel/abbrev updated, migration 025, server validation, test update + old-slug-rejection regression test |
| `8647d13` | Knowledge docs sweep (NBI_Brain.md, CMO, tech_writer, brand_manager, pipelines) |

### Practice Filter Bugs (Glen's real-time testing caught these)

| Commit | What |
|---|---|
| `242dd5b` | Dashboard/Finances practice-mode banners + retired duplicate sector values from lead_field_options ("Gaming"/"Organisational" sectors were duplicating the practice model and confusing Glen) |
| `204d538` | Added Client filter dropdown to Projects filter bar (was missing, only had Project filter) |
| `514f088` | Multi-select trigger alignment (Status/Health/People buttons didn't match native selects visually) |
| `7df2bf7` | Sidebar counts + Finances now filter by practice. Sidebar was computing all counts from raw `tasks` ignoring practice. Finance revenue/payroll now filters by client's practice_area. |
| `7929805` | Reports page (`renderReport`) now respects practice filter (was using raw `tasks`) |
| `3f06547` | **Critical:** Finance practice filter moved BEFORE P&L calculations. Was running after — KPIs, charts, burn rate all used unfiltered data. Also excludes OpEx + ad-hoc entries when practice-filtered (shared costs can't be attributed to one practice). |

### Live-Update Audit

| Commit | What |
|---|---|
| `e1a93ed` | Three missing re-renders: `updateClientField` (Manage Clients PATCH → no renderContent), `updateReport` (Expenses PATCH → no refreshExpenses), `standupUpdateTask` (save but no renderContent for non-status fields — KPIs/sidebar stale) |

---

## Database State

### Migrations Applied (dev DB `nbi_dashboard`)

| Migration | What |
|---|---|
| 021 | Kanban position column on tasks/bug_reports/candidates/leads + backfill |
| 022 | Practice model: gaming + organisational_health (now superseded by 025) |
| 023 | Calendar team events: team_id FK on calendar_events |
| 024 | Hiring rewrite: stage_assignees, start_date, onboarding_links, archived_at on candidates + stage migration |
| 025 | Practice rename: organisational_health → organisational_performance |

All registered in `schema_migrations` table. The migration runner at startup skips already-applied ones.

### Key Data Points

- **Tasks:** 1124 total, 1121 practice_area='gaming', 3 NULL
- **Clients:** 44, all practice_area='gaming', all sector=NULL (cleared in session)
- **Leads:** 43, all practice_area='gaming'
- **Candidates:** 2 (stages: send_offer_letter, upload_cv — migrated from old offer/screening)
- **SoWs:** 44 exist but zero tasks linked to any SoW (schema ready, UI wired, waiting for Glen to start tagging)
- **Calendar Events:** 4 (Glen's "drunk" test + Magnus's 3 test events + 2 firm_closed test events)
- **Teams:** 1 (LH-PnL)
- **Hiring Stages:** find_candidate, upload_cv, conduct_interviews, background_check, establish_start_date, send_offer_letter, onboard_candidate, hired (8 stages, migration 024)
- **Magnus Pryer:** role=admin, zero custom permissions, 26 stale sessions deleted earlier

### Bug Tracker State

| Status | Count |
|---|---|
| open | 2 |
| please_review | 25 |
| resolved | 42 |
| wontfix | 1 |

**Open items (both blocked on SMTP provider):**
- `ae561c32` PM Report System — weekly digest email to PMs
- `f3a5e888` Due & Late Ticket Warning System — daily due-date alerts

**25 please_review** items await Glen's UAT. Every item has a pipeline-compliant comment (plain English, starts with "Fixed."/"Done.", ends with "Please test by...").

---

## Test Suite

**72 vitest (unit/integration) + 14 playwright (E2E) = 86 total, all green.**

Run: `cd dashboard-server && npm run test:all`

Key test files added this session:
- `tests/unit/calendar-team-events.test.mjs` — 5 tests for team event ACL (member/admin/non-member)
- `tests/unit/calendar-firm-closed.test.mjs` — 4 tests for firm_closed admin-only type
- `tests/unit/calendar-date.test.mjs` — 2 tests for DATE timezone round-trip
- `tests/unit/sync.test.mjs` — 3 tests for `[[]]` array normalisation
- `tests/unit/clients-practice.test.mjs` — 5 tests (was 4, added old-slug-rejection)
- `tests/e2e/kanban-drag.spec.js` — 5 drag specs for all 4 boards (updated to new stages)
- `tests/e2e/mobile-screenshots.spec.js` — 8-view mobile capture harness
- `tests/e2e/warnings-light-theme.spec.js` — dark/light/hover screenshot spec

If `.env.test` is missing, create it:
```
TEST_PORT=8889
DATABASE_URL=postgres://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard_test
JWT_SECRET=test-secret-key-for-vitest
```

---

## Architecture Decisions Made This Session

All logged in `projects/nbi_dashboard/live_state/decisions.md`:

| ID | Decision |
|---|---|
| D88 | Magnus → admin, systemic permissions |
| D89 | Warnings/alerts user-specific, no admin short-circuit |
| D90 | pg DATE columns → raw YYYY-MM-DD strings (pgTypes.setTypeParser 1082) |
| D91 | Calendar team filter render-loop fix + projects mobile filter bar |
| D92 | People → Calendar sub-view + firm_closed event type |
| D93 | Practice renamed Organizational Health → Organizational Performance |

---

## What's NOT Done

### Blocked on Glen (SMTP)
- `ae561c32` PM Report System — needs SendGrid/SES/Postmark provider
- `f3a5e888` Due & Late Ticket Warning System — same blocker

### Hiring Rewrite Deferred Items (commit `c0b8aee`)
1. **End-of-next-work-day auto-delete of archived cards** — too risky to ship async cleanup logic overnight. Archived cards stay visible (when "Show archived" toggle is on) and can be manually deleted by admins.
2. **Per-round interview assignee fields with grey "+" button** on the Conduct Interviews stage — currently just a single assignee list per stage plus a notes textarea.

### Practice Filter — Remaining Edge Cases
- **Expenses view** — not tested with practice filter. Expense reports don't have a practice_area field. If Glen filters to OP on Expenses, behaviour is untested.
- **People → Workload/Capacity** — uses `getFilteredTasks()` which respects practice, but wasn't explicitly tested this session.
- **When OP data starts existing**, Glen needs to tag clients with `practice_area='organisational_performance'` via the Manage Clients page. All downstream views (Projects tree, Leads kanban, Finances P&L, Dashboard KPIs) will then populate for OP automatically.

### SoW Layer (commit `226ab6b`)
- Schema + UI are wired end-to-end, but zero tasks are linked to any SoW. Glen needs to start tagging projects via the "Statement of Work" dropdown in the inline detail panel.
- When a client has zero SoW-tagged projects, the SoW grouping header is suppressed (renders exactly like before).

---

## Key File Locations

| File | Purpose |
|---|---|
| `nbi_project_dashboard.html` | The entire frontend (~17k lines) |
| `dashboard-server/server.js` | Express API server (~7k lines) |
| `dashboard-server/migrations/` | SQL migrations (021-025) |
| `dashboard-server/tests/` | Vitest unit + Playwright E2E |
| `projects/nbi_dashboard/live_state/` | decisions.md, work_completed.md, pending_tasks.md |
| `projects/nbi_dashboard/plans/` | Master workload plan |
| `CLAUDE.md` | Bug triage pipeline + session continuity rules |

---

## Glen's Immediate Next Steps

1. **Relaunch Claude Code** (version 1.2773.0 update)
2. **Ctrl+F5** in the browser to clear JS cache — many fixes shipped overnight that the browser may have cached old versions of
3. **Walk the 25 please_review items** in the Bug Tracker kanban — each has a test-by instruction in the latest comment
4. **Start tagging clients with SoWs** to see the Client → SoW → Project → Tickets hierarchy in action
5. **Decide on SMTP provider** to unblock the two remaining open items

---

## How to Resume

```
cd D:\OneDrive\Claude_code\NBIAI_TEAM
```

Load this handoff, then:
- `pm2 list` — confirm both services are online
- `curl http://localhost:8888/api/health` — confirm API healthy
- `cd dashboard-server && npm run test:all` — confirm 86 tests green
- Read `projects/nbi_dashboard/live_state/work_completed.md` for the full session log
