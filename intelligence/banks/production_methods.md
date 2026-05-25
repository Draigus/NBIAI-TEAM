# Production Methods -- Knowledge Bank

**Last compiled:** 2026-05-25 (full rebuild)
**Sources:** 45+ extracts (26 Claude sessions, 8 ChatGPT, 8 OneDrive, 2 Granola, 1 Slack)
**Role associations:** producer, production_consultant

## Executive Summary

This bank covers how game studios organise and deliver work, combining NBI's direct experience building WorkSage with advisory work at Couch Heroes and other clients. The strongest evidence comes from the CH offsite (production framework, gate system, estimation methodology), NBI's own dashboard development (audit-driven improvement, test infrastructure, deployment patterns), and the AAA Agilefall operating guide. New additions include the production council decision process, blind estimation methodology, offsite facilitation framework, and art escalation patterns.

## Framework Comparison

| Framework | Team Size | Remote-Friendly | Game Adaptations | Evidence |
|---|---|---|---|---|
| Agilefall (Agile + stage-gate) | 30-100 | Y | Gates on top, sprints underneath; playable vertical slice exits pre-prod | NBI standard for client studios [source: chatgpt_68fb7b4a] |
| 6-Stage Pipeline | 40-70 | Y | Ideation > R&D > GDD > Prototype > MVP > Player Ready with tier gates | CH offsite, adopted by 55-person studio [source: granola_5fdd8c18] |
| Shape Up (6-week cycles) | 10-30 | Y | Untested at game studio scale in NBI's experience | No direct evidence |
| Classic Functional + EP Hub | <60 | Y | Best for early-stage teams needing speed | Recommended for CH [source: chatgpt_6967809b] |
| Pod/Strike Team | 40-100 | Partial | Best for parallel workstreams with clear boundaries | Alternative 2 for CH [source: chatgpt_6967809b] |

## By Team Scale

### 25-50 People

Single-producer bottleneck is the dominant risk. At ~50 people with one producer, decision latency and missed handoffs become systemic [source: chatgpt_69034e5d]. Product-platform scope coupling where game and platform compete for same capacity without hard slice boundaries compounds this [source: chatgpt_69034e5d]. The remediation is an EP overseeing four discipline tracks (QA, Audio, Art, Design) each with embedded producer [source: ch_org_structure_2026-04-26].

### 50-100 People

The CH model: 14 agreed epics, domain-based work hierarchy (Epic > Feature > Story > Task), blind estimation sessions, and a canonical decision process (CD > design > team feedback > GD+EP+GC approval) [source: granola_5fdd8c18, slack_production-council_2026-05-25_process]. Key lesson: content and feature epics must be merged -- separate tracking creates misleading completion percentages [source: granola_5fdd8c18].

## By Working Model

### Fully Remote

Decision process must be formalised and written. CH's canonical process: "CD say we want X > design designs > team feeds back > feedback considered by game director > proposals approved with GD+EP+GC > decision made" [source: slack_production-council_2026-05-25_process]. Estimation sessions require structured blind approach -- teams estimate independently before seeing leadership figures [source: granola_e5678c68].

Chain-of-command bypass is a critical remote-team failure mode: art leads going directly to CEO rather than through production chain undermines authority and creates conflicting directives [source: slack_production-council_2026-05-25_escalation].

## Sprint/Cycle Length Evidence

NBI's WorkSage development demonstrates rapid iteration: 22 UX decisions in one session [source: handoff_2026-04-06a], 33 bug tracker items + 7 features in one autonomous session [source: handoff_2026-04-14a]. This velocity is enabled by pre-approved bulk plans rather than incremental proposals [source: handoff_2026-04-04].

Two-horizon planning is the standard: quarterly PI planning (8-12 weeks) plus sprint planning (1-2 weeks). Weekly rhythm: daily standup 15min, backlog refinement 60-90min, sprint planning 2-4h, sprint review 60-120min, retrospective 60min [source: chatgpt_68fb7b4a].

## Gate System and Feature Tiering

Feature completion tiering (from CH offsite):
- **T0-T2** (ideation to prototype): cheap to cut ("orange zone")
- **T3** (MVP): functional but rough
- **Post-T3**: cuts become expensive
- **T4-T7**: release-ready through production-scale

Gates use this tier system. Key finding: "the single most leveraged hour of the offsite" is gate-passing criteria definition [source: ch_offsite_agenda_2026-04-27].

Production phases: Pre-production > Early Production > Mid Production > Late Production > Alpha [source: granola_5fdd8c18].

## Offsite Facilitation Methodology

Glen designed a reusable 3-day offsite framework for studio leadership (8-9 senior attendees):

**Day 1 (Foundation):** Rules commitment (6 rules, verbal commitment from each individual), goal statement, workbook walkthrough, feature sweep at 2-minute-per-row discipline with "L by default" sizing [source: ch_offsite_agenda_2026-04-27].

**Day 2 (Gates/GTM):** Gate-passing criteria, live services planning, GTM lane, community strategy, goals cascade [source: ch_offsite_agenda_2026-04-27].

**Day 3 (Pipelines/Staff):** 9 pipeline RACI maps, maintenance cadence, staff assessment (C-level only for candour), decisions log walkthrough [source: ch_offsite_agenda_2026-04-27].

**Facilitation patterns:** Person-specific watch-fors (who defaults to silence, who converges too fast), scripted standard responses for common derails, move-on criteria per session, pre-read pack limited to 15 minutes reading [source: ch_offsite_working_doc_2026-04-27, ch_offsite_pre_read_2026-04-27].

