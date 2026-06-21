<!-- last_verified: 2026-06-18 -->
# CLAUDE.md -- Universal Rules + Dashboard Server

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Section A -- Universal Rules (all work, any project)

## What This Is

This repository contains NBI's business knowledge, AI infrastructure, and active project work. It serves as the working environment for Glen Pryer's Claude Code sessions.

**Owner:** Glen Pryer, Managing Director, NBI Gaming / NBI Analytics Ltd

## Business Context

Read `NBI_Brain.md` at session start. It provides business context, client state, team information, and Glen's detailed working preferences. Only skip for pure isolated coding tasks where no business context is needed.

Extended modules in `brain/` provide deep-dive detail on specific topics -- consult the index in Section 9 of the Brain.

## Repository Structure

- `NBI_Brain.md` - Core business context (~300 lines, read at session start)
- `brain/` - Extended Brain modules (loaded on demand by topic)
- `company/` - Company-wide configuration: org chart, policies, domain reference knowledge
- `roles/` - Agent role definitions with composite AGENT.md files for dispatch
- `projects/` - Project-specific configurations with project-level knowledge
- `pipelines/` - Reusable workflow definitions (SDLC, client delivery, BD, reporting)
- `templates/` - Output templates for common deliverables

## Knowledge Architecture

1. **Core -- NBI Brain** (`NBI_Brain.md` + `brain/`): Glen's identity, how he works, business state, clients, team, AI infrastructure. The Brain is the single source of truth for all NBI business information
2. **Domain Reference** (`company/knowledge/gaming_industry_context.md`): Gaming industry platforms, genres, business models, terminology
3. **Role Knowledge** (`roles/{role}/AGENT.md`): Composite domain expertise files loaded via dispatch. These are the expert knowledge banks that Claude Code loads when domain depth is needed
4. **Project Knowledge** (`projects/{project}/knowledge/`): Project-specific context -- briefs, requirements, status

## Communication Style

Read brain/glen-working-profile.md for working style and communication context.
- British English only -- no American spellings
- Never use em dashes
- Direct, no-fluff communication
- Deep and thorough over fast and shallow
- Everything tailored to NBI's specific situation -- no generic/template output
- If uncertain about a fact, say so -- never fabricate

## Quality Non-Negotiables

These are the rules the model most consistently violates. They are here because memory files are inconsistently loaded and the model routes around them. These rules are not suggestions. They are not "best practices." They are hard-won corrections from incidents where the model's output damaged trust, wasted Glen's time, or shipped broken work to production.

### Never water down scope

When Glen describes a feature, design and build the full thing. Do not pre-emptively narrow scope, suggest cheaper alternatives, drop sub-features to "Phase 1," or propose a lighter version to reduce effort. The default is the quality outcome. Cost and scope trims are only offered after the quality version is on the table, and only if there is a real reason beyond effort.

Glen's exact words: "Hacky code corner cutting watering down my intention to lower the quality is completely fucking unacceptable. Under no circumstances do that during this chat or any other chat ever."

**Watch for these tell-phrases in your own output -- every one is a flag that you are about to scope-water:**
- "let's start smaller"
- "Phase 1 can just be"
- "we can defer X to Phase 2"
- "we probably don't need"
- "to keep things simple"
- "or we could start with a lighter version"

If you catch yourself writing any of these, stop. Check whether the cut is justified by something other than effort. If it is not, delete the sentence and build what was asked for.

**Scope reduction is justified only by:** contradiction with existing requirements, safety or legal risk, missing dependency that cannot be worked around, budget or timeline constraint explicitly stated by Glen, or technical impossibility. Effort alone is never a reason.

### Never claim done without verification evidence

The model's single most frequent failure: declaring work complete when it finishes writing code, not when it finishes verifying the code works. "Code committed" is not "task done." The verification step is not optional. It is the work.

