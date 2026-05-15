# AIOS Extensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend NBI's Claude Code operating system with a connections registry, EAD consulting methodology, system health audit skill, and four scheduled autonomous routines.

**Architecture:** Four additive deliverables — no existing files modified. Two markdown knowledge files (`company/connections.md`, `brain/ead_framework.md`), one Claude Code skill (`.claude/skills/system-audit/SKILL.md`), and four scheduled routines via `/schedule`. Built in dependency order: connections manifest first (referenced by audit and routines), EAD module (standalone), audit skill (references manifest), routines last (references manifest + includes audit).

**Tech Stack:** Markdown, Claude Code SKILL.md format, Claude Code `/schedule` system, PowerShell for file-age checks within the skill.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `company/connections.md` | Single registry of all MCP servers, API connectors, and dashboard integrations |
| Create | `brain/ead_framework.md` | EAD consulting methodology reference module |
| Create | `.claude/skills/system-audit/SKILL.md` | Four-layer system health audit skill (Context/Connections/Capabilities/Cadence) |
| Schedule | Morning Briefing routine | Daily 07:30 GMT weekdays — intelligence gathering |
| Schedule | WorkSage Health Check routine | Daily 06:00 GMT — silent unless degraded |
| Schedule | Weekly Client Digest routine | Friday 17:00 GMT — client activity synthesis |
| Schedule | System Audit routine | Monday 08:00 GMT — invokes `/system-audit` |

---

### Task 1: Create Connections Manifest

**Files:**
- Create: `company/connections.md`

- [ ] **Step 1: Write the connections manifest**

Create `company/connections.md` with this exact content:

