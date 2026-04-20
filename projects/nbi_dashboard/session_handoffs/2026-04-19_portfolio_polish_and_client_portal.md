# Handoff — 2026-04-19: Portfolio Polish + Client Portal Design

## Session Summary
Two workstreams this session:
1. Portfolio dashboard layout fixes and polish (DONE, deployed)
2. Client portal feature brainstorming (IN PROGRESS — design sections 1-3 agreed, 4-7 remaining)

---

## Part 1: Portfolio Dashboard Changes (COMPLETE)

All changes are in `nbi_project_dashboard.html`, deployed via PM2 (`pm2 restart nbi-dashboard`).

### Bottom Tiles Cut-Off Fix
**Root cause**: JS height calc `window.innerHeight - top - 8` didn't account for `mainContent`'s 24px bottom padding (`padding: var(--space-xl)` where `--space-xl: 24px`).

**Fix** (line ~4329):
```javascript
requestAnimationFrame(() => {
  const pf = el.querySelector('.pf');
  if (pf) {
    if (window.matchMedia('(max-height: 850px)').matches) {
      pf.style.height = '';
      return;
    }
    const top = pf.getBoundingClientRect().top;
    const contentEl = document.getElementById('mainContent');
    const padBot = contentEl ? parseFloat(getComputedStyle(contentEl).paddingBottom) || 0 : 0;
    pf.style.height = (window.innerHeight - top - padBot) + 'px';
  }
});
```

Also added matching resize handler at line ~18010.

### CSS Layout Changes (lines ~370-509)
- `.pf__strip`: Individual rounded cards with 10px gaps. Was: single bar with `gap: 2px; border-radius; overflow: hidden; border`. Now: `gap: 10px` with no container styling; each `.pf__strip-item` gets its own `border-radius: var(--radius-lg); border: 1px solid var(--border-default)`.
- `.pf__sidebar`: Added `background: color-mix(in srgb, var(--bg-card) 40%, transparent); border-radius: var(--radius-lg) 0 0 var(--radius-lg); padding-left: var(--space-sm); padding-bottom: var(--space-sm)`. Mobile breakpoint (`max-width: 1024px`) resets these.
- `.pf__content`: `overflow: hidden` was tried as a "safety net" but CLIPPED the bottom tiles. REMOVED. Do NOT re-add.
- `.pf__panels`: `grid-template-rows: minmax(0, 1fr) minmax(0, 1fr)` (was `2fr 1fr`). `flex: 2` (was `flex: 1`, then `flex: 3`).
- `.pf__bottom--v4`: `flex: 1; min-height: 0` (was `flex-shrink: 0` with fixed `height: 190px` on child panels). Fully proportional now — no fixed pixel heights.
- Media query `max-height: 850px`: `.pf__bottom--v4 { flex: none; min-height: 160px; }` (was `height: 160px` on child panels).

### Donut Chart Changes (line ~4744 and ~4769)
**Geometry**: `cx=400, cy=200, r=150, sw=50, svgW=800, svgH=400`
- Was: `cx=320, cy=230, r=110, sw=42, svgW=640, svgH=460`
- Glen approved the bigger donut

**Label algorithm** — `spaceLabels()` function (line ~4769):
Complete rewrite. Old algorithm: even spacing from center (`startY = cy - ((n-1) * spacing) / 2`). New algorithm: labels anchor to their segment's natural Y position on the donut, then push apart with 50px minimum gap, clamped to viewBox bounds.

```javascript
const positions = group.map(seg => cy + Math.sin(seg.midAngle) * outerR);
// Push apart if too close
for (let i = 1; i < positions.length; i++) {
  if (positions[i] - positions[i - 1] < minGap) positions[i] = positions[i - 1] + minGap;
}
// Clamp to bounds, re-apply spacing
```

