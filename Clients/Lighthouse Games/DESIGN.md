---
version: alpha
name: Lighthouse Analytics
description: Lighthouse Games analytics dashboard design system - magenta/blue/pink palette, dark-first, cinematic automotive theme
colors:
  primary: "#A93DA1"
  primary-hover: "#8E3488"
  primary-light: "#C75ABF"
  primary-faint: "#2A1629"
  primary-deep: "#7030A0"
  secondary: "#3152FF"
  secondary-light: "#5A75FF"
  secondary-deep: "#2240CC"
  accent-pink: "#E4347A"
  accent-coral: "#FF5528"
  lavender: "#9A8FED"
  surface-base: "#0F032B"
  surface-base-alt: "#042433"
  surface-card: "#1A0E30"
  surface-elevated: "#251842"
  surface-hover: "#30204F"
  surface-input: "#1A0E30"
  border-default: "#2D1B4A"
  border-focus: "#A93DA1"
  text-primary: "#F0F0F5"
  text-secondary: "#9CA3BF"
  text-muted: "#6B7194"
  success: "#22C55E"
  warning: "#F59E0B"
  danger: "#EF4444"
  info: "#3152FF"
  chart-1: "#A93DA1"
  chart-2: "#3152FF"
  chart-3: "#E4347A"
  chart-4: "#FF5528"
  chart-5: "#9A8FED"
  chart-6: "#22C55E"
  chart-7: "#06B6D4"
  chart-8: "#F59E0B"
  funnel-1: "#C75ABF"
  funnel-2: "#A93DA1"
  funnel-3: "#8E3488"
  funnel-4: "#7030A0"
  funnel-5: "#5A2680"
  funnel-6: "#3D1A5C"
  funnel-7: "#2A1140"
typography:
  h1:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
  h2:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.3
  h3:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
  overline:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.08em
  mono:
    fontFamily: JetBrains Mono, Fira Code, SF Mono, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  section: 24px
  gutter: 24px
  card-gap: 16px
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: 8px 16px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  card-elevated:
    backgroundColor: "{colors.surface-elevated}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  scorecard:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
  filter-bar:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  table-header:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-secondary}"
    height: 44px
  table-row:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    height: 44px
  table-row-hover:
    backgroundColor: "{colors.surface-hover}"
  badge-success:
    backgroundColor: "#052E16"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "#422006"
    textColor: "{colors.warning}"
    rounded: "{rounded.full}"
  badge-danger:
    backgroundColor: "#450A0A"
    textColor: "{colors.danger}"
    rounded: "{rounded.full}"
  badge-primary:
    backgroundColor: "#2A1629"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
  badge-secondary:
    backgroundColor: "#0D1540"
    textColor: "{colors.secondary}"
    rounded: "{rounded.full}"
  sidebar-item:
    textColor: "{colors.text-secondary}"
    padding: 10px 16px
    rounded: "{rounded.sm}"
  sidebar-item-active:
    backgroundColor: "rgba(169, 61, 161, 0.15)"
    textColor: "{colors.primary-light}"
---

# Lighthouse Games Analytics Design System

## Overview

This design system powers Lighthouse Games' internal analytics dashboards -- data-rich tools used by designers, producers, and studio leadership to monitor player progression, retention, FTUE flows, and live service health for a car RPG/racing game.

The aesthetic is **premium analytics cockpit** -- dark-first, with a vivid magenta-purple/electric-blue/hot-pink palette extracted directly from Lighthouse's actual brand decks. The dashboards channel this through clean, professional layouts while reinforcing the studio's automotive game identity.

**Background imagery:** Dashboard sections and page backgrounds should incorporate faded, low-opacity car imagery -- in-game screenshots, rendered vehicles, or looping video clips of gameplay -- composited behind content at 5-10% opacity with a dark overlay. This creates a subtle contextual connection to the game being analysed without competing with data readability. The car imagery should feel aspirational and cinematic, not decorative.

**Target users:** Game designers (progression balancing, FTUE diagnostics), studio leadership (SLT health overview), and live operations teams (retention, engagement metrics).

**Key quality:** Every dashboard must be scannable in under 5 seconds. The top-level story should be visible without scrolling. Detail lives in drill-downs, not density.

## Colours