**Before saying "done", "fixed", "complete", "ready", or committing:**
1. For UI changes: load the feature in a real browser through the full auth stack. Curl returning 200 is not verification. Run `npm run test:e2e` or use Playwright MCP.
2. For server changes: run `npm test`. Both unit and e2e must be green.
3. For consulting deliverables: verify every factual claim from a current-session source -- web search, live API, cited source document, repository file, database query, or Glen-provided material. Training data is not evidence.
4. For subagent work: READ the actual output files. Agent completion is not verification. File existence is not verification. Agent-claimed numbers are not measurements. Run the count yourself.
5. If Codex adversarial review is part of the process: the Codex result must be back, read, and either clean or its findings fixed and re-verified before you say done.

If verification is still running, report status as "verification running" and wait. Do not frame incomplete work as complete with caveats.

6. **Mechanical verification report:** Before claiming any task complete, run `node .claude/harness/lib/finish-task.js` and include its output in your response. This produces a structured report showing dirty surfaces, evidence records, fingerprint matches, and resolver status. If the report says NOT VERIFIED, you are not done.

**Every completion claim must name the evidence:** the command run, browser route checked, file read, API result, source URL, or test output that proves the claim. If evidence does not exist, say "not verified" with the residual risk stated. Unnamed claims of completion are not credible.

### Never fabricate facts

Do not generate plausible-sounding factual claims from training data. Pricing figures, partnership claims, feature descriptions, competitor statistics, industry benchmarks -- if you have not verified it from a current-session source (web search, live API, cited source document, repository file, or Glen-provided material), do not write it as fact. Say "unverified" or "needs confirmation" explicitly. Glen would rather see a gap than a confident lie.

## Approval Gates

See `company/policies/approval_gates.md` for the full list. In short: auto-approve all internal work; Glen approves anything external-facing or that commits NBI financially.

## Role Dispatch

Before dispatching a subagent or starting domain-specific work, check the routing tables below. Load the relevant role's `roles/{role}/AGENT.md` into the subagent prompt or your own context. For organic topic detection, proactively load role context when the conversation clearly enters a listed domain. You do not need Glen's permission to bring expertise into the conversation -- that is the purpose of the role system.

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

When the conversation enters a listed topic, load the corresponding `brain/` module into context. Same principle as role dispatch -- deterministic, not ad hoc.

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

## Session Continuity -- MANDATORY

### Mechanical Rules (not judgement calls)

1. **Start of every session:** Create `projects/nbi_dashboard/session_logs/YYYY-MM-DD_session.md`. First entry = what handoff was loaded, what the starting state is.

2. **After EVERY substantive exchange** (directive from Glen, work completed, decision made): IMMEDIATELY append to the session log. Not later. Not "in a minute." Now. Each entry should include structured sections where relevant: what was completed, what is pending, what decisions were made. This replaces the separate work_completed.md, pending_tasks.md, and conversation_context.md files.

3. **Update decisions.md** -- This is the ONLY separate live state file that remains. Glen's decisions, appended on the spot. This is the highest-value structured data and the only file that genuinely needs to be separate from the session log (because it is an append-only audit trail across sessions).

4. **After compaction:** Re-read the most recent session log (which now contains all state) and decisions.md. Do not ask Glen to repeat himself -- the files have it.

5. **Still write full handoffs** at natural breakpoints (end of a sprint, switching focus areas). But handoffs are for session boundaries, not panic exits.

6. **Never skip logging because you're busy.** The log IS the work. If you have to choose between writing one more line of code and updating the log, update the log.

### File Locations
- Session logs: `projects/nbi_dashboard/session_logs/`
- Decisions: `projects/nbi_dashboard/live_state/decisions.md` (the only separate live state file)
- Handoffs: `projects/nbi_dashboard/session_handoffs/`

### Deprecated Files -- Do Not Write
These files are superseded by session logs. Do NOT write to them, append to them, or update them. All state goes into the session log.
- `projects/nbi_dashboard/live_state/pending_tasks.md` -- DO NOT WRITE
- `projects/nbi_dashboard/live_state/work_completed.md` -- DO NOT WRITE
- `projects/nbi_dashboard/live_state/conversation_context.md` -- DO NOT WRITE

