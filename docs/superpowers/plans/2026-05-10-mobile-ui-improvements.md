# Mobile UI Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WorkSage fully usable and readable on mobile phones (375px-768px) without affecting desktop layout.

**Architecture:** All changes are CSS-only inside `@media (max-width: 768px)` or `@media (max-width: 480px)` blocks, with one JS conditional for reporting timeline layout. Every change targets `nbi_project_dashboard.html`. Desktop layout is completely untouched.

**Tech Stack:** CSS media queries, existing CSS custom properties.

---

### Task 1: Bug Tracker kanban — scroll-snap lanes

**Files:**
- Modify: `nbi_project_dashboard.html` — add CSS rules inside the existing `@media (max-width: 768px)` block at line ~2052

- [ ] **Step 1: Add mobile kanban rules**

Add these rules inside the existing `@media (max-width: 768px)` block that starts at line 2052 (the one that already handles `.bug-tracker__row`):

```css
  .bug-tracker__kanban { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; gap: 0; padding-bottom: 0; }
  .bug-lane { flex: 0 0 calc(100vw - 48px); min-width: calc(100vw - 48px); max-width: calc(100vw - 48px); scroll-snap-align: start; max-height: none; }
```

- [ ] **Step 2: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): bug tracker kanban uses scroll-snap lanes at 768px"
```

---

### Task 2: Hiring kanban — scroll-snap lanes

**Files:**
- Modify: `nbi_project_dashboard.html` — add CSS rules inside the existing `@media (max-width: 768px)` block at line ~2164

- [ ] **Step 1: Add mobile hiring kanban rules**

Add these rules inside the existing `@media (max-width: 768px)` block at line ~2164 (the one that already handles `.candidate-detail-panel`):

```css
  .hiring-kanban { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; gap: 0; padding-bottom: 0; }
  .hiring-lane { flex: 0 0 calc(100vw - 48px); min-width: calc(100vw - 48px); max-width: calc(100vw - 48px); scroll-snap-align: start; max-height: none; }
  .hiring-card { width: auto; }
```

- [ ] **Step 2: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): hiring kanban uses scroll-snap lanes at 768px"
```

---

### Task 3: Detail panels — full width on small phones

**Files:**
- Modify: `nbi_project_dashboard.html` — add a new `@media (max-width: 480px)` block near the existing panel styles

- [ ] **Step 1: Add 480px panel overrides**

Add a new media query block after the existing `@media (max-width: 768px)` block at line ~2061:

```css
@media (max-width: 480px) {
  .detail-panel, .bug-detail-panel, .candidate-detail-panel, .ms-detail-panel, .queue-detail-panel {
    width: 100vw !important; min-width: 0; max-width: 100vw;
  }
}
```

- [ ] **Step 2: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): detail panels go full-width on phones under 480px"
```

---

### Task 4: Portfolio — stack charts, wrap workload names

**Files:**
- Modify: `nbi_project_dashboard.html` — extend the existing `@media (max-width: 900px)` block at line ~551

- [ ] **Step 1: Add portfolio mobile rules**

Add these rules inside the existing `@media (max-width: 900px)` block at line 551:

```css
  .pf__so { flex-direction: column; align-items: stretch; }
  .pf__so-bar { width: 100%; height: 24px; }
  .pf__so-donut { width: 140px; height: 140px; align-self: center; }
  .pf__wl-name { white-space: normal; word-break: break-word; width: auto; min-width: 80px; max-width: 120px; }
```

- [ ] **Step 2: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): portfolio stacks charts vertically, workload names wrap"
```

---

### Task 5: Task tree — stacked rows, wrapping titles

**Files:**
- Modify: `nbi_project_dashboard.html` — add rules to the existing `@media (max-width: 768px)` block at line ~921

- [ ] **Step 1: Add task tree mobile rules**

Add these rules inside the existing `@media (max-width: 768px)` block at line 921 (the one with `.sidebar { display: none; }`):

```css
  .task-row__title { white-space: normal; word-break: break-word; min-width: 0; }
  .task-row__assignee { max-width: none; white-space: normal; }
  .task-row__badges { flex-wrap: wrap; }
  .task-row__hours { min-width: 40px; font-size: 0.7rem; }
  .mytask-row__title { white-space: normal; word-break: break-word; }
  .mytask-row__project { max-width: none; white-space: normal; }
```

