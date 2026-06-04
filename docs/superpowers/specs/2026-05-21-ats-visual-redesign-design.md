# ATS Visual Redesign — Design Spec

**Date:** 2026-05-21
**Branch:** feature/command-centre
**Status:** Approved

## Overview

Rebuild the hiring UI in `nbi_project_dashboard.html` to feel like a proper applicant tracking system. The backend is solid (553 tests, all passing). The UI needs richer cards, new views (Database, Calendar), an interview tracking system, and better spacing throughout. Dark theme retained; references (Hirerise, Bridge) used for structural patterns only.

## Landing State — Summary Banner

When the hiring view loads, a summary banner appears above the tab bar. One row, always visible regardless of active tab. Shows at-a-glance status:

- **Interviews today:** count + "next: Sarah Chen, 2pm Technical" (or "none today")
- **Needs action:** count of candidates with red action state (unassigned or >14 days in stage)
- **Offers pending:** count of candidates in offer stage
- **Open positions:** count of positions with status "open"

Each item is clickable: "Interviews today" switches to Calendar tab filtered to today. "Needs action" switches to Database tab sorted by days descending. "Offers pending" switches to Pipeline tab filtered to offer stage. "Open positions" switches to Positions tab.

The banner is compact (single row, ~48px height) and doesn't dominate — it's a quick-scan strip, not a dashboard.

## Navigation

Top tab bar below the summary banner:

```
[ Pipeline | Positions | Database | Calendar | Metrics ]
```

- **Pipeline** tab retains Kanban/By Client as a sub-toggle within its controls bar
- Each tab has its own filter/action controls below the tab bar
- Active tab highlighted with underline accent (purple)
- Tab state stored in `window._hiringActiveTab`

### Cross-Tab Filtering
All tabs that show candidate data (Pipeline, Database, Calendar) include a **Position** filter dropdown in their controls bar alongside Client, Stage, and Source. Selecting a position filters to candidates linked to that `position_id`. This is essential with 20 positions — the ability to slice by "show me everything for the QA Lead role" must work everywhere.

## 1. Candidate Cards (Pipeline View)

### Card Dimensions
- Width: 220px (up from 150px)
- Kanban lanes widen to accommodate (240px lane width with padding)
- Lane gap increased for breathing room

### Card Anatomy (top to bottom)

**Row 1 — Identity:**
- Coloured initials avatar (38px circle, hue derived from name hash via deterministic algorithm)
- Name: 14px bold, truncated with ellipsis if long
- Role: 12px muted colour

**Row 2 — Classification:**
- Source badge (left): LinkedIn / Referral / Agency / Job Board / Direct / Other — blue-tinted pill
- Stage badge (right): colour-coded pill matching existing stage colours (sourcing=grey, interviews=amber, offer=purple, onboarding=green, hired=success green)

**Row 3 — Meta (separated by top border):**
- Assignee faces (left): overlapping 22px initials circles from `stage_assignees[currentStage]`, max 3 shown + "+N" overflow
- CV indicator: document icon, shown only when `has_cv` is true
- Comment count: speech bubble + count, shown only when count > 0
- Days in stage (right): "5d" / "2w" format. Colour: default white, amber after 7 days, red after 14 days. Calculated from `stage_changed_at`.

**Left border — Action state:**
- Red (3px): unassigned in current stage OR days > 14
- Amber (3px): days > 7
- Default (no override): on track
- Grey + opacity reduction: archived candidates (existing behaviour)

### Avatar Colour Algorithm
Hash the candidate name to a number, map to one of 8-10 predefined hues that work well on dark backgrounds. Same name always produces the same colour.

## 2. Database / Search View (New Tab)

### Layout
Full-width data table with controls above.

### Controls Bar
- Search input (left, flex-grow): full-text search across name, role, client, source
- Filter dropdowns: Stage, Client, Source — each a `<select>` styled as a button
- Active filters shown as removable chips below the controls bar

### Table Columns
| Column | Content | Sortable |
|---|---|---|
| Candidate | Avatar (22px) + name | Yes (alpha) |
| Role | Role text | Yes (alpha) |
| Stage | Colour-coded badge | Yes (pipeline order) |
| Source | Source text | Yes (alpha) |
| Days | Days in stage, colour-coded | Yes (numeric) |
| Assignee | Overlapping avatar circles | No |

### Behaviour
- Click row: opens existing `openCandidateDetail(id)` panel
- Default sort: days in stage descending (stale candidates surface first)
- Search is client-side filtering on already-loaded `_candidatesData`
- Filter chips are additive (AND logic)
- Pagination: show count footer ("Showing X of Y candidates"), scroll for now — paginate if performance is an issue

