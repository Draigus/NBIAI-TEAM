---
name: ingest-slack
description: "Ingest Slack channel discussions into the intelligence pipeline. Extracts decisions and knowledge from team conversations. Triggers: ingest slack, harvest slack, slack intelligence."
category: intelligence
user-invocable: true
---

# Slack Ingestion

Ingests knowledge from Slack channel discussions into raw extracts for the intelligence pipeline.

## Arguments

- `days`: number of days to look back (default: 14, first run: 30)

## Process

1. **Read config.** Load `intelligence/config/source_config.md` for channel configuration.

2. **First run: configure channels.** If no channels are configured:
   - List channels via `mcp__claude_ai_Slack__slack_search_channels`
   - Present to Glen: "Which Slack channels should the intelligence pipeline monitor? Here are your channels: [list]. I recommend including: [business-looking channels]. Excluding: [clearly social/off-topic channels]."
   - Store selection in `intelligence/config/source_config.md`

3. **Read channels.** For each configured channel: read messages since last ingestion via `mcp__claude_ai_Slack__slack_read_channel`.

4. **Filter for substance:**
   - SKIP: emoji-only reactions, "ok", "thanks", scheduling ("what time works?")
   - KEEP: messages with >50 words, messages containing links with context, threaded discussions with 3+ replies

5. **Extract knowledge.** Feed substantive threads to ingestion agent with context:
   > "This is a Slack thread from channel [name]. Participants: [names]. Extract decisions, knowledge shared, and insights. Skip social chatter and logistics."
   
   Use prompt from `intelligence/prompts/ingestion_agent.md`.

6. **One extract per distinct topic thread.**

7. **Deposit extracts.** Write to `intelligence/raw/slack/{date}_{channel}_{slug}.md`.

8. **Update pipeline state.** Set slack last run date, record extract count.

9. **Report compilation readiness.**

## Output

Report at end of run:
- Channels scanned: {N}
- Substantive threads found: {M}
- Extracts produced: {K}
- Extracts by bank candidate: {bank: count}
- Banks ready for compilation: {list}
