# Handoff: SPA Modularisation

**Date:** 2026-06-09
**From:** System assessment + infrastructure session
**To:** Next session — SPA modularisation execution
**Priority:** This is the sole task for the next session. Do not mix with other work.

---

## What happened this session

Full Codex/Critic system assessment led to 3 waves of improvements:
- Wave 1: CLAUDE.md fixed, 19 Paperclip roles archived, session continuity simplified, financial resilience module created
- Wave 2: /proposal, /recompile-banks, system-audit Layer 5 (consistency linter) built
- Wave 3: /pipeline, Studio Brain Sprint offering built
- Wrapper skills: /brain-freshness, /financial-reconciliation built
- 4 new cloud routines scheduled (bank recompilation, pipeline pulse, brain freshness, financial reconciliation)
- All changes committed and pushed: `cc330f0`

Everything is committed. No uncommitted session work remains.

---

## What to do next: SPA Modularisation

### The Task
Extract the 30,626-line monolithic `nbi_project_dashboard.html` into separate CSS and JS files. Reduce the HTML to ~350 lines of shell markup + script tags.

### The Plan
**Read this first:** `docs/superpowers/plans/2026-06-09-spa-modularisation.md`

Plan is v2, Codex-reviewed and approved. All 12 original Codex concerns addressed. One cosmetic fix applied (duplicate portfolio.js entry). Rollback procedure added.

### Critical Architecture Decisions (already vetted by Codex)
1. **NO IIFEs.** No namespace wrapping. Just separate files. Top-level declarations in non-module scripts are already global. This preserves all 483 onclick handlers without refactoring.
2. **Scripts at end of `<body>`**, not in `<head>`. The JS references DOM elements that must exist first.
3. **No build toolchain.** Traditional `<script>` tags with `?v=1` cache-busting query strings.
4. **Sync polling `setInterval` goes in nbi-init.js (last file loaded)**, not in nbi-sync.js. Prevents polling before auth completes.

### Worktree
- **Path:** `d:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\spa-modularise`
- **Branch:** `feature/spa-modularise` (created from `cc330f0`)
- **Port:** 8889 (production stays untouched on 8888)
- **Status:** Worktree created, npm install NOT yet run, baseline tests NOT yet run

### Phase Order
| Phase | What | Files | Checkpoint |
|---|---|---|---|
| 0 | Setup (install, port, baseline) | 0 | -- |
| 1 | CSS extraction | 1 CSS | Codex 1 |
| 2 | JS infrastructure (api, idb, config, sync, utils, events) | 6 JS | Codex 2 |
| 3a | Simple views (dashboard, mytasks, people, reports, calendar, settings, chat) | 7 JS | Codex 3a |
| 3b | Complex views (tasks, kanban, gantt, detail, docs) | 5 JS | Codex 3b |
| 3c | Additional views (activity, queue, news, meetings) | 4 JS | Codex 3c |
| 4 | Domains (hiring, leads, finance, bugs) + infra + init | 13 JS | Codex 4 |
| 5 | Cleanup + CLAUDE.md + merge | 0 | Codex 5 (final) |

### Execution Rules (Glen's directives)
- **Extreme caution.** Not creating bugs is critical.
- **Use QA and engineering skill sets.** TDD mindset, verification-before-completion.
- **Cross-check with Codex at every checkpoint.** 7 checkpoints in the plan.
- **Test after EVERY extraction.** `npm test && npm run test:e2e` after each file is extracted.
- **One commit per extracted file.** Atomic commits so any single extraction can be reverted.
- **Implement in batches.** Do not try to extract everything in one go.
- **Grep for every extracted function name** in remaining inline JS before removing code.

### File Structure (target)
```
dashboard-server/public/
  css/dashboard.css          (3,238 lines — all CSS)
  js/
    nbi-config.js            (constants + state declarations)
    nbi-api.js               (authFetch, apiCall, auth state)
    nbi-idb.js               (IndexedDB WAL only)
    nbi-utils.js             (tree helpers, toast, confirm, etc.)
    nbi-sync.js              (save, syncToAPI, persistence — NO setInterval)
    nbi-events.js            (data-action delegation + action wrappers)
    nbi-sidebar.js           (renderSidebar, view routing)
    nbi-warnings.js          (warnings sidebar)
    nbi-themes.js            (theme switching, mobile, keyboard shortcuts)
    nbi-portfolio.js         (Portfolio v5 neumorphic)
    nbi-import.js            (CSV/Excel import/export/backup)
    nbi-command.js            (Command Centre)
    nbi-init.js              (boot sequence + setInterval — LAST)
    views/
      nbi-dashboard.js, nbi-mytasks.js, nbi-people.js,
      nbi-reports.js, nbi-calendar.js, nbi-settings.js,
      nbi-chat.js, nbi-tasks.js, nbi-kanban.js, nbi-gantt.js,
      nbi-detail.js, nbi-docs.js, nbi-activity.js,
      nbi-queue.js, nbi-news.js, nbi-meetings.js
    domains/
      nbi-hiring.js, nbi-leads.js, nbi-finance.js, nbi-bugs.js
```

### Known Gotchas (from Codex review)
- The docs view has its own local `save()` in a closure — do not confuse with global `save()` in nbi-sync.js
- News module changes from lazy-load to eager-load — accepted, can re-lazy later
- Line numbers in the structural map shift after CSS extraction in Phase 1 — re-identify JS boundaries by searching for function/comment markers, not line numbers
- Config must load before API (API may reference timeout constants)
- 30+ script tags adds HTTP overhead — measure load time after merge, concatenate later if >3s

### Test Infrastructure
- Vitest unit tests: `npm test` (mocked, no server needed)
- Playwright e2e: `npm run test:e2e` (auto-starts server on configured port)
- No `APP_URL` env var needed — Playwright config reads `PORT` from .env
- Set `PORT=8889` in the worktree's `.env`

### Skills to invoke
- `verification-before-completion` — before claiming any phase is done
- `systematic-debugging` — if any test breaks during extraction
- `test-driven-development` — TDD mindset throughout
- Codex agent review at every checkpoint

### Rollback
If production breaks after merge: `git revert HEAD && pm2 restart nbi-dashboard`