The palette is sourced from Lighthouse Games' actual PowerPoint brand decks (Nov 2024 and May 2025). The dominant colours are magenta-purple and electric blue, with hot pink and coral/orange as supporting accents. The dark backgrounds use deep purple-blacks rather than pure black.

### Brand colours (from PPT extraction)

| Role | Hex | Source | Notes |
|---|---|---|---|
| **Primary (magenta-purple)** | #A93DA1 | 33 uses in live service deck | Dominant purple accent across all slides |
| **Secondary (electric blue)** | #3152FF | 46 uses across variants | Primary blue, most-used brand colour |
| **Accent pink** | #E4347A | 13 uses | Hot pink secondary accent |
| **Accent coral** | #FF5528 | 54 uses | Alert/highlight, highest raw frequency |
| **Classic purple** | #7030A0 | 7 uses | Deeper purple variant |
| **Lavender** | #9A8FED | 7 uses | Tertiary purple, softer accent |
| **Background primary** | #0F032B | 10 uses | Deep purple-black |
| **Background alt** | #042433 | 10 uses | Deep blue-black |

- **Primary (#A93DA1):** The lead accent. Used for active states, primary buttons, selected filters, focus rings, and KPI highlights. This magenta-purple is the brand's dominant colour -- it should be the first colour the eye hits on any dashboard.
- **Primary Deep (#7030A0):** Classic purple from the decks. For sidebar accents, section dividers, and card headers on dark backgrounds.
- **Primary Light (#C75ABF):** Lighter tint for secondary interactive accents and chart series lead.
- **Secondary (#3152FF):** Electric blue from the brand. Used for secondary highlights, info states, links, and the second chart series. The most frequently used colour in the decks.
- **Accent Pink (#E4347A):** Hot pink for notification badges, call-out highlights, and the third chart series.
- **Accent Coral (#FF5528):** Coral/orange for alert indicators, urgent highlights, and warm accent where needed. Highest raw frequency in the decks but used as a supporting colour in the dashboard.
- **Lavender (#9A8FED):** Soft purple for tertiary accents, hover states, and the fifth chart series.
- **Success (#22C55E):** Positive KPIs, upward trends, completed funnels, healthy retention. Always paired with a dark green background badge (#052E16) for contrast.
- **Warning (#F59E0B):** Approaching thresholds, at-risk metrics, caution states.
- **Danger (#EF4444):** Negative KPIs, churn spikes, crash rates, blocked states. Always paired with a dark red background badge (#450A0A).

### Chart colours

The 8-colour chart series leads with the brand's actual colours, then supplements with functional colours for maximum distinction on dark backgrounds:

1. Magenta-purple (#A93DA1) -- brand primary, always the lead series
2. Electric blue (#3152FF) -- brand secondary
3. Hot pink (#E4347A) -- brand accent
4. Coral (#FF5528) -- brand accent
5. Lavender (#9A8FED) -- brand tertiary
6. Green (#22C55E) -- functional
7. Cyan (#06B6D4) -- functional
8. Amber (#F59E0B) -- functional

### Funnel colours

Progression and FTUE funnels use a sequential magenta-purple ramp from light to dark, creating a natural visual flow from entry to drop-off: #C75ABF through #2A1140 in 7 steps.

## Typography

All UI text uses **Inter**. Numeric/metric data may use **JetBrains Mono** for alignment and precision. No other typefaces.

- **H1 (28px/700):** Page titles only -- "Progression Summary", "FTUE Health", "SLT Overview"
- **H2 (22px/600):** Section headers within a page
- **H3 (18px/600):** Card titles, chart titles, scorecard labels
- **Body (14px/400):** General content, descriptions, help text, filter labels
- **Body Small (13px/400):** Table cell content, dense data views
- **Caption (12px/500):** Chart axis labels, badge text, timestamps, metadata
- **Overline (11px/600):** Section category labels -- always uppercase with 0.08em tracking. Matches Lighthouse's website label treatment
- **Mono (13px/400):** Raw metric values, percentages in scorecards, player counts, IDs, delta values

## Layout

Dashboards follow a sidebar-plus-content layout. The sidebar provides navigation between dashboard pages (SLT, Progression, FTUE pages 1-3). The content area is a scrollable canvas of cards arranged in a responsive grid.

The spatial system uses a 4px base unit. Most internal spacing uses lg (24px) for card padding and card-gap (16px) between cards. Filter bars sit at the top of the content area with md (16px) padding.

Standard card grid: 2-3 columns on desktop for scorecards, full-width for charts and tables. KPI scorecards group in rows of 4-6 at the top of each page.

Table rows are fixed at 44px height for scanability. Filter bars are sticky.

## Elevation & Depth

Depth is communicated through three surface tiers:

1. **Base (#0F032B):** Page background -- deepest layer, where background car imagery sits. Deep purple-black from the brand decks.
2. **Card (#1A0E30):** Standard cards, sidebar, filter bars. Purple-tinted dark.
3. **Elevated (#251842):** Modals, dropdowns, tooltips, table headers, popovers.

Shadows are minimal in dark mode. A subtle magenta glow effect (`0 0 20px rgba(169, 61, 161, 0.15)`) can accent focused or active elements, echoing Lighthouse's ambient glow brand treatment.

## Shapes

Radii are slightly larger than typical data tools to maintain the premium feel:

- **sm (6px):** Buttons, inputs, badges, filter chips
- **md (10px):** Cards, panels, dropdowns, chart containers
- **lg (16px):** Modals, hero cards, large feature panels -- echoes Lighthouse website's `rounded-3xl`
- **full (9999px):** Status dots, avatars, pill badges

## Components

**Scorecards** display a single KPI with label, value (mono font, large), and trend indicator (arrow + percentage in success/warning/danger colour). Card background with md radius. Group in horizontal rows at the top of each dashboard page.

**Filter bars** span the full width below the page title. Contain dropdowns for date range, platform, country, build version. Sticky positioning so they remain visible while scrolling data. Card background with md radius.

**Tables** are the primary data display for quest timing, progression funnels, and detailed breakdowns. Header row uses elevated background with overline typography (uppercase, tracked). Data rows use card background with body-sm typography. Sortable columns show directional indicators in text-muted colour. Hover state uses surface-hover.

**Charts** sit in cards with a title (h3) and optional subtitle (caption). The chart area fills the card minus padding. Axis labels use caption typography. Tooltips use elevated background with sm shadow. All charts use the 8-colour series palette with the brand magenta-purple leading.

**Funnel visualisations** use horizontal bars with the sequential magenta-purple ramp. Each bar shows the step label (body), player count (mono), and percentage (mono, text-secondary). The bars narrow proportionally to show drop-off visually.

**Buttons** come in primary (magenta-purple fill, white text) and secondary (transparent, electric blue text with border). Both use sm radius. Primary buttons are used for actions (export, apply filters). Secondary for lesser actions (reset, cancel).

**Background imagery layer:** Behind the dashboard content, a full-bleed container holds faded car imagery or looping video. Applied with 5-10% opacity, a dark gradient overlay (base colour to transparent), and CSS `mix-blend-mode: luminosity` to prevent colour interference with data. The imagery should be high-quality in-game renders or footage -- aspirational, not generic stock. Different dashboard pages can feature different vehicles or scenes.

## Do's and Don'ts

- Do lead with the brand magenta-purple (#A93DA1) -- every page should have at least one prominent purple element
- Do use the electric blue (#3152FF) as a strong secondary -- it's the most-used colour in the brand decks
- Do use the sequential purple ramp for funnels and progression data -- it reinforces the brand while being functional
- Do incorporate subtle car imagery in backgrounds -- it grounds the tool in the game's identity
- Do use mono typography for all numeric values in scorecards and KPI displays
- Do keep top-level KPIs visible without scrolling on every dashboard page
- Don't let background imagery exceed 10% opacity -- data readability is non-negotiable
- Don't use more than 3 chart series colours in a single small chart -- save the full 8-colour palette for complex comparisons
- Don't mix the brand accent colours (pink/coral) with status colours in the same context -- status colours are semantic, brand colours are decorative
- Don't use pure black (#000) for backgrounds -- always use the purple/blue-tinted darks from the brand (#0F032B, #042433)
- Don't add decorative animation to data elements -- charts and tables should feel instant and stable
- Do ensure all text meets WCAG AA contrast ratios -- test magenta-on-dark and blue-on-dark combinations carefully
- Don't use the coral accent (#FF5528) and danger colour (#EF4444) interchangeably -- coral is brand, danger is semantic
