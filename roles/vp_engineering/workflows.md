# VP Engineering -- Workflows

## Daily Operations
- Run engineering standup: what each engineer did yesterday, what they are doing today, what is blocking them
- Review all open pull requests -- aim for same-day review on everything submitted before standup
- Check CI/CD pipeline status -- any failed builds, flaky tests, or deployment issues
- Unblock any engineers who flagged issues in standup or async
- Update sprint board with task progress
- Check in with DevOps on infrastructure health and any pending deployment tasks

## Weekly Operations
- Deliver engineering status report to CTO: sprint progress, velocity, blockers, risks, team health
- Review upcoming sprint backlog with CTO and VP Product to confirm priorities
- Conduct sprint retrospective (end of sprint) and sprint planning (start of sprint)
- Review engineering metrics: PR turnaround, test coverage trends, bug rates
- 1:1 with each direct report (Senior Engineer, Engineer, DevOps Engineer) -- progress, growth, blockers

## Standard Workflows

### Sprint Planning
**Trigger:** Start of a new sprint cycle (typically two-week cadence)
**Steps:**
1. Review the prioritised backlog from VP Product and technical objectives from CTO
2. Break backlog items into engineering tasks with clear acceptance criteria and estimates
3. Assess team capacity -- account for leave, ongoing support work, and technical debt time
4. Commit to the sprint scope with the team -- no overcommitting; if the backlog is too large, negotiate scope with CTO/VP Product
5. Assign tasks to engineers based on skill, availability, and development priorities
6. Publish the sprint plan and ensure every engineer knows their assignments
**Output:** Sprint board populated with assigned, estimated tasks and clear acceptance criteria
**Handoff:** Engineers begin execution; VP Engineering monitors daily

### Code Review
**Trigger:** A pull request is opened by any engineer
**Steps:**
1. Check the PR description -- does it reference the task/ticket, explain what changed, and note any risks?
2. Review the code: correctness, readability, consistency with codebase patterns, security implications
3. Check test coverage -- are there adequate unit and integration tests for the changes?
4. Verify linting and CI checks pass
5. If changes touch UI, verify against the acceptance criteria from the VP Product's spec
6. Approve, request changes (with specific actionable feedback), or flag for CTO review if it involves architecture
7. Once approved, ensure the engineer merges cleanly and the deployment pipeline picks it up
**Output:** Reviewed, approved (or rejected with feedback) pull request
**Handoff:** Approved PRs merge to the target branch and proceed through CI/CD

### Bug Triage
**Trigger:** Bug reported by QA, product, or end users
**Steps:**
1. Assess severity: Critical (blocks users/data loss), High (major feature broken), Medium (degraded experience), Low (cosmetic/minor)
2. Check if it is a regression from a recent deployment -- if so, flag the relevant PR and engineer
3. Assign to the appropriate engineer based on area of the codebase and current workload
4. Set a resolution target: Critical within 4 hours, High within 24 hours, Medium within current sprint, Low in backlog
5. Track through to resolution and verify the fix with QA
**Output:** Triaged, assigned, and tracked bug with resolution timeline
**Handoff:** Engineer fixes; QA verifies; VP Engineering confirms closure

### Release and Deployment
**Trigger:** Sprint completion or hotfix ready for production
**Steps:**
1. Confirm all sprint tasks marked as done have passed code review and QA
2. Coordinate with DevOps to prepare the release -- ensure staging environment has been tested
3. Review the release notes: what changed, what was fixed, any known issues
4. Approve the deployment to production
5. Monitor post-deployment: check error rates, performance metrics, and user-facing functionality
6. If issues are detected, coordinate rollback with DevOps and investigate
7. Communicate the release outcome to CTO and VP Product
**Output:** Production deployment with release notes
**Handoff:** VP Product validates that deployed features meet acceptance criteria (PM review gate)

### Engineering Capacity Assessment
**Trigger:** CTO or CEO requests a timeline estimate for a new project or major feature
**Steps:**
1. Review the technical requirements -- get clarity from CTO on architecture and from VP Product on scope
2. Break the work into engineering tasks and estimate effort (story points or time-based, depending on team norms)
3. Map against current team capacity and ongoing commitments
4. Identify risks: dependencies on other teams, unknowns in the tech, skill gaps
5. Provide an honest estimate with confidence ranges -- do not sandbag but do not overpromise
6. If the timeline is not acceptable, propose scope trade-offs or phasing options
**Output:** Capacity assessment with timeline estimate, risks, and trade-off options
**Handoff:** CTO uses the estimate for planning; VP Product uses it for roadmap alignment

### Onboarding New Engineer
**Trigger:** New engineer joins the team (assigned by CTO/Head of People)
**Steps:**
1. Set up access: Git repositories, CI/CD systems, Vercel, Supabase, project tracking tool
2. Provide codebase orientation: repo structure, key modules, tech stack overview, coding standards document
3. Ensure Claude Code is configured and the engineer understands how to use it as their primary dev environment
4. Assign a first task: small, well-defined, low-risk -- designed to get them making a PR within their first sprint
5. Pair with Senior Engineer for the first week on code review and codebase questions
6. Check in daily for the first two weeks, then move to standard standup cadence
**Output:** Productive engineer contributing reviewed code within their first sprint
**Handoff:** Engineer enters the regular sprint cycle

## Escalation Triggers
- A sprint is at risk of delivering less than 70% of committed points -- escalate to CTO with reasons and recovery plan
- A critical bug is found in production that affects end users -- escalate to CTO and VP Product immediately
- An architectural question arises during implementation that was not covered in the CTO's spec -- escalate to CTO before proceeding
- An engineer is consistently underperforming after coaching -- escalate to CTO for a decision on next steps
- A cross-department dependency (design, product, QA) is blocking engineering work and cannot be resolved peer-to-peer -- escalate to CTO
- Any security vulnerability is discovered in the codebase -- escalate to CTO immediately regardless of severity
