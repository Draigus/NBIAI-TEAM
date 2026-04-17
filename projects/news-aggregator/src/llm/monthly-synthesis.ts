import { sql } from 'drizzle-orm'
import { callClaude } from './client.js'
import { loadActivePrompt } from './prompts.js'
import { db } from '../db/index.js'
import { safeParseJson } from './json-utils.js'

export interface MonthlySynthesisResult {
  title: string
  body_markdown: string
  featured_story_ids: string[]
}

interface DigestRow {
  id: string
  period_start: string
  period_end: string
  stories: unknown
}

/**
 * Write the "State of the Industry" editorial for a given month. Pulls
 * every published weekly digest whose period starts in the target month,
 * sends the curated stories to the LLM, and parses the returned title +
 * markdown body + featured story IDs.
 *
 * `monthDate` is any date in the target month (time zone: UTC). Caller
 * persists the result to `news.monthly_summaries`.
 */
export async function synthesiseMonth(
  monthDate: Date,
  monthlySummaryId: string,
): Promise<MonthlySynthesisResult> {
  const year = monthDate.getUTCFullYear()
  const month = monthDate.getUTCMonth() + 1

  const digests = await db.execute(sql`
    SELECT d.id, d.period_start, d.period_end,
      json_agg(
        json_build_object('id', s.id, 'headline', s.headline, 'category', s.category, 'rank', s.rank)
        ORDER BY s.rank
      ) AS stories
    FROM news.digests d
    LEFT JOIN news.stories s ON s.digest_id = d.id
    WHERE d.status = 'published'
      AND EXTRACT(YEAR FROM d.period_start) = ${year}
      AND EXTRACT(MONTH FROM d.period_start) = ${month}
    GROUP BY d.id, d.period_start, d.period_end
    ORDER BY d.period_start
  `)

  const rows = digests.rows as unknown as DigestRow[]
  const periodStr = `${year}-${String(month).padStart(2, '0')}`

  const prompt = await loadActivePrompt('monthly_synthesis')
  const result = await callClaude({
    runType: 'monthly_synthesis',
    monthlySummaryId,
    systemPrompt: prompt.body,
    userMessage: `Weekly digests for ${periodStr}:\n${JSON.stringify(rows, null, 2)}`,
    maxTokens: 4096,
    period: periodStr,
  })

  const parsed = safeParseJson<Partial<MonthlySynthesisResult>>(result.text)
  if (
    !parsed ||
    typeof parsed.title !== 'string' ||
    typeof parsed.body_markdown !== 'string'
  ) {
    const monthName = monthDate.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
    return {
      title: `${monthName}: (synthesis failed)`,
      body_markdown: 'Synthesis generation failed for this month.',
      featured_story_ids: [],
    }
  }
  return {
    title: parsed.title,
    body_markdown: parsed.body_markdown,
    featured_story_ids: Array.isArray(parsed.featured_story_ids)
      ? parsed.featured_story_ids.filter((id): id is string => typeof id === 'string')
      : [],
  }
}
