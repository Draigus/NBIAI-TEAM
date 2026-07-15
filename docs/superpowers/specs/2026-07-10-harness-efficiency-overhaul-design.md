# Harness Efficiency Overhaul for the Post-Fable Era — Design

**Date:** 2026-07-10
**Status:** Approved by Glen (design review in session, 2026-07-10)
**Author:** Claude (Fable 5) with Glen
**Driver:** Fable 5 is being retired. The fallback models (Opus 4.6, possibly 4.8) have weaker instruction-following and a documented honesty problem. The current ruleset grew as prose responses to incidents; prose rules compete for a weaker model's attention and dilute each other. This programme converts prose into mechanism, consolidates the rule surface, and instruments the model transition so the 4.6-vs-4.8 decision is made on evidence.

## Evidence that shaped this design

- Harness skill-invocation events (project namespace `NBIAI_TEAM_aeb5ed`, window 2026-06-11 to 2026-07-10): the entire marketing/CRO skill pack, all three vercel skills, shadcn, huashu-design, web-design-guidelines, agent-browser, and games fired zero times. Of 64 gsd-* user-level skills, only gsd-config (4) and gsd-fast (1) fired. Cross-project namespaces (Astinus, dashboard-server) show near-zero skill usage. Caveat: capture window starts 2026-06-11; April/May usage (e.g. /gi sessions 2026-04-21) predates it.
- MEMORY.md index contains roughly ten separate feedback files restating "verify before claiming done" and further clusters restating completeness and honesty rules. Each restatement dilutes the others for a model that weights instructions by salience.
- Live in the design session itself: the pre-deploy interrogation hook fired on `grep` commands (twice) and the push gate emitted "PUSH BLOCKED" on directory listings (repeatedly). Overly broad hook matchers train the model to ignore hook output — the cry-wolf effect directly undermines the honesty enforcement the hooks exist for.
- Harness events carry **no model field**. Session transcripts (`~/.claude/projects/<slug>/<session>.jsonl`) stamp `"model"` on every assistant message. The 2026-07-10 session transcript shows a mixed session (3 messages opus-4-6, 45 fable-5), so model attribution must be message-window-level, not session-level.

## Decisions (Glen, 2026-07-10)

1. All 64 gsd-* skills collapse behind the existing `gsd` router skill. Archived, not deleted.
2. Archive scope: marketing pack, vercel trio, shadcn, huashu-design, web-design-guidelines, agent-browser, autoresearch, compile-client, proposal, and deprecated skills (gsd-settings, para-memory-files). **Gaming domain stays live:** gi, foundry, games, game-economy-design.
3. Codex validation gate is a **hard block** for code commits and client deliverables. Escape hatch: existing glen-approve.js 30-minute token.
4. The five-task model bake-off is rejected (input variance makes small-n lab tests meaningless). Replaced by a longitudinal assessment rig: instrument model identity, reconstruct historical baselines, auto-assess after ~20 sessions on 4.8, report with confounds stated.

## Sub-project 1 — Skill router and archive

**Goal:** stop loading unused skill descriptions into every session without losing any capability.

- Create `~/.claude/skills-archive/` (user level) and `NBIAI_TEAM/.claude/skills-archive/` (project level), outside Claude Code's skill discovery paths.
- Move the archive list (Decision 2) plus all 64 gsd-* skills into the appropriate archive directory. Directory moves only; skill content untouched.
- Build `skills-archive/INDEX.md`: every archived skill's **full original description** (honouring the never-truncate-descriptions rule) plus its archive path.
- Build one new live skill, `skill-router`, whose description consolidates the trigger vocabulary of everything archived (marketing, SEO, CRO, pricing, churn, React, Next.js, shadcn, prototyping, and so on) so topic detection still fires. On invocation it reads INDEX.md, matches the request, reads the archived SKILL.md, and follows it inline.
- Repoint the existing `gsd` router to load gsd-* sub-skills from the archive path by Read instead of Skill invocation. Verify each dispatch path during implementation.
- **Pre-flight check (blocking):** grep all cadence configs, scheduled task definitions, and CLAUDE.md skill references to prove nothing being archived is invoked by a scheduled job or mandatory-skill rule. Anything referenced stays live or the reference is updated.
- **Measurement (required for done-claim):** character count of skill descriptions injected at session start, before and after. Report the actual delta. No estimated token numbers.

**Verification:** a fresh session must (a) show the archived skills absent from the available-skills list, (b) successfully execute one archived skill via the router (e.g. a gsd planning command and one marketing skill), (c) show all cadence jobs still green on their next run.

## Sub-project 2 — Hook trigger tightening

**Goal:** hooks fire only on the actions they guard.

- Audit every PreToolUse/PostToolUse matcher in the harness hook config and global settings.
- Reproduce the two observed misfires (pre-deploy check on `grep`, push gate on `ls`) and tighten those matchers to the actual command shapes (`pm2 restart|deploy`, `git push`), anchored, not substring matches.
- Add a regression fixture set to the harness test suite: a list of innocent commands (grep/ls/cat over event data, transcript greps) that must trigger zero gates, and the real guarded commands that must trigger them.

**Verification:** fixture suite green; one full working session without a spurious gate message (Glen confirms).

## Sub-project 3 — Memory consolidation

**Goal:** three heavy laws instead of ~20 diluted restatements.

