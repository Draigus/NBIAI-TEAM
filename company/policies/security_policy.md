# Security and Data Handling Policy

**Owner:** CTO
**Approved by:** Glen Pryer, Managing Director
**Effective:** 28 March 2026
**Review cadence:** Quarterly or after any security incident

---

## Purpose

This policy defines how NBI Analytics and NBI Gaming handle data classification, access control, secret management, client data, GDPR obligations, and security incidents. Every agent and human in the organisation must follow this policy. Ignorance is not a defence -- if you handle data, you follow these rules.

---

## 1. Data Classification

All data handled by NBI falls into one of four classification levels:

### Public
- Published marketing materials, public website content, open-source code
- No access restrictions
- Can be shared externally without approval

### Internal
- Internal documentation, org charts, process definitions, non-sensitive project plans
- Accessible to all NBI agents and staff
- Must not be shared externally without COO approval
- Examples: sprint logs, architecture diagrams, internal meeting notes

### Confidential
- Client data, commercial terms, pricing models, financial projections, API keys, credentials
- Accessible only to agents and staff with a documented need-to-know
- Must not be stored in plain text in code repositories, chat logs, or shared documents
- Requires encryption at rest and in transit
- Examples: client studio data (via Playsage), NBI financial models, SalarySage API credentials

### Restricted
- Personal data subject to GDPR, authentication secrets, production database credentials, Glen's personal financial data
- Accessible only to specifically named individuals or agents approved by Glen
- Must be stored in dedicated secret management systems, never in code or configuration files
- Access is logged and auditable
- Examples: employee personal data, production API master keys, GDPR subject data

---

## 2. Access Control Standards

### Principle of Least Privilege
Every agent and user receives the minimum access required to perform their role. Access is granted per-role, not per-person, and reviewed at each sprint cycle.

### Role-Based Access (RBAC)
The NBIAI App implements RBAC with the following tiers:
- **admin** -- Glen and designated leadership. Full access.
- **board** -- C-suite agents. Can create/assign tasks, view all projects, manage agents.
- **manager** -- VP-level agents. Can manage their reports' tasks and view departmental data.
- **agent** -- IC agents. Can view and update their own assigned tasks only.
- **viewer** -- Read-only access for reporting and observation.

### Access Reviews
- The Head of People reviews access assignments quarterly
- Any agent whose role changes has their access reviewed within 24 hours
- Dormant agents (no activity for 30 days) have their access suspended pending review

### Authentication
- All API access requires valid JWT tokens with company-scoped claims
- Tokens expire after the configured TTL (currently 24 hours)
- No shared credentials -- every agent and user has their own identity

---

## 3. Secret Management

### The SalarySage Incident -- Canonical Failure

During early development of the SalarySage project, an API key was committed directly to a source file and pushed to the repository. This is the canonical example of what not to do. The key had to be rotated, the commit history cleaned, and the incident documented. Every agent must understand: **secrets never go in code, configuration files, or chat logs.**

### Rules for Secret Handling

1. **Environment variables only** -- all secrets (API keys, database credentials, third-party tokens) are loaded from environment variables at runtime. Never hardcoded.

2. **No secrets in repositories** -- not in code, not in comments, not in configuration files, not in README files, not in `.env` files that are committed. The `.gitignore` must exclude all `.env` files.

3. **No secrets in logs** -- application logging must sanitise output to ensure secrets are never written to log files or console output.

4. **No secrets in task descriptions or comments** -- agents must never include credentials in NBIAI App task fields.

5. **Rotation policy** -- all API keys and credentials are rotated every 90 days, or immediately upon suspected compromise.

6. **Secret storage** -- production secrets are stored in the deployment environment's secret management system (e.g., platform-specific secret store, encrypted vault). Development secrets use local `.env` files that are gitignored.

---

## 4. Client Data Handling

### Playsage and Studio Client Data

Playsage is NBI's analytics platform serving gaming studio clients. It handles studio operational data including player metrics, revenue data, and operational KPIs. This data is classified as **Confidential** at minimum, and **Restricted** if it contains personally identifiable information.

**Rules for Playsage client data:**

1. **Tenant isolation** -- each studio client's data must be logically isolated. No cross-tenant data leakage is acceptable under any circumstances.

2. **Data processing agreements** -- NBI must have a signed DPA with each studio client before processing their data. The CFO and Glen approve all DPAs.

3. **Data retention** -- client data is retained only for the period specified in the service agreement. When a client leaves, their data is deleted within 30 days unless legal obligations require otherwise.

4. **Data export** -- clients can request a full export of their data at any time. This must be fulfilled within 5 working days.

5. **No client data in development environments** -- development and testing use synthetic data only. Production client data must never be copied to development, staging, or local environments.

6. **Access logging** -- all access to client data is logged with the accessing agent/user identity, timestamp, and action performed.

---

## 5. GDPR Obligations

