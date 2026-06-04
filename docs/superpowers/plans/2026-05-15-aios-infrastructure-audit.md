# AIOS Infrastructure Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure NBI AIOS knowledge architecture so roles load automatically via dispatch, context layers don't overlap, and the system works across any project type.

**Architecture:** CLAUDE.md gets a universal/dashboard split. A dispatch manifest (embedded in CLAUDE.md) routes skills and topics to composite role AGENT.md files. Brain modules remain canonical sources of truth. Memory files store incident history only.

**Tech Stack:** Markdown files, git. No application code changes.

**Spec:** `docs/superpowers/specs/2026-05-15-aios-infrastructure-audit-design.md`

---

## Phase 1: Clean (Foundation)

### Task 1: Archive contradictory memory file

**Files:**
- Modify: `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI_TEAM\memory\feedback_conversation_length.md`
- Modify: `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI_TEAM\memory\MEMORY.md`

- [ ] **Step 1: Add superseded frontmatter to feedback_conversation_length.md**

Open the file and replace the existing frontmatter with:

```markdown
---
name: Session continuity — auto-compact enabled, real-time disk logging is the safety net
description: SUPERSEDED by feedback_no_compaction.md (2026-05-07). Kept for historical context only.
metadata:
  type: feedback
superseded: 2026-05-15 — Glen reconfirmed on 2026-05-07 that compaction is unacceptable under any circumstances. See feedback_no_compaction.md for current rule.
---

_ARCHIVED: This memory is superseded. The current compaction rule is in feedback_no_compaction.md._

```

Keep the rest of the file content below the archive notice for historical reference.

- [ ] **Step 2: Update MEMORY.md — change the pointer**

In MEMORY.md, find the line:
```
- [Session continuity system](feedback_conversation_length.md) — Append-only session logging after EVERY exchange. Live state files in live_state/. See CLAUDE.md.
```

Replace with:
```
- [Session continuity system](feedback_no_compaction.md) — HARD RULE: never let system auto-compact. Write handoff at ~75% context. Session logging rules are in CLAUDE.md.
```

- [ ] **Step 3: Verify**

Read both files to confirm changes are correct. Verify MEMORY.md has no broken or duplicate entries.

### Task 2: Archive redundant user profile memory

**Files:**
- Modify: `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI_TEAM\memory\user_glen.md`
- Modify: `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI_TEAM\memory\MEMORY.md`

- [ ] **Step 1: Add superseded frontmatter to user_glen.md**

Replace the existing frontmatter with:

```markdown
---
name: Glen Pryer - User Profile
description: SUPERSEDED — canonical Glen profile lives in NBI_Brain.md Section 1. Kept for historical context.
metadata:
  type: user
superseded: 2026-05-15 — Profile content is redundant with NBI_Brain.md which is the canonical source.
---

_ARCHIVED: Glen's profile is maintained in NBI_Brain.md (Section 1: Glen Pryer — Identity). This memory file is kept for history only._

```

Keep the original content below the archive notice.

- [ ] **Step 2: Update MEMORY.md — change the pointer**

Find the line:
```
- [Glen Pryer Profile](user_glen.md) — NBI MD, 20yr gaming vet, direct style, hates generic output
```

Replace with:
```
- [Glen Pryer Profile](user_glen.md) — ARCHIVED: canonical profile in NBI_Brain.md Section 1
```

- [ ] **Step 3: Verify**

Read both files to confirm.

### Task 3: Restructure CLAUDE.md — universal/dashboard split

This is the most critical task. CLAUDE.md is the only auto-loaded file. Every rule that must be present every session stays here.

**Files:**
- Modify: `d:\OneDrive\Claude_code\NBIAI_TEAM\CLAUDE.md`

- [ ] **Step 1: Read current CLAUDE.md in full**

Read the entire file (210 lines). Identify:
- Lines to keep in Section A (Universal)
- Lines to move to Section B (Dashboard Server)
- Lines to remove (trim)

Section A (Universal) keeps:
- "What This Is" (lines 1-11) — rewrite briefly
- "Business Context" (lines 13-15) — strengthen NBI_Brain.md loading instruction
- "Repository Structure" (lines 17-25) — keep as-is
- "Knowledge Architecture" (lines 64-69) — keep as-is
- "Communication Style" (lines 87-94) — keep as-is
- "Session Continuity — MANDATORY" (lines 141-166) — keep as-is
- "Memory Enhancement (PARA)" (lines 168-184) — keep as-is
- "Mandatory Skill Invocations" (lines 186-203) — keep as-is
- "Risky Edits" (lines 205-209) — keep as-is
- NEW: Role Dispatch section (routing tables + instruction)

