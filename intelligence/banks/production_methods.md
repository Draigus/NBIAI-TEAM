---
title: Production Methods
slug: production_methods
last_compiled: 2026-06-19
extract_count: 67
role_associations: [producer, production_consultant]
description: How game studios organise and deliver work. Frameworks, methodologies, milestone structures, and real-world outcomes from studios of 20-100 people.
---

# Production Methods

## Executive Summary

This bank covers how game studios in the 10-100 person range organise production: milestone frameworks, sprint cadence, live-ops scheduling, pre-production gates, org design, estimation methodology, remote communication, and documentation governance. The primary source of primary evidence is a deep NBI engagement with a ~55-70 person remote MMO studio (April-June 2026), supplemented by published frameworks from Tim Cain, Rami Ismail, Supergiant Games, and Ghost Ship Games, plus NBI's own consulting standards. The bank is strongest on the 40-70 person studio in early production navigating the prototype-to-production transition. Live ops cadence has mobile benchmarks but limited console/PC primary data. The recurring finding: studios almost universally believe they are further along in production than they are -- documentation gaps, not working code, define production maturity.

Thirteen new entries added June 2026: quality tier mapping as scope governance, staged staff replacement methodology, weekly build as primary visibility mechanism, design doc discipline for engineering, Jira/Perforce rollout sequencing, producer as cross-department defect translator, employee survey timing principle, quad assessment for production readiness, game design pillar-promise-value hierarchy, studio seniority distribution target (60/30/10), managing founder idea generation, nightly stable build protocol, MMO branch architecture model, and QA tool evaluation methodology.

---

## Framework Comparison

| Framework | Team Size Sweet Spot | Remote-Friendly | Game-Specific Adaptations | Known Outcomes |
|---|---|---|---|---|
| Agilefall (hybrid Agile + stage-gate) | 30-200 | Y | Gates on top (funding/milestone events); sprints underneath; playable vertical slice exits pre-prod | NBI standard for client studio onboarding [source: chatgpt_68fb7b4a] |
| NBI 6-Stage Pipeline | 30-100 | Y | Ideation > R&D > GDD/Brief > Prototype > MVP > Player Ready; colour-coded in PM tool | Adopted at ~55-person MMO studio after deep offsite; replaces ad-hoc prototype-to-ship pattern [source: granola_5fdd8c18] |
| Rami Ismail LTPF | 6-30 | Y | Vertical slice as pipeline validation not demo; buffer mandatory; genre-specific feature/content ratio | Most widely referenced indie milestone framework; used as publisher milestone definitions by NBI [source: web_2026-05-27_rami-ismail-ltpf-milestone-framework] |
| Tim Cain 9-Stage | 10-150+ | Y | "Beautiful Corner" between prototype and VS; Horizontal Slice for open-world connectivity testing | Genre-agnostic; most useful as stakeholder communication tool [source: web_2026-05-27_tim-cain-nine-stage-production] |
| Supergiant Monthly Milestone | 10-25 | Partial | Code-open / code-locked / polish / ship phases within each month; Early Access as external discipline | Hades: 4M+ copies year 1, 50+ GOTY, no crunch, 17-person team intact 10+ years [source: web_2026-05-27_supergiant-hades-monthly-milestone-cadence] |
| Ghost Ship "Develop by Doing" | 40-60 | N (in-office-first) | Stand-ups for sharing not task-assignment; community as production input; seasonal live ops cadence | Deep Rock Galactic: 8M+ copies, 6+ crunch-free years [source: web_2026-05-27_ghost-ship-open-development-live-ops] |
| Classic Functional + EP Hub | Under 60 | Y | Best for early-stage teams needing speed; strong EP owns delivery chain | Recommended pattern for ~50-person studios [source: chatgpt_6967809b] |
| Pod / Strike Team | 40-100 | Partial | Best for parallel workstreams with clear boundaries; requires discipline leads per pod | Alternative to functional model when work is clearly separable [source: chatgpt_6967809b] |
| Critical Stage Analysis (CSA) | 15+ (overlay) | Y | Monthly feedback overlay on any existing methodology; 2-4h per cycle | Designed by Wolfgang Hamann (Koolhaus/Radical Entertainment), presented at GDC [source: web_2026-05-27_critical-stage-analysis-hamann] |

---

## By Team Scale

### 10-25 People

Informal communication handles most coordination at this scale. The risk: informal channels become load-bearing and fail past ~20. Supergiant Games (17 people) operated with a monthly cadence -- code-open, code-locked, polish, and ship phases per month. Scope control: the "ripple effect" test -- does this work cascade across departments? If yes, it waits. Unlimited PTO underperformed compared to mandatory minimum (20 days); invisible pressure accumulated without enforced floors. [source: web_2026-05-27_supergiant-hades-monthly-milestone-cadence]

