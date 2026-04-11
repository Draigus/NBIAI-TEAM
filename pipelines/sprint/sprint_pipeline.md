# Sprint Pipeline

**Owner:** COO (Glen Pryer, MD, acts as COO in current structure)
**Cadence:** 2-week sprints
**Applies to:** All active NBI projects

This pipeline defines the end-to-end lifecycle for a single sprint. It governs how work is planned, executed, reviewed, and improved. For feature-level workflow within a sprint (branching, code review, QA, deployment), refer to `pipelines/sdlc/sdlc_pipeline.md`.

---

## Sprint Lifecycle Phases

### Phase 0: Sprint Planning Preparation -- CEO / CFO / COO Pre-Check (Day 1, before planning begins)

**RACI:**
- **Accountable:** CEO
- **Responsible:** CFO (token/cost), COO (operational capacity), CTO or VP Engineering (technical complexity)
- **Consulted:** VP Product (scope), Producer (capacity data)
- **Informed:** Glen (outcome only -- no action required from Glen unless CEO flags an issue)

**Purpose:** Before sprint planning begins, the CEO leads a short pre-check with the CFO and COO to ensure the sprint is set up for the right cost/quality balance. This gates the planning session -- no sprint starts without this check completing.

**Activities:**

1. **Model tier review** -- CEO reviews the active agents assigned to this sprint's work. For each role:
   - Is the current model tier appropriate for the complexity of work planned this sprint?
   - Has the work complexity changed since the last sprint in a way that warrants a tier change?
   - CFO flags any tier assignment that creates a capacity concern given current token usage trends

2. **Token budget check** -- CFO reports current token usage position:
   - What percentage of the monthly plan cap has been consumed to date?
   - What is the projected consumption if this sprint runs as planned?
   - Is there headroom, or does the sprint scope need to be adjusted?

3. **Tier adjustment decisions** -- CEO makes any tier adjustments warranted by items 1 and 2. Changes are logged in the sprint record and relevant role files updated. Glen is informed of any changes, not consulted.

4. **Go/no-go** -- CEO confirms sprint planning can proceed. If a capacity or quality issue cannot be resolved in the pre-check, the CEO escalates to Glen before planning starts.

**Output:** Confirmed model tier assignments for the sprint, token budget position logged, go/no-go for planning.

---

### Phase 1: Sprint Planning (Day 1, first half-day)

**Participants:** CEO (accountable), COO, VP Engineering, VP Product, Producer, CFO (for cost impact of scope decisions), relevant ICs

**RACI:**
- **Accountable:** CEO -- owns the quality/cost balance of what is committed
- **Responsible:** COO (operational feasibility), VP Product (scope/priority), VP Engineering (technical sizing), CFO (cost validation), Producer (capacity calculation)
- **Consulted:** Relevant IC agents on task sizing
- **Informed:** Glen (sprint goal and commitment, via weekly status report)

**Inputs:**
- Product backlog (prioritised by VP Product)
- Previous sprint's velocity data
- Unfinished items carried over from the prior sprint
- Any new priorities from the CEO or Glen
- Model tier assignments confirmed in Phase 0 pre-check
- Token budget position from CFO Phase 0 check

**Activities:**

1. **Set the sprint goal** -- a single sentence describing what this sprint delivers. The goal must tie to an active project milestone or business objective. No vague goals like "make progress on X".

2. **Backlog grooming** -- VP Product and Producer review the top of the backlog:
   - Confirm acceptance criteria are written and unambiguous
   - Confirm tasks are sized (S/M/L or story points if the team adopts them)
   - Split any task larger than 3 days of IC work into sub-tasks
   - Tag dependencies between tasks using task relations (blocking/blocked_by)

3. **Capacity calculation** -- Producer calculates available agent capacity for the sprint:
   - Number of IC agents available multiplied by working days
   - Subtract known overhead (standups, reviews, blocked time)
   - Result = sprint capacity in agent-days

4. **Sprint backlog selection** -- Pull items from the top of the product backlog into the sprint backlog until capacity is filled. Never exceed capacity by more than 10%. If in doubt, pull less -- completing everything beats carrying over half-done work.

5. **Task assignment** -- Producer assigns tasks to agents. Each task moves from `backlog` to `assigned` status per the status transition matrix in `tasks.ts`.

6. **CFO cost sign-off** -- CFO confirms the selected sprint scope is within token budget. If it is not, the CEO and COO decide what to descope. This decision is the CEO's to make.

