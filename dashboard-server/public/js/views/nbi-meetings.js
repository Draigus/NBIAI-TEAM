// ==================== MEETINGS INTELLIGENCE TAB ====================

var _mtgData = null;
var _mtgSubTab = 'actions';
var _mtgFilters = JSON.parse(localStorage.getItem('ccMtgFilters') || '{}');
var _mtgEditingId = null;
var _mtgAddingSection = null;

function _ccRenderMeetingsTab() {
  var html = '<div class="cc-meetings" id="ccMeetingsRoot"><div class="cc-panel-empty">Loading meetings intelligence...</div></div>';
  setTimeout(function() { _mtgFetchAll(); }, 0);
  return html;
}

function _mtgFetchAll() {
  var el = document.getElementById('ccMeetingsRoot');
  if (!el) return;
  authFetch('/api/meetings/compiled').then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
    _mtgData = data;
    if (!_mtgData || !_mtgData.sections) {
      el.innerHTML = '<div class="cc-panel-empty">No meetings data compiled yet.<br><span style="font-size:12px;color:var(--text-secondary)">Run <code>/compile-meetings</code> in Claude Code to get started.</span></div>';
      return;
    }
    _mtgRender();
  }).catch(function() {
    el.innerHTML = '<div class="cc-panel-empty">Failed to load meetings data.</div>';
  });
}

function _mtgRender() {
  var el = document.getElementById('ccMeetingsRoot');
  if (!el || !_mtgData) return;
  el.innerHTML = _mtgRenderFull();
}

function _mtgRenderFull() {
  var d = _mtgData;
  var s = d.sections;
  var filtered = _mtgApplyFilters(s);
  var stats = _mtgCalcStats(d, filtered);
  var h = '';

  h += '<div class="cc-meetings-stats">';
  h += '<div class="cc-hstat"><span class="v">' + stats.meeting_count + '</span><span class="l">Meetings</span></div>';
  h += '<div class="cc-hstat"><span class="v">' + stats.days + '</span><span class="l">Days</span></div>';
  h += '<div class="cc-hstat' + (stats.open_actions > 5 ? ' warn' : '') + '"><span class="v">' + stats.open_actions + '</span><span class="l">Open Actions</span></div>';
  h += '<div class="cc-hstat"><span class="v">' + stats.decisions + '</span><span class="l">Decisions</span></div>';
  h += '<div class="cc-hstat"><span class="v">' + stats.people + '</span><span class="l">People</span></div>';
  var compiled = d.compiled_at ? new Date(d.compiled_at) : null;
  var ago = compiled ? Math.round((Date.now() - compiled) / 3600000) + 'h ago' : 'never';
  h += '<div class="cc-meetings-refresh"><span class="cc-meetings-compiled">Compiled ' + ago + '</span>';
  h += '<button class="cc-btn-sm" onclick="_mtgRefresh()">Refresh &#8635;</button></div>';
  h += '</div>';

  var subTabs = [
    { id: 'actions', label: 'Actions (' + filtered.actions.length + ')' },
    { id: 'decisions', label: 'Decisions (' + filtered.decisions.length + ')' },
    { id: 'people', label: 'People (' + filtered.people.length + ')' },
    { id: 'learnings', label: 'Learnings (' + filtered.learnings.length + ')' },
    { id: 'numbers', label: 'Numbers (' + filtered.numbers.length + ')' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'threads', label: 'Threads (' + filtered.threads.length + ')' },
    { id: 'sources', label: 'Sources (' + filtered.meetings.length + ')' }
  ];
  h += '<div class="cc-meetings-subtabs">';
  subTabs.forEach(function(t) {
    h += '<div class="cc-meetings-subtab' + (_mtgSubTab === t.id ? ' on' : '') + '" onclick="_mtgSwitchSub(\'' + t.id + '\')">' + t.label + '</div>';
  });
  h += '</div>';

  h += '<div class="cc-meetings-filters">';
  h += '<select onchange="_mtgSetFilter(\'workstream\',this.value)"><option value="">All workstreams</option>';
  ['couch_heroes', 'lighthouse', 'nbi', 'sarge', 'playgoals'].forEach(function(ws) {
    h += '<option value="' + ws + '"' + (_mtgFilters.workstream === ws ? ' selected' : '') + '>' + ws.replace(/_/g, ' ') + '</option>';
  });
  h += '</select>';
  if (_mtgSubTab === 'actions') {
    h += '<select onchange="_mtgSetFilter(\'status\',this.value)"><option value="">All statuses</option>';
    ['open', 'done', 'overdue'].forEach(function(st) {
      h += '<option value="' + st + '"' + (_mtgFilters.status === st ? ' selected' : '') + '>' + st + '</option>';
    });
    h += '</select>';
  }
  h += '<input type="text" class="cc-meetings-search" placeholder="Search..." value="' + esc(_mtgFilters.q || '') + '" onkeyup="_mtgSearchDebounce(this.value)">';
  if (Object.values(_mtgFilters).some(function(v) { return v; })) {
    h += '<button class="cc-btn-sm" onclick="_mtgClearFilters()">Clear</button>';
  }
  h += '</div>';

  h += '<div class="cc-meetings-content">' + _mtgRenderSubTab(filtered) + '</div>';
  return h;
}

