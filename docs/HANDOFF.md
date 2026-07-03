# Handoff: Session F — 3 July 2026 (handoff-list worked top to bottom)

## State: master at `6ccf435`, all session-E carried items CLOSED except Glen's review inputs

- **Harness Set-Location fix: DONE at `7e0ea68`.** Glen approved in-session `git apply` of `docs/patches/2026-07-03-harness-set-location.patch`. Both command-detector regexes now recognise `cd|chdir|sl|set-location|pushd` (incl. `-Path`). 6 tests added (test-command-detector.js now 55/55); full harness suite 26/26 files green first-hand; deployed via deploy.js to `~/.claude/harness`; runtime probe confirmed Set-Location-prefixed commands record evidence; finish-task.js VERIFIED. Memory `project_harness_evidence_cwd.md` superseded. NEW QUIRK recorded: harness-surface evidence requires the LITERAL test path in the command (`node .claude/harness/tests/test-X.js`) — loop variables record nothing.
- **CH director reviews: COMMITTED at `5245312`** (`projects/couch_heroes/deliverables/2026-07-03-director-reviews/`). Glen ruled: Robin title = Game Director (IC, peer to Simon Woodruff); commit-to-repo approved despite sensitive HR content. STILL OWED BY GLEN: 18 ratings (6 per director) + formal review date/period — marked [GAP] in all three drafts.
- **Brain Delta: ALL 6 APPLIED at `6ccf435`** (Glen ruled apply-all). Fractional CPO (+1 Jul CPO scope), Lorenza Menna (was already applied; verified), headcount ~55-70 w/ discrepancy note (UK + Cyprus RETAINED per Glen's explicit jurisdiction correction — bank's "Greece" not adopted), revenue GBP 360K actual (supersedes 300K and the VAT-inclusive read), Dino COO departed 30 June (GC label was wrong), ClickUp wind-down Jul/Aug/Sep to Confluence/Jira (Johanna owns). Applied to NBI_Brain.md + clients_detailed.md + people_directory.md; last_verified bumped to 2026-07-03; decisions.md has the rulings; memory client_couch_heroes.md superseded.

## Outstanding — Glen's steps only

1. **CH review ratings + dates**: 18 ratings (1-5 per competency) and the review date/period for Robin/Mustafa/Graeme drafts.
2. (Renderer UAT passed in session E — no dashboard items open.)

## Repo state notes

- `scripts/cadence/state/routine_runs.json` dirty in main checkout — cadence state, leave for cadence commits.
- Nothing pushed this session; master is 3 commits ahead of the last push point recorded in session E (which was in sync at `a58c5be`) plus the intel/docs commits — run `git push` when Glen wants origin current.
- Full detail: `projects/nbi_dashboard/session_logs/2026-07-03_session_f.md`.
