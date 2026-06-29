---
title: Client Patterns
slug: client_patterns
last_compiled: 2026-06-26
extract_count: 62
role_associations: [producer, head_of_people, general_counsel, production_consultant]
description: Patterns NBI observes repeatedly across client engagements. What breaks, what gets hidden, what actually works. Primary evidence from a ~65-70-person remote MMO studio engagement (April-June 2026). All client identifiers anonymised.
---

# Client Patterns

## Executive Summary

This bank documents repeating patterns across NBI client engagements, with primary evidence from a deep 2026 engagement with a ~65-70-person remote MMO studio in transition from prototype to production. Secondary patterns from prior NBI advisory work and published studio case studies. The bank is strongest on the 40-100 person studio navigating founder-led culture, production structure uplift, team composition issues, and employment/HR complexity. It is weaker on mobile-first studios and client-side publisher relationships.

Eight new entries added June 2026 (first batch): garden leave eligibility gap, staged replacement methodology, employee survey timing, studio seniority distribution, managing founder midnight ideas, producer as cross-department defect translator, quad assessment for production readiness, AI-native hiring advisory. Eight further entries added June 2026 (second batch): live service vs box game mindset gap, VS real game anxiety pattern, poisoned phrase problem, CTO assessment criteria for live service studios, meeting bloat and the decision owner fix, milestone as advisory lever for funded studios, junior hire support requirements for remote studios, executive RAG meeting format. Three further entries added June 24 2026: estimate inflation control (sequential challenge discipline and the "shenanigans" call-out culture; scope capitulation prevention via explicit constraint escalation), ATS pipeline management (5-candidate threshold per open role, scorecard automation via ATS dropdowns, spreadsheet hygiene), hire slowly fire fast (toxicity as existential risk at senior level; heightened stakes for remote studios without osmotic detection). Five further entries added June 26 2026: four-layer studio meeting cadence fully developed (exec, studio leadership, product council, leads; legal/HR attendance rules; project-level not department-level RAG framing); 80/20 staff mix target with director two-dimension performance assessment and phased departure communication framing; IR35 and contractor classification risk (£60K per incident, label evidence risk, multi-jurisdiction exposure, recruiter scripting, day-rate gross-up methodology); VS staffing model and lead estimation calibration (efficiency ratings, DoD-first discipline, scope framing with leadership).

---

## Common Client Challenges

### Production Maturity is Almost Always Lower Than Presented

Studios in the 40-100 person range systematically present themselves as further along in production than they are. Observed signals: working prototype code without GDDs or TDDs; impressive art against undocumented core systems; feature scope 2-3x larger than assumed when first formally estimated; design approval bypassed routinely. The gap is not incompetence -- it is the natural result of informal working at smaller scale, without the formal structures that production at this size requires. [source: granola_5fdd8c18, granola_4005eb22, granola_ae650223]

### Scope Scope Scope

The most common single failure mode: scope is not controlled at the point of acceptance. Features are added informally. Design approval is bypassed. Founders inject new ideas mid-sprint. The studio has no formal process for saying no. The result: at the point when a formal estimate is first produced, the implied scope is 2-5x what the team believed. Every engagement involving production structure work has hit this pattern. [source: granola_4e145b7b, not_3bUR2wWsPQvo8n_scope, 2026-06-19_founder-idea-log-scope-governance]

### Estimate Inflation as Default Behaviour

Estimates balloon when left unchallenged, and the inflation is systematic, not occasional. One lead's vertical slice estimate moved from 1,600 days to 800 days to approximately 3 months when challenged sequentially -- the final number was the real one all along. Art estimates specifically default to "fully shipped" quality rather than prototype tiers, inflating all downstream planning.

Two interventions that work together: (1) codify tier language (e.g. tier 2/3/4) agreed across all disciplines so "done" means the same thing everywhere, removing the art-to-shipped-quality default; (2) adopt a non-confrontational call-out signal -- one studio used "shenanigans" as a word any team member could use to flag an inflated claim, forcing justification without personal conflict.

