# COUCH HEROES — BATCH 2 HANDOFF PROMPT

## HOW TO USE THIS DOCUMENT

Copy everything below the line into a new Claude chat along with the GDD PDF. This is the complete prompt for generating Batch 2. It includes the updated context block, the quality framework learned from Batch 1, and the RICECO prompt for Batch 2 systems.

---

## RICECO PROMPT

**Role:** You are a senior systems designer, technical producer, and executive producer with 15+ years of shipped MMO experience across titles like World of Warcraft, Final Fantasy XIV, Guild Wars 2, Elder Scrolls Online, and RuneScape. You have deep expertise in both design systems and production planning for persistent online worlds. You will evaluate your own output through three lenses simultaneously: Game Director (vision, pillar alignment, feel), Design Lead (system integrity, gaps, intersection clarity), and Development Team (production planning, technical risks, estimation signals).

**Instructions:** Enumerate every system and sub-feature within Batch 2 scope (see BATCH 2 INSTRUCTIONS below). Apply the Couch Heroes design pillars throughout, particularly the corruption mechanic, no-stat cosmetics, flexible class building, and single-player-first design. Produce output matching the OUTPUT FORMAT and QUALITY FRAMEWORK exactly. Do not skip any field. Do not produce a first draft — produce a reviewed second draft by self-critiquing before finalising each system.

**Context:** Couch Heroes is a fantasy MMORPG in early production targeting Gamescom August 2025 as its next major external milestone. The full project context is provided in the CONTEXT BLOCK below. Batch 1 (Core Gameplay Systems) has been completed and is summarised in the BATCH 1 SUMMARY section for dependency reference. The attached GDD PDF is the source of truth for all game design details.

**Evaluation Criteria:** Your output will be evaluated on three axes simultaneously:

- **Game Director (target: 8+/10):** Does each system's Experience Target clearly communicate the intended player feel? Are design pillars enforced structurally (via sub-features), not just mentioned in notes? Are risks consolidated and visible? Is the Gamescom critical path explicit?

- **Design Lead (target: 8+/10):** Are system boundaries clean with no ownership ambiguity? Are design decisions at system intersections flagged with candidate approaches and recommendations (not left as vague sub-features)? Is the Stat System and other foundational systems given real design depth, not skeleton entries? Are sub-features scoped at epic level — not too granular (tasks) or too broad (multiple epics in a trenchcoat)?

- **Development Team (target: 7-8/10):** Are gate mappings split between architecture and content population where relevant? Are technical risks called out per system? Are compound sub-features flagged with approximate epic count? Is the gate-to-calendar mapping referenced? Note: achieving 9+ for dev teams requires a separate Technical Design Document (TDD) — this systems design document is not that, but it should give engineers enough to begin planning.

**Output:** Produce the complete Batch 2 systems document following the OUTPUT FORMAT below, including all appendices (Gamescom Critical Path, Intersection Decisions, Risk Register, Gate-to-Calendar reference). Then produce the document as a formatted .docx file.

---

## CONTEXT BLOCK

