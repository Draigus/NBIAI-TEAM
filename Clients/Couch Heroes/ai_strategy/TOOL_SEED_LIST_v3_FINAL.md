# Verified Tool Seed List v3 (FINAL) — Couch Heroes AI Strategy

**Replaces:** v1 (non-AI tools, dead companies, generic recs) and v2 (inconsistent criteria application, padded with generic business tools)

## Acceptance Criteria (ALL seven, applied consistently)

1. **Genuinely AI/ML** — uses machine learning, neural networks, or trained models. Not rule-based automation, standard workflows, or statistical dashboards.
2. **Specialist to game dev or the specific discipline** — not a generic tool that happens to have AI features (no "Canva for design" or "Xero for accounting").
3. **Relevant to game dev or adjacent industry** (film VFX, broadcast, interactive media).
4. **Works with CH's stack** (UE5, Perforce, Maya/ZBrush/Substance/Houdini) or has a clear integration path.
5. **Company alive, product available** as of June 2026.
6. **Evidence of professional/studio adoption** — named studio or shipped title, not "thousands of users" marketing claims.
7. **Pricing appropriate for ~70-person studio** — not enterprise-only for a 1-person team.

## Structure

- **Tier 1: Game-Specific AI Tools** — the AI strategy recommendations. These go into the RICECO prompt seed list.
- **Tier 2: General Business Tools with AI Features** — useful for CH but not part of the game development AI strategy. Separate appendix. The executing LLM can mention these but should not score them in the discipline tables.

---

# TIER 1: Game-Specific AI Tools

## Engineering