Section B (Dashboard Server) keeps:
- "Dashboard Server — The Codebase" (lines 27-62) — all dashboard-specific content
- "Bug Triage Pipeline" (lines 96-114) — dashboard-specific workflow

Trim (move to reference doc):
- "Model Tier Strategy" (lines 71-80) — moves to dispatch manifest context
- "Approval Gates" (lines 82-85) — replace with one-liner
- "Agent Communication Protocol" (lines 116-122) — remove
- "Adding a New Role" (lines 124-131) — remove
- "Adding a New Project" (lines 133-139) — remove

- [ ] **Step 2: Write the new CLAUDE.md**

Replace the full file with the restructured version. The new structure is:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Section A — Universal Rules (all work, any project)

## What This Is

This repository contains NBI's business knowledge, AI infrastructure, and active project work. It serves as the working environment for Glen Pryer's Claude Code sessions.

**Owner:** Glen Pryer, Managing Director, NBI Gaming / NBI Analytics Ltd

## Business Context

Read `NBI_Brain.md` at session start. It provides business context, client state, team information, and Glen's detailed working preferences. Only skip for pure isolated coding tasks where no business context is needed.

Extended modules in `brain/` provide deep-dive detail on specific topics — consult the index in Section 9 of the Brain.

## Repository Structure

- `NBI_Brain.md` - Core business context (~300 lines, read at session start)
- `brain/` - Extended Brain modules (loaded on demand by topic)
- `company/` - Company-wide configuration: org chart, policies, domain reference knowledge
- `roles/` - Agent role definitions with composite AGENT.md files for dispatch
- `projects/` - Project-specific configurations with project-level knowledge
- `pipelines/` - Reusable workflow definitions (SDLC, client delivery, BD, reporting)
- `templates/` - Output templates for common deliverables

## Knowledge Architecture

1. **Core — NBI Brain** (`NBI_Brain.md` + `brain/`): Glen's identity, how he works, business state, clients, team, AI infrastructure. The Brain is the single source of truth for all NBI business information
2. **Domain Reference** (`company/knowledge/gaming_industry_context.md`): Gaming industry platforms, genres, business models, terminology
3. **Role Knowledge** (`roles/{role}/AGENT.md`): Composite domain expertise files loaded via dispatch. These are the expert knowledge banks that Claude Code loads when domain depth is needed
4. **Project Knowledge** (`projects/{project}/knowledge/`): Project-specific context — briefs, requirements, status

## Communication Style

Read brain/glen-working-profile.md for working style and communication context.
- British English only — no American spellings
- Never use em dashes
- Direct, no-fluff communication
- Deep and thorough over fast and shallow
- Everything tailored to NBI's specific situation — no generic/template output
- If uncertain about a fact, say so — never fabricate

## Approval Gates

See `company/policies/approval_gates.md` for the full list. In short: auto-approve all internal work; Glen approves anything external-facing or that commits NBI financially.

## Role Dispatch

Before dispatching a subagent or starting domain-specific work, check the routing tables below. Load the relevant role's `roles/{role}/AGENT.md` into the subagent prompt or your own context. For organic topic detection, proactively load role context when the conversation clearly enters a listed domain. You do not need Glen's permission to bring expertise into the conversation — that is the purpose of the role system.

### Skill-triggered routing

| Skill | Load role |
|---|---|
| brainstorming | vp_product |
| writing-plans | vp_product + senior_engineer |
| code-review / requesting-code-review | senior_engineer |
| systematic-debugging | senior_engineer |
| test-driven-development | qa_lead |
| frontend-design | ui_ux_lead |
| game-economy-design | game_economy_consultant |
| gi (game investment) | gaming_practice_lead |

### Topic-detected routing

| Conversation involves... | Load role |
|---|---|
| Legal, contracts, IP, GDPR, compliance | general_counsel |
| Game economy, monetisation, loot, currencies | game_economy_consultant |
| UI/UX, layout, design system, accessibility | ui_ux_lead |
| Client delivery, milestones, reporting | producer |
| Hiring, compensation, team structure | head_of_people |
| Data, analytics, dashboards, pipelines | data_analyst |
| Marketing, positioning, brand, content | cmo |
| Production processes, studio ops, scheduling | production_consultant |

## Session Continuity — MANDATORY

### Mechanical Rules (not judgement calls)

1. **Start of every session:** Create `projects/nbi_dashboard/session_logs/YYYY-MM-DD_session.md`. First entry = what handoff was loaded, what the starting state is.

2. **After EVERY substantive exchange** (directive from Glen, work completed, decision made): IMMEDIATELY append to the session log. Not later. Not "in a minute." Now. This is the critical rule — if this is followed, compaction can never lose anything important.

