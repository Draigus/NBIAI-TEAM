-- Migration 021: Add a `position` column to all four kanban tables.
--
-- Spec: projects/nbi_dashboard/specs/2026-04-15-kanban-drag-reorder-design.md
-- Decision: D79 (live_state/decisions.md)
--
-- Each kanban board (tasks, bug_reports, candidates, leads) gains a dense
-- integer `position` field scoped by its group key (status / status / stage /
-- stage_id). The frontend will sort by this column on render and PATCH the
-- server with new positions when the user drags a card.
--
-- Backfill orders existing rows by created_at DESC within each group, so the
-- newest rows land at position 0, matching the going-forward "new cards at top"
-- rule. This makes pre-existing data feel consistent with the new behaviour.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, and the
-- backfill UPDATE is no-op-safe because ROW_NUMBER will reproduce the same
-- positions if nothing has been inserted since the last run.

ALTER TABLE tasks        ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bug_reports  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE candidates   ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads        ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_status_position       ON tasks       (status, position);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status_position ON bug_reports (status, position);
CREATE INDEX IF NOT EXISTS idx_candidates_stage_position   ON candidates  (stage, position);
CREATE INDEX IF NOT EXISTS idx_leads_stage_position        ON leads       (stage_id, position);

-- Backfill: dense integer positions per group, newest first.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) - 1 AS new_pos
  FROM tasks
)
UPDATE tasks SET position = numbered.new_pos
FROM numbered WHERE tasks.id = numbered.id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) - 1 AS new_pos
  FROM bug_reports
)
UPDATE bug_reports SET position = numbered.new_pos
FROM numbered WHERE bug_reports.id = numbered.id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY stage ORDER BY created_at DESC) - 1 AS new_pos
  FROM candidates
)
UPDATE candidates SET position = numbered.new_pos
FROM numbered WHERE candidates.id = numbered.id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY stage_id ORDER BY created_at DESC) - 1 AS new_pos
  FROM leads
)
UPDATE leads SET position = numbered.new_pos
FROM numbered WHERE leads.id = numbered.id;