Rami Ismail's LTPF is the most appropriate formal structure: Research/Prototyping, Pre-Production (Vertical Slice), Production (Feature Complete through Content Complete), Wrap-Up. Vertical Slice can consume up to one-quarter of total development time. Content Complete 8-12 weeks before launch (4 weeks absolute minimum). [source: web_2026-05-27_rami-ismail-ltpf-milestone-framework]

### 25-50 People

The transition zone where informal coordination fails. Ghost Ship (~40-54 people) resolved this by preserving low-ceremony coordination: information-sharing stand-ups (not task-assignment) and in-office presence. For remote studios this size, equivalent process investment is required. [source: web_2026-05-27_ghost-ship-open-development-live-ops]

Single-producer configurations become a serious risk at this scale. A sole producer cannot simultaneously coordinate game content, platform work, backend services, build pipelines, playtests, partners, and vendors. Remediation: an Executive Producer overseeing four discipline tracks (QA, Audio, Art, Design), each with an embedded producer. [source: chatgpt_69034e5d]

Agilefall becomes appropriate at 30+: gates provide approval checkpoints; sprints enable iterative delivery. Definitions of Ready (clear problem, acceptance criteria, dependencies, assets, team agreement) and Done (criteria met, code reviewed, assets integrated, tests pass, docs updated, build green) prevent ambiguous handoffs. [source: chatgpt_68fb7b4a]

### 50-100 People

NBI's primary reference engagement is a ~55-70 person remote MMO studio. Key findings apply broadly.

**Production maturity is almost always lower than the team believes.** Art significantly ahead of core systems creates an "illusion of a full game." Working code without documentation is not production-ready. [source: granola_50612dd7, granola_5fdd8c18]

**Production structure requires explicit hierarchy.** Epic > Feature > Story > Task enforced formally. VS tracked as a release filter in the PM tool, not as an epic. Epic hierarchy for an MMO-lite (14 agreed domains): Player Build, World Systems, Combat, User Spaces, Items/Inventory, Player Economy, Quest System, Social/Multiplayer, Platform, Live Game, Business Development, Publishing, Game Bibles, RMT. [source: granola_5fdd8c18]

**Feature estimates by discipline (MMO-lite, calibration):** Player progression to MVP: 60d designer/20d eng/20d UI. Skill system: 90d designer/30d eng/25d UI. Partner portal: 60d engineering. New creature: 45d total. Capacity baseline: 20 workdays/month per person. [source: granola_ae650223, granola_5fdd8c18]

**Governance:** Creative Director signals intent > Design designs > Team feeds back > Game Director considers > three-party approval (Game Director + Executive Producer + Creative Director) before any commitment. Bypassed approval chains are the most common source of rework at this size. [source: slack_production-council_2026-05-25_process]

---

## By Working Model

### Fully Remote

Remote-first production requires more formal async communication. Three estimation spreadsheets maintained independently at a ~55-person remote studio required manual merge before structured sessions were introduced. Written decision records are load-bearing -- a running decisions log prevents re-litigation of approved work; without it, stealth branches proliferate. Anonymised feedback channels (per-department Google Forms) surface negative sentiment before escalation. No-meeting days (one per week) protect deep work. [source: chatgpt_69034e5d, granola_080a19f8]

Chain-of-command bypass is a critical remote failure mode. Slack messages are discoverable via DSAR in UK employment contexts -- informal HR commentary is fully retrievable in an employment dispute. Sensitive discussions should use appropriate documented channels; HoDs require explicit briefing that Slack is not a private communication tool. [source: not_4nWBkRC4r7TVRQ_dsar]

**Remote communication patterns (battle-tested):** 7-message rule -- the 8th message triggers a Zoom, automatically, removing the "when do we call?" meta-problem. Dual-layer mood tracking: team health and project confidence as separate signals. Two-standup model for distributed teams: two time-zone-spanning standups, each with 10-15 minutes of open chat before agenda. Binary retrospective: bi-weekly, yes/no responses only, groups of 3-5 to prevent groupthink. [source: not_ZLLEyCfuFCgGaT]

### Hybrid and Co-located

Ghost Ship's model (in-office with WFH Fridays and two additional WFH days/month) preserves cross-department communication density their "develop by doing" methodology requires. Not portable to remote without structural compensators (written briefs, decision logs, structured estimation). [source: web_2026-05-27_ghost-ship-open-development-live-ops]

---

## Sprint / Cycle Length Evidence

**Monthly cadence (Supergiant, 17 people):** Public Early Access commitment forced production discipline that internal deadlines alone did not. [source: web_2026-05-27_supergiant-hades-monthly-milestone-cadence]

**Two-horizon planning (Agilefall / 30+ people):** Quarterly PI planning (8-12 weeks) defines roadmap; sprint planning (1-2 weeks) handles execution. Weekly ceremony overhead: daily standup 15 min, backlog refinement 60-90 min, sprint planning 2-4h, sprint review 60-120 min, retrospective 60 min. [source: chatgpt_68fb7b4a]

