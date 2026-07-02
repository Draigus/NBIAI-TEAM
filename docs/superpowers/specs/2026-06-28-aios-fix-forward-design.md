# AIOS Fix-Forward Design Spec

**Date:** 2026-06-28
**Status:** Draft for review
**Audit:** Full ground-truth audit + Codex adversarial review
**Reference implementations:** Nate Herk AIS-OS, Murchison Chief of Staff, Claudia, ceaksan, Doneyli De Jesus, gAIOS, Claude Code Routines

## Problem Statement

Glen rates his AIOS at 6/10. The system has strong context (Brain 8/10) and broad connections, but:

1. Claude sent a Telegram message to a client (Steve) without authorisation
2. Morning briefings don't reliably arrive (Interactive-only scheduling)
3. WorkSage data doesn't translate into actions Glen takes
4. Nothing is proactive or overnight - everything requires Glen at his desk
5. Many systems built to 70% and declared done
6. Granola notes taken all week but never auto-updated
7. Errors are noted but not fixed automatically
8. Dreaming Engine runs but Glen never sees output
9. News Aggregator doesn't produce actionable intelligence

## Design Principles

1. **Closed loops over displays** - information in, controlled actions out
2. **Drafts only, never sends** - all external comms become drafts for Glen's approval
3. **Errors get fixed, not logged** - automatic repair with escalation when repair fails
4. **Prove before expanding** - each phase must be working before starting the next
5. **Idempotent by default** - every loop uses deterministic keys to prevent duplicate noise
6. **Actions, not scores** - Command Centre tells Glen what to do, not what his health score is

## Canonical Action Model

Every AIOS-created item shares this schema (Codex recommendation):

```
aios_actions:
  id                  UUID
  source_system       TEXT (granola, leads, intelligence, routine, news, dreaming)
  source_id           TEXT (meeting ID, lead ID, extract ID, routine name, etc.)
  source_timestamp    TIMESTAMP
  source_quote        TEXT (evidence excerpt)
  action_type         TEXT (task, draft, incident, proposal, risk, decision)
  title               TEXT
  description         TEXT
  proposed_action     TEXT
  risk_class          TEXT (low, medium, high, critical)
  owner               TEXT (glen, system, unassigned)
  due_date            DATE (nullable)
  approval_state      TEXT (pending, approved, rejected, snoozed)
  execution_state     TEXT (pending, in_progress, completed, failed)
  verification_state  TEXT (unverified, verified, not_applicable)
  dismissal_reason    TEXT (nullable)
  created_by_routine  TEXT
  idempotency_key     TEXT UNIQUE (deterministic dedup key)
  created_at          TIMESTAMP
  updated_at          TIMESTAMP
  feedback_signal     TEXT (nullable: approved_unchanged, approved_edited, rejected_wrong, rejected_not_worth, snoozed, ignored)
```

All closed loops write to this table. Action Rail reads from it. Morning brief pulls from it. Feedback signals feed back into loop tuning.

## Outbound Broker

All external communication goes through a broker service, not through direct Claude tool calls. (Codex: "The trust boundary should be: Claude cannot send at all.")

```
aios_outbound_queue:
  id                  UUID
  action_id           FK -> aios_actions
  destination_type    TEXT (slack_dm, email_draft, worksage_task)
  destination_id      TEXT (Glen's Slack user ID, email address)
  draft_text          TEXT
  reason              TEXT
  approval_status     TEXT (pending, approved, rejected)
  approved_by         TEXT
  approved_at         TIMESTAMP
  sent_at             TIMESTAMP
  delivery_status     TEXT (pending, sent, failed)
  failure_reason      TEXT
```

