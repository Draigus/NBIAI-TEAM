// ==================== CHART LIBRARY ====================

var _chartInstances = new WeakMap();

function renderChart(container, config) {
  if (!container || !config || !config.type) return null;

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

  instance.theme = _chartReadTheme(container);
  _chartSizeCanvas(instance);
  _chartDraw(instance);

  if (config.ariaLabel) {
    canvas.setAttribute('aria-label', config.ariaLabel);
    canvas.setAttribute('role', 'img');
  }
  _chartBuildA11yTable(instance);

  if (typeof ResizeObserver !== 'undefined') {
    instance.resizeObs = new ResizeObserver(_debounce(function() {
      instance.theme = _chartReadTheme(container);
      _chartSizeCanvas(instance);
      _chartDraw(instance);
    }, 150));
    instance.resizeObs.observe(container);
  }

  if (config.tooltip !== false) {
    _chartAttachTooltip(instance);
  }

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
  if (w <= 0) { inst.width = 0; inst.height = 0; return; }
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
  if (inst.width <= 0 || inst.height <= 0) return;
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

// ==================== SPARKLINE ====================

function _chartDrawSparkline(inst) {
  var data = inst.config.data;
  if (!data || data.length === 0) return;

  var ctx = inst.ctx;
  var w = inst.width;
  var h = inst.height;
  var padding = 2;

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

  ctx.beginPath();
  ctx.strokeStyle = inst.config.colors && inst.config.colors[0] ? inst.config.colors[0] : inst.theme.line;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  points.forEach(function(p, i) {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  if (inst.config.sparklineFill !== false) {
    ctx.lineTo(points[points.length - 1].x, h);
    ctx.lineTo(points[0].x, h);
    ctx.closePath();
    ctx.fillStyle = inst.config.colors && inst.config.colors[1] ? inst.config.colors[1] : inst.theme.fill;
    ctx.fill();
  }

  var last = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = inst.config.colors && inst.config.colors[0] ? inst.config.colors[0] : inst.theme.line;
  ctx.fill();

  inst._points = points;
  inst._values = values;
}

// ==================== DONUT / RING ====================

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

// ==================== HORIZONTAL BAR ====================

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

    ctx.fillStyle = inst.theme.textSecondary;
    ctx.font = '12px ' + inst.theme.font;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    var label = d.label || '';
    if (label.length > 14) label = label.slice(0, 13) + '…';
    ctx.fillText(label, labelWidth, y + barHeight / 2);

    ctx.fillStyle = inst.theme.grid;
    _chartRoundRect(ctx, chartLeft, y, chartWidth, barHeight, r);
    ctx.fill();

    if (barW > 0) {
      ctx.fillStyle = d.color || colors[i % colors.length];
      _chartRoundRect(ctx, chartLeft, y, Math.max(barW, r * 2), barHeight, r);
      ctx.fill();
    }

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

// ==================== LINE / AREA ====================

function _chartDrawLine(inst, areaFill) {
  var data = inst.config.data;
  if (!data || data.length === 0) return;

  var ctx = inst.ctx;
  var w = inst.width;
  var h = inst.height;
  var padding = { top: 12, right: 12, bottom: 28, left: 44 };

  var chartW = w - padding.left - padding.right;
  var chartH = h - padding.top - padding.bottom;

  var values = data.map(function(d) { return typeof d === 'number' ? d : d.value; });
  var labels = data.map(function(d) { return d.label || ''; });

  var minVal = inst.config.min !== undefined ? inst.config.min : Math.min.apply(null, values);
  var maxVal = inst.config.max !== undefined ? inst.config.max : Math.max.apply(null, values);
  if (minVal === maxVal) { minVal -= 1; maxVal += 1; }

  var tickCount = 5;
  var range = _chartNiceNum(maxVal - minVal, false);
  var tickSpacing = _chartNiceNum(range / (tickCount - 1), true);
  var niceMin = Math.floor(minVal / tickSpacing) * tickSpacing;
  var niceMax = Math.ceil(maxVal / tickSpacing) * tickSpacing;

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

  var points = values.map(function(v, i) {
    return {
      x: padding.left + (i / (values.length - 1 || 1)) * chartW,
      y: padding.top + chartH - ((v - niceMin) / (niceMax - niceMin)) * chartH
    };
  });

  if (areaFill) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach(function(p) { ctx.lineTo(p.x, p.y); });
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = inst.config.colors && inst.config.colors[1] ? inst.config.colors[1] : inst.theme.fill;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.strokeStyle = inst.config.colors && inst.config.colors[0] ? inst.config.colors[0] : inst.theme.line;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  points.forEach(function(p, i) {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  points.forEach(function(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = inst.theme.bg;
    ctx.fill();
    ctx.strokeStyle = inst.config.colors && inst.config.colors[0] ? inst.config.colors[0] : inst.theme.line;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

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

// ==================== TOOLTIP + HIT TESTING ====================

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

  if (inst._bars) {
    for (var bi = 0; bi < inst._bars.length; bi++) {
      var b = inst._bars[bi];
      if (mx >= b.x && mx <= b.x + Math.max(b.w, inst.width * 0.8) && my >= b.y && my <= b.y + b.h) {
        return { index: bi, value: b.datum.value, label: b.datum.label || '', datum: b.datum };
      }
    }
  }

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

// ==================== ACCESSIBILITY ====================

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
