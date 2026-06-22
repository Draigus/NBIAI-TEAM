# Verified Tool Seed List v2 — Couch Heroes AI Strategy

**Replaces:** VERIFIED_TOOL_SEED_LIST.md (v1 was poorly researched)

## Acceptance Criteria (every tool must pass ALL seven)

1. **Genuinely AI/ML** — not standard automation, rule-based workflows, or infrastructure
2. **Specialist to the discipline** — not a generic LLM wrapper ("use ChatGPT for X")
3. **Relevant to game dev or adjacent industry** (film VFX, broadcast, interactive media)
4. **Works with CH's stack** (UE5, Perforce, Maya/ZBrush/Substance/Houdini) or clear integration path
5. **Company alive, product available** as of June 2026
6. **Evidence of professional/studio adoption** — not just hobbyists or Twitter hype
7. **Pricing appropriate for ~70-person studio** — not enterprise-only for a 1-person team

## Research Methodology

- Every tool individually web-searched for current availability, pricing, production citations
- Sources cited per tool
- [VERIFY] flags for unconfirmed claims
- Tools failing any criterion are excluded with rationale
- Adversarial review by independent agent against the same 7 criteria

---

## 1. Engineering (UE5-Specific AI Coding)

### 1a. Aura — TryAura.dev (by Ramen VR)
- **What:** UE5-native AI agent — generates/edits Blueprints and C++, creates 3D assets and audio, all inside the UE5 editor. Telos 2.0 has 25x error rate reduction for Blueprint graphs. Editor-Use and Coding Agents for scene lighting, post-processing, code generation. Agentic loops for autonomous task completion.
- **Pricing:** Indie: $29/month. Professional: $89.99/month. Enterprise: custom. Two-week free trial for all new users.
- **Production citation:** Sinn Studio (VR studio) reported halving production time and 5x faster asset sourcing.
- **Integration:** UE5 plugin (5.3-5.7). Windows only. Operates inside the editor.
- **Criteria:** ✓ All 7. Purpose-built for UE5, genuine AI, studio case study, affordable.
- **Adoption risk:** MEDIUM — new tool (Jan 2026), team needs to evaluate.
- **Sources:** [Unreal University](https://www.unreal-university.blog/aura-the-ai-assistant-for-unreal-engine/), [TechIntelPro](https://techintelpro.com/news/ai/ai-assistants/aura-ai-assistant-for-unreal-engine-launches-january-2026/), [tryaura.dev](https://www.tryaura.dev/about/)

### 1b. Ultimate Engine CoPilot — BlueprintsLab
- **What:** 1,050+ tool actions across 56 UE5 engine categories. Blueprint generation, C++ code generation, materials, Niagara VFX, sequencer cinematics, UMG widgets, PCG worlds, behaviour trees — all from natural language. Built-in voice control. Can run Claude, Codex, Copilot, Gemini concurrently within the editor. Full C++ source code included. V1.0 released April 2026 (graduated from beta).
- **Pricing:** $220 one-time purchase, lifetime updates. Two free-tier AI slots with no API key required.
- **Production citation:** Featured twice on Epic's FAB Marketplace (April 2026). "Thousands of Unreal developers." [VERIFY: no specific shipped game title confirmed]
- **Integration:** Native UE5 plugin. FAB Marketplace distribution.
- **Criteria:** ✓ 6/7. Criterion 6 (studio adoption) is soft — broad user base but no named studio.
- **Adoption risk:** LOW — one-time cost, no subscription, source code included.
- **Sources:** [BlueprintsLab V1.0 launch](https://www.financialcontent.com/article/abnewswire-2026-4-16-blueprintslab-launches-ultimate-engine-copilot-v10-the-worlds-most-comprehensive-ai-development-tool-for-unreal-engine), [FAB Marketplace](https://www.fab.com/listings/8d776721-5da3-44ce-b7ef-be17a023be59), [OpenPR](https://www.openpr.com/news/4413014/thousands-of-unreal-developers-rely-on-ultimate-engine-copilot)

### 1c. Ludus AI — Ludus Engine
- **What:** Professional AI toolkit for UE5: C++ assistance (LudusCode), Blueprints copilot (LudusBlueprint), scene generation, AI Unreal expert (LudusDocs), performance tuning, debugging. Agent mode generates blueprints, 3D models, and project reports.
- **Pricing:** 14-day free Pro trial with credits. Paid tiers [VERIFY: exact pricing not publicly available].
- **Production citation:** [VERIFY: no named studio found in search results]
- **Integration:** UE5 plugin (5.1-5.6). Web app and IDE options also available.
- **Criteria:** ✓ 5/7. Criterion 6 (no studio citation) and 7 (pricing unclear) need verification.
- **Adoption risk:** MEDIUM — requires evaluation during trial.
- **Sources:** [GoodFirms](https://www.goodfirms.co/software/ludus-ai), [GameEngineHub](https://gameenginehub.com/comparisons/ai-tools-unreal-engine-5-game-development-2026-guide), [PhilipConrod review](https://www.philipconrod.com/ludus-ai-agent-assisted-game-development-tools-for-unreal-game-engine/)

### 1d. Node to Code — Protospatial (open-source)
- **What:** Converts UE5 Blueprint graphs to C++ code using AI. Integrates into Blueprint Editor toolbar. Recommends Claude 3.5 Sonnet for best Unreal C++ output.
- **Pricing:** Free (open-source, Apache 2.0). Requires own LLM API key.
- **Production citation:** Open-source community tool. [VERIFY: studio adoption]
- **Integration:** Native UE5 Blueprint Editor toolbar integration.
- **Criteria:** ✓ 6/7. Criterion 6 is soft (community tool, not studio-validated).
- **Adoption risk:** LOW — free, non-disruptive, utility tool.
- **Sources:** [GitHub wiki](https://github.com/protospatial/NodeToCode/wiki/Key-Features)

**Excluded from Engineering:**
- GitHub Copilot — generic code completion, not UE5-specialist. Poor UE5 macro support (UCLASS, UPROPERTY). Fails criterion 2.
- Sourcery — generic code review. Fails criterion 2 and 3.
- FlightDeck — more suited to virtual production than game development. UE5 5.3 only. UI still being optimised. Early beta.

---

## 2. DevOps & Infrastructure

### 2a. TeamCity AI (Build Analyzer) — JetBrains
- **What:** AI-powered build failure analysis: reads logs, identifies root cause, suggests fixes. AI agents can set up build configurations and full build chains. Part of JetBrains AI platform.
- **Pricing:** Cloud: $45/committer/month. On-prem: $2,399/year + $359/agent/year. Free tier: 100 configs, 3 agents. AI features in Early Access (TeamCity 2025.11+), GA targeting early 2026.
- **Production citation:** JetBrains/TeamCity widely used in game studios. AI Build Analyzer is new (2025-2026).
- **Integration:** Perforce + Git support. UE5 build pipeline compatible. JetBrains AI platform.
- **Criteria:** ✓ 6/7. Criterion 6 is soft — AI features are new, adoption is early.
- **Adoption risk:** LOW if CH chooses TeamCity (currently under evaluation). Zero risk if they don't.
- **Sources:** [JetBrains blog](https://blog.jetbrains.com/teamcity/2026/04/ai-in-devops/), [TeamCity pricing](https://www.capterra.com/p/136011/Teamcity/)

**Excluded from DevOps:**
- Incredibuild — distributed build acceleration, not AI/ML. Fails criterion 1.
- Hathora — DEFUNCT (May 2026). Fails criterion 5.
- Pulumi AI — IaC generation, not game-relevant; wrong fit for a studio with no CTO/DevOps. Fails criteria 3, 4.
- GitHub Copilot for CI/CD — generic. Fails criterion 2.

---

## 3. Art Pipeline

### 3a. Adobe Substance 3D (AI features) — Adobe
- **What:** AI-powered PBR texture/material creation: Text to Texture, Text to Pattern, auto-tiling, Image to Material. Firefly-powered generative features built into the existing Substance workflow artists already use.
- **Pricing:** Teams: $119.99/seat/month ($1,439.88/seat/year). Indie (Texturing only): $24.99/month. 20% price increase effective March 2025. AI features included in subscription.
- **Production citation:** CD Projekt Red (Cyberpunk 2077), Naughty Dog (Uncharted 4), Ubisoft Massive (The Division 2).
- **Integration:** Maya plugin (ships with Maya 2020+), Blender via Connector, Houdini .sbsar native, UE5 official plugin. ZBrush: export-based (no direct plugin).
- **Criteria:** ✓ All 7. The strongest art tool — augments existing workflow, not replacement.
- **Adoption risk:** LOW — artists already use Substance. AI features are opt-in within a familiar tool. Sasha may accept this where she'd reject standalone AI art generators.
- **Sources:** [Adobe blog Feb 2025](https://blog.adobe.com/en/publish/2025/02/20/substance-3d-innovations-pricing-updates), [Adobe pricing](https://www.adobe.com/products/substance3d/plans.html), [CDPR case study](https://www.adobe.com/products/substance3d/magazine/cyberpunk-2077-a-world-full-of-substance)

### 3b. Meshy — Meshy.ai
- **What:** AI 3D model generation from text/image prompts. Outputs textured, rigged models with PBR maps in under a minute. Meshy 6 meshes up to 600K faces. Auto-animation support.
- **Pricing:** Pro: $20/month (1,000 credits, ~50 models). Studio: $60/month. Enterprise: custom. $15M ARR as of Nov 2025.
- **Production citation:** No verified shipped AAA game. Indie/jam-tier adoption confirmed. GDC 2025 exhibitor. [VERIFY: professional studio usage]
- **Integration:** Blender plugin (official), Maya plugin (official). UE5 via FBX/GLB export. No Substance/ZBrush/Houdini native plugins.
- **Criteria:** ✓ 6/7. Criterion 6 — no confirmed professional studio shipping with Meshy assets.
- **Adoption risk:** HIGH — "AI generates 3D models" is exactly what art teams resist. Position as rapid prototyping/blockout only, never final assets. Sasha will likely oppose.
- **Steam disclosure:** YES — if any Meshy-derived asset enters a shipped build, even after modification.
- **Sources:** [Meshy pricing](https://www.meshy.ai/pricing), [Meshy $15M ARR](https://tools.prnewswire.com/en-us/live/20823/release/20251112EN22522), [Meshy GDC 2025](https://www.meshy.ai/gdc-2025)

### 3c. NVIDIA DLSS — NVIDIA (UE5 native)
- **What:** Runtime AI upscaling and frame generation using trained neural networks. Critical for MMO targeting broad hardware compatibility — allows high visual quality at lower GPU cost per player.
- **Pricing:** Free (included with UE5 + NVIDIA GPUs). AMD FSR is the non-AI alternative for AMD users.
- **Production citation:** Every major UE5 title ships with DLSS support. Industry standard.
- **Integration:** Native UE5 plugin. Zero additional work.
- **Criteria:** ✓ All 7.
- **Adoption risk:** NONE — transparent to artists. Engineering enables it; players benefit.
- **Sources:** Built into UE5 documentation.

### 3d. Topaz Photo AI — Topaz Labs
- **What:** AI upscaling (up to 6x), denoising, sharpening for textures and reference images. 9 AI models including High Fidelity and Recover. Adds genuine detail via deep CNNs.
- **Pricing:** Personal: $149/year ($12/month). Pro: $499/year. Photo AI bundle (Gigapixel + DeNoise + Sharpen): $199/year. Requires 8GB+ VRAM.
- **Production citation:** Widely used in film/game art pipelines for texture upscaling. [VERIFY: specific game studio public citation]
- **Integration:** Standalone desktop app. Batch processing. Export for Substance/Maya pipeline.
- **Criteria:** ✓ 6/7. Criterion 6 — universally used but no specific game studio public citation found.
- **Adoption risk:** LOW — utility tool, doesn't feel like "AI replacing artists." Same category as Photoshop filters.
- **Sources:** [Topaz pricing](https://www.myarchitectai.com/blog/topaz-ai-pricing), [Topaz review](https://imagera.ai/blog/topaz-gigapixel-alternative-ai-image-upscaler-2026)

**Excluded from Art:**
- Adobe Firefly Enterprise (standalone) — concept ideation is covered by Substance 3D's built-in Firefly features. Standalone Firefly is browser-based with no DCC integration.
- Stable Diffusion (self-hosted) — requires GPU infrastructure and DevOps capacity CH doesn't have. Art team adoption risk is extreme.
- Midjourney — active IP litigation. Fails criterion on IP/Legal Safety (not a seed list criterion but a prompt-level floor rule).

---

## 4. Animation

### 4a. Cascadeur — Nekki
- **What:** AI-assisted keyframe animation: auto-posing (neural network suggests natural poses), AutoPhysics (makes motion physically plausible), AI Inbetweening (generates motion between keyframes with style presets: walk, run, crawl, jump, combat, acrobatic). Full manual animator control retained.
- **Pricing:** Indie: $8/user/month annual (<$100K revenue). Pro/Teams: $33/user/month annual. Free tier (no FBX export). Perpetual licence after 12 months of annual subscription.
- **Production citation:** Shadow Fight 3 (Nekki, in-house). Epic MegaGrant recipient for UE5 Live Link development.
- **Integration:** FBX/DAE/USD export. UE5 Live Link plugin in development (2026.1). Maya/Blender FBX round-trip. MetaHuman support documented.
- **Criteria:** ✓ All 7.
- **Adoption risk:** LOW — augments animators, doesn't replace them. Perpetual licence is budget-friendly.
- **Sources:** [Cascadeur pricing](https://cascadeur.com/plans), [CG Channel 2025.1 review](https://www.cgchannel.com/2025/04/nekki-releases-cascadeur-2025-1-with-ai-based-inbetweening/), [UE5 Live Link](https://www.cgchannel.com/2025/09/cascadeur-to-get-dedicated-unreal-engine-live-link-plugin/)

### 4b. Mixamo — Adobe (free)
- **What:** AI auto-rigging and animation library. ML-powered auto-rigger for humanoid characters. Vast library of pre-made animations.
- **Pricing:** Free (Adobe account required).
- **Production citation:** Widely used across indie and AA studios for rapid rigging and prototyping.
- **Integration:** FBX export. UE5 retargeting compatible. Blender/Maya import.
- **Criteria:** ✓ All 7.
- **Adoption risk:** LOW — free utility tool. Feels like a pipeline accelerator, not a replacement.
- **Sources:** [Adobe Mixamo](https://www.mixamo.com/)

### 4c. UE5 MetaHuman Animator — Epic Games
- **What:** iPhone-based facial animation capture mapped to MetaHuman rigs. The AI is Apple's face-tracking ML model on the iPhone; MetaHuman Animator is the retargeting pipeline.
- **Pricing:** Free (included with UE5). Requires iPhone with TrueDepth camera.
- **Production citation:** Ninja Theory (Hellblade II) [VERIFY specific usage of MetaHuman Animator vs custom pipeline].
- **Integration:** Native UE5.
- **Criteria:** ✓ All 7.
- **Adoption risk:** NONE — free, native, non-disruptive.
- **Sources:** [UE5 MetaHuman documentation](https://dev.epicgames.com/documentation/en-us/metahuman/metahuman-animator-in-unreal-engine)

**Excluded from Animation:**
- DeepMotion, Move.ai, Rokoko — training data only, not web-verified in this round. The executing LLM should evaluate these; they are legitimate tools but I cannot confirm current pricing/status from this research.

---

## 5. Audio (NO voice cloning — SAG-AFTRA/Equity prohibition)

### 5a. Wwise Similar Sound Search — Audiokinetic + Sony AI
- **What:** AI audio-to-audio and text-to-audio search within Wwise. Trained on BOOM Library and Pro Sound Effects catalogues. Finds sounds by similarity or text description.
- **Pricing:** Included in Wwise 2025.1+. Wwise itself: Free (<$250K budget project). Pro from $8K. Premium from $25K. Platinum from $50K. (Or 1% royalty option.)
- **Production citation:** Wwise is industry standard — hundreds of shipped AAA and indie titles. Similar Sound Search is new (2025.1).
- **Integration:** Native Wwise integration. If CH chooses Wwise, this is free and built-in.
- **Criteria:** ✓ All 7. Strongest specialist audio AI tool if CH goes Wwise.
- **Adoption risk:** NONE if Wwise is chosen (audio middleware decision is pending).
- **Sources:** [Audiokinetic Wwise](https://www.audiokinetic.com/), research via agent web search confirmed Sony AI partnership

### 5b. AIVA — AIVA Technologies
- **What:** AI orchestral/cinematic music composition. MIDI + WAV export. Style training on Pro tier. Can compose adaptive soundtrack elements.
- **Pricing:** Free (non-commercial, AIVA owns copyright). Standard: EUR 15/month. Pro: EUR 49/month (5 team seats, full copyright ownership to user).
- **Production citation:** Composed main theme for Pixelfield (2017, Epic Stars) — marketed as first AI game soundtrack.
- **Integration:** MIDI/WAV export. Wwise/FMOD import compatible.
- **Criteria:** ✓ All 7.
- **Adoption risk:** LOW — tool for composers, not a replacement. Pro tier gives full copyright.
- **SAG-AFTRA:** N/A — music composition, not voice.
- **Steam disclosure:** WATCH — if AI-composed music ships in the game, conservative position is to disclose as Pre-Generated.
- **Sources:** Agent web research confirmed Pixelfield citation and pricing.

### 5c. ElevenLabs Sound Effects — ElevenLabs
- **What:** Text-to-SFX generation. Up to 30s, 48kHz, seamless looping. 38 SFX categories. API available. NOT the voice cloning product.
- **Pricing:** Free tier included. Starter: $5/month. Creator: $22/month. Pro: $99/month. Scale: $330/month. SFX costs 200 credits/gen or 40 credits/sec.
- **Production citation:** Integrated into Scenario.gg and Layer.ai for game-ready audio pipelines. No specific shipped game confirmed [VERIFY].
- **Integration:** API + web interface. WAV export for Wwise/FMOD import.
- **Criteria:** ✓ 6/7. Criterion 6 — no shipped game citation for SFX product specifically.
- **Adoption risk:** LOW — SFX prototyping tool, not replacing sound designers.
- **SAG-AFTRA:** N/A — SFX only, not voice.
- **Steam disclosure:** WATCH — if AI-generated SFX ship in game, disclose as Pre-Generated.
- **Sources:** Agent web research confirmed pricing and SFX categories.

### 5d. Reactional Music — Reactional Music
- **What:** AI-driven adaptive music engine. Real-time soundtrack responds to gameplay inputs (location, health, combat intensity). Music reacts to player actions dynamically.
- **Pricing:** Custom pricing [VERIFY — not publicly available].
- **Production citation:** Partnership with Dovetail Games (Oct 2025). Nominated by Unity for Best Artistic Tool. Partnership with Ninja Tune.
- **Integration:** Unity plugin confirmed. UE5 integration [VERIFY — Unity is primary platform].
- **Criteria:** ✓ 5/7. Criterion 4 (UE5 support unclear) and criterion 7 (pricing unknown) need verification.
- **Adoption risk:** MEDIUM — depends on UE5 integration availability and pricing.
- **Sources:** [Reactional Music](https://reactionalmusic.com/game-developer/), web search confirmed Dovetail and Ninja Tune partnerships.

**Excluded from Audio:**
- Replica Studios — DEFUNCT (shut down 30 June 2025). Fails criterion 5.
- Stable Audio 3.0 — Stability AI vendor risk (severe financial distress since 2024). SaaS may not exist by CH's 2028 launch. Open-weight model viable but requires self-hosting infrastructure CH doesn't have. Fails criteria 4 and 5 (vendor risk).
- Soundful — no confirmed game studio adoption. Fails criterion 6.
- ALL voice cloning/synthesis tools — excluded per SAG-AFTRA/Equity prohibition.

---

## 6. Game Design

### 6a. Machinations — Machinations.io
- **What:** Visual game economy simulation. Model resource flows, currency sinks/faucets, progression systems. Browser-based, collaborative. Ideal for CH's crafting professions, 5 factions, subscription+cosmetics economy.
- **Pricing:** Community: Free (1 seat, 1K sim runs/month). Starter and Pro paid tiers with 10K+ sim runs/month [VERIFY exact paid prices]. Enterprise: custom.
- **Production citation:** Ubisoft, Gameloft, Wargaming, King confirmed as clients. Joygame case study (34% production time reduction). Nominated Best Tech Provider at Develop:Star Awards.
- **Integration:** Browser-based. API available.
- **Criteria:** ✓ All 7. Best tool for CH's economy/crafting/currency design.
- **Adoption risk:** LOW — designers use it as a design tool, not "AI replacing designers."
- **Sources:** Agent web research with confirmed citations.

### 6b. Promethean AI — Promethean AI
- **What:** AI-assisted 3D environment layout and level dressing from natural language. Contextual prop placement. Founded by ex-Naughty Dog art director.
- **Pricing:** Free (individuals). Indie: $19.99/month (annual) or $29.99/month. Professional: $59.99/month (annual) or $89.99/month. Enterprise: custom.
- **Production citation:** PlayStation Studios confirmed user. Disney Accelerator backed. 10,000+ users.
- **Integration:** UE5 plugin, Unity, Blender, Maya, 3ds Max.
- **Criteria:** ✓ All 7.
- **Adoption risk:** MEDIUM — "AI places props in levels" may trigger art team resistance, though it's a level design tool not a concept art tool. Position as accelerating blockout, not replacing level artists.
- **Sources:** Agent web research. PlayStation Studios and Disney Accelerator confirmed.

### 6c. Ludo.ai — Ludo
- **What:** AI game research, market analysis (Ludo Score), trend tracking, concept generation, GDD creation. Competitive analysis and ideation.
- **Pricing:** Free (Starter). Indie: ~$20/month. Studio: $300/month.
- **Production citation:** Rovio, Ubisoft, Voodoo, SayGames, Homa, Garena listed as clients. SIFOR case study (50+ games/year). IzyPlay (12M+ downloads).
- **Integration:** Browser-based.
- **Criteria:** ✓ All 7.
- **Adoption risk:** LOW — research/ideation tool, not replacing designers.
- **Sources:** Agent web research. Multiple studio citations confirmed.

### 6d. modl.ai (for balance testing) — modl.ai
- **What:** AI bot playtesting and player simulation. Automated QA, balance testing, difficulty verification. Bots simulate 10K+ hours across skill levels. Also listed under QA.
- **Pricing:** Custom pricing (Starter/Pro/Enterprise, contact for quotes). Raised $8.4M Series A (backed by Microsoft M12).
- **Production citation:** Rare (Sea of Thieves — automated testing). Die Gute Fabrik (Saltsea Chronicles, published by Take-Two/Private Division).
- **Integration:** Unity and UE5 plugins.
- **Criteria:** ✓ All 7. Cross-listed with QA — the balance testing aspect is game design, the regression testing aspect is QA.
- **Sources:** [modl.ai](https://modl.ai/), [Sea of Thieves case study](https://modl.ai/automated-game-testing-lessons/)

**Excluded from Game Design:**
- UE5 PCG Framework — procedural content generation but NOT AI/ML. Rule-based node system. Fails criterion 1.
- Generic "use ChatGPT for brainstorming" — fails criterion 2.

**Note on AI game balancing:** No standalone commercial AI game balancing tool exists. The realistic pipeline for CH: Machinations for economy design (pre-production), modl.ai for automated playtesting that surfaces balance issues (production), and custom simulation agents for encounter/combat balancing (internal, bespoke).

---

## 7. QA & Testing

### 7a. modl.ai — modl.ai
- **What:** AI playtesting bots for automated regression, exploit detection, balance testing, crash detection. Simulates 10K+ hours across skill levels. Can find cheese strategies and faction balance issues.
- **Pricing:** Custom pricing (Starter/Pro/Enterprise). $8.4M Series A (Microsoft M12).
- **Production citation:** Rare (Sea of Thieves). Die Gute Fabrik (Saltsea Chronicles, Take-Two/Private Division).
- **Integration:** Unity + UE5 plugins.
- **Criteria:** ✓ All 7. Best fit for CH's 1-QA-person constraint.
- **Adoption risk:** LOW — augments Hannah, doesn't replace her. Simulates what she can't cover alone.
- **Steam disclosure:** No — dev-side testing tool, not player-facing.
- **Sources:** [modl.ai](https://modl.ai/), [Sea of Thieves case study](https://modl.ai/automated-game-testing-lessons/)

### 7b. GameDriver — GameDriver Inc.
- **What:** Automated gameplay testing framework. Tests authored in C# via NUnit. UE5 plugin for in-engine test execution. Test Assistant standalone app (no editor dependency). Record-and-replay plus coded test authoring. Cross-platform (PC, console, mobile, XR).
- **Pricing:** Free (solo/edu Ambassador). Starter: from $150/node/month (project-based, covers whole team). Growth: $400/node/month. 14-day free trial.
- **Production citation:** Second Dinner (Marvel Snap) listed as customer. Room 8 Group partnership (Sept 2024). Nitro Games, TRIPP, Mythic Protocol.
- **Integration:** UE5 plugin (5.1-5.4). C# API via NUnit. CI/CD pipeline integration.
- **Criteria:** ✓ All 7.
- **Adoption risk:** MEDIUM — requires test authoring skill (C#). Test Assistant reduces this barrier.
- **Steam disclosure:** No — dev-side tool.
- **Sources:** [GameDriver pricing](https://www2.gamedriver.io/en-us/pricing), [Room 8 Group partnership](https://www.businesswire.com/news/home/20240924445871/en/Room-8-Group-Integrates-GameDrivers-Automated-Testing-Solution-to-Boost-Game-Development), [GameDriver KB](https://kb.gamedriver.io/getting-started-with-gamedriver-and-unreal-engine)

**Excluded from QA:**
- Applitools — designed for web/mobile apps, not game engines. Needs custom screenshot pipeline for UE5. Wrong fit for 1-QA team. Fails criteria 3, 4.
- Tricentis — enterprise SaaS testing ($25K-75K/year). No game engine support. Fails criteria 3, 7.
- Functionize — web/SaaS focus. No game engine integrations. Fails criterion 3.
- GameBench — performance profiling, mobile-focused. CH is PC-first. Marginal fit; the executing LLM should evaluate if CH plans mobile client.

---

## 8. Narrative & Localisation

### 8a. Inworld AI — Inworld
- **What:** AI NPC dialogue engine with personality, memory, goals, and voice. Faction-aware character creation. Real-time dynamic dialogue.
- **Pricing:** Usage-based: On-Demand from $25/M characters (Mini) to $50/M characters (Max). 50%+ price cuts June 2026. $500M valuation, backed by NVIDIA + Microsoft.
- **Production citation:** NetEase (Cygnus Enterprises — confirmed integration). Niantic (Wol). Community mods: Skyrim, GTA V.
- **Integration:** UE5 plugin, Unity plugin. REST API.
- **Criteria:** ✓ All 7.
- **Adoption risk:** MEDIUM — evaluate latency at MMO scale (200+ concurrent NPCs).
- **SAG-AFTRA:** TTS voice generation — verify compliance with Interactive Media Agreement [VERIFY].
- **Steam disclosure:** YES — live-generated AI content. Must disclose.
- **Sources:** [Inworld pricing](https://inworld.ai/founder-pricing), [Inworld price cuts](https://www.businesswire.com/news/home/20260610968386/en/Inworld-Cuts-Prices-to-Take-Down-the-Biggest-Wall-in-Consumer-AI-Cost), [NetEase integration](https://inworld.ai/blog/netease-cygnus-enterprise-integrated-ai-npcs-inworld)

### 8b. Convai — Convai
- **What:** Conversational AI NPCs with environmental awareness, memory, voice, lip-sync. Lore/document upload for faction histories — relevant for CH's 5 factions and corruption mechanic.
- **Pricing:** Free tier. Indie Dev: $29/month. Professional: $99/month. Scale: $499/month. Business: $1,199/month. Enterprise: custom.
- **Production citation:** NVIDIA marketing partnership (not production validation). Second Life integration. No confirmed shipped commercial game [VERIFY].
- **Integration:** UE5 plugin (Marketplace), Unity plugin.
- **Criteria:** ✓ 5/7. Criterion 5 (stability — 8-10s latency, broken long-term memory in Unreal SDK March 2026) and criterion 6 (no shipped game) are concerns.
- **Adoption risk:** HIGH — latency and stability issues documented. Evaluate carefully before committing.
- **SAG-AFTRA:** Same voice compliance concern as Inworld [VERIFY].
- **Steam disclosure:** YES — live-generated.
- **Sources:** [Convai pricing](https://convai.com/pricing), [Convai latency review](https://scribehow.com/page/Convai_Review_2026_The_Most_Technically_Impressive_AI_Character_Platform__Held_Back_by_a_Latency_Problem_That_Wont_Go_Away__QJHPcZlvRkOQFemjqtlo4g)

### 8c. memoQ (Gaming Bundle) — memoQ
- **What:** Translation management with AI-assisted translation. Gaming Bundle includes Gridly (content platform) + Voiseed (AI dubbing). Won 2025 Best MT CODiE Award. Terminology management crucial for faction/lore consistency across languages.
- **Pricing:** Translator Pro: $30-44/month. Starter: $242/month (1 PM). Essential: $2,750/year (1-5 PM). Higher tiers custom.
- **Production citation:** Gameloft (30% productivity boost — confirmed case study). GAMEVIL/Com2uS. Epic.
- **Integration:** Terminology management, repo-based workflow.
- **Criteria:** ✓ All 7.
- **Adoption risk:** LOW — localisation is a clear ROI case.
- **Steam disclosure:** No — dev-side tool. Outputs are human-reviewed before shipping.
- **Sources:** [memoQ Gaming](https://www.memoq.com/solutions/game-localization/), [Gameloft case study](https://www.memoq.com/success-stories/gamevil/)

### 8d. Phrase TMS — Phrase (Memsource)
- **What:** Enterprise localisation platform with AI translation, translation memory, QA automation. Game-specific "Phrase Strings" product for game text.
- **Pricing:** From ~$525/month. Custom enterprise pricing.
- **Production citation:** Bohemia Interactive, GameHouse, Mixi.
- **Integration:** API. Repo-based workflow suits agile development.
- **Criteria:** ✓ All 7.
- **Adoption risk:** LOW — localisation is clear ROI.
- **Steam disclosure:** No — dev-side tool.
- **Sources:** [Phrase pricing](https://phrase.com/pricing/), [Phrase gaming](https://phrase.com/industries/gaming/)

**Excluded from Narrative:**
- Replica Studios — DEFUNCT (30 June 2025).
- Charisma.ai — better for structured linear/branching stories than open-world MMO freeform NPC dialogue. Warner Bros/Sky/BBC are entertainment experiences, not games. Borderline on criterion 3; the executing LLM should evaluate if relevant for CH's quest system.

---

## 9. Production & Project Management

### 9a. Atlassian Intelligence (Rovo) — Atlassian
- **What:** AI layer across Jira: auto-triage, sprint planning, natural language JQL, AI teammates for repetitive tasks, smart summaries.
- **Pricing:** Included in Jira Premium ($15.63/user/month). Rovo agent: $240/user/year (Enterprise). 70 AI credits/user/month on Premium.
- **Production citation:** Used across thousands of companies including game studios. Native to existing Jira deployment.
- **Integration:** Already integrated — CH runs Jira. Zero migration.
- **Criteria:** ✓ All 7.
- **Adoption risk:** NONE — already in their stack. Just upgrade to Premium tier.
- **Sources:** [Atlassian Intelligence pricing](https://www.eesel.ai/blog/atlassian-intelligence-ai-in-jira)

### 9b. Granola — Granola AI
- **What:** AI meeting notes with team workspaces, auto-structured transcripts, action items. API for integration.
- **Pricing:** Business: $14/user/month. Enterprise: $35/user/month (SSO, model training opt-out).
- **Production citation:** Vanta, Gusto, Asana, Cursor, Lovable, Mistral AI as enterprise customers. $1.5B valuation (Series C). Also used at NBI (CH's advisory firm) — 139 meetings already synced.
- **Integration:** REST API on Business+. Slack integration. Calendar sync.
- **Criteria:** ✓ All 7. Already proven in CH's own advisory relationship.
- **Adoption risk:** LOW — meeting notes are universally welcomed. Remote team benefits most.
- **Sources:** [Granola pricing](https://costbench.com/software/ai-meeting-assistants/granola/), [TechCrunch Series C](https://techcrunch.com/2026/03/25/granola-raises-125m-hits-1-5b-valuation-as-it-expands-from-meeting-notetaker-to-enterprise-ai-app/)

---

## 10. Marketing & Community

### 10a. Runway — Runway AI
- **What:** AI video generation (Gen-4) for trailers, cutscenes, promotional materials. Text/image to video.
- **Pricing:** Pro: $28/month (annual). Unlimited: $76/month. Enterprise: custom.
- **Production citation:** Ad agency replicated $300K-$600K production for ~$3K. Industry standard for AI video 2026.
- **Integration:** Web-based. Export to standard formats. Asset pipeline tool.
- **Criteria:** ✓ All 7.
- **Adoption risk:** LOW — marketing tool, not touching the game pipeline.
- **Steam disclosure:** No — marketing materials, not game content.
- **Sources:** [Runway pricing](https://www.eesel.ai/blog/runway-ai-pricing)

### 10b. Canva AI (Teams) — Canva
- **What:** AI design suite: Magic Studio, brand kits, collaboration, approval workflows. Social assets, pitch decks, brand collateral.
- **Pricing:** Teams: $10/user/month (3+ users). Enterprise: custom (SSO, SOC 2). 500 AI credits/month on Pro.
- **Integration:** Slack, Google Drive, Dropbox.
- **Criteria:** ✓ All 7.
- **Adoption risk:** LOW — widely known, low learning curve.
- **Sources:** [Canva pricing](https://checkthat.ai/brands/canva/pricing)

**Excluded from Marketing:**
- Sprout Social — $299/user/month. Fails criterion 7 for a 2-3 person marketing team. Executing LLM should recommend Buffer AI ($6/channel/month) or Hootsuite ($99/month) as CH-appropriate alternatives.
- Discord AutoMod — keyword filtering, not AI/ML. Fails criterion 1.
- Brandwatch — $800-5,000+/month. Fails criterion 7 for CH's scale.

---

## 11. Data & Analytics

### 11a. GameAnalytics — GameAnalytics (Copenhagen)
- **What:** Purpose-built game analytics: retention, monetisation, player behaviour, A/B testing, AI-powered insights. Natural language queries via Claude/ChatGPT/Gemini integration.
- **Pricing:** Free tier (unlimited MAU, core analytics). Paid from ~$29/month for advanced modules (SegmentIQ, PipelineIQ, MarketIQ).
- **Production citation:** Trihex Studios (Roblox), Splitting Point, HyperVR, CYMPL Studios. 59+ companies in production.
- **Integration:** UE5 + Unity SDKs. Data Warehouse feature.
- **Criteria:** ✓ All 7. Clear pick — game-specific, free tier, UE5 SDK.
- **Adoption risk:** LOW — free to start, game-specific, UE5 native.
- **Sources:** [GameAnalytics pricing](https://www.gameanalytics.com/pricing), [GameAnalytics customers](https://www.gameanalytics.com/customers)

**Excluded from Data:**
- Amplitude — $65K/year median enterprise. No UE5 SDK. Fails criteria 4, 7 when GameAnalytics is free.
- deltaDNA — absorbed into Unity Gaming Services. Not relevant for UE5. Fails criterion 4.

---

## 12. Platform & Backend (AI-powered only)

### 12a. Easy Anti-Cheat — Epic Games
- **What:** Anti-cheat with behavioural AI detection, hardware fingerprinting, driver monitoring. Rolling AI detection upgrades throughout 2026.
- **Pricing:** Free tier with Epic Online Services. Paid tiers (Core, Fortified, Premier) for deeper detection.
- **Production citation:** Fortnite, Rocket League, Apex Legends, Elden Ring, hundreds of titles via EOS.
- **Integration:** UE5 native. Cross-platform.
- **Criteria:** ✓ All 7. Natural fit — free with UE5.
- **Adoption risk:** NONE — standard, free, native.
- **Sources:** [EAC licensing](https://www.easy.ac/licensing)

**Excluded from Platform:**
- PlayFab, Nakama, Pragma — backend infrastructure, not AI tools.
- AccelByte — hard exclusion per Glen's instruction.
- BattlEye — legitimate anti-cheat but redundant when EAC is free with UE5. Custom pricing is a barrier for a secondary tool.

---

## 13. HR & People

### 13a. Ravio — Ravio (London)
- **What:** Real-time total compensation benchmarking (base, equity, variable, benefits) with salary band tooling and pay equity compliance. Games-industry-specific dataset.
- **Pricing:** From GBP 5,000/year (500 employees). Tiered up to GBP 50K+ for large enterprises.
- **Production citation:** Bolt, Wise, Finastra, Octopus Energy. Most comprehensive European comp dataset. 4.7/5 G2.
- **Integration:** HiBob integration. Automated job mapping. UK/European focus — strong fit for UK+Greece studio.
- **Criteria:** ✓ All 7. Purpose-built for the problem CH faces (games compensation, European market).
- **Adoption risk:** LOW — data product, no workflow disruption.
- **Sources:** [Ravio](https://ravio.com/compensation-benchmarking), [Ravio pricing](https://checkthat.ai/brands/ravio)

### 13b. Greenhouse — Greenhouse Software
- **What:** AI-powered ATS: sourcing, candidate matching, structured hiring, bias reduction, fraud detection.
- **Pricing:** Core: ~$5,100/year. Median contract: $12,250/year. Pro: $70K+ enterprise.
- **Production citation:** #1 ATS on G2 Spring 2026. 7,500+ companies including Kaizen Gaming.
- **Integration:** HiBob integration available. Slack, LinkedIn.
- **Criteria:** ✓ 6/7. Criterion 7 is borderline — $5K+/year for a studio that hires sporadically. Appropriate if hiring ramps (which it is — ~70 growing).
- **Adoption risk:** LOW if hiring volume justifies it.
- **Sources:** [Greenhouse #1 ATS](https://www.greenhouse.com/newsroom/greenhouse-ranked-best-ats-in-the-g2-spring-2026-reports)

**Excluded from HR:**
- Lattice — performance management, borderline on whether it's genuinely AI or just surveys with analytics. Executing LLM should evaluate.
- HiBob AI features — already in use at CH; not a new recommendation but a "maximise what you have" note.
- Pave — North American focus. Fails criterion 4 (UK/Greece coverage poor).

---

## 14. Finance & Legal

### 14a. Luminance — Luminance (Cambridge, UK)
- **What:** AI contract review and autonomous negotiation. Pattern recognition across 150M+ legal docs. Multi-language. Compliance verification.
- **Pricing:** Custom enterprise pricing (demo + POC + quote). Likely GBP 15K-50K/year [VERIFY exact].
- **Production citation:** 1,000+ enterprises across 70+ countries. LexisNexis strategic alliance (April 2026). Revenue doubled 2025.
- **Integration:** Cloud deployment. GDPR-compliant (UK HQ).
- **Criteria:** ✓ 6/7. Criterion 7 is borderline — enterprise pricing for a 1-lawyer team. BUT: contract review volume is growing (Sheridans, Mishcon, employment contracts for 70+ people, partner IP agreements).
- **Adoption risk:** MEDIUM — needs ROI justification for Dino's workload.
- **Sources:** [Luminance LexisNexis alliance](https://legaltechnology.com/2026/04/21/lexisnexis-and-luminance-form-alliance-to-embed-citation-backed-legal-ai-into-contract-workflows/)

### 14b. Spellbook — Spellbook (Rally Legal)
- **What:** AI contract drafting and clause-level review inside Microsoft Word. Built for small legal teams and solo practitioners.
- **Pricing:** [VERIFY — not publicly listed, enterprise sales]. Positioned as more accessible than Luminance.
- **Production citation:** Used by small and solo law firms. Tested by legal tech reviewers.
- **Integration:** Microsoft 365 (Word-native). Better fit for a 1-lawyer team than enterprise platforms.
- **Criteria:** ✓ 6/7. Criterion 7 (pricing) needs verification.
- **Adoption risk:** LOW — Word-native, minimal disruption.
- **Sources:** [Spellbook](https://spellbook.com/learn/ai-legal-contract-review-faster-analysis)

### 14c. Xero AI features — Xero
- **What:** Cloud accounting with AI bank reconciliation (80-90% auto-categorisation), MTD for VAT, payroll, multi-currency.
- **Pricing:** UK: Ignite GBP 16/month. Grow GBP 37/month. Advanced GBP 50/month. Ultimate GBP 65/month. Payroll: +GBP 1/employee/month.
- **Production citation:** Millions of UK SMBs. MTD-compliant. Standard for UK businesses.
- **Integration:** 1,000+ app integrations. Bank feeds. Stripe/PayPal.
- **Criteria:** ✓ All 7. Note: the "AI" is specifically the bank reconciliation auto-categorisation (ML-powered). The rest is standard accounting software.
- **Adoption risk:** NONE — standard UK accounting tool. Lili will likely choose this anyway.
- **Sources:** [Xero UK pricing](https://marcandrews.com/xero-pricing-uk-2026-every-plan-explained-in-gbp/)

---

## Summary

| Discipline | Tools included | Tools excluded (with reason) |
|---|---|---|
| Engineering | 4 (Aura, Ultimate Engine CoPilot, Ludus AI, Node to Code) | Copilot (generic), Sourcery (generic), FlightDeck (VP not game dev) |
| DevOps | 1 (TeamCity AI) | Incredibuild (not AI), Hathora (dead), Pulumi (wrong fit) |
| Art | 4 (Substance 3D AI, Meshy, DLSS, Topaz) | Firefly standalone (covered by Substance), SD self-hosted (no infra), Midjourney (IP risk) |
| Animation | 3 (Cascadeur, Mixamo, MetaHuman Animator) | DeepMotion/Move.ai/Rokoko (unverified — LLM should evaluate) |
| Audio | 4 (Wwise Similar Sound, AIVA, ElevenLabs SFX, Reactional Music) | Replica Studios (dead), Stable Audio (vendor risk), Soundful (no adoption), voice cloning (banned) |
| Game Design | 4 (Machinations, Promethean AI, Ludo.ai, modl.ai) | UE5 PCG (not AI) |
| QA | 2 (modl.ai, GameDriver) | Applitools (wrong fit), Tricentis (wrong fit), Functionize (wrong fit) |
| Narrative & Loc | 4 (Inworld AI, Convai, memoQ, Phrase TMS) | Replica Studios (dead), Charisma.ai (borderline — LLM should evaluate) |
| Production | 2 (Atlassian Intelligence, Granola) | Tempo (not AI), Otter.ai (excluded per Glen) |
| Marketing | 2 (Runway, Canva AI) | Sprout Social (overpriced), Discord AutoMod (not AI), Brandwatch (overpriced) |
| Data | 1 (GameAnalytics) | Amplitude (overpriced, no UE5 SDK), deltaDNA (Unity-only) |
| Platform | 1 (Easy Anti-Cheat) | PlayFab/Nakama/Pragma (not AI), AccelByte (banned), BattlEye (redundant) |
| HR | 2 (Ravio, Greenhouse) | Lattice (borderline AI), HiBob (already in use), Pave (NA focus) |
| Finance & Legal | 3 (Luminance, Spellbook, Xero AI) | Harvey (inaccessible), Float (not AI) |

**Total: 37 tools across 14 disciplines.** All pass at least 5 of 7 criteria. Tools with criterion gaps have [VERIFY] flags on the specific gap.

### Dead companies caught during research (would have been wrong recommendations)
1. Replica Studios — shut down 30 June 2025
2. Clockwise — shut down April 2026
3. Hathora — shut down May 2026 (acquired by Fireworks AI)
4. deltaDNA — absorbed into Unity Gaming Services

### Steam AI Disclosure Impact Summary

| Category | Tools affected |
|---|---|
| **No disclosure needed** (dev-side) | GameDriver, modl.ai, Machinations, memoQ, Phrase TMS, GameAnalytics, Atlassian Intelligence, Granola, all Engineering/DevOps/HR/Finance tools |
| **Pre-Generated disclosure** (if outputs ship) | Substance 3D AI textures, Meshy models, Topaz upscaled textures, AIVA music, ElevenLabs SFX, Promethean AI environments |
| **Live-Generated disclosure** (runtime AI) | Inworld AI NPCs, Convai NPCs |
