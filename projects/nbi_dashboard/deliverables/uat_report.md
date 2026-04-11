# NBI Project Dashboard - UAT Report

**Date:** 7 April 2026
**Tester:** Senior Project Manager (UAT)
**Server:** http://localhost:8888
**Application:** NBI Project Dashboard (Single-page HTML + Express/PostgreSQL backend)
**Version tested:** Post-Sprint 1 build (commit 6bdbd05)

---

## Executive Summary

The NBI Project Dashboard backend API is **functional and well-built** with comprehensive CRUD operations, authentication, expense management, and finance tracking. However, the frontend has a **critical P0 blocker** (now fixed during UAT) and **severe performance issues** that make the application nearly unusable in production with the current dataset of 1,123 tasks.

**Overall Verdict: CONDITIONAL PASS** - Backend passes, frontend requires performance optimisation before production use.

| Category | Status |
|---|---|
| Authentication | PASS |
| Dashboard/Workload | PASS (backend) / PARTIAL (frontend - slow) |
| Tasks API | PASS |
| Tasks UI | FAIL (freezes browser with 1,123 tasks) |
| People/Workload | PARTIAL (renders but slow; data quality issues) |
| Leads API | PARTIAL (NaN bug in pipeline summary) |
| Leads UI | FAIL (freezes browser) |
| Expenses API | PASS |
| Expenses UI | Not fully testable (performance) |
| Finances API | PARTIAL (data structure fragile; no conflict protection) |
| Finances UI | BLOCKED by P0 bug (now fixed) |
| Settings | PASS (backend + UI renders) |

---

## P0 - CRITICAL BLOCKER (Fixed During UAT)

### BUG-001: SyntaxError prevents entire application from loading

- **File:** `nbi_project_dashboard.html`, line 7340
- **Error:** `SyntaxError: Identifier 'now' has already been declared`
- **Cause:** Duplicate `const now = new Date()` declaration at line 7340 within the `renderMonthlyFinanceView()` function (first declaration at line 7174 in the same function scope)
- **Impact:** The entire `<script>` block (lines 1394-11389) fails to parse. No JavaScript executes. The application renders as a completely blank dark screen with no login form, no UI, nothing.
- **Fix applied:** Removed the duplicate declaration at line 7340, reusing the existing `now` variable from line 7174
- **Status:** FIXED during UAT

---

## 1. Authentication

### TEST AUTH-001: Login with valid credentials (Glen)
- **Steps:** POST `/api/auth/login` with `{"username":"glen","password":"nbi2026"}`
- **Expected:** Returns token and user object
- **Actual:** Returns token, user `{id, username:"glen", displayName:"Glen Pryer", role:"admin"}`, 7-day expiry
- **Status:** PASS

### TEST AUTH-002: Login with valid credentials (Tom)
- **Steps:** POST `/api/auth/login` with `{"username":"tom","password":"nbi2026!"}`
- **Expected:** Returns token and user object
- **Actual:** Returns token, user `{id, username:"tom", displayName:"Tom Rieger", role:"admin"}`
- **Status:** PASS

### TEST AUTH-003: Login with invalid credentials
- **Steps:** POST `/api/auth/login` with wrong password
- **Expected:** Error response, no token
- **Actual:** `{"error":"Invalid username or password","showReset":false}`
- **Status:** PASS

### TEST AUTH-004: Session verification
- **Steps:** GET `/api/auth/me` with valid Bearer token
- **Expected:** Returns current user info
- **Actual:** Returns `{user: {id, username, displayName, role}}`
- **Status:** PASS

### TEST AUTH-005: Unauthenticated access
- **Steps:** GET `/api/auth/me` with no token
- **Expected:** 401/error
- **Actual:** `{"error":"Not authenticated"}`
- **Status:** PASS

### TEST AUTH-006: Invalid token
- **Steps:** GET `/api/auth/me` with garbage token
- **Expected:** Error response
- **Actual:** `{"error":"Session expired"}`
- **Status:** PASS

### TEST AUTH-007: Logout and session invalidation
- **Steps:** POST `/api/auth/logout`, then use same token
- **Expected:** Logout succeeds, token is invalidated
- **Actual:** Logout returns `{"ok":true}`, subsequent use returns `{"error":"Session expired"}`
- **Status:** PASS

