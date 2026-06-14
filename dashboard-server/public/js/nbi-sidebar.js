// ==================== MOBILE SIDEBAR KEYBOARD HANDLING ====================

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const sidebar = document.getElementById('sidebarEl');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      toggleMobileSidebar();
    }
  }
});

// ==================== SIDEBAR NAVIGATION ====================

/** Build and render the sidebar: views list, client filters, health filters, quick filters */
/** Return the opening markup for a collapsible sidebar section.
 *  Collapsed state is persisted in localStorage under 'sidebarSection:<key>'. */
function sidebarSectionOpen(key, title) {
  const collapsed = localStorage.getItem('sidebarSection:' + key) === '1';
  const keyAttr = esc(key);
  return `<div class="sidebar__section" data-collapsed="${collapsed}" data-section="${keyAttr}">
    <button type="button" class="sidebar__title" aria-expanded="${!collapsed}" data-action="toggleSidebarSection" data-arg0="${keyAttr}">${esc(title)}</button>
    <div class="sidebar__section__body">`;
}
function sidebarSectionClose() { return `</div></div>`; }

/** Toggle a sidebar section's collapsed state and persist it. */
function toggleSidebarSection(key) {
  const current = localStorage.getItem('sidebarSection:' + key) === '1';
  localStorage.setItem('sidebarSection:' + key, current ? '0' : '1');
  const section = document.querySelector(`.sidebar__section[data-section="${CSS.escape(key)}"]`);
  if (section) {
    section.setAttribute('data-collapsed', String(!current));
    const title = section.querySelector('.sidebar__title');
    if (title) title.setAttribute('aria-expanded', String(current));
  }
}

