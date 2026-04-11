require('dotenv').config();
const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL;

async function run() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  console.log('Running expense reports migration...\n');

  // ==================== TABLES ====================

  await db.query(`
    -- Expense categories (configurable)
    CREATE TABLE IF NOT EXISTS expense_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      sort_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Expense reports (one per submission)
    CREATE TABLE IF NOT EXISTS expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'GBP',
      category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
    CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

    -- Expense receipts (file attachments)
    CREATE TABLE IF NOT EXISTS expense_receipts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size_bytes INT,
      mime_type TEXT,
      uploaded_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_expense_receipts_expense ON expense_receipts(expense_id);
  `);
  console.log('Tables created');

  // ==================== SEED DATA ====================

  const categories = [
    'Travel', 'Accommodation', 'Meals & Entertainment',
    'Software & Subscriptions', 'Office Supplies', 'Equipment',
    'Training & Conferences', 'Client Entertainment', 'Other'
  ];
  for (let i = 0; i < categories.length; i++) {
    await db.query(
      `INSERT INTO expense_categories (name, sort_order) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
      [categories[i], i + 1]
    );
  }
  console.log('Expense categories seeded');

  // Summary
  for (const table of ['expense_categories', 'expenses', 'expense_receipts']) {
    const r = await db.query(`SELECT count(*) FROM ${table}`);
    console.log(`  ${table}: ${r.rows[0].count}`);
  }

  await db.end();
  console.log('\nMigration complete.');
}

run().catch(e => { console.error(e); process.exit(1); });
