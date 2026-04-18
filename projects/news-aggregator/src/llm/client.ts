import Anthropic from '@anthropic-ai/sdk'
import { sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { notifyAuthFailover, notifyGenerationFailed } from '../notifications/hub.js'
import { loadConfig } from '../config.js'

export type LlmAuthMode = 'primary' | 'failover'

// Failover latch with auto-reset. A transient 401 used to park the
// service on the secondary key for the entire PM2 process lifetime
// (audit finding N-C5). Now the latch expires after
// FAILOVER_COOLDOWN_MS and we try the primary again on the next call.
const FAILOVER_COOLDOWN_MS = 6 * 60 * 60 * 1000 // 6 hours
let failoverLatchedUntil = 0
function isFailoverLatched(): boolean {
  return Date.now() < failoverLatchedUntil
}
function latchFailover(): void {
  failoverLatchedUntil = Date.now() + FAILOVER_COOLDOWN_MS
}

// Per-stage timeouts. Without these a wedged Anthropic stream would hang
// forever, leaving the generation_runs row stuck on 'running' and
// blocking the next cron tick (audit finding N-C4). Clustering at
// max_tokens=32768 is the longest legitimate stage; everything else
// finishes well inside 90 s.
const DEFAULT_TIMEOUT_MS = 90_000
const CLUSTERING_TIMEOUT_MS = 12 * 60 * 1000 // 12 minutes
const MONTHLY_SYNTHESIS_TIMEOUT_MS = 6 * 60 * 1000

function timeoutForRunType(runType: CallOptions['runType']): number {
  if (runType === 'clustering') return CLUSTERING_TIMEOUT_MS
  if (runType === 'monthly_synthesis') return MONTHLY_SYNTHESIS_TIMEOUT_MS
  return DEFAULT_TIMEOUT_MS
}

const MODEL = 'claude-sonnet-4-6'

function makeClient(mode: LlmAuthMode): Anthropic {
  const cfg = loadConfig()
  const apiKey = mode === 'failover' ? cfg.ANTHROPIC_API_KEY_FAILOVER : cfg.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error(`No API key available for mode=${mode}`)
  return new Anthropic({ apiKey })
}

function isAuthError(err: unknown): boolean {
  if (err instanceof Anthropic.AuthenticationError) return true
  if (err instanceof Anthropic.PermissionDeniedError) return true
  const e = err as { status?: number; message?: unknown }
  if (e?.status === 401 || e?.status === 403) return true
  const msg = String(e?.message ?? err)
  return /\b(401|403)\b|unauthori[sz]ed|authentication|invalid[_ -]?api[_ -]?key/i.test(msg)
}

export interface CallOptions {
  runType: 'clustering' | 'curation' | 'summarisation' | 'hero_selection' | 'monthly_synthesis' | 'merge_split'
  digestId?: string
  monthlySummaryId?: string
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  period?: string
}

export interface CallResult {
  text: string
  inputTokens: number
  outputTokens: number
  authMode: LlmAuthMode
  failoverOccurred: boolean
}

async function runApiCall(mode: LlmAuthMode, opts: CallOptions): Promise<CallResult> {
  const client = makeClient(mode)
  // Streaming is required for large max_tokens (clustering on a backfill
  // window can run longer than the 10-minute non-stream timeout). We use
  // streaming unconditionally so there's one code path and we never hit
  // the SDK's non-streaming guard.
  //
  // An AbortController enforces a hard per-stage ceiling; without it a
  // wedged stream hangs until the process dies and leaves every
  // generation_runs row with status='running', blocking subsequent
  // hourly crons (audit finding N-C4).
  const abort = new AbortController()
  const timeoutMs = timeoutForRunType(opts.runType)
  const timer = setTimeout(() => abort.abort(new Error(`llm timeout after ${timeoutMs}ms (${opts.runType})`)), timeoutMs)
  let response
  try {
    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: opts.maxTokens ?? 4096,
        system: opts.systemPrompt,
        messages: [{ role: 'user', content: opts.userMessage }],
      },
      { signal: abort.signal },
    )
    response = await stream.finalMessage()
  } finally {
    clearTimeout(timer)
  }

  const textBlock = response.content.find((b) => b.type === 'text')
  const text = textBlock && 'text' in textBlock ? textBlock.text : ''
  // Loud warning on max_tokens — truncation produces invalid JSON that
  // silently returns empty downstream. Better to surface it in the logs
  // than chase empty digests.
  if (response.stop_reason === 'max_tokens') {
    console.warn(
      `[llm] WARNING: ${opts.runType} hit max_tokens (${opts.maxTokens ?? 4096}) — output truncated; downstream parse will likely fail`,
    )
  }
  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    authMode: mode,
    failoverOccurred: false,
  }
}

export async function callClaude(opts: CallOptions): Promise<CallResult> {
  const startMode: LlmAuthMode = isFailoverLatched() ? 'failover' : 'primary'
  const runInsert = await db.insert(schema.generationRuns).values({
    runType: opts.runType,
    digestId: opts.digestId ?? null,
    monthlySummaryId: opts.monthlySummaryId ?? null,
    startedAt: new Date(),
    status: 'running',
    llmAuthMode: startMode,
  }).returning({ id: schema.generationRuns.id })
  const runId = runInsert[0].id

  try {
    const result = await runApiCall(startMode, opts)
    await db.update(schema.generationRuns).set({
      endedAt: new Date(),
      status: 'completed',
      inputTokenCount: result.inputTokens,
      outputTokenCount: result.outputTokens,
      llmAuthMode: result.authMode,
    }).where(sql`id = ${runId}`)
    return result
  } catch (err) {
    if (isAuthError(err) && !isFailoverLatched() && loadConfig().ANTHROPIC_API_KEY_FAILOVER) {
      latchFailover()
      await notifyAuthFailover(opts.runType)
      try {
        const result = await runApiCall('failover', opts)
        await db.update(schema.generationRuns).set({
          endedAt: new Date(),
          status: 'completed',
          inputTokenCount: result.inputTokens,
          outputTokenCount: result.outputTokens,
          llmAuthMode: 'failover',
          failoverOccurred: true,
        }).where(sql`id = ${runId}`)
        return { ...result, authMode: 'failover', failoverOccurred: true }
      } catch (err2) {
        await db.update(schema.generationRuns).set({
          endedAt: new Date(),
          status: 'failed',
          errorMessage: String((err2 as { message?: unknown })?.message ?? err2).slice(0, 500),
          failoverOccurred: true,
        }).where(sql`id = ${runId}`)
        if (opts.period) await notifyGenerationFailed(opts.runType, opts.period)
        throw err2
      }
    }
    await db.update(schema.generationRuns).set({
      endedAt: new Date(),
      status: 'failed',
      errorMessage: String((err as { message?: unknown })?.message ?? err).slice(0, 500),
    }).where(sql`id = ${runId}`)
    if (opts.period) await notifyGenerationFailed(opts.runType, opts.period)
    throw err
  }
}

export async function healthcheckAuth(): Promise<{ ok: boolean; mode: LlmAuthMode; error?: string }> {
  try {
    await callClaude({
      runType: 'clustering',
      systemPrompt: 'Reply with a single word: ok',
      userMessage: 'ok',
      maxTokens: 5,
    })
    return { ok: true, mode: isFailoverLatched() ? 'failover' : 'primary' }
  } catch (err) {
    return { ok: false, mode: isFailoverLatched() ? 'failover' : 'primary', error: (err as Error).message }
  }
}

export function __resetFailoverForTests(): void {
  failoverLatchedUntil = 0
}
