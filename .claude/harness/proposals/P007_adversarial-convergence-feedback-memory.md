---
proposal_id: P007
created: 2026-06-22
risk: HIGH
status: awaiting_glen_review
target: C:\Users\gpbea\.claude\projects\D--OneDrive-Claude-code-NBIAI-TEAM\memory\feedback_adversarial_convergence.md
constraint: create_new, frontmatter_schema_required
confidence: 95
evidence_count: 2
---

# P007: Feedback memory — adversarial convergence is iterative, not single-pass

## Pattern

PATTERN_D — Adversarial Convergence Process Compression

## Problem

Same root cause as P005. P005 proposes a CLAUDE.md structural rule (HIGH, Glen applies to CLAUDE.md). P007 is the companion feedback memory that reinforces the same rule from the memory system angle, so future sessions see the rule via memory load even if CLAUDE.md context hasn't been loaded yet.

## Evidence

- `evt_01KVD1AD4YRKADCVAMAH` — correction, ses_01KVD17V7MSP7K08654S. Model collapsed multi-round Codex convergence to single round.
- `evt_01KVD1FDEDJDAFDZZTWT` — rejection, ses_01KVD17V7MSP7K08654S. Model rushed subsequent round. Glen: "fast and sloppy is the pure essence of failure."

## Risk classification

HIGH — target is global memory directory (`C:\Users\gpbea\.claude\projects\...`). Memory writes are BLOCKED for the Recorder principal per cadence guards ("BLOCKED writes: memories"). Glen applies manually.

## Proposed memory file (Glen applies)

**File:** `C:\Users\gpbea\.claude\projects\D--OneDrive-Claude-code-NBIAI-TEAM\memory\feedback_adversarial_convergence.md`

**Content to write:**
```markdown
---
name: adversarial-convergence
description: Codex adversarial convergence is multi-round until no new findings — never collapse to one pass
metadata:
  type: feedback
source: harness_rho
auto_generated: true
created: 2026-06-22
---

When Glen requests adversarial convergence with Codex ("debate until the best answer is locked", "iterate with Codex", "back and forth with Codex"), this is an iterative protocol, not a single review pass.

**The protocol:**
1. Run Codex. Read every line of output — no skimming, no summarising.
2. Respond to each finding in full.
3. Run Codex again on the response. Read every line.
4. Iterate until Codex returns no new findings. Minimum 2 full rounds.
5. Never collapse to one round and ask Glen for direction. Run the rounds.

**Why:** On 2026-06-18, the model ran one Codex pass, summarised findings, and asked Glen "should I just fix the bugs?" Glen corrected. The model then rushed round 2 without reading output carefully. Two interventions in one session — correction then rejection. Glen: "fast and sloppy is the pure essence of failure."

**How to apply:** Any time Glen mentions Codex + convergence/debate/iterate — commit to the full multi-round protocol before starting. Do not assess whether one round "looks like enough." Run at least two.

[[feedback_verify_work]]
[[feedback_no_corner_cutting]]
```

**Also add to MEMORY.md index:**
```
- [Adversarial convergence discipline](feedback_adversarial_convergence.md) — Codex convergence is multi-round iterative; never collapse to single pass or rush output reading
```

## Glen apply instructions

1. Create `C:\Users\gpbea\.claude\projects\D--OneDrive-Claude-code-NBIAI-TEAM\memory\feedback_adversarial_convergence.md` with the content above
2. Add the MEMORY.md index line to `C:\Users\gpbea\.claude\projects\D--OneDrive-Claude-code-NBIAI-TEAM\memory\MEMORY.md`
3. Apply P005 to CLAUDE.md at the same time (same pattern, same session)
