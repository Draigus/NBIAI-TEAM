window.onerror = function(msg, src, line, col) {
  var el = document.getElementById('mobileDebugLoader');
  if (!el) { el = document.createElement('div'); el.id='mobileDebugLoader'; document.body.appendChild(el); }
  el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#dc2626;color:#fff;padding:12px 16px;font-size:13px;z-index:99999;max-height:40vh;overflow:auto;font-family:monospace';
  var div = document.createElement('div'); div.textContent = 'JS Error: ' + msg + ' — Line ' + line + ':' + col; el.appendChild(div);
};
// ===================================================================
// NBI PROJECT DASHBOARD v2 — FULL FUNCTIONAL BUILD
//
// Architecture overview:
//   State:    Module-level variables (tasks[], settings, clientBriefs, currentFilter, etc.)
//   Render:   renderAll() → renderSidebar() + renderTabs() + active view renderer
//   Sync:     Edits → markDirty() → save() → debounced syncToAPI() → POST /api/sync/changes
//   Polling:  10-second interval fetches other users' changes via GET /api/sync/poll
//   Offline:  Falls back to localStorage when API is unavailable
//
// Naming conventions:
//   _prefixed variables = module-level state (not truly private, just convention)
//   esc()               = HTML-escape user input (XSS prevention)
//   authFetch()         = fetch() wrapper with cookie credentials + 401/403 handling
//   renderXxxView()     = builds HTML string for a view and sets el.innerHTML
//   markDirty(id)       = flags a task for sync on next save cycle
// ===================================================================



let _cachedTeamMembers = null; // Cached team member display names — avoids async fetch on re-render




// Poll for other users' changes every 10 seconds (incremental).
// _syncPollTick is the single shared poll body — restartPollingIntervals()
// (nbi-import.js) MUST reuse it. It previously installed its own stale copy
// that expected data.deleted/data.created (fields the server never returns)
// and ignored currentIds, so remote deletions stopped propagating after any
// poll restart (auth refresh, theme change) until a full reload.
let _syncPollInFlight = false;
async function _syncPollTick() {
  if (!useAPI || !_lastPollTime || _pollingPaused || _syncPollInFlight) return;
  _syncPollInFlight = true;
  try {
    const resp = await authFetch('/api/sync/poll?since=' + encodeURIComponent(_lastPollTime));
    if (!resp.ok) return;
    const data = await resp.json();
    let changed = false;

    // Merge updated tasks from other users (skip locally dirty ones to avoid overwriting in-flight edits)
    if (data.updated && data.updated.length > 0) {
      for (const incoming of data.updated) {
        if (_dirtyTaskIds.has(incoming.id)) {
          // Conflict: someone else edited while we have local changes
          const localTask = tasks.find(t => t.id === incoming.id);
          if (localTask) {
            showConflict(incoming.title || 'Untitled', localTask, incoming);
          } else {
            showSyncStatus('conflict', 'Conflict: ' + (incoming.title||'').substring(0,30) + '... (your changes kept)');
          }
          continue;
        }
        const idx = tasks.findIndex(t => t.id === incoming.id);
        if (idx >= 0) {
          const local = tasks[idx];
          // Check if this is genuinely new (different updatedAt)
          if (local.updatedAt !== incoming.updatedAt) {
            tasks[idx] = { ...incoming, _serverUpdatedAt: incoming.updatedAt };
            changed = true;
          }
        } else {
          tasks.push({ ...incoming, _serverUpdatedAt: incoming.updatedAt });
          changed = true;
        }
      }
    }

    // Detect server-side deletions: remove local tasks whose IDs are no longer on the server
    if (data.currentIds) {
      const serverIdSet = new Set(data.currentIds);
      const before = tasks.length;
      tasks = tasks.filter(t => serverIdSet.has(t.id) || _dirtyTaskIds.has(t.id));
      if (tasks.length !== before) changed = true;
    }

    if (data.serverTime) _lastPollTime = data.serverTime;
    if (changed) {
      localStorage.setItem('nbi_dashboard_tasks', JSON.stringify(tasks));
      if (Date.now() - _lastLocalSyncTime < SELF_ECHO_WINDOW_MS) {
      } else {
        // Changes from another user — re-render content but preserve scroll exactly
        _softReRender();
      }
    }

    // Candidate sync for multi-user hiring updates
    if (typeof _candidatesData !== 'undefined' && _candidatesData.length > 0 && typeof window._lastCandidatePollTime !== 'undefined' && window._lastCandidatePollTime) {
      try {
        const candResp = await authFetch('/api/candidates/poll?since=' + encodeURIComponent(window._lastCandidatePollTime));
        if (candResp.ok) {
          const { updated, allIds } = await candResp.json();
          if (updated.length > 0 || allIds.length !== _candidatesData.length) {
            for (const u of updated) {
              const idx = _candidatesData.findIndex(c => c.id === u.id);
              if (idx >= 0) _candidatesData[idx] = u;
              else _candidatesData.push(u);
            }
            _candidatesData = _candidatesData.filter(c => allIds.includes(c.id));
            if (currentView === 'hiring') renderContent();
          }
          window._lastCandidatePollTime = new Date().toISOString();
        }
      } catch (e) { /* silent — retry next cycle */ }
    }
  } catch (e) { /* silent */ } finally { _syncPollInFlight = false; }
}
let _syncPollInterval = setInterval(_syncPollTick, SYNC_POLL_MS);




