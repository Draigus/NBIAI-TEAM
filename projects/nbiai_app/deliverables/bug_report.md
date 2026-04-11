# NBIAI App -- Bug Report

**Prepared by:** QA Lead
**Date:** 28 March 2026
**Scope:** Discrepancies between feature specification, technical architecture, CEO binding decisions, and actual implementation
**Source files audited:**
- `deliverables/feature_spec.md` (feature specification)
- `deliverables/technical_architecture.md` (technical architecture)
- `deliverables/design_spec.md` (design specification)
- `deliverables/ceo_review.md` (CEO binding decisions)
- `app/src/db/schema.ts` (database schema)
- `app/src/routes/auth.ts` (authentication routes)
- `app/src/routes/tasks.ts` (task routes)
- `app/src/routes/projects.ts` (project routes)
- `app/src/routes/approvals.ts` (approval routes)
- `app/src/routes/finance.ts` (finance routes)
- `app/src/routes/clients.ts` (client/pipeline routes)
- `app/src/routes/settings.ts` (settings routes)
- `app/src/routes/agents.ts` (agent routes)
- `app/src/execution/runner.ts` (agent execution runner)
- `app/client/src/lib/api.ts` (frontend API client)

---

## Severity Definitions

| Severity | Definition |
|----------|------------|
| **Critical** | Security vulnerability or data loss risk. Must fix before any deployment. |
| **High** | Feature behaviour contradicts spec in a way that affects core workflows or CEO binding decisions. |
| **Medium** | Spec/implementation mismatch that affects non-critical functionality or user experience. |
| **Low** | Minor inconsistency, cosmetic issue, or missing validation that does not block functionality. |

---

## BUG-001: Access token stored in localStorage instead of memory

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-001 |
| **Severity** | Critical |
| **Feature area** | AUTH / Security |
| **Spec requirement** | Feature spec Section 1.5: "Access token stored in memory (not localStorage)" |
| **Actual implementation** | `api.ts` line 6: `localStorage.getItem('accessToken')` and line 10: `localStorage.setItem('accessToken', accessToken)`. Both access and refresh tokens are persisted to `localStorage`. |
| **File and line** | `app/client/src/lib/api.ts`, lines 5-17 |
| **Recommended fix** | Store the access token in a JavaScript module-scoped variable (memory). Only the refresh token should be persisted, and ideally via an httpOnly cookie set by the server rather than `localStorage`. |

---

## BUG-002: Refresh token stored in localStorage instead of httpOnly cookie

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-002 |
| **Severity** | Critical |
| **Feature area** | AUTH / Security |
| **Spec requirement** | Feature spec Section 1.5: "Refresh token as httpOnly cookie" |
| **Actual implementation** | `api.ts` line 11: `localStorage.setItem('refreshToken', refreshToken)`. The server returns the refresh token in the JSON response body and the client stores it in `localStorage`. No `Set-Cookie` header is used. |
| **File and line** | `app/client/src/lib/api.ts`, lines 9-12; `app/src/routes/auth.ts`, lines 108-119 |
| **Recommended fix** | Have the server set the refresh token via a `Set-Cookie` header with `httpOnly`, `secure`, `sameSite=strict` flags. Remove `refreshToken` from the JSON response body. Update the client to omit manual refresh token handling. |

---

## BUG-003: Dummy hash for timing-safe comparison uses bcrypt format instead of Argon2id

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-003 |
| **Severity** | High |
| **Feature area** | AUTH / CEO Binding Decision |
| **Spec requirement** | CEO review decision #1: "Argon2id -- binding. Update all references." Technical architecture Section 2.3: "Argon2id (memory-hard) via argon2 npm package." |
| **Actual implementation** | `auth.ts` lines 152-155: The dummy hash used for timing-safe comparison when a user is not found is in bcrypt `$2a$12$` format. If `verifyPassword` uses Argon2id internally, this bcrypt-formatted dummy will cause a format mismatch, likely throwing an error (caught by `.catch(() => false)`) rather than running the full Argon2id cost path. The timing protection is therefore ineffective. |
| **File and line** | `app/src/routes/auth.ts`, lines 154-158 |
| **Recommended fix** | Replace the dummy hash with a valid Argon2id hash. Generate one at build time or startup: `const dummyHash = await hashPassword('dummy-timing-safe-value')` and cache it. |

---

