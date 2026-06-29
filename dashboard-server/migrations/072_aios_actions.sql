-- 072_aios_actions.sql
-- AIOS canonical action model and outbound message broker queue.
-- Design spec: docs/superpowers/specs/2026-06-28-aios-fix-forward-design.md

CREATE TABLE aios_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL,
  source_id TEXT,
  source_timestamp TIMESTAMPTZ,
  source_quote TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('task', 'draft', 'incident', 'proposal', 'risk', 'decision')),
  title TEXT NOT NULL,
  description TEXT,
  proposed_action TEXT,
  risk_class TEXT NOT NULL DEFAULT 'low' CHECK (risk_class IN ('low', 'medium', 'high', 'critical')),
  owner TEXT NOT NULL DEFAULT 'glen',
  due_date DATE,
  confidence TEXT CHECK (confidence IS NULL OR confidence IN ('low', 'medium', 'high')),
  approval_state TEXT NOT NULL DEFAULT 'pending' CHECK (approval_state IN ('pending', 'approved', 'rejected', 'snoozed')),
  execution_state TEXT NOT NULL DEFAULT 'pending' CHECK (execution_state IN ('pending', 'in_progress', 'completed', 'failed')),
  verification_state TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_state IN ('unverified', 'verified', 'not_applicable')),
  dismissal_reason TEXT,
  created_by_routine TEXT,
  idempotency_key TEXT UNIQUE,
  feedback_signal TEXT CHECK (feedback_signal IS NULL OR feedback_signal IN ('approved_unchanged', 'approved_edited', 'rejected_wrong', 'rejected_not_worth', 'snoozed', 'ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aios_actions_approval ON aios_actions (approval_state) WHERE approval_state != 'rejected';
CREATE INDEX idx_aios_actions_source ON aios_actions (source_system, source_id);
CREATE INDEX idx_aios_actions_idempotency ON aios_actions (idempotency_key);

CREATE TABLE aios_outbound_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID REFERENCES aios_actions(id),
  destination_type TEXT NOT NULL CHECK (destination_type IN ('slack_dm', 'email_draft')),
  destination_id TEXT NOT NULL,
  draft_text TEXT NOT NULL,
  reason TEXT,
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'in_progress', 'sent', 'failed')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aios_outbound_pending ON aios_outbound_queue (delivery_status) WHERE delivery_status = 'pending';
