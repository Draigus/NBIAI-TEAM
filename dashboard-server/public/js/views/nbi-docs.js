// ==================== DOCUMENTATION VIEW ====================

let _docsState = { clientId: null, tree: [], selectedDocId: null, dirty: false, lastSavedAt: null, lastEtag: null, retryCount: 0, saving: false };
let _docsTiptapEditor = null;
let _docsAutosaveTimer = null;
let _docsSavedTimer = null;
let _tiptapPromise = null;

function _docsLoadTiptap() {
  if (_tiptapPromise) return _tiptapPromise;
  _tiptapPromise = (async () => {
    const T = await import('/public/vendor/tiptap-bundle.min.js');
    return {
      Editor: T.Editor, Node: T.Node, mergeAttributes: T.mergeAttributes,
      StarterKit: T.StarterKit,
      Underline: T.Underline,
      Link: T.Link,
      Image: T.Image,
      Placeholder: T.Placeholder,
    };
  })().catch(err => { _tiptapPromise = null; throw err; });
  return _tiptapPromise;
}

async function renderDocumentationView(el) {
  el.innerHTML = '<div class="docs__loading"><div class="docs__loading-bar"></div><div class="docs__loading-bar"></div><div class="docs__loading-bar"></div><div class="docs__loading-bar"></div><div class="docs__loading-bar"></div></div>';
  await _docsLoadTiptap();
  if (!_docsState.clientId) {
    const candidate = Object.values(_apiClientsCache || {}).find(c => c && c.name);
    _docsState.clientId = candidate ? candidate.id : null;
  }
  if (!_docsState.clientId) { el.innerHTML = '<div style="padding:32px;color:var(--text-muted)">No clients yet.</div>'; return; }
  await _docsLoadTree();
  _docsRender(el);
}

async function _docsLoadTree() {
  if (!_docsState.clientId) return;
  const data = await apiCall('/api/documents?client_id=' + encodeURIComponent(_docsState.clientId));
  _docsState.tree = data || [];
  if (!_docsState.selectedDocId || !_docsState.tree.find(d => d.id === _docsState.selectedDocId)) {
    _docsState.selectedDocId = _docsState.tree[0]?.id || null;
  }
}

function _docsRender(el) {
  const clients = Object.values(_apiClientsCache || {}).filter(c => c && c.id && c.name && c.has_active_work).sort((a,b) => a.name.localeCompare(b.name));
  const tree = _docsBuildTree(_docsState.tree);
  let html = '<div class="docs">';
  html += '<div class="docs__hdr">';
  html += '<button class="docs__tree-toggle" aria-label="Toggle page tree" onclick="_docsToggleTree()">&#9776;</button>';
  html += '<div class="docs__hdr-title">Documentation</div>';
  html += '<select class="docs__client-select" aria-label="Select client" onchange="_actDocsSelectClient(this.value)">';
  clients.forEach(c => { html += '<option value="' + esc(c.id) + '"' + (c.id === _docsState.clientId ? ' selected' : '') + '>' + esc(c.name) + '</option>'; });
  html += '</select>';
  html += '<div class="docs__hdr-status" id="docsSavedIndicator" aria-live="polite" role="status">' + _docsSavedLabel() + '</div>';
  html += '</div>';
  html += '<div class="docs__split">';
  html += '<div class="docs__tree-overlay" id="docsTreeOverlay" onclick="_docsCloseTree()"></div>';
  html += '<div class="docs__tree" id="docsTreeCol" role="tree" aria-label="Document pages">';
  html += '<button class="docs__add-root" onclick="_actDocsAddPage(null)">+ New page</button>';
  html += _docsRenderTreeNodes(tree, 0, false);
  html += '</div>';
  html += '<div class="docs__pane" id="docsEditorPane"></div>';
  html += '</div></div>';
  html += '<div class="docs__ctx-menu" id="docsCtxMenu" role="menu">'
    + '<button class="docs__ctx-item" role="menuitem" data-action="rename">Rename</button>'
    + '<button class="docs__ctx-item" role="menuitem" data-action="addchild">Add subpage</button>'
    + '<button class="docs__ctx-item" role="menuitem" data-action="hide">Hide</button>'
    + '<button class="docs__ctx-item docs__ctx-item--danger" role="menuitem" data-action="delete">Delete</button>'
    + '</div>';
  html += '<div class="docs__ctx-menu" id="docsEditorCtxMenu" role="menu">'
    + '<button class="docs__ctx-item" role="menuitem" onclick="_docsAddToReportPick()">&#128196; Add to Report</button>'
    + '</div>';
  el.innerHTML = html;
  _docsRenderEditorPane();
  _docsBindContextMenu();
}

function _docsBuildTree(flat) {
  const byParent = {};
  flat.forEach(d => { const k = d.parent_id || '_root'; (byParent[k] = byParent[k] || []).push(d); });
  Object.values(byParent).forEach(arr => arr.sort((a,b) => (a.sort_order - b.sort_order) || a.title.localeCompare(b.title)));
  function build(pid) { return (byParent[pid || '_root'] || []).map(d => ({ ...d, children: build(d.id) })); }
  return build(null);
}

