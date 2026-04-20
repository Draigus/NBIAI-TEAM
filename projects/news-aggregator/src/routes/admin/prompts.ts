import type { FastifyInstance } from 'fastify'
import { eq, desc } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'
import { requireAdmin } from '../../auth/internal.js'

export async function adminPromptsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)

  app.get('/', async () => {
    const rows = await db.select().from(schema.prompts).orderBy(schema.prompts.promptKey, desc(schema.prompts.version))
    return { prompts: rows }
  })

  app.post<{ Body: { promptKey: string; body: string; fewShotExamples?: unknown[] } }>('/', async (req) => {
    const user = (req as any).user
    const latest = await db.select().from(schema.prompts).where(eq(schema.prompts.promptKey, req.body.promptKey)).orderBy(desc(schema.prompts.version)).limit(1)
    const nextVersion = (latest[0]?.version ?? 0) + 1
    await db.update(schema.prompts).set({ isActive: false }).where(eq(schema.prompts.promptKey, req.body.promptKey))
    const inserted = await db.insert(schema.prompts).values({
      promptKey: req.body.promptKey, version: nextVersion, body: req.body.body, fewShotExamples: req.body.fewShotExamples as any, isActive: true, createdBy: user.username,
    }).returning()
    return { ok: true, prompt: inserted[0] }
  })

  app.post<{ Params: { id: string } }>('/:id/activate', async (req) => {
    const [row] = await db.select().from(schema.prompts).where(eq(schema.prompts.id, req.params.id)).limit(1)
    if (!row) return { ok: false }
    await db.update(schema.prompts).set({ isActive: false }).where(eq(schema.prompts.promptKey, row.promptKey))
    await db.update(schema.prompts).set({ isActive: true }).where(eq(schema.prompts.id, req.params.id))
    return { ok: true }
  })
}
