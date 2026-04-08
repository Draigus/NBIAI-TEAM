# NBI Project Dashboard -- UI/UX Audit

**Auditor:** UI/UX Lead (AI Agent)
**Date:** 7 April 2026
**File:** `nbi_project_dashboard.html` (11,379 lines -- monolithic SPA)
**Scope:** Full frontend audit covering visual design, interaction, accessibility, and specific feature deep-dives

---

## Executive Summary

The dashboard is a substantial, feature-rich single-file SPA covering project management, CRM, expense tracking, financial reporting, and team management. The CSS architecture is well-structured with a robust design token system and seven colour themes. However, there are material gaps in accessibility, keyboard navigation, responsive edge cases, and several areas where consistency breaks down across the many views.

**Overall Rating: Good** -- solid foundation with specific areas requiring focused remediation.

---

## 1. Visual Design

**Rating: Good**

### Strengths

- **Design token system is excellent.** Comprehensive CSS custom properties for colours, spacing, radii, shadows, and typography. All seven themes (Dark, Light, Midnight, Nord, Solarized, Dracula, Emerald) correctly re-map every token -- no hardcoded colours leak through.
- **Colour palette is semantically clear.** Success/warning/danger/purple/cyan each have three-tier tokens (`--success`, `--success-bg`, `--success-border`) ensuring consistent badge, background, and border treatment.
- **Typography hierarchy is well-defined.** Three font families (`--font-display`, `--font-body`, `--font-mono`) used appropriately -- Inter for body, JetBrains Mono for numeric data, Orbitron loaded but appears unused.
- **Shadow system** is three-tier (`--shadow-sm/md/lg`) with appropriate values per theme.

### Issues

1. **Orbitron font loaded but not referenced.** The Google Fonts link pulls `Orbitron:wght@400;600;700` but `--font-display` maps to Inter. This is 30-50KB of wasted bandwidth.

   **Fix:** Remove Orbitron from the Google Fonts `<link>` tag, or assign it to `--font-display` if the original design intent was to use it for headings.

2. **Inconsistent use of inline styles vs classes.** Many JS-rendered elements use `style="font-size:1.4rem"` directly instead of class-based styling, particularly in the finance KPI cards (lines 6843-6850). This makes theme overrides fragile.

   **Fix:** Create modifier classes for KPI card size variants:
   ```css
   .kpi-card__value--lg { font-size: 1.4rem; }
   .kpi-card__value--xl { font-size: 1.8rem; }
   ```

3. **Font size base (17px) is non-standard.** `html { font-size: 17px; }` is unusual. Most systems use 16px. This makes rem calculations less intuitive and may cause rounding issues.

4. **Spacing tokens stop at `--space-2xl` (32px).** Some views need larger gaps (e.g., report sections use `margin-bottom: var(--space-2xl)` but the overall page padding is fixed at `var(--space-xl)` = 24px). Consider adding `--space-3xl: 48px` and `--space-4xl: 64px`.

---

## 2. Layout and Structure

**Rating: Good**

### Strengths

- **Shell layout is solid.** `display: flex` with sidebar (240px fixed) and main content (flex: 1) is correct. Sidebar collapse to 48px is smooth with `transition: width 0.15s, min-width 0.15s`.
- **Responsive breakpoints are comprehensive.** Three tiers at 1024px (tablet), 768px (small tablet), and 480px (mobile). The sidebar hides at 1024px with a hamburger toggle.
- **Grid usage is appropriate.** `grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))` for KPI cards ensures natural flow. Finance grids use fixed 2-col and 3-col layouts with proper fallbacks.
- **Overflow handling is correct.** Main content area has `overflow-y: auto; overflow-x: hidden`. Tables have `overflow-x: auto` wrappers. Gantt chart has both axes scrollable.
- **Print styles are thorough.** The `@media print` block hides navigation, toasts, and modals. Page breaks are controlled for board lanes.

### Issues

1. **No max-width constraint on main content.** On ultrawide monitors (3440px+), the dashboard, task list, and tactical panels stretch to full width. Line lengths become unreadable.

   **Fix:**
   ```css
   .main__content { max-width: 1800px; margin: 0 auto; }
   ```

