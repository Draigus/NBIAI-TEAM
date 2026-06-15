---
proposal_id: P004
created: 2026-06-15
risk: BLOCKED_TO_APPLY
status: awaiting_glen_manual_apply
target: .claude/harness/lib/ (entropy scanner)
confidence: 90
evidence_count: 5+
---

# P004: Entropy scanner session-level deduplication

## Problem

The entropy scanner runs on every Bash/PowerShell tool use and emits a new event for each detected signal, even when the signal is identical to one emitted 5 seconds earlier in the same session. In ses_01KTYZ9J5F62K5DKPEY2, the following signals fired 20–30 times each:

- `console.log: 4 instances in added lines` (category: code, severity: 2)
- `commented-out code: 2 instances in added lines` (category: code, severity: 1)
- `New dependencies: 16 require(), 12 import statements` (category: dependency, severity: 1)

These represent pre-existing issues in the codebase being re-detected on every git operation during the session. The result: ~90 redundant events in a single session, all identical. This degrades the signal/noise ratio for the diagnosis engine and makes it harder to distinguish new issues from recurring ones.

## Evidence

entropy_trend.jsonl and ses_01KTYZ9J5F62K5DKPEY2.jsonl show repeated identical tuples (category, severity, detail) within minutes.

## Proposed fix (Glen applies manually)

In `.claude/harness/lib/` (the entropy scanner), add session-level deduplication:

1. Before emitting an entropy event, check if an event with the same `(category, detail)` tuple has already been emitted in this session (keyed by session_id from the `.session_id` file).
2. If a duplicate is found: skip emission. Optionally increment a `repeat_count` field on the first event rather than emitting a new record.
3. Reset deduplication state on new session start.

This does not affect the entropy_trend.jsonl file (which operates across sessions and uses scores/categories, not detail strings).

## Why BLOCKED_TO_APPLY

Target is `.claude/harness/lib/**` — classified BLOCKED_TO_APPLY per risk-policy.json (decision logic / engine code). Glen must apply from this description.