## BUG-004: Task status transition matrix deviates from spec -- missing `cancelled` transitions

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-004 |
| **Severity** | High |
| **Feature area** | TASKS |
| **Spec requirement** | Feature spec Section 6.5 status transition matrix: `backlog -> [assigned, cancelled]`, `assigned -> [in_progress, backlog, cancelled]`, `in_progress -> [blocked, review, done, cancelled]`, `blocked -> [in_progress, assigned, cancelled]`, `cancelled -> [backlog] (Board only)`. |
| **Actual implementation** | `tasks.ts` lines 37-45: `backlog: ['assigned', 'in_progress']` (adds `in_progress`, omits `cancelled`); `assigned: ['in_progress', 'backlog']` (omits `cancelled`); `in_progress: ['review', 'blocked', 'done']` (omits `cancelled`); `blocked: ['in_progress']` (omits `assigned`, `cancelled`); `cancelled: []` (omits `backlog` for Board users). |
| **File and line** | `app/src/routes/tasks.ts`, lines 37-45 |
| **Recommended fix** | Update the matrix to match the spec. For `cancelled -> backlog`, add role-based gating so only Board users can reinstate cancelled tasks. The `backlog -> in_progress` shortcut (not in spec) should be discussed with the product team before removal, as it may be intentional. |

---

## BUG-005: Task title minimum length is 1 character; spec requires 5

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-005 |
| **Severity** | Medium |
| **Feature area** | TASKS |
| **Spec requirement** | Feature spec Section 6.3: "Title: required, 5-200 characters" |
| **Actual implementation** | `tasks.ts` line 61: `title: z.string().min(1).max(500)`. Minimum length is 1, maximum is 500. Both differ from spec. |
| **File and line** | `app/src/routes/tasks.ts`, lines 61, 72 |
| **Recommended fix** | Change to `z.string().min(5).max(200)` on both the create and update schemas. |

---

## BUG-006: Task `type` field (goal/task/subtask) not implemented

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-006 |
| **Severity** | Medium |
| **Feature area** | TASKS |
| **Spec requirement** | Feature spec Section 6.1 data object: "type: goal / task / subtask". Section 6.3 create form: "Type selector (Goal, Task, Subtask)". |
| **Actual implementation** | The `createTaskSchema` (lines 60-69) and `updateTaskSchema` (lines 71-80) in `tasks.ts` have no `type` field. The database schema does define a `task_type` enum and a `type` column on the `tasks` table, but the API route ignores it entirely. |
| **File and line** | `app/src/routes/tasks.ts`, lines 60-80 |
| **Recommended fix** | Add `type: z.enum(['goal', 'task', 'subtask']).optional().default('task')` to the create schema, and `type: z.enum(['goal', 'task', 'subtask']).optional()` to the update schema. Pass through to the DB insert/update. |

---

## BUG-007: Task `requires_review` field not exposed in API

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-007 |
| **Severity** | Low |
| **Feature area** | TASKS |
| **Spec requirement** | Feature spec Section 6.1 data object: "requires_review: boolean". Technical architecture Section 2.1 tasks table: "requires_review boolean NOT NULL DEFAULT true". |
| **Actual implementation** | The create and update schemas do not include `requires_review`. The field exists in the database but cannot be set via the API. |
| **File and line** | `app/src/routes/tasks.ts`, lines 60-80 |
| **Recommended fix** | Add `requiresReview: z.boolean().optional()` to both schemas and map to the database column. |

---

## BUG-008: Project default status is `planning`; spec says `active`

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-008 |
| **Severity** | Medium |
| **Feature area** | PROJECTS |
| **Spec requirement** | Feature spec Section 5.3: "Status defaults to 'active' on creation." |
| **Actual implementation** | `projects.ts` line 342: `status: body.status ?? 'planning'`. New projects default to `planning` unless explicitly overridden. |
| **File and line** | `app/src/routes/projects.ts`, line 342 |
| **Recommended fix** | Change the default to `'active'` to match the spec, or update the spec if `planning` is the intended default. |

---

## BUG-009: Approval decision endpoint uses PATCH; client sends POST

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-009 |
| **Severity** | High |
| **Feature area** | APPROVALS / CLIENT API |
| **Spec requirement** | Feature spec Section 10.3: approval decision action. Client API module (`api.ts` line 282): sends `POST` to `/api/approvals/${id}/decide`. |
| **Actual implementation** | Server (`approvals.ts` line 6): route is `PATCH /api/approvals/:id` (no `/decide` sub-path). The client sends a `POST` to a path that does not exist on the server, meaning all approval decisions from the UI will return 404. |
| **File and line** | `app/client/src/lib/api.ts`, lines 281-285; `app/src/routes/approvals.ts`, line 6 |
| **Recommended fix** | Either (a) update the server to match the client and add `POST /approvals/:id/decide`, or (b) update the client to send `PATCH /api/approvals/:id`. Option (a) is cleaner as it avoids overloading PATCH semantics. |