// ==================== CHARTS (SVG) ====================

/**
 * Render an SVG donut chart with legend from a { label: count } data map.
 * @param {Object} data - Key/value pairs to chart
 * @param {Object} colours - Colour map keyed by data label
 * @param {number} total - Sum used for percentage calculation
 */
function renderDonutChart(data, colours, total) {
  const entries = Object.entries(data).filter(([k,v]) => v > 0 && k !== 'Not set');
  if (entries.length === 0) return '<div style="color:var(--text-muted);padding:40px">No data</div>';
  const size = 180, cx = size/2, cy = size/2, r = 70, r2 = 48;
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  let angle = -90;
  entries.forEach(([key, val]) => {
    const pct = val / total;
    const sweep = pct * 360;
    const large = sweep > 180 ? 1 : 0;
    const startRad = (angle * Math.PI) / 180;
    const endRad = ((angle + sweep) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
    const ix1 = cx + r2 * Math.cos(endRad), iy1 = cy + r2 * Math.sin(endRad);
    const ix2 = cx + r2 * Math.cos(startRad), iy2 = cy + r2 * Math.sin(startRad);
    svg += `<path d="M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix1},${iy1} A${r2},${r2} 0 ${large} 0 ${ix2},${iy2} Z" fill="${colours[key]||'#666'}" opacity="0.9"/>`;
    angle += sweep;
  });
  svg += `<text x="${cx}" y="${cy-4}" text-anchor="middle" fill="var(--text-primary)" font-family="var(--font-display)" font-size="22" font-weight="700">${total}</text>`;
  svg += `<text x="${cx}" y="${cy+14}" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-display)" font-size="8" letter-spacing="1">TRACKED</text>`;
  svg += `</svg>`;
  // Legend
  let legend = '<div class="chart-legend">';
  entries.forEach(([key, val]) => { legend += `<div class="chart-legend__item"><span class="chart-legend__dot" style="background:${colours[key]||'#666'}"></span>${esc(key)} (${val})</div>`; });
  legend += '</div>';
  return svg + legend;
}

/** Render a horizontal bar chart from a { label: count } data map */
function renderBarChart(data, colours) {
  const entries = Object.entries(data).filter(([k,v]) => v > 0);
  if (entries.length === 0) return '<div style="color:var(--text-muted);padding:40px">No data</div>';
  const max = Math.max(...entries.map(([,v]) => v), 1);
  let html = '<div style="width:100%;padding:0 10px;display:flex;flex-direction:column;justify-content:space-around;flex:1">';
  entries.forEach(([key, val]) => {
    const pct = (val / max) * 100;
    html += `<div style="display:flex;align-items:center;gap:8px"><span style="min-width:85px;font-size:0.88rem;color:var(--text-secondary);text-align:right">${esc(key)}</span><div style="flex:1;height:24px;background:var(--border-subtle);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${colours[key]||'var(--accent)'};border-radius:3px;transition:width 0.3s"></div></div><span style="min-width:30px;font-family:var(--font-mono);font-size:0.9rem;color:var(--text-secondary)">${val}</span></div>`;
  });
  html += '</div>';
  return html;
}

// ==================== BADGE HELPERS ====================

/** Render a coloured health state badge (Green/Yellow/Red/Blocked/Waiting) */
function healthBadgeHtml(h) {
  const cls = { Green:'badge--green', Yellow:'badge--yellow', Red:'badge--red', Blocked:'badge--blocked', 'Waiting on Client':'badge--waiting' };
  return `<span class="badge ${cls[h]||'badge--status'}">${esc(h)}</span>`;
}

function priorityBadgeHtml(p) {
  if (!p) return '';
  const cls = { Urgent:'badge--priority-critical', High:'badge--priority-high', Medium:'badge--priority-medium', Low:'badge--priority-low' };
  return `<span class="badge ${cls[p]||'badge--status'}">${esc(p)}</span>`;
}

/** Render a coloured status badge */
function statusBadgeHtml(s, task) {
  const cls = { 'In Review': 'badge--yellow', 'Blocked': 'badge--blocked', 'Done': 'badge--purple', 'In progress': 'badge--green' };
  if (s === 'Blocked' && task) {
    const info = task.blockerInfo || task.blocker_info;
    const reason = info ? (info.blockedOn || '') : '';
    const people = info ? [...(info.internal || []), ...(info.external || [])].join(', ') : '';
    const deps = getIncompletePrereqs(task);
    const depNames = deps.map(d => d.title).join(', ');
    const parts = [reason, people ? 'By: ' + people : '', depNames ? 'Prereqs: ' + depNames : ''].filter(Boolean);
    const tip = parts.length > 0 ? parts.join(' | ') : 'Blocked';
    return `<span class="badge badge--blocked" title="${esc(tip)}">${esc(s)}</span>`;
  }
  return `<span class="badge ${cls[s] || 'badge--status'}">${esc(s)}</span>`;
}

function blockerTooltip(task) {
  if (task.status !== 'Blocked' && task.healthState !== 'Blocked') return '';
  const bi = task.blockerInfo || task.blocker_info || {};
  const parts = [];
  if (bi.blockedOn) parts.push(bi.blockedOn);
  const people = [...(bi.internal || []), ...(bi.external || [])];
  if (people.length) parts.push('By: ' + people.join(', '));
  const deps = getIncompletePrereqs(task);
  if (deps.length) parts.push('Prereqs: ' + deps.map(d => d.title).join(', '));
  if (bi.toUnblock) parts.push('To unblock: ' + bi.toUnblock);
  return parts.length ? ' | BLOCKED: ' + parts.join(' · ') : '';
}

function blockerDetailBoxHtml(task, id) {
  const bi = task.blockerInfo || task.blocker_info || {};
  const deps = getIncompletePrereqs(task);
  const people = [...(bi.internal || []), ...(bi.external || [])];
  let extra = [];
  if (people.length) extra.push('By: ' + people.join(', '));
  if (deps.length) extra.push('Prereqs: ' + deps.map(d => d.title).join(', '));
  if (bi.toUnblock) extra.push('To unblock: ' + bi.toUnblock);
  if (bi.dateBlocked) extra.push('Since ' + new Date(bi.dateBlocked).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}));
  if (bi.lastUpdated) extra.push('Updated ' + new Date(bi.lastUpdated).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}));
  let h = `<textarea style="width:100%;border:1px solid var(--danger);border-radius:var(--radius-sm);padding:6px 8px;margin-top:-4px;margin-bottom:${extra.length ? '2' : '4'}px;font-size:0.78rem;color:var(--danger);line-height:1.4;resize:vertical;min-height:28px;max-height:300px;background:var(--bg-input);font-family:var(--font-body)" placeholder="What is this blocked on?" oninput="_liveWriteBlocker('${escAttrJs(id)}','blockedOn',this.value)" onchange="_liveWriteBlocker('${escAttrJs(id)}','blockedOn',this.value);save()">${esc(bi.blockedOn || '')}</textarea>`;
  if (extra.length) h += `<div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;line-height:1.4;padding:4px 0">${extra.map(e => esc(e)).join('<br>')}</div>`;
  h += `<button class="btn btn--ghost btn--sm" style="font-size:0.75rem;padding:2px 8px;margin-bottom:4px" onclick="openMarkAsBlockedPopup('${escAttrJs(id)}')">Edit blocker details</button>`;
  return h;
}

