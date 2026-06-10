// ==================== SETTINGS VIEW ====================

/** Activity feed view state — uses unique names to avoid colliding with dashboard's loadActivityFeed */
let _actViewData = null, _actViewCursor = null, _actViewLoading = false, _actViewFilter = '';

async function _loadActViewData(append) {
  if (_actViewLoading) return;
  _actViewLoading = true;
  try {
    const params = new URLSearchParams({ limit: '30' });
    if (append && _actViewCursor) params.set('cursor', _actViewCursor);
    if (_actViewFilter) params.set('entity_type', _actViewFilter);
    const resp = await authFetch('/api/activity?' + params.toString());
    if (!resp.ok) throw new Error('Failed to load activity');
    const data = await resp.json();
    if (append && _actViewData) { _actViewData.entries = _actViewData.entries.concat(data.entries); }
    else { _actViewData = data; }
    _actViewCursor = data.nextCursor;
  } catch (e) { console.warn('[Activity] load error:', e.message); }
  finally { _actViewLoading = false; }
}

function renderActivityFeedView(el) {
  if (!_actViewData) {
    el.innerHTML = '<div style="padding:var(--space-xl);text-align:center;color:var(--text-muted)">Loading activity...</div>';
    _loadActViewData(false).then(function() { renderActivityFeedView(el); });
    return;
  }
  const entries = _actViewData.entries || [];
  const filterOptions = ['', 'task', 'lead', 'bug_report', 'candidate', 'client', 'document'];
  const filterLabels = { '': 'All', task: 'Tasks', lead: 'Leads', bug_report: 'Bugs', candidate: 'Hiring', client: 'Clients', document: 'Docs' };
  let html = '<div style="max-width:800px;margin:0 auto;padding:var(--space-xl)">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-xl)">';
  html += '<h2 style="font-size:1.25rem;font-weight:700;color:var(--text-primary);margin:0">Activity Feed</h2>';
  html += '<div style="display:flex;gap:var(--space-xs)">';
  for (const f of filterOptions) {
    const active = _actViewFilter === f;
    html += '<button class="btn btn--sm' + (active ? ' btn--primary' : '') + '" style="font-size:12px;padding:4px 10px" onclick="_actViewFilter=\'' + f + '\';_actViewData=null;_actViewCursor=null;renderContent()">' + esc(filterLabels[f]) + '</button>';
  }
  html += '</div></div>';
  if (entries.length === 0) {
    html += '<div style="text-align:center;padding:var(--space-2xl);color:var(--text-muted)">No activity found.</div>';
  } else {
    let lastDate = '';
    for (const e of entries) {
      const d = new Date(e.createdAt);
      const dateStr = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      if (dateStr !== lastDate) {
        lastDate = dateStr;
        html += '<div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;padding:var(--space-md) 0 var(--space-xs);border-bottom:1px solid var(--border-subtle);margin-top:var(--space-md)">' + esc(dateStr) + '</div>';
      }
      const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const clickAttr = e.entityType === 'task' && e.entityId ? ' style="cursor:pointer" onclick="navigateToTaskInTree(\'' + esc(e.entityId) + '\')"' : '';
      html += '<div style="display:flex;gap:var(--space-md);padding:var(--space-sm) 0;border-bottom:1px solid var(--border-subtle);align-items:flex-start"' + clickAttr + '>';
      html += '<span style="flex-shrink:0;font-size:12px;color:var(--text-muted);width:50px;padding-top:2px">' + esc(time) + '</span>';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-size:14px;color:var(--text-primary)">' + esc(e.summary) + '</div>';
      if (e.detail) html += '<div style="font-size:12px;color:var(--text-secondary);margin-top:2px">' + esc(e.detail) + '</div>';
      html += '</div>';
      html += '<span style="flex-shrink:0;font-size:12px;padding:2px 6px;border-radius:var(--radius-sm);background:var(--bg-hover);color:var(--text-muted)">' + esc(e.entityType) + '</span>';
      html += '</div>';
    }
  }
  if (_actViewCursor) {
    html += '<div style="text-align:center;padding:var(--space-xl)"><button class="btn btn--sm" onclick="_loadActViewData(true).then(function(){renderContent()})">Load more</button></div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

/** Render the settings view with tabbed navigation */
function renderSettings(el) {
  if (!window._settingsTab) window._settingsTab = 'account';
  const isAdmin = _currentUser && _currentUser.role === 'admin';
  const tab = window._settingsTab;
  const tabBtn = (id, label) => `<button class="task-subview-btn ${tab===id?'active':''}" data-action="_actSetSettingsTab" data-arg0="${id}">${label}</button>`;

  let html = `<div class="settings">`;
  html += `<div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-lg)"><h1 style="margin:0">Settings</h1></div>`;
  html += `<div class="task-subview-toggle" style="margin-bottom:var(--space-lg)">`;
  html += tabBtn('account', 'Account');
  if (isAdmin || isClientAdmin()) html += tabBtn('team', 'Team');
  if (!isClientUser()) {
    html += tabBtn('config', 'Configuration');
    html += tabBtn('data', 'Data');
    html += tabBtn('bugs', 'Bug Reporting');
    if (isAdmin) html += tabBtn('changelog', 'Changelog');
    if (isAdmin) html += tabBtn('news', 'News');
  }
  html += `</div>`;

  // === ACCOUNT TAB ===
  if (tab === 'account') {
    html += `<div class="settings__group"><h2>Account</h2>
      <div style="margin-bottom:12px;color:var(--text-secondary)">Signed in as <strong>${_currentUser ? esc(_currentUser.displayName) : 'Unknown'}</strong> (${_currentUser ? esc(_currentUser.role) : ''})</div>
      <div class="detail-field"><span class="detail-field__label">Change Password</span></div>
      <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:12px">
        <input type="password" id="settingsCurPw" placeholder="Current password" style="padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem">
        <input type="password" id="settingsNewPw" placeholder="New password" style="padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem">
        <input type="password" id="settingsConfirmPw" placeholder="Confirm new password" style="padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem">
        <button class="btn btn--sm" data-action="changeOwnPassword">Update</button>
      </div>
      ${isAdmin ? `
      <div class="detail-field"><span class="detail-field__label">Admin: Reset User Password</span></div>
      <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:12px">
        <select id="resetPwUser" style="padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem"><option value="">Select user...</option></select>
        <input type="password" id="resetPwNew" placeholder="New password" style="padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem">
        <button class="btn btn--sm" data-action="adminResetPassword">Reset</button>
      </div>` : ''}
    </div>`;
  }

  // === TEAM TAB (admin or client admin) ===
  if (tab === 'team' && isAdmin) {
    html += `<div class="settings__group"><h2>User Management</h2>
      <div id="userManageList" style="margin-bottom:12px">Loading users...</div>
      <div style="border:1px solid var(--border-default);border-radius:var(--radius-md);padding:var(--space-md);background:var(--bg-surface)">
        <div style="font-size:0.82rem;font-weight:600;margin-bottom:8px">Add New User</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end">
          <input id="newUserUsername" placeholder="Username" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;width:120px">
          <input id="newUserName" placeholder="Display Name" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;width:140px">
          <input id="newUserEmail" placeholder="Email" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;width:160px">
          <input id="newUserPw" type="password" placeholder="Password" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;width:120px">
          <select id="newUserRole" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem"><option value="member">Member</option><option value="admin">Admin</option></select>
          <select id="newUserClientScope" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem"><option value="">No scope (internal)</option>${Object.values(_apiClientsCache).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select>
          <button class="btn btn--sm btn--primary" data-action="_actWithLoading" data-pass-el data-arg0="createUser">Create</button>
        </div>
      </div>
    </div>`;
    html += `<div class="settings__group"><h2>Page Permissions</h2>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">Control which pages are visible to non-admin users. Admins always have access.</div>
      <div id="pagePermsContainer">Loading permissions...</div>
    </div>`;
    html += `<div class="settings__group"><h2>Send System Message</h2>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">Broadcast a notification to all active users. Useful for announcements or planned downtime.</div>
      <input type="text" id="sysMessageTitle" placeholder="Message title" style="display:block;width:100%;box-sizing:border-box;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem;margin-bottom:8px">
      <textarea id="sysMessageBody" placeholder="Message body" rows="3" style="display:block;width:100%;box-sizing:border-box;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem;resize:vertical;margin-bottom:8px"></textarea>
      <button class="btn btn--primary btn--sm" data-action="sendSystemMessage">Send to All Users</button>
    </div>`;
  } else if (tab === 'team' && isClientAdmin()) {
    html += `<div class="settings__group"><h2>Team Management</h2>
      <div id="clientTeamList" style="margin-bottom:12px">Loading...</div>
      <div style="border:1px solid var(--border-default);border-radius:var(--radius-md);padding:var(--space-md);background:var(--bg-surface)">
        <div style="font-size:0.82rem;font-weight:600;margin-bottom:8px">Invite Team Member</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end">
          <input id="inviteDisplayName" placeholder="Display Name" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;width:140px">
          <input id="inviteEmail" placeholder="Email" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;width:180px">
          <select id="inviteRole" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button class="btn btn--sm btn--primary" data-action="inviteClientUser">Invite</button>
        </div>
      </div>
    </div>`;
  }

  // === CONFIGURATION TAB (NBI only) ===
  if (tab === 'config' && !isClientUser()) {
    if (isAdmin) {
      html += `<div class="settings__group"><h2>General</h2>
        <div class="detail-field"><span class="detail-field__label">Hourly Rate (&pound;)</span><input type="number" value="${settings.hourlyRate}" onchange="settings.hourlyRate=parseFloat(this.value)||150;save();renderContent()"></div>
      </div>`;
    }
    html += `<div class="settings__group"><h2>Known Clients</h2>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${settings.knownClients.map(c => `<span class="badge badge--status">${esc(c)} <span style="cursor:pointer;margin-left:4px" data-action="removeClient" data-arg0="${esc(c)}">&times;</span></span>`).join('')}</div>
      <div class="detail-field"><input id="newClientInput" placeholder="Add client..."><button class="btn btn--sm" data-action="addClient">Add</button></div>
    </div>`;
    if (isAdmin) html += `<div id="leadsSettingsContainer"></div>`;
    html += `<div class="settings__group"><h2>Task Templates</h2>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">Save task structures as reusable templates. Instantiate them to create new tasks from the template.</div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <select id="templateSourceTask" style="flex:1;padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.8rem">
          <option value="">Select a root task to save as template...</option>
          ${getRootTasks().map(t => `<option value="${t.id}">${esc(t.title)}</option>`).join('')}
        </select>
        <button class="btn btn--sm btn--primary" data-action="saveAsTemplate">Save as Template</button>
      </div>
      <div id="templatesList" style="margin-bottom:12px"><div style="color:var(--text-muted);font-size:0.78rem">Loading templates...</div></div>
    </div>`;
  }

  // === DATA TAB (NBI only) ===
  if (tab === 'data' && !isClientUser()) {
    html += `<div class="settings__group"><h2>Import &amp; Export</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--space-md);margin-bottom:var(--space-lg)">
        <button class="btn btn--primary" data-action="openImportModal" style="padding:var(--space-md);text-align:center">&#128196;<br>Import (drag &amp; drop)</button>
        <button class="btn" data-action="openContractImport" style="padding:var(--space-md);text-align:center">&#128196;<br>Import from Contract</button>
        <button class="btn" data-action="exportCSV" style="padding:var(--space-md);text-align:center">&#128196;<br>Export CSV</button>
        <button class="btn" data-action="downloadBackup" style="padding:var(--space-md);text-align:center;background:var(--success);color:#fff">&#128190;<br>Full Backup</button>
        <button class="btn" data-action="_actModalClick" data-arg0="restoreFileInput" style="padding:var(--space-md);text-align:center">&#128194;<br>Restore Backup</button>
      </div>
      <input type="file" id="restoreFileInput" accept=".json" style="display:none" onchange="restoreBackup(this.files[0])">
    </div>`;
    if (isAdmin) {
      html += `<div class="settings__group"><h2 style="color:var(--danger)">Danger Zone</h2>
        <button class="btn btn--danger" data-action="openCleanseModal">Data Cleanse Tool</button>
      </div>`;
    }
  }

  // === BUG REPORTING TAB (NBI only) ===
  if (tab === 'bugs' && !isClientUser()) {
    html += `<div id="bugReportsTabContent"><div style="padding:24px;text-align:center;color:var(--text-muted)">Loading reports...</div></div>`;
  }

  // === CHANGELOG TAB (admin only) ===
  if (tab === 'changelog' && isAdmin) {
    html += `<div class="settings__group"><h2>Changelog</h2>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">Recent changes and audit trail.</div>
      <div id="settingsChangelogContainer"><div style="color:var(--text-muted);font-size:0.78rem">Loading changelog...</div></div>
    </div>`;
  }

  // === NEWS ADMIN TAB (admin only) ===
  if (tab === 'news' && isAdmin) {
    html += `<div class="settings__group"><h2>Feed Health</h2>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">Source ingestion status over the last 7 days.</div>
      <div id="newsAdminFeedHealth"><div style="color:var(--text-muted);font-size:0.78rem">Loading feed health...</div></div>
    </div>`;
    html += `<div class="settings__group"><h2>Prompts</h2>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">LLM prompt versions used for digest generation.</div>
      <div id="newsAdminPrompts"><div style="color:var(--text-muted);font-size:0.78rem">Loading prompts...</div></div>
    </div>`;
    html += `<div class="settings__group"><h2>Sources</h2>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">Manage news sources. <button class="btn btn--sm" data-action="newsAdminAddSource">Add source</button></div>
      <div id="newsAdminSources"></div>
    </div>`;
    html += `<div class="settings__group"><h2>Stories</h2>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">Merge, split, or regenerate stories in the current digest.</div>
      <div id="newsAdminStories"><div style="color:var(--text-muted);font-size:0.78rem">Loading stories...</div></div>
    </div>`;
  }

  html += `</div>`;
  el.innerHTML = html;
  // Load async content for the active tab
  if (tab === 'config') loadTemplates();
  if (tab === 'team' && isAdmin) loadUserManagement();
  if (tab === 'team' && isClientAdmin()) loadClientTeamList();
  if (tab === 'news' && isAdmin) loadNewsAdmin();
  if (tab === 'bugs') {
    renderBugReportsTab().then(tabHtml => {
      const container = document.getElementById('bugReportsTabContent');
      if (container) container.innerHTML = tabHtml;
    });
  }
  // Load changelog into settings (admin only)
  if (_currentUser && _currentUser.role === 'admin') {
    const clContainer = document.getElementById('settingsChangelogContainer');
    if (clContainer) {
      authFetch('/api/changelog?limit=50').then(r => r.ok ? r.json() : []).then(entries => {
        if (!entries || entries.length === 0) { clContainer.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem">No changelog entries yet.</div>'; return; }
        let clHtml = '<div style="max-height:400px;overflow-y:auto">';
        entries.forEach(e => {
          const date = new Date(e.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
          clHtml += `<div style="padding:6px 0;border-bottom:1px solid var(--border-default);font-size:0.78rem">`;
          clHtml += `<span style="color:var(--text-muted)">${date}</span> `;
          clHtml += `<span style="color:var(--accent)">${esc(e.user_name || 'System')}</span> `;
          clHtml += `<span>${esc(e.action)}</span> `;
          clHtml += `<span style="color:var(--text-secondary)">${esc(e.entity_type || '')} ${esc(e.details ? JSON.stringify(e.details).substring(0, 80) : '')}</span>`;
          clHtml += `</div>`;
        });
        clHtml += '</div>';
        clContainer.innerHTML = clHtml;
      }).catch(() => { clContainer.innerHTML = '<div style="color:var(--text-muted)">Failed to load changelog.</div>'; });
    }
  }
  // Load users list for admin features
  if (_currentUser && _currentUser.role === 'admin') {
    authFetch('/api/users').then(r => r.json()).then(users => {
      // Password reset dropdown
      const sel = document.getElementById('resetPwUser');
      if (sel) users.forEach(u => { const o = document.createElement('option'); o.value = u.id; o.textContent = u.display_name; sel.appendChild(o); });
      // Page permissions UI
      const container = document.getElementById('pagePermsContainer');
      if (!container) return;
      const nonAdminUsers = users.filter(u => u.role !== 'admin');
      // RBAC for sensitive top-bar tabs. Leads + Expenses default to admin-only
      // (closes 25d920da — Magnus and other members were seeing these tabs in the
      // main nav even though they aren't supposed to). Admins can grant access via
      // 'All Users' or 'Specific Users' from this page.
      const pages = ['finances', 'leads', 'expenses'];
      let html = '';
      pages.forEach(page => {
        const perm = _pagePermissions[page];
        const mode = perm === 'all' ? 'all' : perm === 'admin' ? 'admin' : Array.isArray(perm) ? 'users' : 'admin';
        html += `<div style="margin-bottom:var(--space-lg);padding:var(--space-md) var(--space-lg);background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md)">`;
        html += `<div style="font-weight:600;font-size:0.88rem;text-transform:capitalize;margin-bottom:var(--space-sm)">${page}</div>`;
        html += `<div style="margin-bottom:var(--space-sm)"><select onchange="setPagePermMode('${page}',this.value)" style="padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.82rem;width:100%">`;
        html += `<option value="admin" ${mode==='admin'?'selected':''}>Admin Only</option>`;
        html += `<option value="all" ${mode==='all'?'selected':''}>All Users</option>`;
        html += `<option value="users" ${mode==='users'?'selected':''}>Specific Users</option>`;
        html += `</select></div>`;
        if (mode === 'users') {
          const allowed = Array.isArray(perm) ? perm : [];
          html += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:var(--space-sm)">`;
          nonAdminUsers.forEach(u => {
            const checked = allowed.includes(u.username);
            html += `<label style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:var(--radius-sm);font-size:0.78rem;cursor:pointer;background:${checked?'var(--accent-glow)':'var(--bg-card)'};border:1px solid ${checked?'var(--accent-border)':'var(--border-subtle)'}">`;
            html += `<input type="checkbox" ${checked?'checked':''} onchange="toggleUserPageAccess('${escAttrJs(page)}','${escAttrJs(u.username)}')" style="accent-color:var(--accent)"> ${u.display_name}</label>`;
          });
          html += `</div>`;
        } else if (mode === 'all') {
          html += `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">All authenticated users can access this page.</div>`;
        } else {
          html += `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">Only admin accounts can access this page.</div>`;
        }
        html += `</div>`;
      });
      container.innerHTML = html;
    }).catch(() => {});

    // Load leads settings
    const leadsContainer = document.getElementById('leadsSettingsContainer');
    if (leadsContainer) {
      renderLeadsSettings().then(html => { leadsContainer.innerHTML = html; });
    }
  }
}

/** Add a new client to the known clients list via prompt dialog */
function addClient() {
  const v = document.getElementById('newClientInput').value.trim();
  if (!v || settings.knownClients.includes(v)) return;
  settings.knownClients.push(v);
  // Create blank brief stub
  if (!clientBriefs[v]) {
    clientBriefs[v] = { name: v, description: 'Research pending...', founded: 'TBC', headquarters: 'TBC', employees: 'TBC', revenue: 'TBC', contacts: [], website: '', nbiRelationship: '' };
    _briefsDirty = true;
  }
  // Create a root project for this client
  const existing = tasks.find(t => !t.parentId && t.title === v);
  if (!existing) {
    const newTask = { id: uid(), title: v, parentId: null, client: v, status: 'Not started', priority: 'Medium', healthState: '', description: 'Client engagement. Tasks to be defined.', assignees: ['Glen'], hoursEstimated: 0, hoursSpent: 0, dueDate: '', notes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    tasks.push(newTask);
    markDirty(newTask.id);
  }
  save();
  renderSettings(document.getElementById('mainContent'));
  renderSidebar();
  toast(`Added client: ${v}`);
}
/** Remove a client from the known clients list */
function removeClient(c) { settings.knownClients = settings.knownClients.filter(x => x !== c); save(); renderSettings(document.getElementById('mainContent')); }

/** Send a system-wide broadcast notification to all active users (admin only) */
async function sendSystemMessage() {
  const title = (document.getElementById('sysMessageTitle') || {}).value?.trim() || '';
  const body = (document.getElementById('sysMessageBody') || {}).value?.trim() || '';
  if (!title || !body) { showToast('Title and message are both required', 'error'); return; }
  try {
    const res = await authFetch('/api/notifications/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message: body })
    });
    if (res.ok) {
      const data = await res.json();
      showToast(`System message sent to ${data.sent} user${data.sent === 1 ? '' : 's'}`);
      const titleEl = document.getElementById('sysMessageTitle');
      const bodyEl = document.getElementById('sysMessageBody');
      if (titleEl) titleEl.value = '';
      if (bodyEl) bodyEl.value = '';
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to send message', 'error');
    }
  } catch (e) {
    showToast('Failed to send message', 'error');
  }
}

// Check if current user has access to a permission-gated page
/** Check whether the current user has access to a given page based on RBAC settings */
function hasPageAccess(page) {
  if (!_currentUser) return false;
  if (_currentUser.role === 'admin') return true;
  const perm = (_pagePermissions || {})[page];
  if (perm === 'all') return true;
  if (Array.isArray(perm) && perm.includes(_currentUser.username)) return true;
  return false;
}

// Toggle a specific user's access to a page
/** Toggle a specific user's access to a page (add/remove from the allowed list) */
function toggleUserPageAccess(page, username) {
  let perm = _pagePermissions[page];
  if (!Array.isArray(perm)) perm = [];
  if (perm.includes(username)) {
    perm = perm.filter(u => u !== username);
  } else {
    perm.push(username);
  }
  _pagePermissions[page] = perm.length > 0 ? perm : 'admin';
  savePagePermissions();
  renderContent();
}

/** Set the permission mode for a page: 'admin', 'all', or 'specific' (user list) */
function setPagePermMode(page, mode) {
  if (mode === 'admin' || mode === 'all') {
    _pagePermissions[page] = mode;
  } else {
    // 'users' mode — keep existing user list or start empty
    const existing = _pagePermissions[page];
    _pagePermissions[page] = Array.isArray(existing) ? existing : [];
  }
  savePagePermissions();
  renderContent();
}

// Load page permissions on startup (from localStorage cache first, then sync from server)
try { _pagePermissions = JSON.parse(localStorage.getItem('nbi_page_permissions') || '{}'); } catch(e) { _pagePermissions = {}; }

/** Load page permissions from server settings (shared across all users) */
async function loadPagePermissions() {
  try {
    const settings = await apiCall('/api/settings');
    if (settings && settings.page_permissions) {
      const perms = typeof settings.page_permissions === 'string' ? JSON.parse(settings.page_permissions) : settings.page_permissions;
      _pagePermissions = perms;
      localStorage.setItem('nbi_page_permissions', JSON.stringify(perms));
    }
  } catch(e) { if (window._nbiDebug) console.warn('[Permissions] Failed to load from server, using local cache'); }
}

/** Save page permissions to server settings (admin only) */
async function savePagePermissions() {
  localStorage.setItem('nbi_page_permissions', JSON.stringify(_pagePermissions));
  try {
    await authFetch('/api/settings/page_permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: _pagePermissions })
    });
  } catch(e) { if (window._nbiDebug) console.warn('[Permissions] Failed to save to server:', e.message); }
}

/** Change the current user's own password via the API */
async function changeOwnPassword() {
  const cur = document.getElementById('settingsCurPw').value;
  const newPw = document.getElementById('settingsNewPw').value;
  const confirmPw = document.getElementById('settingsConfirmPw').value;
  if (!cur || !newPw) { toast('Both fields required', 'warning'); return; }
  if (newPw !== confirmPw) { toast('New passwords do not match', 'error'); document.getElementById('settingsConfirmPw').style.borderColor = 'var(--danger)'; return; }
  try {
    const resp = await authFetch('/api/auth/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: cur, newPassword: newPw }),
    });
    const data = await resp.json();
    if (resp.ok) { toast('Password updated'); document.getElementById('settingsCurPw').value = ''; document.getElementById('settingsNewPw').value = ''; document.getElementById('settingsConfirmPw').value = ''; }
    else toast(data.error || 'Failed', 'error');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Admin-only: reset another user's password to a specified value */
async function adminResetPassword() {
  const userId = document.getElementById('resetPwUser').value;
  const newPw = document.getElementById('resetPwNew').value;
  if (!userId || !newPw) { toast('Select user and enter new password', 'warning'); return; }
  try {
    const resp = await authFetch('/api/auth/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword: newPw }),
    });
    const data = await resp.json();
    if (resp.ok) { toast('Password reset'); document.getElementById('resetPwNew').value = ''; }
    else toast(data.error || 'Failed', 'error');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

// ----- CLIENT STATUS REPORTS -----

/** Generate a client status report via the server API — creates a snapshot
 *  and returns share/PDF links. Currently NOT wired to any UI button; the
 *  'Generate Client Report' button in renderClientHeader invokes
 *  generateClientReport (below), which is the local CSV/clipboard variant
 *  that historically shadowed this declaration via JS function hoisting.
 *  Renamed to generateClientReportPDF so both flows can coexist; wire this
 *  to a button when the server-audited flow is ready to be the default. */
async function generateClientReportPDF(clientName) {
  // Resolve client name to ID
  try {
    const clients = await apiCall('/api/clients');
    if (!clients) return;
    const client = clients.find(c => c.name === clientName);
    if (!client) { toast('Client not found', 'error'); return; }

    toast('Generating report...');
    const result = await apiCall(`/api/clients/${client.id}/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!result) return;

    // Show modal with links
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}${result.shareUrl}`;
    const pdfUrl = `${baseUrl}${result.pdfUrl}`;

    const overlay = document.createElement('div');
    overlay.className = 'detail-overlay open';
    overlay.onclick = () => overlay.remove();
    overlay.innerHTML = `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-raised);border:1px solid var(--border-default);border-radius:var(--radius-xl);padding:var(--space-xl);width:420px;max-width:90vw;z-index:300" data-stop>
      <h2 style="margin:0 0 8px;font-size:1.1rem">Report Generated</h2>
      <p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:20px">${esc(clientName)} — ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <a href="${esc(pdfUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn--primary" style="text-decoration:none;text-align:center">&#128196; Download PDF</a>
        <button class="btn" data-action="_actShareCopy" data-arg0="${esc(shareUrl)}">&#128279; Copy Share Link</button>
        <a href="${esc(shareUrl)}" target="_blank" rel="noopener noreferrer" class="btn" style="text-decoration:none;text-align:center">&#128065; Preview HTML Report</a>
      </div>
      <button class="btn btn--sm" data-action="_actCloseDetailOverlay" data-pass-el style="margin-top:16px;width:100%">Close</button>
    </div>`;
    document.body.appendChild(overlay);
  } catch(e) { toast('Error generating report: ' + e.message, 'error'); }
}

// ----- SHAREPOINT EMBED PREVIEW -----

function isSharePointUrl(url) {
  return /sharepoint\.com|office\.com/i.test(url || '');
}

function getSharePointEmbedUrl(url) {
  if (!url) return '';
  if (/action=embedview|embed\.aspx/i.test(url)) return url;
  if (/\/:([wxpb]):\//.test(url)) {
    return url.split('?')[0] + '?action=embedview';
  }
  return 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url);
}

function openSpPreview(embedUrl, title, originalUrl) {
  const html = `<div class="modal-overlay open" id="spPreviewModal" onclick="if(event.target===this)closeSpPreview()" style="z-index:500">
    <div class="sp-preview">
      <div class="sp-preview__header">
        <span class="sp-preview__title">${esc(title)}</span>
        <a href="${safeUrl(originalUrl)}" target="_blank" rel="noopener noreferrer" class="sp-preview__open">Open in SharePoint &#8599;</a>
        <button class="sp-preview__close" onclick="closeSpPreview()">&times;</button>
      </div>
      <iframe class="sp-preview__frame" src="${safeUrl(embedUrl)}" frameborder="0" allowfullscreen></iframe>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function closeSpPreview() {
  const modal = document.getElementById('spPreviewModal');
  if (modal) modal.remove();
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('spPreviewModal')) closeSpPreview();
});

// ----- TASK QUEUE VIEW -----
let _queueDetailTempTask = null;
let _queueDetailQueueId = null;

async function renderQueueView(el) {
  el.innerHTML = '<div style="padding:24px"><div class="skeleton skeleton-card"></div></div>';
  try {
    const data = await apiCall('/api/queue');
    _queueData = data || [];
  } catch(e) { _queueData = []; }
  renderSidebar();

  if (_queueData.length === 0) {
    el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-secondary)">
      <div style="font-size:2rem;margin-bottom:12px">&#128229;</div>
      <div style="font-size:0.9rem;font-weight:600;margin-bottom:8px">Queue is empty</div>
      <div style="font-size:0.8rem;color:var(--text-muted)">Items submitted by team members will appear here for triage.</div>
    </div>`;
    return;
  }

  let html = '<div style="padding:24px;max-width:700px">';
  html += '<h2 style="margin:0 0 16px;font-size:1.1rem;color:var(--text-primary)">Submission Queue</h2>';
  html += '<div style="display:flex;flex-direction:column;gap:12px">';
  _queueData.forEach(item => {
    const ago = _relativeTime(item.created_at);
    const channelLabel = item.slack_channel ? `<span style="background:var(--bg-elevated);padding:1px 6px;border-radius:4px;font-size:0.75rem">#${esc(item.slack_channel)}</span>` : '';
    html += `<div class="queue-item" data-action="openQueueDetail" data-arg0="${item.id}">
      <div class="queue-item__title">${esc(item.title)}</div>
      ${item.description ? `<div class="queue-item__desc">${esc(item.description)}</div>` : ''}
      <div class="queue-item__meta">
        <span>${esc(item.submitted_by)}</span>
        <span>${ago}</span>
        ${channelLabel}
      </div>
    </div>`;
  });
  html += '</div></div>';
  el.innerHTML = html;
}

function _relativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

async function _actDismissQueueItem(queueId, title) {
  if (!await themedConfirm('Dismiss "' + title + '" from the queue? This cannot be undone.', 'Dismiss')) return;
  const delResp = await authFetch('/api/queue/' + queueId, { method: 'DELETE' });
  if (!delResp.ok) { toast('Failed to dismiss', 'error'); return; }
  _queueData = (_queueData || []).filter(q => q.id !== queueId);
  renderSidebarCounts();
  renderContent();
  toast('Item dismissed');
}

// ----- QUEUE DETAIL PANEL -----

function closeQueueDetail() {
  _queueDetailTempTask = null;
  _queueDetailQueueId = null;
  const overlay = document.getElementById('queueDetailOverlay');
  const panel = document.getElementById('queueDetailPanel');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.style.display = 'none';
  if (window._queueDetailEscHandler) {
    document.removeEventListener('keydown', window._queueDetailEscHandler);
    window._queueDetailEscHandler = null;
  }
}

function openQueueDetail(queueId) {
  const item = (_queueData || []).find(q => String(q.id) === String(queueId));
  if (!item) return;

  _queueDetailQueueId = queueId;
  _queueDetailTempTask = null;

  const overlay = document.getElementById('queueDetailOverlay');
  const panel = document.getElementById('queueDetailPanel');
  if (!overlay || !panel) return;

  const clients = getContractedClients();
  const clientOpts = clients.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const types = ['project', 'feature', 'story', 'task'];

  let html = `<div class="queue-detail__header">
    <div style="flex:1;min-width:0">
      <input id="qdTitle" type="text" value="${esc(item.title)}" style="width:100%;font-size:1rem;font-weight:600;padding:4px 8px;border:1px solid transparent;border-radius:var(--radius-md);background:transparent;color:var(--text-primary);font-family:var(--font-body)" onfocus="this.style.borderColor='var(--accent-border)';this.style.background='var(--bg-input)'" onblur="this.style.borderColor='transparent';this.style.background='transparent'" aria-label="Title">
    </div>
    <button class="btn btn--ghost btn--sm" data-action="closeQueueDetail" aria-label="Close" style="flex-shrink:0">&times;</button>
  </div>`;

  html += `<div class="queue-detail__body">`;

  html += `<dl class="queue-detail__source">
    <div><dt>Submitted by</dt><dd>${esc(item.submitted_by || 'Unknown')}</dd></div>
    <div><dt>Received</dt><dd>${new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
    ${item.slack_channel ? `<div><dt>Channel</dt><dd>#${esc(item.slack_channel)}</dd></div>` : ''}
  </dl>`;

  html += `<div class="queue-detail__section">
    <div class="queue-detail__section-title">Description</div>
    <textarea id="qdDescription" placeholder="Add a description..." style="width:100%;min-height:60px;padding:var(--space-sm);border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:0.82rem;font-family:var(--font-body);resize:vertical" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(item.description || '')}</textarea>
  </div>`;

  html += `<div class="queue-detail__section">
    <div class="queue-detail__section-title field-required">Client</div>
    <select id="qdClient" onchange="_queueDetailOnPickersChanged()" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem">
      <option value="">-- Select Client --</option>
      ${clientOpts}
    </select>
  </div>`;

  html += `<div class="queue-detail__section">
    <div class="queue-detail__section-title field-required">Item Type</div>
    <div class="queue-detail__type-grid">
      ${types.map(t => `<button class="queue-detail__type-btn" data-type="${t}" onclick="_queueDetailSelectType(this,'${t}')">${ITEM_TYPE_META[t].icon} ${ITEM_TYPE_META[t].label}</button>`).join('')}
    </div>
  </div>`;

  html += `<div id="qdDetailForm"></div>`;
  html += `</div>`;

  html += `<div class="queue-detail__actions">
    <button id="qdPromoteBtn" class="btn btn--primary" disabled data-action="_actPromoteFromDetail">Promote</button>
    <button class="btn btn--danger" data-action="_actDismissFromDetail" data-arg0="${item.id}" data-arg1="${escAttrJs(item.title)}">Dismiss</button>
  </div>`;

  panel.innerHTML = html;
  panel.classList.add('open');
  overlay.style.display = 'block';

  setTimeout(() => {
    const ta = document.getElementById('qdDescription');
    if (ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
  }, 50);

  if (window._queueDetailEscHandler) document.removeEventListener('keydown', window._queueDetailEscHandler);
  window._queueDetailEscHandler = (e) => { if (e.key === 'Escape') closeQueueDetail(); };
  document.addEventListener('keydown', window._queueDetailEscHandler);
}

function _queueDetailSelectType(btn, type) {
  document.querySelectorAll('.queue-detail__type-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  _queueDetailOnPickersChanged();
}

function _queueDetailOnPickersChanged() {
  const clientEl = document.getElementById('qdClient');
  const selectedTypeBtn = document.querySelector('.queue-detail__type-btn.selected');
  const formEl = document.getElementById('qdDetailForm');
  const promoteBtn = document.getElementById('qdPromoteBtn');
  if (!clientEl || !formEl || !promoteBtn) return;

  const client = clientEl.value;
  const itemType = selectedTypeBtn ? selectedTypeBtn.dataset.type : '';

  if (!client || !itemType) {
    formEl.innerHTML = client || itemType
      ? `<div style="color:var(--text-muted);font-size:0.82rem;padding:var(--space-md);text-align:center">${!client ? 'Select a client' : 'Select an item type'} to see all fields.</div>`
      : '';
    promoteBtn.disabled = true;
    return;
  }

  const titleEl = document.getElementById('qdTitle');
  const descEl = document.getElementById('qdDescription');

  _queueDetailTempTask = createTaskObject({
    title: titleEl ? titleEl.value : '',
    description: descEl ? descEl.value : '',
    itemType: itemType,
    client: client,
  });

  promoteBtn.disabled = false;
  _queueDetailRenderForm(formEl);
}

function _queueDetailRenderForm(container) {
  const t = _queueDetailTempTask;
  if (!t) { container.innerHTML = ''; return; }

  let html = '<div class="queue-detail__section"><div class="queue-detail__section-title">Properties</div>';

  html += `<div class="detail-field"><label class="detail-field__label" for="qd-status">Status</label><select id="qd-status" onchange="_qdField('status',this.value)">${STATUSES.map(o => `<option value="${esc(o)}" ${o === t.status ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="qd-priority">Priority</label><select id="qd-priority" onchange="_qdField('priority',this.value)">${['', ...PRIORITIES].map(o => `<option value="${esc(o)}" ${o === (t.priority || '') ? 'selected' : ''}>${esc(o || '-- None --')}</option>`).join('')}</select></div>`;
  html += `<div class="detail-field"><label class="detail-field__label" for="qd-health">Health</label><select id="qd-health" onchange="_qdField('healthState',this.value)">${['', ...HEALTH_STATES].map(o => `<option value="${esc(o)}" ${o === (t.healthState || '') ? 'selected' : ''}>${esc(o || '-- None --')}</option>`).join('')}</select></div>`;
  html += `<div class="detail-field"><span class="detail-field__label">Assignee</span>${_qdAssigneeHtml(t.assignees)}</div>`;
  html += `<div class="detail-field"><label class="detail-field__label" for="qd-practice">Practice</label><select id="qd-practice" onchange="_qdField('practiceArea',this.value||null)"><option value="">-- Inherit / None --</option>${PRACTICES.map(p => `<option value="${esc(p.value)}" ${(t.practiceArea || '') === p.value ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></div>`;
  html += `<div class="detail-field"><label class="detail-field__label" for="qd-startDate">Start Date</label><input id="qd-startDate" type="date" value="${t.startDate || ''}" onchange="_qdField('startDate',this.value)"></div>`;
  html += `<div class="detail-field"><label class="detail-field__label" for="qd-endDate">End Date</label><input id="qd-endDate" type="date" value="${t.endDate || ''}" onchange="_qdField('endDate',this.value)"></div>`;
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="qd-dueDate">Due Date</label><input id="qd-dueDate" type="date" value="${t.dueDate || ''}" onchange="_qdField('dueDate',this.value)"></div>`;
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="qd-hours">Hours Est.</label><input id="qd-hours" type="number" step="0.5" min="0" value="${t.hoursEstimated || 0}" onchange="_qdField('hoursEstimated',parseFloat(this.value)||0)"></div>`;
  html += '</div>';

  html += `<div class="queue-detail__section"><div class="queue-detail__section-title field-required">Description of Work</div>`;
  html += `<textarea id="qd-desc" placeholder="A clear, concise description of the work needed." onchange="_qdField('description',this.value)" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" style="width:100%;min-height:60px;padding:var(--space-sm);border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:0.82rem;font-family:var(--font-body);resize:vertical">${esc(t.description || '')}</textarea></div>`;

  html += `<div class="queue-detail__section"><div class="queue-detail__section-title">Success Factor</div>`;
  html += `<textarea id="qd-success" placeholder="What will we have accomplished?" onchange="_qdField('successFactor',this.value)" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" style="width:100%;min-height:40px;padding:var(--space-sm);border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:0.82rem;font-family:var(--font-body);resize:vertical">${esc(t.successFactor || '')}</textarea></div>`;

  container.innerHTML = html;
  setTimeout(() => { container.querySelectorAll('textarea').forEach(ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }); }, 50);
}

function _qdField(field, value) {
  if (_queueDetailTempTask) _queueDetailTempTask[field] = value;
}

function _qdAssigneeHtml(currentAssignees) {
  const selected = currentAssignees || [];
  let html = '<div class="assignee-selector">';
  selected.forEach(name => {
    html += `<span class="filter-chip" style="font-size:0.75rem;margin:2px">${esc(name)} <button data-action="_qdRemoveAssignee" data-arg0="${esc(name)}">&times;</button></span>`;
  });
  html += `<select onchange="_qdAddAssignee(this.value);this.value=''" style="padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.78rem;min-width:120px">`;
  html += `<option value="">+ Add assignee</option>`;
  (_cachedTeamMembers || []).forEach(name => {
    if (!selected.includes(name)) html += `<option value="${esc(name)}">${esc(name)}</option>`;
  });
  html += `</select></div>`;
  return html;
}

function _qdAddAssignee(name) {
  if (!name || !_queueDetailTempTask) return;
  const a = [...(_queueDetailTempTask.assignees || [])];
  if (!a.includes(name)) a.push(name);
  _queueDetailTempTask.assignees = a;
  const formEl = document.getElementById('qdDetailForm');
  if (formEl) _queueDetailRenderForm(formEl);
}

function _qdRemoveAssignee(name) {
  if (!_queueDetailTempTask) return;
  _queueDetailTempTask.assignees = (_queueDetailTempTask.assignees || []).filter(a => a !== name);
  const formEl = document.getElementById('qdDetailForm');
  if (formEl) _queueDetailRenderForm(formEl);
}

async function _actPromoteFromDetail() {
  if (!_queueDetailTempTask || !_queueDetailQueueId) return;

  const titleEl = document.getElementById('qdTitle');
  const descEl = document.getElementById('qdDescription');
  if (titleEl) _queueDetailTempTask.title = titleEl.value;
  const detailDescEl = document.getElementById('qd-desc');
  if (detailDescEl && detailDescEl.value) {
    _queueDetailTempTask.description = detailDescEl.value;
  } else if (descEl) {
    _queueDetailTempTask.description = descEl.value;
  }

  const t = _queueDetailTempTask;
  tasks.push(t);
  markDirty(t.id);
  save();

  const queueId = _queueDetailQueueId;
  const delResp = await authFetch('/api/queue/' + queueId, { method: 'DELETE' });
  if (delResp.ok) _queueData = (_queueData || []).filter(q => q.id !== parseInt(queueId) && String(q.id) !== String(queueId));

  closeQueueDetail();
  renderSidebarCounts();
  renderContent();
  openDetail(t.id);
  toast('Item promoted to ' + getItemTypeLabel(t));
}

async function _actDismissFromDetail(queueId, title) {
  if (!await themedConfirm('Dismiss "' + title + '" from the queue? This cannot be undone.', 'Dismiss')) return;
  const delResp = await authFetch('/api/queue/' + queueId, { method: 'DELETE' });
  if (!delResp.ok) { toast('Failed to dismiss', 'error'); return; }
  _queueData = (_queueData || []).filter(q => q.id !== parseInt(queueId) && String(q.id) !== String(queueId));
  closeQueueDetail();
  renderSidebarCounts();
  renderContent();
  toast('Item dismissed');
}

// ----- UNIVERSAL FILE ATTACHMENTS -----
// Generic attachment system for clients, projects, and tasks (up to 200MB per file)

/** Render a file list + upload box for any entity. Call after DOM is ready. */
async function loadEntityFiles(entityType, entityId, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    const files = await apiCall(`/api/attachments/entity/${entityType}/${entityId}`);
    if (!files) { el.innerHTML = '<span style="color:var(--text-muted);font-size:0.75rem">Failed to load files</span>'; return; }
    if (files.length === 0) {
      el.innerHTML = '<span style="color:var(--text-muted);font-size:0.75rem">No files attached</span>';
    } else {
      el.innerHTML = files.map(f => {
        const needsVerify = f.uploaded_by && f.uploaded_by.includes('verify match');
        const verifyBadge = needsVerify
          ? `<button class="attachment-verify-badge" data-action="showAttachmentVerifyDialog" data-arg0="${f.id}" data-arg1="${entityType}" data-arg2="${entityId}" data-arg3="${containerId}" title="Auto-matched from email — click to confirm or reassign">&#9888; Verify</button>`
          : (f.uploaded_by && f.uploaded_by.startsWith('nbihub') ? `<span style="font-size:0.75rem;color:var(--text-muted);padding:1px 4px;border:1px solid var(--border-subtle);border-radius:3px">&#128231; email</span>` : '');

        // Link attachments: distinct icon, open in new tab, no size
        if (f.link_url) {
          const display = f.link_title || f.link_url;
          const isSP = isSharePointUrl(f.link_url);
          const spBtn = isSP ? `<button class="btn btn--ghost btn--sm" onclick="openSpPreview('${escAttrJs(getSharePointEmbedUrl(f.link_url))}','${escAttrJs(display)}','${escAttrJs(f.link_url)}')" title="Preview document" style="font-size:0.75rem;padding:1px 5px">&#128065; Preview</button>` : '';
          return `<div class="attachment-row">
            <span class="attachment-row__icon" title="${isSP ? 'SharePoint' : 'Link'}">${isSP ? '&#128196;' : '&#128279;'}</span>
            <a href="${safeUrl(f.link_url)}" target="_blank" rel="noopener noreferrer" class="attachment-row__name" title="${esc(f.link_url)}">${esc(display)}</a>
            ${spBtn}
            ${verifyBadge}
            <span class="attachment-row__size" style="font-size:0.75rem;color:var(--text-muted)">${isSP ? 'SharePoint' : 'link'}</span>
            <button class="attachment-row__delete" data-action="deleteEntityFile" data-arg0="${f.id}" data-arg1="${entityType}" data-arg2="${entityId}" data-arg3="${containerId}" title="Delete">&times;</button>
          </div>`;
        }
        const sizeMB = (f.size_bytes / (1024 * 1024)).toFixed(1);
        const icon = f.mime_type?.startsWith('image/') ? '&#128444;' : f.mime_type?.includes('pdf') ? '&#128196;' : '&#128206;';
        return `<div class="attachment-row">
          <span class="attachment-row__icon">${icon}</span>
          <a href="#" data-action="downloadAttachment" data-prevent data-arg0="${encodeURIComponent(f.filename)}" data-arg1="${esc(f.original_name)}" class="attachment-row__name" title="${esc(f.original_name)}">${esc(f.original_name)}</a>
          ${verifyBadge}
          <span class="attachment-row__size">${sizeMB}MB</span>
          <button class="attachment-row__delete" data-action="deleteEntityFile" data-arg0="${f.id}" data-arg1="${entityType}" data-arg2="${entityId}" data-arg3="${containerId}" title="Delete">&times;</button>
        </div>`;
      }).join('');
    }
  } catch(e) { el.innerHTML = '<span style="color:var(--text-muted);font-size:0.75rem">Error loading files</span>'; }
}

/** Show verify/reassign dialog for auto-matched email attachments */
async function showAttachmentVerifyDialog(attachmentId, entityType, entityId, containerId) {
  // Fetch clients + projects for the reassign picker
  const clients = await apiCall('/api/clients') || [];
  const clientOpts = clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');

  const html = `<div class="modal-overlay open" id="verifyAttachmentModal" data-action="_actRemoveIfSelf" data-pass-event data-pass-el style="z-index:500">
    <div style="background:var(--bg-raised);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:24px;max-width:420px;margin:auto;margin-top:15vh">
      <h3 style="margin:0 0 12px;font-size:0.95rem;color:var(--text-primary)">Verify Email Attachment Match</h3>
      <p style="font-size:0.8rem;color:var(--text-secondary);margin:0 0 16px">This attachment was auto-matched from an inbound email. Is it attached to the right place?</p>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn btn--primary" data-action="confirmAttachmentMatch" data-arg0="${attachmentId}" data-arg1="${entityType}" data-arg2="${entityId}" data-arg3="${containerId}">Yes, correct</button>
        <button class="btn btn--danger" data-action="_actShowReassignPicker">No, reassign</button>
      </div>
      <div id="reassignPicker" style="display:none;flex-direction:column;gap:8px;border-top:1px solid var(--border-default);padding-top:12px">
        <label style="font-size:0.75rem;color:var(--text-muted)">Move to a different client/project:</label>
        <select id="reassignClient" onchange="loadReassignTasks(this.value)" style="font-size:0.8rem;padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">
          <option value="">Select client...</option>
          ${clientOpts}
        </select>
        <select id="reassignTask" style="font-size:0.8rem;padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">
          <option value="">Select project/task...</option>
        </select>
        <button class="btn btn--primary btn--sm" data-action="reassignAttachment" data-arg0="${attachmentId}" data-arg1="${entityType}" data-arg2="${entityId}" data-arg3="${containerId}" style="align-self:flex-end">Move attachment</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

/** Load tasks for the reassign picker when client is selected */
async function loadReassignTasks(clientId) {
  const sel = document.getElementById('reassignTask');
  if (!clientId) { sel.innerHTML = '<option value="">Select project/task...</option>'; return; }
  const tasks = await apiCall(`/api/tasks?client_id=${clientId}`) || [];
  const active = tasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled');
  sel.innerHTML = '<option value="">Attach to client (no specific task)</option>' +
    active.map(t => `<option value="${t.id}">${esc(t.title)} (${t.item_type})</option>`).join('');
}

/** Confirm an auto-matched attachment is correct — removes verify flag */
async function confirmAttachmentMatch(attachmentId, entityType, entityId, containerId) {
  await authFetch(`/api/attachments/${attachmentId}/confirm`, { method: 'PATCH' });
  document.getElementById('verifyAttachmentModal')?.remove();
  loadEntityFiles(entityType, entityId, containerId);
  showToast('Attachment confirmed');
}

/** Reassign an attachment to a different entity */
async function reassignAttachment(attachmentId, oldEntityType, oldEntityId, containerId) {
  const clientId = document.getElementById('reassignClient').value;
  const taskId = document.getElementById('reassignTask').value;
  if (!clientId) { showToast('Please select a client', 'error'); return; }
  const newEntityType = taskId ? 'task' : 'client';
  const newEntityId = taskId || clientId;
  await authFetch(`/api/attachments/${attachmentId}/reassign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityType: newEntityType, entityId: newEntityId })
  });
  document.getElementById('verifyAttachmentModal')?.remove();
  loadEntityFiles(oldEntityType, oldEntityId, containerId);
  showToast('Attachment moved');
}

