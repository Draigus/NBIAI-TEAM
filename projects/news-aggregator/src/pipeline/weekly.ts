import { sql, eq } from 'drizzle-orm'
import pLimit from 'p-limit'
import type { SchedulerLogger } from '../ingest/scheduler.js'
import { db, schema } from '../db/index.js'
import { clusterArticles } from '../llm/clustering.js'
import { curateClusters } from '../llm/curation.js'
import { summariseStory } from '../llm/summarisation.js'
import { selectHeroStory } from '../llm/hero-selection.js'
import { healthcheckAuth } from '../llm/client.js'
import type { ArticleSourceInfo } from '../llm/curation.js'
import { filterUuids } from '../utils/uuids.js'

const SUMMARISE_CONCURRENCY = 4

const CANONICAL_CATEGORIES: ReadonlySet<string> = new Set(['studios', 'games', 'shifts', 'strategy'])

/**
 * Generate a weekly digest for a [periodStart, periodEnd) window.
 * Writes:
 *  - one row in `news.digests` (status=draft during work, flips to published on completion)
 *  - N rows in `news.stories` (one per selected cluster)
 *  - M rows in `news.story_articles` (cluster membership, isPrimarySource set per summary)
 *
 * Returns the digest ID.
 *
 * Notes:
 *  - Runs summarisation sequentially (one LLM call per story). A weekly of
 *    ~25 stories takes 2-3 minutes wall clock. If that becomes painful,
 *    parallelise with p-limit(4) inside the summarise loop.
 *  - If the window has zero articles the digest is left in 'draft' and the
 *    caller decides what to do (typically nothing — no cron alert).
 */
export async function generateWeeklyDigest(
  periodStart: Date,
  periodEnd: Date,
  log: SchedulerLogger,
): Promise<string> {
  const preflight = await healthcheckAuth()
  log.info({ authOk: preflight.ok, mode: preflight.mode, error: preflight.error }, 'weekly pre-flight')

  const [digest] = await db
    .insert(schema.digests)
    .values({
      digestType: 'weekly',
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      status: 'draft',
    })
    .returning({ id: schema.digests.id })

  const rows = await db.execute(sql`
    SELECT id FROM news.articles
    WHERE published_at >= ${periodStart} AND published_at < ${periodEnd}
    ORDER BY published_at DESC
  `)
  const articleIds = (rows.rows as Array<{ id: string }>).map((r) => r.id)

  if (articleIds.length === 0) {
    log.warn({ digestId: digest.id }, 'no articles in window; digest left as draft')
    return digest.id
  }

  // Cluster
  const clusters = await clusterArticles(articleIds, digest.id)
  log.info({ digestId: digest.id, clusterCount: clusters.length }, 'clustering done')

  // Guard: if clustering returned nothing we cannot produce stories. Leave
  // the digest as 'draft' so the operator notices and regenerates rather
  // than publishing an empty page.
  if (clusters.length === 0) {
    log.warn({ digestId: digest.id, articleCount: articleIds.length }, 'clustering returned zero clusters; digest left as draft')
    return digest.id
  }

  // Build article → source priorityWeight map for curation weighting.
  // Validate IDs defensively even though they originate from our DB
  // (audit finding N-C2, shared filterUuids helper in utils/uuids).
  const safeArticleIds = filterUuids(articleIds, 'weekly.sourceWeights')
  const idArray = `{${safeArticleIds.join(',')}}`
  const srcRows = safeArticleIds.length === 0
    ? { rows: [] as Array<{ article_id: string; priority_weight: string }> }
    : await db.execute(sql`
    SELECT a.id AS article_id, a.title AS article_title, s.priority_weight
    FROM news.articles a JOIN news.sources s ON s.id = a.source_id
    WHERE a.id = ANY(${idArray}::uuid[])
  `)
  const sourceWeights = new Map<string, ArticleSourceInfo>()
  const articleTitles = new Map<string, string>()
  for (const r of srcRows.rows as Array<{ article_id: string; article_title: string; priority_weight: string }>) {
    sourceWeights.set(r.article_id, { priorityWeight: Number(r.priority_weight) })
    articleTitles.set(r.article_id, r.article_title)
  }

  // Curate
  const curation = await curateClusters(clusters, digest.id, sourceWeights, articleTitles)
  log.info(
    { digestId: digest.id, selected: curation.selected.length, dynamic: curation.dynamic_category_label },
    'curation done',
  )

  // Phase 1: create story rows + link articles (sequential DB writes)
  const storyJobs: Array<{ storyId: string; articleIds: string[] }> = []
  for (const s of curation.selected) {
    const cluster = clusters[s.cluster_index]
    if (!cluster || cluster.article_ids.length === 0) continue

    const isDynamic = !CANONICAL_CATEGORIES.has(s.category)
    const [story] = await db
      .insert(schema.stories)
      .values({
        digestId: digest.id,
        category: s.category,
        isDynamicCategory: isDynamic,
        dynamicCategoryLabel:
          isDynamic && s.category === curation.dynamic_category_label ? curation.dynamic_category_label : null,
        rank: s.rank,
        headline: '(summarising)',
        summary: '(summarising)',
        sourceCount: cluster.article_ids.length,
        primaryEntities: cluster.entities as unknown as object,
      })
      .returning({ id: schema.stories.id })

    for (const aid of cluster.article_ids) {
      await db
        .insert(schema.storyArticles)
        .values({ storyId: story.id, articleId: aid, isPrimarySource: false })
        .onConflictDoNothing()
    }
    storyJobs.push({ storyId: story.id, articleIds: cluster.article_ids })
  }

  // Phase 2: summarise stories in parallel (N-B4)
  const summariseLimit = pLimit(SUMMARISE_CONCURRENCY)
  await Promise.allSettled(storyJobs.map(job => summariseLimit(async () => {
    const summary = await summariseStory(job.storyId, job.articleIds, digest.id)
    await db
      .update(schema.stories)
      .set({
        headline: summary.headline,
        summary: summary.summary,
        hasVideo: summary.has_video,
      })
      .where(eq(schema.stories.id, job.storyId))

    if (summary.primary_article_id) {
      await db
        .update(schema.storyArticles)
        .set({ isPrimarySource: true })
        .where(sql`story_id = ${job.storyId} AND article_id = ${summary.primary_article_id}`)
    }
  })))

  const storyIds = storyJobs.map(j => j.storyId)

  // Hero selection across all published stories
  const heroCandidates = await db
    .select()
    .from(schema.stories)
    .where(eq(schema.stories.digestId, digest.id))

  const heroId = await selectHeroStory(
    heroCandidates.map((s) => ({
      id: s.id,
      headline: s.headline,
      summary: s.summary,
      category: s.category,
    })),
    digest.id,
  )

  await db
    .update(schema.digests)
    .set({
      heroStoryId: heroId,
      status: 'published',
      publishedAt: new Date(),
    })
    .where(eq(schema.digests.id, digest.id))

  log.info(
    { digestId: digest.id, stories: storyIds.length, heroId, dynamic: curation.dynamic_category_label },
    'weekly digest published',
  )
  return digest.id
}
