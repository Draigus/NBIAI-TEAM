-- 084_hiring_plan.sql
-- Hiring plan schema: structured headcount planning on top of the hiring page.
--
--   hiring_departments      - per-client departments a position belongs to
--   hiring_client_settings  - per-client approvers, on-cost percentages and
--                             permitted currencies
--   hiring_recruiters       - which users act as recruiters for a client
--   hiring_approval_events  - append-only approval history with JSONB
--                             snapshots and structured denial reasons
--
-- hiring_positions gains planning and compensation columns with database-level
-- checks. Pre-existing positions are backfilled to approval_status 'approved'
-- (with a legacy_imported event each) WITHOUT inventing cost assumptions:
-- financial columns stay NULL. New rows default to 'pending'.
--
-- The runner executes this whole file inside one transaction, so ordering
-- below (add columns -> normalise data -> backfill -> tighten constraints)
-- is safe.

-- 1. Departments -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hiring_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  director_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hiring_departments_client_name
  ON hiring_departments (client_id, LOWER(name));

-- 2. Per-client hiring settings ----------------------------------------------

CREATE TABLE IF NOT EXISTS hiring_client_settings (
  client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  coo_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  finance_director_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  fte_on_cost_pct NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (fte_on_cost_pct >= 0),
  contractor_on_cost_pct NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (contractor_on_cost_pct >= 0),
  psc_on_cost_pct NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (psc_on_cost_pct >= 0),
  permitted_currencies JSONB NOT NULL DEFAULT '["GBP"]'::jsonb,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(permitted_currencies) = 'array')
);

-- 3. Recruiters per client ---------------------------------------------------

CREATE TABLE IF NOT EXISTS hiring_recruiters (
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (client_id, user_id)
);

-- 4. Planning and compensation columns on hiring_positions --------------------

ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES hiring_departments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_hiring_positions_department ON hiring_positions (department_id);
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS priority SMALLINT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS target_start_month DATE;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS requirement_type TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS approval_status TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS approval_submitted_at TIMESTAMPTZ;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS hiring_manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS compensation_min NUMERIC(14,4);
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS compensation_max NUMERIC(14,4);
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS budgeted_compensation NUMERIC(14,4);
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS compensation_currency CHAR(3);
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS compensation_basis TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS expected_workdays_per_month NUMERIC(14,4);
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS fx_rate_to_gbp NUMERIC(14,4);
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS fx_rate_effective_date DATE;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS fx_rate_source_note TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS on_cost_override_pct NUMERIC(7,4);
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS recruiting_started_at TIMESTAMPTZ;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS planning_version INTEGER NOT NULL DEFAULT 1;

-- 5. Normalise legacy engagement types before constraining them.
-- Legacy UI values map onto the planning vocabulary. The check below still
-- permits the legacy spellings because the current position API writes them;
-- the API tasks that follow migrate writes to the canonical values.

-- Pre-flight guard: fail loudly and auditably if any historical value exists
-- outside the six known spellings (manual DB writes could have introduced
-- one). Never silently invent a mapping for unknown values.
DO $$
DECLARE
  unmapped TEXT;
BEGIN
  SELECT string_agg(format('%s (id %s)', employment_type, id), ', ')
    INTO unmapped
  FROM hiring_positions
  WHERE employment_type IS NOT NULL
    AND employment_type NOT IN ('permanent', 'contract', 'freelance', 'fte', 'contractor', 'psc');
  IF unmapped IS NOT NULL THEN
    RAISE EXCEPTION 'migration 084: unmapped employment_type values: %', unmapped;
  END IF;
END $$;

-- NULL is promoted to 'fte' because the previous API defaulted new positions
-- to 'permanent', which maps to 'fte'.
UPDATE hiring_positions SET employment_type = CASE employment_type
  WHEN 'permanent' THEN 'fte'
  WHEN 'contract' THEN 'contractor'
  WHEN 'freelance' THEN 'psc'
  ELSE COALESCE(employment_type, 'fte')
