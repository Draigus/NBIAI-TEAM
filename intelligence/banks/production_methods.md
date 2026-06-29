---
title: Production Methods
slug: production_methods
last_compiled: 2026-06-26
extract_count: 94
role_associations: [producer, production_consultant]
description: How game studios organise and deliver work. Frameworks, methodologies, milestone structures, and real-world outcomes from studios of 20-100 people.
---

# Production Methods

## Executive Summary

This bank covers how game studios in the 10-100 person range organise production: milestone frameworks, sprint cadence, live-ops scheduling, pre-production gates, org design, estimation methodology, remote communication, creative documentation, and meeting structures. Primary evidence is a deep NBI engagement with a ~55-70 person remote MMO studio (April-June 2026), supplemented by published frameworks (Tim Cain, Rami Ismail, Supergiant, Ghost Ship) and NBI's consulting standards. The bank is strongest on the 40-70 person studio navigating the prototype-to-production transition; live ops cadence remains mobile-benchmark-heavy with limited PC/console primary data. The recurring finding across 94 extracts: studios almost universally believe they are further along in production than they are -- documentation gaps, not working code, define production maturity; and live service commercial models require explicit leadership alignment from day one, not after producers arrive. Additions through 2026-06-26 include: statistical evidence from published research (Shirinian 71% scope-failure rate; Game Outcomes Project design risk management 0.57 as top factor, methodology 0.29); tiered automated QA pipeline and contracted QA team model with review/playtest build separation; two historical failure case studies; estimate inflation control and vertical slice staffing efficiency-rating methodology; art style lock as a milestone prerequisite; multi-discipline definition of done under Game Director ownership; four-layer studio meeting structure; 80/20 mid/senior staffing target; and contractor IR35 compliance -- day rate gross-up, label hygiene, and multi-jurisdiction exposure.

---

## Framework Comparison

| Framework | Team Size Sweet Spot | Remote-Friendly | Game-Specific Adaptations | Known Outcomes |
|---|---|---|---|---|
| Agilefall (hybrid Agile + stage-gate) | 30-200 | Y | Gates on top (funding/milestone events); sprints underneath; playable vertical slice exits pre-prod | NBI standard for client studio onboarding [source: chatgpt_68fb7b4a] |
| NBI 6-Stage Pipeline | 30-100 | Y | Ideation > R&D > GDD/Brief > Prototype > MVP > Player Ready; colour-coded in PM tool | Adopted at ~55-person MMO studio after deep offsite [source: granola_5fdd8c18] |
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

Single-producer configurations become a serious risk at this scale. Remediation: an Executive Producer overseeing four discipline tracks (QA, Audio, Art, Design), each with an embedded producer. Agilefall becomes appropriate at 30+: gates provide approval checkpoints; sprints enable iterative delivery. [source: chatgpt_69034e5d, chatgpt_68fb7b4a]

### 50-100 People

NBI's primary reference engagement is a ~55-70 person remote MMO studio. Key findings apply broadly.

**Production maturity is almost always lower than the team believes.** Art significantly ahead of core systems creates an "illusion of a full game." Working code without documentation is not production-ready. [source: granola_50612dd7, granola_5fdd8c18]

**Feature estimates by discipline (MMO-lite, calibration):** Player progression to MVP: 60d designer/20d eng/20d UI. Skill system: 90d designer/30d eng/25d UI. Partner portal: 60d engineering. New creature: 45d total. Capacity baseline: 20 workdays/month per person. [source: granola_ae650223, granola_5fdd8c18]

**Governance:** Creative Director signals intent > Design designs > Team feeds back > Game Director considers > three-party approval (Game Director + Executive Producer + Creative Director) before any commitment. Bypassed approval chains are the most common source of rework at this size. [source: slack_production-council_2026-05-25_process]

---

## By Working Model

### Fully Remote

Remote-first production requires more formal async communication. Three estimation spreadsheets maintained independently at a ~55-person remote studio required manual merge before structured sessions were introduced. Written decision records are load-bearing -- a running decisions log prevents re-litigation of approved work; without it, stealth branches proliferate. Anonymised feedback channels (per-department Google Forms) surface negative sentiment before escalation. No-meeting days (one per week) protect deep work. [source: chatgpt_69034e5d, granola_080a19f8]

Chain-of-command bypass is a critical remote failure mode. Slack messages are discoverable via DSAR in UK employment contexts -- informal HR commentary is fully retrievable in an employment dispute. HoDs require explicit briefing that Slack is not a private communication tool. [source: not_4nWBkRC4r7TVRQ_dsar]

**Remote communication patterns (battle-tested):** 7-message rule -- the 8th message triggers a Zoom, automatically. Dual-layer mood tracking: team health and project confidence as separate signals. Two-standup model for distributed teams: two time-zone-spanning standups, each with 10-15 minutes of open chat before agenda. Binary retrospective: bi-weekly, yes/no responses only, groups of 3-5 to prevent groupthink. [source: not_ZLLEyCfuFCgGaT]

**Junior hire support in remote studios:** Ambient learning is absent remotely -- osmosis, overhearing, and watching seniors work all fail. Every learning pathway that happens organically in an office must be engineered deliberately. Minimum viable support per junior hire: dedicated scheduled training hours/week + separate mentoring hours (1:1 with a senior) + senior buddy for ad hoc questions + director check-ins every 3 weeks. Target team shape: ~3 veterans, 2 mids, 1 junior. A team of 6 juniors with one veteran creates a bottleneck; the support policy only functions at low junior density. Hire veterans who can do three things, not one. [source: 2026-06-22_junior-hire-policy-remote-studio]