function blockerContextHtml(task) {
  if (task.status !== 'Blocked') return '';
  const info = task.blockerInfo || task.blocker_info;
  const parts = [];
  if (info && info.blockedOn) parts.push(info.blockedOn);
  const deps = getIncompletePrereqs(task);
  if (deps.length > 0) parts.push(deps.map(d => d.title).join(', '));
  else if (info) {
    const people = [...(info.internal || []), ...(info.external || [])];
    if (people.length > 0) parts.push(people.join(', '));
  }
  if (parts.length === 0) return '';
  const text = parts.join(' — ');
  return `<span style="font-size:0.75rem;color:var(--purple);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:1" title="${esc(text)}">&#9656; ${esc(text.length > 40 ? text.slice(0,38) + '..' : text)}</span>`;
}

// ==================== MULTI-SELECT FILTER HELPERS ====================

/** Build a multi-select filter component HTML string */
function buildMultiSelect(filterKey, label, options, currentValues) {
  const vals = currentValues || [];
  const allSelected = vals.length === 0;
  const countLabel = allSelected ? 'All' : vals.length;
  let html = `<div class="multi-select" data-filter="${filterKey}">`;
  html += `<button class="multi-select__trigger ${!allSelected ? 'active' : ''}" data-action="_actToggleMultiSelect" data-pass-el>${esc(label)} <span class="multi-select__count">${countLabel}</span></button>`;
  html += `<div class="multi-select__dropdown" style="display:none">`;
  html += `<label class="multi-select__option multi-select__option--all"><input type="checkbox" value="__all__" ${allSelected ? 'checked' : ''} onchange="multiSelectAll(this, '${filterKey}')"> All</label>`;
  (options || []).forEach(o => {
    const val = typeof o === 'object' ? o.value : o;
    const lbl = typeof o === 'object' ? o.label : o;
    const checked = vals.includes(val) ? 'checked' : '';
    html += `<label class="multi-select__option"><input type="checkbox" value="${esc(val)}" ${checked} onchange="multiSelectChanged(this, '${filterKey}')"> ${esc(lbl)}</label>`;
  });
  html += `</div></div>`;
  return html;
}

