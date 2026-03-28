/**
 * Database connection pool and Drizzle ORM instance.
 *
 * Uses pg.Pool with sensible defaults for a Railway-hosted PostgreSQL instance.
 * The pool is shared across the entire application; do not create additional
 * pools elsewhere.
 *
 * All database access should go through the `db` export. The `pool` export
 * is available for raw queries where Drizzle is insufficient (e.g. LISTEN/NOTIFY
 * for the real-time WebSocket layer).
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on('error', (err) => {
  // Log pool errors without crashing the process. The pool will attempt
  // to recover by creating a new client on the next request.
  console.error('[db] Unexpected pool error:', err)
})

export const db = drizzle(pool, { schema })
export { pool }
