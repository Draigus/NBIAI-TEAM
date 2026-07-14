// ----- AUTH -----
let _currentUser = null;
function isClientUser() { return !!(_currentUser && _currentUser.clientId); }
function isClientAdmin() { return _currentUser?.clientRole === 'admin'; }
const _clientAllowedViews = new Set(['dashboard', 'tasks', 'people', 'news', 'settings', 'mytasks', 'hiring', 'workload']);
function isClientAllowedView(view) { return !isClientUser() || _clientAllowedViews.has(view); }
let _cachedUsers = [];       // Cached full user records (id, username, display_name, role, is_active) for ID lookups
const _expandedStandupPeople = new Set(); // Track which person sections are expanded in standup
const _standupDoneExpanded = new Set(); // Per-person: track which standup Done sections are expanded (default collapsed)
const _expandedClientCards = new Set();  // Track which client summary cards are expanded in report view
let _portfolioSelectedClient = null;
let _portfolioSnapshots = null;
let _portfolioAttentionExpanded = false;
let _portfolioLeadCount = null;
let _milestonesCache = {}; // keyed by client_id -> array of milestones
let _milestonesLoaded = false;

async function loadMilestones(clientId) {
  try {
    const data = await apiCall(`/api/clients/${clientId}/milestones`);
    _milestonesCache[clientId] = data || [];
  } catch (e) {
    _milestonesCache[clientId] = [];
  }
  return _milestonesCache[clientId];
}

async function loadAllMilestones() {
  _milestonesLoaded = true;
  const clients = Object.values(_apiClientsCache || {}).filter(c => c.has_active_work);
  const promises = clients.map(c => loadMilestones(c.id));
  await Promise.all(promises);
}

async function saveMilestone(clientId, milestone) {
  const hdrs = { 'Content-Type': 'application/json' };
  if (milestone.id) {
    const result = await apiCall(`/api/milestones/${milestone.id}`, { method: 'PUT', headers: hdrs, body: JSON.stringify(milestone) });
    await loadMilestones(clientId);
    return result;
  } else {
    const result = await apiCall(`/api/clients/${clientId}/milestones`, { method: 'POST', headers: hdrs, body: JSON.stringify(milestone) });
    await loadMilestones(clientId);
    return result;
  }
}

async function deleteMilestone(clientId, milestoneId) {
  await authFetch(`/api/milestones/${milestoneId}`, { method: 'DELETE' });
  await loadMilestones(clientId);
}

function computeMilestoneStatus(ms, allTasks) {
  const linked = (ms.linked_item_ids || []).map(id => allTasks.find(t => t.id === id)).filter(Boolean);
  if (linked.length === 0) return { pct: 0, total: 0, done: 0, status: 'On Track' };
  const allItems = [];
  linked.forEach(item => {
    allItems.push(item);
    const desc = getDescendants(item.id);
    desc.forEach(d => allItems.push(d));
  });
  const seen = new Set();
  const unique = allItems.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
  const total = unique.length;
  const done = unique.filter(t => t.status === 'Done').length;
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  if (pct === 100) return { pct, total, done, status: 'Complete' };
  const now = new Date(); now.setHours(0,0,0,0);
  const target = safeParseDate(ms.target_date);
  if (target && target < now) return { pct, total, done, status: 'Overdue' };
  const hasRisk = unique.some(t => t.healthState === 'Red' || t.healthState === 'Blocked' || t.status === 'Blocked');
  const daysLeft = target ? Math.ceil((target - now) / 86400000) : 999;
  if (hasRisk || (daysLeft <= 14 && pct < 80)) return { pct, total, done, status: 'At Risk' };
  return { pct, total, done, status: 'On Track' };
}

async function loadDashboardSnapshots() {
  try {
    const resp = await authFetch('/api/dashboard/snapshots?days=56');
    if (resp.ok) {
      const data = await resp.json();
      _portfolioSnapshots = data.snapshots || [];
    } else {
      _portfolioSnapshots = [];
    }
  } catch (e) {
    _portfolioSnapshots = [];
  }
}

