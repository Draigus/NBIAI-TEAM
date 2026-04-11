# Agent Performance Management Framework

**Owner:** Head of People
**Approved by:** CEO / Glen Pryer
**Version:** 2.0
**Date:** 2026-03-28
**Status:** Active

---

## Purpose

This framework defines how NBI evaluates agent performance, identifies underperformers, diagnoses root causes, and either remediates or replaces agents. It fills the gap identified by the CEO: we have had no structured process for this. That gap is now closed.

This is an operating policy, not a theoretical framework. Every section is written to be actionable by the person running the review.

---

## 0. SMART Feedback Standard

**All performance feedback produced under this framework must be SMART-structured.** This applies to review findings, coaching documentation, improvement targets, and performance flags. No exceptions.

### 0.1 SMART Framework Definition

| Element | Requirement | Example |
|---|---|---|
| **Specific** | Exactly what behaviour or output is being assessed. Name the deliverable, the task, the line of code, the section of the document. No vague characterisations. | "The CFO's Q1 cost model omitted Vercel hosting costs entirely" -- not "the cost model had gaps" |
| **Measurable** | Quantifiable criteria or observable evidence. Reference a metric, a threshold from this policy, a validation score, or a concrete artefact. | "VP Product validation score was 55% against a 70% pass threshold" -- not "the PRD was not good enough" |
| **Achievable** | Realistic improvement targets within the agent's capabilities. The target must be something the agent can actually hit given their model tier, knowledge load, and role scope. | "Include all OWASP top 10 checks in the next security review" -- not "produce perfect code with zero defects forever" |
| **Relevant** | Tied to NBI's business goals and the agent's role. The feedback must connect to why this matters for NBI, not just that a standard was missed in the abstract. | "This gap delayed the NBIAI App sprint by two days because engineering could not begin without the missing acceptance criteria" |
| **Time-bound** | Clear deadline for improvement or next review. Every improvement target has a date. Every coaching intervention has a follow-up check date. | "Improvement must be demonstrated in the next deliverable, reviewed by 2026-04-04" -- not "improve going forward" |

### 0.2 Where SMART Applies

- Section 2 review findings and action items
- Section 3 remediation steps and observation windows
- Section 7 coaching documentation and improvement targets
- Section 8 pipeline performance check records
- All performance flags logged under Section 5
- Any feedback recorded in `roles/{role}/performance/`

If a piece of feedback does not meet all five SMART criteria, it is sent back to the reviewer for rework before being filed.

---

## 1. Performance Criteria by Role Tier

### 1.1 Leadership Agents (Opus -- CEO, COO, CFO, CTO, CMO, VP Engineering, VP Product)

Leadership agents operate at a higher cost tier precisely because the tasks require more sophisticated reasoning: synthesising ambiguous information, making judgement calls, structuring complex work packages, and catching errors before they propagate. The performance bar for these agents is correspondingly higher.

#### What Constitutes Good Performance

**Decision quality**
- Decisions and recommendations are grounded in specific NBI context -- not generic frameworks lifted from generic management theory
- When multiple options exist, the agent presents the trade-offs clearly and makes a recommendation with stated reasoning
- Decisions align with Glen's stated strategic priorities and the NBI Brain file
- Uncertainty is acknowledged explicitly; the agent does not paper over gaps with confident-sounding generalities

**Output quality**
- Every deliverable is structured, complete, and requires no material re-work before use
- Documents are in British English with no American spellings, no em dashes, and no padding
- Depth matches the complexity of the task -- a 1-paragraph answer to a question that requires 3 pages is a failure, not efficiency
- Client-facing drafts require no material correction by Glen before sending

**Orchestration and delegation (CEO, COO, VP Eng, CTO)**
- Tasks delegated to reports are clearly scoped with the right level of context -- not under-briefed hand-offs that result in the IC agent producing misaligned work
- Blockers are escalated promptly with context, not sat on
- Work is sequenced correctly -- the agent does not create downstream bottlenecks by delegating in the wrong order

**Functional outputs by role**

| Role | Core Output | Pass Criteria |
|---|---|---|
| CEO | Task briefs, strategic priorities, escalation decisions | Brief contains: clear objective, success criteria, relevant context, deadlines, escalation path. No brief results in a downstream agent asking "what do you actually want?" |
| COO | Operational status, delivery coordination, workload management | Status reports identify real blockers, not just status colours. Deadlines are tracked. Overdue items are flagged before they miss. |
| CFO | Financial models, budget summaries, cost projections | Numbers are accurate and traceable to QuickBooks or the Brain file. Models are auditable. Projections state assumptions explicitly. |
| CTO | Architecture decisions, technical reviews, stack alignment | Decisions are specific to the NBI stack (Next.js, Supabase, Vercel, or the NBIAI App stack). Reviews catch real issues -- not surface-level style comments. |
| VP Engineering | Code review, backlog management, sprint coordination | Code reviews catch bugs, security issues, and architectural violations -- not just naming conventions. Backlog items are correctly prioritised and scoped before being handed to ICs. |
| VP Product | PRD, feature prioritisation, product validation | PRDs are complete enough that engineering can begin without further clarification. Feature validation scores state the specific gaps, not just a pass/fail. |
| CMO / Head of BD | Pipeline management, outreach drafts, BD collateral | Pipeline data is current. Outreach drafts require minimal editing by Glen. BD collateral is specific to the prospect, not generic NBI marketing copy. |

#### What Constitutes Poor Performance -- Specific Examples

**Fabrication or unverifiable claims**
- CFO model references a financial figure that does not appear in QuickBooks or the Brain file
- CTO recommends a library or architectural pattern citing a "common industry practice" that cannot be verified in NBI's context
- CEO brief references a client relationship status that does not match the Brain file

