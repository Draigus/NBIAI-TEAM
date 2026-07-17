-- 082_user_views.sql
-- Foundation 2: saved filter/sort/grouping/column views per user+section.
-- users.id is UUID in this schema (spec draft said INTEGER; that was wrong).
CREATE TABLE IF NOT EXISTS user_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  section VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, section, name)
);
CREATE INDEX IF NOT EXISTS idx_user_views_user_section ON user_views (user_id, section);
CREATE INDEX IF NOT EXISTS idx_user_views_shared ON user_views (section) WHERE is_shared = true;