- [ ] **Step 2: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): task tree titles and assignees wrap instead of truncate"
```

---

### Task 6: Gantt labels — wrap within 140px

**Files:**
- Modify: `nbi_project_dashboard.html` — find the existing 480px gantt media query

- [ ] **Step 1: Find and update the gantt mobile rule**

The existing rule at line ~934 sets gantt labels to 140px at 768px. Add `white-space: normal; word-break: break-word;` and increase row min-height:

Add to the existing `@media (max-width: 768px)` block at line ~921:

```css
  .gantt__row-label { white-space: normal !important; word-break: break-word; line-height: 1.3; padding-top: 4px; padding-bottom: 4px; }
  .gantt__row { min-height: 40px; }
  .gantt__bar { font-size: 0; }
```

The `font-size: 0` on `.gantt__bar` hides the bar text labels on mobile (they overlap at small sizes). The colour-coded bar itself remains visible.

- [ ] **Step 2: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): gantt labels wrap, bar text hidden at 768px"
```

---

### Task 7: Standup/tactical rows — two-line wrap

**Files:**
- Modify: `nbi_project_dashboard.html` — add to the existing 768px tactical media query at line ~434

- [ ] **Step 1: Update tactical mobile rules**

The existing rule at line ~434 already handles `.tactical-grid`. Extend that same `@media (max-width: 768px)` block:

```css
  .standup-task__title { white-space: normal; word-break: break-word; min-width: 0; flex-basis: 100%; }
  .standup-task__row { flex-wrap: wrap; }
  .standup-inline { font-size: 0.75rem; }
  .standup-inline--select { max-width: none; }
  .tactical-item__title { white-space: normal; word-break: break-word; }
  .tactical-item__assignee { max-width: none; white-space: normal; }
```

Setting `flex-basis: 100%` on the title forces it to take the full row, pushing the inline controls to a second line.

- [ ] **Step 2: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): standup rows wrap to two lines at 768px"
```

---

### Task 8: Reporting timeline — simplified mobile layout

**Files:**
- Modify: `nbi_project_dashboard.html` — add CSS at 768px and a JS conditional in the `renderReportingView` function

- [ ] **Step 1: Add reporting mobile CSS**

Add a new `@media (max-width: 768px)` block after the existing reporting CSS (after line ~605):

```css
@media (max-width: 768px) {
  .reporting__row { flex-wrap: wrap; min-height: auto; }
  .reporting__cell { font-size: 0.75rem; padding: 4px 8px; }
  .reporting__cell--title { flex-basis: calc(100% - 160px); min-width: 0; white-space: normal; word-break: break-word; }
  .reporting__cell--owner-mobile { display: none; }
  .reporting__timeline, .reporting__timeline-hdr { min-width: 0; flex-basis: 100%; height: 36px; }
  .reporting__row--hdr .reporting__timeline-hdr { height: auto; }
  .reporting__select { min-width: 120px; font-size: 0.75rem; }
  .reporting__hdr { flex-wrap: wrap; gap: 8px; }
  .reporting__hdr-pickers { flex-wrap: wrap; gap: 6px; }
  .reporting__pills { gap: 12px; }
  .reporting__pill-block { min-width: 60px; }
}
```

- [ ] **Step 2: Adjust JS column widths for mobile**

In the `renderReportingView` function (around line ~10679), change the column widths to be responsive. Find:

```javascript
const labelW = 280, ownerW = 100, statusW = 90, pctW = 60, rightPanelW = labelW + ownerW + statusW + pctW;
```

Replace with:

```javascript
const isMobile = window.innerWidth <= 768;
const labelW = isMobile ? 140 : 280, ownerW = isMobile ? 0 : 100, statusW = isMobile ? 70 : 90, pctW = isMobile ? 45 : 60, rightPanelW = labelW + ownerW + statusW + pctW;
```

- [ ] **Step 3: Hide owner column on mobile**

In the same function, find the header row owner cell (around line ~10685):

```javascript
html += `<div class="reporting__cell" style="width:${ownerW}px">OWNER</div>`;
```

Replace with:

```javascript
html += `<div class="reporting__cell" style="width:${ownerW}px;${ownerW === 0 ? 'display:none' : ''}">OWNER</div>`;
```

And find the data row owner cell (around line ~10728):

```javascript
html += `<div class="reporting__cell" style="width:${ownerW}px;color:var(--text-secondary)">${esc(ownerOf(f))}</div>`;
```

Replace with:

```javascript
html += `<div class="reporting__cell" style="width:${ownerW}px;${ownerW === 0 ? 'display:none' : ''}color:var(--text-secondary)">${esc(ownerOf(f))}</div>`;
```

- [ ] **Step 4: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): reporting timeline hides owner column, shrinks widths at 768px"
```

---

### Task 9: Font size bump on mobile

**Files:**
- Modify: `nbi_project_dashboard.html` — add to the existing 768px media query at line ~921

