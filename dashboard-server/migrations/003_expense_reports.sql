-- 003_expense_reports.sql
-- Expense reports table, FK columns on expenses, and related indexes.

CREATE TABLE IF NOT EXISTS expense_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_reports_user ON expense_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_status ON expense_reports(status);

-- Link expenses to reports
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES expense_reports(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_report ON expenses(report_id);

-- VAT amount on expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12,2);

-- Dismissable flag on notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dismissable BOOLEAN DEFAULT true;
