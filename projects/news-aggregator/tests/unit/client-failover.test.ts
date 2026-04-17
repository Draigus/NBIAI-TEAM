import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import pg from 'pg'

// Mock the Agent SDK before the client imports it.
let sdkAttempts = 0
let sdkMode: 'fail-then-succeed' | 'succeed' | 'fail-always' = 'fail-then-succeed'

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: async function* () {
    sdkAttempts++
    if (sdkMode === 'fail-always') throw new Error('401 Unauthorized')
    if (sdkMode === 'fail-then-succeed' && sdkAttempts === 1) throw new Error('401 Unauthorized')
    yield {
      type: 'assistant',
      message: {
        content: [{ type: 'text', text: 'ok' }],
        usage: { input_tokens: 5, output_tokens: 1 },
      },
    }
    yield {
      type: 'result',
      subtype: 'success',
      is_error: false,
      result: 'ok',
      usage: { input_tokens: 5, output_tokens: 1 },
    }
  },
}))

vi.mock('../../src/notifications/hub.js', () => ({
  notifyAuthFailover: vi.fn().mockResolvedValue(undefined),
  notifyGenerationFailed: vi.fn().mockResolvedValue(undefined),
  notifyFeedDisabled: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  sdkAttempts = 0
  sdkMode = 'fail-then-succeed'
  process.env.ANTHROPIC_API_KEY_FAILOVER = 'sk-test-failover'
  delete process.env.ANTHROPIC_API_KEY
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

    expect(result.authMode).toBe('api_key')
    expect(result.failoverOccurred).toBe(true)
    expect(result.text).toBe('ok')
    expect(hub.notifyAuthFailover).toHaveBeenCalledWith('clustering')
    expect(hub.notifyGenerationFailed).not.toHaveBeenCalled()
    expect(process.env.ANTHROPIC_API_KEY).toBe('sk-test-failover')

    // The generation_runs row should be 'completed' with failoverOccurred=true
    const pool = new pg.Pool({ connectionString: process.env.NEWS_DB_URL })
    try {
      const { rows } = await pool.query<{ status: string; failover_occurred: boolean; llm_auth_mode: string }>(
        `SELECT status, failover_occurred, llm_auth_mode FROM news.generation_runs WHERE run_type = 'clustering' AND started_at > now() - interval '2 minutes' ORDER BY started_at DESC LIMIT 1`,
      )
      expect(rows[0]?.status).toBe('completed')
      expect(rows[0]?.failover_occurred).toBe(true)
      expect(rows[0]?.llm_auth_mode).toBe('api_key')
    } finally {
      await pool.end()
    }
  })

  it('marks run as failed and notifies when both Max Pro and API key fail', async () => {
    vi.resetModules()
    sdkAttempts = 0
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
      expect(rows[0]?.error_message).toMatch(/401/)
    } finally {
      await pool.end()
    }
  })

  it('succeeds on Max Pro without failover when auth is fine', async () => {
    vi.resetModules()
    sdkAttempts = 0
    sdkMode = 'succeed'

    const { callClaude, __resetFailoverForTests } = await import('../../src/llm/client.js')
    const hub = await import('../../src/notifications/hub.js')
    __resetFailoverForTests()

    const result = await callClaude({
      runType: 'clustering',
      systemPrompt: 'sys',
      userMessage: 'user',
    })

    expect(result.authMode).toBe('max_pro')
    expect(result.failoverOccurred).toBe(false)
    expect(result.text).toBe('ok')
    expect(result.inputTokens).toBe(5)
    expect(result.outputTokens).toBe(1)
    expect(hub.notifyAuthFailover).not.toHaveBeenCalled()
  })
})
