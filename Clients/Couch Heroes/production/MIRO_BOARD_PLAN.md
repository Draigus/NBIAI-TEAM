# Couch Heroes Miro Board — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full production scope map on Miro board `uXjVGRIXN-0=` with all 1,491 stories from v15 as editable cards, organized by epic > feature > story hierarchy.

**Architecture:** Python script reads v15 Excel, extracts structured data (epics, features, stories with teams and estimates), then iterates through each epic calling the Miro `layout_create` API to place frames, feature headers, and story cards. Visual verification via browser after each epic.

**Tech Stack:** Python (openpyxl for Excel reading), Miro MCP API (layout_create DSL), Chrome extension for visual QA.

---

## File Structure

| File | Responsibility |
|---|---|
| `Clients/Couch Heroes/production/extract_v15_for_miro.py` | Read v15 Excel, output structured JSON with all epics/features/stories |
| `Clients/Couch Heroes/production/v15_miro_data.json` | Extracted data (intermediate artifact for inspection) |

No other files created or modified. The Miro board is built via API calls, not files.

---

### Task 1: Extract v15 Data to Structured JSON

**Files:**
- Create: `Clients/Couch Heroes/production/extract_v15_for_miro.py`
- Create: `Clients/Couch Heroes/production/v15_miro_data.json` (output)
- Read: `Clients/Couch Heroes/production/CouchHeroes_Man_Day_Work_Plan_v15.xlsx`

- [ ] **Step 1: Write the extraction script**

```python
#!/usr/bin/env python3
"""Extract v15 Plan sheet into structured JSON for Miro board creation."""

import json
import openpyxl
import sys

TEAM_TO_DEPT = {
    'Game design': 'Design', 'Level design': 'Design', 'Narrative': 'Design',
    'UX/UI': 'Art', 'Concept Art': 'Art', 'Environment Art': 'Art',
    'Character Art': 'Art', 'Animation & Rigging': 'Art', 'VFX': 'Art',
    'TechArt': 'Art', 'Gameplay Engineering': 'Engineering',
    'Backend Engineering': 'Engineering', 'QA': 'QA', 'Audio': 'Audio',
}

TEAM_DISPLAY = {
    'Game design': 'Design | Game Design',
    'Level design': 'Design | Level Design',
    'Narrative': 'Design | Narrative',
    'UX/UI': 'Art | UX/UI',
    'Concept Art': 'Art | Concept Art',
    'Environment Art': 'Art | Environment Art',
    'Character Art': 'Art | Character Art',
    'Animation & Rigging': 'Art | Animation',
    'VFX': 'Art | VFX',
    'TechArt': 'Art | Tech Art',
    'Gameplay Engineering': 'Eng | Gameplay',
    'Backend Engineering': 'Eng | Backend',
    'QA': 'QA',
    'Audio': 'Audio | Sound',
}

DEPT_COLOURS = {
    'Design': '#4A90D9', 'Art': '#9B59B6', 'Engineering': '#27AE60',
    'Audio': '#F39C12', 'QA': '#E74C3C',
}

def extract():
    wb = openpyxl.load_workbook(
        'CouchHeroes_Man_Day_Work_Plan_v15.xlsx',
        read_only=True, data_only=True
    )
    ws = wb['Plan']

    epics = {}
    current_epic = None
    current_feature = None

    for row in ws.iter_rows(min_row=5, values_only=False):
        vals = [cell.value for cell in row]

        epic_val = vals[0]  # Col A
        feature_val = vals[1]  # Col B
        story_val = vals[2]  # Col C
        team_val = vals[3]  # Col D

        if epic_val:
            current_epic = str(epic_val).strip()
        if feature_val:
            current_feature = str(feature_val).strip()

        if not story_val or not current_epic or not current_feature:
            continue

        story_name = str(story_val).strip()
        team = str(team_val).strip() if team_val else 'Unknown'
        dept = TEAM_TO_DEPT.get(team, 'Unknown')
        display = TEAM_DISPLAY.get(team, team)
        colour = DEPT_COLOURS.get(dept, '#888888')

        # Extract Early Prod Min/Max estimate
        # EP Min/Max columns start at col index 86 (0-indexed)
        # We need to find the relevant role columns for this team
        # Simpler: scan EP columns for any non-zero values
        est_min = None
        est_max = None

        # EP role columns: 86-161 (0-indexed), pairs of min/max
        for ci in range(86, 162, 2):
            min_val = vals[ci] if ci < len(vals) else None
            max_val = vals[ci + 1] if ci + 1 < len(vals) else None
            if min_val and isinstance(min_val, (int, float)) and min_val > 0:
                if est_min is None or min_val < est_min:
                    est_min = min_val
            if max_val and isinstance(max_val, (int, float)) and max_val > 0:
                if est_max is None or max_val > est_max:
                    est_max = max_val

        # Also check Concept phase (single cols, indices 8-45)
        if est_min is None:
            for ci in range(8, 46):
                val = vals[ci] if ci < len(vals) else None
                if val and isinstance(val, (int, float)) and val > 0:
                    if est_min is None:
                        est_min = val
                        est_max = val
                    else:
                        est_min = min(est_min, val)
                        est_max = max(est_max, val)

        estimate = None
        if est_min is not None and est_max is not None:
            est_min = round(est_min, 1)
            est_max = round(est_max, 1)
            if est_min == est_max:
                estimate = f"{est_min}d"
            else:
                estimate = f"{est_min}-{est_max}d"

        # Build hierarchy
        if current_epic not in epics:
            epics[current_epic] = {'features': {}, 'story_count': 0}
        if current_feature not in epics[current_epic]['features']:
            epics[current_epic]['features'][current_feature] = []
        
        epics[current_epic]['features'][current_feature].append({
            'name': story_name,
            'team': team,
            'dept': dept,
            'display': display,
            'colour': colour,
            'estimate': estimate,
        })
        epics[current_epic]['story_count'] += 1

    wb.close()

    # Convert to list format for JSON
    output = []
    for epic_name, epic_data in epics.items():
        features = []
        for feat_name, stories in epic_data['features'].items():
            features.append({
                'name': feat_name,
                'stories': stories,
                'story_count': len(stories),
            })
        output.append({
            'name': epic_name,
            'features': features,
            'story_count': epic_data['story_count'],
            'feature_count': len(features),
        })

    with open('v15_miro_data.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    total_stories = sum(e['story_count'] for e in output)
    total_features = sum(e['feature_count'] for e in output)
    print(f"Extracted {len(output)} epics, {total_features} features, {total_stories} stories")
    for e in output:
        print(f"  {e['name']}: {e['feature_count']} features, {e['story_count']} stories")

if __name__ == '__main__':
    extract()
```