END
WHERE employment_type IN ('permanent', 'contract', 'freelance')
   OR employment_type IS NULL;

-- 6. Backfill approval state for pre-existing positions. They were created
-- before approval workflow existed, so they are treated as already approved.
-- Financial fields deliberately stay NULL: no invented cost assumptions.

UPDATE hiring_positions SET approval_status = 'approved' WHERE approval_status IS NULL;
ALTER TABLE hiring_positions ALTER COLUMN approval_status SET DEFAULT 'pending';
ALTER TABLE hiring_positions ALTER COLUMN approval_status SET NOT NULL;

-- 7. Checks on hiring_positions (NULL passes a CHECK, so optional columns
-- only get validated when a value is present).

ALTER TABLE hiring_positions
  ADD CONSTRAINT hiring_positions_priority_check
    CHECK (priority BETWEEN 0 AND 4),
  ADD CONSTRAINT hiring_positions_target_start_month_check
    CHECK (EXTRACT(DAY FROM target_start_month) = 1),
  ADD CONSTRAINT hiring_positions_requirement_type_check
    CHECK (requirement_type IN ('new', 'backfill')),
  ADD CONSTRAINT hiring_positions_approval_status_check
    CHECK (approval_status IN ('pending', 'approved', 'denied')),
  ADD CONSTRAINT hiring_positions_employment_type_check
    CHECK (employment_type IN ('fte', 'contractor', 'psc', 'permanent', 'contract', 'freelance')),
  ADD CONSTRAINT hiring_positions_compensation_range_check
    CHECK (compensation_min <= compensation_max),
  ADD CONSTRAINT hiring_positions_budgeted_compensation_check
    CHECK (budgeted_compensation > 0),
  ADD CONSTRAINT hiring_positions_compensation_currency_check
    CHECK (compensation_currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT hiring_positions_compensation_basis_check
    CHECK (compensation_basis IN ('annual', 'monthly', 'daily')),
  ADD CONSTRAINT hiring_positions_workdays_check
    CHECK (expected_workdays_per_month > 0),
  ADD CONSTRAINT hiring_positions_fx_rate_check
    CHECK (fx_rate_to_gbp > 0),
  ADD CONSTRAINT hiring_positions_on_cost_override_check
    CHECK (on_cost_override_pct >= 0);

-- 8. Append-only approval history --------------------------------------------

CREATE TABLE IF NOT EXISTS hiring_approval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES hiring_positions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('submitted', 'approved', 'denied', 'reopened_for_approval', 'legacy_imported')),
  from_approval_status TEXT
    CHECK (from_approval_status IN ('pending', 'approved', 'denied')),
  to_approval_status TEXT
    CHECK (to_approval_status IN ('pending', 'approved', 'denied')),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  denial_reason TEXT
    CHECK (denial_reason IN ('beyond_financial_boundaries', 'not_current_priority', 'lacks_information', 'other')),
  denial_comment TEXT,
  position_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hiring_approval_events_position_created
  ON hiring_approval_events (position_id, created_at);
CREATE INDEX IF NOT EXISTS idx_hiring_approval_events_client_created
  ON hiring_approval_events (client_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hiring_approval_events_legacy_imported
  ON hiring_approval_events (position_id) WHERE event_type = 'legacy_imported';

-- 9. One legacy_imported event per pre-existing position. Idempotent via the
-- unique partial index above.

INSERT INTO hiring_approval_events
  (position_id, client_id, event_type, from_approval_status, to_approval_status,
   actor_name, position_snapshot)
SELECT hp.id, hp.client_id, 'legacy_imported', NULL, 'approved',
       'System Migration', to_jsonb(hp)
FROM hiring_positions hp
ON CONFLICT (position_id) WHERE event_type = 'legacy_imported' DO NOTHING;
