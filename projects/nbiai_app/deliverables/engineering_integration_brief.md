# Engineering Integration and Usability Brief

**Author:** VP Engineering
**Date:** 2026-03-28
**Version:** 1.0
**Project:** NBIAI Team App
**Audience:** Senior Engineer, Engineer

---

## Purpose

This document makes explicit what the engineering team needs to understand about usability requirements and cross-layer integration before writing a single component or route handler. The feature spec, technical architecture, and design spec were written in parallel. They do not always agree. This brief identifies every gap, sets the contract between frontend and backend, and states usability requirements in terms that map directly to code.

Read this before touching any of the following: auth flows, agent data fetching, approval mutations, finance endpoints, or WebSocket integration.

---

## Section 1: Frontend-Backend Contract

### How to read this section

Each subsection covers one API group. For each endpoint I list: what the frontend `api.ts` sends, what the architecture doc says the backend returns, and any mismatch between the two that must be resolved before that feature can ship.

---

### 1.1 Auth Endpoints

#### `POST /api/v1/auth/login`

**Frontend sends (`api.ts` line 119):**
```json
{ "email": "string", "password": "string" }
```
Hits `/api/auth/login` (no `v1` prefix).

**Backend returns (architecture 2.1):**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "string",
    "display_name": "string",
    "role": "board | admin | viewer",
    "company_id": "uuid"
  }
}
```

**MISMATCH — CRITICAL:**
The frontend `api.ts` calls `/api/auth/login`. All backend routes are registered under `/api/v1`. There is no `/api/auth` prefix in `index.ts` — auth is registered at `/api/v1/auth`. Every auth call in `api.ts` is wrong. Fix: either add a reverse-proxy rewrite rule, or update every path in `api.ts` to use `/api/v1/...`. The latter is correct — do not add rewrites.

**MISMATCH — CRITICAL:**
After a successful login, `attemptRefresh()` in `api.ts` (line 43) reads `json.data.accessToken` and `json.data.refreshToken` (camelCase, nested under `data`). The backend returns `json.access_token` and `json.refresh_token` (snake_case, top-level). This will break the token refresh silently — the frontend will always fail to persist the new token after a refresh and immediately redirect to `/login`. Fix: update `attemptRefresh()` to read `json.access_token` and `json.refresh_token` at the top level.

**MISMATCH — HIGH:**
The user object returned by the backend does not include `avatar_url`. The schema.ts adds `avatarUrl` to the `users` table (per CEO review note). The top bar and sidebar both require the avatar. The login response must include `avatar_url` in the `user` object, or an `auth/me` endpoint must be called immediately after login to fetch it. Architecture doc does not specify `GET /api/v1/auth/me`, but `api.ts` calls it at line 131. That endpoint needs to be implemented and must return the full user object including `avatar_url`.

---

#### `POST /api/v1/auth/refresh`

**Frontend sends:**
```json
{ "refreshToken": "string" }
```
(camelCase — see `attemptRefresh()` line 38)

**Backend expects:**
```json
{ "refresh_token": "string" }
```
(snake_case per architecture 2.1)

**MISMATCH — CRITICAL:**
Field name mismatch. The frontend sends `refreshToken`; the backend expects `refresh_token`. The refresh will always fail with a validation error. Fix: change the frontend to send `refresh_token`.

---

#### `POST /api/v1/auth/logout`

**Frontend sends:** No body (line 125 — `apiFetch('/api/auth/logout', { method: 'POST' })`). The backend requires `{ "refresh_token": "string" }` in the body to revoke the session.

**MISMATCH — HIGH:**
The logout call sends no body. The backend cannot revoke the session without the refresh token. The session will remain valid in the database until it expires. Fix: update the frontend logout call to include the refresh token from localStorage.

---

#### `GET /api/v1/auth/me`

**Frontend calls:** `/api/auth/me` (line 131 — wrong prefix, same issue as above).

**Backend implementation:** Not defined in the architecture doc. The endpoint must be built. It should return the same `user` shape as the login response, plus `avatar_url`.

**Priority:** HIGH. Required for the top bar user avatar and for re-hydrating auth state on page reload.

---

#### `POST /api/v1/auth/setup`

**Frontend calls:** `/api/auth/setup` (line 134). Sends arbitrary `Record<string, unknown>`.

**Backend implementation:** Not defined in the architecture doc. The feature spec defines the three-step setup wizard but the architecture omits the setup endpoint entirely. This endpoint needs to be designed and built. It should:
1. Accept company name, logo, board user credentials in one payload (or handle step-by-step).
2. Verify no Company record exists before executing (idempotency guard).
3. Return a login response shape (tokens + user) so the setup completion immediately authenticates the user.

**Priority:** CRITICAL. Without this the app cannot be initialised.

---

### 1.2 Agent Endpoints

#### `GET /api/v1/agents`

**Frontend sends:** `/api/agents?...` (wrong prefix — same global issue).

**Backend returns:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "role": { "id": "uuid", "name": "string", "slug": "string", "department": "string" },
      "model_tier": "opus | sonnet | haiku",
      "status": "active | idle | running | paused | terminated",
      "current_task": { "id": "uuid", "title": "string", "status": "string" } | null,
      "reports_to": { "id": "uuid", "name": "string" } | null,
      "direct_reports_count": 3,
      "hired_at": "ISO8601",
      "last_seen_at": "ISO8601 | null"
    }
  ],
  "pagination": { "cursor": "string | null", "has_more": false, "total": 18 }
}
```