Estimate challenges must be sequential and persistent, not one-time. Art estimates consistently banking to shipped quality is a systemic pattern, not individual error; tier language fixes it at the definition level rather than requiring repeated individual correction. Estimates made without a definition of done are estimates to full launch by default -- always establish the DoD before soliciting hours. [source: 2026-06-24_estimate-challenge-scope-discipline, 2026-06-26_ch-vs-staffing-efficiency-ratings]

### Scope Capitulation

Design intent is quietly altered in one-off conversations without visibility to leadership. The scope change is only discovered after the deadline slip. The correct response at the point of pressure is to state a constraint explicitly ("I need another month if you want X") so it can be escalated to producers, interrogated, and either accepted or rejected by leadership -- not absorbed silently. A shared document logging scope "flashpoints" gives leadership a monitoring layer without requiring them to attend every conversation. [source: 2026-06-24_estimate-challenge-scope-discipline]

### The Single Producer Failure

Studios in the 40-70 person range routinely have a single producer managing game content, platform work, backend, build pipelines, playtests, partners, and vendors. This fails non-linearly as headcount grows. The configuration works to ~25 people and is critical risk above ~40. Remediation: an Executive Producer overseeing four discipline tracks (QA, Audio, Art, Design), each with an embedded producer. [source: chatgpt_69034e5d]

### Chain-of-Command Bypass as Root Cause

The majority of rework in NBI engagements traces to chain-of-command bypass. A senior person tasks someone directly without going through the established approval chain. The work starts. Later review reveals it contradicts an existing decision. Governance process: Creative Director signals intent > Design designs > Team feeds back > Game Director considers > three-party approval (Game Director + Executive Producer + Creative Director) before any commitment. Without this, every approved decision is at risk of being superseded informally. [source: slack_production-council_2026-05-25_process]

### Documentation Gap Hidden by Enthusiasm

Teams are enthusiastic about their work and talk persuasively about progress. The gap: documentation does not match verbal progress. When first reviewed formally (GDD/TDD completion rate, feature estimation spreadsheets, design doc audit), the structural gaps become visible immediately. Clients often do not know the gap exists because their internal review process was also verbal, not document-based. [source: granola_4005eb22, granola_d977d66a]

### Live Service vs Box Game Mindset Gap

A pattern in live service studio engagements: the head of development is building as if shipping a contained box product while the studio's commercial model requires live service architecture from day one. The signal: the development lead has polished the base product with no plan for post-launch content, player economy, or live operations. This gap does not surface until an investor Alpha review or publisher check-in, at which point only 3 months remain before ship -- insufficient to build live service infrastructure. Advisory intervention: establish a hard cutoff date for base game systems (everything unfinished ships as live content post-launch); align the head of development explicitly on the two-phase model before producers arrive. Must be identified and addressed in pre-production. [source: 2026-06-22_live-service-vs-box-game-mindset-gap]

### VS "Building the Real Game" Anxiety

During vertical slice phases, teams often develop hedged effort -- treating VS assets as "temporary" or "for the VS only" rather than building the real game. Unconfirmed features appear in pipeline meetings. Multiple department heads independently flag concern without connecting that they are all experiencing the same anxiety. Advisory intervention: explicit mandate from studio leadership that every VS asset is the real game; confirmed-only scope enforced in pipeline meetings; repeated framing, not a one-time announcement. Key insight: scope anxiety and scope creep are the same phenomenon -- uncertainty about what is real drives teams to hedge effort while simultaneously expanding scope. [source: 2026-06-23_vertical-slice-real-game-framing]

### Poisoned Phrase Problem