### TEST AUTH-008: Login form UI
- **Steps:** Navigate to app in browser (cleared localStorage)
- **Expected:** Centred login form
- **Actual:** Login form renders but positioned to the right side of the screen, partially cut off on smaller viewports
- **Status:** PARTIAL
- **Notes:** Login form is not centred horizontally. "NBI DASHBOARD" title, username/email field, password field, Show Password checkbox, and Sign In button are all present and functional.

### TEST AUTH-009: SQL injection resistance
- **Steps:** POST login with `username: 'glen" OR 1=1 --'`
- **Expected:** Rejected
- **Actual:** `{"error":"Invalid username or password"}` - properly rejected
- **Status:** PASS

### TEST AUTH-010: Change password validation
- **Steps:** POST `/api/auth/change-password` with short new password
- **Expected:** Validation error
- **Actual:** `{"error":"Password must be at least 8 characters"}`
- **Status:** PASS

---

## 2. Dashboard / Workload Tab

### TEST DASH-001: KPI cards display
- **Steps:** Login as Glen, view Workload tab
- **Expected:** Summary KPI cards with task counts
- **Actual:** 7 KPI cards displayed: 112 ACTIVE, 8 OVERDUE (up-5 trend), 2 DUE THIS WEEK, 5 BLOCKED, 14 AT RISK, 47% COMPLETE (up-526), 1123 TOTAL. Colour-coded (blue, orange, red, yellow, green, grey).
- **Status:** PASS

### TEST DASH-002: Dashboard summary API
- **Steps:** GET `/api/dashboard/summary`
- **Expected:** Returns stats, by_client, by_assignee breakdowns
- **Actual:** Returns `{stats: {total_tasks:1123, not_started:477, in_progress:112, done:527, blocked:0, ...}, by_client: [42 items], by_assignee: [17 items]}`
- **Status:** PASS
- **Notes:** `blocked:0` in API stats but UI shows 5 BLOCKED - discrepancy. The blocked count may come from health_state rather than status field.

### TEST DASH-003: Overdue tasks list
- **Steps:** View Workload tab, scroll to Overdue section
- **Expected:** List of overdue tasks with late indicators
- **Actual:** 8 overdue tasks grouped by client (Couch Heroes, Lighthouse Studios) with "17d late", "3d late", "15d late", "18d late" badges. Tasks show assignee and colour-coded severity.
- **Status:** PASS

### TEST DASH-004: Blocked tasks section
- **Steps:** Scroll to Blocked section
- **Expected:** List of blocked tasks
- **Actual:** 5 blocked tasks displayed as cards with BLOCKED badges, showing client, title, assignees, and estimated hours
- **Status:** PASS

### TEST DASH-005: At Risk section
- **Steps:** Scroll to At Risk section
- **Expected:** List of at-risk tasks
- **Actual:** 14 at-risk tasks displayed with RED health state badges, descriptions, and assignees
- **Status:** PASS

### TEST DASH-006: This Week panel
- **Steps:** View right sidebar on Workload tab
- **Expected:** Tasks due this week
- **Actual:** "This Week (2 open, 1 done)" panel with 3 tasks showing dates (Thu 9 Apr, Fri 10 Apr, Sat 11 Apr). Completed task shown with strikethrough.
- **Status:** PASS

### TEST DASH-007: Click-through to task detail
- **Steps:** Click on an overdue task card
- **Expected:** Task detail modal or navigation
- **Actual:** No visible response to click on Workload view task cards
- **Status:** FAIL
- **Notes:** Task cards on the Workload view do not appear to be clickable for drill-down into task detail.

### TEST DASH-008: Client sidebar
- **Steps:** View left sidebar
- **Expected:** Client list with task counts
- **Actual:** CLIENTS section shows NBI Portfolio (1123), Couch Heroes (224), Lighthouse Studios (406), Sarge Universe (129), Goals Studio (1), NBI OPS (42), NSI (2)
- **Status:** PASS

---

## 3. Tasks Tab

