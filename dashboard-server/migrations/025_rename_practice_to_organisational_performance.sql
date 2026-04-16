-- Migration 025: rename second practice from "organisational_health" to
-- "organisational_performance" (display label "Organizational Performance").
-- Glen decided the practice should be framed as Performance, not Health.
--
-- At migration time the dev DB has zero rows tagged organisational_health
-- (everything was migrated to gaming in migration 022), so the UPDATE
-- statements are defensive — they'd still work if anyone had snuck an OH
-- row in between the two migrations.

UPDATE clients SET practice_area = 'organisational_performance'
WHERE practice_area = 'organisational_health';

UPDATE leads SET practice_area = 'organisational_performance'
WHERE practice_area = 'organisational_health';

UPDATE tasks SET practice_area = 'organisational_performance'
WHERE practice_area = 'organisational_health';
