import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok', service: 'nbi-news', time: new Date().toISOString() }))
}
