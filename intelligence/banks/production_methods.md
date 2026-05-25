# Production Methods — Knowledge Bank

**Last compiled:** 2026-05-25
**Sources:** 23 extracts from Claude session handoffs (April-May 2026)
**Role associations:** producer, production_consultant

---

## Executive Summary

This bank captures production methodology patterns observed during NBI's own dashboard development (WorkSage) and client delivery work. The patterns are transferable to game studio advisory: audit-driven improvement cycles, fixed work item hierarchies with prerequisite enforcement, test infrastructure architecture for CJS/ESM hybrid stacks, and a three-artifact client delivery model. The strongest signal is that structured numeric audits drive faster improvement than ad hoc bug fixing, and that work ordering by data-loss risk outperforms ordering by code aesthetics. These patterns apply directly to studios of 20-100 people building internal tools and live service games.

---

## Framework Comparison

| Framework | Team Size Sweet Spot | Remote-Friendly | Game-Specific Adaptations | Known Outcomes |
|---|---|---|---|---|
| Audit-driven sprints (scored dimensions) | 5-50 | Y | Themed sprint grouping by concern area | +0.7 points (6.6 to 7.3) in one session across 19 dimensions [source: handoff_2026-04-08b_comprehensive_improvement] |
| Bug triage pipeline (7-step) | Any | Y | Mandatory comment with root cause + repro steps | 33 items cleared in single autonomous session [source: handoff_2026-04-14a_full_backlog_clearance] |
| Bulk feature approval | 1-10 (principal-led) | Y | Present complete audit, not piecemeal proposals | 15 features + 13 UI changes approved in one session [source: handoff_2026-04-04_finances_and_features] |
| Tech debt ordering (risk-first) | Any | Y | Data-loss risk > architectural drift > CSP > state management | All 20 critical audit items resolved before features [source: handoff_2026-04-19_tech_debt_sprint] |
| Three-artifact delivery | Client teams | Y | Excel (planning) + Word (execution) + live tracker (WorkSage) | Goals Studio engagement delivered on time [source: handoff_2026-04-21_goals_deliverables] |
| AutoResearch iteration loop | Any (AI-assisted) | Y | Score > improve > score > converge on quality criteria | Applicable to consulting deliverables, pricing models, pitch decks [source: handoff_2026-05-13_karpathy_capabilities] |

---

## By Team Scale

### 10-25 People

At this scale, the principal (MD/CEO) can review and approve work in bulk. NBI's own pattern: Glen reviews complete feature audits and approves or rejects in a single session. No sprint planning ceremonies needed -- the principal sets priority directly. [source: handoff_2026-04-04_finances_and_features]

Key patterns that work at this scale:
- **Autonomous execution with pre-approved plans.** Once a plan is approved, the builder executes without check-ins. Glen's directive: "Do the ones you can do on your own." Escalate only decisions and architectural choices. [source: handoff_2026-04-19_tech_debt_sprint]
- **Bug triage pipeline.** Even at small scale, every bug needs a formal 7-step pipeline (Receive > Review > Plan > Prioritise > Fix > Test > Update). Batching bugs and dismissing skill gates leads to missed root causes. [source: handoff_2026-04-14a_full_backlog_clearance]
- **Live UAT with the principal.** Glen tests on both desktop and phone simultaneously. Expect 5+ iterations on UX issues. The first "fix" is rarely the last. [source: handoff_2026-04-06c_glen_uat]

### 25-50 People

At this scale, client-scoped multi-tenancy becomes necessary. NBI implemented role-based data scoping: external users see only their client's data, internal users with teams see team clients plus shared projects, admins see everything. 40+ endpoints scoped via a centralised function. [source: handoff_2026-04-16b_full_day]

The work item hierarchy must be enforced across all levels. NBI's fixed 4-level hierarchy (Project > Feature > Story > Task) is enforced at database, server, and frontend levels. Prerequisite enforcement uses hard-block on completion (cannot mark Done with incomplete prereqs) and soft-warn on starting (warning with override). [source: handoff_2026-04-11b_hierarchy_dependencies_timeline]

Client deliverables at this scale follow the three-artifact pattern: Excel tracker (planning), Word guide (execution), live dashboard (tracking). All three must stay synchronised. [source: handoff_2026-04-21_goals_deliverables]

### 50-100 People

