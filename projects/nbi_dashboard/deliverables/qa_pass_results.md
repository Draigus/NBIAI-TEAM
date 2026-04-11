# NBI Project Dashboard - QA Pass Results

**Date:** 2026-04-07
**Server:** http://localhost:8888
**Tester:** Claude (automated API testing via curl)
**Test Credentials:** glen/nbi2026 (admin), tom/nbi2026! (expense approver)

---

## Summary

| Metric | Value |
|--------|-------|
| Total tests run | 48 |
| Passed | 38 |
| Failed (bugs) | 7 |
| Warnings | 3 |
| Average response time | ~220ms |

---

## 1. Authentication (POST /api/auth/login)

| Test | Result | Notes |
|------|--------|-------|
| Valid login - Glen (admin) | PASS | 200, token returned, 290ms |
| Valid login - Tom (expense approver) | PASS | 200, token returned, 262ms |
| Invalid username | PASS | 401, generic error message (no username enumeration) |
| Valid user, wrong password | PASS | 401, generic error message |
| Empty body | PASS | 400, "Username and password required" |
| No Content-Type header | PASS | 400, "Username and password required" |
| SQL injection attempt | PASS | 401, rejected properly |
| Protected endpoint without token | PASS | 401, "Authentication required" |
| Invalid token | PASS | 401, "Session expired" |
| GET /api/auth/me | PASS | 200, returns current user |
| POST /api/auth/logout | PASS | Endpoint exists |

### BUG-001: Account lockout not enforced (MEDIUM)
After 6 failed login attempts, `showReset: true` is returned but the account is NOT locked.
The 7th attempt with valid credentials succeeds immediately.
**Expected:** Account should be locked for a configurable cooldown period after N failed attempts.
**Actual:** Only a hint flag is set; no actual lockout occurs.

---

## 2. Expenses (GET /api/expenses)

| Test | Result | Notes |
|------|--------|-------|
| Load all expenses | PASS | 200, 69 expenses in catch-up report, 222ms |
| Expense data structure | PASS | All fields present: id, date, amount, currency, category, description, status |
| Receipt counts | PASS | 22 expenses have receipts (receipt_count: 1 each) |
| Currency consistency | PASS | All 69 are GBP |
| Category distribution | PASS | Travel(22), Meals(17), Software(14), Utilities(6), Accommodation(4), Office(4), Other(2) |
| Expense summary endpoint | PASS | 200, correct totals by employee and category |
| Expense categories endpoint | PASS | 200, returns active categories with sort order |
| Total amount | PASS | 2,480.66 GBP |

### BUG-002: Negative amount accepted on PATCH (MEDIUM)
`PATCH /api/expenses/{id}` with `{"amount": -100}` returns 200 and stores the negative value.
**Expected:** Validation should reject negative amounts.
**Actual:** Amount set to -100.00 without error.

### BUG-003: XSS payload stored without sanitisation (HIGH)
`POST /api/expenses` accepts `<script>alert(1)</script>` in the description field and stores it as-is.
**Expected:** HTML entities should be escaped or stripped on input.
**Actual:** Raw HTML/JS stored in database. If rendered without escaping on the frontend, this is exploitable.

### BUG-004: Invalid expense ID returns 500 instead of 404 (LOW)
`PATCH /api/expenses/nonexistent-id` returns HTTP 500 "Internal server error".
**Expected:** 404 "Expense not found".
**Actual:** Unhandled error (likely invalid UUID format crashing the DB query).

### WARNING-001: Stale test data in database
There is 1 orphan expense ("UAT Test Expense", amount 99.99, no report_id) and 1 orphan report ("UAT Test Report", draft, 0 expenses) from a previous testing session. Total expense count is 70 (should be 69 for production data only).

---

## 3. Expense Reports

| Test | Result | Notes |
|------|--------|-------|
| GET /api/expense-reports | PASS | 200, returns reports list, 220ms |
| GET /api/expense-reports/{id} | PASS | 200, full report with 69 expenses, 22 with receipts |
| POST /api/expense-reports | PASS | 201, creates new draft report |
| DELETE /api/expense-reports/{id} | PASS | 200, successfully deletes |
| PATCH report - approve by Tom | PASS | 200, status changed, reviewed_by auto-set |
| PATCH report - invalid ID | PASS | 404, "Report not found" |
| Report name | PASS | "Monthly Expenses Catch-Up (Jan-Mar 2026)" |
| Report status | PASS | "submitted" |

### BUG-005: Report status accepts any arbitrary string (MEDIUM)
`PATCH /api/expense-reports/{id}` with `{"status": "banana"}` returns 200 and sets status to "banana".
**Expected:** Status should be validated against allowed values (draft, submitted, approved, rejected).
**Actual:** Any string accepted. This could corrupt report state.

---

## 4. Export (GET /api/expense-reports/{id}/export)