3. **Update structured state files** in `projects/nbi_dashboard/live_state/`:
   - `decisions.md` — Glen's decisions, appended on the spot
   - `work_completed.md` — features/fixes done this session
   - `pending_tasks.md` — current task queue
   - `conversation_context.md` — running summary of conversation flow

4. **After compaction:** Re-read the session log and live state files to recover any context that was compressed. Do not ask Glen to repeat himself — the files have it.

5. **Still write full handoffs** at natural breakpoints (end of a sprint, switching focus areas). But handoffs are for session boundaries, not panic exits.

6. **Never skip logging because you're busy.** The log IS the work. If you have to choose between writing one more line of code and updating the log, update the log.

### File Locations
- Session logs: `projects/nbi_dashboard/session_logs/`
- Live state: `projects/nbi_dashboard/live_state/`
- Handoffs: `projects/nbi_dashboard/session_handoffs/`

## Memory Enhancement (PARA-inspired)

The auto-memory system (system prompt) is the primary memory mechanism. These rules extend it with patterns from Tiago Forte's PARA method:

1. **Supersession over deletion** - Never delete a memory file. When a fact becomes outdated, update the file and add a `superseded: YYYY-MM-DD` line to the frontmatter noting what changed.

2. **Staleness check at session start** - If you load a memory and it references a specific file, function, flag, or state, verify it still holds before acting on it. Memory is a claim about the past, not the present.

3. **Entity-level organisation** - For key recurring subjects, a single memory file per entity is better than scattered mentions across topic files.

4. **Periodic synthesis** - When memory files accumulate beyond 25 entries in MEMORY.md, consolidate.

5. **Four-bucket thinking** - project (active work), reference (ongoing resources), user (who Glen is), feedback (behavioural rules).

## Mandatory Skill Invocations — No Exceptions

Before making code changes, check this list. If the scenario matches, invoke the skill BEFORE writing any code.

| Scenario | Required Skill | When it applies |
|---|---|---|
| Bug, test failure, unexpected behaviour | `systematic-debugging` | Any time something is broken. Even if the fix looks obvious. |
| New feature, new component, creative work | `brainstorming` | Any time you're building something that didn't exist before. |
| Task with multiple steps or files | `writing-plans` | Any implementation touching 3+ files or requiring a sequence of changes. |
| 2+ independent tasks in one session | `dispatching-parallel-agents` | When tasks have no shared state and can run concurrently. |
| Executing a written plan | `executing-plans` or `subagent-driven-development` | When a plan document exists and you're implementing it. |
| Feature or bugfix implementation | `test-driven-development` | Server endpoints always. Frontend logic when testable. |
| About to claim work is done | `verification-before-completion` | Before saying "done", "fixed", "complete", or committing. Always. |
| Implementation complete, ready to integrate | `finishing-a-development-branch` | When tests pass and you need to decide merge/PR/cleanup. |
| Received code review feedback | `receiving-code-review` | Before implementing any review suggestion. Verify it first. |
| Risky or multi-file changes | `using-git-worktrees` | See "Risky Edits" section below. |

If you catch yourself thinking "this is simple enough to skip the skill" — that is exactly when you need it most.

## Risky Edits — Worktree First

- Any change touching >3 files in `dashboard-server/` or `nbi_project_dashboard.html`: create a worktree first via the using-git-worktrees skill.
- Any change where the agent has low confidence or is working with incomplete information: worktree first.
- Experimental refactors: always worktree.

## Freshness Check

If a brain/ module or role AGENT.md has a `last_verified` date older than 30 days, flag it to Glen at session start: "brain/clients_detailed.md hasn't been verified since [date] — should I check if it's still current?" Do not silently trust stale context.

---

# Section B — Dashboard Server (WorkSage/NBI Hub coding only)

The only executable code in this repo lives in `dashboard-server/` (Express + Postgres) plus the SPA `nbi_project_dashboard.html` at the repo root. Everything else is markdown knowledge. Memory shorthand: "NBI Hub" / "WorkSage" = this dashboard.

**Stack:** Node.js + Express 4, PostgreSQL (via `pg`), monolithic `server.js` (~9,600 lines), monolithic `nbi_project_dashboard.html` (~21,300 lines, inline CSS+JS). PM2 for process management, Cloudflare Tunnel for public access at https://worksage.nbi-consulting.com.

**Local URL:** http://localhost:8888/nbi_project_dashboard.html (production), :8887 (staging).

### Common commands (run from `dashboard-server/`)

