-- Performance indexes for NBI Dashboard
-- Run once: psql -d nbi_dashboard -f migrations/add_indexes.sql

-- Auth & sessions (hit on every authenticated request)
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Password reset tokens
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_used ON password_reset_tokens(user_id, used);

-- Tasks (core queries)
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

-- Task related tables
CREATE INDEX IF NOT EXISTS idx_task_comments_task_created ON task_comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON task_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_date ON time_entries(task_id, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id, created_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(username, is_read, created_at DESC);

-- Clients & contacts
CREATE INDEX IF NOT EXISTS idx_contacts_client_sort ON contacts(client_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_client_notes_client ON client_notes(client_id, created_at DESC);

-- Leads (heavily queried)
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_followup ON leads(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_resources_lead ON lead_resources(lead_id);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expense_receipts_expense ON expense_receipts(expense_id);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