At this scale, the patterns above still apply but require infrastructure investment:
- **Migration frameworks** become essential. Numbered SQL files with a version tracking table, applied in order by a runner script. Never edit a committed migration. [source: handoff_2026-04-09a_move_to_nine]
- **Test infrastructure** must handle CJS/ESM interop, separate test databases, and fixture factories for consistent test data. Test suites grew from 23 to 400+ tests over six weeks. [source: handoff_2026-04-15b_test_infra_and_kanban_next]
- **Data-driven configuration** replaces hardcoded values. Pipeline stages, field options, resource types, and sectors all stored in the database, never in code. [source: handoff_2026-04-05a_leads_expenses_qa]

No direct studio data at 50-100 scale beyond NBI's own tooling observations. This is a gap area. [See Open Questions]

---

## By Working Model

### Fully Remote

NBI operates fully remote. Couch Heroes (client, ~55 employees UK+Greece) is 100% remote. Key adaptations observed:

- **Async approval cycles.** The principal reviews finished products, not intermediate drafts. No phase gates during execution. [source: handoff_2026-04-04_finances_and_features]
- **Screenshot/video-based UAT.** Glen reports issues via screenshots and voice messages in real time. The builder must verify visually (Playwright e2e tests), not just check HTTP status codes. [source: handoff_2026-04-06c_glen_uat]
- **Self-hosted infrastructure at zero cost.** Cloudflare Tunnel + PM2 on a personal PC provides production hosting with SSL, DDoS protection, and process management. Viable for internal tools serving remote teams. [source: handoff_2026-04-09a_move_to_nine]
- **Multi-user sync.** Incremental change polling every 10 seconds with optimistic concurrency and crash recovery via IndexedDB write-ahead log. Full-refresh polling destroys scroll position and user state. [source: handoff_2026-04-06c_glen_uat]

### Hybrid

No direct data from hybrid studios yet. [See Open Questions]

### Co-located

No direct data from co-located studios yet. [See Open Questions]

---

## Sprint/Cycle Length Evidence

### Audit-Driven Sprints (Variable Length)

Rather than fixed-length sprints, NBI uses audit-driven improvement cycles. A numeric audit scores the system across multiple dimensions (19 dimensions in the initial audit), identifies gaps, and the team works through themed sprints until the score improves. The cycle length is determined by the work, not by a calendar. [source: handoff_2026-04-08b_comprehensive_improvement]

Sprint grouping by concern area prevents context-switching:
1. Foundation (logging, timeouts, validation, indexes, process config)
2. Security (session handling, XSS, audit logging, RBAC)
3. Performance (query consolidation, N+1 fixes, pagination, caching)
4. Frontend architecture (render decomposition, event listeners, undo)
5. UX (conflict resolution, offline support, responsive)
6. Operations (backup, validation, monitoring, dead code)

This ordering (foundation > security > performance > frontend > UX > ops) reflects the principle that infrastructure must be solid before features are polished. [source: handoff_2026-04-08b_comprehensive_improvement]

### Autonomous Execution Sessions

Large backlogs can be cleared in single autonomous sessions when a plan is pre-approved. One session cleared 33 bug tracker items and built 7 features. The enabling conditions: (1) approved plan with clear scope, (2) autonomous execution authority, (3) established test infrastructure. [source: handoff_2026-04-14a_full_backlog_clearance]

### No Evidence for Fixed-Length Sprints

NBI does not use 1-week or 2-week sprints internally. Work is structured by milestone deliverables, never by duration. Glen explicitly rejects timeline estimates: "Stop quoting timelines; you're terrible at them." [source: handoff_2026-04-17a_news_aggregator_m1_start]

---

## Pre-Production to Production Transitions

### The Approval Gate Pattern

Glen's approval style creates a natural pre-production/production boundary. He reviews comprehensive audits and makes binary decisions: "build now" or "discuss approach first." There is no "park it for later" category. Features approved as "build now" move immediately to execution. Features needing approach discussion stay in pre-production until the approach is agreed. [source: handoff_2026-04-04_finances_and_features]

### Data Migration as a Gate

Major data migrations serve as production gates. The double-escape migration (fixing HTML entities compounded across every text field) required:
- Fixpoint loop processing (multiple passes until no change)
- Correct ordering (decode &amp; before other entities)
- Full database backup before execution
- Verification that post-migration backups are safe but pre-migration backups will re-corrupt

The principle: escape at render, never at storage. Raw text in the database is the correct state. [source: handoff_2026-04-15a_double_escape_migration]

### Security as a Gate

Security reviews must happen after every major feature build, not as a separate phase. NBI discovered critical issues (static middleware exposing the entire parent directory, path traversal on attachments, missing RBAC on admin endpoints) only through post-feature security passes. [source: handoff_2026-04-05a_leads_expenses_qa]

