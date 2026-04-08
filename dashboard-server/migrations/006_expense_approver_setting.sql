-- 006_expense_approver_setting.sql
-- Ensure default expense approver setting exists.

INSERT INTO settings (key, value) VALUES ('expense_approver', '"tom"') ON CONFLICT (key) DO NOTHING;