**MISMATCH — MEDIUM:**
The architecture doc specifies `status` values of `active | idle | running | paused | terminated`. The schema.ts enum (per CEO review) includes additional states: `blocked`, `error`, `offline`. The frontend components will need to render all 8 values with `StatusBadge`. The design spec (Section 1.7) defines badge recipes only for `Active`, `Running`, `Idle`, `Paused`, `Blocked`, `Vacant` — it does not define colours for `error` or `offline`. Engineering must confirm with the UI/UX Lead what colour tokens apply to those two states before implementing `StatusBadge`.

**MISMATCH — LOW:**
The `trigger` method in `api.ts` (line 169) calls `/api/agents/${agentId}/trigger` but the architecture defines the trigger endpoint as `POST /api/v1/executions/:agent_id/trigger` (section 2.6). These are different paths. Pick one and make both sides consistent. Recommendation: keep it under `/executions` as the architecture specifies.

---

#### `GET /api/v1/agents/:id/budget`

**Frontend sends:** `/api/agents/${agentId}/budget`.

**Backend returns:**
```json
{
  "agent_id": "uuid",
  "month_year": "2026-03",
  "budget_usd": "50.00",
  "spent_usd": "23.456789",
  "percent_used": 46.9,
  "alert_sent_at": null,
  "hard_stop_at": null,
  "executions_count": 47
}
```

**Note:** `spent_usd` returns 6 decimal places (numeric(10,6) in the schema). The frontend should display this rounded to 2 decimal places. Do not truncate in the API response — let the frontend format it.

---

### 1.3 Task Endpoints

#### `POST /api/v1/tasks/:id/checkout`

**Frontend sends (line 241):**
```json
{ "agentId": "string" }
```
(camelCase)

**Backend expects:**
```json
{ "agent_id": "uuid" }
```
(snake_case per architecture 2.5)

**MISMATCH — HIGH:** Field name mismatch. The checkout will fail Fastify's JSON Schema validation. Fix: send `agent_id`.

---

#### `POST /api/v1/tasks/:id/checkin`

**Frontend sends (line 245):**
```json
{ "agentId": "string", "output": "string | undefined" }
```

**Backend expects:**
```json
{ "agent_id": "uuid (required)", "outcome": "completed | failed | released (required)", "output": "string (optional)" }
```

**MISMATCH — HIGH:** Frontend does not send `outcome`. The backend requires it. Every checkin call will fail with a validation error. Fix: the `tasks.checkin()` function must accept an `outcome` parameter and include it in the request body.

---

### 1.4 Approval Endpoints

#### `PATCH /api/v1/approvals/:id` vs frontend `approvals.decide()`

**Frontend sends (line 282):**
```json
{
  "decision": "approve | reject",
  "comment": "string | undefined"
}
```
Hits `/api/approvals/${id}/decide` with method `POST`.

**Backend expects:**
- Method: `PATCH` (not `POST`)
- Path: `/api/v1/approvals/:id` (not `.../decide`)
- Body:
```json
{
  "status": "approved | rejected | changes_requested",
  "comment": "string | optional"
}
```

