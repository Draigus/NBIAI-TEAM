---
title: Production Methods
slug: production_methods
last_compiled: 2026-06-17
extract_count: 47
role_associations: [producer, production_consultant]
description: How game studios organise and deliver work. Frameworks, methodologies, milestone structures, and real-world outcomes from studios of 20-100 people.
---

# Production Methods

## Executive Summary

This bank covers how game studios in the 10-100 person range organise production: milestone frameworks, sprint cadence, live-ops scheduling, pre-production gates, org design, estimation methodology, remote communication, and documentation governance. The primary source of primary evidence is a deep NBI engagement with a ~55-70 person remote UK studio building an MMO-lite (April-June 2026), supplemented by published frameworks from Tim Cain, Rami Ismail, Supergiant Games, and Ghost Ship Games, plus NBI's own consulting standards. The bank is strongest on the 40-70 person studio in early production navigating the prototype-to-production transition. Live ops cadence has mobile benchmarks but limited console/PC primary data. The recurring finding across all sources: studios almost universally believe they are further along in production than they are — documentation gaps, not working code, define production maturity.

---

## Framework Comparison

| Framework | Team Size Sweet Spot | Remote-Friendly | Game-Specific Adaptations | Known Outcomes |
|---|---|---|---|---|
| Agilefall (hybrid Agile + stage-gate) | 30-200 | Y | Gates on top (funding/milestone events); sprints underneath; playable vertical slice exits pre-prod | NBI standard for client studio onboarding [source: chatgpt_68fb7b4a] |
| NBI 6-Stage Pipeline | 30-100 | Y | Ideation > R&D > GDD/Brief > Prototype > MVP > Player Ready; colour-coded in project management tool | Adopted at ~55-person MMO studio after deep offsite; replaces ad-hoc prototype-to-ship pattern [source: granola_5fdd8c18] |
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

At this scale informal communication handles most coordination. The risk is that informal channels become load-bearing and fail when the team grows past ~20. Supergiant Games (17 people, all original founders retained over 10+ years) operated successfully with a monthly milestone cadence — each month split into code-open, code-locked, polish, and ship phases. Their scope control mechanism was the "ripple effect" test: does this extra work stay within one person's domain, or cascade across departments? If it cascades, it waits. [source: web_2026-05-27_supergiant-hades-monthly-milestone-cadence]

Rami Ismail's LTPF framework is the most appropriate formal structure at this scale. Four phases — Research/Prototyping, Pre-Production (including Vertical Slice), Production (Feature Complete through Content Complete), Wrap-Up — map to publisher milestone expectations and scale up later. The Vertical Slice can consume up to one-quarter of total development time and validates the pipeline, not just the game design. Content Complete should be reached 8-12 weeks before launch (4 weeks absolute minimum). [source: web_2026-05-27_rami-ismail-ltpf-milestone-framework]

Anti-crunch findings at small scale: unlimited PTO underperformed compared to mandatory minimum (20 days per year) at Supergiant — invisible pressure accumulated without enforced floors. No work emails after 5 PM Friday was enforced as a team norm, not individual discipline. [source: web_2026-05-27_supergiant-hades-monthly-milestone-cadence]

### 25-50 People

This is the transition zone where informal coordination fails and formal process becomes necessary. Ghost Ship Games (~40-54 people) resolved this by preserving low-ceremony coordination: information-sharing stand-ups (not task-assignment), free cross-department discussion, and in-office presence to maintain communication density. Their methodology explicitly resists documentation overhead — "develop by doing, not talking." Their model works because in-office presence compensates for absent process structure. For remote studios of this size, equivalent process investment is required. [source: web_2026-05-27_ghost-ship-open-development-live-ops]

Single-producer configurations become a serious risk at this scale. A sole producer at a ~50-person studio cannot simultaneously coordinate game content, platform work, backend services, build pipelines, playtests, partners, and vendors. The result is decision latency, missed handoffs, and governance ambiguity where approved decisions get re-litigated and stealth branches proliferate. The remediation pattern: an Executive Producer overseeing four discipline tracks (QA, Audio, Art, Design), each with an embedded producer. [source: chatgpt_69034e5d]

The Agilefall hybrid becomes appropriate at 30+ people. Gates provide funding/risk approval checkpoints; sprints enable iterative delivery within gates. The backlog hierarchy — Epics > Features > User Stories > Tasks — with explicit Definitions of Ready (clear problem, acceptance criteria, dependencies, assets, team agreement) and Done (criteria met, code reviewed, assets integrated, tests pass, docs updated, build green) prevents ambiguous handoffs. [source: chatgpt_68fb7b4a]

### 50-100 People

NBI's primary reference engagement is a ~55-70 person UK studio building an MMO-lite (52 people at engagement start, grown to ~70 over the engagement). Key findings from this engagement apply broadly to studios in this size band.

**Production maturity is almost always lower than the team believes.** An independent external audit and NBI's internal assessment reached the same conclusion: art was significantly ahead, creating an "illusion of a full game" while core systems, design documentation, and technical architecture lagged. The studio believed itself in mid-production; the audit confirmed pre-production. The primary diagnostic signal: most features in grey/orange stage (R&D or GDD) despite having prototype code. Working code without documentation is not production-ready. [source: granola_50612dd7, granola_5fdd8c18]

