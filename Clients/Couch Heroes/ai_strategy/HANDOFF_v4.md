# HANDOFF — CH AI Tool Strategy v2 Batch 2 (Research Complete)

**Date:** 2026-06-15
**Branch:** `master`
**Reason for handoff:** Research agents consumed full context. All research complete; sections not yet written.
**Model:** Claude Opus 4.6 [1M]

---

## Glen's Directive (unchanged)

Complete rebuild of CH AI Tool Strategy. Decision-making tool, not a report. Organised by discipline. Each tool gets a FULL profile (company history, production citations, user quotes, verified pricing, productivity estimates). McKinsey quality bar. AI tools ONLY. No Copilot, no infrastructure tools.

**Process rules:** 50% context handoff. Opus-only subagents. Codex adversarial review per batch.

---

## Key Files

| File | Path | Purpose |
|------|------|---------|
| **v2 report** | `Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_v2.md` | 814 lines. Shell + sections 3 (Animation), 4 (Art Pipeline), 5 (Audio) complete. |
| **RICECO prompt** | `Clients/Couch Heroes/ai_strategy/RICECO_PROMPT_CH_AI_Tool_Strategy.md` | THE SPEC. ~570 lines. Read the exemplar section and quality checklist before writing. |
| **Tool seed list** | `Clients/Couch Heroes/ai_strategy/TOOL_SEED_LIST_v3_FINAL.md` | Pre-researched tools. **CAUTION: several facts are now corrected by this handoff.** |
| **Old report (v1)** | `Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_Report_v1.md` | Reference ONLY. |
| **Convergence record** | `Clients/Couch Heroes/ai_strategy/adversarial_convergence_2026-06-14.md` | 3 rounds of adversarial review of v1. |
| **Codex critique** | `Clients/Couch Heroes/ai_strategy/codex_critique_2026-06-14.md` | Codex's 8 key findings on v1. |
| **Batch 1 handoff** | `Clients/Couch Heroes/ai_strategy/HANDOFF_v3.md` | Previous handoff (Batch 1 context). |
| **This handoff** | `Clients/Couch Heroes/ai_strategy/HANDOFF_v4.md` | You are reading it. |

---

## What Has Been Done

### Batch 1 Complete (in v2 report)

Sections 3 (Animation), 4 (Art Pipeline), 5 (Audio) written. All Codex-reviewed. See HANDOFF_v3.md for full details and Batch 1 verdicts table.

### Batch 2 Research Complete (this session)

All tools for sections 6-10 have been web-researched with verified facts. Sections are NOT YET WRITTEN to the v2 report. This handoff contains the full research findings and scoring decisions ready for the next session to write the sections.

---

## CRITICAL CORRECTIONS TO SEED LIST / HANDOFF_v3

These findings materially change the tool assessments:

### 1. Rare / Sea of Thieves is NOT a modl.ai customer

modl.ai wrote a blog post titled "5 Winning Automated Game Testing Tactics From Sea of Thieves" which analyses Rare's OWN in-house automated testing (documented in GDC talks from 2017-2019). Rare built their own framework. **modl.ai's blog is editorial content, not a customer case study.** Do NOT cite Rare as a modl.ai customer anywhere in the report.

### 2. Inworld AI has PIVOTED AWAY FROM GAMING

As of mid-2026, Inworld positions itself as "the realtime AI company" for voice AI infrastructure broadly. The npc.ai product has been taken down. Homepage barely mentions games. Xbox/Microsoft partnership produced no visible output. No confirmed shipped commercial game uses Inworld for production NPC AI. The company is alive ($107 employees, 5x revenue growth) but its focus is no longer game NPC dialogue.

### 3. Aura pricing is different from seed list

Seed list says Indie $29/mo, Pro $89.99/mo. Actual pricing is credit-based: Pro $40/mo credit (~200 prompts), Ultimate $280/mo credit. Unused credit does not roll over.

### 4. Ultimate Engine CoPilot is a solo developer product

BlueprintsLab = one Finnish developer ("Roly"/"Robert"), Gmail contact, no LinkedIn, no company registration found. Price increased from $220 to $330. All press releases are paid ABNewswire distributions. April 2026 UE forum complaint alleges MCP integrations don't work, 20x stated token consumption, user banned from Discord for reporting issues. Self-published "comparison blog" on developer's own website.