- [ ] **Step 1: Add font size minimum**

Add to the existing `@media (max-width: 768px)` block at line ~921:

```css
  body { font-size: 0.85rem; }
  .reporting__cell, .standup-task__title, .task-row__title, .mytask-row__title, .bug-card__title,
  .hiring-card, .tactical-item__title, .pf__tbl td, .risk-list__col,
  .expense-card__desc, .cal__task { font-size: max(0.78rem, inherit); }
```

- [ ] **Step 2: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): bump minimum font size to 0.78rem for readability"
```

---

### Task 10: Touch targets — 44px minimum

**Files:**
- Modify: `nbi_project_dashboard.html` — add to the existing 768px media query at line ~921

- [ ] **Step 1: Add touch target sizing**

Add to the existing `@media (max-width: 768px)` block at line ~921:

```css
  .btn, .sidebar__item, .filter-chip, .standup-inline, .bug-tracker__view-toggle button,
  .hiring-view-toggle button, .leads-select, .reporting__select,
  .tab, .task-subview-toggle button, .board__depth-btn { min-height: 44px; }
  .tab { padding: 10px 14px; }
  .board__depth-btn { padding: 8px 14px; }
```

- [ ] **Step 2: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): enforce 44px minimum touch target on interactive elements"
```

---

### Task 11: Calendar — readable at 480px

**Files:**
- Modify: `nbi_project_dashboard.html` — add/extend the 480px media query

- [ ] **Step 1: Add calendar mobile rules**

Add a new `@media (max-width: 480px)` block (or extend an existing one) near the calendar CSS:

```css
@media (max-width: 480px) {
  .cal__grid { grid-template-columns: repeat(7, 1fr); gap: 0; }
  .cal__cell { min-height: 48px; padding: 2px; }
  .cal__date { font-size: 0.65rem; }
  .cal__task { font-size: 0.65rem; padding: 1px 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cal__day-header { font-size: 0.6rem; padding: 4px 2px; }
  .cal__nav-btn { padding: 6px 12px; min-height: 44px; }
}
```

- [ ] **Step 2: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): calendar cells tighter at 480px, touch-friendly nav"
```

---

### Task 12: People calendar roster — larger touch targets

**Files:**
- Modify: `nbi_project_dashboard.html` — extend the existing 480px people calendar rules

- [ ] **Step 1: Add roster touch target rules**

Find the existing 480px people calendar rules and add/extend:

```css
@media (max-width: 480px) {
  .people-cal__roster-cell { height: 32px; min-width: 32px; max-width: 32px; }
  .people-cal__grid-chip { padding: 4px 8px; font-size: 0.72rem; min-height: 28px; }
  .people-cal__roster-name { min-width: 80px; font-size: 0.72rem; }
}
```

- [ ] **Step 2: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): people calendar roster cells larger for touch at 480px"
```

---

### Task 13: Safe-area padding for notched iPhones

**Files:**
- Modify: `nbi_project_dashboard.html` — add `env(safe-area-inset-*)` padding

- [ ] **Step 1: Add safe-area CSS**

Add these rules at the end of the main CSS section (before `</style>`), outside any media query since they only apply when `env()` is supported:

```css
/* Notched iPhone safe areas */
@supports (padding-top: env(safe-area-inset-top)) {
  .g-header { padding-left: max(var(--space-xl), env(safe-area-inset-left)); padding-right: max(var(--space-xl), env(safe-area-inset-right)); }
  .main__content { padding-bottom: env(safe-area-inset-bottom); }
  .sidebar.mobile-open { padding-top: env(safe-area-inset-top); padding-left: env(safe-area-inset-left); }
}
```

Also add the viewport meta tag if not already present. Find the existing viewport meta tag and ensure it includes `viewport-fit=cover`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

- [ ] **Step 2: Restart PM2 and verify**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(mobile): safe-area padding for notched iPhones"
```

---

## Execution Notes

- **All changes are additive CSS** — they go inside media query blocks and cannot affect desktop layout.
- **Tasks 1-3 are Priority 1** (broken on mobile). Do these first.
- **Tasks 4-8 are Priority 2** (hard to read). Core mobile readability pass.
- **Tasks 9-12 are Priority 3** (polish). Sizing and touch target improvements.
- **Task 13 is Priority 4** (nice to have). Notched iPhone support.
- **One file throughout**: `nbi_project_dashboard.html`.
- **Testing**: After each task, restart PM2 (`pm2 restart nbi-dashboard`) and verify on Glen's iPhone. Desktop should be checked too to confirm no regression — resize browser window above 768px.
- **Batch commits by priority** is acceptable since all changes are in the same file and tightly scoped.
