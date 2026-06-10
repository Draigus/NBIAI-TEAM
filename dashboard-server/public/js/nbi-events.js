// ==================== EVENT DELEGATION ====================
const _BOOL = { 'true': true, 'false': false, 'null': null };
document.addEventListener('click', function(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.hasAttribute('data-stop')) e.stopPropagation();
  if (el.hasAttribute('data-prevent')) e.preventDefault();
  const action = el.dataset.action;
  const fn = window[action];
  if (typeof fn !== 'function') return;
  const args = [];
  if (el.hasAttribute('data-pass-event')) args.push(e);
  for (let i = 0; el.dataset['arg' + i] !== undefined; i++) {
    const v = el.dataset['arg' + i];
    args.push(v in _BOOL ? _BOOL[v] : v);
  }
  if (el.hasAttribute('data-pass-el')) args.push(el);
  fn.apply(null, args);
});

// ===== DELEGATED ACTION WRAPPERS =====

function _actSetBoardTypeFilter(v) { _boardTypeFilter = v; renderContent(); }
function _actSetMyTasksSort(v) { _myTasksSort = v; renderContent(); }
function _actSetPeopleSubView(v) { _peopleSubView = v; renderContent(); }
function _actSetReportSubView(v) { _reportSubView = v; renderContent(); }
function _actClearDetailTask() { activeDetailTaskId = null; renderContent(); }
function _actSetInlineDetail(v) { inlineDetailVisible = !!v; renderContent(); }
function _actClearSelectedTasks() { selectedTaskIds.clear(); renderContent(); }
function _actSetPeopleFilterDateRange(v) { _peopleFilter.dateRange = v; renderContent(); }
function _actSetPeopleFilterPerson(v) { _peopleFilter.person = v; renderContent(); }
function _actSelectPerson(name) { _peopleFilter.person = name; renderContent(); }
function _actPeopleSearch(el) { _peopleSearchFilter = el.value.toLowerCase(); const pos = el.selectionStart; renderContent(); const inp = document.querySelector('.people-list__search input'); if (inp) { inp.focus(); inp.setSelectionRange(pos, pos); } }
function _actSelectCapPerson(name) { _capSelectedPerson = name; loadCapacityHeatmap(); }
function _actSetPeopleCalView(v) { _peopleCalView = v; localStorage.setItem('nbi_people_cal_view', v); renderContent(); }
function _actSetLeadsSector(v) { _leadsFilter.sector = v; refreshLeads(); }
function _actClearLeadsSector() { _leadsFilter.sector = null; refreshLeads(); }
function _actSetTaskSubView(v) { taskSubView = v; localStorage.setItem('nbi_task_subview', v); _tasksInitialCollapse = true; renderContent(); }

function _actCalNext() { _calMonth++; if (_calMonth > 11) { _calMonth = 0; _calYear++; } _calEventsKey = ''; renderContent(); }
function _actCalPrev() { _calMonth--; if (_calMonth < 0) { _calMonth = 11; _calYear--; } _calEventsKey = ''; renderContent(); }
function _actCalToday() { _calMonth = new Date().getMonth(); _calYear = new Date().getFullYear(); _calEventsKey = ''; renderContent(); }
function _actToggleCalDepMode() { _calDepMode = !_calDepMode; if (!_calDepMode) { _calDepSelected = null; } renderContent(); }

function _actGanttFwd() { _ganttOffsetDays += 30; renderContent(); }
function _actGanttBack() { _ganttOffsetDays -= 30; renderContent(); }
function _actGanttToday() { _ganttOffsetDays = 0; _ganttScrolledToToday = false; renderContent(); }
function _actGanttZoomIn() { ganttDayWidth = Math.min(60, ganttDayWidth + 6); renderContent(); }
function _actGanttZoomOut() { ganttDayWidth = Math.max(8, ganttDayWidth - 6); renderContent(); }
function _actGanttShowMore() { _ganttLimit += 100; renderContent(); }
/** Quick-set the Gantt collapse depth for a single client. depth: 0=project,
 *  1=feature, 2=story, 9=fully expanded. Items at the target depth get
 *  collapsed (their children don't render); items at shallower depths get
 *  expanded so the chosen level is visible. */
function _actGanttClientDepth(clientName, targetDepth) {
  const items = tasks.filter(t => (typeof getTaskClient === 'function' ? getTaskClient(t) === clientName : t.client === clientName));
  items.forEach(item => {
    const it = item.itemType || 'task';
    const itemDepth = it === 'project' ? 0 : it === 'feature' ? 1 : it === 'story' ? 2 : 3;
    if (targetDepth >= 9) { collapsedTaskIds.delete(item.id); return; }
    if (itemDepth === targetDepth) collapsedTaskIds.add(item.id);
    else if (itemDepth < targetDepth) collapsedTaskIds.delete(item.id);
  });
  try { localStorage.setItem('nbi_collapsed_tasks', JSON.stringify([...collapsedTaskIds])); } catch (e) {}
  renderContent();
}
function _actToggleGanttDepView() { closeGanttDepMenu(); _ganttDepView = !_ganttDepView; renderContent(); }
function _actToggleGanttHideArrows() { closeGanttDepMenu(); _ganttHideArrows = !_ganttHideArrows; renderContent(); }
function _actToggleGanttLinkMode() { closeGanttDepMenu(); _ganttLinkMode = !_ganttLinkMode; _ganttLinkFrom = null; renderContent(); }