function _mtgApplyFilters(sections) {
  var f = _mtgFilters;
  function matchWs(item) {
    if (!f.workstream) return true;
    if (Array.isArray(item.workstreams)) return item.workstreams.indexOf(f.workstream) >= 0;
    if (Array.isArray(item.workstream)) return item.workstream.indexOf(f.workstream) >= 0;
    return item.workstream === f.workstream;
  }
  function matchStatus(item) { return !f.status || item.status === f.status; }
  function matchQ(item) {
    if (!f.q) return true;
    return JSON.stringify(item).toLowerCase().indexOf(f.q.toLowerCase()) >= 0;
  }
  function matchAll(item) { return matchWs(item) && matchStatus(item) && matchQ(item); }
  function matchNoStatus(item) { return matchWs(item) && matchQ(item); }
  return {
    actions: (sections.actions || []).filter(matchAll),
    decisions: (sections.decisions || []).filter(matchNoStatus),
    people: (sections.people || []).filter(matchNoStatus),
    learnings: (sections.learnings || []).filter(matchNoStatus),
    numbers: (sections.numbers || []).filter(matchNoStatus),
    timeline: f.q ? (sections.timeline || []).filter(matchQ) : (sections.timeline || []),
    threads: (sections.threads || []).filter(matchNoStatus),
    meetings: (sections.meetings || []).filter(matchNoStatus)
  };
}

function _mtgCalcStats(data, filtered) {
  return {
    meeting_count: data.meeting_count || 0,
    days: data.date_range ? Math.round((new Date(data.date_range.end) - new Date(data.date_range.start)) / 86400000) : 0,
    open_actions: filtered.actions.filter(function(a) { return a.status === 'open'; }).length,
    decisions: filtered.decisions.length,
    people: filtered.people.length
  };
}

function _mtgSwitchSub(tab) {
  _mtgSubTab = tab;
  _mtgEditingId = null;
  _mtgAddingSection = null;
  if (tab !== 'actions') delete _mtgFilters.status;
  _mtgRender();
}

function _mtgSetFilter(key, val) {
  if (val) _mtgFilters[key] = val; else delete _mtgFilters[key];
  localStorage.setItem('ccMtgFilters', JSON.stringify(_mtgFilters));
  _mtgRender();
}

var _mtgSearchTimer;
function _mtgSearchDebounce(val) {
  clearTimeout(_mtgSearchTimer);
  _mtgSearchTimer = setTimeout(function() { _mtgSetFilter('q', val); }, 300);
}

function _mtgClearFilters() {
  _mtgFilters = {};
  localStorage.removeItem('ccMtgFilters');
  _mtgRender();
}

function _mtgRefresh() {
  _mtgFetchAll();
}

function _mtgRenderSubTab(filtered) {
  if (_mtgSubTab === 'actions') return _mtgRenderActions(filtered.actions);
  if (_mtgSubTab === 'decisions') return _mtgRenderDecisions(filtered.decisions);
  if (_mtgSubTab === 'people') return _mtgRenderPeople(filtered.people);
  if (_mtgSubTab === 'learnings') return _mtgRenderLearnings(filtered.learnings);
  if (_mtgSubTab === 'numbers') return _mtgRenderNumbers(filtered.numbers);
  if (_mtgSubTab === 'timeline') return _mtgRenderTimeline(filtered.timeline);
  if (_mtgSubTab === 'threads') return _mtgRenderThreads(filtered.threads);
  if (_mtgSubTab === 'sources') return _mtgRenderSources(filtered.meetings);
  return '';
}

// ——— EDIT FORM HELPERS ———

function _mtgFieldHtml(label, name, value, type, options) {
  var h = '<label>' + esc(label) + '</label>';
  if (type === 'select' && options) {
    h += '<select data-field="' + name + '">';
    options.forEach(function(o) { h += '<option value="' + esc(o) + '"' + (value === o ? ' selected' : '') + '>' + esc(o) + '</option>'; });
    h += '</select>';
  } else if (type === 'textarea') {
    h += '<textarea data-field="' + name + '">' + esc(value || '') + '</textarea>';
  } else {
    h += '<input type="text" data-field="' + name + '" value="' + esc(value || '') + '">';
  }
  return h;
}

