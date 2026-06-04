# Couch Heroes Man Day Work Plan — HANDOFF (Session 2)

**Date:** 2026-05-14, ~02:30
**Status:** v15 rebuilt with major corrections. Needs OCR verification pass + Glen UAT.
**File:** `CouchHeroes_Man_Day_Work_Plan_v15.xlsx`
**Build script:** `build_v12_clean.py`
**Branch:** `feature/command-centre` (uncommitted changes)

---

## What This Session Did

### 1. Recovered Lost Screenshot Work
Glen spent ~1 hour pasting Miro board screenshots into the previous chat. That chat crashed due to an image pixel limit error, losing all context. The screenshots were recovered from `E:\OneDrive\Pictures\Screenshots\Screenshot 2026-05-13 22*.png` (37 files, taken between 22:44 and 23:00). Four parallel agents extracted all 10 epics from the screenshots. Extraction data saved to:
- `_miro_epics_4_10_extraction.txt` — Epics 4-10 (new from this session)
- `_miro_master_extraction.txt` — Epics 1-3 (from previous session, still valid)

### 2. Rewrote MIRO_STORIES (Major Change)
Replaced the entire MIRO_STORIES block in `build_v12_clean.py`. Old version had ~107 entries with no hours. New version has **330 entries** with:
- Multi-discipline rows per story (one row per team: Concept Art, Character Art, Animation & Rigging, VFX, TechArt, UX/UI, Environment Art)
- Hour estimates converted to days at 7h/day using `round(hours/H, 1)`
- All 10 epics covered

### 3. Fixed Name Renames (Bug I Created)
I wrongly renamed stories when rewriting MIRO_STORIES. Fixed with `_fix_names.py`:
- "Pigs" → "Critter NPCs - Pigs (DONE)" (and all 5 other animals)
- "Gliding" → "Gliding System", "Grappling" → "Grappling System"
- "Locomotion" → "Locomotion System", "Water" → "Water System"
- "Player Environment" → "Player Environment Interaction"
- "Ethnicity Variants" → "Ethnicity Variations"
- "ENV/ANIM/CHAR/CONCEPT Bible" → full names restored
- Faction Icons/Insignias/Banners → back to Character Creation & Customization feature
- 4 Faction NPC Variant entries restored

### 4. Fixed Parser Dropping Real Data
**Design sheet feature-level rows:** The parser skipped rows where estimators put numbers on the Feature row (column B) instead of Story rows (column C). Fixed by checking for estimates on feature rows and including them. Added 30 design rows.

**Engineering missing-team rows:** Row 116 "Make quest system" had Mustafa estimates but blank team. Fixed with team inheritance from parent row. Added 15 engineering rows.

### 5. Removed Duplicate Rows (Major Fix)
**The core problem Glen identified:** Both estimation sheets listed stories for ALL departments, but only their own team estimated. This created hundreds of blank duplicate rows.

**Design sheet filter:** Only import Robin's team — Game design, Level design, Narrative, QA, Audio, UX/UI. Defined as `DESIGN_SHEET_TEAMS` constant. Dropped 273 blank Art/Engineering rows.

**Engineering sheet filter:** Drop non-engineering team rows unless they have estimates. Remap estimated art-team rows (41 Mustafa animation/rigging estimates) to Gameplay Engineering. Dropped 315 blank rows.

### 6. Added Missing POI/Biome Hours
20 POI stories and 3 biome stories had no hours. Added from master extraction data:
- Medium POIs: 460-750h total (all env art pipeline tasks summed)
- Epic-scale POIs (Tower, Battle Hill): 760-1140h
- Biomes (Mediterranean, Lush): 604-953h

---

## Current State of v15