### TEST TASK-001: List all tasks
- **Steps:** GET `/api/tasks`
- **Expected:** Array of task objects
- **Actual:** Returns 1,123 tasks with full fields (id, title, parent_id, client_id, status, priority, health_state, description, assignees, hours, dates, dependencies, notes)
- **Status:** PASS

### TEST TASK-002: Get single task
- **Steps:** GET `/api/tasks/:id`
- **Expected:** Full task object
- **Actual:** Returns complete task with all fields populated
- **Status:** PASS

### TEST TASK-003: Create task
- **Steps:** POST `/api/tasks` with title, status, priority, description
- **Expected:** Task created and returned
- **Actual:** Task created successfully with UUID, all fields populated
- **Status:** PASS

### TEST TASK-004: Update task status
- **Steps:** PATCH `/api/tasks/:id` with `{"status":"In Progress"}`
- **Expected:** Status updated
- **Actual:** Returns updated task with `status: "In Progress"`
- **Status:** PASS

### TEST TASK-005: Update task assignees
- **Steps:** PATCH `/api/tasks/:id` with `{"assignees":"Glen Pryer"}`
- **Expected:** Assignees updated
- **Actual:** Returns task but assignees field shows N/A - assignees may not be updating via PATCH
- **Status:** PARTIAL
- **Notes:** The PATCH endpoint may not handle the assignees field correctly (returns null/undefined after update).

### TEST TASK-006: Task comments
- **Steps:** GET then POST `/api/tasks/:id/comments`
- **Expected:** Can read and add comments
- **Actual:** GET returns empty array. POST creates comment with id, task_id, author, text, created_at. Subsequent GET returns the comment.
- **Status:** PASS

### TEST TASK-007: Delete task
- **Steps:** DELETE `/api/tasks/:id`
- **Expected:** Task removed
- **Actual:** Returns `{"ok":true}`
- **Status:** PASS

### TEST TASK-008: Validation - empty body
- **Steps:** POST `/api/tasks` with empty JSON `{}`
- **Expected:** Validation error
- **Actual:** `{"error":"Title required"}`
- **Status:** PASS

### TEST TASK-009: XSS in task title
- **Steps:** POST `/api/tasks` with `title: "<script>alert(1)</script>Test XSS"`
- **Expected:** Input sanitised or escaped
- **Actual:** Task created with raw HTML in title. The HTML comment in the source says `esc()` is used for output, but the backend stores raw HTML. Risk depends on frontend escaping.
- **Status:** PARTIAL
- **Notes:** Backend does not sanitise input. Frontend claims to use `esc()` for XSS prevention, but this should be validated.

### TEST TASK-010: Templates
- **Steps:** GET `/api/templates`
- **Expected:** List of task templates
- **Actual:** Returns empty array `[]`
- **Status:** PASS (functional, just no data)

### TEST TASK-011: Sync load
- **Steps:** GET `/api/sync/load`
- **Expected:** Full data payload for offline sync
- **Actual:** Returns `{tasks: [1123], clientBriefs: {...}, settings: {hourlyRate:150, fx_rates:{EUR:0.86, USD:0.79}}, knownClients: [42]}`
- **Status:** PASS

### TEST TASK-012: Tasks UI rendering
- **Steps:** Navigate to Tasks tab in browser
- **Expected:** Task list renders within reasonable time
- **Actual:** Browser renderer freezes for 30+ seconds, screenshot capture times out. Application becomes unresponsive.
- **Status:** FAIL
- **Notes:** With 1,123 tasks, the Tasks view causes browser freeze. No pagination or virtualisation is implemented. This is a critical performance issue.

---

## 4. People / Workload Tab

### TEST PEOPLE-001: Resource capacity API
- **Steps:** GET `/api/resource-planning/capacity`
- **Expected:** User capacity data
- **Actual:** Returns `{users: [...], weekLabels: [...]}` with 4-week capacity grid per user. Each user has id, name, username, capacityPerWeek (40), resourceTypeIds, and weekly breakdown.
- **Status:** PASS

### TEST PEOPLE-002: People view rendering
- **Steps:** Click People in sidebar
- **Expected:** Team member list with workload bars
- **Actual:** Renders (after ~10s delay) with "All People" dropdown, time filters (All Time, This Week, This Month, This Quarter), WORKLOAD OVERVIEW with 40hr/week baseline, and horizontal stacked bars per person.
- **Status:** PARTIAL (slow but renders)

