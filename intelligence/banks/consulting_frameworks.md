---
title: Consulting Frameworks
slug: consulting_frameworks
last_compiled: 2026-06-23
extract_count: 18
role_associations: [producer, gaming_practice_lead, production_consultant, cmo]
description: NBI's consulting methodology IP. Reusable frameworks, assessment tools, delivery patterns, estimation methods, and rate benchmarks that form the foundation of NBI's advisory practice. Sourced from client engagements, internal methodology docs, and session records.
---

# Consulting Frameworks

## Executive Summary

This bank documents NBI's proprietary and practiced consulting methodologies -- the frameworks, tools, and patterns that Glen Pryer and the NBI team deploy in client engagements. It covers process optimisation (EAD), studio assessment tools (Quad Assessment, Org Design Diagnostic), delivery patterns (Three-Artifact, Red Team Validation), estimation methods, facilitation playbooks, and rate benchmarks. The bank is strongest on production consulting and studio transformation; weaker on pure data/analytics advisory methodology. All client identifiers anonymised.

---

## Core Frameworks

### EAD Framework (Eliminate, Automate, Delegate)

NBI's process optimisation methodology applied to every client engagement. Three gates in strict order: (1) Eliminate -- challenge whether a process should exist at all. Kill criteria: if stopping for two weeks goes unnoticed, eliminate it. (2) Automate -- if it survives, ask whether it requires human judgement or just human hands. Good targets: data transformation, status aggregation, threshold monitoring, template generation. Poor targets: relationship-dependent decisions, ambiguous judgement, creative strategy. (3) Delegate -- match to the appropriate capability tier: AI agent (routine), AI agent (supervised), junior human, senior human, or owner (Glen). Client application: audit all recurring processes, run each through EAD, deliver a process map showing eliminated (with justification), automated (with implementation approach), delegated (with tier and ownership). Priority: highest-frequency, lowest-judgement processes first for visible ROI. Anti-patterns: automating before eliminating, delegating without defining, eliminating by neglect. [source: brain_ead_framework, nbi_ai_operations_2026-05-12]

### 12 Gates of Game Development

Production gate framework used in NBI offsite facilitation. Eight gates from Concept through Launch, with gate-passing criteria defined collaboratively in a facilitated leadership session. Glen frames the gate criteria session as "the single most leveraged hour of the offsite." Each gate has named success criteria, owner triplets, and measurable deliverables. Gates are not arbitrary milestones -- they represent genuine production readiness thresholds. Used in conjunction with feature sweep (2 minutes per row, "L by default" sizing) and blind affinity estimation. [source: ch_offsite_agenda_2026-04-27]

### Red Team Validation Methodology

All NBI deliverables (SoWs, reports, strategy documents) are red-teamed before client delivery. Five scoring dimensions with weights: data collection 25%, normalisation quality 20%, claim accuracy 30% (highest weight -- wrong claims destroy credibility), citation verifiability 15%, analytical rigour 10%. Three severity tiers: Critical (must fix), High (should fix), Medium/Low (non-blocking). Process includes automated verification scripts plus manual review. Demonstrated on a competitive research deliverable: original score 53/100 (FAIL), remediated to 86/100, enhanced to 93/100 (PASS). Cross-reference against client's own position is mandatory. Multi-role red teaming: senior engineer, general counsel, CEO perspectives applied adversarially. [source: goals_red_team_report_2026-04-21, chatgpt_6907ec33]

### Pillar-Promise-Value Creation Hierarchy

Three-layer game design framework NBI builds with client studios: (1) Pillars -- the core design principles of the game, compiled from all conflicting versions, CEO-approved, then locked. (2) Player Promises -- what the player feels as a result of each pillar. (3) Value Creation -- how each promise translates to measurable outcomes (retention, revenue, engagement). Any individual contributor should trace their work: my task to pillar to player promise to value. Built on Miro with a worked example showing one complete chain before team rollout. [source: 2026-06-19_pillar-promise-value-creation-framework]

### S-Curve Change Management

Structural change introduced to a studio in batches (S-curves) rather than continuous drip-feeding. Model: introduce a defined cluster of changes, allow stabilisation, repeat. By the third curve the studio builds change tolerance and absorbs new structure faster. Key risk: a new senior hire making independent structural changes during a stabilisation period resets the timeline. The studio owner must manage this actively. [source: not_ireYPwXIKrrsWd_scurve]

