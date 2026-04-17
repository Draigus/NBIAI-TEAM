import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { canonicaliseUrl } from './canonical.js'

export interface RawArticle {
  url: string
  title: string
  summary?: string
  publishedAt?: Date | null
  author?: string
  ogImageUrl?: string
  contentHtml?: string
}

export interface DedupResult {
  /** Number of newly inserted article rows. */
  newCount: number
  /** UUIDs of the newly inserted rows, in insertion order. */
  newIds: string[]
}

/**
 * Insert articles, skipping any whose canonical_url already exists.
 *
 * Articles whose URL fails canonicalisation (non-http(s), malformed) are
 * dropped. If publishedAt is missing the ingest time is used, since the
 * schema column is NOT NULL.
 */
export async function insertArticlesDedup(sourceId: string, items: RawArticle[]): Promise<DedupResult> {
  const newIds: string[] = []
  for (const item of items) {
    const canonical = canonicaliseUrl(item.url)
    if (!canonical) continue
    const published = item.publishedAt ?? new Date()
    const result = await db.execute(sql`
      INSERT INTO news.articles (
        source_id, url, canonical_url, title, summary, body_html,
        published_at, author, og_image_url
      )
      VALUES (
        ${sourceId}, ${item.url}, ${canonical}, ${item.title},
        ${item.summary ?? null}, ${item.contentHtml ?? null},
        ${published}, ${item.author ?? null}, ${item.ogImageUrl ?? null}
      )
      ON CONFLICT (canonical_url) DO NOTHING
      RETURNING id
    `)
    const row = result.rows[0] as { id: string } | undefined
    if (row?.id) newIds.push(row.id)
  }
  return { newCount: newIds.length, newIds }
}
