# Couch Heroes Production Plan — HANDOFF v15

**Date:** 2026-05-13
**Status:** v15 built and QA'd. Glen reviewing.
**File:** `CouchHeroes_Man_Day_Work_Plan_v15.xlsx`
**Build script:** `build_v12_clean.py` (xlsxwriter-based, single command rebuild)

---

## What v15 Contains

**11 sheets, 1,491 stories, 61 features with data, 13 epics, 46 staff.**

| Sheet | Purpose |
|---|---|
| Plan | Main data sheet — 1,663 rows, 474 cols, v14 DRAFT formatting |
| Staff | 46 people from org chart with role/team/dept + named ranges for dropdowns |
| Resource Planner | 1,504 rows, dept-level dropdowns, zebra striping, Primary/Secondary assignee |
| Person Dashboard | Formula-driven per-person workload (SUMPRODUCT from RP) |
| Feature Timeline | Per-feature story counts and total days |
| Summary | Formula-driven EP totals per epic per role |
| Epics & Features | COUNTIF story counts from Plan |
| Roles, Gates, Tiers, Legend | Restored from v11 |

## Three Data Sources

### 1. Design Estimation Sheet (547 rows)
- File: `VS Estimation Design - General Sheet.xlsx` (sheet: "Sorted by Epic")
- 9 estimators: Yorgos, Nadir, Kieron, Panos, Nikolas, Seth, Maria, Hannah, Aggeliki
- Each has Min/Max columns + a "Final (days)" consensus column
- **Extraction:** Min = lowest individual estimator min; Max = Final value (or max of maxes if Final missing)

### 2. Engineering Estimation Sheet (802 rows)
- File: `VS Estimation Engineering - General Sheet (1).xlsx` (sheet: "Sheet1")
- 9 estimators: Samer, Nikos, Daniel, Ilya, Raynor, Leon, Ignasi, Roberto, Matt
- Mustafa Adjusted Min/Max columns
- **Extraction:** Min/Max = Mustafa Adjusted. If Mustafa is None or 0, falls back to individual engineer min/max.

### 3. Miro Board (142 items: 35 ENV art tasks + 107 org_chart stories)
- Board: https://miro.com/app/board/uXjVHX6wqnQ=/
- **35 ENV art tasks** from free text blocks with hour estimates, converted at **7h/day**
- **107 Miro stories** from 10 org_chart AI summaries (zone POIs, architecture kits, furniture kits, faction NPCs, cinematics, combat art, bibles, etc.)
- 5 Bible stories have hours (ENV/ANIM/CHAR/VFX/CONCEPT at 80-100h each)
- 4 Bible stories have hours (Colour Palette/Typography/Wireframes at 40-60h, Game Logo at 80-100h)
- Remaining Miro stories have no individual hour estimates (placeholder rows)

## Key Design Decisions (Glen's directives)

1. **No merging** — every source row is its own output row. Same story name + different team = different rows. Same story name + same team from different sheets = different rows. 1,349 from sheets + 35 art + 107 Miro = 1,491 total.

2. **One epic, one feature, many stories** — epics and features are singular from the template. Stories are per-team, per-source.

3. **Team column format:** "Department | Team" (e.g., "Design | Game design", "Art | Environment Art")

4. **Early Prod Min/Max per role** — 38 roles, each with Min and Max columns = 76 EP columns

5. **7-hour days** for Miro art hour conversion

6. **Department-level dropdowns** on Resource Planner (all Art staff for any art role, all Engineering for any eng role, etc.)