**MISMATCH — CRITICAL:** Three problems:
1. Wrong HTTP method (`POST` vs `PATCH`).
2. Wrong path (extra `/decide` segment does not exist).
3. Wrong field name (`decision` vs `status`) with different value strings (`approve`/`reject` vs `approved`/`rejected`).

The backend also supports a third value `changes_requested` that the frontend has no concept of. Fix: update `approvals.decide()` to use `PATCH /api/v1/approvals/:id` with `{ "status": "approved | rejected | changes_requested" }`. The UI must expose all three options.

---

### 1.5 Finance Endpoints

**Frontend calls:**
- `finance.summary()` → `/api/finance/summary`
- `finance.agentCosts()` → `/api/finance/agent-costs`

**Backend defines (architecture 2.8):**
- `GET /api/v1/finance/revenue` — revenue summary
- `GET /api/v1/finance/payroll` — payroll summary
- `GET /api/v1/finance/pipeline` — pipeline summary
- `GET /api/v1/finance/projection` — cash flow projection

**MISMATCH — HIGH:** `/api/finance/summary` and `/api/finance/agent-costs` do not exist in the architecture. The frontend is calling endpoints that have not been designed. Engineering must either:
- Map `finance.summary()` to a combination of `revenue` + `payroll` + `pipeline` calls, or
- Define a new aggregated `/api/v1/finance/summary` endpoint (requires CTO sign-off as it adds an endpoint outside the architecture doc).

Agent costs are part of the payroll response (`agent_monthly` field) and the budget data on individual agents. There is no standalone `/finance/agent-costs` endpoint. Map this to the payroll summary or agent budget queries.

---

### 1.6 Client Endpoints

**Frontend calls (lines 317-327):**
- `clients.pipeline()` → `/api/clients/pipeline`
- `clients.active()` → `/api/clients/active`
- `clients.overdue()` → `/api/clients/overdue`

**Backend defines (architecture 2.9 and 2.10):**
- `GET /api/v1/clients` — all clients (filterable with `?is_active=true`)
- `GET /api/v1/clients/:id`
- `GET /api/v1/pipeline` — pipeline leads (separate resource, not nested under clients)

**MISMATCH — HIGH:** The frontend client module maps pipeline data to `/api/clients/pipeline`, but the backend serves pipeline leads at `/api/v1/pipeline` (a top-level resource). Update `clients.pipeline()` to call `/api/pipeline`.

`clients.active()` maps to `GET /api/v1/clients?is_active=true`. `clients.overdue()` has no equivalent endpoint — overdue follow-ups are determined by `next_action_date < today` on pipeline leads. This filter does not exist as a dedicated endpoint. Either add a `?overdue=true` query parameter to `GET /api/v1/pipeline`, or compute overdue status client-side from the pipeline list.

---

### 1.7 Settings Endpoints

**Frontend calls (lines 333-354):**
- `settings.company()` → `GET /api/settings/company`
- `settings.updateCompany()` → `PATCH /api/settings/company`
- `settings.users()` → `GET /api/settings/users`
- `settings.apiKeys()` → `GET /api/settings/api-keys`
- `settings.budgets()` → `GET /api/settings/budgets`
- `settings.knowledge()` → `GET /api/settings/knowledge`

**Backend defines (architecture 2.11):**
- `GET /api/v1/settings` (returns company + counts, not broken out by sub-resource)
- `PATCH /api/v1/settings`
- `GET /api/v1/settings/api-keys`
- `POST /api/v1/settings/api-keys`
- `DELETE /api/v1/settings/api-keys/:id`

**MISMATCH — MEDIUM:**
- `settings.users()` calls `/api/settings/users`. Users are served at `GET /api/v1/users`, not under settings. Update to call `GET /api/v1/users`.
- `settings.budgets()` calls `/api/settings/budgets`. No such endpoint exists. Budgets per agent are at `GET /api/v1/agents/:id/budget`. To show all agent budgets in a settings view, either iterate over agents and call the budget endpoint per agent, or add a `GET /api/v1/settings/budgets` aggregate endpoint (CTO sign-off required).
- `settings.knowledge()` calls `/api/settings/knowledge`. Knowledge files are at `GET /api/v1/knowledge`. Update accordingly.
- `settings.company()` and `settings.updateCompany()` should target `GET /api/v1/settings` and `PATCH /api/v1/settings`.

