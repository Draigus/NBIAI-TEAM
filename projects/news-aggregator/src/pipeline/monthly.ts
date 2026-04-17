import { eq } from 'drizzle-orm'
import type { SchedulerLogger } from '../ingest/scheduler.js'
import { db, schema } from '../db/index.js'
import { synthesiseMonth } from '../llm/monthly-synthesis.js'

/**
 * Generate the monthly synthesis for the calendar month of `monthDate`.
 * Writes one row in `news.monthly_summaries`, keyed by `month` (first day
 * of the month). Idempotent — if a summary for the month already exists,
 * logs and returns its id rather than generating a second copy.
 */
export async function generateMonthlySynthesis(
  monthDate: Date,
  log: SchedulerLogger,
): Promise<string> {
  const y = monthDate.getUTCFullYear()
  const m = monthDate.getUTCMonth() + 1
  const monthStr = `${y}-${String(m).padStart(2, '0')}-01`

  // Check-then-insert. The schema declares an index on `month` but not a
  // unique constraint, so we can't rely on ON CONFLICT. The monthly cron
  // runs at most once per day, so the check/insert race is theoretical;
  // if we ever add backfill concurrency, convert the index to UNIQUE and
  // switch to onConflictDoNothing.
  const existing = await db
    .select()
    .from(schema.monthlySummaries)
    .where(eq(schema.monthlySummaries.month, monthStr))
    .limit(1)
  if (existing[0]) {
    log.warn({ monthStr }, 'monthly synthesis already exists; skipping')
    return existing[0].id
  }

  const [created] = await db
    .insert(schema.monthlySummaries)
    .values({
      month: monthStr,
      title: '(generating)',
      bodyMarkdown: '(generating)',
    })
    .returning({ id: schema.monthlySummaries.id })
  const msId = created.id
  const synth = await synthesiseMonth(monthDate, msId)

  await db
    .update(schema.monthlySummaries)
    .set({
      title: synth.title,
      bodyMarkdown: synth.body_markdown,
      featuredStoryIds: synth.featured_story_ids,
      publishedAt: new Date(),
    })
    .where(eq(schema.monthlySummaries.id, msId))

  log.info({ monthStr, msId }, 'monthly synthesis published')
  return msId
}