**Leader line geometry**:
- `elbowX = cx + outerR + 30` (right) or `cx - outerR - 30` (left)
- `lineEndX = elbowX + 30` (right) or `elbowX - 30` (left)
- `textX = lineEndX + 6` (right) or `lineEndX - 6` (left)
- Anchor: `"start"` (right), `"end"` (left)
- Structure: dot on donut → diagonal to (elbowX, labelY) → short horizontal to (lineEndX, labelY) → text at (textX, labelY)
- Text sits AFTER the line endpoint, not on top of it. Glen was explicit about this.

**outerR** = `r + sw/2 + 4` = `150 + 25 + 4` = `179`

### Known Issue
Glen mentioned the donut labels still need work — the 8% label's leader line was cutting across the pie chart. The natural-position algorithm should fix this, but Glen hasn't confirmed yet whether the latest deploy (with the new algorithm) resolved it. Check with Glen.

---

## Part 2: Client Portal Feature Design (IN PROGRESS)

### Context
Glen wants NBI clients to log into WorkSage with their own accounts, see only their company's data, and collaborate as full users within their scope. This isn't starting from scratch — the codebase already has:
- `users.client_id` field (UUID, references clients table)
- `users.role` field ('admin' | 'member')
- `getClientScopes(req)` function (server.js line ~848) — returns client IDs the user can see
- `requireInternal` middleware (line ~892) — blocks client-scoped users from internal features
- G5 user model already filters tasks server-side when `client_id` is set

### Agreed Approach
**Approach A: Extend existing G5 scaffold.** One codebase, one auth flow. Layer permissions on top of existing infrastructure.

### Design Sections Agreed So Far

**Section 1 — User Model**
Add one field to `users` table: `client_role TEXT DEFAULT NULL` ('member' | 'admin'). Only meaningful when `client_id` is set.

| Type | role | client_id | client_role |
|---|---|---|---|
| NBI admin | admin | null | null |
| NBI team member | member | null | null |
| Client user | member | UUID | member |
| Client admin | member | UUID | admin |

Glen confirmed this model. `requireAuth` middleware should attach `clientRole` to `req.user`.

**Section 2 — Permission Gates (Server Side)**

| Gate | Who passes | Examples |
|---|---|---|
| `requireAuth` (exists) | Everyone logged in | GET tasks, sync |
| `requireNBI` (new) | NBI admin + NBI member (no client_id) | Leads, Expenses, Finances, Hiring |
| `requireAdmin` (exists) | NBI admin only (role=admin, no client_id) | Delete users, system settings |
| `requireClientAdmin` (new) | Client admin for their company | Manage client users |

- Task/note/comment/time writes: new `requireTaskAccess(req, taskId)` helper enforces target task belongs to user's `client_id`
- Bug reports: relax `requireInternal` to `requireAuth`, add `source: 'client'` field for client submissions
- Email forwarding: existing feature, unblock for client users, check task's `client_id` matches sender's
- Glen confirmed this structure.

**Section 3 — Frontend Tab Visibility**
When `_currentUser.clientId` is set:
- Show: Portfolio, Projects, People, News, Bug Tracker, Settings
- Hide: Leads, Expenses, Finances, Hiring
- Auto-lock `currentFilter.client` to their client — can't change or clear
- Portfolio sidebar shows only their client card
- People tab shows only users with matching `client_id`
- Header shows their company name

Glen confirmed: "Yep, this sounds about right."

### Design Sections Agreed (continued)

**Section 4 — Client Admin User Management (Agreed)**
- Lives in Settings tab under "Team Management" section
- Client admin can: view all users from their company (same `client_id`), invite new users, deactivate/reactivate users, reset passwords, change role (member ↔ admin)
- Invite flow: enter name, email, role. System creates account with temp password, emails login link via `sendEmailAsync`. Forced password change on first login.
- Deactivate sets `is_active = false` + invalidates sessions. Doesn't delete (preserves audit trail).
- Cannot: delete users permanently, see NBI internal users, grant NBI-level roles
- Server enforces via `requireClientAdmin` — checks `req.user.clientId` is set, `req.user.clientRole === 'admin'`, and target user shares same `client_id`

