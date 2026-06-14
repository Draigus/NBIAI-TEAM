// ==================== BUG / FEATURE REPORTS ====================
// Users can submit bug reports or feature requests via the yellow header button.
// Each report captures: type (bug/feature), title, description, current page name,
// and an optional screenshot (captured via html2canvas CDN, falls back gracefully).
// Reports are stored server-side and viewable in Settings > Bug Reporting tab.
// Admins can change status (open/resolved/won't fix) from the settings table.

let _bugReportScreenshot = null;  // Base64 data URL of the captured screenshot (or null)
let _bugReportType = 'bug';       // Current selection in the modal: 'bug' or 'feature'
let _bugReportsData = null;       // Cached response from GET /api/bug-reports
let _queueData = null;            // Cached response from GET /api/queue
let _bugSortCol = 'created_at';   // Current sort column: reporter_name|title|page|status|created_at
let _bugSortDir = 'desc';         // Sort direction: asc|desc

let _html2canvasLoaded = false;
/** Lazy-load html2canvas from CDN and capture a screenshot of the main content area */
async function captureScreenshot() {
  try {
    const mainEl = document.getElementById('appContainer') || document.querySelector('.main__content');
    if (!mainEl) return null;

    // Lazy-load html2canvas from CDN on first use
    if (typeof html2canvas !== 'function' && !_html2canvasLoaded) {
      _html2canvasLoaded = true;
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.integrity = 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H';
        script.crossOrigin = 'anonymous';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    if (typeof html2canvas === 'function') {
      const opts = {
        scale: 0.7, useCORS: true, logging: false,
        windowWidth: mainEl.scrollWidth,
        windowHeight: Math.min(mainEl.scrollHeight, 1200),
        backgroundColor: '#1a1a2e',
        // Strip modern CSS color() function values that html2canvas 1.4.1 cannot parse
        onclone: (clonedDoc) => {
          const allEls = clonedDoc.querySelectorAll('*');
          for (const el of allEls) {
            const cs = el.style;
            // Override any inline styles using color() function
            ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'accentColor', 'caretColor'].forEach(prop => {
              try {
                const val = getComputedStyle(el)[prop] || '';
                if (val.includes('color(')) {
                  cs.setProperty(prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), prop === 'backgroundColor' ? '#1a1a2e' : '#e0e0e0', 'important');
                }
              } catch(e2) { /* ignore */ }
            });
          }
        }
      };

      let canvas = null;
      try {
        canvas = await Promise.race([
          html2canvas(mainEl, opts),
          new Promise(resolve => setTimeout(() => resolve(null), 8000))
        ]);
      } catch(e2) { if (window._nbiDebug) console.warn('[BugReport] html2canvas error (non-fatal):', e2.message); }
      if (canvas && canvas.toDataURL) return canvas.toDataURL('image/jpeg', 0.65);
    }
    return null;
  } catch(e) {
    if (window._nbiDebug) console.warn('[BugReport] Screenshot capture failed:', e.message);
    return null;
  }
}

