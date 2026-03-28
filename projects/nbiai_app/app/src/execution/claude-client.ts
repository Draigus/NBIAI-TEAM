/**
 * Claude API client wrapper.
 *
 * Wraps the Anthropic SDK's messages.create() call with:
 * - Model tier mapping (opus / sonnet / haiku → canonical model identifiers)
 * - System + user message assembly from AgentContext
 * - Cost calculation using per-token pricing constants
 * - Structured error handling with typed error messages
 *
 * Non-streaming. Streaming is a Phase 5 enhancement (live output via WebSocket).
 */

import Anthropic from '@anthropic-ai/sdk'
import type { AgentContext } from './context-loader.js'

// ---------------------------------------------------------------------------
// Model constants
// ---------------------------------------------------------------------------

/**
 * Canonical model identifiers per tier.
 * Update here when Anthropic releases new model versions — nowhere else.
 */
export const MODEL_IDS = {
  opus: 'claude-opus-4-5-20251101',
  sonnet: 'claude-sonnet-4-5',
  haiku: 'claude-haiku-4-5-20251001',
} as const

/**
 * Per-million-token pricing in USD.
 * Source: Anthropic pricing page. Update alongside MODEL_IDS when pricing changes.
 */
const PRICING: Record<string, { inputPerMillion: number; outputPerMillion: number }> = {
  [MODEL_IDS.opus]: { inputPerMillion: 15.0, outputPerMillion: 75.0 },
  [MODEL_IDS.sonnet]: { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  [MODEL_IDS.haiku]: { inputPerMillion: 0.25, outputPerMillion: 1.25 },
}

/**
 * Default max output tokens per tier.
 * Haiku is capped lower — it is used for routine/lightweight tasks.
 */
const DEFAULT_MAX_TOKENS: Record<keyof typeof MODEL_IDS, number> = {
  opus: 8192,
  sonnet: 8192,
  haiku: 4096,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExecutionInput {
  agentId: string
  taskId: string | null
  context: AgentContext
  modelTier: 'opus' | 'sonnet' | 'haiku'
  maxTokens?: number
}

export interface ExecutionOutput {
  /** The full text response from the model. */
  content: string
  /** Number of tokens consumed by the input (system + user messages). */
  inputTokens: number
  /** Number of tokens in the model's response. */
  outputTokens: number
  /** Calculated USD cost for this execution. */
  costUsd: number
  /** Why the model stopped generating (e.g. 'end_turn', 'max_tokens'). */
  stopReason: string
}

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (_client === null) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('[claude-client] ANTHROPIC_API_KEY is not set in environment variables.')
    }
    _client = new Anthropic({ apiKey })
  }
  return _client
}

// ---------------------------------------------------------------------------
// Cost calculation
// ---------------------------------------------------------------------------

function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = PRICING[modelId]
  if (!pricing) {
    console.warn(`[claude-client] No pricing config for model: ${modelId}. Cost recorded as 0.`)
    return 0
  }
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion
  return inputCost + outputCost
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Run an agent against the Claude API with the assembled context.
 *
 * The system prompt receives the role persona and agent identity.
 * The user message receives Tier 1 + Tier 2 + Tier 3 knowledge and task context.
 * This follows the context assembly spec in the technical architecture (Section 3.3).
 *
 * @throws Error on API failure with a descriptive message including the error type.
 */
export async function runAgent(input: ExecutionInput): Promise<ExecutionOutput> {
  const { context, modelTier, maxTokens } = input

  const modelId = MODEL_IDS[modelTier]
  const resolvedMaxTokens = maxTokens ?? DEFAULT_MAX_TOKENS[modelTier]

  // Assemble system prompt: role identity + persona
  const systemPrompt = context.systemPrompt

  // Assemble user message: all knowledge tiers + task context
  const userMessage = [
    '## Company Knowledge',
    '',
    context.tier1Knowledge || '_(No Tier 1 knowledge loaded)_',
    '',
    '## Role Knowledge',
    '',
    context.tier2Knowledge || '_(No Tier 2 knowledge loaded)_',
    '',
    '## Project Knowledge',
    '',
    context.tier3Knowledge || '_(No Tier 3 knowledge loaded)_',
    '',
    context.taskContext,
  ].join('\n')

  const client = getClient()

  try {
    const response = await client.messages.create({
      model: modelId,
      max_tokens: resolvedMaxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    // Extract text content from the response blocks
    const textBlocks = response.content.filter((block) => block.type === 'text')
    const content = textBlocks.map((block) => (block as { type: 'text'; text: string }).text).join('\n')

    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const costUsd = calculateCost(modelId, inputTokens, outputTokens)
    const stopReason = response.stop_reason ?? 'unknown'

    return {
      content,
      inputTokens,
      outputTokens,
      costUsd,
      stopReason,
    }
  } catch (err) {
    // Wrap Anthropic SDK errors with context about the failure type
    if (err instanceof Anthropic.APIError) {
      const detail = `[claude-client] Anthropic API error: status=${err.status}, type=${err.error?.type ?? 'unknown'}, message=${err.message}`
      throw new Error(detail)
    }

    if (err instanceof Anthropic.APIConnectionError) {
      throw new Error(`[claude-client] Connection error: ${(err as Error).message}`)
    }

    if (err instanceof Anthropic.RateLimitError) {
      throw new Error(`[claude-client] Rate limit exceeded: ${(err as Error).message}`)
    }

    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error(`[claude-client] Authentication failed — check ANTHROPIC_API_KEY: ${(err as Error).message}`)
    }

    // Unknown error type — re-throw as-is
    throw err
  }
}