---

## BUG-010: Approval decision comment has no minimum length; spec requires 10 characters for rejections

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-010 |
| **Severity** | Medium |
| **Feature area** | APPROVALS |
| **Spec requirement** | Feature spec Section 10.3: "Rejection requires comment (min 10 chars)." |
| **Actual implementation** | `approvals.ts` line 37: `comment: z.string().optional()`. No minimum length. An empty string or a single character would be accepted on rejection. |
| **File and line** | `app/src/routes/approvals.ts`, line 37 |
| **Recommended fix** | Add conditional validation: when `decision` is `rejected` or `changes_requested`, require `comment` with `.min(10)`. This can be done with a Zod `.refine()` or `.superRefine()`. |

---

## BUG-011: Client/pipeline routes lack RBAC -- any authenticated user can mutate

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-011 |
| **Severity** | High |
| **Feature area** | CLIENTS / PIPELINE |
| **Spec requirement** | Feature spec Section 9: Pipeline and client management is an operational feature. Technical architecture Section 3.1: mutation routes should use `requireRole(BOARD_AND_ADMIN)` for data-modifying endpoints. |
| **Actual implementation** | `clients.ts` line 28: all routes use only `requireAuth` (line 28 imports only `requireAuth`). The file does not import `requireRole` or any RBAC constants. Viewers can create, update, and delete pipeline leads and clients. |
| **File and line** | `app/src/routes/clients.ts`, lines 17-29 |
| **Recommended fix** | Import `requireRole` and `BOARD_AND_ADMIN` from the middleware. Apply `requireRole(BOARD_AND_ADMIN)` as `preHandler` on all POST, PATCH, and DELETE routes. |

---

## BUG-012: User deletion is hard delete; spec says deactivate

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-012 |
| **Severity** | High |
| **Feature area** | SETTINGS / Users |
| **Spec requirement** | Feature spec Section 11.2: "Remove User -- sets is_active to false (does not delete record)" |
| **Actual implementation** | `settings.ts` line 333: `await db.delete(users).where(eq(users.id, id))`. The user record is permanently deleted from the database. Any foreign key references (activity logs, task comments, etc.) may cascade or orphan. |
| **File and line** | `app/src/routes/settings.ts`, lines 301-337 |
| **Recommended fix** | Replace `db.delete(users)` with `db.update(users).set({ isActive: false, updatedAt: new Date() })`. Return 200 instead of 204 with the updated user record. |

---

## BUG-013: Board role can be assigned when creating users; spec prohibits this

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-013 |
| **Severity** | High |
| **Feature area** | SETTINGS / Users |
| **Spec requirement** | Feature spec Section 11.2: "Role: Admin or Viewer only. Board role cannot be assigned -- it is set during setup." |
| **Actual implementation** | `settings.ts` line 65: `role: z.enum(['board', 'admin', 'viewer'])`. The `board` role is a valid option in the create user schema. Any Board user can create additional Board users. |
| **File and line** | `app/src/routes/settings.ts`, line 65 |
| **Recommended fix** | Change the create schema to `role: z.enum(['admin', 'viewer'])`. The update schema (line 69) should also exclude `board` to prevent role escalation. |

---

## BUG-014: Logout does not send refreshToken in request body

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-014 |
| **Severity** | High |
| **Feature area** | AUTH / CLIENT API |
| **Spec requirement** | The server's logout handler (`auth.ts` line 249) validates the body against `logoutSchema` and expects a `refreshToken` field to identify the session to revoke. |
| **Actual implementation** | `api.ts` lines 124-125: `logout: () => apiFetch('/api/auth/logout', { method: 'POST' })`. No body is sent. The server will fail to validate the body (missing required `refreshToken`) and return a 400 error. The user's session is never revoked. |
| **File and line** | `app/client/src/lib/api.ts`, lines 124-125 |
| **Recommended fix** | Update the client logout to: `logout: () => apiFetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') }) })`. If BUG-002 is fixed (httpOnly cookie), the server should read the refresh token from the cookie instead and the body becomes unnecessary. |

---

## BUG-015: Client API auth paths use `/api/auth/` but server registers at `/api/v1/auth/`

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-015 |
| **Severity** | High |
| **Feature area** | AUTH / CLIENT API |
| **Spec requirement** | `auth.ts` header comment (line 4): "Registered at /api/v1/auth (prefix applied in index.ts)." |
| **Actual implementation** | `api.ts` lines 119-137: all auth calls use `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/me`, `/api/auth/setup`. If the server truly mounts these at `/api/v1/auth/`, every auth call from the client will 404. |
| **File and line** | `app/client/src/lib/api.ts`, lines 117-138; `app/src/routes/auth.ts`, line 4 |
| **Recommended fix** | Verify the actual mount point in `index.ts`. Either the route comment is stale (and routes are at `/api/auth/`) or the client paths need updating to `/api/v1/auth/`. One or the other must be corrected. |

