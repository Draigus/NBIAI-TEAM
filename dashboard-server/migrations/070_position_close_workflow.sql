-- 070_position_close_workflow.sql
-- Position status workflow: open / paused / closed.
-- When closed, track whether the role was filled or shut down,
-- and which candidate filled it.

ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS closed_reason TEXT CHECK (closed_reason IN ('filled', 'shut_down'));
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS filled_by_candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Migrate existing 'filled' status to 'closed' with closed_reason = 'filled'
UPDATE hiring_positions SET closed_reason = 'filled', closed_at = updated_at, status = 'closed' WHERE status = 'filled';