| Command | Purpose |
|---|---|
| `npm start` | Run server.js directly (dev) |
| `npm test` | Vitest unit tests (run once) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright e2e tests against running server |
| `npm run test:all` | Vitest then Playwright — required green before claiming "done" on UI changes |
| `npm run init-db` | Initialise schema from migrations/ |
| `npx vitest run path/to/file.test.js` | Run a single test file |
| `npx vitest run -t "test name"` | Run a single test by name |
| `pm2 restart nbi-dashboard` | Restart prod process after server.js change |
| `pm2 restart nbi-dashboard-staging` | Restart :8887 staging |
| `pm2 logs nbi-dashboard --lines 100` | Tail server logs |

### Architecture facts

- **Work item hierarchy is fixed at 4 levels:** Client > Project > Feature > Story > Task. The `item_type` field is enforced server-side on create, drag-drop, and reparent. Prerequisite logic blocks "Done" until deps complete; circular deps are detected; deleting a prereq cleans up references. Don't add a 5th level or new item type without re-reading `dashboard-server/README.md` first.
- **Multi-user sync model:** incremental change polling every 10 seconds, optimistic concurrency, IndexedDB WAL on the client for crash recovery. Don't replace this with naive full-refresh.
- **Migrations:** `dashboard-server/migrations/NNN_*.sql`, applied in numeric order by `init-db.js`. Add new migration as next number; never edit a committed migration.
- **Bug Tracker = `bug_reports` + `bug_report_comments` tables.** This is the queue the Bug Triage Pipeline operates on.
- **Metrics:** `/metrics` endpoint exposes Prometheus format via `prom-client`.
- **Auth:** Azure MSAL (`@azure/msal-node`) — env vars `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` plus `DATABASE_URL`, `ADMIN_DATABASE_URL`, `APP_URL`, `EMAIL_FROM`.

### Verifying UI changes (HARD RULE)

Curl returning 200 ≠ working. For any change to `nbi_project_dashboard.html` or a server route the UI calls, verify visually before claiming done. Preferred method: run `npm run test:e2e` (Playwright). The `agent-browser` CLI tool cannot handle this SPA. For production verification, ask Glen to check at https://worksage.nbi-consulting.com.

### Bug Triage Pipeline (MANDATORY for every bug_reports item)

Glen's directive 2026-04-15: every item from the dashboard's Bug Tracker must follow this 7-step pipeline in order. No skipping, no shortcuts.

1. **Receive** — Read the full title and description from the bug_reports row. If there are existing comments, read those too.
2. **Review** — Find the relevant code. Read enough to understand what's happening. If ambiguous, ask Glen BEFORE planning.
3. **Plan** — Write down what files will change, what the fix is, and what could go wrong.
4. **Prioritise** — Quick wins first; big features last; blocked items parked.
5. **Fix** — Implement the change. Test-first for server endpoints.
6. **Test** — Run `npm test` and `npm run test:all` if frontend was touched. Both must be green.
7. **Update bug list + add comment** — Set status to `please_review`. Comment MUST: start with "Fixed." or "Done.", explain root cause in plain English, explain what changed behaviourally, end with "Please test by..." and a reproduction step.

After ALL items in a batch: commit as a single feat/fix commit referencing each bug ID, restart PM2 if server files changed, update `live_state/work_completed.md`.
```

- [ ] **Step 3: Count lines in new CLAUDE.md**

Run: `(Get-Content "d:\OneDrive\Claude_code\NBIAI_TEAM\CLAUDE.md" | Measure-Object -Line).Lines`

Target: under 200 lines. If over, identify what to trim further.

- [ ] **Step 4: Verify the file renders correctly**

Read the first 30 and last 30 lines of the new CLAUDE.md to verify no formatting errors, no broken tables, no missing sections.

- [ ] **Step 5: Commit**

```
git add CLAUDE.md
git commit -m "refactor: restructure CLAUDE.md into universal/dashboard split

- Section A: universal rules, communication style, dispatch routing, session continuity
- Section B: dashboard-specific commands, architecture, bug triage pipeline
- Trimmed: approval gates detail, agent comm protocol, role/project templates
- Added: role dispatch routing tables, freshness check instruction"
```

### Task 4: Add scope headers to decision logs

**Files:**
- Modify: `d:\OneDrive\Claude_code\NBIAI_TEAM\brain\decisions_log.md`
- Modify: `d:\OneDrive\Claude_code\NBIAI_TEAM\projects\nbi_dashboard\live_state\decisions.md`

- [ ] **Step 1: Add scope header to brain/decisions_log.md**

After the `# Decisions Log` heading and before the first entry, ensure this header exists:

```markdown
**Scope:** Company-wide canon decisions. Append-only. Entries are never edited, only added. This is the authoritative source for all NBI strategic and structural decisions.

**For dashboard-specific operational decisions, see:** `projects/nbi_dashboard/live_state/decisions.md`
```

- [ ] **Step 2: Add scope header to live_state/decisions.md**

After the `# Decisions Log` heading, add:

```markdown
**Scope:** Dashboard project (WorkSage/NBI Hub) operational decisions made during development sessions. These are tactical, not strategic.

**For company-wide canon decisions, see:** `brain/decisions_log.md`
```

- [ ] **Step 3: Commit**

```
git add brain/decisions_log.md projects/nbi_dashboard/live_state/decisions.md
git commit -m "docs: add scope headers to both decision logs to clarify canonical vs operational"
```

### Task 5: Archive queue/ directory

**Files:**
- Move: `d:\OneDrive\Claude_code\NBIAI_TEAM\queue\` to `d:\OneDrive\Claude_code\NBIAI_TEAM\_archive\queue\`

- [ ] **Step 1: Verify _archive directory exists**

Run: `Test-Path "d:\OneDrive\Claude_code\NBIAI_TEAM\_archive"`

If it doesn't exist, create it.

- [ ] **Step 2: Move queue/ to _archive/queue/**

Run: `Move-Item "d:\OneDrive\Claude_code\NBIAI_TEAM\queue" "d:\OneDrive\Claude_code\NBIAI_TEAM\_archive\queue"`

- [ ] **Step 3: Commit**

```
git add -A queue/ _archive/queue/
git commit -m "chore: archive queue/ directory — dashboard handles task management now"
```

### Task 6: Create session handoff INDEX.md

**Files:**
- Create: `d:\OneDrive\Claude_code\NBIAI_TEAM\projects\nbi_dashboard\session_handoffs\INDEX.md`

- [ ] **Step 1: List all handoff files with dates**

Run: `Get-ChildItem "d:\OneDrive\Claude_code\NBIAI_TEAM\projects\nbi_dashboard\session_handoffs\*.md" | Sort-Object Name | Select-Object Name`

- [ ] **Step 2: Read the first 5 lines of each handoff to extract the summary**

For each handoff file, read lines 1-5 to get the title and summary line.

- [ ] **Step 3: Write INDEX.md**

Create the file with this structure:

```markdown
# Session Handoff Index

Master list of all dashboard development session handoffs. One-line summary per session.

**Current state:** For the latest project state, see `live_state/` directory.

---

| Date | File | Summary |
|---|---|---|
| 2026-04-01 | handoff_2026-04-01_finances.md | [extracted from first lines] |
| 2026-04-04 | handoff_2026-04-04_finances_and_features.md | [extracted from first lines] |
| ... | ... | ... |
```

Populate every row from the handoff directory listing. The summary should be one phrase extracted from the handoff's title or first paragraph.

- [ ] **Step 4: Commit**

```
git add projects/nbi_dashboard/session_handoffs/INDEX.md
git commit -m "docs: add session handoff index for quick navigation"
```

---

## Phase 2: Build Dispatch System

### Task 7: Create composite AGENT.md — vp_product

This is the template-setting task. The pattern established here applies to all subsequent AGENT.md files.

**Files:**
- Create: `d:\OneDrive\Claude_code\NBIAI_TEAM\roles\vp_product\AGENT.md`
- Read (input): `roles/vp_product/persona.md`, `roles/vp_product/responsibilities.md`, `roles/vp_product/workflows.md`, `roles/vp_product/prompts/system_prompt.md`, `roles/vp_product/knowledge/product_context.md`

- [ ] **Step 1: Read all 5 source files for vp_product**

Read each file in full. Take note of:
- Identity and decision authority (from persona.md)
- Core responsibilities and KPIs (from responsibilities.md)
- Key workflows and escalation triggers (from workflows.md)
- System prompt framing (from system_prompt.md)
- Product-specific knowledge (from product_context.md)

- [ ] **Step 2: Write the composite AGENT.md**

Create `roles/vp_product/AGENT.md` with this structure:

```markdown
---
role: vp_product
last_verified: 2026-05-15
description: Product strategy, requirements, PM review gate, quality gatekeeper for all deliverables
dispatch_triggers:
  skills: [brainstorming, writing-plans]
  topics: [product strategy, feature prioritisation, requirements, acceptance criteria, roadmap, consulting deliverable quality]
---

# VP Product — Agent Composite

## Identity

Vice President of Product at NBI. Reports to CEO. Opus-tier role.

Product strategist and quality gatekeeper. Owns: (1) the product roadmap — deciding what gets built and in what order, and (2) the PM review gate — ensuring every deliverable meets NBI's quality bar before it is marked "done" or sent to a client.

