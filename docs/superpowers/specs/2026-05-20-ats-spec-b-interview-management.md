# ATS Spec B: Interview Management

Depends on: Spec A (data foundation — enriched positions with `interview_panel`, stage transition history, threaded comments).

## Summary

Add structured interview management: define interview rounds per position, create scorecards with evaluation criteria, collect independent feedback from panel members before revealing others' scores, and record interview outcomes. This turns the "interviews" stage from a single bucket into an actionable, multi-round process.

## Route File Organisation

| Route file | Responsibility |
|---|---|
| `routes/interview-rounds.js` (new) | CRUD for interview rounds and scorecards. Endpoints under `/api/candidates/:id/interviews/`. |

## 1. Interview Rounds

Each candidate going through interviews has one or more rounds. Rounds are created per-candidate (not per-position) because different candidates may have different interview paths.

### Schema

```sql
CREATE TABLE interview_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  round_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  outcome TEXT,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ir_candidate ON interview_rounds(candidate_id);
```

- `title`: e.g. "Phone Screen", "Technical Interview", "Culture Fit", "Final with Glen"
- `scheduled_at`: date/time of the interview. NULL if not yet scheduled.
- `duration_minutes`: expected length. NULL if not set.
- `location`: free text — "Google Meet", "Office - London", "Zoom link: ..."
- `status`: `scheduled`, `completed`, `cancelled`, `no-show`
- `outcome`: `pass`, `fail`, `on-hold`, NULL (not yet decided)
- `outcome_notes`: free text summary of the round outcome

### Server

- **GET /api/candidates/:id/interviews** — List all rounds for a candidate, ordered by `round_number ASC`. Client users scoped to their own candidates. NBI users can access any.
- **POST /api/candidates/:id/interviews** — Create a round. NBI users only (`requireNBI`). Client users can view rounds but not create them — NBI manages the interview process. Body: `{ title, scheduled_at, duration_minutes, location }`. `round_number` auto-increments (MAX existing + 1 within a transaction to avoid race conditions). Status defaults to `scheduled`.
- **PATCH /api/candidates/:id/interviews/:roundId** — Update a round. Allowed fields: `title`, `scheduled_at`, `duration_minutes`, `location`, `status`, `outcome`, `outcome_notes`. Validate `status` against `['scheduled', 'completed', 'cancelled', 'no-show']`. Validate `outcome` against `['pass', 'fail', 'on-hold']` or NULL.
- **DELETE /api/candidates/:id/interviews/:roundId** — Delete a round. NBI admin only. Cascades to delete associated scorecards.
- All endpoints verify candidate ownership for client users (same pattern as existing hiring endpoints).

### Frontend

- New "Interviews" section in the candidate detail panel, between the Stage section and the Comments section.
- Rendered as a numbered list of rounds, each showing:
  - Round number and title
  - Scheduled date/time (or "Not yet scheduled")
  - Duration and location
  - Status badge (scheduled/completed/cancelled/no-show)
  - Outcome badge if set (pass/fail/on-hold)
  - Expand/collapse to show scorecards (Spec B.2 below)
- "Add Round" button at the bottom. Opens inline fields (title, date, duration, location) — same pattern as onboarding links.
- Each round has edit and delete (admin only) controls.

## 2. Interview Scorecards

Structured evaluation per round. Each panel member submits a scorecard independently. Scores are hidden until all panel members for that round have submitted (prevents anchoring bias).

### Schema

```sql
CREATE TABLE interview_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES interview_rounds(id) ON DELETE CASCADE,
  interviewer_name TEXT NOT NULL,
  interviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
  recommendation TEXT,
  strengths TEXT,
  concerns TEXT,
  criteria JSONB DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_isc_round_user ON interview_scorecards(round_id, interviewer_user_id);
CREATE INDEX idx_isc_interviewer ON interview_scorecards(interviewer_user_id);
```

- `overall_rating`: 1-5 scale. NULL until submitted.
- `recommendation`: `strong-hire`, `hire`, `no-hire`, `strong-no-hire`. NULL until submitted.
- `strengths`: free text — what the candidate did well.
- `concerns`: free text — reservations or red flags.
- `criteria`: JSONB array of structured evaluation criteria: `[{ name: "Technical skill", rating: 4, notes: "Strong on React, weak on DB design" }, ...]`. Each criterion has a `name` (string), `rating` (1-5 int), and optional `notes` (string).
- `submitted_at`: NULL = draft, non-NULL = submitted. Once submitted, the scorecard is locked (no further edits except by admin).

### Criteria Templates

Positions define interview panels (Spec A). To avoid interviewers starting from a blank form each time, scorecards can be pre-populated with criteria from a template.

Default criteria template (used when no custom criteria are defined on the position):

