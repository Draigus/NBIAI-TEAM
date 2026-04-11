-- 008_item_type_hierarchy.sql
-- Add item_type column to tasks table with fixed 4-level hierarchy:
-- project (depth 0) > feature (depth 1) > story (depth 2) > task (depth 3+)

-- Step 1: Add the column with a default
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'task';

-- Step 2: Assign types based on current tree depth using a recursive CTE
WITH RECURSIVE task_depth AS (
  SELECT id, parent_id, 0 AS depth
  FROM tasks
  WHERE parent_id IS NULL

  UNION ALL

  SELECT t.id, t.parent_id, td.depth + 1
  FROM tasks t
  INNER JOIN task_depth td ON t.parent_id = td.id
)
UPDATE tasks SET item_type = CASE
  WHEN task_depth.depth = 0 THEN 'project'
  WHEN task_depth.depth = 1 THEN 'feature'
  WHEN task_depth.depth = 2 THEN 'story'
  ELSE 'task'
END
FROM task_depth
WHERE tasks.id = task_depth.id;

-- Step 3: Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_tasks_item_type ON tasks(item_type);