## Decision Authority

**Autonomous:** Feature prioritisation within approved roadmap, writing requirements and acceptance criteria, rejecting sub-standard deliverables (PM review gate), defining specifications, requesting engineering estimates, organising the product backlog, scheduling reviews.

**Escalate to CEO:** Product strategy/vision changes, adding/removing Playsage modules, pricing changes, external delivery timelines, quality-vs-speed trade-offs with strategic impact, changes to canon decisions.

## Core Responsibilities

[Distilled from responsibilities.md — the 9 responsibilities compressed to their essence, 2-3 lines each max]

## Key Workflows

[Distilled from workflows.md — the 6 workflows compressed to trigger + steps + output, no more than 5 lines each]

## Product Knowledge

[Distilled from product_context.md — Playsage modules, pricing, competitive landscape, beachhead, SalarySage, NBI Website. Role-relevant summary, not a copy-paste. ~40-60 lines]

## Quality Standards (The Glen Standard)

- Shallow work is unacceptable — everything must be tailored to the specific situation
- Every data point, citation, and claim must be verified
- No corner cutting, no glossing over detail
- No generic/template output

## Communication Style

Thinks in user problems, not technical solutions. Writes unambiguous specs. Gives specific feedback with requirement references. Pushes back on quality shortcuts. British English, no em dashes, no fluff.
```

Target: 150-250 lines. Distill, don't copy-paste. The composite should read as a briefing document a subagent can ingest in one read and immediately operate as this role.

- [ ] **Step 3: Count lines**

Run: `(Get-Content "d:\OneDrive\Claude_code\NBIAI_TEAM\roles\vp_product\AGENT.md" | Measure-Object -Line).Lines`

Must be between 150-250 lines.

- [ ] **Step 4: Commit**

```
git add roles/vp_product/AGENT.md
git commit -m "feat: create VP Product composite AGENT.md for dispatch system"
```

### Task 8: Create composite AGENT.md — senior_engineer

**Files:**
- Create: `d:\OneDrive\Claude_code\NBIAI_TEAM\roles\senior_engineer\AGENT.md`
- Read (input): `roles/senior_engineer/persona.md`, `roles/senior_engineer/responsibilities.md`, `roles/senior_engineer/workflows.md`, `roles/senior_engineer/prompts/system_prompt.md`, `roles/senior_engineer/knowledge/engineering_context.md`

- [ ] **Step 1: Read all source files for senior_engineer**

Same process as Task 7.

- [ ] **Step 2: Write the composite AGENT.md**

Follow the same structure as Task 7's template. Key differences for this role:
- Focus on code quality, architecture patterns, testing discipline, PR review standards
- Include the NBI tech stack details (dashboard: Express+Postgres; Playsage: Next.js+Supabase)
- Include coding standards, testing expectations, deployment patterns
- Decision authority: technical implementation choices, code review outcomes, refactoring scope
- Escalate: architecture changes, new dependencies, performance trade-offs

Target: 150-250 lines.

- [ ] **Step 3: Count lines and commit**

Same verification as Task 7.

```
git add roles/senior_engineer/AGENT.md
git commit -m "feat: create Senior Engineer composite AGENT.md for dispatch system"
```

### Task 9: Create composite AGENT.md — general_counsel

**Files:**
- Create: `d:\OneDrive\Claude_code\NBIAI_TEAM\roles\general_counsel\AGENT.md`
- Read (input): `roles/general_counsel/persona.md`, `roles/general_counsel/responsibilities.md`, `roles/general_counsel/workflows.md`, `roles/general_counsel/prompts/system_prompt.md`, `roles/general_counsel/knowledge/legal_context.md`

- [ ] **Step 1: Read all source files for general_counsel**

Same process as Task 7.

- [ ] **Step 2: Write the composite AGENT.md**

Key focus areas for this role:
- UK corporate law framework (NBI Analytics Ltd structure)
- Citation-mandatory output (9/10 quality bar, above standard 8/10)
- Conservative risk posture — stricter interpretation when ambiguous
- Human solicitor review gate for all binding documents
- NBI entity structure: NBI Analytics Ltd (UK), NSI LLC (winding down), PlaySage USA LLC (planned)
- Regulatory landscape: ICO, HMRC, Companies House, Bribery Act
- Cross-cutting issues: IP ownership, IR35, data protection, insurance

Target: 150-250 lines.

- [ ] **Step 3: Count lines and commit**

```
git add roles/general_counsel/AGENT.md
git commit -m "feat: create General Counsel composite AGENT.md for dispatch system"
```

### Task 10: Create composite AGENT.md — remaining 9 roles (batch)

**Files:**
- Create: `roles/qa_lead/AGENT.md`
- Create: `roles/ui_ux_lead/AGENT.md`
- Create: `roles/game_economy_consultant/AGENT.md`
- Create: `roles/producer/AGENT.md`
- Create: `roles/cmo/AGENT.md`
- Create: `roles/data_analyst/AGENT.md`
- Create: `roles/head_of_people/AGENT.md`
- Create: `roles/gaming_practice_lead/AGENT.md`
- Create: `roles/cto/AGENT.md`

- [ ] **Step 1: For each role, read all source files**

For each of the 9 roles, read: persona.md, responsibilities.md, workflows.md, prompts/system_prompt.md, and any knowledge/*.md files.

- [ ] **Step 2: Write each composite AGENT.md**

Follow the same structure established in Task 7. Each file must:
- Have the frontmatter with `role`, `last_verified`, `description`, `dispatch_triggers`
- Contain Identity, Decision Authority, Core Responsibilities, Key Workflows, Domain Knowledge, and Communication Style sections
- Be 150-250 lines
- Distill rather than copy-paste
- Include role-specific domain knowledge tailored to the role's perspective

This task can be parallelised — all 9 roles are independent.

- [ ] **Step 3: Count lines for each AGENT.md**

Verify all 9 files are within the 150-250 line target.

- [ ] **Step 4: Commit all 9 as a batch**

```
git add roles/qa_lead/AGENT.md roles/ui_ux_lead/AGENT.md roles/game_economy_consultant/AGENT.md roles/producer/AGENT.md roles/cmo/AGENT.md roles/data_analyst/AGENT.md roles/head_of_people/AGENT.md roles/gaming_practice_lead/AGENT.md roles/cto/AGENT.md
git commit -m "feat: create composite AGENT.md files for 9 remaining dispatch roles"
```

### Task 11: Test the dispatch system

**Files:**
- None modified — this is a verification task

- [ ] **Step 1: Dispatch a subagent with the vp_product role loaded**

Create a test subagent with this prompt pattern:

```
You are operating as NBI's VP Product. Read roles/vp_product/AGENT.md for your full role context.