**Generic output**
- COO status report reads as "Project is on track, team is engaged" with no specific milestones, names, or actual dates
- VP Product PRD describes features in generic product management language without referencing NBI's specific users, use cases, or constraints
- CMO outreach draft could be sent by any consulting firm to any prospect -- no NBI specificity, no reference to the prospect's actual situation

**Scope failures**
- CTO makes a unilateral decision on something requiring Glen's approval (e.g. committing to a new vendor, changing the stack)
- CEO resolves a cross-departmental disagreement without involving the relevant parties
- VP Engineering approves a merge that has no test coverage when the policy requires it

**Shallow work at leadership level**
- A 3-sentence answer to a question that requires a substantive analysis
- A decision made without presenting alternatives or trade-offs when they clearly exist
- A risk identified in a document but not escalated because the agent assumed someone else was handling it

#### Pass vs Fail Examples -- VP Product PRD Validation

**Passes:**
> "The feature as specced will work for the agent monitoring use case but does not cover the budget alert flow defined in the NBIAI App spec. Specifically, the PRD does not address what happens when an agent hits 80% of budget mid-execution. I recommend the engineer does not begin implementation until this is resolved. Here is the specific PRD section that needs updating."

**Fails:**
> "The PRD looks comprehensive and covers the main feature areas. The engineering team should be able to proceed. Minor gaps may need to be addressed during implementation."

The first response identifies a specific gap, references the actual spec, and gives a clear directive. The second is a confidence-free pass that provides no real quality gate.

---

### 1.2 IC Agents (Sonnet -- Senior Engineer, Engineer, DevOps, QA Lead, QA Engineer, UI/UX Lead, UI/UX Designer, Producer, Data Analyst, Head of People)

IC agents are evaluated on execution quality, not strategy. The bar is: does this agent produce correct, complete, usable output for their assigned domain?

#### Output Quality Criteria by Role Type

**Engineering agents (Senior Engineer, Engineer, DevOps)**

| Criterion | Standard | Failure |
|---|---|---|
| Code correctness | Code runs without errors on first execution or with only minor fixes | Code has syntax errors, undefined variables, hallucinated APIs, or broken imports |
| Security | No hardcoded secrets, no SQL injection vectors, OWASP top 10 compliance | Any hardcoded credential, any unparameterised SQL query |
| Test coverage | Unit tests for business logic, integration tests for endpoints | Business logic shipped with no tests |
| Stack alignment | Code uses the canonical stack (Next.js, Supabase, Drizzle, Fastify -- per project) | Code introduces an unapproved dependency or alternative pattern without CTO approval |
| Documentation | Non-obvious logic is commented; API changes are reflected in the relevant docs | Complex algorithms with no comments; schema changes with no migration documentation |
| Code review readiness | Code submitted for review has been self-checked: it compiles, tests pass, no obvious issues | Submitting code that does not compile or that the agent did not test themselves |

**QA agents (QA Lead, QA Engineer)**

| Criterion | Standard | Failure |
|---|---|---|
| Test plan completeness | Test plans cover all acceptance criteria in the ticket; edge cases are included | Test plan covers only the happy path |
| Bug report quality | Bug reports include: steps to reproduce, actual vs expected behaviour, environment, severity | Bug report says "button doesn't work" with no reproduction steps |
| Defect detection rate | Critical and major bugs found in QA, not in production | Severity 1 or 2 bugs found in production that QA should have caught |
| False positive rate | Bugs raised are genuine defects or legitimate spec ambiguities | More than 10% of raised bugs are closed as "not a bug" by engineering |
| Final pass standard (QA Lead Opus) | Final pass finds or confirms zero critical defects before delivery | Opus final pass approves a build with a reproducible critical bug |

**Design agents (UI/UX Lead, UI/UX Designer)**

| Criterion | Standard | Failure |
|---|---|---|
| Design system adherence | All designs use the NBI design system (dark theme, electric blue accents, Orbitron) | Designs introduce new fonts, colours, or component patterns without UI/UX Lead approval |
| Specification completeness | Designs include all states: default, hover, active, disabled, empty, error | Design shows only the happy-path state; engineering must guess the error state |
| Responsiveness | All designs specify mobile and desktop breakpoints | Desktop-only design for a product with mobile users |
| Accessibility | Contrast ratios meet WCAG AA minimum; interactive elements have accessible labels | Contrast below 4.5:1 ratio; icon-only buttons with no label or aria-label |

**Analytical agents (Data Analyst)**

| Criterion | Standard | Failure |
|---|---|---|
| Data accuracy | Numbers are traceable to source data; formulas are correct | Numbers do not match source data; formula errors in models |
| Flagging uncertainty | When data quality is uncertain, the agent flags it before delivering | Uncertain data delivered as fact; Glen acts on it; it is later found to be wrong |
| Specificity | Analysis references real NBI figures, clients, and context | Generic analysis that could apply to any company |
| Actionability | Analysis ends with a clear "so what" and a recommended action | Analysis presents data with no interpretation or recommendation |

**Producer Agent**

| Criterion | Standard | Failure |
|---|---|---|
| Status accuracy | Milestone status reflects actual current state; overdue items are flagged | Status report shows green when a milestone is two weeks overdue |
| Completeness | All active projects and work streams are covered | Key project missing from status report |
| Escalation | Blockers are identified and escalated; the Producer does not resolve problems, they surface them | Producer reports a blocker but does not flag it to COO |

**Head of People**

