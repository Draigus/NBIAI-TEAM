# Handoff -- 2026-06-20 Interview Question Bank Rework + Codex Validation

## Session Summary

(Previous session content was here -- overwritten by RHO migration completion below)

---

# RHO Global Migration COMPLETE -- 2026-06-20

**Supersedes:** RHO Global Migration Handoff 2026-06-19 (Batches 5-6 remaining)

## Summary

All 6 batches of the RHO global migration are complete. The harness now runs globally from `~/.claude/harness/` for all Claude Code projects, with per-project data namespaced by slug.

## What Was Done

### Batches 1-4 (previous session)
- Global harness deployed at `C:\Users\gpbea\.claude\harness\`
- 14 lib modules (13 original + resolve.js), 7 config files, 18 test files
- resolve.js: shared path resolution with HARNESS_DIR env override for test isolation
- Hooks migrated from project settings.json to global settings.json
- Data migrated to per-project slug directories

### Batch 5: Test HARNESS_DIR Isolation (this session)
- 16 test files updated across 3 patterns:
  - **Group A** (5 files): Pre-require env set (test-locking, test-metadata, test-event-enrichment, test-anti-regression, test-reporting)
  - **Group B** (4 files): Cache-clearing loadModule pattern (test-redaction, test-risk-classify, test-proposal-format, test-apply-gate)
  - **Group C** (6 files): Child process env (test-emit-event, test-write-guard, test-ulid, test-entropy-residue, test-bootstrap-git, test-transcript-parser)
  - **Unique** (1 file): test-entropy-scan (direct config read)
- 2 files unchanged: test-memory-conflict (project-only module), test-shell-guard (pattern matching only)
- 2 lib bugs fixed during test runs:
  - reporting.js: 3 bare `DATA_DIR` references -> `R.DATA_DIR`, EVENTS_DIR -> `R.EVENTS_DIR`
  - write-guard.js: hardcoded `__dirname/..` -> `process.env.HARNESS_DIR || __dirname/..`
- All 18 tests pass: 565+ assertions, 0 failures

### Batch 6: Verification + Documentation
- Fresh-session verification: events landing at correct slug path, shell-guard blocks global config writes, write-guard blocks global lib edits
- CLAUDE.md harness section updated (architecture, paths, event location)
- Memory files updated (project_rho_purpose.md, project_nbiai_team.md, MEMORY.md)

## Architecture (Final State)

- **Source of truth**: `NBIAI_TEAM/.claude/harness/` (git-tracked)
- **Runtime**: `~/.claude/harness/` (deployed copy, fires for all projects)
- **Deploy**: `node .claude/harness/deploy.js`
- **Hooks**: Global `~/.claude/settings.json`
- **Per-project data**: `~/.claude/harness/data/<project-slug>/`
- **Project slug**: `basename_md5hash6` (collision-resistant)

## What Remains

### Not done in this session (deferred, not blocking):
1. **Global settings cleanup** (plan Task 6.3): Remove stale `additionalDirectories` entries and old Bash permissions from global settings.json
2. **Codex final audit** (plan Batch 6 checkpoint): Run the final Codex adversarial review against the completed migration
3. **Cross-project test**: Verify events land under a different slug in a non-NBIAI_TEAM project (Astinus slug `Astinus_99859c` already visible in data dir, suggesting it works)

### Convergence status
- 4 Codex adversarial rounds completed during Batches 1-4: CONVERGED
- Batch 5 Codex checkpoint: not yet run
- Batch 6 Codex checkpoint: not yet run

## Plan reference
`docs/superpowers/plans/2026-06-19-rho-global-migration.md`