function _docsRenderTreeNodes(nodes, depth, parentHidden) {
  if (nodes.length === 0 && depth === 0) return '<div class="docs__tree-empty">No pages yet</div>';
  if (nodes.length === 0) return '';
  let html = '<ul class="docs__tree-list">';
  nodes.forEach((n, idx) => {
    const sel = n.id === _docsState.selectedDocId;
    const isHidden = n.hidden || parentHidden;
    const lock = n.visibility === 'nbi_only' ? '<span class="docs__tree-lock" title="NBI internal only">&#x1f512;</span>' : '';
    const hiddenLabel = n.hidden ? '<span class="docs__tree-hidden-label">&#x1f441; (hidden)</span>' : (parentHidden ? '<span class="docs__tree-hidden-label">(inherited)</span>' : '');
    html += '<li class="docs__tree-li' + (sel ? ' docs__tree-li--selected' : '') + (isHidden ? ' docs__tree-li--hidden' : '') + '" style="padding-left:' + (depth * 12) + 'px" draggable="true" role="treeitem" aria-selected="' + (sel ? 'true' : 'false') + '" data-doc-id="' + escAttrJs(n.id) + '" data-doc-parent="' + escAttrJs(n.parent_id || '') + '" data-doc-idx="' + idx + '" ondragstart="_docsDragStart(event)" ondragover="_docsDragOver(event)" ondragleave="_docsDragLeave(event)" ondrop="_docsDrop(event)">';
    html += '<button class="docs__tree-row" onclick="_actDocsSelectPage(\'' + escAttrJs(n.id) + '\')">' + lock + '<span>' + esc(n.title) + '</span>' + hiddenLabel + '</button>';
    html += '<button class="docs__tree-add" title="Add child page" onclick="event.stopPropagation();_actDocsAddPage(\'' + escAttrJs(n.id) + '\')">+</button>';
    html += '</li>';
    if (n.children.length) html += _docsRenderTreeNodes(n.children, depth + 1, isHidden);
  });
  html += '</ul>';
  return html;
}

let _docsDraggedId = null;

function _docsDragStart(e) {
  _docsDraggedId = e.currentTarget.dataset.docId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', _docsDraggedId);
  e.currentTarget.style.opacity = '0.4';
}

function _docsDragOver(e) {
  e.preventDefault();
  const li = e.currentTarget;
  if (li.dataset.docId === _docsDraggedId) return;
  // Determine drop zone: top 25% = above, bottom 25% = below, middle 50% = inside (as child)
  const rect = li.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const pct = y / rect.height;
  document.querySelectorAll('.docs__tree-li[data-drop]').forEach(el => el.removeAttribute('data-drop'));
  if (_docsIsDescendant(_docsDraggedId, li.dataset.docId)) {
    li.setAttribute('data-drop', 'forbidden');
  } else if (pct < 0.25) {
    li.setAttribute('data-drop', 'above');
  } else if (pct > 0.75) {
    li.setAttribute('data-drop', 'below');
  } else {
    li.setAttribute('data-drop', 'inside');
  }
  e.dataTransfer.dropEffect = 'move';
}

function _docsDragLeave(e) {
  e.currentTarget.removeAttribute('data-drop');
}

function _docsIsDescendant(draggedId, targetId) {
  function check(nodes) {
    for (const n of nodes) {
      if (n.id === draggedId) return checkChildren(n, targetId);
      const found = check(n.children);
      if (found !== undefined) return found;
    }
  }
  function checkChildren(node, tid) {
    if (node.id === tid) return true;
    for (const c of node.children) { if (checkChildren(c, tid)) return true; }
    return false;
  }
  const tree = _docsBuildTree(_docsState.tree);
  return check(tree) || false;
}

async function _docsDrop(e) {
  e.preventDefault();
  document.querySelectorAll('.docs__tree-li[data-drop]').forEach(el => el.removeAttribute('data-drop'));
  document.querySelectorAll('.docs__tree-li[style*="opacity"]').forEach(el => el.style.opacity = '');
  const li = e.currentTarget;
  const targetId = li.dataset.docId;
  if (!_docsDraggedId || _docsDraggedId === targetId) return;
  if (_docsIsDescendant(_docsDraggedId, targetId)) { toast('Cannot move a page into its own child', 'error'); return; }

  const rect = li.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const pct = y / rect.height;

  let parent_id, position;
  const targetParent = li.dataset.docParent || null;
  const targetIdx = parseInt(li.dataset.docIdx, 10);

  if (pct < 0.25) {
    parent_id = targetParent;
    position = targetIdx;
  } else if (pct > 0.75) {
    parent_id = targetParent;
    position = targetIdx + 1;
  } else {
    parent_id = targetId;
    position = 0;
  }

  const resp = await authFetch('/api/documents/' + encodeURIComponent(_docsDraggedId) + '/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parent_id: parent_id || null, position }),
  });
  _docsDraggedId = null;
  if (resp && resp.ok) {
    await _docsLoadTree();
    renderContent();
  } else {
    toast('Move failed', 'error');
  }
}

