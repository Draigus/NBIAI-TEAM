-- Migration 010: Bug Tracker Upgrade
-- Adds priority, updated_at to bug_reports; creates bug_report_comments table

ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT NULL;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE bug_reports SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS bug_report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES bug_reports(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bug_report_comments_report ON bug_report_comments(report_id);
