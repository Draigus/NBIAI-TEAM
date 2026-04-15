# Decisions Log

Append-only. Every decision Glen makes gets logged here immediately.

---

## 2026-04-04 (Session c)

### D1: Client Leads Tracker — Plan Before Code
Glen directed: "We should probably put together a plan and dig deep into it before we just throw something into code."
→ Do NOT start coding the leads tracker. Write a detailed plan first. Glen reviews and approves before implementation.

### D2: Session Continuity System
Glen approved the append-only session logging system (Option 2 + elements of Option 3).
→ Mechanical rule: log after every substantive exchange. No more relying on timed handoffs.

## 2026-04-05

### D3: Data-Driven Architecture — No Fragile Code
Glen directed: "Make sure everything on the NBI consulting dashboard is data-based. I don't want any fragile code."
→ ALL configuration must come from the database, not hardcoded in JS. Pipeline stages, field options, dropdown values, column definitions — everything configurable via settings/DB. No magic strings. Applies to the entire dashboard AND the new Client Leads Tracker page.

### D4: Client Segment Tabs
Glen wants segment tabs on the leads tracker: "All Clients", "Gaming Clients", "Human Capital Clients".
→ Tabs driven by `client_sector` field options in DB. Each client tagged with a sector. Leads inherit sector from their client. Adding a new sector = adding a DB row, not changing code.

### D5: Deal Owner — Glen or Tom Only
Deal owner dropdown limited to Glen and Tom. Not all dashboard users, not external partners.

### D6: Win Probability — Always Manual
No auto-setting from pipeline stage defaults. Win probability is always manually set by the user. Remove auto-suggest logic.

### D7: Multi-Currency Support
- GBP: contracts run out of UK office
- USD: contracts run out of US office
- SEK billed in GBP: contracts through Sweden office
- EUR: anything else across Europe
→ Need a currency field on each lead. ROM stored with currency code. Weighted pipeline values need FX conversion for totals.

### D8: Closed Deals Always Visible
Won/Lost/Holding deals always visible in all views. No collapse/toggle needed.

### D9: No Excel Import — Manual Entry Only
The Excel data is old. Glen will add new client content by hand. Remove the entire Excel import feature from the plan.

### D10: Follow-Up Reminders — Yes
Add notifications when a lead's next_followup_date is due today or overdue.

### D11: Client Leads Tracker — APPROVED, Build It
Glen approved the plan. Start building immediately.

### D12: Full QA Pass After Leads Tracker
After leads tracker is complete, do a full QA pass across the entire tool + code review for tech debt.

## 2026-04-06 (Sessions a + b)

### D25: Tab Restructure
Remove Incomplete tab (filter in Tasks), remove Changelog tab (section in Settings). Rename Dashboard -> Workload, Report -> Dashboard. New order: Dashboard, Workload, Tasks, People, Leads, Expenses, Finances, Settings.

### D26: Kill MD/PM/IC Toggle
Remove entirely from Workload view. Not adding value.

### D27: Overdue -- Show All, Group by Client, Severity Bands
Show all overdue items (no truncation). Group by client in portfolio view. Visual severity bands for days late.

### D28: Blocked and At Risk -- Separate Lists
Different purposes, different actions. Blocked = stuck. Red/At Risk = health bad but work may continue.

### D29: Due This Week -- Show Done and Open
Show everything for the coming week, completed and outstanding.

### D30: Standup -- Active Work Only, Collapsed by Default
Only show In Progress, In Review, Planning, Drafted + Done this week. No backlog/Not Started. All collapsed. Urgency sort.

### D31: KPIs -- Project-Focused
Move revenue/utilisation to Finance. Dashboard KPIs: Active, Overdue, Due This Week, Blocked, At Risk, % Complete, Total.

### D32: Don't Auto-Fill Health State
Glen fills health states manually. The 1088 "Not set" will get cleaned up by hand.

### D33: Status Over Time -- Keep the Chart
One data point isn't a trend, but once work is timelined, there will be plenty.

### D34: Client Order -- Paying Clients First
Couch Heroes, Lighthouse Studios, Sarge Universe, Goals Studio, then alphabetical.

