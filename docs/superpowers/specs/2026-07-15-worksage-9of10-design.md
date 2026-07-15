# WorkSage 9/10 Upgrade — Design Specification

**Date:** 2026-07-15
**Status:** Approved
**Approach:** Cross-cutting foundations first, then section upgrades
**Scope:** 11 UI sections from current 6-7/10 to 9/10

---

## Overview

Take every WorkSage section to 9/10 commercial readiness by building shared infrastructure first, then upgrading each section using those shared components. This avoids building the same capability differently in multiple places.

### What this spec covers

- 6 cross-cutting foundation modules (new JS files)
- 11 section-specific upgrade packages
- 3-layer onboarding system (guided tour, setup wizard, contextual help)
- 3 new database tables + migrations
- 1 new backend endpoint (SSE for real-time)

### What this spec does NOT cover

- AI Chat rebuild (separate spec — uses Anthropic Messages API via cloud account)
- Bug Tracker deep rebuild (separate spec — rearchitect from 5/10)
- Finance deep rebuild (separate spec — rearchitect from 5/10)
- Multi-tenancy / PostgreSQL RLS (separate security hardening spec)
- WebSocket /ws/chat auth fix (separate security fix, immediate priority)

---

## Part 1: Cross-Cutting Foundations

### Foundation 1: Chart Library (`public/js/nbi-charts.js`)

A lightweight chart renderer using HTML5 Canvas. No external dependencies (CSP-compatible). Themed automatically via CSS custom properties read at render time.

**Chart types:**

| Type | Use cases | Rendering |
|---|---|---|
| Line / Area | Burndown, velocity trends, capacity over time | Canvas path with optional area fill below the line |
| Horizontal bar | Workload distribution, pipeline stages, status breakdown | Rounded-corner bars with value labels |
| Donut / Ring | Portfolio completion, status distribution, budget allocation | Arc segments with centre label |
| Sparkline | Inline KPI trends on dashboard, portfolio, command centre | Tiny line chart (no axes, no labels), embeddable in any element |

**API pattern:**

```javascript
// All charts take a container element + config object
renderChart(containerEl, {
  type: 'line',           // 'line' | 'area' | 'bar' | 'donut' | 'sparkline'
  data: [...],            // Array of {label, value} or {x, y} pairs
  series: [...],          // Optional: multiple series for stacked/grouped
  colors: [...],          // Optional: override theme colours
  height: 200,            // Optional: explicit height (default: container height)
  animate: true,          // Optional: entrance animation
  ariaLabel: '...',       // Required: screen reader description
  onClick: (datum) => {}, // Optional: click handler for drill-down
  tooltip: true           // Optional: hover tooltips with formatted values
});
```

**Theme integration:** Reads `--chart-line`, `--chart-fill`, `--chart-grid`, `--chart-text` custom properties. Falls back to `--accent`, `--text-muted`, etc. Each theme in `dashboard.css` gets chart-specific tokens added.

**Responsive:** ResizeObserver on the container. Redraws on resize with debounce. Canvas resolution matches devicePixelRatio for crisp rendering on retina displays.

**Accessibility:** Each chart gets an `aria-label` describing the data. For complex charts, a visually-hidden table of the underlying data is appended for screen readers.

**Sections that use it:** Dashboard (burndown, velocity, sparklines), Portfolio (drill-down charts), Reports (burndown, velocity), People (capacity trends), CRM (forecast confidence bands), Command Centre (trend lines), Finance (P&L charts).

---

### Foundation 2: Saved Views & Filter Persistence (`public/js/nbi-views.js`)

Save, load, and share named filter+sort+grouping+column combinations per section.

**Data model:**

```sql
-- New migration: xxx_user_views.sql
CREATE TABLE user_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  section VARCHAR(50) NOT NULL,        -- 'tasks', 'kanban', 'people', 'leads', 'bugs', 'reports'
  name VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,               -- {filters, sort, columns, groupBy, collapsed}
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,     -- admin-created views visible to all
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, section, name)
);
```

