# Pending Tasks

Updated 2026-04-15 (Session post-test-infra, executing Kanban + Glen's overnight backlog)

---

## Glen's Overnight Backlog (2026-04-15 23:something, sent before bed)

Glen sent these BEFORE going to sleep with the instruction "just keep working." Order is roughly small → large. Execute after the Kanban work merges.

### G1 — Collapsible left sidebar with practice/client abbreviations
- Practice/client list on the left sidebar should be collapsible to icons or two-letter abbreviations.
- Abbreviations Glen specified:
  - **CH** Couch Heroes
  - **LH** Light House (Lighthouse Games)
  - **SU** Sarge Universe
  - **GS** Goals Studio Ops
  - **NSI** (no expansion given — likely a client he didn't spell out)
  - **PS** PlaySage
- "Otherwise, we could use icons. Cool to be able to collapse that entire sidebar to just that view, so you get more screen real estate when you're working."
- Acceptance: a collapse toggle on the sidebar that switches between full names and 2-letter abbreviations (or icons), persists across reload.

### G2 — Practice filters on the left sidebar
- The practice filters currently DON'T work.
- Glen wants exactly TWO practices visible: **Organizational** and **Gaming**.
- "General" should be removed entirely.
- All work currently in the dashboard should be tagged for the **Gaming** practice.
- "Organizational" should be projects that come from set-up work (currently none — empty bucket is fine).
- The sidebar filter should switch between Organizational and Gaming.

### G3 — Mobile UI pass (iPhone 11)
- Glen tested on his phone, "some views looked awful in their layout on the screen on an iPhone 11."
- iPhone 11 viewport: 414 × 896 logical pixels (1242 × 2688 physical).
- Audit every top-level view (Dashboard, Workload, Projects, People, Reports, Bug Tracker, Hiring, Leads, Settings, Clients) at 414×896. Fix the broken ones.

### G4 — Sortable tables on the People tab
Glen wants four tables on the People tab to be sortable by column:
- **Workload Overview** (40-hour-a-week baseline) — sortable by person from highest to lowest.
- **Capacity Planning** section — sortable.
- **Hours per person per client** — sortable.
- **Task summary by person** labels — sortable.

The Reports view already has sortable columns from session 2026-04-15 (commit dd87753). Reuse the same pattern.

### G5 — Client-scoped users (BIG feature)
The largest item on the list. Add a user role / scoping mechanism so external client contacts can log in and see ONLY their own client's work.

Glen's example: **Lorenza is Couch Heroes HR.** When she logs in, she should:
- Only see Couch Heroes on the client list (no other clients in the sidebar).
- Top nav should show ONLY: Dashboard, Workload, Projects (not Bug Tracker, Hiring, Leads, Reports, Settings).
- All data (tasks, projects, hours, etc.) hard-filtered to Couch Heroes only.
- Notifications and alerts filtered to client-specific items only.

Acceptance components:
- A new user role or `client_scope` column on `users` (UUID FK to `clients`).
- Server-side: every authenticated query checks `req.user.client_scope` and filters by `client_id`.
- Frontend: sidebar and top nav hidden for non-applicable items.
- A UI to create such a user and assign their client scope (admin only).
- Tests: a Lorenza fixture user with client_scope = Couch Heroes UUID can ONLY see Couch Heroes data.

This is multiple sprints of work — design + spec + plan + implement. NOT something to bang out overnight, but Glen will want a credible plan ready for review when he wakes up.

---

## ACTIVE THIS SESSION

### Kanban drag-to-reorder (D79) — IN PROGRESS
- Spec: 2026-04-15-kanban-drag-reorder-design.md (commit 47a9a04)
- Plan: 2026-04-15-kanban-drag-reorder.md (this session)
- Branch: kanban-drag-reorder
- Status: plan written, executing tasks 0a → 11d in order.

---

## Completed Earlier Today (2026-04-15)

### Test infrastructure (Project A)
- Vitest + supertest (16 unit tests) + Playwright + Chromium (7 E2E tests) = 23 tests passing in ~19s.
- Merged to master as commit e26ed85.

### Sortable Reports columns
- Progress by Project table on the Reports view now has sortable columns.
- Commit dd87753.

### Double-escape migration (W1+W2)
- Commits 203dad6, abac7f2.
- Server stops escaping HTML at write time; migration 020 cleaned up existing rows.

---

## UI/UX Audit Backlog (Low Priority)

1. **Replace renderAll() with targeted DOM updates** -- major architecture change
2. **Optimistic updates** for task/expense/finance changes
3. **Skeleton screens** for async-loaded content
4. **Standardise tab component HTML/class** across views
5. **Collapse dashboard standup by default**
6. **Split Settings page** into sub-pages
7. **Textarea auto-resize** during typing (only fires on panel open)

---

## Feature Requests (older backlog, not started)

5. **Calendar view dependency display**
6. **Warnings & Alerts Sidebar** (right-hand notifications panel)
7. **PM Report System** (daily email summaries) -- blocked by SMTP
8. **SoW Upload on leads**
9. **"Complete" marker for Won leads**
10. **Hiring Page** (candidate pipeline)
11. **HC/Org Performance Page & Board**
12. **Report Editing post-submission**
13. **Embed files via Sharepoint link**
14. **Add SoW layer to hierarchy** (Client > SoW > Project > Feature > Story > Task)

---

## Planned

### Telemetry + BI Analytics Dashboard (3 sprints)
- Plan saved in `.claude/plans/serialized-hatching-anchor.md`

### Finance P&L Enhancement
- Glen wants more detailed true P&L
- Consulting metrics should dynamically reflect P&L data

---

## On Hold (waiting on external input)

### SMTP Configuration
- Emails log to console (async, non-blocking)
- Needs Glen's SMTP provider details
- Blocks: email warnings, PM reports, password reset

### QuickBooks Time API Integration
- Blocked on Bryan Rasmussen's API token

### Excel Import Template
- NBI_Dashboard_Import_Template_v2.xlsx ready
- Needs Glen to populate with real project data and test import
