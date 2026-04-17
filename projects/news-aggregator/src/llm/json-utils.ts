/**
 * Permissive JSON extractor. LLM outputs sometimes wrap JSON in markdown
 * fences, add a leading preamble, or trail with explanation even when the
 * prompt asks for "JSON only". We extract the first balanced `{…}` block
 * and attempt to parse it.
 *
 * Returns `null` on any parse failure — callers decide whether to fall
 * back to a default or treat it as a generation failure.
 */
export function safeParseJson<T = unknown>(text: string): T | null {
  if (!text) return null
  // Prefer code-fenced JSON if present (```json ... ``` or bare ``` ... ```).
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced) {
    try { return JSON.parse(fenced[1]) as T } catch { /* fall through */ }
  }
  // Otherwise take the first balanced-ish {…} via a lazy match on the first `{`
  // and the last `}`. This handles common "prose before JSON" noise.
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) return null
  try {
    return JSON.parse(text.slice(first, last + 1)) as T
  } catch {
    return null
  }
}
