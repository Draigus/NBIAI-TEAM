# AIOS Signal Engine Design

**Date:** 2026-07-04
**Status:** Approved by Glen (brainstorming session 2026-07-04)
**Supersedes:** Extends `2026-06-28-aios-fix-forward-design.md`. The fix-forward spec's canonical action model, outbound broker, and safety principles carry forward unchanged. This spec replaces its Phase 2/3 loop designs with a unified Signal Engine and adds the Slack bot interaction layer.
**Related:** `2026-06-28-aios-best-of-breed-research.md`, `tmpcodex_aios_phase1_review.md`, `hermes_implementation_plan.md` (deferred)

---

## Problem Statement

Glen rates the AIOS as not delivering value despite substantial infrastructure. The audit (2026-07-04) found the root cause: **the system produces reports, not actions**. Every output (intelligence brief, bank summaries, brain deltas, pipeline pulse) requires Glen to read it, decide what matters, work out what to do, and then do it himself. The evidence is behavioural: the morning brief has run successfully six consecutive weekdays and Glen has stopped checking it.

Specific findings from the audit:

1. Output does not reach Glen in a channel he attends to (brief lands in a file and possibly a Slack DM he no longer reads)
2. No loop closes: meetings, stale leads, and intelligence never become tasks, drafts, or initiatives
3. No proactive presence after 07:30; the system is silent for the rest of the working day
4. Event capture broken since 2026-06-20 (P009), blinding the harness improvement loop
5. Hermes deployment blocked since 2026-05-10 (no second machine exists)
6. Role knowledge (13 AGENT.md composites) is only used reactively, never to generate work

Reference-system research confirms the infrastructure itself is ahead of most public implementations (Nate Herk's AIS-OS is a markdown starter kit; Glen's system exceeds it on every dimension except interaction). The gap is the delivery and action layer, not the engine room.

## Design Principles

1. **The AIOS does the work; Glen makes decisions.** Every loop output is pre-actioned: a draft written, a task created, an initiative planned. Glen's interaction is approve, skip, or tell-me-more. Never "here is information, go do something about it."
2. **One engine, one schema, graduated autonomy.** There is no separate mechanical loop and strategic layer. A single analysis produces items at every altitude; confidence and risk decide how much autonomy each item gets, not which pipeline found it.
3. **Approval triggers construction.** Approving a proposal dispatches an executor that builds the real thing. Approval never creates another to-do for Glen.
4. **Signals propose once.** A signal registry deduplicates at the signal level, not just the item level. New evidence enriches an open proposal rather than re-raising it.
5. **Noise control is a hard requirement.** Caps, thresholds, expiry, and "nothing worth proposing" as a valid output. A queue Glen ignores is a failed design regardless of content quality.
6. **Drafts only, never sends** (carried from fix-forward). All external communication is drafts for Glen's approval. The outbound broker's only live destination is Glen's own Slack DM.
7. **Prove before expanding** (carried from fix-forward). Each phase must be verified working before the next builds on it. Phases are sequencing, not scope cuts; the full scope ships.

## Architecture Overview

```
INPUTS                          ENGINE                       OUTPUTS
------                          ------                       -------
Granola meetings (19:00) ─┐
Bank recompiles (21:30)  ─┤    Signal Engine                aios_actions rows
Leads table (nightly)    ─┼──> (nightly analysis,     ──>  routed by
Cadence failures         ─┤     signal recognition,         confidence × risk
Session logs (weekly)    ─┘     dedup vs registry)
                                      │
                                signal_registry
                                (fingerprinted, stateful)

DELIVERY                        RESPONSE                     EXECUTION
--------                        --------                     ---------
Morning brief 07:30       ──>  Slack Block Kit         ──>  Executor picks up
(decision queue format)        buttons: Approve /           approved actions,
Mid-day nudge 14:00            Skip / Tell me more           runs headless Claude
(delta only, suppressed        + free-form DMs to            with role knowledge,
if empty)                      the WorkSage Slack bot        builds the artefact
```

All items flow through the existing `aios_actions` table (migration 072) and the existing outbound broker. No parallel data models.

