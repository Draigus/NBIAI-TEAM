---
source: claude
source_id: handoff_2026-04-18_desktop_migration_complete
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-18_desktop_migration_complete.md
ingested: 2026-05-25
topics_detected: [tooling-migration, claude-code-setup, react-rejection]
relevance_score: 7
novelty_score: 7
actionability_score: 7
bank_candidates: [personal_insights, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# Desktop to CLI Migration and React Rejection

## Key Content

Anthropic removed Opus 4.6 from Claude Desktop app, forcing migration to Claude Code in VS Code. Key findings: plugins, skills, memory, and global settings shared via ~/.claude/ automatically. MCP servers did NOT carry over and needed manual rebuilding. Lost features: Claude in Chrome extension, Computer Use, Cowork/Preview VM workspaces. 18 stale skills pruned from ~/.claude/skills/. Weekly backup Windows Scheduled Task created (Sundays 02:00, zips ~/.claude/ to OneDrive). Worktree enforcement added to CLAUDE.md for risky edits.

Glen asked whether WorkSage should move to React. Answer: no. It is a single-page internal dashboard served from Express, talking to Postgres via pg. React does not earn its keep until complex interactive state arrives. Glen confirmed: he did not remember putting it through Express (it is Express).

## Decisions / Insights

- Claude Code in VS Code is the permanent primary interface (not Desktop)
- MCP servers need manual setup on platform migration -- they do not transfer
- WorkSage stays as vanilla JS SPA -- React migration explicitly rejected
- Weekly config backup is essential infrastructure (514 MB zip to OneDrive)
- Worktree-first rule: any change touching >3 files in dashboard-server/ or the SPA

## Context

This migration happened in mid-April 2026 and is now the permanent setup.

## Applicability

- All future development uses Claude Code in VS Code, not Desktop
- WorkSage architecture decisions should not assume React -- it is vanilla JS and will stay that way
- MCP server configs should be documented for disaster recovery
- Worktree discipline prevents risky edits from breaking production
