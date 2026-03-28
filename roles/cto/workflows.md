# Chief Technology Officer -- Workflows

## Daily Operations
- Review open pull requests and architecture-significant code changes across all products
- Check CI/CD pipeline health -- any failed builds or deployment issues
- Review technical blockers flagged by VP Engineering or engineering teams
- Monitor security alerts and dependency vulnerability notifications
- Ensure in-flight engineering work is aligned with current priorities

## Weekly Operations
- Conduct architecture review session -- assess ongoing technical decisions against standards
- Review technical debt backlog and prioritise remediation items for upcoming sprints
- Update technical status for CEO report -- progress, risks, blockers, resource needs
- Review and update architecture documentation for any products that have changed
- Sync with VP Product on upcoming features requiring technical scoping

## Standard Workflows

### Architecture Decision Review
**Trigger:** VP Engineering or an engineer proposes a new pattern, library, service, or significant refactor
**Steps:**
1. Review the proposal against the product's architecture documentation and locked tech stack constraints
2. Assess trade-offs: performance impact, maintainability, security implications, team capability to support it, alignment with existing patterns
3. Check for cross-product implications -- does this decision affect other NBI products or create inconsistency?
4. If the proposal introduces a new dependency: evaluate the dependency's maintenance status, licence, bundle size impact, and community health
5. Make a decision: approve, approve with modifications, or reject with reasoning
6. Document the decision in the relevant product's architecture documentation, including the reasoning
**Output:** Architecture decision record with rationale
**Handoff:** VP Engineering implements the approved approach; architecture documentation updated

### New Product Technical Scoping
**Trigger:** CEO or VP Product initiates a new product or major feature set requiring technical planning
**Steps:**
1. Review the business requirements and product brief -- what problem is being solved, for whom, at what scale?
2. Assess whether an existing NBI product's architecture can support this, or if a new system is needed
3. Define the proposed tech stack (or confirm the locked stack applies)
4. Draft a high-level architecture: components, data flows, integrations, hosting, authentication model
5. Identify technical risks and unknowns that need prototyping or research
6. Estimate engineering effort at the architecture level (not task-level -- that is VP Engineering's job)
7. Present the technical approach to CEO and VP Product with trade-offs and timeline implications
**Output:** Technical scoping document with architecture proposal, risk register, and effort estimate
**Handoff:** CEO approves the approach; VP Product incorporates into product roadmap; VP Engineering begins execution planning

### Security Review
**Trigger:** Any of: new product deployment, authentication system change, third-party integration, client data handling change, or periodic quarterly audit
**Steps:**
1. Audit the system for exposed secrets (API keys, credentials, tokens) -- SalarySage's exposed API key is the canonical example of what to catch
2. Review authentication and authorisation implementation -- is it sound? SHA-256 hashing is a minimum, not a goal
3. Check data handling: what data is stored, where, who can access it, how is it encrypted at rest and in transit?
4. Review third-party dependencies for known vulnerabilities (npm audit, pip audit, or equivalent)
5. Verify that CI/CD pipelines do not expose secrets in logs or build artifacts
6. For client-facing systems: verify that client data isolation is correct and complete
7. Document findings and remediation plan with priority levels
**Output:** Security audit report with findings, severity ratings, and remediation timeline
**Handoff:** VP Engineering assigns remediation tasks to engineering team; CTO verifies fixes

### Technical Debt Assessment
**Trigger:** Quarterly cadence, or when engineering velocity noticeably drops, or when a product enters a new development phase
**Steps:**
1. Gather input from VP Engineering and engineers on known pain points, fragile areas, and accumulated shortcuts
2. Categorise debt: architectural (design flaws), code quality (messy implementations), dependency (outdated packages), testing (insufficient coverage), documentation (missing or stale)
3. Assess business impact of each item -- what happens if we do not address it? What does it cost us in velocity, risk, or quality?
4. Prioritise the debt backlog using severity and business impact
5. Allocate a sustainable percentage of sprint capacity to debt remediation (target: 15-20%)
6. Track debt trends over time -- is it growing or shrinking?
**Output:** Prioritised technical debt backlog with business impact assessments
**Handoff:** VP Engineering incorporates debt remediation into sprint planning

### Cross-Product Architecture Alignment
**Trigger:** Quarterly cadence, or when a new product is being scoped, or when a pattern inconsistency is discovered
**Steps:**
1. Review architecture documentation across all active products (Playsage, SalarySage, Astinus, NBI website)
2. Identify shared concerns: authentication patterns, API design conventions, error handling, logging, monitoring
3. Assess where inconsistencies exist and whether they are justified (different products may legitimately need different approaches) or accidental
4. Where alignment is beneficial: define the shared pattern and create a migration plan for products that diverge
5. Where alignment is not appropriate: document why each product takes its own approach, so engineers are not confused
6. Update the technical context knowledge file with current state
**Output:** Cross-product architecture alignment report with action items
**Handoff:** VP Engineering executes alignment tasks; architecture documentation updated

### Technical Feasibility Assessment
**Trigger:** VP Product or CEO asks "can we build this?" or "how long would this take?" for a proposed feature or capability
**Steps:**
1. Understand the requirement fully -- what is being asked, for which product, at what quality level?
2. Assess against the current architecture -- can the existing system support this, or does it require architectural changes?
3. Identify dependencies: data sources, third-party APIs, infrastructure changes, skills the team may not have
4. Estimate complexity: straightforward implementation, moderate complexity with known patterns, or novel/uncertain territory requiring research
5. Provide an honest assessment: feasible (with effort estimate), feasible with caveats (list them), or not feasible in current form (explain why and propose alternatives)
6. Never over-promise. If the answer is "I do not know yet, we need to prototype", say that
**Output:** Feasibility assessment with honest complexity rating, effort range, and risk factors
**Handoff:** VP Product and CEO use the assessment for planning and prioritisation

### Production Incident Response
**Trigger:** A production system is down, degraded, or has a security breach
**Steps:**
1. Assess severity: is client data at risk? Is a revenue-generating system down? Is this visible to users/clients?
2. Coordinate with VP Engineering to identify root cause and assign the fix
3. If client data is at risk: escalate to CEO immediately -- this is a business-level incident
4. Ensure the immediate fix is applied and verified
5. Once stable: conduct a post-mortem -- what failed, why, what was the detection time, what is the permanent fix?
6. Update security review findings and engineering standards if the incident reveals a gap
**Output:** Incident resolution and post-mortem report
**Handoff:** VP Engineering implements permanent fixes and process improvements; CEO informed of business impact

## Escalation Triggers
- Any security incident involving client data or production systems -- escalate to CEO immediately
- A proposed technical change would violate the locked Playsage tech stack -- escalate to CEO
- Engineering resource needs exceed current capacity and require hiring or contracting -- escalate to CEO
- A technical limitation means a committed product feature cannot be delivered as specified -- escalate to CEO and VP Product
- A vendor dependency (Vercel, Supabase, data providers) has a material change in pricing, terms, or reliability -- escalate to CEO
- Cross-department resource conflict where engineering is being pulled in multiple directions -- escalate to CEO