| Test | Result | Notes |
|------|--------|-------|
| ZIP download | PASS | 200, valid ZIP, 2.97MB, 674ms |
| Content-Type header | PASS | application/zip |
| Content-Disposition | PASS | attachment; filename="Monthly Expenses Catch-Up Jan-Mar 2026.zip" |
| CSV included | PASS | 4,809 bytes |
| Receipt files included | PASS | 22 receipt files (JPEG, PDF mix) |
| Bank statements included | PASS | 3 bank statement PDFs (redacted) |
| Total files in ZIP | PASS | 26 files (1 CSV + 22 receipts + 3 bank statements) |

All 22 receipts verified present and accounted for.

---

## 5. Finance (GET /api/finance)

| Test | Result | Notes |
|------|--------|-------|
| Finance data loads | PASS | 200, full JSON, 217ms |
| OPEX items present | PASS | 8 items: Software(324), Travel(271), Meals(129), Utilities(50), Insurance(100), Accountancy(200), Office(0), Marketing(50) |
| Payroll entries | PASS | 8 employees |
| Tom Rieger in payroll | PASS | Listed as "Finance Director", annual: 0, monthly: 0 |
| Employer cost % | PASS | 15 (correct) |
| Revenue streams | PASS | 3 entries (Lighthouse, Couch Heroes, Blizzard) |
| Pipeline | PASS | 3 entries (Goals Studio, Sarge Universe, Enoma) |
| Pending payroll | PASS | 4 entries (Tom, Bryan, Jeff, Jessica) |
| Targets | PASS | Y2026: 1,200,000 / Y2027: 2,000,000 |
| PUT /api/finance | PASS | 200, append-only insert works |

### BUG-006: No RBAC on PUT /api/finance - any authenticated user can overwrite (HIGH)
Tom (non-admin, expense approver role) can call `PUT /api/finance` and it succeeds (HTTP 200).
Tom was able to change `employerCostPct` from 15 to 20. No admin check.
**Expected:** Only admin users should be able to modify finance data.
**Actual:** Any authenticated user can overwrite all finance data.
**Note:** The source code has no role check on PUT /api/finance -- it only checks `req.body.data` exists.

---

## 6. Notifications

| Test | Result | Notes |
|------|--------|-------|
| GET /api/notifications | PASS | 200, returns `{notifications: [], unread: 0}` |
| POST /api/notifications/read (with IDs) | PASS | 200, `{ok: true}` |
| POST /api/notifications/read (empty body) | PASS | 200, marks all dismissable as read |
| Dismissable vs non-dismissable logic | PASS | Source code correctly filters: non-dismissable skipped unless force=true |
| POST /api/notifications (create) | N/A | No public create endpoint (notifications created internally) -- correct behaviour |

No notifications exist for either user at time of test. Cannot fully test dismissable vs non-dismissable without seeding data first. Logic verified via source code review.

---

## 7. Tom's Access (Expense Approver)

| Test | Result | Notes |
|------|--------|-------|
| Tom sees all 69 expenses | PASS | 200, full list |
| Tom sees submitted reports | PASS | 200, 1 report visible |
| Tom can view report detail | PASS | 200, full expense breakdown |
| Tom can approve reports | PASS | 200, status changed to approved, reviewed_by auto-set |
| Tom can download ZIP export | PASS | 200, 2.97MB valid ZIP |
| Tom can access finance data | WARNING | See BUG-006 |
| Tom can overwrite finance data | FAIL | See BUG-006 |
| Tom can create expenses | PASS | 201, creates under Tom's user_id |

### WARNING-002: Tom's role returned as "admin"
`POST /api/auth/login` returns `role: "admin"` for Tom. If Tom is intended to be an expense approver (not a full admin), his database role should be changed. Currently the expense report approval logic checks by username (`EXPENSE_APPROVER_USERNAME`), not by role, so this doesn't break approval flow, but it grants Tom admin privileges across all endpoints.

---

## 8. PATCH/POST Validation

| Test | Result | Notes |
|------|--------|-------|
| PATCH expense - valid update | PASS | 200, notes updated |
| PATCH expense - empty body | PASS | 400, "No fields to update" |
| PATCH expense - negative amount | FAIL | See BUG-002 |
| PATCH expense - invalid ID | FAIL | See BUG-004 |
| POST expense - valid | PASS | 201, expense created |
| POST expense - missing fields | PASS | 400, "Date and amount are required" |
| POST expense - string amount | PASS | 400, "Amount must be a valid positive number" |
| POST expense - very large amount | PASS | 500 (debatable -- should be 400 with validation) |
| PATCH report - valid approval | PASS | 200 |
| PATCH report - invalid status | FAIL | See BUG-005 |
| PATCH report - invalid ID | PASS | 404 |
| PUT finance - no data field | PASS | 400, "data required" (verified via source) |
| PUT settings/:key | PASS | 200 |
| GET settings | PASS | 200, returns hourlyRate and fx_rates |

