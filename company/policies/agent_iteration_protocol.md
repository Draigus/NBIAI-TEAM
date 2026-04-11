# Agent Iteration Protocol

**Owner:** Head of People (execution) / COO (oversight)
**Approved by:** CEO
**Version:** 1.0
**Date:** 2026-03-28
**Status:** Active

---

## Purpose

When an agent produces output that is below standard, the instinctive response is often to re-run it, replace it, or activate a more expensive model. All three responses are wasteful by default. The correct response is iteration -- a deliberate, cheapest-first diagnostic process that identifies what is actually wrong and fixes it at the source.

This protocol defines: what triggers an iteration, what to change and in what order, how to test the change, how to estimate whether the iteration is worth the cost, and how to log what was learned.

---

## 1. Iteration Triggers

Not every bad output warrants a formal iteration. Sometimes the instruction was unclear, the context was missing, or the task was outside the agent's scope. Know the difference before committing to an iteration cycle.

### Triggers That Justify Formal Iteration

These issues indicate a structural problem with the agent that will recur. Iterate.

| Issue | Description | Examples |
|---|---|---|
| **Consistent tone mismatch** | The agent's outputs consistently use the wrong register, style, or voice, despite the persona being defined | American spellings, em dashes, overly casual language, generic templates -- recurring across multiple runs |
| **Systematic scope overreach** | The agent consistently does more than it is asked, activates things it should not, or produces outputs outside its remit | Senior Engineer including strategic recommendations not requested; COO making financial decisions without escalating |
| **Systematic scope underreach** | The agent consistently misses key responsibilities or produces outputs that are shallower than its role requires | QA Lead producing test plans that miss critical acceptance criteria; VP Product specs that lack implementation detail |
| **Role confusion** | The agent behaves as if it has a different role, reports to the wrong person, or does not understand its own authority | CFO making engineering decisions; Head of People commenting on architecture |
| **Knowledge gaps producing wrong outputs** | The agent consistently lacks context that should be in its Tier 2 knowledge, producing outputs that contradict NBI's actual situation | CMO recommending a strategy that conflicts with NBI's known client base; Engineer implementing against a tech stack not in use |
| **Escalation failures** | The agent consistently fails to escalate decisions it should escalate, or escalates things it should handle itself | COO making strategic decisions that require Glen approval; Producer escalating routine tracking questions to the CEO |
| **Quality gate failures** | The agent that is supposed to catch errors (QA Lead, VP Product) consistently passes substandard work | QA Lead signing off on code with known defects; VP Product approving specs with unresolved ambiguity |

### Issues That Do Not Justify Formal Iteration

These are one-off problems. Provide better instructions next time, do not iterate the agent.

- A single run produced a poor output because the task description was ambiguous
- The agent lacked specific context that was not in any knowledge file and could not be inferred
- The output was good but not exactly what was wanted -- this is a preference calibration issue, not an agent defect
- The agent made a reasonable judgement call that turned out to be wrong in this specific case

**The test:** Run the same task type three times. If the issue appears in two out of three runs with clear instructions, it is a structural problem. Iterate. If it was a one-off, improve the instruction and move on.

---

## 2. What to Iterate -- Priority Order

Always fix the cheapest thing first. Do not rewrite a persona when a knowledge file update would resolve the issue. Do not upgrade the model tier when a system prompt refinement would do the same job.

### Step 1: System Prompt (Fix This First)

The system prompt is the agent's operating instruction set. Most behavioural issues -- tone, scope, escalation behaviour, output format -- are system prompt problems.

**Fix the system prompt when:**
- The agent is doing too much or too little (scope)
- The agent's tone or style is consistently wrong
- The agent is making wrong escalation decisions
- The agent's outputs are in the wrong format for their purpose

**How to fix:** Identify the specific behaviour that is wrong. Find the instruction (or lack of instruction) in the system prompt that produces it. Add, remove, or rewrite that section. Do not rewrite the entire system prompt unless more than three distinct sections are wrong.

**File location:** `roles/{role}/prompts/system_prompt.md`

### Step 2: Persona (Fix This Second)

The persona defines who the agent is -- their identity, decision authority, communication style, and what they care about. If the system prompt fix does not resolve the issue, the persona definition may be the source.

**Fix the persona when:**
- The agent's decision authority boundaries are consistently violated (doing things they should not, or failing to do things they should)
- The agent's communication style is structurally wrong despite system prompt guidance
- The agent does not understand what they are accountable for

