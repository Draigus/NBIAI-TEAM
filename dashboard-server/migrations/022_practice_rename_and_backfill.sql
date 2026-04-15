-- Migration 022: Practice rename + backfill
--
-- Glen's 2026-04-15 decision (D84): practices are reduced to exactly two —
-- 'gaming' and 'organisational_health' — and become MANDATORY on client
-- creation. The "general" practice is removed entirely. Existing work
-- that was tagged 'general', NULL, or 'organisational' is backfilled to
-- 'gaming' per Glen's rule "All of the work that's currently in there
-- should be tagged for the gaming practice."
--
-- Validation of the two valid slugs is enforced at the application layer
-- (server.js POST /api/clients) per the existing pattern established in
-- migration 018. This migration only touches data, not schema.
--
-- Idempotent: running twice is a no-op because after the first run there
-- are no 'general' or 'organisational' rows left to rename.

-- Tasks: everything becomes gaming
UPDATE tasks
   SET practice_area = 'gaming'
 WHERE practice_area IN ('general', 'organisational')
    OR practice_area IS NULL;

-- Leads: same
UPDATE leads
   SET practice_area = 'gaming'
 WHERE practice_area IN ('general', 'organisational')
    OR practice_area IS NULL;

-- Clients: same
UPDATE clients
   SET practice_area = 'gaming'
 WHERE practice_area IN ('general', 'organisational')
    OR practice_area IS NULL;

-- Defensive: if any rows slipped through with a variant spelling of
-- "organisational_health" (unlikely but cheap to guard), normalise them.
-- This is a no-op on a clean database.
UPDATE tasks   SET practice_area = 'organisational_health' WHERE practice_area = 'organizational_health';
UPDATE leads   SET practice_area = 'organisational_health' WHERE practice_area = 'organizational_health';
UPDATE clients SET practice_area = 'organisational_health' WHERE practice_area = 'organizational_health';
