# Handoff — Interview UX Redesign (Phases A + B)

**Date:** 2026-06-03
**Branch:** `feature/command-centre`
**Author:** Claude Opus 4.6
**Session:** Full day — Phase A (API), Phase B (Frontend), Glen UAT fixes

---

## What Was Built

### Phase A — Database + API (complete)

**Migration 062** applied to production DB:
- `hiring_decisions` table (candidate-level advance/hold/reject with rejection_category)
- `interview_configs` extended: round_type, round_number, scheduled_at, duration_minutes, location, interviewer_name, outcome, outcome_notes
- `interview_sessions` status CHECK includes 'declined'
- `interview_scores` has created_at/updated_at audit columns
- FK fixes: candidate_id CASCADE, question FKs SET NULL
- Data migrated from `interview_rounds` (51 rounds: 38 Phone Screen, 7 Technical, 6 Cultural)

**New/modified API endpoints** in `dashboard-server/routes/interview.js`:
- `POST /api/hiring-decisions` — candidate-level decision with stage side-effects
- `GET /api/hiring-decisions?candidate_id=X` — decision history
- `POST /api/interview-configs` — rewritten for round types, Phone Screen mode (no questions needed), auto-increment round_number with FOR UPDATE lock. Scored types can be created as drafts without questions/interviewers.
- `GET /api/interview-configs?candidate_id=X&include=progress` — round_number ordering, session progress data
- `PATCH /api/interview-configs/:id` — edit schedule/outcome with If-Match optimistic concurrency (date_trunc milliseconds for Postgres/JS precision mismatch)
- `DELETE /api/interview-configs/:id` — admin cascade delete with audit trail
- `POST /api/interview-sessions/:id/decline` — interviewer declines
- `GET /api/interview-results/:config_id` — blind scoring gate (non-admin must submit before viewing)
- Clone endpoint copies round_type, duration, interviewer sessions
- Score upserts write created_at/updated_at + auditLog

**Retired endpoints** (410 Gone):
- All `/api/interview-rounds` routes in `routes/hiring.js`
- All `/api/candidates/:id/interviews` routes in `routes/interview-rounds.js`

**Key implementation detail:** `auditLog` signature is `auditLog(entityType, entityId, action, changedBy, changes)`. The `candidate_stage_history` table uses `moved_by` column (not `changed_by`).

### Phase B — Frontend (complete)

All changes in `nbi_project_dashboard.html`:

**Round cards** (`buildCandidateInterviewsHtml` ~line 22588):
- Compact view (~45px): type-coloured left border, round number + label, outcome badge, blind score summary ("N/M scored" until all submitted), date
- Expanded view: click to toggle. Shows schedule metadata, interviewer session badges, outcome dropdown, outcome notes, action buttons
- Staleness: amber "Overdue" indicator when scheduled_at is past and scoring hasn't started
- Density: after 5 rounds, remaining collapse under "Show N more" toggle
- Buttons: Cancel (sets outcome=cancelled), Delete (admin, themedConfirm), View Results (scored with all submitted), Configure Questions (draft scored types)
- State tracked in `window._ivExpandedRounds` Set

**Decision bar** (`loadDecisionBar` ~line 22972):
- Admin-only, loads async after panel render into `#cdDecisionBar`
- Advance (green), Hold (amber), Reject (red) buttons
- Required notes textarea (`#ivBarDecisionNotes`)
- Reject shows category dropdown (`#ivBarRejectCategory`)
- Previous decisions displayed with colour-coded badges + timestamps
- Posts to `POST /api/hiring-decisions`

**Add Round modal** (`openAddRoundModal` ~line 22770):
- Modal with round type dropdown (Phone Screen/Technical/Cultural/Final/Other)
- Date, time, duration, location fields
- Phone Screen: shows interviewer name field
- Scored types: shows note about configuring questions after creation
- "Other" type: shows custom label input (max 40 chars)
- Past date warning
- Posts to `POST /api/interview-configs` then closes modal and re-renders detail
- Focus trap + Escape to close

**Assignee dropdown** (~line 21901 detail panel, ~line 20633 database view):
- Filtered by candidate's client: `c.client_id ? u.client_id === c.client_id : !u.client_id`
- Shows only that client's users (not NBI staff) for client candidates
- Shows only NBI users for internal candidates

**Question picker** (`openInterviewConfig` ~line 22068):
- Max-height changed from 400px to `calc(100vh - 320px)` — uses full panel height
- "Configure Questions & Interviewers" button on draft scored round cards looks up client_id and position_id from `_candidatesData` for correct discipline filtering

