# Production Methods -- Knowledge Bank

**Last compiled:** 2026-05-25
**Sources:** 35 extracts (23 Claude sessions, 7 ChatGPT, 5 OneDrive) -- April 2025 to May 2026
**Role associations:** producer, production_consultant

---

## Executive Summary

This bank captures production methodology patterns from NBI's own dashboard development (WorkSage), client delivery work, and external game studio advisory. The patterns span audit-driven improvement cycles, fixed work item hierarchies with prerequisite enforcement, test infrastructure architecture, three-artifact client delivery, hybrid Agile+stage-gate (Agilefall) methodology for AAA studios, org design for 50-100 person studios, salary audit methodology, SoW report structuring, leadership offsite design, feature classification frameworks, production data consolidation from multiple tools, and GTM backlog structuring. The strongest signal remains that structured numeric audits drive faster improvement than ad hoc bug fixing. New material adds significant depth on studio-scale production: 3-day offsite methodology with pre-decisions and facilitation playbooks, 1,200+ item feature classification using type x layer matrices, and multi-source production data consolidation methodology.

---

## Framework Comparison

| Framework | Team Size Sweet Spot | Remote-Friendly | Game-Specific Adaptations | Known Outcomes |
|---|---|---|---|---|
| Audit-driven sprints (scored dimensions) | 5-50 | Y | Themed sprint grouping by concern area | +0.7 points (6.6 to 7.3) across 19 dimensions [source: handoff_2026-04-08b_comprehensive_improvement] |
| Bug triage pipeline (7-step) | Any | Y | Mandatory comment with root cause + repro steps | 33 items cleared in single session [source: handoff_2026-04-14a_full_backlog_clearance] |
| Bulk feature approval | 1-10 (principal-led) | Y | Present complete audit, not piecemeal proposals | 15 features + 13 UI changes in one session [source: handoff_2026-04-04_finances_and_features] |
| Tech debt ordering (risk-first) | Any | Y | Data-loss risk > architectural drift > CSP > state | All 20 critical items resolved before features [source: handoff_2026-04-19_tech_debt_sprint] |
| Three-artifact delivery | Client teams | Y | Excel (planning) + Word (execution) + WorkSage (tracking) | Goals engagement delivered on time [source: handoff_2026-04-21_goals_deliverables] |
| AutoResearch iteration loop | Any (AI-assisted) | Y | Score > improve > score > converge | Applicable to consulting deliverables [source: handoff_2026-05-13_karpathy_capabilities] |
| Agilefall (hybrid stage-gate + sprints) | 25-100 | Y | Gates on top, sprints underneath | NBI standard for client studios [source: chatgpt_68fb7b4a] |
| SoW report (15-section, evidence-based) | Client engagements | Y | Evidence Table appendix, multi-role red teaming | Reusable for all NBI deliverables [source: chatgpt_6907ec33] |
| Leadership offsite (3-day) | 50-100 (leadership) | N (in-person) | Pre-decisions, feature sweep, gate criteria, pipeline RACI | CH offsite delivered [source: ch_offsite_agenda_2026-04-27] |
| Feature classification (type x layer) | Any with 500+ items | Y | System/Feature/Content/Platform/LiveService taxonomy | 1,203 items classified for CH [source: ch_game_classification_2026-04] |

---

## By Team Scale

### 10-25 People

At this scale, the principal can review and approve work in bulk. NBI's pattern: Glen reviews complete feature audits and approves or rejects in a single session. No sprint planning ceremonies needed. [source: handoff_2026-04-04_finances_and_features]

Key patterns:
- **Autonomous execution with pre-approved plans.** Once approved, the builder executes without check-ins. Escalate only decisions and architectural choices. [source: handoff_2026-04-19_tech_debt_sprint]
- **Bug triage pipeline.** Even at small scale, every bug needs a formal 7-step pipeline. [source: handoff_2026-04-14a_full_backlog_clearance]
- **Live UAT with the principal.** Expect 5+ iterations on UX issues. [source: handoff_2026-04-06c_glen_uat]

