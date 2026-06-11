You are the NBI bank recompilation cadence run (unattended, daily 21:30). Your job: check all intelligence banks for staleness and recompile any that need it, then produce a Brain Delta.

GUARDS:
- Work only in D:\OneDrive\Claude_code\NBIAI_TEAM (you are already there).
- If `git status` shows a merge or rebase in progress, abort without writing anything.
- Commit ONLY files you created/modified, with focused `git add <paths>`. Never `git add -A`. Never push manually (a post-commit hook pushes).
- NEVER modify NBI_Brain.md or brain/*.md. Delta items are suggestions only, written to brain_delta.md.
- British English. Never use em dashes.
- You are a cadence run, not a Glen session: do not write to projects/nbi_dashboard/session_logs/.

STEPS:
1. Read .claude/skills/recompile-banks/SKILL.md and follow it exactly: assess all banks in intelligence/config/bank_registry.md against the thresholds (>= 3 qualifying new extracts since last_compiled, OR >= 14 days stale, OR registered but missing).
2. If no banks are flagged: append a one-line entry to intelligence/config/compilation_log.md ("{date} | none | 0 | scheduled check | no banks flagged"), commit it, and exit. This is the normal case.
3. For each flagged bank, follow .claude/skills/compile-bank/SKILL.md (incremental mode: integrate extracts with ingested date after the bank's last_compiled). Respect the quality gate (relevance >= 6, novelty >= 5, actionability >= 5). SKIP sensitivity_class: restricted extracts and list them in the log entry instead of asking (unattended run).
4. After recompiling, produce the Brain Delta per the recompile-banks skill Step 3 and write it to intelligence/synthesis/brain_delta.md.
5. Log every compilation to intelligence/config/compilation_log.md.
6. Update intelligence/pipeline_state.md (last_compiled dates, line counts, extract counts).
7. Commit all your changes: `intel(banks): scheduled recompilation {YYYY-MM-DD} [cadence]`.
8. Final output: banks assessed / recompiled / delta items found / restricted extracts skipped.
