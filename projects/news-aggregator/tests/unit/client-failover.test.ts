import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import pg from 'pg'

// Mock the Anthropic SDK before the client imports it.
// The SDK default export is the Anthropic class; also exposes error classes
// as static properties (AuthenticationError, PermissionDeniedError, etc).
type Mode = 'fail-then-succeed' | 'succeed' | 'fail-always'
let apiCalls = 0
let sdkMode: Mode = 'fail-then-succeed'
const primaryKeyAtConstruct: Array<string | undefined> = []
const failoverKeyAtConstruct: Array<string | undefined> = []
const constructedKeys: Array<string | undefined> = []

class AuthenticationError extends Error {
  status = 401
  constructor(msg = '401 Unauthorized') { super(msg) }
}
class PermissionDeniedError extends Error {
  status = 403
  constructor(msg = '403 Forbidden') { super(msg) }
}

vi.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    apiKey: string | undefined
    constructor(opts: { apiKey?: string }) {
      this.apiKey = opts.apiKey
      constructedKeys.push(opts.apiKey)
    }
    messages = {
      // Client uses stream() + finalMessage(). Our mock returns an object
      // with a finalMessage() method; failures are raised synchronously so
      // the awaited finalMessage() rejects.
      stream: () => {
        apiCalls++
        const shouldFail = sdkMode === 'fail-always' || (sdkMode === 'fail-then-succeed' && apiCalls === 1)
        return {
          finalMessage: async () => {
            if (shouldFail) throw new AuthenticationError()
            return {
              content: [{ type: 'text', text: 'ok' }],
              usage: { input_tokens: 5, output_tokens: 1 },
              stop_reason: 'end_turn',
            }
          },
        }
      },
    }
    static AuthenticationError = AuthenticationError
    static PermissionDeniedError = PermissionDeniedError
  }
  return { default: Anthropic }
})

vi.mock('../../src/notifications/hub.js', () => ({
  notifyAuthFailover: vi.fn().mockResolvedValue(undefined),
  notifyGenerationFailed: vi.fn().mockResolvedValue(undefined),
  notifyFeedDisabled: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  apiCalls = 0
  sdkMode = 'fail-then-succeed'
  primaryKeyAtConstruct.length = 0
  failoverKeyAtConstruct.length = 0
  constructedKeys.length = 0
  process.env.ANTHROPIC_API_KEY = 'sk-test-primary'
  process.env.ANTHROPIC_API_KEY_FAILOVER = 'sk-test-failover'
  vi.clearAllMocks()
  vi.resetModules()
})

async function cleanupRuns() {
  const pool = new pg.Pool({ connectionString: process.env.NEWS_DB_URL })
  try {
    await pool.query(`DELETE FROM news.generation_runs WHERE run_type = 'clustering' AND started_at > now() - interval '10 minutes'`)
  } finally {
    await pool.end()
  }
}

afterEach(async () => {
  await cleanupRuns()
})

describe('callClaude failover', () => {
  it('promotes failover key on auth error and records the run', async () => {
    const { callClaude, __resetFailoverForTests } = await import('../../src/llm/client.js')
    const hub = await import('../../src/notifications/hub.js')
    __resetFailoverForTests()

    const result = await callClaude({
      runType: 'clustering',
      systemPrompt: 'sys',
      userMessage: 'user',
      period: 'test',
    })

    expect(result.authMode).toBe('failover')
    expect(result.failoverOccurred).toBe(true)
    expect(result.text).toBe('ok')
    expect(result.inputTokens).toBe(5)
    expect(result.outputTokens).toBe(1)
    expect(hub.notifyAuthFailover).toHaveBeenCalledWith('clustering')
    expect(hub.notifyGenerationFailed).not.toHaveBeenCalled()

    // Two Anthropic clients were constructed: first with primary key, second with failover key.
    expect(constructedKeys).toEqual(['sk-test-primary', 'sk-test-failover'])

    const pool = new pg.Pool({ connectionString: process.env.NEWS_DB_URL })
    try {
      const { rows } = await pool.query<{ status: string; failover_occurred: boolean; llm_auth_mode: string }>(
        `SELECT status, failover_occurred, llm_auth_mode FROM news.generation_runs WHERE run_type = 'clustering' AND started_at > now() - interval '2 minutes' ORDER BY started_at DESC LIMIT 1`,
      )
      expect(rows[0]?.status).toBe('completed')
      expect(rows[0]?.failover_occurred).toBe(true)
      expect(rows[0]?.llm_auth_mode).toBe('failover')
    } finally {
      await pool.end()
    }
  })

  it('marks run as failed and notifies when both primary and failover keys fail', async () => {
    vi.resetModules()
    apiCalls = 0
    sdkMode = 'fail-always'

    const { callClaude, __resetFailoverForTests } = await import('../../src/llm/client.js')
    const hub = await import('../../src/notifications/hub.js')
    __resetFailoverForTests()

    await expect(
      callClaude({
        runType: 'clustering',
        systemPrompt: 'sys',
        userMessage: 'user',
        period: 'week of 2026-04-14',
      }),
    ).rejects.toThrow(/401/)

    expect(hub.notifyAuthFailover).toHaveBeenCalled()
    expect(hub.notifyGenerationFailed).toHaveBeenCalledWith('clustering', 'week of 2026-04-14')

    const pool = new pg.Pool({ connectionString: process.env.NEWS_DB_URL })
    try {
      const { rows } = await pool.query<{ status: string; failover_occurred: boolean; error_message: string | null }>(
        `SELECT status, failover_occurred, error_message FROM news.generation_runs WHERE run_type = 'clustering' AND started_at > now() - interval '2 minutes' ORDER BY started_at DESC LIMIT 1`,
      )
      expect(rows[0]?.status).toBe('failed')
      expect(rows[0]?.failover_occurred).toBe(true)
      expect(rows[0]?.error_message).toMatch(/401|Unauthorized/i)
    } finally {
      await pool.end()
    }
  })

  it('succeeds on primary key without failover when auth is fine', async () => {
    vi.resetModules()
    apiCalls = 0
    sdkMode = 'succeed'

    const { callClaude, __resetFailoverForTests } = await import('../../src/llm/client.js')
    const hub = await import('../../src/notifications/hub.js')
    __resetFailoverForTests()

    const result = await callClaude({
      runType: 'clustering',
      systemPrompt: 'sys',
      userMessage: 'user',
    })

    expect(result.authMode).toBe('primary')
    expect(result.failoverOccurred).toBe(false)
    expect(result.text).toBe('ok')
    expect(result.inputTokens).toBe(5)
    expect(result.outputTokens).toBe(1)
    expect(hub.notifyAuthFailover).not.toHaveBeenCalled()
    expect(constructedKeys).toEqual(['sk-test-primary'])
  })
})
