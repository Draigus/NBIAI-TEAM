---
proposal_id: P005
created: 2026-06-22
risk: HIGH
status: awaiting_glen_review
target: CLAUDE.md (Codex Bridge section)
constraint: additive_only
confidence: 95
evidence_count: 2
---

# P005: Adversarial convergence discipline — multi-round minimum

## Pattern

PATTERN_D — Adversarial Convergence Process Compression

## Problem

On 2026-06-18 (ses_01KVD17V7MSP7K08654S), Glen requested adversarial convergence with Codex: back-and-forth iterations until the best answer is locked. The model ran one Codex review round, summarised the findings, and asked Glen "should I just fix the bugs?" — collapsing the multi-round iterative process to a single pass. Glen corrected (correction intervention). The model then rushed the second round without reading output carefully. Glen rejected again: "fast and sloppy is the pure essence of failure claude you are failing alot."

Two confirmed interventions in a single session. Both from the same root cause: the model treats adversarial convergence as a one-shot review tool, not an iterative debate protocol.

## Evidence

- `evt_01KVD1AD4YRKADCVAMAH` — confirmed correction, component=verification. "Ran one round of Codex review, summarised findings, asked Glen if I should just fix the bugs." Severity: correction (+3 score).
- `evt_01KVD1FDEDJDAFDZZTWT` — confirmed rejection, component=verification. "Glen said 'fast and sloppy is the pure essence of failure claude you are failing alot'" — rushing adversarial convergence. Severity: rejection (+3 score).

Note: 2 evidence events, both confirmed hard signals, in the same session. Confidence 95%.

## Proposed CLAUDE.md addition (Glen applies)

Add to the **Codex Bridge** section, after the "When to use" list:

---

**Adversarial convergence protocol (multi-round minimum)**

When Glen requests adversarial convergence (a "debate" with Codex until the best answer is locked), this is NOT a single-round review. The protocol is:

1. **Round 1:** Run Codex. Read every line of output. Respond to each finding in full — do not summarise or skip.
2. **Round 2:** Send the response back to Codex for a second pass. Read every line again.
3. **Iterate:** Continue until Codex returns no new findings. A minimum of 2 full rounds is required.
4. **Never** collapse to one round and ask Glen for direction. That wastes the process. Run the rounds.
5. **Never** rush or skim Codex output. Each round gets the same rigour as a code review.

Termination condition: Codex reports no new findings, OR Glen explicitly says "that's enough."

---

## Glen apply instructions

1. Open `CLAUDE.md`
2. Find the **Codex Bridge -- Cross-AI Adversarial Review** section
3. After the "When to use" list, insert the block above verbatim
4. Commit as: `docs(claude): P005 adversarial convergence protocol`
5. Update this proposal status to `applied` and record the commit SHA