```markdown
# Connections Registry

Last verified: 2026-05-15

---

## MCP Servers (Claude.ai Remote)

Services managed by claude.ai's OAuth. Available in Claude Code conversations automatically.

| Service | What It Accesses | Auth Method | Status |
|---------|-----------------|-------------|--------|
| Gmail | Read/send email, drafts, labels, threads | Google OAuth2 (claude.ai managed) | Active |
| Google Calendar | Events, availability, scheduling, suggest time | Google OAuth2 (claude.ai managed) | Active |
| Google Drive | Files, search, permissions, download/upload | Google OAuth2 (claude.ai managed) | Active |
| Slack | Channels, messages, search, users, canvases | Bot token (claude.ai managed) | Active |
| Miro | Boards, items, diagrams, tables, images, docs | Token (claude.ai managed) | Active |
| Granola | Meeting transcripts, folders, account info | OAuth (claude.ai managed) | Active |
| Gamma | Presentations, documents, webpages, templates | OAuth (claude.ai managed) | Active |

---

## MCP Servers (Local)

Self-hosted MCP servers configured in `.mcp.json` or user-level settings.

| Service | What It Accesses | Auth Method | Status |
|---------|-----------------|-------------|--------|
| Foundry VTT | Actors, journals, scenes, compendiums, tokens, maps | Local WebSocket | Active |
| Blender | 3D scenes, objects, textures, Polyhaven/Sketchfab/Hyper3D generation | Local WebSocket | Active |
| Desktop Commander | File ops, processes, system commands, search | Local | Active |
| Context7 | Library/framework documentation lookup | API | Active |
| Telegram | Messages, chats, contacts, media, channels, groups | Bot token (TELEGRAM_BOT_TOKEN) | Active |
| PPT | PowerPoint creation, slides, charts, tables, shapes | Local (pptxgenjs) | Active |
| MS365 | Mail, calendar, OneDrive, contacts, search | MSAL client credentials (AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET) | Active |
| Apify | Web scraping actors, datasets, key-value stores | Token (APIFY_TOKEN) | Active |

---

## Direct API Connectors (`~/.claude/connectors/`)

REST API library with CLI interface. Use for scripted/batch operations where MCP conversation flow is unnecessary.

**CLI:** `node C:\Users\gpbea\.claude\connectors\cli.js <service> <action> [--param value]`
**Help:** `node C:\Users\gpbea\.claude\connectors\cli.js <service> help`

| Service | What It Accesses | Auth Method | Manifest |
|---------|-----------------|-------------|----------|
| telegram | Bot API: messages, chats, updates | TELEGRAM_BOT_TOKEN | `manifests/telegram-api.md` |
| gmail | Email, drafts, labels, threads | Google OAuth2 | `manifests/gmail-api.md` |
| gcalendar | Events, calendars, free/busy | Google OAuth2 (shared with Gmail) | `manifests/gcalendar-api.md` |
| gdrive | Files, folders, permissions, export | Google OAuth2 (shared with Gmail) | `manifests/gdrive-api.md` |
| msgraph | Mail, calendar, OneDrive, contacts | MSAL client credentials | `manifests/msgraph-api.md` |
| miro | Boards, items, members | MIRO_ACCESS_TOKEN | `manifests/miro-api.md` |
| slack | Channels, messages, users, reactions | SLACK_BOT_TOKEN | `manifests/slack-api.md` |
| apify | Actors, runs, datasets, key-value stores | APIFY_TOKEN | `manifests/apify-api.md` |
| pptx | PowerPoint generation (slides, charts, tables) | Local (no auth) | — |

### Wiring a New Capability

1. Read the manifest for the target service in `manifests/`
2. Find the endpoint in the "Available" section
3. Add the function to `lib/<service>.js` following the existing fetch-helper pattern
4. Move the endpoint from "Available" to "Implemented" in the manifest
5. Test via CLI: `node cli.js <service> <newAction> --params`

---

## Overlap Notes

Several services are available via both MCP and direct connector:

| Service | MCP Use Case | Connector Use Case |
|---------|-------------|-------------------|
| Gmail / GCal / GDrive | Conversational queries ("check my calendar") | Batch operations, scheduled data pulls |
| Telegram | Interactive chat, media handling | Bot API automation, message sends from routines |
| MS365 | Conversational email/calendar queries | Scripted batch operations |
| Slack | Reading channels, interactive replies | Automated message sends, bulk search |
| Apify | Interactive actor runs, browsing results | Scripted scraping pipelines |
| Miro | Board interaction, diagram creation | Programmatic board manipulation |

**Rule of thumb:** MCP for conversational use within a Claude session. Connector for automation, routines, and anything that runs without a human in the loop.

---

## Dashboard Server Integrations

Services wired into `dashboard-server/server.js` directly (not via MCP or connector).

| Integration | Purpose | Auth / Config |
|-------------|---------|--------------|
| PostgreSQL | WorkSage data (nbi_dashboard DB, port 5432) | DATABASE_URL / ADMIN_DATABASE_URL |
| Azure MSAL | User authentication | AZURE_TENANT_ID / CLIENT_ID / CLIENT_SECRET |
| Prometheus | `/metrics` endpoint via `prom-client` | None (local) |
| Cloudflare Tunnel | Public access at worksage.nbi-consulting.com | Tunnel config |
| PM2 | Process management (`nbi-dashboard` on :8888, `nbi-dashboard-staging` on :8887) | Local CLI |

---

## MCPs Kept vs Replaced

The direct connector library replaces these MCPs (remove only after verifying connector works):
- **Local MCPs (.mcp.json):** telegram, ppt
- **User-level MCPs:** ms365, apify
- **Claude.ai remote:** Gmail, Google Calendar, Google Drive, Miro, Slack

**MCPs with no connector replacement (kept):** Foundry VTT, Blender, Desktop Commander, Context7, Granola, Gamma
```

- [ ] **Step 2: Verify file renders correctly**

Run: `Get-Content "d:\OneDrive\Claude_code\NBIAI_TEAM\company\connections.md" | Select-Object -First 5`
Expected: The header and "Last verified" line appear correctly.

- [ ] **Step 3: Commit**

```bash
git add company/connections.md
git commit -m "docs: add connections registry — single manifest of all MCP servers, API connectors, and integrations

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Create EAD Brain Module

**Files:**
- Create: `brain/ead_framework.md`

- [ ] **Step 1: Write the EAD framework brain module**

Create `brain/ead_framework.md` with this exact content:

```markdown
# EAD Framework — Process Optimisation Methodology

**Last Updated:** 2026-05-15

---

## The EAD Rule

For every process you touch, ask three questions in strict order:

### 1. Eliminate