async function loadPortfolioLeadCount() {
  if (isClientUser()) { _portfolioLeadCount = 0; return; }
  try {
    const resp = await authFetch('/api/leads/pipeline/summary');
    if (resp.ok) {
      const data = await resp.json();
      _portfolioLeadCount = (data.stages || [])
        .filter(s => !s.is_closed)
        .reduce((sum, s) => sum + parseInt(s.count || 0), 0);
    } else {
      _portfolioLeadCount = 0;
    }
  } catch (e) {
    _portfolioLeadCount = 0;
  }
}

function selectPortfolioClient(clientName) {
  _portfolioSelectedClient = _portfolioSelectedClient === clientName ? null : clientName;
  renderContent();
}


let _scrollRestoreTarget = null; // Scroll position to restore after async standup render
let _lastLocalSyncTime = 0; // Timestamp of last local save — suppresses poll re-render for own changes
const _recentlyEditedIds = new Set(); // Task IDs edited locally in the last 15s — for self-echo detection


/** Fetch and cache the team member list for dropdowns */
async function loadTeamMembers() {
  try {
    const users = await apiCall('/api/users');
    if (users) {
      _cachedUsers = users.filter(u => u.is_active !== false);
      _cachedTeamMembers = _cachedUsers.map(u => u.display_name).sort();
    }
  } catch(e) {
    console.error('loadTeamMembers failed:', e);
    showToast('Could not load team members — assignee dropdowns may be empty', 'warning');
  }
}

/** Generate an assignee combobox with typeahead for the detail panel */
function assigneeSelectHtml(taskId, currentAssignees) {
  const selected = currentAssignees || [];
  const comboId = 'ac-' + taskId.replace(/[^a-z0-9]/gi, '').slice(0, 12);
  let html = '<div class="assignee-selector">';
  selected.forEach(name => {
    html += `<span class="filter-chip" style="font-size:0.75rem;margin:2px">${esc(name)} <button data-action="removeAssignee" data-arg0="${taskId}" data-arg1="${esc(name)}">&times;</button></span>`;
  });
  html += `<div class="combobox" id="${comboId}" data-task-id="${taskId}">`;
  html += `<input type="text" class="combobox__input" placeholder="+ Add assignee" autocomplete="off" role="combobox" aria-expanded="false" onfocus="_comboOpen(this)" oninput="_comboFilter(this)" onblur="_comboScheduleClose(this)" onkeydown="_comboKey(event,this)">`;
  html += `<div class="combobox__list" role="listbox"></div>`;
  html += `</div></div>`;
  return html;
}

function _comboOpen(input) {
  const combo = input.closest('.combobox');
  if (!combo) return;
  const taskId = combo.dataset.taskId;
  const task = tasks.find(t => t.id === taskId);
  const selected = task ? (task.assignees || []) : [];
  const available = (_cachedTeamMembers || []).filter(n => !selected.includes(n));
  const q = (input.value || '').toLowerCase();
  const filtered = q ? available.filter(n => n.toLowerCase().includes(q)) : available;
  const list = combo.querySelector('.combobox__list');
  if (!list) return;
  list.innerHTML = filtered.length
    ? filtered.map((name, i) =>
        `<div class="combobox__option${i === 0 ? ' combobox__option--active' : ''}" role="option" data-value="${esc(name)}" onmousedown="_comboSelect(this)" onmouseover="_comboHighlight(this)">${esc(name)}</div>`
      ).join('')
    : '<div class="combobox__empty">No matches</div>';
  list.classList.add('open');
  input.setAttribute('aria-expanded', 'true');
}

function _comboFilter(input) { _comboOpen(input); }

function _comboScheduleClose(input) {
  setTimeout(() => {
    const combo = input.closest('.combobox');
    if (!combo) return;
    const list = combo.querySelector('.combobox__list');
    if (list) list.classList.remove('open');
    input.setAttribute('aria-expanded', 'false');
  }, 180);
}

function _comboSelect(option) {
  const combo = option.closest('.combobox');
  if (!combo) return;
  const name = option.dataset.value;
  const taskId = combo.dataset.taskId;
  const input = combo.querySelector('.combobox__input');
  if (input) input.value = '';
  addAssignee(taskId, name);
}

