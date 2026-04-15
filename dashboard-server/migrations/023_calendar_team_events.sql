-- Migration 023: team events on the shared calendar (bug d4367137)
-- Adds a nullable team_id column to calendar_events so a single event can
-- target a whole team instead of (or in addition to) a single user.
-- When team_id is set and user_id is null the event is treated as a team
-- event that renders on every team member's row in the people calendar
-- roster and shows a team label in the month grid.
-- Keeps user_id nullable so existing events remain valid.

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS team_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_team_id_fkey'
  ) THEN
    ALTER TABLE calendar_events
      ADD CONSTRAINT calendar_events_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_calendar_events_team ON calendar_events(team_id);
