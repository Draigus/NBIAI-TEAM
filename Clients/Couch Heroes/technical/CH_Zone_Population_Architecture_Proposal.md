# Couch Heroes: Zone Population Architecture Proposal

**Prepared by:** NBI Gaming — Glen Pryer, CPO (Advisory)
**Date:** 3 June 2026
**Version:** 1.0
**Classification:** Internal — Couch Heroes Technical Leadership

---

## 1. Executive Summary

Couch Heroes is a fantasy Social MMORPG built in Unreal Engine 5, targeting PC first with console to follow. The game's design pillars — discovery-driven exploration, a corruption world mechanic, no-stat cosmetics, soft-class building, and a social-first identity — demand a world that feels alive and populated. The original GDD specified 30-40 players per instance. This proposal evaluates what is required to scale zone populations to **600 concurrent players per zone**, with hub areas (Downtime, faction districts) scaling dynamically through architectural sharding, and combat encounters running lag-free at the largest group sizes the technology allows.

**Why 600 matters:** Every competitor in the Social MMO space either caps at 25-50 players per zone (Palia, Tower of Fantasy, Destiny 2) or attempts large numbers and delivers poor performance (Throne and Liberty, ESO Cyrodiil). A Social MMO that actually delivers hundreds of players coexisting in a zone — exploring, fighting corruption, trading in faction districts, participating in world events — would be a genuine market differentiator. The social core of Couch Heroes demands it: a "social" MMO with 30 players per instance feels empty. Palia proved this.

**The architecture:** A Hybrid Zone Architecture using three distinct server profiles — overworld servers for the 600-player zone, elevated-priority combat networking within that zone, and dynamically sharded hub instances for dense social areas like Downtime. This is not speculative. Every individual technique in this proposal has shipped in at least one production title. The innovation is in the combination, tuned to Couch Heroes' specific design.

**The honest assessment:** 600 players coexisting in a large zone with combat happening in clusters is achievable. 600 players all in one small area fighting each other simultaneously is not — no game in the industry has shipped that. The architecture handles this by designing density management into the world itself: when players converge on a dense area, the system shards seamlessly. The player experience is a living world with hundreds of visible inhabitants. The server reality is intelligent spatial partitioning.

---

## 2. Competitive Landscape

### 2.1 Social MMO Zone Population Models

The table below shows how competing titles handle zone populations. All figures are sourced from published architecture documentation, community testing, or developer statements — not marketing claims except where noted.

| Title | Engine | Zone Model | Reported Zone Cap | Combat Scale | Status |
|---|---|---|---|---|---|
| **Palia** | UE4 | Single server per zone instance | 25 per instance | No combat | Acquired by Daybreak after studio layoffs |
| **Tower of Fantasy** | UE4 | Channel-based auto-instancing | ~30-50 per channel (community-observed) | Open-world + instanced | Live, declining concurrent |
| **Throne and Liberty** | UE4 | Traditional server-per-realm | Hundreds in siege (marketing) | Large PvP sieges | Live, consolidated from 107 to 25 servers in 4 months |
| **Destiny 2** | Custom (Tiger) | On-the-fly matchmaking | 20-26 in social hub | Instanced PvE/PvP | Live |
| **FFXIV** | Custom | Zone instances + city sharding | ~200 per zone instance, cities shard at threshold | Instanced (8-24 PvE, 72 PvP) | Live, dominant subscriber MMO |
| **Guild Wars 2** | Custom | Megaserver dynamic instancing | Hundreds in WvW maps | Large-scale PvP (WvW) | Live |
| **Ashes of Creation** | UE5 | Custom server meshing (IntrepidNET) | ~300 demonstrated in alpha testing | 100v100 siege target | Alpha, not shipped |
| **Mortal Online 2** | UE5 | Proprietary OmniMesh server meshing | ~500 reported in seamless battle | Open-world full-loot PvP | Live, persistent quality issues |
| **VRChat** | Unity | Instance per world | 80 hard cap, degrades above 40 | No combat | Live |
| **Second Life** | Custom | One region per server core | 100 per region (256m x 256m) | Minimal | Live (20+ year proven ceiling) |

### 2.2 What Worked

**FFXIV's city sharding** is the cleanest model for Couch Heroes' Downtime hub. When a city zone becomes congested, FFXIV spawns numbered instances. The matchmaking layer routes friends, party members, and Free Company members to the same instance. Players can manually switch instances. It is not seamless (you see "Instance 1, Instance 2") but it works and players accept it. CH could improve on this by making the shard boundary invisible.

**Guild Wars 2's megaserver** proves that dynamic zone instancing with friend/guild-aware routing creates the perception of a populated world without requiring every player on the same server process. GW2 dynamically merges and splits zone instances based on population, always keeping players near their social connections.

**PlanetSide 2** (ForgeLight engine, not Unreal) remains the only shipped game that routinely supports hundreds of players in active combat within one zone. It achieves this through aggressive distance-based update rates and acceptance of visual degradation at extreme scale.

### 2.3 What Failed

**Palia** capped at 25 players per instance in a game about socialising. The world felt empty. Community feedback consistently cited loneliness as a core problem. The studio suffered two rounds of layoffs (35% and 40%) and was acquired. The lesson: a Social MMO must feel populated or it fails at its core promise.

**Throne and Liberty** marketed large-scale castle sieges as a headline feature. In practice, community reports describe "near-unplayable" performance during large fights — freezing, 10+ second input lag, and visual chaos. The game consolidated from 107 to 25 servers within four months of Western launch. The lesson: claiming large-scale and delivering smooth large-scale are different things.

**ESO Cyrodiil** has been the MMO industry's most public large-scale PvP performance problem for over a decade. ZeniMax has recently begun testing "Cyrodiil Champions" — a mode that simplifies abilities specifically to reduce server load during large fights. They are effectively admitting that reducing game complexity is easier than solving netcode at scale. The lesson: combat must be designed networking-friendly from the start, not retrofitted.