/** Open the bug/feature report modal with automatic screenshot */
async function openBugReportModal() {
  _bugReportType = 'bug';
  _bugReportScreenshot = null;

  // Start screenshot capture in background
  const screenshotPromise = captureScreenshot();
  const currentPage = currentView || 'unknown';

  let html = `<div class="modal-overlay open" id="bugReportModal" role="dialog" aria-modal="true">
    <div class="modal bug-report-modal">
      <h2>&#128030; Report a Bug or Feature Request</h2>
      <div style="margin-bottom:12px">
        <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">Type</label>
        <div class="bug-report-type-toggle">
          <button id="bugTypeBtn" class="active-bug" data-action="setBugReportType" data-arg0="bug">&#128027; Bug</button>
          <button id="featureTypeBtn" data-action="setBugReportType" data-arg0="feature">&#10024; Feature</button>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <label class="field-required" style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">Title</label>
        <input type="text" id="bugReportTitle" placeholder="Brief summary of the issue or request" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.9rem">
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">Description</label>
        <textarea id="bugReportDesc" rows="4" placeholder="What happened? What did you expect? Steps to reproduce..." style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.9rem;resize:vertical"></textarea>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">Screenshot</label>
        <div id="bugScreenshotPreview" style="color:var(--text-muted);font-size:0.8rem">Capturing screenshot...</div>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px">Page: <strong>${esc(currentPage)}</strong></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn" data-action="_actModalRemove" data-arg0="bugReportModal">Cancel</button>
        <button class="btn btn--primary" data-action="_actWithLoading" data-pass-el data-arg0="submitBugReport">Submit Report</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  _activateDynamicModal('bugReportModal');

  // Attach screenshot when ready
  const screenshot = await screenshotPromise;
  _bugReportScreenshot = screenshot;
  const preview = document.getElementById('bugScreenshotPreview');
  if (preview) {
    if (screenshot) {
      preview.textContent = '';
      const img = document.createElement('img');
      img.src = screenshot;
      img.className = 'screenshot-preview';
      img.alt = 'Page screenshot';
      preview.appendChild(img);
      preview.appendChild(document.createElement('br'));
      const hint = document.createElement('span');
      hint.style.cssText = 'font-size:0.75rem;color:var(--text-muted)';
      hint.textContent = 'Screenshot attached automatically';
      preview.appendChild(hint);
    } else {
      preview.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem">Screenshot capture not available (will be submitted without screenshot)</span>';
    }
  }
}

/**
 * Toggle bug/feature type selection in the report modal.
 * @param {string} type - 'bug' or 'feature'
 */
function setBugReportType(type) {
  _bugReportType = type;
  const bugBtn = document.getElementById('bugTypeBtn');
  const featBtn = document.getElementById('featureTypeBtn');
  if (bugBtn && featBtn) {
    bugBtn.className = type === 'bug' ? 'active-bug' : '';
    featBtn.className = type === 'feature' ? 'active-feature' : '';
  }
}

/** Submit the bug/feature report to the API */
async function submitBugReport() {
  const modal = document.getElementById('bugReportModal');
  clearFieldErrors(modal);
  const titleEl = document.getElementById('bugReportTitle');
  const title = titleEl?.value.trim();
  if (!title) { showFieldError(titleEl, 'Title is required'); return; }

  const body = {
    type: _bugReportType,
    title,
    description: document.getElementById('bugReportDesc')?.value.trim() || null,
    page: currentView || null,
    screenshot: _bugReportScreenshot || null
  };

  try {
    const resp = await authFetch('/api/bug-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (resp.ok) {
      document.getElementById('bugReportModal')?.remove();
      toast(`${_bugReportType === 'bug' ? 'Bug' : 'Feature request'} reported. Thanks!`);
      _bugReportScreenshot = null;
    } else {
      const err = await resp.json().catch(() => ({}));
      toast(err.error || 'Failed to submit report', 'error');
    }
  } catch(e) {
    toast('Error: ' + e.message, 'error');
  }
}

/** Load bug reports for the Settings tab */
async function loadBugReports() {
  try {
    const data = await apiCall('/api/bug-reports');
    if (data) _bugReportsData = data;
  } catch(e) { if (window._nbiDebug) console.error('Failed to load bug reports:', e); }
}

/**
 * Render the Bug Tracker list view with filtering, sorting, and search.
 * @param {HTMLElement} container - The DOM element to render the view into
 */
function renderBugTrackerView(container) {
  // Skeleton placeholder while the initial loadBugReports() is still in flight.
  // _bugReportsData starts as null and is populated by loadBugReports during
  // the post-login Promise.all. If the user clicks Bug Tracker before that
  // resolves they'd otherwise see a misleading empty state.
  if (_bugReportsData === null) {
    container.innerHTML = '<div style="padding:24px"><div class="skeleton skeleton-card"></div>' +
      Array(5).fill('<div class="skeleton skeleton-row"></div>').join('') +
      '<span class="visually-hidden">Loading bug reports</span></div>';
    if (typeof loadBugReports === 'function') loadBugReports().then(() => { if (currentView === 'bugs') renderContent(); });
    return;
  }
  const reports = (_bugReportsData && _bugReportsData.reports) || [];
  const isAdmin = _currentUser && _currentUser.role === 'admin';

  // Apply filters
  let filtered = [...reports];
  if (window._btFilterType) filtered = filtered.filter(r => r.type === window._btFilterType);
  const btStatus = window._btFilterStatus || 'active';
  if (btStatus === 'active') filtered = filtered.filter(r => r.status !== 'resolved' && r.status !== 'wontfix');
  else if (btStatus) filtered = filtered.filter(r => r.status === btStatus);
  if (window._btFilterPriority === 'none') filtered = filtered.filter(r => !r.priority);
  else if (window._btFilterPriority) filtered = filtered.filter(r => r.priority === window._btFilterPriority);
  if (window._btSearchQuery) {
    const q = window._btSearchQuery.toLowerCase();
    filtered = filtered.filter(r => (r.title || '').toLowerCase().includes(q) || (r.reporter_name || '').toLowerCase().includes(q));
  }

  // Sort
  const col = window._btSortCol || 'created_at';
  const dir = window._btSortDir || 'desc';
  filtered.sort((a, b) => {
    let va, vb;
    if (col === 'priority') {
      const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      va = a.priority ? pOrder[a.priority] ?? 4 : 5;
      vb = b.priority ? pOrder[b.priority] ?? 4 : 5;
    } else if (col === 'created_at' || col === 'updated_at') {
      va = a[col] || ''; vb = b[col] || '';
    } else {
      va = (a[col] || '').toString().toLowerCase();
      vb = (b[col] || '').toString().toLowerCase();
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  const sortIcon = (c) => col === c ? (dir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
  const sortClick = (c) => `data-action="_actToggleBtSort" data-arg0="${c}"`;

  // View mode: list (default) or kanban
  const btViewMode = window._btViewMode || 'list';

  container.innerHTML = `
    <div class="bug-tracker">
      <div class="bug-tracker__header">
        <h2 style="font-size:1.1rem;font-weight:600;margin:0">Bug Tracker</h2>
        <div style="display:flex;gap:var(--space-sm);align-items:center">
          <div class="bug-tracker__view-toggle" role="tablist" aria-label="Bug tracker view mode">
            <button type="button" class="${btViewMode==='list'?'active':''}" role="tab" aria-selected="${btViewMode==='list'}" data-action="_actSetBtViewMode" data-arg0="list">List</button>
            <button type="button" class="${btViewMode==='kanban'?'active':''}" role="tab" aria-selected="${btViewMode==='kanban'}" data-action="_actSetBtViewMode" data-arg0="kanban">Kanban</button>
          </div>
          <button class="btn btn--primary btn--sm" data-action="openBugReportModal">+ Report</button>
        </div>
      </div>
      <div class="bug-tracker__filters" style="margin-bottom:var(--space-md)">
        <select class="leads-select" onchange="window._btFilterType=this.value||null;renderContent()">
          <option value="">All Types</option>
          <option value="bug" ${window._btFilterType==='bug'?'selected':''}>Bugs</option>
          <option value="feature" ${window._btFilterType==='feature'?'selected':''}>Features</option>
        </select>
        <select class="leads-select" onchange="window._btFilterStatus=this.value||null;renderContent()">
          <option value="active" ${(window._btFilterStatus||'active')==='active'?'selected':''}>Active</option>
          <option value="">All Statuses</option>
          <option value="open" ${window._btFilterStatus==='open'?'selected':''}>Open</option>
          <option value="in_progress" ${window._btFilterStatus==='in_progress'?'selected':''}>In Progress</option>
          <option value="please_review" ${window._btFilterStatus==='please_review'?'selected':''}>Please Review</option>
          <option value="resolved" ${window._btFilterStatus==='resolved'?'selected':''}>Resolved</option>
          <option value="wontfix" ${window._btFilterStatus==='wontfix'?'selected':''}>Won't Fix</option>
        </select>
        <select class="leads-select" onchange="window._btFilterPriority=this.value||null;renderContent()">
          <option value="">All Priorities</option>
          <option value="critical" ${window._btFilterPriority==='critical'?'selected':''}>Critical</option>
          <option value="high" ${window._btFilterPriority==='high'?'selected':''}>High</option>
          <option value="medium" ${window._btFilterPriority==='medium'?'selected':''}>Medium</option>
          <option value="low" ${window._btFilterPriority==='low'?'selected':''}>Low</option>
          <option value="none" ${window._btFilterPriority==='none'?'selected':''}>Unset</option>
        </select>
        <input type="text" class="bug-tracker__search" placeholder="Search title or reporter..."
               value="${esc(window._btSearchQuery || '')}"
               oninput="window._btSearchQuery=this.value;_debouncedBtSearch()">
        <span style="font-size:0.75rem;color:var(--text-muted)">${filtered.length} of ${reports.length} reports</span>
      </div>
      ${btViewMode === 'kanban' ? renderBugTrackerKanban(filtered) : renderBugTrackerList(filtered, sortIcon, sortClick)}
    </div>`;
}

/** Render the bug tracker as a flat sortable list (the original view) */
function renderBugTrackerList(filtered, sortIcon, sortClick) {
  if (filtered.length === 0) {
    return `<div class="bug-tracker__list"><div style="padding:var(--space-xl);text-align:center;color:var(--text-muted)">No reports found</div></div>`;
  }
  const rowsHtml = filtered.map(r => {
    const statusLabel = r.status === 'please_review' ? 'Review' : r.status === 'in_progress' ? 'In Progress' : r.status === 'wontfix' ? "Won't Fix" : r.status;
    const priorityLabel = r.priority ? r.priority + ' priority' : 'no priority';
    const commentLabel = r.comment_count > 0 ? `, ${r.comment_count} comment${r.comment_count === 1 ? '' : 's'}` : '';
    const rowAria = `${r.type}: ${r.title}. ${statusLabel}, ${priorityLabel}. Reported by ${r.reporter_name || 'Unknown'}${commentLabel}.`;
    return `
      <div class="bug-tracker__row" data-action="openBugDetail" data-arg0="${r.id}" tabindex="0" role="button"
           aria-label="${esc(rowAria)}"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openBugDetail('${r.id}')}">
        <span><span class="bug-type-badge bug-type-badge--${r.type}" aria-hidden="true">${r.type}</span></span>
        <span aria-hidden="true">${r.priority ? `<span class="bug-priority-badge bug-priority-badge--${r.priority}">${r.priority}</span>` : '<span style="color:var(--text-muted)">\u2014</span>'}</span>
        <span class="bug-tracker__title">${esc(r.title)}</span>
        <span aria-hidden="true"><span class="bug-status-badge bug-status-badge--${r.status}">${statusLabel}</span></span>
        <span style="color:var(--text-muted)" aria-hidden="true">${esc(r.reporter_name || 'Unknown')}</span>
        ${!isClientUser() ? `<span style="color:var(--text-muted);font-size:0.75rem" aria-hidden="true">${r.source === 'client' ? esc(r.reporter_client_name || 'Client') : 'Internal'}</span>` : ''}
        <span style="color:var(--text-muted);font-size:0.75rem" aria-hidden="true">${new Date(r.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
        <span class="bug-tracker__comment-count" aria-hidden="true">${r.comment_count > 0 ? `\uD83D\uDCAC${r.comment_count}` : ''}</span>
      </div>`;
  }).join('');
  return `
    <div class="bug-tracker__list">
      <div class="bug-tracker__row bug-tracker__row--header">
        <span ${sortClick('type')}>Type${sortIcon('type')}</span>
        <span ${sortClick('priority')}>Priority${sortIcon('priority')}</span>
        <span ${sortClick('title')}>Title${sortIcon('title')}</span>
        <span ${sortClick('status')}>Status${sortIcon('status')}</span>
        <span ${sortClick('reporter_name')}>Reporter${sortIcon('reporter_name')}</span>
        ${!isClientUser() ? `<span ${sortClick('source')}>Source${sortIcon('source')}</span>` : ''}
        <span ${sortClick('created_at')}>Date${sortIcon('created_at')}</span>
        <span>\uD83D\uDCAC</span>
      </div>
      ${rowsHtml}
    </div>`;
}

/** Render the bug tracker as a Kanban board with one column per status (Glen request).
 *  Columns: Open, In Progress, Please Review, Resolved, Won't Fix. */
function renderBugTrackerKanban(filtered) {
  const STATUSES = [
    { key: 'open',          label: 'Open' },
    { key: 'in_progress',   label: 'In Progress' },
    { key: 'please_review', label: 'Please Review' },
    { key: 'resolved',      label: 'Resolved' },
    { key: 'wontfix',       label: "Won't Fix" }
  ];
  if (filtered.length === 0) {
    return `<div style="padding:var(--space-xl);text-align:center;color:var(--text-muted)">No reports found</div>`;
  }
  let html = `<div class="bug-tracker__kanban" role="list" aria-label="Bug tracker board">`;
  STATUSES.forEach(s => {
    // Sort by position so drag-to-reorder is reflected on render
    const items = filtered.filter(r => r.status === s.key)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    html += `<section class="bug-lane" role="listitem" aria-label="${esc(s.label)} lane, ${items.length} items">
      <div class="bug-lane__header bug-lane__header--${s.key}">
        <span>${esc(s.label)}</span>
        <span class="bug-lane__count">${items.length}</span>
      </div>
      <div class="bug-lane__body"
           ondragover="onBugLaneDragOver(event)"
           ondragleave="onBugLaneDragLeave(event)"
           ondrop="onBugLaneDrop(event,'${s.key}')">`;
    if (items.length === 0) {
      html += `<div class="bug-lane__empty">None</div>`;
    } else {
      items.forEach(r => {
        const priorityLabel = r.priority ? r.priority + ' priority' : 'no priority';
        const commentLabel = r.comment_count > 0 ? `, ${r.comment_count} comment${r.comment_count === 1 ? '' : 's'}` : '';
        const cardAria = `${r.type}: ${r.title}. ${priorityLabel}. Reported by ${r.reporter_name || 'Unknown'}${commentLabel}.`;
        html += `<div class="bug-card" role="button" tabindex="0" data-bug-id="${r.id}" data-position="${r.position || 0}"
                       draggable="true"
                       ondragstart="onBugCardDragStart(event,'${r.id}','${s.key}')"
                       ondragend="onBugCardDragEnd(event)"
                       data-action="_actOpenBugDetailIfNotDrag" data-arg0="${r.id}"
                       onkeydown="if((event.key==='Enter'||event.key===' ')&&!window._bugDragActive){event.preventDefault();openBugDetail('${r.id}')}"
                       aria-label="${esc(cardAria)}">
          <div class="bug-card__top">
            <span class="bug-type-badge bug-type-badge--${r.type}" aria-hidden="true">${r.type}</span>
            ${r.priority ? `<span class="bug-priority-badge bug-priority-badge--${r.priority}" aria-hidden="true">${r.priority}</span>` : ''}
          </div>
          <div class="bug-card__title">${esc(r.title)}</div>
          <div class="bug-card__meta">
            <span aria-hidden="true">${esc(r.reporter_name || 'Unknown')}</span>
            <span aria-hidden="true">${new Date(r.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}${r.comment_count > 0 ? ' \u00b7 \uD83D\uDCAC' + r.comment_count : ''}</span>
          </div>
        </div>`;
      });
    }
    html += `</div></section>`;
  });
  html += `</div>`;
  return html;
}

// =========================================================================
// Bug Tracker Kanban drag-to-reorder (decision D79)
// =========================================================================

let _bugDragId = null;
let _bugDragSourceStatus = null;
window._bugDragActive = false;

function onBugCardDragStart(ev, bugId, sourceStatus) {
  _bugDragId = bugId;
  _bugDragSourceStatus = sourceStatus;
  window._bugDragActive = true;
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', bugId);
  }
  if (ev.currentTarget && ev.currentTarget.classList) {
    ev.currentTarget.classList.add('dragging');
  }
}

function onBugCardDragEnd(ev) {
  if (ev.currentTarget && ev.currentTarget.classList) {
    ev.currentTarget.classList.remove('dragging');
  }
  setTimeout(() => { window._bugDragActive = false; }, 0);
}

function onBugLaneDragOver(ev) {
  if (!_bugDragId) return;
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
  const lane = ev.currentTarget;
  lane.classList.add('drag-over');
  const cards = [...lane.querySelectorAll('.bug-card:not(.dragging)')];
  lane.querySelectorAll('.bug-drop-indicator').forEach(d => d.remove());
  const afterCard = cards.reduce((closest, card) => {
    const box = card.getBoundingClientRect();
    const offset = ev.clientY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, el: card };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, el: null }).el;
  const indicator = document.createElement('div');
  indicator.className = 'bug-drop-indicator';
  if (afterCard) lane.insertBefore(indicator, afterCard);
  else lane.appendChild(indicator);
}

function onBugLaneDragLeave(ev) {
  const lane = ev.currentTarget;
  if (lane.contains(ev.relatedTarget)) return;
  lane.classList.remove('drag-over');
  lane.querySelectorAll('.bug-drop-indicator').forEach(d => d.remove());
}

async function onBugLaneDrop(ev, targetStatus) {
  ev.preventDefault();
  const lane = ev.currentTarget;
  lane.classList.remove('drag-over');
  lane.querySelectorAll('.bug-drop-indicator').forEach(d => d.remove());
  if (!_bugDragId) return;

  const cards = [...lane.querySelectorAll('.bug-card:not(.dragging)')];
  const afterCard = cards.reduce((closest, card) => {
    const box = card.getBoundingClientRect();
    const offset = ev.clientY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, el: card };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, el: null }).el;
  const dropIdx = afterCard ? cards.indexOf(afterCard) : cards.length;

  const patch = { position: dropIdx };
  if (targetStatus !== _bugDragSourceStatus) patch.status = targetStatus;

  const bugId = _bugDragId;
  _bugDragId = null;
  _bugDragSourceStatus = null;

  try {
    const res = await authFetch(`/api/bug-reports/${bugId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast('Failed to move bug', 'error');
      return;
    }
    if (typeof loadBugReports === 'function') {
      await loadBugReports();
      renderContent();
    }
  } catch (e) {
    if (window._nbiDebug) console.error('Bug drop failed', e);
    toast('Failed to move bug', 'error');
  }
}

/** Render the bug reports settings tab content */
async function renderBugReportsTab() {
  if (!_bugReportsData) await loadBugReports();
  const reports = (_bugReportsData && _bugReportsData.reports) || [];
  const isAdmin = _currentUser && _currentUser.role === 'admin';

  let html = `<div class="settings__group"><h2>Bug &amp; Feature Reports</h2>`;
  html += `<p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px">
    Use the yellow &#128030; Report button in the header to submit bugs or feature requests, or visit the <a href="#bugs" data-action="switchView" data-prevent data-arg0="bugs" style="color:var(--accent)">Bug Tracker</a> for the full view.
  </p>`;

  if (reports.length === 0) {
    html += `<div style="padding:24px;text-align:center;color:var(--text-muted)">No reports submitted yet.</div>`;
  } else {
    // Filter controls
    html += `<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <select class="leads-select" onchange="_bugFilterType=this.value||null;loadBugReports().then(()=>renderContent())">
        <option value="">All Types</option>
        <option value="bug" ${window._bugFilterType==='bug'?'selected':''}>Bugs</option>
        <option value="feature" ${window._bugFilterType==='feature'?'selected':''}>Features</option>
      </select>
      <select class="leads-select" onchange="_bugFilterStatus=this.value||null;loadBugReports().then(()=>renderContent())">
        <option value="">All Statuses</option>
        <option value="open" ${window._bugFilterStatus==='open'?'selected':''}>Open</option>
        <option value="in_progress" ${window._bugFilterStatus==='in_progress'?'selected':''}>In Progress</option>
        <option value="please_review" ${window._bugFilterStatus==='please_review'?'selected':''}>Please Review</option>
        <option value="resolved" ${window._bugFilterStatus==='resolved'?'selected':''}>Resolved</option>
        <option value="wontfix" ${window._bugFilterStatus==='wontfix'?'selected':''}>Won't Fix</option>
      </select>
    </div>`;

    // Filter in JS
    let filtered = reports;
    if (window._bugFilterType) filtered = filtered.filter(r => r.type === window._bugFilterType);
    if (window._bugFilterStatus) filtered = filtered.filter(r => r.status === window._bugFilterStatus);

    // Sort filtered results
    filtered = [...filtered].sort((a, b) => {
      let va, vb;
      if (_bugSortCol === 'created_at') { va = new Date(a.created_at).getTime(); vb = new Date(b.created_at).getTime(); }
      else if (_bugSortCol === 'reporter_name') { va = (a.reporter_name || '').toLowerCase(); vb = (b.reporter_name || '').toLowerCase(); }
      else if (_bugSortCol === 'title') { va = (a.title || '').toLowerCase(); vb = (b.title || '').toLowerCase(); }
      else if (_bugSortCol === 'page') { va = (a.page || '').toLowerCase(); vb = (b.page || '').toLowerCase(); }
      else if (_bugSortCol === 'status') { va = a.status || ''; vb = b.status || ''; }
      else if (_bugSortCol === 'priority') {
        const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        va = a.priority ? pOrder[a.priority] ?? 4 : 5;
        vb = b.priority ? pOrder[b.priority] ?? 4 : 5;
      }
      else { va = a[_bugSortCol] || ''; vb = b[_bugSortCol] || ''; }
      if (va < vb) return _bugSortDir === 'asc' ? -1 : 1;
      if (va > vb) return _bugSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const sortIcon = (col) => _bugSortCol === col ? (_bugSortDir === 'asc' ? ' &#9650;' : ' &#9660;') : '';
    const sortTh = (col, label) => `<th style="cursor:pointer;user-select:none;white-space:nowrap" data-action="toggleBugSort" data-arg0="${col}">${label}${sortIcon(col)}</th>`;
    html += `<div class="expenses-table-wrap"><table class="bug-reports-table"><thead><tr>
      <th>Type</th>${sortTh('priority','Priority')}${sortTh('reporter_name','Reporter')}${sortTh('title','Title')}${sortTh('status','Status')}${sortTh('created_at','Date')}<th>\uD83D\uDCAC</th>
      ${isAdmin ? '<th></th>' : ''}
    </tr></thead><tbody>`;

    filtered.forEach(r => {
      const typeCls = r.type === 'bug' ? 'bug' : 'feature';
      const statusCls = r.status === 'in_progress' ? 'in_progress' : r.status === 'resolved' ? 'resolved' : r.status === 'wontfix' ? 'wontfix' : r.status === 'please_review' ? 'please_review' : 'open';
      const statusLabel = r.status === 'please_review' ? 'Please Review' : r.status === 'in_progress' ? 'In Progress' : r.status === 'wontfix' ? "Won't Fix" : r.status;
      html += `<tr data-action="openBugDetail" data-arg0="${r.id}" style="cursor:pointer">
        <td><span class="bug-type-badge bug-type-badge--${typeCls}">${r.type}</span></td>
        <td>${r.priority ? `<span class="bug-priority-badge bug-priority-badge--${r.priority}">${r.priority}</span>` : '<span style="color:var(--text-muted)">\u2014</span>'}</td>
        <td>${esc(r.reporter_name || 'Unknown')}</td>
        <td><strong>${esc(r.title)}</strong></td>
        <td><span class="bug-status-badge bug-status-badge--${statusCls}">${statusLabel}</span></td>
        <td style="color:var(--text-muted);font-size:0.75rem;white-space:nowrap">${new Date(r.created_at).toLocaleDateString('en-GB')}</td>
        <td style="color:var(--text-muted);font-size:0.75rem">${r.comment_count > 0 ? `\uD83D\uDCAC${r.comment_count}` : ''}</td>
        ${isAdmin ? `<td>
          <select class="leads-select" style="font-size:0.75rem;padding:2px 6px" data-stop onchange="updateBugField('${r.id}','status',this.value)">
            <option value="open" ${r.status==='open'?'selected':''}>Open</option>
            <option value="in_progress" ${r.status==='in_progress'?'selected':''}>In Progress</option>
            <option value="please_review" ${r.status==='please_review'?'selected':''}>Please Review</option>
            <option value="resolved" ${r.status==='resolved'?'selected':''}>Resolved</option>
            <option value="wontfix" ${r.status==='wontfix'?'selected':''}>Won't Fix</option>
          </select>
        </td>` : ''}
      </tr>`;
    });
    html += `</tbody></table></div>`;
    html += `<div style="color:var(--text-muted);font-size:0.75rem;margin-top:8px">${filtered.length} of ${reports.length} reports shown</div>`;
  }
  html += `</div>`;
  return html;
}

/**
 * Toggle sort column/direction for the bug reports settings table and re-render.
 * @param {string} col - The column key to sort by
 */
function toggleBugSort(col) {
  if (_bugSortCol === col) { _bugSortDir = _bugSortDir === 'asc' ? 'desc' : 'asc'; }
  else { _bugSortCol = col; _bugSortDir = col === 'created_at' ? 'desc' : 'asc'; }
  renderContent();
}

/**
 * Delete a bug/feature report permanently (admin only).
 * @param {string} id - The bug report UUID
 */
async function deleteBugReport(id) {
  if (!(await themedConfirm('Delete this report permanently?'))) return;
  const resp = await authFetch('/api/bug-reports/' + id, { method: 'DELETE' });
  if (resp.ok) {
    closeBugDetail();
    toast('Report deleted');
    await loadBugReports();
    renderContent();
  } else {
    toast('Failed to delete report', 'error');
  }
}

/**
 * Resolve a bug report from the detail panel after confirmation.
 * @param {string} id - The bug report UUID
 */
async function resolveBugReport(id) {
  if (!(await themedConfirm('Mark this report as resolved?', 'Resolve Report', 'Mark Resolved'))) return;
  await updateBugField(id, 'status', 'resolved');
}

/**
 * Open the slide-in detail panel for a bug report, loading screenshot and comments.
 * @param {string} id - The bug report UUID
 */
async function openBugDetail(id) {
  const overlay = document.getElementById('bugDetailOverlay');
  const panel = document.getElementById('bugDetailPanel');
  if (!overlay || !panel) return;

  const reports = (_bugReportsData && _bugReportsData.reports) || [];
  let r = reports.find(x => x.id === id);
  if (!r) {
    try { r = await apiCall('/api/bug-reports/' + id); } catch (e) { /* not found */ }
  }
  if (!r) { toast('Bug report not found', 'error'); _clearEntityHash(); return; }

  const isAdmin = _currentUser && _currentUser.role === 'admin';
  const isReporter = _currentUser && _currentUser.id === r.user_id;
  const canChangeStatus = isAdmin || isReporter;
  const canEditDesc = isAdmin || isReporter;
  const canEditTitle = isAdmin || isReporter;

  const statusOptions = ['open', 'in_progress', 'please_review', 'resolved', 'wontfix'];
  const statusLabels = { open: 'Open', in_progress: 'In Progress', please_review: 'Please Review', resolved: 'Resolved', wontfix: "Won't Fix" };
  const priorityOptions = ['critical', 'high', 'medium', 'low'];

  panel.innerHTML = `
    <div class="bug-detail__header">
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:var(--space-sm);align-items:center;margin-bottom:6px;flex-wrap:wrap">
          <span class="bug-type-badge bug-type-badge--${r.type}">${r.type}</span>
          <span class="bug-status-badge bug-status-badge--${r.status}">${statusLabels[r.status] || r.status}</span>
          ${r.priority ? `<span class="bug-priority-badge bug-priority-badge--${r.priority}">${r.priority}</span>` : ''}
        </div>
        ${canEditTitle
          ? `<input id="bugTitleEdit" type="text" value="${esc(r.title)}" maxlength="500"
              style="width:100%;font-size:1rem;font-weight:600;margin:0;padding:4px 6px;border:1px solid var(--border-default);background:var(--bg-input);color:var(--text-primary);border-radius:var(--radius-sm)"
              onblur="saveBugTitle('${r.id}')"
              onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
              aria-label="Report title">`
          : `<h3 style="font-size:1rem;font-weight:600;margin:0;word-break:break-word">${esc(r.title)}</h3>`
        }
      </div>
      <button class="btn btn--ghost btn--sm" data-action="closeBugDetail" aria-label="Close" style="flex-shrink:0">&times;</button>
    </div>
    <div class="bug-detail__body">
      <div class="bug-detail__section">
        <div class="bug-detail__section-title">Properties</div>
        <dl class="bug-detail__props">
          <dt>Status</dt>
          <dd>${canChangeStatus
            ? `<select class="leads-select" style="font-size:0.78rem;padding:2px 6px" onchange="updateBugField('${r.id}','status',this.value)">
                ${statusOptions.map(s => `<option value="${s}" ${r.status===s?'selected':''}>${statusLabels[s]}</option>`).join('')}
               </select>`
            : `<span class="bug-status-badge bug-status-badge--${r.status}">${statusLabels[r.status] || r.status}</span>`
          }</dd>
          <dt>Priority</dt>
          <dd>${isAdmin
            ? `<select class="leads-select" style="font-size:0.78rem;padding:2px 6px" onchange="updateBugField('${r.id}','priority',this.value||null)">
                <option value="">— Unset</option>
                ${priorityOptions.map(p => `<option value="${p}" ${r.priority===p?'selected':''}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('')}
               </select>`
            : (r.priority ? `<span class="bug-priority-badge bug-priority-badge--${r.priority}">${r.priority}</span>` : '<span style="color:var(--text-muted)">Unset</span>')
          }</dd>
          <dt>Reporter</dt><dd>${esc(r.reporter_name || 'Unknown')}</dd>
          <dt>Page</dt><dd style="color:var(--text-muted)">${esc(r.page || '\u2014')}</dd>
          <dt>Reported</dt><dd style="color:var(--text-muted)">${new Date(r.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</dd>
          ${r.updated_at && r.updated_at !== r.created_at ? `<dt>Updated</dt><dd style="color:var(--text-muted)">${new Date(r.updated_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</dd>` : ''}
        </dl>
      </div>

      <div class="bug-detail__section">
        <div class="bug-detail__section-title">Description</div>
        ${canEditDesc
          ? `<textarea id="bugDescEdit" class="bug-detail__description" style="width:100%;border:1px solid var(--border-default);background:var(--bg-input);color:var(--text-primary);font-family:var(--font-body);padding:var(--space-md);border-radius:var(--radius-md);font-size:0.82rem;resize:vertical;min-height:80px">${esc(r.description || '')}</textarea>
             <button class="btn btn--ghost btn--sm" style="margin-top:4px" data-action="saveBugDescription" data-arg0="${r.id}">Save Description</button>`
          : `<div class="bug-detail__description">${esc(r.description || 'No description provided.')}</div>`
        }
      </div>

      ${r.has_screenshot ? `
        <div class="bug-detail__section">
          <div class="bug-detail__section-title">Screenshot</div>
          <div id="bugScreenshotContainer" style="cursor:pointer" data-action="_actOpenImage" data-pass-el>
            <div style="color:var(--text-muted);font-size:0.78rem">Loading screenshot...</div>
          </div>
        </div>` : ''}

      <div class="bug-detail__section">
        <div class="bug-detail__section-title">Comments</div>
        <div id="bugCommentsContainer"><div style="color:var(--text-muted);font-size:0.78rem">Loading comments...</div></div>
      </div>

      <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-lg);padding-top:var(--space-md);border-top:1px solid var(--border-default)">
        ${isReporter && r.status !== 'resolved' ? `<button class="btn btn--sm" data-action="updateBugField" data-arg0="${r.id}" data-arg1="status" data-arg2="resolved">Mark Resolved</button>` : ''}
        ${isAdmin ? `<button class="btn btn--danger btn--sm" data-action="_actDeleteBugAndClose" data-arg0="${r.id}">Delete</button>` : ''}
      </div>
    </div>
    <div class="bug-detail__comment-input">
      <textarea id="bugCommentText" placeholder="Add a comment..." rows="2"></textarea>
      <button class="btn btn--primary btn--sm" style="align-self:flex-end" data-action="postBugComment" data-arg0="${r.id}">Post</button>
    </div>`;

  overlay.style.display = 'block';
  overlay.onclick = (e) => { if (e.target === overlay) closeBugDetail(); };
  panel.classList.add('open');
  window._bugDetailPreviousFocus = document.activeElement;
  if (typeof _trapFocus === 'function') _trapFocus(panel);
  window._bugDetailEscHandler = (e) => { if (e.key === 'Escape') closeBugDetail(); };
  document.addEventListener('keydown', window._bugDetailEscHandler);

  // Load screenshot
  if (r.has_screenshot) {
    try {
      const resp = await authFetch('/api/bug-reports/' + id + '/screenshot');
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        window._bugScreenshotBlobUrl = url;
        const container = document.getElementById('bugScreenshotContainer');
        if (container) container.innerHTML = `<img src="${url}" style="max-width:100%;max-height:400px;border-radius:var(--radius-md);border:1px solid var(--border-default)" alt="Screenshot">`;
      }
    } catch(e) { /* ignore */ }
  }

  // Load comments
  loadBugComments(id);
  _pushEntityHash('bug', id);
}

/** Close the bug detail slide-in panel and hide the overlay */
function closeBugDetail() {
  _clearEntityHash();
  if (window._bugDetailPreviousFocus) { window._bugDetailPreviousFocus.focus(); window._bugDetailPreviousFocus = null; }
  if (window._bugScreenshotBlobUrl) { URL.revokeObjectURL(window._bugScreenshotBlobUrl); window._bugScreenshotBlobUrl = null; }
  if (window._bugDetailEscHandler) { document.removeEventListener('keydown', window._bugDetailEscHandler); window._bugDetailEscHandler = null; }
  const overlay = document.getElementById('bugDetailOverlay');
  const panel = document.getElementById('bugDetailPanel');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.style.display = 'none';
}

/**
 * Load and render comments for a bug report in the detail panel.
 * @param {string} reportId - The bug report UUID
 */
async function loadBugComments(reportId) {
  const container = document.getElementById('bugCommentsContainer');
  if (!container) return;
  try {
    const resp = await authFetch('/api/bug-reports/' + reportId + '/comments');
    const comments = await resp.json();
    if (comments.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem;padding:var(--space-sm) 0">No comments yet.</div>';
      return;
    }
    const isAdmin = _currentUser && _currentUser.role === 'admin';
    const myName = _currentUser?.displayName || _currentUser?.display_name || '';
    container.innerHTML = comments.map(c => `
      <div class="bug-detail__comment">
        <span class="bug-detail__comment-author">${esc(c.author)}</span>
        <span class="bug-detail__comment-date">${new Date(c.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
        ${(c.author === myName || isAdmin) ? `<span class="bug-detail__comment-actions"><a href="#" data-action="deleteBugComment" data-prevent data-arg0="${reportId}" data-arg1="${c.id}" style="color:var(--danger);font-size:0.75rem">delete</a></span>` : ''}
        <div class="bug-detail__comment-text">${esc(c.text)}</div>
      </div>
    `).join('');
  } catch(e) { container.innerHTML = '<div style="color:var(--danger);font-size:0.78rem">Failed to load comments.</div>'; }
}

/**
 * Post a new comment on a bug report and refresh the comments list.
 * @param {string} reportId - The bug report UUID
 */
async function postBugComment(reportId) {
  const textarea = document.getElementById('bugCommentText');
  if (!textarea || !textarea.value.trim()) return;
  const resp = await authFetch('/api/bug-reports/' + reportId + '/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: textarea.value.trim() })
  });
  if (resp.ok) {
    textarea.value = '';
    loadBugComments(reportId);
    await loadBugReports();
    if (currentView === 'bugs') renderContent();
  } else {
    toast('Failed to post comment', 'error');
  }
}

/**
 * Delete a comment on a bug report after confirmation.
 * @param {string} reportId - The bug report UUID
 * @param {string} commentId - The comment UUID to delete
 */
async function deleteBugComment(reportId, commentId) {
  if (!(await themedConfirm('Delete this comment?'))) return;
  const resp = await authFetch('/api/bug-reports/' + reportId + '/comments/' + commentId, { method: 'DELETE' });
  if (resp.ok) {
    loadBugComments(reportId);
    await loadBugReports();
    if (currentView === 'bugs') renderContent();
  } else {
    toast('Failed to delete comment', 'error');
  }
}

/**
 * Update a bug report field (status or priority) and refresh the view.
 * @param {string} id - The bug report UUID
 * @param {string} field - The field name to update ('status' or 'priority')
 * @param {string|null} value - The new field value, or null to unset
 */
async function updateBugField(id, field, value) {
  const body = {};
  body[field] = value === '' ? null : value;
  const resp = await authFetch('/api/bug-reports/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (resp.ok) {
    toast(field.charAt(0).toUpperCase() + field.slice(1) + ' updated');
    await loadBugReports();
    if (currentView === 'bugs') renderContent();
    // Refresh the detail panel if open
    const panel = document.getElementById('bugDetailPanel');
    if (panel && panel.classList.contains('open')) openBugDetail(id);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Failed to update', 'error');
  }
}

/**
 * Save the edited description from the bug detail panel textarea.
 * @param {string} id - The bug report UUID
 */
async function saveBugDescription(id) {
  const textarea = document.getElementById('bugDescEdit');
  if (!textarea) return;
  const resp = await authFetch('/api/bug-reports/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: textarea.value })
  });
  if (resp.ok) {
    toast('Description saved');
    await loadBugReports();
  } else {
    toast('Failed to save description', 'error');
  }
}

/**
 * Save the edited title from the bug detail panel input. Skips the API call
 * when the title is unchanged or empty (reverts to original on empty).
 * @param {string} id - The bug report UUID
 */
async function saveBugTitle(id) {
  const input = document.getElementById('bugTitleEdit');
  if (!input) return;
  const newTitle = input.value.trim();
  const reports = (_bugReportsData && _bugReportsData.reports) || [];
  const r = reports.find(x => x.id === id);
  if (!r) return;
  if (!newTitle) { input.value = r.title || ''; return; }
  if (newTitle === r.title) return;
  const resp = await authFetch('/api/bug-reports/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: newTitle })
  });
  if (resp.ok) {
    toast('Title saved');
    await loadBugReports();
    if (currentView === 'bugs') renderContent();
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Failed to save title', 'error');
    input.value = r.title || '';
  }
}