/** Toggle an inline "Add Link" form inside an attachments section. */
function toggleAddLinkForm(entityType, entityId) {
  const formId = `addLinkForm_${entityType}_${entityId}`;
  const form = document.getElementById(formId);
  if (!form) return;
  form.style.display = form.style.display === 'none' ? 'flex' : 'none';
  if (form.style.display !== 'none') {
    const urlInput = form.querySelector('input[type="url"]');
    if (urlInput) urlInput.focus();
  }
}

/** Submit the inline Add Link form for an entity, posting to the link attachment endpoint. */
async function submitAttachmentLink(entityType, entityId, containerId) {
  const formId = `addLinkForm_${entityType}_${entityId}`;
  const form = document.getElementById(formId);
  if (!form) return;
  const url = form.querySelector('input[type="url"]').value.trim();
  const title = form.querySelector('input[type="text"]').value.trim();
  if (!url) { toast('Enter a URL', 'error'); return; }
  // Use the universal endpoint so the same code path serves any entity type
  const resp = await authFetch(`/api/attachments/entity/${entityType}/${entityId}/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title: title || null })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    toast('Failed to add link: ' + (err.error?.message || err.error || 'Unknown error'), 'error');
    return;
  }
  // Reset and hide form, refresh list
  form.querySelector('input[type="url"]').value = '';
  form.querySelector('input[type="text"]').value = '';
  form.style.display = 'none';
  loadEntityFiles(entityType, entityId, containerId);
  toast('Link added');
}

/** Upload a file via XHR (supports progress tracking for large files) */
function uploadEntityFile(entityType, entityId, inputId, containerId) {
  const input = document.getElementById(inputId);
  if (!input?.files?.[0]) { toast('Select a file first'); return; }
  const file = input.files[0];
  if (file.size > 200 * 1024 * 1024) { toast('File too large (max 200MB)', 'error'); return; }

  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `/api/attachments/entity/${entityType}/${entityId}`);
  xhr.withCredentials = true;
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const pct = Math.round(e.loaded / e.total * 100);
      toast(`Uploading: ${pct}%`, 'info');
    }
  };
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      toast('File uploaded');
      input.value = '';
      loadEntityFiles(entityType, entityId, containerId);
    } else {
      toast('Upload failed', 'error');
    }
  };
  xhr.onerror = () => toast('Upload failed', 'error');
  xhr.send(formData);
}

/** Delete an attachment and refresh the file list */
/** Download an attachment file using authenticated fetch, then trigger browser download */
async function downloadAttachment(encodedFilename, displayName) {
  try {
    const resp = await authFetch(`/api/attachments/download/${encodedFilename}`);
    if (!resp.ok) { showToast('Download failed', 'error'); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = displayName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) { showToast('Download failed: ' + e.message, 'error'); }
}

async function deleteEntityFile(attachId, entityType, entityId, containerId) {
  if (!(await themedConfirm('Delete this file?'))) return;
  await authFetch(`/api/attachments/${attachId}`, { method: 'DELETE' });
  loadEntityFiles(entityType, entityId, containerId);
}

/** Render the attachments section HTML for use in detail panels */
function renderAttachmentsSection(entityType, entityId) {
  const containerId = `${entityType}Files_${entityId}`;
  const inputId = `${entityType}FileInput_${entityId}`;
  const addLinkFormId = `addLinkForm_${entityType}_${entityId}`;
  let html = `<div class="detail-section">`;
  html += `<div class="detail-section__title">Files & Attachments</div>`;
  html += `<div id="${containerId}" style="margin-bottom:8px"><span style="color:var(--text-muted);font-size:0.75rem">Loading...</span></div>`;
  html += `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">`;
  html += `<input type="file" id="${inputId}" style="font-size:0.75rem;max-width:180px;color:var(--text-secondary)">`;
  html += `<button class="btn btn--sm btn--primary" data-action="uploadEntityFile" data-arg0="${entityType}" data-arg1="${entityId}" data-arg2="${inputId}" data-arg3="${containerId}">Upload</button>`;
  html += `<button class="btn btn--sm" data-action="toggleAddLinkForm" data-arg0="${entityType}" data-arg1="${entityId}" title="Attach a Sharepoint or other link">&#128279; Add Link</button>`;
  html += `</div>`;
  // Inline Add Link form, hidden until the user clicks the button
  html += `<div id="${addLinkFormId}" style="display:none;flex-direction:column;gap:4px;margin-top:6px;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm)">`;
  html += `<input type="url" placeholder="https://nbigaming.sharepoint.com/..." style="font-size:0.78rem;padding:4px 6px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">`;
  html += `<input type="text" placeholder="Display title (optional)" style="font-size:0.78rem;padding:4px 6px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">`;
  html += `<div style="display:flex;gap:6px;justify-content:flex-end">`;
  html += `<button class="btn btn--sm" data-action="toggleAddLinkForm" data-arg0="${entityType}" data-arg1="${entityId}">Cancel</button>`;
  html += `<button class="btn btn--sm btn--primary" data-action="submitAttachmentLink" data-arg0="${entityType}" data-arg1="${entityId}" data-arg2="${containerId}">Save Link</button>`;
  html += `</div></div>`;
  html += `</div>`;
  // Schedule file load after DOM is updated
  setTimeout(() => loadEntityFiles(entityType, entityId, containerId), 50);
  return html;
}
