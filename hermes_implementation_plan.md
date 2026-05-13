# Hermes Agent Implementation Plan — NBI Gaming

**Approved:** 2026-05-10  
**Machine:** Glen's second PC (specs TBD)  
**Architecture:** Hermes (WSL2, always-on) → Claude Code CLI (Max sub) → Discord (chat + alerts)

---

## What Claude Prepares In Advance vs What Glen Does Hands-On

| Task | Who | Notes |
|------|-----|-------|
| SOUL.md (personality file) | Claude | Ready before install |
| MEMORY.md seed content | Claude | NBI context pre-loaded |
| USER.md seed content | Claude | Glen's preferences |
| Profile configs (4 agents) | Claude | config.yaml per profile |
| Cron job definitions | Claude | All job specs ready to paste |
| Custom NBI skills | Claude | Skill directories ready to copy |
| Discord bot setup guidance | Claude | Step-by-step with screenshots |
| WSL2 install + configure | Glen | Admin PowerShell, one reboot |
| Hermes install | Glen | One curl command in WSL |
| Claude Code CLI install + OAuth | Glen | npm install + browser login |
| Discord application creation | Glen | Browser, 5 mins |
| Task Scheduler entry | Glen | Keep WSL alive after reboot |
| Copy config files into place | Glen | cp commands from OneDrive to WSL |
| Start gateway + verify | Glen | hermes gateway start |

---

## Phase 1: Foundation

### Glen Does (at second machine)

#### 1.1 — Install WSL2

Open **Admin PowerShell**:
```powershell
wsl --install
```
Reboot when prompted. After reboot, Ubuntu terminal opens — set username and password.

Verify it's version 2:
```powershell
wsl --list --verbose
```
Should show `Ubuntu` with `VERSION 2`.

#### 1.2 — Configure WSL for Always-On + Systemd

Inside the WSL terminal:
```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
[interop]
enabled=true
appendWindowsPath=true
[automount]
options = "metadata,umask=22,fmask=11"
EOF
```

Back in PowerShell, restart WSL:
```powershell
wsl --shutdown
```

Re-open Ubuntu terminal. Verify systemd:
```bash
ps -p 1 -o comm=
# Must output: systemd
```

#### 1.3 — Configure WSL Networking (Windows 11)

Create/edit `%USERPROFILE%\.wslconfig` in Windows:
```ini
[wsl2]
networkingMode=mirrored
```

Restart WSL again:
```powershell
wsl --shutdown
```

#### 1.4 — Keep WSL Alive After Reboot (Task Scheduler)

Open **Task Scheduler** (search in Start menu):
1. Click "Create Task" (not "Create Basic Task")
2. **General tab:** Name: `Keep WSL Running`, check "Run whether user is logged on or not"
3. **Triggers tab:** New → "At log on" → your user account
4. **Actions tab:** New →
   - Program: `C:\Windows\System32\wsl.exe`
   - Arguments: `-d Ubuntu --exec /bin/sh -c "sleep infinity"`
5. **Conditions tab:** Uncheck "Start only if on AC power"
6. Click OK, enter your Windows password

#### 1.5 — Install Hermes Agent

Inside WSL terminal:
```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
source ~/.bashrc
```

Verify:
```bash
hermes --version
hermes doctor
```

#### 1.6 — Install Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
```

Authenticate (this opens your Windows browser):
```bash
claude login
```
Sign in with your Anthropic account. Paste the OAuth code back into the terminal when prompted.

Verify:
```bash
claude -p "Say hello" --max-turns 1
```
Should return a response. This confirms your Max subscription is connected.

#### 1.7 — Create Discord Server + Bot

**Create a Discord server** (if you don't already have one for this):
1. Open Discord → "+" button → "Create My Own" → "For me and my friends"
2. Name it something like "NBI Ops"
3. Create channels: `#general`, `#bd-alerts`, `#intel`, `#ops-briefing`, `#comms-digest`

