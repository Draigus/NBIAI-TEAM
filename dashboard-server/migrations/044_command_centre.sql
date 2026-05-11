-- 044_command_centre.sql
-- Command Centre snapshot storage

CREATE TABLE IF NOT EXISTS cc_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_snapshots_date ON cc_snapshots (snapshot_date DESC);
