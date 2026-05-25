# Production Methods -- Knowledge Bank

**Last compiled:** 2026-05-25
**Sources:** 23 Claude session extracts (April-May 2026) + 7 ChatGPT extracts (October 2025 -- January 2026)
**Role associations:** producer, production_consultant

---

## Executive Summary

This bank captures production methodology patterns from NBI's own dashboard development (WorkSage), client delivery work, and external game studio advisory. The patterns span audit-driven improvement cycles, fixed work item hierarchies with prerequisite enforcement, test infrastructure architecture, three-artifact client delivery, hybrid Agile+stage-gate (Agilefall) methodology for AAA studios, org design for 50-100 person studios, salary audit methodology, and SoW report structuring. The strongest signal remains that structured numeric audits drive faster improvement than ad hoc bug fixing, and that work ordering by data-loss risk outperforms ordering by code aesthetics. New material from ChatGPT extracts adds significant depth on studio-scale production: Agilefall as the NBI standard framework for teaching client studios, org design patterns for dual-track (game + platform) studios, and reusable methodologies for production risk assessment, CTO hiring, and consulting report quality assurance.

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
| Agilefall (hybrid Agile + stage-gate) | 25-100 | Y | Gates on top (Discovery through Gold), sprints underneath | NBI standard for teaching production to client studios [source: chatgpt_68fb7b4a] |
| SoW report (15-section, evidence-based) | Client engagements | Y | Evidence Table appendix, multi-role red teaming | Reusable for all NBI consulting deliverables [source: chatgpt_6907ec33] |

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

**Studio-specific data (new):** A ~55-person studio (Couch Heroes) building an MMO-lite with a single producer showed 15 production risks, the most critical being single-producer bottleneck, product-platform scope coupling (game and platform competing for same capacity without hard slice boundaries), and integration instability across UE5 client, dedicated servers, patcher, and microservices. One producer cannot sustainably coordinate game content, platform work, backend services, build pipelines, playtests, partners, and vendors simultaneously. [source: chatgpt_69034e5d]

**Org design at this scale:** Five structural anti-patterns identified: producer mis-parented through Finance/Ops instead of studio delivery leader; platform treated as ops subteam when it needs GM-style ownership; CTO span too flat with no engineering managers; Tech Art/VFX in grey zone between Art and Engineering; content disciplines not grouped under Game Director. Three alternatives proposed: Classic Functional with strong EP hub (best under 60), Pod/Strike Team (best for parallel workstreams), Platform+Game dual-track with shared services (best when platform is genuinely strategic). [source: chatgpt_6967809b]

---

## By Working Model

### Fully Remote

NBI operates fully remote. Couch Heroes (client, ~55 employees UK+Greece) is 100% remote. Key adaptations observed:

- **Async approval cycles.** The principal reviews finished products, not intermediate drafts. No phase gates during execution. [source: handoff_2026-04-04_finances_and_features]
- **Screenshot/video-based UAT.** Glen reports issues via screenshots and voice messages in real time. The builder must verify visually (Playwright e2e tests), not just check HTTP status codes. [source: handoff_2026-04-06c_glen_uat]
- **Self-hosted infrastructure at zero cost.** Cloudflare Tunnel + PM2 on a personal PC provides production hosting with SSL, DDoS protection, and process management. Viable for internal tools serving remote teams. [source: handoff_2026-04-09a_move_to_nine]
- **Multi-user sync.** Incremental change polling every 10 seconds with optimistic concurrency and crash recovery via IndexedDB write-ahead log. Full-refresh polling destroys scroll position and user state. [source: handoff_2026-04-06c_glen_uat]

### Hybrid

No direct data from hybrid studios yet. The AAA Agilefall guide specifies hybrid London/Cambridge for leadership roles with remote UK for others, but no outcome data on this model. [source: chatgpt_68fb7b4a] [See Open Questions]

### Co-located

No direct data from co-located studios yet. [See Open Questions]

---

## Sprint/Cycle Length Evidence

### Agilefall: Hybrid Stage-Gate + Sprints (NBI Standard for Client Studios)

