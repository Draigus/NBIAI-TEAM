# ATS Single-Flow Interview Wizard

**Date:** 2 July 2026
**Status:** Approved
**Design contract:** `dashboard-server/tests/e2e/ats-workflow.spec.js` (tests 59, 114, 132, 154, 194)

## 1. Problem

The current Add Round modal (`openAddRoundModal`, nbi-hiring.js:4098) uses a two-step flow: create the round, then separately configure questions and interviewers via a Configure Interview panel. This caused a duplicate-rounds bug (creating orphaned draft configs) and is poor UX. The e2e spec (committed 2026-06-14, never implemented) defines a single-flow wizard that creates everything in one submit.

## 2. Scope

- Replace the scored-type path in `openAddRoundModal` with an inline wizard
- Add optional `status` field to `POST /api/interview-configs` backend
- Phone Screen path unchanged (test 132 already passes)
- Scorecard (`openInterviewScorecard`, `_sc*` handlers) and decision (`POST /api/interview-decisions`) code untouched

## 3. Backend Change

**File:** `dashboard-server/routes/interview.js`, `POST /api/interview-configs` (line 361)

Current behaviour: `configStatus = isPhoneScreen ? 'completed' : 'draft'` (line 410).

Change: accept optional `status` field in the request body. If `status === 'active'` AND the request includes both `question_ids` (non-empty) and `interviewer_ids` (non-empty), create the config as `'active'`. Otherwise keep existing default behaviour (`'completed'` for phone screen, `'draft'` for scored).

Validation: `status` must be one of `INTERVIEW_CONFIG_STATUSES` (`['draft', 'active', 'completed']`) if provided.

When creating as `'active'`, also set `notified_at = NOW()` on all created sessions (same as the existing activate endpoint at line 540 does). This ensures the wizard submission is equivalent to create + configure + activate in one transaction.

No other backend changes.

## 4. Frontend Change

**File:** `dashboard-server/public/js/domains/nbi-hiring.js`

### 4.1 openAddRoundModal (replace lines 4098-4172)

The modal structure stays the same (overlay, dialog, round type select, date/time/duration/location fields). Changes:

**New elements added to the modal HTML after the location row:**

1. `#ivwScoredSections` (div, initially hidden): container for the scored wizard sections. Shown when round type is Technical, Cultural, or Final. Hidden for Phone Screen and Other.

2. Inside `#ivwScoredSections`:
   - `#ivwDiscipline` (select): only rendered when the candidate's position has no discipline set. Populated with distinct disciplines from the fetched question bank. On change: filters the question list AND fires `PATCH /api/hiring-positions/:positionId { discipline: value }`.
   - `#ivwQuestionList` (div): header text "Showing questions for: {discipline}". Below that, checkboxes for each matching question (`<label><input type="checkbox" value="{questionId}"> {question_text}</label>`). Filtered client-side by discipline.
   - `#ivwInterviewerList` (div): checkboxes for each active NBI user (`<label><input type="checkbox" value="{userId}"> {display_name}</label>`).
   - Filter input inside `#ivwScoredSections`: `<input type="text" placeholder="Filter by name...">`. Filters `#ivwInterviewerList` labels by display_name match. Must NOT lose focus during typing (no re-render of the input element on filter change, only toggle `display:none` on non-matching labels).
   - `#ivwCount` (span): live text "N questions · M interviewers" updated on every checkbox change.

**Existing elements modified:**
- `#ivAddInterviewerRow` (simple text input): visible only for Phone Screen. Hidden for scored types.
- `#ivAddScoredNote`: removed entirely (the wizard replaces the need for this note).
- `#ivAddSubmitBtn`: text changes to "Send Interviews" for scored types, "Create Round" for Phone Screen. Disabled until >= 1 question AND >= 1 interviewer selected (for scored types).

### 4.2 _ivAddTypeChanged (replace lines 4174-4184)

On type change:
- Phone Screen: hide `#ivwScoredSections`, show `#ivAddInterviewerRow`, button text "Create Round", button enabled.
- Technical/Cultural/Final: show `#ivwScoredSections`, hide `#ivAddInterviewerRow`, button text "Send Interviews", button disabled (re-evaluate via count check).
- Other: hide `#ivwScoredSections`, hide `#ivAddInterviewerRow`, show custom label row, button text "Create Round".

