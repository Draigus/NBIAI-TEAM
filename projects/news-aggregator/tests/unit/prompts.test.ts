import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import pg from 'pg'
import { loadActivePrompt, savePromptVersion, listPromptVersions } from '../../src/llm/prompts.js'

async function cleanupPrompts() {
  const pool = new pg.Pool({ connectionString: process.env.NEWS_DB_URL })
  try {
    await pool.query(`DELETE FROM news.prompts WHERE prompt_key LIKE 'test_%'`)
  } finally {
    await pool.end()
  }
}

beforeEach(cleanupPrompts)
afterEach(cleanupPrompts)

describe('loadActivePrompt', () => {
  it('throws when no prompt exists for the key', async () => {
    // Use a bespoke key that the seed job never creates.
    await expect(loadActivePrompt('test_missing' as unknown as 'clustering')).rejects.toThrow(/no active prompt/i)
  })

  it('returns the active row when one exists', async () => {
    const pool = new pg.Pool({ connectionString: process.env.NEWS_DB_URL })
    try {
      await pool.query(
        `INSERT INTO news.prompts (prompt_key, version, body, is_active, created_by)
         VALUES ('test_load', 1, 'hello world', true, NULL)`,
      )
      // Casting via unknown because PromptKey is a closed union — the test uses
      // an out-of-union value to avoid colliding with real seeds.
      const p = await loadActivePrompt('test_load' as unknown as 'clustering')
      expect(p.body).toBe('hello world')
      expect(p.version).toBe(1)
    } finally {
      await pool.end()
    }
  })
})

describe('savePromptVersion', () => {
  it('creates v1 on the first save', async () => {
    const p = await savePromptVersion('test_save' as unknown as 'clustering', 'body v1', null, null)
    expect(p.version).toBe(1)
    expect(p.body).toBe('body v1')

    // Confirm DB state: one row, active.
    const pool = new pg.Pool({ connectionString: process.env.NEWS_DB_URL })
    try {
      const { rows } = await pool.query<{ version: number; is_active: boolean }>(
        `SELECT version, is_active FROM news.prompts WHERE prompt_key = 'test_save' ORDER BY version`,
      )
      expect(rows).toHaveLength(1)
      expect(rows[0].version).toBe(1)
      expect(rows[0].is_active).toBe(true)
    } finally {
      await pool.end()
    }
  })

  it('increments version and deactivates prior versions', async () => {
    await savePromptVersion('test_save' as unknown as 'clustering', 'body v1', null, null)
    const v2 = await savePromptVersion('test_save' as unknown as 'clustering', 'body v2', null, null)
    expect(v2.version).toBe(2)

    const pool = new pg.Pool({ connectionString: process.env.NEWS_DB_URL })
    try {
      const { rows } = await pool.query<{ version: number; is_active: boolean; body: string }>(
        `SELECT version, is_active, body FROM news.prompts WHERE prompt_key = 'test_save' ORDER BY version`,
      )
      expect(rows).toHaveLength(2)
      expect(rows[0].version).toBe(1)
      expect(rows[0].is_active).toBe(false)
      expect(rows[1].version).toBe(2)
      expect(rows[1].is_active).toBe(true)
      expect(rows[1].body).toBe('body v2')
    } finally {
      await pool.end()
    }

    const active = await loadActivePrompt('test_save' as unknown as 'clustering')
    expect(active.version).toBe(2)
    expect(active.body).toBe('body v2')
  })

  it('preserves fewShotExamples as JSON', async () => {
    const examples = [
      { input: 'foo', output: 'bar' },
      { input: 'baz', output: 'qux' },
    ]
    const p = await savePromptVersion('test_save' as unknown as 'clustering', 'body', examples, null)
    expect(p.fewShotExamples).toEqual(examples)

    const loaded = await loadActivePrompt('test_save' as unknown as 'clustering')
    expect(loaded.fewShotExamples).toEqual(examples)
  })
})

describe('listPromptVersions', () => {
  it('returns every version newest-first', async () => {
    await savePromptVersion('test_list' as unknown as 'clustering', 'v1 body', null, null)
    await savePromptVersion('test_list' as unknown as 'clustering', 'v2 body', null, null)
    await savePromptVersion('test_list' as unknown as 'clustering', 'v3 body', null, null)

    const versions = await listPromptVersions('test_list' as unknown as 'clustering')
    expect(versions.map((v) => v.version)).toEqual([3, 2, 1])
    expect(versions[0].body).toBe('v3 body')
  })
})