**Cleanup:**
- `apiCall` silently swallows 410 responses (line ~4021)
- Zero references to retired `/api/interview-rounds` or `/api/candidates/.../interviews` endpoints
- Removed dead functions: `loadAndRenderScorecards`, `createScorecard`, `updateInterviewOutcome`
- Removed "Configure Interview" button from `buildCandidateStageSubHtml` (interviews stage)
- `doCreateInterview` round type mapping fixed to handle both "Technical" and "Technical Interview" keys
- Questions tab added to `tabNames` array (was in labels but never rendered)
- Decision bar IDs renamed to `ivBar*` prefix to avoid collision with results view

**Calendar/scheduling** (~line 20200, 20725, 20955):
- Today count: filters `interview_configs` by `scheduled_at` date
- Calendar view: filters configs by date range, maps round_type to title for block rendering
- `doCreateInterview`: maps round types correctly, posts to new API
- Old conflict check removed (used retired table)

---

## Test Status

**Unit tests:** 52 files, 644 tests, all pass. Key test files:
- `tests/unit/hiring-decisions.test.mjs` — 7 tests (POST advance/reject/hold, validation, GET)
- `tests/unit/interview-configs.test.mjs` — 14 tests (POST round types, PATCH concurrency, DELETE cascade, GET progress, clone)
- `tests/unit/interview-management.test.mjs` — 4 tests (410 Gone verification)
- `tests/unit/interview-scoring.test.mjs` — 14 tests (score upsert, submit, results, decisions)

**E2E tests (Playwright):**
- `tests/e2e/interview-rounds-panel.spec.js` — 5 tests, all pass when run individually (expand/collapse, aggregate score, decision bar visibility, member exclusion, advance)
- `tests/e2e/interview-uat-personas.spec.js` — 7 tests, 5 pass (HM flow, empty state, advance, member permissions, client user). 2 have intermittent flakiness from shared-DB architecture.
- E2E infrastructure note: test DB can get corrupted by stale connections from debug scripts. Run `npm test` (vitest) first to reset from baseline if E2E tests fail with FK errors.

**Test fixtures updated:**
- `createTestInterviewConfig` now sets round_type, round_number, all scheduling fields
- `hiring_decisions` added to TRUNCATE_TABLES in db.js
- Migration 062 SQL fixed: `rejection_category` column added to CREATE TABLE, `ir.interviewer_name` → `NULL AS interviewer_name`

---

## What's Live on :8888

PM2 restarted. Dashboard loads. All interview features deployed:
- Expand/collapse round cards with blind scoring
- Decision bar (admin only)
- Add Round modal
- Configure Questions button on draft scored rounds
- Assignee dropdown filtered by client
- Questions tab visible in Hiring page
- All old interview-rounds endpoints return 410

---

## Known Issues

1. **E2E flakiness** — persona tests fail intermittently when run together due to shared-DB connection state between test files. Works reliably when run individually.
2. **openInterviewConfig creates NEW config** — the "Configure Questions" button calls `openInterviewConfig` which creates a new config instead of updating the existing draft. The draft round and the configured round are separate rows. Phase C should address this by linking the question picker to the existing draft config ID.
3. **git push failing** — remote push has been failing throughout session. Commits are local only. Need to resolve remote state.

---

## What's Next (Phase C)

- Edit Round modal (pre-populated, read-only type, read-only questions if scoring started)
- Link question picker to existing draft config (instead of creating new)
- Calendar tab visual integration (round type colours on calendar blocks)
- Scoring rubric tooltips on score buttons (1=Does not meet, 5=Exceptional)
- Fix `openInterviewConfig` to update existing config rather than create new one

---

## Key Files Modified

| File | What changed |
|------|-------------|
| `dashboard-server/migrations/062_interview_redesign.sql` | Schema + data migration (fixed twice) |
| `dashboard-server/routes/interview.js` | All new/modified endpoints (~950 lines) |
| `dashboard-server/routes/hiring.js` | Retired interview_rounds (200 lines → 5-line 410 block) |
| `dashboard-server/routes/interview-rounds.js` | Replaced with 410 stubs |
| `nbi_project_dashboard.html` | Round cards, decision bar, Add Round modal, assignee filter, cleanup |
| `dashboard-server/tests/helpers/fixtures.js` | Updated createTestInterviewConfig |
| `dashboard-server/tests/helpers/db.js` | Added hiring_decisions to truncate list |
| `dashboard-server/tests/unit/hiring-decisions.test.mjs` | New (7 tests) |
| `dashboard-server/tests/unit/interview-configs.test.mjs` | Extended (14 tests) |
| `dashboard-server/tests/unit/interview-management.test.mjs` | Rewritten for 410s (4 tests) |
| `dashboard-server/tests/e2e/interview-rounds-panel.spec.js` | New (5 tests) |
| `dashboard-server/tests/e2e/interview-uat-personas.spec.js` | New (7 tests) |
| `dashboard-server/tests/e2e/interview-picker.spec.js` | Updated (removed button dependency) |
