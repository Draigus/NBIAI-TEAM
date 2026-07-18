// ==================== HELP CONTENT ====================
// Selector -> help card content. First match wins (el.closest), so put
// specific selectors before broad ones. Visual assets and full coverage
// are authored in Plan 6 after all sections are upgraded.
var HELP_CONTENT = [
  { selector: '.filter-bar', title: 'Filter bar', text: 'Narrow what you see by client, project, status, health or assignee. Save combinations as named views with the Views button.', related: ['Saved Views'], shortcut: '/' },
  { selector: '.views-dd', title: 'Saved Views', text: 'Save the current filters, sort and grouping as a named view. Star one as default and it applies every time you open this section.', related: ['Filter bar'], shortcut: null },
  { selector: '.task-subview-toggle', title: 'View switcher', text: 'Switch between the project tree, kanban board, Gantt timeline and calendar for the same filtered data.', related: [], shortcut: null },
  { selector: '.sidebar', title: 'Sidebar', text: 'Your navigation. Sections at the top, clients below. Click a client to scope every view to it.', related: [], shortcut: '[' },
  { selector: '.g-header', title: 'Header', text: 'Global actions: create items, print, report a bug, alerts and settings.', related: [], shortcut: null },
  { selector: '.group-header', title: 'Group header', text: 'Click to collapse or expand the group. The chips show item count and aggregate stats.', related: [], shortcut: null },
  { selector: '.detail-panel', title: 'Detail panel', text: 'Full record for the selected item. Press 1-4 to set status while it is open.', related: [], shortcut: '1-4' },
];
