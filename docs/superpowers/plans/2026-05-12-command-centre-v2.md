# Command Centre v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Command Centre with a zone-based mission control layout that fits a 3440×1440 ultrawide viewport with zero scroll, adds an action rail for triage/launch/monitor/improve, and makes the system feel alive.

**Architecture:** Full CSS replacement (lines 2625-2944) + full JS replacement (lines 19572-20334) in `nbi_project_dashboard.html`. Three-zone layout: status strip (48px), 4Cs metrics row (120px), main content + action rail. Mockup HTML from cc-v4.html used as literal card templates with data variable injection.

**Tech Stack:** Vanilla HTML/CSS/JS (inline in SPA), SVG for rings/heartbeat, CSS animations, no new dependencies.

**Critical rule:** The mockup HTML files (cc-v4.html, cc-briefing-v3b.html) are the visual spec. When building card content, COPY the mockup's HTML structure literally and replace hardcoded text with `esc(variable)`. Do NOT write HTML from scratch.

---

## File Map

All changes in **one file**: `nbi_project_dashboard.html`

| Section | Lines (approx) | Action |
|---------|----------------|--------|
| CC CSS block | 2625-2944 | Replace entirely |
| CC JS block | 19572-20334 | Replace entirely |

Reference files (read-only):
- `.superpowers/brainstorm/15405-1778494096/content/cc-v4.html` — Dashboard card HTML templates
- `.superpowers/brainstorm/15405-1778494096/content/cc-briefing-v3b.html` — Briefing section HTML templates
- `docs/superpowers/specs/2026-05-12-command-centre-v2-design.md` — Design spec

---

## Task 1: Replace CC CSS — Zone Layout + Visual Language

**Files:**
- Modify: `nbi_project_dashboard.html:2625-2944`

This task replaces the entire CC CSS block with the new zone-based layout system. The CSS must define: the three-zone viewport layout, the status strip, the 4Cs metrics row, the action rail, the main content area, all card styles (copied from mockup CSS with `cc-` prefix), the dot-grid background, the ECG heartbeat animation, responsive breakpoints, and all animation keyframes.

- [ ] **Step 1: Read the current CSS block**

Read lines 2625-2944 of `nbi_project_dashboard.html` to understand everything that needs replacing. Also read the CSS from both mockup files (cc-v4.html lines 9-230, cc-briefing-v3b.html lines 9-219) to have the exact mockup CSS available.

- [ ] **Step 2: Write the replacement CSS**

Replace the entire block from `/* ===== Command Centre — own visual identity, not SPA theme ===== */` through the last animation rule before `</style>` with new CSS. The new CSS must include:

**Root layout (`.cc-page`):**
```css
.cc-page {
  /* Same custom properties as before */
  --cc-bg: #0b0d11; /* darker than before per spec */
  /* ... all colour vars ... */
  height: calc(100vh - var(--header-h, 52px));
  overflow: hidden; /* NOT overflow-y: auto — zero scroll */
  display: grid;
  grid-template-rows: 48px 120px 1fr;
  grid-template-columns: 1fr 360px;
  grid-template-areas:
    "strip strip"
    "metrics metrics"
    "main rail";
  background: var(--cc-bg);
  color: var(--cc-t1);
  font-size: 15px;
  position: relative;
}
```

**Dot grid background (replaces animated gradient mesh):**
```css
.cc-page::before {
  content: '';
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image: radial-gradient(circle, #1a1d23 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.04;
}
.cc-page > * { position: relative; z-index: 1; }
```

**Status strip (`.cc-strip`):** 48px, grid-area: strip, flex row, items centred.

**4Cs metrics row (`.cc-metrics`):** 120px, grid-area: metrics, 4-column grid.

**Main content (`.cc-main`):** grid-area: main, overflow-y: auto (only this zone scrolls if needed), padding.

**Action rail (`.cc-rail`):** grid-area: rail, 360px, border-left, flex column, overflow-y: auto.

