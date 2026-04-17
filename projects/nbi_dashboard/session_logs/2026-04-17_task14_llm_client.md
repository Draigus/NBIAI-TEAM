# Session log — 2026-04-17 (Task 14: Claude Agent SDK wrapper)

**Starting state:** loaded `handoff_2026-04-17b_news_m1_complete.md`. M1 complete, 32/32 tests green, 4 PM2 processes online. Kicking off M2 at Task 14.

## What was done

1. **Baseline verify** — `pm2 list` shows 4 online; `git log` head is `959c772` (the handoff commit); `npm test` = 32/32 green.

2. **SDK message-shape pre-check** — ran two disposable scripts against `@anthropic-ai/claude-agent-sdk@^0.2.112`:
   - Script 1 (contaminated by ambient Claude Code session): confirmed the SDK streams `system`, `assistant`, `rate_limit_event`, `result` messages. Cost: $0.032 for "banana".
   - Script 2 (with `settingSources: []` and `allowedTools: []`): still injects ~13,470 tokens of cache_creation context (built-in tool schemas, slash commands, skills, agents) per call. Cost: $0.051 for "banana". SDK also calls Haiku under the hood to generate a session title.
   - **Confirmed assumptions:**
     - `assistant.message.content[0].text` = the model output (matches plan)
     - `usage` is snake_case: `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`
     - The final `result` message (`type: 'result'`) is the best single source of truth: `.result` (text), `.usage`, `.is_error`, `.total_cost_usd`, `.duration_ms`, `.modelUsage`
     - `apiKeySource: "none"` in the init message when no env key is set; SDK falls back to Claude CLI login credentials on disk → Max Pro billing works from a server process owned by the logged-in user
     - Setting `process.env.ANTHROPIC_API_KEY` takes effect per-query (the SDK reads env fresh each call), so the plan's env-mutation failover approach works

3. **Wrote `src/llm/client.ts`** — Agent SDK wrapper with Max Pro primary + `ANTHROPIC_API_KEY_FAILOVER` fallback. Deviations from plan:
   - Added `startedAt: new Date()` to the `generation_runs` insert (schema has `.notNull()` with no default; plan omitted).
   - Prefer the `result` message for extraction; fall back to the last assistant message's content[0].text.
   - Added `settingSources: []` and `allowedTools: []` to the `query()` options to suppress user/project settings and tool injection. Does NOT eliminate the ~13K token overhead (the SDK hardcodes built-in tool schemas, slash commands, skills, agents into the system prompt) — flagging as a cost concern.
   - Tightened `isAuthError` regex (word-boundary on 401/403, plus "invalid api key" variants).
   - Exported `__resetFailoverForTests()` for test isolation.

4. **Wrote `tests/unit/client-failover.test.ts`** — three tests, all green:
   - Failover on auth error → `authMode='api_key'`, `failoverOccurred=true`, `notifyAuthFailover` called, `generation_runs` row = `completed` + `api_key`
   - Both calls fail → `status='failed'`, `failoverOccurred=true`, `notifyAuthFailover` AND `notifyGenerationFailed` called, error message persisted
   - Max Pro succeeds first try → `authMode='max_pro'`, `failoverOccurred=false`, no notifications
   Tests mock `@anthropic-ai/claude-agent-sdk` and `notifications/hub.js` via `vi.mock`. DB is real; cleanup via `afterEach` delete.

5. **Wired `healthcheckAuth` into `src/index.ts`** — fires after `startCronJobs`. Env gate `NEWS_SKIP_LLM_HEALTHCHECK=1` skips it. Logs `ok/mode/error`.

6. **End-to-end verify** — `npm run build` clean, `npm test` = 35/35 green, `pm2 restart nbi-news` booted cleanly, healthcheck fired and logged `{ok: true, mode: 'max_pro'}`. Database row confirmed: `completed`, `max_pro`, `failover_occurred=false`, `input_token_count=3`, `output_token_count=4`.

## Commit

Forthcoming: `feat(news): Claude Agent SDK wrapper with Max Pro + API key failover`.

## Glen-flaggable observations

1. **SDK overhead:** each `query()` burns ~13K cache_creation tokens of built-in context we can't strip via options. For a news run with 20+ LLM calls (clustering, curation, 5+ summaries, hero, monthly), that's ~260K+ overhead tokens per digest on top of real prompt content. Max Pro subscription caps this, but if/when we fail over to API billing the $/month could spike fast. Alternative path if this becomes painful: migrate to raw `@anthropic-ai/sdk` and drop Agent SDK entirely — trade Max Pro billing for a leaner prompt.
2. **Haiku title-gen auto-charge:** SDK silently calls Haiku on every query to generate a session title (~346 input / 12 output tokens). Not controllable via `options`.
3. **Healthcheck cost:** each PM2 restart writes a `generation_runs` row and spends ~7 tokens on the SDK call. Benign, but means `generation_runs` will have a steady drip of healthcheck rows. If this matters for reporting, can filter by `run_type='clustering' AND system_prompt LIKE 'Reply with a single word%'` — or add a dedicated `runType: 'healthcheck'` later.
