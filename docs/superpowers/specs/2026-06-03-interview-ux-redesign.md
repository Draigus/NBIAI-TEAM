# Interview UX Redesign — Unified Round-Based Flow

**Date:** 2026-06-03
**Status:** Draft (v3 — post multi-role review)
**Author:** Glen Pryer + Claude
**Reviewed by:** VP Product, Senior Engineer, QA Lead, Head of People

---

## Problem

The interview system has two disconnected subsystems:

1. **Interview Rounds** (`interview_rounds` table) — scheduling only. Date, time, interviewer name (free text), location, outcome dropdown. No scorecard, no questions. Created via the "Schedule Interview" modal. Has no edit for schedule fields and no delete.

2. **Interview Configs** (`interview_configs` + `interview_sessions` + `interview_scores` + `interview_decisions`) — question-based scoring. Question bank picker, multiple interviewers with individual scorecards, aggregated results, decision recording. Created via the "Configure Interview" button.

These systems don't reference each other. The UX is confusing: two buttons, two sections, two mental models. The Schedule Interview modal also has bugs (no edit, no delete, modal-close issue creating duplicates).

## Solution

Merge both systems into a single **round-based interview flow** where each round covers the full cycle: scheduling, preparation, scoring, and outcome. Two decision layers: per-round outcomes (passed/failed) and a candidate-level hiring decision (advance/hold/reject).

---

## Design Decisions

### Round types and requirements

| Type | Scorecard? | Questions? | Account interviewers? |
|------|-----------|-----------|----------------------|
| Phone Screen | No | No | No (free-text name OK, but user lookup preferred) |
| Technical | Yes | Yes (min 1) | Yes (min 1) |
| Cultural | Yes | Yes (min 1) | Yes (min 1) |
| Final | Yes | Yes (min 1) | Yes (min 1) |
| Other (free text, max 40 chars) | Yes | Yes (min 1) | Yes (min 1) |

Phone Screen is the only lightweight type. All others require the full scorecard flow.

### Two-layer decision model

**Per-round outcomes:** Every round type (including scored types) has an outcome dropdown: pending / passed / failed / rescheduled / no_show / cancelled. For scored types, the outcome is independent of the scores — a candidate might score well but the round is marked "rescheduled" due to scheduling issues.

**Candidate-level decision:** A separate `hiring_decisions` table records the overall verdict (advance / hold / reject) with notes. This is the action that moves the candidate through the pipeline. The decision bar appears on the candidate detail panel below all rounds, visible to admins only.

Stage mapping on decision:
- **Advance:** if candidate is in `interviews`, move to `offer`. If already in `offer` or later, no stage change.
- **Hold:** no stage change. Records the hold with notes for future reference.
- **Reject:** prompts for `rejection_category` (required by existing validation), sets `archived_at`, writes `candidate_stage_history`.

### Interviewer pool

Interviewers are selected from all active users — NBI team members and client users with accounts.

### Send timing — two-step API, one-click UX

The API retains the draft → activate separation for safety. POST creates the config in `draft` state. A separate `POST /activate` sends emails and transitions to `active`. The frontend's "Create & Send to Interviewers" button fires both calls sequentially, giving a one-click UX while preserving the API escape hatch.

### Blind scoring

No interviewer can see another's scores (or aggregate scores) until they have submitted their own scorecard. The round card on the candidate detail panel shows only "N of M scored" with no numeric score until all sessions are `submitted`. The full results view (`openInterviewResults`) is gated: interviewers can access it only after their own session is submitted. Admins can always access results.

### Interviewer decline

Sessions have a `declined` status. When an interviewer declines: the round creator is notified, that session is excluded from the "all submitted" calculation. The HM can reassign or proceed without that interviewer.

---

## Data Model Changes

### New table: `hiring_decisions`

```sql
CREATE TABLE hiring_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('advance', 'hold', 'reject')),
  rejection_category TEXT,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL,
  decided_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hd_candidate ON hiring_decisions(candidate_id);
```

