# Handoff: Laptop Parity Setup — 2026-05-31

## What happened

Glen is in Greece working from a laptop. This session brought the laptop up to parity with the home PC in the UK so Claude Code can operate at full capability.

## What was done

### CLI tools installed (all verified working)
- **Node.js v24.16.0** + npm 11.13.0 + npx (via winget)
- **GitHub CLI v2.93.0** — authenticated as **Draigus** (via `gh auth login --web`)
- **PM2** — installed globally via npm
- **uv v0.11.17 / uvx** — Python package runner (via winget)
- **Cloudflared v2026.5.2** — Cloudflare tunnel client (via winget)
- **Python 3.12.10** + **Git 2.51.0** — already present

### D: drive mapping
Home PC has OneDrive at `D:\OneDrive\`. Laptop has it at `C:\Users\gpbea\OneDrive\`. All MCP paths, git hooksPath, and permission entries in `.mcp.json` / `.git/config` / `settings.local.json` reference `D:\`.

**Fix:** `subst D: C:\Users\gpbea` — creates a virtual D: drive so all paths resolve. No shared config files were touched. Home PC is unaffected.

**NOT persistent.** The mapping dies on reboot. Glen needs to create a startup batch file manually:
1. Press `Win+R` → `shell:startup`
2. Create `map-d-drive.bat` containing: `subst D: C:\Users\gpbea`

### GitHub remote
Remote was already in `.git/config`: `https://github.com/Draigus/NBIAI-TEAM.git`. Git fetch verified working.

### Chrome extension
Claude in Chrome extension confirmed installed by Glen.

## What was NOT done

### MCP servers not connected this session
Playwright MCP and Claude in Chrome MCP are configured in `.mcp.json` but only connect when Claude Code starts. **On next session launch, they should connect automatically** now that npx and node are installed. If they don't, check:
- `npx @playwright/mcp@latest --browser chrome` runs without error
- Chrome extension is active

### Dashboard server not running locally
PM2 is installed but no processes started. The dashboard runs on the home PC and is accessible via `worksage.nbi-consulting.com` (Cloudflare tunnel). Server health confirmed: `{"status":"ok","db":"connected","news":"ok"}`. No need to run locally unless offline work is required.

### No shared config files changed
`.mcp.json`, `.git/config`, `settings.json`, `settings.local.json` — all left untouched. Home PC setup is completely unaffected by this session.

## ATS Scorecard context recovered

Glen asked about the ATS scorecard system he built on the home PC before travelling to Greece. Found:

### Brainstorm prototypes (`.superpowers/brainstorm/`)
- **Session 38600:** Interview mode — focused interviewer view with per-question scoring (1-5), category progress bars, question navigation
- **Session 19696:** Card anatomy (current vs proposed 220px), database view (full table vs table+preview), calendar (rich interview blocks), navigation (top tabs vs sidebar)

### Glen's design decisions (from 2026-05-21 session)
1. Candidate cards: 220px, avatar, source badge, assignee faces
2. Database view: **Option A — Full Table**
3. Calendar view: Week grid with rich interview blocks
4. Navigation: **Option A — Top Tab Bar** (Pipeline | Positions | Database | Calendar | Metrics)
5. Interview system: Log + calendar + conflict detection (no availability matching)

### Implementation status
All decisions were built and deployed per the 2026-05-22 handoff (`2026-05-22_ats_complete_handoff.md`). The full ATS with 5 tabs, scorecard system, calendar, database view, and interview scheduling is in `nbi_project_dashboard.html` and the `dashboard-server` routes. Live at `worksage.nbi-consulting.com`.

### Prototypes extracted
Combined multi-page HTML prototype at `prototypes/ats-scorecard-full-prototype.html` (all 5 brainstorm views with tab navigation). Single scorecard view at `prototypes/interview-scorecard-prototype.html`.

## What to do on next session

1. Restart Claude Code so MCP servers connect (Playwright + Chrome extension)
2. Visually verify the ATS/Hiring tab on worksage.nbi-consulting.com
3. If the D: drive mapping isn't active, run `subst D: C:\Users\gpbea` before doing anything that needs MCP tools

## Files changed this session
- `prototypes/interview-scorecard-prototype.html` — NEW, standalone scorecard prototype
- `prototypes/ats-scorecard-full-prototype.html` — NEW, combined 5-view prototype
- This handoff file
