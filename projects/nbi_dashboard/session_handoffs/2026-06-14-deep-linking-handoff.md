# Handoff — 2026-06-14 Deep-linking Implementation

## What was done

All 8 tasks from `docs/superpowers/plans/2026-06-14-deep-linking.md` are implemented, committed, and deployed to production on `:8888`.

### Branch state

- **`feat/deep-linking`** at `bc2cc34` — 8 deep-linking commits on top of rho-hardening + XLSX work
- **`feature/rho-hardening`** at `358e2bc` — has 2 orphaned deep-linking commits (`cd4f924`, `358e2bc`) that were accidentally committed here when another CLI switched the working tree mid-session. These same changes exist correctly on `feat/deep-linking`. When merging, merge `feat/deep-linking` (it includes everything from `feature/rho-hardening` via rebase).
- **`master`** at `71b47bd` — unchanged this session

### Full commit chain on `feat/deep-linking` (newest first)

```
bc2cc34 feat(deep-link): bump cache-busters for deep-link changes
ee6ddcb feat(deep-link): copy link button in all detail panel headers
9c2a191 feat(deep-link): resolve pending deep-links after auth completes
a52485c feat(deep-link): hash updates on detail open/close for all entity types
c6eaac6 fix(security): add requireTaskAccess to GET /api/tasks/:id
5a8a690 feat(deep-link): capture entity hash before sidebar normalises it
358e2bc feat(bugs): openBugDetail falls back to API fetch for deep-links
cd4f924 feat(bugs): add GET /api/bug-reports/:id for deep-link resolution
441860b fix(harness): M8+S5+S6 token-aware locking (rho-hardening Task 4)
c565af3 feat(docs): XLSX inline preview in folder view
fe234ed fix(harness): M4+D3 mode enforcement (rho-hardening Task 3)
e6bb76a fix(harness): M1+D1+D2 principal-aware write guard (rho-hardening Task 2)
4c3738e fix(harness): S13 Node-native hook entrypoints (rho-hardening Task 1)
727964a docs(harness): rho-hardening implementation plan
```

## Files modified (deep-linking only)

### Backend (routes + tests)
- `dashboard-server/routes/tasks.js` — added `requireTaskAccess` call to GET `/api/tasks/:id` (security: blocks cross-client access)
- `dashboard-server/routes/bugs.js` — added GET `/api/bug-reports/:id` endpoint with client scoping via `reporter_client_id`
- `dashboard-server/tests/unit/task-access.test.mjs` — NEW, 4 tests (403 cross-client, 200 admin, 200 own-client, 404 missing)
- `dashboard-server/tests/unit/bugs.test.mjs` — NEW, 5 tests (admin OK, 404 missing, 400 invalid, own-client OK, cross-client 404)

### Frontend
- `dashboard-server/public/js/nbi-sidebar.js` — IIFE replacement for entity hash capture (`_pendingDeepLink`), hash helper functions (`_pushEntityHash`, `_clearEntityHash`), popstate handler for Back/Forward, resolver functions (`_resolveEntityHash`, `_resolveDeepLink`)
- `dashboard-server/public/js/views/nbi-detail.js` — `_pushEntityHash('task', id)` on open, `_clearEntityHash()` on close, copy-link button in header
- `dashboard-server/public/js/domains/nbi-hiring.js` — `_pushEntityHash('hiring/candidate', id)` on open, `_clearEntityHash()` on close, copy-link button
- `dashboard-server/public/js/domains/nbi-leads.js` — `_pushEntityHash('lead', id)` on open, `_clearEntityHash()` on close, copy-link button
- `dashboard-server/public/js/domains/nbi-bugs.js` — API fetch fallback in `openBugDetail`, hash updates on open/close, copy-link button
- `dashboard-server/public/js/nbi-import.js` — removed old `#hiring/candidate/` hashchange handler (replaced by sidebar resolver)
- `dashboard-server/public/js/nbi-api.js` — post-auth hook resolves `window._pendingDeepLink` after `checkInterviewDeepLink()`
- `dashboard-server/public/js/nbi-events.js` — `copyEntityLink(prefix, id)` + `_copyFallback(text)` with clipboard API + textarea fallback
- `nbi_project_dashboard.html` — cache-buster bumps for all 8 modified JS files

## Key design decisions

1. **`var` not `let`** for `_pendingDeepLink` — must attach to `window` since `nbi-api.js` reads `window._pendingDeepLink` from a different `<script>` tag
2. **`_isPopstateNav` guard** — prevents `_clearEntityHash()` in close handlers from corrupting history entries during browser Back/Forward navigation
3. **Polling retry** (max 20 attempts x 100ms = 2s) for deep-link resolution — waits for view DOM readiness rather than relying on timing hacks
4. **Client scoping on bugs** uses `reporter_client_id` column (not `getClientScopes`) — matches the actual data model
5. **`history.pushState`** for entity opens, **`history.replaceState`** for clears — Back button closes the panel, doesn't create duplicate history entries
6. **Codex pre-review** — plan was Codex-reviewed (design + red team) before execution. 9 findings addressed in the plan. No post-implementation Codex review done yet.

## Test results

- **Deep-linking tests:** 9/9 pass (4 task-access + 5 bugs)
- **Full suite:** 767/772 pass — 5 failures in `milestones.test.mjs` are pre-existing (auth token issue in test setup, unrelated to deep-linking)
- **PM2:** restarted at 17:50, server running cleanly on `:8888`

## What needs doing next

### Immediate — Glen UAT

Production is live. Glen needs to test against this 10-point checklist:

1. Open `https://worksage.nbi-consulting.com/nbi_project_dashboard.html#tasks` — loads tasks view
2. Open any task detail — URL updates to `#task/<uuid>`
3. Copy URL, paste in new tab — lands on same task after auth
4. Close task — URL reverts to `#tasks`
5. Browser Back — task detail reopens
6. Repeat for candidate (`#hiring/candidate/<uuid>`), lead (`#lead/<uuid>`), bug (`#bug/<uuid>`)
7. Click copy-link button (chain icon) in detail panel header — copies URL to clipboard
8. Paste invalid UUID like `#task/not-a-real-id` — error toast, falls back to view
9. Test as client user (e.g. Lorenza) — only resolves entities belonging to their client
10. Test Back/Forward navigation across multiple entity opens

### After UAT

- Merge `feat/deep-linking` into `master` (fast-forward preferred; it includes all rho-hardening commits)
- Optionally clean up orphaned commits on `feature/rho-hardening` (not blocking — they're duplicates)
- Optionally run Codex post-implementation review
- The milestones test failure (`POST /api/clients/:clientId/milestones` gets 401) is pre-existing and should be investigated separately

### Git push note

Git push to remote has been failing this session — likely an auth or remote config issue. The commits are all local. Push when remote access is restored:
```
git push origin feat/deep-linking
```

## Plan reference

Full plan with code blocks: `docs/superpowers/plans/2026-06-14-deep-linking.md`
Session log: `projects/nbi_dashboard/session_logs/2026-06-14_session.md`