function _docsToggleTree() {
  const tree = document.getElementById('docsTreeCol');
  const ov = document.getElementById('docsTreeOverlay');
  if (!tree) return;
  const opening = !tree.classList.contains('docs__tree--open');
  tree.classList.toggle('docs__tree--open', opening);
  if (ov) ov.classList.toggle('docs__tree-overlay--open', opening);
}
function _docsCloseTree() {
  const tree = document.getElementById('docsTreeCol');
  const ov = document.getElementById('docsTreeOverlay');
  if (tree) tree.classList.remove('docs__tree--open');
  if (ov) ov.classList.remove('docs__tree-overlay--open');
}

// ---- Context menu ----
let _docsCtxTarget = null;

function _docsShowCtxMenu(x, y, docId) {
  _docsCtxTarget = docId;
  const menu = document.getElementById('docsCtxMenu');
  if (!menu) return;
  const doc = _docsState.tree.find(d => d.id === docId);
  const hideBtn = menu.querySelector('[data-action="hide"]');
  if (hideBtn && doc) {
    hideBtn.textContent = doc.hidden ? 'Unhide' : 'Hide';
  }
  menu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 160) + 'px';
  menu.classList.add('docs__ctx-menu--open');
}

function _docsHideCtxMenu() {
  const menu = document.getElementById('docsCtxMenu');
  if (menu) menu.classList.remove('docs__ctx-menu--open');
  const edMenu = document.getElementById('docsEditorCtxMenu');
  if (edMenu) edMenu.classList.remove('docs__ctx-menu--open');
  _docsCtxTarget = null;
}

function _docsBindContextMenu() {
  const treeCol = document.getElementById('docsTreeCol');
  if (!treeCol) return;
  treeCol.addEventListener('contextmenu', (e) => {
    const li = e.target.closest('.docs__tree-li');
    if (!li) return;
    e.preventDefault();
    const docId = li.dataset.docId;
    _docsShowCtxMenu(e.clientX, e.clientY, docId);
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.docs__ctx-menu')) _docsHideCtxMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') _docsHideCtxMenu();
});

document.addEventListener('click', (e) => {
  const item = e.target.closest('.docs__ctx-item');
  if (!item) return;
  const action = item.dataset.action;
  const docId = _docsCtxTarget;
  _docsHideCtxMenu();
  if (!docId) return;
  switch (action) {
    case 'rename': _actDocsInlineRename(docId); break;
    case 'addchild': _actDocsAddPage(docId); break;
    case 'hide': _actDocsToggleHidden(docId); break;
    case 'delete': _actDocsDeleteById(docId); break;
  }
});

async function _actDocsDeleteById(docId) {
  if (!confirm('Delete this page and all its sub-pages?')) return;
  await authFetch('/api/documents/' + encodeURIComponent(docId), { method: 'DELETE' });
  if (_docsState.selectedDocId === docId) _docsState.selectedDocId = null;
  await _docsLoadTree(); renderContent();
}

// ---- Inline rename ----
function _actDocsInlineRename(docId) {
  const li = document.querySelector('.docs__tree-li[data-doc-id="' + docId + '"]');
  if (!li) return;
  const row = li.querySelector('.docs__tree-row');
  const span = row.querySelector('span');
  if (!span) return;

  const currentTitle = span.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'docs__tree-rename';
  input.value = currentTitle;
  input.style.cssText = 'font-size:inherit;padding:1px 4px;border:1px solid var(--accent);border-radius:3px;background:var(--bg-input);color:var(--text-primary);width:100%;outline:none;';
  span.replaceWith(input);
  input.focus();
  input.select();

  let saved = false;
  async function save() {
    if (saved) return;
    saved = true;
    const newTitle = input.value.trim() || currentTitle;
    const newSpan = document.createElement('span');
    newSpan.textContent = newTitle;
    input.replaceWith(newSpan);
    if (newTitle !== currentTitle) {
      const headers = { 'Content-Type': 'application/json' };
      const fresh = await authFetch('/api/documents/' + encodeURIComponent(docId));
      if (fresh && fresh.ok) headers['If-Match'] = fresh.headers.get('ETag');
      const resp = await authFetch('/api/documents/' + encodeURIComponent(docId), {
        method: 'PATCH', headers: headers, body: JSON.stringify({ title: newTitle }),
      });
      if (resp && resp.ok) {
        const etag = resp.headers.get('ETag');
        if (etag && _docsState.selectedDocId === docId) _docsState.lastEtag = etag;
      }
      await _docsLoadTree();
      const treeCol = document.getElementById('docsTreeCol');
      if (treeCol) {
        const tree = _docsBuildTree(_docsState.tree);
        treeCol.innerHTML = '<button class="docs__add-root" onclick="_actDocsAddPage(null)">+ New page</button>' + _docsRenderTreeNodes(tree, 0, false);
      }
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { saved = true; const s = document.createElement('span'); s.textContent = currentTitle; input.replaceWith(s); }
  });
  input.addEventListener('blur', save);
}

