-- 071_interview_edit_resend.sql
-- Fix outcome CHECK to include rescheduled and no_show values
-- that the backend already accepts but the DB constraint rejects.

ALTER TABLE interview_configs DROP CONSTRAINT IF EXISTS chk_ic_outcome;

DO $$ BEGIN
  ALTER TABLE interview_configs
    ADD CONSTRAINT chk_ic_outcome
    CHECK (outcome IN ('passed', 'failed', 'pending', 'cancelled', 'rescheduled', 'no_show'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