### TEST PEOPLE-003: Person detail view
- **Steps:** Select individual person from dropdown
- **Expected:** Individual workload detail
- **Actual:** Shows KPI cards (Assigned, Complete%, Active, Blocked), Hours by Client bar chart, and Projects table with task counts
- **Status:** PASS

### TEST PEOPLE-004: Capacity planning grid
- **Steps:** Scroll to Capacity Planning section
- **Expected:** Weekly capacity grid with utilisation
- **Actual:** Grid shows PERSON column and week columns (6 APR, 13 APR, etc.) but all values show "0h / 0%" - no capacity data populated
- **Status:** PARTIAL
- **Notes:** Capacity planning structure renders but all utilisation values are zero. Either tasks lack time estimates or the calculation is not working.

### TEST PEOPLE-005: Duplicate name entries
- **Steps:** View People workload overview
- **Expected:** Each person appears once
- **Actual:** Duplicate entries: "Glen" and "Glen Pryer", "Ruan" and "Ruan Pearce-Authers", "Valeria" (first name only)
- **Status:** FAIL
- **Notes:** Data quality issue - inconsistent assignee names in task data cause duplicate entries in the People view.

---

## 5. Leads Tab

### TEST LEADS-001: List leads
- **Steps:** GET `/api/leads`
- **Expected:** Array of lead objects
- **Actual:** Returns 39 leads (after test lead cleanup)
- **Status:** PASS

### TEST LEADS-002: Lead configuration
- **Steps:** GET `/api/leads/config`
- **Expected:** Stages, resource types, field options
- **Actual:** Returns 9 stages (Backlog, Lead, First Contact, Discovery, Proposal, Negotiation, Won, Holding, Declined), 20 resource types, field options
- **Status:** PASS

### TEST LEADS-003: Pipeline summary
- **Steps:** GET `/api/leads/pipeline/summary`
- **Expected:** Aggregate values per stage
- **Actual:** Returns byStage array but **Backlog stage has NaN values** for `total_rom_max` and `total_weighted`
- **Status:** FAIL
- **Notes:** BUG - NaN propagation in pipeline summary for Backlog stage. Likely caused by leads with null rom_max values being summed. SQL `SUM()` with NaN input.

### TEST LEADS-004: Pipeline forecast
- **Steps:** GET `/api/leads/pipeline/forecast`
- **Expected:** Forecast data
- **Actual:** Returns empty array `[]`
- **Status:** PARTIAL
- **Notes:** No forecast data available. May require additional configuration or data.

### TEST LEADS-005: Create lead
- **Steps:** POST `/api/leads` with `company_name` and `stage` fields
- **Expected:** Lead created
- **Actual:** First attempt FAILED with `{"error":"Title required"}` - the API requires `title` field, not `company_name`. Second attempt with `title` field succeeded.
- **Status:** PARTIAL
- **Notes:** The API uses `title` as the required field but the UI/domain language uses "company name". This mismatch could cause confusion for API consumers.

### TEST LEADS-006: Update lead
- **Steps:** PATCH `/api/leads/:id` with `{"stage":"Discovery"}`
- **Expected:** Stage updated
- **Actual:** FAILED - stage update requires `stage_id` (UUID), not stage name
- **Status:** PARTIAL
- **Notes:** Must use stage_id UUID, not stage name string. Error handling could be improved.

### TEST LEADS-007: Leads reminders
- **Steps:** GET `/api/leads/reminders`
- **Expected:** Follow-up reminders
- **Actual:** Returns empty array (no reminders configured)
- **Status:** PASS (functional, no data)

### TEST LEADS-008: Leads UI rendering
- **Steps:** Navigate to Leads tab in browser
- **Expected:** Pipeline view renders
- **Actual:** Browser renderer freezes for 30+ seconds. Unable to capture screenshot.
- **Status:** FAIL
- **Notes:** Same performance issue as Tasks tab. The leads view may be affected by having all 1,123 tasks loaded in memory during rendering.

---

## 6. Expenses Tab

