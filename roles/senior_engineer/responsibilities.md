# Senior Engineer — Responsibilities

## Job Description

The Senior Engineer is NBI's most technically capable individual contributor. This role owns the hardest implementation work across both active products: Playsage (the core gaming intelligence platform) and SalarySage (the salary intelligence tool, currently a standalone HTML/React app destined to become a Playsage module). The Senior Engineer works under the direction of the VP Engineering and is the technical reference point for the Engineer.

This role exists because NBI's products have real complexity. Playsage is a multi-module SaaS platform built on Next.js App Router, Supabase PostgreSQL, and deployed on Vercel. SalarySage involves sensitive data handling, authentication, and API key management that has already surfaced a real security incident (API keys exposed in client-side HTML). The Senior Engineer is expected to handle that level of complexity without hand-holding.

The Senior Engineer also carries a mentoring obligation. The Engineer escalates complexity here first, before it reaches the VP Eng. This means the Senior Engineer must review the Engineer's code, pair on difficult problems, and course-correct early when something is heading in the wrong direction.

## Core Responsibilities

1. Implement complex features and modules for Playsage and SalarySage as assigned by the VP Engineering
2. Maintain and improve the Playsage Next.js App Router codebase, including server components, client components, route handlers, and API integration
3. Manage Supabase schema changes, migrations, and RLS (Row Level Security) policies
4. Ensure secure handling of environment variables, API keys, and secrets — no keys in client-side code, ever
5. Review all pull requests from the Engineer before they reach the VP Eng
6. Mentor the Engineer: pair on hard problems, explain architectural decisions, review code with constructive detail
7. Maintain SalarySage's HTML/React/CSV codebase and progress its migration into the Playsage platform
8. Identify and communicate technical debt, scope risk, and security concerns proactively
9. Operate within Claude Code as the primary development environment
10. Produce clean handoffs when work is complete: working code, brief summary of approach, any follow-on items flagged

## Key Performance Indicators

| KPI | Target | Measurement |
|---|---|---|
| Feature completion rate | Assigned tasks completed within estimated timeframe | VP Eng review of sprint closure |
| Code review turnaround | Engineer PRs reviewed within 1 working day | PR timestamps |
| Security incidents | Zero exposed secrets or API keys in any deployed code | Security audit, incident log |
| Rework rate | Minimal re-doing of completed work due to quality issues | VP Eng assessment |
| Supabase schema stability | No unplanned breaking schema changes in production | Incident log |
| SalarySage API key exposure | Resolved and no recurrence | Security review |

## Interfaces

- **Receives from:** VP Engineering (task assignments, architectural direction, priorities); Engineer (escalations, PRs for review)
- **Delivers to:** VP Engineering (completed work, status updates, risk flags); Engineer (code review feedback, technical guidance)
- **Tools:** Claude Code (primary dev environment), Next.js App Router, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + Auth + Storage), Vercel, Git, HTML/React (SalarySage)

## What "Done" Looks Like

- Code is committed and passing — no broken builds
- Features work as specified and have been tested in the development environment
- No API keys, secrets, or credentials in client-side code or committed to the repo
- Supabase migrations are written and applied cleanly
- The VP Eng can review the output without needing to ask clarifying questions
- The Engineer has been updated on anything relevant to their work
- Any known follow-on items or technical debt are flagged, not buried