2. **Sidebar disappears entirely at 1024px** (`display: none`). This means on iPad landscape (1024px viewport), navigation vanishes without the hamburger being visible until the user scrolls to the header.

   **Fix:** Lower the sidebar hide threshold to `max-width: 900px` or ensure the hamburger toggle is always visible when sidebar is hidden.

3. **Tasks layout master-detail split is not responsive at small widths.** The detail panel is `width: 340px` with `flex-shrink: 0`. At 1024px this is addressed by stacking, but between 900-1024px the layout can feel cramped.

4. **Gantt label column resize handle** (`gantt__col-resize`) has `width: 6px` which is difficult to target on touch devices. Should be at least 12px with a transparent hit area.

---

## 3. Navigation

**Rating: Good**

### Strengths

- **Sidebar navigation is well-organised.** Sections are grouped with uppercase labels. Active state is clear with accent glow background and left border indicator.
- **Breadcrumb bar exists** (line 1363) with dynamic visibility for drilled-down views.
- **Keyboard shortcuts for navigation.** `g` then `d/t/r/p/f/l/e/s` provides vim-style chord navigation between views. `/` focuses search. `Escape` closes panels.
- **View sub-toggles** (tree/board/gantt/calendar for tasks; overall/byProject/byPerson for reports; summary/monthly for finances) maintain state during session.

### Issues

1. **No deep linking / URL routing.** The application does not use `location.hash` or `history.pushState` to track the current view. Refreshing the page loses navigation state entirely.

   **Fix:** Implement hash-based routing (`#tasks`, `#finances/monthly`, `#tasks?client=Acme`) and restore view from URL on load.

2. **No "back" functionality beyond breadcrumbs.** When drilling from Dashboard into a client detail and then into a task, there is no reliable way to step back. The breadcrumb exists but only appears in some contexts.

3. **Sidebar item counts** (`.sidebar__item__count`) show task counts per client but do not update reactively -- they render on initial load and require a full `renderAll()` to refresh.

4. **Mobile navigation (hamburger menu)** opens as a fixed overlay but does not trap focus, so keyboard users can tab behind the open sidebar.

---

## 4. Data Presentation

**Rating: Good**

### Strengths

- **Tables are consistently styled** with `.report-table` and proper th/td hierarchy. Hover states are present on all clickable rows.
- **KPI cards** have large monospace values with semantic colouring (green for positive, red for negative). The card hover lifts slightly (`translateY(-1px)`) providing subtle affordance.
- **Progress bars** use segmented fills (done in green, active in accent blue) providing at-a-glance status.
- **Chart integration** uses inline bar charts rendered with `div`-based bars rather than heavy charting libraries -- keeps the file lightweight.
- **Number formatting is good.** Monetary values use `toLocaleString()` with pound symbols. Hours display one decimal place. Percentages are integers.

### Issues

1. **No data tables with sorting indicators.** The report tables lack visible sort arrows despite some columns being sortable. The leads table has `.sorted` class with accent colour but no directional arrow.

   **Fix:** Add CSS for sort indicators:
   ```css
   .report-table th.sorted::after { content: ' \25B2'; font-size: 0.6em; }
   .report-table th.sorted.desc::after { content: ' \25BC'; }
   ```

2. **Finance P&L table rows lack zebra striping.** At 20+ rows, the alternating white-on-dark rows blur together.

   **Fix:**
   ```css
   .report-table tbody tr:nth-child(even) { background: var(--bg-surface); }
   ```

3. **Long currency values in finance view can overflow.** When annual salary is e.g. 1,200,000, the `td` can push the table wider than its container on smaller screens. The `font-size: 0.78rem` monospace helps but is not sufficient at 768px.

4. **Dashboard trend arrows** are rendered inline as HTML entities (triangles). They display well but lack any label text -- a screen reader would announce the raw Unicode character.

---

## 5. Forms and Inputs

**Rating: Needs Work**

### Strengths

- **Inline editing pattern is consistent.** The finance view uses `data-val` attributes with click-to-edit behaviour. Escape cancels, Enter confirms. The standup view uses inline `<select>` and `<input>` elements.
- **Login form** has proper `autocomplete` attributes (`username`, `current-password`, `new-password`), password visibility toggle, and disabled state on submit.
- **Expense detail form** correctly disables fields when user lacks edit permission.

