// Force-override any ambient process.env values — PM2's saved dump
// occasionally ships empty strings for ANTHROPIC_API_KEY.
import dotenv from 'dotenv'
dotenv.config({ override: true })

import Fastify from 'fastify'
import { timingSafeEqual } from 'node:crypto'
import { loadConfig } from './config.js'
import { healthRoutes } from './routes/health.js'
import { mediaRoutes } from './routes/media.js'
import { digestRoutes } from './routes/digests.js'
import { seedSourcesIfEmpty } from './sources/registry.js'
import { seedPromptsIfEmpty } from './llm/seed-prompts.js'
import { startCronJobs } from './scheduler/cron.js'
import { healthcheckAuth } from './llm/client.js'

const config = loadConfig()
const app = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    // Strip internal tokens and API keys from error / request logs so a
    // wrapped SDK error cannot serialise a credential into the log file
    // (audit finding N-C6).
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers["x-nbi-internal-token"]',
        '*.headers.authorization',
        'apiKey',
        'api_key',
        'ANTHROPIC_API_KEY',
        'ANTHROPIC_API_KEY_FAILOVER',
      ],
      censor: '[REDACTED]',
    },
  },
})

/**
 * Require the internal token on every /news/* request. Uses
 * timingSafeEqual over equal-length buffers to resist timing probes.
 * Public /health is exempt so reverse proxies can still probe it.
 * Closes audit finding N-C1 — the previous implementation relied
 * entirely on the 127.0.0.1 bind and verified nothing inbound.
 */
const expectedInboundToken = Buffer.from(config.NEWS_INTERNAL_TOKEN, 'utf8')
app.addHook('onRequest', async (req, reply) => {
  const url = req.url ?? ''
  if (!url.startsWith('/news')) return
  const raw = req.headers['x-nbi-internal-token']
  const presented = typeof raw === 'string' ? raw : ''
  const provided = Buffer.from(presented, 'utf8')
  if (provided.length !== expectedInboundToken.length || !timingSafeEqual(provided, expectedInboundToken)) {
    reply.code(401).send({ error: 'unauthorised' })
  }
})

await app.register(healthRoutes)
await app.register(mediaRoutes, { prefix: '/news' })
await app.register(digestRoutes, { prefix: '/news' })

const seeded = await seedSourcesIfEmpty()
if (seeded > 0) app.log.info(`Seeded ${seeded} sources`)

const seededPrompts = await seedPromptsIfEmpty()
if (seededPrompts > 0) app.log.info(`Seeded ${seededPrompts} prompts`)

app.listen({ port: config.PORT, host: '127.0.0.1' }, async (err, address) => {
  if (err) { app.log.error(err); process.exit(1) }
  app.log.info(`nbi-news listening on ${address}`)
  startCronJobs(app.log)

  if (process.env.NEWS_SKIP_LLM_HEALTHCHECK !== '1') {
    const health = await healthcheckAuth()
    app.log.info({ ok: health.ok, mode: health.mode, error: health.error }, 'LLM auth pre-flight')
    if (!health.ok) app.log.warn('LLM auth pre-flight failed; subsequent LLM runs may fail')
  } else {
    app.log.info('LLM auth pre-flight skipped (NEWS_SKIP_LLM_HEALTHCHECK=1)')
  }
})