### Hybrid and Co-located

Ghost Ship's model (in-office with WFH Fridays and two additional WFH days/month) preserves cross-department communication density their "develop by doing" methodology requires. Not portable to remote without structural compensators (written briefs, decision logs, structured estimation). [source: web_2026-05-27_ghost-ship-open-development-live-ops]

**Motion Twin flat co-op ceiling:** Motion Twin (Bordeaux) is an 11-person workers' co-operative deliberately kept below 15, with equal base salary and full-team consensus on strategic decisions. Dead Cells shipped after 18 months early access (planned 12). Biggest explicit production mistake: simultaneous console and PC launch -- console certification requires working backwards at least 6 months from ship date. The flat model has a documented upper ceiling of approximately 10-15 people; beyond that, consensus-based decision-making degrades production velocity faster than cultural benefits compensate, because approved decisions can be re-litigated at any point ("permanent battles"). When Dead Cells handed off to Evil Empire (70+ people, traditional hierarchy), the structured organisation generated approximately 9x more commercial volume on the same IP -- a natural experiment contrasting the two models at scale. Early access planned duration should commit to the maximum expected, not the minimum. [source: web_2026-06-24_motion-twin-flat-coop-production-ceiling]

---

## Sprint / Cycle Length Evidence

**Monthly cadence (Supergiant, 17 people):** Public Early Access commitment forced production discipline that internal deadlines alone did not. [source: web_2026-05-27_supergiant-hades-monthly-milestone-cadence]

**Two-horizon planning (Agilefall / 30+ people):** Quarterly PI planning (8-12 weeks) defines roadmap; sprint planning (1-2 weeks) handles execution. Weekly ceremony overhead: daily standup 15 min, backlog refinement 60-90 min, sprint planning 2-4h, sprint review 60-120 min, retrospective 60 min. [source: chatgpt_68fb7b4a]

**Estimation method (blind affinity planning):** Feature estimates use blind affinity planning with min/mid/max ranges, cross-validated by a second expert, with structured discussion for discrepancies greater than 5 days. Tooling (Jira) configured only after structure and estimates are confirmed. [source: granola_8b912e8e]

**Min+20% corrective for max-padded estimates:** When estimates are systematically padded to maximum, take the minimum realistic estimate and add 20%. Max-based planning is a credibility failure: experienced leads recognise inflated numbers and stop trusting the exercise. Wide min/max gaps are documentation gaps, not estimation errors -- ask the estimator to narrate what fills the space. A 2-day to 400-day gap means the estimate set is worthless and requires facilitated re-estimation. Plans must explicitly distinguish prototype kits from production kits; prototype kits materially reduce downstream estimates. [source: not_zBxoXexM2abxz9, not_Vn1AdPFNDQgWTj]

**Engineering is always the long pole.** In every NBI estimation engagement, engineering delivers estimates last and these are the largest relative to original assumptions. [source: slack_production-council_2026-05-25_process]

**Estimate inflation control -- "shenanigans" culture and scope capitulation prevention:** Estimates balloon when unchallenged -- one lead's vertical slice estimate went from 1,600 days to 800 days to approximately 3 months when challenged in sequence. Art estimates default to "fully shipped" quality rather than prototype tiers, inflating all downstream planning. Fix: codify tier language (e.g. tier 2/3/4) agreed across all disciplines so "done" means the same thing everywhere. "Shenanigans" adopted as the call-out word for inflated claims -- a non-confrontational signal that forces justification without personal conflict. Scope capitulation: design intent is quietly altered in one-off conversations without leadership visibility. Fix: state the constraint explicitly at the point of pressure ("I need another month if you want X") so it can be escalated and either rejected or accepted. A shared document logging scope "flashpoints" gives leadership a monitoring layer. Estimate challenges must be sequential and persistent, not one-time. [source: 2026-06-24_estimate-challenge-scope-discipline]

**Vertical slice staffing model -- efficiency ratings and estimation calibration:** A ~65-person studio built a staffing model for a VS milestone. Model structure: hours per role ÷ 20 (working days/month) ÷ effective headcount = months required or additional hires needed. Efficiency ratings assigned by leads per person (0-100%). Common calibration problems: (1) leads set ratings optimistically for people with demonstrably low output; (2) estimates made before a definition of done existed -- teams defaulted to estimating for full launch quality; (3) wide estimate ranges (e.g. 155 days for a zone, suspected 20-30% padded) may halve with one additional hire; (4) QA estimates at full scale reflect one-person modelling, not a contracted team. Lead estimation capability: rate each lead 1-5 with evidence -- identifies where to apply per-person fudge factors. Bad estimators in a spreadsheet will be bad estimators in Jira; the tool does not fix the skill. Scope framing rule: present to leadership as "how much of the VS can we close this month?" not a fixed end date -- fixed dates inflate team behaviour. [source: 2026-06-26_ch-vs-staffing-efficiency-ratings]

**OKR threshold calibration:** 1 week late = green; 4 months late = red. Two-layer status model: internal plan uses a buffer; external reporting only flags when buffer is being consumed. A dedicated PM role owns loop-closing and OKR dashboard. [source: not_Ua643ajeN9C1f7]

**Milestone as production pressure mechanism:** Conference-anchored milestones allow teams to rationalise "not quite ready." Pressure-anchored milestones -- internal deadlines with no external excuse -- force the studio to estimate, build, and ship or face a clear internal failure. Once a studio ships to a pressure milestone it has evidence it can execute -- investor readiness follows from production discipline, not the other way around. [source: 2026-06-22_milestone-purpose-pressure-not-conference]

---