**Estimation method (blind affinity planning):** Feature estimates use blind affinity planning with min/mid/max ranges, cross-validated by a second expert, with structured discussion for discrepancies greater than 5 days. Tooling (Jira) configured only after structure and estimates are confirmed. [source: granola_8b912e8e]

**Min+20% corrective for max-padded estimates:** When estimates are systematically padded to maximum, take the minimum realistic estimate and add 20%. Max-based planning is a credibility failure: experienced leads recognise inflated numbers and stop trusting the exercise. Min+15-20% is believable enough to signal real problems without triggering rejection. [source: not_zBxoXexM2abxz9, not_Vn1AdPFNDQgWTj]

**Wide-gap diagnostic:** Wide min/max gaps are documentation gaps, not estimation errors. Ask the estimator to narrate what fills the space -- it surfaces blockers, dependencies, and missing documentation. A 2-day to 400-day gap means the estimate set is worthless and requires facilitated re-estimation. **Prototype kits vs production kits:** Plans must explicitly distinguish these; prototype kits unblock bottlenecks and materially reduce downstream estimates. [source: not_zBxoXexM2abxz9, not_Vn1AdPFNDQgWTj]

**Engineering is always the long pole.** In every NBI estimation engagement, engineering delivers estimates last and these are the largest relative to original assumptions. At 65% estimation completion (art/design complete, engineering in progress) sprint planning was not viable. [source: slack_production-council_2026-05-25_process]

**OKR threshold calibration:** 1 week late = green; 4 months late = red. Two-layer status model: internal plan uses a buffer; external reporting only flags when buffer is being consumed. A dedicated PM role owns loop-closing and OKR dashboard, freeing the COO from chase work. [source: not_Ua643ajeN9C1f7]

---

## Pre-Production to Production Transitions

**Diagnostic signals of false production belief:** Working prototype code exists but GDDs/TDDs are absent (60% GDD/TDD coverage at a studio that believed itself in production); art impressive but core systems undocumented; design approval routinely bypassed; features built for investor demos that need redesign for scalability; first structured estimate reveals scope 2-3x larger than assumed. [source: granola_4005eb22, granola_5fdd8c18, granola_f41b006d, granola_ae650223]

**Pre-production exit gate / early production entry requirements (NBI standard):**
1. Solid prototype / vertical slice completed and validated
2. All core teams established
3. All design docs in preparation (actively in progress, not complete)
4. All TDDs in development [source: granola_d977d66a]

**The Beautiful Corner (Tim Cain):** A small non-playable area built to final visual quality proves art pipeline feasibility before committing full production resources. Cost: low. De-risking value: high. **The Horizontal Slice:** All game areas playable but unfinished; tests structural integrity and total playtime. Valuable for open-world and non-linear games. [source: web_2026-05-27_tim-cain-nine-stage-production]

**Vertical Slice definition (Rami Ismail):** Not a demo. A pipeline validation exercise that determines whether production at intended quality is viable -- consuming up to one-quarter of total development time. **VS serves three purposes:** (1) Studio demo for internal alignment; (2) Pipeline validation; (3) Investor material. Studios that treat VS as investor material only optimise for demo polish at the expense of pipeline verification. [source: web_2026-05-27_rami-ismail-ltpf-milestone-framework, not_3bUR2wWsPQvo8n_scope]

**Feature tiering and the cost of late cuts:** T0-T2 (cheap to cut -- orange zone); T3 (MVP -- cuts still manageable); post-T3 (cuts become expensive, sunk cost compounds). Post-T3 changes require formal change requests with throwaway cost analysis. **Three-tier change management lock system (NBI):** (1) Open iteration; (2) Soft lock; (3) Hard lock -- formal change request, game director + production approval, throwaway cost analysis. All hard lock requests route through the game director first. [source: granola_4e145b7b, granola_0fe5dec4]

**Managing scope fear:** When a studio first sees its full VS scope, a predictable fear response triggers scope-cut proposals. Framework: (1) All cut proposals go into a designated document -- no immediate decisions; (2) Scope ownership clarified -- decisions belong to a named core group only; (3) Fear acknowledged openly; (4) Studio head meets the most affected department directly to reframe scope ownership. [source: not_4nWBkRC4r7TVRQ_vs_fear]

**S-curve batching for studio transformation:** Changes in structured clusters are more effective than continuous drip-feeding. Model: introduce a defined cluster > allow stabilisation > repeat. By the third curve the studio builds change tolerance. Key risk: a new senior hire making independent structural changes during stabilisation resets the timeline. [source: not_ireYPwXIKrrsWd_scurve]

**Game design hierarchy: Pillars → Player Promises → Value Creation:** A three-layer framework: (1) Pillars -- core design principles, compiled from all conflicting versions, CEO-approved, then locked; (2) Player Promises -- what the player feels as a result of each pillar; (3) Value Creation -- how each promise translates to measurable outcomes (retention, revenue, engagement). Every contributor should trace their task through this chain. Built in Miro with a worked example before sharing with the wider team. [source: 2026-06-19_pillar-promise-value-creation-framework]