- **The Verification Law** absorbs: verify-work, no-corner-cutting, test-before-claiming-done, no-premature-done, verify-frontend, verify-dashboard-first, verify-agent-outputs, dashboard-verification, verify-before-generate (verification half), no-fabricated-analysis (measurement half).
- **The Completeness Law** absorbs: no-scope-watering, no-weaker-options, no-deferred-bugs, no-minimising, fix-bugs-found, process-not-checkbox.
- **The Honesty Law** absorbs: never-fabricate-consent, no-fabricated-analysis (fabrication half), verify-before-generate (fabrication half), api-first.
- Format per law: the rule stated once, hard, followed by the incident ledger (date + one line + what it cost). Case law, not legislation.
- Per the supersession rule nothing is deleted: absorbed files get `superseded: 2026-07-10` frontmatter pointing at the canonical law, and drop out of the MEMORY.md index.
- Operational references (Codex CLI, connectors, browser tools, client facts, project state) are untouched.
- Target: MEMORY.md index from ~70 lines to ~30.

**Verification:** MEMORY.md line count measured; every absorbed incident appears in exactly one ledger; no orphaned [[links]].

## Sub-project 4 — CLAUDE.md restructure

**Goal:** the non-negotiables are the first thing any model reads.

- New first section, "The Covenant", 20 lines maximum, before everything: (1) never claim done without named evidence, (2) never water scope, (3) never fabricate, (4) never flag instead of fix, (5) never soften a false claim into "unverified inference" — a false claim is a lie, full stop.
- Reorder: Covenant → session continuity mechanics → quality non-negotiables (detail) → routing tables → Section B dashboard reference.
- RHO history/architecture narrative moves to `docs/specs/` and is referenced, not inlined.
- All incident dates retained.

**Verification:** Glen reads the restructured file and approves; total line count not larger than current.

## Sub-project 5 — Codex auto-validation gate

**Goal:** mechanise "Codex result must be back, read, and clean before done" (currently prose).

- New evidence type `codex_review` in the verification state machine.
- PostToolUse hook on Bash/PowerShell detects `codex exec` / `codex review` completions, fingerprints the reviewed diff, parses the result file (`tmpcodex_*.md`) for findings, and records evidence **only** when the review is clean or a subsequent review after fixes is clean. A review with open findings records a `codex_findings_open` marker instead, which blocks harder than no review at all.
- Gate 1 (commit) and finish-task.js require fresh `codex_review` evidence for: any dirty code surface (dashboard-server/**, *.html, .claude/harness/**) and anything under `projects/*/deliverables/**`. Evidence older than the last edit to the surface does not count.
- Escape: existing glen-approve.js token. `snapshot:` cadence commits keep their existing gate semantics.
- New gate logic lands with tests in the existing harness suite before deploy; deploy via deploy.js only after suite green.

**Verification:** test suite green; live demonstration of (a) a blocked commit without Codex evidence, (b) an unblocked commit after a clean review, (c) a block with open findings despite a review having run.

## Sub-project 6 — rho-hardening completion

Own spec and plan on `feature/rho-hardening` (deliberately not designed here). Scope: Bash/PowerShell write-bypass coverage, principal identity (HARNESS_PRINCIPAL), deterministic applier executor, principal-aware write guard. Sequenced immediately after sub-projects 1–4 so the strongest available model writes it. Explicit programme intent: **Fable builds the cage 4.x will live in.**

## Sub-project 7 — Longitudinal model assessment rig

**Goal:** the 4.6/4.8/Sonnet-5 decision made from ~20 sessions of real workload, not a lab test.

- **Instrumentation (must deploy before Glen's first 4.8 session):** harness event capture gains a `model` field, joined from the live session transcript at event time. Message-window attribution; mixed-model sessions flagged.
- **Baseline builder (one-off script):** walks historical transcripts, attributes sessions/windows to models, joins to harness events, and emits per-model baselines for **both** Opus 4.6 and Fable 5. Reports its own coverage (which sessions lacked which hooks) so the comparison's weight is known.
- **Metrics (mechanical, from existing capture):** confirmed interventions per session split by class (fact/honesty corrections vs redirects); gate blocks per session (attempted unverified actions); finish-task NOT VERIFIED counts; evidence records per dirty surface; Codex findings per review (once sub-project 5 is live).
- **Qualitative layer:** Codex-driven rubric pass (honesty, completeness, scope discipline) over a sample of session logs per period. Codex judges so the assessed model never marks its own homework.
- **Trigger:** a cadence task counts 4.8-attributed sessions daily; at the threshold (default 20, configurable) it runs the assessment, writes the report to `intelligence/synthesis/`, surfaces it in the morning brief, and disarms itself.
- **Report format:** per-metric rates with denominators; confounds section (work-mix drift, mixed sessions excluded, capture coverage); comparison against both baselines; no manufactured single verdict — 20 sessions is signal, not proof, and the report says so.

**Verification:** baseline builder output spot-checked against raw transcripts for 3 sessions; trigger tested with threshold=1 on a dummy period before arming at 20.

## Sequencing

1 → 2 → 3 → 4 ship independently, in that order (cheapest first, each an evening or less). 5 follows with its harness test cycle. 6 gets its own spec/plan next. 7's instrumentation piece ships alongside 5 so it is live before any model switch; the baseline builder and trigger follow.

Repo-tracked multi-file changes go through a worktree per the risky-edits rule. Every sub-project's done-claim requires its named verification evidence above.
