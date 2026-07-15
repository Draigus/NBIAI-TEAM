---
name: bug-sweep
description: "Run the 7-step Bug Triage Pipeline across open bugs in the tracker. Queries bug_reports for open items, orders quick-wins-first, runs Receive/Review/Plan/Prioritise/Fix/Test/Update per bug, commits as single batch. Non-Fable models must complete all 7 steps per bug with no batched dismissals. Use when: work the bugs, fix the bugs, bug sweep, bug batch, triage bugs, clear the tracker, bug reports."
user-invocable: true
argument-hint: "[filter] -- e.g. all open, or just the P1s"
---

# Bug Sweep Pipeline

Systematically work through bug tracker items using the 7-step Bug Triage Pipeline.

## Model Tier Check

**Fable tier:** May batch obvious quick-wins (typos, CSS, copy changes) with abbreviated Review/Plan steps. Must still complete Fix/Test/Update for each.

**Strict tier (non-Fable):** Every bug gets ALL 7 steps individually. No batching, no abbreviated steps, no "this is obviously X" shortcuts. Each bug is a separate investigation per the process-not-checkbox rule.

## Protocol

### Step 1: Query the tracker

```sql
SELECT id, title, description, status, created_at 
FROM bug_reports 
WHERE status NOT IN ('resolved', 'closed', 'wont_fix')
ORDER BY created_at ASC
```

Report the count and list titles to Glen before starting.

### Step 2: Order by effort (quick-wins first)

Scan titles and descriptions. Sort into:
- **Quick wins:** typos, CSS, copy changes, obvious one-line fixes
- **Medium:** logic bugs, missing validation, UI behaviour issues
- **Large:** architecture issues, multi-file changes, new features mislabelled as bugs

Work quick-wins first, then medium, then large.

### Step 3: Per-bug pipeline (7 steps)

For EACH bug, in order:

1. **Receive** -- Read the full title, description, and existing comments
2. **Review** -- Find the relevant code. Read enough to understand the issue. If ambiguous, ask Glen BEFORE planning.
3. **Plan** -- State what files will change, what the fix is, and what could go wrong
4. **Prioritise** -- Confirm the bug's position in the sweep order
5. **Fix** -- Implement the change. Test-first for server endpoints.
6. **Test** -- Run `npm test` and `npm run test:all` if frontend was touched. Both must be green.
7. **Update** -- Set status to `please_review`. Add a comment that:
   - Starts with "Fixed." or "Done."
   - Explains root cause in plain English
   - Explains what changed behaviourally
   - Ends with "Please test by..." and a reproduction step

### Step 4: Batch commit

After ALL bugs in the sweep:
- Single commit referencing each bug ID
- Restart PM2 if server files changed (use the `deploy` skill)
- Update session log with work completed

## Hard Rules

- Never mark a bug as resolved without a passing test run
- Never skip the comment format (root cause + behavioural change + reproduction step)
- Never batch-resolve bugs without individual investigation
- `please_review` bugs are for the team to close, not Glen
- If a bug is actually a feature request, say so and assess whether it is an obvious quality improvement. Implement if yes, flag for Glen if no.
