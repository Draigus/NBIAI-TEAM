---
last_compiled: 2026-06-11
extract_count: 33
role_associations: [producer, gaming_practice_lead, cmo]
rebuild_type: full
---

# Client Patterns -- Knowledge Bank

**Last compiled:** 2026-06-11 (full rebuild)
**Extracts integrated:** 33 qualifying (8 restricted skipped, 1 manifest skipped)
**Role associations:** producer, gaming_practice_lead, cmo

---

## Executive Summary

NBI's cross-client patterns span a fractional CPO engagement at a 55-person UK/Greece MMORPG studio, a pricing benchmarking engagement with a F2P football game studio at launch, and analytics advisory for a live-service driving game studio. Recurring themes: audit-first engagements that surface production reality gaps convert quickly to long-term retainers; proposals that separate workstreams enable partial buy-in; delivery quality depends on red-team validation before any client-facing output; and hiring at growing studios consistently exposes three failure modes -- salary expectation misalignment, solo HR overload, and contract over-prescription by legal counsel. The fractional model is NBI's highest-value engagement structure, combining strategic authority with operational depth at a level no pure advisory firm can match.

---

## Engagement Approaches That Worked

### Audit-First Conversion

A 3-4 week production audit of a 55-person game studio revealed the team was in early production, not mid-production as they believed. Art had progressed significantly ahead of systems, creating an "illusion of a full game" while core design and tech lagged. The studio founder's response to the 80-page audit was "Can you help us fix this?" -- not defensiveness. The audit built trust that converted to a sustained fractional CPO engagement [source: granola_50612dd7].

This is NBI's highest-conversion entry point for studio engagements. The audit surfaces concrete gaps the client cannot see themselves, and the "can you fix this" response is the green light for ongoing work.

### Fractional C-Suite Model

The fractional CPO structure at a 55-person remote UK/Greece studio operates as genuine internal authority: recurring 1:1s with all direct reports, participation in executive meetings, hiring decisions, contract reviews, and production governance. Rate: GBP 30k/month [source: gmail_composite_hiring_wave]. This is not advisory -- Glen sets strategy and executes it alongside the client team. The distinction matters in proposals: "Embed and Align" versus report-only delivery.

WorkSage as a client-facing product also generated its own engagement: a DOD consultancy partner saw the tool during a building inspection and began paying $5k/month for alpha access. The automated status-email feature passed a Turing test -- a team member did not realise the emails were AI-generated [source: granola_05c3ee6b].

### Pre-Decision Framing for Offsites

Binding strategic decisions set before a leadership offsite prevent relitigating in the room. For a 55-person game studio offsite, six pre-decisions were documented covering monetisation model, distribution strategy, beta approach, naming, platform, and 12-month goals. The framing: "burden of proof shifts onto anyone disagreeing with pre-decisions" [source: ch_offsite_pre_decisions_2026-04-27]. Structure: position, alternatives considered, reasoning, downstream constraints -- one page per decision.

Pre-decisions also establish facilitator credibility before the session begins. Attendees arrive knowing there is a direction to defend, not a blank canvas to explore.

### Offsite Facilitation Methodology

A 3-day studio leadership offsite with 8-9 senior attendees requires a private facilitation playbook distinct from the public agenda. Key structural elements [source: ch_offsite_working_doc_2026-04-27]:

- **Scripted opening line verbatim** -- tone-setting is too important to improvise
- **Person-specific watch-fors** -- know who defaults to silence, who converges prematurely, who defers to peers
- **Standard responses for deflections** -- pre-scripted phrase bank prevents energy-sapping improvisation
- **Move-on criteria per session** -- prevents over-indexing on any single topic
- **Feature sweep at 2 minutes per row** with "L by default" sizing prevents analysis paralysis across 1,000+ items
- **Gate-passing criteria session framed as "the single most leveraged hour"**

The pre-read communication for attendees should take exactly 15 minutes to read, state rules as conditions not aspirations, explicitly name the studio's historical failure mode ("silent disagreement that surfaces later is the failure mode that has hurt this studio before"), and remove the homework escape hatch ("no work after, only what we do inside the three days") [source: ch_offsite_pre_read_2026-04-27].

