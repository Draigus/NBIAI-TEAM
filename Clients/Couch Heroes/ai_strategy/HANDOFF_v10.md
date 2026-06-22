# HANDOFF v10: HTML Brief — Comprehensive Tool Coverage + Vetting In Progress

**Date:** 2026-06-18
**Branch:** master
**Reason:** Context limit approaching. Deep vetting agents running in background.
**Model:** Claude Opus 4.6 [1M]

---

## Current State of the HTML Brief

`CH_AI_Strategy_Brief.html` now contains **45 tool profiles across 16 disciplines**:

| Discipline | Tools | Count |
|---|---|---|
| Animation | MetaHuman (ADOPT), Rokoko (PILOT), Cascadeur (PILOT), Move.ai (WATCH) | 4 |
| Art Pipeline | Firefly (PILOT), Substance 3D AI (PILOT), Midjourney (WATCH), Houdini ML (WATCH), Scenario (WATCH), Rodin (WATCH), Sloyd (WATCH), Tripo3D (WATCH), Meshy (WATCH), Promethean AI (WATCH) | 10 |
| Audio | Wwise (PILOT), ElevenLabs (PILOT), AIVA (WATCH), Soundraw (AVOID), Replica Studios (WATCH), Resemble AI (WATCH) | 6 |
| Cinematics & Video | Seedance 2.0 (WATCH), Autodesk Flow Studio (WATCH) | 2 |
| Engineering | Aura (PILOT), UE CoPilot (WATCH) | 2 |
| DevOps | TeamCity AI (WATCH) | 1 |
| Game Design | Machinations (PILOT), Ludo.ai (PILOT) | 2 |
| QA & Testing | modl.ai (PILOT), GameDriver (WATCH), ManaMind (WATCH) | 3 |
| Narrative & Localisation | Charisma.ai (WATCH), Inworld AI (WATCH), Convai (WATCH), NVIDIA ACE (WATCH), memoQ (WATCH), Phrase TMS (WATCH) | 6 |
| Production & PM | Claude for Teams (PILOT, with IP data classification tiers) | 1 |
| Marketing & Community | ToxMod (WATCH), GGWP (WATCH) | 2 |
| Data & Analytics | Sonamine (WATCH), Pecan AI (WATCH) | 2 |
| HR & People | HireVue (WATCH) | 1 |
| Finance & Legal | Harvey (WATCH), Luminance (WATCH) | 2 |
| Platform & Backend | Anybrain (WATCH) | 1 |

**Verdicts:** 1 ADOPT, 11 PILOT, 32 WATCH, 1 AVOID

**Budget:** Game AI tools ~$91K-$94K pre-launch. Including business AI (Claude for Teams) ~$108K-$115K.

---

## Vetting Status

### Tier 1: Fully Vetted (original report, 2,800 lines of analysis)
MetaHuman, Rokoko, Cascadeur, Firefly, Substance 3D AI, Wwise, ElevenLabs, Aura, UE CoPilot, TeamCity AI, Machinations, Ludo.ai, modl.ai, Charisma.ai, Inworld AI, Convai, memoQ, Phrase TMS, Midjourney, Houdini ML, Promethean AI, AIVA, Soundraw, iZotope (mentioned in overview), LANDR (mentioned in overview), Harvey, Luminance, Anybrain, Sonamine (estimated scores), HireVue (estimated scores), ToxMod, GGWP