---

### 1.8 Dashboard Endpoints

**Frontend calls (lines 256-266):**
- `dashboard.summary()` → `GET /api/dashboard/summary`
- `dashboard.activity()` → `GET /api/dashboard/activity`
- `dashboard.agentStatus()` → `GET /api/dashboard/agent-status`

**Backend defines (architecture 2.14):**
- `GET /api/v1/dashboard` — single aggregated endpoint returning all dashboard data including projects, agents, tasks, approvals, activity, and budget summary.

**MISMATCH — MEDIUM:**
The frontend expects three separate endpoints. The backend provides one. Either:
- Refactor the frontend to call `GET /api/v1/dashboard` once and distribute data to the three components, or
- Add sub-routes (`/api/v1/dashboard/summary`, `/api/v1/dashboard/activity`, `/api/v1/dashboard/agent-status`) backed by the same aggregate query.

Activity feed is also available at `GET /api/v1/activity` (architecture 2.13). The dashboard should reuse that endpoint rather than maintaining a separate one.

---

## Section 2: Usability Requirements for Engineering

These are not suggestions. They are implementation requirements that map directly to the design spec. Every frontend component that fetches data must implement all four states: loading, error, empty, and populated. Code review will reject components that do not have all four.

---

### 2.1 Loading States

**Rule:** Every data fetch must show a skeleton loader matching the layout of the content being loaded. No blank screens, no spinners on primary content areas.

**Spinners are only permitted on:**
- Inline button submissions (e.g. the Sign In button while authenticating)
- Small widget refreshes (e.g. a single stat card re-polling)

**What this means in code:**
- Use react-query's `isLoading` (not `isFetching`) to show the skeleton on the initial fetch.
- Every list component (agents list, tasks list, approvals queue, activity feed, projects grid) needs a `<ComponentSkeleton />` variant that matches the number of rows/cards at their default loaded size. For example: if the agents list typically shows 8 rows, the skeleton shows 8 placeholder rows.
- Skeleton component: use shadcn/ui `Skeleton` with `bg-elevated animate-pulse`. Match the exact shape of the real content — same height, same column widths, same spacing.
- The skeleton must be responsive — if the content is a 12-column grid, the skeleton renders in the same grid.
- Do not re-show skeletons on background refetches (`isFetching && !isLoading`). Use a subtle indicator (small spinner in the top-right of the widget) for background refreshes only.

**Components that must have skeletons (non-exhaustive):**
- Command Centre: Quick Stats bar, Active Projects widget, Agent Status Feed, Activity Feed, Approvals Queue
- Org Chart: the entire SVG/canvas area
- Projects list and project detail
- Tasks list and task detail (including comments section)
- Finance: all four tabs (Revenue, Payroll, Pipeline, Projections)
- Leads & Clients: both the client table and the pipeline kanban
- Approvals: the approval list and the approval detail panel
- Settings: users table, API keys list, budgets table

---

### 2.2 Error States

**Rule:** Every failed fetch must show a human-readable error, not a raw error object or a blank screen.

**Implementation requirements:**
- Do not `console.error` and render nothing.
- Do not render `{error.message}` directly — that exposes internal error text to users.
- Use react-query's `isError` and `error` to detect failures.
- Error display component: `Alert` with a red left border (`bg-status-red/10 border-l-2 border-status-red`), a Lucide `AlertCircle` icon, and a human-readable message.
- Default error message: "Something went wrong. Please try again." — shown when you do not have specific context.
- Provide a "Try again" button that calls `refetch()` on the query.
- For mutation errors (POST/PATCH/DELETE failures): use a toast notification (bottom-right, auto-dismiss 5 seconds, red variant). Do not use inline error states for mutations unless it is a form validation error.
- The `apiFetch` wrapper in `api.ts` throws the raw error response body. Components must not display that directly. Parse `error.error?.message` if it conforms to the standard error shape, otherwise fall back to the default message.

**Specific cases:**
- 403 (Forbidden): "You do not have permission to perform this action."
- 404 (Not Found): "This [resource] could not be found."
- 429 (Rate Limited): "Too many requests. Please wait a moment and try again."
- 401 handled at the `apiFetch` level — the user is redirected to login; no component-level error state needed.
- Budget exhausted (429 from trigger endpoint): "This agent has exhausted its monthly budget and cannot be triggered."

