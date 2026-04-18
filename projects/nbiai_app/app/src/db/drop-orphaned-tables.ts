/**
 * Idempotent cleanup: drop tables that were removed from schema.ts in
 * the no-API migration but were never physically dropped from the DB.
 *
 * Affected tables:
 *   - api_keys         (removed 2026-03-28; no Anthropic API key)
 *   - agent_budgets    (removed 2026-03-28; no per-agent token budgets)
 *   - agent_heartbeats (removed 2026-03-28; no heartbeat scheduler)
 *
 * Written 2026-04-17 as part of the audit-fix sprint. Addresses audit
 * finding #11 (Critically Bad: parallel migration sources of truth /
 * physical DB has orphan tables).
 *
 * Safe to re-run: uses DROP TABLE IF EXISTS and CASCADE on FK edges.
 * Once the Drizzle migration snapshot is reconciled, this script
 * should be superseded by a proper drizzle-kit migration.
 */

import 'dotenv/config'
import { Pool } from 'pg'

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  console.log('[drop-orphaned-tables] Starting cleanup...')

  const tables = ['api_keys', 'agent_budgets', 'agent_heartbeats']

  for (const table of tables) {
    const before = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
      [table],
    )
    if (before.rowCount === 0) {
      console.log(`[drop-orphaned-tables]   ${table} — already absent, skipping`)
      continue
    }

    await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`)
    console.log(`[drop-orphaned-tables]   Dropped ${table}`)
  }

  console.log('[drop-orphaned-tables] Done.')
  await pool.end()
}

main().catch((err) => {
  console.error('[drop-orphaned-tables] Failed:', err)
  process.exit(1)
})