Art-ahead-of-systems imbalance is a common anti-pattern. Visual assets create perceived progress that masks systemic gaps. Studios build components out of sequence; prototype mode persists too long; too many parallel initiatives run without proper sequencing. [source: granola_50612dd7]

**Production structure at this scale requires explicit hierarchy.** Epic > Feature > Story > Task must be formally defined and enforced. Content and feature epics should be merged into one epic per domain — separate tracking creates misleading completion percentages. The vertical slice should be tracked as a release filter in the project management tool (e.g., Jira fixed version), not as an epic — this prevents structural confusion in progress reporting. [source: granola_5fdd8c18]

**Epic hierarchy for an MMO-lite (14 agreed domains):** Player Build, World Systems, Combat, User Spaces and Mini Games, Items and Inventory, Player Economy, Quest System, Social and Multiplayer, Platform, Live Game (telemetry/analytics/live ops), Business Development/Partner Build, Publishing, Game Bibles, RMT. [source: granola_5fdd8c18]

**Feature estimates by discipline (MMO-lite, for calibration):**
- Player progression to MVP: 60 days designer / 20 days engineer / 20 days UI
- Skill system to MVP: 90 days designer / 30 days engineer / 25 days UI
- Partner portal (large file handling, 50GB games): 60 days engineering
- New creature (modelling + animation + VFX): 45 days total

Capacity planning baseline: 20 workdays per month per person. At 15 headcount needed for early production, Excel-based capacity planning with automatic headcount calculations from estimates is the most reliable tool before Jira is configured. [source: granola_ae650223, granola_5fdd8c18]

**Governance: three-party approval prevents scope creep.** The canonical decision process: Creative Director signals intent > Design designs > Team feeds back > Game Director considers feedback > Proposals approved by Game Director + Executive Producer + Creative Director. Three-party approval before any commitment. Bypassed approval chains are the most common source of rework in this studio size. [source: slack_production-council_2026-05-25_process]

---

## By Working Model

### Fully Remote

Remote-first production requires more formal async communication than in-office equivalents. Estimation processes that rely on informal alignment break down — at a ~55-person fully remote studio, three separate estimation spreadsheets were maintained independently, requiring manual merge. Structured estimation sessions (all-hands process explanation followed by individual team sessions over a defined window, with cross-team dependency calls before sprint planning) replaced informal convergence. [source: slack_production-council_2026-05-25_process, granola_ae650223]

Written decision records are load-bearing when teams cannot overhear decisions. A running decisions log prevents re-litigation of approved work. Without it, stealth branches proliferate — approved designs get quietly reworked because the decision was never written down. [source: chatgpt_69034e5d]

Anonymised feedback channels fill the gap that informal culture fills in co-located studios. Per-department anonymous forms (Google Forms in incognito mode, visible only to department heads) surface negative sentiment before it escalates. In remote settings sentiment accumulates invisibly. [source: granola_080a19f8]

No-meeting days (one day per week) protect deep work. The day creates predictable uninterrupted windows that improve delivery throughput in teams where context-switching cost is high. [source: granola_080a19f8]

Chain-of-command bypass is a critical remote failure mode: leads going directly to founders rather than through the production chain undermines authority and creates conflicting directives. The approval chain must be written and enforced. [source: chatgpt_69034e5d]

**Remote communication patterns (battle-tested, MMO/AAA/mobile background):**

- **7-message rule:** The 8th message in any thread triggers a Zoom/video call — all parties join without discussion. Eliminates the "when do we call?" meta-problem by making the trigger automatic, not a judgement call. Prevents threads spiralling into misunderstanding while respecting async flow for short exchanges. Glen's assessment: immediately deployable, requires no tooling changes. [source: not_ZLLEyCfuFCgGaT]
- **Dual-layer mood tracking:** Emoji mood board that tracks team health and project confidence as separate signals. A team can be high-confidence on the project but low on personal wellbeing, or vice versa — conflating both into a single "morale" metric means you can't tell which problem you have. Check-in is lightweight (emoji only); separation is the analytical value. [source: not_ZLLEyCfuFCgGaT]
- **Two-standup model for distributed teams:** Two standups timed to cover all relevant time zones, not a single "company standup" that excludes half the team. First half of each standup is open chat (no agenda) — 10-15 minutes — to build cohesion rather than purely consuming operational time. Team lead as optional invitee on engineering standups: available on-demand rather than as mandatory overhead. [source: not_ZLLEyCfuFCgGaT]
- **Binary retrospective format:** Bi-weekly cadence (not monthly/quarterly). Binary format: yes/no responses only, not open discussion. Small groups of 3-5 people specifically to prevent groupthink — full-team retros cause junior team members to align with senior voices, producing false consensus. [source: not_ZLLEyCfuFCgGaT]

### Hybrid

