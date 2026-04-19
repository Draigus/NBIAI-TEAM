# Portfolio Dashboard v3 — Design Spec

**Date:** 2026-04-18
**Status:** Approved by Glen Pryer
**Wireframes:** `.superpowers/brainstorm/9836-1776524578/content/`

---

## Overview

Redesign the WorkSage Dashboard view from a card-grid layout to an executive portfolio dashboard with a client sidebar, four visualisation panels, and a bottom insights row. All data already exists in the task/project model. The charts are rendered with pure HTML/CSS/JS (no external charting library).

---

## Layout Architecture

```
+---------------------------------------------------------------+
|  KPI Strip (6 items, full width, trend deltas)                |
+---------------------------------------------------------------+
| Client    |  Work Completed        | Client Health Scorecard  |
| Cards     |  (stacked bar chart)   | (RAG table)              |
| (left     |                        |                          |
|  column,  |------------------------+--------------------------|
|  scroll-  |  Project Timeline      | Needs Attention          |
|  able)    |  (Gantt replica)       | (overdue/blocked list)   |
+---------------------------------------------------------------+
| Completing Soon  | Upcoming Milestones | Team Workload         |
+---------------------------------------------------------------+
```

### Responsive breakpoints

| Screen | Layout |
|---|---|
| Mobile (<768px) | Single column. KPI strip wraps. Client cards full width. Viz panels stack vertically. Bottom row stacks. |
| Tablet (768-1024px) | Client column collapses to icons/abbreviations. Viz panels 2x2. Bottom row 3-col. |
| Desktop (1024-1600px) | Full layout as above. Client column ~240px. |
| Widescreen (1600+) | Full layout. Panels stretch proportionally. |

---

## Section 1: KPI Strip (enhanced)

Existing strip with six items. Enhancement: week-over-week trend deltas.

**Items:** Active Projects, Overdue, Blocked, At Risk, Hours Spent, Hours Est.

**Trend indicators per KPI:**
- Coloured triangle (up/down) plus delta number (e.g., "+3")
- Green up-arrow = good for Active Projects, Hours Spent
- Red up-arrow = bad for Overdue, Blocked, At Risk
- Direction inverted per metric (more overdue = bad, fewer = good)

**Data source for deltas:** New `dashboard_snapshots` table. A cron job (or on-login snapshot) records current KPI values once daily. The dashboard queries the snapshot from 7 days ago and computes the delta. If no snapshot exists 7 days back, deltas are hidden (not shown as zero).

