import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { extractMetadata } from '../../src/ingest/enrichment.js'

describe('extractMetadata', () => {
  it('extracts OG image, canonical, author, videos, publishedAt', async () => {
    const html = await readFile('tests/fixtures/html/sample-article.html', 'utf8')
    const meta = extractMetadata(html, 'https://example.com/original')
    expect(meta.ogImage).toBe('https://cdn.example.com/hero-image.jpg')
    expect(meta.canonicalUrl).toBe('https://example.com/articles/sample-games-industry-article')
    expect(meta.author).toBe('Alexis Ofori')
    expect(meta.publishedAt).not.toBeNull()
    expect(meta.publishedAt?.toISOString()).toBe('2026-04-14T10:00:00.000Z')
  })

  it('extracts YouTube, Vimeo, and X/Twitter video URLs', async () => {
    const html = await readFile('tests/fixtures/html/sample-article.html', 'utf8')
    const meta = extractMetadata(html, 'https://example.com/original')
    const urls = meta.videoUrls
    expect(urls.some(u => /youtube\.com|youtu\.be/.test(u))).toBe(true)
    expect(urls.some(u => /vimeo\.com\/\d+/.test(u))).toBe(true)
    expect(urls.some(u => /twitter\.com\/\w+\/status\/\d+/.test(u))).toBe(true)
    expect(urls.some(u => /x\.com\/\w+\/status\/\d+/.test(u))).toBe(true)
  })

  it('falls back to twitter:image when og:image is missing', () => {
    const html = '<html><head><meta name="twitter:image" content="https://cdn.example.com/fallback.jpg"></head><body></body></html>'
    const meta = extractMetadata(html, 'https://example.com/x')
    expect(meta.ogImage).toBe('https://cdn.example.com/fallback.jpg')
  })

  it('uses fallbackUrl when no canonical link is present', () => {
    const meta = extractMetadata('<html><head></head><body></body></html>', 'https://example.com/fallback')
    expect(meta.canonicalUrl).toBe('https://example.com/fallback')
  })

  it('returns safe empty metadata for garbage input', () => {
    const meta = extractMetadata('<not html>', 'https://example.com')
    expect(meta.ogImage).toBeNull()
    expect(meta.videoUrls).toEqual([])
    expect(meta.canonicalUrl).toBe('https://example.com')
  })

  it('deduplicates identical video URLs', () => {
    const html = `
      <html><body>
        <iframe src="https://www.youtube.com/embed/abc123"></iframe>
        <a href="https://www.youtube.com/watch?v=abc123">link</a>
      </body></html>`
    const meta = extractMetadata(html, 'https://example.com')
    expect(meta.videoUrls.length).toBe(1)
    expect(meta.videoUrls[0]).toContain('abc123')
  })
})
