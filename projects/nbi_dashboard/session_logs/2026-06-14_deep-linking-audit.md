# Deep-Linking Implementation Audit Report

**Date:** 2026-06-14
**Reviewer:** Claude Opus 4.6 (self-review + Codex gpt-5.5 adversarial convergence)
**UI/UX context:** ui_ux_lead role loaded
**Branch:** feat/deep-linking (on top of feature/rho-hardening)

---

## 1. Scope

Full audit of the deep-linking feature: URL hash updates on entity open/close, browser Back/Forward navigation, deep-link resolution after login and auto-login, copy-link buttons, and access control on new API endpoints.

## 2. Bugs Found and Fixed

### Bug 1 — CRITICAL: Task deep-links completely broken (let/var mismatch)
- **File:** nbi-sidebar.js:760
- **Root cause:** `tasks` declared with `let` in nbi-config.js. `window.tasks` is always `undefined` because `let` doesn't attach to the window object. The readiness check `Array.isArray(window.tasks)` always returned `false`, so task deep-link resolution timed out on every attempt.
- **Found by:** Claude (during Playwright test debugging)
- **Fix:** Changed `window.tasks` to `tasks` (accessed via global lexical scope)

### Bug 2 — MEDIUM: History duplication on Back/Forward
- **File:** nbi-sidebar.js:730-733
- **Root cause:** `_pushEntityHash` always used `history.pushState`. During popstate navigation (Back/Forward), this created duplicate history entries, making the Back button loop.
- **Found by:** Claude (self-review), independently confirmed by Codex R1 (P2)
- **Fix:** `_pushEntityHash` checks `_isPopstateNav` and uses `replaceState` during popstate, `pushState` otherwise. Flag cleared inside `_pushEntityHash` itself.

### Bug 3 — MEDIUM: Missing renderAll before entity resolution in popstate
- **File:** nbi-sidebar.js:718
- **Root cause:** When navigating Back/Forward to an entity state from a different view, the popstate handler set `currentView` but didn't render the target view's DOM. Entity resolution polling couldn't find overlay elements (bug/lead/candidate detail panels) and timed out.
- **Found by:** Codex R1 only (P2) — missed by Claude
- **Fix:** Added `renderAll()` before `_resolveEntityHash` in the entity-hash branch of the popstate handler.

### Bug 4 — MEDIUM: _isPopstateNav stale for async entity openers
- **File:** nbi-sidebar.js:753-780
- **Root cause:** `_isPopstateNav` was cleared synchronously after calling entity open functions. For async openers (`openCandidateDetail`, `openBugDetail`), the flag was cleared before the function reached `_pushEntityHash` after its first `await`, causing `pushState` instead of `replaceState`.
- **Found by:** Codex R1 (P2), refined by Claude self-review
- **Fix:** `tryOpen` is now `async`, entity open calls are `await`ed, and a `try/finally` ensures `_isPopstateNav` is always cleared after the operation completes (sync or async).

### Bug 5 — MEDIUM: Deep-links don't resolve on auto-login (session restore)
- **File:** nbi-themes.js:197-201
- **Root cause:** `_pendingDeepLink` was only consumed in the `handleLogin` success path (manual login). When the user already had a valid session (auto-login via `/api/auth/me`), the init function never resolved the pending deep-link.
- **Found by:** Claude (Playwright MCP visual testing)
- **Fix:** Added `_pendingDeepLink` resolution to the auto-login path in the init function, after `checkInterviewDeepLink()`.

### Bug 6 — LOW: Task readiness check doesn't validate specific task exists
- **File:** nbi-sidebar.js:767-769
- **Root cause:** Readiness check was `tasks.length > 0` — any loaded tasks counted as "ready". For nonexistent or inaccessible task UUIDs, `openDetail` was called with an invalid ID, leaving `activeDetailTaskId` and the URL hash in an invalid state.
- **Found by:** Codex R2 (P2, uncommitted review)
- **Fix:** Added `tasks.some(t => t.id === link.id)` validation after readiness check; invalid IDs get a toast error and hash clear.

## 3. Adversarial Convergence Summary

| # | Finding | Claude | Codex | Status |
|---|---------|--------|-------|--------|
| 1 | window.tasks undefined | Found | — | Fixed |
| 2 | History duplication | Found | Confirmed (R1) | Fixed |
| 3 | Missing renderAll | Missed | Found (R1) | Fixed |
| 4 | Async _isPopstateNav | Partial | Found (R1) | Fixed |
| 5 | Auto-login deep-link | Found | — | Fixed |
| 6 | Task ID validation | — | Found (R2) | Fixed |

Both reviewers contributed unique findings. No unresolved disagreements.

## 4. Test Results

| Suite | Result | Detail |
|-------|--------|--------|
| Vitest unit | 772/772 pass | 61 test files, 0 failures |
| Playwright e2e (deep-linking) | 6/6 pass | hash push, hash clear, Back/Forward, deep-link after login, invalid UUID, copy link |
| Playwright e2e (full suite) | 64/71 pass | 7 pre-existing failures in ATS/interview-bank (login timeouts, unrelated) |
| Pre-existing unit failure | 1 | email-pm-report.test.mjs — pre-existing, unrelated to deep-linking |

## 5. Files Modified (this session's fixes)

| File | Change |
|------|--------|
| dashboard-server/public/js/nbi-sidebar.js | 5 bug fixes in deep-link resolution |
| dashboard-server/public/js/nbi-themes.js | Auto-login deep-link resolution |
| dashboard-server/tests/e2e/deep-linking.spec.js | NEW: 6 Playwright e2e tests |
| nbi_project_dashboard.html | Cache-buster bumps: nbi-sidebar v=3, nbi-themes v=2 |

## 6. UI/UX Assessment (ui_ux_lead context)

- **Copy-link button placement:** Chain icon (🔗) in detail panel header, positioned before the close button. Consistent across all 4 entity types (task, candidate, lead, bug). Minimal, unobtrusive.
- **Toast feedback:** "Link copied" confirmation on copy, "Task not found or not accessible" on invalid deep-link, "Could not load entity — try refreshing" on timeout. Clear, actionable messages.
- **URL behaviour:** Hash updates are immediate and deterministic. Close reverts to view hash. No visual flicker during hash transitions.
- **Back/Forward:** Natural browser navigation preserved. No history pollution. Detail panels open and close as expected.

## 7. Known Limitations

1. **Same-page hash navigation:** If the user is already on the dashboard and pastes a deep-link URL with a different hash, the browser treats it as a hash change (not a full reload). The IIFE doesn't re-run, so the deep-link isn't captured. This requires a `hashchange` listener — deferred as a separate feature.
2. **openDetail doesn't validate task existence:** `openDetail(id)` sets `activeDetailTaskId` and pushes the entity hash before checking if the task exists in the `tasks` array. The deep-link code works around this with pre-validation, but direct calls to `openDetail` with invalid IDs still leave invalid state.

## 8. Deployment

- PM2 restarted on :8888 with all fixes
- Cache-busters ensure fresh file delivery
- Git push to remote completed earlier in session