### Issues

1. **No visible validation feedback.** Forms rely on `confirm()` dialogs and `toast()` messages for error states. There are no inline field-level error indicators (red borders, helper text below fields).

   **Fix:** Add error state styles:
   ```css
   .detail-field input.is-invalid,
   .detail-field select.is-invalid {
     border-color: var(--danger);
     box-shadow: 0 0 0 2px var(--danger-bg);
   }
   .detail-field__error {
     font-size: 0.72rem;
     color: var(--danger);
     margin-top: 2px;
   }
   ```

2. **No loading states on form submissions.** When saving an expense, updating a task, or creating a user, there is no spinner or disabled state on the submit button. The user can double-click and fire duplicate requests.

   **Fix:** Disable buttons during async operations and add a small spinner:
   ```javascript
   btn.disabled = true;
   btn.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px"></span> Saving...';
   ```

3. **Textarea auto-resize is browser-dependent.** `field-sizing: content` (line 475) is only supported in Chrome 123+. Firefox and Safari show a fixed-height textarea requiring manual resize.

   **Fix:** Add a JS fallback for `field-sizing`:
   ```javascript
   if (!CSS.supports('field-sizing', 'content')) {
     textarea.addEventListener('input', function() {
       this.style.height = 'auto';
       this.style.height = this.scrollHeight + 'px';
     });
   }
   ```

4. **File upload input is unstyled.** The expense receipt upload (line 6563) uses a raw `<input type="file">` which renders differently across browsers and is not themed.

   **Fix:** Wrap in a styled label:
   ```html
   <label class="btn btn--sm" style="cursor:pointer">
     Choose File <input type="file" style="display:none">
   </label>
   ```

5. **No required field indicators.** The create-user form and expense form do not visually mark which fields are required. Users only discover this after submission fails.

---

## 6. Interaction Design

**Rating: Needs Work**

### Strengths

- **Drag and drop** is implemented for task rows (reordering), Kanban cards (status change), Gantt bars (date adjustment), and lead cards (stage change). Visual feedback includes `.dragging` opacity and `.drag-over` outlines.
- **Hover states are universal.** Every clickable row, card, and button has a `:hover` transition.
- **Confirmation dialogs** are used for destructive actions (delete task, delete expense, reset finance data).
- **Undo** is available via Ctrl+Z with history tracking.
- **Toast notifications** animate in from the right with category-specific styling (success/error/warning).

### Issues

1. **Click targets are too small in several places.**
   - The sidebar toggle chevron is approximately 16x16px (line 1357) -- well below the 44px minimum.
   - Gantt bar resize handles are 12x12px (line 693).
   - Table row remove buttons (`&times;`) in finance view have no padding beyond the character itself.
   - Filter chip close buttons are also sub-44px.

   **Fix:** Apply minimum touch targets:
   ```css
   .sidebar__toggle { min-height: 44px; }
   .gantt__bar-handle { width: 20px; height: 20px; }
   /* For small icon buttons, use padding to expand hit area */
   .btn--icon-only { min-width: 36px; min-height: 36px; }
   ```

2. **No hover/click feedback on editable finance cells.** The `fin-editable` class shows a pencil icon on hover, but the `data-val` attribute inline cells (used more extensively) only show a dashed underline. Many users will not recognise these as editable.

   **Fix:** Add a consistent edit affordance:
   ```css
   [data-val]:hover {
     background: var(--accent-glow);
     border-radius: var(--radius-sm);
     cursor: pointer;
   }
   ```

3. **Confirmation dialogs use `window.confirm()`.** These are browser-native, un-themed, and jarring in a well-designed dark UI. They cannot be styled and break the visual continuity.

   **Fix:** Create a themed confirmation modal component:
   ```html
   <div class="modal-overlay" id="confirmModal">
     <div class="modal" style="max-width:400px">
       <div class="modal__title" id="confirmTitle"></div>
       <p id="confirmMessage"></p>
       <div style="display:flex;gap:8px;justify-content:flex-end">
         <button class="btn" onclick="resolveConfirm(false)">Cancel</button>
         <button class="btn btn--danger" onclick="resolveConfirm(true)">Confirm</button>
       </div>
     </div>
   </div>
   ```