**Tower of Fantasy** uses an auto-channelling system that silently splits players into separate instances. The result: a fragmented social experience where the open world never feels populated because the system constantly separates you from other players. The lesson: invisible channel splitting that ignores social connections destroys the social experience.

### 2.4 Couch Heroes Positioning

At 600 players per zone, Couch Heroes would hold more concurrent players in a single zone than any shipped Social MMO. The closest competitor (Ashes of Creation) has demonstrated ~300 in alpha testing and is not yet shipped. Palia, the most direct Social MMO comparable, capped at 25 — a factor of 24x lower.

This is a genuine competitive advantage, but it is also a significant engineering commitment. The architecture must be designed so that 200-300 players per zone delivers an excellent experience, with 600 as the aspirational target achievable without architectural redesign.

---

## 3. Architecture Overview

### 3.1 The Hybrid Zone Model

The architecture uses three distinct server profiles, each tuned for its specific activity type:

```
┌─────────────────────────────────────────────────────────────┐
│                    OVERWORLD ZONE SERVER                     │
│              (600 players, 20Hz server tick)                 │
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│   │ Explore  │  │ Explore  │  │ Combat   │                 │
│   │ Cluster  │  │ Cluster  │  │ Cluster  │                 │
│   │ (2Hz)    │  │ (2Hz)    │  │ (20Hz)   │                 │
│   └──────────┘  └──────────┘  └──────────┘                 │
│                                                             │
│   ┌───────────────────────────────────────┐                 │
│   │      DOWNTIME HUB (SHARDABLE)         │                │
│   │    Shard 1: 150 players               │                │
│   │    Shard 2: 150 players (overflow)    │                │
│   │    Shard 3: 150 players (overflow)    │                │
│   │    (Friend/faction-aware routing)     │                │
│   └───────────────────────────────────────┘                 │
│                                                             │
│   ┌──────────┐  ┌──────────┐                               │
│   │ Instance │  │ Instance │                                │
│   │ Dungeon  │  │ PvP Arena│                                │
│   │ (30Hz)   │  │ (30Hz)   │                                │
│   └──────────┘  └──────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

**Overworld Zone Server** — A single UE5 dedicated server process handles the full zone. 600 players exist within the zone, but aggressive interest management means each player's network connection only receives updates for the nearest 50-100 players. Distant players are network-dormant. The zone is geographically large (think GW2's Verdant Brink or FFXIV's Endwalker zones, not a corridor). The server tick rate is 20Hz.

**Combat Priority Elevation** — When players engage in combat (PvE or PvP), their network priority is elevated. They receive and send updates at the full 20Hz tick rate. Non-combat players in the same zone continue at 2-5Hz. This is not a separate server — it is priority-based bandwidth allocation within the same server process using UE5's priority accumulation system.

**Hub Sharding (Downtime)** — Downtime is the main city. When the player count in Downtime exceeds a threshold (e.g., 150), the system spawns a new shard. Players are routed to shards based on their friends list, party, and faction. The transition is seamless — no loading screen, no "Instance 1" label unless the player checks. Downtime's five faction districts (Allegiant, Athenaeum, Adeticus, Mendarium, Purple) provide natural density distribution.

**Instanced Content** — Dungeons, raids, structured PvP arenas, and scripted story encounters run on separate server processes at a higher tick rate (30Hz). These servers are spun up on demand and destroyed when empty. This is standard MMO architecture used by every shipped title.

### 3.2 Why This Combination Works

The key insight is that 600 players in a zone does not mean 600 players in one place doing the same thing. In practice, at any given moment:

- ~100-200 might be in Downtime (socialising, trading, customising at the Barbersmith)
- ~50-100 might be in active combat encounters (corruption events, world bosses, PvP)
- ~200-300 are exploring, questing, gathering, fishing — spread across the zone
- ~50-100 are in instanced content (dungeons, arenas)

The overworld server handles the full 600 because most players are dormant from any given observer's perspective. The hub shards when density exceeds what a single server can render and network efficiently. Combat gets priority bandwidth because it needs it. Instanced content gets its own servers because it needs guaranteed tick rates.

---

## 4. Technology Stack

### 4.1 Replication Layer: UE5 Iris vs Replication Graph

#### Iris Replication System

**What it is:** UE5's next-generation replication system, born from Fortnite's infrastructure. Push-based dirty tracking — properties are only serialised when explicitly marked dirty via `MARK_PROPERTY_DIRTY()`, replacing the legacy per-tick polling model that checks every replicated property every frame. Beta in UE 5.7 with multiple shipped titles already using it in production.

**Pros:**
- Significantly lower CPU cost at high player counts. Third-party testing (BorMor, strayspark.studio) reports meaningful improvement over legacy replication at 100+ players.
- Event-driven filtering system with four filter types (Owner, Connection, Group, Dynamic) for interest management.
- Born from Fortnite — Epic's own 100-player title. The system was designed for exactly this problem.
- Active development — UE 5.8 targets Mass Entity replication integration.

**Cons:**
- Beta status in UE 5.7. API may change between engine versions.
- Less community documentation than Replication Graph. Most UE5 MMO guides reference Replication Graph.
- Migration from Replication Graph is non-trivial.
- Filtering implementation requires subclassing and custom logic — not plug-and-play.

**Who uses it:** Fortnite (Epic), multiple undisclosed shipped titles per Epic documentation.

**Recommendation for CH:** Start with Iris if beginning a fresh UE5 project (which CH is). It is the future of Unreal networking and avoids a costly migration from Replication Graph later.

#### Replication Graph

**What it is:** UE5's stable, shipping-grade interest management plugin. Replaces the default O(N*M) relevancy checks with a node tree that pre-sorts actors by type and spatial location.

**Pros:**
- Stable, fully documented, extensive community knowledge.
- Battle-tested in Fortnite and numerous shipped titles.
- `GridSpatialization2D` node provides spatial culling out of the box.
- `DynamicSpatialFrequency` node implements distance-based variable update rates.
- Well-understood performance profile. Known quantities.

**Cons:**
- Legacy system — Epic is investing in Iris as the successor.
- Polling-based relevancy is inherently more CPU-expensive than Iris's push model at scale.
- May require migration to Iris in future engine versions.

**Who uses it:** Fortnite (originally), most shipped UE4/UE5 multiplayer titles.

**Recommendation for CH:** Use as fallback if Iris proves too unstable for the team's UE5 version. The spatial nodes (GridSpatialization2D, DynamicSpatialFrequency) will be needed regardless of which replication system is used.

---

### 4.2 Server Meshing: OmniMesh vs Custom Build vs Redwood

#### OmniMesh (StarVault)

**What it is:** A proprietary server meshing middleware built by StarVault (Mortal Online 2 developers). Evolved since UE3, now native to UE5. Enables seamless cross-server-boundary play with authority handoff as players move between spatial regions owned by different server processes.

**Pros:**
- The only battle-tested server meshing solution for Unreal Engine that has shipped in a live game.
- Reported ~500 players in a single seamless battle with no loading screens and no instancing.
- Includes full MMO subsystems (character architecture, skill trees, crafting, VoIP, login queues) alongside the networking layer.
- Directly addresses the 600-player zone requirement.

**Cons:**
- Proprietary and licensed — introduces a vendor dependency. Pricing not publicly available.
- Mortal Online 2, the only shipped title using it, has persistent quality and performance complaints.
- Authority handoff during active combat across server boundaries is the hardest unsolved problem in game networking. OmniMesh has more experience with this than anyone, but the solution is not perfect.
- Ties CH's networking architecture to a third-party company's roadmap.

**Who uses it:** Mortal Online 2 (live). Available for licensing to other UE5 studios.

#### Custom Server Meshing (Ashes of Creation / Star Citizen Model)

**What it is:** Building a bespoke spatial partitioning and authority handoff system, as Intrepid Studios (IntrepidNET) and Cloud Imperium Games have done.

**Pros:**
- Full control over the implementation. No vendor dependency.
- Can be tailored exactly to CH's zone design and population targets.
- Ashes of Creation has demonstrated this working in UE5 specifically.

**Cons:**
- This is a multi-year engineering investment. Star Citizen has been building server meshing for nearly a decade. Intrepid Studios has a larger engineering team than CH.
- Extremely high technical risk. This is the single hardest engineering challenge in game development.
- Diverts engineering resources from game features.
- A 55-person studio does not have the headcount to build and maintain a custom server meshing solution while also building a game.

**Who uses it:** Star Citizen (custom engine, ~500-700 per shard, static meshing shipped Dec 2024), Ashes of Creation (UE5, ~300 demonstrated in alpha, dynamic gridding in testing).

**Recommendation:** Not viable for CH at current studio size.

#### Redwood MMO Framework

**What it is:** An open-source UE5 MMO backend framework. Provides zone-based server separation, automatic sharding/layering, player transfer between zones, and Kubernetes deployment. NodeJS sidecar architecture.

**Pros:**
- Open source with one-time licence fee. No ongoing vendor dependency.
- Built specifically for UE5 MMOs.
- Handles the zone management, player transfer, and sharding orchestration layer.
- Kubernetes-native, aligning with modern cloud deployment.
- Epic MegaGrant recipient — credibility signal.

**Cons:**
- Not yet proven at 600-player scale. Community adoption is early.
- Does not provide spatial server meshing — it manages zone servers and sharding, not sub-zone spatial partitioning.
- The team would need to build interest management and combat networking on top of Redwood's orchestration layer.

**Who uses it:** Early adopters. No major shipped title at scale yet.

**Recommendation for CH:** Evaluate Redwood as the zone management and sharding orchestration layer. It handles the problems that are solved (zone transitions, shard management, Kubernetes deployment) and lets CH's engineering team focus on the problems that are specific to their game (interest management tuning, combat networking, density-based sharding).

---

### 4.3 Server Hosting

#### AWS GameLift

**Pros:** Market leader. Container fleet support. Tested at massive scale. FlexMatch for matchmaking. Integration with other AWS services.
**Cons:** Requires building UE5 from source for full integration (significant onboarding friction). Complex pricing model. Vendor lock-in to AWS.
**Who uses it:** Most large-scale multiplayer titles.

#### Edgegap

**Pros:** 615+ edge locations for low-latency global coverage. Simpler onboarding than GameLift. Free tier for development. Container-based.
**Cons:** Less proven at MMO scale. Smaller company.
**Who uses it:** Mid-tier multiplayer titles, increasingly adopted.

#### Agones (Google, open source)

**Pros:** Open-source Kubernetes-based game server lifecycle management. No vendor lock-in. Handles allocation, scaling, health checks. Cloud-agnostic.
**Cons:** Orchestration only — no spatial awareness, no matchmaking. Must be combined with other tools.
**Who uses it:** Ubisoft and others for server lifecycle management.

**Recommendation for CH:** Agones for server orchestration (open source, cloud-agnostic), deployed on AWS or GCP. Edgegap as an alternative if the team wants a managed solution with simpler onboarding. GameLift if the studio standardises on AWS.

---

### 4.4 Backend Services

#### AccelByte

**Pros:** Most complete managed game backend. Handles accounts, matchmaking, economy, social, leaderboards, live ops. AMS (Armada Multiplayer Servers) supports long-running server orchestration — critical for MMO zone servers that persist for hours. Warm server pools available.
**Cons:** Managed service cost. Vendor dependency. Less customisable than a bespoke backend.

#### Pragma

**Pros:** Purpose-built game backend. Handles accounts, matchmaking, social, live ops. Strong focus on developer experience. Recently raised additional funding.
**Cons:** No spatial awareness. No dedicated server hosting. Metagame only — still need separate hosting for game servers. Smaller company than AccelByte.

#### Nakama (Heroic Labs, open source)

**Pros:** Open-source game server with clustering. Handles auth, matchmaking, leaderboards, chat, notifications. Self-hostable.
**Cons:** Smaller scale proven than AccelByte. Less feature-complete for MMO requirements. Community edition limitations.

**Recommendation for CH:** AccelByte for metagame backend if the studio prefers managed services. Nakama if the studio prefers open-source self-hosted. The backend service handles everything outside the game simulation — accounts, friends lists, matchmaking, faction state, economy persistence.

---

### 4.5 Combat Networking

#### Client-Side Prediction with Server Reconciliation

**What it is:** The player's client predicts the outcome of their inputs immediately (movement, ability activation), making the game feel responsive. The server processes the same inputs authoritatively and sends corrections when the client's prediction diverges from server truth.

**Relevant to CH:** The soft-lock hybrid combat model benefits significantly from prediction. When a player activates an ability, the client immediately shows the animation and targeting reticle. The server validates the target lock ("was the target within lock-on range at server time?") and resolves damage. The lock itself is the hit check — this sidesteps the "favour the shooter vs favour the defender" debate because the soft-lock constraint is binary and server-verifiable.

**Shipped precedent:** Every modern multiplayer game with responsive combat (Fortnite, FFXIV, GW2, Destiny 2, Overwatch).

#### Hybrid Rollback for Local Actions

**What it is:** Standard rollback netcode (GGPO) does not scale to MMO contexts because it requires saving and restoring full game state per frame. However, a hybrid model applies rollback only to the local player's actions while using snapshot interpolation for remote entities. The local player sees their abilities execute instantly; remote players are interpolated smoothly with a small delay buffer.

**Relevant to CH:** This is the technique that makes soft-lock combat feel skill-based despite the networking overhead. The player's own dodge, ability cast, and combo input feel frame-responsive. Other players' actions are smoothly interpolated. The server resolves conflicts.

**Shipped precedent:** This specific hybrid model is documented in SnapNet's architecture and has parallels in how Overwatch handles local prediction vs remote interpolation.

#### Skill Expression Techniques for Soft-Lock Combat

Soft-lock does not mean "point and click." The following techniques, all shipped in production titles, create genuine skill expression within the soft-lock model:

- **Split-body animation** — upper body locked to attack target, lower body free to move. The player dodges and positions while attacking. Demonstrated in Ashes of Creation's combat prototype.
- **Directional modifiers** — attacking from behind deals bonus damage. Positioning becomes a skill. Standard in FFXIV (positional abilities for Monk, Dragoon, etc.).
- **Dodge i-frames with timing windows** — GW2's dodge system provides invincibility frames that reward timing. This is the primary skill expression mechanic in GW2 and has been copied widely.
- **Combo fields and finishers** — abilities interact when overlapping. GW2's combo system creates emergent depth.
- **Lock degradation** — lock-on weakens or breaks when the target moves at high speed, dashes, or enters cover. This creates a skill gap between players who maintain lock through movement and those who lose it.
- **Animation cancelling windows** — allowing players to cancel recovery frames of one ability into the startup of another creates a skill ceiling for combat optimisation.
- **Momentum-preserved dodges** — movement speed and direction at the moment of dodge affects the dodge trajectory. Creates depth in positioning.

---

## 5. Technical Specification

### 5.1 Overworld Zone Server

**Server Process:**
- Single UE5 dedicated server process per zone
- Target: 600 concurrent player connections
- Server tick rate: 20Hz (`NetServerMaxTickRate=20` in DefaultEngine.ini)
- Replication: Iris (primary) or Replication Graph (fallback)
- Staggered replication: the server does not replicate to all 600 connections every tick. Following the Fortnite model, it updates 50-100 connections per tick and rotates through the full set, with priority accumulation ensuring no connection is starved.

**Interest Management Configuration:**

Three distance tiers for player-to-player visibility:

| Tier | Distance | Update Frequency | Visual Fidelity | Network State |
|---|---|---|---|---|
| **Near** | 0-50m | 20Hz (full tick rate) | Full skeletal mesh, full animation, full effects | `DORM_Awake`, `NetPriority` 2.0 |
| **Mid** | 50-200m | 5Hz | Low-LOD mesh, simplified animation, reduced effects | `DORM_DormantPartial`, `NetPriority` 1.0 |
| **Far** | 200m+ | 1-2Hz | Impostor billboard (re-rendered every ~250ms) or culled | `DORM_DormantAll`, `NetPriority` 0.5 |

**Implementation in UE5:**
- Use `GridSpatialization2D` replication graph node for spatial culling
- Use `DynamicSpatialFrequency` node for distance-based update rate tiers
- Override `GetNetDormancy()` on player character actors to return `DORM_DormantAll` for connections beyond 200m
- Override `GetNetPriority()` to elevate combat participants to 3.0
- Use `FlushNetDormancy()` when a dormant player enters combat or performs a visible action

**Critical implementation note:** When any reliable RPC is queued on a connection, ALL property replication is blocked for that tick (documented by Steve Streeting, confirmed in UE5 source). Combat abilities should use unreliable RPCs with client-side confirmation for visual feedback, with the server sending authoritative results as property replication.

**Bandwidth Budget (per connection):**
- Near tier: ~50 players at 20Hz, ~20 bytes per update with delta compression = ~20 KB/s
- Mid tier: ~100 players at 5Hz, ~20 bytes = ~10 KB/s
- Far tier: ~450 players at 2Hz, ~10 bytes (position only) = ~9 KB/s
- Total per connection: ~39 KB/s (~312 kbps)
- Total server egress (600 connections): ~23 MB/s (~184 Mbps)
- Feasible on modern server hardware with a 1 Gbps NIC

### 5.2 Hub Sharding (Downtime)

**Trigger:** When the Downtime sub-region of a zone exceeds 150 concurrent players, the system spawns a new shard.

**Shard Routing Priority:**
1. Same party members
2. Same guild/faction
3. Friends list
4. Geographic proximity (players who entered from the same zone area)
5. Load balancing (distribute evenly across shards)

**Implementation:**
- A backend service (Redwood, custom Node.js, or AccelByte) manages shard state and player routing
- When a player enters Downtime, the router queries their social graph and assigns them to the shard containing the most connections
- If all shards with their social connections are at capacity, the player enters the least-loaded shard
- Players can manually request to join a friend's shard (button in social UI)

**Transition Mechanism:**
- Downtime is a sub-level within the zone, loaded via UE5 level streaming
- Shard transition uses `APlayerController::ClientTravel()` to a different server address
- Player state (inventory, appearance, position) is serialised to a fast cache (Redis) before transfer
- The receiving shard loads the player state from cache
- Total transition time target: under 2 seconds, masked by a brief camera animation (walking through a city gate, emerging from a tunnel)

**Downtime Design Considerations:**
- Five faction districts provide natural density distribution. Players congregate in their faction's district, spreading load.
- The Barbersmith (character customisation), House of Houses (User Space entrance), and shops are distributed across districts — not clustered in one plaza.
- Social activities in Downtime are networking-cheap: emotes, trading UI, chat, wardrobe changes. No physics, no projectiles, no AI combat. This is why the shard cap can be higher (150) than the combat ceiling.

### 5.3 Combat Networking

#### PvE Combat

**World Events (Corruption, World Bosses):**
- Open-world, within the overworld zone server
- Participants automatically receive elevated `NetPriority` (3.0)
- Server-side participation cap: when a world event exceeds 100 participants, the event stops accepting new participants (they can observe but not interact). This prevents a single event from consuming the zone server's entire bandwidth budget.
- AI enemies use MassAI for crowd NPCs (10,000+ lightweight entities) with traditional Actor-based AI for bosses and elite enemies

**Instanced PvE (Dungeons, Raids):**
- Separate UE5 dedicated server process per instance
- Tick rate: 30Hz
- Party size: 4-player dungeons, 8-player raids, 24-player alliance raids
- Spawned on demand by the orchestration layer (Agones, AccelByte AMS, or Redwood)
- Player transfer uses the same serialise-to-cache mechanism as hub sharding

#### PvP Combat

**Open-World PvP:**
- Operates within the overworld zone server with elevated priority
- Soft-lock target validation is server-authoritative: "was the target within lock-on range at the server-side timestamp?"
- No favour-the-shooter lag compensation needed — the soft-lock constraint is binary
- Anti-cheat: server-side statistical anomaly detection (hit rate, DPS, ability timing). Kernel-level anti-cheat (EasyAntiCheat, BattleEye) as a secondary layer

**Structured PvP (Arenas, Battlegrounds):**
- Separate dedicated server instances at 30Hz
- Arena: 3v3, 5v5
- Battleground: 15v15, 20v20
- Siege/Territory War: 50v50 or 100v100 on dedicated instances

**Large-Scale PvP (Siege/Territory War):**
- Dedicated instance, not on the overworld server
- 50v50 recommended as the baseline. 100v100 as aspirational.
- Tick rate: 20Hz (lower than arena due to player count)
- Simplified ability effects at scale — when participant count exceeds 60, VFX reduce automatically (GW2 WvW does this)
- Server-side, abilities that affect "all targets in radius" are capped to N nearest targets to prevent O(N^2) scaling

### 5.4 Client-Side Rendering Budget

The server can track 600 players, but the client cannot render 600 fully-animated skeletal meshes. The rendering budget:

| Distance | Representation | Max Count | Detail |
|---|---|---|---|
| 0-30m | Full LOD0 skeletal mesh | 50-80 | Full bone count, full animation blend, full material, full cosmetic detail |
| 30-100m | LOD2/3 reduced mesh | 100-150 | Reduced bone count (simplified spine, no finger bones), simplified animation, reduced material complexity |
| 100-300m | Impostor billboard | 200+ | UE5 Impostor Baker plugin generates octahedron impostors. Re-rendered every ~250ms. Faction colours visible. |
| 300m+ | Culled or dot indicator | Remainder | Not rendered. Optional minimap indicator. |

**Impostor implementation:** UE5's Impostor Baker plugin (available since 5.7) generates view-angle-dependent billboard textures from skeletal meshes. The impostor captures the character's current appearance (armour, cosmetics, faction colours) and renders it as a flat billboard that rotates to face the camera. From 100m+ in a third-person view, this is indistinguishable from a full mesh.

**Animation LOD:** UE5's animation LOD system reduces bone evaluation based on screen size. At distance, characters skip facial animation, finger animation, cloth simulation, and IK adjustments. This is configured per-skeletal-mesh in the animation blueprint.

### 5.5 NPC and AI Architecture

**Combat NPCs (bosses, elites, quest enemies):**
- Traditional UE5 Actors with full replication
- Behaviour Trees or StateTree for AI logic
- Full skeletal mesh, full animation
- Server-authoritative AI simulation
- Budget: 200-500 per zone alongside 600 players

**Crowd NPCs (ambient population, wildlife, merchants):**
- Mass Entity / MassAI framework
- ECS architecture: entities are lightweight data rows, processed in batches
- Server-side simulation with one-way replication to clients (no client input)
- Rendering via Instanced Static Mesh (ISM) for distant crowds
- Mass Replication LOD: per-entity per-client LOD determines replication frequency
- Budget: 2,000-5,000 Mass entities per zone

**Player characters remain traditional Actors.** Mass Entity does not support bidirectional replication needed for player input. The interaction boundary: Mass entities affect game state that player Actors read (e.g., NPC merchant inventory, ambient creature positions), but Mass entities are not Actors and cannot be targeted or interacted with through the standard Actor replication path.

### 5.6 Infrastructure and Deployment

```
┌─────────────────────────────────────────────────────────┐
│                    CLOUD INFRASTRUCTURE                  │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Zone Server │  │ Zone Server │  │ Zone Server │     │
│  │  (600 cap)  │  │  (600 cap)  │  │  (600 cap)  │    │
│  │  c6g.4xl    │  │  c6g.4xl    │  │  c6g.4xl    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Hub Shard 1 │  │ Hub Shard 2 │  │ Hub Shard 3 │    │
│  │  (150 cap)  │  │  (150 cap)  │  │  (150 cap)  │    │
│  │  c6g.2xl    │  │  c6g.2xl    │  │  c6g.2xl    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Dungeon  │  │ Dungeon  │  │ PvP Arena│  │ Siege  │ │
│  │ Instance │  │ Instance │  │ Instance │  │Instance│ │
│  │ c6g.xl   │  │ c6g.xl   │  │ c6g.xl   │  │c6g.4xl│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │           ORCHESTRATION LAYER                    │   │
│  │  Agones (server lifecycle) + Redwood (zones)     │   │
│  │  Redis (state transfer cache)                    │   │
│  │  PostgreSQL (persistent world state)             │   │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │           METAGAME BACKEND                       │   │
│  │  AccelByte or Nakama                             │   │
│  │  (Accounts, matchmaking, economy, social,        │   │
│  │   faction state, live ops, telemetry)            │   │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Zone server hardware profile:**
- CPU-bound workload (replication, game logic, AI)
- Compute-optimised instances (AWS c6g.4xlarge or equivalent: 16 vCPUs, 32 GB RAM)
- 1 Gbps+ network bandwidth
- One zone server per zone. Multiple zones per game world.

