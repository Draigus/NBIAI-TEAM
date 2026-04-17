import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function seedSourcesIfEmpty(): Promise<number> {
  const result = await db.execute(sql`select count(*)::int as count from news.sources`)
  const count = (result.rows[0] as { count: number }).count
  if (count > 0) return 0
  const raw = await readFile(join(__dirname, 'seed.json'), 'utf8')
  const sources = JSON.parse(raw) as Array<{
    slug: string; name: string; tier: string; feed_url: string;
    feed_type?: string; base_url?: string; priority_weight?: number; custom_parser_key?: string;
  }>
  for (const s of sources) {
    await db.insert(schema.sources).values({
      slug: s.slug, name: s.name, tier: s.tier, feedUrl: s.feed_url,
      feedType: s.feed_type || 'rss', baseUrl: s.base_url ?? null,
      priorityWeight: String(s.priority_weight ?? 1.0),
      customParserKey: s.custom_parser_key ?? null,
    })
  }
  return sources.length
}
