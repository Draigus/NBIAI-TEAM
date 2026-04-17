import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { parseFeedAsync, fetchFeed } from '../../src/ingest/fetcher.js'

describe('parseFeedAsync', () => {
  it('extracts items from RSS 2.0', async () => {
    const xml = await readFile('tests/fixtures/rss/sample-gi-biz.xml', 'utf8')
    const items = await parseFeedAsync(xml)
    expect(items.length).toBe(3)
    for (const i of items) {
      expect(i.title).toBeTruthy()
      expect(i.link).toMatch(/^https?:/)
    }
    expect(items[0].title).toBe('Embracer splits into three companies')
    expect(items[0].creator).toBe('Jane Doe')
    expect(items[0].enclosure?.url).toBe('https://www.gamesindustry.biz/images/embracer-hero.jpg')
    expect(items[0].content).toContain('Asmodee')
  })

  it('extracts items from ATOM', async () => {
    const xml = await readFile('tests/fixtures/rss/sample-atom.xml', 'utf8')
    const items = await parseFeedAsync(xml)
    expect(items.length).toBe(2)
    expect(items[0].title).toBe('Atom test article one')
    expect(items[0].link).toBe('https://example.com/atom-1')
  })

  it('returns empty array on malformed XML', async () => {
    const items = await parseFeedAsync('<not xml>')
    expect(items).toEqual([])
  })
})

describe('fetchFeed', () => {
  it('times out when the host is unreachable', async () => {
    await expect(fetchFeed('https://10.255.255.1/', { timeoutMs: 200 }))
      .rejects.toThrow()
  }, 5000)
})
