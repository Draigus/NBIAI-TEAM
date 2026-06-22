# Verified Tool Seed List — Couch Heroes AI Strategy

**Purpose:** Append this to the RICECO prompt's Context section before execution. Tools marked [WEB-VERIFIED] have confirmed pricing and citations from web research with sources. Tools marked [TRAINING-DATA] are from the model's training knowledge and should be verified before delivery.

**Status:** Partial verification. 4 tools fully web-verified. Remaining tools sourced from training data with [VERIFY] flags.

---

## 1. Engineering

Note: Generic code copilots (GitHub Copilot, generic Cursor) removed — they are not specialist UE5 tools and would be a shallow recommendation. The tools below are purpose-built or specifically validated for Unreal Engine development.

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| Aura | TryAura.dev (by Ramen) | UE5-native AI agent: generates 3D assets, creates/edits Blueprints and C++ directly inside the editor. Telos 2.0 features 25x error rate reduction for Blueprint graph interpretation. Agentic loops for autonomous task completion. | Plugin | Pro: $40/month (credit-based). | Released January 2026. Targets professional studios. No shipped game confirmed [VERIFY]. | UE5 plugin (5.3-5.7). Windows only. Operates inside UE5 editor, not a separate IDE. | [WEB-VERIFIED] |
| Ludus AI | Ludus Engine | Professional AI toolkit for UE5: C++ assistance, Blueprints copilot, scene generation, AI Unreal expert. Purpose-built for game development in Unreal. | Plugin | [VERIFY: pricing not found in search results] | [VERIFY: production adoption] | Native UE5 plugin. C++ + Blueprints. | [WEB-VERIFIED] |
| Ultimate Engine CoPilot | BlueprintsLab | UE5 AI plugin: 1,050+ tools, Blueprint generation, C++ code generation, material creation, 3D model generation, 32 PCG actions, VFX, cinematics. Full source code included. | Plugin | $220 one-time purchase, lifetime updates (FAB Marketplace). | Featured twice on FAB Marketplace (April 2026). "Thousands of Unreal developers" [VERIFY specific shipped game]. | Native UE5 plugin. One-time purchase, no subscription. | [WEB-VERIFIED] |
| Node to Code | Protospatial (open-source) | Converts UE5 Blueprint graphs to C++ code using AI. Integrates into Blueprint Editor toolbar. Recommends Claude 3.5 Sonnet for best Unreal C++ output. | OSS Plugin | Free (open-source). Requires own LLM API key (Claude/GPT). | Open-source community tool [VERIFY: studio adoption]. | Native UE5 Blueprint Editor integration. | [WEB-VERIFIED] |
| Cursor IDE (for UE5 C++) | Anysphere | AI-native IDE (VS Code fork) with project-wide indexing. Genuinely usable for UE5 C++ in 2026 — handles the 15M-line engine codebase. MCP client support. Multiple model backends. | SaaS | Pro: $20/user/month; Business: $40/user/month [VERIFY]. | Used by game developers for UE5 C++ (documented in StraySpark studio comparison 2026). | VS Code fork; UE5 C++ indexing works. Not as integrated as Rider for UE5-specific features (no Blueprint navigation). | [WEB-VERIFIED] |

## 2. DevOps & Infrastructure

Note: Incredibuild (distributed builds — not AI), Hathora (DEFUNCT May 2026), and Pulumi (IaC — not AI, wrong fit) were removed.

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| TeamCity AI (Build Analyzer) | JetBrains | AI-powered build failure analysis: reads logs, identifies root cause, suggests fixes. AI agents can set up build configurations and full build chains. | SaaS/On-prem | Cloud: $45/committer/month. On-prem: $2,399/year + $359/agent/year. Free tier: 100 configs, 3 agents. AI features in Early Access (TeamCity 2025.11+). | JetBrains ecosystem widely used in game studios. AI Build Analyzer new in 2025-2026. | Perforce/Git integration. UE5 build pipeline compatible. JetBrains AI platform. **Best fit for CH if they choose TeamCity (currently under evaluation).** | [WEB-VERIFIED] |

