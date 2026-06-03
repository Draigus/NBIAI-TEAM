-- 062_interview_redesign.sql
-- Interview UX Redesign: consolidate rounds into configs, add scheduling,
-- candidate-level decisions, and fix FK constraints for data integrity.

-- ===== 1. HIRING DECISIONS (candidate-level advance/hold/reject) =====
CREATE TABLE IF NOT EXISTS hiring_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('advance', 'hold', 'reject')),
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hd_candidate ON hiring_decisions(candidate_id);

-- ===== 2. ADD ROUND / SCHEDULING COLUMNS TO interview_configs =====
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS round_type TEXT;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS round_type_custom TEXT;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS round_number INT;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS duration_minutes INT;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS interviewer_name TEXT;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE interview_configs ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

-- ===== 3. CHECK CONSTRAINTS on new columns =====
DO $$ BEGIN
  ALTER TABLE interview_configs
    ADD CONSTRAINT chk_ic_round_type
    CHECK (round_type IN ('Phone Screen', 'Technical', 'Cultural', 'Final', 'Other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE interview_configs
    ADD CONSTRAINT chk_ic_outcome
    CHECK (outcome IN ('passed', 'failed', 'pending', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE interview_configs
    ADD CONSTRAINT chk_ic_duration_minutes
    CHECK (duration_minutes > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== 4. FIX candidate_id FK: delete orphans, make NOT NULL, cascade =====
-- Remove rows with NULL candidate_id (orphans from ON DELETE SET NULL)
DELETE FROM interview_configs WHERE candidate_id IS NULL;

-- Drop existing FK so we can replace it
DO $$ BEGIN
  ALTER TABLE interview_configs DROP CONSTRAINT IF EXISTS interview_configs_candidate_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Make NOT NULL
ALTER TABLE interview_configs ALTER COLUMN candidate_id SET NOT NULL;

-- Re-add FK with ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE interview_configs
    ADD CONSTRAINT interview_configs_candidate_id_fkey
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== 5. BACKFILL round_number for existing configs =====
UPDATE interview_configs AS ic
SET round_number = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY candidate_id ORDER BY created_at) AS rn
  FROM interview_configs
) sub
WHERE ic.id = sub.id
  AND ic.round_number IS NULL;

-- ===== 6. UNIQUE constraint on (candidate_id, round_number) =====
DO $$ BEGIN
  ALTER TABLE interview_configs
    ADD CONSTRAINT uq_ic_candidate_round
    UNIQUE (candidate_id, round_number);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== 7. ADD 'declined' to interview_sessions status CHECK =====
-- Drop old CHECK and add updated one
ALTER TABLE interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_status_check;

DO $$ BEGIN
  ALTER TABLE interview_sessions
    ADD CONSTRAINT interview_sessions_status_check
    CHECK (status IN ('assigned', 'in_progress', 'submitted', 'declined'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== 8. ADD created_at, updated_at to interview_scores =====
ALTER TABLE interview_scores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE interview_scores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ===== 9. CHANGE interview_config_questions.question_id FK to ON DELETE SET NULL =====
-- Drop NOT NULL first
ALTER TABLE interview_config_questions ALTER COLUMN question_id DROP NOT NULL;

-- Drop existing FK and re-add with SET NULL
DO $$ BEGIN
  ALTER TABLE interview_config_questions DROP CONSTRAINT IF EXISTS interview_config_questions_question_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE interview_config_questions
    ADD CONSTRAINT interview_config_questions_question_id_fkey
    FOREIGN KEY (question_id) REFERENCES interview_question_bank(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== 10. CHANGE interview_scores.question_id FK to ON DELETE SET NULL =====
-- Drop NOT NULL first
ALTER TABLE interview_scores ALTER COLUMN question_id DROP NOT NULL;

-- Drop existing FK and re-add with SET NULL
DO $$ BEGIN
  ALTER TABLE interview_scores DROP CONSTRAINT IF EXISTS interview_scores_question_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE interview_scores
    ADD CONSTRAINT interview_scores_question_id_fkey
    FOREIGN KEY (question_id) REFERENCES interview_question_bank(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== 11. PARTIAL INDEX on interview_configs.scheduled_at WHERE NOT NULL =====
CREATE INDEX IF NOT EXISTS idx_ic_scheduled_at
  ON interview_configs(scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- ===== 12. MIGRATE DATA from interview_rounds into interview_configs =====
-- Map round titles to round_type, outcomes to new enum, infer position_id
INSERT INTO interview_configs (
  candidate_id,
  position_id,
  round_type,
  round_type_custom,
  round_number,
  scheduled_at,
  duration_minutes,
  location,
  interviewer_name,
  outcome,
  outcome_notes,
  status,
  created_at,
  updated_at
)
SELECT
  ir.candidate_id,
  c.position_id,
  CASE
    WHEN ir.title ILIKE '%phone%'     THEN 'Phone Screen'
    WHEN ir.title ILIKE '%technical%' THEN 'Technical'
    WHEN ir.title ILIKE '%cultural%'  THEN 'Cultural'
    WHEN ir.title ILIKE '%final%'     THEN 'Final'
    ELSE 'Other'
  END AS round_type,
  CASE
    WHEN ir.title NOT ILIKE '%phone%'
     AND ir.title NOT ILIKE '%technical%'
     AND ir.title NOT ILIKE '%cultural%'
     AND ir.title NOT ILIKE '%final%'
    THEN ir.title
    ELSE NULL
  END AS round_type_custom,
  ir.round_number,
  ir.scheduled_at,
  ir.duration_minutes,
  ir.location,
  NULL AS interviewer_name,
  CASE
    WHEN ir.outcome = 'pass'              THEN 'passed'
    WHEN ir.outcome = 'fail'              THEN 'failed'
    WHEN ir.outcome = 'on-hold'           THEN 'pending'
    WHEN ir.status  = 'cancelled'         THEN 'cancelled'
    ELSE NULL
  END AS outcome,
  ir.outcome_notes,
  'completed' AS status,
  ir.created_at,
  ir.updated_at
FROM interview_rounds ir
JOIN candidates c ON c.id = ir.candidate_id
WHERE NOT EXISTS (
  SELECT 1 FROM interview_configs ic
  WHERE ic.candidate_id = ir.candidate_id
    AND ic.round_number = ir.round_number
);

-- ===== 13. SET round_type NOT NULL after backfill =====
-- All existing rows now have round_type from either step 12 or manual entry.
-- Default remaining NULLs (from step 2 adds on pre-existing configs) to 'Other'
UPDATE interview_configs SET round_type = 'Other' WHERE round_type IS NULL;

ALTER TABLE interview_configs ALTER COLUMN round_type SET NOT NULL;