/** Toggle a multi-select dropdown open/closed */
function toggleMultiSelect(container) {
  const dd = container.querySelector('.multi-select__dropdown');
  const isOpen = dd.style.display !== 'none';
  // Close all other open multi-selects first
  document.querySelectorAll('.multi-select__dropdown').forEach(d => d.style.display = 'none');
  dd.style.display = isOpen ? 'none' : 'block';
}

/** Handle "All" checkbox in multi-select. Keeps the dropdown open after re-render. */
function multiSelectAll(checkbox, filterKey) {
  if (checkbox.checked) {
    currentFilter[filterKey] = [];
    renderContent();
    _reopenMultiSelect(filterKey);
  }
}

/** Handle individual checkbox change in multi-select. Keeps the dropdown open after re-render
 *  so users can select multiple values in a single interaction. */
function multiSelectChanged(checkbox, filterKey) {
  const container = checkbox.closest('.multi-select');
  const allCheckboxes = container.querySelectorAll('.multi-select__option:not(.multi-select__option--all) input[type="checkbox"]');
  const allBox = container.querySelector('.multi-select__option--all input[type="checkbox"]');
  const selected = [];
  allCheckboxes.forEach(cb => { if (cb.checked) selected.push(cb.value); });
  if (selected.length === 0 || selected.length === allCheckboxes.length) {
    // All or none selected means "All"
    currentFilter[filterKey] = [];
    if (allBox) allBox.checked = true;
    allCheckboxes.forEach(cb => cb.checked = false);
  } else {
    currentFilter[filterKey] = selected;
    if (allBox) allBox.checked = false;
  }
  renderContent();
  _reopenMultiSelect(filterKey);
}

/** After renderContent re-creates the filter bar, re-open the dropdown for the given filter key
 *  so the user can continue selecting multiple values without having to click the trigger again. */
function _reopenMultiSelect(filterKey) {
  const container = document.querySelector(`.multi-select[data-filter="${filterKey}"]`);
  if (!container) return;
  const dd = container.querySelector('.multi-select__dropdown');
  if (dd) dd.style.display = 'block';
}

/** Close multi-select dropdowns when clicking outside */
document.addEventListener('click', function(e) {
  if (!e.target.closest('.multi-select')) {
    document.querySelectorAll('.multi-select__dropdown').forEach(d => d.style.display = 'none');
  }
});

// ==================== CHANGELOG / AUDIT LOG ====================

let _changelogData = null;
let _changelogOffset = 0;
let _changelogFilters = { action: '', search: '' };

