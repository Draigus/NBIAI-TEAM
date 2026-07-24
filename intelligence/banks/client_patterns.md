---
title: Client Patterns
slug: client_patterns
last_compiled: 2026-07-24
extract_count: 98
role_associations: [producer, head_of_people, general_counsel, production_consultant]
description: Patterns NBI observes repeatedly across client engagements. What breaks, what gets hidden, what actually works. Primary evidence from a ~65-70-person remote MMO studio engagement (April-July 2026). All client identifiers anonymised.
---

# Client Patterns

## Executive Summary

This bank documents repeating patterns across NBI client engagements, with primary evidence from a deep 2026 engagement with a ~65-70-person remote MMO studio in transition from prototype to production. Secondary patterns from prior NBI advisory work and published studio case studies. The bank is strongest on the 40-100 person studio navigating founder-led culture, production structure uplift, team composition issues, and employment/HR complexity. It is weaker on mobile-first studios and client-side publisher relationships.

Three new entries added 24 July 2026: dual-path TA recruiter model (embedded FTC + external contingency for 10+ role hiring windows; 9-month combined cost beats single 12-month TA hire; external recruiter unlock requires sharing the hiring plan first; disagree-and-commit framing for stakeholder disagreement); executive feedback toolbox (sledgehammer/screwdriver/scalpel tiered methodology; private conversation sets anchor before any public technique; passive/subtle feedback consistently fails -- directness required more often than coaches expect); ideation silo and shadow channel prevention (founder sharing ideas bilaterally creates misaligned leads; dedicated ideation channel with mandatory routing rule from leads, not founder, is the structural fix; game director must ask the founder to route through the channel).

Three new entries added 21 July 2026: live service alignment failure extended with "commitment without comprehension" CEO pattern and investor review as real decision point (Tencent-funded racing studio observation); publisher analytics control via embedded data scientist (access capture play disguised as support, with studio countermove); IR35 income-neutral day rate calibration model (216 billable-day formula, monthly soft cap, mid-year settlement approach) for studios remediating contractor compliance without triggering attrition.

Three new entries added July 16 2026: multi-jurisdiction contractor IP assignment gap (additional IP assignment agreement required for long-tenure contractors with cross-entity contracts; binary green/not-green status protocol for complex exits); Greek investor fundraising patterns (relationship-first timeline; SAFE structure simplicity for small tranches; family office single-contact dynamics); analytics delivery scope mismatch and leadership transition (UXR session-level granularity vs cohort-day interval architecture; AER pivot framework; flagging without blocking transfers risk; written handover plan mandatory; decision-maker is product owner not analytics lead).

Seven new entries added July 10 2026 (carry-forward 2 + new 5): scope-first headcount decision sequence (three-step mandatory gate before any hire approval; Jira-derived math requirement); QA Lead above strong IC (growth-enabling hiring sequencing advisory); major publisher alpha gate (production plan is the real risk, not game quality; Chinese publisher top-down process; too-big-to-fail dynamic); analytics tool default adoption vs deliberate evaluation (Superset over Power BI reversal; unprompted analyst deployment as adoption signal); concept art team underutilisation as Art Director failure signal (bypass pattern: senior leads routing AI reference; utilisation is a lagging indicator not a demand problem); tech artist hiring misfire (engine-depth gap masked by communicator strengths; panel composition failure); "polished playable" vs MVP vocabulary and C-level-first training sequence (VS as game-simulator diagnostic; training must start at C-level before cascading down). SIZE FLAG: bank now ~660 lines -- Glen split review required.

Five new entries added July 7 2026 (carry-forward 2 + new 3): red-pink-list onboarding framework for incoming studio leaders; UK contractor compliance failure points supplement (right-to-work, immigration, fintech banking); contractor exit protocol (graceful vs swift removal); CTO vs Technical Director role distinction and hiring advisory; pillar vs value-creation framework for stress-testing game vision. Eight new entries added June 2026 (first batch): garden leave eligibility gap, staged replacement methodology, employee survey timing, studio seniority distribution, managing founder midnight ideas, producer as cross-department defect translator, quad assessment for production readiness, AI-native hiring advisory. Eight further entries added June 2026 (second batch): live service vs box game mindset gap, VS real game anxiety pattern, poisoned phrase problem, CTO assessment criteria for live service studios, meeting bloat and the decision owner fix, milestone as advisory lever for funded studios, junior hire support requirements for remote studios, executive RAG meeting format. Three further entries added June 24 2026: estimate inflation control (sequential challenge discipline and the "shenanigans" call-out culture; scope capitulation prevention via explicit constraint escalation), ATS pipeline management (5-candidate threshold per open role, scorecard automation via ATS dropdowns, spreadsheet hygiene), hire slowly fire fast (toxicity as existential risk at senior level; heightened stakes for remote studios without osmotic detection). Five further entries added June 26 2026: four-layer studio meeting cadence fully developed (exec, studio leadership, product council, leads; legal/HR attendance rules; project-level not department-level RAG framing); 80/20 staff mix target with director two-dimension performance assessment and phased departure communication framing; IR35 and contractor classification risk (£60K per incident, label evidence risk, multi-jurisdiction exposure, recruiter scripting, day-rate gross-up methodology); VS staffing model and lead estimation calibration (efficiency ratings, DoD-first discipline, scope framing with leadership). Three further entries added June 30 2026: audience-first game design (for/against statements precede pillars; operations-friendly filter vs complex publisher personas); status deck review for publisher-facing reporting (what/why framing, tombstone risk blocks, before/after Jira movement, embedded analyst model); dual-mode operating contract for creative directors (visionary vs decisive mode domains; "us and them" pattern as operating contract symptom; layer-cake communication model). Six further entries added July 2 2026: leadership ratio framework for senior technical hires (management-to-doing phased progression; multi-stakeholder convergence as diagnostic signal); junior vs senior mindset diagnostic (response to incomplete builds as seniority tell); director accountability and production separation (non-delegable director functions; "stop cuddling directors" principle); strike-based employee performance protocol (three-strike re-engagement structure; decision attribution to senior advisor); executive meeting accountability redesign (Excel tracker replacing AI summaries; silence as enforcement mechanism); CEO founder priority framework (three priorities for first-time studio CEOs; conflict-avoidance pattern).

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

**"Commitment without comprehension" variant:** A distinct but related pattern appears when the CEO was sold on live service by investors 3-4 years earlier, under funding pressure, without being walked through what live service requires operationally. The studio then organises around the CEO's pre-existing product instincts (prestige quality, Metacritic scores) rather than the investor's commercial mandate. Unlike the development-team misalignment above, the CEO here knows the studio is building a live service product -- they simply have no operational model for what that means. Diagnostic signals: the creative director is consumed by alpha quality management with no bandwidth for live service design direction; an internal live service director has built a detailed concept but has no leadership champion and is working around leadership rather than through it. Resolution inflection point: the external investor review, not internal alignment, is what forces the issue -- the investor's revenue plan question surfaces the gap with a hard deadline attached. Advisory implication: when an internal live service lead reports no traction with leadership, diagnose this as CEO incentive misalignment (the CEO's incentives were set by a quality-first prior career) not a communication problem the live service director needs to solve differently. [source: 2026-07-17_live-service-studio-alignment-failure-pattern]

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

Phased departure and backfill: groups of 2-3 with 2-3 weeks pipeline overlap; replacement pipelining begins before departure notification. Communication framing: "evolution phase" and "skill uplift" not layoff or restructure language -- each departure has a corresponding backfill to support the net-growth narrative.

**Junior vs senior mindset diagnostic:** the response a team member gives to a partial vertical slice build is a cleaner seniority signal than their title or years of experience. Junior mindset: "when do I get to see the game?" -- waits for systems before engaging; treats incompleteness as a reason to defer contribution. Senior mindset: reads the roadmap, identifies the next constraint, and works backwards from the delivery date. This is the diagnostic moment in production assessment, useful for hiring interviews, probation reviews, and performance conversations alike. Coaching implication: where time allows, hiring a senior to model and mentor the mindset is lower risk than directly replacing a junior-mindset contributor -- the new standard becomes visible to the team before the exit occurs. [source: 2026-06-19_studio-seniority-distribution-target, 2026-06-22_junior-hire-policy-remote-studio, 2026-06-25_ch-studio-staff-mix-80-20, 2026-07-02_junior-vs-senior-mindset-production]

### Employee Survey Timing

Clients want to run satisfaction surveys to understand team sentiment. Advisory: do not launch until the client has capacity to act on results. A survey creates a commitment backlog. Launching before infrastructure exists creates visible expectations that go unmet, damaging trust more than the survey helped. Target timing for survey: after Jira, build pipelines, and vertical slice are stable and moving. [source: 2026-06-19_employee-survey-timing-principle]

### Managing Founder "Midnight Ideas" and Shadow Conversations