---

### 2.3 Empty States

**Rule:** Every list, table, and feed must have a designed empty state. Rendering nothing is not acceptable.

**Empty state component structure (per design spec):**
- A container `flex flex-col items-center justify-center py-16 text-center`
- A Lucide icon at `size-12 text-muted mb-4` — use a contextually relevant icon (e.g. `CheckSquare` for empty tasks, `Network` for an empty org chart)
- A heading: `H3 text-secondary` — the primary empty state message
- A body: `Caption text-muted mt-1` — explaining what this area is for
- A call-to-action button where creation is possible for this user's role (e.g. "Create first project") — omit the button for read-only contexts or viewer-role users

**Specific empty states required (exact copy):**

| Screen / Component | Heading | Body | CTA |
|---|---|---|---|
| Tasks list (no tasks) | "No tasks yet" | "Tasks assigned to agents will appear here." | "Create task" (board/admin only) |
| Activity feed (no activity) | "No activity yet" | "Agent actions and status changes will appear here." | None |
| Approvals queue (no pending) | "Nothing to review" | "Pending agent approvals will appear here." | None |
| Projects list (no projects) | "No projects" | "Create a project to start assigning work to agents." | "New project" (board/admin only) |
| Agents list (no agents) | "No agents hired" | "Hire agents from the org chart to staff your AI company." | "View org chart" |
| Pipeline (no leads) | "Pipeline is empty" | "Add leads to start tracking your business development." | "Add lead" (board/admin only) |
| Clients (no clients) | "No active clients" | "Active client relationships will appear here." | None |
| Finance — Revenue (no items) | "No revenue recorded" | "Add revenue items to track your income." | "Add revenue" (board/admin only) |
| Execution log (no executions) | "No executions yet" | "Agent runs will appear here." | None |

---

### 2.4 Optimistic Updates

Optimistic updates improve perceived performance for mutations that are highly likely to succeed. Apply them only to the mutations listed below.

**Apply optimistic updates to:**

| Component | Mutation | What to update optimistically |
|---|---|---|
| Approvals queue | Approve / Reject / Changes Requested | Remove the approval from the pending list immediately. Show a toast on success/failure. Rollback on error. |
| Task detail | Status change | Update the task status badge immediately. |
| Task list | Assign agent to task | Update the assigned agent display immediately. |
| Agent status | Pause / Resume agent | Update the agent status badge immediately. |
| Pipeline | Stage change (drag-and-drop kanban) | Move the card to the target column immediately. |

**Do not apply optimistic updates to:**
- Creating new entities (the ID is unknown until the server responds)
- Deleting entities (confirmation dialogs already buffer the action)
- Any financial mutations (amounts must be confirmed by the server)
- Agent termination (irreversible — wait for server confirmation)

**Implementation pattern (react-query):** Use `onMutate` to update the cache, `onError` to rollback, and `onSettled` to invalidate and refetch. Do not rely on the optimistic state for anything that requires the server-assigned ID.

---

### 2.5 Form Validation

**Rule:** All forms must validate client-side before submitting. Validation errors must appear inline below the offending field in `Caption text-status-red`. The submit button must be disabled while validation errors exist.

**Validation library:** Use react-hook-form with zod schemas. One zod schema per form. The schema is also the source of truth for TypeScript types on the form values.

**Validation timing:** Validate on blur for the first interaction with a field. Switch to validate on change once the user has submitted once (to give instant feedback as they correct errors).

**Required validation rules per form:**

| Form | Field | Rule | Error message |
|---|---|---|---|
| Login | Email | Valid email format | "Enter a valid email address." |
| Login | Password | Non-empty | "Password is required." |
| Setup Step 2 | Password | Min 12 chars, uppercase, lowercase, number, special char | See feature spec Section 1.2 for exact messages per rule |
| Setup Step 2 | Confirm password | Matches password | "Passwords do not match." |
| Create task | Title | Non-empty, max 500 chars | "Task title is required." / "Title must be under 500 characters." |
| Create task | Project | Must be selected | "Select a project." |
| Create project | Name | Non-empty, max 255 chars | "Project name is required." |
| Add revenue | Client name | Non-empty | "Client name is required." |
| Add revenue | Amount | Positive number | "Enter a valid amount." |
| Add revenue | Start date | Valid date, not in the past | "Enter a valid start date." |
| Approve action | No required fields | — | — |
| Reject action | Comment | Non-empty | "A reason is required when rejecting." |
| Changes requested | Comment | Non-empty | "Describe the changes required." |
| Add API key | Key | Must start with `sk-ant-` | "API key format is invalid. It should start with sk-ant-" |
| Invite user | Email | Valid email, non-empty | "Enter a valid email address." |
| Invite user | Role | Must select admin or viewer | "Select a role." |