### D35: People View Hours -- Leave Showing Zero
Staff will add hours once dashboard is cleaned up.

### D36: Leads View -- Leave Empty Stages
Once Glen fills in lead data, middle stages will have content.

### D37: Finance View -- Needs True P&L
Consulting metrics sidebar should dynamically reflect P&L data.

### D38: Expenses -- Separate from Finance
Employees submit expenses there. They don't have Finance access. Must stay as its own tab.

### D39: Dashboard Portfolio -- Sortable Table
Replace card layout with sortable table. All columns clickable to sort. Client has dropdown filter.

### D40: Blocked/At Risk on Dashboard -- Side by Side at Top
Above the portfolio table, as separate side-by-side lists.

### D41: Search -- Enter to Search, Not Live
Enter or button click triggers search. No keystroke searching.

### D42: Assignee -- Dropdown with All Employees
Not free text. Dropdown with all active team members.

### D43: Task/Project Name -- Editable in Properties
First field in Properties, editable.

### D44: Description Box -- Auto-Expand + Draggable
Should expand to fit text content and be draggable down.

### D45: Project Click-Through
Clicking a project on Dashboard navigates to Tasks tree view with that project expanded.

### D46: Goals Studio
"Follow up with Jonas on pricing" is Goals Studio. Acronym: GO.

## 2026-04-06 (Session C -- Glen UAT)

### D47: Remove Timer from Task Detail
Timer was accidentally added. Remove it.

### D48: Client Field -- Text When Set
Show client as text+badge when already assigned. Only show dropdown when no client is set.

### D49: Standup Inline Editing
All task fields editable directly on the standup bar. On desktop, all fields on one line.

### D50: Standup Sort Order
Blocked > overdue > planning > in progress > drafted > in review > done (sprint only).

### D51: No Scroll Reset on Field Update
Page must NOT reset scroll position when updating fields. No page reload, just element updates.

### D52: Drag-and-Drop on All Boards
Consistent drag-and-drop priority reordering on Tasks Board AND Leads Kanban.

### D53: Lead Contact Info on Card
Contact name, email, phone editable directly on the lead detail card. Don't need to go to Manage Leads.

### D54: Receipt OCR Upload
Upload receipts, extract fields automatically. OCR.space preferred over Tesseract.

### D55: Currency Detection -- No Symbols
OCR misreads pound/dollar signs. Use explicit text mentions only ("USD", "GBP", "EUR", "SEK"). Fallback to user's last expense currency. Company has both UK and US employees.

### D56: Save & Close on Expense Detail
Explicit save button so user can review OCR data, make corrections, and confirm.

### D57: Mobile Expense View -- Cards Not Table
Expense list view on phone is terrible. Needs card-based layout.

### D58: Disable Auto-Compact -- Manual Handoff Only
Auto-compact is permanently disabled. When context gets heavy, Claude writes a full handoff to disk, updates all live state files, and tells Glen to start a new chat. No automatic compaction ever again. Glen: "The amount of damage this has done is probably incomprehensible."

---

## 2026-04-06 Session D

### D59: Expense Report Submission Workflow
Expenses must go into reports. Reports are submitted. Submission notifies Tom Rieger via in-app notification + email with URL link. All expenses stay pending until report is submitted, then the report turns to "submitted". Glen: "All of my expenses should go towards a report. And that report should be submitted."

### D60: Bug/Feature Report Button
Yellow button in header. Auto-screenshot of current page. Text box for description. Bug or feature toggle. Appears in Settings as "Bug Reporting" tab with index of: who, type (bug/feature), and details.

## 2026-04-08

### D61: Mobile Header -- Overflow Menu
Glen: header is "three lines wide" on mobile. Restructured: only hamburger, NBI logo, + icon, bell, and ⋮ overflow on mobile. Print, Report, Theme, Sign Out moved into overflow menu. Desktop unchanged.

### D62: Mobile Sidebar -- Single Column
Glen: sidebar "tries to do two columns." Forced all sidebar elements to explicit flex-direction: column with !important. Override collapsed state on mobile-open.