---

## Assessment Tools

### Quad Assessment for Production Readiness

One-time structured team evaluation for high-stakes production phases. Core question: "Can this person deliver high-quality content in their craft, at speed, right now?" Product-capability-focused, not culture or conduct. Result tiers: (1) Hard cuts (red triangle) -- first priority, managed exit; (2) Stars/saves -- director personally owns growth or replacement; (3) Juniors (flagged J) -- separate track; (4) Unmarked -- exits but lower urgency. Lead cap ("you get three picks") forces honest assessment. Ratification by full director group. Delivery: facilitated session, assessments pre-submitted then discussed. [source: 2026-06-19_quad-assessment-staff-segmentation]

### Staff Quadrant Review

Separate from the Quad Assessment, this maps team members on two axes (typically capability vs. output quality). Used to identify underperformers for staged replacement and to surface mismatches between title seniority and actual output quality. Run at C-level only to enable candour. [source: not_ireYPwXIKrrsWd_quadrant, ch_offsite_agenda_2026-04-27]

### Org Design Diagnostic

Assessment for studio organisational structure. Identifies anti-patterns: the single producer failure (one producer managing everything, critical risk above ~40 people), chain-of-command bypass as root cause of rework, documentation gaps hidden by enthusiasm, seniority title inflation. Output: viable organisational models mapped to studio size and stage. [source: chatgpt_6967809b]

### Data Room Audit

Seven-lens evaluation methodology for investor data room completeness. Sixteen-section checklist covering financials, cap table, team, IP, technology, market, and operations. Used when preparing a client for fundraising rounds. Applied as part of NBI's game investment advisory (/gi) service. [source: chatgpt_6866b4be]

---

## Delivery Patterns

### Three-Artifact Client Delivery Pattern

Every NBI client engagement produces three core artifacts from day one: (1) Decisions log -- date, decision, owner, rationale, what was ruled out. Read at start of every session. Non-negotiable. (2) Risks register -- top 20 ranked by impact x likelihood. (3) Evidence table -- every non-obvious factual claim mapped to source, date, confidence, and gap. These three artifacts prevent the most common engagement failure: decisions made in meetings not written down, causing conflict when recollections diverge six weeks later. [source: granola_080a19f8, chatgpt_6907ec33]

### Scope-of-Work Structure

NBI SoWs follow a 15-section structure: Executive Summary (top 8 risks), Scope and Deliverables, Acceptance Criteria (measurable, not subjective -- most-resisted section by clients), Risk Register (top 20), and Evidence Table appendix. Acceptance criteria are non-negotiable; disputes about scope are always about what "done" means. Pre-agreed measurable criteria eliminate 80% of scope disputes. Workstream pricing: separate workstreams for partial client buy-in (demonstrated when a client took pricing benchmarking only from a two-workstream proposal). [source: chatgpt_6907ec33, goals_sow_proposal_2026-03-31]

### Studio Brain Sprint (Productised Offering)

Client-facing AI operations service derived from NBI's internal architecture. Deliverables: persistent institutional knowledge system (Studio Brain), role-specific knowledge bases, session continuity systems. Positioning: "a 7-person firm delivering at the depth and consistency of a team three to four times the size." System writes to disk in real time; continuity is mechanical, not dependent on memory. Client delivery includes: model tier routing, approval gates, agent team configuration. [source: nbi_ai_operations_2026-05-12]

---

## Facilitation Methods

### Offsite Facilitation Playbook

Glen's facilitation methodology for studio leadership offsites (8-9 senior attendees, 3 days). Structure per session: opening line (verbatim script), outcome target, watch-fors (person-specific failure modes), standard responses (phrase bank for common deflections), and move-on criteria. Key techniques: force verbal commitment from each attendee on rules individually; named watch-fors per person (e.g. identifying who defaults to silence, who converges too fast, who defers); scripted rebuttals for common derails. The playbook is for facilitator's eyes only. Person-specific preparation prevents energy-sapping real-time improvisation. [source: ch_offsite_working_doc_2026-04-27]

### Blind Affinity Estimation