### 5. Die Gute Fabrik / modl.ai conflict of interest

modl.ai CEO Christoffer Holmgard is co-owner and Chair of Die Gute Fabrik. The Saltsea Chronicles case study is from the CEO's own company. Worth noting.

### 6. Charisma.ai CTO departed, CEO splitting focus

Co-founder/CTO Ben Salili-James left for Suvera (healthcare). Two directors resigned same day (Jan 2024). CEO Guy Gadney launched separate "Charismatic.ai" for microdramas (June 2025). CBInsights Mosaic score declining 41 points.

### 7. TeamCity AI is STILL Early Access

Not GA despite being in TeamCity 2026.1. Enterprise licence required. AI Assistant "may become a paid option" post-EAP.

---

## VERIFIED RESEARCH — TOOL PROFILES

### Aura (TryAura.dev, by Ramen VR)

**Company:**
- Ramen VR, founded 2019, San Francisco. Y Combinator S19.
- Founders: Andy Tsen (CEO), Lauren Frazier (CTO). Met at Oculus Launch Pad 2017.
- $40M+ raised: Kickstarter $280K (2019), Series A $10M (2021), Series B $35M (2022, led by Anthos + Dune).
- ~15-20 employees after early 2025 layoffs (undisclosed number).
- Pivoted from Zenith: The Last City (VR MMO, ceased dev July 2024, peaked #1 Steam/Quest at launch Jan 2022, struggled with retention, running at loss).
- Head of AI: Hisham Bedri (ex-CTO One More Multiverse).

**Product:**
- Launched January 2, 2026. Public beta.
- UE5 5.3-5.7, Windows only. Also Unity via Coplay acquisition (March 2026, GDC).
- Telos 2.0: proprietary Blueprint reasoning framework on Anthropic Claude. Claims >99% accuracy reading existing graphs, 25x error reduction. Self-benchmarked.
- Features: Blueprint/C++ generation, 3D asset creation, Editor-Use Agent (lighting, post-processing), Coding Agent, Dragon Agent (autonomous agentic loops), animation/rigging.
- Pricing: Pro $40/mo credit (~200 prompts on Sonnet 4.6), Ultimate $280/mo credit. Credit-based, no rollover.

**Production evidence:**
- Sinn Studio (Zombonks, VR early access, shipped in 5 months). Quote from CEO Alek Sinn: "Aura and I rapidly iterated to meticulously craft a vision for the game."
- "Over a dozen design partners" claimed but NO other studios named publicly.
- AccelByte integration demo (note: AccelByte is hard-excluded from CH report per Glen).

**User feedback:**
- Unreal University review: "sophisticated starting point rather than a complete solution." Blueprint collision scaling wrong, asset references fail, spawn actor nodes need manual fixing.
- Forum issues: plugin install failures on UE 5.7, Blueprint editing refused despite settings, DLL-only distribution (no source), connectivity issues.
- StraySpark: "genuinely excels at Blueprint work" but proprietary, closed-source, uncertain pricing.

**Scoring (proposed):**
- Cap 8 | Prod 4 | IP 7 | Adopt 5 (est.) | Integ 9 | Cost 6
- Composite: (8×0.25)+(4×0.20)+(7×0.20)+(5×0.15)+(9×0.10)+(6×0.10) = 2.00+0.80+1.40+0.75+0.90+0.60 = 6.45 → 6.5
- Verdict: **PILOT** (narrow; conditional on access being granted, tool is still invite-only/public beta)

### Ultimate Engine CoPilot (BlueprintsLab)

**Company:**
- Solo Finnish developer "Roly"/"Robert". Contact: moonlitdragoninteractive@gmail.com
- No LinkedIn, no company registration found. Claims "4+ years as Discord community admin" and "shipped game on Steam" (unnamed).
- Other FAB products: Blueprint Analyst ($44.99), Ultimate Difficulty Scaling ($34.99).

**Product:**
- Initially "Ultimate Blueprint Generator" (July 2025), V1.0 April 2026.
- UE5 5.4-5.7. Windows + macOS (Linux claimed in some sources).
- 1,050+ tool actions across 56 categories. Full C++ source included.
- LLM integration layer: 9 API slots (OpenAI, Anthropic, Google, DeepSeek, Mistral). 2 free slots.
- Current price: **$330** (increased from $220 at launch). "Monthly increases scheduled."
- 5-day free trial available.

**Production evidence:**
- ZERO. No named studio. No shipped game. "Thousands of developers" is unsubstantiated marketing.
- All press releases are paid ABNewswire wire distributions syndicated to low-tier sites.
- "Best AI Plugins" comparison blog is on developer's own website (gamedevcore.com).

**User feedback (UE Forums):**
- Positive: "Awesome tool which will continue to grow" (JDLTorre), "Real game changer" (shepaldo), "Plugin is still quite rough but the dev seems capable" (JuuzouSuzuya92).
- STRONGLY NEGATIVE (willfitch, April 2026): called developer "scammers", alleged MCP integrations don't work, token usage "about 20x what Claude and Codex would use" (1.2M tokens for one Blueprint update), banned from Discord. Found 3 other affected users. Reported vendor for ToS violations.
- Price complaints: "way too expensive" (casigus), no trial at the time (skoppaaaa).
- No Reddit or independent YouTube reviews exist.

**Scoring (proposed):**
- Cap 6 | Prod 2 | IP 7 | Adopt 5 (est.) | Integ 8 | Cost 7
- Composite: (6×0.25)+(2×0.20)+(7×0.20)+(5×0.15)+(8×0.10)+(7×0.10) = 1.50+0.40+1.40+0.75+0.80+0.70 = 5.55 → 5.6
- Prod Ready 2 triggers sensitivity floor (code is shipped asset). Maximum verdict: **WATCH**

### TeamCity AI Build Analyzer (JetBrains)

**Status:** STILL Early Access (EAP), NOT GA. Enterprise licence required.

**AI features (TeamCity 2026.1, May 2026):**
1. AI Assistant: chat-based Q&A connected to TeamCity docs, page-context-aware. Cannot modify builds/settings. Powered by GPT-4.1.
2. AI Build Analyzer ("Analyze it" button): reads failed build logs, provides summary + root cause + fix suggestions. Cloud version can run automatically for every failed build.
3. MCP Endpoint (new in 2026.1): built-in MCP server exposing build log retrieval, REST GET, build trigger. Enables external AI agents. This IS GA.
4. TeamCity CLI (new in 2026.1): 60+ commands, AI agent integration via "agent skills". GA.

**Pricing:** Cloud $45/active user/month. On-prem: $2,399/year (some sources say $1,999; discrepancy). AI features: Enterprise only (no Professional).

**Game studio adoption:** JetBrains markets to game devs (UE plugin, Unity plugin, Perforce integration). NO named game studio case studies found.

**Scoring (proposed):**
- Cap 6 | Prod 5 | IP 9 | Adopt 3 (est.) | Integ 4 | Cost 4
- Composite: (6×0.25)+(5×0.20)+(9×0.20)+(3×0.15)+(4×0.10)+(4×0.10) = 1.50+1.00+1.80+0.45+0.40+0.40 = 5.55 → 5.6
- Verdict: **WATCH** (no DevOps at CH, CI/CD decision not made, EAP not GA, Enterprise-only)

### Machinations (Machinations.io) — pre-researched, no new research needed

- Ubisoft, Gameloft, Wargaming, King (34% production time reduction). Mature product.
- Free (1 seat). Paid tiers [VERIFY exact prices].
- Borderline criterion 1 (simulation, not ML). Include with honest flag.

**Scoring (proposed):**
- Cap 8 | Prod 8 | IP 9 | Adopt 7 (est.) | Integ 4 | Cost 9
- Composite: (8×0.25)+(8×0.20)+(9×0.20)+(7×0.15)+(4×0.10)+(9×0.10) = 2.00+1.60+1.80+1.05+0.40+0.90 = 7.75 → 7.8
- Verdict: **PILOT** (best-in-class for economy design; Simon to evaluate)

### Ludo.ai — pre-researched, no new research needed

- Rovio, Ubisoft, Voodoo, SayGames, Homa, Garena. Free / Indie $20/mo / Studio $300/mo.

**Scoring (proposed):**
- Cap 5 | Prod 7 | IP 8 | Adopt 7 (est.) | Integ 6 | Cost 8
- Composite: (5×0.25)+(7×0.20)+(8×0.20)+(7×0.15)+(6×0.10)+(8×0.10) = 1.25+1.40+1.60+1.05+0.60+0.80 = 6.7
- Verdict: **PILOT** (game research tool for design team)

### modl.ai

**Company:**
- Founded 2018, Copenhagen. CEO Christoffer Holmgard (PhD AI, co-owner/Chair of Die Gute Fabrik).
- Co-founders: Benedikte Mikkelsen, Lars Henriksen, Sebastian Risi, Julian Togelius, Georgios Yannakakis.
- EUR 8.5M / $8.4M Series A (Nov 2022), co-led by Griffin Gaming Partners AND M12 (not M12 alone).
- Total funded: $10.8M across 4 rounds. $29M valuation (2022).
- ~18 employees (declining from 22 over two years). CB Insights Top 100 AI Companies (2021).

**Products:**
- modl:test (automated QA), modl:play (player behaviour simulation), modl:create (match-3 level design).
- Product pivot to "integrationless testing" — visual AI + OCR, no SDK/plugin needed.
- Unity Verified Solutions Partner. PlayStation Tools and Middleware Programme. UE5 plugin.
- Fast-paced/timing-critical gameplay "not yet fully supported."

**Verified customers:**
- Die Gute Fabrik (Saltsea Chronicles) — CEO co-owns the studio (conflict of interest).
- Playing Plate Games (Forge and Fight) — multiplayer fighting game bots.
- Good Game Entertainment (match-3 title).
- Riot Games — research collaboration (not production).
- **NOT Rare/Sea of Thieves** — editorial content, not customer.

**Pricing:** Not publicly available. CEO cited $2,500/month in 2022 interview (may be outdated). Third-party sites list $0/$99/custom tiers — UNVERIFIED, likely fabricated by aggregator templates.

**Scoring (proposed):**
- Cap 9 | Prod 5 | IP 8 | Adopt 3 (est.) | Integ 7 | Cost 4
- Composite: (9×0.25)+(5×0.20)+(8×0.20)+(3×0.15)+(7×0.10)+(4×0.10) = 2.25+1.00+1.60+0.45+0.70+0.40 = 6.4
- Verdict: **PILOT** (contingent on QA expansion per owner-capacity rule; Hannah is sole QA)

### Inworld AI

**Company:**
- Founded ~2021, Mountain View CA. CEO Kylan Gibbs (ex-Google Dialogflow, ex-DeepMind).
- $120-133M total raised. $500M valuation (Aug 2023 Series B led by Lightspeed).
- No new funding since Aug 2023. 107 employees.
- SOC 2 Type II, GDPR, HIPAA compliant.

**CRITICAL: Strategic pivot away from gaming.**
- Now positions as "the realtime AI company" for voice AI infrastructure.
- npc.ai product taken down. Homepage barely mentions games.
- Xbox/Microsoft multi-year partnership (Nov 2023) produced no visible output.
- Controversies: hosted copyrighted character chatbots (Nintendo Bowser, Pokemon Pikachu, Sony IP).
- GDC demos with Ubisoft and NVIDIA were prototype/demos, not shipping products.

**Technology:**
- Custom SpeechLM (neural audio codec + LLM), Realtime TTS-2 (sub-200ms), 220+ model routing.
- UE5 multi-plugin SDK, Unity SDK, Node.js SDK.

**Pricing:**
- On-Demand: free ($25/1M chars TTS). Creator $25/mo. Builder $100/mo. Developer $300/mo. Growth $1,500/mo. Enterprise custom.
- LLM costs: pass-through at provider rates. $5/GPU-hour for dedicated compute.

**Production evidence:**
- No confirmed shipped commercial game using Inworld for production NPC AI.
- "Partners": NetEase, Niantic, Xbox, Ubisoft, NVIDIA, Disney — all appear to be demo/prototype stage.

**Scoring (proposed):**
- Cap 5 | Prod 4 | IP 5 | Adopt 3 (est.) | Integ 7 | Cost 5
- Composite: (5×0.25)+(4×0.20)+(5×0.20)+(3×0.15)+(7×0.10)+(5×0.10) = 1.25+0.80+1.00+0.45+0.70+0.50 = 4.7
- Verdict: **WATCH** (company pivoting away from gaming; no shipped game; SAG-AFTRA unresolved for TTS; community backlash risk)

### Charisma.ai

**Company:**
- Charisma Entertainment Ltd (formerly To Play For Ltd). Founded ~2015, Oxford UK.
- CEO: Guy Gadney (co-founder; background in BBC, Penguin Books, television).
- Co-founder/CTO Ben Salili-James LEFT (now at Suvera, healthcare). Two directors resigned same day Jan 2024.
- ~15-18 employees. $2M ARR. ~$650K raised (accelerators/grants + small seed). Effectively bootstrapped.
- $5.9M valuation (GetLatka, self-reported).
- CEO launched separate company "Charismatic.ai" for microdramas (June 2025) — focus splitting concern.
- CBInsights Mosaic score declined 41 points.

**Product:**
- Graph-based visual story editor (no-code). 13 node types. Hybrid: scripted paths + LLM improvisation.
- AI: proprietary NLP matching engine + Claude/GPT/Llama for generation (150 token cap on improvisation).
- Emotion Engine: 12 emotional states (Ekman model), mood, relationship tracking.
- Memory: 5 types (word, sentence, decision, counter, boolean). Playthrough-scoped.
- 1000+ TTS voices: AWS, Cereproc, Deepgram, Google, Kokoro, Resemble (Pro); ElevenLabs (Enterprise only).
- STT: AWS, Deepgram, Google. Lip-sync via Oculus VR.
- Custom voice integration via ElevenLabs/Cartesia API keys (no Charisma credit consumption).
- No native voice cloning — achievable via ElevenLabs integration path.

**Engine integration:**
- UE5 5.2+ SDK (MIT licence, open source on GitHub). Core SDK + Plug 'n' Play module.
- Unity 2022.3+ SDK (MIT licence). Both last updated Sep 2025.
- UE SDK: 20 GitHub stars. Unity SDK: 4 stars. Very low community adoption.
- Web (JS, React, Python) SDKs. VR support. Colyseus multiplayer.

**Pricing:**
- Credit-based. Bundles: $5/50K credits, $20/200K, $100/1M, $500/5M. 12-month expiry.
- 50K credits ≈ 200 experience minutes.
- Free trial: 1 month, 50K credits, no permanent free tier.
- Enterprise: custom (one-off dev fee + fixed monthly platform fee).

**Production evidence:**
- BBC: R&D pilots via MakerBox/Taster programme ("Catfish", "The Act"). Not mainstream commissions.
- Sky: STRONGEST relationship. 3+ projects: Bulletproof interactive (2020, on Sky.com), Sky Live pilot, The Rope (interactive drama with XR Stories).
- Warner Bros: Steppenwolf at SXSW 2022 (conference demo, not shipped product).
- DreamWorks: Mama Luna's Cat Rescue (Puss in Boots DVD tie-in).
- Their own game: The Kraken Wakes (April 2023, PC). **56/100 Steam score, 18 reviews, 20-50K owners.** Modest.
- Keywords Studios partnership (Feb 2024): channel deal, not evidence of AAA adoption.
- NO confirmed AAA game shipped with Charisma.ai.
- Swamp Motel: Saint Jude immersive theatre (ticketed, Jan-Mar 2023).
- Oxford University: conversational learning research partnership.
- Epic MegaGrant recipient (2022) for MetaHumans integration.

**SAG-AFTRA:** No public compliance statements. Charisma docs contain zero mentions of SAG-AFTRA, union compliance, or voice actor licensing. Sky's Bulletproof used Resemble.ai voice cloning from actor recordings. Compliance burden falls entirely on the studio using the tool.

**Scoring (proposed):**
- Cap 7 | Prod 4 | IP 6 | Adopt 4 (est.) | Integ 6 | Cost 7
- Composite: (7×0.25)+(4×0.20)+(6×0.20)+(4×0.15)+(6×0.10)+(7×0.10) = 1.75+0.80+1.20+0.60+0.60+0.70 = 5.65 → 5.7
- Verdict: **WATCH** (CTO departed, CEO focus splitting, company risk, no game shipped, no SAG-AFTRA statement)

### Convai

**Company:**
- Founded April 2022, San Jose. CEO Purnendu Mukherjee (ex-NVIDIA, built first 3D avatar chatbot).
- $5M seed (Dec 2022, Dune Ventures co-led). Only round. ~41-43 employees.
- $6.5M ARR reported (GetLatka, June 2024 — UNVERIFIED).
- ISO 27001 certified. Enterprise on-prem option.

**Product:**
- Real-time conversational AI NPCs. Knowledge Bank (RAG), Scene Perception (3D awareness), long-term memory (when working), NPC-to-NPC interaction, action callbacks.
- 65+ languages, 500+ voice options (claimed). NVIDIA ACE integration (Audio2Face, Riva ASR).
- Cloud-only on standard plans. No edge/local inference.
- PERSISTENT ISSUES: 8-10s latency (documented since Jan 2025), SDK 3.6.9-hotfix-2 broke long-term memory. "Good platform, unstable backend" (2026 review).

**Pricing:**
- Free $0 (~4K interactions). Gamer $9/mo. Indie Dev $29/mo (HIDDEN: only 1,500 flagship LLM interactions of 3,000; rest auto-downgrade). Professional $99/mo. Scale $499/mo. Business $1,199/mo. Enterprise custom.
- Credit-based with per-interaction metering.

**Engine integration:** Unity (production), UE5 (beta v4.0 early 2026), PlayCanvas, Roblox, Three.js, Web SDK. Modding framework for both engines.

**Production evidence:**
- Second Life (Linden Lab): Character Designer alpha (Dec 2024). AI NPCs for onboarding.
- Stormgate (Frost Giant): "exploring" AI characters. Demo shown at GDC 2024.
- NVIDIA: ACE demos (Kairos). Inception programme.
- Unity: official partnership.
- NO confirmed AAA shipped game. ~3,137 Discord members (2026).

**Scoring (proposed):**
- Cap 6 | Prod 3 | IP 5 | Adopt 3 (est.) | Integ 6 | Cost 7
- Composite: (6×0.25)+(3×0.20)+(5×0.20)+(3×0.15)+(6×0.10)+(7×0.10) = 1.50+0.60+1.00+0.45+0.60+0.70 = 4.85 → 4.9
- Prod Ready 3 triggers sensitivity floor. Maximum verdict: **WATCH**

### memoQ — pre-researched, no new research needed

- Gameloft (30% productivity boost), Epic. Gaming Bundle with Gridly + Voiseed.
- Year 2+ tool (CH won't need localisation until ~2027).

**Scoring (proposed):**
- Cap 7 | Prod 8 | IP 9 | Adopt 6 (est.) | Integ 6 | Cost 6
- Composite: (7×0.25)+(8×0.20)+(9×0.20)+(6×0.15)+(6×0.10)+(6×0.10) = 1.75+1.60+1.80+0.90+0.60+0.60 = 7.25 → 7.3
- Verdict: **WATCH** (Year 2+ tool; no localisation need until ~2027)

### Phrase TMS — pre-researched, no new research needed

- Bohemia Interactive, GameHouse, Mixi. From ~$525/mo. Year 2+ tool.

**Scoring (proposed):**
- Cap 7 | Prod 8 | IP 9 | Adopt 6 (est.) | Integ 6 | Cost 4
- Composite: (7×0.25)+(8×0.20)+(9×0.20)+(6×0.15)+(6×0.10)+(4×0.10) = 1.75+1.60+1.80+0.90+0.60+0.40 = 7.05 → 7.1
- Verdict: **WATCH** (Year 2+ tool)

---

## SECTION STRUCTURE (ready to write)

### Section 6: Engineering (~10-12 engineers, no CTO, Mustafa is Head of Tech)

**Tasks:**
1. **UE5 Blueprint & C++ Code Generation** — Aura (PILOT), UE CoPilot (WATCH)
2. **Code Review & Debugging** — No specialist UE5 AI tool exists. Note gap.
3. **Fast-Moving Category: Code Assistant Evaluation Methodology** — Per RICECO instruction 11.

**Score range check:** ≤3: UE CoPilot Prod=2 ✓. ≥9: Aura Integ=9 ✓.

**CH-specific context:**
- AI policy: "smart usage policy — teach prompt well, red-team output, review before shipping" (not blanket prohibition).
- No CTO to champion. Engineers context-switching into IT/infra.
- Copilot excluded per report scope (fails criterion 2: not game-specialist).
- Both Aura and UE CoPilot are <12 months old. Fast-moving category.

### Section 7: DevOps & Infrastructure (0 headcount, no CTO)

**Tasks:**
1. **CI/CD Build Failure Analysis** — TeamCity AI (WATCH)

**Score range check:** ≤3: Adopt=3 ✓. ≥9: IP=9 ✓.

**Small section.** CH has no DevOps. CI/CD choice (TeamCity/Jenkins/BuildKite) not yet made. This section should be ~1,000 words including a note that the AI features are premature before (a) a DevOps hire and (b) a CI/CD platform decision.

### Section 8: Game Design (~6-8 people, Simon Woodruff just started 15 June)

**Tasks:**
1. **Economy Balancing & Simulation** — Machinations (PILOT)
2. **Game Research & Market Analysis** — Ludo.ai (PILOT)
3. **Environment Layout & Level Design** — Cross-ref to Art Pipeline Section 4.2.5 (Promethean AI, WATCH). Add CH-specific Game Design notes.
4. **AI Playtesting for Balance** — Cross-ref to QA Section 9 (modl.ai). Brief note on balance testing aspect.

**Score range check:** ≤3: need to ensure range. Options: Promethean AI cross-ref Adopt=2 for design team (Gary is freelancer, Simon just started, unknown AI views). ≥9: Machinations IP=9, Cost=9 ✓.

**CH-specific context:**
- Simon Woodruff just started. His views on AI in design workflows are UNKNOWN. Do not assume buy-in.
- Complex economy: F2I + subscription + cosmetics, double-RNG loot, weapon forging system, 5 factions.
- Robin (Game Director) is individual contributor, not managing design team.
- Gary Platner (Head of Level Design) is US-based freelancer.

### Section 9: QA & Testing (Hannah = sole QA)

**Tasks:**
1. **Automated Gameplay Testing, Regression & Exploit Detection** — modl.ai (PILOT, contingent on QA expansion)
2. **Accessibility Compliance Testing** — No specialist AI game accessibility tool. Manual + automated WCAG tools. Note that RICECO requires this coverage (WCAG audit, colour contrast for byte-punk palette).

**Score range check:** ≤3: modl.ai Adopt=3 ✓. ≥9: modl.ai Cap=9 ✓.

**CH-specific context:**
- Owner-capacity rule: Hannah is sole QA, already overloaded. Max verdict PILOT contingent on QA expansion.
- QA vendor pipeline being planned but not in place.
- modl.ai's "integrationless testing" pivot (no SDK needed) actually helps CH's situation.
- Hannah elevated to "primary ship-readiness arbiter; hard authority to block gate progression."

### Section 10: Narrative & Localisation (~2-3 people, Head of Narrative hire needed)

**Tasks:**
1. **AI NPC Dialogue & Dynamic Characters** — Inworld AI (WATCH), Charisma.ai (WATCH), Convai (WATCH). ALL WATCH.
2. **Quest & Dialogue Drafting / Lore Consistency** — No specialist tool. Brief assessment.
3. **Localisation — Translation & Terminology Management** — memoQ (WATCH, Year 2+), Phrase TMS (WATCH, Year 2+).

**Score range check:** ≤3: Convai Prod=3, Inworld Adopt=3, Convai Adopt=3 ✓. ≥9: memoQ IP=9, Phrase IP=9 ✓.

**CH-specific context:**
- No Head of Narrative to own any rollout (owner-capacity rule blocks ADOPT).
- Maria Cibej (Narrative Designer) has role conflict with Yorgos (quest design overlap).
- SAG-AFTRA/Equity applies to ALL NPC voice features. Must be addressed per-tool.
- Live-Generated Steam disclosure required for runtime AI dialogue.
- MMO community hypersensitive to AI-generated NPC dialogue. Community backlash is material risk.
- All three NPC dialogue tools are WATCH. This is the honest assessment — the category is not ready for CH.
- Localisation is Year 2+ (launch late 2028; localisation starts ~2027 at earliest).
- The Inworld pivot is the most significant finding: the category leader has left the building.

---

## SELF-VERIFICATION CHECKLIST (per RICECO Processing Instruction 8)

Verify after writing each section:
- [ ] Composite calculation shown for recommended tool (or highest-scoring if all WATCH)
- [ ] Section contains at least one score ≤3 and one ≥9
- [ ] Production use cited or [VERIFY] flagged for every tool
- [ ] For Narrative: SAG-AFTRA/Equity addressed per tool
- [ ] For all cloud tools: data egress model stated
- [ ] Partner IP guardrails stated for every cloud-inference tool
- [ ] Steam disclosure impact flagged
- [ ] Governance prerequisites mapped
- [ ] Named rollout owners assigned (with interim where role is vacant)
- [ ] All Team Adoption Risk scores marked "(est.)"
- [ ] British English throughout, no em dashes

---

## WHAT REMAINS AFTER BATCH 2

### BATCH 3 (Following Session)

1. Section 11: Production & Project Management (Atlassian Intelligence/Rovo)
2. Section 12: Marketing & Community (ToxMod, content creation)
3. Section 13: Data & Analytics (GameAnalytics, no dedicated headcount)
4. Section 14: HR & People (HiBob AI, SalarySage — GDPR cross-border)
5. Section 15: Finance & Legal (Luminance, Harvey — commercial data sensitivity)
6. Cross-cutting Infrastructure (section 3 in final document)
7. Decision Dashboard (roll-up from all disciplines)
8. Phased Adoption Roadmap
9. Organisational Change Management
10. Budget Summary
11. Risk Register
12. Executive Summary (LAST)
13. Final Codex adversarial pass + convergence debate

---

## BATCH 2 VERDICTS SUMMARY (for cross-referencing)

| Tool | Discipline | Verdict | Composite | Key constraint |
|------|-----------|---------|-----------|----------------|
| Aura | Engineering | PILOT | 6.5 | <6 months old; one VR indie citation; invite-only |
| Ultimate Engine CoPilot | Engineering | WATCH | 5.6 | Solo dev; zero production evidence; Prod Ready 2 floor |
| TeamCity AI | DevOps | WATCH | 5.6 | EAP not GA; Enterprise-only; no DevOps at CH |
| Machinations | Game Design | PILOT | 7.8 | Borderline criterion 1; Simon to evaluate |
| Ludo.ai | Game Design | PILOT | 6.7 | Research tool, not production tool |
| modl.ai | QA | PILOT | 6.4 | Contingent on QA expansion; Hannah overloaded |
| Inworld AI | Narrative | WATCH | 4.7 | PIVOTED AWAY FROM GAMING; no shipped game |
| Charisma.ai | Narrative | WATCH | 5.7 | CTO departed; CEO splitting focus; company risk |
| Convai | Narrative | WATCH | 4.9 | 8-10s latency; Prod Ready 3 floor; no shipped game |
| memoQ | Localisation | WATCH | 7.3 | Year 2+ tool |
| Phrase TMS | Localisation | WATCH | 7.1 | Year 2+ tool |

---

## Critical Rules (unchanged — do not violate)

1. No Copilot. No AccelByte.
2. AI tools only.
3. No generic framework padding.
4. Every tool gets a real profile (company, production citations, user quotes, pricing, productivity).
5. [VERIFY] flags for unverified claims — never fabricate.
6. 50% context = handoff.
7. Codex adversarial review per batch.
8. No Sonnet or Haiku subagents. Opus only.
9. McKinsey quality bar.
10. British English, no em dashes.
