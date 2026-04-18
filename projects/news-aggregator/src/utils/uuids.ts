/**
 * UUID helpers shared by the SQL call-sites that build Postgres `uuid[]`
 * array literals from upstream ID lists (clustering, curation,
 * summarisation, weekly pipeline).
 *
 * The LLM clustering stage returns article IDs inside a JSON object.
 * Before today those IDs went straight into `{id,id,id}` text that
 * Postgres cast to uuid[]. A hostile or hallucinated ID containing a
 * comma, brace, or non-hex character aborted the query (best case) or
 * — if `::uuid[]` is ever removed — became injection (audit finding
 * N-C2). Callers now validate before joining.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True if `s` is a canonical 36-char hyphenated UUID. */
export function isUuid(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s)
}

/**
 * Filter `ids` down to valid UUIDs. Silently drops non-UUID entries and
 * logs a warning when anything is dropped so unexpected LLM output is
 * visible in the aggregator's pino stream.
 */
export function filterUuids(ids: unknown[], context?: string): string[] {
  const valid: string[] = []
  const dropped: unknown[] = []
  for (const id of ids) {
    if (isUuid(id)) valid.push(id)
    else dropped.push(id)
  }
  if (dropped.length > 0) {
    console.warn(
      `[uuids] dropped ${dropped.length} non-UUID id(s) in ${context ?? 'unknown'}: ` +
        JSON.stringify(dropped.slice(0, 5)) +
        (dropped.length > 5 ? ` (+${dropped.length - 5} more)` : ''),
    )
  }
  return valid
}
