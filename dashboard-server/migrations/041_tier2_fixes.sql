-- 041_tier2_fixes.sql
-- Tier 2 audit fixes: persistent brute-force protection + DB-driven always-visible clients.

-- Login attempts table: persists brute-force counters across PM2 restarts
CREATE TABLE IF NOT EXISTS login_attempts (
  username TEXT PRIMARY KEY,
  fail_count INT NOT NULL DEFAULT 0,
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ
);

-- Always-visible flag on clients: replaces hardcoded ALWAYS_VISIBLE_CLIENTS array
ALTER TABLE clients ADD COLUMN IF NOT EXISTS always_visible BOOLEAN NOT NULL DEFAULT false;

-- Seed the clients that should be visible to all internal users
UPDATE clients SET always_visible = true WHERE name IN ('NBI Operations', 'Playsage');