- [ ] **Step 2: Run the extraction**

```bash
cd "D:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Couch Heroes\production"
python extract_v15_for_miro.py
```

Expected: prints epic/feature/story counts. Total should be ~1,491 stories across ~61 features and ~13 epics.

- [ ] **Step 3: Inspect the JSON**

Read `v15_miro_data.json` and verify:
- All 13 epics present
- Story counts match v15 (1,491 total)
- Each story has name, dept, display, colour, estimate
- No empty features, no missing teams

- [ ] **Step 4: Commit**

```bash
git add extract_v15_for_miro.py v15_miro_data.json
git commit -m "feat(ch): extract v15 data to structured JSON for Miro board build"
```

---

### Task 2: Build Epic Frames on Miro Board

**Depends on:** Task 1 (need v15_miro_data.json)

Read the extracted JSON. For each epic, create a FRAME on the Miro board positioned below Game Pipelines. Use `layout_create` DSL.

**Layout strategy:**
- Game Pipelines frame is at approximately (118194, 280481)
- Start new content at y = 310000 (well below Game Pipelines)
- Arrange epics in a 4-column grid with generous spacing
- Each frame sized to hold its features and stories
- Frame width: 4000px (enough for ~12 cards per row at 300px each + spacing)
- Frame height: calculated per epic based on story count

- [ ] **Step 1: Read the JSON data**

```python
import json
with open('v15_miro_data.json', 'r') as f:
    data = json.load(f)
```

- [ ] **Step 2: Calculate frame sizes and positions**

Each story card is approximately 300w x 120h. Cards laid out in rows of 10 within each feature. Each feature needs:
- Title bar: 60px
- Cards: ceil(story_count / 10) rows x 140px per row
- Padding: 80px top, 40px bottom

Epic frame height = sum of all feature heights + epic title (100px) + padding.

Grid layout: 4 columns, x spacing = 4400px, y spacing = 200px between rows.

```python
CARD_W = 300
CARD_H = 120
CARDS_PER_ROW = 10
ROW_H = 140
FEATURE_TITLE_H = 60
FEATURE_PAD = 40
EPIC_TITLE_H = 100
EPIC_PAD = 100
FRAME_W = 4000

GRID_COLS = 4
GRID_X_START = 100000
GRID_Y_START = 310000
COL_SPACING = 4400
ROW_SPACING = 200

for i, epic in enumerate(data):
    col = i % GRID_COLS
    # Calculate height
    total_h = EPIC_TITLE_H + EPIC_PAD
    for feat in epic['features']:
        rows = -(-feat['story_count'] // CARDS_PER_ROW)  # ceil div
        feat_h = FEATURE_TITLE_H + rows * ROW_H + FEATURE_PAD
        total_h += feat_h
    epic['frame_w'] = FRAME_W
    epic['frame_h'] = max(total_h, 400)
    epic['frame_x'] = GRID_X_START + col * COL_SPACING
```

