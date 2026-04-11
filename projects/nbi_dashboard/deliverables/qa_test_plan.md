# NBI Project Dashboard -- QA Test Plan

**Version:** 1.0
**Date:** 2026-04-06
**Tester:** Claude (automated + manual verification)
**Server:** localhost:8888
**Login:** glen / nbi2026

---

## 1. Authentication & Session Management

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1.1 | Login with valid credentials | POST /api/auth/login with glen/nbi2026 | 200, returns token + user object | |
| 1.2 | Login with wrong password | POST /api/auth/login with glen/wrong | 401, error message, no token | |
| 1.3 | Login with unknown user | POST /api/auth/login with nobody/pass | 401, generic error (no enumeration) | |
| 1.4 | Token persists in localStorage | Login, refresh page | Auto-login, no login screen | |
| 1.5 | Logout clears session | Click logout button | Redirects to login, token cleared | |
| 1.6 | Expired token rejected | Use token older than 7 days | 401, forced re-login | |
| 1.7 | Brute-force protection | 5 failed logins | "Forgot password" link appears | |
| 1.8 | Login by email | Login with email instead of username | Succeeds if email matches | |

## 2. Navigation & Tab System

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2.1 | All 8 tabs render | Click each tab in order | Dashboard, Workload, Tasks, People, Leads, Expenses, Finances, Settings all load | |
| 2.2 | Tab order correct | Check visual order left to right | Dashboard, Workload, Tasks, People, Leads, Expenses, Finances, Settings | |
| 2.3 | Tab naming correct | Check tab labels | "Dashboard" (was Report), "Workload" (was Dashboard) | |
| 2.4 | Sidebar matches tab order | Open sidebar | Same order as tabs | |
| 2.5 | Hash routing works | Navigate to #tasks, #report, #dashboard | Correct views load | |
| 2.6 | Old hash redirects | Navigate to #incomplete, #changelog | Redirects to #tasks and #settings | |
| 2.7 | Keyboard shortcuts | Press g+d, g+t, g+r, g+p, g+l, g+e, g+f, g+s | Navigates to correct views | |
| 2.8 | My Tasks shortcut | Press g+m | Filters Tasks to current user | |
| 2.9 | Sidebar toggle | Press [ or click toggle | Sidebar opens/closes | |
| 2.10 | Active tab highlighting | Click each tab | Active tab visually highlighted | |

## 3. Dashboard View (formerly Report)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 3.1 | Portfolio table renders | Navigate to Dashboard | Sortable table with columns: Project, Client, Tasks, Done, Active, Blocked, %, Estimate, Actual | |
| 3.2 | Column sorting | Click each column header | Sorts ascending then descending, arrow indicator shows | |
| 3.3 | Client filter dropdown | Click Client column filter | Dropdown shows all clients, filtering works | |
| 3.4 | Progress bars | Check % column | Mini progress bars render alongside numbers | |
| 3.5 | Blocked highlighting | Check Blocked column | Non-zero counts in red+bold | |
| 3.6 | Over-estimate highlighting | Check Actual column | Red when actual > estimate | |
| 3.7 | Row click-through | Click a project row | Navigates to Tasks tree view filtered to that project | |
| 3.8 | Blocked list renders | Check above portfolio table | Blocked items listed separately | |
| 3.9 | At Risk list renders | Check above portfolio table | At Risk items listed separately, side-by-side with Blocked | |

## 4. Workload View (formerly Dashboard)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 4.1 | Date header shows | Navigate to Workload | Current date shown prominently | |
| 4.2 | 7 KPI metrics display | Check metrics strip | Active, Overdue, Due This Week, Blocked, At Risk, % Complete, Total | |
| 4.3 | KPIs are clickable | Click each KPI | Scrolls to relevant section or filters Tasks | |
| 4.4 | Trend arrows on filtered view | Select a client filter | Arrows show with change from last 7 days | |
| 4.5 | Overdue section | Check Overdue | Shows ALL items (no truncation), grouped by client, severity bands visible | |
| 4.6 | Severity bands | Check items 14+ days overdue | Deep red background + bold vs lighter for recent items | |
| 4.7 | This Week section | Check This Week | Shows both open and completed items | |
| 4.8 | Blocked section | Check Blocked | Separate section with purple accent, multi-column grid with divider lines | |
| 4.9 | At Risk section | Check At Risk | Separate section with amber accent, multi-column grid with divider lines, one-line reasons | |
| 4.10 | MD/PM/IC toggle removed | Check Workload view | No toggle present | |
| 4.11 | Standup -- urgency sort | Check standup section | People with blocked/overdue items first | |
| 4.12 | Standup -- collapsed default | Check standup | All people start collapsed | |
| 4.13 | Standup -- active work only | Expand a person | Only In Progress, In Review, Planning, Drafted + Done this week | |
| 4.14 | Standup -- done items styling | Check completed tasks | Checkmark + strikethrough | |
| 4.15 | Standup -- available collapse | Check Available section | Single line: "Available: Name1, Name2" | |
| 4.16 | Layout order | Check section order | Overdue + This Week top row, Blocked + At Risk below | |

## 5. Tasks View

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 5.1 | Tree view renders | Navigate to Tasks, By Project | Project tree with expandable nodes | |
| 5.2 | Board view -- leaf only | Switch to Board sub-view | Only leaf/actionable tasks as cards, no parents | |
| 5.3 | Calendar view | Switch to Calendar | Tasks on calendar dates, +N more expands on click | |
| 5.4 | Gantt view | Switch to Timeline | Gantt chart with zoom controls (Week/Month/Day/Detail) | |
| 5.5 | Search -- Enter to search | Type in search box | No live search on keystroke, triggers on Enter | |
| 5.6 | Assignee filter dropdown | Click All People dropdown | Shows all 8 active team members, filters on selection | |
| 5.7 | Status filter | Change status dropdown | Tasks filtered correctly | |
| 5.8 | Client filter | Change client dropdown | Tasks filtered correctly | |
| 5.9 | Incomplete toggle | Click Incomplete button | Shows tasks missing required fields | |
| 5.10 | Breadcrumb/filter bar | Apply any filter | Shows active filters with clear buttons | |
| 5.11 | Clear all filters | Click "Clear all" | All filters reset | |
| 5.12 | Quick-add bar | Type title, press Enter | Task created immediately with selected client | |
| 5.13 | Right panel -- filter-aware | Filter to Glen Pryer | Panel title says "Glen Pryer's Tasks" with Glen's stats | |
| 5.14 | New task button | Click "+ Task" | Full task creation panel opens | |
| 5.15 | Task detail overlay | Click a task | Detail panel opens with all fields | |
| 5.16 | Task title editable | Click title in detail panel | Input editable, saves on blur/Enter | |
| 5.17 | Description auto-expand | Open task with long description | Textarea auto-sizes to fit content | |
| 5.18 | Assignee dropdown | Check assignee field in detail | Multi-select dropdown with chips, not free text | |

## 6. People View

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6.1 | People list renders | Navigate to People | All active users shown with roles | |
| 6.2 | Person click | Click a person's name | Shows their task details | |
| 6.3 | Hours columns | Check hours display | Shows zero values (not hidden) | |
| 6.4 | Bryan inactive | Check people list | Bryan Rasmussen not shown in active list | |

## 7. Leads View

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 7.1 | Kanban board renders | Navigate to Leads | Pipeline stages visible, even empty ones | |
| 7.2 | Table view | Switch to Table | Lead table with all columns | |
| 7.3 | Pipeline view | Switch to Pipeline | Pipeline visualisation | |
| 7.4 | By-client view | Switch to By Client | Leads grouped by client | |
| 7.5 | Client ordering | Check any view | CH, LH, SU, GO first, then alphabetical | |
| 7.6 | New lead form | Click "+ Lead" | Form opens with all required fields | |
| 7.7 | Lead detail panel | Click a lead | Detail panel with full lead info | |
| 7.8 | Quick-add | Use quick-add | Lead created with minimal fields | |

## 8. Expenses View

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 8.1 | Expense list renders | Navigate to Expenses | Expense reports listed | |
| 8.2 | New expense form | Click "+ Expense" | Form with amount, category, date, receipt upload | |
| 8.3 | Receipt upload | Upload a receipt file | File attached, preview/download works | |
| 8.4 | Approval workflow | Check status indicators | Pending/Approved/Rejected states visible | |
| 8.5 | Category dropdown | Open category dropdown | Options populated from settings | |

## 9. Finances View

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 9.1 | Finance view renders | Navigate to Finances | All 8 KPI cards shown | |
| 9.2 | KPI cards | Check cards | Annual Revenue, Annual Payroll, Gross Margin, Op. Margin, Net Profit, Monthly Burn, Revenue/Head, Utilisation | |
| 9.3 | P&L display | Check P&L section | Income statement breakdown visible | |
| 9.4 | Revenue/Utilisation KPIs | Check new KPIs | Op. Margin and Utilisation show correct values | |

## 10. Settings View

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 10.1 | Settings renders | Navigate to Settings | All settings sections visible | |
| 10.2 | Theme picker | Change theme | Theme applies immediately across all views | |
| 10.3 | Data section | Check Data section | Import from Downloads button present | |
| 10.4 | Changelog section | Check Changelog | Changelog entries visible (moved from old tab) | |
| 10.5 | User management | Check user section | Can manage users (admin only) | |
| 10.6 | Password change | Change password | Old password required, new password saved | |

## 11. Downloads Import Wizard

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 11.1 | Scan starts | Click "Import from Downloads" | File list loads with folder grouping | |
| 11.2 | Format badges | Check file list | Coloured badges for detected formats | |
| 11.3 | File selection | Click a file | Moves to Step 2 preview | |
| 11.4 | Sheet selector | Select multi-sheet Excel | Sheet dropdown appears | |
| 11.5 | Column mapping | Check preview table | Columns mapped per format | |
| 11.6 | Import modes | Check import options | Append/Replace available | |
| 11.7 | Client picker | Check import form | Client dropdown present | |

## 12. Detail Panels & Forms

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 12.1 | Overlay panel opens | Click task from any view | Panel slides in from right | |
| 12.2 | Inline panel opens | Click task in tree view | Panel opens inline below task | |
| 12.3 | Title field editable | Click title in panel | Input becomes editable | |
| 12.4 | Save on blur | Edit title, click away | Title saves automatically | |
| 12.5 | Assignee chips | Check assignee field | Current assignees as chips with x | |
| 12.6 | Add assignee | Click "+ Add assignee" | Dropdown with all team members | |
| 12.7 | Remove assignee | Click x on chip | Assignee removed | |
| 12.8 | Description auto-resize | Type in description | Box grows with content | |
| 12.9 | All dropdowns work | Open every dropdown in panel | Status, priority, health, client all have correct options | |
| 12.10 | Dates work | Set start/due dates | Dates save correctly | |
| 12.11 | Notes/activity | Add a note | Note appears in activity feed | |
| 12.12 | File attachments | Upload a file | File saved, downloadable | |

## 13. Cross-Cutting Concerns

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 13.1 | Client ordering everywhere | Check sidebar, Dashboard portfolio, Gantt, leads, dropdowns | CH, LH, SU, GO first, then alphabetical | |
| 13.2 | Print button | Click print in any view | Prints current view, not forced to Report | |
| 13.3 | Z-index -- header clickable | Open detail panel | Header and tabs remain clickable above panel | |
| 13.4 | Escape closes panels | Press Escape with panel open | Panel closes | |
| 13.5 | XSS prevention | Add task with title containing <script> | HTML escaped, no script execution | |
| 13.6 | 7 themes | Switch between all 7 themes | Each applies correctly, no visual breakage | |
| 13.7 | Sync polling | Wait 10 seconds | Data syncs without manual refresh | |
| 13.8 | Undo (Ctrl+Z) | Delete a task, Ctrl+Z | Task restored | |

## 14. Responsive / Mobile

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 14.1 | Desktop layout | 1440px width | Full layout, sidebar visible | |
| 14.2 | Tablet layout | 768px width | Sidebar collapsed, main content fills | |
| 14.3 | Mobile layout | 375px width | Single column, touch-friendly controls | |
| 14.4 | Tab bar overflow | Mobile width | Tabs scrollable or hamburger menu | |
| 14.5 | Detail panel mobile | Open task on mobile | Panel takes full width | |
| 14.6 | Leads kanban mobile | Leads view on mobile | Swipeable columns | |

## 15. API Endpoints (Spot Checks)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 15.1 | GET /api/health | curl | { status: ok, db: connected } | |
| 15.2 | GET /api/tasks | With auth token | Returns task array | |
| 15.3 | POST /api/tasks | Create task | Returns created task with ID | |
| 15.4 | PATCH /api/tasks/:id | Update task | Returns updated task | |
| 15.5 | GET /api/clients | With auth token | Returns clients, correct order | |
| 15.6 | GET /api/users | With auth token | Returns active users | |
| 15.7 | Unauthenticated request | No token | 401 Unauthorized | |

## Regression Checklist (from restructuring)

- [ ] Old Dashboard content now lives in Workload view
- [ ] Old Report content now lives in Dashboard view
- [ ] No orphaned event listeners from removed tabs
- [ ] No references to old tab names in JS
- [ ] Sidebar client list still works
- [ ] Filter persistence across tab switches
- [ ] Detail panel opens from every view that shows tasks
- [ ] All keyboard shortcuts map to correct views

---

**Total test cases: 118**
**Pass criteria: Zero critical/high bugs, all core flows working**
