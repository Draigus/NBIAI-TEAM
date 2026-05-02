-- 035_documentation_perms.sql
-- Per-user permission flags for the Documentation tab. NBI staff
-- (client_id IS NULL) get all four set to true via the column DEFAULT.
-- Client portal users get the per-client default values applied at
-- account creation; an NBI admin can override on any individual user.
--
-- Per-client defaults live on the clients row: when a new client portal
-- user is created the four flags copy from doc_default_*.
--
-- SAFETY NOTE: this migration sets docs_edit/create/upload to false for
-- every existing client_id IS NOT NULL user. Today there are zero
-- client portal users with any doc-related state so this is safe; if
-- that changes in the future, audit the affected users first.

ALTER TABLE users  ADD COLUMN IF NOT EXISTS docs_view    boolean NOT NULL DEFAULT true;
ALTER TABLE users  ADD COLUMN IF NOT EXISTS docs_edit    boolean NOT NULL DEFAULT true;
ALTER TABLE users  ADD COLUMN IF NOT EXISTS docs_create  boolean NOT NULL DEFAULT true;
ALTER TABLE users  ADD COLUMN IF NOT EXISTS docs_upload  boolean NOT NULL DEFAULT true;

-- Client portal users default to read-only until an NBI admin opens it up.
UPDATE users SET docs_edit = false, docs_create = false, docs_upload = false
WHERE client_id IS NOT NULL;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS doc_default_view    boolean NOT NULL DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS doc_default_edit    boolean NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS doc_default_create  boolean NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS doc_default_upload  boolean NOT NULL DEFAULT false;