**Instance server hardware profile:**
- Smaller instances for dungeons/arenas (c6g.xlarge: 4 vCPUs, 8 GB RAM)
- Larger instances for siege mode (c6g.4xlarge equivalent)
- Spun up on demand, destroyed when empty
- Warm pool of pre-allocated instances for instant availability

**State persistence:**
- PostgreSQL for durable world state (player data, economy, faction state, corruption state)
- Redis for ephemeral state transfer (player state during shard/zone transitions, session cache)
- ScyllaDB or DynamoDB as alternative for high-throughput player state if PostgreSQL becomes a bottleneck

---

## 6. Expert Perspectives

### 6.1 Senior Network Engineer

**Assessment:** The 600-player overworld zone is achievable with aggressive interest management, but the margin is thin. The single biggest risk is the replication CPU budget — at 600 players, `NetBroadcastTickTime` will consume a significant portion of the 50ms budget (20Hz). The staggered replication model (50-100 connections per tick) is essential.

**Critical technical decisions for Mustafa's team:**
1. **Iris vs Replication Graph:** Decision needed in pre-production. Iris is the better choice for a new project but requires the team to learn a newer, less-documented system. Build a 100-player stress test prototype with both and measure.
2. **Reliable RPC discipline:** The reliable-RPC-blocks-all-replication bug in UE5 will cause intermittent lag spikes in dense zones if not managed. Establish a project-wide rule: combat abilities use unreliable RPCs. Only use reliable RPCs for critical state changes (item transactions, quest completion).
3. **Network dormancy tuning:** The difference between a zone that runs at 20Hz and one that runs at 8Hz is how aggressively dormancy is applied. Budget significant engineering time for dormancy profiling.
4. **Bandwidth monitoring:** Deploy per-connection bandwidth monitoring from day one. Set per-connection budgets and alert when exceeded. Problems at 100 players become catastrophic at 600.

