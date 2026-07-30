-- 090: reconcile aios_outbound_queue.destination_type CHECK across environments.
--
-- 089 creates aios_outbound_queue at prod's introspected shape (destination_type
-- IN slack_dm / email_draft / worksage_task) but only IF NOT EXISTS. On any
-- database where 072 had already created the table, the older two-value CHECK
-- (no 'worksage_task') survives 089 untouched. Found live 2026-07-30: staging
-- rejected 'worksage_task' rows while prod, test and test_iso accepted them.
-- The same divergence would recur on every genuinely fresh chain build, because
-- 072 runs before 089.
--
-- Drop and re-add at the full shape. Idempotent: re-adding an identical
-- constraint on already-correct databases changes nothing observable.

ALTER TABLE aios_outbound_queue
  DROP CONSTRAINT IF EXISTS aios_outbound_queue_destination_type_check;

ALTER TABLE aios_outbound_queue
  ADD CONSTRAINT aios_outbound_queue_destination_type_check
  CHECK (destination_type IN ('slack_dm', 'email_draft', 'worksage_task'));
