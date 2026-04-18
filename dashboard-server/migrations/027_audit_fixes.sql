-- B-B27: Add FK from bug_report_comments.report_id to bug_reports.id
-- Prevents orphaned comments when a bug report is deleted.
-- (Idempotent — constraint may already exist from init-db)
DO $$ BEGIN
  ALTER TABLE bug_report_comments
    ADD CONSTRAINT fk_bug_report_comments_report
    FOREIGN KEY (report_id) REFERENCES bug_reports(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- B-B9: GIN index on tasks.dependencies for the cycle-detection CTE.
-- The unnest + ANY queries in dependency checks currently scan the full
-- text[] column on every PATCH; a GIN index makes this O(log n).
CREATE INDEX IF NOT EXISTS idx_tasks_dependencies_gin ON tasks USING gin (dependencies);
