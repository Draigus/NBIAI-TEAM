import Fastify from 'fastify'
import { loadConfig } from './config.js'
import { healthRoutes } from './routes/health.js'
import { seedSourcesIfEmpty } from './sources/registry.js'

const config = loadConfig()
const app = Fastify({ logger: { level: config.LOG_LEVEL } })

await app.register(healthRoutes)

const seeded = await seedSourcesIfEmpty()
if (seeded > 0) app.log.info(`Seeded ${seeded} sources`)

app.listen({ port: config.PORT, host: '127.0.0.1' }, (err, address) => {
  if (err) { app.log.error(err); process.exit(1) }
  app.log.info(`nbi-news listening on ${address}`)
})
