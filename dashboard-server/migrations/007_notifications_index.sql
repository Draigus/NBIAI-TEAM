-- 007_notifications_index.sql
-- Composite index for notification queries by user and read status.

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(username, is_read);