function _actSetFilterAssignee(v) { currentFilter.assignee = v ? [v] : []; renderSidebarCounts(); renderContent(); }
function _actClearFilterAssignee() { currentFilter.assignee = []; renderContent(); }
function _actClearFilterAssigneeBreadcrumb() { currentFilter.assignee = []; renderContent(); renderBreadcrumbs(); }
function _actClearFilterClient() { currentFilter.client = null; renderContent(); }
function _actClearFilterClientBreadcrumb() { currentFilter.client = null; renderSidebarCounts(); renderContent(); renderBreadcrumbs(); }
function _actClearFilterHealth() { currentFilter.health = []; renderContent(); }
function _actClearFilterHealthBreadcrumb() { currentFilter.health = []; renderContent(); renderBreadcrumbs(); }
function _actToggleFilterIncomplete() { currentFilter.incomplete = !currentFilter.incomplete; renderContent(); }
function _actClearFilterIncompleteBreadcrumb() { currentFilter.incomplete = false; renderContent(); renderBreadcrumbs(); }
function _actClearFilterProject() { currentFilter.project = null; renderContent(); }
function _actClearFilterProjectBreadcrumb() { currentFilter.project = null; renderContent(); renderBreadcrumbs(); }
function _actSetFilterStatusAndSwitch(v) { currentFilter.status = [v]; switchView('tasks'); }
function _actClearFilterStatus() { currentFilter.status = []; renderContent(); }
function _actClearFilterStatusBreadcrumb() { currentFilter.status = []; renderContent(); renderBreadcrumbs(); }
function _actResetFilters() { resetFilters(); renderContent(); }
function _actResetFiltersBreadcrumb() { resetFilters(); renderContent(); renderBreadcrumbs(); }

function _actSetBtViewMode(v) { window._btViewMode = v; renderContent(); }
function _actToggleBtSort(col) { window._btSortDir = (window._btSortCol === col && window._btSortDir === 'desc') ? 'asc' : 'desc'; window._btSortCol = col; renderContent(); }
function _actSetSettingsTab(id) { window._settingsTab = id; renderContent(); }
function _actSetHiringFilterClient(id) { window._hiringFilterClient = id; switchView('hiring'); }
function _actSetHiringViewMode(v) { window._hiringViewMode = v; renderContent(); }

function _actCloseExpReportDetail() { closeExpenseDetail(); closeReportDetail(); }
function _actDeleteBugAndClose(id) { deleteBugReport(id); closeBugDetail(); }
function _actFilterClientReport(client) { filterByClient(client); switchView('report'); }
function _actFilterClientTasks(client) { filterByClient(client); switchView('tasks'); }
function _actNeedsAttnOverdue(client) { filterByClient(client); currentFilter.overdue = true; switchView('tasks'); }
function _actNeedsAttnBlocked(client) { filterByClient(client); currentFilter.status = ['Blocked']; switchView('tasks'); }
function _actClearFilterOverdueBreadcrumb() { currentFilter.overdue = false; renderContent(); renderBreadcrumbs(); }
function _actFilterClientAndOpenTask(client, taskId) { filterByClient(client); switchView('tasks'); openDetail(taskId); }
function _actSwitchAndOpenDetail(taskId) { switchView('tasks'); openDetail(taskId); }
function _actOpenOverlayAndClose(id) { toggleWarnAlertSidebar(); navigateToTaskInTree(id); }
function _actShareCopy(url) { navigator.clipboard.writeText(url); toast('Link copied!'); }
function _actShowVerifyAndClose(id, entityType, entityId, containerId) { showAttachmentVerifyDialog(id, entityType, entityId, containerId); toggleWarnAlertSidebar(); }

function _actSetFinanceSubView(v, el) { window._financeSubView = v; renderFinancesView(el.closest('.finance-view').parentElement); }
function _actStopRemoveDepAndRender(taskId, depId) { removeDependency(taskId, depId); renderContent(); }

function _actTogglePeopleCapacitySort(col) { _peopleCapacitySort = { col, dir: _peopleCapacitySort.col === col && _peopleCapacitySort.dir === 'asc' ? 'desc' : 'asc' }; renderContent(); }
function _actTogglePeopleClientHoursSort(col) { _peopleClientHoursSort = { col, dir: _peopleClientHoursSort.col === col && _peopleClientHoursSort.dir === 'asc' ? 'desc' : 'asc' }; renderContent(); }
function _actTogglePeopleTaskSummarySort(col) { _peopleTaskSummarySort = { col, dir: _peopleTaskSummarySort.col === col && _peopleTaskSummarySort.dir === 'asc' ? 'desc' : 'asc' }; renderContent(); }
function _actTogglePeopleWorkloadSort(col) { _peopleWorkloadSort = { col, dir: _peopleWorkloadSort.col === col && _peopleWorkloadSort.dir === 'asc' ? 'desc' : 'asc' }; renderContent(); }
function _actToggleRptProgressSort(col) { _rptProgressSort = { col, dir: _rptProgressSort.col === col && _rptProgressSort.dir === 'asc' ? 'desc' : 'asc' }; renderContent(); }
function _actToggleRptProjectSort(col) { _rptProjectSort = { col, dir: _rptProjectSort.col === col && _rptProjectSort.dir === 'asc' ? 'desc' : 'asc' }; renderContent(); }
function _actToggleUnassignedSort(col) { _unassignedSort = { col, dir: _unassignedSort.col === col && _unassignedSort.dir === 'asc' ? 'desc' : 'asc' }; renderExpensesContent(); }