Additional security patterns established as production prerequisites: safeUrl() for user-controlled href contexts, timingSafeEqual for internal service authentication, failover latches with auto-reset (6-hour cooldown). [source: handoff_2026-04-18_worksage_audit_sprint]

---

## Live Ops Cadence

### Automated Communication Cadence

NBI's live operations use three automated email cadences:
- **PM daily report:** 08:00 weekdays
- **Due/late ticket warnings:** 09:00 weekdays
- **Inbound email-to-task matching:** polls every 10 minutes, fuzzy matches subject to client/task

All email goes through Microsoft Graph API (not SMTP -- Azure Security Defaults block SMTP AUTH). [source: handoff_2026-04-16b_full_day]

### Monitoring and Recovery

- **Circuit breaker pattern:** 3 failures trigger open state, 60-second reset period. Applied to all external API integrations (OCR, FX rates, email). [source: handoff_2026-04-09a_move_to_nine]
- **Sync poll architecture:** 10-second incremental polling with cooldown to suppress re-renders of the user's own changes. The sync poll detecting its own changes bouncing from the server was the root cause of scroll reset issues. [source: handoff_2026-04-06c_glen_uat]
- **Prometheus metrics:** exposed on /metrics endpoint for operational monitoring. [source: handoff_2026-04-09a_move_to_nine]

### No Genre-Specific Live Ops Data

Live ops cadence data is currently limited to internal tooling operations. No game-specific update scheduling, event planning, or seasonal content cadence data yet. [See Open Questions]

---

## Design and Iteration Methodology

### Visual Design Requires Multiple Iterations

Visual design for Glen requires 5-7 mockup iterations. The Command Centre went through 7 versions before approval. Common rejection patterns: "looks like shit on widescreen" (must design for large monitors first), "underwhelming value" (must show intelligence not inventory), text-heavy views rejected in favour of charts/rings/bars/gauges. [source: handoff_2026-05-11_command_centre]

### Build Antipatterns (Post-Mortem Evidence)

Six antipatterns identified from a failed build session [source: handoff_2026-05-12_command_centre_build]:

1. **No visual verification.** Claiming "fixed" without testing. The builder must verify visually or explicitly state they cannot and ask the principal to check.
2. **Context rot.** Late in a session, basic schema lookups are missed. Always check actual schema before writing queries.
3. **Shotgun debugging.** Trying random CSS approaches without diagnosing first. Use computed styles inspection, then fix once.
4. **Workaround normalisers.** Adding data transformation layers instead of finding the root cause. Multiplies maintenance burden.
5. **Visual quality abandonment.** Approved mockups were glassmorphic and animated; implementation was flat boxes with text. Subagents need full HTML structure, not just CSS class names.
6. **Commit noise.** 24 small commits for what should have been a focused build-then-fix cycle.

### The LLM Wiki and AutoResearch Patterns

Two patterns from Karpathy's work applied to production methodology [source: handoff_2026-05-13_karpathy_capabilities]:

- **LLM Wiki (compile-client):** Compile a client's document folder into a structured knowledge base with source provenance. Compile once, load the artefact, never re-read raw sources every session.
- **AutoResearch:** Score documents against weighted criteria, make atomic improvements, re-score until convergence. Applicable to consulting deliverables, pricing models, and pitch decks.

---

## Knowledge Architecture as Production Infrastructure

### Role Dispatch System

NBI's AI operating system uses deterministic role dispatch: when conversation enters a domain topic, the corresponding role's expert knowledge (AGENT.md, 150-250 lines) loads automatically. Two routing mechanisms: skill-triggered (e.g., brainstorming loads VP Product context) and topic-detected (e.g., legal conversation loads General Counsel context). [source: handoff_2026-05-15_aios_audit_phase1]

This is transferable to studios: instead of hiring full-time specialists in every domain, a structured knowledge architecture can route expertise on demand.

### Configuration as Production Pattern

Context efficiency directly impacts production velocity. Three patterns [source: handoff_2026-04-19_settings_overhaul]:
- Permission management: wildcard permissions eliminate friction from granular allow-lists
- Context window management: proper sizing prevents premature context loss
- Information density: skill descriptions trimmed from ~1536 chars to 200 chars each saved ~125K chars per turn

### Technology Selection Discipline

Evaluate tools by reading source code and architecture, not by star counts and READMEs. The Agent SDK discovery illustrates this: it adds ~13K tokens overhead per call, making it unusable for batch workloads despite being the "official" tool. The correct choice (raw SDK with streaming) was only discovered by investigating the actual token usage. [source: handoff_2026-04-17c_news_m2_m3_complete]

