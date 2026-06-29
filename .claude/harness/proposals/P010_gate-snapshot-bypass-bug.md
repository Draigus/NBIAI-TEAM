---
proposal_id: P010
title: "Fix snapshot: escape failure when commit message uses shell command substitution"
risk: BLOCKED_TO_APPLY
target: ".claude/harness/lib/command-detector.js"
operation: bug_fix
date: "2026-06-29"
status: pending_glen_review
evidence_events: []
evidence_count: 1
confidence: 95
pattern: "PATTERN_G_event_capture_gap"
discovered_by: "cadence run 3"
---

## Problem

The `snapshot:` commit gate escape silently fails when the commit message is passed via shell command substitution (`-m "$(cat <<'EOF'...EOF)"`).

**Mechanism:** `extractCommitMessage()` in `lib/command-detector.js` uses the regex `-m\s+["']([^"']*?)["']` to extract the message from a git commit command. When the message is a heredoc substitution `$(cat <<'EOF'...EOF)`:

1. The raw command string reaches the hook BEFORE shell expansion
2. The regex hits `$(cat <<'EOF'` and the `'` in `<<'EOF'` terminates the non-greedy match early
3. `extractCommitMessage` returns `null` or a malformed string
4. Gate 1 evaluates `msg.startsWith('snapshot:')` where `msg` is `null` or `"$(cat <<"`
5. The check returns false and the gate blocks -- even though the expanded message legitimately starts with `snapshot:`

**Discovery:** Cadence run 3 (2026-06-29) attempted to commit harness documentation using the heredoc pattern and was blocked by the gate. Two attempts failed before the root cause was identified. Workaround applied: use direct inline `-m "snapshot: ..."` string.

## Impact

- Any harness cadence commit using the heredoc pattern (`git commit -m "$(cat <<'EOF'...)"`) silently loses the `snapshot:` escape and is blocked
- The gate gives no indication that the escape was attempted -- it just blocks with the standard "VERIFICATION GATE" message
- This creates unnecessary friction in cadence runs and may cause future operators to abandon the `snapshot:` convention or misdiagnose the gate as broken

## Proposed Fix

In `lib/command-detector.js`, `extractCommitMessage()`: add a case to detect shell command substitution in the commit message position and either:

**Option A (safe, conservative):** Return `null` when `$()` or backtick substitution is detected in the message position. Let the gate proceed without a message check (no snapshot escape, but also no false block on heredoc syntax).

**Option B (full fix):** Detect that the raw command contains a heredoc (`<<'EOF'` or `<<"EOF"`) and read the stdin/heredoc content to extract the first line, then use that for the `snapshot:` check.

Option A is safer to implement without risk of unintended gate weakening.

## Workaround

Until fixed: always pass `snapshot:` commit messages as a direct inline string:

```bash
git commit -m "snapshot: chore(example): description [cadence]

Body of message here."
```

Not as:

```bash
git commit -m "$(cat <<'EOF'
snapshot: chore(example): description
EOF
)"
```

## Classification

BLOCKED_TO_APPLY -- fix is in `.claude/harness/lib/command-detector.js` (harness engine code). Glen must apply manually.