function _mtgEditFormFields(section, data) {
  var ws = ['couch_heroes','lighthouse','nbi','sarge','playgoals'];
  var h = '';
  if (section === 'actions') {
    h += _mtgFieldHtml('Date', 'date', data.date, 'text');
    h += _mtgFieldHtml('Owner', 'owner', data.owner, 'text');
    h += _mtgFieldHtml('Description', 'description', data.description, 'text');
    h += _mtgFieldHtml('Workstream', 'workstream', data.workstream, 'select', ws);
    h += _mtgFieldHtml('Status', 'status', data.status, 'select', ['open','done','overdue']);
  } else if (section === 'decisions') {
    h += _mtgFieldHtml('Date', 'date', data.date, 'text');
    h += _mtgFieldHtml('Decision', 'decision', data.decision, 'text');
    h += _mtgFieldHtml('Rationale', 'rationale', data.rationale, 'text');
    h += _mtgFieldHtml('Workstream', 'workstream', data.workstream, 'select', ws);
  } else if (section === 'people') {
    h += _mtgFieldHtml('Name', 'name', data.name, 'text');
    h += _mtgFieldHtml('Role', 'role', data.role, 'text');
    h += _mtgFieldHtml('Workstreams (comma-separated)', 'workstreams', (data.workstreams || []).join(', '), 'text');
    h += _mtgFieldHtml('Notes (one per line)', 'notes', (data.notes || []).join('\n'), 'textarea');
  } else if (section === 'learnings') {
    h += _mtgFieldHtml('Date', 'date', data.date, 'text');
    h += _mtgFieldHtml('Insight', 'insight', data.insight, 'text');
    h += _mtgFieldHtml('Context', 'context', data.context, 'textarea');
    h += _mtgFieldHtml('Workstream', 'workstream', data.workstream, 'select', ws);
  } else if (section === 'numbers') {
    h += _mtgFieldHtml('Date', 'date', data.date, 'text');
    h += _mtgFieldHtml('Figure', 'figure', data.figure, 'text');
    h += _mtgFieldHtml('Context', 'context', data.context, 'text');
    h += _mtgFieldHtml('Workstream', 'workstream', data.workstream, 'select', ws);
    h += _mtgFieldHtml('Category', 'category', data.category, 'select', ['revenue','compensation','investment','cost','metric']);
  } else if (section === 'timeline') {
    h += _mtgFieldHtml('Period', 'period', data.period, 'text');
    h += _mtgFieldHtml('Label', 'label', data.label, 'text');
    h += _mtgFieldHtml('Summary', 'summary', data.summary, 'textarea');
  } else if (section === 'threads') {
    h += _mtgFieldHtml('Title', 'title', data.title, 'text');
    h += _mtgFieldHtml('Status', 'status', data.status, 'select', ['active','resolved']);
    h += _mtgFieldHtml('Summary', 'summary', data.summary, 'textarea');
    h += _mtgFieldHtml('Workstream', 'workstream', data.workstream, 'select', ws);
  } else if (section === 'meetings') {
    h += _mtgFieldHtml('Date', 'date', data.date, 'text');
    h += _mtgFieldHtml('Title', 'title', data.title, 'text');
    h += _mtgFieldHtml('Attendees (comma-separated)', 'attendees', (data.attendees || []).join(', '), 'text');
    h += _mtgFieldHtml('Workstream', 'workstream', data.workstream, 'select', ws);
    h += _mtgFieldHtml('Summary', 'summary', data.summary, 'textarea');
  }
  return h;
}

function _mtgReadFormData(formEl) {
  var data = {};
  formEl.querySelectorAll('[data-field]').forEach(function(el) {
    var key = el.getAttribute('data-field');
    var val = el.value;
    if (key === 'notes') {
      data[key] = val.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
    } else if (key === 'workstreams' || key === 'attendees') {
      data[key] = val.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
    } else {
      data[key] = val;
    }
  });
  return data;
}

function _mtgEditFormHtml(itemId, section, data) {
  var safeId = itemId ? itemId.replace(/[^a-zA-Z0-9]/g, '_') : 'new';
  var h = '<div class="cc-mtg-edit-row" id="mtgEditForm_' + safeId + '">';
  h += _mtgEditFormFields(section, data);
  h += '<div class="cc-mtg-edit-actions">';
  if (itemId) {
    h += '<button class="cc-btn-sm" onclick="_mtgSaveEdit(\'' + esc(itemId) + '\')">Save</button>';
    h += '<button class="cc-btn-sm" onclick="_mtgCancelEdit()">Cancel</button>';
    h += '<span class="del" onclick="_mtgDeleteItem(\'' + esc(itemId) + '\')">Delete</span>';
  } else {
    h += '<button class="cc-btn-sm" onclick="_mtgSaveAdd()">Save</button>';
    h += '<button class="cc-btn-sm" onclick="_mtgCancelEdit()">Cancel</button>';
  }
  h += '</div></div>';
  return h;
}

function _mtgStartEdit(itemId) { _mtgEditingId = itemId; _mtgAddingSection = null; _mtgRender(); }
function _mtgCancelEdit() { _mtgEditingId = null; _mtgAddingSection = null; _mtgRender(); }
function _mtgStartAdd() { _mtgAddingSection = _mtgSubTab; _mtgEditingId = null; _mtgRender(); }

function _mtgSaveEdit(itemId) {
  var formEl = document.getElementById('mtgEditForm_' + itemId.replace(/[^a-zA-Z0-9]/g, '_'));
  if (!formEl) return;
  var data = _mtgReadFormData(formEl);
  if (_mtgData && _mtgData.sections) {
    var arr = _mtgData.sections[_mtgSubTab] || [];
    var item = arr.find(function(a) { return a.id === itemId; });
    if (item) Object.assign(item, data);
  }
  _mtgEditingId = null;
  _mtgRender();
  authFetch('/api/meetings/items/' + encodeURIComponent(itemId), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: data })
  }).then(function(r) { if (!r.ok) { toast('Failed to save edit', 'error'); _mtgFetchAll(); } });
}

