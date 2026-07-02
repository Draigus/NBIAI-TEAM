# Handoff: Configurable Hierarchy (Initiative Level + Clickable Type Pill)

**Date:** 2 July 2026
**Session:** ATS wizard completed, tree clean, ready for hierarchy work
**Resume in a fresh session**

## State at handoff

- Working tree CLEAN. Branch master, 22+ commits ahead of origin (includes 9 snapshot commits that must be squashed before push -- Gate 5 blocks).
- Unit suite: 936/936 GREEN.
- E2e suite: 88/89 pass (83 passed + 5 ats-workflow passed, 1 skipped). All previously-red tests are now green.
- ATS interview wizard COMPLETE and deployed (4 code commits + 1 docs commit).

## THE TASK: Configurable hierarchy with Initiative level + clickable type pill

Glen's request: add Initiative as a new top-level work item type, and make the type pill in the detail side panel interactive (clickable to change item type with cascade + undo).

### What exists

**Spec:** `docs/superpowers/specs/2026-07-01-configurable-hierarchy-design.md` (committed 56c5629, 2026-07-01). Covers:
1. Initiative level (new `item_type` value, mandatory root, per-client visibility)
2. Clickable type pill (dropdown of active levels, cascade subtree, undo toast)
3. Per-client hierarchy depth config (`clients.hierarchy_levels` JSONB column)

**Decisions locked (Glen, 2026-07-01):** spec section 2. Initiative is mandatory root. Cascade on type change. Hide-not-delete for contracted depth. Per-client config. Identical fields to other types. Undo toast (Gmail-style, ~10s).

**Open items (spec section 9):**
- Option A vs B for descendant-order model (spec recommends Option B)
- Exact initiative colour/icon (spec suggests one step deeper than Project's `#6366f1`)

### Verified surface map (from live repo, NOT nbi-modularise)

| Surface | File(s) | What changes |
|---|---|---|
| Constants + helpers | `nbi-utils.js:141-167` | Add initiative to `ITEM_TYPE_META`/`ITEM_TYPE_ORDER`; active-level helper; interactive pill variant |
| Duplicate ITEM_TYPES | `helpers.js:15-16`, `slack-bot.js:17` | Unify with nbi-utils.js constants |
| Tree validation | `routes/tasks.js:169-177, 235-236, 715` | Descendant-order enforcement + active-level awareness |
| Sync | `routes/sync.js:142` | Include initiative in sync queries |
| Server hub | `server.js:59, 485, 488` | Valid type constants |
| Detail panel | `nbi-detail.js:110, 257, 1200-1544` | Type field becomes clickable pill; parent selector; child creation |
| Kanban | `nbi-kanban.js:595, 670, 687` + quick-add pill | Drag validation; quick-add offers active child type |
| Task tree | `nbi-tasks.js:72-77` | Indentation levels; initiative row styling |
| Settings | `nbi-settings.js:680` | Per-client hierarchy config UI |
| Docs/reports | `nbi-docs.js:570-574` | Include initiative in export/reports |
| Migration | `migrations/001:6` (reference) | New migration: `clients.hierarchy_levels` JSONB column |

### Resume sequence

1. Read this handoff + the spec + `projects/nbi_dashboard/session_logs/2026-07-02_session_b.md`.
2. Codex adversarial review of the spec (`codex exec` with a prompt targeting the open items in section 9 and the cascade/undo design).
3. brainstorming skill to resolve the open items (Option A vs B, initiative colour).
4. writing-plans -> worktree implementation (this touches 10+ files, worktree is mandatory).
5. TDD for all server endpoints. Full e2e coverage per spec section 8.
6. Definition of done: `npm run test:all` green, Codex review clean, cache-bust bumps, PM2 restart, Glen UAT.

## Also pending (do not lose)

- **Squash `snapshot:` commits before any push** (9+ cadence snapshots on master). Gate 5 blocks push until squashed.
- **CH director performance reviews:** Robin/Mustafa/Graeme Q() entries need same rewrite treatment David received. File at scratchpad path in previous HANDOFF.md (search for "CH Director Performance Reviews").
- **Worktree cleanup:** `.worktrees/ats-wizard` and branch `feature/ats-interview-wizard` need manual removal (Windows lock prevented automatic cleanup).

---

## Previous handoff (preserved for reference)

### CH Director Performance Reviews

**Date:** 1 July 2026

Performance review HTML file at:
`C:\Users\gpbea\AppData\Local\Temp\claude\d--OneDrive-Claude-code-NBIAI-TEAM\40c1ea42-9d1b-42fe-b98e-5b883d89f8ae\scratchpad\CH_Performance_Reviews.html`

Robin Jubber, Mustafa Sibai, Graeme Monk Q() entries still have raw conversational quotes as the main text. These need the same rewrite treatment David received. Full instructions in the previous handoff (session 2026-07-01).