- [ ] **Step 3: Create all 13 epic frames via layout_create**

Build DSL for all frames in one call:

```
epic1 FRAME x=100000 y=310000 w=4000 h=2400 fill=#12122a "COMBAT"
epic2 FRAME x=104400 y=310000 w=4000 h=1800 fill=#12122a "WORLD SYSTEMS"
...
```

Call `mcp__claude_ai_Miro__layout_create` with the board URL and DSL.

- [ ] **Step 4: Record the frame IDs returned**

The API returns created item IDs. Store the mapping: epic name -> frame Miro URL. These URLs are needed as `parent=` references when creating child items.

- [ ] **Step 5: Visual verification**

Open the board in Chrome extension, navigate to the area around (100000, 310000), verify 13 frames are visible with correct titles.

---

### Task 3: Build Feature Headers and Story Cards (Per Epic)

**Depends on:** Task 2 (need frame IDs)

For each epic frame, create:
1. Feature title (TEXT item) for each feature
2. Story cards (CARD items) within each feature group

**This task is repeated 13 times, once per epic.** Process one epic at a time to stay within DSL character limits and allow visual verification between epics.

**Card content format:**
Each CARD uses the `desc=` field for department/estimate/tier info, and the title for the story name.

```
storyN CARD parent=epicFrame x=X y=Y w=280 h=110 theme=#DEPT_COLOUR desc="Dept | Team | Est: X-Yd | T0 Ideation" "Story Name"
```

- [ ] **Step 1: For each epic, generate the DSL**

For a given epic with frame URL `frameUrl`:

```python
dsl_lines = []
y_cursor = EPIC_TITLE_H  # Start below epic title

for feat_idx, feat in enumerate(epic['features']):
    # Feature title
    feat_id = f"ft{epic_idx}_{feat_idx}"
    dsl_lines.append(
        f'{feat_id} TEXT parent={frame_url} x={FRAME_W//2} y={y_cursor + 20} '
        f'w={FRAME_W - 100} font=open_sans size=18 color=#FFFFFF '
        f'align=left "<p><b>{feat["name"]}</b> — {feat["story_count"]} stories</p>"'
    )
    y_cursor += FEATURE_TITLE_H

    # Story cards in rows of CARDS_PER_ROW
    for s_idx, story in enumerate(feat['stories']):
        col = s_idx % CARDS_PER_ROW
        row = s_idx // CARDS_PER_ROW
        card_x = 160 + col * (CARD_W + 10)
        card_y = y_cursor + row * ROW_H + ROW_H // 2

        card_id = f"s{epic_idx}_{feat_idx}_{s_idx}"
        desc = f"{story['display']} | Est: {story['estimate'] or 'TBD'} | T0 Ideation"
        title = story['name'].replace('"', "'")
        desc_clean = desc.replace('"', "'")

        dsl_lines.append(
            f'{card_id} CARD parent={frame_url} x={card_x} y={card_y} '
            f'w={CARD_W} h={CARD_H - 10} theme={story["colour"]} '
            f'desc="{desc_clean}" "{title}"'
        )

    rows_used = -(-feat['story_count'] // CARDS_PER_ROW)
    y_cursor += rows_used * ROW_H + FEATURE_PAD
```

- [ ] **Step 2: Batch the DSL into chunks under 50,000 chars**

If an epic's DSL exceeds 50,000 chars, split into multiple `layout_create` calls. Split at feature boundaries (never mid-feature).

- [ ] **Step 3: Call layout_create for each batch**

```python
mcp__claude_ai_Miro__layout_create(
    miro_url=f"https://miro.com/app/board/uXjVGRIXN-0=/?moveToWidget={frame_id}",
    dsl=batch_dsl
)
```

- [ ] **Step 4: Visual verification after each epic**

After completing each epic, open the board in Chrome extension and verify:
- Feature titles visible and correctly named
- Story cards arranged in rows
- Card colours match department (blue/purple/green/amber/coral borders)
- Card descriptions show dept, estimate, and tier
- No cards outside the frame bounds
- Spacing looks clean and readable

- [ ] **Step 5: Iterate for all 13 epics**

Process epics in order. After all 13 are complete, do a final zoomed-out verification that all epic frames are visible and properly positioned.

---

### Task 4: Add Department Legend and Tier Legend

**Depends on:** Task 3 (all epics built)

Create a legend frame positioned to the left of the epic grid, showing:
1. Department colour key (5 departments)
2. Tier of Completion definitions (T0-T8)

- [ ] **Step 1: Create legend frame**

