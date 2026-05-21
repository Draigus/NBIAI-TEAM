-- 051_stage_changed_at.sql
-- Add stage_changed_at for days-in-stage calculation on cards.
-- Backfill from candidate_stage_history (most recent transition per candidate).

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ;

-- Backfill from stage history where available
UPDATE candidates ca SET stage_changed_at = sub.last_move
FROM (
  SELECT candidate_id, MAX(moved_at) AS last_move
  FROM candidate_stage_history
  GROUP BY candidate_id
) sub
WHERE ca.id = sub.candidate_id AND ca.stage_changed_at IS NULL;

-- For candidates with no stage history, fall back to updated_at
UPDATE candidates SET stage_changed_at = COALESCE(updated_at, created_at)
WHERE stage_changed_at IS NULL;

-- Set default for new candidates
ALTER TABLE candidates ALTER COLUMN stage_changed_at SET DEFAULT NOW();