### 25-50 People

At this scale, client-scoped multi-tenancy becomes necessary. Role-based data scoping: external users see only their client's data. 40+ endpoints scoped via centralised function. [source: handoff_2026-04-16b_full_day]

Work item hierarchy must be enforced: Project > Feature > Story > Task at database, server, and frontend levels. Prerequisite enforcement uses hard-block on completion, soft-warn on starting. [source: handoff_2026-04-11b_hierarchy_dependencies_timeline]

Three-artifact delivery pattern for client work: Excel tracker, Word guide, live dashboard. [source: handoff_2026-04-21_goals_deliverables]

### 50-100 People

Infrastructure investment required:
- **Migration frameworks:** Numbered SQL files with version tracking, never edit committed migrations. [source: handoff_2026-04-09a_move_to_nine]
- **Test infrastructure:** CJS/ESM interop, separate test databases, fixture factories. Test suites grew from 23 to 400+ over six weeks. [source: handoff_2026-04-15b_test_infra_and_kanban_next]
- **Data-driven configuration:** Pipeline stages, field options, resource types all in database, never in code. [source: handoff_2026-04-05a_leads_expenses_qa]

**Studio-specific data:** A ~55-person studio showed 15 production risks, most critical being single-producer bottleneck, product-platform scope coupling, and integration instability across UE5 client, servers, patcher, and microservices. [source: chatgpt_69034e5d]

**Org design at this scale:** Five structural anti-patterns identified. Three alternatives: Classic Functional with strong EP hub (best under 60), Pod/Strike Team (parallel workstreams), Platform+Game dual-track (when platform is genuinely strategic). [source: chatgpt_6967809b]

**Feature classification for large backlogs:** At 1,200+ items, classification using type (System/Feature/Content/Platform/LiveService) x layer (Foundation/Core/Feature/Presentation/Polish) enables prioritisation and gate assignment. Expect ~15% of items to have low-confidence classifications needing human review. TDD items map 1:1 to feature-level Game items but at System type. [source: ch_game_classification_2026-04]

**Production data consolidation:** Studios using multiple planning tools (xlsx, Miro, etc.) need consolidation methodology. Source data naming is sacrosanct -- merge new data into existing names, never rewrite. Miro boards require multiple extraction passes. Zero data loss requirement. [source: ch_production_consolidation_spec]

---

## By Working Model

### Fully Remote

NBI operates fully remote. Couch Heroes (~55 employees UK+Greece) is 100% remote. Key adaptations:

- **Async approval cycles.** Principal reviews finished products, not intermediate drafts. [source: handoff_2026-04-04_finances_and_features]
- **Screenshot/video-based UAT.** Verify visually (Playwright e2e), not just HTTP status codes. [source: handoff_2026-04-06c_glen_uat]
- **Self-hosted infrastructure at zero cost.** Cloudflare Tunnel + PM2 on personal PC. [source: handoff_2026-04-09a_move_to_nine]
- **Multi-user sync.** Incremental polling every 10 seconds with optimistic concurrency and IndexedDB WAL. [source: handoff_2026-04-06c_glen_uat]

### Hybrid / Co-located

No direct outcome data from hybrid or co-located studios. Agilefall guide specifies hybrid London/Cambridge for leadership with remote UK for others. [source: chatgpt_68fb7b4a] [See Open Questions]

---

## Sprint/Cycle Length Evidence

### Agilefall: Hybrid Stage-Gate + Sprints (NBI Standard for Client Studios)

Milestone gates on top (Discovery, Pre-production, Production, Alpha, Beta, Gold) with iterative sprints underneath. Pre-production exits with playable vertical slice. Two planning horizons: quarterly PI planning (8-12 weeks) plus sprint planning (1-2 weeks). [source: chatgpt_68fb7b4a]

