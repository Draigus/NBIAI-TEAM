-- Migration 014: Calendar events
-- New table for personal/team/business calendar events that appear alongside
-- tasks in the calendar view. Supports vacation, sick leave, bank holidays,
-- unpaid time off (UTO), business events, and other categories. Visibility
-- rules are enforced at the API layer.

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  visibility TEXT DEFAULT 'team',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client ON calendar_events(client_id);
