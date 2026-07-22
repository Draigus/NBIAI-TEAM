-- 085: Tighten employment_type to the canonical vocabulary.
--
-- Migration 084 normalised existing rows to fte/contractor/psc but left the
-- CHECK permitting the legacy spellings because routes/hiring.js still wrote
-- them. That route now canonicalises on write (permanent->fte,
-- contract->contractor, freelance->psc), so:
--   1. renormalise any interim rows written between 084 and this deploy,
--   2. default new rows to 'fte' (the column default was still 'permanent'),
--   3. tighten the CHECK to canonical-only.

UPDATE hiring_positions SET employment_type = CASE employment_type
  WHEN 'permanent' THEN 'fte'
  WHEN 'contract' THEN 'contractor'
  WHEN 'freelance' THEN 'psc'
  ELSE COALESCE(employment_type, 'fte')
END
WHERE employment_type IN ('permanent', 'contract', 'freelance')
   OR employment_type IS NULL;

ALTER TABLE hiring_positions
  ALTER COLUMN employment_type SET DEFAULT 'fte';

ALTER TABLE hiring_positions
  DROP CONSTRAINT IF EXISTS hiring_positions_employment_type_check;

ALTER TABLE hiring_positions
  ADD CONSTRAINT hiring_positions_employment_type_check
    CHECK (employment_type IN ('fte', 'contractor', 'psc'));
