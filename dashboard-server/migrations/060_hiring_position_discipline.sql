-- 059_hiring_position_discipline.sql
-- Add discipline field to hiring_positions for interview question filtering.

ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS discipline TEXT;
