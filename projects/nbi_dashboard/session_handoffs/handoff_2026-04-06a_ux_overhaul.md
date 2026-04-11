# Handoff -- 2026-04-06a -- UX Overhaul & Data Import

## Session Summary
Two back-to-back sessions (the second crashed due to an oversized image in the chat). Covered: Downloads file importer, full UX audit by an expert PM/designer, massive dashboard restructure based on Glen's feedback, standup improvements, navigation cleanup, and dozens of tactical fixes. The chat was enormous and context-heavy -- this handoff captures every decision and every change.

## What's Running
- **Server:** `node dashboard-server/server.js` on port 8888
- **DB:** PostgreSQL at `postgresql://nbiai:***@localhost:5432/nbi_dashboard` (credentials in `.env`)
- **Files:** `dashboard-server/server.js` (~3,262 lines), `nbi_project_dashboard.html` (~9,559 lines)
- **Auth:** Token-based, default password `nbi2026`, Glen's username `glen`

## CRITICAL: What Needs Doing Next Session

Glen explicitly asked for these three things before the chat crashed:

### 1. Full Code Review + Code Commenting
- Go through all ~12,800 lines (server + frontend)
- Add/update JSDoc comments, section headers, inline comments on non-obvious logic
- Check for dead code, duplicated logic, inconsistent patterns
- Some commenting was done in the 04-05c session but the 04-06 session added ~700 lines of new code without comments

### 2. Full QA Pass
- **Every button** -- click every button in every view, verify it does what it should
- **Every dropdown** -- open every dropdown, verify options are correct and selection works
- **Every filter** -- test all combinations of client/status/health/assignee filters
- **Every view at desktop + mobile** -- verify layout doesn't break
- **Every form** -- new task, edit task, new lead, new expense, settings changes
- Write a formal test plan before starting the QA pass
- Check for regressions from all the restructuring done in this session

### 3. Update MD Files and README
- Update `CLAUDE.md` if any structural changes affect it
- Update handoff files and live state files
- Document all the new features and architectural changes
- Update any README or docs files with current feature list

---

## Everything Built/Changed in This Session (2026-04-06)

### Downloads Scanner & File Importer (NEW FEATURE)

**Server endpoints (dashboard-server/server.js):**
- `GET /api/import/scan-downloads` -- scans `C:\Users\gpbea\Downloads` + subdirectories (`msteams dload/`, `Spreadsheets/`, `expense/`) for Excel/CSV files. Fast headers-only XLSX parsing with `sheetRows: 5`. Returns file list with auto-detected format, row count, size, date.
- `POST /api/import/parse-file` -- full parse of a specific file. Maps rows to dashboard task structure based on detected format. Supports subdirectory paths.

**5 format detectors:**
1. NBI CSV (Glen_work_list) -- matches `Task,Client,Status,Priority` headers
2. NBI Dashboard Export -- matches `id,title,status,priority,client_id` headers
3. Microsoft Planner Export -- matches `Task ID,Task Name,Bucket Name,Progress` headers. Extracts plan name from "Plan name" sheet.
4. MS Project Export -- matches `Task_ID,Name,Duration,Start,Finish` headers
5. Couch Heroes Artifacts Plan -- matches `Item,Category,Status,Owner` or similar CH-specific headers
6. Generic fallback for anything with headers containing "task", "name", "status"

**Column mapping per format:** status normalisation (e.g. Planner "Completed" -> "Done", "In progress" -> "In Progress"), priority mapping (Planner "Urgent"/"Important" -> "Critical"/"High"), assignee extraction, date parsing.

**Frontend wizard (nbi_project_dashboard.html):**
- "Import from Downloads" button in Settings > Data section
- Step 1: File list with folder grouping (top-level, msteams dload/, Spreadsheets/, expense/), coloured format badges, row counts (-- for Excel in fast-scan mode), file sizes, dates
- Step 2: Preview with sheet selector (for multi-sheet Excel), client/parent picker, import mode (append/replace), column-mapped preview table
- Import creates tasks with parent resolution, client auto-detection, sync to API
- CSS classes: `.downloads-wizard`, `.downloads-file-row`, `.format-badge--*`

