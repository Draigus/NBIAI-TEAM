# Session Handoff — 2026-04-01 — Finances Page & Dashboard Features

## What Happened This Session

This session continued building out the NBI Project Dashboard (`nbi_project_dashboard.html`). The following features were completed or partially completed:

### Completed Features

1. **Collapse/Expand All** — Buttons above task tree. Uses `collapsedTaskIds` Set for persistent state. Functions: `collapseAll()`, `expandAll()` at approx line ~1500-1520.

2. **Kanban Board View** — Toggle between "By Project" (tree) and "Board" (kanban) using `taskSubView` state variable. 6 lanes defined in `BOARD_COLUMNS` constant (~line 650). Cards are draggable between lanes and update task status on drop. Cards show title, priority/health badges, assignee, and Hr Est. Functions: `renderBoardView()`, `renderBoardCard()`, board drag-drop handlers (`onBoardCardDragStart/End/DragOver/DragLeave/Drop`).

3. **Master-Detail Layout (Tasks)** — 70/30 split. Left side is tree or board, right side is inline detail panel showing either client summary stats or task detail when a task is selected. CSS class: `.tasks-layout`, `.tasks-layout__main`, `.tasks-layout__detail`. Functions: `renderClientSummary()`, `renderInlineTaskDetail()`.

4. **Report Page Redesign** — Portfolio-style project cards with progress rings, status minibars, planned vs actual hours. Sub-view toggle: Overall / By Project / By Person (state: `_reportSubView`). All table rows and items are clickable (navigate to the task). Functions: `renderReport()` (line 2103), `renderProgressRing()`.

5. **Incomplete Report Page** — Red warning icon in sidebar with badge count. Shows tasks with missing fields (no hours estimated, description too short, no assignee, no due date) grouped by person. Function: `renderIncompleteReport()` (line 2301).

6. **People View** — Workload overview with horizontal stacked bars per person showing hours by client. Individual drill-down panel. Date range filter. Function: `renderPeopleView()` (line 2415).

7. **Admin Page Permissions** — In Settings, admin can toggle Finances visibility (admin-only vs all users). Stored in localStorage as `nbi_page_permissions`. Function: `updatePagePermission()` (line 2989).

8. **SVG Icons** — Sidebar and header use inline SVG icons instead of emoji. Header logo changed to "NBI" with "Project Dashboard" subtitle.

9. **Finances Page (PARTIALLY COMPLETE)** — See critical section below.

### Finances Page — Current State

The `renderFinancesView()` function (line 2647) was completely rewritten with a CFO-grade dashboard using pre-seeded NBI financial data. The data constant `NBI_FINANCE_SEED` is at line 2616.

**What's in `NBI_FINANCE_SEED`:**
```javascript
{
  revenue: [
    { client: 'Lighthouse Games', type: 'Retainer', annual: 350000, monthly: 29166 },
    { client: 'Couch Heroes', type: 'Retainer', annual: 300000, monthly: 25000 },
    { client: 'Blizzard (via Activision)', type: 'TBD', annual: 0, monthly: 0 }
  ],
  payroll: [
    { name: 'Glen Pryer', role: 'Managing Director', monthly: 8333, annual: 100000, billable: true, clients: ['All'] },
    { name: 'Magnus Pryer', role: 'Producer', monthly: 4583, annual: 55000, billable: true, clients: ['Lighthouse Games','Couch Heroes'] },
    { name: 'Devin Rieger', role: 'Game Economy Analyst', monthly: 5833, annual: 70000, billable: true, clients: ['Lighthouse Games'] },
    { name: 'Jeff Day', role: 'Data Analyst', monthly: 5417, annual: 65000, billable: true, clients: ['Lighthouse Games','Couch Heroes'] },
    { name: 'Amir Didar', role: 'Data Analyst', monthly: 5000, annual: 60000, billable: true, clients: ['Couch Heroes'] },
    { name: 'Marketing Hire', role: 'TBD', monthly: 4167, annual: 50000, billable: false, clients: [] },
    { name: 'Admin / Ops', role: 'Contractor', monthly: 2083, annual: 25000, billable: false, clients: [] }
  ],
  pendingPayroll: [
    { name: 'Tom Rieger', role: 'HC Partner', monthly: 16667, annual: 200000, status: 'NSI transition', risk: 'high' },
    { name: 'Bryan Rieger', role: 'Analytics Lead', monthly: 10000, annual: 120000, status: 'NSI transition', risk: 'high' },
    { name: 'Jeff Liang', role: 'Senior Analyst', monthly: 8333, annual: 100000, status: 'NSI transition', risk: 'medium' },
    { name: 'Jessica Chen', role: 'Data Scientist', monthly: 16667, annual: 200000, status: 'NSI transition', risk: 'high' }
  ],
  pipeline: [
    { client: 'Goals Studio', type: 'Discovery', romLow: 15000, romHigh: 50000, likelihood: 'Medium', estStart: 'Q2 2026' },
    { client: 'Sarge Universe', type: 'Full engagement', romLow: 0, romHigh: 200000, likelihood: 'TBD', estStart: 'Q3 2026' }
  ],
  targets: { fy2026: 1200000, fy2027: 2000000 },
  recurringExpenses: [
    { name: 'Claude Max (Anthropic)', monthly: 180, annual: 2160, category: 'AI Tools' },
    { name: 'Office / Infrastructure', monthly: 500, annual: 6000, category: 'Overhead' }
  ]
}
```

