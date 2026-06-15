---
proposal_id: P003
created: 2026-06-15
risk: HIGH
status: awaiting_glen_review
target: .claude/skills/dispatching-parallel-agents/SKILL.md
constraint: additive_only
confidence: 75
evidence_count: 1
---

# P003: Add direction-validation gate to dispatching-parallel-agents skill

## Problem

On 2026-06-14, session ses_01KV3ZZNJET4QG5ZCNHH resumed from a handoff and launched 20+ research agents (Gartner, McKinsey, Forrester, DORA, NPV frameworks) without confirming the direction with Glen. Glen explicitly rejected the approach repeatedly across 10+ messages. The session continued launching agents in the wrong direction instead of stopping.

The dispatching-parallel-agents skill has no pre-dispatch gate for "is this a resumption?" and no abort protocol for "Glen has rejected the approach."

## Evidence

- `evt_01KV43YFAXR2F7PY8PBV` — confirmed rejection (severity: rejection), component: context. "Session blindly followed a handoff written by a failed previous session... Glen explicitly said the handoff was wrong... Session kept going in the wrong direction despite clear corrections. Massive token waste on irrelevant research."

Note: 1 evidence event only — below the 3-event threshold for auto-apply. Glen review required.

## Proposed addition

Add to the dispatching-parallel-agents skill, before the dispatch step:

**Resumption check:** If this dispatch is triggered by resuming from a handoff (i.e., the current session did not generate the plan being executed), confirm the direction with Glen before launching agents. One sentence is enough: "Resuming [handoff summary] — is this still the right direction?" Do not assume the handoff is valid.

**Direction rejection protocol:** If Glen rejects the approach at any point — before OR after agents are launched — STOP immediately. Do not launch further agents. Ask Glen what he wants instead. A single correction from Glen is sufficient signal to abort the plan, not an invitation to try a variation of the same approach.

## Glen action required

Review the proposed addition above. If approved, the Applier will edit `.claude/skills/dispatching-parallel-agents/SKILL.md` with this content (additive only).
