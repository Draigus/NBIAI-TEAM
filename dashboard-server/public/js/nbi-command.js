// ==================== COMMAND CENTRE ====================

let _ccBriefing = null;
let _ccClientWork = null;
let _ccSnapshot = null;
let _ccPipeline = null;
let _ccAiosDetail = null;
let _ccTeamWorkload = null;
let _ccHandoffs = null;
let _ccProjectHealth = null;
let _ccFinancialPulse = null;
let _ccLoading = false;
let _ccLoadFailed = false;
const _ccValidTabs = ['work', 'pipeline', 'money', 'aios', 'comms', 'meetings'];
let _ccTab = (() => { const v = localStorage.getItem('ccTab'); return _ccValidTabs.includes(v) ? v : 'work'; })();
let _ccPollTimer = null;

function renderCommandCentre(el) {
  // Start polling when visible
  _ccStartPoll();

  if (!_ccBriefing && !_ccLoading && !_ccLoadFailed) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading Command Centre...</div>';
    _ccLoading = true;
    _ccFetchAll();
    return;
  }
  if (_ccLoadFailed && !_ccBriefing) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Failed to load Command Centre. <a href="#" onclick="event.preventDefault();_ccLoadFailed=false;_ccLoading=false;_ccFetchAll();return false" style="color:var(--accent-text)">Retry</a></div>';
    return;
  }
  if (_ccLoading && !_ccBriefing) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading Command Centre...</div>';
    return;
  }
  _ccRenderPage(el);
}

async function _ccFetchAll() {
  _ccLoading = true;
  try {
    const [briefRes, workRes, snapRes, pipeRes, aiosRes, teamRes, handoffRes, healthRes, finRes] = await Promise.allSettled([
      apiCall('/api/command-centre/briefing'),
      apiCall('/api/command-centre/client-work'),
      apiCall('/api/command-centre/snapshot'),
      apiCall('/api/command-centre/pipeline'),
      apiCall('/api/command-centre/aios-detail'),
      apiCall('/api/command-centre/team-workload'),
      apiCall('/api/command-centre/handoffs'),
      apiCall('/api/command-centre/project-health'),
      apiCall('/api/command-centre/financial-pulse')
    ]);
    if (briefRes.status === 'fulfilled' && briefRes.value) {
      _ccBriefing = briefRes.value.data || briefRes.value;
    }
    if (workRes.status === 'fulfilled' && workRes.value) {
      _ccClientWork = workRes.value.data || workRes.value;
    }
    if (snapRes.status === 'fulfilled' && snapRes.value) {
      const raw = snapRes.value.data || snapRes.value;
      _ccSnapshot = raw.data || raw;
    }
    if (pipeRes.status === 'fulfilled' && pipeRes.value) {
      _ccPipeline = pipeRes.value.data || pipeRes.value;
    }
    if (aiosRes.status === 'fulfilled' && aiosRes.value) {
      _ccAiosDetail = aiosRes.value.data || aiosRes.value;
    }
    if (teamRes.status === 'fulfilled' && teamRes.value) {
      _ccTeamWorkload = teamRes.value.data || teamRes.value;
    }
    if (handoffRes.status === 'fulfilled' && handoffRes.value) {
      _ccHandoffs = handoffRes.value.data || handoffRes.value;
    }
    if (healthRes.status === 'fulfilled' && healthRes.value) {
      _ccProjectHealth = healthRes.value.data || healthRes.value;
    }
    if (finRes.status === 'fulfilled' && finRes.value) {
      _ccFinancialPulse = finRes.value.data || finRes.value;
    }
  } catch (e) {
    console.warn('[CC] fetch error:', e);
  }
  if (!_ccBriefing && !_ccClientWork) _ccLoadFailed = true;
  _ccLoading = false;
  if (currentView === 'commandcentre') {
    const el = document.getElementById('mainContent');
    if (el) {
      var ccBody = el.querySelector('.cc-body');
      var savedScroll = ccBody ? ccBody.scrollTop : 0;
      var savedPageScroll = window.scrollY;
      renderCommandCentre(el);
      var newBody = el.querySelector('.cc-body');
      if (newBody && savedScroll) newBody.scrollTop = savedScroll;
      if (savedPageScroll) window.scrollTo(0, savedPageScroll);
    }
  }
}

function _ccStartPoll() {
  _ccStopPoll();
  _ccPollTimer = setInterval(() => {
    if (currentView !== 'commandcentre') { _ccStopPoll(); return; }
    _ccFetchAll();
  }, 30000);
}

function _ccStopPoll() {
  if (_ccPollTimer) { clearInterval(_ccPollTimer); _ccPollTimer = null; }
}

function _ccNavigate(type, id) {
  if (type === 'bug') { switchView('bugs'); }
  else if (type === 'task') { switchView('tasks'); openDetail(id); }
}

