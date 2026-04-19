-- 029_work_type.sql
-- Add work_type field to tasks for project categorisation
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_type TEXT;

-- Add new KPI columns to dashboard_snapshots
ALTER TABLE dashboard_snapshots ADD COLUMN IF NOT EXISTS on_track_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dashboard_snapshots ADD COLUMN IF NOT EXISTS active_leads_count INTEGER NOT NULL DEFAULT 0;

-- Seed default work type categories into lead_field_options
INSERT INTO lead_field_options (field_name, value, sort_order, is_active) VALUES
  ('work_type', 'Research', 1, true),
  ('work_type', 'Strategy', 2, true),
  ('work_type', 'Implementation', 3, true),
  ('work_type', 'Assessment', 4, true),
  ('work_type', 'Ongoing Mgmt', 5, true)
ON CONFLICT DO NOTHING;