**Quality tier mapping per department as scope governance:** A Miro board mapping deliverable quality tiers per department, signed off by all leads and directors before VS work begins. Makes each department's expected output quality explicit and locked. "Design lock" adopted as formal boundary -- requests to cross it require explicit process. Top-down enforcement from the studio owner is necessary alongside the process tool. [source: 2026-06-19_quality-tier-scope-governance-miro]

**Scope governance -- full estimate first:** No scope cuts discussed before a full estimate is in hand. Sequence: (1) calculate total hours; (2) evaluate outsourcing or headcount options; (3) only then consider cuts. Ad hoc cut ideas submitted in writing only. [source: not_3bUR2wWsPQvo8n_scope]

---

## Build Stability and Merge Cadence

**Weekly build as the primary visibility mechanism:** "I don't care what's in Jira or Perforce. If I can't play the game, it's not there." Weekly playable build is the foundation of studio state; Jira and tracking tools only become meaningful once anchored to a stable build. Biweekly showcase-style demos are false confidence. Sequence: get weekly build → sprint retrospectives → then Jira becomes interesting. [source: 2026-06-19_weekly-build-visibility-design-doc-discipline]

**Design document discipline for engineering:** Engineers must not implement features without a properly detailed design spec, even for "known" features. Rule: if engineering cannot receive an adequate design spec, push it back. Creates accountability between design and engineering and surfaces when design is the bottleneck. [source: 2026-06-19_weekly-build-visibility-design-doc-discipline]

**Nightly stable build protocol:** Two-environment setup: (1) Stable -- nightly 4am build from main; QA lead runs smoke test each morning and posts to studio channel ("this build is live and tested, ready to play"); always one sprint behind main (a deliberate lag, not a gap); anyone in the studio can jump in at any time. (2) Verification -- per-PR build gates merges; not for general access. Without a defined stable build, biweekly showcases become the only visibility point, creating false confidence. [source: 2026-06-19_nightly-stable-build-protocol]

**MMO branch architecture model:** Four tiers: Main (merge target only; all merges approved by branch manager), Dev (sandbox; breaking dev acceptable), Feature branches (isolated per system; parallel development without cross-contamination), Stable (one sprint behind main; never has in-progress work). Branch manager role: dedicated person owning merge approval into main, kicking back anything that breaks build. Studios transitioning from GitHub to Perforce must actively replicate the PR review mechanism. Helix (Perforce UI layer) makes the system accessible to QA and non-engineers. [source: 2026-06-19_mmo-branch-architecture-model]

**Weekly merge day:** Formalising a single weekly merge day reduces integration conflicts by concentrating them into a predictable window. Requires: QA environments stable before introduction; single person owning the launcher/build process. Documentation SOT governance: keep existing tool as interim SOT; design new tool's structure completely before opening access to the full team. [source: not_3bUR2wWsPQvo8n_build, not_3bUR2wWsPQvo8n_docs]

---

## Live Ops Cadence

### Mobile F2P Benchmarks

| Genre | Events/Month | Revenue Impact |
|---|---|---|
| Casual/Puzzle | 15-25 | ARPDAU lift +20-40% during events |
| Mid-core (RPG, Strategy) | 8-15 | Battle pass contributes 10-20% of total earnings |
| Competitive/Shooter | 4-8 | Battle pass contributes 30-40% of total earnings |
| Hybrid-casual | 4-6 | Fastest-growing segment (+75% revenue YoY) |

Three-layer calendar: Macro events (4-8 weeks, seasonal), Mid-cycle events (1-2 weeks), Micro events (24-72 hours). Performance targets: event participation 40-60% of DAU; D7 retention post-event not to decline; ARPDAU lift +20-40%. Consistency beats intensity. [source: web_2026-06-02_liveops_event_cadence_economics]

### PC/Console Reference

A ~50-person studio sustained a 4-6 month seasonal cadence for PC co-op without crunch for 6+ years. Community feedback drives product decisions throughout development, not just at launch. A dedicated "Live Game" epic covering telemetry, analytics, and live ops infrastructure is required from early production -- not added when the game ships. [source: web_2026-05-27_ghost-ship-open-development-live-ops, granola_5fdd8c18]

---

## Continuous Improvement: Critical Stage Analysis

CSA is a feedback overlay compatible with any methodology. Three questions, five items each, rated by importance (1 = most important): What went right? What went wrong? What could be improved? Responses within 3 days of milestone; team presentation within 1 week. Total cost: 2-4 hours per cycle. Previous milestone issues receive status updates at the next meeting, preventing inaction. Informal feedback works below ~20 people; above ~50, systematic feedback mechanisms are necessary. [source: web_2026-05-27_critical-stage-analysis-hamann]

---

## Studio Leadership Offsite Methodology

