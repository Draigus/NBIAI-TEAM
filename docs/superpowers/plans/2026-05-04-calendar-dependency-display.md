# Calendar Dependency Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggle-based dependency mode to the Calendar sub-view that highlights prerequisites and dependents when a task is clicked.

**Architecture:** DOM manipulation approach. A toggle button enables dep mode; clicking a task chip applies CSS highlight classes and injects floating labels onto related chips. No re-render on interaction. Highlights are naturally cleaned on month navigation.

**Tech Stack:** Vanilla JS, CSS classes, existing delegation system in `nbi_project_dashboard.html`

---

### Task 1: CSS Classes for Dependency Highlights

**Files:**
- Modify: `nbi_project_dashboard.html:1089-1091` (after `.cal__task--overdue` rule)

- [ ] **Step 1: Add dependency highlight CSS rules**

Insert after line 1091 (`.cal__task--overdue { border-left: 2px solid var(--danger); }`):

```css
.cal__task { position: relative; }
.cal__task--dep-selected { box-shadow: 0 0 0 2px var(--accent) !important; z-index: 2; }
.cal__task--dep-blocks { box-shadow: 0 0 0 2px var(--warning) !important; z-index: 2; }
.cal__task--dep-needs { box-shadow: 0 0 0 2px var(--success) !important; z-index: 2; }
.cal__dep-label { position: absolute; top: -12px; right: -2px; font-size: 0.55rem; padding: 1px 5px; border-radius: 8px; color: #fff; white-space: nowrap; pointer-events: none; z-index: 3; line-height: 1.3; }
.cal__dep-label--blocks { background: var(--warning); }
.cal__dep-label--needs { background: var(--success); }
.cal__dep-toggle { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-muted); font-size: 0.78rem; cursor: pointer; transition: all 0.15s; }
.cal__dep-toggle:hover { border-color: var(--accent-border); color: var(--text-primary); }
.cal__dep-toggle--active { background: var(--accent); color: #fff; border-color: var(--accent); }
.cal__dep-banner { display: flex; gap: 8px; padding: 4px 12px; font-size: 0.72rem; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-sm); margin-top: 4px; flex-wrap: wrap; align-items: center; }
.cal__dep-banner a { color: var(--accent-text); text-decoration: underline; cursor: pointer; }
```

- [ ] **Step 2: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(cal): add CSS classes for dependency highlight mode"
```

---

### Task 2: State Variables and Toggle Button

**Files:**
- Modify: `nbi_project_dashboard.html:~3352` (near other calendar state vars like `_calShowOthers`)
- Modify: `nbi_project_dashboard.html:~7036` (calendar nav bar, after "Show events from others" label)

- [ ] **Step 1: Add state variables**

Find the block near line 3352 where `taskSubView` is declared. Add nearby (with other calendar state):

```javascript
let _calDepMode = false;
let _calDepSelected = null;
```

- [ ] **Step 2: Add toggle button to calendar nav**

In `renderCalendarView()`, after the "Show events from others" checkbox label (around line 7038), insert:

```javascript
  html += `<button class="cal__dep-toggle ${_calDepMode ? 'cal__dep-toggle--active' : ''}" data-action="_actToggleCalDepMode" title="Toggle dependency highlighting">&#128279; Dependencies</button>`;
```

- [ ] **Step 3: Add the toggle action function**

In the delegated action wrappers section (near line 2762, alongside other `_actCal*` functions), add:

```javascript
function _actToggleCalDepMode() { _calDepMode = !_calDepMode; if (!_calDepMode) calDepClear(); renderContent(); }
```

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(cal): add dependency mode toggle button and state"
```

---

### Task 3: Click Interception in openDetail

**Files:**
- Modify: `nbi_project_dashboard.html:8970` (top of `openDetail` function)

- [ ] **Step 1: Add dep-mode interception at top of openDetail**

At line 8970, modify `openDetail` to intercept when dep mode is active on the calendar:

```javascript
function openDetail(id) {
  if (_calDepMode && currentView === 'tasks' && taskSubView === 'calendar') {
    calDepSelectTask(id);
    return;
  }
  activeDetailTaskId = id;
```

This prevents the detail panel from opening when in dependency mode on the calendar view. Instead it routes to the highlight function (Task 4).

