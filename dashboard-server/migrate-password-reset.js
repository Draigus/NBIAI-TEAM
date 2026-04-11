require('dotenv').config();
const { Pool } = require('pg');
const DB_URL = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DB_URL });

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('Created password_reset_tokens table');
  await pool.end();
}

migrate().catch(e => { console.error(e); process.exit(1); });