function _comboHighlight(option) {
  const list = option.closest('.combobox__list');
  if (!list) return;
  list.querySelectorAll('.combobox__option--active').forEach(el => el.classList.remove('combobox__option--active'));
  option.classList.add('combobox__option--active');
}

function _comboKey(ev, input) {
  const combo = input.closest('.combobox');
  if (!combo) return;
  const list = combo.querySelector('.combobox__list');
  if (!list) return;
  const active = list.querySelector('.combobox__option--active');
  if (ev.key === 'ArrowDown') {
    ev.preventDefault();
    const opts = list.querySelectorAll('.combobox__option');
    if (!active && opts.length) { opts[0].classList.add('combobox__option--active'); return; }
    if (active) { const next = active.nextElementSibling; if (next && next.classList.contains('combobox__option')) { active.classList.remove('combobox__option--active'); next.classList.add('combobox__option--active'); next.scrollIntoView({ block: 'nearest' }); } }
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault();
    if (active) { const prev = active.previousElementSibling; if (prev && prev.classList.contains('combobox__option')) { active.classList.remove('combobox__option--active'); prev.classList.add('combobox__option--active'); prev.scrollIntoView({ block: 'nearest' }); } }
  } else if (ev.key === 'Enter') {
    ev.preventDefault();
    if (active) _comboSelect(active);
  } else if (ev.key === 'Escape') {
    input.blur();
  }
}

/** Add a team member to a task's assignee list */
function addAssignee(taskId, name) {
  if (!name) return;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const assignees = [...(task.assignees || [])];
  if (!assignees.includes(name)) assignees.push(name);
  updateTask(taskId, 'assignees', assignees);
}

/** Remove a team member from a task's assignee list */
function removeAssignee(taskId, name) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const assignees = (task.assignees || []).filter(a => a !== name);
  updateTask(taskId, 'assignees', assignees);
}

/** Wraps fetch() with auth token injection and automatic 401 → login screen redirect */
function authFetch(url, opts = {}) {
  opts.credentials = 'include';
  return fetch(url, opts).then(resp => {
    if (resp.status === 401) {
      _currentUser = null;
      showLoginScreen();
    } else if (resp.status === 403 && !isClientUser()) {
      const method = (opts.method || 'GET').toUpperCase();
      if (method !== 'GET') toast('You do not have permission for this action', 'error');
    }
    return resp;
  });
}

/** Fetch wrapper that handles v2 envelope: unwraps { data, error, meta } automatically.
 *  Sends X-API-Version: 2 header so the server wraps responses in { data, error, meta }.
 *  On success, returns the unwrapped data. On failure, shows a toast and returns null. */
async function apiCall(url, options = {}) {
  options.headers = { ...options.headers, 'X-API-Version': '2' };
  const resp = await authFetch(url, options);
  if (!resp.ok) {
    let errMsg = 'Request failed';
    try {
      const body = await resp.json();
      errMsg = body?.error?.message || body?.error || errMsg;
    } catch(e) {}
    if (resp.status === 403 && isClientUser()) return null;
    if (resp.status === 410) return null;
    toast(errMsg, 'error');
    return null;
  }
  const body = await resp.json();
  // v2 envelope: unwrap data
  if (body && body.hasOwnProperty('data') && body.hasOwnProperty('error')) {
    return body.data;
  }
  // v1 fallback
  return body;
}

