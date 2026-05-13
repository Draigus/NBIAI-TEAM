# QA Report: CouchHeroes_Man_Day_Work_Plan_v12_consolidated.xlsx
Generated: 2026-05-12 10:13

**Sources:**
1. `VS Estimation Design - General Sheet.xlsx` (sheet: Sorted by Epic)
2. `VS Estimation Engineering - General Sheet (1).xlsx` (sheet: Sheet1)

Design source: 640 rows loaded
Engineering source: 922 rows loaded
Consolidated: 1145 rows loaded

---
## CHECK 1: Row Count Verification

| Metric | Count |
|---|---|
| Design source total rows | 640 |
| Design rows with estimates | 231 |
| Design hierarchy-only rows | 409 |
| Engineering source total rows | 922 |
| Engineering rows with estimates | 442 |
| Engineering hierarchy-only rows | 480 |
| **Consolidated total rows** | **1145** |
| Consolidated with design estimates | 231 |
| Consolidated with engineering estimates | 436 |
| Consolidated with any estimates | 667 |
| Consolidated with no estimates | 478 |

Raw sum of source rows: 640 + 922 = 1562
Consolidated rows: 1145
Difference (merged/deduplicated): 417

**RESULT: INFO** - Consolidated has 1145 rows. Source total is 1562. The difference of 417 rows represents items that appeared in both Design and Engineering sheets and were merged into single rows.

---
## CHECK 2: Estimate Value Spot-Checks

### Design Estimate Spot-Checks (10 items from varied epics)

| Src Row | Epic | Item | Estimator | Source | Consolidated | Match |
|---|---|---|---|---|---|---|
| 5 | Player Build | Tutorial Cave Layout Fixes | Yorgos_min | 8.0 | 8 | YES |
| 48 | World Systems | Full Motion Video (FMV) | Kieron_min | no idea | no idea | YES |
| 361 | Quest System | Lockpicking | Nadir_min | 8.0 | 8 | YES |
| 397 | User Space | FTUE Design | Yorgos_min | 4.0 | 4 | YES |
| 453 | Social & Multiplayer | Guild house blockout | Panos_min | 6.0 | 6 | YES |
| 457 | Social & Multiplayer | Guild Chat design | Yorgos_min | 3.0 | 3 | YES |
| 460 | Social & Multiplayer | Party formation | Yorgos_min | 3.0 | 3 | YES |
| 467 | Social & Multiplayer | Loot Distribution | Yorgos_min | 2.0 | 2 | YES |
| 472 | Social & Multiplayer | In-game Mail | Yorgos_min | 2.0 | 2 | YES |
| 476 | Social & Multiplayer | Mail UI Audio | Aggeliki_min | 0.5 | 0.5 | YES |

### Engineering Estimate Spot-Checks (10 items from varied epics)

| Src Row | Epic | Item | Estimator | Source | Consolidated | Match |
|---|---|---|---|---|---|---|
| 6 | World Systems | Create placeholder FMV playback flo | Ilya_min | 1.0 | 1 | YES |
| 32 | Rename to in-game camera  | Custom camera position and rotation | Ilya_min | 1.0 | 1 | YES |
| 59 | Phasing system | Research phasing system | Samer_min | 2.0 | 2 | YES |
| 70 | Quest System | Check if lockpicking solution is co | Ilya_min | 1.0 | 1 | YES |
| 203 | Combat System | Combat Tech anim? | Matt_min | 10.0 | 10 | YES |
| 204 | Combat System | Weapon spesific hand poses | Matt_min | 2.0 | 2 | YES |
| 205 | Combat System | Aim offset implementation | Matt_min | 2.0 | 2 | YES |
| 206 | Combat System | Review the combat with networking e | Ilya_min | 8.0 | 8 | YES |
| 207 | Combat System | Death sequance system | Ilya_min | 4.0 | 4 | YES |
| 214 | Combat System | Integrate abilities with skill path | Ilya_min | 3.0 | 3 | YES |

**RESULT: PASS** - All 20/20 spot-checked values match exactly.

---
## CHECK 3: Data Loss Check

Design unique (epic, feature, story, task, team) tuples: 626
Engineering unique tuples: 899
Consolidated unique tuples: 1119

Design tuples missing from consolidated (strict match): 261
Engineering tuples missing from consolidated (strict match): 574

### Relaxed Match (item text + team, hierarchy-independent)

Design items not found by text+team: 10
  - `Combat System` / Team: ``
  - `Live Service Support` / Team: ``
  - `Platform` / Team: ``
  - `Player Build` / Team: ``
  - `Player Economy` / Team: ``
  - `Quest System` / Team: ``
  - `Social & Multiplayer` / Team: ``
  - `User Space` / Team: ``
  - `World Systems` / Team: ``
  - `World Systems` / Team: `Game design`
