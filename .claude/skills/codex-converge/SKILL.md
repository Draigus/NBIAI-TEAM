---
name: codex-converge
description: "Adversarial convergence loop with Codex (GPT-5.5). Runs codex review or exec, parses findings, fixes all severities, re-reviews until clean pass. Auto-triggers for multi-file plans and code (3+ files on Fable, 2+ on non-Fable), harness and security changes, and client deliverables. Model-tiered: non-Fable requires 2 consecutive clean passes with shown Codex output. Use when: adversarial review, codex review, red team, convergence loop, cross-AI validation, complex plan review, verify with codex, converge."
user-invocable: true
argument-hint: "<what to converge> -- e.g. review the plan, red-team this code"
---

# Codex Adversarial Convergence

Run a Claude-proposes, Codex-red-teams convergence loop until findings reach zero.

## Model Tier Check

Check your model identity from the system prompt ("You are powered by the model named...").

**Fable tier** (model name contains "fable"):
- Triggers: 3+ files changed, harness/security code, client deliverables
- Exit: 1 clean Codex pass
- Reporting: summarise findings and fixes

**Strict tier** (Opus 4.6, 4.8, Sonnet, or any non-Fable model):
- Triggers: 2+ files changed, ANY plan from writing-plans, ALL deliverables, ALL code changes beyond single-file fixes
- Exit: 2 consecutive clean Codex passes
- Reporting: show full Codex output to Glen, do not summarise away findings
- Additional: do NOT self-certify convergence. The Codex output is the evidence, not your summary of it.

## Protocol

### Step 1: Determine review type

- **Code changes** (dirty working tree or recent commits): use `codex review --uncommitted` or `codex review --base master`
- **Plans or specs** (document review): use `codex exec "Review this plan for gaps, contradictions, missing edge cases, and scope issues: [paste or reference the plan]"`
- **Client deliverables** (factual accuracy): use `codex exec "Adversarially verify every factual claim in this document. Flag anything that could be wrong, unverified, or misleading: [reference the document]"`

### Step 2: Run Codex

```bash
codex review --uncommitted
```
or
```bash
codex exec "<prompt>"
```

Wait for completion. The output lands as `tmpcodex_*.md` in the project root.

### Step 3: Read and parse findings

Read the `tmpcodex_*.md` file. Look for:
- Explicit PASS/FAIL verdict
- Severity markers (CRITICAL, HIGH, MEDIUM, LOW)
- Specific file:line references
- Factual challenges or contradictions

### Step 4: Fix ALL findings

Fix every finding. No severity filtering. No deferral. No "low-impact" dismissals.

After fixing, delete the old `tmpcodex_*.md` file to avoid confusion with the next round.

### Step 5: Re-run Codex

Run the same review command again. Read the new output.

### Step 6: Evaluate exit criteria

**Fable tier:** If the new review is clean (no findings, explicit PASS, or "no issues found"), convergence is complete. Report the round count and move on.

**Strict tier:** Track consecutive clean passes. You need 2 in a row. If Round N is clean but Round N-1 had findings, run Round N+1 to confirm. Only exit after 2 consecutive clean rounds.

### Step 7: Report

State:
- Total rounds run
- Findings per round (count and categories)
- What was fixed
- Final Codex verdict

On strict tier: include the full text of the final clean Codex output, not a summary.

## Hard Rules

- Never skip a round because you think the findings are wrong. Fix them or demonstrate to Glen why they are incorrect.
- Never claim convergence without a clean Codex pass. "I fixed everything" is not convergence. A clean Codex pass is convergence.
- Never substitute a Claude subagent for Codex. If Codex is unavailable, say so. Do not silently self-review.
- Maximum 10 rounds. If you hit 10 without convergence, stop and escalate to Glen with a summary of what is not converging.
- Clean up `tmpcodex_*.md` files after convergence is complete.

## Automatic Triggers

This skill fires automatically per the mandatory-skill table in CLAUDE.md. You do not wait for Glen to ask for it. When the trigger conditions are met (based on your model tier), announce "Running Codex adversarial convergence" and begin.

If Glen says "skip codex" or "that's enough", stop the loop. Glen's override is absolute.
