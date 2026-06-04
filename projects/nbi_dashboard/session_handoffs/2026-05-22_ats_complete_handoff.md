# Handoff: ATS Frontend Build + Full Dashboard Audit — 2026-05-22

## What was done across this session (and the preceding one)

### ATS Frontend Build (Tasks 6-12 from spec)

**Spec:** `docs/superpowers/specs/2026-05-21-ats-visual-redesign-design.md`
**Plan:** `docs/superpowers/plans/2026-05-21-ats-visual-redesign.md`
**Branch:** `feature/command-centre`

#### Tab Navigation + Summary Banner
- Replaced 4-button toggle (Kanban/By Client/Positions/Metrics) with 5-tab system: Pipeline | Positions | Database | Calendar | Metrics
- `renderHiringView` (line ~19784) dispatches to per-tab render functions
- Summary banner above tabs: interviews today (preloaded via authFetch on initial data load), needs action, offers pending, open positions — each clickable to navigate to relevant tab
- Client users with `client_role: 'admin'` (e.g. Lorenza) see all 5 tabs. Regular client members see pipeline only.
- `window._hiringActiveTab` stores active tab; `canSeeTabs` computed from `!isClientUser() || isClientAdmin()`

#### Candidate Card Redesign
- `renderHiringCard` (line ~19468) renders `.ats-card` with: coloured initials avatar (`candidateAvatarHtml`), name, role, client name, source badge, stage badge, assignee faces (max 3 + overflow), CV indicator, comment count, days-in-stage (`daysInStageHtml`), contract status pill, rejection badge
- `candidateAvatarHtml(name, size)` — deterministic hue from name hash across 10 colours
- `daysInStageHtml(stageChangedAt)` — amber >7d, red >14d, week format for 14+
- Left border: red >14d, amber >7d or unassigned (but only after 2+ days to suppress noise on new imports)
- Mobile: "Move to..." stage dropdown visible at <768px via `.ats-mobile-move` CSS

#### Kanban (Pipeline Tab)
- `renderPipelineTab` (line ~19855) with Kanban/By Client sub-toggle
- Lanes use `flex: 1 1 0` — responsive, fill available width on any screen size
- Position filter dropdown alongside Client, Stage, Show Archived
- Lane drag-to-reorder: grab column header to rearrange stages. `onLaneDragStart/End` + document-level dragover/drop handlers. Saves order to `/api/clients/:id/hiring-stages` when client is selected. `onboarded` column pinned to end.
- Card drag between lanes preserved — `onHiringCardDragStart` has `ev.stopPropagation()` to prevent lane drag interference
- Drag handlers updated to match both `.hiring-lane` and `.ats-lane` selectors

#### Database/Search View
- `renderDatabaseTab` (line ~20035) — full-width sortable table
- Search input (client-side filter across name/role/client/source)
- 4 filter dropdowns: Stage, Client, Source, Position — with removable chips
- 3 sort modes: name (asc/desc), stage (pipeline order), days (asc/desc)
- **Inline editable dropdowns** on Stage, Source, Assignee columns — `.ats-inline-select` class with hover border affordance
- Assignee column shows name chips with × remove buttons + "+" add dropdown
- `dbAddAssignee` and `dbRemoveAssignee` functions handle stage_assignees PATCH
- "+ Candidate" button in controls bar
- Click name/role → opens detail panel

