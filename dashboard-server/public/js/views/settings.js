import { registerView } from '../core/router.js';

let _pagePermissions = window._pagePermissions || {};

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
        <td style="white-space:nowrap;font-size:0.78rem"><div>${dateStr}</div><div style="color:var(--text-muted);font-size:0.7rem">${timeStr}</div></td>
        <td><strong style="font-size:0.82rem">${esc(e.changed_by || 'system')}</strong></td>
        <td><span style="font-size:0.72rem;padding:2px 8px;border-radius:3px;background:${actionBg};color:${actionCol};border:1px solid ${actionBorder};text-transform:uppercase;font-weight:600">${esc(e.action)}</span></td>
        <td><div style="font-size:0.82rem;font-weight:500">${esc(e.entity_title || e.entity_id || '-')}</div><div style="font-size:0.68rem;color:var(--text-muted)">${esc(e.entity_type)}</div></td>
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



// ==================== SETTINGS VIEW ====================

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
    if (isAdmin) {
      html += `<div class="settings__group"><h2>General</h2>
        <div class="detail-field"><span class="detail-field__label">Hourly Rate (&pound;)</span><input type="number" value="${settings.hourlyRate}" onchange="settings.hourlyRate=parseFloat(this.value)||150;save();renderContent()"></div>
      </div>`;
    }
    html += `<div class="settings__group"><h2>Account</h2>
      <div style="margin-bottom:12px;color:var(--text-secondary)">Signed in as <strong>${_currentUser ? esc(_currentUser.displayName) : 'Unknown'}</strong> (${_currentUser ? esc(_currentUser.role) : ''})</div>
      <div class="detail-field"><span class="detail-field__label">Change Password</span></div>
      <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:12px">
        <input type="password" id="settingsCurPw" placeholder="Current password" style="padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem">
        <input type="password" id="settingsNewPw" placeholder="New password" style="padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem">
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
        <button class="btn btn--primary" data-action="openDownloadsImport" style="padding:var(--space-md);text-align:center">&#128194;<br>Import from Downloads</button>
        <button class="btn" data-action="openImportModal" style="padding:var(--space-md);text-align:center">&#128196;<br>Import CSV</button>
        <button class="btn" data-action="openContractImport" style="padding:var(--space-md);text-align:center">&#128196;<br>Import from Contract</button>
        <button class="btn" data-action="exportCSV" style="padding:var(--space-md);text-align:center">&#128196;<br>Export CSV</button>
        <button class="btn" data-action="downloadBackup" style="padding:var(--space-md);text-align:center;background:var(--success);color:#fff">&#128190;<br>Full Backup</button>
        <button class="btn" data-action="_actModalClick" data-arg0="restoreFileInput" style="padding:var(--space-md);text-align:center">&#128194;<br>Restore Backup</button>
      </div>
      <input type="file" id="restoreFileInput" accept=".json" style="display:none" onchange="restoreBackup(this.files[0])">
    </div>`;
    if (isAdmin) {
      html += `<div class="settings__group"><h2 style="color:var(--danger)">Danger Zone</h2>
        <button class="btn btn--danger" data-action="clearAllTasks">Clear All Tasks</button>
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
          html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">All authenticated users can access this page.</div>`;
        } else {
          html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">Only admin accounts can access this page.</div>`;
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
  if (!cur || !newPw) { toast('Both fields required', 'warning'); return; }
  try {
    const resp = await authFetch('/api/auth/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: cur, newPassword: newPw }),
    });
    const data = await resp.json();
    if (resp.ok) { toast('Password updated'); document.getElementById('settingsCurPw').value = ''; document.getElementById('settingsNewPw').value = ''; }
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
          : (f.uploaded_by && f.uploaded_by.startsWith('nbihub') ? `<span style="font-size:0.58rem;color:var(--text-muted);padding:1px 4px;border:1px solid var(--border-subtle);border-radius:3px">&#128231; email</span>` : '');

        // Link attachments: distinct icon, open in new tab, no size
        if (f.link_url) {
          const display = f.link_title || f.link_url;
          return `<div class="attachment-row">
            <span class="attachment-row__icon" title="Link">&#128279;</span>
            <a href="${safeUrl(f.link_url)}" target="_blank" rel="noopener noreferrer" class="attachment-row__name" title="${esc(f.link_url)}">${esc(display)}</a>
            ${verifyBadge}
            <span class="attachment-row__size" style="font-size:0.62rem;color:var(--text-muted)">link</span>
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
  html += `<input type="file" id="${inputId}" style="font-size:0.72rem;max-width:180px;color:var(--text-secondary)">`;
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

// ==================== CONTRACT IMPORT WIZARD ====================
let _extractedTasks = [];       // Staging area for contract-extracted tasks
let _contractStoredFile = null;  // Filename of uploaded contract for attachment

/** Open the contract import wizard modal */
function openContractImport() {
  const overlay = document.createElement('div');
  overlay.id = 'contractWizard';
  overlay.className = 'detail-overlay open';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const clientOpts = getContractedClients().map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const rootOpts = getRootTasks().map(r => `<option value="${r.id}">${esc(r.title)}</option>`).join('');

  overlay.innerHTML = `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-raised);border:1px solid var(--border-default);border-radius:var(--radius-xl);padding:var(--space-xl);width:600px;max-width:95vw;max-height:85vh;overflow-y:auto;z-index:300" data-stop>
    <h2 style="margin:0 0 16px;font-size:1.1rem">Import Tasks from Contract</h2>
    <div id="contractStep1">
      <div style="margin-bottom:12px"><label style="display:block;font-size:0.82rem;color:var(--text-secondary);margin-bottom:4px">Contract File (PDF or text)</label>
      <input type="file" id="contractFileInput" accept=".pdf,.txt,.docx" style="font-size:0.82rem;color:var(--text-secondary)"></div>
      <div style="margin-bottom:12px"><label style="display:block;font-size:0.82rem;color:var(--text-secondary);margin-bottom:4px">Client</label>
      <select id="contractClientSelect" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.82rem"><option value="">-- Select Client --</option>${clientOpts}</select></div>
      <div style="margin-bottom:16px"><label style="display:block;font-size:0.82rem;color:var(--text-secondary);margin-bottom:4px">Parent Project</label>
      <select id="contractParentSelect" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.82rem"><option value="">-- New Root Project --</option>${rootOpts}</select></div>
      <button class="btn btn--primary" data-action="extractContractTasks">Extract Tasks</button>
    </div>
    <div id="contractStep2" style="display:none"></div>
  </div>`;
  document.body.appendChild(overlay);
}

/** Call the contract extraction endpoint and show preview */
/** Upload a contract file and extract tasks via the AI extraction API */
async function extractContractTasks() {
  const input = document.getElementById('contractFileInput');
  if (!input?.files?.[0]) { toast('Select a file first'); return; }

  const formData = new FormData();
  formData.append('file', input.files[0]);

  toast('Extracting tasks...');
  try {
    const resp = await authFetch('/api/contract/extract', { method: 'POST', body: formData });
    if (!resp.ok) { toast('Extraction failed', 'error'); return; }
    const data = await resp.json();
    _extractedTasks = data.extracted.map((t, i) => ({ ...t, selected: true, idx: i }));
    _contractStoredFile = data.storedFilename;

    // Show step 2: preview table
    const step2 = document.getElementById('contractStep2');
    const step1 = document.getElementById('contractStep1');
    if (step1) step1.style.display = 'none';

    let html = `<div style="margin-bottom:12px;font-size:0.85rem;color:var(--text-secondary)">${data.extracted.length} tasks extracted from <strong>${esc(data.filename)}</strong> (${data.totalLines} lines scanned)</div>`;

    if (_extractedTasks.length === 0) {
      html += '<div style="padding:20px;text-align:center;color:var(--text-muted)">No tasks found. Try a different file format.</div>';
    } else {
      html += '<div style="display:flex;gap:8px;margin-bottom:8px"><button class="btn btn--sm" data-action="toggleAllContractTasks" data-arg0="true">Select All</button><button class="btn btn--sm" data-action="toggleAllContractTasks" data-arg0="false">Deselect All</button></div>';
      html += '<div style="max-height:350px;overflow-y:auto"><table class="leads-table" style="font-size:0.78rem"><thead><tr><th style="width:30px"></th><th>Title</th><th style="width:90px">Type</th><th style="width:90px">Due Date</th></tr></thead><tbody>';
      _extractedTasks.forEach((t, i) => {
        html += `<tr><td><input type="checkbox" checked onchange="_extractedTasks[${i}].selected=this.checked"></td>`;
        html += `<td><input style="width:100%;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);padding:3px 6px;color:var(--text-primary);font-size:0.78rem" value="${esc(t.title)}" onchange="_extractedTasks[${i}].title=this.value"></td>`;
        html += `<td><select style="font-size:0.72rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);padding:2px" onchange="_extractedTasks[${i}].type=this.value"><option value="task" ${t.type==='task'?'selected':''}>Task</option><option value="milestone" ${t.type==='milestone'?'selected':''}>Milestone</option><option value="deliverable" ${t.type==='deliverable'?'selected':''}>Deliverable</option></select></td>`;
        html += `<td><input type="date" value="${t.dueDate||''}" style="font-size:0.72rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);padding:2px" onchange="_extractedTasks[${i}].dueDate=this.value"></td></tr>`;
      });
      html += '</tbody></table></div>';
    }

    html += `<div style="display:flex;gap:8px;margin-top:16px">`;
    html += `<button class="btn btn--primary" data-action="createContractTasks">Create ${_extractedTasks.filter(t=>t.selected).length} Tasks</button>`;
    html += `<button class="btn" data-action="_actModalRemove" data-arg0="contractWizard">Cancel</button>`;
    html += `</div>`;

    if (step2) { step2.innerHTML = html; step2.style.display = 'block'; }
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Select or deselect all extracted contract tasks */
function toggleAllContractTasks(val) {
  _extractedTasks.forEach(t => t.selected = val);
  document.querySelectorAll('#contractStep2 input[type="checkbox"]').forEach(cb => cb.checked = val);
}

/** Create the selected tasks from the contract extraction */
/** Create tasks from selected contract extractions and attach the source document */
async function createContractTasks() {
  const selected = _extractedTasks.filter(t => t.selected);
  if (selected.length === 0) { toast('No tasks selected'); return; }

  const client = document.getElementById('contractClientSelect')?.value || '';
  const parentId = document.getElementById('contractParentSelect')?.value || null;

  toast(`Creating ${selected.length} tasks...`);

  // Create each task individually (uses the existing sync mechanism)
  for (const t of selected) {
    const id = crypto.randomUUID();
    tasks.push({
      id, title: t.title, parentId: parentId || null, client: client,
      status: 'Not started', priority: t.type === 'milestone' ? 'High' : '',
      healthState: '', description: `Imported from contract (${t.type})`,
      assignees: [], hoursEstimated: 0, hoursSpent: 0,
      dueDate: t.dueDate || '', startDate: '', endDate: '',
      dependencies: [], notes: [], createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), _serverUpdatedAt: null,
    });
    markDirty(id);
  }
  save();

  // Optionally attach the contract file to the parent project
  if (_contractStoredFile && parentId) {
    try {
      // Create attachment record directly by calling the API
      await authFetch(`/api/attachments/entity/project/${parentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: _contractStoredFile, original_name: 'Contract.pdf' })
      });
    } catch(e) { /* Best effort — file is already on disk */ }
  }

  _extractedTasks = [];
  _contractStoredFile = null;
  document.getElementById('contractWizard')?.remove();
  toast(`${selected.length} tasks created`);
  renderAll();
}

