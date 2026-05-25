---
name: ingest-email
description: "Ingest Gmail business threads into the intelligence pipeline. Extracts decisions, commitments, and knowledge from email correspondence. Triggers: ingest email, ingest gmail, harvest email, email intelligence."
category: intelligence
user-invocable: true
---

# Gmail Ingestion

Ingests knowledge from Gmail business threads into raw extracts for the intelligence pipeline.

## Arguments

- `days`: number of days to look back (default: 14, first run: 30)

## Process

1. **Read config.** Load `intelligence/config/source_config.md` for search queries and exclusion rules.

2. **Execute search queries.** Run each configured Gmail search via `mcp__claude_ai_Gmail__search_threads`:
   - from:vardis@couchheroes.com newer_than:{days}d
   - from:aris@couchheroes.com newer_than:{days}d
   - label:nbi newer_than:{days}d
   - subject:(pitch OR investment OR forecast OR production OR hiring) newer_than:{days}d -category:promotions -category:social -category:updates

3. **Deduplicate by thread ID.** Collect unique thread IDs across all search results.

4. **Get thread content.** For each unique thread: call `mcp__claude_ai_Gmail__get_thread`.

5. **Apply exclusion rules:**
   - Skip: from noreply@, notifications@
   - Skip: calendar invites with no substantive body
   - Skip: newsletters/marketing (unless from known industry source with specific data)
   - Skip: threads where Glen's only contribution is "Thanks" or "OK"

6. **Extract knowledge.** Feed thread to ingestion agent with context:
   > "This is an email thread. Participants: [names]. Subject: [subject]. Extract decisions, commitments, new information, and any knowledge that would be useful if this topic comes up again in 3 months."
   
   Use prompt from `intelligence/prompts/ingestion_agent.md`.

7. **One extract per thread.** Exception: threads with 20+ messages spanning multiple unrelated topics get split.

8. **Sensitivity defaults:**
   - Standard: `internal`
   - Contract terms: `restricted`
   - Client-specific data: `client_scoped`

9. **Deposit extracts.** Write to `intelligence/raw/gmail/{date}_{thread-slug}.md`.

10. **Update pipeline state.** Set gmail last run date, record extract count.

11. **Report compilation readiness.**

## Output

Report at end of run:
- Search queries executed: {N}
- Unique threads found: {M}
- Threads after exclusions: {K}
- Extracts produced: {J}
- Extracts by bank candidate: {bank: count}
- Banks ready for compilation: {list}