Ghost Ship's model — primarily in-office with WFH Fridays and two additional WFH days per month — preserves the cross-department communication density their "develop by doing" methodology depends on. Their view: in-office presence is not a policy preference but a production requirement for the methodology. For studios considering a hybrid transition, the methodology needs structural support (written briefs, decision logs, structured estimation) to compensate for reduced informal communication. [source: web_2026-05-27_ghost-ship-open-development-live-ops]

### Co-located

Ghost Ship Games (40-54 people) is the primary co-located exemplar. Their production model works reliably because physical proximity enables the cross-department communication that replaces formal process. The "develop by doing" philosophy, information-sharing stand-ups, and absence of documentation overhead all depend on this proximity. Not portable to remote teams without structural compensators. [source: web_2026-05-27_ghost-ship-open-development-live-ops]

---

## Sprint / Cycle Length Evidence

**Monthly cadence (Supergiant, 17 people):** Monthly milestones with internal phase gates at a small studio. Public Early Access commitment forced production discipline that internal deadlines alone did not — external accountability to players proved stronger than internal accountability. The monthly cycle aligns creative and technical work without heavy quarterly planning overhead. [source: web_2026-05-27_supergiant-hades-monthly-milestone-cadence]

**Two-horizon planning (Agilefall / 30+ people):** Quarterly PI planning (8-12 weeks) defines the roadmap horizon; sprint planning (1-2 weeks) handles execution. The two horizons serve different functions — quarterly prevents tactical myopia, weekly preserves responsiveness. NBI's standard recommendation for 30+ person studios. Weekly ceremony overhead: daily standup 15 min, backlog refinement 60-90 min, sprint planning 2-4h, sprint review 60-120 min, retrospective 60 min. [source: chatgpt_68fb7b4a]

**Sprint readiness indicator:** Estimation completion is a leading indicator for sprint readiness. At 65% estimation completion across a ~55-person studio (art and design complete, engineering still in progress), sprint planning was not viable. Cross-team dependency calls are the required next step before sprint work begins. [source: slack_production-council_2026-05-25_process]

**Estimation method (blind affinity planning):** Feature estimates should use blind affinity planning with min/mid/max ranges, cross-validated by a second expert, with structured discussion for discrepancies greater than five days. Individual expert estimation without cross-validation produces systematic optimism bias. Tooling (Jira) should be configured only after structure and estimates are confirmed — process precedes tooling. [source: granola_8b912e8e]

**Min+20% corrective for max-padded estimates:** When discipline estimates are systematically padded to maximum (a defence mechanism for scope cuts), the correction method is: take the minimum realistic estimate and add 20%. This produces a more honest working figure that leads engage with rather than dismiss. Per-discipline estimation sessions (not cross-team, not game-director-led) surface real estimates — people defend padding less when not in front of the game director. [source: not_zBxoXexM2abxz9]

**Why max-based planning fails:** Showing leads the maximum figures produces immediate scepticism — experienced leads recognise inflated numbers and stop trusting the entire planning exercise. Once the data is dismissed, the estimation effort is wasted. Max-based planning is not a conservative safety measure; it is a credibility failure. The working benchmark: min+15-20% is believable enough that leads engage with it as a real problem signal, without being so inflated they reject the exercise. [source: not_Vn1AdPFNDQgWTj]

