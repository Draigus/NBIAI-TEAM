# Couch Heroes: Zone Population Architecture Proposal

**Prepared by:** NBI Gaming — Glen Pryer, CPO (Advisory)
**Date:** 4 June 2026
**Version:** 2.0
**Classification:** Internal — Couch Heroes Technical Leadership
**Audience:** Vardis (CEO), Aris (COO), Mustafa (Head of Tech), Robin (Game Director)

---

## 0. Decision Framework

This document asks Couch Heroes leadership to make one architectural commitment: **how many concurrent players per zone should the networking architecture support?**

The answer is not a single number. It is a spectrum with different engineering costs, different team requirements, and different competitive positioning. The architecture proposed here is designed so that the studio starts at the proven baseline and scales upward based on prototype data — no redesign required at any point.

| Target | Engineering Effort | Team Requirement | Competitive Position | Risk |
|---|---|---|---|---|
| **100-150 per zone** | Low. Stock UE5 Replication Graph with basic tuning. | Any UE5 multiplayer team. | Parity with most shipped MMOs. Below Ashes of Creation's alpha demos. | Low. Proven by Fortnite (100), FFXIV (~200). |
| **200-300 per zone** (Recommended primary target) | Moderate. Custom interest management, hub sharding, dormancy tuning. | 2-3 engineers with UE5 dedicated server experience for the networking layer. | Exceeds every shipped Social MMO. Comparable to GW2's WvW instancing. | Moderate. Well within proven patterns. |
| **400-600 per zone** (Aspirational stretch) | High. Deep interest management profiling, staggered replication, aggressive dormancy, potential OmniMesh licensing. | 3-4 senior networking engineers, dedicated to infrastructure. | Unprecedented for a shipped Social MMO. Genuine market differentiator. | High. No shipped game has proven 600 in a UE5 zone. Mortal Online 2 reports ~500 with quality issues. |

**Our recommendation:** Build the architecture for 200-300. Design it so that scaling to 600 requires tuning and hardware, not redesign. Prototype at 200 first. Let telemetry from the prototype determine whether 600 is achievable at acceptable quality.

**The critical constraint all readers must understand:** Regardless of zone population, **any single combat encounter (world boss, corruption event, PvP battle) caps at approximately 100 participants**. Players beyond that cap can observe but not interact. The zone holds 200-600 players coexisting; combat happens in clusters of up to 100 within that zone. This is how every MMO works — the zone population and the combat population are different numbers.

---

## 1. Executive Summary

Couch Heroes is a fantasy Social MMORPG built in Unreal Engine 5, targeting PC first with console to follow. The game's design pillars — discovery-driven exploration, a corruption world mechanic, no-stat cosmetics, soft-class building via weapon + off-hand, and a social-first identity — demand a world that feels alive and populated.

The original GDD specified 30-40 players per instance. This proposal defines the architecture required to scale zone populations to **200-300 concurrent players per zone** (primary target) with the structural capacity to reach **600** (aspirational stretch), hub areas (Downtime, faction districts) scaling dynamically through sharding, and combat encounters running responsively at up to 100 participants.

### Why population density matters for Couch Heroes specifically

Couch Heroes is a Social MMO. The social experience IS the product. A world with 30 players per zone feels empty — Palia proved this at the cost of the studio. Couch Heroes' five factions (Allegiant, Athenaeum, Adeticus, Mendarium, Purple) only feel meaningful when faction districts are populated. The corruption mechanic only generates shared stories when multiple players witness and participate in corruption events. The no-stat cosmetic system only drives aspiration when players see each other's outfits.

Every competitor in the Social MMO space either caps at 25-50 players per zone (Palia, Tower of Fantasy, Destiny 2) or attempts large numbers and delivers poor performance (Throne and Liberty, ESO Cyrodiil). A Social MMO that delivers 200-300 players coexisting in a zone — with headroom to push to 600 — would be a genuine market differentiator.

### Architecture summary

A Hybrid Zone Architecture using five server profiles:

1. **Overworld zone servers** — 200-600 players coexisting, aggressive interest management, 10-20Hz tick rate
2. **Hub shard servers** — Downtime city, sharded at density thresholds, social-graph-aware routing
3. **Instance servers** — Dungeons, raids, structured PvP at 30Hz
4. **User Space servers** — Player housing instances, on-demand, 12-24 visitors per house
5. **Metagame backend** — Accounts, economy, social graph, faction state, matchmaking

Every individual technique in this architecture has shipped in at least one production title. The combination is tailored to Couch Heroes' specific design pillars.

### What this proposal does not cover

- Game design specifics (combat balancing, ability design, content pipeline)
- Art pipeline and asset production
- Client-side rendering architecture beyond character LOD
- Platform layer (web/mobile companion app) — requires a separate architectural proposal
- Monetisation infrastructure

---

## 2. Competitive Landscape

### 2.1 Social MMO Zone Population Models

All figures below are from published architecture documentation, community testing, or developer statements. Marketing claims are labelled as such.

| Title | Engine | Zone Model | Reported Zone Cap | Combat Scale | Status |
|---|---|---|---|---|---|
| **Palia** | UE4 | Single server per zone instance | 25 per instance | No combat | Acquired by Daybreak after studio layoffs (35% + 40%) |
| **Tower of Fantasy** | UE4 | Channel-based auto-instancing | ~30-50 per channel (community-observed) | Open-world + instanced | Live, declining concurrent |
| **Throne and Liberty** | UE4 | Traditional server-per-realm | Hundreds in siege (marketing claim) | Large PvP sieges | Live, consolidated from 107 to 25 servers in 4 months |
| **Destiny 2** | Custom (Tiger) | On-the-fly matchmaking | 20-26 in social hub | Instanced PvE/PvP | Live |
| **FFXIV** | Custom | Zone instances + city sharding | ~200 per zone instance, cities shard at threshold | Instanced (8-24 PvE, 72 PvP) | Live, dominant subscriber MMO |
| **Guild Wars 2** | Custom | Megaserver dynamic instancing | Hundreds in WvW maps | Large-scale PvP (WvW) | Live |
| **Ashes of Creation** | UE5 | Custom server meshing (IntrepidNET) | ~300 demonstrated in alpha testing | 100v100 siege target | Alpha, not shipped |
| **Mortal Online 2** | UE5 | Proprietary OmniMesh server meshing | ~500 reported in seamless battle | Open-world full-loot PvP | Live, persistent quality issues |
| **VRChat** | Unity | Instance per world | 80 hard cap, degrades above 40 | No combat | Live |
| **Second Life** | Custom | One region per server core | 100 per region (256m x 256m) | Minimal | Live (20+ year proven ceiling) |
| **ESO** | Custom | Megaserver with PvP campaigns | Hundreds in Cyrodiil (with severe performance issues) | Open-world PvP + instanced PvE | Live |