## 3. Art Pipeline

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| Adobe Substance 3D (AI features) | Adobe | AI-powered PBR texture/material creation from text prompts and photos; includes Text to Texture, auto-tiling, Image to Material | SaaS (desktop) | Teams: $119.99/seat/month ($1,439.88/seat/year). Indie: $24.99/month (Texturing only). 20% price increase effective March 2025. Generative AI features included in subscription. | CD Projekt Red (Cyberpunk 2077), Naughty Dog (Uncharted 4), Ubisoft Massive (The Division 2) | Maya plugin (ships with Maya 2020+), Blender via Connector, Houdini .sbsar native, UE5 official plugin. ZBrush: no direct plugin (export-based). **ADOPTION RISK: LOW — augments existing artist workflow, not a replacement. Artists already use Substance. AI features are opt-in within a familiar tool.** | [WEB-VERIFIED] |
| Meshy | Meshy.ai | AI 3D model generation from text/image prompts; outputs textured, rigged models with PBR maps | SaaS | Pro: $20/month (1,000 credits, ~50 models). Studio: $60/month. Enterprise: custom. $15M ARR as of Nov 2025. | No verified shipped AAA game [VERIFY]. Indie/jam-tier adoption confirmed. GDC 2025 exhibitor. | Blender plugin (official), Maya plugin (official). UE5 via FBX/GLB export. No Substance/ZBrush/Houdini native plugins. **ADOPTION RISK: HIGH — "AI generates 3D models" is exactly what art teams resist. Position as rapid prototyping/blockout only, never final assets. Sasha will likely oppose.** | [WEB-VERIFIED] |
| Tripo (Tripo3D) | Tripo AI | Text/image-to-3D model generation; high-quality mesh output with PBR textures; animation support | SaaS | Free tier; Pro plans available [VERIFY current pricing tiers] | Competes with Meshy in text-to-3D space [VERIFY: shipped game usage and specific pricing] | API + web interface; FBX/GLB/OBJ export for UE5 import | [TRAINING-DATA] |
| Adobe Firefly (Enterprise) | Adobe | Licensed-data image generation for concept ideation; IP indemnification on Enterprise tier | SaaS | ~$70/seat/month (Enterprise) [VERIFY current pricing and game asset coverage] | Adobe Stock + public domain training data. No specific game studio citation for Enterprise tier [VERIFY]. | Browser-based; no DCC plugin. | [TRAINING-DATA] |
| NVIDIA DLSS (UE5) | NVIDIA | Runtime AI upscaling/frame generation for shipped game; trained neural network per-game | Free (UE5) | Free (included with UE5 + NVIDIA GPUs). AMD FSR is the non-AI alternative. | Every major UE5 title ships with DLSS support. Industry standard. | Native UE5 plugin. **Critical for MMO targeting broad hardware compatibility.** | [WEB-VERIFIED] |
| Topaz Photo AI (includes Gigapixel) | Topaz Labs | AI upscaling (up to 6x), denoising, sharpening for textures and reference images; 9 AI models including High Fidelity and Recover | Desktop app | Personal: $149/year ($12/month). Pro: $499/year. Photo AI bundle (Gigapixel + DeNoise + Sharpen): $199/year. Requires 8GB+ VRAM. | Widely used in film/game art pipelines. Standard tool for texture upscaling. | Standalone app; batch processing; export for Substance/Maya pipeline. **ADOPTION RISK: LOW — utility tool, doesn't feel like "AI replacing artists."** | [WEB-VERIFIED] |