The NBI standard framework for teaching production to client studios is Agilefall: milestone gates on top (Discovery, Pre-production, Production, Alpha, Beta, Gold) with iterative sprints underneath. Pre-production exits with a playable vertical slice. Two planning horizons: quarterly PI planning (8-12 weeks) plus sprint planning (1-2 weeks). AAA needs clear funding/risk approval gates but also iterative delivery; hybrid is the only practical model. [source: chatgpt_68fb7b4a]

**Weekly rhythm:** daily standup 15min, backlog refinement 60-90min, sprint planning 2-4h, sprint review 60-120min, retrospective 60min. Backlog hierarchy: Epics > Features > User Stories > Tasks. Definition of Ready: clear problem, acceptance criteria, dependencies mapped, assets identified, team agreement. Definition of Done: criteria met, code reviewed, assets integrated, tests pass, docs updated, build green. [source: chatgpt_68fb7b4a]

### Audit-Driven Sprints (Variable Length)

Rather than fixed-length sprints, NBI uses audit-driven improvement cycles internally. A numeric audit scores the system across multiple dimensions (19 dimensions in the initial audit), identifies gaps, and the team works through themed sprints until the score improves. The cycle length is determined by the work, not by a calendar. [source: handoff_2026-04-08b_comprehensive_improvement]

Sprint grouping by concern area prevents context-switching: (1) Foundation, (2) Security, (3) Performance, (4) Frontend architecture, (5) UX, (6) Operations. This ordering (foundation > security > performance > frontend > UX > ops) reflects the principle that infrastructure must be solid before features are polished. [source: handoff_2026-04-08b_comprehensive_improvement]

### Autonomous Execution Sessions

Large backlogs can be cleared in single autonomous sessions when a plan is pre-approved. One session cleared 33 bug tracker items and built 7 features. Enabling conditions: (1) approved plan with clear scope, (2) autonomous execution authority, (3) established test infrastructure. [source: handoff_2026-04-14a_full_backlog_clearance]

### No Evidence for Fixed-Length Sprints (Internal)

NBI does not use 1-week or 2-week sprints internally. Work is structured by milestone deliverables, never by duration. Glen explicitly rejects timeline estimates. However, Agilefall recommends 1-2 week sprints for client studios. [source: handoff_2026-04-17a_news_aggregator_m1_start, chatgpt_68fb7b4a]

---

## Pre-Production to Production Transitions

### The Approval Gate Pattern

Glen's approval style creates a natural pre-production/production boundary. He reviews comprehensive audits and makes binary decisions: "build now" or "discuss approach first." Features approved as "build now" move immediately to execution. [source: handoff_2026-04-04_finances_and_features]

### Agilefall Gate Criteria

In the Agilefall framework, pre-production exits with a playable vertical slice. Each gate has explicit entry/exit criteria and funding/risk review. [source: chatgpt_68fb7b4a]

### Data Migration as a Gate

The double-escape migration (fixing HTML entities) required fixpoint loop processing, correct ordering, and full database backup. Principle: escape at render, never at storage. [source: handoff_2026-04-15a_double_escape_migration]

### Security as a Gate

Security reviews must happen after every major feature build. Additional patterns: safeUrl() for user-controlled href, timingSafeEqual for internal service auth, failover latches with auto-reset. [source: handoff_2026-04-05a_leads_expenses_qa, handoff_2026-04-18_worksage_audit_sprint]

---

## Live Ops Cadence

### Automated Communication Cadence

NBI's live operations use three automated email cadences: PM daily report (08:00 weekdays), due/late ticket warnings (09:00 weekdays), inbound email-to-task matching (polls every 10 minutes). All email through Microsoft Graph API. [source: handoff_2026-04-16b_full_day]

### Monitoring and Recovery

Circuit breaker pattern (3 failures, 60-second reset). 10-second incremental sync polling with cooldown. Prometheus metrics on /metrics. [source: handoff_2026-04-09a_move_to_nine, handoff_2026-04-06c_glen_uat]

### No Genre-Specific Live Ops Data

Live ops cadence data is limited to internal tooling. No game-specific update scheduling or seasonal content cadence data yet. [See Open Questions]

---

## Design and Iteration Methodology

### Visual Design Requires Multiple Iterations

