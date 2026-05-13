# Documentation Tab v2 — Tree UX + Toolbar Fix

**Date:** 2026-05-03
**Status:** Approved design
**Builds on:** `docs/superpowers/specs/2026-05-02-documentation-tab.md` (v1, shipped)

---

## Summary

Three targeted improvements to the Documentation tab shipped in v1:

1. **Right-click context menu** on tree items (Rename, Add subpage, Hide, Delete)
2. **Hidden pages** — soft-archive with admin-only greyed-out visibility
3. **Toolbar wrap** — `flex-wrap: wrap` so all formatting buttons are always visible

---

## 1. Right-Click Context Menu

### Behaviour

- Right-clicking any page in the tree sidebar opens a context menu anchored to the cursor position.
- The menu contains four actions:
  1. **Rename** — switches the tree item's title to an inline `<input>`, pre-filled with the current title. Enter or blur saves (PATCH title to server with ETag). Escape cancels.
  2. **Add subpage** — creates a child page under the right-clicked item. Same as the existing "+" button behaviour (`POST /api/documents` with `parent_id`).
  3. **Hide / Unhide** — toggles the new `hidden` flag (see section 2). Label changes based on current state.
  4. **Delete** — confirmation dialog ("Delete this page and all its sub-pages?"), then `DELETE /api/documents/:id`. Same as existing `_actDocsDelete()` but now accessible from the tree.
- Clicking outside the menu or pressing Escape dismisses it.
- Only one context menu open at a time.

### Implementation notes

- Single global `<div id="docsContextMenu">` appended once, shown/hidden and repositioned on right-click.
- `contextmenu` event listener on each `<li class="docs__tree-li">`.
- `e.preventDefault()` to suppress the browser's native context menu.
- Menu positions via `e.clientX / e.clientY` with viewport boundary clamping so it doesn't clip off-screen.
- The "+" button on each tree item remains as a quick-add shortcut. The context menu is the full management surface.

### Styling

- Background: `var(--bg-surface)`, border: `var(--border-default)`, border-radius: `var(--radius-md)`.
- Each item: padding 6px 12px, hover highlight `var(--bg-hover)`.
- Delete item: `color: var(--danger)`, separated by a 1px `var(--border-default)` divider above it.
- `box-shadow: 0 4px 12px rgba(0,0,0,0.3)` for depth.
- `z-index: 1000` to float above all other UI.

---

## 2. Hidden Pages

### Data model

New column on `documents` table:

```sql
ALTER TABLE documents ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT false;
```

Migration: `036_document_hidden.sql`.

### Behaviour

- **Hiding a page:** sets `hidden = true` on that page via `PATCH /api/documents/:id` (existing endpoint, new field).
- **Children inherit visually but not in the database.** When a parent is hidden, its children are also hidden from normal users. The `hidden` flag is only set on the page that was explicitly hidden — children don't get their own `hidden = true` written. The tree rendering logic checks ancestors.
- **Unhiding:** sets `hidden = false`. Children become visible again (assuming they weren't independently hidden).
- **Who can hide:** any user with `docs_edit` permission for that client.
- **Who can see hidden pages:** users with `docs_edit` permission (NBI admins, client admins with docs_edit). These are the same users who can hide/unhide.
- **Who cannot see hidden pages:** users with only `docs_view` permission (read-only users).

### Server-side changes

- `GET /api/documents?client_id=:uuid`:
  - If the requesting user does NOT have `docs_edit` for this client: filter out rows where `hidden = true`. Then, in application code (not SQL), walk the returned list and remove any row whose ancestor chain includes a hidden page. This is simpler than a recursive CTE and the document list is small per client.
  - If the requesting user DOES have `docs_edit`: return all rows, including hidden ones, with the `hidden` field included in the response. The client-side tree renderer handles greyed-out styling by walking ancestors in `_docsBuildTree()`.
- `PATCH /api/documents/:id`: accept `hidden` (boolean) in the request body. Same ETag/If-Match concurrency as existing fields.
- No changes to DELETE, POST, or move endpoints — hidden pages can still be deleted, created under, or moved.

### Frontend changes

- **Admin view (docs_edit users):** hidden pages render in the tree with:
  - `opacity: 0.4`
  - `font-style: italic`
  - An eye icon and "(hidden)" label after the title
  - All children of a hidden page also render with the same greyed-out styling
- **Read-only view (docs_view users):** hidden pages are not returned by the API, so they simply don't appear.
- **Context menu integration:** the "Hide" / "Unhide" option in the right-click menu toggles this flag. The label is dynamic based on the page's current `hidden` state. If the page is hidden because a parent is hidden (but the page itself is not flagged), the context menu shows "Hide" (not "Unhide") since the page's own flag is still false.
- **Editor pane:** when viewing a hidden page, show a subtle banner at the top: "This page is hidden from non-admin users."

---

## 3. Toolbar Wrap

### Problem

The toolbar container has `overflow: hidden` (or no wrap), causing buttons after "• List" to be clipped when the editor pane is narrower than the full button row.

### Fix

Add `flex-wrap: wrap` to the `.docs__toolbar` container. The toolbar buttons already use flex layout — this single CSS change allows them to flow to a second row when space is tight.

```css
.docs__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  /* existing padding, background, etc. unchanged */
}
```

No JavaScript changes. No button reordering. All buttons remain in the same order — they just wrap naturally.

---

## What's NOT in scope

- Three-dot hover button (decided: right-click only)
- Drag-and-drop changes (already working in v1)
- New toolbar buttons or formatting options
- Page version history, real-time collaboration, search UI, export (remain v2+ backlog)
- Changes to the NBI-only visibility toggle (remains in the editor pane header, unchanged)

---

## Architectural decisions

1. **Children inherit hidden state visually, not in the database.** Setting `hidden = true` on each child would create a mess when unhiding — you'd have to track which children were explicitly hidden vs inherited. Instead, the tree rendering walks ancestors. This matches how file managers handle hidden folders.
2. **`docs_edit` is the permission gate for seeing hidden pages.** Not a new permission flag. Users who can edit can manage visibility. Read-only users see the clean tree.
3. **Right-click only, no three-dot button.** Glen's preference. Keeps the tree visually clean. Mobile users can long-press (maps to contextmenu event on most mobile browsers).
4. **Inline rename in tree.** More natural than a modal dialog. Follows the pattern of file renaming in VS Code, Notion, etc.
5. **Toolbar wrap, not scroll.** All buttons always visible. Two rows at narrow widths is acceptable.
