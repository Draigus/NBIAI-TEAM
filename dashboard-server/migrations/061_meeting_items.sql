-- 061_meeting_items.sql
-- Meetings intelligence: JSONB-backed CRUD tables, replaces read-only JSON + meeting_action_status

CREATE TABLE IF NOT EXISTS meeting_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL UNIQUE,
  section TEXT NOT NULL CHECK (section IN ('actions', 'decisions', 'people', 'learnings', 'numbers', 'timeline', 'threads')),
  data JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'compiled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_items_section ON meeting_items(section);

CREATE TABLE IF NOT EXISTS meeting_metadata (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  meeting_count INT NOT NULL DEFAULT 0,
  date_range_start TEXT,
  date_range_end TEXT,
  compiled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
