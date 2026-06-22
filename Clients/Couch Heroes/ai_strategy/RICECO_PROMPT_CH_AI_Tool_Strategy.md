# RICECO Prompt: Couch Heroes AI Tool Strategy & Recommendation Report

**Purpose:** Feed this prompt to a frontier LLM with extended output capability (e.g., Claude with extended thinking/output, or any model supporting 50K+ output tokens). See execution notes at the end for output volume guidance and model-specific fallbacks.

---

## R — Role

Act as a senior partner at a tier-one management consultancy (McKinsey, BCG, or Bain calibre) who also holds deep domain expertise in games industry technology strategy. You have 15+ years advising AAA and AA game studios on technology adoption, production pipeline optimisation, and organisational change management. You have hands-on familiarity with Unreal Engine 5 multiplayer architecture, MMO production at scale, and the current AI tooling landscape. You are advising the C-suite (CEO, COO, CPO) of a pre-launch MMO studio on their comprehensive AI adoption strategy. Your output must withstand scrutiny from both technical leads (Head of Tech, Art Director, Audio Director) and business stakeholders (investors, legal counsel, board). You are not a cheerleader for AI — you are a rigorous analyst who recommends only where ROI is defensible, flags where risk outweighs benefit, and is explicit about what NOT to adopt.

---

## I — Instruction

Produce a comprehensive AI Tool Strategy & Recommendation Report for Couch Heroes (CH Game Development UK Ltd), covering every discipline involved in building and operating an MMO studio and shipping the game. For each discipline, you must:

1. **Map the discipline's workflow** to specific tasks where AI tooling could be applied (not vague categories — name the actual production steps). Target 3-6 tasks per discipline. A "task" is a distinct production step with its own tool requirements (e.g., "Concept Art — Ideation & Moodboarding" is one task; "Concept Art — Character Silhouette Exploration" is too granular and should be folded into ideation). Err toward fewer, meatier tasks over many thin ones

2. **Identify the 2-4 best-in-class AI tools** for each task, including both commercial SaaS and self-hosted/open-source options. **Prioritise specialist tools purpose-built for the discipline over general-purpose LLMs.** A recommendation of "use ChatGPT" or "use Claude" for a task where a dedicated tool exists (e.g., Cascadeur for animation, Machinations for economy balancing, Inworld AI for NPC dialogue, Promethean AI for level design, Move.ai for mocap, Phrase TMS for localisation) is a failure of research. General-purpose LLMs are valid recommendations ONLY for tasks where no specialist tool exists (e.g., meeting summarisation, internal documentation drafting). For each task, actively search your knowledge for: (a) tools built specifically for that discipline in game development, (b) tools built for that discipline in adjacent industries (film VFX, architecture, broadcast) that have game-studio adoption, (c) UE5-native plugins or integrations. Only after exhausting specialist options should a general-purpose LLM appear in the table. Where your training data may be outdated on pricing, availability, or version specifics, flag the claim with `[VERIFY: reason]` so the consulting team can fact-check before delivery. Do not present uncertain information as fact. When a tool is relevant to multiple disciplines (e.g., GitHub Copilot for Engineering, DevOps, and Game Design), evaluate it fully in its primary discipline and cross-reference in secondary disciplines with a one-line note: "See Section [X] for full evaluation; CH-specific notes for this discipline: [brief]." Do not duplicate the full table. For tasks with 4+ candidates, provide "Why not" rationale for the top 2 rejected tools only; list the remainder in Appendix A. When two tools score within 0.5 composite points of each other, do not arbitrarily pick a winner — state they are functionally equivalent and differentiate on the dimension most specific to CH (typically Team Adoption Risk or Integration Effort). If they remain indistinguishable, recommend both for PILOT with a comparative evaluation framework

3. **Score each tool** on a standardised 6-dimension rubric:
   - **Capability Fit** (1-10): How well does this tool solve THIS studio's specific problem, given UE5, MMO scale, and the game's design pillars?
     - 10 = purpose-built for this exact use case and engine; 7 = strong fit with minor gaps; 4 = general-purpose tool requiring significant adaptation; 1 = fundamentally mismatched
   - **Production Readiness** (1-10): Is this tool shipping-quality, or still experimental? Has it been used in a game that has actually launched?
     - 10 = shipped in a AAA title with 1M+ units sold, used across multiple studios, 3+ years in production; 7 = used in at least one shipped indie/AA title, stable release with commercial support; 4 = beta/early access, used in pre-production or internal prototypes only, no shipped title confirmed; 1 = research prototype, no commercial release, academic or demo use only
   - **IP/Legal Safety** (1-10): Training data provenance, output ownership, GDPR compliance, vendor indemnification, platform disclosure risk
     - 10 = fully licensed training data, explicit commercial output ownership, IP indemnification, GDPR-compliant data processing, no platform disclosure trigger; 7 = mostly clean provenance with minor open questions, standard commercial licence; 4 = active litigation against the model class, ambiguous output ownership, no indemnification; 1 = known copyright infringement in training data, vendor claims licence to outputs, active regulatory action
   - **Team Adoption Risk** (1-10): How likely is CH's specific team to actually adopt this, given skill levels, resistance profiles, remote workflow, and existing DCC tool stack? **Important: scores in this dimension are estimates based on available information about CH's named individuals and general discipline patterns. They are NOT based on stakeholder interviews or change readiness assessments. Mark all Team Adoption Risk scores with "(est.)" in the table. The consulting team should validate these scores through structured conversations with discipline leads before finalising verdicts.**
     - 10 = drop-in replacement for existing tool, team already familiar, no change management needed; 7 = new tool but intuitive for the discipline, training is a half-day session; 4 = requires significant workflow change, some team members will resist, needs a champion; 1 = requires discipline expertise the team lacks, active opposition from key personnel, would destabilise an already-fragile team
   - **Integration Effort** (1-10): How much engineering/pipeline work to integrate into CH's specific stack (UE5, Perforce, JIRA, Slack, and existing DCC tools)? 10 = drop-in, 1 = months of custom work
     - 10 = native plugin or API, works with CH's exact stack out of the box; 7 = documented integration path, 1-2 days of engineering; 4 = requires custom scripting or middleware, 1-2 weeks; 1 = no integration path exists, months of bespoke development, requires dedicated DevOps resource CH does not have
   - **Cost Efficiency** (1-10): Cost per seat or per output relative to the alternative (human-only or current tooling), at CH's scale
     - 10 = free/open-source with minimal infrastructure cost; 7 = pays for itself within 3 months through measurable time savings; 4 = meaningful cost that requires budget approval, ROI is 6-12 months; 1 = enterprise pricing that exceeds the cost of the human workflow it replaces at CH's scale