A recurring pattern in founder-led studios: the founder generates scope change requests ad hoc, bypassing production planning. Mechanism: a shared idea log where anyone receiving an ad-hoc request from the founder adds the item for weekly review. Items are not acted on ad hoc. Showing founders all their own ideas in one place is a natural self-regulator. For in-meeting scope interrupts: the lead handles the interruption in the moment; pattern coaching happens in the founder's direct 1:1, never in front of the team. [source: 2026-06-19_founder-idea-log-scope-governance]

**Shadow conversation silo pattern:** A more acute variant occurs when the founder shares creative or strategic ideas with each lead separately rather than through a structured channel. Each lead receives different information; nobody knows who else was consulted. The same topic runs in parallel private threads that never converge. Leads contradict each other in group settings because they received different briefs. The founder believes alignment has been reached when only individual conversations happened.

The structural fix: a dedicated ideation channel with a mandatory routing rule. Any lead who receives a private idea from a founder posts it in the channel -- the lead posts it, not the founder (this maintains the founder relationship while surfacing the content). The game director or EP is responsible for asking the founder directly to route new ideas through the channel rather than sending bilaterally. Sensitive HR or personnel matters remain bilateral; this fix applies to creative, scope, and strategic ideas only. [source: not_3bO0Su9glXKHUa]

### Contractor Compliance: IR35 and Classification Risk

Studios with mixed contractor/FTE workforces face employment classification claims when contractors invoice at a fixed monthly rate during time off. Paper trails in project management tools labelling contractor absence as "paid leave" constitute evidence in labour court. UK IR35 fine: ~£60K per incident. Spain misclassification: up to €55K. A studio discovered ~£120K exposure from two simultaneous violation types for a single contractor.

Root causes: recruiters made verbal promises about leave entitlements during hiring without understanding contractor law; HR systems tracked absence as "vacation" or "paid leave" -- these labels are tribunal evidence; studio absorbed a prior settlement rather than changing the underlying practice.

The fix: gross-up day rate to cover expected time off; rename all leave labels to "out of office"; contractors "notify" leads of unavailability -- they do not "request" approval; no sick pay, no holiday pay, no parental leave clauses in contractor agreements. Day-rate calculation: monthly rate divided by 22.5 working days gives the theoretical rate; expected working days per year are approximately 226 (after ~36 days of personal and studio closure time); new monthly rate is divided by ~18 working days to build in the uplift. Soft cap of 20 billable days per month; overtime above cap requires lead approval.

Rollout: pilot with 3 trusted contractors first; studio-wide via live call; key message: "We are not removing benefits -- we are reshaping how you receive them."

Jurisdiction scope: UK (IR35 per incident), Belgium, Spain, Germany all have equivalent exposure. A studio with EU contractors across multiple countries has multiple simultaneous exposure points. Correct recruiter response to "do you offer vacation?": "your rate is structured to cover time you won't be billing; we do not offer vacation" -- never use the word "offer." [source: 2026-06-26_ch-contractor-day-rate-compliance, 2026-06-26_ch-ir35-contractor-classification-risk]

**Income-neutral day rate reform model:** When a studio moves contractors from fixed monthly billing to daily rate billing, annual income can be protected by calibrating the daily rate against actual billable days. Standard formula: 260 total annual working days, less 36 expected vacation days and 8 sick days, equals 216 billable days. Set the daily rate so that 216 days of billing equals the contractor's prior annual income. Contractors who work their expected schedule earn the same total; the studio only pays for days actually worked, removing the IR35 leave-entitlement indicator. Governance structure for the new model: monthly soft cap (e.g. 20 days) with manager pre-approval required for additional days; a minimum quarterly threshold (e.g. 44 days = 80% of expected) as a contract breach trigger rather than a dismissal mechanism. All extra-day approvals happen before work starts, not at invoice stage. Activity monitoring caveat: audit trail tools (Slack, Jira, Perforce) are valid as reactive evidence when there is prior suspicion, but must not be positioned as daily monitoring -- framing them as surveillance adds employment indicators. Mid-year transition: calculate each contractor's vacation position under the old model, settle any over/under on the final old-format invoice, then start fresh. Rollout: Q&A roundtable before implementation alongside individual contractor letters surfaces objections early and signals transparency. [source: 2026-07-21_contractor-ir35-day-rate-reform-income-protection-model]

**Additional compliance failure points at scaling studios (supplementary):** Beyond IR35, UK studios that have grown rapidly without building HR infrastructure encounter a predictable cluster of further exposures: (1) right-to-work checks for UK contractors are routinely missed -- studios assume they apply only to FTE, not contractors; (2) immigration and sponsorship -- the certificate of sponsorship requires thorough HMRC and Home Office documentation before application, not in parallel with it; studios sponsoring international hires need the right-to-work infrastructure in place before the application, not assembled during it; (3) corporate banking -- some fintech business banks are not accepted by financial counterparties in regulated UK payroll and compliance contexts; traditional business banking is required. Remediation principle: fix compliance quietly before attracting regulatory attention -- do not invite scrutiny while remediating. Design the document and data pipeline first, then configure tooling to route documents correctly; not the reverse. Treat each infraction category as a separate workstream with a named owner. [source: 2026-07-06_ch-uk-contractor-compliance]

**Multi-jurisdiction contractor exit: IP assignment gap:** For contractors with long tenure (2+ years) who have signed contracts across multiple entities or jurisdictions -- for example, an operating company alongside a holding company, or a Cyprus entity alongside a UK entity -- the standard HR exit document is insufficient. Different IP clauses across the separate contracts create an assignment gap that the standard exit package does not close. An additional IP assignment agreement is required, drafted separately by legal counsel and not bundled into the HR exit package.

Process: (1) legal drafts the IP assignment agreement as a distinct legal deliverable; (2) HR receives the complete package (exit document plus IP assignment) before the exit conversation is scheduled; (3) the exit conversation occurs only when both documents are ready, not before. Preparing the HR document first and scheduling the conversation before legal has completed the IP assignment is the most common sequencing error.

Status reporting for complex exits: use binary "green / not green" per workstream, not narrative updates. Each responsible party (legal, HR) confirms their workstream in bullets only: what is done, what is pending. This prevents an exit from proceeding on assumed readiness -- the "green" signal from each party must be explicit, not inferred from silence. The pattern is applicable to any multi-workstream exit process, not only IP assignment situations. [source: 2026-07-16_contractor-exit-ip-assignment-legal-checklist-protocol]

---

## Delivery Patterns

### Meeting Governance: Four-Layer Structure, Decision Owner Fix, and Accountability Redesign

**Meeting bloat and the decision owner fix:** A pattern in studios past ~40 people: meetings expand to include everyone and collapse into non-decisions. The 12-person, 45-minute meeting with no outcome is the failure pattern -- it emerges because no one knows who is authorised to decide, so everyone attends to protect their position. Advisory fix: map the handoff pipeline, assign a named decision owner per stage, restrict meeting attendees to decision makers for that stage only.

**Four-layer studio meeting structure:** Studios past ~30 people need a structured cadence that separates audience by decision level: (1) Executive/C-level -- founders, advisors, GC, CFO; agenda: run the business, staffing decisions, financial runway; (2) Studio leadership -- department directors and above; agenda: product and studio health, directors own their vertical; (3) Product Council/Directors -- all directors and producers; agenda: alignment and feedback flowing up and down; (4) Leads -- team leads per discipline; agenda: team-level updates, blockers, sprint commitments. Key design: legal and HR attend executive layer (required) and studio leadership (initially required, becomes optional as trust builds). Mixed audience suppresses hard executive conversations. Status framing is project-level ("Investment round = red") not department-level ("Legal = red") -- removes defensive posturing and focuses the room on solving the constraint. Each layer escalates only what needs a decision upward.

**Executive RAG complement:** Action items first (names visible), each area owner gets 5-7 minutes (RAG + plan + closure date), no problem-solving in this meeting (triage and accountability only), persistent item titles week-to-week.

**Executive meeting accountability redesign:** AI-generated meeting summaries fail when they are verbose and unstructured -- participants cannot quickly identify what is red, what needs their attention, or what was decided. The replacement format: a shared spreadsheet with red/yellow/green status per person per week, inline mitigations for reds, explicit asks (what each person needs from others), hiring and people updates screen-shared as a prepared list rather than a narrative walkthrough, and outcomes logged at the bottom of each week's tab. Previous tabs locked once the week closes; contents fed into the company knowledge base for historical decision tracking. Accountability mechanism: if any attendee arrives without their section completed, the meeting pauses in silence until they do -- no verbal prompting, no excusing. Silence as the structural enforcer removes the social awkwardness of chasing and makes the expectation self-reinforcing. Meeting composition: C-suite only as standing attendees; other leads called in by topic. [source: 2026-06-23_decision-owner-meeting-discipline, 2026-06-23_executive-rag-meeting-format, 2026-06-25_ch-four-layer-meeting-structure, 2026-07-02_executive-meeting-accountability-redesign]

### Producer as Cross-Department Defect Translator

