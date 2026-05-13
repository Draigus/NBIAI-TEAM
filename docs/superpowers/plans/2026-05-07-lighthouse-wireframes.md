# Lighthouse Analytics Wireframes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 5 standalone, shareable HTML dashboard wireframes for Lighthouse Games' Wonderland analytics platform, with Chart.js interactive charts, realistic mock data, and a toggleable annotation overlay system.

**Architecture:** Each HTML file is fully self-contained (inline CSS + JS, CDN dependencies for Chart.js, Google Fonts). Files link to each other via relative paths. No build step, no server, no framework. Open in any browser, share by email.

**Tech Stack:** HTML5, CSS3, vanilla JS, Chart.js 4.x (CDN), Google Fonts (Inter, JetBrains Mono)

**Spec:** `docs/superpowers/specs/2026-05-07-lighthouse-wireframes-design.md`
**Design system:** `Clients/Lighthouse Games/DESIGN.md`

---

## File Structure

```
Clients/Lighthouse Games/wireframes/
  01-progression-summary.html   (Task 1)
  02-slt-overview.html          (Task 2)
  03-ftue-executive.html        (Task 3)
  04-ftue-dropoff-funnel.html   (Task 4)
  05-ftue-quest-timing.html     (Task 5)
```

Each file contains: full HTML document with `<!DOCTYPE html>`, inline `<style>` block with the complete design system CSS, inline `<script>` block with Chart.js chart configs + annotation system + mock data. Every file is independently openable — no shared imports.

---

## Shared CSS & JS Pattern (copy into each file)

Every file needs these identical blocks. They are repeated per file (not shared) because each file must be standalone. The plan shows them once here; each task says "include the shared CSS/JS from the plan header."

### Shared CSS

```css
/* === DESIGN SYSTEM from Clients/Lighthouse Games/DESIGN.md === */
:root {
  --primary: #A93DA1;
  --primary-hover: #8E3488;
  --primary-light: #C75ABF;
  --primary-faint: #2A1629;
  --primary-deep: #7030A0;
  --secondary: #3152FF;
  --secondary-light: #5A75FF;
  --secondary-deep: #2240CC;
  --accent-pink: #E4347A;
  --accent-coral: #FF5528;
  --lavender: #9A8FED;
  --surface-base: #0F032B;
  --surface-base-alt: #042433;
  --surface-card: #1A0E30;
  --surface-elevated: #251842;
  --surface-hover: #30204F;
  --surface-input: #1A0E30;
  --border-default: #2D1B4A;
  --border-focus: #A93DA1;
  --text-primary: #F0F0F5;
  --text-secondary: #9CA3BF;
  --text-muted: #6B7194;
  --success: #22C55E;
  --warning: #F59E0B;
  --danger: #EF4444;
  --info: #3152FF;
  --chart-1: #A93DA1;
  --chart-2: #3152FF;
  --chart-3: #E4347A;
  --chart-4: #FF5528;
  --chart-5: #9A8FED;
  --chart-6: #22C55E;
  --chart-7: #06B6D4;
  --chart-8: #F59E0B;
  --funnel-1: #C75ABF;
  --funnel-2: #A93DA1;
  --funnel-3: #8E3488;
  --funnel-4: #7030A0;
  --funnel-5: #5A2680;
  --funnel-6: #3D1A5C;
  --funnel-7: #2A1140;
  --rounded-sm: 6px;
  --rounded-md: 10px;
  --rounded-lg: 16px;
  --rounded-full: 9999px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
}
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 14px; }
body {
  background: var(--surface-base);
  color: var(--text-primary);
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  min-height: 100vh;
}
/* Typography */
.h1 { font-size: 28px; font-weight: 700; line-height: 1.2; }
.h2 { font-size: 22px; font-weight: 600; line-height: 1.3; }
.h3 { font-size: 18px; font-weight: 600; line-height: 1.3; }
.body-sm { font-size: 13px; }
.caption { font-size: 12px; font-weight: 500; line-height: 1.3; }
.overline {
  font-size: 11px; font-weight: 600; line-height: 1;
  letter-spacing: 0.08em; text-transform: uppercase;
}
.mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  font-size: 13px; font-weight: 400; line-height: 1.5;
}
/* Layout shell */
.page-wrapper { max-width: 1400px; margin: 0 auto; padding: var(--spacing-lg); }
/* Nav header */
.nav-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-md) 0; margin-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-default);
}
.nav-header .logo {
  font-size: 15px; font-weight: 700; color: var(--text-primary);
  display: flex; align-items: center; gap: var(--spacing-sm);
}
.nav-header .logo .brand { color: var(--primary); }
.nav-links {
  display: flex; gap: var(--spacing-xs); flex-wrap: wrap;
}
.nav-links a {
  padding: 8px 14px; border-radius: var(--rounded-sm);
  font-size: 13px; color: var(--text-secondary); text-decoration: none;
  display: flex; align-items: center; gap: 6px; transition: background 0.15s;
}
.nav-links a:hover { background: var(--surface-card); }
.nav-links a.active { background: var(--primary-faint); color: var(--primary-light); }
.pill {
  font-size: 9px; font-weight: 700; padding: 2px 6px;
  border-radius: var(--rounded-full); letter-spacing: 0.05em;
}
.pill-a { background: rgba(49,82,255,0.2); color: var(--secondary-light); }
.pill-e { background: rgba(169,61,161,0.2); color: var(--primary-light); }
.pill-r { background: rgba(154,143,237,0.2); color: var(--lavender); }
.pill-m { background: rgba(255,85,40,0.2); color: var(--accent-coral); }
.pill-all {
  background: linear-gradient(90deg,rgba(49,82,255,0.2),rgba(169,61,161,0.2),rgba(154,143,237,0.2),rgba(255,85,40,0.2));
  color: var(--text-primary);
}
/* Page title row */
.page-title-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: var(--spacing-xs);
}
.audience-badge {
  font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; padding: 6px 14px;
  border-radius: var(--rounded-full);
  background: var(--primary-faint); color: var(--primary-light);
}
.page-subtitle { color: var(--text-secondary); margin-bottom: var(--spacing-lg); }
/* Filter bar */
.filter-bar {
  background: var(--surface-card); border: 1px solid var(--border-default);
  border-radius: var(--rounded-md); padding: 12px var(--spacing-md);
  display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  margin-bottom: var(--spacing-lg);
}
.filter-bar .filter-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
.filter-bar select {
  background: var(--surface-elevated); color: var(--text-secondary);
  border: 1px solid var(--border-default); border-radius: var(--rounded-sm);
  padding: 6px 10px; font-size: 13px; font-family: Inter, sans-serif;
  appearance: none; cursor: pointer;
}
/* Cards */
.card {
  background: var(--surface-card); border: 1px solid var(--border-default);
  border-radius: var(--rounded-md); padding: var(--spacing-lg);
  position: relative;
}
.card-elevated {
  background: var(--surface-elevated); border: 1px solid var(--border-default);
  border-radius: var(--rounded-md); padding: var(--spacing-lg);
  position: relative;
}
/* Scorecards */
.scorecard-row {
  display: grid; gap: var(--spacing-md); margin-bottom: var(--spacing-lg);
}
.scorecard {
  background: var(--surface-card); border: 1px solid var(--border-default);
  border-radius: var(--rounded-md); padding: 20px; position: relative;
}
.scorecard .label { font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 4px; }
.scorecard .value {
  font-size: 28px; font-weight: 700;
  font-family: 'JetBrains Mono', monospace; margin-bottom: 4px;
}
.scorecard .trend {
  font-size: 13px; font-family: 'JetBrains Mono', monospace;
  display: flex; align-items: center; gap: 4px;
}
.trend-up { color: var(--success); }
.trend-down { color: var(--danger); }
.trend-flat { color: var(--warning); }
/* Chart containers */
.chart-card {
  background: var(--surface-card); border: 1px solid var(--border-default);
  border-radius: var(--rounded-md); padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg); position: relative;
}
.chart-card .chart-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.chart-card .chart-subtitle { font-size: 12px; color: var(--text-muted); margin-bottom: var(--spacing-md); }
.chart-card canvas { width: 100% !important; }
/* AERM section pill */
.aerm-pill {
  position: absolute; top: var(--spacing-md); right: var(--spacing-md);
  font-size: 10px; font-weight: 700; padding: 3px 10px;
  border-radius: var(--rounded-full); letter-spacing: 0.05em; text-transform: uppercase;
}
.aerm-pill.acquisition { background: rgba(49,82,255,0.15); color: var(--secondary-light); border: 1px solid rgba(49,82,255,0.3); }
.aerm-pill.engagement { background: rgba(169,61,161,0.15); color: var(--primary-light); border: 1px solid rgba(169,61,161,0.3); }
.aerm-pill.retention { background: rgba(154,143,237,0.15); color: var(--lavender); border: 1px solid rgba(154,143,237,0.3); }
.aerm-pill.monetisation { background: rgba(255,85,40,0.15); color: var(--accent-coral); border: 1px solid rgba(255,85,40,0.3); }
/* Section label */
.section-label {
  font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--text-muted);
  margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
}
/* Footer */
.page-footer {
  text-align: center; color: var(--text-muted); font-size: 12px;
  padding: var(--spacing-md) 0; margin-top: var(--spacing-2xl);
  border-top: 1px solid var(--border-default);
}
/* === ANNOTATION SYSTEM === */
.annotation-toggle {
  position: fixed; bottom: 24px; right: 24px; z-index: 100;
  background: var(--accent-pink); color: #fff; border: none;
  padding: 10px 20px; border-radius: var(--rounded-full);
  font-size: 13px; font-weight: 600; font-family: Inter, sans-serif;
  cursor: pointer; box-shadow: 0 4px 20px rgba(228,52,122,0.4);
  transition: background 0.15s;
}
.annotation-toggle:hover { background: #d12a6a; }
.annotation-toggle.active { background: var(--primary-deep); box-shadow: 0 4px 20px rgba(112,48,160,0.4); }
.callout-badge {
  display: none; position: absolute; top: -10px; right: -10px;
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--accent-pink); color: #fff;
  font-size: 11px; font-weight: 700;
  align-items: center; justify-content: center; cursor: pointer; z-index: 10;
}
body.annotations-on .callout-badge { display: flex; }
.annotation-panel {
  display: none; position: fixed; top: 50%; right: 80px;
  transform: translateY(-50%); width: 360px; max-height: 80vh; overflow-y: auto;
  background: var(--surface-elevated); border: 1px solid var(--accent-pink);
  border-radius: var(--rounded-md); padding: var(--spacing-lg);
  z-index: 200; box-shadow: 0 8px 40px rgba(0,0,0,0.5);
}
.annotation-panel.visible { display: block; }
.annotation-panel h4 { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); }
.annotation-panel .ann-pillar { margin-bottom: 8px; }
.annotation-panel .ann-text { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }
.annotation-panel .ann-audience { font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border-default); padding-top: 8px; }
.annotation-panel .close-btn {
  position: absolute; top: 12px; right: 12px;
  background: none; border: none; color: var(--text-muted);
  font-size: 20px; cursor: pointer; line-height: 1;
}
.annotation-panel .close-btn:hover { color: var(--text-primary); }
/* Table styling */
.data-table { width: 100%; border-collapse: collapse; }
.data-table thead th {
  background: var(--surface-elevated); color: var(--text-secondary);
  font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 12px var(--spacing-md); text-align: left; height: 44px;
  border-bottom: 1px solid var(--border-default); cursor: pointer;
}
.data-table thead th:hover { color: var(--text-primary); }
.data-table tbody td {
  background: var(--surface-card); color: var(--text-primary);
  font-size: 13px; padding: 10px var(--spacing-md); height: 44px;
  border-bottom: 1px solid var(--border-default);
}
.data-table tbody tr:hover td { background: var(--surface-hover); }
.data-table .num {
  font-family: 'JetBrains Mono', monospace; font-size: 13px; text-align: right;
}
.delta-pos { color: var(--danger); }
.delta-neg { color: var(--success); }
/* Tabs */
.tab-row {
  display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--border-default); padding-bottom: var(--spacing-xs);
}
.tab-row button {
  padding: 8px 16px; border-radius: var(--rounded-sm) var(--rounded-sm) 0 0;
  border: 1px solid transparent; border-bottom: none;
  background: transparent; color: var(--text-secondary);
  font-size: 13px; font-family: Inter, sans-serif; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.tab-row button:hover { background: var(--surface-card); color: var(--text-primary); }
.tab-row button.active {
  background: var(--surface-card); color: var(--primary-light);
  border-color: var(--border-default);
}
```

