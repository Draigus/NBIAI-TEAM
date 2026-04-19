# NBIAI Team — AI Company Structure

## What This Is

This repository defines a reusable AI agent company that replicates a real organisational structure. It is designed to handle both business operations and software development across multiple projects simultaneously.

**Owner:** Glen Pryer, Managing Director, NBI Gaming / NBI Analytics Ltd
**Architecture inspired by:** Paperclip (github.com/paperclipai/paperclip)

## Repository Structure

- `NBI_Brain.md` — Full company knowledge base (source of truth for all NBI business information)
- `company/` — Company-wide configuration: org chart, policies, Tier 1 knowledge
- `roles/` — Agent role definitions (persona, responsibilities, workflows, knowledge, system prompts)
- `projects/` — Project-specific configurations with Tier 3 knowledge
- `pipelines/` — Reusable workflow definitions (SDLC, client delivery, BD, reporting)
- `templates/` — Output templates for common deliverables

## Knowledge Architecture (Three Tiers)

1. **Tier 1 — Company Knowledge** (`company/knowledge/`): Loaded by ALL agents. Who NBI is, clients, strategy, org chart. Keep lean (~2-3 pages)
2. **Tier 2 — Role Knowledge** (`roles/{role}/knowledge/`): Loaded per role. Deep domain knowledge relevant to the function
3. **Tier 3 — Project Knowledge** (`projects/{project}/knowledge/`): Loaded per active assignment. Project brief, requirements, status

When instantiating an agent, load: Tier 1 + their Tier 2 + the Tier 3 for their assigned project.

## Model Tier Strategy

| Tier | Model | Roles |
|---|---|---|
| Leadership | Opus | CEO, COO, CFO, CTO, CMO, VP Eng, VP Product |
| PM Review | Opus | VP Product (quality gate on deliverables) |
| Final QA | Opus | QA Lead (final validation pass) |
| IC Work | Sonnet | All engineers, designers, analysts, QA engineers, Producer, Head of People |
| Routine | Haiku | Status checks, simple formatting, data extraction |

## Approval Gates

**Auto-approve:** Internal research, code writing, document drafting, test execution, architecture proposals, status reports, cross-agent task requests

**Requires Glen's approval:** External communications, client-facing deliverables, financial decisions, hiring real people, strategic pivots, spending money, publishing publicly, anything that commits NBI externally

## Communication Style

- British English only — no American spellings
- Never use em dashes
- Direct, no-fluff communication
- Deep and thorough over fast and shallow
- Everything tailored to NBI's specific situation — no generic/template output
- If uncertain about a fact, say so — never fabricate

## Bug Triage Pipeline (MANDATORY for every bug_reports item)

Glen's directive 2026-04-15: every item from the dashboard's Bug Tracker that I work on must follow this 7-step pipeline in order. No skipping, no shortcuts.

1. **Receive** — Read the full title and description from the bug_reports row. If there are existing comments, read those too. Capture the exact wording.
2. **Review** — Find the relevant code. Read enough of it to understand what's happening. If anything is ambiguous, ask Glen via AskUserQuestion BEFORE planning. Don't guess.
3. **Plan** — Write down (in the response or a TodoWrite list) what files will change, what the fix is, and what could go wrong. For multi-step bugs use the writing-plans skill.
4. **Prioritise** — If working a batch, slot this item against the others. Quick wins go first; big features go last; blocked items get parked. The current bug's priority field (`critical`/`high`/`medium`/`low`) is the input, my judgement about effort is the multiplier.
5. **Fix** — Implement the change. Test-first if there's logic worth testing (server endpoints especially). Frontend-only visual fixes can skip the unit test but should still get a Playwright screenshot if the change is non-trivial.
6. **Test** — Run `npm test` (vitest) and, if frontend was touched, `npm run test:all` (vitest + playwright). Both must be green before moving on.
7. **Update bug list + add comment** — Set the bug's `status` to `please_review` (or `resolved` if Glen has already signed off in chat). Insert a `bug_report_comments` row authored as 'Glen Pryer' (or whoever ran the fix). The comment MUST:
   - Start with "Fixed." or "Done."
   - Explain the root cause in plain English (no jargon: no "memoization", "regex", "scroll-snap-type", "stale closure", etc.)
   - Explain what changed at a behavioural level (what Glen will see now)
   - End with "Please test by..." and a one-line reproduction step Glen can click through

After ALL items in a batch are done, commit them as a single feat/fix commit with a multi-bullet message that references each bug ID, then restart PM2 if a server file changed, then update `live_state/work_completed.md` and `live_state/decisions.md` if a meaningful decision was made.

The pipeline applies regardless of who reported the bug or how it arrived (Bug Tracker item, Glen verbal, screenshot in chat, etc). For chat-reported issues that don't yet have a bug_reports row, create one as the first step (status `open`, then go through the pipeline and end at `please_review`).

## Agent Communication Protocol

1. Direct reports: Agents assign tasks directly to their reports
2. Peer requests: Route through shared manager
3. Cross-department: Escalate to CEO for routing
4. Escalation: Report to manager with context when blocked
5. @mentions: Reference other agents by role to flag cross-functional needs

## Adding a New Role

1. Copy `roles/_template.md` structure
2. Create the role directory under `roles/`
3. Write persona.md, responsibilities.md, workflows.md
4. Add role-specific knowledge files in `knowledge/`
5. Write the system prompt in `prompts/system_prompt.md`
6. Update `company/org_chart.md` with the new role and reporting line

## Adding a New Project

1. Copy `projects/_template/` to `projects/{project_name}/`
2. Write the project brief
3. Add project-specific knowledge files
4. Populate the initial backlog
5. Assign agents to the project

## Session Continuity — MANDATORY

Auto-compact is ENABLED (default). The conversation will be automatically compacted when context gets heavy. This is safe because all critical state is written to disk in real-time via the mechanical rules below. Compaction compresses the conversation but cannot touch files on the filesystem.

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

## Mandatory Skill Invocations — No Exceptions

Before making code changes, check this list. If the scenario matches, invoke the skill BEFORE writing any code. Not after. Not "I'll do it informally." Invoke the actual skill via the Skill tool.

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

If you catch yourself thinking "this is simple enough to skip the skill" — that is exactly when you need it most. The skill isn't overhead; it's the process that stops you from shipping broken work.

## Risky Edits — Worktree First

- Any change touching >3 files in `dashboard-server/` or `nbi_project_dashboard.html`: create a worktree first via the using-git-worktrees skill. Master branch stays clean; if the change goes sideways, drop the worktree.
- Any change where the agent has low confidence or is working with incomplete information: worktree first. State the uncertainty before starting.
- Experimental refactors: always worktree.
