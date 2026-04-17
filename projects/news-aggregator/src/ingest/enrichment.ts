import * as cheerio from 'cheerio'

export interface ArticleMetadata {
  ogImage: string | null
  canonicalUrl: string
  author: string | null
  videoUrls: string[]
  publishedAt: Date | null
}

const USER_AGENT = 'NBI Hub News Aggregator (nbihub@nbi-consulting.com)'
const ENRICHMENT_TIMEOUT_MS = 10_000

interface VideoPattern {
  regex: RegExp
  normalise: (match: string) => string
}

const VIDEO_PATTERNS: VideoPattern[] = [
  // YouTube watch URL
  { regex: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([\w-]+)/gi, normalise: (m) => `https://www.youtube.com/watch?v=${extractId(m, /v=([\w-]+)/)}` },
  // YouTube embed URL
  { regex: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([\w-]+)/gi, normalise: (m) => `https://www.youtube.com/watch?v=${extractId(m, /embed\/([\w-]+)/)}` },
  // youtu.be short URL
  { regex: /(?:https?:\/\/)?youtu\.be\/([\w-]+)/gi, normalise: (m) => `https://www.youtube.com/watch?v=${extractId(m, /youtu\.be\/([\w-]+)/)}` },
  // Vimeo
  { regex: /(?:https?:\/\/)?(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/gi, normalise: (m) => `https://vimeo.com/${extractId(m, /(\d+)$/)}` },
  // Twitter status
  { regex: /(?:https?:\/\/)?(?:www\.)?twitter\.com\/\w+\/status\/\d+/gi, normalise: (m) => `https://${m.replace(/^https?:\/\//, '')}` },
  // X status
  { regex: /(?:https?:\/\/)?(?:www\.)?x\.com\/\w+\/status\/\d+/gi, normalise: (m) => `https://${m.replace(/^https?:\/\//, '')}` },
]

function extractId(match: string, re: RegExp): string {
  const m = match.match(re)
  return m ? m[1] : ''
}

function findVideosIn(haystack: string, sink: Set<string>): void {
  for (const { regex, normalise } of VIDEO_PATTERNS) {
    regex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = regex.exec(haystack)) !== null) {
      sink.add(normalise(match[0]))
    }
  }
}

export function extractMetadata(html: string, fallbackUrl: string): ArticleMetadata {
  try {
    const $ = cheerio.load(html)
    const ogImage =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      null
    const canonical = $('link[rel="canonical"]').attr('href') || fallbackUrl
    const author =
      $('meta[property="article:author"]').attr('content') ||
      $('meta[name="author"]').attr('content') ||
      null
    const publishedRaw =
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="date"]').attr('content')
    const parsed = publishedRaw ? new Date(publishedRaw) : null
    const publishedAt = parsed && !isNaN(parsed.getTime()) ? parsed : null

    const videoUrls = new Set<string>()
    $('iframe[src]').each((_, el) => {
      findVideosIn($(el).attr('src') || '', videoUrls)
    })
    $('a[href]').each((_, el) => {
      findVideosIn($(el).attr('href') || '', videoUrls)
    })

    return {
      ogImage,
      canonicalUrl: canonical,
      author,
      videoUrls: [...videoUrls],
      publishedAt,
    }
  } catch {
    return { ogImage: null, canonicalUrl: fallbackUrl, author: null, videoUrls: [], publishedAt: null }
  }
}

export async function fetchAndEnrich(articleUrl: string): Promise<ArticleMetadata> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ENRICHMENT_TIMEOUT_MS)
  try {
    const resp = await fetch(articleUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!resp.ok) throw new Error(`enrichment_http_${resp.status}`)
    const html = await resp.text()
    return extractMetadata(html, articleUrl)
  } finally {
    clearTimeout(timer)
  }
}