### Shared JS (annotation system)

```javascript
// === ANNOTATION SYSTEM ===
const annotations = {}; // populated per-page, keyed by callout number
let panelOpen = null;

function toggleAnnotations() {
  document.body.classList.toggle('annotations-on');
  document.querySelector('.annotation-toggle').classList.toggle('active');
  const panel = document.querySelector('.annotation-panel');
  if (panel) { panel.classList.remove('visible'); panelOpen = null; }
}

function showAnnotation(num) {
  const panel = document.querySelector('.annotation-panel');
  const a = annotations[num];
  if (!a) return;
  panel.querySelector('h4').textContent = a.title;
  panel.querySelector('.ann-pillar').innerHTML = a.pillarHtml;
  panel.querySelector('.ann-text').textContent = a.text;
  panel.querySelector('.ann-audience').textContent = 'Audience: ' + a.audience;
  panel.classList.add('visible');
  panelOpen = num;
}

function closeAnnotation() {
  const panel = document.querySelector('.annotation-panel');
  if (panel) { panel.classList.remove('visible'); panelOpen = null; }
}
```

### Shared HTML skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PAGE_TITLE -- Lighthouse Analytics</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <style>/* SHARED CSS HERE */</style>
</head>
<body>
<div class="page-wrapper">
  <!-- Nav header -->
  <nav class="nav-header">
    <div class="logo"><span class="brand">Lighthouse</span> Analytics</div>
    <div class="nav-links">
      <a href="01-progression-summary.html" CLASS_IF_ACTIVE>Progression <span class="pill pill-e">E</span></a>
      <a href="02-slt-overview.html" CLASS_IF_ACTIVE>SLT Overview <span class="pill pill-all">AERM</span></a>
      <a href="03-ftue-executive.html" CLASS_IF_ACTIVE>FTUE: Health <span class="pill pill-a">A</span></a>
      <a href="04-ftue-dropoff-funnel.html" CLASS_IF_ACTIVE>FTUE: Drop-off <span class="pill pill-a">A</span></a>
      <a href="05-ftue-quest-timing.html" CLASS_IF_ACTIVE>FTUE: Timing <span class="pill pill-a">A</span><span class="pill pill-e">E</span></a>
    </div>
  </nav>

  <!-- Page title -->
  <div class="page-title-row">
    <h1 class="h1">PAGE_TITLE</h1>
    <span class="audience-badge">AUDIENCE_NAME</span>
  </div>
  <p class="page-subtitle">PAGE_SUBTITLE</p>

  <!-- Filter bar -->
  <div class="filter-bar">
    <span class="filter-label">Filters</span>
    <!-- PAGE-SPECIFIC FILTERS -->
  </div>

  <!-- PAGE CONTENT -->

  <!-- Footer -->
  <div class="page-footer">Lighthouse Games Analytics &middot; Wonderland &middot; Wireframe v1 &middot; NBI Analytics</div>
</div>

<!-- Annotation UI -->
<button class="annotation-toggle" onclick="toggleAnnotations()">Annotations</button>
<div class="annotation-panel">
  <button class="close-btn" onclick="closeAnnotation()">&times;</button>
  <h4></h4>
  <div class="ann-pillar"></div>
  <div class="ann-text"></div>
  <div class="ann-audience"></div>
</div>

