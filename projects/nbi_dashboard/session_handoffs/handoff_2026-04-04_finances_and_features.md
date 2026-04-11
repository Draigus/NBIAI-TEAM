# Session Handoff — 2026-04-04 — Finances Rewrite, Layout, Permissions, Feature Roadmap

## What Happened This Session

### Completed Work

1. **Three missing finance functions** — `renderGaugeChart()`, `renderMonthlyBarChart()`, `exportPnLCSV()` added. Finances page no longer crashes.

2. **Consulting-focused P&L rewrite** — Replaced "COGS" with "Cost of Services", "Revenue" with "Fee Income", "Operating Expenses" with "Overheads". Added sub-sections: Staff Overhead, Operational Costs. Bottom line is "Operating Profit (EBIT)".

3. **Full editability on finance data** — Click-to-edit on every cell (names, roles, amounts, types, clients). Add/remove buttons on all sections. Data persists to localStorage via `getFinanceData()`/`saveFinanceData()`. Reset to Defaults button. Data layer: `NBI_FINANCE_SEED` (const) → copied to localStorage on first load → all edits go to localStorage copy.

4. **USD column with live FX** — Fetches GBP/USD from `https://api.frankfurter.dev/v1/latest?from=GBP&to=USD` (ECB data, free, no key). Caches 4hrs in localStorage. Fallback: `https://open.er-api.com/v6/latest/GBP`. FX badge in header. USD column on all P&L monetary rows.

5. **Monthly P&L** — Columns: Monthly | Annual | USD. Primary figure is monthly. Every staff member shows `£X/hr · 160 hrs/mo` under their name.

6. **Layout redesign** — Removed gauge charts (duplicated KPIs), removed donut chart (redundant with bar chart). New layout: P&L left (50%), right sidebar (Consulting Metrics 2x2 + Revenue Target ring + Revenue by Client bars + Pipeline table). Monthly bar chart full-width below. All on one screen.

7. **Widescreen fix** — `.report` max-width bumped to 1400px. Finance page has `max-width: none`. Dashboard `progress-grid` changed to `repeat(2, 1fr)` default, `repeat(3, 1fr)` at 1600px+. Report portfolio uses `repeat(auto-fill, minmax(280px, 1fr))`.

8. **NSI Transition section removed** — Entirely deleted from view, seed data, and CRUD templates. Glen said the narrative about NSI winding down was incorrect.

9. **Report page grouped by client** — Project Portfolio cards now grouped under collapsible client headers (▼ COUCH HEROES (14) · 52% complete). Click arrow to expand/collapse.

10. **Task tree client hierarchy** — Tasks page now shows: Client (Epic) → Project (Feature) → Story → Task. Client headers are collapsible with stats (project count, task count, completion %, active, blocked). Collapse All / Expand All includes client groups. Uses `collapsedTaskIds` with `client_` prefix.

11. **Changelog page** — New page with audit trail. Backend: `GET /api/audit-log` endpoint. Frontend: table with Date | User | Action | Entity | Changes columns. Action badges (CREATE green, UPDATE blue, DELETE red). Field-level diffs (from → to). Filter by action type, search by user/task. Pagination (Load More, 50 at a time). Permission-gated.

12. **Enhanced audit logging** — PATCH `/api/tasks/:id` now fetches old values before update, logs `{ field: { from: oldVal, to: newVal } }` in JSONB changes column.

13. **Per-user page permissions** — Replaced simple "Admin Only / All Users" with three-option model: Admin Only | All Users | Specific Users (with per-user checkboxes). `hasPageAccess(page)` helper checks `_currentUser.role === 'admin'` OR `perm === 'all'` OR `Array.isArray(perm) && perm.includes(username)`. Settings UI shows full-width dropdown + user checkbox grid per page. Both Finances and Changelog use this system.

14. **Tom Rieger made admin** — `UPDATE users SET role = 'admin' WHERE username = 'tom'`

15. **Magnus given Changelog access** — `_pagePermissions = { finances: [], changelog: ["magnus"] }` — Magnus can see Changelog but not Finances.

16. **Inline edit Escape fix** — `onkeydown` for Escape now nullifies `onblur` before calling `renderAll()`, preventing DOM race condition.

---

## Current File State

**Frontend:** `D:\OneDrive\Claude_code\NBIAI_TEAM\nbi_project_dashboard.html`
- ~4200 lines
- All 8 views: dashboard, tasks, report, people, incomplete, finances, changelog, settings

**Backend:** `D:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server\server.js`
- Port 8888
- PostgreSQL: `postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard`
- Endpoints: auth, users, tasks (CRUD + bulk), clients, settings, audit-log, health, dashboard summary

**Server status:** Running on port 8888, PID 2764

---

## Key State Variables and localStorage Keys