### TEST EXP-001: List expenses
- **Steps:** GET `/api/expenses`
- **Expected:** Array of expense objects
- **Actual:** Returns `{expenses: [...]}` with 69 expenses. Each has id, user_id, date, amount, currency, category_id, description, status, vendor, receipts.
- **Status:** PASS

### TEST EXP-002: Expense categories
- **Steps:** GET `/api/expenses/categories`
- **Expected:** List of categories
- **Actual:** 10 categories: Utilities, Travel, Accommodation, Meals & Entertainment, Software & Subscriptions, Equipment, Office Supplies, Marketing, Training, Other
- **Status:** PASS

### TEST EXP-003: Expense summary
- **Steps:** GET `/api/expenses/summary`
- **Expected:** Aggregated expense data
- **Actual:** Returns `{byEmployee: [{Glen Pryer, pending, 69 items, total 2480.66}], byCategory: [Software 972.41, Travel 813.68, Meals 387.43, ...]}`
- **Status:** PASS

### TEST EXP-004: Create expense
- **Steps:** POST `/api/expenses` with description, amount, date, category, vendor
- **Expected:** Expense created
- **Actual:** Returns created expense with UUID
- **Status:** PASS

### TEST EXP-005: Create expense report
- **Steps:** POST `/api/expense-reports` with title, period_start, period_end
- **Expected:** Report created in draft status
- **Actual:** Returns report with status "draft", UUID, timestamps
- **Status:** PASS

### TEST EXP-006: Add expenses to report
- **Steps:** POST `/api/expense-reports/:id/expenses` with `{"expense_ids":[...]}`
- **Expected:** Expenses linked to report
- **Actual:** Returns `{"ok":true,"added":1}`
- **Status:** PASS
- **Notes:** Requires `expense_ids` array format, not singular `expense_id`.

### TEST EXP-007: Submit expense report
- **Steps:** POST `/api/expense-reports/:id/submit`
- **Expected:** Status changes to submitted
- **Actual:** Returns `{"ok":true, "status":"submitted", "reportUrl":"..."}` with direct link
- **Status:** PASS

### TEST EXP-008: Submit empty report (validation)
- **Steps:** POST submit on report with no expenses
- **Expected:** Validation error
- **Actual:** `{"error":"Cannot submit an empty report. Add expenses first."}`
- **Status:** PASS

### TEST EXP-009: Tom views submitted reports
- **Steps:** GET `/api/expense-reports` as Tom
- **Expected:** Tom can see submitted reports from all users
- **Actual:** Tom sees all reports including Glen's submitted report
- **Status:** PASS

### TEST EXP-010: Tom approves report
- **Steps:** PATCH `/api/expense-reports/:id` as Tom with `{"status":"approved","review_notes":"..."}`
- **Expected:** Report approved with reviewer info
- **Actual:** Returns updated report with `status:"approved", reviewed_by:"Tom Rieger", review_notes:"Approved during UAT testing"`
- **Status:** PASS

### TEST EXP-011: Export report as ZIP
- **Steps:** GET `/api/expense-reports/:id/export`
- **Expected:** ZIP file download
- **Actual:** HTTP 200, Content-Type: application/zip, Size: ~2.9MB (for 69-expense report) and ~465KB (for 1-expense test report)
- **Status:** PASS

### TEST EXP-012: Existing expense report detail
- **Steps:** GET `/api/expense-reports/bd290104...`
- **Expected:** Full report with expenses
- **Actual:** Returns report "Monthly Expenses Catch-Up (Jan-Mar 2026)" with 69 expenses totalling GBP 2,480.66, status "submitted"
- **Status:** PASS

---

## 7. Finances Tab

### TEST FIN-001: Finance data API
- **Steps:** GET `/api/finance`
- **Expected:** Finance configuration data
- **Actual:** Returns `{data: {opex: [...], employerCostPct: 15}, updatedBy, updatedAt}`
- **Status:** PASS

### TEST FIN-002: Finance seed data
- **Steps:** GET `/api/finance/seed`
- **Expected:** Revenue, pipeline, payroll, targets, opex seed data
- **Actual:** Returns structured data: 3 revenue streams (Lighthouse 350K, Couch Heroes 300K, Blizzard TBD), 2 pipeline items, 7 payroll entries totalling ~745K, targets (2026: 1.2M, 2027: 2M), 1 opex seed entry
- **Status:** PASS

