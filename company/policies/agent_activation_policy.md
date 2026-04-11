# Agent Activation Policy

**Owner:** COO
**Approved by:** CEO
**Version:** 1.0
**Date:** 2026-03-28
**Status:** Active

---

## Purpose

Every agent activation burns tokens. Opus runs cost $0.27 per activation at baseline; at complex-execution rates (80,000 input / 15,000 output tokens) that rises to $2.33 per run. Activating agents without discipline is not a minor inefficiency -- it compounds across every task, every day, and pushes costs toward the scenarios modelled in the CFO cost model where AI spend becomes material.

This policy defines when to activate agents, which agents for which tasks, and when a task can be handled by an already-active agent rather than spinning up a new one.

---

## 1. Activation Decision Criteria

Before activating any agent, the requestor must be able to answer all four questions below. If any answer is unclear, default to not activating.

### Question 1: Can an already-active agent handle this?

Check whether any agent currently in context has the capability to handle this task. If yes, assign to them. Do not spin up a new agent.

**Examples of tasks that do not require a new activation:**
- The CEO is already active and the task is strategic prioritisation -- do not separately activate the COO
- The Senior Engineer is already active and the task is a small bug fix -- do not separately activate the Engineer
- The VP Product is already active and the task is refining a requirement already under discussion -- do not separately activate a second Opus agent for review

**Check before activating:** Is there an agent currently in context who has the knowledge, tier, and authority to handle this work? If yes, use them.

### Question 2: Does this task genuinely require this role's specialisation?

Ask: what is it about this specific role that the task needs? If the answer is "general reasoning" or "someone to write this up", a more senior or general agent already in context can handle it.

**Activation is justified when:**
- The task requires domain-specific knowledge loaded only in that role's Tier 2 (e.g. test framework knowledge for QA Engineer, deployment configuration for DevOps)
- The task requires the specific authority or output format that comes from that role (e.g. a formal QA sign-off requires the QA Lead, not the Senior Engineer saying "looks fine")
- The task is within a specialised workflow defined for that role (e.g. hiring admin requires Head of People, financial modelling requires CFO)

**Activation is not justified when:**
- A senior agent already in context could produce the same output to the same standard
- The role is being activated to "complete the team" rather than because the work needs them
- The only reason is to maintain organisational tidiness

### Question 3: What is the estimated token cost of this activation?

Before activating, estimate the run cost using the CFO cost model:

| Model Tier | Baseline cost per run | Complex run cost |
|---|---|---|
| Opus | $0.27 | $2.33 |
| Sonnet | $0.054 | $0.47 |
| Haiku | $0.014 | Not applicable for complex tasks |

For multi-turn exchanges, multiply the per-run figure by the expected number of turns. A 3-turn Opus exchange costs approximately $0.81 at baseline, $6.99 at complex rates.

If the activation is part of a delegation chain (CEO activates COO who activates Producer), each activation in the chain carries its own cost. Calculate the full chain cost, not just the immediate activation.

### Question 4: Is the expected output worth the token cost?

Apply this test: if a human consultant were billing at a day rate equivalent to the token cost, would you commission the work?

At complex-run Opus rates, activating the CEO for a 5-turn strategic discussion costs approximately $11.65. That is a reasonable cost for strategic decision-making that affects a client engagement. It is not reasonable for a task that could be handled by a Sonnet agent or by improving the instructions to an agent already active.

**Output is worth the cost when:**
- The task is on the critical path of a deliverable
- The task genuinely requires the model capability of the tier being activated
- The output will be used, not just produced

**Output is not worth the cost when:**
- The task is exploratory without a clear action attached
- The output will be reviewed, rewritten, or discarded before use
- The same output could be produced by a cheaper tier agent

---

## 2. Minimum Viable Team by Task Type

These are the minimum agent sets for each common task type. Activating beyond the minimum requires explicit justification. "It might be useful" is not justification.

### Simple Feature Build

**Minimum team:** Senior Engineer only

The Senior Engineer has the technical depth to handle single-feature implementation without requiring a separate Engineer agent. DevOps is not needed unless the feature requires infrastructure changes. QA Engineer is not needed unless the feature is complex enough to warrant a formal test pass.

**Activate additionally only if:**
- The feature touches deployment configuration (then add DevOps)
- The feature is part of a client-facing release that requires a formal QA sign-off (then add QA Engineer after implementation, not before)

### Full Feature: Spec to Implementation