**MS Teams Planner Import:**
- 19 files in `C:\Users\gpbea\Downloads\msteams dload\`, all standard Planner export format
- 968 items imported: 19 root projects + 64 buckets + 885 tasks
- Client auto-mapping from plan names: Couch Heroes (74 tasks), Lighthouse Studios (378), Sarge Universe (110), Playsage (124), NBI Operations (200)
- Dashboard now has 1,127 total tasks (up from 156)

### Navigation Restructure

**Tabs reduced from 10 to 8:**
- REMOVED: "Incomplete" tab (now a toggle filter button in Tasks view)
- REMOVED: "Changelog" tab (now a section inside Settings, admin-only)
- Old `#incomplete` and `#changelog` URLs redirect to `#tasks` and `#settings` respectively

**Tabs RENAMED:**
- Old "Dashboard" -> now called **"Workload"** (hash: `#dashboard` -- hash unchanged for compat)
- Old "Report" -> now called **"Dashboard"** (hash: `#report` -- hash unchanged for compat)
- Glen's reasoning: "We call it the dashboard, but the report IS the dashboard, and what is now called the dashboard should be current workload"

**Tab ORDER changed (left to right):**
1. Dashboard (was Report)
2. Workload (was Dashboard)
3. Tasks
4. People
5. Leads
6. Expenses
7. Finances
8. Settings

**Sidebar order matches:** Dashboard first, then Workload, then Tasks, then rest.

**MD/PM/IC toggle REMOVED from Workload view.** Glen decided it wasn't adding value and should be killed entirely.

### Workload View (formerly "Dashboard") -- Major Restructure

**Date header:** Current date shown prominently at top ("Monday, 6 April 2026")

**Metrics strip -- now 7 project-focused KPIs:**
- Active, Overdue, Due This Week, Blocked (purple), At Risk (amber/orange), % Complete, Total
- Revenue/Month and Utilisation REMOVED (moved to Finance view)
- **Metrics are clickable** -- each one scrolls to its section below or filters the Tasks view
- **Trend arrows** on client-filtered view: shows change from last 7 days (e.g. "Overdue 14 ^10" in red = getting worse, "Complete 514 ^8" in green = progress). Computed by comparing current counts against tasks whose updatedAt is within the last 7 days.

**Layout rearranged (was: Overdue+Blocked left, This Week right):**
- NOW: **Overdue + This Week side-by-side on top row**
- **Blocked + At Risk as separate full-width sections below** (was combined "Blocked/At Risk")
- Blocked uses multi-column CSS grid with vertical divider lines between columns
- At Risk uses same multi-column layout with dividers

**Overdue section improvements:**
- Shows ALL items (was capped at 10 with "+4 more" -- removed)
- **Grouped by client** when viewing NBI Portfolio (separator headers: "Couch Heroes", "Lighthouse Studios", etc.)
- **Severity bands:** 14+ days overdue = deep red background + bold text, 7-14 = medium, 4-7 = light, 1-3 = standard. Visual weight differentiation so 17-day-late items look different from 2-day-late items.

**Blocked (5) and At Risk (15) -- now SEPARATE sections:**
- Blocked = tasks with status "Blocked" (purple header/accent)
- At Risk = tasks with health "Red" (amber/orange header/accent)
- Each shows a multi-column grid layout with vertical divider lines (CSS `column-rule`)
- **At Risk items include a one-line reason** -- pulled from the task's last note or truncated description

**This Week section:**
- Shows both open and completed items for the coming week (was only open)
- Title includes client name when filtered (e.g. "Couch Heroes -- This Week")

**Standup section improvements:**
- **Sorted by urgency:** People with blocked/overdue items appear first, then by task count descending. Glen Pryer (with blocked + overdue items) now appears at top instead of alphabetical.
- **Available people collapsed:** Instead of 3 separate "Available" rows for Bryan, Ruan, Stavros, they collapse into one line: "Available: Ruan Pearce-Authers, Stavros Kylakos"
- **All people start collapsed** -- click to expand one at a time. Was: all expanded by default.
- **Only shows active work:** In Progress, In Review, Planning, Drafted tasks + Done this week only (last 7 days). Does NOT show Not Started/Backlog tasks. No more "+42 more" truncation -- all tasks show.
- **Done-this-week tasks** show with a checkmark and strikethrough styling
- **"(Contractor)" removed** from all assignee names (25 tasks cleaned in DB)
- **First-name fuzzy matching** fixed: tasks assigned to "Glen" now match "Glen Pryer", "Tom" matches "Tom Rieger". Standup was showing everyone as "Available" before this fix.

### Dashboard View (formerly "Report") -- New Project Portfolio Table