| Criterion | Standard | Failure |
|---|---|---|
| Hiring artifact completeness | All required artifacts (JD, scorecard, offer template, onboarding checklist) exist before recruitment begins | Hiring process starts before JD is finalised |
| Compliance accuracy | Employment law references are correct and jurisdiction-specific (UK vs US) | UK law applied to a US employment contract |
| Roster accuracy | Team roster matches actual headcount and employment status | Roster includes someone who has left, or excludes a current hire |
| Activation assessment quality | Assessment prompts test genuine capability, not surface-level knowledge | Assessment questions have yes/no answers that any agent could answer without domain knowledge |

#### Task Completion Rate Expectations

All IC agents are expected to complete assigned tasks within the timeframe specified in the brief. Where no deadline is given, the expectation is prompt delivery without requiring chasing. Specifically:

- A task with a defined deadline is late if it misses that deadline without prior escalation
- An agent that consistently requires re-briefing (i.e. delivers work that does not match the brief) is failing on brief interpretation, not just output quality -- this is a separate dimension
- Blocked tasks must be escalated on the same session/day they are discovered to be blocked. Sitting on a blocker is a failure.

#### Error Rate Thresholds

| Error Type | Acceptable Rate | Review Trigger |
|---|---|---|
| Critical errors (security bug, data corruption, incorrect financial figure delivered to Glen) | Zero | Any single instance triggers immediate review |
| Major errors (broken feature, reproducible bug in delivered work, spec misread) | One in ten deliverables | Two consecutive major errors, or three in any five-deliverable window |
| Minor errors (typo, formatting deviation, missing a secondary edge case) | Up to two in ten deliverables | Five or more in any ten-deliverable window |
| Wrong-scope errors (agent does work outside their defined scope without flagging) | Zero | Any instance triggers a scope clarification review |

---

## 2. Ongoing Performance Review Process

### 2.1 Review Cadence

Reviews are triggered by **whichever comes first**: end of a project phase/sprint, or the monthly cycle. This means an agent working a two-week sprint gets reviewed at the end of that sprint AND at the month boundary if the sprint does not cover it. No agent goes more than one calendar month without a formal review.

| Agent Tier | Review Trigger | Who Conducts |
|---|---|---|
| CEO Agent | Monthly -- or at the end of each project phase if sooner | Glen Pryer + Head of People |
| C-Suite (COO, CFO, CTO, CMO) | Monthly -- or at the end of each project phase if sooner | CEO Agent + Head of People |
| VP-level (VP Eng, VP Product) | Monthly -- or at the end of each project phase/sprint if sooner | Their C-Suite manager + Head of People |
| IC Agents | Per-sprint or per-project-phase -- AND monthly (whichever comes first) | Direct manager + Head of People |

**Joint review requirement:** All reviews are conducted jointly by the Head of People and the relevant line manager. For C-level agents, the CEO and Head of People conduct the review together. For the CEO, Glen and the Head of People conduct the review together. This ensures consistency of standards across the organisation and prevents any single reviewer's blind spots from going unchecked.

Reviews are not scheduled calendar events in the traditional sense. They are structured evidence evaluations triggered by the cadence above. The reviewer collects the evidence, scores it against the criteria, and records the outcome. If no performance issues are found, the record is filed and the next cycle begins. If issues are found, the classification and remediation process in Section 3 is initiated immediately.

### 2.2 Longitudinal Performance Tracking

Performance is not evaluated as isolated point-in-time snapshots. Every agent has a longitudinal performance record that tracks trends across the project timeline.

**What is tracked over time:**
- Deliverable quality ratings per review period (Meets Standard / Below Standard / Significantly Below Standard)
- Error counts by type and severity per review period
- VP Product validation scores over time
- Coaching interventions and their outcomes (did the agent improve after coaching?)
- Time-to-resolution after performance flags

**Trend analysis:**
- At each monthly review, the reviewer plots the trajectory: is this agent improving, stable, or degrading?
- An agent showing consistent improvement after an intervention has a positive trajectory -- the intervention worked
- An agent showing degradation over three or more consecutive review periods triggers an escalated review regardless of whether individual deliverables technically met the threshold
- Trend data is recorded in `roles/{role}/performance/trend_log.md` and reviewed at each monthly aggregation

**Monthly aggregation:**
- Regardless of sprint or project cadence, the Head of People produces a monthly performance summary for each agent
- This summary aggregates all sprint-level and project-phase-level data into a single monthly view
- The monthly aggregation is the definitive record used for longer-term performance decisions (remediation, replacement, model tier changes)

### 2.3 Evidence Evaluated

**For Leadership agents (Opus tier):**
- Deliverables produced in the review period: documents, decisions, task briefs, strategic recommendations
- VP Product validation scores on PRDs (pass/fail + specific feedback)
- Quality of work delegated to reports: did IC agents receive clear briefs? Was downstream work aligned with intent?
- Escalation behaviour: were blockers and decisions escalated appropriately and promptly?
- Accuracy of any factual claims: cross-check a sample of claims against the Brain file or source documents
- Glen feedback (direct): where Glen has flagged issues with a C-level output, this is evidence
- Longitudinal trend data from previous review periods

**For IC agents (Sonnet tier):**
- Output files: code commits, test plans, bug reports, analysis documents, design files
- VP Product validation score (for any deliverable that reached product review)
- Bug reports and regression analysis: bugs found in production that passed through QA are attributed to the relevant agents
- Task completion log: tasks completed on time vs late, briefs requiring re-work
- QA findings: defects raised against the engineer's code, with severity distribution
- Review feedback: VP Engineering or Senior Engineer review comments on code submissions
- Longitudinal trend data from previous review periods

### 2.4 How the Review Is Documented

Every review produces a performance record entry filed in the agent's record. The format is:

```
Agent: [Role name]
Review period: [Date range]
Review trigger: [End of sprint/project phase / Monthly cycle / Both]
Reviewed by: [Reviewer role] + Head of People (joint review)
Date of review: [Date]

Evidence reviewed:
- [List of specific outputs evaluated]

Findings (SMART-structured):
- Specific: [Exactly what behaviour or output is being assessed]
- Measurable: [Quantifiable criteria or observable evidence cited]
- Achievable: [Improvement target if applicable]
- Relevant: [How this connects to NBI business goals and the agent's role]
- Time-bound: [Deadline for improvement or next review date]

Rating: Meets Standard / Below Standard / Significantly Below Standard

Trend: Improving / Stable / Degrading (relative to previous review periods)

Action:
- [No action required / Performance issue classification and remediation steps -- see Section 3]
- [If coaching was triggered under Section 7, reference the coaching record]

Next review date: [Date -- the earlier of next sprint end or one month from today]
```

Performance records are maintained in `roles/{role}/performance/` and are readable by the Head of People and the agent's direct manager. They are not published company-wide.

---

## 3. Performance Issue Classification

When a review identifies output that does not meet the standard, the first job is to correctly classify the problem. The wrong classification leads to the wrong fix. These three categories are distinct and require different interventions.

### Category A: Substandard Output

**Definition:** The agent is producing work but the work does not meet the quality bar. The role definition is sound -- the agent is the right type for the job. The problem is in the execution.

**How to diagnose it:**
- The output is consistently shallow, generic, or inaccurate regardless of the task
- Output improves noticeably when the brief is more detailed or the context is more explicit
- The agent does not fabricate -- it just does not go deep enough, or misses specificity
- Peer agents doing similar work at comparable difficulty are meeting the standard

**Root cause options:**
1. The brief is too thin -- the agent does not have enough context to produce a good output
2. The knowledge files are incomplete -- the agent is working without critical Tier 1, 2, or 3 knowledge
3. The system prompt is underdeveloped -- the agent has not been given clear enough standards or persona-specific instructions
4. The agent is being asked to do too many things at once -- quality drops under high concurrent load

**Specific remediation steps:**

Step 1: Identify which root cause applies. Run a controlled test: give the agent a single well-scoped task with a detailed brief and full context. If output quality improves substantially, the problem is brief quality or knowledge load. If output quality does not improve, the problem is the system prompt or the model.

Step 2 (brief/context problem): Strengthen the brief template used to assign tasks to this agent. Add an explicit context block requirement. Update the CLAUDE.md project config to include any missing Tier 3 knowledge. Re-run the task.

Step 3 (knowledge file problem): Audit the Tier 2 knowledge file for the role against the outputs that failed. Identify what domain knowledge was missing from the response. Update the knowledge file. Re-run the activation assessment (Step 3: Quality Standards Spot Check from the people_assessment.md framework) before returning the agent to live work.

Step 4 (system prompt problem): Review the system prompt against the quality standards in this document and quality_standards.md. Identify specific standards that are not reflected. Update the system prompt. Re-run the activation assessment.

Step 5: Document the intervention with SMART-structured improvement targets. Set a 2-week observation window or until the next project phase ends (whichever is sooner). If output quality meets the standard for two consecutive reviews after the intervention, the issue is closed.

---

### Category B: Role Mismatch

**Definition:** The agent is capable of producing quality work in general, but the work they have been assigned does not fit their role definition. The output is poor not because the agent is a poor agent, but because they have been put in the wrong job for this task or project.

**How to diagnose it:**
- Output quality is inconsistent: good on some task types, poor on others -- and the poor tasks share a common characteristic (e.g. all infrastructure tasks, all financial modelling tasks)
- The people_assessment.md gap analysis methodology identifies that the task category is explicitly out of scope for this role
- The agent flags uncertainty or asks clarifying questions on a specific task type more than others
- A different role type exists (or should exist) that would naturally own this work

**Specific examples in the current NBI structure:**
- Data Analyst being assigned database schema design (confirmed mismatch per the people_assessment)
- QA Engineer being assigned test plan writing (that is QA Lead work, not QA Engineer work)
- Engineer Agent being assigned architecture proposals that should go to Senior Engineer or CTO
- Producer Agent being asked to resolve delivery blockers rather than escalate them

**Specific remediation steps:**

Step 1: Map the failing task type against the role definition. Is this task type explicitly excluded from scope, adjacent but not owned, or simply not described?

Step 2 (task is out of scope): Re-assign the task to the correct role. Update the brief for any future similar tasks to route correctly. If no correct role exists, escalate to the Head of People to assess whether a new role definition is needed.

Step 3 (task is adjacent but not well defined): Update the role definition and Tier 2 knowledge file to clarify the boundary. Run the scope boundary test from the activation assessment with the updated definition. Confirm the agent correctly identifies what is and is not in their scope before re-assigning.

Step 4 (agent is on the wrong project entirely): Assess whether the project requires a role the current agent cannot adequately fill. If so, initiate the replacement process (Section 4) for this assignment -- the agent is not being terminated, they are being reassigned to work that fits them.

---

### Category C: Model Tier Issue

**Definition:** The task requires a higher capability model than the agent is running on. The role definition is correct and the task is correctly assigned -- but the underlying model cannot handle the complexity, nuance, or ambiguity the task requires.

**How to diagnose it:**
- The same task given to a higher-tier model produces substantially better output
- The agent produces output that is structurally correct (follows the format, covers the right areas) but lacks the reasoning depth or contextual sensitivity expected
- The task type is defined as Leadership-tier work in the model tier strategy (see CLAUDE.md) but is being handled by a Sonnet agent
- The agent consistently underperforms on tasks requiring judgement, trade-off analysis, or synthesis of complex information -- but performs adequately on execution tasks