NBI Analytics Ltd is a UK-registered company and processes personal data subject to UK GDPR. The following obligations apply:

### Lawful Basis for Processing
- **Employee/contractor data** -- legitimate interest and contractual necessity
- **Client contact data** -- contractual necessity and legitimate interest
- **Studio player data (via Playsage)** -- processed on behalf of clients under a DPA; clients are the data controllers

### Data Subject Rights
NBI must be able to respond to the following requests within 30 days:
1. **Right of access** -- provide a copy of all personal data held about the subject
2. **Right to rectification** -- correct inaccurate personal data
3. **Right to erasure** -- delete personal data where no lawful basis for retention exists
4. **Right to data portability** -- provide data in a machine-readable format
5. **Right to object** -- stop processing where the basis is legitimate interest

### Data Protection Impact Assessments (DPIAs)
A DPIA is required before:
- Launching any new product that processes personal data at scale
- Changing how existing personal data is processed
- Engaging a new third-party processor

The CTO initiates DPIAs. Glen approves the outcome.

### Records of Processing
NBI maintains a register of all processing activities, including:
- Categories of data processed
- Purpose of processing
- Lawful basis
- Retention periods
- Third-party processors involved

---

## 6. Incident Classification

Security incidents are classified by severity:

### Critical (P1)
- Confirmed data breach involving Restricted or Confidential data
- Unauthorised access to production systems
- Client data exposure
- Complete service outage caused by security event

**Response time:** Immediate. CTO and Glen notified within 1 hour. All hands on deck.

### High (P2)
- Suspected data breach under investigation
- Credential compromise (API key, database password)
- Vulnerability discovered in production that could be exploited
- Partial service degradation from security event

**Response time:** Within 4 hours. CTO notified immediately. Investigation begins same day.

### Medium (P3)
- Failed intrusion attempt detected
- Vulnerability discovered in non-production environment
- Policy violation by an agent (e.g., secret in a commit, data in wrong classification tier)
- Access control misconfiguration discovered before exploitation

**Response time:** Within 24 hours. CTO notified. Remediation within the current sprint.

### Low (P4)
- Phishing attempt received but not acted upon
- Minor policy deviation caught in code review
- Security tooling alert that turns out to be a false positive

**Response time:** Within 1 week. Logged for tracking. Addressed in next sprint if action needed.

---

## 7. Breach Notification Procedures

If a breach involving personal data is confirmed:

### Internal Notification (within 1 hour of confirmation)
1. CTO notifies Glen immediately with: what happened, what data is affected, scope of impact, containment status
2. Glen decides whether to engage legal counsel
3. COO coordinates the response team

### Regulatory Notification (within 72 hours)
Under UK GDPR, the ICO must be notified within 72 hours of becoming aware of a personal data breach, unless the breach is unlikely to result in a risk to individuals' rights and freedoms.

**Notification must include:**
- Nature of the breach
- Categories and approximate number of individuals affected
- Categories and approximate number of records affected
- Likely consequences
- Measures taken or proposed to address the breach

**Glen approves all regulatory notifications before submission.**

### Client Notification
If the breach involves client data (e.g., Playsage studio data):
1. The affected client is notified within 24 hours of confirmation
2. Notification includes: what happened, what data was affected, what NBI is doing about it
3. Glen or the COO handles client communication directly -- no agent sends this without approval

### Affected Individual Notification
If the breach is likely to result in a high risk to individuals' rights and freedoms, those individuals must be notified without undue delay.

**Glen approves all individual notifications.**

---

## 8. Secure Development Practices

### Code Review
- All code changes are reviewed before merging
- Reviewers must check for: hardcoded secrets, SQL injection, XSS, insecure dependencies, excessive logging of sensitive data
- The QA Lead includes security checks in the test plan

### Dependency Management
- Dependencies are audited for known vulnerabilities before adoption
- `npm audit` (or equivalent) runs as part of the CI pipeline
- Critical vulnerabilities in dependencies are patched within 48 hours

### Input Validation
- All user and API input is validated and sanitised
- The Zod schemas in the NBIAI App enforce strict input validation at the route level

---

## 9. Policy Violations

Violations of this policy are treated as follows:

- **First violation (Low/Medium severity):** Documented warning, mandatory review of this policy, and corrective action assigned as a task
- **Repeated violations or High severity:** Performance management process initiated per `company/policies/agent_performance_management.md`
- **Critical violation:** Immediate suspension of the agent's access pending investigation. Glen decides on reinstatement or termination.

---

## References

- `company/policies/approval_gates.md` -- approval requirements for external communications and client-facing actions
- `company/policies/agent_performance_management.md` -- performance management for policy violations
- `company/policies/cost_tracking_procedure.md` -- financial data handling
- `pipelines/sdlc/sdlc_pipeline.md` -- secure development lifecycle
- UK GDPR (retained EU law, UK Data Protection Act 2018)
