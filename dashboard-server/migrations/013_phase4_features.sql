-- Migration 013: Phase 4 features
-- Adds columns for: lead complete marker, repeating tasks, split task description,
-- and structured blocker info on tasks.

-- Feature 1: Complete marker for Won-stage leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- Feature 2: Repeatable tasks. JSON shape examples:
--   { "type": "daily" }
--   { "type": "weekly", "daysOfWeek": [1,3,5], "everyNWeeks": 1 }
--   { "type": "yearly", "dates": ["2026-05-01","2026-11-01"] }
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS repeat_rule JSONB DEFAULT NULL;

-- Feature 5: Split task description into three fields. The existing
-- `description` column keeps its data and becomes "Description of Work".
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS collaborations TEXT DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS success_factor TEXT DEFAULT NULL;

-- Feature 6: Blocker details captured by the Mark As Blocked popup.
-- Shape:
--   {
--     "blockedOn": "...",
--     "internal": ["Glen Pryer", ...],
--     "external": ["Acme Corp ..."],
--     "toUnblock": "...",
--     "dateBlocked": "2026-04-14"
--   }
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocker_info JSONB DEFAULT NULL;
