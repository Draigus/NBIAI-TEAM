# Handoff: ATS Frontend Build — 2026-05-21

## What was done this session

### Brainstorming & Design (visual companion used)
- Glen approved 5 design decisions via browser mockups:
  1. **Candidate cards**: 220px, coloured initials avatar, source badge, stage badge, assignee faces, CV/comment/days indicators
  2. **Database/Search view**: Full table with search, filter dropdowns, removable chips, sortable columns
  3. **Calendar view**: Week grid with rich interview blocks (avatar, name, type, time, location, interviewer)
  4. **Navigation**: Top tab bar (Pipeline | Positions | Database | Calendar | Metrics)
  5. **Interview system**: Interview log + calendar display + conflict detection (no availability matching)

### Design Spec
- Written to `docs/superpowers/specs/2026-05-21-ats-visual-redesign-design.md`
- 13 sections covering: summary banner, navigation, cards, database view, calendar, interview system, activity trail, rejected/declined states, migrations, position cards, metrics, data loading, spacing
- Self-critiqued and expanded: added activity trail, rejected/declined states, source on create modal, detail panel tab contents, position filtering across views, data loading strategy, landing summary banner

### Critical Discovery
Migrations 046-050 already created most backend tables the spec assumed were new:
- `candidate_comments` (with internal flag, author_user_id) — migration 046
- `candidate_stage_history` (auto-populated on stage change) — migration 046
- `interview_rounds` + `interview_scorecards` — migration 048
- `candidates.source`, `source_detail`, `email`, `tags` — migration 046
- `candidates.rejection_reason`, `rejection_category` — migration 049
- `hiring_positions.salary_range`, `employment_type`, `location` — migrations 046-047
- Comment count already in GET /api/candidates — hiring.js line 464
- Hiring metrics endpoints already exist — hiring-metrics.js

### Implementation Plan
- Written to `docs/superpowers/plans/2026-05-21-ats-visual-redesign.md`
- 13 tasks, plan revised to use existing tables instead of creating duplicates

### Backend Complete (Tasks 1-5)

**Task 1: Migration — stage_changed_at**
- `dashboard-server/migrations/051_stage_changed_at.sql` — column + backfill from stage_history
- `dashboard-server/routes/hiring.js` line 474: added to GET /api/candidates SELECT
- `dashboard-server/routes/hiring.js` line 779: auto-stamp on stage change in PATCH
- Migration applied, verified populated
- Committed

**Task 2: Migration — candidate_activity**
- `dashboard-server/migrations/052_candidate_activity.sql` — table + indexes
- Migration applied, verified
- Committed

**Tasks 3-5: API Endpoints (all in hiring.js)**
New endpoints added (verified by route listing at lines 987-1297):
- `GET /api/candidates/:id/comments` (line 987) — client users see non-internal only
- `POST /api/candidates/:id/comments` (line 1006) — validates, logs to candidate_activity
- `DELETE /api/candidates/:id/comments/:commentId` (line 1035) — admin only
- `GET /api/interview-rounds/check-conflict` (line 1058) — time overlap check
- `GET /api/interview-rounds` (line 1098) — filters: candidate_id, from, to, interviewer
- `POST /api/interview-rounds` (line 1156) — auto round_number, optional scorecard, activity log
- `PATCH /api/interview-rounds/:id` (line 1203) — outcome logging to activity
- `DELETE /api/interview-rounds/:id` (line 1234) — admin only
- `GET /api/candidates/:id/activity` (line 1250) — UNION ALL from stage_history + activity + comments
- CV upload activity logging added to existing endpoint
- Committed

**Test infrastructure note:**
- `baseline-schema.sql` updated with stage_changed_at column and candidate_activity table
- Pre-existing test setup issue: `decode_html_entities` function conflict in psql (exit code 3). This predates our changes. Needs fixing in the baseline schema (`CREATE OR REPLACE FUNCTION` instead of `CREATE FUNCTION`).

