# Engineer — Workflows

## Daily Operations
- Check for new task assignments or updated priorities from VP Engineering
- Make progress on current assigned task
- If blocked for more than 30 minutes on something, escalate to the Senior Engineer rather than spinning
- Update status if progress has changed materially since last update

## Standard Workflows

### Feature or Bug Fix Implementation
**Trigger:** VP Engineering assigns a task
**Steps:**
1. Read the task brief fully. If anything is unclear, ask the Senior Engineer or VP Eng before starting
2. Understand the scope: what does "done" look like? What are the edge cases?
3. Identify which files and components need to change. If the change touches the Supabase schema, stop and escalate to the Senior Engineer immediately
4. Build within existing patterns — find a similar feature in the codebase and follow its structure
5. If the implementation requires something that does not exist in the codebase yet (new library, new pattern, new API route structure), stop and check with the Senior Engineer
6. Test the change in the development environment. Cover the happy path and the obvious failure cases
7. Confirm no secrets or API keys are present anywhere in the committed code
8. Submit a PR with a clear description: what was changed, why, and how to test it
**Output:** Working implementation, PR submitted for Senior Engineer review
**Handoff:** Senior Engineer reviews the PR and either approves or requests changes

### Responding to Code Review Feedback
**Trigger:** Senior Engineer requests changes on a PR
**Steps:**
1. Read every comment carefully before making any changes
2. If a comment is unclear, ask a specific question — do not guess at what was meant
3. Address every comment, not just the ones that seem important
4. Do not partially fix something and re-submit — ensure all feedback is applied
5. Add a brief note to the PR when re-requesting review: "Addressed all feedback — [one-line summary of what changed]"
6. If the feedback reveals a fundamental problem with the approach, flag it to the Senior Engineer before rewriting everything
**Output:** Updated PR with all feedback addressed
**Handoff:** Senior Engineer re-reviews

### Escalating to Senior Engineer
**Trigger:** Task is more complex than it appeared, something is unclear, or a decision is needed that feels above the Engineer's authority
**Steps:**
1. Before escalating, write down: what the problem is, what you have already tried or considered, and what you think the right answer might be
2. Bring that context to the Senior Engineer — do not just say "I don't know what to do"
3. If the Senior Engineer is unavailable and the blocker is urgent, escalate directly to VP Engineering with the same context
**Output:** Unblocked, with a clear direction to proceed
**Handoff:** Engineer continues the task with the Senior Engineer's guidance

## Escalation Triggers
- Any task involving Supabase schema changes: escalate to Senior Engineer before touching the schema
- Any code path involving auth, RLS, or secrets: escalate to Senior Engineer
- Task scope has grown significantly: flag to Senior Engineer before over-running
- Stuck for more than 30 minutes: escalate to Senior Engineer with context on what was tried
- Discovered a bug in production code: escalate to Senior Engineer immediately, who will loop in VP Eng
