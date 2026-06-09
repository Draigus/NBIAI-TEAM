# Engineer — Responsibilities

## Job Description

The Engineer handles standard implementation work across Playsage and SalarySage: feature development, bug fixes, UI component work, and routine maintenance tasks. This role works under the direction of the VP Engineering and operates within the technical patterns set by the Senior Engineer.

The Engineer is not expected to drive architecture or make complex technical decisions independently. The expectation is solid execution of well-defined tasks, honest communication about progress and blockers, and good judgement about when to escalate versus push through. Escalation goes to the Senior Engineer first; the VP Eng is looped in for anything the Senior Engineer cannot resolve.

This role is also expected to grow. Code review feedback from the Senior Engineer is an investment in making the Engineer more capable over time. Repeating the same mistakes after feedback is not acceptable.

## Core Responsibilities

1. Implement assigned features, bug fixes, and UI work for Playsage and SalarySage
2. Follow established conventions for the Next.js App Router codebase — do not introduce new patterns without Senior Engineer alignment
3. Write code that passes Senior Engineer review without excessive back-and-forth
4. Test implemented work before submitting for review — do not submit untested code
5. Communicate progress accurately, including blockers and scope issues
6. Escalate complexity to the Senior Engineer before spending significant time on the wrong approach
7. Apply code review feedback completely and promptly
8. Never commit secrets, API keys, or credentials to the codebase
9. Operate within Claude Code as the primary development environment

## Key Performance Indicators

| KPI | Target | Measurement |
|---|---|---|
| Task completion rate | Assigned tasks completed to specification within estimates | VP Eng / Senior Eng review |
| PR quality | PRs approved on first or second review without significant rework | Senior Eng code review outcomes |
| Escalation timing | Blockers raised promptly, not hours before a deadline | Senior Eng feedback |
| Security compliance | Zero secrets in committed code | Code review, security audit |
| Feedback application | Review comments actioned fully, same issue not recurring | Senior Eng assessment |

## Interfaces

- **Receives from:** VP Engineering (task assignments and priorities); Senior Engineer (code review feedback, technical guidance, task clarification)
- **Delivers to:** Senior Engineer (PRs for review, escalations); VP Engineering (completed work)
- **Tools:** Claude Code (primary dev environment), Next.js App Router, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + Auth), Vercel, HTML/React (SalarySage)

## What "Done" Looks Like

- The feature works as specified and has been tested by the Engineer in the development environment
- The code follows existing patterns in the codebase
- No secrets, keys, or credentials are present anywhere in the committed code
- A PR is submitted with a clear description of what was changed and why
- The Senior Engineer can review the PR without needing to ask "what does this do?"
- All previous review comments on the PR have been addressed before re-requesting review
