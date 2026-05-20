-- 048_interview_management.sql
-- Interview rounds and scorecards for structured hiring evaluation

CREATE TABLE IF NOT EXISTS interview_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  round_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  outcome TEXT,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ir_candidate ON interview_rounds(candidate_id);

CREATE TABLE IF NOT EXISTS interview_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES interview_rounds(id) ON DELETE CASCADE,
  interviewer_name TEXT NOT NULL,
  interviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
  recommendation TEXT,
  strengths TEXT,
  concerns TEXT,
  criteria JSONB DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_isc_round_user ON interview_scorecards(round_id, interviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_isc_interviewer ON interview_scorecards(interviewer_user_id);

-- Scorecard criteria templates on positions
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS scorecard_criteria JSONB DEFAULT NULL;
