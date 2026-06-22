# AI Tools Audit Handoff — 2026-06-18

## What Was Done
1. Updated Lead Narrative Designer JD with AI tooling (3 new nice-to-haves, expanded Systems section)
2. Ran deep-research workflow (112 agents, adversarial verification) — 8 high-confidence findings
3. Ran 7 parallel research streams across all disciplines — 100+ agents total
4. Comprehensive primary-source research on 80+ tools across 13 disciplines

## Key Deliverables
- `Clients/Couch Heroes/Job Descriptions/Lead_Narrative_Designer_JD.docx` — updated
- `Clients/Couch Heroes/AI_Tools_Audit_2026.md` — v1 draft, NEEDS REWRITE with full research

## What Needs Doing Next
1. **PRIORITY: Rewrite AI_Tools_Audit_2026.md** incorporating all verified research from agent outputs
2. The agent output files contain detailed verified reports on every tool — compile into final document
3. Agent outputs at: `C:\Users\gpbea\AppData\Local\Temp\claude\d--OneDrive-Claude-code-NBIAI-TEAM\2e09d87c-c1e9-41ff-a0a0-d4c789f4d942\tasks\`
4. Some areas still need follow-up research (music gen beyond Suno, audio middleware AI features, some animation tools)

## Verified Tools by Discipline (summary)

### Voice/TTS
ElevenLabs (Epic/Fortnite, Paradox), Respeecher (God of War, Cyberpunk 2077), Resemble AI (MIT Chatterbox, self-hostable), Altered AI (The Ascent, 40 NPCs from 1 actor), NVIDIA ACE TTS (Chatterbox bundled). Sonantic DEAD (Spotify acquired). Replica Studios DEAD (shut down June 2025).

### Music
Suno ($5.4B valuation, $300M revenue, stem separation for FMOD/Wwise, no game credits, Sony litigation pending July 2026). Rate-limited: AIVA, Udio, Soundraw, Stable Audio, Mubert.

### NPC AI/Dialogue
NVIDIA ACE (10+ games: PUBG, Total War, inZOI. On-device strategy. MMO-scale is a gap). Inworld AI (pivoting to general voice AI). Charisma.ai, Convai, Spirit AI.

### Image Gen
Midjourney V8.1 ($500M rev, no API, Pro required for >$1M studios, no indemnification). Adobe Firefly (IP indemnification, trained on licensed data). Scenario (Ubisoft, Scopely). Leonardo.AI (game-focused fine-tuning). ComfyUI (Ubisoft CHORD, Series Entertainment 100K+ assets).

### 3D Generation
Meshy ($30M ARR, Nexon/Supercell/Square Enix, auto-rigging+500 animations, UE/Unity plugins). Tripo ($200M raised, P1.0 at GDC 2026). Rodin/Hyper3D (NetEase Eggy Party, 4K PBR). Stability AI SF3D/SPAR3D (EA partnership). CSM (acquired by Google). Sloyd (game-ready topology by default). Kaedim (EA, Rebellion). Layer AI (Zynga, King, Unity Verified).

### Texturing
Substance 3D (Warp to Geometry, industry standard). RTX Remix (free, open-source PBR conversion). WithPoly, Polycam (free). Topaz Labs (Art & CG model, NeuroStream, enterprise API).

### Character Gen
MetaHuman (Epic, free with UE, Meshcapade acquired Feb 2026). Reallusion CC5 + Headshot 3 ($149 perpetual). Ready Player Me DEAD (Netflix acquired Dec 2025).

### Animation/Mocap
MotionMaker (Maya 2026.1, 80% quality, previs). Cascadeur (physics-based, perpetual after 12mo). Motorica (Platinum Games, Inflexion, licensed mocap chain-of-title). Move.ai (Ubisoft, SEGA, Sony). Rokoko (EA, Square Enix, Zynga). DeepMotion (Bandai Namco). Autodesk Flow Studio (GDC 2026). Reallusion iClone 8 ($599 perpetual). Meshcapade (acquired by Epic, going into MetaHuman).

### Level Design/World
Promethean AI (PlayStation Studios, 10K+ users). Kythera AI (Star Citizen, UE World Partition). World Machine (no AI, procedural, VDM terrain new). UE5 PCG Framework.

### QA/Testing
modl:test (Riot Games, Die Gute Fabrik, Unity Verified). BugSplat (Relic, id, EA, SEGA, no AI). Sentry Seer (94.5% root cause, 53.6% auto-fix, MCP integration).

### Anti-Cheat
Easy Anti-Cheat (free for UE), BattlEye, Riot Vanguard (kernel-level, detailed architecture).

### Moderation
Hive (multi-modal, DoD contract, no named AAA studios). CommunitySift SUNSETTING (was Xbox, EA, Supercell). Spectrum Labs/Guardian (acquired by Alice, gaming deprioritised).

### Localisation
Gridly (Black Myth Wukong, Rovio, UE+Unity plugins, 10+ AI translation engines). DeepL. Crowdin, Lokalise, Phrase (rate-limited).

### Engineering
GitHub Copilot (usage-based June 2026, C++ Modernisation Agent, UE community plugins). Cursor ($20/mo, no named game studios). Claude Code (UE6 MCP announced, GameMaker integration, Blender MCP). Codex CLI (community UE plugins, weaker than Claude on C++).

### Production
Linear AI (Coding Sessions via Claude/Codex, Code Intelligence, Supercell client). Notion AI (Custom Agents, Coding Sessions, 10K row limit). Jira AI (Atlassian Intelligence).

### Neural Rendering (GDC 2026)
NVIDIA Project Lightspeed, Epic Neural Nanite, Unity Muse, Activision Blizzard (internal).

### Gaussian Splatting
Khronos glTF extension (Feb 2026). Houdini 22 native support. PlayCanvas FPS demo. KIRI Engine Blender addon.