**What to prototype first:** A 200-player stress test with simulated movement, ability activation, and interest management. If 200 runs cleanly at 20Hz with headroom, the architecture scales to 600. If it does not, investigate OmniMesh licensing before committing to a custom solution.

### 6.2 Level Designer

**Assessment:** The 600-player zone target directly constrains level design. Zones must be large enough that 600 players are naturally distributed, not clustered. Corridors and chokepoints are networking enemies.

**Zone design principles:**
1. **Open terrain with distributed points of interest.** No single POI should attract more than 100 players simultaneously. Corruption events, world bosses, gathering nodes, and quest objectives must be distributed across the zone.
2. **Downtime (main city) as a hub, not a destination.** Downtime should be a place players pass through, not camp in. The Barbersmith, shops, House of Houses entrance, and quest givers should be distributed across the five faction districts — not clustered in one central plaza. This naturally distributes density.
3. **Natural density barriers.** Use terrain, verticality, and distance to prevent 600 players from converging on one point. A mountain range between two halves of a zone means events on each side draw separate populations.
4. **Event radius design.** Corruption events and world bosses should have a defined interaction radius. Players beyond that radius can observe (low-LOD impostors) but cannot participate in the event's combat. This enforces the 100-participant soft cap on world events.
5. **Shard transition zones.** The boundary between "open zone" and "Downtime hub" should be a natural transition — a city gate, a bridge, a tunnel. This gives the system a ~2-second window to perform the shard assignment and state transfer during the transition animation.
6. **Faction districts as natural sharding boundaries.** Each of Downtime's five districts is a natural density cluster. If sharding is eventually needed at the district level (not just the city level), the districts provide ready-made boundaries.