Engineering items not found by text+team: 15
  - `Combat` / Team: ``
  - `Combat System` / Team: ``
  - `Items & Inventory` / Team: ``
  - `Live Service Support` / Team: ``
  - `Phasing system` / Team: ``
  - `Platform` / Team: ``
  - `Player Build` / Team: ``
  - `Player Economy` / Team: ``
  - `Quest System` / Team: ``
  - `Quest Tools` / Team: `Gameplay Engineering`

**RESULT: FAIL** - 25 items missing from consolidated by relaxed match.

---
## CHECK 4: Duplicate Check

Total unique keys in consolidated: 1119
Keys appearing more than once: 13

| Epic | Feature | Story | Task | Team | Count |
|---|---|---|---|---|---|
| Quest System | Main Questline: Crit |  | Docs, Implement, Revise | Game design | 6 |
| Quest System | Main Questline: Crit |  | Quest Design Doc | Game design | 4 |
| Quest System | Main Questline: Crit |  | Quest Implementation | Game design | 4 |
| Quest System | Main Questline: Crit |  | Quest Narrative Doc | Narrative | 4 |
| Quest System | Main Questline: Crit |  | Quest Playtesting & Revision | Game design | 4 |
| World Systems | Instancing |  | Create a service in nodejs | Backend Enginee | 3 |
| World Systems | Create a system to a |  | Document phasing system | Backend Enginee | 2 |
| World Systems | Instancing |  | Create Nodejs service | Backend Enginee | 2 |
| World Systems | Navigation |  | Party player position | Gameplay Engine | 2 |
| World Systems | Navigation |  | Special NPCs positions | Gameplay Engine | 2 |
| World Systems | Navigation |  | Zoom out/in | Gameplay Engine | 2 |
| World Systems | World Resources |  | QA check | QA | 2 |
| Quest System | Quest Integration |  | QA check | QA | 2 |

Duplicate keys with multiple estimate-bearing rows: 11
Duplicate keys where only 0-1 rows carry estimates (benign): 2

**RESULT: FAIL** - 11 duplicate keys where multiple rows carry estimate data.

---
## CHECK 5: Column Integrity (Design/Engineering estimate separation)

Rows with BOTH design AND engineering numeric estimates: 0

| Category | Count |
|---|---|
| Design estimates only | 231 |
| Engineering estimates only | 436 |
| No numeric estimates (hierarchy/metadata) | 478 |
| Both (cross-contamination) | 0 |

**RESULT: PASS** - Design and engineering estimates are cleanly separated.

---
## CHECK 6: Empty Row Check

Rows scanned: 1145 (row 4 to 1148)
Completely empty rows: 0

**RESULT: PASS** - No empty or contentless rows found.

---
## CHECK 7: Epic/Feature Coverage

Total unique Epics in consolidated: 11