Multiple decisions per candidate are allowed (a hold can be followed by an advance). The most recent is the active decision.

### Add columns to `interview_configs`

```sql
ALTER TABLE interview_configs ADD COLUMN round_type TEXT NOT NULL DEFAULT 'Technical'
  CHECK (round_type IN ('Phone Screen','Technical','Cultural','Final','Other'));
ALTER TABLE interview_configs ADD COLUMN round_type_custom TEXT;
ALTER TABLE interview_configs ADD COLUMN round_number INT;
ALTER TABLE interview_configs ADD COLUMN scheduled_at TIMESTAMPTZ;
ALTER TABLE interview_configs ADD COLUMN duration_minutes INT DEFAULT 60
  CHECK (duration_minutes >= 5 AND duration_minutes <= 480);
ALTER TABLE interview_configs ADD COLUMN location TEXT;
ALTER TABLE interview_configs ADD COLUMN interviewer_name TEXT;
ALTER TABLE interview_configs ADD COLUMN outcome TEXT DEFAULT 'pending'
  CHECK (outcome IN ('pending','passed','failed','rescheduled','no_show','cancelled'));
ALTER TABLE interview_configs ADD COLUMN outcome_notes TEXT;

-- Concurrency safety
ALTER TABLE interview_configs ADD CONSTRAINT uq_ic_candidate_round
  UNIQUE (candidate_id, round_number);

-- Calendar performance
CREATE INDEX idx_ic_scheduled ON interview_configs(scheduled_at)
  WHERE scheduled_at IS NOT NULL;
```

### Modify `interview_configs.candidate_id` FK

Change from `ON DELETE SET NULL` to `ON DELETE CASCADE`. A config with no candidate is meaningless in the round-based model.

```sql
ALTER TABLE interview_configs DROP CONSTRAINT interview_configs_candidate_id_fkey;
ALTER TABLE interview_configs ALTER COLUMN candidate_id SET NOT NULL;
ALTER TABLE interview_configs ADD CONSTRAINT interview_configs_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE;
```

### Add `declined` status to `interview_sessions`

```sql
ALTER TABLE interview_sessions DROP CONSTRAINT interview_sessions_status_check;
ALTER TABLE interview_sessions ADD CONSTRAINT interview_sessions_status_check
  CHECK (status IN ('assigned', 'in_progress', 'submitted', 'declined'));
```

### Add audit columns to `interview_scores`

```sql
ALTER TABLE interview_scores ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE interview_scores ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
```

Score upserts must call `auditLog` and update `updated_at`. After session submission, scores are immutable (existing behaviour, confirmed preserved).

### Change question FK to preserve historical scores

```sql
-- interview_config_questions: change CASCADE to SET NULL
ALTER TABLE interview_config_questions DROP CONSTRAINT interview_config_questions_question_id_fkey;
ALTER TABLE interview_config_questions ALTER COLUMN question_id DROP NOT NULL;
ALTER TABLE interview_config_questions ADD CONSTRAINT interview_config_questions_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES interview_question_bank(id) ON DELETE SET NULL;

-- interview_scores: same treatment
ALTER TABLE interview_scores DROP CONSTRAINT interview_scores_question_id_fkey;
ALTER TABLE interview_scores ALTER COLUMN question_id DROP NOT NULL;
ALTER TABLE interview_scores ADD CONSTRAINT interview_scores_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES interview_question_bank(id) ON DELETE SET NULL;
```

Deleted questions render as "[Deleted question]" in scorecards. Scores are preserved.

### Deprecate `interview_rounds` and `interview_scorecards`

Both tables remain in the database but are no longer written to. Data migration copies `interview_rounds` into `interview_configs` with explicit field mapping:

| `interview_rounds` field | Maps to | Rule |
|---|---|---|
| `title` | `round_type` + `round_type_custom` | Pattern match: `%technical%` → Technical, `%cultural%` → Cultural, `%final%` → Final, `%phone%` → Phone Screen, else → Other with title as custom |
| `status` | (derived) | 'completed' → outcome based on `outcome` field; 'cancelled' → `outcome = 'cancelled'` |
| `outcome` | `outcome` | 'pass' → 'passed', 'fail' → 'failed', 'on-hold' → 'pending' |
| `candidate_id` | `candidate_id` | Direct copy |
| `scheduled_at`, `duration_minutes`, `location` | Same names | Direct copy |
| `interviewer_name` | `interviewer_name` | Direct copy |
| (none) | `position_id` | Inferred from `candidates.position_id` via subquery |

`interview_scorecards` (migration 048) contains qualitative data (criteria, recommendation, strengths, concerns) that cannot be mapped to the per-question scoring model. Migrated Phone Screen rounds that have associated scorecards get a "View legacy scorecard" link. The rendering code for old scorecards is kept read-only.

### Existing `interview_decisions` table

Retained for per-round decisions recorded via `openInterviewResults`. The new `hiring_decisions` table handles candidate-level decisions. Both can coexist — `interview_decisions` captures the per-round assessment, `hiring_decisions` captures the overall verdict.

---

## Permission Matrix

| Action | Admin | NBI Member | Client Admin | Client Member |
|--------|-------|-----------|-------------|--------------|
| Create round | Yes | Yes | No | No |
| Edit round (schedule) | Yes | Creator only | No | No |
| Edit round (interviewers/questions) | Yes (pre-scoring) | Creator only (pre-scoring) | No | No |
| Delete round | Yes | No | No | No |
| Set round outcome | Yes | Yes | No | No |
| Score (own session) | Yes | Yes | Yes | Yes |
| View round cards | Yes | Yes | Read-only (no scores until all submitted) | Read-only (type, date, status only) |
| View detailed scores | Yes | After own submission | After own submission | No |
| View aggregate results | Yes | After own submission | No | No |
| Make candidate decision | Yes | No | No | No |
| View candidate decision | Yes | Yes | Read-only | No |

---

## API Changes

### New endpoint

**POST /api/hiring-decisions** — Admin only. Creates a candidate-level decision. Body: `{ candidate_id, decision, rejection_category (if reject), notes }`. On advance: moves candidate to 'offer' stage, writes stage history. On reject: prompts for rejection_category, archives candidate, writes stage history. On hold: no stage change.

**GET /api/hiring-decisions?candidate_id=X** — Returns all decisions for a candidate, newest first.

### Modified endpoints

**POST /api/interview-configs** — Accepts new fields: `round_type`, `round_type_custom`, `scheduled_at`, `duration_minutes`, `location`, `interviewer_name`. Validation: Phone Screen allows optional `question_ids`/`interviewer_ids`; all other types require min 1 of each. Phone Screen with `interviewer_ids` returns 400. Auto-increments `round_number` using `SELECT ... FOR UPDATE` on the candidate row for concurrency safety. Creates config in `draft` status. `position_id` auto-populated from `candidates.position_id` if not provided.

**POST /api/interview-configs/:id/activate** — Retained. Creates sessions, sends notification emails. Transitions status to `active`. Frontend fires POST + activate sequentially for one-click UX.

**GET /api/interview-configs?candidate_id=X** — Returns new schedule fields + `round_number`. Ordered by `round_number ASC`. New optional param `include=progress` adds per-session progress (scored_count, question_count, status, interviewer_name) and aggregate_score via lateral joins — avoids N+1 queries.

**PATCH /api/interview-configs/:id** — Editable fields: `scheduled_at`, `duration_minutes`, `location`, `outcome`, `outcome_notes`. Interviewer/question changes only when all sessions are `assigned`. Returns 400 if a `hiring_decisions` row exists for the candidate and `outcome` is being changed. When `scheduled_at` changes, sends reschedule notification email to all assigned interviewers (old + new date/time). Uses `If-Match` header with `updated_at` for optimistic concurrency — returns 409 on conflict.

