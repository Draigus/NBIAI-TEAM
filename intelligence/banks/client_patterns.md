---
title: Client Patterns
slug: client_patterns
last_compiled: 2026-06-19
extract_count: 46
role_associations: [producer, head_of_people, general_counsel, production_consultant]
description: Patterns NBI observes repeatedly across client engagements. What breaks, what gets hidden, what actually works. Primary evidence from a ~70-person remote MMO studio engagement (April-June 2026). All client identifiers anonymised.
---

# Client Patterns

## Executive Summary

This bank documents repeating patterns across NBI client engagements, with primary evidence from a deep 2026 engagement with a ~70-person remote MMO studio in transition from prototype to production. Secondary patterns from prior NBI advisory work and published studio case studies. The bank is strongest on the 40-100 person studio navigating founder-led culture, production structure uplift, team composition issues, and employment/HR complexity. It is weaker on mobile-first studios and client-side publisher relationships.

Eight new entries added June 2026: garden leave eligibility gap (three-tier contract fix), staged replacement methodology (pattern from consulting delivery angle), employee survey timing principle, studio seniority distribution advisory, managing founder midnight ideas, producer as cross-department defect translator (consulting tool), quad assessment for production readiness (client-facing methodology), and AI-native hiring advisory for analytics clients.

---

## Common Client Challenges

### Production Maturity is Almost Always Lower Than Presented

Studios in the 40-100 person range systematically present themselves as further along in production than they are. Observed signals: working prototype code without GDDs or TDDs; impressive art against undocumented core systems; feature scope 2-3x larger than assumed when first formally estimated; design approval bypassed routinely. The gap is not incompetence -- it is the natural result of informal working at smaller scale, without the formal structures that production at this size requires. [source: granola_5fdd8c18, granola_4005eb22, granola_ae650223]

### Scope Scope Scope

The most common single failure mode: scope is not controlled at the point of acceptance. Features are added informally. Design approval is bypassed. Founders inject new ideas mid-sprint. The studio has no formal process for saying no. The result: at the point when a formal estimate is first produced, the implied scope is 2-5x what the team believed. Every engagement involving production structure work has hit this pattern. [source: granola_4e145b7b, not_3bUR2wWsPQvo8n_scope, 2026-06-19_founder-idea-log-scope-governance]

### The Single Producer Failure

Studios in the 40-70 person range routinely have a single producer managing game content, platform work, backend, build pipelines, playtests, partners, and vendors. This fails non-linearly as headcount grows. The configuration works to ~25 people and is critical risk above ~40. Remediation: an Executive Producer overseeing four discipline tracks (QA, Audio, Art, Design), each with an embedded producer. [source: chatgpt_69034e5d]

### Chain-of-Command Bypass as Root Cause

The majority of rework in NBI engagements traces to chain-of-command bypass. A senior person tasks someone directly without going through the established approval chain. The work starts. Later review reveals it contradicts an existing decision. Governance process: Creative Director signals intent > Design designs > Team feeds back > Game Director considers > three-party approval (Game Director + Executive Producer + Creative Director) before any commitment. Without this, every approved decision is at risk of being superseded informally. [source: slack_production-council_2026-05-25_process]

### Documentation Gap Hidden by Enthusiasm

Teams are enthusiastic about their work and talk persuasively about progress. The gap: documentation does not match verbal progress. When first reviewed formally (GDD/TDD completion rate, feature estimation spreadsheets, design doc audit), the structural gaps become visible immediately. Clients often do not know the gap exists because their internal review process was also verbal, not document-based. [source: granola_4005eb22, granola_d977d66a]

### Garden Leave Eligibility Gap

Employment contracts at founder-led studios routinely have a garden leave clause that applies only to company-initiated terminations. When a high-value employee resigns, the studio has no mechanism to enforce garden leave -- the employee can walk to a competitor immediately. The three-tier contract fix: (1) probation exits: no garden leave, one week notice; (2) company-initiated termination: full PILON + garden leave; (3) employee-initiated resignation: garden leave equivalent to notice period, activated at company discretion. Enforcing garden leave on resignation requires explicit contractual language, not just a general clause -- confirm with specialist employment counsel. Seen in two separate client engagements. [source: 2026-06-19_garden-leave-eligibility-contract-gap]

