-- Cap win_probability at 0-100 and fix any existing bad data
UPDATE leads SET win_probability = 100 WHERE win_probability > 100;
UPDATE leads SET win_probability = 0 WHERE win_probability < 0;
DO $$ BEGIN
  ALTER TABLE leads ADD CONSTRAINT leads_win_probability_range CHECK (win_probability IS NULL OR (win_probability >= 0 AND win_probability <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