7. **v14 DRAFT is the formatting authority:**
   - 14pt bold white headers (row 4)
   - 12pt bold centered EP data cells
   - Off-white (#F2F2F2) alternating stripes on EP columns (every other role pair)
   - Thin borders on stripe columns
   - Off-white on feature row metadata
   - Zebra striping on Resource Planner
   - 22 hidden columns matching v14 exactly: Gate 0, EP leadership/production roles (cols 87-106), Mid Prod CEO (col 164)
   - 130% zoom, freeze at H5

## Column Layout (Plan Sheet)

- Cols A-G: Epic, Feature, Story, Team, Size, Current Tier, Notes
- Col H (8): Gate 0 (hidden)
- Cols I-AT (9-46): Concept roles (38 single cols)
- Col AU (47): Gate 1
- Cols AV-CG (48-85): Pre-prod roles
- Col CH (86): Gate 2
- Cols CI-FF (87-162): Early Prod roles (38 × 2 = 76 cols, Min/Max per role)
  - Cols 87-106 hidden (leadership/production roles with no VS data)
- Col FG (163): Gate 3
- Cols FH onwards: Mid Prod through LS2 (single cols per role)

## EP Role Columns (1-indexed)

| Role | Min Col | Max Col | Visible? |
|---|---|---|---|
| CEO | 87 | 88 | Hidden |
| ... (leadership) | 89-106 | | Hidden |
| Game Director | 107 | 108 | Visible |
| Game Design Lead | 109 | 110 | Stripe |
| Level Design Lead | 111 | 112 | Plain |
| Game Designer | 113 | 114 | Stripe |
| Combat Designer | 115 | 116 | Plain |
| Level Designer | 117 | 118 | Stripe |
| Technical Designer | 119 | 120 | Plain |
| Writer | 121 | 122 | Stripe |
| Art Director | 123 | 124 | Plain |
| Concept Artist | 125 | 126 | Stripe |
| UI/UX Designer | 127 | 128 | Plain |
| Graphic Designer | 129 | 130 | Stripe |
| Character Artist | 131 | 132 | Plain |
| Environment Artist | 133 | 134 | Stripe |
| Prop Artist | 135 | 136 | Plain |
| Animator | 137 | 138 | Stripe |
| Character Rigger | 139 | 140 | Plain |
| VFX Artist | 141 | 142 | Stripe |
| Technical Artist | 143 | 144 | Plain |
| CTO | 145 | 146 | Stripe |
| Tech Lead | 147 | 148 | Plain |
| Gameplay Developer | 149 | 150 | Stripe |
| Full Stack Developer | 151 | 152 | Plain |
| Backend Developer | 153 | 154 | Stripe |
| Network Engineer | 155 | 156 | Plain |
| QA | 157 | 158 | Stripe |
| Sound Designer | 159 | 160 | Plain |
| Platform Team | 161 | 162 | Stripe |

## Team-to-Role Mapping

| Source Team | EP Role | Dept |
|---|---|---|
| Game design | Game Designer | Design |
| Level design | Level Designer | Design |
| Narrative | Writer | Design |
| UX/UI | UI/UX Designer | Art |
| Concept Art | Concept Artist | Art |
| Environment Art | Environment Artist | Art |
| Character Art | Character Artist | Art |
| Animation & Rigging | Animator | Art |
| VFX | VFX Artist | Art |
| TechArt | Technical Artist | Art |
| Gameplay Engineering | Gameplay Developer | Engineering |
| Backend Engineering | Backend Developer | Engineering |
| QA | QA | QA |
| Audio | Sound Designer | Audio |

## Feature Mapping (Source -> Template)

Key non-obvious mappings:
- In-game Tutorial -> FTUE
- Various Quest Types Support -> Quest Types - Courier / Escort / Kill / Collect / Mystery / Time / Partner / Lockpicking
- Melee Combat Framework -> Combat Framework
- Basic Magic system -> Magic
- Carapax/Wolves/Goblins/Skeletons/Slimes/Corrupted enemies -> Enemies Art
- Fishing/Forge -> Professions
- Chat system -> Game Chat System
- Party system -> Co-op / Party
- Dungeon finder -> LFG / Pick-up Groups
- World Resources -> Item Core System

## Miro Art Mapping (ENV text blocks -> Template features)

Architecture kits, biomes, POIs, zones -> mapped to Biome features, Guilds, Building Houses, PvP Combat, etc.
Garment Shop + Partner Shop hours -> accumulated onto In-game Store
Guild House hours -> accumulated onto Guilds
NPCs hours -> accumulated onto Enemies Art
Quest Item hours -> accumulated onto Item Core System

## Staff (46 people from org chart)

### Engineering (10)
Mustafa Sibai (CTO), Daniel Negri, Nikos Gerontakis, Samer Balushi (Web Dev), Raynor D'Souza, Ilya Achmetov, Leon Huang, Ignasi Ezpeleta, Roberto, Matt (Gameplay)

### Art (25)
David Luong (Art Director), Wojciech Szon/Conor McLean/Michail Velissaris (VFX), Stefano Vietina/Samuele Piazzi/Andrea Rottini (Tech Art), Niko Gesell/Kerim Turay/Gerard Vicen/Julian Hartinger (Concept), Gianluca Perusi (UI/UX), Larisa Logofatu (Graphic), Alon/Kunjal Asher (Animation), Maddalena Morello (Rigger), Sasha Krieger/Dimitris Chrysanthakopoulos/Rebecca Tomasoni (Characters), Michael Dunnam/Ella Amatooni/Marc Vives/Iosif Alexiou/Chris Brough (Environment), Nick Chrysanthakopoulos (Props)

### Design (8)
Robin Jubber (Game Director), Yorgos Dritsas/Nadir Latif (Game Design), Kieron Naylor (Tech Designer), Nikolas Tziotis/Seth Dahl/Panos Andriopoulos (Level Design), Maria Cibej (Writer)

### Audio (2)
Dragan Vuckovic, Aggeliki Peroutsea

### QA (1)
Hannah Pickard

## QA Results (final)

- Design rows: 547/547 present (100%)
- Engineering rows: 802/802 present (100%)
- Miro stories: 102/102 named stories present (100%)
- All estimates traced to source: 639/639 (100%)
- No cross-dept merging: confirmed
- No fabricated values: confirmed
- 3 strict-QA "misses" are confirmed false positives (data on sibling rows)

## Bugs Fixed During This Session

1. openpyxl merged cell fills not rendering -> switched to xlsxwriter
2. Feature name matching (73/73 after FEATURE_NORM expansion)
3. Cross-feature dedup collapsing generic task names -> fixed with source_feat+parent_story key
4. Then removed ALL dedup per Glen's direction (no merging)
5. Engineering Mustafa fallback when Mustafa=None or 0 -> falls back to individual engineer min/max
6. Hidden columns: 22 matching v14 exactly (was 39 due to set_column range conflicts)
7. Miro art estimates: 35 ENV items + 107 org_chart stories added as individual rows

## Known Limitations

1. **Miro API returns empty card data for org_chart children** — story content extracted from AI-generated summaries, not raw card data. Some stories may be missing if the AI summary didn't name them.
2. **~60 unnamed Miro stories** flagged as gaps in the extraction — the API summaries say "40+ stories" or "60+ stories" but only name a subset. These are likely individual armour/weapon/customisation variants per faction.
3. **16 STORIES TEMP placeholders** across 5 epics (Social has ALL 4 as placeholders) — these need spec work.
4. **Most Miro stories have no hour estimates** — hours exist at the task level in the Miro board, not the story level. The stories are placeholder rows.

## How to Rebuild

```bash
cd "D:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Couch Heroes\production"
python build_v12_clean.py
```

Close Excel first. Output: `CouchHeroes_Man_Day_Work_Plan_v15.xlsx`

## Files

| File | Purpose |
|---|---|
| build_v12_clean.py | Master build script (xlsxwriter) |
| CouchHeroes_Man_Day_Work_Plan_v15.xlsx | Current output |
| CouchHeroes_Man_Day_Work_Plan_v11.xlsx | Original template (DO NOT MODIFY) |
| CouchHeroes_Man_Day_Work_Plan_v14 DRAFT.xlsx | Glen's formatting reference |
| VS Estimation Design - General Sheet.xlsx | Design estimation source |
| VS Estimation Engineering - General Sheet (1).xlsx | Engineering estimation source |
| hours_mapping.txt | Miro game systems feature-level role totals |
| _miro_stories_complete.txt | Fresh Miro org_chart extraction (all 10 epics) |
| _miro_cards_detail.txt | Individual card batch-fetch results |
| _miro_all_items.txt | Full board extraction with text items |
| qa_check.py | Comprehensive QA script |
| qa_strict.py | Strict 1:1 row matching QA |
| find_miro_gaps.py | Miro story gap finder |
| _v11_sheets.json | Cached v11 reference sheet data |

## What the Next Session Should Do

1. **Glen reviews v15** — check formatting, spot-check data, verify Miro stories are under correct features
2. **Screenshots from Glen** — if Miro stories are still missing, Glen can screenshot org_chart sections for direct reading
3. **Resource Planner testing** — Glen assigns a few stories to verify dropdowns, formulas, and Person Dashboard work
4. **Feature Timeline review** — verify the bottleneck analysis makes sense for scheduling
