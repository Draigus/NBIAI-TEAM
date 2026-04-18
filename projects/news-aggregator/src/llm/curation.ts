import { callClaude } from './client.js'
import { loadActivePrompt } from './prompts.js'
import { safeParseJson } from './json-utils.js'
import type { ClusterResult } from './clustering.js'

export type CanonicalCategory = 'studios' | 'games' | 'shifts' | 'strategy'

export interface CurationAssignment {
  cluster_index: number
  category: CanonicalCategory | string
  rank: number
}

export interface CurationResult {
  selected: CurationAssignment[]
  dynamic_category_label: string | null
}

interface CurationLLMResult {
  selected?: unknown
  dynamic_category_label?: unknown
}

export interface ArticleSourceInfo {
  priorityWeight: number
}

const CANONICAL: ReadonlySet<string> = new Set(['studios', 'games', 'shifts', 'strategy'])

/**
 * Minimum number of selected clusters under a non-canonical label before we
 * honour it as a dynamic 5th category. Enforced client-side even if the LLM
 * claims a label — we re-count on its own `selected[]` output, because the
 * LLM sometimes proposes a label it hasn't actually grouped enough stories
 * under.
 */
export const DYNAMIC_MIN_CLUSTERS = 4

/**
 * Curate story clusters into the weekly digest. Picks ~25-30 significant
 * clusters, assigns each to one of four canonical categories, and
 * optionally a dynamic 5th. The `articleSources` map keys are article IDs
 * (not source IDs) so we can weight clusters by the aggregate priority
 * of their articles' sources.
 */
export async function curateClusters(
  clusters: ClusterResult[],
  digestId: string,
  articleSources: Map<string, ArticleSourceInfo>,
): Promise<CurationResult> {
  if (clusters.length === 0) return { selected: [], dynamic_category_label: null }

  const enriched = clusters.map((c, idx) => ({
    cluster_index: idx,
    article_count: c.article_ids.length,
    entities: c.entities,
    weight: c.article_ids.reduce(
      (sum, aid) => sum + (articleSources.get(aid)?.priorityWeight ?? 1),
      0,
    ),
  }))

  const prompt = await loadActivePrompt('curation')
  const result = await callClaude({
    runType: 'curation',
    digestId,
    systemPrompt: prompt.body,
    userMessage: `Clusters:\n${JSON.stringify(enriched)}`,
    maxTokens: 8192,
  })

  const parsed = safeParseJson<CurationLLMResult>(result.text)
  if (!parsed || !Array.isArray(parsed.selected)) {
    return { selected: [], dynamic_category_label: null }
  }

  const selected = (parsed.selected as unknown[]).filter(isCurationAssignment)

  // Recompute the dynamic-category label from the selected[] categories.
  // We do NOT trust parsed.dynamic_category_label directly — the LLM
  // sometimes claims a label without grouping enough stories under it.
  const countsByLabel = new Map<string, number>()
  for (const s of selected) {
    if (!CANONICAL.has(s.category)) {
      countsByLabel.set(s.category, (countsByLabel.get(s.category) ?? 0) + 1)
    }
  }

  // Pick the highest-count non-canonical label meeting the threshold.
  let dynamicLabel: string | null = null
  let bestCount = 0
  for (const [label, count] of countsByLabel) {
    if (count >= DYNAMIC_MIN_CLUSTERS && count > bestCount) {
      bestCount = count
      dynamicLabel = label
    }
  }

  return { selected, dynamic_category_label: dynamicLabel }
}

function isCurationAssignment(x: unknown): x is CurationAssignment {
  if (!x || typeof x !== 'object') return false
  const a = x as Partial<CurationAssignment>
  return (
    typeof a.cluster_index === 'number' &&
    typeof a.category === 'string' &&
    typeof a.rank === 'number'
  )
}
