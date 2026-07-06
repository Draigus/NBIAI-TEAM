---
proposal_id: P011
title: "Feedback memory: planned-future events must not flip to accomplished-past without verification"
risk: LOW
target: "memory/feedback_tense_flip_guard.md"
operation: create_new
constraint: frontmatter_schema_required
date: "2026-07-06"
status: pending
evidence_events:
  - "evt_01KWP9ZQHAHSCXD657TK"
evidence_count: 1
confidence: 60
pattern: "PATTERN_H_tense_flip_fabrication"
supporting_sessions:
  - "ses_01KWNAS8FEJ8QM7PW3CR (2026-07-04)"
---

## Problem

On 2026-07-04, Glen rejected the morning brief as "mostly useless" with "actions partially made up." The confirmed fabrication: Dino was stated as "departed 30 June 2026, knowledge transfer complete" in 3 Brain files. Dino had NOT departed. The Brain contained a planned future event ("Dino departing 30 June 2026") and when the calendar date passed, the cadence routine silently converted the planned event to an accomplished fact. No verification event confirmed the departure actually occurred.

This is a structurally distinct failure mode from general verification skipping. The model didn't skip a check -- it applied a seemingly logical inference (date passed, therefore event occurred) that happens to be wrong for events involving human decisions, which can be delayed, cancelled, or renegotiated.

**Existing_rule_missed field from intervention:** `feedback_verify_before_generate.md, feedback_no_fabricated_analysis.md`

## Root Cause

Future-dated facts in Brain files have an implicit "planned" qualifier. When the calendar date passes, the qualifier should remain until a verification source (meeting note, Slack message, Glen statement, email) confirms the event occurred. Calendar passage alone is not evidence.

## Proposed Memory

**File:** `C:\Users\gpbea\.claude\projects\D--OneDrive-Claude-code-NBIAI-TEAM\memory\feedback_tense_flip_guard.md`

**Content:**
```markdown
---
name: tense-flip-guard
description: Future-dated Brain facts must not flip to past-tense accomplished claims when the calendar date passes without verification
metadata:
  type: feedback
source: harness_rho
auto_generated: true
created: 2026-07-06
---

When the Brain contains a future-dated event (e.g. "Dino departing 30 June 2026", "Series B closing Q3"), do NOT convert it to past tense ("Dino departed", "Series B closed") when the calendar date passes. Calendar passage is not evidence that a human-dependent event occurred.

Before flipping any future-dated fact to past tense, require a verification source: a meeting note, Slack message, email, Glen statement, or other primary source confirming the event actually happened. If no source exists, carry the item as "planned for [date], unconfirmed" and flag it for Glen's attention.

**Why:** On 2026-07-04, a cadence routine converted "Dino departing 30 June 2026" to "departed 30 June 2026, knowledge transfer complete" across 3 Brain files. Dino had not departed. The fabrication reached Glen via Slack morning brief. Intervention classified as rejection.

**How to apply:** Any time you process Brain deltas, intelligence bank entries, or brief generation involving dated events, check whether the source of the "accomplished" claim is calendar arithmetic or an actual verification event. Calendar arithmetic alone = keep as planned/unconfirmed.

[[feedback_verify_before_generate]]
[[feedback_no_fabricated_analysis]]
```

## Apply-Gate Validation Criteria

- [x] Target is LOW risk (feedback_*.md, create_new, frontmatter schema present)
- [x] Operation is additive only (new file, no existing file modified)
- [x] Path is a memory feedback file
- [x] Frontmatter schema: name, description, metadata.type -- present
- [ ] Confidence >= 70% threshold: FAIL -- only 1 supporting event (confidence: 60)

## Recommendation

Confidence is below 70% (1 confirmed event). Per risk policy HIGH rule ("Any proposal with fewer than 3 supporting evidence events"), this should be treated as **HIGH risk until corroborated**. However, the single event involved a fabrication that reached a client-facing channel (Slack DM to Glen), making the severity high enough to warrant Glen's manual review and apply.

Glen should review the proposed memory text above. If approved, create the file manually at the target path and add an index entry to MEMORY.md.
