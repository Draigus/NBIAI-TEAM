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