/** Handle login form submission -- validates credentials and initialises the app on success */
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  const resetPrompt = document.getElementById('loginResetPrompt');
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  if (!username || !password) { errEl.textContent = 'Please enter username and password'; return; }

  btn.disabled = true;
  errEl.textContent = '';
  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      errEl.textContent = data.error || 'Login failed';
      if (data.showReset) {
        resetPrompt.style.display = 'block';
        document.getElementById('resetEmailMsg').style.display = 'none';
      }
      btn.disabled = false;
      return;
    }

    resetPrompt.style.display = 'none';
    _currentUser = data.user;
    const prevUser = localStorage.getItem('nbi_dashboard_user_id');
    if (prevUser && prevUser !== _currentUser.id) {
      localStorage.removeItem('nbi_dashboard_tasks');
      localStorage.removeItem('nbi_dashboard_settings');
      localStorage.removeItem('nbi_dashboard_briefs');
      tasks = []; clientBriefs = {};
    }
    localStorage.setItem('nbi_dashboard_user_id', _currentUser.id);
    if (checkForcePasswordChange()) { btn.disabled = false; return; }
    showApp();
    await openIDB();
    await Promise.all([load(), loadTeamMembers(), loadPagePermissions(), loadBugReports(), loadCandidates(), apiCall('/api/clients').then(data => { if (data) data.forEach(c => { _apiClientsCache[c.name] = c; }); }).catch(() => {})]);
    if (!isClientUser() && !window._hiringFilterClient) {
      const nbiClient = Object.values(_apiClientsCache || {}).find(c => c.name === 'NBI Operations' || c.name === 'NBI OPS');
      if (nbiClient) window._hiringFilterClient = nbiClient.id;
    }
    if (!isClientUser()) await loadFinanceFromDB();
    if (isClientUser()) {
      const myClient = Object.values(_apiClientsCache).find(c => c.id === _currentUser.clientId);
      if (myClient) currentFilter.client = myClient.name;
      if (!isClientAllowedView(currentView)) currentView = 'dashboard';
    }
    renderAll();
    restartPollingIntervals();
    checkExpenseReportDeepLink();
    checkInterviewDeepLink();
    if (window._pendingDeepLink) {
      var link = window._pendingDeepLink;
      window._pendingDeepLink = null;
      _resolveDeepLink(link);
    }
  } catch (err) {
    errEl.textContent = 'Connection error. Is the server running?';
  }
  btn.disabled = false;
}

/** Check URL hash for expense report deep-links (e.g. #expenses/report/{uuid}) */
function checkExpenseReportDeepLink() {
  const hash = window.location.hash;
  const m = hash.match(/#expenses\/report\/([a-f0-9-]+)/i);
  if (m) {
    switchView('expenses');
    // Retry until the expense DOM is ready (max 3 seconds)
    let attempts = 0;
    const tryOpen = () => {
      if (document.querySelector('.expenses-reports-grid') || attempts > 15) {
        openReportDetail(m[1]);
      } else {
        attempts++;
        setTimeout(tryOpen, 200);
      }
    };
    tryOpen();
  }
}

function checkInterviewDeepLink() {
  const hash = window.location.hash;
  const m = hash.match(/#interview\/([a-f0-9-]+)/i);
  var sessionId = m ? m[1] : (window._pendingInterviewSessionId || null);
  if (sessionId) {
    window._pendingInterviewSessionId = null;
    setTimeout(() => openInterviewScorecard(sessionId), 300);
    if (m) window.location.hash = '';
  }
}

/** Log out the current user, clear all polling intervals, and return to the login screen */
async function handleLogout() {
  try { await authFetch('/api/auth/logout', { method: 'POST' }); } catch(e) {}
  // Clear all polling intervals to stop background API calls
  clearInterval(_syncPollInterval);
  clearInterval(_leadsReminderInterval);
  clearInterval(_notifPollInterval);
  cleanupListeners();
  _currentUser = null;
  showLoginScreen();
}

/** Reset UI to the login screen -- hides app container and clears form fields */
function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('resetPasswordScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginResetPrompt').style.display = 'none';
  document.getElementById('loginUser').focus();
}

/** Show the main app container and display the current user's name badge */
function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('resetPasswordScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = '';
  if (_currentUser) {
    document.getElementById('userBadge').textContent = _currentUser.displayName;
    if (isClientUser()) {
      const co = Object.values(_apiClientsCache).find(c => c.id === _currentUser.clientId);
      const subtitleEl = document.querySelector('.g-header__subtitle');
      if (co && subtitleEl) subtitleEl.textContent = co.name;
    }
  }
}

function checkForcePasswordChange() {
  if (_currentUser?.mustChangePassword) {
    document.getElementById('forcePasswordChangeModal').style.display = 'flex';
    document.getElementById('fpwSubmit').onclick = async () => {
      const current = document.getElementById('fpwCurrent').value;
      const newPw = document.getElementById('fpwNew').value;
      const confirm = document.getElementById('fpwConfirm').value;
      const errorEl = document.getElementById('fpwError');
      if (!current || !newPw || !confirm) { errorEl.textContent = 'All fields required'; errorEl.style.display = 'block'; return; }
      if (newPw.length < 6) { errorEl.textContent = 'Password must be at least 6 characters'; errorEl.style.display = 'block'; return; }
      if (newPw !== confirm) { errorEl.textContent = 'Passwords do not match'; errorEl.style.display = 'block'; return; }
      try {
        const res = await authFetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
        });
        if (res.ok) {
          _currentUser.mustChangePassword = false;
          document.getElementById('forcePasswordChangeModal').style.display = 'none';
          window.location.reload();
        } else {
          const data = await res.json();
          errorEl.textContent = data.error || 'Password change failed';
          errorEl.style.display = 'block';
        }
      } catch (e) {
        errorEl.textContent = 'Network error';
        errorEl.style.display = 'block';
      }
    };
    return true;
  }
  return false;
}