4. **Provide a weighted composite score** using these weights:
   - Capability Fit: 25%
   - Production Readiness: 20%
   - IP/Legal Safety: 20%
   - Team Adoption Risk: 15%
   - Integration Effort: 10%
   - Cost Efficiency: 10%
   - Formula: Composite = (Cap × 0.25) + (Prod × 0.20) + (IP × 0.20) + (Adopt × 0.15) + (Integ × 0.10) + (Cost × 0.10). Round to one decimal place (round half up: 6.25 → 6.3, 6.05 → 6.1).

5. **Your scores MUST use the full 1-10 range.** Do not cluster scores in the 5-7 range. If a tool is weak on a dimension, score it below 4. If it is genuinely excellent, score it 9-10. Use the calibration anchors for every score; do not hedge to the middle. Each discipline section should contain at least one individual score of 3 or below and at least one of 9 or above across all its tool evaluations. If a tool scores below 4 on IP/Legal Safety (for art, audio, or narrative tools) or below 4 on Production Readiness (for anything touching shipped assets), the verdict CANNOT be ADOPT or PILOT regardless of composite score.

6. **Make a clear recommendation** per task using one of four verdicts:
   - **ADOPT** (roll out now): Must include (a) estimated integration timeline, (b) who in CH's current org owns the rollout, (c) what success looks like after 90 days, (d) what would trigger a rollback. Where the natural rollout owner does not yet exist in CH's org (CTO, Head of Data, DevOps Lead), assign interim ownership to the most senior adjacent role and flag the dependency on the hire. **Owner-capacity rule:** If the only available rollout owner is already identified as overloaded (Hannah in QA), not yet in post (Lili in Finance), or a zero-headcount discipline (Data/Analytics), the maximum verdict is PILOT contingent on the hire, not ADOPT.
   - **PILOT** (time-boxed trial): Same requirements as ADOPT, plus defined pilot scope (which team, how many seats, how long, what data to collect). The exemplar below demonstrates a PILOT verdict. For ADOPT verdicts, the same structure applies but replace pilot scope with full rollout plan (all target seats, training schedule, go-live date)
   - **WATCH** (not ready yet): Must include what specifically would need to change for the tool to be reconsidered (maturity milestone, legal resolution, pricing change) and a suggested revisit date
   - **AVOID** (risk outweighs benefit): Must include the specific risk that drives the exclusion, the probability and impact of that risk materialising, what CH loses by not adopting (the counterfactual cost), and what the alternative human-only workflow is

7. **Flag discipline-specific risks** — including reputational risk (art community backlash), contractual risk (SAG-AFTRA, platform disclosure), and organisational risk (team resistance, skill atrophy)

8. **Self-verification during generation.** After completing each discipline section, verify before moving to the next:
   - Did you show the composite calculation for at least the recommended tool? (Prevents arithmetic drift)
   - Does this section contain at least one score ≤3 and one ≥9? (Prevents clustering)
   - Did you cite a production use or flag `[VERIFY]` for every tool? (Prevents fabrication)
   - For Art sections: did you address Sasha's opposition? For Audio sections: did you address SAG-AFTRA/Equity? For any cloud tool: did you state the data egress model? (Prevents constraint amnesia)
   If any check fails, fix it before proceeding. Do not leave it for a later editing pass.

9. **Estimate costs across two periods** for each tool at CH's scale: (a) pre-launch total (mid-2026 to late 2028 launch), and (b) ongoing post-launch annual cost if the tool remains in use. Note which tools are production-only (can be dropped at launch) versus permanent infrastructure. All costs in USD. The Budget Summary section should include a total in both USD and GBP at an approximate conversion rate of 1 USD = 0.79 GBP (indicative; subject to FX movement over the pre-launch window — USD is the primary reference).

10. **For each ADOPT/PILOT tool, state the data egress model:** Does it require data egress to a third-party API (cloud inference), can it run on self-hosted infrastructure, or does it operate entirely offline/locally? For tools that require cloud inference, note which data categories can safely be included in inputs:
   - **Game data:** partner IP, unreleased game assets, GDD content, source code
   - **Employee data:** CVs, performance reviews, salary information, disciplinary records (GDPR applies; CH has employees in UK and Greece; US-based cloud APIs trigger GDPR transfer mechanism requirements)
   - **Commercial data:** cap table, fundraising terms, financial projections, investor correspondence
   - **Player data:** telemetry, PII, payment data (post-launch)
   If a data category cannot safely be sent, specify the workflow guardrails needed (input sanitisation, separate instances, air-gapped environments, GDPR-compliant data processing agreements).

11. **For tool categories where the market moves faster than a 6-month recommendation cycle** (code copilots, image generation, LLM-based testing), recommend a reusable evaluation methodology CH can apply at each 6-month review cycle, alongside naming the current best-in-class. The methodology should use the same rubric defined in this report, not predictions about which tools will improve. Frame as "adopt this category with [tool] as the current leader, reassess using [criteria]" rather than a permanent tool commitment. This is not forecasting (do not predict vendor roadmaps or speculative capabilities); it is providing a durable decision framework.

The disciplines to cover (14 total):

1. **Engineering** (code copilots, code review, debugging, UE5-specific tooling)
2. **DevOps & Infrastructure** (CI/CD automation and pipeline generation, infrastructure-as-code, incident response automation, on-call triage, cloud cost optimisation, UE5 build acceleration)
3. **Art** (concept art, 3D modelling, texturing, material creation, upscaling, environment art, character art, UI/UX design)
4. **Animation** (motion capture cleanup, retargeting, procedural animation, facial animation, crowd/NPC animation)
5. **Audio** (sound design/SFX generation, adaptive music, voice — with explicit SAG-AFTRA/Equity analysis, mastering, spatial audio)
6. **Game Design** (systems design prototyping, economy balancing/simulation, level design, encounter design, content generation for testing)
7. **QA & Testing** (automated gameplay testing, visual regression, bug triage, AI-driven playtesting, load/stress testing, exploit detection, accessibility compliance testing including automated WCAG audit, colour contrast analysis for the byte-punk palette, platform-specific accessibility certification)
8. **Narrative & Localisation** (quest/dialogue drafting, lore consistency checking, NPC dialogue variation, localisation draft + human review pipeline)
9. **Production & Project Management** (scheduling optimisation, risk prediction, dependency analysis, meeting summarisation, status reporting)
10. **Marketing & Community** (content creation, social listening, sentiment analysis, community moderation, trailer/asset generation)
11. **Data & Analytics** (player telemetry, economy monitoring, churn prediction, A/B testing, LiveOps optimisation)
12. **Platform & Backend** (anti-cheat, fraud detection, matchmaking optimisation, infrastructure scaling, incident response)
13. **HR & People** (candidate screening, onboarding, performance analytics, compensation benchmarking)
14. **Finance & Legal** (contract analysis, compliance monitoring, financial forecasting, IP risk scanning)

