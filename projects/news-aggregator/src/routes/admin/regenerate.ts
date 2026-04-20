import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'
import { requireAdmin } from '../../auth/internal.js'
import { generateWeeklyDigest } from '../../pipeline/weekly.js'
import { summariseStory } from '../../llm/summarisation.js'

export async function adminRegenerateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)

  app.post<{ Params: { id: string } }>('/digests/:id', async (req, reply) => {
    const [d] = await db.select().from(schema.digests).where(eq(schema.digests.id, req.params.id)).limit(1)
    if (!d) return reply.code(404).send({ error: 'digest not found' })
    await db.update(schema.digests).set({ status: 'regenerating' }).where(eq(schema.digests.id, d.id))
    try {
      await generateWeeklyDigest(new Date(d.periodStart), new Date(d.periodEnd), req.log)
      await db.delete(schema.stories).where(eq(schema.stories.digestId, d.id))
      await db.delete(schema.digests).where(eq(schema.digests.id, d.id))
      return { ok: true }
    } catch (err) {
      await db.update(schema.digests).set({ status: 'published' }).where(eq(schema.digests.id, d.id))
      throw err
    }
  })

  app.post<{ Params: { id: string } }>('/stories/:id', async (req, reply) => {
    const [s] = await db.select().from(schema.stories).where(eq(schema.stories.id, req.params.id)).limit(1)
    if (!s) return reply.code(404).send({ error: 'story not found' })
    const articleIds = (await db.select({ id: schema.storyArticles.articleId }).from(schema.storyArticles).where(eq(schema.storyArticles.storyId, s.id))).map(r => r.id)
    const summary = await summariseStory(s.id, articleIds, s.digestId)
    await db.update(schema.stories).set({ headline: summary.headline, summary: summary.summary, hasVideo: summary.has_video }).where(eq(schema.stories.id, s.id))
    return { ok: true, summary }
  })
}
