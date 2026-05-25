# Client: Couch Heroes -- Knowledge Bank

**Last compiled:** 2026-05-25
**Sources:** 8 ChatGPT extracts (July 2025 -- January 2026)
**Role associations:** producer, production_consultant, head_of_people

---

## Executive Summary

Couch Heroes (CH Game Development UK Ltd) is a pre-revenue AA game studio with approximately 55 employees across the UK and Greece, building an MMO-lite platform game. NBI's engagement spans production methodology, org design, executive coaching, hiring, and compensation -- making CH the deepest and most multifaceted client relationship. Key risks centre on a single-producer bottleneck, product-platform scope coupling, and C-level leadership with no prior game development experience. The engagement began with a seven-area SoW in July 2025 and has expanded through multiple workstreams including CTO hiring, executive coaching, compensation benchmarking, milestone staging, and org redesign.

---

## Company Profile

- **Legal entity:** CH Game Development UK Ltd
- **Headcount:** ~55 employees (UK + Greece)
- **Working model:** 100% remote
- **Key locations:** London (leadership, London-weighted salaries), Athens (development, Greek salaries on 14-salary basis)
- **Funding status:** Pre-revenue
- **Key people:** Vardis (CEO), Aris (COO), Dino (Head of Strategy / General Counsel)
- **Solo HR:** Lorenza (handles all people operations alone)
[source: chatgpt_68fbb0a4, chatgpt_68821eb7]

---

## Key People and Dynamics

### Leadership

- **Vardis (CEO):** Final decision authority. Sets client priority on hiring and org chart work. [source: chatgpt_68821eb7]
- **Aris (COO):** Operational lead. [source: chatgpt_68821eb7]
- **Dino (Head of Strategy):** Subject of the 90-day executive coaching programme. Coaching areas: constructive conflict in roadmap forums, inquiry over certainty in partner decisions, ownership and repair when missteps affect other disciplines, remit discipline via agreed governance, perspective-taking. [source: chatgpt_68fa2c70]
- **Lorenza:** Solo HR function. Has a client-scoped user account on WorkSage for CH data access. [source: handoff_2026-04-16b_full_day]

### Engineering Team

Junior engineering staff: 4 backend developers, 5 client developers. C-level leaders have never built a game -- which makes the CTO hire critical as a translator of risk into decisions. [source: chatgpt_69437062]

### Key Dynamic

Non-games C-level leadership managing a junior engineering team building an ambitious live-service game. This creates a gap where technical risk is not being translated into business decisions. The CTO must fill this gap by producing 1-page decision memos with options, tradeoffs, cost, and player impact. [source: chatgpt_69437062]

---

## Their Game(s)

- **Genre:** MMO-lite platform game
- **Technical shape:** UE5 client, dedicated servers, patcher, microservices
- **Player capacity:** 70-100 players per shard
- **Features:** Cross-game entitlements, multi-mode gameplay, cross-play targeted
- **Key technical challenges:** Server topology (sharding, layering, instancing), entitlement systems that must function as financial ledgers (idempotent grants/revokes with audit trails), multi-mode framework that prevents "three games" sprawl
[source: chatgpt_69437062, chatgpt_69034e5d]

---

## Production Approach

### Current State (as assessed)

Fifteen production risks identified [source: chatgpt_69034e5d]:

1. **Single-producer bottleneck** -- one producer cannot sustainably coordinate game content, platform work, backend services, build pipelines, playtests, partners, and vendors simultaneously
2. **Product-platform scope coupling** -- game and platform compete for same capacity without hard slice boundaries; platform work starves playable arc
3. **Integration and release instability** -- UE5 client, servers, patcher, and microservices create complex integration surfaces
4. **Server topology uncertainty** -- sharding, layering, instancing create unpredictable CCU distribution
5. **Cross-discipline content pipeline fragility**
6. **Implicit dependency mapping** -- discovered late
7. **QA under-resourcing** -- no test matrices
8. **Telemetry and KPI blindness**
9. **Partner integration volatility**
10. **Cross-play compliance deferral risk**

Additional risks: milestone optics vs reality drift (capture builds diverge from true build health), decision rights ambiguity causing re-litigation of approved work and stealth branches. [source: chatgpt_69034e5d]

### Org Structure Issues

Five structural problems in the org chart [source: chatgpt_6967809b]:

- (A) Producer mis-parented through Finance/Ops instead of studio delivery leader; EP disconnected from core build
- (B) Platform treated as ops subteam when it should have GM-style product ownership
- (C) CTO span too flat with no engineering managers; CTO becomes bottleneck
- (D) Tech Art/VFX in grey zone between Engineering and Art
- (E) Content disciplines (sound, writing) not cleanly grouped under Game Director

Three alternatives proposed: (1) Classic Functional with strong EP hub (best under 60 people), (2) Pod/Strike Team model (best for parallel workstreams), (3) Platform+Game dual-track with shared services (best when platform is genuinely strategic). [source: chatgpt_6967809b]

---

## Current Engagement

### Initial Scope (July 2025)

Seven intervention areas [source: chatgpt_68821eb7]:

1. MVP delivery assessment (sprint review, feature readiness audit, roadmap with risk flags)
2. Production methodology review and optimisation
3. Technical assessment of GDD-to-implementation fit
4. Leadership engagement below C-level (diagnose behavioural friction)
5. Communication pathway mapping and improvement
6. Role alignment and talent fit
7. Process efficiency across game dev, business, and people operations

### Delivered Work

**Pricing:** Task One (tech stack/pipelines audit, 3 stakeholder sessions, 2-3 weeks) at GBP9,240 fixed fee. Task Two (MVP tech roadmap and game fit audit, 3 stakeholder sessions, KPI tree, 15-20 slide readout, 2-3 weeks) at GBP7,465.50 fixed fee. [source: chatgpt_69025031]

**Acceptance terms:** 5 Business Days to accept or provide consolidated non-conformity list; contractor remediates in 5 Business Days. Payment 30 days from valid invoice after Acceptance. Key personnel clause: Glen Pryer as Primary Advisor, substitution requires prior written consent. [source: chatgpt_69025031]

### Active Workstreams

- **Milestone staging:** 5 milestones (MS1-MS5) assessed for realism against single senior consultant capacity. Client priority: hiring and org chart work first. [source: chatgpt_69395da6]
- **Executive coaching (Dino):** 90-day programme with weekly 45-min 1:1s, fortnightly CEO sponsor sync, two live observations per month. Instrumented with decision latency, reopen rate, escalation count, artefact completeness. [source: chatgpt_68fa2c70]
- **CTO hiring:** Detailed profile for hybrid Live-Service Game + Platform CTO. Must-haves: shipped online sessioned game, live economy experience, service contracts with schema versioning, ability to uplift junior teams. Interview questions specified. [source: chatgpt_69437062]
- **Compensation benchmarking:** Four-quartile UK and Greece salary bands for C-level roles. Philosophy: cash lean equity forward, local-market anchoring, stage-correct milestone-based variable pay. [source: chatgpt_68fbb0a4]
- **H&S policy:** Delivered May 2026 (from memory files, not from these extracts)
- **Work plan consolidation:** v15 Excel consolidating 50-person studio's 3-week planning from 3 sources (from memory files)

---

## Decisions Made

1. **Compensation philosophy:** Cash lean, equity forward. Base at Q2-Q3 locally. Variable pay tied to binary or tiered milestones (funding, vertical slice, soft-launch KPIs) until revenue. [source: chatgpt_68fbb0a4]
2. **Local-market anchoring:** UK and Greece pay bands set independently using local benchmarks, not a single global rate. Greece executive salaries run 40-60% below London equivalents at comparable quartiles. [source: chatgpt_68fbb0a4]
3. **Coaching must be instrumented:** Measurable operational metrics (decision latency, reopen rate, escalation count), not vibe-based assessment. Acceptance tests must be observable: three high-stakes disagreements resolved without follow-on escalation, two written post-mortems naming personal error, zero remit bypasses over eight weeks. [source: chatgpt_68fa2c70]
4. **Problems first, mitigations later:** Glen requested the production risk assessment as problems only, no mitigations. Diagnostic before prescription. [source: chatgpt_69034e5d]
5. **Production reports require evidence tables:** Every non-obvious claim must map to source, date, confidence, and gap. Multi-role red teaming embedded in the process. [source: chatgpt_6907ec33]
6. **CTO must be a translator:** With junior staff, CTO output is leads, standards, and predictable delivery -- not hero coding. 1-page decision memos with options, tradeoffs, cost, and player impact. [source: chatgpt_69437062]
7. **Game Director owns full player-facing content stack** (design, narrative, audio, UX content). Production accountable to EP, not Finance. [source: chatgpt_6967809b]

---

## Open Items

- **CTO search status:** Profile defined; unclear whether hiring is active or paused.
- **Org redesign adoption:** Three alternatives proposed; which was selected is not recorded in extracts.
- **Coaching programme completion:** 90-day programme designed; no completion data or outcome metrics available.
- **MS1-MS5 delivery status:** Milestone staging assessed but no delivery outcomes recorded.
- **SoW renewal:** Initial SoW valid through 31 Dec 2025; current contractual status unclear.
- **Platform vs game boundary:** The core tension (platform starving playable arc) has been diagnosed but resolution approach is not documented.

---

## Source Index

| Extract ID | Date | Key Topics |
|---|---|---|
| chatgpt_68821eb7 | 2025-07-24 | Initial 7-area SoW scope |
| chatgpt_69025031 | 2025-10-29 | SoW pricing, acceptance terms, risk register |
| chatgpt_69034e5d | 2025-10-30 | 15 production risks, single-producer bottleneck |
| chatgpt_68fa2c70 | 2025-10-23 | Executive coaching framework for Dino |
| chatgpt_68fbb0a4 | 2025-10-24 | UK/Greece executive compensation benchmarks |
| chatgpt_6907ec33 | 2025-11-02 | SoW report structure, evidence tables |
| chatgpt_69395da6 | 2025-12-10 | Milestone staging assessment |
| chatgpt_69437062 | 2025-12-18 | CTO profile for MMO-lite studio |
| chatgpt_6967809b | 2026-01-14 | Org design assessment, 3 alternative structures |
