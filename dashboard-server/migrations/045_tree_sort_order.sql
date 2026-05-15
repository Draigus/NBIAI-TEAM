-- Add sort_order column to tasks for tree view ordering.
-- Separate from kanban "position" (grouped by status);
-- sort_order is grouped by parent_id for tree view display order.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Backfill: within each parent group, assign sort_order by created_at
UPDATE tasks t
SET sort_order = sub.rn
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY created_at) - 1 AS rn
  FROM tasks
) sub
WHERE t.id = sub.id;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_sort ON tasks(parent_id, sort_order);
