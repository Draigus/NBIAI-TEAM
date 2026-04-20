# Client Portal for WorkSage — Design Spec

**Date**: 2026-04-20
**Author**: Glen Pryer + Claude
**Status**: Pending Glen's review

---

## 1. Purpose

Allow NBI's clients to log into WorkSage with their own accounts. They see only their company's data, can collaborate as full users within their scope (create tasks, log time, comment, upload files, update statuses), and can report bugs/features. Client admins can manage their own team's accounts. NBI retains full control over account creation and client assignment.

---

## 2. User Model

### 2.1 Schema Change

Add one column to the `users` table:

```sql
ALTER TABLE users ADD COLUMN client_role TEXT DEFAULT NULL;
```

`client_role` is only meaningful when `client_id` is set. Values: `'member'` or `'admin'`.

### 2.1a Role Value Normalisation

The frontend user creation form currently sends `role = 'user'` for non-admin users, but the server defaults to `'member'`. Existing users may have either value in the database. Normalise to `'member'` everywhere:

- **Migration step**: `UPDATE users SET role = 'member' WHERE role = 'user';`
- **Frontend**: Change all role dropdowns from `value="user"` to `value="member"` (lines 16505, 18194, and any other references)
- **Server**: No change needed (already defaults to `'member'`)

### 2.2 User Types

| Type | role | client_id | client_role | Description |
|---|---|---|---|---|
| NBI admin | admin | null | null | Full access to everything. Can create client accounts, manage all data. |
| NBI member | member | null | null | Internal NBI team. Full visibility, limited destructive actions. |
| Client user | member | UUID | member | Full collaborator within their client scope. Cannot manage other users. |
| Client admin | member | UUID | admin | Same as client user, plus can invite/deactivate/manage users from their company. |

### 2.3 Auth Middleware Changes

`requireAuth` (server.js line ~803) already attaches `req.user` with `id`, `username`, `displayName`, `role`, `clientId`. Extend to also attach:

- `req.user.clientRole` — from `users.client_role` column
- `req.user.isNBI` — boolean, true when `client_id` is null (convenience helper)
- `req.user.isClientAdmin` — boolean, true when `client_id` is set AND `client_role === 'admin'`

Update the token cache to include these fields so they don't require a DB hit on every request.

### 2.4 First Login — Forced Password Change

New column on `users`:

```sql
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT false;
```

When set to true, the API returns a flag in the `/api/auth/me` response. The frontend checks this flag on login and shows a password change modal before granting access to the app. After the user changes their password, the flag is set to false.

---

## 3. Permission Gates

### 3.1 Middleware Functions

**Existing (no change):**
- `requireAuth` — any logged-in user

**New (extracted from inline checks):**
- `requireAdmin` — currently does NOT exist as a middleware function. All admin checks are inline `if (!req.user || req.user.role !== 'admin')` scattered across ~15 endpoints. Extract into a proper middleware: `function requireAdmin(req, res, next) { if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' }); next(); }`. Then replace all inline admin checks with this middleware. This is a refactor, not a behaviour change.

**Modified:**
- `requireInternal` — rename to `requireNBI`. Same logic: blocks users where `req.user.clientId` is set. Find-and-replace across all 50+ usages (see Section 3.2 NBI-Only Endpoints for full list). Applied to: Leads, Expenses, Finances, Hiring, audit-log, backup, seed-data, attachment verification, and more.

**New:**
- `requireClientAdmin` — checks `req.user.clientId` is set AND `req.user.clientRole === 'admin'`. Used for client user management endpoints only.
- `requireTaskAccess(req, taskId)` — async helper (not Express middleware). Loads the task, walks the parent chain to the root ancestor, reads the root's `client_id`. If `req.user.clientId` is set and doesn't match the task's root `client_id`, returns 403. If `req.user.clientId` is null (NBI user), always passes. Max depth: 10 levels (safety valve against pathological hierarchies).

### 3.2 Endpoint Access Matrix

#### Tasks

**Current state:** POST and PATCH /api/tasks are gated as admin-only with inline checks. However, the frontend routes all task creates/edits through `POST /api/sync/changes`, which already accepts any authenticated user. All users can create and edit tasks today via sync. The direct REST endpoints need their inline admin check changed to `requireAuth` to be consistent with the sync path. DELETE remains admin-only.

| Endpoint | Current gate | New gate | Client scoping |
|---|---|---|---|
| GET /api/tasks | requireAuth | requireAuth (no change) | `getClientScopes()` filters by client_id (already exists) |
| GET /api/tasks/:id | requireAuth | requireAuth (no change) | requireTaskAccess on task id |
| POST /api/tasks | admin-only (inline) | requireAuth | If client user, server forces `client_id` to `req.user.clientId`. Cannot create tasks under a different client's project. Validate parent task belongs to same client. |
| PATCH /api/tasks/:id | admin-only (inline) | requireAuth | requireTaskAccess on task id. **Client users cannot change `client_id` field** — strip from allowed patch fields when `req.user.clientId` is set. |
| DELETE /api/tasks/:id | admin-only (inline) | requireAdmin | NBI admin only — client users cannot delete tasks |
| GET /api/tasks/:id/comments | requireAuth | requireAuth (no change) | requireTaskAccess on task id |
| POST /api/tasks/:id/comments | requireAuth | requireAuth (no change) | requireTaskAccess on task id |
| GET /api/tasks/:id/time-entries | requireAuth | requireAuth (no change) | requireTaskAccess on task id |
| POST /api/tasks/:id/time-entries | requireAuth | requireAuth (no change) | requireTaskAccess on task id |
| GET /api/tasks/:id/attachments | requireAuth | requireAuth (no change) | requireTaskAccess on task id |
| POST /api/tasks/:id/attachments | **none** | requireAuth | requireTaskAccess on task id |

