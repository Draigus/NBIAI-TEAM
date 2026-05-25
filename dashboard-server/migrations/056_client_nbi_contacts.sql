-- Client-specific NBI contact visibility
-- Replaces hardcoded NBI_CONTACTS_BY_CLIENT in users.js
--
-- This table controls which NBI staff members are visible to external
-- client portal users. Previously hardcoded in routes/users.js as a
-- static map of client_id -> display_name[].

CREATE TABLE IF NOT EXISTS client_nbi_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_client_nbi_contacts_client ON client_nbi_contacts(client_id);