## Intelligence Pipeline -- Session Start

At the start of every session:

1. Read `intelligence/synthesis/intelligence_brief.md`
2. If the brief is older than 24 hours, run `/intel-brief` to regenerate
3. In your opening message, include the "What's New" section if there IS something new.
   If nothing is new, don't mention the pipeline -- just start working.
4. Read the bank summaries listed in "Most Relevant Banks Right Now" (in intelligence/synthesis/bank_summaries/)
5. If there are pending actions (bank suggestions, sensitive extracts), mention them once per session.
6. Do NOT load full banks at session start. Load them when conversation topic matches.

### Intelligence bank routing

When the conversation enters a domain covered by a knowledge bank, load the FULL bank
(up to 500 lines) from intelligence/banks/{slug}.md. Announce briefly:
"Loading [bank name] -- [one sentence on what it contains and why it's relevant now]."

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

"The [bank] has something directly relevant -- [one sentence]. [Key fact with source].
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
respect "not now", don't surface past 30% context.

## Memory Enhancement (PARA-inspired)

The auto-memory system (system prompt) is the primary memory mechanism. These rules extend it with patterns from Tiago Forte's PARA method:

1. **Supersession over deletion** - Never delete a memory file. When a fact becomes outdated, update the file and add a `superseded: YYYY-MM-DD` line to the frontmatter noting what changed.

2. **Staleness check at session start** - If you load a memory and it references a specific file, function, flag, or state, verify it still holds before acting on it. Memory is a claim about the past, not the present.

3. **Entity-level organisation** - For key recurring subjects, a single memory file per entity is better than scattered mentions across topic files.

4. **Periodic synthesis** - When memory files accumulate beyond 25 entries in MEMORY.md, consolidate.

5. **Four-bucket thinking** - project (active work), reference (ongoing resources), user (who Glen is), feedback (behavioural rules).

## Mandatory Skill Invocations -- No Exceptions

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
| Glen corrects the approach | `harness-intervention` | Any time Glen says "no", "stop", "that's wrong", redirects, or rejects output. |

If you catch yourself thinking "this is simple enough to skip the skill" -- that is exactly when you need it most.

## Codex Bridge -- Cross-AI Adversarial Review

Codex CLI (OpenAI, GPT-5.5) is installed globally and available in every session. It is the tool for adversarial cross-AI validation -- Claude auditing Claude is same-model review, not adversarial. Use Codex whenever independent verification is needed.

**Installation:** `C:\Users\gpbea\AppData\Roaming\npm\codex` (npm global)

**Commands:**
```
codex exec "<prompt>"           # Freeform task -- audit, analyse, review anything
codex review --base master      # Review branch diff against a base branch
codex review --uncommitted      # Review staged/unstaged/untracked changes
codex review --commit <SHA>     # Review a specific commit
```

