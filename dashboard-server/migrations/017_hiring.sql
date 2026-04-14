-- Migration 017: Hiring Page
--
-- Introduces a Hiring Page that lets NBI track candidates against client
-- hiring positions (and optionally a SoW). Two related tables:
--
--   hiring_positions  — A role NBI is helping a client fill (e.g. "Senior
--                       Backend Engineer"). Optional, lets the team group
--                       candidates under a named position. Tied to a client
--                       and (optionally) a SoW.
--   candidates        — A person being considered. Lives under a client and
--                       optionally a position. Carries the kanban stage
--                       (sourced -> screening -> interview -> offer ->
--                       hired/rejected) plus CV filename, LinkedIn, role,
--                       due date and free-form notes.
--
-- Both tables use ON DELETE SET NULL on their parent FKs so deleting a
-- client/SoW/position never destroys candidate history; rows simply
-- detach and can be re-linked later.

CREATE TABLE IF NOT EXISTS hiring_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  sow_id UUID REFERENCES sows(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  seniority TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID REFERENCES hiring_positions(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT,
  linkedin_url TEXT,
  cv_filename TEXT,
  due_date DATE,
  stage TEXT DEFAULT 'sourced',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_client_id ON candidates(client_id);
CREATE INDEX IF NOT EXISTS idx_candidates_position_id ON candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(stage);
CREATE INDEX IF NOT EXISTS idx_hiring_positions_client ON hiring_positions(client_id);