A recurring communication pattern in founder-led studios: a phrase becomes toxic because it was associated with a specific failed initiative. Intervention: (1) identify which phrase is poisoned and what failure it references; (2) understand what the stakeholder objected to vs what they actually want; (3) find an alternative phrase that describes the desired outcome; (4) introduce the reframe proactively before others use the old language in front of leadership. Example: "guild hall" = poisoned by a prior failed multi-month initiative; "proof of completion" / "fully dressed map" = safe alternatives for the same underlying concept. [source: 2026-06-22_poisoned-phrase-studio-culture-reframing]

### Garden Leave Eligibility Gap

Employment contracts at founder-led studios routinely have a garden leave clause that applies only to company-initiated terminations. When a high-value employee resigns, the studio has no mechanism to enforce garden leave. The three-tier contract fix: (1) probation exits: no garden leave, one week notice; (2) company-initiated termination: full PILON + garden leave; (3) employee-initiated resignation: garden leave equivalent to notice period, activated at company discretion. Seen in two separate client engagements. [source: 2026-06-19_garden-leave-eligibility-contract-gap]

### Staged Replacement: When Underperformers Must Go

Clients resist replacing underperformers because the process feels disruptive. The staged replacement methodology converts this from a culture shock into an incremental process: (1) open the replacement role; (2) recruit and identify the candidate; (3) 2-3 week overlap (handover, knowledge transfer); (4) exit the underperformer. Wave sizing: 3-5-7-8, not all at once. Key observation: some underperformers self-select out once new hires arrive, reducing the managed exit count. [source: 2026-06-19_staged-studio-replacement-methodology]

### Studio Seniority Distribution and 80/20 Staff Mix

Clients running 40-70 person studios often have a junior-heavy composition that creates quality problems at scale. Advisory standard: ~60% seniors, ~30% mids, ~10% juniors (only with real mentorship infrastructure). Remote juniors without senior mentors develop bad habits or stall.

The 80/20 target at production scale: target 80% mid/senior, 20% junior. Risk rationale: in a market of 20,000+ Steam releases per year, "good enough" output does not clear the bar. High junior ratios mean more management overhead per deliverable and slower quality iteration.

Phased departure and backfill: groups of 2-3 with 2-3 weeks pipeline overlap; replacement pipelining begins before departure notification. Communication framing: "evolution phase" and "skill uplift" not layoff or restructure language -- each departure has a corresponding backfill to support the net-growth narrative. [source: 2026-06-19_studio-seniority-distribution-target, 2026-06-22_junior-hire-policy-remote-studio, 2026-06-25_ch-studio-staff-mix-80-20]

### Employee Survey Timing

Clients want to run satisfaction surveys to understand team sentiment. Advisory: do not launch until the client has capacity to act on results. A survey creates a commitment backlog. Launching before infrastructure exists creates visible expectations that go unmet, damaging trust more than the survey helped. Target timing for survey: after Jira, build pipelines, and vertical slice are stable and moving. [source: 2026-06-19_employee-survey-timing-principle]

### Managing Founder "Midnight Ideas"

A recurring pattern in founder-led studios: the founder generates scope change requests ad hoc, bypassing production planning. Mechanism: a shared idea log where anyone receiving an ad-hoc request from the founder adds the item for weekly review. Items are not acted on ad hoc. Showing founders all their own ideas in one place is a natural self-regulator. For in-meeting scope interrupts: the lead handles the interruption in the moment; pattern coaching happens in the founder's direct 1:1, never in front of the team. [source: 2026-06-19_founder-idea-log-scope-governance]

### Contractor Compliance: IR35 and Classification Risk

Studios with mixed contractor/FTE workforces face employment classification claims when contractors invoice at a fixed monthly rate during time off. Paper trails in project management tools labelling contractor absence as "paid leave" constitute evidence in labour court. UK IR35 fine: ~£60K per incident. Spain misclassification: up to €55K. A studio discovered ~£120K exposure from two simultaneous violation types for a single contractor.

Root causes: recruiters made verbal promises about leave entitlements during hiring without understanding contractor law; HR systems tracked absence as "vacation" or "paid leave" -- these labels are tribunal evidence; studio absorbed a prior settlement rather than changing the underlying practice.