### D63: Remove Max-Width on Main Content
Glen: "There is dead space on the left and right side of the main content." Removed max-width: 1800px from .main__content. Content now fills full width.

### D64: Full 6-Sprint Improvement Plan
Glen approved comprehensive improvement plan covering all audit critique items except password policy. 40+ items across 6 sprints. All executed same session. Audit score improved from 6.6 to 7.3.

### D65: Move-to-9 Plan -- All 9 Items Approved
Glen approved all 9 "What Would Move It to 9" items: migration framework, cursor pagination, Prometheus metrics, retry/circuit breaker, response envelope, DB pool scaling, native buttons, IndexedDB WAL, backup validation. 4-sprint plan executed.

### D66: Production URL -- worksage.nbi-consulting.com
Glen chose to use nbi-consulting.com domain with "worksage" subdomain. Named Cloudflare Tunnel (free) running via PM2. DNS managed by Cloudflare (nameservers moved from GoDaddy). Product name: NBI WorkSage.

### D67: PC as Production Server
Glen's PC stays as the server. Never turned off. No cloud hosting. Cloudflare Tunnel provides persistent external URL with SSL. Zero monthly cost.

## 2026-04-11 (Session B -- Hierarchy, Dependencies, Timeline)

### D68: Fixed 4-Level Hierarchy
Project > Feature > Story > Task. Not "Tickets". `item_type` column on tasks table. Migration 008 assigned types by depth. Nesting enforcement on drag-drop and reparent.

### D69: Sidebar Terminology
"Tasks" renamed to "Projects". "My Tasks" renamed to "My Work".

### D70: Delete Cascade with Warning
Deleting a parent shows a strong warning with descendant counts by type. CASCADE DELETE in transaction.

### D71: Prerequisites Terminology
Dependencies are called "Prerequisites" (not "Dependencies" or "Blocked By"). Reverse direction is "Dependents".

### D72: Prerequisite Enforcement
Hard-block on marking Done (must complete all prerequisites first). Soft-warn on In Progress (can override). Bulk operations also enforce.

### D73: Timeline Zoom
Plus/minus buttons (8px to 60px per day). Not preset zoom levels like Week/Month/Day/Detail.

### D74: Dependency Link Mode
Drag arrow from prerequisite bar to dependent bar in Gantt. Not a floating applet.

### D75: Dependencies Dropdown
Single dropdown button consolidating Link Mode, Show Arrows, and Dependency View options.

### D76: Critical Path View
Filtered Gantt showing only items in dependency chains. Topologically sorted. Indented by chain depth. Not a separate tree list.

### D77: Today Marker
Semi-transparent green column across the full timeline. Not a thin red line.

## 2026-04-15 (Session g)

### D78: Option C — Full Double-Escape Storage Fix
Glen confirmed in the prior session's handoff that he wants Option C: stop escaping at write time and decode the existing double-escaped rows. Implemented this session as commits `203dad6` (W1) and `abac7f2` (W2). All text fields now store raw user input; only the frontend's `esc()` runs at render time. Public client-report HTML and password-reset emails still use `escHtml()` because they are server-rendered documents.

### D79: Kanban Drag-To-Reorder On All Four Boards (spec only — implementation deferred)
Glen approved the design for drag-to-reorder on Tasks / Bug Tracker / Hiring / Leads Kanbans. New `position` integer column per table, scoped by status/stage. Existing priority enum stays as the "client need" classification. New cards land at top of column. Cross-column drops land at exact drop position. Order is shared across users, last-write-wins. Spec at `projects/nbi_dashboard/specs/2026-04-15-kanban-drag-reorder-design.md`. Implementation deferred until the test infrastructure project lands so the work can be done test-first.