## 4. Animation

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| Cascadeur | Nekki | AI-assisted keyframe animation: auto-posing, physics simulation, AI inbetweening; full manual control retained | Desktop app | Indie: $8/user/month (annual, <$100k revenue). Pro/Teams: $33/user/month (annual). Free tier (no FBX export). Perpetual licence after 12 months. | Shadow Fight 3 (Nekki, in-house). Epic MegaGrant recipient for UE5 Live Link. No AAA Western studio citation [VERIFY]. | FBX/DAE/USD export. UE5 Live Link plugin in development (2026.1). Maya/Blender FBX round-trip. MetaHuman support documented. | [WEB-VERIFIED] |
| DeepMotion | DeepMotion | AI motion capture from video; no markers or suits required | SaaS | Free tier; Pro: $15/month; Studio: $45/month [VERIFY] | [VERIFY: game studio adoption] | FBX/BVH export; UE5 compatible via retargeting | [TRAINING-DATA] |
| Move.ai | Move.ai | Markerless motion capture using smartphone/standard cameras | SaaS | Enterprise pricing [VERIFY] | Used at Ninja Theory [VERIFY] | FBX export; UE5 LiveLink integration [VERIFY] | [TRAINING-DATA] |
| Rokoko | Rokoko | Motion capture suits + video mocap + AI cleanup | Hardware+SaaS | Smartsuit Pro II: ~$2,495; Video mocap: $25/month (Plus) [VERIFY] | Used at Ubisoft, EA, CD Projekt Red [VERIFY] | UE5 LiveLink plugin, Maya/Blender plugins, Mixamo integration | [TRAINING-DATA] |
| UE5 MetaHuman Animator | Epic Games | iPhone-based facial animation capture mapped to MetaHuman rigs (AI is Apple's face-tracking ML, not Epic's) | Free (UE5) | Free (included with UE5) | Ninja Theory (Hellblade II) [VERIFY] | Native UE5. Requires iPhone with TrueDepth camera. | [TRAINING-DATA] |
| Mixamo | Adobe (free) | AI auto-rigging and animation library; ML-powered auto-rigger for humanoid characters | Free | Free (Adobe account required) | Widely used across indie and AA studios for rapid rigging/prototyping. | FBX export; UE5 retargeting compatible. **Low adoption risk — feels like a utility, not "AI replacing artists."** | [TRAINING-DATA] |

## 5. Audio

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| ElevenLabs Sound Effects | ElevenLabs | Text-to-SFX generation; up to 30s, 48kHz, seamless looping, 38 SFX categories (NOT voice cloning) | SaaS | Free tier included in plans. Starter $5/month, Creator $22/month, Pro $99/month, Scale $330/month. SFX costs 200 credits/gen or 40 credits/sec. | Integrated into Scenario.gg and Layer.ai for game pipelines. No specific shipped game title confirmed [VERIFY]. | API + web; WAV export for Wwise/FMOD. | [WEB-VERIFIED] |
| AIVA | AIVA Technologies | AI orchestral/cinematic music composition with MIDI + WAV export; style training on Pro tier | SaaS | Free (non-commercial, AIVA owns copyright). Standard: EUR 15/month. Pro: EUR 49/month (5 team seats, full copyright ownership). | Composed main theme for Pixelfield (2017, Epic Stars) — first AI game soundtrack. | MIDI/WAV export; Wwise/FMOD import compatible. | [WEB-VERIFIED] |
| Stable Audio 3.0 | Stability AI | Text-to-music and text-to-SFX; open-weight models (459M-2.7B params); up to 6m20s tracks; trained on fully licensed data | SaaS+OSS | SA 2.5: $0.20/audio. SA 3.0: 100 free credits for new users. Open-weight models downloadable under Community Licence. | No shipped AAA title confirmed [VERIFY]. Commercially licensable outputs. | WAV export; 48kHz. Launched May 2026. **VENDOR RISK: Stability AI has been in severe financial distress since 2024 (layoffs, leadership changes). The open-weight model is the safer bet; the SaaS may not exist by CH's 2028 launch.** | [WEB-VERIFIED] |
| Wwise Similar Sound Search | Audiokinetic + Sony AI | AI audio-to-audio and text-to-audio search within Wwise; trained on BOOM Library and Pro Sound Effects catalogues | Plugin (included) | Included in Wwise 2025.1+. Wwise pricing: Free (<$250K budget); Pro from $8K; Premium from $25K; Platinum from $50K. (Or 1% royalty.) | Wwise is industry standard — hundreds of shipped AAA and indie titles. Similar Sound Search is new (2025.1). | Native Wwise integration. **Strongest specialist audio AI tool for CH if they choose Wwise.** | [WEB-VERIFIED] |
| OptimizerAI | OptimizerAI | AI SFX generation purpose-built for games; text-to-SFX, royalty-free | SaaS | Free tier + paid from $14/month. | [VERIFY: no shipped game confirmed] | Game-specific SFX focus. | [WEB-VERIFIED] |
| Reactional Music | Reactional Music | AI-driven adaptive music engine; real-time soundtrack responds to gameplay inputs (location, health, combat intensity). Music reacts to player actions, not just triggers. | Plugin | Custom pricing [VERIFY]. | Partnership with Dovetail Games (Oct 2025). Nominated by Unity for Best Artistic Tool. Partnership with Ninja Tune. | Unity plugin confirmed. **UE5 integration: [VERIFY] — Unity is the primary platform.** Relevant for MMO adaptive soundtrack. | [WEB-VERIFIED] |