**What's rendered in `renderFinancesView`:**
- KPI cards row: Annual Revenue (£650k), Annual Payroll (£625k), Gross Margin %, Net Profit, Monthly Burn, Revenue/Head
- Gauge chart row: Gross Margin gauge, Net Margin gauge, 2026 Target Progress ring
- Monthly Revenue vs Expenses grouped bar chart
- Revenue by Client horizontal bars + donut chart
- Full P&L Income Statement table (Revenue > COGS/billable staff > Gross Profit > OpEx/non-billable + recurring > Net Profit)
- Revenue Pipeline table
- NSI Transition Risk section (pending payroll with risk badges)
- Payroll detail table with per-person editable hourly rates
- Add Entry form (one-off income/expense entries, stored in `_financeEntries` in localStorage)
- Recurring expense cards
- One-off transactions table
- Export buttons: "Export CSV" and "P&L Export"

**Finance-related supporting functions that DO exist:**
- `updatePersonRate(person, value)` — line 2870
- `addFinanceEntry()` — line 2877
- `removeFinanceEntry(idx)` — line 2891
- `exportFinancesCSV()` — line 2898 (exports `_financeEntries` only, NOT the P&L)

**Finance-related localStorage keys:**
- `nbi_person_rates` — JSON object `{ "Glen Pryer": 150, ... }` for editable hourly rates
- `nbi_finance_entries` — JSON array of manually added income/expense entries
- `nbi_page_permissions` — JSON object `{ finances: "admin" | "all" }`

---

## CRITICAL: Three Functions Called But Not Defined

The `renderFinancesView` function calls three functions that **DO NOT EXIST** in the codebase. The Finances page will crash with JavaScript errors when loaded.

### 1. `renderGaugeChart(pct, size)` — Called at lines 2722, 2724

**What it needs to do:** Return an SVG string rendering a semicircular gauge/speedometer chart. The `pct` parameter is a percentage (0-100), `size` is the SVG width/height in pixels.

**Design spec:**
- Semicircular arc (180 degrees, bottom half)
- Background arc in `var(--border-subtle)`
- Filled arc coloured by value: green (>30%), amber (15-30%), red (<15%)
- Large percentage text in center
- Tick marks or zone indicators optional but nice
- Return raw SVG string (like `renderDonutChart` and `renderProgressRing` do)

### 2. `renderMonthlyBarChart(months, revData, expData)` — Called at line 2732

**What it needs to do:** Return an SVG string rendering a grouped bar chart showing revenue vs expenses per month.

**Parameters:**
- `months` — array of month labels like `['Jan','Feb','Mar',...]` (12 entries)
- `revData` — array of 12 numbers (monthly revenue values, currently all the same: ~£54,166)
- `expData` — array of 12 numbers (monthly expense values, currently all the same: ~£52,083)

**Design spec:**
- SVG viewBox, responsive width (100%)
- Two bars per month (revenue green, expenses red/orange), side by side
- X-axis labels (month names)
- Y-axis with £ values
- Legend: Revenue / Expenses
- Grid lines optional
- Use CSS custom properties for colours (`var(--success)`, `var(--danger)`)

### 3. `exportPnLCSV()` — Called at line 2706

**What it needs to do:** Generate and download a CSV file formatted as a P&L income statement, using the same data as the on-screen P&L table.

