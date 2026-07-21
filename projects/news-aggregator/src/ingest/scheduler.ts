import { eq, sql, and, isNull } from 'drizzle-orm'
import pLimit from 'p-limit'
import { db, schema } from '../db/index.js'
import { fetchFeed, type FeedItem } from './fetcher.js'
import { customParsers } from './custom-parsers.js'
import { insertArticlesDedup } from './dedup.js'
import {
  recordFeedAttempt, autoDisableIfUnhealthy, listRecoverableSources,
  reEnableSource, recordProbeAttempt, type FeedOutcome,
} from './feed-health.js'
import { fetchAndEnrich } from './enrichment.js'
import { notifyFeedDisabled } from '../notifications/hub.js'

/**
 * Fetch one source's items, dispatching to its custom parser when the
 * source names one. A named-but-unregistered parser key is a hard
 * configuration error: silently falling back to rss-parser is how every
 * custom source spent months polling "empty" while looking healthy, and
 * it would also let the recovery probe re-enable a source that can never
 * produce items. Exported for tests.
 */
export async function fetchSourceItems(
  source: { feedUrl: string; customParserKey: string | null },
  opts: { timeoutMs?: number },
): Promise<FeedItem[]> {
  if (source.customParserKey) {
    const parser = customParsers[source.customParserKey]
    if (!parser) throw new Error(`unregistered custom parser key: ${source.customParserKey}`)
    return parser(source.feedUrl, opts)
  }
  return fetchFeed(source.feedUrl, opts)
}

const CONCURRENCY = 8
const FEED_TIMEOUT_MS = 15000
const ENRICHMENT_CONCURRENCY = 4
const FETCH_RETRY_DELAY_MS = 5000

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
        ogImageHash: meta.ogImageHash ?? row.ogImageHash,
        author: meta.author ?? row.author,
        embeddedVideoUrls: (row.embeddedVideoUrls ?? []).length > 0 ? row.embeddedVideoUrls : meta.videoUrls,
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
          const items = await fetchSourceItems(s, { timeoutMs: FEED_TIMEOUT_MS })
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
          // N-B10: one retry with backoff before recording failure
          await new Promise(r => setTimeout(r, FETCH_RETRY_DELAY_MS))
          try {
            const retryItems = await fetchSourceItems(s, { timeoutMs: FEED_TIMEOUT_MS })
            const retryMapped = retryItems.map(i => ({
              url: i.link, title: i.title, summary: i.contentSnippet,
              publishedAt: i.isoDate ? new Date(i.isoDate) : i.pubDate ? new Date(i.pubDate) : null,
              author: i.creator, contentHtml: i.content,
            }))
            const { newCount, newIds } = await insertArticlesDedup(s.id, retryMapped)
            const outcome: FeedOutcome = retryItems.length === 0 ? 'empty' : 'success'
            await recordFeedAttempt(s.id, outcome, {
              itemsIngested: retryItems.length, itemsNew: newCount, durationMs: Date.now() - started,
            })
            log.info({ slug: s.slug, items: retryItems.length, new: newCount, outcome, retry: true }, 'feed ok (retry)')
            void enrichNewArticles(newIds, log)
          } catch (retryErr) {
            const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
            const outcome = classifyError(message)
            await recordFeedAttempt(s.id, outcome, {
              errorMessage: `${message} → retry: ${retryMsg}`.slice(0, 500),
              durationMs: Date.now() - started,
            })
            log.warn({ slug: s.slug, err: retryMsg, outcome }, 'feed failed (after retry)')
            const disabled = await autoDisableIfUnhealthy(s.id, log)
            if (disabled) {
              await notifyFeedDisabled(s.slug, s.name)
            }
          }
        }
      }
    })())
  }

  await Promise.all(workers)

  // N-B3: re-enrich articles that failed enrichment on prior passes.
  // Picks articles missing og_image_hash created in the last 24 hours.
  try {
    const unenriched = await db.select({ id: schema.articles.id })
      .from(schema.articles)
      .where(and(
        isNull(schema.articles.ogImageHash),
        sql`${schema.articles.ingestedAt} > now() - interval '24 hours'`,
      ))
    if (unenriched.length > 0) {
      log.info({ count: unenriched.length }, 're-enriching articles missing OG images')
      await enrichNewArticles(unenriched.map(r => r.id), log)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    log.warn({ err: msg }, 're-enrich pass failed')
  }

  // Self-healing: probe sources the health check auto-disabled (at most
  // once per 6 hours each) and quietly re-enable any that respond again.
  // Manual disables are never touched. Deliberately silent on success —
  // the whole point is fewer notifications, not a recovery announcement.
  try {
    await probeDisabledSources(log)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    log.warn({ err: msg }, 'recovery probe pass failed')
  }
}

/**
 * Probe auto-disabled sources and re-enable the ones that respond. A probe
 * counts as healthy when the fetch itself succeeds — zero items is fine
 * (that is a working feed with nothing new); an unregistered custom parser
 * key throws in fetchSourceItems, so a misconfigured source can never
 * probe back to life. Bounded so recovery can't become a long serial tail
 * on the hourly ingest: at most MAX_PROBES_PER_PASS sources per pass,
 * PROBE_CONCURRENCY at a time (the 6-hour per-source throttle lives in
 * listRecoverableSources). Exported for tests.
 */
const MAX_PROBES_PER_PASS = 5
const PROBE_CONCURRENCY = 2
export async function probeDisabledSources(log: SchedulerLogger): Promise<number> {
  const candidates = (await listRecoverableSources()).slice(0, MAX_PROBES_PER_PASS)
  const probeLimit = pLimit(PROBE_CONCURRENCY)
  let recovered = 0
  await Promise.all(candidates.map(s => probeLimit(async () => {
    await recordProbeAttempt(s.id)
    try {
      await fetchSourceItems(s, { timeoutMs: FEED_TIMEOUT_MS })
      await reEnableSource(s.id)
      recovered++
      log.info({ slug: s.slug }, 'auto-disabled source recovered and re-enabled')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.info({ slug: s.slug, err: message }, 'recovery probe failed; source stays disabled')
    }
  })))
  return recovered
}
