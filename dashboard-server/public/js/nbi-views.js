// ==================== SAVED VIEWS ====================
// Foundation 2 frontend. Each section calls viewsDropdownHtml() inside
// its filter bar and viewsInit() after render. State adapters:
//   getState(): plain object snapshot of the section's filter state
//   applyState(config): set state + re-render
var _viewsCache = {};     // section -> array of views
var _viewsActive = {};    // section -> active view id or null
var _viewsAdapters = {};  // section -> { getState, applyState }

function viewsRegister(section, adapter) { _viewsAdapters[section] = adapter; }

async function viewsLoad(section) {
  try {
    var views = await apiCall('/api/views?section=' + encodeURIComponent(section));
    _viewsCache[section] = views || [];
    return _viewsCache[section];
  } catch (e) { _viewsCache[section] = []; return []; }
}

function viewsDropdownHtml(section) {
  var views = _viewsCache[section] || [];
  var active = views.find(function(v) { return v.id === _viewsActive[section]; });
  var dirty = active && _viewsAdapters[section] &&
    JSON.stringify(_viewsAdapters[section].getState()) !== JSON.stringify(active.config);
  var label = active ? active.name : 'Views';
  return '<div class="views-dd" data-views-section="' + esc(section) + '">' +
    '<button class="btn btn--outline btn--sm views-dd__btn" data-action="_actViewsToggle" data-arg0="' + esc(section) + '">' +
    esc(label) + (dirty ? '<span class="views-dd__dirty" title="Unsaved filter changes"></span>' : '') +
    ' <span style="font-size:9px">▼</span></button>' +
    '<div class="views-dd__menu" style="display:none"></div></div>';
}

function _actViewsToggle(section) {
  var dd = document.querySelector('.views-dd[data-views-section="' + CSS.escape(section) + '"]');
  if (!dd) return;
  var menu = dd.querySelector('.views-dd__menu');
  if (menu.style.display !== 'none') { menu.style.display = 'none'; return; }
  var views = _viewsCache[section] || [];
  var own = views.filter(function(v) { return !v.is_shared; });
  var shared = views.filter(function(v) { return v.is_shared; });
  var html = '';
  if (shared.length) {
    html += '<div class="views-dd__hdr">Shared</div>';
    shared.forEach(function(v) { html += _viewsItemHtml(section, v); });
  }
  html += '<div class="views-dd__hdr">My views</div>';
  if (own.length === 0) html += '<div class="views-dd__empty">No saved views yet</div>';
  own.forEach(function(v) { html += _viewsItemHtml(section, v); });
  html += '<div class="views-dd__sep"></div>';
  if (_viewsActive[section]) {
    html += '<div class="views-dd__item" data-action="_actViewsSave" data-arg0="' + esc(section) + '">Save changes to current view</div>';
  }
  html += '<div class="views-dd__item" data-action="_actViewsSaveAs" data-arg0="' + esc(section) + '">Save current as...</div>';
  if (_viewsActive[section]) {
    html += '<div class="views-dd__item" data-action="_actViewsClear" data-arg0="' + esc(section) + '">Deactivate view</div>';
  }
  menu.innerHTML = html;
  menu.style.display = 'block';
  setTimeout(function() {
    document.addEventListener('click', function closer(e) {
      if (!dd.contains(e.target)) { menu.style.display = 'none'; document.removeEventListener('click', closer); }
    });
  }, 0);
}

function _viewsItemHtml(section, v) {
  var isActive = _viewsActive[section] === v.id;
  return '<div class="views-dd__item' + (isActive ? ' is-active' : '') + '" data-action="_actViewsApply" data-arg0="' + esc(section) + '" data-arg1="' + esc(v.id) + '">' +
    esc(v.name) + (v.is_default ? ' <span class="views-dd__badge">default</span>' : '') +
    '<span class="views-dd__item-actions">' +
    '<button title="Set as default" data-action="_actViewsSetDefault" data-arg0="' + esc(section) + '" data-arg1="' + esc(v.id) + '">★</button>' +
    '<button title="Rename" data-action="_actViewsRename" data-arg0="' + esc(section) + '" data-arg1="' + esc(v.id) + '">✎</button>' +
    '<button title="Delete" data-action="_actViewsDelete" data-arg0="' + esc(section) + '" data-arg1="' + esc(v.id) + '">×</button>' +
    '</span></div>';
}

function _actViewsApply(section, id) {
  var v = (_viewsCache[section] || []).find(function(x) { return x.id === id; });
  if (!v || !_viewsAdapters[section]) return;
  _viewsActive[section] = id;
  _viewsAdapters[section].applyState(v.config);
}

async function _actViewsSave(section) {
  var id = _viewsActive[section];
  if (!id || !_viewsAdapters[section]) return;
  try {
    var updated = await apiCall('/api/views/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: _viewsAdapters[section].getState() })
    });
    var views = _viewsCache[section];
    var idx = views.findIndex(function(v) { return v.id === id; });
    if (idx >= 0) views[idx] = updated;
    toast('View updated');
    _viewsRefreshButton(section);
  } catch (e) { toast('Failed to save view'); }
}

async function _actViewsSaveAs(section) {
  var name = prompt('Name for this view:');
  if (!name || !name.trim()) return;
  try {
    var created = await apiCall('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: section, name: name.trim(), config: _viewsAdapters[section].getState() })
    });
    (_viewsCache[section] = _viewsCache[section] || []).push(created);
    _viewsActive[section] = created.id;
    toast('View saved');
    _viewsRefreshButton(section);
  } catch (e) { toast('Failed to save view (duplicate name?)'); }
}

async function _actViewsSetDefault(section, id) {
  try {
    await apiCall('/api/views/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true })
    });
    await viewsLoad(section);
    _viewsRefreshButton(section);
    toast('Default view set');
  } catch (e) { toast('Failed to set default'); }
}

async function _actViewsRename(section, id) {
  var name = prompt('New name:');
  if (!name || !name.trim()) return;
  try {
    await apiCall('/api/views/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() })
    });
    await viewsLoad(section);
    _viewsRefreshButton(section);
  } catch (e) { toast('Failed to rename'); }
}

async function _actViewsDelete(section, id) {
  if (!confirm('Delete this view?')) return;
  try {
    await apiCall('/api/views/' + id, { method: 'DELETE' });
    if (_viewsActive[section] === id) _viewsActive[section] = null;
    await viewsLoad(section);
    _viewsRefreshButton(section);
  } catch (e) { toast('Failed to delete'); }
}

function _actViewsClear(section) {
  _viewsActive[section] = null;
  _viewsRefreshButton(section);
}

function _viewsRefreshButton(section) {
  var dd = document.querySelector('.views-dd[data-views-section="' + CSS.escape(section) + '"]');
  if (dd) dd.outerHTML = viewsDropdownHtml(section);
}

/** Call once per section on first render: loads views and auto-applies the default. */
async function viewsInit(section) {
  if (_viewsCache[section]) return;
  var views = await viewsLoad(section);
  var def = views.find(function(v) { return v.is_default; });
  if (def && _viewsAdapters[section] && !_viewsActive[section]) {
    _viewsActive[section] = def.id;
    _viewsAdapters[section].applyState(def.config);
  } else {
    _viewsRefreshButton(section);
  }
}
