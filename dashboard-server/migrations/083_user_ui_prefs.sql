-- 083_user_ui_prefs.sql
-- Per-user UI preference blob (tour_completed, setup_completed,
-- help/category toggles). Spec Foundation 4 requires server-side
-- per-user storage; the settings table is global so this is new.
ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;
