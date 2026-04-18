# NBIAI Team App -- Comprehensive Test Plan

**Author:** QA Lead
**Date:** 2026-03-28
**Version:** 1.0
**Status:** Ready for QA Engineer execution
**Spec References:** Feature Spec v1.0, Technical Architecture v1.0, Design Spec v1.0, CEO Review

---

## How to Use This Document

Every test case traces to a specific requirement in the feature specification, technical architecture, or CEO review. The QA Engineer executes each case, fills in the Pass/Fail column, and logs any failures as bugs in the companion `bug_report.md`.

---

## 1. Authentication (AUTH)

### AUTH-001: Successful Login

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "If user is already authenticated (valid access token in memory), `/login` redirects to `/`" (Feature Spec Section 1.3); POST /login issues JWT + refresh token (auth.ts line 9) |
| Test description | Verify a valid user can log in with correct email and password and receives tokens |
| Preconditions | A board user exists in the database with a known email and password |
| Steps | 1. Send POST /api/v1/auth/login with `{ email, password }` 2. Verify response status is 200 3. Verify response body contains `accessToken`, `refreshToken`, and `user` object 4. Verify `user` contains `id`, `email`, `displayName`, `role`, `avatarUrl` |
| Expected result | 200 response with valid JWT access token, refresh token, and user object |
| How to verify | API call; decode JWT to confirm payload contains `sub`, `email`, `role`, `companyId` |
| Pass/Fail | |

### AUTH-002: Login With Invalid Credentials

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "Invalid email or password. Please try again." (Feature Spec Section 1.3) |
| Test description | Verify login fails with incorrect password |
| Preconditions | A user exists with known email |
| Steps | 1. Send POST /api/v1/auth/login with correct email, wrong password 2. Verify response status is 401 3. Verify error code is `UNAUTHORIZED` |
| Expected result | 401 with message "Invalid email or password." |
| How to verify | API call |
| Pass/Fail | |

### AUTH-003: Login With Non-Existent Email

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | Timing-safe comparison to prevent email enumeration (auth.ts lines 150-158) |
| Test description | Verify login with non-existent email returns the same error as wrong password (no enumeration) |
| Preconditions | No user exists with the test email |
| Steps | 1. Send POST /api/v1/auth/login with non-existent email 2. Verify response status is 401 3. Verify error message matches AUTH-002 exactly |
| Expected result | 401 with identical error to AUTH-002, no indication the email does not exist |
| How to verify | API call; compare response body with AUTH-002 |
| Pass/Fail | |

### AUTH-004: Login With Inactive Account

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "Your account has been deactivated. Contact the board operator." (Feature Spec Section 1.3) |
| Test description | Verify login fails for deactivated user |
| Preconditions | A user exists with `is_active` = false |
| Steps | 1. Send POST /api/v1/auth/login with the deactivated user's credentials 2. Verify response status is 401 |
| Expected result | 401 response. Note: current implementation returns the same generic "Invalid email or password" message rather than the spec's distinct deactivation message (see bug report) |
| How to verify | API call |
| Pass/Fail | |

### AUTH-005: Token Refresh

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "Token rotation: each /refresh call invalidates the old session and creates a new one" (auth.ts lines 17-18) |
| Test description | Verify refresh token rotation works correctly |
| Preconditions | A user is logged in with valid tokens |
| Steps | 1. Log in and save the refresh token 2. Send POST /api/v1/auth/refresh with `{ refreshToken }` 3. Verify response is 200 with new `accessToken` and `refreshToken` 4. Verify the old refresh token no longer works (repeat step 2 with old token) |
| Expected result | New tokens issued; old refresh token returns 401 on reuse |
| How to verify | API call; verify old session row is deleted from DB |
| Pass/Fail | |

### AUTH-006: Refresh With Expired Token

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "If the refresh token is invalid or expired, the user is redirected to `/login`" (Feature Spec Section 1.4) |
| Test description | Verify expired refresh tokens are rejected |
| Preconditions | A session exists with `expires_at` in the past |
| Steps | 1. Manipulate DB to set session `expires_at` to past date 2. Send POST /api/v1/auth/refresh with the refresh token 3. Verify response is 401 |
| Expected result | 401 with "Invalid or expired refresh token." |
| How to verify | API call |
| Pass/Fail | |

### AUTH-007: Refresh With Revoked Token

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "Set on logout or token rotation. Non-null means the session is invalid." (schema.ts sessions.revokedAt) |
| Test description | Verify revoked refresh tokens are rejected |
| Preconditions | A session exists with `revoked_at` set |
| Steps | 1. Set `revoked_at` on a session in the DB 2. Send POST /api/v1/auth/refresh with that session's token 3. Verify response is 401 |
| Expected result | 401 with "Session has been revoked." |
| How to verify | API call |
| Pass/Fail | |

### AUTH-008: Logout

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "POST /api/auth/logout invalidates the refresh token (deletes the Session record)" (Feature Spec Section 1.4) |
| Test description | Verify logout deletes the session |
| Preconditions | User is logged in with valid tokens |
| Steps | 1. Send POST /api/v1/auth/logout with `{ refreshToken }` and Authorization header 2. Verify response is 204 3. Verify the session row is deleted from DB 4. Verify the refresh token can no longer be used |
| Expected result | 204 response; session deleted; refresh token invalid |
| How to verify | API call + DB query |
| Pass/Fail | |

### AUTH-009: GET /me Returns Current User

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "GET /me -- return current user from DB" (auth.ts line 11) |
| Test description | Verify /me returns the authenticated user's profile |
| Preconditions | User is logged in |
| Steps | 1. Send GET /api/v1/auth/me with valid Authorization header 2. Verify response contains `id`, `email`, `displayName`, `role`, `avatarUrl`, `companyId`, `lastLoginAt` |
| Expected result | 200 with complete user profile (excluding password_hash) |
| How to verify | API call |
| Pass/Fail | |

### AUTH-010: GET /me Without Token Returns 401

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "AUTHENTICATION_REQUIRED: 401 -- No valid access token" (Feature Spec Section 15.2) |
| Test description | Verify /me rejects unauthenticated requests |
| Preconditions | None |
| Steps | 1. Send GET /api/v1/auth/me without Authorization header 2. Verify response is 401 |
| Expected result | 401 |
| How to verify | API call |
| Pass/Fail | |

### AUTH-011: First-Time Setup

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "First-time setup endpoint. Creates the company and the first board-level user." (auth.ts line 318) |
| Test description | Verify setup creates company and board user in a single transaction |
| Preconditions | No users exist in the database |
| Steps | 1. Send POST /api/v1/auth/setup with `{ companyName, displayName, email, password }` 2. Verify response is 201 3. Verify company row created in DB 4. Verify user row created with role `board` 5. Verify response contains access and refresh tokens |
| Expected result | 201 with auth tokens; company and board user created |
| How to verify | API call + DB queries on companies and users tables |
| Pass/Fail | |

### AUTH-012: Setup Blocked When Users Already Exist

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "Returns 403 if any users already exist (setup has already been completed)." (auth.ts line 322) |
| Test description | Verify setup cannot run twice |
| Preconditions | At least one user exists |
| Steps | 1. Send POST /api/v1/auth/setup 2. Verify response is 403 with message containing "Setup has already been completed" |
| Expected result | 403 |
| How to verify | API call |
| Pass/Fail | |

### AUTH-013: JWT Expiry Is 15 Minutes

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "JWT access token TTL: 15 minutes" (auth.ts line 21) |
| Test description | Verify the JWT access token expires after 15 minutes |
| Preconditions | User is logged in |
| Steps | 1. Decode the JWT access token 2. Verify `exp - iat` equals 900 seconds (15 minutes) |
| Expected result | Token TTL is 900 seconds |
| How to verify | Decode JWT payload |
| Pass/Fail | |