### Aura — TryAura.dev (by Ramen VR)
- **What:** UE5-native AI agent. Generates/edits Blueprints and C++, creates 3D assets and audio, all inside UE5 editor. Telos 2.0: 25x error rate reduction for Blueprint graphs. Agentic loops for autonomous task completion.
- **Pricing:** Indie: $29/month. Professional: $89.99/month. Enterprise: custom. Two-week free trial.
- **Production citation:** Sinn Studio (Swordsman VR) reported halving production time. Tool is <6 months old (Jan 2026) — adoption evidence is thin. [VERIFY independent studio citations beyond Sinn]
- **Integration:** UE5 plugin (5.3-5.7). Windows only.
- **Criteria notes:** Passes all 7. Criterion 6 is soft (one small VR indie).
- **Sources:** [Unreal University](https://www.unreal-university.blog/aura-the-ai-assistant-for-unreal-engine/), [TechIntelPro](https://techintelpro.com/news/ai/ai-assistants/aura-ai-assistant-for-unreal-engine-launches-january-2026/)

### Ultimate Engine CoPilot — BlueprintsLab
- **What:** 1,050+ tool actions across 56 UE5 categories. Blueprint/C++ generation, materials, Niagara VFX, PCG worlds, behaviour trees from natural language. V1.0 April 2026. Full C++ source included. Note: the "AI" is other vendors' LLMs (Claude, Codex, GPT, Gemini) accessed through UE5-specific tooling — it is an LLM integration layer, not a proprietary model.
- **Pricing:** $220 one-time, lifetime updates. Two free AI slots, no API key required to start.
- **Production citation:** Featured on Epic's FAB Marketplace. "Thousands of developers" (marketing claim). No named studio confirmed [VERIFY].
- **Integration:** Native UE5 plugin. FAB Marketplace.
- **Criteria notes:** Passes 6/7. Criterion 6 (no named studio) is soft. Criterion 1 note: LLM wrapper, not proprietary AI.
- **Sources:** [BlueprintsLab V1.0](https://www.financialcontent.com/article/abnewswire-2026-4-16-blueprintslab-launches-ultimate-engine-copilot-v10), [FAB listing](https://www.fab.com/listings/8d776721-5da3-44ce-b7ef-be17a023be59)

## Art Pipeline

### Adobe Substance 3D (AI features) — Adobe
- **What:** AI-powered PBR texture/material creation: Text to Texture, Text to Pattern, auto-tiling, Image to Material. Firefly-powered features built into the existing Substance workflow.
- **Pricing:** Teams: $119.99/seat/month. Indie (Texturing only): $24.99/month. AI features included.
- **Production citation:** Substance 3D is used by CDPR, Naughty Dog, Ubisoft Massive. **However, the AI features (Firefly-powered) launched 2024-2025 — no studio has confirmed shipping a title using the AI features specifically.** [VERIFY: AI feature adoption at named studios]
- **Integration:** Maya plugin, Houdini .sbsar, UE5 official plugin. ZBrush: export-based.
- **Criteria notes:** Passes 6/7. Criterion 6 is for the AI features specifically (not the base product).
- **Adoption risk:** LOW — augments existing workflow. Artists already use Substance. AI is opt-in.
- **Steam disclosure:** Pre-Generated if AI textures ship in the build.
- **Sources:** [Adobe pricing](https://www.adobe.com/products/substance3d/plans.html), [CDPR case study](https://www.adobe.com/products/substance3d/magazine/cyberpunk-2077-a-world-full-of-substance) (base product, not AI features)

### Meshy — Meshy.ai
- **What:** AI 3D model generation from text/image prompts. Textured, rigged models with PBR maps. Meshy 6: up to 600K face meshes.
- **Pricing:** Pro: $20/month (~50 models). Studio: $60/month. $15M ARR (Nov 2025).
- **Production citation:** No shipped AAA game [VERIFY]. Indie/jam adoption confirmed. GDC 2025 exhibitor.
- **Integration:** Blender + Maya plugins (official). UE5 via FBX/GLB export.
- **Criteria notes:** Passes 6/7. Criterion 6 (no professional studio shipping Meshy assets).
- **Adoption risk:** HIGH — art team will resist. Position as rapid prototyping/blockout only.
- **Steam disclosure:** Pre-Generated if any Meshy-derived asset ships.
- **Sources:** [Meshy pricing](https://www.meshy.ai/pricing), [Meshy ARR](https://tools.prnewswire.com/en-us/live/20823/release/20251112EN22522)

## Animation

### Cascadeur — Nekki
- **What:** AI-assisted keyframe animation: auto-posing, AutoPhysics, AI Inbetweening (walk, run, combat, acrobatic style presets). Full manual control retained.
- **Pricing:** Indie: $8/user/month annual. Pro/Teams: $33/user/month annual. Free tier (no FBX export). Perpetual licence after 12 months.
- **Production citation:** Shadow Fight 3 (Nekki — vendor's own game, not independent). Epic MegaGrant for UE5 Live Link (development grant, not adoption). UE5 Live Link status [VERIFY: released or still in development as of June 2026?]
- **Integration:** FBX/DAE/USD export. UE5 via FBX (Live Link pending). Maya/Blender round-trip.
- **Criteria notes:** Passes 6/7. Criterion 6 — only vendor's own game. Criterion 4 — UE5 Live Link pending.
- **Adoption risk:** LOW — augments animators. Perpetual licence is budget-friendly.
- **Sources:** [Cascadeur pricing](https://cascadeur.com/plans), [CG Channel review](https://www.cgchannel.com/2025/04/nekki-releases-cascadeur-2025-1-with-ai-based-inbetweening/), [UE5 Live Link announcement](https://www.cgchannel.com/2025/09/cascadeur-to-get-dedicated-unreal-engine-live-link-plugin/)

## Audio

### Wwise Similar Sound Search — Audiokinetic + Sony AI
- **What:** AI audio-to-audio and text-to-audio search within Wwise. Trained on BOOM Library + Pro Sound Effects catalogues.
- **Pricing:** Included in Wwise 2025.1+. Wwise: Free (<$250K project budget — CH will exceed this, so Pro from $8K or Premium from $25K, or 1% royalty).
- **Production citation:** Wwise is industry standard (hundreds of shipped titles). Similar Sound Search is new but ships with the standard product.
- **Integration:** Native Wwise. Conditional on CH choosing Wwise (audio middleware decision pending).
- **Criteria notes:** Passes all 7 (conditional on Wwise adoption).
- **Sources:** [Audiokinetic](https://www.audiokinetic.com/)

### AIVA — AIVA Technologies
- **What:** AI orchestral/cinematic music composition. MIDI + WAV export. Style training on Pro.
- **Pricing:** Free (non-commercial, AIVA owns copyright). Standard: EUR 15/month. Pro: EUR 49/month (5 seats, full copyright ownership).
- **Production citation:** Pixelfield (2017, Epic Stars) — first AI game soundtrack. Citation is 9 years old and obscure. [VERIFY: any recent game production usage]
- **Integration:** MIDI/WAV export for Wwise/FMOD.
- **Criteria notes:** Passes 6/7. Criterion 6 is weak (ancient, obscure citation).
- **SAG-AFTRA:** N/A — music, not voice.
- **Steam disclosure:** Pre-Generated if AI-composed music ships.
- **Sources:** Agent web research confirmed pricing and Pixelfield citation.

### ElevenLabs Sound Effects — ElevenLabs
- **What:** Text-to-SFX generation. 48kHz, seamless looping, 38 categories. NOT the voice cloning product.
- **Pricing:** Starter: $5/month. Creator: $22/month. Pro: $99/month. Scale: $330/month.
- **Production citation:** Integrated into Scenario.gg and Layer.ai pipelines. No shipped game title confirmed [VERIFY].
- **Integration:** API + web. WAV export for Wwise/FMOD.
- **Criteria notes:** Passes 5/7. Criterion 2 (general-purpose SFX, not game-specialist), criterion 6 (no game studio citation).
- **SAG-AFTRA:** N/A — SFX only. ElevenLabs has a SAG-AFTRA agreement for their voice product.
- **Steam disclosure:** Pre-Generated if AI SFX ship.
- **Sources:** Agent web research confirmed pricing and categories.

## Game Design

### Machinations — Machinations.io
- **What:** Visual game economy simulation. Model resource flows, currency sinks/faucets, progression. Browser-based, collaborative.
- **Pricing:** Community: Free (1 seat, 1K sim runs/month). Paid tiers [VERIFY exact prices].
- **Production citation:** Ubisoft, Gameloft, Wargaming, King. Joygame (34% production time reduction). Develop:Star nomination.
- **Integration:** Browser-based. API available.
- **Criteria notes:** Passes 6/7. **Criterion 1 is borderline** — Machinations runs stochastic simulations (Monte Carlo), which is computational modelling, not ML. Included because it is the best tool for the task (CH's economy design) and has no AI alternative.
- **Adoption risk:** LOW — designers use it as a design tool.
- **Sources:** Agent web research confirmed studio citations.

### Promethean AI — Promethean AI
- **What:** AI-assisted 3D environment layout and level dressing from natural language. Founded by ex-Naughty Dog art director.
- **Pricing:** Free (individuals). Indie: $19.99/month (annual). Professional: $59.99/month (annual). Enterprise: custom.
- **Production citation:** "PlayStation Studios confirmed user" — vague. Which studio? Which game? Disney Accelerator backed. [VERIFY: specific PlayStation studio and game]
- **Integration:** UE5 plugin, Unity, Blender, Maya, 3ds Max.
- **Criteria notes:** Passes 6/7. Criterion 6 — adoption evidence is vague.
- **Adoption risk:** MEDIUM — "AI places props" may trigger art team resistance.
- **Sources:** Agent web research. PlayStation Studios and Disney Accelerator confirmed.

### Ludo.ai — Ludo
- **What:** AI game research, market analysis (Ludo Score), trend tracking, concept generation, GDD creation.
- **Pricing:** Free (Starter). Indie: ~$20/month. Studio: $300/month.
- **Production citation:** Rovio, Ubisoft, Voodoo, SayGames, Homa, Garena. SIFOR (50+ games/year). IzyPlay (12M+ downloads).
- **Integration:** Browser-based.
- **Criteria notes:** Passes all 7. Multiple named studios. Game-specific.
- **Sources:** Agent web research confirmed studio citations.

### modl.ai (balance testing) — modl.ai
- **What:** AI bot playtesting for balance testing, difficulty verification. Cross-listed with QA.
- See QA section for full details.

## QA & Testing

### modl.ai — modl.ai
- **What:** AI playtesting bots. Automated regression, exploit detection, balance testing, crash detection. Simulates 10K+ hours across skill levels.
- **Pricing:** Custom (Starter/Pro/Enterprise). $8.4M Series A (Microsoft M12). [VERIFY: Starter tier pricing — criterion 7 depends on this]
- **Production citation:** Rare (Sea of Thieves — GDC case study on automated testing). Die Gute Fabrik (Saltsea Chronicles, published by Take-Two/Private Division).
- **Integration:** Unity + UE5 plugins.
- **Criteria notes:** Passes all 7 (pending pricing verification). Best fit for CH's 1-QA constraint.
- **Steam disclosure:** No — dev-side tool.
- **Sources:** [modl.ai](https://modl.ai/), [Sea of Thieves case study](https://modl.ai/automated-game-testing-lessons/)

## Narrative & Localisation

### Inworld AI — Inworld
- **What:** AI NPC dialogue engine. Personality, memory, goals, voice. Faction-aware character creation.
- **Pricing:** On-Demand: $25-50/M characters. 50%+ price cuts June 2026. $500M valuation.
- **Production citation:** NetEase (Cygnus Enterprises). Niantic (Wol).
- **Integration:** UE5 plugin, Unity plugin. REST API.
- **Criteria notes:** Passes all 7.
- **SAG-AFTRA:** TTS voice generation — verify compliance with Interactive Media Agreement [VERIFY].
- **Steam disclosure:** YES — Live-Generated. Must disclose.
- **Sources:** [Inworld pricing](https://inworld.ai/founder-pricing), [NetEase integration](https://inworld.ai/blog/netease-cygnus-enterprise-integrated-ai-npcs-inworld)

### Convai — Convai
- **What:** Conversational AI NPCs. Environmental awareness, memory, voice, lip-sync. Lore/document upload.
- **Pricing:** Free tier. Indie: $29/month. Professional: $99/month. Scale: $499/month.
- **Production citation:** No shipped commercial game [VERIFY]. NVIDIA marketing partnership (not production validation).
- **Integration:** UE5 plugin (Marketplace).
- **Criteria notes:** Passes 5/7. Criterion 5 (stability: 8-10s latency, broken long-term memory March 2026). Criterion 6 (no shipped game).
- **SAG-AFTRA:** Same voice compliance concern as Inworld [VERIFY].
- **Steam disclosure:** YES — Live-Generated.
- **Sources:** [Convai pricing](https://convai.com/pricing), [Convai latency review](https://scribehow.com/page/Convai_Review_2026)

### memoQ (Gaming Bundle) — memoQ
- **What:** Translation management with AI-assisted translation. Gaming Bundle: Gridly + Voiseed. 2025 Best MT CODiE Award.
- **Pricing:** Translator Pro: $30-44/month. Starter: $242/month (1 PM). Essential: $2,750/year (1-5 PM).
- **Production citation:** Gameloft (30% productivity boost). GAMEVIL/Com2uS. Epic.
- **Integration:** Terminology management for faction/lore consistency across languages.
- **Criteria notes:** Passes all 7. Note: CH won't need localisation until ~2027 (Year 2+ tool).
- **Steam disclosure:** No — dev-side, outputs human-reviewed.
- **Sources:** [memoQ Gaming](https://www.memoq.com/solutions/game-localization/), [Gameloft case](https://www.memoq.com/success-stories/gamevil/)

### Phrase TMS — Phrase
- **What:** Localisation platform with AI translation, translation memory, QA automation. "Phrase Strings" for game text.
- **Pricing:** From ~$525/month. Custom enterprise.
- **Production citation:** Bohemia Interactive (Arma/DayZ), GameHouse, Mixi.
- **Integration:** API. Repo-based workflow.
- **Criteria notes:** Passes all 7. Note: Year 2+ tool like memoQ.
- **Steam disclosure:** No — dev-side.
- **Sources:** [Phrase gaming](https://phrase.com/industries/gaming/)

---

# TIER 1 SUMMARY

**18 tools that pass the criteria (or pass 5-6/7 with honest flags):**

| # | Tool | Discipline | Clean pass? | Key gap |
|---|---|---|---|---|
| 1 | Aura | Engineering | 6/7 | Thin adoption (one VR indie, tool <6 months old) |
| 2 | Ultimate Engine CoPilot | Engineering | 6/7 | No named studio. LLM wrapper. |
| 3 | Substance 3D AI | Art | 6/7 | AI features new — no studio confirmed shipping with them |
| 4 | Meshy | Art | 6/7 | No AAA adoption. HIGH art team resistance |
| 5 | Cascadeur | Animation | 6/7 | Only vendor's own game. UE5 Live Link pending |
| 6 | Wwise Similar Sound Search | Audio | All 7 ✓ | Conditional on Wwise adoption |
| 7 | AIVA | Audio | 6/7 | 9-year-old obscure production citation |
| 8 | ElevenLabs SFX | Audio | 5/7 | Not game-specialist. No game studio citation |
| 9 | Machinations | Game Design | 6/7 | Simulation, not ML (borderline criterion 1) |
| 10 | Promethean AI | Game Design | 6/7 | Vague adoption evidence |
| 11 | Ludo.ai | Game Design | All 7 ✓ | — |
| 12 | modl.ai | QA + Game Design | All 7 ✓ | Pricing unknown (criterion 7 pending) |
| 13 | Inworld AI | Narrative | All 7 ✓ | SAG-AFTRA TTS compliance [VERIFY] |
| 14 | Convai | Narrative | 5/7 | Latency, stability, no shipped game |
| 15 | memoQ | Localisation | All 7 ✓ | Year 2+ tool |
| 16 | Phrase TMS | Localisation | All 7 ✓ | Year 2+ tool |
| 17 | TeamCity AI | DevOps | 6/7 | AI features may still be EA. Conditional on CI/CD choice |
| 18 | Atlassian Intelligence | Production | All 7 ✓ | ~$30K/year at 70 seats (Premium + Rovo) |

**6 tools pass all 7 criteria cleanly:** Wwise Sound Search, Ludo.ai, modl.ai, Inworld AI, memoQ, Phrase TMS, Atlassian Intelligence.

---

# TIER 2: General Business Tools with AI Features

Not part of the AI game development strategy. Useful tools CH should evaluate as business/ops decisions, not game-specific AI adoption.

| Tool | Category | Why it's Tier 2 |
|---|---|---|
| Granola | Meeting notes | Generic business tool, not game-specific |
| Greenhouse | ATS/Recruiting | Generic HR tool, not game-specific |
| Ravio | Comp benchmarking | Data product, not AI. Games dataset is the value, not ML |
| Luminance | Contract review | Generic legal AI, enterprise pricing for 1 lawyer |
| Spellbook | Contract drafting | Generic legal AI, better fit for small team than Luminance |
| Xero | Accounting | Accounting with one ML feature (auto-reconciliation) |
| Canva AI | Design | Generic design tool, not game-specific |
| Runway | Video/trailer | Adjacent industry (film), no game studio citation |
| GameAnalytics | Telemetry | Analytics platform with thin AI layer (LLM query). Core value is game-specific analytics, not AI |
| Easy Anti-Cheat | Anti-cheat | Standard UE5 technology, not an adoption decision |
| NVIDIA DLSS | Runtime upscaling | Standard UE5 plugin, not a pipeline adoption decision |
| Topaz Photo AI | Image upscaling | Generic photo tool, not game-specialist |

---

# TOOLS INVESTIGATED AND EXCLUDED

| Tool | Reason for exclusion |
|---|---|
| GitHub Copilot | Generic code completion. Poor UE5 macro support. Fails criterion 2. |
| Replica Studios | DEFUNCT — shut down 30 June 2025 |
| Clockwise | DEFUNCT — shut down April 2026 |
| Hathora | DEFUNCT — shut down May 2026 |
| Incredibuild | Distributed builds, not AI. Fails criterion 1 |
| Pulumi AI | IaC, wrong fit for no-CTO studio. Fails criteria 3, 4 |
| Applitools | Web/mobile visual regression, not game engines. Fails criteria 3, 4 |
| Tricentis | Enterprise SaaS testing, not game QA. Fails criteria 3, 7 |
| Functionize | Web/SaaS focus, no game engine support. Fails criterion 3 |
| Sprout Social | $299/user/month — overpriced for 2-person marketing team. Fails criterion 7 |
| Brandwatch | $800-5K+/month — enterprise pricing. Fails criterion 7 |
| Amplitude | $65K/year, no UE5 SDK, when GameAnalytics is free. Fails criteria 4, 7 |
| deltaDNA | Absorbed into Unity Gaming Services. Not relevant for UE5 |
| AccelByte | Hard exclusion per Glen |
| Stable Audio 3.0 | Stability AI vendor risk (severe financial distress). SaaS may not exist by 2028. Fails criterion 5 risk |
| Soundful | No confirmed game studio adoption. Fails criterion 6 |
| Discord AutoMod | Keyword filtering, not AI. Fails criterion 1 |
| Harvey AI | $288K/year minimum. Law firm tool. Fails criteria 3, 7 |
| BattlEye | Redundant with free EAC. Custom pricing barrier for secondary tool |
| FlightDeck | Virtual production focus, not game dev. UE5 5.3 only. Early beta |
| Pave | North American focus. Fails criterion 4 for UK/Greece |
| Float | Cash flow forecasting, not AI. Fails criterion 1 |
| Tempo Timesheets | Time tracking, not AI. Fails criterion 1 |
| Otter.ai | Excluded per Glen |
| ALL voice cloning tools | SAG-AFTRA/Equity prohibition |

---

# GAPS THE EXECUTING LLM SHOULD FILL

These are legitimate specialist AI tools that were identified but not verified in this round. The executing LLM should research and evaluate them:

1. **DeepMotion** — video-to-3D motion capture (Animate 3D). Legitimate animation AI tool.
2. **Move.ai** — markerless mocap from phone cameras. Used by Ninja Theory [VERIFY].
3. **Rokoko** — motion capture suits + video mocap + AI cleanup. Ubisoft/EA [VERIFY].
4. **RADiCAL** — AI motion capture from video.
5. **Houdini ML features** — SideFX has ML Deformer, terrain generation. CH uses Houdini — this is a gap.
6. **Wonder Studio** (Autodesk) — AI VFX/animation. Relevant for MMO cinematics.
7. **Charisma.ai** — interactive storytelling. Stronger production citations (BBC, Sky, Warner Bros) than Convai. Evaluate for quest system.
8. **Reactional Music** — adaptive music AI. No confirmed UE5 support. Evaluate if UE5 integration exists.
9. **Ludus AI** — UE5 AI toolkit. Zero verifiable adoption, unknown pricing. Evaluate during free trial only.

---

# DEAD COMPANIES CAUGHT (would have been wrong recommendations)

1. **Replica Studios** — shut down 30 June 2025
2. **Clockwise** — shut down April 2026
3. **Hathora** — shut down May 2026 (acquired by Fireworks AI)
4. **deltaDNA** — absorbed into Unity Gaming Services

# STEAM AI DISCLOSURE SUMMARY

| Category | Tools affected |
|---|---|
| **No disclosure** (dev-side) | modl.ai, GameDriver, Machinations, memoQ, Phrase TMS, Atlassian Intelligence, all Engineering/DevOps tools |
| **Pre-Generated** (if outputs ship) | Substance 3D AI textures, Meshy models, AIVA music, ElevenLabs SFX |
| **Live-Generated** (runtime) | Inworld AI NPCs, Convai NPCs |
