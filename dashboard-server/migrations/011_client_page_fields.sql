-- Migration 011: Client Page - additional fields for Phase 2
-- Adds current_studio_project and research_data columns to clients table

ALTER TABLE clients ADD COLUMN IF NOT EXISTS current_studio_project TEXT DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS research_data JSONB DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS research_updated_at TIMESTAMPTZ DEFAULT NULL;