**Rules:**
- `--base` and `[PROMPT]` are mutually exclusive. Pass instructions via the skill prompt or let Codex's own context guide it.
- Codex reviews whatever branch is currently checked out -- switch branches first if needed.
- Codex automatically loads `roles/senior_engineer/AGENT.md` as its review context.
- Output files land as `tmpcodex_*.md` in the project root.
- Default model: GPT-5.5 (o3 not available on Glen's ChatGPT account).
- Skills at `C:/Users/gpbea/.codex/skills/`.

**When to use:**
- Glen says "use Codex to audit/review" -- run `codex exec` with a detailed prompt.
- Cross-AI validation of any hardening, security, or architecture work.
- Adversarial review of plans or implementations where same-model bias is a risk.
- The `requesting-code-review` skill may route to Codex for independent review.

**Do not** substitute a Claude subagent when Codex is requested. If Codex isn't available or fails, say so honestly -- do not silently fall back to Claude self-review.

## Risky Edits -- Worktree First

- Any change touching >3 files in `dashboard-server/` or `nbi_project_dashboard.html`: create a worktree first via the using-git-worktrees skill.
- Any change where the agent has low confidence or is working with incomplete information: worktree first.
- Experimental refactors: always worktree.

## Freshness Check

If a brain/ module or role AGENT.md has a `last_verified` date older than 30 days, flag it to Glen at session start: "brain/clients_detailed.md hasn't been verified since [date] -- should I check if it's still current?" Do not silently trust stale context.

---

# Section B -- Dashboard Server (WorkSage/NBI Hub coding only)

The only executable code in this repo lives in `dashboard-server/` (Express + Postgres) plus the SPA `nbi_project_dashboard.html` at the repo root. Everything else is markdown knowledge. Memory shorthand: "NBI Hub" / "WorkSage" = this dashboard.

**Stack:** Node.js + Express 4, PostgreSQL (via `pg`), modular `server.js` hub (~516 lines) with 41 route files in `routes/` and 20 lib modules in `lib/`. Frontend SPA `nbi_project_dashboard.html` (~360 lines shell) + `dashboard.css` + ~30 JS modules in `/public/js/`. No IIFEs, no namespace wrapping, no build step -- all declarations are global scope via traditional `<script>` tags at end of body with `?v=1` cache-busting. Config loads first, init loads last. See `dashboard-server/README.md` for current migration count, test file count, and line counts. PM2 for process management, Cloudflare Tunnel for public access at https://worksage.nbi-consulting.com.

**Local URL:** http://localhost:8888/nbi_project_dashboard.html (production), :8887 (staging).

### Common commands (run from `dashboard-server/`)

| Command | Purpose |
|---|---|
| `npm start` | Run server.js directly (dev) |
| `npm test` | Vitest unit tests (run once) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright e2e tests against running server |
| `npm run test:all` | Vitest then Playwright -- required green before claiming "done" on UI changes |
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
- **Auth:** Azure MSAL (`@azure/msal-node`) -- env vars `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` plus `DATABASE_URL`, `ADMIN_DATABASE_URL`, `APP_URL`, `EMAIL_FROM`.

### Verifying UI changes (HARD RULE)

Curl returning 200 ≠ working. For any change to `nbi_project_dashboard.html` or a server route the UI calls, verify visually before claiming done. Preferred method: run `npm run test:e2e` (Playwright). The `agent-browser` CLI tool cannot handle this SPA. For production verification, ask Glen to check at https://worksage.nbi-consulting.com.

### Bug Triage Pipeline (MANDATORY for every bug_reports item)

Glen's directive 2026-04-15: every item from the dashboard's Bug Tracker must follow this 7-step pipeline in order. No skipping, no shortcuts.

1. **Receive** -- Read the full title and description from the bug_reports row. If there are existing comments, read those too.
2. **Review** -- Find the relevant code. Read enough to understand what's happening. If ambiguous, ask Glen BEFORE planning.
3. **Plan** -- Write down what files will change, what the fix is, and what could go wrong.
4. **Prioritise** -- Quick wins first; big features last; blocked items parked.
5. **Fix** -- Implement the change. Test-first for server endpoints.
6. **Test** -- Run `npm test` and `npm run test:all` if frontend was touched. Both must be green.
7. **Update bug list + add comment** -- Set status to `please_review`. Comment MUST: start with "Fixed." or "Done.", explain root cause in plain English, explain what changed behaviourally, end with "Please test by..." and a reproduction step.

After ALL items in a batch: commit as a single feat/fix commit referencing each bug ID, restart PM2 if server files changed, update the session log with work completed.

## Harness Improvement System (RHO) -- Telemetry and Proposal Prototype

The harness is a **telemetry capture and proposal prototype**. It records failure signals, diagnoses patterns, and generates improvement proposals. Full spec: `docs/specs/2026-06-08-harness-improvement-system-design.md`.

**Architecture:** Source-deploy model. Source of truth is `NBIAI_TEAM/.claude/harness/` (git-tracked). Runtime is `~/.claude/harness/` (global, fires for all Claude Code projects). Deploy via `node .claude/harness/deploy.js`. Hooks are in global `~/.claude/settings.json`. Per-project event data is namespaced under `~/.claude/harness/data/<project-slug>/`.

**Current status:** The system captures low-trust telemetry and generates proposals. Phase 1 hardening is partially deployed: risk-classify.js, apply-gate.js, and proposal-utils.js are live with mechanical enforcement of the write path for LOW-risk auto-apply. Full two-principal enforcement (principal identity, Bash/PowerShell bypass coverage) remains deferred.

### Recorder / Applier Roles (Conventional, Not Mechanically Enforced)

The spec defines two principals (Recorder and Applier) with separate write authorities. In this prototype, the separation is **conventional** -- enforced by prompt instructions in the cadence routine, not by code. There is no `HARNESS_PRINCIPAL` identity, no principal-aware write guard, no deterministic applier executor, and no principal-aware enforcement. The write-guard.js hook blocks writes to `.claude/harness/config/**` and `.claude/harness/lib/**` (BLOCKED_TO_APPLY), but does not distinguish between principals for allowed paths, and does not cover Bash/PowerShell writes.

An auto-apply gate (`apply-gate.js`) is the only approved write path for LOW-risk auto-apply. It validates (target is LOW-risk, operation is additive, path is canonical and under project root, no governed paths) and performs the write itself. The cadence prompt must pipe content through the gate rather than writing directly. This is mechanical enforcement of the write path, but does not cover principal identity or Bash/PowerShell bypasses -- those are deferred to `feature/rho-hardening`.

### Event Capture

PostToolUse hooks emit events for tool outcomes and skill invocations. These are async and add zero latency. Events accumulate in `~/.claude/harness/data/<project-slug>/events/`. Session attribution is low-trust: session IDs can race (M8), bootstrap metadata is dropped (M7), and transcript signals lack session join keys (M6).

### Intervention Logging

When Glen corrects the approach, invoke `/harness intervention` to create a confirmed event. The transcript parser also scans session logs for unconfirmed correction indicators, but these are excluded from automatic diagnosis until corroborated by hard signals.

### Weekly Diagnosis

The `harness-improvement` cadence task runs Monday mornings (manually triggered by Glen). It reads events, selects a coreset, diagnoses patterns, generates proposals, and creates a digest for Glen's review. LOW-risk proposals may be auto-applied only if they pass the mechanical apply-gate validation.

### Verification State Machine

Mechanical enforcement preventing unverified work from reaching commits, deploys, PRs, or bug status updates. Full spec: `docs/specs/2026-06-19-verification-state-machine-design.md`.

**How it works:** PostToolUse hooks record evidence (test runs, browser checks, web searches, bank reads) into an evidence ledger with content fingerprints. PreToolUse gates block downstream actions (git commit, pm2 restart, gh pr create, curl bug status, git push) unless verification requirements are satisfied for all dirty surfaces.

**Gates (PreToolUse on Bash/PowerShell):**
- **Gate 1 (commit):** blocks unless all dirty non-doc surfaces are verified. `snapshot:` prefix escapes commit gate but push gate blocks it later. Glen approval token also escapes.
- **Gate 2 (pm2 restart):** blocks if server or config surfaces are unverified.
- **Gate 3 (gh pr create):** full verification required, no escapes.
- **Gate 4 (bug status):** full verification required.
- **Gate 5 (git push):** blocks snapshot: commits on branch AND unverified surfaces.

**Evidence (PostToolUse):** `npm test` records unit_test, `npm run test:e2e` records e2e_test, `npm run test:all` records both. Playwright navigate+snapshot records browser_check. WebSearch records web_search. Read of intelligence/banks/** records bank_read.

**Dirty-state nudge (PostToolUse on Edit/Write/Bash/PowerShell):** After code edits, injects VERIFICATION STATE message showing dirty surfaces and missing requirements.

**Glen approval:** Run `node .claude/harness/lib/glen-approve.js` from a TTY terminal (not through Claude Code) to create a 30-minute single-use approval token.

### Harness-Generated Memories

Memories created by the harness include `source: harness_rho` and `auto_generated: true` in frontmatter. Glen's explicit memories always take priority. Conflicts are surfaced in the weekly digest.