The fix: gross-up day rate to cover expected time off; rename all leave labels to "out of office"; contractors "notify" leads of unavailability -- they do not "request" approval; no sick pay, no holiday pay, no parental leave clauses in contractor agreements. Day-rate calculation: monthly rate divided by 22.5 working days gives the theoretical rate; expected working days per year are approximately 226 (after ~36 days of personal and studio closure time); new monthly rate is divided by ~18 working days to build in the uplift. Soft cap of 20 billable days per month; overtime above cap requires lead approval.

Rollout: pilot with 3 trusted contractors first; studio-wide via live call; key message: "We are not removing benefits -- we are reshaping how you receive them."

Jurisdiction scope: UK (IR35 per incident), Belgium, Spain, Germany all have equivalent exposure. A studio with EU contractors across multiple countries has multiple simultaneous exposure points. Correct recruiter response to "do you offer vacation?": "your rate is structured to cover time you won't be billing; we do not offer vacation" -- never use the word "offer." [source: 2026-06-26_ch-contractor-day-rate-compliance, 2026-06-26_ch-ir35-contractor-classification-risk]

---

## Delivery Patterns

### Meeting Governance: Four-Layer Structure and Decision Owner Fix

**Meeting bloat and the decision owner fix:** A pattern in studios past ~40 people: meetings expand to include everyone and collapse into non-decisions. The 12-person, 45-minute meeting with no outcome is the failure pattern -- it emerges because no one knows who is authorised to decide, so everyone attends to protect their position. Advisory fix: map the handoff pipeline, assign a named decision owner per stage, restrict meeting attendees to decision makers for that stage only.

**Four-layer studio meeting structure:** Studios past ~30 people need a structured cadence that separates audience by decision level: (1) Executive/C-level -- founders, advisors, GC, CFO; agenda: run the business, staffing decisions, financial runway; (2) Studio leadership -- department directors and above; agenda: product and studio health, directors own their vertical; (3) Product Council/Directors -- all directors and producers; agenda: alignment and feedback flowing up and down; (4) Leads -- team leads per discipline; agenda: team-level updates, blockers, sprint commitments. Key design: legal and HR attend executive layer (required) and studio leadership (initially required, becomes optional as trust builds). Mixed audience suppresses hard executive conversations. Status framing is project-level ("Investment round = red") not department-level ("Legal = red") -- removes defensive posturing and focuses the room on solving the constraint. Each layer escalates only what needs a decision upward.

**Executive RAG complement:** Action items first (names visible), each area owner gets 5-7 minutes (RAG + plan + closure date), no problem-solving in this meeting (triage and accountability only), persistent item titles week-to-week. [source: 2026-06-23_decision-owner-meeting-discipline, 2026-06-23_executive-rag-meeting-format, 2026-06-25_ch-four-layer-meeting-structure]

### Producer as Cross-Department Defect Translator

The most effective producers in NBI-supported engagements act as defect translators between departments -- not just tracking work, but auditing request quality before work starts and output quality before sign-off. The pattern: (1) check the ask before work begins; (2) check the output before sign-off; (3) track defect patterns in retrospectives; (4) feed rework into the producer backlog. Escalation: one defect = human, flagged internally; repeated pattern = escalate to their director; persistent pattern = escalate to COO or fractional head of studio. [source: 2026-06-19_producer-cross-dept-defect-translator]

### Quad Assessment for Production Readiness

A one-time structured team evaluation for entering a high-stakes production phase. Core question: "Can this person deliver high-quality [product type] content in their craft, at speed, right now?" Result tiers: (1) Hard cuts (red triangle) -- first priority, managed exit; (2) Stars/saves -- director personally owns the save; (3) Juniors (flagged J) -- separate consideration track; (4) Unmarked -- exits but lower urgency. Lead cap ("you get three picks") forces honest assessments. [source: 2026-06-19_quad-assessment-staff-segmentation]

### Director Performance Assessment