**"Does this need to exist at all?"**

Before optimising a process, challenge whether it should exist. Most organisations carry processes that were created for a reason that no longer applies: a compliance requirement that changed, a stakeholder who left, a tool limitation that was fixed, a workaround that became permanent.

**Questions to ask:**
- What happens if we stop doing this entirely?
- Who would notice? How quickly?
- Is this serving the business or serving the process?
- Was this created as a workaround? Does the original constraint still exist?

**Kill criteria:** If stopping the process for two weeks would go unnoticed, or if the only justification is "we've always done it", eliminate it.

### 2. Automate

**"Can a system do this without human judgement?"**

If the process survives the Eliminate gate, ask whether it requires human thinking or just human hands. Processes that follow predictable rules, operate on structured data, and produce deterministic outputs are automation candidates.

**Good automation targets:**
- Data transformation and formatting
- Status aggregation and reporting
- Threshold monitoring and alerting
- Scheduled information gathering
- Template-driven document generation
- Cross-system data synchronisation

**Poor automation targets (keep human):**
- Relationship-dependent decisions
- Ambiguous or context-heavy judgement calls
- Creative strategy requiring taste
- Anything where the cost of a wrong answer exceeds the cost of a slow answer

### 3. Delegate

**"Who or what should own this?"**

If it can't be eliminated or fully automated, delegate it to the right level. Delegation isn't just "give it to someone junior." It's matching the process to the appropriate capability tier.

**Delegation tiers:**
- **AI agent (routine):** Scheduled, autonomous, no human in loop. Daily briefs, monitoring, data pulls.
- **AI agent (supervised):** AI does the work, human reviews before it ships. Draft documents, analysis, recommendations.
- **Junior human:** Process is well-defined, training is straightforward, judgement required is bounded.
- **Senior human:** Process requires experience, relationships, or strategic judgement.
- **Owner (Glen):** Only if it requires Glen's specific relationships, authority, or taste. Everything else should be delegated away from the owner.

---

## Applying EAD to Client Engagements

When scoping AI operations work for a client studio:

1. **Audit phase:** Map every recurring process the studio runs (weekly reports, sprint ceremonies, competitive monitoring, QA pipelines, release checklists, etc.)
2. **EAD pass:** Run each process through Eliminate, Automate, Delegate in order
3. **Deliverable:** A process map showing: eliminated (with justification), automated (with implementation approach), delegated (with tier assignment and ownership)
4. **Priority:** Automate the highest-frequency, lowest-judgement processes first. These deliver visible ROI fastest and build trust for the harder changes.

---

## Anti-patterns

- **Automating before eliminating:** Building a sophisticated system to do something that shouldn't be done at all
- **Delegating without defining:** Handing off a process without clear inputs, outputs, and success criteria
- **Eliminating by neglect:** Stopping a process without telling anyone, then discovering it mattered
- **Over-automating:** Automating processes that change frequently; the maintenance cost exceeds the execution cost
```

- [ ] **Step 2: Verify file renders correctly**

Run: `Get-Content "d:\OneDrive\Claude_code\NBIAI_TEAM\brain\ead_framework.md" | Select-Object -First 5`
Expected: The title and "Last Updated" line appear correctly.

- [ ] **Step 3: Commit**

```bash
git add brain/ead_framework.md
git commit -m "docs: add EAD framework brain module — Eliminate/Automate/Delegate consulting methodology

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Create System Audit Skill

**Files:**
- Create: `.claude/skills/system-audit/SKILL.md`

- [ ] **Step 1: Create the skill directory**

Run: `New-Item -ItemType Directory -Path "d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\skills\system-audit" -Force`

- [ ] **Step 2: Write the system-audit skill**

Create `.claude/skills/system-audit/SKILL.md` with this exact content:

````markdown
---
name: system-audit
description: "Four-layer health check of the NBI AIOS. Scores Context, Connections, Capabilities, and Cadence (25 points each). Produces a gap report with top-3 actions. Use when: system health, audit, check connections, check brain, stale files, are routines running, AIOS health, system check, weekly audit, connections status, brain freshness."
user-invocable: true
---

# System Audit

Read-only health check of the NBI AI Operating System. Scores four layers at 25 points each. Produces a markdown report with a Top 3 Actions section.