**Weekly rhythm:** daily standup 15min, backlog refinement 60-90min, sprint planning 2-4h, sprint review 60-120min, retrospective 60min. Backlog hierarchy: Epics > Features > User Stories > Tasks. Definition of Ready: clear problem, acceptance criteria, dependencies mapped, assets identified, team agreement. Definition of Done: criteria met, code reviewed, assets integrated, tests pass, docs updated, build green. [source: chatgpt_68fb7b4a]

### Audit-Driven Sprints (Variable Length)

Numeric audit scores the system across multiple dimensions (19 in initial audit), themed sprints work through gaps. Cycle length determined by work, not calendar. Sprint grouping by concern area: Foundation > Security > Performance > Frontend > UX > Ops. [source: handoff_2026-04-08b_comprehensive_improvement]

### Autonomous Execution Sessions

Large backlogs cleared in single sessions when plan is pre-approved. One session: 33 bugs + 7 features. Enabling conditions: approved plan, autonomous authority, established test infrastructure. [source: handoff_2026-04-14a_full_backlog_clearance]

### No Fixed-Length Sprints (Internal)

NBI does not use 1-week or 2-week sprints internally. Work structured by milestone deliverables, never by duration. However, Agilefall recommends 1-2 week sprints for client studios. [source: handoff_2026-04-17a_news_aggregator_m1_start, chatgpt_68fb7b4a]

---

## Pre-Production to Production Transitions

### The Approval Gate Pattern

Glen reviews comprehensive audits and makes binary decisions: "build now" or "discuss approach first." [source: handoff_2026-04-04_finances_and_features]

### Agilefall Gate Criteria

Pre-production exits with playable vertical slice. Each gate has explicit entry/exit criteria and funding/risk review. The offsite methodology includes a dedicated gate-passing criteria session -- "the single most leveraged hour of the offsite" -- covering 8 production gates (Concept through Launch). [source: chatgpt_68fb7b4a, ch_offsite_agenda_2026-04-27]

### Data Migration as a Gate

Double-escape migration required fixpoint loop processing and correct ordering. Principle: escape at render, never at storage. [source: handoff_2026-04-15a_double_escape_migration]

### Security as a Gate

Security reviews after every major feature build. Patterns: safeUrl() for user-controlled href, timingSafeEqual for internal auth, failover latches with auto-reset. [source: handoff_2026-04-05a_leads_expenses_qa, handoff_2026-04-18_worksage_audit_sprint]

---

## Live Ops Cadence

### Automated Communication Cadence

Three automated email cadences: PM daily report (08:00 weekdays), due/late ticket warnings (09:00 weekdays), inbound email-to-task matching (polls every 10 minutes). Microsoft Graph API. [source: handoff_2026-04-16b_full_day]

### Monitoring and Recovery

Circuit breaker (3 failures, 60-second reset). 10-second incremental sync with cooldown. Prometheus metrics on /metrics. [source: handoff_2026-04-09a_move_to_nine, handoff_2026-04-06c_glen_uat]

### No Genre-Specific Live Ops Data

Live ops data limited to internal tooling. No game-specific update scheduling or seasonal content cadence yet. [See Open Questions]

---

## Design and Iteration Methodology

### Visual Design Requires Multiple Iterations

5-7 mockup iterations for Glen. Command Centre went through 7 versions before approval. Design for large monitors first. [source: handoff_2026-05-11_command_centre]

### Build Antipatterns (Post-Mortem Evidence)

Six antipatterns: (1) No visual verification, (2) Context rot, (3) Shotgun debugging, (4) Workaround normalisers, (5) Visual quality abandonment, (6) Commit noise. [source: handoff_2026-05-12_command_centre_build]

### The LLM Wiki and AutoResearch Patterns

Compile-client: compile document folder into structured knowledge base. AutoResearch: score > improve > score > converge. Both applicable to consulting deliverables. [source: handoff_2026-05-13_karpathy_capabilities]

---

## Leadership Offsite Methodology