Two dimensions: (1) command presence and ability to give direct negative feedback; (2) discipline-specific technical output. Technically strong but leadership-weak directors are as risky as technically weak ones -- the technical skill creates false confidence in the overall rating. Rapid improvement path: present anonymous staff feedback with concrete examples in a structured 1:1; set a clear behavioural change target; define a review date; if improvement occurs, close the matter. [source: 2026-06-25_ch-studio-staff-mix-80-20]

### VS Staffing Model and Lead Estimation Calibration

When advising a studio on VS planning, the staffing model must account for efficiency ratings per person, not raw headcount. Model structure: hours per role divided by 20 working days per month divided by effective headcount gives months required or additional hires needed. Calibration problems: leads setting optimistic efficiency ratings for low-output staff; estimates made before a definition of done was established default to full launch scope; single large estimates often contain 20-30% padding that one additional hire can halve; QA estimates based on a one-person model are structurally credible but need scrutiny.

Advisory fix: lead estimation capability assessment (1-5 scale with 2-3 sentences of evidence) before relying on incoming numbers. Purpose: identify who needs training and how far to trust the inputs. Bad estimators in a spreadsheet will be bad estimators in Jira; the tool does not fix the skill.

Scope framing with leadership: "how much of the VS can we close this month?" not a fixed end date. Fixed end dates inflate team behaviour -- individual leads pad to fill the deadline. [source: 2026-06-26_ch-vs-staffing-efficiency-ratings]

### CTO Assessment Criteria for Live Service Studios

Live service / MMO experience is a threshold requirement for CTO roles at live service or persistent world games -- not a preference. A CTO with a single-player-only portfolio optimises for a shipped box product, not for a game that runs and evolves for years post-launch. Assessment framework: (1) live service / MMO credits required at lead or principal level -- absence is disqualifying unless other signals compensate; (2) how the CTO role was earned -- roles filled by vacancy carry lower confidence than roles earned upward; (3) investor optics vs actual role requirements; (4) culture fit with founding team; (5) salary expectations calibrated to studio stage. Positive signal: a candidate who pushes back on clearly bad ideas in an interview is demonstrating executive independence. [source: 2026-06-23_cto-assessment-live-service-threshold]

### Milestone as Advisory Lever for Funded Studios

Studios with stable investor backing and no external deadline routinely drift. Advisory lever: set a hard internal milestone with no conference attached, purely to force the production discipline cycle (estimate, build, ship). Frame it explicitly to the client: the milestone is not for showing investors -- it is for teaching the studio to execute. Secondary benefit: once a studio ships to a milestone, it has evidence it can execute. Investor readiness follows from production discipline, not the other way around. [source: 2026-06-22_milestone-purpose-pressure-not-conference]

### Blind Affinity Estimation (Offsite Delivery Pattern)

Feature estimation in NBI offsites uses blind affinity planning: all estimators assign independently before comparing. Cross-validation by a second expert per estimate. Structured discussion only when estimates diverge by more than 5 days. Min/mid/max ranges to surface uncertainty -- wide gaps are documentation problems, not estimation errors. Tooling (Jira) configured only after structure and estimates are confirmed. [source: granola_8b912e8e, not_zBxoQexM2abxz9, not_Vn1AdPFNDQgWTj]

### Three-Day Offsite for Studio Transformation

NBI-delivered leadership offsite pattern (8-9 senior attendees): Day 1 -- foundation, goal statement, feature sweep at 2 min/row with "L by default" sizing; Day 2 -- gate-passing criteria ("the single most leveraged hour"), GTM, community strategy; Day 3 -- pipeline RACI maps, staff assessment (C-level only). Binding strategic decisions laid down before the offsite prevent relitigating in the room. Post-offsite: written decision records, not meeting notes. [source: ch_offsite_agenda_2026-04-27]

### S-Curve Change Management

