---
source: claude
source_id: handoff_2026-04-19_settings_overhaul
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-19_settings_overhaul.md
ingested: 2026-05-25
topics_detected: [claude-code-config, context-efficiency, permission-management]
relevance_score: 7
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: insight
---

# Claude Code Configuration: Context Efficiency Wins

## Key Content

Three persistent pain points diagnosed and fixed. (1) Bash permission prompts: ~120 specific Bash(exact command) entries in allow lists meant every new command variant triggered a prompt. Fix: added Bash(*) as first entry in both global and project settings. (2) Context window meter showing wrong percentage (~47% after one exchange on 1M context): autoCompactWindow was not set, defaulting to 200K. Fix: set to 1000000 (maximum). Removed DISABLE_AUTO_COMPACT env var since the window is now properly configured. (3) 82 skills loading full descriptions (up to 1536 chars each = ~125K chars per turn): set skillListingMaxDescChars to 200. Glen's directive: "a name and a short one-line description."

## Decisions / Insights

- Bash(*) wildcard eliminates all permission prompts for bash commands
- autoCompactWindow must be set to 1000000 for Opus 4.6 1M context -- default is much smaller
- 82 skills at full description length consume ~125K chars per turn -- trim to 200 chars
- With proper 1M window, auto-compaction can be re-enabled (DISABLE_AUTO_COMPACT removed)
- defaultMode: "dontAsk" must be in BOTH global and project-level settings to take effect

## Context

These settings fixes resolved recurring friction in every Claude Code session. The context efficiency gain from skill description trimming was significant.

## Applicability

- Check autoCompactWindow is set to 1000000 when using Opus 4.6 1M context
- If permission prompts appear, verify Bash(*) is in both settings files
- Monitor skill count -- if context issues arise, reduce skillListingMaxDescChars
- Settings changes take effect on next session start, not mid-session
