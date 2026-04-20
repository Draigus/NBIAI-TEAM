import type { FastifyInstance } from 'fastify'
import { sql, eq, inArray } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'
import { requireAdmin } from '../../auth/internal.js'
import { summariseStory } from '../../llm/summarisation.js'

export async function adminStoriesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)

  app.post<{ Body: { storyIds: string[] } }>('/merge', async (req, reply) => {
    const { storyIds } = req.body
    if (!storyIds || storyIds.length < 2) return reply.code(400).send({ error: 'at least 2 storyIds required' })
    const stories = await db.select().from(schema.stories).where(inArray(schema.stories.id, storyIds))
    if (stories.length !== storyIds.length) return reply.code(404).send({ error: 'story not found' })
    const digestId = stories[0].digestId
    if (!stories.every(s => s.digestId === digestId)) return reply.code(400).send({ error: 'stories must be in the same digest' })
    const [merged] = await db.insert(schema.stories).values({
      digestId, category: stories[0].category, rank: stories[0].rank,
      headline: '(regenerating)', summary: '(regenerating)',
      sourceCount: 0, primaryEntities: stories[0].primaryEntities,
    }).returning({ id: schema.stories.id })
    await db.execute(sql`UPDATE news.story_articles SET story_id = ${merged.id} WHERE story_id = ANY(${storyIds}::uuid[])`)
    await db.delete(schema.stories).where(inArray(schema.stories.id, storyIds))
    const articleIds = (await db.select({ id: schema.storyArticles.articleId }).from(schema.storyArticles).where(eq(schema.storyArticles.storyId, merged.id))).map(r => r.id)
    const summary = await summariseStory(merged.id, articleIds, digestId)
    await db.update(schema.stories).set({
      headline: summary.headline, summary: summary.summary, hasVideo: summary.has_video, sourceCount: articleIds.length,
    }).where(eq(schema.stories.id, merged.id))
    return { ok: true, mergedId: merged.id }
  })

  app.post<{ Body: { storyId: string; articleIds: string[]; newCategory?: string } }>('/split', async (req, reply) => {
    const { storyId, articleIds, newCategory } = req.body
    const [parent] = await db.select().from(schema.stories).where(eq(schema.stories.id, storyId)).limit(1)
    if (!parent) return reply.code(404).send({ error: 'story not found' })
    const [child] = await db.insert(schema.stories).values({
      digestId: parent.digestId, category: newCategory ?? parent.category, rank: parent.rank + 100,
      headline: '(regenerating)', summary: '(regenerating)',
      sourceCount: articleIds.length, primaryEntities: parent.primaryEntities,
    }).returning({ id: schema.stories.id })
    await db.execute(sql`UPDATE news.story_articles SET story_id = ${child.id} WHERE story_id = ${storyId} AND article_id = ANY(${articleIds}::uuid[])`)
    const parentArticleIds = (await db.select({ id: schema.storyArticles.articleId }).from(schema.storyArticles).where(eq(schema.storyArticles.storyId, storyId))).map(r => r.id)
    const [parentSummary, childSummary] = await Promise.all([
      summariseStory(storyId, parentArticleIds, parent.digestId),
      summariseStory(child.id, articleIds, parent.digestId),
    ])
    await db.update(schema.stories).set({ headline: parentSummary.headline, summary: parentSummary.summary, hasVideo: parentSummary.has_video, sourceCount: parentArticleIds.length }).where(eq(schema.stories.id, storyId))
    await db.update(schema.stories).set({ headline: childSummary.headline, summary: childSummary.summary, hasVideo: childSummary.has_video }).where(eq(schema.stories.id, child.id))
    return { ok: true, childId: child.id }
  })
}
