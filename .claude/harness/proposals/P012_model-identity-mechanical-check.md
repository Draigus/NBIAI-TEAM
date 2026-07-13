---
proposal_id: P012
title: "Mechanical model identity check at session start"
risk: HIGH
target: ".claude/hooks/session-start or CLAUDE.md session-start rules"
operation: create_or_edit
constraint: hook_behaviour_change
date: "2026-07-13"
status: pending
evidence_events:
  - "evt_01KX0R2K85Z584A2WK75"
evidence_count: 1
confidence: 75
pattern: "PATTERN_J_model_identity_check_failure"
supporting_sessions:
  - "ses_01KX06QKGMS1X4H0JH0G (2026-07-08)"
---

## Problem

On 2026-07-08, a full session (AIOS voice module build: deep research, design spec, implementation plan, 9 subagent tasks, live debugging) ran on Opus 4.6[1m] instead of Fable 5. Glen discovered this himself at session end via /model and was frustrated. The existing memory rule (feedback_no_opus_47.md: "HARD RULE: flag to Glen if session runs on it") was never executed.

The session subsequently produced 3 fabricated claims in its handoff (adjacent-evidence pattern: did something near the claim, asserted the outcome without verifying), contributing to 3 of the 5 interventions this week. Model quality directly amplified the failure surface.

## Root Cause

The model identity flag relies on the model reading and acting on a memory-file instruction at session start. When the model is a weaker one (4.6[1m]), it is precisely the model least likely to follow prompt instructions reliably -- creating a catch-22 where the guard is weakest when it matters most.

## Proposed Fix

A mechanical check that does not depend on model compliance. Two options for Glen:

**Option A (preferred): SessionStart hook** that reads the model ID from the system prompt's Environment section and injects a prominent warning into the first assistant turn if the model is not `claude-fable-5`. This is `.claude/hooks/` territory -- HIGH risk, Glen applies.

**Option B: CLAUDE.md prominence** -- move the model identity check from a memory file into the CLAUDE.md "Session Continuity -- MANDATORY" section with bolded text. Still behavioural but more prominent. HIGH risk (CLAUDE.md structural edit).

## Apply-Gate Validation

- [ ] Target is LOW risk: FAIL -- hook or CLAUDE.md edit
- [ ] Operation is additive only: FAIL -- structural change
- [x] Confidence >= 70%: PASS (75%)

## Classification

HIGH risk. Glen must review and choose an implementation path. The mechanical option (hook) provides the strongest guarantee but requires hook development. The CLAUDE.md option is faster but remains behavioural.

## Recommendation

Glen: the Opus 4.6 session produced 3 of this week's 5 interventions. The model identity check exists as a memory rule but was never executed because the model that needed to follow it was the weakest one available. A SessionStart hook would make this mechanical. Worth implementing?