### Data Requirements
The GET `/api/candidates` endpoint must be extended to return the new fields needed by both cards and the table:
- `source` — new column
- `stage_changed_at` — new column
- `comment_count` — via LEFT JOIN subquery: `(SELECT COUNT(*)::int FROM candidate_comments cc WHERE cc.candidate_id = ca.id) AS comment_count`
- `interview_count` — via LEFT JOIN subquery: `(SELECT COUNT(*)::int FROM interviews i WHERE i.candidate_id = ca.id AND i.outcome = 'pending') AS pending_interview_count`

The subquery approach is the right trade-off: no denormalised counters to maintain, no extra round trips, and at the scale we're operating (hundreds of candidates, not millions) the query cost is negligible.

## 3. Calendar View (New Tab)

### Layout
Week grid. Time column on the left (30-minute slot rows, 8am-6pm default range). Weekdays across the top (Mon-Fri). Week/Month toggle top-right. Nav arrows for week/month navigation.

The grid uses CSS grid with each row = 30 minutes. An interview block's `grid-row` span is calculated from `duration_minutes / 30`. A 60-min interview spans 2 rows. A 30-min phone screen spans 1 row. A 90-min final spans 3 rows. Blocks are positioned by `grid-row-start` calculated from `(hour - 8) * 2 + (minutes >= 30 ? 1 : 0) + 1` (snapped to nearest 30-min boundary).

### Interview Blocks

**Standard block (60+ minutes):**
- Candidate avatar (18px initials circle)
- Candidate name (11px bold, colour matches interview type)
- Interview type (9px muted)
- Time range + location (8px, e.g. "9:00 – 10:00 · Zoom")
- Interviewer avatar (16px circle, bottom-right)
- Left border colour: matches interview type
- Background: type colour at 20% opacity

**Compact block (30 minutes):**
- Single line: candidate avatar (14px) + name + type abbreviation (e.g. "SC · Tech")
- Time shown on hover tooltip
- Same colour coding

### Overlapping Interviews
When two or more interviews occupy the same time slot on the same day, the day column subdivides horizontally. Each overlapping block gets equal width (2 overlaps = 50% each, 3 = 33% each). CSS: overlapping blocks share the same grid row/column but use `position: absolute` within the day cell with calculated `left` and `width` percentages.

