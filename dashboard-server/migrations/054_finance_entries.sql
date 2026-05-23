CREATE TABLE IF NOT EXISTS finance_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    category TEXT NOT NULL DEFAULT 'expense',
    type TEXT NOT NULL DEFAULT 'one-off',
    tag TEXT,
    entry_date DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_finance_entries_category ON finance_entries (category);
CREATE INDEX idx_finance_entries_date ON finance_entries (entry_date);