### D80: Build Automated Test Suite Before Kanban Implementation
Glen pushed back on my too-fast deferral of frontend tests and approved building a real test suite as a predecessor to the Kanban work. Stack: Vitest + supertest for server unit tests, Playwright + chromium for frontend E2E. Six retroactive tests covering existing shipped behaviour: smoke (proves harness detects failures), double-escape round-trip, auth flow, migration runner idempotency, plus E2E coverage for auth, tasks, and bugs critical flows. Going forward every server-side feature is written test-first. Frontend tests via Playwright, server tests via Vitest. Built in the `test-infra-setup` worktree as a single feature branch. Spec at `projects/nbi_dashboard/specs/2026-04-15-test-infrastructure-design.md`, plan at `projects/nbi_dashboard/plans/2026-04-15-test-infrastructure-plan.md`.

## 2026-04-15 (Session post-test-infra — Kanban impl + overnight backlog)

### D81: Kanban Drag-To-Reorder Implementation Plan Written
Wrote the test-first implementation plan for D79 at `projects/nbi_dashboard/plans/2026-04-15-kanban-drag-reorder.md`. Plan structure: Phase 0 fixtures → Phase 1 migration 021 → Phase 2 helpers (`shiftForInsert`, `reorderInGroup`) → Phases 3-6 server endpoints (bug_reports, tasks, candidates, leads) → Phases 7-10 frontend (Bug Tracker new drag, Tasks/Leads remove priority-as-position, Hiring extend with intra-stage drop) → Phase 11 wrap-up + merge. Every server task is test-first. Frontend tasks include Playwright specs.

### D82: Glen's Overnight Backlog (sent 2026-04-15 before bed, "just keep working")
Glen sent six follow-up requests before going to sleep, captured in `pending_tasks.md` as G1-G5 (G3 is split: mobile UI is a single audit, no sub-items). Rough order from smallest to largest:
1. **G1**: Collapsible left sidebar with practice/client abbreviations (CH/LH/SU/GS/NSI/PS).
2. **G2**: Practice filters — only "Organizational" and "Gaming" should exist; remove "General"; tag all current work as Gaming.
3. **G4**: Sortable People-tab tables (workload, capacity, hours per client, task summary).
4. **G3**: Mobile UI pass for iPhone 11 viewport (414×896).
5. **G5**: Client-scoped users (e.g. Lorenza for Couch Heroes) — biggest item, requires spec + plan first. Effectively a multi-day project.

Glen's instruction was "just keep working" overnight. Order of execution: finish Kanban → G1 → G2 → G4 → G3 → G5 spec/plan. Continue committing frequently and update live_state after each merge.

### D83: NSI = National Strategic Insights
Clarified 2026-04-15 during master plan brainstorm. NSI is a client (not a practice), abbreviation "NSI" in the collapsed sidebar.

### D84: Practice model — Gaming + Organizational Health only
Going forward there are exactly two practices: slugs `gaming` and `organisational_health`, display labels "Gaming" and "Organizational Health" (short: "Org Health"). The "general" practice is removed. All existing work migrates to `gaming`. Going forward, **practice is mandatory at client creation** — the client-creation modal forces the user to pick one before saving, and `POST /api/clients` validates it.

### D85: G5 (Client-scoped users) earmarked for Phase 6 brainstorming
No spec work in the 2026-04-15 planning round. When we reach Phase 6, a dedicated brainstorming session produces the spec and implementation plan before any code. Glen's call on timing — expected after all S/M/L items above are done.

