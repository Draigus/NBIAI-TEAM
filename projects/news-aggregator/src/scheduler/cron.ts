import cron from 'node-cron'
import { runIngestOnce, type SchedulerLogger } from '../ingest/scheduler.js'

/**
 * Start all background cron jobs. Hourly ingest is the only job wired up
 * in M1; weekly digest and monthly synthesis get added in Tasks 23 to 25.
 */
export function startCronJobs(log: SchedulerLogger): void {
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

  log.info({}, 'cron jobs scheduled: hourly ingest')
}