### Staged Replacement: When Underperformers Must Go

Clients resist replacing underperformers because the process feels disruptive. The staged replacement methodology converts this from a culture shock into an incremental process: (1) open the replacement role; (2) recruit and identify the candidate; (3) 2-3 week overlap (handover, knowledge transfer); (4) exit the underperformer. Wave sizing: 3-5-7-8, not all at once. Sequence: brief COO and EP before the CEO is involved -- present a step-by-step plan, not just a problem. Key observation: some underperformers self-select out once new hires arrive, reducing the managed exit count. [source: 2026-06-19_staged-studio-replacement-methodology]

### Studio Seniority Distribution Target

Clients running 40-70 person studios often have a junior-heavy composition that creates quality problems at scale. Advisory standard: ~60% seniors, ~30% mids, ~10% juniors (only with real mentorship infrastructure). Remote juniors without senior mentors develop bad habits or stall -- no osmotic learning in a remote environment. Training curriculum, dedicated senior time, and structured checkpoints are prerequisites for any junior presence. Frame to clients as capability elevation, not cost reduction -- budget framing triggers resistance. [source: 2026-06-19_studio-seniority-distribution-target]

### Employee Survey Timing

Clients want to run satisfaction surveys to understand team sentiment. Advisory: do not launch until the client has capacity to act on results. A survey creates a commitment backlog. Launching before infrastructure exists creates visible expectations that go unmet, damaging trust more than the survey helped. Recommended alternative while infrastructure is being built: all-studio 1:1 rotation at senior leadership level (~55 people over ~4 weeks). Target timing for survey: after Jira, build pipelines, and vertical slice are stable and moving. [source: 2026-06-19_employee-survey-timing-principle]

### Managing Founder "Midnight Ideas"

A recurring pattern in founder-led studios: the founder generates scope change requests ad hoc, bypassing production planning. The mechanism: a shared idea log where anyone receiving an ad-hoc request from the founder adds the item for weekly review in 1:1s or team meetings. Items are not acted on ad hoc. Showing founders all their own ideas in one place is a natural self-regulator -- the volume makes the pattern visible to the originator without requiring a direct confrontation. For in-meeting scope interrupts: the lead handles the interruption in the moment; pattern coaching happens in the founder's direct 1:1, never in front of the team. [source: 2026-06-19_founder-idea-log-scope-governance]

---

## Delivery Patterns

### Producer as Cross-Department Defect Translator

The most effective producers in NBI-supported engagements act as defect translators between departments -- not just tracking work, but auditing request quality before work starts and output quality before sign-off. The pattern: (1) check the ask before work begins: does the request have enough detail, clear acceptance criteria, named approver? (2) check the output before sign-off: does it match the delivery criteria? (3) track defect patterns in retrospectives; (4) feed rework into the producer backlog for systematic fix. Escalation: one defect = human, flagged internally; repeated pattern from same person = escalate to their director; persistent pattern = escalate to COO or fractional head of studio. Exemplar: a glider asset that went wrong because a lead declared approval without the art director or game director's sign-off, with rigging starting prematurely. Root cause: no defined request criteria, no definition of done, no visibility into asset progress. [source: 2026-06-19_producer-cross-dept-defect-translator]

### Quad Assessment for Production Readiness

A one-time structured team evaluation used when a client is entering a high-stakes production phase. Core question: "Can this person deliver high-quality [product type] content in their craft, at speed, right now?" The assessment is product-capability-focused, not culture or conduct-focused. Result tiers: (1) Hard cuts (red triangle) -- first priority, managed exit; (2) Stars/saves -- director personally owns the save: "you own their growth or their replacement"; (3) Juniors (flagged J) -- separate consideration track; (4) Unmarked -- exits but lower urgency. Ratification: the full director group reviews. Lead cap ("you get three picks") forces honest assessments -- without a cap, everyone marks their team as stars. Delivery format: facilitated session, assessments pre-submitted then discussed. [source: 2026-06-19_quad-assessment-staff-segmentation]

