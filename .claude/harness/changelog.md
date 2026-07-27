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

## 2026-07-27 — Run 7

**Applied by:** Cadence routine (Recorder with Applier auto-apply, apply-gate validated)
**Proposals applied:** P013, P014
**Risk level:** LOW (both new feedback memory files)

### P013 — Deliverable form brainstorming gate
- **File:** `memory/feedback_deliverable_form_gate.md` (new)
- **Change:** Created feedback memory requiring brainstorming invocation before client deliverables with canonical visual forms. Checklist: output format, visual form, brand source, data freshness. Org chart boxes = role + person only, zero editorial.
- **Rationale:** 4 interventions across 2026-07-23/24: CH org chart rejected 3 times (wrong format, wrong form, stale data), CTO deck rejected for invented brand. Brainstorming was mandatory but never invoked (0 invocations this period).
- **Evidence:** evt_01KY7KK8, evt_01KY7WRV3K, evt_01KY9X59, evt_01KYA1SH (4 events, 92% confidence)

### P014 — Partial computation display principle
- **File:** `memory/feedback_partial_computation.md` (new)
- **Change:** Created feedback memory: when a data pipeline fails at step N, display computable outputs from steps 1..N-1 instead of gating the entire surface. "Blocked on user input" must specify exactly which outputs are blocked.
- **Rationale:** Monthly Costs rejected twice (2026-07-23/24): on-cost missing for CH, but base monthly costs (salary/12, FX) were computable for 28/30 roles. Model gated all display, then shipped honesty labels instead of numbers, then projected costs for unhired roles from month 1.
- **Evidence:** evt_01KY919S, evt_01KYA589 (2 events, 80% confidence)

**Not applied this cycle:**
- P012 (HIGH — model identity mechanical check): URGENCY ELEVATED. PATTERN_J recurred (Opus 4.6 session not flagged). Glen must review.
- P003, P006, P008, P011 (pending Glen review): Unchanged status.
- P004, P010 (BLOCKED_TO_APPLY): Unchanged status.
- P005, P007, P008, P009 recommended for closure.

---
