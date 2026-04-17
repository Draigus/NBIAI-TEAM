import Fastify from 'fastify'
import { loadConfig } from './config.js'
import { healthRoutes } from './routes/health.js'

const config = loadConfig()
const app = Fastify({ logger: { level: config.LOG_LEVEL } })

await app.register(healthRoutes)

app.listen({ port: config.PORT, host: '127.0.0.1' }, (err, address) => {
  if (err) { app.log.error(err); process.exit(1) }
  app.log.info(`nbi-news listening on ${address}`)
})