**Constraint:** This skill is read-only. It reports problems but never fixes them automatically.
**Target:** Under 60 seconds total execution time. No deep file analysis or live data fetches.

---

## Layer 1: Context (25 points)

Check the freshness and consistency of the system's knowledge layer.

### Checks

**1.1 NBI_Brain.md freshness (5 pts)**
Run: `(Get-Item "d:\OneDrive\Claude_code\NBIAI_TEAM\NBI_Brain.md").LastWriteTime`
- PASS (5 pts): Modified within last 30 days
- WARN (2 pts): Modified 31-60 days ago
- FAIL (0 pts): Modified >60 days ago

**1.2 Brain modules freshness (5 pts)**
Run: `Get-ChildItem "d:\OneDrive\Claude_code\NBIAI_TEAM\brain\*.md" | Select-Object Name, LastWriteTime | Sort-Object LastWriteTime`
- PASS (5 pts): All modules modified within 60 days
- WARN (2 pts): 1-3 modules older than 60 days
- FAIL (0 pts): 4+ modules older than 60 days
- List any stale modules by name and age

**1.3 Memory index consistency (5 pts)**
Read `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI-TEAM\memory\MEMORY.md` and list all .md files linked in it.
Then run: `Get-ChildItem "C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI-TEAM\memory\*.md" -Exclude MEMORY.md | Select-Object Name`
- PASS (5 pts): Every memory file has an index entry AND every index entry has a file
- WARN (2 pts): 1-2 orphaned files or missing entries
- FAIL (0 pts): 3+ inconsistencies
- List any orphaned files (exist on disk, not in index) and phantom entries (in index, no file)

**1.4 Live state freshness (5 pts)**
Run: `Get-ChildItem "d:\OneDrive\Claude_code\NBIAI_TEAM\projects\nbi_dashboard\live_state\*.md" | Select-Object Name, LastWriteTime`
- PASS (5 pts): All files modified within 7 days
- WARN (2 pts): 1-2 files older than 7 days
- FAIL (0 pts): 3+ files older than 7 days

**1.5 Session log recency (5 pts)**
Run: `Get-ChildItem "d:\OneDrive\Claude_code\NBIAI_TEAM\projects\nbi_dashboard\session_logs\*.md" | Sort-Object LastWriteTime -Descending | Select-Object -First 1`
- PASS (5 pts): Most recent log is within 3 days
- WARN (2 pts): Most recent log is 4-7 days old
- FAIL (0 pts): Most recent log is >7 days old or no logs exist

---

## Layer 2: Connections (25 points)

Check that external systems are reachable and the registry is current.

### Checks

**2.1 Connections manifest freshness (5 pts)**
Read `company/connections.md` and parse the "Last verified" date from the header.
- PASS (5 pts): Verified within 14 days
- WARN (2 pts): Verified 15-30 days ago
- FAIL (0 pts): Verified >30 days ago or file missing

**2.2 Direct API connector pings (10 pts)**
For each connector, run the help command and check for a clean exit:
```
node C:\Users\gpbea\.claude\connectors\cli.js telegram help
node C:\Users\gpbea\.claude\connectors\cli.js gmail help
node C:\Users\gpbea\.claude\connectors\cli.js gcalendar help
node C:\Users\gpbea\.claude\connectors\cli.js gdrive help
node C:\Users\gpbea\.claude\connectors\cli.js msgraph help
node C:\Users\gpbea\.claude\connectors\cli.js miro help
node C:\Users\gpbea\.claude\connectors\cli.js slack help
node C:\Users\gpbea\.claude\connectors\cli.js apify help
```
- PASS (10 pts): All 8 return without error (exit code 0, or recognisable help output)
- WARN (5 pts): 1-2 fail
- FAIL (0 pts): 3+ fail
- List any that failed with the error message

**2.3 MCP server availability (10 pts)**
Check which MCP tools are visible in the current session by examining the deferred tools list in the system-reminder context. Cross-reference against `company/connections.md` Active entries.
- PASS (10 pts): All Active MCP servers have visible tools
- WARN (5 pts): 1-2 Active servers missing
- FAIL (0 pts): 3+ Active servers missing
- List any servers marked Active but not visible

