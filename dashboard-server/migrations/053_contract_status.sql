-- 053_contract_status.sql
-- Track contract progress for candidates in offer/onboarding stages.
-- Valid values: creation-of-contract, contract-sent, edits-on-contract, contract-in-review, contract-signed

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS contract_status TEXT;
