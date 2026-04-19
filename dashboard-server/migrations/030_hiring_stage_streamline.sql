-- Migration 030: streamline hiring stages from 8 to 5 per Magnus feedback
-- (bug b7a2f97f, comment 2026-04-16)
--
-- Old stages:  find_candidate, upload_cv, conduct_interviews, background_check,
--              establish_start_date, send_offer_letter, onboard_candidate, hired
-- New stages:  sourcing, interviews, offer, onboarding, hired
--
-- Mapping:
--   find_candidate       -> sourcing
--   upload_cv            -> sourcing
--   conduct_interviews   -> interviews
--   background_check     -> interviews
--   establish_start_date -> offer
--   send_offer_letter    -> offer
--   onboard_candidate    -> onboarding
--   hired                -> hired (unchanged)

UPDATE candidates SET stage = CASE stage
  WHEN 'find_candidate'       THEN 'sourcing'
  WHEN 'upload_cv'            THEN 'sourcing'
  WHEN 'conduct_interviews'   THEN 'interviews'
  WHEN 'background_check'     THEN 'interviews'
  WHEN 'establish_start_date' THEN 'offer'
  WHEN 'send_offer_letter'    THEN 'offer'
  WHEN 'onboard_candidate'    THEN 'onboarding'
  ELSE stage
END
WHERE stage IN ('find_candidate', 'upload_cv', 'conduct_interviews', 'background_check',
                'establish_start_date', 'send_offer_letter', 'onboard_candidate');

-- Remap stage_assignees keys from old stage names to new stage names.
-- Merges values for stages that collapsed (e.g. find_candidate + upload_cv -> sourcing).
UPDATE candidates SET stage_assignees = (
  COALESCE(
    jsonb_build_object(
      'sourcing',    COALESCE(stage_assignees->'find_candidate', '[]'::jsonb) || COALESCE(stage_assignees->'upload_cv', '[]'::jsonb),
      'interviews',  COALESCE(stage_assignees->'conduct_interviews', '[]'::jsonb) || COALESCE(stage_assignees->'background_check', '[]'::jsonb),
      'offer',       COALESCE(stage_assignees->'establish_start_date', '[]'::jsonb) || COALESCE(stage_assignees->'send_offer_letter', '[]'::jsonb),
      'onboarding',  COALESCE(stage_assignees->'onboard_candidate', '[]'::jsonb),
      'hired',       COALESCE(stage_assignees->'hired', '[]'::jsonb)
    ),
    '{}'::jsonb
  )
)
WHERE stage_assignees IS NOT NULL AND stage_assignees != '{}'::jsonb;

-- Update the default stage for new candidates
ALTER TABLE candidates ALTER COLUMN stage SET DEFAULT 'sourcing';
