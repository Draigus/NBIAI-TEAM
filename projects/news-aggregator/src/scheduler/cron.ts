import cron from 'node-cron'
import { runIngestOnce, type SchedulerLogger } from '../ingest/scheduler.js'
import { generateWeeklyDigest } from '../pipeline/weekly.js'
import { generateMonthlySynthesis } from '../pipeline/monthly.js'
import { monthlySynthesisDay, weeklyDigestPeriod } from '../utils/dates.js'
import { healthcheckAuth } from '../llm/client.js'

/**
 * Start all background cron jobs:
 *   - hourly ingest (top of every hour)
 *   - weekly digest (Sunday 22:00 UTC; covers the Mon-Sun week that just closed)
 *   - monthly synthesis (22:00 UTC on min(30, last-day-of-month))
 *   - pre-flight LLM healthcheck 10 minutes before each major run
 *
 * All jobs wrap the unit of work in try/catch so a single failure doesn't
 * take the cron daemon down.
 */
export function startCronJobs(log: SchedulerLogger): void {
  // Hourly ingest
  cron.schedule(
    '0 * * * *',
    async () => {
      log.info({}, 'hourly ingest start')
      try {
        await runIngestOnce(log)
        log.info({}, 'hourly ingest done')
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        log.error({ err: message }, 'hourly ingest failed')
      }
    },
    { timezone: 'Etc/UTC' },
  )

  // Weekly digest: Sunday 22:00 UTC
  cron.schedule(
    '0 22 * * 0',
    async () => {
      log.info({}, 'weekly digest job start')
      try {
        const { start, end } = weeklyDigestPeriod(new Date())
        await generateWeeklyDigest(start, end, log)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        log.error({ err: message }, 'weekly digest failed')
      }
    },
    { timezone: 'Etc/UTC' },
  )

  // Monthly synthesis: 22:00 UTC daily, but only fires on the synthesis day
  cron.schedule(
    '0 22 * * *',
    async () => {
      const now = new Date()
      const y = now.getUTCFullYear()
      const m = now.getUTCMonth() + 1
      const d = now.getUTCDate()
      if (d !== monthlySynthesisDay(y, m)) return
      log.info({ year: y, month: m, day: d }, 'monthly synthesis job start')
      try {
        const monthDate = new Date(Date.UTC(y, m - 1, 1))
        await generateMonthlySynthesis(monthDate, log)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        log.error({ err: message }, 'monthly synthesis failed')
      }
    },
    { timezone: 'Etc/UTC' },
  )

  // Weekly pre-flight at Sunday 21:50 UTC
  cron.schedule(
    '50 21 * * 0',
    async () => {
      const h = await healthcheckAuth()
      log.info({ ok: h.ok, mode: h.mode, error: h.error }, 'weekly pre-flight')
    },
    { timezone: 'Etc/UTC' },
  )

  // Monthly pre-flight: 21:50 UTC daily, only fires on synthesis day
  cron.schedule(
    '50 21 * * *',
    async () => {
      const now = new Date()
      if (now.getUTCDate() !== monthlySynthesisDay(now.getUTCFullYear(), now.getUTCMonth() + 1)) return
      const h = await healthcheckAuth()
      log.info({ ok: h.ok, mode: h.mode, error: h.error }, 'monthly pre-flight')
    },
    { timezone: 'Etc/UTC' },
  )

  log.info(
    {},
    'cron jobs scheduled: hourly ingest, weekly digest (Sun 22:00 UTC), monthly synthesis (min(30, last-day-of-month) 22:00 UTC), pre-flights 21:50',
  )
}