---

## Layer 3: Capabilities (25 points)

Check the health of skills and roles.

### Checks

**3.1 Skills inventory (8 pts)**
Run: `Get-ChildItem "d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\skills" -Directory | ForEach-Object { $skill = $_.Name; $has = Test-Path "$($_.FullName)\SKILL.md"; [PSCustomObject]@{Skill=$skill; HasSkillMd=$has} }`
- PASS (8 pts): All skill directories contain a SKILL.md
- WARN (4 pts): 1-2 missing SKILL.md
- FAIL (0 pts): 3+ missing SKILL.md
- List any skill directories without SKILL.md

**3.2 Roles completeness (8 pts)**
Run: `Get-ChildItem "d:\OneDrive\Claude_code\NBIAI_TEAM\roles" -Directory -Exclude _template | ForEach-Object { $role = $_.Name; $hasPersona = Test-Path "$($_.FullName)\persona.md"; $hasResp = Test-Path "$($_.FullName)\responsibilities.md"; [PSCustomObject]@{Role=$role; Persona=$hasPersona; Responsibilities=$hasResp} }`
- PASS (8 pts): All roles have both persona.md and responsibilities.md
- WARN (4 pts): 1-3 roles missing a file
- FAIL (0 pts): 4+ roles incomplete
- List any incomplete roles and what they're missing

**3.3 CLAUDE.md hygiene (9 pts)**
Read `CLAUDE.md` and search for any occurrences of: TODO, TBD, FIXME, HACK, XXX (case-insensitive).
- PASS (9 pts): No markers found
- WARN (4 pts): 1-2 markers
- FAIL (0 pts): 3+ markers
- List any found with their line context

---

## Layer 4: Cadence (25 points)

Check that autonomous routines are scheduled and firing.

### Checks

**4.1 Expected routines exist (15 pts)**
The following routines should be scheduled:

| Routine | Expected Schedule |
|---------|------------------|
| Morning Briefing | Weekdays 07:30 GMT |
| WorkSage Health Check | Daily 06:00 GMT |
| Weekly Client Digest | Fridays 17:00 GMT |
| System Audit | Mondays 08:00 GMT |

List active scheduled routines (via CronList or equivalent). Compare against the expected set.
- PASS (15 pts): All 4 routines are scheduled
- WARN (7 pts): 1-2 missing
- FAIL (0 pts): 3+ missing or no routines at all
- List any missing routines

**4.2 Routine health (10 pts)**
For each scheduled routine, check when it last fired (if the scheduling system exposes this).
- PASS (10 pts): All routines fired within their expected window
- WARN (5 pts): 1 routine missed its last window
- FAIL (0 pts): 2+ routines missed or no firing data available
- If firing data is not available from the scheduling system, score WARN (5 pts) and note "Firing history not available — manual verification needed"

---

## Report Generation

After running all checks, compile the results into this format:

```
# System Audit Report — [TODAY'S DATE]

## Overall Score: [TOTAL]/100

### Context: [SCORE]/25
| Check | Status | Detail |
|-------|--------|--------|
| 1.1 NBI_Brain.md freshness | [PASS/WARN/FAIL] | [Detail] |
| 1.2 Brain modules freshness | [PASS/WARN/FAIL] | [Detail] |
| 1.3 Memory index consistency | [PASS/WARN/FAIL] | [Detail] |
| 1.4 Live state freshness | [PASS/WARN/FAIL] | [Detail] |
| 1.5 Session log recency | [PASS/WARN/FAIL] | [Detail] |

### Connections: [SCORE]/25
| Check | Status | Detail |
|-------|--------|--------|
| 2.1 Manifest freshness | [PASS/WARN/FAIL] | [Detail] |
| 2.2 API connector pings | [PASS/WARN/FAIL] | [Detail] |
| 2.3 MCP availability | [PASS/WARN/FAIL] | [Detail] |

### Capabilities: [SCORE]/25
| Check | Status | Detail |
|-------|--------|--------|
| 3.1 Skills inventory | [PASS/WARN/FAIL] | [Detail] |
| 3.2 Roles completeness | [PASS/WARN/FAIL] | [Detail] |
| 3.3 CLAUDE.md hygiene | [PASS/WARN/FAIL] | [Detail] |

### Cadence: [SCORE]/25
| Check | Status | Detail |
|-------|--------|--------|
| 4.1 Expected routines | [PASS/WARN/FAIL] | [Detail] |
| 4.2 Routine health | [PASS/WARN/FAIL] | [Detail] |

## Top 3 Actions
1. [Highest priority gap — specific file/system and what to do]
2. [Second priority]
3. [Third priority]
```