## What remains — Frontend Tasks 6-12

All frontend work is in `nbi_project_dashboard.html`. The current `renderHiringView` function starts at line 19575 and is ~200 lines. It has a 4-button toggle (Kanban / By Client / Positions / Metrics) and handles all view rendering inline.

### Task 6: Tab Navigation + Summary Banner
Replace the 4-button toggle with a 5-tab system (Pipeline | Positions | Database | Calendar | Metrics). Add summary banner above tabs showing: interviews today, needs action count, offers pending, open positions. Each clickable.

Key: the `renderHiringView` function needs to be refactored to dispatch to per-tab render functions. Existing kanban/by-client code moves into `renderPipelineTab()`. Positions code moves into `renderPositionsTab()`. Metrics stays.

### Task 7: Candidate Card Redesign
Replace `renderHiringCard` (~line 19319, ~55 lines) with 220px cards. Need helper functions: `candidateAvatarHtml(name, size)` (deterministic hue from name hash), `daysInStageHtml(stageChangedAt)`. Card shows: avatar, name, role, source badge, stage badge, assignee faces, CV indicator, comment count, days-in-stage. Left border: red if unassigned or >14d, amber if >7d.

### Task 8: Database / Search View
New `renderDatabaseTab()` function. Full-width table with search input, filter dropdowns (Stage, Client, Source, Position), removable chips, sortable columns (name, role, stage, source, days, assignee). Click row opens detail panel.

### Task 9: Calendar View
New `renderCalendarTab()` function. Week grid with 30-min slot rows (8am-6pm). Interview blocks from `GET /api/interview-rounds?from=X&to=Y`. Blocks show avatar, name, type, time, location. Week navigation, "Schedule" button opens modal. Schedule Interview modal with conflict pre-check via `GET /api/interview-rounds/check-conflict`.

### Task 10: Detail Panel Tabs
Update `openCandidateDetail` (~line 20679) — enrich existing tabs:
- Profile: add source dropdown
- Interviews: fetch and display interview rounds, inline outcome selector, "Schedule" button
- Activity: unified timeline from `/api/candidates/:id/activity`, comment input at top
- Settings: reject/decline buttons with reason forms, reopen, delete
Also update `openCreateCandidateModal` (~line 20226) to include source field.

### Task 11: Position Cards Redesign
Replace `renderPositionsTab` stub (or the existing positions rendering) with grid cards showing: title, status badge, seniority, salary (NBI only), pipeline bar, candidate count, JD indicator.

### Task 12: Metrics View Enhancement
Extend existing `loadHiringMetrics` (~line 19217) with: source effectiveness, interview activity, time-in-stage distribution. Uses existing server endpoints + client-side computation.

## Current State
- Branch: `feature/command-centre`
- Tests: baseline schema updated but pre-existing psql issue blocks test runner (needs `CREATE OR REPLACE FUNCTION`)
- PM2: needs restart to pick up route changes
- All migrations applied (051-052)
- `hiring.js` is now ~1250 lines (was 935)
- Spec: `docs/superpowers/specs/2026-05-21-ats-visual-redesign-design.md`
- Plan: `docs/superpowers/plans/2026-05-21-ats-visual-redesign.md`

## Important: Existing code patterns in the HTML file
- All HTML escaping via `esc()` function
- Views render into a `container` element passed to the render function
- `renderContent()` re-renders the current view (call after state changes)
- `currentView` global tracks which view is active
- `_candidatesData` and `_hiringPositionsData` are the cached data arrays
- `_resolvedHiringStages` holds the stage definitions (per-client or default)
- `isClientUser()` checks if current user is a client-scoped user
- `getContractedClientRecords()` returns client dropdown options
- Drag-drop: `onHiringCardDragStart/End/LaneDragOver/Leave/Drop` functions exist
- Detail panels slide in from right with class `candidate-detail-panel`
- Modals use class `modal-overlay` > `modal` > `modal-header/body/footer`
