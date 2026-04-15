-- Migration 024: hiring page rewrite to Glen's 8-stage process (bug b7a2f97f)
--
-- Adds columns needed by the rewritten hiring page:
--   stage_assignees  jsonb   per-stage employee nametags
--   start_date       date    set when stage = establish_start_date
--   onboarding_links jsonb   array of {type: 'file'|'link', value: ...} for onboard_candidate
--   archived_at      timestamptz  set when the Hired stage is confirmed; null = active
--
-- Migrates existing stage values from the old 6-stage taxonomy to Glen's
-- 8-stage process. Rejected rows are archived (archived_at = now()) before
-- the stage rename so the archived check still sees them as 'rejected'.

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS stage_assignees JSONB DEFAULT '{}'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS onboarding_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Step 1: archive rejected candidates while we can still identify them
UPDATE candidates SET archived_at = NOW() WHERE stage = 'rejected' AND archived_at IS NULL;

-- Step 2: map old stages to new stages. Anything unrecognised becomes find_candidate.
UPDATE candidates SET stage = CASE stage
  WHEN 'sourced'    THEN 'find_candidate'
  WHEN 'screening'  THEN 'upload_cv'
  WHEN 'interview'  THEN 'conduct_interviews'
  WHEN 'offer'      THEN 'send_offer_letter'
  WHEN 'hired'      THEN 'hired'
  WHEN 'rejected'   THEN 'find_candidate'
  ELSE 'find_candidate'
END
WHERE stage NOT IN ('find_candidate', 'upload_cv', 'conduct_interviews', 'background_check',
                    'establish_start_date', 'send_offer_letter', 'onboard_candidate', 'hired')
   OR stage IS NULL;
