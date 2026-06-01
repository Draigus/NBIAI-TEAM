-- 032_interview_tool.sql
-- Interview Tool: question bank, configs, sessions, scores, decisions

-- ===== QUESTION BANK =====
CREATE TABLE IF NOT EXISTS interview_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  discipline TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('culture', 'technical', 'collaboration', 'leadership', 'depth')),
  question_text TEXT NOT NULL,
  depth_type TEXT CHECK (depth_type IN ('code', 'art_style', 'narrative', NULL)),
  source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('ai_generated', 'custom', 'curated')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_iqb_client_discipline ON interview_question_bank(client_id, discipline);
CREATE INDEX IF NOT EXISTS idx_iqb_client_category ON interview_question_bank(client_id, category);

-- ===== INTERVIEW CONFIGS =====
CREATE TABLE IF NOT EXISTS interview_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  position_id UUID REFERENCES hiring_positions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ic_candidate ON interview_configs(candidate_id);

-- ===== CONFIG <-> QUESTIONS JUNCTION =====
CREATE TABLE IF NOT EXISTS interview_config_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES interview_configs(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_question_bank(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_icq_config_sort ON interview_config_questions(config_id, sort_order);

-- ===== INTERVIEW SESSIONS =====
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES interview_configs(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'submitted')),
  notified_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_is_config ON interview_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_is_interviewer ON interview_sessions(interviewer_id);

-- ===== SCORES =====
CREATE TABLE IF NOT EXISTS interview_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_question_bank(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  notes TEXT,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_isc_session ON interview_scores(session_id);

-- ===== DECISIONS =====
CREATE TABLE IF NOT EXISTS interview_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL UNIQUE REFERENCES interview_configs(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('advance', 'reject', 'hold')),
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