**Design spec:**
- Header row: "NBI Analytics Ltd - P&L Income Statement - FY 2026"
- Sections: Revenue (each client line), Total Revenue, COGS (billable staff), Gross Profit, Operating Expenses (non-billable staff + recurring expenses + one-off expenses), Total OpEx, Net Profit
- Each row: `description, amount`
- Bottom: key ratios (Gross Margin %, Net Margin %, Revenue per Head)
- Trigger browser download as `nbi_pnl_YYYY-MM-DD.csv`

---

## Where to Insert the Three Functions

Insert all three functions between `exportFinancesCSV()` (ends at line 2908) and the `// ----- SETTINGS VIEW -----` comment (line 2910). This keeps them grouped with the other finance functions.

---

## File State

**Canonical frontend file:** `D:\OneDrive\Claude_code\NBIAI_TEAM\nbi_project_dashboard.html`
- Approximately 3100 lines
- All features above are in this single file

**Backend server:** `D:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server\server.js`
- Port 8888
- PostgreSQL: `postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard`
- No backend changes were made this session

**Server status:** Was running on port 8888 at start of session. May still be running. Check with: `netstat -ano | findstr :8888` or just try starting it with `cd dashboard-server && node server.js`

---

## Other Pending Work (Not Started This Session)

These items from the master plan (`spicy-jumping-crayon.md`) were NOT touched:

1. **Report export to PowerPoint and PDF** — Glen asked for this but it was deferred because it requires API keys (for PDF generation libraries) or complex client-side generation. Revisit when Glen is ready to deal with dependencies.

2. **Date range selector on Report page** — The Report page sub-views exist (Overall / By Project / By Person) but there's no date range filter on the Report page itself. The People page has one (`_peopleFilter.dateRange`).

3. **Phase 0 items from master plan** — Incremental sync (0.3), auth hardening, audit log population, Cloudflare tunnel, etc.

4. **Leads / BD Pipeline (Phase 1.5)** — Not started.

5. **UI/UX audit fixes** — The plan has a full audit with C1-C10 critical, H1-H18 high, M1-M22 medium, L1-L8 low issues. None addressed this session.

---

## Key State Variables (All in nbi_project_dashboard.html)

| Variable | Type | Purpose | Approx Line |
|----------|------|---------|-------------|
| `taskSubView` | `'tree' \| 'board'` | Which task sub-view is active | ~527 |
| `collapsedTaskIds` | `Set` | Which parent task nodes are collapsed | ~528 |
| `inlineDetailVisible` | `boolean` | Whether the right-side detail panel is shown | ~529 |
| `_pagePermissions` | `object` | Admin page visibility settings | ~530 |
| `_peopleFilter` | `object` | People page filter state `{ person, dateRange }` | ~531 |
| `_reportSubView` | `'overall' \| 'byProject' \| 'byPerson'` | Report page sub-view | ~532 |
| `_financeEntries` | `array` | Manually added finance entries | ~533 |
| `_currentUser` | `object` | Logged-in user from auth | (existing) |
| `BOARD_COLUMNS` | `const array` | Kanban lane definitions | ~650 |
| `NBI_FINANCE_SEED` | `const object` | Pre-seeded NBI financial data | 2616 |

---

## Tabs / Views Available

```javascript
const tabs = ['dashboard', 'tasks', 'report', 'people', 'incomplete', 'finances', 'settings'];
```

Sidebar shows all with SVG icons. Finances is gated behind `_pagePermissions.finances` (default: admin-only). Incomplete shows a badge count of tasks with missing fields.

---

## What to Do Next (Priority Order)

1. **Add the three missing functions** (`renderGaugeChart`, `renderMonthlyBarChart`, `exportPnLCSV`) — insert after line 2908. Without these the Finances page crashes.

2. **Start the server and verify** all pages load without JS errors, especially Finances.

3. **Quality check the Finances page** — Glen was very unhappy with the initial version. The rebuild uses real NBI data and proper P&L formatting but hasn't been visually verified yet.

4. **Report export** (PowerPoint/PDF) — deferred, pick up when ready.

5. **Continue Phase 0 / Phase 1 from master plan** as priorities allow.

---

## Glen's Feedback This Session

- "That looks like absolute shit" — on the first Finances page attempt. Demanded CFO-grade quality.
- "Nothing on this project is something you can do with minimal effort. It needs to be high quality."
- Sent two reference dashboard images (Ajelix accounting dashboard, P&L tracking dashboard) as design inspiration.
- Confirmed pre-seeding financial data was the right approach.
- Very particular about quality — do NOT ship anything half-baked.
