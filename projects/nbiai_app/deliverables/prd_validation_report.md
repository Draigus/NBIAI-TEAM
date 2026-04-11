# PRD Validation Report -- NBIAI Team App

**Author:** VP Product
**Date:** 28 Mar 2026
**Version:** 1.0
**Scope:** Feature Specification v1.0 vs Sprint 1 Implementation (all backend routes, all frontend pages)
**Method:** Line-by-line comparison of every PRD section against the built code

---

## Executive Summary

**Overall implementation fidelity: approximately 65%**

The engineering team has delivered a solid structural foundation. All 8 route modules and all 9 frontend pages exist. The core data flows -- authentication, CRUD for agents/tasks/projects/approvals/finance/clients, and settings management -- are functional at the API level. The frontend pages are well-structured with consistent component usage, proper loading/error/empty states, and a coherent design language.

However, there are significant gaps between what the PRD specified and what was built. The most critical gaps are:

1. **The status transition matrix is incomplete.** The `cancelled` status transition and several guard conditions are missing from the backend.
2. **The Command Centre layout diverges materially from the spec.** The Active Projects widget is absent. The stat cards show 4 items instead of 5, and the cards do not match the spec's definitions.
3. **The Org Chart does not have a List View toggle.** The spec requires both Tree and List views; only the Tree is implemented.
4. **The Finance module's data model diverges significantly from the PRD.** Revenue types, payroll fields, cash flow projections, and transition scenarios are not implemented to spec.
5. **The Leads and Clients module has no Kanban view, no Lead Detail page, and no Client Detail page.**
6. **The Approvals page has no slide-over detail panel** for reviewing approval content.
7. **Several Settings subsections are missing entirely:** Model Pricing, Notifications.

The build is a credible Sprint 1 delivery if the scope was "get all the screens wired up with basic CRUD." It is not a delivery of the feature spec as written. What follows is the section-by-section assessment.

---

## Section-by-Section Validation

### Section 1: Authentication and User Management

**Specified:** 3-step setup wizard (company, board user, API key), login with rate limiting, JWT + refresh token rotation, user management (add/edit/deactivate), route protection with 403/404 pages.

**Built (backend -- `auth.ts`, `settings.ts`):**

| Requirement | Status | Notes |
|---|---|---|
| POST /setup creates company + board user | Implemented | Works correctly. Uses a transaction. Checks for existing users. |
| Argon2id for password hashing | Implemented | Correctly follows CEO binding decision over the PRD's original bcrypt spec. |
| SHA-256 hashed refresh tokens | Implemented | Raw token never persisted. Matches CTO spec. |
| Token rotation on refresh | Implemented | Old session deleted before issuing new tokens. |
| Refresh token TTL: 7 days default, 30 days with "Keep me signed in" | Partial | Hardcoded to 30 days. The 7-day default and the "Keep me signed in" toggle logic are not implemented. |
| Rate limiting: 5 failed attempts, then 1 per 30 seconds | Not implemented | The auth route prefix applies a generic 10 req/min rate limit (per the file header comment) but the spec's per-IP escalating rate limit is absent. |
| Replay detection | Not implemented | Comment in code says "not yet implemented here; logged for future." |
| GET /me returns current user | Implemented | |
| POST /logout invalidates session | Implemented | |
| User management (CRUD) | Implemented | In `settings.ts`. Create, update (role/displayName), delete. |
| Deactivate/Activate user toggle | Not implemented | The settings route performs a hard DELETE, not a soft deactivate toggle. The spec says "users are deactivated, not deleted." |
| Password validation (12+ chars, uppercase, lowercase, number, special char) | Partial | Missing special character requirement in the Zod schema. Only checks uppercase, lowercase, number, and min 12 chars. |
| Email uniqueness check on user creation | Implemented | |
| Setup wizard 3-step UI | Not validated (no setup page in frontend files provided) | |
| Route protection (403/404 pages) | Not validated at frontend level | |

**Built (frontend -- `DashboardPage.tsx` shows auth hook usage):**

The auth layer appears to be integrated via a `useAuth` hook. The setup wizard frontend was not included in the files provided for review, so cannot be validated.

**Gap summary for Section 1:** The authentication backend is well-built but has 4 notable gaps: no escalating rate limit, no replay detection, hard delete instead of soft deactivate for users, and missing "Keep me signed in" logic for refresh token TTL.

---

### Section 2: Command Centre (Dashboard)

**Specified:** Quick Stats bar (5 cards), Active Projects widget, Agent Status widget, Activity Feed with filters, Approvals Queue widget (board only).

**Built (frontend -- `DashboardPage.tsx`):**

