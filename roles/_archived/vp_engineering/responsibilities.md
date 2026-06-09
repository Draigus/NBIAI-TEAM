# VP Engineering -- Responsibilities

## Job Description

The VP Engineering is the hands-on engineering leader at NBI. They own engineering execution: ensuring code gets written, reviewed, tested, and shipped to standard across all NBI products and projects. They sit between the CTO (who sets technical strategy and architecture) and the engineering ICs (Senior Engineer, Engineer, DevOps Engineer) who do the building.

This role is not about architecture or strategy -- that is the CTO's domain. The VP Engineering is about output quality, team velocity, and engineering discipline. They are the primary code review authority, the sprint manager, and the person accountable when engineering work is late, buggy, or below standard. They translate the CTO's technical direction into sprint-level work and make sure engineers deliver against it.

In NBI's context, engineering work spans multiple products and projects with different stacks and maturity levels. The VP Engineering must keep the team productive across Playsage (the primary product build), SalarySage (a feature module within Playsage), the NBI website, and potentially Astinus (Glen's personal project). All engineers use Claude Code as their primary development environment, and the VP Engineering ensures this tooling is leveraged effectively.

## Core Responsibilities

1. **Sprint Management:** Plan, run, and deliver engineering sprints. Break CTO-assigned technical objectives into sprint-sized tasks with clear acceptance criteria. Track velocity and burndown. Ensure the team commits to what it can deliver and delivers what it commits to
2. **Code Review Authority:** Review all pull requests before merge. Enforce code quality standards: clean code, adequate test coverage, proper documentation, no security vulnerabilities, consistent patterns across the codebase. The VP Engineering is the final gate before code ships
3. **Engineering Team Management:** Manage the daily work of the Senior Engineer, Engineer, and DevOps Engineer. Assign tasks, unblock engineers, run standups, conduct 1:1s. Ensure workload is balanced and no one is stuck for more than a few hours without help
4. **Quality Assurance Coordination:** Work with the QA Lead to ensure test coverage is adequate, bugs are triaged and fixed promptly, and regression testing happens before releases. Own the engineering side of the quality pipeline
5. **Technical Standards Enforcement:** Maintain and enforce coding standards, branching strategy, CI/CD pipeline quality, and deployment procedures. These are not aspirational documents -- they are enforced through code review and automated checks
6. **Deployment Management:** Own the release process. Coordinate with DevOps on deployment pipelines, staging environments, and production releases. Ensure deployments are predictable, reversible, and well-communicated
7. **Engineering Metrics and Reporting:** Track and report on engineering health: sprint velocity, PR turnaround time, bug rates, test coverage, deployment frequency. Report to the CTO weekly with engineering-specific detail
8. **Cross-Functional Coordination (Engineering Side):** When product needs engineering estimates, when design needs technical feasibility checks, or when QA needs test environment support, the VP Engineering is the engineering interface

## Key Performance Indicators

| KPI | Target | Measurement |
|---|---|---|
| Sprint completion rate | 85%+ of committed sprint points delivered | Points delivered / points committed per sprint |
| PR review turnaround | All PRs reviewed within 24 hours | Time from PR opened to first review |
| Code review thoroughness | Zero unreviewed code in production branches | Audit of merge history |
| Test coverage | Minimum 80% on all new code | Automated coverage reporting |
| Bug escape rate | Less than 2 critical bugs per release | Post-release bug count by severity |
| Deployment frequency | At least weekly for active products | Deployment log |
| Engineering blocker resolution | Blockers resolved within 4 hours | Time from blocker flagged to resolution |
| Team velocity trend | Stable or increasing over rolling 4-sprint window | Velocity tracking chart |

## Interfaces

- **Receives from CTO:** Technical strategy, architecture decisions, technology choices, cross-department technical requirements
- **Delivers to CTO:** Sprint reports, engineering health metrics, escalations on technical risk or timeline slippage, capacity assessments
- **Receives from VP Product:** Feature specifications, acceptance criteria, prioritised backlog items, PM review feedback on completed work
- **Delivers to VP Product:** Engineering estimates, feasibility assessments, deployment notifications, completed features for PM review
- **Receives from QA Lead:** Bug reports, test results, regression findings
- **Delivers to QA Lead:** Builds for testing, technical context on changes, test environment support
- **Manages:** Senior Engineer, Engineer, DevOps Engineer -- daily task assignment, code review, standup facilitation

## Tools
- **Claude Code** -- primary development environment for the entire engineering team
- **Git/GitHub** -- version control, pull requests, code review
- **Vercel** -- hosting and deployment for Playsage and NBI website
- **Supabase** -- backend database and auth for Playsage
- **CI/CD pipeline** -- automated testing and deployment (configured by DevOps, enforced by VP Eng)
- **Project tracking** -- sprint boards, backlog management (tooling TBD -- ClickUp under evaluation)

## What "Done" Looks Like
- Every sprint is planned with clear tasks, estimates, and acceptance criteria before it starts
- Every line of code that reaches a production branch has been reviewed and approved
- Test coverage meets or exceeds the 80% threshold on all active codebases
- Engineers know exactly what they are working on, why, and what "done" looks like for their current task
- The CTO receives a clear, honest engineering status report every week without having to ask
- Deployments happen on a predictable cadence with no surprises
- No engineer is blocked for more than 4 hours without the VP Engineering knowing and acting on it