**Create Discord bot application:**
1. Go to https://discord.com/developers/applications
2. Click "New Application" → name it "Hermes Agent" → Create
3. Left sidebar → "Bot"
4. Under Privileged Gateway Intents, toggle ON:
   - **Server Members Intent**
   - **Message Content Intent** (CRITICAL — without this, bot can't read messages)
5. Click "Reset Token" → complete 2FA → **copy the token immediately** (shown once only)
6. Save the token somewhere secure temporarily

**Get your Discord User ID:**
1. Discord → Settings → Advanced → Enable "Developer Mode"
2. Right-click your username anywhere → "Copy User ID"

**Invite the bot to your server:**
1. Left sidebar → "Installation" (or OAuth2 → URL Generator)
2. Scopes: `bot` and `applications.commands`
3. Bot Permissions: View Channels, Send Messages, Embed Links, Attach Files, Read Message History, Send Messages in Threads, Add Reactions
4. Copy the generated URL → open in browser → select your NBI Ops server → Authorize

**Get channel IDs** (for cron delivery routing):
1. With Developer Mode on, right-click each channel → "Copy Channel ID"
2. Note down the IDs for: `#bd-alerts`, `#intel`, `#ops-briefing`, `#comms-digest`, `#general`

#### 1.8 — Run Hermes Setup

```bash
hermes setup
```

This is an interactive wizard. When prompted:
- **LLM Provider:** Select "Anthropic" — it should detect your Claude Code OAuth credentials
- **Model:** Select `claude-sonnet-4-6` for the orchestration layer (lighter than Opus for routing decisions)
- **Platform:** Select "Discord"
- **Discord Bot Token:** Paste the token you saved
- **Discord User ID:** Paste your user ID

If `hermes setup` doesn't detect Claude Code creds, manually set in `~/.hermes/.env`:
```bash
# Only needed if OAuth detection fails
ANTHROPIC_API_KEY=sk-ant-...
```

#### 1.9 — Copy NBI Configuration Files

Once Hermes is installed, copy the files Claude prepared (from OneDrive or wherever accessible):
```bash
# SOUL.md — agent personality
cp /mnt/d/OneDrive/Claude_code/NBIAI_TEAM/hermes_config/SOUL.md ~/.hermes/SOUL.md

# Memory seed files
cp /mnt/d/OneDrive/Claude_code/NBIAI_TEAM/hermes_config/MEMORY.md ~/.hermes/memories/MEMORY.md
cp /mnt/d/OneDrive/Claude_code/NBIAI_TEAM/hermes_config/USER.md ~/.hermes/memories/USER.md

# Discord environment config (edit with your actual token + IDs)
cp /mnt/d/OneDrive/Claude_code/NBIAI_TEAM/hermes_config/env_template ~/.hermes/.env.discord
cat ~/.hermes/.env.discord >> ~/.hermes/.env
nano ~/.hermes/.env  # Fill in YOUR_BOT_TOKEN, YOUR_USER_ID, channel IDs
```

#### 1.10 — Enable User Lingering + Install Gateway Service

```bash
sudo loginctl enable-linger $USER
hermes gateway install
hermes gateway start
hermes gateway status
```

Verify the bot appears online in your Discord server. Send a message mentioning it:
```
@Hermes Agent hello, are you there?
```

It should respond.

#### 1.11 — Test Claude Code Integration

In Discord, ask Hermes something that requires Claude Code:
```
@Hermes Agent use claude to check what's on the master branch of d:\OneDrive\Claude_code\NBIAI_TEAM
```

Or from the WSL CLI:
```bash
hermes chat
> Use claude -p to check git status of /mnt/d/OneDrive/Claude_code/NBIAI_TEAM
```

If it successfully calls Claude Code CLI and returns results, the foundation is complete.

#### 1.12 — Create First Cron Job (The Opus 4.7 Check)

```bash
hermes cron create "0 9 * * 6" "Search the internet for any updates to Claude Opus 4.7. Has Anthropic released a patched model version, new weights, or a significant update? Check their blog, changelog, and community discussion. If nothing has changed, respond with [SILENT]. If something material has changed, summarise in 3-4 sentences and explain whether it's worth Glen re-evaluating the 4.6 pin." --name "opus-47-check" --deliver "discord:#intel"
```

Verify:
```bash
hermes cron list
hermes cron run opus-47-check  # Manual trigger to test
```

Check Discord `#intel` channel for the result.

---

## Phase 2: Intelligence Agent

### Claude Prepares

I'll create these files in `d:\OneDrive\Claude_code\NBIAI_TEAM\hermes_config\skills\` ready to copy:

- **`competitive-pricing-monitor/SKILL.md`** — Instructions for checking competitor pricing changes across Steam, PS Store, Xbox Store for titles in the active benchmark set
- **`gaming-industry-scan/SKILL.md`** — Weekly gaming industry news: funding rounds, layoffs, studio launches/closures, M&A transactions, platform policy changes
- **`aerm-benchmark-verify/SKILL.md`** — Verify AERM framework benchmarks against current market data, flag any that have drifted >15%
- **`tech-ai-monitor/SKILL.md`** — AI/ML tool releases, Claude model updates, MCP ecosystem changes, relevant framework updates

### Glen Does

Copy skills into place:
```bash
cp -r /mnt/d/OneDrive/Claude_code/NBIAI_TEAM/hermes_config/skills/* ~/.hermes/skills/
hermes skills list  # Verify they appear
```

Create the cron jobs:
```bash
# Competitive pricing — weekly Monday
hermes cron create "0 8 * * 1" "Run competitive pricing check" --skill competitive-pricing-monitor --name "pricing-monitor" --deliver "discord:#intel"

# Gaming industry scan — weekly Saturday
hermes cron create "0 9 * * 6" "Run gaming industry scan" --skill gaming-industry-scan --name "industry-scan" --deliver "discord:#intel"

# AERM benchmark verification — fortnightly (1st and 15th)
hermes cron create "0 10 1,15 * *" "Verify AERM benchmarks" --skill aerm-benchmark-verify --name "aerm-verify" --deliver "discord:#intel"

# Tech/AI monitoring — weekly Wednesday
hermes cron create "0 9 * * 3" "Run tech and AI monitoring scan" --skill tech-ai-monitor --name "tech-monitor" --deliver "discord:#intel"
```

Test each one:
```bash
hermes cron run pricing-monitor
hermes cron run industry-scan
hermes cron run aerm-verify
hermes cron run tech-monitor
```

Check Discord `#intel` for results. Confirm [SILENT] suppression works when nothing is noteworthy.

---

## Phase 3: BD and Operations Agent

### Claude Prepares

- **`bd-pipeline-monitor/SKILL.md`** — Check BD pipeline state, calculate days since last contact per lead, draft follow-up suggestions for stale leads, alert when any lead crosses staleness threshold
- **`monday-briefing/SKILL.md`** — Aggregate all client status, BD pipeline state, financial risks, approaching deadlines, and action items into a Monday morning executive briefing
- **`nsi-risk-monitor/SKILL.md`** — Monitor for signals about NSI wind-down timing, flag anything that suggests timeline change
- **`action-item-tracker/SKILL.md`** — Process meeting notes, extract action items, track completion, remind on approaching deadlines

### Glen Does

Copy skills, create cron jobs:
```bash
cp -r /mnt/d/OneDrive/Claude_code/NBIAI_TEAM/hermes_config/skills/* ~/.hermes/skills/

# BD pipeline — daily at 8am
hermes cron create "0 8 * * 1-5" "Check BD pipeline staleness" --skill bd-pipeline-monitor --name "bd-monitor" --deliver "discord:#bd-alerts"

# Monday briefing — Monday 7:30am
hermes cron create "30 7 * * 1" "Generate Monday morning briefing" --skill monday-briefing --name "monday-brief" --deliver "discord:#ops-briefing"

# NSI risk — weekly Thursday
hermes cron create "0 10 * * 4" "Check NSI wind-down signals" --skill nsi-risk-monitor --name "nsi-monitor" --deliver "discord:#ops-briefing"

# Action items — daily 6pm (end of day check)
hermes cron create "0 18 * * 1-5" "Review action item status" --skill action-item-tracker --name "action-tracker" --deliver "discord:#ops-briefing"
```

---

## Phase 4: Comms and Full Orchestration

### Prerequisites (Glen provides access)

For multi-channel monitoring, Hermes needs platform tokens:
- **Slack (Couch Heroes workspace):** Slack App with `channels:history`, `groups:history`, `im:history` scopes → Bot Token
- **MS Teams (Lighthouse/NBI):** Requires MS Graph API app registration (or direct MS365 MCP integration)
- **Email:** IMAP credentials or MS365 integration

These tokens go in `~/.hermes/.env`. I'll provide the exact env var names once we know which platforms you want connected.

### Claude Prepares

- **`slack-digest/SKILL.md`** — Summarise unread Slack threads from Couch Heroes workspace, flag urgent items and response debt
- **`overnight-orchestrator/SKILL.md`** — Orchestrate multi-session Claude Code CLI workflows: break task into sessions, chain outputs, deliver final results
- **`context-ground-truth/SKILL.md`** — Verify state files against actual repository state, detect staleness, update persistent context

### Glen Does

Connect platforms, create remaining cron jobs, configure overnight orchestration patterns.

---

## Configuration Files Claude Will Prepare

Once you tell me the machine is ready, I'll generate all of these into `d:\OneDrive\Claude_code\NBIAI_TEAM\hermes_config\`:

```
hermes_config/
├── SOUL.md                          # NBI agent personality
├── MEMORY.md                        # Seeded with NBI business context
├── USER.md                          # Glen's preferences and style
├── env_template                     # .env template with placeholders
├── config.yaml                      # Main config (Discord, security, cron)
├── skills/
│   ├── competitive-pricing-monitor/
│   │   └── SKILL.md
│   ├── gaming-industry-scan/
│   │   └── SKILL.md
│   ├── aerm-benchmark-verify/
│   │   └── SKILL.md
│   ├── tech-ai-monitor/
│   │   └── SKILL.md
│   ├── bd-pipeline-monitor/
│   │   └── SKILL.md
│   ├── monday-briefing/
│   │   └── SKILL.md
│   ├── nsi-risk-monitor/
│   │   └── SKILL.md
│   ├── action-item-tracker/
│   │   └── SKILL.md
│   ├── slack-digest/
│   │   └── SKILL.md
│   ├── overnight-orchestrator/
│   │   └── SKILL.md
│   └── context-ground-truth/
│       └── SKILL.md
└── profiles/
    ├── intel/                       # Intelligence Agent profile
    │   ├── config.yaml
    │   └── SOUL.md
    ├── ops/                         # BD + Operations Agent profile
    │   ├── config.yaml
    │   └── SOUL.md
    ├── comms/                       # Communications Agent profile
    │   ├── config.yaml
    │   └── SOUL.md
    └── orchestrator/                # Overnight workflow profile
        ├── config.yaml
        └── SOUL.md
```

---

## What Glen Provides When Ready

When you get the second machine stood up, tell me:

1. **Machine specs** — CPU, RAM, GPU (if any), disk space. Just so I know what we're working with for any future local model consideration.
2. **Confirm WSL2 is installed and running** — or I'll walk you through it.
3. **Discord server created** — with the channel IDs for #bd-alerts, #intel, #ops-briefing, #comms-digest.
4. **Discord bot token** — or confirm you've created the bot and have the token ready.

With those four things, we'll be up and running within the session.

---

## Verification Checklist (Phase 1 Complete When All Pass)

- [ ] WSL2 running with systemd enabled
- [ ] Task Scheduler keeping WSL alive after reboot
- [ ] Hermes installed and `hermes doctor` passes
- [ ] Claude Code CLI installed and authenticated (claude -p returns response)
- [ ] Discord bot online in server
- [ ] Can chat with Hermes in Discord and get responses
- [ ] Hermes can call Claude Code CLI and return results
- [ ] First cron job (Opus 4.7 check) fires and delivers to Discord #intel
- [ ] [SILENT] suppression works (no message when nothing noteworthy)

---

## Notes

- **Daily usage limits:** Monitor whether cron jobs + Discord chat hit your Max plan cap. If so, reduce cron frequency or use Sonnet for orchestration decisions (cheaper on the daily allowance).
- **Clock drift:** If WSL sleeps and API calls fail with auth errors, run `sudo hwclock -s` inside WSL.
- **Windows Defender:** Exclude the WSL distro path from real-time scanning for performance (`C:\Users\gpbea\AppData\Local\Packages\CanonicalGroupLimited.Ubuntu*\`).
- **Updates:** Run `hermes update` periodically to get new features and security patches.
