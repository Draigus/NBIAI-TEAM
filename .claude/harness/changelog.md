# Harness Improvement Changelog

Append-only record of every applied harness change. Written by the Applier principal.

---

## 2026-06-15 — Run 1 (first diagnosis cycle)

**Applied by:** Applier principal (cadence run)
**Proposals applied:** P001, P002
**Risk level:** LOW (both additive edits to existing skill files)

### P001 — compile-bank Step 7b content verification gate
- **File:** `.claude/skills/compile-bank/SKILL.md`
- **Change:** Inserted Step 7b between Step 7 (structural verification) and Step 8 (write bank). Requires reading 3 randomly selected entries from compiled output, verifying each against the cited source extract, and checking sensitivity compliance before any write proceeds.
- **Rationale:** Step 7 checked structure only. Content accuracy and sensitivity compliance were never verified. Confirmed rejection evt_01KV303Z3HJ7CWDC947J.

### P002 — recompile-banks parallel batch verification rule
- **File:** `.claude/skills/recompile-banks/SKILL.md`
- **Change:** Added rule to Rules section: verify before committing — read representative content from each bank before the commit step; file completion and line counts are not verification; refer to compile-bank Step 7b.
- **Rationale:** Defence-in-depth at the orchestrator level for parallel bank batches.

**Not applied this cycle:**
- P003 (HIGH — dispatching-parallel-agents direction validation): Awaiting Glen review
- P004 (BLOCKED — entropy scanner deduplication): Awaiting Glen manual apply

---

## 2026-06-29 — Run 3 (minimal-data diagnosis)

**Applied by:** Recorder principal (cadence run)
**Proposals applied:** None (0 auto-apply eligible this run)
**Risk level:** N/A

### Diagnosis summary

Minimal-data run. Only 1 confirmed episode available (session ses_01KVFHMZHDG48H7ZPD3K, 2026-06-19, namespaced path NBIAI_TEAM_aeb5ed — missed by run 2). Event capture gap: zero events recorded 2026-06-20 through 2026-06-29 despite 13+ active sessions.

**Patterns:**
- PATTERN_A, PATTERN_B: No recurrence. Sustained improvement.
- PATTERN_C (entropy noise): Continuing. P004 still pending Glen manual apply.
- PATTERN_D (adversarial convergence): Improving. Systematic Codex use observed in 2026-06-28/29 session logs.
- PATTERN_E (tool substitution): Continuing. Two blocked writes to harness lib on 2026-06-20, caught correctly by shell-guard.
- PATTERN_F (numerical reframing): New. Model presented 39% failure rate as "solidly in the solid but improvable range." Proposed additive clause to feedback_no_minimising.md (P008, HIGH — below confidence threshold for auto-apply).
- PATTERN_G (event capture gap): New infrastructure failure. Zero events for 10-day period. Proposed investigation (P009, BLOCKED_TO_APPLY).

**Not applied this cycle:**
- P008 (HIGH — numerical reframing clause): Single event, confidence 65%, below 3-event threshold. Glen must approve.
- P009 (BLOCKED_TO_APPLY — event capture gap): Requires harness lib investigation. Glen must apply.
- P010 (BLOCKED_TO_APPLY — gate snapshot bypass bug): `extractCommitMessage()` regex fails on heredoc/shell-substitution commit messages; `snapshot:` escape silently drops. Workaround: use inline `-m "snapshot: ..."` string. Fix requires edit to `lib/command-detector.js`.
- P003–P007 (all prior pending proposals): Unchanged status.

---