function renderSidebar() {
  const roots = getRootTasks();
  // Sidebar counts must respect the active practice filter so that picking
  // Org Performance actually narrows the visible client list, health counts,
  // and critical count — not just the main content area (Glen 2026-04-16).
  const practiceTasks = currentFilter.practice
    ? tasks.filter(t => getTaskPractice(t) === currentFilter.practice)
    : tasks;
  const clients = currentFilter.practice
    ? [...new Set(practiceTasks.map(t => getTaskClient(t)).filter(Boolean))].sort()
    : getAllClients();
  const scopedForHealth = currentFilter.client
    ? practiceTasks.filter(t => getTaskClient(t) === currentFilter.client)
    : practiceTasks;
  const healthCounts = countByHealth(scopedForHealth);

  let html = '';
  // Scoped users (client portal accounts) only see a restricted set of views
  const isScoped = !!(_currentUser && _currentUser.clientId);
  // Views
  const svgDashboard = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="3" rx="1"/><rect x="9" y="6" width="6" height="9" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/></svg>';
  const svgTasks = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12M2 8h12M2 12h8"/><circle cx="13" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>';
  const svgReport = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="1" width="12" height="14" rx="1.5"/><path d="M5 5h6M5 8h6M5 11h3"/></svg>';
  const svgPeople = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="5" r="2.5"/><path d="M1 14c0-3 2.5-5 5-5s5 2 5 5"/><circle cx="11.5" cy="4.5" r="2"/><path d="M15 13c0-2.5-1.8-4-3.5-4"/></svg>';
  const svgIncomplete = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1L1 14h14L8 1z"/><path d="M8 6v4M8 12v0.5" stroke-linecap="round"/></svg>';
  const svgFinances = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1v14M5 4c0-1 1.5-2 3-2s3 1 3 2-1.5 2-3 2-3 1-3 2 1.5 2 3 2 3-1 3-2"/></svg>';
  const svgSettings = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4"/></svg>';
  const svgCommandCentre = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="14" height="14" rx="2"/><circle cx="8" cy="6" r="2.5"/><path d="M4 13v-1a4 4 0 0 1 8 0v1"/></svg>';

  html += sidebarSectionOpen('views', 'Views');
  html += sidebarItem(svgDashboard, 'Portfolio', '', () => switchView('dashboard'), currentView==='dashboard');
  if (!isScoped && hasPageAccess('commandcentre')) {
    html += sidebarItem(svgCommandCentre, 'Command Centre', '', () => switchView('commandcentre'), currentView==='commandcentre');
  }
  // html += sidebarItem(svgReport, 'Report', '', () => switchView('report'), currentView==='report'); // COMMENTED OUT — old report view, kept for revert
  html += sidebarItem(svgTasks, 'Projects', scopedForHealth.length, () => { currentFilter.priority = []; switchView('tasks'); }, currentView==='tasks');
  html += sidebarItem(svgReport, 'Reporting', '', () => switchView('reporting'), currentView==='reporting');
  const svgDocs = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 1h6l4 4v10H4z"/><path d="M10 1v4h4"/><path d="M6 8h6M6 11h4"/></svg>';
  if (!isScoped) {
    html += sidebarItem(svgDocs, 'Documentation', '', () => switchView('documentation'), currentView==='documentation');
  }
  html += sidebarItem(svgPeople, 'People', '', () => switchView('people'), currentView==='people');
  const svgLeads = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 2h12v3H2zM4 5h8v3H4zM6 8h4v3H6zM7 11h2v3H7z"/></svg>';
  if (!isScoped && hasPageAccess('leads')) {
    html += sidebarItem(svgLeads, 'Leads', '', () => switchView('leads'), currentView==='leads');
  }
  const svgHiring = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="5" r="2.5"/><path d="M1 14c0-3 2.5-5 5-5 1.3 0 2.5.4 3.4 1.1"/><circle cx="12" cy="11" r="3"/><path d="M12 9.5v3M10.5 11h3"/></svg>';
  {
    let hiringList = (_candidatesData || []).filter(c => !c.archived_at);
    if (!isScoped && window._hiringFilterClient) {
      hiringList = hiringList.filter(c => c.client_id === window._hiringFilterClient);
    }
    html += sidebarItem(svgHiring, 'Hiring', hiringList.length || '', () => switchView('hiring'), currentView==='hiring');
    const onboardingCount = hiringList.filter(c => c.stage === 'onboarding').length;
    if (onboardingCount > 0) {
      html += sidebarItem('<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="5" r="3"/><path d="M3 14c0-3 2-5 5-5s5 2 5 5"/><path d="M11 3l2 2-2 2"/></svg>', 'Onboarding', onboardingCount, () => { window._hiringFilterStage = 'onboarding'; switchView('hiring'); }, currentView==='hiring' && window._hiringFilterStage === 'onboarding');
    }
  }
  if (!isScoped && hasPageAccess('finances')) {
    html += sidebarItem(svgFinances, 'Finances', '', () => switchView('finances'), currentView==='finances');
  }
  const svgExpenses = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/><path d="M2 6h12M5 9h3M5 11h2"/></svg>';
  if (!isScoped && hasPageAccess('expenses')) {
    html += sidebarItem(svgExpenses, 'Expenses', '', () => switchView('expenses'), currentView==='expenses');
  }
  const svgBugs = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="9" r="4"/><path d="M6 5.5C6 4.1 6.9 3 8 3s2 1.1 2 2.5M1 7h3M12 7h3M2 12l2.5-1.5M14 12l-2.5-1.5M4 5L2 3.5M12 5l2-1.5"/></svg>';
  if (!isScoped) {
    const bugOpenCount = ((_bugReportsData && _bugReportsData.reports) || []).filter(r => r.status === 'open' || r.status === 'in_progress').length;
    html += sidebarItem(svgBugs, 'Bug Tracker', bugOpenCount || '', () => switchView('bugs'), currentView==='bugs');
  }
  html += sidebarSectionClose();

  // My Work + secondary views
  const myName = _currentUser?.displayName || '';
  if (myName) {
    const myActiveTasks = practiceTasks.filter(t => t.assignees?.some(a => a === myName) && t.status !== 'Done' && t.status !== 'Cancelled');
    const svgMyTasks = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="5" r="3"/><path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>';
    html += sidebarSectionOpen('mywork', 'My Work');
    html += sidebarItem(svgMyTasks, 'My Work', myActiveTasks.length, () => switchView('mytasks'), currentView === 'mytasks');
    if (!isScoped) {
      const queueCount = (_queueData || []).length;
      const svgQueue = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12M2 8h12M2 12h12"/><circle cx="14" cy="4" r="1.5" fill="currentColor" stroke="none"/></svg>';
      html += sidebarItem(svgQueue, 'Queue', queueCount || '', () => switchView('queue'), currentView==='queue');
      const svgActivity = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1v14M1 8h3l2-4 4 8 2-4h3"/></svg>';
      html += sidebarItem(svgActivity, 'Activity', '', () => switchView('activity'), currentView==='activity');
    }
    html += sidebarItem(svgSettings, 'Settings', '', () => switchView('settings'), currentView==='settings');
    html += sidebarSectionClose();
  }

  // Clients
  html += sidebarSectionOpen('clients', 'Clients');
  const _noClientFilterViews = ['bugs', 'leads', 'documentation', 'hiring', 'news', 'queue', 'settings', 'expenses', 'finances'];
  const _clientFilterRelevant = !_noClientFilterViews.includes(currentView);
  if (!isScoped) {
    // Internal users see NBI Portfolio (all clients) option
    const portfolioActive = !currentFilter.client || !_clientFilterRelevant;
    html += `<button class="sidebar__item ${portfolioActive?'active':''}"${portfolioActive?' aria-current="page"':''} aria-label="NBI Portfolio, ${practiceTasks.length} items" data-action="filterByClient" data-arg0="null"><span class="sidebar__dot" aria-hidden="true" style="background:var(--accent)"></span><span class="sidebar__item__abbrev" aria-hidden="true">NBI</span><span class="sidebar__item__label" style="font-weight:600">NBI Portfolio</span><span class="sidebar__item__count" aria-hidden="true">${practiceTasks.length}</span></button>`;
  }
  const sidebarClients = isScoped
    ? clients.filter(c => { const co = Object.values(_apiClientsCache).find(x => x.name === c); return co && co.id === _currentUser.clientId; })
    : clients;
  sidebarClients.forEach(c => {
    const count = practiceTasks.filter(t => getTaskClient(t) === c).length;
    const dotColour = stringToColour(c);
    const isActive = _clientFilterRelevant && currentFilter.client===c;
    const abbrev = clientPrefix(c);
    html += `<button class="sidebar__item ${isActive?'active':''}"${isActive?' aria-current="page"':''} aria-label="${esc(c)}, ${count} items" title="${esc(c)}" data-action="filterByClient" data-arg0="${esc(c)}"><span class="sidebar__dot" aria-hidden="true" style="background:${dotColour}"></span><span class="sidebar__item__abbrev" aria-hidden="true">${esc(abbrev)}</span><span class="sidebar__item__label">${esc(c)}</span><span class="sidebar__item__count" aria-hidden="true">${count}</span></button>`;
  });
  html += sidebarSectionClose();

  // Practices section — internal users only (scoped users are already locked to one client)
  if (!isScoped) {
    // Practices (Phase 9, a6c82c8c). Counts span tasks + leads so users
    // see at a glance how much volume sits in each practice. The "All"
    // entry clears the filter rather than passing a value.
    html += sidebarSectionOpen('practices', 'Practices');
    const _leadList = (typeof _leadsData !== 'undefined' && _leadsData && _leadsData.leads) ? _leadsData.leads : [];
    const allPracticeCount = tasks.length + _leadList.length;
    const practiceAllActive = !currentFilter.practice;
    html += `<button class="sidebar__item ${practiceAllActive?'active':''}"${practiceAllActive?' aria-current="page"':''} aria-label="All practices, ${allPracticeCount} items" data-action="filterByPractice" data-arg0="null"><span class="sidebar__dot" aria-hidden="true" style="background:var(--accent)"></span><span class="sidebar__item__abbrev" aria-hidden="true">ALL</span><span class="sidebar__item__label" style="font-weight:600">All</span><span class="sidebar__item__count" aria-hidden="true">${allPracticeCount}</span></button>`;
    PRACTICES.forEach(p => {
      const tCount = tasks.filter(t => getTaskPractice(t) === p.value).length;
      const lCount = _leadList.filter(l => l.practice_area === p.value).length;
      const total = tCount + lCount;
      const isActive = currentFilter.practice===p.value;
      const abbrev = p.abbrev || p.label.slice(0, 2).toUpperCase();
      html += `<button class="sidebar__item ${isActive?'active':''}"${isActive?' aria-current="page"':''} aria-label="${esc(p.label)}, ${total} items" data-action="filterByPractice" data-arg0="${esc(p.value)}"><span class="sidebar__dot" aria-hidden="true" style="background:${p.colour}"></span><span class="sidebar__item__abbrev" aria-hidden="true">${esc(abbrev)}</span><span class="sidebar__item__label">${esc(p.label)}</span><span class="sidebar__item__count" aria-hidden="true">${total}</span></button>`;
    });
    html += sidebarSectionClose();
  }

  // Health
  html += sidebarSectionOpen('health', 'Health');
  HEALTH_STATES.forEach(h => {
    if (healthCounts[h] > 0) {
      const col = HEALTH_COLOURS_HEX[h] || '#666';
      const isActive = !!(currentFilter.health && currentFilter.health.includes(h));
      html += `<button class="sidebar__item ${isActive?'active':''}"${isActive?' aria-current="page"':''} aria-label="${esc(h)}, ${healthCounts[h]} items" data-action="filterByHealth" data-arg0="${esc(h)}"><span class="sidebar__dot" aria-hidden="true" style="background:${col}"></span><span class="sidebar__item__label">${esc(h)}</span><span class="sidebar__item__count" aria-hidden="true">${healthCounts[h]}</span></button>`;
    }
  });
  html += sidebarSectionClose();

  // Quick Filters
  html += sidebarSectionOpen('quickfilters', 'Quick Filters');
  const critPriorities = ['Urgent', 'High'];
  const critCount = practiceTasks.filter(t => critPriorities.includes(t.priority)).length;
  html += sidebarItem('&#9888;', 'Urgent / High', critCount, () => { filterByPriority(['Urgent', 'High']); }, false);
  html += sidebarSectionClose();

  document.getElementById('sidebarNav').innerHTML = html;
}

