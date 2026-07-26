-- 089_aios_actions_repair.sql
--
-- Repairs a migration-numbering collision that left aios_actions and
-- aios_outbound_queue missing from every database built from migrations.
--
-- History: schema_migrations version 72 is recorded as
-- "072_seed_interview_questions.sql" (a file since renamed away), so the
-- runner skips the 072_aios_actions.sql that now sits on disk under the same
-- number: it never runs anywhere. The later AIOS patches (074, 076) were
-- written as conditional DO-blocks that silently skip when the table is
-- absent, which hid the gap instead of closing it. Production has the tables
-- (built when the original chain ran there); test databases do not, and the
-- AIOS executor cron errors every cycle on them with
-- 'relation "aios_actions" does not exist' (observed 2026-07-26).
--
-- This migration creates the tables at PRODUCTION'S CURRENT SHAPE, verified
-- by introspecting the live prod schema on 2026-07-26 (columns, defaults,
-- checks, indexes; no triggers). On prod every statement is a no-op.
-- aios_signals (078) exists everywhere and precedes this file, so the FK is
-- always satisfiable.

CREATE TABLE IF NOT EXISTS aios_actions (
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
  approval_state TEXT NOT NULL DEFAULT 'pending' CHECK (approval_state IN ('pending', 'approved', 'rejected', 'snoozed')),
  execution_state TEXT NOT NULL DEFAULT 'pending' CHECK (execution_state IN ('pending', 'in_progress', 'completed', 'failed', 'awaiting_routing')),
  verification_state TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_state IN ('unverified', 'verified', 'not_applicable')),
  dismissal_reason TEXT,
  created_by_routine TEXT,
  idempotency_key TEXT UNIQUE,
  feedback_signal TEXT CHECK (feedback_signal IS NULL OR feedback_signal IN ('approved_unchanged', 'approved_edited', 'rejected_wrong', 'rejected_not_worth', 'snoozed', 'ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence TEXT CHECK (confidence IS NULL OR confidence IN ('low', 'medium', 'high')),
  signal_id UUID REFERENCES aios_signals(id),
  execution_recipe JSONB,
  execution_result JSONB
);

CREATE INDEX IF NOT EXISTS idx_aios_actions_approval ON aios_actions (approval_state) WHERE approval_state <> 'rejected';
CREATE INDEX IF NOT EXISTS idx_aios_actions_source ON aios_actions (source_system, source_id);
CREATE INDEX IF NOT EXISTS idx_aios_actions_idempotency ON aios_actions (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_aios_actions_signal ON aios_actions (signal_id) WHERE signal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aios_actions_executor ON aios_actions (approval_state, execution_state) WHERE approval_state = 'approved' AND execution_state = 'pending';

CREATE TABLE IF NOT EXISTS aios_outbound_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID REFERENCES aios_actions(id),
  destination_type TEXT NOT NULL CHECK (destination_type IN ('slack_dm', 'email_draft', 'worksage_task')),
  destination_id TEXT NOT NULL,
  draft_text TEXT NOT NULL,
  reason TEXT,
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'in_progress', 'sent', 'failed')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  draft_blocks JSONB
);

CREATE INDEX IF NOT EXISTS idx_aios_outbound_pending ON aios_outbound_queue (delivery_status) WHERE delivery_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_aios_outbound_queue_action_id ON aios_outbound_queue (action_id);

-- Ledger repair, so a strict (version, name) completeness check can hold from
-- here on. v72 carries the renamed-away file's name; once this migration has
-- supplied the missing aios DDL above, recording v72 under the on-disk
-- filename is true again. v27 was recorded without its .sql suffix by an
-- early bootstrap insert; same file, cosmetic repair.
UPDATE schema_migrations SET name = '072_aios_actions.sql'
 WHERE version = 72 AND name = '072_seed_interview_questions.sql';
UPDATE schema_migrations SET name = '027_audit_fixes.sql'
 WHERE version = 27 AND name = '027_audit_fixes';