#### Sync

**Current state:** sync/load and sync/changes already have substantial client scoping via `getClientScopes()`. External users (`req.user.clientId` set) are already filtered to single-client scope for tasks and clients. Settings are already filtered to a whitelist for external users. The sync/changes endpoint already uses `clientInScope()` to silently drop out-of-scope changes and reports `rejectedOutOfScope` in the response.

**What sync/load returns (each needs explicit scoping decision):**

| Data array | Current scoping | Change needed |
|---|---|---|
| tasks | Filtered by `client_id = ANY(scopes)` for scoped users. External users cannot see null-client tasks. | No change — already correct. |
| clients | Filtered to scopes. Includes nested contacts. | No change — already correct. |
| settings | External users see whitelist only: `currency`, `hourly_rate`, `hourlyRate`, `date_format`, `dateFormat`, `timezone`, `client_priority`, `clientPriority`. | No change — already correct. Review whitelist if new settings are added. |
| users | **Not currently filtered** — returns all users regardless of scope. | **Must filter**: client users see only users with matching `client_id`. |
| knownClients | Client name list. | Filter to only the client user's company. |

| Endpoint | Gate | Client scoping |
|---|---|---|
| GET /api/sync/load | requireAuth (no change) | Filter as above. Users array is the critical gap — must be filtered before this feature ships. |
| POST /api/sync/changes | requireAuth (no change) | Existing `clientInScope()` gate handles task scoping. Client brief updates silently dropped for non-admins (existing behaviour). Client users cannot push changes to tasks outside their scope (existing behaviour). |
| GET /api/sync/poll | requireAuth (no change) | Same filtering as sync/load. Task IDs list must only include client-scoped tasks. |

#### Clients
| Endpoint | Gate | Client scoping |
|---|---|---|
| GET /api/clients | requireAuth | Client user: returns only their client. NBI user: returns all. |
| GET /api/clients/:id | requireAuth | Client user: 403 if id !== their client_id. |
| POST /api/clients | requireAdmin | NBI admin only. |
| PATCH /api/clients/:id | requireAdmin | NBI admin only. |
| DELETE /api/clients/:id | requireAdmin | NBI admin only. |
| GET /api/clients/:id/notes | requireAuth | Client user: 403 if id !== their client_id. |
| POST /api/clients/:id/notes | requireAuth | Client user: 403 if id !== their client_id. |

#### Users
| Endpoint | Gate | Client scoping |
|---|---|---|
| GET /api/users | requireAuth | Client user: returns only users with same client_id. NBI user: returns all. |
| GET /api/users/assignable | requireAuth | Client user: returns users with same client_id PLUS NBI team members on teams linked to their client. Used for assignee dropdowns. NBI user: returns all. |
| POST /api/users | requireAdmin OR requireClientAdmin | NBI admin: can create any user type, assigns client_id. Client admin: can only create users with their own client_id, role must be 'member', client_role can be 'member' or 'admin'. Cannot set role='admin' (NBI admin). |
| PATCH /api/users/:id | requireAdmin OR requireClientAdmin | Client admin: can only modify users with same client_id. Cannot change client_id, cannot set role='admin'. |
| DELETE /api/users/:id | requireAdmin | NBI admin only. Client admins deactivate, not delete. |

#### Bug Reports

**Current state:** All 11 bug report endpoints use `requireInternal`, which blocks any user with `clientId` set. Every one of these must change from `requireInternal` to `requireAuth` with client scoping logic added.

| Endpoint | Current gate | New gate | Client scoping |
|---|---|---|---|
| GET /api/bug-reports | requireInternal | requireAuth | Client user: returns only reports where `reporter_client_id` matches theirs OR reports with `client_id` matching theirs (to see NBI-created reports about their client). NBI user: returns all. |
| POST /api/bug-reports | requireInternal | requireAuth | Client user: `source` field auto-set to `'client'`, `reporter_client_id` auto-set to `req.user.clientId`. |
| PATCH /api/bug-reports/:id | requireInternal | requireAuth | Client user: can only update own reports (status, description, title). NBI admin: can update any. |
| DELETE /api/bug-reports/:id | requireInternal | requireAdmin | NBI admin only. Client users cannot delete bug reports. |
| GET /api/bug-reports/:id/comments | requireInternal | requireAuth | Client user: 403 if report's `reporter_client_id` !== their `client_id`. |
| POST /api/bug-reports/:id/comments | requireInternal | requireAuth | Same check. |
| DELETE /api/bug-reports/:id/comments/:commentId | requireInternal | requireAuth | Client user: can only delete own comments. NBI admin: can delete any. |
| GET /api/bug-reports/:id/screenshot | requireInternal | requireAuth | Client user: 403 if report's `reporter_client_id` !== their `client_id`. |
| POST /api/bug-reports/:id/notify-review | requireInternal | requireNBI | NBI-only — notifies the submitter that their report has been reviewed. Client users cannot trigger this. |