### Blind Affinity Estimation (Offsite Delivery Pattern)

Feature estimation in NBI offsites uses blind affinity planning: all estimators assign independently before comparing. Cross-validation by a second expert per estimate. Structured discussion only when estimates diverge by more than 5 days. Min/mid/max ranges to surface uncertainty -- wide gaps are documentation problems, not estimation errors. Tooling (Jira) configured only after structure and estimates are confirmed. Blind affinity produces better results than peer-influenced estimation when the team has established authority hierarchy (senior voices dominate in open estimation). [source: granola_8b912e8e, not_zBxoXexM2abxz9, not_Vn1AdPFNDQgWTj]

### Three-Day Offsite for Studio Transformation

NBI-delivered leadership offsite pattern (8-9 senior attendees): Day 1 -- foundation, goal statement, feature sweep at 2 min/row with "L by default" sizing; Day 2 -- gate-passing criteria ("the single most leveraged hour"), GTM, community strategy; Day 3 -- pipeline RACI maps, staff assessment (C-level only). Binding strategic decisions laid down before the offsite prevent relitigating in the room. Post-offsite: written decision records, not meeting notes. Retrospective before next session covers what held and what slipped. [source: ch_offsite_agenda_2026-04-27]

### S-Curve Change Management

Introducing structural change to a studio in batches (S-curves) is more effective than continuous drip-feeding. Model: introduce a defined cluster of changes > allow stabilisation > repeat. By the third curve the studio builds change tolerance and can absorb new structure faster. Key risk to communicate to the client: a new senior hire making independent structural changes during a stabilisation period resets the timeline. The studio owner must manage this actively. [source: not_ireYPwXIKrrsWd_scurve]

### Scope Fear Containment

When a studio first sees its full VS scope for the first time, a predictable fear response triggers scope-cut proposals. NBI containment framework: (1) all cut proposals go into a designated document -- no immediate decisions; (2) scope ownership clarified -- decisions belong to a named core group only; (3) fear acknowledged openly in the room; (4) studio head meets the most affected department directly to reframe scope ownership. Cut proposals submitted in writing only; no ad hoc cuts during estimation sessions. [source: not_4nWBkRC4r7TVRQ_vs_fear]

### AI-Native Hiring Advisory

As of 2026, Sega requires an AI component in analyst interviews. Implication: studios and analytics clients hiring into data/analytics roles should design hiring criteria around demonstrated LLM capability, not just domain knowledge. The workforce planning question shifts: "how many analysts?" becomes "do we need one instead of three, with AI leverage?" Advisory position: AI fluency matters more than raw technical skill over any 3-year employment horizon. Relevant for analytics clients evaluating headcount and for studios building analytics capability. [source: 2026-06-19_ai-native-hiring-analytics-standard]

---

## HR and Employment Patterns

### Slack DSAR Liability

UK employment disputes trigger Data Subject Access Requests (DSARs) that retrieve all Slack messages. Senior leaders frequently use Slack as if it were a private channel for informal HR commentary. Briefing required: HoDs must understand that Slack is not a private communication tool. Sensitive HR discussions must use appropriately documented channels. This is not theoretical -- DSARs have been used in employment disputes and the messages are fully retrievable. [source: not_4nWBkRC4r7TVRQ_dsar]

### Early Probation Exit Documentation

UK studios on standard probation terms often face situations where a recent hire is clearly misaligned but no formal performance process has been documented. Three grounds for early termination with credible documentation: (1) declaration of incapacity -- the employee's own verbal statement that they cannot perform the core function is the strongest possible documentation basis; (2) competency misrepresentation at hire -- contrast recruitment contact, role offered, competencies claimed in interview vs demonstrated capability; (3) structural misalignment signals -- positioning for a more senior role or contradicting a peer lead within weeks of joining. Documentation sequence: chronological evidence record -- recruitment contact, role offered, competencies claimed, employee verbatim statements. From 1 January 2027, unfair dismissal rights begin at 6 months of service (reduced from 2 years) -- exits past 6 months will carry higher procedural risk. [source: not_HubmSolirYMTbM, not_CPGgraRzP9tMoz, not_ireYPwXIKrrsWd_contractor_lexicon]