```
legend FRAME x=95000 y=310000 w=2000 h=2000 fill=#0d0d1a "LEGEND"
```

- [ ] **Step 2: Add department colour swatches**

Use SHAPE items with fill colours:

```
dl1 SHAPE parent=legend x=400 y=200 w=600 h=50 type=round_rectangle fill=#4A90D9 color=#FFFFFF font=open_sans size=14 "Design"
dl2 SHAPE parent=legend x=400 y=270 w=600 h=50 type=round_rectangle fill=#9B59B6 color=#FFFFFF font=open_sans size=14 "Art"
dl3 SHAPE parent=legend x=400 y=340 w=600 h=50 type=round_rectangle fill=#27AE60 color=#FFFFFF font=open_sans size=14 "Engineering"
dl4 SHAPE parent=legend x=400 y=410 w=600 h=50 type=round_rectangle fill=#F39C12 color=#FFFFFF font=open_sans size=14 "Audio"
dl5 SHAPE parent=legend x=400 y=480 w=600 h=50 type=round_rectangle fill=#E74C3C color=#FFFFFF font=open_sans size=14 "QA"
```

- [ ] **Step 3: Add tier definitions**

```
tt0 SHAPE parent=legend x=400 y=650 w=800 h=45 type=round_rectangle fill=#FFF9C4 color=#5D4037 font=open_sans size=12 "T0 — Ideation"
tt1 SHAPE parent=legend x=400 y=710 w=800 h=45 type=round_rectangle fill=#FFF176 color=#4E342E font=open_sans size=12 "T1 — R&D"
tt2 SHAPE parent=legend x=400 y=770 w=800 h=45 type=round_rectangle fill=#E8F5E9 color=#2E7D32 font=open_sans size=12 "T2 — GDD done, TDD done, art brief"
tt3 SHAPE parent=legend x=400 y=830 w=800 h=45 type=round_rectangle fill=#BBDEFB color=#1565C0 font=open_sans size=12 "T3 — Prototype (functional, no skins)"
tt4 SHAPE parent=legend x=400 y=890 w=800 h=45 type=round_rectangle fill=#90CAF9 color=#0D47A1 font=open_sans size=12 "T4 — MVP (limited quality, full featured)"
tt5 SHAPE parent=legend x=400 y=950 w=800 h=45 type=round_rectangle fill=#81C784 color=#1B5E20 font=open_sans size=12 "T5 — Feature complete at quality"
tt6 SHAPE parent=legend x=400 y=1010 w=800 h=45 type=round_rectangle fill=#CE93D8 color=#4A148C font=open_sans size=12 "T6 — Player tested (playtest, alpha, beta)"
tt7 SHAPE parent=legend x=400 y=1070 w=800 h=45 type=round_rectangle fill=#FFAB91 color=#BF360C font=open_sans size=12 "T7 — Expand / add to feature/content"
tt8 SHAPE parent=legend x=400 y=1130 w=800 h=45 type=round_rectangle fill=#EF5350 color=#FFFFFF font=open_sans size=12 "T8 — Scale to production optimisation"
```

- [ ] **Step 4: Visual verification**

Verify legend is readable and positioned to the left of the epic grid.

---

### Task 5: Add Section Title

**Depends on:** Task 2 (frames positioned)

Add a large title text above the epic grid: "COUCH HEROES — VERTICAL SLICE SCOPE MAP"

- [ ] **Step 1: Create title text**

```
title1 TEXT x=108000 y=308000 w=3000 font=open_sans size=36 color=#FFFFFF align=center "<p><b>COUCH HEROES — VERTICAL SLICE SCOPE MAP</b></p><p>13 Epics · 61 Features · 1,491 Stories</p>"
```

- [ ] **Step 2: Commit the extraction script**

```bash
git add extract_v15_for_miro.py v15_miro_data.json
git commit -m "feat(ch): build Miro production scope map — all 1,491 stories"
```

---

### Task 6: Final Visual QA

**Depends on:** All previous tasks

- [ ] **Step 1: Zoomed-out verification**

Open the board, zoom out to see all 13 epic frames. Verify:
- All 13 visible
- Titles readable
- Grid layout is clean
- Legend is positioned correctly
- Section title visible

- [ ] **Step 2: Zoomed-in spot check (3 epics)**

Pick Combat, Quest System, and Social & Multiplayer. Zoom into each and verify:
- All features present with correct names
- Story cards present with correct counts
- Card colours match departments
- Descriptions show dept, estimate, tier
- Cards are inside frame bounds
- Spacing is consistent

- [ ] **Step 3: Count validation**

Use `board_list_items` filtered by type=card to count total cards. Should be ~1,491.

- [ ] **Step 4: Report to Glen**

Share the board link and summary of what was built.