## Pre-Production to Production Transitions

**Diagnostic signals of false production belief:** Working prototype code exists but GDDs/TDDs are absent (60% GDD/TDD coverage at a studio that believed itself in production); art impressive but core systems undocumented; design approval routinely bypassed; features built for investor demos that need redesign for scalability; first structured estimate reveals scope 2-3x larger than assumed. [source: granola_4005eb22, granola_5fdd8c18, granola_f41b006d, granola_ae650223]

**Live service vs box game mindset gap:** The most critical and underdetected misalignment in early-stage studios: leadership plans and builds as if shipping a contained product while the game requires live service architecture from day one. Signal: the head of development has perfected the base product but has no plan for post-launch content, live operations, or a player economy. Consequences: by the time the gap surfaces (typically at a publisher Alpha review), only 3 months remain before ship -- insufficient to build live service infrastructure. Fix: establish a hard cutoff date for base game systems; everything unfinished by cutoff ships as live content post-launch; align the head of development explicitly on the two-phase model (base + live) before producers arrive. [source: 2026-06-22_live-service-vs-box-game-mindset-gap]

**Pre-production exit gate / early production entry requirements (NBI standard):**
1. Solid prototype / vertical slice completed and validated
2. All core teams established
3. All design docs in preparation (actively in progress, not complete)
4. All TDDs in development [source: granola_d977d66a]

**The Beautiful Corner (Tim Cain):** A small non-playable area built to final visual quality proves art pipeline feasibility before committing full production resources. **The Horizontal Slice:** All game areas playable but unfinished; tests structural integrity and total playtime. Valuable for open-world and non-linear games. [source: web_2026-05-27_tim-cain-nine-stage-production]

**Vertical Slice: definition and dual purpose.** Not a demo. A pipeline validation exercise determining whether production at intended quality is viable -- consuming up to one-quarter of total development time. VS serves four purposes: (1) studio demo for internal alignment; (2) pipeline validation; (3) investor material; (4) proof to the studio itself that it can build a game. Studios completing their first full production cycle: the VS is the first time the whole team estimates, builds, and ships a coherent experience. Side-by-side proxy vs polished comparison is the investor narrative device for demonstrating velocity. [source: web_2026-05-27_rami-ismail-ltpf-milestone-framework, not_3bUR2wWsPQvo8n_scope, 2026-06-22_vertical-slice-dual-purpose-investment-studio-proof]

**VS "building the real game" anxiety pattern:** Studios in vertical slice phase often develop a specific anxiety -- the team suspects they are building another pitch deck rather than their actual game. Signals: assets described as "temporary"; unconfirmed features appearing in pipeline discussions; multiple department heads independently flagging that teams are building to demo standard. Fix: explicit mandate that every VS asset is a piece of the real game; unconfirmed features banned from pipeline meetings until confirmed; leadership repeats this framing consistently. Scope anxiety and scope creep are the same phenomenon: uncertainty about what is real drives hedging and expansion simultaneously. [source: 2026-06-23_vertical-slice-real-game-framing]

**VS art quality floor -- proxy kit:** Proxy kit + proxy props is the correct VS1 quality standard; mid-poly bake is too high for general VS work and applies only to feature pillars (e.g. character customisation space). Set dressing is required on the critical path even at proxy stage. Without explicit quality tier definitions, artists self-escalate to the highest quality they can produce, creating timeline and scope risk. Investors can pitch-sell a proxy kit. [source: 2026-06-22_proxy-kit-art-quality-tier-vertical-slice]

**Art style lock for milestone:** When a studio has two or more coexisting visual aesthetics, each must be formally locked before sprint commitments are made. Unresolved style questions are blocked tasks for every discipline downstream. The lock process: Art Director, Game Director, and studio lead review all existing assets per aesthetic direction; select one clear direction per zone/context; pass to engineering for a performance check (higher-detail assets carry a different compute footprint); lock the style decision for the milestone duration; document in the knowledge base. "Lock" means: decisions made in 1:1 conversations are no longer authoritative -- the locked document is. Anti-pattern: treating art style as a living conversation during production. Each visual register needs its own kit; shared kits create hybrid reads that undermine both. [source: 2026-06-26_ch-art-style-lock-milestone]

**Feature tiering and the cost of late cuts:** T0-T2 (cheap to cut -- orange zone); T3 (MVP -- cuts still manageable); post-T3 (cuts become expensive, sunk cost compounds). **Three-tier change management lock system (NBI):** (1) Open iteration; (2) Soft lock; (3) Hard lock -- formal change request, game director + production approval, throwaway cost analysis. [source: granola_4e145b7b, granola_0fe5dec4]

**Managing scope fear:** When a studio first sees its full VS scope, a predictable fear response triggers scope-cut proposals. Framework: (1) All cut proposals go into a designated document -- no immediate decisions; (2) Scope ownership clarified -- decisions belong to a named core group only; (3) Fear acknowledged openly; (4) Studio head meets the most affected department directly to reframe scope ownership. [source: not_4nWBkRC4r7TVRQ_vs_fear]

**Game design hierarchy: Pillars → Player Promises → Value Creation:** (1) Pillars -- core design principles, CEO-approved, then locked; (2) Player Promises -- what the player feels as a result of each pillar; (3) Value Creation -- how each promise translates to measurable outcomes. Every contributor should trace their task through this chain. [source: 2026-06-19_pillar-promise-value-creation-framework]

**Quality tier mapping per department as scope governance:** A Miro board mapping deliverable quality tiers per department, signed off by all leads and directors before VS work begins. "Design lock" adopted as formal boundary. Top-down enforcement from the studio owner is necessary alongside the process tool. [source: 2026-06-19_quality-tier-scope-governance-miro]

