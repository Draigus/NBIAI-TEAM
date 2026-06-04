-- Meeting action status overrides (CC Meetings Intelligence tab)
CREATE TABLE IF NOT EXISTS meeting_action_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('open', 'done', 'overdue')),
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_action_status_action ON meeting_action_status(action_id);
