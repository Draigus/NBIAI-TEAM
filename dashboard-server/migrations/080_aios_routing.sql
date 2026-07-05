-- 080_aios_routing.sql
-- Add 'awaiting_routing' to execution_state CHECK constraint for AIOS
-- approval client-routing feature. Actions with recipes enter this state
-- on approval; routing completes before execution fires.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aios_actions') THEN
    ALTER TABLE aios_actions DROP CONSTRAINT IF EXISTS aios_actions_execution_state_check;
    ALTER TABLE aios_actions ADD CONSTRAINT aios_actions_execution_state_check
      CHECK (execution_state IN ('pending', 'in_progress', 'completed', 'failed', 'awaiting_routing'));
  END IF;
END $$;
