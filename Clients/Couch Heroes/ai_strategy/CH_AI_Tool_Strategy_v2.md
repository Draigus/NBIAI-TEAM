COUCH HEROES: AI TOOL STRATEGY & DECISION BRIEF

Prepared for: CH Game Development UK Ltd, C-Suite & Technical Leadership
Prepared by: NBI Analytics Ltd
Date: 14 June 2026
Classification: Confidential; Internal + NBI Advisory
Version: 2.0



## EXECUTIVE SUMMARY

Couch Heroes should immediately adopt MetaHuman Animator for all facial animation work, which reduces facial capture-to-game time by an estimated 50-70% at zero licensing cost (included with Unreal Engine 5). This is the only tool in the evaluation that warrants full rollout once minimum governance (AI Acceptable Use Policy v1) is in place: it is free, proven in AAA production (Fortnite, Senua's Saga, The Matrix Awakens), poses no IP or union risk, and integrates natively with CH's engine. The studio should simultaneously begin time-boxed pilots of Machinations (economy simulation, proven at Ubisoft and Gameloft) and modl.ai (AI playtesting), which address CH's two most acute production constraints: economy design complexity for an MMO and a single QA resource.

The studio should explicitly avoid AI-generated imagery in public-facing marketing materials and Soundraw for music composition. AI marketing imagery carries material reputational risk: multiple studios were review-bombed in 2024-2026 after community detection of AI-generated promotional content, and MMO communities are hypersensitive to perceived inauthenticity. Soundraw lacks IP indemnification, has no production evidence, and offers capability inferior to a human composer at comparable cost.

**Evaluation scope:** 32 tools evaluated across 14 disciplines covering every function involved in building and operating an MMO studio.

| Verdict | Count | Meaning |
|---------|-------|---------|
| ADOPT | 1 | MetaHuman Animator (Animation) |
| PILOT | 10 | Rokoko, Cascadeur, Adobe Firefly, Substance 3D AI, Wwise Sound Search, ElevenLabs SFX, Aura, Machinations, Ludo.ai, modl.ai |
| WATCH | 19 | Tools not ready for CH due to maturity, timing, vendor risk, or organisational readiness |
| AVOID | 2 | AI marketing imagery, Soundraw |

**Budget:**

| Period | USD | GBP (indicative, at 0.79) |
|--------|-----|--------------------------|
| Pre-launch total (mid-2026 to late 2028) | ~$91,040-$93,920 | ~£71,920-£74,200 |
| Post-launch annual | ~$41,220-$42,660 + TBD | ~£32,560-£33,700 + TBD |

The entire pre-launch AI tooling budget is less than one full-time employee. The primary cost is modl.ai at ~$60,000 (estimated; confirm with modl.ai), representing ~65% of the total.

**Top 3 strategic recommendations:**

1. **Hire a CTO.** Six of fourteen disciplines are blocked by the absence of a CTO. No engineering, DevOps, platform, or infrastructure AI decision can be made until this role is filled. This is the single highest-impact action for AI adoption, and it is a people decision, not a technology decision.
2. **Complete governance prerequisites before rolling out any tool.** The AI Acceptable Use Policy v1, data classification framework, and Steam AI disclosure position must be in place within 30 days of this report's delivery. Without governance, tool adoption is informal and uncontrolled, and a Series B due diligence question waiting to fail.
3. **Hire a data lead.** Analytics, churn prediction, economy monitoring, and anti-cheat data infrastructure are all blocked. An MMO without data capability at launch is an MMO that cannot detect economy exploits, measure player retention, or optimise LiveOps. This is the second highest-priority hire after CTO.

**Top 3 risks:**

1. **No CTO** (risk score 20/25): blocks 6 of 14 disciplines from progressing beyond WATCH.
2. **No data team** (risk score 20/25): CH launches an MMO unable to monitor its own economy or player health.
3. **Economy exploits undetected at launch** (risk score 20/25): without fraud detection infrastructure, MMO economies are exploited within days.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## DECISION DASHBOARD

This dashboard summarises every task and recommendation from the full analysis. Vardis reads this and the Executive Summary; Mustafa reads the full discipline sections. One row per task; no scores or technical detail.

### Animation (Section 5): Pre-Launch: ~$8,984

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| Body motion capture | Rokoko Smartsuit Pro II + Studio | PILOT | ~$7,400 (2 suits + software) | Animation lead instability; backfill must own evaluation |
| Facial animation | MetaHuman Animator (Epic) | ADOPT | $0 (free with UE5) | Requires iPhone with TrueDepth camera per capture station |
| Keyframe animation (combat) | Cascadeur (Nekki) | PILOT | ~$1,584 (2 Pro seats x 24 months) | UE5 Live Link released (2026.1); FBX round-trip also available |
| Procedural NPC/crowd animation | No specialist AI tool | N/A | $0 | UE5 built-in (Motion Matching, Crowd Manager) |

### Art Pipeline (Section 6): Pre-Launch: ~$14,400

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| Concept art ideation | Adobe Firefly Enterprise | PILOT | ~$14,400 (5 CC seats x 24 months; likely $0 marginal if existing CC covers Firefly) | Art team resistance (Sasha); voluntary rollout only |
| Texturing & material creation | Substance 3D AI features | PILOT | $0 marginal (included in existing Substance licence) | AI features new; no studio confirmed shipping with them |
| 3D model generation | Meshy | WATCH | $0 | Art team resistance; no AAA production citation |
| Procedural content/VFX | Houdini ML features | WATCH | $0 | ML features too new for production reliance |
| Environment layout | Promethean AI | WATCH | $0 | Company stability risk (3 employees, pivot concerns) |

### Audio (Section 7): Pre-Launch: ~$2,376

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| SFX search & creation | Wwise Similar Sound Search | PILOT (conditional) | $0 marginal (included in Wwise licence) | Conditional on CH selecting Wwise as middleware |
| SFX generation | ElevenLabs Sound Effects | PILOT | ~$2,376 (1 Pro seat x 24 months) | No shipped game confirmed; general-purpose SFX |
| Music composition | AIVA (WATCH) / Soundraw (AVOID) | WATCH / AVOID | $0 | Hire a composer; AI music is not a substitute |
| Audio mastering | iZotope Ozone / LANDR | WATCH / WATCH | $0 | iZotope parent company insolvency |

### Engineering (Section 8): Pre-Launch: ~$2,880

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| UE5 code generation | Aura (TryAura.dev) | PILOT | ~$2,880 (3 Pro seats x ~10 months beta) | Tool <6 months old; thin production evidence |
| Code review & debugging | UE CoPilot (BlueprintsLab) | WATCH | $0 | No named studio confirmed |
| Code assistant (fast-moving) | Evaluation methodology provided | N/A | N/A | Re-evaluate every 6 months using report rubric |

### DevOps & Infrastructure (Section 9): Pre-Launch: $0

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| CI/CD build failure analysis | TeamCity AI Build Analyzer | WATCH | $0 | Entire discipline premature; no CTO, no DevOps |
| Infrastructure/incident response | No specialist AI tool | N/A | $0 | Custom engineering; CTO hire required first |

### Game Design (Section 10): Pre-Launch: ~$2,400-$5,280

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| Economy balancing & simulation | Machinations | PILOT | ~$1,200-$3,480 | Borderline criterion (simulation, not ML) |
| Game research & market analysis | Ludo.ai | PILOT | ~$1,200-$1,800 | Studio tier pricing may be needed for full features |
| Environment/level design | Promethean AI (cross-ref Sec. 6) | WATCH | $0 | Company stability risk |
| AI playtesting for balance | modl.ai (cross-ref Sec. 11) | PILOT (contingent) | See QA budget | See QA section |

### QA & Testing (Section 11): Pre-Launch: ~$60,000 (estimated)

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| Automated gameplay testing | modl.ai | PILOT (contingent) | ~$60,000 (estimated; confirm with modl.ai) | Contingent on QA expansion; Hannah cannot absorb alone |
| Accessibility compliance | No specialist AI tool | N/A | $0 | Manual audit with platform guidelines; vendor QA |

### Narrative & Localisation (Section 12): Pre-Launch: $0

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| AI NPC dialogue | Inworld / Charisma / Convai | ALL WATCH | $0 | Category leader (Inworld) broadened beyond game-specific NPC tooling |
| Quest & dialogue drafting | No specialist AI tool | N/A | $0 | Hire Head of Narrative first; LLMs for drafts only |
| Localisation | memoQ / Phrase TMS | WATCH (Year 2+) | $0 | Premature; evaluate competitively mid-2027 |

### Production & PM (Section 13): Pre-Launch: $0

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| Scheduling & risk prediction | Jira AI / Rovo (enable existing) | Enable | $0 marginal | AI suggestions are inputs to judgement, not decisions |
| Meeting summarisation | General-purpose LLM (existing) | Use existing | $0 marginal | Data classification needed for sensitive meetings |

### Marketing & Community (Section 14): Pre-Launch: $0

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| Community moderation | ToxMod / GGWP | WATCH | $0 | No live community yet; evaluate at beta planning |
| Marketing imagery/video | AI-generated content | AVOID | $0 | Community backlash; review-bombing risk |
| Social listening | No specialist AI tool | N/A | $0 | Premature; no launched product to monitor |

### Data & Analytics (Section 15): Pre-Launch: $0

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| Player analytics & churn | No specialist AI tool | N/A | $0 | Zero data headcount; data lead hire is CRITICAL |
| Economy monitoring | Custom engineering (cross-ref Sec. 10) | N/A | $0 | No player data until alpha/beta |

### HR & People (Section 16): Pre-Launch: $0

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| Candidate screening | No specialist AI tool recommended | N/A | $0 | GDPR Article 22 + EU AI Act barriers at CH's scale |

### Finance & Legal (Section 17): Pre-Launch: $0

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| Contract analysis | Luminance / Harvey | WATCH / WATCH | $0 | Too expensive for single in-house counsel |
| Financial/compliance/IP | No specialist AI tool | N/A | $0 | Lili starts July; assess finance stack first |

### Platform & Backend (Section 18): Pre-Launch: $0

| Task | Recommended Tool | Verdict | Pre-Launch Cost | Key Risk |
|------|-----------------|---------|----------------|----------|
| Anti-cheat (behavioural) | Anybrain | WATCH | $0 | No CTO; game 2+ years from needing anti-cheat |
| Fraud detection | No specialist AI tool | N/A | $0 | Custom engineering; data lead + CTO required |
| Matchmaking/scaling/incident | No specialist AI tool | N/A | $0 | Custom engineering; all CTO-dependent decisions |

---

**Dashboard Totals:** 32 tools evaluated across 14 disciplines. **1 ADOPT, 10 PILOT, 19 WATCH, 2 AVOID.** Pre-launch AI tooling budget: **~$91,040-$93,920** (dominated by modl.ai QA at ~$60,000 (estimated)).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## HOW TO USE THIS DOCUMENT

This is a decision-making tool, not a report to read and file. Each discipline section is self-contained; a Head of Animation can go directly to Animation, see every AI tool available for their craft, and make a go/no-go decision based on:

- **Company profile:** Who makes it, how long they've been in business, are they stable
- **Production evidence:** Which games shipped with it, which studios use it, what users actually say
- **Scoring:** Six-dimension composite on a 1-10 scale with transparent calculation
- **Productivity impact:** Estimated time savings with honest uncertainty (~X%)
- **Verdict:** ADOPT / PILOT / WATCH / AVOID with specific rationale for CH
- **Cost:** Verified pricing at CH's scale

**What this document is NOT:**
- A generic "AI in gaming" thought piece
- A vendor sales pitch; every recommendation must survive "has this actually shipped in a game?"
- A forecast of what tools might do in 2028; recommendations are based on current capability
- A policy document; AI governance is a separate workstream

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## AGGREGATE VALUE ESTIMATE

**Total pre-launch AI tooling budget (mid-2026 to late 2028):** ~$91,040-$93,920 (~£71,920-£74,200)
**Total post-launch annual:** ~$41,220-$42,660 + TBD moderation and anti-cheat (~£32,560-£33,700 + TBD)

This is less than one full-time employee over the same period. The top three productivity impacts are: MetaHuman Animator (~50-70% reduction in facial animation capture/cleanup time, $0 cost), Machinations (~34% reduction in economy design iteration time, proven at Gameloft and Ubisoft), and modl.ai (~10,000+ simulated play-hours per QA cycle, freeing the sole QA resource for manual testing). Estimated gains are not guaranteed savings; they represent time freed for higher-value creative work. See Section 21.3 for the full efficiency gains table and Section 21.4 for headcount comparison.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 1. METHODOLOGY & SCORING

### Scoring Dimensions (6-dimension rubric, weighted composite)

| Dimension | Weight | What it measures | Anchor: 10 | Anchor: 1 |
|---|---|---|---|---|
| **Capability Fit** | 25% | How well does this tool solve CH's specific problem (UE5, MMO scale, cosy byte-punk aesthetic)? | Purpose-built for this exact use case and engine | Fundamentally mismatched |
| **Production Readiness** | 20% | Has this tool been used in a game that actually launched? | Shipped in AAA title, 1M+ units, 3+ years in production | Research prototype, no commercial release |
| **IP/Legal Safety** | 20% | Training data provenance, output ownership, GDPR, indemnification, platform disclosure | Fully licensed data, IP indemnification, GDPR-compliant | Known copyright infringement, vendor claims output licence |
| **Team Adoption Risk** | 15% | How likely is CH's specific team to actually adopt this? (est.) | Drop-in replacement, team already familiar | Active opposition from key personnel, destabilising |
| **Integration Effort** | 10% | Engineering work to integrate into CH's stack (UE5, Perforce, JIRA, Slack) | Native plugin, works out of box | Months of bespoke development |
| **Cost Efficiency** | 10% | Cost relative to the human-only alternative at CH's scale | Free/open-source | Exceeds cost of human workflow at CH's scale |

**Composite formula:** (Capability × 0.25) + (Production × 0.20) + (IP/Legal × 0.20) + (Adoption × 0.15) + (Integration × 0.10) + (Cost × 0.10). Rounded to one decimal place.

### Verdict Definitions

| Verdict | Meaning | Required information |
|---|---|---|
| **ADOPT** | Roll out now | Integration timeline, named CH owner, 90-day success criteria, rollback trigger |
| **PILOT** | Time-boxed trial | Same as ADOPT + defined scope (team, seats, duration, data to collect) |
| **WATCH** | Not ready yet | What would need to change + suggested revisit date |
| **AVOID** | Risk outweighs benefit | Specific risk, probability × impact, counterfactual cost, alternative workflow |

### Hard-Blocker Gates (applied before scoring)

A tool that fails any gate cannot score higher than WATCH regardless of composite:

1. **Named owner exists:** someone at CH must own deployment and management
2. **Operational dependency met:** tool doesn't require infrastructure CH lacks
3. **Shipped-content risk acceptable:** player-facing content assessed for IP/union/community risk
4. **Failure blast radius bounded:** if the tool fails, the damage is contained
5. **Time to value < 6 months:** must demonstrate measurable value within 6 months for Phase 1

### Sensitivity Floor

If a tool scores below 4 on IP/Legal Safety (for art/audio/narrative) or below 4 on Production Readiness (for anything touching shipped assets), maximum verdict is WATCH regardless of composite.

### Tool Profile Format

Each tool evaluation includes:

- **Company:** Founded, HQ, employees, funding, stability assessment
- **What it does:** Specific capability relevant to the discipline
- **Who uses it:** Named studios, shipped games, dates
- **What users say:** Direct quotes from practitioners (attributed)
- **Productivity impact:** ~X% estimate with basis and uncertainty
- **Scoring table:** 6-dimension composite with calculation shown
- **Verdict:** ADOPT/PILOT/WATCH/AVOID with CH-specific rationale
- **Cost:** Verified pricing at CH's scale for pre-launch and post-launch periods

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## TABLE OF CONTENTS

- Executive Summary
- Decision Dashboard
- How to Use This Document
- Aggregate Value Estimate
1. Methodology & Scoring
2. Sensitivities & Constraints
3. Competitive Landscape
4. Cross-cutting Infrastructure
5. Animation
6. Art Pipeline
7. Audio
8. Engineering
9. DevOps & Infrastructure
10. Game Design
11. QA & Testing
12. Narrative & Localisation
13. Production & Project Management
14. Marketing & Community
15. Data & Analytics
16. HR & People
17. Finance & Legal
18. Platform & Backend
19. Phased Adoption Roadmap
20. Organisational Change Management
21. Budget Summary
22. Risk Register
23. Appendices

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. SENSITIVITIES & CONSTRAINTS

These are non-negotiable constraints that override any individual tool recommendation.

**Art team resistance:** Sasha Krieger (Lead Concept/Environment) has genuine personal conviction against AI art. All art-AI is voluntary. No AI-generated concept enters the pipeline without a named human artist's redraw and sign-off.

**SAG-AFTRA / Equity:** AI voice performance is a non-negotiable prohibition. The 2025 Interactive Media Agreement added consent, disclosure, compensation protections, and suspension rights. UK Equity has parallel demands. Any audio recommendation must be explicit about union compliance.

**Steam disclosure:** Mandatory AI disclosure since January 2024. Every tool recommendation flags whether use triggers platform disclosure (Pre-Generated for tools used in development, Live-Generated for runtime AI).

**Partner IP:** CH integrates partner games' IP. AI tools must NEVER process partner IP through cloud models. Contractual obligation, not preference.

**No CTO:** The CTO search is active. This is the critical gap blocking infrastructure-dependent AI tools.

**Series B due diligence:** The $10M raise will include AI governance questions. This document is itself a due diligence asset.

**Community perception:** The MMO community is hypersensitive to AI-generated content. Multiple studios were review-bombed over detected AI marketing imagery in 2024-2026. Community backlash is a material business risk.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. COMPETITIVE LANDSCAPE: AI IN MMO/LIVE-SERVICE DEVELOPMENT

The AI tooling landscape in game development is moving rapidly, but verifiable adoption in MMO and live-service studios remains thinner than industry marketing suggests. The following examples are drawn from public statements, GDC presentations, and published case studies only.

**Ubisoft: Internal tools, not off-the-shelf.** Ubisoft's La Forge R&D lab built Ghostwriter, an internal AI tool for generating first-draft NPC barks (ambient dialogue), presented at GDC 2023. At GDC 2024, Ubisoft demonstrated NEO NPCs, a generative AI prototype using Inworld AI's Character Engine and NVIDIA Audio2Face for real-time NPC interaction. In 2025, this evolved into "Teammates," a playable research project featuring AI companions that respond to player voice commands. **Lesson for CH:** The largest publisher investing in AI is building custom internal tools and research prototypes, not buying commercial products. None of these tools has shipped in a commercial title. CH should not assume that because Ubisoft is experimenting, the tools are production-ready.

**Square Enix: QA as the entry point.** Square Enix publicly stated its goal to automate 70% of QA and debugging work by end of 2027, through joint research with the Matsuo-Iwasawa Laboratory at the University of Tokyo. This is the clearest public commitment from a major publisher to AI-powered QA. **Lesson for CH:** QA automation is the safest, most defensible entry point for AI adoption. CH's single-QA constraint makes modl.ai (Section 11) the highest-priority AI investment after MetaHuman Animator.

**Blizzard: Creative caution.** World of Warcraft's lead composer Leo Kaliski stated publicly in 2025 that Blizzard feels "very lucky and happy that we're not using generative AI" for the Midnight expansion. **Lesson for CH:** Even at studios with unlimited resources, creative disciplines are actively choosing not to adopt generative AI. This validates CH's cautious approach to art and audio AI, and reinforces why all art recommendations in this report are PILOT or WATCH with voluntary adoption only.

**Rare (Sea of Thieves): automated playtesting at scale.** Rare's GDC 2019 presentation detailed their automated gameplay testing framework for Sea of Thieves, enabling 100+ internal deployments before public launch. Rare built this system in-house; it is not a commercial product. **Lesson for CH:** automated playtesting at scale is proven in AAA production, but most studios build bespoke frameworks. modl.ai (Section 11) offers a commercial alternative for studios like CH that lack the engineering capacity to build their own. With Hannah as sole QA, commercial AI playtesting is where AI can have the most immediate impact on CH's production capacity.

**Steam disclosure: normalisation accelerating.** 7,818 titles disclosed AI use on Steam in 2025, a 681% increase over 2024. The disclosure ecosystem is maturing and community perception is shifting from outrage to scrutiny. **Lesson for CH:** AI adoption itself is not the reputational risk; undisclosed or poorly managed adoption is. CH's conservative disclosure posture (declared throughout this report) is the correct strategy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. CROSS-CUTTING INFRASTRUCTURE

### 4.1 Self-Hosted vs Cloud Decision Framework

Every AI tool recommendation in this report requires a data egress decision: does CH's data leave the building? The answer depends on what data is being processed.

**CH's data classification for AI workflows:**

| Data Category | Sensitivity | Cloud AI Permitted? | Rationale |
|---|---|---|---|
| **Partner IP** (partner game assets, cross-promotion content, GDD references to partner titles) | CRITICAL | NO | Contractual obligation. Partner IP must never be processed through any third-party AI API. Air-gapped workflows only. |
| **Unreleased game assets** (concept art, 3D models, animations, audio, source code, level designs) | HIGH | CONDITIONAL | Cloud AI permitted only through enterprise agreements with contractual IP protections and zero-training guarantees (e.g. Adobe Firefly Enterprise, GitHub Copilot Business). Public/consumer-tier AI APIs: no. |
| **Commercial data** (cap table, fundraising terms, investor correspondence, financial projections) | HIGH | NO | Series B due diligence sensitivity. No cloud AI processing until enterprise-grade DPAs are in place with the specific provider. |
| **Employee PII** (CVs, performance reviews, salary data, disciplinary records, health information) | HIGH (GDPR Art. 9 for special categories) | NO | GDPR Chapter V transfer mechanism required for US-based APIs. HiBob's Bob AI/OpenAI integration requires GDPR verification (Section 16). |
| **Game design documents** (GDD, economy models, progression curves, content plans) | MEDIUM | CONDITIONAL | Cloud AI permitted through enterprise agreements. Not through consumer-tier APIs. GDD content is commercially sensitive but not partner-IP-restricted. |
| **Internal communications** (meeting notes, Slack threads, sprint retrospectives) | MEDIUM | CONDITIONAL | Cloud AI permitted for non-sensitive meetings. Meetings involving partner IP, commercial data, or personnel matters: excluded until data classification guardrails are operational. |
| **Public/marketing content** (press releases, social posts, marketing copy, community communications) | LOW | YES | No restrictions. Standard consumer or enterprise AI tools permitted. |
| **Development telemetry** (build metrics, CI/CD logs, code quality metrics) | LOW | YES | Non-sensitive operational data. |
| **Player telemetry** (post-launch: gameplay events, session data, aggregated analytics) | MEDIUM (GDPR for PII) | CONDITIONAL | Aggregated, anonymised telemetry: yes. Player PII (accounts, payment, location): enterprise agreements with GDPR-compliant processing only. |

**Decision framework: when to self-host vs use cloud**

CH should NOT self-host AI models at this stage. The prerequisites do not exist:

1. **No DevOps resource.** Self-hosted AI models require GPU infrastructure provisioning, model serving (NVIDIA Triton, vLLM, Ollama), monitoring, and patching. Engineers are already context-switching into infrastructure work. Adding model hosting without dedicated DevOps is a recipe for unmaintained, insecure infrastructure.
2. **No CTO to own infrastructure decisions.** Self-hosting is a strategic infrastructure commitment. The CTO hire must be in post before any self-hosting decision is made.
3. **GPU cost.** Cloud GPU instances (A100/H100) cost $1.50-$3.00+/hour. On-premise GPU servers (NVIDIA A6000 or equivalent) cost $15,000-$30,000 per unit plus ongoing maintenance. Neither is justified for the volume of AI inference CH will generate pre-launch.

**Recommended infrastructure tier:**

- **Now (Phase 1):** Cloud APIs through enterprise agreements for non-sensitive workflows. Adobe Firefly Enterprise (art ideation), Machinations (economy simulation, cloud-native), GitHub Copilot Business (code). All tools recommended in this report operate via cloud API or are desktop applications.
- **When CTO is in post (Phase 2):** Evaluate an API gateway (e.g. LiteLLM, Portkey, or a simple reverse proxy) for cost control and usage monitoring across all cloud AI API usage. This is a lightweight infrastructure investment, not a self-hosting commitment.
- **When DevOps hire is in place (Phase 3, if warranted):** Evaluate self-hosted inference for workflows that require processing partner IP or unreleased assets through AI. The most likely candidate: a self-hosted image generation model (Stable Diffusion or equivalent) for art workflows involving partner IP references. Only if demand justifies the infrastructure cost.

### 4.2 API Gateway and Cost Controls

CH does not need an API gateway today. The volume of AI API calls across all recommended Phase 1 tools is low (individual desktop tools, not high-throughput inference). However, as AI usage expands:

**Trigger for API gateway investment:** When 3+ teams are using cloud AI APIs simultaneously and monthly AI API spend exceeds $500/month across all tools combined.

**Recommended approach:** Start with usage monitoring (spreadsheet tracking per-tool spend monthly, owned by Finance/Lili). Graduate to a lightweight gateway (LiteLLM or Portkey) when the trigger is met. The gateway provides: unified API key management, per-team usage caps, cost alerting, and request logging for audit.

**Cost:** LiteLLM is open-source (self-hosted). Portkey offers a free tier for <10K requests/month. Neither requires significant engineering investment.

### 4.3 Prompt Library and Evaluation Framework

**Prompt library:** For the small number of teams using general-purpose LLMs (production for meeting summarisation, narrative for dialogue drafting), CH should maintain a shared prompt library in Confluence. This is not a technology investment; it is a documentation practice. Contents: approved prompts for each use case, data classification reminders per prompt, and output quality examples.

**Evaluation framework:** The 6-dimension rubric used in this report (Capability Fit, Production Readiness, IP/Legal Safety, Team Adoption Risk, Integration Effort, Cost Efficiency) should be reused for all future AI tool evaluations. The RICECO prompt that generated this report is itself the evaluation methodology; CH should archive it and use it at each 6-month review cycle. This provides continuity across evaluations and prevents each discipline from developing its own ad hoc criteria.

**6-month review cycle:** AI tools move faster than a fixed recommendation can track. The report recommends a standing 6-month AI tool review for fast-moving categories (code copilots, image generation, LLM-based testing). Each review uses the same rubric, re-scores tools against current capability, and compares against the previous cycle's scores. Owned by: CTO (once hired), with discipline leads providing input.

### 4.4 Data Classification for AI Workflows

The data classification table in Section 4.1 is the foundational governance artefact for all AI adoption. It must be formalised as a standalone policy document (not buried in this report) and approved by:

1. **Dino (General Counsel):** legal review of GDPR compliance, contractual obligations (partner IP), and regulatory requirements
2. **Aris (COO):** operational sign-off on workflow guardrails
3. **CTO (when hired):** technical enforcement mechanisms (API gateway rules, network-level controls)

**Priority:** This is the single highest-priority governance item across all 14 disciplines. Multiple tool recommendations in this report are blocked by the absence of a data classification policy. The AI Acceptable Use Policy v1 (Usage Policy & Governance backlog) should incorporate this classification as its centrepiece.

### 4.5 Infrastructure Budget and Phasing

| Infrastructure Item | Phase | Cost | Dependency |
|---|---|---|---|
| Data classification policy (document, not technology) | 1 (immediate) | $0 (internal effort) | Dino + Aris approval |
| AI Acceptable Use Policy v1 | 1 (immediate) | $0 (internal effort) | Data classification complete |
| Shared prompt library (Confluence) | 1 (immediate) | $0 (existing platform) | Policy v1 complete |
| Usage monitoring (spreadsheet) | 1 (immediate) | $0 | Lili in post (July 2026) |
| API gateway (LiteLLM/Portkey) | 2 (when triggered) | $0-$500/month | CTO in post, spend trigger met |
| Self-hosted inference evaluation | 3 (if warranted) | $15,000-$30,000 hardware or $1,500-$3,000/month cloud GPU | CTO + DevOps hire, demonstrated demand |
| **Infrastructure Total (Phase 1)** | | **$0** | |
| **Infrastructure Total (all phases, worst case)** | | **$15,000-$30,000 one-time + $500-$3,000/month ongoing** | |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 5. ANIMATION

### 5.1 Discipline Overview

CH's animation team (~4-6 people) is the most unstable discipline in the studio: the lead animator is on a performance improvement plan with expected exit, and a backfill is being pipelined. Any new tool adoption must be low-friction and must not depend on the departing lead for championing or evaluation. The cosy byte-punk MMO requires four distinct animation workloads: responsive combat animation (the pressure/crack stack system demands tight, readable strike and detonation sequences at 30Hz instance server tick rate), NPC ambient behaviours for zones supporting 200-300 concurrent players, cinematic facial performances for story and quest content, and social expression animations for the ~30-35% non-combat player base. Current workflow: Maya (primary DCC) with UE5 Sequencer and Control Rig for in-engine work.

### 5.2 Task-Level Analysis

#### 5.2.1 Motion Capture: Body Performance Acquisition & Cleanup

Full-body movement capture for combat, traversal, emotes, and NPC behaviours, plus AI-assisted cleanup to production quality. CH's 100% remote structure means traditional stage-based mocap (Vicon, OptiTrack) is impractical; the tools evaluated here prioritise remote-friendly capture workflows.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Rokoko (Smartsuit Pro II + Studio) | HW+SaaS | 7 | 6 | 8 | 5 (est.) | 6 | 7 | 6.6 | PILOT |
| Move.ai (Markerless Studio) | SaaS | 6 | 5 | 8 | 5 (est.) | 5 | 6 | 6.0 | WATCH |
| DeepMotion (Animate 3D) | SaaS | 5 | 3 | 7 | 6 (est.) | 5 | 8 | 5.5 | WATCH |

*Rokoko: (7 × 0.25) + (6 × 0.20) + (8 × 0.20) + (5 × 0.15) + (6 × 0.10) + (7 × 0.10) = 1.75 + 1.20 + 1.60 + 0.75 + 0.60 + 0.70 = 6.6 ✓*
*Move.ai: (6 × 0.25) + (5 × 0.20) + (8 × 0.20) + (5 × 0.15) + (5 × 0.10) + (6 × 0.10) = 1.50 + 1.00 + 1.60 + 0.75 + 0.50 + 0.60 = 5.95 → 6.0*
*DeepMotion: (5 × 0.25) + (3 × 0.20) + (7 × 0.20) + (6 × 0.15) + (5 × 0.10) + (8 × 0.10) = 1.25 + 0.60 + 1.40 + 0.90 + 0.50 + 0.80 = 5.45 → 5.5*

**Recommendation: PILOT** Rokoko Smartsuit Pro II + Rokoko Studio for body motion capture.

- **Integration timeline:** 2-3 weeks (hardware procurement and shipping, suit fitting for 2-3 team members, Rokoko Studio setup, FBX-to-UE5 pipeline verification)
- **Rollout owner:** Incoming animation lead (backfill hire). Interim: most senior remaining animator. Dependency flagged: PILOT start should wait until backfill is in post.
- **Pilot scope:** 2 Smartsuit Pro II units, 2-3 animators, 3-month trial. Capture 20-30 combat animation clips. Compare quality and cleanup time vs pure keyframe workflow in Maya.
- **90-day success criteria:** (a) 20+ production-quality combat clips captured and integrated into UE5, (b) AI-assisted cleanup time per clip measured and documented vs manual cleanup, (c) animators report net time savings vs pure keyframe
- **Rollback trigger:** AI-assisted cleanup time exceeds 80% of full keyframe time (negating the mocap benefit), or the RICO lawsuit (see below) results in company instability affecting product support

**Rokoko: Company Profile**

- **Founded:** March 2014, Copenhagen, Denmark. Founders: Jakob Balslev (CEO), Matias Sondergaard, Anders Klok
- **Employees:** ~119-126 across 5 continents
- **Funding:** ~$10.9-14.9M across 8 rounds. $3M strategic round August 2022 led by Naver Z (parent of ZEPETO), valued at $80M+
- **Stability:** Mature company (12 years), significant headcount, strong valuation. HOWEVER: active lawsuit (below)

**What it does:** Smartsuit Pro II is a full-body IMU-based motion capture suit (~$2,495). Rokoko Studio provides AI-assisted cleanup: auto-clean removes noise, auto-smooth interpolates jitter, retargeting maps mocap data to custom rigs. Vision AI adds webcam-based body and face capture (free tier) for remote use without hardware. The AI cleanup layer is what elevates this beyond traditional hardware mocap.

**Who uses it:** Praey for the Gods (No Matter Studios, 3-person team, 2021) is the only verified shipped game title. Rokoko claims adoption at major studios but no other named game credits were found. The hardware is widely used in indie, education, and broadcast contexts.

**What users say:** BoroCG: "sensors may not be super precise, they provide clean results sufficient for developing games." No Film School: "High Quality Mocap for a Fraction of the Cost" with suit on/off in ~6 minutes vs ~45 minutes for optical systems.

**Productivity impact:** ~40-60% time reduction vs manual keyframe animation for locomotion and combat base poses (estimated, based on suit capture + AI cleanup vs hand-keyframing equivalent quality). Precision is lower than optical systems (Vicon, OptiTrack), so hero animations may still need manual polish. Uncertainty: HIGH for combat-specific timing; the pressure/crack system's hit-frame precision needs testing during PILOT.

**Risk flag: Walsh v. Rokoko lawsuit.** Active RICO lawsuit (Case 2:25-cv-05340, C.D. Cal). Settlement discussions ordered February 2026. If the lawsuit results in significant damages or injunctions, Rokoko's business continuity could be affected. At PILOT scale (2 suits, no production dependency), CH's financial exposure is limited to ~$5,000 hardware and ~$1,200 software.

**Why not Move.ai:** Founded ~2019, London. Raised ~$16-23M (estimated from public sources). Markerless mocap from multi-camera video is a compelling concept, but precision for game combat timing (frame-accurate strikes for the pressure/crack system) is unverified. Claims adoption by Ninja Theory and ILM (specific titles/projects not independently confirmed). Studio-tier pricing is custom and non-transparent. WATCH until independent benchmarks confirm game-quality precision for combat animation, and until a shipped game credits Move.ai. Revisit date: Q1 2027.

**Why not DeepMotion:** Production Readiness score of 3 triggers the sensitivity floor rule (maximum verdict: WATCH). Founded December 2014 by Kevin He (ex-CTO Disney Star Wars Mobile, ex-Roblox, ex-Blizzard WoW). Despite a strong founder pedigree, Bandai Namco investment (March 2023), and 1M+ claimed users, no shipped game was found using DeepMotion. Team is shrinking (17 → 10-13 employees). Funding data conflicts ($2.2-8.7M depending on source). MoCap Online comparison: "Useful for reference and blocking but requires significant cleanup for production use." The SayMotion text-to-animation product (open beta 2024) is interesting but experimental. WATCH. Revisit only if a shipped game credits DeepMotion or team growth resumes.

**Also considered:**

- **Plask** (Seoul, ~25 employees, $2.66M funding, last round October 2021): no shipped game, stale funding raises financial stability concerns. WATCH. Revisit only if fresh funding announced.
- **RADiCAL** (New York, ~30 employees): **AVOID.** Autodesk acquired RADiCAL's core technology in April 2026. The standalone platform is shutting down 6 July 2026. Technology may resurface inside Maya or MotionBuilder but no timeline is confirmed.

**Data Egress:** Rokoko Smartsuit captures locally (suit → Rokoko Studio on local machine). Vision AI processes webcam video through Rokoko's cloud servers. Guardrail: partner IP-related motion capture sessions (e.g. crossover character animations referencing partner titles) must use suit-only mode, not cloud-processed Vision AI. DeepMotion and Move.ai both process video through cloud APIs; partner IP guardrails apply if evaluated.

**Cost Estimate:**

- Pre-launch (mid-2026 to late 2028): ~$7,400 (2 × Smartsuit Pro II at ~$2,495 = ~$4,990 hardware + 2 Pro seats × $50/mo × 24 months = $2,400 software)
- Post-launch annual: ~$1,200 (2 Pro seats × $50/mo × 12 months) if retained for expansion content
- Production-only: No. animation capture continues post-launch for expansions and live content

**Disclosure Impact:** Steam AI disclosure: No. Rokoko captures real human performance; AI cleanup is a dev-side post-processing tool that cleans noise from actual performer data. No AI-generated content.

---

#### 5.2.2 Facial Animation: Performance Capture & Retargeting

Facial expressions for dialogue, cinematics, quest NPCs, and player emotes. CH's MMO has story content requiring believable facial performances. The cosy byte-punk aesthetic allows stylisation, which broadens the range of acceptable output quality.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| MetaHuman Animator (Epic Games) | Engine-native | 9 | 9 | 9 | 7 (est.) | 9 | 10 | 8.8 | ADOPT |
| DeepMotion Facial (Animate 3D) | SaaS | 4 | 3 | 7 | 5 (est.) | 4 | 8 | 5.0 | WATCH |

*MetaHuman Animator: (9 × 0.25) + (9 × 0.20) + (9 × 0.20) + (7 × 0.15) + (9 × 0.10) + (10 × 0.10) = 2.25 + 1.80 + 1.80 + 1.05 + 0.90 + 1.00 = 8.8 ✓*
*DeepMotion Facial: (4 × 0.25) + (3 × 0.20) + (7 × 0.20) + (5 × 0.15) + (4 × 0.10) + (8 × 0.10) = 1.00 + 0.60 + 1.40 + 0.75 + 0.40 + 0.80 = 4.95 → 5.0 ✓*

**Recommendation: ADOPT** MetaHuman Animator for all facial animation work.

- **Integration timeline:** Immediate (already included in UE5 Editor since 5.2; current UE 5.6 adds audio-only mode)
- **Rollout owner:** Interim: most senior remaining animator. Permanent: incoming animation lead. MetaHuman Animator requires no champion; any animator can start using it with a 30-minute tutorial.
- **90-day success criteria:** (a) at least 1 cinematic sequence with MetaHuman-driven facial performances integrated into the game, (b) audio-only mode tested for quest NPC dialogue lines, (c) team confirms quality meets byte-punk aesthetic requirements
- **Rollback trigger:** Extremely unlikely given zero cost and native integration. Trigger: Epic deprecates MetaHuman Animator (no indication), or the team determines that the byte-punk character art style is fundamentally incompatible with MetaHuman topology (testable within days)

**MetaHuman Animator: Company Profile**

- **Company:** Epic Games. Private company; Tencent holds a ~40% minority stake. One of the most stable companies in the games industry. Makers of Unreal Engine, Fortnite. Revenue in the billions.
- **Launched:** June 2023 with UE 5.2. Fully integrated into UE Editor with UE 5.6 (June 2025). Audio-only mode (generates facial animation from speech without any camera) added in UE 5.6.

**What it does:** Converts iPhone-captured facial performance (via Live Link Face app) into production-quality facial animation on MetaHuman characters. UE 5.6 added audio-only mode: feed it a voice recording, and it generates matching facial animation from the audio signal alone, with no camera capture needed. MetaHuman Creator (free, browser-based) generates the character meshes; MetaHuman Animator drives them.

**Who uses it (shipped games):**

- **Hellblade II: Senua's Saga** (Ninja Theory / Xbox Game Studios, May 2024); AAA, performance-capture-driven narrative
- **Clair Obscur: Expedition 33** (Sandfall Interactive, 2025, ~30 people); AA RPG. CTO Tom Guillermin: "As soon as UE5 was released, we switched our whole character creation pipeline to MetaHuman."
- **Eriksholm: The Stolen Dream** (River End Games, July 2025, 15-17 people); indie narrative. Creative Director Anders Hejdenberg said the previous facial animation pipeline was "very slow and tedious"; MetaHuman Animator enabled a 17-person team to produce AAA-quality facial performances in-house.
- **Mafia: The Old Country** (Hangar 13, in production); presented MetaHuman workflow at Unreal Fest Stockholm 2025

**What users say:**

- Tom Guillermin (CTO, Sandfall Interactive, ~30 people): "As soon as UE5 was released, we switched our whole character creation pipeline to MetaHuman."
- Anders Hejdenberg (Creative Director, River End Games, 15-17 people): described previous pipeline as "very slow and tedious"; MetaHuman Animator enabled the small team to achieve AAA-quality facial animation in-house

**Productivity impact:** ~6-10x speedup for facial animation. Epic case study: 80 minutes vs 1+ day for a realistic facial animation sequence. Audio-only mode further reduces capture overhead by eliminating camera setup entirely. CH's ~4-6 person animation team is comparable in size to Sandfall (~30 total, subset in animation) and River End (15-17 total), both of whom shipped with MetaHuman Animator as their primary facial pipeline. Uncertainty: LOW for standard facial performance; MEDIUM for stylised byte-punk expressions that deviate significantly from realistic performance.

**Why not DeepMotion Facial:** Production Readiness score of 3 triggers the sensitivity floor rule (maximum verdict: WATCH). DeepMotion's facial tracking is part of their general-purpose Animate 3D product, not a dedicated facial animation solution. Output requires manual retargeting to game character rigs. No UE5 plugin; data arrives via FBX blend shape export. When MetaHuman Animator is free, native, and shipped in AAA titles, there is no reason to use a cloud-based alternative with zero production evidence.

**Data Egress:** MetaHuman Animator processes all data locally within UE5. Live Link Face captures via iPhone and transmits over local network to the UE5 editor. Audio-only mode processes voice recordings locally. No data leaves CH's infrastructure. Safe for all content categories.

**Cost Estimate:**

- Pre-launch: $0. Included in Unreal Engine licence.
- Post-launch annual: $0. Standard UE5 royalty (5% above $1M gross product revenue; 3.5% only under Epic's Launch Everywhere terms) applies to the engine as a whole, not MetaHuman specifically.
- Note: Live Link Face app is free on iOS.

**SAG-AFTRA/Equity note for audio-only mode:** Audio-only facial generation uses a voice recording to produce facial animation. This crosses into performer consent territory: the voice actor's speech is being processed by a trained model to generate visual output they did not perform. Before using audio-only mode in production, CH must (a) confirm with Dino (General Counsel) and external counsel (Saybrook Legal) that audio-only facial generation from voice recordings is compliant with the Interactive Media Agreement's consent and disclosure provisions, (b) include audio-only facial generation in performer consent documentation, (c) notify relevant unions if applicable. Camera-based MetaHuman Animator (performer's actual facial movements captured via iPhone) does not have this issue; the performer is authoring the facial animation directly.

**Disclosure Impact:** Steam AI disclosure: Borderline. Camera-based MetaHuman Animator transforms real human performance into animation; the performer is the author. Audio-only mode generates facial animation from speech using a trained model, which constitutes Pre-Generated AI content. Conservative position: disclose audio-only mode usage. Camera-based capture is not AI-generated content.

---

#### 5.2.3 Keyframe Animation: Combat & Gameplay

The pressure/crack stack combat system requires responsive, physically-grounded strike animations with precise hit-frame timing. AI-assisted keyframe tools can accelerate the iteration cycle for combat moves, detonation sequences, dodge rolls, and gameplay abilities without replacing the animator's creative control.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Cascadeur (Nekki) | Desktop | 8 | 5 | 9 | 7 (est.) | 6 | 9 | 7.4 | PILOT |

*Cascadeur: (8 × 0.25) + (5 × 0.20) + (9 × 0.20) + (7 × 0.15) + (6 × 0.10) + (9 × 0.10) = 2.00 + 1.00 + 1.80 + 1.05 + 0.60 + 0.90 = 7.35 → 7.4 ✓*

**Recommendation: PILOT** Cascadeur for combat and gameplay keyframe animation.

- **Integration timeline:** 1 week (download, install, establish FBX round-trip pipeline with Maya and UE5)
- **Rollout owner:** Incoming animation lead (backfill hire). Interim: most senior remaining animator. PILOT start should wait until backfill is in post.
- **Pilot scope:** 2 Pro seats, 3-month trial. Produce 10-15 combat animation clips (strikes, crack detonations, dodge rolls) using Cascadeur alongside the existing Maya workflow. Direct A/B comparison.
- **90-day success criteria:** (a) 10+ combat clips produced with Cascadeur assistance, (b) iteration speed measured (poses per hour) vs pure Maya keyframe, (c) AutoPhysics quality assessed specifically for pressure/crack combat timing, (d) AI Inbetweening tested for combat transition sequences
- **Rollback trigger:** AutoPhysics constraints are too rigid for the byte-punk aesthetic (stylised movements that intentionally break realistic physics), or FBX round-trip introduces data loss requiring manual correction that exceeds the time saved

**Cascadeur: Company Profile**

- **Developer:** Nekki, a game studio founded in 2007 (Shadow Fight series, 200M+ downloads). Cascadeur has been in development since approximately 2019.
- **HQ:** Cyprus (Nekki). Cascadeur team distributed.
- **Product maturity:** Current version 2025.1. AI Inbetweening (walk, run, combat, acrobatic style presets) added March 2025. AutoPhysics (physically-accurate force simulation on poses) is the core differentiator. Full manual override retained on all AI features.

**What it does:** AI-assisted keyframe animation tool. Three core AI features: (1) AutoPhysics applies physically-accurate forces to posed characters, automatically adjusting centre of mass, momentum, and secondary motion; (2) AI Inbetweening generates intermediate frames between key poses, with presets for combat, acrobatic, and locomotion styles; (3) Auto-posing suggests physically plausible poses from partial input. The AI augments, never replaces, the animator's keyframes.

**Who uses it:** Shadow Fight 3 (Nekki, vendor's own game) is the only verified shipped title. UE5 Live Link plugin shipped in Cascadeur 2026.1 (April 2026), funded by a $50,000 Epic MegaGrant; requires UE 5.5+ and a paid subscription. Active indie and hobbyist community. No independent studio has publicly confirmed shipping with Cascadeur in a commercial title.

**What users say:** CG Channel review (April 2025): praised AI Inbetweening for reducing "the most tedious part of animation" and noted AutoPhysics produces "convincingly weighted" combat poses. No attributed quotes from game studio animators found; practitioner feedback is from the general animation community.

**Productivity impact:** ~30-50% time reduction for combat animation iteration (estimated, based on AutoPhysics eliminating manual centre-of-mass adjustment and AI Inbetweening reducing breakdown passes). Uncertainty: MEDIUM. The byte-punk aesthetic may require intentionally exaggerated physics that conflict with AutoPhysics's realism bias; the PILOT should specifically test whether AutoPhysics can be partially overridden for stylised combat.

**No alternative AI tool exists for this task.** Cascadeur is the only commercially available AI-assisted keyframe animation tool with physics simulation and intelligent inbetweening. The alternatives are the existing manual workflow in Maya (which remains the fallback and baseline for comparison) and motion capture (covered in Task 5.2.1). Autodesk Maya and MotionBuilder do not include AI-assisted posing or physics-based inbetweening. Generic LLMs cannot produce animation data.

**Data Egress:** Cascadeur operates entirely offline as a desktop application. All AI models run locally. No data leaves the local machine. Safe for all content categories including partner IP character animations.

**Cost Estimate:**

- Pre-launch: ~$1,584 (2 Pro seats × $33/mo × 24 months)
- Post-launch annual: ~$792 (2 Pro seats × $33/mo × 12 months), or $0 if perpetual licence option exercised after 12 months of subscription
- Production-only: No. combat animation iteration continues post-launch for abilities, expansions

**Disclosure Impact:** Steam AI disclosure: No. Cascadeur is a dev-side animation tool. AI assists with posing and inbetweening; the output is keyframe animation data authored by a human animator with AI assistance.

---

#### 5.2.4 Procedural NPC & Crowd Animation

CH's zone architecture supports 200-300 concurrent players alongside NPCs populating the world across 5 factions. NPC ambient behaviours (idle, patrol, react, crowd flow) and the 15+ enemy archetypes (tag-based, 5 D&D attributes × 3 tiers) need to feel alive without per-NPC manual animation.

**Assessment: No mature standalone AI tool exists for this task.**

This is primarily a systems-level challenge handled through UE5's native tools:

1. **UE5 Mass Entity + Smart Objects (built-in):** Handles crowd simulation and contextual NPC behaviours at zone scale. Free, native, already part of CH's engine.
2. **UE5 Control Rig (built-in):** Procedural animation blending, IK solving, and runtime pose modification. Handles walk-cycle variation, terrain adaptation, and idle variation.
3. **Houdini + KineFX (SideFX):** Procedural animation for crowd simulation in cinematics and offline content. CH already uses Houdini. ML features in Houdini 20.5+ (ML Deformer) are relevant but too new for production reliance (see Art Pipeline, Task 6.2.4).
4. **Behaviour trees + State machines (UE5):** Engine-native NPC behaviour authoring for the 15+ enemy archetypes. No external AI tool adds value beyond what UE5's AI navigation and behaviour tree systems provide.

No tool evaluation table is provided for this task because no commercially available AI tool meets the seed list acceptance criteria. This is a gap in the AI tooling market. The task is well-served by UE5's existing systems; the engineering effort is in content authoring (defining behaviours per archetype), not in tooling.

**Revisit when:** Dedicated AI crowd/NPC behavioural animation tools emerge with game studio adoption and UE5 integration. Monitor: NVIDIA's Omniverse crowd simulation tools, and SideFX's Houdini ML crowd features.

---

### 5.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| Animation lead exits during tool pilot; no champion for evaluation | 4 | 3 | 12 | Assign interim champion among remaining team. Defer PILOT starts until backfill in post |
| Rokoko RICO lawsuit affects company viability or product support | 2 | 3 | 6 | PILOT-only exposure limits financial risk to ~$7,400. Monitor case quarterly |
| Combat animation timing from Cascadeur's AutoPhysics doesn't match byte-punk aesthetic | 3 | 2 | 6 | AutoPhysics can be partially overridden. Fallback: pure Maya keyframe for stylised combat |
| Team too small/unstable to absorb any new tools | 3 | 4 | 12 | Defer all PILOTs until backfill. MetaHuman Animator (ADOPT) is zero-friction and proceeds regardless |
| MetaHuman character topology incompatible with byte-punk character art style | 1 | 4 | 4 | Testable within days using MetaHuman Creator. Custom characters can be used with MetaHuman Animator's retargeting |

### 5.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| AI Acceptable Use Policy v1 | Usage Policy & Governance | HIGH | Any external tool adoption |
| Approved AI tool list (animation category) | Tool Selection & Licensing | HIGH | Rokoko PILOT, Cascadeur PILOT |
| Mocap performer consent and release documentation | IP Safeguards | MEDIUM | Rokoko PILOT (performer data captured) |
| AI-assisted animation production guidelines | Production Integration | MEDIUM | Before any AI-assisted animation enters the asset pipeline |
| Animation asset attribution metadata standard | Production Integration | LOW | Before shipped builds contain AI-assisted animation work |

### 5.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| MetaHuman Animator | ADOPT | $0 (included in UE5) | $0 |
| Rokoko (2 suits + Pro software) | PILOT | ~$7,400 | ~$1,200 |
| Cascadeur (2 Pro seats) | PILOT | ~$1,584 | ~$792 (or $0 with perpetual licence) |
| **Animation Total** | | **~$8,984** | **~$1,992** |

Note: Animation tools are not production-only; all three continue to deliver value post-launch for expansion content, live events, and seasonal ability additions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6. ART PIPELINE

### 6.1 Discipline Overview

CH's art team (~15-18 people) is the largest discipline in the studio, led by David Luong (Director of Art) with Sasha Krieger leading concept and environment art. Sasha has genuine personal conviction against AI art; this is principled opposition, not ignorance, and must be respected. Any AI-art recommendation must be voluntary, positioned as a reference/ideation tool (not a replacement), and must not enter the asset pipeline without a named human artist's redraw and sign-off. Fred Dossola (Art Producer, started June 2026, Sony/CIG background) takes an "orthodontist approach" to change: incremental, never nuclear. He is the strongest rollout ally in the art team. Current DCC stack: Maya, ZBrush, Substance Suite (Painter/Designer), Houdini, Marvelous Designer, Photoshop. The cosy byte-punk aesthetic is a distinctive art direction that generic AI outputs will not match without significant human refinement.

### 6.2 Task-Level Analysis

#### 6.2.1 Concept Art: Ideation & Moodboarding

Early-stage visual exploration: colour palettes, composition studies, environmental mood, material references, and silhouette exploration. This is the most politically sensitive task in the entire report because it intersects directly with Sasha's opposition.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Adobe Firefly (Enterprise) | SaaS | 7 | 7 | 9 | 4 (est.) | 8 | 6 | 7.0 | PILOT |
| Midjourney (Pro) | SaaS | 9 | 7 | 3 | 3 (est.) | 5 | 7 | 5.9 | WATCH |
| Stable Diffusion XL (self-hosted) | OSS | 8 | 6 | 5 | 2 (est.) | 3 | 9 | 5.7 | WATCH |

*Firefly: (7 × 0.25) + (7 × 0.20) + (9 × 0.20) + (4 × 0.15) + (8 × 0.10) + (6 × 0.10) = 1.75 + 1.40 + 1.80 + 0.60 + 0.80 + 0.60 = 6.95 → 7.0*
*Midjourney: (9 × 0.25) + (7 × 0.20) + (3 × 0.20) + (3 × 0.15) + (5 × 0.10) + (7 × 0.10) = 2.25 + 1.40 + 0.60 + 0.45 + 0.50 + 0.70 = 5.9*
*Stable Diffusion XL: (8 × 0.25) + (6 × 0.20) + (5 × 0.20) + (2 × 0.15) + (3 × 0.10) + (9 × 0.10) = 2.00 + 1.20 + 1.00 + 0.30 + 0.30 + 0.90 = 5.7*

**Recommendation: PILOT** Adobe Firefly Enterprise for internal ideation only.

- **Integration timeline:** 1 week (licence procurement + SSO setup via existing Adobe CC subscription)
- **Rollout owner:** David Luong (Director of Art), interim. Permanent: future Art Technology Lead. Fred Dossola (Art Producer) to facilitate incremental adoption.
- **Pilot scope:** 3-5 volunteer artists (explicitly excluding anyone who objects), 3-month trial. Firefly used ONLY for abstract moodboarding: colour palette generation, composition references, texture exploration. No character generation, no asset-specific prompts.
- **90-day success criteria:** (a) 3+ artists voluntarily using Firefly for moodboarding, (b) no AI-generated concept enters the asset pipeline without a human artist's complete redraw and sign-off, (c) no team friction incidents reported to HR, (d) Sasha's workflow remains unaffected
- **Rollback trigger:** Team morale impact (anonymous survey score drops >15% from baseline), any IP incident involving Firefly outputs, or if Sasha or other senior artists formally object to the tool's presence on the team's licence

**Adobe Firefly: Company Profile**

- **Company:** Adobe Inc. Public company (NASDAQ: ADBE). ~30,000 employees. Revenue ~$21B (FY2025). One of the most stable software companies in the world.
- **Launched:** March 2023 (beta), September 2023 (GA). Substance 3D AI integration March 2024.
- **Firefly Foundry** (January 2026): allows custom models trained on brand content. Current partners are film/TV agencies (CAA, UTA, WME); no game studio partners announced.

**What it does:** Text-to-image generation trained exclusively on licensed content (Adobe Stock, openly-licensed content, public domain). This is Firefly's core differentiator: training data provenance is clean, and Adobe Enterprise tier includes IP indemnification. Confirmed: Enterprise customers on Firefly site licence receive contractual IP indemnification for Firefly-generated outputs (indemnity caps from $50K+). Standard commercial use terms apply; no game-asset-specific carve-outs, but standard terms cover derivative commercial use. Indemnity is voided if prompts are designed to infringe IP or imitate trademarked styles.

**Who uses it (in games):** No game studio has confirmed shipping a title with Firefly-generated content. Adobe's game-industry customers use Substance 3D (pre-AI) universally (CDPR, Naughty Dog, Ubisoft), but the Firefly AI layer is new. The Forrester TEI study (Adobe-commissioned) reports 70-80% increase in asset variant production and 65-75% reduction in review time, but these figures are from marketing enterprises, not game studios.

**Productivity impact:** ~20-40% time savings on early ideation and moodboarding (estimated, based on replacing Pinterest/ArtStation browsing + manual sketch with AI-generated reference boards). Uncertainty: HIGH. The byte-punk aesthetic is distinctive; generic Firefly output will not match it. Value is in exploration speed, not output quality.

**CH-Specific Risk: Sasha Krieger's Opposition.** This is the critical constraint. Rollout must be:
1. **Voluntary only.** No artist is required to use Firefly or any AI tool.
2. **Ideation-only.** No AI-generated image enters the concept pipeline, even as a "starting point." The guardrail is redraw-and-sign-off: a human artist must create the actual concept from scratch, with the AI image serving only as a reference equivalent to a photo or Pinterest board.
3. **Invisible in the pipeline.** AI moodboards are working documents that do not appear in art reviews, milestone deliverables, or external presentations.
4. **Fred Dossola as the rollout ally.** His incremental approach ("orthodontist method") is the right cadence. Never force, never mandate, never celebrate AI output publicly.

**Why not Midjourney:** Highest raw capability for image generation (score: 9), but IP/Legal Safety score of 3 blocks PILOT under the sensitivity floor rule. Training data provenance has unsettled litigation (Getty Images v. Stability AI applies to the underlying model class; Midjourney faces its own copyright challenges). No IP indemnification. WATCH until IP litigation resolves and the company offers commercial indemnification. Revisit date: Q1 2027.

**Why not Stable Diffusion XL self-hosted:** Requires GPU infrastructure (A100/H100 class) and DevOps capacity CH does not have (no CTO, no dedicated DevOps). Team Adoption score of 2 reflects Sasha's opposition compounded by the technical overhead of self-hosted model management. WATCH until (a) CTO + DevOps hire in place, (b) team readiness improves, (c) a fine-tuned model trained on licensed data addresses IP concerns. IP/Legal at 5 reflects the use of the open-source model itself being defensible, but the mixed training data provenance of Stable Diffusion creates residual risk.

**Data Egress:** Adobe Firefly Enterprise processes inputs via Adobe cloud infrastructure. **Partner IP and unreleased character designs MUST NOT be used as Firefly inputs.** Guardrail: restrict Firefly use to abstract moodboarding (colour palettes, composition references, environmental mood, texture exploration). Never input: character descriptions, partner IP references, game-specific lore, unreleased asset sketches.

**Cost Estimate:**

- Pre-launch: ~$14,400 (5 seats × Substance 3D Collection ~$119.99/mo × 24 months, which includes Firefly credits). If CH already has Adobe CC or Substance 3D subscriptions (likely, given Photoshop/Substance use), marginal cost may be $0: Firefly is included in existing CC plans. (CH should confirm with their Adobe account manager)
- Post-launch annual: ~$5,400 (if retained for ongoing concept work at 5 seats)
- Production-only: No. concept work continues post-launch for expansions

**Disclosure Impact:** Steam AI disclosure: YES if any Firefly-derived reference influences a shipped asset, even after human redraw. Conservative position: disclose all AI-assisted ideation. This is a reputational consideration as much as a platform requirement; the MMO community's sensitivity to AI art makes transparency the safer path.

---

#### 6.2.2 Texturing & Material Creation

PBR texture and material authoring for environment surfaces, props, characters, and the byte-punk aesthetic's distinctive material palette. CH's art team already uses Substance Painter and Designer; the question is whether the AI-powered features (Text to Texture, Text to Pattern, Image to Material) add value within the existing workflow.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Substance 3D AI (Adobe) | SaaS | 7 | 6 | 9 | 7 (est.) | 9 | 5 | 7.2 | PILOT |
| InstaMAT (Abstract GmbH) | Desktop/SaaS | 7 | 5 | 8 | 4 (est.) | 6 | 7 | 6.3 | WATCH |

*Substance 3D AI: (7 × 0.25) + (6 × 0.20) + (9 × 0.20) + (7 × 0.15) + (9 × 0.10) + (5 × 0.10) = 1.75 + 1.20 + 1.80 + 1.05 + 0.90 + 0.50 = 7.2*
*InstaMAT: (7 × 0.25) + (5 × 0.20) + (8 × 0.20) + (4 × 0.15) + (6 × 0.10) + (7 × 0.10) = 1.75 + 1.00 + 1.60 + 0.60 + 0.60 + 0.70 = 6.25 → 6.3*

**Recommendation: PILOT** Substance 3D AI features within the existing Substance workflow.

- **Integration timeline:** 0 days (AI features are already in Substance 3D Sampler 4.4+; CH's team already uses the Substance suite. Activation requires no additional installation.)
- **Rollout owner:** David Luong. Day-to-day: the technical artist(s) who manage the material pipeline.
- **Pilot scope:** All artists who currently use Substance (likely 8-12). 3-month trial. Test Text to Texture and Image to Material for environment surface materials (stone, metal, wood, fabric). Do NOT use for character textures or partner IP assets during pilot.
- **90-day success criteria:** (a) 20+ environment materials created or iterated using AI features, (b) artists report time savings on material iteration vs manual workflow, (c) output quality meets art direction bar for byte-punk aesthetic, (d) no AI-generated texture ships without human review and approval
- **Rollback trigger:** AI-generated textures consistently fail to match the byte-punk art direction, or the team (including Sasha) objects to AI features being active in their existing tool

**Substance 3D AI Features: Company Profile**

- **Parent company:** Adobe Inc. (see Firefly profile above).
- **Allegorithmic** (original Substance developer) founded 2003 by Sebastien Deguy. Acquired by Adobe January 2019. Deguy left Adobe April 2025.
- **AI features launched:** March 2024 (Text to Texture, Text to Pattern in Sampler 4.4). Still in active development; graduated from beta designation in late 2024 (per Adobe marketing materials).

**What it does:** AI-powered additions to the existing Substance 3D workflow: (1) Text to Texture generates PBR texture sets from text descriptions, (2) Text to Pattern creates tileable patterns, (3) Image to Material converts photographs into full PBR material sets (albedo, normal, roughness, height). All Firefly-powered with the same licensed training data provenance. Outputs integrate directly into Substance Painter/Designer workflows.

**Who uses it:** Substance 3D (pre-AI) is used in 95%+ of AAA projects: CDPR (Cyberpunk 2077), Naughty Dog (Uncharted 4), Ubisoft, EA, and hundreds of others. The AI features specifically have no confirmed shipped game. Substance 3D's industry dominance means the AI features are opt-in within a tool artists already use daily.

**Productivity impact:** ~20-30% time savings on material iteration for environment surfaces (estimated). The AI features accelerate the "first pass" of material creation; artists still refine manually. For unique byte-punk materials (corroded chrome, neon-etched concrete, pixelated organic growth), AI-generated starting points may need significant human refinement. Uncertainty: MEDIUM.

**CH-Specific: Sasha Factor.** Unlike standalone AI image generation tools, Substance 3D AI features are embedded within a tool the art team already uses and trusts. The AI is a feature within Substance, not a replacement for it. This significantly reduces adoption friction. However, if Sasha objects to AI features being active in Substance, Adobe allows per-feature toggling. Respect individual choice: no artist should be required to use Text to Texture if they prefer the manual workflow.

**Why not InstaMAT:** Founded as InstaLOD GmbH (May 2016) / InstaMaterial GmbH (October 2018) in Stuttgart, Germany, under parent company Abstract. Product launched January 2024 after 5+ years of development; graduated from Early Access July 2025. 11-50 employees (LinkedIn bracket). Funding unverified; may be bootstrapped. Customers include Bandai Namco, Blizzard, Pearl Abyss (verified via CG Channel), plus defence/enterprise clients. InstaMAT is a strong product with AI material generation (text-to-material, AI denoising, intelligent texture synthesis), but adopting it requires the team to learn a new tool alongside their existing Substance workflow. Given Sasha's opposition and the team's familiarity with Substance, adding a new DCC tool for the same task increases friction without sufficient benefit. WATCH. Revisit if InstaMAT adds Substance-format export that integrates transparently, or if CH decides to evaluate InstaMAT as a Substance replacement (unlikely given Adobe's market position). Pricing: Free under $100K revenue / Indie $489 perpetual or $96/yr / Pro $989 perpetual or $432/yr.

**Data Egress:** Substance 3D AI features process text prompts and images via Adobe cloud (Firefly backend). Same guardrails as Firefly: no partner IP, no unreleased character designs, no game-specific lore as inputs. Environment material prompts ("weathered copper pipe," "mossy concrete") are safe.

**Cost Estimate:**

- Pre-launch: Included in CH's existing Substance 3D subscription. If on Teams plan ($119.99/seat/mo for the Collection), AI features are included at no additional cost. Marginal cost: $0 above current licensing.
- Post-launch annual: $0 marginal
- Note: Adobe increased Substance 3D pricing by 25% in March 2025. CH should verify their current contract terms (confirm with Adobe account manager).

**Disclosure Impact:** Steam AI disclosure: Pre-Generated if AI-generated textures ship in the build. Mitigation: human artists review and modify all AI-generated starting points; the shipped texture is the human's work informed by AI suggestions.

---

#### 6.2.3 3D Model Generation & Prototyping

Rapid generation of 3D models for blockout, prototyping, and asset exploration. Not for final production assets; for visual development and greyboxing.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Meshy (Meshy.ai) | SaaS | 6 | 4 | 5 | 2 (est.) | 5 | 8 | 4.9 | WATCH |

*Meshy: (6 × 0.25) + (4 × 0.20) + (5 × 0.20) + (2 × 0.15) + (5 × 0.10) + (8 × 0.10) = 1.50 + 0.80 + 1.00 + 0.30 + 0.50 + 0.80 = 4.9*

**Verdict: WATCH.** Team Adoption score of 2 is the primary blocker; art team resistance to AI-generated 3D models would be severe. Sasha's opposition to AI art extends to AI-generated 3D assets.

**Meshy: Company Profile**

- **Founded:** ~2022. AI 3D model generation from text/image prompts.
- **Revenue:** $15M ARR (November 2025). Growing rapidly.
- **Current product:** Meshy 6 generates textured, rigged 3D models with PBR maps, up to 600K face meshes.
- **Pricing:** Pro $20/mo (~50 models/mo). Studio $60/mo.

**Who uses it:** No shipped AAA game. Indie and game-jam adoption confirmed. GDC 2025 exhibitor. The lack of AAA production evidence is notable given the rapid revenue growth; the user base is overwhelmingly prototypers, content creators, and indie developers.

**Why WATCH, not PILOT:** Three compounding factors:
1. **Team adoption (score: 2):** Sasha's opposition to AI art will extend to AI-generated 3D models. Introducing Meshy into the art team's toolset risks triggering exactly the team friction the pilot is designed to avoid.
2. **IP/Legal (score: 5):** Training data provenance of Meshy's 3D generation model is unclear. No IP indemnification offered. Outputs may constitute Pre-Generated content under Steam's disclosure framework.
3. **Quality gap:** Current AI 3D generation produces assets that require substantial manual cleanup (retopology, UV unwrapping, material assignment) for production use in a UE5 MMO. The time saved on initial generation may be consumed by cleanup.

**Revisit date:** Q1 2027 if (a) art team sentiment toward AI tools improves, (b) Meshy or a competitor demonstrates AAA-quality output with clean IP provenance, (c) CH has a technical artist or pipeline engineer who can own the evaluation.

**Cost Estimate:** N/A (WATCH verdict; no current expenditure recommended).

**Disclosure Impact:** Steam AI disclosure: Pre-Generated if any Meshy-derived geometry ships, even after manual retopology.

---

#### 6.2.4 Procedural Content Generation & VFX: Houdini ML Features

Procedural terrain generation, vegetation distribution, VFX simulation, and asset optimisation using SideFX Houdini's ML features. CH already uses Houdini; this evaluates the ML-specific additions.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Houdini ML (SideFX) | Desktop | 7 | 5 | 9 | 7 (est.) | 8 | 5 | 6.9 | WATCH |

*Houdini ML: (7 × 0.25) + (5 × 0.20) + (9 × 0.20) + (7 × 0.15) + (8 × 0.10) + (5 × 0.10) = 1.75 + 1.00 + 1.80 + 1.05 + 0.80 + 0.50 = 6.9*

**Verdict: WATCH.** The ML features are promising but too new for production reliance. The base product is already in CH's stack; the ML features can be adopted opportunistically as they mature.

**SideFX Houdini: Company Profile**

- **Founded:** June 1987, Toronto. Founders: Kim Davidson (still CEO, 39 years), Greg Hermanovic.
- **Employees:** ~171-220
- **Funding:** ~$2.78M total (Epic Games minority investor November 2020). Essentially self-funded and profitable for three decades.
- **Stability:** One of the most stable companies in the industry. 39 years in business, same CEO, profitable, no acquisition risk.

**What it does (ML features specifically):**
- **ONNX SOP** (Houdini 20, November 2023): run any ONNX neural network inside Houdini's node graph
- **ML Volume Upres** (Houdini 20.5): AI upscaling for fluid/smoke simulations
- **ML Deformer** (Houdini 20.5): ML-trained mesh deformation for real-time approximation of complex simulations
- **Neural Point Surface** (Houdini 20.5): neural implicit surface reconstruction
- **Neural Cellular Automata** (Houdini 22 preview): procedural textures via neural CA models

**Who uses it:** Houdini (pre-ML) is industry standard for procedural content and VFX: Horizon Zero Dawn, Spider-Man: Miles Morales, God of War Ragnarok, Forza Horizon 5, Pacific Drive, Hitman 3, Far Cry series, Gran Turismo 7. **The ML features specifically have no confirmed shipped game** (too new; ONNX SOP arrived late 2023, ML Deformer/Upres in 2024-2025).

**CH-Specific: Sasha Factor.** Houdini ML features are technical processing tools (simulation upscaling, mesh deformation approximation), not creative AI generation. They do not generate art; they accelerate existing Houdini workflows. This distinction matters: Sasha's opposition to AI art is about creative authorship, not computational tools. Houdini ML features are equivalent to better GPU rendering, not AI image generation. Adoption risk from team resistance: LOW for this specific category.

**Why WATCH, not PILOT:** The ML features are genuinely useful but so new that no studio has shipped with them. CH's Houdini artists can experiment opportunistically (the features are included in their existing licence) without a formal PILOT. The risk is zero because there's no additional cost or integration work; the ML features are opt-in within a tool CH already owns. When a shipped game confirms production viability for ML Deformer or ML Volume Upres, upgrade to PILOT with a specific use case (likely: real-time VFX for zone transitions or combat effects).

**Productivity impact:** Unknown for game production. SideFX demos show 10-50x speedup for simulation upscaling (ML Volume Upres) and real-time approximation of offline-quality deformations (ML Deformer). CH's byte-punk VFX (particle effects for crack detonations, corruption spread, faction energy signatures) are candidates, but the ML features need testing against CH's specific aesthetic.

**Revisit date:** Q3 2026 (after Houdini 22 ships and early adopter reports emerge).

**Data Egress:** Houdini operates entirely locally. ML inference runs on local GPU. No data egress. Safe for all content categories.

**Cost Estimate:** $0 marginal. ML features are included in existing Houdini licences. CH's current Houdini licensing: Indie ~$269-299/yr (under $100K revenue) / Core ~$1,995 perpetual / FX ~$4,495 perpetual or ~$1,545/yr rental.

**Disclosure Impact:** Steam AI disclosure: Pre-Generated if ML-generated content (upscaled VFX, ML-deformed meshes) ships in the build. However, these are processing tools applied to artist-authored content, analogous to denoising; the disclosure requirement is ambiguous.

---

#### 6.2.5 Environment Layout & Level Dressing

AI-assisted placement of environment assets (props, vegetation, structures) for level design and world building. Populating the MMO's open-world zones with environmental detail.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Promethean AI | SaaS/Plugin | 6 | 4 | 8 | 4 (est.) | 7 | 8 | 6.0 | WATCH |

*Promethean AI: (6 × 0.25) + (4 × 0.20) + (8 × 0.20) + (4 × 0.15) + (7 × 0.10) + (8 × 0.10) = 1.50 + 0.80 + 1.60 + 0.60 + 0.70 + 0.80 = 6.0 ✓*

**Verdict: WATCH.** Promising concept but critical company risk and no verified production evidence.

**Promethean AI: Company Profile**

- **Founded:** 2018 by Andrew Maximov (former Technical Art Director at Naughty Dog; worked on Uncharted 4, The Last of Us Part II)
- **HQ:** Los Angeles, USA
- **Employees:** 3 (as of Q1 2026). This is a micro-startup.
- **Funding:** $300K total across 2 rounds. Disney Accelerator 2024. Investors: Davidovs Venture Collective, Roosh Ventures.
- **CRITICAL RISK:** 3 employees and $300K funding is extremely fragile. At this scale, a single departure (the founder) ends the company. No enterprise support guarantee.

**What it does:** AI-assisted 3D environment layout from natural language. Describe a scene in text; Promethean AI places, arranges, and styles environment assets. UE5 plugin, Unity, Maya, Blender integration. The concept is compelling for an MMO with large open-world zones to populate.

**Who uses it:** Claims "10,000+ users including PlayStation Studios," but no specific PlayStation studio, no specific game title, and no named user have been verified. Maximov's Naughty Dog pedigree lends credibility to the technical approach, but the company's adoption evidence is entirely unattributed. (specific PlayStation studio and game title not independently confirmed)

**What users say:** Only founder quotes and unattributed website testimonials found. No named studio user quotes from independent sources.

**Why WATCH:**
1. **Company risk:** 3 employees, $300K total funding. Enterprise dependency on a micro-startup is inadvisable for a production pipeline tool. If Promethean AI ceases operations, CH would need to rip out the workflow.
2. **No production evidence:** Despite 6+ years of existence and a Disney Accelerator stint, no named studio has confirmed shipping a game with Promethean AI.
3. **Art team sensitivity:** "AI places props" directly touches environment art, which is Sasha's domain. Even if Sasha would tolerate it, introducing AI-driven environment layout before the team has accepted simpler AI tools (Firefly for moodboarding, Substance AI for texturing) risks escalating resistance.

**Revisit date:** Q2 2027 if (a) Promethean AI raises substantial funding or is acquired by a stable company, (b) a named studio ships a game using the tool, (c) CH's art team has successfully piloted lower-friction AI tools. Pricing for reference: Free (individuals) / Indie $19.99/mo / Pro $59.99/mo.

---

**Also considered: Scenario and Layer.** Two AI art generation platforms purpose-built for game studios, both enabling custom model training on a studio's own art for style-consistent output.

- **Scenario** ([scenario.com](https://scenario.com/)): Pricing from $19/mo (Starter) to $99/mo (Pro). Strong production evidence in mobile/casual: InnoGames, Tripledot Studios (2,500+ staff), Ubisoft (10,000+ assets for Captain Laserhawk), Mad Brain Games (11 shipped titles). ~$1.8M funding.
- **Layer** ([layer.ai](https://layer.ai/)): Pricing from Free to $149/seat/mo (Studio). Production evidence in mobile: Ace Games/Fiona's Farm (80% productivity gain claimed), Lokum Games, LBC Studios. ~$1.8M funding.

Both are primarily **2D art generation tools** optimised for mobile/casual studios scaling illustration, UA creatives, and character art. Neither offers 3D asset generation, native UE5 integration, or evidence of use in AAA or MMO-scale 3D pipelines. For a 70-person UE5 MMO studio where the bottleneck is 3D assets and textures inside the engine, they solve the wrong problem. Additionally, both would face the same Sasha/art team resistance as any AI image generation tool, without the IP provenance advantage of Adobe Firefly's licensed training data. **Not evaluated further.** Revisit if either adds 3D pipeline capabilities or UE5 integration.

---

### 6.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| Art team resistance to AI tools, led by Sasha, creates team friction | 4 | 4 | 16 | All AI tools voluntary. No AI output enters pipeline without human redraw. Fred Dossola as incremental rollout ally |
| Community backlash if AI-generated art is detected in marketing or shipped assets | 3 | 5 | 15 | Conservative Steam disclosure. All AI use is ideation-only; shipped assets are human-authored |
| Firefly outputs are used as final assets (shortcut), bypassing the human-redraw guardrail | 2 | 5 | 10 | Pipeline enforcement: asset review checklist includes "AI derivation" flag. No AI-derived asset passes art review without attribution |
| Promethean AI ceases operations mid-production | 3 | 2 | 6 | WATCH verdict prevents dependency. No production integration until company stabilises |
| Adobe Substance 3D pricing increases further (25% increase already in March 2025) | 3 | 2 | 6 | Monitor Adobe licensing terms. InstaMAT as potential alternative if pricing becomes untenable |

### 6.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| AI Acceptable Use Policy v1 (including voluntary-use clause for art) | Usage Policy & Governance | HIGH | Any art-AI tool adoption |
| AI-assisted concept art guidelines (ideation-only, redraw-and-sign-off) | Production Integration | HIGH | Firefly PILOT |
| Approved AI tool list (art category) | Tool Selection & Licensing | HIGH | Firefly PILOT, any future art tool |
| Asset attribution metadata standard (tracks AI derivation) | Production Integration | MEDIUM | Before any AI-influenced asset enters the pipeline |
| Platform disclosure documentation (Steam, console) | IP Safeguards | MEDIUM | Before any AI-influenced asset ships |
| Data classification for AI inputs (partner IP exclusion list) | IP Safeguards | HIGH | Before any cloud-based AI tool processes art team inputs |

### 6.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| Adobe Firefly (via CC subscription) | PILOT | ~$14,400 (5 seats; may be $0 marginal if existing CC licences include Firefly) | ~$5,400 |
| Substance 3D AI features | PILOT | $0 marginal (included in existing Substance licence) | $0 marginal |
| Meshy | WATCH | $0 | $0 |
| Houdini ML features | WATCH | $0 marginal (included in existing Houdini licence) | $0 marginal |
| Promethean AI | WATCH | $0 | $0 |
| **Art Pipeline Total** | | **~$14,400** (likely lower if existing Adobe licensing covers Firefly) | **~$5,400** |

Note: The art pipeline's AI cost is almost entirely Adobe licensing that CH may already be paying. The marginal AI-specific spend could be $0 if Firefly is included in CH's existing Creative Cloud subscription.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 7. AUDIO

### 7.1 Discipline Overview

CH's audio team (~2-3 people) is small relative to the ambition of a cosy byte-punk MMO with adaptive music, environmental soundscapes across 5 faction zones, combat SFX for the pressure/crack system, and NPC vocalisation. The team is evaluating audio middleware (Wwise vs FMOD), which is a prerequisite decision that affects which AI audio tools are available. **SAG-AFTRA/Equity compliance is a non-negotiable constraint across all audio recommendations:** the 2025 Interactive Media Agreement prohibits AI voice performance without consent, disclosure, and compensation protections. UK Equity has parallel demands. No AI voice tool is recommended anywhere in this section.

### 7.2 Task-Level Analysis

#### 7.2.1 Sound Design: SFX Search & Creation

Finding, creating, and iterating on sound effects for combat (crack detonations, pressure stacks, weapon impacts), environment (faction-specific ambient layers, corruption zones, player housing), and UI audio.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Wwise Similar Sound Search (Audiokinetic + Sony AI) | Engine-native | 8 | 6 | 9 | 8 (est.) | 9 | 7 | 7.8 | PILOT (conditional on Wwise) |
| ElevenLabs Sound Effects | SaaS | 6 | 4 | 7 | 6 (est.) | 5 | 8 | 5.9 | PILOT |

*Wwise Sound Search: (8 × 0.25) + (6 × 0.20) + (9 × 0.20) + (8 × 0.15) + (9 × 0.10) + (7 × 0.10) = 2.00 + 1.20 + 1.80 + 1.20 + 0.90 + 0.70 = 7.8 ✓*
*ElevenLabs SFX: (6 × 0.25) + (4 × 0.20) + (7 × 0.20) + (6 × 0.15) + (5 × 0.10) + (8 × 0.10) = 1.50 + 0.80 + 1.40 + 0.90 + 0.50 + 0.80 = 5.9 ✓*

**Recommendation: PILOT** Wwise Similar Sound Search (conditional on CH choosing Wwise as audio middleware).

- **Integration timeline:** 0 days once Wwise is adopted (Similar Sound Search is built into Wwise 2025.1+)
- **Rollout owner:** Audio Lead (whoever leads the 2-3 person team). No capacity concern; this is a feature within the tool they'll use daily.
- **Pilot scope:** Entire audio team (2-3 people), 3-month trial integrated into standard Wwise workflow. Track search-to-selection time for 100+ SFX queries. Compare AI-assisted discovery vs manual library browsing.
- **90-day success criteria:** (a) audio team reports measurably faster SFX discovery vs manual library browsing, (b) at least 50 SFX identified through AI search used in prototypes or vertical slices, (c) no workflow friction
- **Rollback trigger:** AI search results consistently miss relevant sounds or return false positives that slow the workflow
- **Upgrade path to ADOPT:** Promote to ADOPT after the 3-month pilot if the team confirms productivity gains and no quality issues. The risk profile is minimal (zero-cost feature within the standard product), but the PILOT verdict reflects that Similar Sound Search has no shipped-game citation for the AI feature specifically; Production Readiness is scored for the feature, not the base Wwise product.
- **Conditional dependency:** CH must choose Wwise as their audio middleware. If CH chooses FMOD instead, this recommendation does not apply. The Wwise vs FMOD decision should be made on core middleware merits (feature set, pricing model, team familiarity), not on the availability of Similar Sound Search.

**Wwise Similar Sound Search: Company/Feature Profile**

- **Company:** Audiokinetic (Wwise). Private. Founded 2000, Montreal. Acquired by Sony Interactive Entertainment (announced 2019, completed 2020). Similar Sound Search co-developed with Sony AI research division.
- **Employees:** ~200+ (Audiokinetic)
- **What it does:** AI-powered audio search within the Wwise authoring tool. Searches by audio similarity (audio-to-audio: "find sounds like this one") and by text description (text-to-audio: "whooshing sword impact with reverb"). Trained on BOOM Library + Pro Sound Effects catalogues (licensed, not scraped).
- **Pricing:** Included in Wwise 2025.1+ at no additional cost. Wwise licensing: Free under $250K project budget. CH will exceed this threshold; Pro from $8K or Premium from $25K, or 1% royalty. The Similar Sound Search feature is not a separate line item.

**Who uses it:** Wwise itself is industry standard for game audio (hundreds of shipped titles: Assassin's Creed, Cyberpunk 2077, Destiny 2, Hogwarts Legacy, many more). Similar Sound Search is new (2025.1) and has no independent shipped-game citation yet, but it ships as part of the standard Wwise product used by the largest audio teams in the industry.

**Productivity impact:** ~30-50% time savings on SFX discovery and selection (estimated). Audio designers currently browse libraries manually (scrolling through thousands of files, playing samples, tagging). AI search by similarity or text description reduces the search-to-selection cycle from minutes to seconds per effect. Uncertainty: LOW for search efficiency; the feature simply finds sounds faster.

**SAG-AFTRA/Equity:** Not applicable. This is a sound effect search tool, not a voice or performance tool. Outputs are existing library recordings, not AI-generated audio.

---

**PILOT: ElevenLabs Sound Effects for SFX generation**

- **Integration timeline:** 1 day (API key setup, WAV export pipeline to Wwise/FMOD)
- **Rollout owner:** Audio Lead
- **Pilot scope:** 1 seat (Pro tier), 3-month trial. Generate prototype SFX for combat effects (crack detonations, pressure impacts), environmental ambience, and UI audio. Compare quality and iteration speed vs manual sound design from sample libraries.
- **90-day success criteria:** (a) 30+ prototype SFX generated, (b) audio team assesses which (if any) are production-quality vs reference-only, (c) text-to-SFX workflow documented
- **Rollback trigger:** Generated SFX consistently fail to meet quality bar for game audio, or the team determines that library-sourced and custom-recorded SFX are always superior

**ElevenLabs Sound Effects: Company/Feature Profile**

- **Company:** ElevenLabs. Founded 2022. Raised ~$781M across five rounds. Most recent: $500M Series D (February 2026) at $11B valuation, led by Sequoia Capital. Previous: $180M Series C (January 2025) at $3.3B. ~$330-500M ARR as of early 2026. Extremely well-funded and stable.
- **What it does:** Text-to-SFX generation. 48kHz output, seamless looping option, 38 SFX categories. This is the sound effects product, NOT the voice cloning product. ElevenLabs's voice cloning technology is explicitly excluded from this recommendation.
- **Pricing:** Starter $5/mo. Creator $22/mo. Pro $99/mo. Scale $330/mo.

**Who uses it:** Integrated into Scenario.gg and Layer.ai creative pipelines. No shipped game title confirmed. The SFX product is newer than ElevenLabs's core voice technology and has limited game-specific adoption evidence.

**SAG-AFTRA/Equity:** Not applicable. Sound effects generation is distinct from voice performance. ElevenLabs does have a SAG-AFTRA agreement for their voice product, but the SFX product does not involve voice performance, character dialogue, or vocal expression. No union compliance concern for SFX generation.

**Why PILOT, not ADOPT:** Production Readiness at 4 (no shipped game, SFX product is new) and the quality bar for game audio is high. AI-generated SFX may be suitable for rapid prototyping and placeholder audio but may not meet the quality standard for shipped byte-punk audio design. The PILOT will establish whether any AI-generated SFX are production-quality or reference-only.

**Data Egress:** ElevenLabs processes text prompts via cloud API. Generic SFX descriptions ("metallic crack impact with harmonic decay," "wind through stone ruins") contain no sensitive data. However, prompts that reference partner IP, faction-specific audio motifs, or unreleased game lore could leak confidential information. Guardrail: SFX prompts must use generic, non-IP-specific descriptions. Do not reference partner game titles, faction names, character names, or narrative content in ElevenLabs prompts. Audio lead to review prompt logs monthly during PILOT.

**Cost Estimate:**

- Pre-launch: ~$2,376 (1 Pro seat × $99/mo × 24 months). Adjust if PILOT concludes SFX are reference-only (downgrade to Starter at $5/mo = $120 total).
- Post-launch annual: ~$1,188 (if retained at Pro tier; $60 at Starter)

**Disclosure Impact:** Steam AI disclosure: Pre-Generated if any AI-generated SFX ships in the build. Mitigation: use AI SFX as starting points that audio designers process, layer, and modify; the shipped audio is the designer's work.

---

#### 7.2.2 Music Composition: Adaptive & Cinematic

Music for faction zones (5 distinct musical identities), combat transitions (calm → pressure → crack detonation → aftermath), cinematic sequences, and ambient environmental music. The cosy byte-punk aesthetic implies a distinctive musical character that generic AI music will not capture without human composition.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| AIVA (AIVA Technologies) | SaaS | 5 | 4 | 6 | 5 (est.) | 5 | 8 | 5.3 | WATCH |
| Soundraw | SaaS | 4 | 3 | 5 | 5 (est.) | 4 | 7 | 4.5 | AVOID |

*AIVA: (5 × 0.25) + (4 × 0.20) + (6 × 0.20) + (5 × 0.15) + (5 × 0.10) + (8 × 0.10) = 1.25 + 0.80 + 1.20 + 0.75 + 0.50 + 0.80 = 5.3 ✓*
*Soundraw: (4 × 0.25) + (3 × 0.20) + (5 × 0.20) + (5 × 0.15) + (4 × 0.10) + (7 × 0.10) = 1.00 + 0.60 + 1.00 + 0.75 + 0.40 + 0.70 = 4.45 → 4.5*

**Verdict: WATCH** AIVA. **AVOID** Soundraw. **Hire a composer.**

The honest assessment: CH needs a human composer (or a small team of composers/sound designers) for the game's music. A cosy byte-punk MMO with 5 faction-distinct musical identities, adaptive combat transitions, and cinematic sequences is a creative music direction that AI composition tools cannot deliver at production quality. AI music tools currently produce generic, library-quality output suitable for content creators, not a distinctive game soundtrack.

**AIVA: Company Profile**

- **Company:** AIVA Technologies. Founded 2016, Luxembourg.
- **What it does:** AI orchestral and cinematic music composition. MIDI and WAV export. Style training available on Pro tier. Recognised by SACEM (Luxembourg Society of Authors) as a composer.
- **Pricing:** Free (non-commercial; AIVA owns copyright). Standard EUR 15/mo. Pro EUR 49/mo (5 seats, full copyright ownership).
- **Production citation:** Pixelfield (Epic Stars, 2017); first AI game soundtrack. This citation is 9 years old and obscure. (no recent game production usage found)

**Why WATCH:** AIVA could serve as a reference tool for a human composer (generating sketches, exploring harmonic progressions, testing tempo variations), but it cannot produce CH's distinctive byte-punk soundtrack. The copyright situation is also nuanced: on the Free/Standard tier, AIVA retains copyright. Only the Pro tier grants full ownership. At EUR 49/mo, this is affordable, but the creative limitation is the real blocker.

**Soundraw: Why AVOID**

- **Founded:** February 2020, Tokyo. ~19-20 employees. ~$5.01M funding.
- **What it does:** AI music generation with customisation (genre, mood, tempo, instruments).
- **Production citation:** NONE in games. Verified usage only in game jam entries. Developers explicitly said they'd "hire a real composer" for any commercial release. 557,000+ creators on platform, overwhelmingly content creators.
- **Why AVOID:** Production Readiness score of 3 (no game use, even game jam developers rejected it for commercial work). IP provenance uncertain (training data sources undisclosed). The tool produces generic background music; CH's byte-punk aesthetic requires authored music, not generated filler. The counterfactual cost of not using Soundraw is zero; the studio needs human composers regardless.

**SAG-AFTRA/Equity:** Music composition AI does not fall under the Interactive Media Agreement's voice performance provisions. However, if AI-composed music replaces human musicians' recording sessions, UK Musicians' Union (MU) concerns may arise. Mitigation: position AI composition tools as sketch/reference aids for human composers, not replacements for recorded performances. CH should engage human musicians for the final soundtrack.

**Alternative workflow:** Hire a composer (or contract a music studio) for the byte-punk soundtrack. Use AIVA or similar tools for internal reference and prototyping only if the composer finds them useful. The composer owns the creative direction; AI tools serve at the composer's discretion.

**Cost Estimate:** N/A for AI tools (WATCH/AVOID verdicts). Budget for human composition is a staffing cost, not an AI tool cost.

**Disclosure Impact:** Steam AI disclosure: Pre-Generated if any AI-composed music ships. Given the WATCH/AVOID verdicts, no AI music should ship.

---

#### 7.2.3 Audio Mastering & Post-Processing

Final-stage audio processing: mastering game audio assets for loudness normalisation, spectral balance, and platform-specific delivery requirements.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| iZotope Ozone (NI) | Desktop | 8 | 8 | 8 | 7 (est.) | 7 | 6 | 7.6 | WATCH |
| LANDR | SaaS | 5 | 7 | 7 | 4 (est.) | 4 | 7 | 5.8 | WATCH |

*iZotope Ozone: (8 × 0.25) + (8 × 0.20) + (8 × 0.20) + (7 × 0.15) + (7 × 0.10) + (6 × 0.10) = 2.00 + 1.60 + 1.60 + 1.05 + 0.70 + 0.60 = 7.55 → 7.6*
*LANDR: (5 × 0.25) + (7 × 0.20) + (7 × 0.20) + (4 × 0.15) + (4 × 0.10) + (7 × 0.10) = 1.25 + 1.40 + 1.40 + 0.60 + 0.40 + 0.70 = 5.75 → 5.8*

**Verdict: WATCH both.** iZotope Ozone is the right tool but the parent company's insolvency creates unacceptable vendor risk.

**iZotope Ozone: Company Profile**

- **Founded:** 2001, Cambridge, Massachusetts. Founders: Mark Ethier, Jeremy Todd (MIT backgrounds).
- **Employees:** ~132-178 (pre-insolvency figures; post-merger clarity uncertain)
- **CRITICAL RISK: Native Instruments (parent company) entered INSOLVENCY on 27 January 2026** (Berlin court). iZotope was acquired by Francisco Partners (2021) and merged under the NI umbrella (2023). Debt: ~£250M against ~£25M EBITDA. CEO Nick Williams stated March 2026: active M&A process with "strong interest from multiple parties."

**What it does:** AI-assisted audio mastering. Master Assistant analyses audio and suggests processing chains (EQ, compression, limiting, stereo width). Ozone is industry standard for music and media mastering. The AI features reduce mastering from a specialist skill to a semi-automated workflow.

**Why WATCH despite strong scores:** The composite score of 7.6 would normally warrant PILOT or ADOPT, but the parent company insolvency created vendor risk that scoring alone does not capture. **Update:** inMusic (parent of Akai, Alesis, M-Audio) announced a definitive agreement to acquire Native Instruments, including iZotope, in May 2026 (acquisition announced May 2026; completion and product continuity TBD). If this acquisition completes and inMusic commits to continued iZotope development, the vendor risk diminishes substantially and this verdict should be upgraded to PILOT.

**Mitigation path:** Confirm the inMusic acquisition has closed and that iZotope product development will continue. If confirmed, upgrade to PILOT with a 2-seat trial for the audio team. If the acquisition falls through or iZotope products are discontinued, evaluate alternatives.

**Revisit date:** Q3 2026 (acquisition expected to close imminently per public announcements).

**LANDR: Why WATCH**

- **Founded:** 2012 (as MixGenius), Montreal. ~161-175 employees. ~$37.7M funding. Key investors: Sony Innovation Fund, Warner Music, Nas.
- **What it does:** AI-powered music mastering, distribution, plugins, collaboration. Acquired Synchro Arts (2021), Orb Plugins (2024), Reason Studios (January 2026).
- **Why WATCH for CH:** LANDR is primarily a music creator tool, not a game audio tool. Its mastering AI is designed for music tracks, not game audio assets (which have different loudness, dynamic range, and format requirements). Wwise and FMOD have built-in loudness and normalisation tools that are more appropriate for game audio mastering. LANDR could be useful if CH's audio team is mastering a standalone soundtrack album, but that is a secondary use case.

**SAG-AFTRA/Equity:** Not applicable for mastering tools (audio processing, not voice performance).

**Data Egress:** iZotope Ozone operates locally (desktop application). LANDR processes audio via cloud. Neither involves sensitive data categories (mastering processes finished audio assets, not IP-sensitive source material).

**Cost Estimate:** N/A for current spend (WATCH verdicts). iZotope Ozone pricing for reference: Standard ~$129 one-time / Advanced ~$399 one-time (pricing subject to change following inMusic acquisition; confirm before purchase).

---

### 7.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| Wwise vs FMOD decision delays audio AI adoption | 3 | 3 | 9 | Decouple the middleware decision from AI tool evaluation. Similar Sound Search is a bonus feature, not a reason to choose Wwise |
| AI-generated SFX are used as shortcuts, degrading audio quality | 2 | 3 | 6 | ElevenLabs PILOT explicitly positions AI SFX as prototyping aids. Audio lead reviews all shipped SFX |
| iZotope parent company (NI) liquidates; mastering tools lose support | 3 | 2 | 6 | WATCH verdict prevents dependency. Monitor M&A process. Fallback: Ozone perpetual licences remain functional offline |
| SAG-AFTRA/Equity rules tighten to cover AI-generated SFX or music | 2 | 4 | 8 | Current rules target voice performance, not SFX/music. Monitor union negotiations. If rules expand, pivot to human-only SFX creation |
| Community detects AI-generated audio in the game | 2 | 4 | 8 | Conservative disclosure. AI SFX used as starting points processed by human designers. Final audio is human-authored |

### 7.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| AI Acceptable Use Policy v1 (audio section) | Usage Policy & Governance | HIGH | Any audio AI tool adoption |
| SAG-AFTRA/Equity compliance documentation | IP Safeguards | HIGH | Must be in place before ANY audio AI tool; confirms voice cloning prohibition |
| Approved AI tool list (audio category) | Tool Selection & Licensing | MEDIUM | ElevenLabs PILOT |
| Audio middleware decision (Wwise vs FMOD) | Tool Selection & Licensing | HIGH | Wwise Sound Search ADOPT (conditional) |
| AI-generated SFX production guidelines | Production Integration | MEDIUM | Before any AI SFX enters the shipped build |

### 7.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| Wwise Similar Sound Search | PILOT (conditional) | $0 marginal (included in Wwise licence) | $0 marginal |
| ElevenLabs Sound Effects (1 Pro seat) | PILOT | ~$2,376 | ~$1,188 |
| AIVA | WATCH | $0 | $0 |
| Soundraw | AVOID | $0 | $0 |
| iZotope Ozone | WATCH | $0 | $0 |
| LANDR | WATCH | $0 | $0 |
| **Audio Total** | | **~$2,376** | **~$1,188** |

Note: The dominant audio cost is the Wwise middleware licence itself (Pro from $8K or Premium from $25K), not the AI features. Similar Sound Search adds zero marginal cost to Wwise.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 8. ENGINEERING

### 8.1 Discipline Overview

CH's engineering team (~10-12 people) operates without a CTO or dedicated DevOps resource. Mustafa, Head of Tech, is not a strategic technology leader and defaults to silence in meetings; he will not organically champion AI adoption. Engineers are already context-switching into IT and infrastructure work, which means any new tool adoption must be low-friction and must not add to the context-switching burden. CH's AI policy for engineering is pragmatic: "teach prompt well, red-team output, review before shipping"; this is a team that will use AI tools if they work, not one that needs convincing. The engineering team works primarily in UE5 Blueprint and C++, with Perforce for source control and JIRA (being set up) for task tracking. General-purpose code assistants (GitHub Copilot, Cursor, Windsurf) are explicitly excluded from this report's scope per the methodology: they are not game-specialist tools. This section evaluates UE5-specific AI tools that understand Blueprint graphs, engine architecture, and game development workflows.

### 8.2 Task-Level Analysis

#### 8.2.1 UE5 Blueprint & C++ Code Generation

AI-assisted generation and editing of UE5 Blueprint graphs, C++ gameplay code, materials, VFX, and procedural content. This is the primary use case for AI in CH's engineering workflow: accelerating the translation from design intent to working UE5 implementation.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Aura (Ramen VR) | SaaS/Plugin | 8 | 4 | 7 | 5 (est.) | 9 | 6 | 6.5 | PILOT |
| Ultimate Engine CoPilot (BlueprintsLab) | Plugin | 6 | 2 | 7 | 5 (est.) | 8 | 7 | 5.6 | WATCH |

*Aura: (8 × 0.25) + (4 × 0.20) + (7 × 0.20) + (5 × 0.15) + (9 × 0.10) + (6 × 0.10) = 2.00 + 0.80 + 1.40 + 0.75 + 0.90 + 0.60 = 6.45 → 6.5 ✓*
*UE CoPilot: (6 × 0.25) + (2 × 0.20) + (7 × 0.20) + (5 × 0.15) + (8 × 0.10) + (7 × 0.10) = 1.50 + 0.40 + 1.40 + 0.75 + 0.80 + 0.70 = 5.55 → 5.6 ✓*

**Recommendation: PILOT** Aura for UE5 Blueprint and C++ generation, conditional on access being granted (tool is still in public beta).

- **Integration timeline:** 1-2 weeks (plugin installation, API key setup, team onboarding for 2-3 engineers)
- **Rollout owner:** Mustafa (Head of Tech), interim. Permanent: future CTO. Mustafa's passive communication style means the PILOT needs a structured evaluation framework (defined prompts, tracked outputs, weekly review) rather than relying on organic champion behaviour.
- **Pilot scope:** 2-3 Pro seats, 3-month trial. Focus on Blueprint generation for gameplay systems (combat abilities, NPC behaviours, UI interactions). Track: prompts attempted, outputs accepted vs rejected, manual fix time per output, token/credit consumption rate.
- **90-day success criteria:** (a) engineers report net time savings on Blueprint authoring vs manual workflow, (b) accepted-output rate exceeds 40% (i.e., more than 4 in 10 generated Blueprints are usable with minor edits), (c) credit consumption rate documented against the $40/mo Pro budget, (d) no incident involving generated code introducing a shipped bug
- **Rollback trigger:** Accepted-output rate below 25% (tool generates more cleanup work than it saves), or credit consumption exhausts monthly budget before mid-month consistently, or Ramen VR ceases operations or pivots away from Aura

**Aura: Company Profile**

- **Developer:** Ramen VR, founded 2019, San Francisco. Y Combinator S19.
- **Founders:** Andy Tsen (CEO), Lauren Frazier (CTO). Met at Oculus Launch Pad 2017.
- **Funding:** $40M+ raised. Kickstarter $280K (2019), Series A $10M (2021), Series B $35M (2022, led by Anthos + Dune).
- **Employees:** ~15-20 after early 2025 layoffs (undisclosed number).
- **History:** Pivoted from Zenith: The Last City, a VR MMO that peaked at #1 on Steam and Quest at launch (January 2022) but struggled with retention and ran at a loss. Development ceased July 2024. The pivot to Aura reuses the team's deep UE5 expertise but represents a complete business model change. Head of AI: Hisham Bedri (ex-CTO One More Multiverse).
- **RISK:** The company is effectively a startup pivoting from a failed game to an AI developer tool. $35M Series B (2022) provides runway, but the layoffs and product pivot indicate financial pressure. Monitor quarterly.

**What it does:** UE5-native AI agent (5.3-5.7, Windows only). Telos 2.0 is a proprietary Blueprint reasoning framework running on Anthropic Claude that claims >99% accuracy reading existing graphs and 25x error reduction over generic LLMs (self-benchmarked; no independent validation). Features include Blueprint and C++ generation, 3D asset creation, Editor-Use Agent (lighting, post-processing), Coding Agent, Dragon Agent (autonomous agentic loops), and animation/rigging. The March 2026 acquisition of Coplay added Unity support. The tool is a plugin that operates within the UE5 Editor, not a standalone application.

**Who uses it:** Sinn Studio (Zombonks, VR early access, shipped in 5 months). CEO Alek Sinn: "Aura and I rapidly iterated to meticulously craft a vision for the game." This is one small VR indie studio and the tool is less than 6 months old. "Over a dozen design partners" claimed but no other studios named publicly. This is thin production evidence for a PILOT recommendation; the PILOT is conditional on the evaluation proving value within CH's specific UE5 MMO context.

**What users say:**

- Unreal University review: "sophisticated starting point rather than a complete solution." Noted: Blueprint collision scaling wrong, asset references fail, spawn actor nodes need manual fixing.
- Forum issues: plugin install failures on UE 5.7, Blueprint editing refused despite settings, DLL-only distribution (no source), connectivity issues.
- StraySpark: "genuinely excels at Blueprint work" but concerns about proprietary, closed-source nature and uncertain pricing trajectory.

**Productivity impact:** ~20-40% time savings on Blueprint authoring for standard gameplay systems (estimated, based on user reports of rapid iteration for routine Blueprints offset by manual fix requirements for complex graphs). Uncertainty: HIGH. The tool is <6 months old, the only production citation is a small VR title, and CH's MMO-scale Blueprints (200-300 concurrent players, 5 faction systems, pressure/crack combat) are substantially more complex than the typical use case. The PILOT specifically tests whether Aura's Blueprint generation holds up at MMO complexity.

**Why not Ultimate Engine CoPilot:** Production Readiness score of 2 triggers the sensitivity floor rule (code is a shipped asset). Maximum verdict: **WATCH**.

**Ultimate Engine CoPilot: Company Profile**

- **Developer:** BlueprintsLab, a solo Finnish developer ("Roly"/"Robert"). Contact: moonlitdragoninteractive@gmail.com. No LinkedIn presence, no company registration found.
- **Claims:** "4+ years as Discord community admin" and "shipped game on Steam" (unnamed).
- **Other FAB products:** Blueprint Analyst ($44.99), Ultimate Difficulty Scaling ($34.99).

**What it does:** UE5 plugin (5.4-5.7, Windows + macOS) with 1,050+ tool actions across 56 categories. Full C++ source included. LLM integration layer with 9 API slots (OpenAI, Anthropic, Google, DeepSeek, Mistral) and 2 free slots. Initially "Ultimate Blueprint Generator" (July 2025), V1.0 April 2026. Current price: **$330** (increased from $220 at launch, with "monthly increases scheduled").

**Who uses it:** No named studio. No shipped game. "Thousands of developers" is unsubstantiated marketing. All press releases are paid ABNewswire wire distributions syndicated to low-tier sites. A "Best AI Plugins" comparison blog is published on the developer's own website (gamedevcore.com).

**What users say:**

- Positive: "Awesome tool which will continue to grow" (JDLTorre), "Real game changer" (shepaldo), "Plugin is still quite rough but the dev seems capable" (JuuzouSuzuya92).
- **Strongly negative (willfitch, April 2026):** alleged MCP integrations do not work, token consumption "about 20x what Claude and Codex would use" (1.2M tokens for one Blueprint update), user banned from Discord for reporting issues. Found 3 other affected users. Reported vendor for ToS violations.
- Price complaints: "way too expensive" (casigus), no trial available at the time (skoppaaaa).
- No Reddit or independent YouTube reviews exist.

**Why WATCH:**

1. **Solo developer risk:** A single developer with no company registration, no LinkedIn, and a Gmail contact address. If the developer becomes unavailable, CH has no support recourse. The C++ source inclusion mitigates lock-in risk but not ongoing development.
2. **Zero production evidence:** No named studio, no shipped game. The only evidence is UE forum posts from individual users.
3. **Credibility concerns:** Paid press releases, self-published comparison blogs, escalating prices with "monthly increases scheduled," and a serious user complaint alleging 20x stated token consumption and Discord banning for reporting issues.
4. **Production Readiness floor:** Score of 2 blocks PILOT regardless of composite.

**Revisit date:** Q1 2027 if (a) a named studio ships a game crediting UE CoPilot, (b) the token consumption and Discord moderation concerns are addressed publicly, (c) the developer establishes a registered company with commercial support terms.

**Data Egress:** Aura processes Blueprint and C++ data through cloud inference (Anthropic Claude). **Partner IP Blueprints and source code referencing partner game integrations MUST NOT be processed through Aura.** Guardrail: restrict Aura use to CH's own gameplay systems (combat, NPC behaviours, UI). Never input: partner IP quest logic, partner game asset references, or code that processes partner data. UE CoPilot routes to user-selected LLM APIs (same egress considerations apply).

**Cost Estimate:**

- Pre-launch: ~$2,880 (3 Pro seats × $40/mo credit × 24 months). Credit-based pricing means actual spend may be lower if the team uses fewer prompts. Note: credit does not roll over; unused monthly credit is lost.
- Post-launch annual: ~$1,440 (if retained at 3 seats; $0 if PILOT does not promote)
- Production-only: No. engineering work continues post-launch for live service features, expansions, and systems iteration

**Disclosure Impact:** Steam AI disclosure: Pre-Generated if AI-generated Blueprint or C++ code ships in the build. Mitigation: all generated code is reviewed, tested, and modified by human engineers before integration; the shipped code is the engineer's work informed by AI suggestions. Conservative position: disclose AI-assisted code generation.

---

#### 8.2.2 Code Review & Debugging

AI-assisted code review, static analysis, and debugging for UE5 C++ and Blueprint projects.

**Assessment: No specialist UE5 AI code review tool exists.**

This is a genuine gap in the market. The available options are:

1. **General-purpose code review tools** (GitHub Copilot, Cursor, Windsurf): excluded from this report per scope (not game-specialist). These tools do not understand UE5 Blueprint graphs, engine-specific patterns, or game development conventions.
2. **UE5 static analysis** (PVS-Studio, ReSharper C++): excellent tools but not AI-powered; they use traditional static analysis rules. Already available to CH and should be adopted regardless of this report.
3. **Aura's code review capability:** Aura (see 6.2.1) can read existing Blueprints and suggest improvements, but this is incidental to its generation focus, not a dedicated review workflow.

No tool evaluation table is provided for this task because no commercially available AI tool meets the game-specialist acceptance criteria for UE5 code review. CH should use traditional static analysis tools (PVS-Studio for UE5 C++, UE5's own Blueprint compiler warnings) and general-purpose code review practices. When UE5-specialist AI code review tools emerge, evaluate using the rubric in section 6.2.3.

**Revisit when:** A tool emerges that specifically targets UE5 Blueprint graph review (detecting common antipatterns, performance issues, replication bugs in multiplayer Blueprints). Monitor: Epic's Unreal Editor tooling announcements and UE5 marketplace AI tools.

---

#### 8.2.3 Fast-Moving Category: Code Assistant Evaluation Methodology

UE5 code generation tools are less than 12 months old. Both Aura and UE CoPilot launched in 2025-2026. The market will look different in 6 months. Per the methodology's reusable evaluation instruction, this section provides a framework CH can apply at each 6-month review cycle.

**Evaluation Framework for UE5 Code Assistants (apply every 6 months)**

| Step | Action | Output |
|------|--------|--------|
| 1. Market scan | Search FAB Marketplace, UE5 forums, and GDC proceedings for new UE5-specific AI tools. Filter: must target UE5 Blueprints or C++ specifically, not generic code completion. | Updated candidate list |
| 2. Score each candidate | Apply the 6-dimension rubric (section 1) with the same calibration anchors. | Scoring table per tool |
| 3. Production citation check | For each tool, verify: has a named studio shipped a game using this tool? "Used by indie devs" or "popular on forums" does not qualify. | Citation or qualification note |
| 4. Benchmark test | Using 3 standardised prompts (one combat Blueprint, one NPC behaviour, one UI interaction from CH's own systems), generate outputs and measure: (a) accuracy (does it compile?), (b) quality (does it follow CH's coding standards?), (c) credit/token consumption. | Benchmark results matrix |
| 5. Compare to current tool | If CH is already piloting Aura, compare new candidate's benchmark results against Aura's 90-day evaluation data. | Decision: switch, add, or retain |
| 6. Verdict | Apply verdict definitions. Tools with Production Readiness < 4 remain WATCH. | Updated recommendation |

**Current leader:** Aura (PILOT, conditional). **Next evaluation:** December 2026.

---

### 8.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| No CTO to champion engineering AI adoption; Mustafa is passive | 4 | 3 | 12 | Structured evaluation framework with defined metrics. Aura PILOT runs on metrics, not on champion enthusiasm. Escalate to CTO once hired |
| Aura (Ramen VR) ceases operations or pivots again after Zenith failure | 3 | 3 | 9 | PILOT-only exposure limits financial risk to ~$2,880. No production dependency. Aura-generated code is owned by CH once reviewed and committed |
| AI-generated code introduces subtle bugs in multiplayer systems (replication, zone transitions) | 2 | 4 | 8 | All generated code goes through standard code review. PILOT restricts to non-critical gameplay systems initially (not zone architecture or server infrastructure) |
| Token/credit consumption exceeds budget (per UE CoPilot user complaint about 20x consumption) | 3 | 2 | 6 | Aura's credit-based pricing makes consumption visible. Track weekly during PILOT. Set hard monthly budget cap per engineer |
| Engineers resist AI tools due to context-switching fatigue | 2 | 3 | 6 | UE5-native plugin (no workflow change). Voluntary adoption during PILOT. AI policy already pragmatic |

### 8.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| AI Acceptable Use Policy v1 (engineering section: permitted use cases, code review requirements) | Usage Policy & Governance | HIGH | Aura PILOT |
| Approved AI tool list (engineering category) | Tool Selection & Licensing | HIGH | Aura PILOT |
| AI-generated code review checklist (human review required before merge) | Production Integration | HIGH | Before any AI-generated code enters the codebase |
| Source code data classification (partner IP exclusion list for cloud AI inputs) | IP Safeguards | HIGH | Aura PILOT |
| AI code generation training materials (prompt engineering for UE5 Blueprints) | Training & Education | MEDIUM | Within first month of Aura PILOT |

### 8.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| Aura (3 Pro seats) | PILOT | ~$2,880 | ~$1,440 |
| Ultimate Engine CoPilot | WATCH | $0 | $0 |
| **Engineering Total** | | **~$2,880** | **~$1,440** |

Note: General-purpose code assistants (Copilot, Cursor) are excluded from this report's scope. Their costs and evaluation are a separate engineering decision.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 9. DEVOPS & INFRASTRUCTURE

### 9.1 Discipline Overview

CH has zero dedicated DevOps headcount and no CTO. Engineers context-switch into infrastructure and IT work alongside their primary development responsibilities. The CI/CD platform decision (TeamCity, Jenkins, or BuildKite) has not been made. This is the most tool-sparse discipline in the studio: before evaluating AI-powered DevOps tools, CH needs a human to own the discipline and a platform to run on. Any AI recommendation in this section is necessarily contingent on foundational decisions that have not yet been made.

### 9.2 Task-Level Analysis

#### 9.2.1 CI/CD Build Failure Analysis

AI-assisted diagnosis of build failures: root cause identification, fix suggestions, and build chain setup assistance. For a UE5 MMO with complex build pipelines (client builds, dedicated server builds, editor builds, shader compilation), build failures are frequent and diagnosing them is time-consuming.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| TeamCity AI Build Analyzer (JetBrains) | SaaS/On-prem | 6 | 5 | 9 | 3 (est.) | 4 | 4 | 5.6 | WATCH |

*TeamCity AI: (6 × 0.25) + (5 × 0.20) + (9 × 0.20) + (3 × 0.15) + (4 × 0.10) + (4 × 0.10) = 1.50 + 1.00 + 1.80 + 0.45 + 0.40 + 0.40 = 5.55 → 5.6 ✓*

**Verdict: WATCH.** Four compounding blockers prevent any verdict higher than WATCH:

1. **No DevOps headcount.** There is nobody at CH to deploy, configure, or maintain a CI/CD system. The AI features are a layer on top of infrastructure that does not exist.
2. **CI/CD platform decision not made.** TeamCity AI features are only available if CH chooses TeamCity. This recommendation would prematurely constrain the platform decision.
3. **AI features still in Early Access.** TeamCity AI (AI Assistant, AI Build Analyzer) is part of TeamCity 2026.1 but remains in the Early Access Programme (EAP), not General Availability. Enterprise licence required. AI features "may become a paid option" post-EAP.
4. **Team Adoption Risk at 3 (est.).** With no DevOps hire and engineers already overloaded, adopting a CI/CD platform plus its AI features simultaneously is unrealistic. The CI/CD platform should be adopted first; AI features evaluated 3-6 months after the platform is stable.

**TeamCity AI: Company/Feature Profile**

- **Company:** JetBrains. Private, founded 2000, Prague. One of the most stable developer tooling companies in the industry. Makers of IntelliJ IDEA, WebStorm, Rider.
- **Product:** TeamCity 2026.1 (May 2026). AI features are bundled, not standalone.

**AI features in TeamCity 2026.1:**

1. **AI Assistant:** Chat-based Q&A connected to TeamCity docs, page-context-aware. Cannot modify builds or settings. Powered by GPT-4.1.
2. **AI Build Analyzer ("Analyse it" button):** Reads failed build logs, provides summary, root cause, and fix suggestions. Cloud version can run automatically for every failed build.
3. **MCP Endpoint (GA):** Built-in MCP server exposing build log retrieval, REST GET, and build trigger. Enables external AI agents to interact with TeamCity. This feature IS generally available.
4. **TeamCity CLI (GA):** 60+ commands with AI agent integration via "agent skills". Also generally available.

**Pricing:** Cloud $45/active user/month. On-premises: from $2,399/year (some sources cite $1,999; pricing varies by tier and agent count). AI features: Enterprise licence only (not Professional tier). AI Build Analyzer costs 125 build credits per failed build analysis. Free for <3 build agents (but AI features not confirmed on free tier).

**Who uses it:** JetBrains markets TeamCity to game developers with dedicated UE5 and Unity plugins and Perforce integration. No named game studio case study found for the AI features specifically. TeamCity (pre-AI) is used in game development but is not the market leader for game build pipelines (that would be Jenkins and increasingly GitHub Actions/BuildKite).

**Why WATCH, not a lower priority:** The MCP Endpoint and CLI features (both GA) are architecturally sound: they allow external AI agents (including Claude, Codex) to interact with CI/CD data without vendor lock-in to TeamCity's own AI. This is a more flexible approach than a closed AI assistant. When CH has (a) a DevOps hire, (b) a CI/CD platform decision, and (c) 3-6 months of platform stability, the AI features should be evaluated alongside the platform.

**Revisit conditions:**

1. CH hires a DevOps engineer or CTO with DevOps capability
2. CH selects TeamCity as their CI/CD platform
3. TeamCity AI Build Analyzer graduates from Early Access to full GA (it entered EAP in TeamCity 2025.11 and shipped to Cloud and on-prem in 2026.1, but still carries EAP-era positioning; the MCP Endpoint and CLI are already GA)
4. If all three are met, evaluate for PILOT

**Revisit date:** Q2 2027 (dependent on hire timeline).

**Data Egress:** TeamCity Cloud processes build logs via JetBrains infrastructure. AI Build Analyzer sends build log excerpts to OpenAI (GPT-4.1) for analysis. **Build logs may contain source code paths, error messages referencing proprietary code, and configuration details.** Guardrail: if CH chooses TeamCity On-premises, AI features can be configured to use a self-hosted LLM endpoint via the MCP integration, keeping build data internal. Cloud version sends data to JetBrains + OpenAI.

**Cost Estimate:** N/A (WATCH verdict; no current expenditure recommended). For reference if CH selects TeamCity: Cloud at ~$45/user/mo × 12 engineers × 24 months = ~$12,960 pre-launch for the platform, with AI features included at Enterprise tier.

**Disclosure Impact:** Steam AI disclosure: No. CI/CD tools are internal development infrastructure; they do not generate player-facing content.

---

#### 9.2.2 Infrastructure-as-Code, Incident Response, Cloud Cost Optimisation

**Assessment: Premature.** All infrastructure AI tools (PagerDuty AI, Datadog AI, Kubecost AI, Pulumi AI) require (a) deployed infrastructure to operate on, (b) a DevOps engineer to configure and maintain them, and (c) incident response processes to augment. CH has none of these. These tools will become relevant when CH builds its server infrastructure for the MMO's zone architecture (5 server profiles, 200-600 players per zone), but that is a Phase 3 decision (9-18 months) at the earliest, contingent on multiple hires.

No tool evaluation table is provided. Revisit in the Phase 3 roadmap.

---

### 9.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| No DevOps hire materialises; CI/CD remains ad hoc indefinitely | 3 | 4 | 12 | Flag in CTO job description as a priority. Engineers cannot sustain context-switching into infra alongside game development |
| CI/CD platform chosen without AI feature evaluation | 2 | 2 | 4 | Include AI feature maturity as a secondary criterion in the CI/CD platform evaluation (not primary; choose on core merits first) |
| Build pipeline becomes a bottleneck for UE5 iteration speed without AI-assisted diagnosis | 3 | 3 | 9 | Until DevOps hires, document build failure patterns manually. Build a knowledge base of common UE5 build errors |

### 9.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| CI/CD platform selection | Tool Selection & Licensing | HIGH | Any DevOps AI tool evaluation |
| DevOps hire | N/A (headcount) | HIGH | Any DevOps AI tool adoption |
| Build log data classification (source code paths, configuration) | IP Safeguards | MEDIUM | Before any cloud-based CI/CD AI feature processes build logs |

### 9.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| TeamCity AI Build Analyzer | WATCH | $0 | $0 |
| **DevOps Total** | | **$0** | **$0** |

Note: The CI/CD platform itself is a significant cost (TeamCity Cloud ~$12,960, Jenkins free + infra costs, BuildKite variable). That cost is a DevOps decision, not an AI tooling decision.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 10. GAME DESIGN

### 10.1 Discipline Overview

CH's game design team (~6-8 people) is in transition. Simon Woodruff (Head of Design) started 15 June 2026; his views on AI in design workflows are unknown, and this report does not assume buy-in or resistance. Robin Jubber (Game Director) has been restructured from management to individual contributor; he is not managing the design team. Gary Platner (Head of Level Design) is a US-based freelancer. The game's design complexity is substantial: a free-to-install MMO with subscription + cosmetics monetisation, double-RNG loot system, weapon forging, 5 factions with distinct identities, pressure/crack combat, player housing (User Spaces), and the cosy byte-punk aesthetic. The economy design is particularly complex: F2I subscription, in-game currency stipend, cosmetics marketplace, crafting professions, and dual-currency circulation need simulation before launch to avoid inflation, deflation, or exploit loops. This is where AI-powered design tools add the most value.

### 10.2 Task-Level Analysis

#### 10.2.1 Economy Balancing & Simulation

Simulating resource flows, sink/faucet ratios, progression curves, and monetisation balance for CH's complex MMO economy. Without simulation, economy design relies on intuition and post-launch firefighting; every MMO that launched without economy simulation has needed emergency patches within the first month.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Machinations (Machinations.io) | SaaS | 8 | 8 | 9 | 7 (est.) | 4 | 9 | 7.8 | PILOT |

*Machinations: (8 × 0.25) + (8 × 0.20) + (9 × 0.20) + (7 × 0.15) + (4 × 0.10) + (9 × 0.10) = 2.00 + 1.60 + 1.80 + 1.05 + 0.40 + 0.90 = 7.75 → 7.8 ✓*

**Recommendation: PILOT** Machinations for economy balancing and simulation.

- **Integration timeline:** 1-2 weeks (account setup, initial economy model creation for the core currency loop)
- **Rollout owner:** Simon Woodruff (Head of Design). Simon's 30+ years of experience (Sea of Thieves, Epic R&D) means he can evaluate Machinations against whatever economy design methodology he prefers. If Simon has not started by the time the PILOT is approved, defer to Robin Jubber (Game Director) as interim owner with the explicit expectation that Simon takes over upon arrival.
- **Pilot scope:** 1-3 seats, 3-month trial. Model CH's core economy loop: currency inflow (quest rewards, crafting, dungeon loot, subscription stipend), currency sinks (crafting costs, marketplace fees, cosmetics, repair costs), and the double-RNG loot system. Simulate 10,000+ player-hours to identify inflation/deflation risks.
- **90-day success criteria:** (a) core economy loop modelled and simulated with identifiable sink/faucet imbalances flagged, (b) at least one economy design decision informed by simulation data (not intuition), (c) Simon confirms value of the tool for ongoing balance work, (d) model shared with the broader design team for comment
- **Rollback trigger:** Simon or the design team determines that the visual simulation paradigm does not fit their design methodology, or that spreadsheet modelling (Excel/Google Sheets) achieves equivalent results for CH's economy complexity

**Machinations: Company Profile**

- **Founded:** ~2012, based on Joris Dormans's academic work (PhD, University of Amsterdam, 2012). Commercial SaaS product launched subsequently.
- **Stability:** Long-running product (10+ years in market) with consistent studio adoption. Not venture-funded to the degree that creates burn-rate risk.

**What it does:** Visual game economy simulation. Users build diagrams of resource flows (sources, drains, converters, gates, pools) and run Monte Carlo simulations to model player progression, economy health, and monetisation balance. The tool is purpose-built for game economy design; nothing else on the market does this.

**Borderline AI classification:** Machinations uses simulation and mathematical modelling, not machine learning or neural networks. It is included in this report because it is the best tool for CH's economy design challenge and no ML-based alternative exists for game economy simulation. The tool's value is in computational simulation, not AI generation. This is flagged transparently per the methodology.

**Who uses it:**

- **Ubisoft** (confirmed partnership; 34% production time reduction cited in case study)
- **Gameloft** (economy balancing across mobile titles)
- **Wargaming** (World of Tanks economy)
- **King** (Candy Crush economy balancing)
- These are major studios with complex in-game economies. The production evidence is the strongest of any tool in this report.

**Productivity impact:** ~25-40% time reduction on economy design iteration (estimated, based on Ubisoft case study and the time saved by simulating balance changes vs implementing and testing in-engine). For CH specifically, the value is higher because the economy is unusually complex (subscription + cosmetics + crafting + dual currency + 5 faction economies). Without simulation, CH's economy designers are flying blind until alpha testers break the economy. Uncertainty: LOW for the tool's utility; MEDIUM for the specific time savings at CH's scale.

**Why PILOT, not ADOPT:** Simon Woodruff just started. His design methodology is unknown. Machinations may be exactly what he wants, or he may prefer a different approach. The PILOT respects Simon's autonomy as Head of Design while making the tool available for evaluation.

**Data Egress:** Machinations processes economy models via cloud. Economy models are abstract (resource flows, rates, probabilities); they do not contain partner IP, source code, or sensitive data. Safe for all use cases. The models themselves could theoretically reveal monetisation strategy to a competitor, but Machinations is a reputable platform with standard commercial data protection.

**Cost Estimate:**

- Pre-launch: ~$1,440-$4,320 (Free tier available for 1 seat; paid tiers from ~$20-60/seat/month × 1-3 seats × 24 months) (estimated; confirm current pricing with Machinations)
- Post-launch annual: ~$720-$2,160 (if retained for live economy monitoring and expansion balancing)
- Production-only: No. economy balancing continues post-launch for expansions, seasonal content, and monetisation adjustments

**Disclosure Impact:** Steam AI disclosure: No. Machinations is a design simulation tool; it does not generate player-facing content.

---

#### 10.2.2 Game Research & Market Analysis

AI-assisted research into competitor games, market trends, genre analysis, and GDD creation. For a studio building an MMO in a competitive landscape (WoW, GW2, FFXIV, ESO, failed competitors Palia and Throne & Liberty), systematic market intelligence is valuable.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Ludo.ai | SaaS | 5 | 7 | 8 | 7 (est.) | 6 | 8 | 6.7 | PILOT |

*Ludo.ai: (5 × 0.25) + (7 × 0.20) + (8 × 0.20) + (7 × 0.15) + (6 × 0.10) + (8 × 0.10) = 1.25 + 1.40 + 1.60 + 1.05 + 0.60 + 0.80 = 6.7 ✓*

**Recommendation: PILOT** Ludo.ai for game research and market analysis.

- **Integration timeline:** 1 day (SaaS account setup, no engineering integration required)
- **Rollout owner:** Simon Woodruff (Head of Design). Interim: Robin Jubber (Game Director).
- **Pilot scope:** 1-2 seats (Indie tier), 3-month trial. Use for: competitor analysis (Palia post-mortem, Throne & Liberty retention analysis, Ashes of Creation monitoring), feature ideation (player housing systems across MMOs, crafting progression comparisons), and market trend tracking (cosy game + MMO intersection).
- **90-day success criteria:** (a) design team uses Ludo.ai for at least 3 research tasks that inform design decisions, (b) research output quality meets or exceeds manual research methods, (c) team reports the tool saves time vs manual GDC/store analysis
- **Rollback trigger:** Research outputs are too superficial for CH's needs (CH's competitive analysis requires deep MMO-specific knowledge that Ludo.ai's broader game market database may not capture)

**Ludo.ai: Company Profile**

- **What it does:** AI-powered game research platform. Features include game concept generation, trend analysis, market research, image search across game stores, and game design document creation. Trained on a database of 400K+ games across all platforms and genres.
- **Pricing:** Free (limited queries) / Indie ~$20/mo / Studio $300/mo.

**Who uses it:** Rovio, Ubisoft, Voodoo, SayGames, Homa, Garena. These are established studios using the tool for market research and ideation. The production evidence is solid: real studios making commercial decisions informed by Ludo.ai data.

**Why Capability Fit scores 5, not higher:** Ludo.ai is a research tool, not a design tool. It helps CH understand the market; it does not help CH design game systems. For a studio that needs to design a pressure/crack combat system, 5-faction economy, or player housing architecture, Ludo.ai provides context, not solutions. The tool's value is in the research phase, not the design phase. Capability is scored against "how well does this solve CH's specific problem," and CH's specific problem is designing an MMO, not researching one.

**Data Egress:** Ludo.ai processes text queries via cloud. Research queries ("MMO player housing systems," "cosy game market trends") contain no sensitive data. Do not input: unreleased game features, monetisation strategy details, or partner IP descriptions. Generic market research queries are safe.

**Cost Estimate:**

- Pre-launch: ~$960 (2 Indie seats × $20/mo × 24 months)
- Post-launch annual: ~$480 (if retained for live service competitive monitoring)
- Production-only: Yes; can be dropped at launch if competitive research is no longer a priority

**Disclosure Impact:** Steam AI disclosure: No. Research tool; does not generate player-facing content.

---

#### 10.2.3 Environment Layout & Level Design

See Section 6.2.5 (Art Pipeline) for the full evaluation of **Promethean AI** (WATCH, composite 6.0).

**CH-specific notes for Game Design:** Promethean AI's AI-assisted environment layout from natural language is relevant to both the art team (asset placement and dressing) and the design team (level blockout and gameplay space definition). For the design team specifically, the adoption risk is materially different from the art team.

**CH Game Design scoring for Promethean AI** (cross-ref from §4.2.5; rescored for design team context):

| Dimension | Art Team (§4.2.5) | Design Team | Rationale for difference |
|---|---|---|---|
| Capability Fit | 6 | 6 | Same tool capability |
| Production Readiness | 4 | 4 | Same company |
| IP/Legal Safety | 8 | 8 | Same product |
| Team Adoption Risk | 4 (est.) | 2 (est.) | Gary Platner is a US-based freelancer with unknown AI views; Simon just started; no permanent full-time level design lead to champion |
| Integration Effort | 7 | 7 | Same UE5 plugin |
| Cost Efficiency | 8 | 8 | Same pricing |

Design team composite: (6 × 0.25) + (4 × 0.20) + (8 × 0.20) + (2 × 0.15) + (7 × 0.10) + (8 × 0.10) = 1.50 + 0.80 + 1.60 + 0.30 + 0.70 + 0.80 = 5.7. Verdict: **WATCH** (unchanged; compounded by 3-employee company risk and zero production evidence).

The design team should not depend on Promethean AI for production level design.

---

#### 10.2.4 AI Playtesting for Balance

See Section 11.2.1 (QA & Testing) for the full evaluation of **modl.ai** (PILOT, contingent on QA expansion).

**CH-specific notes for Game Design:** modl.ai's playtesting bots are relevant to game design for balance testing: simulating thousands of player-hours to identify whether the pressure/crack combat system produces emergent exploits, whether faction populations self-balance, and whether progression curves create choke points. The design team consumes modl.ai's output (balance reports) but does not operate the tool directly; Hannah (QA) or a future QA vendor would run the tests. No additional design team seats are needed.

---

### 10.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| Economy launches without simulation; post-launch inflation/deflation crisis | 3 | 5 | 15 | Machinations PILOT specifically targets this risk. If Machinations is rejected, CH must simulate using spreadsheets (slower but achievable) |
| Simon Woodruff rejects AI tools for game design (views unknown) | 3 | 3 | 9 | PILOT scope is non-disruptive (research and simulation tools, not design-replacement). Simon evaluates tools on his terms. Respect his methodology |
| Game design decisions made on AI tool outputs without human verification | 2 | 4 | 8 | All AI-informed decisions require human design review. Machinations outputs are inputs to design discussions, not automated decisions |
| Ludo.ai research is too shallow for MMO-depth competitive analysis | 3 | 2 | 6 | Ludo.ai supplements, not replaces, deep manual research. If output quality is insufficient, cancel after PILOT |

### 10.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| AI Acceptable Use Policy v1 (game design section) | Usage Policy & Governance | MEDIUM | Machinations and Ludo.ai PILOTs |
| Approved AI tool list (game design category) | Tool Selection & Licensing | MEDIUM | Machinations and Ludo.ai PILOTs |
| Economy model confidentiality classification | IP Safeguards | LOW | Before economy models are stored in cloud tools (Machinations) |

### 10.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| Machinations (1-3 seats) | PILOT | ~$1,440-$4,320 (estimated; confirm with vendor) | ~$720-$2,160 |
| Ludo.ai (2 Indie seats) | PILOT | ~$960 | ~$480 |
| Promethean AI | WATCH (cross-ref §4.2.5) | $0 | $0 |
| **Game Design Total** | | **~$2,400-$5,280** | **~$1,200-$2,640** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 11. QA & TESTING

### 11.1 Discipline Overview

CH's QA function is a single person: Hannah, who has been elevated to "primary ship-readiness arbiter with hard authority to block gate progression." This is simultaneously a recognition of QA's importance and a structural vulnerability. Hannah cannot absorb AI testing pilot overhead alongside her existing workload. A QA vendor pipeline is being planned but not yet in place. Any AI QA tool recommendation must account for this capacity constraint: the tool must either (a) reduce Hannah's workload rather than adding to it, or (b) wait until QA capacity expands. The owner-capacity rule applies: ADOPT is not possible with one overloaded QA resource, regardless of how good the tool is.

### 11.2 Task-Level Analysis

#### 11.2.1 Automated Gameplay Testing, Regression & Exploit Detection

AI-powered bot testing that simulates thousands of player-hours: automated exploration, regression testing across builds, exploit detection (players finding unintended shortcuts in combat, economy, or zone transitions), and crash detection. For a game targeting 200-300 concurrent players per zone with 5 faction systems, a pressure/crack combat system, and a complex economy, manual testing by one person is fundamentally insufficient for ship-readiness.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| modl.ai | SaaS/Plugin | 9 | 5 | 8 | 3 (est.) | 7 | 4 | 6.4 | PILOT (contingent) |

*modl.ai: (9 × 0.25) + (5 × 0.20) + (8 × 0.20) + (3 × 0.15) + (7 × 0.10) + (4 × 0.10) = 2.25 + 1.00 + 1.60 + 0.45 + 0.70 + 0.40 = 6.4 ✓*

**Recommendation: PILOT** modl.ai, contingent on QA expansion (vendor onboarding or additional QA hire).

- **Integration timeline:** 2-4 weeks (plugin installation, initial game instrumentation, bot training on CH's combat and zone systems). modl.ai's "integrationless testing" pivot (visual AI + OCR, no SDK/plugin needed) may reduce this to 1-2 weeks for basic exploration testing.
- **Rollout owner:** Hannah (QA Lead), with explicit capacity dependency: the PILOT MUST NOT start until either (a) a QA vendor is onboarded to handle manual testing, freeing Hannah to focus on AI QA tooling, or (b) an additional QA hire is in post. Hannah's time is fully committed to manual testing; adding modl.ai evaluation would compromise ship-readiness quality.
- **Pilot scope:** 1 modl.ai subscription, 3-month trial. Focus: automated exploration testing (bot explores zones, reports crashes, stuck states, and out-of-bounds exploits). Do NOT attempt balance testing or exploit detection in the initial PILOT; those require more sophisticated bot training and CH's combat system must be further along.
- **90-day success criteria:** (a) bots successfully explore 3+ zones without human intervention, (b) at least 5 bugs discovered by bots that were not found in manual testing, (c) Hannah confirms the tool reduces her regression testing burden (not adds to it), (d) false positive rate documented (bots flagging non-issues)
- **Rollback trigger:** Integration requires ongoing engineering support that diverts engineers from game development, or Hannah reports the tool adds more overhead than it removes, or modl.ai's pricing exceeds CH's QA tooling budget once confirmed

**modl.ai: Company Profile**

- **Founded:** 2018, Copenhagen. CEO Christoffer Holmgard (PhD in AI, co-owner and Chair of Die Gute Fabrik; see conflict note below).
- **Co-founders:** Benedikte Mikkelsen, Lars Henriksen, Sebastian Risi, Julian Togelius, Georgios Yannakakis (a strong academic pedigree in game AI research).
- **Funding:** EUR 8.5M / $8.4M Series A (November 2022), co-led by Griffin Gaming Partners and M12 (Microsoft). Total: $10.8M across 4 rounds. $29M valuation (2022).
- **Employees:** ~18 (declining from 22 over two years). CB Insights Top 100 AI Companies (2021).
- **RISK:** Declining headcount and no funding round since 2022 (3.5 years). $10.8M total with an 18-person team provides runway, but the trajectory is concerning. Monitor quarterly.

**What it does:** AI playtesting bots for automated QA. Three products: modl:test (automated QA and regression), modl:play (player behaviour simulation), modl:create (match-3 level design, not relevant to CH). Recent pivot to "integrationless testing": visual AI + OCR that requires no SDK or plugin integration. This is significant for CH because it means basic exploration testing could start without engineering time to build a plugin integration. UE5 plugin available for deeper integration. Unity Verified Solutions Partner. PlayStation Tools and Middleware Programme.

**Limitation:** Fast-paced and timing-critical gameplay "not yet fully supported." CH's pressure/crack combat system (tight hit-frame timing at 30Hz) may fall into this category. The PILOT should test bot behaviour in combat scenarios specifically; if bots cannot interact with the combat system reliably, the tool's value is limited to non-combat exploration and regression testing.

**CRITICAL CORRECTION: Sea of Thieves / Rare is NOT a modl.ai customer.** The seed list cited Rare (Sea of Thieves) as a modl.ai customer. This is incorrect. modl.ai published a blog post titled "5 Winning Automated Game Testing Tactics From Sea of Thieves" which analyses Rare's OWN in-house automated testing framework (documented in GDC talks from 2017-2019). Rare built their own system. modl.ai's blog is editorial content, not a customer case study. **Do not cite Rare as a modl.ai customer.**

**Verified customers:**

- **Die Gute Fabrik** (Saltsea Chronicles): modl.ai CEO co-owns and chairs this studio. This is a conflict of interest. The case study is real but the business relationship is not arm's-length.
- **Playing Plate Games** (Forge and Fight): multiplayer fighting game. Used modl.ai bots for multiplayer testing.
- **Good Game Entertainment** (match-3 title): used modl:create for level design.
- **Riot Games:** research collaboration, not production deployment.

**What users say:** Limited public user feedback. The customer list is short and the most prominent citation (Die Gute Fabrik) has the conflict-of-interest concern. The modl.ai technology is well-regarded in game AI research circles (strong academic founders), but commercial validation is thin.

**Productivity impact:** ~50-80% reduction in manual regression testing time (estimated, based on modl.ai's claim of "10,000+ simulated hours" and the general efficiency of automated exploration over manual walkthrough). For CH specifically with one QA person, even a modest automated testing capability has outsized value: Hannah cannot manually explore all 5 faction zones, all enemy archetypes, all quest chains, all crafting systems, and all combat interactions across builds. The tool does not replace Hannah; it gives her coverage she physically cannot achieve alone. Uncertainty: MEDIUM for exploration/regression; HIGH for combat-specific testing given the "fast-paced gameplay not fully supported" limitation.

**Pricing:** Not publicly available. CEO cited $2,500/month in a 2022 interview (may be outdated). Third-party aggregator sites list $0/$99/custom tiers, but these are likely template-generated and unreliable. **Pricing is estimated; request current pricing directly from modl.ai before committing to PILOT budget.** Cost Efficiency scored at 4 reflects the likely enterprise-tier pricing for an 18-person startup selling to game studios.

**Data Egress:** modl.ai's integrationless testing processes game video/screenshots via cloud (visual AI + OCR). This means the tool sees CH's game visuals. **Partner IP appearing in game visuals (partner game assets, crossover characters) would be visible to modl.ai's cloud processing.** Guardrail: during the initial PILOT, restrict bot testing to zones and content that do not contain partner IP. For the deeper plugin integration, modl.ai processes game state data (positions, interactions, states); apply the same partner IP exclusion.

**Cost Estimate:**

- Pre-launch: ~$60,000 (estimated at ~$2,500/mo × 24 months; actual pricing TBD) (estimated; request current modl.ai pricing)
- Post-launch annual: ~$30,000 (if retained for live service regression and exploit detection)
- Production-only: No. QA testing continues post-launch for patches, expansions, and live service content

**Disclosure Impact:** Steam AI disclosure: No. QA testing is a development-side activity; AI bots do not generate player-facing content. modl.ai outputs are test reports, not shipped assets.

---

#### 11.2.2 Accessibility Compliance Testing

Automated accessibility testing: WCAG audit, colour contrast analysis (critical for the byte-punk palette's high-contrast neon-on-dark aesthetic), screen reader compatibility, input remapping verification, and platform-specific accessibility certification (Xbox Accessibility Guidelines, PlayStation Accessibility Guidelines).

**Assessment: No specialist AI game accessibility testing tool exists.**

The available options are:

1. **axe DevTools / Deque Systems:** Industry-standard automated WCAG testing, but designed for web applications, not game UIs. Can test in-game menus rendered as HTML/web views, but cannot test 3D gameplay, in-world UI, or HUD elements.
2. **Colour Oracle / WCAG contrast checkers:** Free tools for simulating colour blindness and checking contrast ratios. Essential for the byte-punk palette but not AI-powered.
3. **Xbox Accessibility Testing App (XATApp):** Microsoft's automated testing tool for Xbox Accessibility Guidelines (XAGs). Platform-specific, not AI-powered, but required for console certification.
4. **Manual testing with assistive technology:** Screen readers, switch controls, eye-tracking devices. Cannot be automated with current AI tools.

No tool evaluation table is provided. This is a manual discipline supplemented by non-AI automated tools (contrast checkers, XATApp). CH should:

1. Include accessibility testing in Hannah's QA process from the earliest testable builds
2. Use colour contrast tools to validate the byte-punk palette meets WCAG AA standards
3. Plan for platform certification testing (Xbox, PlayStation) closer to submission

**Revisit when:** An AI tool emerges that can automatically test game accessibility (3D gameplay, HUD readability, input systems). This is an underserved market.

---

**Also considered: GameDriver** ([gamedriver.ai](https://gamedriver.ai/)). GameDriver offers AI-maintained test automation with a QaaS (QA-as-a-Service) delivery model: their engineers write and run the test plan for your title, with AI maintaining tests as the game changes. UE5 support confirmed (4.27, 5.1-5.4), PS5 support, and integration with Unreal's Automation Testing Framework. However: 9 employees, ~$7.4-7.9M funding, and no publicly named game customers (some clients require confidentiality, but no verifiable "Studio X shipped Game Y using GameDriver" evidence exists). Pricing starts at $150/month (Starter) with node-locked licences at $267/month. The QaaS model is genuinely differentiated from modl.ai's bot-based approach, but the team size and lack of production citations make it a higher vendor risk than modl.ai. **WATCH.** Revisit if GameDriver publishes named game citations or grows beyond its current 9-person team. Revisit date: Q1 2027.

---

### 11.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| Hannah cannot absorb modl.ai PILOT overhead; QA quality degrades | 4 | 4 | 16 | PILOT MUST NOT start until QA capacity expands (vendor or hire). This is a hard dependency, not a suggestion |
| modl.ai's combat testing limitation means bots cannot test the pressure/crack system | 3 | 3 | 9 | PILOT initially targets exploration/regression testing only. Combat testing evaluated separately once bots demonstrate basic competence |
| Byte-punk palette fails WCAG contrast requirements; accessibility rework needed late | 3 | 4 | 12 | Test contrast ratios early with non-AI tools. Catch palette issues in art pre-production, not in QA |
| modl.ai declines (declining headcount, no funding since 2022) and ceases operations | 2 | 3 | 6 | PILOT-only exposure. No production dependency. Automated testing insights (bug reports) are owned by CH |
| Die Gute Fabrik conflict of interest undermines trust in modl.ai's case studies | 1 | 2 | 2 | Disclosed in this report. Evaluate the tool on CH's own PILOT results, not vendor case studies |

### 11.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| QA capacity expansion plan (vendor or hire) | N/A (headcount/vendor) | CRITICAL | modl.ai PILOT; hard blocker |
| AI Acceptable Use Policy v1 (QA section) | Usage Policy & Governance | HIGH | modl.ai PILOT |
| Approved AI tool list (QA category) | Tool Selection & Licensing | MEDIUM | modl.ai PILOT |
| Game build data classification (which builds/zones contain partner IP) | IP Safeguards | HIGH | Before modl.ai processes game visuals or state data |
| Accessibility testing standards and acceptance criteria | Production Integration | HIGH | Before testable builds are available |

### 11.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| modl.ai | PILOT (contingent) | ~$60,000 (estimated; confirm with modl.ai) | ~$30,000 |
| **QA Total** | | **~$60,000** | **~$30,000** |

Note: modl.ai pricing is estimated based on a 2022 CEO quote. Actual pricing may differ substantially. Request current pricing from modl.ai before budget approval.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 12. NARRATIVE & LOCALISATION

### 12.1 Discipline Overview

CH's narrative function (~2-3 people) lacks a Head of Narrative; the hire is needed but not yet in the pipeline. Maria Cibej (Narrative Designer) has a role conflict with Yorgos over quest design ownership. The team is too small and too structurally incomplete to adopt any new tool that requires a champion. The owner-capacity rule blocks ADOPT for any narrative AI tool. Additionally, three non-negotiable constraints shape this entire section: (1) SAG-AFTRA / Equity compliance applies to any AI tool that generates or processes voice performance data; (2) Steam's Live-Generated disclosure is required for any runtime AI dialogue; (3) the MMO community is hypersensitive to AI-generated NPC dialogue, making community backlash a material business risk. The honest assessment: the NPC dialogue AI category is not ready for CH. All three evaluated tools receive WATCH verdicts. Localisation tools are excellent but premature (Year 2+ need). This section contains no ADOPT or PILOT recommendations.

### 12.2 Task-Level Analysis

#### 12.2.1 AI NPC Dialogue & Dynamic Characters

Runtime AI-powered NPC dialogue: characters with personality, memory, goals, and contextual responses. For a cosy byte-punk MMO with 5 factions, player housing, social gameplay, and quest NPCs, dynamic NPC dialogue is a compelling feature. The question is whether the technology is ready, whether the risks are manageable, and whether CH has the team to own it.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Inworld AI | SaaS | 5 | 4 | 5 | 3 (est.) | 7 | 5 | 4.7 | WATCH |
| Charisma.ai | SaaS | 7 | 4 | 6 | 4 (est.) | 6 | 7 | 5.7 | WATCH |
| Convai | SaaS | 6 | 3 | 5 | 3 (est.) | 6 | 7 | 4.9 | WATCH |

*Inworld AI: (5 × 0.25) + (4 × 0.20) + (5 × 0.20) + (3 × 0.15) + (7 × 0.10) + (5 × 0.10) = 1.25 + 0.80 + 1.00 + 0.45 + 0.70 + 0.50 = 4.7 ✓*
*Charisma.ai: (7 × 0.25) + (4 × 0.20) + (6 × 0.20) + (4 × 0.15) + (6 × 0.10) + (7 × 0.10) = 1.75 + 0.80 + 1.20 + 0.60 + 0.60 + 0.70 = 5.65 → 5.7 ✓*
*Convai: (6 × 0.25) + (3 × 0.20) + (5 × 0.20) + (3 × 0.15) + (6 × 0.10) + (7 × 0.10) = 1.50 + 0.60 + 1.00 + 0.45 + 0.60 + 0.70 = 4.85 → 4.9 ✓*

**Verdict: ALL WATCH.** No NPC dialogue AI tool is recommended for adoption or pilot at this time.

**Why the entire category is WATCH:**

The category has five compounding problems that no individual tool overcomes:

1. **No shipped game.** None of the three tools has been used in a commercially launched game. Demos, prototypes, and partnerships have been announced, but no player has purchased a game where NPC dialogue is powered by these tools. This is a category without production validation.

2. **No Head of Narrative.** CH has no one to own a rollout. Maria Cibej cannot absorb tool evaluation alongside her existing workload, and the role conflict with Yorgos means neither is in a position to champion a new paradigm.

3. **SAG-AFTRA / Equity.** All three tools offer or integrate with text-to-speech for NPC voice. The 2025 Interactive Media Agreement requires consent, disclosure, and compensation for AI voice performance. UK Equity has parallel demands. None of the three tools have published SAG-AFTRA compliance statements. Compliance burden falls entirely on the studio. Using AI-voiced NPCs without union clearance exposes CH to grievance proceedings, negative publicity, and talent boycott risk.

4. **Steam Live-Generated disclosure.** Runtime AI dialogue triggers Steam's Live-Generated AI content disclosure. This is a visible marker on the Steam store page. For an MMO community already hypersensitive to AI content, this disclosure invites scrutiny and potential backlash.

5. **Community perception.** MMO players have review-bombed studios over AI-generated marketing imagery. AI-generated NPC dialogue is a more intimate form of AI content; players interact with NPCs directly. The risk of community backlash is not hypothetical.

---

**Charisma.ai: Company Profile (highest composite among NPC tools)**

- **Company:** Charisma Entertainment Ltd (formerly To Play For Ltd). Founded ~2015, Oxford, UK.
- **CEO:** Guy Gadney (co-founder; background in BBC, Penguin Books, television).
- **CRITICAL: CTO departed.** Co-founder/CTO Ben Salili-James left for Suvera (healthcare). Two directors resigned on the same day (January 2024). This is a significant leadership loss.
- **CEO focus splitting:** Gadney launched a separate company "Charismatic.ai" for microdramas (June 2025). Running two companies simultaneously raises questions about Charisma.ai's strategic focus.
- **Employees:** ~15-18. $2M ARR. ~$650K raised (accelerators/grants + small seed). Effectively bootstrapped.
- **Valuation:** $5.9M (GetLatka, self-reported).
- **Stability indicators declining:** CBInsights Mosaic score dropped 41 points. CTO departure, director resignations, and CEO focus splitting are compounding red flags.

**What it does:** Graph-based visual story editor (no-code) with 13 node types. Hybrid model: scripted narrative paths plus LLM-powered improvisation (Claude/GPT/Llama, 150 token cap on improvisation). Emotion Engine with 12 emotional states (Ekman model), mood and relationship tracking. Memory system: 5 types (word, sentence, decision, counter, boolean), playthrough-scoped. 1,000+ TTS voices via multiple providers (AWS, Cereproc, Deepgram, Google, Kokoro, Resemble on Pro; ElevenLabs on Enterprise only). UE5 5.2+ SDK (MIT licence, open source on GitHub). Unity SDK. Both last updated September 2025.

**Who uses it:**

- **Sky:** Strongest relationship. 3+ projects: Bulletproof interactive (2020, on Sky.com), Sky Live pilot, The Rope (interactive drama with XR Stories). These are TV/media projects, not games.
- **BBC:** R&D pilots via MakerBox/Taster programme. Not mainstream commissions.
- **Warner Bros:** Steppenwolf at SXSW 2022. Conference demo, not shipped product.
- **DreamWorks:** Mama Luna's Cat Rescue (Puss in Boots DVD tie-in).
- **Their own game: The Kraken Wakes** (April 2023, PC). **56/100 Steam score, 18 reviews, 20-50K owners.** This is the company's own showcase game, and it performed modestly.
- **Keywords Studios:** Channel partnership (February 2024), not evidence of AAA adoption.
- **Epic MegaGrant** recipient (2022) for MetaHumans integration.
- **No confirmed AAA game shipped with Charisma.ai.**

**SAG-AFTRA:** No public compliance statements. Charisma docs contain zero mentions of SAG-AFTRA, union compliance, or voice actor licensing. Sky's Bulletproof used Resemble.ai voice cloning from actor recordings. Compliance burden falls entirely on the studio using the tool.

**Pricing:** Credit-based. Bundles: $5/50K credits, $20/200K, $100/1M, $500/5M. 12-month expiry. 50K credits ≈ 200 experience minutes. Free trial: 1 month, 50K credits, no permanent free tier. Enterprise: custom (one-off dev fee + fixed monthly platform fee).

**Why Charisma.ai scores highest among the three:** The graph-based narrative editor with scripted paths plus bounded LLM improvisation (150 token cap) is the most controllable approach. Designers author the narrative structure; the LLM only fills gaps within defined boundaries. This is safer than fully generative dialogue. The UE5 SDK is MIT-licensed and open source, reducing vendor lock-in risk. But the company's stability (CTO departure, CEO splitting focus, declining Mosaic score) prevents a PILOT recommendation.

**Revisit conditions:** (a) CH hires a Head of Narrative who actively wants to evaluate AI dialogue tools, (b) Charisma.ai demonstrates company stability (new CTO hire, focused strategy, sustained revenue growth), (c) a shipped game uses Charisma.ai for production NPC dialogue with positive reception, (d) SAG-AFTRA compliance path is clarified. **Revisit date:** Q2 2027.

---

**Inworld AI: Why WATCH**

- **Company:** Founded ~2021, Mountain View, CA. CEO Kylan Gibbs (ex-Google Dialogflow, ex-DeepMind). $120-133M total raised. $500M valuation (August 2023 Series B led by Lightspeed). No new funding since August 2023. 107 employees. SOC 2 Type II, GDPR, HIPAA compliant.

**CRITICAL: Inworld has broadened beyond game-specific NPC tooling.** As of mid-2026, Inworld positions itself as "the realtime AI company" for voice AI infrastructure broadly, deprioritising game-specific features. The npc.ai product has been taken down. The homepage barely mentions games. The Xbox/Microsoft multi-year partnership (November 2023) produced no visible output. GDC demos with Ubisoft and NVIDIA were prototypes, not shipping products. No confirmed shipped commercial game uses Inworld for production NPC AI.

**The category leader has broadened its focus.** Inworld was the best-funded, best-known NPC AI company, and they have repositioned toward general voice AI infrastructure, deprioritising game-specific development. This is the most significant finding in the narrative tool assessment.

**Technology:** Custom SpeechLM (neural audio codec + LLM), Realtime TTS-2 (sub-200ms latency), 220+ model routing. UE5 multi-plugin SDK, Unity SDK, Node.js SDK. The technology is strong; the strategic direction is the problem.

**Pricing:** On-Demand: free ($25/1M chars TTS). Creator $25/mo. Builder $100/mo. Developer $300/mo. Growth $1,500/mo. Enterprise custom. LLM costs: pass-through at provider rates. $5/GPU-hour for dedicated compute.

**Additional concerns:**

- Hosted copyrighted character chatbots (Nintendo Bowser, Pokemon Pikachu, Sony IP) before these were taken down, raising questions about IP governance.
- "Partners" (NetEase, Niantic, Xbox, Ubisoft, NVIDIA, Disney) all appear to be demo/prototype stage with no commercial output.

**Capability scored at 5, not higher:** Despite strong technology, the broadening beyond gaming means the product roadmap is no longer optimised for game NPCs. Investment in game-specific features (emotion systems, quest integration, game-state awareness) is likely to decline as the company pursues broader voice AI markets.

**SAG-AFTRA:** Inworld's Realtime TTS-2 generates voice from text. No SAG-AFTRA compliance statement found. Any deployment using Inworld's voice features for NPC dialogue would require union compliance assessment by Dino (General Counsel) and Saybrook Legal before any consideration.

**Revisit conditions:** Inworld recommits to gaming with a dedicated game NPC product and a shipped title. Current trajectory suggests this is unlikely. **Revisit date:** Q4 2027 if any game ships with Inworld.

---

**Convai: Why WATCH**

- **Company:** Founded April 2022, San Jose. CEO Purnendu Mukherjee (ex-NVIDIA, built first 3D avatar chatbot). $5M seed (December 2022, Dune Ventures co-led). Only round. ~41-43 employees. $6.5M ARR reported (GetLatka, June 2024; unverified). ISO 27001 certified.

**Persistent technical issues:** 8-10 second latency documented since January 2025. SDK 3.6.9-hotfix-2 broke long-term memory. "Good platform, unstable backend" (2026 user review). For an MMO where NPC interactions need to feel responsive (players will not wait 8-10 seconds for an NPC to respond), the latency alone is disqualifying at current performance.

**Hidden pricing structure:** Indie Dev tier ($29/mo) advertises 3,000 interactions, but only 1,500 use the flagship LLM; the remaining 1,500 auto-downgrade to a cheaper model. This is not prominently disclosed. Full pricing: Free (~4K interactions). Gamer $9/mo. Indie Dev $29/mo. Professional $99/mo. Scale $499/mo. Business $1,199/mo. Enterprise custom.

**Technology:** Real-time conversational AI NPCs. Knowledge Bank (RAG), Scene Perception (3D spatial awareness), long-term memory (when working), NPC-to-NPC interaction, action callbacks. 65+ languages, 500+ voice options (claimed). NVIDIA ACE integration (Audio2Face, Riva ASR). Cloud-only on standard plans; no edge or local inference.

**Production Readiness at 3 triggers the sensitivity floor** (NPC dialogue is shipped content). Maximum verdict: WATCH regardless of composite.

**Verified production evidence:**

- **Second Life (Linden Lab):** Character Designer alpha (December 2024). AI NPCs for onboarding. Alpha stage.
- **Stormgate (Frost Giant):** "Exploring" AI characters. Demo at GDC 2024. Exploration, not production.
- **NVIDIA:** ACE demos (Kairos). Inception programme.
- **No confirmed shipped game.**
- **Community:** ~3,137 Discord members (2026).

**SAG-AFTRA:** Convai offers 500+ voice options via cloud, 65+ languages. No SAG-AFTRA compliance statement found. Same union compliance requirements as Charisma.ai and Inworld.

**Revisit conditions:** (a) Latency consistently below 2 seconds, (b) long-term memory stability resolved, (c) a shipped game uses Convai for NPC dialogue. **Revisit date:** Q2 2027.

---

#### 12.2.2 Quest & Dialogue Drafting / Lore Consistency

AI-assisted writing of quest text, dialogue trees, item descriptions, and lore entries; AI-powered lore consistency checking across the game's narrative corpus.

**Assessment: No specialist game narrative AI tool exists for this task.**

General-purpose LLMs (Claude, GPT) can draft dialogue and check consistency, but they are not game-specialist tools and are excluded from this report's scope for tasks where specialist tools exist. For quest and dialogue drafting, no specialist tool exists. The available options:

1. **Articy:draft (Nevigo):** Industry-standard game narrative authoring tool with branching dialogue, characters, and variables. NOT AI-powered. Already suitable for CH and should be evaluated regardless of AI considerations.
2. **Ink (Inkle Studios):** Open-source narrative scripting language. NOT AI-powered.
3. **LLMs for drafting:** Claude or GPT can generate draft dialogue given character profiles, tone guides, and lore documents. This is a valid use case for general-purpose LLMs, but requires a Head of Narrative to define guardrails (tone, lore constraints, character voice consistency) and review all output.

No tool evaluation table is provided. This is a task best served by (a) hiring a Head of Narrative who defines the voice and guardrails, (b) adopting a narrative authoring tool (Articy:draft or equivalent), and (c) optionally using general-purpose LLMs for first-draft generation under human editorial control. AI-generated quest dialogue shipped to players triggers Steam disclosure and community perception risks; any LLM-drafted text must be fully rewritten by human writers before shipping.

---

#### 12.2.3 Localisation: Translation & Terminology Management

AI-assisted translation, translation memory, terminology management, and QA for localisation. CH's game will need localisation for non-English markets, but this is a Year 2+ need: the game's launch target is late 2028, and localisation typically begins 12-18 months before launch (earliest: mid-2027). Both tools evaluated here are mature, well-adopted, and strongly recommended when the time comes.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| memoQ (Kilgray) | Desktop/SaaS | 7 | 8 | 9 | 6 (est.) | 6 | 6 | 7.3 | WATCH (Year 2+) |
| Phrase TMS | SaaS | 7 | 8 | 9 | 6 (est.) | 6 | 4 | 7.1 | WATCH (Year 2+) |

*memoQ: (7 × 0.25) + (8 × 0.20) + (9 × 0.20) + (6 × 0.15) + (6 × 0.10) + (6 × 0.10) = 1.75 + 1.60 + 1.80 + 0.90 + 0.60 + 0.60 = 7.25 → 7.3 ✓*
*Phrase TMS: (7 × 0.25) + (8 × 0.20) + (9 × 0.20) + (6 × 0.15) + (6 × 0.10) + (4 × 0.10) = 1.75 + 1.60 + 1.80 + 0.90 + 0.60 + 0.40 = 7.05 → 7.1 ✓*

**Verdict: WATCH both.** Not because the tools are deficient (they are excellent), but because CH does not need localisation tools until ~mid-2027 at the earliest. Both score well and should be evaluated competitively when localisation planning begins.

**memoQ: Company Profile**

- **Developer:** Kilgray Translation Technologies. Founded 2004, Budapest, Hungary. Now part of memoQ Zrt.
- **Product:** Translation management system with AI-assisted translation, translation memory, term bases, and QA checks. Gaming Bundle includes integration with Gridly (game string management) and Voiseed (AI voice localisation).
- **Pricing:** Translator Pro from ~$30-44/mo. Server licences for team use are higher.

**Who uses it:**

- **Gameloft:** 30% productivity boost in localisation workflows (cited in case study).
- **Epic Games:** confirmed user.
- Industry-standard in professional translation; broadly adopted across gaming, software, and enterprise localisation.

**Phrase TMS: Company Profile**

- **Developer:** Phrase (formerly Memsource). Founded 2010, Prague. Acquired by Phrase in 2022.
- **Product:** Cloud-based TMS with AI translation, quality estimation, and workflow automation.
- **Pricing:** From ~$525/mo for team plans.

**Who uses it:** Bohemia Interactive, GameHouse, Mixi. Strong in gaming localisation with established integrations.

**Why memoQ and Phrase are functionally equivalent for CH:** Both score within 0.2 composite points. The difference is Cost Efficiency (memoQ at 6, Phrase at 4, reflecting Phrase's higher team-tier pricing). At the time of evaluation (mid-2027), CH should request trials of both and select based on: (a) integration with CH's string management pipeline (likely Gridly or a Unreal-native solution), (b) pricing at CH's scale (volume of localisable strings), (c) linguist network compatibility (which tool CH's localisation vendor prefers).

**SAG-AFTRA / Equity note for localisation:** Localisation of voice performance (dubbing, lip-sync) is covered by union agreements. AI-assisted translation of text strings is not. memoQ's Voiseed integration for AI voice localisation requires the same SAG-AFTRA/Equity compliance analysis as any voice AI tool. Text translation is safe; voice localisation is not.

**Data Egress:** Both tools process game text strings via cloud. Game strings contain narrative content (quest text, NPC dialogue, item descriptions, UI labels). These are not partner IP in most cases, but unreleased lore or narrative spoilers could be sensitive pre-launch. Guardrail: localisation strings are inherently pre-release content; both memoQ and Phrase have standard confidentiality protections for translation clients. Partner IP references in game strings (crossover character names, partner game titles) would be visible to the translation tool and any contracted translators.

**Cost Estimate:** N/A for current spend (WATCH verdict; Year 2+ tool). For budget planning when localisation begins: memoQ ~$5,000-15,000/year depending on team size and server licence; Phrase from ~$6,300/year for team plan (estimated; confirm at CH's projected scale when localisation begins).

**Disclosure Impact:** Steam AI disclosure: Pre-Generated if AI-translated text ships without human review. Standard localisation practice (machine translation + human post-editing) is industry norm and not controversial. Disclose AI-assisted translation per Steam requirements.

---

### 12.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| Community backlash if AI-generated NPC dialogue is detected in the game | 4 | 5 | 20 | ALL NPC dialogue tools are WATCH. No AI dialogue ships without Head of Narrative hire, SAG-AFTRA clearance, and community communication strategy |
| SAG-AFTRA/Equity grievance over AI voice in NPC dialogue | 3 | 5 | 15 | No AI voice tool adopted. All voice performance by human actors with proper contracts. TTS for prototyping only, never shipped |
| Head of Narrative hire delayed; narrative quality suffers regardless of tools | 3 | 4 | 12 | Flag in hiring pipeline. Narrative tools (AI or not) require a human narrative director |
| NPC dialogue AI category matures; CH falls behind competitors | 2 | 3 | 6 | WATCH verdicts include revisit dates. 6-monthly category review captures improvements. CH's late 2028 launch provides time |
| Localisation planning starts too late; launch language coverage insufficient | 2 | 4 | 8 | Begin localisation vendor evaluation by Q1 2027. Tool selection (memoQ/Phrase) by Q2 2027. String extraction pipeline by Q3 2027 |

### 12.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| SAG-AFTRA/Equity compliance framework for AI voice | IP Safeguards | CRITICAL | Before ANY tool that generates or processes voice performance is evaluated, even at PILOT |
| AI-generated content community communication strategy | Usage Policy & Governance | HIGH | Before any AI-generated narrative content is considered for shipping |
| Head of Narrative hire | N/A (headcount) | HIGH | Before any narrative AI tool adoption |
| Steam Live-Generated disclosure assessment | IP Safeguards | HIGH | Before any runtime AI dialogue feature is considered |
| Approved AI tool list (narrative category) | Tool Selection & Licensing | MEDIUM | When NPC dialogue tools revisited |
| Localisation vendor selection | Tool Selection & Licensing | MEDIUM | By Q1 2027 (drives tool choice) |
| Localisation string extraction pipeline | Production Integration | MEDIUM | By Q3 2027 |

### 12.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| Inworld AI | WATCH | $0 | $0 |
| Charisma.ai | WATCH | $0 | $0 |
| Convai | WATCH | $0 | $0 |
| memoQ | WATCH (Year 2+) | $0 (evaluate from Q2 2027) | ~$5,000-$15,000 when adopted |
| Phrase TMS | WATCH (Year 2+) | $0 (evaluate from Q2 2027) | ~$6,300+ when adopted |
| **Narrative & Localisation Total** | | **$0** | **$0** (until localisation begins ~2027) |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 13. PRODUCTION & PROJECT MANAGEMENT

### 13.1 Discipline Overview

CH's production function is led by Valeria Trofimova (Head of Production), supported by Fred Dossola (Art Producer, started June 2026; Sony and Cloud Imperium Games background, known for an incremental "orthodontist approach" to change) and Graham (Executive Producer, in probationary assessment with early behavioural concerns). The studio runs an Agilefall methodology (agile sprints within waterfall milestone gates) using Jira, Confluence, and Slack, all fully remote across UK and Greece.

### 13.2 Task-Level Analysis

Production and project management is the first discipline in this report where **no specialist AI tool exists** for game development. The tasks where AI could theoretically add value (scheduling optimisation, risk prediction, dependency analysis, meeting summarisation, status reporting) are served by AI features embedded in existing infrastructure platforms, not by standalone AI tools.

#### 13.2.1 Scheduling, Risk Prediction, and Dependency Analysis

No specialist AI tool exists for game production scheduling or risk prediction that meets the evaluation criteria (genuinely AI/ML, specialist to game development, evidence of studio adoption). The products that market AI capabilities in this space are project management platforms with AI features; they are not AI tools, and none has demonstrated game-studio adoption.

**Recommended approach:** CH's existing Jira Premium subscription includes Atlassian Intelligence and Rovo AI agents ([atlassian.com/platform/rovo](https://www.atlassian.com/platform/rovo)): natural-language JQL, automated ticket triage, sprint planning assistance, backlog curation agents, and work item breakdown from epics. These features should be enabled and evaluated over a 3-month period. This is a feature activation in infrastructure CH already pays for, not a new tool adoption.

**What would need to change for specialist tools to warrant evaluation:**
- The CTO hire (in progress) who can evaluate production technology strategy
- At least 6 months of Jira usage data to establish baseline velocity, cycle time, and estimation accuracy metrics
- Demonstrated limitations in Jira AI capabilities that a specialist tool would address

**Revisit date:** Q1 2027

#### 13.2.2 Meeting Summarisation and Status Reporting

Per RICECO Processing Instruction 2, meeting summarisation is a task where no specialist AI tool exists for game development. General-purpose LLMs (Claude, ChatGPT) are the appropriate tools for drafting meeting summaries, sprint retrospective notes, and status reports from transcripts. This is commodity AI work.

**Data egress warning:** Meeting content may include partner IP discussions, financial details, or personnel matters. General-purpose LLM usage for summarisation requires the data classification guardrails defined in Section 4 (Cross-cutting Infrastructure). Partner IP and commercial data must not be processed through public cloud AI without appropriate isolation.

### 13.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| AI features in Jira surface incorrect risk predictions, leading to false confidence in sprint planning | 3 | 3 | 9 | Treat AI suggestions as inputs to human judgement. Valeria reviews all AI-generated scheduling suggestions |
| Meeting summarisation leaks sensitive content (partner IP, personnel matters) through cloud LLM | 2 | 4 | 8 | Data classification policy. Exclude sensitive meeting types from AI summarisation until classification guardrails are in place |

### 13.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| Data classification for AI inputs (which meeting content can be processed by cloud AI) | IP Safeguards | MEDIUM | Before AI meeting summarisation is used for meetings involving partner IP or commercial data |
| AI Acceptable Use Policy v1 (covering Jira AI feature enablement) | Usage Policy & Governance | HIGH | Before Rovo AI agents are enabled org-wide |

### 13.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| Jira AI / Rovo (existing subscription) | Enable | $0 marginal (included in Jira Premium) | $0 marginal |
| General-purpose LLM for summarisation | Use existing | $0 marginal (existing subscriptions) | $0 marginal |
| **Production & PM Total** | | **$0** | **$0** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 14. MARKETING & COMMUNITY

### 14.1 Discipline Overview

CH's marketing team is small (~2-3 people) with no live community to manage yet. The game is pre-launch, targeting late 2028. Community building will intensify from closed alpha onward. Two realities dominate this discipline:

1. **Community moderation is non-negotiable for a live-service MMO.** An MMO with voice chat, text chat, and 200-600 concurrent players per zone requires automated moderation. This is post-launch infrastructure, not optional tooling.
2. **AI-generated marketing content is extremely high-risk.** The MMO community has been actively hostile to AI-generated content throughout 2024-2026. Multiple studios have faced review-bombing, trailer cancellations, and organised boycotts over detected AI imagery. For a cosy MMO building its brand on community goodwill, any visible AI-generated marketing content risks permanent brand damage.

Two genuine AI tools exist for community moderation: ToxMod (Modulate) for real-time voice safety and GGWP for multi-modal community moderation. Both are mature, well-funded, and designed for games.

### 14.2 Task-Level Analysis

#### 14.2.1 Community Safety: Voice and Text Moderation

Real-time moderation of voice chat, text chat, player reports, and community channels. This is a post-launch requirement that emerges during closed beta (when voice features are active) and scales through launch and live service.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| ToxMod (Modulate) | SaaS (cloud) | 8 | 9 | 8 | 7 (est.) | 7 | 5 | 7.7 | WATCH (post-launch) |
| GGWP | SaaS (cloud) | 7 | 7 | 8 | 7 (est.) | 6 | 7 | 7.1 | WATCH (post-launch) |

*ToxMod: (8 × 0.25) + (9 × 0.20) + (8 × 0.20) + (7 × 0.15) + (7 × 0.10) + (5 × 0.10) = 2.00 + 1.80 + 1.60 + 1.05 + 0.70 + 0.50 = 7.65 → 7.7 ✓*
*GGWP: (7 × 0.25) + (7 × 0.20) + (8 × 0.20) + (7 × 0.15) + (6 × 0.10) + (7 × 0.10) = 1.75 + 1.40 + 1.60 + 1.05 + 0.60 + 0.70 = 7.10 → 7.1 ✓*

**Verdict: WATCH both.** Not because the tools are deficient (both score well), but because CH has no live game community to moderate. The need emerges at closed beta with voice chat and scales through launch. Evaluation should begin 6-9 months before the first public playtest with voice enabled.

**ToxMod: Company Profile**

- **Developer:** Modulate, Inc. ([modulate.ai](https://www.modulate.ai/)). Founded ~2018, Boston, Massachusetts.
- **Funding:** $32M total (Series A: $30M in August 2022, led by Lakestar, with Hyperplane, Everblue, and Galaxy). Partnered with Keywords Studios in February 2024, integrating ToxMod into Keywords' player support services.
- **Scale:** 160M+ hours of voice chat moderated to date across customer base.
- **Product:** Real-time AI voice chat moderation. **Voice only**; ToxMod does not cover text chat. Studios pair ToxMod with a text moderation tool (Activision uses ToxMod for voice + Community Sift for text).
- **AI architecture:** Proprietary "Velma" Ensemble Listening Model. Analyses tone, intensity, escalation patterns, interaction dynamics, emotion, and speech acts across 18 languages. This is not transcription-and-keyword-matching; it detects harassment patterns, grooming behaviour, threats, doxxing, and escalation trajectories in real-time audio streams without transcribing the content.
- **Pricing:** Tiered by monthly active users. Tiers: Epic (100K-500K MAU), Legendary (500K+ MAU), Mythic (2M+ MAU). A free evaluation tier likely exists. Exact dollar pricing requires direct contact (no public per-MAU rates found; request quote when needed). For budget planning, CH should request a quote based on projected beta/launch MAU once the game's distribution model is clearer.

**Who uses it:**

- **Activision:** Call of Duty: Modern Warfare II, Warzone, Modern Warfare III. The highest-profile deployment of AI voice moderation in gaming. Activision publicly credited ToxMod with detecting voice toxicity that traditional report-based systems missed entirely.
- **Riot Games:** confirmed customer (specific title undisclosed).
- **Rec Room:** confirmed customer. VR social platform with voice-first interaction.
- **Schell Games:** confirmed customer.

**Why ToxMod scores 8 on Capability Fit:** Purpose-built for real-time voice moderation in games. The Velma model is trained specifically on gaming voice data, not repurposed from call centre or general audio analysis. For an MMO with voice chat across zones, guilds, and PvP encounters, ToxMod is the closest match to CH's specific moderation need.

**Why ToxMod scores 5 on Cost Efficiency:** Custom MAU-based pricing at MMO scale (200K-600K+ concurrent, potentially millions of MAU at launch) will be a significant line item. Voice moderation is non-optional for a live-service game; the question is cost, not necessity. The alternative (dedicated human moderation team monitoring live voice channels) is more expensive at scale, but CH will still need human moderators for adjudication. Score reflects real but necessary cost.

**Integration:** UE5 plugin (v4.0.0). Discord Social SDK integration (announced June 2025; "one line of code" to route in-game Discord voice to ToxMod). REST API with User Report and Behaviour Patterns endpoints. Server-side; voice audio is routed to Modulate's cloud (AWS EC2 G5g instances) for analysis, results returned to the studio's moderation console.

**Productivity impact:** ~80-90% estimated reduction in undetected voice toxicity incidents versus report-only moderation (industry estimate for real-time voice moderation vs reactive (industry estimate, not a vendor-specific claim)). Moderation at MMO scale without automated detection requires either a prohibitively expensive dedicated monitoring team or acceptance of rampant unchecked toxicity that destroys community culture. For a cosy MMO where positive community culture is a design pillar (FFXIV-inspired), automated voice moderation is infrastructure, not luxury.

---

**GGWP: Company Profile**

- **Developer:** GGWP, Inc. ([ggwp.com](https://ggwp.com/)). Founded 2020, San Francisco, California.
- **Leadership:** Dennis "Thresh" Fong (CEO; Quake champion, gaming industry pioneer, former CEO of Xfire and Raptr), Kun Gao (co-founder of Crunchyroll), Dr. George Ng, Ling Xiao.
- **Funding:** $33.3M total. Investors: Riot Games, Sony Innovation Fund, Samsung Ventures, YouTube co-founder Steve Chen, Bitkraft Ventures, SK Telecom Ventures.
- **Scale:** 25+ game company customers. Official Unity/Vivox safety partner (March 2025).
- **Product:** Comprehensive AI moderation covering **text chat, voice chat (via Vivox partnership), player reports, and Discord** in a single platform. Also includes prosocial reinforcement (positive behaviour feedback loops), sentiment analysis, and player behaviour shaping. Contextual AI analysis across 18+ languages with 98% automated triage of player reports.
- **Pricing:** Free tier available (launched July 2023). Pay-as-you-go beyond free tier; no minimum commitments. Custom volume pricing for larger games (exact per-message rates not publicly disclosed).
- **Differentiator vs ToxMod:** GGWP covers text + voice + reports + Discord in one platform. ToxMod is deeper on proprietary voice analysis but is voice-only. GGWP's voice moderation is provided through its Vivox partnership, not a proprietary voice model.

**Who uses it:**

- **Fatshark:** Warhammer 40,000: Darktide. Co-op FPS with active community and text/voice chat moderation needs.
- **Another Axiom:** Gorilla Tag. VR social game with high player volume.
- **thatgamecompany:** Journey, Sky: Children of the Light. Notably, Sky is a community-focused social game, the closest analogue in GGWP's portfolio to CH's cosy MMO ethos.
- **Omeda Studios, Dreamhaven, Sandbox:** confirmed customers.
- **Unity/Vivox:** official safety partner. Any game using Vivox for voice middleware gets streamlined GGWP integration.

**Why GGWP scores 7 on Capability Fit (vs ToxMod's 8):** Broader coverage (text + voice + reports + Discord) is an advantage for a studio that wants a single moderation vendor. However, voice moderation depth is inherited from the Vivox partnership rather than a proprietary model; ToxMod's Velma model is purpose-built for voice pattern analysis. For an MMO where voice toxicity in zone/guild chat is the primary moderation challenge, ToxMod's voice depth edges GGWP. For broader coverage including text, reports, and Discord, GGWP is the stronger choice.

**Why GGWP scores 6 on Integration Effort (vs ToxMod's 7):** GGWP's voice integration depends on the Vivox partnership. If CH does not use Vivox for voice middleware, voice integration is less clear. ToxMod has its own UE5 plugin regardless of voice middleware choice. UE5-specific integration details for GGWP beyond the Vivox path were not confirmed.

---

**CH-Specific Recommendation: ToxMod vs GGWP**

These tools are complementary rather than directly competing. CH's evaluation should consider:
- If CH uses Vivox for voice middleware: GGWP has native Vivox integration. ToxMod has its own UE5 plugin and Discord SDK integration.
- If CH wants a single moderation vendor (text + voice + reports + Discord): GGWP.
- If CH wants best-in-class voice moderation and will pair it with a separate text tool: ToxMod + text provider.
- Both tools should be evaluated competitively 6-9 months before the first public playtest with voice features. Evaluation criteria: (a) cost at CH's projected MAU, (b) false positive rates in cosy/social game environments (not just competitive FPS), (c) integration path with CH's chosen voice middleware, (d) multi-language support for CH's target markets.

**Data Egress:** Both tools process voice/text data via cloud. ToxMod offers single-tenant licences for enterprise. In-game chat typically does not contain partner IP or commercial data, but voice channels in developer playtests may inadvertently surface unreleased game content. Guardrail: during internal playtests where unreleased content is discussed, evaluate whether moderation tools should be active.

**Steam Disclosure:** Neither tool triggers Steam AI content disclosure. ToxMod and GGWP are backend moderation tools; they do not generate content consumed by players. Steam's January 2026 updated rules exempt backend efficiency tools that do not produce player-facing content.

#### 14.2.2 Marketing Content: AI-Generated Imagery and Video

*Cross-reference: See Section 6 (Art Pipeline) for full tool evaluations of AI image generation (Midjourney WATCH, Stable Diffusion WATCH). This section addresses the marketing-specific risk of using any AI image or video generation tool for public-facing content.*

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| AI image/video generation (marketing use) | SaaS | 7 | 7 | 2 | 2 (est.) | 7 | 9 | 5.5 | AVOID |

*Composite: (7 × 0.25) + (7 × 0.20) + (2 × 0.20) + (2 × 0.15) + (7 × 0.10) + (9 × 0.10) = 1.75 + 1.40 + 0.40 + 0.30 + 0.70 + 0.90 = 5.45 → 5.5 ✓*

**Verdict: AVOID** for all AI-generated imagery, video, or visual content used in public-facing marketing materials (Steam store page, social media, trailers, press releases, community posts).

- **Specific risk:** Community detection and backlash. The MMO gaming community has been actively hostile to AI-generated content throughout 2024-2026. Studios have faced review-bombing (detected AI marketing imagery), trailer cancellations (AI art in reveal trailers), and organised boycotts. A cosy MMO that positions itself on community goodwill and handcrafted aesthetic is maximally vulnerable to this backlash. One detected AI-generated marketing image brands the game "the AI MMO" permanently; community forums and social media do not forget or forgive.
- **Probability × Impact:** Detection probability: 4/5 (community detection tools and forensics expertise are sophisticated; AI imagery analysis is a hobbyist skill in the MMO community). Impact: 5/5 (brand damage, review-bombing, potential loss of core community before launch). Risk score: 20.
- **Counterfactual cost of not adopting:** Low. CH has a marketing team that can produce human-authored content. The game's byte-punk aesthetic is distinctive and hand-crafted; AI-generated imagery would struggle to match it authentically. Cost savings from AI-generated marketing imagery are marginal relative to brand risk.
- **Alternative workflow:** Human-authored marketing content. Concept art from David Luong's art team repurposed for marketing. In-engine screenshots, gameplay footage, and hand-drawn assets for trailers. AI is acceptable behind the scenes for internal ideation only (per Section 6 PILOT recommendation for Adobe Firefly), but no AI-derived imagery reaches public channels.
- **IP/Legal Safety score of 2 reflects:** Steam disclosure required for AI-generated marketing content on store pages; community backlash is a material reputational and IP risk; training data provenance concerns apply to all current-generation tools.
- **Team Adoption Risk score of 2 (est.) reflects:** Marketing team members would face direct community hostility if AI-generated content is detected. No rational team member would accept that risk for marginal time savings.

#### 14.2.3 Social Listening and Sentiment Analysis

No specialist AI tool exists for gaming community sentiment analysis that meets the evaluation criteria. The tools in this space (Brandwatch, Sprout Social, Brand24) are social media management platforms with AI features; they are not AI tools, and they are not game-specific. CH's small marketing team (~2-3 people) can monitor community sentiment through direct Discord engagement and standard social media management tools without requiring a specialist AI investment.

**What would need to change:** Post-launch, if the community grows to a scale where manual monitoring is insufficient (100K+ concurrent players, multiple community channels, multi-language), social listening should be evaluated as operational infrastructure. This is a scale problem, not an AI tool problem.

### 14.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| AI-generated marketing content detected by community, triggering boycott or review-bombing | 4 | 5 | 20 | AVOID verdict. No AI-generated imagery in public-facing materials. Human-authored content only |
| Voice moderation not deployed at beta launch, resulting in unchecked toxicity that damages early community | 3 | 4 | 12 | Begin vendor evaluation 6-9 months before first public voice-enabled playtest. Budget for moderation in beta launch plan |
| Community moderation generates false positives, penalising innocent players and creating PR incident | 2 | 4 | 8 | Human review layer for all moderation actions above auto-mute. Appeal process. Both ToxMod and GGWP support confidence thresholds and human-in-the-loop review |
| Moderation tool vendor ceases operations or pivots pre-launch | 2 | 3 | 6 | Both tools are well-funded ($32-33M). Evaluate both before committing. Moderation APIs are swappable at the backend level |

### 14.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| Community moderation policy (what behaviours are moderated, escalation paths, appeals) | Usage Policy & Governance | HIGH | Before any moderation tool is deployed in beta |
| AI-generated content marketing policy (explicit prohibition on public-facing AI imagery) | Usage Policy & Governance | HIGH | Immediately (before marketing team produces any content) |
| Voice data processing DPA (for ToxMod or GGWP) | IP Safeguards | MEDIUM | Before moderation tool processes player voice data |
| Community communication strategy for AI usage transparency | Usage Policy & Governance | MEDIUM | Before launch (investors and community expect transparency on AI use) |

### 14.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| ToxMod | WATCH | $0 (evaluate from H1 2028) | TBD (custom MAU-based pricing) |
| GGWP | WATCH | $0 (evaluate from H1 2028) | TBD (pay-as-you-go + custom volume) |
| AI image/video generation (marketing) | AVOID | $0 | $0 |
| **Marketing & Community Total** | | **$0** | **TBD** (moderation costs emerge at launch) |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 15. DATA & ANALYTICS

### 15.1 Discipline Overview

CH has **zero data and analytics headcount**. No data scientist, no data analyst, no dedicated analytics person. This is the most critical gap in the AI adoption landscape: the discipline where AI tools could add the most value (churn prediction, economy monitoring, LiveOps optimisation for a live-service MMO) is the one where CH has no one to operate them.

The game's late 2028 launch means the earliest live player data emerges at alpha/beta (optimistically H2 2027). Pre-launch analytics work is limited to economy modelling (covered by Machinations in Section 10, Game Design) and internal playtesting metrics.

### 15.2 Task-Level Analysis

#### 15.2.1 Player Behaviour Analytics and Churn Prediction

AI-powered churn prediction, player lifecycle management, and behavioural segmentation are genuine ML applications. However, the specialist AI tools in this space face a fundamental constraint at CH: **they require player data that does not yet exist and a data team that has not been hired.**

No specialist AI tool for game-specific churn prediction or LiveOps optimisation meets the evaluation criteria for current adoption. The one genuinely ML-focused product identified, Sonamine ([sonamine.com](https://www.sonamine.com/)), offers ML-based churn prediction and player lifecycle management as its core product. However, it operates with ~6 employees, no external funding, and no game studio citation beyond a single mobile indie (HyperBeard). The vendor risk disqualifies it from PILOT or ADOPT at CH's scale and timeline.

**Infrastructure recommendation (not scored):** CH should select a game analytics platform as telemetry infrastructure. Two viable options: GameAnalytics ([gameanalytics.com](https://gameanalytics.com/); free, self-service, UE5 SDK, 100K+ games) or Azure PlayFab ([playfab.com](https://playfab.com/); Microsoft-backed, UE5 bundle, built-in ML churn prediction, Economy V2 for MMO economies). These are analytics and backend platforms, not AI tools, and are referenced here as infrastructure rather than scored. The selection should be driven by CH's backend architecture decisions.

**What would need to change for specialist AI tools to warrant evaluation:**
- A data lead hire who can define the analytics stack and event taxonomy
- Live player telemetry from alpha or beta (earliest: H2 2027)
- A baseline understanding of CH's churn patterns, economy health metrics, and LiveOps levers

**Revisit date:** 6 months after first public alpha/beta with telemetry active

#### 15.2.2 Economy Monitoring

*Cross-reference: See Section 10 (Game Design) for Machinations (PILOT 7.8), which handles economy design and simulation (pre-production tool).*

No specialist AI tool exists for live MMO economy monitoring (real-time sink/faucet balance, inflation indices, marketplace health, currency velocity). This is a custom analytics problem that every MMO studio builds in-house on top of their telemetry and data warehouse infrastructure. Live economy monitoring is a Year 3+ concern (post-launch). CH should plan for a data infrastructure investment as part of launch readiness, but this is an engineering and data team decision, not an AI tool adoption.

### 15.2.3 Pre-Beta Analytics Readiness Checklist

The recommendation "hire a data lead" is necessary but not sufficient. Before beta, CH must have the following in place regardless of whether specialist AI tools are adopted:

| # | Readiness Item | Owner | Dependency | Target |
|---|---|---|---|---|
| 1 | **Data lead hired** | Aris (COO) | CTO should be consulted on hire profile | Before beta planning begins |
| 2 | **Telemetry event taxonomy defined** | Data lead | Game design must specify which player actions matter | 3 months before beta |
| 3 | **Analytics platform selected** (GameAnalytics, PlayFab, or equivalent) | Data lead + CTO | Infrastructure architecture decision | 3 months before beta |
| 4 | **UE5 telemetry SDK integrated** | Engineering | Analytics platform selected; event taxonomy defined | 2 months before beta |
| 5 | **Economy health dashboard** (currency velocity, sink/faucet ratios, inflation index) | Data lead | Telemetry live; Machinations model as reference baseline | Beta launch day |
| 6 | **Player retention baseline** (D1/D7/D30 retention, session length, churn signals) | Data lead | Telemetry live | First week of beta |
| 7 | **Exploit detection alerting** (abnormal currency generation, impossible item acquisition, velocity anomalies) | Data lead + Engineering | Economy telemetry live; server-side validation in place | Beta launch day |
| 8 | **GDPR-compliant data pipeline** (player PII segregation, consent management, deletion workflow) | Data lead + Dino | Player data classification complete | Before any player PII is collected |
| 9 | **A/B testing framework** (at minimum: feature flags for LiveOps experiments) | Engineering + Data lead | Analytics platform integrated | Pre-launch |
| 10 | **Data team capacity plan** (analyst hire, BI tooling, reporting cadence) | Data lead | Revenue model and LiveOps plan defined | 6 months before launch |

**The cost of failure here is not theoretical.** Every MMO that has launched without economy monitoring has faced exploit cascades within the first week. Palia's post-launch struggles included player economy issues that contributed to its acquisition by Daybreak. CH's subscription model (cosmetics marketplace, in-game currency stipend) creates direct revenue exposure to economy health.

### 15.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| CH launches an MMO without data analytics capability, unable to detect churn or economy problems | 4 | 5 | 20 | **Data lead hire is a critical dependency.** Analytics infrastructure must be in place before beta. This is the highest-scoring risk in this section for a reason |
| Telemetry event taxonomy is poorly designed, producing unusable data regardless of tooling | 3 | 4 | 12 | Data lead should define event taxonomy before engineering implements telemetry. Reference: GDC talks on game telemetry design; GameAnalytics event model documentation |
| Over-reliance on platform-bundled ML (e.g. PlayFab churn prediction) without understanding its limitations | 2 | 3 | 6 | Data lead evaluates platform ML accuracy against CH's player base before relying on it for LiveOps decisions |

### 15.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| Player data classification (PII, payment, telemetry, GDPR categories) | IP Safeguards | HIGH | Before any analytics platform is integrated |
| Data lead hire | N/A (headcount) | CRITICAL | Before analytics infrastructure decisions are finalised |
| Telemetry event taxonomy specification | Production Integration | HIGH | Before engineering implements telemetry SDK |

### 15.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| No specialist AI tools adopted | | $0 | $0 |
| Analytics platform (infrastructure, not scored) | Reference | Platform-dependent ($0 for GameAnalytics free tier; PlayFab usage-based) | Platform-dependent |
| **Data & Analytics Total** | | **$0** (AI-specific) | **$0** (AI-specific) |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 16. HR & PEOPLE

### 16.1 Discipline Overview

Lorenza Menna is CH's sole Head of HR, based in Italy, managing ~70 employees across UK and Greece. CH uses HiBob ([hibob.com](https://www.hibob.com/)) as its HRIS. The studio is growing rapidly (from ~55 to ~70 people in recent months, with continued hiring). HR tasks where AI could theoretically add value (candidate screening, compensation benchmarking, performance analytics) face two fundamental constraints:

1. **Solo HR operator.** Lorenza is one person. Any AI tool must be self-service and require minimal implementation overhead. She cannot absorb a months-long tool integration alongside daily HR operations for a growing studio.
2. **GDPR severity.** CH has employees in UK and Greece. HR data includes GDPR special category data (Article 9): health information, disciplinary records, national identifiers. Any AI tool processing employee PII through US-based cloud infrastructure triggers GDPR Chapter V transfer mechanism requirements. The EU AI Act classifies AI hiring systems as "high-risk," requiring conformity assessments.

### 16.2 Task-Level Analysis

#### 16.2.1 AI-Powered Candidate Screening and Hiring

AI candidate screening tools exist (HireVue for AI video assessment, Harver for game-based psychometric assessment). These are genuine AI tools where ML-based assessment is the core product. However, they are **not recommended for CH**:

- **GDPR Article 22** restricts solely automated individual decision-making that produces legal or similarly significant effects. Automated candidate screening produces employment decisions. CH must either ensure meaningful human involvement in every hiring decision (which negates much of the automation benefit) or obtain explicit Article 22(2)(c) consent from every candidate, which is fragile and easily challenged.
- **EU AI Act** classifies AI systems used in recruitment as "high-risk," requiring conformity assessments, technical documentation, and ongoing monitoring. For a solo HR operator, this compliance burden is disproportionate.
- **Scale mismatch.** CH hires ~15-25 people per year at current growth rates. AI screening is designed for organisations processing hundreds or thousands of candidates. The ROI does not justify the compliance overhead at CH's scale.

**Verdict: No specialist AI tool is recommended for HR at CH's current scale and regulatory environment.** HiBob's built-in AI features (job description generation, performance review drafting, analytics) are the appropriate level of AI assistance for a solo HR operator. These are platform features, not scored as separate AI tools.

**HiBob AI data warning:** HiBob's AI features ("Bob AI") use OpenAI's API. HiBob states that data is processed per query and not retained on OpenAI's servers or used to train models. However, when a user queries Bob AI, employee PII is sent to OpenAI's US-based API for processing. Even with zero data retention, the act of processing EU employee PII on US servers constitutes a cross-border transfer requiring a valid GDPR Chapter V mechanism. **CH should: (a) confirm the specific transfer mechanism HiBob uses for OpenAI API calls, (b) consider disabling Bob AI for Article 9 special category data (health, disciplinary), (c) document a DPIA covering the OpenAI processing.**

**What would need to change for specialist AI tools:**
- CH scales to 150+ employees with a dedicated HR team (2+ people)
- EU AI Act implementing regulations for recruitment AI are finalised and the compliance pathway is clear
- Hiring volume exceeds manual screening capacity

**Revisit date:** Q1 2028 or when HR headcount reaches 2+

### 16.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| Solo HR operator is overwhelmed as studio scales, slowing hiring | 4 | 3 | 12 | Second HR hire should be prioritised. AI tools are not a substitute for headcount |
| HiBob's Bob AI features process employee PII via OpenAI API without proper GDPR transfer mechanism | 3 | 4 | 12 | Confirm HiBob's GDPR transfer mechanism for Bob AI. Consider disabling Bob AI for Article 9 special category data until verified |
| CH adopts AI hiring tools without GDPR Article 22 compliance, exposing the company to regulatory action | 2 | 5 | 10 | No AI hiring tools recommended. Any future adoption requires legal review of GDPR Article 22 and EU AI Act requirements |

### 16.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| GDPR transfer mechanism verification for HiBob Bob AI (OpenAI API) | IP Safeguards | HIGH | Before enabling Bob AI features that process employee PII |
| DPIA for HiBob AI features | Usage Policy & Governance | MEDIUM | Before enabling Bob AI for Article 9 special category data |
| EU AI Act recruitment compliance assessment | Usage Policy & Governance | LOW (revisit when scale justifies AI hiring tools) | Before any AI hiring tool is adopted |

### 16.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| No specialist AI tools adopted | | $0 | $0 |
| HiBob AI features (existing subscription) | Enable (with GDPR verification) | $0 marginal | $0 marginal |
| **HR & People Total** | | **$0** | **$0** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 17. FINANCE & LEGAL

### 17.1 Discipline Overview

CH's finance function is in transition: Lili starts as Head of Finance on 1 July 2026 (not yet in post). Dino serves as General Counsel internally, supported by external firms Saybrook Legal (engaged April 2026) and Mishcon de Reya (contract templates). The discipline processes the studio's most commercially sensitive data: cap table, fundraising terms ($10M Series B target), financial projections, and investor correspondence. **No data category in CH is more sensitive than financial and legal documents.** Any AI tool processing this data through public cloud infrastructure without enterprise-grade data isolation is a non-starter for the most sensitive documents.

Two genuine AI tools exist for legal work: Luminance (AI contract analysis) and Harvey (AI legal assistant). Both are mature, well-funded, and designed for law firms and large legal departments. Both are priced far beyond what a single in-house counsel at a 70-person game studio can justify.

### 17.2 Task-Level Analysis

#### 17.2.1 Contract Analysis and Legal Review

AI-powered contract analysis, due diligence support, and legal document review. Relevant for Dino's workflow: NDAs, employment agreements (UK and Greek law), IP assignment contracts, vendor agreements, investment documents, and partner IP licences.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Luminance | SaaS / on-prem | 6 | 9 | 6 | 5 (est.) | 7 | 1 | 6.1 | WATCH |
| Harvey | SaaS | 7 | 9 | 9 | 5 (est.) | 7 | 1 | 6.9 | WATCH |

*Luminance: (6 × 0.25) + (9 × 0.20) + (6 × 0.20) + (5 × 0.15) + (7 × 0.10) + (1 × 0.10) = 1.50 + 1.80 + 1.20 + 0.75 + 0.70 + 0.10 = 6.05 → 6.1 ✓*
*Harvey: (7 × 0.25) + (9 × 0.20) + (9 × 0.20) + (5 × 0.15) + (7 × 0.10) + (1 × 0.10) = 1.75 + 1.80 + 1.80 + 0.75 + 0.70 + 0.10 = 6.90 → 6.9 ✓*

**Verdict: WATCH both.** Not because the tools are deficient (both are excellent), but because the pricing is designed for law firms and large legal departments, not a single in-house counsel at a 70-person studio.

**Luminance: Company Profile**

- **Developer:** Luminance Technologies Ltd. ([luminance.com](https://www.luminance.com/)). Founded 2015 by mathematicians from the University of Cambridge. HQ: London/Cambridge, UK. Offices in New York and Singapore.
- **Funding:** ~$168M total ($75M raised February 2025).
- **Scale:** 1,000+ organisations across 70 countries.
- **Product:** Legal-grade AI contract management platform. Six modules: Draft, Negotiate, Analyse, Comply, Investigate, Collaborate. Proprietary "Panel of Judges" AI architecture that cross-checks outputs across multiple models to reduce hallucination and improve accuracy. Covers contract review, due diligence, compliance monitoring, and legal research.
- **Pricing:** Enterprise custom only. Mid-market first-year estimates: $150,000-$300,000 including base platform ($100K-$200K/year), per-user fees ($50-$150/user/month), additional modules ($25K-$75K/year each), and implementation ($30K-$100K one-time) (estimates from third-party analysis, not Luminance directly).
- **Data privacy:** ISO 27001:2022, SOC 2 Type 2. AES-256 encryption at rest, TLS 1.2+ in transit. Staff cannot view documents without explicit customer authorisation. **On-premise deployment option available** (addresses cap table sensitivity). Cloud deployment: privacy policy states data "may be processed anywhere in the world," which is a concern for commercial data that requires UK/EU residency.

**Who uses it:**

- **All Big Four** accounting firms (contract analysis and due diligence).
- **Quarter of the Global Top 100 law firms,** including Clifford Chance and KPMG.
- **Named corporate clients:** AMD, Hitachi, LG, BBC Studios, Koch Industries, Figma, Tesco, Hyundai.
- **Jagex:** logo appeared on Luminance website (no published case study found; if confirmed, this would be the only game studio citation).

**Why Luminance scores 6 on Capability Fit:** Strong contract analysis tool, but designed for high-volume legal departments reviewing hundreds of contracts. Dino reviews dozens per year, not hundreds. The tool's power is underutilised at CH's scale. Capability Fit reflects the mismatch between the tool's design point and CH's actual workflow volume.

**Why Luminance scores 6 on IP/Legal Safety:** Luminance itself is a legal tool with strong security credentials (ISO 27001, SOC 2, UK-headquartered). However, it does not strip identifiable data before it reaches the AI model, and the privacy policy's "processed anywhere in the world" clause means CH's most sensitive documents (cap table, fundraising terms) could be processed outside the UK/EU without explicit contractual guarantees. The on-premise option resolves this for the most sensitive documents, but adds implementation complexity and cost.

**Why Luminance scores 1 on Cost Efficiency:** At $150K-$300K/year, Luminance costs more than a junior in-house lawyer's annual salary. For a single General Counsel at a 70-person studio, the cost-per-review is orders of magnitude higher than manual review. The tool's ROI depends on volume that CH does not have.

---

**Harvey: Company Profile**

- **Developer:** Harvey Inc. ([harvey.ai](https://www.harvey.ai/)). Founded 2022 by Gabriel Pereyra and Winston Weinberg. HQ: San Francisco. Offices opened in Dublin (March 2026), Paris (May 2026), Singapore (June 2026).
- **Funding:** $1.22B total. Most recent: $200M raised March 2026 at $11B valuation. Investors: Sequoia Capital, Kleiner Perkins, Andreessen Horowitz.
- **Scale:** 70%+ of Am Law 10 firms. 1,500+ customers across 60+ countries. 500+ in-house legal teams alongside 1,000+ law firm organisations.
- **Product:** AI legal assistant built on custom LLM infrastructure. Covers legal research, contract analysis, drafting, due diligence, regulatory compliance, and litigation support. The highest-profile AI legal tool in the market.
- **Pricing:** Enterprise-only. Base: $100-$500/user/month. All-in including implementation and training: $1,000-$1,200/lawyer/month. **Minimum 25-50 seats.** Annual contracts range from $30K-$300K+ depending on firm size and modules (minimum seat count may have changed). 6+ month sales cycle.
- **Data privacy:** SOC 2 Type II, ISO 27001. **First AI/LLM startup certified under the EU-US Data Privacy Framework.** Zero Data Retention from model providers. Customer data not used for training. EU, Switzerland, US, and Australia data residency options. Hosted on Microsoft Azure. SAML SSO, audit logs, IP allow-listing. **Best-in-class data privacy posture among all AI tools evaluated in this report.**

**Who uses it:**

- **Allen & Overy (A&O Shearman):** first major law firm partner; public case study on AI-augmented deal review.
- **PwC Legal:** confirmed deployment.
- **Freshfields Bruckhaus Deringer:** confirmed.
- **50% of Am Law 100.**

**Why Harvey scores 7 on Capability Fit (vs Luminance's 6):** Harvey's broader feature set (legal research, drafting, compliance, not just contract analysis) is more aligned with a General Counsel's varied workflow. Dino handles NDAs, employment law across two jurisdictions, IP assignments, vendor contracts, and investment documents; Harvey's generalist capability serves this breadth better than Luminance's contract-focused depth.

**Why Harvey scores 9 on IP/Legal Safety (vs Luminance's 6):** EU data residency, zero data retention from model providers, EU-US DPF certification, and no training on customer data. Harvey's data privacy architecture is the gold standard for legal AI. For CH's most sensitive legal documents, Harvey's privacy posture is the best available, if the pricing were accessible.

**Why Harvey scores 1 on Cost Efficiency:** Minimum 25-50 seats makes Harvey structurally impossible for CH's single-counsel setup. Even at the minimum, the annual cost ($30K+) for 25 seats when only 1 person would use it is indefensible. Harvey is designed for law firms, not single in-house counsel.

---

**CH-Specific Strategic Recommendation**

Neither Luminance nor Harvey is viable as a direct CH purchase at current pricing and scale. The strategic recommendation is:

1. **Encourage CH's external law firms to adopt AI-assisted review.** If Saybrook Legal or Mishcon de Reya already use Luminance or Harvey (likely, given market penetration), CH benefits indirectly through faster, more thorough contract review at standard hourly rates. Ask Saybrook and Mishcon directly whether they use AI-assisted contract review and how this affects turnaround and pricing.
2. **Revisit direct adoption if:** (a) Luminance or Harvey introduce a small-team tier (check Luminance's roadmap for smaller deployments), (b) CH's legal team grows beyond Dino (additional counsel hire), or (c) the volume of contract review increases substantially during Series B fundraising.
3. **For Dino's immediate needs:** general-purpose LLMs (Claude, ChatGPT) can assist with legal research, contract clause comparison, and drafting review notes. This is not a substitute for specialist legal AI, but at CH's volume, it is adequate. Data classification guardrails apply: cap table and investor correspondence must not be processed through public LLM APIs without enterprise data agreements.

#### 17.2.2 Financial Forecasting, Compliance Monitoring, and IP Risk Scanning

No specialist AI tool exists for financial forecasting, compliance monitoring, or IP risk scanning that meets the evaluation criteria for a 70-person game studio. The tools in this space are:

- **FP&A platforms with AI features** (Pigment, Runway Financial, Drivetrain): financial planning tools, not AI tools. Should be evaluated as infrastructure when Lili is in post and has assessed the finance stack.
- **Compliance automation platforms** (Vanta, Drata, Sprinto): compliance management with some AI features. Relevant to CH's 140-item AI governance backlog but not AI tools by the evaluation criteria.
- **IP risk scanning** (Corsearch/TrademarkNow): AI-powered trademark screening relevant to CH's brand protection. Primarily consumed through law firms rather than purchased directly.

**Recommended approach for Lili (starting 1 July):** Enable AI features in whichever accounting platform CH uses (Xero's JAX assistant or QuickBooks' Intuit Assist; both include AI features at no additional cost). Evaluate FP&A platforms as financial infrastructure once the finance function's needs are understood. Neither task requires a specialist AI tool purchase.

### 17.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| Commercially sensitive data (cap table, fundraising) processed through a cloud AI tool without proper data isolation | 2 | 5 | 10 | No AI legal tool recommended for direct CH adoption. External firms' use of Luminance/Harvey is governed by their own DPAs with CH |
| Lili is not in post when AI adoption decisions need to be made for finance | 3 | 3 | 9 | Defer all finance AI decisions until Lili has had 90 days to assess the finance stack and needs |
| Dino needs contract review throughput beyond manual capacity as CH scales hiring and partnerships | 3 | 3 | 9 | Evaluate Luminance at a smaller tier if available; encourage Saybrook Legal to adopt AI-assisted review |

### 17.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| Data classification for financial and legal documents (which documents can be processed by cloud AI) | IP Safeguards | HIGH | Before any AI tool processes CH financial or legal documents |
| External law firm AI usage policy (what CH data can external firms process through their AI tools) | IP Safeguards | MEDIUM | Before next major contract review cycle |
| Finance stack assessment by Lili | N/A (process) | HIGH | Before any finance AI tool evaluation |

### 17.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| Luminance | WATCH | $0 | $0 |
| Harvey | WATCH | $0 | $0 |
| Accounting AI features (existing platform) | Enable | $0 marginal | $0 marginal |
| **Finance & Legal Total** | | **$0** | **$0** |

Note: This is the only discipline with zero recommended current expenditure. The NPC dialogue category is not ready; localisation is premature. Both situations will change. Budget planning for localisation tools should begin by Q1 2027.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 18. PLATFORM & BACKEND

### 18.1 Discipline Overview

CH's platform and backend infrastructure is managed by the ~10-12 engineering team, who are already context-switching into IT and infrastructure work without a CTO or dedicated DevOps resource. The game's hybrid zone architecture presents five distinct server profiles (overworld zones at 200-600 players, hub shards, instance servers at 30Hz, user space servers for player housing, and the metagame backend covering accounts, economy, social graph, faction state, and matchmaking). This is a complex backend with significant anti-cheat, fraud prevention, and matchmaking requirements at launch and beyond.

However, Platform & Backend is the discipline where the gap between the AI tooling market's focus and an MMO studio's actual needs is widest. The AI anti-cheat market is dominated by FPS-centric behavioural analysis; matchmaking optimisation, fraud detection, infrastructure scaling, and incident response have no specialist AI tools and remain custom engineering work at every studio.

### 18.2 Task-Level Analysis

#### 18.2.1 Anti-Cheat: Behavioural Analysis and Cheat Detection

Anti-cheat for an MMO operates differently from the FPS/competitive shooter space where most AI anti-cheat development is concentrated. CH's game has PvP (zone cloning, structured PvP instances), but the primary anti-cheat concerns for a cosy MMO are economy exploitation (duplication glitches, RMT botting, auction house manipulation), bot farming, and social system abuse, rather than aimbotting or wallhacking. Traditional anti-cheat middleware (Easy Anti-Cheat, BattlEye) handles client-side integrity; the AI question is whether behavioural analysis adds value on top.

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Anybrain | SaaS | 5 | 5 | 9 | 3 (est.) | 7 | 5 | 5.7 | WATCH |

*Anybrain: (5 x 0.25) + (5 x 0.20) + (9 x 0.20) + (3 x 0.15) + (7 x 0.10) + (5 x 0.10) = 1.25 + 1.00 + 1.80 + 0.45 + 0.70 + 0.50 = 5.70 = 5.7 ✓*

**Anybrain -- Company Profile**

- **Developer:** Anybrain ([anybrain.gg](https://anybrain.gg/)). Founded 2015, Braga, Portugal. CEO: Andre Pimenta Ribeiro. Patent-protected behavioural biometrics technology.
- **What it does:** Cloud-based AI anti-cheat that analyses 70+ behavioural biometrics (keyboard dynamics, mouse movement patterns, touch inputs, joystick behaviour) to identify abnormal player behaviour. Operates as a complementary layer alongside traditional anti-cheat (EAC, BattlEye), not a replacement. AI/ML behavioural analysis IS the core product.
- **Funding:** ~$1.1M (Seed VC). Investors include Apicap, Shilling, Eggnest, Trust Esport, Startup Braga.
- **Employees:** ~19 as of 2026.
- **Integration:** Claimed hours to days for initial integration. Works within existing network infrastructure alongside other anti-cheat solutions.
- **Scale claim:** "150+ games across AAA, AA, and Indie" (specific titles beyond Arc Raiders not independently confirmed).

**Who uses it:**

- **Arc Raiders (Embark Studios):** Confirmed. Embark uses Easy Anti-Cheat with Anybrain ML as a complementary behavioural analysis layer. Arc Raiders is in Early Access (Steam, launched 2025) with paying players. The anti-cheat effectiveness has received mixed community reception, with Embark adding Denuvo Anti-Cheat as a third layer in May 2026, suggesting Anybrain alone was insufficient for a competitive extraction shooter.
- **150+ games claimed** but no independently verifiable list of named titles beyond Arc Raiders found.

**Why Anybrain scores 5 on Capability Fit:** Anybrain's behavioural biometrics are optimised for competitive genres (FPS, sports, MOBAs, fighting games) where input patterns (aiming, reaction timing) are the primary cheat indicators. For a cosy MMO, the dominant anti-cheat challenges are economy exploits, bot farming, and social abuse, none of which are well-served by input biometrics analysis. Anybrain may detect bot-like input patterns for automated farming, but cannot detect economy exploits (duplication bugs, auction manipulation) or social system abuse, which require server-side logic and economy monitoring. The capability fit for CH's specific anti-cheat needs is partial.

**Why Anybrain scores 5 on Production Readiness:** Arc Raiders confirms the tool works in a shipped (Early Access) title. However, the mixed community reception and Embark's subsequent addition of Denuvo suggests the tool was not sufficient as the primary behavioural layer for a competitive game. No MMO production citation found. Production Readiness reflects working-but-unproven-at-MMO-scale.

**Why Anybrain scores 9 on IP/Legal Safety:** Anybrain processes only player input telemetry (mouse/keyboard/controller patterns), not game assets, source code, or player PII beyond behavioural input data. No data egress of game content occurs. The privacy model is low-risk: input patterns are less sensitive than most categories in CH's data classification. GDPR compliance requires a privacy notice covering behavioural monitoring, but the data category is far less problematic than employee PII or commercial data.

**Why Anybrain scores 3 on Team Adoption Risk:** CH has no CTO, no dedicated security or anti-cheat specialist, and no DevOps resource. The engineering team is already overloaded with infrastructure work. Anti-cheat is a specialised domain requiring ongoing tuning, false-positive management, ban wave coordination, and community communications. Without a named owner, any anti-cheat adoption (AI or otherwise) has high failure risk. The score reflects the organisational gap, not the tool's usability.

**Verdict: WATCH.** Anti-cheat is critical for an MMO, but the timing and ownership are wrong for CH right now:

1. **Timing:** The game is 2+ years from needing anti-cheat in production. Beta testing (H2 2027 at earliest) is when anti-cheat requirements become concrete. Evaluating now locks in a decision before the backend architecture is defined.
2. **Ownership:** No CTO, no security specialist. Anti-cheat selection is a CTO-level decision that depends on backend architecture, platform requirements (console certification has anti-cheat mandates), and the specific cheat threat model for CH's game.
3. **Fit:** Anybrain's FPS-centric behavioural analysis is a partial fit for an MMO. CH's primary anti-cheat needs (economy, bots, social abuse) require server-side detection that Anybrain does not provide.

**What would need to change:** (a) CTO hired and backend architecture decided, (b) anti-cheat threat model defined for the specific game, (c) approaching beta with concrete anti-cheat requirements.

**Revisit date:** Q2 2027 or when CTO is in post, whichever is later.

**Anti-cheat middleware (not scored, reference only):** The standard approach for UE5 multiplayer games is Easy Anti-Cheat (EAC, Epic/Irdeto; free for Unreal Engine developers) or BattlEye. These are client-side integrity solutions, not AI tools, and should be evaluated as infrastructure. EAC is the natural default for a UE5 title given Epic's ownership and zero-cost licensing. The CTO should evaluate EAC as the baseline and consider AI-powered behavioural analysis (Anybrain or competitors) as a supplementary layer if the threat model warrants it.

**Threat intelligence (not scored, reference only):** Intorqa ([intorqa.com](https://intorqa.com/)), a UK-based company, offers GameSecure, a platform that monitors the web, dark web, and social media for cheat development activity targeting specific games. This is threat intelligence, not in-game anti-cheat. For a pre-launch studio, there is no cheat ecosystem to monitor. Intorqa's own research estimates MMO-related cheat economy revenues at $98M per game (2026). This intelligence tool becomes relevant post-launch when CH needs to understand the cheat landscape targeting their game specifically. **Revisit post-launch.**

---

#### 18.2.2 Fraud Detection and Economy Exploit Prevention

No specialist AI tool exists for MMO economy fraud detection or exploit prevention. This is universally custom engineering, built on top of the studio's telemetry and economy monitoring infrastructure. The tasks involved (detecting currency duplication, identifying RMT networks, flagging abnormal trade patterns, monitoring auction house manipulation) require deep integration with CH's specific economy systems and cannot be served by a generic product.

**Cross-reference:** See Section 10 (Game Design) for Machinations (PILOT 7.8), which handles economy design and simulation in pre-production. See Section 15 (Data & Analytics) for the analytics infrastructure that will underpin economy monitoring post-launch.

**Recommended approach:** Economy fraud detection is a custom development task that should be planned as part of the economy backend architecture. The data lead hire (flagged as CRITICAL in Section 15) owns the telemetry infrastructure that feeds fraud detection. The CTO hire owns the backend architecture. Both must be in post before this work begins.

---

#### 18.2.3 Matchmaking Optimisation, Infrastructure Scaling, and Incident Response

**Matchmaking:** No commercial specialist AI matchmaking tool exists. Every MMO studio builds custom matchmaking logic tailored to their game's specific requirements (skill ratings, latency, group composition, population balance, queue times). CH's matchmaking requirements are complex (5 server profiles, cross-play, zone population targets, PvP rating, social-graph-aware hub sharding) and cannot be served by a generic product. Cloud platform ML features (AWS SageMaker, Azure ML) can enhance matchmaking with player behaviour predictions, but this is custom ML engineering, not a tool adoption.

**Infrastructure scaling:** Cloud auto-scaling (AWS, Azure, GCP) provides ML-enhanced scaling policies. These are cloud platform features, not specialist AI tools, and should be evaluated as part of CH's cloud infrastructure selection. The decision depends on backend architecture choices the CTO will make.

**Incident response:** No gaming-specific AI incident response tool exists. PagerDuty and Opsgenie offer AI-powered triage features, but these are operational platforms with AI features, not AI tools. They should be evaluated as DevOps infrastructure when the CTO is in post.

### 18.3 Discipline Risk Summary

| Risk | Likelihood (1-5) | Impact (1-5) | Score | Mitigation |
|------|------------------|-------------|-------|------------|
| CH launches an MMO without adequate anti-cheat, leading to economy exploits and player churn within weeks of launch | 3 | 5 | 15 | Anti-cheat architecture must be defined by alpha. CTO hire is the prerequisite. EAC (free for UE5) as baseline; evaluate AI behavioural layer closer to beta |
| Matchmaking quality is poor at launch due to bespoke implementation without sufficient testing at scale | 3 | 4 | 12 | Matchmaking stress testing during beta. modl.ai (Section 11, PILOT contingent) can simulate player populations for matchmaking load testing |
| Economy exploits go undetected post-launch due to lack of monitoring infrastructure | 4 | 4 | 16 | Data lead hire + economy monitoring infrastructure must be in place before beta. Cannot be retrofitted after launch |
| No CTO to make backend architecture decisions, delaying anti-cheat, matchmaking, and infrastructure planning | 4 | 4 | 16 | CTO hire is the single most important prerequisite for this discipline. Interim: Mustafa (Head of Tech) should begin documenting backend architecture requirements |

### 18.4 Governance Prerequisites

| Governance Item | Backlog Area | Priority | Must complete before |
|---|---|---|---|
| Anti-cheat policy and threat model | Usage Policy & Governance | HIGH | Before anti-cheat solution is selected (pre-alpha) |
| Player behavioural data classification (what anti-cheat systems can collect and how long data is retained) | IP Safeguards | HIGH | Before any anti-cheat system processes player data |
| Economy monitoring and fraud detection requirements | Production Integration | MEDIUM | Before economy backend architecture is finalised |
| CTO hire | N/A (headcount) | CRITICAL | Before any platform/backend AI tool is evaluated |

### 18.5 Discipline Budget Summary

| Tool | Verdict | Pre-Launch Cost (mid-2026 to late 2028) | Post-Launch Annual |
|---|---|---|---|
| Anybrain | WATCH | $0 | TBD (custom pricing; evaluate at beta) |
| Anti-cheat middleware (EAC, reference) | Infrastructure | $0 (free for UE5) | $0 |
| No specialist AI tools for fraud, matchmaking, scaling, incident response | | $0 | $0 |
| **Platform & Backend Total** | | **$0** | **$0 + TBD anti-cheat** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 19. PHASED ADOPTION ROADMAP

The roadmap maps ADOPT and PILOT recommendations against CH's Agilefall production cadence and the late 2028 launch target. All dates are relative to development milestones, not calendar months, because CH's milestone dates are not fixed. Where a calendar estimate is given, it is indicative.

### 19.1 Phase 1: Foundation (0-3 months from report delivery, ~mid-2026 to Q3 2026)

**Objective:** Establish governance prerequisites and adopt the lowest-risk, highest-impact tools. No tool in Phase 1 touches shipped content or requires infrastructure investment.

**Governance prerequisites (must complete before any tool rollout):**

1. AI Acceptable Use Policy v1, incorporating the data classification framework from Section 4 (Cross-cutting Infrastructure). Owned by Aris (COO) with legal review by Dino. This is the single highest-priority governance item.
2. Approved tool list v1 (which AI tools are sanctioned for use, by whom, for what data categories). Derived from this report's ADOPT and PILOT recommendations.
3. Steam AI disclosure position documented (conservative: disclose all AI-assisted development workflows for art, audio, and narrative).

**Tools to adopt/pilot at the next sprint boundary:**

| Tool | Discipline | Action | Sprint Boundary | Owner | Dependency |
|------|-----------|--------|----------------|-------|------------|
| MetaHuman Animator | Animation | ADOPT: full rollout | First sprint after policy v1 | David Luong (interim; backfill lead when hired) | iPhone TrueDepth hardware procurement |
| Jira AI / Rovo | Production | ENABLE | Immediate (no policy dependency for internal-only features) | Valeria Trofimova | Jira Premium licence confirmed |
| Machinations | Game Design | PILOT: 2-3 designers, 3-month trial | First sprint after policy v1 | Robin Jubber (Game Director) or Simon Woodruff (Head of Design, if ready) | Account setup, free tier sufficient for pilot |
| Ludo.ai | Game Design | PILOT: design team, 3-month trial | First sprint after policy v1 | Simon Woodruff / Robin Jubber | Studio tier licence ($300/month) |

**Tools deferred from Phase 1 (ready but waiting on preconditions):**

| Tool | Discipline | Waiting on | Expected resolution |
|------|-----------|-----------|-------------------|
| Adobe Firefly Enterprise | Art | Art team readiness assessment by David Luong; voluntary opt-in confirmed from at least 2 artists | Q4 2026 at earliest |
| Substance 3D AI features | Art | Same as Firefly; less contentious (augments existing workflow) | Can pilot earlier if artists self-select |

### 19.2 Phase 2: Expansion (3-9 months, ~Q4 2026 to Q2 2027)

**Objective:** Promote successful Phase 1 pilots, begin medium-risk adoptions that require named champions, and onboard tools that depend on new hires.

**Preconditions for Phase 2:**
- CTO hired and in post (CRITICAL for Engineering, DevOps, Platform/Backend, Infrastructure decisions)
- AI Acceptable Use Policy v1 operational for at least one sprint cycle
- MetaHuman Animator adoption metrics from Phase 1 (usage, output quality, team satisfaction)

**Tools to pilot/adopt at the next milestone gate after preconditions are met:**

| Tool | Discipline | Action | Milestone Gate | Owner | Dependency |
|------|-----------|--------|---------------|-------|------------|
| Aura | Engineering | PILOT: 2-3 engineers, 3-month trial | First milestone after CTO hire | CTO (interim: Mustafa, Head of Tech) | CTO must evaluate and approve |
| Cascadeur | Animation | PILOT: 2 animators, 3-month trial | First milestone after animation lead backfill | New animation lead | Animation lead hired and onboarded |
| Rokoko | Animation | PILOT: 1-2 suits, evaluation against Move.ai | Same milestone as Cascadeur | New animation lead | Hardware procurement (~$2,500 per suit) |
| Adobe Firefly Enterprise | Art | PILOT: 3-5 voluntary seats, ideation only | Milestone gate after voluntary opt-in confirmed | David Luong | At least 2 artists opted in; data guardrails operational |
| Substance 3D AI | Art | PILOT: enable AI features in existing seats | Can begin immediately once policy v1 is operational | David Luong | Existing Substance licences |
| Wwise Sound Search | Audio | PILOT: conditional | Milestone after Wwise selection confirmed | Audio lead | CH selects Wwise as audio middleware |
| ElevenLabs SFX | Audio | PILOT: alongside Wwise evaluation | Same as Wwise Sound Search | Audio lead | SFX workflow evaluation |

**Phase 2 also includes:**
- API gateway evaluation (if AI API spend exceeds $500/month trigger): CTO decision
- Prompt library setup in Confluence: Production team
- 6-month AI tool review cycle initiated: CTO with discipline leads

### 19.3 Phase 3: Scale (9-18 months, ~Q2 2027 to Q4 2027)

**Objective:** Adopt tools that depend on player data, scale QA automation for beta readiness, begin localisation planning, and evaluate community moderation tools.

**Preconditions for Phase 3:**
- Data lead hired (CRITICAL for analytics, economy monitoring, and anti-cheat data)
- Alpha/beta approaching with concrete QA requirements
- Localisation planning initiated for non-English markets

| Tool | Discipline | Action | Milestone Gate | Owner | Dependency |
|------|-----------|--------|---------------|-------|------------|
| modl.ai | QA | PILOT: production trial | Pre-alpha milestone | CTO + Hannah (with expanded QA team or vendor) | QA expansion (additional hire or vendor onboarding) |
| memoQ or Phrase TMS | Localisation | EVALUATE competitively | Localisation planning milestone | Head of Production (Valeria) | Localisation strategy defined; language list confirmed |
| ToxMod or GGWP | Community | EVALUATE for beta | 6 months before first public playtest with voice | Community lead | Community moderation requirements defined |
| Anybrain | Platform | EVALUATE against EAC capabilities | Pre-beta milestone | CTO | Anti-cheat threat model completed; backend architecture defined |
| Analytics platform | Data (infrastructure) | SELECT GameAnalytics or PlayFab | Before telemetry implementation | Data lead | Data lead hired; event taxonomy defined |

### 19.4 Dependency Map

```
IMMEDIATE (Phase 1 blockers)
├── AI Acceptable Use Policy v1 ← Dino (legal) + Aris (operational)
│   ├── Data classification framework (Section 4.1)
│   ├── Approved tool list v1
│   └── Steam AI disclosure position
├── iPhone TrueDepth procurement ← Aris (budget) → MetaHuman Animator ADOPT
└── Jira Premium licence confirmation → Jira AI/Rovo ENABLE

HIRE-DEPENDENT (Phase 2 blockers)
├── CTO hire
│   ├── → Aura PILOT (engineering tools)
│   ├── → API gateway decision
│   ├── → DevOps tooling evaluation (TeamCity AI)
│   ├── → Self-hosted infrastructure evaluation
│   └── → Anti-cheat architecture (Phase 3)
├── Animation lead backfill
│   ├── → Cascadeur PILOT
│   └── → Rokoko PILOT
└── Art team voluntary opt-in
    ├── → Adobe Firefly Enterprise PILOT
    └── → Substance 3D AI features PILOT

MILESTONE-DEPENDENT (Phase 3 blockers)
├── Data lead hire
│   ├── → Analytics platform selection
│   ├── → Telemetry event taxonomy
│   ├── → Economy monitoring infrastructure
│   └── → Anti-cheat data requirements
├── QA expansion (hire or vendor)
│   └── → modl.ai PILOT
├── Localisation planning milestone
│   └── → memoQ / Phrase TMS evaluation
├── Audio middleware selection
│   └── → Wwise Sound Search PILOT
└── First public playtest with voice
    └── → ToxMod / GGWP evaluation
```

**Rollback protocol:** For every PILOT tool, the rollback decision is made at the end of the pilot period (3 months unless otherwise specified). Rollback triggers are defined in each discipline section. Rollback must occur before the next milestone gate to avoid mid-sprint disruption. Data from pilot periods (usage metrics, output quality assessments, team satisfaction surveys) must be collected and documented before the rollback/promote decision.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 20. ORGANISATIONAL CHANGE MANAGEMENT

### 20.1 Stakeholder Analysis

AI adoption at CH is a change management problem first and a technology problem second. The studio's 100% remote structure, recent leadership changes, and discipline-specific sensitivities make stakeholder alignment the critical path.

| Stakeholder | Role | AI Posture | Implications for Rollout |
|---|---|---|---|
| **Aris** | COO | **Champion.** Actively using AI automations. Receptive to AI tooling across operations. | Strongest executive sponsor. Should co-own the AI Acceptable Use Policy with Dino. Validates business case for each PILOT. |
| **Glen Pryer** | Fractional CPO (NBI) | **Champion.** Commissioned this report. Deep understanding of AI capabilities and limitations. | Advisory sponsor. Provides strategic guidance on prioritisation and change sequencing. Not operationally embedded daily. |
| **Sasha Krieger** | Lead Concept/Environment Art | **Opposition.** Genuine personal conviction against AI for art. Not ignorance; this is a values-based position. | Every art-AI rollout must be voluntary. Sasha must never be mandated to use AI tools. Position her as a quality gatekeeper: "No AI-generated concept enters the pipeline without a named human artist's redraw and sign-off." This reframes her opposition as a quality control asset. |
| **Simon Woodruff** | Head of Design (started 15 June 2026) | **Unknown.** 30+ years experience (Sea of Thieves, Epic R&D, Simon the Sorcerer). Views on AI in design workflows are not yet known. | Do not assume buy-in or resistance. Give Simon 90 days to form his own view before presenting AI tool recommendations for Game Design. The Machinations and Ludo.ai PILOTs should be offered, not imposed, during his onboarding. |
| **Mustafa** | Head of Tech | **Passive.** Defaults to silent in meetings. Not a strategic technology leader (this is not a criticism; the role is Head of Tech, not CTO). | Should not be asked to champion AI adoption. Can evaluate technical integration feasibility for specific tools but needs forcing in early. Interim owner for engineering tools until CTO is hired. |
| **Graham** | Executive Producer | **Unreliable.** In probationary assessment with early behavioural concerns. | Do not assign AI tool ownership to Graham. Do not position him as a change champion. He may over-adopt (using AI as a shortcut rather than a quality tool) or resist unpredictably. Monitor; do not rely on. |
| **Fred Dossola** | Art Producer (started June 2026) | **Ally.** Sony and Cloud Imperium Games background. Known "orthodontist approach" to change: incremental, never nuclear. | Best ally for gradual art-AI rollout. Position Fred as the liaison between David Luong (Art Director) and the AI tooling programme. His incremental approach aligns with the voluntary PILOT strategy for art tools. |
| **Hannah** | QA Lead (sole QA resource) | **Overloaded.** Cannot absorb AI tool evaluation overhead alongside existing QA responsibilities. | modl.ai PILOT is contingent on QA expansion (additional hire or vendor onboarding). Hannah must not be asked to evaluate or champion a new tool while being the sole QA resource. She provides requirements; someone else runs the pilot. |
| **Vardis** | CEO/Creative Director | **Receptive.** Commissioned NBI engagement. Invested in AI as a strategic lever. | Decision-maker for budget approval. Reads the Executive Summary and Decision Dashboard. Does not need to be involved in tool-level decisions. |
| **David Luong** | Director of Art | **Pragmatic.** Professional evaluation of tools on merit. | Owns art-AI rollout. Must balance Sasha's opposition with team productivity. Key decision: which artists opt in for Firefly/Substance AI pilots. |
| **Valeria Trofimova** | Head of Production | **Neutral.** Production focus on delivery, not technology strategy. | Owns Jira AI/Rovo enablement. Evaluates AI meeting summarisation with data classification guardrails. |
| **Lorenza Menna** | Head of HR (solo, Italy-based) | **Cautious (appropriately).** GDPR awareness. | No AI hiring tools recommended at CH's scale. HiBob AI features require GDPR verification before use. |
| **Dino** | General Counsel | **Governance-focused.** | Co-owns AI Acceptable Use Policy with Aris. Legal review of data classification, vendor DPAs, Steam disclosure position, and GDPR compliance for all tools processing personal or commercial data. |

### 20.2 Communication Plan (Remote-First, Asynchronous)

CH's 100% remote structure across UK and Greece means all communication must be asynchronous-first with optional synchronous reinforcement.

**Channel strategy:**

| Communication | Channel | Frequency | Owner |
|---|---|---|---|
| AI adoption programme overview | Confluence page | Updated monthly | Aris + Glen (advisory) |
| Tool-specific rollout announcements | Slack #ai-tools channel (create) | Per rollout event | Discipline lead responsible for the tool |
| Pilot results and learnings | Confluence page per pilot | End of each pilot period | Pilot owner |
| Policy updates (AUP, data classification) | Confluence + Slack announcement | Per update | Dino (legal) + Aris (operational) |
| Discipline-specific Q&A | Discipline Slack channels (existing) | As needed | Discipline leads |
| Quarterly AI review (usage, spend, satisfaction) | Recorded video presentation + Confluence summary | Quarterly | CTO (when hired); interim: Aris |

**Principles:**
1. **No all-hands mandate.** AI tools are introduced per discipline, per team, not studio-wide. There is no "AI Day" or mandatory adoption event.
2. **Opt-in first, mandate never.** For creative disciplines (Art, Audio, Narrative), adoption is always voluntary. For operational disciplines (QA, Engineering, Production), adoption follows pilot results and discipline lead approval.
3. **Show, don't tell.** Each pilot produces a recorded demo of the tool in use by a CH team member on CH's actual work. Recordings posted to Confluence for asynchronous review by anyone interested. No generic vendor demos.
4. **Acknowledge resistance.** Sasha's opposition to art-AI is legitimate and should be acknowledged openly, not worked around. The communication plan must never position AI tools as inevitable or frame resistance as ignorance.

### 20.3 Training Requirements (By Discipline, Remote Delivery)

| Discipline | Tool | Training Format | Duration | Delivered By | Prerequisite |
|---|---|---|---|---|---|
| Animation | MetaHuman Animator | Recorded tutorial + 1:1 support session | 2 hours self-paced + 30 min live | David Luong or tech artist | iPhone TrueDepth hardware in hand |
| Animation | Cascadeur | Vendor tutorials (comprehensive library) + internal evaluation notes | 4 hours self-paced | New animation lead | Trial licence active |
| Animation | Rokoko | Vendor onboarding (included with purchase) + internal mocap session | 1 day (hardware setup + first capture) | Audio/animation tech | Hardware delivered |
| Art | Adobe Firefly | Recorded walkthrough: ideation-only workflow with data guardrails | 1 hour self-paced | Fred Dossola (incremental rollout lead) | Policy v1 signed; voluntary opt-in |
| Art | Substance 3D AI | Feature overview within existing Substance training | 30 min addition to existing workflow | Art lead / tech artist | Substance licences updated |
| Game Design | Machinations | Vendor tutorials + economy model walkthrough | 3 hours self-paced | Robin Jubber or Simon Woodruff | Account created |
| Game Design | Ludo.ai | Self-service (intuitive interface) | 1 hour self-paced | Self-service | Licence active |
| Engineering | Aura | Vendor documentation + internal evaluation notes | 2 hours self-paced | CTO (interim: Mustafa) | Beta access granted |
| QA | modl.ai | Vendor-led onboarding (enterprise) | 1-2 days | modl.ai + Hannah + new QA resource | QA expansion in place |
| Production | Jira AI / Rovo | Feature walkthrough (Atlassian documentation) | 1 hour self-paced | Valeria Trofimova | Jira Premium confirmed |

**All training is remote-compatible:** recorded video, self-paced documentation, and optional 1:1 live sessions via Teams/Slack huddle. No in-person workshops required.

### 20.4 Policy Dependencies

Tools cannot be rolled out until the corresponding governance items are completed. The following items from CH's 140-item AI governance backlog are the critical path:

| Governance Item | Backlog Area | Blocks | Priority | Target |
|---|---|---|---|---|
| AI Acceptable Use Policy v1 | Usage Policy & Governance | ALL Phase 1 tool rollouts | CRITICAL | Within 30 days of report delivery |
| Data classification framework | IP Safeguards | All cloud AI tools | CRITICAL | Concurrent with AUP v1 |
| Approved tool list v1 | Tool Selection & Licensing | All PILOT and ADOPT tools | HIGH | Within 30 days of report delivery |
| Steam AI disclosure position | IP Safeguards | Art, Audio, Narrative tools | HIGH | Within 30 days of report delivery |
| AI-assisted concept art guidelines | Production Integration | Firefly PILOT | MEDIUM | Before Firefly PILOT begins |
| Asset attribution metadata standard | Production Integration | Any tool whose output enters the asset pipeline | MEDIUM | Before any AI-generated content enters Perforce |
| Vendor DPA review template | Tool Selection & Licensing | All SaaS tools processing CH data | MEDIUM | Before Phase 2 |
| Training materials library (Confluence structure) | Training & Education | All tool rollouts | LOW | Before first PILOT begins |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 21. BUDGET SUMMARY

### 21.1 Pre-Launch Total: ADOPT + PILOT + Infrastructure (mid-2026 to late 2028)

| Category | Discipline | Tool(s) | Pre-Launch Cost (USD) |
|---|---|---|---|
| **ADOPT** | Animation | MetaHuman Animator | $0 (free with UE5) |
| **PILOT** | Animation | Rokoko + Cascadeur | ~$8,984 |
| **PILOT** | Art | Adobe Firefly Enterprise + Substance 3D AI | ~$14,400 (likely lower; Substance AI is $0 marginal) |
| **PILOT** | Audio | Wwise Sound Search + ElevenLabs SFX | ~$2,376 |
| **PILOT** | Engineering | Aura | ~$2,880 |
| **PILOT** | Game Design | Machinations + Ludo.ai | ~$2,400-$5,280 |
| **PILOT** | QA | modl.ai | ~$60,000 (estimated) |
| **Infrastructure** | Cross-cutting | API gateway, monitoring | $0 (Phase 1); $500-$3,000/month if Phase 3 triggered |
| | | **ADOPT + PILOT Subtotal** | **~$91,040-$93,920** |
| | | **Infrastructure Subtotal (Phase 1)** | **$0** |
| | | **TOTAL PRE-LAUNCH** | **~$91,040-$93,920** |

**GBP equivalent (at 1 USD = 0.79 GBP, indicative):** ~£71,920-£74,200

**Concentration warning:** modl.ai represents ~64-66% of the total pre-launch budget. If modl.ai pricing is substantially different from the $60,000 estimate (based on a 2022 CEO quote), the total budget changes significantly. **Action: verify modl.ai pricing before budget approval.** If modl.ai is $30,000 instead of $60,000, total drops to ~$61,040-$63,920. If modl.ai is $90,000, total rises to ~$121,040-$123,920.

### 21.2 Post-Launch Annual Projected (Assuming PILOT Promotions)

| Discipline | Tool(s) | Post-Launch Annual (USD) |
|---|---|---|
| Animation | MetaHuman Animator + promoted PILOTs | ~$1,992 |
| Art | Firefly Enterprise + Substance 3D AI | ~$5,400 |
| Audio | Wwise Sound Search + ElevenLabs SFX | ~$1,188 |
| Engineering | Aura (if promoted) | ~$1,440 |
| Game Design | Machinations + Ludo.ai | ~$1,200-$2,640 |
| QA | modl.ai (if promoted) | ~$30,000 (estimated) |
| Community | ToxMod or GGWP (if adopted at launch) | TBD (custom pricing) |
| Platform | Anti-cheat (if AI layer adopted) | TBD (custom pricing) |
| Infrastructure | API gateway + potential self-hosted | $0-$36,000/year (cloud GPU if needed) |
| **TOTAL POST-LAUNCH ANNUAL** | | **~$41,220-$42,660 + TBD moderation + TBD anti-cheat** |

**GBP equivalent:** ~£32,560-£33,700 + TBD

### 21.3 Cost Avoidance and Efficiency Gains Estimate

These are estimated efficiency gains, not guaranteed savings. They represent time freed for higher-value creative work, not headcount reductions.

| Tool | Discipline | Estimated Productivity Impact | Basis |
|---|---|---|---|
| MetaHuman Animator | Animation | ~50-70% reduction in facial animation capture/cleanup time | Epic's published benchmarks; industry adoption data |
| Machinations | Game Design | ~34% reduction in economy design iteration time | Machinations published case study (Gameloft, Ubisoft) |
| modl.ai | QA | ~10,000+ simulated play-hours per cycle | modl.ai published capability; frees Hannah for manual QA |
| Adobe Firefly | Art | ~20-30% faster ideation moodboarding (est.) | General industry estimates for AI-assisted ideation; no CH-specific data |
| Jira AI / Rovo | Production | ~10-15% faster ticket triage and sprint planning (est.) | Atlassian published estimates |

**These gains are estimates marked (est.) and should be validated through CH's own pilot data.** Do not use these numbers in investor presentations without CH-specific evidence.

### 21.4 Comparison: AI Spend vs Equivalent Headcount

| Metric | AI Tooling (ADOPT + PILOT) | Equivalent Headcount |
|---|---|---|
| Pre-launch total (2.5 years) | ~$91,040-$93,920 | ~0.6-0.8 FTE (at ~£50,000/year UK mid-level salary, ~$63,000) |
| Post-launch annual | ~$41,220-$42,660 | ~0.7 FTE |

**Interpretation:** The entire AI tooling budget is less than one full-time employee. This is a low-cost bet across 14 disciplines. The risk is not overspending on AI; the risk is underspending on the hires that make AI tools operational (CTO, data lead, animation lead, QA expansion).

### 21.5 Currency Note

All costs in this report are in USD. GBP equivalents are provided at an approximate rate of **1 USD = 0.79 GBP**. This rate is indicative only and subject to FX movement over the 2+ year pre-launch window. USD is the primary reference currency because all tool vendors price in USD.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 22. RISK REGISTER

Top 10 risks of AI adoption, ranked by likelihood (1-5) x impact (1-5). Each risk is specific to CH's situation, not a generic AI risk.

| # | Risk | L | I | Score | Owner | Mitigation | Residual Risk |
|---|------|---|---|-------|-------|------------|---------------|
| 1 | **No CTO to own AI infrastructure decisions.** Anti-cheat, backend architecture, API gateway, self-hosted inference, engineering tools, and DevOps tooling are all blocked. | 5 | 4 | 20 | Vardis (CEO) | CTO hire is the highest-priority single action. Interim: Mustafa evaluates tools but does not make strategic commitments | Until CTO hired, 6 of 14 disciplines cannot progress beyond WATCH |
| 2 | **Zero data headcount blocks analytics, churn prediction, and economy monitoring.** CH launches an MMO without the ability to detect economy exploits or player churn | 4 | 5 | 20 | Aris (COO) | Data lead hire, prioritised alongside CTO. Analytics platform selection and telemetry taxonomy must be in place before beta | Post-launch economy health and player retention are unmonitored until hire is made |
| 3 | **Economy exploits go undetected post-launch.** No fraud detection infrastructure, no economy monitoring, no data team. MMO economies are exploited within days of launch | 4 | 5 | 20 | CTO + Data lead | Economy monitoring infrastructure in place before beta. Server-side detection logic. modl.ai bots can simulate exploit patterns | First-week exploits before monitoring is calibrated |
| 4 | **Community backlash over AI-generated content.** Public discovery of undisclosed AI use in art, marketing, or narrative triggers review-bombing, social media campaigns, and press coverage. (Note: discipline-level risk scores this at 4x5=20 if AI marketing imagery were adopted. This register scores post-mitigation likelihood at 2 because the report recommends AVOID for all public-facing AI imagery.) | 2 | 5 | 10 | Aris (COO) + Dino | Conservative disclosure posture (this report). All AI-assisted art is ideation only; no AI-generated content ships without human redraw. Steam disclosure form completed honestly. Community communication plan for AI usage prepared before any public-facing content | Residual: even disclosed AI use can trigger backlash from anti-AI community segments. Cannot be eliminated, only managed |
| 5 | **Art team resistance escalates beyond Sasha.** Voluntary AI art rollout triggers broader team concerns about job security or creative integrity, leading to morale issues or attrition | 2 | 4 | 8 | David Luong | Voluntary-only policy is non-negotiable. Firefly positioned as moodboarding tool, not replacement. Fred Dossola's incremental approach. Regular anonymous pulse surveys during pilot. Immediate rollback if morale drops | If multiple artists object, the art-AI programme pauses entirely. This is acceptable |
| 6 | **modl.ai pricing is substantially higher than estimated, making QA automation unaffordable.** The $60K estimate is based on a 2022 CEO quote; actual pricing may differ | 3 | 3 | 9 | Aris (budget) | Verify pricing before budget approval. If modl.ai exceeds $100K, re-evaluate: (a) negotiate based on pre-launch studio scale, (b) evaluate alternative approaches (custom bot framework), (c) delay until post-launch when revenue justifies cost | QA remains manual (Hannah + vendor) if AI testing is unaffordable |
| 7 | **SAG-AFTRA / Equity violation.** A team member uses AI voice tools (cloning, synthesis) without authorisation, triggering union action | 1 | 5 | 5 | Dino (General Counsel) | AI Acceptable Use Policy v1 explicitly prohibits AI voice performance. No AI voice tools recommended in this report. Wwise Sound Search and ElevenLabs SFX are SFX-only, not voice. Policy training for all audio team members | Residual: individual policy violation. Cannot be eliminated by technology; managed by clear policy, training, and disciplinary framework |
| 8 | **Partner IP processed through cloud AI.** A team member inputs partner game assets or cross-promotion content into a public AI tool, violating contractual obligations | 2 | 5 | 10 | Dino + CTO | Data classification framework (Section 4.1) classifies partner IP as CRITICAL/NO. Technical enforcement via API gateway rules when CTO implements. Policy training for all teams with partner IP access | Residual: individual policy violation before technical controls are in place |
| 9 | **AI tool vendor goes insolvent or pivots.** Small vendors (Anybrain, Charisma.ai, Convai, Promethean AI, Meshy) have limited funding and may not survive 2+ years. Larger vendors may broaden focus away from gaming (Inworld already has) | 3 | 3 | 9 | CTO | No ADOPT recommendation for any high-vendor-risk tool. All high-risk vendors are WATCH. PILOT tools have rollback triggers. Export data and workflows documented before pilot begins | Vendor failure of a WATCH tool has zero impact. Vendor failure of a promoted PILOT requires migration (planned in rollback trigger) |
| 10 | **AI governance backlog remains at 0% completion.** 140 items across 5 areas are all "Not Started." Without governance infrastructure, tool adoption is informal and uncontrolled | 4 | 3 | 12 | Aris (COO) | Phase 1 governance prerequisites (Section 19.1) provide the minimum viable governance. Focus on the 8 critical-path items in Section 20.4, not all 140. Quarterly governance progress review | Residual: governance debt accumulates in low-priority areas. Acceptable if critical-path items are completed |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 23. APPENDICES

### Appendix A: Full Tool Inventory

All tools evaluated in this report, including those not recommended. Sorted by discipline, then by composite score descending within each discipline.

| # | Tool | Discipline | Type | Composite | Verdict | Pre-Launch Cost | Website |
|---|------|-----------|------|-----------|---------|----------------|---------|
| | **Animation** | | | | | | |
| 1 | MetaHuman Animator | Animation | Free (UE5) | 8.8 | ADOPT | $0 | [unrealengine.com](https://www.unrealengine.com/metahuman) |
| 2 | Cascadeur | Animation | Desktop | 7.4 | PILOT | ~$1,584 | [cascadeur.com](https://cascadeur.com/) |
| 3 | Rokoko | Animation | HW+SaaS | 6.6 | PILOT | ~$7,400 | [rokoko.com](https://www.rokoko.com/) |
| 4 | Move.ai | Animation | SaaS | 6.0 | WATCH | $0 | [move.ai](https://www.move.ai/) |
| 5 | DeepMotion | Animation | SaaS | 5.5 | WATCH | $0 | [deepmotion.com](https://www.deepmotion.com/) |
| | **Art Pipeline** | | | | | | |
| 6 | Substance 3D AI | Art | SaaS | 7.2 | PILOT | $0 marginal | [adobe.com/products/substance3d](https://www.adobe.com/products/substance3d.html) |
| 7 | Adobe Firefly | Art | SaaS | 7.0 | PILOT | ~$14,400 | [firefly.adobe.com](https://firefly.adobe.com/) |
| 8 | Houdini ML | Art/VFX | Desktop | 6.9 | WATCH | $0 | [sidefx.com](https://www.sidefx.com/) |
| 9 | Promethean AI | Art/Level Design | SaaS | 6.0 | WATCH | $0 | [prometheanai.com](https://www.prometheanai.com/) |
| 10 | Meshy | Art | SaaS | 4.9 | WATCH | $0 | [meshy.ai](https://www.meshy.ai/) |
| | **Audio** | | | | | | |
| 11 | Wwise Similar Sound Search | Audio | SaaS (conditional) | 7.8 | PILOT (conditional) | $0 marginal | [audiokinetic.com](https://www.audiokinetic.com/) |
| 12 | iZotope Ozone | Audio | Desktop | 7.6 | WATCH | $0 | [izotope.com](https://www.izotope.com/) |
| 13 | ElevenLabs SFX | Audio | SaaS | 5.9 | PILOT | ~$2,376 | [elevenlabs.io](https://elevenlabs.io/) |
| 14 | LANDR | Audio | SaaS | 5.8 | WATCH | $0 | [landr.com](https://www.landr.com/) |
| 15 | AIVA | Audio | SaaS | 5.3 | WATCH | $0 | [aiva.ai](https://www.aiva.ai/) |
| 16 | Soundraw | Audio | SaaS | 4.5 | AVOID | $0 | [soundraw.io](https://soundraw.io/) |
| | **Engineering** | | | | | | |
| 17 | Aura | Engineering | SaaS | 6.5 | PILOT | ~$2,880 | [tryaura.dev](https://tryaura.dev/) |
| 18 | UE CoPilot | Engineering | Plugin | 5.6 | WATCH | $0 | [fab.com](https://www.fab.com/) |
| | **DevOps & Infrastructure** | | | | | | |
| 19 | TeamCity AI | DevOps | SaaS/On-prem | 5.6 | WATCH | $0 | [jetbrains.com/teamcity](https://www.jetbrains.com/teamcity/) |
| | **Game Design** | | | | | | |
| 20 | Machinations | Game Design | SaaS | 7.8 | PILOT | ~$1,200-$3,480 | [machinations.io](https://machinations.io/) |
| 21 | Ludo.ai | Game Design | SaaS | 6.7 | PILOT | ~$1,200-$1,800 | [ludo.ai](https://ludo.ai/) |
| | **QA & Testing** | | | | | | |
| 22 | modl.ai | QA | SaaS | 6.4 | PILOT (contingent) | ~$60,000 (estimated) | [modl.ai](https://modl.ai/) |
| 23 | GameDriver | QA | SaaS/QaaS | N/S | WATCH | $0 | [gamedriver.ai](https://gamedriver.ai/) |
| | **Narrative & Localisation** | | | | | | |
| 24 | memoQ | Localisation | Desktop/SaaS | 7.3 | WATCH (Year 2+) | $0 | [memoq.com](https://www.memoq.com/) |
| 25 | Phrase TMS | Localisation | SaaS | 7.1 | WATCH (Year 2+) | $0 | [phrase.com](https://phrase.com/) |
| 26 | Charisma.ai | Narrative | SaaS | 5.7 | WATCH | $0 | [charisma.ai](https://charisma.ai/) |
| 27 | Convai | Narrative | SaaS | 4.9 | WATCH | $0 | [convai.com](https://www.convai.com/) |
| 28 | Inworld AI | Narrative | SaaS | 4.7 | WATCH | $0 | [inworld.ai](https://www.inworld.ai/) |
| | **Marketing & Community** | | | | | | |
| 29 | ToxMod | Community | SaaS | 7.7 | WATCH | $0 | [modulate.ai](https://www.modulate.ai/) |
| 30 | GGWP | Community | SaaS | 7.1 | WATCH | $0 | [ggwp.com](https://ggwp.com/) |
| 31 | AI marketing imagery | Marketing | Various | 5.5 | AVOID | $0 | N/A |
| | **Finance & Legal** | | | | | | |
| 32 | Harvey | Legal | SaaS | 6.9 | WATCH | $0 | [harvey.ai](https://www.harvey.ai/) |
| 33 | Luminance | Legal | SaaS | 6.1 | WATCH | $0 | [luminance.com](https://www.luminance.com/) |
| | **Platform & Backend** | | | | | | |
| 34 | Anybrain | Platform/Anti-Cheat | SaaS | 5.7 | WATCH | $0 | [anybrain.gg](https://anybrain.gg/) |

*N/S = Not separately scored (brief evaluation only; see QA section for rationale).*
*Inventory: 34 entries. The 32 tools in the original evaluation scope (1 ADOPT, 10 PILOT, 19 WATCH, 2 AVOID) plus DeepMotion (scored in Section 5 but missing from the original inventory) and GameDriver (brief evaluation added during editorial review). Scenario and Layer were assessed in Section 6 but not inventoried (2D tools, not relevant to CH's 3D pipeline).*

### Appendix B: Vendor Comparison Matrix

**Art Pipeline Tools (Concept/Texturing/3D)**

| Dimension | Adobe Firefly | Substance 3D AI | Meshy | Promethean AI |
|---|---|---|---|---|
| Training data provenance | Licensed (Adobe Stock + public domain) | Licensed (Adobe ecosystem) | Unclear; no IP indemnification | Disney Accelerator backed; provenance unclear |
| IP indemnification | Yes (Enterprise tier) | Yes (Enterprise tier) | No | No |
| UE5 integration | Via asset export | Native plugins | FBX import | UE5/Maya/Blender plugins |
| Steam disclosure trigger | Yes (Pre-Generated) | Likely yes | Yes (Pre-Generated) | Yes (Pre-Generated) |
| Self-hosted option | No | No | No | No (individual free tier is local) |

**NPC Dialogue Tools**

| Dimension | Inworld AI | Charisma.ai | Convai |
|---|---|---|---|
| Company stability | Broadened beyond gaming | CTO departed; CEO split focus | $5M seed only; ~41 employees |
| Latency | Sub-200ms (claimed) | Not published | 8-10 seconds (documented) |
| UE5 plugin | Yes (multi-plugin SDK) | Yes (MIT-licensed) | Yes |
| SAG-AFTRA compliance | No statement | No statement | No statement |
| Shipped game | None confirmed | None confirmed | None confirmed |

**Localisation Tools**

| Dimension | memoQ | Phrase TMS |
|---|---|---|
| Gaming specialisation | Gaming Bundle (Gridly + Voiseed) | Bohemia Interactive, GameHouse, Mixi |
| Pricing model | Per translator ($30-$44/month) | Per-plan (from ~$525/month) |
| UE5 integration | Via Gridly game string management | API-based |
| GDPR | EU-headquartered (Hungary) | EU data processing available |

### Appendix C: Governance Backlog Priority Map

The following items from CH's 140-item AI governance backlog are prioritised against the phased adoption roadmap. Items not listed here are lower priority and should be addressed after Phase 1 governance is operational.

**Critical Path (must complete before Phase 1 tools roll out):**

| # | Governance Item | Backlog Area | Blocks | Target |
|---|---|---|---|---|
| 1 | AI Acceptable Use Policy v1 | Usage Policy & Governance | All tool rollouts | 30 days |
| 2 | Data classification framework for AI workflows | IP Safeguards | All cloud AI tools | 30 days (concurrent with AUP) |
| 3 | Approved tool list v1 | Tool Selection & Licensing | All PILOT/ADOPT | 30 days |
| 4 | Steam AI disclosure position | IP Safeguards | Art, Audio, Narrative tools | 30 days |

**Phase 2 Prerequisites (must complete before Phase 2 tools roll out):**

| # | Governance Item | Backlog Area | Blocks | Target |
|---|---|---|---|---|
| 5 | AI-assisted concept art guidelines | Production Integration | Firefly PILOT | Before Firefly PILOT |
| 6 | Asset attribution metadata standard | Production Integration | Any AI output entering Perforce | Before any AI content in asset pipeline |
| 7 | Vendor DPA review template | Tool Selection & Licensing | All SaaS tools processing CH data | Before Phase 2 |
| 8 | GDPR transfer mechanism verification for HiBob Bob AI | IP Safeguards | HiBob AI features | Before enabling Bob AI for employee PII |

**Phase 3 and Ongoing:**

| # | Governance Item | Backlog Area | Blocks | Target |
|---|---|---|---|---|
| 9 | Player data classification (PII, payment, telemetry) | IP Safeguards | Analytics platform, anti-cheat | Before telemetry implementation |
| 10 | Anti-cheat policy and threat model | Usage Policy & Governance | Anti-cheat selection | Pre-alpha |
| 11 | External law firm AI usage policy | IP Safeguards | External counsel AI tool use | Before next major contract cycle |
| 12 | 6-month AI tool re-evaluation methodology | Tool Selection & Licensing | Fast-moving categories | CTO in post |

### Appendix D: Glossary of Terms

| Term | Definition |
|---|---|
| ADOPT | Roll out now. Full deployment with named owner, success criteria, and rollback trigger. |
| PILOT | Time-boxed trial. Defined scope (team, seats, duration, data to collect). Promotes to ADOPT or rolls back at end of period. |
| WATCH | Not ready yet. Specific reconsideration criteria and revisit date defined. |
| AVOID | Risk outweighs benefit. Specific risk, probability, impact, and alternative workflow documented. |
| Agilefall | CH's production methodology: agile sprints within waterfall milestone gates. |
| Composite score | Weighted average across 6 dimensions: Capability (25%), Production Readiness (20%), IP/Legal (20%), Team Adoption (15%), Integration (10%), Cost (10%). |
| DPA | Data Processing Agreement. Contractual agreement governing how a vendor processes CH's data. Required under GDPR for any processor handling personal data. |
| GDPR Article 9 | Special categories of personal data (health, biometric, ethnic origin, etc.) requiring explicit consent or other Article 9(2) lawful basis. Applies to HR data. |
| GDPR Article 22 | Right not to be subject to solely automated individual decision-making with legal or similarly significant effects. Applies to AI hiring tools. |
| GDPR Chapter V | Rules on international transfers of personal data. Triggered when EU/UK personal data is processed by US-based cloud AI services. |
| EU AI Act | Regulation (EU) 2024/1689. Classifies AI systems by risk level. "High-risk" category includes AI used in recruitment and employment. |
| GDD | Game Design Document. CH's comprehensive specification for game features, systems, and content. |
| IP indemnification | Vendor contractual commitment to defend and indemnify the customer against third-party IP infringement claims arising from the tool's outputs. |
| LiveOps | Live operations: post-launch game management including content updates, events, economy tuning, and player engagement. |
| Metagame backend | CH's server infrastructure for accounts, economy, social graph, faction state, and matchmaking. Distinct from zone/instance servers. |
| Pre-Generated (Steam) | Steam AI disclosure category for AI content created during development and included in the shipped build (e.g., AI-textured assets). |
| Live-Generated (Steam) | Steam AI disclosure category for AI content generated at runtime during gameplay (e.g., AI NPC dialogue). |
| RMT | Real-money trading. Players selling in-game currency or items for real money outside the game's official systems. |
| Sensitivity floor | Rule: if a tool scores below 4 on IP/Legal Safety (art/audio/narrative) or below 4 on Production Readiness (shipped assets), maximum verdict is WATCH regardless of composite. |
| (est.) | Marker on Team Adoption Risk scores indicating the score is an estimate, not based on stakeholder interviews. |
| (estimated) | Marker on pricing figures derived from public sources rather than direct vendor quotes. Confirm with the vendor before committing budget. |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
