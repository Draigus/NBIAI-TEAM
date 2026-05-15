# AIOS Extensions Design Spec

**Date:** 2026-05-15
**Origin:** Gap analysis from Nate Herk's "Build & Sell Claude Code Operating Systems" course review
**Scope:** Four deliverables extending NBI's existing Claude Code operating system with the missing "Cadence" layer, a connections registry, a system health audit skill, and an EAD consulting methodology module.

---

## Context

NBI's Claude Code operating system already has strong Context (NBI_Brain.md + 13 brain modules), Connections (41 skills, 33 roles, 14+ MCP servers, 9 direct API connectors), and Capabilities (custom skills, model tier routing, approval gates, session continuity). The gap identified is **Cadence** - autonomous operations running without Glen present - plus supporting infrastructure that makes cadence reliable.

The course's "Four Cs" framework (Context, Connections, Capabilities, Cadence) provides the architectural lens. NBI's system maps to it cleanly, with Cadence as the missing layer.

---

## Deliverable 1: Connections Manifest

**File:** `company/connections.md`
**Purpose:** Single source of truth for every external system Claude Code can reach. Replaces guesswork at session start with a scannable registry.

### Structure

Three tables covering the full connection surface:

**MCP Servers (Claude.ai Remote):** Services managed by claude.ai's OAuth. Gmail, Google Calendar, Google Drive, Slack, Miro, Granola, Gamma. Each row: service name, what it accesses, auth method, status.

**MCP Servers (Local):** Self-hosted MCP servers. Foundry VTT, Blender, Desktop Commander, Context7, Telegram, PPT, MS365, Apify. Each row: service name, what it accesses, auth method, status.

**Direct API Connectors (`~/.claude/connectors/`):** REST API library with CLI interface. Telegram, Gmail, GCal, GDrive, MS Graph, Miro, Slack, Apify, PPTX. Each row: service name, what it accesses, auth method, manifest file reference.

**Overlap Notes:** Documents where the same service is available via both MCP and connector, with guidance on when to use which (MCP for conversational use, connector for scripted/batch operations).

**Dashboard Server Integrations:** PostgreSQL, Azure MSAL, Prometheus, Cloudflare Tunnel, PM2.

### Maintenance Rule

When a connection is added, removed, or breaks, update this file. The system audit skill flags stale entries via the "Last verified" date at the top of the file.

---

## Deliverable 2: EAD Brain Module

**File:** `brain/ead_framework.md`
**Purpose:** Consulting methodology reference for process optimisation. Adapted from the "Three Ms" framework (Mindset/Method/Machine), distilled to the actionable core.

### The EAD Rule

For every process, ask three questions in strict order:

**1. Eliminate** - "Does this need to exist at all?" Challenge whether the process should exist. Kill criteria: if stopping it for two weeks goes unnoticed, or the only justification is inertia.

**2. Automate** - "Can a system do this without human judgement?" Good targets: data transformation, status aggregation, threshold monitoring, scheduled gathering, template-driven generation, cross-system sync. Poor targets: relationship-dependent decisions, ambiguous judgement, creative strategy, anything where wrong-answer cost exceeds slow-answer cost.

**3. Delegate** - "Who or what should own this?" Five tiers: AI agent (routine/autonomous), AI agent (supervised/human reviews), junior human, senior human, owner (Glen - only if it requires his specific relationships, authority, or taste).

### Client Application

When scoping AI operations for a client studio:
1. Audit: map every recurring process
2. EAD pass: run each through the three gates
3. Deliverable: process map showing eliminated/automated/delegated with justifications
4. Priority: automate highest-frequency, lowest-judgement processes first

### Anti-patterns

