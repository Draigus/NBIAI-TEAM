# 2026-06-22 Maintenance Session

## Session Purpose
Full environment maintenance audit and cleanup across the NBIAI_TEAM repository.

## Work Completed

### Junk File Cleanup
- Deleted 3 rho_head_*.zip files + 2 extracted directories (RHO probe artefacts)
- Deleted undefined/ directory (path resolution bug)
- Deleted initial.txt, tmp_news_audit/, graphify-out/ (7.7MB remnant)
- Deleted corrupted-name patch file (d:tmprho_premerge_diff.patch)
- Archived 9 tmpcodex_*.md review files to _archive/codex_reviews/

### Orphaned Directory Cleanup
- Deleted _temp/ (12 dead utility scripts + old monolithic dashboard HTML + nbi-website-directions)
- Deleted src/ (empty scaffolding stubs from news-aggregator)
- Deleted tools/ (empty, no git history)
- Deleted memory/ at root (empty, distinct from ~/.claude/memory/)
- Deleted queue/done/ stale JSON item

### Branch Cleanup
- Deleted 10 safely-merged local branches: claude/clever-buck-20df50, feat/data-cleanse-tool, feature/capacity-detail-panel, feature/command-centre, feature/granola-sync, feature/people-dashboard-redesign, feature/queue-detail-panel, fix/scroll-architecture, frontend-polish, modularise-server
- PRESERVED feature/frontend-modularisation (43 unmerged commits, active worktree at nbi-modularise)
- PRESERVED feature/spa-modularise (active worktree)
- PRESERVED both stashes (WIP on command-centre and client-portal)

### NBI Brain Corrections (Glen-confirmed)
- CH headcount: ~55 updated to ~63-64 (added ~8 since baseline)
- Dino: confirmed General Counsel (departing), NOT COO. Replaced by Saybrook Legal (Riley Grabener)
- Lorenza Menna: surname corrected from "Lorenz" everywhere
- CH revenue: confirmed GBP 300K/year correct (GBP 30K/month is VAT-inclusive)
- Fractional C-level: confirmed correct (not CPO despite bank claims)
- Last Updated: 2026-04-20 updated to 2026-06-22

### Documentation Count Updates
- CLAUDE.md: server.js ~516 to ~590, routes 41 to 42, lib 20 to 21, JS modules ~30 to 35
- AGENTS.md: rewrote from monolithic (9,600-line server, 21,300-line frontend) to modular architecture. Fixed deprecated file references to match CLAUDE.md.
- dashboard-server/README.md: routes 29 to 42, lib 13 to 21, server.js ~550 to ~590, frontend rewritten from monolithic to modular description
- project_nbiai_team.md memory: routes 41 to 42, lib 20 to 21, migrations 70 to 72

### Memory File Fixes
- client_couch_heroes.md: description "UK+Greece" to "UK+Cyprus", headcount ~70 to ~63-64
- MEMORY.md index: updated CH entry and project counts

### Decisions Extraction
- Extracted decisions from 11 days (2026-06-12 to 2026-06-21) into decisions.md
- 24 dated sections added covering Saybrook Legal, deep linking, RHO harness, shell guard, interview rework, verification state machine, and more

### Intelligence Pipeline
- Reclassified 33 restricted extracts from restricted to internal (Glen approved)
- Will be compiled into banks by tonight's recompile-banks cadence run (21:30)
- 5 new bank creations approved (consulting_frameworks, competitor_watch, studio_staffing_models, salary_benchmarks, investor_database)

### Cron Investigation
- Morning brief cron is working correctly -- weekday-only schedule, last ran Friday
- Today (Monday) it fires at 07:30 -- brief will be regenerated

## Codex Adversarial Review
Codex (GPT-5.5) reviewed the initial audit and caught:
- feature/frontend-modularisation has 43 unmerged commits and an active worktree -- DO NOT DELETE
- ai_strategy HANDOFFs represent distinct workflow stages, not duplicates -- KEEP ALL
- Deprecated live_state files still referenced by AGENTS.md -- fixed AGENTS.md
- tmpcodex files contain RHO review evidence -- archived, not deleted
- Codex also committed d69592a (git-push.js Gate 5 scoping + dashboard scripts) and pushed

## Remaining for Next Session
- Commit all staged changes (tests flaky on FK constraint, need clean run)
- Delete origin/claude/slack-session-f9gyyf (runtime telemetry, shouldn't be tracked)
- Create 5 new intelligence banks
- Verify 14 stale brain modules (all except financial_resilience.md at 35-37 days)
- Memory consolidation (70 entries vs 25 threshold)
- Dedicated session for "do not touch" items (worktrees, stashes)