### Hiring Pipeline Governance

Clients routinely have weak pipeline discipline -- few candidates, late-stage collapses, no screening sequence. Minimum viable pipeline governance: (1) any open role with fewer than 3 valid candidates is red status; (2) lead-level and above require scorecards and background checks; (3) HR screening as first step -- collects salary expectations, contract type, relocation interest before technical evaluation, surfacing disqualifying practical mismatches before interview time is spent. [source: not_4nWBkRC4r7TVRQ_hiring_governance, granola_c3cc29b7]

---

## What Clients Hide (or Don't Know They're Hiding)

These patterns are not deliberate concealment -- clients often do not know these exist:

1. **Documentation completion is lower than reported.** Verbal progress reports are genuine but based on what exists in people's heads, not in files.

2. **The approval chain is not followed.** Leaders describe a robust process; in practice, informal approvals are the norm. The formal chain is invoked only for big decisions.

3. **Scope growth is invisible.** Features added informally are not tracked until a structured estimation exercise forces the total into view.

4. **Senior talent is thinner than presented.** Seniority titles are inflated. A "senior designer" is often a mid with 3-4 years of experience. This surfaces when quality-tier mapping is applied against actual output.

5. **Employment contracts have gaps.** Garden leave, IP assignment, and contractor/employee boundary clauses are frequently incomplete in founder-led studios. Legal review always surfaces at least one material gap.

6. **Build infrastructure is more fragile than reported.** Studios describe "a working build" but the stability, cadence, and team accessibility of that build is often far below what "working" implies.

---

## Engagement Delivery Patterns

### Written Decision Records Are Non-Negotiable

The single most common failure mode in NBI-supported studio engagements: decisions made in meetings are not written down. The team proceeds on recollection. Six weeks later, two different recollections are in conflict. Every NBI engagement now includes a decisions log as a mandatory deliverable from day one. Format: date, decision, owner, rationale, what was ruled out. Read at the start of every session. [source: granola_080a19f8]

### Red-Teaming Deliverables

All NBI deliverables (SoWs, reports, strategy documents) are red-teamed before delivery. Multi-role red teaming: senior engineer, GC, CEO perspectives applied to every deliverable. This is not a review pass -- it is adversarial challenge: "What in this is wrong? What will the client challenge? What legal exposure does this create?" Evidence tables: every non-obvious factual claim mapped to source, date, confidence, and gap. [source: chatgpt_6907ec33]

### Scope-of-Work Structure

NBI SoWs follow a 15-section structure including: Executive Summary (top 8 risks), Scope and Deliverables, Acceptance Criteria (measurable, not subjective), Risk Register (top 20 ranked by impact x likelihood), and Evidence Table appendix. Acceptance criteria are the most-resisted section by clients -- they want discretion on sign-off. The criteria are non-negotiable. Disputes about scope are always about what "done" means; pre-agreed measurable criteria eliminate 80% of these. [source: chatgpt_6907ec33]

### Handling the Pushback Meeting

When a client pushes back on findings (challenging the diagnosis, contesting the severity of a gap, defending a team member against assessment), the pattern: (1) acknowledge the pushback before responding; (2) return to evidence, not opinion; (3) separate the person assessment from the process assessment -- the process finding stands even if the person assessment is adjusted; (4) offer a written response window, not an in-meeting reversal. Reversing an evidence-based finding in the meeting is credibility damage that persists through the engagement. [source: not_4nWBkRC4r7TVRQ_vs_fear]

---

## Open Questions

1. **Client self-assessment accuracy:** How large is the typical gap between a client's self-assessment (maturity level) and NBI's diagnosis? Is there a consistent modifier?

2. **Garden leave enforcement success rate:** Of the studios that have adopted the three-tier contract fix, how many have successfully invoked garden leave on an employee-initiated resignation?

3. **Quad assessment downstream outcomes:** After a quad assessment, what proportion of "saves" succeed vs exit within 6 months?