## Component 1: The Signal Engine

A nightly analysis step (initially attached to the Granola ingest at 19:00, later widened to other inputs) that processes each new source item once and emits `aios_actions` rows across the full altitude spectrum.

### What one meeting analysis produces

For each new Granola meeting, a single prompt (not two passes) extracts:

| Altitude | Example | action_type | Typical routing |
|---|---|---|---|
| Commitment | "I'll send the doc Thursday" | task | Auto-execute if confidence high |
| Decision | "We decided two-house budget model" | decision | Auto-append to decisions log, report in brief |
| Request | "Can you check on X" | task | Approval queue |
| People signal | "Lili starts Monday as Head of Finance" | proposal | Workload proposal via role knowledge |
| Product signal | "Combat design debate for the MMO" | proposal | Research offer via role knowledge |
| Business signal | Funding, partnership, pricing discussion | proposal | Commercial analysis offer |
| Risk signal | Compliance deadline, client dissatisfaction | risk | Mitigation proposal or brief flag |
| Fact delta | Numbers contradicting the Brain | proposal | Brain delta candidate (review required) |

Every item carries: `source_system`, `source_id`, `source_quote` (evidence excerpt), `confidence` (low/medium/high), `risk_class` (low/medium/high/critical), and a deterministic `idempotency_key`.

### Graduated autonomy routing

One routing rule applies to every item regardless of type:

| Confidence × Risk | Behaviour |
|---|---|
| High confidence + low risk | Auto-execute (create WorkSage task, append decision), report in next brief under "Overnight" |
| High confidence + medium risk | Pre-action fully (write the Gmail draft, prepare the task), queue for one-tap approval |
| Signal implying substantial work | Generate a proposal with a concrete plan attached, queue for approval |
| Anything ambiguous | Approval queue at low priority; batched, never pushed individually |
| Anything touching external comms, Brain canon, money, or client-facing content | Never auto-executes, regardless of confidence |

The `feedback_signal` column (already in schema: approved_unchanged, approved_edited, rejected_wrong, rejected_not_worth, snoozed, ignored) tunes thresholds per category over time. A category that earns consistent unedited approvals graduates towards more autonomy; a category with rejections gets quieter. This is the graduated-trust pattern from the best-of-breed research applied per item category rather than per contact.

### Role-informed proposal generation

This is the core capability Glen specified. When the engine recognises a signal implying substantial work, it loads the relevant role AGENT.md and brain modules to generate a **complete, concrete plan**, not a vague suggestion.

**Worked example 1 (people signal):** Granola meeting mentions Lili Zhao starting as Couch Heroes Head of Finance. The engine cross-references the Brain (confirms this is new; she started 1 July), loads CFO-domain role knowledge plus `brain/financial_resilience.md`, and generates a proposal: a "Finance Function Build-Out" initiative containing a structured task tree (P&L ownership, cash flow modelling, capitalisation table, budget governance cadence, payroll reconciliation, board reporting pack, audit trail). Glen receives the proposal with the full task list visible. On approval, the executor builds the initiative and task hierarchy in WorkSage under the Couch Heroes client.

**Worked example 2 (product signal):** Granola meeting shows a combat design discussion for the MMO. The engine loads `game_economy_consultant` and `gaming_practice_lead` role knowledge and offers: deep research comparing MMO combat models (action, tab-target, hybrid, action-RPG) covering feel, retention evidence, monetisation implications, and production cost, delivered as a design brief. On approval, the executor dispatches a headless run using the deep-research skill and delivers the finished document with a Slack link.

Signal taxonomy for recognition: people (hire, departure, role change, restructure), product (feature, design debate, technology choice), business (funding, partnership, contract, pricing), risk (compliance, legal, client health), process (repeated friction, tooling gaps).

### Model requirement

Signal recognition and proposal generation is the highest-value cognitive step in the system and must not run on the cadence default (Sonnet). `run-cadence.ps1` currently hardcodes `--model claude-sonnet-4-6`; it gains a per-task `-Model` parameter. The Signal Engine task runs on the strongest available model. Mechanical tasks (bank recompile, ingest) stay on Sonnet.

