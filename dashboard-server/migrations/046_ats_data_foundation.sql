-- 046_ats_data_foundation.sql
-- ATS Data Foundation: stage history, comments, candidate fields, GDPR

-- 1. Stage transition history
CREATE TABLE IF NOT EXISTS candidate_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  moved_by TEXT NOT NULL,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_csh_candidate ON candidate_stage_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_csh_moved_at ON candidate_stage_history(moved_at);

-- 2. Candidate new columns
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source_detail TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS consent_date TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;

-- 3. Enriched hiring positions
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS salary_range TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'permanent';
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS interview_panel JSONB DEFAULT '[]'::jsonb;

-- 4. Threaded comments
CREATE TABLE IF NOT EXISTS candidate_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cc_candidate ON candidate_comments(candidate_id);

-- 5. Migrate existing notes to comments (one-time, idempotent)
INSERT INTO candidate_comments (candidate_id, author, body, internal, created_at)
SELECT id, 'System Migration', notes, true, COALESCE(updated_at, created_at, NOW())
FROM candidates
WHERE notes IS NOT NULL AND notes != ''
  AND id NOT IN (SELECT DISTINCT candidate_id FROM candidate_comments);

-- 6. GDPR retention backfill for existing candidates
UPDATE candidates SET retention_expires_at = created_at + INTERVAL '12 months'
WHERE retention_expires_at IS NULL;
