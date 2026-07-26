-- 088: A day rate is a contractor's commercial term, not a property of a salary.
--
-- 087 added default_workdays_per_month as ONE client-wide divisor applied to
-- every role, and that was the wrong shape. The Couch Heroes executive review
-- found the flaw: 21 and 18 are not two opinions about one quantity. 21 (261
-- calendar weekdays / 12) is gross weekdays with no leave deducted. 18 (216
-- billable days / 12) is net of 44 days of leave. Applying either to both
-- populations makes one of them wrong. For an FTE, paid across all twelve
-- months whether or not they take leave, 18 overstates the daily cost by about
-- 17%; for a contractor billing only worked days, 21 understates it by the
-- same.
--
-- Glen's resolution (2026-07-25) removes the ambiguity instead of settling it:
-- nobody pays an employee by the day, so an FTE day rate is a derived
-- curiosity with no commercial meaning and an arguable divisor. A contractor
-- day rate is the actual number written on the contract. So the day rate is
-- shown for contractors and PSCs only, and the divisor becomes explicitly
-- theirs. The FTE half of the question disappears rather than being answered.
--
-- 18 also stops being an override and becomes the standard fallback, because
-- it is the correct default for the only population that now has a day rate:
-- 260 working days less 36 vacation less 8 sick = 216 billable a year, 216/12
-- = 18. Both sides of Couch Heroes' own model independently arrive there.
--
-- SAFE TO RE-RUN and safe on any environment.
--
-- The runner applies migrations in numeric order, so on a fresh database 087
-- runs first and creates default_workdays_per_month; 088 then renames it. The
-- rename is therefore the NORMAL path, not an upgrade-only one. A database
-- that has already applied 088 hits the guard and does nothing. The trailing
-- ADD COLUMN IF NOT EXISTS is defensive cover for the remaining case, a
-- database that somehow has neither column (087 skipped or manually reverted);
-- it is not the fresh-install path.
--
-- The rename cannot lose data in any of those cases: the DO block only renames
-- when the new column does not already exist, so it never overwrites a
-- populated column, and ADD COLUMN IF NOT EXISTS never clobbers one either.
-- Whether any row anywhere carries a value in the old column is a fact about
-- deployed environments that a migration cannot verify, so this file no longer
-- asserts it.
--
-- SCOPE is unchanged from 087 and remains deliberately narrow: this value
-- feeds the DISPLAYED day rate only. It is never consulted by the cost engine
-- (lib/hiring-costs.js). A role on a daily basis with no
-- expected_workdays_per_month stays flagged missing_workdays and stays out of
-- cost totals. Filling that gap from a client default would turn an incomplete
-- row into a confident-looking cost resting on an assumption, which is exactly
-- the failure mode 086 was written to stop.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hiring_client_settings'
      AND column_name = 'default_workdays_per_month'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hiring_client_settings'
      AND column_name = 'contractor_workdays_per_month'
  ) THEN
    ALTER TABLE hiring_client_settings
      RENAME COLUMN default_workdays_per_month TO contractor_workdays_per_month;
  END IF;
END $$;

-- Defensive only: a fresh database runs 087 first, so the rename above always
-- finds the column. This covers an abnormal database with neither column.
ALTER TABLE hiring_client_settings
  ADD COLUMN IF NOT EXISTS contractor_workdays_per_month NUMERIC(14, 4);

-- NULL means "not configured", exactly as the on-cost percentages have since
-- 086, and no DEFAULT is materialised: a default that lands in the row reads
-- as a deliberate setting, which is how 084 fabricated on-cost zeros. The
-- CHECK mirrors hiring_positions_workdays_check: strictly positive, because
-- zero divides by zero and negative is meaningless. NULL passes by SQL
-- semantics, which is what "unset" needs.
--
-- Both constraint names are dropped: 087's name is carried by any database
-- that applied it, and dropping the new name makes this block idempotent.
ALTER TABLE hiring_client_settings
  DROP CONSTRAINT IF EXISTS hiring_client_settings_default_workdays_check;

ALTER TABLE hiring_client_settings
  DROP CONSTRAINT IF EXISTS hiring_client_settings_contractor_workdays_check;

ALTER TABLE hiring_client_settings
  ADD CONSTRAINT hiring_client_settings_contractor_workdays_check
    CHECK (contractor_workdays_per_month IS NULL OR contractor_workdays_per_month > 0);
