# DevOps Engineer — Responsibilities

## Job Description

The DevOps Engineer owns NBI's infrastructure, deployment pipelines, environment management, and operational security. This is a critical role given NBI's actual security history: a real incident occurred where an LLM API key was embedded in client-side HTML code in SalarySage, visible to anyone who viewed source. The DevOps Engineer exists partly to ensure that situation cannot recur in any NBI product.

NBI's infrastructure is relatively lean but spans multiple surfaces. Playsage runs on Vercel with a Supabase backend. SalarySage is a standalone HTML application that needs a proper server-side hosting solution before it can be distributed to clients. The NBI website runs on Framer. The DevOps Engineer manages all of this: deployment pipelines, environment variables, secrets, monitoring, and the processes that keep production healthy and recoverable.

This role works under the VP Engineering and is the operational partner to the Senior Engineer and Engineer on all infrastructure questions.

## Core Responsibilities

1. Manage Vercel deployments for Playsage: project configuration, environment variables, domain settings, and deployment pipeline health
2. Own secrets management across all environments: ensure no secrets are in code, all keys are in environment variables, production variables are correctly scoped in Vercel
3. Maintain Supabase project configuration: connection pooling, backups, access controls, service role key security
4. Establish and maintain CI/CD pipelines: automated checks on pull requests, build verification, deployment gates
5. Manage environment parity: dev, preview (Vercel PR deployments), and production environments should be consistent and well-documented
6. Investigate and resolve the SalarySage hosting problem: the current standalone HTML model is not suitable for client distribution; a server-side solution is needed to proxy the API key and log access properly
7. Monitor production systems: Vercel deployment health, Supabase database metrics, error rates
8. Manage the NBI website on Framer: deployments, domain, and any technical configuration
9. Document all infrastructure configurations so the VP Eng and Senior Engineer can understand what is running without asking
10. Respond to production incidents: diagnose, escalate appropriately, restore service, document root cause

## Key Performance Indicators

| KPI | Target | Measurement |
|---|---|---|
| Secrets exposure incidents | Zero | Security audit, incident log |
| Production deployment success rate | >95% of deployments succeed without rollback | Vercel deployment history |
| Environment variable documentation | All production vars documented and scoped correctly | VP Eng review |
| Incident response time | Acknowledged within 15 minutes during working hours | Incident log |
| SalarySage hosting solution | Server-side API proxy in place before any external distribution | VP Eng acceptance |
| Supabase backup verification | Backups confirmed working on a regular cadence | Backup log |

## Interfaces

- **Receives from:** VP Engineering (infrastructure tasks, deployment approvals, security directives); Senior Engineer (requests to configure environments for new features, escalation of security concerns)
- **Delivers to:** VP Engineering (infrastructure status, incident reports, security assessments, environment documentation); Senior Engineer and Engineer (working environments, confirmed deployment pipeline, environment variable guidance)
- **Tools:** Vercel (Playsage hosting), Supabase (database and auth management), Framer (NBI website), Git, environment variable management, CI/CD tooling

## What "Done" Looks Like

- The deployment pipeline runs cleanly: PRs get preview deployments, merges to main get production deployments, failures are visible immediately
- All secrets are in environment variables, scoped per environment in Vercel, and not present anywhere in the codebase
- The VP Eng can read a one-page environment document and understand exactly what is running and where
- SalarySage has a server-side API proxy before any external distribution
- Production monitoring is in place and the team would know within minutes if something went wrong
- Incidents are documented: what happened, why, what was fixed, what prevents recurrence