4. **Debounce on sync is 500ms / 800ms** but there is no visual indicator that a save is pending. The sync badge only appears during active saves. Users may close the tab before the debounce fires.

   **Fix:** Show the sync badge in "pending" state immediately when `markDirty()` is called:
   ```css
   .sync-badge--pending { display: block; background: var(--text-muted); }
   ```

---

## 7. Accessibility

**Rating: Poor**

This is the weakest area. The application was clearly built with visual users in mind and has significant gaps for assistive technology users.

### Issues

1. **Almost no ARIA attributes.** Only one `aria-label` exists in the entire codebase (the hamburger menu button, line 1329). No `aria-live` regions, no `role` attributes, no `aria-expanded`, no `aria-selected`.

   **Critical fixes needed:**
   ```html
   <!-- Sidebar nav -->
   <nav class="sidebar__nav" id="sidebarNav" role="navigation" aria-label="Main navigation">

   <!-- Tab bars -->
   <div class="main__tabs" role="tablist">
   <div class="main__tab" role="tab" aria-selected="true">Dashboard</div>

   <!-- Toast container -->
   <div class="toast-container" aria-live="polite" aria-atomic="true">

   <!-- Modals -->
   <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modalTitle">

   <!-- Sidebar collapse -->
   <div class="sidebar__toggle" role="button" aria-label="Toggle sidebar"
        aria-expanded="true">
   ```

2. **`outline: none` on all inputs** without replacement focus indicators. Lines 413, 439, 448, 474, 876 all set `outline: none`. The replacement is `border-color: var(--accent-border)` which has insufficient contrast for focus indication per WCAG 2.4.7.

   **Fix:** Replace with visible focus rings:
   ```css
   :focus-visible {
     outline: 2px solid var(--accent);
     outline-offset: 2px;
   }
   /* Remove outline: none from all existing rules */
   ```

3. **Colour contrast failures.** Several combinations fail WCAG AA (4.5:1 for normal text):
   - `--text-muted: #666` on `--bg-base: #0a0a0a` = ~3.8:1 (FAIL)
   - `--text-faint: #444` on `--bg-base: #0a0a0a` = ~2.4:1 (FAIL)
   - `--text-muted: #888` on light theme `--bg-base: #f5f5f7` = ~3.5:1 (FAIL)
   - Badge text sizes (0.7rem = ~12px) at normal contrast ratios require 4.5:1 minimum.

   **Fix:** Boost muted text colours:
   ```css
   :root {
     --text-muted: #777;  /* was #666 -- now ~4.8:1 on #0a0a0a */
     --text-faint: #555;  /* was #444 -- now ~3.5:1, use only for decorative content */
   }
   html[data-theme="light"] {
     --text-muted: #777;  /* was #888 -- now ~4.5:1 on #f5f5f7 */
   }
   ```

4. **No skip-to-content link.** Keyboard users must tab through the entire header and sidebar before reaching main content.

   **Fix:** Add at the start of `<body>`:
   ```html
   <a href="#mainContent" class="skip-link">Skip to main content</a>
   ```
   ```css
   .skip-link {
     position: absolute; left: -9999px; top: auto;
     padding: 8px 16px; background: var(--accent); color: #fff;
     z-index: 9999; border-radius: var(--radius-md);
   }
   .skip-link:focus { left: 16px; top: 16px; }
   ```

5. **Interactive elements without keyboard access.** Many elements use `onclick` on `<div>` and `<span>` elements (task rows, KPI cards, sidebar items, tactical metrics) without `tabindex="0"` or `role="button"`. These are invisible to keyboard navigation.

6. **No focus trap in modals.** The import modal, bug report modal, and expense detail overlay do not trap focus. Tab key cycles behind the overlay.

