# Session Handoff — 2026-04-04b — Feature Blitz

## What Happened This Session

Picked up from the previous session's approved roadmap and built every remaining item Glen called out as incomplete or missing.

### Completed Work

1. **⚠ Incomplete markers on kanban board cards** — Red triangle warning badge with tooltip showing missing fields (hours, priority, assignee, due date). Shows on every board card where status is not Done/Cancelled/Not started and fields are missing.

2. **⚠ Incomplete marker on detail panel overlay** — Red banner at top of detail panel listing exactly which fields need filling in.

3. **Gantt/Timeline view** — Full Gantt chart as a 4th sub-view tab on Tasks page:
   - Grouped by client with collapsible headers
   - Colour-coded bars (blue=in progress, green=done, grey=not started, purple=blocked)
   - Red today line
   - Month/day headers with weekend shading
   - 4 zoom levels (Week, Month, Day, Detail)
   - Click to select → shows white dot handles on each end
   - Drag to move/resize → snaps to day grid, updates startDate/endDate
   - Draggable column divider to expand task name column
   - No scroll jump on click/drag (direct DOM manipulation, no renderAll during interaction)

4. **Start Date + End Date fields** — Full schema change:
   - PostgreSQL columns: `start_date TEXT`, `end_date TEXT` on tasks table
   - All API endpoints updated (POST, PATCH, sync/changes, sync/load)
   - Frontend task model includes startDate/endDate
   - Both detail panels have Start Date, End Date, and Due Date fields
   - Existing due dates auto-migrated to endDate
   - Gantt uses startDate/endDate for bar positioning

5. **Pencil icon on finance cells** — CSS `::after` pseudo-element shows ✎ on hover for all `.fin-editable` cells.

6. **Status Over Time chart** — Stacked bar chart on Dashboard showing task status distribution by creation week.

7. **Project Breakdown chart** — Horizontal stacked bars showing status distribution per project/epic on Dashboard.

8. **Keyboard shortcuts 1-4** — Press 1-4 when a task detail is open: 1=Not started, 2=In progress, 3=In Review, 4=Done.

9. **Persistent view selection** — Tree/Board/Timeline/Calendar selection saved to `localStorage('nbi_task_subview')`, persists across navigation.

10. **Finance data to PostgreSQL** — New `finance_data` table (id, data JSONB, updated_by, updated_at). API: `GET /api/finance`, `PUT /api/finance`. Frontend: `getFinanceData()` reads from memory/localStorage, `saveFinanceData()` debounce-saves to PostgreSQL. `loadFinanceFromDB()` called on startup to pull from DB.

11. **Dashboard KPIs: revenue + project metrics** — Replaced task-count-only KPIs with:
    - Revenue/Month (from finance data, % of target)
    - Utilisation % (hours spent / estimated)
    - In Progress count (with total tasks subtitle)
    - Overdue count (with "due this week" subtitle)
    - Blocked count
    - Done count (with % complete)

12. **Task comments / activity feed** — New `task_comments` table (id, task_id, author, text, created_at). API: `GET/POST/DELETE /api/tasks/:id/comments`. UI: Comments section in detail overlay with threaded display, post input, timestamps, author names. Loaded asynchronously when detail panel opens.

13. **Calendar view** — 5th sub-view tab on Tasks page. Full month calendar grid showing tasks on their due/start/end dates. Client prefix badges on each task pill. Month navigation (prev/next/today). Colour-coded by status. Overdue styling. Click task to open detail overlay.

14. **Database backup/restore** — API: `GET /api/backup` (exports all tables as JSON), `POST /api/restore` (imports backup). Settings page: "Full Backup" button (downloads JSON), "Restore Backup" button (file picker, confirmation dialog, auto-reload).

15. **Task dependencies / sequencing** — New `dependencies TEXT[]` column on tasks. API: included in PATCH fields and both sync mappings. UI: Dependencies section in detail overlay showing linked tasks with done/pending icons, add dropdown, remove buttons. Unfinished dependency count shown as warning.

16. **Auto-generated status reports by client** — `generateClientReport(clientName)` function creates a plain-text status report with summary stats, blocked items, overdue, due this week, active work. Copies to clipboard and opens in new window. "Report" button on each client in Dashboard's client summary.