### Tier 2: Surface-Level Research (1-2 web searches each, NEEDS DEEP VETTING)
- **Move.ai** — pricing ($2,100/yr Pro) confirmed; company details (founding, funding, employees) UNVERIFIED
- **Rodin (Hyper3D)** — 10B params, $30-120/mo confirmed; ByteDance/Amazon/Unity usage confirmed from one source; founding/funding UNVERIFIED
- **Sloyd** — parametric approach, $15/mo, Unity plugin confirmed; company details UNVERIFIED
- **Tripo3D** — $50M funding (Alibaba/Baidu), 6.5M users confirmed; Algorithm 3.1 claims from vendor only
- **Scenario.gg** — $1.8M funding, Ubisoft/InnoGames/Tripledot claims from vendor marketing; need independent verification
- **Replica Studios** — SAG-AFTRA agreement confirmed (SAG-AFTRA.org source); UE5/Unity plugins confirmed; pricing UNVERIFIED; UK Equity coverage UNVERIFIED
- **Resemble AI** — Chatterbox 350M params confirmed; Creative Assembly/Krafton usage confirmed from one source (GDC 2026 blog); Flex pricing $0.0005/sec confirmed; founding/funding UNVERIFIED
- **Seedance 2.0** — ByteDance, Feb 2026 launch, April 2026 API via fal confirmed; IP scanning feature confirmed from multiple sources; game studio usage is prototyping only
- **Autodesk Flow Studio** — Autodesk acquisition May 2024 confirmed; Wonder 3D Gen confirmed; free tier confirmed; M&E Collection inclusion confirmed
- **NVIDIA ACE** — open-source SDK confirmed; UE5 plugins confirmed; PUBG/Total War confirmed from NVIDIA blog; on-device inference confirmed
- **GameDriver** — ~9 employees confirmed; UE5 integration confirmed; MCP/Claude integration confirmed; GDC 2025 confirmed; no specific shipped game
- **ManaMind** — $1.5M pre-seed April 2026 confirmed from multiple sources (tech.eu, EU-Startups, TechFundingNews); London-based confirmed; no customers yet
- **Pecan AI** — AutoML churn prediction confirmed; data warehouse connectors confirmed; vendor-reported stats (12% churn reduction) flagged as vendor claims; pricing tiers exist but amounts unconfirmed
- **Claude for Teams** — $20-25/seat/month confirmed; Feb 2026 plugins confirmed; min 5 seats confirmed; Enterprise features confirmed

### Tier 3: Estimated Scores (not formally calculated using report methodology)
Move.ai, Rodin, Sloyd, Tripo3D, Scenario, Replica Studios, Resemble AI, Seedance 2.0, Flow Studio, NVIDIA ACE, GameDriver, ManaMind, Pecan AI, Claude for Teams, Sonamine, HireVue

All estimated scores should be recalculated using the 6-dimension weighted methodology from Section 1 of CH_AI_Tool_Strategy_v2.md once full data is available.

---

## Deep Vetting Agents (Dispatched, May Still Be Running)

Six agents were dispatched for deep research. Results need to be READ AND VERIFIED personally before updating the HTML:

1. **Move.ai** — agent spawned sub-agents but returned before completion. Needs re-run.
2. **Rodin/Hyper3D** — awaiting results
3. **Replica Studios** — awaiting results (especially UK Equity coverage)
4. **Resemble AI** — awaiting results (especially Creative Assembly/Krafton verification)
5. **Sloyd + Scenario.gg** — awaiting results
6. **Unchecked categories** — searching: player support, UA, accessibility, terrain, rigging, LOD, shader, profiling

---

## Categories NOT YET Searched

These tool categories have not been searched at all (except where noted):
- AI player support / customer service — **Helpshift AI VERIFIED**: gaming-native in-game SDK (Unity, UE5), 4 AI agents, confirmed customers Supercell/Tencent/Zynga/SYBO/Jam City/Halfbrick. $150/mo starter. Acquired by Keywords Studios for up to $75M. Should be added to brief under a new "Player Support" or "Marketing & Community" discipline.
- AI user acquisition / ad creative generation
- AI accessibility testing
- AI terrain / world generation (beyond Promethean AI)
- AI rigging and retopology specialists
- AI asset optimisation / LOD generation
- AI shader authoring (beyond Substance)
- AI performance profiling

---

## Verified Findings from Research Agents (this session)

