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
