-- 076_aios_outbound_blocks.sql
-- Optional Block Kit payload for Slack DMs. When present, sent as `blocks`
-- with draft_text as the notification fallback text.
-- Conditional guard (same pattern as 074): the test-DB baseline records
-- version 72 as 072_seed_interview_questions.sql, so 072_aios_actions.sql
-- is skipped on fresh test DBs and aios_outbound_queue does not exist there.
-- An unguarded ALTER would fail, and the runner halts the whole migration
-- chain on failure.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aios_outbound_queue') THEN
    ALTER TABLE aios_outbound_queue ADD COLUMN IF NOT EXISTS draft_blocks JSONB;
  END IF;
END $$;