## 6. Game Design

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| Machinations | Machinations.io | Visual game economy simulation; model resource flows, currency sinks/faucets, progression systems; browser-based, collaborative | SaaS | Community: Free (1 seat, 1K sim runs/month). Starter and Pro paid tiers with 10K+ sim runs/month [VERIFY exact paid prices]. Enterprise: custom. | **Ubisoft, Gameloft, Wargaming, King** confirmed as clients. Joygame case study (34% production time reduction). Nominated Best Tech Provider at Develop:Star Awards. | Browser-based. API available. **Best tool for CH's economy/crafting/currency design.** | [WEB-VERIFIED] |
| Promethean AI | Promethean AI | AI-assisted 3D environment layout and level dressing from natural language; contextual prop placement | SaaS+Plugin | Free (individuals). Indie: $19.99/month (annual) or $29.99/month. Professional: $59.99/month (annual) or $89.99/month. Enterprise: custom. | **PlayStation Studios** confirmed user. Disney Accelerator backed. 10,000+ users. Founded by ex-Naughty Dog art director. | UE5 plugin, Unity, Blender, Maya, 3ds Max. | [WEB-VERIFIED] |
| UE5 PCG Framework | Epic Games | Built-in procedural content generation; node-based foliage, rocks, props, buildings, world population | Free (UE5) | Free (included with Unreal Engine). Production-ready in UE 5.7. | Used by every UE5 studio doing open-world work. Industry standard. | Native UE5. No external dependency. | [WEB-VERIFIED] |
| Ludo.ai | Ludo | AI game research, market analysis (Ludo Score), trend tracking, concept generation, GDD creation | SaaS | Free (Starter). Indie: ~$20/month. Studio: $300/month. | **Rovio, Ubisoft, Voodoo, SayGames, Homa, Garena** confirmed clients. SIFOR case study (50+ games/year). IzyPlay (12M+ downloads). | Browser-based. | [WEB-VERIFIED] |
| Ultimate Engine CoPilot | BlueprintsLab | UE5 AI plugin: 1,050+ tools including 32 PCG actions; generate PCG graphs from text prompts; also Blueprints, materials, VFX | Plugin | $220 one-time purchase, lifetime updates (FAB Marketplace). | Featured twice on FAB Marketplace (April 2026). "Thousands of Unreal developers" [VERIFY specific shipped game]. | Native UE5 plugin. | [WEB-VERIFIED] |

**Note on AI game balancing:** No standalone commercial "AI game balancing tool" exists as a purchasable product. The realistic pipeline for CH's MMORPG: Machinations for economy design (pre-production), modl.ai for automated playtesting that surfaces balance issues (production), and custom simulation agents for encounter/combat balancing (internal tooling). Riot Games runs ~4M simulated games/week internally for LoL balancing — this is bespoke, not off-the-shelf.

