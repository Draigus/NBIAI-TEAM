---
proposal_id: P002
created: 2026-06-15
risk: LOW
status: applied
target: .claude/skills/recompile-banks/SKILL.md
constraint: additive_only
confidence: 90
evidence_count: 3
---

# P002: Add verification rule to recompile-banks skill

## Problem

`recompile-banks` orchestrates parallel bank compilation and delegates to `/compile-bank` for each bank. With the P001 fix, compile-bank now enforces content verification per bank. However, recompile-banks itself has no explicit reminder that the orchestrating agent must not treat file completion as verification — particularly important when running 7 banks in parallel where throughput pressure is highest.

## Evidence

Same 3 evidence events as P001. The recompile-banks session (ses_01KTYFXT073SHTQFN0SH) is specifically where the parallel batch ran without content verification.

## Fix

Added a rule to the Rules section of recompile-banks SKILL.md: "Verify before committing. After all banks in a batch are compiled, the orchestrating agent must not commit until it has read representative content from each bank. Refer to compile-bank Step 7b for the verification protocol."

## Self-validation

- Is this additive? Yes — adds one rule to the Rules section at the bottom of the skill.
- Does P001 already cover this? P001 fixes the per-bank step; P002 adds defence-in-depth at the orchestrator level.
- Regression risk? None.
