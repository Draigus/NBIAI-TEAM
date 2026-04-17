import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

export type PromptKey =
  | 'clustering'
  | 'curation'
  | 'summarisation'
  | 'hero_selection'
  | 'monthly_synthesis'

export interface ActivePrompt {
  id: string
  key: PromptKey
  version: number
  body: string
  fewShotExamples: unknown[] | null
}

/**
 * Load the currently active prompt for a given stage. Throws if none exists —
 * the caller should fail fast because generation cannot proceed without
 * a prompt body.
 */
export async function loadActivePrompt(key: PromptKey): Promise<ActivePrompt> {
  const rows = await db
    .select()
    .from(schema.prompts)
    .where(and(eq(schema.prompts.promptKey, key), eq(schema.prompts.isActive, true)))
    .limit(1)
  if (!rows[0]) throw new Error(`no active prompt for key: ${key}`)
  const r = rows[0]
  return {
    id: r.id,
    key,
    version: r.version,
    body: r.body,
    fewShotExamples: (r.fewShotExamples as unknown[] | null) ?? null,
  }
}

/**
 * Save a new prompt version. Deactivates all prior versions for the key,
 * inserts a new row with `version = max + 1` and `isActive = true`.
 *
 * Note: the deactivate-then-insert is not atomic across concurrent callers.
 * Safe for the single-user admin UI we are building; if we ever add
 * multi-editor concurrency, wrap in a transaction with row-level locking.
 */
export async function savePromptVersion(
  key: PromptKey,
  body: string,
  fewShotExamples: unknown[] | null,
  createdBy: string | null,
): Promise<ActivePrompt> {
  const latest = await db
    .select()
    .from(schema.prompts)
    .where(eq(schema.prompts.promptKey, key))
    .orderBy(desc(schema.prompts.version))
    .limit(1)
  const nextVersion = (latest[0]?.version ?? 0) + 1

  await db
    .update(schema.prompts)
    .set({ isActive: false })
    .where(eq(schema.prompts.promptKey, key))

  const inserted = await db
    .insert(schema.prompts)
    .values({
      promptKey: key,
      version: nextVersion,
      body,
      fewShotExamples: fewShotExamples as unknown as object,
      isActive: true,
      createdBy,
    })
    .returning()

  return {
    id: inserted[0].id,
    key,
    version: nextVersion,
    body,
    fewShotExamples,
  }
}

/**
 * List every version for a key, newest first. Used by the admin UI's
 * version-history panel.
 */
export async function listPromptVersions(key: PromptKey): Promise<ActivePrompt[]> {
  const rows = await db
    .select()
    .from(schema.prompts)
    .where(eq(schema.prompts.promptKey, key))
    .orderBy(desc(schema.prompts.version))
  return rows.map((r) => ({
    id: r.id,
    key,
    version: r.version,
    body: r.body,
    fewShotExamples: (r.fewShotExamples as unknown[] | null) ?? null,
  }))
}