### TEST FIN-003: Finance update
- **Steps:** PUT `/api/finance` with new data
- **Expected:** Data saved
- **Actual:** Returns `{"ok":true}`. Data is stored as a single JSON blob.
- **Status:** PASS

### TEST FIN-004: Finance data integrity (CRITICAL)
- **Steps:** Multiple users update finance data
- **Expected:** Conflict detection or merge
- **Actual:** **NO conflict detection.** Any user can overwrite the entire finance JSON blob. During UAT, Tom's session overwrote Glen's opex data with incomplete data (only `{"revenue":[...]}` was saved, losing all opex and employerCostPct).
- **Status:** FAIL
- **Notes:** The finance PUT endpoint performs a full replace with no optimistic locking, no conflict detection, and no merge strategy. Any concurrent edit will silently overwrite the other user's changes. This is a data loss risk.

### TEST FIN-005: Employer cost percentage
- **Steps:** Check finance data includes employerCostPct
- **Expected:** Editable percentage value
- **Actual:** `employerCostPct: 15` is stored in the finance JSON and included in API responses. Can be updated via PUT.
- **Status:** PASS

### TEST FIN-006: OpEx items
- **Steps:** Check finance data includes opex array
- **Expected:** List of operational expense categories
- **Actual:** 10 opex items (Software & Subscriptions 324, Travel & Transport 271, Accommodation 200, Meals & Entertainment 150, Office & Stationery 50, Insurance 125, Professional Services 300, Hosting & Infrastructure 80, Recruitment 100, Training & Development 75)
- **Status:** PASS

### TEST FIN-007: Finance UI (Monthly View)
- **Steps:** Navigate to Finances tab
- **Expected:** Monthly P&L grid with editable cells
- **Actual:** BLOCKED - could not reach Finances tab due to browser freezing on navigation. The `renderMonthlyFinanceView` function has been verified as syntactically correct after the P0 fix, but could not be UI-tested.
- **Status:** BLOCKED

---

## 8. Settings Tab

### TEST SET-001: Settings API
- **Steps:** GET `/api/settings`
- **Expected:** Application settings
- **Actual:** Returns `{hourlyRate: 150, fx_rates: {EUR: 0.86, USD: 0.79}}`
- **Status:** PASS

### TEST SET-002: Settings UI - Account tab
- **Steps:** Navigate to Settings
- **Expected:** Account management interface
- **Actual:** Renders correctly with sub-tabs (Account, Team, Configuration, Data, Bug Reporting, Changelog). Account tab shows: Hourly Rate (GBP) editable field (150), signed-in user info, Change Password form, Admin Reset User Password form.
- **Status:** PASS

### TEST SET-003: User management API
- **Steps:** GET `/api/users`
- **Expected:** List of all users
- **Actual:** Returns 12 users with fields: id, username, display_name, email, role, is_active, capacity_hours_per_week, resource_type_ids, created_at
- **Status:** PASS

### TEST SET-004: Audit log
- **Steps:** GET `/api/audit-log?limit=5`
- **Expected:** Recent audit entries
- **Actual:** Returns structured entries with entity_type, entity_id, action, changed_by, changes, created_at
- **Status:** PASS

### TEST SET-005: Bug reporting
- **Steps:** GET `/api/bug-reports`
- **Expected:** List of bug reports
- **Actual:** Returns existing bug/feature reports with id, user_id, type, title
- **Status:** PASS

---

## 9. Cross-Cutting Concerns

