// ----- CONFIGURATION CONSTANTS -----
const SYNC_POLL_MS = 10000;
const SYNC_DEBOUNCE_MS = 500;
const FINANCE_DEBOUNCE_MS = 800;
const SELF_ECHO_WINDOW_MS = 15000;
const DEFAULT_HOURLY_RATE = 150;
const GANTT_ROW_LIMIT = 200;
const BOARD_LANE_CAP = 50;
const CANCELLED_CAP = 20;
const CLIENT_PRIORITY = ['Couch Heroes', 'Lighthouse Studios', 'Sarge Universe', 'Goals Studio'];

// ----- STATE -----
// Core data — loaded from API on startup, synced incrementally on edits
let tasks = [];                   // Main task array — the single source of truth for all task data
let settings = { hourlyRate: DEFAULT_HOURLY_RATE, knownClients: ['Couch Heroes', 'Lighthouse Studios', 'Sarge Universe', 'Goals Studio', 'Playsage', 'NBI Operations'] };

// View state — controls which view is active and what filters are applied
let currentView = 'dashboard';
// `practice` filters the entire workspace down to a single practice area.
// Valid values: 'organisational', 'gaming', 'general', or null (= All).
// Phase 9 of the WorkSage backlog (a6c82c8c). Stored on tasks/leads/clients
// as `practiceArea` / `practice_area`. Sidebar PRACTICES section toggles it.
let currentFilter = { client: null, project: null, status: [], health: [], priority: [], assignee: [], search: '', sort: 'default', practice: null };
let selectedTaskIds = new Set();  // Bulk selection for batch operations
let pendingCSVData = null;        // Staging area for CSV import preview
let taskSubView = localStorage.getItem('nbi_task_subview') || 'tree'; // 'tree' | 'board' | 'gantt' | 'calendar'
let _calDepMode = false;
let _calDepSelected = null;
let collapsedTaskIds = new Set(); // Tracks which parent tasks are collapsed in tree view
let _tasksInitialCollapse = true; // Auto-collapse all tasks on first visit (expand is manual)
let _treeVisibleIds = null; // Set of task IDs visible under current assignee/search filter (null = show all)
let inlineDetailVisible = true;   // Whether the 30% detail panel is shown in tasks view
let _pagePermissions = {};        // Role-based page access: { finances: 'admin'|'all'|['user1','user2'], ... }
let _apiClientsCache = {};        // Cached client records from API (keyed by name)
let _peopleFilter = { person: null, dateRange: 'all' };
let _peopleSearchFilter = '';
let _capSelectedPerson = null;
let _peopleSubView = 'workload'; // 'workload' | 'capacity'
// People → Calendar sub-view state (D92)
let _peopleCalView = localStorage.getItem('nbi_people_cal_view') || 'roster'; // 'roster' | 'month'
// _peopleCalYear/Month share state with the Projects Calendar's _calYear/_calMonth
// via loadCalendarEvents() — navigation on either view affects the other.
let _reportSubView = 'overall';   // 'overall' | 'byProject' | 'byPerson'
let _reportInitialCollapse = true;
let _rptProjectSort = { col: 'client', dir: 'asc' };
let _rptProjectFilterClient = null;
let _rptProgressSort = { col: 'title', dir: 'asc' }; // Sort state for the "Progress by Project" table on the Reports view
// People-tab sort state (G4). Each table on the People view has its own
// state object. Columns are table-specific; default order matches the
// previous alphabetical-by-name behaviour.
let _peopleWorkloadSort = { col: 'total', dir: 'desc' };      // Workload Overview bar chart — largest first
let _peopleCapacitySort = { col: 'name', dir: 'asc' };       // Capacity Planning table (cols: name | w0..w3)
let _peopleClientHoursSort = { col: 'name', dir: 'asc' };    // Hours by Person per Client (cols: name | <client name> | total)
let _peopleTaskSummarySort = { col: 'name', dir: 'asc' };    // Task Summary by Person (cols: name | total | done | active | blocked | notstarted | spent | estimate)
let _financeEntries = [];          // Ad-hoc finance entries (loaded from API or localStorage)

// ----- CLIENT BRIEFS -----
// Client brief defaults removed from source code — sensitive data (personnel, salaries,
// funding, BD strategy) was visible in page source before login.
// Briefs are now loaded exclusively from the database via /api/sync/load.
const DEFAULT_CLIENT_BRIEFS = {};
let activeDetailTaskId = null;

const STATUSES = ['Not started', 'In progress', 'Planning', 'Drafted', 'In Review', 'Blocked', 'Done', 'Cancelled'];
const HEALTH_STATES = ['Green', 'Yellow', 'Red', 'Waiting on Client'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const HEALTH_COLOURS = { Green: 'var(--success)', Yellow: 'var(--warning)', Red: 'var(--danger)', Blocked: 'var(--danger)', 'Waiting on Client': 'var(--cyan)' };
const HEALTH_COLOURS_HEX = { Green: '#22c55e', Yellow: '#f59e0b', Red: '#ef4444', Blocked: '#2563eb', 'Waiting on Client': '#06b6d4' };
const STATUS_COLOURS_HEX = { 'Not started': '#666666', 'In progress': '#22c55e', Planning: '#f59e0b', Drafted: '#2563eb', 'In Review': '#f59e0b', Blocked: '#ef4444', Done: '#2563eb', Cancelled: '#444444' };

const BOARD_COLUMNS = [
  { id: 'backlog',    label: 'Backlog',     statuses: ['Not started'], color: 'var(--text-muted)' },
  { id: 'started',    label: 'Started',     statuses: ['Planning'],    color: 'var(--warning)' },
  { id: 'inprogress', label: 'In Progress', statuses: ['In progress'], color: 'var(--success)' },
  { id: 'review',     label: 'Review',      statuses: ['In Review', 'Drafted'], color: 'var(--warning)' },
  { id: 'blocked',    label: 'Blocked',     statuses: ['Blocked'],     color: 'var(--danger)' },
  { id: 'complete',   label: 'Complete',    statuses: ['Done'],        color: 'var(--purple)' },
];

// ----- PERSISTENCE -----
let clientBriefs = {};
let useAPI = false; // set true once API is confirmed reachable
let syncDebounceTimer = null;
let _dirtyTaskIds = new Set();   // tasks changed locally since last sync
let _deletedTaskIds = new Set(); // tasks deleted locally since last sync
let _briefsDirty = false;        // client briefs changed since last sync
let _lastPollTime = null;        // ISO timestamp of last successful poll
let _syncInFlight = false;       // prevent overlapping syncs

