# WorkSage Tooltip System — Design Spec

**Date:** 2026-05-23
**Status:** Draft
**Scope:** CSS-only tooltip system for plain-language element descriptions

## Problem

WorkSage has many controls, metrics, badges, and icons whose meaning isn't immediately obvious to new users or infrequent visitors. There's no consistent way to discover what an element does without clicking it.

## Design

### Approach: CSS-only `data-tooltip` attributes

Add `data-tooltip="Plain description"` to discoverable elements. A single CSS block (~25 lines) renders styled tooltips on hover using `::after` pseudo-elements. No JavaScript. No external libraries.

### Tooltip behaviour

- Appears **above** the hovered element (fallback: below if near top edge via a `data-tooltip-pos="below"` variant)
- **300ms delay** before appearing (prevents flicker on casual mouse movement)
- Matches the current theme (dark bg on light theme, light bg on dark theme)
- Max width ~280px, text wraps naturally
- Small arrow/caret pointing to the source element
- Disappears immediately on mouse-out

### Theme integration

- Light theme: dark background (`#1a1a2e`), white text
- Dark theme: light background (`#e8e8f0`), dark text (`#1a1a2e`)
- Uses the existing `.dark-mode` class on `<body>` for switching

### Coverage targets (full rollout, not just PoC)

| Element type | Example | Tooltip content style |
|---|---|---|
| Navigation tabs | "Tasks", "Report" | What the page shows |
| KPI cards | "Need Attention", "Active" | What counts toward this number |
| Action buttons | Sort buttons, filter toggles | What clicking does |
| Status badges | "Blocked", "Overdue" | What this status means |
| Column headers | "S", "E", "D" abbreviations | Full name + purpose |
| Inline controls | Health state, priority dropdowns | What this control changes |
| Icons | Bug icon, filter icon | What clicking does |

### PoC scope

**My Tasks view only.** This section contains all element types above in one place:
- 5 KPI cards (Active, Need Attention, In Progress, Complete %, Hours Tracked)
- Sort buttons (Priority, Due Date, Client, Status)
- Inline task controls (status, priority, health, dates, hours, assignee)
- Filter dropdowns (client, project)

### CSS implementation

```css
[data-tooltip] {
    position: relative;
}

[data-tooltip]:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.4;
    max-width: 280px;
    width: max-content;
    white-space: normal;
    text-align: center;
    z-index: 10000;
    pointer-events: none;
    animation: tooltipFadeIn 0.15s ease-out;
    /* Light theme default */
    background: #1a1a2e;
    color: #fff;
}

[data-tooltip]:hover::before {
    content: '';
    position: absolute;
    bottom: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #1a1a2e;
    z-index: 10000;
    pointer-events: none;
}

/* Below variant */
[data-tooltip-pos="below"]:hover::after {
    bottom: auto;
    top: calc(100% + 8px);
}
[data-tooltip-pos="below"]:hover::before {
    bottom: auto;
    top: calc(100% + 2px);
    border-top-color: transparent;
    border-bottom-color: #1a1a2e;
}

/* Dark theme */
body.dark-mode [data-tooltip]:hover::after {
    background: #e8e8f0;
    color: #1a1a2e;
}
body.dark-mode [data-tooltip]:hover::before {
    border-top-color: #e8e8f0;
}
body.dark-mode [data-tooltip-pos="below"]:hover::before {
    border-top-color: transparent;
    border-bottom-color: #e8e8f0;
}

/* Delay */
[data-tooltip]::after,
[data-tooltip]::before {
    opacity: 0;
    transition: opacity 0.15s ease-out 0.3s;
}
[data-tooltip]:hover::after,
[data-tooltip]:hover::before {
    opacity: 1;
}

@keyframes tooltipFadeIn {
    from { opacity: 0; transform: translateX(-50%) translateY(4px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
```

### Content principles

- Plain English, no jargon
- Max ~15 words per tooltip
- Describe what the element shows or does, not how to use it
- Examples: "Tasks that are overdue or missing required fields" not "Click to filter"

## Out of scope

- Interactive tooltips (clickable links, buttons inside tooltips)
- Touch/mobile support (tooltips are hover-only by design)
- Tooltip for every single table cell
- Any JavaScript

## Rollout

1. **PoC** — My Tasks view only (this spec)
2. **If approved** — Roll across all 9 views in a single pass