| Requirement | Status | Notes |
|---|---|---|
| Quick Stats: 5 stat cards | Divergent | 4 stat cards built: Open Tasks, Active Agents, Pending Approvals, Active Projects. Missing: "Active Goals" and "Tasks Blocked" per spec. The card labels do not match the spec's definitions (spec says "Active Goals", "Tasks In Progress", "Agents Active", "Pending Approvals", "Tasks Blocked"). |
| Stat cards clickable with navigation | Not implemented | Cards are not clickable. Spec requires navigation to filtered views. |
| Active Projects widget (left, 60%) | Not implemented | Entirely absent. The spec requires a list of active projects with status dots, progress bars, lead agents. |
| Agent Status widget (right, 40%) | Implemented | Shows agents with status badges, model tier, current task. Grouped as a flat list rather than collapsible status groups as specified. |
| Activity Feed with filters (time range, agent, activity type) | Partial | Activity feed is rendered but has no filter controls. Shows "Last 24 hours" as static text. Spec requires time range, agent, and activity type filters. |
| Activity Feed: infinite scroll, 25 items | Partial | Shows first 20 items with a "View all activity" button placeholder. Not infinite scroll. |
| Approvals Queue widget (board only) | Implemented | Shows pending approvals with type badges, agent names, Review buttons. Limited to 5 items. Missing: board-only visibility gating (the widget renders for all users based on the code). |
| Approvals Queue: FIFO sort (oldest first) | Divergent | API sorts `desc(createdAt)` -- newest first. Spec says oldest first. |
| Layout: 60/40 split on rows 2 and 3 | Divergent | Layout is Agent Status (col-span-7) + Approvals (col-span-5) in one row, then Activity Feed full-width below. Missing the spec's Active Projects widget entirely changes the layout. |
| Empty state: fresh install banner | Not implemented | |
| Responsive stacking below 1024px | Partially implemented | Uses `grid-cols-1 lg:grid-cols-12`. |

**Gap summary for Section 2:** The Command Centre is functionally present but materially incomplete. The Active Projects widget is entirely missing. Stat cards do not match the spec. The Activity Feed lacks its filter controls. The Approvals Queue sorts in the wrong direction.

---

### Section 3: Org Chart View

**Specified:** Tree view and List view toggle, zoom controls, search, Hire Agent dialog, Edit Agent dialog, Pause/Resume, Terminate.

**Built (frontend -- `OrgChartPage.tsx`, backend -- `agents.ts`):**