### 6.3 Combat Designer

**Assessment:** The soft-lock hybrid model is the right choice for this architecture. It provides the networking headroom needed for large encounters while allowing genuine skill expression.

**Combat system requirements for the networking architecture:**

1. **Soft-lock target validation must be server-authoritative.** The client requests a lock, the server validates range and line-of-sight, the client receives confirmation. Lock range should be tuned per weapon type (melee: 5m, ranged: 30m, spells: 20m).

2. **Skill expression through positioning, not aim.** The soft-lock handles target selection. The player's skill expression comes from:
   - Positional attacks (bonus damage from flanking/rear, as in FFXIV Monk/Dragoon)
   - Dodge timing (i-frames with precise windows, as in GW2)
   - Combo sequencing (ability chains that reward correct order)
   - Lock management (maintaining lock through target movement, breaking enemy locks through dash/cover)

3. **Ability effects must be networking-friendly.** Abilities that affect "all enemies in radius" must cap at N targets (e.g., 8-12) to prevent O(N^2) scaling in large encounters. This is a game design decision that the combat designer must make early, not a runtime optimisation added later.

4. **Visual degradation at scale must be designed, not accidental.** When a world event has 80+ participants, ability VFX should automatically simplify (fewer particles, shorter durations, merged effects). GW2 WvW does this. The combat designer should define VFX tiers as part of the ability design pipeline, not leave it to artists to optimise after the fact.