**Section 5 — Data Isolation Audit (Agreed)**
- **Tasks**: `getClientScopes()` already filters list. Individual ops (PATCH, comments, time, attachments) use new `requireTaskAccess` — loads task, walks to root ancestor, confirms `client_id` matches `req.user.clientId`. 403 if not.
- **Sync**: `/api/sync/load` and `/api/sync/changes` MUST filter by `client_id`. Critical — if sync leaks, frontend scoping is irrelevant.
- **Clients**: `GET /api/clients` returns only matching client. No visibility into other clients' names, details, or notes.
- **Users/People**: `GET /api/users` returns only users sharing same `client_id`. No NBI team or other companies visible.
- **Search**: All search endpoints filter by `client_id`.
- **Attachments**: Download checks parent task's `client_id` before serving.
- **Bug reports**: Client users see own reports + reports from same `client_id`. NBI admins see all.
- **News**: No scoping — public content, same feed for everyone.
- **Principle**: Server is the authority. Frontend tab hiding is UX convenience, not security.

**Section 6 — Onboarding Flow (Agreed)**
- NBI admin creates first client account from People tab. Picks client company and role. Client user NEVER chooses their own company — NBI assigns it.
- System generates 16-char temp password, emails invite via `sendEmailAsync` with login URL, username, temp password, company name.
- First login forces password change via full-screen modal (`must_change_password` flag). No app access until changed.
- Client admin invites team members from Settings > Team Management. Company auto-inherited, no selector shown.
- Deactivation sets `is_active = false`, invalidates sessions. Reactivation re-enables. No permanent delete for client admins.

**Section 7 — Security (Agreed)**
- Server is single authority. Frontend tab hiding is convenience only.
- `requireTaskAccess` walks full parent chain every time. No shortcuts.
- Sync endpoints filter ALL data arrays by client_id. Most critical gate.
- Client admin cannot set `role = 'admin'` (NBI level), cannot change `client_id`, cannot modify NBI users.
- Audit logging to `client_activity_log` table for all client write operations.
- Same bcrypt, lockout, and rate limiting as NBI users.

**Additional Clarifications (from Glen):**
- Client users CAN set task status to Cancelled. Cannot delete tasks (NBI admin only).
- Assignee dropdown for client users includes: their company's users + NBI team members assigned to their client's teams (via `teams.client_id`). People tab still only shows their company's users.

### Full Spec Written
`docs/superpowers/specs/2026-04-20-client-portal-design.md` — complete with:
- 9 sections covering user model, permissions, endpoints, frontend, onboarding, migration, security
- 8-section QA test plan with ~100 test cases covering regression, data isolation, collaboration, privilege escalation, edge cases
- Implementation notes listing every file that will change
- Rollback SQL

**Next step**: Glen reviews spec, then invoke `writing-plans` skill for implementation plan.

### After Design Is Complete
1. Write full spec to `docs/superpowers/specs/2026-04-19-client-portal-design.md`
2. Self-review the spec
3. Glen reviews the spec
4. Invoke `writing-plans` skill to create implementation plan
5. Implement via `executing-plans` or `subagent-driven-development`

---

## Current State of Files
- `nbi_project_dashboard.html` — modified, NOT committed. Has all portfolio polish changes.
- `dashboard-server/server.js` — NOT modified yet. Client portal work hasn't started.
- `dashboard-server/migrations/` — NOT modified yet. `client_role` migration not created.

## Glen's Feedback This Session
- "your half assing things a lot can you stop being sloppy" — multiple iterations on CSS and donut chart instead of getting it right first time
- "I want to understand why you don't actually do what I ask you to do" — re: donut leader lines, I removed the elbow when he asked to keep it
- "stop, I mean completely stop, half-assing stuff. I hate low-quality delivery" — hard rule reconfirmed
- Standard: understand the problem fully, implement correctly first time, verify it works.