The most effective producers in NBI-supported engagements act as defect translators between departments -- not just tracking work, but auditing request quality before work starts and output quality before sign-off. The pattern: (1) check the ask before work begins; (2) check the output before sign-off; (3) track defect patterns in retrospectives; (4) feed rework into the producer backlog. Escalation: one defect = human, flagged internally; repeated pattern = escalate to their director; persistent pattern = escalate to COO or fractional head of studio. [source: 2026-06-19_producer-cross-dept-defect-translator]

### Director Accountability and Production Separation

A structural principle observed across multiple engagements: production staff cover for directors who are not performing their accountability functions, creating a perverse dynamic where directors have no incentive to improve.

Director accountabilities are non-delegable: (1) estimate quality -- directors commit to estimates they have reviewed; approval without reviewing is a performance failure, not a process gap; (2) scope management -- directors own the scope of their discipline; (3) team conflicts -- directors do not pass interpersonal friction to production to absorb; (4) delivery -- saying yes and not delivering is treated as dishonesty, not a planning problem.

Diagnostic: if a director cannot explain their own estimates, that is a coaching and performance moment, not a production problem. When production covers the gap repeatedly, directors never have to improve, and the cover-up surfaces eventually in more damaging form. Practical example: a director approved team estimates without reviewing them; senior production staff caught and corrected a 40% discrepancy.

Advisory instruction to Heads of Production: "stop cuddling directors." Reframe their role as escalation, not absorption. Escalation rule: one friction event = flag internally; recurring pattern = pass up; persistent pattern = structural action. Onboarding newly accountable directors: make the new expectation explicit from the start of the engagement -- do not continue covering while expecting behaviour to change. [source: 2026-07-02_director-accountability-production-separation]

### Leadership Ratio Framework for Senior Technical Hires

Senior technical hires at studios in the 40-70 person range frequently drift toward full management -- organising, coordinating, scheduling -- at the expense of hands-on discipline work. The pattern is often invisible until multiple stakeholders independently raise the same concern. The multi-stakeholder convergence signal (CEO, COO, HR, and internal team all flagging the same gap independently) is diagnostic: the gap is real and the response should be specific and immediate, not deferred to a formal performance review cycle.

Phased ratio model: Phase 1 target is 60/40 (managing/doing), corrected from ~80/20. The Phase 1 target addresses the most visible problem -- junior team members are not learning because the lead cannot model or demonstrate the skill -- without demanding an overnight shift. Phase 2 target, once stabilised, is 50/30/20 (managing/doing/cross-team coordination with art, engineering, and game design peers).

Coaching requirement: define concrete deliverables for what "hands-on" means for the specific role. "Do more doing" is not an actionable instruction. Specify the output expected (e.g. a particular asset tier, a specific review deliverable, a weekly craft contribution). Follow-up cadence matters: book explicit follow-up before the new behaviour sets in -- a one-week lag between the coaching conversation and re-engagement is too long under vertical slice delivery pressure. [source: 2026-07-02_leadership-ratio-management-to-doing]

### CEO/Founder Priority Framework

A three-priority coaching frame for a studio founder-CEO who has not held a CEO role before, designed to focus their attention on the functions only the CEO can perform:

1. Champion the culture of the studio -- visible role model, steward of values, the person the studio looks to when behaviour is ambiguous.
2. Investor relations and fundraising -- primary external-facing function; the CEO is the right face for capital conversations, not the COO or advisors.
3. Pick three judgment calls per week to make the studio better -- decision muscle-building; actively choosing small improvements rather than waiting for problems to escalate.

Common failure mode: the founder-CEO agrees in a meeting, then reverses after a one-on-one with a subordinate who applies emotional pressure. This pattern is invisible to the COO unless it is explicitly named and mapped. It is the single most destabilising failure mode for a first-time studio CEO -- it undermines the management chain across every layer below it.

Coaching tactics: use silence to force real listening rather than filling the space; pick spots and timing rather than repeating the same instruction; reframe as "fake it till you make it" -- if the behaviour is right, the habit forms. Parallel focus areas for the COO coaching the CEO: pay attention and remember context across meetings; actively challenge reds and yellows rather than simply receiving updates; guide directs rather than update them; separate awareness from action (knowing something is a problem is not the same as directing it to be fixed). [source: 2026-07-02_ceo-founder-priority-framework]

### Executive Feedback Toolbox: Sledgehammer / Screwdriver / Scalpel

A tiered feedback methodology for coaching studio executives and managing founder behaviour in mixed-company settings. The three tools form an escalation and calibration sequence, not alternatives to each other.

**Sledgehammer:** direct, private. Used to set the anchor. Without the private sledgehammer conversation, every public technique that follows has no foundation to land on.

**Screwdriver:** adjusting. Applied when calibration is needed, not a full reset. Deployed after the anchor is established.

**Scalpel:** subtle, in mixed company. Precise and minimal -- effective only because the private sledgehammer already hit. Example: stepping in front of someone in an exec call to redirect is a scalpel move -- target-visible but not audience-visible. This is not public criticism; it is a private signal in a shared room.

Operating principle: private conversations set the anchor; public techniques only land because the private work already happened. Public correction without prior private alignment is ineffective and damages credibility. Almost never deploy public criticism directly -- reframe instead ("good that we've identified this, let's improve").

Escalation ladder within each tool: (1) give information (share what you observed); (2) observe capacity (does the person pick it up?); (3) raise directness only if needed. Nine times out of ten, the escalation ladder does not need to reach full directness. However, passive or subtle feedback consistently fails -- people do not pick up on what the giver expects them to notice. Coaches under-estimate how often explicit directness is required.

Sticky note coaching supplement: three keywords on the left of the monitor (how to show up) and tools on the right. Risk: subjects may over-index to extremes on a single word. Mitigation: when over-indexing is observed, prompt "what's the other word on your sticky?" Narrative and metaphor framing works well alongside keyword prompts. Internalising any tool to unconscious habit takes time; layer tools in sequence rather than simultaneously.

Founder coaching note: founders who attempt to adopt a "standard CEO profile" often become less effective than when they lead as themselves. Coaching goal is to channel the native leadership style, not replace it. [source: not_7pWBMRvnbfBop8]

### Quad Assessment for Production Readiness

A one-time structured team evaluation for entering a high-stakes production phase. Core question: "Can this person deliver high-quality [product type] content in their craft, at speed, right now?" Result tiers: (1) Hard cuts (red triangle) -- first priority, managed exit; (2) Stars/saves -- director personally owns the save; (3) Juniors (flagged J) -- separate consideration track; (4) Unmarked -- exits but lower urgency. Lead cap ("you get three picks") forces honest assessments. [source: 2026-06-19_quad-assessment-staff-segmentation]

### Director Performance Assessment

Two dimensions: (1) command presence and ability to give direct negative feedback; (2) discipline-specific technical output. Technically strong but leadership-weak directors are as risky as technically weak ones -- the technical skill creates false confidence in the overall rating. Rapid improvement path: present anonymous staff feedback with concrete examples in a structured 1:1; set a clear behavioural change target; define a review date; if improvement occurs, close the matter. [source: 2026-06-25_ch-studio-staff-mix-80-20]

### VS Staffing Model and Lead Estimation Calibration

When advising a studio on VS planning, the staffing model must account for efficiency ratings per person, not raw headcount. Model structure: hours per role divided by 20 working days per month divided by effective headcount gives months required or additional hires needed. Calibration problems: leads setting optimistic efficiency ratings for low-output staff; estimates made before a definition of done was established default to full launch scope; single large estimates often contain 20-30% padding that one additional hire can halve; QA estimates based on a one-person model are structurally credible but need scrutiny.

Advisory fix: lead estimation capability assessment (1-5 scale with 2-3 sentences of evidence) before relying on incoming numbers. Purpose: identify who needs training and how far to trust the inputs. Bad estimators in a spreadsheet will be bad estimators in Jira; the tool does not fix the skill.

Scope framing with leadership: "how much of the VS can we close this month?" not a fixed end date. Fixed end dates inflate team behaviour -- individual leads pad to fill the deadline. [source: 2026-06-26_ch-vs-staffing-efficiency-ratings]

### CTO vs Technical Director: Role Distinction and Hiring Implications

A diagnostic framework for clients who are unclear about whether they need a CTO or a Technical Director, or who have filled one role when they needed the other.

CTO function (organisational and strategic): owns the technical direction and vision of the studio; hires and develops the technical team; translates technical capability into commercial and product strategy; communicates technical risk and opportunity at C-suite and board level; owns the relationship with external technical partners. The CTO's output is the organisation's technical capability over time, not an individual technical output.

Technical Director function (technical excellence and execution): owns the quality and integrity of the technical work; the final authority on engineering decisions; personally involved in the hardest technical problems; develops the skills of the engineering team through direct modelling and review. The TD's output is the technical quality of what gets shipped.

Anti-patterns that signal role confusion: a "CTO" who cannot communicate technical strategy to a non-technical board, or who relitigates implementation details in team meetings (likely a TD mis-titled); a "Technical Director" who spends the majority of their time on recruitment and stakeholder management rather than technical work (likely a CTO function without the title). The distinction matters for hiring sequencing: a studio in vertical slice needs a TD (ship quality); a studio entering a funding round needs a CTO (investor communication). Both functions are required at scale, but they are not interchangeable and cannot be collapsed into one role past ~40 engineers.