### Three-Artifact Delivery

Engagement plans are delivered as three aligned artefacts: Excel tracker (planning, with WorkSage Import sheet), Word document task guide (What/How/Done When for each task), and live WorkSage sync. Tested on a ~116-hour pricing engagement. Key discipline: quality fixes applied to all three simultaneously to maintain consistency [source: handoff_2026-04-21_goals_deliverables].

### Hiring Scorecard Methodology

Glen produces structured interview scorecards (e.g. candidate rated 8/10 with explicit call-out of EOR/IR35 expertise for a distributed UK/Greece workforce) shared with client leadership via Slack. This adds tangible consulting value beyond general hiring advice and establishes evaluation rigour the client can replicate [source: slack_aris-dm_2026-05-25_hiring].

Senior hire interviews (CTO-level) use full leadership scorecards with categories: technical depth, leadership quality, team management, executive/outward-facing presence, and culture fit. Key finding: never schedule back-to-back interviews for senior candidates -- compressed time distorts impressions. The first 20-30 minutes of an introvert's interview are unrepresentative of capability [source: (restricted extract, methodology preserved)].

### External Validation as Confidence Signal

When an independent external assessor's findings closely match NBI's internal audit conclusions, it is worth surfacing explicitly to the client. It validates the transformation approach is correctly targeted and reduces founder resistance to difficult recommendations [source: granola_50612dd7].

### Red Team Validation (Mandatory Before Client Delivery)

Research deliverables must pass red team before client delivery. Five scoring dimensions, claim accuracy weighted highest (30%). A pricing benchmark engagement scored 53/100 on first pass (FAIL), remediated to 86/100, then enhanced to 93/100 over three passes [source: goals_red_team_report_2026-04-21]. Key fixes that moved the score: rewriting fabricated data, patching currency inference for 365 rows, canonicalising competitor names, recalculating volume discounts against practical base tiers.

Process requires automated verification scripts plus manual review. Kill criteria: zero empty metadata fields in normalised output. Cross-reference against the client's own position is mandatory -- benchmarks without client comparison are incomplete.

NBI's original research had ~47% quality issues before validation. Red teaming is not optional polish; it is structural quality control.

---

## Pricing That Landed

| Engagement | Price | Scope | Result |
|---|---|---|---|
| Studio initial audit (tech stack) | GBP 9,240 | 2-3 weeks, 3 stakeholder sessions | Accepted [source: chatgpt_69025031] |
| Studio MVP roadmap audit | GBP 7,465.50 | 2-3 weeks, 3 stakeholder sessions | Accepted [source: chatgpt_69025031] |
| Fractional CPO (ongoing) | GBP 30k/month | Full production + hiring + org design | Active [source: gmail_composite_hiring_wave] |
| Pricing benchmarking SOW | 100K SEK (~$10K USD) | ~116 hours, competitive analysis | Accepted [source: goals_sow_proposal_2026-03-31] |
| Live service consulting SOW | $45,440 | Content cadence, A/B testing, 90-day roadmap | Not taken (client took pricing only) [source: goals_sow_proposal_2026-03-31] |
| WorkSage alpha access | $5k/month | PM tool access + automated status emails | Active (DOD consultancy) [source: granola_05c3ee6b] |

**NBI hourly rates (USD, Feb 2025 baseline -- verify before quoting):** Operational Efficiency $250, Game Design $275, Market Research $300, LiveOps $275, Monetisation $325, AI/Data Strategy $350, UX/Player Research $275, Corporate Strategy $400 [source: chatgpt_67ac97d7].

**Senior hire compensation benchmarks (UK funded indie studio, 2026):** CTO at a studio with GBP 10-15M raised -- compensation ceiling set at GBP 220-240k base plus launch bonus of roughly one year base salary (total GBP 440-480k over project life). Equity intention approximately 5% for this tier, C-level at 8-10%, senior leadership 3-5%, key staff 1-2%. Candidates currently earning GBP 300k+ at established studios rarely accept startup financial trade-off even with equity [source: (restricted extract, methodology preserved)]. Head of Design hire at same studio included equity review language tied to next institutional round (Series B at USD 8-10M expected) [source: (restricted extract, methodology preserved)].