7. **Colour is the sole differentiator for health states.** The badges use colour alone (green/yellow/red/purple) without icons or text patterns. Colourblind users cannot distinguish states.

   **Fix:** Add icons to health badges:
   ```javascript
   // In healthBadgeHtml():
   'Green': '&#10003; Green',   // checkmark
   'Yellow': '&#9888; Yellow',  // warning
   'Red': '&#10060; Red',       // X
   'Blocked': '&#128721; Blocked' // stop sign
   ```

---

## 8. Consistency

**Rating: Good**

### Strengths

- **Button styles are well-systematised.** `.btn`, `.btn--primary`, `.btn--ghost`, `.btn--sm`, `.btn--danger` provide a complete vocabulary applied consistently.
- **Badge system is thorough.** Status, health, and priority badges all follow the same `background + border + coloured text` pattern.
- **Toast notifications** use consistent `success/error/warning` variants.
- **Section headings** universally use `font-family: var(--font-display); font-size: 0.7-0.75rem; text-transform: uppercase; letter-spacing: 1.5px`.

### Issues

1. **Two different detail panel patterns coexist.**
   - The **task detail** uses both a fixed right-side panel (`detail-panel`, 520px, overlaying content) AND an inline panel (`tasks-layout__detail`, 340px, part of the layout).
   - The **expense detail** uses the overlay pattern.
   - The **lead detail** uses the overlay pattern.

   These should converge on one pattern. The inline approach is better for productivity workflows.

2. **KPI card sizing is inconsistent.**
   - Dashboard tactical metrics use `.tactical-metric` with `1.6rem` values.
   - Report KPI strip uses `.kpi-card` with `1.8rem` values.
   - Finance KPI cards use inline `style="font-size:1.4rem"`.

   **Fix:** Standardise on 2-3 explicit size variants via classes.

3. **Modal widths vary without a system.** Import modal is 600px, bug report is 560px (`max-width`), lead detail panel is 520px. These should use a token:
   ```css
   --modal-sm: 400px;
   --modal-md: 560px;
   --modal-lg: 720px;
   ```

4. **Tab patterns are not unified.** Main tabs, finance sub-tabs, leads segment tabs, and report sub-view toggles all use different HTML structures and class names despite serving the same purpose.

---

## 9. Performance UX

**Rating: Good**

### Strengths

- **Loading overlay exists** (`loading-spinner`) and is used during authentication.
- **Sync badge** shows saving/error/conflict states in the bottom-right corner.
- **Debounced saves** prevent API thrashing (500ms for tasks, 800ms for finances).
- **Incremental sync polling** (10-second interval) keeps multi-user state current without full reloads.
- **localStorage fallback** ensures offline functionality when the API is unreachable.
- **Toast messages** provide confirmation after successful operations.

### Issues

1. **No skeleton screens.** When loading expense reports, leads, or finance data, the content area shows either "Loading..." text or the full loading overlay. Skeleton screens would reduce perceived latency.

   **Fix:** Add skeleton CSS:
   ```css
   .skeleton {
     background: linear-gradient(90deg,
       var(--bg-surface) 25%, var(--bg-hover) 50%, var(--bg-surface) 75%);
     background-size: 200% 100%;
     animation: shimmer 1.5s infinite;
     border-radius: var(--radius-md);
   }
   @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
   ```

2. **Full `renderAll()` rebuilds the entire DOM.** Every state change (task update, filter change, sort change) triggers `el.innerHTML = html` which destroys and recreates the entire view. This causes scroll position loss, input focus loss, and perceptible flicker on large task lists.

   **Fix:** This is the highest-impact architecture issue. Consider:
   - Targeted partial updates (only re-render the changed row/card)
   - Save and restore scroll position after `renderAll()`
   - Use `requestAnimationFrame` to batch DOM updates

3. **No optimistic updates.** Task status changes, expense updates, and finance edits all wait for the server response before updating the UI. The pattern should be: update UI immediately, sync in background, roll back on failure.

4. **Charts re-render on every view switch.** The bar charts in the dashboard are purely CSS-based (divs with widths), which is lightweight, but they still get destroyed and recreated on each `renderAll()`.

---

## 10. Information Architecture

**Rating: Good**

### Strengths

