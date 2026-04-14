-- 019_client_abbreviation.sql
-- Add a persistent, editable abbreviation field per client.
-- Used in truncated displays (calendar chips, client badges, etc).
-- Admin-editable via the Manage Clients view.
-- Magnus feedback item B.3 — completes the "Client Page" spec she filed.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS abbreviation TEXT;

-- Backfill the commonly-used known-client abbreviations so existing rows
-- already display correctly without requiring admin to type them in.
UPDATE clients SET abbreviation = 'CH'  WHERE name = 'Couch Heroes'         AND abbreviation IS NULL;
UPDATE clients SET abbreviation = 'LH'  WHERE name = 'Lighthouse Studios'   AND abbreviation IS NULL;
UPDATE clients SET abbreviation = 'GO'  WHERE name = 'Goals Studio'         AND abbreviation IS NULL;
UPDATE clients SET abbreviation = 'SU'  WHERE name = 'Sarge Universe'       AND abbreviation IS NULL;
UPDATE clients SET abbreviation = 'PL'  WHERE name = 'Playsage'             AND abbreviation IS NULL;
UPDATE clients SET abbreviation = 'NBI' WHERE name = 'NBI Operations'       AND abbreviation IS NULL;