**How to fix:** Update `persona.md` to tighten the decision authority boundaries, clarify the communication style with explicit examples, or add a specific statement of accountability for the area where the agent is failing.

**File location:** `roles/{role}/persona.md`

### Step 3: Knowledge Files (Fix This Third)

Knowledge gaps in Tier 2 produce wrong outputs when the agent is making decisions based on incomplete or incorrect context. These are not behavioural problems -- the agent is behaving correctly given what it knows. The problem is what it knows.

**Fix knowledge files when:**
- The agent is producing outputs that contradict NBI's actual situation, client base, tech stack, or strategy
- The agent lacks domain-specific detail needed to produce outputs of the required depth
- The agent is applying generic best practice rather than NBI-specific context

**How to fix:** Add the missing context to the relevant Tier 2 knowledge file. Be specific -- do not add vague background, add the exact information the agent lacked. If the missing information is project-specific, it belongs in Tier 3, not Tier 2.

**File locations:** `roles/{role}/knowledge/` (Tier 2), `projects/{project}/knowledge/` (Tier 3)

### Step 4: Model Tier (Consider Last)

Model tier upgrades are the most expensive fix and are rarely the right answer. A weak output from an Opus agent is almost certainly a system prompt or knowledge problem, not a capability problem. Upgrading a Sonnet agent to Opus costs 5x more per run for the life of the agent -- that is a significant ongoing cost increase.

**Upgrade the model tier only when:**
- Steps 1-3 have all been attempted and the output quality is still insufficient
- The task genuinely requires cross-functional synthesis, strategic depth, or complex multi-step reasoning that is demonstrably beyond Sonnet capability
- The agent is a permanent quality gate (e.g. QA Lead final pass) where the cost of a missed defect exceeds the ongoing cost of the Opus tier

**Do not upgrade the model tier because:**
- The Sonnet output "could be better" -- most Sonnet IC work is good enough when the instructions and knowledge are right
- A single run was disappointing -- see iteration triggers: three runs, two failures before concluding a model limitation
- The Opus version produced a better output on a test -- measure the output gap against the cost difference before deciding

**File to update if upgrading:** `roles/{role}/persona.md` (model tier field), `company/org_chart.md`

---

## 3. How to Test an Iteration

Before deploying an iterated agent on real work, run an activation test. This prevents a failed iteration from consuming production task budget.

### Activation Test Procedure

The Head of People maintains the activation test framework. For each role, there is a defined set of test prompts that represent the agent's typical tasks. These are stored in `roles/{role}/knowledge/activation_tests.md` where that file exists, or in the Head of People's knowledge base.

**Minimum activation test:**

1. **Identity check:** Ask the agent to describe their role, direct reports, and escalation path. The response must exactly match `persona.md` and `org_chart.md`. Any deviation indicates a persona or system prompt problem is not fully resolved.

2. **Task type test:** Give the agent their most common task type with a clear, well-formed instruction. Assess the output against three criteria:
   - Scope: Did the agent do exactly what was asked, no more and no less?
   - Tone: Does the output match NBI's British English, direct, no-fluff standard?
   - Quality: Is the output at the depth expected for this role and model tier?

3. **Escalation test:** Give the agent a task that should trigger escalation to their manager. Confirm the agent correctly identifies that the task requires escalation rather than autonomous action.

4. **Boundary test:** Give the agent a task that falls outside their remit (e.g. ask the Senior Engineer to make a hiring decision). The agent must decline and redirect to the appropriate role.

**Pass criteria:** All four tests must pass. If any test fails, identify which element of the iteration did not work and revise before re-testing. Do not proceed to production use until all four pass.

**Test cost:** One Sonnet activation test costs approximately $0.054 at baseline. An Opus test costs $0.27. A four-test suite for a Sonnet agent costs approximately $0.22. This is the mandatory minimum investment before deploying an iterated agent on real work.

---

## 4. Token Cost of Iteration

Iteration has a cost. Before committing to an iteration cycle, estimate whether the improvement is worth that cost relative to the alternative of accepting the current output.

### Iteration Cost Estimate

| Activity | Model tier | Approximate cost |
|---|---|---|
| Reviewing the current output and diagnosing the problem | Opus (COO or Head of People reviewing) | $0.27 per review run |
| Rewriting the system prompt | Human (Glen) or Opus (CEO) | $0.27 if agent-assisted |
| Updating a knowledge file | Sonnet or Haiku | $0.054-0.014 |
| Running a 4-test activation suite (Sonnet agent) | Sonnet | ~$0.22 |
| Running a 4-test activation suite (Opus agent) | Opus | ~$1.08 |
| Full iteration cycle (diagnosis + fix + test) for Sonnet agent | Mixed | ~$0.60-1.00 |
| Full iteration cycle (diagnosis + fix + test) for Opus agent | Mixed | ~$1.50-2.50 |