A tested 3-day format (8-9 senior attendees): Day 1 -- foundation, goal statement, feature sweep at 2 min/row with "L by default" sizing. Day 2 -- gate-passing criteria ("the single most leveraged hour of the offsite"), GTM, community strategy. Day 3 -- pipeline RACI maps, staff assessment (C-level only). Binding strategic decisions laid down before the offsite prevent relitigating in the room. See client_patterns bank for full facilitation detail. [source: ch_offsite_agenda_2026-04-27]

---

## Org Design Patterns

### Structural Anti-Patterns and Viable Models

Three anti-patterns in 50-person studios: (1) Producer mis-parented through Finance/Ops; (2) CTO span too flat -- becomes a bottleneck; (3) Tech Art/VFX in a grey zone between Engineering and Art -- both assume the other is accountable. [source: chatgpt_6967809b]

Three viable structures at 50-100 people: Classic Functional with strong EP hub (best under 60); Pod/Strike Team (best for parallel workstreams with clear boundaries); Platform + Game dual-track (only when platform is genuinely a strategic product). When a studio simultaneously builds a game and a platform, the platform must have GM-style product ownership, not be treated as an ops subteam. [source: chatgpt_69034e5d, chatgpt_6967809b]

### Staged Staff Replacement Methodology

When a studio has identified a cohort of underperformers, replacement follows a phased pattern: (1) Open the replacement role; (2) Find and hire the candidate; (3) Overlap new hire with existing person 2-3 weeks for handover; (4) Exit the existing person. Wave sizing: groups of 3-5-7-8, not all at once -- prevents cultural shock and allows onboarding infrastructure to absorb new hires. Communication sequence: brief COO and EP first, consolidate a step-by-step plan, then brief the CEO/studio owner. Some underperformers self-select out when new hires arrive, which is preferable to managed exits. [source: 2026-06-19_staged-studio-replacement-methodology]

### Studio Seniority Distribution Target

Target distribution for a quality-gated MMO studio in VS preparation: ~60% seniors, ~30% mids, ~10% juniors (only with real mentorship infrastructure in place). Remote juniors without senior mentors develop bad habits or stall -- no osmotic learning. Training curriculum, scheduled senior time, and checkpoints are prerequisites for any junior presence. Replacements are product-driven, not budget-driven: the goal is capability elevation, not cost reduction. [source: 2026-06-19_studio-seniority-distribution-target]

### Quad Assessment for Production Readiness

A one-time structured evaluation for entering a high-stakes production phase. Core question: "Can this person deliver high-quality [product type] content in their craft, at speed, right now?" (Not: "is this person a good employee?") Two criteria for staying: (1) Good to work with, self-managing, team-positive; (2) Delivers product-level quality consistently at pace. Result tiers: hard cuts (red triangle -- first priority), stars/saves (director owns the save -- "you own their growth or their replacement"), juniors (flagged J -- separate consideration), unmarked (exits but lower urgency). Assessment ratified by the full director group. Leads given a cap ("you get three picks") to force honest assessments. [source: 2026-06-19_quad-assessment-staff-segmentation]

### Staff Quadrant Review (Ongoing Performance Framework)

A four-category 2x2 for systematic team assessment: (1) Weak link -- low capability, low growth potential, managed exit; (2) Loose cannon -- high output but unpredictable or destructive; (3) Steady Eddie -- reliable, meets expectations; (4) Champion -- high capability, high behaviour alignment. Evaluation against the role standard, not peers. Three HoD facilitation questions: Can this person do the job at scale today? Do they have growth potential? Can the studio accelerate that growth within a year? [source: not_ireYPwXIKrrsWd_quadrant]

### Employee Satisfaction Survey Timing

Do not launch until the studio has capacity to act on results. A survey creates a commitment backlog; launching before infrastructure exists creates expectations that will be visibly unmet, damaging trust more than the survey helps. Immediate morale intervention alternative: all-studio 1:1 rotation (~55 people over ~4 weeks) connects with staff who have not had direct leadership time. Target survey timing: after Jira, pipelines, and vertical slice are moving. [source: 2026-06-19_employee-survey-timing-principle]

### Managing Founder "Midnight Ideas"

Pattern: founders generate scope change requests ad hoc, bypassing production planning. Mechanism: a shared idea log where anyone receiving an ad-hoc founder request adds the item for weekly review in 1:1s or team meetings. Ideas are not acted on ad hoc. Showing founders all their own ideas in one place is a natural self-regulator -- volume makes the pattern visible to the originator. For in-meeting scope pivots: the lead handles the interrupt in the moment; coach the founder on the pattern in their direct 1:1, not in front of the team. [source: 2026-06-19_founder-idea-log-scope-governance]

---

## Onboarding at Scale