Visual design for Glen requires 5-7 mockup iterations. The Command Centre went through 7 versions before approval. Design for large monitors first. [source: handoff_2026-05-11_command_centre]

### Build Antipatterns (Post-Mortem Evidence)

Six antipatterns from a failed build session: (1) No visual verification, (2) Context rot, (3) Shotgun debugging, (4) Workaround normalisers, (5) Visual quality abandonment, (6) Commit noise. [source: handoff_2026-05-12_command_centre_build]

### The LLM Wiki and AutoResearch Patterns

Compile-client pattern: compile client document folder into structured knowledge base. AutoResearch: score > improve > score > converge. Both applicable to consulting deliverables. [source: handoff_2026-05-13_karpathy_capabilities]

---

## Consulting Delivery Methodology

### SoW Report Structure (15-Section Standard)

NBI's standard C-level consulting report: (1) Executive Summary with top 8 risks, (2) Background and Intent, (3) Scope of Work with in/out boundaries anchored to contract clause references, (4) Deliverables and Acceptance with measurable tests, (5) Delivery Plan with entry/exit criteria, (6) Technical Architecture, (7) Cross-Play Readiness, (8) Design/Product Readiness, (9) KPI Tree with target bands and owners, (10) Risk Register top 20 ranked by impact x likelihood, (11) Staffing Plan and RACI, (12) Commercials and Change Control, (13) Governance and Communication, (14) Assumptions/Dependencies/Open Questions, (15) Appendices with Evidence Table. Multi-role red teaming embedded in the process. [source: chatgpt_6907ec33]

### Milestone Staging Validation

Work plans must be validated against actual consultant capacity. Tasks are tagged to milestones and counted per epic to identify front-loading, back-loading, or unrealistic clustering. Client priority drives sequencing (hiring and org chart work first for CH). [source: chatgpt_69395da6]

### Production Risk Assessment Methodology

Diagnose before prescribing: problems only, no mitigations in the initial assessment. A ~50-person studio assessment yielded 15 prioritised risks covering bottlenecks, scope coupling, integration instability, topology uncertainty, pipeline fragility, dependency blindness, QA gaps, telemetry gaps, partner volatility, and compliance deferral. This diagnostic-first approach built trust and led to a multi-workstream engagement. [source: chatgpt_69034e5d]

### CTO Hiring for Game Studios

When a studio has non-games C-level leadership and junior engineering staff, the CTO must be a hybrid Live-Service Game + Platform CTO -- not a general web CTO or pure engine CTO. Must-haves: shipped online sessioned game, live economy with audit trails, service contracts with schema versioning, ability to uplift junior teams. Output is leads, standards, and predictable delivery -- not hero coding. Interview screening: incident postmortems, perf testing specifics, auditable entitlement design, multi-mode containment, standards that stuck on junior teams. [source: chatgpt_69437062]

### Salary Data Quality Assurance

Two-track audit for salary data: Track 1 (file structure) assesses encoding, consistency, and analysis readiness. Track 2 (salary accuracy) validates by role, grade, country, hub status, currency, and year. Common failures: monthly values in annual columns, currency mismatches, mixed year basis, hub vs non-hub reversed, grade progression broken. Each issue gets Issue_ID, Severity, Dimension, Symptom, Evidence, Proposed fix, and Confidence score. Every benchmark requires a real citation. [source: chatgpt_69698081]

---

## Knowledge Architecture as Production Infrastructure

### Role Dispatch System

NBI's AI operating system uses deterministic role dispatch: skill-triggered and topic-detected routing. Transferable to studios using structured knowledge architecture for on-demand expertise. [source: handoff_2026-05-15_aios_audit_phase1]

### Configuration as Production Pattern

Permission management, context window management, and information density all directly impact velocity. [source: handoff_2026-04-19_settings_overhaul]

### Technology Selection Discipline

Evaluate tools by reading source code, not star counts. React rejected for WorkSage. Agent SDK rejected for batch workloads (~13K tokens overhead per call). [source: handoff_2026-04-17c_news_m2_m3_complete, handoff_2026-04-18_desktop_migration_complete]

---

## Open Questions

