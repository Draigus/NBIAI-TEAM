-- 052_candidate_activity.sql
-- General activity log for non-stage events (CV uploads, source changes, etc.)
-- Stage changes remain in candidate_stage_history; this table covers everything else.

CREATE TABLE IF NOT EXISTS candidate_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    detail TEXT,
    actor TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_candidate_activity_candidate ON candidate_activity(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_activity_created ON candidate_activity(created_at);
