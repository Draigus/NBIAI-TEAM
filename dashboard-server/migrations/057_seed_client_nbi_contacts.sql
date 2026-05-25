-- One-time data migration: seed client_nbi_contacts from the hardcoded
-- NBI_CONTACTS_BY_CLIENT map that previously lived in routes/users.js.
--
-- Original hardcoded values:
--   Couch Heroes  (21be0772-...): Glen Pryer, Magnus Pryer
--   Lighthouse Games (f6fe27d8-...): Glen Pryer, Magnus Pryer, Ruan, Stavros, Amir Didar
--   Lighthouse Studios (239262e3-...): Glen Pryer, Magnus Pryer, Ruan, Stavros, Amir Didar
--
-- Uses subqueries to resolve display_name -> user_id and literal client UUIDs.
-- ON CONFLICT DO NOTHING makes this idempotent (safe to run multiple times).

-- Couch Heroes
INSERT INTO client_nbi_contacts (client_id, user_id)
SELECT '21be0772-73e5-4cca-8795-8b1a66f89ec2'::uuid, u.id
FROM users u
WHERE u.display_name IN ('Glen Pryer', 'Magnus Pryer')
  AND u.client_id IS NULL
ON CONFLICT DO NOTHING;

-- Lighthouse Games
INSERT INTO client_nbi_contacts (client_id, user_id)
SELECT 'f6fe27d8-307d-4121-b204-6a0971e88de7'::uuid, u.id
FROM users u
WHERE u.display_name IN ('Glen Pryer', 'Magnus Pryer', 'Ruan', 'Stavros', 'Amir Didar')
  AND u.client_id IS NULL
ON CONFLICT DO NOTHING;

-- Lighthouse Studios
INSERT INTO client_nbi_contacts (client_id, user_id)
SELECT '239262e3-584c-4825-9f63-ba5882326dc6'::uuid, u.id
FROM users u
WHERE u.display_name IN ('Glen Pryer', 'Magnus Pryer', 'Ruan', 'Stavros', 'Amir Didar')
  AND u.client_id IS NULL
ON CONFLICT DO NOTHING;
