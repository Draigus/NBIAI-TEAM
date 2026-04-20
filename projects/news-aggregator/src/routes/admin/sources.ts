import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'
import { requireAdmin } from '../../auth/internal.js'

export async function adminSourcesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)

  app.post<{ Body: { slug: string; name: string; tier: string; feedUrl: string; feedType?: string; baseUrl?: string; priorityWeight?: number; customParserKey?: string } }>('/', async (req) => {
    const b = req.body
    const inserted = await db.insert(schema.sources).values({
      slug: b.slug, name: b.name, tier: b.tier, feedUrl: b.feedUrl,
      feedType: b.feedType ?? 'rss', baseUrl: b.baseUrl ?? null,
      priorityWeight: String(b.priorityWeight ?? 1.0), customParserKey: b.customParserKey ?? null,
    }).returning()
    return { ok: true, source: inserted[0] }
  })

  app.patch<{ Params: { id: string }; Body: Partial<{ name: string; tier: string; feedUrl: string; feedType: string; baseUrl: string; priorityWeight: number; enabled: boolean; customParserKey: string }> }>('/:id', async (req) => {
    const b = req.body
    const update: Record<string, unknown> = {}
    for (const k of ['name', 'tier', 'feedUrl', 'feedType', 'baseUrl', 'enabled', 'customParserKey'] as const) if (k in b) (update as any)[k] = (b as any)[k]
    if ('priorityWeight' in b && typeof b.priorityWeight === 'number') update.priorityWeight = String(b.priorityWeight)
    await db.update(schema.sources).set(update).where(eq(schema.sources.id, req.params.id))
    return { ok: true }
  })

  app.delete<{ Params: { id: string } }>('/:id', async (req) => {
    await db.delete(schema.sources).where(eq(schema.sources.id, req.params.id))
    return { ok: true }
  })
}