### 4.3 _ivSubmitAddRound (replace lines 4186-4237)

For scored types: collect checked question IDs from `#ivwQuestionList input:checked` and checked interviewer IDs from `#ivwInterviewerList input:checked`. POST to `/api/interview-configs` with `{ candidate_id, round_type, scheduled_at, duration_minutes, location, question_ids, interviewer_ids, status: 'active' }`.

For Phone Screen: unchanged from current behaviour.

On success: remove overlay, toast, refresh candidate detail.

### 4.4 Data loading

When `openAddRoundModal` is called:
1. Look up candidate from `_candidatesData` to get `position_id` and `client_id`
2. Look up position from `_positionsData` (already loaded by the hiring view) to get `discipline`
3. Fetch in parallel:
   - `GET /api/interview-questions?client_id={clientId}` (all questions for client, filter by discipline client-side)
   - `GET /api/users` (all users, filter to active NBI users client-side: `is_active !== false && !client_id`)
4. Store fetched data in closure variables for the modal's event handlers

### 4.5 Discipline prompt flow

If position has no discipline:
1. Render `#ivwDiscipline` select with distinct disciplines from the question bank
2. Question list initially empty (no discipline selected)
3. On discipline select:
   - Filter question list to matching discipline
   - Fire `PATCH /api/hiring-positions/:positionId { discipline: selectedValue }` (fire-and-forget, test polls DB to confirm)
   - Update "Showing questions for:" text

## 5. Element ID Contract (from e2e spec)

| ID | Element | Purpose |
|---|---|---|
| `#ivAddType` | select | Round type (exists today) |
| `#ivAddDate` | input[date] | Schedule date (exists today) |
| `#ivAddTime` | input[time] | Schedule time (exists today) |
| `#ivAddLocation` | input[text] | Location (exists today) |
| `#ivAddInterviewer` | input[text] | Phone screen interviewer name (exists today) |
| `#ivAddSubmitBtn` | button | Submit (exists today) |
| `#ivwScoredSections` | div | Wizard container for scored types (NEW) |
| `#ivwDiscipline` | select | Inline discipline prompt (NEW) |
| `#ivwQuestionList` | div | Question checklist with header (NEW) |
| `#ivwInterviewerList` | div | Interviewer checklist (NEW) |
| `#ivwCount` | span | Live count "N questions · M interviewers" (NEW) |

## 6. Database Impact

No schema changes. No new migrations. All tables already exist (interview_configs, interview_config_questions, interview_sessions, hiring_positions).

## 7. Test Coverage

**E2e (already written, currently red):**
- Test 59: scored round single-flow submit, verifies config status/type/location, question count, session count/interviewer
- Test 114: inline discipline prompt filters questions and persists to position
- Test 132: phone screen simple form (already passes)
- Test 154: scorecard deep link (cascade, depends on test 59)
- Test 194: advance decision (cascade, depends on test 59)

**Unit tests (to be written):**
- `POST /api/interview-configs` with `status: 'active'` creates active config with notified sessions
- `POST /api/interview-configs` without `status` keeps existing draft behaviour
- `POST /api/interview-configs` with `status: 'active'` but empty question_ids or interviewer_ids ignores the status override and creates as draft (backwards-compatible guard)

## 8. Files Changed

1. `dashboard-server/routes/interview.js` -- accept optional `status` field, set `notified_at` on sessions when active
2. `dashboard-server/public/js/domains/nbi-hiring.js` -- replace `openAddRoundModal`, `_ivAddTypeChanged`, `_ivSubmitAddRound`
3. `nbi_project_dashboard.html` -- cache-bust bump for nbi-hiring.js
4. `dashboard-server/tests/unit/interview.test.js` (or similar) -- unit tests for the status field change

## 9. Definition of Done

- `npm test` all green (933+ tests)
- `npm run test:e2e` all green including all 6 ats-workflow tests
- No skipped or fixme'd tests
- Codex review clean or all findings fixed
- Cache-bust bumped for nbi-hiring.js
- PM2 restarted