function _mtgSaveAdd() {
  var formEl = document.getElementById('mtgEditForm_new');
  if (!formEl) return;
  var data = _mtgReadFormData(formEl);
  var section = _mtgAddingSection;
  _mtgAddingSection = null;
  _mtgRender();
  authFetch('/api/meetings/items', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section: section, data: data })
  }).then(function(r) {
    if (!r.ok) { toast('Failed to add item', 'error'); return r.json().then(function(b) { toast(b.error || 'Validation error', 'error'); }); }
    return r.json();
  }).then(function(item) {
    if (!item || !item.id) return;
    if (_mtgData && _mtgData.sections) {
      if (!_mtgData.sections[section]) _mtgData.sections[section] = [];
      _mtgData.sections[section].unshift(item);
    }
    _mtgRender();
  });
}

function _mtgDeleteItem(itemId) {
  if (!confirm('Delete this item?')) return;
  if (_mtgData && _mtgData.sections) {
    _mtgData.sections[_mtgSubTab] = (_mtgData.sections[_mtgSubTab] || []).filter(function(a) { return a.id !== itemId; });
  }
  _mtgEditingId = null;
  _mtgRender();
  authFetch('/api/meetings/items/' + encodeURIComponent(itemId), { method: 'DELETE' }).then(function(r) {
    if (!r.ok) { toast('Failed to delete', 'error'); _mtgFetchAll(); }
  });
}

function _mtgCycleStatus(id, current) {
  var next = current === 'open' ? 'done' : current === 'done' ? 'overdue' : 'open';
  if (_mtgData && _mtgData.sections) {
    var a = _mtgData.sections.actions.find(function(x) { return x.id === id; });
    if (a) a.status = next;
    _mtgRender();
  }
  authFetch('/api/meetings/items/' + encodeURIComponent(id), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { status: next } })
  }).then(function(r) { if (!r.ok) { toast('Failed to update status', 'error'); _mtgFetchAll(); } });
}

function _mtgBadge(item) {
  return item.source === 'manual' ? '<span class="cc-mtg-badge">Manual</span>' : '';
}

function _mtgSrcChip(item) {
  if (item.source === 'manual' || !item.source_meeting_id) return '';
  var mtg = (_mtgData && _mtgData.sections && _mtgData.sections.meetings || []).find(function(m) { return m.id === item.source_meeting_id; });
  if (!mtg) return '';
  var label = (mtg.title || '').length > 30 ? (mtg.title || '').slice(0, 28) + '...' : (mtg.title || '');
  return ' <span class="cc-tag cc-tag--purple cc-mtg-src" onclick="event.stopPropagation();_mtgOpenMeeting(\'' + esc(item.source_meeting_id) + '\')">' + esc(label) + ' &middot; ' + esc(mtg.date || '') + '</span>';
}

function _mtgPeopleMtgChip(item) {
  if (!item.meeting_ids || !item.meeting_ids.length) return '';
  return ' <span class="cc-tag cc-tag--purple cc-mtg-src" onclick="event.stopPropagation();_mtgFilterSources(\'' + esc(item.id) + '\')">' + item.meeting_ids.length + ' meetings</span>';
}

// ——— SECTION RENDERERS (with edit/add/delete) ———

function _mtgRenderActions(actions) {
  var h = '<button class="cc-btn-sm cc-mtg-add-btn" onclick="_mtgStartAdd()">+ Add Action</button>';
  if (_mtgAddingSection === 'actions') h += _mtgEditFormHtml(null, 'actions', { date: new Date().toISOString().slice(0,10), status: 'open', workstream: 'nbi' });
  if (!actions.length && !_mtgAddingSection) return h + '<div class="cc-panel-empty">No actions match your filters.</div>';
  h += '<table class="cc-tbl"><thead><tr><th>Date</th><th>Owner</th><th>Action</th><th>Workstream</th><th>Status</th><th></th></tr></thead><tbody>';
  actions.forEach(function(a) {
    if (_mtgEditingId === a.id) { h += '<tr><td colspan="6">' + _mtgEditFormHtml(a.id, 'actions', a) + '</td></tr>'; return; }
    var cls = a.status === 'done' ? 'cc-tag--green' : a.status === 'overdue' ? 'cc-tag--red' : 'cc-tag--yellow';
    h += '<tr><td style="white-space:nowrap">' + esc(a.date || '') + '</td>';
    h += '<td>' + esc(a.owner || '') + '</td>';
    h += '<td>' + esc(a.description || '') + _mtgBadge(a) + _mtgSrcChip(a) + '</td>';
    h += '<td><span class="cc-tag cc-tag--blue">' + esc((a.workstream || '').replace(/_/g, ' ')) + '</span></td>';
    h += '<td><span class="cc-tag ' + cls + '" style="cursor:pointer" onclick="_mtgCycleStatus(\'' + esc(a.id) + '\',\'' + esc(a.status) + '\')">' + esc(a.status) + '</span></td>';
    h += '<td><span class="cc-mtg-edit-icon" onclick="_mtgStartEdit(\'' + esc(a.id) + '\')" title="Edit">&#9998;</span>';
    h += '<span class="cc-mtg-task-icon" onclick="_mtgCreateTask(\'' + esc(a.id) + '\')" title="Create task">&#128203;</span></td></tr>';
  });
  h += '</tbody></table>';
  return h;
}

