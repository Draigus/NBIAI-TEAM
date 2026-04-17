import { sql } from 'drizzle-orm'
import { callClaude } from './client.js'
import { loadActivePrompt } from './prompts.js'
import { db } from '../db/index.js'
import { safeParseJson } from './json-utils.js'

export interface ClusterEntities {
  studios: string[]
  games: string[]
  people: string[]
  deals: string[]
  figures: string[]
}

export interface ClusterResult {
  article_ids: string[]
  entities: ClusterEntities
}

interface ClusteringOutput {
  clusters?: unknown
}

interface ArticleRow {
  id: string
  source: string
  title: string
  summary: string | null
}

/**
 * Identify which articles cover the same underlying story. Returns the
 * cluster array exactly as the LLM produced it (article IDs + entity
 * extractions). Callers persist to `news.stories` + `news.story_articles`.
 *
 * Passing an empty list is a no-op (saves a round-trip) and returns [].
 */
export async function clusterArticles(articleIds: string[], digestId: string): Promise<ClusterResult[]> {
  if (articleIds.length === 0) return []
  const articles = await db.execute(sql`
    SELECT a.id, s.name AS source, a.title, a.summary
    FROM news.articles a JOIN news.sources s ON s.id = a.source_id
    WHERE a.id = ANY(${articleIds}::uuid[])
  `)
  const prompt = await loadActivePrompt('clustering')
  const userMessage = `Articles:\n${JSON.stringify(articles.rows as unknown as ArticleRow[], null, 2)}`
  const result = await callClaude({
    runType: 'clustering',
    digestId,
    systemPrompt: prompt.body,
    userMessage,
    maxTokens: 8192,
  })
  const parsed = safeParseJson<ClusteringOutput>(result.text)
  if (!parsed || !Array.isArray(parsed.clusters)) return []
  return parsed.clusters.filter(isClusterResult)
}

function isClusterResult(x: unknown): x is ClusterResult {
  if (!x || typeof x !== 'object') return false
  const c = x as Partial<ClusterResult>
  return Array.isArray(c.article_ids) && c.article_ids.every((id) => typeof id === 'string')
}