// ==================== DOWNLOADS / EXCEL IMPORT ====================
let _downloadsImportData = null;

/** Open the Downloads scanner import wizard */
async function openDownloadsImport() {
  const overlay = document.createElement('div');
  overlay.id = 'downloadsWizard';
  overlay.className = 'detail-overlay open';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-raised);border:1px solid var(--border-default);border-radius:var(--radius-xl);padding:var(--space-xl);width:750px;max-width:95vw;max-height:85vh;overflow-y:auto;z-index:300" data-stop>
    <h2 style="margin:0 0 16px;font-size:1.1rem">Import from Downloads</h2>
    <div id="dlStep1"><div style="text-align:center;padding:24px;color:var(--text-muted)">Scanning Downloads folder...</div></div>
    <div id="dlStep2" style="display:none"></div>
    <div id="dlStep3" style="display:none"></div>
  </div>`;
  document.body.appendChild(overlay);

  // Fetch file list
  try {
    const data = await apiCall('/api/import/scan-downloads');
    if (!data) { overlay.remove(); return; }
    renderDownloadsFileList(data);
  } catch(e) { toast('Scan failed: ' + e.message, 'error'); overlay.remove(); }
}

/** Render the list of downloadable server files with sheet selectors for Excel files */
function renderDownloadsFileList(data) {
  const step1 = document.getElementById('dlStep1');
  if (!step1) return;

  const importableFormats = ['nbi-csv', 'nbi-export', 'planner', 'ms-project', 'ch-artifacts', 'generic'];
  const importable = data.files.filter(f => importableFormats.includes(f.format));
  const unknown = data.files.filter(f => !importableFormats.includes(f.format));

  const formatBadge = (f) => {
    const colours = { 'nbi-csv': 'var(--success)', 'nbi-export': 'var(--success)', planner: '#6366f1', 'ms-project': '#0ea5e9', 'ch-artifacts': '#f59e0b', generic: 'var(--text-muted)' };
    return `<span style="display:inline-block;padding:1px 6px;border-radius:8px;font-size:0.68rem;background:${colours[f.format] || 'var(--text-muted)'};color:#fff;white-space:nowrap">${esc(f.formatLabel)}</span>`;
  };

  const fmtSize = (b) => b > 1048576 ? (b/1048576).toFixed(1) + ' MB' : b > 1024 ? (b/1024).toFixed(0) + ' KB' : b + ' B';
  const fmtDate = (d) => { const dt = new Date(d); return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };

  let html = `<div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px">${data.files.length} Excel/CSV files found in Downloads. ${importable.length} have recognised task formats.</div>`;

  if (importable.length > 0) {
    // Group by folder
    const folders = {};
    importable.forEach(f => { const folder = f.folder || ''; if (!folders[folder]) folders[folder] = []; folders[folder].push(f); });
    const folderNames = Object.keys(folders).sort((a, b) => a === '' ? -1 : b === '' ? 1 : a.localeCompare(b));

    html += '<div style="max-height:400px;overflow-y:auto"><table class="leads-table" style="font-size:0.78rem"><thead><tr><th>File</th><th style="width:160px">Format</th><th style="width:50px">Rows</th><th style="width:60px">Size</th><th style="width:60px">Date</th><th style="width:70px"></th></tr></thead><tbody>';
    folderNames.forEach(folder => {
      if (folder) {
        html += `<tr><td colspan="6" style="font-weight:600;color:var(--accent-text);padding:8px 4px;font-size:0.8rem">&#128193; ${esc(folder)}/</td></tr>`;
      }
      folders[folder].forEach(f => {
        const rawName = f.folder ? f.name.split('/').pop() : f.name;
        const nameNoExt = rawName.replace(/\.[^.]+$/, '').replace(/[-_ ]+/g, ' ').trim().toLowerCase();
        const planNorm = (f.planName || '').replace(/[-_: ]+/g, ' ').trim().toLowerCase();
        const planMatch = f.planName && (planNorm === nameNoExt || rawName.toLowerCase().startsWith(planNorm));
        const displayName = f.planName && !planMatch ? f.planName : rawName;
        const subtitle = (f.planName && !planMatch) ? `<br><span style="font-size:0.68rem;color:var(--text-muted)">${esc(rawName)}</span>` : '';
        html += `<tr>`;
        html += `<td style="max-width:250px;overflow:hidden;text-overflow:ellipsis" title="${esc(f.name)}">${esc(displayName)}${subtitle}</td>`;
        html += `<td>${formatBadge(f)}</td>`;
        html += `<td>${f.rowCount >= 0 ? f.rowCount : '--'}</td>`;
        html += `<td>${fmtSize(f.size)}</td>`;
        html += `<td>${fmtDate(f.modified)}</td>`;
        html += `<td><button class="btn btn--sm btn--primary" data-action="previewDownloadsFile" data-arg0="${esc(f.name)}">Preview</button></td>`;
        html += `</tr>`;
      });
    });
    html += '</tbody></table></div>';
  }

  if (unknown.length > 0) {
    html += `<details style="margin-top:12px"><summary style="font-size:0.78rem;color:var(--text-muted);cursor:pointer">${unknown.length} files with unrecognised format</summary>`;
    html += '<div style="max-height:200px;overflow-y:auto;margin-top:8px"><table class="leads-table" style="font-size:0.72rem"><thead><tr><th>File</th><th>Size</th><th>Date</th></tr></thead><tbody>';
    unknown.forEach(f => {
      html += `<tr><td title="${esc(f.name)}" style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</td><td>${fmtSize(f.size)}</td><td>${fmtDate(f.modified)}</td></tr>`;
    });
    html += '</tbody></table></div></details>';
  }

  html += `<div style="margin-top:16px;text-align:right"><button class="btn" data-action="_actModalRemove" data-arg0="downloadsWizard">Close</button></div>`;
  step1.innerHTML = html;
}

