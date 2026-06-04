-- 063_meetings_section.sql
-- Allow 'meetings' as a section type + prevent duplicate Granola imports

ALTER TABLE meeting_items DROP CONSTRAINT meeting_items_section_check;
ALTER TABLE meeting_items ADD CONSTRAINT meeting_items_section_check
  CHECK (section IN ('actions','decisions','people','learnings','numbers','timeline','threads','meetings'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_items_source_id
  ON meeting_items((data->>'source_id'))
  WHERE section = 'meetings' AND data->>'source_id' IS NOT NULL;
