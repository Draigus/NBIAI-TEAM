/**
 * V2 schema migration: adds missing tables and columns from the no-API architecture.
 * Run once after initial migration to bring the DB in sync with schema.ts.
 */
import 'dotenv/config'
import { Pool } from 'pg'

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  console.log('[v2-migrate] Starting v2 schema migration...')

  // 1. Create claude_session_status and session_trigger enums
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE claude_session_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)
  console.log('[v2-migrate] claude_session_status enum OK')

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE session_trigger AS ENUM ('manual', 'scheduled');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)
  console.log('[v2-migrate] session_trigger enum OK')

  // 2. Create claude_desktop_sessions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS claude_desktop_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      label VARCHAR(200) NOT NULL,
      agent_id UUID REFERENCES agents(id),
      status claude_session_status NOT NULL DEFAULT 'pending',
      trigger session_trigger NOT NULL,
      scheduled_for TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      notes TEXT,
      created_by_user_id UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  console.log('[v2-migrate] claude_desktop_sessions table OK')

  // Indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS claude_desktop_sessions_agent_id_idx ON claude_desktop_sessions(agent_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS claude_desktop_sessions_status_idx ON claude_desktop_sessions(status)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS claude_desktop_sessions_created_at_desc_idx ON claude_desktop_sessions(created_at DESC)`)

  // 3. Create cost_logs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cost_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES claude_desktop_sessions(id),
      agent_id UUID REFERENCES agents(id),
      period_month DATE NOT NULL,
      cost_usd NUMERIC(10, 2) NOT NULL,
      notes VARCHAR(500),
      created_by_user_id UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  console.log('[v2-migrate] cost_logs table OK')

  await pool.query(`CREATE INDEX IF NOT EXISTS cost_logs_session_id_idx ON cost_logs(session_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS cost_logs_period_month_idx ON cost_logs(period_month)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS cost_logs_agent_id_idx ON cost_logs(agent_id)`)

  // 4. Add queue columns to tasks (if not already present)
  const cols = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name IN ('queued_at', 'session_id', 'session_prompt')
  `)
  const existingCols = cols.rows.map((r: { column_name: string }) => r.column_name)

  if (!existingCols.includes('queued_at')) {
    await pool.query(`ALTER TABLE tasks ADD COLUMN queued_at TIMESTAMPTZ`)
    console.log('[v2-migrate] Added tasks.queued_at')
  }
  if (!existingCols.includes('session_id')) {
    await pool.query(`ALTER TABLE tasks ADD COLUMN session_id UUID REFERENCES claude_desktop_sessions(id)`)
    console.log('[v2-migrate] Added tasks.session_id')
  }
  if (!existingCols.includes('session_prompt')) {
    await pool.query(`ALTER TABLE tasks ADD COLUMN session_prompt TEXT`)
    console.log('[v2-migrate] Added tasks.session_prompt')
  }

  // 5. Verify
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
  console.log('[v2-migrate] Tables:', tables.rows.map((r: { tablename: string }) => r.tablename))

  console.log('[v2-migrate] Done.')
  await pool.end()
}
main()