### 3-Day Studio Offsite Framework

Glen designed a reusable 3-day offsite for studio leadership (8-9 senior attendees). [source: ch_offsite_agenda_2026-04-27, ch_offsite_working_doc_2026-04-27, ch_offsite_pre_read_2026-04-27]

**Day 1 (Foundation):** Rules commitment (6 rules, verbal from each attendee individually), goal statement, workbook walkthrough (2,216 items), feature sweep at 2 minutes per row with "L by default" sizing.

**Day 2 (Gates/GTM):** Gate-passing criteria for 8 production gates, live services planning, GTM lane, community strategy, studio-down goals cascade.

**Day 3 (Pipelines/Staff):** 9 pipeline RACI maps, maintenance cadence, staff assessment (C-level only for candour), decisions log walkthrough, Confluence rollout.

**Standing items:** Parking lot wall, decisions log wall, risks log wall, daily energy check (1-10 score). North star printed on wall.

**Pre-decisions format:** Binding strategic decisions laid down before the offsite to prevent relitigating. Each includes position, alternatives considered, reasoning, and downstream constraints. Burden of proof shifts onto anyone disagreeing. [source: ch_offsite_pre_decisions_2026-04-27]

**Facilitation playbook (private):** Per-session structure with opening line (verbatim), outcome target, person-specific watch-fors, scripted standard responses for common deflections, and move-on criteria. [source: ch_offsite_working_doc_2026-04-27]

**Pre-read design:** Exactly 15 minutes to read. Names the failure mode ("silent disagreement that surfaces later"). No homework framing removes the escape hatch. [source: ch_offsite_pre_read_2026-04-27]

**Fallback:** If behind by end of Day 2, Day 3 pipelines collapse to "frame + assign owners." [source: ch_offsite_agenda_2026-04-27]

---

## Consulting Delivery Methodology

### SoW Report Structure (15-Section Standard)

NBI's standard C-level report: (1) Executive Summary with top 8 risks, (2) Background/Intent, (3) Scope with in/out anchored to clauses, (4) Deliverables/Acceptance with measurable tests, (5) Delivery Plan with entry/exit criteria, (6) Technical Architecture, (7) Cross-Play Readiness, (8) Design/Product Readiness, (9) KPI Tree, (10) Risk Register top 20, (11) Staffing/RACI, (12) Commercials/Change Control, (13) Governance/Communication, (14) Assumptions/Dependencies, (15) Appendices with Evidence Table. [source: chatgpt_6907ec33]

### Production Risk Assessment

Diagnose before prescribing: problems only, no mitigations initially. Diagnostic-first approach builds trust and leads to multi-workstream engagements. [source: chatgpt_69034e5d]

### Milestone Staging Validation

Tasks tagged to milestones, counted per epic to identify front-loading, back-loading, or unrealistic clustering. Client priority drives sequencing. [source: chatgpt_69395da6]

### CTO Hiring for Game Studios

When a studio has non-games C-level and junior engineering: CTO must be hybrid Live-Service + Platform, not general web or pure engine. Must-haves: shipped online sessioned game, live economy experience, service contracts with schema versioning, junior team uplift. [source: chatgpt_69437062]

### Salary Data Quality Assurance

Two-track audit: file structure and salary accuracy. Common failures: monthly/annual mixups, currency mismatches, hub/non-hub reversed, grade progression broken. Every benchmark requires real citation. [source: chatgpt_69698081]

### GTM Backlog Structuring

Comprehensive GTM and BD backlog template: 4 player segment ICPs, 2-wave audience research, 14-title competitor map, positioning matrix, anti-positioning statement, 3 message pillars, influencer tiering (40 creators across 3 tiers), wishlist targets at 6/3/1 month, publisher longlist (40 publishers scored to shortlist of 10), term sheet red lines. [source: ch_studio_business_items_2026-04]

---

## Knowledge Architecture as Production Infrastructure

### Role Dispatch System

