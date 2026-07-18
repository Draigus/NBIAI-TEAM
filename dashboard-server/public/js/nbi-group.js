// ==================== GROUPING ENGINE ====================
// Foundation 6. groupItems is pure (no DOM) so it can be unit-tested.
// Rendering helpers live below it.

function groupItems(items, opts) {
  if (!items || items.length === 0) return [];
  opts = opts || {};
  var getValue = opts.getValue || function(it) { return it[opts.field]; };
  var emptyLabel = opts.emptyLabel || 'None';

  var map = new Map();
  items.forEach(function(it) {
    var raw = getValue(it);
    var key = (raw === null || raw === undefined || raw === '') ? '__empty__' : String(raw);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  });

  var groups = [];
  map.forEach(function(groupedItems, key) {
    var label = key === '__empty__' ? emptyLabel : key;
    var stats = { count: groupedItems.length };
    if (typeof opts.aggregate === 'function') {
      var extra = opts.aggregate(groupedItems);
      for (var k in extra) stats[k] = extra[k];
    }
    groups.push({ key: key === '__empty__' ? label : key, label: label, items: groupedItems, stats: stats });
  });

  var sort = opts.sort || 'alpha';
  if (sort === 'alpha') groups.sort(function(a, b) { return a.label.localeCompare(b.label); });
  else if (sort === 'count-asc') groups.sort(function(a, b) { return a.stats.count - b.stats.count; });
  else if (sort === 'count-desc') groups.sort(function(a, b) { return b.stats.count - a.stats.count; });
  else if (sort === 'custom' && Array.isArray(opts.customOrder)) {
    groups.sort(function(a, b) {
      var ai = opts.customOrder.indexOf(a.key); var bi = opts.customOrder.indexOf(b.key);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }
  return groups;
}

// ---- Rendering (DOM side) ----

function groupCollapsed(section, groupKey) {
  return localStorage.getItem('groupCollapsed:' + section + ':' + groupKey) === '1';
}

function toggleGroupCollapse(section, groupKey) {
  var cur = groupCollapsed(section, groupKey);
  localStorage.setItem('groupCollapsed:' + section + ':' + groupKey, cur ? '0' : '1');
  var header = document.querySelector('.group-header[data-group-key="' + CSS.escape(groupKey) + '"][data-group-section="' + CSS.escape(section) + '"]');
  if (header) {
    var body = header.nextElementSibling;
    var nowCollapsed = !cur;
    header.setAttribute('data-collapsed', String(nowCollapsed));
    header.setAttribute('aria-expanded', String(!nowCollapsed));
    if (body && body.classList.contains('group-body')) body.style.display = nowCollapsed ? 'none' : '';
  }
}

/** Header row HTML for one group. Extra stats render as label:value chips.
 *  completionPct (0-100) renders as a mini progress bar when present. */
function renderGroupHeader(section, group) {
  var collapsed = groupCollapsed(section, group.key);
  var statsHtml = '<span class="group-header__count">' + group.stats.count + '</span>';
  if (group.stats.hours !== undefined) statsHtml += '<span class="group-header__stat">' + group.stats.hours + 'h</span>';
  if (group.stats.completionPct !== undefined) {
    statsHtml += '<span class="group-header__bar" title="' + Math.round(group.stats.completionPct) + '% complete"><span class="group-header__bar-fill" style="width:' + Math.round(group.stats.completionPct) + '%"></span></span>';
  }
  return '<button type="button" class="group-header" data-collapsed="' + collapsed + '" aria-expanded="' + !collapsed + '"' +
    ' data-group-key="' + esc(group.key) + '" data-group-section="' + esc(section) + '"' +
    ' data-action="_actToggleGroupCollapse" data-arg0="' + esc(section) + '" data-arg1="' + esc(group.key) + '">' +
    '<span class="group-header__chevron">' + (collapsed ? '▶' : '▼') + '</span>' +
    '<span class="group-header__label">' + esc(group.label) + '</span>' + statsHtml + '</button>';
}

/** Group-by <select> for a filter bar. onchange must be provided by the
 *  section (it owns its state + re-render). */
function buildGroupByDropdown(options, current, onchangeAttr) {
  var html = '<select class="group-by-select" aria-label="Group by" onchange="' + onchangeAttr + '">';
  html += '<option value="">Group: None</option>';
  options.forEach(function(o) {
    html += '<option value="' + esc(o.value) + '"' + (current === o.value ? ' selected' : '') + '>Group: ' + esc(o.label) + '</option>';
  });
  return html + '</select>';
}
