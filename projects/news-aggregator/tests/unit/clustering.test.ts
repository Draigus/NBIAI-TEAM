import { describe, it, expect, vi, beforeEach } from 'vitest'

const callClaudeMock = vi.fn()
const loadActivePromptMock = vi.fn()
const dbExecuteMock = vi.fn()

vi.mock('../../src/llm/client.js', () => ({
  callClaude: (...args: unknown[]) => callClaudeMock(...args),
}))
vi.mock('../../src/llm/prompts.js', () => ({
  loadActivePrompt: (...args: unknown[]) => loadActivePromptMock(...args),
}))
vi.mock('../../src/db/index.js', () => ({
  db: { execute: (...args: unknown[]) => dbExecuteMock(...args) },
  schema: {},
}))

beforeEach(() => {
  vi.clearAllMocks()
  loadActivePromptMock.mockResolvedValue({ id: 'p1', key: 'clustering', version: 1, body: 'sys', fewShotExamples: null })
  dbExecuteMock.mockResolvedValue({ rows: [
    { id: 'a', source: 'GI.biz', title: 'A', summary: 's1' },
    { id: 'b', source: 'IGN', title: 'B', summary: 's2' },
  ] })
})

describe('clusterArticles', () => {
  it('returns [] for an empty article list without calling the LLM', async () => {
    const { clusterArticles } = await import('../../src/llm/clustering.js')
    const result = await clusterArticles([], 'digest-id')
    expect(result).toEqual([])
    expect(callClaudeMock).not.toHaveBeenCalled()
    expect(dbExecuteMock).not.toHaveBeenCalled()
  })

  it('parses the LLM JSON output into ClusterResult[]', async () => {
    callClaudeMock.mockResolvedValue({
      text: '{"clusters":[{"article_ids":["a","b"],"entities":{"studios":["Xbox"],"games":[],"people":[],"deals":[],"figures":[]}}]}',
      inputTokens: 100,
      outputTokens: 50,
      authMode: 'primary',
      failoverOccurred: false,
    })
    const { clusterArticles } = await import('../../src/llm/clustering.js')
    const result = await clusterArticles(['a', 'b'], 'digest-id')
    expect(result).toHaveLength(1)
    expect(result[0].article_ids).toEqual(['a', 'b'])
    expect(result[0].entities.studios).toEqual(['Xbox'])
    expect(callClaudeMock).toHaveBeenCalledWith(expect.objectContaining({
      runType: 'clustering',
      digestId: 'digest-id',
      systemPrompt: 'sys',
    }))
  })

  it('tolerates code-fenced JSON from the model', async () => {
    callClaudeMock.mockResolvedValue({
      text: 'Here you go:\n```json\n{"clusters":[{"article_ids":["a"],"entities":{"studios":[],"games":[],"people":[],"deals":[],"figures":[]}}]}\n```',
      inputTokens: 50,
      outputTokens: 30,
      authMode: 'primary',
      failoverOccurred: false,
    })
    const { clusterArticles } = await import('../../src/llm/clustering.js')
    const result = await clusterArticles(['a'], 'digest-id')
    expect(result).toHaveLength(1)
    expect(result[0].article_ids).toEqual(['a'])
  })

  it('returns [] when the model outputs malformed JSON', async () => {
    callClaudeMock.mockResolvedValue({
      text: 'Sorry, I cannot do that.',
      inputTokens: 10,
      outputTokens: 5,
      authMode: 'primary',
      failoverOccurred: false,
    })
    const { clusterArticles } = await import('../../src/llm/clustering.js')
    const result = await clusterArticles(['a'], 'digest-id')
    expect(result).toEqual([])
  })

  it('filters out malformed cluster entries', async () => {
    callClaudeMock.mockResolvedValue({
      text: '{"clusters":[{"article_ids":["a"]},{"not_a_cluster":true},{"article_ids":["b","c"]}]}',
      inputTokens: 10,
      outputTokens: 5,
      authMode: 'primary',
      failoverOccurred: false,
    })
    const { clusterArticles } = await import('../../src/llm/clustering.js')
    const result = await clusterArticles(['a', 'b', 'c'], 'digest-id')
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.article_ids.length)).toEqual([1, 2])
  })
})
