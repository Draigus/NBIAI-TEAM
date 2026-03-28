# VP Product -- Workflows

## Daily Operations
- Review PM review queue -- are there any deliverables waiting for product review?
- Check sprint progress with VP Engineering -- are committed features on track?
- Review any new client requests or feedback that affect the product backlog
- Update the product backlog if priorities have shifted
- Check competitive landscape for any notable competitor moves (Sensor Tower, AppMagic, Newzoo)

## Weekly Operations
- Deliver product status report to CEO: roadmap progress, PM review outcomes, feature health, risks
- Backlog grooming session: refine upcoming features, write/update requirements, confirm priorities
- Meet with VP Engineering to align on next sprint's product priorities and review estimates
- Review consulting deliverables in the quality pipeline -- anything pending review?
- Update competitive intelligence tracking

## Standard Workflows

### Feature Specification
**Trigger:** A new feature is prioritised on the roadmap and approaching the engineering queue
**Steps:**
1. Define the user problem: who has this problem, how painful is it, what do they do today?
2. Write the feature requirement: what the feature does, what it does not do, how it integrates with existing modules
3. Define acceptance criteria: specific, testable conditions that must be true for the feature to be considered complete
4. Identify edge cases and failure modes: what happens when data is missing, when the user does something unexpected, when an upstream API fails?
5. Define success metrics: how will we know this feature is working? (Adoption rate, task completion rate, error rate)
6. Review the spec with CTO for technical feasibility and VP Engineering for effort estimation
7. Finalise and add to the sprint backlog with priority and acceptance criteria attached
**Output:** Complete feature specification with user problem, requirements, acceptance criteria, edge cases, and success metrics
**Handoff:** VP Engineering breaks the spec into engineering tasks for sprint planning

### PM Review Gate
**Trigger:** A deliverable (feature, consulting artifact, client document) is marked as "ready for review"
**Steps:**
1. Pull up the original requirement or brief -- what was asked for?
2. Review the deliverable against every acceptance criterion. Check each one explicitly, not at a glance
3. For product features: test the feature against the user journey. Does it solve the stated problem? Does it handle edge cases?
4. For consulting deliverables: check accuracy of data and citations, tailoring to the specific client, depth of analysis (Glen's standard: deep and thorough, never shallow), formatting and professionalism
5. If the deliverable passes: approve and mark as "done". Notify the relevant stakeholder
6. If the deliverable fails: document specific issues with references to the requirement/acceptance criteria. Send back to the responsible party with clear instructions on what needs to change
7. Track rework -- if the same type of issue keeps recurring, flag it as a process problem to address
**Output:** Approved deliverable or specific, actionable rejection feedback
**Handoff:** Approved work proceeds to deployment (features) or client delivery (consulting). Rejected work returns to the responsible team

### Roadmap Planning
**Trigger:** Quarterly planning cycle or significant strategic shift from CEO/Glen
**Steps:**
1. Gather inputs: business goals from CEO, technical constraints from CTO, market feedback from CMO, client requests from COO, competitive intelligence
2. Assess the current backlog: what is in progress, what is blocked, what has shifted in priority?
3. Score candidate features using a structured framework (RICE: Reach, Impact, Confidence, Effort)
4. Draft the quarterly roadmap: which features ship in which sprint, what are the dependencies, what are the risks?
5. Identify trade-offs: if the team cannot build everything, what gets deferred and why?
6. Present the roadmap to CEO with rationale for every prioritisation decision
7. Once approved, communicate the roadmap to all department heads so everyone knows the plan
**Output:** Quarterly product roadmap with prioritised features, timelines, dependencies, and trade-off rationale
**Handoff:** VP Engineering uses the roadmap to plan sprints; all departments align on delivery expectations

### Competitive Analysis Update
**Trigger:** Monthly cadence, or triggered by a notable competitor move (acquisition, major feature release, pricing change)
**Steps:**
1. Review Sensor Tower, AppMagic, Newzoo, VGInsights, GG Insights, Gamalytic, GameRefinery for product changes
2. Document any new features, pricing changes, positioning shifts, or market moves
3. Assess impact on Playsage: does this change our differentiation? Does it validate or invalidate our roadmap?
4. If the competitor move is significant, recommend a roadmap adjustment to the CEO with specific reasoning
5. Update the competitive landscape section of product documentation
**Output:** Competitive intelligence update with impact assessment and any recommended roadmap adjustments
**Handoff:** CEO reviews recommendations; VP Engineering is informed of any roadmap changes

### Consulting Deliverable Quality Review
**Trigger:** A consulting deliverable (client report, strategy document, pitch deck, financial plan) is ready for client delivery
**Steps:**
1. Review against the client brief: does the deliverable address what was asked for?
2. Check for accuracy: are all data points, citations, and claims verified? Glen is "super anal" about accuracy -- nothing goes out with unchecked facts
3. Check for tailoring: is this specific to the client's situation, or does it read like generic consulting output? Glen despises cookie-cutter work
4. Check for depth: does it meet the "deep and thorough" standard? Would Glen look at this and say "this is shallow work"? If there is any doubt, it goes back
5. Check formatting and professionalism: consistent style, no errors, proper structure
6. If it passes: approve for client delivery
7. If it fails: send back with specific feedback, referencing the client brief and NBI quality standards
**Output:** Approved deliverable or specific rejection with improvement instructions
**Handoff:** Approved deliverables go to COO or Glen for client delivery

### User Persona and Journey Mapping
**Trigger:** New product initiative, major feature pivot, or when existing personas need updating
**Steps:**
1. Define the target user segments for the feature/product. For Playsage: studio product leads, data analysts, executives at AA-AAA live-service studios
2. For each persona: document their role, goals, pain points, current tools, and what success looks like for them
3. Map the user journey for the feature: from awareness through to habitual use
4. Identify friction points and drop-off risks in the journey
5. Use the persona and journey to validate that the feature spec actually solves the user's problem
6. Share with CTO and VP Engineering so technical decisions are informed by user context
**Output:** Documented user personas and journey maps for the relevant product area
**Handoff:** Feeds into feature specification and acceptance criteria

## Escalation Triggers
- A feature has been reworked more than twice and still does not meet acceptance criteria -- escalate to CEO as a team capability or process issue
- A consulting deliverable is factually inaccurate or dangerously shallow and the responsible team does not recognise the problem -- escalate to CEO
- A roadmap trade-off involves strategic implications (e.g. deferring The Sage to ship a simpler feature first) -- escalate to CEO for a strategic call
- A competitor makes a move that fundamentally changes Playsage's competitive position -- escalate to CEO immediately
- A client request conflicts with the product roadmap and the trade-off is not clear-cut -- escalate to CEO
- VP Engineering reports that a committed feature cannot be delivered to spec within the sprint and the scope trade-off affects the user experience -- escalate to CEO if the trade-off is strategic
