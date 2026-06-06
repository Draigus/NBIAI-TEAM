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
| Template location | Inside position detail slide-in panel, as a collapsible section |
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

### New column on `interview_configs`

```sql
ALTER TABLE interview_configs ADD COLUMN from_template BOOLEAN NOT NULL DEFAULT false;
```

Tracks whether this config's questions were auto-loaded from a position template. Read-only after creation.

### How it connects

- `hiring_positions` → `position_question_templates` → `interview_question_bank`: the template definition
- When creating an interview config for a candidate, the system **copies** the position's template into `interview_config_questions` as a snapshot and sets `from_template = true`
- The candidate's interview is decoupled from the template after creation — editing the template later does not change in-progress interviews
- Existing `interview_config_questions` table is unchanged — it already stores per-config question selections with `sort_order`

### Client scoping

When showing the question picker for a position template, questions are filtered by:
1. `position_titles @> ARRAY[position.title]` — only questions tagged for this role
2. `client_id = position.client_id OR client_id IS NULL` — client-specific questions plus shared questions

This means the manager sees only the ~50 questions relevant to their position, scoped to their client.

## UX: Position Detail — Template Setup

### Location

The position detail is a **600px slide-in panel** (not a tabbed page). The template setup is a new collapsible section at the bottom of the panel body, below the existing info grid, JD, and candidates table. Header shows "Interview Questions" with a count badge and expand/collapse chevron.

When collapsed: "Interview Questions (15 selected)" — one line.
When expanded: the stepper wizard renders inline.

### Stepper Wizard

Five steps, one per category: **Culture → Technical → Collaboration → Leadership → Depth**.

The stepper fits within the 600px panel width. Each step shows:
- Step indicator bar at top — clickable pills (not just next/back). Completed steps show checkmark + count, current step highlighted, future steps greyed. Manager can click any step to jump to it.
- Category name as heading
- Count line: "10 available for [Position Title] · X selected"
- Select All / Clear controls
- List of questions as checkboxes — selected questions highlighted with accent background, unselected dimmed
- Navigation: Back / Next buttons at bottom, total selected count in the centre

### Sort Order

Questions display in the order they appear in `interview_question_bank` (by `created_at`). No drag-to-reorder in v1. Sort order in `position_question_templates` is set automatically based on selection order (first selected = sort_order 1, etc.). Reordering can be added later if needed.

### Save Behaviour

Each checkbox click fires an individual POST or DELETE to the template API. No batch save button. The template is always in a saved state. This is the "soft lock" — there is no unsaved state to lose.

**Rapid clicks:** UI updates optimistically on click (checkbox toggles immediately). The API call fires in the background. If it fails, the checkbox reverts and a toast shows "Failed to save — try again." No debouncing — each click is its own request, but the UI never blocks on the response.

### Question Display

Questions are shown in full text (no truncation). Long questions (200+ characters) will wrap to multiple lines within the 560px content area. This is intentional — the manager needs to read the question to decide whether to include it. The list scrolls within the panel's existing scroll container.

### Permissions

Any NBI user (admin or member) can edit position templates. Client users cannot. This matches existing position editing permissions.

### Empty State

If no questions exist for this position title in the bank: "No questions found for [Position Title]. Questions can be added in the Question Bank tab."

If the position has no title set (unlikely but possible): "Set a position title to see matching questions."

## UX: Candidate Interview — Pre-Filled Override

### When creating an interview config for a candidate

The existing `openInterviewConfig` modal changes:

1. If the candidate's position has a template, questions are **pre-loaded** from the template
2. Info banner at top: "Pre-loaded X questions from [Position Title] template. You can add or remove questions for this candidate."
3. Questions shown as a flat list with category badges (Culture / Technical / Collaboration / Leadership / Depth), ordered by category in stepper order (Culture → Technical → Collaboration → Leadership → Depth) then by sort_order within each category
4. Each question has an X button to remove it from this candidate's interview
5. "+ Add question" button at bottom expands an inline search box that filters against questions from the bank matching the position (same position_title + client scope) but **excluding** questions already in the candidate's current selection. Exclusion is done client-side — the full eligible set is fetched once via GET, then filtered in JS against the current selection array. Not a separate modal, just a search-and-add inline.
6. If no template exists (position has no template rows, or position_id is null on the candidate), the picker works as it does today (manual selection from full bank, grouped by discipline then category). No error, no warning — just the existing UX as fallback.

