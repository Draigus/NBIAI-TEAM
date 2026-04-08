-- 002_contacts_columns.sql
-- Add email and phone columns to contacts table.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
