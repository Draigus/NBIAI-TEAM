-- Task Queue: submission queue for team members to submit work items for triage
CREATE TABLE IF NOT EXISTS task_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  submitted_by TEXT NOT NULL,
  slack_user_id TEXT,
  slack_channel TEXT,
  slack_message_ts TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-user permission to submit to the queue
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_submit_queue BOOLEAN DEFAULT false;