**S-curve batching for studio transformation:** Changes in structured clusters are more effective than continuous drip-feeding. Key risk: a new senior hire making independent structural changes during stabilisation resets the timeline. [source: not_ireYPwXIKrrsWd_scurve]

---

## Build Stability, Merge Cadence, and Creative Documentation

**Weekly build as the primary visibility mechanism:** "I don't care what's in Jira or Perforce. If I can't play the game, it's not there." Weekly playable build is the foundation of studio state; Jira and tracking tools only become meaningful once anchored to a stable build. Biweekly showcase-style demos are false confidence. [source: 2026-06-19_weekly-build-visibility-design-doc-discipline]

**Design document discipline for engineering:** Engineers must not implement features without a properly detailed design spec, even for "known" features. Rule: if engineering cannot receive an adequate design spec, push it back. Creates accountability between design and engineering and surfaces when design is the bottleneck. [source: 2026-06-19_weekly-build-visibility-design-doc-discipline]

**Nightly stable build protocol:** Two-environment setup: (1) Stable -- nightly 4am build from main; QA lead runs smoke test each morning and posts to studio channel; always one sprint behind main. (2) Verification -- per-PR build gates merges; not for general access. Without a defined stable build, biweekly showcases become the only visibility point, creating false confidence. [source: 2026-06-19_nightly-stable-build-protocol]

**MMO branch architecture model:** Four tiers: Main (merge target only; all merges approved by branch manager), Dev (sandbox; breaking dev acceptable), Feature branches (isolated per system), Stable (one sprint behind main). Branch manager role: dedicated person owning merge approval into main. Studios transitioning from GitHub to Perforce must actively replicate the PR review mechanism. Helix (Perforce UI layer) makes the system accessible to QA and non-engineers. [source: 2026-06-19_mmo-branch-architecture-model]

**Art Bible as mandatory creative source of truth:** Small art direction changes communicated informally cause studio-wide confusion when they reach people outside the original conversation. Fix: the Art Director owns the Art Bible; the Creative Director signs off. Every art direction decision -- even minor environmental style changes -- must be logged in the Art Bible before or simultaneously with being communicated. Style branches exist as named branches within the Bible, not as separate documents or Slack threads. The Art Bible update is the official communication. [source: 2026-06-23_art-bible-creative-direction-source-of-truth]

**Game dev QA pipeline -- tiered automated testing:** Five-stage pipeline: Task > Commit > Build > Test > Deploy. Tests tiered by cost and frequency: unit tests every commit (under 5 min); smoke/boot tests every build (under 10 min); integration tests nightly (under 30 min); performance tests nightly and on release candidates (under 45 min); platform cert matrix on release candidates only (under 2 hours). Highest-ROI starting point: one boot test verifying the game launches and reaches the main menu. Performance is a correctness criterion: frame-time, memory, and draw-call budget violations should fail builds, not generate advisory warnings. Target QA split: 80% exploration and game feel, 20% functional regression. Zero tolerance for unaddressed flaky tests; quarantine immediately. Note: "Most game studios have zero automated tests." Unreal: Gauntlet + AutomationTool. Unity: EditMode, PlayMode, Performance Testing Framework. [source: web_2026-06-24_game-dev-qa-pipeline-architecture]

**QA scaling model -- contracted team with two-build pipeline:** For a ~65-person live-service studio with a single overwhelmed in-house QA person: target state is a 30-person contracted QA team (not in-house hires) with TestRail for test case management. Two-build pipeline: (1) Review build -- tested against a new sprint commit cadence; catches regressions early. (2) Playtest build -- runs two sprints behind the review build; already tested and patched; used for playtesting and stakeholder sessions. Rationale: mixing review and playtest means bugs from the current sprint contaminate stakeholder confidence. Near-term fix: QA lead + Engineering Director + Executive Producer + Head of Production define test scope per build type -- scope clarity is the prerequisite for resourcing decisions. Anti-pattern: treating QA as a consumer of engineering quality rather than an independent voice with defined gates. QA lead must have a direct reporting line and a defined DoD stage. [source: 2026-06-25_ch-qa-contracted-team-model]

**Multi-discipline definition of done -- Game Director ownership:** A live-service studio had siloed DoDs per discipline: art had 9 stages, code had 8 stages, audio was undefined. Fix: Game Director owns and consolidates all DoD -- each discipline proposes its craft-level stages as inputs; Game Director consolidates into one unified structure (a single Miro board); Executive Producer arbitrates quality vs timeline conflicts. Collapsed stage targets: code 4 stages (not playable / playable / feature complete / scalable); art 3-4 stages mapped to actual handoff points; audio 4 stages (sample / board sounds / approved sample / compiled system). Anti-pattern: nine-stage art DoDs exist because leads model a fully shipped pipeline rather than actual handoff points. One unified board replaces all siloed discipline boards. [source: 2026-06-26_ch-definition-of-done-multi-discipline]

**Bi-weekly update framing (output to impact):** Every update item must state what was built AND why it matters to the game. Surfaces which teams struggle to connect their work to player experience. [source: not_VAlGkyKnb8xGcs]

**Kick-it-back documentation gate:** If a TDD cannot be written from what is provided, reject the story before sprint commitment -- not on day one of the sprint. Stories exceeding 10 working days must be split or reclassified as features/epics. [source: not_VAlGkyKnb8xGcs]

**Production data consolidation:** When consolidating multi-source plans, preserve original naming -- never rename stories or features. Miro boards require multiple extraction passes; no single export captures everything. [source: ch_production_consolidation_spec]

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

