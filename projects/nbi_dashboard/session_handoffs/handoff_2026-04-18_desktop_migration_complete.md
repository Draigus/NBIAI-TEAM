# Handoff — Desktop-to-CLI Migration Complete (2026-04-18)

**Session purpose:** Complete the second pass of migrating from Claude Desktop to Claude Code in VS Code. Archive Desktop state, audit all connectors/config, harden the CLI setup, clean up the project filesystem.

**Previous handoff loaded:** `projects/nbi_dashboard/session_handoffs/handoff_2026-04-18_mcp_migration.md` (MCP rebuild from earlier today)

**HEAD at session end:** `17d6153` on `master`

---

## 1. What was done

### 1a. Desktop state archive (Migration Steps 0-9)

Full 9-step audit of Desktop state before uninstall:

- **Backup created:** `_archive/claude_desktop_backup_2026-04-18.tar` (276 MB) — contains extension settings, Chrome native host manifest, session transcripts, local agent sessions, logs. Top-level config files also copied as standalone files in `_archive/`.
- **12 GB raw copy** (with VM disk images) was created then **deleted** after Glen confirmed Cowork VMs were useless.
- **DXT extension secrets extracted:**
  - `APIFY_TOKEN=apify_api_9pATF1Z2Y96xMMS8Qcltxgc7a5hqWD32xKJr`
  - `FILESYSTEM_ALLOWED_DIRS=D:\OneDrive, C:\Users\gpbea\Downloads, E:\OneDrive\Desktop 1`
  - `MICROSOFT_MCP_CLIENT_ID=b07c4283-c8ab-45b6-9394-2a753f2d297a`
  - Desktop Commander had no config.
- **All 11 MCPs confirmed connected in CLI:** Google Drive, Granola, Gamma, Miro, Gmail, Google Calendar, Blender, MS365, Desktop Commander, Apify, Framer.
- **Shared state verified:** plugins (skill-creator, superpowers), marketplaces, 15 memory entries, model=claude-opus-4-6, DISABLE_AUTO_COMPACT=1, no-fabrication PostToolUse hook, 20 custom slash commands — all live.
- **Scheduled tasks:** 3 tasks in `~/.claude/scheduled-tasks/` (batch3-gap-fill, quality-check-reminder, worksage-telemetry-reminder) — all portable SKILL.md files, no cron schedules, no Desktop binding.
- **Git worktrees:** Desktop tracked zero; CLI had one orphaned worktree (`agent-a97850f3`, fully merged) — removed.

### 1b. What's LOST (Desktop-only, no CLI equivalent)

| Feature | Impact |
|---|---|
| Claude in Chrome (browser extension) | Medium — native messaging host is Desktop-bound. No CLI equivalent. |
| Computer Use | Low — Desktop-native screen capture/input. Not available in CLI. |
| Cowork/Preview VM workspaces | Low — sandboxed Linux VMs, not project files. |
| MCP Registry browser | Low — convenience feature. |
| Coda integration | Low — workspace ID was `ca3bc748...`. |

**Full migration report:** `_archive/desktop_to_vscode_migration.md`

### 1c. Hardening (4 of 10 proposed items — Glen reviewed and approved)

Opus 4.7 had proposed 10 hardening steps. Glen asked me to critique them. I recommended 4 DO, 1 DEFER, 5 SKIP:

**Done:**
1. **Skill prune:** Deleted 18 skills from `~/.claude/skills/` (9x blender, client-onboarding, competitive-intel, financial-modelling, meeting-prep, 3x paperclip, pitch-deck, uk-company-setup). Only `para-memory-files` remains. Marketplace skills (superpowers, marketing bundle) untouched — they're plugin-managed.
2. **Weekly backup:** Windows Scheduled Task `ClaudeConfigWeeklyBackup` registered. Runs Sundays 02:00, zips `C:\Users\gpbea\.claude\` to `D:\OneDrive\Claude_code\_backups\claude_user_YYYY-MM-DD.zip`. Manual test produced 514 MB zip. `StartWhenAvailable` is on.
3. **Worktree enforcement:** New section "Risky Edits — Worktree First" appended to `CLAUDE.md` (line 138+). Rules: worktree for >3 files in dashboard-server/ or nbi_project_dashboard.html, low confidence, or experimental refactors.
4. **Memory file:** `feedback_vscode_migration.md` written with per-task model routing, subagent defaults, worktree discipline, prompt caching reminder. Added to MEMORY.md index.

**Skipped (with Glen's implicit approval via critique):**
- UserPromptSubmit hook (redundant with existing CLAUDE.md + PostToolUse hook + memory)
- Stop hook for session continuity (CLAUDE.md already mandates this)
- Model routing in CLAUDE.md (already in tier table)
- Subagent routing in CLAUDE.md (already in system prompt)
- VS Code extension sanity check (self-evidently working)

**Deferred to separate session:**
- Anthropic API cache audit (Step 8) — grep for `anthropic`/`@anthropic-ai/sdk` imports, check cache_control on stable prefixes. Read-only audit.

### 1d. Filesystem cleanup

- Deleted stale `dashboard-server/.env.bak-20260418` (live `.env` has 4 extra lines the backup lacked)
- Moved `docs/HANDOFF.md` to `projects/nbi_dashboard/session_handoffs/handoff_2026-04-18_mcp_migration.md`, removed empty `docs/`
- Removed orphaned worktree `.claude/worktrees/agent-a97850f3` and branch `worktree-agent-a97850f3`
- Pruned 3 stale worktree refs from `.git/worktrees/` (agent-a97850f3, kanban-drag-reorder, test-infra-setup)
- Added `_archive/` and `.env.bak-*` to `.gitignore`
- Committed as `17d6153`

### 1e. WorkSage / React discussion

Glen asked whether WorkSage should move to React. Answer: no. It's a single-page internal dashboard served from Express on port 8888, talking to Postgres via `pg`. React doesn't earn its keep until complex interactive state arrives (multi-page, drag-and-drop, real-time collaboration). Glen corrected me on two points: it's Postgres not Supabase (correct — direct pg Pool), and he didn't remember putting it through Express (it is Express — `server.js` confirmed).

---

## 2. Server state

- **WorkSage (nbi-dashboard):** PM2 process ID 3, port 8888, online. `dashboard-server/server.js`.
- **News aggregator (nbi-news):** PM2 process ID 2, online.
- No server restarts were performed this session. No server code was changed.

---

## 3. Current git state

- **Branch:** `master`
- **HEAD:** `17d6153` — `chore: Desktop-to-CLI migration cleanup and hardening`
- **Working tree:** Clean except one auto-added permission in `.claude/settings.local.json` (trivial, rolls into next commit)
- **No untracked files**

---

## 4. What's left to do

- **Uninstall Claude Desktop** — Glen has the go-ahead from the migration report. Safe to proceed.
- **Anthropic API cache audit** — deferred from hardening Step 8. Grep for API calls, check cache_control, estimate monthly volume, produce priority fix report.
- **33 `please_review` bugs** — pre-existing backlog from the Bug Tracker, unrelated to this session.
- **Kanban drag-to-reorder** — spec approved, ready for test-first implementation per earlier session.

---

## 5. Key file locations

| What | Where |
|---|---|
| Migration report | `_archive/desktop_to_vscode_migration.md` |
| Desktop backup (tar) | `_archive/claude_desktop_backup_2026-04-18.tar` |
| Desktop config JSON | `_archive/claude_desktop_config.json` |
| Weekly backup destination | `D:\OneDrive\Claude_code\_backups\` |
| Memory index | `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI-TEAM\memory\MEMORY.md` |
| Migration memory file | `feedback_vscode_migration.md` (in memory dir) |
| CLAUDE.md | `D:\OneDrive\Claude_code\NBIAI_TEAM\CLAUDE.md` |
| Settings | `D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\settings.local.json` |
| WorkSage server | `dashboard-server/server.js` (port 8888) |
| WorkSage frontend | `nbi_project_dashboard.html` |