function _mtgRenderDecisions(items) {
  var h = '<button class="cc-btn-sm cc-mtg-add-btn" onclick="_mtgStartAdd()">+ Add Decision</button>';
  if (_mtgAddingSection === 'decisions') h += _mtgEditFormHtml(null, 'decisions', { date: new Date().toISOString().slice(0,10), workstream: 'nbi' });
  if (!items.length && !_mtgAddingSection) return h + '<div class="cc-panel-empty">No decisions match your filters.</div>';
  h += '<table class="cc-tbl"><thead><tr><th>Date</th><th>Decision</th><th>Rationale</th><th>Workstream</th><th></th></tr></thead><tbody>';
  items.forEach(function(d) {
    if (_mtgEditingId === d.id) { h += '<tr><td colspan="5">' + _mtgEditFormHtml(d.id, 'decisions', d) + '</td></tr>'; return; }
    h += '<tr><td style="white-space:nowrap">' + esc(d.date || '') + '</td>';
    h += '<td>' + esc(d.decision || '') + _mtgBadge(d) + _mtgSrcChip(d) + '</td>';
    h += '<td style="color:var(--text-secondary)">' + esc(d.rationale || '') + '</td>';
    h += '<td><span class="cc-tag cc-tag--blue">' + esc((d.workstream || '').replace(/_/g, ' ')) + '</span></td>';
    h += '<td><span class="cc-mtg-edit-icon" onclick="_mtgStartEdit(\'' + esc(d.id) + '\')" title="Edit">&#9998;</span></td></tr>';
  });
  h += '</tbody></table>';
  return h;
}

