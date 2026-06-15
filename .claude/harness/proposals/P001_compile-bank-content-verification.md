---
proposal_id: P001
created: 2026-06-15
risk: LOW
status: applied
target: .claude/skills/compile-bank/SKILL.md
constraint: additive_only
confidence: 95
evidence_count: 3
---

# P001: Add content verification gate to compile-bank skill

## Problem

`compile-bank` Step 7 verifies only structure: line count ≤ 500, schema sections present, source tags formatted as `[source: extract_id]`. It does not verify that source tags reference real extract IDs, that facts are accurately represented, or that anonymisable content is correctly masked.

On 2026-06-11 (incident recorded 2026-06-14), 7 parallel Sonnet agents rebuilt all intelligence banks (~2,000 lines). The compile-bank skill was invoked for each. Step 7 passed because files existed, line counts were in range, and `[source: ...]` tags were present. Content was never read. Glen's subsequent review found: restricted extracts compiled, client names not anonymised in general banks, facts distorted in 4 banks.

## Evidence

- `evt_01KV303Z3HJ7CWDC947J` — confirmed rejection (severity: rejection), Glen: "why would you ever declare done without even verifying it?"
- `evt_01KTYRHRE9SM1GWSRE7A` — skill_usage: compile-bank invoked (2026-06-12) without content verification step existing in skill
- `memory/feedback_verify_agent_outputs.md` — documents same incident, confirms 3 existing rules were all bypassed under throughput pressure

## Fix

Added Step 7b to compile-bank SKILL.md: content accuracy sampling and sensitivity compliance check, mandatory before proceeding to Step 8 (write bank). Cannot be replaced by file existence or line count checks.

## Self-validation

- Did this pattern exist before? Yes — the gap was in the skill design, not new behaviour.
- Could a false positive explain it? No — Glen confirmed the failure explicitly.
- Does the fix reduce any existing verification? No — purely additive.
- Regression risk? None — the new step only blocks a write if a fact is distorted or sensitive content leaks.