**UI pattern:** A "Views" dropdown button appears next to each section's filter bar.

- Dropdown shows: saved views (user's own), shared views (admin-created), and "Save current view" / "Save as..." options.
- Active view name shows in the dropdown button label.
- Unsaved filter changes show a dot indicator on the button.
- "Save" updates the current view. "Save as..." creates a new one.
- Default view auto-applies when entering a section.
- Delete/rename via right-click or a manage modal.

**Backend:** New routes in a `routes/views.js` file: `GET /api/views?section=X`, `POST /api/views`, `PATCH /api/views/:id`, `DELETE /api/views/:id`.

**Sections that use it:** Tree, Kanban, People, Reports, CRM, Bug Tracker — every section with a filter bar.

---

### Foundation 3: Keyboard Shortcut System (`public/js/nbi-keys.js`)

Extends the existing Cmd+K command palette with per-section shortcuts and a help overlay.

**Registration API:**

```javascript
// Register shortcuts per-view (auto-cleaned on view switch)
registerShortcuts('kanban', [
  { key: 'n',     mod: null,    action: addNewCard,     label: 'New card' },
  { key: 'f',     mod: null,    action: focusSearch,    label: 'Search' },
  { key: '1-5',   mod: null,    action: setWipColumn,   label: 'Jump to column' },
  { key: 'Space', mod: null,    action: selectCard,     label: 'Select card' },
  { key: 'Arrow', mod: null,    action: moveCard,       label: 'Move selected card' },
  { key: 'Enter', mod: null,    action: dropCard,       label: 'Drop card' },
]);
```

**Help overlay:** Press `?` (when not in an input) to open a modal showing all available shortcuts for the current section + global shortcuts. Two-column layout: left column = shortcut key rendering, right column = action description. Categorised by "Navigation", "Editing", "Selection", "View".

**Visual hints:** When holding Cmd/Ctrl, buttons with associated shortcuts show a small key badge (e.g., a tiny "N" badge appears on the "New" button).

**Conflict resolution:** Per-view registrations override globals. Shortcuts are suppressed when focus is in an input/textarea/contenteditable.

---

### Foundation 4: Contextual Help & Onboarding (`public/js/nbi-help.js`)

Three layers:

#### Layer 1: Guided Tour (first login)

A step-through spotlight overlay that introduces WorkSage to new users.

**Implementation:** A sequential array of tour steps. Each step specifies a CSS selector to spotlight, a position for the tooltip (top/bottom/left/right), a title, a description, and an optional action (e.g., "click this button").

**Steps (initial set):**
1. Sidebar — "This is your navigation. Your clients and sections live here."
2. Dashboard — "Your morning view. Blocked items, deadlines, and team standup."
3. Projects (Kanban) — "Drag cards between columns to update status."
4. Gantt — "Your timeline. Drag to reschedule, resize to adjust dates."
5. Command palette — "Press Cmd+K to search anything or navigate quickly."
6. New button — "Create tasks, clients, and leads from here."
7. Theme picker — "Customise the look. 8 themes available."
8. Help button — "Press ? anytime to see keyboard shortcuts and help."

**UI:** Dark overlay with a cutout around the spotlighted element. Tooltip positioned adjacent. "Next" / "Skip tour" buttons. Progress dots at the bottom. Step counter: "3 of 8".

**Storage:** `tour_completed: true` saved in user preferences (server-side). Tour only runs once. Can be re-triggered from Settings > "Restart tour".

#### Layer 2: Setup Wizard (first-time company setup)

A modal wizard flow that runs after the tour (or if skipped, runs instead).

**Steps:**
1. **Company** — name, logo upload, timezone
2. **Team** — invite members by email (batch), set admin/member role
3. **First client** — name, abbreviation, relationship type
4. **First project** — name, type, assign to client

**Each step:** Clean card layout, large inputs, clear labels, "Back" and "Next" buttons. Final step shows a summary and "Get started" button that closes the wizard and navigates to the newly created project.

**Skip:** "I'll set this up later" link at the bottom of every step. Wizard can be re-triggered from Settings.

**Storage:** `setup_completed: true` in user preferences. Wizard only runs once.

#### Layer 3: On-Demand Contextual Help

**Activation:** Press `F1` or click the `?` icon in the header to enter help mode.

**Help mode:** Cursor changes to a help cursor. All interactive elements get a subtle highlight border on hover. Click any element to open a help card.

**Help card:** A modal/popover anchored to the clicked element containing:
- **Title** — what this element is
- **Visual** — an annotated screenshot or diagram showing the element in context
- **Description** — what it does, how to use it (2-3 sentences)
- **Related** — links to related features (e.g., "See also: Saved Views, Keyboard Shortcuts")
- **Shortcut** — if the element has a keyboard shortcut, show it

**Help content storage:** A structured JS object mapping CSS selectors to help card content. Loaded lazily when help mode is activated. Content lives in a `public/js/nbi-help-content.js` file.

**Exit help mode:** Press Escape, click the `?` icon again, or click outside any help card.

---

### Foundation 5: Inline Editing Engine (`public/js/nbi-inline.js`)

Generalises the standup view's bespoke inline editing into a reusable system.

**API:**

```javascript
// Make any element inline-editable
inlineEdit(element, {
  field: 'title',              // Field name for the save callback
  type: 'text',                // 'text' | 'date' | 'select' | 'combobox' | 'number'
  value: currentValue,
  options: [...],              // For select/combobox: [{value, label}]
  onSave: (field, newValue) => {},
  onCancel: () => {},
  placeholder: 'Enter title',
  selectOnFocus: true,         // Auto-select all text on focus
});
```

**Behaviour:**
- **Activate:** Double-click or press Enter on a focused element.
- **Save:** Enter (for single-line), blur, or Tab.
- **Cancel:** Escape restores original value.
- **Tab navigation:** Tab moves to the next editable field in the row. Shift+Tab moves backward.
- **Batch save:** Changes are collected and saved in a single API call when the user moves away from the row or presses a "Save" action.
- **Visual:** Editable fields show a subtle pencil icon on hover (consistent with the existing finance inline-edit pattern). Active editing replaces the display element with the appropriate input type.

**Type-specific editors:**
- `text`: Input with auto-sizing width.
- `date`: Native date input with paste normalisation (already exists in nbi-utils.js).
- `select`: Dropdown with the existing themed select styling.
- `combobox`: Typeahead dropdown (reuses the standup assignee combobox pattern).
- `number`: Input with step increment, min/max validation.

**Sections that use it:** Tree (title, status, assignee, due date, hours), Kanban (card title, assignee), Dashboard (standup fields — migrated from bespoke), People (availability notes), Bug Tracker (title, priority, status).

---

### Foundation 6: Grouping Engine (`public/js/nbi-group.js`)

Group-by capability that works across list, tree, and card layouts.

**API:**

```javascript
// Group a list of items
const groups = groupItems(items, {
  field: 'assignee',           // Field to group by
  sort: 'count-desc',         // Sort groups: 'alpha', 'count-asc', 'count-desc', 'custom'
  emptyLabel: 'Unassigned',   // Label for items with no value in the grouped field
});
// Returns: [{key: 'Glen', label: 'Glen', items: [...], stats: {count, hours, completion%}}]
```

**UI pattern:** A "Group by" dropdown in the filter bar (next to sort). Options: None, Assignee, Status, Priority, Client, Due week, Type. Active grouping shows the field name in the dropdown label.

**Rendering:** Each group gets a collapsible header row showing: group label, item count, aggregate hours, completion percentage bar. Collapse state persists in localStorage.

**Drag between groups:** When grouping is active in Kanban or Board views, dragging a card from one group to another changes the grouped field on that item. E.g., drag from "Glen" group to "Tom" group reassigns the task.

**Swimlane mode (Kanban-specific):** When both status columns AND grouping are active, render as a grid: groups as rows, statuses as columns. Each cell is a drop zone. This is the swimlane pattern from Jira.

**Sections that use it:** Tree (group by assignee/status/priority), Kanban (swimlanes), People (group by team/skill), Bug Tracker (group by priority/assignee).

---

## Part 2: Section Upgrades

### 2.1 Kanban Board (6 → 9)

**Dependencies:** Foundation 5 (inline editing), Foundation 6 (grouping/swimlanes), Foundation 3 (keyboard shortcuts)

| Upgrade | Detail |
|---|---|
| Swimlanes | Group-by dropdown activates swimlane mode via the grouping engine. Assignee, priority, or client as horizontal rows crossing status columns. |
| WIP limits | Per-column limit configurable in settings. Column header shows `count/limit`. Amber at limit, red when over. Stored in `settings` table. |
| Card enhancements | Subtask progress bar (done/total count). Card cover from first image attachment. Priority stripe on left edge (colour matches priority). Due date countdown chip (red when overdue, amber within 3 days). |
| Inline quick-edit | Double-click title to edit in place (inline engine). Click assignee chip to open combobox reassignment without opening detail panel. |
| Keyboard drag | Space to select, Arrow keys to move between columns/rows, Enter to drop. ARIA: `aria-grabbed`, `aria-dropeffect` on cards and columns. |
| Column auto-action | "When moved to Done" auto-sets `end_date` to today. Single rule, stored in settings. Extensible later. |

---

### 2.2 Tree View (6 → 9)

**Dependencies:** Foundation 5 (inline editing), Foundation 6 (grouping), Foundation 2 (saved views), Foundation 3 (keyboard shortcuts)

| Upgrade | Detail |
|---|---|
| Inline title editing | Double-click title to edit. Tab cycles through editable fields in the row: title → status → assignee → due date → hours est. Full row becomes an inline form. |
| Column customisation | Drag-to-reorder column headers. Show/hide via a column picker dropdown. Available columns: title, status, assignee, priority, due date, start date, hours est, hours spent, health, type, client, updated. Persisted via saved views. |
| Grouping | Group-by dropdown: None, Assignee, Status, Priority, Client. Group headers show aggregate stats (count, total hours, completion %). |
| Saved views | Save current filter + sort + columns + grouping as a named view via the views engine. |
| Bulk inline editing | Multi-select rows (existing), then a bulk action bar appears with: Set status, Set assignee, Set priority, Set due date. Applies to all selected. |
| ARIA tree roles | `role="tree"` on container, `role="treeitem"` on rows, `aria-expanded` on parent nodes, `aria-level` indicating depth, `aria-selected` on selected rows. |

---

### 2.3 Dashboard (7 → 9)

**Dependencies:** Foundation 1 (charts)

| Upgrade | Detail |
|---|---|
| Burndown chart | Line/area chart: remaining work (task count or hours) over trailing 30/60/90 days. Data source: `cc_snapshots` table (already captures daily state). Toggle between count and hours. |
| Velocity chart | Bar chart: tasks completed per week for trailing 12 weeks. Grouped by client with stacked bars. Data source: tasks with `end_date` in range. |
| KPI sparklines | Tiny sparkline next to each KPI card showing 30-day trend. Data from snapshot history. Renders inline via sparkline chart type. |
| Widget reordering | Drag-and-drop the dashboard sections (KPI strip, blocked/at-risk, deadlines, workload, standup). Persist order in user preferences (localStorage initially, migrate to server if needed). |
| Quick actions | Top-of-dashboard row: "Add task", "Log time", "Create client" buttons. Single-click access to the most common daily actions. Reduces navigation clicks. |

---

### 2.4 Navigation / Theming (7 → 9)

**Dependencies:** Foundation 3 (keyboard shortcuts), Foundation 4 (help/onboarding)

| Upgrade | Detail |
|---|---|
| Shortcuts help overlay | `?` opens categorised shortcut modal. Global shortcuts + current section shortcuts. Two-column: key rendering (styled kbd elements) + description. |
| Recently viewed | Sidebar section: last 10 entities viewed (tasks, leads, candidates, docs). Stored in localStorage as `[{type, id, title, timestamp}]`. Click to navigate. Auto-prunes to 10. |
| Pinned items | Star icon on task detail, lead detail, candidate detail, document header. Pinned items show in a "Pinned" sidebar section above "Recently viewed". Stored server-side per user (new column on user preferences or a small `user_pins` table). |
| Breadcrumb trail | Persistent bar below header: `Dashboard > Couch Heroes > Sprint 4 > Task-123`. Each segment clickable. Updates on navigation. Shows hierarchy context for deep navigation. |
| Mobile bottom tab bar | Screens < 768px: 5-icon tab bar at bottom (Dashboard, Projects, People, CRM, More). "More" opens the full sidebar as an overlay. Replaces the hamburger pattern for primary navigation. Touch targets 48px+. |

---

### 2.5 Portfolio (7 → 9)

**Dependencies:** Foundation 1 (charts)

| Upgrade | Detail |
|---|---|
| Drill-down | Click KPI card → filters the view below. Click client row → expands inline to show project breakdown (donut chart of statuses, hours burn rate area chart, milestones, risk items). Click project → navigates to tree view filtered to that project. |
| Client health detail | Expanded client row shows: project status donut, hours burn area chart (est vs spent over time), next 3 milestones with countdown, blocked/overdue items list. All from existing data. |
| PDF export | "Export" button renders current portfolio view as branded PDF via pdfkit. Charts rendered as canvas → PNG → embedded in PDF. NBI or client logo in header. Date stamp. |
| Goal indicators | If milestones exist for a client, show a target progress bar alongside the health diamond. Bar fills as tasks toward that milestone complete. |

---

### 2.6 Leads CRM (7 → 9)

**Dependencies:** Foundation 1 (charts), Foundation 2 (saved views)

| Upgrade | Detail |
|---|---|
| Activity timeline enrichment | New backend route `GET /api/leads/:id/emails` calls the Gmail connector library (`~/.claude/connectors/lib/gmail.js`) server-side to fetch recent threads matching the lead's contact email. Returns sanitised results (sender, subject, date, snippet). Frontend displays in activity feed as read-only entries. Cached for 5 minutes to avoid rate limits. Refresh on lead detail open. |
| Follow-up automation | Simple JSON rules in settings: `{trigger: 'no_activity_days', value: 14, action: 'surface_fire'}`. Evaluated by existing cron. Creates Command Centre fire or notification. |
| Forecast confidence bands | Monthly forecast view adds shaded area chart showing optimistic/pessimistic range. Calculated: weighted value ± (1 - probability) * value. Rendered behind the existing bar chart. |
| Stale lead indicators | Cards with no activity for 14+ days get visual decay: desaturation filter, "stale" badge. Threshold configurable in settings. |
| Quick-add | Cmd+K command "New lead" opens minimal lead creation modal from anywhere. |

---

### 2.7 Reports (7 → 9)

**Dependencies:** Foundation 1 (charts)

| Upgrade | Detail |
|---|---|
| Burndown/velocity charts | Embedded in client report view. Burndown: remaining scope per week (line chart). Velocity: throughput per week (bar chart). Scoped to selected client/project. |
| PDF export | "Export PDF" button renders roadmap + charts + portfolio cards as branded PDF. pdfkit backend with report template. Logo, date, client name in header. |
| Scheduled reports | Settings: "Send [report name] to [email list] every [Monday / 1st of month]." New `scheduled_reports` config in settings table. Cron evaluates, generates PDF, attaches to email via existing email infrastructure. |
| ARIA improvements | Roadmap drawers: `aria-expanded`, `role="region"`, `aria-labelledby`. Sort buttons: `aria-sort`. |

---

### 2.8 News Feed (7 → 9)

**Dependencies:** Foundation 3 (keyboard shortcuts)

| Upgrade | Detail |
|---|---|
| Read/unread tracking | IntersectionObserver marks articles read after 3s visibility. Unread: accent left-border. "Mark all read" button. Server-side storage in `news_read_state` table (`user_id, article_id, read_at`). |
| Save for later | Bookmark icon on each card. Saved articles in a "Saved" tab. Stored server-side. |
| Category preferences | Per-user toggle for each news category. Hidden categories filtered from feed. Stored in user preferences. |
| Email digest | Weekly cron: top articles as HTML email to opted-in users. Editorial card layout in email. Uses existing email infrastructure. |
| Related articles | Source drawer footer: 2-3 related articles from same category. Simple keyword matching on title/summary. |

**New migration:**
```sql
CREATE TABLE news_read_state (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  article_id VARCHAR(255) NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  saved BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, article_id)
);
```

---

### 2.9 Command Centre (7 → 9)

**Dependencies:** Foundation 1 (charts), Foundation 3 (keyboard shortcuts)

| Upgrade | Detail |
|---|---|
| Server-Sent Events | New endpoint: `GET /api/sse/command-centre`. Pushes events on task status change, bug filed, fire raised. Client: `EventSource` connection with auto-reconnect. Falls back to polling if SSE drops. |
| Notification sounds | Optional audio ping on new fire/alert. Web Audio API with base64-inlined short samples (chime, ping, alert). Toggle in settings. Respects browser autoplay policy (only plays after first user interaction). |
| Tab customisation | Drag-to-reorder tabs. Hide irrelevant tabs via a tab settings dropdown. Persist in user preferences (localStorage). |
| Fire acknowledgement | "Ack" button on fire rows. Acknowledged fires collapse to a "Seen" section. Prevents alert fatigue while preserving audit trail. |
| Ambient status | Document title updates: `(3) Command Centre — WorkSage`. Favicon badge for fire count (canvas-rendered favicon overlay). |

---

### 2.10 People / Calendar (6 → 9)

**Dependencies:** Foundation 1 (charts), Foundation 5 (inline editing), Foundation 6 (grouping)

| Upgrade | Detail |
|---|---|
| Leave request workflow | "Request time off" button. Creates pending request (uses existing `user_time_off` table). Admin approval/rejection via notification queue. Approved leave auto-creates calendar event. |
| Skills tags | `skills` JSONB column on `users` table (new migration). Editable in settings and person detail. Chips on person cards. Filter roster by skill. |
| Workload levelling | When person is >100% capacity for a week, suggest: "Move [task] to [person] who has capacity." Recommendation only — user clicks to act or dismisses. Calculated from hours est vs available hours. |
| Capacity planning chart | Stacked area chart: team-wide capacity (available hours) vs allocation (assigned hours) over next 8 weeks. Pinch points highlighted in red. Uses chart library. |
| Calendar interactions | Month view: click-and-drag to create multi-day events. Drag existing events to reschedule. Standard calendar patterns. |

---

### 2.11 Client Portal / Docs (6 → 9)

**Dependencies:** Foundation 3 (keyboard shortcuts)

| Upgrade | Detail |
|---|---|
| Version history | Every save creates a version entry. "History" panel: list of versions with timestamp, author, byte-size delta. Click to view rendered version. "Compare" button shows inline diff (added text highlighted green, removed red). "Restore" copies version content to current. |
| Inline comments | Select text → "Comment" button (or Cmd+Shift+C). Highlight with margin annotation. Reply threads. Resolve to dismiss. |
| Document templates | Admin-created template docs (kickoff, status update, retro). "New from template" in tree. Pre-populates structure with placeholder markers. |
| Embed support | Paste YouTube/Vimeo/Loom URL → inline embed via oEmbed resolution. ProseMirror node extension. Falls back to linked text if oEmbed fails. |
| Export | "Export as PDF" (pdfkit with document content) and "Export as Markdown" (convert ProseMirror JSON to markdown) buttons on document header. |

**New migration:**
```sql
CREATE TABLE document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  text_range JSONB,           -- {from, to} character offsets in the document
  resolved BOOLEAN DEFAULT false,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_doc_comments_document ON document_comments(document_id);
```

---

## Part 3: Onboarding System

Covered in Foundation 4 above. Summary of the three layers:

1. **Guided tour** — 8-step spotlight overlay on first login. Skippable. Re-triggerable from Settings.
2. **Setup wizard** — 4-step modal: Company → Team → First client → First project. Runs once.
3. **Contextual help** — F1 or `?` icon enters help mode. Click any element for a help card with title, visual, description, related features, and shortcut.

---

## Implementation Order

The foundations must be built before the section upgrades that depend on them. Within sections, order by user impact.

**Phase 1 — Foundations:**
1. Chart library (most sections depend on it)
2. Inline editing engine (Tree and Kanban depend on it)
3. Grouping engine (Kanban swimlanes and Tree grouping depend on it)
4. Keyboard shortcut system (all sections)
5. Saved views (needs backend route + migration)
6. Contextual help & onboarding (can be built in parallel with section work)

**Phase 2 — Section upgrades (highest impact first):**
1. Dashboard (first thing users see)
2. Kanban (the view they live in)
3. Navigation/Theming (overall product feel)
4. Tree View (power user view)
5. Portfolio (executive view)
6. CRM (sales workflow)
7. Reports (client deliverables)
8. People/Calendar (resource management)
9. Command Centre (operations view)
10. News Feed (awareness)
11. Docs/Client Portal (collaboration)

**Phase 3 — Onboarding:**
- Tour, wizard, and help content authored after all sections are upgraded (content references final UI state)

---

## New Files Summary

| File | Type | Purpose |
|---|---|---|
| `public/js/nbi-charts.js` | Frontend | Chart library (Canvas-based) |
| `public/js/nbi-views.js` | Frontend | Saved views & filter persistence |
| `public/js/nbi-keys.js` | Frontend | Keyboard shortcut system |
| `public/js/nbi-help.js` | Frontend | Onboarding & contextual help engine |
| `public/js/nbi-help-content.js` | Frontend | Help card content (loaded lazily) |
| `public/js/nbi-inline.js` | Frontend | Inline editing engine |
| `public/js/nbi-group.js` | Frontend | Grouping engine |
| `routes/views.js` | Backend | Saved views CRUD API |
| `routes/sse.js` | Backend | Server-Sent Events endpoint |
| `migrations/082_user_views.sql` | Migration | user_views table |
| `migrations/083_news_read_state.sql` | Migration | news_read_state table |
| `migrations/084_document_comments.sql` | Migration | document_comments table |
| `migrations/085_user_skills.sql` | Migration | skills column on users |
| `migrations/086_user_pins.sql` | Migration | pinned items table |

### Pinned Items Schema

```sql
-- migrations/086_user_pins.sql
CREATE TABLE user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL,    -- 'task', 'lead', 'candidate', 'document'
  entity_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,         -- cached display title
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);
CREATE INDEX idx_user_pins_user ON user_pins(user_id);
```

---

## Modified Files Summary

All 16 view files in `public/js/views/` and all 4 domain files in `public/js/domains/` will be modified. Key modifications:

- `nbi-kanban.js` — swimlanes, WIP limits, keyboard drag, card enhancements
- `nbi-tasks.js` — inline editing, column customisation, grouping, ARIA
- `nbi-dashboard.js` — charts, widget reorder, quick actions
- `nbi-sidebar.js` — recently viewed, pinned items, mobile tab bar
- `nbi-leads.js` — activity enrichment, forecast bands, stale indicators
- `nbi-reports.js` — charts, ARIA
- `nbi-news.js` — read tracking, save, preferences
- `nbi-command.js` — extended shortcut registration
- `nbi-people.js` + `nbi-calendar.js` — leave workflow, skills, capacity chart
- `nbi-docs.js` — version history, comments, templates, export
- `dashboard.css` — chart tokens per theme, new component styles
- `nbi_project_dashboard.html` — script tags for new modules, breadcrumb bar, mobile tab bar, onboarding containers
