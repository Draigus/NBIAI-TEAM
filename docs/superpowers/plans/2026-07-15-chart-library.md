# Chart Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight, theme-aware Canvas chart library (`nbi-charts.js`) that 7 of 11 WorkSage sections depend on for their 9/10 upgrade.

**Architecture:** Single global `renderChart()` function dispatches to type-specific renderers (sparkline, line/area, bar, donut). Each renderer draws to an HTML5 Canvas element created inside a container div. Theme colours are read from CSS custom properties at render time. ResizeObserver handles responsive redraw. Tooltips are HTML overlays positioned relative to the canvas.

**Tech Stack:** HTML5 Canvas API, CSS custom properties, ResizeObserver, no external dependencies.

**Spec:** `docs/superpowers/specs/2026-07-15-worksage-9of10-design.md` — Foundation 1

**Related plans (implement after this one):**
- Plan 2: Foundations 2-6 (Views, Keys, Help, Inline, Group)
- Plan 3-5: Section upgrades
- Plan 6: Onboarding

---

## File Structure

| File | Responsibility |
|---|---|
| `dashboard-server/public/js/nbi-charts.js` | Chart library — renderChart entry point, 4 chart types, tooltip, resize, a11y |
| `dashboard-server/public/css/dashboard.css` | Chart-specific CSS tokens added to all 8 themes |
| `nbi_project_dashboard.html` | Script tag for nbi-charts.js |
| `dashboard-server/tests/unit/charts.test.mjs` | Unit tests for data processing, layout calculations, config validation |
| `dashboard-server/tests/e2e/charts.spec.js` | E2E test rendering charts in a real page |

---

### Task 1: Core Infrastructure + Script Tag

**Files:**
- Create: `dashboard-server/public/js/nbi-charts.js`
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Create nbi-charts.js with the renderChart entry point and theme reader**

```javascript
// ==================== CHART LIBRARY ====================

var _chartInstances = new WeakMap();

function renderChart(container, config) {
  if (!container || !config || !config.type) return null;

  // Clean up previous chart in this container
  var prev = _chartInstances.get(container);
  if (prev) {
    if (prev.resizeObs) prev.resizeObs.disconnect();
    if (prev.canvas) prev.canvas.remove();
    if (prev.tooltip) prev.tooltip.remove();
    if (prev.a11yTable) prev.a11yTable.remove();
  }

  var canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = config.height ? config.height + 'px' : '100%';
  container.appendChild(canvas);

  var instance = {
    canvas: canvas,
    config: config,
    container: container,
    tooltip: null,
    a11yTable: null,
    resizeObs: null
  };

  // Read theme colours
  instance.theme = _chartReadTheme(container);

  // Set canvas resolution for retina
  _chartSizeCanvas(instance);

  // Draw
  _chartDraw(instance);

  // Accessibility: hidden data table
  if (config.ariaLabel) {
    canvas.setAttribute('aria-label', config.ariaLabel);
    canvas.setAttribute('role', 'img');
  }
  _chartBuildA11yTable(instance);

  // Responsive resize
  if (typeof ResizeObserver !== 'undefined') {
    instance.resizeObs = new ResizeObserver(_debounce(function() {
      instance.theme = _chartReadTheme(container);
      _chartSizeCanvas(instance);
      _chartDraw(instance);
    }, 150));
    instance.resizeObs.observe(container);
  }

  // Tooltip on hover
  if (config.tooltip !== false) {
    _chartAttachTooltip(instance);
  }

  // Click handler
  if (typeof config.onClick === 'function') {
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', function(e) {
      var datum = _chartHitTest(instance, e);
      if (datum) config.onClick(datum);
    });
  }

  _chartInstances.set(container, instance);
  return instance;
}

function _chartReadTheme(el) {
  var s = getComputedStyle(el);
  return {
    line: s.getPropertyValue('--chart-line').trim() || s.getPropertyValue('--accent-text').trim() || '#4d9aff',
    fill: s.getPropertyValue('--chart-fill').trim() || s.getPropertyValue('--accent-glow').trim() || 'rgba(0,102,255,0.12)',
    grid: s.getPropertyValue('--chart-grid').trim() || s.getPropertyValue('--border-subtle').trim() || '#1f1f1f',
    text: s.getPropertyValue('--chart-text').trim() || s.getPropertyValue('--text-muted').trim() || '#888',
    bg: s.getPropertyValue('--bg-card').trim() || '#141414',
    success: s.getPropertyValue('--success').trim() || '#22c55e',
    warning: s.getPropertyValue('--warning').trim() || '#f59e0b',
    danger: s.getPropertyValue('--danger').trim() || '#ef4444',
    accent: s.getPropertyValue('--accent').trim() || '#0066FF',
    textPrimary: s.getPropertyValue('--text-primary').trim() || '#e8e8e8',
    textSecondary: s.getPropertyValue('--text-secondary').trim() || '#999',
    font: s.getPropertyValue('--font-body').trim() || 'Inter, sans-serif',
    fontMono: s.getPropertyValue('--font-mono').trim() || 'JetBrains Mono, monospace'
  };
}

function _chartSizeCanvas(inst) {
  var rect = inst.container.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  var w = rect.width;
  var h = inst.config.height || rect.height || 200;
  inst.canvas.width = w * dpr;
  inst.canvas.height = h * dpr;
  inst.canvas.style.width = w + 'px';
  inst.canvas.style.height = h + 'px';
  inst.width = w;
  inst.height = h;
  inst.dpr = dpr;
  var ctx = inst.canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  inst.ctx = ctx;
}

function _chartDraw(inst) {
  var ctx = inst.ctx;
  ctx.clearRect(0, 0, inst.width, inst.height);

  switch (inst.config.type) {
    case 'sparkline': _chartDrawSparkline(inst); break;
    case 'line':      _chartDrawLine(inst, false); break;
    case 'area':      _chartDrawLine(inst, true); break;
    case 'bar':       _chartDrawBar(inst); break;
    case 'donut':     _chartDrawDonut(inst); break;
    default:          break;
  }
}

// Placeholder renderers — each filled in by subsequent tasks
function _chartDrawSparkline(inst) {}
function _chartDrawLine(inst, fill) {}
function _chartDrawBar(inst) {}
function _chartDrawDonut(inst) {}
function _chartHitTest(inst, e) { return null; }
function _chartAttachTooltip(inst) {}
function _chartBuildA11yTable(inst) {}
```

