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
  // Find the first `{` then try each `}` from outermost inward until one parses.
  // Outermost first handles nested objects; falling inward handles trailing prose
  // that contains `}` characters (the old lastIndexOf approach was too greedy).
  const first = text.indexOf('{')
  if (first === -1) return null
  let pos = text.length
  while (true) {
    pos = text.lastIndexOf('}', pos - 1)
    if (pos === -1 || pos <= first) return null
    try {
      return JSON.parse(text.slice(first, pos + 1)) as T
    } catch { /* try next innermost } */ }
  }
}