5. **Death and respawn must not break the networking model.** When a player dies, their actor should go dormant (stop replicating) immediately. Respawn should place them at the nearest safe location, not at the combat site — this prevents the "death ball" pattern where players die and respawn at the same overcrowded location.

6. **PvP lock rules.** In open-world PvP, soft-lock on hostile players should require opt-in (flagging). In structured PvP, all opposing players are lockable. The flag state is a single boolean replicated at low priority — cheap networking cost for significant gameplay impact.

### 6.4 Product Manager

**Assessment:** The 600-player zone is a product differentiator that must be communicated carefully. "We can have 600 players in a zone" is a tech claim. "You will always see other players in the world — it never feels empty" is a product claim. Lead with the experience, not the number.

**Product requirements:**

1. **The world must feel populated from day one.** If the game launches with 10,000 concurrent players across 20 zones, that is 500 per zone — already close to the 600 target. But if concurrency drops to 2,000, that is 100 per zone. The architecture must make 100 players feel populated (concentrated near POIs, NPC crowd density filling gaps) — not just handle 600.

2. **Social connection preservation is non-negotiable.** When the system shards Downtime, it must keep friends and faction members together. Breaking social connections to serve load balancing destroys the social experience. Priority order: party > guild > friends > faction > geography > load balance.