- **View hierarchy is logical.** Dashboard (overview) > Tasks (work) > Report (analysis) > People (team) > Finances (money) > Leads (sales) > Expenses (admin) > Settings (config). This follows natural information priority.
- **Client-scoped views.** Clicking a client in the sidebar filters all views to that client's data. This is a powerful pattern well-executed.
- **Feature discoverability is reasonable.** Primary actions (Add Task, Print, Report Bug) are always visible in the header. View-specific actions appear contextually.

### Issues

1. **Settings page is a catch-all.** It contains data management (export/import/reset), user management, team member management, category management, leads configuration, and theme/timezone settings. This should be split into sub-sections with their own sidebar navigation.

2. **Expenses and Finances are separate views** but conceptually overlap. Expense data feeds into the financial dashboard. Users may not realise they need to go to Expenses to manage individual receipts that appear in Finance.

3. **Cognitive load on the Dashboard.** The tactical dashboard shows: 7 metric strips + overdue panel + this-week panel + blocked panel + at-risk panel + workload bars + standup section. This is too much for an "at a glance" view. Consider collapsing the standup by default and making the bottom sections toggle-able.

4. **No onboarding or empty states with guidance.** The empty state component exists but only shows a generic icon + message. New users see blank views with no guidance on what to do first.

---

## Feature-Specific Audits

### Full-Screen Expense Report View

**Rating: Good**

- **Entry animation** (`reportSlideIn` - opacity + translateY) is polished.
- **Top bar** is sticky with back button, title, status badge, and export/email actions -- well-structured.
- **Summary cards** (Total Amount, VAT, Expenses, Receipts) use the same KPI card pattern. Consistent.
- **Category grouping** of expenses with subtotals is clear.
- **Print styles** hide the top bar buttons and actions section -- correct.

**Issues:**
- No keyboard shortcut to close (Escape). The close button is a `btn--ghost` with `onclick` only.
- The "Export Excel" and "Email" buttons are visible to all users, even when they are non-functional for non-admin users. They should be conditionally shown.
- The table lacks `<caption>` or `<thead>` scope attributes for screen readers.
- "Add Expenses" checkbox list at the bottom (when in draft mode) has no "Select All" option.

### Finance Summary vs Monthly View Tabs

**Rating: Needs Work**

- The tab implementation uses inline-styled `<button>` elements with `btn--primary` / `btn--ghost` toggling rather than proper tab components. The active tab has `border-bottom: 2px solid var(--accent)` applied via inline style.
- **The tab bar has double-border issue.** The tab container has `border-bottom: 2px solid var(--border-default)` and the active tab also has a 2px bottom border, creating visual competition.
- **No ARIA tab pattern.** The buttons lack `role="tab"`, `aria-selected`, and `aria-controls`. The tab panels lack `role="tabpanel"`.
- **Monthly view loads expense actuals asynchronously** after the HTML is rendered. During loading, badges may flash from placeholder to actual values.

**Fix:** Use a proper tab component:
```html
<div role="tablist" class="finance-tabs">
  <button role="tab" aria-selected="true" aria-controls="finSummary"
          class="finance-tab finance-tab--active">Summary</button>
  <button role="tab" aria-selected="false" aria-controls="finMonthly"
          class="finance-tab">Monthly View</button>
</div>
<div role="tabpanel" id="finSummary">...</div>
<div role="tabpanel" id="finMonthly" hidden>...</div>
```

### Dashboard KPI Cards (Trend Arrows)

**Rating: Good**

