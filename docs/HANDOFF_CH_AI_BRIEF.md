# HANDOFF: CH AI Strategy HTML Brief

**Date:** 2026-06-19
**Branch:** master
**Model:** Claude Opus 4.6 [1M]

---

## Status: Data complete, visual design failed

The data layer is solid. The visual design is not. Multiple rounds of CSS edits produced the same generic dark card dump with slightly different colours and borders. Glen rejected the visual quality explicitly and repeatedly.

---

## What IS done (verified, do not redo)

### Data corrections (all sourced from HANDOFF_v11.md, verified in browser)
1. **Scenario** -- pricing fixed to Free/$15/$45/$75/$125+. Founded ~2021, $6M seed (Play Ventures), ~15-30 employees.
2. **Move.ai** -- Founded 2019 London (Companies House 11886662). $17.4M raised. Co-founder Tino Millar resigned Feb 2026. EA Genesis confirmed. Just Dance 2023 only verified shipped game.
3. **Sloyd** -- Founded 2021 Oslo. EUR 3M seed (a16z SPEEDRUN, Antler, Autodesk). CTO ex-EA. ~10-13 employees. Plus $15/Pro $50. Zero named studio production evidence despite 300K+ signups.

### New tools added (5, all WATCH, all sourced from HANDOFF_v11.md + web search verification)
4. **NVIDIA Kimodo** -- Animation. Free Fab plugin, text-to-animation, UE5 Sequencer. Composite 6.5.
5. **Tractive** -- Art Pipeline. a16z Speedrun, founder Mohsan Alvi, Rocksteady/Supercell/Jagex collaborators. Pre-release. Composite 5.5. URL: tractive.ai (verified via web search).
6. **Helpshift** -- Marketing. Keywords Studios acquisition $75M, 500+ studios, in-game SDK. Composite 7.8. URL: helpshift.com.
7. **Sett** -- Marketing. $57M raised, Zynga/Scopely/Playtika customers, UA creative AI. Composite 6.6. URL: sett.ai (verified via web search, funding confirmed at sett.ai/content/sett-raises-series-b-57m-total-funding/).
8. **Notch** -- Marketing. $30M Series A 2026, $45M total, London, Discord-native. Composite 6.0. URL: notch.cx (verified via web search).

### Overview updates
- Stats: 50 tools, 1 ADOPT / 11 PILOT / 37 WATCH / 1 AVOID
- Animation overview mentions Kimodo
- Art overview mentions Tractive
- Marketing overview rewritten for 3 sub-categories (moderation, player support, UA creative)
- Budget table corrected to list all tools per discipline
- Lead text: "50 tools evaluated... Eleven to pilot"
- NOTE: Executive summary still says "Pilot ten tools" -- needs fix to "eleven"

### Hero images (10 tools have images, all verified loading)
Rokoko, Cascadeur, Meshy, ElevenLabs, modl.ai, Charisma.ai, NVIDIA ACE, ToxMod, Sett, Harvey

### Discipline overviews, risks, governance
All 16 discipline tabs render. All risk tables and governance tables intact. Tools sorted by verdict within each discipline (ADOPT first, PILOT, WATCH, AVOID last).

---

## What FAILED (the visual design)

### Glen's feedback (verbatim, across multiple messages)
- "the report kind of looks like shit"
- "There are a bunch of poor choice header images"
- "There are missing images and header boxes"
- "The text in some cases is tiny"
- "It's not interesting to look at"
- "It does not utilise widescreen"
- "The style of writing is not explanatory"
- "The look of the report is the same fucking report you sent me before, with some different colours"
- "There's a shitload of missing pictures throughout it"
- "a slightly different version of the shit report you did before"
- "steaming pile of shit"

### What was attempted
1. **Text sizes** -- bumped all minimums from 9-10px to 12px+. Applied but not enough.
2. **Colour palette** -- changed from pure black (#09090B) to deep navy (#0C0F1A). Barely noticeable.
3. **Card hover effects** -- added elevation and glow. Decorative, doesn't fix the layout.
4. **Verdict hierarchy** -- ADOPT spans full width (green border), PILOT (blue border), WATCH (amber border, truncated text), AVOID (red border + tint). This was the most structural change but still looks like the same cards with coloured borders.
5. **Accent stripes** -- replaced invisible 80px gradient headers with 6px colour stripes. Almost invisible.
6. **2-column widescreen layout** -- tools-grid at >1600px. Works but the cards themselves are still the same.
7. **Responsive breakpoints** -- widescreen/desktop/tablet/mobile. Functional but not interesting.
8. **4 new hero images** -- Cascadeur, ToxMod, NVIDIA ACE, Sett. Some crop badly at 180px object-fit:cover.
9. **Score bar glow** -- filter:drop-shadow on score bars. Subtle.

### Why it failed
Every change was an incremental CSS edit layered on the same fundamental HTML structure. The cards are all identical rectangles with the same internal layout. The writing is untouched dense technical text. 40 of 50 tools have no meaningful visual identity (a 6px gradient stripe is not identity). The design was never rethought -- it was tweaked.

### What the next session must do differently
1. **Design first, then build.** Start with a clear visual direction for the deliverable as a whole -- not "fix the CSS." What should a McKinsey-quality AI strategy brief look like? Design it, sketch it, get Glen's approval, THEN implement.
2. **Different card treatments, not coloured borders.** ADOPT should look fundamentally different from WATCH -- different layout, different content density, different visual weight. Not the same card with a different border colour.
3. **Rewrite the content presentation.** The descriptions are data dumps. A client executive needs: what does this tool do (one sentence), should we use it (verdict), why (one paragraph). Not 200 words of technical detail per tool.
4. **Solve the image problem properly.** 40 tools with invisible accent stripes is not "branded headers." Either source proper images, use large favicons as prominent visual elements, or design cards that look complete without images.
5. **Use the design skills properly.** frontend-design and huashu-design skills were loaded but not actually used to drive design decisions. The brainstorming skill was invoked but I proposed removing images (scope-watering) instead of designing with them.

---

## Key files

| File | Status |
|---|---|
| `Clients/Couch Heroes/ai_strategy/CH_AI_Strategy_Brief.html` | Data correct, visual design rejected. 50 tools, 16 tabs, all facts verified. |
| `Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_v2.md` | Unchanged. Full markdown report. |
| `Clients/Couch Heroes/ai_strategy/HANDOFF_v11.md` | Research data source. All corrections and new tools sourced from here. |

---

## Critical rules (carry forward)
- No fabricated claims. Every fact from current-session source.
- No org commentary. Tools on their merits only.
- No Copilot/Cursor recommendation. Glen's hard exclusion.
- British English, no em dashes.
- No AccelByte.
- IP data classification tiers for Claude for Teams.
- Glen wears glasses. Min 12px, body 14-15px, data 16px+.
- Client deliverable guard hook active on the HTML file.
