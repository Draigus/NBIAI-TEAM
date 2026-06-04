# Scroll Architecture Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all JS scroll workarounds and establish a pure CSS flex-based scroll architecture across every view in the dashboard.

**Architecture:** The CSS flex chain (shell > sidebar/main > content) already has the correct properties. The problem is JS functions that override those properties with pixel values on every render. We delete the JS, add CSS `:has()` rules to switch `#mainContent` between scroll modes based on which view is rendered, and fix two view containers that use `height: 100%` instead of `flex: 1`.

**Tech Stack:** CSS flexbox, CSS `:has()` selector, Playwright for verification.

**File:** `nbi_project_dashboard.html` (single monolithic file — all changes are here)

---

### Task 1: CSS — Add `:has()` rules for split-pane views

**Files:**
- Modify: `nbi_project_dashboard.html:338-340` (CSS section)

- [ ] **Step 1: Add the `:has()` rules after the existing `.main__content:has(> .docs)` rule**

At line 340, the existing rule is:
```css
.main__content:has(> .docs) { overflow: hidden; display: flex; flex-direction: column; padding: 0; }
```

Replace line 340 with this consolidated block:

```css
.main__content:has(> .docs),
.main__content:has(> .tasks-view),
.main__content:has(> .cc-page) { overflow: hidden; display: flex; flex-direction: column; padding: 0; }
```

The `.main__content:has(.pf)` rule at line 339 already sets `padding: 8px`. Add the flex/overflow override for `.pf` too — but with `padding: 8px` instead of `padding: 0`:

After the consolidated rule, add:
```css
.main__content:has(> .pf) { overflow: hidden; display: flex; flex-direction: column; }
```

This keeps the existing `padding: 8px` from line 339 while adding the flex column + overflow hidden.

- [ ] **Step 2: Verify the CSS is syntactically correct**

Read lines 338-342 of the file to confirm the rules are in the right place and don't break the cascade.

---

### Task 2: CSS — Fix `.tasks-view` to use `flex: 1` instead of `height: 100%`

**Files:**
- Modify: `nbi_project_dashboard.html:796`

- [ ] **Step 1: Replace the `.tasks-view` rule**

Current (line 796):
```css
.tasks-view { display: flex; flex-direction: column; height: 100%; }
```

Replace with:
```css
.tasks-view { display: flex; flex-direction: column; flex: 1; min-height: 0; }
```

`height: 100%` doesn't work in a flex column parent — the parent's height is determined by flex, not a fixed value, so `100%` of an intrinsic height is meaningless. `flex: 1; min-height: 0` is the correct way to say "fill remaining space and allow shrinking below content height."

---

### Task 3: CSS — Fix `.pf` to use `flex: 1` instead of `height: 100%`

**Files:**
- Modify: `nbi_project_dashboard.html:441`

- [ ] **Step 1: Replace the `.pf` rule**

Current (line 441):
```css
.pf { width: 100%; padding: 0; display: flex; flex-direction: column; gap: 12px; height: 100%; min-height: 0; overflow: hidden; }
```

Replace with:
```css
.pf { width: 100%; padding: 0; display: flex; flex-direction: column; gap: 12px; flex: 1; min-height: 0; overflow: hidden; }
```

Only change: `height: 100%` becomes `flex: 1`. The `min-height: 0` is already there.

- [ ] **Step 2: Verify the `@media (max-width: 900px)` override at line 553**

Read line 553:
```css
.pf { overflow-y: auto; height: auto; }
```

Change to:
```css
.pf { overflow-y: auto; flex: none; }
```

On small screens, the portfolio stacks vertically and scrolls as a single column. `flex: none` replaces `height: auto` (which was the counterpart to the old `height: 100%`).

---

### Task 4: CSS — Fix `.cc-page` for flex containment

**Files:**
- Modify: `nbi_project_dashboard.html:2629`

- [ ] **Step 1: Update the `.cc-page` rule**

Current (line 2629):
```css
.cc-page { padding: 8px 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
```