/** Fetch changelog entries from the API with pagination and optional filters */
async function loadChangelog(append) {
  if (!append) _changelogOffset = 0;
  const params = new URLSearchParams({ limit: '50', offset: String(_changelogOffset) });
  if (_changelogFilters.action) params.set('action', _changelogFilters.action);
  if (_changelogFilters.search) params.set('search', _changelogFilters.search);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await authFetch('/api/audit-log?' + params.toString(), { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json();
    if (append && _changelogData) {
      _changelogData.entries = [..._changelogData.entries, ...data.entries];
    } else {
      _changelogData = data;
    }
    _changelogData.total = data.total;
    _changelogOffset = _changelogData.entries.length;
    renderChangelogTable();
  } catch(e) {
    const el = document.getElementById('changelogBody');
    if (el) el.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:24px">Failed to load changelog: ${esc(e.message)}</td></tr>`;
  }
}

/** Render the changelog entries table with diff display and load-more pagination */
function renderChangelogTable() {
  const el = document.getElementById('changelogBody');
  if (!el || !_changelogData) return;
  const entries = _changelogData.entries;
  if (entries.length === 0) {
    el.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">No changelog entries found.</td></tr>`;
  } else {
    el.innerHTML = entries.map(e => {
      const dt = new Date(e.created_at);
      const dateStr = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const timeStr = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const actionCol = e.action === 'create' ? 'var(--success)' : e.action === 'delete' ? 'var(--danger)' : 'var(--accent)';
      const actionBg = e.action === 'create' ? 'var(--success-bg)' : e.action === 'delete' ? 'var(--danger-bg)' : 'var(--accent-glow)';
      const actionBorder = e.action === 'create' ? 'var(--success-border)' : e.action === 'delete' ? 'var(--danger-border)' : 'var(--accent-border)';
      // Format changes
      let changesHtml = '';
      if (e.changes && typeof e.changes === 'object') {
        const keys = Object.keys(e.changes);
        if (keys.length > 0) {
          changesHtml = keys.map(k => {
            const v = e.changes[k];
            if (v && typeof v === 'object' && 'from' in v && 'to' in v) {
              const fromStr = v.from === null || v.from === undefined ? '<em>empty</em>' : esc(String(Array.isArray(v.from) ? v.from.join(', ') : v.from));
              const toStr = v.to === null || v.to === undefined ? '<em>empty</em>' : esc(String(Array.isArray(v.to) ? v.to.join(', ') : v.to));
              return `<div style="margin-bottom:2px"><span style="color:var(--text-muted)">${esc(k)}:</span> <span style="color:var(--danger);text-decoration:line-through">${fromStr}</span> &rarr; <span style="color:var(--success)">${toStr}</span></div>`;
            } else {
              return `<div style="margin-bottom:2px"><span style="color:var(--text-muted)">${esc(k)}:</span> ${esc(String(v))}</div>`;
            }
          }).join('');
        }
      }
      if (e.action === 'create' && e.changes && e.changes.title) {
        changesHtml = `<div style="color:var(--text-muted)">Created: ${esc(e.changes.title)}</div>`;
      }
      if (e.action === 'delete') changesHtml = `<div style="color:var(--danger)">Deleted</div>`;
      return `<tr>
        <td style="white-space:nowrap;font-size:0.78rem"><div>${dateStr}</div><div style="color:var(--text-muted);font-size:0.75rem">${timeStr}</div></td>
        <td><strong style="font-size:0.82rem">${esc(e.changed_by || 'system')}</strong></td>
        <td><span style="font-size:0.75rem;padding:2px 8px;border-radius:3px;background:${actionBg};color:${actionCol};border:1px solid ${actionBorder};text-transform:uppercase;font-weight:600">${esc(e.action)}</span></td>
        <td><div style="font-size:0.82rem;font-weight:500">${esc(e.entity_title || e.entity_id || '-')}</div><div style="font-size:0.75rem;color:var(--text-muted)">${esc(e.entity_type)}</div></td>
        <td style="font-size:0.78rem;font-family:var(--font-mono)">${changesHtml || '<span style="color:var(--text-muted)">&mdash;</span>'}</td>
      </tr>`;
    }).join('');
  }
  // Update load more button
  const loadMore = document.getElementById('changelogLoadMore');
  if (loadMore) {
    if (_changelogData.entries.length < _changelogData.total) {
      loadMore.style.display = 'inline-flex';
    } else {
      loadMore.style.display = 'none';
    }
  }
  // Update count
  const countEl = document.getElementById('changelogCount');
  if (countEl) countEl.textContent = `Showing ${_changelogData.entries.length} of ${_changelogData.total}`;
}


// ----- LEADS TRACKER VIEW -----

// Leads state
// ==================== BACKUP & RESTORE ====================

/** Download a full JSON backup of all tasks, settings, and client briefs */
async function downloadBackup() {
  try {
    toast('Creating backup...');
    const data = await apiCall('/api/backup');
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nbi-dashboard-backup-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup downloaded');
  } catch(e) { toast('Backup failed: ' + e.message, 'error'); }
}

/** Restore tasks, settings, and client briefs from a JSON backup file */
async function restoreBackup(file) {
  if (!file) return;
  if (!(await themedConfirm('Warning: this will overwrite existing data with the backup. Are you sure?'))) return;
  try {
    toast('Restoring backup...');
    const text = await file.text();
    const backup = JSON.parse(text);
    if (!backup.tables) { toast('Invalid backup file', 'error'); return; }
    const resp = await authFetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backup })
    });
    if (resp.ok) {
      toast('Backup restored! Reloading...');
      setTimeout(() => location.reload(), 1500);
    } else {
      const err = await resp.json();
      toast('Restore failed: ' + (err.error || 'Unknown'), 'error');
    }
  } catch(e) { toast('Restore failed: ' + e.message, 'error'); }
}

