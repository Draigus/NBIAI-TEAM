# Interview Question Picker Redesign

**Date:** 2026-06-04
**Status:** Approved
**Branch:** `feature/command-centre`

## Problem

The current question picker is a modal that opens per-candidate with the full 1,390-question bank. Hiring managers scroll through disciplines and categories checking boxes each time. It is slow, inconsistent across candidates for the same role, and the UX is overwhelming.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Question ownership | Hybrid: position-level template + per-candidate override |
| Template location | Inside position detail, "Questions" tab |
| Picker UX | Stepper wizard — one category per step |
| Locking | Soft lock — always editable, changes apply to future interviews only |
| Questions per category | No limits — manager picks freely |
| Candidate override | Template pre-loaded into interview config, add/remove per candidate |

## Data Model

### New table: `position_question_templates`

```sql
CREATE TABLE position_question_templates (
  position_id UUID NOT NULL REFERENCES hiring_positions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_question_bank(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (position_id, question_id)
);

CREATE INDEX idx_pqt_position ON position_question_templates(position_id);
```

### How it connects

- `hiring_positions` → `position_question_templates` → `interview_question_bank`: the template definition
- When creating an interview config for a candidate, the system **copies** the position's template into `interview_config_questions` as a snapshot
- The candidate's interview is decoupled from the template after creation — editing the template later does not change in-progress interviews
- Existing `interview_config_questions` table is unchanged — it already stores per-config question selections with `sort_order`

### Filtering

Questions are filtered by `position_titles @> ARRAY[position.title]` when showing the picker — the manager only sees questions tagged for that specific role (50 per position), not the full 1,390.

## UX: Position Detail — Template Setup

### Location

New "Questions" section inside the position detail view (alongside JD, requirements, pipeline stages). This is where the hiring manager configures the default question set for the position.

### Stepper Wizard

Five steps, one per category: **Culture → Technical → Collaboration → Leadership → Depth**.

Each step shows:
- Step indicator bar at top (completed steps show checkmark + count, current step highlighted, future steps greyed)
- Category name as heading
- Count line: "10 available for [Position Title] · X selected"
- Select All / Clear controls
- List of questions as checkboxes — selected questions highlighted, unselected dimmed
- Navigation: Back / Next buttons, total selected count in the centre

### Behaviour

- Questions filtered from `interview_question_bank` by `position_titles @> ARRAY[position.title]` and grouped by category
- Checkbox toggles add/remove from `position_question_templates`
- Selection persists immediately on click (no separate save button) — soft lock
- Manager can navigate freely between steps (not forced sequential)
- Step indicator shows count of selected questions per category
- "Select All" selects all questions in the current category; "Clear" deselects all in current category
- Total count shown at bottom: "X of 50 questions selected total"

### Empty State

If no questions exist for this position title in the bank, show: "No questions found for [Position Title]. Questions can be added in the Question Bank tab."

## UX: Candidate Interview — Pre-Filled Override

### When creating an interview config for a candidate

The existing interview config modal changes:

1. If the candidate's position has a template, questions are **pre-loaded** from the template
2. Info banner at top: "Pre-loaded X questions from [Position Title] template. You can add or remove questions for this candidate."
3. Questions shown as a flat list grouped by category badge (Culture / Technical / Collaboration / Leadership / Depth)
4. Each question has an X button to remove it from this candidate's interview
5. "+ Add questions from bank" button opens a mini-picker to add additional questions
6. If no template exists, the picker works as it does today (manual selection from full bank)

### Snapshot behaviour

When the interview config is created (POST /api/interview-configs):
- Questions are copied from the template (or from the override list) into `interview_config_questions`
- This is a snapshot — the config is independent of the template from this point
- If the template changes later, existing configs are unaffected
- New configs will get the updated template

## API Changes

### New endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/positions/:id/question-template` | Get position's template questions |
| PUT | `/api/positions/:id/question-template` | Replace entire template (array of question_ids) |
| POST | `/api/positions/:id/question-template/questions` | Add a question to template |
| DELETE | `/api/positions/:id/question-template/questions/:questionId` | Remove a question from template |

### Modified endpoints

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/interview-configs` | If `question_ids` not provided, auto-load from position template |
| GET | `/api/interview-configs` | Include `template_source: true/false` flag indicating if questions came from template |

## Migration

### Migration 067: `position_question_templates`

- Create table as defined above
- No data migration needed — templates start empty, managers populate via the new UI

## Files to Change

| File | Change |
|------|--------|
| `dashboard-server/migrations/067_position_question_templates.sql` | New table |
| `dashboard-server/routes/interview.js` | New template CRUD endpoints, modify POST /api/interview-configs |
| `nbi_project_dashboard.html` | Position detail: add Questions tab with stepper wizard. Interview config modal: add template pre-fill + override UI |
| `dashboard-server/tests/unit/interview-questions.test.mjs` | Tests for template CRUD and auto-load |
| `dashboard-server/tests/helpers/fixtures.js` | `createTestPositionTemplate` helper |