### AUTH-014: Refresh Token TTL Is 30 Days

| Field | Value |
|---|---|
| Feature area | Authentication |
| Requirement | "Refresh token TTL: 30 days" (auth.ts line 21); REFRESH_TOKEN_TTL_DAYS = 30 (auth.ts line 72) |
| Test description | Verify the session expires_at is set to 30 days from creation |
| Preconditions | User is logged in |
| Steps | 1. Query the sessions table for the latest session 2. Verify `expires_at` is approximately 30 days from `created_at` |
| Expected result | expires_at is 30 days after creation |
| How to verify | DB query |
| Pass/Fail | |

### AUTH-015: Refresh Token Is SHA-256 Hashed Before Storage

| Field | Value |
|---|---|
| Feature area | Security |
| Requirement | CEO Review: "Refresh token storage: SHA-256 hashed before storage; raw token never persisted" (binding decision) |
| Test description | Verify the raw refresh token is not stored in the sessions table |
| Preconditions | User is logged in; raw refresh token is known |
| Steps | 1. Query sessions table 2. Verify `refresh_token_hash` column does not contain the raw token 3. Verify SHA-256 hash of the raw token matches the stored hash |
| Expected result | Only the hash is stored; raw token is not persisted |
| How to verify | DB query + hash comparison |
| Pass/Fail | |

### AUTH-016: Password Hashed With Argon2id

| Field | Value |
|---|---|
| Feature area | Security |
| Requirement | CEO Review: "Password hashing: Argon2id (CTO's spec)" (binding decision) |
| Test description | Verify passwords are hashed with Argon2id, not bcrypt |
| Preconditions | A user has been created |
| Steps | 1. Query users table for the password_hash column 2. Verify the hash starts with `$argon2id$` (not `$2a$` or `$2b$`) |
| Expected result | password_hash uses Argon2id format |
| How to verify | DB query |
| Pass/Fail | |

### AUTH-017: Rate Limiting on Auth Endpoints

| Field | Value |
|---|---|
| Feature area | Security |
| Requirement | "10 requests per minute" rate limit on auth prefix (auth.ts line 3); "After 5 consecutive failed login attempts from the same IP within 15 minutes, all attempts from that IP are rate-limited to 1 per 30 seconds" (Feature Spec Section 1.3) |
| Test description | Verify rate limiting is enforced on auth endpoints |
| Preconditions | None |
| Steps | 1. Send 11 POST /api/v1/auth/login requests in rapid succession 2. Verify that the 11th request returns 429 |
| Expected result | 429 after exceeding rate limit |
| How to verify | API calls |
| Pass/Fail | |

---

## 2. Agents (AGENT)

### AGENT-001: List Agents

| Field | Value |
|---|---|
| Feature area | Agents |
| Requirement | "GET /api/agents -- paginated list with role join" (agents.ts line 4) |
| Test description | Verify authenticated users can list agents with cursor pagination |
| Preconditions | Multiple agents exist; user is authenticated |
| Steps | 1. Send GET /api/agents with Authorization header 2. Verify response contains `data` array and `pagination` object 3. Verify pagination contains `cursor`, `hasMore`, `total` 4. Verify each agent includes `id`, `name`, `status`, `modelTier`, `role` |
| Expected result | 200 with paginated agent list filtered by companyId |
| How to verify | API call |
| Pass/Fail | |

### AGENT-002: List Agents Filtered by Status

| Field | Value |
|---|---|
| Feature area | Agents |
| Requirement | Agent list query supports status filter (agents.ts line 36) |
| Test description | Verify status filter works |
| Preconditions | Agents with different statuses exist |
| Steps | 1. Send GET /api/agents?status=idle 2. Verify all returned agents have status `idle` |
| Expected result | Only idle agents returned |
| How to verify | API call |
| Pass/Fail | |

### AGENT-003: Get Agent Detail

| Field | Value |
|---|---|
| Feature area | Agents |
| Requirement | "GET /api/agents/:id -- full detail with role, current task, direct reports" (agents.ts line 5) |
| Test description | Verify single agent detail includes role, current task, and direct reports |
| Preconditions | Agent exists with known ID |
| Steps | 1. Send GET /api/agents/:id 2. Verify response contains agent data, role object, currentTask (or null), and directReports array |
| Expected result | 200 with complete agent detail |
| How to verify | API call |
| Pass/Fail | |

### AGENT-004: Create Agent (Board/Admin Only)

| Field | Value |
|---|---|
| Feature area | Agents |
| Requirement | "POST /api/agents -- hire agent (board, admin)" (agents.ts line 6) |
| Test description | Verify board and admin can create agents |
| Preconditions | A role exists; user is board or admin |
| Steps | 1. Send POST /api/agents with `{ name, roleId }` 2. Verify response is 201 3. Verify agent is created with status `idle` and model tier from role default 4. Verify a heartbeat record was created |
| Expected result | 201 with created agent |
| How to verify | API call + DB query |
| Pass/Fail | |

### AGENT-005: Create Agent Rejected for Viewer

| Field | Value |
|---|---|
| Feature area | RBAC |
| Requirement | Board and Admin only access (agents.ts line 242) |
| Test description | Verify viewer role cannot create agents |
| Preconditions | User has viewer role |
| Steps | 1. Send POST /api/agents with viewer credentials 2. Verify response is 403 |
| Expected result | 403 |
| How to verify | API call |
| Pass/Fail | |

### AGENT-006: Update Agent

| Field | Value |
|---|---|
| Feature area | Agents |
| Requirement | "PATCH /api/agents/:id -- update agent (board, admin)" (agents.ts line 7) |
| Test description | Verify agent fields can be updated |
| Preconditions | Agent exists |
| Steps | 1. Send PATCH /api/agents/:id with `{ name: "New Name", status: "paused" }` 2. Verify response contains updated values |
| Expected result | 200 with updated agent |
| How to verify | API call |
| Pass/Fail | |

### AGENT-007: Terminate Agent (Board Only)

| Field | Value |
|---|---|
| Feature area | Agents |
| Requirement | "DELETE /api/agents/:id -- terminate agent (board only, soft delete)" (agents.ts line 8); "agent `is_active` set to false, status set to `offline`" (Feature Spec Section 3.8) |
| Test description | Verify soft delete sets status to terminated and unassigns current task |
| Preconditions | Agent exists with a current task |
| Steps | 1. Send DELETE /api/agents/:id with board credentials 2. Verify response is 204 3. Verify agent status is `terminated` and `terminated_at` is set 4. Verify current task's `assigned_agent_id` is set to null |
| Expected result | 204; agent soft-deleted; task unassigned |
| How to verify | API call + DB query |
| Pass/Fail | |

### AGENT-008: Terminate Agent Rejected for Admin

| Field | Value |
|---|---|
| Feature area | RBAC |
| Requirement | Board only (agents.ts line 321) |
| Test description | Verify admin cannot terminate agents |
| Preconditions | User has admin role |
| Steps | 1. Send DELETE /api/agents/:id with admin credentials 2. Verify response is 403 |
| Expected result | 403 |
| How to verify | API call |
| Pass/Fail | |

### AGENT-009: Get Agent Executions

| Field | Value |
|---|---|
| Feature area | Agents |
| Requirement | "GET /api/agents/:id/executions -- last 20 execution records" (agents.ts line 9) |
| Test description | Verify execution history is returned |
| Preconditions | Agent has execution records |
| Steps | 1. Send GET /api/agents/:id/executions 2. Verify response contains up to 20 records ordered by startedAt desc |
| Expected result | 200 with execution data |
| How to verify | API call |
| Pass/Fail | |

### AGENT-010: Get Agent Budget