```
=== PROJECT: COUCH HEROES ===

Couch Heroes is a fantasy MMORPG being developed by a UK-based studio currently in early production. The game targets a young adult audience and emphasises player expression, discovery-driven progression, and high visual fidelity over competitive min-maxing or grind-heavy loops.

CORE DESIGN PILLARS:

1. Discovery & Exploration: The world is the content. Points of interest are distinctive in layout and ambience. Quests feature exploratory movement, puzzle systems, and platforming — not just combat. The game must function as a fun single-player experience first. Movement includes grappling and gliding baked in from early levels.

2. Corruption Mechanic: A unique signature system. Corruption covers the world and must be fought back. It combines with platforming and puzzles. No other MMO contains this mechanic at a systemic level. Corruption cleansing is a core quest mechanic (e.g., "Restore the Lighthouse" quest involves fighting corruption directly). Corruption is the expression of the main antagonist Drystan's virus.

3. Player Expression & Customisation: Wearable items (armour, clothing) carry no stats. Stats come from character level, skill point allocation, potions, and weapon enchantments/crystals. Players dress however they like. No class/level/profession gating on cosmetics. "If you can buy or find it, you can wear it." Character customisation happens in-world at the Barbersmith building.

4. Soft-Class System via Weapon + Off-Hand: There are no fixed classes. Players build a class dynamically through their weapon and off-hand combination. Off-hand determines class archetype: torch = Adventurer, healing spells = Priest, thrown potions = Support, second melee weapon = Rogue, gauntlets = Monk, shield = Tank, crossbow/pistol = Ranged, spells = Mage, second ranged weapon = Gunslinger. Players can switch loadouts freely. "Batsuits" are end-game stored loadouts (weapons, skills, cosmetics, enchantments) kept in the player's User Space, allowing instant class switching.

5. Stats & Progression: Three primary stats (STR, INT, DEX) plus hidden stats (CRIT, CHA, AGG, SPEED) and bar stats (HP, MANA). ~60 levels. Skill points are earned on level-up and from quests. Skills have linear paths with ~10 nodes each, unlocked by level or quests. Progression is flexible — players can invest in combat, trade, social, or mixed builds. No two characters should be precisely the same. Gear carries ZERO stats — stats come only from level, allocation, potions, and crystals.

6. Social & Community: Players form organic social groups. Social systems serve immersion, not just utility. The game targets a young adult tone — more edgy/fun than PG, but not GTA-level. Five factions with distinct identities:
   - Allegiant (Red) — military, conservative, under-resourced
   - Athenaeum (Blue) — bureaucrats, knowledge hoarders, rigidly hierarchical
   - Adeticus (Yellow) — mercenaries, traders, scavengers, decentralised
   - Mendarium (Green) — caretakers, artisans, nature-focused, under-powered
   - Purple — ruling class / game development team (Mayoress faction)

7. Partner Games Integration: Licensed IP from partner studios brought into the world. Partner assets as in-game rewards. Discovery funnelling toward partner games. The game serves as a "home" players return to between adventures. Partner content includes in-world quests, arcade cabinets with playable mini-games, and dedicated partner item shops. Modular API for partner onboarding.

8. The Platform: A web application and mobile app (not just a companion app) that mirrors the player's collections, progress, social connections, and persona. Players can access their game collection, trade items, and maintain social links when away from the PC. The Platform is the layer connecting the game, the player's account, and partner games. It is a separate product surface with its own feature set.

9. Accessible Narrative: Punchy, accessible quest dialogue. Deeper lore delivered through follow-up systems (e.g., Mailbox). No disposable photo-copied quests. Grounded stakes — the player is not the protagonist of the universe. The world was created as an AI proving ground (Darwin/Digit1), giving it a unique sci-fi-beneath-fantasy lore foundation.

KEY GAME SYSTEMS (from GDD, for reference):

- Weapon Crystal/Enchantment System: Combat crystals (damage bonuses), custom crystals (cosmetic weapon effects like trails, glows, sounds), shatter crystals (powerful but break after limited uses), cursed crystals (bonuses with downsides, require enchanter to remove), dice crystals (rare probabilistic effects). Crystals are socketed into weapons.
- Potions System: Extensive crafting-based system with healing, mana, stat buffs, status effects, AoE effects, invisibility, grenades, poisons, resistances, novelty/social effects. Potions have tiers, ingredient requirements, and level gating.
- Professions: Fishing (own level system, rod types, bait types, skill-based mini-game with explosive bait), enchanting, cooking, alchemy, and others. Professions are skills invested in via the skill point system.
- Ingredient/Resource System: Tiered materials across categories (crystals: dust/shards/fragments/geode/crystal/cut; wood: shavings/offcuts/logs/lumber; cloth: strands/thread/spool/straps; meat; etc.).
- User Space / Housing: Personal pocket dimension accessed via House of Houses. Starts as single room, expands over time. Furniture placement, trophies, curated displays, social rooms, gardens. Batsuits stored here. Visitors can portal in. Identity-first design, not sandbox UGC.
- Hero Gadget: Personal portable computer every player carries. Used for environment interaction, data gathering, and UI functions.

TECHNICAL PARAMETERS:
- Server-authoritative MMO architecture
- Unreal Engine
- Target: 30-40 players per instance (not thousands in one shard)
- High visual fidelity
- Cross-play is a future milestone target
- Live service model from launch
- Platform (webapp + mobile) is a separate product surface

KEY MILESTONE CONTEXT:
The studio's next major external milestone is Gamescom in August 2025. This is the anchor point for near-term scope decisions.

Locations: Tutorial Cave (with quests and art polish), Downtime (main city with districts, factions, User Space via House of Houses). Stretch: Portal Peak zone.

Confirmed features: User Space (personal housing via House of Houses), Downtime POI updates, combat as part of questing, quests inside city walls, Restore the Lighthouse quest (corruption mechanic), partner asset quest rewards, character customisation at the Barbersmith.

Stretch features: Bugged Dungeon demo (partner game integration), Archway Racetrack with timer (casual competition), Hot Potato multiplayer lobby, Arcade Cabinets with playable games (games within games), shops selling partner items.

Gameplay code scope: Basic shops, inventory, looting bodies, 4 melee skills (anims, special moves, spellbook, weapons), 1 basic profession demo (fishing or alchemy), character customisation at Barbersmith, teleport/instance to House of Houses for User Space, multiple inventory items.

Art scope: Byte-Punk style definition, modular environment sets, five faction districts, corruption VFX, melee/spell/ranged graphic styles, building signage, NPC models (Barbersmith, Mayor, Goblins, Skeletons, Frogs, Pirates), character customisation assets.

Post-Gamescom roadmap: Investor video early Oct 2025, curated playtest late Oct 2025, Playable Screentest Q1 2026 (~100 players), Public Alpha Q4 2026 (first retention version, all features in some state).

PRODUCTION FRAMEWORK:
The studio uses "Agilefall" — agile sprints within waterfall milestone gates.

GATE NAMES (in order):
Concept, Pre-production, Start Production, Mid-production, Late Production, Alpha, Beta, Launch, Live Service 1, Live Service 2, Live Service 3, Live Service 4, Live Service 5

GATE-TO-CALENDAR ASSUMPTIONS (require studio confirmation):
- Pre-production: Current – ~Mar 2025
- Start Production: ~Apr – Jun 2025
- Gamescom Build Lock: ~Jul 2025
- GAMESCOM: Aug 2025
- Mid-production: ~Sep – Dec 2025
- Late Production: ~Jan – Mar 2026
- Alpha: ~Q2 2026
- Beta: ~Q3 2026
- Launch: TBD
```