/** Request a password reset email for the username entered on the login form */
async function sendPasswordResetEmail() {
  const username = document.getElementById('loginUser').value.trim();
  const btn = document.getElementById('resetEmailBtn');
  const msgEl = document.getElementById('resetEmailMsg');
  if (!username) { msgEl.style.display = 'block'; msgEl.style.color = 'var(--danger)'; msgEl.textContent = 'Enter your username or email above first.'; return; }
  btn.disabled = true;
  msgEl.style.display = 'none';
  try {
    const resp = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await resp.json();
    msgEl.style.display = 'block';
    msgEl.style.color = 'var(--success)';
    msgEl.textContent = data.message || 'If an account exists, a reset email has been sent.';
  } catch (err) {
    msgEl.style.display = 'block';
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = 'Connection error. Is the server running?';
  }
  btn.disabled = false;
}

/** Submit a new password using the reset token from the URL hash */
async function submitPasswordReset(e) {
  e.preventDefault();
  const btn = document.getElementById('resetBtn');
  const errEl = document.getElementById('resetError');
  const newPass = document.getElementById('resetNewPass').value;
  const confirmPass = document.getElementById('resetConfirmPass').value;
  if (!newPass || newPass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  if (newPass !== confirmPass) { errEl.textContent = 'Passwords do not match.'; return; }

  const token = window.location.hash.replace('#reset-password/', '');
  btn.disabled = true;
  errEl.textContent = '';
  try {
    const resp = await fetch('/api/auth/reset-token/' + encodeURIComponent(token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: newPass }),
    });
    const data = await resp.json();
    if (!resp.ok) { errEl.textContent = data.error || 'Reset failed.'; btn.disabled = false; return; }
    window.location.hash = '';
    showLoginScreen();
    document.getElementById('loginError').textContent = '';
    document.getElementById('loginResetPrompt').style.display = 'none';
    const successEl = document.getElementById('loginError');
    successEl.textContent = 'Password reset successfully. Please sign in.';
    successEl.style.color = '#16a34a';
    setTimeout(() => { successEl.style.color = ''; }, 5000);
  } catch (err) {
    errEl.textContent = 'Connection error.';
  }
  btn.disabled = false;
}

/** Show the password reset form and validate the reset token against the API */
function showResetPasswordScreen(token) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('resetPasswordScreen').style.display = 'flex';
  document.getElementById('resetError').textContent = '';
  document.getElementById('resetNewPass').value = '';
  document.getElementById('resetConfirmPass').value = '';
  // Validate token and show greeting
  fetch('/api/auth/reset-token/' + encodeURIComponent(token))
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        document.getElementById('resetError').textContent = data.error;
        document.getElementById('resetForm').style.display = 'none';
      } else {
        document.getElementById('resetUserGreeting').textContent = 'Hello, ' + data.displayName;
      }
    })
    .catch(() => {
      document.getElementById('resetError').textContent = 'Could not validate reset link.';
    });
}

/** Check whether the URL hash contains a password reset token; if so, show the reset screen */
function checkHashForReset() {
  const hash = window.location.hash;
  if (hash.startsWith('#reset-password/')) {
    const token = hash.replace('#reset-password/', '');
    if (token) { showResetPasswordScreen(token); return true; }
  }
  return false;
}