**Sortable Project Portfolio table replaces the old card-based layout:**
- Columns: Project, Client (with filter dropdown), Tasks, Done, Active, Blocked, %, Estimate, Actual
- **Every column header is clickable** to sort ascending/descending (shows arrow indicator, highlights in accent colour)
- **Client column has a filter dropdown** -- pick a specific client to filter the table
- % column shows a mini progress bar alongside the number
- Blocked counts highlight in red+bold when > 0
- Actual hours highlight red when over estimate
- Rows are clickable -- navigates to Tasks tree view filtered to that project

**Blocked and At Risk as separate side-by-side lists** at the top of the Dashboard, above the portfolio table (consistent with Workload view separation).

### Tasks View Improvements

**New "All People" dropdown** in the filter bar -- pick any team member to see only their tasks. Shows all 8 active team members.

**Search changed from live-search to Enter-to-search:** Was searching on every keystroke (impossible to type a full word). Now waits for Enter key or search button click. Placeholder says "(Enter)" to indicate.

**"Incomplete" toggle button** in the filter bar (right side, next to sub-view buttons). Replaces the removed Incomplete tab. Filters to tasks missing required fields.

**Breadcrumb/filter bar:** Shows active filters with clear buttons (e.g. "Filtered: Glen Pryer x | Status: In progress x | Clear all") when any filter is active. Below the tabs, above the task content.

**Quick-add bar** at the top of Tasks view: inline text field "Quick add task... (press Enter)" with a client dropdown. Type title, press Enter, task created immediately. Faster than opening the full "+ Task" panel.

**Board view now shows only leaf tasks:** Parent/group tasks (like "Lighthouse Studios" or "Playsage") no longer appear as cards in kanban lanes. Only actionable tasks with real content show. Backlog went from 489 to 448 after filtering.

**Calendar "+N more" expands in-place** on click (was just showing a toast). Now reveals all tasks for that day.

**Gantt/Timeline view** already had zoom controls (Week/Month/Day/Detail) -- confirmed working.

**Right-hand summary panel is now filter-aware:** When filtered to Glen Pryer, title says "Glen Pryer's Tasks" with Glen's stats. When filtered to a client, shows that client's stats. Was always showing portfolio-level stats regardless of filter.

**Date parsing fix:** Planner dates in dd/mm/yyyy format (e.g. "14/03/2026") were crashing `Date.toISOString()`. Added `safeParseDate()` function that handles both yyyy-mm-dd and dd/mm/yyyy formats. This was causing the Tasks view to fail to render entirely (RangeError crash on Gantt).

### Assignee Field -- Now a Dropdown

Both the overlay detail panel and inline detail panel now use a **multi-select dropdown** for assignees instead of a free-text input:
- Current assignees shown as chips with x remove buttons
- "+ Add assignee" dropdown below with all 8 active team members
- Global `_teamMembers` cache loaded on login from `/api/users`
- `loadTeamMembers()` called on both login paths (manual + auto-login from localStorage)

### Task/Project Title -- Now Editable

- Title is now the **first field in Properties** section of both overlay and inline detail panels
- Rendered as an input that looks like a title (transparent bg, no border, large font)
- Shows edit border on hover, highlights on focus
- Changes save on blur or Enter key
- Also editable in the panel header (editable input replacing the static h2)

### Description Textarea -- Auto-Expanding

- Auto-expands to fit content on render and as you type (`oninput` event resizes height)
- Still draggable downward via `resize: vertical`
- Uses `field-sizing: content` CSS (Chrome 123+) with JS fallback for other browsers
- Post-render `setTimeout` measures `scrollHeight` and sets initial height

### Finance View Enhancements

Two new KPI cards added:
- **Op. Margin** (-15%) -- operational margin calculation
- **Utilisation** (57%, 4 of 7 billable) -- moved from the old Dashboard metrics
- Finance now has 8 KPI cards total: Annual Revenue, Annual Payroll, Gross Margin, Op. Margin, Net Profit, Monthly Burn, Revenue/Head, Utilisation

### Header/Tab Z-Index Fix

- Detail panel overlay (z-index 200) was covering the header bar and tab bar, making buttons unclickable
- Header `.g-header` now has `position: relative; z-index: 202`
- Tabs `.main__tabs` now has `position: relative; z-index: 201`
- Detail panel overlay stays at z-index 200
- All navigation elements are now always clickable even with detail panel open

### Print Button Fix

- Print now prints the **current view** (was forced to Report view)
- Enhanced print stylesheet hides sidebar, header, filter bar, detail panel, and footer
- Works for any view: Workload, Dashboard, Tasks, People, Leads, etc.

### Client Ordering

**Priority order applied everywhere:**
1. Couch Heroes
2. Lighthouse Studios
3. Sarge Universe
4. Goals Studio
5. Everything else alphabetically