function _actModalRemove(id) { const el = document.getElementById(id); if (el) el.remove(); }
function _actModalClick(id) { const el = document.getElementById(id); if (el) el.click(); }
function _actScrollTo(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function _actShowReassignPicker() { document.getElementById('reassignPicker').style.display = 'flex'; }
function _actDlStepBack() { document.getElementById('dlStep2').style.display = 'none'; document.getElementById('dlStep1').style.display = 'block'; }
function _actAddItemFromPicker(type, parentId) { const m = document.getElementById('addItemPickerModal'); if (m) m.remove(); addItem(type, parentId); }
function _actAddProjectForClient(client) { const m = document.getElementById('addItemPickerModal'); if (m) m.remove(); const t = createTaskObject({ title: 'New Project', itemType: 'project', client }); tasks.push(t); markDirty(t.id); save(); renderSidebarCounts(); renderContent(); openDetail(t.id); }

function _actCloseDetailOverlay(el) { const overlay = el.closest('.detail-overlay'); if (overlay) overlay.remove(); }
function _actToggleCollapsed(el) { el.parentElement.classList.toggle('collapsed'); }
function _actOpenImage(el) { const img = el.querySelector('img'); if (img) window.open(img.src); }
function _actToggleClientExpand(el) { toggleClientExpand(el.parentElement); }
function _actToggleMultiSelect(el) { toggleMultiSelect(el.parentElement); }
function _actDismissNewsCompact(el) { document.body.classList.remove('news-mobile-compact'); el.remove(); }

function _actFinStartEdit(section, idx, field, type, el) { finStartEdit(el, section, parseInt(idx), field, type); }
function _actWithLoading(fnName, el) { withButtonLoading(el, window[fnName]); }
function _actSubmitCalEvent(eventId, el) { withButtonLoading(el, () => submitCalendarEvent(eventId)); }
function _actSubmitCreateTeam(clientId, el) { withButtonLoading(el, () => submitCreateTeam(clientId)); }

function _actOpenBugDetailIfNotDrag(id) { if (!window._bugDragActive) openBugDetail(id); }
function _actOpenCandidateDetailIfNotDrag(id) { if (!window._hiringDragActive) openCandidateDetail(id); }
function _actCloseLeadDetailIfSelf(e, el) { if (e.target === el) closeLeadDetail(); }
function _actRemoveIfSelf(e, el) { if (e.target === el) el.remove(); }
function _actDeselectGanttArrowIfNeeded(e) { if (_ganttSelectedArrow && !e.target.closest('.gantt__arrow-hit')) deselectGanttArrow(); }

function _actToggleStandupSection(el) {
  const c = el.nextElementSibling;
  const open = c.style.display !== 'none';
  c.style.display = open ? 'none' : 'block';
  el.setAttribute('aria-expanded', open ? 'false' : 'true');
  el.querySelector('.standup-chevron').textContent = open ? '\u25B6' : '\u25BC';
  el.querySelector('.standup-hint').textContent = open ? '(click to expand)' : '(click to collapse)';
  sessionStorage.setItem('nbi_standup_expanded', open ? '0' : '1');
  if (!open) _loadStandupContent();
}
function _actToggleMyTasksSection(el) {
  el.nextElementSibling.classList.toggle('hidden');
  el.querySelector('.mytasks-toggle').textContent = el.nextElementSibling.classList.contains('hidden') ? '\u25B6' : '\u25BC';
}
function _actToggleNextSection(el) {
  el.nextElementSibling.classList.toggle('hidden');
  el.querySelector('span').textContent = el.nextElementSibling.classList.contains('hidden') ? '\u25B6' : '\u25BC';
}

function _actOpenCalEventDefault(dateStr) { openCalendarEventModal(null, { start_date: dateStr, end_date: dateStr }); }
function _actOpenCalEventClosed(dateStr) { openCalendarEventModal(null, { start_date: dateStr, end_date: dateStr, event_type: 'firm_closed' }); }
function _actOpenCalEventFirmClosed(dateStr) { openCalendarEventModal(null, { event_type: 'firm_closed', start_date: dateStr, end_date: dateStr, title: 'Firm Closed \u2014 All Day' }); }
function _actOpenCalEventForPerson(dateStr, userId, displayName) { openCalendarEventModal(null, { start_date: dateStr, end_date: dateStr, user_id: userId, user_display_name: displayName }); }
