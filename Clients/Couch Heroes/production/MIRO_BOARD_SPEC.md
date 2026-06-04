# Couch Heroes Miro Board — Design Spec

**Date:** 2026-05-17
**Status:** Approved by Glen
**Wireframe:** `miro_wireframe.html` (approved visual treatment)
**Data source:** `CouchHeroes_Man_Day_Work_Plan_v15.xlsx`

---

## Purpose

Strategic scope map for the entire Couch Heroes MMO. The whole studio (50 people) can see every system, feature, and story in the game laid out visually. Used for planning conversations, dependency mapping, and dialogue — NOT for day-to-day execution tracking. Once stable, the structured data will be extracted to Excel and uploaded to JIRA via JQL/CSV import.

## Board Structure

### System Map (entire board)

One Miro frame per epic. All 13 epics laid out across the board. Inside each frame:

- **Epic** = Large frame with title (36pt, bold, uppercase, white text, neutral grey border)
- **Feature** = Container/group within the frame (20pt bold title, light background tint, shows story count and total estimate range)
- **Story** = Individual card (all 1,491 from v15, every single one)

### No Roadmap Strip

All v15 work is Early Prod/Vertical Slice. A phase timeline adds no value when everything is in the same phase. Can be added later when the game moves through phases.

## Story Card Design

Every card shows four pieces of information:

```
+-------------------------------+
|  Story Name                   |  <- 14pt bold
|  [Dept | Team]  [Est range]   |  <- coloured chip + estimate
|  [T0 Ideation]                |  <- tier badge
+-------------------------------+
```

### Card Fields

1. **Name** — the story name from v15 (14pt, bold, white)
2. **Department | Team** — colour-coded chip (e.g., "Art | VFX", "Eng | Gameplay")
3. **Estimation range** — min–max days from v15 data (e.g., "12–20 days")
4. **Tier of Completion** — T0 through T8, colour-coded badge

## Colour System — Departments (ONLY colour system on the board)

| Department | Colour | Hex | Usage |
|---|---|---|---|
| Design | Blue | #4A90D9 | rgba(74,144,217,0.2) chip bg |
| Art | Purple | #9B59B6 | rgba(155,89,182,0.2) chip bg |
| Engineering | Green | #27AE60 | rgba(39,174,96,0.2) chip bg |
| Audio | Amber | #F39C12 | rgba(243,156,18,0.2) chip bg |
| QA | Coral | #E74C3C | rgba(231,76,60,0.2) chip bg |

Epic frames are ALL neutral (dark background, grey border). No per-epic colours. Department colours on story cards are the only colour coding.

## Tiers of Completion (T0–T8)

Each story independently progresses through tiers. The tier badge on each card shows current state.

| Tier | Name | Badge Colour |
|---|---|---|
| T0 | Ideation | #FFF9C4 (pale yellow) |
| T1 | R&D | #FFF176 (yellow) |
| T2 | GDD done, TDD done, art brief | #E8F5E9 (pale green) |
| T3 | Prototype — functional, no skins, can be bugged | #BBDEFB (light blue) |
| T4 | MVP — limited quality but full featured | #90CAF9 (blue) |
| T5 | Feature complete at quality | #81C784 (green) |
| T6 | Player tested feedback to quality | #CE93D8 (purple) |
| T7 | Expand / add to feature/content | #FFAB91 (orange) |
| T8 | Scale to production optimisation post load | #EF5350 (red) |

All stories start at T0. The team updates tiers as work progresses.

## Zoomed-Out View (Epic Thumbnails)

When viewing the full board, each epic frame shows:

- Epic name (18pt, bold, white)
- Story count and feature count (12pt, grey)
- Department mix bar (14px tall, proportional segments coloured by department)

## Data Mapping (v15 Excel → Miro)

### From Plan Sheet

| Excel Column | Card Field |
|---|---|
| A (Epic) | Frame grouping |
| B (Feature) | Feature container grouping |
| C (Story) | Card title |
| D (Team) | Department | Team chip |
| Early Prod Min/Max columns | Estimate range |

### Team → Department Mapping

| Source Team | Display | Department |
|---|---|---|
| Game design | Design \| Game Design | Design |
| Level design | Design \| Level Design | Design |
| Narrative | Design \| Narrative | Design |
| UX/UI | Art \| UX/UI | Art |
| Concept Art | Art \| Concept Art | Art |
| Environment Art | Art \| Environment Art | Art |
| Character Art | Art \| Character Art | Art |
| Animation & Rigging | Art \| Animation | Art |
| VFX | Art \| VFX | Art |
| TechArt | Art \| Tech Art | Art |
| Gameplay Engineering | Eng \| Gameplay | Engineering |
| Backend Engineering | Eng \| Backend | Engineering |
| QA | QA | QA |
| Audio | Audio \| Sound | Audio |

## Build Approach

1. Python script reads v15 Excel, extracts all structured data (epics, features, stories, teams, estimates)
2. Script uses Miro API to create a new board
3. For each epic: create a frame, positioned on a grid layout
4. For each feature within epic: create a container group
5. For each story within feature: create a card with all four fields
6. Visual verification via Chrome extension after each epic is placed
7. Iterate spacing/sizing until it matches the wireframe treatment

## Scope

- **All 13 epics** — every one from v15
- **All 61 features** — every one with data
- **All 1,491 stories** — every single story as its own editable card
- **All cards editable** — the team can modify names, move cards, change tiers, add comments
- **All data from v15** — no sampling, no summarising, complete dataset

## What This Board is NOT

- Not a JIRA replacement — execution tracking happens in JIRA later
- Not a sprint board — no status columns, no sprint lanes
- Not a timeline/roadmap — no phase columns (everything is VS/Early Prod)
- Not read-only — the team actively works in this board
