# Couch Heroes Production Plan Consolidation — HANDOFF

**Date:** 2026-05-12
**Status:** INCOMPLETE — output does not match template style. Multiple failed attempts.
**Priority:** HIGH — Glen needs this done accurately.

---

## What Glen Wants

Take data from three sources and put it into the v11 template Excel. Simple concept, botched execution.

### Sources
1. **VS Estimation Design — General Sheet.xlsx** (sheet: "Sorted by Epic") — 616 rows, 9 estimators (Yorgos, Nadir, Kieron, Panos, Nikolas, Seth, Maria, Hannah, Aggeliki) each with Min/Max, plus a "Final (days)" column
2. **VS Estimation Engineering — General Sheet (1).xlsx** (sheet: "Sheet1") — 884 rows, 9 estimators (Samer, Nikos, Daniel, Ilya, Raynor, Leon, Ignasi, Roberto, Matt) each with Min/Max, plus Mustafa Adjusted Min/Max and Notes
3. **hours_mapping.txt** — 78 features with role-level day totals from Miro board (e.g., "Combat framework: 165D total | Game Designer=24D, Gameplay Developer=36D...")

### Target Template
**CouchHeroes_Man_Day_Work_Plan_v11.xlsx** — Plan sheet structure:
- Row 1: empty
- Row 2: Super-phase headers ("WORK STREAMS" merged A2:E3, then "CONCEPT", "PRE-PRODUCTION", "PRODUCTION", "RELEASE", "LIVE SERVICE") — dark grey (#404040) fill, white bold text
- Row 3: Gate markers (yellow #FFD966) and sub-phase labels with phase-specific fills
- Row 4: Column headers — "Epic" (A), "Feature" (B), "Size" (C), "Current Tier" (D), "Notes" (E), then role names rotated 90° in each phase section
- Row 5+: Data — epic rows are yellow (#FFD966) merged bars A:PR (434 cols), feature rows are plain text in col B with NO fill

**Critical template facts:**
- 11 phases, each = 1 gate col + 38 role cols = 39 cols per phase
- Phase positions: Concept starts col 6, Pre-prod col 45, Early Prod col 84 (gate) / 85-122 (roles), Mid Prod col 123, End Prod col 162, Alpha col 201, Beta col 240, Launch col 279, First Release col 318, LS1 col 357, LS2 col 396
- Total template cols: 434 (PR)
- Epic rows merged across A{row}:PR{row} with yellow fill
- Feature rows: NO fill, normal font size 10, col B only
- 13 epics in template order (see TEMPLATE_ORDER below)
- 154 features in specific order (NOT alphabetical)

### What Glen specified:
1. **Add Min/Max columns** to the template for each role
2. **Add ALL epics, features, stories, and tasks** — full depth expansion
3. **Use the EXISTING template's colours and structure** — identical visual style
4. **ALL features, stories, tasks, and hours** added appropriately
5. **Size rows and columns effectively**

### Glen's earlier decisions:
- All estimates go into **Early Production** phase (this is all VS work)
- Design "Final" value goes in Max column, Min column blank (for Design data)
- Engineering: use Mustafa Adjusted Min and Max
- All individual estimator Min/Max columns must be preserved
- Team-to-role mapping confirmed (see below)

---

## What's Been Built (and what's wrong)

### Scripts in production folder:
- `consolidate_plan.py` — flat estimator-tracking format (REJECTED — wrong layout)
- `consolidate_template_style.py` — attempted template style with shifted columns (REJECTED — still wrong)
- `build_v12.py` — template style with Min/Max Early Prod (REJECTED — headers rebuilt wrong)
- `build_v12_exact.py` — tried to keep template untouched (REJECTED — didn't add stories/tasks)
- `build_final.py` — latest attempt, copies headers from template (STILL WRONG — feature ordering 312 instead of 73, visual issues)

### What keeps going wrong:
1. **Headers get mangled** when rebuilding from code — colours, merge positions, font sizes don't match
2. **Feature ordering** — template has a specific order, my sort keeps producing wrong results
3. **Coloured fills on data rows** — I kept adding blue/purple fills for stories/tasks, template has NO fills except yellow epic bars
4. **Column shifting** — adding metadata columns (Story, Task, Dept, Team) shifts all phase columns
5. **Feature count inflation** — 312 features instead of 73 because story/task rows trigger new feature detection

### The CORRECT approach (not yet implemented):
1. Open v11 template
2. **Copy header rows 1-4 EXACTLY** — don't rebuild, don't modify
3. For Min/Max: add TWO new 38-col sections AFTER col 434 (not inside the existing phases)
4. Walk the template's existing feature order (154 features across 13 epics)
5. For each feature, find ALL matching source data (stories + tasks)
6. Insert story/task rows BELOW each feature row
7. Stories: indented in col B, bold, NO fill
8. Tasks: further indented in col B, normal font, NO fill
9. Epic rows: yellow merged bars (copy the template's exact merge pattern)
10. Estimates go in: Early Prod role cols (85-122) for agreed value, new Min section (col 436+), new Max section (col 475+)
11. Feature-level Miro bid totals also in Early Prod role cols

---

## Data Mappings (all verified correct)

### Team → Role (for placing estimates in role columns)
| Source Team | Template Role | EP Col |
|---|---|---|
| Game design | Game Designer | 98 |
| Level design | Level Designer | 100 |
| Gameplay Engineering | Gameplay Developer | 116 |
| Backend Engineering | Backend Developer | 118 |
| UX/UI | UI/UX Designer | 105 |
| Concept Art | Concept Artist | 104 |
| Environment Art | Environment Artist | 108 |
| Character Art | Character Artist | 107 |
| Animation & Rigging | Animator | 110 |
| VFX | VFX Artist | 112 |
| TechArt | Technical Artist | 113 |
| Audio | Sound Designer | 121 |
| QA | QA | 120 |
| Narrative | Writer | 102 |

### Design Estimators (person → role)
| Name | Role | Team |
|---|---|---|
| Yorgos Dritsas | Junior Game Designer | Game Design Team |
| Nadir Latif | Combat Designer | Game Design Team |
| Kieron Naylor | Technical Designer | Direct report |
| Panos Andriopoulos | Junior Level Designer | Level Design Team |
| Nikolas Tziotis | Junior Level Designer | Level Design Team |
| Seth Dahl | Junior Level Designer | Level Design Team |
| Maria Cibej | Junior Writer | Writing Team |
| Hannah Pickard | QA | QA Team |
| Aggeliki Peroutsea | Junior Sound Designer | Sound Design Team |

### Engineering Estimators (person → role)
| Name | Role | Team |
|---|---|---|
| Samer Balushi | Backend Developer | Backend Engineering Team |
| Nikos Gerontakis | Senior Full Stack Developer | Backend Engineering Team |
| Daniel Negri | Senior Full Stack Developer | Backend Engineering Team |
| Ilya Achmetov | Gameplay Developer | Gameplay Team |
| Raynor D'Souza | Senior Gameplay Developer | Gameplay Team |
| Leon Huang | Gameplay Developer | Gameplay Team |
| Ignasi Ezpeleta | Junior Gameplay Developer | Gameplay Team |
| Roberto | Gameplay Developer | Gameplay Team |
| Matt | Technical Animation Engineer | Gameplay Team |
| Mustafa Sibai | Head of Engineering | Lead (Adjusted estimates) |

### Epic Name Normalisation
| Source Name | Template Name |
|---|---|
| Combat System | Combat |
| Social | Social & Multiplayer |
| Rename to in-game camera squancer during dialog | World Systems |
| Phasing system | World Systems |
| Live Service Support | Live Game |

### Miro Feature Name Mapping (Excel → Miro)
See MIRO_MAP dict in build_final.py — maps ~30 features where names differ between Excel sheets and hours_mapping.txt.

---

## TEMPLATE_ORDER (exact feature sequence from v11)

```
Player Build: Player Progression, Skill System, Achievements & Trophies, Factions / Reputation, FTUE, Professions, Character Management, Character Creation & Customization, Garment System, Persona System, Emote System

World Systems: Foam Corruption, Miasma Corruption, Water Corruption, Crystal Corruption, Time Corruption, Enemy Corruption, Oil Corruption, Texture Corruption, Environmental Elemental Effects (combination states), Basic Movement System, Advanced Traversal, Navigation, Day/Night Cycle, Dynamic Weather, Instancing, Dungeon Mechanics, The Dungeon, Partner Portal, World Bosses, Corruption Heatmap, Biome - Portal Peak, Biome - Hidden Hills, Biome - Farmlands, Biome - Mistrun Shore, Biome - Whispering Woods, Biome - Tranquil Sands, Biome - Torrential Vale, Biome - Clockwork, Biome - Downtime

Combat: Combat Framework, Ranged Combat, Combat AI Behavior, Enemies Art, PvP Combat, Combat Balance & Telemetry, Combat Abilities, Magic, Full Motion Video (FMV)

User Space: User Space Server & Instance, User Space Decoration, P2P / P2G User Space Connection, Building Houses, Saving House Layouts, Partner Portal System (player house), Arcade Cabinet, Anywhere Door Placement

Items & Inventory: Item Core System, Inventory System, Equipment System, Loot Distribution, Mounts / Pets, Banks, P2P Item Transfer, Consumables, Durable Items

Player Economy: Trading System, Currency System, Auction House, In-game Store, In-game Economy, RMT Game Economy, IG / RMT Monitoring System

Quest System: Quests Backend / Tooling, Quests as Events, Quest Multiplayer, Quest Types - Courier / Escort / Kill / Collect / Mystery / Time / Partner / Lockpicking, Quest Reward System, Quest Log, Quest Dialog GUI, Quest Narrative Content, In Game Cinematic (IGC), Meta Quest System, Quest Generator System, Targeted VO

Social & Multiplayer: Game Chat System, Friends, Guilds, Co-op / Party, Co-op / Raids, Dueling, In-game Mail, Notifications, Player Config PvP Server, LFG / Pick-up Groups

Game Bibles: UX/UI Bible, Accessibility Guidelines, Brand Bible, Art Bible, Monetization Bible, Red Books (Live Service emergency guidelines)

Platform: Player Account Creation / Deletion, Player Account Authentication, Player Account Privacy Settings & Legal, Player Dashboard - Account Features, Player Dashboard - Game Dashboard, Player Dashboard - Friends, Player Dashboard - Search & Notifications, Player Dashboard - Marketplace, Developer Dashboard - Developer Account, Developer Dashboard - Game Dashboard, Developer Dashboard - Settings & Support, Quest Tracking, Payment Processing (incl. Refunds), Online Services & Backend, Launcher & Distribution, Partner Loop, Game Tool Integration (incl. Game Key Generation), Account Level Settings, Social Media Support

Live Game: Live GDD, Content, Forecast, Analytics & BI, Sales Dashboard, Telemetry, Live Service Event Plan

Partner Build: Partner = Feature definition, Sign Partner, Partner Brief, Partner Design Doc, Partner TDD, Partner Art Brief, Partner Build, Partner Integration

Product Publishing: Web Presence, Website, Community Persona, Title Identity, Player Support, Go-To-Market Strategy & Implementation, 3rd-party Store Publishing
```

---

## Source Data Facts (verified)

- Design sheet: 616 rows, 60 features, 9 epics. Estimator cols 8-25 (9 pairs), Final col 26
- Engineering sheet: 884 rows, 67 features, 14 epics. Estimator cols 8-25 (9 pairs), Mustafa Adj cols 26-27, Notes col 28
- Both sheets use sparse fill for Epic/Feature/Story (only on first row of each group)
- Story context must be carried forward for task rows (current_story tracking)
- 388 rows appear in both sheets (same epic/feature/story/task/team) and should be merged
- After merge: 1,129 unique rows
- hours_mapping.txt: 78 features with role-level day totals

---

## QA Report Summary (from earlier automated QA)

- Spot-check estimates: 20/20 exact match
- Column integrity: design and engineering data cleanly separated
- 1 genuine duplicate in source data ("Document phasing system" / Backend Engineering)
- Epic renames (Combat System → Combat, etc.) are intentional
- 97.5% estimate accuracy on full scan (mismatches from generic task names like "Design", "SFX" matching wrong rows in the QA script)

---

## Files

| File | Purpose |
|---|---|
| CouchHeroes_Man_Day_Work_Plan_v11.xlsx | Original template (DO NOT MODIFY) |
| VS Estimation Design - General Sheet.xlsx | Design team estimation data |
| VS Estimation Engineering - General Sheet (1).xlsx | Engineering team estimation data |
| hours_mapping.txt | Miro board feature-level role totals |
| miro_board_analysis.md | Detailed Miro board structure analysis |
| CONSOLIDATION_SPEC.md | Approved spec for the consolidation |
| QA_REPORT.md | Automated QA results |
| consolidation_stats.json | Run statistics |
| build_final.py | Latest (still broken) build script |

---

## What the Next Session Must Do

1. **STOP trying to rebuild headers from code.** Copy rows 1-4 from the template EXACTLY — every cell, every merge, every fill, every font. If openpyxl can't do this cleanly, consider using the template file directly and only modifying the data area.

2. **Use the template's feature order** — walk the template rows 5-165, and for each feature, find + write the matching source data below it.

3. **NO coloured fills on data rows** except the yellow epic bars. Stories and tasks are plain indented text.

4. **Min/Max columns** go AFTER col 434 as two new 38-col sections. The main Early Prod cols (85-122) get the agreed/final estimate.

5. **Test visually** — open the output in Excel and compare side-by-side with v11 before showing Glen.