The broker:
- Validates destination is on the allowlist (Glen's Slack ID only for DMs)
- Requires action_id linkage (no orphan sends)
- Records delivery status
- Has an emergency disable switch
- Has rate limiting (max 20 DMs/day to prevent spam)

## Runner Ownership (Codex recommendation: one owner per routine)

| Runner | Owns | Why |
|---|---|---|
| **Claude Code Routines** (cloud) | Morning brief generation, weekly audit, weekly automation proposal, AIOS research | Repo-backed, laptop can be closed |
| **Windows Task Scheduler** (local, "run whether logged on") | Intel-ingest, recompile-banks, intel-research, brain-freshness, system-audit, harness-improvement, financial-reconciliation | Needs local file access, OneDrive, PM2 |
| **PM2** | Dashboard server, staging, Cloudflare tunnel, context monitor, news aggregator | Long-running services |
| **WorkSage cron** (internal) | Dashboard snapshots, DB backup, FX rates, Granola sync, PM reports, orphan cleanup | Database-native internal routines |

No routine has two runners. Each routine declares: required secrets, required paths, max side-effect level, catch-up behaviour, repair actions allowed, escalation threshold.

---

## Phase 1: Three First Wins (Trust, Cadence, Granola Loop)

**Success criteria:** Glen wakes up to a useful Slack DM morning brief, Granola commitments become WorkSage tasks automatically, and no Claude session can send external messages.

### 1.1 Safety Lockdown

**Kill Telegram:**
- Remove from `.mcp.json`
- Remove plugin from `~/.claude/plugins/`
- Archive `D:\OneDrive\Claude_code\telegram-mcp` (move credentials out of git)
- Update Brain modules that reference Telegram as active channel
- Update command-centre.js to remove Telegram references
- Update Sarge Universe comms channel in Brain to state: "Telegram retired 2026-06-28. No automated replacement. Manual Slack if needed."

**Slack to Glen only:**
- Configure Slack MCP with Glen's user ID as sole allowed DM recipient
- PreToolUse hook on `mcp__claude_ai_Slack__slack_send_message` validates recipient
- Build outbound broker as WorkSage route + lib module
- Broker validates: destination on allowlist, action_id linked, rate limit not exceeded
- All morning brief and alert delivery goes through broker

**Gmail drafts only:**
- PreToolUse hook blocks `mcp__claude_ai_Gmail__*` send operations
- Draft creation via Gmail MCP allowed
- Drafts link back to aios_actions via action_id

**Acceptance tests:**
- A Claude session cannot call Telegram tools (tools not registered)
- A Claude session cannot send Slack DM to anyone except Glen's user ID
- A Claude session cannot send Gmail (only create drafts)
- The broker rejects sends to non-allowlisted destinations
- The broker records every send attempt in audit log

### 1.2 Cadence Reliability

**Fix Interactive-only:**
- Change ALL 8 Windows Task Scheduler tasks to "Run whether user is logged on or not"
- Test each task fires when Glen is logged out
- Each cadence prompt declares its runner contract: required secrets, paths, network, max side-effects

**Catch-up mechanism:**
- Shared state file: `scripts/cadence/state/routine_runs.json`
- Each routine writes: `{routine, scheduled_time, actual_start, actual_end, status, output_path, error}`
- Morning brief checks for missed siblings since last brief and reports catch-ups
- Missed routines that can be safely re-run are triggered at next window

**Error self-correction:**
- Failed routine creates `aios_actions` record with `action_type: incident`
- System categorises failure and checks repair policy:
  - **Safe to auto-repair:** retry failed fetch, restart PM2, re-run missed brief, regenerate stale derived file, rebuild malformed snapshot
  - **Requires Glen:** database migrations, auth changes, connector permissions, Brain canon edits, anything that sends/deletes/commits
- Repair attempt recorded in incident
- If repair succeeds: log in overnight work, mention in morning brief
- If repair fails: Slack DM Glen via broker with specific error + what was tried

**Fix pipeline_state.md:**
- Retire pipeline_state.md as a live state file
- Point all agents at compilation_log.md (which IS current)
- Add bank freshness query to WorkSage intelligence route (compute from file timestamps, not a stale markdown file)

**Acceptance tests:**
- Morning brief fires when Glen is logged out
- A missed Friday brief catches up on Saturday/Monday and flags the catch-up
- A failed routine creates a WorkSage incident and attempts repair
- pipeline_state.md no longer referenced by any active code

### 1.3 Morning Brief to Slack

Delivered to Glen's Slack DM at 07:30 weekdays via outbound broker.

**Content (action-first, empty sections suppressed):**

1. **Do today** - calendar commitments, deadlines, client deliverables due within 7 days
2. **Reply/review** - drafts in approval queue, bugs in `please_review`, messages needing response
3. **Client risks** - cooling relationships (no contact 14+ days), SOW expiry, overdue deliverables
4. **Money** - invoices to send, receivables overdue, payroll dates, cash changes
5. **Work queue** - blocked tasks, overdue tasks, items assigned to Glen
6. **Intelligence** - ONLY items requiring decision or action
7. **Overnight work** - what the system did: tasks created, drafts written, data synced, errors caught/fixed
8. **Routine health** - failures since last brief, repair attempts

Each item: source, why it matters, proposed action. Not information - agenda.

**Implementation:**
- Claude Code Routine (cloud) generates the brief from WorkSage API + intelligence files
- Routine pushes brief text to outbound broker
- Broker sends Slack DM to Glen
- Brief also stored in WorkSage for Command Centre access
- Delivery status recorded

**Acceptance tests:**
- Glen receives Slack DM morning brief after laptop was closed overnight
- Empty sections do not appear
- Each item links to a source (WorkSage task, Granola meeting, intelligence extract)
- Brief is stored in WorkSage and accessible from Command Centre

### 1.4 Granola Closed Loop

Granola syncs daily at 07:00 (already working). Post-processing step runs after sync.

**Extraction:**
- Parse synced meeting notes for: commitments ("I'll send X by Friday"), decisions, action items, people mentioned, numbers quoted
- Each extracted item gets an idempotency key: `granola:{meeting_id}:{commitment_hash}`
- High-confidence items (clear owner, clear deadline, unambiguous language) create WorkSage tasks automatically
- Ambiguous items create `aios_actions` with `approval_state: pending` for Glen's review
- Each item shows: source quote, meeting title, speaker if available, owner confidence, date confidence

**Outputs:**
- Commitments -> WorkSage tasks with deadlines, linked to meeting source
- Decisions -> decisions log entry (append-only)
- Action items for Glen -> morning brief "Do today" or "Reply/review"
- Numbers quoted (revenue, headcount, dates) -> flagged for Brain delta review

**Brain delta governance (Codex recommendation):**
- Safe automatic: last_verified date updates, pending_actions additions
- Review required: client context, revenue, role/title, strategic decisions, personal context
- Brain deltas proposed, not applied directly, unless operational metadata

**Acceptance tests:**
- A Granola meeting with "I'll send the proposal by Thursday" creates a WorkSage task due Thursday
- A duplicate sync does not create duplicate tasks (idempotency key matches)
- An ambiguous commitment ("we should probably look at that") creates a pending review item, not an auto-task
- Extracted items show source quote from the meeting

---

## Phase 2: Remaining Closed Loops + Command Centre (after Phase 1 proven)

### 2.1 Stale Leads -> Draft Follow-ups

- Nightly scan: leads with no activity 14+ days at active stages
- System drafts follow-up based on lead context and last interaction
- Draft -> aios_outbound_queue with `destination_type: email_draft`
- Surfaces in morning brief under "Reply/review"
- Idempotency: `leads:{lead_id}:{last_contact_date}:{follow_up_rule}`
- If Glen rejects 3 similar drafts, increase threshold or require stronger signal

### 2.2 Intelligence -> Tasks

- When banks identify items with deadlines, create WorkSage task
- When banks identify items relevant to active clients, flag in morning brief
- When banks contradict Brain facts, create Brain delta proposal
- Idempotency: `intel:{extract_id}:{action_type}`

### 2.3 Error -> Fix -> Report (expand from Phase 1)

- Expand repair policy to cover more failure types
- Add repair success rate tracking
- Add repair playbooks for common failures

### 2.4 Command Centre Overhaul

**Action Rail:**
- Single prioritised queue from aios_actions where approval_state IN (pending, approved but not executed)
- Categories: Approve, Review, Decide, Fix, Follow up
- Each item: source, why, proposed action, risk if ignored
- Items link to the thing (task, draft, lead, bug, incident)
- Approve/reject/snooze/edit inline

**Dreaming Engine visible:**
- Output surfaces as "Overnight Analysis" in Command Centre
- Each finding linked to an aios_action or explicitly archived
- No panel of thoughts - actions or archived, nothing in between

**Routine Health:**
- Every cadence task: last run, success/fail, next run, last 10 runs from routine_runs.json
- Failures visible with repair attempt and outcome
- No hardcoded scores. If not built, not shown.

**Richer Dashboard Snapshots:**
- Deltas since previous snapshot (what changed)
- Client-level health trajectories (trend, not point-in-time)
- Commitment completion rates
- Stale data flags
- Data confidence indicators where source data is incomplete

### 2.5 News Aggregator Intelligence

- Daily games industry digest: financials, layoffs, new studios, game releases, M&A, policy changes
- Each item classified for NBI relevance: client relevance, BD opportunity, risk, hiring signal, PlaySage implication
- Top 3 in morning brief with "so what" annotation
- Full digest in Command Centre
- Items that require action create aios_actions
- Items for awareness only: available on drill-in, not pushed

---

## Phase 3: Automation Proposals + Relationship Health (after Phase 2 proven)

### 3.1 Daily Automation Proposals

Evening synthesis (runs after recompile-banks at 21:30) analyses:
- Session logs from past 7 days
- Granola meeting patterns
- WorkSage task type frequency
- Time entries
- Intelligence banks
- Glen's feedback signals on past proposals

Applies Three Ms: eliminate, automate, delegate. Selects highest-impact candidate.

**Proposal in morning brief:**
> **Automation idea:** [title]
> [One sentence]. Evidence: [what was observed]
> Effort: S/M/L | Saves: [est/week] | Risk: low/med/high
> Reply "build it" / "skip" / "tell me more"

"No strong candidate today" is a valid result. Forced ideas are worse than none.

Glen's feedback feeds back: build-it creates task, skip with reason teaches system, ignored proposals downweight similar future proposals.

**Distinct from Dreaming Engine and weekly audit (Codex concern):**
- Dreaming Engine: overnight analysis -> generated work items, proposed tasks, contradiction flags
- Automation proposals: pattern-matched repeated friction -> specific build suggestion
- Weekly audit: system health and structural improvement review (Four Cs gap report)

If they converge on the same suggestion, the proposal wins (it's more actionable).

### 3.2 Client Relationship Health

Start narrow (Codex recommendation):
- Relationship freshness: last contact date per client across channels
- Open commitments per client
- Overdue replies
- Next meeting prep status

Observable inputs only (not LLM sentiment):
- Last inbound/outbound contact dates
- Open commitments from Granola
- Calendar: upcoming meetings
- WorkSage: overdue tasks per client
- Brain: known political context
- Manual overrides by Glen

Produces actions, not scores:
- "No contact with [client] since [date]"
- "Commitment overdue: [what] for [client]"
- "Meeting tomorrow with [client], no prep task exists"

### 3.3 Human Feedback Memory

Glen's responses to aios_actions captured as training signals:
- approved_unchanged, approved_edited, rejected_wrong, rejected_not_worth, snoozed, ignored

Feed into rules:
- 3 rejected stale-lead drafts -> increase threshold
- Consistently edited phrase -> update style rule
- Always approved Granola tasks from certain meeting type -> increase automation confidence

---

## Parallel Workstream: AIOS Best-of-Breed Architecture Study

Use autoresearch skill to research top 10 AIOS implementations (excluding OpenClaw), extract architectural patterns, score against criteria, and produce a best-of-breed reference document.

**Candidates:**
1. Nate Herk AIS-OS (Four Cs, Three Ms)
2. Murchison Chief of Staff (goals.yaml, inbox triage)
3. Doneyli De Jesus Chief of Staff (43k Python, graduated autonomy, memory decay)
4. ceaksan Chief of Staff (overnight launchd, drafts-only)
5. Claudia/kbanc85 (relationship tracking, overnight background jobs)
6. gAIOS/alirezarezvani (deterministic tools, self-verification)
7. Polasky AI Chief of Staff (ADHD prosthetic, Obsidian vault)
8. Hermes Agent/Nous Research (self-improving skills, persistent daemon)
9. Barbara Bermes Chief of Staff (weekly digest, Slack/Jira/Calendar aggregation)
10. Moritz Kremb Personal OS (Dream routine, memory compression)

**Scoring criteria:**
- Overnight/autonomous operation capability
- Safety model (send controls, trust levels)
- Closed loop quality (information -> action -> verification)
- Memory architecture (cross-session, decay, dedup)
- Error self-correction
- Proactive proposal generation
- Implementation maturity (real usage evidence vs demo)
- Portability (tool-agnostic vs locked-in)

**Output:** Best-of-breed architecture document with specific pattern recommendations for Glen's AIOS. Feeds back into Phase 2/3 design refinements.

---

## Acceptance Criteria (Glen's bar)

The AIOS moves from 6/10 to 8/10 when:

1. Glen reliably receives a Slack DM morning brief that tells him what to do, review, approve, or fix
2. At least one real closed loop (Granola -> commitments) runs without Glen driving it manually
3. Failures create incidents with repair attempts and evidence, not notes
4. Command Centre shows live action queues, not future-state panels
5. No AI session can send client-facing messages directly
6. Glen can feel fewer dropped balls in normal work, not by inspecting logs
7. Automation proposals surface genuine time-saving opportunities based on observed patterns
8. The system does useful work overnight while Glen sleeps

The test from Codex: "Did Glen wake up to useful work already done, with the risky parts queued for approval, and with fewer dropped commitments than yesterday?"