Advisory use: when a client is hiring a technical lead at C-level or senior lead level, establish which function they actually need before writing the job description. Misaligned job descriptions attract the wrong candidates and create mismatched expectations in the first 90 days. [source: 2026-07-07_cto-vs-td-role-distinction]

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

### Scope-First Headcount Decision Sequence as Advisory Discipline

A three-step mandatory sequence that must precede any headcount approval at a studio under production pressure: (1) scope first -- can the deliverable be cut or de-scoped?; (2) prioritise -- if not cut, can it fall below the VS threshold?; (3) headcount -- only if neither applies. Enforced at a ~55-person MMO studio by the CPO. Key diagnostic: headcount requests that arrive without a prior scope-cut conversation indicate directors using headcount to solve a scope problem. Jira-derived math required for all requests -- director intuition alone is rejected. Feature MoSCoW lock must precede reliable estimates; estimates built on unconfirmed scope are obsolete by definition. Velocity data caveat: Jira velocity is unreliable for approximately the first three months post-implementation. Advisory use when: a client presents headcount requests from multiple departments in the same cycle without prior scope work -- this is the standard operating sequence before any approval. [source: 2026-07-09_scope-first-headcount-framework]

### Scope Fear Containment

When a studio first sees its full VS scope for the first time, a predictable fear response triggers scope-cut proposals. NBI containment framework: (1) all cut proposals go into a designated document -- no immediate decisions; (2) scope ownership clarified -- decisions belong to a named core group only; (3) fear acknowledged openly in the room; (4) studio head meets the most affected department directly to reframe scope ownership. [source: not_4nWBkRC4r7TVRQ_vs_fear]

### Major Publisher Alpha Gate: Production Plan as the Real Risk

A studio CPO advising a studio with a major Chinese publisher as primary investor identified the decisive risk at the publisher's alpha gate review. Observed process: senior publisher executive visits the studio in person for the alpha review; publisher explicitly dislikes presentation materials -- wants to play the game directly or see UI mockups only; top-down publisher organisation means production teams hold decisions pending the senior review; payment milestone not released until sign-off is given. Outcome spectrum: best case is full support and funding through to completion; worst case is "figure it out yourselves" (reduced active support, not outright cancellation). Outright cancellation is assessed as unlikely due to too-big-to-fail dynamics when significant capital is already invested. Critical insight: the publisher's hard question at alpha is whether a clear production plan (timeline, cost, feature scope) exists -- absence of a production plan is the primary failure risk at the gate, not the game's quality state. Fallback acquirer dynamic: a viable alternative acquirer (e.g. major Western publisher) will only emerge if the studio has a clean production plan already in place -- the plan is required for any outcome path, not just for the primary publisher. Advisory use when: advising a studio approaching a major publisher payment gate -- prepare a playable build, not slides; ensure a production plan with timeline, cost, and feature scope is ready regardless of game quality. [source: 2026-07-10_publisher-alpha-gate-review-process]

### "Polished Playable" vs MVP Vocabulary and C-Level-First Training Sequence

A framing and sequencing pattern at a ~55-person MMO studio: "MVP" replaced with "polished playable" across all VS milestone communications. "MVP" carries a market association with half-finished shipped products; the term erodes internal quality expectations when applied to a vertical slice. VS framed explicitly as a "game simulator" -- a diagnostic exercise exposing what the studio can and cannot do -- and pre-communicated as "likely to feel boring internally" to prevent the team reading incompleteness as failure. Design freeze in force during VS: new ideas route to a locked document (locked/unlocked categorised), not into sprint. C-level-first training sequence: agile or leadership training must not cascade to managers and leads before C-level expectations are explicitly defined first. Sequence: half to full day aligning at C-level → teach leading, directing, and managing in that order → user stories written to an agreed DoD as the training completion criterion. Advisory use when: a studio is about to run agile training or leadership development and has not yet aligned the C-suite on expectations -- doing it the other way produces inconsistent implementation at every layer below. [source: 2026-07-10_polished-playable-vs-mvp-studio-priority]

### Audience-First Design Advisory

Studios whose design pillar work feels disconnected from the target player have typically skipped audience definition. Fix: run a for/against statement pass (15-20 statements: "a game for people who enjoy meaningful risk") before confirming pillars. This gives every contributor a portable filter for daily decisions -- "does this serve who we said we're for?" Publisher-style persona work (complex archetypes, Bartle types, Myers-Briggs) is operationally ineffective in day-to-day design decisions; studios using it in practice are rare. The for/against model is not a persona document -- it operates at a higher altitude. Game loop as theme-park model: players move between features based on mood, not a single prescribed path; intrinsic motivation is the target, not linear progression. Advisory use: present this to game directors who are building pillar documents without first agreeing who the game is for. [source: 2026-06-30_audience-first-game-design-methodology]

### Pillar vs Value-Creation Framework: Stress-Testing Game Vision

Game design pillars are frequently too aspirational to be useful as decision-making tools. A two-layer framework distinguishes aspirations from operative constraints.

Pillars are aspirations: high-level statements of what the game should be or feel like. The diagnostic: if team members do not invoke the pillars when making tradeoffs, the pillars are too abstract to function as decision tools.

Value creations are razors (operative constraints): each pillar must have at least one corresponding value creation that limits its scope. Two value creations are consistently missing from early-stage vision documents and must be built in alongside the pillars, not after them: (1) commercial viability -- the studio must still exist and be funded in five years; (2) delivery constraint -- a playable game must ship within approximately 2.5-3 years.

Stress-testing method: ask "how will the team misinterpret or over-extend this pillar?" and red-team the pillars against the people who will use them day-to-day, not just leadership. The person who writes the pillars and the person who closes the work against them are often different; the operationally-minded closer is often better at defining value creations and should be involved in pillar refinement.

Process: (1) generate player outcome examples for each pillar (what does a player actually experience because of this pillar?); (2) define value creations for each pillar, starting with commercial viability and delivery constraint; (3) red-team against the team that will apply them daily.

Advisory use: applicable when a studio's design pillars are not functioning as decision-making tools; when advising on early-stage game vision for a new project; when a client's pillars have been written but not stress-tested. [source: 2026-07-07_pillar-value-creation-framework]

### Status Deck Review for Publisher-Facing Reporting

Studios delivering milestone reports to publishers or external co-funders frequently produce decks that are illegible to those audiences. Three fixes: (1) What/why framing -- every delayed or blocked item carries an inline root-cause label; a slide listing nine unvalidated items without context reads as incomplete, while the same slide with root causes reads as managed; (2) Before/after Jira movement -- show "Status 2 Weeks Ago" vs "Status Now" side by side; external audiences without Jira access cannot interpret single-state snapshots; (3) Tombstone risk block -- risk statements buried as footnotes are ignored; convert to a prominent plain-English block naming the blockers and blocked deliverables. Embedded analyst model: analysts inside game teams (not a centralised service) with a senior role focused on synthesis and milestone readiness, not Jira administration. Audience layering: main deck for external stakeholders (publishers, investors), appendix with linked Jira for internal programme manager. [source: 2026-06-30_lighthouse-status-deck-review-framework]

### Dual-Mode Operating Contract for Creative Directors

A recurring failure pattern: a creative director with strong generative output applies the same exploratory mode to feature delivery as to world-building, creating delivery ambiguity. The fix is a written operating contract agreed between the creative director, CEO, and studio advisor that defines which domains are visionary (expansive, no execution authority) and which are decisive (scoped, the leader closes the loop). Without the contract, revisiting a scoped feature decision happens through hallway conversations rather than formal escalation. "Us and them" framing -- the creative director positioning themselves and the CEO against the studio -- is almost always a symptom of an unclear operating contract, not a personality issue. Direct feedback is the correct approach for visionary thinkers: no softening, clear behavioural target with a review date. Layer-cake communication model as a companion tool: one high-level principle (communicable in a meeting) + bulleted specifics (for leads) + concrete examples (for production staff). [source: 2026-06-30_ch-creative-director-dual-mode-operating-contract]

### Concept Art Team Underutilisation as Art Director Failure Signal

A pattern observed at a ~55-person MMO studio: concept team running at ~35% utilisation in active production. Root cause: Art Director authority had collapsed -- senior art and VFX leads were escalating directly to the game director and bypassing the concept team by using AI-generated imagery for style direction. The utilisation figure is a lagging indicator of upstream leadership failure, not a demand problem. Advisory diagnostic: when a concept art team reports unexpectedly low utilisation, investigate Art Director functional state before concluding that demand is low or headcount should be cut. Two distinct failure signals to separate: (1) AD authority collapse driving bypass (this entry); (2) mature art bible enabling deliberate AI leverage reducing genuine demand (a separate, healthy mechanism). The bypass pattern and the deliberate-adoption pattern can coexist -- distinguishing them requires understanding whether leads are routing around the AD or following a formal policy. Advisory use when: a client studio reports underutilised concept artists during active production -- the first diagnostic question is whether art direction is functioning, not whether to cut headcount. [source: 2026-07-10_concept-art-utilisation-ai-bypass-pattern]

