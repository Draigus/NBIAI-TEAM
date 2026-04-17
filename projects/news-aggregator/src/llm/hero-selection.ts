import { callClaude } from './client.js'
import { loadActivePrompt } from './prompts.js'
import { safeParseJson } from './json-utils.js'

export interface HeroCandidate {
  id: string
  headline: string
  summary: string
  category: string
}

interface HeroLLMResult {
  hero_story_id?: unknown
}

/**
 * Pick the single hero story for a digest. Returns the chosen story ID,
 * or null if the input list is empty. If the LLM picks an ID that isn't
 * in the candidate list (hallucination) we fall back to the first story —
 * that's typically the top-ranked story in its category anyway.
 */
export async function selectHeroStory(
  stories: HeroCandidate[],
  digestId: string,
): Promise<string | null> {
  if (stories.length === 0) return null

  const prompt = await loadActivePrompt('hero_selection')
  const result = await callClaude({
    runType: 'hero_selection',
    digestId,
    systemPrompt: prompt.body,
    userMessage: `Stories:\n${JSON.stringify(stories, null, 2)}`,
    maxTokens: 256,
  })

  const parsed = safeParseJson<HeroLLMResult>(result.text)
  const id = parsed?.hero_story_id
  if (typeof id === 'string' && stories.some((s) => s.id === id)) return id
  return stories[0].id
}