**Do not disable the submit button based on validation state alone on login and setup forms.** The user should be able to attempt submission to see all errors at once (first submission). Disable the button only while a request is in flight.

---

### 2.6 Accessibility

These are minimum requirements, not aspirational targets. WCAG AA compliance is the target.

**Aria labels — required on every:**
- Icon-only button (e.g. collapse sidebar toggle, copy button on code blocks, show/hide password toggle): `aria-label="[action]"`
- Status badge: `aria-label="Status: [value]"` — the visual text uses uppercase abbreviations; screen readers need the full label
- Navigation items when sidebar is collapsed (icon-only mode): `aria-label="[section name]"`
- Modal close button: `aria-label="Close"`
- Confirmation dialog destructive action button: `aria-label="[action] [entity name]"` (e.g. `aria-label="Terminate CEO agent"`)
- Avatar (user and agent): `aria-label="[name]'s avatar"`

**Keyboard navigation — required on:**
- All forms: Tab order must follow visual reading order (top to bottom, left to right)
- All modals and dialogs: focus must be trapped inside the modal while open. On close, focus returns to the triggering element
- Sidebar navigation: Arrow keys must navigate between items
- Kanban board: Keyboard drag-and-drop is not required for v1, but cards must be focusable and operable via Enter to open the detail view
- Pagination controls: Left/right arrow keys switch pages (per feature spec)
- Dropdowns and select menus: Standard keyboard behaviour (shadcn/ui handles this if used correctly)

**Focus management:**
- When a modal opens, focus must move to the first interactive element inside it (or the modal heading if no interactive elements come first)
- When a toast appears, it must not steal focus
- When an error state appears inline, do not move focus to it — the user is already in the form

**Colour contrast:**
- All text meets WCAG AA (4.5:1 for body text, 3:1 for large text and UI components)
- The design spec states the accent colour `#4F6EF7` achieves 5.2:1 against `--bg-base` (`#0A0A0F`) — do not deviate from these token values

---

## Section 3: Cross-Integration Checklist

Use this checklist before marking any feature as complete and opening a PR. Every item must be ticked. If an item does not apply (e.g. a feature has no form), note that explicitly in the PR description.

**API Integration**
- [ ] API endpoint path matches exactly — includes `/api/v1/` prefix, correct HTTP method
- [ ] Request body field names match the backend schema (snake_case for all API bodies)
- [ ] Response is destructured from the correct shape (`data[]` for lists, top-level for single objects)
- [ ] Pagination handled: `has_more`, `cursor`, and `total` are consumed correctly; the "load more" control is hidden when `has_more` is false
- [ ] Error response parsed as `error.error.message` (not `error.message` directly)

**Data States**
- [ ] Loading state renders a skeleton matching the content layout (not a blank area, not a full-page spinner)
- [ ] Error state renders an inline alert with a human-readable message and a retry button
- [ ] Empty state renders with the correct heading, body copy, and CTA (or explicit note in PR that no CTA applies)
- [ ] Populated state renders correctly with all fields from the response

**Mutations**
- [ ] Successful mutation invalidates the correct react-query cache keys (not `queryClient.invalidateQueries()` with no arguments — be specific)
- [ ] Mutation error shows a toast notification (not a console.error and silent failure)
- [ ] Optimistic update applied where specified in Section 2.4; rollback works correctly on error
- [ ] Confirmation dialog shown before all destructive actions (terminate agent, delete/deactivate user, reject approval)

**Real-time**
- [ ] WebSocket event type consumed correctly (see architecture Section 3 for event names: `agent_activity`, `task_update`, `approvals_update`)
- [ ] Real-time update reflects in the UI without a full page refresh
- [ ] React-query cache updated (not just local component state) when a WebSocket event arrives, so all subscribed components on the page reflect the change