| Epic | Features | Total Rows |
|---|---|---|
| Combat | 9: Basic Magic system, Combat AI behavior, Combat abilities, Combat component, Combat director ... (+4 more) | 100 |
| Game Bibles | 2: Monetization Bible, Red Books (emergency guid | 2 |
| Items & Inventory | 4: Banks, Inventory System, P2P Item Transfer, Sync hotbar to db | 17 |
| Live Game | 3: In game RMT Store, Subscription page on the , Virtual currency balance  | 37 |
| Platform | 13: Bugged Dungeon Integratio, Partner Loop, Partner Portal, Player Account Authentifi, Player Account Creation/D ... (+8 more) | 61 |
| Player Build | 6: Achievements & Trophies, Character Creation & Cust, Garment System, In-game Tutorial, Player Progression ... (+1 more) | 78 |
| Player Economy | 6: Auction House economy, Garment Shop, In-game economy, Partner Shop, Trading System ... (+1 more) | 40 |
| Quest System | 11: Main Questline: Critical , Quest Integration, Quest Item, Quest Multiplayer, Quest Rewards System ... (+6 more) | 91 |
| Social & Multiplayer | 12: Chat system, Co-op - Party, Co-op/Raids, Dungeon finder, Friends ... (+7 more) | 169 |
| User Space | 8: Anywhere door placement, Fishing, P2P/P2G User Space Connec, Pets (mechanical parrot r, Saving House Layouts ... (+3 more) | 84 |
| World Systems | 32: Advanced Traversal, Basic movement system, Camera behavior, Carapax (Hero, but one ty, Corrupted Guardian ... (+27 more) | 466 |

Design source distinct epics: 9
Engineering source distinct epics: 14
Consolidated distinct epics: 11

Epics MISSING from consolidated: ['Combat System', 'Live Service Support', 'Phasing system', 'Rename to in-game camera squancer during dialog', 'Social']
Epics in consolidated but NOT in sources: ['Game Bibles', 'Live Game']
**RESULT: FAIL** - 5 epic(s) missing from consolidated.

---
## EXTENDED: Comprehensive Estimate Verification (full scan)

### Design Estimates
- Rows with estimates: 231
- Rows fully verified: 211
- Rows with mismatches: 20
- Rows not found in consolidated: 0
- Individual values checked: 989
- Values matched: 943
- Values mismatched: 46

Design mismatches (up to 20):

| Src Row | Item | Team | Estimator | Source | Consolidated |
|---|---|---|---|---|---|
| 200 | Narrative | Narrative | Maria_max | 2.0 | 1 |
| 281 | Design | Game design | Yorgos_min | 4.0 | 2 |
| 281 | Design | Game design | Yorgos_max | 6.0 | 3 |
| 281 | Design | Game design | Nadir_min | 7.0 | None |
| 281 | Design | Game design | Nadir_max | 10.0 | None |
| 294 | Design | Game design | Nadir_min | 7.0 | None |
| 294 | Design | Game design | Nadir_max | 10.0 | None |
| 294 | Design | Game design | Kieron_max | 10.0 | 5 |
| 294 | Design | Game design | Final | 9.0 | 5 |
| 302 | SFX | Audio | Aggeliki_min | 7.0 | 5 |
| 302 | SFX | Audio | Aggeliki_max | 14.0 | 8 |
| 307 | Design | Game design | Nadir_min | 7.0 | None |
| 307 | Design | Game design | Nadir_max | 10.0 | None |
| 307 | Design | Game design | Final | 9.0 | 5 |
| 315 | SFX | Audio | Aggeliki_min | 0.0 | 5 |
| 315 | SFX | Audio | Aggeliki_max | 0.0 | 8 |
| 315 | SFX | Audio | Final | 0.0 | 7 |
| 318 | Design | Game design | Yorgos_min | 4.0 | 2 |
| 318 | Design | Game design | Yorgos_max | 6.0 | 3 |
| 318 | Design | Game design | Nadir_min | 7.0 | None |

### Engineering Estimates
- Rows with estimates: 437
- Rows fully verified: 413
- Rows with mismatches: 23
- Rows not found in consolidated: 1
- Individual values checked: 4039
- Values matched: 3957
- Values mismatched: 82

Engineering mismatches (up to 20):

| Src Row | Item | Team | Estimator | Source | Consolidated |
|---|---|---|---|---|---|
| 16 | Create a system to disallow the player f | Gameplay Engineering | Leon_max | 3.0 | 4 |
| 62 | Document phasing system | Backend Engineering | Samer_min | 2.0 | None |
| 62 | Document phasing system | Backend Engineering | Samer_max | 5.0 | None |
| 62 | Document phasing system | Backend Engineering | Nikos_min | 1.0 | None |
| 62 | Document phasing system | Backend Engineering | Nikos_max | 2.0 | None |
| 62 | Document phasing system | Backend Engineering | Daniel_min | 4.0 | None |
| 62 | Document phasing system | Backend Engineering | Daniel_max | 7.0 | None |
| 144 | Special NPCs positions | Gameplay Engineering | Ilya_min | 3.0 | 2 |
| 144 | Special NPCs positions | Gameplay Engineering | Ilya_max | 5.0 | 4 |
| 144 | Special NPCs positions | Gameplay Engineering | Leon_max | 5.0 | 3 |
| 144 | Special NPCs positions | Gameplay Engineering | Roberto_max | 4.0 | 3 |
| 145 | Zoom out/in | Gameplay Engineering | Leon_max | 5.0 | 3 |
| 145 | Zoom out/in | Gameplay Engineering | Roberto_min | 1.0 | 0.5 |
| 145 | Zoom out/in | Gameplay Engineering | Roberto_max | 1.5 | 1 |
| 145 | Zoom out/in | Gameplay Engineering | Mustafa_adj_max | 1.0 | 2 |
| 146 | Party player position | Gameplay Engineering | Ilya_min | 3.0 | 4 |
| 146 | Party player position | Gameplay Engineering | Ilya_max | 5.0 | 6 |
| 146 | Party player position | Gameplay Engineering | Roberto_max | 4.0 | 3 |
| 261 | P2G Transactions Support | Backend Engineering | Samer_min | no idea what is P2G | None |
| 261 | P2G Transactions Support | Backend Engineering | Nikos_min | 4.0 | None |

### Combined Verification Summary
- Total rows verified: 624 / 668
- Total values checked: 5028
- Values matched: 4900 (97.5%)
- Values mismatched: 128
- Rows not matchable: 1

**RESULT: FAIL** - 43 rows have value mismatches (128 values wrong). 624 fully verified, 1 not found.

---
## Overall Summary

| # | Check | Result |
|---|---|---|
| 1 | Row Count | INFO - 1145 rows (Design 640 + Eng 922 = 1562, minus 417 merged) |
| 2 | Spot-Check Estimates | PASS - 20/20 matched |
| 3 | Data Loss | FAIL - 25 items missing by text+team |
| 4 | Duplicates | FAIL - 13 duplicate keys |
| 5 | Column Integrity | PASS - 0 cross-contaminated rows |
| 6 | Empty Rows | PASS - 0 empty |
| 7 | Epic/Feature Coverage | FAIL - 11 epics |
| Ext | Full Estimate Verify | FAIL - 4900/5028 values OK |

**OVERALL VERDICT: FAIL** - Critical issues found. See details above.