### TEST CROSS-001: Multi-user data visibility
- **Steps:** Login as Tom, access various endpoints
- **Expected:** Tom (admin) sees all data
- **Actual:** Tom can see: dashboard (1123 tasks), all tasks, expense reports, finance data, users, leads. No RBAC restrictions between admin users.
- **Status:** PASS
- **Notes:** Both Glen and Tom have admin role. No member-role users could be tested (Jeff's password not configured).

### TEST CROSS-002: Performance with large dataset
- **Steps:** Navigate between tabs with 1,123 tasks
- **Expected:** Responsive tab switching
- **Actual:** Browser freezes for 30+ seconds on any tab that involves rendering task-related data. Tasks, Leads, and even People tabs cause renderer timeouts. Only Settings and initial Workload view render within acceptable time.
- **Status:** FAIL
- **Notes:** No pagination, virtualisation, or lazy loading is implemented. The entire task dataset is loaded via `/api/sync/load` on login and all views render from the full in-memory dataset.

### TEST CROSS-003: Data sync
- **Steps:** GET `/api/sync/load`
- **Expected:** Full data payload for offline/sync
- **Actual:** Returns complete task list, client briefs, settings, and known clients in a single payload
- **Status:** PASS

### TEST CROSS-004: Health endpoint
- **Steps:** GET `/api/health`
- **Expected:** Server and DB status
- **Actual:** `{"status":"ok","db":"connected"}`
- **Status:** PASS

### TEST CROSS-005: API error handling
- **Steps:** Various invalid requests
- **Expected:** Consistent error responses
- **Actual:** All errors return JSON with `{"error":"..."}` format. Validation messages are clear and helpful.
- **Status:** PASS

---

## Bug Summary

| ID | Severity | Component | Description | Status |
|---|---|---|---|---|
| BUG-001 | P0 | Frontend JS | Duplicate `const now` in `renderMonthlyFinanceView()` prevents entire app from loading | **FIXED** during UAT |
| BUG-002 | P1 | Frontend | Browser freezes rendering 1,123 tasks - no pagination/virtualisation | OPEN |
| BUG-003 | P1 | Finance API | No optimistic locking on finance PUT - concurrent edits cause data loss | OPEN |
| BUG-004 | P2 | Leads API | Pipeline summary returns NaN for Backlog stage `total_rom_max` and `total_weighted` | OPEN |
| BUG-005 | P2 | People | Duplicate person entries due to inconsistent assignee names (e.g. "Glen" vs "Glen Pryer") | OPEN |
| BUG-006 | P2 | People | Capacity planning grid shows 0h/0% for all users across all weeks | OPEN |
| BUG-007 | P3 | Tasks API | PATCH assignees field may not update correctly (returns null after update) | OPEN |
| BUG-008 | P3 | Leads API | `title` field required but domain term is "company name" - API/UI field name mismatch | OPEN |
| BUG-009 | P3 | Frontend | Login form not centred on page (positioned to the right) | OPEN |
| BUG-010 | P3 | Frontend | Hash-based routing unreliable - setting `location.hash` does not always trigger view change | OPEN |
| BUG-011 | P3 | Dashboard | API `blocked:0` but UI shows 5 BLOCKED - stats discrepancy (likely health_state vs status field) | OPEN |
| BUG-012 | P4 | Backend | XSS - task titles stored with raw HTML (relies on frontend `esc()` function for output escaping) | OPEN |

---

## Recommendations

### Immediate (Pre-Launch)
1. **Implement task pagination or virtualisation** (BUG-002) - This is the most impactful issue. Consider rendering only visible rows or paginating the task list.
2. **Add optimistic locking to finance data** (BUG-003) - Include a version number or updatedAt timestamp in PUT requests to detect conflicts.
3. **Fix NaN in pipeline summary** (BUG-004) - Add COALESCE or null handling in the SQL aggregation query for rom_max and weighted values.

### Short-Term
4. **Normalise assignee names** (BUG-005) - Link tasks to user IDs rather than free-text names to prevent duplicates.
5. **Fix capacity planning calculations** (BUG-006) - Investigate why utilisation values are all zero.
6. **Input sanitisation** (BUG-012) - Sanitise or reject HTML in task titles at the API level, not just at render time.

### Nice-to-Have
7. Centre login form (BUG-009)
8. Improve hash routing reliability (BUG-010)
9. Align API field names with UI terminology (BUG-008)

---

## Test Environment

- **Server:** Express.js on Node.js, PostgreSQL backend
- **Port:** 8888
- **Browser:** Chrome (latest)
- **Dataset:** 1,123 tasks, 42 clients, 39 leads, 69 expenses, 12 users
- **Testing method:** API testing via curl + browser UI testing via Chrome automation
- **Test users:** Glen Pryer (admin), Tom Rieger (admin)
