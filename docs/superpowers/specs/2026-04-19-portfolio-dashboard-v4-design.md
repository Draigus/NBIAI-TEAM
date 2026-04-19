# Portfolio Dashboard v4 — Design Spec

**Date:** 2026-04-19
**Status:** Approved by Glen Pryer
**Supersedes:** `2026-04-18-portfolio-dashboard-v3-design.md`
**Wireframes:** `.superpowers/brainstorm/11773-1776607211/content/portfolio-redesign-v3.html`
**Reference screenshot:** Glen's mockup shared 2026-04-19 (not saved to disk; layout replicated in wireframe above)

---

## Scope

Replace the four main visualisation panels, the KPI strip metrics, and the bottom row of the Portfolio Dashboard. The client sidebar and tab bar/header are NOT touched — they stay exactly as they are in the current v3 implementation.

**Files affected:** `nbi_project_dashboard.html` (panel render functions, KPI strip, CSS), `dashboard-server/server.js` (new work_type field, admin endpoints, migration).

---

## What Stays (DO NOT MODIFY)

- Tab bar / header
- Client sidebar (`renderPfSidebar()`) — card layout, health dots, stats, progress bars, click-to-filter behaviour
- `selectPortfolioClient()` interaction model — clicking a client filters all panels
- `openDetailOverlay()` — clicking any item in any panel opens the detail overlay
- Existing `dashboard_snapshots` table and cron (used for KPI deltas)
- Bottom row panel container structure (just changes from 3-col to 4-col)

---

## Section 1: KPI Strip (rewrite metrics)

**Current:** Active Projects, Overdue, Blocked, At Risk, Hours Spent, Hours Est.

**New (6 items):**

| # | Label | Colour | Value | Delta |
|---|---|---|---|---|
| 1 | Active Engagements | green | Count of active (non-Done, non-Cancelled) root tasks | WoW from snapshots |
| 2 | On Track | green | Active engagements minus unique count of (overdue OR at-risk) tasks | WoW from snapshots |
| 3 | Needs Attention | amber | Count of overdue tasks (due_date < today, not Done/Cancelled) | WoW from snapshots |
| 4 | At Risk | red | Count of tasks with health_state = 'Red' (not Done/Cancelled) | WoW from snapshots |
| 5 | Active Leads | blue | Count of leads with status in active pipeline stages | WoW from snapshots |
| 6 | Work Types Active | purple | Count of distinct `work_type` values across active root tasks | No delta |

**Layout change:** Delta moves beside the large number (same baseline), not below. Format: `▲ +3` with `LST WK` on a second line underneath the delta number. Larger font than current delta text.

**Snapshot additions:** `dashboard_snapshots` table needs two new columns:
- `on_track_count INTEGER NOT NULL DEFAULT 0`
- `active_leads_count INTEGER NOT NULL DEFAULT 0`

`computeDashboardSnapshot()` updated to populate these from live data.

---

## Section 2: Main Panels (2x2 grid — complete rewrite)

All four panels respond to client selection. When a client is selected in the sidebar, each panel filters to that client's tasks only. When Portfolio is selected, panels show all-client data.

### Panel 2a: Progress Status (replaces Work Completed)

**Content:** SVG donut chart showing task status distribution as percentages.

**Segments (6), priority order (first match wins):**
1. Blocked (red `#ef4444`) — status = 'Blocked'
2. Waiting on Client (amber `#fbbf24`) — healthState = 'Waiting on Client' (this is a HEALTH_STATE, not a status)
3. Completed (green `#4ade80`) — status = 'Done'
4. In Progress (cyan `#06b6d4`) — status = 'In progress' (note lowercase 'p')
5. Planning (blue `#3b82f6`) — status = 'Planning'
6. Not Started (grey `#666`) — status = 'Not started', 'Drafted', 'In Review', or unmapped

Cancelled tasks are excluded from the donut entirely.

**Actual STATUSES constant:** `['Not started', 'In progress', 'Planning', 'Drafted', 'In Review', 'Blocked', 'Done', 'Cancelled']`
**Actual HEALTH_STATES constant:** `['Green', 'Yellow', 'Red', 'Waiting on Client']`

**Visual:** Ring/donut chart (not filled pie). Each segment has a leader line: dot on the ring edge, elbow line out to a label showing percentage and status name. Labels on the left side of the ring point left; labels on the right point right.

**Data source:** Computed from live `tasks` array filtered by selected client. Exclude Cancelled. Count tasks in each bucket using priority order above (a task with status 'In progress' AND healthState 'Waiting on Client' goes in the Waiting on Client bucket). Compute percentages from total non-Cancelled count.

**SVG rendering approach:**
- Use `<svg viewBox="0 0 400 300">` with centre at (200, 150)
- Ring via `<circle>` elements with `stroke-dasharray` and `stroke-dashoffset`
- Ring radius ~72, stroke-width ~30 (thick ring, not thin)
- Circumference = 2 * pi * 72 = ~452. Each segment's dash length = (percentage / 100) * 452
- Each subsequent segment's dashoffset = negative sum of all previous dash lengths
- All circles share `transform="rotate(-90 200 150)"` to start at 12 o'clock
- Leader lines: `<line>` elements from ring edge to label position, with a small `<circle r="3">` dot at the ring end
- Labels: `<text>` elements positioned around the ring — right side labels on the right, left side labels on the left
- Segments with 0% are omitted (no zero-width slices)

