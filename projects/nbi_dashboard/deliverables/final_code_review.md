# NBI WorkSage Code Review — Phases 0-12

**Date:** 2026-04-14
**Scope:** All code landed in the overnight backlog clearance session (Phases 0-12 + widescreen fix + Bug Tracker upgrade)
**Reviewer:** Claude Opus 4.6 (code-reviewer agent)

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 5 |
| Medium | 10 |
| Low | 17 |

Overall the new code is well-structured — patterns are repeated consistently, helpers (`isValidUuid`, `validateLength`, `buildPatchQuery`, `escHtml`, `auditLog`) are reused, and every `/api/*` endpoint is authenticated via the global `requireAuth` middleware. The SoW security model is correctly implemented. The highest-impact issue is H1 (double-escape on write) which predates this session but was widened by the new fields added in Phases 2/4/7/8.

## CRITICAL

None. No RCE, auth bypass, or data loss.

## HIGH

### H1. Double-escape bug for stored text fields
**Files:** `server.js:3195, 3217-3223, 5648-5653, 5691-5693, 5300, 5306, 5380`; `nbi_project_dashboard.html:5940, 5947, 5975, 13137, 13141, 13145`

Server stores `escHtml()`-escaped text; frontend reads it and renders via `esc()`, escaping again. Every save accumulates another layer: `Foo & Bar` → stored as `Foo &amp; Bar` → displayed in input as `Foo &amp; Bar` → saved as `Foo &amp;amp; Bar`.

Affects all text fields on tasks, leads, expenses, candidates, bug reports, and comments.

**Fix:** Stop calling `escHtml` on writes. Rely on frontend `esc()` at render time. Run a migration to decode existing double-escaped rows.

### H2. DELETE /api/attachments/:id has no UUID validation, no role check
**File:** `server.js:2059-2070`

Any authenticated user can delete any attachment on any entity. Invalid UUIDs throw 500.

**Fix:** Add `isValidUuid` check, admin-or-uploader role check, 404 on missing.

### H3. Cycle detection in PATCH /api/tasks/:id is N+1
**File:** `server.js:3297-3324`

For each dependency, walks N reachable nodes with one query per node. O(M*N) queries per request.

**Fix:** Single recursive CTE to check reachability in one query.

### H4. Repeat-clone propagates double-escaped text
**File:** `server.js:3367-3392, 3741-3764`

When a repeating task is cloned, the already-escaped fields are copied verbatim into the new INSERT, compounding H1.

### H5. SoW upload swallows rollback error context
**File:** `server.js:2650-2684`

If extraction succeeds but INSERT fails, the error is opaque. Log `client_id` and `title` for diagnosability.

## MEDIUM

### M1. getTaskPractice unbounded recursion
**File:** `nbi_project_dashboard.html:2756-2766`

No cycle guard. Self-referential parent chain would stack-overflow.

**Fix:** Add visited set or depth cap.

### M2. Calendar-event DELETE returns 200 on missing
**File:** `server.js:2335-2345`

Should return 404 like other handlers. UUID enumeration leak.

### M3. Calendar-event PATCH silent success on empty body
**File:** `server.js:2295-2332`

Should return 400 when no fields provided.

### M4. teams.colour and clients.colour accept arbitrary strings (CSS injection surface)
**Files:** `server.js:2819-2843`, `nbi_project_dashboard.html:11228`

Admin-only mitigates but defence in depth needs regex validation.

### M5. POST /api/clients/:id/reports has no UUID validation or role check
**File:** `server.js:6233-6295`

Any authenticated user can generate a public share token for any client. 90-day lifetime.

**Fix:** Admin-only, UUID validation, audit log, shorter expiry.

### M6. Hiring CV upload accepts any MIME type from shared multer
**File:** `server.js:5740-5770`

Align with SoW path (PDF-only).

### M7. Bulk task POST skips escHtml and validateLength
**File:** `server.js:3479-3518`

Imports land with raw HTML; interactive creates land with escaped HTML. Deepens H1 inconsistency.

### M8. SoW zero-paragraph error is opaque
**File:** `server.js:2661-2663`

Surface `stats.filteredReasons` to tell user why their SoW was rejected.

### M9. Calendar visibility helper swallows errors silently
**File:** `server.js:2145-2173`

Replace bare catch with `log('warn', ...)`.

### M10. Task notes per-row insert inside sync transaction
**File:** `server.js:3631-3641`

N+1 delete+insert loop per task per sync. Works at current scale but not great.

## LOW (17 items)

See full review for details. Highlights:
- L1: Orphan `/api/clients/:id/hiring-count` endpoint (frontend doesn't call it)
- L7: `escHtml` applied to URLs (should validate protocol instead for linkedin_url)
- L9: `_warnAlertSnoozedUntil` never GCs
- L10: `_candidatesData` cache not reset on logout
- L12-L15: Missing DB CHECK constraints for enums (team role, event type/visibility, candidate stage, practice area)
- L17: SoW `task_count` label mismatch (SQL counts all items, label says "projects")

## Test Coverage

Only `lib/sow-extractor.js` has tests. ~50 new endpoints (SoWs, teams, calendar events, hiring, candidates, attachment links, client research, repeat task cloning, cascade cancel, blocker notifications, practice filtering) have no integration tests.

**Untested high-risk areas:**
- `computeNextRepeatDate` (yearly span, DST, empty daysOfWeek)
- Cascade-cancel recursive CTE
- Calendar visibility clause builder
- Server-side prerequisite enforcement and mandatory-field validator

## Recommended Fix Order

1. H2: attachment DELETE auth (quick)
2. H3: cycle detection CTE (single SQL replacement)
3. H1: double-escape migration (biggest but unblocks everything)
4. M2, M3, M5: calendar/reports handler consistency
5. Add smoke-test suite for new endpoints
6. Schedule M4, M6-M10, L series for polish sprint