**Minimum team:** VP Product (spec) > Senior Engineer (build) > QA Engineer (verify)

This is a three-agent sequential chain. Not four, not five, not the full engineering department.

VP Product produces the spec. Senior Engineer implements against it. QA Engineer verifies the implementation against the acceptance criteria. Only if QA Engineer flags a significant issue does the QA Lead (Opus pass) become necessary.

**Do not activate:** CTO for routine features (CTO reviews architecture decisions, not individual feature implementations), VP Engineering unless the Senior Engineer is unavailable or the feature has cross-system architectural implications, UI/UX Lead unless the feature has a significant interface component explicitly requiring design review.

### Client Deliverable

**Minimum team:** Relevant IC agent (to produce) + VP Product (to review) + Glen (approval gate)

The IC agent produces the deliverable. VP Product reviews it for quality and completeness. Glen approves before it goes out.

**Do not activate:** Multiple review agents in sequence. One review pass is standard. A second review pass requires a documented reason (e.g. VP Product flagged substantive issues and a re-review is needed after correction).

### Strategic Planning

**Minimum team:** CEO + relevant department head

Strategic planning is a CEO function with input from the relevant domain lead. A pricing strategy involves CEO + CFO. A product roadmap discussion involves CEO + VP Product. A technical architecture decision involves CEO + CTO.

**Do not activate:** All C-suite simultaneously. The CEO synthesises cross-functional input; they do not require all C-suite present in the same activation to do so. Sequential briefings are more token-efficient and produce better outputs than simultaneous activation.

### Bug Fix

**Minimum team:** Engineer (fix) + QA Engineer (verify)

A bug fix does not require the VP Engineering to review, the DevOps agent to stand by, or the CTO to be informed unless the bug has architectural implications. The Engineer fixes it. The QA Engineer verifies the fix resolves the issue and has not introduced a regression.

**Escalate to Senior Engineer if:** The bug root cause is in a complex or critical component where the Engineer lacks context. **Escalate to VP Engineering if:** The bug reveals a systemic problem requiring backlog reprioritisation or a broader architectural review.

### Content or Writing Task

**Minimum team:** Tech Writer

Internal documents, knowledge base updates, policy drafting, and product documentation are Tech Writer tasks. The Tech Writer does not require a review from the VP Product unless the content is client-facing or part of a formal deliverable. It does not require QA.

**Escalate to VP Product for review if:** The content is going to a client, is published externally, or is part of a formal specification document.

### Routine Status Check or Formatting Task

**Minimum team:** Haiku (if available) or Producer

Status checks, data extraction from structured files, reformatting existing content, and producing summaries from pre-existing information do not require Sonnet or Opus agents. These are Haiku-tier tasks.

**Never activate Opus for:** Reformatting a document, extracting data from a spreadsheet, producing a status update from an existing tracker, or any task that is mechanical rather than judgement-based.

---

## 3. When to Activate Each Model Tier

### Haiku -- Routine Mechanical Tasks Only

Haiku is appropriate when the task is:
- Extracting structured information from a document (pull the dates, names, and figures from this report)
- Reformatting content that already exists (convert this table to a different format)
- Generating a status summary from a pre-populated tracker
- Running simple classification or tagging tasks
- Producing templated outputs where the template already exists and the task is filling it in

Haiku is not appropriate when the task requires: judgement, synthesis of disparate information, quality assessment, or any output that will go to Glen or a client without a Sonnet or Opus review pass.

### Sonnet -- All IC Work and Standard Deliverables

Sonnet is the default tier for all implementation and production work. This includes:
- All engineering work (feature builds, bug fixes, code review)
- Test planning and execution
- Interface design and implementation
- Internal status reports and operational documents
- Data analysis and analytical briefs
- Producer tasks (tracking, scheduling, drafting)
- Hiring administration

Sonnet agents produce the work. Opus agents review, decide, and sign off.

**Do not escalate Sonnet work to Opus** unless the output has been reviewed by the Sonnet agent and found to be insufficient, or the task scope is genuinely broader than a Sonnet agent's capability.

### Opus -- Strategic Depth, Cross-Functional Judgement, and Final Gates Only

Opus is appropriate when the task requires:
- Strategic decision-making with consequences for multiple workstreams or clients
- Cross-functional judgement where the correct answer requires synthesising input from engineering, product, finance, and operations simultaneously
- A final quality gate review of work destined for Glen or a client (QA Lead final pass, VP Product sign-off on a client deliverable)
- Architecture decisions that will constrain engineering work for weeks or months
- Financial modelling or budget decisions