17. **Resource planning / capacity page** — Capacity Planning table added to People page showing committed hours per person per week for next 4 weeks vs 40hr/week baseline. Colour-coded: red (>100%), amber (>80%), blue (>50%), grey (<50%).

18. **Mobile responsiveness** — Enhanced `@media (max-width: 768px)` rules: responsive grid layouts, full-width filter bar, smaller Gantt labels, scrollable board lanes, hidden sidebar with hamburger toggle, responsive tables.

19. **Client prefix badges** — Every task shows a coloured 2-3 letter badge (CH, LH, GO, SU, PL, NBI). Shows on board cards (top), tree view (before title), Gantt (task labels). Auto-generates prefixes for new clients.

20. **Client editable on all tasks** — Client dropdown is now first property in both detail panels. Editable on ALL tasks (not just root). Child tasks can override inherited client. Confirmation dialog on client change.

21. **Filter bar fix** — Search input `max-width: 320px` so sub-view toggle buttons (By Project/Board/Timeline/Calendar) are always visible.

---

## Current Database Schema

### New Tables
- `finance_data` (id SERIAL, data JSONB, updated_by TEXT, updated_at TIMESTAMP)
- `task_comments` (id SERIAL, task_id UUID FK, author TEXT, text TEXT, created_at TIMESTAMP)

### Modified Tables
- `tasks`: added `start_date TEXT`, `end_date TEXT`, `dependencies TEXT[]`

---

## New API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/finance | Get latest finance data |
| PUT | /api/finance | Save finance data (versioned) |
| GET | /api/tasks/:id/comments | List comments for task |
| POST | /api/tasks/:id/comments | Add comment |
| DELETE | /api/tasks/:id/comments/:cid | Delete comment |
| GET | /api/backup | Full database backup (JSON) |
| POST | /api/restore | Restore from backup |

---

## ADDITIONAL FEATURES BUILT (continued session)

21. **File attachments on tasks** — `task_attachments` table + `uploads/` directory. API: GET/POST/DELETE on `/api/tasks/:id/attachments`, GET `/api/attachments/:filename`. Multer for file handling (25MB limit). UI in detail overlay: file list with download links, upload button.

22. **Recurring task templates** — `task_templates` table (id, name, template JSONB, recurrence, last_created_at). API: CRUD + `/api/templates/:id/create` (instantiates template tree). UI in Settings: save root task as template, view/instantiate/delete templates.

23. **In-app notifications** — `notifications` table (id, username, type, title, message, link, is_read). API: GET `/api/notifications`, POST `/api/notifications/read`. Bell icon in header with unread badge. Dropdown panel with notification list, mark all read. Polls every 30 seconds.

24. **Role-based dashboard views** — MD/PM/IC toggle on Dashboard page. MD sees everything (revenue, all charts). PM sees project progress, status, workload. IC sees personal task list with overdue warnings, due dates, status badges.

25. **Time tracking with timer** — `time_entries` table (id, task_id, user_name, description, hours, date). API: GET/POST time entries per task, DELETE, GET `/api/time-entries/summary`. Timer button in detail panel (start/stop, auto-logs rounded to 15min). Quick manual log entry with hours + description. Time entry history list. Auto-updates task hours_spent from SUM of entries.

26. **Contract upload → auto-extract tasks** — API: POST `/api/contract/extract` (multer upload, pdf-parse for PDFs). Extracts tasks, milestones, deliverables using regex patterns. UI in Settings: file upload, extracted items list with checkboxes and type badges, import selected with client assignment.

## What's Left from the Original Roadmap

**Nothing.** Every approved feature and UI change has been built. The only remaining item from the original list is QuickBooks Time API integration (the time tracking foundation is built, but the QuickBooks sync needs their API credentials and configuration which requires Glen's QuickBooks account access).

---

## Server Process

Server running on port 8888, started from:
```
cd D:/OneDrive/Claude_code/NBIAI_TEAM/dashboard-server && node server.js
```

Access at: `http://localhost:8888/nbi_project_dashboard.html`