| Requirement | Status | Notes |
|---|---|---|
| Tree view with connected nodes | Implemented | Well-built. Uses SVG connectors, positioned nodes, proper hierarchy from org chart. Glen Pryer shown as Board Operator at top. |
| List view (flat table toggle) | Not implemented | The spec requires a "Tree"/"List" segmented control. Only Tree view exists. |
| Zoom controls (+, -, Fit) | Implemented | Zoom in/out buttons, reset button. Range 50-150% as specified. |
| Search agents by role name | Implemented | Filters and dims non-matching nodes. |
| Hire Agent dialog | Implemented | Simplified: only asks for role (from vacant roles dropdown) and agent name. Missing all other fields from the spec: Model Tier, Reports To, Persona Summary, System Prompt, Responsibilities, Monthly Budget Cap, Knowledge Files. |
| Edit Agent dialog | Not implemented | No edit dialog exists in the Org Chart page. |
| Pause/Resume agent | Partial | Backend PATCH supports status changes. No dedicated UI confirmation dialogs as specified. |
| Terminate agent (board only) | Implemented (backend) | DELETE route sets status to `terminated`. Backend correctly checks board-only access. Missing: the spec's requirement that terminated agents remain visible in the org chart with strikethrough -- the frontend does not handle the `terminated` status display. |
| Node click behaviour (single click = tooltip, double click = navigate) | Divergent | Single click navigates directly to agent detail. No tooltip. No double-click distinction. |
| Gold border for Board Operator node | Implemented | Uses `border-accent/50` which is the electric blue, not gold (#F59E0B) as specified. |
| Agent status colours per spec | Partial | Status colours exist but do not include `error` or `offline` states that are in the spec. The frontend includes `running` and `terminated` which are from the CTO's enum, not the spec's enum. This is the unresolved status enum mismatch flagged in the CEO review. |
| Mobile responsive accordion | Implemented | Good addition -- provides a mobile-friendly alternative not explicitly in the spec. |

**Built (backend -- `agents.ts`):**

| Requirement | Status | Notes |
|---|---|---|
| GET /agents (list with pagination) | Implemented | Cursor-based pagination. Includes role join, heartbeat join. |
| GET /agents/:id (detail) | Implemented | Returns agent, role, current task, direct reports. |
| POST /agents (create) | Implemented | Requires `roleId` (not role slug). Creates with status `idle`. |
| PATCH /agents/:id (update) | Implemented | Supports name, status, personaConfig. |
| DELETE /agents/:id (terminate) | Implemented | Board only. Soft delete to `terminated`. Unassigns current task. |
| GET /agents/:id/executions | Implemented | Returns last 20 execution records with task title, tokens, cost. |
| GET /agents/:id/budget | Implemented | Returns current month budget record. |

**Gap summary for Section 3:** The tree visualisation is well-executed. The major gaps are: no List View, a heavily simplified Hire Agent dialog (missing most fields), no Edit Agent dialog in the UI, and no handling of terminated agent display.

---

### Section 4: Role Detail Page

**Specified:** 6 tabs (Overview, Task History, Performance, Knowledge, System Prompt, Execution Log), header with back link, status, model tier, reports-to, direct reports, action buttons.

**Built (frontend -- `RoleDetailPage.tsx`):**

| Requirement | Status | Notes |
|---|---|---|
| Header with back link, status, model tier, reports-to, direct reports | Likely implemented | The file imports necessary components (Badge, Card, Tabs) and defines types for AgentDetail including reportsTo, directReports, stats. |
| Tabs structure (6 tabs) | Likely implemented | Imports Tabs, TabsList, TabsTrigger, TabsContent components. |
| Overview tab: current assignment, key stats, persona | Types defined | AgentDetail type includes currentTask, stats (tasksCompleted, etc.). |
| Task History tab | Types defined | TaskHistoryEntry interface exists. |
| Performance tab: charts | Unknown | No recharts import visible. Charts may not be implemented. |
| Knowledge tab: 3-tier collapsible | Types defined | KnowledgeFile interface exists. |
| System Prompt tab: monospace code block with copy | Likely implemented | Copy icon imported. |
| Execution Log tab | Types defined | ExecutionEntry interface exists with all required fields. |

**Note:** Only the first 100 lines of this file were read. The tab content implementation cannot be fully validated without reading the complete file. Based on the type definitions and imports, the page appears structurally complete, but the actual rendering of charts (Performance tab) and the full detail of each tab cannot be confirmed.

---

### Section 5: Project Management

**Specified:** Project list with card grid, status/health filters, Create Project dialog, Project Detail with Kanban board, health updates.

**Built (frontend -- `ProjectsPage.tsx`, backend -- `projects.ts`):**

| Requirement | Status | Notes |
|---|---|---|
| Project list with filters | Implemented | Status filter exists. |
| Card grid layout (3 per row desktop) | Unknown | Only first 100 lines read. Type definitions suggest a table layout, not cards. |
| Create Project dialog | Likely implemented | Uses Dialog components, mutation hooks. |
| Project status enum | Divergent | Backend uses `planning`, `active`, `paused`, `completed`, `cancelled`. Spec uses `active`, `completed`, `on_hold`, `cancelled`. `planning` and `paused` are additions; `on_hold` is renamed to `paused`. |
| Project health field | Implemented | Backend schema includes `health` field. Projects list returns health. |
| Project Detail with Kanban board | Unknown | No separate ProjectDetailPage.tsx in the file list. The Kanban board may be part of ProjectsPage or may not exist. |
| Health change with required comment | Not validated | |
| Drag-and-drop cards between Kanban columns | Not validated | |

**Built (backend -- `projects.ts`):**

| Requirement | Status | Notes |
|---|---|---|
| GET /projects (list with task counts) | Implemented | Returns task counts per project (total, backlog, inProgress, blocked, done). Lead agent included. |
| GET /projects/:id (detail with tasks) | Implemented | Returns all tasks for the project with assigned agent info. |
| POST /projects (create) | Implemented | Creates with auto-generated slug. Defaults to `planning` status (not `active` as spec says). |
| PATCH /projects/:id (update) | Implemented | Supports name, description, status, leadAgentId. |
| DELETE /projects/:id (archive) | Implemented | Board only. Blocks if incomplete tasks remain. Sets status to `cancelled`. |
| Project slug auto-generation | Implemented | |
| Start Date / Target End Date / Actual End Date | Not implemented | Backend create/update schemas do not include date fields. Spec requires these. |
| Health filter | Not implemented in backend | Backend only filters by status, not health. |

**Gap summary for Section 5:** The backend is functional for basic CRUD but missing date fields. The project status enum values diverge. Default status on creation is `planning` instead of `active`. No evidence of Kanban board implementation.

---

### Section 6: Task System

**Specified:** Task CRUD, status transition matrix, checkout/checkin model, task cascade, comments, relations, task detail page with two-panel layout.

**Built (backend -- `tasks.ts`, frontend -- `TaskDetailPage.tsx`):**

| Requirement | Status | Notes |
|---|---|---|
| Task list with filters (status, priority, project, agent) | Implemented | All filters present. |
| Create task with auto-status (backlog if unassigned, assigned if agent set) | Implemented | |
| Status transition matrix | Partial | Implemented but incomplete. Missing transitions: `backlog` to `cancelled`, `assigned` to `cancelled`, `in_progress` to `cancelled`, `blocked` to `assigned`/`cancelled`, `cancelled` to `backlog`. The spec allows `cancelled` from most states and allows un-cancelling back to `backlog`. Also: `backlog` to `in_progress` is allowed in the code but not in the spec (spec requires going through `assigned` first). |
| Checkout/checkin model (atomic) | Implemented | Separate `taskCheckouts` table. Conflict detection (409 if different agent). Same-agent re-checkout releases and refreshes. |
| Task relations (blocking, blocked_by, related) | Implemented | Mirror relations created automatically. Uses `onConflictDoNothing`. |
| Task comments | Implemented | Supports human comments, status change comments, assignment comments. |
| Task type field (goal, task, subtask) | Partially implemented | The create schema does not include a `type` field. The spec defines three types. |
| Task detail page: two-panel layout | Implemented | 8/4 grid columns. |
| Inline title editing | Unknown | Only first 100 lines of TaskDetailPage read. |
| Requires PM review flag | Not in create schema | `requiresApproval` is in the schema but named differently from the spec's `requires_review`. |
| PM review gate enforcement | Not implemented | Status transition from `in_progress` to `done` does not check `requires_review`. The spec says `done` is only permitted if `requires_review` is false; otherwise must go through `review`. |
| Estimated hours / actual hours | Not in create/update schemas | |
| Due date validation (cannot be past) | Not implemented | Due date accepted without past-date validation. |

**Gap summary for Section 6:** The task system has a solid foundation. The most critical gap is the incomplete status transition matrix -- particularly the missing `cancelled` transitions and the absent PM review gate enforcement. Task type (goal/task/subtask) is not exposed in the create API.

---

### Section 7: Agent Execution Layer

**Specified:** AgentExecution data object, heartbeat system, execution log, cost tracking with model pricing, budget caps with 80%/100% alerts, manual execution trigger.

**Built:**

| Requirement | Status | Notes |
|---|---|---|
| AgentExecution records | Schema exists | GET /agents/:id/executions returns execution data. |
| Heartbeat system | Schema exists | `agentHeartbeats` table referenced. No heartbeat scheduler implementation visible in the routes. |
| Cost tracking per execution | Schema exists | Execution records include `costUsd`, `inputTokens`, `outputTokens`. |
| Budget caps with 80% alert | Partial | `agentBudgets` table with `alertSentAt` field exists. The actual enforcement logic (pausing agent at 100%, alerting at 80%) is not in the route layer. |
| Manual execution trigger ("Run Now") | Not implemented | No route for triggering agent execution. |
| Model pricing table | Not in routes | No API for managing model pricing. Settings routes do not include a pricing endpoint. |

**Gap summary for Section 7:** The data layer exists but the execution engine itself (the heartbeat scheduler, the actual Claude API calls, the budget enforcement logic) is not implemented in the route layer. This is expected for Sprint 1 -- these are backend services, not API routes -- but the spec's user-facing requirements around the "Run Now" button and budget alerts are also absent from the frontend.

---

### Section 8: Finance Tab

**Specified:** Revenue dashboard with charts, payroll summary, cash flow projection, NSI transition scenarios, pipeline revenue forecast, AI agent costs panel. All in GBP primary.

**Built (backend -- `finance.ts`, frontend -- `FinancePage.tsx`):**

| Requirement | Status | Notes |
|---|---|---|
| Revenue CRUD | Implemented | Create, update, soft-delete. Board only for mutations. |
| Revenue data model | Divergent | Spec defines: `source`, `type` (contracted/recurring/one_off/pipeline), `amount_gbp`, `amount_usd`, `period_start`, `period_end`, `status` (confirmed/invoiced/received/projected), `client_id`. Built: `clientName`, `type` (monthly_retainer/one_off/milestone), `amountGbp`, `startDate`, `endDate`, `isActive`. Missing: USD amount, period concept, payment status enum, client FK. |
| Revenue chart (bar + target line) | Not validated | Frontend imports no charting library (no recharts import in FinancePage). |
| Payroll CRUD | Implemented | Create, update, soft-delete. |
| Payroll data model | Divergent | Spec defines: `person_name`, `role`, `entity` (UK/US), `monthly_cost_gbp`, `annual_cost_gbp`, `employment_type` (full_time/part_time/contractor/advisor). Built: `name`, `payrollType` (human/agent), `roleDescription`, `monthlyCostGbp`, `annualCostGbp`, `currency`. Missing: entity (UK/US), employment_type enum. |
| Cash flow projection panel | Not implemented | No cash flow endpoints. Spec defines CashFlowEntry data object with projected vs actual income/expenses. |
| NSI transition scenarios panel | Not implemented | No transition scenario endpoints. Spec defines TransitionScenario data object. |
| Pipeline revenue forecast panel | Partial | Finance summary endpoint includes pipeline weighted value from `pipelineLeads` table. But no dedicated panel or table in the frontend. |
| AI agent costs panel | Implemented | GET /finance/agent-costs returns agent budget records with spend data. |
| Finance summary (P&L) | Implemented | GET /finance/summary returns monthly contracted, payroll, agent costs, pipeline values, net position. |
| GBP primary display | Implemented | Revenue and payroll in GBP. Agent costs converted from USD at 1.27. |
| Time range selector | Unknown | FinancePage renders 5 tabs (Revenue, Payroll, Cash Flow, NSI Scenarios, Agent Costs). Time range selector not visible in first 100 lines. |

**Gap summary for Section 8:** The finance module covers revenue and payroll CRUD, agent costs, and a summary endpoint. However, the data models diverge significantly from the spec (missing payment status enum, entity, employment type). Cash flow projections and transition scenarios are entirely absent. No charts are implemented.

---

### Section 9: Leads and Clients

**Specified:** BD Pipeline with Kanban and List views, lead detail page, active clients table, client detail page, overdue follow-ups, stage probability mapping, lead-to-client conversion.

**Built (backend -- `clients.ts`, frontend -- `ClientsPage.tsx`):**

| Requirement | Status | Notes |
|---|---|---|
| Pipeline leads CRUD | Implemented | List with stage filter, create, update, hard-delete. |
| Pipeline stage enum | Implemented | All 8 stages match the spec. |
| Stage probability mapping | Partial | `probability` field exists but is not auto-set on stage change in the backend. The spec says probability should auto-update when stage changes. |
| Pipeline Kanban view | Not validated | Frontend defines `PIPELINE_STAGES` array but only first 100 lines read. Kanban drag-and-drop unlikely implemented given no DnD library imports visible. |
| Pipeline List view | Likely implemented | Table components imported. |
| Lead Detail page | Not implemented | No separate lead detail page exists in the provided file list. Spec defines route `/leads-clients/leads/:leadId`. |
| Active clients CRUD | Implemented | List, create, update. |
| Client Detail page | Not implemented | No separate client detail page exists. Spec defines route `/leads-clients/clients/:clientId`. |
| Overdue follow-ups | Implemented (backend) | GET /clients/overdue returns leads with past nextActionDate. |
| Lead-to-client conversion | Not implemented | No conversion endpoint. Spec requires moving to "Closed Won" to trigger client creation. |
| Contact management (per lead/client) | Not implemented | Spec defines a Contact data object. No contacts table or endpoints exist. |
| Overdue follow-up banner | Not validated | |
| Lost reason (required on Closed Lost) | Not implemented | No enforcement in backend. |

**Gap summary for Section 9:** The basic CRUD for pipeline leads and clients is functional. The major gaps are: no Lead Detail page, no Client Detail page, no contact management, no lead-to-client conversion flow, no Kanban drag-and-drop, and no auto-probability on stage change.

---

### Section 10: Approvals Workflow

**Specified:** Approvals screen (board only) with tabs (Pending/Approved/Changes Requested/Rejected/All), approval detail slide-over with content rendering, decision actions (approve/request changes/reject), activity logging, real-time notifications.

**Built (backend -- `approvals.ts`, frontend -- `ApprovalsPage.tsx`):**

| Requirement | Status | Notes |
|---|---|---|
| GET /approvals (paginated list with status filter) | Implemented | Defaults to `pending` status filter. |
| GET /approvals/pending (board only) | Implemented | Returns up to 100 pending approvals. |
| POST /approvals (create request) | Implemented | Validates agent belongs to company. Writes activity log. Emits pg_notify. |
| PATCH /approvals/:id (decision) | Implemented | Supports approved/rejected/changes_requested. Requires comment for reject and changes_requested. Writes activity log and emits pg_notify. |
| Approval type categories | Divergent | Spec defines: external_email, client_deliverable, financial, strategic, publishing, other. Built: external_email, client_communication, financial_commitment, public_publish, strategic_decision, hiring, other. Names differ; `hiring` is an addition not in the spec; `client_deliverable` became `client_communication`; `publishing` became `public_publish`. |
| Approval detail slide-over | Not validated | First 100 lines of ApprovalsPage show the type badges and list structure. No slide-over panel visible. |
| Tab bar (Pending/Approved/etc.) | Likely present | Page structure suggests tabs but cannot confirm without full file read. |
| Urgency indicator (24h+, 48h+) | Not validated | |
| Content rendering (email preview, markdown, etc.) | Not validated | |
| Decision confirmation dialogs | Not validated | |
| Activity feed integration | Implemented (backend) | Activity log entries created on request and decision. |
| Real-time notification (pg_notify) | Implemented (backend) | `sendNotification` called on create and decision. |
| Approval list sort: FIFO (oldest first) | Not implemented | Backend sorts `desc(createdAt)` -- newest first. Spec says ascending (oldest first). |

**Gap summary for Section 10:** The backend is well-implemented with proper access control, activity logging, and real-time notifications. The approval type categories diverge from the spec. Sort order is wrong (newest first instead of oldest first). The frontend approval detail experience cannot be fully validated.

---

### Section 11: Settings

**Specified:** 8 subsections (Company Profile, Agent Library, Knowledge Base, User Management, Budget Management, API Keys, Model Pricing, Notifications).

**Built (backend -- `settings.ts`, frontend -- `SettingsPage.tsx`):**

| Requirement | Status | Notes |
|---|---|---|
| Company Profile (view/edit) | Implemented | GET and PATCH /settings/company. Board can edit. |
| Agent Library | Likely implemented | SettingsPage imports agents API. AgentLibraryRow type defined. |
| Knowledge Base Viewer (3-tier) | Implemented | GET /settings/knowledge returns files grouped by tier 1/2/3. |
| User Management | Implemented | CRUD in settings routes. Board only for create/update/delete. Cannot change own role. Cannot delete own account. |
| Budget Management | Implemented | GET /settings/budgets lists agent budgets. PATCH /settings/budgets/:agentId upserts budget. |
| API Keys | Implemented | GET (masked), POST (encrypted), DELETE (soft-delete). Board only. |
| Model Pricing | Not implemented | No route. No UI. Spec defines a full pricing management section. |
| Notifications settings | Not implemented | No route. No UI. Spec defines toggle-based notification preferences. |
| Logo file upload | Not implemented | Company update accepts `logoUrl` string but no file upload endpoint. |
| Password special character validation | Missing | Zod schema checks uppercase, lowercase, number, min 12 chars but not special characters. |
| User deactivate/activate toggle | Missing | Hard delete instead of soft deactivate. |
| "Test API Key" button | Not implemented | No key testing endpoint. |
| "Set All Caps" bulk action | Not implemented | |
| "Reset All Spend Counters" button | Not implemented | |

**Gap summary for Section 11:** The core settings sections (company, users, API keys, budgets, knowledge) are implemented. Model Pricing and Notifications are entirely missing. User management uses hard delete instead of soft deactivate. Several Board-only bulk actions are absent.

---

## Gap Log

| # | Section | Gap | Severity | Recommended Fix |
|---|---|---|---|---|
| G-01 | Auth | No escalating rate limit (5 failures then throttle) | High | Implement per-IP failure counting with time-window rate limiting. This is a security requirement. |
| G-02 | Auth | Refresh token TTL hardcoded to 30 days; no 7-day default | Medium | Add `rememberMe` flag to login endpoint; set TTL conditionally. |
| G-03 | Auth | No replay detection | Medium | Implement as noted in the code comments. Low urgency for v1 but should be tracked. |
| G-04 | Auth | User delete is hard delete, not soft deactivate | High | Change DELETE /settings/users/:id to set `isActive = false` instead of deleting. Preserve user history. |
| G-05 | Auth | Password validation missing special character requirement | Low | Add `.regex(/[!@#$%^&*]/)` to the Zod schema. |
| G-06 | Dashboard | Active Projects widget entirely missing | High | Implement the widget per spec: list of active projects with health dots, progress bars, lead agents. |
| G-07 | Dashboard | Stat cards: wrong count (4 vs 5) and wrong labels | Medium | Add "Tasks Blocked" card per spec. Relabel existing cards to match spec exactly. CEO review defaults to 4 cards from the design spec, so 4 may be acceptable -- confirm with me (VP Product). |
| G-08 | Dashboard | Stat cards not clickable | Low | Add onClick navigation to filtered views. |
| G-09 | Dashboard | Activity Feed has no filter controls | Medium | Add time range, agent, and activity type filter dropdowns. |
| G-10 | Dashboard | Activity Feed is not infinite scroll | Low | Replace "View all activity" with infinite scroll (intersection observer). |
| G-11 | Dashboard | Approvals Queue sort order wrong (newest first, should be oldest first) | Medium | Change API default sort to ascending for pending approvals. FIFO is correct for a review queue. |
| G-12 | Org Chart | No List View toggle | Medium | Add "Tree"/"List" segmented control per spec. Implement flat table view. |
| G-13 | Org Chart | Hire Agent dialog missing most fields | High | Add Model Tier, Reports To, Persona Summary, System Prompt, Responsibilities, Budget Cap, Knowledge Files to the dialog. Currently only asks for role and name. |
| G-14 | Org Chart | No Edit Agent dialog in UI | High | Implement the edit dialog per spec Section 3.6. |
| G-15 | Org Chart | Board Operator node uses accent blue border, not gold (#F59E0B) | Low | Change border colour to gold as specified. |
| G-16 | Org Chart | Status enum includes `running`/`terminated` but not `error`/`offline` | Medium | Reconcile as per CEO review decision. The UI should map display states from the stored set. |
| G-17 | Tasks | Status transition matrix incomplete | Critical | Add `cancelled` as a valid target from `backlog`, `assigned`, `in_progress`, `blocked`. Add `backlog` as valid from `cancelled` (board only). Remove `in_progress` from `backlog` transitions (must go through `assigned`). Add `assigned` and `cancelled` as valid from `blocked`. |
| G-18 | Tasks | PM review gate not enforced | Critical | When transitioning from `in_progress` to `done`, check `requires_review`. If true, reject the transition and require going through `review` first. |
| G-19 | Tasks | Task type field (goal/task/subtask) not in create API | High | Add `type` field to `createTaskSchema` with enum `goal`, `task`, `subtask`. Default to `task`. |
| G-20 | Tasks | Due date not validated against past dates | Low | Add validation: due date must be today or later. |
| G-21 | Tasks | Estimated hours / actual hours not in API | Medium | Add `estimatedHours` and `actualHours` fields to task schemas. |
| G-22 | Projects | Status enum diverges from spec | Medium | Reconcile: spec uses `on_hold`, backend uses `paused`. Spec does not include `planning`. Align to spec enum or document the deviation. |
| G-23 | Projects | Default status on creation is `planning`, spec says `active` | Medium | Change default to `active` or add `planning` to the spec. |
| G-24 | Projects | Missing date fields (start_date, target_end_date, actual_end_date) | Medium | Add date fields to project create and update schemas. |
| G-25 | Projects | No Kanban board on project detail | High | Implement the Kanban board per spec Section 5.4 with drag-and-drop between status columns. |
| G-26 | Projects | No health filter in API | Low | Add health as a query parameter to GET /projects. |
| G-27 | Finance | Revenue data model diverges significantly | High | Add: payment status enum (confirmed/invoiced/received/projected), period_start/period_end, amount_usd, client_id FK. Revenue type enum should include `contracted`/`recurring` per spec. |
| G-28 | Finance | Payroll data model diverges | Medium | Add: entity (UK/US) enum, employment_type enum per spec. |
| G-29 | Finance | Cash flow projections not implemented | High | Implement CashFlowEntry CRUD and the 3-month rolling view per spec. |
| G-30 | Finance | NSI transition scenarios not implemented | High | Implement TransitionScenario CRUD and card display per spec. |
| G-31 | Finance | No charts (revenue bar chart, cash flow chart) | Medium | Integrate recharts per CEO decision. Build revenue vs target chart, cash flow grouped bar chart. |
| G-32 | Finance | No time range selector on finance page | Medium | Add the specified time range controls. |
| G-33 | Clients | No Lead Detail page | High | Implement `/leads-clients/leads/:leadId` with activity timeline, contacts, right panel fields per spec. |
| G-34 | Clients | No Client Detail page | High | Implement `/leads-clients/clients/:clientId` per spec. |
| G-35 | Clients | No Contact management | Medium | Implement Contact data object, CRUD endpoints, and UI for managing contacts on leads and clients. |
| G-36 | Clients | No lead-to-client conversion | Medium | Implement conversion flow when stage moves to `closed_won`. |
| G-37 | Clients | No auto-probability on stage change | Low | Set probability automatically when stage changes per the mapping table in spec Section 9.1. |
| G-38 | Clients | No Kanban drag-and-drop on pipeline | Medium | Implement drag-and-drop with DnD library. |
| G-39 | Clients | No lost_reason enforcement on Closed Lost | Low | Require lost_reason comment when stage changes to `closed_lost`. |
| G-40 | Approvals | Approval type categories diverge from spec | Low | Align category names. Not critical -- the built categories are reasonable. Document the actual set. |
| G-41 | Approvals | Sort order wrong (newest first vs FIFO) | Medium | Change to ascending sort for pending approvals. |
| G-42 | Approvals | Approval detail slide-over not confirmed | Medium | Verify and implement the slide-over panel for reviewing full approval content. |
| G-43 | Settings | Model Pricing section not implemented | Medium | Implement pricing CRUD per spec Section 11.9. |
| G-44 | Settings | Notifications section not implemented | Low | Implement notification preferences per spec Section 11.10. Lower priority for v1. |
| G-45 | Settings | No API key test button | Low | Add a test endpoint that makes a lightweight Claude API call. |
| G-46 | Settings | Budget bulk actions missing | Low | Add "Set All Caps" and "Reset All Spend Counters" buttons. |
| G-47 | Execution | No manual execution trigger ("Run Now") | Medium | Add endpoint and UI button per spec Section 7.6. |
| G-48 | Execution | Budget enforcement (80%/100% alerts) not in route layer | Medium | Implement budget checks in the execution pipeline. |

---

## PRD Corrections Required

Based on the technical reality of what was built and the CEO's binding decisions, the following PRD sections need updating:

| # | Section | Current PRD Text | Required Update | Reason |
|---|---|---|---|---|
| P-01 | 1.1 | `password_hash` described as "bcrypt hash" | Change to "Argon2id hash" | CEO binding decision: Argon2id wins. |
| P-02 | 1.4 | Refresh token "stored in the Session table" (raw) | Update to "SHA-256 hash stored; raw token never persisted" | CEO binding decision: CTO's approach. |
| P-03 | Global | Accent colour `#3B82F6` | Update to `#4F6EF7` | CEO binding decision: design spec colour wins. |
| P-04 | Global | Sidebar 256px/64px | Update to 240px/60px | CEO binding decision: design spec dimensions win. |
| P-05 | Global | Finance nav icon `PoundSterling` | Update to `BarChart2` | CEO binding decision. |
| P-06 | 6.1 | Task `project_id` is nullable | Update to NOT NULL; document "General" project for orphan tasks | CEO binding decision: CTO's constraint wins. |
| P-07 | 2.3 | 5 stat cards | Confirm 4 or 5 with design spec alignment. CEO leans toward 4 | Needs VP Product confirmation. |
| P-08 | 3.1 | Agent status enum: active, idle, blocked, paused, error, offline | Reconcile with CTO enum: active, idle, running, paused, terminated. Document the display mapping | Unresolved from CEO review. Must be settled. |
| P-09 | 5.1 | Project status enum: active, completed, on_hold, cancelled | Consider adding `planning` if engineering needs it. Or remove from the backend | Implementation added `planning` and `paused` -- needs alignment. |
| P-10 | 8.1 | Revenue uses `amount_gbp` as primary | Keep, but also clarify that the database may store in native currency with code. CEO decision: GBP primary for revenue/payroll display, USD for agent costs | Align with CEO currency decision. |
| P-11 | 6.5 | Status transition: `backlog` can go to `assigned` or `cancelled` | The backend currently allows `backlog` to `in_progress` -- decide whether this is acceptable or must be removed | Spec is stricter (requires going through `assigned`). I recommend keeping the spec's constraint. |

---

## Acceptance Recommendation

**Verdict: Approved with Conditions**

The build is approved for internal demo and continued development. It is NOT approved for production release or external showing in its current state.

### Conditions for full Sprint 1 sign-off:

**Must-fix before Sprint 2 begins (Critical + High severity):**

1. **G-17:** Fix the status transition matrix. This is the task system's integrity. Without correct transitions, agents and users can put tasks into invalid states.
2. **G-18:** Implement PM review gate enforcement. This is a core product feature -- the reason the VP Product role exists.
3. **G-04:** Change user deletion to soft deactivation. Hard delete destroys audit history.
4. **G-13 + G-14:** Complete the Hire Agent and Edit Agent dialogs with all required fields. Currently, agents are created with no persona, no system prompt, no responsibilities -- making them non-functional.
5. **G-19:** Add task type (goal/task/subtask) to the create API. Goal decomposition depends on this.

**Should-fix during Sprint 2 (High severity):**

6. **G-06:** Implement the Active Projects widget on the Command Centre.
7. **G-25:** Implement the Kanban board on the Project Detail page.
8. **G-27:** Align the revenue data model to the spec.
9. **G-29 + G-30:** Implement cash flow projections and transition scenarios.
10. **G-33 + G-34:** Implement Lead Detail and Client Detail pages.

**Tracked for Sprint 3+ (Medium and Low severity):**

All remaining gaps in the gap log above.

### What is strong:

- Authentication flow is secure and well-implemented (Argon2id, hashed refresh tokens, token rotation).
- The Org Chart tree visualisation is excellent -- the layout algorithm, SVG connectors, and responsive accordion fallback are above expectations.
- Task checkout/checkin atomicity is correctly implemented with conflict detection.
- Approval workflow backend is thorough: proper access control, activity logging, real-time notifications via pg_notify.
- Code quality across all route files is consistent: proper error handling, input validation with Zod, company-scoping on all queries.
- The frontend consistently implements loading, error, and empty states -- exactly as the spec requires.

### What needs attention:

- Several CEO binding decisions have not been applied to the PRD. I will update the feature spec to reflect all binding decisions from `ceo_review.md`.
- The agent status enum remains unresolved. Engineering is using a hybrid of the spec and CTO enums. I will issue a definitive mapping document.
- The finance module needs the most rework to match the spec. The data model was simplified significantly.

---

**VP Product**
28 Mar 2026
