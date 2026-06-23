---
last_verified: 2026-06-23
---

# Processes and Tools

**Last Updated:** 2026-06-23

---

## Business Tools

| Tool | Purpose | Access Notes |
|---|---|---|
| Microsoft 365 (Outlook, OneDrive, Teams) | Email, files, meetings, NBI internal comms | NBI business account: Gpryer@nbi-consulting.com |
| Microsoft Teams | NBI internal comms and Lighthouse Studios comms | WorkSage (NBI Hub) now replaces external PM tools |
| Slack | Couch Heroes daily communication | Glen's primary daily channel |
| Telegram | Sarge Universe communication | Steve Green (CEO) |
| WhatsApp | Recruitment comms | Used with Couch Heroes and other clients/business partners |
| QuickBooks | Financial and accounting | NBI's accounting tool |
| Framer | Website hosting | nbi-consulting.com |
| Excel | Various (analytics, client deliverables) | Lead tracking now in WorkSage |
| Git / GitHub | Version control | Used across all NBI engineering projects. Repository hosting, branching, pull requests, code review |
| LinkedIn | Company page | Exists but inactive. Identified as untapped asset |

---

## AI and Automation Tools

| Tool | Purpose | Access Notes |
|---|---|---|
| Claude Code | AI assistant, automation, scheduled tasks, primary working environment | Opus 4.6 (1M context). Connected MCPs: Google Calendar, Google Drive, Gmail, Granola, MS365, Slack, Miro, Gamma, Telegram, Playwright, Blender, PPT, Desktop Commander, Apify, Context7, Foundry VTT |
| Claude Chat (claude.ai) | AI projects, PRDs, research | Max plan, Opus 4.6. Active projects: NBI Consulting, PlaySage, Couch Heroes, and others |
| Codex CLI (OpenAI) | Adversarial cross-AI review, code review, plan validation | GPT-5.5 default. Global install at `C:\Users\gpbea\AppData\Roaming\npm\codex`. Used for independent verification where same-model review is insufficient |
| Granola | Meeting transcript tool | MCP connected to Claude Code. 139+ meetings synced. REST API with grn_* key |
| NBI API Connectors | Direct API library replacing 9 MCPs | At `~/.claude/connectors/`. CLI, manifests, shared auth |
| RHO Harness | Telemetry capture, improvement proposals, verification state machine | Source: `.claude/harness/`, runtime: `~/.claude/harness/`. 5 gates, 6 evidence types. Prevents unverified commits/pushes/PRs |
| Intelligence Pipeline | Proactive research, knowledge banks, daily briefs | 7 banks in `intelligence/banks/`. Cadence-driven ingest (Granola, Gmail, Slack, local files). Daily brief at `intelligence/synthesis/intelligence_brief.md` |
| WorkSage Leads | CRM / client and lead tracking | Live in WorkSage dashboard. Morning brief runs via cadence layer (Telegram + email delivery) |

---

## Glen's Personal Setup

| Item | Detail |
|---|---|
| Computer | Windows 11 PC |
| User directory | `C:\Users\gpbea` |
| OneDrive path | `D:\OneDrive` (NBI Consulting account) |
| Claude Code projects | `D:\OneDrive\Claude_code\` |
| Time zone | Europe/London (GMT / BST) |
| Working hours | 09:00 to 21:00, no lunch break |
| Personal email | gpryer@gmail.com (Gmail, MCP connected) |
| Work email | Gpryer@nbi-consulting.com (Outlook/M365) |

---

## Communication Priority Stack

Glen monitors multiple channels. In priority order:

1. **Slack** - Couch Heroes (primary daily workload)
2. **Telegram** - Steve Green / Sarge Universe
3. **WhatsApp** - Recruitment (working with Couch Heroes and other clients/business partners)
4. **Microsoft Teams** - Lighthouse Studios and NBI internal

---

## Cadence Layer (Scheduled Automation)

8 Windows Task Scheduler tasks run headless `claude -p` (Sonnet) in the working tree. Canonical registry: `company/routines.md`. Runner scripts in `scripts/cadence/`. All runs commit their output and push.

| Task | Schedule | Purpose |
|---|---|---|
| morning-brief | Weekdays 07:30 | Intelligence brief, pipeline pulse, WorkSage health, Friday client digest |
| intel-research | Weekdays 12:30 | Web research cycle (domain rotates by day of week) |
| intel-ingest | Daily 19:00 | Granola meeting ingestion (Gmail/Slack ingestion pending connector credentials) |
| recompile-banks | Daily 21:30 | Threshold-gated bank recompilation + Brain Delta |
| system-audit | Monday 08:30 | Full system audit including cadence health |
| brain-freshness | Wednesday 08:30 | Proposes Brain updates from week's session logs |
| financial-reconciliation | 1st of month 09:00 | Cross-source revenue/payroll/margin reconciliation |
| harness-improvement | Monday 09:00 | RHO diagnosis cycle, auto-apply LOW proposals |

Other scheduled jobs: Granola-to-WorkSage sync (daily 07:00, dashboard-server cron), dashboard snapshot + PM report emails (dashboard-server cron).

All cloud routines (17 at claude.ai) disabled 2026-06-11 after 27 days of failed delivery.

---

## Business Processes

The following processes exist but are not yet formally documented:

| Process | Status |
|---|---|
| New client engagement scoping and sales | TBD - not formalised |
| Proposal / SOW creation | TBD - not formalised |
| Invoicing and payment terms | TBD - not formalised |
| Reporting cadence to clients | TBD - not formalised |
| Internal comms | Microsoft Teams (NBI team) |

These processes happen but are currently ad-hoc and driven by Glen's personal workflow rather than documented procedures.

---

## Glen's Working Patterns

| Pattern | Detail |
|---|---|
| Working hours | 09:00 to 21:00 GMT/BST |
| Lunch break | None - works straight through |
| Daily stand-up | With NBI team (when he can make it) |
| Primary daily work | Couch Heroes (majority of the day) |
| Analytics hour | Regular data science and analytics hour meeting with Ruan, Stavros, and Amir (Lighthouse embedded staff) |
| Lighthouse time | ~3-4 hours per week total |
| Status updates | Preferred format: bullet points with narrative detail, weekly, delivered proactively (do not wait to be asked) |
