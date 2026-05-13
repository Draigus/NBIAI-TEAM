# Portfolio v4 Dead Code Cleanup + Command Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all dead code left over from portfolio v3/v4 transition in `nbi_project_dashboard.html`, and add the Command theme to the THEMES array.

**Architecture:** All changes are in a single file (`nbi_project_dashboard.html`, ~22,500 lines). No new logic is introduced — this is pure deletion plus one array entry addition. The dead code consists of: one action handler, three global variables, three Gantt zoom/nav functions, three dead render functions (~310 lines total), two `pf__sidebar` scroll-preservation references, and three commented-out v3 function stubs. The Command theme entry is a single new object in the THEMES array.

**Tech Stack:** Vanilla HTML/JS (inline), no build step. Edits are direct string replacements.

**Current state (as of plan creation):** `_actSetPortfolioBottomExpanded` on line 2873 has already been deleted. All other items below are still present and need to be removed.

---

### Task 1: Delete three dead global variables

**Files:**
- Modify: `nbi_project_dashboard.html` — lines ~3023–3025

The three variables `_portfolioBottomAttentionExpanded`, `_pfGanttDayWidth`, and `_pfGanttOffsetDays` are no longer referenced anywhere after the v4 portfolio refactor. They sit together on three consecutive lines.

- [ ] **Step 1: Delete the three dead globals**

Find and remove these three lines (they are consecutive):
```javascript
let _portfolioBottomAttentionExpanded = false;
let _pfGanttDayWidth = 12;
let _pfGanttOffsetDays = 0;
```
The line before them is `let _portfolioLeadCount = null;` and the line after is `let _milestonesCache = {};`.

- [ ] **Step 2: Verify with grep**

Run: `grep -n "_portfolioBottomAttentionExpanded\|_pfGanttDayWidth\|_pfGanttOffsetDays" nbi_project_dashboard.html`

Expected: zero matches (or only the grep command itself in output). If any matches remain, delete those references too.

---

### Task 2: Delete three dead Gantt action functions

**Files:**
- Modify: `nbi_project_dashboard.html` — lines ~3117–3120

`pfGanttZoom`, `pfGanttNav`, and `pfGanttToday` were action handlers for v3 Gantt zoom/navigation controls that no longer exist in the DOM or are called anywhere.

- [ ] **Step 1: Delete the three Gantt functions**

Find and remove these three lines (they are consecutive, with a blank line after):
```javascript
function pfGanttZoom(delta) { _pfGanttDayWidth = Math.max(6, Math.min(40, _pfGanttDayWidth + delta)); renderContent(); }
function pfGanttNav(days) { _pfGanttOffsetDays += days; renderContent(); }
function pfGanttToday() { _pfGanttOffsetDays = 0; renderContent(); }
```
The line before is `}` (close of `selectPortfolioClient`) and the line after the blank is `let _scrollRestoreTarget = null;`.

- [ ] **Step 2: Verify with grep**

Run: `grep -n "pfGanttZoom\|pfGanttNav\|pfGanttToday" nbi_project_dashboard.html`

Expected: zero matches.

---

### Task 3: Delete `.pf__sidebar` scroll-preservation code in `renderContent`

**Files:**
- Modify: `nbi_project_dashboard.html` — `renderContent` function (~line 5096)

The `.pf__sidebar` element no longer exists in the portfolio v4 DOM. Two lines capture its scroll position and two lines restore it inside a `requestAnimationFrame`. They are dead weight and produce silent no-ops (the `querySelector` returns null, so the restore branch never fires — but the capture and restore code still runs on every render).

Current `renderContent` function:
```javascript
function renderContent() {
  const _perfStart = performance.now();
  const content = document.getElementById('mainContent');
  if (!content) return;
  const savedScroll = content.scrollTop;
  const pfSidebar = content.querySelector('.pf__sidebar');           // DELETE
  const savedPfSidebarScroll = pfSidebar ? pfSidebar.scrollTop : 0; // DELETE
  _renderMainContent(content);
  requestAnimationFrame(() => {
    content.scrollTop = savedScroll;
    const newPfSidebar = content.querySelector('.pf__sidebar');      // DELETE
    if (newPfSidebar) newPfSidebar.scrollTop = savedPfSidebarScroll; // DELETE
  });
  const _perfEnd = performance.now();
  if (_perfEnd - _perfStart > 100) {
    console.debug('[Perf] renderContent took ' + Math.round(_perfEnd - _perfStart) + 'ms');
  }
}
```