**Tabs, cards, all card sub-elements:** Copy from mockup CSS, prefix all class names with `cc-`. Every class from cc-v4.html (`.c` → `.cc-card`, `.pri` → `.cc-pri`, `.si` → `.cc-si`, `.bt` → `.cc-bt`, `.bi` → `.cc-bi`, `.stats` → `.cc-stats`, etc.) and from cc-briefing-v3b.html (`.li` → `.cc-li`, `.tl` → `.cc-tl`, `.prog` → `.cc-prog`, `.chip` → `.cc-chip`, `.btag` → `.cc-btag`, `.done-btn` → `.cc-done-btn`, `.dismiss-btn` → `.cc-dismiss-btn`, etc.)

**ECG heartbeat animation:**
```css
.cc-ecg { width: 200px; height: 32px; position: relative; overflow: hidden; }
.cc-ecg__line { fill: none; stroke: var(--cc-cyan); stroke-width: 1.5; }
@keyframes ccEcgSweep {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

**Responsive breakpoints:**
```css
@media (max-width: 2560px) { .cc-main .cc-grid { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 1600px) {
  .cc-page { grid-template-columns: 1fr; grid-template-areas: "strip" "metrics" "main"; }
  .cc-rail { display: none; } /* collapsed to toggle */
  .cc-main .cc-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 1200px) { .cc-metrics { grid-template-columns: repeat(2, 1fr); } .cc-main .cc-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 900px) { .cc-metrics { grid-template-columns: 1fr; } .cc-main .cc-grid { grid-template-columns: 1fr; } }
```

**Animation keyframes:** ccFadeUp (entrance, once), ccRingDraw, ccCritPulse, ccNowPulse, ccShimmer, ccEcgSweep.

- [ ] **Step 3: Verify the CSS block is complete**

Check that every class used in the mockup HTML has a cc-prefixed equivalent defined. Check that the `.main__content:has(> .cc-page)` parent padding override is preserved.

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npm test`
Expected: 396 tests passing (CSS changes can't break server tests, but verify)

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "refactor(cc): replace CSS with zone-based mission control layout

Three-zone grid: status strip (48px) + 4Cs metrics (120px) + main/rail.
Dot grid background replaces animated gradient mesh.
ECG heartbeat animation keyframes.
All card classes from mockup with cc- prefix.
Responsive: 5col→4→3→2→1 with rail collapse at 1600px."
```

---

## Task 2: Replace CC JS — Zone Renderer + Status Strip + 4Cs Metrics Row

**Files:**
- Modify: `nbi_project_dashboard.html:19572-19730` (approx — the page renderer, data loaders, helpers, and hero section)

This task replaces `_ccRenderPage` and `ccRenderDashboard` to produce the new three-zone HTML structure, plus the status strip (with ECG heartbeat) and 4Cs metrics row. The card rendering functions are handled in subsequent tasks.

- [ ] **Step 1: Read current renderer functions**

Read lines 19572-19730 to understand `renderCommandCentre`, `_ccLoadData`, `_ccLoadBriefing`, `_ccRenderPage`, helper functions, and `ccRenderDashboard`. Note which global variables and helper functions must be preserved (`_ccSnapshot`, `_ccBriefing`, `_ccTab`, `_ccLoading`, `_ccBriefingFailed`, `_ccData()`, `_ccBriefData()`, `ccSwitchTab()`, `ccRefresh()`, `ccFilterWork()`).

- [ ] **Step 2: Rewrite `_ccRenderPage` to produce the three-zone layout**

The function must generate:
```html
<div class="cc-page">
  <!-- ZONE 1: STATUS STRIP -->
  <div class="cc-strip">
    <div class="cc-strip__left">
      <span class="cc-strip__logo">NBI</span>
      <span class="cc-strip__greeting">{greeting}, <span class="cc-strip__name">{userName}</span></span>
    </div>
    <div class="cc-strip__centre">
      <svg class="cc-ecg"><!-- ECG heartbeat trace --></svg>
      <span class="cc-strip__process">{processStatus}</span>
    </div>
    <div class="cc-strip__right">
      <span class="cc-strip__ts">Scanned {timestamp}</span>
      <button class="cc-btn" onclick="ccRefresh()">Refresh Scan</button>
    </div>
  </div>

  <!-- ZONE 2: 4Cs METRICS ROW -->
  <div class="cc-metrics">{4Cs panels}</div>

  <!-- ZONE 3a: MAIN CONTENT -->
  <div class="cc-main">
    <div class="cc-tabs">{tab buttons}</div>
    {tab content}
  </div>

  <!-- ZONE 3b: ACTION RAIL -->
  <div class="cc-rail">{rail content}</div>
</div>
```

- [ ] **Step 3: Build the ECG heartbeat SVG**

The heartbeat is the signature visual. It's a repeating SVG polyline that scrolls left continuously:
```javascript
function ccEcgPath() {
  // One ECG cycle: flat → sharp R-wave peak → recovery → flat
  // Repeats twice in the SVG so the scroll loop is seamless
  return '<svg class="cc-ecg" viewBox="0 0 400 32" preserveAspectRatio="none">' +
    '<polyline class="cc-ecg__line" points="0,16 30,16 35,16 38,4 40,28 42,12 46,16 80,16 110,16 115,16 118,4 120,28 122,12 126,16 160,16 190,16 195,16 198,4 200,28 202,12 206,16 240,16 270,16 275,16 278,4 280,28 282,12 286,16 320,16 350,16 355,16 358,4 360,28 362,12 366,16 400,16"' +
    ' style="animation:ccEcgSweep 4s linear infinite"/></svg>';
}
```

- [ ] **Step 4: Build the 4Cs metrics row renderer**

Each of the 4 panels uses the ring SVG from the mockup but in a horizontal instrument-panel layout (not the old hero card layout):
```javascript
function ccMetricsRow(fc) {
  let html = '<div class="cc-metrics">';
  ['context','connections','capabilities','cadence'].forEach(key => {
    const c = fc[key] || { score: 0, max: 10, details: [] };
    const pct = c.score / c.max;
    const circ = 2 * Math.PI * 22;
    const offset = circ * (1 - pct);
    const colour = c.score >= 7 ? 'var(--cc-green)' : c.score >= 4 ? 'var(--cc-amber)' : 'var(--cc-red)';
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    const sub = c.details.slice(0, 2).join(', ') || 'No data';
    // Ring SVG from mockup hero__card, adapted to metrics panel
    html += '<div class="cc-metric">';
    html += '<div class="cc-ring"><svg viewBox="0 0 56 56"><circle class="cc-ring__bg" cx="28" cy="28" r="22"/>';
    html += '<circle class="cc-ring__fill" cx="28" cy="28" r="22" style="stroke:' + colour + ';stroke-dasharray:' + circ.toFixed(0) + ';stroke-dashoffset:' + circ.toFixed(0) + ';filter:drop-shadow(0 0 6px ' + colour + ')" data-target="' + offset.toFixed(1) + '"/>';
    html += '</svg><div class="cc-ring__score" style="color:' + colour + '">' + c.score + '</div></div>';
    html += '<div class="cc-metric__info"><div class="cc-metric__label">' + esc(label) + '</div>';
    html += '<div class="cc-metric__sub">' + esc(sub) + '</div></div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}
```

- [ ] **Step 5: Build the Action Rail renderer**

Default mode (no card selected): command input + critical alerts + reasoning stream.
```javascript
function ccActionRail(d, b) {
  let html = '<div class="cc-rail">';
  // Command input
  html += '<div class="cc-rail__cmd"><span class="cc-rail__prompt">&gt;</span>';
  html += '<input class="cc-rail__input" id="ccCmdInput" placeholder="triage bugs, run scan, check brain..." onkeydown="if(event.key===\'Enter\')ccRunCommand(this.value)"/></div>';
  // Critical alerts
  html += '<div class="cc-rail__section"><div class="cc-rail__heading">CRITICAL</div>';
  const alerts = _ccBuildAlerts(d, b);
  alerts.slice(0, 5).forEach(a => {
    html += '<div class="cc-rail__alert cc-rail__alert--' + a.severity + '">';
    html += '<div class="cc-rail__alert-text">' + esc(a.title) + '</div>';
    html += '<div class="cc-rail__alert-actions">';
    a.actions.forEach(act => {
      html += '<button class="cc-rail__act-btn" onclick="' + act.onclick + '">' + act.label + '</button>';
    });
    html += '</div></div>';
  });
  if (alerts.length === 0) html += '<div class="cc-rail__empty">Nothing critical</div>';
  html += '</div>';
  // Reasoning stream
  html += '<div class="cc-rail__section cc-rail__section--grow"><div class="cc-rail__heading">SYSTEM LOG</div>';
  html += '<div class="cc-rail__stream" id="ccStream">';
  const reasoning = _ccBuildReasoning(d);
  reasoning.forEach(r => {
    html += '<div class="cc-rail__log"><span class="cc-rail__log-time">' + r.time + '</span> ' + esc(r.text) + '</div>';
  });
  html += '</div></div>';
  html += '</div>';
  return html;
}
```

- [ ] **Step 6: Add helper functions for alerts and reasoning stream**

```javascript
function _ccBuildAlerts(d, b) {
  const alerts = [];
  // Critical bugs
  if (b && b.critical) {
    b.critical.forEach(c => alerts.push({
      severity: 'crit', title: c.title || '',
      actions: [{ label: c.type === 'bug' ? 'Open Bug' : 'Open', onclick: "switchView('bugs')" }]
    }));
  }
  // Overdue tasks
  if (b && b.work_queue && b.work_queue.overdue) {
    b.work_queue.overdue.slice(0, 2).forEach(t => alerts.push({
      severity: 'warn', title: t.title,
      actions: [{ label: 'Open', onclick: "switchView('projects')" }]
    }));
  }
  // Stale brain modules
  if (b && b.knowledge_flags && b.knowledge_flags.stale_brain_modules) {
    b.knowledge_flags.stale_brain_modules.forEach(m => alerts.push({
      severity: 'info', title: m.name + ' — stale (' + Math.floor((Date.now() - new Date(m.last_modified).getTime()) / 86400000) + 'd)',
      actions: [{ label: 'Review', onclick: '' }]
    }));
  }
  return alerts.sort((a, b) => ({ crit: 0, warn: 1, info: 2 })[a.severity] - ({ crit: 0, warn: 1, info: 2 })[b.severity]);
}

function _ccBuildReasoning(d) {
  const items = [];
  const bugs = d.bugs || {};
  if (bugs.by_status && bugs.by_status.please_review) {
    items.push({ time: 'now', text: bugs.by_status.please_review + ' bugs awaiting review. Team should close these.' });
  }
  if (bugs.hotspots && bugs.hotspots.length > 0) {
    items.push({ time: 'now', text: 'Hotspot: ' + bugs.hotspots[0].count + ' bugs on ' + bugs.hotspots[0].page + '. Consider stabilisation sprint.' });
  }
  const mem = (d.memory || {}).health || {};
  if (mem.stale > 0) {
    items.push({ time: 'now', text: mem.stale + ' memory files with stale references. Flagged for review.' });
  }
  const skills = d.skills || [];
  const staleSkills = skills.filter(s => s.last_modified && (Date.now() - new Date(s.last_modified).getTime()) > 30 * 86400000);
  if (staleSkills.length > 0) {
    items.push({ time: 'now', text: staleSkills.length + ' skills untouched >30 days. Review or remove.' });
  }
  return items;
}
```

- [ ] **Step 7: Add keyboard shortcut handler and command runner**

```javascript
function ccKeyHandler(e) {
  if (currentView !== 'commandcentre') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === '1') { ccSwitchTab('dashboard'); e.preventDefault(); }
  if (e.key === '2') { ccSwitchTab('briefing'); e.preventDefault(); }
  if (e.key === '3') { ccSwitchTab('systemmap'); e.preventDefault(); }
  if (e.key === 'Escape') { ccDeselectCard(); e.preventDefault(); }
  if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
    const inp = document.getElementById('ccCmdInput');
    if (inp) { inp.focus(); e.preventDefault(); }
  }
  if (e.key === 'r' || e.key === 'R') { ccRefresh(); e.preventDefault(); }
}
document.addEventListener('keydown', ccKeyHandler);

function ccRunCommand(cmd) {
  const c = cmd.trim().toLowerCase();
  if (c === 'triage bugs' || c === 'bugs') switchView('bugs');
  else if (c === 'run scan' || c === 'scan') ccRefresh();
  else if (c === 'check brain' || c === 'brain') toast('Brain check: ' + (((_ccData().memory || {}).health || {}).score || 0) + '% healthy', 'info');
  else if (c === 'show stale') toast('Stale items flagged in rail', 'info');
  else toast('Unknown command: ' + cmd, 'warning');
  const inp = document.getElementById('ccCmdInput');
  if (inp) inp.value = '';
}
```

- [ ] **Step 8: Wire up card selection (click card → rail morphs)**

```javascript
let _ccSelectedCard = null;

function ccSelectCard(cardEl, domain) {
  if (_ccSelectedCard === cardEl) { ccDeselectCard(); return; }
  ccDeselectCard();
  _ccSelectedCard = cardEl;
  cardEl.classList.add('cc-card--selected');
  document.querySelectorAll('.cc-card').forEach(c => {
    if (c !== cardEl) c.classList.add('cc-card--dimmed');
  });
  // Rail morphs to show domain-specific context
  const rail = document.querySelector('.cc-rail');
  if (rail) {
    rail.dataset.domain = domain;
    // Future: swap rail content based on domain
  }
}

function ccDeselectCard() {
  if (!_ccSelectedCard) return;
  _ccSelectedCard.classList.remove('cc-card--selected');
  document.querySelectorAll('.cc-card--dimmed').forEach(c => c.classList.remove('cc-card--dimmed'));
  _ccSelectedCard = null;
  const rail = document.querySelector('.cc-rail');
  if (rail) delete rail.dataset.domain;
}
```

- [ ] **Step 9: Update post-render setup (ring animation, button feedback, expandable cards)**

Preserve the `requestAnimationFrame` block from `_ccRenderPage` that handles ring fill animation, button click feedback (now also on `.cc-done-btn`, `.cc-dismiss-btn`), expandable card toggles, and add the new card selection click binding.

- [ ] **Step 10: Run tests**

Run: `cd dashboard-server && npm test`
Expected: 396 tests passing

- [ ] **Step 11: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(cc): zone-based page renderer with status strip, metrics row, action rail

Three-zone layout: strip (48px) + metrics (120px) + main/rail.
ECG heartbeat SVG trace in status strip.
4Cs as instrument panels in metrics row (not hero cards).
Action rail: command input, critical alerts, reasoning stream.
Card selection: click → rail morphs, others dim.
Keyboard shortcuts: 1/2/3 tabs, / command, Esc deselect, R refresh."
```

---

## Task 3: Replace Dashboard Tab Card Functions

**Files:**
- Modify: `nbi_project_dashboard.html` — the 9 `ccCard*` functions

This task rewrites all dashboard card renderers. **Critical rule:** For each card, open the corresponding section in cc-v4.html, COPY the HTML structure, replace hardcoded text with data expressions. The mockup HTML IS the template.

- [ ] **Step 1: Read mockup card HTML**

Read cc-v4.html lines 280-457 (the `<div class="grid">` section). Each card has a specific HTML structure that must be reproduced exactly with cc- prefix.

- [ ] **Step 2: Rewrite `ccRenderDashboard` to use the new grid**

```javascript
function ccRenderDashboard() {
  const d = _ccData();
  let html = '<div class="cc-grid">';
  html += ccCardSituation(d);
  html += ccCardSkills(d);
  html += ccCardBrain(d);
  html += ccCardConnections(d);
  html += ccCardBugs(d);
  html += ccCardAgentTeam(d);
  html += ccCardSessions(d);
  html += ccCardTests(d);
  html += ccCardLevelUp();
  html += '</div>';
  return html;
}
```

- [ ] **Step 3: Rewrite each card function — COPY mockup HTML**

For each of the 9 cards, the process is identical:
1. Look at the mockup HTML for that card (e.g. `<div class="c c--cyan">` for Skills Intelligence)
2. Copy the entire HTML structure
3. Change class names: `c` → `cc-card`, `c--cyan` → `cc-card--cyan`, `c__h` → `cc-card__head`, `c__t` → `cc-card__title`, `si` → `cc-si`, etc.
4. Replace hardcoded text with data: `"38 active"` → `skills.length + ' active'`
5. Add `onclick="ccSelectCard(this,'skills')"` to each card root
6. Keep ALL inline styles from mockup

The data logic (computing scores, filtering stale skills, building bug lists) from the current functions is preserved — only the HTML template changes.

Each card's data mapping:
- **Today's Focus**: `_ccBriefData().critical`, `.work_queue.overdue`, `.work_queue.blocked`, fallback to `d.bugs.open_bugs`
- **Skills Intelligence**: `d.skills` array — `.name`, `.has_learnings`, `.has_evals`, `.last_modified`
- **Brain & Memory**: `d.brain.core`, `d.brain.modules`, `d.memory.health`
- **Connection Map**: `d.connections.buckets` — `.status`, `.sources`
- **Bug Intelligence**: `d.bugs.by_status`, `.by_priority`, `.hotspots`
- **Agent Team**: `d.brain.roles` — `.has_knowledge`, `.knowledge_freshness`
- **Sessions**: `d.sessions.stats`, `.live_state`, `.recent`
- **Test Health**: `d.tests.last_run` — `.passed`, `.failed`, `.total`
- **Level-Up**: Static placeholder (Phase 2)

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npm test`
Expected: 396 tests passing

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(cc): dashboard cards — mockup HTML templates with live data

All 9 cards use cc-v4.html HTML structure literally.
Cards: Focus, Skills, Brain, Connections, Bugs, Agents, Sessions, Tests, LevelUp.
Each card wired to ccSelectCard for rail interaction."
```

---

## Task 4: Replace Briefing Tab Section Functions

**Files:**
- Modify: `nbi_project_dashboard.html` — the 7 `ccBrief*` functions

Same approach as Task 3 but using cc-briefing-v3b.html as the template source.

- [ ] **Step 1: Read mockup briefing HTML**

Read cc-briefing-v3b.html lines 237-601 (all sections after tabs). Each section has specific HTML with interactive elements (expandable cards, done buttons, dismiss buttons, timeline dots, filter chips, progress bars with shimmer, tag badges).

- [ ] **Step 2: Rewrite each briefing function — COPY mockup HTML**

For each of the 7 sections:
1. Copy the section HTML from the briefing mockup
2. Translate class names to cc- prefix
3. Replace hardcoded text with briefing data variables
4. Keep ALL interactive elements: expandable cards (`cc-card--expandable`), done buttons (`cc-done-btn`), dismiss/nudge buttons (`cc-dismiss-btn`), filter chips (`cc-chip`), progress bars with shimmer (`cc-prog`), tag badges (`cc-btag`)

Briefing data mapping:
- **Critical**: `b.critical` array
- **Calendar**: `b.calendar.today`, `.tomorrow`
- **Work Queue**: `b.work_queue.overdue`, `.due_today`, `.due_this_week`, `.blocked`
- **Bug Status**: `b.bugs.critical_open`, `.awaiting_review`, `.hotspots`, `.by_priority`
- **Claude State**: `b.claude_state.last_session`, `.recent_decisions`, `.outstanding_work`
- **Client Deliveries**: `b.client_deliveries` (object keyed by client name)
- **Knowledge Flags**: `b.knowledge_flags.stale_brain_modules`, `.stale_memory_files`, `.dormant_roles_count`

- [ ] **Step 3: Add System Map tab (Phase 1 — static connection grid)**

```javascript
function ccRenderSystemMap() {
  const d = _ccData();
  const conn = d.connections || {};
  const buckets = conn.buckets || {};
  let html = '<div class="cc-sysmap">';
  html += '<div class="cc-sysmap__title">System Connection Map</div>';
  html += '<div class="cc-sysmap__subtitle">Phase 2 will show an interactive force-directed graph</div>';
  // Reuse connection grid from Dashboard card but at full width
  html += '<div class="cc-cg cc-cg--full">';
  Object.entries(buckets).forEach(([name, b]) => {
    const cls = b.status === 'connected' ? 'cc-cn--ok' : b.status === 'partial' ? 'cc-cn--part' : 'cc-cn--gap';
    html += '<div class="cc-cn ' + cls + '"><div class="cc-cn__name">' + esc(name) + '</div>';
    html += '<div class="cc-cn__via">' + esc((b.sources || []).join(', ') || (b.status === 'missing' ? 'blind spot' : '')) + '</div></div>';
  });
  html += '</div></div>';
  return html;
}
```

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npm test`
Expected: 396 tests passing

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(cc): briefing sections + system map tab — mockup HTML templates

7 briefing sections from cc-briefing-v3b.html with live data.
Expandable priority card, done/dismiss buttons, nudge buttons.
Timeline dots, filter chips, shimmer progress bars, tag badges.
System Map tab (Phase 1: static connection grid)."
```

---

## Task 5: Visual Polish + Entrance Animations + PM2 Restart

**Files:**
- Modify: `nbi_project_dashboard.html` (minor CSS/JS tweaks)

- [ ] **Step 1: Verify entrance animations fire once per session**

Add a session flag so staggered card entrance only fires on first render:
```javascript
let _ccAnimated = false;
// In _ccRenderPage, after setting innerHTML:
if (!_ccAnimated) {
  _ccAnimated = true;
  // animations are in CSS with animation-fill-mode: both
  // they auto-fire on DOM insert, so this flag just prevents
  // re-adding the animation class on subsequent renders
}
```

On tab switch, add class `cc-page--no-entrance` that sets `animation: none` on cards.

- [ ] **Step 2: Verify all theme variables use --cc- prefix**

Search the CC JS block for any `var(--danger)`, `var(--warning)`, `var(--success)`, `var(--primary)`, `var(--text-muted)` or similar SPA theme references. Replace with `var(--cc-red)`, `var(--cc-amber)`, `var(--cc-green)`, `var(--cc-blue)`, `var(--cc-t3)` respectively.

- [ ] **Step 3: Test on localhost**

Run: `cd dashboard-server && npm test`
Expected: 396 tests passing

- [ ] **Step 4: Restart PM2**

```bash
pm2 restart nbi-dashboard
```

Verify: `curl -s http://localhost:8888/nbi_project_dashboard.html | head -1` returns HTML.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(cc): visual polish — entrance animations, theme var cleanup

Entrance animations fire once per session.
Tab switches use instant crossfade (no re-stagger).
All SPA theme var references replaced with --cc- scoped vars."
```

---

## Execution Notes

- **Total scope:** ~800 lines of CSS replacement + ~800 lines of JS replacement in one file
- **Risk:** Large replacement in monolithic file. Each task should be tested before committing.
- **Mockup fidelity:** The card HTML MUST come from the mockup files. Do not write card HTML from scratch. The mockup HTML IS the template — copy it, prefix classes with `cc-`, swap hardcoded text for data variables.
- **Scroll fix:** The `.cc-page` must use `overflow: hidden` at the root level. Only `.cc-main` gets `overflow-y: auto`. This prevents the viewport-scroll issue on ultrawide.
- **Action rail:** The rail is the most important new element. It transforms the CC from a display to a control surface.