---

## Proposals That Won

**Separate workstreams enable partial buy-in.** A F2P football game studio was offered two workstreams (pricing benchmarking and live service consulting). They took pricing only ($10K) not live service ($45K). The ability to buy a piece worked; the client is now active [source: goals_sow_proposal_2026-03-31].

**Frame proposals around client urgency windows, not NBI capability.** A F2P football game studio's proposal anchored to 6-week pre-launch window and Sony platform submission deadline [source: goals_sow_proposal_2026-03-31]. MTX strategy proposals anchor to World Cup calendar windows [source: chatgpt_68e3cfc8].

**"Embed and Align" positioning differentiates from report-only.** NBI works inside client teams rather than handing over a document. This framing resonates with founders who have been burned by consultants who delivered and disappeared [source: goals_sow_proposal_2026-03-31].

**Evidence Table appendix.** Every non-obvious claim mapped to source, date, confidence level, and identified gap. Multi-role red teaming embedded in the process. This converts sceptical buyers [source: chatgpt_6907ec33].

**Do not cite beta metrics in proposals without verification.** A F2P football game studio SOW cited 50% D1 retention on PlayStation from pre-engagement materials; actual data from client brain showed 34-36%. Wrong numbers in proposals damage credibility if the client checks [source: goals_sow_proposal_2026-03-31, goals_client_brain_2026-05-12].

**MTX SoW structure for console/PC games.** Eight workstreams: Discovery and alignment, Market and price indexing, Store architecture and currency design, Attribute-offset policy and balance guardrails, Elasticity and experimentation framework, Sentiment and risk management, KPI and telemetry specification, Delivery kit. Scoping: approximately 4 weeks (1 week discovery, 1 week research, 1-2 weeks frameworks) [source: chatgpt_68e3cfc8].

---

## Delivery Patterns

### EAD Framework (NBI's Process Optimisation Methodology)

Applied in strict order: 1) Eliminate -- does this process need to exist? Kill criteria: if stopping for two weeks goes unnoticed, or justified only by "we've always done it." 2) Automate -- can a system do this without human judgement? Good targets: data transformation, status aggregation, threshold monitoring, template generation, cross-system sync. Poor targets: relationship-dependent decisions, ambiguous judgement, creative strategy, high-cost-of-error actions. 3) Delegate -- match to capability tier (AI routine autonomous, AI supervised human-reviews, junior human, senior human, owner-only) [source: nbi_ead_framework_2026-05-15].

The key anti-pattern is "automating before eliminating" -- building sophistication around waste. Client engagement pattern: audit all recurring processes, run EAD pass on each, deliver process map showing eliminated/automated/delegated with justifications.

### LiveOps Roadmap Design