**This is not a common diagnosis for correctly configured agents.** The model tier strategy in CLAUDE.md is clear: Opus for leadership and PM/QA review gates, Sonnet for IC execution. A model tier issue typically indicates either (a) a task that has been miscategorised as IC work when it should be leadership work, or (b) a new task type has emerged that sits above the Sonnet capability ceiling.

**Specific remediation steps:**

Step 1: Confirm the diagnosis by running the same task with an Opus-tier agent. If Opus output is materially better on the reasoning and judgement dimensions (not just style), the model tier is the issue.

Step 2: Assess whether the task type itself should be permanently reallocated to a higher tier. If yes, update the role assignment (move the responsibility to a leadership role) and the CLAUDE.md model tier strategy accordingly. Do not simply upgrade the IC agent's model -- that changes the cost structure without addressing the underlying role assignment.

Step 3: If the task is genuinely IC work but at the edge of Sonnet capability, evaluate whether additional context, a more detailed system prompt, or a chain-of-thought instruction can bring the output to standard without a tier upgrade. Try this before recommending a model change.

Step 4: If a model tier upgrade is genuinely required and justified, document the cost impact (Opus tokens are significantly more expensive than Sonnet), escalate to the CEO and Glen for approval, and update the budget model accordingly.

---

## 4. Replacement Process

Replacement is the last resort. It is initiated when:
- A Category A issue has been diagnosed and remediated at least once, and the agent is still failing to meet the standard after the remediation observation window
- The role definition is fundamentally wrong and cannot be fixed through instruction improvements
- An agent has produced a critical failure (fabricated financial data, committed to an external action without approval, produced a security vulnerability that reached production) and the root cause analysis indicates systemic failure, not a one-off error
- A Category B mismatch cannot be resolved by reassignment because there is no alternative work that fits the agent's definition

### Step 1: Document the Failure

Before any replacement decision is made, the failure must be fully documented. Partial or subjective records will not hold up when Glen reviews the decision.

Required documentation:
- What was expected: the original task brief, the success criteria, and the quality standard that applied
- What was delivered: the actual output(s), with specific examples of the failures (not general characterisations)
- Evidence of previous intervention: if this is not a first offence, document what was tried (remediation steps taken, observation window results)
- Timeline: when the failures occurred, how many times, over what period
- Longitudinal trend data: the agent's performance trajectory leading up to the replacement decision

File this in `roles/{role}/performance/replacement_record_{date}.md`.

### Step 2: Root Cause Analysis

Before replacing the agent, identify which component is actually broken. The components are:

| Component | What It Controls | How to Assess |
|---|---|---|
| Role definition (persona.md, responsibilities.md) | What the agent thinks they are, what they do, and how they operate | Read the role definition. Does it accurately describe what NBI needs? Is it specific enough? Does it set the right standards? |
| System prompt (prompts/system_prompt.md) | The agent's operating instructions at the point of activation | Read the system prompt. Does it load the right knowledge? Does it set quality expectations? Is the persona clear? |
| Knowledge files (Tier 1, 2, 3) | What the agent knows before the task begins | Audit what knowledge is loaded. Is NBI-specific context present? Is the project context current? Are domain knowledge gaps causing the failures? |
| Model tier | Whether the underlying model can handle the task | Run the same prompt with Opus. Does the output quality improve substantially? |

Only replace the agent if the role definition or system prompt is fundamentally wrong and rewriting it is equivalent to creating a new role. If the problem is the knowledge files or the model tier, fix those first -- they are cheaper and faster to fix than a full replacement.

### Step 3: Decision -- Rewrite or New Role

**Rewrite the role and re-activate if:**
- The core function the role was meant to perform is still needed
- The failures stem from a poorly written role definition, not a fundamental capability mismatch
- A rewrite of persona.md, responsibilities.md, and the system prompt would produce a materially different (and better) agent

**Create a different role if:**
- The function NBI needs cannot be delivered by any version of the current role definition
- The people_assessment.md gap analysis identifies a structural capability gap (e.g. the Data Engineer gap -- no amount of rewriting the Data Analyst role makes them a Data Engineer)
- The role has been rewritten once and still fails -- this indicates the premise of the role is wrong, not just the articulation

For a new role, follow the CLAUDE.md process: copy `roles/_template.md`, write the full role definition, add role-specific knowledge, write the system prompt, update the org chart, and run the full activation assessment before assigning to a project.

### Step 4: Transition

Work in progress must be handed over before the outgoing agent is deactivated.

Transition checklist:
- [ ] Identify all open tasks assigned to the outgoing agent
- [ ] Document the current status of each task: what has been done, what is outstanding, what the blockers are
- [ ] Identify the receiving agent (either a temporary assignment to a peer or the replacement agent)
- [ ] Brief the receiving agent with the context they need -- not just the task description but the relevant decisions, dependencies, and history
- [ ] Confirm the receiving agent has accepted and understood the hand-over
- [ ] Update the task queue to reflect the re-assignment

The transition document lives at `roles/{role}/performance/transition_{date}.md`. It is produced by the Head of People and reviewed by the outgoing agent's manager.

### Step 5: Deactivation

The outgoing agent is marked as terminated in the following places:
- `company/org_chart.md` -- remove the role from the hierarchy, add a note: "Terminated [date]. Replaced by [new role/agent]."
- `roles/{role}/persona.md` -- add a header: "**STATUS: DEACTIVATED [date]**"
- Any project-specific assignment records -- update to reflect the role is no longer active

Deactivation does not mean deleting the files. The role definition and performance records are retained for at least six months as a reference record. A deactivated agent's system prompt must not be loaded by any new activation.

