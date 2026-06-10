// ===== CALENDAR VIEW =====
let _calMonth = new Date().getMonth();
let _calYear = new Date().getFullYear();
let _calEvents = [];                 // Cached list of calendar events for the visible month
let _calEventsKey = '';              // Cache key (year-month) so re-renders don't re-fetch
let _calShowOthers = true;           // Toggle: show events created by other users
let _calTeamFilter = '';             // Selected team_id for the calendar team filter (empty = no filter)
let _teamMembersCache = {};          // team_id → [display_name, ...] for fanning team events onto roster rows
let _capacityEvents = [];            // Calendar events covering the Capacity Planning 4-week window
let _capacityEventsKey = '';         // Cache key so re-renders of People view don't re-fetch
// Event types that reduce a person's effective weekly capacity. Full day off each.
const CAPACITY_REDUCING_TYPES = ['vacation', 'sick_leave', 'uto', 'bank_holiday', 'firm_closed'];
const CAL_EVENT_TYPES = [
  { value: 'vacation',    label: 'Vacation',     colour: '#22c55e' },
  { value: 'sick_leave',  label: 'Sick Leave',   colour: '#ef4444' },
  { value: 'uto',         label: 'UTO',          colour: '#2563eb' },
  { value: 'bank_holiday',label: 'Bank Holiday', colour: '#3b82f6' },
  { value: 'firm_closed', label: 'Firm Closed',  colour: '#64748b', adminOnly: true },
  { value: 'business',    label: 'Business',     colour: '#f97316' },
  { value: 'other',       label: 'Other',        colour: '#9ca3af' }
];
const CAL_EVENT_VISIBILITY = [
  { value: 'private', label: 'Private' },
  { value: 'team',    label: 'Team' },
  { value: 'client',  label: 'Client' },
  { value: 'public',  label: 'Public' }
];

/** Look up an event type colour, falling back to grey. */
function calEventColour(type) {
  const t = CAL_EVENT_TYPES.find(x => x.value === type);
  return t ? t.colour : '#9ca3af';
}

/** Look up an event type human label. */
function calEventTypeLabel(type) {
  const t = CAL_EVENT_TYPES.find(x => x.value === type);
  return t ? t.label : 'Other';
}

/** Fetch calendar events for the currently visible month and cache them. */
async function loadCalendarEvents(year, month) {
  // Pad the window by one week on either side so multi-day events that
  // overlap the month boundary still show up.
  const from = new Date(year, month, 1); from.setDate(from.getDate() - 7);
  const to = new Date(year, month + 1, 0); to.setDate(to.getDate() + 7);
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  // Append the team filter if one is active so the server returns events
  // for every member of that team.
  let url = `/api/calendar-events?from=${fmt(from)}&to=${fmt(to)}`;
  if (_calTeamFilter) url += `&team_id=${encodeURIComponent(_calTeamFilter)}`;
  // Fetch events + team member roster in parallel so team events can be
  // fanned out to each member's row without a render-time lookup miss.
  const [events, teamsWithMembers] = await Promise.all([
    apiCall(url),
    apiCall('/api/teams?include=members')
  ]);
  _calEvents = Array.isArray(events) ? events : [];
  // Populate the team-members cache keyed by team_id → [display_name, ...]
  _teamMembersCache = {};
  if (Array.isArray(teamsWithMembers)) {
    teamsWithMembers.forEach(t => {
      if (Array.isArray(t.member_display_names)) {
        _teamMembersCache[t.id] = t.member_display_names;
      }
    });
  }
  _calEventsKey = `${year}-${month}` + (_calTeamFilter ? `:team:${_calTeamFilter}` : '');
  // Re-render whichever calendar surface is currently visible.
  const main = document.querySelector('.tasks-layout__main');
  if (main && taskSubView === 'calendar') { renderContent(); return; }
  // People → Calendar sub-view (D92)
  if (currentView === 'people' && _peopleSubView === 'calendar') { renderContent(); return; }
}

