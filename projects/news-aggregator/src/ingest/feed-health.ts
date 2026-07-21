import { sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

export type FeedOutcome = 'success' | 'timeout' | 'http_error' | 'parse_error' | 'empty'

// 'empty' means the fetch worked and the feed simply had no items — the
// scheduler logs it as "feed ok". Only timeout/http_error/parse_error
// indicate a broken feed; the SQL below filters on exactly that set.

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
  // 'empty' is a working feed with nothing new: it neither counts as a
  // success (last_success_at stays put) nor as a failure (it must not walk
  // consecutive_failures towards a false auto-disable).
  const isFailure = !isSuccess && outcome !== 'empty'
  await db.execute(sql`
    UPDATE news.sources SET
      last_attempt_at = now(),
      last_success_at = CASE WHEN ${isSuccess} THEN now() ELSE last_success_at END,
      consecutive_failures = CASE WHEN ${isFailure} THEN consecutive_failures + 1 ELSE 0 END
    WHERE id = ${sourceId}
  `)
}

/**
 * 7-day rolling HARD error rate: timeouts, HTTP errors, and parse errors
 * over all attempts. 'empty' polls count as healthy attempts — a
 * low-traffic feed that returns no items for a week is not broken.
 * (The old formula counted 'empty' as an error, which is how
 * steam-upcoming got auto-disabled off the back of a single 502.)
 */
export async function getRollingErrorRate(sourceId: string, days = 7): Promise<number> {
  const r = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE outcome IN ('timeout', 'http_error', 'parse_error'))::float
        / NULLIF(count(*), 0) AS rate
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
 * If the 7-day rolling hard-error rate is at or above 50% — with at least
 * MIN_HARD_ERRORS_BEFORE_DISABLE genuine failures in the window — disable
 * the source, stamping auto_disabled_at so the recovery probe knows this
 * was a health-check decision and may reverse it. Returns true if the
 * source was disabled. Caller sends the hub notification.
 */
const MIN_ATTEMPTS_BEFORE_DISABLE = 5
const MIN_HARD_ERRORS_BEFORE_DISABLE = 5
export async function autoDisableIfUnhealthy(sourceId: string, log: HealthLogger): Promise<boolean> {
  const countResult = await db.execute(sql`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE outcome IN ('timeout', 'http_error', 'parse_error'))::int AS hard
    FROM news.feed_health
    WHERE source_id = ${sourceId} AND attempted_at > now() - interval '7 days'
  `)
  const row = countResult.rows[0] as { total: number; hard: number } | undefined
  const total = row?.total ?? 0
  const hard = row?.hard ?? 0
  if (total < MIN_ATTEMPTS_BEFORE_DISABLE || hard < MIN_HARD_ERRORS_BEFORE_DISABLE) return false
  const rate = await getRollingErrorRate(sourceId)
  if (rate >= 0.5) {
    await db.execute(sql`
      UPDATE news.sources SET enabled = false, auto_disabled_at = now() WHERE id = ${sourceId}
    `)
    log.warn({ sourceId, rate }, 'source auto-disabled (50% hard-error rate)')
    return true
  }
  return false
}

export interface RecoverableSource {
  id: string
  slug: string
  name: string
  feedUrl: string
  customParserKey: string | null
}

/**
 * Sources the health check disabled (auto_disabled_at set) that have not
 * been probed in the last 6 hours. Manual disables (auto_disabled_at null)
 * are never returned — those stay off until a human turns them back on.
 */
export async function listRecoverableSources(): Promise<RecoverableSource[]> {
  const r = await db.execute(sql`
    SELECT id, slug, name, feed_url AS "feedUrl", custom_parser_key AS "customParserKey"
    FROM news.sources
    WHERE enabled = false
      AND auto_disabled_at IS NOT NULL
      AND (last_attempt_at IS NULL OR last_attempt_at < now() - interval '6 hours')
  `)
  return r.rows as unknown as RecoverableSource[]
}

/** Re-enable a source after a healthy recovery probe. */
export async function reEnableSource(sourceId: string): Promise<void> {
  await db.execute(sql`
    UPDATE news.sources
    SET enabled = true, auto_disabled_at = NULL, consecutive_failures = 0
    WHERE id = ${sourceId}
  `)
}

/** Stamp a probe attempt so the 6-hour probe throttle has a clock to read. */
export async function recordProbeAttempt(sourceId: string): Promise<void> {
  await db.execute(sql`UPDATE news.sources SET last_attempt_at = now() WHERE id = ${sourceId}`)
}
