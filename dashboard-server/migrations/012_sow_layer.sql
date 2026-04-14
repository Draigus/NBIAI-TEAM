-- Migration 012: SoW Layer Architecture
-- Introduces Statement of Work as a new hierarchy level between Client and Project.
--
-- CRITICAL: The sows table stores ONLY work-package content extracted from
-- uploaded SoW documents. Pricing, commercial terms, and legal language are
-- stripped by the server-side extractor (lib/sow-extractor.js) BEFORE any
-- data reaches this table. The original SoW file is never stored — only
-- the filtered work-package text.

CREATE TABLE IF NOT EXISTS sows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active',
  work_package_text TEXT,
  extraction_stats JSONB,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sows_client_id ON sows(client_id);

-- Add sow_id column to tasks (projects will use this)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sow_id UUID REFERENCES sows(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_sow_id ON tasks(sow_id);

-- Backfill: create one "Default SoW" per existing client so existing projects
-- can be grouped. Tasks are not automatically assigned a sow_id — users can
-- move them into specific SoWs via the UI. The Default SoW provides a landing
-- place for existing work.
INSERT INTO sows (client_id, title, status)
SELECT id, 'Default SoW', 'active'
FROM clients
WHERE NOT EXISTS (SELECT 1 FROM sows WHERE sows.client_id = clients.id);
