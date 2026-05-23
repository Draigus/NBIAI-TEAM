# WorkSage Innovations — Design Spec

**Date:** 2026-05-23
**Branch:** feature/command-centre
**Approved:** Glen approved all 6 items in conversation ("Yep, do 1-6 of those in the right order")

---

## Item 1: Fix 4 CRITICAL Audit Findings

### 1a. Finance Server Migration

**Problem:** Finance data stored in localStorage only. Lost on browser clear. Not synced across devices.

**Solution:**
- Migration 054: `finance_data` table (id UUID PK, data JSONB NOT NULL, version INT DEFAULT 1, updated_by UUID REFERENCES users, updated_at TIMESTAMPTZ DEFAULT now())
- Route `routes/finance.js` already exists with GET/PUT endpoints — they read/write a `finance_data` table. Verify the table actually exists in migrations; if not, create it.
- Frontend: replace all localStorage finance reads/writes with authFetch calls to `/api/finance`
- One-time migration: on first load, if localStorage has finance data AND server has none, POST it to server, then clear localStorage

**Test:** Playwright test that saves finance data, reloads page, verifies data persists.

### 1b. Client Invite Password Display

**Problem:** Admin creates client user, server generates password, never returns it. User can't log in.

**Solution:**
- POST /api/users response: include `generated_password` field when a password was auto-generated
- Frontend: show the generated password in a copyable alert/modal after successful invite
- Only show once — don't store or log the password

**Test:** Playwright test that creates a user via admin, verifies password is displayed.

### 1c. Position Modal Focus Trap

**Problem:** Create Position modal lacks focus trap. Tab escapes to background.

**Solution:**
- Call `_activateDynamicModal()` (or equivalent focus trap function) after inserting the position modal DOM
- Ensure Escape closes the modal
- Ensure tab cycles within modal fields

**Test:** Covered by existing modal e2e patterns.

### 1d. Hardcoded Colours → Theme Tokens

**Problem:** 55 hardcoded colour values (`#888`, `#8b949e`, `#666`, etc.) bypass theme system.

**Solution:**
- Find-and-replace mapping:
  - `#888` / `#888888` → `var(--text-muted)`
  - `#8b949e` → `var(--text-secondary)`
  - `#666` / `#666666` → `var(--text-muted)`
  - `#aaa` / `#aaaaaa` → `var(--text-muted)`
  - `#ccc` / `#cccccc` → `var(--border-color)`
  - `#999` / `#999999` → `var(--text-secondary)`
  - `#f0f0f0` / `#f5f5f5` → `var(--bg-secondary)`
  - `#e0e0e0` → `var(--border-color)`
  - `#333` / `#333333` → `var(--text-primary)`
  - `#555` / `#555555` → `var(--text-secondary)`
- Only replace in inline styles and CSS, not in JS colour generation (e.g., candidateAvatarHtml hue array stays)
- Verify each theme (Dark, Light, Nord, Solarized) still looks correct

**Test:** Playwright screenshot comparison in light theme (existing warnings-light-theme spec covers this).

---

## Item 2: Auto-Generated Client Status Reports

**Problem:** Glen spends 30+ minutes per client assembling status before meetings.

**Solution:**
- New endpoint: GET /api/clients/:id/status-report — returns JSON with:
  - `completed_since` (tasks completed since a given date, default 7 days)
  - `overdue` (tasks past due date, not done)
  - `blocked` (tasks with status=blocked or health=blocked)
  - `in_progress` (active tasks with recent changes)
  - `upcoming_milestones` (milestones due in next 14 days)
  - `open_positions` (hiring positions for this client)
  - `pipeline_candidates` (candidate count by stage)
  - `open_bugs` (bugs assigned to this client)
- Frontend: "Generate Report" button on the client filter bar in Projects view
- Renders a styled report panel (or modal) with sections matching the JSON
- "Share" button uses existing POST /api/clients/:id/reports infrastructure to create a shareable link

**Test:** Unit test for the endpoint aggregation. Playwright test that generates a report for a client.

---

## Item 3: Client Health Score

**Problem:** No single-glance indicator of which client needs attention.

**Solution:**
- New endpoint: GET /api/dashboard/health-scores — returns per-client health score
- Scoring algorithm (0-100, maps to Red/Amber/Green):
  - Overdue ratio: (overdue tasks / total active tasks) × 30 points penalty
  - Blocked count: each blocked task = 5 points penalty
  - Stale tasks: tasks with no update in >7 days = 3 points penalty each (cap 15)
  - Days since last completion: >14 days = 10 points penalty
  - Unassigned tasks: each = 2 points penalty (cap 10)
  - Score = max(0, 100 - total_penalties)
  - Green ≥ 70, Amber 40-69, Red < 40
- Frontend: Add health score pill/badge next to each client name on Portfolio dashboard
- Click score → expand breakdown showing contributing factors

**Test:** Unit test for scoring algorithm. Playwright test that verifies scores render on portfolio.

---

## Item 4: Hiring-to-Onboarding Bridge

**Problem:** Candidate reaches "onboarded" stage but no tasks are created for the actual onboarding work.

**Solution:**
- `onboarding_checklist_items` table already exists — verify its schema
- When a candidate is moved to the onboarded stage (PATCH /api/hiring/candidates/:id with stage=onboarded), trigger onboarding task generation:
  - Read checklist template from `onboarding_checklist_items` WHERE client_id matches
  - If no client-specific template exists, use a default template (hardcoded array of standard items)
  - Create tasks under the hiring client with item_type=task, parent linking to a "New Hire: {name}" story
- Default onboarding items: Set up email, Order equipment, Schedule week-1 check-in, Complete right-to-work docs, Add to team communication channels, Schedule intro meetings, Training plan
- Frontend: when candidate moves to onboarded, show a toast "Onboarding tasks created for {name}" with a link

**Test:** Unit test that moving candidate to onboarded creates tasks. Playwright test for the flow.

---

## Item 5: Version-Based Sync Conflict Detection

**Problem:** Race condition in 10-second polling where User A can overwrite User B's edits.

**Solution:**
- Migration 055: ADD COLUMN `version` INTEGER DEFAULT 1 to tasks table
- Sync endpoint (POST /api/sync/changes): when processing an update, check `WHERE id = $1 AND version = $2`
  - If rows affected = 0, the task was modified by someone else → return in `conflicted` array with current server state
  - If rows affected = 1, increment version: `version = version + 1`
- Frontend: store task.version in the local task object. Include version in sync payloads.
- On conflict response: show a modal "This task was modified by someone else. Your version / Their version / Keep yours / Keep theirs"

**Test:** Unit test that simulates concurrent edits and verifies conflict detection. Playwright test with two sessions.

---

## Item 6: Activity Feed on Dashboard

**Problem:** Dashboard is read-only charts. No sense of "what just happened."

**Solution:**
- New endpoint: GET /api/dashboard/activity — returns last 20 audit log entries with user display names
- The `audit_log` table already captures create/update/delete events with entity_type, entity_id, action, changes, user_id, timestamp
- Frontend: Add "Recent Activity" section to the Portfolio/Dashboard view
  - Each entry: avatar + "{user} {action} {entity_type} '{title}'" + relative timestamp
  - Actions: created, updated, completed, deleted, moved (stage change)
  - Click entry → navigate to the entity
- Render below or alongside the tactical dashboard grid

**Test:** Unit test for the activity endpoint. Playwright test that verifies activity items appear after creating a task.
