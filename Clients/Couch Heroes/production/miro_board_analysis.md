# Miro Board Analysis: Couch Heroes Game Production Plan

**Board URL:** https://miro.com/app/board/uXjVHX6wqnQ=
**Analysis date:** 2026-05-12
**Data source:** Miro board_list_items API (2 pages) + context_get per org_chart

---

## 1. Total Item Count and Pagination Status

| Metric | Value |
|---|---|
| Total items reported by API | 1,314 |
| Page 1 items | 1,000 |
| Page 2 items | 314 |
| has_more after page 2 | **False** (all items retrieved) |
| nextCursor after page 2 | null |

**All 1,314 items have been retrieved across 2 API pages.**

---

## 2. Count by Item Type

| Type | Count | Description |
|---|---|---|
| user_card | 1,229 | Production hierarchy items (Epics, Features, Stories, Tasks, Subtasks) |
| text | 36 | Free-text blocks (ENV art estimates, reference material) |
| sticky_note | 19 | Epic row labels and design notes |
| shape | 19 | Legend/key items and misc |
| org_chart | 10 | Container widgets -- one per Epic row |
| frame | 1 | "Nikos little Concept Team Note-Corner" |
| **TOTAL** | **1,314** | |

### User Card Position Analysis

| Position | Count | Meaning |
|---|---|---|
| At origin (0, 0) | 1,213 | Children of org_chart widgets (content not exposed by list API) |
| Real canvas positions | 16 | Standalone cards in ENV template area / Player Build vicinity |

**Critical limitation:** The Miro `board_list_items` API returns user_cards inside org_chart widgets with empty `data` fields and position (0, 0). Their actual content (title, description, fillColor) is only accessible via individual item fetch or the `context_get` endpoint, which returns AI-generated summaries rather than raw structured data. The hierarchy below is reconstructed from those summaries.

---

## 3. Board Layout and Colour Legend

### Colour Coding (from legend at x~-8000)

| Colour | Hex | Meaning |
|---|---|---|
| Orange | #fe9f4d | EPIC |
| Green | #2dc75c | FEATURE |
| Blue | #659df2 | STORY |
| Purple | #dedaff / #8f7fee | TASK |
| White | #ffffff | SUB-TASK |
| Red | #ff6464 | MISSING BID |
| Grey | #b0b0b0 | NOT FOR VS (Vertical Slice), DONE, or ART |

### Tiers of Completion (from legend)

| Tier | Definition |
|---|---|
| T0 | Ideation |
| T1 | R&D |
| T2 | GDD done, TDD done, art brief |
| T3 | Prototype -- functional with no skins, can be bugged |
| T4 | MVP -- limited quality but full featured |
| T5 | Feature complete at quality |
| T6 | Player tested, feedback to quality (playtest, alpha, beta, telemetry) |
| T7 | Expand / add to feature / content etc |
| T8 | Scale to production optimisation post load |

---

## 4. Epic Hierarchy -- Full Breakdown

The board contains **10 org_chart widgets**, each representing one Epic row. They are arranged vertically at x=-8874 with sticky_note labels at x=-9020.

### Epic Row Mapping (sorted by Y position)

| # | Org Chart ID | Y Position | Epic Name | Label Y |
|---|---|---|---|---|
| 1 | 3458764671354966026 | 2,053 | PLAYER BUILD | 2,190 |
| 2 | 3458764671375403999 | 2,663 | WORLD SYSTEMS (ENV) | 2,800 |
| 3 | 3458764671375404752 | 3,328 | WORLD SYSTEMS (THE REST) | 3,466 |
| 4 | 3458764671355718074 | 4,240 | COMBAT | 4,367 |
| 5 | 3458764671355843518 | 4,940 | USER SPACE | 5,077 |
| 6 | 3458764671356431750 | 5,380 | ITEMS & INVENTORY | 5,517 |
| 7 | 3458764671356982463 | 5,980 | QUEST SYSTEM | 6,117 |
| 8 | 3458764671356617572 | 6,460 | PLAYER ECONOMY | 6,597 |
| 9 | 3458764671357106374 | 6,923 | SOCIAL & MULTIPLAYER | 7,060 |
| 10 | 3458764671356811372 | 7,508 | THE REST (Game Bibles) | 7,645 |