---

## BATCH 1 SUMMARY (for dependency reference)

Batch 1 covers Core Gameplay Systems. These are the systems and their numbered sub-features that Batch 2 systems may depend on. Reference by system number and sub-feature number (e.g., "System 1: Character Controller & Movement, sub-feature 1.3 Grappling System").

**System 1: Character Controller & Movement** (14 sub-features: 1.1–1.14)
Ground locomotion, jump, grappling, gliding, climbing/mantling, swimming, platforming tuning, mount traversal, movement state machine, traversal interaction points, server movement validation, movement accessibility, solo traversal scaling [PROPOSED], network authority model [PROPOSED].

**System 2: Combat System** (16 sub-features: 2.1–2.16)
Hit detection, damage calculation pipeline, targeting, melee model, ranged model, spell model, crowd control, knockback/physics displacement, combo resolution engine, death/respawn, combat pacing tuning, damage feedback contract, PvE threat/aggro, environmental combat interactions, solo combat scaling [PROPOSED], quest-triggered combat hooks [PROPOSED].

**System 3: Ability/Skill System** (12 sub-features: 3.1–3.12)
Skill tree structure, skill point economy, active ability definitions, passive abilities, auto-trigger abilities [PROPOSED], hotbar/loadout, cooldown/resource management, combo definitions, ability scaling, ability-weapon compatibility matrix, skill preview/tooltips, combo authoring pipeline [PROPOSED].

**System 4: Class/Build System** (8 sub-features: 4.1–4.8)
Weapon + off-hand archetype matrix, archetype identity package, real-time class switching, Batsuit system, build validation, archetype progression tracking [PROPOSED], class identity social communication, soft-class onboarding flow [PROPOSED].

**System 5: Corruption System** (13 sub-features: 5.1–5.13)
World corruption state, spread rules, cleansing mechanic, corruption types, corruption-modified traversal, corruption-based enemies, corruption puzzles, zone restoration events, narrative integration, narrative escalation model [PROPOSED], VFX hooks, telemetry, difficulty scaling.
**System 6: Puzzle & Platforming Systems** (11 sub-features: 6.1–6.11)
Puzzle primitive library, physics puzzles, environmental puzzles, timed challenge framework, platforming checkpoints, puzzle state management, hint system, multiplayer puzzle sync (hybrid model recommended), puzzle reward hooks, Hero Gadget puzzle integration, solo puzzle guarantee [PROPOSED].

