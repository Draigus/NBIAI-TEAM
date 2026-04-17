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

  it('inserts new articles, returns newCount and newIds', async () => {
    const r = await insertArticlesDedup(sourceId, [
      { url: 'https://example.com/a', title: 'A' },
      { url: 'https://example.com/b', title: 'B' },
    ])
    expect(r.newCount).toBe(2)
    expect(r.newIds).toHaveLength(2)
    for (const id of r.newIds) expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('skips duplicates on canonical_url', async () => {
    await insertArticlesDedup(sourceId, [
      { url: 'https://example.com/a?utm_source=x', title: 'A' },
    ])
    const r = await insertArticlesDedup(sourceId, [
      { url: 'https://example.com/a', title: 'A' },
    ])
    expect(r.newCount).toBe(0)
    expect(r.newIds).toEqual([])
  })

  it('drops items whose URL cannot be canonicalised', async () => {
    const r = await insertArticlesDedup(sourceId, [
      { url: 'javascript:alert(1)', title: 'bad' },
      { url: 'not a url', title: 'worse' },
      { url: 'https://example.com/good', title: 'good' },
    ])
    expect(r.newCount).toBe(1)
  })

  it('collapses same story arriving twice with different tracking', async () => {
    const r1 = await insertArticlesDedup(sourceId, [
      { url: 'https://example.com/story?utm_campaign=newsletter', title: 'Story' },
    ])
    const r2 = await insertArticlesDedup(sourceId, [
      { url: 'https://example.com/story?fbclid=abc', title: 'Story' },
    ])
    expect(r1.newCount).toBe(1)
    expect(r2.newCount).toBe(0)
  })
})