<script>/* SHARED JS + PAGE-SPECIFIC CHARTS + ANNOTATIONS */</script>
</body>
</html>
```

### Chart.js global defaults (set once per file)

```javascript
Chart.defaults.color = '#9CA3BF';
Chart.defaults.borderColor = '#2D1B4A';
Chart.defaults.font.family = "Inter, -apple-system, sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;
Chart.defaults.plugins.tooltip.backgroundColor = '#251842';
Chart.defaults.plugins.tooltip.borderColor = '#2D1B4A';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 6;
Chart.defaults.plugins.tooltip.titleFont = { family: 'Inter', size: 13, weight: 600 };
Chart.defaults.plugins.tooltip.bodyFont = { family: "'JetBrains Mono', monospace", size: 12 };
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.scale.grid = { color: 'rgba(45,27,74,0.5)' };
```

---

## Task 1: Progression Summary Dashboard

**Files:**
- Create: `Clients/Lighthouse Games/wireframes/01-progression-summary.html`

**Audience:** Game Designers | **AERM:** Engagement

- [ ] **Step 1: Create the wireframes directory**

```bash
mkdir -p "Clients/Lighthouse Games/wireframes"
```

- [ ] **Step 2: Write the complete HTML file**

Create `Clients/Lighthouse Games/wireframes/01-progression-summary.html` with:

1. Full HTML skeleton (from shared pattern above), with:
   - Title: "Progression Summary"
   - Audience badge: "GAME DESIGNERS"
   - Subtitle: "Cumulative progression funnels per vector with average time to reach each level"
   - Active nav link: first link (`01-progression-summary.html`)
   - Filters: Install/Cohort Date, Platform, Country

2. **Tab row** for progression vectors: Player Level, Driver Level, Car Collection, Race Completion, Experience Entry, Golden Path, Campaign Thread. Default active: "Player Level". Clicking a tab shows/hides the corresponding content section.

3. **Per vector (start with Player Level visible, others hidden):**

   a. **Funnel chart card** — `<div class="chart-card">` with:
      - AERM pill: `<span class="aerm-pill engagement">Engagement</span>`
      - Callout badge: `<span class="callout-badge" onclick="showAnnotation(1)">1</span>`
      - Title: "[Vector] Progression Funnel"
      - Subtitle: "Cumulative % of cohort reaching each level"
      - `<canvas>` element for a Chart.js **horizontal bar chart**
      - Bars use funnel colours from DESIGN.md: `#C75ABF, #A93DA1, #8E3488, #7030A0, #5A2680, #3D1A5C, #2A1140` (repeat/interpolate for more bars)
      - Data labels on each bar: level name, player count, % retained

   b. **Time-to-reach chart card** — `<div class="chart-card">` with:
      - Callout badge: `<span class="callout-badge" onclick="showAnnotation(2)">2</span>`
      - Title: "Average Time to Reach Level"
      - Subtitle: "Median hours from install to each milestone"
      - `<canvas>` element for a Chart.js **vertical bar chart**
      - Single colour: `var(--primary)` / `#A93DA1`
      - Y-axis labels in hours (e.g. "2.4h")

4. **Custom engagement funnels section** (always visible below the tab content):
   - Section label: "ENGAGEMENT DEPTH FUNNELS"
   - Callout badge: `<span class="callout-badge" onclick="showAnnotation(3)">3</span>`
   - Three chart card pairs (funnel + time) for: Nth Car Collected, Nth Race Completed, Nth Experience Entered. Same chart pattern as the progression vectors but smaller (3 funnels stacked vertically).

5. **Mock data for Player Level vector:**

```javascript
const playerLevelData = {
  labels: ['Level 1','Level 2','Level 3','Level 4','Level 5','Level 6','Level 7','Level 8','Level 9','Level 10',
           'Level 12','Level 15','Level 18','Level 20','Level 25','Level 30','Level 35','Level 40','Level 45','Level 50'],
  players: [4200,3990,3780,3570,3360,3108,2856,2604,2310,2058,1764,1470,1176,1008,756,546,378,252,168,84],
  pctRetained: [100,95.0,90.0,85.0,80.0,74.0,68.0,62.0,55.0,49.0,42.0,35.0,28.0,24.0,18.0,13.0,9.0,6.0,4.0,2.0],
  hoursToReach: [0,0.3,0.7,1.2,1.8,2.4,3.2,4.1,5.3,6.8,9.2,13.5,18.1,22.0,32.0,45.0,58.0,72.0,90.0,115.0]
};
```

6. **Mock data for Driver Level vector:**

```javascript
const driverLevelData = {
  labels: ['Novice','Amateur','Semi-Pro','Professional','Expert','Master','Legend'],
  players: [4200,3780,3150,2310,1470,630,210],
  pctRetained: [100,90.0,75.0,55.0,35.0,15.0,5.0],
  hoursToReach: [0,1.5,4.0,10.0,22.0,48.0,95.0]
};
```

7. **Mock data for Car Collection:**

```javascript
const carCollectionData = {
  labels: ['1st Car','2nd Car','3rd Car','5th Car','8th Car','10th Car','15th Car','20th Car','30th Car'],
  players: [4200,3990,3570,2940,2100,1680,1050,630,252],
  pctRetained: [100,95.0,85.0,70.0,50.0,40.0,25.0,15.0,6.0],
  hoursToReach: [0.5,1.8,3.5,7.0,14.0,20.0,35.0,55.0,90.0]
};
```

8. **Mock data for Race Completion:**

```javascript
const raceCompletionData = {
  labels: ['1st Race','3rd Race','5th Race','10th Race','20th Race','30th Race','50th Race','75th Race','100th Race'],
  players: [4200,3780,3360,2520,1680,1260,756,420,210],
  pctRetained: [100,90.0,80.0,60.0,40.0,30.0,18.0,10.0,5.0],
  hoursToReach: [0.8,2.0,3.5,8.0,18.0,28.0,50.0,80.0,120.0]
};
```

9. **Mock data for Experience Entry:**

```javascript
const experienceEntryData = {
  labels: ['1st Exp','2nd Exp','3rd Exp','5th Exp','8th Exp','10th Exp','15th Exp','20th Exp'],
  players: [4200,3360,2730,1890,1260,1050,630,378],
  pctRetained: [100,80.0,65.0,45.0,30.0,25.0,15.0,9.0],
  hoursToReach: [1.0,2.5,4.5,9.0,16.0,22.0,38.0,60.0]
};
```

10. **Mock data for Golden Path:**

```javascript
const goldenPathData = {
  labels: ['Quest 1: Welcome Home','Quest 2: First Steps','Quest 3: First Drive','Quest 4: Home Garage',
           'Quest 5: Customize','Quest 6: First Race','Quest 7: Explore','Quest 8: Challenge',
           'Quest 9: Tournament','Quest 10: California'],
  players: [4200,3990,3696,3360,3024,2688,2352,2016,1680,1344],
  pctRetained: [100,95.0,88.0,80.0,72.0,64.0,56.0,48.0,40.0,32.0],
  hoursToReach: [0,0.08,0.2,0.4,0.6,0.9,1.2,1.6,2.0,2.5]
};
```

11. **Tab switching JS:**

```javascript
function switchVector(vectorId, btn) {
  document.querySelectorAll('.vector-content').forEach(el => el.style.display = 'none');
  document.getElementById(vectorId).style.display = 'block';
  document.querySelectorAll('.tab-row button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
```

12. **Chart rendering function** (reused for each vector):