**Role-specific machine builds and common stack:** Artist kit, producer kit, developer kit. Hardware for FTEs only; contractors provide own. General: Slack, Google Workspace, Jira, Confluence, VPN. Development: GitHub, Perforce, Azure, Redis. Art: Perforce, Maya/3D Max, Photoshop, Miro. Production: Claude accounts, Granola, Whisper Flow. Four-month probation with 30/60/90-day check-in reviews. [source: granola_891cf074]

**Jira + Perforce rollout sequencing (5 steps, ~6-7 weeks total):** (1) Load Jira (~3 weeks from rollout decision); (2) Art and tech producers onboard concurrently; (3) ~1 week to stabilise with a Jira admin hire; (4) ~3 weeks debugging pipelines via sprint retrospectives; (5) Sprint flywheel starts ~6-7 weeks from rollout decision. Do not open Jira until controls and structure are ready -- premature access creates noise. Estimation exercise must precede rollout to seed the system with credible data from day one. Rationale for Jira/Perforce over alternatives: lower onboarding overhead for new hires already familiar from prior studios. [source: 2026-06-19_jira-perforce-rollout-sequence]

**AI-native capability as hiring criterion:** As of 2026, Sega requires an AI component in analyst interviews. Logic: if hired for a 3-year term, AI fluency outweighs raw technical skill over that horizon. The headcount question shifts from "how many analysts?" to "do we need one instead of three?" Studios hiring analytics roles should design for demonstrated LLM capability, not just domain knowledge. [source: 2026-06-19_ai-native-hiring-analytics-standard]

**Early probation exit (UK employment law):** Three grounds for early termination: (1) Declaration of incapacity by the employee -- their own verbal statement that they cannot perform the core function is the strongest documentation basis; (2) Competency misrepresentation at hire; (3) Structural misalignment signals (positioning for a more senior role or contradicting a peer lead within weeks). Documentation plan: chronological evidence record -- recruitment contact, role offered, competencies claimed in interview, employee verbatim statements. From 1 January 2027, unfair dismissal rights begin after 6 months of service (reduced from 2 years). Creative generalist vs technical specialist mismatch does not surface in portfolio review -- it surfaces when the hire attempts the core technical function. [source: not_HubmSolirYMTbM, not_CPGgraRzP9tMoz, not_ireYPwXIKrrsWd_contractor_lexicon]

**Hiring pipeline governance:** (1) Pipeline health minimum: any open role with fewer than 3 valid candidates is red status; (2) Scorecard tiering: lead-level and above require scorecards and background checks; (3) HR screening as first step: collects salary expectations, contract type, relocation interest before technical evaluation, surfacing disqualifying practical mismatches before costly interview time is spent. [source: not_4nWBkRC4r7TVRQ_hiring_governance]

---

## Quality and Delivery Standards

**Producer as cross-department defect translator:** The producer's role: (1) check ask details before work starts (does the request have enough detail?); (2) check output against delivery criteria before sign-off; (3) track defects in retrospectives; (4) feed rework into the producer backlog. Escalation: one defect = human, flagged internally; repeated defects from the same person = escalate to their director; persistent pattern = escalate to fractional head of studio / COO. Exemplar: a glider asset went wrong because a lead declared it approved without the art director or game director's sign-off, and rigging started prematurely. Root cause: no defined request criteria, no definition of done, no visibility into asset progress. [source: 2026-06-19_producer-cross-dept-defect-translator]

**QA tool evaluation process:** Management builds a vendor assessment list; QA builds a use case list. The two lists are merged and tools are demoed against use cases. Decision criteria: a 7/10 use case match that saves headcount equivalent to 3 people. Tools shortlisted at one MMO studio: TestRail (test plans/management), TeamCity (CI/CD automation), modl.ai (AI-assisted QA), DataDog, Sentry, Locust, Toxiproxy, Helix. TestRail and TeamCity are the cornerstones; Google Sheets explicitly rejected as a test plan tool. **Internal tool PR model:** Custom tooling needs follow the same product requirements + backlog + prototype + test process as product features. [source: 2026-06-19_qa-tooling-evaluation-pr-model]

**Biweekly art asset output tracking:** Leads compile what was built, by whom, with a direct link to approved renders. Framing: high output buys tolerance for rough edges; low output does not. [source: not_9qoMQqGw4HJ8jk_asset_tracking]

**Bi-weekly update framing (output to impact):** Every update item must state what was built AND why it matters to the game. Example: "Built memory leak pipeline monitor -- prevents a Payday 3-style crash on launch." Surfaces which teams struggle to connect their work to player experience -- an early diagnostic of strategic misalignment. [source: not_VAlGkyKnb8xGcs]

**Kick-it-back documentation gate:** If a TDD cannot be written from what is provided, reject the story before sprint commitment -- not on day one of the sprint. Escalation: flag to technical producer, who escalates to design for prioritisation. Pre-commitment rejection is critical -- sprint-day-one rejection burns capacity planning and erodes trust in the sprint process. Stories exceeding 10 working days must be split or reclassified as features/epics. [source: not_VAlGkyKnb8xGcs]