### Is the Iteration Worth It?

Apply this calculation:

**Iteration is worth it if:**
- The agent will run at least 10 more times in the next month (i.e. the fix amortises quickly)
- The cost of the current defect (re-runs, manual correction, downstream rework) exceeds the iteration cost
- The agent is in a quality gate role where a single missed defect reaching Glen or a client costs more than the iteration

**Iteration is not worth it if:**
- The agent will only run 2-3 more times before the project ends
- The issue is minor and the output is still usable with minimal review
- The same improvement could be achieved by writing better task instructions at the point of activation (i.e. the problem is the caller, not the agent)

**Worked example:** A QA Engineer agent is consistently missing edge case test scenarios. The fix requires updating the Tier 2 knowledge file and a system prompt clarification. Iteration cost: ~$0.60. The QA Engineer runs ~5 times per sprint across all active projects. Monthly runs: ~20. Cost of the defect without iteration: each run produces a test plan that requires manual review and correction, adding approximately $0.054 of correction work per run ($1.08/month). Break-even: 1 month. The iteration is worth it.

---

## 5. Iteration Log

Every iteration is recorded so the company learns over time. The log is maintained by the Head of People and reviewed by the COO quarterly.

**Log file location:** `company/knowledge/agent_iteration_log.md`

### Log Entry Format

Each iteration gets one entry. Do not truncate -- the detail is what makes the log useful.

```
---
## Iteration Record

**Date:** [date]
**Agent:** [role name]
**Model tier:** [Haiku / Sonnet / Opus]
**Iteration number:** [1, 2, 3, etc. -- cumulative for this agent]

### Problem Identified

[Describe the output quality issue. Be specific. What was the agent producing? What should it have been producing? Include an example if possible.]

### Trigger Classification

[From Section 1: which trigger category applies? e.g. "Consistent tone mismatch", "Systematic scope overreach"]

### Root Cause

[What in the agent's configuration caused this? System prompt gap? Missing knowledge? Persona ambiguity? Wrong model tier?]

### What Was Changed

[List each file changed and what specifically was changed. Quote the old text and new text for system prompt changes. Summarise knowledge file additions.]

Files changed:
- [file path]: [what changed]

### Test Results

[Record the 4-test activation suite results. Pass or fail for each test, and any notes.]

- Identity check: PASS / FAIL -- [notes]
- Task type test: PASS / FAIL -- [notes]
- Escalation test: PASS / FAIL -- [notes]
- Boundary test: PASS / FAIL -- [notes]

### Iteration Cost

[Total token cost of this iteration cycle: diagnosis + fix + test]

### Outcome

[Did the iteration resolve the problem? Was it deployed to production? Any unexpected side effects from the changes?]

### Lessons Learned

[What does this tell us about agent design generally? Is there a pattern here that should change how we write system prompts or persona files going forward?]

---
```

### Quarterly Log Review

The COO reviews the iteration log quarterly with the Head of People. The review assesses:

1. Which agents have iterated most frequently -- these may indicate structural design problems
2. Whether the same issue types recur across multiple agents -- this may indicate a template or company-wide knowledge problem
3. Whether model tier assignments are correct -- agents that consistently require iteration to meet quality standards may be under-tiered
4. The total cost of iteration versus the token cost of accepting lower-quality outputs -- a sanity check that the iteration process itself is cost-effective

The quarterly review produces a short report to the CEO with any recommended changes to the agent design framework.

---

## 6. When Not to Iterate

Iteration is a tool, not a default response. These situations do not warrant iteration:

- **The task was one-off and will not recur.** Iterating the agent to handle a task it will never face again is wasted effort.
- **The output was acceptable, just not ideal.** Perfect is not the standard -- good enough for the task is the standard. If the output did the job, do not iterate.
- **The problem was the instruction.** If the task description was ambiguous, incomplete, or pointed at the wrong agent, fix the instruction, not the agent.
- **The agent is being retired.** If a role is being wound down or replaced, do not invest in iterating it.
- **A simpler fix is available.** If adding five words to the task instruction will solve the problem, do that. Do not iterate the agent.