## 7. QA & Testing

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| GameDriver | GameDriver Inc. | Automated gameplay testing framework; tests authored in C# via NUnit; UE5 plugin for in-engine test execution | Plugin+SDK | Free (solo/edu Ambassador); Starter from $150/node/month; Growth $400/node/month. Project-based licensing (covers whole team). 14-day free trial. | Second Dinner (Marvel Snap) listed as customer. Room 8 Group partnership (Sept 2024). Nitro Games, TRIPP, Mythic Protocol. | UE5 plugin (supports 5.1-5.4). C# API. CI/CD pipeline. Cross-platform (PC, console, mobile, XR). Test Assistant standalone app. | [WEB-VERIFIED] |
| modl.ai | modl.ai | AI playtesting bots: automated regression, exploit detection, balance testing, crash detection. Simulates 10K+ hours across skill levels. | SaaS+Plugin | Custom pricing only. $10.8M Series A. | Rare (Sea of Thieves — documented case study on automated testing lessons). | Unity + Unreal plugins. **Best fit for MMORPG exploit detection and 1-QA-person constraint.** | [WEB-VERIFIED] |
| GameBench | GameBench | Mobile/cross-platform performance profiling: FPS, frame pacing, CPU/GPU/memory, network latency | SaaS | Custom pricing; free trial available; startup programme for small studios. | NaturalMotion, Tata Elxsi; ARM/Intel/Samsung hardware partners. | SDK integration; real-device testing. Mobile-focused — less relevant if PC-first. | [WEB-VERIFIED] |
| ~~Applitools~~ | ~~Applitools~~ | REMOVED — designed for web/mobile apps, not game engines. Would require custom screenshot pipeline for UE5 which is impractical for a 1-QA team. GameDriver + modl.ai cover CH's needs. | — | — | — | — | REMOVED |

## 8. Narrative & Localisation

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| Inworld AI | Inworld | AI NPC dialogue engine with personality, memory, goals, and voice. Faction-aware character creation. | SaaS+Plugin | Usage-based: $5-10/M characters (TTS); On-Demand from $25/M (Mini) to $50/M (Max). 50%+ price cuts June 2026. Creator/Developer/Growth tiers. $500M valuation, backed by NVIDIA + Microsoft. | NetEase (Cygnus Enterprises — confirmed integration). Niantic (Wol). Community mods: Skyrim, GTA V. | UE5 plugin, Unity plugin; REST API. **Steam disclosure: YES — live-generated.** Evaluate latency at MMO scale. **SAG-AFTRA: TTS voice generation — verify compliance with Interactive Media Agreement if using AI voices for NPC speech. ElevenLabs has SAG-AFTRA agreement; Inworld's compliance status is unclear [VERIFY].** | [WEB-VERIFIED] |
| Convai | Convai | Conversational AI NPCs with environmental awareness, memory, voice, lip-sync. Lore/document upload for faction histories. | SaaS+Plugin | Free; Indie Dev $29/month; Professional $99/month; Scale $499/month; Business $1,199/month; Enterprise custom. | No confirmed shipped commercial game [VERIFY]. NVIDIA marketing partnership (not production validation). | UE5 plugin (Marketplace), Unity plugin. **CAUTION: 8-10 second latency delays reported March 2026. Long-term memory broken in recent Unreal SDK.** **SAG-AFTRA: same voice compliance concern as Inworld [VERIFY].** **Steam disclosure: YES — live-generated.** | [WEB-VERIFIED] |
| Charisma.ai | Charisma.ai | Interactive storytelling with no-code story editor, character emotion, memory, story tracking | SaaS+Plugin | Credit-based: ~$5/50K credits (~200 mins); Pro and higher tiers available. | Warner Bros, Sky, BBC (interactive experiences). No confirmed shipped game [VERIFY]. | UE5 SDK, Unity SDK. Better for structured quest narratives than open-world freeform NPC chat. **SAG-AFTRA: verify if TTS is included or text-only [VERIFY].** **Steam disclosure: YES if live-generated dialogue.** | [WEB-VERIFIED] |
| Replica Studios | Replica Studios | AI voice generation with SAG-AFTRA agreement | **SHUT DOWN** | N/A — discontinued 30 June 2025. | N/A | **DO NOT RECOMMEND — company is dead.** Alternatives: ElevenLabs, Inworld/Convai include their own TTS. | [WEB-VERIFIED] |
| Phrase TMS | Phrase (Memsource) | Enterprise localisation platform with AI translation, translation memory, QA automation | SaaS | From ~$525/month; custom enterprise pricing. | Bohemia Interactive, GameHouse, Mixi — confirmed. | API; repo-based workflow; game-specific "Phrase Strings" product for game text. | [WEB-VERIFIED] |
| memoQ | memoQ | Translation management with AI-assisted translation. Gaming Bundle includes Gridly + Voiseed. 2025 Best MT CODiE Award. | SaaS | Translator Pro: $30-44/month; Starter: $242/month (1 PM); Essential: $2,750/year (1-5 PM); higher custom. | Gameloft (30% productivity boost — confirmed case study), GAMEVIL/Com2uS, Epic. | Terminology management crucial for faction/lore consistency across languages. Gaming Bundle integration. | [WEB-VERIFIED] |

