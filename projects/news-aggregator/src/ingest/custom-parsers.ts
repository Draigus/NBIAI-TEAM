import type { FeedItem } from './fetcher.js'

/**
 * Custom (non-RSS) source parsers, keyed by news.sources.custom_parser_key.
 *
 * The column has existed since the schema landed but was never wired up, so
 * every custom source silently ran through rss-parser and yielded zero items
 * forever (steam-upcoming: 1,990 consecutive empty polls before its
 * auto-disable). The scheduler dispatches here for any source that names a
 * key; a named-but-unregistered key is a hard error in fetchSourceItems —
 * never a silent RSS fallback.
 */
export type CustomParser = (feedUrl: string, opts: { timeoutMs?: number }) => Promise<FeedItem[]>

const USER_AGENT = 'NBI Hub News Aggregator (nbihub@nbi-consulting.com)'

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const resp = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': USER_AGENT } })
    if (!resp.ok) throw new Error(`http_error:${resp.status}`)
    return await resp.json()
  } finally {
    clearTimeout(timer)
  }
}

interface SteamFeaturedItem { id: number; name: string }

/** Map Steam's featuredcategories coming_soon payload to feed items. Exported for tests. */
export function mapSteamComingSoon(payload: unknown): FeedItem[] {
  const comingSoon = (payload as { coming_soon?: { items?: SteamFeaturedItem[] } })?.coming_soon
  const items = Array.isArray(comingSoon?.items) ? comingSoon.items : []
  return items
    .filter(i => i && typeof i.id === 'number' && typeof i.name === 'string' && i.name.length > 0)
    .map(i => ({
      title: i.name,
      link: `https://store.steampowered.com/app/${i.id}/`,
    }))
}

/**
 * Steam upcoming releases via the public featuredcategories JSON API.
 * The seeded GetSteamFeed endpoint 302s to the Steam Community homepage —
 * it never served a feed. featuredcategories.coming_soon is the supported
 * public surface for "coming soon" titles.
 */
const steamUpcoming: CustomParser = async (feedUrl, opts) => {
  const payload = await fetchJson(feedUrl, opts.timeoutMs ?? 15000)
  return mapSteamComingSoon(payload)
}

export const customParsers: Record<string, CustomParser> = {
  steam_upcoming: steamUpcoming,
}
