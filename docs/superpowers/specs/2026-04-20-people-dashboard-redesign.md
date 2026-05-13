# People Dashboard Redesign — Spec

## Overview

Redesign the People tab from a scrolling multi-section layout to a master-detail split view. The left panel shows the full team list with at-a-glance indicators; the right panel shows the selected person's full workload detail. A red flags strip spans the top.

## Layout

- **Split ratio:** 35% left panel / 65% right panel
- **Sub-tabs:** Workload (new master-detail, default) + Capacity (existing heatmap, unchanged). Calendar sub-tab removed.
- **Responsive:** On screens below 1024px, stack panels vertically (left on top, right below). Below 768px, hide left panel and show a person dropdown selector instead.

## Red Flags Strip

Spans full width above both panels. Shows:
- Count of people over 100% capacity this week (red)
- Count of blocked tasks across team (purple)
- Count of people absent next 7 days (muted)

Data source: computed from the same `filtered` tasks array and `_capacityEvents` already used by the existing view.

## Left Panel — Team List

### Structure per row
- Person name (12px, font-weight 600 when selected)
- Overdue badge (red, only shown when count > 0): "{n} overdue"
- Blocked badge (purple, only shown when count > 0): "{n} blocked"
- Status bar: 14px height, rounded corners, segments for Done (green), Active (blue), Blocked (red), Other (muted). Proportional to task counts.
- Below bar: "{n} tasks . {h}h spent" left-aligned, "{x}% util" right-aligned

### Behaviour
- Sorted by task count descending by default
- Search/filter input at top filters by name substring
- Clicking a row selects that person and populates the right panel
- Selected row: blue left border (3px), subtle blue background tint
- Existing sort toggle buttons (Name, Tasks, Hours Spent, Hours Est.) retained above the list

### Data
- Reuses the existing `workloadRows` computation (allPeople mapped to filtered tasks)
- Utilisation: `hoursEstimated / WEEKLY_CAPACITY * 100` (existing computation in capacity table)
- Overdue count: tasks with dueDate < now, not Done/Cancelled
- Blocked count: tasks with healthState === 'Blocked' OR status === 'Blocked'

## Right Panel — Person Detail

### Landing state
Auto-select the person with the most tasks (first in the default sort order).

### KPI Header
Row of 4 badge cards across the top:
- Tasks (total count, green background)
- Hours Spent (sum of hoursSpent, blue background)
- Blocked (count, red background)
- Overdue (count, amber background)

### Section 1: Capacity Forecast (Next 4 Weeks)
- 4 cells in a row, one per week
- Each cell: utilisation percentage, week start date, days off indicator
- Colour-coded: green (<70%), amber (70-95%), red (>95%)
- Reuses existing capacity computation (`computeDaysOff`, `_capacityEvents`)

### Section 2: Blocked Tasks
- List of blocked tasks with:
  - Task title
  - Client name
  - Blocker reason (from task description or dependencies field)
- Purple left border per item
- Only shown if blocked count > 0; otherwise shows "No blocked tasks"

### Section 3: Workload by Client
- Grid of client cards (2 columns)
- Each card: client name (coloured), task count, mini progress bar showing proportion of total
- Sorted by task count descending
- Clicking a client card could filter to that client (future enhancement, not in scope)

## CSS Changes

### New classes
- `.people-split` — the master-detail container (display: flex)
- `.people-list` — left panel (width: 35%, overflow-y: auto, max-height: calc(100vh - header))
- `.people-detail` — right panel (width: 65%, overflow-y: auto, padding)
- `.people-row` — individual person row in left panel
- `.people-row--selected` — selected state
- `.people-kpi` — KPI badge row in right panel
- `.people-kpi__item` — individual KPI badge
- `.people-capacity-row` — 4-week capacity cells
- `.people-blocked-item` — blocked task row
- `.people-client-card` — client workload card

### Existing classes preserved
- `.rw-bar`, `.rw-seg` — reused for status bars (height increased to 14px in left panel)
- `.task-subview-toggle`, `.task-subview-btn` — sort buttons
- `.filter-bar` — search input styling
- `.report__section` — section headers in right panel

## What Gets Removed
- Calendar sub-tab and `renderPeopleCalendarView()` call (function itself stays, just not rendered)
- The "everyone" overview mode that shows all sections stacked vertically (replaced by master-detail)
- Hours by Client table (folded into per-person detail)
- Tasks by Person Summary table (redundant with left panel)

## What Stays Unchanged
- Capacity sub-tab (heatmap view)
- All existing data computation functions
- Person filter dropdown (replaced by left panel click, but the `_peopleFilter.person` state variable is reused)
- Date range filter buttons (All Time, This Week, This Month, This Quarter)

## Existing Code Reuse
- `workloadRows` array computation (lines ~10030-10042)
- `_peopleWorkloadSort` state and `_actTogglePeopleWorkloadSort` handler
- `computeDaysOff()` and `_capacityEvents` for capacity data
- `isAssignedTo()` helper for merged name matching
- `normaliseAssignees()` for name deduplication
- `CLIENT_STAFF` exclusion array
- All CSS custom properties (--accent, --success, --danger, --warning, --purple, etc.)
