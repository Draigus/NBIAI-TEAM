-- 064_queue_metadata.sql
-- Add client, assignee, and item type metadata to the Slack submission queue.
-- Supports the enhanced @WorkSage bot message format.

ALTER TABLE task_queue ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE task_queue ADD COLUMN IF NOT EXISTS assignee TEXT;
ALTER TABLE task_queue ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'task';