- Automating before eliminating (building sophisticated systems for work that shouldn't be done)
- Delegating without defining (handoff without clear inputs/outputs/success criteria)
- Eliminating by neglect (stopping without telling anyone)
- Over-automating (maintenance cost exceeds execution cost for frequently-changing processes)

---

## Deliverable 3: System Audit Skill

**Skill:** `.claude/skills/system-audit/SKILL.md`
**Invocation:** `/system-audit`
**Also scheduled:** Weekly (Monday morning), designed in Deliverable 4

### What It Checks (Four Layers, 25 Points Each)

**Context Layer (25 pts):**
- `NBI_Brain.md` last modified date (stale if >30 days)
- Each `brain/*.md` module last modified (flag if >60 days)
- Memory file count vs MEMORY.md index consistency (orphaned files, missing entries)
- `live_state/` files freshness (stale if >7 days)
- Recent session log existence (flag if last log >3 days old)

**Connections Layer (25 pts):**
- `company/connections.md` "Last verified" date (flag if >14 days)
- Direct API Connector pings via CLI `help` command (lightweight, no auth surface)
- MCP server availability (configured vs responding)
- Flag any connections listed Active that fail ping

**Capabilities Layer (25 pts):**
- Skills count in `.claude/skills/` with SKILL.md presence check
- Roles count in `roles/` with `persona.md` + `responsibilities.md` verification
- `CLAUDE.md` hygiene scan (no TODO/TBD/FIXME markers)
- Skills installed but not referenced in CLAUDE.md mandatory invocation table

**Cadence Layer (25 pts):**
- Active scheduled routines list
- Expected vs actual routine set (declared in skill config)
- Routines that haven't fired in their expected window

### Output

Markdown report with:
- Overall score out of 100
- Per-layer score with table of individual checks (PASS/WARN/FAIL + detail)
- Top 3 Actions section with specific, prioritised fixes

### Design Constraints

- **Read-only.** Reports problems, never fixes them automatically.
- **Fast.** Under 60 seconds. No deep file analysis or live data fetches.
- **Connector pings use `help` command only** - minimal auth surface, no data access.

---

## Deliverable 4: Cadence Layer (Scheduled Routines)

Three cloud routines via `/schedule`, plus the system audit as a fourth.

### Routine 1: Morning Briefing

**Schedule:** `30 7 * * 1-5` (weekdays, 07:30 GMT)
**Alert policy:** Always delivers

**Gathers:**
- Today's meetings from Google Calendar
- Overnight inbox highlights from Gmail (flagged/starred, known client contacts: Dino, Steve Green, Lorenza)
- Unread Slack messages in Couch Heroes channels since previous evening
- Open/please_review bugs from WorkSage bug_reports
- Today's queue from `live_state/pending_tasks.md`

**Output:** Concise bullets grouped by "Needs attention", "FYI", "Today's schedule". Push notification with full brief in session.

**Constraint:** Intelligence gathering only. No decisions, no messages sent, no state modified.

### Routine 2: WorkSage Health Check

**Schedule:** `0 6 * * *` (daily, 06:00 GMT)
**Alert policy:** Silent unless degraded

**Checks:**
- Dashboard server responding on :8888
- PM2 process `nbi-dashboard` status (running, uptime, restart count)
- Database connectivity (lightweight query)
- Cloudflare Tunnel resolution (public URL reachable)
- PM2 monit data if accessible (memory, CPU)

**Output:** Push notification only if something is degraded, with specific failure detail. Silent if all green.

### Routine 3: Weekly Client Digest

**Schedule:** `0 17 * * 5` (Fridays, 17:00 GMT)
**Alert policy:** Always delivers

**Gathers:**
- Couch Heroes: Slack activity volume, open threads, work plan status
- Lighthouse: Teams messages/calendar events from the week
- Sarge Universe: Telegram activity with Steve Green
- WorkSage: Bugs opened/closed, features moved to Done, velocity
- Pipeline: Lead/prospect activity from brain context

**Output:** Structured report by client with "Attention Items" section for next-week actions.

### Routine 4: System Audit

**Schedule:** `0 8 * * 1` (Mondays, 08:00 GMT)
**Alert policy:** Always delivers

**Action:** Invokes the `/system-audit` skill. Report lands before the Monday morning briefing context.

### Dependency Chain

- Routines reference `company/connections.md` to know which systems to query. Inactive connections are skipped, not errored.
- The system audit skill checks whether routines are firing on schedule (Cadence layer scoring).
- Morning briefing references `live_state/pending_tasks.md` (maintained by session continuity rules in CLAUDE.md).

---

## Implementation Order

1. `company/connections.md` - foundations, no dependencies
2. `brain/ead_framework.md` - standalone knowledge module
3. `.claude/skills/system-audit/SKILL.md` - references connections manifest
4. Scheduled routines via `/schedule` - references connections manifest and includes audit skill

---

## Out of Scope

- Hermes agent deployment (separate project, waiting on hardware)
- Vector database / Obsidian RAG (not needed at current brain/ scale)
- Changes to existing CLAUDE.md, skills, or dashboard code
- MCP server additions or removals
