// ===== ATTACHMENT FOLDER VIEW (feature 4159773e) =====
// Full-screen workspace for document-heavy tasks: every attachment on a task
// (optionally including its sub-items) in one browsable list with an inline
// preview pane. Opened from the attachments section of the detail panels.
// Data: GET /api/tasks/:id/attachments/all (universal + legacy tables).

let _folderViewFiles = [];
let _folderViewSelected = null;
let _folderViewIncludeSub = true;
let _folderViewSearch = '';
let _folderViewEntityId = null;
let _folderViewBlobUrl = null; // revoke on change/close to avoid leaks

async function openAttachmentFolderView(entityType, entityId) {
  _folderViewEntityId = entityId;
  _folderViewSelected = null;
  _folderViewIncludeSub = true;
  _folderViewSearch = '';
  const existing = document.getElementById('folderViewOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'folderViewOverlay';
  overlay.className = 'folder-view';
  overlay.innerHTML = `<div class="folder-view__header">
      <div class="folder-view__title">&#128193; Attachments</div>
      <input type="text" id="folderViewSearch" class="folder-view__search" placeholder="Search files..." oninput="_folderViewSearch=this.value.toLowerCase();renderFolderViewList()">
      <label class="folder-view__toggle"><input type="checkbox" checked onchange="_folderViewIncludeSub=this.checked;renderFolderViewList()"> Include sub-items</label>
      <button class="btn" data-action="closeAttachmentFolderView">Close &times;</button>
    </div>
    <div class="folder-view__body">
      <div class="folder-view__list" id="folderViewList"><div class="folder-view__empty">Loading…</div></div>
      <div class="folder-view__preview" id="folderViewPreview"><div class="folder-view__empty">Select a file to preview it here</div></div>
    </div>`;
  document.body.appendChild(overlay);
  document.addEventListener('keydown', _folderViewEscHandler);

  try {
    _folderViewFiles = await apiCall(`/api/tasks/${entityId}/attachments/all`) || [];
  } catch (e) {
    _folderViewFiles = [];
  }
  renderFolderViewList();
}

function _folderViewEscHandler(e) {
  if (e.key === 'Escape') closeAttachmentFolderView();
}

function closeAttachmentFolderView() {
  document.removeEventListener('keydown', _folderViewEscHandler);
  if (_folderViewBlobUrl) { URL.revokeObjectURL(_folderViewBlobUrl); _folderViewBlobUrl = null; }
  const overlay = document.getElementById('folderViewOverlay');
  if (overlay) overlay.remove();
}

function _folderViewIcon(f) {
  if (f.link_url) return isSharePointUrl(f.link_url) ? '&#128196;' : '&#128279;';
  const m = f.mime_type || '';
  if (m.startsWith('image/')) return '&#128444;';
  if (m.includes('pdf')) return '&#128196;';
  if (m.includes('word') || (f.original_name || '').match(/\.docx?$/i)) return '&#128209;';
  if (m.includes('sheet') || m.includes('excel') || (f.original_name || '').match(/\.(xlsx?|csv)$/i)) return '&#128202;';
  return '&#128206;';
}

function _folderViewVisibleFiles() {
  let files = _folderViewFiles;
  if (!_folderViewIncludeSub) files = files.filter(f => f.task_id === _folderViewEntityId);
  if (_folderViewSearch) {
    files = files.filter(f =>
      (f.original_name || '').toLowerCase().includes(_folderViewSearch) ||
      (f.link_title || '').toLowerCase().includes(_folderViewSearch) ||
      (f.link_url || '').toLowerCase().includes(_folderViewSearch) ||
      (f.task_title || '').toLowerCase().includes(_folderViewSearch));
  }
  return files;
}

function renderFolderViewList() {
  const el = document.getElementById('folderViewList');
  if (!el) return;
  const files = _folderViewVisibleFiles();
  if (files.length === 0) {
    el.innerHTML = '<div class="folder-view__empty">No attachments found</div>';
    return;
  }
  const me = _currentUser || {};
  const myName = me.displayName || me.display_name || '';
  el.innerHTML = files.map(f => {
    const display = f.link_url ? (f.link_title || f.link_url) : (f.original_name || f.filename);
    const sizeStr = f.link_url ? 'link' : (f.size_bytes ? (f.size_bytes / (1024 * 1024)).toFixed(1) + ' MB' : '');
    const dateStr = f.created_at ? new Date(f.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const canDelete = f.source === 'universal' && (me.role === 'admin' || (f.uploaded_by && f.uploaded_by === myName));
    const selected = _folderViewSelected && _folderViewSelected.id === f.id && _folderViewSelected.source === f.source;
    return `<div class="folder-view__row${selected ? ' folder-view__row--selected' : ''}" data-action="selectFolderViewFile" data-arg0="${f.id}" data-arg1="${f.source}">
      <span class="folder-view__row-icon">${_folderViewIcon(f)}</span>
      <span class="folder-view__row-main">
        <span class="folder-view__row-name" title="${esc(display)}">${esc(display)}</span>
        <span class="folder-view__row-meta">${esc(f.task_title || '')}${sizeStr ? ' &middot; ' + sizeStr : ''}${dateStr ? ' &middot; ' + dateStr : ''}${f.uploaded_by ? ' &middot; ' + esc(f.uploaded_by) : ''}</span>
      </span>
      ${canDelete ? `<button class="folder-view__row-delete" data-action="deleteFolderViewFile" data-stop data-arg0="${f.id}" title="Delete">&times;</button>` : ''}
    </div>`;
  }).join('');
}

function selectFolderViewFile(id, source) {
  const f = _folderViewFiles.find(x => x.id === id && x.source === source);
  if (!f) return;
  _folderViewSelected = f;
  renderFolderViewList();
  renderFolderViewPreview(f);
}

async function renderFolderViewPreview(f) {
  const el = document.getElementById('folderViewPreview');
  if (!el) return;
  if (_folderViewBlobUrl) { URL.revokeObjectURL(_folderViewBlobUrl); _folderViewBlobUrl = null; }
  const display = f.link_url ? (f.link_title || f.link_url) : (f.original_name || f.filename);
  const headerHtml = `<div class="folder-view__preview-header">
      <span class="folder-view__preview-name" title="${esc(display)}">${esc(display)}</span>
      ${f.link_url
        ? `<a class="btn btn--sm" href="${safeUrl(f.link_url)}" target="_blank" rel="noopener noreferrer">Open link &#8599;</a>`
        : `<button class="btn btn--sm btn--primary" data-action="downloadAttachment" data-prevent data-arg0="${encodeURIComponent(f.filename)}" data-arg1="${esc(f.original_name || f.filename)}">Download</button>`}
    </div>`;

  // Links: SharePoint gets an embedded preview, anything else opens in a tab
  if (f.link_url) {
    if (isSharePointUrl(f.link_url)) {
      el.innerHTML = headerHtml + `<iframe class="folder-view__frame" src="${esc(getSharePointEmbedUrl(f.link_url))}" title="${esc(display)}"></iframe>`;
    } else {
      el.innerHTML = headerHtml + `<div class="folder-view__empty">External link — opens in a new tab</div>`;
    }
    return;
  }

  const mime = f.mime_type || '';
  const ext = (f.original_name || f.filename || '').split('.').pop().toLowerCase();
  const isImage = mime.startsWith('image/');
  const isPdf = mime.includes('pdf') || ext === 'pdf';
  const isDocx = ext === 'docx' || mime.includes('wordprocessingml');

  if (!isImage && !isPdf && !isDocx) {
    el.innerHTML = headerHtml + `<div class="folder-view__empty">No inline preview for .${esc(ext)} files — use Download</div>`;
    return;
  }

  el.innerHTML = headerHtml + `<div class="folder-view__empty">Loading preview…</div>`;
  try {
    const resp = await authFetch(`/api/attachments/download/${encodeURIComponent(f.filename)}`);
    if (!resp.ok) throw new Error('fetch failed');
    if (isDocx) {
      await _ensureMammoth();
      const buf = await resp.arrayBuffer();
      const result = await window.mammoth.convertToHtml({ arrayBuffer: buf });
      // Mammoth output originates from an uploaded file — render it inside a
      // sandboxed iframe (no scripts, no same-origin access) so a crafted
      // document cannot execute in the app context.
      el.innerHTML = headerHtml + `<iframe class="folder-view__frame" sandbox="" title="${esc(display)}"></iframe>`;
      const frame = el.querySelector('iframe');
      frame.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;padding:28px 36px;color:#1a1a1a;background:#fff}table{border-collapse:collapse;margin:12px 0}td,th{border:1px solid #ccc;padding:5px 9px}img{max-width:100%}</style></head><body>${result.value}</body></html>`;
      return;
    }
    const blob = await resp.blob();
    _folderViewBlobUrl = URL.createObjectURL(blob);
    if (isImage) {
      el.innerHTML = headerHtml + `<div class="folder-view__imgwrap"><img src="${_folderViewBlobUrl}" alt="${esc(display)}"></div>`;
    } else {
      el.innerHTML = headerHtml + `<iframe class="folder-view__frame" src="${_folderViewBlobUrl}" title="${esc(display)}"></iframe>`;
    }
  } catch (e) {
    el.innerHTML = headerHtml + `<div class="folder-view__empty">Preview failed — use Download instead</div>`;
  }
}

async function deleteFolderViewFile(id) {
  const f = _folderViewFiles.find(x => x.id === id && x.source === 'universal');
  if (!f) return;
  const display = f.link_url ? (f.link_title || f.link_url) : (f.original_name || f.filename);
  if (!(await themedConfirm(`Delete "${display}"?`, 'Delete attachment'))) return;
  const resp = await authFetch(`/api/attachments/${id}`, { method: 'DELETE' });
  if (resp.ok) {
    _folderViewFiles = _folderViewFiles.filter(x => !(x.id === id && x.source === 'universal'));
    if (_folderViewSelected && _folderViewSelected.id === id) {
      _folderViewSelected = null;
      const el = document.getElementById('folderViewPreview');
      if (el) el.innerHTML = '<div class="folder-view__empty">Select a file to preview it here</div>';
    }
    renderFolderViewList();
    _updateAttachCountSpans('task', f.task_id, _folderViewFiles.filter(x => x.task_id === f.task_id && x.source === 'universal').length);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Failed to delete', 'error');
  }
}