**SoW report structure (NBI standard):** 15 sections including Executive Summary (top 8 risks), Deliverables and Acceptance (measurable acceptance tests), Risk Register (top 20 ranked by impact x likelihood), and Evidence Table appendix mapping every non-obvious claim to source, date, confidence, and gap. Multi-role red teaming embedded in the report process, not added afterwards. [source: chatgpt_6907ec33]

**Audit-driven improvement:** Numeric audit scoring drives focused improvement. A 19-dimension code audit with numeric scoring (6.6/10) followed by a structured sprint plan followed by a re-audit (7.3/10) is a reusable consulting delivery pattern. [source: handoff_2026-04-08b]

**Production data consolidation:** When consolidating multi-source plans, preserve original naming -- never rename stories or features. Miro boards require multiple extraction passes; no single export captures everything. [source: ch_production_consolidation_spec]

---

## Open Questions

1. **Sprint length for 50-100 person cross-discipline teams:** Strong evidence for monthly cadence (small teams) and two-horizon planning (Agilefall), but no primary data on optimal sprint length at 50-100 people with complex cross-discipline dependencies.

2. **Remote estimation calibration:** Blind affinity planning produced good results at one studio. Engineering estimates are consistently the long pole -- is the gap consistent enough to apply a standard correction factor?

3. **Post-T3 cut cost quantification:** The tier framework identifies T3 as the inflection point, but no quantified throwaway cost data by system type exists.

4. **Live ops cadence for PC/console MMO:** Event frequency and ARPDAU lift benchmarks are mobile-centric. No equivalent primary dataset for console and PC MMO or live service games.

5. **EP transition onboarding:** Multiple extracts reference an Executive Producer added to a studio that had none. The optimal onboarding sequence for this role -- entering an existing team with established informal authority -- is undocumented.

6. **Jira admin qualification:** What constitutes a qualified Jira admin for a 50-70 person studio in its first rollout, vs an experienced admin for a complex multi-team environment?

7. **Binary retro calibration:** The binary retro format is documented from a single source. How does it compare to traditional format at scale above 25 people?

8. **OKR two-layer model investor trust:** The internal buffer vs external flag model assumes investors trust the external signal. Does this hold once investors have experienced a studio burn through the buffer silently?

---

## Source Index

