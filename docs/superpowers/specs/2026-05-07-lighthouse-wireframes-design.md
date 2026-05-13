# Lighthouse Games Analytics Wireframes -- Design Spec

## Overview

5 standalone HTML wireframes for Lighthouse Games' analytics platform for their car RPG "Wonderland". Each file is self-contained (HTML + inline CSS + Chart.js from CDN), shareable by email or file drop, and follows the brand palette in `Clients/Lighthouse Games/DESIGN.md`.

**Approach:** Interactive wireframes with Chart.js rendering real charts using realistic mock data. Annotation overlay system for presentation walkthroughs. Non-functional filter bars showing intended filtering capability.

## Output

```
Clients/Lighthouse Games/wireframes/
  01-progression-summary.html
  02-slt-overview.html
  03-ftue-executive.html
  04-ftue-dropoff-funnel.html
  05-ftue-quest-timing.html
```

## Shared Elements (all 5 pages)

### Navigation header
- Lighthouse Games logo area + dashboard title
- Links to all 5 pages (relative links so the folder is self-contained)
- Current page highlighted
- AERM pillar badge next to each link:
  - Acquisition = electric blue #3152FF
  - Engagement = magenta #A93DA1
  - Retention = lavender #9A8FED
  - Monetisation = coral #FF5528

### Filter bar
- Renders below the header on every page
- Shows the filters specified in each dashboard's spec (varies per page)
- Dropdowns styled and present but non-functional -- show a default selection
- Communicates filtering capability without backend logic

### Annotation system
- Floating button (bottom-right, fixed position) labelled "Annotations"
- Click toggles annotation mode:
  - **ON:** Each chart/section gets a numbered callout badge. Clicking a badge opens an overlay panel showing: what this section shows, the KPIs it serves, which AERM pillar it maps to, what decisions it informs for the target audience. Panel has a close button.
  - **OFF:** Clean dashboard view, no callouts visible. Default state.

### Audience badge
- Top-right of each page: "GAME DESIGNERS", "SENIOR LEADERSHIP TEAM", etc.
- Overline typography (11px/600, uppercase, 0.08em tracking)

### AERM section tags
- Small pill badge in top-right of each card/section showing its AERM pillar(s)
- Same colour scheme as nav badges

### Design system
- All colours, typography, spacing, surfaces from `Clients/Lighthouse Games/DESIGN.md`
- Dark theme: #0F032B base, #1A0E30 cards, #251842 elevated
- Fonts: Inter (Google Fonts CDN), JetBrains Mono for numeric values
- Charts: Chart.js from CDN
- All mock data uses realistic but fictional numbers

### Footer
- "Lighthouse Games Analytics -- Wonderland -- Wireframe v1 -- NBI Analytics"

---

## Dashboard 1: Progression Summary Dash

**File:** `01-progression-summary.html`
**Audience:** Game Designers
**AERM:** Engagement

### Filters
- Install / cohort date (for longitudinal funnels, anchoring users at journey start)
- Platform
- Country

### Layout

**Progression vector selector:** Tab row or toggle to switch between vectors:
- Player Level
- Driver Level
- Car Collection (Nth car collected/unlocked/purchased)
- Race Completion (Nth race/event completed)
- Experience Entry (Nth experience entered)
- Golden Path progression
- Campaign Thread progression

**Per vector, two charts stacked vertically:**

1. **Funnel chart:** Full-width. Cumulative churn from level 1 to X. Each bar labelled with level/milestone, player count, and % retained. Chart.js horizontal bar chart with the sequential magenta-purple ramp from DESIGN.md funnel colours.

2. **Time-to-reach bar chart:** Full-width. Average (median) time to reach each level in the funnel. Same X-axis as the funnel. Labels show hours (e.g. "2.4h"). Chart.js vertical bar chart.

**Custom engagement funnels section:** Below the main vector view, same funnel + time layout for:
- Collecting / Unlocking / Purchasing the Nth car
- Completing the Nth race / event
- Entering the Nth Experience

One page, vertically scrollable. Each vector gets its own funnel + time chart pair. Clean and spacious -- no cramming.

### Annotations (when toggled on)
1. Funnel chart: "Shows cumulative player drop-off through [vector] progression. Each bar = % of cohort that reached this level. Used by designers to identify where progression pacing causes churn."
2. Time chart: "Median time to reach each progression milestone. Helps designers compare actual pacing against intended design. E.g. if milestone 3 takes 2.4h but was designed for 1.5h, pacing needs tuning."
3. Custom funnels: "Engagement-depth funnels for non-linear progression. How many players collect N cars, complete N races, or enter N experiences. Measures breadth of engagement."