After the discipline-by-discipline analysis, provide:

- **Cross-cutting Infrastructure Recommendations**: What foundational AI infrastructure should CH invest in? Include a decision framework for when CH should self-host AI models versus use cloud APIs, considering: (a) CH has no dedicated DevOps and engineers are already context-switching into infra, (b) self-hosted models require GPU hardware or cloud GPU instances with cost and expertise implications, (c) partner IP and unreleased assets create a hard requirement for data isolation in some workflows. Recommend a specific infrastructure tier (e.g., "start with cloud APIs behind an API gateway for non-sensitive workflows; plan self-hosted inference for art and audio only once a DevOps hire is in place"). Also cover: API gateway for cost control, prompt libraries, evaluation frameworks, data classification for AI workflows.

- **Phased Adoption Roadmap**: Which tools to adopt in Phase 1 (immediate, next 3 months), Phase 2 (3-9 months), Phase 3 (9-18 months), mapped against the game's development timeline toward late 2028 launch AND CH's Agilefall production cadence. For each ADOPT/PILOT tool, state whether it should be introduced at a sprint boundary or milestone gate, and whether a rollback would need to happen before or after the next gate. If the game's milestone dates are unknown, state the dependency ("Introduce at the sprint boundary following Alpha lock" rather than "introduce in month 6"). Include a dependency map showing what must be in place before each phase (governance prerequisites, hires, infrastructure).

- **Organisational Change Management**: How to roll this out in a 70-person remote studio, addressing the specific realities documented in the Context section. This is not a generic change management framework — it must address CH's named individuals, team dynamics, and organisational constraints.

- **Budget Summary**: Total estimated AI tooling spend across all recommendations, broken into ADOPT, PILOT, and infrastructure categories. Include pre-launch total and post-launch annual.

- **Risk Register**: Top 10 risks of AI adoption ranked by likelihood (1-5) × impact (1-5), each with: description, risk score, owner (named CH role), mitigation, and residual risk.

---

## C — Context

### The Studio

- **Entity:** CH Game Development UK Ltd. Greek-headquartered, UK entity established 2026
- **Size:** ~70 employees as of mid-June 2026, growing. UK and Greece based, 100% fully remote
- **Funding:** $5M round closed May 2026; $10M Series B target. GBP 10-15M raised to date. Vardy family companies (~23.8B conglomerate) are significant backers. Cap table full; 2-3 more raises expected
- **Leadership:**
  - Vardis — CEO/Creative Director
  - Aris — COO (operational decisions, actively using AI automations)
  - Glen Pryer — fractional CPO via NBI Analytics (advisory capacity)
  - Mustafa — Head of Tech (NOT CTO; defaults to silent in meetings; needs forcing in early)
  - Robin Jubber — Game Director (individual contributor; restructured from management)
  - Simon Woodruff — Head of Design (starting 15 June 2026; Sea of Thieves, Epic R&D, Simon the Sorcerer creator, 30+ years; may not yet be in post at time of report generation; views on AI in design workflows are unknown — do not assume buy-in)
  - David Luong — Director of Art
  - Hannah — QA Lead (sole QA resource; vendor pipeline being planned)
  - Valeria Trofimova — Head of Production
  - Lorenza Menna — Head of HR (solo, based in Italy)
  - Lili — Head of Finance (starting 1 July 2026; may not yet be in post at time of report generation — if pre-July, treat Finance rollout owners as vacant)
  - Graham — Executive Producer (~20 years experience; early behavioural concerns, in probationary assessment)
  - Dino — General Counsel
- **No CTO yet** — the CTO search is active. This is a critical gap for AI infrastructure decisions
- **External legal:** Saybrook Legal engaged April 2026; Mishcon de Reya for contract templates

### Approximate Team Sizes (mid-June 2026)

| Discipline | Headcount | Notes |
|---|---|---|
| Engineering | ~10-12 | No CTO, no dedicated DevOps. Engineers context-switching into IT/infra |
| Art | ~15-18 | Director of Art + leads + artists. Sasha Krieger leads concept/environment |
| Animation | ~4-6 | Lead (Alan/Alon) on PIP, expected exit. Backfill being pipelined |
| Audio | ~2-3 | Small team |
| Game Design | ~6-8 | Head of Design (Simon, just started) + Game Director (Robin) + designers |
| QA | 1 | Hannah is the sole resource. Vendor pipeline planned |
| Narrative | ~2-3 | Narrative Designer + overlap with quest design. Head of Narrative hire needed |
| Production | ~3-4 | Head of Production + Art Producer (Fred, started June) + producer(s) |
| Marketing/Community | ~2-3 | Small team |
| Data/Analytics | 0 | No dedicated resource yet |
| HR | 1 | Lorenza (solo, based in Italy) |
| Finance | 1 | Lili (starting July 2026) |
| Legal | 1 | Dino (General Counsel, internal) + external firms |

### Current Tooling Stack

- **Engine:** Unreal Engine 5
- **Source control:** Perforce (primary); Git+LFS under evaluation
- **Project management:** JIRA (being set up); Confluence for documentation
- **Communication:** Slack
- **Art DCC:** Maya, ZBrush, Substance Suite (Painter/Designer), Houdini, Marvelous Designer, Photoshop
- **Audio DCC:** Wwise or FMOD (under evaluation); Pro Tools / Reaper
- **Art review:** Under evaluation (SyncSketch, ftrack, ShotGrid)
- **CI/CD:** Under evaluation (TeamCity, Jenkins, BuildKite)
- **HR system:** HiBob
- **Production methodology:** "Agilefall" — agile sprints within waterfall milestone gates

### The Game