let _cleanseData = null;

async function openCleanseModal() {
  const modal = document.getElementById('cleanseModal');
  modal.classList.add('open');
  document.getElementById('cleanseConfirmInput').value = '';
  document.getElementById('cleanseDeleteBtn').disabled = true;
  document.getElementById('cleanseProgress').style.display = 'none';
  document.getElementById('cleanseCategories').innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted)">Loading...</div>';
  document.getElementById('cleanseNuclear').innerHTML = '';

  try {
    const resp = await authFetch('/api/admin/cleanse/preview');
    if (!resp.ok) throw new Error('Failed to load preview');
    const json = await resp.json();
    _cleanseData = json.data ? json.data.categories : json.categories;
    renderCleanseCategories();
  } catch (e) {
    document.getElementById('cleanseCategories').innerHTML = `<p style="color:var(--danger)">Failed to load: ${e.message}</p>`;
  }
}

function renderCleanseCategories() {
  const standard = _cleanseData.filter(c => c.tier !== 'nuclear');
  const nuclear = _cleanseData.filter(c => c.tier === 'nuclear');

  let html = '';
  for (const cat of standard) {
    const childInfo = Object.entries(cat.children || {});
    const childText = childInfo.length > 0 ? ` <span style="font-size:0.75rem;color:var(--text-muted)">(+ ${childInfo.map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`).join(', ')})</span>` : '';
    const nullText = cat.nullifies.length > 0 ? `<div style="font-size:0.75rem;color:var(--warning);margin-left:24px">Will nullify: ${cat.nullifies.join(', ')}</div>` : '';
    html += `<label style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer">
      <input type="checkbox" class="cleanse-cat-checkbox" data-cat-id="${cat.id}" ${cat._locked || cat._checked ? 'checked' : ''} ${cat._locked ? 'disabled' : ''}>
      <span><strong>${cat.label}</strong> <span style="color:var(--text-muted)">(${cat.count} records)</span>${childText}</span>
    </label>${nullText}`;
    if (cat._locked) {
      html += `<div style="font-size:0.75rem;color:var(--text-muted);margin-left:24px;font-style:italic">Included in client deletion</div>`;
    }
  }
  document.getElementById('cleanseCategories').innerHTML = html;

  let nucHtml = '';
  for (const cat of nuclear) {
    const childInfo = Object.entries(cat.children || {});
    const childText = childInfo.length > 0 ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-left:24px">Cascades: ${childInfo.map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`).join(', ')}</div>` : '';
    nucHtml += `<label style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer;color:var(--danger)">
      <input type="checkbox" class="cleanse-cat-checkbox" data-cat-id="${cat.id}" ${cat._checked ? 'checked' : ''}>
      <span><strong>${cat.label}</strong> <span style="color:var(--text-muted)">(${cat.count} records)</span></span>
    </label>${childText}`;
    if (cat.nullifies.length > 0) {
      nucHtml += `<div style="font-size:0.75rem;color:var(--warning);margin-left:24px">Will nullify: ${cat.nullifies.join(', ')}</div>`;
    }
  }
  document.getElementById('cleanseNuclear').innerHTML = nucHtml;

  document.querySelectorAll('.cleanse-cat-checkbox').forEach(cb => {
    cb.addEventListener('change', handleCleanseCheckboxChange);
  });
  document.getElementById('cleanseConfirmInput').addEventListener('input', function() {
    document.getElementById('cleanseDeleteBtn').disabled = this.value.trim() !== 'DELETE ALL SELECTED DATA';
  });
}

function handleCleanseCheckboxChange(e) {
  const catId = e.target.dataset.catId;
  const checked = e.target.checked;
  const cat = _cleanseData.find(c => c.id === catId);
  if (cat) cat._checked = checked;

  if (catId === 'clients') {
    const cascadeDeps = ['contacts', 'leads', 'client_notes', 'sows'];
    _cleanseData.forEach(c => {
      if (cascadeDeps.includes(c.id)) c._locked = checked;
    });
    renderCleanseCategories();
  }
}

function cleanseSelectAll() {
  _cleanseData.forEach(c => { c._checked = true; c._locked = (c.id !== 'clients' && ['contacts', 'leads', 'client_notes', 'sows'].includes(c.id)); });
  document.querySelectorAll('.cleanse-cat-checkbox').forEach(cb => {
    cb.checked = true;
    cb.disabled = ['contacts', 'leads', 'client_notes', 'sows'].includes(cb.dataset.catId);
  });
}

function cleanseDeselectAll() {
  _cleanseData.forEach(c => { c._locked = false; c._checked = false; });
  document.querySelectorAll('.cleanse-cat-checkbox').forEach(cb => {
    cb.checked = false;
    cb.disabled = false;
  });
}

function closeCleanseModal() {
  document.getElementById('cleanseModal').classList.remove('open');
  _cleanseData = null;
}

async function executeDataCleanse() {
  const selected = [];
  document.querySelectorAll('.cleanse-cat-checkbox:checked').forEach(cb => {
    selected.push(cb.dataset.catId);
  });
  if (selected.length === 0) { toast('No categories selected', 'error'); return; }

  const confirmation = document.getElementById('cleanseConfirmInput').value.trim();
  if (confirmation !== 'DELETE ALL SELECTED DATA') {
    toast('Confirmation text does not match', 'error');
    return;
  }

  document.getElementById('cleanseProgress').style.display = 'flex';
  document.querySelectorAll('#cleanseModal button, #cleanseModal input, #cleanseModal .cleanse-cat-checkbox').forEach(el => { el.disabled = true; });

  try {
    const resp = await authFetch('/api/admin/cleanse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: selected, confirmation }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error?.message || json.error || 'Cleanse failed');

    const result = json.data || json;
    if (result.localStorageKeys) {
      result.localStorageKeys.forEach(k => localStorage.removeItem(k));
    }

    closeCleanseModal();
    renderAll();

    const totalDeleted = Object.values(result.deleted).reduce((sum, n) => sum + n, 0);
    toast(`Data cleanse complete: ${totalDeleted} records deleted across ${selected.length} categories`);
  } catch (e) {
    document.getElementById('cleanseProgress').style.display = 'none';
    document.querySelectorAll('#cleanseModal button, #cleanseModal input').forEach(el => { el.disabled = false; });
    document.getElementById('cleanseDeleteBtn').disabled = true;
    toast('Cleanse failed — nothing was deleted. ' + e.message, 'error');
  }
}

/** Export all tasks as a CSV file download */
function exportCSV() {
  if (tasks.length === 0) { toast('No tasks to export', 'warning'); return; }
  const allClients = [...new Set(tasks.filter(t => getTaskClient(t)).map(t => getTaskClient(t)))].sort();
  let overlay = document.getElementById('exportModal');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.id = 'exportModal';
  overlay.className = 'modal-overlay open';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  let html = '<div class="modal" style="max-width:500px">';
  html += '<div class="modal__title">Export Tasks</div>';
  html += '<div class="detail-field"><label class="detail-field__label">Client</label><select id="exportClient" onchange="_exportUpdateProjects()"><option value="">All Clients</option>';
  allClients.forEach(c => { html += '<option value="' + esc(c) + '">' + esc(c) + '</option>'; });
  html += '</select></div>';
  html += '<div class="detail-field"><label class="detail-field__label">Project</label><select id="exportProject"><option value="">All Projects</option></select></div>';
  html += '<div style="display:flex;gap:8px;margin-top:var(--space-lg)">';
  html += '<button class="btn btn--primary" onclick="_doExport(\'nbi\')">Export NBI CSV</button>';
  html += '<button class="btn" onclick="_doExport(\'jira\')" style="background:#0052CC;color:#fff">Export for Jira</button>';
  html += '<button class="btn" onclick="document.getElementById(\'exportModal\').remove()">Cancel</button>';
  html += '</div></div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

function _exportUpdateProjects() {
  const client = document.getElementById('exportClient').value;
  const sel = document.getElementById('exportProject');
  const projects = tasks.filter(t => t.itemType === 'project' && (!client || getTaskClient(t) === client)).sort((a,b) => a.title.localeCompare(b.title));
  sel.innerHTML = '<option value="">All Projects</option>' + projects.map(p => '<option value="' + escAttrJs(p.id) + '">' + esc(p.title) + '</option>').join('');
}

function _doExport(format) {
  const client = document.getElementById('exportClient').value;
  const projectId = document.getElementById('exportProject').value;
  let filtered = tasks.filter(t => {
    if (client && getTaskClient(t) !== client) return false;
    if (projectId) {
      if (t.id === projectId) return true;
      let walker = t.parentId;
      while (walker) { if (walker === projectId) return true; const p = tasks.find(x => x.id === walker); walker = p ? p.parentId : null; }
      return false;
    }
    return true;
  });
  if (filtered.length === 0) { toast('No tasks match the selected filters', 'warning'); return; }
  const csvQ = v => { const s = String(v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  let csv;
  if (format === 'jira') {
    const jiraStatus = s => ({ 'Not started': 'To Do', 'Planning': 'To Do', 'In progress': 'In Progress', 'In Review': 'In Progress', 'Blocked': 'To Do', 'Done': 'Done', 'Cancelled': 'Done' }[s] || 'To Do');
    const jiraPriority = p => ({ 'Urgent': 'Highest', 'High': 'High', 'Medium': 'Medium', 'Low': 'Low' }[p] || 'Medium');
    const jiraType = t => { const it = getItemType(t); return it === 'project' ? 'Epic' : it === 'feature' ? 'Epic' : it === 'story' ? 'Story' : 'Task'; };
    const jiraEpic = t => { let w = t.parentId ? tasks.find(x => x.id === t.parentId) : null; while (w) { const wt = getItemType(w); if (wt === 'feature' || wt === 'project') return w.title; w = w.parentId ? tasks.find(x => x.id === w.parentId) : null; } return ''; };
    const headers = ['Summary', 'Issue Type', 'Status', 'Priority', 'Description', 'Assignee', 'Due Date', 'Epic Link', 'Labels'];
    const rows = filtered.map(t => [t.title, jiraType(t), jiraStatus(t.status), jiraPriority(t.priority), t.description || '', (t.assignees||[]).join(';'), t.dueDate || '', jiraEpic(t), getTaskClient(t) || '']);
    csv = [headers.map(csvQ).join(','), ...rows.map(r => r.map(csvQ).join(','))].join('\n');
  } else {
    const headers = ['Task', 'Parent Task', 'Item Type', 'Status', 'Priority', 'Description', 'Assignee', 'Health State', 'Client', 'Hours Estimated', 'Hours Spent', 'Start Date', 'End Date', 'Due Date'];
    const rows = filtered.map(t => {
      const parent = t.parentId ? (tasks.find(p => p.id === t.parentId) || {}).title || '' : '';
      return [t.title, parent, getItemType(t), t.status, t.priority || '', t.description || '', (t.assignees||[]).join(';'), t.healthState || '', getTaskClient(t), t.hoursEstimated || 0, t.hoursSpent || 0, t.startDate || '', t.endDate || '', t.dueDate || ''];
    });
    csv = [headers.map(csvQ).join(','), ...rows.map(r => r.map(csvQ).join(','))].join('\n');
  }
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = format === 'jira' ? `jira_import_${new Date().toISOString().slice(0,10)}.csv` : `nbi_export_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  document.getElementById('exportModal').remove();
  toast(format === 'jira' ? 'Jira CSV exported — import via Jira > System > External System Import > CSV' : 'NBI CSV exported');
}

// ----- THEME PICKER -----
const _detailOverlay = document.getElementById('detailOverlay');
const _detailPanel = document.getElementById('detailPanel');
if (_detailOverlay) {
  const obs = new MutationObserver(() => {
    if (_detailOverlay.classList.contains('open')) {
      _trapFocus(_detailPanel);
    } else {
      _releaseFocusTrap(_detailPanel);
    }
  });
  obs.observe(_detailOverlay, { attributes: true, attributeFilter: ['class'] });
}

