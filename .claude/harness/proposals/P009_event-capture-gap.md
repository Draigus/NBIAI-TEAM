---
proposal_id: P009
title: "Investigate event capture gap: no events recorded 2026-06-20 through 2026-06-29"
risk: BLOCKED_TO_APPLY
target: ".claude/harness/lib/**"
operation: investigation_required
date: "2026-06-29"
status: pending_glen_review
evidence_events: []
evidence_count: 0
confidence: 90
pattern: "PATTERN_G_event_capture_gap"
---

## Problem

The event capture system recorded no events for the period 2026-06-20 through 2026-06-29 (10 days, 13+ active sessions visible in session logs). The only event file in this window is the namespaced `NBIAI_TEAM_aeb5ed/events/2026-06-19/ses_01KVFHMZHDG48H7ZPD3K.jsonl`, which itself was NOT captured in the prior diagnosis despite covering activity on 2026-06-19.

This is a harness infrastructure failure, not a quiet period. Session logs confirm heavy activity:
- 2026-06-20: VSM post-hardening session
- 2026-06-21: Multiple sessions (Codex review, session, session_2, session_b)
- 2026-06-22: Multiple sessions (art rework, maintenance, session, session_2)
- 2026-06-23 through 2026-06-29: AIOS design, Phase 1 planning, Codex reviews

**None of this generated harness events.** The weekly diagnosis is therefore working from a 10-day blind spot.

## Likely Causes

1. **Namespace routing change:** The session `ses_01KVFHMZHDG48H7ZPD3K` landed in `NBIAI_TEAM_aeb5ed/` while all prior sessions used the root `events/` path. This suggests the project slug hashing changed around 2026-06-19, and the PostToolUse event writer may now be routing to a namespaced path that the diagnosis routine doesn't scan.

2. **Bootstrap drop (M7):** The harness spec notes that bootstrap metadata is sometimes dropped. If the session bootstrap is failing silently, no events are emitted.

3. **Hook disconnect:** The PostToolUse hooks may have been inadvertently modified during the VSM hardening sessions (blocked_writes.jsonl shows multiple write attempts to `.claude/settings.json` on 2026-06-18 and attempts to write to harness lib on 2026-06-20).

## Evidence

- `blocked_writes.jsonl` line 94: `{"ts":"2026-06-18T22:56:23.290Z","path":".claude/settings.json","reason":"hook configuration protected during cadence [principal: recorder]"}`
- `blocked_writes.jsonl` lines 98-99: `{"ts":"2026-06-20T16:26:35.117Z","path":".claude/harness/lib/verification-state.js","reason":"BLOCKED_TO_APPLY"}`
- Event directory listing shows no dates after 2026-06-19 in main path
- `NBIAI_TEAM_aeb5ed/` namespace path appeared 2026-06-19 (not present in prior dates)

## Impact

The weekly diagnosis is operating on 10-day-old event data. Any pattern that emerged or resolved in this period is invisible. The 2026-06-29 health report cannot make confident pattern-resolution claims.

## Required Action (Glen)

1. Run `node .claude/harness/lib/check-hooks.js` (if it exists) or manually verify `.claude/settings.json` PostToolUse hooks are registered and pointing to the correct event writer path.
2. Check whether the event writer is routing to `NBIAI_TEAM_aeb5ed/` or the root path -- both should be scanned by the diagnosis routine.
3. Confirm the AIOS sessions from 2026-06-20 to 2026-06-29 generated any events, or whether bootstrap is silently failing.
4. If namespace routing changed: update the diagnosis routine's scan path to include `NBIAI_TEAM_aeb5ed/events/` alongside the root `events/` directory.

## Classification

BLOCKED_TO_APPLY -- fix requires changes to `.claude/harness/lib/` (event writer, diagnosis scanner). Glen must investigate and apply manually.