---

### Epic 1: PLAYER BUILD (y=2053)

**Note:** The context_get API returned minimal data for this org_chart. Based on the hours_mapping.txt, this epic covers:

**Features identified from hours_mapping:**
- Player Account Authentication (15D)
- Player Account Creation/Deletion (10D)
- Player Account Privacy Settings & Legal (10D)
- Player Progression (34D)
- Character Creation & Customisation (40D)
- Skill System (82D)
- FTUE / Tutorial Cave Segment (85D)
- Player Dashboard features (Friends 30D, Game Dashboard 30D, Marketplace 30D, Player Account Features 30D, Search & Notifications 30D)
- Developer Dashboard features (Developer Account 0D, Game Dashboard 0D)
- Social Media Support (20D)
- Achievements & Trophies (57D)

---

### Epic 2: WORLD SYSTEMS - ENV (y=2663)

**Hierarchy from context_get (209 items):**

| Level | Type | Count |
|---|---|---|
| 0 | Epic | 1 -- World Systems (ENV) |
| 1 | Feature | 20 |
| 2 | Story | 47 |
| 3 | Task | 109 |
| 4 | Sub-task | 33 |

**Features:**
- Portal Peak
- Portal Dimension
- Arena
- User Space Islands (1 & 2)
- Dungeons
- Downtime
- The Two Hills (1 & 2)
- Drifter's Cross
- Architecture Kits (Fantasy, Green Faction, Mythcore, Graveyard)
- Props, Furniture, Natural/Vegetation
- Corruption systems (Foam, Time, Vines)
- Navigation, Water, Lighting, Atmospherics, VFX Tech
- Guild House, Partner Portal
- Maps, Compass/Mini-map, Markers

**Art-specific estimates from free text blocks (ENV section, x < -9000):**

| Asset | Hours Estimate |
|---|---|
| Architecture Kit - Mythcore | 40-80h |
| Architecture Kit - Mythcore Ruins | 40-80h |
| Architecture Kit - Fantasy | 480-800h |
| Architecture Kit - Guild Hall | 580-945h |
| Architecture Kit - Player Housing | 460-800h |
| Architecture Kit - Arena | 240-800h |
| Architecture Kit - Deck/Scaffolding | 80-120h |
| Architecture Kit - Wooden Camp | 120-160h |
| FTUE Cave | 224h |
| Downtime Zone | 648-800h |
| New Zone | 568-648h |
| Player Island 1 | 488h |
| Player Island 2 | 488h |
| Guild Island | 488h |
| Arena | 400-640h |
| Dungeon (1 medium) | 480h |
| Portal Dimension | 200h |
| Bug Dungeon | 80-120h |
| Tower Interior | 320-420h |
| Rock Kits | 192h |
| Player Buildings | 480h |
| Guild Buildings | 240-480h |
| Props - Gritcore | 200-400h |
| Props - Fantasy Exterior | 200-400h |
| Furniture - Fantasy | 40h |
| Furniture - Gritcore | 320h |
| Biomes - Cave | 350-400h |
| Biomes - New Zone | 350-400h |
| Biomes - Downtime | 350-400h |

**Additional POI estimates (from page 2 text items):**

| POI | Hours Estimate |
|---|---|
| Tower Exterior (Epic POI) | 568-640h |
| The Big Battle Hill (Epic POI) | 568-640h |
| Cave Interior (Med POI) | 224-300h |
| Waterfall Beauty (Small POI) | 80-120h |
| Bridge (Small POI) | 80-120h |
| Drifter's Cross (Small POI) | 320h |
| 1 Biome breakdown | 350-400h (Proxy 40h, 4 Large 160h, 4 Med 64h, 4 Small 32h) |

---

### Epic 3: WORLD SYSTEMS - THE REST (y=3328)

**Hierarchy from context_get:**

