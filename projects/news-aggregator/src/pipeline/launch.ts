import { eq } from 'drizzle-orm'
import type { SchedulerLogger } from '../ingest/scheduler.js'
import { db, schema } from '../db/index.js'
import { generateWeeklyDigest } from './weekly.js'

/**
 * The 30-day launch edition: structurally a weekly digest but with a 30-day
 * window. Called once at go-live to seed the news tab with content from the
 * month leading up to launch.
 *
 * Implementation: run the weekly orchestrator with a 30-day window, then
 * flip the digest_type from 'weekly' to 'launch_30day' so the UI can label
 * it differently.
 */
export async function generateLaunchDigest(log: SchedulerLogger): Promise<string> {
  const now = new Date()
  const periodEnd = now
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const id = await generateWeeklyDigest(periodStart, periodEnd, log)

  await db
    .update(schema.digests)
    .set({ digestType: 'launch_30day' })
    .where(eq(schema.digests.id, id))

  log.info({ digestId: id }, 'launch edition (30-day) published')
  return id
}