### Interview Type Colours
| Type | Colour |
|---|---|
| Phone Screen | Blue (#3b82f6) |
| Technical | Purple (#7c3aed) |
| Cultural | Amber (#f59e0b) |
| Final | Green (#10b981) |

### Legend
Colour key at bottom of the calendar showing all interview types.

### Week View Interactions
- Click block: opens candidate detail panel with Interview tab active
- Click empty slot: opens Schedule Interview modal pre-filled with that day/time
- "Schedule Interview" button in controls bar: opens modal without pre-fill

### Month View
Grid of day cells (7 columns x 5-6 rows). Each cell shows:
- Day number
- Coloured dots for each interview that day (type colour), max 4 dots then "+N"
- Hover on a dot: tooltip with candidate name + type + time
- Click a day cell: navigates to that week in week view, scrolled to that day
- Click a dot: opens candidate detail panel directly

Today's cell is highlighted with a subtle border accent.

### Schedule Interview Modal
Modal (consistent with existing create-candidate modal pattern) with fields:
- Candidate (searchable select from active candidates)
- Interview type (select: Phone Screen / Technical / Cultural / Final)
- Date + Time (date picker + time input)
- Duration (select: 30m / 45m / 60m / 90m, default 60m)
- Interviewer (text input — name of the person conducting)
- Location (text input — Zoom link, "Office", phone number, etc.)
- Notes (textarea, optional — pre-interview notes)

On submit, the frontend first calls a **conflict pre-check**: `GET /api/interviews/check-conflict?interviewer=X&scheduled_at=Y&duration=Z`. If a conflict exists, a warning banner appears in the modal: "James P already has an interview at this time (Sarah Chen, Technical) — schedule anyway?" with Confirm / Cancel buttons. Only on Confirm does the POST happen.

## 4. Interview System

### Database: `interviews` Table (new migration)

```sql
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    interviewer_name TEXT NOT NULL,
    interview_type TEXT NOT NULL DEFAULT 'phone_screen',
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60,
    location TEXT,
    notes TEXT,
    outcome TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**interview_type values:** phone_screen, technical, cultural, final
**outcome values:** pending, passed, failed, rescheduled, no_show

### API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/interviews` | List interviews. Filters: `?candidate_id=`, `?from=`, `?to=`, `?interviewer=` |
| GET | `/api/interviews/:id` | Single interview detail |
| GET | `/api/interviews/check-conflict` | Pre-check for scheduling conflicts (see Conflict Check section) |
| POST | `/api/interviews` | Create interview |
| PATCH | `/api/interviews/:id` | Update interview (notes, outcome, reschedule) |
| DELETE | `/api/interviews/:id` | Remove interview (admin only) |

### Conflict Check Endpoint
`GET /api/interviews/check-conflict?interviewer_name=X&scheduled_at=Y&duration_minutes=Z&exclude_id=W`

Queries for existing interviews where `interviewer_name` matches AND time ranges overlap (excluding the interview being edited, if `exclude_id` is provided). Returns `{ conflict: false }` or `{ conflict: true, conflicting_interview: { id, candidate_name, interview_type, scheduled_at } }`.

Called by the frontend before POST (create) or PATCH (reschedule). The create/update endpoints themselves do NOT block on conflicts — the pre-check + user confirmation in the modal is the enforcement mechanism.

### Candidate Detail Panel — All Tabs

The detail panel (620px, slides in from right) has 4 tabs. The stage bar remains pinned above the tabs (existing behaviour).

**Profile Tab:**
- Name (text input)
- Role (text input)
- Source (select dropdown: LinkedIn / Referral / Agency / Job Board / Direct / Other)
- LinkedIn URL (URL input)
- Due date (date input)
- Client (select dropdown)
- Position (select dropdown — links candidate to a hiring position)
- CV upload/download (PDF only, existing)
- Start date (date input, shown when stage = offer, existing)
- Onboarding links (shown when stage = onboarding, existing)
- Notes (textarea)

**Interviews Tab:**
- List of all interviews for this candidate (sorted by date, newest first)
- Each interview row: type badge, date/time, interviewer, outcome badge, notes preview
- Outcome can be set inline via a dropdown on each interview row (pending / passed / failed / rescheduled / no_show)
- Editing an interview's notes: click row to expand, textarea appears
- "Schedule Interview" button at top (pre-fills candidate in the modal)
- Empty state: "No interviews scheduled" with a prominent "Schedule first interview" button

**Activity Tab:**
- Chronological timeline (newest first) from `candidate_activity` table
- Each entry: icon by event type, description, actor name, relative timestamp ("2 hours ago", "3 days ago")
- Comments are shown inline in the activity feed (with the full body, not just 80-char preview)
- "Add comment" input at top of the activity tab — posting a comment adds both a `candidate_comments` row and a `comment_added` activity entry
- The activity tab is the unified history: comments + stage changes + interviews + CV uploads all in one timeline

**Settings Tab:**
- Stage assignees management (existing): per-stage chips with add/remove
- Reject / Decline buttons with reason form
- Reopen button (if archived)
- Clear Candidate button (existing)
- Delete button (admin only, existing)
- Danger zone styling for destructive actions

### Create Candidate Modal — Updated

The existing create modal adds a **Source** field:
- Name (text input, required)
- Role (text input)
- Client (select dropdown)
- Position (select dropdown — optional, links to a hiring position)
- Source (select dropdown: LinkedIn / Referral / Agency / Job Board / Direct / Other — optional but prompted)
- Due date (date input)

Source is not required but the field is visible and easy to fill at creation time, which maximises capture rate.

### Interview Outcomes and Stage Progression
Setting an interview outcome does NOT automatically advance the candidate's stage. Stage changes remain manual (drag-and-drop or stage selector). Rationale: a candidate may have multiple interview rounds within the "interviews" stage — auto-advancing after one "passed" would be wrong. However, when all interviews for a candidate have outcome "passed" and the candidate is still in "interviews" stage, show a subtle prompt on the candidate card/detail: "All interviews passed — ready to advance?"

## 5. Activity Trail

### Database: `candidate_activity` Table (new migration)

```sql
CREATE TABLE candidate_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    detail TEXT,
    actor TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**event_type values:**
- `stage_change` — detail: "sourcing → interviews"
- `interview_scheduled` — detail: "Technical with James P, Thu 22 May 10:00"
- `interview_outcome` — detail: "Technical: passed"
- `comment_added` — detail: first 80 chars of comment body
- `cv_uploaded` — detail: filename
- `cv_removed` — detail: filename
- `source_set` — detail: "LinkedIn"
- `assignee_added` — detail: "James P added to interviews stage"
- `assignee_removed` — detail: "James P removed from interviews stage"
- `created` — detail: "Created by [actor]"
- `archived` — detail: "Hired" or "Rejected: [reason]" or "Declined: [reason]"
- `reopened` — detail: null

### Auto-logging
Activity entries are created server-side automatically inside the relevant API endpoints. The `actor` field is set from `req.user.name` (the authenticated user). No manual activity creation endpoint — this is an audit trail, not a form.

### API Endpoint

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/candidates/:id/activity` | List activity for candidate, newest first. Optional `?limit=` (default 50) |

## 6. Rejected / Declined States

### New Candidate Outcomes
In addition to the existing stage pipeline (sourcing → interviews → offer → onboarding → hired), candidates can exit the pipeline with a reason:

- **Rejected** — the team decided not to proceed. Reason required (free text, e.g. "Not enough experience", "Failed technical round", "Culture fit concerns").
- **Declined** — the candidate chose not to proceed. Reason required (e.g. "Accepted another offer", "Salary expectations too high", "Role not a fit").

### Implementation
These are NOT new stages in the pipeline. They are archival outcomes stored via:
- `archived_at` — set to NOW() (existing field)
- `archive_reason` — new TEXT column on candidates: "rejected" or "declined"
- `archive_detail` — new TEXT column: the reason text

### UI
- "Reject" and "Decline" buttons on the candidate detail panel (alongside existing "Archive" flow)
- Clicking either opens a small form: reason text (required) + confirm button
- Rejected/declined candidates appear greyed in the pipeline (same as current archived behaviour)
- Database view: a "Status" filter with options: Active / Hired / Rejected / Declined / All
- Rejected/declined candidates show a badge on their card: red "Rejected" or grey "Declined"

### Activity Trail Integration
Rejecting or declining a candidate creates an activity entry: `archived` with detail "Rejected: {reason}" or "Declined: {reason}".

## 7. Database Migrations

### Migration: `candidates.source`
```sql
ALTER TABLE candidates ADD COLUMN source TEXT;
```
No default — existing candidates will have NULL source, displayed as "—" in the UI.

### Migration: `candidates.stage_changed_at`
```sql
ALTER TABLE candidates ADD COLUMN stage_changed_at TIMESTAMPTZ DEFAULT NOW();
```
Backfill existing candidates: `UPDATE candidates SET stage_changed_at = updated_at;`
Note: `updated_at` may reflect non-stage edits, so days-in-stage for backfilled candidates could be slightly understated. This is the best available approximation — accuracy improves immediately for all future stage changes.

Server-side: on PATCH when `stage` field changes, also set `stage_changed_at = NOW()`.

### Migration: `candidates.archive_reason` and `candidates.archive_detail`
```sql
ALTER TABLE candidates ADD COLUMN archive_reason TEXT;
ALTER TABLE candidates ADD COLUMN archive_detail TEXT;
```
`archive_reason` is one of: "hired", "rejected", "declined" (or NULL for non-archived).
`archive_detail` is free text — the reason for rejection/decline.

### Migration: `candidate_activity` Table
```sql
CREATE TABLE candidate_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    detail TEXT,
    actor TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_candidate_activity_candidate ON candidate_activity(candidate_id);
```

### Migration: `candidate_comments` Table
```sql
CREATE TABLE candidate_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints for Comments

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/candidates/:id/comments` | List comments for candidate |
| POST | `/api/candidates/:id/comments` | Add comment |
| DELETE | `/api/candidates/:id/comments/:commentId` | Remove comment (admin) |

## 8. Position Cards (Existing Tab, Enhanced)

### Card Anatomy (top to bottom)

**Row 1 — Header:**
- Position title (16px bold)
- Status badge: Open (green) / Closed (grey) / On Hold (amber)

**Row 2 — Details:**
- Seniority level (e.g. "Senior") + Employment type if available
- Salary range (NBI users only, hidden for client users via existing `isClientUser()` guard)
- Client name

**Row 3 — Pipeline bar:**
Full-width horizontal bar (12px height, rounded) divided proportionally by stage. Each segment colour-coded to match stage colours. Hover segment shows tooltip: "Interviews: 4 candidates". Width ratio = candidates in stage / total candidates for this position.

**Row 4 — Meta:**
- Candidate count badge: "12 candidates"
- JD indicator: document icon if `description` is non-empty
- Days since posted: calculated from `created_at`

### Card Sizing
- Width: fills grid cell (responsive grid: `repeat(auto-fill, minmax(280px, 1fr))`)
- Padding: 16px
- Gap between cards: 16px

## 9. Metrics View (Existing Tab, Enhanced)

A `loadHiringMetrics` function was rebuilt in the prior session with summary stat cards and a pipeline funnel. This redesign extends it:

- **Summary stat cards** (existing, retained): total candidates, by stage counts, avg days to hire, open positions
- **Pipeline funnel** (existing, retained): conversion percentages between stages
- **Source effectiveness** (new): candidates by source, hire rate per source. Bar chart or simple table. Note: source will be NULL for candidates added before this redesign — the chart shows "Unknown" for those and improves as new candidates get source set. Existing candidates can have source backfilled via the detail panel.
- **Interview activity** (new): interviews this week/month count, outcomes breakdown (passed/failed/pending), busiest interviewer
- **Time-in-stage distribution** (new): average days per stage, highlighting bottleneck stages

All computed client-side from loaded candidates, interviews, and positions data.

## 10. Data Loading Strategy

### On Hiring View Init (any tab)
- `loadCandidates()` — GET `/api/candidates` (already exists, extended with new fields). Populates `window._candidatesData`. This is the core dataset used by Pipeline, Database, and the summary banner.
- `loadHiringPositions()` — GET `/api/hiring-positions` (already exists). Populates `window._hiringPositionsData`. Used by Positions tab, filter dropdowns, and pipeline bars.

### Lazy-Loaded on Tab Switch
- **Calendar tab first open:** `loadInterviews()` — GET `/api/interviews?from={weekStart}&to={weekEnd}`. Populates `window._interviewsData`. Re-fetches when navigating to a different week/month. Cached per week — switching back to an already-loaded week doesn't re-fetch.
- **Metrics tab first open:** triggers both `loadCandidates()` refresh and `loadInterviews()` if not already loaded, then computes metrics client-side.

### On Candidate Detail Open
- GET `/api/candidates/:id` — full candidate detail (existing, extended with source, stage_changed_at, archive_reason, archive_detail)
- GET `/api/candidates/:id/activity` — activity timeline (lazy, only when Activity tab is opened)
- GET `/api/candidates/:id/comments` — comments (lazy, only when Activity tab is opened — merged into activity timeline display)
- Interviews for this candidate are filtered from `_interviewsData` if loaded, otherwise fetched via GET `/api/interviews?candidate_id=X`

### Incremental Refresh
The existing 10-second polling mechanism (`loadCandidates()` on interval) is retained. Interview data is not polled — it refreshes on Calendar tab switch or when the user schedules/updates an interview (optimistic update + refetch).

## 11. Spacing & Polish

- Card padding: 14px (up from 10px)
- Lane width: 240px (up from 180px)
- Lane gap: 16px (up from current)
- Detail panel: 620px width (up from 520px)
- Section spacing within panels: 16px gaps
- Font size floors: 12px minimum for any readable text (Glen's glasses — see feedback)
- Stage badges: consistent pill sizing across all views

## 12. Files Changed

### New Files
- `dashboard-server/migrations/051_candidate_source_stage_changed.sql` — source, stage_changed_at columns + backfill
- `dashboard-server/migrations/052_archive_reason.sql` — archive_reason, archive_detail columns
- `dashboard-server/migrations/053_candidate_activity.sql` — candidate_activity table + index
- `dashboard-server/migrations/054_candidate_comments.sql` — candidate_comments table
- `dashboard-server/migrations/055_interviews.sql` — interviews table

### Modified Files
**IMPORTANT — verify before planning:** The handoff references hiring code at line numbers in `nbi_project_dashboard.html`, but modular files also exist at `public/js/views/hiring.js` and `public/css/views/hiring.css`. The implementation plan must verify which is canonical and where changes go. Do not assume — read the files.

- `nbi_project_dashboard.html` and/or `dashboard-server/public/js/views/hiring.js` — hiring view JS (cards, database tab, calendar tab, interview forms, navigation tabs)
- `dashboard-server/public/css/views/hiring.css` — all hiring styles (cards, table, calendar grid, spacing)
- `dashboard-server/routes/hiring.js` — new API endpoints (interviews CRUD, comments CRUD, activity log, conflict check, reject/decline actions, source field on candidates)
- `dashboard-server/server.js` — mount new routes, extend GET /api/candidates query (source, stage_changed_at, archive_reason, comment_count, pending_interview_count), stage_changed_at auto-set on PATCH, activity trail auto-logging in all candidate mutation endpoints

### Test Files
- New unit tests for interview CRUD, comments CRUD, conflict detection, source field
- New unit tests for stage_changed_at auto-update
- Updated e2e tests for new UI views

## 13. Out of Scope

- Google Calendar sync/integration
- Availability matching / slot booking
- Email notifications for interviews
- Candidate photo uploads (avatars are generated from initials)
- Bulk operations on candidates
- Tags/labels on candidates (can be added later with a JSONB column)
