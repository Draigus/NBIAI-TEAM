-- 049_intelligence_layer.sql
-- Rejection reasons, email templates, onboarding checklist

-- Rejection tracking on candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS rejection_category TEXT;

-- Email templates for candidate communications
CREATE TABLE IF NOT EXISTS hiring_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  trigger_stage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_het_client ON hiring_email_templates(client_id);

-- Onboarding checklist items per candidate
CREATE TABLE IF NOT EXISTS onboarding_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oci_candidate ON onboarding_checklist_items(candidate_id);

-- Onboarding checklist template on positions
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS onboarding_template JSONB DEFAULT NULL;