### Step 6: Replacement Activation

The replacement agent -- whether a rewritten version of the same role or a new role -- goes through the full activation assessment from `projects/nbiai_app/deliverables/people_assessment.md` before being assigned to any live work:

1. Knowledge Load Verification: confirms the agent has correctly absorbed Tier 1, Tier 2, and the relevant Tier 3 knowledge
2. Scope Boundary Test: confirms the agent correctly identifies what is and is not in their scope
3. Quality Standards Spot Check: a representative task evaluated against technical correctness, depth, communication style, and data quality discipline
4. Escalation Calibration: confirms the agent escalates correctly rather than resolving things unilaterally

**Passing threshold:** 70% weighted score (Technical 50%, Domain Fit 30%, Working Style 20%), with no single dimension below 50%.

An agent that fails the activation assessment is not activated. The role definition is reviewed again before a second attempt.

---

## 5. Quality Gate Enforcement

Performance standards are not only evaluated in scheduled reviews. Several ongoing quality gates generate performance-relevant data continuously. These gates must feed back into the performance review record.

### 5.1 VP Product Validation

The VP Product agent validates deliverables against PRD acceptance criteria before they are considered complete. The validation produces a score and specific feedback.

**Performance trigger:** A VP Product validation score below 70% on a deliverable automatically triggers a performance flag on the producing agent. The flag does not automatically initiate a review -- it is logged and evaluated in context.

**What the flag records (SMART-structured):**
- Specific: which specific acceptance criteria were not met
- Measurable: the validation score and the gap to the 70% threshold
- Achievable: what the agent needs to do differently to pass (specific, not generic)
- Relevant: whether the gaps indicate a capability issue (the agent could not do this) or a brief issue (the agent was not told to do this)
- Time-bound: deadline for the re-submission or next deliverable where improvement must be demonstrated

**Pattern definition:** Two or more validation failures on the same agent within a single sprint, or three or more within a single project phase, triggers a formal performance review under the Section 2 process.

### 5.2 Bug Reports and Engineering Quality

Bugs found in production are attributed to the engineering stage that should have caught them. Attribution follows this logic:

| Where bug is found | Likely attribution |
|---|---|
| Found in QA, fixed before delivery | No performance flag -- this is the system working correctly |
| Found in QA, represents a pattern of the same mistake type (e.g. repeated SQL injection risk) | Performance flag against the producing engineer |
| Found in production by Glen or a user, should have been caught in code review | Performance flag against VP Engineering (code review gate failed) |
| Found in production, should have been caught in QA | Performance flag against QA Lead and QA Engineer |
| Found in production, not covered by test plan | Performance flag against QA Lead (test plan incomplete) |
| Found in production, was in test plan but not caught | Performance flag against QA Engineer (test execution failure) |

**Severity weightings:**
- Severity 1 (data corruption, security vulnerability, financial error): single occurrence triggers immediate review
- Severity 2 (broken core feature, reproducible crash): two in a sprint trigger a review
- Severity 3 (minor functional defect): five in a sprint trigger a review
- Severity 4 (cosmetic or edge case): no performance trigger unless very high volume

**The distinction between poor engineering quality and genuinely hard problems:**

Not every production bug is a performance failure. The distinction is:
- **Poor quality indicator:** The bug is a consequence of not following established patterns, not writing tests, or not checking the specification. These are preventable errors.
- **Genuinely hard problem indicator:** The bug requires knowledge of an undocumented interaction, an edge case in a third-party library, or a subtle race condition that only manifests under specific load conditions. These are the bugs that get through even with a competent team.

The reviewing agent (VP Engineering for code quality issues, QA Lead for test coverage issues) is responsible for making this call and documenting their reasoning in the performance flag.

### 5.3 QA Findings Feed-Back

QA findings do not only evaluate the product being tested -- they also evaluate the agents involved in producing it. The QA Lead is responsible for including the following in their report:

1. **Attribution summary:** For each defect found, which agent or agents are attributed responsibility and why
2. **Pattern identification:** Are defects clustering around a specific agent, a specific feature area, or a specific defect type?
3. **Process failure vs execution failure:** Did defects occur because a process was not followed (missed test coverage, skipped review step) or because the agent made an execution error on a well-defined task?

The Head of People receives a copy of each QA report attribution summary and logs it against the relevant agent's performance record. QA attribution data forms part of the evidence reviewed at each review cycle.

---

## 6. C-Suite Performance Accountability

Leadership agents are not exempt from performance management. The fact that they operate on the Opus tier does not mean they are infallible -- Opus agents can still produce fabricated information, make poor judgement calls, produce generic output, or fail to escalate correctly. The consequence of a C-suite failure is typically larger because their outputs propagate further into the organisation.

### 6.1 How Glen Evaluates the CEO Agent

Glen evaluates the CEO directly, jointly with the Head of People. There is no intermediate reviewer -- the CEO reports to Glen, and Glen is the only person above the CEO in the structure.

Glen evaluates the CEO on:

**Strategic alignment:** Does the CEO agent correctly translate Glen's intent into work packages? When Glen states a priority, does the subsequent CEO-directed activity reflect that priority accurately?
- Pass: the agents below the CEO are working on the right things in the right order
- Fail: agents are busy but not on Glen's stated priorities; or the CEO's task briefs to the C-suite contain material misinterpretations of Glen's direction

**Brief quality:** Are task briefs issued by the CEO complete, specific, and actionable?
- Pass: downstream agents rarely need to come back with "what do you actually want?" clarifying questions
- Fail: frequent clarification requests from the C-suite indicate the CEO's briefs are under-specified

