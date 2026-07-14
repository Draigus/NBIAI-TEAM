-- Add process_closed stage to clients with custom hiring_stages that are missing it.
-- This ensures all clients can use the Process Closed terminal stage.
UPDATE clients
SET hiring_stages = hiring_stages || '[{"key":"process_closed","label":"Process Closed"}]'::jsonb
WHERE hiring_stages IS NOT NULL
  AND jsonb_typeof(hiring_stages) = 'array'
  AND jsonb_array_length(hiring_stages) > 0
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(hiring_stages) elem
    WHERE elem->>'key' = 'process_closed'
  );