Feature estimation method used in NBI offsites: all estimators assign independently before comparing. Cross-validation by a second expert per estimate. Structured discussion only when estimates diverge by more than 5 days. Min/mid/max ranges to surface uncertainty -- wide gaps are documentation problems, not estimation errors. Produces better results than peer-influenced estimation in teams with established authority hierarchy. [source: granola_8b912e8e, not_zBxoQexM2abxz9]

### Min+20% and Min/Max Credibility

Two estimation correction methods: (1) Min+20% -- take the minimum credible estimate and add 20% as a corrective. Prevents systematic optimism. (2) Min/Max Credibility -- establish the minimum and maximum credible boundaries; the range communicates confidence level. A 3x spread signals a documentation/specification problem, not an estimation problem. [source: not_zBxoQexM2abxz9, not_Vn1AdPFNDQgWTj]

---

## Pricing and Rate Benchmarks

### NBI Rate Sheet

NBI's own pricing by service tier (USD):
- Strategic advisory (Glen-level): $300-$400/hr
- Production consulting: $250-$350/hr
- AI operations setup: $300-$350/hr
- Embedded studio partner retainer: $10,000-$25,000/month

Pricing philosophy: value-based, not hourly. Hours are not the unit of value; studio outcomes are. Separate workstreams allow partial client buy-in. 30% upfront, remainder on deliverable acceptance. [source: goals_sow_proposal_2026-03-31, web_2026-05-29_gaming-consultant-fee-benchmarks-2026]

### Scope Fear Containment

When a studio first sees its full scope, a predictable fear response triggers scope-cut proposals. NBI containment framework: (1) all cut proposals go into a designated document -- no immediate decisions; (2) scope ownership clarified to a named core group only; (3) fear acknowledged openly; (4) studio head meets most affected department directly. No ad hoc cuts during estimation sessions. [source: not_4nWBkRC4r7TVRQ_vs_fear]

---

## Open Questions

1. **EAD maturity model:** Is there a scoring system for where a client studio sits on the EAD journey (all manual vs. partially automated vs. fully delegated)?

2. **Red team automation:** Can the red team scoring be fully automated for data-heavy deliverables, or does it always need a manual review pass?

3. **Offsite ROI measurement:** What is the measurable impact of an NBI offsite vs. the studio's pre-offsite state? Is there a 30/60/90 day follow-up metric?

4. **Studio Brain adoption rate:** Of clients who receive a Studio Brain Sprint, what proportion continue using it independently after NBI disengages?

---

## Source Index

| Source ID | Type | Description |
|---|---|---|
| brain_ead_framework | Brain Module | EAD Framework methodology (verified 2026-06-23) |
| nbi_ai_operations_2026-05-12 | OneDrive | NBI AI Operations Architecture and Service Offering |
| goals_red_team_report_2026-04-21 | OneDrive | Red Team Validation Report (anonymised) |
| goals_sow_proposal_2026-03-31 | OneDrive | Proposal structure and pricing (anonymised) |
| goals_competitive_mtx_findings_2026-04-21 | OneDrive | F2P pricing benchmark research (anonymised) |
| ch_offsite_agenda_2026-04-27 | OneDrive | 3-day offsite methodology (anonymised) |
| ch_offsite_working_doc_2026-04-27 | OneDrive | Facilitation playbook (anonymised) |
| chatgpt_6907ec33 | ChatGPT | SoW structure and red team process |
| chatgpt_6967809b | ChatGPT | Org design assessment anti-patterns |
| granola_080a19f8 | Granola | Written decision records pattern |
| granola_8b912e8e | Granola | Blind affinity estimation |
| not_zBxoQexM2abxz9 | Granola | Min+20% estimation method |
| not_Vn1AdPFNDQgWTj | Granola | Min/max credibility estimation |
| not_4nWBkRC4r7TVRQ_vs_fear | Granola | Scope fear containment |
| not_ireYPwXIKrrsWd_scurve | Granola | S-curve change management |
| not_ireYPwXIKrrsWd_quadrant | Granola | Staff quadrant review |
| 2026-06-19_quad-assessment-staff-segmentation | Granola | Quad assessment methodology |
| 2026-06-19_pillar-promise-value-creation-framework | Granola | Design hierarchy framework |
