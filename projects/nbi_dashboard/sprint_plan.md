# NBI Dashboard — Sprint Plan

## Sprint 1: Visual Foundation + Quick Wins (This Session)
**Goal:** Make the tool look and feel professional. Ship the fast stuff that transforms daily UX.

1. Replace Orbitron with Inter for `--font-display`
2. Add ⚠ incomplete markers on non-Backlog tasks (row + detail panel)
3. Kill donut chart, replace with coloured text health summary
4. Collapsible sidebar (icon-only mode with toggle)
5. Keyboard shortcuts (N new task, / search, 1-4 status, Esc close)
6. Persistent tree/board view selection across navigation
7. 40hr/week baseline on People workload bars
8. Edit affordance on Finances (pencil icon on hover)
9. Empty states on all pages (Dashboard, Tasks, Kanban, People, Changelog)
10. Semantic colour audit — ensure green/red/amber only used for status

## Sprint 2: Data Integrity + Core Missing Features
**Goal:** Make the data trustworthy and add the features that make this a daily driver.

1. Move finance data from localStorage to PostgreSQL
2. Task comments / activity feed with timestamps + author
3. Overdue visibility — dashboard KPI, red treatment on overdue tasks, overdue count
4. Dashboard KPIs rewrite — revenue vs target, utilisation %, overdue, deliverables due this week
5. Status-over-time trend chart (replace redundant bar chart)
6. Project breakdown chart
7. In-app notifications (bell icon with badge count)
8. File attachments on tasks (upload to filesystem, link to task)
9. Full database backup/restore (pg_dump wrapper endpoint)

## Sprint 3: Planning + Scheduling Features
**Goal:** Add the scheduling, capacity, and timeline tools.

1. Calendar view of deadlines (month/week view showing due dates)
2. Task dependencies / sequencing (finish-to-start, visual indicators)
3. Gantt/timeline view (horizontal bars on date axis)
4. Resource planning / capacity page (committed hrs vs 40hr baseline, per person, per week)
5. Recurring task templates (clone story with standard tasks)
6. Role-based dashboard views (MD, PM, IC)

## Sprint 4: Integrations + Advanced
**Goal:** External system integration and power features.

1. Time tracking with per-task timer + manual entry + weekly timesheet
2. QuickBooks Time integration (API/MCP auto-import)
3. Auto-aggregate hours per task → hours by client
4. Client engagement notes on company profile page
5. Auto-generated status reports by client (PDF/HTML export)
6. Contract upload → auto-extract tasks and milestones
7. Mobile responsiveness (hamburger nav, stacked cards, touch Kanban)