### Analytics Tooling: Default Adoption, Deliberate Evaluation, and Delivery Scope Mismatch

**Default adoption vs deliberate evaluation:** An embedded analytics team at a live games studio reversed a Power BI default in favour of Apache Superset after discovering the original Power BI adoption was not a deliberate decision -- it was assumption-driven, with stakeholder preferences assumed rather than verified. Direct verification reversed the decision. Criteria applied: cost (Superset on AWS significantly cheaper with no Microsoft licensing overhead), security configuration, and onboarding simplicity. Key advisory pattern: when a client's BI or analytics tooling appears to be in use by default rather than by design, verify whether the decision was ever made deliberately before recommending tool changes or migrations. The default adoption pattern is not limited to analytics tooling -- the same mechanism applies to project management tools, HR systems, and communication platforms. Validation signal: the senior analyst who proposed Superset had already deployed it independently and unprompted -- this is a strong signal the tooling choice is correct. Do not treat independent deployment as a rogue action; treat it as evidence. Security waiver as a fast-path option: when enterprise IT review would block or delay analytics tooling adoption, a security waiver obtained with appropriate client sign-off can be a legitimate fast-path. The trade-off is speed against procedural completeness; the client must accept the risk explicitly. [source: 2026-07-10_superset-vs-powerbi-analytics-tool-selection, 2026-07-16_lighthouse-analytics-dashboard-scope-reclassification-aer-pivot]

**Delivery scope mismatch -- UXR test granularity vs data architecture:** A racing game studio client analytics engagement illustrates a failure mode specific to data product delivery: dashboards were built on cohort-day intervals and delivered on time and on brief (labelled P0/Alpha). Within days, the client reclassified all as Beta -- unsuitable for an upcoming user research alpha test. Root cause: the UXR alpha test was a 6-hour session requiring session-level granularity; the data architecture and the test design were mismatched from the start. The issue had been flagged early by the delivery team but was not acted upon before delivery.

The pattern: flagging a scope or architecture issue without blocking delivery transfers the risk to the client, not the advisory firm. The flag is not equivalent to a resolved risk. When the delivery team identifies that their data architecture is mismatched to a known client use case, that is a blocker, not an advisory note.

Pivot decision: keep existing dashboards as telemetry infrastructure; build one new Alpha-specific dashboard using an AER framework (Acquisition, Engagement, Retention). Monetisation excluded (no live data). One executive summary tab for studio CEO; additional tabs per stakeholder group. Delivery team lead wireframes with analytics manager; then builds solo.

Decision-maker identification: for data products, the decision-maker is typically the product owner, not the analytics lead. Increased advisory involvement creates increased accountability for communication quality -- inaccessible client contacts (no direct communication channel) must be escalated as a defect, not accepted as a working condition. [source: 2026-07-16_lighthouse-analytics-dashboard-scope-reclassification-aer-pivot]

**Analytics leadership transition:** When a client analytics lead is departing, a written handover plan is mandatory -- verbal briefings to incoming coverage are insufficient. Even when a strong interim resource is retained (e.g. an external data science consultant with strong credentials staying part-time), the written plan must exist. NBI advisory view on recruiting a full-time analytics lead into a small or specialist market: this is a difficult hire; NBI should set more data direction in the interim rather than assuming the client can recruit quickly. [source: 2026-07-16_lighthouse-analytics-dashboard-scope-reclassification-aer-pivot]

### Publisher Analytics Control: Embedded Data Scientists as Access Mechanism

A publisher offer to embed a company-owned data scientist at a developer studio, framed as analytics support, should be read as a data access and control play unless proven otherwise. Historical parallel cited in advisory context: EA's use of data access control as a power-retention mechanism, withholding platform data from developers to maintain leverage. The embedded analyst model achieves the same outcome while appearing collaborative.

Studio countermove: push back on physical embedding (particularly at remote studios) and propose the analyst works remotely from the publisher's country. This limits the information footprint without a direct refusal. Long-term publisher intention is typically a publisher-country-based data science team that progressively replaces or marginalises the studio's own analytics capability.

Advisory principle: studios must maintain an independent analytics layer regardless of publisher support offers. Reliance on publisher analytics creates structural leverage risk over time. Document explicitly what data access the studio retains vs what passes through the publisher-controlled layer. Diagnostic test for whether an embedded analytics offer is capability transfer or data capture: does the studio retain independent query access to its own telemetry, or does all reporting flow through the publisher's tooling?

Advisory use when: a client with a major publisher investor receives an offer to embed publisher staff in a data or analytics capacity -- probe the data access implications before accepting, establish independent query access as a non-negotiable, and define the scope of publisher visibility explicitly in any side letter. [source: 2026-07-17_publisher-analytics-control-embedded-team-pattern]

### AI-Native Hiring Advisory

As of 2026, Sega requires an AI component in analyst interviews. Studios and analytics clients hiring into data/analytics roles should design hiring criteria around demonstrated LLM capability, not just domain knowledge. The workforce planning question shifts: "how many analysts?" becomes "do we need one instead of three, with AI leverage?" Advisory position: AI fluency matters more than raw technical skill over any 3-year employment horizon. [source: 2026-06-19_ai-native-hiring-analytics-standard]

---

## HR and Employment Patterns

### Slack DSAR Liability

UK employment disputes trigger Data Subject Access Requests (DSARs) that retrieve all Slack messages. Senior leaders frequently use Slack as if it were a private channel for informal HR commentary. Briefing required: HoDs must understand that Slack is not a private communication tool. Sensitive HR discussions must use appropriately documented channels. This is not theoretical -- DSARs have been used in employment disputes and the messages are fully retrievable. [source: not_4nWBkRC4r7TVRQ_dsar]

### Early Probation Exit Documentation

UK studios on standard probation terms often face situations where a recent hire is clearly misaligned but no formal performance process has been documented. Three grounds for early termination with credible documentation: (1) declaration of incapacity -- the employee's own verbal statement is the strongest possible documentation basis; (2) competency misrepresentation at hire; (3) structural misalignment signals -- positioning for a more senior role or contradicting a peer lead within weeks of joining. From 1 January 2027, unfair dismissal rights begin at 6 months of service (reduced from 2 years) -- exits past 6 months will carry higher procedural risk. [source: not_HubmSolirYMTbM, not_CPGgraRzP9tMoz, not_ireYPwKIrrsWd_contractor_lexicon]

### Hiring Pipeline Governance

Clients routinely have weak pipeline discipline -- few candidates, late-stage collapses, no screening sequence. Minimum viable pipeline governance: (1) any open role with fewer than 3 valid candidates is red status; (2) lead-level and above require scorecards and background checks; (3) HR screening as first step -- collects salary expectations, contract type, relocation interest before technical evaluation. [source: not_4nWBkRC4r7TVRQ_hiring_governance, granola_c3cc29b7]

### Dual-Path TA Recruiter Model: Embedded FTC + External Contingency

Hiring strategy for studios needing to fill 10+ roles in a 3-6 month window without committing to a full-time internal TA hire.

**Two-path model (run concurrently):** An embedded TA on a 6-month fixed-term contract handles pipeline management and interview coordination for urgent roles; an external recruiter on a 2-month trial with deliverable-based fees handles hard-to-fill specialist roles. Fee model precedent for the external path: £7K embedded monthly fee + 10% contingency on placements, observed at a comparable studio.

**Cost logic:** 9 months total combined spend (6 months FTC + 2-month external overlap) is lower than 12 months for a single full-time TA hire when prior agency spend is rolled over to offset 40-60% of the combined cost.

**Process dependency:** external recruiters will not commit to a fee model until they see the hiring plan. Share the headcount plan (roles, salary ranges, regions) as the unlock step -- not a later deliverable.

**Salary range modelling inputs:** global benchmarks by region; hub vs non-hub delta (~30%, e.g. London vs secondary UK city); fully loaded employee cost at early stage is 20-26% above base (pension + NI only, no additional benefit overhead yet).

**Stakeholder disagreement protocol:** when stakeholders disagree on the external recruiter choice, use "disagree and commit" framing -- the dissenting party voices concern clearly, commits to the agreed path, and does not relitigate it. This prevents a minority position from undermining execution without suppressing dissent. [source: not_k2sqT0a9Qz8RGU]

### ATS Hiring Pipeline Management

A working model for managing a large hiring pipeline via an ATS with a third-party recruiter, observed at a ~55-person remote MMO studio:

- **Pipeline threshold:** five candidates per open role is the working target. Ideal state is two strong finalists before offer. Below five means the pipeline is underpowered.
- **Scorecard automation:** interviewers added as dropdowns in the ATS; hiring managers configure the question set; scorecards sent via email link. All parties get shared visibility without a manual debrief cycle.
- **Friction point:** slow scorecard returns from hiring managers is the recurring bottleneck, not recruiter throughput.
- **Priority discipline:** recruiter needs real-time notification when role priorities shift; late notification causes pipeline misalignment.
- **Role open until start date:** when a hire is made but not yet joined, the role remains open in the ATS.