- **Studio-specific sprint data.** Need data from client studios on actual sprint/cycle patterns and outcomes beyond NBI's own development.
- **Hybrid and co-located adaptations.** No data on what changes when teams are not fully remote.
- **Genre-specific live ops cadence.** No data on update scheduling or seasonal content cadence by game genre.
- **Scale transition pain points.** No data on what breaks when studios grow from 25 to 50 or 50 to 100 people.
- **Multi-stakeholder production gates.** NBI's implicit gate (Glen's approval) does not generalise. Need a framework for multi-stakeholder gates.
- **Estimation and velocity.** Glen rejects timeline estimates, but client studios need some predictability. How to reconcile milestone-based structuring with client expectations.
- **Agilefall outcomes data.** The framework is the NBI standard but no client implementation outcome data exists yet.
- **MTX consulting delivery patterns.** The 8-workstream MTX SoW structure exists but no delivery outcome data. [source: chatgpt_68e3cfc8]

---

## Source Index

| Extract ID | Date | Key Topics |
|---|---|---|
| handoff_2026-04-04_finances_and_features | 2026-04-04 | Feature approval in bulk |
| handoff_2026-04-05a_leads_expenses_qa | 2026-04-05 | Data-driven configuration, security review |
| handoff_2026-04-06a_ux_overhaul | 2026-04-06 | 22 UX decisions |
| handoff_2026-04-06c_glen_uat | 2026-04-06 | Scroll preservation, live UAT, sync poll |
| handoff_2026-04-07b_expenses_finance_qa | 2026-04-07 | Consulting P&L structure |
| handoff_2026-04-08b_comprehensive_improvement | 2026-04-08 | 19-dimension audit, themed sprints |
| handoff_2026-04-09a_move_to_nine | 2026-04-09 | Production hosting, migration framework |
| handoff_2026-04-11b_hierarchy_dependencies_timeline | 2026-04-11 | 4-level hierarchy, prerequisites |
| handoff_2026-04-14a_full_backlog_clearance | 2026-04-14 | SoW extraction, autonomous session |
| handoff_2026-04-15a_double_escape_migration | 2026-04-15 | XSS model, fixpoint migration |
| handoff_2026-04-15b_test_infra_and_kanban_next | 2026-04-15 | Vitest + Playwright, CJS/ESM |
| handoff_2026-04-16b_full_day | 2026-04-16 | Email integration, multi-tenancy |
| handoff_2026-04-17a_news_aggregator_m1_start | 2026-04-17 | No scope-watering, no timelines |
| handoff_2026-04-17c_news_m2_m3_complete | 2026-04-17 | Agent SDK overhead, raw SDK |
| handoff_2026-04-18_desktop_migration_complete | 2026-04-18 | React rejection, CLI migration |
| handoff_2026-04-18_worksage_audit_sprint | 2026-04-18 | Security patterns |
| handoff_2026-04-18_portfolio_dashboard_v2 | 2026-04-18 | Executive dashboard design |
| handoff_2026-04-19_tech_debt_sprint | 2026-04-19 | Risk-first tech debt ordering |
| handoff_2026-04-19_settings_overhaul | 2026-04-19 | Context efficiency |
| handoff_2026-04-21_goals_deliverables | 2026-04-21 | Three-artifact delivery |
| handoff_2026-05-11_command_centre | 2026-05-11 | 7 mockup iterations |
| handoff_2026-05-12_command_centre_build | 2026-05-12 | 6 build antipatterns |
| handoff_2026-05-13_karpathy_capabilities | 2026-05-13 | LLM Wiki, AutoResearch |
| handoff_2026-05-15_aios_audit_phase1 | 2026-05-15 | Role dispatch, AIOS |
| chatgpt_68fb7b4a | 2025-10-24 | AAA Agilefall production guide |
| chatgpt_69034e5d | 2025-10-30 | 50-person studio production risks |
| chatgpt_6907ec33 | 2025-11-02 | 15-section SoW report structure |
| chatgpt_69395da6 | 2025-12-10 | Milestone staging validation |
| chatgpt_69437062 | 2025-12-18 | CTO profile for MMO-lite studio |
| chatgpt_6967809b | 2026-01-14 | Org design alternatives |
| chatgpt_69698081 | 2026-01-16 | Salary audit methodology |
