# Command Centre v2 — Zone-Based Mission Control

**Date:** 2026-05-12
**Status:** Approved for build
**Target:** Ultrawide primary (3440x1440), degrades to standard widescreen

## Vision

The CC is the visual control surface for NBI's AI operating system. Not a data display — a cockpit where Glen surveys the living OS state and acts. Inspired by Jack Roberts' Claude OS (file-based OS with self-improving skills, heartbeat monitoring, shared business context, skill chaining).

## Layout — Three Fixed Zones, Zero Scroll

```
┌──────────────────────────────────────────────────────────────┐
│  STATUS STRIP (48px) — logo mark, greeting, heartbeat ECG,  │
│  last-scan timestamp, refresh, live process indicator        │
├──────────────────────────────────────────────────────────────┤
│  4Cs METRICS ROW (120px) — four instrument panels, full     │
│  width, score + trend + micro-sparkline each                │
├────────────────────────────────────────────┬─────────────────┤
│                                            │  ACTION RAIL    │
│           MAIN CONTENT                     │  (360px)        │
│                                            │                 │
│  Tabs: Dashboard / Briefing / System Map   │  Command input  │
│                                            │  (> prompt)     │
│  Adaptive grid fills remaining space       │                 │
│  4-5 columns at ultrawide                  │  Critical alerts│
│  Cards fill height, no dead zones          │  (max 5 visible)│
│                                            │                 │
│                                            │  Action buttons │
│                                            │                 │
│                                            │  Reasoning      │
│                                            │  stream         │
│                                            │  (auto-scroll)  │
├────────────────────────────────────────────┴─────────────────┘
```

**Viewport math at 3440x1440:**
- SPA sidebar: ~220px → CC area: ~3220px wide
- SPA header: ~52px → CC area: ~1388px tall
- Status strip: 48px, 4Cs row: 120px → Main area: ~1220px tall
- Action rail: 360px → Main grid: ~2860px wide
- At 4 columns: ~700px per card, at 5 columns: ~560px

## Status Strip (48px)

- NBI logo mark (not full logo), left-aligned
- Greeting: "Good morning, Glen" with gradient text on name
- **Heartbeat ECG trace**: 200px wide horizontal line, sharp R-wave pulse animation. Electric blue at peak, fading to 30% between beats. Rate increases when system is processing, flatlines red on failure. This is the signature visual element — budget the most craft time here.
- Last-scan timestamp
- Refresh Scan button
- **Live process indicator**: "Idle" when nothing running, "Scanning brain coherence... 3/7" when active

## 4Cs Metrics Row (120px)

Four instrument panels spanning full width (25% each):
- Score as large monospace number
- Label below (Context, Connections, Capabilities, Cadence)
- Animated SVG ring (draw on load, once per session)
- Sub-detail text (e.g. "Brain + Memory + Identity")
- Colour-coded: green (≥7), amber (4-6), red (<4)

## Action Rail (360px, right edge)

Persistent across all tabs. Two modes:

**Default mode (no card selected):**
1. **Command input** (top) — monospace `>` prompt, supports: "triage bugs", "run scan", "check brain", "show stale", "launch [skill]". Tab auto-complete.
2. **Critical alerts** (middle) — sorted by urgency, max 5 visible, each with inline actions (resolve/dismiss/snooze)
3. **System reasoning stream** (bottom) — auto-scrolling chronological log: "09:14 — Detected 3 stale memory files. Flagged for review." The OS's inner monologue.

**Card-selected mode:**
- Click any card in main grid → rail transitions (200ms ease-out) to show context-specific actions for that domain
- Selected card gets 1px electric blue left border + 2px lift
- All other cards dim to 60% opacity
- Escape or click selected card again to deselect

## Main Content — Dashboard Tab

Adaptive grid, 4-5 columns at ultrawide, cards fill available height. Cards:

1. **Today's Focus** — priority items with coloured icon boxes (crit/client/feat/blocked), compact `pri` layout
2. **Skills Intelligence** — si sections: most active, going stale, learning loops status, coverage gaps
3. **Brain & Memory** — timeline with glowing dots showing freshness per module, stale items in amber
4. **Connection Map** — 4×2 grid of connection cells (ok/partial/gap), blind spot suggestions below
5. **Bug Intelligence** — priority bar + narrative items (hotspot analysis, please_review count)
6. **Agent Team** — 11-col heatmap grid with tooltip on hover, legend below, dormant count
7. **Sessions** — stats row (this week / avg / pending) + sparkline chart + day labels
8. **Test Health** — big number + full-width bar + passed/failed/skipped breakdown
9. **Level-Up** — placeholder for Phase 2 dreaming engine

## Main Content — Briefing Tab

Sectioned layout with visual variety:

1. **Critical — Needs Attention Now** — 2-col grid, each item in its own card with pulsing icon + visible action button
2. **Today's Calendar** — timeline with glowing dots (now/future), time + duration on right, Join buttons
3. **Work Queue** — filter chips + 3-col grid (Overdue/Due This Week/Blocked), Nudge buttons on blocked items
4. **Bug Status** — 3-col: expandable By Priority card, Awaiting Review with Close buttons, Hotspot with tag badges
5. **Claude Session State** — 2-col: Last Session with shimmer progress bar, Outstanding Work with numbered list
6. **Client Deliveries** — 3-col grid per client
7. **Knowledge Flags** — 2-col: Stale Brain Modules with Refresh buttons, Memory & Roles with Review buttons

## Main Content — System Map Tab (new, v2)

Full-width Connection Map visualisation. Force-directed graph showing skills, brain modules, agents, and active projects as nodes. Edges show invocation relationships. Clickable nodes filter Dashboard and Briefing to related items. This is the "wow" visual.

**Phase 1 scope:** Static connection grid (same as current). Phase 2: interactive graph.

## Visual Language

- **Background**: Static near-black (#0b0d11) with faint dot grid (#1a1d23, 24px spacing, 4% opacity). NO animated gradient mesh.
- **Cards**: Glassmorphic with accent bar on top edge. Hover: border brightens to ~12% white, subtle box-shadow shift. NO neon glow auras.
- **Colours**: --cc-green (#34d399), --cc-amber (#fbbf24), --cc-red (#f87171), --cc-blue (#3b82f6), --cc-cyan (#22d3ee), --cc-purple (#a78bfa), --cc-pink (#f472b6)
- **Fonts**: Inter for body, JetBrains Mono for numbers/code/command input
- **Signature element**: Heartbeat ECG trace at 120% craft investment

## Animation Rules

- Entrance animations: fire ONCE per session (staggered 50ms between cards, 200ms duration, translateY(8px) + opacity)
- Tab switch: crossfade at 120ms, NO card-level stagger
- Data refresh: numbers counter-animate to new values (200ms)
- Ring draws: once per session on 4Cs load
- Critical items: subtle border pulse (not icon bounce)
- Heartbeat: continuous ECG trace

## Keyboard Shortcuts

- `1/2/3`: Switch tabs (Dashboard/Briefing/System Map)
- `Escape`: Deselect card, clear command input
- `/` or `Ctrl+K`: Focus command input
- `R`: Refresh scan

## Responsive Degradation

- <2560px: 4 columns, action rail stays
- <1600px: 3 columns, action rail collapses to toggle button
- <1200px: 2 columns, 4Cs stack to 2×2
- <900px: 1 column, 4Cs stack vertically

## Files Changed

- `nbi_project_dashboard.html` — CSS (~line 2625) and render functions (~line 19500)
- Backend routes unchanged (solid)
- No new files needed

## Out of Scope (Phase 2+)

- Interactive force-directed System Map graph
- Drag-and-drop reorder in work queue
- Ambient audio
- Skill chain visualisation
- Dreaming Engine (Level-Up card)