### D86: Master Workload Roadmap — phase-by-phase execution with stop points
Approved plan `.claude/plans/iridescent-imagining-kitten.md`. 30 tracked items across 10 phases. I execute Phases 1 through 5 continuously with brief check-ins between phases; Phases 6-10 require explicit approval per-phase (they're decision points, not execution slots).

### D90: Calendar events — pg DATE columns returned as raw YYYY-MM-DD strings
Glen reported a `uto` event he created for 2026-04-16 ("Glen is too drunk to work this day") never appeared on the calendar grid. Root cause: the `pg` driver's default DATE parser converts pure DATE columns to JS Date at local midnight, then serialises via `toISOString()` as UTC. On the BST dev box (UTC+1), `2026-04-16` came out as `2026-04-15T23:00:00.000Z` in the JSON response. The frontend's `calBuildEventDayMap()` did `new Date(ev.start_date + 'T00:00:00')`, concatenating onto the already-ISO string and producing Invalid Date. The day-comparison loop (`cursor <= stop` with NaN) then silently dropped every event. Every event Glen and Magnus created today hit this; nobody had exercised the calendar enough to notice it was broken for everyone, not just Glen.

**Fix**: `pgTypes.setTypeParser(1082, v => v)` at the top of `dashboard-server/server.js`. Postgres returns DATE as a bare `YYYY-MM-DD` string and the driver now passes it through untouched. Server-wide change (affects every DATE column on every endpoint), but no other code paths concatenate `T...` onto ISO-parsed DATE values, so the blast radius is limited to calendar + future DATE consumers that already expected the string shape. 2 new regression tests in `tests/unit/calendar-date.test.mjs`. Commit `1e93661`.

### D89: Warnings and alerts are user-specific (no admin short-circuit)
Glen's 2026-04-15 directive: "Let's make sure the warning behavior is targeted to specifics of that user, not where they have no ownership of the task or project. So all warnings and alerts should be user-specific."

Previous behaviour: `computeWarnings()` in `nbi_project_dashboard.html` short-circuited for admins, making them see warnings for every non-Done/Cancelled task in the system. This became a firehose once Magnus was promoted to admin (D88).

New behaviour: role-agnostic ownership. A warning fires for the current user only if they are an assignee on the task OR on any ancestor in the task hierarchy (root project, intermediate feature, etc.). This lets PMs who own a project see warnings for every task under it without being listed on each child, while keeping individual contributors scoped to the work they're actually responsible for. Per-root cache prevents re-walking the parent chain on every warning pass. Commit `739ea6a`.

Alerts (notifications) tab was already user-scoped server-side via `GET /api/notifications` with `WHERE username = req.user.username` at server.js:1984. No change needed there.

### D88: Magnus's account — promoted to admin, custom per-user permissions removed
Glen's 2026-04-15 directive: "Wipe all the custom permissions I gave Magnus' account down to a normal account and then just add her as an admin. Any hard-coded permissions around that account need to be removed and she needs to follow the normal work path for her account in the tool to be systemic."

Changes applied:
1. **Dev DB**: `users.role` for Magnus (id `7e6f9278-ee0b-401b-b6cd-5329288f7ecf`) flipped from `member` → `admin`.
2. **Dev DB**: `settings.page_permissions` cleaned up. Previous value was `{"leads": ["magnus"], "expenses": ["magnus"], "finances": ["magnus"]}` — three per-user allow-list entries granting her access while she was a member. Replaced with `{"leads": "admin", "expenses": "admin", "finances": "admin"}`, the default for fresh installs. Any user who is an admin (including Magnus now) gets access via the role short-circuit in `hasPageAccess()`, so the per-user entries were redundant going forward and clashed with Glen's "systemic" request.
3. **`dashboard-server/init-db.js:176`**: default seed role changed from `member` → `admin` so fresh DB installs create her as admin. `ON CONFLICT (username) DO NOTHING` means this doesn't affect existing DBs (which we migrated above).

Audit check: grep for `'magnus'`, `"magnus"`, `mpryer`, `Magnus Pryer` found only comments referencing historical feedback tickets she filed (Magnus C.6, Magnus B.3, Magnus and other members...). Those are preserved as git-blame context and have zero behavioural impact. There are NO code paths that branch on her username or ID. Her account now follows the same admin code path as Glen's.

### D87: Sync array-literal bug — server-side defensive normalisation
Pre-existing bug from ~10:00 2026-04-15. Frontend was intermittently POSTing `task.assignees = [[]]` or `task.dependencies = [[]]` to `/api/sync/changes`, which Postgres text[] columns rejected as malformed literal `"{{}}"`. Fixed at the server boundary: the sync upsert loop now flattens + string-filters both fields before the query runs, and logs `warn 'Sync' 'Normalised non-flat array field'` with taskId + before/after when it has to rewrite. Frontend source of the bad shape is still pending identification — the warn-log is how we catch it next time. 3 regression tests in `tests/unit/sync.test.mjs`. Commit `6d33612`.