**Never activate Opus for:** Tasks that a Sonnet agent has not already attempted. If the task is well-defined and scoped, give it to the appropriate Sonnet IC first. Activate Opus if the Sonnet output is insufficient, not as the first move.

---

## 4. Parallel Activation Rules

### Parallel Activation is Justified When

1. **Tasks are genuinely independent** -- the output of Agent A has no bearing on the input or direction of Agent B, and neither needs to review the other's work before proceeding
2. **Both outputs are required before work can proceed** -- holding one back while the other runs creates a sequential bottleneck that delays the downstream task
3. **The combined token cost is proportionate to the value** -- if both agents are Sonnet-tier and the parallel activation saves 24 hours of sequential work on a live client deliverable, the combined $0.11 cost is easily justified

**Valid example:** Activating the Senior Engineer to begin implementation and the UI/UX Designer to begin wireframes simultaneously, where both are needed for a feature that requires back-end logic and a front-end interface. Neither needs the other's output to begin.

### Parallel Activation is Wasteful When

1. **Tasks have dependencies** -- one agent needs the other's output before they can work meaningfully. Activating both wastes the upstream agent's run if the downstream agent then needs to rework based on what the upstream produced
2. **A single agent could handle all of them** -- if the CEO can brief the COO, CFO, and CTO sequentially in one activation session rather than spinning up three Opus agents simultaneously, do that
3. **You are activating for completeness rather than necessity** -- activating the full C-suite because "they should all know" is not a valid reason. Brief agents when they need to act, not when they need to be informed

**Wasteful example:** Activating the VP Engineering, QA Lead, and DevOps simultaneously to review a small feature that is not yet implemented. There is nothing for QA or DevOps to act on until the VP Engineering has reviewed the specification and the implementation exists.

---

## 5. CEO Activation Authority for Simultaneous Multi-Agent Runs

The CEO must justify any activation of 3 or more agents simultaneously. The justification must be documented before the activations proceed.

### Required Justification Format

```
MULTI-AGENT ACTIVATION REQUEST
Date: [date]
Requested by: CEO Agent

Agents to activate: [list each agent and their model tier]
Estimated token cost: [calculate using CFO cost model]

For each agent:
- [Agent name]: What they will produce / What action they will take
- Why this cannot be handled sequentially

Why simultaneous activation is required:
[Specific reason -- not "for efficiency" or "to save time"]

Authorisation: CEO
```

This justification is logged in the activation log (see Agent Iteration Protocol for log format).

### When Simultaneous Multi-Agent Activation Is Permissible

- A client deliverable is time-critical and multiple independent components must be produced in parallel to meet a deadline
- A strategic review has been commissioned by Glen that genuinely requires cross-functional input from multiple department heads simultaneously (e.g. annual planning requiring input from CFO on budget, CTO on technical capacity, and VP Product on roadmap)
- An incident requires parallel diagnosis and response (e.g. a production outage requires CTO, VP Engineering, and DevOps simultaneously because the incident has technical, engineering, and infrastructure dimensions that are all active at once)

### When Simultaneous Multi-Agent Activation Is Not Permissible

- Activating all C-suite agents to brief them on a strategic update -- do this sequentially or via the CEO's summary
- Activating multiple engineers on the same codebase without clear task separation -- this creates merge conflicts and duplicated work, not speed
- Activating agents "in case they are needed" before it is confirmed they have work to do

---

## 6. Activation Log

Every agent activation is recorded in the project or session log with:

| Field | Content |
|---|---|
| Timestamp | Date and time of activation |
| Agent activated | Role name and model tier |
| Activated by | Which agent or Glen initiated the activation |
| Task assigned | One-sentence description |
| Justification | Answer to the four activation decision criteria |
| Estimated cost | $ figure from CFO cost model |
| Actual cost | Populated after run completion (if tracking available) |

This log is reviewed by the COO weekly as part of operational oversight. Patterns of unnecessary activation are flagged to the CEO.

---

## 7. Enforcement

- The CEO is responsible for enforcing this policy in their orchestration decisions
- The COO reviews activation patterns weekly and flags violations to the CEO
- Glen may request an activation log review at any time
- Any agent that activates another agent without following this policy must document the reason in the activation log retrospectively
- Repeated violations of parallel activation rules will result in a review of the activating agent's system prompt and decision-making framework (see Agent Iteration Protocol)