Covers player systems, NPCs, environmental features, and cinematics that are NOT environment art.

**Features identified:**
- Player locomotion, traversal, interactions
- NPC systems (critters, heroes, faction NPCs)
- Dungeon mechanics
- Dynamic weather
- Day/Night cycle
- Cinematics (various types of cutscenes)
- Instancing
- Bosses

**Matching features from hours_mapping:**
- NPCs: 80D (Animator 60D, Character Rigger 20D)
- Enemies Art: 175D
- Day/Night cycle: 39D
- Dynamic weather: 202D
- Dungeon Mechanics: 20D
- Instancing: 135D
- FTUE (tutorial cave segment): 85D
- Mounts/Pets: 50D

---

### Epic 4: COMBAT (y=4240)

**Hierarchy from context_get:**

Comprehensive combat system breakdown including enemies, abilities, AI, magic, and balance.

**Features identified:**
- Combat Framework
- Combat Abilities
- Combat AI Behaviour
- Magic system
- Ranged Combat
- PvP Combat
- Combat Balance & Telemetry
- Enemy types (Carapax, Wolves, Skeletons, Slimes, Goblins)

**Matching features from hours_mapping:**
- Combat framework: 165D
- Combat Abilities: 137D
- Combat AI behaviour: 101D
- Magic: 140D
- Ranged combat: 60D
- PvP combat: 24D
- CombatBalance & Telemetry: 40D
- Enemies Art: 175D

---

### Epic 5: USER SPACE (y=4940)

**Hierarchy from context_get (28 items):**

| Level | Type | Count |
|---|---|---|
| 0 | Epic | 1 |
| 1 | Feature | 9 |
| 2 | Story | 5 |
| 3 | Task | 13 |

**Features:**
- User Space Interior
- Modular Houses (House Kits for Players)
- User Space Server & Instance
- P2P/P2G User Space Connection
- Island
- Anywhere Door
- Saving House Layouts
- Partner Portal System (Player Housing)
- Arcade Cabinet

**NOT FOR VS:** P2P/P2G User Space Connection (some items)

**Matching features from hours_mapping:**
- User Space Server & Instance: 60D
- P2P/P2G User Space Connection: 31D
- Anywhere Door: 25D
- Saving House Layouts: 30D
- Partner Portal: 42D
- Building Houses: 65D
- User space Decoration: 81D
- Guild House: 26D

---

### Epic 6: ITEMS & INVENTORY (y=5380)

**Hierarchy from context_get (45 items):**

| Level | Type | Count |
|---|---|---|
| 0 | Epic | 1 |
| 1 | Feature | 10 |
| 2 | Story | 8 |
| 3 | Task | 21 |
| 4 | Sub-task | 6 |

**Features:**
- Banks (Exterior only)
- Consumables
- Item Core System
- Equipment System
- Pets
- Loot Distribution
- Inventory System
- P2P Item Transfer (NOT FOR VS)
- Durable Items (NOT FOR VS)
- Mounts (NOT FOR VS)

**Matching features from hours_mapping:**
- Banks: 27D
- Consumables: 9D
- Item Core System: 30D
- Equipment System: 90D
- Loot Distribution: 73D
- Inventory System: 82D
- P2P Item Transfer: 30D

---

### Epic 7: QUEST SYSTEM (y=5980)

**Hierarchy from context_get:**

| Level | Type | Count |
|---|---|---|
| 0 | Epic | 1 |
| 1 | Feature | 13+ |
| 2 | Story | ~6 |
| 3 | Task | ~15 |
| 4 | Sub-task | ~6 |

**Features:**
- 8 Quest Types (Courier, Escort, Kill, Collect, Research, Time Objectives, Partner Quest, Corruption)
- Quest Multiplayer
- Quest Item
- Quest Reward System
- Quest Log
- Quest Dialog GUI
- Quest Narrative Content
- Quests Backend/Tooling
- Targeted VO

**NOT FOR VS:** Dialogue/Quest Cinematics, Meta Quest System, Quest Generator System

