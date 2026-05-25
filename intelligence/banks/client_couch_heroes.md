# Client: Couch Heroes -- Knowledge Bank

**Last compiled:** 2026-05-25
**Sources:** 19 extracts (8 ChatGPT, 1 Downloads, 10 OneDrive) -- July 2025 to May 2026
**Role associations:** producer, production_consultant, head_of_people

---

## Executive Summary

Couch Heroes (CH Game Development UK Ltd) is a pre-revenue AA game studio with approximately 55 employees across the UK and Greece, building a byte-punk cosy MMORPG with F2P cosmetic monetisation. NBI's engagement is the deepest client relationship, spanning production methodology, org design, executive coaching, hiring, compensation, leadership offsite facilitation, legal compliance, and GTM strategy. Glen operates as fractional CPO, overseeing both product (marketing, BD, web) and production (via Exec Producer) functions. The studio's core differentiator is Partner Portals -- diegetic cross-game integrations where other studios' games appear as physical in-world objects. Six binding strategic pre-decisions were laid down at the April 2026 offsite: F2P cosmetic, self-publish, closed beta, separate studio/game names, unified cross-play account, and a 12-month goal of institutional funding + vertical slice + sustainable cadence + core hiring.

---

## Company Profile

- **Legal entity:** CH Game Development UK Ltd
- **Headcount:** ~55 employees (UK + Greece)
- **Working model:** 100% remote
- **Key locations:** London (leadership, London-weighted salaries), Athens (development, Greek salaries on 14-salary basis)
- **Funding status:** Pre-revenue; active fundraising preparation (VDR, Due Diligence Checklist, external legal counsel from Saybrook Legal engaged April 2026)
- **UK entity setup:** NBI delivered compliance guidance (Employers' Liability Insurance mandatory min GBP5M cover, workplace pension auto-enrolment) for Greek-headquartered studio establishing UK company [source: ch_uk_company_guidance_2026-03-26]
[source: chatgpt_68fbb0a4, chatgpt_68821eb7, ch_downloads_recent_2026-05]

---

## Key People and Dynamics

### Leadership

- **Vardis (CEO):** Final decision authority. Sets client priority on hiring and org chart work. Facilitation watch-for: converges too quickly. [source: chatgpt_68821eb7, ch_offsite_working_doc_2026-04-27]
- **Aris (COO/CEO/CD):** Operational lead. Pre-offsite org chart shows Aris as CEO/CD column. Facilitation watch-for: "let's discuss offline" reflex. [source: chatgpt_68821eb7, ch_org_structure_2026-04-26, ch_offsite_working_doc_2026-04-27]
- **Dino (Head of Strategy / General Counsel):** Subject of 90-day executive coaching programme. Legal Verticals document suggests structuring the legal function. Coaching areas: constructive conflict, inquiry over certainty, ownership and repair, remit discipline, perspective-taking. [source: chatgpt_68fa2c70, ch_downloads_recent_2026-05]
- **Glen (CPO, fractional):** Oversees product (marketing, BD, web) and production (via Exec Producer). Primary offsite facilitator. All outbound external messages require Glen's approval. [source: ch_org_structure_2026-04-26, ch_studio_business_items_2026-04]
- **Lorenza:** Solo HR function. Has a client-scoped WorkSage user account. [source: handoff_2026-04-16b_full_day]
- **Graham:** Incoming Exec Producer (~May 18 2026 start). Reports to CPO (Glen). Oversees four discipline tracks (QA, Audio, Art, Design) each with embedded Producer. [source: ch_org_structure_2026-04-26]
- **Robin:** Game Director. Attended offsite. [source: ch_offsite_pre_decisions_2026-04-27]
- **Valeria:** Head of Production. Attended offsite. [source: ch_offsite_pre_decisions_2026-04-27]
- **Mustafa:** Head of Tech. Attended offsite remotely (visa issues). Facilitation watch-for: defaults to silent observer on dial-in. [source: ch_offsite_pre_decisions_2026-04-27, ch_offsite_working_doc_2026-04-27]
- **David:** Director of Art. Attended offsite. [source: ch_offsite_pre_decisions_2026-04-27]

### Engineering Team

Junior engineering staff: 4 backend developers, 5 client developers. C-level leaders have never built a game -- CTO hire is critical as translator of risk into decisions. [source: chatgpt_69437062]

### Key Dynamic

Non-games C-level leadership managing a junior engineering team building an ambitious live-service game. Historical pattern: "more excitement than cadence" -- momentum-driven rather than structure-driven delivery. The CTO must fill the technical risk translation gap. [source: chatgpt_69437062, ch_offsite_pre_read_2026-04-27]

---

## Their Game(s)

### Core Identity

- **Genre:** Byte-punk cosy MMORPG (not MMO-lite -- refined classification)
- **Monetisation:** F2P with cosmetic-only monetisation (gear has no stats; cosmetics are aspirational currency)
- **Technical shape:** UE5 client, dedicated servers, patcher, microservices
- **Player capacity:** 70-100 players per shard
- **Features:** Cross-game entitlements, multi-mode gameplay, cross-play PC+mobile at launch (console when first-party allows)
- **Unified account:** Mandatory. Platform is first-class product surface, not companion app.
[source: chatgpt_69437062, ch_offsite_pre_decisions_2026-04-27]

### Partner Portals (Core Differentiator)

Other studios' games appear as physical in-world objects (dimensional rifts, arcade cabinets, shops) that players walk up to and step through. Not a launcher or menu. The byte-punk aesthetic provides lore justification (world built on AI proving ground, dimensional fabric is inherently thin). Six portal types: Dimensional Portal (10-60 min), Arcade Cabinet (2-15 min), Partner Shop (1-5 min), User Space Portal (variable), Guild Portal (variable), Hidden Rift (discovery-first). Revenue model: partner-themed cosmetics, portal reputation, portal mastery marks. Key constraints: portals must be diegetic (never menu entries), voluntary (never required for main progression), quality-gated. Partner content keeps its own art style; CH frames but does not override. Reference points: Roblox (transitions), Kingdom Hearts (IP respect), Animal Crossing (social visiting). [source: ch_partner_portals_creative_brief_2026-05-11]

### Feature Classification

1,203 items classified across type (System/Feature/Content/Platform/LiveService) and layer (Foundation/Core/Feature/Presentation/Polish). 180 items (15%) flagged as low-confidence needing human review. Major epics: Player Progression, World Systems, Combat, User Space, Items and Inventory, Quest System, Social and Multiplayer, UX/UI, Platform. [source: ch_game_classification_2026-04]

---

## Production Approach

### Production Risks (15 Identified)

1. Single-producer bottleneck -- one producer cannot coordinate all workstreams
2. Product-platform scope coupling -- game and platform compete for same capacity
3. Integration and release instability -- UE5 + servers + patcher + microservices
4. Server topology uncertainty -- sharding, layering, instancing
5. Cross-discipline content pipeline fragility
6. Implicit dependency mapping -- discovered late
7. QA under-resourcing -- no test matrices
8. Telemetry and KPI blindness
9. Partner integration volatility
10. Cross-play compliance deferral risk
11. Milestone optics vs reality drift (capture builds diverge from build health)
12. Decision rights ambiguity causing re-litigation and stealth branches
[source: chatgpt_69034e5d]

### Org Structure

Three-column C-suite: CEO/CD (Aris), COO, CPO (Glen, fractional), CTO (vacant). Producer overlay is embedded in each discipline, not a separate production department. Five structural anti-patterns identified: (A) Producer mis-parented through Finance/Ops, (B) Platform treated as ops subteam, (C) CTO span too flat, (D) Tech Art/VFX in grey zone, (E) Content disciplines not grouped under Game Director. Three alternatives proposed: Classic Functional with strong EP hub (best under 60), Pod/Strike Team (parallel workstreams), Platform+Game dual-track (when platform is genuinely strategic). [source: chatgpt_6967809b, ch_org_structure_2026-04-26]

### Production Data Consolidation

3-week production planning consolidated from three separate sources (Design xlsx, Engineering xlsx, Miro board) into unified work plan (v15 Excel). Source data naming is sacrosanct -- merge new data into existing names, never rewrite. Miro board extraction required multiple passes with different strategies. Zero data loss requirement across all sources. [source: ch_production_consolidation_spec]

---

## Current Engagement

### Initial Scope (July 2025)

Seven intervention areas: (1) MVP delivery assessment, (2) Production methodology review, (3) Technical assessment of GDD-to-implementation fit, (4) Leadership engagement below C-level, (5) Communication pathway mapping, (6) Role alignment and talent fit, (7) Process efficiency. [source: chatgpt_68821eb7]

### Pricing

- Task One (tech stack audit): GBP9,240 fixed fee
- Task Two (MVP tech roadmap): GBP7,465.50 fixed fee
- Key Personnel clause: Glen Pryer as Primary Advisor
[source: chatgpt_69025031]

### Active Workstreams

- **Fractional CPO:** Glen is embedded as CPO overseeing product and production [source: ch_org_structure_2026-04-26]
- **Leadership offsite:** 3-day offsite (Apr 27-30, London) designed and facilitated by Glen with pre-decisions, facilitation playbook, and workbook (2,216 items across 7+AI projects) [source: ch_offsite_agenda_2026-04-27]
- **GTM and BD backlog:** 60+ item backlog covering 4 player ICPs, audience research programme, 14-title competitor map, publisher longlist (40 publishers, scored to shortlist of 10), platform onboarding plan [source: ch_studio_business_items_2026-04]
- **Production consolidation:** v15 work plan from 3 sources, 50-person studio [source: ch_production_consolidation_spec]
- **Executive coaching (Dino):** 90-day programme with measurable operational metrics [source: chatgpt_68fa2c70]
- **CTO hiring:** Profile defined for hybrid Live-Service Game + Platform CTO. Search restarted Q1 2026. Interview questions specified. [source: chatgpt_69437062, ch_org_structure_2026-04-26]
- **Compensation benchmarking:** Four-quartile UK and Greece salary bands [source: chatgpt_68fbb0a4]
- **H&S policy:** Delivered May 2026 [source: memory files]
- **UK compliance:** EL insurance and workplace pension guidance delivered [source: ch_uk_company_guidance_2026-03-26]
- **Legal structuring:** Saybrook Legal engaged April 2026; Dino working on Legal Verticals [source: ch_downloads_recent_2026-05]

---

## Decisions Made

### Strategic Pre-Decisions (Offsite Apr 2026)

1. **F2P cosmetic monetisation.** Gear has no stats; cosmetics are aspirational currency. Business model aligns with design intent. [source: ch_offsite_pre_decisions_2026-04-27]
2. **Self-publish core distribution.** Targeted capability partnerships only. Equity raise makes publisher capital redundant. Preserves partner-game integration freedom. [source: ch_offsite_pre_decisions_2026-04-27]
3. **Closed beta at vertical slice.** No public early access. Founder's Pack carries beta access as conversion path. NDA-light controls for partner reveals. [source: ch_offsite_pre_decisions_2026-04-27]
4. **Studio name and game name are separate.** Protects multi-game identity and investor narrative. [source: ch_offsite_pre_decisions_2026-04-27]
5. **Unified cross-play account.** PC+mobile at launch, console when first-party allows. Platform is first-class product surface. [source: ch_offsite_pre_decisions_2026-04-27]
6. **12-month goal:** Close institutional funding + ship vertical slice + sustainable production cadence + core hiring. [source: ch_offsite_pre_decisions_2026-04-27]

### Operational Decisions

7. **Compensation philosophy:** Cash lean, equity forward. Base at Q2-Q3 locally. Variable pay tied to milestones until revenue. [source: chatgpt_68fbb0a4]
8. **Local-market anchoring:** UK and Greece pay bands set independently. Greece executive salaries 40-60% below London at comparable quartiles. [source: chatgpt_68fbb0a4]
9. **Coaching must be instrumented:** Measurable operational metrics (decision latency, reopen rate, escalation count). [source: chatgpt_68fa2c70]
10. **Problems first, mitigations later.** Diagnostic before prescription. [source: chatgpt_69034e5d]
11. **Game Director owns full player-facing content stack.** Production accountable to EP, not Finance. [source: chatgpt_6967809b]
12. **Explorer is primary persona.** Killer is "supported not primary" to bound PvP design. [source: ch_studio_business_items_2026-04]
13. **All outbound messages require Glen's approval.** [source: ch_studio_business_items_2026-04]
14. **Term sheet red lines documented before publisher outreach.** Recoupment caps, IP retention, sequel rights, key person. [source: ch_studio_business_items_2026-04]
15. **Portals are content, never advertisements.** Players want to enter, not feel sold to. [source: ch_partner_portals_creative_brief_2026-05-11]

---

## Open Items

- **CTO search status:** Profile defined, search restarted Q1 2026. Active (interview questions merged, candidate tracker present). [source: ch_downloads_recent_2026-05]
- **Org redesign adoption:** Three alternatives proposed at offsite; which was selected not yet recorded.
- **Coaching programme completion:** 90-day programme designed; no outcome data.
- **Offsite outcomes:** Feature sweep, gate criteria, pipeline RACI, staff assessment -- results not yet documented in extracts.
- **SoW renewal:** Initial SoW valid through 31 Dec 2025; current contractual status unclear.
- **Platform vs game boundary:** Core tension diagnosed but resolution approach not documented.
- **Partner Portal open questions:** 7 creative questions including corruption interaction, portal permanence when deals end, User Space limits (recommended 3-5). [source: ch_partner_portals_creative_brief_2026-05-11]
- **Fundraising timeline:** VDR and due diligence materials being prepared; no close date documented.

---

## Source Index

| Extract ID | Date | Key Topics |
|---|---|---|
| chatgpt_68821eb7 | 2025-07-24 | Initial 7-area SoW scope |
| chatgpt_69025031 | 2025-10-29 | SoW pricing, acceptance terms |
| chatgpt_69034e5d | 2025-10-30 | 15 production risks |
| chatgpt_68fa2c70 | 2025-10-23 | Executive coaching framework |
| chatgpt_68fbb0a4 | 2025-10-24 | UK/Greece compensation benchmarks |
| chatgpt_6907ec33 | 2025-11-02 | SoW report structure |
| chatgpt_69395da6 | 2025-12-10 | Milestone staging assessment |
| chatgpt_69437062 | 2025-12-18 | CTO profile |
| chatgpt_6967809b | 2026-01-14 | Org design alternatives |
| ch_offsite_pre_decisions_2026-04-27 | 2026-04-27 | 6 strategic pre-decisions |
| ch_offsite_agenda_2026-04-27 | 2026-04-27 | 3-day offsite methodology |
| ch_offsite_working_doc_2026-04-27 | 2026-04-27 | Facilitation playbook |
| ch_partner_portals_creative_brief_2026-05-11 | 2026-05-11 | Partner Portals design |
| ch_org_structure_2026-04-26 | 2026-04-26 | Org structure pre-offsite |
| ch_game_classification_2026-04 | 2026-04 | 1,203-item feature classification |
| ch_studio_business_items_2026-04 | 2026-04 | GTM and BD backlog |
| ch_uk_company_guidance_2026-03-26 | 2026-03-26 | UK compliance guidance |
| ch_production_consolidation_spec | 2026-05 | Production data consolidation |
| ch_downloads_recent_2026-05 | 2026-05 | Document inventory (hiring, legal, CTO) |