Present the report directly in the conversation. Do not write it to a file unless Glen asks.
````

- [ ] **Step 3: Verify skill directory and file exist**

Run: `Test-Path "d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\skills\system-audit\SKILL.md"`
Expected: `True`

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/system-audit/SKILL.md
git commit -m "feat: add /system-audit skill — four-layer AIOS health check with scored gap report

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Schedule Morning Briefing Routine

This task and the following three use the `/schedule` skill to create cloud routines. Each routine is set up independently.

- [ ] **Step 1: Create the Morning Briefing routine**

Use the `/schedule` skill to create a scheduled routine with these parameters:

**Name:** NBI Morning Briefing
**Schedule:** Weekdays at 07:30 GMT (`30 7 * * 1-5`)
**Prompt:**

```
You are running the NBI Morning Briefing routine. Gather intelligence for Glen's day. Do NOT send messages, make decisions, or modify any state. Read-only intelligence gathering only.

1. **Calendar:** Use Google Calendar MCP to get today's events. List each meeting with time, title, and attendees.

2. **Email:** Use Gmail MCP to search for overnight emails (since 18:00 yesterday). Flag anything from: Dino, Konstantinos, Vardis, Aris, Lorenza, Steve Green, Robin, Valeria. Also flag starred/important items.

3. **Slack:** Use Slack MCP to check for unread messages in Couch Heroes channels since yesterday evening. Summarise any threads Glen is mentioned in.

4. **WorkSage bugs:** Read the file at projects/nbi_dashboard/live_state/pending_tasks.md. Note any bugs in please_review or open status.

5. **Today's queue:** Read projects/nbi_dashboard/live_state/pending_tasks.md for the current task queue.

Format the output as:

## Morning Briefing — [TODAY'S DATE]

### Needs Attention
[Items requiring Glen's action today — meetings, urgent emails, bug reviews]

### FYI
[Informational items — non-urgent emails, Slack activity, status updates]

### Today's Schedule
[Calendar events in chronological order]

Keep it concise. No waffle. If a section has no items, write "Nothing overnight."
```

- [ ] **Step 2: Verify the routine was created**

Confirm the schedule system acknowledges the routine. Note the routine ID for reference.

---

### Task 5: Schedule WorkSage Health Check Routine

- [ ] **Step 1: Create the WorkSage Health Check routine**

Use the `/schedule` skill to create a scheduled routine with these parameters:

**Name:** WorkSage Health Check
**Schedule:** Daily at 06:00 GMT (`0 6 * * *`)
**Prompt:**

```
You are running the WorkSage Health Check routine. Check whether the dashboard server is healthy. Only alert Glen if something is wrong — if everything is green, respond with just "All systems green" and do NOT send a push notification.

Run these checks:

1. **HTTP health:** Fetch http://localhost:8888/api/health (or http://localhost:8888/ if no health endpoint). Server should respond with 200.

2. **PM2 status:** Run `pm2 jlist` and check that the process named "nbi-dashboard" has status "online". Note uptime and restart count. Flag if restart count > 0 in the last 24 hours.

3. **Database:** Run `pm2 logs nbi-dashboard --lines 20 --nostream` and check for any "ECONNREFUSED" or "database" error messages in recent logs.

4. **Public access:** Fetch https://worksage.nbi-consulting.com and check for a 200 response (Cloudflare Tunnel health).

If ALL checks pass: respond "All systems green. Uptime: [X]. No alerts." — no push notification needed.

If ANY check fails: respond with the specific failure and send a push notification:

## WorkSage Alert — [TODAY'S DATE]

| Check | Status | Detail |
|-------|--------|--------|
| HTTP :8888 | PASS/FAIL | [detail] |
| PM2 process | PASS/FAIL | [detail] |
| Database logs | PASS/FAIL | [detail] |
| Public URL | PASS/FAIL | [detail] |

**Action needed:** [Specific remediation step]
```

