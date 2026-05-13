# Create New — Stepped Wizard Redesign

**Date:** 2026-05-05
**Status:** Approved by Glen

## Problem

The "Create New" button has inconsistent behaviour. The main button creates a project directly; the dropdown shows all 4 types but routes them through different flows. Glen wants a single, consistent stepped flow for all item creation.

## Design

### Flow: Type → Parent → Details

**Step 1 — Pick type:** Clicking "New" or the dropdown arrow opens the same menu with 4 options: Project, Feature, Story, Task. The main button no longer creates a project directly.

**Step 2 — Pick parent:** A modal picker appropriate to the type chosen:
- **Project** → Client picker (dropdown of existing clients)
- **Feature** → Project picker (list of projects, grouped by client)
- **Story** → Feature picker (list of features, grouped by client → project)
- **Task** → Story picker (list of stories, grouped by client → project → feature)

**Step 3 — Details:** Item is created with type and parent locked in, detail panel opens for editing title, description, dates, etc. (existing `openDetail()` behaviour, unchanged).

### Context-aware shortcuts

- If `currentFilter.client` is set, pre-select that client for Projects and filter parent lists for other types.
- If only one valid parent exists, auto-select it and skip Step 2.

### Parent picker grouping

Parent lists are grouped by ancestor hierarchy with section headers. Example for Story picker:

```
Client: Acme Corp
  Project: Dashboard v2
    ▸ Feature: Auth System
    ▸ Feature: Reporting
Client: Goals
  Project: Alpha
    ▸ Feature: Economy
```

Each feature row is clickable to select it as parent.

### Empty states

- No clients → toast "No clients configured — add one in Settings first."
- No valid parents → toast "No {parent_type_plural} exist yet. Create a {parent_type} first."

## Changes Required

1. **`addTask()` function** — change to open the type dropdown instead of creating a project directly
2. **`showAddItemPicker(type)`** — refactor to group parents by hierarchy instead of flat list
3. **`addItemFromMenu(type)`** — for Projects, route through `showAddItemPicker`-style client picker (reuse `_pickClient` or unify)
4. **No HTML structure changes** — the dropdown menu already has all 4 types

## Files Touched

- `nbi_project_dashboard.html` only — JS functions `addTask`, `addItemFromMenu`, `showAddItemPicker`, `_pickClient`

## Out of Scope

- Quick-add bar (separate inline input, unchanged)
- Detail panel contents (unchanged)
- Server-side changes (none needed — item creation API unchanged)