**Interaction:** Clicking a segment could filter to that status (stretch goal — not required for v4).

### Panel 2b: Upcoming Milestones (replaces Client Health)

**Content:** List of root tasks (projects) with due dates, sorted by date ascending. Shows overdue first (red), then upcoming.

**Per item:**
- Left colour bar (3px): red if overdue, green if on track
- Client abbreviation (2-3 letter code, bold, colour-coded) — derived from client name
- Task title
- Subtitle: `client name · work_type` (e.g., "Couch Heroes · Strategy"). If no work_type set, show client name only
- Right side: status text ("2d overdue" in red, "Due tomorrow" in red, "On track" in green) + date

**Client abbreviation logic:** First letters of each word in client name, max 3 chars. E.g., "Couch Heroes" = "CH", "Lighthouse Studios" = "LS", "NBI OPS" = "NBI OPS" (kept as-is for short names). Configurable override in admin if needed.

**Data source:** Root tasks (no parentId) with `dueDate` set, not Done/Cancelled. Sorted: overdue first by days overdue desc, then upcoming by date asc.

**Show count:** Up to 6 items. No "show more" — this is a summary panel.

**Interaction:** Click an item to open `openDetailOverlay(taskId)`.

### Panel 2c: Project Timeline (modify existing)

**Content:** Gantt-style view showing top-level projects grouped by client.

**Changes from current:**
- Label column width: 140px → 180px (no more text truncation)
- Add vertical grid lines between month columns (1px solid `#1e1e30`)
- Show ROOT-LEVEL projects only in portfolio mode (highest fidelity), not child tasks
- Scrollable vertically (max-height with overflow-y: auto) — do NOT auto-expand panel height
- Keep existing zoom/nav controls, today line, status-coloured bars
- When a specific client is selected, show that client's projects only (already works via `panelRoots` filtering)

**Data source:** Existing `panelRoots` filtered to active projects with start/end dates.

### Panel 2d: Work Types (replaces Needs Attention)

**Content:** Horizontal bar chart showing count of active projects per work type category.

**Per row:**
- Label (right-aligned, ~120px): category name (e.g., "Research", "Strategy")
- Horizontal bar: width proportional to count, colour `#00e5ff` (cyan) at 70% opacity
- X-axis with count labels below

**Data source:** Count of active root tasks grouped by `work_type` field. Only categories with at least 1 active project are shown. Sorted by count descending.

**Empty state:** "No work types assigned yet. Add work types to projects in the detail overlay." — shown if no root tasks have `work_type` set.

**Interaction:** Clicking a bar could filter to that work type (stretch goal — not required for v4).

---

## Section 3: Bottom Row (4 panels, was 3)

Grid changes from `grid-template-columns: repeat(3, 1fr)` to `repeat(4, 1fr)`.

### Panel 3a: Completing Soon (unchanged)

Projects 60-99% complete, sorted by % descending, top 6. Health dot, title, client name, progress bar, percentage. Click opens overlay. Existing `renderPfCompletingSoon()` — no changes.

### Panel 3b: Upcoming Milestones (unchanged)

Root tasks due within 14 days, sorted by date ascending, top 6. Urgency-coded badges. Click opens overlay. Existing `renderPfUpcomingMilestones()` — no changes.

### Panel 3c: Team Workload (unchanged)

Horizontal bars per person, active task count, red/amber/green thresholds. Click filters by assignee. Existing `renderPfTeamWorkload()` — no changes.

### Panel 3d: Needs Attention (NEW — moved from main panels)

**Content:** List of blocked, overdue, and at-risk items sorted by severity.

**Per item:**
- Left colour border (3px): purple for blocked, red for overdue, orange for at risk
- Severity badge: "BLOCKED" (purple), "Xd late" (red), "AT RISK" (orange)
- Task title
- Context line: client — project

**Sort order:** Blocked first, then overdue (most days first), then at-risk.

**Show count:** Top 5 items with "+ N more" expandable link.

**Data source:** Same logic as current `renderPfNeedsAttention()`. Responds to client selection.

**Interaction:** Click opens `openDetailOverlay(taskId)`.

---

## Section 4: New Data — work_type Field

### Migration (029_work_type.sql)

```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_type TEXT;
```

### Server — PATCH /api/tasks/:id (line 4020)

Add `'work_type'` to the `allowedFields` array. The endpoint uses an explicit allowlist — new columns are silently ignored unless added here.

```javascript
// line 4020 — add 'work_type' to the end:
const allowedFields = ['title', 'parent_id', 'client_id', 'item_type', 'priority', 'health_state', 'description', 'assignees', 'hours_estimated', 'hours_spent', 'due_date', 'start_date', 'end_date', 'dependencies', 'collaborations', 'success_factor', 'repeat_rule', 'blocker_info', 'practice_area', 'sow_id', 'work_type'];
```