**RBAC**
- [ ] Board-only actions (approve/reject, terminate agent, manage API keys, manage users) are not rendered at all for admin and viewer roles — not just disabled, not just blocked at the API
- [ ] Admin-only actions (create task, create project, add revenue) are not rendered for viewer roles
- [ ] The sidebar Approvals item is hidden entirely for non-board users (per feature spec)
- [ ] Finance tab is not rendered for viewers (feature spec states board/admin only)

**Forms**
- [ ] Client-side validation implemented with zod schema
- [ ] Validation errors show inline below the offending field
- [ ] Submit button disabled while request is in flight
- [ ] Password fields have show/hide toggle (login and setup forms)
- [ ] All form fields have visible labels (not placeholder-only)

**Accessibility**
- [ ] All icon-only buttons have `aria-label`
- [ ] All modals trap focus correctly
- [ ] Form tab order is logical
- [ ] Status badges have `aria-label` with full text

**Responsive**
- [ ] Layout tested at 375px viewport width (mobile minimum per design spec)
- [ ] Sidebar collapses to 60px icon-only mode at narrow viewports
- [ ] Tables scroll horizontally rather than overflowing viewport

---

## Section 4: Known Integration Gaps

These are specific gaps in the current code that will cause breakages or missing functionality. Each one needs a fix before the feature it belongs to can ship.

---

### Gap 1 — Global URL prefix mismatch (Severity: CRITICAL)

**File:** `client/src/lib/api.ts`

Every API call in `api.ts` uses `/api/...` without the `v1` segment. The backend registers all routes under `/api/v1`. This means every API call the frontend makes will return a 404. The fix is straightforward: add a constant `const API_BASE = '/api/v1'` and prepend it to every path, or update every path string directly. This must be fixed before any other integration work can be tested.

---

### Gap 2 — Token refresh reads wrong field names (Severity: CRITICAL)

**File:** `client/src/lib/api.ts`, `attemptRefresh()` line 43

After a token refresh, the code reads `json.data.accessToken` and `json.data.refreshToken`. The backend returns `json.access_token` and `json.refresh_token` at the top level (no `data` wrapper, snake_case). The silent failure here means every user session will expire without recovery — the user gets redirected to `/login` after 15 minutes with no recourse. Fix both the field path and the casing.

---

### Gap 3 — Logout sends no refresh token (Severity: HIGH)

**File:** `client/src/lib/api.ts`, `auth.logout()` line 124

The logout call sends no body. The backend expects `{ "refresh_token": "string" }` to revoke the session. Without it, sessions persist in the database indefinitely (until natural expiry). This is a security concern — logging out does not actually invalidate the session. Fix: read the refresh token from localStorage and include it in the logout request body.

---

### Gap 4 — Auth/me endpoint not defined in architecture (Severity: HIGH)

**File:** `client/src/lib/api.ts` line 131, architecture doc

`api.ts` calls `GET /api/auth/me` to re-hydrate auth state on page load. This endpoint is not specified in the architecture doc. The backend `settingsRoutes` and `authRoutes` do not include it based on the architecture. This endpoint must be designed and built. Without it, refreshing the page while logged in will lose auth state and redirect the user to login.

---

### Gap 5 — Setup endpoint entirely missing from architecture (Severity: CRITICAL)

**File:** Architecture doc Section 2.1, `client/src/lib/api.ts` line 134

The feature spec defines a three-step company setup wizard. The `api.ts` calls `POST /api/auth/setup`. Neither the architecture doc nor `index.ts` defines or registers this endpoint. Without it, the app cannot be initialised at all. The endpoint needs to be designed (see Section 1.1 above for the suggested behaviour) and added to both the architecture doc and the auth routes.

---

### Gap 6 — Approval decision uses wrong method, path, and field names (Severity: CRITICAL)

**File:** `client/src/lib/api.ts`, `approvals.decide()` line 281

Three simultaneous errors: POST vs PATCH, wrong path (`/decide` appended), wrong field name (`decision` vs `status`) with wrong value strings (`approve`/`reject` vs `approved`/`rejected`). The UI also has no mechanism for `changes_requested` which the backend supports and the feature spec requires. This function needs to be rewritten entirely.

