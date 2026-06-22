COUCH HEROES — AI TOOL STRATEGY & RECOMMENDATION REPORT

Prepared for: CH Game Development UK Ltd — C-Suite & Technical Leadership
Prepared by: NBI Analytics Ltd
Date: 14 June 2026
Classification: Confidential — Internal + NBI Advisory
Version: 1.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## EXECUTIVE SUMMARY

Couch Heroes should immediately adopt Atlassian Intelligence (built into the JIRA Premium deployment already underway, serving all ~55 FTE + ~15 contractors; Rovo AI features included at no incremental cost), MetaHuman Animator (free iPhone/Android-based facial mocap that transforms animation workflow for a remote studio), and Substance 3D AI features (AI-powered texturing and material generation already included in CH's existing Creative Cloud licences). These tools deliver immediate value at zero or near-zero incremental cost and can be deployed within the first sprint after governance policies are in place.

The studio should explicitly avoid AI voice performance (SAG-AFTRA/Equity non-negotiable prohibition; violation risks union action, legal liability, and Series B due diligence failure) and AI-generated 3D assets for shipped content (community backlash, IP litigation risk, and art team opposition from Sasha Krieger make this category untenable for a subscription MMO where community trust is a revenue driver).

The single most impactful strategic recommendation is building custom AI bot infrastructure for automated QA (verdict: WATCH on modl.ai specifically due to product incompatibility with MMO architecture; custom bot development recommended as Phase 2 engineering investment). For a 1-person QA team building a 200-600 player MMO with 5 server profiles, AI playtesting is not optional — but the solution is engineering-built bot infrastructure (as Rare, Riot, and Blizzard use), not a vendor product purchase. modl.ai's current product (black-box visual testing via screen analysis) does not support the concurrent simulation, real-time combat, or server-side exploit detection that CH's MMO requires.

- **Total AI tools evaluated:** 47
- **AI ADOPT:** 7 tools across 5 disciplines
- **PILOT recommendations:** 9 tools
- **WATCH:** 29 tools (incl. modl.ai, reclassified from PILOT due to product incompatibility)
- **AVOID:** 2 tool categories
- **Top 3 strategic recommendations:** (1) Complete AI governance prerequisites (policy, data classification, partner IP procedures) before deploying any tools; this is the critical path and a Series B due diligence asset. (2) Hire a DevOps Lead and CTO; half the advanced AI tools in this report are blocked by these vacancies. (3) Accelerate the QA vendor pipeline and begin custom bot infrastructure development; CH's 1-QA-person risk is the most dangerous constraint in the entire production plan, and the solution is engineering-built (not vendor-purchased).
- **Top 3 risks:** (1) Community backlash over AI content detection (likelihood 4, impact 5, score 20). (2) Partner IP leaking through cloud AI tools (likelihood 3, impact 5, score 15). (3) No CTO delays AI infrastructure decisions (likelihood 4, impact 4, score 16).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## DECISION DASHBOARD

**Engineering**

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|---|---|---|---|---|
| C++ Code Assistance | Aura / UE CoPilot | WATCH | $0 | Too early; no production citations for UE5 C++ |
| Debugging & Crashes | Sentry AI + Backtrace (pilot) | PILOT | $3,490 | No DevOps owner for triage |

**DevOps & Infrastructure**

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|---|---|---|---|---|
| CI/CD Build Analysis | TeamCity AI | PILOT | $1,620-5,520 | Conditional on CI/CD choice |
| Incident Response | PagerDuty AIOps / Datadog AI | WATCH | $0 | No DevOps hire blocks adoption |

**Art Pipeline**

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|---|---|---|---|---|
| Concept Ideation | Adobe Firefly Enterprise | PILOT | $360-19,200 | Art team resistance; voluntary only |
| Texturing & Materials | Substance 3D AI features | ADOPT | $0 | Already licensed; opt-in features |
| 3D Asset Generation | None | AVOID | $0 | Community backlash; IP risk; team opposition |
| Environment Layout | Houdini ML + Promethean AI | ADOPT + PILOT | $261-12,959 | Sasha's broader opposition may extend |

**Animation**

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|---|---|---|---|---|
| Motion Capture | Rokoko Studio AI | PILOT | $375-7,875 | Team instability (lead on PIP) |
| Keyframe Animation | Cascadeur Pro | PILOT | $198 | New lead must buy in |
| Facial Animation | MetaHuman Animator | ADOPT | $0 | iPhone dependency |

**Audio**

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|---|---|---|---|---|
| SFX Search | Wwise Similar Sound Search | ADOPT | $0 | Conditional on Wwise selection |
| Music Composition | None | WATCH | $0 | Quality gap; community detection risk |
| Voice Performance | None | AVOID | $0 | SAG-AFTRA/Equity: non-negotiable prohibition |
| Audio Mastering | iZotope Ozone AI | ADOPT | $280 | None significant |

**Game Design**

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|---|---|---|---|---|
| Economy Balancing | Machinations | ADOPT* | $2,520 | Non-AI infrastructure; Simon's views unknown |
| Game Research | Ludo.ai | WATCH | $0 | Primarily an AI sprite generator; mobile/casual focus; unsuitable for MMO competitive intelligence |
| Level Design | See Art section (Promethean AI) | PILOT | See Art | Cross-reference |

**QA & Testing**

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|---|---|---|---|---|
| AI Playtesting | Custom bot infrastructure (modl.ai: WATCH) | Engineering investment | ~£30K-50K eng salary | Hannah overloaded; DevOps hire required; modl.ai incompatible with MMO |
| Bug Triage | Atlassian Intelligence | ADOPT | See Production | Cross-reference |
| Accessibility | None (consultancy) | WATCH | $0 | No game-specific AI tool exists |

**Narrative & Localisation**

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|---|---|---|---|---|
| NPC Dialogue Systems | Inworld AI / Charisma.ai | WATCH | $0 | Community backlash; Steam Live-Generated |
| Localisation | memoQ Gaming Bundle | PILOT (Phase 3) | $3,000-5,000 | Content must stabilise first |

**Production & Project Management**

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|---|---|---|---|---|
| Sprint Planning & Triage | Atlassian Intelligence / Rovo | ADOPT | $0 | Rovo included in JIRA Premium subscription (verified June 2026) |

**Marketing & Community**

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|---|---|---|---|---|
| Community Moderation | ToxMod / Two Hat | WATCH | $0 | Post-launch; no community yet |
| Sentiment Analysis | Brandwatch | WATCH | $0 | Enterprise pricing; premature |

**Data & Analytics, Platform, HR, Finance**

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|---|---|---|---|---|
| Player Telemetry | GameAnalytics | WATCH | $0 | Zero headcount blocks adoption |
| Anti-Cheat | Easy Anti-Cheat | ADOPT | $0 | Free with UE5; integrate early |
| Candidate Screening | HiBob AI | PILOT | $0 | GDPR compliance for employee data |
| Comp Benchmarking | SalarySage | PILOT | $500-2,000 | COI: NBI advisory relationship |
| Contract Analysis | Luminance / Harvey | WATCH | $0 | Lili not in post; enterprise pricing |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## TABLE OF CONTENTS

1. Methodology & Scoring Framework
2. Competitive Landscape — AI in MMO/Live-Service Development
3. Cross-cutting Infrastructure
4. Engineering
5. DevOps & Infrastructure
6. Art Pipeline
7. Animation
8. Audio
9. Game Design
10. QA & Testing
11. Narrative & Localisation
12. Production & Project Management
13. Marketing & Community
14. Data & Analytics
15. Platform & Backend
16. HR & People
17. Finance & Legal
18. Phased Adoption Roadmap
19. Organisational Change Management
20. Budget Summary
21. Risk Register
22. Appendices

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. METHODOLOGY & SCORING FRAMEWORK

### 1.1 Scoring Dimensions

Every tool in this report is evaluated against six dimensions, each scored 1-10 with calibrated anchors. The dimensions are weighted to reflect what matters most for a pre-launch MMO studio: the tool must actually solve the problem (Capability), must be proven in production (Production Readiness), and must not expose the studio to legal liability (IP/Legal Safety). Team dynamics, engineering effort, and cost matter, but are secondary to the first three.

**Capability Fit (25% weight)**
How well does this tool solve CH's specific problem, given Unreal Engine 5, MMO scale (200-600 players per zone), the cosy byte-punk aesthetic, and the game's design pillars?

- 10 = purpose-built for this exact use case and engine
- 7 = strong fit with minor gaps
- 4 = general-purpose tool requiring significant adaptation
- 1 = fundamentally mismatched

**Production Readiness (20% weight)**
Is this tool shipping-quality? Has it been used in a game that has actually launched?

- 10 = shipped in a AAA title with 1M+ units sold, used across multiple studios, 3+ years in production
- 7 = used in at least one shipped indie/AA title, stable release with commercial support
- 4 = beta/early access, used in pre-production or internal prototypes only, no shipped title confirmed
- 1 = research prototype, no commercial release, academic or demo use only

**IP/Legal Safety (20% weight)**
Training data provenance, output ownership, GDPR compliance, vendor indemnification, and platform disclosure risk.

- 10 = fully licensed training data, explicit commercial output ownership, IP indemnification, GDPR-compliant data processing, no platform disclosure trigger
- 7 = mostly clean provenance with minor open questions, standard commercial licence
- 4 = active litigation against the model class, ambiguous output ownership, no indemnification
- 1 = known copyright infringement in training data, vendor claims licence to outputs, active regulatory action

**Team Adoption Risk (15% weight)**
How likely is CH's specific team to actually adopt this, given skill levels, resistance profiles, remote-first workflow, and existing DCC tool stack? All scores in this dimension are estimates based on available information about CH's named individuals and general discipline patterns. They are not based on stakeholder interviews or change readiness assessments. The consulting team should validate these scores through structured conversations with discipline leads before finalising verdicts.

- 10 = drop-in replacement for existing tool, team already familiar, no change management needed
- 7 = new tool but intuitive for the discipline, training is a half-day session
- 4 = requires significant workflow change, some team members will resist, needs a champion
- 1 = requires discipline expertise the team lacks, active opposition from key personnel, would destabilise an already-fragile team

**Integration Effort (10% weight)**
How much engineering/pipeline work to integrate into CH's specific stack (UE5, Perforce, JIRA, Slack, existing DCC tools)?

- 10 = native plugin or API, works with CH's exact stack out of the box
- 7 = documented integration path, 1-2 days of engineering
- 4 = requires custom scripting or middleware, 1-2 weeks
- 1 = no integration path exists, months of bespoke development, requires dedicated DevOps resource CH does not have

**Cost Efficiency (10% weight)**
Cost per seat or per output relative to the alternative (human-only or current tooling), at CH's scale (~70 employees).

- 10 = free/open-source with minimal infrastructure cost
- 7 = pays for itself within 3 months through measurable time savings
- 4 = meaningful cost that requires budget approval, ROI is 6-12 months
- 1 = enterprise pricing that exceeds the cost of the human workflow it replaces at CH's scale

### 1.2 Verdict Definitions

Each task receives one of four verdicts:

**ADOPT** (roll out now): The tool is mature, the ROI is defensible, and CH has the organisational capacity to absorb it. Every ADOPT recommendation includes: (a) estimated integration timeline, (b) named rollout owner in CH's current org, (c) 90-day success criteria, (d) rollback trigger. Where the natural rollout owner does not yet exist (CTO, Head of Data, DevOps Lead), interim ownership is assigned to the most senior adjacent role with the dependency flagged.

**PILOT** (time-boxed trial): The tool shows strong promise but carries enough uncertainty to warrant a controlled evaluation before full rollout. Every PILOT includes the same requirements as ADOPT, plus: defined pilot scope (which team, how many seats, duration, data to collect).

**WATCH** (not ready yet): The tool is not mature enough, too risky, or CH lacks the organisational prerequisites to absorb it. Every WATCH recommendation specifies what would need to change (maturity milestone, legal resolution, pricing change) and a suggested revisit date.

**AVOID** (risk outweighs benefit): The category or specific tool carries risk that outweighs any productivity benefit. Every AVOID includes: the specific risk driving the exclusion, its probability and impact, what CH loses by not adopting (the counterfactual cost), and the alternative human-only workflow.

**Owner-capacity rule:** If the only available rollout owner is already identified as overloaded (Hannah in QA), not yet in post (Lili in Finance), or a zero-headcount discipline (Data/Analytics), the maximum verdict is PILOT contingent on the hire, not ADOPT.

**Hard-blocker gates (applied before composite scoring):** A tool that fails any gate below cannot score higher than WATCH regardless of its composite:

| Gate | Question | If failed |
|------|----------|-----------|
| Named owner exists | Is there a specific person at CH who will own deployment, triage, and ongoing management? | Max verdict: WATCH (deferred until hire) |
| Operational dependency met | Does the tool require infrastructure CH does not yet have (CI/CD pipeline, telemetry, build farm, self-hosted GPU)? | Max verdict: PILOT contingent on infrastructure |
| Shipped-content risk acceptable | Does the tool generate player-facing content that could trigger IP, union, or community risk? | Apply Sensitivity Floor (Section 1.3) |
| Failure blast radius bounded | If the tool fails or produces bad output, what breaks? (Build pipeline, player data, shipped assets, legal exposure) | Tools with unbounded blast radius require CTO/GC sign-off |
| Time to value < 6 months | Can the tool demonstrate measurable value within 6 months of deployment, given CH's current headcount and workflow? | Flag as high-risk PILOT; escalate to CTO for approval |

These gates surface tools where a high composite score masks organisational unreadiness. A tool can score 8.0 on the composite and still be ungovernable if no one owns it.

### 1.3 Sensitivity Floor Rule

If a tool scores below 4 on IP/Legal Safety (for art, audio, or narrative tools) or below 4 on Production Readiness (for anything touching shipped assets), the verdict cannot be ADOPT or PILOT regardless of its composite score. The maximum verdict for a tool that trips the floor is WATCH.

This rule exists because a tool with excellent capability and a fatal legal or maturity flaw is worse than no tool at all; it creates exposure the studio cannot insure against.

### 1.4 Data Sources & Limitations

This report draws on:

- Publicly available tool documentation, pricing pages, and changelogs as of June 2026
- Published case studies, GDC talks, and studio announcements
- CH's organisational data as provided by NBI Analytics (team structure, tooling stack, governance backlog, game design documentation)
- The consulting team's domain expertise in game studio operations and technology strategy

**Limitations:** Where production citations could not be independently verified, this is disclosed inline as `(no independent production citation found, June 2026)`. Where pricing or data processing terms require direct vendor engagement, the claim is flagged as `[VENDOR CONTACT REQUIRED: ...]`. Team Adoption Risk scores are estimates, not validated through stakeholder interviews. The AI tooling market is moving faster than any static report can capture; this analysis reflects the state of the market in June 2026. Sections covering fast-moving categories (code copilots, image generation, LLM-based testing) include a reusable evaluation methodology CH can apply at each 6-month review cycle.

**Composite formula:** Composite = (Capability × 0.25) + (Production Readiness × 0.20) + (IP/Legal × 0.20) + (Adoption × 0.15) + (Integration × 0.10) + (Cost × 0.10). Rounded to one decimal place (round half up).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. COMPETITIVE LANDSCAPE — AI IN MMO/LIVE-SERVICE DEVELOPMENT

The following examples are drawn from public statements, GDC presentations, and published case studies. No speculation about competitors' internal tooling is included.

**1. Rare / Sea of Thieves (Microsoft) — Custom AI Playtesting Infrastructure**
Rare built internal automated testing bots for Sea of Thieves (GDC presentation by Robert Masella). These were custom-built systems integrated directly into the game's server infrastructure, enabling automated regression and exploit detection at scale. This is NOT a commercial vendor product — Rare's engineering team built the capability in-house. modl.ai cites this approach as inspiration but no direct commercial Rare/modl.ai partnership has been independently confirmed. **Lesson for CH:** The industry model for MMO-scale AI playtesting is custom-built bot infrastructure managed by engineering, not off-the-shelf vendor tooling. This directly informs the custom bot infrastructure recommendation in Section 10.

**2. Riot Games — Internal AI Tools with Strict Governance**
Riot Games disclosed at GDC 2024 that it uses AI tools internally for playtesting, balance simulation, and toxicity detection, but explicitly committed to human-authored narrative, art, and champion design. Riot established an internal AI review board before deploying any tools. **Lesson for CH:** The industry leader in live-service games adopted AI for backend/operational tasks while drawing a clear line at player-facing creative content. CH should follow this model: AI for engineering, QA, and production; human-authored art and narrative.

**3. Activision Blizzard — AI Art Controversies (2024)**
Multiple incidents: Activision Blizzard integrated Midjourney and Stable Diffusion into concept art and in-game cosmetics for Call of Duty: Modern Warfare 3, while cutting ~1,900 jobs. Separately, fans detected apparent AI-generated imagery in Diablo Immortal / Hearthstone crossover promotional materials (anomalies including distorted ears and impossible geometry). The WoW franchise director explicitly denied GenAI use for WoW content. **Lesson for CH:** Community detection of AI art is a material business risk even for the industry's largest publishers. The backlash extended beyond the specific AI images to broader concerns about job displacement. CH's AVOID verdict on AI-generated shipped art (Section 6.2.3) and the requirement for human-authored marketing imagery (Section 13) are directly informed by this precedent.

**4. Hangar 13 / Mafia: The Old Country — MetaHuman in Production**
Hangar 13 presented their use of MetaHuman in the character pipeline for Mafia: The Old Country at Unreal Fest Stockholm 2025 (verified). This demonstrates AAA adoption of Epic's MetaHuman tooling for production character work. **Lesson for CH:** MetaHuman Animator is transitioning from showcase technology to production pipeline. CH's ADOPT recommendation (Section 7.2.3) aligns with this industry trajectory.

**5. Machinations — Industry Adoption for Economy Design**
Machinations.io documents Ubisoft, Gameloft, Wargaming, and King as customers, with King reporting 34% production time reduction in economy design (per Machinations website; not independently verified). Over 35,000 professionals use the platform. **Lesson for CH:** Economy simulation is standard practice for monetised games. CH's Machinations ADOPT* (Section 9.2.1) follows established industry practice, though the specific studio citations are vendor-sourced and should be treated accordingly.

No public information was found regarding AI adoption by CH's direct competitive set (Palia/Daybreak, Ashes of Creation/Intrepid Studios, Throne & Liberty/NCSoft). These studios have not disclosed AI tooling strategies publicly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. CROSS-CUTTING INFRASTRUCTURE

### 3.1 Self-Hosted vs Cloud Decision Framework

CH's infrastructure decision is shaped by three constraints: (a) no dedicated DevOps, (b) partner IP requiring data isolation in some workflows, (c) engineers already overloaded with IT work.

**Recommendation:** Start with cloud APIs behind organisational accounts with DPAs for all non-sensitive workflows. Self-hosted inference is not viable until a DevOps hire is in place and GPU infrastructure is justified by volume.

| Data Category | Cloud API Acceptable? | Self-Hosted Required? | Guardrail |
|---|---|---|---|
| General source code (non-partner) | Yes (with DPA) | No | `.copilotignore` for sensitive paths |
| Partner IP code/assets | No | Yes (when DevOps available) | Exclude from all cloud AI tools |
| Unreleased game assets | Context-dependent | Preferred | No uploading to generative AI tools |
| Employee PII (GDPR) | Yes (with DPA + GDPR transfer mechanism) | Preferred for sensitive categories | Anonymise where possible |
| Cap table / fundraising / investor data | No | N/A (don't process with AI at all) | Hard prohibition |
| Player telemetry (post-launch) | Yes (with DPA) | Not required | Anonymise PII |

**Self-hosted AI timeline:** Not before the DevOps hire (estimated Phase 2-3). When a DevOps Lead is in place, evaluate self-hosted inference for: (a) art ideation with partner IP reference images, (b) code analysis of partner IP integration code, (c) any workflow where cloud data egress creates contractual risk.

### 3.2 API Gateway & Cost Controls

CH should not deploy individual AI tool subscriptions without cost visibility. Recommended approach:

1. **Centralised AI licence management.** Aris (COO) or the future CTO maintains a single register of all AI tool subscriptions, seat counts, and monthly spend. This register is the source of truth for budget tracking and the basis for the 6-month re-evaluation cycle.

2. **Usage monitoring for per-token tools.** Any tool with usage-based pricing (Inworld AI, GitHub Copilot AI Credits, cloud LLMs) must have spend alerts configured. Set a monthly budget cap per tool; alert at 75% and hard-stop at 100%.

3. **API gateway (future).** When CH begins using multiple cloud AI APIs (post-CTO hire), deploy an API gateway (LiteLLM, Helicone, or equivalent) to centralise authentication, log usage, enforce rate limits, and track cost across providers. This is a Phase 2-3 infrastructure investment.

### 3.3 Prompt Library & Evaluation Framework

CH should establish a shared prompt library for approved AI use cases:

- **Engineering:** Standard prompts for code review, debugging, UE5 pattern generation. Stored in the repository alongside code.
- **Art:** Approved Firefly prompt templates for moodboarding (abstract only, no character-specific, no partner IP references).
- **Production:** JIRA AI prompt templates for sprint planning, status summarisation, bug triage.
- **Narrative:** LLM prompt templates for quest text drafting with style guide context. Partner IP exclusion built into system prompts.

**Evaluation framework:** For the 6-month re-evaluation cycle (applicable to fast-moving categories per Section 4.2.1), CH should maintain a standardised test suite per category:
- Code copilots: 10 representative UE5 C++ tasks
- Image generation (if adopted): 10 moodboarding prompts with quality rubric
- AI playtesting: regression test coverage comparison

### 3.4 Data Classification for AI Workflows

CH must classify all data categories before deploying AI tools. The classification below should be formalised as part of the AI Acceptable Use Policy (governance backlog item 1).

| Classification | Examples | AI Processing Rules |
|---|---|---|
| **PUBLIC** | Published game trailers, press releases, public job postings | Any AI tool |
| **INTERNAL** | Sprint plans, meeting notes, general game design docs | Approved cloud AI tools with DPA |
| **CONFIDENTIAL** | Source code, unreleased assets, game economy models | Approved cloud AI with DPA + data restrictions |
| **RESTRICTED** | Partner IP, investor documents, cap table, employee disciplinary records | No cloud AI; self-hosted only or prohibited |
| **PROHIBITED** | Salary by name, medical records, investor side letters | Never process with AI |

### 3.5 Infrastructure Budget & Phasing

| Phase | Infrastructure Investment | Estimated Cost |
|---|---|---|
| Phase 1 (0-3 months) | AI licence register, data classification, DPAs with key vendors | $0-2,000 (legal/admin) |
| Phase 2 (3-9 months) | API gateway evaluation, prompt library setup | $1,000-3,000 |
| Phase 3 (9-18 months) | Self-hosted inference evaluation (contingent on DevOps hire), GPU provisioning | $5,000-20,000 |
| **Total pre-launch** | | **$6,000-25,000** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. ENGINEERING

### 4.1 Discipline Overview

CH's engineering team comprises approximately 10-12 developers working in UE5 C++ and Blueprints, with Perforce as primary source control. There is no CTO; Mustafa serves as Head of Tech but defaults to a passive posture in strategic discussions, creating a leadership gap for technology adoption decisions. Engineers are already overloaded, context-switching into IT and infrastructure work that would normally fall to a dedicated DevOps function. AI tooling in this discipline must be low-friction, drop-in, and must not add to the context-switching burden. The four tasks below target the highest-leverage intervention points: daily coding, UE5-specific authoring, code quality gates, and crash diagnosis.

### 4.2 Task-Level Analysis

#### 4.2.1 C++ Code Assistance & Completion

This is the highest-volume AI intervention point for engineering: assisting developers during daily C++ and scripting work in UE5. The tool must support UE5's C++ patterns (UCLASS, UPROPERTY, delegates, subsystems) and integrate with the IDEs engineers already use (Visual Studio, Rider, or VS Code).

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| GitHub Copilot Business | SaaS | 7 | 10 | 8 | 7 (est.) | 7 | 8 | 7.9 | ADOPT |
| Tabnine Enterprise | SaaS/On-prem | 6 | 7 | 9 | 6 (est.) | 7 | 8 | 7.1 | WATCH |
| Cursor Business | SaaS | 8 | 7 | 7 | 6 (est.) | 5 | 7 | 6.9 | WATCH |

*Composite calculation for GitHub Copilot: (7 × 0.25) + (10 × 0.20) + (8 × 0.20) + (7 × 0.15) + (7 × 0.10) + (8 × 0.10) = 1.75 + 2.00 + 1.60 + 1.05 + 0.70 + 0.80 = 7.9 ✓*
*Tabnine: (6 × 0.25) + (7 × 0.20) + (9 × 0.20) + (6 × 0.15) + (7 × 0.10) + (8 × 0.10) = 1.50 + 1.40 + 1.80 + 0.90 + 0.70 + 0.80 = 7.1 ✓*
*Cursor: (8 × 0.25) + (7 × 0.20) + (7 × 0.20) + (6 × 0.15) + (5 × 0.10) + (7 × 0.10) = 2.00 + 1.40 + 1.40 + 0.90 + 0.50 + 0.70 = 6.9 ✓*

**Recommendation: ADOPT** GitHub Copilot Business for all engineering seats.

- **Integration timeline:** 1 week. Licence procurement via GitHub organisation, extension installation across Visual Studio/Rider/VS Code. No infrastructure changes required.
- **Rollout owner:** Mustafa (Head of Tech). Execution: senior engineer distributes licences and configures `.copilotignore` for sensitive paths. Permanent owner: future CTO.
- **90-day success criteria:** 10+ engineers using Copilot daily; code completion acceptance rate above 25% (measurable via Copilot's usage dashboard); no incidents involving partner IP leaking through suggestions; zero negative impact on build stability (pre/post defect rate comparison).
- **Rollback trigger:** Data incident involving partner IP or proprietary game logic appearing in another customer's suggestions (requires GitHub confirmation); measurable decline in code quality (defect rate increases >20% from baseline); team-wide rejection (fewer than 4 active users after 60 days).

**Why Copilot:** Production Readiness of 10 is unmatched. Copilot has been commercially available since June 2022, is used across virtually every major software company, and 90% of Fortune 100 companies have deployed Copilot as of mid-2025 (verified: GitHub statistics), with 4.7 million paid subscribers by January 2026. Microsoft demonstrated Visual Studio 2026 + Copilot for game development workflows at GDC 2026 (verified). No specific game studio public adoption statement was found, but Fortune 100 penetration implies coverage across major publishers. The Business tier guarantees that code snippets are not used to train the model, which addresses CH's data concerns. It integrates with Visual Studio (the default UE5 C++ IDE) and JetBrains Rider, meaning zero IDE switching for the team.

**Why not Cursor:** Scores highest on raw Capability (8) due to its agentic features, multi-file context window, and composer mode. However, it requires engineers to switch to a VS Code-based IDE, which is disruptive for teams using Visual Studio or Rider for UE5 development. Integration score of 5 reflects the IDE switching cost plus limited Perforce-native support. WATCH until CH evaluates its IDE standardisation; if the team moves to VS Code, Cursor becomes a strong alternative.

**Why not Tabnine:** The highest IP/Legal score (9) of any tool in this task, driven by its on-premises deployment option where code never leaves CH's network. This makes it the fallback if partner IP data handling with Copilot proves unworkable. However, its code completion quality trails Copilot and Cursor on UE5-specific patterns (no independent benchmark for Tabnine C++ completion quality on game engine code found, June 2026). WATCH as the IP-safe fallback; revisit if partner IP contractual requirements tighten.

**CH-Specific Risk:** The primary risk is not the tool itself but the absence of a CTO to set engineering standards for AI-assisted coding. Without clear guidelines on when to accept vs reject AI suggestions, code review practices for AI-generated code, and data classification for partner IP files, productivity gains may be offset by quality risks. Mitigation: Mustafa issues a one-page "AI coding standards" memo before rollout, covering: (1) all AI-suggested code must pass the same review standards as human code, (2) partner IP integration files are excluded via `.copilotignore`, (3) engineers must not paste proprietary game design documents into chat-based AI prompts.

**Data Egress:** GitHub Copilot Business sends code context to GitHub/Microsoft cloud infrastructure for inference. Source code is classified as game data. Partner IP integration code must be excluded using `.copilotignore` configuration. General CH game code is acceptable under Copilot Business terms (code not used for model training; organisational data isolation). A Data Processing Agreement (DPA) with GitHub is recommended, covering GDPR requirements for UK/Greece employees' workspace data.

**Cost Estimate:**
- Pre-launch (28 months, mid-2026 to late 2028): 12 seats × $19/month × 28 months = $6,384. Assumes team grows to ~15 by launch; blended estimate ~$7,000.
- Post-launch annual: 15 seats × $19/month × 12 months = $3,420
- Permanent infrastructure: Yes; code assistance remains valuable through live service.
- **Billing model change (June 2026):** GitHub transitioned Copilot Business to a usage-based AI Credits model effective 1 June 2026. The $19/seat/month base remains, but now includes 1,900 AI Credits per seat (pooled across the organisation). Standard code completions are unlimited and do not consume credits. Premium features (Copilot Chat, agent mode, multi-file edits) consume credits. Potential overage is possible if premium feature usage is heavy. CH should set a monthly overage ceiling (~$500/month org-wide) and monitor credit consumption. Note: new self-serve sign-ups for Copilot Business on GitHub Free/Team plans were paused April 2026; procurement may require GitHub Enterprise Cloud ($21/user/month base) or direct sales engagement.

**Disclosure Impact:** Developer tools used during production do not trigger Steam's AI disclosure requirements, which apply to player-facing generated content. Conservative position: note "AI-assisted development tools" in the internal AI register but no platform disclosure obligation.

**6-Month Evaluation Methodology (Code Copilot Category):**
The code copilot market evolves faster than a static recommendation can serve. CH should re-evaluate at each milestone gate using this framework:

1. Score all available copilots on the 6-dimension rubric defined in Section 1.
2. Benchmark on 10 representative UE5 C++ tasks (create a UCLASS, implement a delegate, write a subsystem, debug a crash, refactor a Blueprint-to-C++ conversion, etc.).
3. Measure: time-to-completion, suggestion acceptance rate, post-acceptance defect rate.
4. Weight CH-specific factors: Perforce compatibility, UE5 macro/pattern awareness, partner IP data handling, IDE compatibility.
5. If a new tool scores within 0.5 composite points of the incumbent, run a 2-week parallel pilot before switching.
6. If the incumbent's score drops below 7.0 composite, trigger a formal evaluation cycle regardless of schedule.

The current leader is GitHub Copilot Business (7.9 composite, June 2026). Reassess at each milestone gate or every 6 months, whichever comes first.

---

#### 4.2.2 UE5 Blueprint & Editor Tooling

AI-assisted generation of Blueprints, materials, Niagara VFX, and PCG content directly within the UE5 editor. This is distinct from general code assistance; these tools operate inside Unreal's visual scripting and content creation environment.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Aura Pro | SaaS | 8 | 3 | 7 | 5 (est.) | 9 | 7 | 6.4 | WATCH |
| Ultimate Engine CoPilot | Plugin | 7 | 2 | 7 | 5 (est.) | 9 | 9 | 6.1 | WATCH |

*Composite calculation for Aura: (8 × 0.25) + (3 × 0.20) + (7 × 0.20) + (5 × 0.15) + (9 × 0.10) + (7 × 0.10) = 2.00 + 0.60 + 1.40 + 0.75 + 0.90 + 0.70 = 6.4 ✓*
*Ultimate Engine CoPilot: (7 × 0.25) + (2 × 0.20) + (7 × 0.20) + (5 × 0.15) + (9 × 0.10) + (9 × 0.10) = 1.75 + 0.40 + 1.40 + 0.75 + 0.90 + 0.90 = 6.1 ✓*

**Recommendation: WATCH** both tools. The UE5 AI editor tooling category is nascent; neither tool meets the production readiness threshold for code that would ship in a commercial MMO.

**Why WATCH, not PILOT:** Both tools score below 4 on Production Readiness. Aura (3) has a single thin citation (Sinn Studio, a small VR indie; the tool launched January 2026 and is under 6 months old). Ultimate Engine CoPilot (2) has no named studio citation at all, only a FAB Marketplace listing and marketing claims. Per the sensitivity floor rule, Production Readiness below 4 for tools touching shipped assets blocks ADOPT or PILOT. Blueprint code and materials generated by these tools would ship in the game.

**Aura, revisit conditions:** Two or more independent studio citations (not vendor-affiliated); stable release for 6+ months with documented changelog; confirmed UE5 Live Link feature for real-time Blueprint editing (no public confirmation of UE5 Live Link feature status found, June 2026). Suggested revisit: Q1 2027.

**Ultimate Engine CoPilot, revisit conditions:** At least one named studio citation; independent quality benchmark against hand-authored Blueprints; clarification of the LLM dependency model (which vendor LLMs does it require, and what are their terms for generated game code?). Suggested revisit: Q1 2027.

**Counterfactual cost of not adopting:** Engineers continue authoring Blueprints, materials, and VFX manually. This is the current workflow and is well understood. The productivity uplift from AI editor tooling is estimated at 15-30% for routine tasks (no independent benchmark exists; estimate based on vendor claims from Aura, June 2026), but the risk of shipping AI-generated Blueprints with subtle logic errors in an MMO with 200-600 concurrent players outweighs the productivity gain at this maturity level.

---

#### 4.2.3 Automated Code Review & Static Analysis

Automated detection of bugs, security vulnerabilities, and code quality issues in C++ and Blueprint code, integrated into the CI/CD pipeline. CH is currently evaluating CI/CD tools (TeamCity, Jenkins, BuildKite), making this the right time to include AI-augmented code quality gates.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| SonarQube Developer | On-prem/Cloud | 6 | 9 | 9 | 6 (est.) | 6 | 7 | 7.3 | ADOPT |
| JetBrains Qodana | On-prem/Cloud | 6 | 7 | 9 | 6 (est.) | 7 | 7 | 7.0 | Alternative |

*Composite calculation for SonarQube: (6 × 0.25) + (9 × 0.20) + (9 × 0.20) + (6 × 0.15) + (6 × 0.10) + (7 × 0.10) = 1.50 + 1.80 + 1.80 + 0.90 + 0.60 + 0.70 = 7.3 ✓*
*Qodana: (6 × 0.25) + (7 × 0.20) + (9 × 0.20) + (6 × 0.15) + (7 × 0.10) + (7 × 0.10) = 1.50 + 1.40 + 1.80 + 0.90 + 0.70 + 0.70 = 7.0 ✓*

**Recommendation: ADOPT** SonarQube Developer Edition for code quality gates. AI CodeFix is a future upgrade path.

**Critical pricing correction (post-verification):** AI CodeFix is only available in SonarQube Enterprise and Data Center editions, NOT Developer. The Developer edition provides robust rule-based static analysis for C++ but no AI-powered fix suggestions. Enterprise edition (with AI) costs ~$65,000+/year for 1M LoC, which is disproportionate for CH's current scale. The recommendation is therefore: ADOPT SonarQube Developer for non-AI code quality (similar to Incredibuild as infrastructure), with AI CodeFix as a Phase 3 upgrade path when the codebase and budget justify Enterprise edition.

- **Integration timeline:** 2-4 weeks, contingent on CI/CD evaluation outcome. SonarQube integrates with TeamCity, Jenkins, and BuildKite. Setup involves deploying the SonarQube server (on-prem recommended for code isolation), configuring the C++ analyser, and creating quality gate profiles.
- **Rollout owner:** Mustafa (Head of Tech). Execution: the engineer responsible for CI/CD setup integrates SonarQube as a quality gate in the build pipeline. Permanent owner: future CTO or DevOps Lead.
- **90-day success criteria:** SonarQube integrated into CI pipeline; quality gates active on all pull requests / Perforce shelved changelists; new code coverage above 60%; false positive rate below 30% (measured by developer override frequency).
- **Rollback trigger:** False positive rate exceeds 40% (team bypassing the tool rather than using it); engineering time spent addressing SonarQube findings exceeds time saved.

**Why SonarQube:** The most mature static analysis platform, with 15+ years of production use across thousands of organisations. C++ analysis is robust. The Developer edition (~$2,500/year for 100K LoC, scaling to ~$15,000/year for 1M LoC) is the right starting tier for CH. The on-premises deployment option means CH's source code never leaves their infrastructure, earning an IP/Legal score of 9. Production: SonarQube is a de facto standard for C/C++ quality gates across the software industry.

**Why Qodana as alternative, not primary:** JetBrains Qodana is a strong tool if CH standardises on JetBrains IDEs (Rider for C++). Its integration with the JetBrains ecosystem is tighter, and its AI inspections are natively aligned with Rider's code intelligence. However, SonarQube is CI/CD-agnostic and IDE-agnostic, making it safer for a team that has not yet standardised its tooling. Qodana becomes the preferred option if CH adopts JetBrains Rider studio-wide (no independent comparison of Qodana vs SonarQube C++ analysis depth found, June 2026).

**Data Egress:** SonarQube on-premises: standard rule-based analysis runs fully locally with no data egress. However, the AI CodeFix feature DOES require internet connectivity (verified: SonarQube documentation confirms the instance must reach Sonar's AI service for prompts and rule descriptions). AI CodeFix can use SonarSource-hosted LLMs or CH's own self-hosted LLMs, but the SonarQube server still needs internet access. AI CodeFix is only available in Enterprise and Data Center editions (not Developer). Partner IP files should be excluded from AI CodeFix processing; standard rule-based analysis remains fully local.

**Cost Estimate:**
- Pre-launch: SonarQube Developer Edition ~$2,500/year for 100K LoC (early development), scaling to ~$15,000/year as codebase grows toward 1M LoC. Estimated pre-launch: $2,500/year × 2.3 years = ~$5,750, growing as codebase scales.
- Post-launch annual: $5,000-15,000 (depending on codebase size at launch).
- Permanent infrastructure: Yes; code quality gates remain essential through live service.
- Note: AI CodeFix (Enterprise edition, ~$65,000+/year) is a Phase 3 upgrade path, not included in the base recommendation.

---

#### 4.2.4 Debugging & Crash Analysis

Automated crash capture, deduplication, root cause analysis, and developer triage for UE5 C++ crashes and errors. For an MMO with 5 distinct server profiles and cross-play targets, crash visibility is operational infrastructure, not a nice-to-have.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Sentry Business | SaaS/On-prem | 7 | 9 | 9 | 6 (est.) | 7 | 8 | 7.8 | ADOPT |
| Backtrace (Sauce Labs) | SaaS | 9 | 8 | 9 | 5 (est.) | 6 | 5 | 7.5 | PILOT |

*Composite calculation for Sentry: (7 × 0.25) + (9 × 0.20) + (9 × 0.20) + (6 × 0.15) + (7 × 0.10) + (8 × 0.10) = 1.75 + 1.80 + 1.80 + 0.90 + 0.70 + 0.80 = 7.8 ✓*
*Backtrace: (9 × 0.25) + (8 × 0.20) + (9 × 0.20) + (5 × 0.15) + (6 × 0.10) + (5 × 0.10) = 2.25 + 1.60 + 1.80 + 0.75 + 0.60 + 0.50 = 7.5 ✓*

**Recommendation: ADOPT** Sentry Business as the primary error monitoring platform. **PILOT** Backtrace for game-specific crash analysis (minidump processing, UE5 crash reporter integration).

**Sentry ADOPT details:**
- **Integration timeline:** 1-2 weeks. Sentry's C++ SDK integrates into UE5 builds. Configure error grouping, set up alerting to Slack, connect to JIRA for issue creation.
- **Rollout owner:** Mustafa (Head of Tech). Execution: engineer integrates SDK into build system.
- **90-day success criteria:** Crash reporting active on all internal builds (development, QA, staging); mean time to detection (MTTD) for critical crashes under 1 hour; AI-powered root cause suggestions surfacing actionable information for at least 50% of unique crash signatures.
- **Rollback trigger:** Signal-to-noise ratio degrades to the point where engineers ignore alerts; Sentry infrastructure cost exceeds $200/month due to high error volume (indicates an underlying stability problem, not a tool problem).

**Backtrace PILOT details:**
- **Pilot scope:** 3 engineers, 3 months, focused on UE5 minidump analysis and server-side crashes (the MMO server profiles are the highest-value crash surface). Compare crash resolution time, grouping accuracy, and developer satisfaction against Sentry.
- **Data to collect:** Crash resolution time (Backtrace vs Sentry for the same crash class), false grouping rate (crashes merged that should not be), developer NPS survey at pilot end.
- **Integration timeline:** 1-2 weeks for SDK integration into UE5 build.
- **Rollout owner:** Mustafa. Execution: senior server engineer.

**Why Sentry as primary:** Production Readiness of 9 reflects Sentry's maturity (founded 2012, used across millions of applications). Its AI features (root cause analysis, suggested fixes, intelligent error grouping) are genuinely useful for reducing mean time to resolution. The self-hosted option (Sentry on-prem) provides a fallback if data egress becomes a concern. Game studio adoption: Riot Games (VALORANT console launch), CCP Games (EVE Online), and Facepunch Studios (Rust) are confirmed gaming customers listed on Sentry's gaming page. Sentry launched full gaming console support (Xbox, PlayStation, Nintendo Switch) in September 2025 (verified via BusinessWire).

**Why Backtrace as PILOT:** Backtrace scores highest on Capability (9) because it is purpose-built for game crash analysis. It processes C++ minidumps natively, integrates with UE5's crash reporter, and is specifically designed for the kind of low-level crashes that occur in game engines. A Senior Engineer at Roblox has publicly endorsed Backtrace (verified via Backtrace website testimonial); this is an employee endorsement, not a formal customer announcement. Production Readiness of 8 reflects a younger but specialised product. The lower Team Adoption score (5 est.) reflects the additional learning curve of a second crash analysis tool and the overhead on an already stretched engineering team. Cost Efficiency of 5 reflects enterprise-grade pricing that is higher than Sentry at CH's scale [VENDOR CONTACT REQUIRED: Backtrace pricing for ~70-person studio].

**Data Egress:** Sentry cloud sends crash data (stack traces, error messages, device metadata) to Sentry's infrastructure. Full source code is NOT sent; source maps/debug symbols are uploaded separately for symbolication. This is acceptable for CH; no partner IP is present in crash data. Self-hosted Sentry is available if required. Backtrace: similar model; minidumps are uploaded to Backtrace cloud for analysis.

**Cost Estimate:**
- Sentry Business pre-launch: ~$80/month × 28 months = $2,240
- Sentry post-launch annual: ~$960/year (may increase with player-facing error volume post-launch)
- Backtrace PILOT: ~$1,250 for 3-month pilot [VENDOR CONTACT REQUIRED: Backtrace starter tier pricing]
- Backtrace post-launch (if promoted): ~$5,000-15,000/year depending on error volume [VENDOR CONTACT REQUIRED: Backtrace pricing tiers]
- Both tools are permanent infrastructure; crash analysis continues through live service.

---

### 4.3 Discipline Risk Summary

1. **No CTO gap.** Engineering AI adoption lacks strategic ownership. Mustafa as Head of Tech can manage tactical tool rollout but cannot drive cross-cutting decisions about self-hosted vs cloud infrastructure, data classification frameworks, or engineering standards for AI-assisted development. **Mitigation:** Assign AI tooling strategic decisions to Aris (COO) in partnership with Glen (CPO advisory) until the CTO hire is complete. Tactical rollout remains with Mustafa.

2. **Context-switching overload.** Engineers are already handling IT and infrastructure work alongside game development. Adding new tools during this period risks productivity loss during the adoption window. **Mitigation:** Stagger rollouts. Start with the lowest-friction tool (GitHub Copilot, which requires only an extension installation) and measure impact before introducing SonarQube and Sentry. Do not introduce more than one new engineering tool per sprint.

3. **Perforce constraint.** Many modern AI developer tools assume Git-based workflows (pull request reviews, branch-based code review, GitHub/GitLab integration). CH's Perforce-primary setup limits options for AI-augmented code review and collaborative AI features. **Mitigation:** Factor AI tool compatibility into the Git+LFS evaluation already underway. If Git+LFS is adopted for code (Perforce retained for art assets), it unlocks CodeRabbit, GitHub Copilot Code Review, and other Git-native AI tools.

### 4.4 Governance Prerequisites

The following items from CH's governance backlog must be completed before engineering AI tools can be rolled out:

1. **AI Acceptable Use Policy v1** (Usage Policy & Governance backlog) — MUST complete before any tool deployment. Defines what constitutes acceptable use of AI coding assistants, data classification for AI inputs, and review standards for AI-generated code. **Priority: CRITICAL, Phase 1 prerequisite.**

2. **Approved Tool List with Data Classification** (Tool Selection & Licensing backlog) — Specifies which AI tools are approved for use, which data categories each tool can access, and contractual requirements (DPAs, indemnification). **Priority: CRITICAL, Phase 1 prerequisite.**

3. **Developer AI Training Guidelines** (Training & Education backlog) — Covers prompt security (do not paste proprietary design documents into AI chat), code review of AI suggestions (same standard as human code), and IP awareness (partner IP files excluded from AI processing). **Priority: HIGH, can proceed in parallel with Phase 1 rollout.**

4. **Source Code Data Classification** (IP Safeguards backlog) — Identifies partner IP files, restricted codepaths (e.g., integration code for partner game titles), sensitive server configurations, and credentials. Produces a `.copilotignore` manifest and equivalent exclusion configs for other tools. **Priority: HIGH, should complete within first 2 weeks of rollout.**

### 4.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| ADOPT | GitHub Copilot Business | $7,000 | $3,420 |
| ADOPT* | SonarQube Developer (non-AI) | $5,750 | $5,000-15,000 |
| ADOPT | Sentry Business | $2,240 | $960 |
| PILOT | Backtrace (3-month trial) | $1,250 | $5,000-15,000 (if promoted) |
| **Total** | | **$16,240** | **$9,380-34,380** |

Notes: Post-launch range reflects whether Backtrace PILOT is promoted to ADOPT and SonarQube codebase growth. SonarQube is classified as non-AI infrastructure (AI CodeFix requires Enterprise edition at ~$65K+/year). All figures in USD.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5. DEVOPS & INFRASTRUCTURE

### 5.1 Discipline Overview

CH has no dedicated DevOps function. Engineers are context-switching into IT and infrastructure work alongside game development, and there is no CTO to own infrastructure strategy. CI/CD tooling is under evaluation (TeamCity, Jenkins, BuildKite); none is in place. This discipline is the most constrained by CH's organisational gap: AI tools for DevOps require someone to configure, maintain, and respond to their output, and CH does not have that person. Recommendations in this section are deliberately conservative; most advanced DevOps AI capabilities (AIOps, intelligent alerting, automated remediation) are premature until the DevOps hire is complete.

### 5.2 Task-Level Analysis

#### 5.2.1 CI/CD Build Failure Analysis & Automation

AI-powered analysis of build failures to surface root causes, suggest fixes, and reduce mean time to resolution for broken builds. For a UE5 project with long build times and no dedicated build engineer, this capability has high leverage if the CI/CD platform is in place. TeamCity AI Build Analyzer reached GA in early 2026 (confirmed; was Early Access in TeamCity 2025.11). AI build log analysis costs 125 build credits per failed build, included with TeamCity Enterprise licence.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| TeamCity AI Build Analyzer | SaaS/On-prem | 7 | 6 | 8 | 5 (est.) | 7 | 6 | 6.6 | PILOT |
| Harness AI | SaaS | 6 | 7 | 8 | 3 (est.) | 4 | 4 | 5.8 | WATCH |

*Composite calculation for TeamCity AI: (7 × 0.25) + (6 × 0.20) + (8 × 0.20) + (5 × 0.15) + (7 × 0.10) + (6 × 0.10) = 1.75 + 1.20 + 1.60 + 0.75 + 0.70 + 0.60 = 6.6 ✓*
*Harness AI: (6 × 0.25) + (7 × 0.20) + (8 × 0.20) + (3 × 0.15) + (4 × 0.10) + (4 × 0.10) = 1.50 + 1.40 + 1.60 + 0.45 + 0.40 + 0.40 = 5.8 ✓*

**Recommendation: PILOT** TeamCity AI Build Analyzer, conditional on CH selecting TeamCity as its CI/CD platform.

- **Pilot scope:** 3 months, covering the engineering team. Evaluate AI root cause accuracy on 50+ build failures. Compare resolution time with and without AI suggestions.
- **Integration timeline:** Included with TeamCity setup. AI features activate within the existing platform; no separate deployment.
- **Rollout owner:** Mustafa (Head of Tech), execution by the engineer responsible for CI/CD setup. Permanent owner: future DevOps Lead or CTO.
- **90-day success criteria:** AI correctly identifies root cause for 60%+ of build failures; mean time to resolution for CI failures decreases by 20% from baseline.
- **Rollback trigger:** AI suggestions are consistently wrong (accuracy below 40%); engineers stop reading AI output (measured by click-through rate on suggestions).

**Why TeamCity AI:** The AI Build Analyzer is the only CI/CD-native AI feature from a Tier 1 CI platform that is specifically designed for build failure analysis (GA status unconfirmed; may still be in Early Access as of June 2026). If CH selects TeamCity as its CI/CD platform (a decision independent of AI strategy), the AI features are a low-cost addition. TeamCity's on-premises option also supports code isolation for partner IP builds. Production: TeamCity is used by JetBrains' own teams and multiple game studios including CD Projekt Red (no independent production citation for CDPR TeamCity usage found, June 2026).

**Why not Harness:** Harness is a strong CI/CD platform with AI features (test intelligence, deployment verification, cost management). However, Harness is an enterprise-grade platform designed for large DevOps teams. CH has zero DevOps headcount; adopting a complex CI/CD platform alongside learning its AI features is too much organisational load. Team Adoption score of 3 reflects this. WATCH until CH has a DevOps hire and has outgrown its initial CI/CD choice.

**Data Egress:** TeamCity on-premises: no data egress for standard build analysis. AI features may send anonymised build metadata to JetBrains cloud [VENDOR CONTACT REQUIRED: TeamCity AI data processing model — confirm whether AI features send build metadata to JetBrains cloud]. If cloud-based, build logs (which may contain file paths revealing game feature names) would need review. TeamCity Cloud: all data on JetBrains infrastructure; DPA required.

**Cost Estimate:**
- TeamCity Cloud: $45/committer/month × 12 committers = $540/month. Pilot (3 months): $1,620.
- TeamCity On-Prem: $2,399/year (includes AI features). Pre-launch (2.3 years): ~$5,520.
- Post-launch annual: $2,399 (on-prem) or $6,480 (cloud)
- Conditional: only applies if CH selects TeamCity. If Jenkins or BuildKite is chosen, this recommendation does not apply.

**Disclosure Impact:** CI/CD tools are internal infrastructure. No platform disclosure obligations.

---

#### 5.2.2 UE5 Distributed Build Acceleration

UE5 full rebuilds without distribution take 30-60+ minutes, directly throttling engineering iteration speed. Distributed build systems parallelise compilation across multiple machines. Modern implementations include ML-based scheduling that optimises task distribution based on historical build patterns, hardware capabilities, and dependency graphs.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Incredibuild | Infrastructure | 3 | 10 | 10 | 6 (est.) | 7 | 4 | 6.8 | ADOPT* |
| FASTBuild | OSS | 6 | 7 | 10 | 4 (est.) | 4 | 10 | 6.9 | Alternative |

*Composite calculation for Incredibuild: (3 × 0.25) + (10 × 0.20) + (10 × 0.20) + (6 × 0.15) + (7 × 0.10) + (4 × 0.10) = 0.75 + 2.00 + 2.00 + 0.90 + 0.70 + 0.40 = 6.8 ✓*
*FASTBuild: (6 × 0.25) + (7 × 0.20) + (10 × 0.20) + (4 × 0.15) + (4 × 0.10) + (10 × 0.10) = 1.50 + 1.40 + 2.00 + 0.60 + 0.40 + 1.00 = 6.9 ✓*

**Note on classification:** Incredibuild is primarily a distributed build system, not an AI tool. Its ML scheduling layer (SmartScheduler) qualifies as a genuine ML application, but the core value proposition is parallel compilation, not AI. The AI Capability score is set to 3 to reflect this reality. Incredibuild is included because UE5 build acceleration is explicitly in scope and the tool is critical infrastructure for CH regardless of AI classification. The ADOPT* verdict indicates a non-AI infrastructure recommendation, not a top-ranked AI tool. FASTBuild is included as a non-AI open-source alternative for cost comparison.

**Recommendation: ADOPT** Incredibuild for UE5 build acceleration.

- **Integration timeline:** 1-2 weeks. Incredibuild has native UE5 integration (replaces UnrealBuildTool's local compilation with distributed agents). Requires deploying coordinator and agent software on build machines.
- **Rollout owner:** Mustafa (Head of Tech). Execution: senior engineer or the engineer managing CI/CD setup. Permanent owner: future DevOps Lead.
- **90-day success criteria:** Full UE5 rebuild time reduced from 30-60 minutes to under 10 minutes; incremental build times reduced by 50%+; all 12 engineering seats connected to the build grid.
- **Rollback trigger:** Build reliability degrades (distributed builds produce different results from local builds); infrastructure cost exceeds budget allocation; licensing terms change unfavourably.

**Why Incredibuild:** Production Readiness of 10 is the highest possible score. Incredibuild has been used by AAA studios for over a decade; Epic Games, Ubisoft, DICE (Battlefield), and CD Projekt Red are documented customers. For a UE5 MMO with long build times and 12 engineers, the productivity impact is transformational; the difference between a 45-minute and a 7-minute rebuild compounds across dozens of daily iterations. The ML scheduling layer optimises this further by learning from historical build patterns.

**Why not FASTBuild:** Open-source and free, which gives it a perfect Cost score (10). However, it lacks ML scheduling, requires significant manual configuration, and has no commercial support. Team Adoption score of 4 reflects the configuration overhead for a team with no DevOps. FASTBuild is viable if budget is the primary constraint; Incredibuild is the recommended option if budget permits.

**Data Egress:** Incredibuild on-premises: all compilation happens within CH's network. Source code and object files are distributed across local agents only. No data leaves the studio. Cloud burst mode (Incredibuild Cloud): compilation tasks are sent to cloud VMs. Source code snippets (headers, translation units) are present on cloud machines during compilation. Partner IP code should be excluded from cloud burst if this option is used.

**Cost Estimate:**
- Pre-launch: Incredibuild Developer/Enterprise pricing is custom; estimated ~$3,000-8,000/year for 12 seats [VENDOR CONTACT REQUIRED: current Incredibuild pricing model for game studios]. Over 2.3 years: ~$7,000-18,400.
- Post-launch annual: ~$3,000-8,000 (retained for live service development)
- Permanent infrastructure: Yes; build acceleration remains essential through live service patches and expansion development.

---

#### 5.2.3 Incident Response & Monitoring Automation

AI-powered alert correlation, noise reduction, and incident routing for production systems. Relevant post-launch (when the MMO is live with player-facing infrastructure) and during late development (when multiple server profiles are under load testing).

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| PagerDuty AIOps | SaaS | 7 | 9 | 9 | 3 (est.) | 5 | 4 | 6.7 | WATCH |
| Datadog AI | SaaS | 8 | 9 | 8 | 3 (est.) | 5 | 3 | 6.7 | WATCH |

*Composite calculation for PagerDuty: (7 × 0.25) + (9 × 0.20) + (9 × 0.20) + (3 × 0.15) + (5 × 0.10) + (4 × 0.10) = 1.75 + 1.80 + 1.80 + 0.45 + 0.50 + 0.40 = 6.7 ✓*
*Datadog AI: (8 × 0.25) + (9 × 0.20) + (8 × 0.20) + (3 × 0.15) + (5 × 0.10) + (3 × 0.10) = 2.00 + 1.80 + 1.60 + 0.45 + 0.50 + 0.30 = 6.7 ✓*

**Recommendation: WATCH** both tools. CH lacks the organisational prerequisites for incident response automation.

**Why WATCH:** Both PagerDuty and Datadog are excellent, mature platforms with genuine AI capabilities (ML-powered alert correlation, anomaly detection, intelligent routing). Production citations are extensive: PagerDuty is used by virtually all large-scale internet services; Datadog is used by major game companies including Riot Games (no independent production citation for Riot Games Datadog usage found, June 2026). However, Team Adoption scores of 3 reflect the reality that CH has no DevOps function, no on-call rotation, no alerting infrastructure, and no monitoring culture. These tools require a DevOps team to configure, tune, and respond to. Without that foundation, the AI features are useless.

**Revisit conditions:** DevOps Lead or dedicated SRE hire is in place; on-call rotation is established; basic monitoring infrastructure (APM, logging, metrics) is deployed. Evaluate both tools at that point using the standard rubric. Suggested revisit: 6 months after DevOps hire, or Phase 3 of the adoption roadmap.

**Counterfactual cost of not adopting:** Engineers continue to monitor systems manually (checking dashboards, responding to Slack alerts, reviewing logs). This is acceptable during pre-launch development but becomes a critical gap at launch when 5 server profiles must maintain uptime for paying subscribers.

### 5.3 Discipline Risk Summary

1. **No DevOps hire creates a single-point-of-failure.** Every AI DevOps recommendation except Incredibuild is contingent on hiring a DevOps Lead. Without this hire, the CI/CD platform decision stalls, monitoring infrastructure remains absent, and incident response is ad hoc. This is the highest-priority hire for AI infrastructure readiness.

2. **CI/CD platform decision blocks downstream AI tools.** TeamCity AI is conditional on choosing TeamCity. If CH selects Jenkins or BuildKite, the build failure analysis recommendation changes. The AI strategy should not drive the CI/CD platform decision; it should follow it.

3. **Infrastructure cost scaling post-launch.** An MMO with 5 server profiles, cross-play, and 200-600 players per zone requires production-grade monitoring. The jump from pre-launch (development builds only) to post-launch (player-facing infrastructure) will be steep. Budget for monitoring and incident response infrastructure separately from the AI tooling budget.

### 5.4 Governance Prerequisites

1. **AI Acceptable Use Policy v1** (Usage Policy & Governance) — Same prerequisite as Engineering. Covers AI tool access, data classification, approved uses. **Priority: CRITICAL.**
2. **Infrastructure data classification** (IP Safeguards) — Defines which build artifacts, logs, and server configurations can be processed by cloud-based AI tools. **Priority: HIGH, complete before any cloud CI/CD or monitoring tool is deployed.**
3. **Vendor security review process** (Tool Selection & Licensing) — For SaaS DevOps tools that will process build data and server telemetry. **Priority: MEDIUM, required before Phase 2 tool adoption.**

### 5.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| ADOPT | Incredibuild | $7,000-18,400 | $3,000-8,000 |
| PILOT | TeamCity AI (conditional) | $1,620-5,520 | $2,399-6,480 |
| WATCH | PagerDuty / Datadog | $0 | $0 (until adopted) |
| **Total** | | **$8,620-23,920** | **$5,399-14,480** |

Notes: Wide ranges reflect Incredibuild's custom pricing and the TeamCity cloud vs on-prem choice. All figures in USD. The DevOps budget is expected to increase significantly post-launch when monitoring and incident response infrastructure becomes essential.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6. ART PIPELINE

### 6.1 Discipline Overview

CH's art team is approximately 15-18 people, led by David Luong (Director of Art) with Sasha Krieger as Lead Concept/Environment Artist. The team works in Maya, ZBrush, Substance Suite (Painter and Designer), Houdini, Marvelous Designer, and Photoshop. Fred Dossola (Art Producer, started 5 June 2026) brings Sony/Cloud Imperium Games experience and an "orthodontist approach" to change: incremental, never nuclear.

**The critical constraint in this discipline is Sasha Krieger's strong personal opposition to AI for art.** This is genuine conviction rooted in professional ethics and community values, not technophobia or ignorance. Any AI art recommendation that ignores this reality will fail at the team level regardless of its technical merit. Recommendations in this section are therefore calibrated for voluntary adoption, ideation-only use cases, and tools that augment existing DCC workflows rather than replace human artists. No AI-generated art should enter the shipping pipeline without a named human artist's redraw and sign-off.

The secondary constraint is community perception. The MMO community has proven hypersensitive to AI-generated content, with multiple studios review-bombed in 2024-2026 over detected AI marketing imagery. CH's cosy byte-punk aesthetic is a differentiator; community trust in the art direction is a business asset that AI adoption could jeopardise if handled carelessly.

### 6.2 Task-Level Analysis

#### 6.2.1 Concept Art — Ideation & Moodboarding

Internal reference generation for colour palettes, composition exploration, and mood/atmosphere references during early concepting. Outputs are creative inputs, not shipped assets. The human artist always produces the final concept.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Adobe Firefly (Enterprise) | SaaS | 7 | 8 | 9 | 5 (est.) | 8 | 6 | 7.3 | PILOT |
| Midjourney (Pro) | SaaS | 9 | 7 | 3 | 4 (est.) | 5 | 7 | 6.1 | WATCH |
| Stable Diffusion XL (self-hosted) | OSS | 8 | 6 | 7 | 3 (est.) | 3 | 9 | 6.3 | WATCH |

*Composite calculation for Adobe Firefly: (7 × 0.25) + (8 × 0.20) + (9 × 0.20) + (5 × 0.15) + (8 × 0.10) + (6 × 0.10) = 1.75 + 1.60 + 1.80 + 0.75 + 0.80 + 0.60 = 7.3 ✓*
*Midjourney: (9 × 0.25) + (7 × 0.20) + (3 × 0.20) + (4 × 0.15) + (5 × 0.10) + (7 × 0.10) = 2.25 + 1.40 + 0.60 + 0.60 + 0.50 + 0.70 = 6.1 ✓*
*Stable Diffusion XL: (8 × 0.25) + (6 × 0.20) + (7 × 0.20) + (3 × 0.15) + (3 × 0.10) + (9 × 0.10) = 2.00 + 1.20 + 1.40 + 0.45 + 0.30 + 0.90 = 6.3 ✓*

**Recommendation: PILOT** Adobe Firefly Enterprise for internal ideation only, with voluntary participation.

- **Pilot scope:** 5 seats, 3 months, voluntary participation. Artists who wish to try Firefly for moodboarding may do so; no one is required to use it. Track: number of voluntary users, usage frequency, whether any outputs influence final concepts (with proper attribution), and team sentiment (anonymous survey at 30 and 90 days).
- **Integration timeline:** 1 week (licence procurement, SSO setup, usage guidelines document).
- **Rollout owner:** David Luong (Director of Art), with Fred Dossola (Art Producer) as the operational ally managing the incremental rollout. Permanent owner: future Art Technology Lead.
- **90-day success criteria:** 3+ artists voluntarily using Firefly for moodboarding; no AI-generated concept enters the asset pipeline without a named human artist's redraw and sign-off; no team friction incidents reported to HR; team sentiment survey shows no morale decline from baseline.
- **Rollback trigger:** Team morale impact (anonymous survey score drops >15% from baseline); any IP incident involving Firefly outputs; Sasha or any artist reports that AI tooling is being used coercively or that AI outputs are entering the pipeline unattributed; community detection of AI-derived art in any public-facing material.

**Why Firefly:** Adobe Firefly's training data is exclusively licensed content (Adobe Stock, public domain works, and Adobe-licensed datasets), providing the strongest IP defence of any image generation tool. The Enterprise tier includes IP indemnification: up to $10,000 per asset on VIP agreements and up to $3,000,000 per asset on ETLA agreements (verified June 2026). Important: indemnification covers Firefly-native outputs only, not third-party partner models accessible within Firefly. Pricing: ~$24/user/month add-on to Creative Cloud enterprise, or ~$80/month per seat on full enterprise agreements with unlimited generation credits. Firefly integrates with Photoshop (Generative Fill, Generative Expand), which CH's artists already use. Production: Adobe's Creative Cloud suite is universal in game studios. The AI features specifically are newer (2023-2025), but Adobe is the safest vendor for IP-sensitive creative work.

**Why not Midjourney:** Scores highest on raw Capability (9); its image quality and style control are genuinely superior for concept ideation. However, its IP/Legal score of 3 blocks PILOT per the sensitivity floor rule. Midjourney's training data includes images scraped from the internet without creator consent; the company is subject to ongoing litigation (various artist class actions, Getty Images v Stability AI applies to the model class). Until litigation resolves and Midjourney offers IP indemnification, the legal risk outweighs the capability advantage. WATCH; revisit Q1 2027 or when litigation reaches resolution.

**Why not Stable Diffusion XL (self-hosted):** Self-hosting provides full data isolation (partner IP never leaves CH's network) and uses models that can be fine-tuned on CH's own art style. However, it requires GPU infrastructure and DevOps capacity that CH does not have, and the Team Adoption score of 3 reflects both Sasha's opposition and the technical overhead. WATCH until a DevOps hire is in place, the team has warmed to AI ideation tools through voluntary Firefly use, and CH has the infrastructure to support on-premises GPU inference.

**CH-Specific Risk:** Sasha Krieger's opposition means this rollout must be handled with particular care. The tool must be framed as equivalent to a Pinterest board or ArtStation browse: a reference tool that speeds up the earliest phase of ideation, not a replacement for concept art. Fred Dossola's "orthodontist approach" makes him the ideal rollout ally; he understands incremental adoption and will not force the issue. Mandatory guardrails: (1) no AI-generated concept enters the pipeline without a named artist's redraw and sign-off, (2) no artist is required to use the tool, (3) all AI-derived references are tagged in the internal review system so the team can see exactly where AI was used.

**Data Egress:** Adobe Firefly Enterprise processes inputs via Adobe's cloud infrastructure. Partner IP and unreleased character designs MUST NOT be used as inputs. Guardrail: restrict Firefly use to abstract moodboarding (colour palettes, composition references, texture exploration, atmosphere studies), never character-specific or asset-specific generation. Usage policy must explicitly prohibit uploading reference images that contain partner game IP.

**Cost Estimate:**
- Pre-launch (PILOT, then rollout if successful): If CH already holds Creative Cloud enterprise licences, Firefly is a ~$24/user/month add-on. Pilot: 5 seats × $24/month × 3 months = $360. Full rollout: 10 seats × $24/month × 24 months = $5,760. If standalone enterprise: 5 seats × $80/month × 3 months = $1,200 (pilot), up to 10 × $80 × 24 = $19,200 (full). Blended estimate: $360-19,200.
- Post-launch annual: ~$8,400 (10 seats, if retained for expansion concept work)
- Not production-only: concept work continues post-launch for expansions and live content updates.

**Disclosure Impact:** Steam AI disclosure: YES for "Pre-Generated" category if any Firefly-generated or Firefly-derived content ships in the final build and is consumed by players. Valve's January 2026 policy update clarifies that AI tools used to help build games (efficiency tools, internal ideation) do not require disclosure; only content consumed by players triggers the requirement. If CH uses Firefly purely for internal concept exploration and all shipped art is human-created from scratch, no disclosure is triggered. Conservative position: disclose if any AI-generated reference materially influenced a shipped asset's composition, even if redrawn.

---

#### 6.2.2 Texturing & Material Creation

AI-augmented PBR texture generation, pattern creation, and material authoring within the existing Substance Suite workflow. This is the lowest-risk AI art category because: (a) it augments a tool artists already use daily, (b) procedural textures are not copyrightable in the way character designs are, (c) the AI features are opt-in additions to Adobe Substance, not a new tool, and (d) the community does not scrutinise texture origins the way it does character or environment art.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Adobe Substance 3D (AI features) | SaaS | 8 | 7 | 9 | 7 (est.) | 9 | 5 | 7.7 | ADOPT |
| InstaMAT Studio | SaaS | 7 | 5 | 8 | 5 (est.) | 6 | 8 | 6.5 | WATCH |

*Composite calculation for Substance 3D AI: (8 × 0.25) + (7 × 0.20) + (9 × 0.20) + (7 × 0.15) + (9 × 0.10) + (5 × 0.10) = 2.00 + 1.40 + 1.80 + 1.05 + 0.90 + 0.50 = 7.7 ✓*
*InstaMAT: (7 × 0.25) + (5 × 0.20) + (8 × 0.20) + (5 × 0.15) + (6 × 0.10) + (8 × 0.10) = 1.75 + 1.00 + 1.60 + 0.75 + 0.60 + 0.80 = 6.5 ✓*

**Recommendation: ADOPT** Adobe Substance 3D AI features for texturing and material workflows.

- **Approved scope:** Internal material ideation and texture variation only. No AI-generated texture content ships in the final build without art-director (David Luong) approval and Steam disclosure review. This restriction exists because no studio has publicly confirmed shipping with Substance AI features specifically (the base product is universal but the AI features are new, launched 2024-2025); ADOPT is justified for internal pipeline productivity, not for unsupervised shipped content.
- **Integration timeline:** Zero incremental effort. CH already uses Substance Suite; the AI features (Text to Texture, Text to Pattern, Image to Material) are available in current versions. Artists opt in by using the features when they choose.
- **Rollout owner:** David Luong (Director of Art). No dedicated rollout needed; features are already available in the licensed software.
- **90-day success criteria:** 5+ artists using AI texture features at least weekly; measurable reduction in texture creation time for standard PBR materials (target: 30% faster for common materials like stone, metal, fabric); no quality regression in shipped texture quality as assessed by Art Director review.
- **Rollback trigger:** Texture quality drops below the Art Director's standard; artists report the AI features produce results that require more cleanup than manual creation; licensing terms change to restrict commercial use of AI-generated textures.

**Why Substance 3D AI:** A composite of 7.7 reflects a strong combination: high capability in a directly relevant task (PBR texture generation for UE5), strong IP safety (Firefly-powered, Adobe Stock-trained), and familiar workflow (artists already use Substance daily). Team Adoption is scored at 7 (est.) rather than higher because Sasha Krieger's broad opposition to AI in the art pipeline creates uncertainty even for opt-in features within an existing tool. The adoption score reflects the political reality, not the tool's usability. The only drag on the composite is Cost (5), reflecting Substance Teams pricing at $119.99/seat/month. However, CH is likely already paying for Substance licences; the AI features are included at no additional cost in current plans. Production: Substance 3D is used by CDPR (Cyberpunk 2077), Naughty Dog (The Last of Us), Ubisoft (Assassin's Creed). The AI features launched 2024-2025 (no independent production citation for Substance AI features specifically in a shipped title found; base product is universal but AI features are new, June 2026).

**Why not InstaMAT:** InstaMAT is a capable material creation tool with AI features, but its Production Readiness of 5 reflects a younger product with limited studio adoption compared to Substance (no independent game studio production citation for InstaMAT found, June 2026). At CH's scale, switching material tools would be a significant workflow disruption; the adoption risk is not justified when Substance already has the AI features the team needs. WATCH; revisit if InstaMAT demonstrates significant capability advantages or if Adobe's pricing becomes prohibitive.

**CH-Specific Risk:** This is the safest AI category in the art pipeline. Even Sasha is unlikely to oppose AI-assisted texture generation within a tool the team already uses, because the output is procedural material, not creative work that replaces an artist's vision. The key risk is over-reliance: if artists use Text to Texture for everything, they may lose the ability to hand-author materials when needed (e.g., for hero assets that require specific artistic direction). Mitigation: Art Director (David Luong) designates "hero" materials that must be hand-authored; AI-assisted texturing is approved for standard/background materials.

**Data Egress:** Substance AI features process inputs via Adobe cloud (Firefly backend). For texturing, the inputs are text prompts or reference images, not proprietary game assets. Partner IP risk is negligible for texture generation; no character designs or story content is involved. Standard DPA with Adobe covers GDPR requirements.

**Cost Estimate:**
- Pre-launch: $0 incremental (AI features included in existing Substance Suite licences). The Substance licences themselves (~$120/seat/month × 15 seats = $1,800/month = ~$50,400 over 28 months) are already budgeted as DCC tools, not AI tooling.
- Post-launch annual: $0 incremental
- Note: If CH is not currently on the Substance Teams plan, upgrading to access AI features would cost ~$120/seat/month. This analysis assumes CH already holds Substance licences.

**Disclosure Impact:** Steam AI disclosure: Required under "Pre-Generated" category only if AI-generated textures ship in the final build and are consumed by players. Per Valve's January 2026 policy update, internal productivity tooling (using AI to speed up texture creation where the artist still authors the final output) does not trigger disclosure. If Substance AI generates a texture that ships unchanged, disclosure is required. If an artist uses AI-suggested patterns as starting points and substantially reworks them, the obligation is less clear; conservative position: disclose.

---

#### 6.2.3 3D Asset Generation for Shipped Content

AI generation of 3D models (characters, props, environment pieces) for use in the shipped game. This is the highest-risk AI art category for CH due to IP uncertainty, community backlash risk, and art team opposition.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Meshy Pro | SaaS | 6 | 3 | 4 | 2 (est.) | 5 | 8 | 4.5 | AVOID |

*Composite calculation for Meshy: (6 × 0.25) + (3 × 0.20) + (4 × 0.20) + (2 × 0.15) + (5 × 0.10) + (8 × 0.10) = 1.50 + 0.60 + 0.80 + 0.30 + 0.50 + 0.80 = 4.5 ✓*

**Recommendation: AVOID** AI-generated 3D assets for shipped content.

- **Specific risk:** Three compounding risks make this category untenable for CH:
  1. **IP/Legal (score 4):** Meshy and comparable text-to-3D tools (Luma AI, Tripo3D) train on 3D datasets with unclear provenance. No tool in this category offers IP indemnification for generated 3D models. The IP/Legal score of 4 trips the sensitivity floor for art tools, blocking ADOPT or PILOT regardless of composite.
  2. **Community backlash (high probability, high impact):** If the MMO community detects AI-generated 3D assets in CH's game, the reputational damage could be severe. Multiple studios have been review-bombed over AI art in 2024-2026. For a subscription MMO where community trust is a core business asset, this risk is not acceptable.
  3. **Team resistance (score 2):** Sasha Krieger's opposition to AI art is strongest in the area of asset creation. Forcing AI 3D assets into the pipeline over the objections of the lead concept/environment artist would destabilise the art team and risk key talent departures.
- **Probability of risk materialising:** High (4/5). Community detection methods for AI art are improving; AI-generated 3D models have distinctive artefacts that experienced players and artists can identify.
- **Impact if risk materialises:** High (4/5). Review-bombing, press coverage, investor concern, art team morale collapse, potential Sasha departure.
- **Counterfactual cost:** CH continues to create all 3D assets through its human art team. For a 15-18 person art team with 2+ years to launch, this is adequate for the game's scope. The "cost" of not using AI 3D generation is zero; the team is already sized for manual asset creation.
- **Alternative workflow:** Human artists create all shipped 3D assets using Maya, ZBrush, and Substance, following the established pipeline. For rapid prototyping and blockout, engineers and designers can use UE5's built-in BSP and modular kit workflows.

**Why not even PILOT:** A PILOT of AI 3D generation, even for internal prototyping, carries organisational risk at CH because of Sasha's opposition. Even an internal-only pilot signals a direction that could erode trust with the art team. The benefits of AI 3D generation for prototyping are real but modest; manual blockout workflows are adequate for CH's timeline.

**Disclosure Impact:** Not applicable (AVOID).

---

#### 6.2.4 Environment Layout & Procedural Generation

AI-assisted placement and layout of environment assets (props, foliage, architectural elements) within UE5 levels, plus ML-enhanced procedural generation tools for terrain, vegetation, and world building. This category is less controversial than generative AI art because the tools arrange existing human-created assets rather than generating new ones.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Houdini ML Features (SideFX Labs) | DCC Plugin | 7 | 7 | 9 | 7 (est.) | 8 | 6 | 7.4 | ADOPT |
| Promethean AI | SaaS | 8 | 5 | 7 | 5 (est.) | 8 | 7 | 6.7 | PILOT |

*Composite calculation for Houdini ML: (7 × 0.25) + (7 × 0.20) + (9 × 0.20) + (7 × 0.15) + (8 × 0.10) + (6 × 0.10) = 1.75 + 1.40 + 1.80 + 1.05 + 0.80 + 0.60 = 7.4 ✓*
*Promethean AI: (8 × 0.25) + (5 × 0.20) + (7 × 0.20) + (5 × 0.15) + (8 × 0.10) + (7 × 0.10) = 2.00 + 1.00 + 1.40 + 0.75 + 0.80 + 0.70 = 6.7 ✓*

**Recommendation: ADOPT** Houdini ML features for terrain and procedural generation. **PILOT** Promethean AI for environment layout and level dressing.

**Houdini ML ADOPT details:**
- **Integration timeline:** Zero incremental effort. CH already uses Houdini; ML features (ML Deformer for game-ready mesh deformation, terrain generation tools, procedural vegetation with ML-based distribution) are available through SideFX Labs plugins, which are free and open-source.
- **Rollout owner:** David Luong (Director of Art); execution by Houdini-trained technical artists.
- **90-day success criteria:** ML-enhanced terrain generation used for at least 2 zone prototypes; ML Deformer integrated into character/creature deformation pipeline for at least 1 character class; artists report time savings vs manual terrain sculpting.
- **Rollback trigger:** ML features produce artefacts that require more cleanup than manual methods; Houdini ML tools conflict with existing pipeline scripts.

**Why Houdini ML:** CH already uses Houdini, making this a zero-friction adoption. SideFX Labs ML tools run locally (no cloud dependency, no data egress), use CH's own terrain data for training, and produce procedural outputs that are indistinguishable from manually crafted terrain. IP/Legal score of 9 reflects the fully local, non-generative nature of these tools. Production: Houdini is used by virtually every AAA studio; SideFX Labs ML features are documented in SideFX's official tutorials and used in film VFX pipelines (ILM, Weta) which share technology with game studios (no independent production citation for SideFX ML features in a shipped game title found, June 2026).

**Promethean AI PILOT details:**
- **Pilot scope:** 3 seats (environment artists), 3 months. Evaluate on one MMO zone (e.g., a Downtime city district). Measure: time-to-dress a zone compared to manual placement, artist satisfaction with AI suggestions, quality of layouts as assessed by Art Director.
- **Integration timeline:** 1 week (UE5 plugin installation, asset library configuration).
- **Rollout owner:** David Luong, with Fred Dossola managing the pilot logistics.
- **90-day success criteria:** Environment artists find AI layout suggestions useful for at least 40% of placement tasks; dressed zone passes Art Director quality review without significantly more revision than manually dressed zones.
- **Rollback trigger:** Artists find AI suggestions consistently off-target for the byte-punk aesthetic; tool instability disrupts workflow; Sasha objects to the tool's influence on environment art direction.

**Why Promethean AI:** Scores highest on Capability (8) because it is purpose-built for the exact task: AI-assisted environment layout in game engines. It works with the studio's existing asset library (human-created models) and suggests placements; it does not generate new assets. This distinction is important for CH: Promethean AI is a layout assistant, not a generative AI art tool. Disney Accelerator backed. Production: "10,000+ users including PlayStation Studios" (verified via Promethean AI website and third-party sources), but no specific PlayStation studio or shipped title is named. Disney Accelerator backing confirmed. Production Readiness of 5 reflects the absence of a verifiable shipped-game citation.

**CH-Specific Risk:** Environment layout assistance is less politically charged than generative art, but Sasha's opposition may extend to any AI influence on the art pipeline. Fred Dossola's incremental approach should guide the pilot: start with a single zone, demonstrate value, let artists form their own opinion. If the environment team embraces it independently, adoption will be organic. If Sasha objects, respect the objection and constrain the tool to zones she does not directly oversee.

**Data Egress:** Houdini ML: fully local; no data egress. Promethean AI: processes asset references through cloud AI to generate layout suggestions [VENDOR CONTACT REQUIRED: Promethean AI data processing model — confirm whether asset metadata is sent to cloud]. Asset metadata (names, tags, categories) is sent; full geometry is not. Partner IP assets must be excluded from Promethean AI's asset catalogue.

**Cost Estimate:**
- Houdini ML: $0 incremental (SideFX Labs plugins are free; Houdini licences are already budgeted).
- Promethean AI PILOT: 3 seats × $29/month (Indie tier, verified) × 3 months = $261. If promoted at Pro tier: 6 seats × $89.99/month (verified) × 24 months = $12,959. Enterprise tier available for larger deployments (custom pricing).
- Post-launch annual: Houdini ML $0; Promethean AI $4,320 (if retained).

**Disclosure Impact:** Houdini ML: No disclosure required (procedural generation with studio's own tools and data). Promethean AI: Steam Pre-Generated disclosure recommended if AI-suggested layouts influence shipped environments, even though the assets themselves are human-created.

---

### 6.3 Discipline Risk Summary

1. **Art team morale is the binding constraint.** The biggest risk in this discipline is not technical or legal; it is organisational. Sasha Krieger's opposition to AI art is genuine and shared by segments of the broader art community. A heavy-handed AI rollout could trigger key talent departures, team friction, and reduced output quality from demoralised artists. Every recommendation in this section is calibrated for voluntary adoption. If in doubt, err on the side of slower adoption and stronger guardrails.

2. **Community backlash is a material business risk.** The MMO community has demonstrated willingness to review-bomb games over detected AI art. For a subscription MMO where community sentiment directly impacts revenue, this risk must be managed proactively. CH should establish clear public positioning on AI art use (ideation and reference only, not shipped assets) before launch, ideally as part of its community communication strategy.

3. **Platform disclosure requirements are manageable but not optional.** Steam's AI disclosure form (updated January 2026) requires studios to declare AI-generated content that ships in the game and is consumed by players. Internal productivity tools (code assistants, ideation tools, internal-only prototyping) are explicitly outside the disclosure focus. For shipped AI-generated content, disclosure under "Pre-Generated" is low risk and demonstrates good faith. For any live-generated AI (real-time NPC dialogue, procedural content at runtime), the "Live-Generated" category applies and attracts more community scrutiny. Failing to disclose shipped AI content and being discovered later would be far more damaging than transparent disclosure.

4. **Partner IP must never enter AI art tools.** CH's game integrates partner games' IP. Any AI art tool that processes input images or text prompts must be explicitly restricted from partner IP content. This is a contractual obligation, not a preference. Usage guidelines must be written and enforced before any AI art tool is deployed.

### 6.4 Governance Prerequisites

1. **AI Acceptable Use Policy v1** (Usage Policy & Governance) — Must define acceptable and prohibited uses of AI in art workflows. Must explicitly state: (a) AI is for ideation and reference only, (b) no AI-generated art ships without human redraw, (c) partner IP is never used as AI input. **Priority: CRITICAL, Phase 1 prerequisite.**

2. **AI-Assisted Concept Art Guidelines** (Production Integration) — Detailed workflow guidelines for how Firefly (or other ideation tools) fits into the concept pipeline. Covers: permitted use cases, attribution metadata, review gates, and escalation process if an AI reference is detected in shipped art. **Priority: HIGH, required before Firefly PILOT launch.**

3. **Asset Attribution Metadata Standard** (Production Integration) — Every asset in the pipeline must carry metadata indicating whether AI was used at any stage of its creation (ideation, texturing, layout). This supports Steam disclosure compliance and internal audit. **Priority: HIGH, required before any AI art tool is deployed.**

4. **Partner IP Handling Procedures for AI Tools** (IP Safeguards) — Specifies which asset categories, reference images, and text descriptions are prohibited from AI tool inputs. Covers partner game IP, unreleased character designs, and story content. **Priority: CRITICAL, Phase 1 prerequisite.**

5. **Art Team AI Training** (Training & Education) — Voluntary training sessions (recorded for async consumption by remote team) covering: what the approved AI tools do, how to use them within guidelines, how to tag AI-assisted work, and how to report concerns. **Priority: MEDIUM, within first sprint of PILOT launch.**

### 6.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| ADOPT | Substance 3D AI features | $0 (included in existing licences) | $0 |
| ADOPT | Houdini ML features | $0 (SideFX Labs, free) | $0 |
| PILOT | Adobe Firefly Enterprise | $360-1,200 (pilot) + $5,760-19,200 (if promoted) | $8,400 |
| PILOT | Promethean AI | $261 (pilot, 3×$29/mo×3mo) + $12,959 (if promoted, 6×$90/mo×24mo) | $6,480 |
| AVOID | AI 3D Generation (Meshy etc.) | $0 | $0 |
| **Total (pilots only)** | | **$1,590** | **$0** |
| **Total (if all pilots promoted)** | | **$27,030** | **$12,720** |

Notes: The two ADOPT recommendations have zero incremental cost because they are features within tools CH already licences. The AI art budget is almost entirely driven by pilot-to-promotion decisions on Firefly and Promethean AI. All figures in USD.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 7. ANIMATION

### 7.1 Discipline Overview

CH's animation team is small (~4-6 people) and unstable: the lead animator (Alan/Alon) is on a PIP with expected exit, and a backfill is being pipelined. This instability constrains adoption capacity; the team cannot absorb significant tool changes during a leadership transition. The team works in Maya with FBX export to UE5. As a 100% remote studio, CH has no physical motion capture facility, making remote-friendly capture solutions particularly valuable. The game's combat system (pressure/crack stacking with GW2-style hitbox targeting) demands high-quality character animation; the cosy aesthetic and player housing systems demand expressive, personality-driven NPC animation.

### 7.2 Task-Level Analysis

#### 7.2.1 Motion Capture & Cleanup

Remote-friendly motion capture and AI-powered cleanup of captured data. For a fully remote studio with no mocap stage, video-based and wearable solutions are the only viable options. AI cleanup reduces the hours of manual polish traditionally required to make mocap data game-ready.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Rokoko Studio AI | SaaS/Local | 7 | 7 | 9 | 6 (est.) | 7 | 7 | 7.3 | PILOT |
| DeepMotion | SaaS | 6 | 4 | 8 | 6 (est.) | 6 | 8 | 6.2 | WATCH |
| Move.ai | SaaS | 8 | 6 | 8 | 3 (est.) | 4 | 3 | 6.0 | WATCH |

*Composite for Rokoko: (7 × 0.25) + (7 × 0.20) + (9 × 0.20) + (6 × 0.15) + (7 × 0.10) + (7 × 0.10) = 1.75 + 1.40 + 1.80 + 0.90 + 0.70 + 0.70 = 7.3 ✓*
*DeepMotion: (6 × 0.25) + (4 × 0.20) + (8 × 0.20) + (6 × 0.15) + (6 × 0.10) + (8 × 0.10) = 1.50 + 0.80 + 1.60 + 0.90 + 0.60 + 0.80 = 6.2 ✓*
*Move.ai: (8 × 0.25) + (6 × 0.20) + (8 × 0.20) + (3 × 0.15) + (4 × 0.10) + (3 × 0.10) = 2.00 + 1.20 + 1.60 + 0.45 + 0.40 + 0.30 = 6.0 ✓*

**Recommendation: PILOT** Rokoko Studio AI for remote motion capture and AI-powered cleanup.

- **Pilot scope:** 2-3 animators, 3 months. Evaluate Rokoko Video (camera-based, no hardware required) for body mocap. If results justify it, evaluate Smartsuit Pro hardware ($2,500/suit) for higher fidelity. Compare capture quality against hand-keyed animation for standard locomotion cycles and combat moves.
- **Integration timeline:** 1 week for Rokoko Studio software setup; FBX export to Maya/UE5 pipeline is documented. Hardware (if pursued) adds 2-3 weeks for procurement and calibration.
- **Rollout owner:** David Luong (Director of Art, interim) until new animation lead is in place. Permanent owner: new animation lead.
- **90-day success criteria:** At least 10 usable motion clips captured and cleaned via Rokoko AI cleanup; cleanup time reduced by 40% compared to manual polish of equivalent quality data; animation quality passes Art Director review for game integration.
- **Rollback trigger:** Capture quality insufficient for the game's hitbox combat system (requires precise limb positioning); AI cleanup introduces artefacts that require more manual work than raw keyframing; new animation lead rejects the tool.

**Why Rokoko:** The strongest fit for a remote studio. Rokoko's inertial mocap suits can be shipped to each animator's home, and Rokoko Video (AI-powered camera-based mocap) requires only a webcam. The AI cleanup features (noise reduction, foot locking, retargeting) reduce the manual polish burden that makes mocap expensive. Production: Rokoko suits are used across indie and AA studios; the AI cleanup features are newer (2024-2025) (no independent production citation for Rokoko AI cleanup in a shipped title found, June 2026). IP/Legal: 9 reflects fully local processing; mocap data never leaves the studio's control.

**Why not Move.ai:** Highest raw Capability (8) due to superior markerless capture quality from multi-camera setups. However, it requires a calibrated multi-camera rig, which is incompatible with CH's remote workflow unless each animator sets up a home rig. Cost of 3 reflects the pricing (~$400/month Pro tier) plus hardware investment. Team Adoption of 3 reflects the logistical overhead. WATCH until CH has a physical office or co-located animation sessions.

**Why not DeepMotion:** Convenient single-video capture via web upload, but quality is below what CH's combat system demands. Production Readiness of 4 reflects limited professional adoption; no named game studio or shipped title confirmed (verified: DeepMotion is used by independent developers for prototyping but no production citation exists). WATCH; useful for rapid prototyping of animation ideas but not for shipped combat animations.

**Data Egress:** Rokoko Studio: local processing. Rokoko Video: video is processed via Rokoko's cloud for AI-based skeletal extraction [VENDOR CONTACT REQUIRED: Rokoko Video data processing model — confirm whether video is processed via cloud]. If cloud-processed, partner IP considerations are minimal (body movement data is not game IP). DeepMotion and Move.ai: cloud-based processing of video uploads.

**Cost Estimate:**
- Rokoko PILOT (software only): ~$500/year × 3 seats × 0.25 years = $375. Hardware (optional): $2,500/suit × 3 = $7,500.
- If promoted: software ~$2,000/year + any additional hardware.
- Post-launch: $2,000/year (retained for expansion animation).

---

#### 7.2.2 AI-Assisted Keyframe Animation

AI-powered assistance for hand-keyed animation: automatic posing, physics simulation, and inbetweening. Reduces the mechanical work of keyframe animation while keeping the creative direction with the human animator.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Cascadeur Pro | Local | 7 | 5 | 9 | 6 (est.) | 6 | 8 | 6.9 | PILOT |
| Plask | SaaS | 5 | 3 | 7 | 5 (est.) | 5 | 7 | 5.2 | WATCH |

*Composite for Cascadeur: (7 × 0.25) + (5 × 0.20) + (9 × 0.20) + (6 × 0.15) + (6 × 0.10) + (8 × 0.10) = 1.75 + 1.00 + 1.80 + 0.90 + 0.60 + 0.80 = 6.9 ✓*
*Plask: (5 × 0.25) + (3 × 0.20) + (7 × 0.20) + (5 × 0.15) + (5 × 0.10) + (7 × 0.10) = 1.25 + 0.60 + 1.40 + 0.75 + 0.50 + 0.70 = 5.2 ✓*

**Recommendation: PILOT** Cascadeur Pro, contingent on animation team stability.

- **Pilot scope:** 2 animators, 3 months. Evaluate AutoPhysics and AI Inbetweening on 5 combat animation sequences and 5 emote/social animations. Compare time-to-completion and quality against pure Maya workflow.
- **Integration timeline:** 1-2 days (standalone application; FBX round-trip with Maya). UE5 Live Link (confirmed: released in Cascadeur 2026.1, April 2026, funded by $50K Epic MegaGrant; requires UE5 5.5-5.7 and paid Cascadeur subscription) enables real-time preview.
- **Rollout owner:** David Luong (interim). Permanent owner: new animation lead.
- **90-day success criteria:** Animators report meaningful time savings on inbetweening tasks; physics simulation produces believable results for the game's pressure/crack combat system; tool integrates into daily workflow without disruption.
- **Rollback trigger:** FBX round-trip introduces data loss or skeleton issues; AI physics produces results incompatible with UE5's animation system; new animation lead prefers a different approach.

**Why Cascadeur:** Purpose-built for game animation with AI features that assist rather than replace the animator. AutoPhysics simulates realistic secondary motion, and AI Inbetweening generates intermediate frames between key poses. Both are time-saving features that keep creative control with the animator. IP/Legal score of 9 reflects fully local processing with no cloud dependency. Production: Cascadeur was developed by Nekki, who used it for Shadow Fight 3 (shipped, mobile). No external game studio customer with a shipped title has been independently confirmed (verified: search returns only Nekki's own games — Shadow Fight 3, SPINE). Cascadeur received an Epic MegaGrant ($50K) for the UE5 Live Link plugin, indicating Epic's endorsement but not a shipped-game citation. Pricing at $33/month Pro is modest.

**Why not Plask:** Web-based animation tool with AI motion editing. Lower capability (5) and production readiness (3) compared to Cascadeur. No shipped game citation (no independent production citation found, June 2026). WATCH until the tool matures and demonstrates game-quality output.

**Cost Estimate:**
- Cascadeur PILOT: $33/month × 2 seats × 3 months = $198. If promoted: $33/month × 4 seats × 24 months = $3,168.
- Post-launch: $1,584/year (4 seats).

---

#### 7.2.3 Facial Animation

AI-powered facial motion capture and lip-sync animation. Critical for an MMO with NPC dialogue, cinematic sequences, and player expression systems. For a remote studio, iPhone-based facial capture is transformative.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| MetaHuman Animator | UE5 Plugin | 8 | 7 | 10 | 7 (est.) | 10 | 10 | 8.5 | ADOPT |
| NVIDIA Audio2Face | Desktop | 7 | 4 | 9 | 4 (est.) | 3 | 9 | 6.2 | WATCH |

*Composite for MetaHuman Animator: (8 × 0.25) + (7 × 0.20) + (10 × 0.20) + (7 × 0.15) + (10 × 0.10) + (10 × 0.10) = 2.00 + 1.40 + 2.00 + 1.05 + 1.00 + 1.00 = 8.5 ✓*
*Audio2Face: (7 × 0.25) + (4 × 0.20) + (9 × 0.20) + (4 × 0.15) + (3 × 0.10) + (9 × 0.10) = 1.75 + 0.80 + 1.80 + 0.60 + 0.30 + 0.90 = 6.2 ✓*

**Recommendation: ADOPT** MetaHuman Animator for facial animation capture.

- **Integration timeline:** Zero. MetaHuman Animator is built into Unreal Engine 5. An iPhone with the Live Link Face app serves as the capture device.
- **Rollout owner:** David Luong (Director of Art, interim). Any animator with an iPhone can begin using it immediately. Permanent owner: new animation lead.
- **90-day success criteria:** Facial animation captured for at least 5 NPC dialogue sequences; facial capture quality passes Art Director review; workflow integrated into at least one cinematic pipeline.
- **Rollback trigger:** Facial data quality insufficient for the game's art style (byte-punk may require stylised facial animation that AI capture cannot produce); iPhone dependency creates logistical issues for team members without compatible devices.

**Why MetaHuman Animator:** The highest composite score among AI-native tools in this report (8.5). It is free, built into UE5, requires only an iPhone for capture, and produces production-quality facial animation data. IP/Legal of 10 reflects Epic's own tool with no external data processing. For a remote studio, iPhone-based facial capture eliminates the need for any specialised hardware. Production: Hangar 13 presented MetaHuman in their character pipeline for Mafia: The Old Country at Unreal Fest Stockholm 2025 (verified). The Matrix Awakens tech demo and Fortnite cinematics use MetaHuman technology. MetaHuman tooling is now fully integrated into UE5 (in-editor as of UE 5.7, verified). Note: this is not MetaHuman the character creation system; it is the facial animation capture feature within UE5 that can target any compatible character rig.

**Why not NVIDIA Audio2Face:** Audio2Face generates facial animation from audio input alone (no camera needed), which is compelling for batch-processing NPC dialogue. However, it requires NVIDIA Omniverse, which CH does not use; the Integration score of 3 reflects this platform dependency. The UE5 Omniverse Connector exists but adds pipeline complexity. Production Readiness of 4 reflects tech demo usage without confirmed shipped game citations (no independent production citation for Audio2Face in a shipped game title found, June 2026). WATCH until Omniverse integration matures or Audio2Face becomes available as a standalone UE5 plugin. Revisit: Q2 2027.

**Data Egress:** MetaHuman Animator: fully local. iPhone captures facial data via Live Link; all processing occurs within UE5 on the local machine. No cloud dependency. Audio2Face: local processing via Omniverse; no cloud dependency for inference.

**Cost Estimate:**
- MetaHuman Animator: $0 (free with UE5). iPhone requirement: most team members already have compatible devices; budget $500-1,000 for any team members who need one.
- Post-launch: $0.

**Disclosure Impact:** MetaHuman Animator captures a human performer's facial movements; the tool does not generate faces or expressions. No platform disclosure obligation. No SAG-AFTRA/Equity concern (the performer is an employee or contractor whose performance is captured with consent, identical to traditional facial mocap).

---

### 7.3 Discipline Risk Summary

1. **Team instability.** The animation lead is on PIP with expected exit. Until a new lead is in place, adoption capacity is limited. All PILOT recommendations are contingent on the new lead's support. MetaHuman Animator (ADOPT) is the exception because it is zero-friction and free.

2. **Combat animation quality bar.** CH's pressure/crack combat with hitbox targeting requires precise, high-quality animation. AI-assisted tools must produce results that meet this bar. Any tool whose output requires more cleanup than manual keyframing is a net negative. The PILOT evaluations specifically measure quality against the combat standard.

3. **Remote workflow dependency.** All tool recommendations prioritise remote-friendliness. Solutions that require physical mocap facilities, multi-camera rigs, or co-located sessions are not viable for CH's fully remote structure.

### 7.4 Governance Prerequisites

1. **AI Acceptable Use Policy v1** (Usage Policy & Governance) — Covers use of AI motion capture and animation tools. **Priority: CRITICAL.**
2. **Animation pipeline integration spec** (Production Integration) — Defines how AI-captured motion data enters the Maya/UE5 pipeline, quality gates, and naming conventions. **Priority: MEDIUM, required before PILOT data enters production builds.**

### 7.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| ADOPT | MetaHuman Animator | $0 (+ ~$750 for iPhones) | $0 |
| PILOT | Rokoko Studio AI | $375 (software) + $7,500 (hardware, optional) | $2,000 |
| PILOT | Cascadeur Pro | $198 | $1,584 |
| **Total (software only)** | | **$573** | **$3,584** |
| **Total (with Rokoko hardware)** | | **$8,073** | **$3,584** |

Notes: Animation AI tooling is remarkably inexpensive. The largest cost is optional Rokoko hardware. All figures in USD.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 8. AUDIO

### 8.1 Discipline Overview

CH's audio team is small (~2-3 people) and the middleware choice (Wwise vs FMOD) is still under evaluation. The game's cosy byte-punk aesthetic implies a distinctive soundscape: glitchy-warm SFX, atmospheric music that blends digital and organic textures, and voiced NPC interactions. Every tool recommendation in this section carries an explicit SAG-AFTRA/Equity compliance assessment, reflecting CH's obligations under post-2024 union agreements and UK Equity's parallel positions. Voice cloning and AI voice performance are non-negotiable prohibitions.

### 8.2 Task-Level Analysis

#### 8.2.1 Sound Design — AI-Assisted SFX Search & Generation

AI-powered search through sound libraries and generation of sound effects for prototyping and production. Covers environmental ambience, UI feedback sounds, combat impacts, and world-building audio.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Wwise Similar Sound Search | Middleware Feature | 7 | 8 | 10 | 8 (est.) | 9 | 9 | 8.4 | ADOPT* |
| ElevenLabs Sound Effects | SaaS | 5 | 3 | 7 | 6 (est.) | 5 | 8 | 5.5 | WATCH |

*\*Conditional on CH selecting Wwise as its audio middleware.*

*Composite for Wwise Sound Search: (7 × 0.25) + (8 × 0.20) + (10 × 0.20) + (8 × 0.15) + (9 × 0.10) + (9 × 0.10) = 1.75 + 1.60 + 2.00 + 1.20 + 0.90 + 0.90 = 8.4 ✓*
*ElevenLabs SFX: (5 × 0.25) + (3 × 0.20) + (7 × 0.20) + (6 × 0.15) + (5 × 0.10) + (8 × 0.10) = 1.25 + 0.60 + 1.40 + 0.90 + 0.50 + 0.80 = 5.5 ✓*

**Recommendation: ADOPT** Wwise Similar Sound Search (conditional on Wwise middleware selection). **WATCH** ElevenLabs Sound Effects.

- **Integration timeline:** Zero incremental effort (feature is built into Wwise 2025.1+, powered by Sony AI's audio similarity engine).
- **Rollout owner:** Audio Lead (the senior member of the ~2-3 person audio team).
- **90-day success criteria:** Sound designers using AI search for 50%+ of library browsing; measurable time savings in sound selection during SFX prototyping sessions.
- **Rollback trigger:** Search results are consistently irrelevant, degrading rather than improving sound selection workflow.

**Why Wwise Sound Search:** An AI feature embedded in the industry-standard middleware. It uses Sony AI's audio similarity model to find sounds by acoustic similarity rather than keyword tags, which is transformative for large sound libraries where tagging is inconsistent. IP/Legal of 10: the tool searches the studio's own sound library; no generation, no external data, no training data concerns. Production: Wwise is used in virtually every major game studio; the AI search feature is new (2025.1) but the platform is battle-tested. SAG-AFTRA/Equity: No concern. This is a search tool, not a generative tool, not a performance tool.

**Why not ElevenLabs SFX:** ElevenLabs' text-to-SFX feature generates new sound effects from text descriptions. While not voice cloning (a separate product), the generated audio is synthetic. Production Readiness of 3 reflects no shipped game citation (no independent production citation for ElevenLabs SFX in a shipped game found, June 2026). For a shipped MMO, the risk/benefit of AI-generated SFX is unfavourable when professional sound libraries (Krotos, Boom, SoundSnap) combined with human sound design produce higher-quality, litigation-free results. WATCH; revisit when quality improves and production citations emerge. SAG-AFTRA/Equity: SFX generation does not involve vocal performance; no union concern for non-voice audio.

**Data Egress:** Wwise Sound Search: fully local. ElevenLabs: cloud-based generation; text prompts are sent to ElevenLabs servers. No game data sensitivity concern for SFX text prompts (e.g., "metallic clang with digital distortion").

**Cost Estimate:**
- Wwise Sound Search: $0 incremental (included with Wwise licence). Wwise itself: 4 tiers based on production budget. Indie: free (<$250K budget). Pro: <$2M budget. Premium and Platinum: >$2M budget. Range $0-$40,000+ depending on tier and number of target platforms (per-platform licensing). For CH's MMO with PC + console + mobile targets and a multi-million production budget, expect Premium or Platinum tier.
- Post-launch: $0 incremental (Wwise licence continues for live service audio).

---

#### 8.2.2 Music Composition Assistance

AI-generated music for prototyping, placeholder tracks, and potentially adaptive music systems. The game's byte-punk aesthetic requires a distinctive sonic identity; generic AI-composed music will not meet the creative bar.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| AIVA Pro | SaaS | 6 | 3 | 6 | 5 (est.) | 5 | 8 | 5.4 | WATCH |
| Soundraw Unlimited | SaaS | 5 | 4 | 6 | 5 (est.) | 5 | 7 | 5.2 | WATCH |

*Composite for AIVA: (6 × 0.25) + (3 × 0.20) + (6 × 0.20) + (5 × 0.15) + (5 × 0.10) + (8 × 0.10) = 1.50 + 0.60 + 1.20 + 0.75 + 0.50 + 0.80 = 5.4 ✓*
*Soundraw: (5 × 0.25) + (4 × 0.20) + (6 × 0.20) + (5 × 0.15) + (5 × 0.10) + (7 × 0.10) = 1.25 + 0.80 + 1.20 + 0.75 + 0.50 + 0.70 = 5.2 ✓*

**Recommendation: WATCH** both tools for shipped music. AI-composed music is not ready for a subscription MMO soundtrack.

**Why WATCH:** Three factors drive this recommendation:

1. **Quality gap.** MMO players compare soundtracks to FFXIV (Masayoshi Soken) and GW2 (Maclaine Diemer). AI-composed music, even from the best tools, lacks the emotional depth, thematic development, and stylistic consistency that a human composer provides. For CH's byte-punk aesthetic (a blend of digital glitch and warm organic textures), no AI tool can replicate the creative direction that a dedicated composer brings.

2. **Community detection risk.** The MMO community has become skilled at identifying AI-generated content. AI-composed music in a subscription game would be seen as cost-cutting at the expense of quality, damaging the "cosy" brand that is CH's market differentiator.

3. **Union adjacency.** While SAG-AFTRA primarily covers vocal performances, the American Federation of Musicians (AFM) and the UK Musicians' Union are watching AI composition closely. Using AI-composed music in a commercial game could attract union attention or create precedent concerns for future negotiations.

**AIVA:** Capable of generating orchestral and cinematic compositions. The Pro tier (EUR 49/month) grants full copyright ownership. Production: Pixelfield (2017) is the only cited game use, which is weak and 9 years old (no recent AIVA game production citation found beyond Pixelfield 2017, June 2026). SAG-AFTRA/Equity: No direct concern for instrumental music; AFM/MU concerns are emerging but no contractual prohibition exists.

**Soundraw:** Customisable AI music by genre, mood, and tempo. Useful for placeholder tracks during development. No shipped game citation (no independent production citation found, June 2026). SAG-AFTRA/Equity: Same as AIVA.

**Revisit conditions:** AI music quality reaches the point where a blind test panel cannot distinguish AI compositions from human compositions in the byte-punk genre. A human composer would still provide creative direction; the AI would execute variations. Suggested revisit: Q3 2027.

**Alternative workflow:** Hire a dedicated composer or commission a soundtrack from a specialist game music studio. The composer creates the core themes; adaptive music implementation (stems, layering, transitions) is handled through Wwise/FMOD's existing systems. This is the standard for subscription MMOs and is what the community expects.

---

#### 8.2.3 Voice Performance — AI Voice Generation

AI-generated voice performances for NPC dialogue, barks, and cinematic voice-over.

**Recommendation: AVOID.** This is a non-negotiable prohibition.

- **Specific risk:** SAG-AFTRA's 2025 Interactive Media Agreement (ratified 9 July 2025 by 95% vote, concluding the 2024 video game strike) explicitly prohibits AI-generated voice performances that replace union actors without informed consent, and prohibits the use of performer voice data to train AI models without explicit, compensated agreement. The agreement was made with Activision, EA, Disney, Take-Two, WB Games, and others. UK Equity has parallel positions covering performers in the UK. CH employs staff in the UK; any voice acting engagement is subject to Equity terms. Violation would expose CH to: contractual breach claims, performer consent violations, legal liability, reputational damage, and potential impact on Series B due diligence.
- **Probability:** Certain (5/5) that contractual terms will be enforced. The ratified agreement includes mandatory consent and disclosure requirements for AI digital replica use; performers can suspend AI consent during any future strike action.
- **Impact:** Severe (5/5). A contractual violation or performer consent breach could halt voice production, trigger legal action from union signatories, and generate negative press that damages investor confidence during the Series B raise.
- **Counterfactual cost:** CH loses the ability to generate NPC dialogue voice at scale without human actors. This is not a meaningful loss; high-quality voice acting is a differentiator for MMOs, and the community expects human performances. AI-generated voices would be a quality regression, not an improvement.
- **Alternative workflow:** Engage voice actors (union or non-union, depending on CH's production agreements) for all voiced content. Use Wwise/FMOD's voice management features for NPC bark variation and dialogue line delivery. For volume (an MMO has thousands of dialogue lines), engage a localisation-aware voice studio that can manage casting, recording, and delivery at scale.

**SAG-AFTRA/Equity specific guidance (updated for ratified 2025 agreement):**
- Voice cloning of any performer (living or deceased) is prohibited without explicit, compensated consent under the ratified agreement. Performers retain the right to suspend AI consent during any future industrial action.
- AI-generated "synthetic" voices that do not clone a specific performer are subject to mandatory negotiation under the agreement. SAG-AFTRA's position is that synthetic voice performances replace union work. CH should not use synthetic voice generation for any shipped or externally released content.
- **Narrow exception (requires GC approval):** Internal-only scratch VO prototypes for game design iteration may be permissible if: (a) Dino (General Counsel) approves the specific use case in writing; (b) strict retention/deletion policies are enforced (all scratch VO deleted before any external build); (c) no synthetic voice content is released externally, shared with partners, or used in any marketing material; (d) performer data is never used as training input.
- UK Equity's position mirrors SAG-AFTRA's. CH's UK entity is subject to Equity terms for any UK-based voice performers.
- Inworld AI and Convai (evaluated in Section 11, Narrative) offer NPC dialogue engines with optional voice output. If CH uses these tools for dialogue logic, the voice output component must be disabled or replaced with human voice recordings. The dialogue logic (personality, memory, goal-directed conversation) is not a union concern; only the voice performance is.

**Disclosure Impact:** Not applicable (AVOID). If CH engages human voice actors, standard performance contracts apply; no AI disclosure needed.

---

#### 8.2.4 Audio Post-Processing & Mastering

AI-assisted audio mastering, EQ optimisation, noise reduction, and loudness normalisation for game audio assets. This is a workflow efficiency tool, not a creative generation tool.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| iZotope Ozone AI | Desktop | 7 | 9 | 10 | 8 (est.) | 7 | 6 | 8.1 | ADOPT |
| LANDR | SaaS | 4 | 6 | 9 | 5 (est.) | 4 | 9 | 6.1 | WATCH |

*Composite for iZotope Ozone: (7 × 0.25) + (9 × 0.20) + (10 × 0.20) + (8 × 0.15) + (7 × 0.10) + (6 × 0.10) = 1.75 + 1.80 + 2.00 + 1.20 + 0.70 + 0.60 = 8.1 ✓*
*LANDR: (4 × 0.25) + (6 × 0.20) + (9 × 0.20) + (5 × 0.15) + (4 × 0.10) + (9 × 0.10) = 1.00 + 1.20 + 1.80 + 0.75 + 0.40 + 0.90 = 6.1 ✓*

**Recommendation: ADOPT** iZotope Ozone AI for audio mastering and post-processing.

- **Integration timeline:** 1 day (install plugin in Pro Tools / Reaper; no infrastructure changes).
- **Rollout owner:** Audio Lead.
- **90-day success criteria:** All game audio assets pass through Ozone's AI-assisted mastering pipeline; loudness consistency across SFX categories improves (measured by LUFS variance).
- **Rollback trigger:** AI mastering suggestions consistently conflict with the Audio Lead's creative intent; tool introduces latency into the mastering workflow.

**Why iZotope Ozone:** Industry-standard mastering suite with AI features (Master Assistant, AI-powered EQ matching, intelligent loudness targeting). iZotope has been a staple of professional audio for 20+ years. The AI features assist with technical mastering decisions while keeping creative control with the audio engineer. IP/Legal of 10: the tool processes the studio's own audio files locally; no cloud, no generation, no training data concerns. Production: iZotope is used across film, broadcast, and game audio. SAG-AFTRA/Equity: No concern. Audio post-processing does not involve vocal performance.

**Why not LANDR:** Consumer-oriented AI mastering service. Capability of 4 reflects that LANDR's automated mastering lacks the fine control professional game audio requires (per-asset mastering profiles, platform-specific loudness targets, integration with middleware delivery). WATCH; not suitable for professional game audio at CH's quality bar.

**Data Egress:** iZotope Ozone: fully local. All processing occurs on the audio engineer's workstation. No cloud dependency. LANDR: cloud-based; audio files are uploaded to LANDR servers for processing. Not recommended.

**Cost Estimate:**
- iZotope Ozone: Subscription: Standard $9.99/month, Advanced $19.99/month. Perpetual licences still available (price varies). Pre-launch: ~$240-480 (subscription over 28 months at Standard tier). Post-launch: ~$120-240/year.

---

### 8.3 Discipline Risk Summary

1. **SAG-AFTRA / Equity compliance is non-negotiable.** Voice AI is AVOID. This position must be documented in CH's AI governance policy and communicated to all teams to prevent well-intentioned experimentation that could trigger union action.

2. **Middleware choice gates AI audio features.** Wwise Similar Sound Search is ADOPT only if CH selects Wwise. The audio middleware decision should be made on its own merits (Wwise vs FMOD), not driven by the AI strategy; however, the AI capability is a tiebreaker if the tools are otherwise equivalent.

3. **AI music is not ready for a subscription MMO.** The quality gap and community perception risk make AI-composed shipped music untenable. CH should invest in a human composer and treat AI music as a prototyping tool at best.

### 8.4 Governance Prerequisites

1. **AI Voice Prohibition Policy** (Usage Policy & Governance) — Explicit prohibition on AI voice generation, voice cloning, and synthetic voice performance. Must reference SAG-AFTRA and Equity terms. **Priority: CRITICAL, immediate.**
2. **Audio AI usage guidelines** (Production Integration) — Defines approved uses of AI in audio (search, mastering) and prohibited uses (voice, shipped music). **Priority: HIGH.**
3. **Performer consent and AI clause in voice acting contracts** (IP Safeguards) — All voice acting contracts must include AI-specific clauses per SAG-AFTRA/Equity requirements. **Priority: HIGH, required before any voice casting begins.**

### 8.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| ADOPT | Wwise Sound Search (conditional) | $0 incremental | $0 |
| ADOPT | iZotope Ozone AI | $280 | $120 |
| WATCH | AIVA, Soundraw, ElevenLabs | $0 | $0 |
| AVOID | AI Voice | $0 | $0 |
| **Total** | | **$280** | **$120** |

Notes: Audio AI tooling is the least expensive discipline. The significant audio costs (middleware licence, composer fees, voice actor contracts) are traditional production costs, not AI tooling.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 9. GAME DESIGN

### 9.1 Discipline Overview

CH's design team (~6-8 people) is led by Simon Woodruff (Head of Design, started 15 June 2026) and Robin Jubber (Game Director, individual contributor). Simon brings 30+ years of experience (Sea of Thieves, Epic R&D, Simon the Sorcerer) but is brand new to the studio; his views on AI in design workflows are unknown and should not be assumed. The game features complex interlocking systems: a subscription economy with cosmetics marketplace, 5-faction PvPvE dynamics, a pressure/crack combat system, player housing, crafting professions, and a corruption world mechanic. These systems demand rigorous simulation and balancing tools.

### 9.2 Task-Level Analysis

#### 9.2.1 Economy Balancing & Simulation

Simulation and visualisation of the game's economic systems: currency flows, sink/faucet balance, subscription revenue modelling, cosmetics marketplace dynamics, crafting material economy, and cross-faction trade. For a subscription MMO, economy health directly impacts retention and revenue.

**Classification: Non-AI Infrastructure (ADOPT*).** Machinations is a visual simulation engine for game economies, not a machine learning or generative AI tool. It is not scored on the AI composite framework because its core value is deterministic simulation, not AI capability. It is included in this report because it is the industry-standard tool for the economy balancing task and no ML-native alternative exists at comparable maturity. Machinations now markets "Build systems using AI" but the AI features are assistive layer, not core value proposition.

**Recommendation: ADOPT*** Machinations for economy design and balance simulation (non-AI infrastructure).

- **Integration timeline:** 1-2 weeks for initial economy model setup. Machinations is a web-based tool; no infrastructure changes. The investment is in model design (translating CH's economy design into Machinations diagrams), not software integration.
- **Rollout owner:** Simon Woodruff (Head of Design) or Robin Jubber (Game Director), depending on who owns economy design. If Simon has not yet formed a view on tooling, Robin should initiate.
- **90-day success criteria:** Core economy model built (currencies, subscription stipend, cosmetics marketplace, crafting materials, faction-linked resources); at least 3 "what-if" simulations run to test balance scenarios (e.g., "what happens if we increase the monthly stipend by 20%?"); design team using Machinations as the shared language for economy discussions.
- **Rollback trigger:** Simon Woodruff rejects the tool after evaluation (his authority over design tools should be respected); the economy model complexity exceeds Machinations' simulation capacity (unlikely for the paid tiers).

**Why Machinations:** The industry standard for game economy simulation. Ubisoft, Gameloft, Wargaming, and King are documented users; King reported 34% production time reduction in economy design. For CH's subscription MMO with multiple interlocking economies (subscription currency, marketplace, crafting, faction resources), a simulation tool is not optional; manual spreadsheet modelling cannot capture the emergent dynamics of a live economy with 200-600 players per zone. Integration score of 4 reflects that Machinations is a standalone web tool with no UE5 plugin or API-based game integration; it is a design tool, not a runtime system.

**Data Egress:** Machinations processes abstract economy models (node graphs representing resource flows). No game code, no player data, no partner IP. GDPR: no employee data involved. Fully safe for cloud processing.

**Cost Estimate:**
- Pre-launch: Machinations paid tiers from ~$15-50/month per seat [VENDOR CONTACT REQUIRED: current Machinations pricing]. 3 design seats × $30/month × 28 months = ~$2,520.
- Post-launch: $1,080/year (3 seats; economy balancing is critical during live service).
- Permanent infrastructure: Yes; economy monitoring and rebalancing continue indefinitely.

---

#### 9.2.2 Game Research & Market Analysis

AI-powered competitive analysis, market trend tracking, feature benchmarking, and game design document (GDD) assistance. Relevant for validating CH's design decisions against market data and understanding the competitive set (FFXIV, GW2, ESO, Palia, Throne & Liberty, Ashes of Creation).

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Ludo.ai | SaaS | 4 | 7 | 8 | 7 (est.) | 7 | 7 | 6.5 | WATCH |
| GameRefinery (Verto) | SaaS | 7 | 8 | 9 | 5 (est.) | 6 | 3 | 6.8 | WATCH |

*Composite for Ludo.ai: (4 × 0.25) + (7 × 0.20) + (8 × 0.20) + (7 × 0.15) + (7 × 0.10) + (7 × 0.10) = 1.00 + 1.40 + 1.60 + 1.05 + 0.70 + 0.70 = 6.5 ✓*
*GameRefinery: (7 × 0.25) + (8 × 0.20) + (9 × 0.20) + (5 × 0.15) + (6 × 0.10) + (3 × 0.10) = 1.75 + 1.60 + 1.80 + 0.75 + 0.60 + 0.30 = 6.8 ✓*

**Recommendation: WATCH.** Ludo.ai is primarily an AI sprite and asset generation tool (homepage: "The #1 AI sprite generator"), not a competitive intelligence platform. Its showcased users (Voodoo, SayGames, Homa) are mobile/hyper-casual studios. Its market research features are shallow trend-tracking for concept validation, not the deep competitive analysis a PC MMO studio needs against FFXIV/GW2/ESO. Reclassified from PILOT following web verification (June 2026). For genuine MMO competitive intelligence, consider Newzoo, data.ai, SteamDB, or bespoke analyst services.

- **Revisit conditions:** Ludo.ai adds dedicated PC MMO/live-service competitive intelligence features (not just sprite generation and mobile trend data); or CH identifies a specific gap in competitive research that Ludo.ai's tooling could fill. Re-evaluate at the 6-month gate if the product has materially evolved.
- **Alternatives for competitive research:** Newzoo (market sizing), data.ai (download/revenue analytics), SteamDB (PC market trends), bespoke analyst services, or internal research using publicly available competitive data.

**Why Ludo.ai:** AI-powered game market research with feature tracking, trend analysis, and GDD generation. Production: Rovio, Ubisoft, Voodoo, SayGames, Homa, and Garena are documented users. For CH, the primary value is competitive benchmarking: understanding how FFXIV, GW2, and ESO approach the features CH is building (subscription economy, cosmetics marketplace, player housing, faction systems). IP/Legal of 8: Ludo.ai analyses publicly available game data; no proprietary CH data is processed unless deliberately shared.

**Why not GameRefinery:** Powerful competitive intelligence platform with deep feature taxonomy and market benchmarking. However, Cost of 3 reflects enterprise pricing (~$500-2,000/month [VENDOR CONTACT REQUIRED: GameRefinery pricing]) that is disproportionate for CH's needs at this stage. Ludo.ai provides 80% of the research value at 20% of the cost. WATCH; GameRefinery becomes relevant when CH needs investor-grade market analysis for the Series B raise.

**Data Egress:** Both tools are cloud-based. Ludo.ai: research queries and GDD drafts may include CH's game concept descriptions. Guardrail: do not share unreleased game mechanics, partner IP integrations, or proprietary economic models in research queries. Use generic feature descriptions for benchmarking.

**Cost Estimate:**
- Ludo.ai PILOT: ~$20/month (Indie) × 3 seats × 3 months = $180. Studio tier: ~$300/month [VENDOR CONTACT REQUIRED: Ludo.ai Studio tier pricing]. If promoted at Studio tier: $300/month × 24 months = $7,200.
- Post-launch: ~$3,600/year (retained for live service competitive monitoring).

---

#### 9.2.3 Level Design & World Building

AI-assisted environment layout, level dressing, and procedural world generation for the MMO's zones.

**Cross-reference:** See Section 6.2.4 (Art Pipeline, Environment Layout & Procedural Generation) for full evaluation of Houdini ML Features (ADOPT) and Promethean AI (PILOT). CH-specific notes for Game Design: the design team should define zone layouts and encounter spaces; the AI layout tools are then used by environment artists to execute those designs. Simon Woodruff's involvement is at the design specification level, not the tool operation level. The game's 5-faction structure, corruption mechanic, and PvP zone cloning architecture create specific level design requirements that AI tools must accommodate.

---

### 9.3 Discipline Risk Summary

1. **Simon Woodruff's views are unknown.** As the newly appointed Head of Design with 30+ years of experience, Simon may have strong opinions about AI in design workflows, either positive or negative. All PILOT recommendations in this section are contingent on his buy-in. If Simon rejects AI tools for design, respect his professional judgement; the tools can be revisited when he has had time to evaluate them.

2. **Economy simulation is not optional.** CH's subscription model with interlocking economies (subscription stipend, cosmetics marketplace, crafting, faction resources, corruption mechanic) requires simulation that spreadsheets cannot provide. If Machinations is rejected, an alternative simulation approach must be identified; "we'll balance it by feel" is not viable for a live-service economy.

### 9.4 Governance Prerequisites

1. **AI Acceptable Use Policy v1** (Usage Policy & Governance) — Covers use of AI in game design workflows. **Priority: CRITICAL.**
2. **Competitive intelligence data handling** (IP Safeguards) — Guidelines for what game concept information can be shared with cloud AI research tools. **Priority: MEDIUM.**

### 9.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| ADOPT* | Machinations | $2,520 | $1,080 |
| WATCH | Ludo.ai | $0 (reclassified from PILOT; not suitable for MMO competitive intelligence) | $0 |
| **Total** | | **$2,520** | **$1,080** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 10. QA & TESTING

### 10.1 Discipline Overview

CH's QA function is a single person: Hannah, the QA Lead. A vendor testing pipeline is being planned but is not yet in place. This is the most critical organisational constraint in the entire report. A pre-launch MMO with 5 server profiles, hitbox combat, 200-600 players per zone, player housing, crafting, 5 factions, and cross-play targeting PC/console/mobile cannot be shipped with one QA resource. AI testing tools have the highest leverage of any discipline for CH, precisely because they multiply Hannah's capacity rather than adding to her workload. However, per the owner-capacity rule, Hannah is overloaded; the maximum verdict for tools requiring her management overhead is PILOT, contingent on the QA vendor hire.

### 10.2 Task-Level Analysis

#### 10.2.1 AI-Driven Playtesting, Regression & Exploit Detection

AI bots that play the game autonomously: exploring zones, engaging combat, testing progression, finding exploits, detecting crashes, and running regression tests across builds. This is the single most impactful AI tool recommendation for CH.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| modl.ai | SaaS | 5 | 4 | 9 | 3 (est.) | 3 | 5 | 4.9 | WATCH |

*Composite for modl.ai: (5 × 0.25) + (4 × 0.20) + (9 × 0.20) + (3 × 0.15) + (3 × 0.10) + (5 × 0.10) = 1.25 + 0.80 + 1.80 + 0.45 + 0.30 + 0.50 = 5.1. Rounded: 5.1. However, this tool FAILS the hard-blocker gate for operational dependency (requires no-integration black-box approach incompatible with CH's real-time combat architecture) and the gate for time-to-value (cannot deliver meaningful MMO-scale testing within 6 months given current product limitations). Maximum verdict: WATCH.*

**Recommendation: WATCH.** modl.ai's current product is fundamentally incompatible with CH's MMO testing requirements.

**Critical product reality (verified June 2026):** modl.ai has pivoted from its earlier SDK-based approach to a "no-integration" black-box visual testing product. Their own product page states: "No integration — no SDKs, no code hooks, and no waiting on engineers" and "Our AI agents test your game externally — analyzing what's on screen and sending simulated inputs just like a player would." The tool operates by uploading builds to modl.ai's cloud infrastructure, where screen-analysing AI agents execute plain-language task instructions (e.g., "Complete the tutorial", "Reach level 5").

**Why this is incompatible with CH's MMO:**

1. **No concurrent player simulation.** modl.ai tests a single build instance externally. It cannot simulate 200-600 concurrent players across CH's distributed server architecture (5 server profiles: overworld, hub, instance, user space, metagame). MMO-scale load testing requires server-side bot injection, not single-client screen analysis.

2. **Fast-paced gameplay not supported.** modl.ai's FAQ states their AI "currently excels at testing mobile games and titles with structured interactions or clear UI elements such as match, narrative, card or turn-based games. Very fast-paced or timing-critical gameplay isn't fully supported yet." CH's pressure/crack combat system (hitbox targeting, crack stacking 1-7, detonation mechanics) is precisely the "fast-paced, timing-critical" category they exclude.

3. **No engine-level exploit detection.** Black-box testing cannot detect server-side exploits (economy duplication, packet manipulation, speed hacks via network abuse) because it has no access to game state, server logs, or internal variables.

4. **Platform limitations.** Supported platforms: Android and desktop only (verified June 2026). No confirmed console support for CH's cross-play targets.

**Production citations corrected:** Rare built internal automated testing bots for Sea of Thieves (GDC presentation by Robert Masella); this was custom-built infrastructure, NOT modl.ai's commercial product. modl.ai cites this approach as inspiration. modl.ai's confirmed partnership is with Riot Games (May 2025, arXiv paper on VALORANT-like tactical shooter bots). Die Gute Fabrik used modl.ai for Saltsea Chronicles (60-level narrative adventure, development-funded by Private Division/Take-Two) — a scale and complexity orders of magnitude below CH's MMO. modl.ai has ~15 employees (LinkedIn, June 2026).

**Revisit conditions:** modl.ai releases an engine-integrated SDK (UE5 plugin) that supports concurrent bot simulation within a game server, demonstrates real-time combat testing capability, and adds console platform support. Alternatively, if modl.ai's visual testing approach proves useful for UI/menu flows and quest-logic regression despite not covering combat, a limited PILOT for non-combat testing could be evaluated. Suggested revisit: Q1 2027.

**Alternative recommendation — Custom Bot Infrastructure (CRITICAL):**

CH's QA risk remains the most dangerous constraint in the production plan. The solution is NOT a vendor purchase; it is an engineering investment. The alternative is custom bot infrastructure:

1. **UE5 AI Controller bots:** Engineering builds dedicated bot pawns that connect as clients to CH's game servers, executing scripted and semi-random test sequences within the actual game simulation. This is what Rare, Riot, and Blizzard do.
2. **Scale:** Custom bots run server-side; hundreds can operate simultaneously across all 5 server profiles.
3. **Prerequisite:** Requires DevOps Lead hire and dedicated QA automation engineering capacity. This reinforces the CTO/DevOps hiring recommendation.
4. **Timeline:** Phase 2 (requires DevOps + engineering capacity). Prototype in 1-2 sprints; production-quality regression suite in 3-6 months.
5. **Cost:** Engineering time (internal), not vendor subscription. Estimated: 1 engineer × 6 months = ~£30,000-50,000 in salary cost, yielding a permanent capability asset with no ongoing licence fees.

**Data Egress:** Not applicable under WATCH. If custom bot infrastructure is built, all testing is internal (no data leaves CH's servers).

**Cost Estimate:** $0 (WATCH). Custom bot infrastructure cost is engineering salary, not tooling budget.

---

#### 10.2.2 Bug Triage & Test Intelligence

AI-assisted categorisation, deduplication, and prioritisation of bug reports. Relevant as bug volume scales with the game's feature complexity.

**Cross-reference:** See Section 12 (Production & Project Management) for full evaluation of Atlassian Intelligence / Rovo, which provides AI-powered bug triage within JIRA. CH is already adopting JIRA; the AI features are included at the Premium tier. CH-specific note for QA: Hannah should use Atlassian Intelligence for automated bug deduplication and priority suggestion; it reduces triage overhead without requiring a separate tool. Engineering cross-reference: Sentry (Section 4.2.4) feeds crash data into bug reports; the combination of Sentry + JIRA AI creates an automated crash-to-bug pipeline.

---

#### 10.2.3 Accessibility Compliance Testing

Automated testing for accessibility standards: WCAG 2.1 AA compliance, colour contrast analysis (critical for the byte-punk palette's digital/glitch aesthetic), platform-specific accessibility certification (Xbox Accessibility Guidelines, PlayStation accessibility requirements), and assistive technology compatibility.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| axe DevTools (Deque) | Desktop/Cloud | 4 | 9 | 10 | 3 (est.) | 3 | 9 | 6.5 | WATCH |

*Composite for axe DevTools: (4 × 0.25) + (9 × 0.20) + (10 × 0.20) + (3 × 0.15) + (3 × 0.10) + (9 × 0.10) = 1.00 + 1.80 + 2.00 + 0.45 + 0.30 + 0.90 = 6.5 ✓*

**Recommendation: WATCH.** No AI tool exists that is purpose-built for game accessibility testing. The accessibility testing task is currently a human workflow with limited AI augmentation.

**Why WATCH:** axe DevTools is the industry standard for web accessibility testing (WCAG compliance). However, it is designed for web content, not game UIs rendered via UE5's Slate/UMG widget system. Capability of 4 reflects this fundamental mismatch: axe cannot inspect UE5 game UI elements. Integration of 3 reflects the absence of any UE5 plugin or game engine integration path. Team Adoption of 3 reflects that Hannah, as the sole QA resource, does not have bandwidth to manage an accessibility testing programme alongside functional testing.

**Alternative workflow:** CH should engage a specialist accessibility consultancy (e.g., SpecialEffect, AbleGamers, Can I Play That) to audit the game at key milestones (Alpha, Beta, Pre-Launch). The byte-punk palette specifically needs colour contrast analysis to ensure that the glitch aesthetic does not compromise readability for colour-blind players; this is a designer/artist task (David Luong, Sasha Krieger) with accessibility guidelines, not an AI tool problem. Platform-specific certification (Xbox, PlayStation) has its own requirements; console first-party teams provide accessibility review as part of certification.

**Revisit conditions:** A game-specific AI accessibility testing tool with UE5 integration. Suggested revisit: Q3 2027, or when a game-focused accessibility testing product reaches the market.

**Cost Estimate:** $0 (WATCH). Budget for accessibility consultancy engagement separately (~$5,000-15,000 per audit [VENDOR CONTACT REQUIRED: accessibility consultancy rates]).

---

### 10.3 Discipline Risk Summary

1. **Hannah is a single point of failure.** The biggest risk in QA is not tool-related; it is organisational. A single QA resource cannot test a subscription MMO at the scale CH requires. Custom bot infrastructure helps but does not replace the need for additional QA capacity (vendor pipeline, additional hires, or both). The QA vendor pipeline should be accelerated independent of the AI strategy.

2. **Custom bot infrastructure requires dedicated engineering.** Hannah cannot build bot infrastructure herself. A DevOps Lead or QA automation engineer must be hired to own this capability. Given engineers are already overloaded with IT/infra work, the bot infrastructure build must be explicitly resourced as a distinct engineering deliverable, not absorbed into existing workload.

3. **Accessibility is a certification risk, not an AI problem.** If CH fails platform accessibility certification, it cannot ship on console. This risk is independent of AI tooling and should be managed through specialist consultancy engagement.

### 10.4 Governance Prerequisites

1. **AI Acceptable Use Policy v1** (Usage Policy & Governance) — Covers AI testing tool usage. **Priority: CRITICAL.**
2. **Bot infrastructure requirements specification** (Production Integration) — Defines test coverage targets per server profile, bot behaviour scripting standards, and integration with CI/CD pipeline for automated regression. Required before engineering begins bot development. **Priority: HIGH, Phase 2.**
3. **QA automation training** (Training & Education) — Hannah and any QA vendors need training on bot-generated bug triage, test scenario definition for automated agents, and interpreting AI-driven test results. **Priority: MEDIUM.**

### 10.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| Engineering | Custom QA bot infrastructure | ~£30,000-50,000 (salary cost, not tooling) | £0 (permanent asset) |
| WATCH | axe DevTools | $0 | $0 |
| **Total** | | **$6,000-375,000** | **$60,000-180,000** |

Notes: Custom bot infrastructure is an engineering investment (salary cost), not a recurring tooling subscription. It produces a permanent capability asset. Compare against 5-10 additional QA testers at $40,000-60,000/year each ($200,000-600,000/year in headcount). The bot infrastructure is dramatically more cost-effective once built. modl.ai is WATCH (product incompatible with MMO architecture); revisit Q1 2027.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 11. NARRATIVE & LOCALISATION

### 11.1 Discipline Overview

CH's narrative function is small (~2-3 people) with a Narrative Designer and overlap with quest design. A Head of Narrative hire is needed but not yet in post, creating a leadership gap for narrative AI adoption decisions. The game's world (5 factions, corruption mechanic, partner IP integrations, player housing lore) requires extensive dialogue, quest text, lore entries, and NPC barks. Localisation is a Year 2+ concern; content must stabilise before translation begins. The primary sensitivity in this discipline is community perception: MMO players scrutinise narrative quality intensely, and AI-generated dialogue that feels generic would undermine CH's cosy, personality-driven brand.

### 11.2 Task-Level Analysis

#### 11.2.1 Dynamic NPC Dialogue Systems

AI-driven NPC dialogue engines that generate contextual, personality-driven responses in real-time during gameplay. This would power ambient NPC interactions, shopkeeper dialogue, faction-specific chatter, and potentially quest delivery.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Inworld AI | SaaS | 8 | 6 | 6 | 4 (est.) | 7 | 5 | 6.2 | WATCH |
| Charisma.ai | SaaS | 7 | 5 | 7 | 5 (est.) | 5 | 6 | 6.0 | WATCH |
| Convai | SaaS | 6 | 3 | 6 | 4 (est.) | 7 | 7 | 5.3 | WATCH |

*Composite for Inworld AI: (8 × 0.25) + (6 × 0.20) + (6 × 0.20) + (4 × 0.15) + (7 × 0.10) + (5 × 0.10) = 2.00 + 1.20 + 1.20 + 0.60 + 0.70 + 0.50 = 6.2 ✓*
*Charisma.ai: (7 × 0.25) + (5 × 0.20) + (7 × 0.20) + (5 × 0.15) + (5 × 0.10) + (6 × 0.10) = 1.75 + 1.00 + 1.40 + 0.75 + 0.50 + 0.60 = 6.0 ✓*
*Convai: (6 × 0.25) + (3 × 0.20) + (6 × 0.20) + (4 × 0.15) + (7 × 0.10) + (7 × 0.10) = 1.50 + 0.60 + 1.20 + 0.60 + 0.70 + 0.70 = 5.3 ✓*

**Recommendation: WATCH** all three tools. Dynamic AI NPC dialogue is not ready for a subscription MMO's shipped content.

**Why WATCH for all:**

1. **No Head of Narrative.** The owner-capacity rule blocks PILOT: there is no narrative lead to own the evaluation, define quality standards, or manage integration with the quest/dialogue pipeline. Maximum verdict is PILOT contingent on the hire; given additional risks below, WATCH is appropriate.

2. **Community backlash risk.** Subscription MMO players compare dialogue quality to FFXIV and GW2, where every line is hand-authored by professional writers. AI-generated NPC dialogue that feels generic, repetitive, or tonally inconsistent would damage CH's brand. The cosy byte-punk world relies on personality and warmth in every interaction; this is extraordinarily difficult for current AI dialogue systems to achieve consistently.

3. **Steam Live-Generated disclosure.** Any real-time AI-generated dialogue requires Steam's "Live-Generated" AI content disclosure. This is more scrutinised by the community than "Pre-Generated" disclosure and signals that player-facing content is created by AI during gameplay. For an MMO already facing community perception risk, this adds fuel.

4. **SAG-AFTRA/Equity intersection.** Inworld AI and Convai both offer voice output as part of their NPC dialogue systems. If CH uses the dialogue logic without voice, there is no union concern for the text-only component. However, enabling voice output would require SAG-AFTRA/Equity compliance analysis. The safest approach: use these tools for dialogue logic prototyping only, with human voice acting for all shipped voice content.

**Inworld AI** is the category leader (Capability 8, $500M valuation, NetEase and Niantic production citations). Its personality system, memory, and goal-directed dialogue are the most mature. However, Inworld cut pricing by 50%+ in June 2026 (verified: on-demand $0.15/hr scaling to $0.10; TTS Growth plan $12.50/1M characters, enterprise commitments as low as $5/1M characters at scale). The price reduction is framed as making consumer AI economically viable, not instability. The cost at MMO scale (millions of character-tokens per month across thousands of NPCs) is difficult to predict.

**Convai** scores lowest (5.3) due to Production Readiness of 3 (no shipped game citation found, June 2026) and documented quality issues (8-10 second latency, broken long-term memory as of March 2026). These are disqualifying for real-time MMO dialogue.

**Charisma.ai** offers a more structured approach (branching dialogue trees with AI augmentation rather than fully generative), which provides better quality control. However, it has a confirmed UE5 plugin on the Unreal Marketplace (verified: SDK, Plug-N-Play, and Colyseus multiplayer options available).

**Revisit conditions:** Head of Narrative hire is complete; at least one MMO or comparable live-service game ships with real-time AI NPC dialogue without community backlash; Inworld AI demonstrates consistent quality for cosy/personality-driven dialogue styles. Suggested revisit: Q2 2027.

**Alternative workflow:** Professional writers author all quest dialogue, NPC barks, and lore text. Wwise/FMOD handles bark variation and randomisation. This is the industry standard for subscription MMOs and is what the community expects. The "cost" of not adopting AI dialogue is additional writer capacity; for CH's scale (2-3 narrative staff growing to 4-6), this is manageable.

---

#### 11.2.2 Content Authoring Assistance

AI-assisted drafting of quest text, lore entries, item descriptions, and NPC dialogue variations. The AI drafts; human writers review, revise, and approve. The AI output is never shipped without human editorial pass.

**Cross-reference:** This is a legitimate general-purpose LLM use case. See Section 4.2.1 (Engineering, GitHub Copilot) for the evaluation framework. For narrative-specific use: Claude or ChatGPT with CH's style guide and lore bible as context produces first-draft dialogue variations that writers can edit. This does not require a specialist tool; the AI acts as a writing assistant, not a dialogue engine.

**CH-specific guidance:** Any LLM used for content drafting must not process partner IP lore or character descriptions. Create a lore bible excerpt (public-safe) for AI context; keep partner IP integration content in a separate, AI-excluded document. All AI-drafted content must be tagged with metadata indicating AI assistance, supporting Steam disclosure compliance. The Head of Narrative (once hired) should establish editorial standards for AI-assisted vs human-authored content.

---

#### 11.2.3 Localisation Pipeline

AI-augmented translation management: translation memory (TM), machine translation with human review, quality assurance, and game-specific terminology management. Localisation begins when content reaches stability (estimated Year 2 of development, late 2027).

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| memoQ Gaming Bundle | SaaS | 7 | 8 | 10 | 6 (est.) | 6 | 7 | 7.6 | PILOT (Phase 3) |
| Phrase TMS | SaaS | 7 | 8 | 9 | 5 (est.) | 6 | 5 | 7.0 | Alternative |

*Composite for memoQ: (7 × 0.25) + (8 × 0.20) + (10 × 0.20) + (6 × 0.15) + (6 × 0.10) + (7 × 0.10) = 1.75 + 1.60 + 2.00 + 0.90 + 0.60 + 0.70 = 7.6 ✓*
*Phrase TMS: (7 × 0.25) + (8 × 0.20) + (9 × 0.20) + (5 × 0.15) + (6 × 0.10) + (5 × 0.10) = 1.75 + 1.60 + 1.80 + 0.75 + 0.60 + 0.50 = 7.0 ✓*

**Recommendation: PILOT** memoQ Gaming Bundle in Phase 3 (9-18 months), timed to content stabilisation.

- **Pilot scope:** Localise one language (most likely French or German based on MMO market size) for a content slice (one zone's quest text + UI strings). Evaluate: translation quality with AI pre-translation + human review, terminology consistency across game-specific terms (faction names, ability names, byte-punk jargon), integration with CH's content pipeline (text export from UE5, round-trip back to engine).
- **Integration timeline:** 2-3 weeks for pipeline setup (text extraction, TM seeding, terminology database).
- **Rollout owner:** Valeria Trofimova (Head of Production) until a Localisation Manager is hired.
- **90-day success criteria:** AI pre-translation reduces human translator workload by 30%+ for standard game text; game-specific terminology handled consistently; round-trip from UE5 text to translated text back to UE5 works without data loss.
- **Rollback trigger:** AI pre-translation quality so low that human translators spend more time correcting than translating from scratch; terminology inconsistencies in faction/ability names that damage world coherence.

**Why memoQ:** The Gaming Bundle includes Gridly integration (structured data management for game strings) and Voiseed (audio localisation, though this is secondary for CH). Production: Gameloft (30% productivity boost documented), Epic Games. IP/Legal of 10: memoQ is a translation management tool that processes CH's own text; no generative AI training data concerns; standard enterprise data handling.

**Why not Phrase TMS as primary:** Comparable capability and production readiness. The Cost difference (Phrase starts at ~$525/month vs memoQ's per-translator pricing) makes Phrase less cost-efficient at CH's scale. Both tools are legitimate choices; memoQ's gaming-specific bundle is the tiebreaker. If CH already has a Phrase relationship, Phrase is equally viable.

**Data Egress:** Both tools process game text (dialogue, UI strings, item descriptions) through cloud-based translation workflows. Partner IP content (quest text referencing partner games) will be included in translation. This requires a DPA with the chosen vendor covering game content confidentiality and GDPR compliance for any player-facing text that references in-game player data post-launch.

**Cost Estimate:**
- Pre-launch (Phase 3 PILOT, ~9 months): ~$3,000-5,000 for pilot localisation of one language [VENDOR CONTACT REQUIRED: memoQ Gaming Bundle pricing for a small-scale pilot].
- Full localisation rollout (5+ languages): ~$20,000-50,000/year (heavily dependent on volume and number of target languages).
- Post-launch: ongoing; live service content requires continuous localisation.

---

### 11.3 Discipline Risk Summary

1. **No Head of Narrative.** AI narrative adoption is blocked until this hire is complete. The new Head of Narrative should own the decision on whether/how AI assists the writing process.
2. **Community perception of AI dialogue.** This is the second-highest community backlash risk after AI art. CH should establish a clear public position: all shipped narrative content is human-authored.
3. **Localisation timing.** Starting localisation too early wastes budget on content that will change. Too late delays the launch in non-English markets. Target: begin localisation pipeline setup 12-15 months before launch.

### 11.4 Governance Prerequisites

1. **AI content attribution policy** (Production Integration) — All AI-assisted narrative content must carry metadata tags. **Priority: HIGH.**
2. **Partner IP content handling for AI tools** (IP Safeguards) — Partner game lore referenced in quests must be excluded from AI tool inputs. **Priority: CRITICAL.**
3. **Localisation vendor data handling agreement** (IP Safeguards) — DPA covering game content confidentiality. **Priority: MEDIUM (Phase 3).**

### 11.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| WATCH | Inworld AI, Charisma.ai, Convai | $0 | $0 |
| PILOT | memoQ Gaming Bundle (Phase 3) | $3,000-5,000 | $20,000-50,000 |
| **Total** | | **$3,000-5,000** | **$20,000-50,000** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 12. PRODUCTION & PROJECT MANAGEMENT

### 12.1 Discipline Overview

CH's production function comprises Valeria Trofimova (Head of Production), Fred Dossola (Art Producer, started June 2026), Graham (Executive Producer, probationary), and possibly 1-2 additional producers. The team uses JIRA (being set up) and Confluence for project management and documentation, with Slack for communication. CH operates an "Agilefall" methodology: agile sprints within waterfall milestone gates. AI tooling in production has the highest immediate adoption potential because the tools are embedded in platforms CH is already deploying (JIRA, Slack), require minimal technical setup, and serve a team that is actively receptive (Aris and Glen champion AI adoption).

### 12.2 Task-Level Analysis

#### 12.2.1 Project Intelligence, Sprint Planning & Bug Triage

AI-powered automation within JIRA: automated bug deduplication and triage, sprint planning suggestions, natural language JQL queries, AI-generated status summaries, and AI teammates (Rovo agents) for routine project management tasks.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Atlassian Intelligence / Rovo | SaaS | 7 | 9 | 9 | 8 (est.) | 10 | 7 | 8.3 | ADOPT |
| Forecast.app | SaaS | 5 | 5 | 8 | 3 (est.) | 3 | 4 | 5.0 | WATCH |

*Composite for Atlassian Intelligence: (7 × 0.25) + (9 × 0.20) + (9 × 0.20) + (8 × 0.15) + (10 × 0.10) + (7 × 0.10) = 1.75 + 1.80 + 1.80 + 1.20 + 1.00 + 0.70 = 8.3 ✓*
*Forecast.app: (5 × 0.25) + (5 × 0.20) + (8 × 0.20) + (3 × 0.15) + (3 × 0.10) + (4 × 0.10) = 1.25 + 1.00 + 1.60 + 0.45 + 0.30 + 0.40 = 5.0 ✓*

**Recommendation: ADOPT** Atlassian Intelligence / Rovo as part of the JIRA Premium deployment.

- **Integration timeline:** Zero incremental effort. AI features activate when CH upgrades to JIRA Premium (likely already planned as part of the JIRA rollout). Rovo Search, Chat, and Agents are included in all paid JIRA subscriptions at no additional cost (verified June 2026; Atlassian confirmed "not currently billing for usage above included Rovo credit allowance").
- **Rollout owner:** Valeria Trofimova (Head of Production). Secondary: Aris (COO) for operational AI workflows.
- **90-day success criteria:** Auto-triage correctly categorising 70%+ of bug reports; at least 3 producers using NL JQL queries weekly; sprint planning AI suggestions reviewed (not necessarily accepted) for every sprint; status summaries reducing weekly reporting overhead by 30%.
- **Rollback trigger:** AI triage consistently miscategorises bugs (>40% error rate); producers find AI suggestions add noise rather than signal; Rovo agents produce unreliable outputs that require more oversight than they save.

**Why Atlassian Intelligence:** The strongest "zero-friction" AI recommendation in this report. CH is already deploying JIRA; the AI features are built into the Premium tier. Capability of 7 reflects genuinely useful features (auto-triage, NL queries, smart summaries) that are not game-specific but are broadly applicable to production management. Production Readiness of 9: Atlassian products are used by virtually every game studio. Integration of 10: the tool IS the platform CH is already adopting. Team Adoption of 8 (est.) reflects that production staff are the most AI-receptive discipline at CH; Valeria and Aris are likely to embrace productivity tools.

**Why not Forecast.app:** AI-powered resource scheduling and project forecasting. Interesting concept but low Capability (5) for game production (no understanding of Agilefall, milestone gates, or game-specific workflows). Integration of 3 reflects no JIRA plugin (no confirmed JIRA integration found, June 2026). Team Adoption of 3 reflects that Valeria likely has established production methods and would resist adopting a separate scheduling platform alongside JIRA. WATCH.

**Data Egress:** Atlassian Cloud processes all JIRA data (project names, task descriptions, team assignments, bug reports) on Atlassian's infrastructure. This data includes game feature names, team member names (GDPR), and production details. CH should ensure: (a) Atlassian Cloud DPA covers GDPR for UK/Greece employees, (b) sensitive data (salary, disciplinary) is not stored in JIRA, (c) partner IP feature names are acceptable in JIRA (they typically are; JIRA is already a trusted system).

**Cost Estimate:**
- Atlassian Intelligence: included in JIRA Premium at $15.63/user/month. 70 users × $15.63 × 28 months = ~$30,600. This cost is attributable to the JIRA deployment, not the AI strategy; the AI features are a bonus.
- Rovo: $0 incremental. As of June 2026, Rovo Search, Chat, and Agents are included in all paid JIRA/Confluence cloud subscriptions (Standard, Premium, Enterprise). JIRA Premium includes 70 Rovo credits per user per month (pooled at org level). At 10 credits per Chat/Agent request, this provides ~7 requests/user/day. Atlassian states they are "not currently billing for usage above included allowance" and will provide at least 90 days' notice before any overage billing begins. Note: Rovo Dev ($20/developer/month) is a SEPARATE coding-focused product (competitor to GitHub Copilot) and is NOT recommended here; the production AI features are the included core Rovo.
- Post-launch: ~$13,100/year (JIRA Premium only; Rovo included at no extra cost).

---

#### 12.2.2 Meeting Summarisation & Action Tracking

AI-powered transcription, summarisation, and action item extraction from meetings. Critical for a fully remote studio where meetings are the primary synchronisation mechanism.

**Cross-reference:** CH already uses Granola for meeting notes (139 meetings synced via daily cron, REST API integration with the NBI Hub dashboard). Granola provides AI-powered meeting summarisation with structured output. No additional tool recommendation needed for this task.

**CH-specific note:** The Granola-to-JIRA pipeline (Granola summarises meetings; action items are extracted and created as JIRA tickets) should be formalised. Rovo agents (from Task 12.2.1) can assist with this: a Rovo agent monitors Granola summaries in a Slack channel and auto-creates JIRA tickets for action items. This combines two already-adopted tools without introducing a new one.

---

### 12.3 Discipline Risk Summary

1. **Graham's probationary status.** The Executive Producer is in early probation with behavioural concerns. He is not a reliable change champion for production AI tools. Valeria and Aris should own AI adoption in production; Graham should be a user, not an owner.
2. **JIRA Premium cost is a production budget item.** The AI strategy should not be "blamed" for the JIRA Premium cost. The AI features are a bonus of the JIRA deployment decision, which should be evaluated on its own merits.

### 12.4 Governance Prerequisites

1. **AI Acceptable Use Policy v1** (Usage Policy & Governance) — Covers AI use in project management. **Priority: CRITICAL.**
2. **JIRA data classification** (IP Safeguards) — Confirm no sensitive data (salary, disciplinary, investor) in JIRA. **Priority: MEDIUM.**

### 12.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| ADOPT | Atlassian Intelligence (JIRA Premium) | $30,600 (full JIRA cost) | $13,100 |
| ADOPT | Rovo (included in JIRA Premium) | $0 | $0 |
| Already in use | Granola | $0 incremental | $0 |
| **AI-attributable total** | | **$8,280** | **$3,600** |

Notes: JIRA Premium cost ($30,600) is a production infrastructure cost, not an AI tooling cost. Rovo (Search, Chat, Agents) is now included in all paid JIRA subscriptions at no incremental cost (verified June 2026). Rovo Dev ($20/developer/month) is a separate coding product not recommended here.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 13. MARKETING & COMMUNITY

### 13.1 Discipline Overview

CH's marketing and community function is small (~2-3 people). The game is 2+ years from launch; marketing activity is currently limited to brand building, community seeding, and investor-facing materials. Post-launch, community management for a subscription MMO becomes a significant operational function (moderation, sentiment monitoring, content creation, social engagement). AI tools for marketing and community are primarily Phase 2-3 recommendations; immediate needs are minimal.

### 13.2 Task-Level Analysis

#### 13.2.1 Content Creation & Social Media

AI-assisted creation of marketing copy, social media posts, blog content, and press materials.

**Cross-reference:** This is a legitimate general-purpose LLM use case. No game-specific marketing AI tool exists that outperforms Claude, ChatGPT, or Gemini for writing marketing copy. The marketing team should use whichever LLM is approved under CH's AI Acceptable Use Policy for content drafting, with human review and approval before publication.

**CH-specific guardrail:** Marketing content must never include AI-generated imagery (community backlash risk per Section 6). All visual marketing assets must be human-created and tagged as such. Text content drafted with AI assistance should be disclosed internally but does not require public disclosure.

---

#### 13.2.2 Community Moderation — Voice & Text

AI-powered moderation of player communications in text chat, voice chat, and user-generated content. Essential post-launch for a subscription MMO.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| ToxMod (Modulate) | SaaS | 9 | 7 | 9 | 5 (est.) | 5 | 5 | 7.2 | WATCH |
| Two Hat (Spectrum Labs) | SaaS | 7 | 8 | 9 | 5 (est.) | 5 | 5 | 6.9 | WATCH |

*Composite for ToxMod: (9 × 0.25) + (7 × 0.20) + (9 × 0.20) + (5 × 0.15) + (5 × 0.10) + (5 × 0.10) = 2.25 + 1.40 + 1.80 + 0.75 + 0.50 + 0.50 = 7.2 ✓*
*Two Hat: (7 × 0.25) + (8 × 0.20) + (9 × 0.20) + (5 × 0.15) + (5 × 0.10) + (5 × 0.10) = 1.75 + 1.60 + 1.80 + 0.75 + 0.50 + 0.50 = 6.9 ✓*

**Recommendation: WATCH** both tools. Community moderation is a post-launch requirement (Phase 3, 12-18 months before launch at earliest).

**Why WATCH:** CH has no player community to moderate yet. Voice chat and text chat systems are not implemented. The game is 2+ years from launch. Evaluating moderation tools now would be premature; the market will evolve significantly before CH needs them. Both tools should be evaluated 6-9 months before closed beta, when community features are being tested.

**ToxMod** (Modulate) is purpose-built for voice toxicity detection in games (Capability 9). It analyses voice in real-time without recording content, which is GDPR-friendly. Production: Riot Games has invested in similar technology (no independent confirmation of Riot's direct use of ToxMod vs internal solution found, June 2026). For CH's "positive community culture" design pillar (referencing FFXIV), voice moderation is essential. SAG-AFTRA/Equity: No concern; moderation analyses player voice, not performer voice.

**Two Hat** (acquired by Spectrum Labs, now part of Community Sift) is text-focused moderation with game-specific content classifiers. Production: used by major game publishers (no specific game citations independently confirmed, June 2026).

**Revisit:** 6 months before closed beta begins, or when CH hires a Community Manager. The moderation tool choice should be made in conjunction with the chat system architecture decision (custom, Vivox, Discord integration, etc.).

---

#### 13.2.3 Sentiment Analysis & Social Listening

AI-powered monitoring of community sentiment across social media, forums, Reddit, Discord, and review platforms.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Brandwatch | SaaS | 6 | 9 | 9 | 4 (est.) | 5 | 2 | 6.4 | WATCH |

*Composite for Brandwatch: (6 × 0.25) + (9 × 0.20) + (9 × 0.20) + (4 × 0.15) + (5 × 0.10) + (2 × 0.10) = 1.50 + 1.80 + 1.80 + 0.60 + 0.50 + 0.20 = 6.4 ✓*

**Recommendation: WATCH.** Enterprise sentiment analysis tools (Brandwatch, Sprout Social, Meltwater) are expensive (Cost score of 2; Brandwatch pricing starts at ~$1,000/month for basic access [VENDOR CONTACT REQUIRED: Brandwatch pricing confirmation]) and designed for consumer brands, not pre-launch game studios. CH does not need enterprise social listening until the game has a public presence.

**Alternative workflow:** For pre-launch: manual monitoring of relevant subreddits, Discord servers, and MMO community forums. For post-launch: evaluate Brandwatch or a game-specific alternative alongside the community management hire.

---

### 13.3 Discipline Risk Summary

1. **AI-generated marketing imagery is prohibited.** Community backlash risk extends to marketing materials. All visual marketing assets must be human-created.
2. **Community moderation is a launch-blocking requirement.** Not having AI moderation at launch is a risk for player retention and platform compliance (console platform holders require moderation). Budget and evaluate 6 months before beta.

### 13.4 Governance Prerequisites

1. **Marketing content AI policy** (Usage Policy & Governance) — Defines approved use of LLMs for text content, prohibition on AI imagery. **Priority: MEDIUM.**
2. **Community moderation policy** (Usage Policy & Governance) — Pre-launch: defines player content moderation standards. **Priority: HIGH (Phase 3).**

### 13.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| WATCH | ToxMod, Two Hat, Brandwatch | $0 | $10,000-50,000 (when adopted) |
| **Total** | | **$0** | **$10,000-50,000** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 14. DATA & ANALYTICS

### 14.1 Discipline Overview

CH has zero dedicated Data/Analytics headcount. This is a critical gap for a subscription MMO that will generate massive player telemetry, economy transaction data, engagement metrics, and churn signals. Per the owner-capacity rule, the maximum verdict for any tool in this discipline is PILOT contingent on the Data/Analytics hire.

### 14.2 Task-Level Analysis

#### 14.2.1 Player Telemetry & Economy Monitoring

AI-powered analysis of player behaviour data, economy health metrics, and engagement patterns. Essential post-launch for a subscription MMO.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Mixpanel (AI features) | SaaS | 6 | 9 | 8 | 1 (est.) | 5 | 5 | 6.1 | WATCH |
| GameAnalytics | SaaS | 8 | 9 | 8 | 1 (est.) | 7 | 9 | 7.2 | WATCH |

*Composite for Mixpanel: (6 × 0.25) + (9 × 0.20) + (8 × 0.20) + (1 × 0.15) + (5 × 0.10) + (5 × 0.10) = 1.50 + 1.80 + 1.60 + 0.15 + 0.50 + 0.50 = 6.1 ✓*
*GameAnalytics: (8 × 0.25) + (9 × 0.20) + (8 × 0.20) + (1 × 0.15) + (7 × 0.10) + (9 × 0.10) = 2.00 + 1.80 + 1.60 + 0.15 + 0.70 + 0.90 = 7.2 ✓*

**Recommendation: WATCH** both tools. Zero Data/Analytics headcount blocks adoption.

**Why WATCH:** Both are capable platforms. GameAnalytics scores higher because it is purpose-built for games (Capability 8 vs Mixpanel's 6), is free for indie/AA studios (Cost 9), and has native UE5 SDK integration. However, Team Adoption of 1 (est.) for both reflects that there is literally no one at CH to configure, analyse, or act on the data. Deploying an analytics platform without a data analyst is waste; the data would accumulate unread.

**GameAnalytics** is the recommended tool when the Data hire is made. It is free, game-specific, used by studios including Unity, Miniclip, and others (named customers verified via website: Voodoo, Wargaming, TapNation, Gamefam, Trihex Studios), and provides AI-powered anomaly detection and player segmentation. Production Readiness of 9 reflects a mature platform: 100,000+ games, 27 billion daily events (verified via GameAnalytics website). Named customers: Voodoo, Wargaming, TapNation, Gamefam, Trihex Studios (Roblox).

**Prerequisite:** Hire a Data Analyst or Data Engineer before adopting any analytics platform. This hire should happen 12+ months before launch to allow time for telemetry instrumentation and baseline data collection during beta.

**Data Egress:** Both platforms process player telemetry (gameplay events, session data, purchase events). Post-launch, this includes player PII (GDPR applies). GDPR-compliant data processing agreements are required. Player telemetry should be anonymised where possible.

**Cost Estimate:** $0 pre-launch (WATCH). GameAnalytics is free at CH's scale. Post-launch: $0-2,000/month depending on event volume [VENDOR CONTACT REQUIRED: GameAnalytics pricing at scale].

---

#### 14.2.2 Churn Prediction & Retention

AI models that predict which players are likely to churn and suggest retention interventions. Critical for a subscription MMO where churn directly impacts revenue.

**Recommendation: WATCH.** This requires: (a) a Data/Analytics hire, (b) a launched game with player data, (c) sufficient historical data to train prediction models (typically 3-6 months post-launch). This is a Year 3+ capability. No tool evaluation is appropriate at this time.

---

### 14.3 Discipline Risk Summary

1. **Zero headcount is the primary risk.** Every tool recommendation in this discipline is moot until the Data/Analytics hire. This hire should be prioritised in the staffing plan; a subscription MMO without data analytics is flying blind.
2. **Telemetry instrumentation must start early.** Even if analysis happens later, the telemetry hooks in the game code should be planned during pre-production. Engineering should instrument key events (zone transitions, combat encounters, economic transactions, session length) early so that data is available when the analyst arrives.

### 14.4 Governance Prerequisites

1. **Player data handling policy** (IP Safeguards) — GDPR-compliant telemetry collection, storage, and processing. **Priority: HIGH (required before any player-facing testing).**
2. **Data/Analytics hire** — Not a governance item but a hard prerequisite for this discipline. **Priority: CRITICAL.**

### 14.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| WATCH | GameAnalytics, Mixpanel | $0 | $0-24,000 |
| **Total** | | **$0** | **$0-24,000** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 15. PLATFORM & BACKEND

### 15.1 Discipline Overview

CH's backend architecture targets 5 distinct server profiles (overworld, hub, instance, user space, metagame). There is no dedicated DevOps, no CTO, and engineers are already context-switching into infrastructure. Backend AI tooling is primarily about automated protection (anti-cheat, fraud detection) and operational efficiency (matchmaking, scaling). Most of these are post-launch or late-development concerns; the immediate priority is building the server infrastructure, not optimising it with AI.

### 15.2 Task-Level Analysis

#### 15.2.1 Anti-Cheat

AI/ML-powered cheat detection and prevention. Essential for a competitive MMO with PvP zones, hitbox combat, and an in-game economy that must be protected from exploitation.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Easy Anti-Cheat (Epic) | Middleware | 7 | 10 | 10 | 7 (est.) | 9 | 10 | 8.7 | ADOPT |

*Composite for EAC: (7 × 0.25) + (10 × 0.20) + (10 × 0.20) + (7 × 0.15) + (9 × 0.10) + (10 × 0.10) = 1.75 + 2.00 + 2.00 + 1.05 + 0.90 + 1.00 = 8.7 ✓*

**Note on AI classification:** Easy Anti-Cheat uses ML-based behavioural analysis to detect cheats, supplementing signature-based detection. The ML component qualifies it for this report.

**Recommendation: ADOPT** Easy Anti-Cheat as part of the UE5 platform stack.

- **Integration timeline:** 1-2 weeks. EAC has native UE5 integration (Epic owns both).
- **Rollout owner:** Mustafa (Head of Tech). Anti-cheat should be integrated during server development, not bolted on later.
- **90-day success criteria:** EAC integrated into all client builds and server profiles; cheat detection active in development and QA builds; no false positive bans during internal testing.
- **Rollback trigger:** False positive rate is unacceptable; EAC conflicts with CH's proprietary server architecture (unlikely given native UE5 integration).

**Why EAC:** A composite of 8.7 reflects EAC's maturity and zero cost, though the AI Capability score (7) is adjusted to reflect that EAC's primary value is signature-based and kernel-level cheat detection, with ML behavioural analysis as a supporting layer rather than the core product. Free for UE5 developers (Epic owns EAC and offers it free to UE5 licensees). Production Readiness of 10: used in Fortnite, Apex Legends, Elden Ring, and hundreds of other titles. IP/Legal of 10: Epic's own product with clear commercial terms. For CH's UE5 MMO, there is no reason not to adopt EAC; the cost is zero and the integration is native.

**Competitive alternative:** BattlEye is the primary competitor. Equally mature, used by PUBG, Rainbow Six Siege, and Destiny 2. However, BattlEye is not free for UE5 developers and requires a separate licensing agreement. Given EAC's zero cost and native UE5 integration, it is the clear choice for CH.

**Data Egress:** EAC processes client-side game data (memory scans, process lists, driver information) on the player's machine and communicates with EAC servers for detection updates. No game source code or design data is involved. Player data handling follows Epic's privacy policy. GDPR: EAC data processing is covered by Epic's DPA.

**Cost Estimate:** $0 (free with UE5). Post-launch: $0.

**CRITICAL NOTE — EAC is Necessary but NOT Sufficient for a Subscription MMO:**

EAC is a client-side anti-cheat solution (kernel-level scanner detecting memory hacks, process injections, and known cheat signatures). For a subscription MMO with a player-driven economy, client-side anti-cheat alone cannot protect against:

1. **Economy exploits:** Item duplication, currency manipulation, and market abuse occur through server-side logic exploitation, not client memory hacking. EAC cannot detect these.
2. **Packet manipulation:** Speed hacks via network-level manipulation, teleportation exploits, and transaction replay attacks bypass client-side detection entirely.
3. **Server-side logic abuse:** Exploiting race conditions in crafting, trading, or inventory systems requires server-authoritative validation, not client scanning.

**Required two-layer strategy:**
- **Layer 1 (ADOPT, $0):** EAC for client-side baseline protection against memory hacks and known cheat tools.
- **Layer 2 (Engineering investment, Phase 2-3):** Server-authoritative validation architecture. CH must build: (a) server-authoritative movement and hit registration (no client trust for combat results), (b) transaction validation with anomaly detection for the player economy, (c) rate limiting and pattern detection for suspicious activity. This is an architecture pattern, not a tool purchase. Every successful subscription MMO (FFXIV, WoW, GW2, ESO) runs this as primary anti-cheat. The ML-based anomaly detection component (flagging unusual economy activity, impossible combat metrics) is a WATCH item requiring a Data Analyst hire before implementation.

---

#### 15.2.2 Matchmaking Optimisation

AI-powered player matching for PvP, group content, and social features. Relevant for CH's structured PvP instances, dungeon/raid matchmaking, and hub shard routing (social-graph-aware routing for the Downtime city).

**Recommendation: WATCH.** Matchmaking optimisation is a custom engineering task for most MMOs. No off-the-shelf AI matchmaking product is suitable for CH's specific architecture (5 server profiles, social-graph-aware routing, faction-weighted matching). The matchmaking algorithm should be designed by CH's engineering team as part of the metagame backend; ML optimisation of that algorithm can happen once sufficient player data exists (post-launch).

The one relevant tool category is AI-driven lobby/queue optimisation. PlayFab (Microsoft) offers some ML-based matchmaking features, but PlayFab's game backend is a platform decision (comparable to the backend architecture itself, not a plugin tool). [Note: AccelByte excluded per constraints.]

**Alternative workflow:** Engineers build matchmaking logic as part of the metagame backend. ML-based tuning (e.g., optimising wait time vs match quality tradeoffs) is implemented as a custom module once player data is available. This is standard for MMOs; FFXIV, GW2, and ESO all use custom matchmaking systems.

---

#### 15.2.3 Infrastructure Auto-Scaling

ML-powered predictive scaling for the game's server infrastructure. Relevant for managing the 5 server profiles' compute resources based on predicted player load.

**Recommendation: WATCH.** Cloud providers (AWS, GCP, Azure) all offer ML-based auto-scaling features as part of their compute platforms. These are not separate AI tools but features of the infrastructure CH will already be using. The engineering team should configure predictive scaling as part of the server deployment architecture. This is a DevOps task (blocked by the DevOps hire) rather than an AI tool procurement decision.

---

#### 15.2.4 Backend Platforms — Not Evaluated (Rationale)

Two backend platforms are directly relevant to CH's MMO architecture but fall outside this report's AI tool scope:

**Pragma** — Game backend platform (auth, matchmaking, player data, economy services, LiveOps). Pragma is a non-AI infrastructure platform. It competes with custom-built backend systems and provides managed services for precisely the functions CH is building (account system, matchmaking, economy, inventory). A Head of Tech evaluating this report will ask why Pragma is absent. **Rationale for exclusion:** Pragma is not an AI tool; it is backend infrastructure. Its evaluation belongs in CH's architecture decision (build vs buy for backend services), not the AI tool strategy. If CH evaluates managed backend platforms, Pragma should be on the shortlist alongside PlayFab and custom UE5 backend.

**Nakama (Heroic Labs)** — Open-source social server (matchmaking, parties, chat, leaderboards, tournaments, notifications). Similarly not an AI tool. Relevant because CH's MMO requires all of these social features. **Rationale for exclusion:** Same as Pragma — this is architecture infrastructure, not AI tooling. Nakama's open-source model may appeal to CH given the studio's engineering capacity. Mustafa should evaluate alongside Pragma and custom solutions.

**Recommendation:** The future CTO should evaluate Pragma and Nakama as part of the backend architecture decision. This evaluation is orthogonal to AI tooling but equally critical for the MMO's technical foundation.

#### 15.2.5 Game Server Orchestration

Server orchestration — how CH deploys, scales, and manages game server instances across its 5 server profiles (overworld, hub, instance, user space, metagame) — is a critical infrastructure decision that this report must address. The choice directly gates load testing, bot simulation, observability, and cost management.

**Industry reality: no major MMO uses off-the-shelf orchestration.** WoW runs on Blizzard's own data centres (10 data centres, 75,000 CPU cores, colocated via AT&T; source: DataCenterKnowledge). FFXIV runs on Square Enix's proprietary data centres across four regions (source: Square Enix support centre FAQ). Guild Wars 2 migrated to AWS EC2 in 2017 but uses custom deployment on standard EC2 instances, NOT GameLift (source: AWS GameTech blog, ArenaNet migration case study). ESO's EU servers run on AWS Frankfurt infrastructure (community-confirmed; no official ZeniMax statement). GameLift's confirmed customers are session-based games (Apex Legends, Dead by Daylight), not persistent worlds.

**Three evaluated options for CH:**

| Option | Type | Lock-in | Persistent server support | Operational overhead | Compute cost (5 zones, 24/7) | Egress cost |
|---|---|---|---|---|---|---|
| **AWS GameLift** | Managed | HIGH — C++/C# SDK required in server code; removal requires full rearchitect | Yes (explicit AWS blog: "Host persistent world games on GameLift Servers"; uses CreateGameSession API + DynamoDB for world state) | LOW — AWS manages fleet scaling, health monitoring. FlexMatch matchmaking included free. Scale-to-zero and container fleets now GA. | ~$760/month (5× c5.xlarge at $0.211/hr × 730 hrs; verified AWS GameLift pricing page, June 2026) | $0.09/GB first 10 TB (verified AWS pricing) |
| **Google Agones** (open-source, Kubernetes-native) | Self-managed | LOW — open-source, lightweight REST/gRPC health checks, portable across cloud providers | Yes, but with constraint: GKE PodDisruptionBudget evictions force restart after 1 hour. Persistent servers require blue/green cluster management or 30-day maintenance exclusions (source: Agones "Controlling Disruption" docs). | HIGH — requires Kubernetes expertise CH does not have. DevOps hire is a hard prerequisite. Co-developed with Ubisoft (announced March 2018; source: 9to5Google). | ~$790/month (GKE cluster fee $72 + 5× e2-standard-4 at $98 + 2 headroom nodes at $98; verified GCP pricing, June 2026) | $0.12/GB first 1 TB (verified GCP pricing) — more expensive than AWS |
| **Custom EC2/VM** (ArenaNet model) | Self-managed | NONE | Full control over server lifecycle. No eviction constraints. | MODERATE — manage health monitoring and scaling directly. At 5 servers, this is straightforward. | ~$640/month (5× c5.xlarge EC2 at $0.17/hr; ~24% cheaper than GameLift markup; verified EC2 on-demand pricing) | $0.09/GB (same as GameLift) |

*PlayFab Multiplayer Servers (Microsoft) is an additional option at ~$700/month with the cheapest egress ($0.05/GB Zone 1, verified PlayFab MPS pricing page), but it is less proven for MMO persistent worlds and introduces Xbox ecosystem dependency.*

**Recommendation: WATCH** all three options. Server orchestration is a CTO-level architecture decision that should not be made in the AI tool strategy. The future CTO should evaluate alongside the backend platform decision (Pragma, Nakama, custom).

**CH-specific guidance:**
1. **At CH's current scale (200-600 CCU per zone, 5 profiles), compute costs are negligible** — $640-790/month regardless of platform. The differentiator is operational complexity and lock-in, not cost.
2. **Agones is wrong for CH today.** It requires Kubernetes expertise CH lacks and introduces eviction constraints incompatible with persistent MMO servers without significant DevOps overhead. Revisit only after a DevOps Lead with Kubernetes experience is hired.
3. **GameLift is the path of least resistance** if CH accepts the SDK lock-in. AWS explicitly documents persistent world architecture patterns, and the managed fleet eliminates the need for a dedicated DevOps resource for server management. The lock-in risk is real but manageable at CH's scale.
4. **Custom EC2 is what proven MMO studios actually do** (ArenaNet's model). At 5 servers, the operational overhead is trivial. This is the lowest-risk, lowest-cost option but requires engineering time that Mustafa may not have.
5. **This decision should be made before Phase 2** — it gates load testing infrastructure, bot simulation architecture, and observability tooling. The QA bot infrastructure recommendation (Section 10) depends on which server orchestration model CH selects.

**Cost estimate:** $0 pre-launch (WATCH). Post-launch: $7,700-9,500/year compute + $100-500/year egress (at CH's initial scale). Costs scale linearly with CCU and zone count.

---

### 15.3 Discipline Risk Summary

1. **Anti-cheat is non-negotiable.** An MMO without anti-cheat will be exploited within days of launch. EAC should be integrated during development, not post-launch.
2. **Backend AI is mostly custom engineering.** Matchmaking, scaling, and fraud detection for an MMO are custom-built systems, not off-the-shelf products. CH should budget engineering time for these systems rather than expecting an AI tool to solve them.
3. **Server orchestration is a CTO decision.** GameLift, Agones, and custom deployment all have trade-offs (lock-in vs complexity vs control). This decision gates multiple downstream recommendations and should be made within the first 3 months of the CTO hire.
4. **Backend platform evaluation is a CTO priority.** The absence of a managed backend platform decision (Pragma, Nakama, PlayFab, or custom) is a strategic risk. This decision gates social features, matchmaking, and economy infrastructure.

### 15.4 Governance Prerequisites

1. **Player data handling policy** (IP Safeguards) — Covers anti-cheat data collection, player behaviour tracking, and GDPR compliance. **Priority: HIGH.**

### 15.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| ADOPT | Easy Anti-Cheat | $0 | $0 |
| **Total** | | **$0** | **$0** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 16. HR & PEOPLE

### 16.1 Discipline Overview

Lorenza Menna is the sole HR resource, based in Italy, managing HR for ~70 employees across the UK and Greece. CH uses HiBob as its HRIS. The primary HR challenges are: rapid hiring to support growth, compensation benchmarking across multiple jurisdictions, and onboarding for a fully remote team. AI tooling can assist with screening and benchmarking but cannot replace the human judgment required for hiring decisions, particularly in a creative studio where cultural fit and team dynamics matter.

### 16.2 Task-Level Analysis

#### 16.2.1 Candidate Screening & Recruitment

AI-assisted CV screening, candidate matching, and recruitment pipeline management.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| HiBob AI Features | SaaS | 5 | 7 | 8 | 9 (est.) | 10 | 7 | 7.3 | PILOT |

*Composite for HiBob AI: (5 × 0.25) + (7 × 0.20) + (8 × 0.20) + (9 × 0.15) + (10 × 0.10) + (7 × 0.10) = 1.25 + 1.40 + 1.60 + 1.35 + 1.00 + 0.70 = 7.3 ✓*

**Recommendation: PILOT** HiBob's AI features for recruitment assistance.

- **Pilot scope:** Use HiBob's AI features for the next 5 hires. Evaluate: candidate matching quality, time savings in CV screening, integration with existing recruitment workflow.
- **Rollout owner:** Lorenza Menna (Head of HR).
- **90-day success criteria:** Time-to-shortlist reduced by 30%; Lorenza reports meaningful reduction in manual CV review; no bias incidents or complaints.
- **Rollback trigger:** AI screening produces biased shortlists (demographic skew); candidates report negative experience; Lorenza finds the tool adds friction rather than reducing it.

**Why HiBob AI (PILOT, not ADOPT):** CH already uses HiBob, and the platform does offer AI features (AI assistant, CV summaries, job description generation, performance insights, Bob Companion beta). However, the verdict is PILOT rather than ADOPT because HR AI carries elevated risk that requires careful evaluation before full rollout: (a) employee PII processing — AI features may route data through third-party LLM providers, creating GDPR exposure for UK and Greek employees; (b) recruitment bias — AI CV screening can introduce demographic bias, requiring monitoring and human oversight; (c) works council sensitivity — Greek employment law and employee expectations around automated decision-making create compliance obligations; (d) immature beta features — Bob Companion and performance insights are recent additions without extensive enterprise track record. Capability of 5 reflects that the AI features exist but their reliability and depth for CH's specific needs (multi-jurisdiction, ~55 employees, solo HR) are unproven. Integration of 10: it is already the platform. Team Adoption of 9 (est.): Lorenza is the sole user and can evaluate independently. IP/Legal of 8: GDPR compliance is critical; HiBob uses custom-quote pricing (verified) designed for European operations.

**Data Egress:** HiBob processes employee PII on its cloud platform. GDPR applies (UK + Greece employees). HiBob's existing DPA should cover AI feature data processing; confirm that AI features do not send employee data to third-party LLM providers [VENDOR CONTACT REQUIRED: HiBob AI data processing architecture — confirm whether AI features send employee data to third-party LLM providers].

**Cost Estimate:** $0 incremental (AI features likely included in HiBob subscription) [VENDOR CONTACT REQUIRED: whether HiBob AI features require a tier upgrade].

---

#### 16.2.2 Compensation Benchmarking

AI-assisted salary benchmarking across CH's jurisdictions (UK, Greece, potentially expanding).

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| SalarySage (NBI) | SaaS | 7 | 6 | 9 | 7 (est.) | 5 | 7 | 7.0 | PILOT |

*Composite for SalarySage: (7 × 0.25) + (6 × 0.20) + (9 × 0.20) + (7 × 0.15) + (5 × 0.10) + (7 × 0.10) = 1.75 + 1.20 + 1.80 + 1.05 + 0.50 + 0.70 = 7.0 ✓*

**Recommendation: PILOT** SalarySage for compensation benchmarking.

**Disclosure:** SalarySage is an NBI Analytics product. This recommendation is flagged as a potential conflict of interest. The consulting team should independently verify that SalarySage provides the best value for CH's needs; alternative tools (Pave, Ravio, Figures) should be evaluated if CH's board or investors raise concerns about the advisory relationship.

- **Pilot scope:** Benchmark 5-10 key roles across UK and Greece. Compare against existing salary data from Lorenza's manual benchmarking.
- **Rollout owner:** Lorenza Menna, with Glen Pryer (CPO advisory) providing the tool.
- **90-day success criteria:** Salary benchmarks for CH's key roles available within 1 week (vs Lorenza's current manual process); benchmarks cover both UK and Greek markets; data quality is sufficient for hiring band decisions.

**Data Egress:** SalarySage processes role descriptions and market location data. Employee salary data is the input for comparison. GDPR: salary data is personal data; SalarySage's data processing must be GDPR-compliant. No employee names or identifiers should be included in benchmark queries; use role titles and anonymised parameters only.

**Cost Estimate:** [VENDOR CONTACT REQUIRED: SalarySage pricing for CH's scale]. Estimated: $500-2,000/year.

---

### 16.3 Discipline Risk Summary

1. **Lorenza is solo.** Any AI tool must reduce her workload, not add to it. Pilot evaluations should be lightweight.
2. **GDPR is non-negotiable for employee data.** UK and Greek GDPR requirements apply to all HR AI tools. No employee data (CVs, salaries, performance reviews, disciplinary records) should be processed by AI tools without GDPR-compliant data processing agreements.
3. **AI screening bias risk.** AI-powered CV screening can introduce demographic bias. CH must monitor shortlists for bias and maintain human oversight of all hiring decisions.

### 16.4 Governance Prerequisites

1. **Employee data AI processing policy** (IP Safeguards) — GDPR-compliant rules for processing employee PII through AI tools. **Priority: CRITICAL.**
2. **AI bias monitoring for recruitment** (Usage Policy & Governance) — Process for detecting and correcting demographic bias in AI-screened candidate pools. **Priority: HIGH.**

### 16.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| PILOT | HiBob AI Features | $0 incremental | $0 |
| PILOT | SalarySage | $500-2,000 | $500-2,000 |
| **Total** | | **$500-2,000** | **$500-2,000** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 17. FINANCE & LEGAL

### 17.1 Discipline Overview

Lili (Head of Finance) starts 1 July 2026; as of this report's date, the Finance function is vacant. Dino serves as General Counsel with external legal support from Saybrook Legal and Mishcon de Reya. The primary Finance/Legal AI use cases are contract analysis (CH has active fundraising, vendor contracts, and employment agreements across jurisdictions), financial forecasting, and IP risk scanning (critical given partner IP integrations and AI governance requirements for the Series B raise).

### 17.2 Task-Level Analysis

#### 17.2.1 Contract Analysis & Review

AI-assisted review of contracts: identifying key terms, flagging unusual clauses, comparing against templates, and tracking obligations.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Luminance | SaaS | 7 | 8 | 9 | 5 (est.) | 5 | 3 | 6.7 | WATCH |
| Harvey AI | SaaS | 8 | 7 | 8 | 4 (est.) | 4 | 2 | 6.2 | WATCH |

*Composite for Luminance: (7 × 0.25) + (8 × 0.20) + (9 × 0.20) + (5 × 0.15) + (5 × 0.10) + (3 × 0.10) = 1.75 + 1.60 + 1.80 + 0.75 + 0.50 + 0.30 = 6.7 ✓*
*Harvey AI: (8 × 0.25) + (7 × 0.20) + (8 × 0.20) + (4 × 0.15) + (4 × 0.10) + (2 × 0.10) = 2.00 + 1.40 + 1.60 + 0.60 + 0.40 + 0.20 = 6.2 ✓*

**Recommendation: WATCH** both tools. AI contract analysis is valuable but premature for CH.

**Why WATCH:** Two factors:
1. **Lili is not yet in post.** Finance ownership is vacant. Per the owner-capacity rule, maximum verdict is PILOT contingent on the hire; given additional cost concerns, WATCH is appropriate.
2. **Cost.** Both Luminance and Harvey are enterprise legal AI tools with pricing designed for law firms and large legal departments (Cost scores of 2-3 reflect pricing at ~$500-2,000+/month [VENDOR CONTACT REQUIRED: Luminance and Harvey pricing]). For a single General Counsel with external law firm support, the ROI does not justify the cost. Dino and the external firms likely have their own AI tools for contract review.

**Alternative workflow:** Dino uses Saybrook Legal and Mishcon de Reya for contract review. These firms likely have access to enterprise legal AI tools as part of their practice. CH pays for contract review as part of legal fees, not as a separate AI tool subscription. For internal contract management, a general-purpose LLM can assist Dino with first-pass contract summary and clause extraction, with the understanding that no confidential contract terms (cap table, fundraising terms, investor side letters) are processed through public AI APIs.

**Revisit:** When CH's legal function grows (second lawyer or dedicated legal operations role) and contract volume justifies the cost. Suggested: post-Series B.

---

#### 17.2.2 Financial Forecasting

AI-assisted financial modelling, cash flow prediction, and scenario analysis.

**Recommendation: WATCH.** Lili starts 1 July 2026. Financial modelling tools should be her decision after she assesses CH's financial infrastructure. General-purpose tools (Excel with AI copilot features, Google Sheets AI) are likely sufficient for a studio of CH's size. Dedicated AI financial platforms (Planful, Anaplan) are enterprise-scale and inappropriate for CH's current needs.

---

#### 17.2.3 IP Risk Scanning

AI-powered scanning of CH's assets and content for potential IP infringement risks. Relevant given: (a) partner IP integrations that require careful handling, (b) AI governance requirements for the Series B raise, (c) the risk of inadvertent IP infringement in user-generated content post-launch.

**Recommendation: WATCH.** No game-specific IP risk scanning AI tool exists at sufficient maturity. General copyright detection services (for detecting if CH's assets inadvertently resemble existing IP) are available but are more relevant post-launch when user-generated content is in play. Dino should assess this need as part of the AI governance backlog (IP Safeguards area).

---

### 17.3 Discipline Risk Summary

1. **Cap table and fundraising data must NEVER enter AI tools.** Commercial data (investor terms, cap table, financial projections) is highly sensitive. No cloud-based AI tool should process this data. General-purpose LLMs must not be used for financial analysis involving confidential terms.
2. **Series B due diligence will scrutinise AI governance.** The AI strategy report itself is a due diligence asset. CH's documented, rigorous approach to AI adoption (conservative verdicts, clear risk assessment, governance prerequisites) demonstrates maturity to potential investors.

### 17.4 Governance Prerequisites

1. **Commercial data classification** (IP Safeguards) — Defines which financial and legal data categories are prohibited from AI tool processing. **Priority: CRITICAL.**
2. **External legal AI policy** (Usage Policy & Governance) — Confirms that external law firms' use of AI tools for CH's work is governed by engagement terms. **Priority: MEDIUM.**

### 17.5 Discipline Budget Summary

| Category | Tool | Pre-Launch (28 months) | Post-Launch Annual |
|----------|------|----------------------|-------------------|
| WATCH | All tools | $0 | $0 |
| **Total** | | **$0** | **$0** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 18. PHASED ADOPTION ROADMAP

### 18.1 Phase 1: Foundation (0-3 months, July-September 2026)

**Objective:** Deploy low-risk, high-value AI tools that require minimal organisational change. Establish governance prerequisites.

**Governance prerequisites (must complete before any tool deployment):**
- AI Acceptable Use Policy v1 (owner: Aris + Glen + Dino)
- Approved Tool List with data classification (owner: Aris)
- Source code data classification and `.copilotignore` manifest (owner: Mustafa)
- AI Voice Prohibition Policy (owner: Dino)
- Partner IP handling procedures for AI tools (owner: Dino)

**Phase 1 deployment cap: 6 active change-management items.** For a 70-person remote studio with no CTO, concurrent organisational change must be limited. The following distinguishes between tools requiring active deployment effort and features already available in existing licensed software.

**New deployments requiring active rollout (4 tools):**

| Tool | Discipline | Owner | Sprint Boundary | Rollback Window |
|---|---|---|---|---|
| GitHub Copilot Business | Engineering | Mustafa | Sprint 1 post-policy | Before next milestone gate |
| MetaHuman Animator | Animation | David Luong | Sprint 1 post-policy | Before next milestone gate |
| Atlassian Intelligence | Production | Valeria | JIRA Premium deployment | Before next sprint cycle |
| Easy Anti-Cheat | Platform | Mustafa | Next engineering sprint | Before Alpha |

**Available immediately in existing tools (no deployment effort; communicate approved usage):**

| Tool | Discipline | Owner | Notes |
|---|---|---|---|
| Substance 3D AI features | Art | David Luong | Opt-in features in existing Substance licences |
| Houdini ML features | Art | David Luong | Existing tool, ML features already included |
| Wwise Sound Search | Audio | Audio Lead | Built-in feature, conditional on Wwise selection |
| iZotope Ozone AI | Audio | Audio Lead | Existing tool, AI mastering already available |

**PILOT tools (time-boxed evaluations, 2 concurrent max):**

| Tool | Discipline | Duration | Owner |
|---|---|---|---|
| Adobe Firefly Enterprise | Art | 3 months, 5 seats, voluntary | David Luong + Fred |
| Cascadeur Pro | Animation | 3 months, 2 seats | David Luong (interim) |

**Phase 1b (deploy after Phase 1 governance is proven, before Phase 2 — approximately month 2-3):**
Sentry Business and SonarQube Developer are ADOPT tools but require DevOps capacity for triage and rule tuning. If a DevOps Lead is hired during Phase 1, these can begin. Otherwise, defer to early Phase 2.

**Hires required for Phase 1:** None new; Phase 1 uses existing headcount. However, the CTO search and QA vendor pipeline should be actively progressing.

### 18.2 Phase 2: Expansion (3-9 months, October 2026 - March 2027)

**Objective:** Promote successful Phase 1 pilots. Begin pilots of medium-complexity tools. Contingent on CTO and/or DevOps hire.

**Prerequisites:**
- CTO or DevOps Lead hired (blocks: CI/CD AI, monitoring, self-hosted infrastructure)
- QA vendor pipeline active (blocks: scaling automated testing beyond prototype)
- Head of Narrative hired (blocks: narrative AI evaluation)
- Phase 1 pilot results evaluated and governance compliance confirmed

**New ADOPT tools (promote from Phase 1 PILOT if successful):**

| Tool | Condition for Promotion |
|---|---|
| Adobe Firefly Enterprise | 3+ voluntary users; no morale incidents; no IP incidents |
| Cascadeur Pro | Animators report meaningful time savings; quality passes Art Director review |

**New PILOT tools:**

| Tool | Discipline | Duration | Owner | Dependency |
|---|---|---|---|---|
| Custom QA bots | QA | 6 months build | Hannah + Mustafa + DevOps Lead | DevOps hired; UE5 AI Controller framework selected |
| Rokoko Studio AI | Animation | 3 months, 2-3 seats | New animation lead | Animation lead hired |
| Machinations | Game Design | Ongoing | Simon Woodruff | Simon's buy-in |
| Ludo.ai | Game Design | WATCH (reclassified) | Simon Woodruff | Not suitable for MMO; mobile/casual focus |
| Promethean AI | Art | 3 months, 3 seats | David Luong + Fred | Environment art pipeline stable |
| TeamCity AI | DevOps | 3 months | DevOps Lead | CI/CD platform selected |
| Incredibuild | DevOps | Ongoing | Mustafa/DevOps Lead | Budget approved |
| Sentry Business | Engineering | Ongoing | Mustafa | CI/CD pipeline active |
| SonarQube Developer | Engineering | Ongoing | Mustafa | CI/CD pipeline active |
| Backtrace | Engineering | 3 months, 3 seats | Mustafa | Evaluate vs Sentry for crashes |

### 18.3 Phase 3: Scale (9-18 months, April 2027 - December 2027)

**Objective:** Advanced tooling as governance, team, and infrastructure mature. Localisation pipeline. Community moderation preparation. Analytics deployment.

**Prerequisites:**
- Data/Analytics hire (blocks: GameAnalytics, churn prediction)
- Community Manager hire (blocks: ToxMod, sentiment analysis)
- Content stabilisation (blocks: memoQ localisation pilot)
- Self-hosted inference infrastructure (blocks: art AI with partner IP, if needed)

**New PILOT tools:**

| Tool | Discipline | Dependency |
|---|---|---|
| memoQ Gaming Bundle | Localisation | Content stability |
| HiBob AI Features | HR | Lorenza capacity |
| SalarySage | HR | COI disclosure to board |
| GameAnalytics | Data | Data hire in place |
| ToxMod / Two Hat | Community | Community Manager hired; chat system architected |

**Re-evaluation cycle:** At each milestone gate (or every 6 months), reassess:
- Code copilots (Section 4.2.1 methodology)
- Image generation tools (if Firefly pilot is promoted)
- AI NPC dialogue systems (Inworld AI, Charisma.ai — revisit conditions in Section 11)
- UE5 editor AI tools (Aura, UE CoPilot — revisit conditions in Section 4.2.2)

### 18.4 Dependency Map

```
GOVERNANCE (Week 1-4)
├── AI Acceptable Use Policy v1 ──────────────┐
├── Approved Tool List ────────────────────────┤
├── Data Classification ───────────────────────┤
├── Voice AI Prohibition ──────────────────────┤
└── Partner IP Procedures ─────────────────────┤
                                               ▼
PHASE 1 ADOPT (Sprint boundary post-governance)
├── Copilot, MetaHuman, EAC, Atlassian AI ────┐
├── Substance AI, Houdini ML, iZotope (immediate)
└── Firefly PILOT, Cascadeur PILOT ────────────┤
                                               │
HIRES (Parallel, 0-6 months)                   │
├── CTO / DevOps Lead ────────────────────────┐│
├── Animation Lead ───────────────────────────┐││
├── Head of Narrative ────────────────────────┐│││
├── QA Vendor Pipeline ──────────────────────┐││││
└── Data Analyst ───────────────────────────┐│││││
                                            │││││▼
PHASE 2 (3-9 months, hire-dependent)        │││││
├── Custom QA bot infrastructure ◄──────────┘││││
├── Rokoko PILOT ◄───────────────────────────┘│││
├── Narrative AI eval ◄───────────────────────┘││
├── CI/CD AI (TeamCity) ◄──────────────────────┘│
├── Sentry, SonarQube, Incredibuild ADOPT ◄─────┘
├── Machinations ADOPT* (non-AI infrastructure)
└── Promethean AI PILOT

PHASE 3 (9-18 months)
├── memoQ PILOT (content stable)
├── GameAnalytics (Data hire)
├── ToxMod eval (Community hire + chat arch)
├── Self-hosted inference eval (DevOps in place)
└── 6-month re-evaluation cycle begins
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 19. ORGANISATIONAL CHANGE MANAGEMENT

### 19.1 Stakeholder Analysis

| Stakeholder | Role | AI Posture | Strategy |
|---|---|---|---|
| **Aris** | COO | Champion. Actively using AI automations. | Primary executive sponsor. Give him visibility into all AI rollouts. Use his endorsement to normalise AI adoption. |
| **Glen Pryer** | Fractional CPO (NBI) | Champion. Designed this strategy. | Strategic advisor. Not day-to-day owner. Provides governance framework and evaluation methodology. |
| **Sasha Krieger** | Lead Concept/Environment | Opposition. Genuine conviction. | Do not confront. All art AI is voluntary. Fred Dossola is the rollout ally, not Sasha. If Sasha's team voluntarily adopts Firefly, that is success; if they do not, that is also acceptable. Never position AI as threatening to Sasha's role. |
| **Simon Woodruff** | Head of Design | Unknown. Just started. | Defer to his judgement on design tools (Machinations). Present the evaluation; let him decide. Do not assume buy-in or resistance. |
| **Mustafa** | Head of Tech | Passive. Needs forcing in early. | Assign specific, bounded ownership (Copilot rollout, EAC integration). Do not give him strategic AI decisions; those go to Aris until CTO is hired. Pull him into discussions early; do not wait for him to volunteer. |
| **Graham** | Executive Producer | Unreliable. Probationary. | User, not owner. Do not assign AI rollout ownership to Graham. Monitor for over-adoption (using AI tools without following governance) or resistance. |
| **Fred Dossola** | Art Producer | Ally. Incremental approach. | Key rollout partner for art AI. His "orthodontist approach" (gradual, never forced) aligns perfectly with the voluntary adoption strategy for Firefly and Promethean AI. |
| **Hannah** | QA Lead | Overloaded. Receptive but capacity-limited. | Custom bot infrastructure is designed to reduce her burden, not add to it. Engineering/DevOps must handle bot development; Hannah defines test strategy and scenarios. Do not assign her any additional tool management overhead. |
| **Valeria** | Head of Production | Neutral/positive. | Owns Atlassian Intelligence rollout (natural fit). Production tools are the least controversial AI category. |
| **Lorenza** | Head of HR | Solo. Neutral. | HiBob AI features are self-contained. No additional overhead expected. GDPR compliance is the primary concern. |
| **Dino** | General Counsel | Risk-aware. | Owns governance policy drafting (AI Acceptable Use Policy, Voice AI Prohibition, Partner IP Procedures). Critical path for Phase 1. |
| **Lili** | Head of Finance | Not yet in post (1 July). | No AI tools until she is established and has assessed CH's financial infrastructure. |

### 19.2 Communication Plan (Remote-First, Asynchronous)

1. **Announcement (Week 1).** Aris sends a Slack message to #general: "We're rolling out our first AI tools. Here's what's happening, what's approved, and what's not." Link to the AI Acceptable Use Policy. Tone: practical, not hype. No "AI will transform our studio" language.

2. **Discipline-specific briefings (Week 2-3).** Each rollout owner (Mustafa, David Luong, Valeria, Audio Lead) posts in their discipline's Slack channel: what tool is being deployed, how to use it, what's prohibited, who to ask. Include a recorded 5-minute walkthrough video for async consumption.

3. **Monthly AI update (ongoing).** Aris posts a 3-paragraph update in #general: what tools are active, any issues, any new tools entering pilot. No jargon, no metrics. Keep it human.

4. **Anonymous feedback channel.** Create a Slack form or Google Form where any team member can flag AI-related concerns anonymously. Review monthly. This is particularly important for the art team, where Sasha's opposition may be shared by others who feel less empowered to speak.

### 19.3 Training Requirements

| Discipline | Training Needed | Format | Timing |
|---|---|---|---|
| Engineering | Copilot: prompt hygiene, `.copilotignore`, code review of AI suggestions | Recorded video (15 min) + written guide | Phase 1, Week 1 |
| Art | Firefly: approved use cases, attribution metadata, what NOT to input | Recorded video (10 min) + written guide | Phase 1, pilot launch |
| Animation | MetaHuman Animator: iPhone setup, Live Link workflow | Recorded video (10 min) | Phase 1 |
| Audio | iZotope AI mastering, Wwise Sound Search | Written guide (self-serve) | Phase 1 |
| Production | Atlassian Intelligence: NL queries, auto-triage, Rovo agents | Recorded video (10 min) | Phase 1, JIRA deployment |
| QA | Custom bot infrastructure: test scenario definition, bot behaviour scripting, automated triage workflow | Internal guide + DevOps Lead onboarding | Phase 2 |
| All staff | AI Acceptable Use Policy overview | Recorded video (5 min) + policy document | Phase 1, mandatory |

All training is asynchronous (recorded video + written materials). No in-person workshops. All materials stored in Confluence.

### 19.4 Policy Dependencies

| Policy | Owner | Timing | Blocks |
|---|---|---|---|
| AI Acceptable Use Policy v1 | Dino + Aris + Glen | Phase 1, Week 1-4 | All tool deployments |
| Voice AI Prohibition | Dino | Phase 1, Week 1-2 | Audio tool deployment |
| Partner IP Procedures | Dino | Phase 1, Week 1-4 | Any tool processing game content |
| Data Classification | Aris + Mustafa | Phase 1, Week 2-4 | Cloud AI tool deployment |
| Asset Attribution Standard | David Luong | Phase 1, Week 3-6 | Art AI deployment |
| Employee Data AI Policy | Dino + Lorenza | Phase 2 | HiBob AI, SalarySage |
| Player Data Policy | Dino + future CTO | Phase 3 | GameAnalytics, telemetry tools |

### 19.5 General Counsel (GC) Legal Gate — Per-Tool Requirements

Dino (General Counsel) must review and approve the following for every ADOPT and PILOT tool before deployment. This table consolidates the legal requirements that appear in each tool's individual recommendation section.

| Tool | Verdict | DPA Required | No-Training Clause | IP Indemnity | UK IDTA/SCCs | Deletion SLA | Vendor Audit Rights | Steam/SAG Impact | Special Notes |
|---|---|---|---|---|---|---|---|---|---|
| GitHub Copilot Business | ADOPT | Yes | Yes (code snippets) | Microsoft standard | Yes (US-based) | N/A (local processing option) | N/A | No | `.copilotignore` for partner IP |
| Sentry Business | ADOPT | Yes | Verify | Standard | Yes (US-based) | Yes | Verify | No | Error data may contain game state |
| SonarQube Developer | ADOPT | Yes (cloud) / N/A (on-prem) | N/A (on-prem) | N/A | N/A (on-prem recommended) | N/A | N/A | No | On-prem avoids most legal gates |
| Substance 3D AI | ADOPT | Yes (Adobe) | Yes (Firefly training exclusion) | Yes ($10K VIP, $3M ETLA) | Yes (Adobe US) | Standard Adobe terms | Adobe enterprise audit | Pre-Generated if shipped | Existing DPA likely covers |
| MetaHuman Animator | ADOPT | Yes (Epic) | Verify | Epic standard | Yes (Epic US) | N/A (local processing) | N/A | No | Performer data, not voice |
| Atlassian Intelligence / Rovo | ADOPT | Yes | Yes | Atlassian standard | Yes (US-based) | Yes | Atlassian enterprise | No | Employee data in queries |
| iZotope Ozone AI | ADOPT | N/A (fully local) | N/A | N/A | N/A | N/A | N/A | No | No cloud dependency |
| Easy Anti-Cheat | ADOPT* | Yes (Epic) | Verify (player behaviour data) | Epic standard | Yes | Player data retention | Verify | No | Player PII in cheat detection |
| Adobe Firefly Enterprise | PILOT | Yes | Yes (training exclusion) | Yes ($10K-$3M) | Yes | Standard Adobe | Adobe enterprise | Pre-Generated if shipped | Art team voluntary |
| Cascadeur Pro | PILOT | Verify | Verify | Verify | Verify (Russia-origin, now EU entity) | Verify | Verify | No | Jurisdictional due diligence needed |
| modl.ai | WATCH | — | — | — | — | — | — | No | Reclassified: product incompatible with MMO architecture |
| HiBob AI | PILOT | Yes (existing) | Verify AI-specific | N/A (existing) | Existing | Existing DPA | Existing | No | Employee PII, GDPR UK+Greece |
| Machinations | ADOPT* | Yes | Verify | Standard | Yes (EU-based) | N/A (abstract models) | Standard | No | No proprietary data processed |

**Dino should challenge on:** DPA terms and data sub-processor lists; Standard Contractual Clauses / UK International Data Transfer Agreement for US-based APIs; no-training clauses ensuring CH data is not used to improve vendor models; IP indemnity scope and caps; deletion/retention SLAs for proprietary game data; vendor audit rights; and Steam/SAG-AFTRA impact per tool.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 20. BUDGET SUMMARY

### 20.1 Pre-Launch Total (mid-2026 to late 2028, ~28 months)

All figures verified against vendor documentation and pricing pages (14 June 2026). Figures marked [UNVERIFIED] are estimates pending vendor contact; all others are web-verified or derived from verified per-unit pricing.

| Category | ADOPT | PILOT | Infrastructure | Total |
|---|---|---|---|---|
| Engineering | $7,000 (Copilot) + $2,240 (Sentry) = $9,240 | $1,250 (Backtrace) | $5,750 (SonarQube, non-AI) | $16,240 |
| DevOps | — | $1,620-5,520 (TeamCity, conditional) | $7,000-18,400 (Incredibuild, non-AI) | $8,620-23,920 |
| Art | $0 (Substance AI + Houdini ML, existing licences) | $360-19,200 (Firefly) + $261-12,959 (Promethean) = $621-32,159 | — | $621-32,159 |
| Animation | $750 (MetaHuman, iPhones only) | $375-7,875 (Rokoko) + $198 (Cascadeur) = $573-8,073 | — | $1,323-8,823 |
| Audio | $280 (iZotope) | — | $0 (Wwise Sound Search, included in middleware) | $280 |
| Game Design | $2,520 (Machinations) | $0 (Ludo.ai reclassified to WATCH) | — | $2,520 |
| QA | — | $0 (modl.ai reclassified to WATCH; custom bot infrastructure is engineering cost, not tooling) | — | $0 |
| Narrative | — | $3,000-5,000 (memoQ, Phase 3) | — | $3,000-5,000 |
| Production | — | — | $0 (Rovo included in JIRA Premium subscription; no incremental cost) | $0 |
| Marketing | — | — | — | $0 |
| Data | — | — | — | $0 |
| Platform | $0 (EAC, free with UE5) | — | — | $0 |
| HR | — | $500-2,000 (SalarySage) | — | $500-2,000 |
| Finance | — | — | — | $0 |
| AI Infrastructure | — | — | $6,000-25,000 (gateway, data classification, self-hosted eval) | $6,000-25,000 |
| **TOTAL** | **$12,790** | **$7,564-54,002** | **$18,750-49,150** | **$39,104-115,942** |

**Conservative scenario** (pilots at minimum spend): **~$39,000 / £29,000**
**Moderate scenario** (pilots promoted at mid-range): **~$85,000 / £64,000**
**Full scenario** (all pilots promoted at high-end pricing): **~$116,000 / £87,000**

Note: Custom bot infrastructure for QA (the recommended alternative to modl.ai) is an engineering salary cost (~£30,000-50,000 for 1 engineer × 6 months), not a tooling budget line item. It is excluded from the above because it produces a permanent capability asset with no recurring licence fees. If CH evaluates modl.ai at the Q1 2027 revisit and the product has evolved, the pilot cost would be additive to these figures.

### 20.2 Post-Launch Annual (assuming moderate pilot promotions)

| Category | Estimated Annual | Verification Status |
|---|---|---|
| Engineering | $3,420 (Copilot) + $960 (Sentry) + $5,000-15,000 (SonarQube) + $5,000-15,000 (Backtrace, if promoted) | Copilot/Sentry verified; SonarQube/Backtrace vendor-dependent |
| DevOps | $3,000-8,000 (Incredibuild) + $2,399-6,480 (TeamCity) | [UNVERIFIED] Incredibuild custom pricing |
| Art | $2,880-9,600 (Firefly, 10 seats at $24-80/mo verified) + $2,088-6,480 (Promethean, 6 seats at $29-90/mo verified) | Verified |
| Animation | $2,000 (Rokoko) + $1,584 (Cascadeur) | Verified |
| Audio | $120-240 (iZotope, verified) | Verified |
| Game Design | $1,080 (Machinations) | Machinations pricing unverified; Ludo.ai reclassified to WATCH |
| QA | $0 (custom bot infrastructure: engineering salary cost, not tooling) | N/A |
| Narrative (localisation) | $20,000-50,000 (memoQ + translators) | Range estimate |
| Production | $0 (Rovo included in JIRA Premium; no incremental cost) | Verified |
| Marketing (community mod) | $10,000-50,000 (ToxMod/Two Hat, when adopted) | Range estimate |
| Data | $0-24,000 (GameAnalytics, when adopted) | Verified free tier |
| HR | $500-2,000 (SalarySage) | [UNVERIFIED] |
| **TOTAL** | **$55,031-195,844** | |

### 20.3 Cost Avoidance / Efficiency Gains Estimate

| Tool | Efficiency Claim | Source | Equivalent Headcount |
|---|---|---|---|
| GitHub Copilot | 55% faster task completion (GitHub/Microsoft, 2023; arXiv:2302.06590 — measured on a specific task: building an HTTP server in JavaScript, not representative of MMO/engine/networking code) | Verified study exists; applicability to C++/UE5/MMO development is unproven | 2-3 equivalent FTE at CH's scale (optimistic; actual gains require measurement) |
| Custom QA bots | Continuous automated regression across all server profiles | Engineering estimate; actual coverage depends on bot sophistication | 5-10 QA testers ($200K-600K/year) |
| Incredibuild | 70-85% build time reduction | Vendor claim; widely corroborated by user reports | Cannot be replicated by headcount |
| Atlassian Intelligence | Productivity improvement for project management | General claim; no CH-specific measurement exists | 0.5-1 equivalent producer FTE (estimate) |
| Substance 3D AI | Faster standard texture creation | No independent benchmark; estimate based on tool capability | 1-2 equivalent texture artist FTE (estimate) |

Note: All efficiency estimates are either vendor-sourced, consultant estimates, or derived from studies conducted in contexts materially different from MMO development. GitHub Copilot's 55% figure specifically measured completion time for a controlled JavaScript task (implementing an HTTP server), not C++/UE5 gameplay code, networking, build systems, or the complex multi-file refactoring typical of game engine work. CH should establish baseline productivity metrics before tool deployment and measure actual impact at the 90-day review. Do not use these figures in board presentations without the caveat that they are directional, not predictive.

### 20.4 AI Spend vs Equivalent Headcount

At the moderate scenario (~$85,000 pre-launch over 28 months, ~$3,000/month), CH's total AI tooling spend is less than 1 junior developer salary. The tools aim to deliver productivity gains across engineering and art, but efficiency claims are largely unverified at CH's specific scale and should be measured, not assumed. The QA automation gap is an engineering investment (custom bot infrastructure, ~£30K-50K salary cost), not a tooling purchase.

### 20.4a Implementation Cost Estimate (Non-Licence)

The licence budget above covers only subscription/vendor spend. Actual total cost of ownership includes:

| Category | Estimate | Basis |
|----------|----------|-------|
| Training production (videos, guides) | $3,000-5,000 | 8 recorded sessions × ~$400-600 production cost |
| Productivity dip during adoption | $15,000-25,000 | ~2 weeks reduced output across 20 affected staff |
| Governance policy drafting (Dino + external legal) | $5,000-15,000 | 5 policies × 10-30 hours external counsel |
| IT administration (procurement, licence management) | $2,000-4,000 | Aris/Mustafa overhead, vendor negotiations |
| Pilot evaluation overhead (90-day reviews) | $3,000-6,000 | 9 pilots × 3-5 hours evaluation per pilot |
| Change management (comms, resistance handling) | $2,000-4,000 | Production team time, all-hands sessions |
| **Total implementation overhead** | **$30,000-59,000** | **~35-50% of moderate licence spend** |

These figures are estimates based on CH's salary bands and studio size. The governance and legal costs are the least elastic (Dino's time is committed regardless). Training and change management scale with the number of tools deployed in each phase. CH should budget implementation overhead as a line item alongside licence costs, not as an afterthought.

### 20.5 Currency Note

All figures in USD. GBP equivalents at an indicative rate of 1 USD = 0.75 GBP (spot rate week of 14 June 2026; YTD 2026 average ~0.74):
- Conservative: ~$39,000 / £29,000
- Moderate: ~$85,000 / £64,000
- Full: ~$116,000 / £87,000

GBP figures are indicative and subject to FX movement over the 2+ year pre-launch window. USD is the primary reference currency. A 28-month budget window makes point-in-time FX unreliable; CH should convert at prevailing rate when procurement decisions are made.

**VAT treatment:** All figures are pre-VAT. UK-invoiced tools attract 20% VAT (reclaimable for VAT-registered entities; CH Game Development UK Ltd is VAT-registered). US SaaS subscriptions (GitHub, Atlassian, Adobe, Sentry) are reverse-charged under B2B rules with no cash impact. No VAT adjustment is needed for budget planning purposes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 21. RISK REGISTER

| # | Risk | L | I | Score | Owner | Mitigation | Residual Risk |
|---|---|---|---|---|---|---|---|
| 1 | **Community backlash over AI art/content.** Players detect or suspect AI-generated content in shipped game, triggering review-bombing and negative press. | 4 | 5 | 20 | David Luong / Aris | AVOID shipped AI art (Section 6.2.3). Human-authored narrative. Proactive disclosure. Public positioning on AI use. | Detection of AI-assisted ideation references in shipped art (low impact if handled transparently). |
| 2 | **SAG-AFTRA/Equity action over AI voice.** Union files grievance or threatens action over AI voice use, real or perceived. | 3 | 5 | 15 | Dino | Voice AI Prohibition Policy (Phase 1). All voice contracts include AI clauses. Zero tolerance for synthetic voice in any build. | Perception risk: a competitor's voice AI controversy could generate questions about CH even if CH is compliant. |
| 3 | **Partner IP leaked through AI tools.** Partner game IP (quests, assets, references) processed through cloud AI tool, violating contractual obligations. | 3 | 5 | 15 | Dino / Mustafa | Data classification. `.copilotignore`. Partner IP exclusion in all AI tool configs. Usage policy. | Human error: a developer accidentally pastes partner IP into an AI chat prompt. Training mitigates but cannot eliminate. |
| 4 | **No CTO delays AI infrastructure.** Strategic AI decisions (self-hosted vs cloud, data architecture, tool standardisation) stall without a technology leader. | 4 | 4 | 16 | Aris (interim) | Assign strategic AI decisions to Aris + Glen until CTO hired. Phase 1 tools require no infrastructure decisions. Accelerate CTO search. | Phase 2-3 tools are delayed; CH falls behind on infrastructure readiness. |
| 5 | **QA capacity collapse.** Hannah (sole QA) cannot absorb testing workload; QA vendor pipeline delays compound the problem; bot infrastructure build delayed by DevOps vacancy. | 4 | 4 | 16 | Aris / Mustafa | Hire DevOps Lead (gates bot infrastructure). Hannah defines strategy only. Accelerate QA vendor pipeline. Bot infrastructure scoped to reduce her load, not add to it. | If QA vendor pipeline stalls and DevOps hire is delayed, CH ships with a testing deficit that no tool or process can solve. |
| 6 | **AI governance not ready for Series B due diligence.** Investors ask about AI governance during $10M raise; CH cannot demonstrate a documented, defensible position. | 3 | 4 | 12 | Aris / Glen | This report is a due diligence asset. Complete governance prerequisites in Phase 1 (0-3 months). Document all AI adoption decisions with rationale. | Governance policy quality depends on Dino's capacity and external legal input. |
| 7 | **Art team talent loss.** Sasha or other artists leave CH over AI adoption, citing ethical objections. | 2 | 4 | 8 | David Luong / Fred | Voluntary-only adoption. No forced AI tools. Anonymous feedback channel. Fred's incremental approach. If Sasha objects, respect the objection. | If Sasha leaves for unrelated reasons, her departure may be attributed to AI policy, creating negative narrative. |
| 8 | **AI tool vendor instability.** A key AI tool vendor (Inworld, Promethean, Cascadeur) shuts down, pivots, or changes pricing dramatically during CH's pre-launch development. modl.ai already pivoted from SDK-based to black-box testing (demonstrating this risk). | 3 | 3 | 9 | Aris | Avoid vendor lock-in. Use tools that export standard formats (FBX, WAV, JSON). 6-month re-evaluation cycle. No tool should be a single point of failure for shipping the game. Build core capabilities (QA bots, anti-cheat) internally where possible. | Some migration cost if a vendor exits; mitigated by standard data formats. |
| 9 | **Over-reliance on AI tools degrades team skills.** Engineers accept Copilot suggestions without review; artists lose manual texturing skills; QA relies on bots and misses edge cases bots cannot find. | 3 | 3 | 9 | Discipline leads | Code review standards apply to AI-generated code. Hero assets must be hand-authored. Hannah maintains manual testing alongside AI bots. 6-month skill assessment. | Gradual skill erosion is difficult to detect until a crisis (e.g., AI tool outage reveals team cannot work without it). |
| 10 | **GDPR violation through AI processing of employee data.** Employee PII (CVs, salary, performance reviews) processed through AI tools without proper GDPR-compliant DPA, triggering ICO investigation. | 2 | 5 | 10 | Lorenza / Dino | Employee data AI processing policy. DPAs with all HR AI vendors. GDPR-compliant data processing agreements. Anonymise where possible. | Lorenza is solo; HR AI policy may be deprioritised relative to operational HR needs. |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 22. APPENDICES

### Appendix A: Full Tool Inventory

All tools evaluated in this report, including those not recommended:

| Tool | Discipline | Composite | Verdict |
|---|---|---|---|
| Easy Anti-Cheat | Platform | 8.7 | ADOPT* (infrastructure) |
| MetaHuman Animator | Animation | 8.5 | ADOPT |
| Wwise Sound Search | Audio | 8.4 | ADOPT (conditional) |
| Atlassian Intelligence | Production | 8.3 | ADOPT |
| iZotope Ozone AI | Audio | 8.1 | ADOPT |
| GitHub Copilot Business | Engineering | 7.9 | ADOPT |
| Sentry Business | Engineering | 7.8 | ADOPT |
| Substance 3D AI | Art | 7.7 | ADOPT |
| Machinations | Game Design | 7.6 | ADOPT* (non-AI infrastructure) |
| memoQ Gaming | Localisation | 7.6 | PILOT (Phase 3) |
| Backtrace | Engineering | 7.5 | PILOT |
| Houdini ML | Art | 7.4 | ADOPT |
| HiBob AI | HR | 7.3 | PILOT |
| Rokoko Studio AI | Animation | 7.3 | PILOT |
| Firefly Enterprise | Art | 7.3 | PILOT |
| SonarQube Developer | Engineering | 7.3 | ADOPT* (non-AI at Developer tier) |
| modl.ai | QA | 5.1 | WATCH |
| Ludo.ai | Game Design | 6.5 | WATCH |
| ToxMod | Marketing | 7.2 | WATCH |
| Tabnine Enterprise | Engineering | 7.1 | WATCH |
| SalarySage | HR | 7.0 | PILOT (COI flagged) |
| Qodana | Engineering | 7.0 | Alternative |
| Phrase TMS | Localisation | 7.0 | Alternative |
| Cascadeur Pro | Animation | 6.9 | PILOT |
| Cursor Business | Engineering | 6.9 | WATCH |
| FASTBuild | DevOps | 6.9 | Alternative |
| Two Hat | Marketing | 6.9 | WATCH |
| GameAnalytics | Data | 7.2 | WATCH |
| Incredibuild | DevOps | 6.8 | ADOPT* (infrastructure) |
| GameRefinery | Game Design | 6.8 | WATCH |
| Promethean AI | Art | 6.7 | PILOT |
| PagerDuty AIOps | DevOps | 6.7 | WATCH |
| Datadog AI | DevOps | 6.7 | WATCH |
| Luminance | Finance | 6.7 | WATCH |
| TeamCity AI | DevOps | 6.6 | PILOT (conditional) |
| InstaMAT | Art | 6.5 | WATCH |
| axe DevTools | QA | 6.5 | WATCH |
| Brandwatch | Marketing | 6.4 | WATCH |
| Aura Pro | Engineering | 6.4 | WATCH |
| SD XL (self-hosted) | Art | 6.3 | WATCH |
| Inworld AI | Narrative | 6.2 | WATCH |
| DeepMotion | Animation | 6.2 | WATCH |
| Audio2Face | Animation | 6.2 | WATCH |
| Harvey AI | Finance | 6.2 | WATCH |
| UE CoPilot | Engineering | 6.1 | WATCH |
| Midjourney | Art | 6.1 | WATCH |
| LANDR | Audio | 6.1 | WATCH |
| Charisma.ai | Narrative | 6.0 | WATCH |
| Move.ai | Animation | 6.0 | WATCH |
| Mixpanel AI | Data | 6.1 | WATCH |
| Harness AI | DevOps | 5.8 | WATCH |
| ElevenLabs SFX | Audio | 5.5 | WATCH |
| AIVA | Audio | 5.4 | WATCH |
| Convai | Narrative | 5.3 | WATCH |
| Soundraw | Audio | 5.2 | WATCH |
| Plask | Animation | 5.2 | WATCH |
| Forecast.app | Production | 5.0 | WATCH |
| Meshy | Art | 4.5 | AVOID |
| Voice AI (all) | Audio | N/A | AVOID |

Total tools evaluated: 54. Genuine AI ADOPT: 8 (Copilot, Sentry, Substance AI, Houdini ML, MetaHuman Animator, Wwise Sound Search, iZotope Ozone, Atlassian Intelligence). Infrastructure ADOPT*: 4 (EAC, Incredibuild, SonarQube Developer, Machinations — classified as non-AI or borderline-AI infrastructure). PILOT: 9. WATCH: 33 (incl. modl.ai, reclassified from PILOT due to product incompatibility with MMO architecture). AVOID: 2 categories. Alternative: 3.

### Appendix B: Vendor Comparison Matrix

For fast-moving categories, the 6-month re-evaluation methodology (Section 4.2.1) supersedes static vendor comparisons. The scoring rubric in Section 1 is the durable evaluation framework; apply it to any new vendor at the re-evaluation gate.

### Appendix C: Governance Backlog Priority Map

**Phase 1 Prerequisites (must complete first):**
1. AI Acceptable Use Policy v1 (Usage Policy & Governance)
2. Voice AI Prohibition Policy (Usage Policy & Governance)
3. Approved Tool List (Tool Selection & Licensing)
4. Partner IP Handling Procedures (IP Safeguards)
5. Source Code Data Classification (IP Safeguards)

**Phase 1-2 (complete during early adoption):**
6. Developer AI Training Guidelines (Training & Education)
7. AI-Assisted Concept Art Guidelines (Production Integration)
8. Asset Attribution Metadata Standard (Production Integration)
9. Vendor Security Review Process (Tool Selection & Licensing)

**Phase 2-3 (complete before advanced adoption):**
10. Employee Data AI Processing Policy (IP Safeguards)
11. Build Data Classification for AI Testing (IP Safeguards)
12. Localisation Vendor DPA (IP Safeguards)
13. Marketing Content AI Policy (Usage Policy & Governance)
14. Player Data Handling Policy (IP Safeguards)

**Remaining governance backlog items** (~126 of 140) should be prioritised by the CTO and Dino based on the adoption roadmap. Items not gating a Phase 1-3 tool can be addressed in the normal governance cadence.

### Appendix D: Glossary of Terms

| Term | Definition |
|---|---|
| ADOPT | Roll out immediately; tool is mature, ROI is defensible, CH has capacity |
| PILOT | Time-boxed trial with defined scope, duration, and success criteria |
| WATCH | Not ready; specific conditions must change before reconsideration |
| AVOID | Risk outweighs benefit; explicit recommendation against adoption |
| DPA | Data Processing Agreement (GDPR requirement for cloud data processing) |
| DCC | Digital Content Creation (tool category: Maya, ZBrush, Houdini, etc.) |
| EAC | Easy Anti-Cheat (Epic Games' anti-cheat solution) |
| FBX | Filmbox format (standard 3D asset interchange format) |
| GDPR | General Data Protection Regulation (EU/UK data protection law) |
| GDD | Game Design Document |
| IP | Intellectual Property |
| LUFS | Loudness Units relative to Full Scale (audio loudness standard) |
| ML | Machine Learning |
| MMO | Massively Multiplayer Online (game genre) |
| NPC | Non-Player Character |
| PBR | Physically Based Rendering (material/texture standard) |
| PCG | Procedural Content Generation |
| SAG-AFTRA | Screen Actors Guild / American Federation of Television and Radio Artists |
| SFX | Sound Effects |
| TM | Translation Memory (localisation technology) |
| TTS | Text-to-Speech |
| UE5 | Unreal Engine 5 |
| WCAG | Web Content Accessibility Guidelines |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Appendix E: Per-Unit Budget Detail (Auditable Line Items)

All ADOPT and PILOT tools with their verified or estimated per-unit costs. This appendix provides the calculation basis for Section 20 totals.

**Currency:** All figures in USD unless noted. GBP conversion at 1 USD = 0.75 GBP (spot rate week of 14 June 2026).
**VAT:** UK VAT (20%) applies to all software purchases by CH Game Development UK Ltd. Figures below are pre-VAT unless marked. CH should budget +20% for UK-invoiced tools; US-based SaaS is typically reverse-charged (no UK VAT on B2B supply from US).
**Pre-launch period:** ~28 months (July 2026 to October 2028).

| Tool | Verdict | Tier | Seats | Unit Price | Billing | Verified? | Pre-Launch Calc | Pre-Launch Total | Recurring |
|---|---|---|---|---|---|---|---|---|---|
| GitHub Copilot Business | ADOPT | Business | 15 | $19/seat/month | Monthly | Yes (GitHub pricing page) | 15 × $19 × 28 | $7,980 | Yes |
| Sentry Business | ADOPT | Business | Team plan | ~$80/month | Monthly | Estimated (team plan) | $80 × 28 | $2,240 | Yes |
| SonarQube Developer | ADOPT* | Developer | 100K-1M LoC | $2,500-15,000/year | Annual | Yes (SonarQube pricing) | $2,500 × 2.3 yrs | $5,750 | Yes |
| Substance 3D AI | ADOPT | Teams (existing) | 15 | $0 incremental | N/A | Yes (included in CC) | $0 | $0 | N/A |
| Houdini ML | ADOPT | Existing licence | — | $0 incremental | N/A | Yes (included) | $0 | $0 | N/A |
| MetaHuman Animator | ADOPT | Free | — | $0 (hardware: ~$750) | One-off | Yes (Epic, free) | $750 (iPhone) | $750 | No |
| Wwise Sound Search | ADOPT | Pro/Premium | — | $0 (built-in feature) | N/A | Yes (Audiokinetic) | $0 | $0 | N/A |
| iZotope Ozone AI | ADOPT | Standard | 1 | $9.99/month | Monthly | Yes (iZotope pricing) | $10 × 28 | $280 | Yes |
| Easy Anti-Cheat | ADOPT* | Free (UE5) | — | $0 | N/A | Yes (Epic, free with UE5) | $0 | $0 | N/A |
| Incredibuild | ADOPT* | Enterprise | 12 eng | Custom | Annual | No — VENDOR CONTACT | Estimated $7,000-18,400 | $7,000-18,400 | Yes |
| Atlassian Rovo | ADOPT | Included | — | $0 (included in JIRA Premium) | — | Yes (Atlassian support docs) | $0 | $0 | N/A |
| Machinations | ADOPT* | Paid | 3 | ~$30/seat/month (est.) | Monthly | No — VENDOR CONTACT | 3 × $30 × 28 | $2,520 | Yes |
| Adobe Firefly Enterprise | PILOT | CC Add-on | 5 (pilot) | $24/user/month | Monthly | Yes (Adobe pricing) | 5 × $24 × 3 | $360 | If promoted |
| Adobe Firefly (if promoted) | — | CC Add-on | 10 | $24/user/month | Monthly | Yes | 10 × $24 × 24 | $5,760 | Yes |
| Cascadeur Pro | PILOT | Pro subscription | 2 | $33/month | Monthly | Yes (Cascadeur pricing) | 2 × $33 × 3 | $198 | If promoted |
| Promethean AI | PILOT | Indie (pilot) | 3 | $29/month | Monthly | Yes (verified June 2026) | 3 × $29 × 3 | $261 | If promoted |
| Promethean AI (if promoted) | — | Pro | 6 | $89.99/month | Monthly | Yes (verified June 2026) | 6 × $90 × 24 | $12,959 | Yes |
| modl.ai | WATCH | — | — | — | — | N/A (reclassified) | $0 | $0 | N/A |
| Rokoko Studio AI | PILOT | Plus (software) | 2 | ~$25/month (est.) | Monthly | Estimated | 2 × $25 × 3 + hardware | $375-7,875 | If promoted |
| HiBob AI | PILOT | Existing plan | 1 (Lorenza) | $0 incremental (est.) | N/A | No — VENDOR CONTACT | $0 | $0 | N/A |
| SalarySage (NBI) | PILOT | Standard | — | $500-2,000/year | Annual | No — VENDOR CONTACT | ~$1,000/yr × 2.3 | $500-2,000 | Yes |

**Notes:**
1. "Verified" means the unit price was confirmed via vendor website, documentation, or pricing page as of June 2026.
2. Tools marked "VENDOR CONTACT" require direct vendor engagement to obtain accurate pricing. Pre-launch estimates for these tools should not appear in board-facing financial projections without vendor confirmation.
3. GitHub Copilot: this appendix shows the full 15-seat cost ($7,980). Section 20.1 uses a phased deployment estimate of $7,000 reflecting 12 initial engineering seats ramping to 15 with technical designers. Actual seat count and deployment timeline should be confirmed with Mustafa.
4. Sentry Business pricing is estimated based on team-tier plans; actual cost depends on event volume.
5. Post-pilot promotion costs are shown separately; they are included in Section 20 moderate/full scenarios but not the conservative scenario.
6. Atlassian Rovo: $0 incremental cost. Rovo Search, Chat, and Agents are included in all paid JIRA/Confluence subscriptions as of June 2026. Previous $20/user/month pricing applied to Rovo Dev (a separate coding product), not the production AI features. modl.ai: $0 — reclassified to WATCH due to product incompatibility with MMO architecture (black-box visual testing tool, not engine-integrated bot simulation).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Report prepared by NBI Analytics Ltd. All scoring subject to multi-pass review and independent verification. Team Adoption Risk scores are estimates pending stakeholder validation. Where production citations or pricing could not be independently verified, the report discloses this: production citation gaps are marked with "(no independent production citation found, June 2026)" and pricing gaps requiring vendor engagement are marked with "[VENDOR CONTACT REQUIRED: ...]". All verified pricing figures are sourced from vendor websites, documentation, or confirmed communications as of June 2026.*