Deterministic role dispatch: skill-triggered and topic-detected routing. Transferable to studios using structured knowledge architecture. [source: handoff_2026-05-15_aios_audit_phase1]

### Technology Selection Discipline

Evaluate tools by reading source code, not star counts. React rejected for WorkSage. Agent SDK rejected for batch workloads (~13K tokens overhead per call). [source: handoff_2026-04-17c_news_m2_m3_complete, handoff_2026-04-18_desktop_migration_complete]

---

## Open Questions

- **Studio-specific sprint data.** Need data from client studios on actual sprint/cycle patterns and outcomes beyond NBI's own development.
- **Hybrid and co-located adaptations.** No data on what changes when teams are not fully remote.
- **Genre-specific live ops cadence.** No data on update scheduling or seasonal content by genre.
- **Scale transition pain points.** No data on what breaks growing from 25 to 50 or 50 to 100.
- **Multi-stakeholder production gates.** NBI's implicit gate (Glen's approval) does not generalise.
- **Estimation and velocity tension.** Glen rejects timeline estimates; client studios need predictability.
- **Agilefall outcomes data.** Framework is NBI standard but no client implementation outcomes yet.
- **Offsite outcomes data.** 3-day methodology documented but post-offsite delivery outcomes not tracked.
- **Feature classification at scale.** Works at 1,200 items; behaviour at 5,000+ unknown.

---

## Source Index

| Extract ID | Date | Key Topics |
|---|---|---|
| handoff_2026-04-04_finances_and_features | 2026-04-04 | Feature approval in bulk |
| handoff_2026-04-05a_leads_expenses_qa | 2026-04-05 | Data-driven configuration, security |
| handoff_2026-04-06a_ux_overhaul | 2026-04-06 | 22 UX decisions |
| handoff_2026-04-06c_glen_uat | 2026-04-06 | Scroll preservation, live UAT, sync |
| handoff_2026-04-07b_expenses_finance_qa | 2026-04-07 | Consulting P&L structure |
| handoff_2026-04-08b_comprehensive_improvement | 2026-04-08 | 19-dimension audit, themed sprints |
| handoff_2026-04-09a_move_to_nine | 2026-04-09 | Production hosting, migrations |
| handoff_2026-04-11b_hierarchy_dependencies_timeline | 2026-04-11 | 4-level hierarchy, prerequisites |
| handoff_2026-04-14a_full_backlog_clearance | 2026-04-14 | Autonomous session, SoW extraction |
| handoff_2026-04-15a_double_escape_migration | 2026-04-15 | XSS model, fixpoint migration |
| handoff_2026-04-15b_test_infra_and_kanban_next | 2026-04-15 | Vitest + Playwright, CJS/ESM |
| handoff_2026-04-16b_full_day | 2026-04-16 | Email integration, multi-tenancy |
| handoff_2026-04-17a_news_aggregator_m1_start | 2026-04-17 | No scope-watering, no timelines |
| handoff_2026-04-17c_news_m2_m3_complete | 2026-04-17 | Agent SDK overhead |
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
| chatgpt_69437062 | 2025-12-18 | CTO profile |
| chatgpt_6967809b | 2026-01-14 | Org design alternatives |
| chatgpt_69698081 | 2026-01-16 | Salary audit methodology |
| ch_offsite_agenda_2026-04-27 | 2026-04-27 | 3-day offsite methodology |
| ch_offsite_working_doc_2026-04-27 | 2026-04-27 | Facilitation playbook |
| ch_offsite_pre_read_2026-04-27 | 2026-04-27 | Pre-read communication template |
| ch_offsite_pre_decisions_2026-04-27 | 2026-04-27 | Pre-decision format |
| ch_game_classification_2026-04 | 2026-04 | 1,203-item feature classification |
| ch_studio_business_items_2026-04 | 2026-04 | GTM/BD backlog template |
| ch_production_consolidation_spec | 2026-05 | Multi-source data consolidation |