```json
[
  { "name": "Technical competence", "rating": null, "notes": "" },
  { "name": "Communication", "rating": null, "notes": "" },
  { "name": "Culture fit", "rating": null, "notes": "" },
  { "name": "Problem solving", "rating": null, "notes": "" }
]
```

Positions can store a custom `scorecard_criteria` JSONB array on the `hiring_positions` table:

```sql
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS scorecard_criteria JSONB DEFAULT NULL;
```

When NULL, use the default template. When set, use the position's custom criteria.

### Server

- **GET /api/candidates/:id/interviews/:roundId/scorecards** — List scorecards for a round. Visibility rules:
  - **NBI panel member who has NOT submitted:** Can only see their own draft scorecard. Other scorecards hidden (prevents anchoring bias).
  - **NBI panel member who HAS submitted:** Can see all submitted scorecards for that round (their own + others').
  - **NBI admin:** Can always see all scorecards (draft and submitted) regardless of whether they've submitted.
  - **NBI user who is NOT on the panel:** Can see all submitted scorecards (they have no scorecard to submit, so the "submit first" gate doesn't apply).
  - **Client user:** Can see all submitted scorecards for their own candidates. Cannot see drafts. The "submit first" gate only applies to NBI panel members, not client users — clients are the hiring party and need visibility into completed evaluations.
- **POST /api/candidates/:id/interviews/:roundId/scorecards** — Create a scorecard. Body: `{ criteria }` (optional). If `criteria` is not provided or is an empty array, the server auto-populates from the position's `scorecard_criteria` (if the candidate has a `position_id` and the position has custom criteria set) or the default criteria template (see above). `interviewer_name` and `interviewer_user_id` auto-set from `req.user`. One scorecard per user per round — enforced by the UNIQUE constraint on `(round_id, interviewer_user_id)`. If a duplicate is attempted, catch the unique violation and return 409 "You already have a scorecard for this round." Any authenticated NBI user can create a scorecard — the system does NOT restrict creation to only panel members defined on the position. The position's `interview_panel` (which stores `user_id` per Spec A) is a planning tool, not an access control list. Panel members are prompted to create scorecards via the UI ("Start Evaluation" button shown when `_currentUser.id` matches a panel member's `user_id`), but anyone on the NBI team can add their assessment if needed.
- **PATCH /api/candidates/:id/interviews/:roundId/scorecards/:id** — Update a draft scorecard. Only the author can edit. Once `submitted_at` is set, the scorecard is locked — PATCH returns 403 with "Scorecard already submitted". Allowed fields: `overall_rating`, `recommendation`, `strengths`, `concerns`, `criteria`. Explicitly NOT patchable: `submitted_at`, `interviewer_name`, `interviewer_user_id` — these are system-managed fields. The `buildPatchQuery` allowed list must exclude them.
- **POST /api/candidates/:id/interviews/:roundId/scorecards/:id/submit** — Submit the scorecard. Sets `submitted_at = NOW()`. Validates that `overall_rating` and `recommendation` are set (required for submission). Returns 400 if missing.
- **DELETE /api/candidates/:id/interviews/:roundId/scorecards/:id** — Delete a scorecard. Admin only.

### Frontend

- Inside each interview round (expanded view), show:
  - **For NBI users:**
    - "Your Scorecard" section:
      - If the user is on the position's `interview_panel` (matched by `user_id`) and hasn't started: prominent "Start Evaluation" button with a nudge ("You're on the panel for this round").
      - If the user is NOT on the panel and hasn't started: smaller "Add Your Assessment" link (any NBI user can contribute, panel members are just prompted more visibly).
      - If draft exists: inline form with criteria ratings (1-5 number pickers), strengths/concerns textareas, overall rating, recommendation dropdown. "Save Draft" and "Submit" buttons.
      - If submitted: read-only view of their own scorecard with a "Submitted" badge.
    - "Panel Feedback" section:
      - If the current NBI user hasn't submitted their scorecard yet: greyed out with "Submit your evaluation to see others' feedback" message.
      - If submitted (or user is admin): show all submitted scorecards in a grid — one column per interviewer. Each column shows their criteria ratings, strengths, concerns, overall rating, and recommendation.
  - **For client users:** read-only view of all submitted scorecards (no draft visibility, no "Start Evaluation" — clients don't fill in scorecards, they review the panel's feedback).
  - Summary bar at the top of the round: average overall rating across submitted scorecards, recommendation breakdown (e.g. "2 Hire, 1 No Hire"). Visible to all users.

## What This Spec Does NOT Cover

- Calendar integration for scheduling (future — currently scheduling is manual date/time entry)
- Candidate self-scheduling via a link (future)
- Automated notifications when scorecards are due (Spec C)
- Video interview recording/playback (out of scope)
