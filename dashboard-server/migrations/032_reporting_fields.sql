-- 032_reporting_fields.sql
-- Adds three optional text fields to tasks used by the Reporting tab's
-- per-feature Initiative drawer. Mirrors the structure of the Analytics
-- Project Status PowerPoint slides Glen shared on 2026-05-02.
--
-- Filled in primarily on feature rows (item_type = 'feature'), but the
-- columns sit on every row so projects / stories / tasks can opt in.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS risks TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS mitigations TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS documentation_link TEXT DEFAULT '';
