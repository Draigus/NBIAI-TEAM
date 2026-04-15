-- Migration 020: Decode HTML entities from double-escaped text columns.
--
-- Backstory: the server's escHtml() was running at write time on every text
-- field in addition to the frontend's esc() at render time. Each save added
-- another layer of entity escaping (can't → can&#39;t → can&amp;#39;t → ...).
-- Migration 019 marks the end of that regime — after this migration, all text
-- columns store raw user input and only esc() runs at render time.
--
-- W1 (commit 203dad6) removed escHtml from all write paths. This migration
-- cleans up the rows that were written while the bug was active.
--
-- Scope (verified against live DB 2026-04-15):
--   tasks.description          2 rows
--   bug_reports.description   14 rows
--   bug_report_comments.text   3 rows
--   (everything else was either never escaped or contains legitimate raw `&`)
--
-- The decode function iterates to a fixpoint so it handles any depth of
-- escaping (we saw 1 in prod but the function is future-proof). The order
-- matters: `&amp;` must be replaced FIRST so that nested entities like
-- `&amp;amp;#39;` collapse correctly across iterations.
--
-- Idempotent: running this migration twice does nothing the second time
-- because after the first run there are no entity sequences left to decode.

CREATE OR REPLACE FUNCTION decode_html_entities(s TEXT) RETURNS TEXT AS $$
DECLARE
  prev TEXT;
  curr TEXT := s;
BEGIN
  IF s IS NULL THEN RETURN NULL; END IF;
  LOOP
    prev := curr;
    curr := replace(curr, '&amp;',  '&');   -- MUST be first so &amp;#39; → &#39; → '
    curr := replace(curr, '&#39;',  '''');
    curr := replace(curr, '&quot;', '"');
    curr := replace(curr, '&gt;',   '>');
    curr := replace(curr, '&lt;',   '<');
    EXIT WHEN curr = prev;
  END LOOP;
  RETURN curr;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ================================================================
-- Update only the columns the scope check flagged.
-- Predicate filter avoids rewriting rows that don't need it, so
-- updated_at timestamps stay meaningful.
-- ================================================================

UPDATE tasks
SET description = decode_html_entities(description)
WHERE description LIKE '%&amp;%'
   OR description LIKE '%&#39;%'
   OR description LIKE '%&quot;%'
   OR description LIKE '%&lt;%'
   OR description LIKE '%&gt;%';

UPDATE bug_reports
SET description = decode_html_entities(description)
WHERE description LIKE '%&amp;%'
   OR description LIKE '%&#39;%'
   OR description LIKE '%&quot;%'
   OR description LIKE '%&lt;%'
   OR description LIKE '%&gt;%';

UPDATE bug_report_comments
SET text = decode_html_entities(text)
WHERE text LIKE '%&amp;%'
   OR text LIKE '%&#39;%'
   OR text LIKE '%&quot;%'
   OR text LIKE '%&lt;%'
   OR text LIKE '%&gt;%';

-- Defensive catch-alls for columns the scope check found clean today but
-- could conceivably have legacy rows written in edge cases. The predicate
-- short-circuits the UPDATE to 0 rows if nothing matches.

UPDATE tasks SET title = decode_html_entities(title)
  WHERE title LIKE '%&amp;%' OR title LIKE '%&#39;%' OR title LIKE '%&quot;%' OR title LIKE '%&lt;%' OR title LIKE '%&gt;%';

UPDATE tasks SET collaborations = decode_html_entities(collaborations)
  WHERE collaborations LIKE '%&amp;%' OR collaborations LIKE '%&#39;%' OR collaborations LIKE '%&quot;%' OR collaborations LIKE '%&lt;%' OR collaborations LIKE '%&gt;%';

UPDATE tasks SET success_factor = decode_html_entities(success_factor)
  WHERE success_factor LIKE '%&amp;%' OR success_factor LIKE '%&#39;%' OR success_factor LIKE '%&quot;%' OR success_factor LIKE '%&lt;%' OR success_factor LIKE '%&gt;%';

UPDATE leads SET title = decode_html_entities(title)
  WHERE title LIKE '%&amp;%' OR title LIKE '%&#39;%' OR title LIKE '%&quot;%' OR title LIKE '%&lt;%' OR title LIKE '%&gt;%';

UPDATE leads SET notes = decode_html_entities(notes)
  WHERE notes LIKE '%&amp;%' OR notes LIKE '%&#39;%' OR notes LIKE '%&quot;%' OR notes LIKE '%&lt;%' OR notes LIKE '%&gt;%';

UPDATE expenses SET description = decode_html_entities(description)
  WHERE description LIKE '%&amp;%' OR description LIKE '%&#39;%' OR description LIKE '%&quot;%' OR description LIKE '%&lt;%' OR description LIKE '%&gt;%';

UPDATE expenses SET notes = decode_html_entities(notes)
  WHERE notes LIKE '%&amp;%' OR notes LIKE '%&#39;%' OR notes LIKE '%&quot;%' OR notes LIKE '%&lt;%' OR notes LIKE '%&gt;%';

UPDATE bug_reports SET title = decode_html_entities(title)
  WHERE title LIKE '%&amp;%' OR title LIKE '%&#39;%' OR title LIKE '%&quot;%' OR title LIKE '%&lt;%' OR title LIKE '%&gt;%';

UPDATE candidates SET name = decode_html_entities(name)
  WHERE name LIKE '%&amp;%' OR name LIKE '%&#39;%' OR name LIKE '%&quot;%' OR name LIKE '%&lt;%' OR name LIKE '%&gt;%';

UPDATE candidates SET role = decode_html_entities(role)
  WHERE role LIKE '%&amp;%' OR role LIKE '%&#39;%' OR role LIKE '%&quot;%' OR role LIKE '%&lt;%' OR role LIKE '%&gt;%';

UPDATE candidates SET notes = decode_html_entities(notes)
  WHERE notes LIKE '%&amp;%' OR notes LIKE '%&#39;%' OR notes LIKE '%&quot;%' OR notes LIKE '%&lt;%' OR notes LIKE '%&gt;%';

UPDATE clients SET description = decode_html_entities(description)
  WHERE description LIKE '%&amp;%' OR description LIKE '%&#39;%' OR description LIKE '%&quot;%' OR description LIKE '%&lt;%' OR description LIKE '%&gt;%';

UPDATE clients SET nbi_relationship = decode_html_entities(nbi_relationship)
  WHERE nbi_relationship LIKE '%&amp;%' OR nbi_relationship LIKE '%&#39;%' OR nbi_relationship LIKE '%&quot;%' OR nbi_relationship LIKE '%&lt;%' OR nbi_relationship LIKE '%&gt;%';

UPDATE clients SET current_studio_project = decode_html_entities(current_studio_project)
  WHERE current_studio_project LIKE '%&amp;%' OR current_studio_project LIKE '%&#39;%' OR current_studio_project LIKE '%&quot;%' OR current_studio_project LIKE '%&lt;%' OR current_studio_project LIKE '%&gt;%';

UPDATE contacts SET name = decode_html_entities(name)
  WHERE name LIKE '%&amp;%' OR name LIKE '%&#39;%' OR name LIKE '%&quot;%' OR name LIKE '%&lt;%' OR name LIKE '%&gt;%';

UPDATE contacts SET role = decode_html_entities(role)
  WHERE role LIKE '%&amp;%' OR role LIKE '%&#39;%' OR role LIKE '%&quot;%' OR role LIKE '%&lt;%' OR role LIKE '%&gt;%';

UPDATE contacts SET notes = decode_html_entities(notes)
  WHERE notes LIKE '%&amp;%' OR notes LIKE '%&#39;%' OR notes LIKE '%&quot;%' OR notes LIKE '%&lt;%' OR notes LIKE '%&gt;%';

UPDATE task_notes SET text = decode_html_entities(text)
  WHERE text LIKE '%&amp;%' OR text LIKE '%&#39;%' OR text LIKE '%&quot;%' OR text LIKE '%&lt;%' OR text LIKE '%&gt;%';

UPDATE calendar_events SET title = decode_html_entities(title)
  WHERE title LIKE '%&amp;%' OR title LIKE '%&#39;%' OR title LIKE '%&quot;%' OR title LIKE '%&lt;%' OR title LIKE '%&gt;%';

UPDATE calendar_events SET description = decode_html_entities(description)
  WHERE description LIKE '%&amp;%' OR description LIKE '%&#39;%' OR description LIKE '%&quot;%' OR description LIKE '%&lt;%' OR description LIKE '%&gt;%';

UPDATE teams SET name = decode_html_entities(name)
  WHERE name LIKE '%&amp;%' OR name LIKE '%&#39;%' OR name LIKE '%&quot;%' OR name LIKE '%&lt;%' OR name LIKE '%&gt;%';

UPDATE teams SET description = decode_html_entities(description)
  WHERE description LIKE '%&amp;%' OR description LIKE '%&#39;%' OR description LIKE '%&quot;%' OR description LIKE '%&lt;%' OR description LIKE '%&gt;%';

UPDATE hiring_positions SET title = decode_html_entities(title)
  WHERE title LIKE '%&amp;%' OR title LIKE '%&#39;%' OR title LIKE '%&quot;%' OR title LIKE '%&lt;%' OR title LIKE '%&gt;%';

UPDATE hiring_positions SET description = decode_html_entities(description)
  WHERE description LIKE '%&amp;%' OR description LIKE '%&#39;%' OR description LIKE '%&quot;%' OR description LIKE '%&lt;%' OR description LIKE '%&gt;%';

-- Function is left in place for future manual use. It is IMMUTABLE and cheap.