**Matching features from hours_mapping:**
- Quests: Courier, Escort, Kill, Collect, etc.: 35D
- Quest Multiplayer: 65D
- Quest Item: 17D
- Quest reward system: 30D
- Quest log: 30D
- Quest dialog GUI: 40D
- Quest Narrative Content: 34D
- Quests Backend/Tooling: 60D
- Quest Tracking: 20D
- Quests as Events: 60D
- Targeted VO: 32D

---

### Epic 8: PLAYER ECONOMY (y=6460)

**Hierarchy from context_get (25 items):**

| Level | Type | Count |
|---|---|---|
| 0 | Epic | 1 |
| 1 | Feature | 8 |
| 2 | Story | 4 |
| 3 | Task | 12 |

**Features:**
- Trading System
- Virtual Currency System (VC)
- Garment Shop
- Partner Shop
- In Game Economy
- RMT In Game Monitoring System
- In Game Store
- Auction House

**Matching features from hours_mapping:**
- Trading System: 83D
- Virtual Currency (VC) System: 64D
- Garment Shop: 53D
- Partner Shop: 53D
- In game Economy: 120D
- RMT game Economy: 60D
- In-game Store: 60D
- Auction House: 120D

---

### Epic 9: SOCIAL & MULTIPLAYER (y=6923)

**Hierarchy from context_get (43 items):**

| Level | Type | Count |
|---|---|---|
| 0 | Epic | 1 |
| 1 | Feature | 10 |
| 2 | Story | 4 |
| 3 | Task | 8 |
| 4 | Sub-task | 20 |

**Features:**
- Game Chat System (approved)
- In-Game Mail (approved)
- Guild Systems (approved)
- Co-Op/Party (approved)
- Dueling (NOT FOR VS)
- Notifications (NOT FOR VS)
- Player Config PVP Server (NOT FOR VS)
- LFG/PUG / Pickup Groups (NOT FOR VS)
- Friends (NOT FOR VS)
- Co-Op/Raids (NOT FOR VS)

**Matching features from hours_mapping:**
- Game Chat System: 93D
- In-game mail: 37D
- Guilds System: 71D
- Co-op/Party: 75D
- Co-op/Raids: 40D
- Notifications: 30D
- LFG / Pick up groups: 40D
- Friends: 50D

---

### Epic 10: THE REST -- Game Bibles (y=7508)

**Hierarchy from context_get (22 items):**

| Level | Type | Count |
|---|---|---|
| 0 | Root | 1 -- "THE GAME" (Vertical Slice 2026) |
| 1 | Epic | 6 |
| 2 | Feature | 6 |
| 3 | Document | 9 |

**Features:**
- **Active for VS (green):** UX/UI Bible, Art Bible, Accessibility Bible, Brand Bible
- **NOT FOR VS (red):** Platform, Live Service Game, Partner Build, Product Publishing, Red Books (Emergency Bible)
- **NOT FOR VS (blue):** Monetisation Bible
- **Art/Design documents (purple):** Colour Palette, Typography, Wireframes, ENV Bible, ANIM Bible, CHAR Bible, VFX Bible, CONCEPT Bible, Game Logo

**Time estimates:** Typography/Wireframes/Colour Palette (40-60h each), Game Logo (80-100h)

**Matching features from hours_mapping:**
- Monetization Bible: 40D
- Red Books (emergency guidelines for Live Service): 30D

---

## 5. Items with Numeric Estimates

### From hours_mapping.txt (78 features with day estimates)

The hours_mapping.txt contains 78 features with day-based estimates totalling the full production scope. See hours_mapping.txt for the complete list.

### From Miro text blocks (ENV art estimates in hours)

All ENV art estimates are listed in the Epic 2 section above. These are **additional to** the hours_mapping features -- they represent environment art production that sits alongside the game systems development.

### Task-level estimates mentioned in org_chart summaries

Multiple org_charts report task-level hour estimates within the cards:
- UI tasks: 2h to 80h range
- Concept Art tasks: 5h to 112h range
- Character Modelling: 24-32h
- Animation: 16-24h
- Tech Art: 32-48h
- Environment tasks: various
- VFX tasks: various