- [ ] **Step 2: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(cal): intercept task clicks in dependency mode"
```

---

### Task 4: Highlight and Clear Functions

**Files:**
- Modify: `nbi_project_dashboard.html` — add new functions after `renderCalendarView` (after line ~7107)

- [ ] **Step 1: Implement calDepClear function**

```javascript
function calDepClear() {
  _calDepSelected = null;
  document.querySelectorAll('.cal__task--dep-selected, .cal__task--dep-blocks, .cal__task--dep-needs').forEach(el => {
    el.classList.remove('cal__task--dep-selected', 'cal__task--dep-blocks', 'cal__task--dep-needs');
  });
  document.querySelectorAll('.cal__dep-label').forEach(el => el.remove());
  const banner = document.getElementById('calDepBanner');
  if (banner) banner.remove();
}
```

- [ ] **Step 2: Implement calDepSelectTask function**

```javascript
function calDepSelectTask(id) {
  if (_calDepSelected === id) { calDepClear(); return; }
  calDepClear();
  _calDepSelected = id;

  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const prereqs = task.dependencies || [];
  const dependents = tasks.filter(t => t.dependencies && t.dependencies.includes(id)).map(t => t.id);

  if (prereqs.length === 0 && dependents.length === 0) {
    toast('No dependencies for this task');
    _calDepSelected = null;
    return;
  }

  // Highlight the selected task
  document.querySelectorAll(`.cal__task[data-arg0="${id}"]`).forEach(el => {
    el.classList.add('cal__task--dep-selected');
  });

  // Highlight prerequisites (things that block the selected task)
  let offMonthPrereqs = 0;
  prereqs.forEach(pid => {
    const els = document.querySelectorAll(`.cal__task[data-arg0="${pid}"]`);
    if (els.length === 0) { offMonthPrereqs++; return; }
    els.forEach(el => {
      el.classList.add('cal__task--dep-blocks');
      el.insertAdjacentHTML('beforeend', '<span class="cal__dep-label cal__dep-label--blocks">blocks</span>');
    });
  });

  // Highlight dependents (things the selected task enables)
  let offMonthDeps = 0;
  dependents.forEach(did => {
    const els = document.querySelectorAll(`.cal__task[data-arg0="${did}"]`);
    if (els.length === 0) { offMonthDeps++; return; }
    els.forEach(el => {
      el.classList.add('cal__task--dep-needs');
      el.insertAdjacentHTML('beforeend', '<span class="cal__dep-label cal__dep-label--needs">needs this</span>');
    });
  });

  // Off-month banner
  if (offMonthPrereqs > 0 || offMonthDeps > 0) {
    calDepShowOffMonthBanner(id, prereqs, dependents, offMonthPrereqs, offMonthDeps);
  }
}
```

- [ ] **Step 3: Implement off-month banner**

```javascript
function calDepShowOffMonthBanner(selectedId, prereqs, dependents, offPrereqCount, offDepCount) {
  const nav = document.querySelector('.cal__nav');
  if (!nav) return;
  let html = '<div class="cal__dep-banner" id="calDepBanner">';
  if (offPrereqCount > 0) {
    html += `<span>${offPrereqCount} prerequisite${offPrereqCount > 1 ? 's' : ''} on other months: `;
    prereqs.forEach(pid => {
      if (document.querySelector(`.cal__task[data-arg0="${pid}"]`)) return;
      const t = tasks.find(x => x.id === pid);
      if (!t) return;
      const dateStr = t.dueDate || t.endDate || t.startDate;
      if (!dateStr) return;
      const d = safeParseDate(dateStr);
      if (!d) return;
      html += `<a onclick="_calYear=${d.getFullYear()};_calMonth=${d.getMonth()};_calEventsKey='';renderContent();setTimeout(()=>calDepSelectTask('${selectedId}'),100)">${esc(t.title)}</a> `;
    });
    html += '</span>';
  }
  if (offDepCount > 0) {
    html += `<span>${offDepCount} dependent${offDepCount > 1 ? 's' : ''} on other months: `;
    dependents.forEach(did => {
      if (document.querySelector(`.cal__task[data-arg0="${did}"]`)) return;
      const t = tasks.find(x => x.id === did);
      if (!t) return;
      const dateStr = t.dueDate || t.endDate || t.startDate;
      if (!dateStr) return;
      const d = safeParseDate(dateStr);
      if (!d) return;
      html += `<a onclick="_calYear=${d.getFullYear()};_calMonth=${d.getMonth()};_calEventsKey='';renderContent();setTimeout(()=>calDepSelectTask('${selectedId}'),100)">${esc(t.title)}</a> `;
    });
    html += '</span>';
  }
  html += '</div>';
  nav.insertAdjacentHTML('afterend', html);
}
```

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(cal): implement dependency highlight and clear logic"
```

---

### Task 5: Deselect on Empty Space Click

**Files:**
- Modify: `nbi_project_dashboard.html` — add click listener for deselection

- [ ] **Step 1: Add deselect handler**

Add after the `calDepShowOffMonthBanner` function:

```javascript
document.addEventListener('click', function(e) {
  if (!_calDepMode || !_calDepSelected) return;
  if (e.target.closest('.cal__task') || e.target.closest('.cal__dep-toggle') || e.target.closest('.cal__dep-banner')) return;
  if (e.target.closest('.cal')) calDepClear();
});
```

This clears the highlight when clicking empty calendar space, but not when clicking a task chip (handled by `openDetail` interception), the toggle button, or the off-month banner links.

- [ ] **Step 2: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(cal): deselect dependency highlight on empty space click"
```

---

### Task 6: Integration Test

**Files:**
- Modify: `nbi_project_dashboard.html` — verify end-to-end

- [ ] **Step 1: Run full test suite**

```bash
cd dashboard-server && npm test
```

Expected: 340 tests pass (no server changes, purely client-side feature).

- [ ] **Step 2: Run e2e tests**

```bash
cd dashboard-server && npm run test:e2e
```

Expected: All e2e tests pass (no existing test covers the calendar dep mode, so no regressions expected).

- [ ] **Step 3: Manual verification checklist**

Verify at https://worksage.nbi-consulting.com:
1. Navigate to Projects > Calendar view
2. "Dependencies" toggle button visible in nav bar
3. Click toggle — it highlights active (accent colour)
4. Click a task that has dependencies — selected task gets blue ring, prerequisites get orange ring + "blocks" label, dependents get green ring + "needs this" label
5. Click same task again — all highlights clear
6. Click a task with no dependencies — toast "No dependencies for this task"
7. Navigate to a different month — highlights clear (natural re-render)
8. Toggle dep mode off — highlights clear
9. With dep mode off, clicking a task opens the detail panel normally

- [ ] **Step 4: Final commit (if any tweaks needed)**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(cal): polish dependency display after manual testing"
```
