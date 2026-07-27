---
proposal_id: P014
title: "Partial computation display principle"
risk: LOW
target: "memory/feedback_partial_computation.md"
operation: create_new
constraint: frontmatter_schema_required
date: "2026-07-27"
status: auto_apply_candidate
evidence_events:
  - "evt_01KY919SV2HV2XG9VEYY"
  - "evt_01KYA589VXSTAM9AFJNN"
evidence_count: 2
confidence: 80
pattern: "PATTERN_L_partial_blockage_overgeneralisation"
supporting_sessions:
  - "ses_01KY7WRV3PYDSQW9E8MB (2026-07-23)"
  - "ses_01KY968VFXJV592CHFCT (2026-07-24)"
---

## Problem

The Monthly Costs feature was rejected twice (2026-07-23 and 2026-07-24). The on-cost percentage default was missing for CH, so the model gated the ENTIRE cost display as "blocked on user input." Glen was angry: base monthly costs (salary/12 with FX conversion) were computable for 28 of 30 roles; the on-cost percentage only affects the fully-loaded figure.

The first fix shipped "honesty labels" instead of numbers. The second fix projected costs for unhired roles from month 1 of the horizon as if they were already on payroll. Both were rejected because the model treated one missing input as blocking the entire surface, instead of displaying what was computable and flagging what was not.

## Root Cause

When a multi-step computation pipeline fails at step N, the model concludes the entire feature is blocked rather than checking whether the outputs of steps 1..N-1 are independently meaningful. This is a form of over-generalisation that violates the completeness law (law_completeness.md).

## Proposed Fix

Create a feedback memory (`memory/feedback_partial_computation.md`):

1. When a feature's data pipeline has a missing input at step N, check whether outputs of steps 1..N-1 are independently meaningful and displayable
2. Display computable values; mark only the specific cells/columns that depend on the missing input
3. "Blocked on user input" claims must specify EXACTLY which outputs are blocked, not gate the whole surface
4. An unhired role cannot incur cost in months before it can plausibly be filled; cost projections must model reality

## Apply-Gate Validation

- [x] Target is LOW risk: PASS (feedback memory, create_new)
- [x] Operation is additive only: PASS (new memory file)
- [x] Confidence >= 70%: PASS (80%, 2 supporting events)
- [x] frontmatter_schema_required: PASS (will include harness_rho source tag)

## Classification

LOW risk. Auto-apply candidate. Creates a new feedback memory. The principle is general but the evidence is from a single feature; future recurrence in other features would increase confidence.