- [ ] **Step 1: Remove the four sidebar-specific lines**

After deletion the function should read:
```javascript
function renderContent() {
  const _perfStart = performance.now();
  const content = document.getElementById('mainContent');
  if (!content) return;
  const savedScroll = content.scrollTop;
  _renderMainContent(content);
  requestAnimationFrame(() => {
    content.scrollTop = savedScroll;
  });
  const _perfEnd = performance.now();
  if (_perfEnd - _perfStart > 100) {
    console.debug('[Perf] renderContent took ' + Math.round(_perfEnd - _perfStart) + 'ms');
  }
}
```

- [ ] **Step 2: Verify with grep**

Run: `grep -n "pf__sidebar" nbi_project_dashboard.html`

Expected: zero matches.

---

### Task 4: Delete three commented-out v3 function stubs

**Files:**
- Modify: `nbi_project_dashboard.html` — three separate single-line comment blocks

These are marker comment lines (two-line blocks: the COMMENTED OUT label + the function stub) left from the v3→v4 transition. They serve no purpose now that the code is in git history.

- [ ] **Step 1: Delete the v3 Work Completed stub (two lines)**

Find and remove:
```javascript
// COMMENTED OUT — v3 Work Completed (replaced by v4 Progress Status donut)
// function renderPfWorkCompleted() { /* ... see git history ... */ }
```

- [ ] **Step 2: Delete the v3 Health Scorecard stub (two lines)**

Find and remove:
```javascript
// COMMENTED OUT — v3 Client Health Scorecard (replaced by v4 Upcoming Milestones)
// function renderPfHealthScorecard(filtered, roots, now) { /* ... see git history ... */ }
```

- [ ] **Step 3: Delete the v3 Needs Attention stub (two lines)**

Find and remove:
```javascript
// COMMENTED OUT — v3 Needs Attention main panel (moved to bottom row in v4)
// function renderPfNeedsAttention(panelTasks, now) { /* ... see git history ... */ }
```

- [ ] **Step 4: Verify with grep**

Run: `grep -n "renderPfWorkCompleted\|renderPfHealthScorecard\|renderPfNeedsAttention" nbi_project_dashboard.html`

Expected: zero matches.

---

### Task 5: Delete `renderPfTimeline` function (~280 lines)

**Files:**
- Modify: `nbi_project_dashboard.html` — starts at line ~5823

This is the largest deletion. The function begins with `function renderPfTimeline(panelTasks, panelRoots, now) {` and ends at the closing `}` before `function renderPfCompletingSoon`. It is ~280 lines of HTML-string-building for the v3 Gantt timeline that was replaced by a different renderer in v4.

To find the exact end: search for the pattern `^function renderPfUpcomingMilestones` — `renderPfTimeline` ends on the line immediately before the blank line before that function.

- [ ] **Step 1: Delete the entire `renderPfTimeline` function**

Delete from `function renderPfTimeline(panelTasks, panelRoots, now) {` through the closing `}` of that function. The blank line between it and the next function (`renderPfCompletingSoon`) should be preserved as one blank line.

- [ ] **Step 2: Verify with grep**

Run: `grep -n "renderPfTimeline" nbi_project_dashboard.html`

Expected: zero matches.

---

### Task 6: Delete `renderPfUpcomingMilestones` function (~33 lines)

**Files:**
- Modify: `nbi_project_dashboard.html` — starts at line ~6137 (shifts down after Task 5)

The function begins with `function renderPfUpcomingMilestones(panelTasks, now, fortnight) {` and ends before `function renderPfTeamWorkload`. It is no longer called anywhere in v4 (the milestones panel is rendered differently).

- [ ] **Step 1: Delete the entire `renderPfUpcomingMilestones` function**

Delete from `function renderPfUpcomingMilestones(panelTasks, now, fortnight) {` through its closing `}`. Preserve one blank line between surrounding functions.

- [ ] **Step 2: Verify with grep**

Run: `grep -n "renderPfUpcomingMilestones" nbi_project_dashboard.html`

Expected: zero matches.

---

### Task 7: Delete `renderPfBottomNeedsAttention` function (~52 lines)