### First-run watermark

139 Granola meetings are already synced. The engine processes only meetings with a sync timestamp after the go-live date, recorded as a watermark in the engine's state. No backfill unless Glen explicitly requests a bounded one.

## Component 2: Signal Registry

A Postgres table tracking recognised signals as stateful entities, separate from the per-item idempotency keys.

```
aios_signals:
  id                UUID
  fingerprint       TEXT UNIQUE   (e.g. person:lili_zhao:role_start, topic:mmo_combat_design)
  signal_type       TEXT          (people, product, business, risk, process)
  status            TEXT          (open, proposed, approved, rejected, built, expired)
  first_seen        TIMESTAMP
  last_enriched     TIMESTAMP
  evidence_count    INTEGER
  linked_action_id  UUID FK -> aios_actions (nullable)
  summary           TEXT
```

Rules:

- A signal proposes once. Subsequent meetings mentioning the same signal **enrich** the open proposal (evidence appended, plan refined) instead of creating a new one.
- Rejected signals stay silent. Re-raising requires materially new information (a status change in the underlying facts, not another mention), and the re-raise says explicitly what changed.
- Built signals close. The finance initiative, once constructed, does not get re-proposed.
- Fingerprints are generated deterministically by the engine from entity plus event type; near-duplicates are checked against existing open fingerprints before insert.

## Component 3: Executor

The component that makes approval mean construction.

- A dispatcher (WorkSage cron, frequent polling) picks up `aios_actions` where `approval_state = 'approved'` and `execution_state = 'pending'`.
- Each action type has an execution recipe:
  - **Initiative build:** headless Claude run, loads the named role AGENT.md files and brain modules recorded on the proposal, creates the initiative and task hierarchy via WorkSage API, respecting the fixed Client > Project > Feature > Story > Task hierarchy.
  - **Research brief:** headless Claude run using the deep-research skill with role knowledge, output document lands in the appropriate repo or client folder, link recorded on the action.
  - **Draft:** already pre-actioned at proposal time (Gmail draft exists); execution marks it surfaced.
  - **Task:** direct WorkSage API insert (no LLM needed).
- Execution results update `execution_state` (completed/failed) and trigger a Slack DM to Glen via the broker: "Built: Finance Function Build-Out, 14 tasks under Couch Heroes [link]".
- Failed executions create incident actions; safe failures retry once before escalating.
- The executor writes through existing WorkSage APIs with a dedicated internal service identity. It never bypasses server-side validation.

## Component 4: Delivery Rail (Slack)

### Morning brief as decision queue (07:30 weekdays)

Format replaces the newspaper layout. Capped at 3500 characters. Empty sections suppressed.

```
NBI Morning Brief - 4 July 2026

DO (max 5):
[Approve] [Skip] [More]  Follow-up draft to Jen MacLean (107 days stale)
[Approve] [Skip] [More]  Proposal: Finance Function Build-Out for CH (14 tasks) 
[Decide]                 CH budget model: two-house or single? (from 1 Jul meeting)

KNOW (only if actionable, max 3):
- Rockstar IWGB union filing: brief Vardis if CH UK exposure applies

OVERNIGHT:
- 4 Granola commitments processed: 3 auto-tasks, 1 pending review
- intel-research failed once, auto-retried, succeeded

LEVEL-UP (Mondays only):
Automation idea with evidence, effort S/M/L, [Build it] [Skip] [More]
```

Each DO item is pre-actioned. The buttons are Slack Block Kit interactive components, not text replies.

### Mid-day nudge (14:00 weekdays)

Delta-only: new commitments from morning meetings, actions created since the brief, tasks hitting deadline today/tomorrow, leads crossing the stale threshold. Maximum 4 items. **If nothing changed, it does not send.** Same button interaction model.

### Noise control (hard rules)

- Maximum 3 proposal pushes per day; excess queues for the next brief
- Maximum 10 open proposals at any time; the engine stops proposing until the queue drains
- Unanswered proposals auto-snooze after 7 days into a one-line Friday roll-up
- "No strong candidate" is a valid engine output; forced proposals are worse than none
- Repeated rejection of a category raises its proposal threshold automatically