3. **The "empty world" risk.** Palia's failure was not a technical failure — it was a product failure. They built a social game where the social spaces felt empty. If CH targets 600 but launches with 100, the level design must make 100 players feel like a crowd. Dense NPC populations (via MassAI), ambient events, and concentrated POI layouts solve this.

4. **Milestone targets:**
   - Prototype: 200-player stress test validating the architecture
   - Alpha: 300-player zones functional with interest management
   - Beta: 600-player zones, hub sharding, instanced content
   - Launch: Full architecture running at target scale

5. **Risk mitigation:** If 600 per zone proves unachievable at acceptable quality, the fallback is 200-300 per zone with seamless megaserver-style zone instancing (GW2/FFXIV model). The architecture supports both paths without redesign. The zone management and sharding infrastructure works identically at 200 or 600 — only the interest management and server hardware profile change.

### 6.5 Full Stack Engineer

**Assessment:** The backend infrastructure is the most straightforward layer. Zone servers, instance servers, orchestration, and metagame backend are all well-understood problems with off-the-shelf solutions. The complexity lives in the UE5 networking layer, not the backend.

**Infrastructure recommendations:**

1. **Containerise everything.** Zone servers, instance servers, and backend services all run in containers on Kubernetes. Agones manages game server lifecycle. This enables horizontal scaling, zero-downtime deployment, and consistent environments across dev/staging/production.

2. **State transfer via Redis.** When a player moves between zones, shards, or enters instanced content, their state is serialised to Redis with a TTL of 60 seconds. The receiving server reads from Redis and hydrates the player. This decouples the two server processes — they never communicate directly.

3. **Persistent world state in PostgreSQL.** Corruption state, faction territory control, economy state, and player progression are in Postgres. Zone servers read corruption state on boot and write changes periodically (every 30 seconds). Player data is written on disconnect and on significant state changes (level up, item acquisition).

4. **Telemetry from day one.** Per-zone player counts, per-connection bandwidth, server tick time, replication time, and combat event participation must be logged and dashboarded. The difference between "600 players works" and "600 players causes a cascade failure" is often visible in telemetry 15 minutes before players notice.

5. **Blue-green deployment for zone servers.** When deploying a server update, spin up new zone servers alongside old ones. Migrate players during natural zone transitions (enter Downtime, enter a dungeon). This prevents the "everyone disconnects for a patch" pattern.

6. **Cost model:** A zone server running 24/7 on a c6g.4xlarge equivalent costs approximately $500-700/month on AWS (compute optimised, reserved pricing). A game world with 10 zones, 20 hub shards, and 50 instance servers at peak would be in the $15,000-25,000/month range for compute — well within reasonable MMO operating costs. Bandwidth costs (egress at ~184 Mbps per zone server) add approximately $5,000-10,000/month at scale. Total infrastructure: $20,000-35,000/month at full population. This scales down proportionally with player count.

---

## 7. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| **Single zone server cannot sustain 20Hz at 600 players** | High | Prototype and stress test at 200 players early. If the ceiling is lower than 600, fall back to megaserver-style zone instancing (200-300 per instance) or evaluate OmniMesh licensing. |
| **Hub sharding breaks social connections** | High | Social-graph-aware routing as the primary shard assignment criterion. Manual shard-switch UI for players. Extensive testing with simulated friend clusters. |
| **Iris instability in production** | Medium | Maintain Replication Graph as a fallback implementation. Iris is Beta in UE 5.7 — lock the engine version and do not upgrade mid-production. |
| **Reliable RPC blocking causes lag spikes** | Medium | Establish project-wide RPC discipline in pre-production. Code review gate: no reliable RPCs in combat code paths. |
| **Client rendering cannot handle 80+ nearby characters** | Medium | Impostor billboard system and animation LOD must be implemented early. Test on minimum-spec hardware. |
| **Combat at 100+ participants feels chaotic** | Medium | Design ability VFX tiers from the start. Cap AoE abilities at N targets. Playtest large encounters early and often. |
| **OmniMesh vendor dependency** | Medium | Only relevant if OmniMesh is selected. Negotiate source code access in the licensing agreement. |
| **Player count at launch is too low to fill 600-player zones** | High | Level design must make 100 players feel populated. NPC crowds via MassAI. Concentrated POI layout. Megaserver-style zone merging when population is low. |
| **Cross-server state transfer loses player data** | High | Redis write-ahead log with TTL. Verification handshake: receiving server confirms state loaded before source server releases the player connection. Rollback mechanism if transfer fails. |
| **Bandwidth costs scale unexpectedly** | Low | Monitor per-connection bandwidth from day one. Delta compression and interest management keep per-connection costs predictable. |

