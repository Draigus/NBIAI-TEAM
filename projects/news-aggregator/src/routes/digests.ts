import type { FastifyInstance } from 'fastify'
import { sql, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

/**
 * Read-only digest endpoints. Mounted under `/news/*` in src/index.ts;
 * the dashboard proxy rewrites `/api/news/*` → this service.
 *
 * All endpoints return the full shape the frontend needs in one request
 * (digest + hero + stories + articles + optional monthly summary). JSON
 * aggregation is done server-side so we don't N+1 per story.
 */
export async function digestRoutes(app: FastifyInstance): Promise<void> {
  // Current digest: most recently published weekly / launch_30day.
  app.get('/digests/current', async () => {
    return loadDigest(await currentDigestId())
  })

  app.get<{ Querystring: { limit?: string; offset?: string } }>('/digests/archive', async (req) => {
    const limit = Math.min(Number(req.query.limit ?? 24), 100)
    const offset = Math.max(Number(req.query.offset ?? 0), 0)
    const digests = await db.execute(sql`
      SELECT id, digest_type, period_start, period_end, published_at
      FROM news.digests WHERE status = 'published'
      ORDER BY period_start DESC LIMIT ${limit} OFFSET ${offset}
    `)
    const ms = await db.execute(sql`
      SELECT id, month, published_at, title FROM news.monthly_summaries
      WHERE published_at IS NOT NULL ORDER BY month DESC LIMIT ${limit}
    `)
    return { digests: digests.rows, monthly_summaries: ms.rows }
  })

  app.get<{ Params: { id: string } }>('/digests/:id', async (req, reply) => {
    const data = await loadDigest(req.params.id)
    if (!data) return reply.code(404).send({ error: 'not found' })
    return data
  })

  app.get<{ Params: { id: string } }>('/monthly-summaries/:id', async (req, reply) => {
    const rows = await db
      .select()
      .from(schema.monthlySummaries)
      .where(eq(schema.monthlySummaries.id, req.params.id))
      .limit(1)
    if (!rows[0]) return reply.code(404).send({ error: 'not found' })
    return rows[0]
  })
}

async function currentDigestId(): Promise<string | null> {
  const result = await db.execute(sql`
    SELECT id FROM news.digests
    WHERE status = 'published'
    ORDER BY period_end DESC, published_at DESC LIMIT 1
  `)
  const row = result.rows[0] as { id?: string } | undefined
  return row?.id ?? null
}

async function loadDigest(id: string | null) {
  if (!id) return null
  const [digest] = await db
    .select()
    .from(schema.digests)
    .where(eq(schema.digests.id, id))
    .limit(1)
  if (!digest) return null

  // Pull stories + aggregated articles + best OG image per story in one
  // round-trip. Canonical categories first (studios → games → shifts →
  // strategy), dynamic 5th last, then by rank within category.
  const storyResult = await db.execute(sql`
    SELECT s.id, s.category, s.is_dynamic_category, s.dynamic_category_label, s.rank,
           s.headline, s.summary, s.hero_asset_id, s.has_video, s.source_count,
           s.primary_entities,
           (SELECT a.og_image_hash FROM news.articles a
              JOIN news.story_articles sa ON sa.article_id = a.id
              WHERE sa.story_id = s.id AND a.og_image_hash IS NOT NULL
              ORDER BY sa.is_primary_source DESC, a.published_at ASC LIMIT 1) AS og_image_hash,
           (SELECT json_agg(json_build_object(
              'id', a.id, 'title', a.title, 'url', a.url,
              'source', src.name, 'published_at', a.published_at,
              'author', a.author, 'is_primary', sa.is_primary_source
            ) ORDER BY sa.is_primary_source DESC, a.published_at DESC)
             FROM news.story_articles sa
             JOIN news.articles a ON a.id = sa.article_id
             JOIN news.sources src ON src.id = a.source_id
             WHERE sa.story_id = s.id) AS articles
    FROM news.stories s
    WHERE s.digest_id = ${id}::uuid
    ORDER BY
      CASE s.category
        WHEN 'studios' THEN 1 WHEN 'games' THEN 2 WHEN 'shifts' THEN 3 WHEN 'strategy' THEN 4
        ELSE 5 END,
      s.rank
  `)
  const stories = storyResult.rows as Array<Record<string, unknown> & { id: string }>

  // Monthly synthesis: find the latest published monthly_summary whose
  // month overlaps this digest's period.
  const msResult = await db.execute(sql`
    SELECT id, title, body_markdown, featured_story_ids, published_at, month
    FROM news.monthly_summaries
    WHERE published_at IS NOT NULL
      AND month <= ${digest.periodEnd}::date
      AND month >= (${digest.periodStart}::date - INTERVAL '31 days')
    ORDER BY month DESC LIMIT 1
  `)

  const hero = digest.heroStoryId
    ? stories.find((s) => s.id === digest.heroStoryId) ?? null
    : null

  return {
    digest,
    hero,
    stories,
    monthly_summary: msResult.rows[0] ?? null,
  }
}