Replace with:
```css
.cc-page { padding: 8px 0; flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
```

The CC page is a single-column scroll inside a flex parent. `flex: 1; min-height: 0` lets it fill available space and scroll its own content. We keep `overflow-y: auto` because the CC page manages its own vertical scroll (it's not a split-pane with separate scroll containers).

---

### Task 5: JS — Delete `fixScrollHeights()` and all call sites

**Files:**
- Modify: `nbi_project_dashboard.html` — lines ~5448-5510 and ~22529-22543

- [ ] **Step 1: Remove `fixScrollHeights()` call from `renderContent()`**

Current around line 5448-5451:
```javascript
  if (_perfEnd - _perfStart > 100) {
    console.debug('[Perf] renderContent took ' + Math.round(_perfEnd - _perfStart) + 'ms');
  }
  fixScrollHeights();
}
```

Remove the `fixScrollHeights();` line. The closing `}` stays.

- [ ] **Step 2: Remove `fixScrollHeights()` call from `renderAll()`**

Current around line 5468-5471:
```javascript
  if (_perfEnd - _perfStart > 100) {
    console.debug('[Perf] renderAll took ' + Math.round(_perfEnd - _perfStart) + 'ms');
  }
  fixScrollHeights();
}
```

Remove the `fixScrollHeights();` line. The closing `}` stays.

- [ ] **Step 3: Delete the entire `fixScrollHeights()` function**

Delete lines 5473-5510 (the function definition through closing `}`):
```javascript
function fixScrollHeights() {
  requestAnimationFrame(() => {
    ...entire function body...
  });
}
```

- [ ] **Step 4: Clean up the resize listener**

Current (lines 22529-22543):
```javascript
window.addEventListener('resize', () => {
  checkTabOverflow();
  fixScrollHeights();
  const pf = document.querySelector('.pf');
  if (pf && currentView === 'dashboard') {
    if (window.matchMedia('(max-height: 850px)').matches) {
      pf.style.height = '';
    } else {
      const top = pf.getBoundingClientRect().top;
      const contentEl = document.getElementById('mainContent');
      const padBot = contentEl ? parseFloat(getComputedStyle(contentEl).paddingBottom) || 0 : 0;
      pf.style.height = (window.innerHeight - top - padBot) + 'px';
    }
  }
});
```

Replace with:
```javascript
window.addEventListener('resize', () => {
  checkTabOverflow();
});
```

The `fixScrollHeights()` call is gone (function deleted). The `.pf` height hack is gone (CSS flex handles it). Only `checkTabOverflow()` remains — it manages the tab bar gradient indicator and is unrelated to scroll.

---

### Task 6: JS — Delete per-view height hacks

**Files:**
- Modify: `nbi_project_dashboard.html` — three locations

- [ ] **Step 1: Remove the `.tasks-layout` height hack from `renderTaskView()`**

Current (lines 7186-7193):
```javascript
  // Size the tasks-layout to fill remaining viewport (same pattern as portfolio view)
  requestAnimationFrame(() => {
    const layout = el.querySelector('.tasks-layout');
    if (layout) {
      const top = layout.getBoundingClientRect().top;
      layout.style.height = (window.innerHeight - top) + 'px';
    }
  });
```

Delete these 7 lines entirely. The CSS `flex: 1; min-height: 0` on `.tasks-view` and `.tasks-layout` handles this.

- [ ] **Step 2: Remove the `.pf` height hack from `renderDashboard()`**

Current (lines 5577-5589):
```javascript
  requestAnimationFrame(() => {
    const pf = el.querySelector('.pf');
    if (pf) {
      if (window.matchMedia('(max-height: 850px)').matches) {
        pf.style.height = '';
        return;
      }
      const top = pf.getBoundingClientRect().top;
      const contentEl = document.getElementById('mainContent');
      const padBot = contentEl ? parseFloat(getComputedStyle(contentEl).paddingBottom) || 0 : 0;
      pf.style.height = (window.innerHeight - top - padBot) + 'px';
    }
  });
```

Delete these 12 lines entirely. The CSS `flex: 1; min-height: 0` on `.pf` handles this.

- [ ] **Step 3: Remove the `.cc-page` height hack from `renderCommandCentre()`**

Current (lines 19683-19687):
```javascript
    const ccEl = document.querySelector('.cc-page');
    if (ccEl) {
      const top = ccEl.getBoundingClientRect().top;
      ccEl.style.height = (window.innerHeight - top - 8) + 'px';
    }
```

Delete these 5 lines. The surrounding `requestAnimationFrame` callback still has the SVG circle animation code (`document.querySelectorAll('.cc-ring__fill').forEach(...)`) — keep that, just remove the height hack. The result should be:

```javascript
  requestAnimationFrame(() => {
    document.querySelectorAll('.cc-ring__fill').forEach(circle => {
      const target = circle.getAttribute('data-target');
      if (target) circle.style.strokeDashoffset = target;
    });
  });
```

---

### Task 7: Run unit tests

- [ ] **Step 1: Run vitest**

Run: `cd dashboard-server && npm test`

Expected: 396/396 passing. This change is CSS + JS deletion in the HTML file — no server logic touched. Tests should be unaffected.

- [ ] **Step 2: Commit the changes**

```
git add nbi_project_dashboard.html
git commit -m "refactor(scroll): replace all JS height workarounds with CSS flex chain

Root cause: --vh-full was self-referential (fixed earlier today), making
.shell height:auto. JS workarounds (fixScrollHeights + per-view rAF hacks)
were layered on top to compensate. Now that --vh-full is fixed, the CSS
flex chain works natively.

Changes:
- Delete fixScrollHeights() and all 3 call sites
- Delete per-view height hacks in renderTaskView, renderDashboard, renderCommandCentre
- Delete .pf height recalc from resize listener
- Add :has() rules for split-pane views (tasks, portfolio, CC)
- Fix .tasks-view and .pf: flex:1 instead of height:100%
- Add flex:1 to .cc-page for flex containment

One scroll pattern everywhere: parent overflow:hidden, fixed children
flex-shrink:0, scroll child flex:1 + min-height:0 + overflow-y:auto.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Playwright verification — sidebar and split-pane views

- [ ] **Step 1: Write a Playwright diagnostic script that checks scroll dimensions**

Create a Node.js script that loads the page via the e2e test infrastructure (test port 8889), logs in as a test admin, and checks:

1. **Sidebar**: `#sidebarNav` has `scrollHeight > clientHeight` when enough items exist (inject 40 fake items if needed), and `overflow-y` computed to `auto`
2. **Tasks view**: switch to tasks, verify `.tasks-layout__main` has `overflow-y: auto` and correct height, verify `.tasks-layout__detail` same
3. **Portfolio**: switch to dashboard, verify `.pf` has correct flex sizing, `.pf__panel-body` elements scroll
4. **No inline height styles**: verify `#sidebarNav`, `#mainContent`, `.tasks-layout`, `.pf` have NO inline `style.height` set (proving the JS hacks are gone)

- [ ] **Step 2: Run the verification**

Run: `cd dashboard-server && node tests/e2e/scroll-verify.js`

Expected: All checks pass. No inline height styles. All scroll containers have correct computed overflow.

- [ ] **Step 3: Restart PM2 and verify live**

Run: `npx pm2 restart nbi-dashboard`

Report to Glen: sidebar, tasks split-pane, portfolio, CC, and single-scroll views (settings, people, etc.) all need manual verification at worksage.nbi-consulting.com. Hard refresh required.

---

### Task 9: Update session log and live state

- [ ] **Step 1: Update session log**

Append to `projects/nbi_dashboard/session_logs/2026-05-14_session.md` with the scroll architecture redesign summary.

- [ ] **Step 2: Update work_completed.md**

Append the scroll architecture redesign entry.

- [ ] **Step 3: Update pending_tasks.md**

Mark the scroll fix as complete with the full architectural solution, not just the `--vh-full` variable fix.