/**
 * Fetch calendar events covering the Capacity Planning 4-week window so the
 * People → Workload capacity table can deduct time off (vacation, sick_leave,
 * uto, bank_holiday, firm_closed) from each person's weekly capacity (D93).
 * Separate from _calEvents because that cache is keyed to the visible
 * calendar month, while capacity is always "today → today+28 days".
 */
async function loadCapacityEvents() {
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const start = new Date(); start.setHours(0,0,0,0);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday of current week
  const end = new Date(start); end.setDate(end.getDate() + 28); // +4 weeks
  const key = `${fmt(start)}:${fmt(end)}`;
  if (_capacityEventsKey === key) return;
  try {
    const events = await apiCall(`/api/calendar-events?from=${fmt(start)}&to=${fmt(end)}`);
    _capacityEvents = Array.isArray(events) ? events : [];
    _capacityEventsKey = key;
  } catch (e) {
    _capacityEvents = [];
    _capacityEventsKey = '';
  }
}

/**
 * Count how many weekdays (Mon-Fri only) within [weekStart, weekEnd] the
 * given person has off based on capacity-reducing calendar events. Counts
 * firm_closed events for everyone; personal events only for the named
 * person. Returns the weekday count (0-5), clamped.
 */
function computeDaysOff(person, weekStart, weekEnd, events) {
  if (!Array.isArray(events) || events.length === 0) return 0;
  const personKey = person || '';
  const daysOff = new Set();
  events.forEach(ev => {
    if (!ev || !ev.start_date) return;
    if (!CAPACITY_REDUCING_TYPES.includes(ev.event_type)) return;
    const isFirm = ev.event_type === 'firm_closed';
    const isForThisPerson = isFirm || ev.user_display_name === personKey;
    if (!isForThisPerson) return;
    const s = new Date(ev.start_date + 'T00:00:00');
    const eEnd = ev.end_date ? new Date(ev.end_date + 'T00:00:00') : new Date(s);
    // Walk every day in the event's range that falls inside the requested week
    const cursor = new Date(Math.max(s.getTime(), weekStart.getTime()));
    const stop = new Date(Math.min(eEnd.getTime(), weekEnd.getTime()));
    while (cursor <= stop) {
      const dow = cursor.getDay(); // 0=Sun, 6=Sat
      if (dow !== 0 && dow !== 6) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        daysOff.add(key);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  });
  return Math.min(5, daysOff.size);
}

/** Build a date-keyed map of events that overlap each day in the visible month. */
function calBuildEventDayMap(year, month) {
  const dayEvents = {};
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  _calEvents.forEach(ev => {
    // Firm-closed events apply to the whole team — always visible regardless
    // of the "Show events from others" toggle (bug e49be05e).
    if (!_calShowOthers && _currentUser && ev.user_id !== _currentUser.id && ev.event_type !== 'firm_closed') return;
    const start = ev.start_date ? new Date(ev.start_date + 'T00:00:00') : null;
    const end = ev.end_date ? new Date(ev.end_date + 'T00:00:00') : start;
    if (!start) return;
    // Walk every day in the event's range that falls inside the visible month
    const cursor = new Date(Math.max(start.getTime(), monthStart.getTime()));
    const stop = new Date(Math.min(end.getTime(), monthEnd.getTime()));
    while (cursor <= stop) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
      if (!dayEvents[key]) dayEvents[key] = [];
      dayEvents[key].push(ev);
      cursor.setDate(cursor.getDate() + 1);
    }
  });
  return dayEvents;
}

