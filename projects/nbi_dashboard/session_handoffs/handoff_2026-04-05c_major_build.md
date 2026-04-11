# Handoff — 2026-04-05c — Major Build Session

## Session Summary
Massive session covering UX fixes, theme system, dashboard layout overhaul, mobile fixes, infrastructure hardening, 6 new features, codebase cleanup, and tactical dashboard with standup view.

## What's Running
- **Server:** `node dashboard-server/server.js` on port 8888
- **DB:** PostgreSQL at `postgresql://nbiai:***@localhost:5432/nbi_dashboard` (credentials now in `.env`)
- **Cloudflare Tunnel:** `https://late-alfred-authority-earth.trycloudflare.com` (temporary, regenerates on restart)
- **Files:** `dashboard-server/server.js` (~2,500 lines), `nbi_project_dashboard.html` (~8,800 lines)
- **Auth:** Token-based, default password `nbi2026`, Glen's username `glen`

## What Was Built This Session

### UX Fixes (all 6 from handoff_2026-04-05b, skipping 6 and 8 per Glen)
1. **Fix 2: £NaN** — `formatROM()` now uses `parseFloat` + `isNaN` checks. `fmtMoney()` returns '0' for NaN.
2. **Fix 5: Duplicate dropdown** — Employee filter select cleared with `innerHTML` before appending users.
3. **Fix 4: Changelog loading** — Server endpoint wrapped in try/catch. Client-side has 8-second AbortController timeout.
4. **Fix 1: Missing tabs** — Added `leads` and `expenses` to `renderTabs()` array with permission checks.
5. **Fix 7: Filter breadcrumbs** — Filter chip pills with close buttons when client/status/health filter active. CSS class `.filter-chip`.
6. **Fix 3: Board lane width** — Changed from `flex: 1 0 200px; max-width: 280px` to `flex: 1; min-width: 160px`.

### Theme System (7 themes)
- Replaced toggle button with dropdown picker (`.theme-picker` class)
- Themes: Dark, Light, Midnight, Nord, Solarized, Dracula, Emerald
- Each has full CSS variable set + optional font override (Solarized=Georgia, Nord=system-ui)
- Persists to localStorage key `nbi_dashboard_theme`

### Dashboard Layout Overhaul
- Health State + Status Over Time + Status Breakdown in left quad, Project Breakdown on right
- Swapped Status Breakdown (full-width bottom) and Status Over Time (top-right) for better bar usage
- Content scales to fill cards (flex-grow on chart bodies, `justify-content: space-around`)
- `align-items: start` on row so no blank space at bottom
- Text sizes bumped across dashboard: chart titles 0.7→0.8rem, KPI labels 0.7→0.78rem, bar labels 0.75→0.88rem, health dots 10→14px with 1.3rem numbers

### Tactical/Strategic Dashboard Toggle
- **Strategic view** = existing charts/trends dashboard (renamed `renderStrategicDashboard()`)
- **Tactical view** = new standup-focused view (`renderTacticalDashboard()`)
  - Compact metric strip (Active, Overdue, Due This Week, Blocked, Done, Total)
  - Left panel: Overdue tasks (with assignee + days late), Blocked/At Risk, Due This Week
  - Right panel: Due This Week details
  - **Standup section**: All active NBI team members listed, expandable per person
    - Grouped by client within each person
    - Shows task status badges, due dates, overdue highlighting
    - People with no tasks show as "Available"
    - Non-NBI assignees (client employees) labelled on tasks, not as headings
    - Pulls from `/api/users` filtered by `is_active = true`
- Toggle: `_dashboardMode` = 'tactical' | 'strategic', defaults to tactical
- MD/PM/IC role toggle preserved alongside

### Mobile Fixes
- `100vh` → `100dvh` across body, shell, panels, login screen (fixes iOS URL bar overlap)
- `overflow-x: hidden` on `.main__content` (prevents horizontal page wobble)
- Leads kanban: native CSS `scroll-snap-type: x mandatory` on track div (replaced broken JS swipe)
- Leads table: renders as swipeable card list on mobile (`renderLeadsCardList` with stage grouping)
- `initLaneCounter()` shows current stage name via scroll listener
- Drag-and-drop disabled on mobile kanban (was fighting touch events)
- Dashboard charts row stacks to single column at 768px

