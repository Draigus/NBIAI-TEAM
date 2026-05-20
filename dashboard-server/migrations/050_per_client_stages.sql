-- 050_per_client_stages.sql
-- Per-client custom hiring pipeline stages

ALTER TABLE clients ADD COLUMN IF NOT EXISTS hiring_stages JSONB DEFAULT NULL;