A ~50-person studio sustained a 4-6 month seasonal cadence for PC co-op without crunch for 6+ years. Community feedback drives product decisions throughout development. A dedicated "Live Game" epic covering telemetry, analytics, and live ops infrastructure is required from early production -- not added when the game ships. [source: web_2026-05-27_ghost-ship-open-development-live-ops, granola_5fdd8c18]

---

## Continuous Improvement: Critical Stage Analysis

CSA is a feedback overlay compatible with any methodology. Three questions, five items each, rated by importance (1 = most important): What went right? What went wrong? What could be improved? Responses within 3 days of milestone; team presentation within 1 week. Total cost: 2-4 hours per cycle. Previous milestone issues receive status updates at the next meeting, preventing inaction. Informal feedback works below ~20 people; above ~50, systematic feedback mechanisms are necessary. [source: web_2026-05-27_critical-stage-analysis-hamann]

---

## Studio Leadership Offsite Methodology

A tested 3-day format (8-9 senior attendees): Day 1 -- foundation, goal statement, feature sweep at 2 min/row with "L by default" sizing. Day 2 -- gate-passing criteria ("the single most leveraged hour of the offsite"), GTM, community strategy. Day 3 -- pipeline RACI maps, staff assessment (C-level only). Binding strategic decisions laid down before the offsite prevent relitigating in the room. See client_patterns bank for full facilitation detail. [source: ch_offsite_agenda_2026-04-27]

---

## Statistical Evidence: Research and Historical Case Studies

**Shirinian postmortem analysis -- 71% scope failure rate:** Ara Shirinian analysed 24 consecutive postmortems from Game Developer magazine (Feb 2008 to Jan 2010), 240 data points. Key findings: 71% reported scope problems; 50% reported late-stage feature additions or changes; production management failures dominated at 68 of 120 failure data points; only 21% planned projects around team capability, and all of those completed under 2 years; 38% required time extensions ranging from weeks to 17 months; outsourcing success rate: 43% (3 of 7 reporting positive experiences). NBI applicability: the 71% scope-problem figure is a client-facing anchor statistic. The 43% contractor success rate is a specific risk figure for studios using extensive outsourcing. [source: web_2026-06-24_dissecting-postmortem-scope-statistics]

**Game Outcomes Project -- empirical correlates of production success:** Multi-studio survey, several hundred developers, 120 questions, correlated against four outcome variables. Central finding: specific production methodology showed no statistically significant difference in outcomes. Highest-correlating success factors: design risk management 0.57 (strongest single factor); team focus 0.50; crunch avoidance 0.44; team stability and communication 0.36-0.39; production methodology 0.29 -- meaningful but not dominant. Additional findings: 79% of studios did NOT use agile or Scrum explicitly; crunch "did not actually save projects from delays" -- all five crunch questions showed negative correlations; project reorganisations showed "strong and unequivocal correlations with inferior outcomes." NBI advisory position: "Choose your methodology for cultural fit, not because you believe it determines outcomes -- what determines outcomes is design risk management, realistic scoping, and crunch avoidance." Data collected 2014; corroborated by Shirinian postmortem dataset. [source: web_2026-06-24_game-outcomes-project-production-correlates]

**Mid-tier console pre-production failure case study:** Anonymous UK mid-tier console developer, sports fitness game with multi-camera and mocap integration. Key failures: GDD and ADD not signed off until 5 months into full production; lead coder not assigned until month 6 and departed 4 months later; task management simultaneously used messenger, whiteboards, Excel, email lists, Campfire, verbal requests, MS Project, Mantis, and Word; feasibility never conducted on two key technical features; publisher scope changes arrived 3 weeks before initial submission. Rules derived: (1) Never begin full production without signed-off GDD and ADD; (2) Lead technical roles must be filled on day one; (3) Feasibility studies must precede commitment to technically novel features; (4) A proliferation of task-tracking systems is a production warning signal; (5) Publisher-driven scope changes within 3 weeks of submission are a contractual failure -- negotiate change-freeze windows in the original contract. [source: web_2026-06-24_mid-tier-console-preproduction-failure]

---

## Org Design Patterns

### Structural Anti-Patterns and Viable Models

Three anti-patterns in 50-person studios: (1) Producer mis-parented through Finance/Ops; (2) CTO span too flat -- becomes a bottleneck; (3) Tech Art/VFX in a grey zone between Engineering and Art -- both assume the other is accountable. Three viable structures at 50-100 people: Classic Functional with strong EP hub (best under 60); Pod/Strike Team (best for parallel workstreams with clear boundaries); Platform + Game dual-track (only when platform is genuinely a strategic product). [source: chatgpt_69034e5d, chatgpt_6967809b]

### Staged Staff Replacement Methodology

When a studio has identified a cohort of underperformers, replacement follows a phased pattern: (1) Open the replacement role; (2) Find and hire the candidate; (3) Overlap new hire with existing person 2-3 weeks for handover; (4) Exit the existing person. Wave sizing: groups of 3-5-7-8, not all at once. Communication sequence: brief COO and EP first, consolidate a step-by-step plan, then brief the CEO/studio owner. Some underperformers self-select out when new hires arrive, which is preferable to managed exits. [source: 2026-06-19_staged-studio-replacement-methodology]

### Studio Seniority Distribution and Staff Mix Targets

Target distribution for a quality-gated MMO studio in VS preparation: ~60% seniors, ~30% mids, ~10% juniors (only with real mentorship infrastructure in place). Remote juniors without senior mentors develop bad habits or stall. Replacements are product-driven, not budget-driven. [source: 2026-06-19_studio-seniority-distribution-target]

