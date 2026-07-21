import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { withTestDb, getOrCreateTestSource } from '../fixtures/db.js'
import {
  recordFeedAttempt,
  getRollingErrorRate,
  autoDisableIfUnhealthy,
  listRecoverableSources,
  reEnableSource,
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

  it('increments consecutive_failures on hard-error outcomes only', async () => {
    await recordFeedAttempt(sourceId, 'timeout')
    await recordFeedAttempt(sourceId, 'parse_error')
    await withTestDb(async db => {
      const r = await db.execute(sql`SELECT consecutive_failures FROM news.sources WHERE id = ${sourceId}`)
      expect((r.rows[0] as { consecutive_failures: number }).consecutive_failures).toBe(2)
    })
  })

  it('empty resets consecutive_failures without touching last_success_at', async () => {
    await recordFeedAttempt(sourceId, 'timeout')
    await recordFeedAttempt(sourceId, 'empty')
    await withTestDb(async db => {
      const r = await db.execute(sql`SELECT consecutive_failures, last_success_at FROM news.sources WHERE id = ${sourceId}`)
      const row = r.rows[0] as { consecutive_failures: number; last_success_at: Date | null }
      expect(row.consecutive_failures).toBe(0)
      expect(row.last_success_at).toBeNull()
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

  it('auto-disables at >=50% hard-error rate with >=5 hard errors, stamping auto_disabled_at', async () => {
    await recordFeedAttempt(sourceId, 'success')
    await recordFeedAttempt(sourceId, 'success')
    for (let i = 0; i < 5; i++) await recordFeedAttempt(sourceId, 'http_error')
    const disabled = await autoDisableIfUnhealthy(sourceId, noopLog)
    expect(disabled).toBe(true)
    await withTestDb(async db => {
      const r = await db.execute(sql`SELECT enabled, auto_disabled_at FROM news.sources WHERE id = ${sourceId}`)
      const row = r.rows[0] as { enabled: boolean; auto_disabled_at: Date | null }
      expect(row.enabled).toBe(false)
      expect(row.auto_disabled_at).not.toBeNull()
    })
  })

  it('does not disable on fewer than 5 hard errors even at a high rate', async () => {
    await recordFeedAttempt(sourceId, 'success')
    await recordFeedAttempt(sourceId, 'success')
    await recordFeedAttempt(sourceId, 'timeout')
    await recordFeedAttempt(sourceId, 'http_error')
    await recordFeedAttempt(sourceId, 'http_error')
    const disabled = await autoDisableIfUnhealthy(sourceId, noopLog)
    expect(disabled).toBe(false)
  })

  it('does not disable an empty-dominated source (steam-upcoming regression)', async () => {
    // 1 hard error drowned in a week of "feed ok, nothing new" polls —
    // the old formula computed a 98% error rate here and disabled it.
    for (let i = 0; i < 50; i++) await recordFeedAttempt(sourceId, 'empty')
    await recordFeedAttempt(sourceId, 'http_error')
    const rate = await getRollingErrorRate(sourceId)
    expect(rate).toBeLessThan(0.05)
    const disabled = await autoDisableIfUnhealthy(sourceId, noopLog)
    expect(disabled).toBe(false)
    await withTestDb(async db => {
      const r = await db.execute(sql`SELECT enabled FROM news.sources WHERE id = ${sourceId}`)
      expect((r.rows[0] as { enabled: boolean }).enabled).toBe(true)
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

  describe('recovery', () => {
    it('auto-disabled sources are recoverable; manual disables are not', async () => {
      await withTestDb(async db => {
        await db.execute(sql`
          UPDATE news.sources
          SET enabled = false, auto_disabled_at = now(), last_attempt_at = now() - interval '7 hours'
          WHERE id = ${sourceId}
        `)
      })
      const recoverable = await listRecoverableSources()
      expect(recoverable.some(s => s.id === sourceId)).toBe(true)

      await withTestDb(async db => {
        await db.execute(sql`UPDATE news.sources SET auto_disabled_at = NULL WHERE id = ${sourceId}`)
      })
      const afterManual = await listRecoverableSources()
      expect(afterManual.some(s => s.id === sourceId)).toBe(false)
    })

    it('probe throttle: sources attempted within 6 hours are not listed', async () => {
      await withTestDb(async db => {
        await db.execute(sql`
          UPDATE news.sources
          SET enabled = false, auto_disabled_at = now(), last_attempt_at = now() - interval '1 hour'
          WHERE id = ${sourceId}
        `)
      })
      const recoverable = await listRecoverableSources()
      expect(recoverable.some(s => s.id === sourceId)).toBe(false)
    })

    it('reEnableSource restores the source and clears the auto-disable stamp', async () => {
      await withTestDb(async db => {
        await db.execute(sql`
          UPDATE news.sources
          SET enabled = false, auto_disabled_at = now(), consecutive_failures = 9
          WHERE id = ${sourceId}
        `)
      })
      await reEnableSource(sourceId)
      await withTestDb(async db => {
        const r = await db.execute(sql`
          SELECT enabled, auto_disabled_at, consecutive_failures FROM news.sources WHERE id = ${sourceId}
        `)
        const row = r.rows[0] as { enabled: boolean; auto_disabled_at: Date | null; consecutive_failures: number }
        expect(row.enabled).toBe(true)
        expect(row.auto_disabled_at).toBeNull()
        expect(row.consecutive_failures).toBe(0)
      })
    })
  })
})