/** Generate HTML for a single sidebar navigation item with icon, label, and optional count badge.
 *  Active item gets aria-current="page" (a11y H5). Count badge gets an aria-label prefix so
 *  screen readers announce "Projects, 1123 items" instead of "Projects1123" (a11y H6). */
function sidebarItem(icon, label, count, onclick, active) {
  const id = 'si_' + label.replace(/\s/g,'');
  const ariaCurrent = active ? ' aria-current="page"' : '';
  const ariaLabel = count !== '' ? ` aria-label="${esc(label)}, ${esc(String(count))} items"` : ` aria-label="${esc(label)}"`;
  const countHtml = count !== '' ? `<span class="sidebar__item__count" aria-hidden="true">${count}</span>` : '';
  return `<button class="sidebar__item ${active?'active':''}" id="${id}"${ariaCurrent}${ariaLabel} title="${esc(label)}" onclick="(${onclick.toString()})()"><span class="sidebar__item__icon" aria-hidden="true">${icon}</span><span class="sidebar__item__label">${label}</span>${countHtml}</button>`;
}

/** Deterministically convert a string to an HSL colour -- used for client dot colours */
function stringToColour(str) {
  let hash = 0; for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hash % 360}, 60%, 55%)`;
}

/** HTML-escape a string to prevent XSS — used on ALL user-supplied content before insertion into innerHTML and data-* attributes.
 *  For href/src attributes with user-controlled URLs use safeUrl() — esc() alone does not block `javascript:` or `data:` schemes. */
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

/**
 * Sanitise a user-supplied URL for safe injection into an href/src attribute.
 * Allows only http, https, mailto, tel, and protocol-relative (//host/...) schemes.
 * Anything else (including javascript:, data:, file:, vbscript:) is replaced with '#'.
 * The returned value is also HTML-escaped so it is safe to interpolate between
 * double quotes in an attribute. Use this instead of esc() whenever the string
 * is going into an href or src.
 */
function safeUrl(s) {
  if (s == null) return '#';
  const trimmed = String(s).trim();
  if (trimmed === '') return '#';
  // Allow relative paths (starts with / but not //) and fragment-only links.
  if (trimmed.startsWith('#')) return esc(trimmed);
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return esc(trimmed);
  // Allow protocol-relative //host/... (will inherit the page's https scheme).
  if (trimmed.startsWith('//')) return esc(trimmed);
  // Allow only the four known-safe schemes. Match is case-insensitive and
  // tolerates leading control chars the way the HTML parser would.
  const SAFE_SCHEME = /^(?:[\x00-\x20]*)(https?|mailto|tel):/i;
  if (SAFE_SCHEME.test(trimmed)) return esc(trimmed);
  return '#';
}

/** Escape for JS string literals inside onchange/oninput HTML attributes. For data-* attributes, use esc() instead. */
function escAttrJs(s) {
  if (!s) return '';
  s = String(s);
  // JS string literal escaping
  s = s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  // HTML attribute escaping
  s = s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return s;
}

// ==================== CONTACT NOTES ====================

/** Retrieve saved contact notes from localStorage for a specific client + contact index */
function getContactNotes(client, idx) {
  try { const d = JSON.parse(localStorage.getItem('nbi_contact_notes') || '{}'); return (d[client] && d[client][idx]) || ''; } catch(e) { return ''; }
}
/** Persist contact notes to localStorage, keyed by client name and contact index */
function saveContactNotes(client, idx, val) {
  try { const d = JSON.parse(localStorage.getItem('nbi_contact_notes') || '{}'); if (!d[client]) d[client] = {}; d[client][idx] = val; localStorage.setItem('nbi_contact_notes', JSON.stringify(d)); } catch(e) {}
}
/** Fetch meeting notes for a client from the API and render them into the profile panel */
async function loadClientNotes(clientName) {
  const elId = 'clientNotes_' + clientName.replace(/[^a-zA-Z0-9]/g, '_');
  const el = document.getElementById(elId);
  if (!el) return;
  try {
    // Get client ID from API
    const clients = await apiCall('/api/clients');
    if (!clients) throw new Error('API error');
    const client = clients.find(c => c.name === clientName);
    if (!client) { el.innerHTML = ''; return; }

    const notes = await apiCall(`/api/clients/${client.id}/notes`);
    if (!notes) throw new Error('API error');

    if (notes.length === 0) {
      el.innerHTML = `<span style="color:var(--text-muted);font-family:var(--font-display);font-size:0.75rem;letter-spacing:1px;text-transform:uppercase">Meeting Notes</span><div style="margin-top:8px;color:var(--text-muted);font-size:0.8rem">No notes yet</div>`;
      return;
    }

    let html = `<span style="color:var(--text-muted);font-family:var(--font-display);font-size:0.75rem;letter-spacing:1px;text-transform:uppercase">Meeting Notes (${notes.length})</span>`;
    html += `<div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">`;
    notes.forEach((n, i) => {
      const nid = `note_${client.id.slice(0,8)}_${i}`;
      const date = n.meeting_date ? new Date(n.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      const srcBadge = '';
      html += `<div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md);overflow:hidden">`;
      html += `<div class="hover-item" data-action="toggleNoteDetail" data-arg0="${nid}" style="padding:8px 12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center">`;
      html += `<div><strong style="color:var(--text-primary);font-size:0.82rem">${esc(n.title)}</strong>${srcBadge}</div>`;
      html += `<div style="display:flex;align-items:center;gap:8px"><span style="color:var(--text-muted);font-size:0.75rem">${date}</span><span style="color:var(--text-muted);font-size:0.75rem;transition:transform 0.15s" id="${nid}_arrow">&#9654;</span></div>`;
      html += `</div>`;
      html += `<div id="${nid}" style="display:none;padding:0 12px 12px;border-top:1px solid var(--border-subtle)">`;
      html += `<pre style="white-space:pre-wrap;font-family:var(--font-body);font-size:0.78rem;color:var(--text-secondary);margin:8px 0 0;line-height:1.6">${esc(n.content)}</pre>`;
      if (n.source_url) html += `<a href="${safeUrl(n.source_url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;color:var(--accent);font-size:0.75rem;text-decoration:none">&#8599; Open source</a>`;
      html += `</div></div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<span style="color:var(--text-muted);font-family:var(--font-display);font-size:0.75rem;letter-spacing:1px;text-transform:uppercase">Meeting Notes</span><div style="margin-top:8px;color:var(--text-muted);font-size:0.8rem">Notes unavailable (API offline)</div>`;
  }
}

/** Toggle visibility of an expandable meeting note detail section */
function toggleNoteDetail(nid) {
  const el = document.getElementById(nid);
  const arrow = document.getElementById(nid + '_arrow');
  if (!el) return;
  const show = el.style.display === 'none';
  el.style.display = show ? 'block' : 'none';
  if (arrow) arrow.style.transform = show ? 'rotate(90deg)' : 'rotate(0deg)';
}

/** Toggle visibility of a contact's detail section (ignores clicks on textareas/links) */
function toggleContactDetail(cid, ev) {
  if (ev && (ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'A')) return;
  const el = document.getElementById(cid);
  const arrow = document.getElementById(cid + '_arrow');
  if (!el) return;
  const show = el.style.display === 'none';
  el.style.display = show ? 'block' : 'none';
  if (arrow) arrow.style.transform = show ? 'rotate(90deg)' : 'rotate(0deg)';
}

// ==================== CLIENT PROFILE HEADER ====================

let _profileExpanded = {};
let _clientHeaderOpen = {};
/** Toggle the expandable client profile section (studio info, contacts, meeting notes) */
function _actToggleClientHeader(clientKey) {
  _clientHeaderOpen[clientKey] = !_clientHeaderOpen[clientKey];
  renderContent();
}

function toggleClientProfile(clientKey) {
  _profileExpanded[clientKey] = !_profileExpanded[clientKey];
  const el = document.getElementById('clientProfile_' + clientKey);
  const arrow = document.getElementById('clientProfileArrow_' + clientKey);
  const btn = document.getElementById('clientProfileBtn_' + clientKey);
  if (!el) return;
  const show = _profileExpanded[clientKey];
  el.style.display = show ? 'block' : 'none';
  if (arrow) arrow.style.transform = show ? 'rotate(90deg)' : 'rotate(0deg)';
  if (btn) btn.textContent = show ? 'Hide Profile' : 'Studio Profile';
  // Load notes when expanding
  if (show && currentFilter.client) {
    setTimeout(() => loadClientNotes(currentFilter.client), 50);
  }
}

/** Render the client profile banner with stats, contacts grid, and meeting notes (when a client filter is active) */
function renderClientProfileHeader() {
  if (!currentFilter.client) return '';
  const ct = currentFilter.client;
  const clientKey = ct.replace(/[^a-zA-Z0-9]/g, '_');
  const clientTasks = tasks.filter(t => getTaskClient(t) === ct);
  const hrs = clientTasks.reduce((s,t) => s + (t.hoursSpent||0), 0);
  const est = clientTasks.reduce((s,t) => s + (t.hoursEstimated||0), 0);
  const cost = hrs * settings.hourlyRate;
  const brief = clientBriefs[ct];
  const isExpanded = !!_profileExpanded[clientKey];
  const isHeaderOpen = !!_clientHeaderOpen[clientKey];

  let html = `<div class="client-header" style="flex-direction:column;align-items:stretch;${isHeaderOpen ? '' : 'padding:10px var(--space-xl)'}">`;
  // Collapsed bar: name + compact stats + toggle
  html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer" data-action="_actToggleClientHeader" data-arg0="${clientKey}">`;
  html += `<div style="display:flex;align-items:center;gap:12px">`;
  html += `<div class="client-header__name">${esc(brief ? brief.name : ct)}</div>`;
  if (!isHeaderOpen && !isClientUser()) {
    html += `<span style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono)">${clientTasks.length} items &middot; ${hrs.toFixed(1)}h spent &middot; ${est.toFixed(1)}h est.</span>`;
  }
  html += `</div>`;
  html += `<button class="btn btn--sm btn--ghost" style="font-size:0.75rem;color:var(--text-muted);padding:2px 8px">${isHeaderOpen ? '&#9650;' : '&#9660;'}</button>`;
  html += `</div>`;

  if (isHeaderOpen) {
  // Extended header: links, full stats, profile, milestones
  html += `<div style="margin-top:12px">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">`;
  html += `<div style="display:flex;align-items:center;gap:12px">`;
  if (brief && brief.website) html += `<a href="${safeUrl(brief.website)}" target="_blank" rel="noopener noreferrer" style="font-size:0.75rem;color:var(--accent);text-decoration:none">&#8599; website</a>`;
  if (brief && brief.linkedinCompany) html += `<a href="${safeUrl(brief.linkedinCompany)}" target="_blank" rel="noopener noreferrer" style="font-size:0.75rem;color:var(--accent);text-decoration:none">&#8599; LinkedIn</a>`;
  html += `<button class="btn btn--sm btn--ghost" data-action="toggleClientProfile" data-stop data-arg0="${clientKey}" style="display:inline-flex;align-items:center;gap:4px;color:var(--text-muted);font-size:0.75rem"><span id="clientProfileArrow_${clientKey}" style="font-size:0.75rem;transition:transform 0.15s;${isExpanded?'transform:rotate(90deg)':''}">&#9654;</span><span id="clientProfileBtn_${clientKey}">${isExpanded ? 'Hide Profile' : 'Studio Profile'}</span></button>`;
  html += `</div>`;
  if (!isClientUser()) {
    html += `<div class="client-header__stats">
      <div class="client-stat"><div class="client-stat__value">${clientTasks.length}</div><div class="client-stat__label">Items</div></div>
      <div class="client-stat"><div class="client-stat__value">${hrs.toFixed(1)}</div><div class="client-stat__label">Hours Spent</div></div>
      <div class="client-stat"><div class="client-stat__value">${est.toFixed(1)}</div><div class="client-stat__label">Estimated</div></div>
    </div>`;
  }
  html += `</div>`;

  // Expandable profile section
  html += `<div id="clientProfile_${clientKey}" style="display:${isExpanded ? 'block' : 'none'}">`;
  if (brief) {
    html += `<div style="margin-top:16px;border-top:1px solid var(--border-default);padding-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;font-size:0.82rem">`;
    html += `<div><span style="color:var(--text-muted)">About:</span> <span style="color:var(--text-primary)">${esc(brief.description)}</span></div>`;
    html += `<div style="display:flex;flex-direction:column;gap:6px">`;
    if (brief.headquarters && brief.headquarters !== 'TBC') html += `<div><span style="color:var(--text-muted)">Location:</span> ${esc(brief.headquarters)}</div>`;
    if (brief.founded && brief.founded !== 'TBC') html += `<div><span style="color:var(--text-muted)">Founded:</span> ${esc(brief.founded)}</div>`;
    if (brief.employees && brief.employees !== 'TBC') html += `<div><span style="color:var(--text-muted)">Team size:</span> ${esc(brief.employees)}</div>`;
    if (brief.revenue && brief.revenue !== 'TBC') html += `<div><span style="color:var(--text-muted)">Revenue/Funding:</span> ${esc(brief.revenue)}</div>`;
    if (brief.nbiRelationship) html += `<div><span style="color:var(--text-muted)">NBI relationship:</span> ${esc(brief.nbiRelationship)}</div>`;
    const _apiClient = _apiClientsCache[ct];
    if (_apiClient && _apiClient.studio_size) html += `<div><span style="color:var(--text-muted)">Studio size:</span> ${_apiClient.studio_size} employees</div>`;
    if (_apiClient && _apiClient.contract_value) html += `<div><span style="color:var(--text-muted)">Contract value:</span> &pound;${Number(_apiClient.contract_value).toLocaleString()}</div>`;
    html += `</div>`;
    if (brief.contacts && brief.contacts.length > 0) {
      html += `<div style="grid-column:1/-1;margin-top:8px"><span style="color:var(--text-muted);font-family:var(--font-display);font-size:0.75rem;letter-spacing:1px;text-transform:uppercase">Key Contacts</span>`;
      html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px;margin-top:8px">`;
      brief.contacts.forEach((c, ci) => {
        const cid = `contact_${ct.replace(/[^a-zA-Z0-9]/g,'_')}_${ci}`;
        const savedNotes = getContactNotes(ct, ci);
        html += `<div class="contact-card" data-action="toggleContactDetail" data-pass-event data-arg0="${cid}" style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:8px 12px;cursor:pointer;transition:border-color 0.15s">`;
        html += `<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><strong style="color:var(--text-primary)">${esc(c.name)}</strong><div style="color:var(--accent-text);font-size:0.75rem">${esc(c.role)}</div></div>`;
        html += `<span style="color:var(--text-muted);font-size:0.75rem;transition:transform 0.15s" id="${cid}_arrow">&#9654;</span></div>`;
        if (c.notes) html += `<div style="color:var(--text-muted);font-size:0.75rem;margin-top:4px">${esc(c.notes)}</div>`;
        html += `<div id="${cid}" class="contact-detail" style="display:none;margin-top:8px;padding-top:8px;border-top:1px solid var(--border-subtle)">`;
        if (c.background) html += `<div style="color:var(--text-secondary);font-size:0.75rem;margin-bottom:6px"><span style="color:var(--text-muted)">Background:</span> ${esc(c.background)}</div>`;
        if (c.linkedin) html += `<div style="margin-bottom:6px"><a href="${safeUrl(c.linkedin)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);font-size:0.75rem;text-decoration:none">&#8599; LinkedIn Profile</a></div>`;
        html += `<div style="margin-top:4px"><label style="color:var(--text-muted);font-size:0.75rem;font-family:var(--font-display);letter-spacing:0.5px;text-transform:uppercase">My Notes</label>`;
        html += `<textarea id="${cid}_notes" rows="2" style="width:100%;margin-top:4px;padding:6px 8px;background:var(--bg-elevated);color:var(--text-primary);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);font-size:0.75rem;font-family:var(--font-body);resize:vertical" placeholder="Add notes about ${esc(c.name)}..." data-stop oninput="saveContactNotes('${escAttrJs(ct)}',${ci},this.value)">${esc(savedNotes)}</textarea>`;
        html += `</div></div></div>`;
      });
      html += `</div></div>`;
    }
    // Meeting Notes section (loaded from API)
    html += `<div style="grid-column:1/-1;margin-top:12px" id="clientNotes_${ct.replace(/[^a-zA-Z0-9]/g,'_')}"><span style="color:var(--text-muted);font-family:var(--font-display);font-size:0.75rem;letter-spacing:1px;text-transform:uppercase">Meeting Notes</span><div style="margin-top:8px;color:var(--text-muted);font-size:0.8rem">Loading...</div></div>`;
    html += `</div>`;
  }
  html += `</div>`; // close expandable
  html += renderClientMilestones(ct);
  html += `</div>`; // close extended header
  } // end isHeaderOpen
  html += `</div>`; // close client-header
  return html;
}

function renderClientMilestones(clientName) {
  const clientObj = _apiClientsCache[clientName];
  if (!clientObj) return '';
  if (!_milestonesCache[clientObj.id]) {
    loadMilestones(clientObj.id).then(() => renderContent());
    _milestonesCache[clientObj.id] = [];
  }
  const milestones = _milestonesCache[clientObj.id] || [];

  let html = '<div style="margin-top:12px;border-top:1px solid var(--border-default);padding-top:12px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  html += '<span style="font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted)">Milestones</span>';
  html += `<button class="btn btn--sm" data-action="openMilestoneDetail" data-arg0="${esc(clientObj.id)}" data-arg1="new" data-stop style="font-size:0.75rem">+ Add</button>`;
  html += '</div>';

  if (milestones.length === 0) {
    html += '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.78rem;border:1px dashed var(--border-default);border-radius:var(--radius-md)">No milestones set. Add one to track delivery gates.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:6px">';
    milestones.forEach(ms => {
      const info = computeMilestoneStatus(ms, tasks);
      const statusCol = info.status === 'Complete' ? 'var(--success)' : info.status === 'Overdue' ? 'var(--danger)' : info.status === 'At Risk' ? 'var(--warning)' : 'var(--success)';
      const dateStr = ms.target_date ? new Date(ms.target_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      html += `<div class="client-ms-card" data-action="openMilestoneDetail" data-arg0="${esc(clientObj.id)}" data-arg1="${ms.id}" data-stop>`;
      html += `<div style="display:flex;justify-content:space-between;align-items:center">`;
      html += `<div class="client-ms-card__title">${esc(ms.title)}</div>`;
      html += `<div class="client-ms-card__date">${dateStr}</div>`;
      html += `</div>`;
      html += `<div class="client-ms-card__bar"><div class="client-ms-card__fill" style="width:${info.pct}%;background:${statusCol}"></div></div>`;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">`;
      html += `<div class="client-ms-card__status" style="color:${statusCol}">${info.status}</div>`;
      html += `<div style="font-size:0.75rem;color:var(--text-muted)">${info.done}/${info.total} items</div>`;
      html += `</div></div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// ==================== MILESTONE DETAIL PANEL ====================

let _msDetailClientId = null;
let _msDetailMilestone = null;

function closeMilestoneDetail() {
  _msDetailClientId = null;
  _msDetailMilestone = null;
  const overlay = document.getElementById('msDetailOverlay');
  const panel = document.getElementById('msDetailPanel');
  if (overlay) overlay.style.display = 'none';
  if (panel) { panel.classList.remove('open'); panel.innerHTML = ''; }
  if (window._msDetailEscHandler) {
    document.removeEventListener('keydown', window._msDetailEscHandler);
    window._msDetailEscHandler = null;
  }
}

function openMilestoneDetail(clientId, milestoneIdOrNew) {
  _msDetailClientId = clientId;
  const isNew = milestoneIdOrNew === 'new';
  const milestones = _milestonesCache[clientId] || [];
  _msDetailMilestone = isNew
    ? { id: null, title: '', description: '', target_date: '', linked_item_ids: [] }
    : milestones.find(m => m.id === milestoneIdOrNew) || null;

  if (!_msDetailMilestone) return;

  const overlay = document.getElementById('msDetailOverlay');
  const panel = document.getElementById('msDetailPanel');
  if (overlay) overlay.style.display = 'block';
  if (panel) panel.classList.add('open');

  _renderMilestoneDetailPanel();

  if (window._msDetailEscHandler) document.removeEventListener('keydown', window._msDetailEscHandler);
  window._msDetailEscHandler = (e) => { if (e.key === 'Escape') closeMilestoneDetail(); };
  document.addEventListener('keydown', window._msDetailEscHandler);
}

function _renderMilestoneDetailPanel() {
  const panel = document.getElementById('msDetailPanel');
  if (!panel || !_msDetailMilestone) return;
  const ms = _msDetailMilestone;
  const isNew = !ms.id;
  const info = computeMilestoneStatus(ms, tasks);
  const statusCol = info.status === 'Complete' ? 'var(--success)' : info.status === 'Overdue' ? 'var(--danger)' : info.status === 'At Risk' ? 'var(--warning)' : 'var(--success)';

  let html = `<div class="ms-detail__header">
    <div style="flex:1"><input id="msTitle" type="text" value="${esc(ms.title)}" placeholder="Milestone title" style="font-size:1.1rem;font-weight:700;background:none;border:none;color:var(--text-primary);width:100%;outline:none;font-family:var(--font-display)"></div>
    <button class="btn btn--sm btn--ghost" data-action="closeMilestoneDetail">&times;</button>
  </div>`;

  html += '<div class="ms-detail__body">';

  // Target date
  html += `<div class="ms-detail__section">
    <div class="ms-detail__section-title">Target Date</div>
    <input id="msTargetDate" type="date" value="${ms.target_date || ''}" style="padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem;width:100%">
  </div>`;

  // Description
  html += `<div class="ms-detail__section">
    <div class="ms-detail__section-title">Description</div>
    <textarea id="msDescription" rows="3" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.82rem;resize:vertical;font-family:var(--font-body)">${esc(ms.description || '')}</textarea>
  </div>`;

  // Status (read-only, only for existing milestones)
  if (!isNew) {
    html += `<div class="ms-detail__section">
      <div class="ms-detail__section-title">Status</div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:0.85rem;font-weight:700;color:${statusCol}">${info.status}</span>
        <span style="font-size:0.78rem;color:var(--text-muted)">${info.done} of ${info.total} items complete &mdash; ${info.pct}%</span>
      </div>
      <div style="height:6px;background:var(--border-subtle);border-radius:3px;margin-top:8px;overflow:hidden">
        <div style="height:100%;width:${info.pct}%;background:${statusCol};border-radius:3px"></div>
      </div>
    </div>`;
  }

  // Linked items
  html += `<div class="ms-detail__section">
    <div class="ms-detail__section-title">Linked Items</div>`;
  const linked = (ms.linked_item_ids || []).map(id => tasks.find(t => t.id === id)).filter(Boolean);
  if (linked.length === 0) {
    html += '<div style="padding:8px;color:var(--text-muted);font-size:0.78rem;border:1px dashed var(--border-default);border-radius:var(--radius-md)">No items linked yet. Use the picker below to add features or stories.</div>';
  } else {
    linked.forEach(t => {
      const typeBadge = t.itemType === 'project' ? 'PR' : t.itemType === 'feature' ? 'FT' : t.itemType === 'story' ? 'ST' : 'TK';
      const desc = getDescendants(t.id);
      const allItems = [t, ...desc];
      const doneCount = allItems.filter(d => d.status === 'Done').length;
      html += `<div class="ms-detail__linked-item">
        <span style="font-size:0.75rem;font-weight:700;letter-spacing:0.06em;color:var(--text-muted);background:var(--bg-input);padding:1px 4px;border-radius:3px">${typeBadge}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</span>
        <span style="font-size:0.75rem;color:var(--text-muted)">${doneCount}/${allItems.length}</span>
        <button class="btn btn--sm btn--ghost" onclick="_msRemoveLinkedItem('${t.id}')" style="font-size:0.75rem;color:var(--danger);padding:2px 4px">&times;</button>
      </div>`;
    });
  }

  // Item picker
  const clientTasks = tasks.filter(t => {
    const tc = getTaskClient(t);
    const clientObj = Object.values(_apiClientsCache || {}).find(c => c.id === _msDetailClientId);
    return clientObj && tc === clientObj.name && (t.itemType === 'project' || t.itemType === 'feature' || t.itemType === 'story') && t.status !== 'Done' && t.status !== 'Cancelled';
  });
  const alreadyLinked = new Set(ms.linked_item_ids || []);
  const available = clientTasks.filter(t => !alreadyLinked.has(t.id));

  if (available.length > 0) {
    html += `<select id="msItemPicker" onchange="_msAddLinkedItem(this.value);this.value=''" style="margin-top:8px;width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.82rem">`;
    html += '<option value="">+ Link a feature or story...</option>';
    available.forEach(t => {
      const typeBadge = t.itemType === 'project' ? 'PR' : t.itemType === 'feature' ? 'FT' : t.itemType === 'story' ? 'ST' : 'TK';
      html += `<option value="${t.id}">[${typeBadge}] ${esc(t.title)}</option>`;
    });
    html += '</select>';
  }
  html += '</div>';

  html += '</div>';

  // Actions
  html += `<div class="ms-detail__actions">
    <button class="btn btn--primary" onclick="_msSave()" style="flex:1">${isNew ? 'Create Milestone' : 'Save Changes'}</button>`;
  if (!isNew) {
    html += `<button class="btn btn--danger" onclick="_msDelete()">Delete</button>`;
  }
  html += `<button class="btn" onclick="closeMilestoneDetail()">Cancel</button>
  </div>`;

  panel.innerHTML = html;
}

function _msAddLinkedItem(taskId) {
  if (!taskId || !_msDetailMilestone) return;
  const ids = _msDetailMilestone.linked_item_ids || [];
  if (!ids.includes(taskId)) {
    _msDetailMilestone.linked_item_ids = [...ids, taskId];
    _renderMilestoneDetailPanel();
  }
}

function _msRemoveLinkedItem(taskId) {
  if (!_msDetailMilestone) return;
  _msDetailMilestone.linked_item_ids = (_msDetailMilestone.linked_item_ids || []).filter(id => id !== taskId);
  _renderMilestoneDetailPanel();
}

async function _msSave() {
  if (!_msDetailMilestone || !_msDetailClientId) return;
  const titleEl = document.getElementById('msTitle');
  const dateEl = document.getElementById('msTargetDate');
  const descEl = document.getElementById('msDescription');
  if (titleEl) _msDetailMilestone.title = titleEl.value;
  if (dateEl) _msDetailMilestone.target_date = dateEl.value;
  if (descEl) _msDetailMilestone.description = descEl.value;

  if (!_msDetailMilestone.title || !_msDetailMilestone.target_date) {
    alert('Title and target date are required.');
    return;
  }

  await saveMilestone(_msDetailClientId, _msDetailMilestone);
  closeMilestoneDetail();
  renderContent();
}

async function _msDelete() {
  if (!_msDetailMilestone || !_msDetailMilestone.id || !_msDetailClientId) return;
  if (!confirm('Delete this milestone? This cannot be undone.')) return;
  await deleteMilestone(_msDetailClientId, _msDetailMilestone.id);
  closeMilestoneDetail();
  renderContent();
}

// ==================== TABS & ROUTING ====================

// ==================== TABS, ROUTING & RENDER ====================
/** Render the main tab bar, filtering out tabs the current user lacks permission to see */
function renderTabs() {
  const tabs = ['dashboard', 'tasks', 'workload', 'people', 'leads', 'expenses', 'finances', 'news', 'settings'];
  const labels = { dashboard: 'Portfolio', tasks: 'Projects', workload: 'Workload', report: 'Report', people: 'People', leads: 'Leads', expenses: 'Expenses', finances: 'Finances', news: 'News', settings: 'Settings' };
  // Filter tabs based on permissions
  const visibleTabs = tabs.filter(t => {
    if (!isClientAllowedView(t)) return false;
    if (t === 'finances' || t === 'leads' || t === 'expenses') return hasPageAccess(t);
    return true;
  });
  document.getElementById('mainTabs').setAttribute('role', 'tablist');
  document.getElementById('mainTabs').innerHTML = visibleTabs.map(t => `<div class="main__tab ${currentView===t?'active':''}" data-action="switchView" data-arg0="${t}" role="tab" aria-selected="${currentView===t}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();switchView('${t}')}">${labels[t]}</div>`).join('');
  checkTabOverflow();
}

/** Detect if the tab bar is overflowing and show scroll fade indicator */
function checkTabOverflow() {
  const tabs = document.getElementById('mainTabs');
  if (tabs) tabs.classList.toggle('has-overflow', tabs.scrollWidth > tabs.clientWidth);
}

/** Legacy hash route redirects — map removed views to their replacements */
const LEGACY_ROUTES = { incomplete: 'tasks', changelog: 'settings', report: 'dashboard' };

/** Switch to a different view and push a history state for browser back/forward */
function switchView(view) {
  if (LEGACY_ROUTES[view]) view = LEGACY_ROUTES[view];
  if (!isClientAllowedView(view)) view = 'dashboard';
  const prev = currentView;
  currentView = view;
  // Always collapse the tree when entering the Projects page
  if (view === 'tasks') { _tasksInitialCollapse = true; }
  if (prev !== view) { history.pushState({ view, filter: { ...currentFilter }, taskSubView }, '', '#' + view); }
  // Show/hide PlaySage chat root when entering/leaving CC
  var chatRoot = document.getElementById('ccChatRoot');
  if (chatRoot) chatRoot.style.display = (view === 'commandcentre') ? '' : 'none';
  renderAll();
}
window.addEventListener('popstate', e => {
  if (e.state && e.state.view) {
    currentView = LEGACY_ROUTES[e.state.view] || e.state.view;
    if (!isClientAllowedView(currentView)) currentView = 'dashboard';
    if (e.state.filter) {
      currentFilter = e.state.filter;
      // Migrate old single-value filters from browser history to arrays
      if (currentFilter.status && typeof currentFilter.status === 'string') currentFilter.status = [currentFilter.status];
      if (currentFilter.health && typeof currentFilter.health === 'string') currentFilter.health = [currentFilter.health];
      if (currentFilter.assignee && typeof currentFilter.assignee === 'string') currentFilter.assignee = [currentFilter.assignee];
      if (!Array.isArray(currentFilter.status)) currentFilter.status = [];
      if (!Array.isArray(currentFilter.health)) currentFilter.health = [];
      if (!Array.isArray(currentFilter.assignee)) currentFilter.assignee = [];
    }
    taskSubView = e.state.taskSubView || 'tree';
    renderAll();
  }
});
// Restore view from URL hash on page load (supports deep-linking e.g. #bugs, #leads, #task/{id})
var _pendingDeepLink = null;
(function() {
  const h = window.location.hash.replace('#', '');
  const known = ['report','dashboard','tasks','people','leads','expenses','finances','news','bugs','settings','mytasks','queue','reporting','documentation','workload','hiring','commandcentre'];
  if (h && known.includes(h)) {
    currentView = LEGACY_ROUTES[h] || h;
  } else {
    const ENTITY_ROUTES = {
      'task': 'tasks',
      'hiring/candidate': 'hiring',
      'lead': 'leads',
      'bug': 'bugs'
    };
    for (const [prefix, view] of Object.entries(ENTITY_ROUTES)) {
      if (h.startsWith(prefix + '/')) {
        const entityId = h.slice(prefix.length + 1);
        if (entityId.length >= 8) {
          _pendingDeepLink = { type: prefix.replace('hiring/', ''), id: entityId, view };
          currentView = view;
        }
        break;
      }
    }
  }
})();
// Set initial history state
history.replaceState({ view: currentView, filter: { ...currentFilter }, taskSubView }, '', '#' + currentView);
/** Clear all active filters except sort order, and deselect any bulk-selected tasks */
function resetFilters() { currentFilter = { client: null, project: null, status: [], health: [], search: '', sort: currentFilter.sort || 'default', assignee: [], incomplete: false, overdue: false, practice: currentFilter.practice || null }; selectedTaskIds.clear(); }
/** Set the client filter and re-render -- pass null to show all clients */
function filterByClient(c) { if (isClientUser()) return; currentFilter = { client: c, project: null, status: [], health: [], assignee: [], search: '', sort: currentFilter.sort || 'default', incomplete: false, overdue: false, practice: currentFilter.practice || null }; selectedTaskIds.clear(); renderSidebarCounts(); renderContent(); renderBreadcrumbs(); history.replaceState({ view: currentView, filter: { ...currentFilter }, taskSubView }, '', '#' + currentView); }
// Practice areas (Phase 9 of the NBI WorkSage backlog, a6c82c8c).
// Stored as `practice_area` on tasks/leads/clients. The legacy "Human
// Capital" / HC label has been retired in favour of "Organisational"
// (closes 9a10d8d1) — Glen's call: HC is one piece of organisational
// performance, not the umbrella. The dot colours match the sidebar
// styling for consistency.
// G2 / decision D84: exactly two practices, with "general" removed.
// Slug is stored in the DB; label is shown in the full sidebar; abbrev is
// shown in the collapsed sidebar. shortLabel is the terser display name
// Glen specified ("Org Perf") for space-constrained UIs.
const PRACTICES = [
  { value: 'gaming',                label: 'Gaming',                shortLabel: 'Gaming',    abbrev: 'GM', colour: '#22c1c3' },
  { value: 'organisational_performance', label: 'Organizational Performance', shortLabel: 'Org Perf', abbrev: 'OP', colour: '#7c5cff' },
];
function getPracticeLabel(value) {
  const p = PRACTICES.find(x => x.value === value);
  return p ? p.label : value || '';
}
/** Toggle the practice-area filter that scopes the entire workspace
 *  (dashboard, projects, leads, clients) to a single practice. Pass null
 *  to clear and show All. */
function filterByPractice(p) {
  currentFilter = { ...currentFilter, practice: p };
  selectedTaskIds.clear();
  renderSidebarCounts();
  renderContent();
  renderBreadcrumbs();
  // Re-render leads/clients views if they're active so the practice
  // filter takes effect across every page that displays records.
  if (currentView === 'leads') { try { renderLeadsContent(); } catch(e) { console.warn('[Leads] render error:', e.message || e); } }
  history.replaceState({ view: currentView, filter: { ...currentFilter }, taskSubView }, '', '#' + currentView);
}
/** Filter by health state and switch to tasks view */
function filterByHealth(h) { currentFilter = { client: currentFilter.client, project: null, status: [], health: [h], assignee: [], search: '', practice: currentFilter.practice || null }; switchView('tasks'); }
/** Filter by priority values and switch to tasks view */
function filterByPriority(priorities) { currentFilter = { ...currentFilter, status: [], health: [], priority: priorities, client: null, project: null }; switchView('tasks'); renderAll(); }
/** Filter to a specific project, switch to tree view, and scroll to the project row */
function filterByProject(projectId) {
  currentFilter = { client: currentFilter.client, project: projectId, status: [], health: [], search: '', sort: 'default', assignee: [], incomplete: false, practice: currentFilter.practice || null };
  taskSubView = 'tree';
  // Ensure the project is expanded in the tree
  if (typeof collapsedTaskIds !== 'undefined') collapsedTaskIds.delete(projectId);
  switchView('tasks');
  // Scroll to the project row after render
  setTimeout(() => {
    const row = document.querySelector(`[data-task-id="${projectId}"]`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

/** Render breadcrumb bar showing active filters */
function renderBreadcrumbs() {
  const bar = document.getElementById('breadcrumbBar');
  if (!bar) return;
  const noFilterViews = ['bugs', 'leads', 'documentation', 'hiring', 'news', 'queue', 'settings', 'expenses', 'finances', 'tasks'];
  if (noFilterViews.includes(currentView)) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
  const hasFilter = currentFilter.client || currentFilter.practice || (currentFilter.assignee && currentFilter.assignee.length > 0) || (currentFilter.health && currentFilter.health.length > 0) || (currentFilter.status && currentFilter.status.length > 0) || currentFilter.incomplete || currentFilter.project;
  if (!hasFilter) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  let html = '<span style="font-size:0.75rem;color:var(--text-muted);margin-right:4px">Filtered:</span>';
  if (currentFilter.practice) html += `<span class="filter-chip">Practice: ${esc(getPracticeLabel(currentFilter.practice))} <button data-action="filterByPractice" data-arg0="null">&times;</button></span>`;
  if (currentFilter.client) html += `<span class="filter-chip">${esc(currentFilter.client)} <button data-action="_actClearFilterClientBreadcrumb">&times;</button></span>`;
  if (currentFilter.assignee && currentFilter.assignee.length > 0) html += `<span class="filter-chip">${currentFilter.assignee.map(a => esc(a)).join(', ')} <button data-action="_actClearFilterAssigneeBreadcrumb">&times;</button></span>`;
  if (currentFilter.health && currentFilter.health.length > 0) html += `<span class="filter-chip">${currentFilter.health.map(h => esc(h)).join(', ')} <button data-action="_actClearFilterHealthBreadcrumb">&times;</button></span>`;
  if (currentFilter.status && currentFilter.status.length > 0) html += `<span class="filter-chip">${currentFilter.status.map(s => esc(s)).join(', ')} <button data-action="_actClearFilterStatusBreadcrumb">&times;</button></span>`;
  if (currentFilter.project) { const pt = tasks.find(t => t.id === currentFilter.project); html += `<span class="filter-chip">${esc(pt ? pt.title : 'Project')} <button data-action="_actClearFilterProjectBreadcrumb">&times;</button></span>`; }
  if (currentFilter.incomplete) html += `<span class="filter-chip">Incomplete only <button data-action="_actClearFilterIncompleteBreadcrumb">&times;</button></span>`;
  html += `<button class="filter-chip-clear" data-action="_actResetFiltersBreadcrumb">Clear all</button>`;
  bar.innerHTML = html;
}

function _renderMainContent(content) {
  if (!isClientAllowedView(currentView)) { currentView = 'dashboard'; }
  if (currentView === 'incomplete') { currentView = 'tasks'; currentFilter.incomplete = true; }
  if (currentView === 'changelog') { currentView = 'settings'; }
  if (tasks.length === 0 && currentView !== 'settings' && currentView !== 'documentation' && currentView !== 'leads' && currentView !== 'bugs' && currentView !== 'hiring' && currentView !== 'news' && currentView !== 'queue' && currentView !== 'commandcentre' && currentView !== 'activity') {
    content.innerHTML = `<div class="empty-state"><div class="empty-state__icon">&#128203;</div><div class="empty-state__title">No Tasks Yet</div><div class="empty-state__desc">Import tasks or add them manually to get started.</div><button class="btn btn--primary" data-action="openImportModal">Import</button></div>`;
    return;
  }
  if (currentView === 'dashboard') renderDashboard(content);
  else if (currentView === 'mytasks') renderMyTasksView(content);
  else if (currentView === 'tasks') renderTaskView(content);
  else if (currentView === 'reporting') renderReportingView(content);
  else if (currentView === 'documentation') renderDocumentationView(content);
  else if (currentView === 'report') renderReport(content);
  else if (currentView === 'people') renderPeopleView(content);
  else if (currentView === 'leads') renderLeadsView(content);
  else if (currentView === 'expenses') renderExpensesView(content);
  else if (currentView === 'finances') renderFinancesView(content);
  else if (currentView === 'bugs') renderBugTrackerView(content);
  else if (currentView === 'queue') renderQueueView(content);
  else if (currentView === 'hiring') renderHiringView(content);
  else if (currentView === 'workload') renderWorkloadView(content);
  else if (currentView === 'news') renderNewsOrLoad(content);
  else if (currentView === 'commandcentre') renderCommandCentre(content);
  // intelligence view consolidated into CC Intel tab
  else if (currentView === 'activity') renderActivityFeedView(content);
  else if (currentView === 'settings') renderSettings(content);
  if (currentView === 'tasks' && taskSubView === 'gantt') {
    requestAnimationFrame(() => {
      drawGanttArrows();
      if (!_ganttScrolledToToday) {
        const ganttEl = document.querySelector('.gantt');
        const todayLine = ganttEl && ganttEl.querySelector('.gantt__today-line');
        if (ganttEl && todayLine) {
          const todayLeft = parseInt(todayLine.style.left, 10) || 0;
          ganttEl.scrollLeft = Math.max(0, todayLeft - ganttEl.clientWidth / 3);
          _ganttScrolledToToday = true;
        }
      }
    });
  }
}

/** Re-render only the main content area (not sidebar/tabs). Preserves scroll position. */
function renderContent() {
  if (!isClientAllowedView(currentView)) { currentView = 'dashboard'; renderAll(); return; }
  _flushActiveEdits();
  const _perfStart = performance.now();
  const content = document.getElementById('mainContent');
  if (!content) return;
  const savedScroll = content.scrollTop;
  _renderMainContent(content);
  requestAnimationFrame(() => {
    content.scrollTop = savedScroll;
  });
  const _perfEnd = performance.now();
  if (_perfEnd - _perfStart > 100) {
    console.debug('[Perf] renderContent took ' + Math.round(_perfEnd - _perfStart) + 'ms');
  }
}

/** Re-render sidebar counts without rebuilding the whole page */
function renderSidebarCounts() {
  renderSidebar();
}

/** Re-render the entire UI: sidebar, tabs, breadcrumbs, and the active view. */
function renderAll() {
  _flushActiveEdits();
  const _perfStart = performance.now();
  renderSidebar();
  renderTabs();
  renderBreadcrumbs();
  const content = document.getElementById('mainContent');
  _renderMainContent(content);
  const _perfEnd = performance.now();
  if (_perfEnd - _perfStart > 100) {
    console.debug('[Perf] renderAll took ' + Math.round(_perfEnd - _perfStart) + 'ms');
  }
}

