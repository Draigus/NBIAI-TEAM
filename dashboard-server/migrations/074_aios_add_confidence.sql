-- 074_aios_patch_constraints.sql
-- Patches missed when 072/073 were applied from earlier versions.
-- Conditional: only runs if aios_actions exists (skips on fresh test DBs).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aios_actions') THEN
    ALTER TABLE aios_actions
      ADD COLUMN IF NOT EXISTS confidence TEXT
        CHECK (confidence IS NULL OR confidence IN ('low', 'medium', 'high'));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aios_outbound_queue') THEN
    ALTER TABLE aios_outbound_queue
      ALTER COLUMN approval_status SET DEFAULT 'approved';
    ALTER TABLE aios_outbound_queue
      DROP CONSTRAINT IF EXISTS aios_outbound_queue_delivery_status_check;
    ALTER TABLE aios_outbound_queue
      ADD CONSTRAINT aios_outbound_queue_delivery_status_check
        CHECK (delivery_status IN ('pending', 'in_progress', 'sent', 'failed'));
  END IF;
END $$;