### Helpshift AI — ADD TO BRIEF
- Gaming-native in-game SDK (Unity, UE5, iOS, Android, PC, console)
- 4 AI agents: Care AI (issue resolution), Engage AI (player insights), Guard AI (trust/safety), Community AI
- 500+ game studios. Named: Supercell, Tencent, Zynga, EA, Sega, Ubisoft, Rovio, Jam City, Krafton, Gameloft, Halfbrick, Kixeye
- Keywords Studios acquired Helpshift for up to $75M ($60M + $15M earnout). Keywords taken private by EQT for GBP 2.2B.
- Pricing: $150/mo starter (250 issues, $0.45 overage). AI Copilot add-on $50/agent/month. Growth/Enterprise custom.
- Installed in 1/3 of top-grossing gaming apps pre-acquisition
- Multilingual: 150+ languages via KantanAI integration
- Claims 70%+ autonomous resolution (vendor claim, not independently verified)
- Add to Marketing & Community discipline or create Player Support discipline
- Sources: helpshift.com, keywordsstudios.com, pocketgamer.biz, gamedeveloper.com

### Zendesk AI — DO NOT ADD
- Generic enterprise CX platform, not gaming-specific
- iGaming page targets gambling/betting compliance (KYC, responsible gambling), not game studios
- Gaming companies (Riot, Rovio, Nexon) use it but as generic support infrastructure
- No in-game SDK, no Discord/Steam integration, no gaming-native features
- Verdict: platform with AI bolted on, violates methodology

### Other Agent Results — Incomplete
- Move.ai, Rodin, Sloyd, Scenario, Replica, Resemble agents spawned sub-sub-agents but parent agents returned before results completed
- The sub-agent delegation pattern failed to produce usable factsheets for most tools
- Next session: research these tools directly (web search → read results → verify) rather than via agent chains

---

## What the Next Session Must Do

1. **Read all agent outputs** — personally verify every claim before updating the HTML
2. **Re-run Move.ai agent** — first one failed to return results
3. **Deep vet remaining tools** — Seedance, Tripo3D, NVIDIA ACE, GameDriver, ManaMind, Pecan, Claude for Teams
4. **Search unchecked categories** — add any significant tools found
5. **Recalculate estimated scores** — use the formal 6-dimension methodology
6. **Update the HTML** — replace surface-level data with verified facts, change "Undisclosed" fields to real data where found
7. **Flag unverifiable claims** — any claim that can't be confirmed from a current source gets "(unverified)" in the brief
8. **QA pass** — screenshot every tab, verify rendering

---

## Glen's Feedback This Session

Glen's core complaints (all valid):
1. **Content volume too low** — started with 25 tools, now 45. Original report had 32 scored; many weren't in the brief.
2. **Missing tools Glen knows about** — Seedance 2.0 (cinematics), Tripo3D (3D gen), Claude for business roles
3. **IP not considered** — initially recommended Claude for Teams without data classification. Glen corrected: cap table, employee PII, partner IP, game lore must never go through cloud AI.
4. **Surface-level research** — tools added with 1-2 web searches and estimated scores instead of proper due diligence
5. **Not comprehensive** — unchecked categories remain

---

## Critical Rules (unchanged)
1. No Copilot as a recommendation. Glen's hard exclusion.
2. AI tools only. Not generic platforms (except Claude for Teams as cross-cutting business AI with explicit data classification).
3. The brief evaluates TOOLS on their merits. No CH org commentary.
4. British English, no em dashes.
5. McKinsey quality bar — every claim sourced, every score justified.
6. Opus only for this work.
7. IP protection: three-tier data classification is CRITICAL for any cloud-based AI tool.
8. No fabricated analysis: sub-agent outputs are claims, not measurements. Verify personally.

---

## Files

| File | Status |
|------|--------|
| `CH_AI_Tool_Strategy_v2.md` | Editorial pass COMPLETE. Unchanged. |
| `CH_AI_Strategy_Brief.html` | 45 tools profiled. ~14 need deep vetting. Unchecked categories remain. |
| `HANDOFF_v9.md` | Superseded by this file. |
