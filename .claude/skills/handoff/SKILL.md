---
name: handoff
description: "Write a full context handoff when approaching context limits or pausing work. Stops background tasks, writes to docs/HANDOFF.md with file paths, completed work, remaining tasks, decisions, verification state, and resume sequence. Triggers at 30% context on Fable, 25% on non-Fable. Use when: handoff, context limit, wrap up, save progress, end session, too much context, running out of context."
user-invocable: true
---

# Context Handoff

Write a complete handoff so the next session can pick up cold with zero questions.

## Model Tier Check

**Fable tier:** Trigger at ~30% context usage (~300k tokens).

**Strict tier (non-Fable):** Trigger at ~25% context usage (~250k tokens). Less trust in quality under context pressure.

Both tiers: if you are unsure whether you have hit the threshold, you have. Write the handoff.

## Protocol

### Step 1: Stop background work

Before writing anything:
- Check for running background tasks or agents
- Stop them (they will resurrect and race the successor session)
- Verify no background processes are still active

### Step 2: Write HANDOFF.md

Write to `docs/HANDOFF.md` with ALL of the following sections:

```markdown
# Handoff -- [DATE]

## What session was doing
[One paragraph: the goal, the approach, where in the process]

## Completed
[Bullet list: every file changed, every commit SHA, every feature verified]

## Remaining
[Bullet list: what is left, in execution order, with file paths]

## Decisions made this session
[Bullet list: every Glen directive, with exact quotes where relevant]

## Current state
- Branch: [branch name]
- Last commit: [SHA + message]
- Dirty files: [list or "clean"]
- PM2 status: [running/stopped for each service]
- Test status: [last run result]

## Verification state
[What is verified, what is not, what evidence exists]

## Resume sequence
[Exact steps for the next session, in order:
1. Read this file
2. Read [specific files]
3. Check [specific state]
4. Continue with [specific task]]
```

### Step 3: Update session log

Append handoff entry to today's session log.

### Step 4: Tell Glen

"Handoff written to docs/HANDOFF.md. Start a new session and say: pick up from the handoff."

## Hard Rules

- NEVER push past the trigger point. Do not squeeze in "one more thing."
- NEVER write a vague handoff. Every file path, every SHA, every decision.
- The resume sequence must be specific enough that a model with zero context can follow it mechanically.
- Do not ask Glen whether to write a handoff. Write it. The trigger is mechanical, not a judgement call.