function _ccToggleImprov(id) {
  var el = document.getElementById('cc-improv-' + id);
  if (el) el.classList.toggle('open');
}
function _ccDaysAgo(dateStr) {
  if (!dateStr) return '?';
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function _ccSwitchTab(tab) {
  _ccTab = tab;
  localStorage.setItem('ccTab', tab);
  if (currentView === 'commandcentre') {
    var el = document.getElementById('mainContent');
    if (el) renderCommandCentre(el);
  }
}

// ——— SVG RING HELPER ———

function _ccRingSvg(score, max, size) {
  const sz = size || 44;
  const r = (sz / 2) - 5;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? score / max : 0;
  const offset = circ * (1 - pct);
  const colour = score >= 7 ? 'var(--success)' : score >= 4 ? 'var(--warning)' : 'var(--danger)';
  return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 ' + sz + ' ' + sz + '">' +
    '<circle cx="' + (sz/2) + '" cy="' + (sz/2) + '" r="' + r + '" fill="none" stroke="var(--border)" stroke-width="3" opacity="0.3"/>' +
    '<circle cx="' + (sz/2) + '" cy="' + (sz/2) + '" r="' + r + '" fill="none" stroke="' + colour + '" stroke-width="3.5" ' +
    'stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" ' +
    'stroke-linecap="round" transform="rotate(-90 ' + (sz/2) + ' ' + (sz/2) + ')" style="filter:drop-shadow(0 0 4px ' + colour + ')"/>' +
    '<text x="' + (sz/2) + '" y="' + (sz/2 + 4) + '" text-anchor="middle" fill="' + colour + '" font-size="' + (sz * 0.3) + '" font-weight="800">' + score + '</text></svg>';
}

// ——— MAIN RENDER ———

function _ccRenderPage(el) {
  const b = _ccBriefing || {};
  const w = _ccClientWork || {};
  const s = _ccSnapshot || {};
  const fc = s.four_cs || {};
  const stats = w.stats || {};
  const fires = b.fires || [];

  let html = '<div class="cc-page">';

  // === Persistent header: fires summary + stats ===
  html += '<div class="cc-header">';
  html += '<div style="display:flex;align-items:center;flex:1;min-width:0;">';
  html += '<h1>Command Centre</h1>';

  // Collapsed fires
  if (fires.length > 0) {
    html += '<div class="cc-fires-inline">';
    html += '<span class="cc-fire-count">' + fires.length + ' fires</span>';
    var top2 = fires.slice(0, 2).map(function(f) { return esc(f.title); }).join(' · ');
    html += '<span class="cc-fire-preview">' + top2 + '</span>';
    html += '</div>';
  }
  html += '</div>';

  // Header stats
  html += '<div class="cc-header-stats">';
  html += '<div class="cc-hstat"><span class="v">' + (stats.open_tasks || 0) + '</span><span class="l">Open</span></div>';
  html += '<div class="cc-hstat' + ((stats.overdue || 0) > 0 ? ' danger' : '') + '"><span class="v">' + (stats.overdue || 0) + '</span><span class="l">Overdue</span></div>';
  html += '<div class="cc-hstat' + ((stats.blocked || 0) > 0 ? ' warn' : '') + '"><span class="v">' + (stats.blocked || 0) + '</span><span class="l">Blocked</span></div>';
  html += '<div class="cc-hstat info"><span class="v">' + (stats.due_today || 0) + '</span><span class="l">Today</span></div>';
  html += '</div>';

  html += '<div class="cc-live"><div class="cc-live-dot"></div>Live</div>';
  html += '</div>';

  // === Tab bar ===
  html += '<div class="cc-tab-bar">';
  var tabs = [
    { id: 'work', label: 'Work' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'money', label: 'Money' },
    { id: 'aios', label: 'AIOS' },
    { id: 'comms', label: 'Comms' },
    { id: 'intel', label: 'Intel' },
    { id: 'meetings', label: 'Meetings' }
  ];
  tabs.forEach(function(t) {
    html += '<div class="cc-tab' + (_ccTab === t.id ? ' on' : '') + '" onclick="_ccSwitchTab(\'' + t.id + '\')">' + t.label + '</div>';
  });
  html += '</div>';

  // === Active panel ===
  html += '<div class="cc-body">';
  if (_ccTab === 'work') html += _ccRenderWorkTab(b, w, s, fc);
  else if (_ccTab === 'pipeline') html += _ccRenderPipelineTab();
  else if (_ccTab === 'money') html += _ccRenderMoneyTab();
  else if (_ccTab === 'aios') html += _ccRenderAiosTab();
  else if (_ccTab === 'comms') html += _ccRenderCommsTab();
  else if (_ccTab === 'intel') html += _ccRenderIntelTab();
  else if (_ccTab === 'meetings') html += _ccRenderMeetingsTab();
  html += '</div>';

  html += '</div>';

  el.innerHTML = html;

  // Floating chat panel + FAB — rendered into body once, survives CC re-renders
  if (!document.getElementById('ccChatPanel')) {
    var chatHtml = '<div id="ccChatPanel" class="cc-chat hidden">';
    chatHtml += '<div class="cc-chat-hdr"><h4><img src="/public/img/playsage-icon.png" style="width:20px;height:20px;vertical-align:middle;margin-right:6px;border-radius:4px;">PlaySage</h4><button class="cc-chat-close" onclick="_chatToggle()">&#10005;</button></div>';
    chatHtml += '<div class="cc-chat-msgs" id="ccChatMsgs"></div>';
    chatHtml += '<div class="cc-chat-input"><input id="ccChatInput" placeholder="Ask PlaySage anything..." onkeydown="_chatKeydown(event)"><button id="ccChatSend" onclick="_chatSend()">Send</button></div>';
    chatHtml += '</div>';
    chatHtml += '<button id="ccChatFab" class="cc-chat-fab" onclick="_chatToggle()" title="Chat with PlaySage"><img src="/public/img/playsage-icon.png" style="width:104px;height:104px;border-radius:50%;object-fit:cover;"></button>';
    var chatContainer = document.createElement('div');
    chatContainer.id = 'ccChatRoot';
    chatContainer.innerHTML = chatHtml;
    document.body.appendChild(chatContainer);
    new Image().src = '/public/img/playsage-notify.gif';
  }
}

// ——— WORK TAB (4-row layout) ———

function _ccRenderWorkTab(b, w, s, fc) {
  let html = '';
  const stats = w.stats || {};
  const fires = (b.fires || []).slice(0, 8);
  const fireCount = fires.length;
  const bugs = b.bugs || {};
  const critOpen = (bugs.critical_open || []).length;
  const awaitReview = (bugs.awaiting_review || []).length;
  const hotspots = bugs.hotspots || [];
  const clients = w.clients || [];
  const velocity = (w.velocity || []).slice(-4);
  const cal = b.calendar || {};
  const todayEvents = (cal.today || []).concat(cal.tomorrow || []).slice(0, 6);

  // === ROW 1: Client Work (wide) + Fires (medium) + Velocity/Bugs/Calendar stacked (narrow) ===
  html += '<div class="cc-row1-grid">';

  // Client work bars — takes widest column
  html += '<div class="cc-card"><h3><span>Client Work</span></h3>';
  html += '<div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:10px;">';
  html += '<span style="display:inline-block;width:10px;height:10px;background:var(--success);border-radius:2px;margin-right:4px;vertical-align:middle;"></span>Done ';
  html += '<span style="display:inline-block;width:10px;height:10px;background:var(--accent);border-radius:2px;margin:0 4px 0 12px;vertical-align:middle;"></span>In progress ';
  html += '<span style="display:inline-block;width:10px;height:10px;background:var(--bg-hover);border-radius:2px;margin-right:4px;vertical-align:middle;"></span>To do';
  html += '</div>';
  if (clients.length === 0) {
    html += '<div style="padding:12px 0;color:var(--text-secondary)">No client data</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:10px;">';
    clients.forEach(client => {
      const done = client.done || 0;
      const ip = client.in_progress || 0;
      const todo = client.todo || 0;
      const total = client.total || (done + ip + todo) || 1;
      const left = total - done;
      const leftPct = left / total;
      const leftColour = leftPct <= 0.2 ? '#3fb950' : leftPct <= 0.5 ? '#d29922' : '#f85149';
      html += '<div>';
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">';
      html += '<span style="font-size:0.9rem;">' + esc(client.name) + '</span>';
      html += '<span style="font-size:0.82rem;color:' + leftColour + ';">' + done + '/' + total + ' &mdash; ' + left + ' left</span>';
      html += '</div>';
      html += '<div class="cc-sbar">';
      if (done > 0) html += '<div style="background:var(--success);flex:' + done + '"></div>';
      if (ip > 0) html += '<div style="background:var(--accent);flex:' + ip + '"></div>';
      if (todo > 0) html += '<div style="background:var(--bg-hover);flex:' + todo + '"></div>';
      html += '</div></div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // Fires card — middle column
  html += '<div class="cc-card" style="border-color:rgba(248,81,73,0.15);background:rgba(248,81,73,0.02);">';
  html += '<h3><span style="color:var(--danger);">&#9679;</span> Fires <span class="ct">' + fireCount + '</span></h3>';
  if (fireCount === 0) {
    html += '<div style="padding:12px 0;color:var(--text-secondary)">No active fires</div>';
  } else {
    fires.slice(0, 6).forEach(f => {
      const sevClass = (f.severity === 'CRITICAL') ? 'cr' : (f.severity === 'URGENT' || f.severity === 'LATE') ? 'la' : 'wa';
      html += '<div class="cc-fire-row">';
      html += '<span class="cc-badge ' + sevClass + '">' + esc(f.severity) + '</span>';
      html += '<span class="cc-fire-t">' + esc(f.title) + '</span>';
      if (f.link_id) {
        html += '<span class="cc-fire-a" onclick="_ccNavigate(\'' + esc(f.link_type || f.type || 'task') + '\',\'' + esc(f.link_id) + '\')">Open</span>';
      }
      html += '</div>';
    });
  }
  html += '</div>';

  // Right column — Velocity, Bugs, Calendar stacked vertically
  html += '<div style="display:flex;flex-direction:column;gap:16px;">';

  // Velocity — compact
  html += '<div class="cc-card"><h3>Velocity</h3>';
  if (velocity.length > 0) {
    const maxV = Math.max(...velocity.map(v => v.completed || 0), 1);
    html += '<div style="display:flex;align-items:flex-end;gap:6px;height:70px;">';
    velocity.forEach((v, i) => {
      const completed = v.completed || 0;
      const h = Math.max(6, Math.round((completed / maxV) * 60));
      const isCurrentWeek = (i === velocity.length - 1);
      const barBg = isCurrentWeek
        ? 'background:linear-gradient(to top,#1f6feb,#58a6ff);opacity:.7;'
        : 'background:linear-gradient(to top,#238636,#3fb950);';
      const labelCol = isCurrentWeek ? '#58a6ff' : '#8b949e';
      html += '<div style="flex:1;text-align:center;">';
      html += '<div style="font-size:0.82rem;font-weight:700;color:' + labelCol + ';">' + completed + '</div>';
      html += '<div style="' + barBg + 'height:' + h + 'px;border-radius:3px 3px 0 0;margin-top:2px;"></div>';
      html += '<div style="font-size:0.75rem;color:' + labelCol + ';margin-top:3px;">' + (isCurrentWeek ? 'Now' : 'W' + (i + 1)) + '</div>';
      html += '</div>';
    });
    html += '</div>';
  } else {
    html += '<div style="color:var(--text-secondary)">No data</div>';
  }
  html += '</div>';

  // Bugs — compact
  html += '<div class="cc-card"><h3><span>Bugs</span> <span class="ct">' + (critOpen + awaitReview) + '</span></h3>';
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
  if (critOpen > 0) html += '<span class="cc-tag r">' + critOpen + ' critical</span>';
  if (awaitReview > 0) html += '<span class="cc-tag b">' + awaitReview + ' in review</span>';
  if (hotspots.length > 0) html += '<span class="cc-tag a">' + hotspots.length + ' hotspots</span>';
  if (critOpen === 0 && awaitReview === 0) html += '<span style="color:var(--success);">&#10003; All clear</span>';
  html += '</div>';
  html += '</div>';

  // Calendar — compact
  html += '<div class="cc-card"><h3><span>&#128197; Today</span> <span class="ct">' + todayEvents.length + '</span></h3>';
  if (todayEvents.length === 0) {
    html += '<div style="color:var(--text-secondary)">' + (cal.error ? esc(cal.error) : 'No events') + '</div>';
  } else {
    todayEvents.slice(0, 4).forEach(ev => {
      const t = ev.start ? new Date(ev.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
      html += '<div class="cc-row">';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(ev.title || '') + '</div>';
      html += '<div class="cc-row-m">' + esc(t) + (ev.location ? ' · ' + esc(ev.location) : '') + '</div>';
      html += '</div>';
      if (ev.online_url) {
        html += '<div class="cc-row-a"><button class="cc-btn p" onclick="window.open(\'' + esc(ev.online_url) + '\',\'_blank\')">Join</button></div>';
      }
      html += '</div>';
    });
  }
  html += '</div>';

  html += '</div>'; // end right column stack
  html += '</div>'; // end row 1

  // === ROW 2: Client Health + Milestones + Team Workload (3 columns) ===
  var ph = _ccProjectHealth || {};
  var ch = ph.client_health || [];
  var miles = ph.milestones || [];
  var sows = ph.sow_status || [];
  var tw = _ccTeamWorkload || {};
  var assignees = tw.assignees || [];
  var timeLogged = tw.time_logged || [];
  var spof = tw.spof || [];

  html += '<div class="cc-grid-3">';

    // Left: Client Health card
    html += '<div class="cc-card"><h3><span>&#128202; Client Health</span> <span class="ct">risk signals</span></h3>';
    ch.forEach(function(client) {
      var riskColour = client.risk === 'red' ? '#f85149' : client.risk === 'amber' ? '#d29922' : '#3fb950';
      var riskBg = client.risk === 'red' ? 'rgba(248,81,73,.12)' : client.risk === 'amber' ? 'rgba(210,153,34,.12)' : 'rgba(63,185,80,.12)';
      var daysCol = client.days_since_activity > 14 ? '#f85149' : client.days_since_activity > 7 ? '#d29922' : '#8b949e';
      html += '<div class="cc-row">';
      html += '<div class="cc-row-icon" style="background:' + riskBg + ';color:' + riskColour + ';font-size:.65rem;font-weight:700;">' + client.pct_complete + '%</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(client.client_name) + '</div>';
      html += '<div class="cc-row-m">';
      html += '<span style="color:var(--text-secondary);">' + client.done + '/' + client.total + ' done</span>';
      if (client.overdue > 0) html += ' <span class="cc-tag r" style="cursor:pointer" data-action="_actNeedsAttnOverdue" data-arg0="' + esc(client.client_name) + '" data-stop>' + client.overdue + ' overdue</span>';
      if (client.blocked > 0) html += ' <span class="cc-tag a" style="cursor:pointer" data-action="_actNeedsAttnBlocked" data-arg0="' + esc(client.client_name) + '" data-stop>' + client.blocked + ' blocked</span>';
      html += '</div>';
      html += '</div>';
      html += '<div style="font-size:0.75rem;color:' + daysCol + ';white-space:nowrap;text-align:right;">' + client.days_since_activity + 'd ago</div>';
      html += '</div>';
    });
    if (ch.length === 0) {
      html += '<div style="padding:8px 0;font-size:0.82rem;color:var(--text-secondary)">No active client work</div>';
    }
    html += '</div>';

    // Right: Milestones & Contracts card
    html += '<div class="cc-card"><h3><span>&#127937; Milestones &amp; Contracts</span> <span class="ct">upcoming</span></h3>';

    // Upcoming Milestones subsection
    if (miles.length > 0) {
      html += '<div class="cc-section-hdr">Upcoming Milestones</div>';
      miles.slice(0, 5).forEach(function(m) {
        var daysUntil = m.target_date ? Math.ceil((new Date(m.target_date) - Date.now()) / 86400000) : null;
        var urgCol = daysUntil !== null && daysUntil <= 7 ? '#f85149' : daysUntil !== null && daysUntil <= 21 ? '#d29922' : '#8b949e';
        var totalItems = parseInt(m.total_items, 10) || 0;
        var doneItems = parseInt(m.done_items, 10) || 0;
        var pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
        var pctBg = pct >= 80 ? 'rgba(63,185,80,.12)' : pct >= 40 ? 'rgba(210,153,34,.12)' : 'rgba(88,166,255,.12)';
        var pctCol = pct >= 80 ? '#3fb950' : pct >= 40 ? '#d29922' : '#58a6ff';
        html += '<div class="cc-row">';
        html += '<div class="cc-row-icon" style="background:' + pctBg + ';color:' + pctCol + ';font-size:0.75rem;font-weight:700;">' + pct + '%</div>';
        html += '<div class="cc-row-b">';
        html += '<div class="cc-row-t">' + esc(m.title) + '</div>';
        html += '<div class="cc-row-m"><span style="color:var(--text-secondary);">' + esc(m.client_name) + '</span>';
        if (totalItems > 0) html += ' <span style="color:var(--text-muted);">' + doneItems + '/' + totalItems + ' items</span>';
        html += '</div>';
        html += '</div>';
        if (daysUntil !== null) {
          html += '<div style="font-size:0.75rem;color:' + urgCol + ';white-space:nowrap;text-align:right;">' + daysUntil + 'd</div>';
        }
        html += '</div>';
      });
    }

    // Active SOWs subsection
    if (sows.length > 0) {
      html += '<div class="cc-section-hdr" style="margin-top:8px;">Active Contracts / SOWs</div>';
      sows.slice(0, 4).forEach(function(s2) {
        var daysRem = s2.days_remaining;
        var remCol = daysRem !== null && daysRem <= 14 ? '#f85149' : daysRem !== null && daysRem <= 30 ? '#d29922' : '#8b949e';
        html += '<div class="cc-row">';
        html += '<div class="cc-row-icon" style="background:rgba(88,166,255,.1);color:var(--accent-text);">&#128196;</div>';
        html += '<div class="cc-row-b">';
        html += '<div class="cc-row-t">' + esc(s2.title) + '</div>';
        html += '<div class="cc-row-m"><span style="color:var(--text-secondary);">' + esc(s2.client_name) + '</span>';
        if (s2.expiring_soon) html += ' <span class="cc-tag r">expiring</span>';
        html += '</div>';
        html += '</div>';
        if (daysRem !== null) {
          html += '<div style="font-size:0.75rem;color:' + remCol + ';white-space:nowrap;text-align:right;">' + daysRem + 'd left</div>';
        }
        html += '</div>';
      });
    }

    if (miles.length === 0 && sows.length === 0) {
      html += '<div style="padding:8px 0;color:var(--text-secondary)">No upcoming milestones or active contracts</div>';
    }
    html += '</div>';

    // Team Workload — third column (grouped by client)
    html += '<div class="cc-card"><h3><span>&#128101; Team</span> <span class="ct">' + assignees.length + ' people</span></h3>';
    if (assignees.length === 0) {
      html += '<div style="color:var(--text-secondary)">No assignee data</div>';
    } else {
      var clientTeamMap = {};
      assignees.forEach(function(a) {
        (a.clients || []).forEach(function(cl) {
          if (cl.count <= 0) return;
          var cn = cl.client || 'Unassigned';
          if (!clientTeamMap[cn]) clientTeamMap[cn] = { total: 0, people: [] };
          clientTeamMap[cn].total += cl.count;
          clientTeamMap[cn].people.push({ name: a.name, count: cl.count });
        });
      });
      var clientTeamList = Object.entries(clientTeamMap)
        .map(function(e) { return { name: e[0], total: e[1].total, people: e[1].people }; })
        .sort(function(a, b) { return b.total - a.total; });
      clientTeamList.forEach(function(cl) {
        cl.people.sort(function(a, b) { return b.count - a.count; });
        html += '<div style="margin-bottom:12px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
        html += '<span style="font-size:0.85rem;font-weight:600;">' + esc(cl.name) + '</span>';
        html += '<span style="font-size:0.78rem;color:var(--text-secondary);">' + cl.total + ' tasks</span>';
        html += '</div>';
        cl.people.forEach(function(p) {
          var countCol = p.count > 15 ? '#f85149' : p.count > 10 ? '#d29922' : 'var(--text-secondary)';
          html += '<div style="display:flex;justify-content:space-between;padding:2px 0 2px 12px;font-size:0.82rem;">';
          html += '<span>' + esc(p.name) + '</span>';
          html += '<span style="font-weight:600;color:' + countCol + ';">' + p.count + '</span>';
          html += '</div>';
        });
        html += '</div>';
      });
    }
    if (spof.length > 0) {
      html += '<div class="cc-section-hdr" style="color:var(--danger);margin-top:12px;">SPOF</div>';
      spof.forEach(function(sp) {
        html += '<div style="font-size:0.82rem;color:var(--danger);padding:3px 0;">' + esc(sp.assignee) + ' owns ' + sp.pct + '% of ' + esc(sp.client_name) + '</div>';
      });
    }
    html += '</div>';

  html += '</div>'; // end row 2

  // === ROW 3: Handoff Hub + Work Queue + Improvements (3 columns) ===
  html += '<div class="cc-grid-3">';

  // Handoff Hub
  var hf = _ccHandoffs || {};
  var handoffProjects = hf.projects || [];
  html += '<div class="cc-card"><h3><span>&#128221; Handoffs</span> <span class="ct">' + handoffProjects.length + '</span></h3>';
  if (handoffProjects.length === 0) {
    html += '<div style="color:var(--text-secondary)">No handoff files found</div>';
  } else {
    handoffProjects.forEach(function(p) {
      var h = p.latest_handoff || {};
      var age = h.date ? Math.floor((Date.now() - new Date(h.date).getTime()) / 86400000) : 999;
      var ageColour = age <= 1 ? '#3fb950' : age <= 3 ? '#d29922' : '#8b949e';
      var ageLabel = age === 0 ? 'today' : age === 1 ? 'yesterday' : age + 'd ago';
      html += '<div class="cc-row">';
      html += '<div class="cc-row-icon" style="background:rgba(163,113,247,.1);color:var(--purple);">&#128196;</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(p.project.replace(/_/g, ' ')) + '</div>';
      html += '<div class="cc-row-m"><span style="color:' + ageColour + ';">' + esc(ageLabel) + '</span>';
      if (h.branch) html += ' &middot; <span style="font-family:monospace;font-size:0.75rem;color:var(--text-secondary);">' + esc(h.branch) + '</span>';
      html += '</div></div>';
      html += '<div class="cc-row-a"><button class="cc-btn pu">Resume</button></div>';
      html += '</div>';
    });
  }
  html += '</div>';

  // Work Queue
  html += '<div class="cc-card"><h3><span>&#128293; Work Queue</span> <span class="ct">attention needed</span></h3>';
  const wq = b.work_queue || {};
  const overdue = (wq.overdue || []).slice(0, 4);
  const dueToday = (wq.due_today || []).slice(0, 3);
  const attentionItems = overdue.concat(dueToday);
  if (attentionItems.length === 0) {
    html += '<div style="padding:8px 0;color:var(--text-secondary)">Nothing urgent</div>';
  } else {
    attentionItems.forEach(item => {
      const isOverdue = overdue.includes(item);
      const iconBg = isOverdue ? 'background:rgba(248,81,73,.1);color:var(--danger);' : 'background:rgba(210,153,34,.1);color:var(--warning);';
      const iconChar = isOverdue ? '!!' : '!';
      html += '<div class="cc-row">';
      html += '<div class="cc-row-icon" style="' + iconBg + 'font-weight:700;">' + iconChar + '</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(item.title || '') + '</div>';
      html += '<div class="cc-row-m"><span class="cc-tag ' + (isOverdue ? 'r' : 'a') + '">' + (isOverdue ? 'overdue' : 'today') + '</span></div>';
      html += '</div>';
      if (item.id) {
        html += '<div class="cc-row-a"><button class="cc-btn" onclick="_ccNavigate(\'task\',\'' + esc(item.id) + '\')">Open</button></div>';
      }
      html += '</div>';
    });
  }
  html += '</div>';

  // Improvements
  html += '<div class="cc-card"><h3><span>&#128640; Improvements</span> <span class="ct">suggested</span></h3>';
  const kf = b.knowledge_flags || {};
  const staleBrain = kf.stale_brain_modules || [];
  const conn = s.connections || {};
  const buckets = conn.buckets || {};
  const missingConns = Object.entries(buckets).filter(([,v]) => v.status === 'missing');
  let improvCount = 0;
  if (staleBrain.length > 0) { improvCount++; html += '<div class="cc-row"><div class="cc-row-icon" style="background:rgba(210,153,34,.1);color:var(--warning);">&#128218;</div><div class="cc-row-b"><div class="cc-row-t">' + staleBrain.length + ' brain modules stale (&gt;30d)</div><div class="cc-row-m">Knowledge freshness</div></div><button class="cc-btn pu">Refresh</button></div>'; }
  if (missingConns.length > 0) { improvCount++; html += '<div class="cc-row"><div class="cc-row-icon" style="background:rgba(248,81,73,.1);color:var(--danger);">&#128279;</div><div class="cc-row-b"><div class="cc-row-t">' + missingConns.length + ' blind spots</div><div class="cc-row-m">' + esc(missingConns.slice(0,3).map(([n]) => n).join(', ')) + '</div></div><button class="cc-btn pu" onclick="_ccToggleImprov(\'blind-spots\')">Connect</button></div>'; html += '<div class="cc-improv-detail" id="cc-improv-blind-spots">'; missingConns.forEach(function(mc) { html += '<div class="cc-improv-item cc-improv-item--red"><span class="cc-improv-name">' + esc(mc[0]) + '</span><span class="cc-improv-age">not configured</span></div>'; }); html += '</div>'; }
  if (kf.dormant_roles_count > 0) { improvCount++; html += '<div class="cc-row"><div class="cc-row-icon" style="background:rgba(163,113,247,.1);color:var(--purple);">&#9889;</div><div class="cc-row-b"><div class="cc-row-t">' + kf.dormant_roles_count + ' dormant roles</div><div class="cc-row-m">Role dispatch system</div></div><button class="cc-btn pu">Backlog</button></div>'; }
  if ((kf.stale_memory_files || []).length > 0) { var smf = kf.stale_memory_files; improvCount++; html += '<div class="cc-row"><div class="cc-row-icon" style="background:rgba(210,153,34,.1);color:var(--warning);">&#128203;</div><div class="cc-row-b"><div class="cc-row-t">' + smf.length + ' stale memory files</div><div class="cc-row-m">Reference moved targets</div></div><button class="cc-btn pu" onclick="_ccToggleImprov(\'stale-memory\')">Review</button></div>'; html += '<div class="cc-improv-detail" id="cc-improv-stale-memory">'; smf.forEach(function(mf) { html += '<div class="cc-improv-item cc-improv-item--amber"><span class="cc-improv-name">' + esc(mf.name || mf.file || '') + '</span><span class="cc-improv-age">' + (mf.reason || 'target may have moved') + '</span></div>'; }); html += '</div>'; }
  if (improvCount === 0) { html += '<div style="padding:8px 0;color:var(--success)">&#10003; All systems healthy</div>'; }
  html += '</div>';

  html += '</div>';

  // === ROW 4: Dreaming Engine — Overnight Insights + Trends + Stale Report ===
  var dr = b.dreaming;
  if (dr) {
    var drInsights = dr.insights || [];
    var drTrends = dr.trends || {};
    var drStale = dr.stale_report || {};
    var staleTotal = (drStale.memory_files || []).length + (drStale.brain_modules || []).length + (drStale.skills_without_learnings || []).length + (drStale.roles_without_knowledge || []).length;

    html += '<div class="cc-grid-3">';

    html += '<div class="cc-card" style="grid-column:span 2;"><h3><span>&#127769; Overnight Insights</span> <span class="ct">' + drInsights.length + '</span></h3>';
    if (drInsights.length === 0) {
      html += '<div style="padding:8px 0;color:var(--success)">&#10003; No issues detected overnight</div>';
    } else {
      var sevBorders = { critical: '#f85149', warning: '#d29922', info: '#58a6ff' };
      var sevBgs2 = { critical: 'rgba(248,81,73,.06)', warning: 'rgba(210,153,34,.06)', info: 'rgba(88,166,255,.06)' };
      var catBadges = { risk: 'Risk', drift: 'Drift', stale: 'Stale', gap: 'Gap', achievement: 'Win', pattern: 'Pattern' };
      drInsights.forEach(function(ins) {
        var bc = sevBorders[ins.severity] || '#8b949e';
        var bg2 = sevBgs2[ins.severity] || 'transparent';
        var badge = catBadges[ins.category] || ins.category;
        html += '<div class="cc-row" style="border-left:3px solid ' + bc + ';background:' + bg2 + ';margin-bottom:6px;padding:8px 12px;border-radius:4px;">';
        html += '<div class="cc-row-b" style="flex:1;">';
        html += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:2px;">';
        html += '<span class="cc-tag" style="background:' + bc + '22;color:' + bc + ';font-size:0.75rem;">' + esc(badge) + '</span>';
        html += '<span class="cc-row-t" style="font-size:0.85rem;">' + esc(ins.title) + '</span>';
        html += '</div>';
        html += '<div class="cc-row-m" style="font-size:0.8rem;">' + esc(ins.body) + '</div>';
        html += '</div>';
        var ev = (ins.evidence || []).join(',');
        var navTarget = '';
        if (ev.includes('bug:') || ins.title.toLowerCase().includes('bug')) navTarget = 'bugs';
        else if (ev.includes('task:') || ins.title.toLowerCase().includes('task') || ins.title.toLowerCase().includes('stalled')) navTarget = 'tasks';
        else if (ev.includes('assignee:') || ins.title.toLowerCase().includes('utilisation')) navTarget = 'people';
        else if (ev.includes('memory:') || ev.includes('brain:') || ev.includes('skill:') || ev.includes('role:')) navTarget = 'commandcentre-aios';
        if (ins.action || navTarget) {
          var btnClick = navTarget === 'commandcentre-aios' ? '_ccSwitchTab(\'aios\')' : (navTarget ? 'switchView(\'' + navTarget + '\')' : '');
          var btnLabel = navTarget ? (navTarget === 'bugs' ? 'View bugs' : navTarget === 'tasks' ? 'View tasks' : navTarget === 'people' ? 'View people' : 'View AIOS') : esc(ins.action.length > 30 ? ins.action.slice(0, 28) + '...' : ins.action);
          html += '<div class="cc-row-a" style="min-width:auto;"><button class="cc-btn" onclick="' + btnClick + '" style="font-size:0.75rem;white-space:nowrap;">' + btnLabel + '</button></div>';
        }
        html += '</div>';
      });
    }
    if (dr.generated_at) {
      html += '<div style="margin-top:8px;font-size:0.75rem;color:var(--text-muted);">Generated ' + new Date(dr.generated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' (' + dr.duration_ms + 'ms)</div>';
    }
    html += '</div>';

    html += '<div style="display:flex;flex-direction:column;gap:16px;">';

    html += '<div class="cc-card"><h3><span>&#128200; Trends</span> <span class="ct">7-day</span></h3>';
    var trendLabels = { bugs_velocity: 'Bugs', task_velocity: 'Tasks', capacity_pressure: 'Capacity', test_health: 'Tests' };
    var trendKeys = Object.keys(trendLabels);
    trendKeys.forEach(function(key) {
      var t = drTrends[key];
      if (!t) return;
      var arrow = t.trend === 'improving' ? '&#9650;' : t.trend === 'worsening' ? '&#9660;' : '&#8212;';
      var col2 = t.trend === 'improving' ? '#3fb950' : t.trend === 'worsening' ? '#f85149' : '#8b949e';
      var val = '';
      if (key === 'bugs_velocity') val = 'net ' + (t.net > 0 ? '+' : '') + t.net;
      else if (key === 'task_velocity') val = t.completed_7d + ' done';
      else if (key === 'capacity_pressure') val = t.avg_util_pct + '% avg';
      else if (key === 'test_health') val = (t.pass_rate || 0) + '% pass';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #21262d;">';
      html += '<span style="font-size:0.82rem;">' + trendLabels[key] + '</span>';
      html += '<span style="font-size:0.82rem;color:' + col2 + ';">' + arrow + ' ' + val + '</span>';
      html += '</div>';
    });
    html += '</div>';

    if (staleTotal > 0) {
      html += '<div class="cc-card"><h3><span>&#128203; Stale Report</span> <span class="ct">' + staleTotal + '</span></h3>';
      (drStale.brain_modules || []).forEach(function(m) {
        html += '<div style="font-size:0.8rem;padding:2px 0;color:var(--text-secondary);">&#128218; ' + esc(m.name) + ' <span style="color:var(--warning);">(' + m.days_stale + 'd)</span></div>';
      });
      (drStale.memory_files || []).slice(0, 5).forEach(function(f) {
        html += '<div style="font-size:0.8rem;padding:2px 0;color:var(--text-secondary);">&#128203; ' + esc(f.name) + ' <span style="color:' + (f.broken_refs ? '#f85149' : '#d29922') + ';">(' + f.days_stale + 'd' + (f.broken_refs ? ' + broken refs' : '') + ')</span></div>';
      });
      if ((drStale.skills_without_learnings || []).length > 0) {
        html += '<div style="font-size:0.8rem;padding:2px 0;color:var(--text-secondary);">&#9889; ' + drStale.skills_without_learnings.length + ' skills without learnings</div>';
      }
      if ((drStale.roles_without_knowledge || []).length > 0) {
        html += '<div style="font-size:0.8rem;padding:2px 0;color:var(--text-secondary);">&#128101; ' + drStale.roles_without_knowledge.length + ' roles without knowledge</div>';
      }
      html += '</div>';
    }

    html += '</div>';
    html += '</div>';
  } else {
    html += '<div class="cc-card" style="margin-top:16px;text-align:center;padding:20px;"><span style="color:var(--text-secondary);font-size:0.85rem;">&#127769; Overnight analysis will appear here after the first nightly run at 03:00.</span></div>';
  }

  return html;
}

// ——— PIPELINE / AIOS / COMMS / MONEY TAB RENDERERS ———

function _ccRenderPipelineTab() {
  var p = _ccPipeline;
  if (!p) return '<div class="cc-panel-empty">Loading pipeline data...</div>';
  return _ccRenderPipelineContent(p);
}

function _ccRenderMoneyTab() {
  if (!_ccFinancialPulse) return '<div class="cc-panel-empty">Loading financial data...</div>';

  var f = _ccFinancialPulse;
  var rev = f.revenue || {};
  var costs = f.costs || {};
  var margins = f.margins || {};
  var pipe = f.pipeline || {};
  var contracts = f.contracts || {};

  // helper: format money as £Xk
  function fmtK(v) { return '&pound;' + Math.round((v || 0) / 1000) + 'k'; }
  function fmtPct(v) { return Math.round(v || 0) + '%'; }

  // colour helpers
  function grossMarginColour(pct) {
    if (pct >= 40) return '#3fb950';
    if (pct >= 20) return '#d29922';
    return '#f85149';
  }
  function netMarginColour(pct) {
    if (pct >= 15) return '#3fb950';
    if (pct >= 0) return '#d29922';
    return '#f85149';
  }
  function targetColour(pct) {
    if (pct >= 80) return '#3fb950';
    if (pct >= 50) return '#d29922';
    return '#f85149';
  }

  var gm = margins.gross_margin_pct || 0;
  var nm = margins.net_margin_pct || 0;
  var tp = rev.target_pct || 0;

  var html = '';

  // ——— TOP ROW: 6 KPI STAT TILES ———
  html += '<div class="cc-kpi-grid">';

  // Annual Revenue
  html += '<div class="cc-stat">';
  html += '<div class="v" style="color:var(--success);">' + fmtK(rev.annual_contracted) + '</div>';
  html += '<div class="s">Annual Revenue</div>';
  html += '</div>';

  // Monthly Burn
  html += '<div class="cc-stat">';
  html += '<div class="v" style="color:var(--danger);">' + fmtK(costs.monthly_burn) + '</div>';
  html += '<div class="s">Monthly Burn</div>';
  html += '</div>';

  // Gross Margin
  html += '<div class="cc-stat">';
  html += '<div class="v" style="color:' + grossMarginColour(gm) + ';">' + fmtPct(gm) + '</div>';
  html += '<div class="s">Gross Margin</div>';
  html += '</div>';

  // Net Margin
  html += '<div class="cc-stat">';
  html += '<div class="v" style="color:' + netMarginColour(nm) + ';">' + fmtPct(nm) + '</div>';
  html += '<div class="s">Net Margin</div>';
  html += '</div>';

  // Pipeline
  html += '<div class="cc-stat">';
  html += '<div class="v" style="color:var(--accent-text);">' + fmtK(pipe.total_value) + '</div>';
  html += '<div class="s">Pipeline</div>';
  html += '</div>';

  // Revenue vs Target
  html += '<div class="cc-stat">';
  html += '<div class="v" style="color:' + targetColour(tp) + ';">' + fmtPct(tp) + '</div>';
  html += '<div class="s">vs Target</div>';
  html += '</div>';

  html += '</div>'; // end KPI grid

  // ——— ROW 2: 3-COLUMN GRID ———
  html += '<div class="cc-grid-3">';

  // —— CARD 1: Revenue by Client ——
  html += '<div class="cc-card">';
  html += '<h3><span>&#128200; Revenue by Client</span></h3>';
  var byClient = rev.by_client || [];
  var maxVal = 0;
  for (var bi = 0; bi < byClient.length; bi++) {
    if ((byClient[bi].annual || 0) > maxVal) maxVal = byClient[bi].annual;
  }
  if (byClient.length === 0) {
    html += '<div style="color:var(--text-secondary);font-size:0.85rem;">No client revenue data.</div>';
  } else {
    for (var ci = 0; ci < byClient.length; ci++) {
      var cl = byClient[ci];
      var pct = maxVal > 0 ? Math.round((cl.annual || 0) / maxVal * 100) : 0;
      html += '<div style="margin-bottom:10px;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
      html += '<span style="font-size:0.85rem;color:var(--text-primary);">' + esc(cl.client || '') + '</span>';
      html += '<span style="font-size:0.9rem;font-weight:700;color:var(--success);">' + fmtK(cl.annual) + '</span>';
      html += '</div>';
      html += '<div style="height:6px;background:var(--bg-surface);border-radius:3px;overflow:hidden;">';
      html += '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#238636,#3fb950);border-radius:3px;"></div>';
      html += '</div>';
      html += '</div>';
    }
  }
  html += '</div>'; // end revenue card

  // —— CARD 2: Cost Structure ——
  html += '<div class="cc-card">';
  html += '<h3><span>&#128182; Cost Structure</span></h3>';

  var payroll = costs.annual_payroll || 0;
  var opex = costs.annual_opex || 0;
  var totalCost = payroll + opex;
  var payrollPct = totalCost > 0 ? Math.round(payroll / totalCost * 100) : 0;
  var opexPct = totalCost > 0 ? 100 - payrollPct : 0;

  // stacked bar
  html += '<div style="height:12px;background:var(--bg-surface);border-radius:6px;overflow:hidden;margin-bottom:12px;display:flex;">';
  if (payrollPct > 0) {
    html += '<div style="width:' + payrollPct + '%;background:#f85149;" title="Staff ' + payrollPct + '%"></div>';
  }
  if (opexPct > 0) {
    html += '<div style="width:' + opexPct + '%;background:#d29922;" title="OpEx ' + opexPct + '%"></div>';
  }
  html += '</div>';

  // legend + rows
  html += '<div style="display:flex;gap:12px;margin-bottom:12px;">';
  html += '<span style="font-size:0.78rem;color:var(--danger);">&#9632; Staff</span>';
  html += '<span style="font-size:0.78rem;color:var(--warning);">&#9632; OpEx</span>';
  html += '</div>';

  html += '<div class="cc-row">';
  html += '<div class="cc-row-b"><div class="cc-row-t">Annual Payroll</div></div>';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--danger);">' + fmtK(payroll) + '</div>';
  html += '</div>';

  html += '<div class="cc-row">';
  html += '<div class="cc-row-b"><div class="cc-row-t">Annual OpEx</div></div>';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--warning);">' + fmtK(opex) + '</div>';
  html += '</div>';

  html += '<div class="cc-row">';
  html += '<div class="cc-row-b"><div class="cc-row-t">Total Cost Base</div></div>';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--text-secondary);">' + fmtK(costs.annual_full_cost) + '</div>';
  html += '</div>';

  html += '<div style="margin-top:10px;display:flex;gap:16px;">';
  html += '<div style="text-align:center;">';
  html += '<div style="font-size:1.1rem;font-weight:800;color:var(--text-primary);">' + (costs.headcount || 0) + '</div>';
  html += '<div style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.4px;">Headcount</div>';
  html += '</div>';
  html += '<div style="text-align:center;">';
  html += '<div style="font-size:1.1rem;font-weight:800;color:var(--text-primary);">' + (costs.billable_count || 0) + '</div>';
  html += '<div style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.4px;">Billable</div>';
  html += '</div>';
  html += '</div>';

  html += '</div>'; // end cost card

  // —— CARD 3: Contracts ——
  html += '<div class="cc-card">';
  html += '<h3><span>&#128196; Contracts</span> <span class="ct">' + fmtK(contracts.total_value) + '</span></h3>';

  var byContractClient = contracts.by_client || [];
  if (byContractClient.length > 0) {
    html += '<div class="cc-section-hdr">Contract Values</div>';
    for (var ki = 0; ki < byContractClient.length; ki++) {
      var kc = byContractClient[ki];
      html += '<div class="cc-row">';
      html += '<div class="cc-row-icon" style="background:rgba(88,166,255,.1);color:var(--accent-text);">&#128196;</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(kc.name || '') + '</div>';
      html += '</div>';
      html += '<div style="font-size:0.9rem;font-weight:700;color:var(--accent-text);">' + fmtK(kc.value) + '</div>';
      html += '</div>';
    }
  }

  var expiringSows = contracts.expiring_sows || [];
  if (expiringSows.length > 0) {
    html += '<div class="cc-section-hdr" style="margin-top:12px;">Expiring Soon</div>';
    for (var ei = 0; ei < expiringSows.length; ei++) {
      var sow = expiringSows[ei];
      var sowDate = sow.end_date ? sow.end_date.substring(0, 10) : '';
      html += '<div class="cc-row">';
      html += '<div class="cc-row-icon" style="background:rgba(248,81,73,.1);color:var(--danger);">&#9888;</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(sow.title || '') + '</div>';
      if (sowDate) html += '<div class="cc-row-m">Expires ' + esc(sowDate) + '</div>';
      html += '</div>';
      html += '</div>';
    }
  }

  if (byContractClient.length === 0 && expiringSows.length === 0) {
    html += '<div style="color:var(--text-secondary);font-size:0.85rem;padding:8px 0;">No contract data available.</div>';
  }

  html += '</div>'; // end contracts card

  html += '</div>'; // end cc-grid-3

  // ——— FOOTER ———
  if (f.last_updated) {
    html += '<div style="margin-top:14px;text-align:right;font-size:0.78rem;color:var(--text-muted);">Finance data last updated: ' + esc(f.last_updated) + '</div>';
  }

  return html;
}

var _ccAiosRefreshing = false;
var _ccAiosLastRefresh = 0;

async function _ccAiosRefresh(btnEl) {
  if (_ccAiosRefreshing) return;
  var now = Date.now();
  if (now - _ccAiosLastRefresh < 35000) {
    if (btnEl) toast('Snapshot already refreshed — data is current', 'info');
    return;
  }
  _ccAiosRefreshing = true;
  _ccAiosLastRefresh = now;
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = '...'; }
  try {
    await apiCall('/api/command-centre/refresh', { method: 'POST' });
    var res = await apiCall('/api/command-centre/aios-detail');
    _ccAiosDetail = res.data || res;
    if (currentView === 'commandcentre' && _ccTab === 'aios') {
      var el = document.getElementById('mainContent');
      if (el) renderCommandCentre(el);
    }
  } catch (e) {
    console.warn('[CC] AIOS refresh failed:', e);
    _ccAiosLastRefresh = 0;
    toast('Refresh failed: ' + (e.message || 'unknown error'), 'error');
  }
  _ccAiosRefreshing = false;
}

function _ccRenderAiosTab() {
  var a = _ccAiosDetail;
  if (!a) return '<div class="cc-panel-empty">Loading AIOS data...</div>';
  return _ccRenderAiosContent(a);
}

function _ccRenderCommsTab() {
  return '<div class="cc-panel-empty">Comms Debt &mdash; coming in Phase 3.<br><span style="font-size:0.75rem;color:var(--text-muted);">Email backlog, meeting actions, follow-ups.</span></div>';
}

function _ccRenderIntelTab() {
  var html = '<div class="cc-intel" id="ccIntelContent"><div class="cc-panel-empty">Loading intelligence...</div></div>';
  setTimeout(function() {
    var el = document.getElementById('ccIntelContent');
    if (!el) return;
    Promise.all([
      authFetch('/api/intelligence/brief').then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
      authFetch('/api/intelligence/banks').then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; }),
      authFetch('/api/intelligence/research?limit=5').then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; }),
      authFetch('/api/intelligence/pipeline').then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; })
    ]).then(function(results) {
      var brief = results[0], banks = results[1], research = results[2], pipeline = results[3];
      var h = '';
      // Brief card
      if (brief) {
        h += '<div class="cc-intel-brief">';
        h += '<div class="cc-intel-hdr"><span class="cc-intel-title">Intelligence Brief</span>';
        h += '<span class="cc-intel-date">' + (brief.generated || '') + (brief.stale ? ' <span class="cc-intel-stale">(stale)</span>' : '') + '</span></div>';
        var sKeys = Object.keys(brief.sections || {});
        sKeys.forEach(function(key) {
          var items = brief.sections[key];
          if (!items || !items.length) return;
          var isAction = key.toLowerCase().indexOf('action') >= 0;
          h += '<div class="cc-intel-section">';
          h += '<div class="cc-intel-section-hdr" onclick="this.parentElement.classList.toggle(\'collapsed\')">';
          if (isAction) h += '<span class="cc-intel-dot"></span>';
          h += '<span class="cc-intel-arrow">&#9662;</span> ' + esc(key) + ' <span class="cc-intel-count">(' + items.length + ')</span></div>';
          h += '<div class="cc-intel-section-body"><ul>';
          items.forEach(function(item) { h += '<li>' + esc(item) + '</li>'; });
          h += '</ul></div></div>';
        });
        h += '</div>';
      }
      // Bank health (full table with shelf life + last compiled)
      if (banks.length) {
        h += '<div class="cc-intel-banks"><div class="cc-intel-hdr"><span class="cc-intel-title">Bank Health</span></div>';
        h += '<table class="cc-intel-table"><thead><tr><th>Bank</th><th>Lines</th><th>Capacity</th><th>Sources</th><th>Last Compiled</th><th>Shelf Life</th><th>Status</th></tr></thead><tbody>';
        var tl = 0, ts = 0;
        banks.forEach(function(b) {
          tl += b.lines; ts += b.sources;
          var bc = b.status === 'fresh' ? 'var(--success)' : b.status === 'stale' ? 'var(--danger)' : 'var(--warning)';
          h += '<tr><td><strong>' + b.slug.replace(/_/g, ' ') + '</strong></td>';
          h += '<td>' + b.lines + '</td>';
          h += '<td><div class="cc-intel-bar"><div class="cc-intel-bar-fill" style="width:' + b.capacity + '%;background:' + bc + '"></div></div>' + b.capacity + '%</td>';
          h += '<td>' + b.sources + '</td>';
          h += '<td>' + (b.lastCompiled || 'never') + '</td>';
          h += '<td>' + (b.shelfLife || '-') + '</td>';
          h += '<td><span class="cc-intel-status--' + b.status + '">' + b.status.charAt(0).toUpperCase() + b.status.slice(1) + '</span></td></tr>';
        });
        h += '</tbody></table>';
        h += '<div class="cc-intel-total">' + tl + ' lines &middot; ' + ts + ' source refs</div></div>';
      }
      // Research
      if (research.length) {
        h += '<div class="cc-intel-research"><div class="cc-intel-hdr"><span class="cc-intel-title">Recent Research</span></div><div style="padding:12px 16px">';
        research.forEach(function(entry) {
          h += '<div class="cc-intel-research-group"><div class="cc-intel-research-date">' + (entry.date || '') + ' <span class="cc-intel-domain">' + (entry.domain || '') + '</span></div>';
          entry.findings.forEach(function(f) {
            var cls = f.relevance >= 8 ? 'cc-intel-score--high' : 'cc-intel-score--mid';
            h += '<div class="cc-intel-finding"><span class="cc-intel-score ' + cls + '">' + f.relevance + '</span><span>' + esc(f.title) + '</span></div>';
          });
          h += '</div>';
        });
        h += '</div></div>';
      }
      // Pipeline
      if (pipeline && pipeline.sources) {
        h += '<div class="cc-intel-pipeline"><div class="cc-intel-hdr"><span class="cc-intel-title">Pipeline Activity</span></div><div style="padding:12px 16px">';
        pipeline.sources.forEach(function(s) {
          var dc = s.lastRun === 'never' ? 'cc-intel-dot--amber' : 'cc-intel-dot--green';
          h += '<div class="cc-intel-source"><span>' + s.name + '</span><span><span class="cc-intel-source-dot ' + dc + '"></span>' + s.lastRun + '</span></div>';
        });
        h += '</div></div>';
      }
      // Pending actions
      if (pipeline && pipeline.pending && pipeline.pending.length) {
        h += '<div class="cc-intel-pipeline"><div class="cc-intel-hdr"><span class="cc-intel-title">Pending Actions</span><span class="cc-intel-count">(' + pipeline.pending.length + ')</span></div>';
        h += '<div style="padding:12px 16px">';
        pipeline.pending.forEach(function(p) {
          h += '<div style="padding:6px 0;font-size:13px;color:var(--text-secondary);border-bottom:1px solid rgba(42,46,61,0.4)">' + esc(p) + '</div>';
        });
        h += '</div></div>';
      }
      if (!h) h = '<div class="cc-panel-empty">No intelligence data yet. Run /intel-brief to generate.</div>';
      el.innerHTML = h;
    }).catch(function() {
      el.innerHTML = '<div class="cc-panel-empty">Intelligence brief not available.</div>';
    });
  }, 0);
  return html;
}

