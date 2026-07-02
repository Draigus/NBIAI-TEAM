-- Migration 075: Configurable Hierarchy
-- Adds per-client hierarchy depth config, Initiative root level,
-- and server-held undo tokens for type cascade operations.

-- 1. Add hierarchy_levels JSONB column to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hierarchy_levels JSONB
  DEFAULT '["project","feature","story","task"]'::jsonb;

-- 2. Create retype_undo_tokens table for server-held cascade undo
CREATE TABLE IF NOT EXISTS retype_undo_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  root_item_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  changes JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_retype_undo_expires ON retype_undo_tokens(expires_at);

-- 3. Create Initiative roots for clients with root-level non-initiative items.
-- Uses source='migration-hierarchy' for idempotent re-runs.

-- 3a: Create General initiatives for clients that have root items but no initiative
INSERT INTO tasks (title, item_type, client_id, status, source, parent_id)
SELECT DISTINCT
  'General',
  'initiative',
  sub.client_id,
  'In progress',
  'migration-hierarchy',
  NULL::uuid
FROM (
  SELECT DISTINCT client_id
  FROM tasks
  WHERE parent_id IS NULL
    AND item_type <> 'initiative'
) sub
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t2
  WHERE t2.client_id IS NOT DISTINCT FROM sub.client_id
    AND t2.item_type = 'initiative'
    AND t2.parent_id IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM tasks t3
  WHERE t3.source = 'migration-hierarchy'
    AND t3.client_id IS NOT DISTINCT FROM sub.client_id
);

-- 3b: Reparent root non-initiative items under their client's initiative.
-- Picks the earliest initiative root per client (handles mixed-root case).
UPDATE tasks t
SET parent_id = (
  SELECT i.id
  FROM tasks i
  WHERE i.item_type = 'initiative'
    AND i.parent_id IS NULL
    AND i.client_id IS NOT DISTINCT FROM t.client_id
  ORDER BY i.created_at ASC
  LIMIT 1
)
WHERE t.parent_id IS NULL
  AND t.item_type <> 'initiative';
