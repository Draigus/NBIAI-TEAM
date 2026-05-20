-- 047_jd_attachment.sql
-- Drop requirements (never populated, replaced by JD attachments)
-- Add JD file attachment columns to hiring_positions

ALTER TABLE hiring_positions DROP COLUMN IF EXISTS requirements;

ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS jd_filename TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS jd_original_name TEXT;