**Files:**
- Modify: `nbi_project_dashboard.html` — starts at line ~6206 (shifts down after Tasks 5–6)

The function begins with `function renderPfBottomNeedsAttention(panelTasks, now) {` and ends before `/** Toggle standup person expansion... */`. It references `_portfolioBottomAttentionExpanded` (already deleted) and `_actSetPortfolioBottomExpanded` (already deleted). It is not called anywhere in v4.

- [ ] **Step 1: Delete the entire `renderPfBottomNeedsAttention` function**

Delete from `function renderPfBottomNeedsAttention(panelTasks, now) {` through its closing `}`. Preserve one blank line before the standup toggle comment block.

- [ ] **Step 2: Verify with grep**

Run: `grep -n "renderPfBottomNeedsAttention" nbi_project_dashboard.html`

Expected: zero matches.

---

### Task 8: Add Command theme to THEMES array

**Files:**
- Modify: `nbi_project_dashboard.html` — THEMES array, line ~22484 (shifts after all deletions above)

The THEMES array currently ends with the `emerald` entry. The Command theme uses a dark navy background, light text, cyan accent, and a translucent white for borders/cards — matching a terminal/command-line aesthetic.

- [ ] **Step 1: Add the Command entry after the Emerald entry**

Change the end of the THEMES array from:
```javascript
  { id: 'emerald',   label: 'Emerald',   group: 'extra',   swatches: ['#0c1a0f','#e0f0e4','#34d399','#264d33'] },
];
```

To:
```javascript
  { id: 'emerald',   label: 'Emerald',   group: 'extra',   swatches: ['#0c1a0f','#e0f0e4','#34d399','#264d33'] },
  { id: 'command',   label: 'Command',   group: 'extra',   swatches: ['#1c1f24','#e8ecf1','#00d4ff','rgba(255,255,255,0.08)'] },
];
```

- [ ] **Step 2: Verify with grep**

Run: `grep -n "id: 'command'" nbi_project_dashboard.html`

Expected: exactly one match with the line above.

---

### Task 9: Final verification sweep

- [ ] **Run all grep checks together**

```bash
grep -n "renderPfTimeline\|renderPfBottomNeedsAttention\|renderPfUpcomingMilestones\|_pfGanttDayWidth\|_pfGanttOffsetDays\|_portfolioBottomAttentionExpanded\|pf__sidebar\|pfGanttZoom\|pfGanttNav\|pfGanttToday\|renderPfWorkCompleted\|renderPfHealthScorecard\|renderPfNeedsAttention" nbi_project_dashboard.html
```

Expected: zero matches.

- [ ] **Verify Command theme entry present**

```bash
grep -n "id: 'command'" nbi_project_dashboard.html
```

Expected: exactly one match.

- [ ] **Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "$(cat <<'EOF'
refactor: remove portfolio v4 dead code + add Command theme

- Delete renderPfTimeline (~280 lines) — replaced by v4 renderer
- Delete renderPfBottomNeedsAttention (~52 lines) — no longer called
- Delete renderPfUpcomingMilestones (~33 lines) — no longer called
- Delete _portfolioBottomAttentionExpanded, _pfGanttDayWidth, _pfGanttOffsetDays globals
- Delete _actSetPortfolioBottomExpanded action handler
- Delete pfGanttZoom, pfGanttNav, pfGanttToday functions
- Delete .pf__sidebar scroll-preservation dead branches in renderContent
- Delete three commented-out v3 function stubs
- Add Command theme to THEMES array

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage check:**
- Delete `_actSetPortfolioBottomExpanded` — already done before plan was written, no task needed (verified absent)
- Delete three dead globals — Task 1
- Delete three Gantt functions — Task 2
- Delete `.pf__sidebar` scroll-preservation — Task 3
- Delete three commented-out v3 stubs — Task 4
- Delete `renderPfTimeline` — Task 5
- Delete `renderPfUpcomingMilestones` — Task 6
- Delete `renderPfBottomNeedsAttention` — Task 7
- Add Command theme — Task 8
- Final grep sweep — Task 9

All spec items covered. No gaps.

**Placeholder scan:** No TBDs, no "similar to Task N" references, no vague instructions. All steps show exact strings to delete or exact replacements.

**Type consistency:** No type definitions involved — pure deletion and one array literal addition. No cross-task naming issues.
