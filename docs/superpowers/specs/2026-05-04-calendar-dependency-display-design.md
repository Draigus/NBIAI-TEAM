# Calendar Dependency Display

## Summary

Add dependency visualisation to the Calendar sub-view. A toggle activates "dependency mode" — clicking any task chip highlights its prerequisites and dependents on the grid with coloured rings and floating labels. Off by default; no visual clutter until requested.

## Design

### Toggle

- Button in the calendar nav bar (alongside "Show events from others" checkbox)
- Label: chain-link icon + "Dependencies"
- Active state: accent-coloured background, like a pressed mode button
- State tracked in `_calDepMode` (boolean, not persisted to localStorage — resets each session)

### Interaction Flow

1. User clicks "Dependencies" toggle -> `_calDepMode = true`
2. User clicks any task chip on the calendar:
   - That chip becomes "selected" (blue ring)
   - Its prerequisites (tasks in its `dependencies` array) get orange ring + "blocks" label
   - Tasks that have this task in THEIR `dependencies` array get green ring + "needs this" label
3. Clicking another task chip switches the highlight to that task's chain
4. Clicking the same task again OR clicking empty calendar space deselects (clears all highlights)
5. Toggling dep mode off clears all highlights and resets selected state

### Visual Treatment

| Element | Ring | Label | Colour Variable |
|---|---|---|---|
| Selected task | 2px solid ring | (none) | `var(--accent)` |
| Prerequisite (blocks selected) | 2px solid ring | "blocks" | `var(--warning)` |
| Dependent (needs selected) | 2px solid ring | "needs this" | `var(--success)` |

- Rings applied via CSS class on the `.cal__task` element: `cal__task--dep-selected`, `cal__task--dep-blocks`, `cal__task--dep-needs`
- Floating labels: injected via `insertAdjacentHTML` as a pill-shaped span positioned absolute, above-right of the chip
- Label style: 0.55rem, pill border-radius, semi-transparent background matching ring colour, white text

### Implementation Approach: DOM Manipulation (no re-render)

Task chips already carry `data-arg0="${taskId}"` for the detail panel action. On click in dep mode:

1. `e.stopPropagation()` to prevent opening the detail panel
2. Clear any existing highlights (remove classes + label elements from previous selection)
3. Look up the clicked task's `dependencies` array
4. Find dependents: `tasks.filter(t => t.dependencies && t.dependencies.includes(clickedId))`
5. Query DOM: `document.querySelectorAll('.cal__task[data-arg0="<id>"]')` for each related task
6. Add appropriate CSS class + inject label span

Highlights are naturally cleaned up on month navigation or any `renderContent()` call since the HTML is rebuilt.

### Edge Cases

**Prerequisite on a different month:**
When a prerequisite or dependent is not visible on the current month, show an info banner below the calendar nav:
- Text: "N prerequisites on other months" / "N dependents on other months"
- Each is a clickable link that navigates to the month containing that task's due date
- Banner appears only when off-screen deps exist for the current selection

**No dependencies:**
If the clicked task has no prerequisites and nothing depends on it, show a brief toast: "No dependencies for this task"

**Multiple chips for same task:**
A task can appear on multiple days (start, due, end dates). All instances of the same task ID get the same highlight treatment.

### CSS Classes

```css
.cal__task--dep-selected { box-shadow: 0 0 0 2px var(--accent); z-index: 2; }
.cal__task--dep-blocks { box-shadow: 0 0 0 2px var(--warning); z-index: 2; }
.cal__task--dep-needs { box-shadow: 0 0 0 2px var(--success); z-index: 2; }
.cal__dep-label { position: absolute; top: -14px; right: -4px; font-size: 0.55rem; padding: 1px 5px; border-radius: 8px; color: #fff; white-space: nowrap; pointer-events: none; z-index: 3; }
.cal__dep-label--blocks { background: var(--warning); }
.cal__dep-label--needs { background: var(--success); }
```

Task chips need `position: relative` added (if not already) to anchor the absolute labels.

### State Variables

```javascript
let _calDepMode = false;
let _calDepSelected = null; // task ID or null
```

### Event Handling

In dependency mode, task chip clicks are intercepted:
- Check `_calDepMode` before the normal `openDetail` action fires
- Use event delegation on the calendar container: if `_calDepMode` and click target is `.cal__task`, run the dependency highlight logic instead of opening detail

Normal click behaviour (openDetail) is preserved when dep mode is off.

## Files Changed

- `nbi_project_dashboard.html` — CSS classes, toggle button in calendar nav, dep-mode click handler, highlight/clear functions

## Not In Scope

- SVG connecting lines between chips (too noisy on a calendar grid)
- Persisting dep mode state across sessions
- Dependency editing from the calendar (use Gantt for that)