**Snapshot table schema:**
```sql
CREATE TABLE dashboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  active_projects INTEGER NOT NULL,
  overdue_count INTEGER NOT NULL,
  blocked_count INTEGER NOT NULL,
  at_risk_count INTEGER NOT NULL,
  hours_spent NUMERIC(10,1) NOT NULL,
  hours_estimated NUMERIC(10,1) NOT NULL,
  tasks_planned INTEGER NOT NULL DEFAULT 0,
  tasks_added INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

The `tasks_planned`, `tasks_added`, `tasks_completed` columns also feed the Work Completed chart. One table, one daily snapshot, serves both features.

---

## Section 2: Client Cards (left column)

Narrow left column (~240px), scrollable if cards overflow the viewport.

**Top card: "Portfolio"**
- Aggregate summary across all clients
- Always visible, always first
- Clicking it resets the viz panels to show all-client data (the default)
- Shows: total active, total overdue, total at risk, aggregate % complete

**Per-client cards (below Portfolio):**
- Health dot (RAG, worst-of across client tasks)
- Client name (1.1rem font)
- Stats: X active, Y overdue, Z at risk (only non-zero shown)
- Progress bar with %
- No expand/collapse — cards are compact

**Interaction:**
- Clicking a client card filters ALL viz panels and bottom row to that client's data
- Selected card gets a highlight border (accent colour)
- Clicking Portfolio card resets to all-client view

**Sort order:** Existing `clientSortOrder` (priority clients first, alphabetical otherwise). No "Unassigned" card (enforced elsewhere).

---

## Section 3: Visualisation Panels (2x2 grid)

All four panels sit to the right of the client column in a 2x2 CSS grid. Each panel has a consistent container style (background, border-radius, header with title + subtitle).

### Panel 3a: Work Completed

**Content:** Stacked bar chart, 8-week rolling window.

**Per week, two bars side by side:**
- Left bar (stacked): Planned (blue, bottom) + Added (amber, top)
- Right bar: Completed (green)

**Data:**
- Planned = tasks that existed at start of week and were not Done/Cancelled
- Added = tasks created during the week
- Completed = tasks marked Done during the week

**Source:** `dashboard_snapshots` table. Each daily snapshot records `tasks_planned`, `tasks_added`, `tasks_completed`. The chart aggregates by ISO week (or sums daily snapshots within each week).

**Summary row** below chart: "This week: X planned, +Y added, Z completed"

**Interaction:** Clicking a bar could filter the Needs Attention panel to that week's items (stretch goal, not required for v3).

### Panel 3b: Client Health Scorecard

**Content:** Simple RAG table with plain coloured dots.

**Columns:** Client | Schedule | Blockers | Burn Rate | Overall

**RAG logic (computed from live task data, not stored):**
- **Schedule:** Green = 0 overdue, Amber = 1-2 overdue, Red = 3+ overdue
- **Blockers:** Green = 0 blocked, Amber = 1 blocked, Red = 2+ blocked
- **Burn Rate:** Green = hours spent < 80% of estimate, Amber = 80-100%, Red = >100%
- **Overall:** Worst of the three (red beats amber beats green)

**Interaction:** Clicking a row selects that client (same as clicking the client card).

### Panel 3c: Project Timeline

**Content:** Compact replica of the existing Projects tab Gantt view (`renderGanttView()`).

**Reuses existing Gantt visual language:**
- Label column with item type badges (P/F/S/T)
- Client group headers with item counts
- Day columns with weekend shading
- Month headers
- Today line (blue vertical)
- Status-coloured bars (blue in-progress, green done, red at-risk, purple blocked, grey not-started)
- Hierarchy indentation for features/stories under projects
- Horizontal scroll on overflow
- Zoom controls (+ / - / day width) and navigation (back / today / forward)

**Implementation:** Factor out a `renderMiniGantt(tasks, options)` function from the existing `renderGanttView()`. The dashboard panel calls it with `{ compact: true, maxRows: 20, hideControls: false }`. The compact flag reduces row height and label width for the panel context.

**Interaction:** Clicking a bar opens the detail overlay. Zoom/nav controls work within the panel.

### Panel 3d: Needs Attention

**Content:** List of all overdue, at-risk, and blocked items sorted by severity.

**Per item:**
- Severity badge: "Xd overdue" (red), "AT RISK" (red), "BLOCKED" (purple), or combinations
- Left colour border matching severity
- Task title (primary text)
- Project and client context (secondary line below)
- Assignee (right-aligned)

**Sort order:** Blocked first, then overdue (most days first), then at-risk.

**Overflow:** Show top ~5 items with "+ N more items" link. Clicking the link expands inline (not a page navigation).

**Interaction:** Clicking any item opens the detail overlay (`openDetailOverlay()`).

---

## Section 4: Bottom Row (3 panels)

Three equal-width panels below the main content area.

### Panel 4a: Completing Soon

**Content:** Projects 60-99% complete, sorted by % descending, top 6.

**Per item:**
- Health dot
- Project title (primary)
- Client name (secondary)
- Mini progress bar
- Percentage

**Interaction:** Click opens detail overlay.

### Panel 4b: Upcoming Milestones

**Content:** Root tasks with due dates in the next 14 days, sorted by date ascending, top 6.

**Per item:**
- Date badge, colour-coded: red (<=2 days), amber (<=5 days), muted (>5 days)
- Task title (primary)
- Client name (secondary)

**Interaction:** Click opens detail overlay.

### Panel 4c: Team Workload

**Content:** Horizontal bar per team member showing active (non-Done, non-Cancelled) task count.

**Per person:**
- Name
- Horizontal bar (proportional to max)
- Task count number
- Bar colour: red (>30 tasks), amber (15-30), green (<15)

**Sort order:** Most loaded first.

**Interaction:** Click a person to filter dashboard to their tasks (sets the assignee filter and re-renders).

---

## Interaction Model

**Detail overlay pop-out:** Clicking any actionable item in any panel opens the existing `openDetailOverlay(taskId)`. This is a slide-in overlay on the right side of the page. The user can edit task fields, then close the overlay to return to the dashboard. No page navigation occurs.

**Client filtering:** Clicking a client card sets a `_portfolioSelectedClient` state variable. All panels re-render filtered to that client. Clicking the "Portfolio" card clears the filter (shows all). The selected card gets a visual highlight.

**Panel refresh:** Panels render from live in-memory task data (same `tasks` array used everywhere). No additional API calls needed except for the snapshot data (KPI deltas and Work Completed chart).

---

## New Server Work

### Migration: `dashboard_snapshots` table
- Schema as described in Section 1
- One row per day, `snapshot_date` is unique

### Cron: daily snapshot
- Runs at 00:05 UTC daily (after midnight rollover)
- Queries current task data, computes the 6 KPI values + 3 work-completed values
- Inserts into `dashboard_snapshots` with `ON CONFLICT (snapshot_date) DO NOTHING`
- Also runs on server startup if today's snapshot doesn't exist yet (bootstraps first run)

### API: `GET /api/dashboard/snapshots?days=56`
- Returns snapshots for the last N days (default 56 = 8 weeks)
- Used by the dashboard to render KPI deltas and Work Completed chart
- Requires authentication

---

## What This Replaces

- The current portfolio card grid layout (v2) is replaced entirely
- `renderPortfolioDashboard()` is rewritten
- The old tactical dashboard (`renderTacticalDashboard()`) remains commented out
- The "Completing Soon" and "Upcoming Milestones" sections move from below the card grid to the bottom row
- No existing functionality is deleted, only restructured

---

## Out of Scope

- External charting library (Chart.js, D3) — all charts are HTML/CSS/JS
- Historical trend lines on individual KPIs (just the delta for now)
- Drag-and-drop within dashboard panels
- Client card expand/collapse (removed by design)
- Custom dashboard panel arrangement