---

## Dashboard 2: SLT Overview

**File:** `02-slt-overview.html`
**Audience:** Senior Leadership Team
**AERM:** All four pillars

### Filters
- Date range
- Platform
- Country
- Build version

### Layout

**Top section -- at-a-glance KPIs:**
- Row of large scorecards with trend arrows: New Unique Users, DAU, WAU, MAU, D1 Retention, D7 Retention, ARPDAU, Daily Revenue
- Big numbers, clear trend direction. Nothing else competing.

**Bottom section -- trends over time:**
- Line charts tracking the headline KPIs over selected time period
- Maximum 2 charts per row, spacious
- Users over time (DAU/WAU/MAU lines), Retention over time (D1/D7 lines), Revenue over time

**Dashboard directory:**
- Table listing all available dashboards in the analytics suite
- Columns: Dashboard Name, Description, Target Audience, AERM Pillar, Link
- This becomes the navigation hub for the full 34-dashboard suite
- Links point to the 4 other wireframes for the ones that exist; remaining 29 show as "Coming Soon"

### Annotations (when toggled on)
1. KPI scorecards: "Top-line health metrics across all four AERM pillars. Designed for a 5-second scan -- are things trending up, down, or flat?"
2. Trend charts: "Same KPIs tracked over time. Allows SLT to spot inflection points, seasonal patterns, and build-over-build changes."
3. Dashboard directory: "Navigation hub for the full analytics suite. 34 dashboards across FTUE, retention, engagement, economy, revenue, customisation, UX, and tech health."

---

## Dashboard 3: FTUE Page 1 -- Executive Health Summary

**File:** `03-ftue-executive.html`
**Audience:** Studio Leadership
**AERM:** Acquisition

### Filters
**Primary:** Activity date range, build version, platform, country/country tier
**Secondary:** Device performance tier (could become a separate dashboard page)

### Layout

Three elements. That's the whole page.

1. **Scorecard row:** Number of Installs, FTUE Completion Rate, Average Time to Wonderland Home, Average Time to California. Large mono-font values, trend indicators.

2. **Bar chart 1 -- Step Conversion Rate:** Full-width Chart.js bar chart. X-axis steps: Download > First Boot > Account Creation > Initial Drive > Wonderland Home Arrival > California Arrival > Semi-Pro License > Alpha Wall. Y-axis: % of players reaching each step (and absolute count). Bars use the funnel colour ramp.

3. **Bar chart 2 -- Average Time to Step:** Full-width Chart.js bar chart. Same X-axis steps. Y-axis: median minutes to reach each step. Single colour (brand magenta).

### Annotations (when toggled on)
1. Scorecards: "Headline FTUE health for studio leadership. Number of installs = top of funnel. FTUE Completion Rate = % reaching California (configurable definition). Time metrics show how long the opening takes."
2. Conversion funnel: "Step-by-step conversion from download to Alpha Wall. Each bar shows what % of installs reached that milestone. Major drop-offs indicate friction points in the opening sequence."
3. Time chart: "Median time to reach each FTUE milestone. If Wonderland Home takes 45 minutes but was designed for 30, the tutorial may be too long. Compare across builds to measure improvement."

---

## Dashboard 4: FTUE Page 2 -- Step-by-Step Drop-off & Player Pacing Funnel

**File:** `04-ftue-dropoff-funnel.html`
**Audience:** Game Designers
**AERM:** Acquisition

### Filters
Activity date range, build version, platform, country/tier, player type (free/paid), device performance tier, language, session number

### Layout

1. **Scorecard row:** Number of Installs, Step Conversion Rate, Step Drop-Off Rate, Avg (Median) Time per Step, Friction Rate (% players >2 SD from median), Crash Rate during FTUE

