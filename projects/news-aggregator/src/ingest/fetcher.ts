import Parser from 'rss-parser'

const USER_AGENT = 'NBI Hub News Aggregator (nbihub@nbi-consulting.com)'
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': USER_AGENT } })

export interface FeedItem {
  title: string
  link: string
  isoDate?: string
  pubDate?: string
  creator?: string
  content?: string
  contentSnippet?: string
  enclosure?: { url: string; type?: string }
}

export async function parseFeedAsync(xml: string): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseString(xml)
    return (feed.items || []).map(i => ({
      title: i.title || '',
      link: i.link || '',
      isoDate: i.isoDate,
      pubDate: i.pubDate,
      creator: (i.creator as string) || (i.author as string),
      content: (i as any)['content:encoded'] || i.content,
      contentSnippet: i.contentSnippet,
      enclosure: i.enclosure as any,
    }))
  } catch {
    return []
  }
}

export async function fetchFeed(url: string, opts: { timeoutMs?: number } = {}): Promise<FeedItem[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000)
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!resp.ok) throw new Error(`http_error:${resp.status}`)
    const xml = await resp.text()
    return parseFeedAsync(xml)
  } finally {
    clearTimeout(timer)
  }
}