### Round type interaction

Templates are position-level and contain questions across all categories. When creating an interview config:

- **Phone Screen**: Questions section is hidden (phone screens do not use scored questions — existing behaviour preserved)
- **Technical / Cultural / Final / Other**: All template questions are pre-loaded regardless of round type. The round type describes the interview format, not which questions to filter. A "Technical" round can include Culture questions if the manager wants them — the categories are question taxonomy, not round taxonomy.

If in future rounds should auto-filter by category (e.g. Technical round only loads Technical + Depth questions), this can be added as a filter toggle without changing the data model.

### Multi-round behaviour

A candidate can have multiple interview rounds (round_number auto-increments). Template auto-load only applies to the **first round** for a candidate (round_number = 1). Subsequent rounds start with an empty question list — the manager picks manually or the clone endpoint copies from a previous round. Rationale: later rounds typically focus on different areas (e.g. round 1 = broad screen, round 2 = deep technical), so auto-loading the full template every time would require the manager to remove most questions.

### Empty template

If a position has the template section but zero questions selected, it is treated as "no template exists" for auto-load purposes. The candidate interview modal falls back to manual selection. An empty template is not an error — it just means the manager hasn't configured it yet.

### Snapshot behaviour

When the interview config is created (POST /api/interview-configs):
- Questions are copied from the template (or from the override list) into `interview_config_questions`
- `from_template` is set to `true` if questions came from the template (and template was non-empty)
- This is a snapshot — the config is independent of the template from this point
- If the template changes later, existing configs are unaffected
- New configs will get the updated template

## API Changes

### New endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/positions/:id/question-template` | Get position's template questions (joined with question text, category, sort_order) |
| POST | `/api/positions/:id/question-template/questions` | Add a question to template. Body: `{ question_id }`. Sets sort_order to max+1. |
| DELETE | `/api/positions/:id/question-template/questions/:questionId` | Remove a question from template |

The PUT (replace entire template) endpoint from the earlier draft is removed. Individual add/remove is sufficient for the immediate-save UX, and avoids the ambiguity of having two save mechanisms.

### Modified endpoints

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/interview-configs` | If `question_ids` not provided AND position has a template, auto-load from template and set `from_template = true` |

### Auth

All template endpoints require `requireNBI` (same as existing position endpoints). Client users cannot access.

## Migration

### Migration 067: `position_question_templates`

- Create `position_question_templates` table as defined above
- Add `from_template` boolean column to `interview_configs`
- No data migration needed — templates start empty, managers populate via the new UI

## Files to Change

| File | Change |
|------|--------|
| `dashboard-server/migrations/067_position_question_templates.sql` | New table + interview_configs column |
| `dashboard-server/routes/interview.js` | New template CRUD endpoints (GET/POST/DELETE), modify POST /api/interview-configs for auto-load |
| `nbi_project_dashboard.html` | Position detail panel: add collapsible "Interview Questions" section with stepper wizard. `openInterviewConfig`: add template pre-fill + override UI with inline add |
| `dashboard-server/tests/unit/position-question-templates.test.mjs` | New test file: template CRUD, auto-load, client scoping, permissions |
| `dashboard-server/tests/helpers/fixtures.js` | `createTestPositionTemplate` helper |

## What This Does NOT Include

- Drag-to-reorder questions within a template (v2)
- Per-round-type question filtering (v2 — add filter toggle if needed)
- Question versioning / audit trail (questions are snapshotted at config creation time, which provides point-in-time record)
- Changes to the existing Question Bank tab (stays as-is for browsing/CRUD on the full bank)
- AI question generation integration (existing endpoint stays, not wired into template UX)