```javascript
function renderFunnel(canvasId, data) {
  const funnelColors = ['#C75ABF','#A93DA1','#8E3488','#7030A0','#5A2680','#3D1A5C','#2A1140'];
  const colors = data.pctRetained.map((_, i) => {
    const idx = Math.floor((i / (data.pctRetained.length - 1)) * (funnelColors.length - 1));
    return funnelColors[Math.min(idx, funnelColors.length - 1)];
  });
  new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.pctRetained,
        backgroundColor: colors,
        borderRadius: 4,
        barThickness: 28
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const i = ctx.dataIndex;
              return `${data.pctRetained[i]}% retained — ${data.players[i].toLocaleString()} players`;
            }
          }
        }
      },
      scales: {
        x: { max: 100, ticks: { callback: v => v + '%' } },
        y: { ticks: { font: { size: 12 } } }
      }
    }
  });
}

function renderTimeChart(canvasId, data) {
  new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.hoursToReach,
        backgroundColor: '#A93DA1',
        borderRadius: 4,
        barThickness: 28
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.parsed.y}h median`
          }
        }
      },
      scales: {
        y: { ticks: { callback: v => v + 'h' } },
        x: { ticks: { maxRotation: 45, font: { size: 11 } } }
      }
    }
  });
}
```

13. **Annotations data:**

```javascript
const annotations = {
  1: {
    title: 'Progression Funnel',
    pillarHtml: '<span class="pill pill-e">ENGAGEMENT</span>',
    text: 'Shows cumulative player drop-off through progression. Each bar = % of cohort that reached this level. Used by designers to identify where progression pacing causes churn. Steeper drops indicate difficulty spikes or content gaps.',
    audience: 'Game Designers — progression balancing, engagement depth planning'
  },
  2: {
    title: 'Time to Reach Level',
    pillarHtml: '<span class="pill pill-e">ENGAGEMENT</span>',
    text: 'Median time to reach each progression milestone. Helps designers compare actual pacing against intended design. E.g. if milestone 3 takes 2.4h but was designed for 1.5h, pacing needs tuning. Compare across builds to measure improvement.',
    audience: 'Game Designers — pacing validation, build-over-build comparison'
  },
  3: {
    title: 'Engagement Depth Funnels',
    pillarHtml: '<span class="pill pill-e">ENGAGEMENT</span>',
    text: 'Engagement-depth funnels for non-linear progression. How many players collect N cars, complete N races, or enter N experiences. Measures breadth of engagement beyond the main progression track.',
    audience: 'Game Designers — content utilisation, engagement breadth'
  }
};
```

14. **Render all charts on load:**

```javascript
document.addEventListener('DOMContentLoaded', () => {
  renderFunnel('funnel-player-level', playerLevelData);
  renderTimeChart('time-player-level', playerLevelData);
  renderFunnel('funnel-driver-level', driverLevelData);
  renderTimeChart('time-driver-level', driverLevelData);
  renderFunnel('funnel-car-collection', carCollectionData);
  renderTimeChart('time-car-collection', carCollectionData);
  renderFunnel('funnel-race-completion', raceCompletionData);
  renderTimeChart('time-race-completion', raceCompletionData);
  renderFunnel('funnel-experience-entry', experienceEntryData);
  renderTimeChart('time-experience-entry', experienceEntryData);
  renderFunnel('funnel-golden-path', goldenPathData);
  renderTimeChart('time-golden-path', goldenPathData);
});
```

- [ ] **Step 3: Open in browser and verify**

Open `Clients/Lighthouse Games/wireframes/01-progression-summary.html` in a browser. Check:
- Navigation header renders with correct links and AERM pills
- Filter bar shows Install/Cohort Date, Platform, Country dropdowns
- Player Level tab is active by default, funnel + time charts render
- Switching tabs shows different vector data
- Annotations toggle works — callout badges appear, clicking opens panel
- Footer renders
- Dark theme, correct colours, typography matches DESIGN.md

- [ ] **Step 4: Commit**

```bash
git add "Clients/Lighthouse Games/wireframes/01-progression-summary.html"
git commit -m "feat: Lighthouse progression summary wireframe with Chart.js funnels"
```

---

## Task 2: SLT Overview Dashboard

**Files:**
- Create: `Clients/Lighthouse Games/wireframes/02-slt-overview.html`

**Audience:** Senior Leadership Team | **AERM:** All four pillars

- [ ] **Step 1: Write the complete HTML file**

Create `Clients/Lighthouse Games/wireframes/02-slt-overview.html` with:

1. Full HTML skeleton with:
   - Title: "SLT Executive Health"
   - Audience badge: "SENIOR LEADERSHIP TEAM"
   - Subtitle: "At-a-glance AERM health overview with trends and dashboard directory"
   - Active nav link: second link
   - Filters: Date Range, Platform, Country, Build Version

2. **Scorecard row** — `grid-template-columns: repeat(4, 1fr)` on large screens, `repeat(2, 1fr)` on small. 8 scorecards in 2 rows of 4:
   - Row 1: New Unique Users (blue, 2,847, +12%), DAU (magenta, 12,847, +8.3%), WAU (magenta, 38,420, +5.1%), MAU (magenta, 69,840, +2.4%)
   - Row 2: D1 Retention (lavender, 34.2%, -1.1pp), D7 Retention (lavender, 14.8%, +0.6pp), ARPDAU (coral, $0.42, +3.7%), Daily Revenue (coral, $5,396, +6.1%)
   - Each scorecard has a callout badge (1 for the entire row)
   - AERM pills on each scorecard matching their pillar

3. **Trend charts section** — Section label "TRENDS OVER TIME". Maximum 2 charts per row:

   a. **Users trend** (full width or half) — Chart.js line chart, 30 data points (days). Three lines: DAU (#A93DA1), WAU (#3152FF), MAU (#9A8FED). Smooth curves with fill under DAU line at 10% opacity.

   b. **Retention trend** (half width) — Chart.js line chart, 30 data points. Two lines: D1 (#9A8FED), D7 (#7030A0). Include a horizontal dashed reference line at 40% labelled "D1 benchmark".

   c. **Revenue trend** (half width) — Chart.js mixed chart: bar for daily revenue (#FF5528 at 30% opacity), line for 7-day moving average (#FF5528 solid).

   Mock data for trends:

```javascript
const days = Array.from({length: 30}, (_, i) => {
  const d = new Date(2026, 3, 8 + i); // April 8 to May 7
  return d.toLocaleDateString('en-GB', {day:'numeric', month:'short'});
});

const dauTrend = [10200,10500,10800,11100,10900,11300,11600,11200,11800,12000,
                  11500,11900,12200,12400,11800,12100,12500,12300,12700,12900,
                  12100,12400,12600,12800,13000,12500,12700,12900,13100,12847];

const wauTrend = dauTrend.map((v, i) => Math.round(v * (2.8 + Math.sin(i/5)*0.3)));

const mauTrend = dauTrend.map((v, i) => Math.round(v * (5.2 + Math.sin(i/8)*0.4)));

const d1Trend = [35.1,34.8,34.5,35.2,34.0,33.8,34.5,35.0,34.2,33.9,
                 34.8,35.1,34.3,33.7,34.6,35.0,34.1,33.5,34.8,35.2,
                 34.0,33.8,34.5,34.9,34.1,33.6,34.3,34.7,34.0,34.2];

const d7Trend = [13.8,14.0,14.2,14.1,14.5,14.3,14.6,14.8,14.2,14.5,
                 14.7,14.4,14.9,15.0,14.6,14.3,14.8,15.1,14.5,14.7,
                 15.0,14.8,14.6,15.2,14.9,14.7,15.1,14.8,15.0,14.8];

const revenueTrend = [4800,5100,4950,5200,5400,5100,4700,5300,5500,5200,
                      5000,5400,5600,5300,4900,5200,5500,5700,5400,5100,
                      5300,5600,5800,5500,5200,5400,5700,5900,5600,5396];
