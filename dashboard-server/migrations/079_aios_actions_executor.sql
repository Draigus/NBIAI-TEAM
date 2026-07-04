-- 079_aios_actions_executor.sql
-- Executor metadata on aios_actions: signal linkage, recipe, and result.
-- Conditional guard: aios_actions may not exist on test DBs.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aios_actions') THEN
    ALTER TABLE aios_actions ADD COLUMN IF NOT EXISTS signal_id UUID REFERENCES aios_signals(id);
    ALTER TABLE aios_actions ADD COLUMN IF NOT EXISTS execution_recipe JSONB;
    ALTER TABLE aios_actions ADD COLUMN IF NOT EXISTS execution_result JSONB;

    CREATE INDEX IF NOT EXISTS idx_aios_actions_signal ON aios_actions (signal_id) WHERE signal_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_aios_actions_executor ON aios_actions (approval_state, execution_state)
      WHERE approval_state = 'approved' AND execution_state = 'pending';
  END IF;
END $$;