---

### Gap 7 — Agent trigger endpoint path mismatch (Severity: HIGH)

**File:** `client/src/lib/api.ts`, `agents.trigger()` line 169

The frontend calls `POST /api/agents/${agentId}/trigger`. The architecture defines the trigger endpoint as `POST /api/v1/executions/:agent_id/trigger`. These are different paths on different resource collections. Decide which is canonical. The architecture is the source of truth, so update the frontend to call the executions endpoint.

---

### Gap 8 — Finance summary and agent-costs endpoints do not exist (Severity: HIGH)

**File:** `client/src/lib/api.ts`, `finance.summary()` line 299 and `finance.agentCosts()` line 303

Two frontend finance calls target endpoints that are not defined anywhere in the architecture. Either map these to the existing finance endpoints (revenue, payroll, pipeline, projection) or raise with the CTO to add them formally to the architecture. Do not implement undocumented endpoints without CTO sign-off.

---

### Gap 9 — Clients pipeline points to wrong endpoint (Severity: HIGH)

**File:** `client/src/lib/api.ts`, `clients.pipeline()` line 318

Calls `GET /api/clients/pipeline`. Pipeline leads are a separate resource at `GET /api/v1/pipeline` — not nested under clients. Update the path.

---

### Gap 10 — Settings sub-routes partially mismatched (Severity: MEDIUM)

**File:** `client/src/lib/api.ts` lines 333-354

`settings.users()` should call `GET /api/v1/users`, not `/api/settings/users`. `settings.knowledge()` should call `GET /api/v1/knowledge`, not `/api/settings/knowledge`. `settings.budgets()` has no corresponding endpoint at all — needs design decision.

---

### Gap 11 — Task checkin missing `outcome` field (Severity: HIGH)

**File:** `client/src/lib/api.ts`, `tasks.checkin()` line 244

The backend requires `outcome: "completed" | "failed" | "released"` in the checkin body. The frontend does not send it. Every checkin request will fail server-side validation. This also means the frontend currently has no way to express a failed or released checkin — only a completion. The `tasks.checkin()` function signature needs an `outcome` parameter.

---

### Gap 12 — Task checkout sends `agentId` (camelCase) instead of `agent_id` (snake_case) (Severity: HIGH)

**File:** `client/src/lib/api.ts`, `tasks.checkout()` line 241

The backend API contract uses snake_case throughout. The checkout body sends `agentId` which will fail JSON Schema validation on the Fastify route. Fix: send `agent_id`.

---

### Gap 13 — `error` and `offline` agent status values have no badge styling defined (Severity: MEDIUM)

**File:** Design spec Section 1.7, schema.ts agentStatusEnum

The schema (per CEO review) added `error` and `offline` to the agent status enum. The design spec's badge recipe table covers only `active`, `running`, `idle`, `paused`, `blocked`, `vacant`. There is no colour assignment for `error` or `offline`. Engineering cannot build `StatusBadge` for all eight states without this. Before implementing the badge component, raise this with the UI/UX Lead and get the two missing badge recipes confirmed in writing.

---

### Gap 14 — Dashboard expects three endpoints; backend provides one (Severity: MEDIUM)

**File:** `client/src/lib/api.ts` lines 256-266, architecture 2.14

`dashboard.summary()`, `dashboard.activity()`, and `dashboard.agentStatus()` call three separate endpoints. The backend provides a single `GET /api/v1/dashboard` that returns all of this data in one response. The frontend needs to either be refactored to call one endpoint and distribute the result, or the backend needs to be extended with sub-routes. Refactoring the frontend is the lower-risk approach and does not require CTO sign-off.

---

### Gap 15 — No `userRoutes` registered in index.ts (Severity: MEDIUM)

**File:** `app/src/index.ts`

`index.ts` registers: `authRoutes`, `agentRoutes`, `projectRoutes`, `taskRoutes`, `approvalRoutes`, `financeRoutes`, `clientRoutes`, `settingsRoutes`, `dashboardRoutes`, `executionRoutes`. The architecture defines `GET /api/v1/users` and `POST /api/v1/users` (Section 2.2). There is no `userRoutes` import or registration. User management (invite user, deactivate user) will have no backend handler. A `userRoutes` module needs to be created and registered.

---

*Document ends.*