Similarly, React was explicitly rejected for WorkSage because it does not earn its keep for a single-page internal dashboard. Technology selection must match the actual complexity of the use case, not industry convention. [source: handoff_2026-04-18_desktop_migration_complete]

---

## Open Questions

- **Studio-specific sprint data.** All current evidence comes from NBI's own development. Need data from client studios (Couch Heroes, Goals, Lighthouse) on their actual sprint/cycle patterns and outcomes.
- **Hybrid and co-located adaptations.** No data on what changes when teams are not fully remote. Couch Heroes (100% remote) and NBI (remote) are the only data points.
- **Genre-specific live ops cadence.** No data on update scheduling, event planning, or seasonal content cadence by game genre. This is critical for production consulting.
- **Scale transition pain points.** No data on what breaks when studios grow from 25 to 50 or 50 to 100 people. The hierarchy and prerequisite patterns may need different enforcement at larger scales.
- **Pre-production gate criteria.** NBI's implicit gate (Glen's approval) does not generalise to studios with multiple stakeholders. Need a framework for multi-stakeholder production gates.
- **Estimation and velocity.** Glen explicitly rejects timeline estimates, but client studios need some form of predictability. How to reconcile milestone-based structuring with client expectations for delivery dates.

---

## Source Index

| Extract ID | Date | Key Topics |
|---|---|---|
| handoff_2026-04-04_finances_and_features | 2026-04-04 | Feature approval in bulk, "build now" vs "discuss approach" |
| handoff_2026-04-05a_leads_expenses_qa | 2026-04-05 | Data-driven configuration, security review cadence |
| handoff_2026-04-06a_ux_overhaul | 2026-04-06 | 22 UX decisions, tab naming, client ordering, manual health state |
| handoff_2026-04-06c_glen_uat | 2026-04-06 | Scroll preservation, live UAT methodology, sync poll patterns |
| handoff_2026-04-07b_expenses_finance_qa | 2026-04-07 | Consulting P&L structure, expense workflow |
| handoff_2026-04-08b_comprehensive_improvement | 2026-04-08 | 19-dimension audit, themed sprint grouping, 6.6 to 7.3 score |
| handoff_2026-04-09a_move_to_nine | 2026-04-09 | Production hosting, migration framework, circuit breaker |
| handoff_2026-04-11b_hierarchy_dependencies_timeline | 2026-04-11 | 4-level hierarchy, prerequisite enforcement, terminology |
| handoff_2026-04-14a_full_backlog_clearance | 2026-04-14 | SoW extraction, 33+7 autonomous session velocity |
| handoff_2026-04-15a_double_escape_migration | 2026-04-15 | XSS model, fixpoint migration, escape-at-render |
| handoff_2026-04-15b_test_infra_and_kanban_next | 2026-04-15 | Vitest + Playwright, CJS/ESM interop, fixture factories |
| handoff_2026-04-16b_full_day | 2026-04-16 | Email integration, client-scoped multi-tenancy |
| handoff_2026-04-17a_news_aggregator_m1_start | 2026-04-17 | No scope-watering rule, no timelines rule |
| handoff_2026-04-17c_news_m2_m3_complete | 2026-04-17 | Agent SDK overhead, raw SDK pattern, actual cost data |
| handoff_2026-04-18_desktop_migration_complete | 2026-04-18 | React rejection, CLI migration, worktree discipline |
| handoff_2026-04-18_worksage_audit_sprint | 2026-04-18 | Security patterns, safeUrl, timingSafeEqual, failover latch |
| handoff_2026-04-18_portfolio_dashboard_v2 | 2026-04-18 | Executive dashboard design, progressive disclosure, RAG cards |
| handoff_2026-04-19_tech_debt_sprint | 2026-04-19 | Risk-first tech debt ordering, autonomous execution trust |
| handoff_2026-04-19_settings_overhaul | 2026-04-19 | Context efficiency, permission management, information density |
| handoff_2026-04-21_goals_deliverables | 2026-04-21 | Three-artifact delivery, Excel + Word + WorkSage |
| handoff_2026-05-11_command_centre | 2026-05-11 | 7 mockup iterations, visual design process |
| handoff_2026-05-12_command_centre_build | 2026-05-12 | 6 build antipatterns, visual verification, context rot |
| handoff_2026-05-13_karpathy_capabilities | 2026-05-13 | LLM Wiki, AutoResearch, compile-client pattern |
| handoff_2026-05-15_aios_audit_phase1 | 2026-05-15 | Role dispatch, knowledge architecture, CLAUDE.md design |