- **Genre/aesthetic:** Cosy byte-punk MMORPG
- **Engine:** Unreal Engine 5
- **Target platforms:** PC first, console to follow, cross-play with mobile at launch
- **Launch target:** Late 2028
- **Monetisation:** Free-to-install, paid subscription (expansions + in-game currency stipend), cosmetics marketplace. No stat gear — cosmetics are aspirational
- **Zone architecture:** 200-300 concurrent players per zone (primary target), aspirational 600. Hybrid zone architecture with 5 server profiles:
  1. Overworld zone servers (200-600 players, aggressive interest management, 10-20Hz tick rate)
  2. Hub shard servers (Downtime city, sharded at density thresholds, social-graph-aware routing)
  3. Instance servers (dungeons, raids, structured PvP at 30Hz)
  4. User Space servers (player housing instances, on-demand, 12-24 visitors per house)
  5. Metagame backend (accounts, economy, social graph, faction state, matchmaking)
- **Combat:** Pressure/crack stack system (striking builds cracks 1-7, detonating creates stuns). GW2-style hitbox targeting (not tab targeting). Weapon-as-soft-class system. 100-player combat encounter cap per zone
- **World:** 5 factions (Allegiant, Athenaeum, Adeticus, Mendarium, Purple), corruption world mechanic, no-stat cosmetics, player housing (User Spaces), guilds, crafting professions, fishing, PvP zone cloning (separate PvP instances of existing zones)
- **Scale:** ~1,200+ features across 5 spreadsheet categories (Game Features, TDD, Platform, Content, Live Service)
- **Design references:** WoW (systems/feel), GW2 (hitbox combat), ESO (live service model), FFXIV (positive community culture)
- **Competitive set:** Palia (failed at 25/zone; acquired by Daybreak after layoffs), Tower of Fantasy (declining concurrent), Throne & Liberty (consolidated 107 to 25 servers in 4 months), Ashes of Creation (alpha, not shipped), FFXIV, GW2
- **Player archetype mix:** 30-35% of playerbase estimated non-combat-primary (crafting, social, exploration)
- **Enemy AI:** Tag-based system using 5 D&D attributes with 3 tiers each = 15+ archetypes

### Sensitivities (CRITICAL — the report must address these directly)

- **Art team resistance:** Sasha Krieger (Lead Concept/Environment) has strong personal opposition to AI for art. This is genuine conviction, not ignorance. Any art-AI recommendation must account for team dynamics, not just technical capability. Rollout must be voluntary and positioned as a reference/ideation tool, not a replacement
- **SAG-AFTRA / Equity:** Voice cloning is a non-negotiable prohibition. Post-2024 strike terms apply. UK Equity has parallel demands. Any audio-AI recommendation must be explicit about union compliance
- **Platform disclosure:** Steam mandatory AI disclosure since January 2024. Console platforms tightening. Every tool recommendation must flag whether its use triggers platform disclosure obligations
- **Partner IP:** CH's game integrates partner games' IP (quests unlock partner titles). AI tools must NEVER process partner IP through public models. This is a contractual obligation, not a preference
- **AI governance backlog:** The studio has a 140-item AI governance backlog covering 5 areas (Usage Policy & Governance ~26 items, Tool Selection & Licensing ~25 items, Training & Education ~27 items, Production Integration ~29 items, IP Safeguards ~30 items) — all items are currently "Not Started." For each discipline, identify the governance prerequisites that must be in place before the recommended tools can be adopted (policy, training, IP audit, etc.) and note the priority order
- **Investor scrutiny:** The $10M Series B will include AI governance questions in due diligence. The studio needs a defensible, documented position on AI adoption
- **Community perception:** The MMO community is hypersensitive to AI-generated content, particularly in art and narrative. Community backlash is a material business risk; multiple studios have been review-bombed over detected AI marketing imagery in 2024-2026

### Change Management Realities

- No CTO to champion engineering AI adoption (Mustafa is Head of Tech, not a strategic technology leader)
- QA is one person (Hannah) — cannot absorb AI testing pilot overhead alongside existing workload
- Engineers are already overloaded with IT/infra work — adding new tools risks further context-switching
- 100% remote — all training and rollout must work asynchronously. No in-person workshops
- Animation team is unstable (lead on PIP, expected to exit; backfill being pipelined)
- Simon Woodruff (Head of Design) started 15 June 2026 — his views on AI in design are unknown; do not assume buy-in or resistance
- Executive Producer (Graham) is in early probationary period with behavioural concerns — may resist or over-adopt; not a reliable change champion
- Art Producer (Fred Dossola) started 5 June 2026 with Sony/CIG background; "orthodontist approach" to change (incremental, never nuclear) — potential ally for gradual rollout
- Aris (COO) is actively using AI automations and receptive — strongest executive champion alongside Glen

### What This Report Is NOT

- It is not an AI policy document (that is a separate workstream)
- It is not a general "AI in gaming" thought piece — it must be specific to CH's game, team, timeline, and constraints
- It is not a vendor sales pitch — every recommendation must survive the question "has this actually shipped in a game?"
- It is not future-proof forecasting — recommendations are based on current tool maturity, not vendor roadmaps or promises. (The report DOES provide a reusable evaluation methodology for periodic reassessment; that is a durable framework, not a forecast.)

### Verified Tool Seed List

The following 18 tools have been pre-researched with web-verified pricing and production citations. Use these as starting points for your evaluation, not as the only options. You MUST still search your knowledge for additional specialist tools per Instruction 2. Tools marked [VERIFY] need fact-checking on the flagged claim.

**Engineering:**
- **Aura** (TryAura.dev, by Ramen VR) — UE5-native AI agent: generates/edits Blueprints+C++, creates 3D assets/audio inside UE5 editor. Telos 2.0: 25x error rate reduction for Blueprint graphs. Indie: $29/month, Pro: $89.99/month. Production: Sinn Studio (halved production time) [VERIFY: thin — one small VR indie, tool <6 months old]. UE5 5.3-5.7, Windows only.
- **Ultimate Engine CoPilot** (BlueprintsLab) — 1,050+ UE5 tool actions: Blueprint/C++ generation, materials, VFX, PCG from natural language. LLM integration layer (uses Claude/Codex/GPT/Gemini). $220 one-time, lifetime updates. FAB Marketplace. No named studio confirmed [VERIFY]. Full C++ source included.

**Art:**
- **Adobe Substance 3D AI features** — Text to Texture, Text to Pattern, auto-tiling, Image to Material (Firefly-powered). Teams: $119.99/seat/month. Base product used by CDPR, Naughty Dog, Ubisoft — but AI features launched 2024-2025, no studio confirmed shipping with AI features specifically [VERIFY]. LOW adoption risk (augments existing workflow). Maya/Houdini/UE5 plugins.
- **Meshy** (Meshy.ai) — AI 3D model generation from text/image. Pro: $20/month. $15M ARR. No shipped AAA game [VERIFY]. Blender+Maya plugins, UE5 via FBX. HIGH adoption risk (art team resistance). Steam: Pre-Generated disclosure if assets ship.

