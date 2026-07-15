---
name: maintenance
description: "Periodic environment cleanup checklist. Prune merged branches, remove stale worktrees, clean snapshot commit prefixes, extract undocumented decisions to decisions.md, check Brain module verified dates, update dashboard README counts, prune orphaned harness event data. Use when: cleanup, maintenance, prune branches, environment sweep, housekeeping, tidy up."
user-invocable: true
---

# Environment Maintenance

Periodic cleanup checklist. Run when cruft accumulates or Glen requests a sweep.

## Checklist

### 1. Branch and worktree cleanup
```bash
git branch --merged master | grep -v master
git worktree list
```
Delete merged branches (check each is truly merged first). Remove stale worktrees (check for uncommitted work before removing).

### 2. Snapshot commit cleanup
```bash
git log --oneline --grep="snapshot:" | head -20
```
If snapshot-prefixed commits exist unpushed, soft-reset and recommit with clean messages. Gate 5 blocks pushing snapshot commits.

### 3. Decision extraction
Scan recent session logs for Glen directives not yet in `projects/nbi_dashboard/live_state/decisions.md`. Append any missing decisions with date and context.

### 4. Brain freshness check
Check `last_verified` dates on `brain/` modules. Flag any older than 30 days to Glen: "[module] has not been verified since [date] -- should I check if it is still current?"

### 5. Dashboard README update
Verify migration count, test file count, and line counts in `dashboard-server/README.md` match reality. Update if stale.

### 6. Harness event data pruning
Check size of `~/.claude/harness/data/`. Events older than 7 days can be pruned per the retention policy.

### 7. Orphaned file cleanup
```bash
ls tmpcodex_*.md tmp_*.* codex_*.md 2>/dev/null
```
Remove stale Codex output files and temporary files from the project root.

## Report
After completing the checklist, report what was cleaned, what was flagged for Glen, and the current environment state.