```

4. **Dashboard directory** — Section label "ANALYTICS DASHBOARD DIRECTORY". Full-width `<table class="data-table">` with columns: Dashboard Name, Description, Target Audience, AERM Pillar, Status.

   Rows for all 34 dashboards from the Miro extraction plus the 6 analytics tools. The 4 wireframed dashboards link to their HTML files. All others show "Coming Soon" in muted text. Group by theme area (FTUE, Retention, Core Gameplay, etc.).

   Here is the complete table data as a JS array:

```javascript
const dashboards = [
  { name:'Progression Summary', desc:'Funnel per progression vector with avg time to reach', audience:'Designers', pillar:'E', link:'01-progression-summary.html' },
  { name:'SLT Executive Health', desc:'At-a-glance AERM overview for leadership', audience:'SLT', pillar:'AERM', link:null },
  { name:'FTUE Executive Health', desc:'Installs, D1 retention, step conversion, time to step', audience:'SLT', pillar:'A', link:'03-ftue-executive.html' },
  { name:'FTUE Drop-off Funnel', desc:'Step-by-step drop-off with major/minor step drilldown', audience:'Designers', pillar:'A', link:'04-ftue-dropoff-funnel.html' },
  { name:'FTUE Quest Timing', desc:'Actual vs designed quest durations with delta analysis', audience:'Designers', pillar:'A/E', link:'05-ftue-quest-timing.html' },
  { name:'Retention Overview & Cohorts', desc:'D1/D3/D7 retention curves, cohort heatmap, churn', audience:'All', pillar:'R', link:null },
  { name:'Retention Drivers', desc:'Behavioural segmentation driving retention', audience:'Designers', pillar:'R', link:null },
  { name:'Core Gameplay Engagement', desc:'Mission/race volume, completion, activity chaining', audience:'Designers', pillar:'E', link:null },
  { name:'Discovery & Content', desc:'How players find and enter content', audience:'Designers', pillar:'E', link:null },
  { name:'Garage & Vehicle Engagement', desc:'Garage visits, customisation, vehicle breadth', audience:'Designers', pillar:'E', link:null },
  { name:'Car Collection & Usage', desc:'Vehicle acquisition and utilisation', audience:'Designers', pillar:'E', link:null },
  { name:'Upgrade Parts & Loot', desc:'Loot lifecycle, part degradation, re-rolls', audience:'Designers', pillar:'E/M', link:null },
  { name:'Scrap Economy', desc:'Scrap token flow, sink/source balance', audience:'Economy', pillar:'E/M', link:null },
  { name:'Car Tuning Engagement', desc:'Tuning menu adoption, basic vs advanced', audience:'Designers', pillar:'E', link:null },
  { name:'Driving Mastery Economy', desc:'Mastery XP/Cr scoring and earn rates', audience:'Economy', pillar:'E/M', link:null },
  { name:'Vehicle Handling Balance', desc:'Per-vehicle performance, pick rate, crash rate', audience:'Designers', pillar:'E', link:null },
  { name:'Economy Health Summary', desc:'Cash/credit earned/spent, faucet-to-sink ratio', audience:'Economy/SLT', pillar:'M', link:null },
  { name:'Economy Progression', desc:'Currency behaviour by player level/days', audience:'Economy', pillar:'M', link:null },
  { name:'Economy Drilldown', desc:'Per-item currency breakdown', audience:'Economy', pillar:'M', link:null },
  { name:'Economy Wallets', desc:'Currency-on-hand distribution, zero-balance rate', audience:'Economy', pillar:'M', link:null },
  { name:'Revenue Executive Summary', desc:'Gross/net revenue, ARPDAU, conversion, LTV', audience:'SLT', pillar:'M', link:null },
  { name:'Revenue Extended Health', desc:'Premium store performance, long-tail content', audience:'Live Ops', pillar:'M', link:null },
  { name:'Revenue Breakdown', desc:'Revenue sources, best-selling items', audience:'Live Ops', pillar:'M', link:null },
  { name:'First Time Conversion', desc:'Free-to-payer conversion context and triggers', audience:'Live Ops', pillar:'M', link:null },
  { name:'Premium Economy Progression', desc:'Wonder Credit sink/source by progression', audience:'Economy', pillar:'M', link:null },
  { name:'Premium Economy Drilldown', desc:'Per-item premium currency breakdown', audience:'Economy', pillar:'M', link:null },
  { name:'Premium Economy Wallets', desc:'Wonder Credit balance distribution', audience:'Economy', pillar:'M', link:null },
  { name:'Customisation Overview', desc:'Cosmetic engagement, tokens spent, adoption', audience:'Designers', pillar:'E/M', link:null },
  { name:'Vanity Deep Dive', desc:'Aesthetic preferences, car-level cosmetics', audience:'Designers', pillar:'E/M', link:null },
  { name:'UX Friction & Flow', desc:'Idle time, navigation loops, dead-end sessions', audience:'Designers', pillar:'E', link:null },
  { name:'Tech Health Summary', desc:'Crash rate, FPS, load times, OOM', audience:'Engineering', pillar:'E', link:null },
  { name:'Shared World Health', desc:'24-player instance stability and performance', audience:'Engineering', pillar:'E', link:null },
  { name:'California Heatmap', desc:'Player movement, exploration, crash locations', audience:'Designers', pillar:'E', link:null },
  { name:'California Progression', desc:'Campaign thread funnels, non-linear paths', audience:'Designers', pillar:'E', link:null },
  { name:'Activity Mix', desc:'Time share across golden path, challenges, threads', audience:'Designers', pillar:'E', link:null },
  { name:'Collection Overview', desc:'Per-car stats, pick rate, collection progression', audience:'Designers', pillar:'E', link:null },
  { name:'Platform Exploration / UX', desc:'Experience impressions, clickthrough, bounce rate', audience:'Designers', pillar:'E', link:null },
];
```

   Render this table with JS so the links are clickable for wireframed dashboards and show "Coming Soon" for the rest. Pillar column shows colour-coded pills.

5. **Annotations:**

```javascript
const annotations = {
  1: {
    title: 'Top-Line KPIs',
    pillarHtml: '<span class="pill pill-all">AERM</span>',
    text: 'Top-line health metrics across all four AERM pillars. Designed for a 5-second scan — are things trending up, down, or flat? New Unique Users and DAU cover Acquisition. DAU/WAU/MAU ratio indicates Engagement stickiness. D1/D7 cover Retention. ARPDAU and Revenue cover Monetisation.',
    audience: 'Senior Leadership Team — executive health check'
  },
  2: {
    title: 'Trends Over Time',
    pillarHtml: '<span class="pill pill-all">AERM</span>',
    text: 'Same KPIs tracked over time. Allows SLT to spot inflection points, seasonal patterns, and build-over-build changes. Compare periods to understand whether the game is improving.',
    audience: 'Senior Leadership Team — trend analysis, build comparison'
  },
  3: {
    title: 'Dashboard Directory',
    pillarHtml: '<span class="pill pill-all">AERM</span>',
    text: 'Navigation hub for the full analytics suite. 34 dashboards across FTUE, retention, engagement, economy, revenue, customisation, UX, and tech health. Each linked to its wireframe when available.',
    audience: 'All teams — navigation and discovery'
  }
};
```

- [ ] **Step 2: Open in browser and verify**

Check: scorecards render in 2x4 grid, trend charts render with multiple lines, dashboard directory table is populated with all 34+ entries, links work for the wireframed dashboards. Annotations toggle works.

- [ ] **Step 3: Commit**

```bash
git add "Clients/Lighthouse Games/wireframes/02-slt-overview.html"
git commit -m "feat: Lighthouse SLT overview wireframe with trends and dashboard directory"
```

---

## Task 3: FTUE Executive Health Summary

**Files:**
- Create: `Clients/Lighthouse Games/wireframes/03-ftue-executive.html`

**Audience:** Studio Leadership | **AERM:** Acquisition

- [ ] **Step 1: Write the complete HTML file**

Create `Clients/Lighthouse Games/wireframes/03-ftue-executive.html` with:

1. Full HTML skeleton with:
   - Title: "FTUE Executive Health Summary"
   - Audience badge: "STUDIO LEADERSHIP"
   - Subtitle: "At-a-glance health check of the game's first session(s)"
   - Active nav link: third link
   - Primary filters: Activity Date Range, Build Version, Platform, Country/Tier
   - Secondary filters (styled differently — smaller, muted border): Device Performance Tier

2. **Scorecard row** — `grid-template-columns: repeat(4, 1fr)`. 4 scorecards:
   - Number of Installs (blue, 4,200, +14.2%)
   - FTUE Completion Rate (blue, 61.8%, +0.2pp)
   - Avg Time to Wonderland Home (magenta, 28 min, -3.1%)
   - Avg Time to California (magenta, 52 min, -1.8%)
   - Callout badge 1 on this row
   - AERM pill: Acquisition on each

3. **Bar chart 1 — Step Conversion Rate** — Full-width chart card:
   - Title: "FTUE Step Conversion Rate"
   - Subtitle: "% of installs reaching each milestone"
   - Callout badge 2
   - AERM pill: Acquisition
   - Chart.js vertical bar chart with funnel colour ramp
   - Mock data:

```javascript
const ftueFunnelData = {
  labels: ['Download','First Boot','Account Creation','Initial Drive',
           'Wonderland Home','California Arrival','Semi-Pro License','Alpha Wall'],
  players: [4200,3948,3696,3360,2940,2604,2268,1890],
  pctOfInstalls: [100,94.0,88.0,80.0,70.0,62.0,54.0,45.0]
};
```

   Chart config — bars coloured with funnel ramp (`#C75ABF` to `#2A1140`). Y-axis: percentage. Data labels on each bar showing both % and absolute count. Canvas height ~350px.