**DELETE /api/interview-configs/:id** — Admin only. Cascades to config_questions, sessions (→ scores), and interview_decisions for this config. Calls `auditLog` with deleted score count. Returns `{ deleted: true, scores_removed: N }`.

**PUT /api/interview-scores/:session_id/:question_id** — Unchanged behaviour, but now calls `auditLog` on every upsert and updates `updated_at`.

**GET /api/interview-results/:config_id** — Access gated: interviewers can only access after their own session is submitted. Admins always have access.

**POST /api/interview-configs/:id/clone** — Updated to copy `round_type`, `round_type_custom`, `duration_minutes`, and interviewer panel (creates new sessions in `assigned` state). Does NOT copy `scheduled_at`, `round_number`, or `outcome`.

### Retired endpoints (410 Gone)

All write paths to `interview_rounds` across all route files:
- `GET/POST /api/interview-rounds` (hiring.js)
- `PATCH/DELETE /api/interview-rounds/:id` (hiring.js)
- `GET /api/interview-rounds/check-conflict` (hiring.js)
- `GET/POST /api/candidates/:id/interviews` (interview-rounds.js)
- `PATCH/DELETE /api/candidates/:id/interviews/:roundId` (interview-rounds.js)
- `GET/POST /api/candidates/:id/interviews/:roundId/scorecards` and sub-routes (interview-rounds.js)

All return `{ error: 'This endpoint has been retired. Use /api/interview-configs instead.' }` with status 410. Server logs a warning for tracking.

### Calendar integration

Frontend changes the interview block query from `/api/interview-rounds` to `/api/interview-configs?scheduled_at_from=X&scheduled_at_to=Y`. Calendar blocks differentiate round types visually. Phone Screen blocks do not show "View Scorecard" links.

---

## Design Tokens

All new components use CSS custom properties. No hardcoded hex values.

### Round type colours

```css
--round-phone: var(--info);
--round-technical: var(--purple, #7c3aed);
--round-cultural: var(--warning);
--round-final: var(--success);
--round-other: var(--text-muted);
```

Defined in `:root` with overrides in each theme block for contrast.

### Component tokens

- Backgrounds: `var(--bg-card)`, `var(--bg-surface)`, `var(--bg-elevated)`, `var(--bg-input)`
- Text: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
- Borders: `var(--border-default)`, `var(--border-subtle)`
- Status: `var(--success)`, `var(--warning)`, `var(--danger)`
- Buttons: existing `.btn`, `.btn--primary`, `.btn--sm`, `.btn--ghost` classes

---

## Frontend Changes

### Remove

- `openScheduleInterviewModal`, `submitScheduleInterview`, `doCreateInterview`, `addInterviewRound`
- The old "Schedule Interview" modal HTML generation
- `buildCandidateStageSubHtml` interview config button (merged into round cards)

### New: "Add Round" — two-form approach

**Phone Screen** — `.modal--md` (560px) modal:
- Type selector, date, time, duration, interviewer (user lookup with free-text fallback for externals), location
- Create button: "Create Round" (uses `withButtonLoading`)
- On submit: POST to `/api/interview-configs` → status `draft`. For Phone Screen, no activate step needed — config is self-contained.
- On success: toast, modal closes, panel re-renders

**Technical / Cultural / Final / Other** — panel-takeover (replaces candidate detail content):
- Header: type selector + scheduling fields
- Interviewers: multi-select from active NBI + client users
- Questions: discipline-filtered picker with category pills (reuses existing `openInterviewConfig` code)
- Score anchor tooltips on hover: 1=Does not meet, 2=Partially meets, 3=Meets expectations, 4=Exceeds, 5=Exceptional
- Create button: "Create & Send to Interviewers" — disabled until min 1 question + min 1 interviewer
- On submit: POST (draft) → POST activate (sends emails) — sequential. Uses `withButtonLoading`.
- Back button: returns to candidate detail

