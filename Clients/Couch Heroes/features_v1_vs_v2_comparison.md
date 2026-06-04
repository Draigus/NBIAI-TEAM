# Couch Heroes Features.xlsx - V1 vs V2 Comparison

**V1:** `Couch Heroes Features.xlsx` (used overnight 2026-04-26)
**V2:** `Couch_Heroes_Features_v2.xlsx` (Glen's new download, 2026-04-27)

## TL;DR

V2 is a substantial restructure. Game features have been reorganised and split into 5 separate worksheets by purpose (game / TDD / platform / content / live service). A new "Feature Versions" sheet introduces a V0-V7 maturity model per feature (matches the version-phasing concept you sketched out for Steve Sarge in Telegram).

**40 of the original 592 unique titles are genuinely missing from V2 - mostly Crafting and Trading sub-features. Likely worth a check before locking the Game project import.**

The Dashboard summary sheet has NOT been recalculated against the new structure - it still shows V1's 421-feature total across the old 31 areas.

---

## Sheet-Level Changes

| Aspect | V1 | V2 |
|---|---|---|
| Sheets | 3 (Feature List, Legend, Dashboard) | 8 (Game Feature List, Feature Versions, TDD, Platform Feature List, Content List, Live Service Features, Legend, Dashboard) |
| Header row | Row 5 (with logo above) | Row 1 (cleaner) |
| New leading column | (none) | "Tag" / "Fability co" |
| New data column | (none) | "Comments" |

## New Sheets In V2

| Sheet | Rows | Purpose |
|---|---|---|
| **Feature Versions** | 985 | V0-V7 maturity per feature: Not Started > R&D > Prototype > MVP > Launch > Optimize > Expand > Scale. Header row defines what each version means. This formalises the version-progression idea you discussed with Steve Sarge. |
| **TDD** | 162 | Technical Design Documents tracking. Same schema as game features but with TDD link instead of GDD, plus Priority/ETA/Actual Time. Houses the system-track work (Analytics, DevOps, Multiplayer Systems, Online Services, Performance, QA & Release Eng, Player Support). |
| **Platform Feature List** | 127 | Platform / Security / Compliance features split out from main game list. Areas: Platform, Security & Abuse Prevention, Compliance. Has its own Owner column ("Web/Backend Team"). |
| **Content List** | 1126 | Granular content production work per feature (art assets, UX/UI components, animations, VFX, models, icons). Schema includes "Content Task" + "Art Team" columns. This is genuinely new - V1 had no production-task layer. |
| **Live Service Features** | 79 | LiveOps/events/seasons split out. Areas: LiveOps System, Player Monetization, Compliance, Security & Abuse Prevention. |

## Renamed / Restructured

| V1 Sheet/Area | V2 Equivalent |
|---|---|
| Feature List | Game Feature List (renamed, reorganised) |
| Core Combat System + Combat Ability System | Combat Epic |
| Item Core System + Inventory System | Items & Inventory System Epic |
| World & Zones | World Systems |
| Player Progression System | Player Progression System (kept) |
| Online Services & Backend, Performance & Reliability, DevOps & Tools, QA & Release Engineering, Player Support, Analytics System | Moved to TDD sheet |
| Platform, Security & Abuse Prevention, Compliance | Moved to Platform Feature List |
| LiveOps System, Player Monetization | Moved to Live Service Features |

---

## What's Actually Missing (40 titles)

Of the 592 unique titles in V1, 40 are not found anywhere in V2. Most are V1 system labels that have been replaced by V2 epic names. Some are real gaps worth flagging.

### Renames (probably fine)
- "Core Combat System" / "Combat Ability System" -> Combat Epic
- "Equipment Framework" -> superseded by Items & Inventory System Epic
- "Trading - Market System" / "Trading - Transactions" / "Trading - Verdors & Services" / "Trading Security" -> Trading content rolled into In-game economy / Game Feature List
- "Chat service" -> likely under Social Systems
- "Damage meter / parsing (optional)" -> was already optional

### Real gaps worth checking with the team

**Crafting (10 sub-features missing as named items):**
- Crafting Anti-Cheat
- Crafting Interaction
- Crafting as profession
- Crafting exploit prevention
- Crafting orders / commissions
- Crafting queue / batch crafting
- Furniture crafting
- Node competition rules
- (+2 more)

**Combat/PvP/PvE:**
- Boss encounter framework
- PvP flagging
- Area-of-effect templates
- Power Modifiers
- Primary/secondary stats framework
- Leashing & reset rules
- Safe zones

**Movement:**
- Climbing/parkour
- Traversal Mechanincs (sic)

**World/Server:**
- Phasing / world state
- Instance management
- World Cycles

**Player/Class:**
- Character Customization (the dedicated feature - though "Character Creation" content exists)
- Class/archetype selection
- Faction system (if used)

**Platform integration:**
- Achievements/trophies integration

**Misc:**
- LiveOps - Events (named title gone, but Live Service Features sheet covers events broadly)
- Neighborhoods/plots (if used)
- US Decoration / US Server Support (US = "User Space" in V1)
- Techart support

The "(if used)" qualifiers suggest some of these were always optional / TBD design decisions.

---

## Dashboard Sheet - NOT Updated

The Dashboard tab in V2 is identical to V1 - still summing 421 features across 31 areas using V1's area names (Account & Identity, Movement & Controls, Modern UX Expectations, etc.). It does NOT reflect the new sheet structure or any newly added/removed features.

**Action needed:** Whoever owns this file (likely Valeria? Or Glen?) needs to re-run the dashboard counts against the new sheet structure if it's meant to be a status snapshot.

---

## What's Genuinely New (877 added titles in V2)

Most additions fall into these categories:

1. **Content production tasks** (Content List sheet) - art assets, animations, VFX, models, UI icons, UX/UI components per feature. Examples: "Achievements UI", "Achievements Icons", "Achievements UI VFX", "Animations, Character, TechArt", "Aquarium Model", "Armour models", "Bosses & mini-bosses artwork".
2. **Version progression rows** (Feature Versions sheet) - one row per feature with V0-V7 progression definitions.
3. **Granular game features** in Game Feature List - now broken down further than V1.
4. **Platform-specific items** (Platform Feature List) - 127 features previously not at this granularity.
5. **Live service/operational items** (Live Service Features) - 79 features for LiveOps/events/seasons that were thin in V1.

---

## Implications for the WorkSage Import Build

The Game project section of `CH_WorkSage_import_v1.xlsx` was built from V1's "Feature List" (594 imported rows). If we're now treating V2 as the source of truth, that section needs rebuilding.

### Options

**A: Switch to V2 wholesale.** Rebuild Game project section from V2's 5 game-related sheets (Game Feature List + TDD + Platform Feature List + Content List + Live Service Features). Significantly more rows (~2,503 across all 5 sheets vs. 594 from V1).

**B: V2 game features only, V1 for the rest.** Use V2's Game Feature List (1009 rows) as the Game project source. Skip Content List as too granular for backlog (it's production work, lives in JIRA / asset tracker once we have it). Skip Feature Versions as it's a maturity-model overlay, not items. TDD and Platform features would also be excluded from Game project - they belong elsewhere (TDD work could go under Production Strategy & Implementation; Platform under Studio Operations / IT or under a new Platform sub-feature).

**C: Keep V1 build for now, track the missing 40 separately, integrate V2 after offsite finalises everything.** Lowest-risk for the Apr 27-30 offsite - your team is mid-restructure and the offsite is likely going to reshape this further. Worth re-importing once after offsite so we don't import twice.

**Recommendation: C**, with the missing-40 list flagged in the Game project as a "verify these still belong" task. Wait for offsite outcome before rebuilding from V2. Avoids importing the same features twice with different names.

---

## Checks I Did

- Sheet structure inventory (V1 vs V2)
- Header row identification per sheet
- Sample data row from each sheet to confirm content
- Title set comparison (full string match across all V2 sheets)
- Substring search for key V1 areas to confirm relocation vs. removal
- Dashboard comparison (row-by-row identical confirmed)
- Bucketed truly-missing titles by domain (combat, crafting, trading, etc.) for Glen review