**80/20 mid/senior target at production scale:** A ~65-person live-service studio identified junior-heavy staffing as a structural quality risk. Baseline: ~63% junior-level. Target: 80% mid/senior, 20% junior (approximately 20 junior roles in a ~100-person studio). Risk articulation: in a market of 20,000+ Steam releases per year, "good enough" does not clear the bar. Phased departure approach: groups of 2-3 with 2-3 weeks pipeline overlap before contract closes; replacement pipelining begins before departure notification. Communication framing: "evolution phase" and "skill uplift," not layoff or restructure language. [source: 2026-06-25_ch-studio-staff-mix-80-20]

**Director performance assessment:** Two dimensions: command presence / ability to give direct negative feedback, and discipline-specific technical output. A technically strong but leadership-weak director is as risky as a technically weak one. Rapid improvement path: present anonymous staff feedback with concrete examples in a structured 1:1; set a clear behavioural change target with a defined review date. [source: 2026-06-25_ch-studio-staff-mix-80-20]

### Quad Assessment for Production Readiness

A one-time structured evaluation for entering a high-stakes production phase. Core question: "Can this person deliver high-quality content in their craft, at speed, right now?" Two criteria for staying: (1) Good to work with, self-managing, team-positive; (2) Delivers product-level quality consistently at pace. Result tiers: hard cuts (red triangle -- first priority), stars/saves (director owns the save), juniors (flagged J -- separate consideration), unmarked (exits but lower urgency). Leads given a cap ("you get three picks") to force honest assessments. [source: 2026-06-19_quad-assessment-staff-segmentation]

### Staff Quadrant Review (Ongoing Performance Framework)

A four-category 2x2: (1) Weak link -- low capability, low growth potential, managed exit; (2) Loose cannon -- high output but unpredictable or destructive; (3) Steady Eddie -- reliable, meets expectations; (4) Champion -- high capability, high behaviour alignment. Evaluation against the role standard, not peers. Three HoD facilitation questions: Can this person do the job at scale today? Do they have growth potential? Can the studio accelerate that growth within a year? [source: not_ireYPwXIKrrsWd_quadrant]

### Meeting Structure Discipline

**Four-layer studio meeting structure:** Studios past ~30 people that mix strategic, operational, and team-level content into the same meeting cadence suppress hard executive conversations. Four-layer structure: (1) Executive/C-level -- founders, advisors, GC, CFO; agenda: run the business, staffing decisions, financial runway; (2) Studio leadership -- department directors and above; agenda: product and studio health, directors own their vertical; (3) Product Council/Directors -- all directors and producers; agenda: alignment and feedback flowing between exec and leads; (4) Leads -- team leads per discipline; agenda: team-level updates, blockers, sprint commitments. Key design choice: legal and HR sit at executive layer. Mixed audience suppresses hard conversations. Project-level status framing ("Investment round = red" not "Legal = red") removes defensive posturing and focuses the room on solving constraints. [source: 2026-06-25_ch-four-layer-meeting-structure]

**Decision owner model:** Without named decision owners per pipeline stage, meetings expand to include everyone and collapse into non-decisions. A 12-person, 45-minute meeting with no decisions reached is the failure pattern. Fix: assign a named decision owner per pipeline stage (e.g. level design handoff: Level Design Director; character pipeline: Art Director). Meeting attendees = decision makers for that pipeline stage only. Starting point: map the handoff pipeline first, assign owners at each handoff, set attendee lists from that map. [source: 2026-06-23_decision-owner-meeting-discipline]

**Executive RAG meeting format:** Format: (1) Start by reviewing last week's action items -- names visible; (2) Each area owner gets 5-7 minutes: RAG status, plan, and closure date; (3) No update without a timeframe; (4) No problem-solving in this meeting -- identify, assign, spin off; (5) Persistent item titles week-to-week so progress tracks against a fixed reference. RAG forces a binary that verbal updates allow leaders to contextualise away. [source: 2026-06-23_executive-rag-meeting-format]

### Communication and Culture Patterns

**Poisoned phrase problem:** A phrase coined around a specific failed initiative becomes toxic -- using it in future contexts triggers defensive reactions from leadership regardless of the underlying concept's merit. Intervention: (1) identify the phrase and its associated failure; (2) understand what the stakeholder objected to vs what they actually want; (3) find an alternative phrase; (4) introduce the reframe proactively before others use the old language -- reactive reframing after the trigger is harder. [source: 2026-06-22_poisoned-phrase-studio-culture-reframing]

### Managing Founder "Midnight Ideas"

Mechanism: a shared idea log where anyone receiving an ad-hoc founder request adds the item for weekly review. Ideas are not acted on ad hoc. Showing founders all their own ideas in one place is a natural self-regulator. For in-meeting scope pivots: the lead handles the interrupt in the moment; coach the founder on the pattern in their direct 1:1, not in front of the team. [source: 2026-06-19_founder-idea-log-scope-governance]

### Employee Satisfaction Survey Timing

Do not launch until the studio has capacity to act on results. A survey creates a commitment backlog; launching before infrastructure exists creates expectations that will be visibly unmet. Immediate morale intervention alternative: all-studio 1:1 rotation (~55 people over ~4 weeks). Target survey timing: after Jira, pipelines, and vertical slice are moving. [source: 2026-06-19_employee-survey-timing-principle]

---

## Onboarding at Scale

