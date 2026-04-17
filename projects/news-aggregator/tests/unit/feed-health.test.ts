import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { withTestDb, getOrCreateTestSource } from '../fixtures/db.js'
import {
  recordFeedAttempt,
  getRollingErrorRate,
  autoDisableIfUnhealthy,
} from '../../src/ingest/feed-health.js'

const noopLog = { warn: () => {} }

describe('feed-health', () => {
  let sourceId: string

  beforeAll(async () => {
    sourceId = await getOrCreateTestSource()
  })

  beforeEach(async () => {
    await withTestDb(async db => {
      await db.execute(sql`DELETE FROM news.feed_health WHERE source_id = ${sourceId}`)
      await db.execute(sql`
        UPDATE news.sources
        SET enabled = true,
            consecutive_failures = 0,
            last_success_at = NULL,
            last_attempt_at = NULL
        WHERE id = ${sourceId}
      `)
    })
  })

  it('records a success and resets consecutive_failures', async () => {
    await recordFeedAttempt(sourceId, 'http_error', { errorMessage: 'first failure' })
    await recordFeedAttempt(sourceId, 'http_error', { errorMessage: 'second failure' })
    await recordFeedAttempt(sourceId, 'success', { itemsIngested: 5, itemsNew: 3, durationMs: 240 })
    await withTestDb(async db => {
      const r = await db.execute(sql`SELECT consecutive_failures, last_success_at FROM news.sources WHERE id = ${sourceId}`)
      const row = r.rows[0] as { consecutive_failures: number; last_success_at: Date | null }
      expect(row.consecutive_failures).toBe(0)
      expect(row.last_success_at).not.toBeNull()
    })
  })

  it('increments consecutive_failures on non-success outcomes', async () => {
    await recordFeedAttempt(sourceId, 'timeout')
    await recordFeedAttempt(sourceId, 'parse_error')
    await recordFeedAttempt(sourceId, 'empty')
    await withTestDb(async db => {
      const r = await db.execute(sql`SELECT consecutive_failures FROM news.sources WHERE id = ${sourceId}`)
      expect((r.rows[0] as { consecutive_failures: number }).consecutive_failures).toBe(3)
    })
  })

  it('computes rolling error rate correctly', async () => {
    await recordFeedAttempt(sourceId, 'success')
    await recordFeedAttempt(sourceId, 'success')
    await recordFeedAttempt(sourceId, 'timeout')
    await recordFeedAttempt(sourceId, 'http_error')
    const rate = await getRollingErrorRate(sourceId)
    expect(rate).toBeCloseTo(0.5, 5)
  })

  it('returns 0 when there are no attempts', async () => {
    const rate = await getRollingErrorRate(sourceId)
    expect(rate).toBe(0)
  })

  it('auto-disables when error rate >= 50%', async () => {
    await recordFeedAttempt(sourceId, 'success')
    await recordFeedAttempt(sourceId, 'timeout')
    await recordFeedAttempt(sourceId, 'http_error')
    const disabled = await autoDisableIfUnhealthy(sourceId, noopLog)
    expect(disabled).toBe(true)
    await withTestDb(async db => {
      const r = await db.execute(sql`SELECT enabled FROM news.sources WHERE id = ${sourceId}`)
      expect((r.rows[0] as { enabled: boolean }).enabled).toBe(false)
    })
  })

  it('does not disable when error rate is below 50%', async () => {
    await recordFeedAttempt(sourceId, 'success')
    await recordFeedAttempt(sourceId, 'success')
    await recordFeedAttempt(sourceId, 'success')
    await recordFeedAttempt(sourceId, 'timeout')
    const disabled = await autoDisableIfUnhealthy(sourceId, noopLog)
    expect(disabled).toBe(false)
    await withTestDb(async db => {
      const r = await db.execute(sql`SELECT enabled FROM news.sources WHERE id = ${sourceId}`)
      expect((r.rows[0] as { enabled: boolean }).enabled).toBe(true)
    })
  })
})