Introducing structural change to a studio in batches (S-curves) is more effective than continuous drip-feeding. Model: introduce a defined cluster of changes > allow stabilisation > repeat. Key risk: a new senior hire making independent structural changes during a stabilisation period resets the timeline. The studio owner must manage this actively. [source: not_ireYPwXIKrrsWd_scurve]

### Scope Fear Containment

When a studio first sees its full VS scope for the first time, a predictable fear response triggers scope-cut proposals. NBI containment framework: (1) all cut proposals go into a designated document -- no immediate decisions; (2) scope ownership clarified -- decisions belong to a named core group only; (3) fear acknowledged openly in the room; (4) studio head meets the most affected department directly to reframe scope ownership. [source: not_4nWBkRC4r7TVRQ_vs_fear]

### AI-Native Hiring Advisory

As of 2026, Sega requires an AI component in analyst interviews. Studios and analytics clients hiring into data/analytics roles should design hiring criteria around demonstrated LLM capability, not just domain knowledge. The workforce planning question shifts: "how many analysts?" becomes "do we need one instead of three, with AI leverage?" Advisory position: AI fluency matters more than raw technical skill over any 3-year employment horizon. [source: 2026-06-19_ai-native-hiring-analytics-standard]

---

## HR and Employment Patterns

### Slack DSAR Liability

UK employment disputes trigger Data Subject Access Requests (DSARs) that retrieve all Slack messages. Senior leaders frequently use Slack as if it were a private channel for informal HR commentary. Briefing required: HoDs must understand that Slack is not a private communication tool. Sensitive HR discussions must use appropriately documented channels. This is not theoretical -- DSARs have been used in employment disputes and the messages are fully retrievable. [source: not_4nWBkRC4r7TVRQ_dsar]

### Early Probation Exit Documentation

UK studios on standard probation terms often face situations where a recent hire is clearly misaligned but no formal performance process has been documented. Three grounds for early termination with credible documentation: (1) declaration of incapacity -- the employee's own verbal statement is the strongest possible documentation basis; (2) competency misrepresentation at hire; (3) structural misalignment signals -- positioning for a more senior role or contradicting a peer lead within weeks of joining. From 1 January 2027, unfair dismissal rights begin at 6 months of service (reduced from 2 years) -- exits past 6 months will carry higher procedural risk. [source: not_HubmSolirYMTbM, not_CPGgraRzP9tMoz, not_ireYPwXIKrrsWd_contractor_lexicon]

### Hiring Pipeline Governance

Clients routinely have weak pipeline discipline -- few candidates, late-stage collapses, no screening sequence. Minimum viable pipeline governance: (1) any open role with fewer than 3 valid candidates is red status; (2) lead-level and above require scorecards and background checks; (3) HR screening as first step -- collects salary expectations, contract type, relocation interest before technical evaluation. [source: not_4nWBkRC4r7TVRQ_hiring_governance, granola_c3cc29b7]

### ATS Hiring Pipeline Management

A working model for managing a large hiring pipeline via an ATS with a third-party recruiter, observed at a ~55-person remote MMO studio:

- **Pipeline threshold:** five candidates per open role is the working target. Ideal state is two strong finalists before offer. Below five means the pipeline is underpowered.
- **Scorecard automation:** interviewers added as dropdowns in the ATS; hiring managers configure the question set; scorecards sent via email link. All parties get shared visibility without a manual debrief cycle.
- **Friction point:** slow scorecard returns from hiring managers is the recurring bottleneck, not recruiter throughput.
- **Priority discipline:** recruiter needs real-time notification when role priorities shift; late notification causes pipeline misalignment.
- **Role open until start date:** when a hire is made but not yet joined, the role remains open in the ATS.

ATS automates the debrief workflow, replacing manual scheduling. [source: 2026-06-24_ats-hiring-workflow-methodology]

### Hire Slowly, Fire Fast -- Toxicity as Existential Risk

A hiring philosophy articulated in the context of a senior technical candidate interview: hire slowly, fire fast. Extended due diligence before committing; decisiveness when the decision to exit becomes clear.

