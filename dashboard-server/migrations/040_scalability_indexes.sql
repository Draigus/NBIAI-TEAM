-- 040_scalability_indexes.sql
-- Scalability audit: add missing indexes, drop duplicates, improve query performance.

-- tasks.updated_at — required for incremental sync polling (WHERE updated_at > $1)
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);

-- time_entries.user_name — workload reports filtered by user
CREATE INDEX IF NOT EXISTS idx_time_entries_user_name ON time_entries(user_name);

-- task_queue — submitted_by and created_at for queue filtering
CREATE INDEX IF NOT EXISTS idx_task_queue_submitted_by ON task_queue(submitted_by);
CREATE INDEX IF NOT EXISTS idx_task_queue_created ON task_queue(created_at DESC);

-- Drop duplicate audit_log indexes from migration 005.
-- idx_audit_log_entity duplicates idx_audit_entity (same columns: entity_type, entity_id).
-- idx_audit_log_created duplicates idx_audit_created (created_at; the DESC variant is more useful).
DROP INDEX IF EXISTS idx_audit_log_entity;
DROP INDEX IF EXISTS idx_audit_log_created;
