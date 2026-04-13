-- 009_client_studio_contract.sql
-- Add studio_size and contract_value fields to clients table

ALTER TABLE clients ADD COLUMN IF NOT EXISTS studio_size INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_value NUMERIC(12,2);