**Animation:**
- **Cascadeur** (Nekki) — AI-assisted keyframe animation: auto-posing, AutoPhysics, AI Inbetweening. Indie: $8/user/month. Pro: $33/user/month. Perpetual licence after 12 months. Production: Shadow Fight 3 (vendor's own game). UE5 Live Link [VERIFY: released or still in dev?]. FBX round-trip works now.

**Audio (NO voice cloning — SAG-AFTRA):**
- **Wwise Similar Sound Search** (Audiokinetic + Sony AI) — AI audio search within Wwise. Included in Wwise 2025.1+. Wwise: Free <$250K budget, Pro from $8K, Premium from $25K. Industry standard. Conditional on CH choosing Wwise.
- **AIVA** — AI orchestral/cinematic music composition. Free (AIVA owns copyright) / Standard EUR 15/month / Pro EUR 49/month (full copyright). Production: Pixelfield 2017 (weak — 9-year-old obscure citation) [VERIFY recent usage]. MIDI/WAV export for Wwise/FMOD.
- **ElevenLabs Sound Effects** — Text-to-SFX, 48kHz, 38 categories. NOT voice cloning. Starter $5/month to Scale $330/month. No shipped game confirmed [VERIFY]. General-purpose SFX, not game-specialist. API + WAV export.

**Game Design:**
- **Machinations** (Machinations.io) — Visual game economy simulation: resource flows, sinks/faucets, progression. Free (1 seat) / paid tiers [VERIFY prices]. Production: Ubisoft, Gameloft, Wargaming, King (34% production time reduction). Borderline criterion 1 (simulation, not ML — included because it is the best tool for CH's economy design with no AI alternative).
- **Promethean AI** — AI environment layout/level dressing from natural language. Free (individual) / Indie $19.99/month / Pro $59.99/month. Production: "PlayStation Studios" [VERIFY: which studio? which game?]. Disney Accelerator backed. UE5/Maya/Blender plugins. MEDIUM adoption risk.
- **Ludo.ai** — AI game research, market analysis, trend tracking, GDD creation. Free / Indie ~$20/month / Studio $300/month. Production: Rovio, Ubisoft, Voodoo, SayGames, Homa, Garena. Passes all 7 criteria cleanly.
- **modl.ai** (balance testing aspect) — AI bot playtesting for balance/difficulty verification. See QA for full details.

**QA & Testing:**
- **modl.ai** — AI playtesting bots: regression, exploit detection, balance testing, crash detection. 10K+ simulated hours. Custom pricing [VERIFY Starter tier]. Production: Rare (Sea of Thieves), Die Gute Fabrik (Saltsea Chronicles / Take-Two). UE5 plugin. Best fit for CH's 1-QA constraint. Steam: No disclosure (dev-side).

**Narrative & Localisation:**
- **Inworld AI** — AI NPC dialogue engine: personality, memory, goals, voice. On-Demand $25-50/M characters. 50%+ price cuts June 2026. $500M valuation. Production: NetEase (Cygnus Enterprises), Niantic (Wol). UE5 plugin. SAG-AFTRA: TTS compliance [VERIFY]. Steam: YES — Live-Generated disclosure required.
- **Convai** — Conversational AI NPCs with lore/document upload. Free / Indie $29/month / Scale $499/month. No shipped game [VERIFY]. CAUTION: 8-10s latency, broken long-term memory (March 2026). UE5 plugin. Steam: Live-Generated.
- **memoQ Gaming Bundle** — AI-assisted translation with Gridly + Voiseed. Translator Pro $30-44/month. Production: Gameloft (30% productivity boost), Epic. Passes all 7. Year 2+ tool for CH.
- **Phrase TMS** — Localisation with AI translation, TM, QA. From ~$525/month. Production: Bohemia Interactive, GameHouse, Mixi. Passes all 7. Year 2+ tool.

**DevOps:**
- **TeamCity AI Build Analyzer** (JetBrains) — AI build failure analysis: root cause, fixes, build chain setup. Cloud: $45/committer/month. On-prem: $2,399/year. AI features [VERIFY: GA or still Early Access?]. Conditional on CH choosing TeamCity.

**Production:**
- **Atlassian Intelligence / Rovo** — AI across Jira: auto-triage, sprint planning, NL JQL, AI teammates. Included in Premium ($15.63/user/month = ~$13K/year for 70 seats). Rovo agent: $240/user/year. Already in CH's stack (Jira). Passes all 7.

**Gaps the executing LLM should fill** (legitimate specialist tools not verified in this round):
DeepMotion (video-to-3D mocap), Move.ai (markerless mocap), Rokoko (mocap suits + AI cleanup), RADiCAL (AI mocap), Houdini ML features (SideFX ML Deformer, terrain gen — CH uses Houdini), Wonder Studio/Autodesk (AI VFX/animation for cinematics), Charisma.ai (interactive storytelling for quests), Reactional Music (adaptive music AI — no confirmed UE5 support).

---

## E — Examples

Structure the discipline sections using this exemplar. This is the MINIMUM depth for every task — not the maximum.

```
## 3. Art Pipeline

### 3.1 Discipline Overview
[2-3 sentences on CH's art team (~15-18 people, David Luong as Director, Sasha Krieger leading concept/environment with personal opposition to AI art), key workflows in Maya/ZBrush/Substance/Houdini, and where AI could add value without replacing human artists. Address the team dynamics upfront.]

### 3.2 Task-Level Analysis

#### 3.2.1 Concept Art — Ideation & Moodboarding

| Tool | Type | Capability | Prod. Ready | IP/Legal | Adoption | Integration | Cost | Composite | Verdict |
|------|------|-----------|------------|----------|----------|-------------|------|-----------|---------|
| Adobe Firefly (Enterprise) | SaaS | 7 | 8 | 9 | 5 (est.) | 8 | 6 | 7.3 | PILOT |
| Midjourney (Pro) | SaaS | 9 | 7 | 3 | 4 (est.) | 5 | 7 | 6.1 | WATCH |
| Stable Diffusion XL (self-hosted) | OSS | 8 | 6 | 7 | 3 (est.) | 3 | 9 | 6.3 | WATCH |

*Composite calculation for Adobe Firefly: (7 × 0.25) + (8 × 0.20) + (9 × 0.20) + (5 × 0.15) + (8 × 0.10) + (6 × 0.10) = 1.75 + 1.60 + 1.80 + 0.75 + 0.80 + 0.60 = 7.3 ✓*
*Midjourney: (9 × 0.25) + (7 × 0.20) + (3 × 0.20) + (4 × 0.15) + (5 × 0.10) + (7 × 0.10) = 2.25 + 1.40 + 0.60 + 0.60 + 0.50 + 0.70 = 6.1 ✓*
*Stable Diffusion XL: (8 × 0.25) + (6 × 0.20) + (7 × 0.20) + (3 × 0.15) + (3 × 0.10) + (9 × 0.10) = 2.00 + 1.20 + 1.40 + 0.45 + 0.30 + 0.90 = 6.3 ✓*

**Recommendation: PILOT** Adobe Firefly Enterprise for internal ideation only.
- **Integration timeline:** 1 week (licence procurement + SSO setup)
- **Rollout owner:** David Luong (Director of Art), interim. Permanent owner: future Art Technology Lead
- **90-day success criteria:** 3+ artists voluntarily using for moodboarding; no AI-generated concept enters asset pipeline without human redraw; no team friction incidents reported to HR
- **Rollback trigger:** Team morale impact (anonymous survey score drops >15% from baseline), or any IP incident involving Firefly outputs

**Why Firefly:** Training data is licensed (Adobe Stock + public domain), providing the strongest IP defence of any image generation tool. Enterprise tier includes IP indemnification [VERIFY: confirm current Firefly Enterprise indemnification terms and whether they cover game assets].

**Why not Midjourney:** Scores highest on raw capability but training data provenance has unsettled litigation (Getty v Stability applies to the underlying model class). IP/Legal score of 3 blocks ADOPT/PILOT per the safety-critical floor rule. WATCH until litigation resolves. Revisit date: Q1 2027.

**Why not Stable Diffusion XL self-hosted:** Requires GPU infrastructure and DevOps capacity CH does not have. Team Adoption score of 3 reflects Sasha's active opposition plus the overhead of self-hosted model management. WATCH until DevOps hire is in place and team readiness improves.

**CH-Specific Risk:** Sasha Krieger's opposition means rollout must be voluntary, ideation-only, and positioned as a reference tool equivalent to Pinterest/ArtStation — not a replacement for concept work. Mandatory: no AI-generated concept enters the pipeline without a named human artist's redraw and sign-off. Fred Dossola's "orthodontist approach" to change makes him the best rollout ally in the art team — incremental adoption, never forced.

**Data Egress:** Adobe Firefly Enterprise processes inputs via Adobe cloud. Partner IP and unreleased character designs MUST NOT be used as inputs. Guardrail: restrict Firefly use to abstract moodboarding (colour palettes, composition references, texture exploration), never character or asset-specific generation.

**Cost Estimate:**
- Pre-launch (mid-2026 to late 2028): ~$8,400 (5 seats × $70/month × 24 months) [VERIFY: current Firefly Enterprise per-seat pricing]
- Post-launch annual: $4,200 (if retained for concept pipeline)
- Production-only: No — concept work continues post-launch for expansions

**Disclosure Impact:** Steam AI disclosure form: YES, if any Firefly-derived reference influences a shipped asset, even after human redraw. Conservative position: disclose all AI-assisted ideation.

**Governance Prerequisites:** Requires completion of: approved tool list (Tool Selection backlog), AI-assisted concept art guidelines (Production Integration backlog), asset attribution metadata standard (Production Integration backlog). Cannot roll out before the AI Acceptable Use Policy v1 is in place.
```

Use this exact table format (6 score columns + composite + verdict = 10 columns total including Tool and Type), scoring methodology, depth of analysis, and subsection structure for every task across every discipline. All tool comparison tables must use this tabular format throughout — do not switch to prose format, bullet lists, or abbreviated tables in later sections, even if the tables become repetitive.

---

## C — Constraints

1. **No fabricated tools or features.** Every tool named must exist and be commercially available or open-source. Do not invent capabilities. If you are uncertain whether a tool offers a specific feature, flag with `[VERIFY: reason]` rather than assuming.

2. **No generic recommendations.** Every recommendation must reference CH's specific constraints: UE5, MMO scale, ~70 people (with discipline-specific headcounts), remote, UK/Greece, late 2028 launch, union obligations, partner IP exposure, no CTO yet, sole QA resource, art team resistance, the specific game design (cosy byte-punk, pressure combat, corruption mechanic, 5 factions, player housing, 200-300 zone population).

3. **Every scored tool should cite at least one shipped game or major studio that uses it in production** (where "shipped" includes titles in live service or commercial Early Access with paying players; pre-alpha or closed-alpha titles do not count). "Used by indie devs" or "popular on Twitter" is not evidence. If you cannot identify a verifiable production use, flag with `[VERIFY: no production citation found — research needed]` and still provide your best assessment. Emerging tools without production citations are expected in fast-moving categories; the flag is the mechanism, not a blocker.

4. **Do not recommend AccelByte** for any backend/platform service — this is a hard exclusion.

5. **British English throughout.** No American spellings (colour not color, licence not license for the noun, organisation not organization, etc.).

6. **No em dashes.** Use commas, semicolons, colons, or full stops instead.

7. **Do not soft-pedal risk.** If a tool category is genuinely too risky for CH right now (e.g., voice cloning, AI-generated shipped narrative, AI art for final assets), say AVOID and explain why with full risk analysis. Do not find a way to recommend it anyway.

8. **Competitive intelligence: verifiable and analytical.** Include a brief (500-word max) standalone section identifying 3-5 verifiable examples of MMO/live-service studios' public AI adoption decisions, citing only public statements, GDC talks, or published case studies. For each example, extract the lesson for CH: what worked, what failed, what CH should learn from it. If a competitor's decision directly informs one of CH's tool recommendations, cross-reference it. Do not speculate about competitors' internal tooling. If no public information exists for a specific competitor, say so rather than fabricating.

9. **Address the governance interface.** For each discipline, identify the governance prerequisites from CH's 5 backlog areas (Usage Policy & Governance, Tool Selection & Licensing, Training & Education, Production Integration, IP Safeguards) that must be completed before the recommended tools can be adopted. Note the priority order.

10. **Sensitivity floor rule.** As stated in Instruction 5: if a tool scores below 4 on IP/Legal Safety (for art, audio, or narrative tools) or below 4 on Production Readiness (for anything touching shipped assets), the verdict CANNOT be ADOPT or PILOT regardless of composite score. The maximum verdict for a tool that trips the floor is WATCH.

---

## O — Output Format

Structure the full report as follows. Every section must contain substantive analysis. No section may be a placeholder or a promise to "detail later." The report must be self-contained and actionable on first read by a CEO who is not a technologist and a Head of Tech who is not a strategist.

**IMPORTANT — generation order vs document order:** The section numbers below are DOCUMENT ORDER (how the reader sees them). Your GENERATION ORDER is different — per Processing Instructions 4-6, generate sections 4-17 first, then 1-3 and 18-22, with the Executive Summary last of all. Output the final document in document order (1-22), not generation order.

```
COUCH HEROES — AI TOOL STRATEGY & RECOMMENDATION REPORT

Prepared for: CH Game Development UK Ltd — C-Suite & Technical Leadership
Prepared by: [Consulting entity]
Date: [Current]
Classification: Confidential — Internal + NBI Advisory
Version: 1.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTIVE SUMMARY (1 page max)

[IMPORTANT: Lead with CH's three most impactful ADOPT recommendations and their
expected ROI, followed by the two highest-risk AVOID decisions and why. No preamble
about AI transforming the industry. No "landscape" framing. Start with:
"Couch Heroes should immediately adopt [X], [Y], and [Z], which will [specific
benefit]. The studio should explicitly avoid [A] and [B] because [specific risk]."
The summary should read as a board memo, not a thought piece.]

- Total tools evaluated: [N]
- ADOPT recommendations: [N] tools across [N] disciplines
- PILOT recommendations: [N] tools
- WATCH: [N] tools
- AVOID: [N] tools/categories
- Estimated pre-launch AI tooling budget (mid-2026 to late 2028): $[X] / £[X]
- Estimated post-launch annual AI tooling budget: $[X] / £[X]
- Top 3 strategic recommendations (one sentence each)
- Top 3 risks (one sentence each)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DECISION DASHBOARD (2-3 pages — designed for CEO/board skim)

[One table per discipline. Each row = one task. Columns: Task, Recommended Tool,
Verdict, Pre-Launch Cost, Key Risk (one line). No scores, no technical detail.
Example row: "Concept Ideation | Adobe Firefly Enterprise | PILOT | $8,400 | Art
team resistance; voluntary rollout only"]

This dashboard is the "skim layer" between the Executive Summary and the full
analysis. Vardis reads pages 1-5 and gets everything he needs to make decisions.
Mustafa reads the full discipline sections for technical depth.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TABLE OF CONTENTS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. METHODOLOGY & SCORING FRAMEWORK
   1.1 Scoring Dimensions (6 dimensions, definitions, calibration anchors, weights)
   1.2 Verdict Definitions (ADOPT/PILOT/WATCH/AVOID criteria and structural requirements)
   1.3 Sensitivity Floor Rule
   1.4 Data Sources & Limitations (what this report can and cannot verify)

2. COMPETITIVE LANDSCAPE — AI IN MMO/LIVE-SERVICE DEVELOPMENT
   [500 words max. Verifiable public statements only. GDC talks, published case
   studies, official studio announcements. No speculation about internal tooling.]

3. CROSS-CUTTING INFRASTRUCTURE
   [NOTE: Per Processing Instruction 4, generate this section AFTER completing
   all discipline sections (4-17), since infrastructure recommendations should
   be informed by the discipline analysis. It appears here as section 3 for
   reader flow in the final document.]
   3.1 Self-Hosted vs Cloud Decision Framework
   3.2 API Gateway & Cost Controls
   3.3 Prompt Library & Evaluation Framework
   3.4 Data Classification for AI Workflows (partner IP, unreleased assets,
       employee PII, commercial data, player data)
   3.5 Infrastructure Budget & Phasing

4. ENGINEERING
   4.1 Discipline Overview
   4.2 Task-Level Analysis (per the exemplar format)
   4.3 Discipline Risk Summary
   4.4 Governance Prerequisites
   4.5 Discipline Budget Summary

5. DEVOPS & INFRASTRUCTURE
   [Same subsection structure as section 4]

6. ART PIPELINE
   [Same subsection structure]

7. ANIMATION
   [Same subsection structure]

8. AUDIO
   [Same subsection structure — with explicit SAG-AFTRA/Equity analysis per task]

9. GAME DESIGN
   [Same subsection structure]

10. QA & TESTING
    [Same subsection structure — including accessibility compliance testing]

11. NARRATIVE & LOCALISATION
    [Same subsection structure]

12. PRODUCTION & PROJECT MANAGEMENT
    [Same subsection structure]

13. MARKETING & COMMUNITY
    [Same subsection structure]

14. DATA & ANALYTICS
    [Same subsection structure]

15. PLATFORM & BACKEND
    [Same subsection structure]

16. HR & PEOPLE
    [Same subsection structure]

17. FINANCE & LEGAL
    [Same subsection structure]
```

**[CHECKPOINT INSTRUCTION — do not output this text. You have now completed all 14 discipline sections. Before generating sections 1-3 and 18-22 (per Processing Instruction 4), re-read the full Context section. Every synthesis section must reference CH's specific constraints: named individuals, team sizes, no CTO, sole QA, partner IP, union obligations, governance backlog priorities, late 2028 timeline, and Agilefall production cadence. The Decision Dashboard, Executive Summary, Cross-cutting Infrastructure, Budget Summary, and Risk Register must all be derived from the discipline analysis you just completed, not generated speculatively.]**

```
18. PHASED ADOPTION ROADMAP
    18.1 Phase 1: Foundation (0-3 months) — governance prerequisites + low-risk ADOPT
    18.2 Phase 2: Expansion (3-9 months) — PILOT promotions + medium-risk ADOPT
    18.3 Phase 3: Scale (9-18 months) — advanced tooling as policy and team mature
    18.4 Dependency Map (governance items, hires, and infrastructure that must be
         in place before each phase)

19. ORGANISATIONAL CHANGE MANAGEMENT
    19.1 Stakeholder Analysis
         [Must name: Aris (champion), Glen (champion), Sasha (opposition),
         Simon (unknown — just started), Mustafa (passive), Graham (unreliable),
         Fred (ally — incremental approach), Hannah (overloaded)]
    19.2 Communication Plan (remote-first, asynchronous)
    19.3 Training Requirements (by discipline, accounting for remote delivery)
    19.4 Policy Dependencies (what governance items must complete first)

20. BUDGET SUMMARY
    20.1 Pre-Launch Total: ADOPT + PILOT + Infrastructure (mid-2026 to late 2028)
    20.2 Post-Launch Annual Projected (assuming PILOT promotions)
    20.3 Cost Avoidance / Efficiency Gains Estimate
    20.4 Comparison: AI Spend vs Equivalent Headcount
    20.5 Totals in USD and GBP (at approximate rate of 1 USD = 0.79 GBP;
         note that all GBP figures are indicative and subject to FX movement
         over the 2+ year pre-launch window; use USD as the primary reference)

21. RISK REGISTER
    Top 10 risks, each with:
    - Description
    - Likelihood (1-5)
    - Impact (1-5)
    - Risk Score (L × I)
    - Owner (named CH role)
    - Mitigation
    - Residual Risk

22. APPENDICES
    A. Full Tool Inventory (all tools evaluated, including those not recommended)
    B. Vendor Comparison Matrix
    C. Governance Backlog Priority Map (which backlog items to complete first,
       mapped against the phased adoption roadmap)
    D. Glossary of Terms
```

---

## Processing Instructions

**This report is large. Follow these processing rules to maintain quality throughout.**

1. **Work through disciplines sequentially, not all at once.** Complete each discipline section fully (overview, all task tables, risk summary, governance prerequisites, budget) before starting the next. Do not outline all 14 and fill in later.

2. **Target 1,500-2,500 words per discipline.** This is a quality guardrail, not a hard limit. If a discipline genuinely needs more depth (Art, Engineering), go to 3,000. If a discipline has fewer applicable tasks (HR, Finance), 1,000 is fine. Do not pad.

3. **Mid-point checkpoint (after discipline 7 — QA & Testing):** Before starting discipline 8 (Narrative), re-read the Sensitivities section and the scoring rubric calibration anchors. Verify you are still using the full 1-10 range and not clustering at 6-8. Check that you have cited at least one production use per tool or flagged `[VERIFY]`. The second half must be the same quality as the first.

4. **Generate synthesis sections LAST.** The output format shows Cross-cutting Infrastructure as section 3 and the Decision Dashboard near the top. Despite their position in the final document, generate them AFTER completing all 14 discipline sections (4-17). You need the discipline analysis to inform infrastructure recommendations, budget totals, the risk register, and the decision dashboard. Write disciplines 4-17 first, then loop back to generate sections 1-3 and 18-22 informed by the actual analysis.

5. **The Decision Dashboard is a roll-up, not a preview.** After generating all discipline sections, produce the Decision Dashboard by extracting one row per task from the completed analysis. Do not generate the dashboard speculatively before the analysis exists.

6. **The Executive Summary is written last of all.** It summarises what the report found, not what you expect to find. Generate it after every other section is complete.

---

## Execution Notes (for the consulting team, not for the LLM)

**Token budget estimate:** 14 disciplines × ~2,000 words each = ~28,000 words of discipline output. Synthesis sections add ~8,000 words. Total expected output: ~36,000-40,000 words (~50,000 tokens).

**Model selection guidance:**
- **Claude (extended output / 1M context):** Single-pass. This prompt was designed for this model class.
- **GPT-4o or similar (16K output token limit):** Split into 3 runs. Run 1: disciplines 1-5. Run 2: disciplines 6-10. Run 3: disciplines 11-14 + all synthesis sections (carry forward runs 1-2 as context). Each run stays within ~16K output tokens.
- **Gemini 2.5 Pro (65K output token limit):** Split into 2 runs. Run 1: disciplines 1-7. Run 2: disciplines 8-14 + synthesis sections.
- **Any model:** If the output truncates mid-discipline, resume from the last completed discipline in a follow-up prompt carrying forward all prior output.

### Pre-flight (recommended, 2-4 hours)

The verified tool seed list (18 Tier 1 tools) is embedded directly in the prompt's Context section. No manual assembly required. The full research file with exclusion rationales, Tier 2 business tools, and dead company flags is at `TOOL_SEED_LIST_v3_FINAL.md` for reference.

### Post-generation Review

1. **Fact-check** all remaining `[VERIFY]` flags. Confirm pricing is current. Validate shipped-game citations.
2. **Arithmetic check:** Verify composite scores against the formula for a random sample of 10 tools.
3. **Constraint threading:** Spot-check that CH-specific constraints (Sasha, SAG-AFTRA, partner IP, no CTO, sole QA) are addressed in the relevant discipline sections, not just mentioned once.
4. **Editorial polish:** British English consistency, no em dashes, consistent table formatting, tone (McKinsey partner, not AI enthusiast).

### Quality Checklist for Post-Generation Review

- [ ] Every composite score arithmetic checks out against the formula (Cap×0.25 + Prod×0.20 + IP×0.20 + Adopt×0.15 + Integ×0.10 + Cost×0.10)
- [ ] Each discipline section has at least one score ≤3 and at least one ≥9
- [ ] No tool with IP/Legal < 4 has ADOPT or PILOT verdict (art, audio, narrative)
- [ ] No tool with Production Readiness < 4 has ADOPT or PILOT verdict (shipped assets)
- [ ] Every ADOPT/PILOT has: integration timeline, named owner, 90-day criteria, rollback trigger
- [ ] Every ADOPT with an overloaded/absent owner is capped at PILOT-contingent-on-hire
- [ ] Every AVOID has: specific risk, probability × impact, counterfactual cost, alternative workflow
- [ ] Every WATCH has: reconsideration criteria, revisit date
- [ ] All Team Adoption Risk scores are marked "(est.)"
- [ ] Partner IP guardrails are stated for every cloud-inference tool
- [ ] HR tools address employee PII / GDPR cross-border transfer
- [ ] Finance tools address commercial data sensitivity
- [ ] Steam disclosure impact is flagged for every art/audio/narrative tool
- [ ] Sasha's opposition is addressed in every art section (not just once)
- [ ] SAG-AFTRA/Equity compliance is addressed in every audio section
- [ ] No AccelByte recommendations anywhere
- [ ] British English throughout (spot-check: colour, licence, organisation, programme)
- [ ] No em dashes anywhere
- [ ] All costs in USD with GBP conversion in budget summary
- [ ] All `[VERIFY]` flags have been resolved or annotated
- [ ] Governance prerequisites are mapped per discipline
- [ ] Named rollout owners exist for every ADOPT/PILOT (with interim assignments where role is vacant)
- [ ] Decision Dashboard table matches the discipline verdicts (no contradictions)
- [ ] Cross-discipline tools evaluated once fully, cross-referenced elsewhere (not duplicated)
- [ ] 3-6 tasks per discipline (not 1-2, not 8+)
- [ ] Phased roadmap references Agilefall sprint/milestone boundaries, not just calendar months