function _mtgRenderPeople(items) {
  var h = '<button class="cc-btn-sm cc-mtg-add-btn" onclick="_mtgStartAdd()">+ Add Person</button>';
  if (_mtgAddingSection === 'people') h += _mtgEditFormHtml(null, 'people', { workstreams: ['nbi'] });
  if (!items.length && !_mtgAddingSection) return h + '<div class="cc-panel-empty">No people match your filters.</div>';
  h += '<div class="cc-meetings-people-grid">';
  items.forEach(function(p) {
    if (_mtgEditingId === p.id) { h += _mtgEditFormHtml(p.id, 'people', p); return; }
    h += '<div class="cc-card cc-meetings-person">';
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline">';
    h += '<strong style="color:var(--accent)">' + esc(p.name) + '</strong>' + _mtgBadge(p) + _mtgPeopleMtgChip(p);
    h += '<span style="font-size:12px;color:var(--text-secondary)"><span class="cc-mtg-edit-icon" onclick="_mtgStartEdit(\'' + esc(p.id) + '\')" title="Edit">&#9998;</span> Last: ' + esc(p.last_seen || '?') + '</span></div>';
    h += '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px">' + esc(p.role || '') + '</div>';
    if (p.workstreams) p.workstreams.forEach(function(ws) { h += '<span class="cc-tag cc-tag--blue" style="margin-right:4px">' + esc(ws.replace(/_/g, ' ')) + '</span>'; });
    if (p.notes && p.notes.length) {
      h += '<ul style="margin-top:8px;font-size:14px;padding-left:16px">';
      p.notes.forEach(function(n) { h += '<li>' + esc(n) + '</li>'; });
      h += '</ul>';
    }
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function _mtgRenderLearnings(items) {
  var h = '<button class="cc-btn-sm cc-mtg-add-btn" onclick="_mtgStartAdd()">+ Add Learning</button>';
  if (_mtgAddingSection === 'learnings') h += _mtgEditFormHtml(null, 'learnings', { date: new Date().toISOString().slice(0,10), workstream: 'nbi' });
  if (!items.length && !_mtgAddingSection) return h + '<div class="cc-panel-empty">No learnings match your filters.</div>';
  items.forEach(function(l) {
    if (_mtgEditingId === l.id) { h += _mtgEditFormHtml(l.id, 'learnings', l); return; }
    h += '<div class="cc-meetings-insight">';
    h += '<div style="display:flex;justify-content:space-between;margin-bottom:4px">';
    h += '<span style="font-size:12px;color:var(--text-secondary)">' + esc(l.date || '') + ' <span class="cc-mtg-edit-icon" onclick="_mtgStartEdit(\'' + esc(l.id) + '\')" title="Edit">&#9998;</span></span>';
    h += '<span class="cc-tag cc-tag--blue">' + esc((l.workstream || '').replace(/_/g, ' ')) + '</span></div>';
    h += '<strong>' + esc(l.insight) + '</strong>' + _mtgBadge(l) + _mtgSrcChip(l);
    h += '<div style="font-size:14px;color:var(--text-secondary);margin-top:4px">' + esc(l.context || '') + '</div></div>';
  });
  return h;
}

function _mtgRenderNumbers(items) {
  var h = '<button class="cc-btn-sm cc-mtg-add-btn" onclick="_mtgStartAdd()">+ Add Number</button>';
  if (_mtgAddingSection === 'numbers') h += _mtgEditFormHtml(null, 'numbers', { date: new Date().toISOString().slice(0,10), workstream: 'nbi', category: 'revenue' });
  if (!items.length && !_mtgAddingSection) return h + '<div class="cc-panel-empty">No numbers match your filters.</div>';
  var groups = {};
  items.forEach(function(n) { var c = n.category || 'other'; if (!groups[c]) groups[c] = []; groups[c].push(n); });
  Object.keys(groups).forEach(function(cat) {
    h += '<h4 style="margin:16px 0 8px;color:var(--text-secondary);text-transform:capitalize">' + esc(cat.replace(/_/g, ' ')) + '</h4>';
    h += '<table class="cc-tbl"><thead><tr><th>Date</th><th>Figure</th><th>Context</th><th>Workstream</th><th></th></tr></thead><tbody>';
    groups[cat].forEach(function(n) {
      if (_mtgEditingId === n.id) { h += '<tr><td colspan="5">' + _mtgEditFormHtml(n.id, 'numbers', n) + '</td></tr>'; return; }
      h += '<tr><td style="white-space:nowrap">' + esc(n.date || '') + '</td>';
      h += '<td style="color:var(--success);font-weight:700">' + esc(n.figure) + '</td>';
      h += '<td>' + esc(n.context || '') + _mtgBadge(n) + _mtgSrcChip(n) + '</td>';
      h += '<td><span class="cc-tag cc-tag--blue">' + esc((n.workstream || '').replace(/_/g, ' ')) + '</span></td>';
      h += '<td><span class="cc-mtg-edit-icon" onclick="_mtgStartEdit(\'' + esc(n.id) + '\')" title="Edit">&#9998;</span></td></tr>';
    });
    h += '</tbody></table>';
  });
  return h;
}

function _mtgRenderTimeline(items) {
  var h = '<button class="cc-btn-sm cc-mtg-add-btn" onclick="_mtgStartAdd()">+ Add Period</button>';
  if (_mtgAddingSection === 'timeline') h += _mtgEditFormHtml(null, 'timeline', {});
  if (!items.length && !_mtgAddingSection) return h + '<div class="cc-panel-empty">No timeline data.</div>';
  h += '<div class="cc-meetings-timeline">';
  items.forEach(function(t) {
    if (_mtgEditingId === t.id) { h += _mtgEditFormHtml(t.id, 'timeline', t); return; }
    h += '<div class="cc-meetings-tl-item"><div class="cc-meetings-tl-dot"></div>';
    h += '<div class="cc-meetings-tl-date">' + esc(t.period || '') + ' &mdash; ' + esc(t.label || '') + ' <span class="cc-mtg-edit-icon" onclick="_mtgStartEdit(\'' + esc(t.id) + '\')" title="Edit">&#9998;</span>' + _mtgBadge(t) + '</div>';
    h += '<div style="font-size:14px">' + esc(t.summary || '') + '</div></div>';
  });
  h += '</div>';
  return h;
}

function _mtgRenderThreads(items) {
  var h = '<button class="cc-btn-sm cc-mtg-add-btn" onclick="_mtgStartAdd()">+ Add Thread</button>';
  if (_mtgAddingSection === 'threads') h += _mtgEditFormHtml(null, 'threads', { status: 'active', workstream: 'nbi' });
  if (!items.length && !_mtgAddingSection) return h + '<div class="cc-panel-empty">No active threads.</div>';
  h += '<div class="cc-meetings-threads-grid">';
  items.forEach(function(t) {
    if (_mtgEditingId === t.id) { h += _mtgEditFormHtml(t.id, 'threads', t); return; }
    var cls = t.status === 'active' ? 'cc-tag--yellow' : 'cc-tag--green';
    h += '<div class="cc-card">';
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">';
    h += '<strong style="color:var(--warning)">' + esc(t.title) + '</strong>' + _mtgBadge(t);
    h += '<span><span class="cc-mtg-edit-icon" onclick="_mtgStartEdit(\'' + esc(t.id) + '\')" title="Edit">&#9998;</span> <span class="cc-tag ' + cls + '">' + esc(t.status) + '</span></span></div>';
    h += '<div style="font-size:14px">' + esc(t.summary || '') + '</div>';
    if (t.workstream) h += '<div style="margin-top:8px"><span class="cc-tag cc-tag--blue">' + esc(t.workstream.replace(/_/g, ' ')) + '</span></div>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

// ——— TASK CREATION FROM ACTIONS ———

var _WS_CLIENT_MAP = null;
function _mtgResolveClient(workstream) {
  if (!_WS_CLIENT_MAP) {
    _WS_CLIENT_MAP = {};
    var allClients = typeof getAllClients === 'function' ? getAllClients() : [];
    allClients.forEach(function(c) { _WS_CLIENT_MAP[c.toLowerCase().replace(/\s+/g, '_')] = c; });
  }
  return _WS_CLIENT_MAP[workstream] || null;
}

function _mtgCreateTask(actionId) {
  var action = null;
  if (_mtgData && _mtgData.sections && _mtgData.sections.actions) {
    action = _mtgData.sections.actions.find(function(a) { return a.id === actionId; });
  }
  if (!action) { toast('Action not found', 'error'); return; }
  var client = _mtgResolveClient(action.workstream || '');
  if (!client) {
    _pickClient('Select client for this task').then(function(c) { if (c) _mtgDoCreateTask(action, c); });
    return;
  }
  _mtgDoCreateTask(action, client);
}

function _mtgDoCreateTask(action, client) {
  var candidates = tasks.filter(function(t) {
    return getTaskClient(t) === client && ['project', 'feature', 'story'].indexOf(getItemType(t)) >= 0;
  }).sort(function(a, b) { return a.title.localeCompare(b.title); });

  if (candidates.length === 0) {
    var t = createTaskObject({ title: action.description || 'Meeting action', client: client, itemType: 'task',
      description: 'From meeting intelligence: ' + (action.date || '') + ' — ' + (action.owner || '') });
    tasks.push(t); markDirty(t.id); save(); renderSidebarCounts(); renderContent(); openDetail(t.id);
    _mtgMarkActionDone(action.id);
    return;
  }

  var html = '<div class="modal-overlay open" id="mtgParentPickerModal" role="dialog" aria-modal="true" onclick="if(event.target===this)this.remove()">';
  html += '<div class="modal" style="max-width:500px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  html += '<h2 style="margin:0;font-size:16px">Create task under...</h2>';
  html += '<button class="btn btn--ghost" onclick="document.getElementById(\'mtgParentPickerModal\').remove()">&times;</button></div>';
  html += '<div style="max-height:400px;overflow-y:auto;border:1px solid var(--border-default);border-radius:6px">';
  candidates.forEach(function(c) {
    var indent = getItemType(c) === 'project' ? 0 : getItemType(c) === 'feature' ? 1 : 2;
    html += '<div class="picker-row" style="padding-left:' + (12 + indent * 16) + 'px;cursor:pointer" onclick="_mtgFinishCreateTask(\'' + esc(action.id) + '\',\'' + esc(c.id) + '\',\'' + esc(client) + '\')">';
    html += '<span style="font-size:12px;color:var(--text-secondary);margin-right:6px">' + esc(getItemType(c)) + '</span> ' + esc(c.title);
    html += '</div>';
  });
  html += '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

function _mtgFinishCreateTask(actionId, parentId, client) {
  var modal = document.getElementById('mtgParentPickerModal');
  if (modal) modal.remove();
  var action = _mtgData && _mtgData.sections && _mtgData.sections.actions ? _mtgData.sections.actions.find(function(a) { return a.id === actionId; }) : null;
  if (!action) return;
  var t = createTaskObject({ title: action.description || 'Meeting action', parentId: parentId, client: client, itemType: 'task',
    description: 'From meeting intelligence: ' + (action.date || '') + ' — ' + (action.owner || '') });
  tasks.push(t); markDirty(t.id); save(); renderSidebarCounts(); renderContent(); openDetail(t.id);
  _mtgMarkActionDone(actionId);
}

function _mtgMarkActionDone(actionId) {
  if (_mtgData && _mtgData.sections) {
    var a = _mtgData.sections.actions.find(function(x) { return x.id === actionId; });
    if (a) a.status = 'done';
  }
  authFetch('/api/meetings/items/' + encodeURIComponent(actionId), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { status: 'done' } })
  });
}

// ——— MEETING SLIDE-OVER PANEL ———

function _mtgOpenMeeting(meetingId) {
  var mtg = (_mtgData && _mtgData.sections && _mtgData.sections.meetings || []).find(function(m) { return m.id === meetingId; });
  if (!mtg) { toast('Meeting record not found', 'error'); return; }
  var old = document.getElementById('mtgPanelOverlay');
  if (old) old.remove();

  var h = '<div class="cc-mtg-panel-overlay" id="mtgPanelOverlay" onclick="if(event.target===this)_mtgClosePanel()">';
  h += '<div class="cc-mtg-panel">';
  h += '<button class="cc-mtg-panel-close" id="mtgPanelClose" onclick="_mtgClosePanel()" title="Close">&times;</button>';
  h += '<div class="cc-mtg-panel-title">' + esc(mtg.title || '') + '</div>';
  h += '<div class="cc-mtg-panel-date">' + esc(mtg.date || '') + '</div>';

  if (mtg.attendees && mtg.attendees.length) {
    h += '<div style="margin-bottom:12px">';
    mtg.attendees.forEach(function(a) { h += '<span class="cc-tag" style="margin:0 4px 4px 0">' + esc(a) + '</span>'; });
    h += '</div>';
  }

  var panelWs = Array.isArray(mtg.workstream) ? mtg.workstream[0] : mtg.workstream;
  if (panelWs) h += '<span class="cc-tag cc-tag--blue" style="margin-right:4px">' + esc(panelWs.replace(/_/g, ' ')) + '</span>';
  if (mtg.topics && mtg.topics.length) {
    mtg.topics.forEach(function(t) { h += '<span class="cc-tag cc-tag--purple" style="margin:0 4px 4px 0;font-size:12px">' + esc(t) + '</span>'; });
  }

  if (mtg.summary) {
    h += '<div class="cc-mtg-panel-section"><h4>Summary</h4>';
    h += '<div style="font-size:14px;line-height:1.6">' + esc(mtg.summary).replace(/\n/g, '<br>') + '</div></div>';
  }

  if (mtg.decisions_text) {
    h += '<div class="cc-mtg-panel-section"><h4>Decisions</h4><ul style="padding-left:16px;font-size:14px">';
    mtg.decisions_text.split('\n').filter(function(l) { return l.trim(); }).forEach(function(l) {
      h += '<li style="margin-bottom:4px">' + esc(l.replace(/^[-*]\s*/, '').replace(/^\[.*?\]\s*/, '')) + '</li>';
    });
    h += '</ul></div>';
  }

  if (mtg.context) {
    h += '<div class="cc-mtg-panel-section"><h4>Context</h4>';
    h += '<div style="font-size:13px;color:var(--text-secondary)">' + esc(mtg.context) + '</div></div>';
  }

  if (mtg.source_id) {
    h += '<div style="margin-top:12px;font-size:12px;color:var(--text-secondary)">Source: ' + esc(mtg.source_id) + '</div>';
  }

  var linkedSections = {};
  ['actions', 'decisions', 'learnings', 'numbers'].forEach(function(sec) {
    var items = (_mtgData.sections[sec] || []).filter(function(i) { return i.source_meeting_id === meetingId; });
    if (items.length) linkedSections[sec] = items;
  });
  var linkedKeys = Object.keys(linkedSections);
  if (linkedKeys.length) {
    h += '<div class="cc-mtg-panel-section"><h4>From This Meeting</h4>';
    var countParts = linkedKeys.map(function(k) { return linkedSections[k].length + ' ' + k; });
    h += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">' + countParts.join(' &middot; ') + '</div>';
    linkedKeys.forEach(function(sec) {
      linkedSections[sec].forEach(function(item) {
        var label = item.description || item.decision || item.insight || item.figure || item.title || '';
        h += '<div class="cc-mtg-linked-item" onclick="_mtgClosePanel();_mtgSwitchSub(\'' + sec + '\')">' + esc(label.slice(0, 80)) + '</div>';
      });
    });
    h += '</div>';
  }

  h += '</div></div>';
  document.body.insertAdjacentHTML('beforeend', h);
  setTimeout(function() { var btn = document.getElementById('mtgPanelClose'); if (btn) btn.focus(); }, 100);
  document.addEventListener('keydown', _mtgPanelEscape);
}

function _mtgClosePanel() {
  var el = document.getElementById('mtgPanelOverlay');
  if (el) el.remove();
  document.removeEventListener('keydown', _mtgPanelEscape);
}

function _mtgPanelEscape(e) {
  if (e.key === 'Escape') _mtgClosePanel();
}

function _mtgFilterSources(personId) {
  var person = (_mtgData.sections.people || []).find(function(p) { return p.id === personId; });
  if (!person || !person.meeting_ids) return;
  _mtgFilters._personMeetingIds = person.meeting_ids;
  _mtgSwitchSub('sources');
}

// ——— SOURCES SUB-TAB ———

function _mtgRenderSources(meetings) {
  var h = '<button class="cc-btn-sm cc-mtg-add-btn" onclick="_mtgStartAdd()">+ Add Meeting</button>';
  if (_mtgAddingSection === 'meetings') h += _mtgEditFormHtml(null, 'meetings', { date: new Date().toISOString().slice(0,10), attendees: [], topics: [], workstream: 'nbi' });
  if (_mtgFilters._personMeetingIds) {
    h += '<div style="margin-bottom:10px;font-size:13px;color:var(--text-secondary)">Filtered to meetings for this person <button class="cc-btn-sm" onclick="delete _mtgFilters._personMeetingIds;_mtgRender()">Clear</button></div>';
  }
  if (!meetings.length && !_mtgAddingSection) return h + '<div class="cc-panel-empty">No meeting records found.</div>';
  h += '<table class="cc-tbl"><thead><tr><th>Date</th><th>Meeting</th><th>Attendees</th><th>Workstream</th><th></th></tr></thead><tbody>';
  meetings.forEach(function(m) {
    if (_mtgEditingId === m.id) { h += '<tr><td colspan="5">' + _mtgEditFormHtml(m.id, 'meetings', m) + '</td></tr>'; return; }
    h += '<tr style="cursor:pointer" onclick="_mtgOpenMeeting(\'' + esc(m.id) + '\')">';
    h += '<td style="white-space:nowrap">' + esc(m.date || '') + '</td>';
    h += '<td>' + esc(m.title || '') + _mtgBadge(m) + '</td>';
    h += '<td style="font-size:12px;color:var(--text-secondary)">' + (m.attendees ? m.attendees.length : 0) + '</td>';
    var ws = Array.isArray(m.workstream) ? m.workstream[0] : (m.workstream || '');
    h += '<td><span class="cc-tag cc-tag--blue">' + esc(ws.replace(/_/g, ' ')) + '</span></td>';
    h += '<td><span class="cc-mtg-edit-icon" onclick="event.stopPropagation();_mtgStartEdit(\'' + esc(m.id) + '\')" title="Edit">&#9998;</span></td>';
    h += '</tr>';
  });
  h += '</tbody></table>';
  return h;
}


