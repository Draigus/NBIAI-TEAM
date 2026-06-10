// ==================== WARNINGS & ALERTS SIDEBAR ====================
// Right-hand sidebar that surfaces task warnings (imminent, late, blocked)
// and the existing notification feed in two tabs. Trigger button is hidden
// unless there is at least one warning or unread alert.
let _warnAlertTab = 'warnings';
let _warnAlertSnoozedUntil = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem('nbi_warn_snoozed') || '{}');
    // Garbage collect expired snoozes on load so the map doesn't grow unboundedly
    const now = Date.now();
    const kept = {};
    for (const [id, until] of Object.entries(raw)) {
      if (new Date(until).getTime() > now) kept[id] = until;
    }
    if (Object.keys(kept).length !== Object.keys(raw).length) {
      localStorage.setItem('nbi_warn_snoozed', JSON.stringify(kept));
    }
    return kept;
  } catch (e) { return {}; }
})();

/** Compute the list of warnings derived from the user's tasks.
 *
 *  Ownership model (Glen 2026-04-15): warnings are user-specific and NOT
 *  role-gated. A user "owns" a task if they are listed in `assignees` on
 *  that task OR on any ancestor in the task hierarchy (root project,
 *  intermediate feature, etc.). This lets PMs who own a project see
 *  warnings for every task under it without needing to be listed on
 *  each child, while keeping individual contributors scoped to the work
 *  they're actually responsible for.
 *
 *  Admins get NO special treatment — they see the same warnings as any
 *  other user based purely on ownership. This is deliberate: admins
 *  should see a quiet, personalised panel when nothing they own is on
 *  fire, not a firehose of every late task across the whole company.
 */