#### Calendar View
- `renderCalendarTab` (line ~20137, async) — fetches `/api/interview-rounds?from=X&to=Y` via authFetch
- **Week view:** CSS grid with 54px time column + 5 day columns, 30-min slot rows (8am-6pm). Interview blocks positioned by slot, height by duration. Colour-coded by type (Technical=#7c3aed, Phone Screen=#3b82f6, Cultural=#f59e0b, Final=#10b981). Click block → candidate detail. Click empty slot → schedule modal pre-filled with date+time.
- **Month view:** 7-column grid with day cells showing interview dots. Click day → jumps to that week's week view (proper Monday-to-Monday calculation).
- Week/Month toggle, prev/next/today navigation, position filter dropdown
- Legend with colour dots
- `window._calendarWeekOffset`, `_calendarMonthOffset`, `_calendarViewMode`, `_calendarFilterPosition` track state

#### Schedule Interview Modal
- `openScheduleInterviewModal(prefillCandidateId, prefillDate, prefillTime)` (line ~20422)
- Fields: Candidate dropdown, Interview Type (Phone Screen/Technical/Cultural/Final), Date, Time, Duration (30/45/60/90), Interviewer, Location
- Conflict pre-check via `GET /api/interview-rounds/check-conflict` — warns if interviewer is double-booked
- `submitScheduleInterview` → `doCreateInterview` → POST `/api/interview-rounds`
- **Critical fix applied:** `modal.style.display = 'flex'` was missing — modal was invisible without it

#### Candidate Detail Panel Enrichment
- **Interviews tab:** Colour-coded round cards (left border by type), inline outcome selector dropdown (Pending/Passed/Failed/Rescheduled/No-show). `updateInterviewOutcome(interviewId, outcome)` PATCHes `/api/interview-rounds/:id`. "+ Schedule" button opens modal.
- **Activity tab:** Contract Status dropdown at top (creation-of-contract / contract-sent / edits-on-contract / contract-in-review / contract-signed). Unified timeline from `/api/candidates/:id/activity` (UNION of stage_history + candidate_activity + comments). Icons per event type.
- **Settings tab:** Reject button (expandable form with category dropdown + reason textarea) and "Candidate Declined" one-click archive. `hiringRejectCandidate(id)` and `hiringArchiveWithReason(id, category)`.
- **Profile tab:** Source and source_detail dropdowns, Position dropdown — all already existed from prior session

#### Positions Tab
- `renderPositionsTab` (line ~19944) uses existing `renderPositionCard` with position cards showing client name chip (blue)
- Sort modes: Priority, Start Date, Status, Client
- Status filter (Open/Filled)
- **"+ Position" button** → `openCreatePositionModal()` with Title, Client, Seniority, Type, Salary Range, Location. Focus trap + Escape handler. `submitCreatePosition()` POSTs `/api/hiring-positions`.

#### Metrics Tab
- `renderMetricsTab` (line ~20324) — 4 sections:
  1. Summary stat cards (active candidates, archived, avg days in stage, sources used)
  2. Pipeline funnel (per-stage bar with count + percentage)
  3. Source effectiveness (horizontal bars: total vs progressed past sourcing, conversion %)
  4. Average time in stage (per-stage bar, colour-coded red/amber/green)
  5. Per-client detailed metrics (existing `loadHiringMetrics` with client dropdown)

### Data Import: Couch Heroes Candidate Tracker

- `scripts/import-ch-candidates.js` — imported 39 candidates from Excel (`Couch Heroes Candidate Tracker.xlsx` Master Overview sheet)
- Mapped stages: Screening→sourcing, 1st/2nd/3rd Interview→interviews, Offer→offer, Rejected→archived
- All 39 matched to positions (including HR Ops → HR Operations fix)
- 36 interview rounds created from per-role sheets with scorecards
- Salary expectations stored as internal comments
- `scripts/verify-ch-import.js` — field-by-field verification, 0 mismatches
- `scripts/fix-ch-stage-dates.js` — backfilled stage_changed_at from interview dates

### Backend Changes

**Migration 053:** `contract_status` TEXT column on candidates table
**`routes/hiring.js` changes:**
- GET /api/candidates now returns `contract_status`
- PATCH validates `contract_status` against 5 valid values
- `contract_status` added to buildPatchQuery allowed fields
- PUT /api/clients/:id/hiring-stages now auto-normalises keys (lowercase, slugify) before validation — no more "invalid key" errors from capitalised input
- GET /api/candidates/:id/comments fixed to ORDER BY ASC (was DESC)
- POST /api/candidates/:id/comments body length cap explicitly 5000 (was 50000 default)

**`routes/users.js` changes:**
- Client users now see their own staff + specific NBI contacts per client:
  - Couch Heroes: Glen Pryer, Magnus Pryer
  - Lighthouse Games/Studios: Glen Pryer, Magnus Pryer, Ruan, Stavros, Amir Didar
  - Default fallback: Glen Pryer, Magnus Pryer
- `NBI_CONTACTS_BY_CLIENT` lookup at line ~15 of users.js

### Client Access Control

- Client admin users (`client_role: 'admin'`) now see all 5 ATS tabs + filter controls
- Regular client members still locked to pipeline-only kanban
- 403 errors from `requireNBI` endpoints silently suppressed for all client users (both `authFetch` and `apiCall`)
- Salary fields remain hidden from all client users (NBI-only policy)
- Stage editor cog hidden from client users (NBI admin only)

### Full Dashboard Usability Audit

**Report:** `projects/nbi_dashboard/UI-REVIEW.md`
**47 findings** across 15 views. Fixed in this session:

| # | Fix | Severity |
|---|-----|----------|
| 1 | Password confirm field + mismatch validation | CRITICAL |
| 2 | Create Position modal focus trap + Escape | CRITICAL |
| 3 | Client admin invite shows generated credentials | CRITICAL |
| 4 | 59 hardcoded colours (#888, #8b949e, #666) → theme tokens | HIGH |
| 5 | `?` keyboard shortcut help modal (showKeyboardShortcutHelp) | HIGH |
| 6 | Board lane "+N more" → clickable link to tree view | HIGH |
| 7 | Mobile ATS kanban "Move to..." dropdown at <768px | HIGH |
| 8 | Quick-add client dropdown: "Select Client..." + red border on error | HIGH |
| 9 | Board empty lane: styled italic placeholder | MEDIUM |
| 10 | CC retry link: --primary → --accent-text | MEDIUM |
| 11 | Schedule modal invisible (display:flex fix) | CRITICAL (earlier) |
| 12 | Client filter resets on hiring view load | HIGH (earlier) |

### Remaining from audit (not fixed)

1. **CRITICAL: Finance data in localStorage only** (line 15377) — needs full server migration: create finance_entries table, API endpoints, one-time localStorage→server migration on first load. Separate session.
2. **HIGH: Navigation shortcuts collide with contentEditable** (line 26814) — contenteditable check may miss nested elements. Edge case.
3. **MEDIUM: Drag-and-drop on Leads and Projects Board kanban** — no mobile alternative for those views (only Hiring has the mobile dropdown)
4. **MEDIUM: Receipt upload progress indicator** (Expenses)
5. **MEDIUM: No "unsaved changes" warning on view switch**
6. **MEDIUM: Print stylesheet not optimised for Reporting/Finances**
7. **LOW: 11 low-severity items** — see UI-REVIEW.md for full list

### Test Infrastructure

- `baseline-schema.sql` fixed: candidate_activity FK moved after candidates PK, `CREATE OR REPLACE FUNCTION` for decode_html_entities, contract_status column added
- `kanban-drag.spec.js` updated: `.hiring-card` → `.ats-card` selector
- **553/553 unit tests green, 19/19 e2e tests green**

## Current State

- **Branch:** `feature/command-centre`
- **PM2:** nbi-dashboard running on :8888 (restart #71)
- **HTML file:** ~25,100 lines
- **hiring.js:** ~1,300 lines
- **Migrations applied:** 051 (stage_changed_at), 052 (candidate_activity), 053 (contract_status)
- **ATS data:** 40 Couch Heroes candidates (39 imported + 1 pre-existing), 30 positions, 36 interview rounds

## Key File Locations

| File | Purpose |
|---|---|
| `nbi_project_dashboard.html` | Entire SPA frontend |
| `dashboard-server/routes/hiring.js` | Hiring API (candidates, positions, interviews, comments, stages, activity) |
| `dashboard-server/routes/hiring-metrics.js` | Metrics API (time-in-stage, pipeline, time-to-hire) |
| `dashboard-server/routes/users.js` | User API (client-scoped NBI contact visibility) |
| `dashboard-server/migrations/053_contract_status.sql` | Contract status migration |
| `dashboard-server/scripts/import-ch-candidates.js` | CH candidate import script |
| `dashboard-server/scripts/verify-ch-import.js` | Import verification script |
| `dashboard-server/scripts/fix-ch-stage-dates.js` | Stage date backfill script |
| `projects/nbi_dashboard/UI-REVIEW.md` | Full 47-finding usability audit |
| `docs/superpowers/specs/2026-05-21-ats-visual-redesign-design.md` | ATS design spec |
| `docs/superpowers/plans/2026-05-21-ats-visual-redesign.md` | ATS implementation plan (13 tasks) |

## What Glen needs to UAT

1. Open worksage.nbi-consulting.com → Hiring
2. Check all 5 tabs render with data (Pipeline, Positions, Database, Calendar, Metrics)
3. Try the schedule interview modal from Calendar → "+ Schedule"
4. Click a candidate card → check all 4 detail tabs (Profile, Interviews, Activity with contract status, Settings with reject/decline)
5. On Database tab: try changing Stage, Source, and Assignee inline
6. On Positions tab: try "+ Position" button
7. Press `?` anywhere to see keyboard shortcuts
8. Ask Lorenza to log in and verify she sees all tabs, no error toasts, and only Couch Heroes data
9. Try dragging kanban columns by their headers to reorder
10. Check light theme — hardcoded colours should now use theme tokens
