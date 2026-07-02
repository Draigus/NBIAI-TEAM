# Inline Quick-Add for Work Items

**Date:** 2026-06-25
**Status:** Approved
**Scope:** Frontend only (dashboard-server/public/js/, dashboard-server/public/css/)

## Problem

Creating child work items in the project tree view is cumbersome. The current flow requires either:

1. **Header menu path:** Click "+ New" → select type → modal picks parent → full detail panel opens (view resets, scroll position lost). 3-5 clicks, full context loss.
2. **Detail panel path:** Open parent item's detail panel → scroll to children section → click "+ Add Story/Task" → detail panel replaces with new item. 3-4 clicks, still loses tree context.

Both flows force the user out of the tree view they were navigating, require re-selecting information the system already knows (parent, child type), and reset the view after creation.

## Solution

Add an inline quick-add interaction directly in the tree view. A plus icon on each row (project, feature, story) opens a lightweight inline form that creates a child item without leaving the tree.

## Detailed Design

### Plus Icon

- **Visibility:** Appears on row hover only (not always visible). Positioned at the right end of the row, before any existing trailing content (hours, assignee).
- **Appears on:** Project rows (creates feature), feature rows (creates story), story rows (creates task). Does NOT appear on task rows (tasks have no children).
- **Colour:** Matches the child type colour from `ITEM_TYPE_META`:
  - On project rows: feature purple (#8b5cf6)
  - On feature rows: story cyan (#06b6d4)
  - On story rows: task grey (#64748b)
- **Size:** 20x20px square with 4px border-radius. Icon is a bold "+".
- **Element:** Must be a real `<button type="button">` with `aria-label="Add {childType}"` for keyboard and screen reader access. Visible on hover via CSS, but also reachable via Tab/focus-visible so keyboard-only users can discover it. On touch devices, the button is always visible (use `@media (hover: none)` to show permanently on touch screens).
- **Interaction:** Single click opens the quick-add form. Click does NOT propagate to the row's `openDetail` action (use `data-stop` or `stopPropagation`).

### Quick-Add Form

- **Position:** Appears inline in the tree, below the parent row's existing children (or directly below the parent if it has no children yet). Indented to match child depth level.
- **Background:** Subtle tinted background matching the child type colour at ~8% opacity, with a 1px border at ~25% opacity and 6px border-radius.
- **Type badge:** Shows the child type badge (e.g. "Story" in cyan) plus "Quick Add" label next to it.

#### Fields

Three fields in a single horizontal row:

1. **Name** (text input, flex: 2)
   - Placeholder: "{Type} name..." (e.g. "Story name...")
   - Autofocused on form open
   - Required -- cannot create without a name

2. **Start date** (date input, flex: 1)
   - Defaults to today's date (pre-populated, editable)
   - Maps to the `startDate` field on the task object

3. **Owner** (select dropdown, flex: 1)
   - Defaults to "Owner..." placeholder (unassigned)
   - Smart ordering: assignees from the parent item and its existing children (siblings) appear first, separated from the rest by an `<optgroup>` divider
   - Remaining team members listed alphabetically below
   - Source: `_cachedTeamMembers` global (loaded from `/api/users` by `loadTeamMembers()` in `nbi-api.js`). This is the same source the detail panel's assignee picker uses. Do NOT use `_assigneeMerge` (that is local to `renderPeopleView()` in `nbi-people.js`)
   - Maps to `assignees[0]` on the task object (single primary assignee)

4. **Create button** -- styled with child type colour background, white text, "Create" label
5. **Close button** -- ghost "×" button to dismiss the form

#### Keyboard Flow

- **Tab:** Moves between name → start date → owner → create button
- **Enter** (on the name input or create button only): Creates the item and keeps the form open for the next sibling. Name field clears and re-focuses. Start date and owner retain their values (likely the same for batch entry). Do NOT intercept Enter on the date picker or select dropdown -- those have native browser behaviours (opening pickers, confirming selections) that must not be overridden.
- **Escape:** Closes the form without creating. Returns focus to the parent row.

### Creation Behaviour

When the user submits (Enter or click Create):

1. Validate: name must be non-empty (trim whitespace). If empty, flash the name input border red briefly and refocus.
2. Call the existing `createTaskObject()` with:
   - `title`: the entered name
   - `parentId`: the parent row's task ID
   - `itemType`: auto-inferred child type from `VALID_CHILD_TYPE[parentType]`
   - `client`: inherited from parent via `getTaskClient(parent)`
   - `startDate`: the date field value (YYYY-MM-DD)
   - `assignees`: `[ownerValue]` if an owner was selected, otherwise `[]`
   - `sortOrder`: `Math.max(0, ...siblings.map(s => s.sortOrder || 0)) + 1` where siblings = `getChildren(parentId)`. This ensures the new item sorts last among its siblings and doesn't jump position on re-render, poll, or reload.
3. Push to `tasks[]`, call `markDirty(t.id)`, call `save()`.
4. **Render the new item inline** in the tree below existing siblings, above the quick-add form. Apply a brief highlight animation (green-tinted left border or background flash, fading over ~1 second via CSS transition).
5. **Do NOT** call `renderContent()` (which re-renders the full tree and loses scroll position). Instead, insert the new row's HTML directly into the parent's children container (`#children_${parentId}`). **Empty parent handling:** if the parent has no existing children, `renderTaskRow()` does not emit a `#children_${parentId}` container. In this case, create the container div dynamically (`<div class="task-children" id="children_${parentId}">`) and insert it after the parent row element. Also update the parent row's toggle arrow from `&nbsp;` to `▾` to reflect it now has children.
6. **Do NOT** call `openDetail()`. The detail panel does not open.
7. **Keep the form open.** Clear the name field, re-focus it. Retain start date and owner values.
8. Call `renderSidebarCounts()` to update sidebar numbers.

### Post-Creation Highlight

The newly created row gets a temporary class (e.g. `task-row--just-created`) that applies:
- Left border: 3px solid matching the item type colour
- Background: item type colour at ~8% opacity
- CSS transition: fades to normal row styling over 1.5 seconds
- Class removed after animation completes (via `setTimeout` or `transitionend`)

### Expanding Collapsed Parents

If the user clicks the plus icon on a collapsed parent (children hidden):
1. Expand the parent first (remove from `collapsedTaskIds`, show children container)
2. Then show the quick-add form below the now-visible children

### Only One Form Open at a Time

If the user clicks a plus icon while another quick-add form is already open elsewhere:
1. Close the existing form (no creation, discard any entered text)
2. Open the new form at the clicked location

This prevents confusion from multiple open forms. Simple rule: one form, always.

## Files to Modify

### Frontend JS

- **[nbi-kanban.js](dashboard-server/public/js/views/nbi-kanban.js)** -- `renderTaskRow()` function (line ~326): Add the hover-reveal plus icon HTML to each project/feature/story row. Add new `data-action` handler for the plus icon click. This single function serves both the kanban and task tree views (`nbi-tasks.js` calls it but does not define its own).
- **[nbi-detail.js](dashboard-server/public/js/views/nbi-detail.js)** -- New quick-add functions live here alongside the existing creation logic. The `addItem()` function (line ~1247) and `createTaskObject()` are the reference for creation, but quick-add bypasses `renderContent()` and `openDetail()`. New functions needed: `showQuickAdd(parentId)`, `submitQuickAdd()`, `closeQuickAdd()`.

### Frontend CSS

- **[dashboard.css](dashboard-server/public/css/dashboard.css)** -- New styles for:
  - `.quick-add-btn` (the hover-reveal plus icon)
  - `.quick-add-form` (the inline form container)
  - `.task-row--just-created` (highlight animation)
  - Hover state on `.task-row` to show the plus icon

### No Server Changes

The quick-add uses the same `createTaskObject()` → `markDirty()` → `save()` → `syncToAPI()` pipeline as existing creation. No new API endpoints needed.

## What Does NOT Change

- Header "+ New" menu and its dropdown (still works for creating without context)
- Detail panel "+ Add {Type}" button (still works for creating from the detail view)
- Drag-drop reparenting
- The `showAddItemPicker()` modal flow
- Server-side type hierarchy enforcement
- Multi-user sync model

## Edge Cases

1. **No client set:** Should not happen since parent always has a client (inherited up the tree). If somehow triggered, fall back to `_pickClient()` modal.
2. **Name-only creation:** If the user types a name and hits Enter without setting date or owner, the item creates with today's date and no assignee. Both are valid states.
3. **Very long names:** Text input has no max-length enforcement. The tree row will truncate via CSS ellipsis as it does for all items.
4. **Concurrent creation:** Another user creating under the same parent during quick-add is handled by the existing 10-second poll. The new item appears on next sync; no conflict since IDs are UUIDs.
5. **Filtered view:** If the tree is filtered and the new item would be hidden by the filter, it should still appear temporarily (with highlight). Implementation: when inserting the new row inline, bypass the `visibleIds` check by calling `renderTaskRow()` with `visibleIds = null` for just the new item. On next full `renderContent()` the item may disappear if it doesn't match the filter. Acceptable trade-off.
6. **Sync rejection:** If the server rejects the synced task (e.g. unknown client, permission issue), the existing sync error handling applies -- `syncToAPI()` retries with backoff and the item remains in the dirty set. No special handling needed beyond what `addItem()` already has, since quick-add uses the same pipeline.