Applied to: sidebar, Dashboard portfolio, Gantt view, strategic charts, leads by-client view, overdue grouping, standup section, report cards, all dropdowns.

Uses `clientSortOrder()` function -- single source of truth for sort order.

### Project Click-Through

Clicking a project name in the Dashboard portfolio table now:
1. Sets `currentFilter.project` to that project
2. Switches to Tasks view, "By Project" sub-view
3. Expands the project node in the tree
4. Scrolls to it

### Data Fixes

- **Bryan Rasmussen** set to inactive (standby like Jeff, Jessica) -- won't appear in standup
- **"Follow up with Jonas on pricing"** task assigned to **Goals Studio** client (was unassigned). Goals Studio client created with acronym "GO".
- **"(Contractor)" removed** from all assignee display names -- 25 tasks cleaned
- **Assignee name merge:** 137 "Glen" tasks merged into "Glen Pryer" (now 298 total). 2 "Tom" tasks merged into "Tom Rieger" (now 69 total).

### Keyboard Shortcuts

Already existed from prior session. Updated in this session:
- `g` then `l` = Leads (was changelog)
- `g` then `e` = Expenses
- `g` then `m` = My Tasks (new)
- All others unchanged: `g+d` Dashboard, `g+t` Tasks, `g+r` Report/Dashboard, `g+p` People, `g+f` Finances, `g+s` Settings, `n` New task, `Escape` close panel, `[` toggle sidebar

---

## Glen's Decisions This Session (append to decisions.md)

### D25: Tab Restructure
- Remove Incomplete tab (make it a filter in Tasks)
- Remove Changelog tab (move to Settings)
- Rename: "Dashboard" -> "Workload", "Report" -> "Dashboard"
- Tab order: Dashboard, Workload, Tasks, People, Leads, Expenses, Finances, Settings

### D26: Kill MD/PM/IC Toggle
Remove it entirely from Workload view. Not adding value.

### D27: Overdue -- Show All, Group by Client, Severity Bands
Show all overdue items (no truncation). Group by client when viewing portfolio. Visual severity bands for days late.

### D28: Blocked and At Risk -- Separate Lists
Different purposes, different actions. Blocked = someone is stuck. Red/At Risk = health is bad but work may continue. Must be visually distinct and in separate sections.

### D29: Due This Week -- Show Done and Open
Show everything for the coming week, both completed and outstanding.

### D30: Standup -- Active Work Only, Collapsed by Default
Only show In Progress, In Review, Planning, Drafted tasks + Done this week. Do NOT show backlog/Not Started. All people start collapsed. Sort by urgency (blocked/overdue people first).

### D31: KPIs -- Project-Focused
Move revenue/utilisation to Finance. Dashboard KPIs should be Active, Overdue, Due This Week, Blocked, At Risk, % Complete, Total.

### D32: Don't Auto-Fill Health State
"Auto-filling my health is not a solution." Glen will fill health states by hand. The 1088 "Not set" will get cleaned up manually.

### D33: Status Over Time -- Valid Once Data Fills In
One data point isn't a trend, but once all work is timelined, there will be plenty. Keep the chart.

### D34: Client Order -- Paying Clients First
Couch Heroes, Lighthouse Studios, Sarge Universe, Goals Studio (in contracting), then alphabetical.

### D35: People View Hours -- Leave Showing Zero
Staff will add hours once dashboard is cleaned up. Don't hide the column.

### D36: Leads View -- Leave Empty Stages
Once Glen fills in lead data, middle stages will have content. Don't collapse them.

### D37: Finance View -- Needs True P&L
Consulting metrics sidebar should dynamically reflect P&L data. Needs more detail on the P&L itself.

### D38: Expenses -- Separate from Finance
Expenses is a form for employees to submit. They don't have access to Finance tab. Must stay as its own tab.

### D39: Dashboard Portfolio -- Sortable Table
Replace card layout with a proper sortable table: Project, Client (filterable), Tasks, Done, Active, Blocked, %, Estimate, Actual. All columns clickable to sort. Client has dropdown filter.

### D40: Blocked/At Risk on Dashboard -- Side by Side at Top
Above the portfolio table, as separate side-by-side lists.

### D41: Search -- Enter to Search, Not Live
Add a search button; Enter or button click triggers search. No more searching on every keystroke.

### D42: Assignee -- Dropdown with All Employees
Not free text. Dropdown with all active team members so people can pick themselves.

### D43: Task/Project Name -- Editable in Properties
First field in Properties should be the name, and it should be editable.