**System 7: Camera System** (12 sub-features: 7.1–7.12)
Exploration camera, combat camera, platforming camera, grapple/glide camera, first-person toggle, cinematic camera, photo mode, User Space camera [PROPOSED], death/spectator camera [PROPOSED], collision/occlusion, interior/exterior transitions, camera accessibility.

**System 8: Input System** (10 sub-features: 8.1–8.10)
Action mapping layer, KB/M profile, gamepad profile, remapping, context-sensitive switching, gamepad skill combos, simultaneous device support, input accessibility, input buffering/queueing, platform input abstraction.

**System 9: Stat & Attribute System** (11 sub-features: 9.1–9.11)
Primary stats (STR/INT/DEX), hidden stats (CRIT/CHA/AGG/SPEED), bar stats (HP/MANA), stat allocation, modifier stack (strict evaluation order: base → additive flat → multiplicative → additive percentage → caps), damage formula, crit formula, speed formula, social formula/CHA [PROPOSED], level curve/XP table, stat inspection contract, respec model, CHA scope decision, stat balance modelling tool [PROPOSED].

**System 10: Hero Gadget System [PROPOSED]** (5 sub-features: 10.1–10.5)
Gadget activation/modes, environment scanning, puzzle interaction mode, corruption analysis mode [PROPOSED], in-fiction UI surface [PROPOSED].

**Key Batch 1 design decisions still pending (may affect Batch 2):**
- Solo combat scaling model: Flat solo baseline with group additions recommended (2.15)
- Multiplayer puzzle model: Hybrid (critical-path instanced, side content shared) recommended (6.8)
- CHA stat scope: Economic model (prices + rep gain) recommended baseline, with select dialogue moments (9.6d/9.10)
- Respec model: Free first respec per level tier, then scaling cost recommended (9.9)
- Hero Gadget scope: Major feature vs thin UI wrapper decision needed pre-production (10)
- Corruption escalation: Static content system vs living escalation system decision needed pre-production (5.10)

---

## OUTPUT FORMAT

For each system, provide ALL of these fields. Do not skip any field.

**1. SYSTEM NAME:** Clear, industry-standard naming. Include [PROPOSED] tag if adding a system beyond GDD scope.

**2. EXPERIENCE TARGET:** One sentence describing what the player should *feel* when interacting with this system. This is the alignment anchor — if two designers disagree about an implementation, the Experience Target is the tiebreaker. Format: *"[Metaphor/comparison] — [specific feel description]."*

**3. DESCRIPTION:** 2-3 sentences explaining what this system does and why it matters for Couch Heroes specifically. Reference design pillars where relevant.

**4. SUB-FEATURES:** Numbered list (continuing the numbering scheme from Batch 1 — Batch 2 systems start at System 11 and sub-features at 11.1, 12.1, etc.). Each sub-feature gets:
- ID and Name
- One-paragraph description (scope of an epic, not a task)
- Gamescom tag: `[GAMESCOM: REQUIRED]`, `[GAMESCOM: PARTIAL]`, `[GAMESCOM: STRETCH]`, `[GAMESCOM: NOT REQUIRED]`, or `[GAMESCOM: ARCHITECTURAL ONLY]`
- `[PROPOSED]` tag if beyond GDD source material
- `[COMPOUND: ~Xep]` tag if the sub-feature decomposes into multiple epics for sprint planning
- Where a sub-feature requires a design decision, provide 2-3 candidate approaches with a recommendation (see Batch 1 sub-features 2.15, 6.8, 9.6d, 9.9 for calibration)

**5. DEPENDENCIES:** Which other systems (by system number and name) must exist or be partially functional. Only hard dependencies. Include both Batch 1 and Batch 2 cross-references.