**Pre-decisions pattern:** Binding strategic decisions laid down before the offsite to prevent relitigating. Burden of proof shifts onto anyone disagreeing [source: ch_offsite_pre_decisions_2026-04-27].

## Estimation Methodology

**Blind estimation:** Teams estimate independently before seeing leadership figures. Art leads only participating (not full art team) [source: granola_e5678c68].

**Environment art sizing:** Framework needed based on density + size categories (small/medium/large). Downtown classified as medium [source: granola_e5678c68].

**Benchmark estimates (CH MMORPG):**
- Player progression: 60 days designer / 20 days engineer / 20 days UI to MVP
- Skill system: 90 days designer / 30 days engineer / 25 days UI
[source: granola_5fdd8c18]

## Production Data Consolidation

NBI's proven methodology for consolidating multi-source production data: extract from each source preserving original naming (HARD RULE: never rename stories/features from source materials), map estimates across sources, detect duplicates, reconcile conflicts, produce unified plan with zero data loss [source: ch_production_consolidation_spec].

Miro boards require multiple extraction strategies; no single pass captures everything [source: ch_production_consolidation_spec].

## Audit-Driven Improvement

Numeric audit scoring drives focused improvement: a 19-dimension code audit rated WorkSage 6.6/10, Glen approved a 6-sprint improvement plan, re-audit scored 7.3/10 (+0.7). Sprints grouped by concern: foundation, security, performance, frontend, UX, ops [source: handoff_2026-04-08b].

The pattern is reusable: structured audit > numeric score > sprint plan > re-score. Glen approves plans, not individual fixes [source: handoff_2026-04-08b].

## Quality Methodology

**Red team validation:** Five scoring dimensions (data collection 25%, normalisation 20%, claim accuracy 30%, citation verifiability 15%, analytical rigour 10%). Original score 53/100 remediated to 93/100 over three passes [source: goals_red_team_report_2026-04-21].

**SoW report structure:** 15-section C-level-consumable format with Evidence Table appendix mapping every claim to source, date, confidence, and gap. Multi-role red teaming (Production + Engineering) embedded in the process [source: chatgpt_6907ec33].

**Build antipatterns (from post-mortem):** (1) No visual verification, (2) Context rot causing wrong column names, (3) Shotgun debugging, (4) Workaround normalisers instead of root cause, (5) Visual quality abandoned vs mockups, (6) Too many small commits [source: handoff_2026-05-12].

## Production Architecture (WorkSage)

**Stack:** Express.js + PostgreSQL on Glen's PC, PM2 for process management, Cloudflare Tunnel for public access at zero cost. 396+ tests (Vitest + Playwright) [source: handoff_2026-04-09a].

**Key patterns:** Migration framework (numbered SQL files + version table), circuit breaker (3 failures, 60s reset) on external APIs, IndexedDB write-ahead log for crash recovery, escape at render never at storage [source: handoff_2026-04-09a, handoff_2026-04-15a].

**Test infrastructure:** .mjs files for ESM/CJS interop, separate test database with baseline schema, polling SPAs break networkidle -- use explicit waits [source: handoff_2026-04-15b].

## AI-Assisted Production

**Agent SDK vs Raw SDK:** Agent SDK adds ~13K tokens overhead per call -- unusable for batch workloads. Raw @anthropic-ai/sdk with streaming is correct for programmatic Claude usage. Actual cost of 30-day news curation: $0.79 [source: handoff_2026-04-17c].

**AIOS dispatch architecture:** Role dispatch via skill-triggered and topic-detected routing tables. 12 composite AGENT.md files. CLAUDE.md kept under 225 lines [source: handoff_2026-05-15].

**Salary audit methodology:** Two-track approach (file structure + salary accuracy). Common failures: monthly/annual confusion, currency mismatches, hub vs non-hub pay reversal [source: chatgpt_69698081].

## Open Questions

- How does the 6-stage pipeline perform at 80-100 person scale with multiple simultaneous epics?
- What is the optimal producer-to-team ratio for remote MMORPG development?
- How should estimation methodology adapt when outsourced art partners (Room8 Studios) are integrated?

## Source Index

| ID | Source Type | Date |
|---|---|---|
| chatgpt_68fb7b4a | ChatGPT | 2025-10-24 |
| chatgpt_69034e5d | ChatGPT | 2025-10-30 |
| chatgpt_6907ec33 | ChatGPT | 2025-11-02 |
| chatgpt_69437062 | ChatGPT | 2025-12-18 |
| chatgpt_6967809b | ChatGPT | 2026-01-14 |
| chatgpt_69698081 | ChatGPT | 2026-01-16 |
| granola_5fdd8c18 | Granola | 2026-04-28 |
| granola_e5678c68 | Granola | 2026-05-05 |
| ch_offsite_agenda_2026-04-27 | OneDrive | 2026-04-27 |
| ch_offsite_working_doc_2026-04-27 | OneDrive | 2026-04-27 |
| ch_offsite_pre_decisions_2026-04-27 | OneDrive | 2026-04-27 |
| ch_offsite_pre_read_2026-04-27 | OneDrive | 2026-04-27 |
| ch_production_consolidation_spec | OneDrive | 2026-05 |
| slack_production-council_2026-05-25_process | Slack | 2026-05-25 |
| slack_production-council_2026-05-25_escalation | Slack | 2026-05-25 |
| goals_red_team_report_2026-04-21 | OneDrive | 2026-04-21 |
| 26 Claude session extracts | Claude | 2026-04 to 2026-05 |
