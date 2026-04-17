import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { withTestDb, getOrCreateTestSource } from '../fixtures/db.js'
import { insertArticlesDedup } from '../../src/ingest/dedup.js'

describe('insertArticlesDedup', () => {
  let sourceId: string

  beforeAll(async () => {
    sourceId = await getOrCreateTestSource()
  })

  beforeEach(async () => {
    await withTestDb(async db => {
      await db.execute(sql`DELETE FROM news.articles WHERE source_id = ${sourceId}`)
    })
  })

  it('inserts new articles, returns newCount', async () => {
    const n = await insertArticlesDedup(sourceId, [
      { url: 'https://example.com/a', title: 'A' },
      { url: 'https://example.com/b', title: 'B' },
    ])
    expect(n).toBe(2)
  })

  it('skips duplicates on canonical_url', async () => {
    await insertArticlesDedup(sourceId, [
      { url: 'https://example.com/a?utm_source=x', title: 'A' },
    ])
    const n = await insertArticlesDedup(sourceId, [
      { url: 'https://example.com/a', title: 'A' },
    ])
    expect(n).toBe(0)
  })

  it('drops items whose URL cannot be canonicalised', async () => {
    const n = await insertArticlesDedup(sourceId, [
      { url: 'javascript:alert(1)', title: 'bad' },
      { url: 'not a url', title: 'worse' },
      { url: 'https://example.com/good', title: 'good' },
    ])
    expect(n).toBe(1)
  })

  it('collapses same story arriving twice with different tracking', async () => {
    const n1 = await insertArticlesDedup(sourceId, [
      { url: 'https://example.com/story?utm_campaign=newsletter', title: 'Story' },
    ])
    const n2 = await insertArticlesDedup(sourceId, [
      { url: 'https://example.com/story?fbclid=abc', title: 'Story' },
    ])
    expect(n1).toBe(1)
    expect(n2).toBe(0)
  })
})