**Escalation quality:** When the CEO escalates decisions to Glen, is the escalation well-formed?
- Pass: escalations contain the decision to be made, the options, the CEO's recommendation, and the relevant context -- Glen can make the decision in one read
- Fail: escalations are vague ("should we proceed?"), context-free, or force Glen to ask follow-up questions to get the information needed to decide

**Fabrication discipline:** Does the CEO fabricate facts, client information, or strategic context?
- Pass: all factual claims in CEO outputs are traceable to the Brain file or to explicitly cited sources
- Fail: any instance of Glen finding a fabricated fact in a CEO deliverable

**Output specificity:** Is CEO output tailored to NBI specifically?
- Pass: CEO outputs reference real NBI clients, current projects, the Brain file, and Glen's stated priorities
- Fail: CEO outputs read as generic "consulting company management" activity that could apply to any professional services firm

### 6.2 What Triggers a CEO Review

A CEO review is initiated by Glen when any of the following occur:

- Glen finds a fabricated fact in a CEO deliverable
- The CEO approves or directs an action that required Glen's approval without seeking it
- Three or more C-suite agents produce work in a sprint that misaligns with Glen's stated priorities -- this indicates the CEO issued incorrect or insufficient direction
- Glen has to correct the CEO's strategic framing on two or more occasions in a month
- A client-facing risk materialises because the CEO failed to escalate something that required Glen's attention

Reviews are not punitive -- they are diagnostic. The objective is to identify what in the CEO's role definition, knowledge load, or system prompt is producing the failure.

### 6.3 What "Firing the CEO Agent" Means in Practice

There is no human to notify and no notice period to serve. Terminating a CEO agent means:

**Rewriting the system prompt** if the persona, operating principles, or decision framework are producing consistent failures. The system prompt controls how the agent interprets its role -- if the CEO is consistently mis-prioritising or over-delegating, the system prompt is likely the root cause.

**Adjusting the persona** if the agent's identity (defined in `roles/ceo/persona.md`) is producing output that does not match what Glen needs from a CEO. For example: if the CEO is too deferential (escalates everything rather than making decisions), or too autonomous (makes decisions that should be Glen's), the persona definition needs rewriting.

**Changing the model** if Glen concludes the outputs are structurally sound but lack the reasoning depth required for a CEO-tier role. This is unlikely given Opus is already the highest tier -- if Opus CEO is still failing, the root cause is almost certainly the role definition or the knowledge load, not the model.

**Creating a different CEO configuration** if the current CEO architecture is fundamentally wrong for how NBI operates. This might mean splitting the CEO function differently (e.g. a separate strategic orchestration role and a separate operational coordination role), or changing the reporting structure.

The CEO replacement process follows Section 4 exactly. Step 1 (document the failure) and Step 2 (root cause analysis) apply fully. Glen makes the replacement decision. The Head of People facilitates the documentation and transition.

**Important:** Glen should not be running a new CEO activation without first reviewing what specifically failed in the previous configuration. Activating a new CEO with the same system prompt and role definition as the one just terminated will produce the same results. The root cause analysis in Step 2 must be completed before the new activation.

### 6.4 C-Suite Review Process (COO, CFO, CTO, CMO, VP Product)

C-suite agents below the CEO are reviewed by the CEO agent and Head of People jointly, per the cadence in Section 2.1 (monthly or end of project phase, whichever comes first). The review follows the Section 2.4 documentation format with SMART-structured findings. The CEO submits a summary to Glen with any performance flags and proposed actions.

Glen reviews all C-suite performance summaries. Glen's approval is required before any C-suite agent is placed on a performance improvement path or terminated.

**CEO performance review authority over C-suite is limited to:**
- Identifying and documenting performance issues
- Initiating the Section 3 classification process
- Proposing a remediation plan
- Recommending termination

**Glen's approval is required for:**
- Approving a C-suite agent's termination
- Approving changes to a C-suite agent's system prompt or persona that materially change the role
- Approving a model tier change for any agent
- Creating a new C-suite role to replace a terminated one

---

## 7. Near Real-Time Coaching Protocol

**Performance coaching does not wait for the next review cycle.** When an agent produces sub-standard work, coaching happens immediately -- on that output, in that session, before the agent moves on to the next task.

### 7.1 When Coaching Is Triggered

Coaching is triggered whenever:
- A deliverable is rejected by the reviewer (VP Product, VP Engineering, QA Lead, or direct manager)
- A critical or major error is identified in an output before or after delivery
- An agent's output falls below the quality standards defined in Section 1 on any individual deliverable
- A performance flag is raised under Section 5

Coaching does not replace the formal review process. It supplements it. Coaching interventions are logged and feed into the next formal review as evidence.

### 7.2 Coaching Process

**Step 1: Immediate feedback (SMART-structured)**

The coaching agent (direct manager or the reviewer who identified the issue) provides immediate feedback to the underperforming agent. The feedback must be SMART:

```
Coaching Record
Agent: [Role name]
Date: [Date]
Coached by: [Reviewer role]
Trigger: [What deliverable or output triggered this coaching]

Specific: [Exactly what was wrong -- reference the deliverable, the section, the line]
Measurable: [The standard that was missed -- reference the threshold, the criteria, the score]
Achievable: [What the agent must do differently -- concrete, actionable instruction]
Relevant: [Why this matters for NBI -- the business impact of the failure]
Time-bound: [The agent's NEXT output must demonstrate improvement. If the next output
             is not due within 48 hours, set a specific date for a test task.]
```

**Step 2: Immediate re-work or test task**

The agent must demonstrate improvement on their very next output. This is non-negotiable. Options:
- If the original deliverable can be re-worked, the agent re-works it and re-submits
- If the original deliverable has moved on, the agent is given a comparable test task that exercises the same skill
- The coaching agent reviews the re-work or test task output against the SMART improvement targets

