import type { FastifyInstance } from 'fastify'
import { sql, eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'
import { requireAdmin } from '../../auth/internal.js'

export async function adminFeedHealthRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)

  app.get('/sources', async () => {
    const rows = await db.execute(sql`
      SELECT s.id, s.slug, s.name, s.tier, s.enabled, s.last_success_at, s.last_attempt_at, s.consecutive_failures,
             (SELECT count(*)::int FROM news.feed_health fh WHERE fh.source_id = s.id AND fh.attempted_at > now() - interval '7 days') AS attempts_7d,
             (SELECT count(*)::int FROM news.feed_health fh WHERE fh.source_id = s.id AND fh.attempted_at > now() - interval '7 days' AND fh.outcome != 'success') AS failures_7d,
             (SELECT sum(items_new)::int FROM news.feed_health fh WHERE fh.source_id = s.id AND fh.attempted_at > now() - interval '7 days') AS new_items_7d
      FROM news.sources s ORDER BY s.tier, s.name
    `)
    return { sources: rows.rows }
  })

  app.patch<{ Params: { id: string }; Body: { enabled: boolean } }>('/sources/:id', async (req) => {
    await db.update(schema.sources).set({ enabled: req.body.enabled }).where(eq(schema.sources.id, req.params.id))
    return { ok: true }
  })

  app.get<{ Params: { id: string } }>('/sources/:id/history', async (req) => {
    const rows = await db.execute(sql`
      SELECT attempted_at, outcome, http_status, error_message, items_new, duration_ms
      FROM news.feed_health WHERE source_id = ${req.params.id}
      ORDER BY attempted_at DESC LIMIT 200
    `)
    return { history: rows.rows }
  })
}
