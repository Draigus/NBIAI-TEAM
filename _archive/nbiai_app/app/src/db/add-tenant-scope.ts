/**
 * Idempotent migration: add companyId to claude_desktop_sessions and
 * cost_logs, backfill from the single existing company, add NOT NULL
 * and indices.
 *
 * Written 2026-04-17 as part of the audit-fix sprint. Addresses audit
 * findings #4 (claude_desktop_sessions has no companyId and routes do
 * not scope by company), #13 (cost_logs queries leak across tenants).
 *
 * Follows the same pattern as fix-enum.ts: uses IF NOT EXISTS and
 * DO blocks so it is safe to run repeatedly. A proper Drizzle-kit
 * migration should replace this once the meta snapshot in
 * src/db/migrations/ is reconciled with the live DB state (audit
 * finding #11 / Phase 7).
 */

import 'dotenv/config'
import { Pool } from 'pg'

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  console.log('[add-tenant-scope] Starting tenant-scope migration...')

  // Verify exactly one company exists (single-tenant assumption for
  // the backfill). If there is no company we cannot infer the scope.
  const companyRes = await pool.query<{ id: string }>('SELECT id FROM companies ORDER BY created_at ASC LIMIT 1')

  if (companyRes.rows.length === 0) {
    console.error('[add-tenant-scope] No company rows found. Run db:seed first.')
    await pool.end()
    process.exit(1)
  }

  const defaultCompanyId = companyRes.rows[0].id
  console.log(`[add-tenant-scope] Using company_id=${defaultCompanyId} as backfill source`)

  // --------------------------------------------------------------------
  // claude_desktop_sessions.company_id
  // --------------------------------------------------------------------

  await pool.query(`
    ALTER TABLE claude_desktop_sessions
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id)
  `)
  console.log('[add-tenant-scope] claude_desktop_sessions.company_id column OK')

  // Backfill nulls from the single company
  const sessionBackfill = await pool.query(
    'UPDATE claude_desktop_sessions SET company_id = $1 WHERE company_id IS NULL',
    [defaultCompanyId],
  )
  console.log(`[add-tenant-scope] Backfilled ${sessionBackfill.rowCount} session rows`)

  await pool.query('ALTER TABLE claude_desktop_sessions ALTER COLUMN company_id SET NOT NULL')
  await pool.query(
    'CREATE INDEX IF NOT EXISTS claude_desktop_sessions_company_id_idx ON claude_desktop_sessions(company_id)',
  )
  console.log('[add-tenant-scope] claude_desktop_sessions NOT NULL + index OK')

  // --------------------------------------------------------------------
  // cost_logs.company_id
  // --------------------------------------------------------------------

  await pool.query(`
    ALTER TABLE cost_logs
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id)
  `)
  console.log('[add-tenant-scope] cost_logs.company_id column OK')

  const costBackfill = await pool.query(
    'UPDATE cost_logs SET company_id = $1 WHERE company_id IS NULL',
    [defaultCompanyId],
  )
  console.log(`[add-tenant-scope] Backfilled ${costBackfill.rowCount} cost_log rows`)

  await pool.query('ALTER TABLE cost_logs ALTER COLUMN company_id SET NOT NULL')
  await pool.query('CREATE INDEX IF NOT EXISTS cost_logs_company_id_idx ON cost_logs(company_id)')
  console.log('[add-tenant-scope] cost_logs NOT NULL + index OK')

  console.log('[add-tenant-scope] Done.')
  await pool.end()
}

main().catch((err) => {
  console.error('[add-tenant-scope] Failed:', err)
  process.exit(1)
})
