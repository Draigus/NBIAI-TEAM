import { sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

export type FeedOutcome = 'success' | 'timeout' | 'http_error' | 'parse_error' | 'empty'

export interface FeedAttemptFields {
  httpStatus?: number | null
  errorMessage?: string | null
  itemsIngested?: number
  itemsNew?: number
  durationMs?: number
}

export async function recordFeedAttempt(
  sourceId: string,
  outcome: FeedOutcome,
  fields: FeedAttemptFields = {},
): Promise<void> {
  await db.insert(schema.feedHealth).values({
    sourceId,
    attemptedAt: new Date(),
    outcome,
    httpStatus: fields.httpStatus ?? null,
    errorMessage: fields.errorMessage ?? null,
    itemsIngested: fields.itemsIngested ?? 0,
    itemsNew: fields.itemsNew ?? 0,
    durationMs: fields.durationMs ?? 0,
  })
  const isSuccess = outcome === 'success'
  await db.execute(sql`
    UPDATE news.sources SET
      last_attempt_at = now(),
      last_success_at = CASE WHEN ${isSuccess} THEN now() ELSE last_success_at END,
      consecutive_failures = CASE WHEN ${isSuccess} THEN 0 ELSE consecutive_failures + 1 END
    WHERE id = ${sourceId}
  `)
}

export async function getRollingErrorRate(sourceId: string, days = 7): Promise<number> {
  const r = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE outcome != 'success')::float / NULLIF(count(*), 0) AS rate
    FROM news.feed_health
    WHERE source_id = ${sourceId}
      AND attempted_at > now() - (${days} || ' days')::interval
  `)
  const rate = (r.rows[0] as { rate: number | null } | undefined)?.rate
  return Number(rate ?? 0)
}

export interface HealthLogger {
  warn: (obj: Record<string, unknown>, msg: string) => void
}

/**
 * If the 7-day rolling error rate is at or above 50%, disable the source
 * and return true. Caller is responsible for sending the hub notification.
 */
const MIN_ATTEMPTS_BEFORE_DISABLE = 5
export async function autoDisableIfUnhealthy(sourceId: string, log: HealthLogger): Promise<boolean> {
  const countResult = await db.execute(sql`
    SELECT count(*)::int AS total FROM news.feed_health
    WHERE source_id = ${sourceId} AND attempted_at > now() - interval '7 days'
  `)
  const total = (countResult.rows[0] as { total: number } | undefined)?.total ?? 0
  if (total < MIN_ATTEMPTS_BEFORE_DISABLE) return false
  const rate = await getRollingErrorRate(sourceId)
  if (rate >= 0.5) {
    await db.execute(sql`UPDATE news.sources SET enabled = false WHERE id = ${sourceId}`)
    log.warn({ sourceId, rate }, 'source auto-disabled (50% error rate)')
    return true
  }
  return false
}
