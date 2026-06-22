# HANDOFF v11: Deep Vetting Results + Unchecked Category Findings

**Date:** 2026-06-18
**Branch:** master
**Reason:** Context limit reached after deep vetting session.
**Model:** Claude Opus 4.6 [1M]

---

## What This Session Accomplished

Dispatched 6 research agents that spawned 100+ sub-agents doing deep due diligence on every tool in the brief plus searching 8 unchecked categories. Massive amount of verified research data returned. Key results:

### Critical HTML Corrections Needed

1. **Rodin/Hyper3D** — FIXED this session. Removed fabricated "ByteDance, Amazon, Unity as production users" claim. ByteDance is an investor. Actual verified users: Lowe's (NVIDIA case study), NetEase Eggy Party.

2. **Scenario pricing** — NEEDS FIX. HTML says "$20-200/mo". Actual verified: Free/Starter $15/Pro $45/Max $75/Enterprise $125+/user.

3. **Move.ai** — NEEDS UPDATE. Founded London 2019. $17.4M raised across 7 rounds. Co-founder Tino Millar RESIGNED as director Feb 2026 (Companies House filing). EA 4-year co-development for Genesis system confirmed. Just Dance 2023 (Ubisoft) is the only verified shipped game. App Store rating 3.0/5 with 28 ratings. No facial capture support. Pricing restructured: Move One $18-$490/seat/month.

4. **Sloyd** — NEEDS UPDATE. Founded 2021 Oslo. EUR 3M seed (a16z SPEEDRUN, Antler, Autodesk strategic investor). CTO ex-EA. ~10-13 employees. $15/mo Plus, $50/mo Pro. Zero named studio production evidence despite 300K+ signups.

### New Tools to Add (Verified from Research)

1. **Helpshift** (Player Support / Marketing & Community)
   - Gaming-native in-game SDK (Unity, UE5, iOS, Android, PC, console)
   - 4 AI agents: Care AI, Engage AI, Guard AI, Community AI
   - 500+ game studios: Supercell, Tencent, Zynga, EA, Sega, Ubisoft, Rovio, Krafton, Gameloft
   - Keywords Studios acquired for $75M. Installed in 1/3 of top-grossing gaming apps.
   - $150/mo starter, 250 issues, $0.45 overage. AI Copilot $50/agent/month.
   - Zendesk is NOT gaming-specific (verified: no in-game SDK, no gaming features).

2. **Notch** (Player Support)
   - $30M Series A (2026), $45M total. London. Gaming-specific AI agents.
   - Discord-native. Login issues, account recovery, payments, VIP escalation.
   - Worth profiling alongside Helpshift.

3. **Sett** (UA / Ad Creative — NEW CATEGORY)
   - $57M raised ($12M seed, $15M Series A Bessemer, $30M Series B Greenfield).
   - AI agents for UA creative pipeline: playable ads + video ads.
   - Customers: Zynga, Scopely, Playtika, SuperPlay, Rovio, Plarium. 100+ studios on waitlist.
   - 15x faster, 25x cheaper than manual. "Tens of millions" in revenue.
   - Tel Aviv. Strongest funded specialist in game UA creative AI.

4. **NVIDIA Kimodo** (Animation — text-to-animation)
   - Free Fab plugin for UE5 Sequencer.
   - Kinematic motion diffusion model trained on optical mocap data.
   - Text-to-animation: describe motion, get skeletal animation retargeted to your character.
   - Compatible with MetaHuman and standard UE skeletal rigs.
   - Self-hosted or Animotive Cloud.

5. **Tractive** (Art — AI retopology)
   - a16z Speedrun backed. Founder: Oxford VGG PhD in Computer Vision.
   - "World's first dedicated AI model for 3D retopology."
   - Collaborators: Rocksteady, Supercell, Jagex.
   - Pre-release/early access. Most credible ML retopology tool.

### Categories Where NO AI Tools Exist (Honest Findings)

These categories were thoroughly searched. The finding is that genuine AI tools do not exist in production:

1. **Performance Profiling** — NVIDIA Nsight, AMD RGP, RenderDoc, Superluminal, Optick are ALL traditional tools with zero AI/ML. No startup, no academic tool, no commercial product does ML-based performance diagnosis for games.

2. **Asset Optimisation/LOD** — InstaLOD and Simplygon are excellent but algorithmic (not AI). UE5 Nanite eliminates LOD for static geometry. No genuine ML LOD tool exists in production.

3. **Accessibility Testing** — No AI tool scans game builds for accessibility. EA Fonttik (text/contrast, not AI) is the closest. The market gap is significant. Patents exist (US 11,857,877) but no shipping product.

4. **AI Terrain Generation** — No production AI terrain tool. World Creator, Gaea, World Machine are procedural. InfiniteDiffusion (SIGGRAPH 2026) is the most promising research but not productised. Blackshark.ai reconstructs real-world terrain only.

5. **Shader/Material AI** — No standalone tool. UE 5.7 has experimental AI assistant. UE6 will have MCP-based Claude/Gemini integration (announced Unreal Fest 2026).

6. **AI Rigging** — UniRig (SIGGRAPH 2025, open-source, transformer-based) and Tractive (a16z, pre-release) are the only genuine ML tools. Production tools (AccuRIG, Mixamo) use heuristics.

### Tools That Should NOT Be in the Brief (Verified as Not AI)

- Zendesk (generic platform, not gaming-specific)
- GameBench (measurement tool, zero AI)
- Superluminal, Optick, RAD Telemetry (traditional profilers)
- RenderDoc (traditional debugger)
- InstaLOD, Simplygon (algorithmic, not ML)
- World Creator, Gaea, World Machine (procedural, not ML)
- 3D-Coat (no AI features)
- Quixel/Megascans (photogrammetry library, no AI)

### UA/Ad Creative — Potential New Discipline

The research uncovered a significant category not in the brief: AI tools for user acquisition and ad creative generation. For a studio approaching launch, this matters. Key players:

- **Sett** ($57M, game-specific, playable + video ad generation)
- **Moloco** ($226.8M raised, oCPM DSP, InnoGames case study: 85% CPI reduction)
- **Liftoff/Cortex** ($3.66B IPO June 2026, 2B predictions/second)
- **Bigabid** ($25M Series A, neural network DSP, Playtika/Zynga customers)
- **Craftsman+** (AI playable ad builder, Riot/Activision/Epic customers)

All are genuine AI products with real ML at their core. Whether to include them depends on whether the brief's scope extends to marketing/UA operations.

---

## Current State of the HTML

45 tool profiles across 16 disciplines. The following need correction based on deep vetting:

| Tool | Issue | Fix Needed |
|---|---|---|
| Rodin | Fabricated user claims | FIXED this session |
| Scenario | Pricing wrong ($20-200 → $15-75) | Update pricing fields |
| Move.ai | Company details incomplete, co-founder resigned | Update with verified data |
| Sloyd | Company details sparse | Update with verified founding, funding, employees |

Plus 5+ new tools to add from verified research.

---

## What the Next Session Must Do

1. Fix Scenario pricing in HTML ($15-75/mo verified)
2. Update Move.ai with verified data (London 2019, $17.4M, co-founder resignation)
3. Update Sloyd with verified data (Oslo 2021, EUR 3M, a16z/Autodesk)
4. Add Helpshift to Marketing & Community
5. Add NVIDIA Kimodo to Animation
6. Consider adding Sett (UA) and Tractive (Art/retopology)
7. Update discipline overviews for categories with no AI tools (Performance, LOD, Accessibility, Terrain, Shader) — these should be honest "no specialist AI tools exist" notes
8. Full QA pass
9. Update the markdown report if the HTML becomes the primary deliverable

---

## Files

| File | Status |
|---|---|
| `CH_AI_Tool_Strategy_v2.md` | Unchanged. Original report. |
| `CH_AI_Strategy_Brief.html` | 45 tools. Rodin fixed. Scenario/Move.ai/Sloyd need updates. 5+ tools to add. |
| `HANDOFF_v10.md` | Superseded by this file. |