**Wide-gap diagnostic:** Wide min/max gaps are not estimation errors -- they are documentation gaps. The correct response is to ask the estimator to narrate what fills the space: the answer surfaces hidden blockers, dependencies, and missing documentation. Example: a 15-day maximum estimate can collapse to 4-6 days when the specific blocker driving it (a dependency on a peer's response time) is identified and removed. The gap reveals actual risk, not estimation failure. A gap spanning 2 days to 400 days means the estimate set is worthless and requires facilitated re-estimation, not averaging. [source: not_zBxoXexM2abxz9, not_Vn1AdPFNDQgWTj]

**Prototype kits vs production kits:** Estimation plans must explicitly distinguish prototype-quality kits from production-quality kits. Prototype kits unblock bottlenecks and materially reduce estimates for dependent work. When the plan conflates the two, estimates overstate what must be completed before downstream work can begin. If this distinction is absent from the current plan, raise it before final estimates are locked. [source: not_Vn1AdPFNDQgWTj]

**Engineering is always the long pole.** In every NBI estimation engagement, engineering delivers its estimates last and these are the largest relative to original assumptions. Art and design typically complete estimation faster. Build in an explicit engineering estimation window when sequencing estimation sessions. [source: slack_production-council_2026-05-25_process]

**OKR threshold calibration:** Before any OKR programme launches, define thresholds. Validated calibration: 1 week late = green (normal variance); 4 months late = red (has consumed an unplanned quarter of spend). Two-layer status model: internal plan uses a buffer; external reporting only flags when that buffer is being consumed. Vague RAG status without defined thresholds is operationally useless — a studio can appear green until the project collapses. A dedicated PM role for loop-closing and OKR dashboard ownership frees the COO/studio director from chase work. [source: not_Ua643ajeN9C1f7]

**Vacation during crunch windows:** Summer vacation during vertical slice delivery windows is a recurring studio tension. The pragmatic approach: do not cancel vacations, but require full team availability visibility well in advance. Blind spots in June-August capacity are a structural planning failure, not an individual conduct issue. [source: slack_production-council_2026-05-25_process]

---

## Pre-Production to Production Transitions

The prototype-to-production transition is the most commonly misread milestone in NBI's client work. The diagnostic pattern repeats: studio believes it is in early or mid-production; external audit confirms pre-production.

**Diagnostic signals of false production belief:**
- Working prototype code exists but GDDs/TDDs are absent or partial (60% GDD coverage, 60% TDD coverage was the status at a studio that believed itself in production) [source: granola_4005eb22]
- Art is visually impressive but core systems — progression, economy, quest backend — are undocumented
- Design approval process is routinely bypassed; leads act on verbal direction without written sign-off [source: granola_5fdd8c18, granola_f41b006d]
- Features were built ad hoc for investor demos and need redesign for scalability before production can proceed [source: granola_f41b006d]
- Estimation has never been done systematically; first structured estimate reveals scope 2-3x larger than assumed [source: granola_ae650223]

**Pre-production exit criteria vs early production entry requirements (NBI standard):**

Pre-production exit gate:
1. Solid prototype / vertical slice completed and validated

Early production entry requirements (distinct from the exit gate above):
2. All core teams established
3. All design docs in preparation (not complete — actively in progress)
4. All TDDs in development

[source: granola_d977d66a]

**The "Beautiful Corner" (Tim Cain):** An underused step between prototype and vertical slice. A small, non-playable area built to final visual quality proves art pipeline feasibility before committing full production resources. It answers "can we actually achieve this quality at scale?" separately from "can we build this game?" — and communicates to stakeholders what the shipped product will look like. Cost: low. De-risking value: high. [source: web_2026-05-27_tim-cain-nine-stage-production]

**The Horizontal Slice** (Tim Cain): all game areas playable but unfinished, testing structural integrity and total playtime. Valuable for open-world and non-linear games where connectivity is the critical unknown. Different validation than the Vertical Slice's quality validation. [source: web_2026-05-27_tim-cain-nine-stage-production]

**Vertical Slice definition (Rami Ismail):** The Vertical Slice is not a demo. It is a pipeline validation exercise that determines whether production at the intended quality level is viable. It locks core "verbs" (mechanics) and establishes the development timeline. It should consume up to one-quarter of total development time. [source: web_2026-05-27_rami-ismail-ltpf-milestone-framework]

**VS serves three purposes (not one):** (1) Studio demo for internal alignment. (2) Pipeline validation — proves the production pipeline can deliver at quality. (3) Investor material — the primary artefact for a funding round if timed correctly. Studios that treat the VS as investor material only tend to optimise for demo polish rather than pipeline verification; studios that treat it as internal-only miss the fundraise window. [source: not_3bUR2wWsPQvo8n_scope]

**Feature tiering and the cost of late cuts:**
- T0-T2 (Ideation through Prototype): cheap to cut — the "orange zone"
- T3 (MVP): functional but rough; cuts still manageable
- Post-T3: cuts become expensive — sunk cost compounds rapidly
- T4-T7: release-ready through production-scale

Scope must be locked early in the tier system. Post-T3 scope changes require formal change requests with throwaway cost analysis. [source: granola_4e145b7b, granola_0fe5dec4]

**Scope governance — full estimate first:** No scope cuts should be discussed before a full estimate is in hand. The correct sequence when a team is over-capacity: (1) calculate total hours required; (2) evaluate outsourcing or headcount options to absorb the hours; (3) only then consider scope cuts. Discussing scope cuts before completing the estimate systematically produces under-scoped products — teams cut things they would have estimated as achievable. Ad hoc cut ideas should be submitted in writing only, not raised verbally in group sessions. [source: not_3bUR2wWsPQvo8n_scope]

**NBI 6-stage development pipeline (detailed):**
1. **Ideation** (yellow): concept, no commitment
2. **R&D** (orange): feasibility, no GDD yet
3. **GDD/Brief** (grey): design documentation in progress
4. **Prototype** (light blue): working code, not production-quality
5. **MVP** (dark blue): functional and documented, rough
6. **Player Ready** (green): production-quality, shippable

The pipeline must run in sequence. The most common anti-pattern: ideas go directly from Ideation to Prototype, bypassing GDD/Brief. Features built without documentation must be redesigned for scalability before production — doubling effective cost. [source: granola_4bc24036, granola_5fdd8c18, granola_f41b006d]

**Design lock requirement:** Any core system whose design cascades across multiple disciplines must be locked before further engineering work. The canonical example: combat design must be locked before combat engineering proceeds, because engineering work on unlocked combat designs is throwaway. This applies to any system where design changes cascade. [source: granola_5fdd8c18, granola_f41b006d]

**Three-tier change management lock system (NBI):**
1. Open iteration — full creative freedom
2. Soft lock — minor iterative changes permitted
3. Hard lock — formal change request required, with game director + production approval, throwaway cost analysis, and full impact assessment

All hard lock requests route through the game director first — no direct department-to-department requests. Retrospectives track costs of late-stage changes to calibrate future estimation. [source: granola_0fe5dec4]

**QA as gate authority:** QA should be the primary arbiter of ship-readiness at each tier gate, with authority to block gate progression if quality criteria are not met. QA estimation must use a separate format from development estimation — QA works to testable flows, not feature breakdowns. A QA pipeline requirements document should define the inputs QA needs at each tier before testing can begin. [source: granola_b82e3b84]

---

## Build Stability and Merge Cadence

Formalising a single weekly merge day (e.g., Wednesday) reduces integration conflicts by concentrating them into a predictable window — the team knows every Wednesday is the integration risk window and plans QA accordingly. This requires: (1) QA environments complete and stable before the merge day is introduced; (2) a single person owning the launcher/build process to reduce fragmentation. Without launcher ownership, multiple engineers produce parallel builds and QA cannot reliably test on a stable binary. [source: not_3bUR2wWsPQvo8n_build]

Documentation source-of-truth governance follows the same principle. At a ~70-person remote studio managing three or more documentation tools (project management, wiki, shared drives, export files), the risk of opening a new wiki platform before templating is complete is replicating the existing tool's sprawl in a new tool. The validated pattern: keep the existing tool as interim SOT; design the new tool's structure (templates, ownership model, approval per page, format standards) completely before opening access to the full team. Migration path: Markdown export from the existing tool, REST API bulk import into the new tool. [source: not_3bUR2wWsPQvo8n_docs]

---

## Live Ops Cadence

### Mobile F2P Benchmarks

Event frequency and revenue data from 2026 practitioner research [source: web_2026-06-02_liveops_event_cadence_economics]:

| Genre | Events/Month | Revenue Impact |
|---|---|---|
| Casual/Puzzle | 15-25 | ARPDAU lift +20-40% during events |
| Mid-core (RPG, Strategy) | 8-15 | Battle pass contributes 10-20% of total earnings |
| Competitive/Shooter | 4-8 | Battle pass contributes 30-40% of total earnings |
| Hybrid-casual | 4-6 | Fastest-growing segment (+75% revenue YoY) |

**Three-layer calendar:** Macro events (4-8 weeks, seasonal themes), Mid-cycle events (1-2 weeks, tournaments, limited-time modes), Micro events (24-72 hours, flash sales, weekend blitzes). All three layers should run simultaneously. The 72-hour Friday-to-Sunday micro event is the gold standard for mobile engagement. [source: web_2026-06-02_liveops_event_cadence_economics]

**Performance targets:** Event participation rate 40-60% of DAU; D7 retention post-event should not decline vs pre-event; ARPDAU lift +20-40%. If participation drops or session length shortens, reduce cadence before adding events. Consistency beats intensity. [source: web_2026-06-02_liveops_event_cadence_economics]

**Burnout prevention:** Minimum 12-24 hours between major competitive events. Predictable rhythms outperform irregular bursts. [source: web_2026-06-02_liveops_event_cadence_economics]

### PC/Console Reference (Ghost Ship, ~50 people)

A ~50-person studio sustained a 4-6 month seasonal cadence for a PC co-op game — new enemy types, equipment, missions, and cosmetics each season — for 6+ years without crunch. This requires a dedicated live ops team running in parallel with any new title development. Community feedback drives product decisions throughout development, not just at launch; this compresses the feedback loop and reduces the risk of building features nobody wants. [source: web_2026-05-27_ghost-ship-open-development-live-ops]

### MMO/Live Service at 50-Person Scale

A dedicated "Live Game" epic covering telemetry, analytics, and live ops infrastructure is required from early production — not added when the game ships. Telemetry and KPI blindness was identified as a top-10 production risk at one studio: without instrumentation, milestone health relies on subjective team belief rather than data. At a studio planning 30-70 players per zone with an MMO-lite architecture, live ops infrastructure (event tooling, seasonal content pipeline, player data systems) needs its own tracked capacity from the start. [source: granola_5fdd8c18, chatgpt_69034e5d]

---

## Continuous Improvement: Critical Stage Analysis

CSA is a feedback overlay compatible with any production methodology. It replaces traditional end-of-project postmortems with monthly feedback loops timed to milestones.

**Process:** Three questions, five items each, rated by importance (1 = most important): What went right? What went wrong? What could be improved? Timeline: responses within 3 days of milestone; compilation and team-lead meeting within 2 days of collection; full team presentation within 1 week. Total cost: 2-4 hours per cycle. All compiled documents archived centrally (unedited) for institutional memory.

**Accountability chain:** Previous milestone issues receive status updates at the subsequent CSA meeting, preventing "we identified this last month and did nothing."

**Scale threshold:** Informal feedback works below ~20 people. Above ~50, systematic feedback mechanisms are necessary because informal communication breaks down. CSA is designed from ~15 people upward and becomes essential above 50. [source: web_2026-05-27_critical-stage-analysis-hamann]

**NBI implementation note:** CSA inserts into any existing process without disrupting it. The 3-question format with forced ranking is simple enough for immediate adoption. Monthly cadence aligns naturally with sprint reviews or milestone deliveries.

---

## Studio Leadership Offsite Methodology

For studios needing a production reset or roadmap alignment, NBI has a tested 3-day offsite methodology (tested with a ~55-person studio, 8-9 senior attendees).

**Day 1 (Foundation):** 6 rules verbally committed by each attendee including the "must disagree" rule. Goal statement agreed. Workbook walkthrough covering all features. Feature sweep at 2 minutes per row with "L by default" sizing — prevents analysis paralysis on large backlogs. [source: ch_offsite_agenda_2026-04-27]

**Day 2 (Gates/GTM):** Gate-passing criteria definition for all production gates — described as "the single most leveraged hour of the offsite." Live services planning. GTM lane. Community strategy. Studio-down goals cascade. [source: ch_offsite_agenda_2026-04-27]

**Day 3 (Pipelines/Staff):** Pipeline RACI maps for each production discipline. Maintenance cadence. Staff assessment — C-level only, separate room for candour. Decisions log walkthrough. [source: ch_offsite_agenda_2026-04-27]

**Standing elements:** Parking lot wall, decisions log wall, risks log wall, daily energy check (1-10 score). North star goal printed on wall as alignment anchor.

**Pre-decisions pattern:** Binding strategic decisions (positioning, platform priority, monetisation model) laid down before the offsite to prevent relitigating. Burden of proof shifts to anyone challenging a pre-decision. [source: ch_offsite_agenda_2026-04-27]

---

## Org Design Patterns

Three structural anti-patterns in 50-person game studios, identified from org design review [source: chatgpt_6967809b]:

1. **Producer mis-parented through Finance/Ops** instead of studio delivery leader. Finance is a partner, not the chain of command. Production accountability belongs to the EP, not the CFO.
2. **CTO span too flat** with no engineering managers shown. CTO becomes a bottleneck and technical decisions queue.
3. **Tech Art/VFX in a grey zone** between Engineering and Art without explicit reporting lines. Without clarity, both departments assume the other is accountable.

**Three viable structural patterns at 50-100 people:**
- Alternative 1 (Classic Functional with strong EP hub): best for early-stage teams under 60 needing speed
- Alternative 2 (Pod/Strike Team): best for parallel workstreams with clear boundaries
- Alternative 3 (Platform + Game dual-track with shared services): appropriate only when platform is genuinely a strategic product, not just infrastructure

**Platform vs game scope:** When a studio is simultaneously building a game and a platform, the platform must have GM-style product ownership, not be treated as an ops subteam. Platform work starves the playable game arc when both compete for the same engineering and art capacity without firm slice boundaries. [source: chatgpt_69034e5d, chatgpt_6967809b]

---

## Onboarding at Scale

For a 50-100 person studio scaling rapidly through a hiring wave, onboarding infrastructure must be defined before the hires arrive.

**Role-specific machine builds:** Artist kit, producer kit, developer kit. Hardware provisioned for FTEs only; contractors provide own equipment. [source: granola_891cf074]

**Common stack by department:** General — Slack, Google Workspace, Jira, Confluence, VPN. Development — GitHub, Perforce, Azure, Redis. Art — Perforce, Maya/3D Max, Photoshop, Miro. Audio — DAW, Sound Forge, F-mod. Production — AI tools (Claude accounts), meeting notes (Granola paid), speech tools (Whisper Flow). [source: granola_891cf074]

**Probation structure:** Four-month probation with template-based 30/60/90-day check-in reviews across all roles. First-week non-negotiables: 1:1 with direct manager, department training, team introductions on day one. For art roles: Art Bible walkthrough (30-minute call) mandatory. [source: granola_891cf074]

**Early probation exit -- UK employment law grounds (anonymised pattern):**

UK employees have no right to unfair dismissal during probation. Three grounds for early termination when present:

1. **Declaration of incapacity by the employee:** A hire's own verbal statement that they cannot perform the core function of the role is the strongest possible documentation basis for early termination. It eliminates the observation period -- no extended performance management is required when the employee has declared their own incapacity. Document verbatim immediately.

2. **Competency misrepresentation at hire:** If technical competencies were misrepresented during hiring (retroactively changed job titles on professional profiles, interview claims not supported by role performance), grounds extend beyond role-fit failure to misrepresentation at hire. Substantially strengthens the termination position.

3. **Structural misalignment signals:** A hire who begins positioning for a more senior role or contradicting a peer lead within weeks of starting is not showing ambition -- it is a structural misalignment signal. Address immediately and explicitly; left unchecked it creates team confusion and undermines the existing lead's authority.

Counter-risk: very early termination (within 3 weeks of a 4-month probation) creates an argument that probation was not given proper time. Counter: the employee's own declaration of incapacity removes the need for observation. Legal alignment required before proceeding regardless.

Documentation plan: chronological evidence record -- recruitment contact, role offered and accepted, competencies claimed in interview, role requirements in signed contract, employee's own statements (verbatim). 2-3 pages of structured feedback with dates each concern was raised. Verbatim statements are the core of the record, not performance review summaries.

**Creative generalist vs technical specialist mismatch:** Wide-coverage creative designers (quest, world, narrative, management background) do not automatically transfer to technical specialist individual contributor roles. This gap does not surface in portfolio review -- it surfaces when the hire attempts the core technical function. Studios must probe this distinction during technical assessment, not assume that creative versatility implies technical depth. [source: not_HubmSolirYMTbM, not_CPGgraRzP9tMoz]

---

## Quality and Delivery Standards

**SoW report structure (NBI standard):** 15 sections including Executive Summary (top 8 risks), Deliverables and Acceptance (measurable acceptance tests, evidence requirements), Risk Register (top 20 ranked by impact x likelihood), and an Evidence Table appendix mapping every non-obvious claim to source, date, confidence, and gap. Multi-role red teaming (Production identifies two issues; Engineering identifies two) embedded in the report process, not added afterwards. Acceptance mechanics map directly to contract clauses. [source: chatgpt_6907ec33]

**Audit-driven improvement:** Numeric audit scoring drives focused improvement. A 19-dimension code audit with numeric scoring (6.6/10) followed by a structured sprint plan (6 sprints grouped by concern) followed by a re-audit (7.3/10) is a reusable consulting delivery pattern. Glen approves plans, not individual fixes. [source: handoff_2026-04-08b]

**Production data consolidation:** When consolidating multi-source plans (e.g., Miro board, engineering spreadsheet, art spreadsheet), preserve original naming from source materials — never rename stories or features. Map estimates across sources, detect duplicates, reconcile conflicts, produce a unified plan with zero data loss. Miro boards require multiple extraction passes; no single export captures everything. [source: ch_production_consolidation_spec]

**Bi-weekly update framing (output to impact):** Bi-weekly updates that show videos or demos with no context cause teams to zone out. Required reform: every update item must state what was built AND why it matters to the game. Example format: "Built memory leak pipeline monitor -- prevents a Payday 3-style crash on launch." This conditions the team to articulate impact, not just output, and creates cross-discipline awareness of what each area contributes. It also surfaces which teams struggle to connect their work to player experience -- an early diagnostic of strategic misalignment. Longer-term direction: move toward proper sprint reviews with build playthroughs and structured cross-team feedback. [source: not_VAlGkyKnb8xGcs]

**Kick-it-back documentation gate:** Engineers must not estimate or commit to sprint work without sufficient documentation. Formal rule: if a TDD cannot be written from what is provided, reject the story before sprint commitment -- not on day one of the sprint. Escalation path: flag to the technical producer, who escalates to design for prioritisation. Formalise in the project management workflow (e.g., a Jira status or ticket field) so the gate is structural, not a social norm. The distinction between pre-commitment rejection and sprint-day-one rejection matters: late rejection burns capacity planning, demoralises the team, and erodes trust in the sprint process. [source: not_VAlGkyKnb8xGcs]

**Engineering load ratio:** At a ~70-person remote MMO studio, gameplay engineering load was approximately double backend engineering load in an estimation pivot review. This ratio is useful as a capacity planning sanity check: if resource allocation does not reflect this rough ratio, either frontend features are under-estimated or backend is over-staffed relative to the production backlog. Stories exceeding 10 working days (one sprint equivalent) must be split into deliverable-sized chunks or reclassified as features or epics -- they are almost certainly mis-scoped at story level. [source: not_VAlGkyKnb8xGcs]

---

## Open Questions

1. **Sprint length for 50-100 person cross-discipline teams:** Strong evidence for monthly cadence (Supergiant, 17 people) and two-horizon planning (Agilefall standard), but no primary data on what sprint length works best at 50-100 people with complex cross-discipline dependencies. Ghost Ship operates on seasonal rather than sprint cadence.

2. **Remote estimation calibration:** Blind affinity planning produced good results at one studio. Calibration data across multiple engagements is absent. Engineering estimates are consistently the long pole — is the gap consistent enough to apply a standard correction factor?

3. **Post-T3 cut cost quantification:** The tier framework identifies T3 as the inflection point, but no quantified throwaway cost data by system type exists. Retrospective tracking has not yet produced enough cycles to calibrate numerically.

4. **Live ops cadence for PC/console MMO:** The event frequency and ARPDAU lift benchmarks are mobile-centric. Console and PC MMO or live service games likely show different participation and revenue patterns. No equivalent primary dataset exists in this bank.

5. **EP transition onboarding:** Multiple extracts reference an Executive Producer role being added to a studio that had none. The optimal onboarding sequence for this role — entering an existing team with established (informal) authority structures — is undocumented.

6. **CSA reliability above 100 people:** CSA is documented for up to ~400-person studios (Radical Entertainment) but NBI has no primary evidence from that range. Reliability at very large team sizes is unverified.

7. **Binary retro calibration:** The binary retro format is documented from a single source (MMO/AAA background). How does it compare to traditional format at scale above 25 people? No calibration data exists.

8. **OKR two-layer model investor trust:** The internal buffer vs external flag model assumes investors will trust the external signal. Does this hold once investors have experienced a studio burn through the buffer silently?

---

## Source Index

| Source ID | Type | Description |
|---|---|---|
| chatgpt_68fb7b4a | ChatGPT | AAA Agilefall Production Operating Guide — NBI standard for producer onboarding |
| chatgpt_69034e5d | ChatGPT | Production Risk Assessment: ~50-person studio with single producer (anonymised) |
| chatgpt_6907ec33 | ChatGPT | SoW Finalisation Report Structure — 15-section C-level deliverable standard |
| chatgpt_6967809b | ChatGPT | Org Design Assessment and Alternatives for game studio (anonymised) |
| chatgpt_69395da6 | ChatGPT | Milestone staging — single senior consultant capacity planning (anonymised) |
| web_2026-05-27_critical-stage-analysis-hamann | Web | CSA framework — Hamann/Koolhaus/Radical Entertainment, GDC |
| web_2026-05-27_ghost-ship-open-development-live-ops | Web | Ghost Ship Games / Deep Rock Galactic production and live-ops model |
| web_2026-05-27_rami-ismail-ltpf-milestone-framework | Web | Rami Ismail LTPF — indie milestone framework for 6-30 person teams |
| web_2026-05-27_supergiant-hades-monthly-milestone-cadence | Web | Supergiant Games / Hades — monthly milestone cadence and anti-crunch |
| web_2026-05-27_tim-cain-nine-stage-production | Web | Tim Cain 9-stage framework including Beautiful Corner |
| web_2026-06-02_liveops_event_cadence_economics | Web | Live ops event cadence and ARPDAU benchmarks (mobile F2P, 2026) |
| not_ZLLEyCfuFCgGaT | Granola | Remote communication frameworks: 7-message rule, dual-layer mood tracking, binary retros (anonymised) |
| not_Ua643ajeN9C1f7 | Granola | OKR threshold calibration and two-layer status model (anonymised) |
| not_3bUR2wWsPQvo8n_scope | Granola | Scope governance: full estimate before cuts, VS three purposes (anonymised) |
| not_3bUR2wWsPQvo8n_build | Granola | Build stability: weekly merge day, launcher ownership (anonymised) |
| not_3bUR2wWsPQvo8n_docs | Granola | Documentation SOT: template-first Confluence rollout (anonymised) |
| not_zBxoXexM2abxz9 | Granola | Estimation: min+20% corrective method, wide-gap diagnostic (anonymised) |
| granola_5fdd8c18 | Granola | Offsite Day 2 — 6-stage pipeline, epic structure, gate system (anonymised) |
| granola_4e145b7b | Granola | Offsite Day 1 — feature tiering, VS scoping, platform deprioritisation (anonymised) |
| granola_f41b006d | Granola | Offsite Day 2 Part 2 — feature status, estimates, pipeline colour-coding (anonymised) |
| granola_ae650223 | Granola | VS planning and estimation — MMO complexity, headcount calculation (anonymised) |
| granola_4bc24036 | Granola | Estimation debrief — proper pipeline vs idea-to-prototype anti-pattern (anonymised) |
| granola_4005eb22 | Granola | Studio audit, documentation completion status, staffing decisions (anonymised) |
| granola_0fe5dec4 | Granola | Character pipeline and three-tier lock system (anonymised) |
| granola_b82e3b84 | Granola | QA estimation approach and design lock process (anonymised) |
| granola_d977d66a | Granola | Pre-offsite production assessment — pre-prod vs early prod criteria (anonymised) |
| granola_080a19f8 | Granola | Product leadership — pipeline conflict, feedback systems, no-meeting day (anonymised) |
| granola_8b912e8e | Granola | VS planning and studio roadmap — estimation method, Series B requirements (anonymised) |
| granola_50612dd7 | Granola | External validation of studio transformation — art-ahead-of-systems anti-pattern (anonymised) |
| granola_891cf074 | Granola | Onboarding flow design — department tooling, probation structure (anonymised) |
| granola_c3cc29b7 | Granola | Executive meeting — hiring pipeline, technical debt, offsite prep (anonymised) |
| granola_e5678c68 | Granola | Executive meeting — estimation sessions, senior hire offers (anonymised) |
| granola_c3205cb8 | Granola | Executive meeting — VS Excel, hiring wave decisions (anonymised) |
| ch_offsite_agenda_2026-04-27 | OneDrive | 3-day studio leadership offsite methodology (anonymised) |
| ch_production_consolidation_spec | OneDrive | Production data consolidation methodology — 3 sources to 1 plan (anonymised) |
| slack_production-council_2026-05-25_process | Slack | Decision process codification and estimation status (anonymised) |
| handoff_2026-04-08b | Claude session | Audit-driven improvement: numeric score + sprint plan + re-score pattern |
| granola_c105bb66 | Granola | RESTRICTED — not included |
| not_Vn1AdPFNDQgWTj | Granola | Min/max estimation theory: why max-based planning destroys credibility; prototype vs production kits (anonymised) |
| not_VAlGkyKnb8xGcs | Granola | Engineering visibility: bi-weekly framing reform, kick-it-back gate, gameplay 2x backend load (anonymised) |
| not_HubmSolirYMTbM, not_CPGgraRzP9tMoz | Granola | Early probation exit: declaration of incapacity grounds, documentation plan, creative vs technical mismatch (anonymised) |