When `round_type = 'Other'`: text input for custom label (max 40 chars, trimmed, non-empty, XSS-safe via `esc()`).

### Interaction states

- **Loading:** `withButtonLoading` on all submit buttons
- **Data fetch failure:** inline error in relevant section
- **Email send failure:** toast warns, round still created
- **Past date:** client-side warning "This date is in the past" (allowed, for retrospective entry)

### Edit Round

Same form as Add Round, pre-populated. Differences:
- Type selector: read-only (`opacity: 0.6; pointer-events: none`)
- If scoring started: interviewer/question sections read-only with warning banner ("Scoring has started — interviewers and questions can no longer be changed") in `var(--warning)` styling
- Schedule fields always editable. On `scheduled_at` change, confirm: "This will notify interviewers of the schedule change."
- Save: PATCH with `If-Match` header

### Delete round

Delete button (×) hidden for non-admin. Uses `themedConfirm()`. If scores exist: "This round has N scores that will be permanently deleted." On success: toast, panel re-renders. Calls `auditLog` server-side.

### Cancel round

Separate from delete. Sets `outcome = 'cancelled'`. Round card shows "CANCELLED" badge (greyed out). Data preserved. Available to any NBI user, not just admin.

### Candidate detail panel — Interviews section

```
┌─────────────────────────────────────────────┐
│ Interviews                    [+ Add Round] │
├─────────────────────────────────────────────┤
│ ▸ Round 1: Phone Screen  PASSED   3 Jun     │  ← compact (default)
│ ┌ Round 2: Cultural              [Edit] [×] │  ← expanded
│ │ 5 Jun 14:00 · 60min · Glen, Stavros       │
│ │ Outcome: [Passed ▾]                       │
│ │ 8 questions · 2 of 2 scored               │  ← blind: no avg shown
│ │ Score: 4.2 / 5.0        [View Results →]  │  ← only after ALL submitted
│ └───────────────────────────────────────────│
│ ▸ Round 3: Technical  SCHEDULED   10 Jun    │  ← compact
│ ┌ Round 4: Final (cancelled)                │  ← cancelled, greyed
│ └───────────────────────────────────────────│
├─────────────────────────────────────────────┤
│ Overdue: Technical round was 3 days ago,    │  ← staleness warning
│ scoring not started                         │
├─────────────────────────────────────────────┤
│ Decision (admin only)                       │
│ [Advance] [Hold] [Reject]   Notes: [____]   │
│ Previous: HOLD — "Waiting for final round"  │
└─────────────────────────────────────────────┘
```

**Round card — compact view (~45px):** type, date, status/outcome badge, aggregate score (only if all sessions submitted). Click to expand.

**Round card — expanded:** full detail: schedule metadata, outcome dropdown (all round types), interviewer progress (blind: "N of M scored" until all submitted, then show avg), action links, edit/delete.

**Density:** after 5 rounds, remaining collapse under "Show N more". Empty state: "No interviews scheduled" + button.

**Decision bar:** Admin only. Shows previous decisions if any. Reject prompts for `rejection_category`. Notes required.

**Staleness warning:** if any round's `scheduled_at` is past and scoring hasn't started, amber warning.

### Blind scoring enforcement

Round cards: show "2 of 3 scored" (no numeric score) until all sessions for that round are `submitted` or `declined`. Only then show the aggregate.

Results view (`openInterviewResults`): access check — if the current user has a session for this config and it is not `submitted`, return 403 with message "Please submit your scorecard before viewing results."

Scorecard view (`openInterviewScorecard`): unchanged — interviewers only see their own scores.

### Scoring rubric

Score buttons in the scorecard show tooltip text:
- 1: Does not meet expectations
- 2: Partially meets expectations
- 3: Meets expectations
- 4: Exceeds expectations
- 5: Exceptional