---

## BUG-016: No "Remember Me" token TTL differentiation

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-016 |
| **Severity** | Low |
| **Feature area** | AUTH |
| **Spec requirement** | Feature spec Section 1.3: "Remember me: 30-day refresh token (default 7 days)." |
| **Actual implementation** | `auth.ts` line 72: `REFRESH_TOKEN_TTL_DAYS = 30` is hardcoded. The login endpoint does not accept a `rememberMe` boolean. All sessions get 30-day tokens regardless. |
| **File and line** | `app/src/routes/auth.ts`, lines 72, 131-174 |
| **Recommended fix** | Add `rememberMe: z.boolean().optional()` to the login schema. Use 7-day TTL by default, 30-day when `rememberMe` is true. |

---

## BUG-017: Setup endpoint checks user count, not company existence

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-017 |
| **Severity** | Low |
| **Feature area** | AUTH / Setup |
| **Spec requirement** | Feature spec Section 1.6: "Endpoint checks if company record exists -- if yes, return 403." |
| **Actual implementation** | `auth.ts` lines 326-334: The setup endpoint checks `count()` on the `users` table, not the `companies` table. If a company record exists but has no users (unlikely but possible after a failed setup), setup could run again and create a duplicate company. |
| **File and line** | `app/src/routes/auth.ts`, lines 326-334 |
| **Recommended fix** | Check `count()` on the `companies` table instead, or check both tables for robustness. |

---

## BUG-018: Inactive user login returns generic "Invalid email or password"

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-018 |
| **Severity** | Low |
| **Feature area** | AUTH |
| **Spec requirement** | Feature spec Section 1.4: "Inactive accounts: 'Your account has been deactivated. Contact your administrator.'" |
| **Actual implementation** | `auth.ts` line 160-163: The condition `!user || !passwordValid || !user.isActive` returns the same generic message: "Invalid email or password." A deactivated user receives no indication that their account exists but is inactive. |
| **File and line** | `app/src/routes/auth.ts`, lines 160-163 |
| **Recommended fix** | After confirming the password is valid, check `user.isActive` separately and return the specific deactivation message. Note: this does reveal that the account exists, which is a deliberate UX trade-off per the spec. |

---

## BUG-019: Finance P&L summary uses hardcoded USD-to-GBP exchange rate

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-019 |
| **Severity** | Medium |
| **Feature area** | FINANCE |
| **Spec requirement** | CEO review decision: "GBP for revenue/payroll, USD for agent costs." The spec does not mandate a specific conversion approach, but a hardcoded rate will become stale. |
| **Actual implementation** | `finance.ts` line 562: `const GBP_PER_USD = 1 / 1.27`. This is a static approximation. The P&L summary converts agent costs from USD to GBP using this fixed rate. |
| **File and line** | `app/src/routes/finance.ts`, line 562 |
| **Recommended fix** | Make the exchange rate configurable via company settings or environment variable. Long-term, integrate a live exchange rate API. Document the current rate and last-updated date as a minimum. |

---

## BUG-020: Client API uses wrong path prefix for non-auth routes

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-020 |
| **Severity** | Medium |
| **Feature area** | CLIENT API |
| **Spec requirement** | If the server uses versioned API paths (`/api/v1/...`), all client paths must match. |
| **Actual implementation** | `api.ts` uses `/api/agents`, `/api/projects`, `/api/tasks`, etc. throughout (lines 144-354). If the server mounts routes at `/api/v1/...`, all of these will 404. This is the same class of issue as BUG-015 but across all resource endpoints. |
| **File and line** | `app/client/src/lib/api.ts`, lines 144-354 |
| **Recommended fix** | Define a `BASE_URL` constant (e.g., `/api` or `/api/v1`) and prefix all paths. Verify against the actual server mount configuration in `index.ts`. |

---

