---
proposal_id: P008
title: "Add numerical reframing clause to no-minimising feedback memory"
risk: LOW
target: "memory/feedback_no_minimising.md"
operation: additive_edit
constraint: frontmatter_schema_required
date: "2026-06-29"
status: pending
evidence_events:
  - "evt_01KVGQVKHS2J0K58K3ZB"
evidence_count: 1
confidence: 65
pattern: "PATTERN_F_numerical_reframing"
supporting_sessions:
  - "ses_01KVFHMZHDG48H7ZPD3K (2026-06-19)"
---

## Problem

The confirmed intervention in session ses_01KVFHMZHDG48H7ZPD3K (2026-06-19) demonstrates a minimising failure mode not covered by existing rule wording:

**What happened:** Presented an interview question bank scoring 6.97/10 average as "solidly in the solid but improvable range." Glen rejected this as "horseshit." The correct characterisation: 39% of questions need rework, and the largest discipline group is 50/50. A 39% rework rate is a 39% failure rate, not a passing score.

**Why the existing rule didn't catch it:** The existing `feedback_no_minimising.md` anti-patterns focus on _verbal phrases_ ("just", "low priority", "bonus"). The model used none of those. Instead it chose the _positive face of a numerical result_ (6.97 out of 10 sounds like a B+) while suppressing the negative face (39% failure rate). This is a structurally different failure mode: quantitative reframing rather than verbal minimising.

**Existing_rule_missed field from intervention:** `feedback_no_minimising.md` -- the rule exists but doesn't cover this case.

## Proposed Change

Additive edit to `feedback_no_minimising.md`: add a new section covering numerical reframing.

### Diff (additive)

Add after the existing "How to apply" paragraph:

```
**Numerical reframing anti-pattern:** When presenting quantitative scores, always lead with the failure count, not the pass count, when the failure rate is significant (>= 20%). "39% rework rate" is a 39% failure rate, not a 61% pass rate. "6.97/10" where 39% of items score below threshold is a failing bank, not a solid one. The positive number is not the finding. The residual risk is the finding. Frame accordingly.
```

## Apply-Gate Validation Criteria

- [x] Target is LOW risk (feedback_*.md, edit_existing, additive)
- [x] Operation is additive only (new paragraph, no removals)
- [x] Path is a memory feedback file
- [x] Frontmatter will remain schema-valid
- [ ] Confidence >= 70% threshold: FAIL -- only 1 supporting event (confidence: 65)

## Recommendation

Because confidence is below 70% (only 1 confirmed event, no corroborating signals), this proposal **requires Glen approval** before apply, per risk policy HIGH rule: "Any proposal with fewer than 3 supporting evidence events." Treat as **HIGH risk until corroborated by a second intervention of the same type**.

Glen should review the proposed addition. If approved, apply manually to `C:\Users\gpbea\.claude\projects\D--OneDrive-Claude-code-NBIAI-TEAM\memory\feedback_no_minimising.md`.

**Proposed text to insert:**

> **Numerical reframing anti-pattern:** When presenting quantitative scores or statistics, lead with the failure metric when the failure rate is significant (>= 20%). "39% rework rate" is a 39% failure rate, not a 61% pass rate. A 6.97/10 average where 39% of items need rework is a failing bank, not a solid one. The positive number is not the finding; the residual risk is the finding. Frame from what fails the bar, not what passes it.
