-- Auto-remediation for feed health (2026-07-17): distinguish health-check
-- auto-disables from manual disables so the recovery probe only ever
-- re-enables sources the system itself turned off. Applied out-of-band
-- like 0002 (not in the drizzle journal); idempotent.
ALTER TABLE news.sources
  ADD COLUMN IF NOT EXISTS auto_disabled_at timestamptz;
