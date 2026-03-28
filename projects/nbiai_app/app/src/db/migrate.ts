/**
 * Programmatic migration runner.
 *
 * Run with: `npm run db:migrate`
 *
 * Applies all pending migrations from src/db/migrations/ to the database
 * specified in the DATABASE_URL environment variable.
 *
 * This script is safe to run multiple times — drizzle-kit tracks applied
 * migrations in a `__drizzle_migrations` table and skips already-applied ones.
 *
 * In production (Railway), this script runs as part of the deployment process
 * before the server starts.
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  console.log('[migrate] Connecting to database...')

  const client = new pg.Client({ connectionString })
  await client.connect()

  const db = drizzle(client)

  const migrationsFolder = join(__dirname, 'migrations')
  console.log(`[migrate] Applying migrations from: ${migrationsFolder}`)

  await migrate(db, { migrationsFolder })

  console.log('[migrate] All migrations applied successfully.')

  await client.end()
}

runMigrations().catch((err) => {
  console.error('[migrate] Migration failed:', err)
  process.exit(1)
})