/** Preview a specific file before importing */
/** Fetch and display a preview of a server-side file for column mapping */
async function previewDownloadsFile(filename, sheet) {
  const step1 = document.getElementById('dlStep1');
  const step2 = document.getElementById('dlStep2');
  if (!step1 || !step2) return;

  step1.style.display = 'none';
  step2.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">Parsing file...</div>';
  step2.style.display = 'block';

  try {
    const body = { filename };
    if (sheet) body.sheet = sheet;
    const resp = await authFetch('/api/import/parse-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) { const err = await resp.json(); toast(err.error || 'Parse failed', 'error'); step2.style.display = 'none'; step1.style.display = 'block'; return; }
    const data = await resp.json();
    _downloadsImportData = data;
    renderDownloadsPreview(data);
  } catch(e) { toast('Parse error: ' + e.message, 'error'); step2.style.display = 'none'; step1.style.display = 'block'; }
}

/** Render the column mapping UI and data preview for a server file import */
function renderDownloadsPreview(data) {
  const step2 = document.getElementById('dlStep2');
  if (!step2) return;

  const clientOpts = getContractedClients().map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const rootOpts = getRootTasks().map(r => `<option value="${r.id}">${esc(r.title)}</option>`).join('');

  let html = `<div style="margin-bottom:12px"><button class="btn btn--sm" data-action="_actDlStepBack">&larr; Back to file list</button></div>`;

  html += `<div style="margin-bottom:12px;font-size:0.85rem"><strong>${esc(data.filename)}</strong> &mdash; <span style="color:var(--accent-text)">${esc(data.formatLabel)}</span> &mdash; ${data.totalRows} rows`;
  if (data.sheets) html += ` &mdash; Sheets: ${data.sheets.join(', ')}`;
  html += `</div>`;

  // Sheet selector for multi-sheet files
  if (data.sheets && data.sheets.length > 1) {
    html += `<div style="margin-bottom:12px"><label style="font-size:0.78rem;color:var(--text-secondary)">Sheet: </label><select id="dlSheetSelect" onchange="reloadDownloadsSheet()" style="padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.78rem">`;
    data.sheets.forEach(s => { html += `<option value="${esc(s)}" ${s === data.activeSheet ? 'selected' : ''}>${esc(s)}</option>`; });
    html += `</select></div>`;
  }

  // Client & parent selectors
  html += `<div style="display:flex;gap:12px;margin-bottom:12px">`;
  html += `<div style="flex:1"><label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">Assign to Client</label>
    <select id="dlClientSelect" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.78rem">
      <option value="">-- Auto-detect / None --</option>${clientOpts}</select></div>`;
  html += `<div style="flex:1"><label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">Parent Project</label>
    <select id="dlParentSelect" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.78rem">
      <option value="">-- Create as root tasks --</option>${rootOpts}</select></div>`;
  html += `</div>`;

  // Import mode
  html += `<div style="margin-bottom:12px"><label style="font-size:0.78rem;color:var(--text-secondary)">Import mode: </label>
    <select id="dlModeSelect" style="padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.78rem">
      <option value="append">Append (add to existing tasks)</option>
      <option value="replace">Replace all tasks (clear first)</option>
    </select></div>`;

  // Preview table
  const preview = data.preview || [];
  if (preview.length > 0) {
    html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px">Preview (first ${preview.length} of ${data.totalRows} rows):</div>`;
    html += '<div style="max-height:250px;overflow:auto"><table class="leads-table" style="font-size:0.72rem"><thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Assignees</th><th>Due</th></tr></thead><tbody>';
    preview.forEach(t => {
      html += `<tr>`;
      html += `<td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title || '')}</td>`;
      html += `<td>${esc(t.status || '')}</td>`;
      html += `<td>${esc(t.priority || '')}</td>`;
      html += `<td>${esc((t.assignees || []).join(', '))}</td>`;
      html += `<td>${esc(t.dueDate || t.endDate || '')}</td>`;
      html += `</tr>`;
    });
    if (data.totalRows > preview.length) html += `<tr><td colspan="5" style="color:var(--text-muted);text-align:center">... and ${data.totalRows - preview.length} more rows</td></tr>`;
    html += '</tbody></table></div>';
  }

  html += `<div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">`;
  html += `<button class="btn" data-action="_actDlStepBack">Cancel</button>`;
  html += `<button class="btn btn--primary" data-action="executeDownloadsImport">Import ${data.tasks ? data.tasks.length : 0} Tasks</button>`;
  html += `</div>`;

  step2.innerHTML = html;
}

/** Reload a different sheet from the same file */
/** Reload preview when the user selects a different sheet */
async function reloadDownloadsSheet() {
  const sheet = document.getElementById('dlSheetSelect')?.value;
  if (!_downloadsImportData || !sheet) return;
  await previewDownloadsFile(_downloadsImportData.filename, sheet);
}

/** Execute the import — create tasks from parsed data */
/** Execute the import: map columns, transform rows into tasks, and merge with existing data */
async function executeDownloadsImport() {
  if (!_downloadsImportData || !_downloadsImportData.tasks) { toast('No data to import'); return; }

  const importTasks = _downloadsImportData.tasks;
  const clientOverride = document.getElementById('dlClientSelect')?.value || '';
  const parentId = document.getElementById('dlParentSelect')?.value || null;
  const mode = document.getElementById('dlModeSelect')?.value || 'append';

  if (importTasks.length === 0) { toast('No tasks found in file'); return; }

  if (mode === 'replace') {
    if (!(await themedConfirm(`This will replace ALL existing tasks with ${importTasks.length} imported tasks. Continue?`))) return;
    tasks.forEach(t => markDeleted(t.id));
    tasks = [];
  }

  // Build tasks with IDs and resolve parent relationships
  const newTasks = [];
  const titleMap = {};

  importTasks.forEach(t => {
    const id = uid();
    const task = {
      id, title: t.title, parentId: parentId || null,
      client: clientOverride || t.client || '',
      status: t.status || 'Not started',
      priority: t.priority || '',
      healthState: t.healthState || '',
      description: t.description || '',
      assignees: t.assignees || [],
      hoursEstimated: t.hoursEstimated || 0,
      hoursSpent: t.hoursSpent || 0,
      dueDate: t.dueDate || '',
      startDate: t.startDate || '',
      endDate: t.endDate || '',
      dependencies: [],
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _serverUpdatedAt: null,
      _parentTitle: t.parentTitle || '',
    };
    if (t.plannerTaskId) task.plannerTaskId = t.plannerTaskId;
    if (!titleMap[t.title]) titleMap[t.title] = id;
    newTasks.push(task);
  });

  // Resolve parent titles to IDs
  newTasks.forEach(t => {
    if (t._parentTitle && t._parentTitle !== t.title) {
      let pid = titleMap[t._parentTitle];
      if (!pid) {
        // Check existing tasks too
        const existing = tasks.find(x => x.title === t._parentTitle);
        if (existing) { pid = existing.id; }
        else {
          // Create parent as group task
          const parentTask = {
            id: uid(), title: t._parentTitle, parentId: parentId || null,
            client: clientOverride || t.client || '', status: 'In progress', priority: '',
            healthState: '', description: '', assignees: [], hoursEstimated: 0, hoursSpent: 0,
            dueDate: '', startDate: '', endDate: '', dependencies: [], notes: [],
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), _serverUpdatedAt: null,
          };
          titleMap[t._parentTitle] = parentTask.id;
          newTasks.push(parentTask);
          pid = parentTask.id;
        }
      }
      t.parentId = pid;
    }
    delete t._parentTitle;
  });

  // Auto-detect client from root task names if no override
  if (!clientOverride) {
    const clientAliases = {
      'Couch Heroes': ['couch heroes', 'couch'], 'Lighthouse Studios': ['lighthouse'],
      'Sarge Universe': ['sarge'], 'Goals Studio': ['goals'], 'Playsage': ['playsage'],
      'NBI Operations': ['nbi operations', 'nbi internal', 'nbi'],
    };
    newTasks.filter(t => !t.parentId || t.parentId === parentId).forEach(t => {
      if (t.client) return;
      const lower = t.title.toLowerCase();
      for (const [client, aliases] of Object.entries(clientAliases)) {
        if (aliases.some(a => lower.includes(a))) { t.client = client; break; }
      }
    });
  }

  // Inherit client from parent
  newTasks.forEach(t => {
    if (!t.client && t.parentId) {
      const parent = newTasks.find(p => p.id === t.parentId) || tasks.find(p => p.id === t.parentId);
      if (parent && parent.client) t.client = parent.client;
    }
  });

  // Add to task list and sync
  tasks.push(...newTasks);
  newTasks.forEach(t => markDirty(t.id));
  save();

  const importedFilename = _downloadsImportData?.filename || 'file';
  _downloadsImportData = null;
  document.getElementById('downloadsWizard')?.remove();
  toast(`Imported ${newTasks.length} tasks from ${importedFilename}`);
  renderAll();
}

// ----- CSV IMPORT -----
// ==================== CSV / EXCEL FILE IMPORT ====================

/** Open the file import modal (CSV/Excel drag-and-drop) */
function openImportModal() { document.getElementById('importModal').classList.add('open'); document.getElementById('importPreview').innerHTML = ''; document.getElementById('confirmImportBtn').style.display = 'none'; pendingCSVData = null; }
/** Close the file import modal and clear staging data */
function closeImportModal() { document.getElementById('importModal').classList.remove('open'); pendingCSVData = null; }

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });

/** Handle a dropped/selected file -- routes to Excel or CSV parser based on extension */
function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    const reader = new FileReader();
    reader.onload = e => { parseExcelPreview(new Uint8Array(e.target.result), file.name).catch(err => toast('Failed to parse Excel: ' + err.message, 'error')); };
    reader.readAsArrayBuffer(file);
  } else if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = e => { parseCSVPreview(e.target.result); };
    reader.readAsText(file);
  } else {
    toast('Please select an Excel (.xlsx) or CSV file', 'error');
  }
}

/** Parse an Excel workbook (via ExcelJS) and render a column-mapping preview with sheet selector */
async function parseExcelPreview(data, filename) {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(data.buffer);
    const sheetNames = wb.worksheets.map(ws => ws.name);
    const sheetName = sheetNames.includes('Tasks') ? 'Tasks' : sheetNames[0];
    const ws = wb.getWorksheet(sheetName);
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals = [];
      for (let c = 1; c <= row.cellCount; c++) {
        const cell = row.getCell(c);
        const v = cell.value;
        if (v instanceof Date) { vals.push(`${String(v.getDate()).padStart(2,'0')}/${String(v.getMonth()+1).padStart(2,'0')}/${v.getFullYear()}`); }
        else vals.push(v != null ? String(v) : null);
      }
      rows.push(vals);
    });
    if (rows.length < 2) { toast('Spreadsheet appears empty', 'error'); return; }

    const headers = rows[0].map(h => String(h || '').trim());
    const dataRows = rows.slice(1).filter(r => r.some(c => c != null && String(c).trim() !== ''));

    const isPlannerExport = headers.includes('Task ID') && headers.includes('Bucket Name') && headers.includes('Progress');

    let planName = '';
    if (sheetNames.includes('Plan name')) {
      const pnWs = wb.getWorksheet('Plan name');
      const pnRows = [];
      pnWs.eachRow({ includeEmpty: false }, (row) => {
        const vals = [];
        for (let c = 1; c <= row.cellCount; c++) { const v = row.getCell(c).value; vals.push(v != null ? String(v) : null); }
        pnRows.push(vals);
      });
      const nameRow = pnRows.find(r => r[0] === 'Plan name');
      if (nameRow) planName = nameRow[1] || '';
    }

    // Preview
    let html = `<div class="import-summary"><strong>${dataRows.length} tasks</strong> from ${esc(filename)}`;
    if (planName) html += ` <span style="color:var(--accent-text)">(${esc(planName)})</span>`;
    if (isPlannerExport) html += ` <span style="color:var(--success);font-size:0.8rem">&#10003; Microsoft Planner format detected</span>`;
    html += `</div>`;

    // Show column mapping
    const displayHeaders = isPlannerExport ? ['Task Name', 'Bucket', 'Progress', 'Priority', 'Assigned To', 'Due date'] : headers.slice(0, 8);
    const displayIndices = displayHeaders.map(h => headers.indexOf(h));

    html += '<table class="preview-table"><thead><tr>';
    displayHeaders.forEach(h => { html += `<th>${esc(h)}</th>`; });
    html += '</tr></thead><tbody>';
    dataRows.slice(0, 5).forEach(r => {
      html += '<tr>';
      displayIndices.forEach(i => { html += `<td>${esc(i >= 0 && r[i] != null ? String(r[i]) : '')}</td>`; });
      html += '</tr>';
    });
    if (dataRows.length > 5) html += `<tr><td colspan="${displayHeaders.length}" style="color:var(--text-muted);text-align:center">... and ${dataRows.length - 5} more rows</td></tr>`;
    html += '</tbody></table>';

    if (isPlannerExport) {
      // Show Planner-specific mapping summary
      const buckets = new Set();
      const people = new Set();
      const bucketIdx = headers.indexOf('Bucket Name');
      const assignIdx = headers.indexOf('Assigned To');
      dataRows.forEach(r => {
        if (bucketIdx >= 0 && r[bucketIdx]) buckets.add(String(r[bucketIdx]).trim());
        if (assignIdx >= 0 && r[assignIdx]) String(r[assignIdx]).split(';').forEach(p => people.add(p.trim()));
      });
      html += `<div style="margin-top:var(--space-md);font-size:0.8rem;color:var(--text-secondary)">`;
      html += `<strong>Buckets:</strong> ${[...buckets].map(b => esc(b)).join(', ')}<br>`;
      html += `<strong>People:</strong> ${[...people].filter(Boolean).map(p => esc(p)).join(', ')}`;
      html += `</div>`;
    }

    document.getElementById('importPreview').innerHTML = html;
    document.getElementById('confirmImportBtn').style.display = '';
    pendingCSVData = { headers, rows: dataRows, isPlannerExport, planName };
  } catch (e) {
    toast('Failed to parse Excel file: ' + e.message, 'error');
  }
}

/** Parse CSV text into an array of row arrays, handling quoted fields with commas */
function parseCSV(text) {
  // Single-pass RFC 4180 parser that handles multiline quoted fields
  const rows = [];
  let row = [], cell = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i+1] === '"') { cell += '"'; i++; } // escaped quote
        else { inQuote = false; } // end of quoted field
      } else { cell += ch; } // content inside quotes (including newlines, commas)
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(cell.trim()); cell = ''; }
      else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i+1] === '\n') i++; // skip \r\n
        row.push(cell.trim()); cell = '';
        if (row.some(c => c !== '')) rows.push(row); // skip fully empty rows
        row = [];
      } else { cell += ch; }
    }
  }
  // Final row
  row.push(cell.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

/** Parse CSV text and render a preview table with the first 5 rows */
function parseCSVPreview(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) { toast('CSV appears empty', 'error'); return; }
  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Preview
  let html = `<div class="import-summary"><strong>${dataRows.length} tasks</strong> found in CSV with columns: ${headers.join(', ')}</div>`;
  html += '<table class="preview-table"><thead><tr>';
  headers.forEach(h => { html += `<th>${esc(h)}</th>`; });
  html += '</tr></thead><tbody>';
  dataRows.slice(0, 5).forEach(r => { html += '<tr>'; r.forEach(c => { html += `<td>${esc(c)}</td>`; }); html += '</tr>'; });
  if (dataRows.length > 5) html += `<tr><td colspan="${headers.length}" style="color:var(--text-muted);text-align:center">... and ${dataRows.length - 5} more rows</td></tr>`;
  html += '</tbody></table>';

  document.getElementById('importPreview').innerHTML = html;
  document.getElementById('confirmImportBtn').style.display = '';
  pendingCSVData = { headers, rows: dataRows };
}