ATS automates the debrief workflow, replacing manual scheduling. [source: 2026-06-24_ats-hiring-workflow-methodology]

### QA Lead Hired Above Strong IC: Growth-Enabling Hiring Sequence

When a client studio has a high-performing QA IC with no management experience and is creating a QA Lead role that will also cover outsourced burst testing capacity (~15-30 contractors), the correct hiring decision is to bring in the lead above the existing IC rather than promoting the IC. Pattern rationale: the IC becomes a beneficiary (grows under a competent lead) rather than a failure risk in an overloaded role covering outsourced team management for the first time. Advisory use when: a client wants to promote its strongest IC into a management role without management experience, or when a studio is adding outsourced QA capacity and needs a manager for it. Operational note: verify the IC's official title before posting the QA Lead role -- title conflicts with the incoming lead are common when the role sits directly above an existing team member and studios have not cleaned up informal title inflation. [source: 2026-07-09_qa-lead-above-ic-hiring-pattern]

### Tech Artist Hiring Misfire: Communicator Strengths Masking Engine-Depth Gap

A studio hired a tech artist lead who was proactive, generated strong cross-team feedback, and managed well but lacked deep engine and rendering knowledge. Consequence: ~147,000 objects in a modular world design mis-flagged as "movable" instead of "static" -- a known performance issue that had been raised but not actioned. Root cause: no technically qualified person on the original interview panel. Pattern: proactive outreach, positive cross-team feedback, and good results under prior leadership are insufficient signals for a tech art lead role; engine depth must be explicitly tested. The tech artist role requires both DCC tooling (Maya pipelines, rig tooling, DCC automation) and engine rendering depth (HLSL, Unreal rendering systems, performance enforcement); a hire covering only one dimension creates a performance governance gap. Advisory intervention: when reviewing a studio's tech art hire or vacancy, confirm whether the interview panel contained a technically qualified assessor -- if not, the role may be filled by a people-manager in a technical authority seat. Modular world diagnostic: explicitly audit movable vs static object flagging when reviewing a studio's world -- this is the most common undetected performance oversight without a technically strong TA. [source: 2026-07-10_tech-artist-role-engine-depth-vs-maya-tools]

### Hire Slowly, Fire Fast -- Toxicity as Existential Risk

A hiring philosophy articulated in the context of a senior technical candidate interview: hire slowly, fire fast. Extended due diligence before committing; decisiveness when the decision to exit becomes clear.

The rationale: toxic individuals threaten the whole studio. One bad hire at a senior level can destabilise team culture across multiple squads. This applies with particular force to technical leadership roles. For fully remote studios this discipline matters more acutely -- cultural problems from a toxic hire are harder to detect without physical colocation. Contrast the positive signal noted under CTO assessment criteria: a candidate who pushes back appropriately in an interview is showing the independence you want, not a toxicity flag. [source: 2026-06-24_hire-slowly-fire-fast-philosophy]

### Contractor Exit Protocol: Graceful vs Swift Removal

A studio with a history of abrupt contractor removals (instant Slack deactivation, no goodbye) codified a replacement policy distinguishing hostile from non-hostile exits.

Core framework: hostile actors (misconduct, IP risk, security concern) get a swift, precise exit with no notice. Everyone else gets a thoughtful, caring, and graceful exit -- time to say goodbye, acknowledgement of contribution, Slack access maintained for a defined handover period rather than cut on announcement. Work acknowledged publicly before the person leaves. Exit tone set by leadership, not delegated to HR to handle coldly.

Legal posture: over-honesty with contractors about the reasons for their exit creates legal exposure (unfair dismissal analogues, discrimination claims). The correct position is dignity without full performance rationale disclosure. C-level makes the decision; HR executes and handles the conversation.

Reputational note: leadership at a ~55-person studio explicitly accepted the reputational risk of graceful exits (possibility that word gets out that the person was let go). Graceful treatment of exits is a studio culture signal -- cold removal is remembered by the remaining team, not just the person leaving.

Advisory use: establish the hostile/non-hostile distinction before any exits are actioned. A replacement wave is the worst time to invent the protocol; it needs to exist in advance. [source: 2026-07-07_contractor-exit-protocol]

### Strike-Based Employee Performance Protocol

A structured re-engagement and escalation protocol for an employee with a documented performance history returning to a role, or for a current employee placed on informal performance management.

Setup phase: deliver feedback themes from the previous period upfront before the employee starts; set clear and specific behavioural expectations at the outset; establish a documented 1:1 cadence with the direct manager from day one.

Escalation structure: three-strike system, with the senior advisor notified at each strike occurrence. Strike definition: a clear instance of the previously identified behaviour recurring. After three strikes, the contract closes -- no further escalation steps.

Decision attribution: the re-engagement decision is publicly attributed to the senior advisor, not the line manager or CEO. Rationale: protects the manager's and CEO's relationship with the employee; gives the senior advisor leverage to coach the CEO on people decisions regardless of outcome; creates a documented trail that is useful whether the employee succeeds or fails. If the employee succeeds, the studio benefits directly. If the employee fails, the documented trail supports the coaching conversation about people decision-making with the decision-maker who originally pushed for re-engagement.

Most applicable when: a CEO or founder pushes for re-engaging a previously departed employee against team consensus. The protocol converts a contentious people decision into a structured experiment with a clear exit condition. [source: 2026-07-02_strike-based-employee-performance-protocol]

---

## Client Fundraising Patterns

### Greek Investor Dynamics: Relationship-First Timeline and SAFE Simplicity

Greek investors and Greek-connected family offices operate on a relationship-first timeline where trust-building is itself a substantive step, not inefficiency or delay. Budget double the expected duration for any raise involving this investor profile.

Warm introduction and relationship management via an insider is the most effective route. Where a trusted third party has the existing personal relationship, delegate the closing task to that person -- not the founder directly. Family offices in this profile typically move through a single trusted contact rather than a committee; identify and service that contact, not the broader organisation.

Pre-closing preparation: have all resolutions, DocuSign items, and legal paperwork at "press the button" status before any team member takes leave or the founder's attention shifts to another priority. The window in which a Greek family office contact is ready to move can be short; the failure mode is being unready when the moment arrives.

SAFE structure for small tranches: a complex SAFE with multiple review rounds is disproportionate for a small tranche (e.g. a £50K ticket). Push to proceed and sort detailed paperwork post-transaction; a simple structure beats a complicated one for small tranches. Over-engineered legal process on small cheques is a common cause of relationship fatigue and dropped deals.

Advisory use when: a Cyprus-domiciled or Greek-diaspora studio is raising from Greek investors or European family offices and is frustrated by apparent slow movement. Distinguish relationship-pace delays (expected and manageable) from genuine disengagement (a different response is needed). [source: 2026-07-16_greek-investor-fundraising-cultural-patience-timeline]

---

## What Clients Hide (or Don't Know They're Hiding)

These patterns are not deliberate concealment -- clients often do not know these exist:

1. **Documentation completion is lower than reported.** Verbal progress reports are genuine but based on what exists in people's heads, not in files.

2. **The approval chain is not followed.** Leaders describe a robust process; in practice, informal approvals are the norm. The formal chain is invoked only for big decisions.

3. **Scope growth is invisible.** Features added informally are not tracked until a structured estimation exercise forces the total into view.

4. **Senior talent is thinner than presented.** Seniority titles are inflated. A "senior designer" is often a mid with 3-4 years of experience. This surfaces when quality-tier mapping is applied against actual output.

5. **Employment contracts have gaps.** Garden leave, IP assignment, and contractor/employee boundary clauses are frequently incomplete in founder-led studios. Legal review always surfaces at least one material gap. For contractors with long tenure across multiple entities or jurisdictions, the IP assignment gap may not be visible without reviewing the full contract history -- standard exit documents do not close it.

6. **Build infrastructure is more fragile than reported.** Studios describe "a working build" but the stability, cadence, and team accessibility of that build is often far below what "working" implies.

7. **Commercial model misalignment is hidden by product focus.** Key technical or creative leaders may be building for a commercial model (box game) that differs from the studio's stated model (live service). This surfaces only under scrutiny from a publisher or investor.

8. **Contractor compliance gaps are not visible to the studio.** Studios with mixed contractor/FTE workforces often do not know they have been paying contractors for leave entitlements prohibited under IR35. The exposure only surfaces when a contractor or regulator initiates proceedings. A prior settlement often signals more exposure in the same contractor population.

9. **Director accountability gaps are covered by production.** Directors who approve estimates without reviewing them, pass interpersonal friction to producers to absorb, or say yes and do not deliver are rarely challenged directly. Production staff compensate quietly, which means directors have no signal that improvement is needed. This surfaces at scale when the production team is overstretched.

10. **Data product scope is assumed, not confirmed.** Analytics teams build to the stated brief without verifying whether the brief aligns with the actual downstream use case (e.g. a UXR session test vs a long-run telemetry dashboard). The mismatch only becomes visible at delivery. Flagging the risk without blocking delivery transfers the risk to the client.

