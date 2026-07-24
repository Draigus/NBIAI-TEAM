-- 086: On-cost defaults must be able to be UNSET (NULL), never a fabricated 0.
--
-- The cost engine (lib/hiring-costs.js) treats a missing default as "cannot
-- cost roles of this engagement type" and reports it per row. The DEFAULT 0
-- from 084 contradicted that: a first-time settings save that omitted a
-- percentage silently materialised a configured-looking 0% on-cost for the
-- omitted type, understating loaded costs with no warning (Codex review P2,
-- 2026-07-24).
--
-- No backfill of existing zeros: verified 2026-07-24 that hiring_client_settings
-- contains ZERO rows in the shared prod/staging database (read-only probe),
-- so no pre-086 row with a materialised DEFAULT 0 exists anywhere, and after
-- this migration none can be created. A speculative zero->NULL backfill could
-- also never distinguish a deliberate "0% on-cost" from a defaulted one, so
-- it would risk destroying legitimate explicit zeros. The CHECK (>= 0)
-- constraints pass NULL by SQL semantics and stay in place.

ALTER TABLE hiring_client_settings
  ALTER COLUMN fte_on_cost_pct DROP DEFAULT,
  ALTER COLUMN fte_on_cost_pct DROP NOT NULL,
  ALTER COLUMN contractor_on_cost_pct DROP DEFAULT,
  ALTER COLUMN contractor_on_cost_pct DROP NOT NULL,
  ALTER COLUMN psc_on_cost_pct DROP DEFAULT,
  ALTER COLUMN psc_on_cost_pct DROP NOT NULL;
