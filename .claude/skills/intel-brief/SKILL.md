---
name: intel-brief
description: "Generate or regenerate the daily intelligence brief. Summarises pipeline state, bank health, what's new, and what's relevant to current work. Triggers: intel brief, intelligence brief, morning brief, what's new in intelligence, pipeline status."
category: intelligence
user-invocable: true
---

# Intelligence Brief Generation

Produces the daily intelligence brief that surfaces at session start.

## Process

1. **Read pipeline state.** Load `intelligence/pipeline_state.md` for: last ingestion dates, bank compilation status, pending items.

2. **Read bank frontmatter.** For each file in `intelligence/banks/*.md`: read the first 15 lines (frontmatter + executive summary). Extract: bank name, last_compiled, sources_count, lines.

3. **Determine last session date.** Read the most recent file in `projects/nbi_dashboard/session_logs/` to determine when Glen last worked.

4. **Identify what's new.** Compare bank last_compiled dates against last session date. Any bank updated since last session = "new" content to surface.

5. **Determine current work context.** Read the most recent session log's last 30 lines. What was Glen working on? What topics were active?

6. **Read research log.** Check `intelligence/research_log.md` for any research completed since last session.

7. **Generate brief.** Following the exact structure from `intelligence/prompts/brief_agent.md`:
   - What's New (only if something changed)
   - Bank Suggestions Pending (if any topics crossed threshold)
   - Today's Context (one sentence on likely work + most relevant banks)
   - Pipeline Health (bank count, stale count, pending items)
   - Actions Needed (only if there are actions requiring Glen)

8. **Write brief.** Save to `intelligence/synthesis/intelligence_brief.md`.

9. **Commit** (if significant changes from previous brief):
   ```
   git add intelligence/synthesis/intelligence_brief.md
   git commit -m "intel(brief): daily brief {date}"
   ```

## Principles

- Maximum 80 lines. Glen reads this at session start — don't waste time.
- If nothing changed: "Pipeline quiet since last session. No new intelligence." (one line, not a full brief)
- Only surface what's relevant to current work or genuinely new.
- Actions section ONLY for items requiring Glen's input. Don't pad.
