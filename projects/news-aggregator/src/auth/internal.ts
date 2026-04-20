import type { FastifyRequest, FastifyReply } from 'fastify'
import { timingSafeEqual } from 'node:crypto'
import { loadConfig } from '../config.js'

const config = loadConfig()

export interface NbiUser { username: string; displayName: string; isAdmin: boolean }

const expectedToken = Buffer.from(config.NEWS_INTERNAL_TOKEN, 'utf8')

export async function authenticateInternal(req: FastifyRequest, reply: FastifyReply) {
  const raw = req.headers['x-nbi-internal-token']
  const presented = typeof raw === 'string' ? raw : ''
  const provided = Buffer.from(presented, 'utf8')
  if (provided.length !== expectedToken.length || !timingSafeEqual(provided, expectedToken)) {
    return reply.code(401).send({ error: 'unauthorised' })
  }
  const userHeader = req.headers['x-nbi-user']
  if (typeof userHeader !== 'string') return reply.code(401).send({ error: 'missing user context' })
  try { (req as any).user = JSON.parse(userHeader) as NbiUser } catch { return reply.code(400).send({ error: 'bad user header' }) }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const user = (req as any).user as NbiUser | undefined
  if (!user?.isAdmin) return reply.code(403).send({ error: 'admin required' })
}
