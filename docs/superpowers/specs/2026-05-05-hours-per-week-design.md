# Hours Per Week — Per-User Capacity Setting

## Problem

The workload and capacity views hardcode 40 hours/week for all team members. Some staff work part-time or different schedules. There is no UI to set per-user capacity, even though the database column and API endpoint already exist.

## Design

### 1. Settings > Team: Capacity Input

Add a "Hours/wk" number input to each user row in the Settings team management panel. Inline with existing fields (name, email, role).

- Input type: number, min 1, max 80, step 1
- Default display: 40 (when `capacity_hours_per_week` is null)
- On change: call existing `PATCH /api/users/:id/skills` with `{ capacity_hours_per_week: value }`
- Admin-only (Settings is already admin-gated)

### 2. People Workload View: Per-User Capacity

Replace `const WEEKLY_CAPACITY = 40` (line 11375) with per-user lookup.

- Source: users data already loaded on the frontend contains `capacity_hours_per_week` (returned by GET /api/users for admins)
- `weekUtilFor(person, week)` uses that person's capacity instead of the global constant
- Days-off deduction: `daysOff * (capacity / 5)` instead of `daysOff * 8` — a 30h/wk person loses 6h per day off, not 8h
- All percentages flow from this: utilisation %, colour coding, week preview columns

### 3. Capacity Heatmap: Already Correct Server-Side

The `/api/resource-planning/capacity` endpoint already uses `u.capacity_hours_per_week || 40`. No server changes needed. Once users have their values set via the Settings UI, the heatmap reflects correct capacity automatically.

### 4. Calendar Deductions: No Changes

`computeDaysOff` already handles vacation, sick_leave, bank_holiday, firm_closed, and uto event types. It returns a day count. The only change is that the day count is multiplied by `capacity / 5` instead of `8`.

## Files Affected

- `nbi_project_dashboard.html` — Settings team UI (add input), People workload calculation (replace hardcoded 40)
- No server changes needed — API and DB column already exist

## Constraints

- No database migrations
- No server.js changes
- Lighthouse Games data untouched — this only affects user profile settings and frontend display calculations