4. **Founder idea log adoption:** Does formalising the idea log actually reduce ad-hoc founder interrupts, or does the founder treat the log as an additional channel?

5. **AI-native hiring criteria breadth:** Sega's 2026 requirement is the only primary data point. Is this a leading indicator of the wider industry, or sector-specific?

6. **S-curve timing:** What is the typical calendar duration of each S-curve, and what events mark the end of a stabilisation period?

---

## Source Index

| Source ID | Type | Description |
|---|---|---|
| chatgpt_69034e5d | ChatGPT | Production Risk Assessment: ~50-person studio with single producer (anonymised) |
| chatgpt_6907ec33 | ChatGPT | SoW Finalisation Report Structure |
| chatgpt_6967809b | ChatGPT | Org Design Assessment: anti-patterns and viable models (anonymised) |
| granola_5fdd8c18 | Granola | Offsite Day 2 -- 6-stage pipeline, epic structure (anonymised) |
| granola_4e145b7b | Granola | Offsite Day 1 -- feature tiering, VS scoping (anonymised) |
| granola_ae650223 | Granola | VS planning and estimation (anonymised) |
| granola_4005eb22 | Granola | Studio audit, documentation completion status (anonymised) |
| granola_d977d66a | Granola | Pre-offsite production assessment (anonymised) |
| granola_080a19f8 | Granola | Product leadership -- pipeline conflict, feedback systems (anonymised) |
| granola_8b912e8e | Granola | VS planning and studio roadmap (anonymised) |
| granola_c3cc29b7 | Granola | Executive meeting -- hiring pipeline (anonymised) |
| ch_offsite_agenda_2026-04-27 | OneDrive | 3-day studio leadership offsite methodology (anonymised) |
| slack_production-council_2026-05-25_process | Slack | Decision process codification (anonymised) |
| not_ZLLEyCfuFCgGaT | Granola | Remote communication frameworks (anonymised) |
| not_zBxoQexM2abxz9 | Granola | Estimation: min+20% corrective method (anonymised) |
| not_Vn1AdPFNDQgWTj | Granola | Min/max estimation theory (anonymised) |
| not_3bUR2wWsPQvo8n_scope | Granola | Scope governance: full estimate before cuts (anonymised) |
| not_4nWBkRC4r7TVRQ_dsar | Granola | Slack DSAR employment liability (anonymised) |
| not_4nWBkRC4r7TVRQ_vs_fear | Granola | VS fear management (anonymised) |
| not_4nWBkRC4r7TVRQ_hiring_governance | Granola | Hiring pipeline governance (anonymised) |
| not_ireYPwXIKrrsWd_scurve | Granola | S-curve change management (anonymised) |
| not_ireYPwXIKrrsWd_quadrant | Granola | Staff quadrant review (anonymised) |
| not_ireYPwXIKrrsWd_contractor_lexicon | Granola | UK probation law Jan 2027 (anonymised) |
| not_HubmSolirYMTbM, not_CPGgraRzP9tMoz | Granola | Early probation exit documentation (anonymised) |
| 2026-06-19_garden-leave-eligibility-contract-gap | Granola | Garden leave eligibility gap: three-tier contract fix (anonymised) |
| 2026-06-19_staged-studio-replacement-methodology | Granola | Staged staff replacement: phased waves, overlap-based exit (anonymised) |
| 2026-06-19_employee-survey-timing-principle | Granola | Employee satisfaction survey: don't launch until you can act (anonymised) |
| 2026-06-19_studio-seniority-distribution-target | Granola | Studio seniority distribution target 60/30/10 (anonymised) |
| 2026-06-19_founder-idea-log-scope-governance | Granola | Managing founder midnight ideas: shared idea log (anonymised) |
| 2026-06-19_producer-cross-dept-defect-translator | Granola | Producer as cross-department defect translator (anonymised) |
| 2026-06-19_quad-assessment-staff-segmentation | Granola | Quad assessment for production readiness (anonymised) |
| 2026-06-19_ai-native-hiring-analytics-standard | Granola | AI-native capability as hiring criterion for analytics roles (internal) |