**6. GATE MAPPING:** Split into phases where architecture and content population diverge. Use exact gate names. Format:
- Architecture (what's included): First Playable: [Gate] / Complete: [Gate]
- Content-ready (what's included): First Playable: [Gate] / Complete: [Gate]
- Additional phases as needed

**7. CH-SPECIFIC NOTES:** How this system differs from genre standard. If standard, say so. If the pillar impact is significant, explain how.

**8. TECHNICAL RISKS:** 3-5 bullets per system. Engineering-focused risks, not design risks (those go in CH-Specific Notes). Each risk should identify: what could go wrong technically, why it's hard, and when it needs to be addressed.

---

## QUALITY FRAMEWORK (lessons from Batch 1)

These are mandatory quality checks. Apply them during generation, not as a post-hoc review.

### Structural enforcement over aspiration
When a design pillar (single-player-first, combat-as-questing, discovery-driven) should constrain a system, create a sub-feature that enforces the constraint structurally. Do NOT rely on notes or intent statements. Examples from Batch 1: 1.13 Solo Traversal Scaling, 2.15 Solo Combat Scaling, 6.11 Solo Puzzle Guarantee.

### Don't miss load-bearing systems
Before finalising the batch, ask: "Is there a foundational system that every other system in this batch depends on that I haven't listed?" In Batch 1, the Stat System was initially omitted despite being the mathematical foundation for Combat, Ability, and Class systems. Do not repeat this error. If a system is consumed by 3+ other systems in the batch, it is load-bearing and must be specced with real design depth, not a skeleton.

### Architecture vs content population
Gate mappings must distinguish between "the framework works" and "all the content exists." A crafting system framework can be feature-complete at Mid-production while the full recipe catalogue isn't done until Late Production. These are different teams and different gates. Conflating them makes the Miro board useless for sprint planning.

### Design decisions need candidate approaches
When a sub-feature requires a design decision that blocks architecture, do not list it as a vague sub-feature. Provide 2-3 candidate approaches, state the tradeoffs, and give a recommendation. The recommendation can be wrong — that's fine, it gives the design team a starting position to argue against. A blank decision is worse than a debatable one.

### Compound sub-features must be flagged
If a sub-feature would decompose into 3+ epics when a tech lead breaks it down for sprint planning, flag it with `[COMPOUND: ~Xep]`. This prevents estimation errors when the Miro board shows flat circles that look equally sized but aren't.
### Intersection decisions must be tracked
When two systems interact in a way that requires a design decision neither system can make alone, add it to the Intersection Decisions appendix. Each entry needs: the intersection description, the systems involved, the decision required, the owner, and the deadline (gate name).

### Technical risks are per-system, not just appendix
Every system gets 3-5 engineering-focused technical risk bullets. These are aggregated into the appendix Risk Register but must also appear inline so engineers reading a single system see their risks without hunting through an appendix.

### Gamescom flags on every sub-feature
Every single sub-feature gets a Gamescom tag. No exceptions. A producer should be able to filter the entire document by `[GAMESCOM: REQUIRED]` and get the complete sprint planning scope for the demo build.

### Numbered sub-features for Miro mapping
Every sub-feature gets a numeric ID (SystemNumber.SubFeatureNumber). These map directly to numbered circles on the Miro gate board. The detail text block to the side of the gate map references these IDs.

### Experience Targets are tiebreakers
The Experience Target is not flavour text. It is the design intent distilled to one sentence. When a design disagreement arises during implementation, the Experience Target adjudicates. Write it like it will be quoted in a design review to settle an argument.

---

## APPENDICES REQUIRED

After all systems, include these four appendices:

**Appendix A: Gamescom Critical Path Summary** — Table showing every system and its REQUIRED sub-features for August 2025.

**Appendix B: Known Intersection Decisions** — Table with columns: Intersection, Systems, Decision Required, Owner, Deadline. Include both Batch 2 internal intersections AND Batch 2 × Batch 1 cross-batch intersections.

**Appendix C: Consolidated Risk Register** — All technical risks aggregated, sorted by severity (Critical/High/Medium/Low). Columns: Risk, Severity, Owner System(s), Description, Mitigation.

**Appendix D: Gate-to-Calendar Reference** — Reproduce the gate-to-calendar assumption table from the context block for easy reference. Flag as requiring studio confirmation.

---

## BOUNDARY RULES FOR OVERLAPPING SYSTEMS

Many game systems touch each other. To prevent duplication across batches, follow these ownership rules:

- A sub-feature belongs to the system that OWNS its core logic. Other systems that consume or display that logic reference it as a dependency, they do not re-list it.
- Combat System owns: damage calculation, hit detection, targeting, crowd control, death/respawn. Ability System owns: skill definitions, cooldowns, hotbar, combos, passives.
- Enemy/Creature System owns: AI behaviours, aggro, patrols, spawning, boss mechanics. Combat System references Enemy System for "what the player fights" but does not re-specify enemy behaviours.
- Quest System owns: quest logic, tracking, rewards, scripting. Narrative System owns: dialogue content, story state, lore delivery.
- Loot System owns: what drops and how. Inventory System owns: what happens after the player picks it up. Economy System owns: currency flows and pricing.
- Player Housing / User Space owns: the personal space experience. Social System owns: visiting permissions and social features of housing.
- Mail System (Mailbox) has dual ownership: functional player-to-player mail belongs to Social Systems. Lore delivery via Mailbox belongs to Narrative Systems.
- Faction System is its own system under Social/Community. It owns faction identity, reputation, faction-specific content gating, and faction NPC behaviours.
- Mounts and Companions: Mount traversal mechanics are in Batch 1 System 1. Mount acquisition, stable management, and mount cosmetics are their own system in this batch or a later batch.
- Partner content: The Partner Integration batch owns the framework and pipeline.
- Potions System vs Crafting/Professions: Potions System owns the full potion catalogue, effects, tiers, and usage mechanics. Crafting/Professions owns the act of creating potions. If it is about "what the potion does," it belongs to Potions. If it is about "how the player makes the potion," it belongs to Crafting.
- Weapon Crystal System vs Crafting/Professions: Crystal System owns crystal types, socketing, effects, and removal. Crafting/Professions (enchanting) owns creation and modification of crystals.
- Ingredient/Resource System vs Crafting: Ingredient System owns the resource taxonomy, gathering nodes, and material tiers. Crafting owns what you do with those materials.
- Platform (Webapp/Mobile) vs Game Client: The Platform batch owns all webapp and mobile app features. Game client UI is in its own batch.

When in doubt: the system that would break if the sub-feature were removed is the system that owns it.

---

## BATCH 2 INSTRUCTIONS

### BATCH 2: Progression, Items & Economy

```
DOMAIN: Progression, Items & Economy

Enumerate every system and sub-feature within the following scope. Apply the Couch Heroes design pillars throughout — particularly that gear carries NO stats (cosmetic only), stats come from level/allocation/potions/crystals, and the economy must support a game where cosmetics are the primary aspiration driver, not power progression.

The Gamescom build includes basic shops, inventory, looting bodies, multiple inventory items, and 1 basic profession demo (fishing or alchemy).

Systems to cover:

1. Inventory & Equipment System (inventory grid/slots, item categorisation, equip/unequip, item stacking, item quality/rarity, item tooltips, item comparison — remember gear is cosmetic only so "comparison" is visual not stat-based. Looting from bodies/containers. Quick-equip, sort, search, filter. Bank/storage if applicable)

2. Loot & Drop System (what drops and how — drop tables, loot rarity, world drops vs enemy drops vs quest rewards vs container loot, loot instancing per player, loot notification, auto-loot options. Does NOT include what happens after pickup — that's Inventory)

3. Weapon Crystal/Enchantment System (combat crystals with damage bonuses, custom crystals with cosmetic weapon effects like trails/glows/sounds, shatter crystals that break after limited uses, cursed crystals with bonuses and downsides requiring enchanter to remove, dice crystals with probabilistic effects. Socketing, removal, stacking rules. This is where weapon-based stat progression lives since gear has no stats)

4. Potions System (full catalogue of potion types: healing, mana, stat buffs, status effects, AoE, invisibility, grenades, poisons, resistances, novelty/social. Tiers, level gating, duration, stacking rules, quick-slot access, thrown potion targeting for Support archetype. Does NOT include how potions are crafted — that's Professions)

5. Crafting & Professions System (fishing with its own level system and mini-game, enchanting for crystal creation/modification, cooking, alchemy for potion creation, and other professions. Profession skill investment via skill point system from Batch 1 System 3. Recipe discovery, ingredient requirements, crafting stations, profession levelling. Owns the act of making things — not what the things do once made)

6. Ingredient & Resource System (tiered materials taxonomy: crystals dust/shards/fragments/geode/crystal/cut, wood shavings/offcuts/logs/lumber, cloth strands/thread/spool/straps, meat, herbs, etc. Gathering nodes in the world, gathering tools, gathering skill-checks, resource respawn timers. Owns the materials — not what you do with them)

7. Economy & Currency System (currency types, NPC shop pricing model, player-to-player trading, marketplace/auction if applicable, gold sinks, economic telemetry. Must account for CHA stat affecting prices per Batch 1 System 9 recommendation. In a cosmetic-driven economy, what makes items valuable? Rarity? Discovery? Partner exclusivity?)

8. Character Cosmetic & Wardrobe System (the "no-stat gear" expression layer. Wardrobe collection, outfit saving, dye system if applicable, transmog/appearance system, cosmetic unlock tracking, Barbersmith character customisation, cosmetic acquisition sources — drops, quests, shops, partner items, achievements. This is the aspirational endgame in a game where gear has no stats)

9. Enemy & Creature System (AI behaviours, aggro/threat response from Batch 1 System 2, patrol paths, spawn systems, enemy archetypes, boss mechanics, creature corruption interaction from Batch 1 System 5, loot drop interface. Confirmed NPCs: Goblins, Skeletons, Frogs, Pirates)

10. Mounts & Companions System (if applicable — mount acquisition, stable management, mount cosmetics, companion pets if any. Mount traversal mechanics already covered in Batch 1 System 1.8. If the GDD does not confirm mounts/companions, note this as a design decision needed and provide the system spec as [PROPOSED])
```

---

## WORKED EXAMPLE (from Batch 1, for calibration)

Match this depth, granularity, and tone for every system.

SYSTEM NAME: Corruption System

EXPERIENCE TARGET: "The world is sick and you can see it healing — cleansing corruption should feel as satisfying as a pressure washer video, with the narrative weight of saving something that matters. Before and after should be visually dramatic."

DESCRIPTION: The world-spanning corruption mechanic that distinguishes Couch Heroes from every other MMO. Corruption is a persistent environmental force covering terrain, structures, and creatures — the physical expression of the antagonist Drystan's virus. Players fight it back through direct cleansing actions, quest objectives, and collaborative world events. It functions as both a combat challenge and a puzzle/platforming modifier, tying together CH's movement, exploration, and combat pillars into a single systemic layer.

SUB-FEATURES:
- 5.1 World Corruption State: Per-zone corruption level tracked server-side, influencing visuals, enemy spawns, NPC behaviour, and accessible areas. Persists across sessions, modified by player actions. [GAMESCOM: REQUIRED — at least one zone with functional corruption state]
- 5.2 Corruption Spread Rules: Server-driven logic governing expansion over time if unchecked. Rate of spread, maximum coverage per zone, acceleration/deceleration triggers. [GAMESCOM: PARTIAL — static corruption placement acceptable, spread rules are stretch]
- [... remaining sub-features with full detail, tags, and compound flags ...]

DEPENDENCIES:
- System 1: Character Controller & Movement (corruption modifies traversal)
- System 2: Combat System (corruption spawns enemies, cleansing may involve combat)
- [... full dependency list ...]

GATE MAPPING:
- Vertical slice (cleansing, 2 types, traversal mod, Lighthouse quest): First Playable: Pre-production / Complete: Start Production
- Full system (spread rules, all types, restoration events, escalation): First Playable: Mid-production / Feature Complete: Late Production

CH-SPECIFIC NOTES: No genre equivalent. This is the single highest-design-risk system because there is no shipped reference. [...]

TECHNICAL RISKS:
- Corruption state replication across 30-40 players: per-zone corruption level changes must propagate with visual consistency. [...]
- Corruption VFX performance: corruption visuals cover large world surfaces and change dynamically. [...]
- [... 3-5 risks total ...]

---

## FINAL REMINDERS

- Start numbering at System 11 (Batch 1 was Systems 1-10)
- Sub-features continue from where Batch 1 left off: 11.1, 11.2, etc.
- Every sub-feature gets a Gamescom tag — no exceptions
- Split gate mappings where architecture ≠ content population
- Flag proposed features clearly
- Include candidate approaches for design decisions
- Produce all four appendices
- Self-critique before finalising: would a Game Director, Design Lead, and Tech Lead each rate this 8+?
- Produce the final output as a formatted .docx file