// ---- Hidden page toggle ----
async function _actDocsToggleHidden(docId) {
  const doc = _docsState.tree.find(d => d.id === docId);
  if (!doc) return;
  const freshResp = await authFetch('/api/documents/' + encodeURIComponent(docId));
  if (!freshResp || !freshResp.ok) { toast('Could not load page', 'error'); return; }
  const etag = freshResp.headers.get('ETag');

  const resp = await authFetch('/api/documents/' + encodeURIComponent(docId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'If-Match': etag },
    body: JSON.stringify({ hidden: !doc.hidden }),
  });
  if (resp && resp.ok) {
    if (_docsState.selectedDocId === docId) {
      _docsState.lastEtag = resp.headers.get('ETag');
    }
    await _docsLoadTree();
    renderContent();
  } else {
    toast('Failed to update visibility', 'error');
  }
}

function _docsSavedLabel() {
  if (_docsState.retryCount >= 3) return '<span style="color:var(--danger)">Save failed — retrying</span>';
  if (_docsState.saving) return '<span style="color:var(--warning)">Saving...</span>';
  if (_docsState.dirty) return '<span style="color:var(--warning)">Unsaved</span>';
  if (_docsState.lastSavedAt) {
    const secs = Math.round((Date.now() - _docsState.lastSavedAt) / 1000);
    return '<span style="color:var(--text-muted)">Saved ' + secs + 's ago</span>';
  }
  return '';
}

