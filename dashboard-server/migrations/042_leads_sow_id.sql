-- Link leads to Statements of Work
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sow_id UUID REFERENCES sows(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_sow_id ON leads(sow_id);
