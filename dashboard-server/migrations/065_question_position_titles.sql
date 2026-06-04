-- 065_question_position_titles.sql
-- Add position_titles array to interview_question_bank for role-specific filtering.
-- Replaces discipline-only filtering with position-title-based matching.

ALTER TABLE interview_question_bank ADD COLUMN IF NOT EXISTS position_titles TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_iqb_position_titles ON interview_question_bank USING GIN (position_titles);