async function _docsRenderEditorPane() {
  const el = document.getElementById('docsEditorPane');
  if (!el) return;
  if (_docsTiptapEditor) { _docsTiptapEditor.destroy(); _docsTiptapEditor = null; }
  clearTimeout(_docsAutosaveTimer);
  clearTimeout(_docsSavedTimer);
  if (!_docsState.selectedDocId) {
    el.innerHTML = '<div class="docs__pane-empty">Pick a page from the tree, or click <strong>+ New page</strong> to start.</div>';
    return;
  }

  el.innerHTML = '<div class="docs__loading"><div class="docs__loading-bar"></div><div class="docs__loading-bar"></div><div class="docs__loading-bar"></div></div>';
  const resp = await authFetch('/api/documents/' + encodeURIComponent(_docsState.selectedDocId));
  if (!resp || !resp.ok) { el.innerHTML = '<div class="docs__pane-empty">Could not load page.</div>'; return; }
  const etag = resp.headers.get('ETag');
  const doc = await resp.json();
  _docsState.lastEtag = etag;

  let recoveredContent = null;
  try {
    const raw = localStorage.getItem('nbi_docs_unsaved_' + _docsState.selectedDocId);
    if (raw) {
      const blob = JSON.parse(raw);
      const serverTs = doc.updated_at ? new Date(doc.updated_at).getTime() : 0;
      if (blob.ts > serverTs && blob.body_json) {
        recoveredContent = blob;
      } else {
        localStorage.removeItem('nbi_docs_unsaved_' + _docsState.selectedDocId);
      }
    }
  } catch(e) {}

  const isNbiOnly = doc.visibility === 'nbi_only';
  const visBadge = isNbiOnly ? '<span class="docs__vis-badge">NBI ONLY</span>' : '';
  el.innerHTML = (recoveredContent ? '<div class="docs__recovery-banner" id="docsRecoveryBanner" style="background:var(--warning-bg, #3a2a00);border:1px solid var(--warning);padding:8px 12px;margin-bottom:8px;border-radius:4px;display:flex;align-items:center;gap:8px;font-size:0.82rem"><span>Unsaved changes found from ' + new Date(recoveredContent.ts).toLocaleString() + '.</span><button class="btn btn--sm btn--primary" onclick="_actDocsRecover()">Restore</button><button class="btn btn--sm" onclick="_actDocsDiscardRecovery()">Discard</button></div>' : '')
    + (doc.hidden ? '<div class="docs__hidden-banner">This page is hidden from non-admin users.</div>' : '')
    + '<div class="docs__title-row">'
    + '<input class="docs__title" value="' + esc(doc.title) + '" oninput="_actDocsTitleInput(this.value)">'
    + visBadge
    + '<button class="docs__vis-toggle" onclick="_actDocsToggleVis()">' + (isNbiOnly ? 'Make visible to client' : 'Mark as NBI only') + '</button>'
    + '<button class="docs__del-btn" onclick="_actDocsDelete()">Delete</button>'
    + '</div>'
    + '<div class="docs__toolbar" id="docsToolbar"></div>'
    + '<div class="docs__editor" id="docsEditor"></div>';

  const T = await _docsLoadTiptap();

  const NbiInternalBlock = T.Node.create({
    name: 'nbiInternalBlock', group: 'block', content: 'block+', defining: true,
    parseHTML() { return [{ tag: 'div[data-nbi-internal="true"]' }]; },
    renderHTML({ HTMLAttributes }) {
      return ['div', T.mergeAttributes(HTMLAttributes, { 'data-nbi-internal': 'true', 'class': 'docs-nbi-block' }), 0];
    },
    addCommands() {
      return { toggleNbiInternal: () => ({ commands, state }) => {
        const { from } = state.selection;
        const resolved = state.doc.resolve(from);
        for (let d = resolved.depth; d > 0; d--) {
          if (resolved.node(d).type.name === 'nbiInternalBlock') return commands.lift('nbiInternalBlock');
        }
        return commands.wrapIn('nbiInternalBlock');
      } };
    },
    addKeyboardShortcuts() {
      return { 'Mod-Shift-i': () => this.editor.commands.toggleNbiInternal() };
    },
  });

  const SlackCard = T.Node.create({
    name: 'slackCard', group: 'block', atom: true,
    addAttributes() { return { url: { default: '' }, channel: { default: '' }, msgId: { default: '' } }; },
    parseHTML() { return [{ tag: 'div[data-slack-card]' }]; },
    renderHTML({ HTMLAttributes }) {
      const { url, channel, msgId } = HTMLAttributes;
      return ['div', T.mergeAttributes(HTMLAttributes, { 'data-slack-card': 'true', 'class': 'docs-slack-card' }),
        ['div', { class: 'docs-slack-card__head' }, '#' + (channel || 'slack')],
        ['div', { class: 'docs-slack-card__body' }, msgId ? 'Message ' + msgId : 'Open in Slack'],
        ['a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'docs-slack-card__btn' }, 'Open']
      ];
    },
  });

  window._docsRecoveredContent = recoveredContent;

  _docsTiptapEditor = new T.Editor({
    element: document.getElementById('docsEditor'),
    extensions: [
      T.StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      T.Underline,
      T.Link.configure({ openOnClick: true, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      T.Image.configure({ inline: false }),
      T.Placeholder.configure({ placeholder: 'Start typing...' }),
      NbiInternalBlock,
      SlackCard,
    ],
    content: doc.body_json || { type: 'doc', content: [] },
    onUpdate: () => {
      _docsState.dirty = true;
      try { localStorage.setItem('nbi_docs_unsaved_' + _docsState.selectedDocId, JSON.stringify({ body_json: _docsTiptapEditor.getJSON(), ts: Date.now() })); } catch(e) {}
      _docsScheduleSave();
      _docsUpdateSavedIndicator();
    },
  });

  _docsRenderToolbar();

  // Slack permalink paste handler
  _docsTiptapEditor.view.dom.addEventListener('paste', (e) => {
    const text = (e.clipboardData || window.clipboardData)?.getData('text');
    const m = text && text.match(/^https?:\/\/([\w-]+)\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)$/);
    if (m) {
      e.preventDefault();
      _docsTiptapEditor.chain().focus().insertContent({ type: 'slackCard', attrs: { url: text, channel: m[2], msgId: m[3] } }).run();
    }
  }, true);

  // Clipboard paste image upload
  _docsTiptapEditor.view.dom.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) _docsUploadAndInsertImage(blob);
        return;
      }
    }
  });

  // Keyboard shortcuts
  _docsTiptapEditor.view.dom.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 's') {
      e.preventDefault();
      _docsFlushSave();
    } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'k') {
      e.preventDefault();
      _docsTb('link');
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      _docsTb('nbi');
    }
  });

  // Right-click "Add to Report" when text is selected
  _docsTiptapEditor.view.dom.addEventListener('contextmenu', (e) => {
    const sel = window.getSelection();
    const selectedText = sel ? sel.toString().trim() : '';
    if (!selectedText) return;
    e.preventDefault();
    _docsAddToReportText = selectedText;
    const menu = document.getElementById('docsEditorCtxMenu');
    if (!menu) return;
    menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 60) + 'px';
    menu.classList.add('docs__ctx-menu--open');
  });
}

let _docsAddToReportText = '';