| Field | Value |
|---|---|
| Feature area | Agents |
| Requirement | "GET /api/agents/:id/budget -- current month budget record" (agents.ts line 10) |
| Test description | Verify budget endpoint returns current month data |
| Preconditions | Agent has a budget record for the current month |
| Steps | 1. Send GET /api/agents/:id/budget 2. Verify response contains `budgetUsd`, `spentUsd`, `percentUsed`, `alertSent`, `monthYear` |
| Expected result | 200 with budget data |
| How to verify | API call |
| Pass/Fail | |

### AGENT-011: Cross-Tenant Agent Isolation

| Field | Value |
|---|---|
| Feature area | Security |
| Requirement | "Every query must filter by companyId" (security requirement) |
| Test description | Verify user from Company A cannot see agents from Company B |
| Preconditions | Two companies exist with separate agents |
| Steps | 1. Authenticate as user from Company A 2. Send GET /api/agents/:idFromCompanyB 3. Verify response is 404 |
| Expected result | 404 (not 200 with another company's data) |
| How to verify | API call |
| Pass/Fail | |

---

## 3. Projects (PROJ)

### PROJ-001: List Projects

| Field | Value |
|---|---|
| Feature area | Projects |
| Requirement | "GET /api/projects -- paginated list with task counts and lead agent" (projects.ts line 4) |
| Test description | Verify paginated project list with task count enrichment |
| Preconditions | Projects exist with tasks |
| Steps | 1. Send GET /api/projects 2. Verify response has `data` with enriched project objects including `taskCounts` 3. Verify taskCounts contains `total`, `backlog`, `inProgress`, `blocked`, `done` |
| Expected result | 200 with projects and task counts |
| How to verify | API call |
| Pass/Fail | |

### PROJ-002: Create Project

| Field | Value |
|---|---|
| Feature area | Projects |
| Requirement | "POST /api/projects -- create project (board, admin)" (projects.ts line 6) |
| Test description | Verify project creation with auto-generated slug |
| Preconditions | User is board or admin |
| Steps | 1. Send POST /api/projects with `{ name, description }` 2. Verify response is 201 3. Verify slug is generated from name 4. Verify default status is `planning` and health is `green` |
| Expected result | 201 with created project |
| How to verify | API call |
| Pass/Fail | |

### PROJ-003: Update Project

| Field | Value |
|---|---|
| Feature area | Projects |
| Requirement | "PATCH /api/projects/:id -- update project fields" (projects.ts line 7) |
| Test description | Verify project fields can be updated |
| Preconditions | Project exists |
| Steps | 1. Send PATCH /api/projects/:id with `{ status: "active" }` 2. Verify response reflects the update |
| Expected result | 200 with updated project |
| How to verify | API call |
| Pass/Fail | |

### PROJ-004: Delete Project Blocked With Incomplete Tasks

| Field | Value |
|---|---|
| Feature area | Projects |
| Requirement | "Cannot archive project: N incomplete task(s) remain" (projects.ts line 437) |
| Test description | Verify project deletion is blocked when incomplete tasks exist |
| Preconditions | Project has tasks in backlog/assigned/in_progress status |
| Steps | 1. Send DELETE /api/projects/:id 2. Verify response is 409 with message about incomplete tasks |
| Expected result | 409 Conflict |
| How to verify | API call |
| Pass/Fail | |

### PROJ-005: Delete Project With Only Completed Tasks

| Field | Value |
|---|---|
| Feature area | Projects |
| Requirement | "DELETE /api/projects/:id -- archive project (board only; blocks if incomplete tasks)" (projects.ts line 8) |
| Test description | Verify project can be archived when all tasks are done/cancelled |
| Preconditions | Project has only tasks with status `done` or `cancelled` |
| Steps | 1. Send DELETE /api/projects/:id with board credentials 2. Verify response is 204 3. Verify project status is set to `cancelled` |
| Expected result | 204; project status changed to cancelled |
| How to verify | API call + DB query |
| Pass/Fail | |

### PROJ-006: Project Detail Includes Tasks

| Field | Value |
|---|---|
| Feature area | Projects |
| Requirement | "GET /api/projects/:id -- full detail with tasks and assigned agents" (projects.ts line 5) |
| Test description | Verify project detail returns all tasks with assigned agent info |
| Preconditions | Project exists with tasks |
| Steps | 1. Send GET /api/projects/:id 2. Verify response includes `tasks` array with each task's assigned agent |
| Expected result | 200 with project and tasks |
| How to verify | API call |
| Pass/Fail | |

---

## 4. Tasks (TASK)

### TASK-001: Create Task

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "Task created with status `backlog` (if no agent assigned) or `assigned` (if agent assigned)" (Feature Spec Section 6.3) |
| Test description | Verify task creation sets correct initial status |
| Preconditions | A project exists; user is board/admin |
| Steps | 1. Send POST /api/tasks with `{ title, projectId }` (no agent) 2. Verify status is `backlog` 3. Send POST /api/tasks with `{ title, projectId, assignedAgentId }` 4. Verify status is `assigned` and an assignment comment is created |
| Expected result | Backlog when unassigned, assigned when agent specified |
| How to verify | API call + DB query on task_comments |
| Pass/Fail | |

### TASK-002: Valid Status Transition -- backlog to assigned

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "backlog -> assigned, cancelled" (Feature Spec Section 6.5) |
| Test description | Verify backlog to assigned is permitted |
| Preconditions | Task exists with status `backlog` |
| Steps | 1. Send PATCH /api/tasks/:id with `{ status: "assigned" }` 2. Verify response is 200 3. Verify a status_change comment is recorded |
| Expected result | Status updated to assigned |
| How to verify | API call |
| Pass/Fail | |

### TASK-003: Valid Status Transition -- assigned to in_progress

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "assigned -> in_progress, backlog, cancelled" (Feature Spec Section 6.5) |
| Test description | Verify assigned to in_progress is permitted |
| Preconditions | Task in assigned status |
| Steps | 1. Send PATCH /api/tasks/:id with `{ status: "in_progress" }` 2. Verify response is 200 |
| Expected result | Status updated |
| How to verify | API call |
| Pass/Fail | |

### TASK-004: Valid Status Transition -- in_progress to review

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "in_progress -> blocked, review, done, cancelled" (Feature Spec Section 6.5) |
| Test description | Verify in_progress to review is permitted |
| Preconditions | Task in in_progress status |
| Steps | 1. Send PATCH /api/tasks/:id with `{ status: "review" }` 2. Verify response is 200 |
| Expected result | Status updated |
| How to verify | API call |
| Pass/Fail | |

### TASK-005: Valid Status Transition -- review to done

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "review -> done, in_progress" (Feature Spec Section 6.5) |
| Test description | Verify review to done is permitted |
| Preconditions | Task in review status |
| Steps | 1. Send PATCH /api/tasks/:id with `{ status: "done" }` 2. Verify response is 200 |
| Expected result | Status updated to done |
| How to verify | API call |
| Pass/Fail | |

### TASK-006: Invalid Status Transition -- backlog to in_progress

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "backlog -> assigned, cancelled" only (Feature Spec Section 6.5) |
| Test description | Verify backlog cannot go directly to in_progress |
| Preconditions | Task in backlog status |
| Steps | 1. Send PATCH /api/tasks/:id with `{ status: "in_progress" }` 2. Verify response is 422 |
| Expected result | 422 with message about invalid transition. NOTE: Code currently ALLOWS backlog->in_progress (see bug report BUG-001) |
| How to verify | API call |
| Pass/Fail | |

### TASK-007: Invalid Status Transition -- done to any

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "done -> None (terminal)" (Feature Spec Section 6.5) |
| Test description | Verify done is a terminal state |
| Preconditions | Task in done status |
| Steps | 1. Send PATCH /api/tasks/:id with `{ status: "backlog" }` 2. Verify response is 422 |
| Expected result | 422 |
| How to verify | API call |
| Pass/Fail | |

### TASK-008: Invalid Status Transition -- cancelled to any

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "cancelled -> backlog" only, by Board (Feature Spec Section 6.5) |
| Test description | Verify cancelled is a terminal state in the current implementation |
| Preconditions | Task in cancelled status |
| Steps | 1. Send PATCH /api/tasks/:id with `{ status: "backlog" }` 2. Verify response is 422 (current code has empty transitions for cancelled) |
| Expected result | 422 (NOTE: spec says cancelled->backlog should be allowed by Board; see BUG-002) |
| How to verify | API call |
| Pass/Fail | |

### TASK-009: Task Checkout -- Atomic

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "Atomic checkout mechanism" (schema.ts task_checkouts); "If an agent attempts to check out a task that is already checked out by another agent, the action fails" (Feature Spec Section 6.5) |
| Test description | Verify only one agent can check out a task at a time |
| Preconditions | Task exists; two agents exist |
| Steps | 1. Send POST /api/tasks/:id/checkout with `{ agentId: agent1 }` 2. Verify 201 3. Send POST /api/tasks/:id/checkout with `{ agentId: agent2 }` 4. Verify 409 with "Task is already checked out by another agent." |
| Expected result | Second checkout blocked with 409 |
| How to verify | API call |
| Pass/Fail | |

### TASK-010: Task Checkout -- Same Agent Refresh

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "Same agent -- release old checkout and create a fresh one (refreshes expiry)" (tasks.ts lines 604-609) |
| Test description | Verify same agent can refresh checkout |
| Preconditions | Task checked out by agent1 |
| Steps | 1. Send POST /api/tasks/:id/checkout with `{ agentId: agent1 }` again 2. Verify 201 3. Verify old checkout has `checked_in_at` set and outcome `released` |
| Expected result | Old checkout released; new checkout created |
| How to verify | API call + DB query |
| Pass/Fail | |

### TASK-011: Task Checkin

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "POST /api/tasks/:id/checkin -- agent checks in a task" (tasks.ts line 11) |
| Test description | Verify checkin releases the checkout and optionally stores output |
| Preconditions | Task is checked out by an agent |
| Steps | 1. Send POST /api/tasks/:id/checkin with `{ agentId, output: "Result text" }` 2. Verify 204 3. Verify checkout row has `checked_in_at` set and outcome `completed` 4. Verify task output field is updated |
| Expected result | 204; checkout released; output stored |
| How to verify | API call + DB query |
| Pass/Fail | |

### TASK-012: Add Comment to Task

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "POST /api/tasks/:id/comments -- add a human comment" (tasks.ts line 8) |
| Test description | Verify comments can be added to tasks |
| Preconditions | Task exists |
| Steps | 1. Send POST /api/tasks/:id/comments with `{ content: "Test comment" }` 2. Verify 201 3. Verify comment appears in task detail |
| Expected result | 201 with created comment |
| How to verify | API call |
| Pass/Fail | |

### TASK-013: Add Task Relation With Mirror

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "Rows are inserted in pairs to maintain bidirectional queries" (schema.ts task_relations); "POST /api/tasks/:id/relations -- add a task relation (with mirror)" (tasks.ts line 12) |
| Test description | Verify relation creates both forward and mirror entries |
| Preconditions | Two tasks exist |
| Steps | 1. Send POST /api/tasks/:taskA/relations with `{ relatedTaskId: taskB, relationType: "blocking" }` 2. Verify 201 3. Query task_relations for taskA -- should have `blocking` relation to taskB 4. Query task_relations for taskB -- should have `blocked_by` relation to taskA |
| Expected result | Both relation rows created |
| How to verify | API call + DB query |
| Pass/Fail | |

### TASK-014: Self-Relation Blocked

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "task_id != related_task_id" (schema.ts CHECK constraint) |
| Test description | Verify a task cannot relate to itself |
| Preconditions | Task exists |
| Steps | 1. Send POST /api/tasks/:taskA/relations with `{ relatedTaskId: taskA, relationType: "related" }` 2. Verify error response |
| Expected result | Error (DB constraint violation) |
| How to verify | API call |
| Pass/Fail | |

### TASK-015: Task Detail Includes All Enrichments

| Field | Value |
|---|---|
| Feature area | Tasks |
| Requirement | "GET /api/tasks/:id -- full detail with comments, relations, checkout" (tasks.ts line 5) |
| Test description | Verify task detail returns complete data |
| Preconditions | Task exists with comments, relations, and active checkout |
| Steps | 1. Send GET /api/tasks/:id 2. Verify response includes `taskRelations`, `taskComments`, `checkout`, `assignedAgent`, `createdByAgent`, `project` |
| Expected result | 200 with all enrichments |
| How to verify | API call |
| Pass/Fail | |

---

## 5. Agent Execution (EXEC)

### EXEC-001: Successful Execution Run

| Field | Value |
|---|---|
| Feature area | Agent Execution |
| Requirement | 16-step execution flow (runner.ts lines 7-25) |
| Test description | Verify complete execution flow from agent load to result |
| Preconditions | Agent exists with idle status; task is assigned; API key configured; budget available |
| Steps | 1. Call `runAgentExecution({ agentId, taskId, triggeredBy: "manual", companyId })` 2. Verify agent status changes to `running` during execution 3. Verify task checkout is created 4. Verify execution record is created with status `running`, then `completed` 5. Verify task status transitions from `assigned` to `in_progress` 6. Verify checkout is released 7. Verify agent status returns to `active` 8. Verify activity log entry is written 9. Verify pg_notify is called |
| Expected result | Execution completes; all records updated |
| How to verify | Function call + DB queries |
| Pass/Fail | |

### EXEC-002: Budget Block Prevents Execution

| Field | Value |
|---|---|
| Feature area | Agent Execution |
| Requirement | "Step 2: Budget check" (runner.ts line 192); "Hard stop at 100%" (Feature Spec Section 7.5) |
| Test description | Verify execution is blocked when budget cap is reached |
| Preconditions | Agent budget spent >= budget cap |
| Steps | 1. Set agent budget spent to equal or exceed cap in DB 2. Call `runAgentExecution(...)` 3. Verify result status is `budget_blocked` 4. Verify activity log entry for budget block |
| Expected result | Execution returns `budget_blocked` |
| How to verify | Function call + DB query |
| Pass/Fail | |

### EXEC-003: No Task Returns no_task

| Field | Value |
|---|---|
| Feature area | Agent Execution |
| Requirement | "If no tasks are assigned, the agent reports `no_task` and goes back to idle" (Feature Spec Section 7.2) |
| Test description | Verify execution without available task returns no_task |
| Preconditions | Agent has no assigned tasks and no current task |
| Steps | 1. Call `runAgentExecution({ agentId, taskId: null, ... })` 2. Verify result status is `no_task` 3. Verify agent status set to `idle` |
| Expected result | no_task result; agent set to idle |
| How to verify | Function call + DB query |
| Pass/Fail | |

### EXEC-004: Terminated Agent Skipped

| Field | Value |
|---|---|
| Feature area | Agent Execution |
| Requirement | "Abort if not found, terminated, or paused" (runner.ts line 10) |
| Test description | Verify terminated agents cannot execute |
| Preconditions | Agent status is `terminated` |
| Steps | 1. Call `runAgentExecution(...)` 2. Verify result status is `failed` with error "Agent is terminated" |
| Expected result | Failed with appropriate error |
| How to verify | Function call |
| Pass/Fail | |

### EXEC-005: Paused Agent Skipped

| Field | Value |
|---|---|
| Feature area | Agent Execution |
| Requirement | Same as EXEC-004 |
| Test description | Verify paused agents cannot execute |
| Preconditions | Agent status is `paused` |
| Steps | 1. Call `runAgentExecution(...)` 2. Verify result status is `failed` with error "Agent is paused" |
| Expected result | Failed with appropriate error |
| How to verify | Function call |
| Pass/Fail | |

### EXEC-006: Execution Failure Recovery

| Field | Value |
|---|---|
| Feature area | Agent Execution |
| Requirement | "On any error in steps 7-14: mark execution failed, release checkout, set agent idle" (runner.ts lines 27-28) |
| Test description | Verify graceful recovery on execution failure |
| Preconditions | Agent and task exist; Claude API call will fail |
| Steps | 1. Configure context to cause an error during execution 2. Call `runAgentExecution(...)` 3. Verify execution record status is `failed` with error message 4. Verify checkout is released with outcome `failed` 5. Verify agent status is set to `idle` 6. Verify activity log records the failure |
| Expected result | All cleanup performed; error recorded |
| How to verify | Function call + DB queries |
| Pass/Fail | |

### EXEC-007: Spend Recording After Execution

| Field | Value |
|---|---|
| Feature area | Agent Execution |
| Requirement | "Step 9: Record spend" (runner.ts line 347) |
| Test description | Verify execution cost is recorded in agent_budgets |
| Preconditions | Agent has a budget record |
| Steps | 1. Note current spent_usd 2. Run a successful execution 3. Verify spent_usd has increased by the execution cost |
| Expected result | spent_usd updated |
| How to verify | DB query before and after |
| Pass/Fail | |

### EXEC-008: Context Loading -- Three Tiers

| Field | Value |
|---|---|
| Feature area | Agent Execution |
| Requirement | "Load three-tier context" (runner.ts line 336); "Context loading hierarchy (Section 3.3) with explicit token budgets per tier" (CEO Review) |
| Test description | Verify all three knowledge tiers are loaded for agent context |
| Preconditions | Knowledge files exist for Tier 1 (company), Tier 2 (role), and Tier 3 (project) |
| Steps | 1. Call `loadAgentContext(agentId, taskId)` 2. Verify the assembled context includes Tier 1, Tier 2, and Tier 3 content |
| Expected result | All three tiers assembled in context |
| How to verify | Function call; inspect returned context object |
| Pass/Fail | |

---

## 6. Approvals (APPR)

### APPR-001: Create Approval Request

| Field | Value |
|---|---|
| Feature area | Approvals |
| Requirement | "POST /api/approvals -- request an approval (system/agent use)" (approvals.ts line 7) |
| Test description | Verify an approval request can be created |
| Preconditions | Agent exists; authenticated user |
| Steps | 1. Send POST /api/approvals with `{ requestedByAgentId, approvalType, summary, content }` 2. Verify 201 3. Verify approval created with status `pending` 4. Verify activity log entry written 5. Verify pg_notify sent |
| Expected result | 201 with pending approval |
| How to verify | API call + DB query |
| Pass/Fail | |

### APPR-002: Approve An Approval (Board Only)

| Field | Value |
|---|---|
| Feature area | Approvals |
| Requirement | "PATCH /api/approvals/:id -- decide on an approval (board only)" (approvals.ts line 6) |
| Test description | Verify board user can approve |
| Preconditions | Pending approval exists; board user authenticated |
| Steps | 1. Send PATCH /api/approvals/:id with `{ decision: "approved" }` 2. Verify response is 200 3. Verify approval status is `approved`, `reviewedByUserId` and `resolvedAt` set |
| Expected result | Approval approved |
| How to verify | API call + DB query |
| Pass/Fail | |

### APPR-003: Reject Requires Comment

| Field | Value |
|---|---|
| Feature area | Approvals |
| Requirement | "A comment is required when rejecting" (Feature Spec Section 10.3) |
| Test description | Verify rejection without comment is blocked |
| Preconditions | Pending approval exists |
| Steps | 1. Send PATCH /api/approvals/:id with `{ decision: "rejected" }` (no comment) 2. Verify response is 400 with validation error |
| Expected result | 400 with "A comment is required when decision is 'rejected'." |
| How to verify | API call |
| Pass/Fail | |

### APPR-004: Changes Requested Requires Comment

| Field | Value |
|---|---|
| Feature area | Approvals |
| Requirement | "A comment is required when requesting changes" (Feature Spec Section 10.3) |
| Test description | Verify changes_requested without comment is blocked |
| Preconditions | Pending approval exists |
| Steps | 1. Send PATCH /api/approvals/:id with `{ decision: "changes_requested" }` (no comment) 2. Verify response is 400 |
| Expected result | 400 |
| How to verify | API call |
| Pass/Fail | |

### APPR-005: Cannot Decide Already-Decided Approval

| Field | Value |
|---|---|
| Feature area | Approvals |
| Requirement | "Approval has already been decided." (approvals.ts line 238) |
| Test description | Verify re-decision on resolved approval is blocked |
| Preconditions | Approval with status `approved` |
| Steps | 1. Send PATCH /api/approvals/:id with `{ decision: "rejected", comment: "Changed my mind" }` 2. Verify 409 |
| Expected result | 409 Conflict |
| How to verify | API call |
| Pass/Fail | |

### APPR-006: List Pending Approvals (Board Only)

| Field | Value |
|---|---|
| Feature area | Approvals |
| Requirement | "GET /api/approvals/pending -- all pending approvals, max 100 (board only)" (approvals.ts line 5) |
| Test description | Verify board-only access to pending approvals |
| Preconditions | Pending approvals exist |
| Steps | 1. Send GET /api/approvals/pending as board user -- verify 200 with data 2. Send GET /api/approvals/pending as admin user -- verify 403 |
| Expected result | Board gets data; admin gets 403 |
| How to verify | API calls |
| Pass/Fail | |

### APPR-007: Approval Activity Log

| Field | Value |
|---|---|
| Feature area | Approvals |
| Requirement | Activity log entries written on creation and decision (approvals.ts lines 327, 258) |
| Test description | Verify activity log entries for approval lifecycle |
| Preconditions | None |
| Steps | 1. Create an approval -- verify activity_log entry with event_type `approval_requested` 2. Decide on the approval -- verify activity_log entry with event_type `approval_decision` |
| Expected result | Two activity log entries |
| How to verify | DB query |
| Pass/Fail | |

---

## 7. Finance (FIN)

### FIN-001: Create Revenue Item

| Field | Value |
|---|---|
| Feature area | Finance |
| Requirement | "POST /api/finance/revenue -- create a revenue item (board only)" (finance.ts line 7) |
| Test description | Verify board user can create revenue entries |
| Preconditions | Board user authenticated |
| Steps | 1. Send POST /api/finance/revenue with `{ clientName, type: "monthly_retainer", amountGbp: 5000, startDate: "2026-01-01" }` 2. Verify 201 3. Verify currency defaults to `GBP` |
| Expected result | 201 with created revenue item |
| How to verify | API call |
| Pass/Fail | |

### FIN-002: List Revenue With Summary

| Field | Value |
|---|---|
| Feature area | Finance |
| Requirement | "GET /api/finance/revenue -- list revenue items with summary" (finance.ts line 5) |
| Test description | Verify revenue list includes summary calculations |
| Preconditions | Revenue items exist |
| Steps | 1. Send GET /api/finance/revenue 2. Verify response includes `data`, `pagination`, and `summary` 3. Verify summary contains `totalMonthlyGbp`, `totalAnnualGbp`, `activeCount` |
| Expected result | 200 with revenue data and summary |
| How to verify | API call |
| Pass/Fail | |

### FIN-003: Create Payroll Item

| Field | Value |
|---|---|
| Feature area | Finance |
| Requirement | "POST /api/finance/payroll -- create a payroll item (board only)" (finance.ts line 12) |
| Test description | Verify payroll creation with annual cost default |
| Preconditions | Board user authenticated |
| Steps | 1. Send POST /api/finance/payroll with `{ name, payrollType: "human", monthlyCostGbp: 3000, startDate: "2026-01-01" }` (no annualCostGbp) 2. Verify 201 3. Verify annualCost defaults to 12 * monthlyCostGbp = 36000 |
| Expected result | 201; annual cost auto-calculated |
| How to verify | API call + DB query |
| Pass/Fail | |

### FIN-004: P&L Summary Calculation

| Field | Value |
|---|---|
| Feature area | Finance |
| Requirement | "GET /api/finance/summary -- full P&L summary" (finance.ts line 17) |
| Test description | Verify P&L summary calculates correctly |
| Preconditions | Revenue, payroll, and agent budget records exist |
| Steps | 1. Send GET /api/finance/summary 2. Verify response contains revenue, costs, net, and pipeline sections 3. Verify net.monthly = monthlyContracted - monthlyPayroll - monthlyAgentCosts |
| Expected result | 200 with correct calculations |
| How to verify | API call; manual calculation verification |
| Pass/Fail | |

### FIN-005: Agent Costs Summary

| Field | Value |
|---|---|
| Feature area | Finance |
| Requirement | "GET /api/finance/agent-costs -- agent budget records for current month" (finance.ts line 18) |
| Test description | Verify agent cost listing for current month |
| Preconditions | Agent budget records exist for current month |
| Steps | 1. Send GET /api/finance/agent-costs 2. Verify response includes agent budgets with spent amounts, ordered by cost desc |
| Expected result | 200 with agent cost data and totalSpentUsd |
| How to verify | API call |
| Pass/Fail | |

### FIN-006: Revenue Soft Delete

| Field | Value |
|---|---|
| Feature area | Finance |
| Requirement | "DELETE /api/finance/revenue/:id -- soft-delete" (finance.ts line 8) |
| Test description | Verify revenue deletion is soft (sets isActive false) |
| Preconditions | Revenue item exists |
| Steps | 1. Send DELETE /api/finance/revenue/:id 2. Verify 204 3. Verify DB row still exists with `is_active` = false |
| Expected result | 204; soft deleted |
| How to verify | API call + DB query |
| Pass/Fail | |

### FIN-007: Pipeline Weighted Value

| Field | Value |
|---|---|
| Feature area | Finance |
| Requirement | "Weighted Value (GBP): Potential * Probability" (Feature Spec Section 8.7) |
| Test description | Verify pipeline weighted value calculation in summary |
| Preconditions | Pipeline leads with expected values and probabilities exist |
| Steps | 1. Create leads with known values and stages 2. Send GET /api/finance/summary 3. Verify weightedPipelineValue = sum(expectedValue * probability / 100) |
| Expected result | Correct weighted calculation |
| How to verify | API call + manual calculation |
| Pass/Fail | |

---

## 8. Clients and Pipeline (CLIENT)

### CLIENT-001: List Pipeline Leads

| Field | Value |
|---|---|
| Feature area | Clients/Pipeline |
| Requirement | "GET /api/clients/pipeline -- list pipeline leads" (clients.ts line 5) |
| Test description | Verify pipeline leads are listed with pagination |
| Preconditions | Pipeline leads exist |
| Steps | 1. Send GET /api/clients/pipeline 2. Verify response includes `data` and `pagination` |
| Expected result | 200 with leads |
| How to verify | API call |
| Pass/Fail | |

### CLIENT-002: Create Pipeline Lead

| Field | Value |
|---|---|
| Feature area | Clients/Pipeline |
| Requirement | "POST /api/clients/pipeline -- create a lead" (clients.ts line 6) |
| Test description | Verify lead creation with default stage |
| Preconditions | Authenticated user |
| Steps | 1. Send POST /api/clients/pipeline with `{ companyName }` 2. Verify 201 3. Verify default stage is `identification` |
| Expected result | 201 with new lead |
| How to verify | API call |
| Pass/Fail | |

### CLIENT-003: Update Lead Stage With Activity Log

| Field | Value |
|---|---|
| Feature area | Clients/Pipeline |
| Requirement | Stage change activity log (clients.ts lines 362-374) |
| Test description | Verify stage change writes activity log entry |
| Preconditions | Lead exists |
| Steps | 1. Send PATCH /api/clients/pipeline/:id with `{ stage: "qualification" }` 2. Verify response is 200 3. Verify activity_log entry with event_type `pipeline_stage_change` |
| Expected result | Stage updated; activity logged |
| How to verify | API call + DB query |
| Pass/Fail | |

### CLIENT-004: Overdue Follow-ups

| Field | Value |
|---|---|
| Feature area | Clients/Pipeline |
| Requirement | "If any leads have `next_action_date` in the past, a banner appears" (Feature Spec Section 9.3) |
| Test description | Verify overdue endpoint returns leads with past next_action_date |
| Preconditions | Leads with `next_action_date` in the past exist, excluding closed stages |
| Steps | 1. Send GET /api/clients/overdue 2. Verify returned leads all have nextActionDate before today 3. Verify no closed_won or closed_lost leads appear |
| Expected result | Only overdue, non-closed leads returned |
| How to verify | API call |
| Pass/Fail | |

### CLIENT-005: Create Client

| Field | Value |
|---|---|
| Feature area | Clients |
| Requirement | "POST /api/clients -- create a client record" (clients.ts line 13) |
| Test description | Verify client creation with defaults |
| Preconditions | Authenticated user |
| Steps | 1. Send POST /api/clients with `{ companyName }` 2. Verify 201 3. Verify default health is `green` and isActive is `true` |
| Expected result | 201 with new client |
| How to verify | API call |
| Pass/Fail | |

### CLIENT-006: List Active Clients

| Field | Value |
|---|---|
| Feature area | Clients |
| Requirement | "GET /api/clients/active -- list active clients" (clients.ts line 12) |
| Test description | Verify only active clients are returned |
| Preconditions | Active and inactive clients exist |
| Steps | 1. Send GET /api/clients/active 2. Verify all returned clients have isActive = true |
| Expected result | Only active clients |
| How to verify | API call |
| Pass/Fail | |

---

## 9. Settings (SET)

### SET-001: Get Company

| Field | Value |
|---|---|
| Feature area | Settings |
| Requirement | "GET /api/settings/company -- get company record" (settings.ts line 6) |
| Test description | Verify company record retrieval |
| Preconditions | Company exists |
| Steps | 1. Send GET /api/settings/company 2. Verify response includes company data |
| Expected result | 200 with company record |
| How to verify | API call |
| Pass/Fail | |

### SET-002: Update Company (Board Only)

| Field | Value |
|---|---|
| Feature area | Settings |
| Requirement | "PATCH /api/settings/company -- update company (board only)" (settings.ts line 7) |
| Test description | Verify only board can update company |
| Preconditions | Company exists; board and admin users |
| Steps | 1. Send PATCH /api/settings/company as board with `{ name: "New Name" }` -- verify 200 2. Send PATCH /api/settings/company as admin -- verify 403 |
| Expected result | Board: 200; Admin: 403 |
| How to verify | API calls |
| Pass/Fail | |

### SET-003: Create User (Board Only)

| Field | Value |
|---|---|
| Feature area | Settings |
| Requirement | "POST /api/settings/users -- create user (board only)" (settings.ts line 10) |
| Test description | Verify user creation with password validation |
| Preconditions | Board user authenticated |
| Steps | 1. Send POST /api/settings/users with valid `{ email, displayName, password, role: "admin" }` 2. Verify 201 3. Verify password_hash is stored (not plaintext) 4. Verify user can log in with created credentials |
| Expected result | 201 with user (excluding password_hash) |
| How to verify | API call + login test |
| Pass/Fail | |

### SET-004: Email Uniqueness Enforced

| Field | Value |
|---|---|
| Feature area | Settings |
| Requirement | "A user with this email already exists" (Feature Spec Section 1.5) |
| Test description | Verify duplicate email is rejected |
| Preconditions | User with known email exists |
| Steps | 1. Send POST /api/settings/users with same email 2. Verify 409 with conflict error |
| Expected result | 409 |
| How to verify | API call |
| Pass/Fail | |

### SET-005: Cannot Change Own Role

| Field | Value |
|---|---|
| Feature area | Settings |
| Requirement | "You cannot change your own role." (settings.ts line 258) |
| Test description | Verify self-role-change protection |
| Preconditions | Board user authenticated |
| Steps | 1. Send PATCH /api/settings/users/:ownId with `{ role: "admin" }` 2. Verify 403 |
| Expected result | 403 |
| How to verify | API call |
| Pass/Fail | |

### SET-006: Cannot Delete Own Account

| Field | Value |
|---|---|
| Feature area | Settings |
| Requirement | "You cannot delete your own account." (settings.ts line 315) |
| Test description | Verify self-deletion protection |
| Preconditions | Board user authenticated |
| Steps | 1. Send DELETE /api/settings/users/:ownId 2. Verify 403 |
| Expected result | 403 |
| How to verify | API call |
| Pass/Fail | |

### SET-007: API Key Storage -- Encrypted

| Field | Value |
|---|---|
| Feature area | Settings |
| Requirement | "AES-256-GCM encrypted key value" (schema.ts apiKeys.encryptedKey); "key is encrypted (AES-256) and stored" (Feature Spec Section 11.8) |
| Test description | Verify API keys are encrypted at rest |
| Preconditions | Board user authenticated |
| Steps | 1. Send POST /api/settings/api-keys with `{ label, key: "sk-ant-test...", provider: "anthropic" }` 2. Verify 201 3. Query DB for encrypted_key column -- verify it is not the raw key 4. Verify keyPreview shows last 8 chars only |
| Expected result | Key stored encrypted; preview shows suffix |
| How to verify | API call + DB query |
| Pass/Fail | |

### SET-008: API Key Never Returned In Plaintext

| Field | Value |
|---|---|
| Feature area | Security |
| Requirement | "Return masked view only -- never the encrypted value" (settings.ts line 349) |
| Test description | Verify GET /api/settings/api-keys never returns the encrypted key |
| Preconditions | API key exists |
| Steps | 1. Send GET /api/settings/api-keys 2. Verify response fields are `id`, `label`, `keyPreview`, `provider`, `isActive`, `lastUsedAt`, `createdAt` 3. Verify no `encryptedKey` or `key` field exists in the response |
| Expected result | No key value in response |
| How to verify | API call; inspect response JSON |
| Pass/Fail | |

### SET-009: Budget Upsert

| Field | Value |
|---|---|
| Feature area | Settings |
| Requirement | "PATCH /api/settings/budgets/:agentId -- upsert budget for current month (board only)" (settings.ts line 21) |
| Test description | Verify budget creation and update via upsert |
| Preconditions | Agent exists; no budget record yet |
| Steps | 1. Send PATCH /api/settings/budgets/:agentId with `{ budgetUsd: 50 }` 2. Verify budget record is created 3. Send same request with `{ budgetUsd: 100 }` 4. Verify budget record is updated (not duplicated) |
| Expected result | Upsert works correctly |
| How to verify | API call + DB query |
| Pass/Fail | |

### SET-010: Knowledge File Listing

| Field | Value |
|---|---|
| Feature area | Settings |
| Requirement | "GET /api/settings/knowledge -- list knowledge files grouped by tier" (settings.ts line 24) |
| Test description | Verify knowledge files returned grouped by tier |
| Preconditions | Knowledge files exist in all three tiers |
| Steps | 1. Send GET /api/settings/knowledge 2. Verify response has `tier1` array, `tier2` map (keyed by role name), `tier3` map (keyed by project name) |
| Expected result | 200 with grouped knowledge data |
| How to verify | API call |
| Pass/Fail | |

---

## 10. Security (SEC)

### SEC-001: Cross-Tenant Data Isolation -- All Endpoints

| Field | Value |
|---|---|
| Feature area | Security |
| Requirement | Every query must filter by companyId |
| Test description | Verify all data-fetching endpoints filter by companyId |
| Preconditions | Two companies exist with separate data |
| Steps | For each endpoint (agents, tasks, projects, approvals, finance, clients, settings): 1. Authenticate as user from Company A 2. Attempt to access a resource ID from Company B 3. Verify 404 (not 200) |
| Expected result | All cross-tenant access returns 404 |
| How to verify | API calls across all endpoints |
| Pass/Fail | |

### SEC-002: RBAC Enforcement -- Board Only Endpoints

| Field | Value |
|---|---|
| Feature area | Security |
| Requirement | Various routes marked BOARD_ONLY |
| Test description | Verify board-only endpoints reject admin and viewer |
| Preconditions | Users with admin and viewer roles |
| Steps | For each board-only endpoint (DELETE agents, PATCH approvals, POST finance/revenue, POST settings/users, etc.): 1. Attempt access as admin -- verify 403 2. Attempt access as viewer -- verify 403 |
| Expected result | 403 for non-board users |
| How to verify | API calls |
| Pass/Fail | |

### SEC-003: RBAC Enforcement -- Board and Admin Endpoints

| Field | Value |
|---|---|
| Feature area | Security |
| Requirement | Various routes marked BOARD_AND_ADMIN |
| Test description | Verify viewer is rejected from board-and-admin endpoints |
| Preconditions | User with viewer role |
| Steps | For each board-and-admin endpoint (POST agents, POST tasks, PATCH agents, etc.): 1. Attempt access as viewer -- verify 403 |
| Expected result | 403 for viewer |
| How to verify | API calls |
| Pass/Fail | |

---

## 11. Real-Time (RT)

### RT-001: pg_notify on Approval Updates

| Field | Value |
|---|---|
| Feature area | Real-time |
| Requirement | "Emit pg_notify" (approvals.ts lines 272, 342) |
| Test description | Verify PostgreSQL NOTIFY is sent on approval events |
| Preconditions | PostgreSQL LISTEN is active on `approval_update` channel |
| Steps | 1. Listen on `approval_update` channel 2. Create or decide on an approval 3. Verify notification received with correct payload |
| Expected result | Notification received |
| How to verify | PostgreSQL LISTEN + API action |
| Pass/Fail | |

### RT-002: pg_notify on Agent Activity

| Field | Value |
|---|---|
| Feature area | Real-time |
| Requirement | notifyAgentActivity called on execution start, completion, and failure (runner.ts lines 326, 412, 471) |
| Test description | Verify PostgreSQL NOTIFY is sent on agent execution events |
| Preconditions | PostgreSQL LISTEN is active on `agent_activity` channel |
| Steps | 1. Listen on `agent_activity` channel 2. Trigger an agent execution 3. Verify notifications for `running`, then `completed` or `failed` |
| Expected result | Notifications received with correct status |
| How to verify | PostgreSQL LISTEN + execution trigger |
| Pass/Fail | |

---

## 12. CEO Binding Decisions (CEO)

### CEO-001: Argon2id For Passwords (Not bcrypt)

| Field | Value |
|---|---|
| Feature area | CEO Decision |
| Requirement | "Password hashing: Argon2id (CTO's spec)" (CEO Review, Decisions table) |
| Test description | Verify Argon2id is used for password hashing |
| Preconditions | User exists |
| Steps | 1. Query DB for user password_hash 2. Verify prefix is `$argon2id$` |
| Expected result | Argon2id hash format |
| How to verify | DB query |
| Pass/Fail | |

### CEO-002: Task project_id Is NOT NULL

| Field | Value |
|---|---|
| Feature area | CEO Decision |
| Requirement | "Task project_id: NOT NULL (CTO's spec); create 'General' project for orphan tasks" (CEO Review, Decisions table) |
| Test description | Verify tasks cannot be created without a project |
| Preconditions | None |
| Steps | 1. Attempt to insert a task with null project_id directly in DB 2. Verify NOT NULL constraint violation 3. Verify the create task API requires projectId (Zod schema: `projectId: z.string().uuid()` -- required) |
| Expected result | Constraint enforced at both DB and API level |
| How to verify | DB insert + API call without projectId |
| Pass/Fail | |

### CEO-003: Refresh Token SHA-256 Hashed Storage

| Field | Value |
|---|---|
| Feature area | CEO Decision |
| Requirement | "Refresh token storage: SHA-256 hashed (CTO's spec)" (CEO Review, Decisions table) |
| Test description | Same as AUTH-015 |
| Preconditions | See AUTH-015 |
| Steps | See AUTH-015 |
| Expected result | See AUTH-015 |
| How to verify | See AUTH-015 |
| Pass/Fail | |

### CEO-004: Agent Status Enum Reconciled

| Field | Value |
|---|---|
| Feature area | CEO Decision |
| Requirement | "Agent status enum: VP Engineering to reconcile. UI may map display states from a reduced stored set" (CEO Review, Decisions table) |
| Test description | Verify the agent_status enum includes both CTO and feature spec values |
| Preconditions | Schema deployed |
| Steps | 1. Verify agentStatusEnum contains: active, idle, running, blocked, paused, error, offline, terminated 2. Verify this covers both CTO schema (active, idle, running, paused, terminated) and feature spec display states (blocked, error, offline) |
| Expected result | All 8 values present |
| How to verify | Read schema.ts agentStatusEnum definition (line 53) |
| Pass/Fail | |

### CEO-005: Currency Handling -- GBP Primary

| Field | Value |
|---|---|
| Feature area | CEO Decision |
| Requirement | "Currency handling: GBP primary display for revenue/payroll; USD for agent costs. Database stores native currency with code" (CEO Review, Decisions table) |
| Test description | Verify revenue and payroll default to GBP; agent budgets use USD |
| Preconditions | None |
| Steps | 1. Create a revenue item -- verify currency defaults to `GBP` 2. Create a payroll item -- verify currency defaults to `GBP` 3. Check agent_budgets table columns -- verify they use USD |
| Expected result | GBP for revenue/payroll; USD for agent costs |
| How to verify | API calls + DB schema inspection |
| Pass/Fail | |

### CEO-006: First-Run Flow -- Seed + Wizard Coexistence

| Field | Value |
|---|---|
| Feature area | CEO Decision |
| Requirement | "First-run flow: Seed script for roles/agents; setup wizard for board user account" (CEO Review, Decisions table) |
| Test description | Verify setup endpoint creates board user but checks user count (not company count) |
| Preconditions | Fresh database |
| Steps | 1. Verify POST /api/v1/auth/setup checks user count (not company count) -- code line 327 checks users table 2. Note: Feature spec says "The app detects no Company record exists" but code checks "any users already exist" (see bug report BUG-005) |
| Expected result | Setup creates company + board user when no users exist |
| How to verify | Code review + API test |
| Pass/Fail | |

### CEO-007: Revenue Type Enum Mismatch

| Field | Value |
|---|---|
| Feature area | CEO Decision |
| Requirement | Feature spec defines revenue types as `contracted`, `recurring`, `one_off`, `pipeline` (Section 8.1); CTO schema defines `monthly_retainer`, `one_off`, `milestone` |
| Test description | Verify the implemented revenue types match the schema |
| Preconditions | None |
| Steps | 1. Verify revenueTypeEnum contains `monthly_retainer`, `one_off`, `milestone` 2. Note: feature spec values `contracted`, `recurring`, `pipeline` are NOT implemented (see bug report BUG-006) |
| Expected result | Schema values are used (monthly_retainer, one_off, milestone) |
| How to verify | Schema inspection |
| Pass/Fail | |

---

## 13. Client-Side API (API)

### API-001: Access Token Stored In localStorage

| Field | Value |
|---|---|
| Feature area | Client |
| Requirement | "Access token: Stored in memory (not localStorage)" (Feature Spec Section 1.4) |
| Test description | Verify whether access token storage matches spec |
| Preconditions | None |
| Steps | 1. Review client api.ts 2. Note: `setTokens` stores accessToken in localStorage (line 10), NOT in memory as spec requires (see bug report BUG-008) |
| Expected result | Token should be in memory per spec; currently in localStorage |
| How to verify | Code review |
| Pass/Fail | |

### API-002: Token Refresh On 401

| Field | Value |
|---|---|
| Feature area | Client |
| Requirement | "When the access token expires, the client automatically calls POST /api/auth/refresh" (Feature Spec Section 1.4) |
| Test description | Verify auto-refresh on 401 response |
| Preconditions | Access token expired; refresh token valid |
| Steps | 1. Make an API call that returns 401 2. Verify client calls /api/auth/refresh 3. Verify original request is retried with new token |
| Expected result | Transparent token refresh |
| How to verify | Network monitoring |
| Pass/Fail | |

### API-003: Redirect to Login On Refresh Failure

| Field | Value |
|---|---|
| Feature area | Client |
| Requirement | "If the refresh token is invalid or expired, the user is redirected to `/login`" (Feature Spec Section 1.4) |
| Test description | Verify redirect on refresh failure |
| Preconditions | Both tokens expired |
| Steps | 1. Make API call that returns 401 2. Refresh attempt fails 3. Verify `window.location.href` set to `/login` 4. Verify tokens cleared from localStorage |
| Expected result | Redirect to /login; tokens cleared |
| How to verify | Code review + manual test |
| Pass/Fail | |

### API-004: Approval Decision Endpoint Mismatch

| Field | Value |
|---|---|
| Feature area | Client |
| Requirement | Backend uses PATCH /api/approvals/:id; client calls POST /api/approvals/:id/decide |
| Test description | Verify client approval decision endpoint matches backend |
| Preconditions | None |
| Steps | 1. Review client api.ts line 282: `POST /api/approvals/${id}/decide` 2. Review backend approvals.ts line 191: `PATCH /api/approvals/:id` 3. Note mismatch (see bug report BUG-009) |
| Expected result | Should match |
| How to verify | Code review |
| Pass/Fail | |

---

## Appendix: Test Coverage Matrix

| Feature Area | Test IDs | Count |
|---|---|---|
| Authentication | AUTH-001 to AUTH-017 | 17 |
| Agents | AGENT-001 to AGENT-011 | 11 |
| Projects | PROJ-001 to PROJ-006 | 6 |
| Tasks | TASK-001 to TASK-015 | 15 |
| Agent Execution | EXEC-001 to EXEC-008 | 8 |
| Approvals | APPR-001 to APPR-007 | 7 |
| Finance | FIN-001 to FIN-007 | 7 |
| Clients/Pipeline | CLIENT-001 to CLIENT-006 | 6 |
| Settings | SET-001 to SET-010 | 10 |
| Security | SEC-001 to SEC-003 | 3 |
| Real-Time | RT-001 to RT-002 | 2 |
| CEO Binding Decisions | CEO-001 to CEO-007 | 7 |
| Client-Side API | API-001 to API-004 | 4 |
| **Total** | | **103** |

---

**QA Lead**
28 Mar 2026
