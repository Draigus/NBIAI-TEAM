# Handoff -- MCP Migration from Claude Desktop to Claude Code VSCode (2026-04-18)

**Session purpose:** Migrate the MCP server layer from Claude Desktop app to Claude Code running in VS Code. The CLI backend (`~/.claude/`) is shared between Desktop and Code, so plugins, skills, memory, and global settings carried over automatically. MCP servers and connectors did NOT carry over and needed manual rebuilding.

**Triggered by:** Anthropic removed Opus 4.6 from the Claude Desktop app. Glen is moving to Claude Code in VS Code as primary interface.

**Previous session handoff loaded:** `projects/nbi_dashboard/session_handoffs/handoff_2026-04-18_worksage_audit_sprint.md` (the WorkSage audit-fix sprint, 9 security commits landed, HEAD at `dec1652`).

---

## 1. What was worked on

### 1a. Full environment audit (Step 1 of Glen's migration plan)

Audited the complete Claude Code environment to understand what carried over from Desktop and what was missing.

**Commands run and their outputs:**

- `claude --version` => `2.1.86 (Claude Code)`
- `claude mcp list` => showed 8 servers initially: 6 claude.ai connectors (Google Drive needing auth, Granola, Gamma, Miro, Gmail, Google Calendar all connected), ms365 (FAILED), framer (connected per-project)
- `~/.claude/settings.json` => confirmed model `claude-opus-4-6`, plugins `skill-creator@claude-plugins-official` and `superpowers@claude-plugins-official` enabled, marketplace `superpowers-dev` registered, `effortLevel: "high"`
- `~/.claude.json` => CLI state file containing per-project configs, MCP server definitions, skill usage history, OAuth account info. Key findings:
  - `ms365` was configured with broken command: `"command": "cmd", "args": ["C:/", "npx -y @softeria/ms-365-mcp-server --org-mode --preset mail,calendar"]` -- this was wrong; Desktop had it as uvx with local checkout
  - `framer` configured per-project for `D:/OneDrive/Claude_code/NBIAI_TEAM` as HTTP type: `"url": "https://mcp.unframer.co/mcp?id=4b6d59579da78d051f500750e5d002a40613e662650d65247aca579059025b87&secret=HiBg4VbLmiFiraH19vPgzdECfQljDmXA"`
  - `claudeAiMcpEverConnected` tracked: Gamma, Gmail, Google Calendar, Granola, Miro
- `C:\Users\gpbea\AppData\Roaming\Claude\claude_desktop_config.json` => Desktop app MCP config:
  - `blender`: `"command": "uvx", "args": ["blender-mcp"], "env": {"DISABLE_TELEMETRY": "true"}`
  - `ms365`: `"command": "C:\\Users\\gpbea\\.local\\bin\\uvx.exe", "args": ["--from", "C:\\Users\\gpbea\\microsoft-mcp", "microsoft-mcp"], "env": {"MICROSOFT_MCP_CLIENT_ID": "b07c4283-c8ab-45b6-9394-2a753f2d297a", "PATH": "C:\\Program Files\\Git\\cmd;C:\\Users\\gpbea\\.local\\bin;C:\\Windows\\system32;C:\\Windows"}`