**Role-specific machine builds and common stack:** Artist kit, producer kit, developer kit. Hardware for FTEs only; contractors provide own. General: Slack, Google Workspace, Jira, Confluence, VPN. Development: GitHub, Perforce, Azure, Redis. Art: Perforce, Maya/3D Max, Photoshop, Miro. Production: Claude accounts, Granola, Whisper Flow. Four-month probation with 30/60/90-day check-in reviews. [source: granola_891cf074]

**Jira implementation: configuration principles.** From experienced administrators (Blizzard, My.games, Amplitude Studio -- all arrived independently at the same conclusions): (1) Use components, not labels -- labels break filters through typos; disable labels wherever possible. (2) Standardisation over team autonomy. (3) Custom fields only when genuinely needed, shared across projects. (4) Issue hierarchy: Epic > Feature > Story > Task. (5) Requirements gathering from three user levels: executives (dashboards), team leads (assignments + standups), individual contributors (task execution). (6) Observe a real standup before configuring. (7) Train 2-3 super users for light admin. [source: 2026-06-22_jira-setup-methodology-game-studio, 2026-06-23_jira-parallel-run-migration-approach]

**Jira migration: parallel-run approach.** Run Jira alongside the existing tool until feature parity is validated; only then cut over. Prune the existing backlog during migration rather than lifting and shifting. ScriptRunner non-negotiable for complex automation. Timeline: core structure within 1-2 months; 70-80% implementation by month 3. [source: 2026-06-23_jira-parallel-run-migration-approach]

**Jira + Perforce rollout sequencing (5 steps, ~6-7 weeks total):** (1) Load Jira (~3 weeks from rollout decision); (2) Art and tech producers onboard concurrently; (3) ~1 week to stabilise with a Jira admin hire; (4) ~3 weeks debugging pipelines via sprint retrospectives; (5) Sprint flywheel starts ~6-7 weeks from rollout decision. Do not open Jira until controls and structure are ready. Estimation exercise must precede rollout. [source: 2026-06-19_jira-perforce-rollout-sequence]

**AI-native capability as hiring criterion:** As of 2026, Sega requires an AI component in analyst interviews. The headcount question shifts from "how many analysts?" to "do we need one instead of three?" [source: 2026-06-19_ai-native-hiring-analytics-standard]

**Early probation exit (UK employment law):** Three grounds for early termination: (1) Declaration of incapacity by the employee; (2) Competency misrepresentation at hire; (3) Structural misalignment signals (positioning for a more senior role, contradicting a peer lead within weeks). From 1 January 2027, unfair dismissal rights begin after 6 months (reduced from 2 years). [source: not_HubmSolirYMTbM, not_CPGgraRzP9tMoz, not_ireYPwXIKrrsWd_contractor_lexicon]

**Hiring pipeline governance:** (1) Any open role with fewer than 3 valid candidates is red status; (2) Lead-level and above require scorecards and background checks; (3) HR screening as first step: collects salary expectations, contract type, relocation interest before technical evaluation. [source: not_4nWBkRC4r7TVRQ_hiring_governance]

**ATS-based hiring workflow:** Pipeline threshold: five candidates per open role is the working target; ideal state is two strong finalists before offer. Scorecard automation: interviewers added as dropdowns; scorecards sent via email link. Friction point: slow scorecard returns from hiring managers is the recurring bottleneck, not recruiter throughput. Priority discipline: recruiter needs real-time notification when role priorities shift. Role remains open in the ATS until start date, even after offer accepted. [source: 2026-06-24_ats-hiring-workflow-methodology]

**Contractor compliance -- IR35 and day rate model:** Studios with mixed contractor/FTE workforces risk employment classification claims when contractors invoice at a fixed monthly rate during time off. Paper trails labelling contractor absence as "paid leave" constitute evidence in labour court. UK IR35 fine: ~£60K per incident; Spain: up to €55K. Fix: gross-up day rate to cover expected time off; calculate as (monthly rate ÷ 22.5) × uplift for ~36 annual non-working days. New expected working days per year: ~226. All leave labels renamed from "vacation"/"paid leave" to "out of office." Contractors "notify" leads of unavailability -- they do not "request" approval. No sick pay, no holiday pay, no parental leave clauses in contractor agreements. Pilot with 3 trusted contractors first; studio-wide rollout via live call. The correct response to "do you offer vacation?" in a contractor interview: "your rate is structured to cover time you won't be billing; we do not offer vacation" -- never use the word "offer." [source: 2026-06-26_ch-contractor-day-rate-compliance, 2026-06-26_ch-ir35-contractor-classification-risk]

---

## Quality and Delivery Standards

**Producer as cross-department defect translator:** The producer's role: (1) check ask details before work starts; (2) check output against delivery criteria before sign-off; (3) track defects in retrospectives; (4) feed rework into the producer backlog. Escalation: one defect = human, flagged internally; repeated defects from the same person = escalate to their director; persistent pattern = escalate to fractional head of studio / COO. [source: 2026-06-19_producer-cross-dept-defect-translator]

**QA tool evaluation process:** Management builds a vendor assessment list; QA builds a use case list. Decision criteria: a 7/10 use case match that saves headcount equivalent to 3 people. Tools shortlisted: TestRail, TeamCity, modl.ai, DataDog, Sentry, Locust, Toxiproxy, Helix. TestRail and TeamCity are the cornerstones; Google Sheets explicitly rejected as a test plan tool. **Internal tool PR model:** Custom tooling needs follow the same product requirements + backlog + prototype + test process as product features. [source: 2026-06-19_qa-tooling-evaluation-pr-model]

**Biweekly art asset output tracking:** Leads compile what was built, by whom, with a direct link to approved renders. Framing: high output buys tolerance for rough edges; low output does not. [source: not_9qoMQqGw4HJ8jk_asset_tracking]