4. **Bar chart 2 — Average Time to Step** — Full-width chart card:
   - Title: "Average (Median) Time to Step"
   - Subtitle: "Minutes from install to reaching each milestone"
   - Callout badge 3
   - AERM pill: Acquisition
   - Chart.js vertical bar chart, single colour `#A93DA1`
   - Mock data:

```javascript
const ftueTimeData = {
  labels: ['Download','First Boot','Account Creation','Initial Drive',
           'Wonderland Home','California Arrival','Semi-Pro License','Alpha Wall'],
  medianMinutes: [0,2,5,12,28,52,68,85]
};
```

   Y-axis: minutes. Data labels showing "Xm" on each bar. Canvas height ~300px.

5. **Annotations:**

```javascript
const annotations = {
  1: {
    title: 'Headline FTUE KPIs',
    pillarHtml: '<span class="pill pill-a">ACQUISITION</span>',
    text: 'Headline FTUE health for studio leadership. Number of installs = top of funnel. FTUE Completion Rate = % reaching California (configurable definition). Time metrics show how long the opening takes. Compare across builds to track improvement.',
    audience: 'Studio Leadership — executive health check'
  },
  2: {
    title: 'Step Conversion Funnel',
    pillarHtml: '<span class="pill pill-a">ACQUISITION</span>',
    text: 'Step-by-step conversion from download to Alpha Wall. Each bar shows what % of installs reached that milestone. Major drop-offs indicate friction points in the opening sequence. The biggest single drop here is at Initial Drive to Wonderland Home — worth investigating.',
    audience: 'Studio Leadership — funnel health, friction identification'
  },
  3: {
    title: 'Time to Step',
    pillarHtml: '<span class="pill pill-a">ACQUISITION</span>',
    text: 'Median time to reach each FTUE milestone. If Wonderland Home takes 28 minutes but was designed for 20, the tutorial may be too long. Compare across builds to measure improvement. Time-to-California is the critical metric for first-session depth.',
    audience: 'Studio Leadership — pacing validation'
  }
};
```

- [ ] **Step 2: Open in browser and verify**

Check: 4 scorecards render across top, conversion funnel bar chart renders below with funnel colours and data labels, time chart renders below that. Three clean sections, nothing cramped. Annotations toggle works.

- [ ] **Step 3: Commit**

```bash
git add "Clients/Lighthouse Games/wireframes/03-ftue-executive.html"
git commit -m "feat: Lighthouse FTUE executive health wireframe"
```

---

## Task 4: FTUE Drop-off & Pacing Funnel

**Files:**
- Create: `Clients/Lighthouse Games/wireframes/04-ftue-dropoff-funnel.html`

**Audience:** Game Designers | **AERM:** Acquisition

- [ ] **Step 1: Write the complete HTML file**

Create `Clients/Lighthouse Games/wireframes/04-ftue-dropoff-funnel.html` with:

1. Full HTML skeleton with:
   - Title: "FTUE Step-by-Step Drop-off & Pacing"
   - Audience badge: "GAME DESIGNERS"
   - Subtitle: "Diagnostic tool to evaluate player movement through the opening and pinpoint frustration points"
   - Active nav link: fourth link
   - Filters: Activity Date Range, Build Version, Platform, Country/Tier, Player Type (Free/Paid), Device Perf Tier, Language, Session Number

2. **Scorecard row** — `grid-template-columns: repeat(3, 1fr)` on two rows. 6 scorecards:
   - Number of Installs (blue, 4,200, +14.2%)
   - Step Conversion Rate (blue, 45.0%, +1.2pp) — overall install-to-Alpha-Wall
   - Step Drop-Off Rate (pink, 8.4%, -0.3pp) — avg relative drop between steps
   - Avg Time per Step (magenta, 4.2 min, -0.5%)
   - Friction Rate (coral, 12.3%, -1.1pp) — % players >2 SD from median
   - Crash Rate during FTUE (red/danger, 2.1%, -0.8pp)
   - Callout badge 1

3. **Major Step funnel section** — Section label "MAJOR STEP ANALYSIS". Three full-width chart cards stacked:

   a. **Step Conversion Rate** — vertical bar chart. Extended steps (more granular than Page 1):

```javascript
const majorSteps = {
  labels: [
    'Download','First Boot','Account Creation','EULA','Initial Drive',
    'WH: Quest 1','WH: Quest 2','WH: Quest 3 (First Car)','WH: Quest 4',
    'WH: Quest 5','WH: Quest 6','WH: Quest 7','WH: Quest 8',
    'WH: Quest 9','WH: Quest 10','California Arrival',
    'GP: Mission 1','GP: Mission 2','GP: Mission 3',
    'Semi-Pro License','Alpha Wall'
  ],
  pctOfInstalls: [
    100,94.0,88.0,86.5,80.0,
    77.0,74.5,72.0,68.0,
    65.0,63.0,61.0,59.0,
    57.0,55.0,52.0,
    49.0,47.0,45.5,
    44.0,42.0
  ],
  players: [
    4200,3948,3696,3633,3360,
    3234,3129,3024,2856,
    2730,2646,2562,2478,
    2394,2310,2184,
    2058,1974,1911,
    1848,1764
  ]
};
```

   Funnel colour ramp applied to bars. Callout badge 2.

   b. **Step Drop-Off Rate** — vertical bar chart. Same X-axis. Y-axis = relative % of players dropping between this step and the previous. Calculated from the conversion data:

```javascript
const dropOffRates = majorSteps.pctOfInstalls.map((v, i) => {
  if (i === 0) return 0;
  const prev = majorSteps.pctOfInstalls[i - 1];
  return parseFloat(((prev - v) / prev * 100).toFixed(1));
});
```

   Bars coloured `#E4347A` (accent pink). Highlight bars where drop-off > 5% with `#EF4444` (danger). Callout badge 3.

   c. **Average Time per Step** — vertical bar chart. Same X-axis. Y-axis = median minutes for each step:

```javascript
const timePerStep = [
  0,2,3,1.5,7,
  3,2.5,4,3.5,
  3,2.5,2,3,
  3.5,4,8,
  5,4.5,5,
  3,2
];
```

   Single colour `#A93DA1`. Callout badge 4.

4. **Minor Step drilldown section** — Section label "MINOR STEP DRILLDOWN". Contains:

   a. A dropdown selector listing the major steps. Default: "WH: Quest 3 (First Car)" (the step with interesting sub-data).

   b. When a step is selected, a sub-funnel appears below showing the sub-steps within that quest. Mock data for Quest 3:

```javascript
const quest3SubSteps = {
  labels: ['Quest Started','Walked to Garage','Spoke to Mechanic','Selected Car (MX-5)',
           'Cinematic 2.1','First Drive Start','Completed First Lap','Quest Complete'],
  pctOfQuestStarters: [100,96,92,88,85,82,78,72],
  timePerSubStep: [0,0.5,0.8,1.2,0.3,0.8,1.5,0.5]
};
```

   Same three chart types (conversion, drop-off, time) but for sub-steps. Callout badge 5.

   c. JS to swap sub-step data when dropdown changes. Only Quest 3 has full mock data; other selections show a placeholder message "Sub-step data for [step name] — requires heartbeat telemetry at <30s intervals".

