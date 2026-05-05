# HANDOFF: 2026-05-05 Session 6 - Milestones Feature

## Session Summary

Implemented the full milestones feature end-to-end: database migration (already committed), test helpers (already committed), API endpoint tests, CRUD API endpoints, and complete frontend UI including client header section, detail panel, and portfolio tile replacement.

---

## Current State

- **Branch:** master at `09472e8`
- **Tests:** 376 passing (vitest, confirmed this session, up from 360)
- **PM2:** all 5 processes online, nbi-dashboard restarted (13 restarts)
- **Database:** migration 038 applied (milestones + milestone_items tables)

---

## Awaiting Glen UAT

### Milestones Feature (merged `09472e8`)
- **Database:** `milestones` table (UUID PK, client_id FK, title, description, target_date) + `milestone_items` join table (milestone_id, task_id)
- **API:** 4 endpoints with full auth/validation:
  - `GET /api/clients/:clientId/milestones` - list with linked_item_ids
  - `POST /api/clients/:clientId/milestones` - create with optional linked items
  - `PUT /api/milestones/:id` - update fields and replace linked items
  - `DELETE /api/milestones/:id` - cascade delete
- **Client header:** Milestones section appears below studio profile. Shows milestone cards with title, target date, progress bar, status badge (On Track/At Risk/Overdue/Complete). "+ Add" button creates new milestones.
- **Detail panel:** Sliding panel (same pattern as queue detail) with editable title, target date picker, description textarea, computed status display, linked items list with add/remove, item picker dropdown. Save/Delete/Cancel actions.
- **Portfolio tile:** "Upcoming Milestones" panel now shows real milestone data from all clients (or filtered by selected client), sorted by target date. Clicking opens the detail panel.
- **Status computation:** Derived at render time from linked items + their full descendant subtrees. Complete (100%), Overdue (past target date), At Risk (blocked items or <14 days and <80%), On Track (default).
- **16 new tests** covering CRUD, auth, cascading, validation

### Queue Detail Panel (merged `3dcb2dc`)
- Click queue items to open slide-in detail panel
- Select client + type, fill in all task card fields, then Promote or Dismiss
- Follows bug-detail-panel CSS pattern, responsive full-width on mobile

### Client Portal (merged `8b74230`)
- Client-scoped user system with force password change on first login
- Client filter lock, company name in header, scoped views
- Client admin team management (invite/deactivate/reset)
- NBI admin sees Source column in Bug Tracker

### News Aggregator M4: Search + Admin (merged `40a3ab1`)
- News tab Search subtab with highlighted results
- Settings > News: Feed Health, Prompts, Sources, Stories admin panels
- Merge/split stories, regenerate, add sources

---

## On Hold (waiting on external input)

- **QuickBooks Time API** - blocked on Bryan Rasmussen's API token. Native `time_entries` table exists for manual logging.
- **Slack app icon** - Glen has the image, needs to upload at api.slack.com > Basic Information > Display Information

---

## Backlog - Needs Brainstorming

- **SoW layer in hierarchy** - insert SoW between Client and Project in work item tree
- **Telemetry + BI Analytics Dashboard** - plan at `.claude/plans/serialized-hatching-anchor.md`
- **Real research backend** - Brave/Tavily/Anthropic to replace stub
- **Couch Heroes fresh import** - old xlsx deprecated
- **Docs mobile layout** - 1 open bug, needs device test

---

## Open Bug

| ID | Title | Status |
|---|---|---|
| 232f0485 | Documentation: mobile responsive layout never visually verified | open |

---

## Stale Worktrees

- `.worktrees/queue-detail-panel` - merged, can be removed: `git worktree remove .worktrees/queue-detail-panel --force`
- `.worktrees/capacity-detail`, `.worktrees/import-wizard-fix`, `.claude/worktrees/romantic-kapitsa-a67847` - file locks preventing removal, safe to force delete

---

## Feature Requests (not started)

- SoW upload on Leads (attach draft SoW to lead before client conversion)
- Report editing post-submission (amend/add commentary after send)

---

## UI/UX Audit Backlog (low priority)

1. Optimistic updates for task/expense/finance changes
2. Standardise tab component HTML/class across views
3. Split Settings page into sub-pages

---

## Config

- **Live URL:** https://worksage.nbi-consulting.com
- **Ports:** 8888 (prod), 8887 (staging), 8889 (test)
- **PM2:** nbi-dashboard, nbi-dashboard-staging, nbi-news, cloudflare-tunnel, context-monitor
- **Tests:** `npm test` (vitest), `npm run test:e2e` (playwright), `npm run test:all` (both)