- [ ] **Step 2: Verify the routine was created**

Confirm the schedule system acknowledges the routine. Note the routine ID.

---

### Task 6: Schedule Weekly Client Digest Routine

- [ ] **Step 1: Create the Weekly Client Digest routine**

Use the `/schedule` skill to create a scheduled routine with these parameters:

**Name:** Weekly Client Digest
**Schedule:** Fridays at 17:00 GMT (`0 17 * * 5`)
**Prompt:**

```
You are running the Weekly Client Digest routine. Synthesise this week's client activity into a structured report for Glen's end-of-week review.

Gather from each source:

1. **Couch Heroes (Slack):** Use Slack MCP to search Couch Heroes channels for this week's messages. Summarise: volume of activity, any threads Glen is tagged in, any open decisions or blockers mentioned. Key contacts: Vardis (CEO), Aris (COO), Lorenza (HR), Robin (Game Director), Valeria (Head of Production).

2. **Sarge Universe (Telegram):** Use Telegram MCP to check messages with Steve Green this week. Summarise any action items or updates.

3. **WorkSage / Internal:** Read projects/nbi_dashboard/live_state/work_completed.md for features/fixes shipped this week. Read projects/nbi_dashboard/live_state/pending_tasks.md for current bug counts and status.

4. **Pipeline:** Read brain/clients_detailed.md for current client and pipeline context. Note any leads or prospects that should have had activity this week.

Format as:

## Weekly Client Digest — Week of [DATE]

### Couch Heroes
- [Activity summary, open items, flags]

### Sarge Universe
- [Activity summary with Steve Green]

### WorkSage / Internal
- Bugs: [X] opened, [Y] closed, [Z] in review
- Features shipped: [list]
- Pending: [count] items in queue

### Pipeline
- [Any movement or items needing follow-up]

### Attention Items for Next Week
- [Anything that needs action Monday]

Keep each section to 3-5 bullets maximum. Flag items that need Glen's personal attention.
```

- [ ] **Step 2: Verify the routine was created**

Confirm the schedule system acknowledges the routine. Note the routine ID.

---

### Task 7: Schedule System Audit Routine

- [ ] **Step 1: Create the System Audit routine**

Use the `/schedule` skill to create a scheduled routine with these parameters:

**Name:** Weekly System Audit
**Schedule:** Mondays at 08:00 GMT (`0 8 * * 1`)
**Prompt:**

```
Run the /system-audit skill. Present the full report including the overall score, per-layer breakdown, and Top 3 Actions.
```

- [ ] **Step 2: Verify the routine was created**

Confirm the schedule system acknowledges the routine. Note the routine ID.

---

### Task 8: Final Verification and Commit Routines

- [ ] **Step 1: Verify all four files exist**

Run:
```powershell
@("company\connections.md", "brain\ead_framework.md", ".claude\skills\system-audit\SKILL.md") | ForEach-Object { $path = "d:\OneDrive\Claude_code\NBIAI_TEAM\$_"; [PSCustomObject]@{File=$_; Exists=(Test-Path $path)} }
```
Expected: All three show `Exists: True`.

- [ ] **Step 2: List all scheduled routines**

Use CronList or equivalent to confirm all four routines are scheduled:
- Morning Briefing (weekdays 07:30)
- WorkSage Health Check (daily 06:00)
- Weekly Client Digest (Fridays 17:00)
- System Audit (Mondays 08:00)

- [ ] **Step 3: Run the system audit skill manually**

Invoke `/system-audit` to produce the first baseline report. This validates the skill works and gives Glen a starting score.

- [ ] **Step 4: Update the connections manifest "Last verified" date**

After the audit confirms connector pings work, update the "Last verified" date in `company/connections.md` to today's date if any connections were verified during the audit.

- [ ] **Step 5: Final commit for any remaining changes**

```bash
git add -A
git commit -m "feat: complete AIOS extensions — connections manifest, EAD module, system-audit skill, 4 scheduled routines

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
