-- Migration 016: Teams System
--
-- Introduces a Team entity that groups users around a Client and (optionally)
-- a specific SoW. Teams power three downstream features:
--   1. Calendar filtering — show all events from team members in one view.
--   2. Auto-include logic — events scoped to a team include every member.
--   3. Project visibility — display the team a project's client/SoW belongs to.
--
-- A user can belong to multiple teams. Within a team, role is one of
-- 'lead' or 'member'.

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  sow_id UUID REFERENCES sows(id) ON DELETE SET NULL,
  colour TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_client_id ON teams(client_id);
CREATE INDEX IF NOT EXISTS idx_teams_sow_id ON teams(sow_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