function _ccRenderPipelineContent(p) {
  var html = '';
  var stages = p.stages || [];
  var staleLeads = p.stale_leads || [];
  var followups = p.upcoming_followups || [];
  var analytics = p.analytics || {};
  var trend = analytics.trend || [];

  // === ROW 1: Pipeline Funnel (left) + Analytics Summary (right) ===
  html += '<div class="cc-grid-2" style="margin-bottom:14px">';

  // — Pipeline Funnel card —
  var totalCount = stages.reduce(function(sum, s) { return sum + (s.count || 0); }, 0) || 1;
  html += '<div class="cc-card">';
  html += '<h3><span>&#9654; Pipeline Funnel</span> <span class="ct">' + stages.length + ' stages &bull; ' + totalCount + ' active leads</span></h3>';
  if (stages.length === 0) {
    html += '<div style="padding:12px 0;color:var(--text-secondary);font-size:0.85rem">No pipeline stage data</div>';
  } else {
    stages.forEach(function(s) {
      var count = s.count || 0;
      var widthPct = Math.max(8, Math.round((count / totalCount) * 100));
      var colour = s.colour || '#484f58';
      var weightedFmt = s.weighted_total ? '&#163;' + Number(s.weighted_total).toLocaleString('en-GB', { maximumFractionDigits: 0 }) : '&#163;0';
      html += '<div style="margin-bottom:10px;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
      html += '<span style="font-size:0.82rem;font-weight:600;">' + esc(s.name) + '</span>';
      html += '<span style="font-size:0.75rem;color:var(--text-secondary);">' + count + ' lead' + (count !== 1 ? 's' : '') + ' &bull; ' + weightedFmt + '</span>';
      html += '</div>';
      html += '<div style="background:var(--bg-surface);border-radius:3px;height:10px;overflow:hidden;">';
      html += '<div style="background:' + esc(colour) + ';width:' + widthPct + '%;height:100%;border-radius:3px;transition:width .3s;"></div>';
      html += '</div>';
      html += '</div>';
    });
  }
  html += '</div>';

  // — Analytics Summary card —
  var totalWeighted = analytics.total_weighted_pipeline || 0;
  var convRate = analytics.conversion_rate != null ? analytics.conversion_rate : null;
  var avgDays = analytics.avg_deal_days;
  var activeLeads = stages.reduce(function(sum, s) { return sum + (s.count || 0); }, 0);

  html += '<div class="cc-card">';
  html += '<h3><span>&#9654; Analytics</span> <span class="ct">last 90 days</span></h3>';

  // 4 stat tiles in 2x2 grid
  html += '<div class="cc-money-stats">';

  // Pipeline Value
  var pipeValFmt = '&#163;' + Number(totalWeighted).toLocaleString('en-GB', { maximumFractionDigits: 0 });
  html += '<div class="cc-card cc-stat" style="padding:10px 8px;">';
  html += '<div class="s">PIPELINE VALUE</div>';
  html += '<div class="v" style="font-size:1.1rem;color:var(--success);">' + pipeValFmt + '</div>';
  html += '<div class="s">weighted open</div>';
  html += '</div>';

  // Conversion %
  var convColour = convRate != null && convRate >= 30 ? '#3fb950' : convRate != null && convRate >= 15 ? '#d29922' : '#f85149';
  html += '<div class="cc-card cc-stat" style="padding:10px 8px;">';
  html += '<div class="s">CONVERSION</div>';
  html += '<div class="v" style="color:' + convColour + ';">' + (convRate != null ? convRate + '%' : 'N/A') + '</div>';
  html += '<div class="s">win rate 90d</div>';
  html += '</div>';

  // Avg Deal Velocity
  html += '<div class="cc-card cc-stat" style="padding:10px 8px;">';
  html += '<div class="s">AVG VELOCITY</div>';
  html += '<div class="v" style="color:var(--accent-text);">' + (avgDays != null ? avgDays + 'd' : 'N/A') + '</div>';
  html += '<div class="s">avg days to close</div>';
  html += '</div>';

  // Active Leads
  html += '<div class="cc-card cc-stat" style="padding:10px 8px;">';
  html += '<div class="s">ACTIVE LEADS</div>';
  html += '<div class="v">' + activeLeads + '</div>';
  html += '<div class="s">open in funnel</div>';
  html += '</div>';

  html += '</div>';

  // Weekly trend mini bar chart — blue=new, green=closed
  if (trend.length > 0) {
    var maxTrend = Math.max.apply(null, trend.map(function(t) { return Math.max(t.new_leads || 0, t.closed_leads || 0); }).concat([1]));
    html += '<div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">8-week trend</div>';
    html += '<div style="display:flex;gap:3px;align-items:flex-end;height:48px;">';
    trend.forEach(function(t) {
      var newH = Math.max(4, Math.round(((t.new_leads || 0) / maxTrend) * 44));
      var closedH = Math.max(4, Math.round(((t.closed_leads || 0) / maxTrend) * 44));
      html += '<div style="flex:1;display:flex;align-items:flex-end;gap:1px;">';
      html += '<div style="flex:1;background:var(--accent);height:' + newH + 'px;border-radius:2px 2px 0 0;" title="New: ' + (t.new_leads || 0) + '"></div>';
      html += '<div style="flex:1;background:var(--success);height:' + closedH + 'px;border-radius:2px 2px 0 0;" title="Closed: ' + (t.closed_leads || 0) + '"></div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div style="display:flex;gap:10px;margin-top:5px;font-size:0.75rem;color:var(--text-secondary);">';
    html += '<span><span style="display:inline-block;width:8px;height:8px;background:var(--accent);border-radius:2px;margin-right:3px;"></span>New</span>';
    html += '<span><span style="display:inline-block;width:8px;height:8px;background:var(--success);border-radius:2px;margin-right:3px;"></span>Closed</span>';
    html += '</div>';
  } else {
    html += '<div style="padding:8px 0;color:var(--text-secondary);font-size:0.82rem">No trend data</div>';
  }

  html += '</div>';
  html += '</div>'; // end ROW 1 grid

  // === ROW 2: Stale Leads (left) + Follow-ups Due (right) ===
  html += '<div class="cc-grid-2">';

  // — Stale Leads card —
  html += '<div class="cc-card" style="border-color:rgba(248,81,73,0.2);background:rgba(248,81,73,0.03);">';
  html += '<h3><span><span style="color:var(--danger);margin-right:6px;">&#9888;</span> Stale Leads</span> <span class="ct">' + staleLeads.length + ' not contacted 14d+</span></h3>';
  if (staleLeads.length === 0) {
    html += '<div style="padding:12px 0;color:var(--text-secondary);font-size:0.85rem">No stale leads &mdash; pipeline is active</div>';
  } else {
    staleLeads.forEach(function(lead) {
      var daysSince = lead.last_contacted
        ? Math.floor((Date.now() - new Date(lead.last_contacted).getTime()) / 86400000)
        : null;
      var daysLabel = daysSince != null ? daysSince + 'd ago' : 'Never contacted';
      var stageColour = lead.stage_colour || '#484f58';
      html += '<div class="cc-row">';
      html += '<div class="cc-row-icon" style="background:rgba(248,81,73,.1);color:var(--danger);">&#9888;</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(lead.title || '') + '</div>';
      html += '<div class="cc-row-m">' + esc(lead.contact_name || 'No contact') + ' &bull; <span style="color:' + esc(stageColour) + ';">' + esc(lead.stage_name || '') + '</span></div>';
      html += '</div>';
      html += '<div class="cc-row-a">';
      html += '<span class="cc-tag r">' + esc(daysLabel) + '</span>';
      html += '<button class="cc-btn" onclick="switchView(\'leads\')" style="margin-left:4px;">Open</button>';
      html += '</div>';
      html += '</div>';
    });
  }
  html += '</div>';

  // — Follow-ups Due card —
  html += '<div class="cc-card" style="border-color:rgba(88,166,255,0.2);background:rgba(88,166,255,0.03);">';
  html += '<h3><span><span style="color:var(--accent-text);margin-right:6px;">&#128197;</span> Follow-ups Due</span> <span class="ct">' + followups.length + ' in next 7 days</span></h3>';
  if (followups.length === 0) {
    html += '<div style="padding:12px 0;color:var(--text-secondary);font-size:0.85rem">No follow-ups due this week</div>';
  } else {
    followups.forEach(function(lead) {
      var dueDateLabel = lead.next_followup_date
        ? new Date(lead.next_followup_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : '';
      var isOverdue = lead.next_followup_date && new Date(lead.next_followup_date) < new Date();
      var dateTagClass = isOverdue ? 'r' : 'b';
      var stageColour = lead.stage_colour || '#484f58';
      html += '<div class="cc-row">';
      html += '<div class="cc-row-icon" style="background:rgba(88,166,255,.1);color:var(--accent-text);">&#128197;</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(lead.title || '') + '</div>';
      html += '<div class="cc-row-m">' + esc(lead.contact_name || 'No contact') + ' &bull; <span style="color:' + esc(stageColour) + ';">' + esc(lead.stage_name || '') + '</span></div>';
      if (lead.next_action) {
        html += '<div class="cc-row-m" style="margin-top:2px;font-style:italic;">' + esc(lead.next_action) + '</div>';
      }
      html += '</div>';
      html += '<div class="cc-row-a">';
      html += '<span class="cc-tag ' + dateTagClass + '">' + esc(dueDateLabel) + '</span>';
      html += '<button class="cc-btn" onclick="switchView(\'leads\')" style="margin-left:4px;">Open</button>';
      html += '</div>';
      html += '</div>';
    });
  }
  html += '</div>';

  html += '</div>'; // end ROW 2 grid
  return html;
}

function _ccRenderAiosContent(a) {
  var four_cs = a.four_cs || {};
  var recs = a.recommendations || [];
  var history = a.history || [];
  var snapDate = a.snapshot_date || '';
  var html = '';

  // === ROW 1: Four Cs Detail Cards (4 equal columns) ===
  html += '<div class="cc-aios-grid">';
  var csLabels = { context: 'Context', connections: 'Connections', capabilities: 'Capabilities', cadence: 'Cadence' };
  var csIcons = { context: '&#128220;', connections: '&#128279;', capabilities: '&#9889;', cadence: '&#128197;' };
  ['context', 'connections', 'capabilities', 'cadence'].forEach(function(key) {
    var c = four_cs[key] || { score: 0, max: 10, details: [] };
    var details = c.details || [];
    var scoreColour = c.score >= 7 ? '#3fb950' : c.score >= 4 ? '#d29922' : '#f85149';
    html += '<div class="cc-card" style="text-align:center;">';
    html += '<div style="display:flex;justify-content:center;margin-bottom:8px;">' + _ccRingSvg(c.score, c.max, 56) + '</div>';
    html += '<div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-bottom:2px;">' + esc(csLabels[key]) + '</div>';
    html += '<div style="font-size:0.75rem;color:' + scoreColour + ';margin-bottom:8px;font-weight:600;">' + c.score + '/' + c.max + '</div>';
    html += '<div style="text-align:left;">';
    details.slice(0, 4).forEach(function(d) {
      html += '<div style="font-size:0.75rem;color:var(--text-secondary);padding:2px 0;border-bottom:1px solid #21262d;">' + csIcons[key] + ' ' + esc(d) + '</div>';
    });
    if (details.length === 0) {
      html += '<div style="font-size:0.75rem;color:var(--text-muted);">No data</div>';
    }
    html += '</div>';
    html += '</div>';
  });
  html += '</div>';

  // === ROW 2: Recommendations (left) + 30-Day Trend (right) ===
  html += '<div class="cc-grid-2">';

  // — Recommendations card —
  var sevColours = { red: '#f85149', amber: '#d29922', info: '#58a6ff' };
  var sevBgs = { red: 'rgba(248,81,73,.1)', amber: 'rgba(210,153,34,.1)', info: 'rgba(88,166,255,.1)' };
  var catInitials = { context: 'Cx', connections: 'Co', capabilities: 'Ca', cadence: 'Cd' };
  html += '<div class="cc-card">';
  html += '<h3><span>&#128073; Recommendations</span> <span class="ct">' + recs.length + ' items</span></h3>';
  if (recs.length === 0) {
    html += '<div style="padding:12px 0;font-size:0.85rem;color:var(--text-secondary);">All systems healthy &#10003;</div>';
  } else {
    recs.forEach(function(r) {
      var col = sevColours[r.severity] || '#8b949e';
      var bg = sevBgs[r.severity] || 'rgba(139,148,158,.1)';
      var init = catInitials[r.category] || r.category.charAt(0).toUpperCase();
      html += '<div class="cc-row">';
      html += '<div class="cc-row-icon" style="background:' + bg + ';color:' + col + ';font-size:0.75rem;font-weight:700;">' + esc(init) + '</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(r.title) + '</div>';
      html += '<div class="cc-row-m">' + esc(r.detail || '') + '</div>';
      html += '</div>';
      var actionLabel = r.action || 'view';
      html += '<div class="cc-row-a"><button class="cc-btn" onclick="_ccAiosRefresh(this)" style="font-size:0.75rem;border-color:' + col + ';color:' + col + ';">' + esc(actionLabel) + '</button></div>';
      html += '</div>';
    });
  }
  html += '</div>';

  // — 30-Day Trend card —
  html += '<div class="cc-card">';
  html += '<h3><span>&#128200; 30-Day Score Trend</span></h3>';
  if (history.length === 0) {
    html += '<div style="padding:12px 0;font-size:0.85rem;color:var(--text-secondary);">No historical data yet. Check back after multiple snapshots.</div>';
  } else {
    var maxBarHeight = 60;
    var maxPossibleScore = 40;
    html += '<div style="display:flex;align-items:flex-end;gap:3px;height:' + maxBarHeight + 'px;padding-bottom:4px;">';
    history.forEach(function(h) {
      var fc2 = h.four_cs || {};
      var total = 0;
      ['context', 'connections', 'capabilities', 'cadence'].forEach(function(k) {
        total += (fc2[k] && fc2[k].score) ? fc2[k].score : 0;
      });
      var barH = Math.max(2, Math.round((total / maxPossibleScore) * maxBarHeight));
      var barCol = total >= 28 ? '#3fb950' : total >= 18 ? '#d29922' : '#f85149';
      html += '<div title="' + esc(h.date) + ': ' + total + '/40" style="flex:1;height:' + barH + 'px;background:' + barCol + ';border-radius:2px 2px 0 0;opacity:0.85;"></div>';
    });
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;margin-top:2px;">';
    html += '<span style="font-size:0.75rem;color:var(--text-muted);">30d ago</span>';
    html += '<span style="font-size:0.75rem;color:var(--text-muted);">today</span>';
    html += '</div>';
  }
  if (snapDate) {
    html += '<div style="margin-top:10px;font-size:0.75rem;color:var(--text-muted);">Last snapshot: ' + esc(snapDate) + '</div>';
  }
  html += '</div>';

  html += '</div>'; // end cc-grid-2
  return html;
}