## BUG-021: Client refresh handler reads tokens from `json.data` but server returns flat object

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-021 |
| **Severity** | High |
| **Feature area** | AUTH / CLIENT API |
| **Spec requirement** | The server's `issueTokens` function returns `{ accessToken, refreshToken, user }` as the top-level response shape (auth.ts lines 108-119). The login route sends this directly: `reply.status(200).send(response)`. |
| **Actual implementation** | `api.ts` line 43: `const { accessToken, refreshToken: newRefreshToken } = json.data`. The client destructures from `json.data`, but the server sends the tokens at the top level (no `data` wrapper). This means `json.data` is `undefined`, and the refresh flow silently fails -- the user gets logged out. |
| **File and line** | `app/client/src/lib/api.ts`, line 43 |
| **Recommended fix** | Either (a) update the client to destructure from `json` directly: `const { accessToken, refreshToken: newRefreshToken } = json`, or (b) wrap the server response in `{ data: response }` for consistency. Option (b) is better for API consistency if all other endpoints use a `data` wrapper. |

---

## BUG-022: Agent execution runner sets status to `active` on completion, but spec expects `idle`

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-022 |
| **Severity** | Medium |
| **Feature area** | AGENT EXECUTION |
| **Spec requirement** | Feature spec Section 7.2: After execution completes, agent returns to idle state awaiting next task assignment. Technical architecture Section 3.2 step 13: "Set agent status back to idle." |
| **Actual implementation** | `runner.ts` line 390: `set({ status: 'active', currentTaskId: null, ... })`. On successful completion, the agent is set to `active` rather than `idle`. The error path correctly sets `idle` (line 453). |
| **File and line** | `app/src/execution/runner.ts`, line 390 |
| **Recommended fix** | Change `'active'` to `'idle'` on line 390 to match both the spec and the error-path behaviour. |

---

## BUG-023: Blocked tasks can only transition to `in_progress`; spec also allows `assigned` and `cancelled`

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-023 |
| **Severity** | Medium |
| **Feature area** | TASKS |
| **Spec requirement** | Feature spec Section 6.5: `blocked -> [in_progress, assigned, cancelled]` |
| **Actual implementation** | `tasks.ts` line 42: `blocked: ['in_progress']`. Only `in_progress` is allowed. A blocked task cannot be reassigned (`assigned`) or cancelled. |
| **File and line** | `app/src/routes/tasks.ts`, line 42 |
| **Recommended fix** | Update to `blocked: ['in_progress', 'assigned', 'cancelled']`. |

---

## BUG-024: Backlog tasks can transition directly to `in_progress`; spec does not allow this

| Field | Detail |
|-------|--------|
| **Bug ID** | BUG-024 |
| **Severity** | Medium |
| **Feature area** | TASKS |
| **Spec requirement** | Feature spec Section 6.5: `backlog -> [assigned, cancelled]`. A backlog task must be assigned before work begins. |
| **Actual implementation** | `tasks.ts` line 38: `backlog: ['assigned', 'in_progress']`. Allows skipping the `assigned` state entirely. |
| **File and line** | `app/src/routes/tasks.ts`, line 38 |
| **Recommended fix** | Remove `'in_progress'` from the backlog transitions. If this shortcut is intentional for manual task management, document it as a deliberate deviation and update the spec. |

---

## Summary

| Severity | Count | Bug IDs |
|----------|-------|---------|
| **Critical** | 2 | BUG-001, BUG-002 |
| **High** | 8 | BUG-003, BUG-004, BUG-009, BUG-011, BUG-012, BUG-013, BUG-014, BUG-021 |
| **Medium** | 9 | BUG-005, BUG-006, BUG-008, BUG-010, BUG-019, BUG-020, BUG-022, BUG-023, BUG-024 |
| **Low** | 5 | BUG-007, BUG-016, BUG-017, BUG-018 |
| **Total** | **24** | |

### Priority Recommendations

**Fix immediately (before any deployment):**
- BUG-001 and BUG-002: Token storage is a fundamental security issue. XSS attacks would expose both access and refresh tokens.
- BUG-003: Timing-safe comparison is defeated by the wrong hash format, leaking account existence.
- BUG-021: Token refresh is broken -- all users will be forced to re-login after 15 minutes.
- BUG-009: Approval decisions from the UI will 404 -- the core governance workflow is non-functional.
- BUG-014: Logout does not work -- sessions are never revoked.

**Fix before user acceptance testing:**
- BUG-004, BUG-023, BUG-024: Status transition mismatches will confuse task workflows.
- BUG-011: Viewer RBAC bypass on client/pipeline data is an authorisation gap.
- BUG-012: Hard-deleting users risks data integrity and audit trail loss.
- BUG-013: Board role escalation undermines the single-Board-owner security model.
- BUG-015, BUG-020: API path prefix mismatch may render the entire UI non-functional (depends on `index.ts` mount config).

**Fix before release:**
- All remaining Medium and Low severity items.