The rationale: toxic individuals threaten the whole studio. One bad hire at a senior level can destabilise team culture across multiple squads. This applies with particular force to technical leadership roles. For fully remote studios this discipline matters more acutely -- cultural problems from a toxic hire are harder to detect without physical colocation. Contrast the positive signal noted under CTO assessment criteria: a candidate who pushes back appropriately in an interview is showing the independence you want, not a toxicity flag. [source: 2026-06-24_hire-slowly-fire-fast-philosophy]

---

## What Clients Hide (or Don't Know They're Hiding)

These patterns are not deliberate concealment -- clients often do not know these exist:

1. **Documentation completion is lower than reported.** Verbal progress reports are genuine but based on what exists in people's heads, not in files.

2. **The approval chain is not followed.** Leaders describe a robust process; in practice, informal approvals are the norm. The formal chain is invoked only for big decisions.

3. **Scope growth is invisible.** Features added informally are not tracked until a structured estimation exercise forces the total into view.

4. **Senior talent is thinner than presented.** Seniority titles are inflated. A "senior designer" is often a mid with 3-4 years of experience. This surfaces when quality-tier mapping is applied against actual output.

5. **Employment contracts have gaps.** Garden leave, IP assignment, and contractor/employee boundary clauses are frequently incomplete in founder-led studios. Legal review always surfaces at least one material gap.

6. **Build infrastructure is more fragile than reported.** Studios describe "a working build" but the stability, cadence, and team accessibility of that build is often far below what "working" implies.

7. **Commercial model misalignment is hidden by product focus.** Key technical or creative leaders may be building for a commercial model (box game) that differs from the studio's stated model (live service). This surfaces only under scrutiny from a publisher or investor.

8. **Contractor compliance gaps are not visible to the studio.** Studios with mixed contractor/FTE workforces often do not know they have been paying contractors for leave entitlements prohibited under IR35. The exposure only surfaces when a contractor or regulator initiates proceedings. A prior settlement often signals more exposure in the same contractor population.

---

## Engagement Delivery Patterns

### Written Decision Records Are Non-Negotiable

The single most common failure mode in NBI-supported studio engagements: decisions made in meetings are not written down. The team proceeds on recollection. Six weeks later, two different recollections are in conflict. Every NBI engagement now includes a decisions log as a mandatory deliverable from day one. Format: date, decision, owner, rationale, what was ruled out. Read at the start of every session. [source: granola_080a19f8]

### Red-Teaming Deliverables

All NBI deliverables (SoWs, reports, strategy documents) are red-teamed before delivery. Multi-role red teaming: senior engineer, GC, CEO perspectives applied to every deliverable. Evidence tables: every non-obvious factual claim mapped to source, date, confidence, and gap. [source: chatgpt_6907ec33]

### Scope-of-Work Structure

NBI SoWs follow a 15-section structure including: Executive Summary (top 8 risks), Scope and Deliverables, Acceptance Criteria (measurable, not subjective), Risk Register (top 20 ranked by impact x likelihood), and Evidence Table appendix. Acceptance criteria are the most-resisted section by clients -- they want discretion on sign-off. The criteria are non-negotiable. Disputes about scope are always about what "done" means; pre-agreed measurable criteria eliminate 80% of these. [source: chatgpt_6907ec33]

### Handling the Pushback Meeting

When a client pushes back on findings, the pattern: (1) acknowledge the pushback before responding; (2) return to evidence, not opinion; (3) separate the person assessment from the process assessment -- the process finding stands even if the person assessment is adjusted; (4) offer a written response window, not an in-meeting reversal. Reversing an evidence-based finding in the meeting is credibility damage that persists through the engagement. [source: not_4nWBkRC4r7TVRQ_vs_fear]

---

## Open Questions

1. **Client self-assessment accuracy:** How large is the typical gap between a client's self-assessment (maturity level) and NBI's diagnosis? Is there a consistent modifier?

