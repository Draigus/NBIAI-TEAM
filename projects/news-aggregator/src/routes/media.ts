import type { FastifyInstance } from 'fastify'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { getVariantPath } from '../media/cache.js'
import { VARIANT_NAMES, type VariantName } from '../media/variants.js'

const ALLOWED_VARIANTS = new Set<string>(VARIANT_NAMES)
const HASH_RE = /^[a-f0-9]{64}$/

export async function mediaRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { hash: string; variant: string } }>(
    '/media/:hash/:variant',
    async (req, reply) => {
      const { hash, variant } = req.params
      if (!HASH_RE.test(hash)) return reply.code(404).send()
      if (!ALLOWED_VARIANTS.has(variant)) return reply.code(404).send()
      const path = await getVariantPath(hash, variant as VariantName)
      if (!path) return reply.code(404).send()
      const s = await stat(path)
      reply.header('Cache-Control', 'public, max-age=86400, immutable')
      reply.header('Content-Type', 'image/webp')
      reply.header('Content-Length', s.size)
      return reply.send(createReadStream(path))
    },
  )
}