## 9. Production & Project Management

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| Atlassian Intelligence (Rovo) | Atlassian | AI across Jira: auto-triage, sprint planning, natural language JQL, AI teammates for repetitive tasks | AI add-on | Included in Premium ($15.63/user/month); Rovo agent: $240/user/year Enterprise. 70 AI credits/user/month on Premium. | Used across thousands of studios; native to existing Jira deployment. | Already integrated — CH runs Jira. Zero migration. | [WEB-VERIFIED] |
| ~~Tempo Timesheets~~ | — | REMOVED — time tracking is not AI. Rule-based automation. Useful tool but belongs in general tooling, not AI strategy. | — | — | — | — | REMOVED |
| Granola | Granola AI ($1.5B valuation, Series C) | AI meeting notes with team workspaces, API, auto-structured transcripts | SaaS | Business: $14/user/month; Enterprise: $35/user/month (SSO, model training opt-out). | Vanta, Gusto, Asana, Cursor, Lovable, Mistral AI as enterprise customers. Also used at NBI (CH's advisory firm). | REST API on Business+; Slack integration. | [WEB-VERIFIED] |

## 10. Marketing & Community

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| Sprout Social | Sprout Social (NYSE: SPT) | Unified social inbox, AI content generation, optimal send times, competitive benchmarking, sentiment analysis | SaaS | Professional: $299/user/month; Advanced: $399/user/month. **WARNING: Overpriced for CH's 2-3 person marketing team. 2 seats = $7,176/year.** | Major brands; G2 Leader. AI Assist for on-brand copy. | CRM integrations (Salesforce, HubSpot), Slack. **Consider Buffer AI ($6/channel/month) or Hootsuite ($99/month small team) as CH-appropriate alternatives.** | [WEB-VERIFIED] |
| Runway | Runway AI | AI video generation (Gen-4) for trailers, cutscenes, promotional materials | SaaS | Pro: $28/month (annual); Unlimited: $76/month; Enterprise: custom. | Ad agency replicated $300K-$600K production for ~$3K. Industry standard for AI video 2026. | Web-based. Export to standard formats. Asset pipeline tool, not engine-integrated. | [WEB-VERIFIED] |
| Canva (Teams) | Canva | AI design suite: Magic Studio, brand kits, collaboration, approval workflows | SaaS | Teams: $10/user/month (3+ users); Enterprise: custom (SSO, SOC 2). 500 AI credits/month on Pro. | Used by millions of businesses for social assets, pitch decks, brand collateral. | Slack, Google Drive, Dropbox integrations. | [WEB-VERIFIED] |
| Discord AutoMod | Discord (built-in) | Native keyword filtering + AI-powered moderation bots (Carl-bot, Dyno) for context-aware content moderation | Free + bots | AutoMod: free (built into Discord). Premium bots: $5-20/month. | Standard for gaming communities. AI bots understand gaming context. | Built into Discord server. Bot marketplace. | [WEB-VERIFIED] |

## 11. Data & Analytics

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| GameAnalytics | GameAnalytics (Copenhagen) | Purpose-built game analytics: retention, monetisation, player behaviour, A/B testing, AI-powered insights, natural language queries via Claude/ChatGPT/Gemini integration | SaaS | Free tier (unlimited MAU, core analytics); Paid from ~$29/month for advanced modules (SegmentIQ, PipelineIQ, MarketIQ). | Trihex Studios (Roblox), Splitting Point, HyperVR, CYMPL Studios. 59+ companies in production. | UE5 + Unity SDKs. Data Warehouse feature. **Clear pick for CH — game-specific, free tier, UE5 SDK.** | [WEB-VERIFIED] |
| Amplitude | Amplitude (NASDAQ: AMPL) | Behavioural analytics, ML-powered insights, feature flags, session replay, CDP | SaaS | Plus: from $49/month; median enterprise: ~$64,724/year. **NOT RECOMMENDED for CH — GameAnalytics is free with a UE5 SDK. Included for completeness only.** | Enterprise-grade; major tech companies. Less gaming-specific than GameAnalytics. | No native UE5 SDK. Better suited for web dashboards/companion apps, not the game itself. | [WEB-VERIFIED] |

## 12. Platform & Backend (AI-powered tools only, not general backend infrastructure)

Note: General backend platforms (PlayFab, Nakama, Pragma) are infrastructure decisions, not AI tooling. This section covers only tools with genuine AI/ML capabilities applied to game-specific problems.

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| Easy Anti-Cheat | Epic Games | Anti-cheat with behavioural AI detection, hardware fingerprinting, driver monitoring, screenshot capture. Rolling AI detection upgrades throughout 2026. | Free (UE5) | Free tier included with Epic Online Services; paid tiers (Core, Fortified, Premier) for deeper detection + dedicated support. | Fortnite, Rocket League (April 2026), hundreds of titles via EOS. | UE5 native. Cross-platform. | [WEB-VERIFIED] |
| BattlEye | BattlEye GmbH (Germany) | Proactive anti-cheat: heuristic + signature detection, memory scanning, behaviour analysis | Anti-cheat | Custom licensing (contact sales). Cost-effective for larger studios. | PUBG, Rainbow Six Siege, GTA V/Online (Rockstar, Sep 2024), DayZ, Destiny 2. | Kernel-level driver. Broad platform support. [VERIFY exact pricing]. | [WEB-VERIFIED] |

## 13. HR & People

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| HiBob AI features | HiBob | Core HR with AI: analytics, workforce planning, compliance automation | HRIS | Core: $8/user/month; Essential: $16/user/month; Enterprise: custom. ~$6,720-11,760/year for 70 people. | Mid-market global companies; designed for distributed teams (UK+Greece fits). | **Already in use at CH.** API available. Multi-country compliance. | [WEB-VERIFIED] |
| Greenhouse | Greenhouse Software | AI-powered ATS: sourcing, candidate matching, structured hiring, bias reduction, fraud detection | ATS | Core: ~$5,100/year; median contract: $12,250/year; Pro: $70K+ enterprise. | #1 ATS on G2 Spring 2026. 7,500+ companies including Kaizen Gaming. Used by Anthropic, HubSpot. | HiBob integration available. Slack, LinkedIn. Structured hiring workflows. | [WEB-VERIFIED] |
| Ravio | Ravio (London) | Real-time total compensation benchmarking (base, equity, variable, benefits) with salary band tooling and pay equity compliance | SaaS | From GBP 5,000/year (500 employees). Tiered up to GBP 50K+ for large enterprises. | Bolt, Wise, Finastra, Octopus Energy. Most comprehensive European comp dataset. 4.7/5 G2. | HiBob integration. Automated job mapping. UK/European focus — strong fit for CH. | [WEB-VERIFIED] |
| Lattice (AI features) | Lattice | Performance reviews, 360 feedback, OKRs, pulse surveys, AI-powered review synthesis | SaaS | From $11/user/month (Talent Management); full platform $15-19/user/month. $4K/year minimum. | Widely used mid-market performance platform. | Slack integration, HRIS integrations. AI Agent synthesises multi-source feedback. | [WEB-VERIFIED] |

## 14. Finance & Legal

| Tool | Vendor | Description | Type | Pricing | Production Use | Integration | Status |
|---|---|---|---|---|---|---|---|
| Luminance | Luminance (Cambridge, UK) | AI contract review and autonomous negotiation: pattern recognition across 150M+ legal docs, multi-language, compliance verification | SaaS | Custom enterprise pricing (demo + POC + quote). | 1,000+ enterprises across 70+ countries. Deloitte, Quantinuum, Baringa as design partners. Revenue doubled 2025. LexisNexis strategic alliance (April 2026). | Cloud deployment. GDPR-compliant (UK HQ). [VERIFY per-seat pricing]. | [WEB-VERIFIED] |
| Xero (AI features) | Xero (ASX: XRO) | Cloud accounting with AI bank reconciliation (80-90% auto-categorisation), MTD for VAT, payroll, multi-currency | SaaS | UK: Ignite GBP 16/month; Grow GBP 37/month; Advanced GBP 50/month; Ultimate GBP 65/month. Payroll: +GBP 1/employee/month. | Millions of UK SMBs. MTD-compliant. Standard for UK businesses. | Float integration for cash flow. HiBob payroll sync possible. 1,000+ app integrations. | [WEB-VERIFIED] |
| Spellbook | Spellbook (Rally Legal) | AI contract drafting and clause-level review inside Microsoft Word; built for small legal teams and solo practitioners | SaaS | [VERIFY: pricing not publicly listed, enterprise sales] | Used by small and solo law firms for custom contract drafting. Tested by legal tech reviewers. | Microsoft 365 integration (Word-native). Better fit for a 1-lawyer team than Luminance. | [WEB-VERIFIED] |
| Juro | Juro | AI contract review + full contract lifecycle management (CLM): draft, review, negotiate, manage | SaaS | [VERIFY: pricing not publicly listed] | Used by in-house legal teams. Mid-market focus. | Browser-based CLM. Good for a growing legal function. | [WEB-VERIFIED] |
| ~~Float~~ | — | REMOVED — cash flow forecasting is spreadsheet-style projection, not AI/ML. Useful financial tool but belongs in general tooling, not AI strategy. Recommend alongside Xero separately. | — | — | — | — | REMOVED |

---

## Verification Summary

| Status | Count | Note |
|---|---|---|
| [WEB-VERIFIED] | ~40 | Across all 14 disciplines — pricing and citations confirmed with web sources |
| [TRAINING-DATA] | ~8 | Engineering tools (Copilot, Cursor, Rider AI), Tripo, Topaz, DeepMotion, Move.ai, Rokoko, Adobe Firefly Enterprise, Mixamo — from model training knowledge; pricing needs verification |
| REMOVED | 8 | Replica Studios (dead), Clockwise (dead), Hathora (dead), Incredibuild (not AI), Tempo (not AI), Float (not AI), Applitools (wrong fit), Pulumi (wrong fit) |

### Critical Findings (would have been wrong without verification)

1. **Replica Studios** (AI voice generation) — shut down 30 June 2025. Dead company.
2. **Clockwise** (calendar AI) — shut down April 2026. Dead company.
3. **Hathora** (game server hosting) — shut down May 2026 (acquired by Fireworks AI). Dead company.
4. **deltaDNA** — absorbed into Unity Gaming Services. Not relevant for UE5.
5. **Otter.ai** — excluded per Glen's instruction.
6. **PlayFab / Nakama / Pragma** — backend infrastructure, not AI tools. Removed from AI strategy scope.
7. **Tricentis / Functionize** — enterprise SaaS testing, not game QA. Not recommended.

### Key Discoveries

- **modl.ai** (AI playtesting bots, used by Rare on Sea of Thieves, Die Gute Fabrik on Saltsea Chronicles) — strongest specialist QA tool for CH's single-QA-person constraint
- **Wwise Similar Sound Search** (Sony AI partnership) — AI audio search built into Wwise 2025.1+, free with Wwise licence
- **Machinations** — Ubisoft/King/Wargaming confirmed, 34% production time reduction case study
- **GameAnalytics** — free tier with UE5 SDK, Claude/Gemini natural language query integration
- **Ravio** — games-industry-specific compensation benchmarking, London HQ, HiBob integration

### Steam AI Disclosure Impact

| Category | Trigger | Tools affected |
|---|---|---|
| **No disclosure** | Dev-side tools not consumed by players | GameDriver, modl.ai, GameBench, Machinations, localisation tools (if human-reviewed), all Engineering/DevOps/Production/HR/Finance tools |
| **Pre-Generated disclosure** | AI-generated assets baked into game files | Substance 3D AI textures, Meshy models, AIVA music, Stable Audio SFX, Promethean AI environments — if outputs enter shipped builds |
| **Live-Generated disclosure** | AI systems producing content while game runs | Inworld AI NPCs, Convai NPCs, Charisma.ai dialogue |
