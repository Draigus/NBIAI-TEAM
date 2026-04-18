-- 028_dashboard_snapshots.sql
-- Daily KPI snapshots for week-over-week trend deltas and Work Completed chart.

CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  active_projects INTEGER NOT NULL DEFAULT 0,
  overdue_count INTEGER NOT NULL DEFAULT 0,
  blocked_count INTEGER NOT NULL DEFAULT 0,
  at_risk_count INTEGER NOT NULL DEFAULT 0,
  hours_spent NUMERIC(10,1) NOT NULL DEFAULT 0,
  hours_estimated NUMERIC(10,1) NOT NULL DEFAULT 0,
  tasks_planned INTEGER NOT NULL DEFAULT 0,
  tasks_added INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_date
  ON dashboard_snapshots (snapshot_date DESC);
