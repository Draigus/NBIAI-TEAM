# Couch Heroes Production Plan Consolidation Spec

**Date:** 2026-05-12
**Owner:** Glen Pryer
**Status:** Approved for implementation

---

## Objective

Extract all production plan data from two VS Estimation Excel sheets and the Miro board into the master template `CouchHeroes_Man_Day_Work_Plan_v11.xlsx`, preserving every data point at full depth (Epic → Feature → Story → Task).

## Sources

1. **VS Estimation Design — General Sheet.xlsx** ("Sorted by Epic" sheet)
   - 640 data rows, 60 features, 9 epics
   - 9 estimators: Yorgos, Nadir, Kieron, Panos, Nikolas, Seth, Maria, Hannah, Aggeliki
   - Each gives Est Min / Est Max; plus a "Final (days)" consensus column

2. **VS Estimation Engineering — General Sheet (1).xlsx** ("Sheet1")
   - 912 data rows, 67 features, 14 epics
   - 10 estimators: Samer, Nikos, Daniel, Ilya, Raynor, Leon, Ignasi, Roberto, Matt
   - Each gives Est Min / Est Max; plus Mustafa Adjusted Min/Max and Notes

3. **Miro Board** (hours_mapping.txt + miro_board_analysis.md)
   - 78 features with role-level day totals (cross-reference only)
   - NOT FOR VS flags (18+ features)
   - ENV art hour estimates in text blocks

## Target

`CouchHeroes_Man_Day_Work_Plan_v11.xlsx` — Plan sheet redesigned, other sheets preserved.

## Plan Sheet Column Layout

### Metadata (cols A–K)

| Col | Header | Source |
|---|---|---|
| A | Epic | Hierarchy from source sheets |
| B | Feature | Hierarchy from source sheets |
| C | Story | Hierarchy from source sheets |
| D | Task | Hierarchy from source sheets |
| E | Department | Mapped from Team (see mapping below) |
| F | Team | Col 5 from source sheets |
| G | Description | Col 6 from source sheets |
| H | Definition of Success | Col 7 from source sheets |
| I | Size | From existing template (Feature-level only) |
| J | Current Tier | From existing template (Feature-level only) |
| K | Notes | General notes |

### Design Estimators (cols L–AD)

| Cols | Estimator | Role | Team |
|---|---|---|---|
| L–M | Yorgos Dritsas | Junior Game Designer | Game Design Team |
| N–O | Nadir Latif | Combat Designer | Game Design Team |
| P–Q | Kieron Naylor | Technical Designer | Design (direct) |
| R–S | Panos Andriopoulos | Junior Level Designer | Level Design Team |
| T–U | Nikolas Tziotis | Junior Level Designer | Level Design Team |
| V–W | Seth Dahl | Junior Level Designer | Level Design Team |
| X–Y | Maria Cibej | Junior Writer | Writing Team |
| Z–AA | Hannah Pickard | QA | QA Team |
| AB–AC | Aggeliki Peroutsea | Junior Sound Designer | Sound Design Team |
| AD | Design Final (days) | Consensus | — |

Each pair = Est Min | Est Max. Total: 19 design columns.

### Engineering Estimators (cols AE–AY)

| Cols | Estimator | Role | Team |
|---|---|---|---|
| AE–AF | Samer Balushi | Backend Developer | Backend Engineering Team |
| AG–AH | Nikos Gerontakis | Senior Full Stack Developer | Backend Engineering Team |
| AI–AJ | Daniel Negri | Senior Full Stack Developer | Backend Engineering Team |
| AK–AL | Ilya Achmetov | Gameplay Developer | Gameplay Team |
| AM–AN | Raynor D'Souza | Senior Gameplay Developer | Gameplay Team |
| AO–AP | Leon Huang | Gameplay Developer | Gameplay Team |
| AQ–AR | Ignasi Ezpeleta | Junior Gameplay Developer | Gameplay Team |
| AS–AT | Roberto (TBC) | Engineer (TBC) | TBC |
| AU–AV | Matt (TBC) | Engineer (TBC) | TBC |
| AW–AX | Mustafa Sibai (Adjusted) | Head of Engineering | Lead |
| AY | Engineering Notes | — | — |

Each pair = Est Min | Est Max. Total: 21 engineering columns.

**Grand total: 11 metadata + 19 design + 21 engineering = 51 columns**

## Team → Department Mapping

| Source Team | Department |
|---|---|
| Game design | Design |
| Level design | Design |
| Narrative | Design |
| UX/UI | Art |
| Concept Art | Art |
| Environment Art | Art |
| Character Art | Art |
| Animation & Rigging | Art |
| VFX | Art |
| TechArt | Art |
| Gameplay Engineering | Engineering |
| Backend Engineering | Engineering |
| QA | QA |
| Audio | Audio |

## Epic Name Normalisation

| Source Name | Template Epic |
|---|---|
| Combat System | Combat |
| Social | Social & Multiplayer |
| Rename to in-game camera squancer during dialog | World Systems |
| Phasing system | World Systems |
| Items & Inventory | Items & Inventory |
| Live Service Support | Live Game |

## Row Expansion Rules

1. Each source row becomes one template row
2. Epic/Feature columns are filled only on the FIRST row of each group (sparse fill, matching source sheet pattern)
3. Story and Task columns filled per source data
4. Where the same Story appears in both Design and Engineering with the same Team, merge into one row (both estimator sets populated)
5. Where the same Story has different Teams in each sheet, keep as separate rows

## All estimates go into Early Production phase

Per Glen's direction: this is all VS (Vertical Slice) work targeted at Early Production.

## NOT FOR VS Items

Include in template but mark in Notes column as "NOT FOR VS". Items:
- P2P Item Transfer, Durable Items, Mounts (Items & Inventory)
- Dialogue Cinematics, Meta Quest System, Quest Generator (Quest System)
- Dueling, Notifications, PVP Server, LFG, Friends, Co-op Raids (Social)
- Platform, Live Service Game, Partner Build, Product Publishing, Red Books, Monetisation Bible (The Rest)

## QA Checklist (post-population)

1. Row count per epic matches source sheet totals
2. Every source row has a corresponding template row (zero data loss)
3. Estimate values match source exactly (spot-check 50+ cells)
4. No duplicate rows (same Epic/Feature/Story/Task/Team appearing twice)
5. Feature-level estimate sums cross-checked against hours_mapping.txt
6. All teams present in Department column
7. Roberto and Matt flagged for role confirmation