2. **Garden leave enforcement success rate:** Of the studios that have adopted the three-tier contract fix, how many have successfully invoked garden leave on an employee-initiated resignation?

3. **Quad assessment downstream outcomes:** After a quad assessment, what proportion of "saves" succeed vs exit within 6 months?

4. **Founder idea log adoption:** Does formalising the idea log actually reduce ad-hoc founder interrupts, or does the founder treat the log as an additional channel?

5. **AI-native hiring criteria breadth:** Sega's 2026 requirement is the only primary data point. Is this a leading indicator of the wider industry, or sector-specific?

6. **S-curve timing:** What is the typical calendar duration of each S-curve, and what events mark the end of a stabilisation period?

7. **Live service mindset gap frequency:** How consistently does the live service vs box game misalignment appear across studios with non-live-service technical founders?

8. **IR35 multi-jurisdiction interaction:** Studios with contractors across UK and EU face simultaneous exposure points. No case data on how tribunals in different jurisdictions handle concurrent exposure from the same contractor.

9. **80/20 staff mix transition timeline:** How long does the phased departure and backfill approach typically take to move a studio from a 60/40 junior-heavy composition to 80/20 mid-senior? No primary data on calendar duration.

10. **Lead estimation capability improvement:** Of leads identified as poor estimators via the 1-5 assessment, how many improve measurably once the gap is named and training is provided?

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
| 2026-06-22_junior-hire-policy-remote-studio | Granola | Junior hire support policy for remote studios: training/mentoring/buddy/check-ins (anonymised) |
| 2026-06-22_live-service-vs-box-game-mindset-gap | Granola | Live service vs box game mindset gap in studio leadership (anonymised) |
| 2026-06-22_milestone-purpose-pressure-not-conference | Granola | Milestone as advisory lever for funded studios with no urgency (anonymised) |
| 2026-06-22_poisoned-phrase-studio-culture-reframing | Granola | Poisoned phrase problem: proactive terminology reframing (anonymised) |
| 2026-06-23_cto-assessment-live-service-threshold | Granola | CTO assessment criteria: live service experience as threshold requirement (anonymised) |
| 2026-06-23_decision-owner-meeting-discipline | Granola | Decision owner model: meeting bloat pattern and pipeline stage fix (anonymised) |
| 2026-06-23_executive-rag-meeting-format | Granola | Executive RAG meeting format: action-item-first, triage only (anonymised) |
| 2026-06-23_vertical-slice-real-game-framing | Granola | VS real game anxiety pattern: scope anxiety and scope creep as the same phenomenon (anonymised) |
| 2026-06-24_estimate-challenge-scope-discipline | Granola | Estimate inflation control: shenanigans call-out, sequential challenge, scope capitulation fix (anonymised) |
| 2026-06-24_ats-hiring-workflow-methodology | Granola | ATS hiring workflow: 5-candidate threshold, scorecard automation, spreadsheet hygiene (anonymised) |
| 2026-06-24_hire-slowly-fire-fast-philosophy | Granola | Hire slowly fire fast: toxicity as existential risk; remote studio heightened stakes (internal) |
| 2026-06-25_ch-four-layer-meeting-structure | Granola | Four-layer studio meeting cadence: exec, studio leadership, product council, leads (anonymised) |
| 2026-06-25_ch-studio-staff-mix-80-20 | Granola | 80/20 staff mix target; director two-dimension assessment; phased departure framing (anonymised) |
| 2026-06-26_ch-contractor-day-rate-compliance | Granola | Contractor day rate model: gross-up to eliminate vacation billing legal risk; IR35 fines (anonymised) |
| 2026-06-26_ch-ir35-contractor-classification-risk | Granola | IR35 misclassification risk: £60K per incident; label evidence risk; recruiter scripting (anonymised) |
| 2026-06-26_ch-vs-staffing-efficiency-ratings | Granola | VS staffing model: efficiency ratings, estimation calibration, scope framing with leadership (anonymised) |