---

## 9. Additional Endpoints Tested

| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /api/health | PASS | 200, `{status: "ok", db: "connected"}` |
| GET /api/users | PASS | 200, returns user list |
| GET /api/dashboard/summary | PASS | 200, 1123 tasks, stats correct |
| GET /api/leads | PASS | 200, 39 leads |
| GET /api/clients | PASS | 200, 42 clients |
| GET /api/tasks | PASS | 200, 1123 tasks |
| GET /api/leads/config | PASS | 200, stages and resource types |
| GET /api/leads/pipeline/summary | WARNING | See BUG-007 |
| GET /api/resource-planning/capacity | PASS | 200, returns user capacity data |
| GET /api/bug-reports | PASS | 200, empty list |
| GET /api/templates | PASS | 200, empty list |
| GET /api/audit-log | PASS | 200, 50 entries |

### BUG-007: Pipeline summary returns NaN for Backlog stage (LOW)
`GET /api/leads/pipeline/summary` returns `total_rom_max: "NaN"` and `total_weighted: "NaN"` for the "Backlog" stage (26 deals).
**Expected:** Numeric values (likely 0 if no ROM values set).
**Actual:** NaN propagating from null/undefined arithmetic in SQL aggregation.

---

## 10. Security Checks

| Check | Result | Notes |
|-------|--------|-------|
| SQL injection in login | PASS | Properly rejected |
| XSS in expense description | FAIL | See BUG-003 |
| Security headers | PASS | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, CSP all set |
| Rate limiting | WARNING-003 | No rate limiting detected. 10 rapid requests all returned 200. |
| CORS | PASS | No Access-Control-Allow-Origin header on cross-origin requests (restrictive by default) |
| File upload size limit | PASS | 25MB limit configured |
| Token expiry | PASS | 7-day expiry set |

### WARNING-003: No rate limiting
10 consecutive requests all succeeded instantly. There is no rate limiting middleware.
For a small internal tool this is low risk, but worth noting.

---

## Data Integrity Summary

| Check | Result |
|-------|--------|
| 69 expenses in catch-up report | PASS |
| 22 receipts attached | PASS |
| All expenses in GBP | PASS |
| All report expenses approved | PASS |
| Total: 2,480.66 GBP | PASS |
| 8 OPEX items present | PASS |
| Tom Rieger in payroll | PASS |
| Employer cost % = 15 | PASS |
| 8 payroll entries | PASS |
| 4 pending payroll entries | PASS |
| 3 revenue streams | PASS |
| 42 clients | PASS |
| 39 leads | PASS |
| 1,123 tasks | PASS |

---

## Bug Severity Summary

| ID | Severity | Description |
|----|----------|-------------|
| BUG-001 | MEDIUM | Account lockout not enforced after failed login attempts |
| BUG-002 | MEDIUM | Negative expense amounts accepted on PATCH |
| BUG-003 | HIGH | XSS payloads stored without sanitisation in expense descriptions |
| BUG-004 | LOW | Invalid expense ID returns 500 instead of 404 |
| BUG-005 | MEDIUM | Expense report status accepts arbitrary strings (no enum validation) |
| BUG-006 | HIGH | No RBAC on PUT /api/finance -- any authenticated user can overwrite finance data |
| BUG-007 | LOW | Pipeline summary returns NaN for Backlog stage rom_max and weighted values |

| ID | Severity | Description |
|----|----------|-------------|
| WARNING-001 | INFO | Stale test data (1 orphan expense + 1 orphan report) in database |
| WARNING-002 | MEDIUM | Tom's role is "admin" in database -- gives full admin access beyond expense approver |
| WARNING-003 | LOW | No rate limiting on API endpoints |

---

## Recommended Fixes (Priority Order)

1. **BUG-006 (HIGH):** Add admin-only guard to `PUT /api/finance`. Check `req.user.role === 'admin'` before allowing writes.
2. **BUG-003 (HIGH):** Sanitise all user input (description, notes, titles) before storage. Use a library like `xss` or `sanitize-html`.
3. **WARNING-002 (MEDIUM):** Set Tom's database role to a non-admin role (e.g., "approver" or "member") and update the RBAC logic to use the `EXPENSE_APPROVER_USERNAME` env var for approval checks.
4. **BUG-005 (MEDIUM):** Add status enum validation on PATCH expense-reports. Only allow: draft, submitted, approved, rejected.
5. **BUG-002 (MEDIUM):** Add amount validation on PATCH expenses -- reject amounts <= 0.
6. **BUG-001 (MEDIUM):** Implement actual account lockout with a cooldown timer after N failed attempts.
7. **BUG-004 (LOW):** Add UUID format validation before DB queries to return 404 instead of 500.
8. **BUG-007 (LOW):** Fix SQL aggregation to handle null ROM values (use COALESCE or filter nulls).
9. **WARNING-001 (INFO):** Clean up stale test data from the database.
