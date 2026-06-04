# Scroll Architecture Redesign

**Date:** 2026-05-14
**Status:** Approved
**Scope:** Every scroll container in the NBI Dashboard SPA

---

## Problem

The dashboard has accumulated ~30 scroll-related bugs over its lifetime. The root cause was a broken CSS variable (`--vh-full` self-referential, fixed 2026-05-14) that made the layout shell `height: auto` instead of viewport-constrained. This broke the CSS flex chain, so JS workarounds (`fixScrollHeights()`, per-view `requestAnimationFrame` height hacks) were layered on top. Those workarounds fight the now-fixed CSS chain: they replace `flex: 1` with `flex: none` + pixel heights on every render and resize, creating timing issues and stale values.

The dashboard currently uses TWO competing scroll strategies simultaneously:
1. CSS flex chain (`flex: 1; overflow-y: auto`) - the correct approach, now working
2. JS pixel overrides (`fixScrollHeights()` + per-view hacks) - workarounds that should never have existed

## Solution

**One rule, applied everywhere.** Pure CSS flexbox, no JS height calculations.

Every scroll boundary follows this pattern:

```
Parent:   overflow: hidden              (clips content, creates boundary)
Fixed:    flex-shrink: 0                (headers, filter bars, tabs - never shrink)
Scrolls:  flex: 1; min-height: 0;      (fills remaining space, can shrink below content)
          overflow-y: auto              (scrolls when content exceeds available space)
```

This pattern repeats at every nesting level. The browser handles resize, filter bar wrapping, breadcrumb toggling - all automatically.

## View Categories

Every view falls into exactly one category:

### Split-pane views (mainContent = overflow: hidden)

The view manages its own internal scroll containers. mainContent becomes a flex column with no scroll.

| View | Container class | Internal scroll containers |
|------|----------------|---------------------------|
| Tasks (Projects) | `.tasks-view` | `.tasks-layout__main`, `.tasks-layout__detail` |
| Documentation | `.docs` | `.docs__tree`, `.docs__editor` |
| Portfolio (Dashboard) | `.pf` | `.pf__panel-body` elements |
| Command Centre | `.cc-page` | CC-specific panels |

### Single-scroll views (mainContent = overflow-y: auto)

Content flows naturally inside mainContent. mainContent is the only scroll container.

Settings, People, Reporting, Leads, Bugs, Hiring, Expenses, Finances, Queue, My Tasks, News, Workload.

### Switching mechanism

CSS `:has()` selector on `#mainContent` detects which view is rendered and switches behaviour. No JS needed. Already proven in the codebase: `.main__content:has(> .docs)` does exactly this today.

## Complete Flex Chain

```
body                                overflow: hidden
  header.g-header                   height: 52px, flex-shrink: 0
  div.shell                         display: flex (row), height: calc(100vh - 52px)
    aside.sidebar                   flex column, overflow: hidden
      nav.sidebar__nav              flex: 1, min-height: 0, overflow-y: auto  <- SCROLLS
      button.sidebar__toggle        flex-shrink: 0
    main.main                       flex: 1, flex column, overflow: hidden
      div.main__tabs                flex-shrink: 0
      div#breadcrumbBar             flex-shrink: 0 (when visible)
      div#mainContent               flex: 1, min-height: 0
        [SINGLE-SCROLL MODE]        overflow-y: auto (default)
        [SPLIT-PANE MODE]           overflow: hidden, flex column (via :has())
```

### Tasks view chain (most complex)

```
div#mainContent                     overflow: hidden, flex column, padding: 0
  div.tasks-view                    flex: 1, min-height: 0, flex column
    [client profile header]         flex-shrink: 0 (collapsible)
    [practice-mode banner]          flex-shrink: 0 (conditional)
    div.filter-bar                  flex-shrink: 0
    div[quick-add + pills row]      flex-shrink: 0
    div.tasks-layout                flex: 1, min-height: 0, display: flex (row)
      div.tasks-layout__main        flex: 1, min-height: 0, overflow-y: auto  <- SCROLLS
      div.tasks-layout__detail      width: 340px, overflow-y: auto            <- SCROLLS
```

### Portfolio view chain

```
div#mainContent                     overflow: hidden, flex column, padding: 8px
  div.pf                            flex: 1, min-height: 0, overflow: hidden, flex column
    div.pf__kpis                    flex-shrink: 0
    div.pf__row                     flex: 1, min-height: 0, display: flex (row)
      div.pf__panel                 flex: N, overflow: hidden, flex column
        div.pf__panel-hdr           flex-shrink: 0
        div.pf__panel-body          flex: 1, min-height: 0, overflow-y: auto  <- SCROLLS
```

### Documentation view chain

```
div#mainContent                     overflow: hidden, flex column, padding: 0
  div.docs                          flex: 1, min-height: 0, flex column
    div.docs__hdr                   flex-shrink: 0
    div.docs__split                 flex: 1, min-height: 0, display: flex (row)
      div.docs__tree                width: 280px, overflow-y: auto            <- SCROLLS
      div.docs__editor-wrap         flex: 1, overflow-y: auto                 <- SCROLLS
```

### Command Centre view chain

```
div#mainContent                     overflow: hidden, flex column, padding: 0
  div.cc-page                       flex: 1, min-height: 0, overflow: hidden
    [CC internal layout]            CC manages its own scroll containers
```

## Slide-out Detail Panels

These are `position: fixed` overlays (`.detail-panel`, `.ms-detail-panel`, `.bug-detail-panel`, `.candidate-detail-panel`, `.queue-detail-panel`, `.lead-detail-panel`). They are NOT part of the flex chain. They use:

```css
position: fixed;
top: var(--header-h);
height: calc(100vh - var(--header-h));  /* or var(--vh-full) */
overflow: hidden;
display: flex;
flex-direction: column;
```

With a fixed header (`flex-shrink: 0`) and scrollable body (`flex: 1; overflow-y: auto; min-height: 0`). These are already correct and do not need changes.

## CSS Changes

### New rules

```css
/* Split-pane views: mainContent becomes flex column, no scroll */
.main__content:has(> .tasks-view),
.main__content:has(> .pf),
.main__content:has(> .cc-page) {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
}
/* Note: .main__content:has(> .docs) already exists */
```

### Modified rules

```css
/* .tasks-view: add flex behaviour (currently only display:flex; flex-direction:column; height:100%) */
.tasks-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  /* remove height: 100% */
}

/* .pf: change from height:100% to flex:1 */
.pf {
  /* keep: display: flex; flex-direction: column; gap: 12px; overflow: hidden; */
  flex: 1;
  min-height: 0;
  /* remove: height: 100%; */
}

/* .sidebar__nav: remove inline styles set by fixScrollHeights */
/* CSS already correct: flex: 1; overflow-y: auto; padding: var(--space-lg) 0; */
/* JS was overriding with flex: none + explicit height. Removing JS is the fix. */

/* .main__content: already correct */
/* flex: 1; overflow-y: auto; overflow-x: hidden; */
/* The :has() rules override overflow for split-pane views */
```

### Rules to verify are correct (no change expected)

```css
.shell        { display: flex; height: calc(var(--vh-full) - var(--header-h)); }
.sidebar      { display: flex; flex-direction: column; overflow: hidden; }
.sidebar__nav { flex: 1; overflow-y: auto; }
.main         { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.main__content { flex: 1; overflow-y: auto; overflow-x: hidden; }
.tasks-layout { display: flex; gap: 0; flex: 1; min-height: 0; }
.tasks-layout__main { flex: 1; min-width: 0; overflow-y: auto; overflow-x: hidden; }
.tasks-layout__detail { width: 340px; overflow-y: auto; display: flex; flex-direction: column; }
```

## JS Deletions

### Delete entirely

| What | Location | Replacement |
|------|----------|-------------|
| `fixScrollHeights()` function | ~Line 5473-5510 | CSS flex chain |
| `.tasks-layout` height hack | `renderTaskView()` ~Line 7187-7193 | CSS `flex: 1; min-height: 0` on `.tasks-view` |
| `.pf` height hack | `renderDashboard()` ~Line 5577-5589 | CSS `flex: 1; min-height: 0` on `.pf` |
| `.cc-page` height hack | `renderCommandCentre()` ~Line 19683-19687 | CSS `flex: 1; min-height: 0` on `.cc-page` |

### Delete call sites

| Call site | Location |
|-----------|----------|
| `fixScrollHeights()` in `renderContent()` | ~Line 5450 |
| `fixScrollHeights()` in `renderAll()` | ~Line 5470 |
| `fixScrollHeights()` in `window.resize` listener | ~Line 22531 |
| `.pf` height recalc in `window.resize` listener | ~Line 22532-22541 |

### Keep (not workarounds)

| What | Why |
|------|-----|
| Scroll position save/restore in `renderContent()` | Preserves user's scroll position during re-render |
| Gantt scroll-to-today | Feature: auto-scroll to current date on first open |
| Textarea auto-resize (`this.style.height = this.scrollHeight + 'px'`) | Content-fit, not viewport constraint |
| Detail panel resize handle (horizontal width drag) | Horizontal only, unaffected by vertical scroll |

## Verification

After implementation, verify every combination:

**Sidebar:**
- Sidebar scrolls when enough nav items overflow the viewport
- Sidebar scroll preserved when switching views
- Sidebar collapse/expand doesn't break scroll

**Per view (all 17 views):**
- Content scrolls when it exceeds available space
- No double scrollbars
- No content clipped without scrollbar
- Window resize adjusts correctly (no flash, no stale heights)
- Filter bar wrapping (narrow window) reduces content area correctly

**Split-pane views specifically:**
- Tasks: tree/board/gantt scroll independently from inline detail
- Tasks: filter bar and quick-add row stay fixed at top
- Tasks: opening/closing inline detail panel doesn't break scroll
- Docs: tree scrolls independently from editor
- Portfolio: panel bodies scroll independently
- CC: internal panels scroll independently

**Detail panels (slide-out):**
- Body scrolls, header stays fixed
- Opening panel doesn't affect main content scroll position

**Edge cases:**
- Breadcrumb bar showing/hiding adjusts content area
- Client profile header expanding/collapsing adjusts content area
- Practice mode banner doesn't break tasks layout
- Print mode still works (media queries override to height:auto)
- Mobile (<=767px) still works (media queries unlock native scroll)

## Why This Is Permanent

1. **No JS height calculations.** The browser's layout engine handles everything. No timing issues, no stale pixel values, no rAF races.
2. **One pattern everywhere.** Every scroll boundary uses the same three CSS properties. No special cases, no view-specific hacks.
3. **`:has()` is declarative.** The browser re-evaluates when DOM changes. No need to manually switch modes in JS.
4. **Already proven.** The docs view has used this exact pattern since it was built. It works.
5. **Future-proof.** New views just need to either (a) wrap content in a container and add a `:has()` rule if split-pane, or (b) do nothing if single-scroll.