5. **Annotations:**

```javascript
const annotations = {
  1: {
    title: 'Diagnostic KPIs',
    pillarHtml: '<span class="pill pill-a">ACQUISITION</span>',
    text: 'Diagnostic KPIs for FTUE friction. Friction Rate = % of players taking >2 standard deviations longer than median for a step — flags confusion or difficulty. Crash Rate during FTUE = technical friction that\'s invisible in conversion data alone.',
    audience: 'Game Designers — FTUE diagnostics'
  },
  2: {
    title: 'Major Step Conversion',
    pillarHtml: '<span class="pill pill-a">ACQUISITION</span>',
    text: 'Extended step-by-step funnel with each Wonderland Home quest as its own step. Compared to the Executive Health page, this gives designers the granularity to pinpoint exactly where frustration occurs. Each bar = % of installs reaching that step.',
    audience: 'Game Designers — granular funnel analysis'
  },
  3: {
    title: 'Step Drop-Off Rate',
    pillarHtml: '<span class="pill pill-a">ACQUISITION</span>',
    text: 'Relative drop-off between consecutive steps. A spike here means players are specifically quitting at this transition. Critical for identifying "quit moments". Red bars highlight steps where drop-off exceeds 5%.',
    audience: 'Game Designers — friction point identification'
  },
  4: {
    title: 'Time per Step',
    pillarHtml: '<span class="pill pill-a">ACQUISITION</span>',
    text: 'Median time spent on each step. Steps that take disproportionately long may indicate confusion, difficulty, or poor signposting. Compare against designed durations (see Quest Timing dashboard).',
    audience: 'Game Designers — pacing analysis'
  },
  5: {
    title: 'Minor Step Drilldown',
    pillarHtml: '<span class="pill pill-a">ACQUISITION</span>',
    text: 'Sub-step analysis within a selected major step. E.g. within Quest 3 (First Car), which specific objective is causing players to stall? Sub-step granularity depends on heartbeat/telemetry resolution from engineering.',
    audience: 'Game Designers — sub-step diagnostics'
  }
};
```

- [ ] **Step 2: Open in browser and verify**

Check: 6 scorecards, 3 major step charts with extended funnel, drop-off chart highlights anomalous steps, minor step dropdown works for Quest 3 and shows placeholder for others, all annotations work.

- [ ] **Step 3: Commit**

```bash
git add "Clients/Lighthouse Games/wireframes/04-ftue-dropoff-funnel.html"
git commit -m "feat: Lighthouse FTUE drop-off funnel wireframe with minor step drilldown"
```

---

## Task 5: FTUE Quest Timing vs Design Estimates

**Files:**
- Create: `Clients/Lighthouse Games/wireframes/05-ftue-quest-timing.html`

**Audience:** Game Designers | **AERM:** Acquisition / Engagement

- [ ] **Step 1: Write the complete HTML file**

Create `Clients/Lighthouse Games/wireframes/05-ftue-quest-timing.html` with:

1. Full HTML skeleton with:
   - Title: "FTUE Quest Timing vs Design Estimates"
   - Audience badge: "GAME DESIGNERS"
   - Subtitle: "Compare actual player quest durations against design-estimated times to identify pacing issues"
   - Active nav link: fifth link
   - Filters: Activity Date Range, Build Version, Platform, Country/Tier, Player Type, Device Perf Tier, Session Number, Quest/Mission ID, Quest Phase (Wonderland Home / California Golden Path / Campaign Thread)

2. **Quest timing data** — static JS object with all quests:

```javascript
const questData = [
  { name:'Quest 1: Welcome Home', phase:'WH', designedMins:3, actualMedianMins:3.2, p25:2.1, p75:4.8, p90:7.2, n:3234 },
  { name:'Quest 2: First Steps', phase:'WH', designedMins:4, actualMedianMins:4.5, p25:3.0, p75:6.5, p90:9.8, n:3129 },
  { name:'Quest 3: First Drive', phase:'WH', designedMins:5, actualMedianMins:8.2, p25:5.5, p75:12.0, p90:18.5, n:3024 },
  { name:'Quest 4: Home Garage', phase:'WH', designedMins:4, actualMedianMins:5.1, p25:3.2, p75:7.8, p90:11.0, n:2856 },
  { name:'Quest 5: Customise', phase:'WH', designedMins:3, actualMedianMins:3.8, p25:2.5, p75:5.5, p90:8.2, n:2730 },
  { name:'Quest 6: First Race', phase:'WH', designedMins:6, actualMedianMins:7.0, p25:4.8, p75:9.5, p90:13.8, n:2646 },
  { name:'Quest 7: Explore', phase:'WH', designedMins:5, actualMedianMins:4.2, p25:2.8, p75:6.0, p90:8.5, n:2562 },
  { name:'Quest 8: Challenge', phase:'WH', designedMins:8, actualMedianMins:9.5, p25:6.5, p75:13.0, p90:19.2, n:2478 },
  { name:'Quest 9: Tournament', phase:'WH', designedMins:10, actualMedianMins:11.8, p25:8.0, p75:16.5, p90:24.0, n:2394 },
  { name:'Quest 10: California', phase:'WH', designedMins:5, actualMedianMins:5.5, p25:3.5, p75:8.0, p90:12.0, n:2310 },
  { name:'GP: Mission 1', phase:'GP', designedMins:8, actualMedianMins:9.2, p25:6.0, p75:12.5, p90:18.0, n:2058 },
  { name:'GP: Mission 2', phase:'GP', designedMins:10, actualMedianMins:11.5, p25:7.5, p75:15.0, p90:22.0, n:1974 },
  { name:'GP: Mission 3', phase:'GP', designedMins:12, actualMedianMins:18.5, p25:11.0, p75:28.0, p90:42.0, n:1911 },
  { name:'GP: Semi-Pro License', phase:'GP', designedMins:6, actualMedianMins:7.0, p25:4.5, p75:10.0, p90:15.0, n:1848 },
];
```

   Note: Quest 3 (First Drive) has a 64% delta — designed for 5 min, actual 8.2 min. GP Mission 3 has a 54% delta — designed for 12 min, actual 18.5 min. These are the deliberate pain points the wireframe demonstrates.

3. **Quest timing table** — full-width `<table class="data-table">`. Rendered via JS from `questData`. Columns:
   - Quest Name (left-aligned)
   - Phase (WH/GP badge)
   - Designed (mins) — mono font, right-aligned
   - Actual Median (mins) — mono font, right-aligned
   - Delta % — mono font, right-aligned, colour-coded: green (`.delta-neg`) if <=0, red (`.delta-pos`) if >0. Bold if abs > 30%.
   - P25, P75, P90 — mono font, right-aligned, muted
   - N — mono font, right-aligned

   Sortable: clicking any column header sorts the table. Default sort: chronological order. Clicking a row highlights it and updates the histogram below.

   Callout badge 1.

   Table rendering JS:

```javascript
let selectedQuest = 2; // Quest 3 by default (0-indexed)
let sortCol = null;
let sortAsc = true;

function renderTable() {
  const tbody = document.getElementById('quest-tbody');
  let sorted = [...questData];
  if (sortCol !== null) {
    sorted.sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
  }
  tbody.innerHTML = sorted.map((q, i) => {
    const origIdx = questData.indexOf(q);
    const delta = ((q.actualMedianMins - q.designedMins) / q.designedMins * 100).toFixed(1);
    const deltaClass = delta > 0 ? 'delta-pos' : 'delta-neg';
    const deltaBold = Math.abs(delta) > 30 ? 'font-weight:700' : '';
    const selected = origIdx === selectedQuest ? 'background:var(--surface-hover)' : '';
    return `<tr style="${selected};cursor:pointer" onclick="selectQuest(${origIdx})">
      <td>${q.name}</td>
      <td><span class="pill pill-${q.phase==='WH'?'e':'a'}">${q.phase}</span></td>
      <td class="num">${q.designedMins}</td>
      <td class="num">${q.actualMedianMins}</td>
      <td class="num ${deltaClass}" style="${deltaBold}">${delta > 0 ? '+' : ''}${delta}%</td>
      <td class="num" style="color:var(--text-muted)">${q.p25}</td>
      <td class="num" style="color:var(--text-muted)">${q.p75}</td>
      <td class="num" style="color:var(--text-muted)">${q.p90}</td>
      <td class="num">${q.n.toLocaleString()}</td>
    </tr>`;
  }).join('');
}

function sortTable(col) {
  if (sortCol === col) { sortAsc = !sortAsc; }
  else { sortCol = col; sortAsc = true; }
  renderTable();
}

function selectQuest(idx) {
  selectedQuest = idx;
  renderTable();
  renderHistogram();
}
```