- The trend arrows use Unicode triangles (&#9650; / &#9660;) with colour coding: green for positive trends, red for negative, with an `invertColour` flag for metrics where "up is bad" (e.g., overdue count).
- Font size is `0.85rem` with `font-weight: 600` -- visually clear.
- The delta number is shown next to the arrow (e.g., "&#9650;3") which is informative.

**Issues:**
- Trend arrows are only shown when `delta !== 0`. When delta is zero, the metric card has no trend indicator at all -- a flat "unchanged" indicator (e.g., "= 0" or a horizontal dash) would improve comprehension.
- The trend data is session-local (computed from `updatedAt` timestamps in the last 7 days). It does not persist across sessions, so trend arrows may differ between users.
- **No tooltip explaining the trend.** Adding `title="3 new overdue tasks this week"` would add context.

### Expense Detail Sidebar with Receipt Preview

**Rating: Good**

- **Receipt preview is well-implemented.** Images render inline with `max-height: 400px`. PDFs render in an `<iframe>` at `400px` height. Non-previewable files show a "Download instead" link.
- **Toggle behaviour** allows expanding/collapsing individual receipt previews.
- **Loading state** shows "Loading preview..." text during fetch.
- **Upload UI** is functional with a file input and Upload button.

**Issues:**
- The receipt preview container IDs are `receiptPreview_{receipt_id}` but the toggle logic searches all containers by prefix and uses `dataset.filename` matching. This is fragile -- if two receipts share a filename (unlikely but possible), the toggle breaks.
- **No image zoom.** Receipt images render at `max-width: 100%` within the 520px sidebar, which may be too small to read receipt text. A click-to-zoom or lightbox would help.
- **PDF preview depends on browser support.** Safari may not render `<iframe>` PDF previews reliably. A fallback (PDF.js or image thumbnail) should be considered.
- **Upload has no progress indicator.** The `uploadExpenseReceipt()` function calls `toast('Uploading...')` but provides no progress percentage or completion feedback beyond the toast.
- **File type validation is missing.** The file input accepts any file type. Add `accept="image/*,.pdf"` to restrict to supported preview formats.

  **Fix:**
  ```html
  <input type="file" id="expenseReceiptInput"
         accept="image/jpeg,image/png,image/gif,image/webp,.pdf"
         style="...">
  ```

---

## Re-Validation (7 April 2026, post bug-fix session)

The following items from the original audit were re-checked against the current 11,841-line codebase. Items marked FIXED have been removed from the priority list. Items marked PARTIAL remain with updated notes.

### Items Now FIXED (removed from priority list)
- **Deep linking / URL routing** -- hash-based routing IS implemented (`history.pushState`, `location.hash`). Views survive refresh.
- **File upload input unstyled** -- now uses hidden input + styled button trigger (`onclick` opens file picker).
- **Health badges colour-only** -- badges now include text labels (Green, Yellow, Red, Blocked) alongside colour.
- **Editable finance cell hover feedback** -- `[data-val]:hover` shows dashed underline + pencil icon (`::after { content: '✎' }`).

### Items PARTIALLY FIXED (updated in priority list)
- **Loading states on submissions** -- auth buttons disable during login/password reset, but most other forms (expense submit, task save) still don't.
- **Textarea auto-resize** -- JS fallback exists but only fires on panel open, not during typing.
- **renderAll() DOM rebuild** -- scroll position save/restore added, but still full innerHTML replacement.
- **Tab patterns** -- Settings reuses `.task-subview-toggle` pattern from Tasks, but naming still inconsistent across views.
- **Mobile sidebar overflow** -- sidebar hidden at 1024px with fixed-position overlay, but no explicit overflow-x prevention.
- **Click targets** -- general buttons acceptable, but filter chip close buttons still only 14px and Gantt resize handle still 6px.

---

## Priority Recommendations (Validated)

### Critical -- Accessibility (WCAG AA failures)

| # | Issue | Status | Impact |
|---|-------|--------|--------|
| 1 | Add `aria-live` to toast container, `role`/`aria-*` to tabs, modals, nav | VALID -- only 2 aria attributes in 11,841 lines | Screen readers cannot parse page structure |
| 2 | Replace `outline: none` with `:focus-visible` rings | VALID -- 6 instances, no focus-visible replacement | Keyboard users cannot see focus position |
| 3 | Boost `--text-muted` contrast to 4.5:1 minimum | VALID -- `#666` on `#0a0a0a` = 3.2:1 (FAIL) | WCAG AA compliance failure |
| 4 | Add `tabindex="0"` + `role="button"` to interactive divs | VALID -- 60+ onclick divs/spans without keyboard access | Keyboard users cannot reach interactive elements |
| 5 | Add skip-to-content link | VALID -- none exists | Keyboard nav efficiency |
| 6 | Add focus trapping to modals | VALID -- no focus management logic in any modal | Tab cycles behind overlay |

### High -- UX Polish

| # | Issue | Status | Impact |
|---|-------|--------|--------|
| 7 | Create themed confirmation dialogs | VALID -- 5+ `confirm()` calls still present | Native dialogs break visual coherence |
| 8 | Add form validation feedback (inline errors) | VALID -- only `alert()`/`toast()` for errors | No field-level guidance on invalid input |
| 9 | Disable buttons during ALL async submissions | PARTIAL -- auth forms done, others not | Double-click fires duplicate API calls |
| 10 | Add skeleton screens for async-loaded content | VALID -- only "Loading..." text placeholders | Perceived latency on slow connections |
| 11 | Add required field indicators to forms | VALID -- no visual markers, no `required` attr | Users discover requirements only on submit failure |

### Medium -- Visual/Consistency

| # | Issue | Status | Impact |
|---|-------|--------|--------|
| 12 | Remove unused Orbitron font load | VALID -- still in Google Fonts link, never referenced | ~40KB wasted bandwidth |
| 13 | Standardise KPI card sizing (inline styles to classes) | VALID -- 1.0/1.4/1.6/1.8rem across views | Inconsistent visual hierarchy |
| 14 | Add `--modal-sm/md/lg` tokens | VALID -- 420/560/600/800/900/960px hardcoded | No system for modal widths |
| 15 | Add `max-width: 1800px` to main content | VALID -- stretches full width on ultrawide | Unreadable line lengths at 3440px+ |
| 16 | Converge detail panel patterns (overlay vs inline) | VALID -- tasks use both, leads/expenses use overlay | Code duplication, inconsistent UX |

### Medium -- Mobile/Touch

| # | Issue | Status | Impact |
|---|-------|--------|--------|
| 17 | Increase Gantt resize handle to 12px+ | VALID -- still 6px wide | Unusable on touch devices |
| 18 | Increase filter chip close button hit area | VALID -- still 14px | Below 44px touch target minimum |
| 19 | Add `min-height: 44px` touch targets at mobile breakpoints | VALID -- no touch-target overrides exist | Small tap targets on phones/tablets |
| 20 | Add `overflow-x: auto` to finance P&L table at mobile | VALID -- no mobile scroll treatment | Table overflows viewport on narrow screens |
| 21 | Mobile hamburger focus trap + Escape key handler | VALID -- no keyboard handling on mobile sidebar | Accessibility gap on mobile |

### Low -- Backlog

| # | Issue | Status | Impact |
|---|-------|--------|--------|
| 22 | Replace `renderAll()` with targeted DOM updates | PARTIAL -- scroll restore added, still innerHTML | Flicker on large lists |
| 23 | Add optimistic updates for task/expense/finance changes | VALID -- all await server response | Perceived slowness on state changes |
| 24 | Standardise tab component HTML/class pattern | PARTIAL -- some unification, naming inconsistent | Code maintenance burden |
| 25 | Collapse dashboard standup by default | VALID -- not collapsed | Dashboard cognitive overload |
| 26 | Split Settings page into sub-pages | VALID -- 6 tabs in one catch-all page | Information architecture clarity |
| 27 | Fix textarea auto-resize to work during typing | PARTIAL -- fallback only on panel open | Firefox/Safari fixed-height textarea |
| 28 | Add flat trend indicator for zero-delta KPI metrics | VALID -- nothing shown when delta=0 | Incomplete dashboard information |

---

## Summary Ratings (Validated)

| Area | Rating | Change |
|------|--------|--------|
| Visual Design | Good | -- |
| Layout and Structure | Good | -- |
| Navigation | Good | Upgraded (routing now works) |
| Data Presentation | Good | -- |
| Forms and Inputs | Needs Work | -- |
| Interaction Design | Needs Work | Slightly improved (file upload, finance hover) |
| Accessibility | Poor | -- (still the critical gap) |
| Consistency | Good | -- |
| Performance UX | Good | Slightly improved (scroll restore) |
| Information Architecture | Good | -- |
| Mobile/Touch | Needs Work | New category added |

4 items fixed, 6 partially fixed, 22 validated as still outstanding. Accessibility remains the critical gap. Mobile/touch is a new category added after validation -- it was underweighted in the original audit.