### Server — GET /api/sync/load (line 4935+)

The query uses `SELECT t.*` so the column loads automatically. But the frontend mapping is explicit — add the transform:

```javascript
// After line 4949 (sowId):
workType: r.work_type || null,
```

Also update the two other mapping blocks at the full-sync (around lines 4566/4585) and the upsert INSERT columns to include `work_type`.

### Server — computeDashboardSnapshot() (line 5120)

Add to the snapshot return object:

```javascript
on_track_count: activeRoots.length - overdue.length - atRisk.length,  // deduplicate overlaps
active_leads_count: 0,  // populated below
```

Add a leads query inside the function:

```javascript
const { rows: [leadCount] } = await pool.query(
  `SELECT count(*) as cnt FROM leads l
   JOIN lead_pipeline_stages s ON l.stage_id = s.id
   WHERE s.is_closed = false`
);
return { ...existing, active_leads_count: parseInt(leadCount.cnt) || 0 };
```

### Migration — snapshot columns (029_work_type.sql, same file)

```sql
ALTER TABLE dashboard_snapshots ADD COLUMN IF NOT EXISTS on_track_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dashboard_snapshots ADD COLUMN IF NOT EXISTS active_leads_count INTEGER NOT NULL DEFAULT 0;
```

### Server — GET /api/dashboard/snapshots (line 5165)

Add `on_track_count, active_leads_count` to the SELECT column list.

### Admin configuration — work type categories

Use the existing `lead_field_options` table with `field_name = 'work_type_categories'`. This is the same pattern used for leads work_type, service_line, and lead_source dropdowns.

**Seed data:** Insert default categories via migration:

```sql
INSERT INTO lead_field_options (field_name, value, sort_order, is_active) VALUES
  ('work_type_categories', 'Research', 1, true),
  ('work_type_categories', 'Strategy', 2, true),
  ('work_type_categories', 'Implementation', 3, true),
  ('work_type_categories', 'Assessment', 4, true),
  ('work_type_categories', 'Ongoing Mgmt', 5, true)
ON CONFLICT DO NOTHING;
```

**Admin UI:** Add a "Work Types" section to `renderLeadsSettings()` (or a new section in Settings > Configuration). Same tag-based UI as existing field options: display tags with delete buttons, input + "Add" button. Uses existing endpoints:
- `POST /api/leads/field-options` with `{ field_name: 'work_type_categories', value: 'New Category' }`
- `DELETE /api/leads/field-options/:id`

**Fetch categories:** Already returned by `GET /api/leads/config` which loads all `lead_field_options` grouped by `field_name`.

### Project detail overlay

Add a `work_type` dropdown to the detail overlay for root tasks (no parentId). Populated from the `work_type_categories` field options (already in `_leadsConfig.fieldOptions`). On change, PATCH `/api/tasks/:id` with `{ work_type: selectedValue }`.

### KPI — Active Leads count (frontend)

The dashboard already loads leads config. For the KPI count, call `GET /api/leads/pipeline/summary` which returns stage-wise counts. Sum all counts where the stage `is_closed = false`. Cache alongside `_portfolioSnapshots`.

---

## Section 5: Client Abbreviation

For the Upcoming Milestones panel, derive a short client code.

**Existing field:** Migration `019_client_abbreviation.sql` already added an `abbreviation` column to the `clients` table. The client creation endpoint (POST /api/clients, line 3078) auto-generates abbreviations. So this data already exists — use it from the task's client record.

**Frontend access:** The `frontendBriefs` object in sync/load already maps client names. If the abbreviation isn't exposed yet, add it to the briefs mapping (line 4955+). Then look up by `getTaskClient(task)` to get the abbreviation.

**Fallback:** If no abbreviation stored, compute at render time: split by spaces, take first letter of each word, uppercase, max 3 chars.

---

## Interaction Model

- **Client filtering:** All panels (main 4 + bottom 4) filter when a client is selected. This already works for sidebar + some panels. New panels must accept `panelTasks`/`panelRoots` as input.
- **Detail overlay:** Clicking any actionable item in any panel opens `openDetailOverlay(taskId)`.
- **No page navigation:** Dashboard is self-contained. All drill-down happens via the overlay.

---

## What Gets Removed

- `renderPfWorkCompleted()` — replaced by Progress Status donut
- `renderPfHealthScorecard()` — replaced by Upcoming Milestones
- `renderPfNeedsAttention()` in main panels — moved to bottom row (logic reused)
- Old KPI strip metrics (Hours Spent, Hours Est., Overdue, Blocked)
- `_portfolioSnapshots` usage in Work Completed chart (snapshots still used for KPI deltas)

Code is commented out, not deleted (per Glen's standing directive).

---

## Out of Scope

- External charting library — SVG donut is hand-rolled
- Click-to-filter on donut segments or work type bars (stretch goal for later)
- Client abbreviation admin overrides
- Mobile responsive changes for the new panels (separate pass)
- Changes to the client sidebar or tab bar
