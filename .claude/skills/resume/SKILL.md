---
name: resume
description: "Resume work from a handoff file. Reads docs/HANDOFF.md, compares git HEAD vs handoff HEAD, checks PM2 processes, verifies no stale background tasks, restores context. Use when: resume, pick up, continue from handoff, start from handoff, what was I doing, pick up from the handoff."
user-invocable: true
---

# Resume from Handoff

Pick up work from a previous session's handoff with full state verification.

## Protocol

### Step 1: Read the handoff

Read `docs/HANDOFF.md`. If it does not exist, check `projects/nbi_dashboard/session_handoffs/` for the most recent file.

### Step 2: Verify state has not drifted

```bash
git log --oneline -5
```

Compare HEAD commit against the handoff's "Last commit" SHA. If they differ, investigate what changed (another session or cadence task may have run between handoff and resume).

### Step 3: Check for parallel session artifacts

```bash
pm2 list
```

Check for processes that should not be running. Look for stale lock files, orphaned background tasks, or running `npm test` processes.

### Step 4: Verify dirty state

```bash
git status
```

Compare against the handoff's "Dirty files" list. Flag any discrepancies.

### Step 5: Create session log

Create today's session log at `projects/nbi_dashboard/session_logs/YYYY-MM-DD_session.md`. First entry: what handoff was loaded, starting state, any discrepancies found.

### Step 6: Continue

Follow the handoff's "Resume sequence" exactly.

## Model Tier Check

**Strict tier (non-Fable):** Must complete ALL verification steps and report all discrepancies to Glen before doing any work. Do not proceed past a discrepancy without Glen's acknowledgement.

**Fable tier:** Same checks, but may proceed past minor discrepancies (e.g. an extra cadence commit) without stopping to ask, as long as the discrepancy is noted in the session log.
