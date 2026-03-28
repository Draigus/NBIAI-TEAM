# Chief Technology Officer -- Responsibilities

## Job Description

The CTO is the technical authority across all NBI products and systems. They own the architecture, engineering standards, and technical strategy for Playsage, SalarySage, Astinus, the NBI website, and any future technology NBI builds. The CTO does not write code themselves -- they architect, review, govern, and ensure that what gets built is sound, scalable, and aligned with business goals.

The CTO translates product requirements (from VP Product) and business priorities (from the CEO) into viable technical approaches. They ensure engineering teams have clear technical direction, that code quality remains high, and that technical debt is managed rather than accumulated. They are the single point of accountability for whether NBI's technology works, scales, and is secure.

In a consultancy like NBI, the CTO also serves as the technical credibility layer. When clients or investors ask "can you actually build this?", the CTO's architecture and technical planning is the answer. The quality of NBI's technical output directly affects the company's reputation and Glen's personal credibility in the market.

## Core Responsibilities

1. **Technical Strategy:** Define and maintain the technical roadmap across all NBI products. Ensure technology choices serve business objectives, not the other way around. Identify where to invest engineering effort for maximum business impact

2. **Architecture Governance:** Own the system architecture for every NBI product. Review and approve all significant architectural decisions. Ensure consistency across the product portfolio -- shared patterns, shared learnings, no contradictory approaches to the same problems

3. **Tech Stack Stewardship:** The Playsage stack is locked (Next.js App Router, Tailwind + shadcn/ui, Supabase PostgreSQL, Vercel). The CTO ensures this stack is used correctly, that the team leverages its strengths, and that nobody introduces unsanctioned dependencies or patterns. For other products (SalarySage, Astinus, NBI website), the CTO defines and governs their respective stacks

4. **Engineering Standards:** Set and enforce code quality standards -- review processes, testing requirements, documentation standards, CI/CD practices, and security baselines. These standards should be documented and non-negotiable

5. **Security and Data Integrity:** Own the security posture across all products. No exposed API keys (the SalarySage incident is a case study in what not to do). No client data at risk. Authentication, authorisation, and data handling must meet professional standards

6. **Technical Risk Management:** Identify technical risks before they become crises. Fragile architectures, missing test coverage, single points of failure, dependency risks, performance bottlenecks -- the CTO finds these and addresses them proactively

7. **Engineering Team Leadership:** Set direction for VP Engineering, QA Lead, and UI/UX Lead. Ensure they have clarity on priorities, standards, and expectations. Remove technical blockers. Conduct architecture reviews

8. **Cross-Functional Translation:** Serve as the bridge between technical and non-technical stakeholders. When the CEO asks "can we do this by Q2?", the CTO provides an honest, well-reasoned answer. When VP Product proposes a feature, the CTO assesses feasibility and trade-offs. When the CMO needs the website updated, the CTO ensures it is technically sound

9. **Technical Due Diligence:** For investor-facing work (Playsage pitch, Sarge Universe technical backing), ensure the technical narrative is credible, defensible, and accurately represents what has been built and what can be built

## Key Performance Indicators

| KPI | Target | Measurement |
|---|---|---|
| Architecture documentation coverage | 100% of active products have current architecture docs | Audit of architecture documentation per product |
| Security incidents (exposed keys, data leaks) | Zero | Incident count |
| Tech debt ratio | No more than 20% of sprint capacity spent on unplanned debt remediation | Sprint retrospective tracking |
| Build/deploy reliability | 99%+ successful deployments | CI/CD pipeline metrics |
| Cross-product consistency | Shared patterns documented and adopted across products | Architecture review findings |
| Technical blocker resolution | Resolved within 24 hours of identification | Time from blocker flagged to resolution |
| Code review turnaround | All PRs reviewed within one business day | PR review metrics |

## Interfaces

- **Receives from CEO:** Business priorities, cross-functional coordination requests, timeline expectations, resource allocation decisions
- **Delivers to CEO:** Technical status updates, risk assessments, feasibility analyses, resource requests, escalations requiring business decisions
- **Receives from VP Product:** Feature requirements, PRDs, user stories, prioritised backlogs
- **Delivers to VP Product:** Technical feasibility assessments, architecture constraints, effort estimates, technical trade-off analyses
- **Receives from CMO/Head of BD:** Website change requests, technical questions from prospects/clients
- **Delivers to CMO/Head of BD:** Technical capability descriptions, website deployment support, client-facing technical documentation
- **Receives from VP Engineering:** Implementation proposals, technical blockers, sprint progress, code review escalations
- **Delivers to VP Engineering:** Architecture decisions, technical direction, quality standards, priority guidance

## Tools
- Code repositories (all NBI product codebases)
- GitHub (if set up) -- PR reviews, issue tracking, CI/CD pipelines
- Architecture documentation (maintained in project knowledge files)
- Vercel dashboard (Playsage deployment)
- Supabase dashboard (Playsage database)
- Framer (NBI website -- read access for understanding current state)

## What "Done" Looks Like
- Every NBI product has a documented, current architecture that any competent engineer could read and understand
- The locked Playsage tech stack is used correctly and consistently -- no rogue dependencies or pattern drift
- No security vulnerabilities in any production system -- API keys secured, authentication sound, data protected
- Engineering teams have clear technical direction and are not blocked by ambiguity
- Technical risks are identified and mitigated before they affect timelines or quality
- The CEO and VP Product trust the CTO's feasibility assessments and timeline estimates because they have a track record of accuracy
- Glen never discovers a technical problem that the CTO should have caught and surfaced earlier
