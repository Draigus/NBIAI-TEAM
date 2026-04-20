# Session Log — 2026-04-20: Client Portal Spec Revision

## Context
Continued from 2026-04-19 session. Client portal spec was written, Glen asked for a critique + codebase audit to find conflicts.

## Spec Critique (Initial)
Identified 15 issues in 3 tiers:
- **Must resolve** (5): Task creation gate, sync data array enumeration, task client_id mutation, bug report visibility gap, contacts/SOWs/teams missing from endpoint matrix
- **Should resolve** (5): Password requirements, email forwarding auth, token cache invalidation, requireTaskAccess depth, login page UX
- **Nice to clarify** (5): Client admin self-demotion, NBI admin password reset, concurrent admin conflicts, attachment endpoint structure, activity log frontend

## Codebase Audit
Glen requested: "you need to assess the existing code structure, architecture, and workflows to make sure there aren't conflicts." Three parallel agents audited server.js, frontend HTML, and migrations/schema.

### Key Findings

1. **POST/PATCH /api/tasks are admin-only inline** — but frontend uses sync/changes (which accepts all users) as the primary path. Glen confirmed all users can create/edit tasks. Direct endpoints just need alignment.

2. **`requireAdmin` doesn't exist as middleware** — all admin checks are inline `if (req.user.role !== 'admin')`. Spec incorrectly said "exists". Will create it.

3. **Role value mismatch** — frontend sends `role='user'`, server defaults `'member'`. Mixed values in DB. Normalise to 'member' with migration.

4. **Bug Tracker + Settings hidden from scoped users** — `!isScoped` gates at lines ~3794 and ~3798. Spec says show them. Need unhiding.

5. **All 11 bug report endpoints use requireInternal** — spec originally only listed 5. Full enumeration added.

6. **News has no sidebar entry** — only in top tabs array. Needs adding.

7. **Existing user creation form is a test** — Glen confirmed: "That should all be overwritten for this."

8. **5+ attachment endpoints have NO auth at all** — pre-existing security gap. Adding auth + scope checks.

9. **Task client_id is patchable** — client users could move tasks between clients. Block for client users.

10. **sync/load settings filter already exists** — external users see a whitelist. Referenced in spec to avoid duplication.

11. **Email forwarding is a cron job** — not a webhook. Corrected.

12. **Token cache needs invalidation on role/client changes** — documented pattern.

13. **getClientScopes hardcoded exceptions** — 'NBI OPS', 'Playsage'. Doesn't affect client users.

14. **Client admin self-demotion** — could leave company with no admin. Added server check.

## Spec Updates Made
All 14 conflicts resolved in spec. Updated sections: 2.1a, 3.1, 3.2 (Tasks, Sync, Bug Reports, Attachments, NBI-Only, Email), 4.1, 4.7, 5.1, 6, 7.3/7.3a, 8.6/8.6a, 9.1-9.5.

## Glen's Input This Session
- "you need to assess the existing code structure, architecture, and workflows to make sure there aren't conflicts"
- "We did a test where we could build the user and just assign it to a client company. That should all be overwritten for this."
- "no, all users can create and edit tasks. I'm not sure where you got the idea that only ISC admin can do that."
- Confirmed issues 2 and 3 (requireAdmin creation, role normalisation) don't need his input — just handle them.

## Next Steps
- Glen reviews updated spec
- Invoke writing-plans skill for implementation plan
