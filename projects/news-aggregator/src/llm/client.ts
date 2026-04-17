import Anthropic from '@anthropic-ai/sdk'
import { sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { notifyAuthFailover, notifyGenerationFailed } from '../notifications/hub.js'

export type LlmAuthMode = 'primary' | 'failover'

let failoverLatched = false

const MODEL = 'claude-sonnet-4-6'

function makeClient(mode: LlmAuthMode): Anthropic {
  const apiKey = mode === 'failover'
    ? process.env.ANTHROPIC_API_KEY_FAILOVER
    : process.env.ANTHROPIC_API_KEY
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
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.systemPrompt,
    messages: [{ role: 'user', content: opts.userMessage }],
  })
  const textBlock = response.content.find((b) => b.type === 'text')
  const text = textBlock && 'text' in textBlock ? textBlock.text : ''
  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    authMode: mode,
    failoverOccurred: false,
  }
}

export async function callClaude(opts: CallOptions): Promise<CallResult> {
  const startMode: LlmAuthMode = failoverLatched ? 'failover' : 'primary'
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
    if (isAuthError(err) && !failoverLatched && process.env.ANTHROPIC_API_KEY_FAILOVER) {
      failoverLatched = true
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
    return { ok: true, mode: failoverLatched ? 'failover' : 'primary' }
  } catch (err) {
    return { ok: false, mode: failoverLatched ? 'failover' : 'primary', error: (err as Error).message }
  }
}

export function __resetFailoverForTests(): void {
  failoverLatched = false
}
