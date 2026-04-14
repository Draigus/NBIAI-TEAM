-- Migration 018: Practice areas
--
-- Phase 9 of the NBI WorkSage backlog adds an Organisational practice
-- alongside Gaming and General. Records (leads, tasks, clients) get an
-- optional practice_area tag that the sidebar uses to filter every view
-- (dashboard, projects, leads board, clients page) down to a single
-- practice. NULL means unclassified.
--
-- Glen's note (closes 9a10d8d1): Human Capital is a subset of the wider
-- Organisational practice, so the UI now says "Organisational"
-- everywhere even though the underlying value is `organisational`.
--
-- Valid values (enforced at the application layer, not the DB, so we
-- can add new practices later without another migration):
--   'organisational'
--   'gaming'
--   'general'
--   NULL (unclassified)

ALTER TABLE leads    ADD COLUMN IF NOT EXISTS practice_area TEXT DEFAULT NULL;
ALTER TABLE tasks    ADD COLUMN IF NOT EXISTS practice_area TEXT DEFAULT NULL;
ALTER TABLE clients  ADD COLUMN IF NOT EXISTS practice_area TEXT DEFAULT NULL;

-- Indexes for the sidebar filter — every practice change re-renders all
-- three lists, so even a small dataset benefits from a btree index.
CREATE INDEX IF NOT EXISTS idx_leads_practice_area    ON leads(practice_area)    WHERE practice_area IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_practice_area    ON tasks(practice_area)    WHERE practice_area IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_practice_area  ON clients(practice_area)  WHERE practice_area IS NOT NULL;

-- Seed the new "Organisational" work types for leads (closes c5f0705e).
-- Existing options are left in place. ON CONFLICT keeps this idempotent
-- in case the migration is re-run on a partially-populated database.
INSERT INTO lead_field_options (field_name, value, sort_order) VALUES
  ('work_type', 'Barrier analysis',                       100),
  ('work_type', 'Market research',                        101),
  ('work_type', 'Change management',                      102),
  ('work_type', 'AI readiness',                           103),
  ('work_type', 'Advanced analytics',                     104),
  ('work_type', 'Training',                               105),
  ('work_type', 'Other for organisational performance',   106)
ON CONFLICT (field_name, value) DO NOTHING;

-- Rename the legacy "Human Capital" client_sector option to
-- "Organisational" (closes 9a10d8d1). The lead_field_options table has a
-- UNIQUE (field_name, value) constraint, so we delete-then-insert rather
-- than update-in-place, which is safe if the new label already exists.
-- Existing client.sector values pointing to "Human Capital" are
-- back-filled to "Organisational" in the same step. The clients.sector
-- column is free-text so this is the only data migration needed.
INSERT INTO lead_field_options (field_name, value, sort_order)
  VALUES ('client_sector', 'Organisational', 2)
  ON CONFLICT (field_name, value) DO NOTHING;
DELETE FROM lead_field_options
 WHERE field_name = 'client_sector'
   AND value      = 'Human Capital';
UPDATE clients SET sector = 'Organisational' WHERE sector = 'Human Capital';