## Component 5: WorkSage Slack Bot

The conversational layer, replacing the deferred Hermes deployment (no second machine exists; decision 2026-07-04).

**Architecture:**

- Slack Socket Mode listener inside WorkSage (`@slack/bolt`), running under the existing PM2 process or a sibling process
- Inbound authorisation: messages accepted only from Glen's Slack user ID (same allowlist as the outbound broker); everything else ignored and logged
- Block Kit button actions post back to authenticated WorkSage endpoints that update `aios_actions` approval state; approvals wake the executor
- Free-form DMs dispatch to headless Claude (`claude -p`) with NBI Brain context plus topic-matched banks loaded; response returned as a DM
- Sessions are short-lived per conversation thread; the bot records exchanges to a bot log, not to session logs

**Glen can:**

- Approve/skip/expand any AIOS action from phone or desktop
- Ask questions ("What's the CH budget status?") answered from Brain plus banks
- Issue commands ("Draft a follow-up to Jen MacLean", "Remind me about the Goals proposal tomorrow") which create actions/tasks through the same engine schema
- Ask "what did I miss today?" for a day summary from `aios_actions`

**The bot cannot (mechanically, not conventionally):**

- Send email (drafts only, via connectors CLI draft creation)
- Send Slack messages to anyone but Glen (broker allowlist)
- Edit the Brain, decisions log, or CLAUDE.md (write-guard paths)
- Execute arbitrary shell beyond its dispatch recipe
- Access dashboard admin mutation endpoints beyond the AIOS action surface

**Constraints:** responses take 15 to 60 seconds (headless dispatch); the bot states it is working on longer tasks and follows up. Bot conversations are not full Claude Code sessions and do not carry session history beyond the thread.

## Current-State Corrections (verified 2026-07-04)

The 2026-07-01 routine note claiming "outbound broker not yet deployed, 2 CRITICAL defects" is stale. Code inspection shows the Codex Phase 1 findings were substantially remediated: `POST /api/internal/aios/actions` exists with timing-safe internal token auth; the broker fails closed on missing config, has no public direct-send method, uses `FOR UPDATE SKIP LOCKED` claim semantics with stale-claim recovery, enforces the Glen-only allowlist and rate limit. Morning brief runs on 07-01, 07-02, 07-03 exited success including the Slack send step.

**What is not verified: whether the DM actually arrives in Glen's Slack and whether Glen sees it.** Glen reports not checking. Phase 1 verification is therefore end-to-end and human: Glen confirms receipt on his phone.

Known-broken items carried into scope:

- Event capture: zero events since 2026-06-20 (P009, namespace routing suspected)
- Gmail/Slack ingestion: blocked on Google OAuth credentials (connectors SETUP.md step 7) and Slack user-level token; Glen-side setup steps
- Harness proposal backlog P003 to P009 awaiting Glen review (separate from this design; listed for completeness)

## Phases

Sequencing only. Full scope ships; each phase is proven before the next builds on it.

### Phase 1: Delivery and response rail

Nothing else matters if output does not reach Glen and responding is not one tap.

1. Verify morning brief Slack DM end-to-end: cadence run sends, Glen confirms receipt on his phone. Fix whatever breaks in that path.
2. Build the Slack bot: Socket Mode listener, Glen-only inbound allowlist, Block Kit approve/skip/more buttons wired to `aios_actions` state endpoints, free-form DM dispatch to headless Claude with Brain context.
3. Rewrite the morning brief prompt to the decision queue format reading from `aios_actions`.
4. Fix event capture (P009): diagnose the namespace routing, restore event flow, confirm events land for a real session.
5. Add the `-Model` parameter to `run-cadence.ps1` and per-task model mapping in the registry.

**Acceptance:** Glen receives the brief on his phone, taps a button on a real pending action, and the state change lands in `aios_actions` with an audit record. A free-form DM gets a correct Brain-grounded answer. Harness events flow again.