### Infrastructure
- **dotenv:** `.env` file with DATABASE_URL, ADMIN_DATABASE_URL, SMTP vars, APP_URL, PORT. All 6 source files updated. Hardcoded credentials removed.
- **Daily backup:** `backup.js` runs pg_dump at 2am via node-cron. 30-day retention. JSON fallback if pg_dump unavailable. Backups in `dashboard-server/backups/`.
- **Compression:** `compression` middleware enabled (threshold 1KB).
- **Auth cache:** 5-minute token cache (`_tokenCache` Map) eliminates DB query per request. Invalidated on logout.
- **Config cache:** Leads config cached 5 minutes (`getCached()` helper). Invalidated on all 8 mutation endpoints.
- **Pool tuning:** `min: 2, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000`.
- **18 database indexes:** sessions, users, tasks, leads, expenses, audit_log, notifications, contacts, time entries, attachments.
- **Multi-user conflict detection:** Server compares `_serverUpdatedAt` from client against DB `updated_at`. Rejects stale writes silently (client picks up newer version on next poll).
- **Interval cleanup:** `_syncPollInterval`, `_leadsReminderInterval`, `_notifPollInterval` all cleared on logout.

### New Features

#### Task Dependencies
- **DB:** `dependencies UUID[]` column + GIN index on tasks table
- **Server:** Added to sync/changes UPDATE (now $15 params), sync/changes INSERT ($17), POST /api/tasks ($16). PATCH already had it.
- **Frontend:** Soft-block confirm dialog when setting status to "In Progress" with unfinished blockers. Lists blocker titles + statuses.
- **Gantt arrows:** SVG overlay (`#ganttArrowsSvg`). Right-angle connectors from blocker end to dependent start. Done = solid green (0.35 opacity), Pending = dashed amber. `drawGanttArrows()` called via `requestAnimationFrame` after render.
- **CSS:** `.gantt__arrows`, `.gantt__arrow--done`, `.gantt__arrow--pending`

#### Universal File Uploads (200MB)
- **DB:** `attachments` table (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by). Existing task_attachments migrated.
- **Server:** GET/POST `/api/attachments/entity/:type/:id`, GET `/api/attachments/download/:filename`, DELETE `/api/attachments/:id`. multer limit raised to 200MB.
- **Frontend:** `renderAttachmentsSection(entityType, entityId)` renders upload box + file list anywhere. XHR upload with progress. Wired into task detail (both inline and overlay) and project-level tasks.
- **CSS:** `.attachment-row`, `.attachment-row__icon`, `.attachment-row__name`, `.attachment-row__size`, `.attachment-row__delete`

#### Client Status Reports (PDF + HTML)
- **DB:** `client_reports` table (client_id, client_name, share_token, report_data JSONB, generated_by, expires_at). 90-day expiry.
- **Server:** 5 endpoints:
  - POST `/api/clients/:id/reports` — generate snapshot + share token
  - GET `/api/reports/:token` — public JSON (no auth, bypassed in requireAuth)
  - GET `/api/reports/:token/html` — public styled HTML page (NBI branded, dark theme, KPIs, status bar, projects table, blocked/overdue lists)
  - GET `/api/reports/:token/pdf` — PDF download via pdfkit (A4, cover page, data tables)
  - GET `/api/clients/:id/reports` — list past reports
- **Frontend:** "Generate Report" button in report view when client-filtered. Modal with Download PDF / Copy Share Link / Preview buttons. `generateClientReport()` function.

#### Resource Planning
- **DB:** `capacity_hours_per_week REAL` (default 40) and `resource_type_ids UUID[]` on users table.
- **Server:** 3 endpoints:
  - GET `/api/resource-planning/capacity?weeks=8` — per-user, per-week committed vs available hours
  - GET `/api/resource-planning/deal-readiness/:leadId` — checks if lead's required roles can be staffed
  - PATCH `/api/users/:id/skills` — admin: set capacity + resource type IDs
- **Frontend:** "Capacity" sub-view in People view (`_peopleSubView` = 'workload' | 'capacity'). Colour-coded heatmap table (green <60%, yellow 60-90%, orange 90-100%, red >100%). "Check Staffing" button in lead detail panel with green/red per role. `loadCapacityHeatmap()` and `checkDealReadiness()` functions.

#### Contract Import Wizard
- **Server:** Enhanced POST `/api/contract/extract` — retains uploaded file (previously deleted), returns `storedFilename` for attachment.
- **Frontend:** `openContractImport()` opens 3-step wizard modal:
  1. Upload file + select client + select parent project
  2. Preview extracted tasks in editable table (checkboxes, editable title/type/date, select all/deselect)
  3. Confirm → bulk create + optionally attach contract as project file
- Old `uploadContract()` / `importExtractedTasks()` functions removed. Settings page contract section updated to use wizard.

