# Session Log — 2026-04-19: Portfolio Polish + Client Portal Design

## Part 1: Portfolio Dashboard Layout Fixes

### Root Cause Found — Bottom Tiles Cut Off
- **Bug**: JS height override `pf.style.height = (window.innerHeight - top - 8)` didn't account for `mainContent`'s 24px bottom padding (`padding: var(--space-xl)`)
- **Fix**: Changed to `window.innerHeight - top - padBot` where `padBot = parseFloat(getComputedStyle(contentEl).paddingBottom)`
- **iPad fix**: JS now checks `window.matchMedia('(max-height: 850px)')` and skips inline height on short viewports, letting CSS `height: auto` rule take effect
- **Resize handler**: Added portfolio height recalc to existing window resize listener

### Layout Changes Made
- **Grid rows**: Changed `.pf__panels` from `minmax(0, 2fr) minmax(0, 1fr)` to `minmax(0, 1fr) minmax(0, 1fr)` — equal height rows per Glen's request to shrink top panels
- **Flex proportions**: Panels grid `flex: 2`, bottom row `flex: 1` (was flex: 3/1). No more fixed 190px on bottom panels — fully proportional
- **KPI strip**: Individual rounded cards with 10px gaps (was single connected bar with 2px gaps)
- **Sidebar**: Added subtle background fill, border-right, rounded left corners for visual extension

### Donut Chart Changes
- **Size**: r=150 (was 110), sw=50 (was 42), viewBox 800x400 (was 640x460), cx=400 (was 320), cy=200 (was 230)
- **Label algorithm**: Replaced fixed even-spacing algorithm with natural-position anchoring. Labels now start at their segment's actual Y position on the donut, then push apart with 50px minimum gap. Prevents leader lines from crossing the donut.
- **Leader lines**: dot → elbow (diagonal) → short horizontal → text starts after line ends. Text uses anchor "start" on right / "end" on left. elbowX = cx ± (outerR + 30), lineEndX = elbowX ± 30, textX = lineEndX ± 6.
- **SVG width**: 800 (was 640) to give room for labels past the line endpoints

### Files Changed
- `nbi_project_dashboard.html`:
  - CSS lines ~370-509: `.pf__strip`, `.pf__sidebar`, `.pf__content`, `.pf__panels`, `.pf__bottom--v4`, media queries
  - JS line ~4329: `requestAnimationFrame` height calc
  - JS line ~18010: resize handler
  - JS line ~4744: donut geometry (cx, cy, r, sw, svgW, svgH)
  - JS line ~4769: `spaceLabels()` function — complete rewrite

---

## Part 2: Client Portal Feature — Brainstorming (IN PROGRESS)

### Glen's Requirements
1. Clients log in to accounts NBI creates for them
2. See ONLY their own client's data — full scoping
3. Full collaborator permissions within their client scope (create tasks, log time, comment, upload, edit — everything an internal user can do)
4. No cross-client visibility
5. Client-scoped admin role: can manage users from their own company (invite, deactivate, reset passwords)
6. Can report bugs/features — goes into same bug tracker, tagged as "client request"
7. Email forwarding to attach documents to tasks — existing feature, just unblock for client users
8. Visible tabs: Portfolio, Projects, People, News, Bug Tracker, Settings
9. Hidden tabs: Leads, Expenses, Finances, Hiring

### Agreed Approach: Extend Existing G5 Scaffold (Approach A)
The `client_id` field on users, `getClientScopes()`, and `requireInternal` middleware already exist. Building on top of that.

### User Model (Agreed)
| Type | role | client_id | client_role |
|---|---|---|---|
| NBI admin | admin | null | null |
| NBI team member | member | null | null |
| Client user | member | UUID | member |
| Client admin | member | UUID | admin |

New field: `client_role` TEXT default null on users table. Only meaningful when `client_id` is set.

### Permission Gates (Agreed)
| Gate | Who passes | Examples |
|---|---|---|
| `requireAuth` | Everyone logged in | GET tasks, sync |
| `requireNBI` (new) | NBI admin + NBI member | Leads, Expenses, Finances, Hiring |
| `requireAdmin` (exists) | NBI admin only | Delete users, system settings |
| `requireClientAdmin` (new) | Client admin for their company | Manage client users |

- Task writes: server enforces target task belongs to user's `client_id` via `requireTaskAccess(req, taskId)`
- Bug reports: relax from `requireInternal` to `requireAuth`, add `source: 'client'` field
- Email forwarding: check task's `client_id` matches sender's `client_id`

### Still To Design
- Section 3: Frontend tab visibility and view scoping
- Section 4: Client admin user management UI
- Section 5: Data isolation audit (every endpoint checked)
- Section 6: Onboarding flow (how Glen creates client accounts)
- Section 7: Security considerations
- Write full spec to docs/superpowers/specs/
- Transition to writing-plans skill