11. **Publisher "analytics support" is often a data access play.** Studios that accept a publisher offer to embed a data scientist rarely examine what telemetry access and reporting control the publisher gains. The studio's own analytics capability is at risk of progressive marginalisation.

12. **Founder shadow conversations create misaligned leads.** The founder believes alignment has been reached via individual conversations; each lead received different information and has formed positions the founder does not know about. The misalignment surfaces in group settings when leads contradict each other.

---

## Engagement Delivery Patterns

### Red and Pink List Framework for Incoming Studio Leaders

A structured onboarding tool for new senior hires and external advisors entering a chaotic or rapidly-scaled studio. Red list: critical compliance or operational failures that must be addressed before anything else. Pink list: structural gaps and process improvements that matter but can be sequenced.

Mechanics: the incoming leader builds their own list independently during their first 2-4 weeks. The senior advisor cross-references: narrates which reds are already in motion and which are not yet started. The value is in the delta -- overlap between the two lists confirms the real risks; gaps reveal what the existing team has normalised or missed. At a ~55-person MMO studio, the senior advisor's own red list on joining contained 81 items across production, art, and tech.

Advisory use: ask all new senior hires to build a personal red list within their first weeks and share it in regular 1:1s. Cross-referencing independent lists is more diagnostic than briefing a new hire on existing problems -- the delta reveals whether the organisation knows its own failure points.

Probation note: UK unfair dismissal law makes the first four months the critical structured performance testing window. Informal assessment is not sufficient -- structured performance criteria and clear resources must be established within probation, not retrospectively. [source: 2026-07-06_ch-red-pink-list-framework]

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

11. **Strike protocol recidivism rate:** Of employees re-engaged under the three-strike protocol, what proportion reach the third strike vs demonstrate durable improvement? No primary data from completed cases.

12. **Leadership ratio compliance:** Once a senior technical hire is coached to 60/40 (managing/doing), does the ratio sustain without active follow-up, or does drift back to 80/20 occur within one quarter?

13. **CEO conflict-avoidance coaching:** When a founder-CEO is named and mapped on the agreement-then-reversal pattern, how long does it typically take to see durable change? What intervention frequency is required?

14. **Publisher alpha gate outcomes:** What proportion of studios that arrive at a publisher alpha gate without a coherent production plan successfully negotiate continued support vs experience passive support withdrawal? No primary data from completed cases.

15. **C-level-first training sequence:** Does beginning agile/leadership training at C-level before cascading produce measurably more consistent implementation than the standard approach of training managers and leads first? Single-studio observation with no control group.

16. **Pillar language precision test adoption lag:** The multi-archetype precision test is described from one leadership session. How long does it take a full studio to purge imprecise pillar language from onboarding materials and design reviews after the leadership session completes?

17. **Two-axis archetype balance cost:** The two-axis framework (solo/group + no-impact/high-impact) requires designing full game loops for four archetype quadrants. Is there a documented minimum viable approach that addresses all four quadrants without building separate content tracks for each?

18. **Multi-jurisdiction IP assignment gap frequency:** How often do long-tenure contractors at Cyprus-domiciled, UK-operating studios have contract histories spanning multiple entities with conflicting IP clauses? Is this specific to dual-entity structures or common across any multi-jurisdiction contractor tenure?

19. **Greek investor timeline data:** Is the "double the expected duration" rule of thumb consistent across Greek family offices and institutional investors, or does it vary significantly by ticket size and relationship warmth?

20. **Analytics scope mismatch prevention:** At what point in the delivery cycle is the UXR test design / data architecture alignment check most effective -- at brief acceptance, at architecture sign-off, or at a mid-build review gate?

21. **Dual-path TA recruiter model scalability:** Does the embedded FTC + external contingency model hold for studios needing 20+ hires in a single window, or does coordinator overhead make a full-time TA hire more efficient above a certain threshold?

22. **Shadow conversation silo remediation timeline:** Once a dedicated ideation channel is established and the game director begins routing requests from the founder, how long before the founder's bilateral habit breaks down? Is one direct conversation from the game director sufficient, or does it require repeated redirection?

23. **Sledgehammer frequency:** In practice, how many private sledgehammer conversations are required before a public scalpel move lands reliably? Is there a minimum threshold before the anchor is strong enough?

---

## Delivery Patterns (additions 2026-07-15)

### Brand Identity Governance: Pillars-First Rule

Brand materials built before game pillars are locked will need to be rebuilt when pillars change. This is the most common brand advisory failure pattern. [source: 2026-07-15_brand-identity-build-sequence-pillars-first]

**The rule:** Nothing new gets made (no logos, no decks, no art treatments) until game pillars are ratified and locked. Pitch decks proceed as content-only (narrative, data, structure) in parallel -- art treatment waits for brand foundation.

**When a studio violates this:** Multiple logo iterations exist. Conflicting visual styles coexist across investor deck, social, and game assets. Individually strong materials carry no shared logic because each iteration was driven by preference, not strategy.

**North star:** Within five seconds, an uninitiated person knows what the studio/game is and why they are here. If this fails, brand work must restart.

**Artist vs brand designer:** Studios often assign brand work to artists. Artists optimise for visual quality; brand designers optimise for strategy and rules. The output of artist-led brand work will be aesthetically varied but strategically incoherent. A dedicated brand designer owning the rules is a prerequisite for coherent brand output.

### CTO/Executive Search Under Funding Round Pressure

Walking into investor meetings without a named CTO weakens the round. The pressure creates temptation to hire below the bar. Correct strategy resists it. [source: 2026-07-15_cto-search-european-talent-constraint-executive-search]

**European talent constraint:** Senior engineering leadership with multiplayer/MMO experience is genuinely scarce in Europe at CTO level. This is structural -- Microsoft layoff supply did not translate to Europe. Set explicit expectations before the search begins.

**Under-pressure strategy:** Advance strong Technical Director-level candidates through the pipeline to keep them warm while CTO search continues. Do not hire below CTO until the top role is filled -- the wrong hire outweighs the investor credibility gap. Part-time senior technical advisors can bridge investor credibility without a permanent hire decision.

**Pre-hire compatibility:** When both a Creative Director and a Technical Director/CTO are being hired, run a compatibility assessment before either offer is made. A post-onboarding incompatibility discovery is a production risk that is cheaper to surface during the pipeline.

### Pillar Language Precision Test

Pillar language habitually encodes its author's player archetype. The shorthand that resonates for one player type actively excludes others -- and the excluded archetypes are often larger segments. [source: 2026-07-15_pillar-language-archetype-bias-precision-testing]

**Application as advisory diagnostic:** Before a leadership alignment session, run the precision test on each pillar: (1) write what the pillar means for each major archetype (achiever, combat-focused, cosmetics-motivated, casual social); (2) if meanings diverge, the language is broken -- rewrite to the intent, not the author's shorthand; (3) add "is / is not" examples; (4) retire any onboarding document used as pillar language if it predates the test.

**Advisory signal:** When a studio's design decisions keep conflicting with stated pillars, diagnose whether the pillar language is precise enough to function as a decision razor, or whether it's aspirational shorthand authored by a single player-archetype executive.

### Dual-Purpose Roadmap: Investor AMA and CEO Scope Lock

A roadmap that serves only investor communication but not scope governance will be bypassed by scope creep. Build it to serve both. [source: 2026-07-15_roadmap-dual-purpose-investor-artifact-scope-lock]

**CEO scope lock mechanic:** Every feature addition by the CEO must visibly drag a bar out on the chart. "You just moved launch back by six weeks" becomes visible before the conversation, not during it. The visual cost of scope creep is more persuasive than verbal pushback.

**Investor AMA framing:** "Ballpark roadmap, iterating as we go" is more credible than false precision. The artifact must answer "which year does this ship?" with clear sequencing, not day-level scheduling.

**Build process for studios without detailed scheduling:** Standard-process-per-feature-type lookup tables, applied to existing headcount and feature priority data. EP or production lead builds the structure; design and engineering sign off on estimates.

### Finance Function Setup: Clean Start Over Historical Cleanup

When a studio's financial history is inaccessible, a clean-start model is faster than reconstruction. This is a recurring pattern when a studio changes financial ownership or brings in a new finance lead after a period of ad-hoc tracking. [source: 2026-07-15_studio-finance-function-setup-chaos-clean-start]

**Decision heuristic:** If historical data is held by someone slow to release it and the foundations are murky, assign a short-term contractor to legacy untangling while the new finance lead builds a clean forward-looking P&L from scratch. Do not let the new hire's first months be consumed by cleanup.

**What a working RAG cadence requires:** Weekly operations meeting with RAG board on screen. Red = needs action, not failure -- the framing must be established before the first session or problems will be concealed. Finance lead provides runway and P&L status as a standing item.

**Invisible cost area:** Software seats. Assign someone to chase all heads of department for seat counts before building the budget model.

### Design-Engineering Direct Feedback Protocol

Repeated rebuilds of the same system are almost always a communication failure, not a design or engineering failure. [source: 2026-07-14_design-engineering-direct-feedback-protocol]