**Row counts:**
- Design: 304 rows (Robin's team only)
- Engineering: 502 rows (eng teams + Mustafa's tech animation → Gameplay Developer)
- Miro: 330 stories (art team, 283 with hours)
- **Total: 1,171 stories, 1,343 Plan sheet rows**

**Blank rows: 167**
- QA: 61 (Hannah's team never estimated)
- Gameplay Engineering: 43 (no Mustafa estimates for these)
- Backend Engineering: 24 (same)
- Game design: 13 (feature headers for enemies)
- Art teams: 26 (NOT FOR VS, MVP DONE, placeholders)
- All confirmed blank in source material

**Estimate logic:**
- Engineering: Mustafa Adjusted first, fall back to min(individual mins)/max(individual maxes)
- Design: min of individual estimator mins, max of Final or individual maxes
- Miro: hours/7 converted to days, one row per discipline per story

**Formatting:** Verified against v14 DRAFT — colours, fonts, borders, stripes, hidden columns, freeze panes, zoom all match. One cosmetic fix applied (text_wrap on Story header C4).

---

## What Needs Doing Next Session

### 1. OCR Verification Pass (Priority)
Re-read the 37 screenshots at `E:\OneDrive\Pictures\Screenshots\Screenshot 2026-05-13 22*.png` and cross-check extracted hours against what's in MIRO_STORIES. Flag any discrepancies. Two independent reads that agree = confirmed. Disagreements → Glen eyeballs the screenshot.

### 2. Glen UAT
Glen reviews the sheet in Excel:
- Spot-check specific stories he knows should have numbers
- Verify story names match what the studio uses
- Check feature assignments make sense
- Confirm the 167 blanks are genuinely unestimated by the teams

### 3. QA Script Updates
- `qa_check.py` and `qa_strict.py` still use old source counts (547/802). Need updating to reflect the new filters (304/502).
- `find_miro_gaps.py` checks old story names. Needs updating for renamed entries.
- `qa_strict.py` has a positional matching bug for duplicate story+team combinations across features.

### 4. Remaining 47 Miro Stories Without Hours
These are the blank Miro entries. Most are legitimately NOT FOR VS, MVP DONE, or umbrella entries. Glen should confirm which ones truly need hours vs which are placeholders.

---

## Key Design Decisions Made This Session

1. **Design sheet scope = Robin's team only** — Game design, Level design, Narrative, QA, Audio, UX/UI. No art or engineering.
2. **Engineering sheet: non-eng rows with Mustafa estimates → remap to Gameplay Engineering** — these are engineering tool/pipeline estimates for animation/rigging work.
3. **No merging across sources** — same story from different sheets = different rows.
4. **Mustafa Adjusted first, team estimates as fallback** — confirmed by Glen after seeing Mustafa is 45% lower than team averages (88% of cases).
5. **Stories only in the final sheet** — no tasks or sub-tasks. Miro task-level hours summed up to story level per discipline.
6. **7h/day conversion** for all Miro art hours.

---

## Files Modified (Uncommitted)

| File | Change |
|---|---|
| `build_v12_clean.py` | MIRO_STORIES rewrite (330 entries with hours), parser fixes (feature-level rows, team inheritance), team filters (DESIGN_SHEET_TEAMS, ENG_SHEET_TEAMS), animation remap, text_wrap fix |
| `CouchHeroes_Man_Day_Work_Plan_v15.xlsx` | Rebuilt output |
| `_miro_epics_4_10_extraction.txt` | New: screenshot extraction for Epics 4-10 |
| `_miro_stories_new.py` | Temp: new MIRO_STORIES block (used for replacement) |
| `_miro_screenshot_extraction.txt` | Existing from previous session |
| `_miro_master_extraction.txt` | Existing from previous session |
| Various `_check_*.py`, `_fix_*.py` | Temp utility scripts (can delete) |

---

## How to Rebuild

```bash
cd "D:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Couch Heroes\production"
# Close Excel first
python build_v12_clean.py
```

---

## Critical Memory Saved

`project_couch_heroes_workplan.md` in memory — the objective, three sources, zero-data-loss requirement, and key design decisions are now persisted across sessions.
