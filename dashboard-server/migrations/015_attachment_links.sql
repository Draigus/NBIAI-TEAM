-- Migration 015: Link attachments
-- Adds optional URL/title columns to the universal `attachments` table so that
-- a Sharepoint (or any other) link can be stored as an attachment record
-- alongside file uploads. When link_url is set, filename/original_name are
-- placeholders and no file exists on disk.

ALTER TABLE attachments ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT NULL;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS link_title TEXT DEFAULT NULL;

-- Link attachments do not have a real file on disk, so filename and
-- original_name must be allowed to be NULL. Existing file rows keep their
-- values; the API enforces that one of (file, link_url) is always present.
ALTER TABLE attachments ALTER COLUMN filename DROP NOT NULL;
ALTER TABLE attachments ALTER COLUMN original_name DROP NOT NULL;