Task: Review this feature idea and provide a product perspective: "Add a client satisfaction survey to the WorkSage dashboard that sends automated email surveys after project milestones."

Evaluate: Is this the right thing to build? What's missing from the requirement? What would the acceptance criteria be?
```

Verify the response demonstrates product thinking consistent with the role definition.

- [ ] **Step 2: Dispatch a subagent with the general_counsel role loaded**

```
You are operating as NBI's General Counsel. Read roles/general_counsel/AGENT.md for your full role context.

Task: What legal considerations should NBI address before implementing automated email surveys to clients? Consider GDPR, data protection, and consent requirements.
```

Verify the response includes UK-specific legal context, citations, and conservative risk posture.

- [ ] **Step 3: Document findings**

Note any issues with the AGENT.md content quality, missing context, or dispatch mechanism. These feed into Phase 5 tuning.

---

## Phase 3: Context Efficiency and Freshness

### Task 12: Verify CLAUDE.md size and add freshness dates

**Files:**
- Verify: `d:\OneDrive\Claude_code\NBIAI_TEAM\CLAUDE.md`
- Modify: All files in `d:\OneDrive\Claude_code\NBIAI_TEAM\brain\` (add last_verified frontmatter)

- [ ] **Step 1: Count CLAUDE.md lines**

Run: `(Get-Content "d:\OneDrive\Claude_code\NBIAI_TEAM\CLAUDE.md" | Measure-Object -Line).Lines`

Must be under 200. If over, identify and trim the lowest-value content.

- [ ] **Step 2: Add last_verified to each brain/ module**

For each .md file in brain/, add or update the frontmatter:

```markdown
---
last_verified: 2026-05-15
---
```

Files to update (all .md files in brain/):
- brand_website.md
- career_history.md
- clients_detailed.md
- decisions_log.md
- ead_framework.md
- glen-working-profile.md
- nbi_hub.md
- pending_actions.md
- people_directory.md
- personal.md
- playsage.md
- processes_tools.md
- salarysage.md
- services_ai_operations.md

- [ ] **Step 3: Commit**

```
git add brain/*.md
git commit -m "docs: add last_verified dates to all brain modules for freshness tracking"
```

### Task 13: Review brain/pending_actions.md with Glen

**Files:**
- Modify: `d:\OneDrive\Claude_code\NBIAI_TEAM\brain\pending_actions.md`

- [ ] **Step 1: Read the current file**

Read brain/pending_actions.md in full.

- [ ] **Step 2: Present each item to Glen via AskUserQuestion**

For each pending item, ask Glen: is this done, still pending, or should it be archived?

Items to check (based on exploration findings):
- Jen MacLean follow-up (from March 19 — 57+ days old)
- Playsage PRD corrections (stalled)
- NBI website redesign deployment (stalled)
- SalarySage API key security (flagged urgent)
- GDC 2026 demo status
- Any other pending items in the file

- [ ] **Step 3: Update the file based on Glen's answers**

Mark completed items as DONE with date. Remove or archive items Glen says are no longer relevant. Flag items that are still active.

- [ ] **Step 4: Commit**

```
git add brain/pending_actions.md
git commit -m "docs: refresh brain/pending_actions.md — close completed items, flag active ones"
```

---

## Phase 4: Consolidate Knowledge

### Task 14: Archive duplicated role knowledge files

**Files:**
- Modify: `roles/engineer/knowledge/engineering_context.md`
- Modify: `roles/senior_engineer/knowledge/engineering_context.md`
- Modify: `roles/vp_engineering/knowledge/engineering_context.md`
- Modify: `roles/qa_engineer/knowledge/qa_context.md`
- Modify: `roles/qa_lead/knowledge/qa_context.md`
- Modify: `roles/ui_ux_designer/knowledge/design_context.md`
- Modify: `roles/ui_ux_lead/knowledge/design_context.md`

- [ ] **Step 1: For each duplicated knowledge file, add an archive header**

At the top of each file, add:

```markdown
> **Note:** This file contains legacy role knowledge that has been consolidated into the composite `AGENT.md` file in the parent role directory. The AGENT.md file is the operational version used by the dispatch system. This file is retained as the design record.
```

Do NOT delete the files. They remain as the authoritative design records; the AGENT.md composites are the operational versions.

- [ ] **Step 2: Commit**

```
git add roles/*/knowledge/*.md
git commit -m "docs: mark duplicated role knowledge files as consolidated into AGENT.md composites"
```

### Task 15: Align project knowledge files to brain/ canonical sources

**Files:**
- Modify: `d:\OneDrive\Claude_code\NBIAI_TEAM\projects\playsage\knowledge\project_context.md`
- Modify: `d:\OneDrive\Claude_code\NBIAI_TEAM\projects\salarysage\knowledge\project_context.md` (if exists)

- [ ] **Step 1: Read each project knowledge file**

Read the project_context.md files for playsage and salarysage.

- [ ] **Step 2: Add canonical source pointer**

At the top of each file, add:

```markdown
> **Canonical product context:** See `brain/playsage.md` (or `brain/salarysage.md`). This file contains project-specific operational state only — sprint progress, blockers, deliverables, and session-specific decisions.
```

- [ ] **Step 3: If the file duplicates brain/ content, trim it**

Remove any sections that are pure copies of brain/ module content (product overview, tech stack, pricing tiers). Keep only project-specific operational state.

- [ ] **Step 4: Commit**

```
git add projects/*/knowledge/*.md
git commit -m "docs: align project knowledge files to point at brain/ canonical sources"
```

### Task 16: Review memory files for staleness

**Files:**
- Modify: Various files in `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI_TEAM\memory\`

- [ ] **Step 1: Read all memory files**

Read each of the ~40 memory files. For each one, check:
- Is the content still accurate?
- Does it reference files, functions, or states that may have changed?
- Is it duplicating content that now lives in CLAUDE.md or NBI_Brain.md?

- [ ] **Step 2: Archive any that are stale or superseded**

For stale files, add `superseded:` frontmatter and archive notice (same pattern as Tasks 1-2).

- [ ] **Step 3: Update MEMORY.md**

Update any changed entries in MEMORY.md to reflect archived status.

- [ ] **Step 4: Commit memory changes**

Memory files are outside the git repo (in .claude/ directory), so no git commit needed for those. But if MEMORY.md is updated, verify the changes persist.

---

## Phase 5: Verify and Tune (Ongoing)

Phase 5 is not a set of discrete tasks — it's an ongoing process that happens during real work sessions. No implementation steps here; just the criteria to watch for:

1. **Dispatch triggering:** Are roles loading when they should? Note any misses or false triggers.
2. **AGENT.md quality:** Does the subagent produce noticeably better output with the role loaded? If not, the composite needs enrichment.
3. **Context budget:** Are sessions hitting 75% faster or slower than before? Track informally.
4. **Routing table gaps:** Are there domains that should have a role mapping but don't?
5. **Freshness mechanism:** Are stale brain modules getting flagged? Are the flags useful or annoying?

After 3-5 real sessions, review these observations and adjust the routing tables, AGENT.md content, or CLAUDE.md instructions as needed.
