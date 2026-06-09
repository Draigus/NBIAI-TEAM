<!-- last_verified: 2026-06-09 -->
# CLAUDE.md — Universal Rules + Dashboard Server

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Role attribution

When loading a role's AGENT.md into your own context or a subagent prompt, announce it briefly: "Loading [role] context for this." One line, no ceremony. This lets Glen see which perspective is active and judge the output accordingly.

### Brain module routing

When the conversation enters a listed topic, load the corresponding `brain/` module into context. Same principle as role dispatch — deterministic, not ad hoc.

| Topic | Load module |
|---|---|
| Clients, client state, engagements | clients_detailed.md |
| Playsage product, modules, pricing | playsage.md |
| SalarySage product, salary data | salarysage.md |
| NBI people, team, contractors | people_directory.md |
| Strategic decisions, canon | decisions_log.md |
| Glen's working style, preferences | glen-working-profile.md |
| Dashboard/WorkSage architecture | nbi_hub.md |
| Services, consulting offerings | services_ai_operations.md |
| AI operations, EAD framework | ead_framework.md |
| Tools, processes, infrastructure | processes_tools.md |
| Website, brand, online presence | brand_website.md |
| Pending actions, follow-ups | pending_actions.md |
| Glen's career, background | career_history.md |
| Glen's personal context | personal.md |
| Financial health, cash flow, revenue, payroll, risk | financial_resilience.md |

## Session Continuity — MANDATORY

### Mechanical Rules (not judgement calls)

1. **Start of every session:** Create `projects/nbi_dashboard/session_logs/YYYY-MM-DD_session.md`. First entry = what handoff was loaded, what the starting state is.

2. **After EVERY substantive exchange** (directive from Glen, work completed, decision made): IMMEDIATELY append to the session log. Not later. Not "in a minute." Now. Each entry should include structured sections where relevant: what was completed, what is pending, what decisions were made. This replaces the separate work_completed.md, pending_tasks.md, and conversation_context.md files.

3. **Update decisions.md** — This is the ONLY separate live state file that remains. Glen's decisions, appended on the spot. This is the highest-value structured data and the only file that genuinely needs to be separate from the session log (because it is an append-only audit trail across sessions).

4. **After compaction:** Re-read the most recent session log (which now contains all state) and decisions.md. Do not ask Glen to repeat himself — the files have it.

5. **Still write full handoffs** at natural breakpoints (end of a sprint, switching focus areas). But handoffs are for session boundaries, not panic exits.

6. **Never skip logging because you're busy.** The log IS the work. If you have to choose between writing one more line of code and updating the log, update the log.

### File Locations
- Session logs: `projects/nbi_dashboard/session_logs/`
- Decisions: `projects/nbi_dashboard/live_state/decisions.md` (the only separate live state file)
- Handoffs: `projects/nbi_dashboard/session_handoffs/`

## Intelligence Pipeline — Session Start

At the start of every session:

1. Read `intelligence/synthesis/intelligence_brief.md`
2. If the brief is older than 24 hours, run `/intel-brief` to regenerate
3. In your opening message, include the "What's New" section if there IS something new.
   If nothing is new, don't mention the pipeline — just start working.
4. Read the bank summaries listed in "Most Relevant Banks Right Now" (in intelligence/synthesis/bank_summaries/)
5. If there are pending actions (bank suggestions, sensitive extracts), mention them once per session.
6. Do NOT load full banks at session start. Load them when conversation topic matches.

### Intelligence bank routing

When the conversation enters a domain covered by a knowledge bank, load the FULL bank
(up to 500 lines) from intelligence/banks/{slug}.md. Announce briefly:
"Loading [bank name] — [one sentence on what it contains and why it's relevant now]."

| Conversation involves... | Load banks |
|---|---|
| Client pitch / proposal | games_pitch_decks, client_patterns, forecast_models |
| Production planning | production_methods, forecast_models |
| Couch Heroes specifically | client_couch_heroes + whatever domain banks match |
| Hiring / team structure | hr_people_ops (if exists), personal_insights |
| Game economy / monetisation | industry_current + role knowledge |
| New client onboarding | client_patterns, games_pitch_decks |
| Forecasting / financial models | forecast_models, industry_current |

For banks not in this table: check the bank's frontmatter for role_associations.
If the currently active role matches, load the bank.

LIMIT: Maximum 2 full banks loaded per topic switch. If more are relevant,
load top 2 and mention: "Also available: [bank] if you need it."

### Proactive intelligence surfacing

After loading a bank, scan its entries against the current conversation. If you find
an entry DIRECTLY applicable (same team size, same problem, same methodology, contradicts
a stated assumption):

"The [bank] has something directly relevant — [one sentence]. [Key fact with source].
Want the full entry?"

Rules:
- Maximum 2 proactive surfaces per session (hard cap)
- Only surface if directly applicable, not just same topic
- Never surface content that came from the current conversation
- If Glen says "not now" or ignores: no more proactive surfaces this session
- DO NOT surface during deep technical work (coding, debugging, testing)

### Intelligence suppression

Full suppression rules in intelligence/config/suppression_rules.md. In short: don't
surface during debugging, don't surface tangential matches, maximum 2 proactive surfaces,
respect "not now", don't surface past 75% context.

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

**Stack:** Node.js + Express 4, PostgreSQL (via `pg`), modular `server.js` hub (~516 lines) with 41 route files in `routes/` (~12,185 lines) and 20 lib modules in `lib/` (~2,583 lines). Frontend SPA `nbi_project_dashboard.html` (~28,200 lines, inline CSS+JS). 69 migrations, 55 test files. PM2 for process management, Cloudflare Tunnel for public access at https://worksage.nbi-consulting.com.

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

After ALL items in a batch: commit as a single feat/fix commit referencing each bug ID, restart PM2 if server files changed, update the session log with work completed.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