| Key | Storage | Purpose |
|-----|---------|---------|
| `nbi_finance_data` | localStorage | Editable copy of NBI_FINANCE_SEED (revenue, payroll, pipeline, opex, targets) |
| `nbi_finance_entries` | localStorage | Ad-hoc income/expense entries from Add Entry form |
| `nbi_page_permissions` | localStorage | `{ finances: 'admin'|'all'|string[], changelog: 'admin'|'all'|string[] }` |
| `nbi_fx_cache` | localStorage | `{ rate: number, date: string, ts: number }` — cached GBP/USD rate |
| `nbi_auth_token` | localStorage | JWT-like session token for API auth |
| `collapsedTaskIds` | JS Set (memory) | Tracks collapsed state for client groups, tasks. Prefixes: `client_`, `report_client_` |
| `_fxRate` / `_fxDate` | JS globals | Current FX rate from Frankfurter API |
| `_changelogData` | JS global | Cached changelog entries from API |

---

## Database Tables

- `users` (id, username, display_name, email, password_hash, role, created_at)
- `sessions` (id, user_id, token, created_at, expires_at)
- `tasks` (id, title, parent_id, client_id, status, priority, health_state, description, assignees, hours_estimated, hours_spent, due_date, notes, created_at, updated_at)
- `clients` (id, name, created_at)
- `task_notes` (id, task_id, text, created_by, created_at)
- `client_notes` (id, client_id, text, created_by, created_at)
- `settings` (key, value)
- `audit_log` (id, entity_type, entity_id, action, changed_by, changes JSONB, created_at)

---

## Glen's Approved Feature Roadmap (from this session)

Glen reviewed a comprehensive feature audit and UI critique. Here is EXACTLY what he approved, with his specific notes:

### Features — All Approved

1. **Time tracking with QuickBooks integration** — Per-user, per-task timer. Auto-aggregate hours per task to hours by client. Must integrate with QuickBooks Time Tracker via MCP or API for auto-import.

2. **Task comments / activity feed** — Comment thread on every task with timestamps and author.

3. **Calendar view of deadlines** — Calendar showing what's due by when. Not just a list — a visual calendar.

4. **Task dependencies / sequencing** — Finish-to-start dependencies with visual indicators.

5. **Contract upload → auto-extract tasks and milestones** — Upload a contract file (PDF/DOCX), extract tasks and milestones automatically, configurable page to adjust.

6. **Client engagement notes on company profile** — Notes against the client/company profile, shown at the top of the client page.

7. **Role-based dashboard views** — MD view, PM view, IC view.

8. **Auto-generated status reports by client** — One-click per client.

9. **Resource planning / capacity page** — Committed hours vs available (40hr/week baseline).

10. **Gantt/timeline view** — Glen wants suggestions on implementation approach.

11. **File attachments on tasks** — Glen says build now, not later.

12. **Recurring task templates** — Glen says build now, not later.

13. **In-app notifications** — Glen says build now, not later.

14. **Full database backup/restore** — Glen says build now, not later.

15. **Mobile responsiveness** — Glen says build now, not later.

### UI/UX Changes — All Approved

1. **Replace Orbitron font** — Use Inter or IBM Plex Sans. Professional, not sci-fi.

2. **Dashboard KPIs should show revenue + project metrics** — Revenue this month vs target, utilisation %, tasks overdue, deliverables due this week. Not just task counts.

3. **Kill the donut chart** — Replace with coloured text/badges.

4. **Add edit affordance on finances** — Pencil icon on hover or edit mode toggle.

5. **Define a semantic colour palette** — Green=good, red=bad, amber=warning only.

6. **Collapsible sidebar** — Icon-only mode with toggle.

7. **Incomplete stays as a page** BUT also add red triangular exclamation markers (⚠) on individual tasks where fields are missing AND the task is not in Backlog status. Show the bang in the task row and in the right-side detail card.

8. **Status over time chart + project breakdown chart** — Replace the redundant bar chart with these two.

9. **Finance data must move to PostgreSQL** — localStorage for commercial data is dangerous.

10. **Empty states** on all pages.

11. **Persistent view selection** across filter/project switching (tree vs board persists).

12. **Workload bars need 40hr/week baseline** line.

13. **Keyboard shortcuts** — N for new task, 1-4 for status, / for search.

---

## What to Do Next (Priority Order)

This is a MASSIVE roadmap. The next session should:

1. **Write a proper sprint plan** — Break the roadmap into 3-4 sprints. Sprint 1 should be the highest-impact, lowest-risk items.

2. **Move finance data to PostgreSQL** — This is a ticking time bomb. Create a `finance_data` table, migrate the localStorage approach to API-backed CRUD. This unblocks multi-user finance editing and backup.

3. **Replace Orbitron** — Single CSS change, massive visual impact. Change `--font-display` to Inter 700 or IBM Plex Sans 600.

4. **Add incomplete markers (⚠) on tasks** — Quick win. In `renderTaskRow()`, check if status !== 'Backlog' and fields are missing, add a red triangle.

5. **Time tracking** — This is the biggest feature. Research QuickBooks Time API first, then design the schema (time_entries table), then build the UI.

---

## Server Process

Server was running at PID 2764 on port 8888. May need restart if it dies. Start with:
```
cd D:/OneDrive/Claude_code/NBIAI_TEAM/dashboard-server && node server.js
```

Access at: `http://localhost:8888/nbi_project_dashboard.html`

Login: gpryer / (whatever password Glen set)