**Pattern:** Designers request a third-party plugin evaluation. Engineering interprets it as a challenge to their work and becomes defensive. No one states what the existing system actually cannot do. The rebuild happens anyway, fixing the wrong problem.

**Fix (lightweight protocol):** Designer takes a screenshot of useful behaviour → sends directly to the relevant engineer → engineer responds "good / bad / already built / backlog." Engineers treat designer requests as requirements statements, not challenges to existing code. Designers state pain points explicitly ("the current system cannot do X") rather than proxying through plugin requests.

**Diagnostic:** "Evaluate this plugin" is almost always a proxy for "the existing system doesn't do X." If a studio is experiencing multiple rebuilds of the same system, ask whether designers have stated what the existing system cannot do -- or have only proxied the request through a reference or plugin.

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
| not_ireYPwKIrrsWd_scurve | Granola | S-curve change management (anonymised) |
| not_ireYPwKIrrsWd_quadrant | Granola | Staff quadrant review (anonymised) |
| not_ireYPwKIrrsWd_contractor_lexicon | Granola | UK probation law Jan 2027 (anonymised) |
| not_HubmSolirYMTbM, not_CPGgraRzP9tMoz | Granola | Early probation exit documentation (anonymised) |
| not_k2sqT0a9Qz8RGU | Granola | Dual-path TA recruiter model: embedded FTC + external contingency; disagree-and-commit framing; hiring plan as external recruiter unlock (anonymised) |
| not_7pWBMRvnbfBop8 | Granola | Executive feedback toolbox: sledgehammer/screwdriver/scalpel model; private anchor principle; passive feedback failure rate; sticky note coaching supplement (internal) |
| not_3bO0Su9glXKHUa | Granola | Studio ideation silos: shadow conversations; dedicated ideation channel with lead-posts-not-founder routing rule; game director as channel enforcer (anonymised) |
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
| 2026-06-30_audience-first-game-design-methodology | Granola | Audience-first game design: for/against statements before pillars; theme-park loop model (anonymised) |
| 2026-06-30_lighthouse-status-deck-review-framework | Granola | Status deck review for publisher-facing reporting: what/why framing, tombstone risk, before/after Jira, embedded analyst model (anonymised) |
| 2026-06-30_ch-creative-director-dual-mode-operating-contract | Granola | Dual-mode operating contract for creative directors: visionary vs decisive domain specification; "us and them" pattern (anonymised) |
| 2026-07-02_leadership-ratio-management-to-doing | Granola | Leadership ratio framework: phased management-to-doing correction for senior technical hires (anonymised) |
| 2026-07-02_junior-vs-senior-mindset-production | Granola | Junior vs senior mindset diagnostic: response to incomplete builds as seniority signal (anonymised) |
| 2026-07-02_director-accountability-production-separation | Granola | Director accountability: non-delegable functions; "stop cuddling directors" principle (anonymised) |
| 2026-07-02_strike-based-employee-performance-protocol | Granola | Strike-based re-engagement protocol: three-strike escalation, decision attribution to senior advisor (anonymised) |
| 2026-07-02_executive-meeting-accountability-redesign | Granola | Executive meeting redesign: Excel tracker, silence enforcement, locked weekly tabs (anonymised) |
| 2026-07-02_ceo-founder-priority-framework | Granola | CEO/founder priority framework: culture, investor relations, three weekly judgment calls (anonymised) |
| 2026-07-06_ch-red-pink-list-framework | Granola | Red and pink list onboarding framework: incoming leader independent audit, senior advisor cross-reference, UK probation window (internal) |
| 2026-07-06_ch-uk-contractor-compliance | Granola | UK contractor compliance failure points: right-to-work gaps, immigration/sponsorship sequencing, fintech banking risk, quiet remediation principle (anonymised) |
| 2026-07-07_contractor-exit-protocol | Granola | Contractor exit protocol: graceful vs swift removal; hostile/non-hostile distinction; legal caution on over-honesty; culture signal to remaining team (anonymised) |
| 2026-07-07_cto-vs-td-role-distinction | Granola | CTO vs Technical Director role distinction: org/strategy/hiring vs technical excellence/execution; anti-patterns; hiring sequencing implications (public) |
| 2026-07-07_pillar-value-creation-framework | Granola | Pillar vs value-creation (razors) framework: aspirational pillars need operative constraints; commercial viability and delivery constraint universally missing (internal) |
| 2026-07-09_scope-first-headcount-framework | Granola | Scope-first headcount sequence: three-step gate before any hire; Jira-derived math required; MoSCoW lock prerequisite; velocity unreliable first 3 months (anonymised) |
| 2026-07-09_qa-lead-above-ic-hiring-pattern | Granola | QA Lead above strong IC: growth-enabling hiring sequence; player-manager profile; outsourced pool management scope; title conflict check (anonymised) |
| 2026-07-10_publisher-alpha-gate-review-process | Granola | Major publisher alpha gate: production plan as primary risk; top-down Chinese publisher process; too-big-to-fail dynamic; fallback acquirer requires clean plan (anonymised) |
| 2026-07-10_polished-playable-vs-mvp-studio-priority | Granola | "Polished playable" vs MVP vocabulary; C-level-first training sequence; VS as game-simulator diagnostic; boring-is-expected pre-communication (anonymised) |
| 2026-07-10_concept-art-utilisation-ai-bypass-pattern | Granola | Concept art at 35% utilisation as Art Director authority failure signal; bypass pattern vs deliberate AI leverage (anonymised) |
| 2026-07-10_tech-artist-role-engine-depth-vs-maya-tools | Granola | Tech artist hiring misfire: engine-depth gap masked by communicator strengths; panel composition failure; 147,000 movable-not-static objects consequence (anonymised) |
| 2026-07-10_superset-vs-powerbi-analytics-tool-selection | Granola | Analytics tooling default adoption vs deliberate evaluation: Superset reversal; unprompted analyst deployment as validation signal; verify before recommending (anonymised) |
| 2026-07-14_design-engineering-direct-feedback-protocol | Granola | Design-to-engineering direct feedback protocol: screenshot → single-line response; evaluate vs integrate distinction; seventh rebuild root cause (anonymised) [carry-forward from 2026-07-14] |
| 2026-07-15_brand-identity-build-sequence-pillars-first | Granola | Brand identity pillars-first sequence: nothing made until pillars locked; pitch decks proceed as content-only; artist vs brand designer distinction; five-second test (anonymised) |
| 2026-07-15_cto-search-european-talent-constraint-executive-search | Granola | CTO search under round pressure: European talent scarcity structural; advance TD candidates to keep warm; part-time advisor bridge; Creative Director/TD compatibility pre-assessed (anonymised) |
| 2026-07-15_pillar-language-archetype-bias-precision-testing | Granola | Pillar language precision test: multi-archetype check; is/is-not examples; retire single-author documents encoding archetype bias (anonymised) |
| 2026-07-15_roadmap-dual-purpose-investor-artifact-scope-lock | Granola | Dual-purpose roadmap: investor AMA readiness + CEO scope lock (every addition drags a bar); non-negotiables declared first (anonymised) |
| 2026-07-15_studio-finance-function-setup-chaos-clean-start | Granola | Finance function clean start vs cleanup: forward P&L from scratch; contractor for legacy untangling; Red = needs action not failure; software seat-count audit (anonymised) |
| 2026-07-16_contractor-exit-ip-assignment-legal-checklist-protocol | Granola | Multi-jurisdiction contractor exit: IP assignment gap in cross-entity contracts; binary green/not-green status protocol for complex exits; HR+legal complete-package-before-scheduling rule (anonymised) |
| 2026-07-16_greek-investor-fundraising-cultural-patience-timeline | Granola | Greek investor fundraising patterns: relationship-first timeline; insider-delegated closing; SAFE simplicity for small tranches; family office single-contact dynamics; pre-closing readiness (anonymised) |
| 2026-07-16_lighthouse-analytics-dashboard-scope-reclassification-aer-pivot | Granola | Analytics delivery scope mismatch: UXR session granularity vs cohort-day architecture; AER pivot framework; flag-without-blocking risk transfer principle; written handover mandatory; product owner as data decision-maker; security waiver as fast-path (anonymised) |
| 2026-07-17_live-service-studio-alignment-failure-pattern | Granola | Live service alignment failure: CEO "commitment without comprehension" pattern (investor-sold-not-operationalised); internal live service director without leadership champion; investor review as real decision point (anonymised) |
| 2026-07-17_publisher-analytics-control-embedded-team-pattern | Granola | Publisher analytics control play: embedded data scientist as access capture mechanism; EA historical parallel; studio countermove via remote-only proposal; independent analytics layer as non-negotiable (anonymised) |
| 2026-07-21_contractor-ir35-day-rate-reform-income-protection-model | Granola | IR35 income-neutral day rate reform: 216 billable-days formula; monthly soft cap with pre-approval gate; audit trail vs surveillance distinction; mid-year transition via final invoice settlement; Q&A rollout pattern (anonymised) |
