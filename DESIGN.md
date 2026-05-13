---
version: alpha
name: WorkSage Dark
description: NBI WorkSage project dashboard - dark-first professional tool UI with 6 theme variants
colors:
  primary: "#0066FF"
  primary-hover: "#0055dd"
  primary-dim: "#0044aa"
  primary-text: "#4d9aff"
  surface-base: "#0a0a0a"
  surface-raised: "#111111"
  surface-card: "#141414"
  surface-hover: "#1e1e1e"
  surface-input: "#1c1c1c"
  border-subtle: "#1f1f1f"
  border-default: "#2a2a2a"
  border-strong: "#3a3a3a"
  text-primary: "#e8e8e8"
  text-secondary: "#999999"
  text-muted: "#888888"
  text-faint: "#666666"
  success: "#22c55e"
  warning: "#f59e0b"
  danger: "#ef4444"
  purple: "#a855f7"
  cyan: "#06b6d4"
typography:
  display:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 0.95rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.1em
  heading:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 0.85rem
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 0.8rem
    fontWeight: 500
    lineHeight: 1.4
  body-sm:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 0.6rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.12em
  mono:
    fontFamily: JetBrains Mono, monospace
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.5
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: 6px 14px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 6px 14px
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 6px 10px
  sidebar-item:
    textColor: "{colors.text-secondary}"
    padding: 8px 16px
    rounded: "{rounded.md}"
  sidebar-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
---

# WorkSage Design System

## Overview

WorkSage is NBI's internal project management dashboard - a professional, dense, data-heavy tool UI built for power users managing complex project hierarchies across clients, projects, features, stories, and tasks. The design prioritises information density, scannability, and low eye strain for extended use (12+ hour sessions).

The default theme is dark. Six theme variants exist: Default Dark, Light, Midnight Blue, Nord, Solarized Dark, and Dracula. All themes share the same spatial and typographic system but swap colour palettes.

The visual language is utilitarian and restrained - no decorative elements, no gradients, no illustrations. Every pixel earns its place by conveying information or supporting interaction.

## Colors

The palette is built on near-black neutrals with a single strong blue accent for interactive elements and active states.

- **Primary (#0066FF):** The sole accent colour. Used for active sidebar items, primary buttons, links, and focus indicators. Never decorative - always interactive or status-bearing.
- **Text Primary (#e8e8e8):** Main content text. High contrast against dark surfaces without being pure white (reduces glare).
- **Text Secondary (#999):** Supporting text, metadata, timestamps, secondary labels.
- **Text Muted (#888):** De-emphasised content, placeholders, disabled states.
- **Success (#22c55e):** Completed status, positive metrics, confirmation states.
- **Warning (#f59e0b):** At-risk items, approaching deadlines, caution states.
- **Danger (#ef4444):** Blocked items, errors, overdue deadlines, destructive actions.
- **Purple (#a855f7):** Used for specific item types and visual differentiation in kanban views.
- **Cyan (#06b6d4):** Secondary differentiation colour for charts and status indicators.

Status colours always appear as text/icon colour on a subtle tinted background (8% opacity) with a matching border (25% opacity). This pattern is consistent across all themes.

## Typography

The entire UI uses **Inter** as both display and body typeface. Monospace content (code, IDs, technical values) uses **JetBrains Mono**. No other typefaces are used.

- **Display:** Inter 700 at 0.95rem - used only for the app logo and major section headers. Tracked at 0.1em, uppercase.
- **Heading:** Inter 600 at 0.85rem - card titles, panel headers, modal titles.
- **Body:** Inter 500 at 0.8rem - primary interactive text, button labels, table content, form labels.
- **Body Small:** Inter 400 at 0.75rem - secondary content, descriptions, help text.
- **Label:** Inter 600 at 0.6rem - section dividers, category headers. Always uppercase with 0.12em tracking.
- **Mono:** JetBrains Mono 400 at 0.75rem - timestamps, IDs, code references.

The base font size is 17px (set on `html`). All other sizes are relative via rem. This is intentionally larger than typical web apps to support readability in dense data views.

## Layout

The layout is a fixed three-region structure: collapsible sidebar (left), main content area (centre), and contextual panels (right, conditional). No grid system - layout is flex-based with explicit spacing tokens.

The 8-point spacing scale starts at 4px (xs) and doubles through to 64px (4xl). The most commonly used values are sm (8px) for tight internal spacing, md (12px) for component padding, and lg (16px) for section separation.

Content panels use full height (100dvh) with overflow scrolling. The sidebar collapses to icon-only mode on smaller viewports. No responsive breakpoints below this - the app is desktop-first with a mobile adaptation layer for critical views only.

## Elevation & Depth

Depth is conveyed through background tinting rather than heavy shadows. The surface hierarchy is:

1. **Base (#0a0a0a):** App background
2. **Surface (#161616):** Panel backgrounds
3. **Raised (#111111):** Cards, dropdowns, modals
4. **Card (#141414):** Content cards within panels
5. **Hover (#1e1e1e):** Interactive hover state

Shadows are minimal and used only for floating elements (dropdowns, modals, tooltips). Three levels: sm (1px blur), md (8px blur), lg (16px blur). All use black at 30-50% opacity in dark theme.

## Shapes

The shape language is subtly rounded with small, consistent radii. No sharp corners, no pill shapes except for badges and tags.

- **sm (4px):** Inline elements, tags, small badges
- **md (6px):** Buttons, inputs, table cells, sidebar items
- **lg (8px):** Cards, panels, dropdowns, modals
- **xl (12px):** Large containers, dialog boxes
- **full (9999px):** Avatar circles, status dots only

## Components

**Buttons** come in two variants: primary (blue fill, white text) and secondary (surface background, default border, primary text). Both use md radius and consistent 6px/14px padding. Small variant reduces to 4px/10px. All buttons include a 0.15s transition on all properties.

**Cards** use the card background colour with lg radius and lg padding. Borders are border-default (1px solid). Cards never have shadows in the default dark theme.

**Sidebar items** are full-width with md radius, 8px/16px padding. Active state uses primary blue background with white text. Hover state uses bg-hover. The sidebar supports a collapsed mode where text is replaced by two-letter abbreviations in small rounded badges.

**Inputs** use the input background with md radius and a subtle border. Focus state adds the accent colour as border with a 3px accent-coloured box shadow at 15% opacity.

**Modals** use raised background, lg radius, lg shadow. Header and footer separated by border-default. Max width varies by content type but never exceeds 90vw.

**Tables** are dense with no cell padding beyond sm. Row hover uses bg-hover. Header rows use label typography (uppercase, tracked). Sortable columns show directional indicators.

## Do's and Don'ts

- Do maintain the information-dense aesthetic - this is a power-user tool, not a marketing site
- Do use status colours consistently: green=done, amber=at-risk, red=blocked/overdue
- Do keep all interactive elements at minimum 32px touch target height
- Don't introduce gradients, decorative borders, or illustrations
- Don't use the accent blue for non-interactive decoration
- Don't add animations longer than 0.15s - the UI should feel instant
- Don't use pure white (#fff) for text in dark themes - use text-primary (#e8e8e8)
- Don't mix border radii within the same component - pick one size and stick with it
- Do ensure all text meets WCAG AA contrast ratios against its background
- Don't create new spacing values outside the defined scale