/** Confirm and execute a CSV/Excel import -- transforms rows into tasks with parent-child nesting */
async function confirmImport() {
  if (!pendingCSVData) return;
  const { headers, rows, isPlannerExport, planName } = pendingCSVData;

  if (isPlannerExport) { confirmPlannerImport(headers, rows, planName); return; }

  // Column indices
  const col = (name) => { const i = headers.findIndex(h => h.toLowerCase().replace(/[^a-z]/g,'') === name.toLowerCase().replace(/[^a-z]/g,'')); return i; };
  const iTask = col('task'), iParent = col('parenttask'), iStatus = col('status'), iPriority = col('priority');
  const iDesc = col('description'), iAssignee = col('assignee'), iFiles = col('files'), iHealth = col('healthstate');
  const iDue = col('duedate');
  const iHoursEst = col('hoursestimated');
  const iHoursSpent = col('hoursspent');

  if (iTask < 0) { toast('CSV must have a "Task" column', 'error'); return; }

  // Build tasks
  const newTasks = [];
  const titleMap = {};
  let warnings = 0;

  rows.forEach(r => {
    const title = r[iTask];
    if (!title) { warnings++; return; }
    const id = uid();
    const parentTitle = iParent >= 0 ? r[iParent] : '';
    const status = iStatus >= 0 ? normaliseStatus(r[iStatus]) : 'Not started';
    const priority = iPriority >= 0 ? r[iPriority] : '';
    const desc = iDesc >= 0 ? r[iDesc] : '';
    const assignee = iAssignee >= 0 ? r[iAssignee] : '';
    const health = iHealth >= 0 ? normaliseHealth(r[iHealth]) : '';
    const assignees = assignee ? assignee.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

    const dueDate = iDue >= 0 ? r[iDue] : '';
    const hoursEstimated = iHoursEst >= 0 ? parseFloat(r[iHoursEst]) || 0 : 0;
    const hoursSpent = iHoursSpent >= 0 ? parseFloat(r[iHoursSpent]) || 0 : 0;
    const task = { id, title, parentId: null, _parentTitle: parentTitle, client: '', status, priority, healthState: health, description: desc, assignees, hoursEstimated, hoursSpent, dueDate: dueDate || '', notes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

    if (!titleMap[title]) titleMap[title] = id;
    newTasks.push(task);
  });

  // Resolve parents -- create missing parent tasks automatically
  newTasks.forEach(t => {
    if (t._parentTitle && t._parentTitle !== t.title) {
      let pid = titleMap[t._parentTitle];
      if (!pid) {
        // Parent referenced but doesn't exist -- create it as a top-level project
        const parentTask = { id: uid(), title: t._parentTitle, parentId: null, client: '', status: 'In progress', priority: '', healthState: '', description: '', assignees: [], hoursEstimated: 0, hoursSpent: 0, dueDate: '', notes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        titleMap[t._parentTitle] = parentTask.id;
        newTasks.push(parentTask);
        pid = parentTask.id;
      }
      t.parentId = pid;
    }
    delete t._parentTitle;
  });

  // Detect circular refs
  newTasks.forEach(t => {
    const visited = new Set();
    let cur = t;
    while (cur && cur.parentId) {
      if (visited.has(cur.id)) { t.parentId = null; warnings++; break; }
      visited.add(cur.id);
      cur = newTasks.find(x => x.id === cur.parentId);
    }
  });

  // Auto-assign clients from root project names
  // Known client names and short forms for matching
  const clientAliases = {
    'Couch Heroes': ['couch heroes', 'couch'],
    'Lighthouse Studios': ['lighthouse'],
    'Sarge Universe': ['sarge'],
    'Goals Studio': ['goals'],
    'Playsage': ['playsage'],
    'NBI Operations': ['nbi operations', 'nbi internal', 'nbi']
  };
  newTasks.filter(t => !t.parentId).forEach(t => {
    const lower = t.title.toLowerCase();
    let matched = false;
    for (const [client, aliases] of Object.entries(clientAliases)) {
      if (aliases.some(a => lower.includes(a))) { t.client = client; matched = true; break; }
    }
    // Default unmatched root projects to Couch Heroes (Glen's primary engagement)
    if (!matched && !t.client) t.client = 'Couch Heroes';
  });

  // Mark all existing tasks as deleted, all new tasks as dirty
  tasks.forEach(t => markDeleted(t.id));
  tasks = newTasks;
  newTasks.forEach(t => markDirty(t.id));
  save();
  closeImportModal();
  renderAll();
  toast(`Imported ${newTasks.length} tasks` + (warnings > 0 ? ` (${warnings} warnings)` : ''));
}

/** Normalise a free-text status string to one of the canonical STATUSES values */
function normaliseStatus(s) {
  if (!s) return 'Not started';
  const lower = s.toLowerCase().trim();
  const map = { 'not started': 'Not started', 'in progress': 'In progress', planning: 'Planning', drafted: 'Drafted', done: 'Done', completed: 'Done', cancelled: 'Cancelled', canceled: 'Cancelled' };
  return map[lower] || 'Not started'; // Default to Not started if unrecognised
}

/** Normalise a free-text health string to one of the canonical HEALTH_STATES values */
function normaliseHealth(h) {
  if (!h) return '';
  const lower = h.toLowerCase().trim();
  const map = { green: 'Green', yellow: 'Yellow', red: 'Red', blocked: 'Blocked', 'waiting on client': 'Waiting on Client' };
  return map[lower] || h;
}

// ----- MICROSOFT PLANNER IMPORT -----
/**
 * Import tasks from a Microsoft Planner export.
 * Maps Planner columns (Bucket, Task Name, etc.) to dashboard task fields.
 * @param {string[]} headers - Column headers from the Planner export
 * @param {string[][]} rows - Data rows
 * @param {string} planName - Name of the Planner plan
 */
function confirmPlannerImport(headers, rows, planName) {
  // Column indices for Planner export format
  const ci = (name) => headers.indexOf(name);
  const iName = ci('Task Name');
  const iBucket = ci('Bucket Name');
  const iProgress = ci('Progress');
  const iPriority = ci('Priority');
  const iAssigned = ci('Assigned To');
  const iCreatedBy = ci('Created By');
  const iCreatedDate = ci('Created Date');
  const iStartDate = ci('Start date');
  const iDueDate = ci('Due date');
  const iLate = ci('Late');
  const iCompletedDate = ci('Completed Date');
  const iCompletedBy = ci('Completed By');
  const iChecklist = ci('Checklist Items');
  const iChecklistDone = ci('Completed Checklist Items');
  const iLabels = ci('Labels');
  const iDesc = ci('Description');
  const iTaskId = ci('Task ID');

  if (iName < 0) { toast('Planner export must have a "Task Name" column', 'error'); return; }

  /** Map Microsoft Planner progress values to dashboard status strings */
  function plannerStatus(progress) {
    if (!progress) return 'Not started';
    const lower = progress.toLowerCase().trim();
    const map = {
      'not started': 'Not started',
      'in progress': 'In progress',
      'completed': 'Done',
    };
    return map[lower] || 'Not started';
  }

  /** Map Microsoft Planner priority levels to dashboard priority strings */
  function plannerPriority(p) {
    if (!p) return '';
    const lower = p.toLowerCase().trim();
    const map = { 'urgent': 'Critical ACT', 'important': 'High', 'medium': 'Medium', 'low': 'Low' };
    return map[lower] || p;
  }

  /** Derive health state from Planner labels and late status */
  function plannerHealth(labels, isLate) {
    if (!labels) labels = '';
    const lower = labels.toLowerCase();
    if (lower.includes('blocked')) return 'Blocked';
    if (isLate === 'true') return 'Red';
    if (lower.includes('on hold')) return 'Yellow';
    if (lower.includes('review')) return 'Yellow';
    return '';
  }

  /** Parse estimated hours from a task name (pattern: *Xh or *X hrs) */
  function parseHoursFromTitle(title) {
    const match = title.match(/\*\s*(\d+)\s*h/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /** Parse checklist completion from Planner done/total columns (e.g. '3/5') */
  function parseChecklist(done, total) {
    if (!done || !total) return { done: 0, total: 0 };
    const doneMatch = String(done).match(/(\d+)/);
    const totalMatch = String(total).match(/(\d+)/);
    // Format is "3/5" in done column and individual items in total column
    const doneStr = String(done);
    const slashMatch = doneStr.match(/(\d+)\/(\d+)/);
    if (slashMatch) return { done: parseInt(slashMatch[1], 10), total: parseInt(slashMatch[2], 10) };
    return { done: doneMatch ? parseInt(doneMatch[1], 10) : 0, total: totalMatch ? parseInt(totalMatch[1], 10) : 0 };
  }

  /** Detect the client name from a task or plan name using known client aliases */
  function detectClient(taskName, pName) {
    const combined = (taskName + ' ' + pName).toLowerCase();
    const clientAliases = {
      'Couch Heroes': ['couch heroes', 'couch'],
      'Lighthouse Studios': ['lighthouse'],
      'Sarge Universe': ['sarge'],
      'Goals Studio': ['goals'],
      'Playsage': ['playsage'],
      'NBI Operations': ['nbi operations', 'nbi internal', 'nbi'],
      'Blizzard Entertainment': ['blizzard'],
    };
    for (const [client, aliases] of Object.entries(clientAliases)) {
      if (aliases.some(a => combined.includes(a))) return client;
    }
    return '';
  }

  // Build tasks grouped by bucket
  const newTasks = [];
  const bucketIds = {};
  const clientName = detectClient('', planName);
  let warnings = 0;

  // Create bucket parent tasks first
  const buckets = new Set();
  rows.forEach(r => {
    const bucket = iBucket >= 0 && r[iBucket] ? String(r[iBucket]).trim() : '';
    if (bucket) buckets.add(bucket);
  });

  // Determine bucket ordering (Planner uses: Actively Working, Planning, Backlog, Complete, Resources, Review)
  const bucketOrder = ['Actively Working', 'Planning', 'Backlog', 'Review', 'Resources', 'Complete'];
  const sortedBuckets = [...buckets].sort((a, b) => {
    const ai = bucketOrder.indexOf(a); const bi = bucketOrder.indexOf(b);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  sortedBuckets.forEach(bucket => {
    const id = uid();
    bucketIds[bucket] = id;
    const bucketTasks = rows.filter(r => iBucket >= 0 && String(r[iBucket] || '').trim() === bucket);
    const doneCount = bucketTasks.filter(r => iProgress >= 0 && String(r[iProgress] || '').toLowerCase() === 'completed').length;
    const bucketStatus = doneCount === bucketTasks.length ? 'Done' : doneCount > 0 ? 'In progress' : 'Not started';
    newTasks.push({
      id, title: bucket, parentId: null, client: clientName || detectClient(bucket, planName),
      status: bucketStatus, priority: '', healthState: '',
      description: `${bucketTasks.length} tasks (${doneCount} completed)`,
      assignees: [], hoursEstimated: 0, hoursSpent: 0, dueDate: '',
      notes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  });

  // Create task entries
  rows.forEach(r => {
    const name = iName >= 0 ? String(r[iName] || '').trim() : '';
    if (!name) { warnings++; return; }

    const bucket = iBucket >= 0 ? String(r[iBucket] || '').trim() : '';
    const progress = iProgress >= 0 ? String(r[iProgress] || '') : '';
    const priority = iPriority >= 0 ? String(r[iPriority] || '') : '';
    const assigned = iAssigned >= 0 ? String(r[iAssigned] || '') : '';
    const createdDate = iCreatedDate >= 0 ? String(r[iCreatedDate] || '') : '';
    const startDate = iStartDate >= 0 ? String(r[iStartDate] || '') : '';
    const dueDate = iDueDate >= 0 ? String(r[iDueDate] || '') : '';
    const isLate = iLate >= 0 ? String(r[iLate] || '') : '';
    const completedDate = iCompletedDate >= 0 ? String(r[iCompletedDate] || '') : '';
    const labels = iLabels >= 0 ? String(r[iLabels] || '') : '';
    const desc = iDesc >= 0 ? String(r[iDesc] || '').replace(/_x000d_/g, '') : '';
    const taskId = iTaskId >= 0 ? String(r[iTaskId] || '') : '';
    const checklistDone = iChecklistDone >= 0 ? String(r[iChecklistDone] || '') : '';
    const checklistItems = iChecklist >= 0 ? String(r[iChecklist] || '') : '';

    const assignees = assigned ? assigned.split(';').map(s => s.trim()).filter(Boolean) : [];
    const hoursEst = parseHoursFromTitle(name);
    const checklist = parseChecklist(checklistDone, checklistItems);

    // Build description with checklist and metadata
    let fullDesc = desc;
    if (checklist.total > 0) {
      fullDesc += (fullDesc ? '\n\n' : '') + `Checklist: ${checklist.done}/${checklist.total} complete`;
      if (checklistItems) fullDesc += '\n' + checklistItems.split(';').map(i => `  - ${i.trim()}`).join('\n');
    }
    if (labels) fullDesc += (fullDesc ? '\n\n' : '') + `Labels: ${labels}`;
    if (completedDate) fullDesc += (fullDesc ? '\n' : '') + `Completed: ${completedDate}`;

    const id = uid();
    newTasks.push({
      id, title: name, parentId: bucketIds[bucket] || null,
      client: clientName || detectClient(name, planName),
      status: plannerStatus(progress), priority: plannerPriority(priority),
      healthState: plannerHealth(labels, isLate),
      description: fullDesc.trim(), assignees, hoursEstimated: hoursEst, hoursSpent: 0,
      dueDate: dueDate || '', notes: [],
      createdAt: createdDate || new Date().toISOString(),
      updatedAt: completedDate || createdDate || new Date().toISOString(),
      plannerTaskId: taskId,
    });
  });

  // If no client was detected, try to add it to known clients from plan name
  if (clientName && !settings.knownClients.includes(clientName)) {
    settings.knownClients.push(clientName);
  }

  tasks = [...tasks, ...newTasks];
  save();
  closeImportModal();
  renderAll();
  toast(`Imported ${rows.length} tasks from Planner` + (planName ? ` (${planName})` : '') + (warnings > 0 ? ` - ${warnings} warnings` : ''));
}

// ==================== CSV EXPORT ====================

/** Generate a client-specific report as a CSV download with task details, hours, and costs */
function generateClientReport(clientName) {
  const ct = tasks.filter(t => getTaskClient(t) === clientName);
  if (ct.length === 0) { toast('No tasks for ' + clientName); return; }
  const roots = ct.filter(t => !t.parentId || getTaskClient(tasks.find(p => p.id === t.parentId)) !== clientName);
  const statusC = {};
  ct.forEach(t => { statusC[t.status] = (statusC[t.status]||0) + 1; });
  const totalHrs = ct.reduce((s,t) => s + (t.hoursSpent||0), 0);
  const totalEst = ct.reduce((s,t) => s + (t.hoursEstimated||0), 0);
  const done = statusC['Done'] || 0;
  const blocked = ct.filter(t => t.healthState === 'Blocked');
  const overdue = ct.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < new Date(new Date().setHours(0,0,0,0)));
  const inProg = ct.filter(t => t.status === 'In progress');
  const dueThisWeek = ct.filter(t => {
    if (!t.dueDate || t.status === 'Done') return false;
    const d = safeParseDate(t.dueDate); const now = new Date(); now.setHours(0,0,0,0);
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
    return d >= now && d <= weekEnd;
  });

  let report = `CLIENT STATUS REPORT: ${clientName}\n`;
  report += `Generated: ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}\n`;
  report += `${'='.repeat(50)}\n\n`;
  report += `SUMMARY\n`;
  report += `  Total tasks: ${ct.length} | Done: ${done} (${ct.length ? Math.round(done/ct.length*100) : 0}%)\n`;
  report += `  In progress: ${inProg.length} | Blocked: ${blocked.length} | Overdue: ${overdue.length}\n`;
  report += `  Hours: ${totalHrs.toFixed(1)}h spent / ${totalEst.toFixed(1)}h estimated\n`;
  report += `  Due this week: ${dueThisWeek.length}\n\n`;

  if (blocked.length > 0) {
    report += `BLOCKED ITEMS\n`;
    blocked.forEach(t => { report += `  - ${t.title}\n`; });
    report += '\n';
  }
  if (overdue.length > 0) {
    report += `OVERDUE\n`;
    overdue.forEach(t => { report += `  - ${t.title} (due ${t.dueDate})\n`; });
    report += '\n';
  }
  if (dueThisWeek.length > 0) {
    report += `DUE THIS WEEK\n`;
    dueThisWeek.forEach(t => { report += `  - ${t.title} (${t.dueDate})\n`; });
    report += '\n';
  }

  report += `ACTIVE WORK\n`;
  inProg.forEach(t => {
    const pct = t.hoursEstimated > 0 ? Math.round((t.hoursSpent||0)/t.hoursEstimated*100) : 0;
    report += `  - ${t.title} [${pct}% | ${(t.assignees||[]).join(', ')||'Unassigned'}]\n`;
  });

  // Copy to clipboard and open in a new window. The old implementation
  // used document.write with clientName interpolated directly into the
  // title tag, which let a client name containing a closing title tag
  // followed by an injected script break out of the title context and
  // run arbitrary JS with access to window.opener (audit finding F-C4).
  // Build the DOM via textContent and a pre element instead, and drop
  // window.opener so the popup cannot reach back into the parent origin.
  navigator.clipboard.writeText(report).then(() => toast('Report copied to clipboard'));
  const win = window.open('', '_blank', 'width=700,height=600');
  if (!win) { toast('Popup blocked — report copied to clipboard', 'warning'); return; }
  try { win.opener = null; } catch (_) { /* ignore — some browsers lock this */ }
  const doc = win.document;
  doc.title = 'Status Report: ' + clientName;
  const style = doc.createElement('style');
  style.textContent = 'body{font-family:monospace;background:#111;color:#ddd;padding:24px;white-space:pre-wrap;font-size:13px;line-height:1.6}';
  doc.head.appendChild(style);
  const pre = doc.createElement('pre');
  pre.textContent = report;
  doc.body.innerHTML = '';
  doc.body.appendChild(pre);
}


// ===== USER MANAGEMENT =====
/** Fetch user list from the API and render the user management table in settings */
async function loadUserManagement() {
  const el = document.getElementById('userManageList');
  if (!el) return;
  try {
    const users = await apiCall('/api/users');
    if (!users) return;
    const clientList = Object.values(_apiClientsCache);
    el.innerHTML = `<table class="report-table" style="font-size:0.8rem"><thead><tr><th>Username</th><th>Display Name</th><th>Email</th><th>Role</th><th>Client Scope</th><th></th></tr></thead><tbody>` +
      users.map(u => {
        const scopeOpts = `<option value="">None (internal)</option>` + clientList.map(c => `<option value="${esc(c.id)}" ${u.client_id===c.id?'selected':''}>${esc(c.name)}</option>`).join('');
        return `<tr>
        <td><strong>${esc(u.username)}</strong></td>
        <td><input value="${esc(u.display_name)}" onblur="updateUserField('${u.id}','display_name',this.value)" onkeydown="if(event.key==='Enter')this.blur()" style="background:transparent;border:1px solid transparent;border-radius:3px;padding:2px 4px;color:var(--text-primary);font-size:0.8rem;width:100%" onfocus="this.style.borderColor='var(--accent)';this.style.background='var(--bg-input)'" onblur="this.style.borderColor='transparent';this.style.background='transparent';updateUserField('${u.id}','display_name',this.value)"></td>
        <td><input value="${esc(u.email||'')}" onblur="updateUserField('${u.id}','email',this.value)" onkeydown="if(event.key==='Enter')this.blur()" style="background:transparent;border:1px solid transparent;border-radius:3px;padding:2px 4px;color:var(--text-primary);font-size:0.8rem;width:100%" onfocus="this.style.borderColor='var(--accent)';this.style.background='var(--bg-input)'" onblur="this.style.borderColor='transparent';this.style.background='transparent';updateUserField('${u.id}','email',this.value)"></td>
        <td><select onchange="updateUserRole('${u.id}',this.value)" style="font-size:0.75rem;padding:2px 4px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:3px;color:var(--text-primary)"><option value="user" ${u.role==='user'?'selected':''}>User</option><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option></select></td>
        <td><select onchange="updateUserClientScope('${u.id}',this.value)" style="font-size:0.75rem;padding:2px 4px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:3px;color:var(--text-primary)">${scopeOpts}</select></td>
        <td>${_currentUser && u.id !== _currentUser.id ? `<button style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.75rem" data-action="deleteUser" data-arg0="${u.id}" data-arg1="${esc(u.display_name)}">&times; Remove</button>` : ''}</td>
      </tr>`;
      }).join('') +
      `</tbody></table>`;
  } catch(e) {}
}

/** Create a new user account via prompt dialogs (admin only) */
async function createUser() {
  const usernameEl = document.getElementById('newUserUsername');
  const passwordEl = document.getElementById('newUserPw');
  const container = usernameEl?.closest('.settings__group') || usernameEl?.parentElement;
  clearFieldErrors(container);
  const username = usernameEl?.value?.trim();
  const displayName = document.getElementById('newUserName')?.value?.trim();
  const email = document.getElementById('newUserEmail')?.value?.trim();
  const password = passwordEl?.value;
  const role = document.getElementById('newUserRole')?.value;
  const clientScope = document.getElementById('newUserClientScope')?.value || null;
  let valid = true;
  if (!username) { showFieldError(usernameEl, 'Username is required'); valid = false; }
  if (!password) { showFieldError(passwordEl, 'Password is required'); valid = false; }
  if (!valid) return;
  const newUserPayload = { username, display_name: displayName || username, email, password, role };
  if (clientScope) newUserPayload.client_id = clientScope;
  try {
    const resp = await authFetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUserPayload)
    });
    if (resp.ok) {
      toast('User created: ' + (displayName || username));
      ['newUserUsername','newUserName','newUserEmail','newUserPw'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      const scopeSel = document.getElementById('newUserClientScope'); if (scopeSel) scopeSel.value = '';
      loadUserManagement();
    } else {
      const err = await resp.json();
      toast(err.error || 'Failed to create user', 'error');
    }
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Delete a user account after confirmation (admin only) */
async function deleteUser(userId, name) {
  if (!(await themedConfirm(`Remove user "${name}"? This will delete their account and all sessions.`))) return;
  try {
    const resp = await authFetch('/api/users/' + userId, { method: 'DELETE' });
    if (resp.ok) { toast('User removed: ' + name); loadUserManagement(); }
    else { toast('Failed to remove user', 'error'); }
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Update a user's role (admin/member) via the API */
async function updateUserRole(userId, role) {
  try {
    await authFetch('/api/users/' + userId, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    toast('Role updated');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Update a user's client_id scope via the API (empty string clears the scope) */
async function updateUserClientScope(userId, clientId) {
  try {
    await authFetch('/api/users/' + userId, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId || null })
    });
    toast('Client scope updated');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Update a user field (display_name, email) via PATCH */
async function updateUserField(userId, field, value) {
  try {
    const resp = await authFetch('/api/users/' + userId, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    });
    if (resp.ok) toast(field === 'display_name' ? 'Name updated' : 'Email updated');
    else toast('Update failed', 'error');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

// ===== CLIENT TEAM MANAGEMENT =====

async function loadClientTeamList() {
  const container = document.getElementById('clientTeamList');
  if (!container) return;
  try {
    const res = await authFetch('/api/users');
    if (!res.ok) return;
    const users = await res.json();
    if (users.length === 0) { container.innerHTML = '<div style="color:var(--text-muted);font-size:0.82rem">No team members yet.</div>'; return; }
    container.innerHTML = users.map(u => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-subtle)">
        <span style="flex:1;font-size:0.85rem">${esc(u.display_name)}</span>
        <span style="font-size:0.75rem;color:var(--text-muted)">${esc(u.email || '')}</span>
        <span style="font-size:0.75rem;padding:2px 6px;border-radius:3px;background:${u.is_active ? 'var(--bg-surface)' : 'var(--status-overdue)'};color:${u.is_active ? 'var(--text-muted)' : '#fff'}">${u.is_active ? (u.client_role || 'member') : 'Inactive'}</span>
        ${u.id !== _currentUser.id ? `
          <button class="btn btn--sm" data-action="toggleClientUserActive" data-arg0="${u.id}" data-arg1="${u.is_active ? 'deactivate' : 'reactivate'}">${u.is_active ? 'Deactivate' : 'Reactivate'}</button>
          <button class="btn btn--sm" data-action="resetClientUserPassword" data-arg0="${u.id}">Reset PW</button>
        ` : ''}
      </div>`).join('');
  } catch (e) { container.innerHTML = '<div style="color:var(--status-overdue)">Failed to load team</div>'; }
}

async function inviteClientUser() {
  const display_name = document.getElementById('inviteDisplayName')?.value?.trim();
  const email = document.getElementById('inviteEmail')?.value?.trim();
  const client_role = document.getElementById('inviteRole')?.value;
  if (!display_name || !email) { toast('Name and email required', 'error'); return; }
  const username = email.split('@')[0].toLowerCase();
  try {
    const res = await authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, display_name, email, client_role }),
    });
    if (res.ok) {
      toast('User created. Invite email sent to ' + email);
      const dnEl = document.getElementById('inviteDisplayName'); if (dnEl) dnEl.value = '';
      const emEl = document.getElementById('inviteEmail'); if (emEl) emEl.value = '';
      loadClientTeamList();
    } else {
      const data = await res.json();
      toast(data.error || 'Failed to create user', 'error');
    }
  } catch (e) { toast('Network error', 'error'); }
}

async function toggleClientUserActive(userId, action) {
  if (action === 'deactivate' && !(await themedConfirm('Deactivate this user? They will be logged out immediately.'))) return;
  try {
    const res = await authFetch('/api/users/' + userId + '/' + action, { method: 'POST' });
    if (res.ok) { toast(action === 'reactivate' ? 'User reactivated' : 'User deactivated'); loadClientTeamList(); }
    else { const d = await res.json(); toast(d.error || 'Failed', 'error'); }
  } catch (e) { toast('Network error', 'error'); }
}

async function resetClientUserPassword(userId) {
  if (!(await themedConfirm("Reset this user's password? They will receive a new temporary password by email."))) return;
  try {
    const res = await authFetch('/api/users/' + userId + '/reset-password', { method: 'POST' });
    if (res.ok) { toast('Password reset. New temporary password sent by email.'); }
    else { const d = await res.json(); toast(d.error || 'Failed', 'error'); }
  } catch (e) { toast('Network error', 'error'); }
}

// ===== TIME TRACKING =====

/** Manually log a time entry from the detail panel's quick-log fields */
async function logTimeEntry(taskId) {
  const hoursInput = document.getElementById('logHours');
  const descInput = document.getElementById('logDesc');
  const hours = parseFloat(hoursInput?.value);
  if (!hours || hours <= 0) { toast('Enter hours > 0'); return; }
  try {
    await authFetch('/api/tasks/' + taskId + '/time-entries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours, description: descInput?.value || '' })
    });
    const task = tasks.find(t => t.id === taskId);
    if (task) { task.hoursSpent = (task.hoursSpent || 0) + hours; }
    toast(hours + 'h logged');
    if (hoursInput) hoursInput.value = '';
    if (descInput) descInput.value = '';
    loadTimeEntries(taskId);
  } catch(e) { toast('Failed to log time', 'error'); }
}

/** Fetch and render time entries for a task in the detail panel */
async function loadTimeEntries(taskId) {
  const el = document.getElementById('timeEntriesList');
  if (!el) return;
  try {
    const entries = await apiCall('/api/tasks/' + taskId + '/time-entries');
    if (!entries) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.7rem">Could not load</div>'; return; }
    if (entries.length === 0) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.7rem">No time logged yet</div>'; return; }
    el.innerHTML = entries.map(e => `<div style="display:flex;align-items:center;gap:6px;font-size:0.72rem;padding:3px 0;border-bottom:1px solid var(--border-subtle)"><span style="font-weight:600;font-family:var(--font-mono);color:var(--accent);min-width:40px">${(parseFloat(e.hours) || 0).toFixed(2)}h</span><span style="flex:1;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.description || '-')}</span><span style="color:var(--text-muted);font-size:0.6rem">${esc(e.user_name)} &middot; ${e.date}</span></div>`).join('');
  } catch(e) {}
}

// ===== NOTIFICATIONS =====
let _notifOpen = false;

/** Legacy stub — notification bell is removed; alerts live in the sidebar panel now. */
function toggleNotifications() { toggleWarnAlertSidebar(); }

/** Handle notification click — route to the right view based on the link content.
 *  Supports: expense-report deep links (#expenses/report/{uuid}), hash-based view routes
 *  (#bugs, #settings, #mytasks, etc.), and bare task IDs. */
function handleNotificationClick(link, notifId) {
  if (notifId) {
    authFetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [notifId] }) })
      .then(() => { window._lastNotificationCount = Math.max(0, (window._lastNotificationCount || 1) - 1); if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton(); })
      .catch(() => {});
  }
  if (!link) return;
  // Close the warn-alert sidebar
  const panel = document.getElementById('warnAlertPanel');
  if (panel && panel.classList.contains('open')) panel.classList.remove('open');
  // Expense report link: URL containing #expenses/report/{uuid}
  const reportMatch = link.match(/[#/]expenses\/report\/([a-f0-9-]+)/i);
  if (reportMatch) {
    switchView('expenses');
    let attempts = 0;
    const tryOpen = () => {
      if (document.querySelector('.expenses-reports-grid') || attempts > 15) {
        openReportDetail(reportMatch[1]);
      } else { attempts++; setTimeout(tryOpen, 200); }
    };
    tryOpen();
    return;
  }
  // Hash-route link, e.g. "/nbi_project_dashboard.html#bugs" or "#settings"
  const hashIdx = link.indexOf('#');
  if (hashIdx !== -1) {
    const hashPart = link.slice(hashIdx + 1);
    const knownViews = ['report','dashboard','tasks','people','leads','expenses','finances','bugs','settings','mytasks','changelog','hiring','data','timeTracking'];
    const firstSeg = hashPart.split('/')[0];
    if (firstSeg && knownViews.includes(LEGACY_ROUTES[firstSeg] || firstSeg)) {
      switchView(firstSeg);
      return;
    }
  }
  // Default: treat as task ID
  openDetailOverlay(link);
}

/** Fetch notifications from the API and update the sidebar alert count */
async function loadNotifications() {
  try {
    const result = await apiCall('/api/notifications');
    if (!result) return;
    const { unread } = result;
    window._lastNotificationCount = unread || 0;
    if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
  } catch(e) {}
}


/** Mark all notifications as read via the API and refresh the sidebar alert count */
async function markAllNotificationsRead() {
  try {
    await authFetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    window._lastNotificationCount = 0;
    if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
    renderWarnAlertContent();
  } catch(e) {}
}

/** Convert a date to a human-readable relative time string (e.g. "3h ago", "2d ago") */
function timeAgo(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

// Poll notifications every 30 seconds
var _notifPollInterval = setInterval(() => { if (_currentUser) loadNotifications(); }, 30000);

// Close panel when clicking outside (legacy — notification bell removed, kept as no-op guard)
document.addEventListener('click', e => { if (_notifOpen && !e.target.closest('#warnAlertPanel')) { _notifOpen = false; } });

// ===== TASK TEMPLATES =====
/** Fetch task templates from the API and render them in the settings view */
async function loadTemplates() {
  const el = document.getElementById('templatesList');
  if (!el) return;
  try {
    const templates = await apiCall('/api/templates');
    if (!templates) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem">Could not load templates</div>'; return; }
    if (templates.length === 0) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem">No templates saved yet</div>'; return; }
    el.innerHTML = templates.map(t => {
      const lastUsed = t.last_created_at ? new Date(t.last_created_at).toLocaleDateString('en-GB') : 'Never';
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-subtle)"><span style="flex:1;font-size:0.82rem;font-weight:500">${esc(t.name)}</span><span style="font-size:0.65rem;color:var(--text-muted)">Last used: ${lastUsed}</span><button class="btn btn--sm" data-action="instantiateTemplate" data-arg0="${t.id}" data-arg1="${esc(t.name)}">Create</button><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.8rem" data-action="deleteTemplate" data-arg0="${t.id}">&times;</button></div>`;
    }).join('');
  } catch(e) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem">Templates unavailable</div>'; }
}

/** Save a project (root task + descendants) as a reusable template */
async function saveAsTemplate() {
  const sel = document.getElementById('templateSourceTask');
  if (!sel || !sel.value) { toast('Select a root task first'); return; }
  const rootTask = tasks.find(t => t.id === sel.value);
  if (!rootTask) return;
  const name = await themedPrompt('Enter a name for this template:', rootTask.title + ' Template', 'Save Template');
  if (!name) return;

  /** Recursively build a template tree from a task and its descendants */
  function buildTree(task) {
    const children = getChildren(task.id);
    return {
      title: task.title, status: 'Not started', priority: task.priority || '', description: task.description || '',
      assignees: task.assignees || [], hoursEstimated: task.hoursEstimated || 0,
      children: children.map(c => buildTree(c))
    };
  }
  const template = buildTree(rootTask);
  try {
    const resp = await authFetch('/api/templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, template })
    });
    if (resp.ok) { toast('Template saved: ' + name); loadTemplates(); }
    else { toast('Failed to save template', 'error'); }
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Create a new project from a saved template -- generates new IDs and resets status */
async function instantiateTemplate(id, name) {
  if (!(await themedConfirm('Create new tasks from template "' + name + '"?'))) return;
  try {
    const resp = await authFetch('/api/templates/' + id + '/create', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (resp.ok) {
      const result = await resp.json();
      toast(result.created.length + ' tasks created from template');
      // Reload tasks from DB
      await load(); renderAll();
    } else { toast('Failed to create from template', 'error'); }
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Delete a task template after confirmation */
async function deleteTemplate(id) {
  if (!(await themedConfirm('Delete this template?'))) return;
  await authFetch('/api/templates/' + id, { method: 'DELETE' });
  toast('Template deleted');
  loadTemplates();
}

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

/** Clear all tasks after themed confirmation */
async function clearAllTasks() {
  if (!(await themedConfirm('Clear all tasks? This cannot be undone.', 'Clear All Tasks', 'Clear All'))) return;
  tasks.forEach(t => markDeleted(t.id));
  tasks = [];
  save();
  renderAll();
  toast('All tasks cleared');
}

/** Export all tasks as a CSV file download */
function exportCSV() {
  if (tasks.length === 0) { toast('No tasks to export', 'warning'); return; }
  const headers = ['Task', 'Parent Task', 'Status', 'Priority', 'Description', 'Assignee', 'Files', 'Health State', 'Client', 'Hours Estimated', 'Hours Spent', 'Due Date'];
  const rows = tasks.map(t => {
    const parent = t.parentId ? (tasks.find(p => p.id === t.parentId) || {}).title || '' : '';
    return [t.title, parent, t.status, t.priority || '', t.description || '', (t.assignees||[]).join(';'), '', t.healthState || '', getTaskClient(t), t.hoursEstimated || 0, t.hoursSpent || 0, t.dueDate || ''];
  });

  const csvQ = v => { const s = String(v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = [headers.map(csvQ).join(','), ...rows.map(r => r.map(csvQ).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `nbi_dashboard_export_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast('CSV exported');
}


// ----- MOBILE SIDEBAR -----

// ===== ACT WRAPPERS =====
function _actSetSettingsTab(id) { window._settingsTab = id; renderContent(); }

// --- Window registrations for event delegation ---
window.renderSettings = renderSettings;
window.loadChangelog = loadChangelog;
window.renderChangelogTable = renderChangelogTable;
window.openContractImport = openContractImport;
window.extractContractTasks = extractContractTasks;
window.createContractTasks = createContractTasks;
window.toggleAllContractTasks = toggleAllContractTasks;
window.openDownloadsImport = openDownloadsImport;
window.previewDownloadsFile = previewDownloadsFile;
window.executeDownloadsImport = executeDownloadsImport;
window.openImportModal = openImportModal;
window.closeImportModal = closeImportModal;
window.handleFile = handleFile;
window.confirmImport = confirmImport;
window.confirmPlannerImport = confirmPlannerImport;
window.exportCSV = exportCSV;
window.loadUserManagement = loadUserManagement;
window.createUser = createUser;
window.deleteUser = deleteUser;
window.adminResetPassword = adminResetPassword;
window.updateUserRole = updateUserRole;
window.updateUserField = updateUserField;
window.updateUserClientScope = updateUserClientScope;
window.inviteClientUser = inviteClientUser;
window.resetClientUserPassword = resetClientUserPassword;
window.toggleClientUserActive = toggleClientUserActive;
window.loadClientTeamList = loadClientTeamList;
window.loadTimeEntries = loadTimeEntries;
window.logTimeEntry = logTimeEntry;
window.loadNotifications = loadNotifications;
window.toggleNotifications = toggleNotifications;
window.handleNotificationClick = handleNotificationClick;
window.markAllNotificationsRead = markAllNotificationsRead;
window.sendSystemMessage = sendSystemMessage;
window.loadTemplates = loadTemplates;
window.saveAsTemplate = saveAsTemplate;
window.deleteTemplate = deleteTemplate;
window.instantiateTemplate = instantiateTemplate;
window.downloadBackup = downloadBackup;
window.restoreBackup = restoreBackup;
window.clearAllTasks = clearAllTasks;
window.changeOwnPassword = changeOwnPassword;
window.addClient = addClient;
window.removeClient = removeClient;
window.savePagePermissions = savePagePermissions;
window.uploadEntityFile = uploadEntityFile;
window.deleteEntityFile = deleteEntityFile;
window.downloadAttachment = downloadAttachment;
window.showAttachmentVerifyDialog = showAttachmentVerifyDialog;
window.confirmAttachmentMatch = confirmAttachmentMatch;
window.reassignAttachment = reassignAttachment;
window.submitAttachmentLink = submitAttachmentLink;
window.toggleAddLinkForm = toggleAddLinkForm;
window.generateClientReport = generateClientReport;
window.generateClientReportPDF = generateClientReportPDF;
window.timeAgo = timeAgo;
window._actSetSettingsTab = _actSetSettingsTab;

registerView('settings', renderSettings);
