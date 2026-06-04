# Miro Board Rebuild — Handoff

**Date:** 2026-05-17
**Status:** First attempt deleted. Ready for rebuild.
**Board:** https://miro.com/app/board/uXjVGRIXN-0=/
**Spec:** `MIRO_BOARD_SPEC.md` (approved)
**Wireframe:** `miro_wireframe.html` (approved)
**Data:** `v15_miro_data.json` (extracted, 13 epics, 142 features, 1,447 stories)

---

## What Happened

Built all 13 epic frames + 1,389 cards + legend + title via Miro API. Problems:

1. **Placed on top of existing content** — positioned at (100000, 310000) which overlapped other board items. Glen moved the frames manually.
2. **Miro auto-scaled everything** — when frames were moved/resized, Miro proportionally scaled all children. Cards became 994x364px (was 300x110), text blew up to size 53 (was 16).
3. **Layout was too cramped** — 10 cards per row in 3600px frames, only 20px gaps.
4. **Feature headers were plain TEXT** — looked like weird floating text boxes instead of the styled containers from the wireframe.
5. **No visual verification** — built everything blind from coordinate math, never checked with browser/Chrome extension.

Glen deleted everything from the board.

## What Must Change in the Rebuild

### Layout fixes
- **6 cards per row max** (not 10) — gives breathing room
- **Wider frames** — 6000px wide to accommodate 6 cards at 800px each with gaps
- **Feature headers as SHAPE containers** — `type=round_rectangle` with `fill=#1a1a38` background and border, containing the feature name and story count. These should look like the feature containers in the wireframe.
- **More vertical spacing** — 200px between card rows (not 130px), 100px between features
- **Card size ~600x150** — readable at normal zoom

### Positioning
- **Find empty space first** — use `context_explore` to map all existing items, then pick coordinates that are well clear (y=600000+ should be safe)
- Or ask Glen where he wants it placed

### Visual verification (MANDATORY)
- After placing the FIRST epic (Player Build), open the board in the Chrome extension and screenshot
- Check: cards not overlapping, feature headers visible, colours correct, readable at normal zoom
- Get Glen's approval before building the remaining 12 epics
- Verify at least 3 epics total before claiming done

### DSL reference
- `layout_create` DSL spec already retrieved (see conversation)
- FRAME, SHAPE, CARD, TEXT types available
- 50,000 char limit per `layout_create` call
- Cards inside frames use coordinates relative to frame top-left
- CARD items: `theme=` sets border colour, `desc=` sets description text

## Files Available

| File | Purpose |
|---|---|
| `v15_miro_data.json` | Extracted data — all 13 epics with features and stories, ready to use |
| `extract_v15_for_miro.py` | Script that built the JSON from v15 Excel |
| `MIRO_BOARD_SPEC.md` | Approved design spec |
| `miro_wireframe.html` | Approved visual wireframe |
| `_miro_dsl_epic*.txt` | OLD DSL files from first attempt — DELETE or regenerate |

## Frame IDs (DELETED — need new ones)

The old frame IDs (3458764672086457997-3458764672086458009) were deleted by Glen. New frames will get new IDs.

## Miro API Tools

- `mcp__claude_ai_Miro__layout_create` — create items in bulk via DSL
- `mcp__claude_ai_Miro__layout_read` — read current board state as DSL
- `mcp__claude_ai_Miro__layout_update` — edit/delete items via find-replace
- `mcp__claude_ai_Miro__context_explore` — list all frames/docs/tables on board
- `mcp__claude_ai_Miro__context_get` — get AI summary of a frame's contents
- `mcp__claude_ai_Miro__layout_get_dsl` — get DSL format spec (call once per session)

## Card Content (per story)

```
cardN CARD parent=FRAME_URL x=X y=Y w=600 h=150 theme=#DEPT_COLOUR desc="Dept | Team | Est: X-Yd | T0 Ideation" "Story Name"
```

## Feature Container (per feature)

```
featN SHAPE parent=FRAME_URL x=X y=Y w=FRAME_W-200 h=CALCULATED type=round_rectangle fill=#1a1a38 border_color=#333333 color=#FFFFFF font=open_sans size=18 align=left valign=top "Feature Name — N stories"
```

## Department Colours

| Department | Hex |
|---|---|
| Design | #4A90D9 |
| Art | #9B59B6 |
| Engineering | #27AE60 |
| Audio | #F39C12 |
| QA | #E74C3C |

## Tiers (T0-T8)

All start at T0. Full tier definitions in MIRO_BOARD_SPEC.md.

## Current State

- Game Bibles proof frame exists at (100000, 600000) — Glen reviewing layout
- All other epics deleted from board
- Position confirmed safe: x=100000, y=600000+ is empty space

## HARD RULE: Follow the Wireframe

The HTML wireframe at `miro_wireframe.html` was approved. **Replicate it exactly.** Do not redesign, reinterpret, or "improve" the layout. The wireframe shows:
- Dark card backgrounds (#1e1e3a) with subtle borders (#333)
- Story name in white, 14pt bold
- Department tag as a small coloured chip (not possible in Miro CARD — use theme= for border colour, description for text)
- Estimate text
- Tier badge (text in description)
- Feature containers with dark background (#141428), rounded corners, feature name 20pt bold

Map this to Miro DSL:
- Feature container = SHAPE (round_rectangle, fill=#141428, border=#333)
- Story card = CARD (theme=dept colour, desc="Dept | Team | Est | Tier", title=story name)
- 6 cards per row, 500w x 140h, 560px horizontal spacing, 180px vertical spacing
- Feature containers sized to wrap their cards

## Approach for Next Session

1. Check if Glen approved Game Bibles layout proof
2. If yes: regenerate all DSL files with the approved layout pattern
3. If no: fix what Glen flagged, re-proof
4. Build all 13 epics at y=600000+ in a 3-column grid (epics are tall, 3 cols better than 4)
5. VISUALLY VERIFY each epic after creation using Chrome extension
6. Add legend and title last
7. Final visual QA with Glen
