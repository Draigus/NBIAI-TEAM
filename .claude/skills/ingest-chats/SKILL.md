---
name: ingest-chats
description: "Ingest Claude session handoffs and ChatGPT export into the intelligence pipeline. Extracts decisions, insights, and knowledge from past AI conversations. Triggers: ingest chats, ingest chatgpt, ingest claude sessions, ingest conversations, harvest chats."
category: intelligence
user-invocable: true
---

# Chat Ingestion Connector

Ingests knowledge from Claude Code session handoffs and ChatGPT exports into raw extracts for the intelligence pipeline.

## Arguments

- `source`: "claude" | "chatgpt" | "both" (default: "both")
- `batch_size`: number of items to process (default: 25)

## Process: Claude Session Handoffs

1. Read `intelligence/pipeline_state.md` for last claude_sessions ingestion date.
2. Glob `projects/nbi_dashboard/session_handoffs/*.md` for files modified after last ingestion.
3. For each handoff file:
   a. Read the file content.
   b. These are already structured (what was done, decisions, state). Extract:
      - Decisions Glen made (with reasoning)
      - Architectural choices and why
      - Approaches rejected and why
      - Client/project insights
      - Knowledge generated that session
   c. Score: relevance, novelty, actionability (using ingestion agent prompt from intelligence/prompts/ingestion_agent.md).
   d. Assign bank_candidates using topic detection (read bank registry from intelligence/config/bank_registry.md).
   e. Write extract to `intelligence/raw/claude_sessions/{date}_{slug}.md` in standard format.
4. Update `pipeline_state.md`: set claude_sessions last run date, record extract count.
5. Check compilation threshold: for each bank in bank_candidates across all new extracts, count pending extracts. If any bank has >= 3 new qualifying extracts, report: "Bank [{slug}] has {N} new extracts — ready for compilation. Run /compile-bank {slug} to integrate."

## Process: ChatGPT Export

1. Read `intelligence/config/source_config.md` for ChatGPT export path.
   - If path is "TBD": ask Glen for the path. Update source_config.md.
2. Read the JSON file (conversations.json or equivalent).
3. Parse conversation list. For each conversation:
   a. Read title.
   b. Apply title relevance filter:
      - INCLUDE: titles mentioning client names (Couch Heroes, Goals, etc.), "NBI", game titles, "pitch", "forecast", "production", "economy", "analysis", "research", "strategy", "pricing", "hiring"
      - EXCLUDE: "test", "hello", "help me with", single-word titles, coding help ("fix this bug", "python error")
      - UNCERTAIN: read first 5 user messages. Include if business/gaming context.
   c. For included conversations: reconstruct message chain from mapping structure.
   d. Feed full conversation to ingestion agent (using prompt from intelligence/prompts/ingestion_agent.md) with context:
      "This is a ChatGPT conversation. Title: {title}. Date: {date}. Extract: conclusions reached, research findings, frameworks developed, decisions made, insights. Do NOT extract questions — only knowledge generated."
   e. Agent produces extract(s). If conversation spans multiple unrelated topics: split.
   f. Score and classify per standard process.
   g. Write extracts to `intelligence/raw/chatgpt/{conversation-id}_{slug}.md`.
4. Process in batches of {batch_size}. Report progress: "Processed {N}/{total} conversations. {M} extracts produced."
5. Update `pipeline_state.md`.
6. Report compilation readiness per bank.

## Deduplication

Before writing any extract, check source_id against existing files in the target raw/ directory. Skip if an extract with that source_id already exists.

## Output

Report at end of run:
- Conversations/handoffs processed: {N}
- Extracts produced: {M}
- Extracts by bank candidate: {bank: count}
- New bank suggestions: {list if any}
- Banks ready for compilation (>= 3 threshold): {list}
