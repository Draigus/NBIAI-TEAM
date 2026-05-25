---
name: ingest-granola
description: "Ingest Granola meeting transcripts into the intelligence pipeline. Extracts decisions, insights, and knowledge from business meetings. Triggers: ingest granola, ingest meetings, harvest meetings, meeting intelligence."
category: intelligence
user-invocable: true
---

# Granola Meeting Ingestion

Ingests knowledge from Granola meeting transcripts into raw extracts for the intelligence pipeline.

## Arguments

- `days`: number of days to look back (default: 30, first run: 60)

## Process

1. **Read pipeline state.** Load `intelligence/pipeline_state.md` for last granola ingestion date.

2. **List meetings.** Call `mcp__claude_ai_Granola__list_meetings` filtered by date (since last ingestion, or last {days} days on first run).

3. **Filter for business meetings.** For each meeting, check attendees against:
   - `brain/people_directory.md` (NBI team members)
   - `brain/clients_detailed.md` (client contacts)
   - Any match = business meeting. Include.
   - No match + title contains business keywords (strategy, production, pitch, forecast, hiring, review) = include.
   - No match + no business indicators = skip.

4. **Get transcripts.** For included meetings: call `mcp__claude_ai_Granola__get_meeting_transcript`.

5. **Extract knowledge.** Feed transcript to ingestion agent with context:
   > "This is a meeting transcript from Granola. Attendees: [names]. Date: [date]. Extract the knowledge — decisions, insights, action items, strategic direction. Skip scheduling, pleasantries, and repetitive status updates."
   
   Use prompt from `intelligence/prompts/ingestion_agent.md`.
   Read bank registry from `intelligence/config/bank_registry.md` for topic classification.

6. **One extract per meeting** (or multiple if the meeting covered genuinely separate topics for >10 minutes each).

7. **Deduplication.** Check source_id (meeting ID from Granola) against existing files in `intelligence/raw/granola/`. Skip if already ingested.

8. **Write extracts.** Deposit in `intelligence/raw/granola/{date}_{slug}.md` in standard format.

9. **Update pipeline state.** Set granola last run date, record extract count.

10. **Report compilation readiness.** For each bank with >= 3 new qualifying extracts, report ready for compilation.

## Output

Report at end of run:
- Meetings found: {N}
- Business meetings (included): {N}
- Extracts produced: {M}
- Extracts by bank candidate: {bank: count}
- Banks ready for compilation: {list}
