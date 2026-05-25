---
source: claude
source_id: handoff_2026-04-17c_news_m2_m3_complete
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-17c_news_m2_m3_complete.md
ingested: 2026-05-25
topics_detected: [claude-sdk, api-architecture, cost-analysis, llm-integration]
relevance_score: 9
novelty_score: 9
actionability_score: 9
bank_candidates: [production_methods, personal_insights]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# Claude Agent SDK vs Raw SDK: Overhead Discovery

## Key Content

The Claude Agent SDK (@anthropic-ai/claude-agent-sdk) was planned for the news aggregator to route through Max Pro billing. Discovery: the Agent SDK IS Claude Code under the hood, injecting the full harness (~13K tokens of built-in tool schemas, slash commands, skills, agents) into every system prompt even with settingSources:[] and allowedTools:[]. A weekly digest of ~32 LLM calls would burn ~420K overhead tokens. Glen's call: rip it out, use raw @anthropic-ai/sdk, pay per token. Actual cost: $0.79 for 34 calls (137K input / 25K output tokens) on the 30-day backfill. Streaming-only request path chosen because non-streaming has a hard 10-minute SDK timeout that clustering can exceed.

## Decisions / Insights

- Agent SDK adds ~13K tokens overhead PER CALL -- unusable for batch LLM workloads
- Raw @anthropic-ai/sdk with streaming is the correct pattern for programmatic Claude usage
- Always use streaming (.stream().finalMessage()) -- one code path, no timeout risk
- dotenv.config({override:true}) needed because PM2 persists empty env vars from historical shells
- uuid[] array literals in Drizzle need manual construction: `{${ids.join(',')}}::uuid[]`
- Actual LLM costs are tiny ($0.79 for a full month of news curation) -- do not pre-optimise

## Context

This discovery changed NBI's approach to all programmatic Claude usage. The Agent SDK is only for interactive CLI sessions, never for batch processing.

## Applicability

- Any new service that calls Claude programmatically must use @anthropic-ai/sdk, never the Agent SDK
- Always use streaming for LLM calls -- eliminates timeout risk
- Present actual cost data to Glen rather than guessing -- real costs are usually lower than expected
- PM2 env contamination is a known issue -- use dotenv override on all PM2-managed services