These are displayed as labels below each score button (already present in the scorecard CSS).

### Accessibility

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Focus trap via `_trapFocus()` / `_releaseFocusTrap()`
- Initial focus: type selector (Add) or first editable field (Edit)
- Focus return: button that launched the modal/panel
- Escape to close/return
- `aria-live="polite"` on dynamic form region

### Responsive

- Desktop (>768px): round cards full width, Edit/Delete inline
- Mobile (<768px): panel full-width, metadata wraps, Edit/Delete collapse to kebab menu
- Phone Screen modal: `.modal--md` responsive via existing CSS
- Decision bar: stacks vertically on narrow screens

### Calendar tab

Interview blocks from `interview_configs` with `scheduled_at IS NOT NULL`. Round type determines block colour. Click opens candidate detail with that round expanded. Phone Screen blocks show no scorecard link.

### Unchanged

- Full-page scorecard view (`openInterviewScorecard`) — driven by `interview_sessions`
- Questions management tab
- Question bank API
- Deep links (`#interview/{sessionId}`) — `interview_sessions` table is unchanged

### Technical debt addressed

- Migrate 15 instances of bare `var(--border)` to `var(--border-default)`
- Replace inline hex in `buildCandidateInterviewsHtml` with CSS tokens

---

## Round Lifecycle

### Phone Screen
```
Created (draft) → Outcome set (passed/failed/rescheduled/no_show/cancelled)
```
Status column: set to `completed` on creation (no sessions to score).

### Scored types (Technical, Cultural, Final, Other)
```
Created (draft) → Activated (sessions sent) → In Progress (first score) → Scored (all submitted/declined)
```
Per-round outcome is set independently by the HM via the outcome dropdown.

### Session statuses
```
assigned → in_progress (first score) → submitted
         → declined (interviewer declines)
```

### Candidate decision (separate from round lifecycle)
```
No decision → Advance (→ offer stage) / Hold / Reject (→ archived)
```
Multiple decisions allowed over time (hold → advance is a valid sequence).

### Status column on `interview_configs`

| Round type | On creation | On activate | Derived display |
|---|---|---|---|
| Phone Screen | `completed` | N/A | Shows outcome badge |
| Scored types | `draft` | `active` | Derived from session states |

The existing CHECK constraint `('draft', 'active', 'completed')` is preserved. Phone Screens skip `active` entirely.

---

## Migration Plan

1. Create `hiring_decisions` table
2. Add new columns to `interview_configs` (all nullable except `round_type` with default)
3. Alter `candidate_id` FK to `NOT NULL ... ON DELETE CASCADE`
4. Add `UNIQUE (candidate_id, round_number)` constraint
5. Add `declined` to `interview_sessions` status CHECK
6. Add `cancelled` to `interview_configs` outcome CHECK
7. Add `created_at`, `updated_at` to `interview_scores`
8. Change question FKs to `ON DELETE SET NULL`
9. Add partial index on `scheduled_at`
10. Migrate `interview_rounds` data with explicit CASE mapping (see field mapping table above)
11. Deploy API changes (new hiring-decisions endpoint, modified configs endpoints, new PATCH/DELETE)
12. Deploy frontend changes (new modal, updated candidate panel, blind scoring)
13. Retire old endpoints (410 Gone on all write paths — see enumerated list above)
14. Migrate existing `interview_decisions` data: copy any decisions where a corresponding `hiring_decisions` row does not yet exist

---

## Out of Scope (future enhancements)

- Multi-round gating (must pass phone screen before technical unlocks) — display a soft warning for now
- Calendar sync with external providers
- Candidate-facing notifications / self-scheduling
- Reporting / metrics endpoints (time-to-hire, pass rates, interviewer calibration)
- Bulk round creation for same-role candidates
- Interviewer workload view ("My Interviews" dashboard widget)
- Admin unlock of submitted scorecards
- Configurable scoring rubrics per position