| Source ID | Type | Description |
|---|---|---|
| chatgpt_68fb7b4a | ChatGPT | AAA Agilefall Production Operating Guide |
| chatgpt_69034e5d | ChatGPT | Production Risk Assessment: ~50-person studio with single producer (anonymised) |
| chatgpt_6907ec33 | ChatGPT | SoW Finalisation Report Structure |
| chatgpt_6967809b | ChatGPT | Org Design Assessment and Alternatives (anonymised) |
| web_2026-05-27_critical-stage-analysis-hamann | Web | CSA framework -- Hamann/Koolhaus/Radical Entertainment |
| web_2026-05-27_ghost-ship-open-development-live-ops | Web | Ghost Ship Games / Deep Rock Galactic production and live-ops model |
| web_2026-05-27_rami-ismail-ltpf-milestone-framework | Web | Rami Ismail LTPF -- indie milestone framework |
| web_2026-05-27_supergiant-hades-monthly-milestone-cadence | Web | Supergiant Games / Hades -- monthly milestone cadence and anti-crunch |
| web_2026-05-27_tim-cain-nine-stage-production | Web | Tim Cain 9-stage framework including Beautiful Corner |
| web_2026-06-02_liveops_event_cadence_economics | Web | Live ops event cadence and ARPDAU benchmarks (mobile F2P, 2026) |
| not_ZLLEyCfuFCgGaT | Granola | Remote communication frameworks: 7-message rule, dual-layer mood tracking, binary retros (anonymised) |
| not_Ua643ajeN9C1f7 | Granola | OKR threshold calibration and two-layer status model (anonymised) |
| not_3bUR2wWsPQvo8n_scope | Granola | Scope governance: full estimate before cuts, VS three purposes (anonymised) |
| not_3bUR2wWsPQvo8n_build | Granola | Build stability: weekly merge day, launcher ownership (anonymised) |
| not_3bUR2wWsPQvo8n_docs | Granola | Documentation SOT: template-first rollout (anonymised) |
| not_zBxoXexM2abxz9 | Granola | Estimation: min+20% corrective method, wide-gap diagnostic (anonymised) |
| not_Vn1AdPFNDQgWTj | Granola | Min/max estimation theory; prototype vs production kits (anonymised) |
| granola_5fdd8c18 | Granola | Offsite Day 2 -- 6-stage pipeline, epic structure, gate system (anonymised) |
| granola_4e145b7b | Granola | Offsite Day 1 -- feature tiering, VS scoping (anonymised) |
| granola_f41b006d | Granola | Offsite Day 2 Part 2 -- feature status, estimates (anonymised) |
| granola_ae650223 | Granola | VS planning and estimation (anonymised) |
| granola_4bc24036 | Granola | Estimation debrief (anonymised) |
| granola_4005eb22 | Granola | Studio audit, documentation completion status (anonymised) |
| granola_0fe5dec4 | Granola | Character pipeline and three-tier lock system (anonymised) |
| granola_b82e3b84 | Granola | QA estimation and design lock process (anonymised) |
| granola_d977d66a | Granola | Pre-offsite production assessment (anonymised) |
| granola_080a19f8 | Granola | Product leadership -- pipeline conflict, feedback systems (anonymised) |
| granola_8b912e8e | Granola | VS planning and studio roadmap (anonymised) |
| granola_50612dd7 | Granola | External validation of studio transformation (anonymised) |
| granola_891cf074 | Granola | Onboarding flow design -- department tooling, probation structure (anonymised) |
| granola_c3cc29b7 | Granola | Executive meeting -- hiring pipeline, technical debt (anonymised) |
| granola_e5678c68 | Granola | Executive meeting -- estimation sessions (anonymised) |
| granola_c3205cb8 | Granola | Executive meeting -- VS Excel, hiring wave decisions (anonymised) |
| ch_offsite_agenda_2026-04-27 | OneDrive | 3-day studio leadership offsite methodology (anonymised) |
| ch_production_consolidation_spec | OneDrive | Production data consolidation methodology (anonymised) |
| slack_production-council_2026-05-25_process | Slack | Decision process codification and estimation status (anonymised) |
| handoff_2026-04-08b | Claude session | Audit-driven improvement: numeric score + sprint plan + re-score |
| granola_c105bb66 | Granola | RESTRICTED -- not included |
| not_4nWBkRC4r7TVRQ_dsar | Granola | Slack DSAR employment liability (anonymised) |
| not_4nWBkRC4r7TVRQ_vs_fear | Granola | VS fear management: scope-cut proposal containment (anonymised) |
| not_4nWBkRC4r7TVRQ_hiring_governance | Granola | Hiring pipeline governance: 3-candidate minimum, HR-first screening (anonymised) |
| not_ireYPwXIKrrsWd_scurve | Granola | S-curve change management for studio transformation (anonymised) |
| not_ireYPwXIKrrsWd_quadrant | Granola | Staff quadrant review: 2x2 framework (anonymised) |
| not_ireYPwXIKrrsWd_contractor_lexicon | Granola | Contractor vs employee termination lexicon; UK probation law Jan 2027 (anonymised) |
| not_9qoMQqGw4HJ8jk_asset_tracking | Granola | Biweekly art asset output tracking (anonymised) |
| not_VAlGkyKnb8xGcs | Granola | Engineering visibility: bi-weekly framing, kick-it-back gate (anonymised) |
| not_HubmSolirYMTbM, not_CPGgraRzP9tMoz | Granola | Early probation exit: declaration of incapacity, documentation plan (anonymised) |
| 2026-06-19_quality-tier-scope-governance-miro | Granola | Quality tier mapping per department as scope governance (anonymised) |
| 2026-06-19_staged-studio-replacement-methodology | Granola | Staged staff replacement: phased waves, overlap-based exit (anonymised) |
| 2026-06-19_weekly-build-visibility-design-doc-discipline | Granola | Weekly build as primary visibility; design doc discipline for engineering (anonymised) |
| 2026-06-19_jira-perforce-rollout-sequence | Granola | Jira + Perforce rollout sequencing: 5-step, 6-7 week timeline (anonymised) |
| 2026-06-19_producer-cross-dept-defect-translator | Granola | Producer as cross-department defect translator; escalation ladder (anonymised) |
| 2026-06-19_employee-survey-timing-principle | Granola | Employee satisfaction survey: don't launch until you can act (anonymised) |
| 2026-06-19_quad-assessment-staff-segmentation | Granola | Quad assessment for production readiness: red triangle/saves/J/unmarked (anonymised) |
| 2026-06-19_pillar-promise-value-creation-framework | Granola | Game design hierarchy: Pillars → Player Promises → Value Creation (anonymised) |
| 2026-06-19_studio-seniority-distribution-target | Granola | Studio seniority distribution target 60/30/10 (anonymised) |
| 2026-06-19_founder-idea-log-scope-governance | Granola | Managing founder "midnight ideas": shared idea log + weekly review (anonymised) |
| 2026-06-19_nightly-stable-build-protocol | Granola | Nightly stable build protocol: 4am build, smoke test, two environments (anonymised) |
| 2026-06-19_mmo-branch-architecture-model | Granola | MMO branch architecture: main/dev/feature/stable, branch manager role (anonymised) |
| 2026-06-19_qa-tooling-evaluation-pr-model | Granola | QA tool evaluation process; internal tool PR model (anonymised) |
| 2026-06-19_ai-native-hiring-analytics-standard | Granola | AI-native capability as hiring criterion for analytics roles (internal) |