4. **Dual-line chart** — full-width chart card:
   - Title: "Cumulative Time: Designed vs Actual"
   - Subtitle: "Gap between lines shows where the build runs ahead of or behind design intent"
   - Callout badge 2
   - Chart.js line chart. X-axis: quest names (chronological). Two datasets:
     - Line 1 "Designed" — cumulative sum of `designedMins`, dashed line, colour `#3152FF`
     - Line 2 "Actual (Median)" — cumulative sum of `actualMedianMins`, solid line, colour `#A93DA1`
   - Fill between lines using Chart.js filler plugin (area between the two lines shaded with `rgba(169,61,161,0.1)`)

   Cumulative calculation:

```javascript
function cumulativeSum(arr) {
  let sum = 0;
  return arr.map(v => sum += v);
}
const cumDesigned = cumulativeSum(questData.map(q => q.designedMins));
const cumActual = cumulativeSum(questData.map(q => q.actualMedianMins));
```

   Chart config:

```javascript
new Chart(document.getElementById('cumulative-chart'), {
  type: 'line',
  data: {
    labels: questData.map(q => q.name),
    datasets: [
      {
        label: 'Cumulative Designed',
        data: cumDesigned,
        borderColor: '#3152FF',
        borderDash: [6, 3],
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#3152FF',
        fill: false,
        tension: 0.1
      },
      {
        label: 'Cumulative Actual (Median)',
        data: cumActual,
        borderColor: '#A93DA1',
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#A93DA1',
        fill: '-1',
        backgroundColor: 'rgba(169,61,161,0.1)',
        tension: 0.1
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} min`
        }
      }
    },
    scales: {
      y: { title: { display: true, text: 'Cumulative Minutes' }, ticks: { callback: v => v + 'm' } },
      x: { ticks: { maxRotation: 45, font: { size: 10 } } }
    }
  }
});
```

5. **Histogram / box plot** — full-width chart card:
   - Title: "Duration Distribution: [Quest Name]" (updates when row clicked)
   - Subtitle: "Vertical line = designed duration"
   - Callout badge 3
   - Chart.js bar chart simulating a histogram. For each quest, generate a distribution of ~20 histogram bins around the median with realistic spread using the P25/P75/P90 values.

   Histogram generation:

```javascript
function generateHistogramData(quest) {
  const bins = 20;
  const maxTime = quest.p90 * 1.3;
  const binWidth = maxTime / bins;
  const binLabels = Array.from({length: bins}, (_, i) =>
    ((i * binWidth).toFixed(1) + '-' + ((i + 1) * binWidth).toFixed(1) + 'm'));
  // Approximate a right-skewed distribution using the percentile data
  const median = quest.actualMedianMins;
  const sigma = (quest.p75 - quest.p25) / 1.35; // IQR to sigma approximation
  const counts = Array.from({length: bins}, (_, i) => {
    const binCenter = (i + 0.5) * binWidth;
    const z = (binCenter - median) / sigma;
    return Math.max(0, Math.round(quest.n * 0.15 * Math.exp(-0.5 * z * z) * (1 + 0.3 * z))); // slight right skew
  });
  return { binLabels, counts, designedBin: Math.floor(quest.designedMins / binWidth) };
}

function renderHistogram() {
  const quest = questData[selectedQuest];
  const hist = generateHistogramData(quest);
  document.getElementById('hist-title').textContent = 'Duration Distribution: ' + quest.name;

  if (window.histChart) window.histChart.destroy();
  const barColors = hist.counts.map((_, i) => i === hist.designedBin ? '#3152FF' : '#A93DA1');
  window.histChart = new Chart(document.getElementById('histogram-chart'), {
    type: 'bar',
    data: {
      labels: hist.binLabels,
      datasets: [{
        data: hist.counts,
        backgroundColor: barColors,
        borderRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        annotation: undefined // no plugin needed — we colour the designed bin differently
      },
      scales: {
        y: { title: { display: true, text: 'Players' } },
        x: { ticks: { maxRotation: 45, font: { size: 10 } } }
      }
    }
  });
}
```

   The designed-duration bin is coloured electric blue (#3152FF) to stand out against the magenta bars. Below the chart, add a legend note: "Blue bar = bin containing designed duration (X mins)".

6. **Annotations:**

```javascript
const annotations = {
  1: {
    title: 'Quest Timing Table',
    pillarHtml: '<span class="pill pill-a">ACQUISITION</span> <span class="pill pill-e">ENGAGEMENT</span>',
    text: 'Master reference for quest pacing. Delta % is the key column — positive means players take longer than designed, negative means shorter. P90 shows the worst-case experience. N shows sample size. Click any row to see its duration distribution below.',
    audience: 'Game Designers — pacing validation, difficulty tuning'
  },
  2: {
    title: 'Cumulative Pacing Chart',
    pillarHtml: '<span class="pill pill-a">ACQUISITION</span> <span class="pill pill-e">ENGAGEMENT</span>',
    text: 'Cumulative pacing comparison. Where the actual line (magenta) diverges above the designed line (blue dashed), the build is running behind schedule. Where it\'s below, players are progressing faster than intended. The gap grows where pacing issues compound across quests.',
    audience: 'Game Designers — cumulative pacing, build comparison'
  },
  3: {
    title: 'Duration Distribution',
    pillarHtml: '<span class="pill pill-a">ACQUISITION</span> <span class="pill pill-e">ENGAGEMENT</span>',
    text: 'Duration distribution for a single quest. A tight cluster around the median means consistent player experience. A long right tail means some players are getting stuck. The blue bar marks the bin containing the designed duration — shows how design intent maps to reality.',
    audience: 'Game Designers — difficulty spread, outlier detection'
  }
};
```

- [ ] **Step 2: Open in browser and verify**

Check: table renders with all 14 quests, Delta % column is colour-coded (Quest 3 and GP Mission 3 show bold red), clicking a row updates the histogram, cumulative chart shows clear divergence with shaded area between lines, annotations work. Sort by clicking column headers.

- [ ] **Step 3: Commit**

```bash
git add "Clients/Lighthouse Games/wireframes/05-ftue-quest-timing.html"
git commit -m "feat: Lighthouse FTUE quest timing wireframe with table, cumulative chart, histogram"
```

---

## Self-Review

**1. Spec coverage check:**
- [x] Progression Summary: tab-based vectors, funnel + time charts, custom engagement funnels ✓
- [x] SLT Overview: scorecards, trend charts, dashboard directory table ✓
- [x] FTUE Page 1: 4 scorecards, conversion bar chart, time-to-step bar chart ✓
- [x] FTUE Page 2: 6 scorecards, major step funnel (3 chart types), minor step drilldown ✓
- [x] FTUE Page 3: sortable table, dual-line cumulative chart, per-quest histogram ✓
- [x] Shared: nav header, filter bars, annotation system, AERM pills, audience badge, footer ✓
- [x] Mock data: realistic scale, deliberate pain points in Quest 3 and GP Mission 3 ✓
- [x] Standalone/shareable: all CDN, no build step, relative links ✓

**2. Placeholder scan:** No TBDs, TODOs, or "fill in later" found.

**3. Type consistency:** `questData` array structure consistent between table rendering, cumulative chart, and histogram. `annotations` object uses same shape across all files. `renderFunnel`/`renderTimeChart` function signatures consistent in Task 1. Chart.js config patterns consistent across all tasks.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-07-lighthouse-wireframes.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?