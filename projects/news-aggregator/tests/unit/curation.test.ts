import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ClusterResult } from '../../src/llm/clustering.js'
import type { ArticleSourceInfo } from '../../src/llm/curation.js'

const callClaudeMock = vi.fn()
const loadActivePromptMock = vi.fn()

vi.mock('../../src/llm/client.js', () => ({
  callClaude: (...args: unknown[]) => callClaudeMock(...args),
}))
vi.mock('../../src/llm/prompts.js', () => ({
  loadActivePrompt: (...args: unknown[]) => loadActivePromptMock(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  loadActivePromptMock.mockResolvedValue({ id: 'p1', key: 'curation', version: 1, body: 'sys', fewShotExamples: null })
})

function emptyEntities() {
  return { studios: [], games: [], people: [], deals: [], figures: [] }
}

function makeClusters(n: number): ClusterResult[] {
  return Array.from({ length: n }, (_, i) => ({
    article_ids: [`article-${i}`],
    entities: emptyEntities(),
  }))
}

function mockLLM(selected: Array<{ cluster_index: number; category: string; rank: number }>, dynamicLabel: string | null = null) {
  callClaudeMock.mockResolvedValue({
    text: JSON.stringify({ selected, dynamic_category_label: dynamicLabel }),
    inputTokens: 100,
    outputTokens: 50,
    authMode: 'primary',
    failoverOccurred: false,
  })
}

describe('curateClusters', () => {
  const emptySources = new Map<string, ArticleSourceInfo>()

  it('returns empty on empty input without calling the LLM', async () => {
    const { curateClusters } = await import('../../src/llm/curation.js')
    const result = await curateClusters([], 'digest-id', emptySources)
    expect(result.selected).toEqual([])
    expect(result.dynamic_category_label).toBeNull()
    expect(callClaudeMock).not.toHaveBeenCalled()
  })

  it('parses the LLM output and returns selected + null dynamic when all canonical', async () => {
    mockLLM([
      { cluster_index: 0, category: 'studios', rank: 1 },
      { cluster_index: 1, category: 'games', rank: 1 },
      { cluster_index: 2, category: 'shifts', rank: 1 },
    ])
    const { curateClusters } = await import('../../src/llm/curation.js')
    const result = await curateClusters(makeClusters(3), 'digest-id', emptySources)
    expect(result.selected).toHaveLength(3)
    expect(result.dynamic_category_label).toBeNull()
  })

  it('returns null dynamic_category_label when below 4 non-canonical clusters', async () => {
    // 3 "mobile" — below the DYNAMIC_MIN_CLUSTERS threshold of 4
    mockLLM([
      { cluster_index: 0, category: 'studios', rank: 1 },
      { cluster_index: 1, category: 'mobile', rank: 1 },
      { cluster_index: 2, category: 'mobile', rank: 2 },
      { cluster_index: 3, category: 'mobile', rank: 3 },
    ], 'mobile')
    const { curateClusters } = await import('../../src/llm/curation.js')
    const result = await curateClusters(makeClusters(4), 'digest-id', emptySources)
    expect(result.dynamic_category_label).toBeNull()
  })

  it('sets dynamic_category_label when >= 4 non-canonical clusters share a label', async () => {
    mockLLM([
      { cluster_index: 0, category: 'studios', rank: 1 },
      { cluster_index: 1, category: 'mobile', rank: 1 },
      { cluster_index: 2, category: 'mobile', rank: 2 },
      { cluster_index: 3, category: 'mobile', rank: 3 },
      { cluster_index: 4, category: 'mobile', rank: 4 },
    ], 'mobile')
    const { curateClusters } = await import('../../src/llm/curation.js')
    const result = await curateClusters(makeClusters(5), 'digest-id', emptySources)
    expect(result.dynamic_category_label).toBe('mobile')
  })

  it('picks the highest-count label when multiple non-canonical labels exceed threshold', async () => {
    // "esports" has 5, "asia" has 4 → esports wins
    mockLLM([
      { cluster_index: 0, category: 'esports', rank: 1 },
      { cluster_index: 1, category: 'esports', rank: 2 },
      { cluster_index: 2, category: 'esports', rank: 3 },
      { cluster_index: 3, category: 'esports', rank: 4 },
      { cluster_index: 4, category: 'esports', rank: 5 },
      { cluster_index: 5, category: 'asia', rank: 1 },
      { cluster_index: 6, category: 'asia', rank: 2 },
      { cluster_index: 7, category: 'asia', rank: 3 },
      { cluster_index: 8, category: 'asia', rank: 4 },
    ])
    const { curateClusters } = await import('../../src/llm/curation.js')
    const result = await curateClusters(makeClusters(9), 'digest-id', emptySources)
    expect(result.dynamic_category_label).toBe('esports')
  })

  it('ignores LLM claim of dynamic_category_label if count does not meet threshold', async () => {
    // LLM claims "tools" but only assigns 2 stories to it.
    mockLLM([
      { cluster_index: 0, category: 'studios', rank: 1 },
      { cluster_index: 1, category: 'tools', rank: 1 },
      { cluster_index: 2, category: 'tools', rank: 2 },
    ], 'tools')
    const { curateClusters } = await import('../../src/llm/curation.js')
    const result = await curateClusters(makeClusters(3), 'digest-id', emptySources)
    expect(result.dynamic_category_label).toBeNull()
  })

  it('filters malformed selected entries out', async () => {
    callClaudeMock.mockResolvedValue({
      text: JSON.stringify({
        selected: [
          { cluster_index: 0, category: 'studios', rank: 1 },
          { cluster_index: 'bad' },
          { category: 'games' },
          { cluster_index: 1, category: 'games', rank: 2 },
        ],
        dynamic_category_label: null,
      }),
      inputTokens: 10,
      outputTokens: 5,
      authMode: 'primary',
      failoverOccurred: false,
    })
    const { curateClusters } = await import('../../src/llm/curation.js')
    const result = await curateClusters(makeClusters(2), 'digest-id', emptySources)
    expect(result.selected).toHaveLength(2)
  })

  it('passes article priority weights in the prompt payload', async () => {
    mockLLM([{ cluster_index: 0, category: 'studios', rank: 1 }])
    const sources = new Map<string, ArticleSourceInfo>([
      ['article-0', { priorityWeight: 2.5 }],
    ])
    const { curateClusters } = await import('../../src/llm/curation.js')
    await curateClusters(makeClusters(1), 'digest-id', sources)
    const call = callClaudeMock.mock.calls[0][0]
    expect(call.userMessage).toContain('"weight":2.5')
  })
})