function computeWarnings() {
  if (!Array.isArray(tasks)) return [];
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const myName = (_currentUser && (_currentUser.displayName || _currentUser.display_name)) || '';
  if (!myName) return [];
  const warnings = [];

  // Pre-compute a set of ancestor-assignee ownership by walking each task's
  // parent chain once. Cache the per-root result so we don't walk the chain
  // for every single task on every computeWarnings() call.
  const _ownedCache = {};
  const _ownsViaAncestor = (task) => {
    // Walk up parent chain collecting every assignee list
    let cur = task;
    let guard = 0;
    while (cur && guard < 20) {
      if (cur.id && _ownedCache[cur.id] !== undefined) return _ownedCache[cur.id];
      if (Array.isArray(cur.assignees) && cur.assignees.includes(myName)) {
        if (cur.id) _ownedCache[cur.id] = true;
        return true;
      }
      if (!cur.parentId) break;
      cur = tasks.find(t => t.id === cur.parentId);
      guard++;
    }
    if (task && task.id) _ownedCache[task.id] = false;
    return false;
  };

  tasks.forEach(t => {
    if (!t || t.status === 'Done' || t.status === 'Cancelled') return;
    // Fast path: direct assignment
    const isAssigned = Array.isArray(t.assignees) && t.assignees.includes(myName);
    // Slow path: owns an ancestor (PM owns the project, warning fires on a child task)
    const ownsHierarchy = isAssigned || _ownsViaAncestor(t);
    if (!ownsHierarchy) return;

    // Skip snoozed items
    const snoozeUntil = _warnAlertSnoozedUntil[t.id];
    if (snoozeUntil && new Date(snoozeUntil) > new Date()) return;

    let warning = null;

    // Late / imminent tasks (require a due date)
    if (t.dueDate) {
      const due = safeParseDate(t.dueDate);
      if (due) {
        due.setHours(0, 0, 0, 0);
        const oneDay = 1000 * 60 * 60 * 24;
        const daysLate = Math.floor((now - due) / oneDay);
        const daysUntil = Math.floor((due - now) / oneDay);
        if (daysLate > 7) {
          warning = { severity: 'critical', type: 'late', label: daysLate + ' days late' };
        } else if (daysLate > 2) {
          warning = { severity: 'high', type: 'late', label: daysLate + ' days late' };
        } else if (daysLate >= 1) {
          warning = { severity: 'medium', type: 'late', label: daysLate + ' day' + (daysLate === 1 ? '' : 's') + ' late' };
        } else if (daysLate === 0) {
          warning = { severity: 'medium', type: 'imminent', label: 'Due today' };
        } else if (daysUntil <= 3) {
          warning = {
            severity: daysUntil <= 1 ? 'high' : 'medium',
            type: 'imminent',
            label: 'Due in ' + daysUntil + ' day' + (daysUntil === 1 ? '' : 's')
          };
        }
      }
    }

    // Blocked tasks always count as a warning, even if not late
    if (!warning && t.status === 'Blocked') {
      const bi = t.blockerInfo || t.blocker_info || {};
      const parts = [];
      if (bi.blockedOn) parts.push(bi.blockedOn);
      const people = [...(bi.internal || []), ...(bi.external || [])];
      if (people.length) parts.push('By: ' + people.join(', '));
      const deps = getIncompletePrereqs(t);
      if (deps.length) parts.push('Prereqs: ' + deps.map(d => d.title).join(', '));
      const label = parts.length > 0 ? 'Blocked — ' + parts.join(' · ') : 'Blocked';
      warning = { severity: 'high', type: 'blocked', label };
    }

    // Not started tasks with past start date
    if (!warning && t.status === 'Not started' && t.startDate) {
      const sd = safeParseDate(t.startDate);
      if (sd) {
        sd.setHours(0, 0, 0, 0);
        const daysLate = Math.floor((now - sd) / (1000 * 60 * 60 * 24));
        if (daysLate > 0) {
          warning = { severity: daysLate > 7 ? 'high' : 'medium', type: 'not_started', label: 'Not started — ' + daysLate + ' day' + (daysLate === 1 ? '' : 's') + ' past start date' };
        }
      }
    }

    // Incomplete tasks: missing required fields on active leaf tasks assigned to this user
    if (!warning && isAssigned && isTaskIncomplete(t)) {
      const missing = [];
      if (!t.hoursEstimated) missing.push('hours estimate');
      if (!t.priority) missing.push('priority');
      if (!t.assignees || t.assignees.length === 0) missing.push('assignee');
      if (!t.dueDate) missing.push('due date');
      if (!t.client) missing.push('client');
      if (missing.length > 0) {
        warning = { severity: 'medium', type: 'incomplete', label: 'Missing: ' + missing.join(', ') };
      }
    }

    if (warning) {
      warnings.push({
        id: t.id,
        title: t.title || 'Untitled',
        client: getTaskClient(t),
        dueDate: t.dueDate,
        severity: warning.severity,
        type: warning.type,
        label: warning.label,
        since: t.updatedAt || t.createdAt || ''
      });
    }
  });

  // Sort: critical > high > medium > low, then earliest due date first
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  warnings.sort((a, b) => {
    const sev = (order[a.severity] || 9) - (order[b.severity] || 9);
    if (sev !== 0) return sev;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  return warnings;
}

/** Update the header Alerts button badge and flash state */
function updateWarnAlertButton() {
  const btn = document.getElementById('headerAlertsBtn');
  const badge = document.getElementById('headerAlertsBadge');
  if (!btn || !badge) return;

  const allWarnings = typeof computeWarnings === 'function' ? computeWarnings() : [];
  const urgent = allWarnings.filter(w => w.severity === 'critical' || w.severity === 'high').length;
  const alertCount = window._lastNotificationCount || 0;
  const total = urgent + alertCount;

  if (total > 0) {
    badge.textContent = total > 99 ? '99+' : String(total);
    badge.style.display = 'inline-block';
    btn.classList.add('header-alerts-btn--active');
  } else if (allWarnings.length > 0) {
    badge.textContent = String(allWarnings.length);
    badge.style.display = 'inline-block';
    btn.classList.remove('header-alerts-btn--active');
  } else {
    badge.style.display = 'none';
    btn.classList.remove('header-alerts-btn--active');
  }

  // If panel is open, also refresh the body
  const panel = document.getElementById('warnAlertPanel');
  if (panel && panel.classList.contains('open')) renderWarnAlertContent();
}

/** Toggle the right-hand sidebar panel open or closed.
 *  Primary definition is in the standalone script block above the main script
 *  so it works even if main script evaluation fails. This re-definition
 *  upgrades it with renderWarnAlertContent support once the main script loads. */
function toggleWarnAlertSidebar() {
  const panel = document.getElementById('warnAlertPanel');
  if (!panel) return;
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
  } else {
    panel.classList.add('open');
    renderWarnAlertContent();
  }
}

/** Switch the active tab inside the warnings/alerts sidebar. */
function switchWarnAlertTab(tab) {
  _warnAlertTab = tab;
  document.querySelectorAll('.warn-alert-panel__tab').forEach(el => {
    el.classList.toggle('warn-alert-panel__tab--active', el.getAttribute('data-tab') === tab);
  });
  renderWarnAlertContent();
}

/** Render the body of the active sidebar tab. */
async function renderWarnAlertContent() {
  const list = document.getElementById('warnAlertList');
  if (!list) return;

  const warnTabCount = document.getElementById('warnTabCount');

  // Always update the warnings tab count, regardless of which tab is active
  const warnings = computeWarnings();
  if (warnTabCount) warnTabCount.textContent = warnings.length > 0 ? String(warnings.length) : '';

  if (_warnAlertTab === 'warnings') {
    // Fetch verify-match items from the server alongside the computed warnings
    let verifyMatches = [];
    try {
      const resp = await authFetch('/api/attachments/verify-matches');
      if (resp.ok) verifyMatches = await resp.json() || [];
    } catch (e) { /* non-fatal */ }

    if (warnings.length === 0 && verifyMatches.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:24px;font-size:0.82rem">No blocked, overdue, or incomplete items. Nice work.</div>';
      return;
    }
    const warnClearBtn = '<div style="padding:4px 12px;display:flex;justify-content:flex-end"><button class="btn btn--sm" data-action="clearAllWarnings" style="font-size:0.75rem;padding:2px 6px">Clear all</button></div>';
    // Update badge to include verify-match count
    const totalWarnCount = warnings.length + verifyMatches.length;
    if (warnTabCount) warnTabCount.textContent = totalWarnCount > 0 ? String(totalWarnCount) : '';

    const taskWarningsHtml = warnings.map(w => `
      <div class="warn-item warn-item--${w.severity}">
        <button type="button" class="warn-item__main" aria-label="${esc(w.severity.toUpperCase())}: ${esc(w.title)}${w.client ? ' for ' + esc(w.client) : ''}" data-action="_actOpenOverlayAndClose" data-arg0="${esc(w.id)}">
          <div class="warn-item__header">
            <div class="warn-item__title">${esc(w.title)}</div>
            <span class="warn-item__sev warn-item__sev--${w.severity}" aria-hidden="true">${esc(w.severity.toUpperCase())}</span>
          </div>
          <div class="warn-item__meta">${w.client ? esc(w.client) + ' &middot; ' : ''}${esc(w.label)}${w.since ? ' &middot; ' + timeAgo(new Date(w.since)) : ''}</div>
        </button>
        <div class="warn-item__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-action="snoozeWarning" data-arg0="${esc(w.id)}" data-arg1="24">Snooze 1 day</button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="snoozeWarning" data-arg0="${esc(w.id)}" data-arg1="168">Snooze 1 week</button>
        </div>
      </div>
    `).join('');

    const verifyMatchHtml = verifyMatches.length === 0 ? '' :
      `<div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;padding:8px 12px 4px;margin-top:${warnings.length > 0 ? '8px' : '0'}">Email attachments needing verification (${verifyMatches.length})</div>` +
      verifyMatches.map(m => {
        const label = m.entity_name ? esc(m.entity_name) : (m.entity_type + ' attachment');
        const fileName = m.original_name ? esc(m.original_name) : 'Untitled';
        return `<div class="warn-item warn-item--medium">
          <div class="warn-item__main" style="cursor:default">
            <div class="warn-item__header">
              <div class="warn-item__title">${fileName}</div>
              <span class="warn-item__sev warn-item__sev--medium" aria-hidden="true">VERIFY</span>
            </div>
            <div class="warn-item__meta">Matched to: ${label} &middot; Auto-matched from email</div>
          </div>
          <div class="warn-item__actions">
            <button type="button" class="btn btn--ghost btn--sm" data-action="_actShowVerifyAndClose" data-arg0="${esc(m.id)}" data-arg1="${esc(m.entity_type)}" data-arg2="${esc(m.entity_id)}" data-arg3="warn-verify-${esc(m.id)}">Verify</button>
          </div>
        </div>`;
      }).join('');

    list.innerHTML = warnClearBtn + taskWarningsHtml + verifyMatchHtml;
  } else if (_warnAlertTab === 'notifications') {
    // Notifications tab — chronological notification feed
    list.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:24px;font-size:0.82rem">Loading...</div>';
    try {
      const result = await apiCall('/api/notifications');
      const notifications = (result && result.notifications) || [];
      const unread = notifications.filter(n => !n.is_read).length;
      window._lastNotificationCount = unread;
      const notifCount = document.getElementById('notifTabCount');
      if (notifCount) notifCount.textContent = unread > 0 ? String(unread) : '';
      if (notifications.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem;padding:16px;text-align:center">No notifications</div>';
        return;
      }
      list.innerHTML = '<div style="padding:4px 12px 4px;display:flex;justify-content:flex-end;gap:6px"><button class="btn btn--sm" data-action="markAllNotificationsRead" style="font-size:0.75rem;padding:2px 6px">Mark all read</button><button class="btn btn--sm" data-action="clearAllNotifications" style="font-size:0.75rem;padding:2px 6px">Clear all</button></div>' + notifications.slice(0, 50).map(n => {
        const ago = timeAgo(new Date(n.created_at));
        const isPersistent = n.dismissable === false;
        const readStyle = n.is_read && !isPersistent ? 'opacity:0.5' : '';
        const persistBadge = isPersistent && !n.is_read ? '<span style="display:inline-block;font-size:0.75rem;padding:1px 5px;border-radius:3px;background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-border);margin-left:6px">Action required</span>' : '';
        const bgStyle = isPersistent && !n.is_read ? 'background:color-mix(in srgb, var(--danger) 6%, var(--bg-surface));border-left:3px solid var(--danger);' : '';
        return `<div style="padding:8px 12px;border-bottom:1px solid var(--border-subtle);font-size:0.78rem;${readStyle};${bgStyle};cursor:pointer" data-action="handleNotificationClick" data-arg0="${esc(n.link || '')}" data-arg1="${esc(n.id || '')}">
          <div style="font-weight:${n.is_read && !isPersistent ? '400' : '600'};color:var(--text-primary)">${esc(n.title)}${persistBadge}</div>
          <div style="color:var(--text-muted);font-size:0.75rem;margin-top:2px">${esc(n.message)} &middot; ${ago}</div>
        </div>`;
      }).join('');
    } catch (e) {
      list.innerHTML = '<div style="color:var(--danger);font-size:0.82rem;padding:12px">Failed to load notifications.</div>';
    }
  }
}

/** Snooze a warning for N hours (persisted to localStorage). */
function snoozeWarning(taskId, hours) {
  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  _warnAlertSnoozedUntil[taskId] = until;
  try { localStorage.setItem('nbi_warn_snoozed', JSON.stringify(_warnAlertSnoozedUntil)); } catch (e) {}
  if (typeof toast === 'function') {
    toast('Snoozed for ' + (hours < 24 ? hours + 'h' : (hours / 24) + 'd'));
  }
  renderWarnAlertContent();
  updateWarnAlertButton();
}

// Close the sidebar with Escape and refresh once tasks are loaded
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  const panel = document.getElementById('warnAlertPanel');
  if (panel && panel.classList.contains('open')) {
    panel.classList.remove('open');
  }
});

// Patch renderAll so the trigger button stays current after every render
(function() {
  if (typeof renderAll !== 'function') return;
  const _origRA = renderAll;
  window.renderAll = function() {
    const r = _origRA.apply(this, arguments);
    try { updateWarnAlertButton(); } catch (e) {}
    return r;
  };
})();

// Refresh the button once a minute so newly-imminent tasks surface promptly
setInterval(function() { try { updateWarnAlertButton(); } catch (e) {} }, 60000);

// Initial paint after the page settles (tasks may load asynchronously)
setTimeout(function() { try { updateWarnAlertButton(); } catch (e) {} }, 1500);

// Alert button listeners are in the standalone script block before the main script.

// ==================== FOCUS TRAP ON DETAIL PANEL ====================