### Phase 2: Signal Engine on Granola

1. Signal Engine nightly analysis attached to the Granola ingest, strongest-model run, go-live watermark set
2. `aios_signals` registry table, fingerprinting, enrich-not-repropose behaviour
3. Graduated autonomy routing with the hard exclusions (external comms, Brain canon, money, client-facing never auto-execute)
4. Executor: dispatcher plus recipes for task, initiative build, and research brief
5. Golden tests from real (post-watermark) Granola notes for extraction precision before any auto-execution is enabled; auto-execution starts disabled and is switched on per category after Glen reviews a week of queued output

**Acceptance:** both worked examples run end-to-end on real data. A new-hire signal produces one workload proposal that, on approval, builds a real WorkSage initiative. A design discussion produces a research offer that, on approval, delivers a finished brief. A signal mentioned in three meetings produces exactly one proposal.

### Phase 3: Widen inputs and rhythm

1. Bank recompile output routed through the Signal Engine (intelligence with client relevance becomes proposals, contradictions become Brain delta candidates)
2. Nightly stale-lead scan producing pre-written Gmail drafts through the same schema
3. Mid-day nudge (14:00, delta-only, suppressed when empty)
4. Monday level-up: weekly session log analysis proposing one automation, with Glen's feedback signals tuning future proposals
5. Cadence failure auto-repair loop (safe repairs attempted and reported; unsafe failures become incident actions)

**Acceptance:** a stale lead produces an approvable draft that exists in Gmail drafts. An intelligence entry with client relevance produces a client-action proposal. The nudge sends only on delta days. Level-up produces a buildable proposal or explicitly reports no candidate.

### Phase 4: Voice and expansion

1. Voice at the desk: VoiceMode (MCP, local, bidirectional) as the first candidate; ElevenLabs TTS if output quality disappoints
2. Gmail and calendar as engine inputs once Glen completes Google OAuth setup
3. Slack ingestion if Glen provisions a user-level token
4. Revisit Hermes/VPS only if the Slack bot proves insufficient as the conversational layer

## Glen-Side Dependencies

| Item | Unlocks | Phase |
|---|---|---|
| Confirm Slack DM receipt on phone | Delivery verification | 1 |
| Google OAuth credentials (SETUP.md step 7) | Gmail ingestion, calendar in brief | 3 to 4 |
| Slack user-level token (optional) | Slack DM ingestion | 4 |
| Review harness backlog P003 to P009 | Harness improvement loop | Parallel |
| Adjudicate 6 open Brain delta corrections | Brain accuracy for engine grounding | Parallel |

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Proposal quality poor, Glen ignores queue (repeat of brief failure) | Strongest model on recognition; noise caps; feedback thresholds; Phase 2 acceptance requires the worked examples to be genuinely good |
| Extraction false positives create wrong tasks | Auto-execution disabled at launch, enabled per category only after a reviewed week; golden tests from real notes |
| Signal fingerprint misses cause duplicate proposals | Near-duplicate check against open fingerprints; enrichment path; Glen's rejects silence the signal |
| Headless bot dispatch produces unverified factual answers | Bot answers grounded in Brain plus banks with the no-fabrication rules in its dispatch prompt; uncertainty stated, never invented |
| Slack Socket Mode process dies silently | PM2 supervision, health check in system-audit cadence, failure creates incident action |
| Executor builds wrong structure in WorkSage | Executor writes via public APIs with server-side hierarchy validation; initiative proposals show the full task tree before approval, so Glen approves the actual structure |
| Cadence commits of engine state conflict across runs | Engine state in Postgres (not committed files) except the watermark; registry lives in the database |
| Model cost of strongest-model nightly runs | One recognition run per day over new meetings only (typically 1 to 4); bounded by design |

## Explicitly Out of Scope

- Sending any external communication automatically (permanent posture, not a phase)
- Second-machine or VPS deployment (revisit at Phase 4 only if needed)
- Replacing the existing cadence tasks (they continue; the engine adds to them)
- Autonomous Brain edits (delta proposals only, Glen adjudicates)
