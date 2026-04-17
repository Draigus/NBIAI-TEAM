import { eq } from 'drizzle-orm'
import pLimit from 'p-limit'
import { db, schema } from '../db/index.js'
import { fetchFeed } from './fetcher.js'
import { insertArticlesDedup } from './dedup.js'
import { recordFeedAttempt, autoDisableIfUnhealthy, type FeedOutcome } from './feed-health.js'
import { fetchAndEnrich } from './enrichment.js'
import { notifyFeedDisabled } from '../notifications/hub.js'

const CONCURRENCY = 8
const FEED_TIMEOUT_MS = 15000
const ENRICHMENT_CONCURRENCY = 4

export interface SchedulerLogger {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
  error: (obj: Record<string, unknown>, msg: string) => void
}

function classifyError(message: string): FeedOutcome {
  if (/timeout|aborted/i.test(message)) return 'timeout'
  if (/http_error/i.test(message)) return 'http_error'
  return 'parse_error'
}

const enrichmentLimit = pLimit(ENRICHMENT_CONCURRENCY)

/**
 * Fetch each new article's page and enrich the row with OG image,
 * canonical URL, author, embedded videos, and a more accurate published
 * timestamp. Runs in the background; failures are logged but do not
 * fail the enclosing ingest pass.
 */
async function enrichNewArticles(newArticleIds: string[], log: SchedulerLogger): Promise<void> {
  if (newArticleIds.length === 0) return
  await Promise.allSettled(newArticleIds.map(id => enrichmentLimit(async () => {
    const [row] = await db.select().from(schema.articles).where(eq(schema.articles.id, id)).limit(1)
    if (!row) return
    try {
      const meta = await fetchAndEnrich(row.url)
      await db.update(schema.articles).set({
        ogImageUrl: meta.ogImage ?? row.ogImageUrl,
        author: meta.author ?? row.author,
        embeddedVideoUrls: meta.videoUrls.length ? meta.videoUrls : row.embeddedVideoUrls,
        publishedAt: meta.publishedAt ?? row.publishedAt,
      }).where(eq(schema.articles.id, id))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn({ articleId: id, err: message }, 'enrichment failed')
    }
  })))
}

/**
 * Single ingest pass over every enabled source. Used by the hourly cron
 * and also for manual "ingest now" admin triggers. Runs up to
 * CONCURRENCY feeds in parallel. Each feed failure is captured in
 * news.feed_health, and sources whose 7-day error rate is >=50% after
 * the attempt are auto-disabled with a hub notification.
 */
export async function runIngestOnce(log: SchedulerLogger): Promise<void> {
  const sources = await db
    .select()
    .from(schema.sources)
    .where(eq(schema.sources.enabled, true))

  const queue = [...sources]
  const workers: Promise<void>[] = []

  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push((async () => {
      while (queue.length) {
        const s = queue.shift()
        if (!s) break
        const started = Date.now()
        try {
          const items = await fetchFeed(s.feedUrl, { timeoutMs: FEED_TIMEOUT_MS })
          const mapped = items.map(i => ({
            url: i.link,
            title: i.title,
            summary: i.contentSnippet,
            publishedAt: i.isoDate
              ? new Date(i.isoDate)
              : i.pubDate
                ? new Date(i.pubDate)
                : null,
            author: i.creator,
            contentHtml: i.content,
          }))
          const { newCount, newIds } = await insertArticlesDedup(s.id, mapped)
          const outcome: FeedOutcome = items.length === 0 ? 'empty' : 'success'
          await recordFeedAttempt(s.id, outcome, {
            itemsIngested: items.length,
            itemsNew: newCount,
            durationMs: Date.now() - started,
          })
          log.info({ slug: s.slug, items: items.length, new: newCount, outcome }, 'feed ok')
          // Enrichment runs in parallel with remaining feeds; do not await.
          void enrichNewArticles(newIds, log)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const outcome = classifyError(message)
          await recordFeedAttempt(s.id, outcome, {
            errorMessage: message.slice(0, 500),
            durationMs: Date.now() - started,
          })
          log.warn({ slug: s.slug, err: message, outcome }, 'feed failed')
          const disabled = await autoDisableIfUnhealthy(s.id, log)
          if (disabled) {
            await notifyFeedDisabled(s.slug, s.name)
          }
        }
      }
    })())
  }

  await Promise.all(workers)
}
