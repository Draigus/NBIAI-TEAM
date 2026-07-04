-- 078_aios_signals.sql
-- Signal registry: tracks recognised signals as stateful entities.
-- Fingerprints deduplicate at the signal level (not just per-item idempotency).
-- Design spec: docs/superpowers/specs/2026-07-04-aios-signal-engine-design.md (Component 2)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aios_signals') THEN
    CREATE TABLE aios_signals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      fingerprint TEXT NOT NULL UNIQUE,
      signal_type TEXT NOT NULL CHECK (signal_type IN ('people', 'product', 'business', 'risk', 'process')),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'proposed', 'approved', 'rejected', 'built', 'expired')),
      first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_enriched TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      evidence_count INTEGER NOT NULL DEFAULT 1,
      linked_action_id UUID,
      summary TEXT NOT NULL,
      enrichment_log JSONB NOT NULL DEFAULT '[]'::jsonb,
      rejection_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_aios_signals_fingerprint ON aios_signals (fingerprint);
    CREATE INDEX idx_aios_signals_status ON aios_signals (status) WHERE status IN ('open', 'proposed');
  END IF;
END $$;