---

## 6. Items Flagged as MISSING BID (Red)

The legend defines red (#ff6464) as "MISSING BID". From the context_get summaries, specific items flagged with red fill or red borders include:

**Quest System:**
- Dialogue/Quest Cinematics
- Meta Quest System  
- Quest Generator System

**Social & Multiplayer:**
- LFG/PUG (Pickup Groups) -- red border
- Friends -- red border
- Co-Op/Raids -- red border

**Note:** The red colouring in org_charts sometimes indicates "NOT FOR VS" rather than strictly "MISSING BID". The red sticky notes near the frame (x=200-300, y=76-156) are concept art notes, not missing bids.

The legend shape at x=-7890, y=1028 with fill=#ff6464 explicitly says "MISSING BID".

---

## 7. Items Marked NOT FOR VS (Grey / Excluded)

Based on org_chart summaries, the following features are explicitly excluded from the Vertical Slice:

| Epic | Feature | Status |
|---|---|---|
| Items & Inventory | P2P Item Transfer | NOT FOR VS |
| Items & Inventory | Durable Items | NOT FOR VS |
| Items & Inventory | Mounts | NOT FOR VS |
| Quest System | Dialogue/Quest Cinematics | NOT FOR VS |
| Quest System | Meta Quest System | NOT FOR VS |
| Quest System | Quest Generator System | NOT FOR VS |
| Social & Multiplayer | Dueling | NOT FOR VS |
| Social & Multiplayer | Notifications | NOT FOR VS |
| Social & Multiplayer | Player Config PVP Server | NOT FOR VS |
| Social & Multiplayer | LFG/PUG | NOT FOR VS |
| Social & Multiplayer | Friends | NOT FOR VS |
| Social & Multiplayer | Co-Op/Raids | NOT FOR VS |
| The Rest | Platform | NOT FOR VS |
| The Rest | Live Service Game | NOT FOR VS |
| The Rest | Partner Build | NOT FOR VS |
| The Rest | Product Publishing | NOT FOR VS |
| The Rest | Red Books (Emergency Bible) | NOT FOR VS |
| The Rest | Monetisation Bible | NOT FOR VS |

The hours_mapping.txt also records 3 excluded grey items: In Game Cinematic (IGC), Meta quest system, Quest Generator system.

---

## 8. Comparison: Miro Board vs hours_mapping.txt

### hours_mapping.txt Summary
- **78 features** with day estimates
- **3 excluded** (Not for VS): In Game Cinematic (IGC), Meta quest system, Quest Generator system
- **25 unmatched grey boxes** (role labels, zone details, ENV estimate breakdowns)

### Coverage Comparison

**Features in hours_mapping.txt that appear in Miro org_charts:**

All 78 estimated features from hours_mapping.txt can be traced to one of the 10 Miro epic rows. The mapping is:

| Epic | Features in hours_mapping |
|---|---|
| Player Build | ~13 features (Player Account, Progression, Character Creation, Skill System, FTUE, Dashboards, Achievements, Social Media Support) |
| World Systems (ENV) | ~5 features (Partner Portal, Guild House, User space Decoration, Day/Night cycle as ENV component) |
| World Systems (THE REST) | ~8 features (NPCs, Enemies Art, Day/Night, Dynamic weather, Dungeon Mechanics, Instancing, Mounts/Pets, FTUE) |
| Combat | ~7 features (Combat framework, Abilities, AI behaviour, Magic, Ranged, PvP, Balance & Telemetry) |
| User Space | ~7 features (Server & Instance, P2P Connection, Anywhere Door, Saving Layouts, Building Houses, Partner Portal) |
| Items & Inventory | ~7 features (Banks, Consumables, Item Core, Equipment, Loot Distribution, Inventory, P2P Transfer) |
| Quest System | ~11 features (Quest types, Multiplayer, Item, Reward, Log, Dialog GUI, Narrative, Backend/Tooling, Tracking, Events, VO) |
| Player Economy | ~8 features (Trading, VC System, Garment/Partner Shop, Economy, RMT, Store, Auction House) |
| Social & Multiplayer | ~8 features (Chat, Mail, Guilds, Co-op Party/Raids, Notifications, LFG, Friends) |
| The Rest | ~2 features (Monetization Bible, Red Books) |

### Key Differences

1. **Structure:** hours_mapping.txt is flat (feature -> days by role). The Miro board has a 5-level hierarchy (Epic -> Feature -> Story -> Task -> Subtask).

2. **Estimate units:** hours_mapping uses **days (D)**. Miro task-level cards use **hours (h)**. The ENV art text blocks also use hours.

3. **ENV art estimates:** The Miro board contains extensive environment art hour estimates (architecture kits, biomes, POIs, zones) in free-text blocks that are NOT represented in hours_mapping.txt. These appear to be a separate art production track.

4. **Professions feature:** hours_mapping lists "Professions: 0D total" -- this may not yet appear in the Miro board or may be captured under a different name.

5. **"For VS we need LG planned out...":** hours_mapping has this as a 10D UI/UX Designer item. It appears to be a meta-requirement rather than a feature.

6. **NOT FOR VS alignment:** hours_mapping excludes 3 items (IGC, Meta quest system, Quest Generator system). The Miro board excludes at least 18 features from VS scope -- significantly more aggressive scoping.

7. **Missing from Miro summaries (may exist in card detail):**
   - Garment System (110D) -- likely under Items & Inventory or Player Economy
   - The Dungeon (100D) -- likely under Combat or World Systems
   - Quests as Events (60D) -- likely under Quest System
   - Quest Tracking (20D) -- likely under Quest System
   - [Player Dashboard] features (5 x 30D each) -- likely under Player Build

---

## 9. Data Quality and Limitations

### API Limitations
1. **user_card content not available:** The Miro `board_list_items` endpoint returns user_card items inside org_charts with **empty data fields**. All 1,213 org_chart child cards have no title, description, or fillColor in the API response.

2. **context_get returns AI summaries:** The alternative `context_get` endpoint returns AI-generated text summaries of each org_chart, not structured JSON. This means exact card-level data (individual titles, colours, hour estimates per card) cannot be extracted programmatically.

3. **One org_chart failed:** The PLAYER BUILD org_chart (id=3458764671354966026) returned minimal/unusable content from context_get.

### Recommendations for Complete Data Extraction
1. **Use Miro's get_specific_item API** for each of the 1,213 user_card IDs to retrieve their individual content, title, and style fields.
2. **Use the org_chart DSL endpoint** if available via the Miro API to get the hierarchy structure with parent-child relationships.
3. **Export from Miro directly** -- the board can be exported as CSV or JSON from the Miro UI, which would include all card content.

### What We Have vs What We Need

| Data Point | Available? | Source |
|---|---|---|
| Total item count | Yes | API pagination |
| Item types and counts | Yes | API |
| Epic names and structure | Yes | Sticky note labels + org_chart positions |
| Feature names per epic | Partial | context_get summaries (not all cards named) |
| Story/Task/Subtask names | Partial | context_get summaries |
| Colour per card | No | API returns empty style for org_chart children |
| Hour estimates per card | Partial | Mentioned in summaries, not structured |
| NOT FOR VS flags | Partial | Mentioned in summaries |
| MISSING BID items | Partial | Red items mentioned in summaries |
| Full hierarchy with IDs | No | Would require individual item fetches |

---

## 10. Summary Statistics

| Metric | Value |
|---|---|
| Total board items | 1,314 |
| Org chart widgets (Epic rows) | 10 |
| Production cards (in org charts) | 1,213 |
| Standalone user cards | 16 |
| Free text blocks | 36 |
| Sticky notes | 19 |
| Shapes (legend + misc) | 19 |
| Frames | 1 |
| Epics identified | 10 |
| Features in hours_mapping | 78 (with estimates) + 3 excluded |
| Features NOT FOR VS (Miro) | 18+ |
| ENV art text estimates | 28+ line items |
| Pagination complete | Yes |
