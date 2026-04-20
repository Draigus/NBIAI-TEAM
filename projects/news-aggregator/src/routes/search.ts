import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'

export async function searchRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string; source?: string; category?: string; from?: string; to?: string; has_video?: string; limit?: string } }>('/search', async (req, reply) => {
    const q = (req.query.q ?? '').trim()
    if (!q) return { stories: [], articles: [] }
    const limit = Math.min(Number(req.query.limit ?? 50), 100)
    const tsquery = sql`websearch_to_tsquery('english', ${q})`

    const storyFilters = [sql`s.search_vector @@ ${tsquery}`]
    if (req.query.category) storyFilters.push(sql`s.category = ${req.query.category}`)
    if (req.query.from) storyFilters.push(sql`d.period_start >= ${req.query.from}::date`)
    if (req.query.to) storyFilters.push(sql`d.period_end <= ${req.query.to}::date`)
    if (req.query.has_video === 'true') storyFilters.push(sql`s.has_video = true`)

    const stories = await db.execute(sql`
      SELECT s.id, s.headline, s.summary, s.category, d.period_start, d.period_end,
             ts_headline('english', s.summary, ${tsquery}, 'MaxWords=30, MinWords=10') AS snippet,
             ts_rank_cd(s.search_vector, ${tsquery}) AS rank
      FROM news.stories s JOIN news.digests d ON d.id = s.digest_id
      WHERE ${sql.join(storyFilters, sql` AND `)}
      ORDER BY rank DESC, d.period_end DESC LIMIT ${limit}
    `)

    const articleFilters = [sql`a.search_vector @@ ${tsquery}`]
    if (req.query.source) articleFilters.push(sql`src.slug = ${req.query.source}`)
    if (req.query.from) articleFilters.push(sql`a.published_at >= ${req.query.from}::timestamptz`)
    if (req.query.to) articleFilters.push(sql`a.published_at <= ${req.query.to}::timestamptz`)

    const articles = await db.execute(sql`
      SELECT a.id, a.title, a.url, a.published_at, src.name AS source, src.slug AS source_slug,
             ts_headline('english', coalesce(a.summary, ''), ${tsquery}, 'MaxWords=30, MinWords=10') AS snippet,
             ts_rank_cd(a.search_vector, ${tsquery}) AS rank
      FROM news.articles a JOIN news.sources src ON src.id = a.source_id
      WHERE ${sql.join(articleFilters, sql` AND `)}
      ORDER BY rank DESC, a.published_at DESC LIMIT ${limit}
    `)

    return { stories: stories.rows, articles: articles.rows }
  })
}
