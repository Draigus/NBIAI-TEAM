import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../../src/db/schema.js'

export type TestDb = ReturnType<typeof drizzle<typeof schema>>

export async function withTestDb<T>(fn: (db: TestDb) => Promise<T>): Promise<T> {
  const pool = new pg.Pool({ connectionString: process.env.NEWS_DB_URL })
  const db = drizzle(pool, { schema }) as TestDb
  try {
    return await fn(db)
  } finally {
    await pool.end()
  }
}

/**
 * Idempotent test-source creator. Returns the id of a source with slug
 * 'test-source-dedup'. Safe to call repeatedly.
 */
export async function getOrCreateTestSource(): Promise<string> {
  const pool = new pg.Pool({ connectionString: process.env.NEWS_DB_URL })
  try {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO news.sources (slug, name, tier, feed_url, feed_type, enabled)
       VALUES ('test-source-dedup', 'Test Source (dedup)', 'trade', 'https://example.com/feed', 'rss', true)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
    )
    return result.rows[0].id
  } finally {
    await pool.end()
  }
}