**Audit-driven improvement:** Numeric audit scoring drives focused improvement. A 19-dimension code audit with numeric scoring (6.6/10) followed by a structured sprint plan followed by a re-audit (7.3/10) is a reusable consulting delivery pattern. [source: handoff_2026-04-08b]

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

9. **Junior hire density upper bound:** The policy documents minimum support structures but the maximum viable junior-to-senior ratio in a fully remote studio is undocumented.

10. **Live service alignment as hiring criterion:** Whether to require explicit live service background for head of development roles, vs ability to learn the two-phase model, is undocumented.

11. **Contracted QA team onboarding:** What is the typical onboarding time for a 30-person contracted QA team to reach consistent output quality? No primary data.

12. **IR35 multi-jurisdiction interaction:** Studios with contractors across UK and multiple EU jurisdictions face simultaneous exposure points. No case data on how employment tribunals in different jurisdictions handle concurrent exposure from the same contractor.

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
| 2026-06-22_jira-setup-methodology-game-studio | Granola | Jira setup: components over labels, requirements-first, observe-before-configuring (anonymised) |
| 2026-06-22_junior-hire-policy-remote-studio | Granola | Junior hire support policy for remote studios: training/mentoring/buddy/check-ins (anonymised) |
| 2026-06-22_live-service-vs-box-game-mindset-gap | Granola | Live service vs box game mindset gap in studio leadership; cutoff date fix (anonymised) |
| 2026-06-22_milestone-purpose-pressure-not-conference | Granola | Milestone as production pressure mechanism vs conference target (anonymised) |
| 2026-06-22_poisoned-phrase-studio-culture-reframing | Granola | Poisoned phrase problem: terminology reframing when labels carry baggage (anonymised) |
| 2026-06-22_proxy-kit-art-quality-tier-vertical-slice | Granola | Proxy kit as VS1 art quality floor; mid-poly bake only for feature pillars (anonymised) |
| 2026-06-22_vertical-slice-dual-purpose-investment-studio-proof | Granola | VS dual purpose: investor proof + studio proof it can build (anonymised) |
| 2026-06-23_art-bible-creative-direction-source-of-truth | Granola | Art Bible as mandatory creative source of truth; Lore Bible equivalent (anonymised) |
| 2026-06-23_decision-owner-meeting-discipline | Granola | Decision owner model: pipeline stage ownership, meeting attendee discipline (anonymised) |
| 2026-06-23_executive-rag-meeting-format | Granola | Executive RAG meeting format: action-item-first, persistent titles, no problem-solving (anonymised) |
| 2026-06-23_jira-parallel-run-migration-approach | Granola | Jira parallel-run migration: validate parity, prune backlog, ScriptRunner non-negotiable (anonymised) |
| 2026-06-23_vertical-slice-real-game-framing | Granola | VS "building the real game" anxiety pattern; unconfirmed features ban in pipeline meetings (anonymised) |
| 2026-06-24_estimate-challenge-scope-discipline | Granola | Estimate inflation control: "shenanigans" culture, sequential challenge, scope capitulation fix (anonymised) |
| 2026-06-24_ats-hiring-workflow-methodology | Granola | ATS hiring workflow: 5-candidate threshold, scorecard automation, pipeline hygiene (anonymised) |
| web_2026-06-24_dissecting-postmortem-scope-statistics | Web | Shirinian statistical analysis: 24 postmortems, 71% scope failure rate, realistic scoping correlation |
| web_2026-06-24_game-outcomes-project-production-correlates | Web | Game Outcomes Project Part 3: empirical correlates -- design risk 0.57, crunch negative, methodology 0.29 |
| web_2026-06-24_game-dev-qa-pipeline-architecture | Web | Game dev QA pipeline: 5-tier automated testing, boot test as highest-ROI start, performance as gate |
| web_2026-06-24_mid-tier-console-preproduction-failure | Web | Mid-tier console pre-production failure case study: GDD not signed off, lead vacancy, task system proliferation |
| web_2026-06-24_motion-twin-flat-coop-production-ceiling | Web | Motion Twin flat co-op ceiling: 10-15 person limit, consensus reversibility, Evil Empire 9x multiplier |
| 2026-06-25_ch-four-layer-meeting-structure | Granola | Four-layer studio meeting structure: exec, studio leadership, product council, leads (anonymised) |
| 2026-06-25_ch-qa-contracted-team-model | Granola | QA scaling: 30-person contracted team, two-build pipeline, review vs playtest separation (anonymised) |
| 2026-06-25_ch-studio-staff-mix-80-20 | Granola | Staff mix KPI: 80% mid/senior target; director assessment two dimensions; phased departure (anonymised) |
| 2026-06-26_ch-art-style-lock-milestone | Granola | Art style lock process: review, load check, lock for milestone; dual-aesthetic kit discipline (anonymised) |
| 2026-06-26_ch-contractor-day-rate-compliance | Granola | Contractor day rate model: gross-up to eliminate vacation billing legal risk; IR35 fines (anonymised) |
| 2026-06-26_ch-definition-of-done-multi-discipline | Granola | Multi-discipline DoD: Game Director ownership, consolidated Miro board, collapsed stage targets (anonymised) |
| 2026-06-26_ch-ir35-contractor-classification-risk | Granola | IR35 misclassification risk: what studios get wrong; £60K per incident; label evidence risk (anonymised) |
| 2026-06-26_ch-vs-staffing-efficiency-ratings | Granola | VS staffing model: efficiency ratings, estimation calibration, lead capability assessment, scope framing (anonymised) |
