-- Migration 026: Client-scoped users
-- Adds client_id to users table so external contacts (e.g. Lorenza from Couch Heroes)
-- can log in and only see their assigned client's data.
-- When client_id is NULL, the user is internal (unrestricted access).

ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users (client_id) WHERE client_id IS NOT NULL;
