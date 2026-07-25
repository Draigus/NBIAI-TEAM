-- 087: Per-client working-days-per-month, so a displayed day rate has a basis
-- somebody actually chose.
--
-- Until now the day rate shown in the plan table and the role detail panel was
-- derived as annual / 12 / 21 whenever a role carried no expected_workdays_per_month
-- of its own, which is every role paid on an annual or monthly basis. The 21 was
-- a literal in public/js/domains/nbi-hiring-plan.js. Nobody chose it, nobody could
-- see it, and nobody could change it.
--
-- That silently contradicted client convention. Couch Heroes' own fully-loaded
-- cost model states "day rate = annual / 12 / 18 working days per month", and
-- their July 2026 contractor reform bills 216 days a year, which is also 18 a
-- month. On a GBP 80,000 salary the dashboard showed GBP 317/day where the
-- client's own model says GBP 370/day -- a 17% understatement, presented with no
-- indication of where either figure came from.
--
-- NULL means "not configured", exactly as the on-cost percentages do since 086.
-- An unset value falls back to 21 for display (261 UK working days / 12 = 21.75,
-- conventionally rounded down), and the UI states which basis it used either way.
-- No DEFAULT is attached: a materialised default is how 084 fabricated on-cost
-- zeros that read as deliberate settings, and that mistake is not repeated here.
--
-- SCOPE, deliberately narrow: this value feeds the DISPLAYED day rate only. It
-- is never consulted by the cost engine (lib/hiring-costs.js). A role on a daily
-- basis with no expected_workdays_per_month stays flagged missing_workdays and
-- stays excluded from cost totals. Filling that gap from a client default would
-- turn an incomplete row into a confident-looking cost built on an assumption,
-- which is precisely the failure mode 086 was written to stop.
--
-- CHECK mirrors hiring_positions_workdays_check on hiring_positions: strictly
-- positive. Zero would mean dividing by zero; negative is meaningless. NULL
-- passes by SQL semantics, which is what "unset" needs.

ALTER TABLE hiring_client_settings
  ADD COLUMN IF NOT EXISTS default_workdays_per_month NUMERIC(14, 4);

ALTER TABLE hiring_client_settings
  DROP CONSTRAINT IF EXISTS hiring_client_settings_default_workdays_check;

ALTER TABLE hiring_client_settings
  ADD CONSTRAINT hiring_client_settings_default_workdays_check
    CHECK (default_workdays_per_month IS NULL OR default_workdays_per_month > 0);