- DXT extensions directory (`C:\Users\gpbea\AppData\Roaming\Claude\Claude Extensions Settings\`):
  - `ant.dir.ant.anthropic.filesystem.json`: enabled, allowed directories `D:\OneDrive`, `C:\Users\gpbea\Downloads`, `E:\OneDrive\Desktop 1` -- SKIPPED (Claude Code native file tools cover this)
  - `ant.dir.gh.apify.apify-mcp-server.json`: enabled, `"tools": "actors,docs,apify/rag-web-browser"`, `"apify_token": "apify_api_9pATF1Z2Y96xMMS8Qcltxgc7a5hqWD32xKJr"`
  - `ant.dir.gh.wonderwhy-er.desktopcommandermcp.json`: enabled, no extra config
- Plugin cache (`~/.claude/plugins/cache/`): `claude-plugins-official` present
- User skills (`~/.claude/skills/`): 19 installed (9 Blender skills, 10 Paperclip symlinks to `/d/OneDrive/Claude_code/paperclip/skills/`)

### 1b. Shared state verification (Step 2)

Confirmed all shared state is intact in Claude Code:
- Global model: `claude-opus-4-6`
- Plugins enabled: `skill-creator@claude-plugins-official`, `superpowers@claude-plugins-official`
- Marketplaces registered: `claude-plugins-official`, `superpowers-dev` (git: `https://github.com/obra/superpowers.git`)
- Project settings at `D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\settings.local.json` loading correctly: `DISABLE_AUTO_COMPACT=1` honoured, PostToolUse Agent hook (NO-FABRICATION GUARDRAIL) active
- Auto-memory at `C:\Users\gpbea\.claude\projects\D--OneDrive-Claude-code-NBIAI-TEAM\memory\MEMORY.md` readable and loaded at session start
- All 52+ skills populating (19 user-level + 33 project-level + 20 persona commands)

### 1c. MCP server rebuilding (Step 3)

Added four local-process MCP servers to CLI using `claude mcp add`:

**3a. blender**
```
claude mcp add blender --scope user uvx blender-mcp --env DISABLE_TELEMETRY=true
```
Result: `Added stdio MCP server blender with command: uvx blender-mcp to user config`
Status: Connected

**3b. ms365 (fix)**
First removed the broken entry:
```
claude mcp remove ms365 --scope user
```
Then re-added with correct uvx command matching Desktop config:
```
claude mcp add ms365 -s user -e MICROSOFT_MCP_CLIENT_ID=b07c4283-c8ab-45b6-9394-2a753f2d297a -- "C:\Users\gpbea\.local\bin\uvx.exe" --from "C:\Users\gpbea\microsoft-mcp" microsoft-mcp
```
Result: `Added stdio MCP server ms365 with command: C:\Users\gpbea\.local\bin\uvx.exe --from C:\Users\gpbea\microsoft-mcp microsoft-mcp to user config`
Status: Connected

Note: Initial attempt with `--env` flag before the command failed with error `Invalid environment variable format` -- the `-e KEY=value` short form must come before the `--` separator.

**3c. Desktop Commander**
```
claude mcp add desktop-commander -s user -- npx -y @wonderwhy-er/desktop-commander
```
Result: `Added stdio MCP server desktop-commander with command: npx -y @wonderwhy-er/desktop-commander to user config`
Status: Connected

**3d. Apify**
```
claude mcp add apify -s user -e APIFY_TOKEN=apify_api_9pATF1Z2Y96xMMS8Qcltxgc7a5hqWD32xKJr -- npx -y @apify/actors-mcp-server
```
Result: `Added stdio MCP server apify with command: npx -y @apify/actors-mcp-server to user config`
Status: Connected

### 1d. Remote MCP connectors (Step 4)

**Google Drive:** Was showing "Needs authentication". Glen re-authorised through the `/mcp` interface in the Claude chat. Now showing Connected at `https://drivemcp.googleapis.com/mcp/v1`.

**Claude in Chrome:** Browser extension -- connects automatically when Chrome extension is installed and Claude Code CLI is running. Project settings already have permissions for `mcp__Claude_in_Chrome__navigate` and `mcp__Claude_in_Chrome__computer`. Not verified this session as it requires Chrome with the extension active.

**Other cloud connectors (already working, no action needed):**
- Granola: `https://mcp.granola.ai/mcp`
- Gamma: `https://mcp.gamma.app/mcp`
- Miro: `https://mcp.miro.com`
- Gmail: `https://gmail.mcp.claude.com/mcp`
- Google Calendar: `https://gcal.mcp.claude.com/mcp`

---

## 2. What was completed

- Full audit of Desktop vs CLI MCP state
- Shared state verification (settings, plugins, marketplaces, memory, skills)
- 4 local-process MCP servers added/fixed: blender, ms365 (was broken, now fixed), desktop-commander, apify
- Google Drive re-authenticated
- All 11 MCP servers confirmed Connected via `claude mcp list`

---

## 3. What's still in progress / not done

### 3a. Steps 5 and 6 from Glen's migration plan (not started)

- **Step 5: VS Code extension sanity check** -- confirm the extension points at the same `claude` binary, `/mcp` lists all servers inside VS Code, status line renders, Opus 4.6 is default, project CLAUDE.md loads.
- **Step 6: Smoke test** -- run one call against each reconnected MCP to verify end-to-end functionality (e.g. list calendars, list Granola meetings, blender `get_scene_info`). Pass/fail per server.

### 3b. Claude in Chrome verification

Not verified this session. Requires Chrome browser open with the Claude Code extension installed. The permissions are already configured in `settings.local.json`.

### 3c. Additional remote connectors Glen listed but not addressed

Glen's Step 4 listed these connectors that were NOT set up this session:
- **MCP Registry** -- no URL known, Glen did not provide one
- **Scheduled Tasks (Anthropic)** -- no URL known
- **Computer Use** -- no URL known
- **Coda** (reference `ca3bc748...`) -- no URL known
- **Claude Preview / Cowork** -- permission `mcp__Claude_Preview__preview_start` exists in project settings but was not verified

### 3d. Marketplace MCP servers from plugins directory (not added)

Early in the session, the Explore agent found 15 external MCP server definitions in `~/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/` (asana, context7, discord, fakechat, firebase, github, gitlab, greptile, imessage, laravel-boost, linear, playwright, serena, telegram, terraform). These were NOT added because Glen's subsequent instructions specified exactly which servers to set up. They remain available in the marketplace if needed later.

### 3e. WorkSage audit-fix sprint (the original session purpose)

The four critical items from the previous handoff (`handoff_2026-04-18_worksage_audit_sprint.md`) were NOT worked on this session:
1. **B-C1 credential rotation** -- Glen's manual task (Azure portal, Postgres ALTER USER, token generation, move .env off OneDrive)
2. **F-C2 session cookie port** -- move localStorage bearer token to HttpOnly cookie
3. **F-C7 finance conflict UI** -- needs UX design call
4. **B-C2 /api/restore Zod validation** -- mechanical ~200 lines

---

## 4. Decisions made

1. **Filesystem DXT skipped** -- Claude Code's native file tools (Read, Write, Edit, Glob, Grep) already cover filesystem access. The DXT was configured for `D:\OneDrive`, `C:\Users\gpbea\Downloads`, `E:\OneDrive\Desktop 1`.
2. **Apify token reused** -- Glen confirmed using the same token from Desktop DXT config: `apify_api_9pATF1Z2Y96xMMS8Qcltxgc7a5hqWD32xKJr`.
3. **ms365 rebuilt from Desktop config** -- The CLI had a broken `cmd`-based command. Replaced with the correct `uvx.exe --from C:\Users\gpbea\microsoft-mcp microsoft-mcp` matching the Desktop app's `claude_desktop_config.json`.

---

## 5. Problems encountered and their status

### 5a. Premature .mcp.json creation (RESOLVED)

Before Glen provided his detailed migration plan, I created a `.mcp.json` file at the project root with 9 marketplace MCP server definitions and added `enableAllProjectMcpServers: true` to `settings.local.json`. Both were reverted before proceeding with Glen's plan:
- Deleted: `d:\OneDrive\Claude_code\NBIAI_TEAM\.mcp.json`
- Removed `enableAllProjectMcpServers: true` from `d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\settings.local.json`

### 5b. ms365 broken command format (RESOLVED)

The CLI had ms365 configured as:
```json
"ms365": {
  "type": "stdio",
  "command": "cmd",
  "args": ["C:/", "npx -y @softeria/ms-365-mcp-server --org-mode --preset mail,calendar"],
  "env": {}
}
```
This was not the same as the Desktop config. The Desktop used `uvx.exe` with a local checkout. Removed and re-added with the correct command. Now connected.

### 5c. claude mcp add flag ordering (RESOLVED)

First attempt at adding ms365 with `--env` flag placed after the command failed:
```
claude mcp add ms365 --scope user --env MICROSOFT_MCP_CLIENT_ID=... "C:\Users\gpbea\.local\bin\uvx.exe" -- --from ...
```
Error: `Invalid environment variable format: C:\Users\gpbea\.local\bin\uvx.exe, environment variables should be added as: -e KEY1=value1 -e KEY2=value2`

Fixed by using `-e` short form before the `--` separator:
```
claude mcp add ms365 -s user -e MICROSOFT_MCP_CLIENT_ID=... -- "C:\Users\gpbea\.local\bin\uvx.exe" --from ...
```

### 5d. Google Drive auth (RESOLVED)

Google Drive connector showed "Needs authentication". Could not trigger auth programmatically (the `mcp__claude_ai_Google_Drive__authenticate` tool returned "Ask the user to run /mcp and select claude.ai Google Drive to authenticate"). Glen completed the OAuth flow via `/mcp` in the chat interface. Now connected.

### 5e. Missing runtimes for marketplace MCPs (NOT RESOLVED -- deprioritised)

During the premature `.mcp.json` phase, discovered these runtimes are not installed:
- `bun` -- needed for Discord, Fakechat, iMessage, Telegram marketplace MCPs
- `docker` -- needed for Terraform marketplace MCP
- `php` -- needed for Laravel Boost marketplace MCP

These marketplace MCPs were not part of Glen's final migration plan, so this is not blocking.

---

## 6. Files created or modified

### Created this session

| File | Purpose |
|---|---|
| `d:\OneDrive\Claude_code\NBIAI_TEAM\docs\HANDOFF.md` | This handoff document |

### Modified this session

| File | Change |
|---|---|
| `C:\Users\gpbea\.claude.json` | Removed broken ms365 entry, added corrected ms365 (uvx), added blender, desktop-commander, apify MCP servers. All via `claude mcp add/remove` commands. |
| `d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\settings.local.json` | Temporarily added then removed `enableAllProjectMcpServers: true`. File is now back to its original state. |

### Created then deleted this session

| File | Reason |
|---|---|
| `d:\OneDrive\Claude_code\NBIAI_TEAM\.mcp.json` | Created prematurely with 9 marketplace MCP definitions, deleted when Glen provided proper migration plan |

### Not modified (confirmed intact)

| File | Status |
|---|---|
| `C:\Users\gpbea\.claude\settings.json` | Read-only this session, no changes needed |
| `C:\Users\gpbea\AppData\Roaming\Claude\claude_desktop_config.json` | Read-only reference, Desktop app config |
| `C:\Users\gpbea\.claude\projects\D--OneDrive-Claude-code-NBIAI-TEAM\memory\MEMORY.md` | Read at session start, no updates needed |

---

## 7. Final MCP server state (verified via `claude mcp list`)

```
claude.ai Google Drive: https://drivemcp.googleapis.com/mcp/v1 - Connected
claude.ai Granola: https://mcp.granola.ai/mcp - Connected
claude.ai Gamma: https://mcp.gamma.app/mcp - Connected
claude.ai Miro: https://mcp.miro.com - Connected
claude.ai Gmail: https://gmail.mcp.claude.com/mcp - Connected
claude.ai Google Calendar: https://gcal.mcp.claude.com/mcp - Connected
blender: uvx blender-mcp - Connected
ms365: C:\Users\gpbea\.local\bin\uvx.exe --from C:\Users\gpbea\microsoft-mcp microsoft-mcp - Connected
desktop-commander: npx -y @wonderwhy-er/desktop-commander - Connected
apify: npx -y @apify/actors-mcp-server - Connected
framer: https://mcp.unframer.co/mcp?id=4b6d59579da78d051f500750e5d002a40613e662650d65247aca579059025b87&secret=... (HTTP) - Connected (per-project)
```

11 servers total, all connected.

---

## 8. Next steps

1. **Complete Step 5** -- VS Code extension sanity check (confirm extension uses same `claude` binary, `/mcp` lists all servers, status line works, Opus 4.6 default, CLAUDE.md loads)
2. **Complete Step 6** -- smoke test each MCP server with a real call
3. **Verify Claude in Chrome** -- open Chrome with extension, confirm it auto-connects to CLI
4. **Address remaining remote connectors** if needed (MCP Registry, Scheduled Tasks, Computer Use, Coda, Claude Preview)
5. **Resume WorkSage audit-fix sprint** -- the four critical items from `handoff_2026-04-18_worksage_audit_sprint.md`:
   - B-C1: credential rotation (Glen's manual task)
   - F-C2: session cookie port (HttpOnly cookie migration)
   - F-C7: finance conflict UI (needs UX design)
   - B-C2: /api/restore Zod validation (~200 lines)

---

## 9. Start-up prompt for the next session

> Read `docs/HANDOFF.md` and `projects/nbi_dashboard/session_handoffs/handoff_2026-04-18_worksage_audit_sprint.md` before doing anything. The MCP migration from Claude Desktop to Claude Code VS Code is mostly complete -- 11 servers all connected (run `claude mcp list` to verify). Steps 5 (VS Code sanity check) and 6 (smoke test) from the migration plan are not done yet. After those, resume the WorkSage audit-fix sprint. The four critical items are listed in section 8 of this handoff.

---

End of handoff.