/** Render the monthly calendar grid view -- tasks shown as coloured chips on their due/start/end dates */
function renderCalendarView(filtered) {
  const now = new Date(); now.setHours(0,0,0,0);
  const firstDay = new Date(_calYear, _calMonth, 1);
  const lastDay = new Date(_calYear, _calMonth + 1, 0);
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday-first
  const daysInMonth = lastDay.getDate();
  const monthName = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // When "Show events from others" is off, only show the current user's own
  // tasks on the calendar (bug e49be05e — unassigned/others' due-date chips
  // were still visible). Firm-closed events are handled separately in
  // calBuildEventDayMap.
  let calFiltered = filtered;
  if (!_calShowOthers && _currentUser) {
    const myName = (_currentUser.displayName || _currentUser.display_name || '').toLowerCase();
    if (myName) calFiltered = filtered.filter(t => (t.assignees || []).some(a => a.toLowerCase() === myName));
  }

  // Build map: date string → tasks due/ending that day
  const dayTasks = {};
  calFiltered.forEach(t => {
    const dates = [t.dueDate, t.endDate, t.startDate].filter(Boolean);
    const uniqueDates = [...new Set(dates)];
    uniqueDates.forEach(ds => {
      if (!dayTasks[ds]) dayTasks[ds] = [];
      dayTasks[ds].push(t);
    });
  });

  // Trigger a calendar events fetch the first time we render this month
  // (or when navigating). loadCalendarEvents will re-render once the data is in.
  // IMPORTANT: visibleKey must match the same shape that loadCalendarEvents
  // writes into _calEventsKey, including the team filter suffix. Otherwise
  // picking a team makes the check perpetually mismatched, and each render
  // schedules another loadCalendarEvents → renderContent → render loop that
  // crashes the tab. (Reported by Glen 2026-04-15, D91.)
  const visibleKey = `${_calYear}-${_calMonth}` + (_calTeamFilter ? `:team:${_calTeamFilter}` : '');
  if (_calEventsKey !== visibleKey) {
    setTimeout(() => loadCalendarEvents(_calYear, _calMonth), 0);
  }
  const eventDayMap = calBuildEventDayMap(_calYear, _calMonth);

  let html = '<div class="cal">';
  // Navigation + add-event controls
  html += `<div class="cal__nav" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">`;
  html += `<button class="cal__nav-btn" data-action="_actCalPrev">&laquo; Prev</button>`;
  html += `<button class="cal__nav-btn" data-action="_actCalToday">Today</button>`;
  html += `<div class="cal__month-title">${monthName}</div>`;
  html += `<button class="cal__nav-btn" data-action="_actCalNext">Next &raquo;</button>`;
  html += `<div style="flex:1"></div>`;
  // Team filter — when a team is selected, the server returns events for
  // every member of that team. The dropdown is populated from _teamsCache
  // which is refreshed on startup and after any team mutation.
  const teamOpts = (_teamsCache && _teamsCache.length > 0)
    ? `<option value="">None</option>` + _teamsCache.map(t =>
        `<option value="${esc(t.id)}" ${_calTeamFilter === t.id ? 'selected' : ''}>${esc(t.name)}${t.client_name ? ' (' + esc(t.client_name) + ')' : ''}</option>`
      ).join('')
    : `<option value="">Loading teams\u2026</option>`;
  html += `<label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-muted)">Filter by team:
    <select onchange="_calTeamFilter=this.value;_calEventsKey='';loadCalendarEvents(_calYear,_calMonth)" style="font-size:0.78rem;padding:2px 4px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">${teamOpts}</select>
  </label>`;
  html += `<label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-muted);cursor:pointer;user-select:none">
    <input type="checkbox" ${_calShowOthers ? 'checked' : ''} onchange="_calShowOthers=this.checked;renderContent()" style="accent-color:var(--accent)"> Show events from others
  </label>`;
  html += `<button class="cal__dep-toggle ${_calDepMode ? 'cal__dep-toggle--active' : ''}" data-action="_actToggleCalDepMode" title="Toggle dependency highlighting">&#128279; Dependencies</button>`;
  html += `<button class="btn btn--sm btn--primary" data-action="openCalendarEventModal">+ Add Event</button>`;
  html += `</div>`;

  // Legend for event type colours
  html += `<div class="cal__legend" style="display:flex;flex-wrap:wrap;gap:10px;padding:6px 4px;font-size:0.75rem;color:var(--text-muted)">`;
  CAL_EVENT_TYPES.forEach(t => {
    html += `<span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${t.colour}"></span>${t.label}</span>`;
  });
  html += `</div>`;

  // Grid
  html += '<div class="cal__grid">';
  // Day headers (Mon-Sun)
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => {
    html += `<div class="cal__day-header">${d}</div>`;
  });

  // Previous month padding
  const prevMonth = new Date(_calYear, _calMonth, 0);
  for (let i = startDay - 1; i >= 0; i--) {
    const day = prevMonth.getDate() - i;
    html += `<div class="cal__cell cal__cell--other"><div class="cal__date">${day}</div></div>`;
  }

  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${_calYear}-${String(_calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dt = new Date(_calYear, _calMonth, d);
    const isToday = dt.getTime() === now.getTime();
    const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
    let cls = 'cal__cell';
    if (isToday) cls += ' cal__cell--today';
    else if (isWeekend) cls += ' cal__cell--weekend';

    const tasksOnDay = dayTasks[dateStr] || [];
    const eventsOnDay = eventDayMap[dateStr] || [];
    const maxShow = 3;

    html += `<div class="${cls}"><div class="cal__date">${d}</div>`;
    // Calendar events render first as solid coloured bars (distinct from task cards)
    eventsOnDay.slice(0, maxShow).forEach(ev => {
      const col = calEventColour(ev.event_type);
      const ownerSuffix = ev.user_display_name ? ' — ' + ev.user_display_name : '';
      html += `<div class="cal__event" role="button" tabindex="0" aria-label="${esc(calEventTypeLabel(ev.event_type))}: ${esc(ev.title)}${esc(ownerSuffix)}" style="background:${col};color:#fff;padding:1px 5px;border-radius:3px;font-size:0.75rem;margin-top:2px;cursor:pointer;border-left:3px solid rgba(0,0,0,0.25);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" data-action="openCalendarEventDetail" data-stop data-arg0="${ev.id}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();openCalendarEventDetail('${ev.id}')}" title="${esc(calEventTypeLabel(ev.event_type))}: ${esc(ev.title)}${esc(ownerSuffix)}">${esc(ev.title)}</div>`;
    });
    if (eventsOnDay.length > maxShow) {
      html += `<div class="cal__more" style="font-size:0.75rem;color:var(--text-muted)">+${eventsOnDay.length - maxShow} more events</div>`;
    }
    tasksOnDay.slice(0, maxShow).forEach(t => {
      const col = STATUS_COLOURS_HEX[t.status] || '#666';
      const overdue = t.dueDate === dateStr && dt < now && t.status !== 'Done';
      html += `<div class="cal__task${overdue?' cal__task--overdue':''}" style="background:${col}" data-action="openDetail" data-stop data-arg0="${t.id}" title="${esc(t.title)}">${clientPrefix(getTaskClient(t))} ${esc(t.title)}</div>`;
    });
    if (tasksOnDay.length > maxShow) {
      html += `<div class="cal__more" data-action="calExpandDay" data-stop data-arg0="${dateStr}" data-pass-el>+${tasksOnDay.length - maxShow} more</div>`;
    }
    html += '</div>';
  }

  // Next month padding to fill grid
  const totalCells = startDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="cal__cell cal__cell--other"><div class="cal__date">${i}</div></div>`;
  }

  html += '</div></div>';
  return html;
}

function calDepClear() {
  _calDepSelected = null;
  document.querySelectorAll('.cal__task--dep-selected, .cal__task--dep-blocks, .cal__task--dep-needs').forEach(el => {
    el.classList.remove('cal__task--dep-selected', 'cal__task--dep-blocks', 'cal__task--dep-needs');
  });
  document.querySelectorAll('.cal__dep-label').forEach(el => el.remove());
  const banner = document.getElementById('calDepBanner');
  if (banner) banner.remove();
}

function calDepSelectTask(id) {
  if (_calDepSelected === id) { calDepClear(); return; }
  calDepClear();
  _calDepSelected = id;

  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const prereqs = task.dependencies || [];
  const dependents = tasks.filter(t => t.dependencies && t.dependencies.includes(id)).map(t => t.id);

  if (prereqs.length === 0 && dependents.length === 0) {
    toast('No dependencies for this task');
    _calDepSelected = null;
    return;
  }

  document.querySelectorAll(`.cal__task[data-arg0="${id}"]`).forEach(el => {
    el.classList.add('cal__task--dep-selected');
  });

  let offMonthPrereqs = 0;
  prereqs.forEach(pid => {
    const els = document.querySelectorAll(`.cal__task[data-arg0="${pid}"]`);
    if (els.length === 0) { offMonthPrereqs++; return; }
    els.forEach(el => {
      el.classList.add('cal__task--dep-blocks');
      el.insertAdjacentHTML('beforeend', '<span class="cal__dep-label cal__dep-label--blocks">blocks</span>');
    });
  });

  let offMonthDeps = 0;
  dependents.forEach(did => {
    const els = document.querySelectorAll(`.cal__task[data-arg0="${did}"]`);
    if (els.length === 0) { offMonthDeps++; return; }
    els.forEach(el => {
      el.classList.add('cal__task--dep-needs');
      el.insertAdjacentHTML('beforeend', '<span class="cal__dep-label cal__dep-label--needs">needs this</span>');
    });
  });

  if (offMonthPrereqs > 0 || offMonthDeps > 0) {
    calDepShowOffMonthBanner(id, prereqs, dependents, offMonthPrereqs, offMonthDeps);
  }
}

function calDepShowOffMonthBanner(selectedId, prereqs, dependents, offPrereqCount, offDepCount) {
  const nav = document.querySelector('.cal__nav');
  if (!nav) return;
  let html = '<div class="cal__dep-banner" id="calDepBanner">';
  if (offPrereqCount > 0) {
    html += '<span>' + offPrereqCount + ' prerequisite' + (offPrereqCount > 1 ? 's' : '') + ' on other months: ';
    prereqs.forEach(pid => {
      if (document.querySelector('.cal__task[data-arg0="' + pid + '"]')) return;
      const t = tasks.find(x => x.id === pid);
      if (!t) return;
      const dateStr = t.dueDate || t.endDate || t.startDate;
      if (!dateStr) return;
      const d = safeParseDate(dateStr);
      if (!d) return;
      html += '<a onclick="_calYear=' + d.getFullYear() + ';_calMonth=' + d.getMonth() + ';_calEventsKey=\'\';renderContent();setTimeout(function(){calDepSelectTask(\'' + escAttrJs(selectedId) + '\')},100)">' + esc(t.title) + '</a> ';
    });
    html += '</span>';
  }
  if (offDepCount > 0) {
    html += '<span>' + offDepCount + ' dependent' + (offDepCount > 1 ? 's' : '') + ' on other months: ';
    dependents.forEach(did => {
      if (document.querySelector('.cal__task[data-arg0="' + did + '"]')) return;
      const t = tasks.find(x => x.id === did);
      if (!t) return;
      const dateStr = t.dueDate || t.endDate || t.startDate;
      if (!dateStr) return;
      const d = safeParseDate(dateStr);
      if (!d) return;
      html += '<a onclick="_calYear=' + d.getFullYear() + ';_calMonth=' + d.getMonth() + ';_calEventsKey=\'\';renderContent();setTimeout(function(){calDepSelectTask(\'' + escAttrJs(selectedId) + '\')},100)">' + esc(t.title) + '</a> ';
    });
    html += '</span>';
  }
  html += '</div>';
  nav.insertAdjacentHTML('afterend', html);
}

document.addEventListener('click', function(e) {
  if (!_calDepMode || !_calDepSelected) return;
  if (e.target.closest('.cal__task') || e.target.closest('.cal__dep-toggle') || e.target.closest('.cal__dep-banner')) return;
  if (e.target.closest('.cal')) calDepClear();
});

/**
 * Open the create/edit modal for a calendar event.
 *
 * @param {Object|null} event    An existing event to edit (with id), or null to create.
 * @param {Object}      prefill  Optional prefill for a fresh create:
 *   - start_date / end_date (ISO YYYY-MM-DD)
 *   - event_type (slug from CAL_EVENT_TYPES)
 *   - user_id (target user for admin-created entries; hidden form field)
 *   - user_display_name (for the h2 subtitle)
 */
async function openCalendarEventModal(event, prefill) {
  const isEdit = !!(event && event.id);
  prefill = prefill || {};
  // Pull live client list so we have the canonical IDs to attach to the event
  const clientList = (await apiCall('/api/clients')) || [];
  // Pull teams for the "For" dropdown — members see teams they belong to,
  // admins see all. Non-admin non-members fall through to "Myself only".
  const teamsList = (await apiCall('/api/teams')) || [];
  const selectedType = event?.event_type || prefill.event_type || '';
  const typeOpts = CAL_EVENT_TYPES.map(t => `<option value="${t.value}" ${selectedType === t.value ? 'selected' : ''}>${t.label}</option>`).join('');
  const visOpts = CAL_EVENT_VISIBILITY.map(v => `<option value="${v.value}" ${event && event.visibility === v.value ? 'selected' : (!event && v.value === 'team' ? 'selected' : '')}>${v.label}</option>`).join('');
  const clientOpts = `<option value="">-- None --</option>` + clientList.map(c =>
    `<option value="${esc(c.id)}" ${event && event.client_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`
  ).join('');
  // "For" dropdown: Myself (default) or one of the teams. Admins get every team.
  const selectedTeamId = event?.team_id || prefill.team_id || '';
  const teamOpts = `<option value="">Myself</option>` + teamsList.map(t =>
    `<option value="${esc(t.id)}" ${selectedTeamId === t.id ? 'selected' : ''}>Team: ${esc(t.name)}</option>`
  ).join('');
  const startVal = event?.start_date ? String(event.start_date).slice(0,10) : (prefill.start_date || '');
  const endVal = event?.end_date ? String(event.end_date).slice(0,10) : (prefill.end_date || '');
  const targetUserId = prefill.user_id || '';
  const targetName = prefill.user_display_name || '';
  const subtitle = targetName && !isEdit ? `<div style="color:var(--text-muted);font-size:0.82rem;margin-top:-8px;margin-bottom:12px">for <strong>${esc(targetName)}</strong></div>` : '';

  const html = `<div class="modal-overlay open" id="calEventModal" role="dialog" aria-modal="true" data-action="_actRemoveIfSelf" data-pass-event data-pass-el>
    <div class="modal" style="max-width:var(--modal-sm)">
      <h2 style="margin-top:0">${isEdit ? 'Edit' : 'New'} Calendar Event</h2>
      ${subtitle}
      <input type="hidden" id="calEvTargetUserId" value="${esc(targetUserId)}">
      <div class="lead-detail__grid">
        <label class="field-required">Title</label><input type="text" id="calEvTitle" value="${esc(event?.title || prefill.title || '')}" placeholder="e.g. London Games Conference">
        <label class="field-required">Type</label><select id="calEvType">${typeOpts}</select>
        <label>For</label><select id="calEvTeam" title="Choose Myself for a personal entry, or a team to mark the event for everyone on that team">${teamOpts}</select>
        <label class="field-required">Start date</label><input type="date" id="calEvStart" value="${startVal}">
        <label>End date</label><input type="date" id="calEvEnd" value="${endVal}">
        <label>Client</label><select id="calEvClient">${clientOpts}</select>
        <label>Visibility</label><select id="calEvVis">${visOpts}</select>
        <label>Description</label><textarea id="calEvDesc" rows="3" style="resize:vertical">${esc(event?.description || '')}</textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        ${isEdit ? `<button class="btn btn--danger" data-action="deleteCalendarEventFromModal" data-arg0="${event.id}">Delete</button>` : ''}
        <button class="btn" data-action="_actModalRemove" data-arg0="calEventModal">Cancel</button>
        <button class="btn btn--primary" data-action="_actSubmitCalEvent" data-pass-el data-arg0="${isEdit ? event.id : 'null'}">${isEdit ? 'Save' : 'Create'}</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  if (typeof _activateDynamicModal === 'function') _activateDynamicModal('calEventModal');
}

/** Submit the calendar event modal — POSTs a new event or PATCHes an existing one. */
async function submitCalendarEvent(eventId) {
  const modal = document.getElementById('calEventModal');
  if (!modal) return;
  if (typeof clearFieldErrors === 'function') clearFieldErrors(modal);
  const titleEl = document.getElementById('calEvTitle');
  const startEl = document.getElementById('calEvStart');
  const title = titleEl.value.trim();
  const start_date = startEl.value;
  if (!title) { if (typeof showFieldError === 'function') showFieldError(titleEl, 'Title is required'); return; }
  if (!start_date) { if (typeof showFieldError === 'function') showFieldError(startEl, 'Start date is required'); return; }

  const teamSel = document.getElementById('calEvTeam');
  const teamId = teamSel ? teamSel.value : '';
  const payload = {
    title,
    event_type: document.getElementById('calEvType').value,
    start_date,
    end_date: document.getElementById('calEvEnd').value || null,
    client_id: document.getElementById('calEvClient').value || null,
    visibility: document.getElementById('calEvVis').value,
    description: document.getElementById('calEvDesc').value.trim() || null
  };
  // Team event branch — when the "For" dropdown is set to a team, the
  // server drops user_id and attaches team_id, so the event shows on
  // every team member's roster row (bug d4367137).
  if (teamId) {
    payload.team_id = teamId;
  } else if (eventId) {
    // Editing: explicitly clear team_id to switch a team event back to a personal one
    payload.team_id = null;
  }
  // Admin-created entries can target another user via the hidden field
  // that the People → Calendar roster fills in. Server-side enforcement
  // ensures only admins can actually use this — members get a 403 if
  // they try to POST with a user_id != their own. Ignored when team_id is set.
  const targetUserId = document.getElementById('calEvTargetUserId')?.value || '';
  if (!eventId && targetUserId && !teamId) payload.user_id = targetUserId;

  const url = eventId ? `/api/calendar-events/${eventId}` : '/api/calendar-events';
  const resp = await authFetch(url, {
    method: eventId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    toast('Failed to save event: ' + (err.error?.message || err.error || 'Unknown error'), 'error');
    return;
  }
  modal.remove();
  toast(eventId ? 'Event updated' : 'Event created');
  _calEventsKey = '';
  _capacityEventsKey = ''; // D93: invalidate capacity cache so People view picks up the change
  await loadCalendarEvents(_calYear, _calMonth);
}

/** Open the calendar event detail/edit modal for an existing event. */
async function openCalendarEventDetail(eventId) {
  const event = await apiCall(`/api/calendar-events/${eventId}`);
  if (!event) return;
  openCalendarEventModal(event);
}

/** Delete a calendar event from inside the edit modal, with confirmation. */
async function deleteCalendarEventFromModal(eventId) {
  if (!(await themedConfirm('Delete this calendar event?'))) return;
  const resp = await authFetch(`/api/calendar-events/${eventId}`, { method: 'DELETE' });
  if (!resp.ok) { toast('Delete failed', 'error'); return; }
  document.getElementById('calEventModal')?.remove();
  toast('Event deleted');
  _calEventsKey = '';
  _capacityEventsKey = ''; // D93: invalidate capacity cache so People view picks up the change
  await loadCalendarEvents(_calYear, _calMonth);
}

/** Expand a calendar day cell to show all tasks */
function calExpandDay(dateStr, el) {
  const cell = el.closest('.cal__cell');
  if (!cell) return;
  // Remove the "+N more" button and show all hidden tasks
  const allTasks = tasks.filter(t => t.dueDate === dateStr || t.startDate === dateStr || t.endDate === dateStr);
  el.remove();
  allTasks.forEach(t => {
    if (cell.querySelector(`[onclick*="${t.id}"]`)) return; // already shown
    const col = STATUS_COLOURS_HEX[t.status] || '#666';
    const div = document.createElement('div');
    div.className = 'cal__task';
    div.style.background = col;
    div.title = t.title;
    div.textContent = (getTaskClient(t) ? getTaskClient(t).substring(0,2).toUpperCase() + ' ' : '') + t.title;
    div.onclick = (e) => { e.stopPropagation(); openDetail(t.id); };
    cell.appendChild(div);
  });
}

