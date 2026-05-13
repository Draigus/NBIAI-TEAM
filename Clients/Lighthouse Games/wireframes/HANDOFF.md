# Lighthouse Analytics Wireframes — Handoff

## Current State

5 standalone HTML wireframes exist and render with working Chart.js charts and CSS funnels. They need a quality pass before sharing with Lighthouse.

## Files

| File | What It Shows | Status |
|---|---|---|
| `01-progression-summary.html` | CSS funnels per progression vector + time-to-reach bar charts, tabbed | Renders, needs quality pass |
| `02-slt-overview.html` | AERM scorecards + trend line charts + slide-out sidebar nav | Renders, needs quality pass |
| `03-ftue-executive.html` | 4 scorecards + CSS funnel + time bar chart | Renders, needs quality pass |
| `04-ftue-dropoff-funnel.html` | 6 scorecards + CSS funnel + drop-off bars + time bars + minor step drilldown | Renders, needs quality pass |
| `05-ftue-quest-timing.html` | Sortable table + cumulative dual-line chart + histogram | Renders, needs quality pass |
| `test-chart.html` | 3 working Chart.js patterns — use as reference | Working reference |

## Chart.js v4 Rules (CRITICAL — learned the hard way)

- CDN MUST be: `https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.js`
- The bare `chart.js@4` URL resolves to a non-UMD build that breaks bar rendering (bars get `base: null`, invisible)
- NEVER set `Chart.defaults.*` globally — corrupts bar element geometry
- Style axes, tooltips, grids INLINE per chart in the options object
- Container pattern: `<div style="position:relative; width:100%; height:Xpx;"><canvas></canvas></div>`
- Options: `responsive: true, maintainAspectRatio: false`
- `test-chart.html` has 3 confirmed-working chart patterns

## Quality Pass Required

Glen's feedback: graph types too repetitive (everything is a bar chart), colour palette too heavy/dark, not responsive, layouts need more visual quality.

### Graph Type Changes Per Dashboard

| Dashboard | Current | Change To |
|---|---|---|
| 01 Progression: time-to-reach | Bar chart | Smooth line/area chart (time is continuous) |
| 02 SLT: DAU/WAU/MAU | Line chart | Stacked area chart |
| 02 SLT: Retention | Line chart | Smooth area with gradient fill |
| 03 FTUE: time-to-step | Bar chart | Lollipop chart (dot on stick) |
| 04 Drop-off: drop-off rate | Bar chart | Lollipop chart, red dots for >5% |
| 05 Timing: distribution | Histogram bars | Box plot or violin plot |

CSS funnels, the cumulative dual-line chart, revenue bar+line combo, sortable table, and sidebar nav are all correct — keep them.

### Colour Palette Lightening

- Surface base: #0F032B is too oppressive — try ~#0D0520
- Cards: #1A0E30 → ~#1C1235
- Chart fills: brand colours at 70-80% saturation, full saturation for accents only
- Grid lines: lighten to rgba(100,80,140,0.15)
- Body text: keep #F0F0F5, lighten secondary to ~#B0B5CC

### Responsive Breakpoints (must add)

- **Widescreen (>1400px):** 4-col scorecards, 2-col chart pairs
- **Normal (768-1400px):** 2-col scorecards, charts may go full-width
- **Mobile (<768px):** Single column, collapsed filter bar, horizontal scroll on tables

### Before Building

Check /games and /gi skills for analytics dashboard domain context — graph type conventions in F2P analytics, AERM framework colour coding, what game designers expect to see.

## Design System

`Clients/Lighthouse Games/DESIGN.md` has the full palette, typography, spacing, and component specs. Updated this session with real PPT-extracted brand colours.

## Miro Board Specs

Full 34-dashboard extraction at: `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI-TEAM\aefc9812-d48a-433a-b30b-b9fed0fc6882\tool-results\toolu_01JHk7cxhPmQf5ueDT1t2tF9.json`

Glen's original spec text for the 5 dashboards was given directly in session 12 chat. The spec at `docs/superpowers/specs/2026-05-07-lighthouse-wireframes-design.md` captures the approved layout.

## Annotation System

All 5 files have a floating "Annotations" button (bottom-right). Click toggles numbered callout badges on each section. Click a badge to open a slide-out panel explaining what the section shows, its AERM pillar, and target audience. This is working and should be preserved.

## Sharing

`Lighthouse-Analytics-Wireframes.zip` (37KB) in the parent folder is ready to attach to Teams/email. Recipient unzips, opens any HTML in a browser. Charts need internet (CDN). Nav links work if all files are in the same folder.
