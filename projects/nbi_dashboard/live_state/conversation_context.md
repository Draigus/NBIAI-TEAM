# Conversation Context

Updated 2026-04-20

---

## 2026-04-20 (New session)

### What Happened

Glen loaded handoff from earlier 2026-04-20 session (News M4 + Client Portal on master). Directed: audit pending_tasks.md for stale items.

1. Checked all 6 pending items (G1-G5 + Kanban) against current codebase — all already shipped on master.
2. Rewrote pending_tasks.md to reflect actual current state.
3. Updated this file (was stale since 2026-04-11).

### Current State
- Master at `40a3ab1` — Client Portal + News M4 merged
- 186/186 tests passing
- PM2 services online: nbi-dashboard (port 8888), nbi-news (port 8890)
- No active feature branches
- Awaiting Glen UAT on Client Portal and News M4
- On hold: QuickBooks (Bryan's token), Excel import (Glen test)
- Resolved: email uses Microsoft Graph (not SMTP), news LLM API key already configured
- Backlog: Gantt enhancements, SoW layer, Hiring full spec, Telemetry/BI, research backend

### Previous Session Summary (earlier 2026-04-20)
- Merged Client Portal (14 commits, `8b74230`) — full client-scoped user system
- Merged News M4 search + admin (9 files, `40a3ab1`) — search UI, admin panels
- Both had merge conflicts resolved cleanly
- Process failure: auto-compaction happened despite CLAUDE.md rule against it