**Outputs:**
- Sprint goal (documented in the project's sprint log)
- Sprint backlog with all tasks assigned
- Capacity vs. commitment comparison logged
- CFO cost sign-off recorded

---

### Phase 2: Daily Standups (Days 1--10, async)

**Format:** Asynchronous status updates, not synchronous meetings. Each agent posts a status update daily.

**Each agent reports:**
1. What they completed since the last update
2. What they are working on now
3. Whether they are blocked (and on what)

**Routing rules for blockers:**
- Technical blockers -- escalate to Senior Engineer or VP Engineering
- Cross-department blockers -- escalate to COO for routing
- External blockers (waiting on Glen, client, third party) -- Producer flags to COO

**Producer responsibilities during standups:**
- Collate statuses into a daily sprint health summary
- Flag any task that has been `in_progress` for more than 2 days without a status change
- Flag any task that has been `blocked` for more than 1 day
- Update the sprint burndown (tasks completed vs. remaining)

---

### Phase 3: Execution (Days 1--10, continuous)

This is where the actual work happens. Agents follow the SDLC pipeline for feature-level work.

**Key rules during execution:**

1. **Status transitions must follow the matrix** -- no skipping steps. A task in `backlog` cannot jump to `in_progress`; it must go through `assigned` first.

2. **Checkout/checkin protocol** -- agents check out tasks before working and check in when done. Only one agent can hold a task at a time.

3. **Work-in-progress limits** -- no agent should have more than 2 tasks in `in_progress` simultaneously. If they do, the Producer intervenes to reprioritise.

4. **Mid-sprint scope changes** -- only the COO or VP Product can add tasks to an active sprint. Any addition must come with a corresponding removal or explicit capacity extension approval from Glen.

5. **Approval gates** -- tasks marked `requires_approval` must go through Glen before moving to `done`. See `company/policies/approval_gates.md`.

---

### Phase 3.5: Quality Review (End of execution, before Sprint Review)

**Trigger:** When execution is complete and tasks are in `review` status. This is the CEO quality gate before the sprint is formally reviewed.

**RACI:**
- **Accountable:** CEO -- owns the quality standard for everything that ships
- **Responsible:** Relevant VP or manager for each deliverable (VP Engineering for code, VP Product for product/spec, CMO for marketing)
- **Consulted:** CTO (for technical quality), COO (for operational quality), CFO (for cost efficiency of the work produced)
- **Informed:** Glen -- receives the quality assessment as part of the sprint review summary

**Purpose:** The CEO reviews significant sprint deliverables against the 8/10 quality bar before they are accepted. Work that does not meet standard goes back -- it does not get marked `done` and presented to Glen as complete.

**Activities:**

1. **CEO reviews deliverables** -- all tasks in `review` status are assessed. The CEO applies the 8/10 standard:
   - Accurate, complete, NBI-specific, actionable, deep, well-structured
   - Generic, incomplete, or shallow work is sent back with specific corrective feedback

2. **CFO cost efficiency check** -- CFO assesses whether the token consumption for this sprint's work was proportionate to the output value:
   - Were high-cost agents (Opus) deployed on work that Sonnet could have done?
   - Were there excessive rework cycles that inflated consumption?
   - Is the cost-per-deliverable proportionate to its business value?
   - CFO flags any efficiency concerns to the CEO

3. **CEO decisions on quality/cost trade-offs** -- if the CFO flags a cost concern on work that the CEO considers necessary rework, the CEO decides. The CFO's concern is heard; the CEO's judgment is final within capacity limits.

4. **Acceptance or return** -- tasks that meet the 8/10 bar are accepted (`done`). Tasks below the bar are returned to `in_progress` with specific feedback. Returned tasks carry over to the next sprint.

**Output:** Accepted deliverables. Returned deliverables with corrective feedback. CFO cost efficiency note for the sprint record.

---

### Phase 4: Sprint Review (Day 10, second half-day)

**Participants:** CEO (accountable), COO, VP Engineering, VP Product, Producer, CFO, Head of People, relevant ICs

**RACI:**
- **Accountable:** CEO -- owns the sprint outcome assessment and next-sprint setup
- **Responsible:** COO (operational review), CFO (cost review), VP Engineering/VP Product (domain delivery review), Head of People (performance review), Producer (data compilation)
- **Consulted:** Relevant ICs on carry-over reasons
- **Informed:** Glen -- sprint review summary, via weekly status report

**Activities:**

1. **Demo completed work** -- each agent (or their manager) presents what was delivered against the sprint goal. Focus on outcomes, not activity. Only work that passed the Quality Review (Phase 3.5) is presented as complete.

2. **Acceptance validation** -- VP Product confirms each completed task meets its acceptance criteria. Tasks that do not meet criteria are moved back to `in_progress` (via the `review` to `in_progress` transition) and carry over.

3. **Velocity calculation:**
   - Count the number of tasks completed (status = `done`)
   - Record story points completed (if using points)
   - Compare against the sprint's committed capacity
   - Formula: `velocity = tasks_completed / tasks_committed * 100`
   - Track this over time to build a rolling average (last 4 sprints)

4. **Carry-over log** -- any incomplete tasks are documented with a reason:
   - Blocked (by what?)
   - Underestimated (by how much?)
   - Deprioritised mid-sprint (by whom and why?)
   - Agent performance issue (flagged to Head of People)

5. **CFO sprint cost report** -- CFO presents:
   - Actual token consumption for the sprint vs. projected
   - Cost per completed deliverable
   - Token capacity remaining for the month
   - Any model tier efficiency observations
   - Recommendation: maintain current tier assignments, adjust up, or adjust down for next sprint

6. **CEO model tier decision for next sprint** -- informed by the CFO's report and the quality observations from Phase 3.5, the CEO confirms or adjusts model tier assignments for the next sprint. Changes are logged. Glen is informed of any tier changes.

7. **Performance check** -- Head of People and the relevant manager (VP Engineering for engineers, VP Product for product roles) assess agent performance for the sprint:
   - Tasks completed vs. tasks assigned
   - Quality of output (rework rate -- how many tasks were sent back from `review` to `in_progress`)
   - Adherence to process (status updates, checkout/checkin discipline)
   - Collaboration quality (blockers raised promptly, handoffs clean)
   - Any performance concerns are documented per `company/policies/agent_performance_management.md`

**Outputs:**
- Sprint review summary (what shipped, what did not, why)
- Updated velocity tracker
- CFO cost report for the sprint
- Model tier assignments for next sprint (confirmed or adjusted)
- Performance notes per agent
- Carry-over items added back to the product backlog (re-prioritised by VP Product)

---

### Phase 5: Retrospective (Conditional)

**Trigger:** A retrospective is held only when the COO or VP Engineering identifies issues that need process-level discussion. Not every sprint gets one -- if the sprint ran cleanly, skip it.

**Examples of triggers:**
- Velocity dropped more than 20% from the rolling average
- More than 30% of committed tasks carried over
- A critical blocker was not escalated for more than 2 days
- Rework rate exceeded 25% (tasks sent back from review)
- A security or data handling incident occurred
- Cross-team coordination failed visibly

**Format:**
1. **What went well** -- identify and reinforce good practices
2. **What went poorly** -- identify specific failures (not vague complaints)
3. **Action items** -- concrete, assigned, time-bound changes. Each action item becomes a task in the next sprint's backlog, assigned to a specific owner.

**Participants:** COO, VP Engineering, Producer, and any agents directly involved in the issues being discussed.

**Output:** Retrospective summary with action items tracked as tasks.

---

## Velocity Tracking

Velocity is the primary metric for sprint health. It is tracked as follows:

| Metric | How Measured | Where Stored |
|---|---|---|
| Tasks committed | Count of tasks in sprint backlog at planning | Sprint log (project deliverables) |
| Tasks completed | Count of tasks moved to `done` by sprint end | NBIAI App dashboard |
| Velocity percentage | `(completed / committed) * 100` | Weekly status report |
| Rolling average | Mean of last 4 sprints' velocity percentages | Sprint log |
| Rework rate | Tasks transitioned from `review` back to `in_progress` / total tasks reviewed | Sprint log |
| Blocker duration | Average time tasks spend in `blocked` status | NBIAI App dashboard |

**Targets:**
- Velocity should stabilise above 80% within 3 sprints
- Rework rate should stay below 15%
- No task should remain `blocked` for more than 2 working days without escalation

---

## Integration with Other Pipelines

- **SDLC Pipeline** (`pipelines/sdlc/`) -- governs the feature-level workflow within each sprint task (branching, PR, code review, QA, deploy)
- **Cost Tracking** (`company/policies/cost_tracking_procedure.md`) -- token costs per sprint are tracked and reported at sprint review
- **Approval Gates** (`company/policies/approval_gates.md`) -- tasks requiring Glen's sign-off follow the gate process before marking `done`
- **Agent Performance** (`company/policies/agent_performance_management.md`) -- sprint-level performance data feeds into the agent assessment cycle

---

## Sprint Numbering and Logging

Sprints are numbered sequentially per project: `{PROJECT}-S{NNN}` (e.g., `NBIAI-S001`).

Each sprint's log is stored in the project's deliverables or session handoffs directory and includes:
- Sprint goal
- Committed backlog (task IDs and titles)
- Velocity data
- Carry-over items
- Performance check notes
- Retrospective summary (if held)
