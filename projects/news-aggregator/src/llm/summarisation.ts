import { sql } from 'drizzle-orm'
import { callClaude } from './client.js'
import { loadActivePrompt } from './prompts.js'
import { db } from '../db/index.js'
import { safeParseJson } from './json-utils.js'

export interface StorySummary {
  headline: string
  summary: string
  has_video: boolean
  primary_article_id: string
}

interface ArticleRow {
  id: string
  source: string
  title: string
  summary: string | null
  url: string
  embedded_video_urls: string[] | null
}

/**
 * Summarise a story cluster into a headline + 2-3 sentence summary, detect
 * video content, and pick a primary source. Caller persists the result
 * back onto the `news.stories` row.
 *
 * On LLM failure (malformed JSON, blocked output) we return a placeholder
 * so the pipeline keeps going — the digest will have a visible "(summary
 * failed)" story that Glen can regenerate via the admin UI.
 */
export async function summariseStory(
  storyId: string,
  articleIds: string[],
  digestId: string,
): Promise<StorySummary> {
  if (articleIds.length === 0) {
    return fallback('(no articles)', '')
  }
  const idArray = `{${articleIds.join(',')}}`
  const articles = await db.execute(sql`
    SELECT a.id, s.name AS source, a.title, a.summary, a.url, a.embedded_video_urls
    FROM news.articles a JOIN news.sources s ON s.id = a.source_id
    WHERE a.id = ANY(${idArray}::uuid[])
  `)
  const rows = articles.rows as unknown as ArticleRow[]

  const prompt = await loadActivePrompt('summarisation')
  const result = await callClaude({
    runType: 'summarisation',
    digestId,
    systemPrompt: prompt.body,
    userMessage: `Articles:\n${JSON.stringify(rows, null, 2)}`,
    maxTokens: 1024,
  })

  const parsed = safeParseJson<Partial<StorySummary>>(result.text)
  if (!parsed || typeof parsed.headline !== 'string' || typeof parsed.summary !== 'string') {
    return fallback('(summary failed)', articleIds[0])
  }
  return {
    headline: parsed.headline,
    summary: parsed.summary,
    has_video: Boolean(parsed.has_video),
    // Trust LLM's pick only if it's actually in the cluster; otherwise
    // fall back to the first article.
    primary_article_id:
      typeof parsed.primary_article_id === 'string' && articleIds.includes(parsed.primary_article_id)
        ? parsed.primary_article_id
        : articleIds[0],
  }
}

function fallback(headline: string, primaryId: string): StorySummary {
  return {
    headline,
    summary: 'Summary generation failed for this story.',
    has_video: false,
    primary_article_id: primaryId,
  }
}
