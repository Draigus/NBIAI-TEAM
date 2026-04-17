import { createHash } from 'node:crypto'
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { loadConfig } from '../config.js'
import { buildVariant, VARIANT_NAMES, type VariantName } from './variants.js'

const config = loadConfig()

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // spec §15, 2 MB cap
const FETCH_TIMEOUT_MS = 10_000
const USER_AGENT = 'NBI Hub News Aggregator (nbihub@nbi-consulting.com)'

function variantPath(hash: string, variant: VariantName): string {
  const prefix = hash.slice(0, 2)
  return join(config.MEDIA_STORAGE_PATH, prefix, `${hash}.${variant}.webp`)
}

/**
 * Download an OG image, deduplicate on SHA-256, persist the
 * news.media_assets row, and build all three WebP variants on disk.
 * Returns the asset hash on success, or null if the image is missing,
 * too large, unreachable, or unprocessable.
 */
export async function cacheOgImage(sourceUrl: string): Promise<string | null> {
  try {
    const existing = await db
      .select()
      .from(schema.mediaAssets)
      .where(eq(schema.mediaAssets.sourceUrl, sourceUrl))
      .limit(1)
    if (existing[0]) return existing[0].hash

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const resp = await fetch(sourceUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!resp.ok) return null
      const contentLength = Number(resp.headers.get('content-length') || '0')
      if (contentLength > MAX_IMAGE_BYTES) return null

      const buf = Buffer.from(await resp.arrayBuffer())
      if (buf.byteLength > MAX_IMAGE_BYTES) return null

      const meta = await sharp(buf).metadata()
      if (!meta.format || !meta.width || !meta.height) return null

      const hash = createHash('sha256').update(buf).digest('hex')
      const prefix = hash.slice(0, 2)
      await mkdir(join(config.MEDIA_STORAGE_PATH, prefix), { recursive: true })
      for (const v of VARIANT_NAMES) {
        const variantBuf = await buildVariant(buf, v)
        await writeFile(variantPath(hash, v), variantBuf)
      }

      await db
        .insert(schema.mediaAssets)
        .values({
          sourceUrl,
          hash,
          mimeType: `image/${meta.format}`,
          bytes: buf.byteLength,
          width: meta.width,
          height: meta.height,
          fetchedAt: new Date(),
        })
        .onConflictDoNothing()

      return hash
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null
  }
}

/**
 * Return the on-disk path for a cached variant if it exists, else null.
 */
export async function getVariantPath(hash: string, variant: VariantName): Promise<string | null> {
  const path = variantPath(hash, variant)
  try {
    await stat(path)
    return path
  } catch {
    return null
  }
}