A 5-month post-launch LiveOps roadmap for a F2P football game structured escalating monetisation in named phases: Kickoff (ARPPU ~$2.21, Founder's Season, $1.99 starter pack), Scale-Up, Peak (World Cup window), Sink (drain hoarded currency via 30-40% sale), Maturation (whale targeting, ultra-premium). August is explicitly the "Sink" month. Real-world sports calendar (Champions League Final, World Cup, UEFA Super Cup, Transfer Deadline Day) drives the entire LiveOps rhythm. Brand partnerships layered by month [source: goals_release_liveops_2026-04].

### Client-Branded Design Systems

NBI creates bespoke design systems for client analytics dashboards rather than using generic templates. A racing game studio client received a dark-first cinematic automotive theme with a dedicated 7-step funnel gradient separate from chart colours [source: lighthouse_design_system]. This is both a delivery standard and a proposal differentiator.

### AI Adoption for Regulated Environments

Two-lane model for US government-adjacent consulting clients: Lane A (CUI/regulated) uses approved-only tools with US-only data residency; Lane B (non-CUI research) allows broader tooling after vetting. Controlled merge procedure moves material from Lane B to Lane A via sanitisation checklist, human reviewer sign-off, citation validation with Source Map, and Claim Ledger [source: chatgpt_6972eb8d].

### Revenue Forecast Model Capability

NBI can deliver 60-month dual-path forecast models comparing monetisation strategies (e.g. Premium Sequel vs Hybrid F2P + Subscription). Requirements: cohorted by acquisition source, monthly retention/returner curves, cross-path migration, player segmentation with spend tracking, and full revenue recognition mechanics (ASC 606 -- subscription ratable, packs on delivery, MTX point-in-time, full deferred revenue rollforward) [source: chatgpt_68ede5cf].

---

## Common Client Challenges

### Production State Misperception

Teams consistently believe they are further along than they are. A 55-person studio believed they were in mid-production; a 3-4 week audit confirmed they were in early production. Multiple systems had prototype code but lacked GDDs/TDDs. Art being significantly ahead creates an "illusion of a full game" while core systems, design, and tech lag behind [source: granola_50612dd7]. This pattern was independently confirmed by an external assessor whose findings closely matched NBI's internal audit [source: granola_50612dd7].

At the same studio, the team had built components out of sequence, prototype mode persisted too long, and too many parallel initiatives ran without proper sequencing. Glen's finding at offsite: the team confirmed they were in early production (not mid-production) despite believing otherwise -- documentation gaps were the blocker [source: granola_5fdd8c18].

### Chain-of-Command Bypass

Art leads bypassing the production chain to complain directly to the founder/CEO is a predictable pattern when introducing production structure to previously flat studios. Department leads with historical founder relationships resist the new layer. The correct response: meet the bypassing parties directly rather than enforcing hierarchy through intermediaries. Routing it back through the producer without the face-to-face will make the leads feel dismissed twice [source: slack_production-council_2026-05-25_escalation].

The bypass is usually a scope confidence issue ("too big/scary") rather than a scope problem. Estimation data -- when the team has already completed their own estimates -- provides the data to validate or refute the concern.

### Single-Producer Bottleneck

At approximately 50 people, one producer cannot coordinate game content, platform work, backend services, build pipelines, playtests, partners, and vendors simultaneously. This is structural, not a performance issue [source: chatgpt_69034e5d].

### Solo HR Overload

A solo HR person managing 7+ simultaneous hiring pipelines, onboarding, and contracts at a 55-person studio is a capacity risk. A contractor hired during the wave noted the HR person "might be a bit overwhelmed" when response times lagged [source: gmail_19e3b1c434f765ba]. The offer acceptance rate of approximately 5/7 (71%) visible in one hiring wave is reasonable but the process gaps (salary shock, currency confusion, contract revisions) suggest quality is being sacrificed for throughput [source: gmail_composite_hiring_wave].

### Salary Expectation Misalignment at Offer Stage

When verbal discussions during interviews create different compensation expectations than the formal offer letter, candidates experience "shock" at offer stage. One senior designer candidate: "it really was just a bit of a shock to me if I'm honest, given what I was told" -- leading to an 8-day deliberation before tentative reconsideration [source: (restricted extract, methodology preserved)]. A separate candidate declined after 8 days despite describing the offer as "generous" -- competing factors (role fit, competing offer) went unexplored because no exit survey was in place [source: gmail_19df7a1b8aa33db5].

Process gap: offer letters sometimes sent directly by the EP rather than through HR, then HR is looped in after the candidate reacts. This creates inconsistency.

### MTX Strategy Gap

"No one on the client team had done MTX on console before" is a common gap at studios launching their first console title. This is a natural NBI entry point [source: chatgpt_68e3cfc8].

### GC Over-Prescription of Creative Contracts

Legal counsel in game studios consistently over-constrains contracts by applying standard commercial contract logic to iterative creative work. A general counsel created contract templates embedding specific milestones, deadlines, and fees per milestone. Glen rejected them: contracts need to be "more general and flexible" for early-stage studios where scope and timelines are inherently uncertain. Milestones and deadlines belong in project plans, not employment/engagement contracts. Over-specifying creates legal exposure when timelines shift [source: slack_lorenza-dm_2026-05-25_contracts].

This is a recurring friction point whenever a studio hires formal legal counsel. NBI should have a standard "creative engagement contract" template ready that balances legal protection with delivery flexibility.

### Delayed Payments

Payments arriving late (one client payment 6 weeks overdue) are a recurring operational risk rather than exceptional events [source: granola_f404fbcc]. Monthly minimum revenue thresholds matter: bare minimum to keep NBI operational is $60k/month, target is $80k/month [source: granola_f404fbcc].

### Recruitment Agency Lead Times

Engagement of multiple external recruitment agencies (two agencies simultaneously) for a hiring wave began 4 months before the active hiring period [source: gmail_19bd68df4acebc2a]. This is planned, not reactive, recruitment -- and the lead time is longer than most founders expect. Agency with existing studio connections has a referral advantage beyond the candidate pool.

---

## What To Avoid

**Citing unverified metrics in proposals.** A F2P football game studio SOW cited 50% D1 retention; actual was 34-36%. Wrong numbers damage credibility if the client checks [source: goals_sow_proposal_2026-03-31].

**Over-prescriptive contracts.** General terms, not specific milestones and fees at contract stage [source: slack_lorenza-dm_2026-05-25_contracts].

**Report-only consulting.** "Embed and Align" works; pure document delivery does not differentiate NBI [source: goals_sow_proposal_2026-03-31].

**Skipping red team validation.** Research at 53/100 without it; 93/100 after. The gap is real [source: goals_red_team_report_2026-04-21].

**Auto-calculated health states.** Manual control over probability estimates and health assessments -- Glen refuses auto-fill [source: handoff_2026-04-06a].

**Back-to-back senior interviews.** Compressed schedules distort impressions for senior candidates. Allow recovery time between candidates [source: (restricted extract, methodology preserved)].

**Scheduling a senior hire's start date rigidly.** Candidates leaving major studios (Epic, Rockstar, Ubisoft) need managed departures. Flexible start dates close hires; rigidity loses them [source: (restricted extract, methodology preserved)].

**Publisher capital when equity can replace it.** Self-publishing preserves partner-game integration freedom that publishers would constrain. If the equity raise is viable, publisher capital is redundant [source: ch_offsite_pre_decisions_2026-04-27].

**Assuming a candidate earning 30%+ above your ceiling wants the job enough.** High-comp candidates at established studios rarely accept startup financial trade-off even with equity. Post-interview read is essential [source: (restricted extract, methodology preserved)].

---

## [NEW SECTION PROPOSED] Beta and Launch Metrics Benchmarks

This section captures cross-client data points useful for benchmarking. Propose adding to schema on next review.

**F2P football game beta (509 respondents, March 2026):** NPS +24.6 (40% promoters, 15.5% detractors). Recommendation score 8.0/10. D1 retention 36% overall (34% PS5, 37% Steam). CPI reduced 88% from $3.61 to $0.43 over campaign optimisation. 57 min avg daily playtime, 4.6 matches/day. Anti-P2W sentiment is the community's hardest red line [source: goals_beta_community_sentiment, goals_client_brain_2026-05-12].

**F2P game revenue model (projected, 805K MAU at 3.6x beta):** 10.4% payer rate, ARPU $3.38, ARPPU $32.48, projected $2.72M total. Three personas: Core (20% pop, 30% paying, $46 ARPPU), Dedicated (35%, 10%, $15.81), Casual (45%, 2%, $7.24). Top 3 packs = 66.7% of revenue despite 14.2% of volume [source: goals_client_brain_2026-05-12].

---

## Open Questions

- What is the optimal retainer structure vs project-based pricing for ongoing advisory engagements above the GBP 30k/month fractional CPO tier?
- How should NBI price AI operations setup services (EAD audit + automation implementation) for game studios?
- What proposal formats work best for US government-adjacent clients (NSI model) given CUI compliance constraints?
- Is the $5k/month WorkSage alpha access pricing appropriate, or should it be tiered by number of active projects?
- At what studio headcount does the single-producer bottleneck reliably appear, and what is the minimum intervention to address it?

---

## Source Index

| ID | Source Type | Date | Notes |
|---|---|---|---|
| chatgpt_67ac97d7 | ChatGPT | 2025-02-12 | NBI rate sheet |
| chatgpt_68e3cfc8 | ChatGPT | 2025-10-06 | MTX strategy SoW |
| chatgpt_68ede5cf | ChatGPT | 2025-10-14 | Revenue forecast model spec |
| chatgpt_69025031 | ChatGPT | 2025-10-29 | CH initial engagement pricing |
| chatgpt_6907ec33 | ChatGPT | 2025-11-02 | Evidence Table methodology |
| chatgpt_6972eb8d | ChatGPT | 2026-01-23 | Two-lane AI adoption |
| chatgpt_6972eb79 | ChatGPT | 2026-01-23 | Website UX audit methodology |
| goals_sow_proposal_2026-03-31 | OneDrive | 2026-03-31 | PlayGOALS SOW proposal |
| goals_red_team_report_2026-04-21 | OneDrive | 2026-04-21 | Red team methodology |
| handoff_2026-04-06a | Claude | 2026-04-06 | Health state policy |
| handoff_2026-04-21_goals_deliverables | Claude | 2026-04-21 | Three-artifact delivery |
| ch_offsite_pre_decisions_2026-04-27 | OneDrive | 2026-04-27 | CH strategic pre-decisions |
| ch_offsite_pre_read_2026-04-27 | OneDrive | 2026-04-27 | Offsite pre-read template (anonymised) |
| ch_offsite_agenda_2026-04-27 | OneDrive | 2026-04-27 | 3-day offsite methodology (anonymised) |
| ch_offsite_working_doc_2026-04-27 | OneDrive | 2026-04-27 | Facilitation playbook (anonymised) |
| granola_50612dd7 | Granola | 2026-04-13 | CH external validation / audit-first |
| granola_5fdd8c18 | Granola | 2026-04-28 | Production framework / offsite day 2 |
| ch_studio_business_items_2026-04 | OneDrive | 2026-04-28 | GTM + BD backlog template (anonymised) |
| nbi_ead_framework_2026-05-15 | OneDrive | 2026-05-15 | EAD framework |
| granola_05c3ee6b | Granola | 2026-05-22 | WorkSage $5k/month win |
| granola_f404fbcc | Granola | 2026-04-23 | Revenue targets, client updates |
| granola_6caf9e44 | Granola | 2026-05-13 | BD wins, payment delays |
| gmail_composite_hiring_wave | Gmail | 2026-05-25 | CH hiring wave overview |
| gmail_19bd68df4acebc2a | Gmail | 2026-05-26 | Recruitment agency strategy |
| gmail_19df7a1b8aa33db5 | Gmail | 2026-05-25 | Offer declined (methodology) |
| gmail_19e3b1c434f765ba | Gmail | 2026-05-25 | Gary Platner contract / HR overload |
| gmail_19e505e5c54726bd | Gmail | 2026-05-25 | VFX lead hiring pipeline |
| slack_aris-dm_2026-05-25_hiring | Slack | 2026-05-25 | Hiring scorecard methodology |
| slack_lorenza-dm_2026-05-25_contracts | Slack | 2026-05-25 | Contract flexibility |
| slack_production-council_2026-05-25_escalation | Slack | 2026-05-25 | Chain-of-command bypass |
| goals_beta_community_sentiment | OneDrive | 2026-05-25 | Beta NPS + friction (anonymised) |
| goals_release_liveops_2026-04 | OneDrive | 2026-05-25 | LiveOps roadmap (anonymised) |
| goals_client_brain_2026-05-12 | OneDrive | 2026-05-25 | Beta metrics + economy data |
| lighthouse_design_system | OneDrive | 2026-05-25 | Client-branded design system |

**Restricted extracts skipped (content excluded, IDs listed for audit):**
- `granola_b8ea7c8c` — studio vision/culture call
- `granola_c105bb66` — 4-quadrant team review
- `granola_156a5b5e` — CTO decision + fundraising strategy
- `granola_42bdb273` — CTO candidates detailed assessment
- `granola_b3eed99d` — CTO candidate compensation discussion
- `gmail_19dfdf4dd46d86f7` — Senior Level Designer offer reaction
- `gmail_19df79fb4b8683c3` — Senior hire offer letter with revised salary
- `granola_89fd69cd` — Head of Design contract negotiation and equity terms
