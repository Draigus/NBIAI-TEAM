# NBI Project Dashboard -- Comprehensive Test Plan

**Version:** 1.0
**Date:** 7 April 2026
**System Under Test:** NBI Project Dashboard (Express + PostgreSQL backend, single-page HTML frontend)
**Backend:** `dashboard-server/server.js` on port 8888
**Frontend:** `nbi_project_dashboard.html`

---

## Table of Contents

1. [Test Environment and Prerequisites](#1-test-environment-and-prerequisites)
2. [Authentication API Tests](#2-authentication-api-tests)
3. [User Management API Tests](#3-user-management-api-tests)
4. [Task Management API Tests](#4-task-management-api-tests)
5. [Task Comments and Notes API Tests](#5-task-comments-and-notes-api-tests)
6. [Task Attachments API Tests](#6-task-attachments-api-tests)
7. [Task Templates API Tests](#7-task-templates-api-tests)
8. [Time Tracking API Tests](#8-time-tracking-api-tests)
9. [Client Management API Tests](#9-client-management-api-tests)
10. [Client Contacts and Notes API Tests](#10-client-contacts-and-notes-api-tests)
11. [Leads CRM API Tests](#11-leads-crm-api-tests)
12. [Expense Management API Tests](#12-expense-management-api-tests)
13. [Expense Reports API Tests](#13-expense-reports-api-tests)
14. [Finance API Tests](#14-finance-api-tests)
15. [Notifications API Tests](#15-notifications-api-tests)
16. [Settings API Tests](#16-settings-api-tests)
17. [Dashboard Summary API Tests](#17-dashboard-summary-api-tests)
18. [Data Sync API Tests](#18-data-sync-api-tests)
19. [Import and File Processing API Tests](#19-import-and-file-processing-api-tests)
20. [Backup and Restore API Tests](#20-backup-and-restore-api-tests)
21. [Client Reports API Tests](#21-client-reports-api-tests)
22. [Resource Planning API Tests](#22-resource-planning-api-tests)
23. [Bug Reports API Tests](#23-bug-reports-api-tests)
24. [Audit Log API Tests](#24-audit-log-api-tests)
25. [Frontend UI Tests -- Authentication](#25-frontend-ui-tests----authentication)
26. [Frontend UI Tests -- Dashboard Page](#26-frontend-ui-tests----dashboard-page)
27. [Frontend UI Tests -- Tasks Page](#27-frontend-ui-tests----tasks-page)
28. [Frontend UI Tests -- People and Workload Page](#28-frontend-ui-tests----people-and-workload-page)
29. [Frontend UI Tests -- Leads CRM Page](#29-frontend-ui-tests----leads-crm-page)
30. [Frontend UI Tests -- Expenses Page](#30-frontend-ui-tests----expenses-page)
31. [Frontend UI Tests -- Finances Page](#31-frontend-ui-tests----finances-page)
32. [Frontend UI Tests -- Settings Page](#32-frontend-ui-tests----settings-page)
33. [Frontend UI Tests -- Notifications](#33-frontend-ui-tests----notifications)
34. [Frontend UI Tests -- Theming and Layout](#34-frontend-ui-tests----theming-and-layout)
35. [Integration Test Scenarios](#35-integration-test-scenarios)
36. [Security Test Cases](#36-security-test-cases)
37. [Performance Test Cases](#37-performance-test-cases)
38. [Edge Cases and Boundary Conditions](#38-edge-cases-and-boundary-conditions)
39. [Cross-Browser Considerations](#39-cross-browser-considerations)

---

## 1. Test Environment and Prerequisites

**Backend stack:** Node.js, Express, PostgreSQL (via `pg` Pool), bcrypt, multer, nodemailer, XLSX, PDFKit, Tesseract.js, sharp, archiver

**Frontend stack:** Single HTML file with inline CSS/JS, SheetJS library for Excel export, CSS custom properties for theming

**Test database:** A dedicated PostgreSQL test database seeded with known users, tasks, clients, leads, expenses, and configuration data.

**Test users:**
- `admin` (role: admin) -- full access
- `glen` (role: admin) -- admin user
- `tom` (role: user, expense approver via EXPENSE_APPROVER_USERNAME env)
- `testuser` (role: user) -- standard member

**Conventions:**
- Test IDs use the format `AREA-NNN` (e.g. `AUTH-001`)
- All API tests assume the base URL is `http://localhost:8888`
- `Bearer <token>` refers to a valid session token obtained from POST /api/auth/login

---

## 2. Authentication API Tests

### POST /api/auth/login

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| AUTH-001 | Successful login with username | User `admin` exists with known password | POST `/api/auth/login` with `{ username: "admin", password: "correct_pw" }` | 200; response contains `token`, `user.id`, `user.username`, `user.displayName`, `user.role`, `expiresAt` |
| AUTH-002 | Successful login with email | User has email `admin@nbi.com` | POST with `{ username: "admin@nbi.com", password: "correct_pw" }` | 200; same as AUTH-001 |
| AUTH-003 | Missing username | None | POST with `{ password: "pw" }` | 400; `{ error: "Username and password required" }` |
| AUTH-004 | Missing password | None | POST with `{ username: "admin" }` | 400; `{ error: "Username and password required" }` |
| AUTH-005 | Invalid username | No user `nonexistent` | POST with `{ username: "nonexistent", password: "pw" }` | 401; `{ error: "Invalid username or password" }` |
| AUTH-006 | Wrong password | User `admin` exists | POST with `{ username: "admin", password: "wrong_pw" }` | 401; `{ error: "Invalid username or password" }` |
| AUTH-007 | Show reset link after 4 failed attempts | None | POST 4 times with wrong password for same username | 401; response includes `showReset: true` on 4th attempt |
| AUTH-008 | Account lockout after 10 failed attempts | None | POST 10 times with wrong password for same username | 429; error message includes minutes remaining |
| AUTH-009 | Lockout expires after 15 minutes | Account locked | Wait 15 minutes (or manipulate `_failedLogins` in test) then login with correct credentials | 200; successful login |
| AUTH-010 | Successful login clears failed attempt counter | 3 failed attempts recorded | POST with correct credentials | 200; subsequent failed attempt does not start from count 3 |
| AUTH-011 | Case-insensitive username matching | User `Admin` exists | POST with `{ username: "admin", password: "correct_pw" }` | 200; matches case-insensitively |
| AUTH-012 | Session token is 64 hex characters | None | Successful login | Token matches regex `^[a-f0-9]{64}$` |
| AUTH-013 | Session expiry is 7 days from now | None | Successful login | `expiresAt` is approximately 7 days in the future |

### POST /api/auth/logout

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| AUTH-020 | Successful logout | Valid session token | POST `/api/auth/logout` with `Authorization: Bearer <token>` | 200; `{ ok: true }` |
| AUTH-021 | Token invalidated after logout | Logged out | GET `/api/auth/me` with the same token | 401; `{ error: "Session expired" }` |
| AUTH-022 | Logout with no token | None | POST `/api/auth/logout` with no Authorization header | 200; `{ ok: true }` (no-op, no error) |

### GET /api/auth/me

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| AUTH-030 | Get current user profile | Valid session | GET `/api/auth/me` | 200; `{ user: { id, username, displayName, role } }` |
| AUTH-031 | No token | None | GET `/api/auth/me` without Authorization header | 401; `{ error: "Not authenticated" }` |
| AUTH-032 | Expired token | Session with past `expires_at` | GET `/api/auth/me` with expired token | 401; `{ error: "Session expired" }` |
| AUTH-033 | Token caching | Valid session | Two rapid GET `/api/auth/me` calls | Both return 200; second may use cache (no extra DB query) |

### POST /api/auth/forgot-password

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| AUTH-040 | Forgot password for existing user | User with email exists | POST with `{ username: "admin" }` | 200; `{ ok: true, message: "If that account exists..." }` |
| AUTH-041 | Forgot password for non-existent user | No such user | POST with `{ username: "nobody" }` | 200; same success message (prevents enumeration) |
| AUTH-042 | Missing username | None | POST with `{}` | 400; `{ error: "Username or email required" }` |
| AUTH-043 | Invalidates previous reset tokens | User has existing unused reset token | POST `/api/auth/forgot-password` | Previous token is marked as used |
| AUTH-044 | Reset token expires in 1 hour | None | Check `expires_at` on the new `password_reset_tokens` row | Approximately 1 hour from now |

### GET /api/auth/reset-token/:token and POST /api/auth/reset-token/:token

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| AUTH-050 | Validate valid reset token | Unused, non-expired token | GET `/api/auth/reset-token/<token>` | 200; `{ ok: true, displayName: "..." }` |
| AUTH-051 | Validate expired reset token | Token with past `expires_at` | GET `/api/auth/reset-token/<token>` | 400; `{ error: "Invalid or expired reset link" }` |
| AUTH-052 | Validate already-used token | Token with `used = TRUE` | GET `/api/auth/reset-token/<token>` | 400; `{ error: "Invalid or expired reset link" }` |
| AUTH-053 | Reset password with valid token | Valid reset token | POST with `{ newPassword: "newpass123" }` | 200; `{ ok: true, message: "Password has been reset..." }` |
| AUTH-054 | Reset password too short | Valid reset token | POST with `{ newPassword: "short" }` | 400; `{ error: "Password must be at least 8 characters" }` |
| AUTH-055 | All sessions invalidated after reset | User had active sessions | POST reset then check sessions table | No sessions remain for that user |
| AUTH-056 | Token marked as used after reset | Valid reset token | POST reset then GET the same token | GET returns 400 (token is used) |

### POST /api/auth/reset-password (admin)

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| AUTH-060 | Admin resets another user's password | Admin session | POST with `{ userId: "<user_id>", newPassword: "newpass123" }` | 200; `{ ok: true }` |
| AUTH-061 | Non-admin cannot reset passwords | User session | POST same request | 403; `{ error: "Admin only" }` |
| AUTH-062 | Password too short | Admin session | POST with password length 5 | 400; `{ error: "Password must be at least 8 characters" }` |

### POST /api/auth/change-password

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| AUTH-070 | Change own password | Valid session, known current password | POST with `{ currentPassword: "old", newPassword: "newpass123" }` | 200; `{ ok: true }` |
| AUTH-071 | Wrong current password | Valid session | POST with incorrect `currentPassword` | 401; `{ error: "Current password incorrect" }` |
| AUTH-072 | New password too short | Valid session | POST with `newPassword` of 5 characters | 400; `{ error: "Password must be at least 8 characters" }` |
| AUTH-073 | Missing fields | Valid session | POST with `{}` | 400; `{ error: "Both passwords required" }` |

---

## 3. User Management API Tests

### GET /api/users

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| USER-001 | Admin sees full user details | Admin session | GET `/api/users` | 200; array with `id, username, display_name, email, role, is_active, capacity_hours_per_week, resource_type_ids, created_at` |
| USER-002 | Non-admin sees limited fields | User session | GET `/api/users` | 200; array with only `id, username, display_name`; no email, role, or capacity fields |
| USER-003 | Non-admin only sees active users | Inactive users exist | GET `/api/users` as non-admin | Only `is_active = TRUE` users returned |

### POST /api/users

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| USER-010 | Admin creates user | Admin session | POST with `{ username: "newuser", password: "password123", display_name: "New User", email: "new@nbi.com", role: "user" }` | 201; returns created user |
| USER-011 | Non-admin cannot create user | User session | Same POST | 403 |
| USER-012 | Duplicate username | Username already exists | POST with existing username | 409; `{ error: "Username already exists" }` |
| USER-013 | Missing required fields | Admin session | POST with `{}` | 400; `{ error: "Username and password required" }` |
| USER-014 | Username normalised to lowercase | Admin session | POST with `username: "TestUser"` | User created with `username: "testuser"` |
| USER-015 | Audit log entry created | Admin session | POST new user; check audit_log table | Entry with `entity_type: 'user'`, `action: 'create'` |

### PATCH /api/users/:id

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| USER-020 | Admin updates user role | Admin session, user exists | PATCH with `{ role: "admin" }` | 200; user returned with updated role |
| USER-021 | Non-admin cannot update | User session | Same PATCH | 403 |
| USER-022 | No fields to update | Admin session | PATCH with `{}` | 400; `{ error: "No fields to update" }` |
| USER-023 | Update nonexistent user | Admin session | PATCH `/api/users/<bad_uuid>` | 404; `{ error: "User not found" }` |

### DELETE /api/users/:id

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| USER-030 | Admin deletes user | Admin session, target user exists | DELETE `/api/users/<id>` | 200; `{ ok: true }` |
| USER-031 | Non-admin cannot delete | User session | Same DELETE | 403 |
| USER-032 | Cannot delete self | Admin session | DELETE `/api/users/<own_id>` | 400; `{ error: "Cannot delete yourself" }` |
| USER-033 | Sessions deleted with user | Target user had active sessions | DELETE user; check sessions table | No sessions for deleted user |

### PATCH /api/users/:id/skills

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| USER-040 | Admin updates user skills | Admin session | PATCH with `{ resource_type_ids: ["uuid1", "uuid2"], capacity_hours_per_week: 30 }` | 200; returns updated user with new fields |
| USER-041 | Non-admin cannot update skills | User session | Same PATCH | 403 |

---

## 4. Task Management API Tests

### GET /api/tasks

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| TASK-001 | List all tasks | Tasks exist | GET `/api/tasks` | 200; array of tasks with `client_name`, `notes` aggregate |
| TASK-002 | Filter by client_id | Tasks with various clients | GET `/api/tasks?client_id=<uuid>` | 200; only tasks for that client |
| TASK-003 | Filter by status | Mixed statuses | GET `/api/tasks?status=In progress` | 200; only "In progress" tasks |
| TASK-004 | Filter by assignee | Tasks with various assignees | GET `/api/tasks?assignee=Glen` | 200; only tasks where "Glen" is in assignees array |
| TASK-005 | Combined filters | Multiple conditions | GET `/api/tasks?client_id=<uuid>&status=Done` | 200; tasks matching both conditions |
| TASK-006 | Empty result set | No matching tasks | GET `/api/tasks?status=NoSuchStatus` | 200; empty array |

### GET /api/tasks/:id

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| TASK-010 | Get existing task | Task exists | GET `/api/tasks/<uuid>` | 200; full task object with notes, client_name |
| TASK-011 | Get nonexistent task | No such ID | GET `/api/tasks/<random_uuid>` | 404; `{ error: "Not found" }` |

### POST /api/tasks

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| TASK-020 | Create task with all fields | Valid session | POST with `{ title: "Test Task", client_id: "<uuid>", status: "Not started", priority: "High", description: "desc", assignees: ["Glen"], hours_estimated: 10, due_date: "2026-05-01" }` | 201; task returned with all fields set |
| TASK-021 | Create task with only title | Valid session | POST with `{ title: "Minimal task" }` | 201; defaults: status="Not started", priority="", assignees=[], hours_estimated=0 |
| TASK-022 | Missing title | Valid session | POST with `{}` | 400; `{ error: "Title required" }` |
| TASK-023 | Create sub-task with parent_id | Parent task exists | POST with `{ title: "Sub", parent_id: "<parent_uuid>" }` | 201; task has parent_id set |
| TASK-024 | Audit log entry created | Valid session | POST task; check audit_log | Entry with `entity_type: 'task'`, `action: 'create'` |

### PATCH /api/tasks/:id

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| TASK-030 | Update status | Task exists | PATCH with `{ status: "In progress" }` | 200; updated task returned |
| TASK-031 | Update multiple fields | Task exists | PATCH with `{ status: "Done", health_state: "Green", hours_spent: 5 }` | 200; all fields updated |
| TASK-032 | No fields to update | Task exists | PATCH with `{}` | 400; `{ error: "No fields" }` |
| TASK-033 | Nonexistent task | No such ID | PATCH `/api/tasks/<random_uuid>` | 404; `{ error: "Not found" }` |
| TASK-034 | Audit log records old and new values | Task with status "Not started" | PATCH with `{ status: "Done" }` | Audit log has `changes: { status: { from: "Not started", to: "Done" } }` |
| TASK-035 | No audit entry when value unchanged | Task with status "Done" | PATCH with `{ status: "Done" }` | No new audit_log entry (values identical) |

### DELETE /api/tasks/:id

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| TASK-040 | Admin deletes task | Admin session, task exists | DELETE `/api/tasks/<uuid>` | 200; `{ ok: true }` |
| TASK-041 | Non-admin cannot delete | User session | Same DELETE | 403 |
| TASK-042 | Child tasks re-parented | Task has children | DELETE parent task | Children have `parent_id = NULL` |
| TASK-043 | Audit log entry created | Admin session | DELETE task | Entry with `action: 'delete'` |

### POST /api/tasks/bulk

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| TASK-050 | Bulk create tasks | Admin session | POST with `{ tasks: [{ title: "A", _temp_id: "t1" }, { title: "B", _temp_id: "t2", _temp_parent_id: "t1" }] }` | 201; `{ count: 2 }`; parent-child relationship established |
| TASK-051 | Empty tasks array | Admin session | POST with `{ tasks: [] }` | 201; `{ count: 0 }` |
| TASK-052 | Missing tasks field | Admin session | POST with `{}` | 400; `{ error: "tasks array required" }` |
| TASK-053 | Transaction rollback on error | Malformed data | Force an error mid-import | No partial data committed |

---

## 5. Task Comments and Notes API Tests

### Task Comments

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| COMM-001 | List comments on task | Task with comments | GET `/api/tasks/<id>/comments` | 200; array ordered by `created_at ASC` |
| COMM-002 | Add comment | Task exists | POST with `{ text: "Test comment" }` | 201; comment returned with `author` from session |
| COMM-003 | Empty text rejected | Task exists | POST with `{ text: "" }` | 400; `{ error: "text required" }` |
| COMM-004 | Delete own comment | Comment exists, authored by current user | DELETE `/api/tasks/<id>/comments/<commentId>` | 200; `{ ok: true }` |
| COMM-005 | Cannot delete others' comments | Comment by another user | DELETE as non-admin, non-owner | 403; `{ error: "Can only delete your own comments" }` |
| COMM-006 | Admin can delete any comment | Comment by another user | DELETE as admin | 200; `{ ok: true }` |
| COMM-007 | Delete nonexistent comment | No such comment | DELETE with bad ID | 404; `{ error: "Comment not found" }` |

### Task Notes

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| NOTE-001 | Add note to task | Task exists | POST `/api/tasks/<id>/notes` with `{ text: "Quick note" }` | 201; note returned |
| NOTE-002 | Missing text | Task exists | POST with `{}` | 400; `{ error: "Text required" }` |
| NOTE-003 | Task updated_at bumped | Task exists | POST note; re-fetch task | Task's `updated_at` is more recent |

---

## 6. Task Attachments API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| ATT-001 | Upload attachment to task | Task exists | POST `/api/tasks/<id>/attachments` with multipart file | 201; attachment record returned with `filename`, `original_name`, `size_bytes`, `mime_type` |
| ATT-002 | No file uploaded | Task exists | POST with no file | 400; `{ error: "No file uploaded" }` |
| ATT-003 | List attachments for task | Task has attachments | GET `/api/tasks/<id>/attachments` | 200; array sorted by `created_at DESC` |
| ATT-004 | Download attachment | Attachment exists on disk | GET `/api/attachments/<filename>` | 200; file content served |
| ATT-005 | Path traversal blocked | None | GET `/api/attachments/../../../etc/passwd` | 400; `{ error: "Invalid filename" }` |
| ATT-006 | Delete attachment | Attachment exists | DELETE `/api/tasks/<id>/attachments/<attId>` | 200; `{ ok: true }`; file removed from disk |
| ATT-007 | File not found | No such file on disk | GET `/api/attachments/nonexistent.pdf` | 404 |
| ATT-008 | File size limit enforced | None | Upload file > 25MB | 400/413 (multer rejects) |

### Universal Attachments

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| ATT-020 | Upload to any entity type | Client exists | POST `/api/attachments/entity/client/<id>` with file | 201; record with `entity_type: 'client'` |
| ATT-021 | List entity attachments | Attachments exist | GET `/api/attachments/entity/client/<id>` | 200; array |
| ATT-022 | Download entity attachment | File exists | GET `/api/attachments/download/<filename>` | 200; file served with Content-Disposition |
| ATT-023 | Delete entity attachment | Record and file exist | DELETE `/api/attachments/<id>` | 200; file removed |
| ATT-024 | Path traversal on download blocked | None | GET `/api/attachments/download/../server.js` | 403 |

---

## 7. Task Templates API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| TMPL-001 | List templates | Templates exist | GET `/api/templates` | 200; sorted by name |
| TMPL-002 | Create template | Valid session | POST with `{ name: "Sprint", template: { title: "Sprint Root", children: [{ title: "Sub" }] } }` | 201; template returned |
| TMPL-003 | Missing name or template | Valid session | POST with `{ name: "X" }` | 400; `{ error: "name and template required" }` |
| TMPL-004 | Instantiate template | Template with children exists | POST `/api/templates/<id>/create` | 200; `{ ok: true, created: [...] }`; tasks created recursively |
| TMPL-005 | Instantiate nonexistent template | No such ID | POST `/api/templates/<bad_id>/create` | 404 |
| TMPL-006 | Delete template (admin) | Admin session, template exists | DELETE `/api/templates/<id>` | 200; `{ ok: true }` |
| TMPL-007 | Non-admin cannot delete | User session | Same DELETE | 403 |

---

## 8. Time Tracking API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| TIME-001 | Log time entry | Task exists | POST `/api/tasks/<id>/time-entries` with `{ hours: 2.5, description: "Work", date: "2026-04-07" }` | 201; entry returned; task's `hours_spent` updated |
| TIME-002 | Invalid hours (zero) | Task exists | POST with `{ hours: 0 }` | 400; `{ error: "hours required (> 0)" }` |
| TIME-003 | Negative hours | Task exists | POST with `{ hours: -1 }` | 400 |
| TIME-004 | List time entries for task | Entries exist | GET `/api/tasks/<id>/time-entries` | 200; array ordered by `date DESC` |
| TIME-005 | Delete own time entry | Entry by current user | DELETE `/api/time-entries/<id>` | 200; task's `hours_spent` recalculated |
| TIME-006 | Cannot delete others' entries | Entry by different user | DELETE as non-admin, non-owner | 403 |
| TIME-007 | Admin can delete any entry | Entry by different user | DELETE as admin | 200 |
| TIME-008 | Delete nonexistent entry | No such ID | DELETE `/api/time-entries/<bad_id>` | 404 |
| TIME-009 | Time summary grouped by user/client | Entries exist | GET `/api/time-entries/summary?from=2026-01-01&to=2026-12-31` | 200; rows with `user_name`, `client_name`, `total_hours`, `entry_count` |
| TIME-010 | Default date is today | No date in body | POST with `{ hours: 1 }` | Entry created with today's date |

---

## 9. Client Management API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| CLT-001 | List all clients | Clients exist | GET `/api/clients` | 200; array with `task_count` for each client |
| CLT-002 | Get single client | Client exists | GET `/api/clients/<id>` | 200; client object with `contacts` array |
| CLT-003 | Get nonexistent client | No such ID | GET `/api/clients/<bad_id>` | 404 |
| CLT-004 | Create client | Valid session | POST with `{ name: "Test Co", sector: "gaming" }` | 201; client returned |
| CLT-005 | Missing name | Valid session | POST with `{}` | 400; `{ error: "Name required" }` |
| CLT-006 | Update client fields | Client exists | PATCH with `{ description: "Updated desc" }` | 200; updated client returned; `updated_at` bumped |
| CLT-007 | No fields to update | Client exists | PATCH with `{}` | 400 |
| CLT-008 | Delete client (admin) | Admin session, client has tasks | DELETE `/api/clients/<id>` | 200; tasks unlinked (`client_id = NULL`) |
| CLT-009 | Non-admin cannot delete client | User session | Same DELETE | 403 |

---

## 10. Client Contacts and Notes API Tests

### Contacts

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| CON-001 | List contacts for client | Contacts exist | GET `/api/clients/<id>/contacts` | 200; sorted by `sort_order` |
| CON-002 | Add contact | Client exists | POST with `{ name: "John", role: "CEO", email: "john@test.com" }` | 201; contact returned |
| CON-003 | Update contact | Contact exists | PATCH `/api/contacts/<id>` with `{ phone: "07123456789" }` | 200; updated contact |
| CON-004 | Delete contact (admin) | Admin session | DELETE `/api/contacts/<id>` | 200 |
| CON-005 | Non-admin cannot delete | User session | Same DELETE | 403 |

### Client Notes

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| CNOTE-001 | List notes for client | Notes exist | GET `/api/clients/<id>/notes` | 200; sorted by `meeting_date DESC` |
| CNOTE-002 | List all notes globally | Notes exist | GET `/api/notes` | 200; includes `client_name` |
| CNOTE-003 | Create note | Client exists | POST with `{ title: "Q1 Review", content: "Notes..." }` | 201; note returned |
| CNOTE-004 | Missing title | Client exists | POST with `{ content: "text" }` | 400 |
| CNOTE-005 | Update note | Note exists | PATCH `/api/notes/<id>` with `{ content: "Updated" }` | 200; updated note |
| CNOTE-006 | Delete note (admin) | Admin session | DELETE `/api/notes/<id>` | 200 |
| CNOTE-007 | Non-admin cannot delete | User session | Same DELETE | 403 |

---

## 11. Leads CRM API Tests

### Lead Pipeline Config

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| LEAD-001 | Get pipeline config | Config exists | GET `/api/leads/config` | 200; `{ stages, resourceTypes, fieldOptions }` |
| LEAD-002 | Config is cached | Config fetched recently | GET twice within 5 minutes | Second request served from cache (no DB query) |
| LEAD-003 | Create stage (admin) | Admin session | POST `/api/leads/stages` with `{ name: "Discovery", sort_order: 1 }` | 201; stage returned |
| LEAD-004 | Update stage (admin) | Stage exists | PATCH `/api/leads/stages/<id>` with `{ colour: "#ff0000" }` | 200; updated stage |
| LEAD-005 | Delete stage (admin, no leads) | Stage has no leads | DELETE `/api/leads/stages/<id>` | 200 |
| LEAD-006 | Cannot delete stage with leads | Stage has leads | DELETE `/api/leads/stages/<id>` | 409; error about existing leads |
| LEAD-007 | Create resource type (admin) | Admin session | POST `/api/leads/resource-types` with `{ name: "Analyst" }` | 201 |
| LEAD-008 | Delete resource type with references (soft delete) | Resources reference this type | DELETE | 200; `{ soft_deleted: true }` |
| LEAD-009 | Create field option (admin) | Admin session | POST `/api/leads/field-options` with `{ field_name: "work_type", value: "Consulting" }` | 201 |
| LEAD-010 | Non-admin cannot modify config | User session | Any POST/PATCH/DELETE on config endpoints | 403 |

### Lead CRUD

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| LEAD-020 | Create lead with required fields | Stage exists | POST `/api/leads` with `{ title: "New Opportunity", stage_id: "<uuid>" }` | 201; lead returned with stage name/colour joined |
| LEAD-021 | Create lead with all fields | Stage, client, contact exist | POST with all fields including `resources` array | 201; resources inserted; activity log entry "Lead created" |
| LEAD-022 | Missing title | Valid session | POST with `{ stage_id: "<uuid>" }` | 400; `{ error: "Title required" }` |
| LEAD-023 | Missing stage_id | Valid session | POST with `{ title: "X" }` | 400; `{ error: "Stage required" }` |
| LEAD-024 | List leads with filters | Multiple leads | GET `/api/leads?stage_id=<uuid>&search=gaming` | 200; filtered results with pagination |
| LEAD-025 | Lead detail with resources and activities | Lead exists | GET `/api/leads/<id>` | 200; includes `resources`, `activities`, `client_contacts` |
| LEAD-026 | Lead not found | No such ID | GET `/api/leads/<bad_id>` | 404 |
| LEAD-027 | Update lead fields | Lead exists | PATCH with `{ win_probability: 75, stage_id: "<new_stage>" }` | 200; stage change creates activity log entry |
| LEAD-028 | Priority change creates activity | Lead exists | PATCH with `{ priority: 2 }` | Activity entry with `activity_type: 'priority_change'` |
| LEAD-029 | Delete lead (admin) | Admin session | DELETE `/api/leads/<id>` | 200 |
| LEAD-030 | Non-admin cannot delete | User session | Same DELETE | 403 |

### Lead Resources

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| LEAD-040 | Replace all resources | Lead exists | PUT `/api/leads/<id>/resources` with `{ resources: [{ resource_type_id: "<uuid>", quantity: 2 }] }` | 200; `{ ok: true }` |
| LEAD-041 | Empty resources clears all | Lead has resources | PUT with `{ resources: [] }` | 200; all resources removed |
| LEAD-042 | Invalid body | None | PUT with `{}` | 400 |

### Lead Activities

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| LEAD-050 | List activities | Activities exist | GET `/api/leads/<id>/activities` | 200; sorted by `created_at DESC` |
| LEAD-051 | Log activity | Lead exists | POST with `{ activity_type: "call", description: "Discovery call" }` | 201; activity returned |
| LEAD-052 | Missing fields | Lead exists | POST with `{}` | 400 |

### Lead Pipeline and Forecasting

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| LEAD-060 | Pipeline summary | Leads across stages | GET `/api/leads/pipeline/summary` | 200; `{ byStage: [...], fxRates: {...} }` |
| LEAD-061 | Pipeline forecast | Leads with close dates | GET `/api/leads/pipeline/forecast` | 200; monthly weighted values |
| LEAD-062 | Follow-up reminders | Leads with overdue follow-up dates | GET `/api/leads/reminders` | 200; only open leads where `next_followup_date <= today` |

---

## 12. Expense Management API Tests

### Expense Categories

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| EXP-001 | List active categories | Categories exist | GET `/api/expenses/categories` | 200; only `is_active = TRUE`, sorted |
| EXP-002 | Create category (admin) | Admin session | POST with `{ name: "Travel" }` | 201; category returned |
| EXP-003 | Delete category (admin, no references) | No expenses use this category | DELETE `/api/expenses/categories/<id>` | 200 |
| EXP-004 | Cannot delete referenced category | Expenses reference this category | DELETE | 400; error with count of referencing expenses |

### Expense CRUD

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| EXP-010 | Create expense | Valid session | POST with `{ date: "2026-04-07", amount: 49.99, currency: "GBP", description: "Taxi" }` | 201; expense returned with `status: 'pending'` |
| EXP-011 | Missing date | Valid session | POST with `{ amount: 10 }` | 400 |
| EXP-012 | Missing amount | Valid session | POST with `{ date: "2026-04-07" }` | 400 |
| EXP-013 | Negative amount | Valid session | POST with `{ date: "2026-04-07", amount: -5 }` | 400 |
| EXP-014 | Invalid VAT amount | Valid session | POST with `{ date: "2026-04-07", amount: 10, vat_amount: -1 }` | 400 |
| EXP-015 | List own expenses (non-admin) | User has expenses | GET `/api/expenses` | 200; only own expenses |
| EXP-016 | Admin sees all expenses | Admin session | GET `/api/expenses` | 200; all expenses from all users |
| EXP-017 | Filter by status | Mixed statuses | GET `/api/expenses?status=pending` | 200; only pending |
| EXP-018 | Filter by date range | Expenses across dates | GET `/api/expenses?from_date=2026-04-01&to_date=2026-04-30` | 200; only within range |
| EXP-019 | Get single expense (own) | Expense exists | GET `/api/expenses/<id>` | 200; includes `receipts` array |
| EXP-020 | Cannot view others' expense | Non-admin, non-owner | GET `/api/expenses/<other_id>` | 403 |
| EXP-021 | Admin can view any expense | Admin session | GET `/api/expenses/<any_id>` | 200 |
| EXP-022 | Owner updates pending expense | Expense is pending | PATCH with `{ amount: 55 }` | 200 |
| EXP-023 | Owner cannot edit reviewed expense | Expense status is 'approved' | PATCH as owner | 400; `{ error: "Cannot edit an expense that has been reviewed" }` |
| EXP-024 | Admin approves expense | Admin session | PATCH with `{ status: "approved" }` | 200; `reviewed_by` and `reviewed_at` auto-set |
| EXP-025 | Owner deletes pending expense | Expense is pending | DELETE `/api/expenses/<id>` | 200; receipt files also deleted from disk |
| EXP-026 | Owner cannot delete reviewed expense | Expense is approved | DELETE as owner | 400 |
| EXP-027 | Admin can delete any expense | Admin session | DELETE | 200 |
| EXP-028 | Non-owner cannot delete | Different user, non-admin | DELETE | 403 |
| EXP-029 | Expense summary (admin) | Expenses exist | GET `/api/expenses/summary` | 200; `{ byEmployee, byCategory }` |
| EXP-030 | Non-admin cannot access summary | User session | GET `/api/expenses/summary` | 403 |

### Expense Receipts

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| EXP-040 | Upload receipt | Expense exists, owned by user | POST `/api/expenses/<id>/receipts` with file | 201; receipt record returned |
| EXP-041 | No file uploaded | Expense exists | POST with no file | 400 |
| EXP-042 | Non-owner cannot upload receipt | Different user | POST | 403 |
| EXP-043 | Delete receipt | Receipt exists, owned by user | DELETE `/api/expenses/<id>/receipts/<receiptId>` | 200; file removed from disk |
| EXP-044 | Delete receipt nonexistent | Bad receipt ID | DELETE | 404 |

### OCR Receipt Processing

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| EXP-050 | Create expense from image receipt | Valid session, image file | POST `/api/expenses/from-receipt` with image file | 201; expense created with OCR-extracted fields; receipt attached |
| EXP-051 | Create expense from PDF receipt | Valid session, PDF with text layer | POST with PDF file | 201; date, amount, vendor extracted from PDF text |
| EXP-052 | No file uploaded | Valid session | POST with no file | 400 |
| EXP-053 | Extraction falls back on empty PDF | PDF with no text layer | POST with scanned PDF | 201; falls through to OCR.space or Tesseract; extracted fields may have defaults |
| EXP-054 | Extracted fields structure | Successful OCR | Check `extracted` in response | Contains `date`, `amount`, `currency`, `description`, `vendor`, `rawText`, `ocrMethod` |

---

## 13. Expense Reports API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| ERPT-001 | Create draft report | Valid session | POST `/api/expense-reports` with `{ title: "March 2026" }` | 201; report with `status: 'draft'` |
| ERPT-002 | Missing title | Valid session | POST with `{}` | 400 |
| ERPT-003 | List reports (non-admin) | User has reports | GET `/api/expense-reports` | 200; only own reports with `expense_count`, `total_amount` |
| ERPT-004 | Admin sees all reports | Admin session | GET `/api/expense-reports` | 200; all reports |
| ERPT-005 | Expense approver sees submitted reports | Tom's session | GET `/api/expense-reports` | 200; own reports plus submitted/approved/rejected from others |
| ERPT-006 | Get report detail | Report exists | GET `/api/expense-reports/<id>` | 200; includes `expenses` array and `totals_by_currency` |
| ERPT-007 | Access denied for other user's report | Non-admin, non-owner, non-approver | GET | 403 |
| ERPT-008 | Update draft report title | Owner, report is draft | PATCH with `{ title: "Updated Title" }` | 200 |
| ERPT-009 | Cannot edit submitted report (non-admin) | Report submitted | PATCH as owner | 400 |
| ERPT-010 | Reviewer approves report | Admin/approver session | PATCH with `{ status: "approved" }` | 200; `reviewed_by`/`reviewed_at` auto-set; all expenses also approved |
| ERPT-011 | Reviewer rejects report | Admin/approver session | PATCH with `{ status: "rejected" }` | 200; expenses set back to pending |
| ERPT-012 | Add expenses to report | Draft report, user's pending expenses exist | POST `/api/expense-reports/<id>/expenses` with `{ expense_ids: ["uuid1", "uuid2"] }` | 200; `{ added: 2 }` |
| ERPT-013 | Cannot add others' expenses | Expense belongs to different user | POST with that expense ID | 400; error about wrong user |
| ERPT-014 | Cannot add expense already in another report | Expense has report_id set | POST | 400; error about already assigned |
| ERPT-015 | Remove expense from report | Draft report | DELETE `/api/expense-reports/<id>/expenses/<expenseId>` | 200; expense's `report_id` set to NULL |
| ERPT-016 | Cannot modify submitted report | Report submitted | POST or DELETE expenses | 400 |
| ERPT-017 | Submit report | Draft report with expenses | POST `/api/expense-reports/<id>/submit` | 200; status becomes 'submitted'; Tom notified |
| ERPT-018 | Cannot submit empty report | Draft report, no expenses | POST submit | 400; `{ error: "Cannot submit an empty report..." }` |
| ERPT-019 | Cannot submit already-submitted report | Report already submitted | POST submit | 400; `{ error: "Report has already been submitted" }` |
| ERPT-020 | Expense reminder dismissed on submit | User has pending expense_reminder notification | POST submit | Reminder notification marked as read |
| ERPT-021 | Delete draft report | Owner, draft | DELETE `/api/expense-reports/<id>` | 200; expenses unlinked |
| ERPT-022 | Non-admin cannot delete submitted report | Owner, submitted | DELETE | 400 |
| ERPT-023 | Admin can delete any report | Admin session | DELETE | 200 |
| ERPT-024 | Export report as ZIP | Report with expenses and receipts | GET `/api/expense-reports/<id>/export` | 200; ZIP file containing CSV and receipt files |

---

## 14. Finance API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| FIN-001 | Get latest finance data | Finance data exists | GET `/api/finance` | 200; `{ data: {...}, updatedBy, updatedAt }` |
| FIN-002 | No finance data yet | Empty table | GET `/api/finance` | 200; `{ data: null }` |
| FIN-003 | Save finance data | Valid session | PUT `/api/finance` with `{ data: { revenue: [...] } }` | 200; `{ ok: true }`; new row inserted (append-only) |
| FIN-004 | Missing data field | Valid session | PUT with `{}` | 400 |
| FIN-005 | Get finance seed data (admin) | Seed file exists | GET `/api/finance/seed` | 200; seed JSON |
| FIN-006 | Non-admin cannot get seed | User session | GET `/api/finance/seed` | 403 |
| FIN-007 | Get CSV seed data (admin) | CSV exists | GET `/api/seed-data` | 200; `{ csv: "..." }` |
| FIN-008 | No seed file | File doesn't exist | GET `/api/seed-data` | 200; `{ csv: null, message: "..." }` |

---

## 15. Notifications API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| NOTIF-001 | List notifications | User has notifications | GET `/api/notifications` | 200; `{ notifications: [...], unread: N }` limited to 50 |
| NOTIF-002 | Mark specific notifications as read | Unread dismissable notifications | POST `/api/notifications/read` with `{ ids: ["uuid1", "uuid2"] }` | 200; those notifications marked read |
| NOTIF-003 | Mark all as read | Unread notifications | POST `/api/notifications/read` with `{}` | 200; all dismissable notifications marked read |
| NOTIF-004 | Non-dismissable not marked without force | Non-dismissable notification | POST `/api/notifications/read` with `{ ids: [...] }` | 200; non-dismissable notification remains unread |
| NOTIF-005 | Force-dismiss non-dismissable | Non-dismissable notification | POST with `{ ids: [...], force: true }` | 200; notification marked read |

---

## 16. Settings API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| SET-001 | Get all settings | Settings exist | GET `/api/settings` | 200; key-value object |
| SET-002 | Upsert setting (admin) | Admin session | PUT `/api/settings/theme` with `{ value: "dark" }` | 200; `{ ok: true }` |
| SET-003 | Non-admin cannot modify | User session | Same PUT | 403 |
| SET-004 | Setting stored as JSON | Admin session | PUT with `{ value: { custom: true } }` | Setting value stored as JSON string |
| SET-005 | Upsert overwrites existing | Setting already exists | PUT with new value | Updated value, `updated_at` bumped |

---

## 17. Dashboard Summary API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| DASH-001 | Get full dashboard summary | Tasks exist | GET `/api/dashboard/summary` | 200; `{ stats, by_client, by_assignee }` |
| DASH-002 | Stats include all counters | Tasks in various states | Check `stats` object | Fields: `total_tasks`, `not_started`, `in_progress`, `planning`, `done`, `blocked`, `cancelled`, `health_red`, `health_yellow`, `health_green`, `health_blocked`, `total_hours_estimated`, `total_hours_spent` |
| DASH-003 | Filter by client_id | Tasks for specific client | GET `/api/dashboard/summary?client_id=<uuid>` | 200; stats reflect only that client's tasks |
| DASH-004 | By-assignee breakdown | Tasks with assignees | Check `by_assignee` | Each row has `assignee`, `task_count`, `active_count` |

---

## 18. Data Sync API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| SYNC-001 | Incremental sync changes | Admin session | POST `/api/sync/changes` with upsert and delete operations | 200; `{ ok: true, applied: N, idMap: {...} }` |
| SYNC-002 | Conflict detection | Task updated by another user after client loaded it | POST upsert with old `_serverUpdatedAt` | Update skipped; client picks up newer version on next poll |
| SYNC-003 | New task creation via sync | New task data with no existing ID | POST sync change | New task created; ID mapped |
| SYNC-004 | Poll for changes | Tasks updated after timestamp | GET `/api/sync/poll?since=<ISO>` | 200; `{ updated: [...], currentIds: [...], serverTime }` |
| SYNC-005 | Poll invalid timestamp | Bad timestamp | GET `/api/sync/poll?since=notadate` | 400 |
| SYNC-006 | Poll missing since | None | GET `/api/sync/poll` | 400 |
| SYNC-007 | Full-replace sync (legacy) | Admin session | PUT `/api/sync/tasks` with tasks and client_briefs | 200; all tasks replaced |
| SYNC-008 | Non-admin cannot sync | User session | POST/PUT sync endpoints | 403 |
| SYNC-009 | Load all data | Admin session | GET `/api/sync/load` | 200; `{ tasks, clientBriefs, settings, knownClients }` in camelCase format |
| SYNC-010 | Client briefs synced | Brief data included in sync | POST sync with `client_briefs` | Clients created/updated with contacts |

---

## 19. Import and File Processing API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| IMP-001 | Scan downloads folder | Admin session | GET `/api/import/scan-downloads` | 200; `{ dir, files: [...] }` with format detection |
| IMP-002 | Non-admin cannot scan | User session | Same GET | 403 |
| IMP-003 | Parse CSV file | CSV in Downloads | POST `/api/import/parse-file` with `{ filename: "test.csv" }` | 200; headers, rows, detected format, mapped tasks |
| IMP-004 | Parse Excel file | XLSX in Downloads | POST with `{ filename: "test.xlsx" }` | 200; includes sheets, activeSheet |
| IMP-005 | Parse specific sheet | Multi-sheet XLSX | POST with `{ filename: "test.xlsx", sheet: "Sheet2" }` | 200; data from Sheet2 |
| IMP-006 | File not found | No such file | POST with `{ filename: "nonexistent.csv" }` | 404 |
| IMP-007 | Path traversal blocked | None | POST with `{ filename: "../../server.js" }` | 400; `{ error: "Invalid path" }` |
| IMP-008 | Missing filename | None | POST with `{}` | 400 |
| IMP-009 | Contract PDF extraction | PDF file | POST `/api/contract/extract` with PDF upload | 200; extracted deliverables, tasks, milestones with `rawPreview` |
| IMP-010 | Format detection: Planner | XLSX with Planner columns | Check detected format | `format: 'planner'`, `label: 'Microsoft Planner Export'` |
| IMP-011 | Format detection: MS Project | XLSX with Project columns | Check detected format | `format: 'ms-project'` |
| IMP-012 | Format detection: NBI CSV | CSV with Task/Status/Priority | Check detected format | `format: 'nbi-csv'` |

---

## 20. Backup and Restore API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| BKP-001 | Export backup (admin) | Data exists | GET `/api/backup` | 200; JSON with `version`, `exportedAt`, `tables` containing tasks, clients, comments, notes, finance, users, settings |
| BKP-002 | Non-admin cannot export | User session | GET `/api/backup` | 403 |
| BKP-003 | Restore backup (admin) | Valid backup JSON | POST `/api/restore` with `{ backup: <backup_json> }` | 200; `{ ok: true }` |
| BKP-004 | Restore uses transaction | Backup with error-inducing data | Introduce a failing row mid-restore | Entire restore rolled back; original data intact |
| BKP-005 | Invalid backup format | Missing `tables` field | POST `/api/restore` with `{ backup: {} }` | 400; `{ error: "Invalid backup format" }` |
| BKP-006 | Non-admin cannot restore | User session | POST `/api/restore` | 403 |
| BKP-007 | Audit log records restore | Successful restore | Check audit_log | Entry with `entity_type: 'system'`, `action: 'restore'` |

---

## 21. Client Reports API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| RPT-001 | Generate client report | Client with tasks | POST `/api/clients/<id>/reports` | 201; `{ shareToken, shareUrl, pdfUrl, createdAt }` |
| RPT-002 | Client not found | No such client | POST `/api/clients/<bad_id>/reports` | 404 |
| RPT-003 | List past reports | Reports exist | GET `/api/clients/<id>/reports` | 200; up to 20 reports, newest first |
| RPT-004 | Public JSON report | Valid share token | GET `/api/reports/<token>` (no auth) | 200; report data JSON |
| RPT-005 | Public HTML report | Valid share token | GET `/api/reports/<token>/html` (no auth) | 200; HTML content with proper XSS escaping |
| RPT-006 | Public PDF report | Valid share token | GET `/api/reports/<token>/pdf` (no auth) | 200; PDF binary with Content-Disposition header |
| RPT-007 | Invalid share token | Wrong token | GET `/api/reports/badtoken` | 404 |
| RPT-008 | Expired report | Token past `expires_at` | GET `/api/reports/<expired_token>` | 410; "Report expired" |
| RPT-009 | Report KPIs accurate | Known task set for client | Generate report; verify `kpis.total`, `kpis.done`, `kpis.completePct` | All computed values match manual calculation |

---

## 22. Resource Planning API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| RSRC-001 | Get capacity data | Users and tasks exist | GET `/api/resource-planning/capacity` | 200; `{ users: [...], weekLabels }` with per-week committed/capacity/utilisation |
| RSRC-002 | Custom week count | None | GET `?weeks=4` | 200; only 4 week entries per user |
| RSRC-003 | Deal readiness check | Lead with resource requirements, qualified users exist | GET `/api/resource-planning/deal-readiness/<leadId>` | 200; `{ canStaff: true/false, readiness: [...] }` |
| RSRC-004 | No resource requirements | Lead without resources | GET deal-readiness | 200; `{ canStaff: true, message: "No resource requirements defined" }` |

---

## 23. Bug Reports API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| BUG-001 | Create bug report | Valid session | POST `/api/bug-reports` with `{ type: "bug", title: "Button broken", page: "tasks" }` | 201 |
| BUG-002 | Create feature request | Valid session | POST with `{ type: "feature", title: "Add dark mode" }` | 201 |
| BUG-003 | Invalid type defaults to bug | Valid session | POST with `{ type: "invalid", title: "Test" }` | 201; `type: 'bug'` |
| BUG-004 | Missing title | Valid session | POST with `{}` | 400 |
| BUG-005 | List reports (non-admin sees own) | Reports exist | GET `/api/bug-reports` | 200; only own reports |
| BUG-006 | Admin sees all reports | Admin session | GET `/api/bug-reports` | 200; all reports |
| BUG-007 | Filter by status | Reports with mixed statuses | GET `?status=open` | 200; only open |
| BUG-008 | Admin updates status | Admin session | PATCH with `{ status: "resolved" }` | 200 |
| BUG-009 | Invalid status | Admin session | PATCH with `{ status: "invalid" }` | 400; lists valid statuses |
| BUG-010 | Non-admin cannot update status | User session | PATCH | 403 |
| BUG-011 | Delete report (admin) | Admin session | DELETE | 200 |
| BUG-012 | Get screenshot | Report has screenshot | GET `/api/bug-reports/<id>/screenshot` | 200; image binary served |
| BUG-013 | No screenshot | Report without screenshot | GET screenshot | 404 |

---

## 24. Audit Log API Tests

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| AUD-001 | List audit entries | Entries exist | GET `/api/audit-log` | 200; `{ entries, total, limit, offset }` |
| AUD-002 | Pagination | > 50 entries | GET `?limit=10&offset=20` | 200; 10 entries starting from offset 20 |
| AUD-003 | Filter by entity_type | Mixed entries | GET `?entity_type=task` | 200; only task entries |
| AUD-004 | Filter by action | Mixed entries | GET `?action=create` | 200; only create entries |
| AUD-005 | Text search | Known changed_by value | GET `?search=Glen` | 200; entries matching search |
| AUD-006 | Limit capped at 200 | None | GET `?limit=500` | Response has `limit: 200` |

---

## 25. Frontend UI Tests -- Authentication

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| FE-AUTH-001 | Login form renders | Page loaded, not logged in | Navigate to dashboard | Login form displayed with username and password fields |
| FE-AUTH-002 | Successful login | Valid credentials | Enter username/password, click Login | Redirected to dashboard; sidebar and header visible |
| FE-AUTH-003 | Failed login shows error | Invalid credentials | Enter wrong password | Error toast displayed; form remains visible |
| FE-AUTH-004 | Token stored in localStorage | After successful login | Check localStorage | `nbi_token` key contains session token |
| FE-AUTH-005 | Session persists on refresh | Logged in | Refresh page | User remains logged in; dashboard loads |
| FE-AUTH-006 | Logout clears session | Logged in | Click user menu, then Logout | Returned to login form; localStorage cleared |
| FE-AUTH-007 | Forgot password link appears | 4+ failed logins | Enter wrong password 4 times | "Forgot password?" link appears below login form |
| FE-AUTH-008 | Password reset flow | Click forgot password | Enter username, submit; navigate to reset URL | Reset form displayed; can set new password |

---

## 26. Frontend UI Tests -- Dashboard Page

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| FE-DASH-001 | KPI cards render | Tasks exist in DB | Navigate to Dashboard | Cards show total tasks, completion %, in progress, overdue, blocked counts |
| FE-DASH-002 | Overdue tasks highlighted | Tasks past due date | Check overdue KPI card | Red count displayed; clicking reveals overdue task list |
| FE-DASH-003 | Blocked tasks visible | Tasks with health_state="Blocked" | Check blocked card | Purple count displayed |
| FE-DASH-004 | At-risk tasks (Yellow health) | Tasks with health_state="Yellow" | Check dashboard | Yellow/warning indicators shown |
| FE-DASH-005 | Client filter | Multiple clients | Select a client filter dropdown | KPIs and task lists update for that client only |
| FE-DASH-006 | Empty state | No tasks | View dashboard | Appropriate empty state message displayed |

---

## 27. Frontend UI Tests -- Tasks Page

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| FE-TASK-001 | Task tree view renders | Hierarchical tasks exist | Navigate to Tasks, select tree view | Parent/child relationships displayed as collapsible tree |
| FE-TASK-002 | Board (Kanban) view | Tasks with varied statuses | Select board view | Columns for each status; tasks as cards |
| FE-TASK-003 | Gantt view renders | Tasks with start/end dates | Select Gantt view | Timeline visualisation with task bars |
| FE-TASK-004 | Calendar view | Tasks with due dates | Select calendar view | Calendar grid with tasks on their due dates |
| FE-TASK-005 | Create task via modal | Tasks page | Click "Add Task" button; fill form; submit | Task appears in list; toast confirms creation |
| FE-TASK-006 | Edit task inline | Task exists | Click task title to open detail; modify fields; save | Changes persisted; updated_at bumped |
| FE-TASK-007 | Delete task (admin) | Admin, task exists | Open task menu; click Delete; confirm | Task removed from list |
| FE-TASK-008 | Assign team members | Task exists | Open task; add assignee from dropdown | Assignees array updated |
| FE-TASK-009 | Set dependencies | Multiple tasks | Edit task; add dependency | Dependencies field updated |
| FE-TASK-010 | Filter by status | Tasks with mixed statuses | Use status filter dropdown | Only matching tasks displayed |
| FE-TASK-011 | Filter by client | Tasks for multiple clients | Use client filter dropdown | Only selected client's tasks |
| FE-TASK-012 | Search tasks | Tasks with varied titles | Type in search box | List filtered in real-time |
| FE-TASK-013 | Bulk import | CSV/XLSX in Downloads | Use import wizard; select file; map columns; confirm | Tasks created; progress shown |
| FE-TASK-014 | Template creation | Tasks exist | Select tasks; save as template | Template saved; appears in template list |
| FE-TASK-015 | Template instantiation | Template exists | Select template; click Create Tasks | Tasks generated from template structure |
| FE-TASK-016 | Task comments | Task exists | Open task; add comment; verify displayed | Comment shows with author and timestamp |

---

## 28. Frontend UI Tests -- People and Workload Page

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| FE-PPL-001 | Team members list | Users exist | Navigate to People | List of team members with display names |
| FE-PPL-002 | Workload/capacity view | Users assigned to tasks | View workload section | Per-user committed hours vs capacity per week |
| FE-PPL-003 | Utilisation percentage | Tasks assigned | Check utilisation column | Correct percentage: committed / capacity * 100 |
| FE-PPL-004 | Over-allocated warning | User over capacity | Check utilisation | Red/warning indicator for > 100% |
| FE-PPL-005 | Resource type skills | User has skills set | View user details | Resource type tags displayed |

---

## 29. Frontend UI Tests -- Leads CRM Page

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| FE-LEAD-001 | Pipeline board renders | Leads across stages | Navigate to Leads | Columns for each pipeline stage with lead cards |
| FE-LEAD-002 | Create new lead | Pipeline stages configured | Click "Add Lead"; fill form | Lead created; appears in correct stage column |
| FE-LEAD-003 | Edit lead detail | Lead exists | Click lead card; modify fields | Changes persisted |
| FE-LEAD-004 | Drag lead to new stage | Lead exists on board | Drag card from one stage to another | Stage updated; activity log entry created |
| FE-LEAD-005 | Pipeline value totals | Leads with ROM values | Check stage column headers | Shows total ROM and weighted value per stage |
| FE-LEAD-006 | Follow-up reminders | Leads with overdue follow-ups | Check reminders section | Overdue follow-ups highlighted |
| FE-LEAD-007 | Activity timeline | Lead with activities | Open lead detail | Activity entries displayed chronologically |
| FE-LEAD-008 | Resource requirements | Lead exists | Edit resources section | Resource types and quantities saved |
| FE-LEAD-009 | Search leads | Various leads | Use search input | Filtered by title, client, location, owner |
| FE-LEAD-010 | Pipeline forecast chart | Leads with close dates | View forecast section | Monthly revenue projections displayed |

---

## 30. Frontend UI Tests -- Expenses Page

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| FE-EXP-001 | Expense list renders | Expenses exist | Navigate to Expenses | Table with date, description, amount, status, receipt indicator |
| FE-EXP-002 | Create expense manually | On expenses page | Click "Add Expense"; fill form | Expense created with status "pending" |
| FE-EXP-003 | Create from receipt upload | On expenses page | Click "Upload Receipt"; select image/PDF | Expense auto-created with OCR-extracted data; fields pre-filled |
| FE-EXP-004 | Edit expense fields | Pending expense exists | Click expense; modify amount/description | Changes saved |
| FE-EXP-005 | Upload receipt to existing expense | Expense exists | In expense detail, upload receipt | Receipt appears in attachments list |
| FE-EXP-006 | Create expense report | Unreported expenses exist | Click "New Report"; select expenses | Report created as draft with selected expenses |
| FE-EXP-007 | Expense report full-screen view | Report exists | Open report | Full-screen display with expense table, totals by currency, receipt thumbnails |
| FE-EXP-008 | Submit expense report | Draft report with expenses | Click "Submit for Review" | Status changes to submitted; confirmation toast |
| FE-EXP-009 | Approve expense report (admin/Tom) | Submitted report | Click "Approve" | Status becomes approved; expenses individually approved |
| FE-EXP-010 | Reject expense report (admin/Tom) | Submitted report | Click "Reject"; add review notes | Status becomes rejected; expenses reset to pending |
| FE-EXP-011 | Export report as ZIP | Report exists | Click "Export" | Browser downloads ZIP containing CSV and receipt files |
| FE-EXP-012 | Email notification on submit | SMTP configured | Submit report | Email sent to expense approver |
| FE-EXP-013 | Category filter | Expenses with categories | Use category filter | List filtered by selected category |
| FE-EXP-014 | Date range filter | Expenses across dates | Set from/to dates | Only expenses in range displayed |

---

## 31. Frontend UI Tests -- Finances Page

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| FE-FIN-001 | P&L view renders | Finance data saved | Navigate to Finances | P&L table with revenue, payroll, opex rows; totals computed |
| FE-FIN-002 | Monthly view with actuals vs forecast | Finance data with both | Select monthly view | Side-by-side actuals and forecast columns; variance highlighted |
| FE-FIN-003 | Revenue breakdown | Revenue line items | Expand revenue section | Individual revenue items displayed |
| FE-FIN-004 | Payroll data | Payroll entries | View payroll section | Employee/contractor payroll totals |
| FE-FIN-005 | OpEx categories | Operating expenses | View opex section | Categorised operating expenses |
| FE-FIN-006 | Pipeline revenue | Leads with weighted values | View pipeline section | Projected revenue from pipeline |
| FE-FIN-007 | Edit finance data | Admin session | Modify values; save | Finance data persisted via PUT /api/finance |
| FE-FIN-008 | Finance data versioning | Multiple saves | Check that old versions exist | Append-only model preserves history |

---

## 32. Frontend UI Tests -- Settings Page

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| FE-SET-001 | User management table | Admin session | Navigate to Settings | Table of all users with username, role, email |
| FE-SET-002 | Create new user | Admin session | Click "Add User"; fill form | User created; appears in table |
| FE-SET-003 | Change user role | Admin session | Edit user; change role dropdown | Role updated |
| FE-SET-004 | Reset user password | Admin session | Click reset for a user; enter new password | Password updated |
| FE-SET-005 | Delete user | Admin session | Click delete for a user; confirm | User removed from table |
| FE-SET-006 | RBAC page access | Admin session | Configure page access per role | Settings saved; non-admin users see restricted pages |
| FE-SET-007 | Non-admin cannot access admin settings | User session | Navigate to Settings | Admin-only sections hidden or access denied |

---

## 33. Frontend UI Tests -- Notifications

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| FE-NOTIF-001 | Bell icon with unread count | Unread notifications exist | Check header | Bell icon shows count badge |
| FE-NOTIF-002 | Notification dropdown | Click bell icon | Click notification bell | Dropdown displays recent notifications |
| FE-NOTIF-003 | Dismiss notification | Dismissable notification | Click dismiss/mark-read | Notification removed from list; unread count decremented |
| FE-NOTIF-004 | Non-dismissable notification persists | Expense reminder (non-dismissable) | Try to dismiss | Cannot be dismissed; stays visible |
| FE-NOTIF-005 | Clicking notification navigates | Notification with link | Click notification body | Navigates to the linked page/section |
| FE-NOTIF-006 | Expense reminder auto-created | 25th of month (cron) | Check notifications on/after 25th | Non-dismissable expense reminder visible |

---

## 34. Frontend UI Tests -- Theming and Layout

| ID | Description | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| FE-THEME-001 | Default dark theme | Fresh load | Check page | Dark theme CSS variables applied |
| FE-THEME-002 | Switch to light theme | Logged in | Open theme picker; select Light | All CSS custom properties update; background becomes light |
| FE-THEME-003 | Switch to Midnight | Logged in | Select Midnight | Deep blue palette applied |
| FE-THEME-004 | Switch to Nord | Logged in | Select Nord | Nord palette applied; font changes to system-ui |
| FE-THEME-005 | Switch to Solarized | Logged in | Select Solarized | Warm Solarized palette; serif fonts |
| FE-THEME-006 | Switch to Dracula | Logged in | Select Dracula | Purple accent Dracula palette |
| FE-THEME-007 | Switch to Emerald | Logged in | Select Emerald | Green-tinted palette |
| FE-THEME-008 | Theme persists on refresh | Theme selected | Refresh page | Same theme remains |
| FE-THEME-009 | Sidebar navigation | Logged in | Click each sidebar item | Correct page rendered for each |
| FE-THEME-010 | Responsive sidebar collapse | Narrow viewport | Resize window below breakpoint | Sidebar collapses or becomes hidden |
| FE-THEME-011 | Scrollbar styling | Any theme | View scrollable content | Custom scrollbar styles applied |

---

## 35. Integration Test Scenarios

| ID | Description | Steps | Expected Result |
|---|---|---|---|
| INT-001 | Full task lifecycle | Login -> create task -> assign -> log time -> update status -> add comment -> add attachment -> mark done -> delete | Each step succeeds; audit trail records all actions |
| INT-002 | Expense report lifecycle | Login -> create expense -> upload receipt -> create report -> add expense to report -> submit -> approver approves -> export ZIP | Complete flow succeeds; notifications sent; status transitions correct |
| INT-003 | Lead pipeline progression | Create lead -> log activity -> update stage -> update ROM -> check pipeline summary -> check forecast | Lead progresses through stages; activity log grows; summary reflects changes |
| INT-004 | Multi-user sync | User A creates task -> User B polls for changes -> User B sees new task | Incremental sync delivers changes within poll interval |
| INT-005 | Conflict resolution on sync | User A and B edit same task simultaneously -> B submits via sync with old `_serverUpdatedAt` | B's update skipped due to conflict; A's changes preserved |
| INT-006 | Bulk import to task tree | Upload Planner XLSX -> parse -> preview -> confirm import | Tasks created with correct parent-child hierarchy and field mappings |
| INT-007 | Client report generation | Create client -> add tasks -> generate report -> access via share URL | Public HTML/PDF report accessible without auth; data accurate |
| INT-008 | Password reset end-to-end | Request forgot-password -> extract token from DB/email -> POST new password -> login with new password | Full reset flow works; old sessions invalidated |
| INT-009 | Account lockout and recovery | Fail login 10 times -> get locked out -> wait 15 min -> login successfully | Lockout enforced and auto-expires |
| INT-010 | Backup and restore round-trip | Export backup -> modify data -> restore backup -> verify data matches original | Data restored identically; new data rolled back |
| INT-011 | Template create and instantiate | Create tasks -> save as template -> instantiate template elsewhere -> verify structure | Task tree recreated from template with correct hierarchy |
| INT-012 | Finance data save and retrieve | PUT finance data -> GET finance -> verify identical | Data round-trips correctly through JSON serialisation |
| INT-013 | Receipt OCR to expense | Upload receipt image -> OCR extracts date/amount/vendor -> verify pre-filled values -> adjust and save | Extracted values reasonable; manual corrections persist |
| INT-014 | Resource planning accuracy | Set user capacity -> assign tasks with estimated hours -> check capacity endpoint | Committed hours and utilisation percentages accurate |

---

## 36. Security Test Cases

| ID | Description | Steps | Expected Result |
|---|---|---|---|
| SEC-001 | Unauthenticated API access | Call any protected endpoint without Authorization header | 401 response |
| SEC-002 | Expired session token | Use a token past its `expires_at` | 401; `{ error: "Session expired" }` |
| SEC-003 | Invalid/malformed token | Use a random string as Bearer token | 401 |
| SEC-004 | RBAC: admin-only endpoints | Non-admin calls POST /api/users, DELETE /api/tasks/:id, etc. | 403 for each admin-only endpoint |
| SEC-005 | Cannot view others' expenses | Non-admin user tries GET /api/expenses/<other_user_expense_id> | 403 |
| SEC-006 | Cannot edit others' expenses | Non-admin, non-owner PATCH on expense | 403 |
| SEC-007 | Path traversal on file download | GET `/api/attachments/../../server.js` | 400 or 403; file not served |
| SEC-008 | Path traversal on import parse | POST parse-file with `{ filename: "../../server.js" }` | 400; `{ error: "Invalid path" }` |
| SEC-009 | XSS prevention in HTML report | Create client with `<script>alert(1)</script>` in name -> generate report -> view HTML | Script tag is escaped; no execution |
| SEC-010 | Security headers present | Any API response | Check headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy`, `Permissions-Policy` |
| SEC-011 | X-Powered-By disabled | Any response | `X-Powered-By` header absent |
| SEC-012 | Cache-Control on API responses | Any /api/ response | `Cache-Control: no-store, no-cache, must-revalidate, private` |
| SEC-013 | SQL injection resistance | POST /api/auth/login with `{ username: "'; DROP TABLE users;--", password: "x" }` | Parameterised queries prevent injection; login simply fails |
| SEC-014 | Password hashing | Check DB after user creation | `password_hash` is bcrypt hash (starts with `$2b$`); never stores plaintext |
| SEC-015 | Session token entropy | Generate multiple tokens | Each is 64 hex chars from `crypto.randomBytes(32)` |
| SEC-016 | Username enumeration prevention | Forgot-password with unknown username vs known username | Identical response and similar timing for both |
| SEC-017 | File upload size limit | Upload > 25MB file | 413 or 400; upload rejected by multer |
| SEC-018 | File upload stores safely | Upload file with dangerous name `../../evil.js` | File stored with timestamped random name; original name kept only in DB |
| SEC-019 | Self-deletion prevention | Admin calls DELETE /api/users/<own_id> | 400; `{ error: "Cannot delete yourself" }` |
| SEC-020 | Password minimum length enforced | Reset/change password with < 8 chars | 400; validation error |
| SEC-021 | Reset token single-use | Use a reset token twice | Second attempt returns 400; token marked as used |
| SEC-022 | All sessions invalidated on password reset | User has multiple active sessions | After password reset, all sessions deleted from DB |
| SEC-023 | JSON body size limit | POST extremely large JSON (> 10MB) | 413; rejected by express.json limit |
| SEC-024 | CORS not overly permissive | Check for Access-Control-Allow-Origin | Verify not set to `*` (server does not appear to set CORS headers explicitly) |
| SEC-025 | Frontend XSS via esc() function | Enter `<img onerror=alert(1) src=x>` in task title | Rendered as escaped text, not HTML |
| SEC-026 | Public report endpoints require no auth but valid token | Access /api/reports/<token> with invalid token | 404; not 200 or 500 |
| SEC-027 | Expired report returns 410 | Access report past expiry | 410; "Report expired" |

---

## 37. Performance Test Cases

| ID | Description | Steps | Expected Result |
|---|---|---|---|
| PERF-001 | Login response time | POST /api/auth/login 100 times | p95 response time < 500ms (bcrypt is CPU-bound) |
| PERF-002 | Task list with 1000 tasks | Seed 1000 tasks | GET /api/tasks responds in < 2 seconds |
| PERF-003 | Dashboard summary with 5000 tasks | Seed 5000 tasks | GET /api/dashboard/summary responds in < 3 seconds |
| PERF-004 | Leads list with pagination | 500 leads | GET /api/leads?limit=50 responds in < 1 second |
| PERF-005 | Sync poll performance | 10,000 tasks, poll with recent timestamp | GET /api/sync/poll?since=<recent> < 2 seconds |
| PERF-006 | Full data load | Large dataset | GET /api/sync/load < 5 seconds |
| PERF-007 | Concurrent users | 20 simultaneous users making various requests | No 500 errors; connection pool handles load (max: 20 connections) |
| PERF-008 | File upload throughput | Upload 25MB file | Completes within 30 seconds on local network |
| PERF-009 | Expense report ZIP export | Report with 50 expenses and receipts | ZIP generated and streamed within 10 seconds |
| PERF-010 | OCR receipt processing | Upload receipt image for OCR | Response within 120 seconds (extended timeout) |
| PERF-011 | Token cache effectiveness | 100 sequential authenticated requests | Majority served from cache (< 5 DB queries) |
| PERF-012 | Gzip compression | Fetch large API response | Response is gzip-compressed (Content-Encoding: gzip) for responses > 1KB |
| PERF-013 | Connection pool resilience | Kill and restart PostgreSQL | Pool reconnects automatically; requests recover after brief errors |
| PERF-014 | Audit log pagination with large dataset | 10,000 audit entries | GET /api/audit-log?limit=50 responds in < 1 second |
| PERF-015 | Frontend initial load | Cold browser cache | Dashboard HTML + all inline assets load in < 3 seconds on broadband |
| PERF-016 | Frontend 10-second polling | Leave dashboard open 10 minutes | Sync poll runs every 10 seconds without memory leaks or UI jank |

---

## 38. Edge Cases and Boundary Conditions

| ID | Description | Steps | Expected Result |
|---|---|---|---|
| EDGE-001 | Empty string title | POST task with `{ title: "" }` | 400; title is required |
| EDGE-002 | Very long task title | Title with 10,000 characters | Task created (PostgreSQL TEXT type has no length limit); UI truncates display |
| EDGE-003 | Unicode in all text fields | Create task/client/lead with emoji and CJK characters | Stored and retrieved correctly |
| EDGE-004 | Zero hours estimated | POST task with `hours_estimated: 0` | Accepted; no division-by-zero errors in utilisation calculations |
| EDGE-005 | Negative hours estimated | POST task with `hours_estimated: -5` | Stored (no validation); frontend may display oddly |
| EDGE-006 | Null parent_id | Create task without parent_id | `parent_id: null`; task appears as top-level |
| EDGE-007 | Circular parent reference | PATCH task to set parent_id to itself | No server-side check; could cause infinite loops in frontend tree rendering |
| EDGE-008 | Deeply nested task tree | Create 50-level deep hierarchy | Frontend renders without crash; may have performance impact |
| EDGE-009 | Date in distant past | Create task with `due_date: "1900-01-01"` | Accepted; shown as extremely overdue |
| EDGE-010 | Date in distant future | Create task with `due_date: "2099-12-31"` | Accepted; no issues |
| EDGE-011 | Invalid date format | POST with `due_date: "not-a-date"` | Stored as string; may cause display issues |
| EDGE-012 | Empty assignees array | PATCH with `assignees: []` | Accepted; task has no assignees |
| EDGE-013 | Duplicate assignees | PATCH with `assignees: ["Glen", "Glen"]` | Stored; may cause double-counting in workload |
| EDGE-014 | Very large expense amount | POST expense with `amount: 9999999.99` | Accepted; ensure no overflow in NUMERIC column |
| EDGE-015 | Expense amount with many decimals | POST with `amount: 10.999` | Stored as-is or rounded; check display consistency |
| EDGE-016 | Concurrent task updates | Two users PATCH same task simultaneously | Both succeed; last write wins (no explicit locking) |
| EDGE-017 | Deleted parent during child creation | Delete parent task while POST child is in-flight | Foreign key may fail; error handled gracefully |
| EDGE-018 | Upload file with no extension | POST file without `.ext` | Multer creates filename with no extension; download works |
| EDGE-019 | Empty CSV import | CSV with only headers, no data rows | 400; "Empty CSV" |
| EDGE-020 | Single-row CSV | CSV with headers and one data row | 200; one task mapped |
| EDGE-021 | Excel file with empty sheet | XLSX where first sheet has no data | 400; "Empty spreadsheet" |
| EDGE-022 | Backup restore with no tables | POST restore with `backup: { tables: {} }` | 200; nothing imported (empty but valid) |
| EDGE-023 | Null expense category_id | POST expense without category_id | Accepted; category_name shows as null |
| EDGE-024 | Session cleanup interval | Wait 10+ minutes with expired tokens | Stale tokens and failed login records cleaned from memory |
| EDGE-025 | Multiple expense currencies in one report | Report with GBP and USD expenses | Export CSV shows correct per-row currency; totals grouped by currency |
| EDGE-026 | Lead with all nullable fields null | Create lead with only title and stage | Accepted; all optional fields are null |
| EDGE-027 | Expense report with zero-amount expenses | Add expenses with amount=0 | Total shows 0; export CSV includes them |
| EDGE-028 | Very long description in OCR | Receipt with 5000+ chars of text | `rawText` truncated to 500 chars in response; full text processed internally |
| EDGE-029 | Pipeline summary with no leads | Empty leads table | Returns stages with zero counts |
| EDGE-030 | Graceful shutdown during request | Send SIGTERM while request is in-flight | Server drains current requests; shuts down within 10 seconds |
| EDGE-031 | Database connection failure | PostgreSQL unavailable | Health check returns 500; API endpoints return 500 with error messages |
| EDGE-032 | Token cache TTL expiry | Use token after 5 minutes | Cache miss; falls through to DB query; still works if session valid |

---

## 39. Cross-Browser Considerations

| ID | Aspect | Browsers | Notes |
|---|---|---|---|
| CB-001 | Core functionality | Chrome 100+, Firefox 100+, Safari 16+, Edge 100+ | All CRUD operations, navigation, login/logout must work |
| CB-002 | CSS custom properties | All modern browsers | CSS variables for theming are well supported; verify all 7 themes render correctly |
| CB-003 | Flexbox and Grid layouts | All modern browsers | KPI grid, sidebar, task board use CSS Grid and Flexbox |
| CB-004 | JavaScript ES2020+ features | Chrome/Edge/Firefox/Safari | Code uses `?.` optional chaining, `??` nullish coalescing, `async/await` |
| CB-005 | `crypto.randomUUID()` | Chrome 92+, Firefox 95+, Safari 15.4+ | May be used in frontend for temp IDs; polyfill if needed |
| CB-006 | `localStorage` | All modern browsers | Session token and theme preference storage |
| CB-007 | `fetch` API | All modern browsers | All API calls use fetch |
| CB-008 | File upload (FormData) | All modern browsers | Expense receipt upload, task attachment upload |
| CB-009 | CSS `dvh` unit | Chrome 108+, Firefox 108+, Safari 15.4+ | Used in `min-height: 100dvh` on body |
| CB-010 | Scrollbar styling | Chrome/Edge (WebKit), Firefox (limited) | `::-webkit-scrollbar` styles; Firefox uses `scrollbar-width` and `scrollbar-color` |
| CB-011 | `@font-face` loading | All modern browsers | Google Fonts (Orbitron, Inter, JetBrains Mono); verify fonts load and fall back gracefully |
| CB-012 | PDF generation (server-side) | N/A (server) | PDFKit generates PDFs server-side; browser renders the download |
| CB-013 | Responsive layout | Mobile Safari, Chrome Android | Sidebar collapse, KPI grid reflow at 600px breakpoint |
| CB-014 | Touch interactions | Mobile browsers | Drag-and-drop on Kanban board may not work on touch; verify touch alternatives |
| CB-015 | Print styles | All browsers | Verify print layout if client reports are printed from browser |

---

## Appendix: Test ID Summary

| Area | ID Range | Count |
|---|---|---|
| Authentication | AUTH-001 to AUTH-073 | ~35 |
| User Management | USER-001 to USER-041 | ~15 |
| Tasks | TASK-001 to TASK-053 | ~25 |
| Comments and Notes | COMM-001 to NOTE-003 | ~10 |
| Attachments | ATT-001 to ATT-024 | ~15 |
| Templates | TMPL-001 to TMPL-007 | 7 |
| Time Tracking | TIME-001 to TIME-010 | 10 |
| Clients | CLT-001 to CLT-009 | 9 |
| Contacts and Notes | CON-001 to CNOTE-007 | ~12 |
| Leads CRM | LEAD-001 to LEAD-062 | ~40 |
| Expenses | EXP-001 to EXP-054 | ~35 |
| Expense Reports | ERPT-001 to ERPT-024 | 24 |
| Finance | FIN-001 to FIN-008 | 8 |
| Notifications | NOTIF-001 to NOTIF-005 | 5 |
| Settings | SET-001 to SET-005 | 5 |
| Dashboard | DASH-001 to DASH-004 | 4 |
| Sync | SYNC-001 to SYNC-010 | 10 |
| Import | IMP-001 to IMP-012 | 12 |
| Backup/Restore | BKP-001 to BKP-007 | 7 |
| Reports | RPT-001 to RPT-009 | 9 |
| Resource Planning | RSRC-001 to RSRC-004 | 4 |
| Bug Reports | BUG-001 to BUG-013 | 13 |
| Audit Log | AUD-001 to AUD-006 | 6 |
| Frontend Auth | FE-AUTH-001 to FE-AUTH-008 | 8 |
| Frontend Dashboard | FE-DASH-001 to FE-DASH-006 | 6 |
| Frontend Tasks | FE-TASK-001 to FE-TASK-016 | 16 |
| Frontend People | FE-PPL-001 to FE-PPL-005 | 5 |
| Frontend Leads | FE-LEAD-001 to FE-LEAD-010 | 10 |
| Frontend Expenses | FE-EXP-001 to FE-EXP-014 | 14 |
| Frontend Finances | FE-FIN-001 to FE-FIN-008 | 8 |
| Frontend Settings | FE-SET-001 to FE-SET-007 | 7 |
| Frontend Notifications | FE-NOTIF-001 to FE-NOTIF-006 | 6 |
| Frontend Theming | FE-THEME-001 to FE-THEME-011 | 11 |
| Integration | INT-001 to INT-014 | 14 |
| Security | SEC-001 to SEC-027 | 27 |
| Performance | PERF-001 to PERF-016 | 16 |
| Edge Cases | EDGE-001 to EDGE-032 | 32 |
| Cross-Browser | CB-001 to CB-015 | 15 |
| **TOTAL** | | **~540** |