### Codebase Cleanup
- **Server commenting:** 270 lines of comments added (file header, section separators, JSDoc on ~80 endpoints, inline comments on non-obvious logic). Zero logic changes.
- **Frontend commenting:** File-level architecture comment, docstrings on all core functions (authFetch, renderAll, syncToAPI, save, load, markDirty, esc, formatROM, fmtMoney, safeColour, tree traversal helpers), state variables documented.
- **Dead CSS removed:** Stray `.btn--sm` override (dashed borders on all small buttons).
- **Inline styles extracted:** `chart-card--compact` class (5 occurrences), `.chart-bar-area` base styles.
- **Dead JS removed:** Old contract upload section (uploadContract, importExtractedTasks), duplicate `_extractedTasks` declaration.
- **Leads view toggle:** Extracted complex inline onclick to `switchLeadsView()` function.
- **Error handling:** `fetchFxRate()` caught, `requireAuth` refactored to async/await with auth bypass for reset + report endpoints.
- **User management:** `is_active` boolean added to users table. Jeff Day, Jessica Williams, Patrice set to inactive (excluded from standup but can still log in).

## Database Changes This Session
```sql
-- Task dependencies
ALTER TABLE tasks ADD COLUMN dependencies UUID[] DEFAULT '{}';
CREATE INDEX idx_tasks_dependencies ON tasks USING GIN(dependencies);

-- Universal attachments
CREATE TABLE attachments (id UUID PK, entity_type TEXT, entity_id UUID, filename, original_name, size_bytes BIGINT, mime_type, uploaded_by, created_at);
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id, created_at DESC);

-- Client reports
CREATE TABLE client_reports (id UUID PK, client_id UUID FK, client_name, share_token TEXT UNIQUE, report_data JSONB, generated_by, expires_at, created_at);
CREATE INDEX idx_client_reports_token ON client_reports(share_token);
CREATE INDEX idx_client_reports_client ON client_reports(client_id, created_at DESC);

-- Resource planning
ALTER TABLE users ADD COLUMN capacity_hours_per_week REAL DEFAULT 40;
ALTER TABLE users ADD COLUMN resource_type_ids UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
UPDATE users SET is_active = false WHERE display_name IN ('Jeff Day', 'Jessica Williams', 'Patrice');

-- 18 performance indexes (see migrations/add_indexes.sql)
```

## New Files
- `dashboard-server/.env` — real credentials (gitignored)
- `dashboard-server/.env.example` — template for new deployments
- `dashboard-server/backup.js` — daily pg_dump + JSON fallback + pruning
- `dashboard-server/migrations/add_indexes.sql` — 18 performance indexes

## New Dependencies (package.json)
- `dotenv` — environment variable loading
- `node-cron` — scheduled backup
- `pdfkit` — PDF report generation
- `compression` — gzip middleware

## Queued for Next Session
1. **Teams Excel import** — 65 Excel/CSV files in Downloads folder. Need to scan for Planner/Teams exports and build importer. Key files likely: `Glen_work_list*.csv`, `CH Project Plan*.xlsx`, `CH_Artifacts_Project_Plan*.xlsx`.
2. **Permanent Cloudflare tunnel** — requires Glen's Cloudflare account + domain setup
3. **SMTP configuration** — needs Glen's SMTP provider details for password reset emails
4. **QuickBooks Time integration** — blocked on Bryan's API token

## Glen's Decisions This Session
- D13: Fixes 6 and 8 from UX review — leave as-is
- D14: Theme system — 7 themes with dropdown picker
- D15: Dashboard layout — side-by-side charts, content scales to fill
- D16: Mobile leads — swipe between stages (not individual cards)
- D17: Dashboard needs Strategic + Tactical views
- D18: Tactical view = standup tool, work by person by client
- D19: Jeff, Jessica, Patrice set to inactive (hourly/as-needed)
- D20: Non-NBI assignees (Lorenza, Robin etc.) are client employees, not standup headings
- D21: File uploads: any type up to 200MB
- D22: Client reports: both PDF and shareable HTML
- D23: Resource planning: capacity overview + deal-readiness check
- D24: Task dependencies: soft-block (confirm dialog, not hard block)

## Key Code Patterns
- Frontend JS syntax validated via `new Function()` check (catches duplicate declarations that `node -c` misses)
- `renderDashboard()` dispatches to `renderStrategicDashboard()` or `renderTacticalDashboard()` based on `_dashboardMode`
- `renderStandupSection()` is async (fetches `/api/users` for active team list), writes to `#standupContainer` after initial render
- `renderAttachmentsSection()` returns HTML string + schedules async file load via setTimeout
- Auth bypass for public report URLs: `req.path.startsWith('/api/reports/')` in requireAuth
- `_serverUpdatedAt` field on tasks tracks last-known server timestamp for conflict detection
- Backup system: tries pg_dump first, falls back to JSON backup via Node pg queries