### 2.2 What Worked

**FFXIV's city sharding** is the cleanest model for Downtime. When a city zone becomes congested, FFXIV spawns numbered instances. The matchmaking layer routes friends, party, and Free Company members to the same instance. Players can manually switch instances. It is not seamless (you see "Instance 1, Instance 2") but it works and players accept it.

**GW2's megaserver** proves that dynamic zone instancing with friend/guild-aware routing creates the perception of a populated world. GW2 dynamically merges and splits zone instances based on population, always keeping players near their social connections. The scoring algorithm considers party membership, guild, language, and home world.

**GW2's centralised Trading Post** solves cross-shard commerce. Trading operates as a global service outside the zone/instance system — no co-location required. Direct player-to-player trades require the same instance, but the marketplace is universal.

**PlanetSide 2** remains the only shipped game that routinely supports hundreds of players in active combat within one zone, achieved through aggressive distance-based update rates and acceptance of visual degradation at extreme scale.

### 2.3 What Failed

**Palia** capped at 25 players per instance in a game about socialising. The world felt empty. Community feedback consistently cited loneliness as a core problem. The studio suffered two rounds of layoffs and was acquired by Daybreak. The lesson: a Social MMO must feel populated or it fails at its core promise.

**Throne and Liberty** marketed large-scale castle sieges as a headline feature. Community reports describe "near-unplayable" performance during large fights — freezing, severe input lag, visual chaos. The game consolidated from 107 to 25 servers within four months of Western launch. The lesson: claiming large-scale and delivering smooth large-scale are different things.

**ESO Cyrodiil** has been the industry's most public large-scale PvP performance problem for over a decade. ZeniMax recently began testing "Cyrodiil Champions" — a mode that simplifies abilities specifically to reduce server load during large fights. They are effectively admitting that reducing game complexity is easier than solving netcode at scale. The lesson: combat must be designed networking-friendly from the start, not retrofitted.

**Tower of Fantasy** uses auto-channelling that silently splits players into separate instances ignoring social connections. The result: a fragmented social experience where the open world never feels populated. The lesson: invisible channel splitting that ignores social connections destroys the social experience.

### 2.4 Couch Heroes Positioning

At 200-300 players per zone (primary target), Couch Heroes would exceed every shipped Social MMO's zone population. At 600 (stretch), it would be unprecedented. Palia, the most direct Social MMO comparable, capped at 25.

The social-first framing is an advantage: social interactions are networking-cheap compared to combat. Emotes, chat, trading, wardrobe changes, and character customisation require minimal bandwidth. A zone where 200 players are socialising and 50 are fighting is far easier to serve than a zone where 250 are all fighting.

---

## 3. Architecture Overview

### 3.1 The Hybrid Zone Model

Five server profiles, each tuned for its activity type:

```
┌──────────────────────────────────────────────────────────────────┐
│                      GAME WORLD                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │              OVERWORLD ZONE SERVER                       │    │
│  │          (200-600 players, 10-20Hz tick)                 │    │
│  │                                                          │    │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────────────┐     │    │
│  │   │ Explore  │  │ Combat   │  │ Corruption Event  │     │    │
│  │   │ (1-3Hz)  │  │ (10-20Hz)│  │ (up to 100 ppl)  │     │    │
│  │   └──────────┘  └──────────┘  └──────────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌──────────────────────────────────┐                            │
│  │     DOWNTIME HUB SHARDS          │  ┌──────────────────┐     │
│  │   Shard 1: up to ~200 players    │  │  USER SPACE       │    │
│  │   Shard 2: overflow              │  │  HOUSING SERVER   │    │
│  │   Shard 3: overflow              │  │  (12-24 visitors  │    │
│  │   (Social-graph-aware routing)   │  │   per house)      │    │
│  └──────────────────────────────────┘  └──────────────────┘     │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ Dungeon  │  │ Raid     │  │ PvP Arena│  │ Siege/TW     │    │
│  │ (4-ppl)  │  │ (8-24)   │  │ (3v3-20v)│  │ (50v50)      │    │
│  │ 30Hz     │  │ 30Hz     │  │ 30Hz     │  │ 20Hz         │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                 BACKEND SERVICES                          │   │
│  │  Orchestration: Agones (server lifecycle on Kubernetes)   │   │
│  │  State Transfer: Redis (ephemeral) + PostgreSQL (durable) │   │
│  │  Metagame: Nakama (accounts, social, matchmaking, economy)│   │
│  │  World State: Corruption service (pub/sub to zone servers)│   │
│  │  Security: EasyAntiCheat + DDoS proxy (Cloudflare/AWS)   │   │
│  │  Telemetry: Per-connection bandwidth, tick time, events   │   │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Where Players Are at Any Given Moment

600 players in a zone does not mean 600 players in one place. In practice:

- ~100-200 in Downtime (hub shards handle this separately)
- ~30-80 in active combat encounters (corruption events, world bosses, PvP — clusters of 20-100)
- ~200-300 exploring, questing, gathering, fishing — spread across the zone
- ~50-100 in instanced content (dungeons, arenas, User Spaces)

The overworld server handles the full zone because most players are network-dormant from any given observer's perspective. Combat clusters get elevated bandwidth priority. Hubs shard when dense. Instances get dedicated servers.

### 3.3 How Corruption State Replicates

Corruption is a core design pillar. The networking architecture must support it natively.

**Corruption state model:** A tiered hybrid. Each zone has:
- A **per-zone corruption scalar** (0-100, one byte) — the authoritative gameplay value that drives spawns, accessibility gates, and broad VFX palette shifts. Replicated to all clients cheaply in periodic world-state snapshots.
- A **low-resolution spatial grid** (64x64 cells per zone, one byte per cell = 4 KB total) — visual corruption spread patterns and localised effects. Replicated via delta compression (only changed cells are sent). Typical update: 50-200 bytes. Update frequency: every 5-10 seconds. Corruption spread is not frame-critical.

**Implementation:** A single replicated "Corruption Manager" actor per zone, using `DORM_DormantAll` by default. When corruption changes (player cleansing, time-based spread), the manager wakes, replicates the delta, and returns to dormancy. This is essentially free in bandwidth terms — a corruption update costs less than a single player character update.

**Cross-shard consistency:** Corruption state is owned by a central world-state service (PostgreSQL + pub/sub). When a player cleanses corruption in the overworld, the change propagates to the central service, which fans out to all Downtime hub shards and any other zone instances. Latency of 1-5 seconds is acceptable for environmental state — players will not notice.

### 3.4 User Space (Housing) Architecture

The GDD describes User Spaces as personal pocket dimensions accessed via the House of Houses in Downtime: furniture placement, trophies, curated displays, social rooms, gardens, Batsuit storage, and visitor portals.

**Server model:** Shared housing server processes, each hosting 20-50 concurrent occupied User Spaces via UE5 World Partition streaming. Only sub-levels where players are present are loaded. New server processes spawn on demand when capacity fills. This matches ESO's approach (all homes instanced, no land scarcity).

**Visitor cap:** 12-24 per User Space (consistent with ESO's 12-24 cap and FFXIV's apartment model). Furniture object counts are the real constraint, not visitor counts — each placed object is a replicated actor.

**Zone server interaction:** Entering a User Space is a server transition. The client disconnects from the current zone/hub server and connects to the housing server via `ClientTravel()`. This is the same mechanism used for dungeon instancing. The transition is masked by a portal animation (walking through the House of Houses portal).

**Cost:** Housing servers are lightweight (no combat, no AI, no large-scale interest management). A c7i.xlarge (4 vCPUs, 8 GB) can host 20-50 occupied User Spaces.

---

## 4. Recommended Technology Stack

Based on the review process, this section presents a **single recommended stack** with documented fallback positions. This is not a menu — it is a starting point that Mustafa's team can prototype against immediately.

### 4.1 Primary Recommended Stack

| Layer | Recommendation | Rationale |
|---|---|---|
| **Replication** | Replication Graph (stable, proven) | Primary. Battle-tested in Fortnite and dozens of shipped titles. `GridSpatialization2D` for spatial culling, `DynamicSpatialFrequency` for distance-based update rates. Iris is the upgrade path once it exits Beta. |
| **Zone Orchestration** | Agones on Kubernetes | Open source, cloud-agnostic, proven by Ubisoft. Handles server lifecycle, allocation, scaling, health checks. No vendor lock-in. |
| **Server Hosting** | AWS (c7i compute-optimised instances) | x86-64 architecture (not ARM/Graviton — UE5 dedicated servers are x86 builds by default). c7i.4xlarge for zone servers, c7i.xlarge for instances. |
| **Metagame Backend** | Nakama (open source, self-hosted) | Handles accounts, social graph, matchmaking, leaderboards, chat, notifications. Self-hostable on the same Kubernetes cluster. No vendor dependency. No per-MAU pricing. |
| **State Transfer** | Redis (ephemeral) + PostgreSQL (durable) | Redis for player state during server transitions (TTL 120s). PostgreSQL for persistent world state, player data, economy, faction control. |
| **Anti-Cheat** | EasyAntiCheat (free via Epic Online Services) | Native UE5 integration. Client-side kernel-level scanning for aimbots and memory manipulation. Complemented by server-side authority (the server validates all state-changing inputs). |
| **DDoS Protection** | AWS Shield Standard + Cloudflare Spectrum (or AWS GameLift DDoS if GameLift is adopted) | Game server IPs are never exposed to clients. All traffic proxied through a DDoS-scrubbing layer. |
| **World State** | Custom corruption service (PostgreSQL + pub/sub) | Eventual consistency across zone instances and hub shards. |

### 4.2 Documented Fallback Positions

| Layer | Fallback | When to Switch |
|---|---|---|
| **Replication** | Iris (Beta in UE 5.7) | If Replication Graph ceiling is below 200 players in the stress test prototype. Design the interest management abstraction so migration is possible without rewriting game logic. |
| **Zone Orchestration** | Redwood MMO Framework | If Agones alone proves insufficient for zone management and player routing. Redwood adds zone-based server separation and automatic sharding on top of Kubernetes. Early-stage, so prototype before committing. |
| **Server Meshing** | OmniMesh (StarVault, licensed) | Only if the single-server zone ceiling is below 300 players AND the 600 target is deemed essential. OmniMesh is the only proven UE5 server meshing solution but creates vendor dependency. Negotiate source code access in any licence. |
| **Metagame Backend** | Pragma (managed) | If the team cannot allocate engineers to self-host Nakama. Pragma is purpose-built for games but adds vendor dependency and cost. |

### 4.3 Technologies Explicitly Not Recommended

| Technology | Reason |
|---|---|
| **Custom server meshing** | Multi-year engineering investment. Star Citizen has spent nearly a decade and hundreds of millions. A 55-person studio cannot build this while also building a game. |
| **SpatialOS (Improbable)** | Dead for games. Pivoted to metaverse/web3. Every game built on it was cancelled (Worlds Adrift, Nostos, Scavengers). |
| **Hadean** | Pivoted entirely to defence/military simulation. No gaming customers. |
| **Hathora** | Shut down May 2026 after acquisition. |

---

## 5. Technical Specification

### 5.1 Overworld Zone Server

**Server process:**
- Single UE5 dedicated server process per zone
- Primary target: 200-300 concurrent connections. Aspirational: 600.
- Server tick rate: **10-15Hz** (realistic ceiling at 300+ players). 20Hz achievable at 200 or fewer.
- Replication: Replication Graph with `GridSpatialization2D` and `DynamicSpatialFrequency` nodes
- Staggered replication: the server replicates to 50-100 connections per tick and rotates through the full set. At 300 connections and 15Hz, each connection receives a replication pass every 3-6 ticks (200-400ms for low-priority players). At 600, this extends to 6-12 ticks (400-800ms for dormant players). Priority accumulation ensures combat participants are never starved.

**Interest management configuration:**

Three distance tiers with **hysteresis** (separate promote/demote distances to prevent thrashing at tier boundaries):

| Tier | Promote Distance | Demote Distance | Effective Update Rate | Visual Fidelity | UE5 Mechanism |
|---|---|---|---|---|---|
| **Near** | enters < 45m | exits > 55m | 10-15Hz (full tick rate) | Full skeletal mesh, full animation | `DORM_Awake`, `NetPriority` 2.0, `DynamicSpatialFrequency` max rate |
| **Mid** | enters < 180m | exits > 220m | 1-3Hz (via DynamicSpatialFrequency) | Low-LOD mesh, simplified animation | `DORM_Awake` with reduced `NetUpdateFrequency`, `NetPriority` 1.0 |
| **Far** | all others | — | 0.5-1Hz (position-only) | Impostor billboard or culled | `DORM_DormantAll`, woken via `FlushNetDormancy()` only on significant state change |

**Key corrections from v1:** The Mid tier uses `DynamicSpatialFrequency` node configuration, not `DORM_DormantPartial` (which does not provide reduced-frequency replication in standard UE5). The Far tier uses `DORM_DormantAll` — fully dormant actors consume zero replication CPU.

**Combat priority elevation:** When a player enters combat, override `GetNetPriority()` to return 3.0 (vs 1.0 default). This ensures combat participants win bandwidth allocation in every staggered replication pass. Combat state is a single replicated boolean — cheap to toggle.

**Reliable RPC discipline:** Reliable RPCs consume "bunch" budget on a connection. When the bunch fills with reliable data, property replication is deferred to the next tick — a budget contention issue, not a binary block. In high-density zones, this causes intermittent lag spikes. **Project-wide rule:** combat abilities use unreliable RPCs with client-side visual confirmation. Reliable RPCs reserved for transactional state changes (item acquisition, quest completion, trade confirmation).

### 5.2 Bandwidth Budget (Corrected)

Per-actor replication sizes based on UE5 framing overhead (object header, property header, bunch framing) and typical replicated character properties:

| Property Set | Raw Size | With Delta Compression | Notes |
|---|---|---|---|
| Position (FVector_NetQuantize) | 6 bytes | 3-6 bytes | 3x 16-bit quantised |
| Rotation (compressed) | 4-6 bytes | 2-4 bytes | |
| Velocity | 6 bytes | 3-6 bytes | |
| Movement mode | 1 byte | 0-1 byte | Often unchanged |
| Animation state | 4-8 bytes | 2-6 bytes | Blend space + montage ID |
| Combat state (target, health, ability) | 8-12 bytes | 4-8 bytes | Only when in combat |
| UE5 replication overhead | 8-16 bytes | 8-16 bytes | Object header, property header, bunch framing — NOT compressible |
| **Total per update (moving, in combat)** | **37-65 bytes** | **~45 bytes typical** | |
| **Total per update (idle/distant)** | **15-25 bytes** | **~18 bytes typical** | Position-only with overhead |

**Per-connection bandwidth at 300 players:**

| Tier | Visible Players | Effective Rate | Bytes/Update | Bandwidth |
|---|---|---|---|---|
| Near (0-55m) | ~30-50 | 15Hz | 45 bytes | 20-34 KB/s |
| Mid (55-220m) | ~50-80 | 2Hz | 35 bytes | 3.5-5.6 KB/s |
| Far (220m+) | ~170-220 | 0.5Hz | 18 bytes | 1.5-2.0 KB/s |
| **Total per connection** | | | | **~25-42 KB/s (~200-336 kbps)** |

**Per-connection bandwidth at 600 players:**

| Tier | Visible Players | Effective Rate | Bytes/Update | Bandwidth |
|---|---|---|---|---|
| Near | ~30-50 | 10-15Hz | 45 bytes | 14-34 KB/s |
| Mid | ~80-120 | 1-2Hz | 35 bytes | 2.8-8.4 KB/s |
| Far | ~430-490 | 0.5Hz | 18 bytes | 3.9-4.4 KB/s |
| **Total per connection** | | | | **~21-47 KB/s (~168-376 kbps)** |

**Total server egress at 300 players:** ~7.5-12.6 MB/s (~60-100 Mbps). Comfortable on 1 Gbps NIC.
**Total server egress at 600 players:** ~12.6-28.2 MB/s (~100-225 Mbps). Tight but feasible on 1 Gbps NIC. Add combat RPCs, chat, item updates, and game events: realistic peak ~300-400 Mbps. Dual NIC or 10 Gbps recommended at 600.

**These are estimates.** The 200-player stress test prototype must measure actual bytes-on-wire using UE5's Network Profiler (`stat net`, Networking Insights) before any production commitment.

### 5.3 Hub Sharding (Downtime)

**Shard capacity:** The exact cap must be determined by prototype testing. Downtime is networking-cheap (no combat, no physics, no AI). The initial target is **~200 per shard** — higher than the overworld combat ceiling because social activities consume less bandwidth per player. If prototype testing shows the ceiling is lower, reduce; if higher, increase.

**Shard routing priority:**
1. Same party members
2. Same guild/faction
3. Friends list
4. Geographic proximity (entered from same zone area)
5. Load balancing (distribute evenly)

**Transition mechanism:**
- `ClientTravel()` to a different server address with Redis state serialisation
- **Honest transition time: 3-5 seconds.** `ClientTravel()` involves disconnecting, TCP/TLS handshake to new server, UE5 connection auth, initial state download, and level streaming. On a clean connection with pre-resolved addresses and warm shard, 2-3 seconds is plausible. On a congested connection or cold shard, 4-5 seconds.
- Transition is masked by a city-gate/tunnel traversal animation. If the transition exceeds the animation duration, a brief loading indicator appears.
- **Fallback UX:** If seamless transitions prove unreliable, fall back to FFXIV's model — visible "Instance 1 / Instance 2" labels with manual switching. This is proven and players accept it.

**Combat lockout at shard boundaries:** Players in active combat (PvP flagged with a target lock, or aggro'd by NPCs) cannot enter shard transition zones. A brief "cannot enter while in combat" message prevents the exploit of fleeing into a shard boundary for invulnerability.

**Cross-shard interactions:**
- **Trading:** A centralised marketplace service (part of the Nakama backend) operates outside the shard system. Direct player-to-player trades require the same shard. This is the GW2 Trading Post model.
- **Chat:** Faction chat and private messages route through the metagame backend, not the zone server. Players in different shards can communicate freely.
- **Party formation:** Cross-shard party invites route through the backend. Accepting a party invite triggers a shard transfer to the party leader's shard.

### 5.4 Combat Networking

#### The 100-Participant Event Cap

Open-world events (corruption cleansing, world bosses) cap at **100 active participants**. This is a networking constraint that must be designed as a game mechanic:

- When a world event reaches 100 participants, the event transitions to "full" state
- Additional players within the event radius can observe (reduced-LOD visuals) but cannot deal damage or receive loot
- The observation radius extends beyond the participation radius — observers see the spectacle, which serves the social experience
- When a participant leaves (dies, runs away, disconnects), a slot opens for an observer to join

This cap is designed, not accidental. Robin's team should frame it as "the corruption is overwhelming — reinforcements standing by" rather than "server full."

#### PvE Combat

**World events:**
- Open-world, within the overworld zone server
- Participants receive elevated `NetPriority` (3.0)
- AI enemies: traditional Actor-based AI for bosses and elites. MassAI for ambient creatures and add waves. MassAI entities are **client-side simulated** (server sends seed state, client runs deterministic simulation locally) to avoid replication cost. Gameplay-critical NPCs use server-authoritative Actors.
- AoE abilities cap at 12 targets (nearest by distance) to prevent O(N^2) scaling
- VFX tiers: ability effects simplify automatically when participant count exceeds 60 (fewer particles, shorter durations, merged effects). GW2 WvW ships this pattern. The combat design team defines VFX tiers as part of the ability pipeline, not as a post-hoc optimisation.

**Instanced PvE:**
- Separate UE5 dedicated server process per instance, 30Hz tick
- 4-player dungeons, 8-player raids, 24-player alliance raids
- Spawned on demand by Agones. Warm pool of pre-initialised processes for instant availability.

#### PvP Combat

**Open-world PvP:**
- Requires opt-in (PvP flag). Flag state is a single replicated boolean — negligible bandwidth.
- Soft-lock target validation is server-authoritative: "was the target within lock-on range at server time?"
- No favour-the-shooter lag compensation needed — the soft-lock constraint is binary and server-verifiable.

**Structured PvP:**
- Separate dedicated server instances at 30Hz
- Arena: 3v3, 5v5. Battleground: 15v15, 20v20.
- Siege/Territory War: 50v50 on dedicated instances. 100v100 as aspirational stretch (requires dedicated stress testing).

#### Soft-Lock Combat Skill Expression

Soft-lock does not mean "point and click." Shipped techniques that create genuine skill expression:

- **Split-body animation** — upper body locked to target, lower body free to move and dodge (Ashes of Creation prototype)
- **Positional bonuses** — flanking/rear attacks deal bonus damage (FFXIV Monk/Dragoon positionals)
- **Dodge i-frames** — invincibility frames with precise timing windows (GW2 dodge system)
- **Combo fields and finishers** — abilities interact when overlapping (GW2 combo system)
- **Lock degradation** — lock weakens or breaks when target dashes, enters cover, or exceeds range. Skill gap between players who maintain lock and those who lose it.
- **Animation cancelling windows** — cancel recovery frames into startup of next ability for combat optimisation
- **Momentum-preserved dodges** — movement direction and speed at dodge input affect trajectory

### 5.5 Latency Targets

| Activity | Max Acceptable RTT | Server Tick | End-to-End Budget | Notes |
|---|---|---|---|---|
| **Combat ability activation** | 100ms | 10-20Hz (50-100ms) | 150-200ms input-to-visual | Client prediction makes this feel instant locally |
| **Soft-lock target acquisition** | 150ms | 10-20Hz | 200-250ms | Binary server validation |
| **Movement (near tier)** | 100ms | 10-20Hz | 150-200ms | Client-side prediction + server reconciliation |
| **Social interactions (emote, chat)** | 250ms | N/A | 300-500ms | Not latency-sensitive |
| **Hub shard transition** | N/A | N/A | 3-5 seconds | Masked by animation |
| **Dungeon/instance transition** | N/A | N/A | 3-5 seconds | Masked by loading screen |
| **Corruption state update** | N/A | 0.1-0.2Hz | 5-10 seconds | Eventual consistency acceptable |

**Server region implications:** To hit 100ms RTT for combat, game servers must be placed in regions covering the target audience. For EU launch: Frankfurt or London. For NA: US-East (Virginia). Players exceeding 150ms RTT will feel combat delay despite client prediction. This constrains the "single global server" model — CH will likely need regional server clusters.

### 5.6 Client-Side Rendering Budget

| Distance | Representation | Max Characters | Detail |
|---|---|---|---|
| 0-30m | Full LOD0 skeletal mesh | 50-80 | Full bone count, animation blend, materials, cosmetic detail |
| 30-100m | LOD2/3 reduced mesh | 100-150 | Reduced bones (no fingers), simplified animation, reduced materials |
| 100-300m | Impostor billboard | 200+ | UE5 Impostor Baker plugin. Re-rendered every ~250ms. Faction colours visible. |
| 300m+ | Culled or minimap dot | Remainder | Not rendered. |

Nanite does not support skeletal meshes as of UE 5.7. Characters use traditional skeletal mesh with manual LOD tiers. This must be tested on minimum-spec hardware early.

### 5.7 NPC and AI Architecture

**Combat NPCs (bosses, elites, quest enemies):** Traditional UE5 Actors with full replication. Behaviour Trees or StateTree. Server-authoritative. Budget: 200-500 per zone.

**Crowd NPCs (ambient, wildlife, merchants):** MassAI/Mass Entity framework. Client-side simulation from server seed state — the server sends spawn positions and behaviour parameters; clients simulate movement locally using deterministic logic. No per-entity replication cost. Rendering via Instanced Static Mesh (ISM) for distant crowds. Budget: 2,000-5,000 per zone. This is the approach that makes 100 players feel like 500 — the world is populated by NPCs that fill visual gaps.

**Mass Entity replication status:** Mass Entity replication in UE 5.7 is functional for server-authoritative one-way replication but described by community sources as incomplete. Full Iris integration is targeted for UE 5.8. For CH's needs, client-side deterministic simulation avoids this limitation entirely.

---

## 6. Security and Resilience

### 6.1 DDoS Mitigation

**Requirement:** Game server IPs must never be exposed to clients. All game traffic is proxied through a DDoS-scrubbing layer.

**Recommended approach:** AWS Shield Standard (included with AWS) provides baseline DDoS protection. For UDP game traffic specifically, either:
- **Cloudflare Spectrum** (Enterprise plan) — proxies UDP at edge PoPs, adds minimal latency. Established solution.
- **AWS GameLift DDoS Protection** (launched March 2026) — co-locates relay network alongside game servers with per-player access-token authentication and rate limiting. Negligible latency addition. Included at no cost for GameLift customers.

If CH uses Agones on raw AWS (not GameLift), the Cloudflare Spectrum path is more appropriate. If CH adopts GameLift for hosting, the built-in DDoS protection is the natural choice.

### 6.2 Anti-Cheat

**Two complementary layers:**

1. **Server authority** — the server validates ALL state-changing inputs. Movement speed, ability damage, item acquisition, and combat results are server-authoritative. Interest management is itself an anti-cheat measure: by only sending clients entities they could plausibly observe, the server prevents wallhacks and maphacks at the network level.

2. **Client-side scanning** — EasyAntiCheat (free via Epic Online Services, native UE5 integration) catches aimbots, speed hacks that send plausible-but-inhuman inputs, and memory manipulation that server authority alone cannot detect. EAC supports dedicated server topologies natively.

### 6.3 Server Crash Recovery

**Checkpointing:** Zone servers write player state to PostgreSQL on disconnect and on significant state changes (level up, item acquisition, quest completion). A lightweight checkpoint (position, health, combat state) writes to Redis every 30-60 seconds for crash recovery. The copy-on-update pattern ensures checkpointing does not block the game thread.

**Crash flow:**
1. Zone server process crashes. Agones detects health check failure.
2. All 200-600 players are disconnected. Clients see a "Reconnecting..." screen.
3. Agones allocates a replacement zone server from the warm pool.
4. Replacement server loads the zone and the last checkpoint from Redis/PostgreSQL.
5. Players reconnect via the gateway service and resume from their checkpointed state.
6. **Target recovery time: 30-60 seconds.** This is not instant, but it is recoverable. Players lose at most 30-60 seconds of progress.

**No hot standby.** True hot-standby zone servers (a shadow server receiving continuous state replication) would double infrastructure costs. No shipped MMO at CH's scale runs hot standby for zone servers. The warm pool + checkpoint approach is standard.

### 6.4 Console Networking Constraints

PC-first, console to follow. Architectural decisions made now must be console-compatible:

- **PSN/XBL session management:** Console platforms require games to register sessions with the platform's social layer. The Nakama social graph must integrate with PSN/XBL session APIs. This is an integration concern, not an architecture change.
- **NAT traversal:** Console players often sit behind restrictive NATs. UE5 dedicated servers handle this natively (players connect to the server, not peer-to-peer). No architecture change required.
- **Certification:** Sony and Microsoft certification requires specific connection handling (graceful disconnect, reconnection, error messaging). The crash recovery flow must meet TRC/XR requirements. Build these requirements into the reconnection flow from the start.
- **Cross-play:** If PC and console players share zones, matchmaking must account for input method differences. The soft-lock combat model is inherently controller-friendly, which helps.

---

## 7. Expert Perspectives with Engineering Resource Estimates

### 7.1 Senior Network Engineer

**Critical decisions for Mustafa's team:**

1. **Replication Graph is the starting point.** Build on what is proven. Design the interest management abstraction so that migration to Iris is possible when it reaches stable status, without rewriting game logic. Do not bet the networking foundation on a Beta API.

2. **Prototype at 200 players immediately.** A minimal UE5 dedicated server with 200 simulated clients, Replication Graph with `GridSpatialization2D` and `DynamicSpatialFrequency`, and combat-priority elevation. Measure `NetBroadcastTickTime`, per-connection bandwidth (via Network Profiler), and server tick time. This prototype is the gate for all further work.

3. **Reliable RPC discipline must be a code review gate.** No reliable RPCs in combat code paths. This is not a guideline — it is a rule enforced in code review. A single reliable RPC in a hot path can stall replication for an entire connection for a full tick.

4. **Interest management hysteresis is mandatory.** Without separate promote/demote distances, players near tier boundaries oscillate between update rates, causing visual popping and inconsistent bandwidth. The 10m hysteresis buffer (45m promote, 55m demote for Near tier) is the minimum.

**Engineering estimate:** The networking layer (interest management, dormancy, priority accumulation, staggered replication, state transfer, hub sharding) requires **2-3 senior engineers dedicated to infrastructure for the full pre-production and early production period**. This is the most specialised work in the project.

### 7.2 Level Designer

**Zone design constraints from the networking architecture:**

1. **Zone size:** Zones must be large enough that 300 players are naturally distributed. Minimum recommended zone size: 2km x 2km. Smaller zones concentrate density and stress the server.
2. **POI distribution:** No single POI should attract more than 100 players. Corruption events, world bosses, and gathering nodes must be distributed across the zone.
3. **Downtime layout:** The five faction districts should distribute key NPCs (Barbersmith, shops, House of Houses entrances) so that no single district becomes a universal congregation point.
4. **Natural density barriers:** Mountain ranges, rivers, and elevation changes prevent all 300 players from converging on one point.
5. **Event radius design:** Corruption events have a defined participation radius (100 players) and a larger observation radius. The level design must accommodate both.
6. **Shard transition zones:** The boundary between "open zone" and "Downtime hub" should be a natural transition — a city gate, bridge, or tunnel that accommodates the 3-5 second transition time.

### 7.3 Combat Designer

**Networking-aware combat design:**

1. **AoE target caps from day one.** Every AoE ability caps at 12 targets. This is a design decision, not an optimisation — it must be in the combat design document before any ability is implemented.
2. **VFX tiers in the ability pipeline.** Every ability has 3 VFX tiers: full (under 30 participants), reduced (30-60), minimal (60+). The combat designer specifies these, not the VFX artist.
3. **Death respawn at safe locations.** Respawn points are distributed away from combat sites to prevent density buildup.
4. **Corruption cleansing as networking-friendly design.** Corruption cleansing is a positional puzzle/platforming activity, not a combat spam activity. This makes it inherently cheaper to network than combat — fewer state changes per second, fewer ability activations.

### 7.4 Product Manager

**Product framing:**

1. **Lead with the experience, not the number.** "You will always see other players in the world" is a product claim. "600 players per zone" is a tech claim. The marketing message is the former.
2. **The 100-player event cap is a feature.** Frame it as "epic battles with up to 100 combatants" — that exceeds most shipped MMO combat encounters (FFXIV caps at 24 for alliance raids, 72 for PvP Frontlines).
3. **The world must feel populated at 100 concurrent.** If CH launches with modest concurrency, MassAI crowd NPCs, concentrated POI layouts, and ambient events must make 100 human players feel like a living world. Megaserver-style zone merging (GW2 model) consolidates low-population zones to maintain density.
4. **New player first-30-minutes test.** At every development milestone, test: what does a new player see in their first 30 minutes at 100 concurrent? At 300? At 600? If the answer is "5 players regardless," the POI distribution needs work.

### 7.5 CTO / Full Stack Engineer

**Infrastructure recommendations:**

1. **Containerise everything on Kubernetes.** Zone servers, instance servers, housing servers, Nakama, Redis, PostgreSQL — all containerised. Agones manages game server lifecycle. Consistent environments across dev/staging/production.

2. **Telemetry from day one.** Per-zone player counts, per-connection bandwidth, `NetBroadcastTickTime`, server tick time, combat event participation, shard transitions. Dashboard these. The difference between "300 players works" and "300 players fails" is visible in telemetry before players notice.

3. **Blue-green deployment.** Server updates deploy new zone servers alongside old ones. Players migrate during natural transitions. No "everyone disconnects for a patch."

4. **State transfer with verification.** Redis serialisation with 120-second TTL. Receiving server confirms state loaded via handshake before the source server releases the connection. If transfer fails, the player is returned to the source server, not dropped.

**Engineering estimate:** Backend infrastructure (Kubernetes setup, Agones integration, Nakama deployment, Redis/PostgreSQL, telemetry, CI/CD, DDoS proxy) requires **1-2 backend/DevOps engineers** during pre-production, then ongoing operational support.

---

## 8. Comprehensive Cost Model

**This is a fully-loaded estimate including all infrastructure components, not just compute.**

### 8.1 Monthly Infrastructure at Scale (300 concurrent per zone, 10 zones, 30,000 peak CCU)

| Component | Specification | Monthly Cost (AWS, reserved) |
|---|---|---|
| Zone servers (10) | c7i.4xlarge (16 vCPU, 32 GB) | $5,000-7,000 |
| Hub shard servers (20) | c7i.2xlarge (8 vCPU, 16 GB) | $4,000-6,000 |
| Instance servers (50 warm pool) | c7i.xlarge (4 vCPU, 8 GB) | $5,000-8,000 |
| Housing servers (10) | c7i.xlarge (4 vCPU, 8 GB) | $1,000-1,600 |
| PostgreSQL (RDS Multi-AZ) | db.r6g.2xlarge | $2,000-3,000 |
| Redis (ElastiCache, clustered) | cache.r6g.xlarge | $1,000-1,500 |
| Nakama cluster (3 nodes) | c7i.xlarge | $1,500-2,500 |
| Kubernetes control plane | EKS | $200-300 |
| Network egress (zone servers) | ~100-400 Mbps per zone, 10 zones | $8,000-15,000 |
| DDoS protection | AWS Shield Standard (free) + Cloudflare Spectrum or GameLift DDoS | $0-5,000 |
| Monitoring/telemetry | CloudWatch, Grafana, custom dashboards | $500-1,500 |
| CDN (game patches) | CloudFront | $500-2,000 |
| CI/CD + stress test infrastructure | Build servers, simulated clients | $1,000-3,000 |
| Dev + staging environments (2) | Reduced-scale mirrors of production | $3,000-5,000 |
| **Total monthly** | | **$33,000-61,000** |

### 8.2 Cost Scaling

- **Pre-launch (development):** $8,000-15,000/month (dev + staging only, no production zone servers)
- **Soft launch (1,000-5,000 CCU):** $15,000-30,000/month
- **Full launch (30,000 CCU):** $33,000-61,000/month
- **Growth (100,000+ CCU):** Scale horizontally. More zone servers, more shards, more instances. Infrastructure costs scale roughly linearly with CCU.

These figures are estimates based on AWS published pricing with reserved instances. Actual costs will vary with region, negotiated pricing, and traffic patterns. Egress costs are the most variable component.

---

## 9. Risk Register

| Risk | Severity | Mitigation | Owner |
|---|---|---|---|
| **Zone server cannot sustain 15Hz at 300 players** | HIGH | Prototype at 200 players first. If ceiling < 300, reduce target or evaluate OmniMesh. | Mustafa |
| **Player count at launch too low to fill zones** | HIGH | MassAI NPC crowds, concentrated POI layout, megaserver-style zone merging when population is low. | Robin + Mustafa |
| **Hub sharding breaks social connections** | HIGH | Social-graph-aware routing as primary criterion. Manual shard-switch UI. Test with simulated friend clusters. | Mustafa |
| **Cross-server state transfer loses player data** | HIGH | Redis write-ahead with 120s TTL. Verification handshake. Return to source on failure. | Mustafa |
| **Zone server crash at 300+ players** | HIGH | 30-60 second checkpoint to Redis. Warm pool replacement. Reconnection via gateway. | Mustafa + DevOps |
| **Engineering team lacks UE5 networking specialists** | HIGH | Assess Mustafa's team. If < 2 engineers with dedicated server experience, hire or contract for the networking layer. | Vardis + Mustafa |
| **UE5 engine version lock-in** | MEDIUM | Lock to one UE5 version for production. Do not upgrade mid-production. Plan engine migration only between major milestones. | Mustafa |
| **Reliable RPC bunch contention causes lag spikes** | MEDIUM | Code review gate: no reliable RPCs in combat paths. | Mustafa |
| **Client rendering fails at 80+ nearby characters** | MEDIUM | Impostor billboard system and animation LOD tested on min-spec hardware early. | Art Director + Mustafa |
| **Combat at 100 participants feels chaotic** | MEDIUM | VFX tiers designed from start. AoE caps at 12 targets. Playtest large encounters early. | Robin |
| **Shard transitions take > 5 seconds** | MEDIUM | Prototype `ClientTravel` + Redis path early. If > 5s, fall back to FFXIV visible-instance model. | Mustafa |
| **Bandwidth costs exceed estimates** | MEDIUM | Monitor per-connection bandwidth from day one. Delta compression and interest management keep costs predictable. Egress is the main variable. | DevOps |
| **Redwood maturity insufficient** | LOW | Evaluate during pre-production prototype. Fall back to custom Agones + NodeJS orchestration. | Mustafa |
| **DDoS attack on game servers** | LOW | Proxied traffic, no exposed IPs. AWS Shield + Cloudflare Spectrum. | DevOps |

---

## 10. What We Don't Know

This section lists significant unknowns that must be resolved by prototyping and testing. Presenting them honestly is more valuable than pretending certainty.

1. **The actual single-server player ceiling in UE5 for this game.** No one has published data for a third-person MMORPG with hybrid combat and cosmetic customisation at 300+ players in UE5. The 200-300 target is well within proven territory. 600 is extrapolation. The stress test prototype resolves this.

2. **Replication Graph performance ceiling with CH's specific actor complexity.** Couch Heroes' no-stat cosmetic system means player characters carry more visual state than a typical MMO character (full wardrobe, dye state, cosmetic crystals, off-hand visuals). Each additional replicated property affects bandwidth. Must be measured, not assumed.

3. **Actual `ClientTravel` transition time with full cosmetic state.** Serialising and deserialising a character with extensive cosmetic customisation through Redis may take longer than a combat-focused character with minimal visual state. Must be prototyped.

4. **MassAI client-side deterministic simulation viability.** Client-side NPC simulation only works if all clients produce the same results from the same seed state. Floating-point determinism across different hardware is not guaranteed. Must be tested on diverse hardware.

5. **Iris upgrade path timeline.** Iris is on Epic's roadmap but there is no public date for stable release. If Replication Graph proves insufficient and Iris is still Beta, the fallback is OmniMesh licensing or reduced zone populations.

6. **OmniMesh licensing terms.** Pricing, source code access, support terms, and platform restrictions are not publicly documented. Must be evaluated if the zone ceiling needs to exceed what single-server can deliver.

7. **Minimum-spec client rendering at 50+ nearby characters with CH's art style.** The Byte-Punk aesthetic may be more or less expensive to render than a generic MMO character. Must be tested on target minimum-spec hardware.

8. **Nakama scalability at 30,000+ concurrent users.** Nakama's open-source tier has been used in shipped games but published benchmarks at MMO scale are limited. Load testing is required.

---

## 11. Phased Delivery

### Phase 1: Foundation (Pre-production)

**Goal:** Validate the architecture with hard data.

**Deliverables:**
- 200-player stress test prototype with Replication Graph, `GridSpatialization2D`, `DynamicSpatialFrequency`, and combat priority elevation
- Measured data: `NetBroadcastTickTime`, per-connection bandwidth, server tick time at 200 players
- Shard transition prototype: `ClientTravel` + Redis serialisation round-trip time with full cosmetic state
- MassAI client-side simulation prototype: determinism test across 3+ hardware configurations
- OmniMesh licensing inquiry (if 600 remains a hard target)
- Nakama deployment prototype on Kubernetes

**Engineering allocation:** 2-3 networking engineers + 1 DevOps engineer, full-time.

**Gate:** If the 200-player prototype runs at > 15Hz with > 30% CPU headroom, proceed to Phase 2. If not, reduce the primary target and/or evaluate OmniMesh.

### Phase 2: Core Infrastructure (Early Production)

**Goal:** Build the production networking layer.

**Deliverables:**
- Interest management system with three tiers, hysteresis, combat elevation
- Hub sharding for Downtime with social-graph-aware routing
- State transfer pipeline (Redis + verification handshake)
- Instance server pipeline (dungeons, arenas via Agones)
- User Space housing server pipeline
- Corruption state replication (zone manager + central world-state service)
- Telemetry dashboard (per-zone, per-connection, per-event)
- EasyAntiCheat integration
- DDoS proxy deployment

**Engineering allocation:** 2-3 networking engineers + 1 DevOps engineer + 1 backend engineer for Nakama/world state.

### Phase 3: Scale and Polish (Mid-Late Production)

**Goal:** Push toward 600 if Phase 2 data supports it. Stress test at scale.

**Deliverables:**
- 300-player stress test. If successful, 400, 500, 600 incrementally.
- Continuous stress testing in CI
- Server crash recovery flow validated
- Console compatibility testing (PSN/XBL session integration)
- Performance profiling on minimum-spec client hardware
- Tuning: dormancy thresholds, priority curves, shard caps — all data-driven

---

## 12. Team Capability Assessment

This architecture assumes the following engineering capabilities exist or can be acquired:

| Capability | Required | Notes |
|---|---|---|
| UE5 dedicated server development | 2-3 engineers | Must understand Replication Graph internals, dormancy, `NetDriver`, and server profiling |
| Kubernetes / DevOps | 1 engineer | Agones deployment, CI/CD, monitoring, Redis/PostgreSQL ops |
| Backend development | 1 engineer | Nakama integration, world state service, shard routing logic |
| UE5 gameplay programming | Existing team | Standard gameplay engineering. Combat, abilities, quests. |
| UE5 rendering | 1 engineer (part-time) | Impostor billboard pipeline, character LOD, animation LOD |

**If Mustafa's current team does not include 2-3 engineers with UE5 dedicated server experience:** Budget for hiring or contracting senior networking engineers for the networking layer. This is specialised work — gameplay programmers cannot be retrained quickly enough for production timelines.

**Total networking/infrastructure engineering headcount:** 4-5 engineers (2-3 networking, 1 DevOps, 1 backend) during pre-production and early production. This can reduce to 2-3 in late production once the architecture is stable.

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **Interest Management** | Server-side system determining which actors each connection needs to know about. Reduces networking cost by sending only relevant data. |
| **Network Dormancy** | UE5 feature stopping an actor from replicating when not relevant. `DORM_DormantAll` = zero replication CPU. |
| **Priority Accumulation** | UE5 mechanism where unreplicated actors accumulate priority over time, preventing starvation. |
| **Replication Graph** | UE5 plugin replacing default O(N*M) relevancy checks with spatial partitioning nodes. |
| **Iris** | UE5's next-generation push-based replication system. Beta as of UE 5.7. |
| **DynamicSpatialFrequency** | Replication Graph node that varies replication rate based on distance to viewer. The mechanism for Mid-tier update rates. |
| **Server Meshing** | Multiple server processes each owning a spatial region of one logical world, with seamless authority handoff at boundaries. |
| **Shard** | A parallel instance of the same game area. Players in different shards cannot see each other. |
| **Tick Rate** | How many times per second the server processes game logic and replication. 15Hz = 66ms per tick. |
| **Delta Compression** | Sending only the difference between current and last-acknowledged state, reducing bandwidth. |
| **Impostor Billboard** | A flat image rendered from a 3D character replacing the full mesh at distance. View-angle-dependent via octahedron mapping. |
| **MassAI / Mass Entity** | UE5's ECS system for simulating thousands of lightweight entities alongside traditional Actors. |
| **Soft-Lock Combat** | Target selection is assisted; skill expression comes from positioning, timing, and ability sequencing. |
| **Hysteresis** | Using different thresholds for promoting and demoting between tiers to prevent oscillation at boundaries. |
| **Bunch** | UE5's network packet assembly unit. Reliable data in a bunch can consume budget and defer property replication. |

## Appendix B: Referenced Sources

Figures cited from these sources represent their published claims and testing results, not independently verified measurements by NBI.

**UE5 Networking:**
- Epic Games — Replication Graph documentation, Iris Replication System documentation (UE 5.7)
- BorMor — "Iris: One Hundred Players" stress test report
- Vorixo — Network Managers pattern, Iris filtering tutorial, DORM_Initial deep-dive
- Steve Streeting — UE5 network saturation / bunch budget analysis
- Cedric Neukirchen — Unreal Multiplayer Compendium
- Epic Games — Actor Priority documentation, Net Dormancy documentation
- Matt Gibson — UE Replication Settings reference

**Server Meshing and Middleware:**
- StarVault — OmniMesh documentation
- Redwood — MMO Framework documentation and architecture overview
- Agones — Kubernetes game server management (Google/Ubisoft)
- UE-DSSPlugin — Scalable MMO server instantiation (GitHub)

**Shipped Title Architectures:**
- Singularity 6 — Palia architecture blog (AWS case study)
- Square Enix — FFXIV field instance documentation, housing system
- ArenaNet — GW2 megaserver system, WvW restructuring, Trading Post architecture
- Intrepid Studios — Ashes of Creation server meshing previews
- Cloud Imperium Games — Star Citizen server meshing documentation (cautionary reference)
- ZeniMax — ESO housing system, Cyrodiil Champions PvP redesign
- Blizzard — WoW instance server architecture (Wowpedia)

**Combat Networking:**
- Gabriel Gambetta — Client-Side Prediction and Server Reconciliation
- Glenn Fiedler (mas-bandwidth.com) — Network model selection guide
- SnapNet — Hybrid rollback architecture documentation
- ResearchGate — Combat State-Aware Interest Management for MMOGs

**Security:**
- AWS — GameLift DDoS Protection (March 2026)
- Cloudflare — Spectrum UDP proxy documentation
- Epic Online Services — EasyAntiCheat licensing (free)
- Cornell VLDB — Checkpoint recovery for MMOs (Cao et al.)

**Cloud Infrastructure:**
- AWS — EC2 c7i pricing, RDS pricing, ElastiCache pricing, EKS pricing
- Heroic Labs — Nakama documentation and clustering guide
- Edgegap — Server hosting and network egress analysis
