-- 077_slack_conversation_sessions.sql
-- Maps a Slack conversation (channel, or thread within a channel) to a
-- persistent headless Claude session id, so the AIOS bot resumes one
-- conversation per thread instead of cold-starting on every message.
-- conversation_key format: "<channel>:<thread_ts>" or "<channel>:top".

CREATE TABLE IF NOT EXISTS slack_conversation_sessions (
  conversation_key TEXT PRIMARY KEY,
  session_id UUID NOT NULL,
  turn_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