---

## 8. Recommendations and Next Steps

### Immediate (Pre-production)

1. **Build a 200-player stress test prototype.** A minimal UE5 dedicated server with 200 simulated clients, interest management, and combat-priority networking. Measure server tick time, per-connection bandwidth, and replication CPU cost. This validates the architecture before committing to it.

2. **Decide Iris vs Replication Graph.** Build the stress test with both and compare. If Iris delivers meaningful headroom at 200 players, commit to it. If not, use Replication Graph with the understanding that migration to Iris may be needed later.

3. **Evaluate OmniMesh.** Contact StarVault for licensing terms and technical evaluation. OmniMesh is the only proven path to 500+ players in seamless combat on UE5. If the licensing is viable, it could accelerate the networking layer significantly. If not, the custom approach using Iris/Replication Graph with the architecture described in this proposal is the path.

4. **Evaluate Redwood.** Prototype zone management and player transfer using Redwood. If it handles the orchestration layer well, it saves significant backend engineering. If not, build a custom orchestration layer using Agones and NodeJS.

### Production

5. **Implement interest management and dormancy system.** This is the core of the 600-player architecture. Budget significant engineering time for tuning — the difference between a playable zone and a slideshow is in the dormancy thresholds and priority curves.

6. **Implement hub sharding for Downtime.** Build the social-graph-aware shard router. Test with simulated social clusters.

7. **Build instanced content pipeline.** Dungeons, arenas, and siege instances as on-demand server processes. Integrate with Agones or AccelByte AMS.

### Ongoing

8. **Continuous stress testing.** Run 600-player stress tests in CI. Automated performance regression detection. Any change that degrades server tick rate is a blocking issue.

9. **Telemetry-driven tuning.** Interest management thresholds, dormancy distances, and priority curves should be data-driven and tunable without code changes (config files or remote config service).

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **Interest Management** | Server-side system that determines which actors each player connection needs to know about. Reduces networking cost by only sending relevant data. |
| **Network Dormancy** | UE5 feature that stops an actor from replicating entirely when it is not relevant to any connection. Dormant actors consume zero replication CPU. |
| **Priority Accumulation** | UE5 mechanism where actors that have not been replicated recently accumulate priority, ensuring they eventually receive an update even under bandwidth pressure. |
| **Replication Graph** | UE5 plugin that replaces default relevancy checks with a spatial partitioning node tree. |
| **Iris** | UE5's next-generation push-based replication system, in Beta as of UE 5.7. |
| **Server Meshing** | Technique where multiple server processes each own a spatial region of one logical world, with seamless authority handoff as entities cross boundaries. |
| **Shard** | A parallel instance of the same game area. Players in different shards cannot see each other. |
| **Tick Rate** | How many times per second the server processes game logic and replication. 20Hz = 20 times per second = 50ms per tick. |
| **Delta Compression** | Sending only the difference between the current state and the last-acknowledged state, reducing bandwidth. |
| **Impostor Billboard** | A flat image rendered from a 3D character that replaces the full mesh at distance. View-angle-dependent using octahedron mapping. |
| **MassAI / Mass Entity** | UE5's ECS-based system for simulating thousands of lightweight entities (NPCs, crowds) alongside traditional Actors. |
| **Soft-Lock Combat** | Combat where target selection is assisted (the game helps you lock onto targets) but positioning, timing, and ability sequencing provide skill expression. |

## Appendix B: Technology Decision Matrix

| Decision | Option A | Option B | Option C | Recommendation |
|---|---|---|---|---|
| **Replication Layer** | Iris (Beta, higher ceiling) | Replication Graph (Stable, proven) | — | Iris, with Rep Graph as fallback |
| **Server Meshing** | OmniMesh (licensed, proven) | Custom build | None (single-server + sharding) | Evaluate OmniMesh; fall back to single-server + sharding |
| **Zone Orchestration** | Redwood (UE5-native, open source) | Custom (NodeJS + Agones) | AccelByte AMS | Redwood prototype; custom if insufficient |
| **Server Hosting** | AWS GameLift | Edgegap | Agones on GCP/AWS | Agones for flexibility; GameLift if AWS-committed |
| **Metagame Backend** | AccelByte (managed) | Nakama (open source) | Pragma | AccelByte for managed; Nakama for self-hosted |
| **Combat Model** | Soft-lock with skill expression | Full action combat | Tab-target | Soft-lock (best networking/feel balance) |

## Appendix C: Referenced Sources

The following sources informed this proposal. Figures cited from these sources represent their published claims and testing results, not independently verified measurements by NBI.

**UE5 Networking:**
- Epic Games — Iris Replication System documentation (UE 5.7)
- Epic Games — Replication Graph documentation
- BorMor — "Iris: One Hundred Players" stress test report
- Vorixo — Network Managers pattern, Iris filtering tutorial
- Steve Streeting — UE5 network saturation analysis
- Cedric Neukirchen — Unreal Multiplayer Compendium

**Server Meshing and Middleware:**
- StarVault — OmniMesh documentation
- Redwood — MMO Framework documentation
- Agones — Kubernetes game server management (Google/Ubisoft)

**Shipped Title Architectures:**
- Singularity 6 — Palia architecture blog (AWS case study)
- Square Enix — FFXIV field instance documentation
- ArenaNet — GW2 WvW restructuring blog
- Intrepid Studios — Ashes of Creation server meshing previews
- Cloud Imperium Games — Star Citizen server meshing documentation

**Combat Networking:**
- Gabriel Gambetta — Client-Side Prediction and Server Reconciliation
- Glenn Fiedler (mas-bandwidth.com) — Network model selection guide
- SnapNet — Hybrid rollback architecture documentation
- David Dehaene — Delta Rollback optimisation paper

**Cloud Infrastructure:**
- AWS — GameLift documentation
- Edgegap — Server hosting documentation and comparison reports
- AccelByte — Armada Multiplayer Servers documentation