function _docsAddToReportPick() {
  const menu = document.getElementById('docsEditorCtxMenu');
  if (menu) menu.classList.remove('docs__ctx-menu--open');
  if (!_docsAddToReportText) return;

  const docClientObj = _docsState.clientId ? Object.values(_apiClientsCache || {}).find(c => c.id === _docsState.clientId) : null;
  const clientName = docClientObj ? docClientObj.name : currentFilter.client;
  const clients = clientName ? [clientName] : getAllClients();
  if (clients.length === 0) { toast('No clients found.', 'warning'); return; }

  // Build nested tree: Client → Project → Feature
  const tree = {};
  clients.forEach(c => {
    const projects = tasks.filter(t => getTaskClient(t) === c && getItemType(t) === 'project');
    if (projects.length === 0) return;
    tree[c] = projects.sort((a, b) => a.title.localeCompare(b.title)).map(p => {
      const features = tasks.filter(t => t.parentId === p.id && getItemType(t) === 'feature')
        .sort((a, b) => a.title.localeCompare(b.title));
      return { ...p, _features: features };
    });
  });

  if (Object.keys(tree).length === 0) { toast('No projects found to add to.', 'warning'); return; }

  let html = `<div class="modal-overlay open" id="addToReportModal" role="dialog" aria-modal="true" data-action="_actRemoveIfSelf" data-pass-event data-pass-el>
    <div class="modal" style="max-width:var(--modal-sm)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h2 style="margin:0;font-size:1rem">Add to Report</h2>
        <button class="btn btn--ghost" data-action="_actModalRemove" data-arg0="addToReportModal">&times;</button>
      </div>
      <p style="color:var(--text-muted);font-size:0.78rem;margin-bottom:4px">Selected text will be appended to the Documentation field:</p>
      <div style="background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:8px;font-size:0.75rem;color:var(--text-secondary);max-height:60px;overflow-y:auto;margin-bottom:12px;white-space:pre-wrap">${esc(_docsAddToReportText.slice(0, 200))}${_docsAddToReportText.length > 200 ? '...' : ''}</div>
      <p style="color:var(--text-muted);font-size:0.78rem;margin-bottom:8px">Select a target:</p>
      <div style="max-height:350px;overflow-y:auto;border:1px solid var(--border-default);border-radius:var(--radius-sm)">`;

  for (const [client, projects] of Object.entries(tree)) {
    if (clients.length > 1) {
      html += `<div style="padding:6px 12px;background:var(--bg-surface);font-size:0.75rem;font-weight:700;color:var(--text-muted);letter-spacing:0.05em;text-transform:uppercase;border-bottom:1px solid var(--border-subtle)">${esc(client)}</div>`;
    }
    projects.forEach(p => {
      const pMeta = ITEM_TYPE_META.project;
      html += `<div class="picker-row" style="padding:6px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border-subtle)" onclick="_docsAppendToReport('${escAttrJs(p.id)}')" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''"><span class="item-type-badge" style="background:${pMeta.colour};font-size:0.75rem;padding:1px 5px">P</span><span style="font-size:0.82rem;font-weight:600">${esc(p.title)}</span></div>`;
      p._features.forEach(f => {
        const fMeta = ITEM_TYPE_META.feature;
        html += `<div class="picker-row" style="padding:5px 12px 5px 32px;cursor:pointer;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border-subtle)" onclick="_docsAppendToReport('${escAttrJs(f.id)}')" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''"><span class="item-type-badge" style="background:${fMeta.colour};font-size:0.75rem;padding:1px 5px">F</span><span style="font-size:0.78rem">${esc(f.title)}</span></div>`;
      });
    });
  }

  html += `</div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  _activateDynamicModal('addToReportModal');
}

async function _docsAppendToReport(taskId) {
  const modal = document.getElementById('addToReportModal');
  if (modal) modal.remove();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const existing = (task.documentation_link || task.documentationLink || '').trim();
  const newVal = existing ? existing + '\n\n' + _docsAddToReportText : _docsAddToReportText;
  await updateTask(taskId, 'documentationLink', newVal);
  toast('Added to ' + (task.title || 'report'), 'success');
  _docsAddToReportText = '';
}

function _docsRenderToolbar() {
  const el = document.getElementById('docsToolbar');
  if (!el || !_docsTiptapEditor) return;
  const E = _docsTiptapEditor;
  function btn(label, action, isActive, ariaLabel) {
    return '<button class="docs__tb-btn' + (isActive ? ' docs__tb-btn--active' : '') + '" aria-label="' + ariaLabel + '" onclick="' + action + '">' + label + '</button>';
  }
  el.innerHTML = [
    btn('<b>B</b>', '_docsTb(\'bold\')', E.isActive('bold'), 'Bold (Ctrl+B)'),
    btn('<i>I</i>', '_docsTb(\'italic\')', E.isActive('italic'), 'Italic (Ctrl+I)'),
    btn('<u>U</u>', '_docsTb(\'underline\')', E.isActive('underline'), 'Underline (Ctrl+U)'),
    btn('<s>S</s>', '_docsTb(\'strike\')', E.isActive('strike'), 'Strikethrough'),
    '<span class="docs__tb-sep"></span>',
    btn('H1', '_docsTb(\'h1\')', E.isActive('heading', { level: 1 }), 'Heading 1'),
    btn('H2', '_docsTb(\'h2\')', E.isActive('heading', { level: 2 }), 'Heading 2'),
    btn('H3', '_docsTb(\'h3\')', E.isActive('heading', { level: 3 }), 'Heading 3'),
    btn('&bull; List', '_docsTb(\'ul\')', E.isActive('bulletList'), 'Bullet list'),
    btn('1. List', '_docsTb(\'ol\')', E.isActive('orderedList'), 'Numbered list'),
    btn('&ldquo;', '_docsTb(\'blockquote\')', E.isActive('blockquote'), 'Blockquote'),
    btn('&lt;/&gt;', '_docsTb(\'code\')', E.isActive('code'), 'Inline code'),
    '<span class="docs__tb-sep"></span>',
    btn('Link', '_docsTb(\'link\')', false, 'Insert link (Ctrl+K)'),
    btn('Image', '_docsTb(\'image\')', false, 'Insert image'),
    '<span class="docs__tb-sep"></span>',
    btn('NBI', '_docsTb(\'nbi\')', E.isActive('nbiInternalBlock'), 'NBI internal block (Ctrl+Shift+I)'),
  ].join('');
}

function _docsTb(name) {
  const E = _docsTiptapEditor; if (!E) return;
  const c = E.chain().focus();
  switch (name) {
    case 'bold': c.toggleBold().run(); break;
    case 'italic': c.toggleItalic().run(); break;
    case 'underline': c.toggleUnderline().run(); break;
    case 'strike': c.toggleStrike().run(); break;
    case 'h1': c.toggleHeading({ level: 1 }).run(); break;
    case 'h2': c.toggleHeading({ level: 2 }).run(); break;
    case 'h3': c.toggleHeading({ level: 3 }).run(); break;
    case 'ul': c.toggleBulletList().run(); break;
    case 'ol': c.toggleOrderedList().run(); break;
    case 'blockquote': c.toggleBlockquote().run(); break;
    case 'code': c.toggleCode().run(); break;
    case 'link': {
      const prev = E.getAttributes('link').href || '';
      const url = prompt('Link URL', prev || 'https://');
      if (url === null) return;
      if (url === '') c.unsetLink().run();
      else c.extendMarkRange('link').setLink({ href: url }).run();
      break;
    }
    case 'image': _docsInsertImage(); return;
    case 'nbi': c.toggleNbiInternal().run(); break;
  }
  _docsRenderToolbar();
}

function _docsInsertImage() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/gif,image/webp';
  inp.onchange = () => { if (inp.files[0]) _docsUploadAndInsertImage(inp.files[0]); };
  inp.click();
}

async function _docsUploadAndInsertImage(file) {
  const fd = new FormData(); fd.append('file', file);
  const resp = await authFetch('/api/documents/' + encodeURIComponent(_docsState.selectedDocId) + '/attachments', { method: 'POST', body: fd });
  if (!resp || !resp.ok) { toast('Image upload failed', 'error'); return; }
  const data = await resp.json();
  const url = data?.url || data?.data?.url;
  if (url && _docsTiptapEditor) _docsTiptapEditor.chain().focus().setImage({ src: url, alt: file.name }).run();
}

function _docsScheduleSave() {
  clearTimeout(_docsAutosaveTimer);
  const delay = _docsState.retryCount > 0 ? Math.min(800 * Math.pow(2, _docsState.retryCount), 15000) : 800;
  _docsAutosaveTimer = setTimeout(_docsSaveNow, delay);
}

function _docsFlushSave() {
  clearTimeout(_docsAutosaveTimer);
  _docsSaveNow();
}

async function _docsSaveNow() {
  if (!_docsTiptapEditor || !_docsState.selectedDocId || _docsState.saving) return;
  _docsState.saving = true;
  _docsUpdateSavedIndicator();
  const docId = _docsState.selectedDocId;
  const body = _docsTiptapEditor.getJSON();
  const headers = { 'Content-Type': 'application/json' };
  if (_docsState.lastEtag) headers['If-Match'] = _docsState.lastEtag;
  let resp;
  try {
    resp = await authFetch('/api/documents/' + encodeURIComponent(docId), {
      method: 'PATCH', headers: headers,
      body: JSON.stringify({ body_json: body }),
    });
  } catch(e) { resp = null; }
  _docsState.saving = false;
  if (!resp || (!resp.ok && resp.status !== 409)) {
    _docsState.retryCount++;
    _docsUpdateSavedIndicator();
    if (_docsState.retryCount <= 5) _docsScheduleSave();
    return;
  }
  if (resp.status === 409) {
    _docsState.dirty = false;
    const choice = confirm('Another user has edited this page. Click OK to reload their version (your changes will be lost) or Cancel to overwrite with yours.');
    if (choice) {
      await _docsLoadTree();
      _docsRenderEditorPane();
    } else {
      const retry = await authFetch('/api/documents/' + encodeURIComponent(docId), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'If-Match': '*' },
        body: JSON.stringify({ body_json: body }),
      });
      if (retry && retry.ok) {
        const etag = retry.headers.get('ETag');
        if (etag) _docsState.lastEtag = etag;
        _docsState.lastSavedAt = Date.now();
        try { localStorage.removeItem('nbi_docs_unsaved_' + docId); } catch(e) {}
      }
    }
    _docsState.retryCount = 0;
    _docsUpdateSavedIndicator();
    return;
  }
  if (resp.ok) {
    const etag = resp.headers.get('ETag');
    if (etag) _docsState.lastEtag = etag;
    _docsState.dirty = false;
    _docsState.retryCount = 0;
    _docsState.lastSavedAt = Date.now();
    try { localStorage.removeItem('nbi_docs_unsaved_' + docId); } catch(e) {}
    _docsUpdateSavedIndicator();
  }
}

function _docsUpdateSavedIndicator() {
  const el = document.getElementById('docsSavedIndicator');
  if (el) el.innerHTML = _docsSavedLabel();
  clearTimeout(_docsSavedTimer);
  if (_docsState.lastSavedAt) _docsSavedTimer = setTimeout(_docsUpdateSavedIndicator, 5000);
}

function _actDocsRecover() {
  if (window._docsRecoveredContent && _docsTiptapEditor) {
    _docsTiptapEditor.commands.setContent(window._docsRecoveredContent.body_json);
    _docsState.dirty = true;
    _docsScheduleSave();
    toast('Restored unsaved changes');
  }
  const banner = document.getElementById('docsRecoveryBanner');
  if (banner) banner.remove();
  window._docsRecoveredContent = null;
}
function _actDocsDiscardRecovery() {
  try { localStorage.removeItem('nbi_docs_unsaved_' + _docsState.selectedDocId); } catch(e) {}
  const banner = document.getElementById('docsRecoveryBanner');
  if (banner) banner.remove();
  window._docsRecoveredContent = null;
}

async function _actDocsSelectClient(id) { _docsState.clientId = id; _docsState.selectedDocId = null; await _docsLoadTree(); renderContent(); }
async function _actDocsSelectPage(id) {
  if (_docsState.dirty && _docsTiptapEditor) await _docsSaveNow();
  _docsState.selectedDocId = id; _docsRenderEditorPane(); _docsCloseTree();
  const treeCol = document.getElementById('docsTreeCol');
  if (treeCol) {
    const tree = _docsBuildTree(_docsState.tree);
    treeCol.innerHTML = '<button class="docs__add-root" onclick="_actDocsAddPage(null)">+ New page</button>' + _docsRenderTreeNodes(tree, 0, false);
  }
}
async function _actDocsAddPage(parentId) {
  const data = await apiCall('/api/documents', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: _docsState.clientId, parent_id: parentId, title: 'Untitled' })
  });
  if (data?.id) { _docsState.selectedDocId = data.id; await _docsLoadTree(); renderContent(); }
}

async function _actDocsTitleInput(value) {
  clearTimeout(_docsAutosaveTimer);
  _docsAutosaveTimer = setTimeout(async () => {
    const headers = { 'Content-Type': 'application/json' };
    if (_docsState.lastEtag) headers['If-Match'] = _docsState.lastEtag;
    const resp = await authFetch('/api/documents/' + encodeURIComponent(_docsState.selectedDocId), {
      method: 'PATCH', headers: headers, body: JSON.stringify({ title: value }),
    });
    if (resp && resp.ok) {
      const etag = resp.headers.get('ETag');
      if (etag) _docsState.lastEtag = etag;
    }
    await _docsLoadTree();
    const treeCol = document.getElementById('docsTreeCol');
    if (treeCol) {
      const tree = _docsBuildTree(_docsState.tree);
      treeCol.innerHTML = '<button class="docs__add-root" onclick="_actDocsAddPage(null)">+ New page</button>' + _docsRenderTreeNodes(tree, 0, false);
    }
  }, 600);
}

async function _actDocsToggleVis() {
  const doc = _docsState.tree.find(d => d.id === _docsState.selectedDocId);
  if (!doc) return;
  const headers = { 'Content-Type': 'application/json' };
  if (_docsState.lastEtag) headers['If-Match'] = _docsState.lastEtag;
  const resp = await authFetch('/api/documents/' + encodeURIComponent(doc.id), {
    method: 'PATCH', headers: headers,
    body: JSON.stringify({ visibility: doc.visibility === 'nbi_only' ? 'all' : 'nbi_only' }),
  });
  if (resp && resp.ok) {
    const etag = resp.headers.get('ETag');
    if (etag) _docsState.lastEtag = etag;
  }
  await _docsLoadTree(); renderContent();
}

async function _actDocsDelete() {
  if (!confirm('Delete this page and all its sub-pages?')) return;
  await authFetch('/api/documents/' + encodeURIComponent(_docsState.selectedDocId), { method: 'DELETE' });
  _docsState.selectedDocId = null;
  await _docsLoadTree(); renderContent();
}

function _actDocsOpenForClient(clientName) {
  const c = Object.values(_apiClientsCache || {}).find(x => x && x.name === clientName);
  if (!c) return;
  _docsState.clientId = c.id;
  _docsState.selectedDocId = null;
  switchView('documentation');
}