2. **Major Step dashboard:**
   - Bar charts showing the extended FTUE step funnel. More granular than Page 1 -- each Wonderland Home quest is a separate step (Install > First Boot > Account Creation > ... > Quest #1 > Quest #2 > ... > Quest #10 > California > ... > Alpha Wall)
   - Three chart rows for this funnel:
     - Step Conversion Rate (% reaching each step)
     - Step Drop-Off Rate (relative % dropping between consecutive steps)
     - Average (Median) Time per step

3. **Minor Step drilldown:**
   - Selector to choose a major step
   - Selecting e.g. "Quest #1 in Wonderland Home" opens a second funnel with sub-steps within that quest (e.g. "Walked to Home Garage", "Spoke to NPC", etc.)
   - Same three metrics for sub-steps: conversion, drop-off, time
   - Sub-step granularity depends on heartbeat/telemetry resolution (noted in spec)

Two levels of detail on one page. Major steps always visible, minor steps expand below on selection.

### Annotations (when toggled on)
1. Scorecards: "Diagnostic KPIs for FTUE friction. Friction Rate = % of players taking >2 standard deviations longer than median for a step -- flags confusion or difficulty. Crash Rate during FTUE = technical friction."
2. Major step funnel: "Extended step-by-step funnel with each Wonderland Home quest as its own step. Compared to Page 1, this gives designers the granularity to pinpoint exactly where frustration occurs."
3. Drop-off chart: "Relative drop-off between consecutive steps. A spike here means players are specifically quitting at this transition. Critical for identifying 'quit moments'."
4. Minor step drilldown: "Sub-step analysis within a selected major step. E.g. within Quest #1, which specific objective is causing players to stall? Dependent on heartbeat granularity from engineering."

---

## Dashboard 5: FTUE Page 3 -- Quest Timing vs Design Estimates

**File:** `05-ftue-quest-timing.html`
**Audience:** Game Designers
**AERM:** Acquisition / Engagement

### Filters
Activity date range, build version, platform, country/tier, player type, device performance tier, session number, quest/mission ID, quest phase (Wonderland Home / California Golden Path / Campaign Thread)

### Layout

Three views. Each tells a different part of the pacing story.

1. **Quest timing table:** Full-width. One row per quest/mission in chronological order (Quest #1 Welcome Home through final Golden Path/campaign mission). Columns:
   - Quest Name
   - Designed Duration (mins)
   - Actual Median Duration (mins)
   - Delta % ((Actual Median - Designed) / Designed x 100)
   - P25 (mins)
   - P75 (mins)
   - P90 (mins)
   - N (number of players completing)
   
   Delta % colour-coded: green when under designed time, red when over. Sortable columns.

2. **Dual-line chart:** Full-width Chart.js line chart. X-axis = quest step (chronological order). Line 1 = Cumulative Designed Time. Line 2 = Cumulative Actual Median Time. The gap between lines shows where the build is running ahead of or behind design intent. Area between lines shaded to make the divergence visible.

3. **Histogram / box plot:** Selectable per quest (dropdown or click a row in the table). Shows the distribution of actual durations for that quest. Designed duration overlaid as a vertical reference line. Visualises the spread -- are players clustered around the median or is there a long tail of players taking much longer?

### Annotations (when toggled on)
1. Table: "Master reference for quest pacing. Delta % is the key column -- positive means players take longer than designed, negative means shorter. P90 shows the worst-case experience. N shows sample size."
2. Dual-line chart: "Cumulative pacing comparison. Where the actual line diverges above the designed line, the build is running behind schedule. Where it's below, players are progressing faster than intended. The gap grows where pacing issues compound."
3. Histogram: "Duration distribution for a single quest. A tight cluster around the median means consistent player experience. A long right tail means some players are getting stuck. The designed duration reference line shows the intent."

---

## Mock Data Strategy

All charts render with realistic but fictional data:

- **Installs/players:** Scale appropriate for an alpha/early access car RPG (thousands, not millions)
- **Retention:** Realistic D1 ~30-40%, D7 ~12-18% for alpha
- **FTUE funnel:** Progressive drop-off with realistic step conversion (80-90% for early steps, steeper drops at content transitions)
- **Quest timing:** 10-15 quests in Wonderland Home sequence, designed durations from 3-15 minutes each, actuals varying +/- 30%
- **Revenue:** Scale appropriate for alpha with limited monetisation

Mock data should tell a story -- include 1-2 obvious pain points (a quest that takes 3x longer than designed, a step with anomalous drop-off) so the wireframes demonstrate the dashboard's diagnostic value.

---

## Technical Notes

- Each HTML file is fully self-contained. External dependencies (Google Fonts, Chart.js) loaded from CDN
- No build step, no framework, no server required
- Files link to each other via relative paths within the wireframes/ folder
- Annotation system uses vanilla JS -- toggle button shows/hides callout badges, clicking a badge opens the info panel
- Designed duration reference data for Quest Timing dashboard needs a static JS object mapping quest IDs to designed minutes (extracted from Miro/playtest spec)
- Sub-step data availability in FTUE Page 2 depends on heartbeat granularity (noted as TBD with engineering in the Miro spec)