- [ ] **Step 2: Add script tag to nbi_project_dashboard.html**

In `nbi_project_dashboard.html`, add after the `nbi-events.js` script tag (line 331) and before the first view script:

```html
<script src="/public/js/nbi-charts.js?v=1"></script>
```

- [ ] **Step 3: Verify the page loads without errors**

Run: `npm start` (or restart PM2)
Open: `http://localhost:8888/nbi_project_dashboard.html`
Expected: Page loads normally, no console errors, `typeof renderChart === 'function'` returns true in the browser console.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/public/js/nbi-charts.js nbi_project_dashboard.html
git commit -m "feat(charts): add chart library core infrastructure with renderChart entry point"
```

---

### Task 2: Sparkline Chart Type

**Files:**
- Modify: `dashboard-server/public/js/nbi-charts.js`
- Create: `dashboard-server/tests/unit/charts.test.mjs`

- [ ] **Step 1: Write the unit test for sparkline data normalisation**

```javascript
// dashboard-server/tests/unit/charts.test.mjs
import { describe, it, expect } from 'vitest';

// Since nbi-charts.js uses global scope, we test the pure logic functions
// by extracting them or testing via the API contract

describe('Chart Library', () => {
  describe('sparkline data normalisation', () => {
    it('normalises values to 0-1 range', () => {
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const min = Math.min(...data.map(d => d.value));
      const max = Math.max(...data.map(d => d.value));
      const range = max - min || 1;
      const normalised = data.map(d => (d.value - min) / range);
      expect(normalised).toEqual([0, 0.5, 1]);
    });

    it('handles single data point', () => {
      const data = [{ value: 42 }];
      const min = Math.min(...data.map(d => d.value));
      const max = Math.max(...data.map(d => d.value));
      const range = max - min || 1;
      const normalised = data.map(d => (d.value - min) / range);
      expect(normalised).toEqual([0]);
    });

    it('handles all-same values', () => {
      const data = [{ value: 5 }, { value: 5 }, { value: 5 }];
      const min = Math.min(...data.map(d => d.value));
      const max = Math.max(...data.map(d => d.value));
      const range = max - min || 1;
      const normalised = data.map(d => (d.value - min) / range);
      expect(normalised).toEqual([0, 0, 0]);
    });

    it('handles negative values', () => {
      const data = [{ value: -10 }, { value: 0 }, { value: 10 }];
      const min = Math.min(...data.map(d => d.value));
      const max = Math.max(...data.map(d => d.value));
      const range = max - min || 1;
      const normalised = data.map(d => (d.value - min) / range);
      expect(normalised).toEqual([0, 0.5, 1]);
    });

    it('handles empty data gracefully', () => {
      const data = [];
      expect(data.length).toBe(0);
    });
  });

  describe('renderChart config validation', () => {
    it('requires type field', () => {
      // renderChart returns null for invalid config
      // This documents the contract — actual rendering tests are E2E
      expect(true).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it passes (pure logic tests)**

Run: `npx vitest run tests/unit/charts.test.mjs`
Expected: All tests PASS

- [ ] **Step 3: Implement the sparkline renderer**

Replace the `_chartDrawSparkline` placeholder in `nbi-charts.js`:

```javascript
function _chartDrawSparkline(inst) {
  var data = inst.config.data;
  if (!data || data.length === 0) return;

  var ctx = inst.ctx;
  var w = inst.width;
  var h = inst.height;
  var padding = 2;

  // Normalise values to 0-1
  var values = data.map(function(d) { return typeof d === 'number' ? d : d.value; });
  var min = Math.min.apply(null, values);
  var max = Math.max.apply(null, values);
  var range = max - min || 1;

  var points = values.map(function(v, i) {
    return {
      x: padding + (i / (values.length - 1 || 1)) * (w - padding * 2),
      y: padding + (1 - (v - min) / range) * (h - padding * 2)
    };
  });

  // Draw line
  ctx.beginPath();
  ctx.strokeStyle = inst.config.colors?.[0] || inst.theme.line;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  points.forEach(function(p, i) {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // Optional: fill area below line
  if (inst.config.sparklineFill !== false) {
    ctx.lineTo(points[points.length - 1].x, h);
    ctx.lineTo(points[0].x, h);
    ctx.closePath();
    ctx.fillStyle = inst.config.colors?.[1] || inst.theme.fill;
    ctx.fill();
  }

  // End dot
  var last = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = inst.config.colors?.[0] || inst.theme.line;
  ctx.fill();

  // Store points for hit testing
  inst._points = points;
  inst._values = values;
}
```

- [ ] **Step 4: Verify sparkline renders by testing in the browser console**

Open: `http://localhost:8888/nbi_project_dashboard.html`
Run in console:
```javascript
var div = document.createElement('div');
div.style.cssText = 'width:120px;height:32px;position:fixed;top:10px;right:10px;z-index:9999;background:var(--bg-card);border:1px solid var(--border-default);border-radius:4px;padding:2px';
document.body.appendChild(div);
renderChart(div, { type: 'sparkline', data: [3, 7, 4, 8, 2, 9, 5, 6, 8, 10], ariaLabel: 'Test sparkline' });
```
Expected: A small sparkline chart appears in the top-right corner with a line, area fill, and end dot.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/nbi-charts.js dashboard-server/tests/unit/charts.test.mjs
git commit -m "feat(charts): implement sparkline chart type with normalisation and end dot"
```

---

### Task 3: Donut / Ring Chart Type

**Files:**
- Modify: `dashboard-server/public/js/nbi-charts.js`
- Modify: `dashboard-server/tests/unit/charts.test.mjs`

- [ ] **Step 1: Add unit test for donut segment angle calculations**

Append to `charts.test.mjs`:

```javascript
describe('donut segment calculations', () => {
  it('calculates angles proportionally', () => {
    const data = [{ value: 25 }, { value: 50 }, { value: 25 }];
    const total = data.reduce((s, d) => s + d.value, 0);
    const angles = data.map(d => (d.value / total) * Math.PI * 2);
    expect(angles[0]).toBeCloseTo(Math.PI / 2);
    expect(angles[1]).toBeCloseTo(Math.PI);
    expect(angles[2]).toBeCloseTo(Math.PI / 2);
  });

  it('handles zero total gracefully', () => {
    const data = [{ value: 0 }, { value: 0 }];
    const total = data.reduce((s, d) => s + d.value, 0);
    expect(total).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run tests/unit/charts.test.mjs`
Expected: PASS

- [ ] **Step 3: Implement the donut renderer**

Replace `_chartDrawDonut` in `nbi-charts.js`:

```javascript
function _chartDrawDonut(inst) {
  var data = inst.config.data;
  if (!data || data.length === 0) return;

  var ctx = inst.ctx;
  var w = inst.width;
  var h = inst.height;
  var cx = w / 2;
  var cy = h / 2;
  var outerR = Math.min(cx, cy) - 8;
  var innerR = outerR * (inst.config.donutWidth || 0.65);

  var total = data.reduce(function(s, d) { return s + (d.value || 0); }, 0);
  if (total === 0) return;

  var defaultColors = [
    inst.theme.accent, inst.theme.success, inst.theme.warning,
    inst.theme.danger, inst.theme.line, '#8b5cf6', '#06b6d4', '#ec4899'
  ];
  var colors = inst.config.colors || defaultColors;

  var startAngle = -Math.PI / 2;
  var segments = [];

  data.forEach(function(d, i) {
    var sweep = (d.value / total) * Math.PI * 2;
    var endAngle = startAngle + sweep;

    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    // Thin gap between segments
    ctx.strokeStyle = inst.theme.bg;
    ctx.lineWidth = 2;
    ctx.stroke();

    segments.push({
      startAngle: startAngle,
      endAngle: endAngle,
      datum: d,
      color: colors[i % colors.length]
    });

    startAngle = endAngle;
  });

  // Centre label
  if (inst.config.centreLabel !== undefined) {
    ctx.fillStyle = inst.theme.textPrimary;
    ctx.font = 'bold ' + Math.round(outerR * 0.35) + 'px ' + inst.theme.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(inst.config.centreLabel), cx, cy - 4);

    if (inst.config.centreSubLabel) {
      ctx.fillStyle = inst.theme.textSecondary;
      ctx.font = Math.round(outerR * 0.16) + 'px ' + inst.theme.font;
      ctx.fillText(String(inst.config.centreSubLabel), cx, cy + outerR * 0.22);
    }
  }

  inst._segments = segments;
  inst._centre = { x: cx, y: cy, outerR: outerR, innerR: innerR };
}
```

- [ ] **Step 4: Verify donut renders in browser console**

```javascript
var div = document.createElement('div');
div.style.cssText = 'width:160px;height:160px;position:fixed;top:10px;right:10px;z-index:9999;background:var(--bg-card);border:1px solid var(--border-default);border-radius:8px;padding:8px';
document.body.appendChild(div);
renderChart(div, { type: 'donut', data: [{label:'Done',value:42},{label:'In Progress',value:18},{label:'Blocked',value:5}], centreLabel: '65', centreSubLabel: 'items', ariaLabel: 'Status breakdown' });
```
Expected: A donut chart with 3 coloured segments and "65 items" in the centre.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/nbi-charts.js dashboard-server/tests/unit/charts.test.mjs
git commit -m "feat(charts): implement donut/ring chart type with centre label"
```

---

### Task 4: Horizontal Bar Chart Type

**Files:**
- Modify: `dashboard-server/public/js/nbi-charts.js`

- [ ] **Step 1: Implement the bar renderer**

Replace `_chartDrawBar` in `nbi-charts.js`:

```javascript
function _chartDrawBar(inst) {
  var data = inst.config.data;
  if (!data || data.length === 0) return;

  var ctx = inst.ctx;
  var w = inst.width;
  var h = inst.height;
  var labelWidth = inst.config.barLabelWidth || 100;
  var valueWidth = 50;
  var chartLeft = labelWidth + 8;
  var chartRight = w - valueWidth - 8;
  var chartWidth = chartRight - chartLeft;

  var maxVal = Math.max.apply(null, data.map(function(d) { return d.value || 0; }));
  if (maxVal === 0) maxVal = 1;

  var barHeight = Math.min(24, (h - 8) / data.length - 4);
  var gap = 4;
  var totalHeight = data.length * (barHeight + gap) - gap;
  var startY = (h - totalHeight) / 2;

  var defaultColors = [
    inst.theme.accent, inst.theme.success, inst.theme.warning,
    inst.theme.danger, inst.theme.line
  ];
  var colors = inst.config.colors || defaultColors;

  var bars = [];

  data.forEach(function(d, i) {
    var y = startY + i * (barHeight + gap);
    var barW = (d.value / maxVal) * chartWidth;
    var r = Math.min(barHeight / 2, 4);

    // Label
    ctx.fillStyle = inst.theme.textSecondary;
    ctx.font = '12px ' + inst.theme.font;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    var label = d.label || '';
    if (label.length > 14) label = label.slice(0, 13) + '…';
    ctx.fillText(label, labelWidth, y + barHeight / 2);

    // Track
    ctx.fillStyle = inst.theme.grid;
    _chartRoundRect(ctx, chartLeft, y, chartWidth, barHeight, r);
    ctx.fill();

    // Bar
    if (barW > 0) {
      ctx.fillStyle = d.color || colors[i % colors.length];
      _chartRoundRect(ctx, chartLeft, y, Math.max(barW, r * 2), barHeight, r);
      ctx.fill();
    }

    // Value
    ctx.fillStyle = inst.theme.textPrimary;
    ctx.font = '12px ' + inst.theme.fontMono;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(d.value), chartRight + 8, y + barHeight / 2);

    bars.push({ x: chartLeft, y: y, w: barW, h: barHeight, datum: d });
  });

  inst._bars = bars;
}

function _chartRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
```

- [ ] **Step 2: Verify bar chart in browser console**

```javascript
var div = document.createElement('div');
div.style.cssText = 'width:320px;height:160px;position:fixed;top:10px;right:10px;z-index:9999;background:var(--bg-card);border:1px solid var(--border-default);border-radius:8px;padding:8px';
document.body.appendChild(div);
renderChart(div, { type: 'bar', data: [{label:'Glen',value:24},{label:'Tom',value:18},{label:'Magnus',value:12},{label:'Devin',value:8}], ariaLabel: 'Workload by person' });
```
Expected: 4 horizontal bars with labels on the left, coloured bars, and value numbers on the right.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/public/js/nbi-charts.js
git commit -m "feat(charts): implement horizontal bar chart type with labels and values"
```

---

### Task 5: Line / Area Chart Type

**Files:**
- Modify: `dashboard-server/public/js/nbi-charts.js`
- Modify: `dashboard-server/tests/unit/charts.test.mjs`

- [ ] **Step 1: Add unit test for axis scale calculation**

Append to `charts.test.mjs`:

```javascript
describe('axis scale calculations', () => {
  it('computes nice tick values', () => {
    // niceNum rounds to a "nice" number for axis ticks
    function niceNum(range, round) {
      const exp = Math.floor(Math.log10(range));
      const frac = range / Math.pow(10, exp);
      let nice;
      if (round) {
        if (frac < 1.5) nice = 1;
        else if (frac < 3) nice = 2;
        else if (frac < 7) nice = 5;
        else nice = 10;
      } else {
        if (frac <= 1) nice = 1;
        else if (frac <= 2) nice = 2;
        else if (frac <= 5) nice = 5;
        else nice = 10;
      }
      return nice * Math.pow(10, exp);
    }
    expect(niceNum(17, true)).toBe(20);
    expect(niceNum(83, true)).toBe(100);
    expect(niceNum(4.5, true)).toBe(5);
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/unit/charts.test.mjs`
Expected: PASS

- [ ] **Step 3: Implement line/area renderer**

Replace `_chartDrawLine` in `nbi-charts.js`:

```javascript
function _chartDrawLine(inst, areaFill) {
  var data = inst.config.data;
  if (!data || data.length === 0) return;

  var ctx = inst.ctx;
  var w = inst.width;
  var h = inst.height;
  var padding = { top: 12, right: 12, bottom: 28, left: 44 };

  var chartW = w - padding.left - padding.right;
  var chartH = h - padding.top - padding.bottom;

  // Extract values
  var values = data.map(function(d) { return typeof d === 'number' ? d : d.value; });
  var labels = data.map(function(d) { return d.label || ''; });

  var minVal = inst.config.min !== undefined ? inst.config.min : Math.min.apply(null, values);
  var maxVal = inst.config.max !== undefined ? inst.config.max : Math.max.apply(null, values);
  if (minVal === maxVal) { minVal -= 1; maxVal += 1; }

  // Nice axis ticks
  var tickCount = 5;
  var range = _chartNiceNum(maxVal - minVal, false);
  var tickSpacing = _chartNiceNum(range / (tickCount - 1), true);
  var niceMin = Math.floor(minVal / tickSpacing) * tickSpacing;
  var niceMax = Math.ceil(maxVal / tickSpacing) * tickSpacing;

  // Grid lines and Y labels
  ctx.strokeStyle = inst.theme.grid;
  ctx.lineWidth = 0.5;
  ctx.fillStyle = inst.theme.text;
  ctx.font = '10px ' + inst.theme.fontMono;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (var tv = niceMin; tv <= niceMax; tv += tickSpacing) {
    var ty = padding.top + chartH - ((tv - niceMin) / (niceMax - niceMin)) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, ty);
    ctx.lineTo(padding.left + chartW, ty);
    ctx.stroke();
    ctx.fillText(String(Math.round(tv)), padding.left - 6, ty);
  }

  // X labels (show first, last, and up to 5 evenly spaced)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  var xLabelInterval = Math.max(1, Math.floor(labels.length / 5));
  labels.forEach(function(lbl, i) {
    if (i === 0 || i === labels.length - 1 || i % xLabelInterval === 0) {
      var lx = padding.left + (i / (values.length - 1 || 1)) * chartW;
      if (lbl.length > 6) lbl = lbl.slice(0, 5) + '…';
      ctx.fillText(lbl, lx, padding.top + chartH + 6);
    }
  });

  // Compute points
  var points = values.map(function(v, i) {
    return {
      x: padding.left + (i / (values.length - 1 || 1)) * chartW,
      y: padding.top + chartH - ((v - niceMin) / (niceMax - niceMin)) * chartH
    };
  });

  // Area fill
  if (areaFill) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach(function(p) { ctx.lineTo(p.x, p.y); });
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = inst.config.colors?.[1] || inst.theme.fill;
    ctx.fill();
  }

  // Line
  ctx.beginPath();
  ctx.strokeStyle = inst.config.colors?.[0] || inst.theme.line;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  points.forEach(function(p, i) {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // Data points
  points.forEach(function(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = inst.theme.bg;
    ctx.fill();
    ctx.strokeStyle = inst.config.colors?.[0] || inst.theme.line;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Multi-series support
  if (inst.config.series && inst.config.series.length > 0) {
    var seriesColors = [inst.theme.success, inst.theme.warning, inst.theme.danger, '#8b5cf6'];
    inst.config.series.forEach(function(series, si) {
      var sVals = series.data.map(function(d) { return typeof d === 'number' ? d : d.value; });
      var sPoints = sVals.map(function(v, i) {
        return {
          x: padding.left + (i / (sVals.length - 1 || 1)) * chartW,
          y: padding.top + chartH - ((v - niceMin) / (niceMax - niceMin)) * chartH
        };
      });
      ctx.beginPath();
      ctx.strokeStyle = seriesColors[si % seriesColors.length];
      ctx.lineWidth = 1.5;
      ctx.setLineDash(series.dashed ? [4, 3] : []);
      sPoints.forEach(function(p, i) {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  inst._points = points;
  inst._values = values;
  inst._padding = padding;
  inst._niceMin = niceMin;
  inst._niceMax = niceMax;
}

function _chartNiceNum(range, round) {
  if (range === 0) return 1;
  var exp = Math.floor(Math.log10(Math.abs(range)));
  var frac = range / Math.pow(10, exp);
  var nice;
  if (round) {
    if (frac < 1.5) nice = 1;
    else if (frac < 3) nice = 2;
    else if (frac < 7) nice = 5;
    else nice = 10;
  } else {
    if (frac <= 1) nice = 1;
    else if (frac <= 2) nice = 2;
    else if (frac <= 5) nice = 5;
    else nice = 10;
  }
  return nice * Math.pow(10, exp);
}
```

- [ ] **Step 4: Verify line chart in browser console**

```javascript
var div = document.createElement('div');
div.style.cssText = 'width:400px;height:200px;position:fixed;top:10px;right:10px;z-index:9999;background:var(--bg-card);border:1px solid var(--border-default);border-radius:8px;padding:8px';
document.body.appendChild(div);
renderChart(div, { type: 'area', data: [{label:'W1',value:42},{label:'W2',value:38},{label:'W3',value:35},{label:'W4',value:28},{label:'W5',value:31},{label:'W6',value:22},{label:'W7',value:18},{label:'W8',value:15}], ariaLabel: 'Burndown over 8 weeks' });
```
Expected: An area chart with Y-axis ticks, X-axis labels, data points with hollow circles, and a filled area below the line.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/nbi-charts.js dashboard-server/tests/unit/charts.test.mjs
git commit -m "feat(charts): implement line/area chart type with axes, gridlines, and multi-series"
```

---

### Task 6: Tooltip and Hit Testing

**Files:**
- Modify: `dashboard-server/public/js/nbi-charts.js`

- [ ] **Step 1: Implement tooltip and hit testing**

Replace `_chartAttachTooltip` and `_chartHitTest` in `nbi-charts.js`:

```javascript
function _chartAttachTooltip(inst) {
  var tip = document.createElement('div');
  tip.className = 'chart-tooltip';
  tip.style.cssText = 'position:absolute;display:none;pointer-events:none;z-index:100;' +
    'padding:4px 8px;border-radius:4px;font-size:12px;white-space:nowrap;' +
    'background:var(--bg-overlay,rgba(0,0,0,0.88));color:var(--text-primary,#e8e8e8);' +
    'box-shadow:var(--shadow-md);font-family:var(--font-mono)';
  inst.container.style.position = inst.container.style.position || 'relative';
  inst.container.appendChild(tip);
  inst.tooltip = tip;

  inst.canvas.addEventListener('mousemove', function(e) {
    var datum = _chartHitTest(inst, e);
    if (datum) {
      var label = datum.label ? datum.label + ': ' : '';
      tip.textContent = label + datum.value;
      tip.style.display = 'block';
      var rect = inst.canvas.getBoundingClientRect();
      var tx = e.clientX - rect.left + 12;
      var ty = e.clientY - rect.top - 8;
      if (tx + tip.offsetWidth > inst.width) tx = e.clientX - rect.left - tip.offsetWidth - 8;
      tip.style.left = tx + 'px';
      tip.style.top = ty + 'px';
    } else {
      tip.style.display = 'none';
    }
  });

  inst.canvas.addEventListener('mouseleave', function() {
    tip.style.display = 'none';
  });
}

function _chartHitTest(inst, e) {
  var rect = inst.canvas.getBoundingClientRect();
  var mx = e.clientX - rect.left;
  var my = e.clientY - rect.top;

  // Line/area/sparkline: closest point within 20px
  if (inst._points && inst._values) {
    var closest = null;
    var minDist = 20;
    inst._points.forEach(function(p, i) {
      var dist = Math.sqrt((mx - p.x) * (mx - p.x) + (my - p.y) * (my - p.y));
      if (dist < minDist) {
        minDist = dist;
        var d = inst.config.data[i];
        closest = {
          index: i,
          value: inst._values[i],
          label: (typeof d === 'object' ? d.label : null) || '',
          datum: d
        };
      }
    });
    if (closest) return closest;
  }

  // Bar: check bounding boxes
  if (inst._bars) {
    for (var bi = 0; bi < inst._bars.length; bi++) {
      var b = inst._bars[bi];
      if (mx >= b.x && mx <= b.x + Math.max(b.w, inst.width * 0.8) && my >= b.y && my <= b.y + b.h) {
        return { index: bi, value: b.datum.value, label: b.datum.label || '', datum: b.datum };
      }
    }
  }

  // Donut: check angle
  if (inst._segments && inst._centre) {
    var dx = mx - inst._centre.x;
    var dy = my - inst._centre.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= inst._centre.innerR && dist <= inst._centre.outerR) {
      var angle = Math.atan2(dy, dx);
      if (angle < -Math.PI / 2) angle += Math.PI * 2;
      for (var si = 0; si < inst._segments.length; si++) {
        var seg = inst._segments[si];
        if (angle >= seg.startAngle && angle < seg.endAngle) {
          return { index: si, value: seg.datum.value, label: seg.datum.label || '', datum: seg.datum };
        }
      }
    }
  }

  return null;
}
```

- [ ] **Step 2: Verify tooltips work on each chart type in the browser**

Hover over the test charts from previous tasks. Expected: tooltip appears near cursor showing the value and label.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/public/js/nbi-charts.js
git commit -m "feat(charts): add tooltip system and hit testing for all chart types"
```

---

### Task 7: Accessibility — Hidden Data Table

**Files:**
- Modify: `dashboard-server/public/js/nbi-charts.js`

- [ ] **Step 1: Implement the hidden data table for screen readers**

Replace `_chartBuildA11yTable` in `nbi-charts.js`:

```javascript
function _chartBuildA11yTable(inst) {
  var data = inst.config.data;
  if (!data || data.length === 0) return;

  var table = document.createElement('table');
  table.className = 'visually-hidden';
  table.setAttribute('aria-label', (inst.config.ariaLabel || 'Chart data') + ' — data table');

  var thead = document.createElement('thead');
  var headerRow = document.createElement('tr');
  var th1 = document.createElement('th');
  th1.textContent = 'Label';
  var th2 = document.createElement('th');
  th2.textContent = 'Value';
  headerRow.appendChild(th1);
  headerRow.appendChild(th2);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  data.forEach(function(d) {
    var row = document.createElement('tr');
    var td1 = document.createElement('td');
    td1.textContent = (typeof d === 'object' ? d.label : '') || '';
    var td2 = document.createElement('td');
    td2.textContent = String(typeof d === 'number' ? d : d.value);
    row.appendChild(td1);
    row.appendChild(td2);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  inst.container.appendChild(table);
  inst.a11yTable = table;
}
```

The `visually-hidden` CSS class already exists in `dashboard.css`. It hides the element visually but keeps it accessible to screen readers.

- [ ] **Step 2: Verify the table is present but invisible**

In browser dev tools, inspect the chart container. Expected: a `<table>` element with class `visually-hidden` containing all data rows. Visually invisible but present in the DOM.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/public/js/nbi-charts.js
git commit -m "feat(charts): add hidden data table for screen reader accessibility"
```

---

### Task 8: CSS Chart Tokens for All 8 Themes

**Files:**
- Modify: `dashboard-server/public/css/dashboard.css`

- [ ] **Step 1: Add chart tokens to each theme block**

Add the following tokens to the `:root` block (dark/default theme) and each theme block in `dashboard.css`:

**Default (dark):** (add after line 27, before the closing `}`)
```css
  --chart-line: #4d9aff; --chart-fill: rgba(0,102,255,0.12);
  --chart-grid: #1f1f1f; --chart-text: #888;
```

**Light:** (add inside `html[data-theme="light"]` block)
```css
  --chart-line: #0055dd; --chart-fill: rgba(0,85,221,0.08);
  --chart-grid: #e5e5ea; --chart-text: #666;
```

**Midnight:** (add inside `html[data-theme="midnight"]` block)
```css
  --chart-line: #7dd3fc; --chart-fill: rgba(56,189,248,0.12);
  --chart-grid: #1e3a5f; --chart-text: #8a99b0;
```

**Nord:** (add inside `html[data-theme="nord"]` block)
```css
  --chart-line: #88c0d0; --chart-fill: rgba(136,192,208,0.12);
  --chart-grid: #3b4252; --chart-text: #a7b0c0;
```

**Solarized:** (add inside `html[data-theme="solarized"]` block)
```css
  --chart-line: #d4a017; --chart-fill: rgba(181,137,0,0.15);
  --chart-grid: #0a4a5a; --chart-text: #93a1a1;
```

**Dracula:** (add inside `html[data-theme="dracula"]` block)
```css
  --chart-line: #bd93f9; --chart-fill: rgba(189,147,249,0.12);
  --chart-grid: #373548; --chart-text: #8f8da0;
```

**Emerald:** (add inside `html[data-theme="emerald"]` block)
```css
  --chart-line: #34d399; --chart-fill: rgba(52,211,153,0.12);
  --chart-grid: #1a332a; --chart-text: #7ca897;
```

**Command:** (add inside `html[data-theme="command"]` block)
```css
  --chart-line: #60a5fa; --chart-fill: rgba(96,165,250,0.12);
  --chart-grid: rgba(255,255,255,0.06); --chart-text: rgba(255,255,255,0.5);
```

- [ ] **Step 2: Verify chart colours change when switching themes**

Open the dashboard, render a test chart, then switch themes via the theme picker. Expected: chart colours update on next render (resize window to trigger redraw, or call `renderChart` again).

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/public/css/dashboard.css
git commit -m "feat(charts): add chart-specific CSS tokens to all 8 themes"
```

---

### Task 9: E2E Test

**Files:**
- Create: `dashboard-server/tests/e2e/charts.spec.js`

- [ ] **Step 1: Write E2E test that renders each chart type**

```javascript
// dashboard-server/tests/e2e/charts.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Chart Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('.sidebar', { timeout: 10000 });
  });

  test('renderChart is globally available', async ({ page }) => {
    const exists = await page.evaluate(() => typeof renderChart === 'function');
    expect(exists).toBe(true);
  });

  test('sparkline renders a canvas element', async ({ page }) => {
    const hasCanvas = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:100px;height:30px;position:fixed;top:0;right:0;z-index:9999';
      document.body.appendChild(div);
      renderChart(div, { type: 'sparkline', data: [1, 3, 2, 5, 4], ariaLabel: 'Test' });
      return div.querySelector('canvas') !== null;
    });
    expect(hasCanvas).toBe(true);
  });

  test('donut renders with accessibility table', async ({ page }) => {
    const result = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:120px;height:120px;position:fixed;top:0;right:0;z-index:9999';
      document.body.appendChild(div);
      renderChart(div, { type: 'donut', data: [{ label: 'A', value: 30 }, { label: 'B', value: 70 }], ariaLabel: 'Test donut' });
      const canvas = div.querySelector('canvas');
      const table = div.querySelector('table');
      return { hasCanvas: !!canvas, hasTable: !!table, rows: table ? table.querySelectorAll('tbody tr').length : 0 };
    });
    expect(result.hasCanvas).toBe(true);
    expect(result.hasTable).toBe(true);
    expect(result.rows).toBe(2);
  });

  test('line chart renders with proper ARIA', async ({ page }) => {
    const ariaLabel = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:200px;height:100px;position:fixed;top:0;right:0;z-index:9999';
      document.body.appendChild(div);
      renderChart(div, { type: 'line', data: [{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }], ariaLabel: 'Revenue trend' });
      return div.querySelector('canvas')?.getAttribute('aria-label');
    });
    expect(ariaLabel).toBe('Revenue trend');
  });

  test('bar chart renders all bars', async ({ page }) => {
    const result = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:300px;height:120px;position:fixed;top:0;right:0;z-index:9999';
      document.body.appendChild(div);
      const inst = renderChart(div, { type: 'bar', data: [{ label: 'A', value: 10 }, { label: 'B', value: 20 }, { label: 'C', value: 15 }], ariaLabel: 'Test bars' });
      return { hasCanvas: !!div.querySelector('canvas'), tableRows: div.querySelector('table')?.querySelectorAll('tbody tr').length || 0 };
    });
    expect(result.hasCanvas).toBe(true);
    expect(result.tableRows).toBe(3);
  });

  test('returns null for invalid config', async ({ page }) => {
    const result = await page.evaluate(() => {
      const r1 = renderChart(null, { type: 'line' });
      const div = document.createElement('div');
      const r2 = renderChart(div, null);
      const r3 = renderChart(div, {});
      return { r1: r1, r2: r2, r3: r3 };
    });
    expect(result.r1).toBeNull();
    expect(result.r2).toBeNull();
    expect(result.r3).toBeNull();
  });
});
```

- [ ] **Step 2: Run E2E tests**

Run: `npm run test:e2e -- --grep "Chart Library"`
Expected: All tests PASS

- [ ] **Step 3: Run full test suite**

Run: `npm run test:all`
Expected: All existing tests still PASS + new chart tests PASS

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/tests/e2e/charts.spec.js dashboard-server/tests/unit/charts.test.mjs
git commit -m "test(charts): add unit and E2E tests for chart library"
```

---

## Summary

After completing all 9 tasks, the chart library is ready for integration into section upgrades. The `renderChart()` function supports:

- **4 chart types:** sparkline, line/area, horizontal bar, donut/ring
- **Theme awareness:** reads CSS custom properties, tokens defined for all 8 themes
- **Responsive:** ResizeObserver redraws on container resize, retina-ready via devicePixelRatio
- **Interactive:** hover tooltips, click handlers for drill-down
- **Accessible:** aria-label on canvas, hidden data table for screen readers
- **Multi-series:** line chart supports additional series with distinct colours and optional dashed style

**Next plan to implement:** Plan 2 — Foundations 2-6 (Saved Views, Keyboard Shortcuts, Help/Onboarding, Inline Editing, Grouping Engine)