### D44: Description Box -- Auto-Expand + Draggable
Should expand to fit text content and be draggable down.

### D45: Project Click-Through
Clicking a project on the Dashboard should navigate to the Tasks tree view with that project expanded and focused.

### D46: Goals Studio
"Follow up with Jonas on pricing" is Goals Studio. Acronym: GO. Create the client if not already there.

---

## Known Issues / Things Glen Flagged But NOT Yet Fixed

1. **Blocked/At Risk column dividers** -- Glen said the formatting "is really terrible" and mentioned "weird parenthesis instead of a divider line". The CSS `column-rule` approach was applied but may need visual refinement. CHECK THIS in QA.
2. **Finance P&L view** -- Glen said "the details aren't quite there yet" and it needs "a little more of a true P&L view". The consulting metrics sidebar should dynamically reflect P&L data. NOT yet addressed.
3. **Board view parent filtering** -- implemented (leaf-only) but Glen agreed "with everything on number four" which included: board should have a project filter at the top, Gantt needs a scope selector, calendar needs overflow pattern. Board filter and Gantt scope selector NOT yet built.
4. **People view -- click person to show tasks** -- Glen agreed this was needed. The people view already has a per-person detail view when you click a name, but Glen may not have verified it works the way he wants.
5. **Cross-cutting issues Glen agreed to:** breadcrumbs (DONE), keyboard shortcuts (DONE), My Tasks (DONE), sidebar filter indication (DONE), task quick-add (DONE), drag-and-drop in By Project (NOT done), print button (DONE).
6. **Trend arrows** -- computed from last 7 days of updatedAt timestamps. May need refinement once data quality improves and there's more historical data.
7. **"1088 Not Set" health state** -- Glen will fill in by hand. No auto-derivation.

---

## Database Changes This Session

```sql
-- No schema changes this session.
-- Data changes only:

-- Bryan Rasmussen set to inactive
UPDATE users SET is_active = false WHERE display_name = 'Bryan Rasmussen';

-- Goals Studio client created
INSERT INTO clients (name, code) VALUES ('Goals Studio', 'GO');

-- Jonas task assigned to Goals Studio
UPDATE tasks SET client_id = '<goals_studio_id>' WHERE title LIKE '%Jonas%pricing%';

-- (Contractor) removed from assignee names
UPDATE tasks SET assignees = array_replace(assignees, 'Ruan Pearce-Authers (Contractor)', 'Ruan Pearce-Authers')
  WHERE 'Ruan Pearce-Authers (Contractor)' = ANY(assignees);
-- (similar for all contractors)

-- Glen/Tom name merges
UPDATE tasks SET assignees = array_replace(assignees, 'Glen', 'Glen Pryer') WHERE 'Glen' = ANY(assignees);
UPDATE tasks SET assignees = array_replace(assignees, 'Tom', 'Tom Rieger') WHERE 'Tom' = ANY(assignees);

-- 968 tasks imported from MS Teams Planner exports (19 files, 19 root projects, 64 buckets, 885 leaf tasks)
```

## File Sizes
- `nbi_project_dashboard.html` -- 9,559 lines
- `dashboard-server/server.js` -- 3,262 lines
- Total: 12,821 lines

## Dependencies (no new ones this session)
All from prior sessions: express, pg, multer, cors, bcrypt, jsonwebtoken, uuid, dotenv, node-cron, pdfkit, compression, xlsx, express-async-errors

## How to Start
```bash
cd D:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
node server.js
# Server runs on http://localhost:8888
# Dashboard at http://localhost:8888/nbi_project_dashboard.html
# Login: glen / nbi2026
```

## Next Session Instructions

1. **Load this handoff first** -- `projects/nbi_dashboard/session_handoffs/handoff_2026-04-06a_ux_overhaul.md`
2. **Start the server** -- `cd dashboard-server && node server.js`
3. **Full code review + commenting** -- both server.js and nbi_project_dashboard.html. Add JSDoc, section headers, inline comments. Check for dead code and inconsistencies.
4. **Write a formal QA test plan** -- every view, every button, every dropdown, every filter, desktop + mobile
5. **Execute the QA pass** -- fix any bugs found
6. **Update MD files** -- CLAUDE.md, live_state files, README/docs with current feature list
7. **Check the Blocked/At Risk column dividers** -- Glen said they looked bad. May need CSS refinement.
8. **Finance P&L enhancement** -- Glen wants a more detailed true P&L view with the consulting metrics dynamically reflecting the P&L data.
