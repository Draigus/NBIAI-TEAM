-- 031_client_portal.sql
-- Client Portal: user model extensions, bug report scoping, audit logging

-- Normalise role values: frontend sent 'user', server defaults to 'member'
UPDATE users SET role = 'member' WHERE role = 'user';

-- Add client_role to users (member or admin, only meaningful when client_id is set)
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_role TEXT DEFAULT NULL;

-- Add must_change_password flag for forced password change on first login
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Add source and reporter_client_id to bug_reports for client-submitted reports
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal';
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS reporter_client_id UUID REFERENCES clients(id);

-- Client activity audit log
CREATE TABLE IF NOT EXISTS client_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_activity_client ON client_activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_user ON client_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_created ON client_activity_log(created_at);

-- Constraint: client_role only valid when client_id is set
ALTER TABLE users ADD CONSTRAINT chk_client_role_requires_client
  CHECK (client_role IS NULL OR client_id IS NOT NULL);