#### Attachments

**Current state:** Five attachment routes have **no authentication at all** — a pre-existing security gap. All must get `requireAuth` added, plus task scope checking where applicable. The codebase uses two attachment tables: `task_attachments` (legacy, task-specific) and `attachments` (generic, entity-scoped). Both need gating.

| Endpoint | Current gate | New gate | Client scoping |
|---|---|---|---|
| POST /api/tasks/:id/attachments | **none** | requireAuth | requireTaskAccess on task id |
| DELETE /api/tasks/:id/attachments/:attachmentId | **none** | requireAuth | requireTaskAccess on task id. Only uploader or admin can delete. |
| GET /api/attachments/:filename | **none** | requireAuth | Lookup attachment record, resolve parent entity, check client scope. |
| GET /api/attachments/download/:filename | **none** | requireAuth | Same as above. |
| DELETE /api/attachments/:id | **none** | requireAuth | Lookup attachment, check parent entity scope. Only uploader or admin can delete. |
| GET /api/attachments/entity/:type/:id | **none** | requireAuth | Validate entity belongs to user's client scope. |
| POST /api/attachments/entity/:type/:id | **none** | requireAuth | Validate entity belongs to user's client scope. |
| GET /api/attachments/verify-matches | requireInternal | requireNBI | NBI-only — admin verification of auto-matched email attachments. |
| PATCH /api/attachments/:id/confirm | requireInternal | requireNBI | NBI-only. |
| PATCH /api/attachments/:id/reassign | requireInternal | requireNBI | NBI-only. |

#### NBI-Only Endpoints (requireNBI)

Rename `requireInternal` to `requireNBI` across all usages. These return 403 for any user where `client_id` is set:

- GET/POST/PATCH/DELETE /api/leads
- GET/POST/PATCH/DELETE /api/expenses, /api/expenses/categories, /api/expenses/:id/receipts
- GET/PUT /api/finance, GET /api/finance/seed
- GET/POST/PATCH/DELETE /api/hiring-positions/*
- GET/POST/PATCH/DELETE /api/candidates/*, GET /api/candidates/:id/cv
- GET/POST/PATCH/DELETE /api/expense-reports/*, POST /api/expense-reports/:id/submit, /api/expense-reports/:id/expenses, GET /api/expense-reports/:id/export
- GET /api/audit-log
- GET /api/seed-data, GET /api/backup
- POST /api/notifications/system
- DELETE /api/reports/:id/revoke

#### News
| Endpoint | Gate | Client scoping |
|---|---|---|
| GET /api/news/* | requireAuth | No scoping. Same content for everyone. |

#### Email Forwarding

**Current state:** This is NOT a webhook or API endpoint. It is a scheduled cron job (`processInboundEmails`) that runs every 5 minutes, polling the Microsoft Graph API inbox for unread emails. The processing function `processOneInboundEmail()` matches email subjects to tasks/clients and auto-attaches files.

| Component | Change needed |
|---|---|
| `processOneInboundEmail()` | After matching a task, check the sender's email against the `users` table. If the sender matches a client user (by email), verify that the matched task's root `client_id` matches the sender's `client_id`. If mismatch, skip attachment and mark email as read with an error note. |
| Sender matching | Match by email address. Note: email sender addresses are spoofable. Acceptable risk for this feature — same trust model as existing NBI user email forwarding. |
| No API endpoint change needed | The cron job handles everything server-side. |

---

## 4. Frontend Changes

### 4.1 Tab Visibility

On login, `_currentUser` is populated from `/api/auth/me`. The sidebar rendering (lines ~3762-3800) already uses `isScoped = !!(_currentUser && _currentUser.clientId)` to hide tabs. Add helpers:

```javascript
function isClientUser() { return !!_currentUser?.clientId; }
function isClientAdmin() { return _currentUser?.clientRole === 'admin'; }
```

**Current sidebar behaviour vs required changes:**

| Tab | Current behaviour | Required change |
|---|---|---|
| Portfolio | Always shown | No change |
| Projects | Always shown | No change |
| People | Always shown | No change |
| Leads | Hidden when `isScoped` | No change |
| Hiring | Hidden when `isScoped` | No change |
| Finances | Hidden when `isScoped` | No change |
| Expenses | Hidden when `isScoped` | No change |
| Bug Tracker | **Hidden when `isScoped`** (line ~3794) | **Unhide** — show for client users. Remove `!isScoped` gate. |
| Settings | **Hidden when `isScoped`** (line ~3798) | **Unhide** — show for client users. Remove `!isScoped` gate. |
| News | **No sidebar entry exists** — only in top tabs array (line ~4094) | **Add sidebar entry** for News, visible to all users. |

The top tabs array at line ~4094 (`['dashboard', 'tasks', 'people', 'leads', 'expenses', 'finances', 'news', 'settings']`) also needs a client visibility filter applied. Currently it does not check `isScoped`.

### 4.2 Client Filter Lock

For client users, `currentFilter.client` is set to their client name on login and cannot be changed:

- The client filter dropdown in the Projects view is hidden
- The Portfolio sidebar shows only their client card
- The "All Clients" / clear filter option is removed
- `currentFilter.client` is set during `load()` and is read-only for client users

### 4.3 People Tab Scoping

For client users, the People tab shows only users from their company. The frontend already fetches users from `GET /api/users`, which will be server-filtered. No frontend change needed beyond hiding the "Create User" button for non-admin client users.

For client admins, the People tab shows a "Team Management" section with:
- User list with name, email, role, active status, last login
- "Invite User" button — opens a form with: name, email, client_role (member/admin)
- Per-user actions: deactivate/reactivate, reset password, change role
- No delete option (deactivate only)

### 4.4 Header

For client users, the header shows their company name instead of the user's name in the main title area. The user badge still shows their individual name.

### 4.5 Bug Report Modal

For client users, the bug report modal works identically to the current one. The `source: 'client'` tag is applied server-side, transparent to the user. In the Bug Tracker view, client users see their company's reports. NBI admins see all reports with a "Source" column showing "Internal" or the client company name.

### 4.6 Settings Tab

For client users, Settings shows:
- Account settings (change password, display name, email)
- Team Management (client admins only, see section 4.3)

Hidden for client users:
- System settings
- API configuration
- Any NBI-internal settings

### 4.7 First Login — Password Change

When `_currentUser.mustChangePassword` is true, the app shows a full-screen password change modal immediately after login. No access to any feature until the password is changed. The modal has:
- Current password (the temp password)
- New password (minimum 6 characters — matches existing `POST /api/auth/reset-token/:token` and `POST /api/auth/change-password` validation)
- Confirm new password
- Submit button

On success, the flag is cleared and the app loads normally.

The existing `POST /api/auth/change-password` endpoint (server.js line ~1077) already handles password changes for authenticated users with current password verification, bcrypt hashing, session invalidation, and token cache clearing. The frontend calls this endpoint — no new endpoint needed. The endpoint must be extended to also set `must_change_password = false` after a successful change.

---

## 5. Onboarding Flow

### 5.1 NBI Admin Creates First Client Account

**Replaces existing user creation form.** The current Settings > Team tab has an "Add New User" form (lines ~16495-16510) with manual username/password/role/client-scope fields. This entire form is replaced by the flow below. The existing form was a test implementation and should be overwritten.

1. NBI admin goes to People tab
2. Clicks "Create User"
3. User type selector: **Internal** or **Client**
4. If Client:
   - Dropdown: select client company (from existing clients list)
   - Client role: Member or Admin
5. Fills in: display name, email
6. Username is auto-generated from email (before the @), editable
7. On save:
   - Server creates user with `client_id`, `client_role`, `must_change_password = true`
   - Server generates a random temporary password (16 chars, mixed case + numbers)
   - Server sends invite email via `sendEmailAsync` containing:
     - WorkSage login URL
     - Username
     - Temporary password
     - Client company name
     - "You must change your password on first login"
   - Toast confirms: "User created. Invite email sent to {email}."

### 5.2 Client Admin Invites Team Members

1. Client admin goes to Settings > Team Management
2. Clicks "Invite User"
3. Form shows: display name, email, client role (Member or Admin)
4. No client company selector — automatically uses their own `client_id`
5. On save: same flow as 5.1 steps 7a-7d, but the request goes through `requireClientAdmin` instead of `requireAdmin`

### 5.3 Deactivation

1. Client admin clicks "Deactivate" on a user row
2. Confirmation prompt: "Deactivate {name}? They will be logged out and unable to access WorkSage."
3. Server sets `is_active = false`, deletes all sessions for that user
4. User is immediately logged out if currently active
5. The user row shows "Inactive" badge, with "Reactivate" button

### 5.4 Password Reset

1. Client admin clicks "Reset Password" on a user row
2. Server generates new temp password, sets `must_change_password = true`, invalidates all sessions
3. Server sends email with new temp password
4. User must change password on next login

---

## 6. Database Migration

Single migration file: `migrations/XXX_client_portal.sql`

```sql
-- Normalise role values: frontend sent 'user', server defaults to 'member'. Standardise to 'member'.
UPDATE users SET role = 'member' WHERE role = 'user';

-- Add client_role to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_role TEXT DEFAULT NULL;

-- Add must_change_password flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Add source and reporter_client_id to bug_reports
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal';
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS reporter_client_id UUID REFERENCES clients(id);

-- Add client_activity_log for audit trail
CREATE TABLE IF NOT EXISTS client_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_activity_client ON client_activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_user ON client_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_created ON client_activity_log(created_at);

-- Constraint: client_role only valid when client_id is set
ALTER TABLE users ADD CONSTRAINT chk_client_role_requires_client
  CHECK (client_role IS NULL OR client_id IS NOT NULL);
```

---

## 7. Security

### 7.1 Server-Side Enforcement

The server is the single authority for access control. Every rule:

- **Task access**: `requireTaskAccess` loads the task, walks the parent chain to root, checks root's `client_id` against `req.user.clientId`. No shortcuts — always walks the full chain.
- **User management**: Client admin endpoints verify target user shares same `client_id`. Server rejects attempts to set `role = 'admin'` (NBI admin) or change `client_id`.
- **Sync filtering**: `sync/load` and `sync/changes` filter ALL data arrays by `client_id` before sending to client users. This is the most critical gate — sync is the main data pipeline.
- **No client_id mutation**: Client users cannot change their own `client_id` or any other user's `client_id`. Only NBI admins can set `client_id` at account creation time.

### 7.2 Privilege Escalation Prevention

- Client admin cannot create a user with `role = 'admin'` (NBI admin level)
- Client admin cannot change their own or anyone's `client_id`
- Client admin cannot promote a user to NBI member or admin
- Client user cannot access any endpoint protected by `requireNBI` or `requireAdmin`
- All user creation/modification endpoints validate these constraints server-side, regardless of what the frontend sends

### 7.3 Session and Password Security

- Same bcrypt hashing for client passwords (already exists)
- Same account lockout rules (failed attempts tracking, configurable lockout)
- Forced password change on first login (temp passwords never persist)
- Password reset invalidates all existing sessions for that user
- Deactivation invalidates all sessions immediately
- Minimum password length: 6 characters (matches existing `POST /api/auth/change-password` and `POST /api/auth/reset-token/:token` validation)

### 7.3a Token Cache Invalidation

The server maintains an in-memory `_tokenCache` (Map keyed by hashed token) to avoid DB hits on every `requireAuth` call. The cached entry includes `req.user` fields (`id`, `username`, `displayName`, `role`, `clientId`). The `client_role` field must be added to this cache.

**Critical:** When any of these fields change for a user, the cached entries become stale. The existing `PATCH /api/users/:id` handler (server.js line ~1166) already invalidates cache entries by iterating `_tokenCache` and deleting entries where `entry.user.id === targetUserId`. This pattern must be applied to ALL operations that modify user state:

- `PATCH /api/users/:id` — already invalidates (no change)
- Deactivation (`is_active = false`) — already deletes sessions (no change to cache, sessions are gone)
- `client_role` changes — must invalidate cache (same pattern as PATCH)
- `client_id` changes — must invalidate cache (same pattern)
- Password reset — already deletes all sessions, which effectively invalidates cache on next request

### 7.4 Audit Logging

All write operations by client users are logged to `client_activity_log`:
- `action`: 'create_task', 'update_task', 'add_comment', 'log_time', 'upload_file', 'submit_bug', 'invite_user', 'deactivate_user', 'reset_password', 'change_role'
- `target_type`: 'task', 'user', 'bug_report', etc.
- `target_id`: UUID of the affected record
- `details`: JSONB with relevant context (field changed, old/new values for sensitive ops)

NBI admins can view the activity log per client in Settings.

### 7.5 Rate Limiting

Existing rate limiting applies equally to client users. No special treatment. If abuse patterns emerge from client accounts, NBI admin can deactivate the user.

---

## 8. QA Test Plan

### 8.1 Core Regression Tests — Existing Functionality Must Not Break

These tests verify that the client portal changes do NOT break anything for existing NBI users.

**Auth regression:**
- [ ] NBI admin can still log in and access all features
- [ ] NBI member can still log in and access all features
- [ ] Login with wrong password still locks out after N attempts
- [ ] Logout still works and invalidates session
- [ ] Password change still works for NBI users
- [ ] Forgot password flow still works for NBI users
- [ ] `/api/auth/me` still returns correct data for NBI users

**Task regression:**
- [ ] NBI admin can still CRUD all tasks across all clients
- [ ] NBI member can still view all tasks across all clients
- [ ] Task creation still works with all item types (project, feature, story, task)
- [ ] Task editing (status, assignees, dates, description) still works
- [ ] Task comments still work
- [ ] Time entries still work
- [ ] File attachments still work
- [ ] Task hierarchy (parent-child) still works
- [ ] Task search still returns results across all clients
- [ ] Kanban drag-and-drop still works
- [ ] Sync/load still returns full dataset for NBI users
- [ ] Sync/changes still works for NBI users
- [ ] Task deletion still works for NBI admins

**Dashboard regression:**
- [ ] Portfolio view still shows all clients for NBI users
- [ ] Portfolio KPI strip still calculates correctly
- [ ] Donut chart still renders correctly
- [ ] All dashboard panels still populate
- [ ] Client filter still works (select/deselect clients)
- [ ] Client profile header still expands/collapses

**Other views regression:**
- [ ] Leads view still works for NBI users
- [ ] Expenses view still works for NBI users
- [ ] Finances view still works for NBI users
- [ ] Hiring view still works for NBI users
- [ ] People view still shows all users for NBI users
- [ ] Bug Tracker still works for NBI users
- [ ] News tab still works for NBI users
- [ ] Settings still works for NBI users
- [ ] Print/report still works

### 8.2 Client User — Account Lifecycle

**Account creation by NBI admin:**
- [ ] NBI admin can create a client user with correct client_id assignment
- [ ] NBI admin can create a client admin with correct client_id and client_role
- [ ] Username auto-generates from email, is editable
- [ ] Temp password is generated (16 chars, mixed case + numbers)
- [ ] Invite email is sent with correct login URL, username, temp password, company name
- [ ] Created user appears in the People list
- [ ] Created user has `must_change_password = true`

**First login:**
- [ ] Client user can log in with temp password
- [ ] Password change modal appears immediately — no access to app until changed
- [ ] Cannot dismiss the modal or navigate away
- [ ] New password must meet minimum requirements
- [ ] Confirm password must match
- [ ] After successful change, `must_change_password` is set to false
- [ ] App loads normally after password change
- [ ] Subsequent logins go straight to app (no password change prompt)

**Normal login:**
- [ ] Client user sees only: Portfolio, Projects, People, News, Bug Tracker, Settings
- [ ] Client user does NOT see: Leads, Expenses, Finances, Hiring
- [ ] Header shows company name
- [ ] User badge shows individual name

**Account deactivation:**
- [ ] Client admin can deactivate a user from their company
- [ ] Deactivated user is immediately logged out
- [ ] Deactivated user cannot log in (gets appropriate error message)
- [ ] Deactivated user shows "Inactive" badge in team list
- [ ] Client admin can reactivate a deactivated user
- [ ] Reactivated user can log in again

**Password reset by client admin:**
- [ ] Client admin can trigger password reset for a user in their company
- [ ] New temp password is generated and emailed
- [ ] All existing sessions for that user are invalidated
- [ ] User must change password on next login

### 8.3 Client User — Data Isolation

**Task visibility:**
- [ ] Client user sees ONLY tasks belonging to their client (via root ancestor client_id)
- [ ] Client user cannot see tasks from other clients even if they know the task ID (API returns 403)
- [ ] Sync/load returns only their client's tasks
- [ ] Sync/changes only includes their client's changes
- [ ] Task search returns only results from their client

**Client visibility:**
- [ ] GET /api/clients returns only their client
- [ ] Client user cannot access another client's details by ID (API returns 403)
- [ ] Client notes: can see only their client's notes
- [ ] Portfolio sidebar shows only their client card

**User visibility:**
- [ ] People tab shows only users from their company (same client_id)
- [ ] GET /api/users returns only users with matching client_id
- [ ] Cannot see NBI internal users in the People tab
- [ ] Cannot see users from other client companies
- [ ] Assignee dropdown includes their company's users AND NBI team members assigned to their client's teams

**Bug report visibility:**
- [ ] Client user sees only bug reports from their company
- [ ] Cannot see NBI internal bug reports
- [ ] Cannot see bug reports from other client companies

**News:**
- [ ] Client user sees the same news feed as NBI users (no scoping)

**NBI-only endpoints:**
- [ ] Client user gets 403 on: /api/leads, /api/expenses, /api/finance/*, /api/hiring/*, /api/candidates/*
- [ ] Direct API calls to these endpoints are blocked (not just hidden in UI)

### 8.4 Client User — Collaboration Permissions

**Tasks:**
- [ ] Can create tasks under their client's projects
- [ ] Cannot create tasks under another client's projects (even via API)
- [ ] Can update task status (Not started, In progress, Done, etc.)
- [ ] Can edit task description, dates, assignees
- [ ] Can add comments to tasks
- [ ] Can log time against tasks
- [ ] Can upload attachments to tasks
- [ ] Can download attachments from their client's tasks
- [ ] Cannot download attachments from another client's tasks
- [ ] Can set task status to Cancelled
- [ ] Cannot delete tasks (403) — deletion is NBI admin only

**Bug reports:**
- [ ] Can submit bug reports (type: bug or feature)
- [ ] Submitted reports have `source = 'client'` set automatically
- [ ] Can add comments to their company's bug reports
- [ ] Can update their own bug reports (title, description, status)
- [ ] Cannot update other companies' bug reports

**Email forwarding:**
- [ ] Can forward emails with attachments to WorkSage
- [ ] Attachment attaches to the correct task (subject line matching)
- [ ] Cannot attach to tasks outside their client scope (bounced with error)

### 8.5 Client Admin — User Management

**Permissions:**
- [ ] Client admin can see Team Management section in Settings
- [ ] Regular client member does NOT see Team Management
- [ ] Client admin can view all users from their company

**Invite:**
- [ ] Client admin can invite a new member (name, email, role)
- [ ] New user is created with the admin's own client_id (not selectable)
- [ ] Client admin can set client_role to 'member' or 'admin'
- [ ] Client admin CANNOT set role to 'admin' (NBI admin level) — server rejects
- [ ] Invite email is sent correctly
- [ ] New user has must_change_password = true

**Modify:**
- [ ] Client admin can change a user's client_role (member to admin, admin to member)
- [ ] Client admin CANNOT change a user's client_id — field not exposed
- [ ] Client admin CANNOT change a user's role to 'admin' (NBI level)
- [ ] Client admin CANNOT modify users from another company (403)
- [ ] Client admin CANNOT modify NBI users (403)

**Deactivate/reactivate:**
- [ ] Client admin can deactivate users from their company
- [ ] Client admin can reactivate users from their company
- [ ] Client admin CANNOT deactivate users from another company
- [ ] Client admin CANNOT deactivate NBI users

**Password reset:**
- [ ] Client admin can reset passwords for users in their company
- [ ] Client admin CANNOT reset passwords for users outside their company
- [ ] Client admin CANNOT reset NBI user passwords

### 8.6 Privilege Escalation Tests

- [ ] Client user cannot access /api/users POST (create user) — 403
- [ ] Client admin cannot set role='admin' on user creation — server rejects
- [ ] Client admin cannot change client_id on any user — server rejects
- [ ] Client user cannot modify their own client_id via PATCH /api/users/:id — server rejects
- [ ] Client user cannot modify their own role via PATCH /api/users/:id — server rejects
- [ ] Client user cannot change a task's client_id via PATCH /api/tasks/:id — field stripped
- [ ] Client user cannot access requireAdmin endpoints — 403
- [ ] Client user cannot access requireNBI endpoints — 403
- [ ] Client user with expired/invalid token gets 401, not partial data
- [ ] Deactivated client user's token is rejected even if not yet expired
- [ ] Client admin cannot demote themselves if they are the only admin for their company — server rejects

### 8.6a Attachment Security Tests (Pre-Existing Gap)

These test the auth fix for attachment endpoints that currently have no authentication:
- [ ] Unauthenticated request to POST /api/tasks/:id/attachments returns 401
- [ ] Unauthenticated request to GET /api/attachments/:filename returns 401
- [ ] Unauthenticated request to GET /api/attachments/download/:filename returns 401
- [ ] Unauthenticated request to DELETE /api/attachments/:id returns 401
- [ ] Client user cannot upload attachments to tasks outside their client scope — 403
- [ ] Client user cannot download attachments from tasks outside their client scope — 403
- [ ] Client user cannot delete attachments on tasks outside their client scope — 403
- [ ] NBI user can still upload/download/delete attachments on any task (regression check)

### 8.7 Audit Logging

- [ ] Task create/update by client user is logged to client_activity_log
- [ ] Comment/time/attachment by client user is logged
- [ ] Bug report submission by client user is logged
- [ ] User invite by client admin is logged
- [ ] User deactivation by client admin is logged
- [ ] Password reset by client admin is logged
- [ ] NBI admin can view activity log per client
- [ ] Activity log entries have correct user_id, client_id, action, target_type, target_id

### 8.8 Edge Cases

- [ ] Client user whose client_id points to a deleted client: gets clean error, not crash
- [ ] Client user assigned to a client with zero tasks: sees empty state, not error
- [ ] Two client admins from the same company: both can manage users, no conflicts
- [ ] Client user's session survives server restart (session persisted in DB)
- [ ] Client user on mobile/iPad: same scoping rules apply, responsive layout works
- [ ] Concurrent edits: two client users editing the same task — last write wins, no data corruption
- [ ] Client user accesses a direct URL to an internal-only view (e.g. /leads): redirected to Portfolio, not 404
- [ ] Bulk import (if it exists): respects client scoping
- [ ] Print/report for client users: only includes their client's data

---

## 9. Implementation Notes

### 9.1 Migration Safety
The migration adds columns, creates a new table, and normalises one existing data value (`role = 'user'` → `'member'`). Existing users have `client_role = NULL` and `must_change_password = false`, which changes nothing about their behaviour. The role normalisation is a data fix for a frontend/server inconsistency — both paths already treat non-admin users identically.

### 9.2 Rollback
To rollback:
```sql
ALTER TABLE users DROP COLUMN IF EXISTS client_role;
ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;
ALTER TABLE bug_reports DROP COLUMN IF EXISTS source;
ALTER TABLE bug_reports DROP COLUMN IF EXISTS reporter_client_id;
DROP TABLE IF EXISTS client_activity_log;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_client_role_requires_client;
-- Note: role normalisation ('user' → 'member') is NOT reversed. Both values work identically.
```

### 9.3 Codebase Conflicts Identified (Pre-Implementation Audit)

These conflicts between the existing code and this spec were identified during the code audit and are addressed in the relevant sections above. This list serves as a checklist during implementation.

| # | Conflict | Spec section | Resolution |
|---|---|---|---|
| 1 | POST/PATCH /api/tasks are admin-only (inline), but sync/changes allows all users. Direct endpoints inconsistent. | 3.2 Tasks | Change inline admin checks to requireAuth. No permission change — sync already allows all users. |
| 2 | `requireAdmin` referenced as "exists" but is inline checks, not a middleware function. | 3.1 | Create as proper middleware. Refactor ~15 inline checks. |
| 3 | Frontend sends `role='user'`, server defaults `'member'`. DB has mixed values. | 2.1a | Migration normalises to 'member'. Frontend updated. |
| 4 | Bug Tracker and Settings hidden from scoped users (`!isScoped` gate). Spec says show them. | 4.1 | Remove `!isScoped` gates on lines ~3794 and ~3798. |
| 5 | All 11 bug report endpoints use `requireInternal`. Spec originally listed only 5. | 3.2 Bug Reports | Full enumeration added with per-route gate decisions. |
| 6 | News has no sidebar entry (only in top tabs array). Spec says show in sidebar. | 4.1 | Add News sidebar entry visible to all users. |
| 7 | Existing user creation form (Settings > Team) has manual password, role='user'/'admin' dropdown, client scope dropdown. | 5.1 | Replace entirely with new Internal/Client flow. Glen confirmed. |
| 8 | 5+ attachment endpoints have no auth checks at all. Pre-existing security gap. | 3.2 Attachments | Add requireAuth + scope checking to all attachment routes. |
| 9 | `client_id` is a patchable field on tasks. Client users could move tasks between clients. | 3.2 Tasks | Strip `client_id` from allowed PATCH fields when `req.user.clientId` is set. |
| 10 | sync/load settings filtering already exists for external users (whitelist). | 3.2 Sync | Referenced existing filter. No duplication needed. |
| 11 | Email forwarding is a cron job polling Graph API, not a webhook or endpoint. | 3.2 Email | Corrected description. Scope check goes inside `processOneInboundEmail()`. |
| 12 | Token cache (`_tokenCache`) caches user fields. Must invalidate on role/client changes. | 7.3a | Documented invalidation pattern. Existing PATCH handler already does this; extend to all state changes. |
| 13 | `getClientScopes()` has hardcoded exception clients ('NBI OPS', 'Playsage') for internal members without teams. | N/A | Does not affect client users (they always get `[req.user.clientId]`). No change needed. Documented for awareness. |
| 14 | Client admin self-demotion could leave a company with no admin. | 5.3 | Edge case — add server check: prevent demoting the last admin for a client_id. |

### 9.4 Files That Will Change

**Backend** (`dashboard-server/server.js`):
- `requireAuth` middleware (~line 803) — attach clientRole, isNBI, isClientAdmin to req.user; add `client_role` to token cache
- Extract `requireAdmin` middleware from inline checks (~15 endpoints)
- Rename `requireInternal` to `requireNBI` (find-and-replace, 50+ usages — see Section 3.2 NBI-Only Endpoints for full list)
- New middleware: `requireClientAdmin`, `requireTaskAccess` (with max depth 10)
- Modify: POST /api/tasks (~line 3903) and PATCH /api/tasks (~line 3985) — change inline admin check to requireAuth; block client_id mutation for client users
- Modify: POST/PATCH /api/users — client admin create/edit logic, temp password generation, invite email
- Modify: GET /api/users — client scoping (return only same client_id users for client users)
- New: GET /api/users/assignable — users with same client_id + NBI team members on their client's teams
- Modify: All 11 bug report endpoints (~lines 6321-6628) — change requireInternal to requireAuth with scoping
- Modify: GET /api/sync/load (~line 4889) — filter users array by client_id for client users
- Modify: GET /api/clients — client scoping
- Modify: 7 attachment endpoints — add requireAuth + scope checking (currently no auth)
- Modify: `processOneInboundEmail()` (~line 8373) — add client_id scope check on sender
- Modify: POST /api/auth/change-password (~line 1077) — clear `must_change_password` flag on success
- New: client activity logging helper
- New: POST /api/users/:id/reset-password (client admin variant)
- New: POST /api/users/:id/deactivate, /reactivate (client admin variants)

**Frontend** (`nbi_project_dashboard.html`):
- Sidebar rendering (~lines 3762-3800) — unhide Bug Tracker and Settings for client users; add News sidebar entry
- Top tabs array (~line 4094) — add client visibility filter
- Role dropdowns (~lines 16505, 18194) — change `value="user"` to `value="member"`
- Replace existing user creation form (~lines 16495-16510) with new Internal/Client flow
- Client filter — lock `currentFilter.client` for client users
- People tab — Team Management UI for client admins
- Settings tab — show only Account + Team Management for client users; hide system/config/data sections
- Bug Tracker view — add "Source" column for NBI admins; remove requireInternal-dependent client gate
- New: password change modal for `must_change_password` first-login flow
- Header — show company name for client users

**Migration** (`dashboard-server/migrations/XXX_client_portal.sql`):
- New file with schema changes listed in section 6 (including role normalisation)

**Tests** (`dashboard-server/tests/`):
- New: client auth tests (login, scoping, privilege escalation)
- New: client task access tests (requireTaskAccess parent chain walking)
- New: client user management tests (create, deactivate, reset password, role changes)
- New: data isolation tests (sync, tasks, clients, users, bug reports, attachments)
- New: attachment auth tests (currently no auth — regression tests for the fix)
- Update: test fixtures to support `client_id` on test users
- Existing: verify all current tests still pass after requireInternal → requireNBI rename

### 9.5 What This Feature Does NOT Include

- Self-registration (all accounts created by NBI admin or client admin)
- Client billing/invoicing
- Client-facing reports or dashboards beyond the existing Portfolio view
- Multi-client users (a user belongs to exactly one client)
- SSO/OAuth for client logins (standard username/password)
- Client-specific branding or theming
- File sharing between clients
- Chat or messaging between NBI and clients
- Login page differentiation (same login page for all user types)
- NBI admin activity log viewer UI (logged to DB but no frontend view in this phase)