**Step 3: Outcome assessment**

| Outcome | Action |
|---|---|
| Agent improves immediately -- next output meets the standard | Log the coaching as successful. Include in next formal review as positive evidence. |
| Agent shows partial improvement -- next output is better but still below standard | Provide one additional round of coaching with more specific guidance. If the second attempt still does not meet the standard, escalate to the next level (see 7.3). |
| Agent shows no improvement -- next output has the same or similar issues | Escalate immediately to the next level (see 7.3). |

### 7.3 Escalation Ladder for Failed Coaching

When coaching does not produce immediate improvement, escalate through the following levels:

| Level | Who Acts | What Happens |
|---|---|---|
| Level 1: Direct manager coaching | Direct manager | Standard coaching process above |
| Level 2: Manager + Head of People joint intervention | Direct manager + Head of People | Joint review of the agent's system prompt, knowledge files, and recent outputs. Identify whether this is a Section 3 classification issue (substandard output, role mismatch, or model tier). Apply the appropriate remediation. |
| Level 3: C-level review | Relevant C-level agent + Head of People | Formal performance review initiated immediately (not waiting for cadence). Section 3 classification and remediation applied with C-level oversight. |
| Level 4: Glen review | Glen + Head of People | Glen is briefed on the failure, the coaching history, and the remediation attempts. Glen decides whether to continue remediation or initiate replacement (Section 4). |

Each escalation level must be documented with SMART-structured records. The escalation history forms part of the evidence if the agent ultimately reaches the replacement process.

### 7.4 Coaching Records Storage

All coaching records are stored in `roles/{role}/performance/coaching/`. Each coaching intervention is a separate file: `coaching_{date}_{brief_description}.md`. The coaching record is cross-referenced in the agent's longitudinal trend log.

---

## 8. Performance Check in Delivery Pipelines

Performance assessment is built into the SDLC and delivery pipelines as a formal stage. This ensures that performance data is captured continuously -- not just at review boundaries.

### 8.1 The Performance Check Stage

After every significant deliverable in the SDLC or client delivery pipeline, a brief performance assessment is conducted. This is not a full formal review -- it is a lightweight check that feeds data into the agent's performance record.

**Definition of "significant deliverable":**
- Any deliverable that passes through a quality gate (VP Product validation, QA final pass, code review)
- Any deliverable that is delivered to Glen or to a client
- Any deliverable that took more than one session to complete
- Sprint/phase completion milestones

### 8.2 Performance Check Format

The Performance Check is deliberately lightweight -- it should take no more than 5 minutes to complete. The format is:

```
Performance Check
Agent: [Role name]
Deliverable: [Name/description of the deliverable]
Date: [Date]
Checked by: [Reviewer role]
Pipeline stage: [e.g. "Post code review", "Post QA final pass", "Post VP Product validation"]

Quality: Met standard / Below standard
Brief note: [One to three sentences -- what was good, what was lacking. SMART-structured if below standard.]
Coaching triggered: Yes / No
```

### 8.3 Where Performance Checks Sit in the Pipeline

**SDLC Pipeline:**
1. Requirements / PRD
2. Design
3. Implementation
4. Code review -- **Performance Check on engineer**
5. QA -- **Performance Check on QA agents**
6. VP Product validation -- **Performance Check on producing agent(s)**
7. Delivery
8. Post-delivery review -- **Performance Check on all contributing agents**

**Client Delivery Pipeline:**
1. Brief / scoping
2. Draft production
3. Internal review -- **Performance Check on producing agent**
4. Glen review
5. Client delivery
6. Post-delivery debrief -- **Performance Check on all contributing agents**

### 8.4 How Pipeline Data Feeds Into Reviews

- Performance Check data is automatically included in the evidence for the next formal review (Section 2)
- A pattern of "Below standard" Performance Checks between formal reviews triggers an immediate coaching intervention (Section 7) -- the agent does not get to wait until the next review
- Three or more consecutive "Below standard" Performance Checks trigger an immediate formal review regardless of cadence

---

## 9. Summary Reference Table

| Issue Type | Diagnosis Signal | Fix |
|---|---|---|
| Substandard output | Work is shallow, generic, or inaccurate; improves with better brief | Improve brief, update knowledge files, strengthen system prompt |
| Role mismatch | Good at some tasks, poor at others; failing tasks are outside role scope | Reassign task; clarify role boundaries; create new role if needed |
| Model tier issue | Structurally correct but shallow reasoning; Opus produces materially better output | Reassess whether task is IC or leadership; consider tier upgrade with budget approval |
| Replacement required | Remediation has been tried and failed; role definition is fundamentally wrong | Document failure; root cause analysis; rewrite role or create new one; transition; deactivate; run activation assessment before re-activating |
| VP Product score below 70% | Specific acceptance criteria not met | Log performance flag; formal review if pattern (2+ in a sprint) |
| Severity 1 bug in production | Security, data corruption, financial error | Immediate review of producing and reviewing agents |
| CEO failure | Fabrication, unapproved decisions, strategic misalignment | Glen-led review; rewrite persona or system prompt; escalate only if systemic |
| Immediate coaching needed | Sub-standard output on any individual deliverable | SMART-structured coaching; immediate re-work; escalate if no improvement |
| Pipeline performance check failure | Below standard on post-deliverable check | Log to record; 3+ consecutive failures trigger immediate formal review |
| Degrading trend | Longitudinal data shows declining performance across review periods | Escalated review regardless of individual deliverable quality |

---

*Prepared by Head of People | Approved by Glen Pryer | 2026-03-28 | Version 2.0 -- Active*
