import { query } from '@anthropic-ai/claude-agent-sdk'
import { sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { notifyAuthFailover, notifyGenerationFailed } from '../notifications/hub.js'

export type LlmAuthMode = 'max_pro' | 'api_key'

let failoverLatched = false

function isAuthError(err: unknown): boolean {
  const msg = String((err as { message?: unknown })?.message ?? err)
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

interface AssistantUsage {
  input_tokens?: number
  output_tokens?: number
}

interface AssistantMessage {
  type: 'assistant'
  message?: {
    content?: Array<{ type: string; text?: string }>
    usage?: AssistantUsage
  }
}

interface ResultMessage {
  type: 'result'
  subtype?: string
  is_error?: boolean
  result?: string
  usage?: AssistantUsage
}

type SdkMessage = AssistantMessage | ResultMessage | { type: string; [k: string]: unknown }

async function runSdkQuery(systemPrompt: string, userMessage: string, maxTokens: number): Promise<CallResult> {
  const messages: SdkMessage[] = []
  for await (const m of query({
    prompt: userMessage,
    options: {
      systemPrompt,
      model: 'claude-sonnet-4-6',
      maxTurns: 1,
      settingSources: [],
      allowedTools: [],
    } as Parameters<typeof query>[0]['options'] & { maxTokens?: number; settingSources?: unknown[] },
  })) {
    messages.push(m as SdkMessage)
  }

  const resultMsg = messages.find((m): m is ResultMessage => m.type === 'result') as ResultMessage | undefined
  if (resultMsg?.is_error) {
    throw new Error(`SDK result error: subtype=${resultMsg.subtype ?? 'unknown'}`)
  }

  let text = ''
  if (resultMsg?.result) {
    text = resultMsg.result
  } else {
    const assistant = [...messages].reverse().find((m): m is AssistantMessage => m.type === 'assistant') as AssistantMessage | undefined
    const textBlock = assistant?.message?.content?.find((b) => b.type === 'text')
    text = textBlock?.text ?? ''
  }

  const usage = resultMsg?.usage ?? [...messages].reverse().find((m): m is AssistantMessage => m.type === 'assistant')?.message?.usage ?? {}
  void maxTokens

  return {
    text,
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    authMode: failoverLatched ? 'api_key' : 'max_pro',
    failoverOccurred: false,
  }
}

export async function callClaude(opts: CallOptions): Promise<CallResult> {
  const runInsert = await db.insert(schema.generationRuns).values({
    runType: opts.runType,
    digestId: opts.digestId ?? null,
    monthlySummaryId: opts.monthlySummaryId ?? null,
    startedAt: new Date(),
    status: 'running',
    llmAuthMode: failoverLatched ? 'api_key' : 'max_pro',
  }).returning({ id: schema.generationRuns.id })
  const runId = runInsert[0].id

  try {
    const result = await runSdkQuery(opts.systemPrompt, opts.userMessage, opts.maxTokens ?? 4096)
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
      process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY_FAILOVER
      failoverLatched = true
      await notifyAuthFailover(opts.runType)
      try {
        const result = await runSdkQuery(opts.systemPrompt, opts.userMessage, opts.maxTokens ?? 4096)
        await db.update(schema.generationRuns).set({
          endedAt: new Date(),
          status: 'completed',
          inputTokenCount: result.inputTokens,
          outputTokenCount: result.outputTokens,
          llmAuthMode: 'api_key',
          failoverOccurred: true,
        }).where(sql`id = ${runId}`)
        return { ...result, authMode: 'api_key', failoverOccurred: true }
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
    return { ok: true, mode: failoverLatched ? 'api_key' : 'max_pro' }
  } catch (err) {
    return { ok: false, mode: failoverLatched ? 'api_key' : 'max_pro', error: (err as Error).message }
  }
}

export function __resetFailoverForTests(): void {
  failoverLatched = false
}
