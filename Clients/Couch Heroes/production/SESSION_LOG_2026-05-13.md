# Session Log — 2026-05-13 (Couch Heroes Production Plan)

## What happened this session

Glen directed the consolidation of three data sources into the v11 template:
1. VS Estimation Design sheet (547 rows, 9 design estimators)
2. VS Estimation Engineering sheet (802 rows, 9 eng estimators + Mustafa Adjusted)
3. Miro board (78 game systems features + 35 ENV art items + full org chart hierarchy)

### Key decisions Glen made:
- **No merging**: every source row is its own output row (1,349 from sheets + 35 art = 1,384)
- **Same story name, different team = different rows** (distinct work items)
- **One epic, one feature, many stories** — epics and features are singular, stories are per-team
- **Team column format**: "Department | Team" (e.g., "Design | Game design")
- **Early Prod Min/Max per role**: each of 38 roles gets Min and Max columns
- **7-hour days** for converting Miro art hours
- **Department-level dropdowns** on Resource Planner (all Design staff for any design role, etc.)
- **Zebra striping** on Resource Planner for readability
- **v14 DRAFT formatting is the authority**: 14pt headers, 12pt bold centered EP data, off-white stripes, thin borders, hidden columns, 130% zoom

### What was built (v15):
- **Plan sheet**: 1,556 rows, 474 cols, v14-matching formatting
- **Staff sheet**: 46 people from org chart (full studio roster)
- **Resource Planner**: 1,397 rows, dept-level dropdowns, zebra striping
- **Person Dashboard**: 46 staff, formula-driven workload summaries
- **Feature Timeline**: 65 features with story counts and total days
- **Summary**: Formula-driven EP totals per epic per role
- **Epics & Features**: Formula-driven with COUNTIF story counts
- **Reference sheets restored**: Roles, Gates, Tiers, Legend

### Bugs found and fixed:
1. openpyxl merged cell fills not rendering — switched to xlsxwriter
2. Feature name matching (72/73 then 73/73)
3. Cross-feature dedup collapsing generic task names — fixed with source_feat+parent_story key
4. Then removed ALL dedup per Glen's direction
5. Engineering Mustafa fallback — when Mustafa=None or 0, fall back to individual engineer min/max
6. 22 hidden columns matching v14 exactly (was 39 due to set_column conflicts)
7. Miro art estimates missing — added 35 ENV text block items as story rows

### Completed after Glen went to bed:
- **Miro card batch fetch completed** — 103 individual cards verified + 10 org_chart summaries covering all 1,531 cards
- **63 new Miro stories extracted** from org_chart summaries (NPCs, character art, env systems, game bibles, etc.)
- **All 63 added to Plan + Resource Planner** as story rows under correct template features
- **Final counts:** 1,447 stories (1,349 estimation sheets + 35 ENV art + 63 Miro stories), 58 features with data, 46 staff, 11 sheets
- **4 Game Bible stories have hour estimates** (Colour Palette 5.7-8.6d, Typography 5.7-8.6d, Wireframes 5.7-8.6d, Game Logo 11.4-14.3d)
- **59 Miro stories have no hour estimates** — they're placeholders from the Miro board that need estimates added later

### Known limitations:
- Miro API doesn't return individual card data for org_chart children (empty data fields). Story content extracted from AI-generated summaries, not raw card data.
- Some Miro stories may be missing — the AI summaries don't always list every card by name. Glen may want to compare against the actual Miro board visually.
- The 35 ENV art hour estimates are from free text blocks, not from individual cards. The accuracy of the feature mapping (e.g., which architecture kit goes under which biome) should be reviewed by Glen.

### Files:
- `build_v12_clean.py` — master build script (xlsxwriter-based)
- `CouchHeroes_Man_Day_Work_Plan_v15.xlsx` — current output
- `_miro_all_items.txt` — Miro board full extraction (AI summaries)
- `_miro_cards_detail.txt` — will contain individual card data when agent completes
- `qa_check.py` / `qa_strict.py` — QA verification scripts
