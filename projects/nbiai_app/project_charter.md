# NBIAI Team App -- Cross-Functional Project Charter

**Author:** CEO Agent
**Date:** 28 Mar 2026
**Version:** 1.0
**Status:** Active -- living document, updated as work progresses
**Project:** NBIAI Team App

---

## 1. Project Governance

### Sponsor
**Glen Pryer (Board Operator).** Final authority on all design decisions, external-facing features, spending, and strategic direction. All approval gates that touch the outside world route through Glen.

### Project Owner
**VP Product.** Owns the product definition. The feature specification (`deliverables/feature_spec.md`) is the single source of truth for what gets built. VP Product validates that every delivered feature matches the spec, reconciles contradictions flagged in the CEO review, and accepts or rejects deliverables on behalf of the product. VP Product also owns the PRD validation report and confirms the Definition of Done for the app.

### Technical Lead
**CTO.** Owns the technical architecture (`deliverables/technical_architecture.md`). All architectural decisions, database schema changes, API design questions, and technology choices route through CTO. CTO resolves technical contradictions between the feature spec and the architecture document, as directed in the CEO review. CTO also owns the relationship between this project's stack (Node.js + PostgreSQL + React on Railway) and NBI's broader technology strategy.

### Quality Gate
**QA Lead (Opus final pass).** No feature is marked done until QA Lead has reviewed it. QA Lead owns the test plan (`deliverables/test_plan.md`), triages all bugs raised by QA Engineer, and performs the final Opus-tier validation before anything reaches Glen. QA Lead has veto power on any feature release if Critical or High test cases are failing.

### Role-Specific Accountabilities on This Project

| Role | NBIAI App Accountability |
|---|---|
| CEO | Project orchestration. Reviewed and approved Deliverables 1-3. Resolves cross-functional disputes. Escalation point for all blockers. Owns this charter |
| COO | Operational oversight. Monitors sprint progress, delivery timelines, and cross-team coordination. Ensures Producer is tracking milestones |
| CFO | Cost modelling. Must deliver a cost model for the NBIAI App covering Claude API spend, Railway hosting costs, and ongoing operational costs. Budget caps must be set before agent execution goes live |
| CTO | Technical architecture owner. Schema, API design, agent execution layer, deployment architecture. Resolves all technical disputes between feature spec and architecture |
| VP Product | Product definition owner. Feature spec is the UI/UX and functional source of truth. Validates every delivered feature. Owns PRD validation report |
| VP Engineering | Sprint execution owner. Breaks phases into tasks, assigns to engineers, reviews code, manages the build pipeline. Reports daily during active sprints |
| CMO / Head of BD | Not directly contributing to the build. Awaiting the Leads & Clients module (Sprint 4) to validate BD pipeline requirements. Provides input on client-facing terminology if the app ever becomes client-facing |
| Head of People | Not directly contributing to the build. Available for agent role definition questions. Validates that the 18 roles in the seed data match the org chart |
| Senior Engineer | Primary implementer. Owns scaffold, schema, auth endpoints, and complex backend features (agent execution runner, real-time layer). Implements Phases 1-5 core backend work |
| Engineer | Secondary implementer. Owns seed script, auth middleware, rate limiting, encryption module. Implements CRUD APIs and frontend pages alongside Senior Engineer |
| DevOps | Infrastructure owner. Railway deployment, database provisioning, CI/CD pipeline, environment configuration, SSL, monitoring. Owns deployment readiness for every sprint |
| QA Lead | Test plan owner. Defines acceptance criteria, triages bugs, performs Opus final pass on all deliverables. Veto authority on feature completeness |
| QA Engineer | Test executor. Runs every test case in the test plan against the deployed application. Logs defects with reproduction steps. Validates fixes |
| UI/UX Lead | Design system owner. The design spec (`deliverables/design_spec.md`) is the visual source of truth. Reviews all frontend implementations for design compliance. Owns the competitive research on control-plane UIs |
| UI/UX Designer | Design implementer. Creates wireframes, mockups, and front-end styling. Implements Tailwind/shadcn component styling to match the design spec |
| Producer | Project tracking. Maintains the sprint board, tracks milestone completion, flags overdue items to COO. Prepares status reports |
| Data Analyst | Analytics requirements. Defines what metrics the app should track (agent performance, task throughput, budget utilisation). These requirements feed into the data model and dashboard widgets |
| Tech Writer | Documentation. Owns SETUP.md accuracy, API documentation, and any user-facing help text within the app |

---

## 2. Full Role Assignment Matrix

### Leadership and Governance Roles

| Agent | Workstream | Current Task | Depends On | Depended On By | Status |
|---|---|---|---|---|---|
| CEO | Project orchestration and sign-off | Producing this project charter. Monitoring Sprint 1 execution | VP Product, CTO, UI/UX Lead (Deliverables 1-3 -- received and approved) | All agents (direction and dispute resolution) | **Active** |
| COO | Operational monitoring | Overseeing sprint progress via Producer reports | Producer (status reports) | CEO (escalation of operational issues) | **Active** |
| CFO | Cost modelling | Must produce NBIAI App cost model: Claude API costs per agent tier, Railway hosting projections, monthly operational budget | CTO (architecture doc for infrastructure costs), VP Product (feature scope to estimate API call volume) | CEO (budget approval), VP Engineering (budget caps for agent execution layer) | **Not yet started** |
| VP Product | Product validation | PRD validation in progress. Must reconcile 7 contradictions identified in CEO review (agent status enum, currency, password hashing, accent colour, sidebar width, Quick Stats count, task project_id) | CEO review (received), CTO (technical resolution on shared items) | VP Engineering (cannot finalise feature implementation without reconciled spec), QA Lead (acceptance criteria depend on final spec) | **Active** |

### Engineering Roles

| Agent | Workstream | Current Task | Depends On | Depended On By | Status |
|---|---|---|---|---|---|
| CTO | Architecture and technical decisions | Monitoring Sprint 1. Must resolve agent status enum reconciliation with VP Product. Must confirm currency storage approach | VP Product (product-side resolution on shared contradictions) | VP Engineering (technical direction), Senior Engineer (architectural questions during implementation) | **Active** |
| VP Engineering | Sprint execution management | Managing Sprint 1: Tasks 1-7 assigned to engineers. Daily progress monitoring | CTO (architecture doc -- received), CEO (Sprint 1 authorisation -- received), Senior Engineer + Engineer + DevOps (task completion) | CEO (daily status reports), QA Lead (deliverables ready for testing) | **Active** |
| Senior Engineer | Core backend implementation | Sprint 1: Task 1 (scaffold), Task 2 (schema), Task 5 (auth endpoints). All three have specifications in the VP Engineering assignment | VP Engineering (task assignments -- received), CTO architecture doc (received) | Engineer (Task 3 seed depends on Task 2 schema), DevOps (Task 4 deployment depends on Task 1+2), QA Engineer (auth endpoints must exist before testing) | **Active** |
| Engineer | Supporting backend implementation | Sprint 1: Task 3 (seed script), Task 6 (auth middleware + rate limiting), Task 7 (API key encryption) | Senior Engineer (Task 2 schema must be complete before Task 3 seed; Task 5 auth endpoints must exist before Task 6 middleware) | QA Engineer (middleware and encryption must work before testing), Senior Engineer (seed data needed for auth testing) | **Active** |
| DevOps | Infrastructure and deployment | Sprint 1: Task 4 (Railway deployment + database provisioning). Configure build pipeline, environment variables, health check, SSL | Senior Engineer (Task 1 scaffold + Task 2 schema must exist to deploy), Engineer (Task 3 seed to run on Railway) | All agents (deployment is prerequisite for QA testing and live operation), QA Engineer (needs deployed environment to test) | **Active** |

### Quality Roles

| Agent | Workstream | Current Task | Depends On | Depended On By | Status |
|---|---|---|---|---|---|
| QA Lead | Test planning and final validation | Test plan v1.0 delivered (`deliverables/test_plan.md`). Awaiting Sprint 1 completion to begin Opus final pass on auth module | VP Engineering (Sprint 1 deliverables), VP Product (reconciled spec for acceptance criteria) | CEO (quality sign-off before Glen sees anything), QA Engineer (test plan and triage direction) | **Waiting** |
| QA Engineer | Test execution | Awaiting Sprint 1 deployment on Railway to begin executing AUTH test cases (AUTH-001 through AUTH-014 defined in test plan) | QA Lead (test plan -- received), DevOps (deployed environment), Senior Engineer + Engineer (auth implementation complete) | QA Lead (test results and bug reports for triage), VP Engineering (bug reports for assignment) | **Waiting** |

### Design Roles

| Agent | Workstream | Current Task | Depends On | Depended On By | Status |
|---|---|---|---|---|---|
| UI/UX Lead | Design system and competitive research | Design spec v1.0 delivered and approved. Competitive research on control-plane UIs in progress -- identifying high-priority design improvements from Paperclip, Linear, Vercel dashboard patterns | VP Product (feature priorities for design focus) | UI/UX Designer (design direction), Senior Engineer + Engineer (design spec for frontend implementation in Sprint 2+) | **Active** |
| UI/UX Designer | Frontend design implementation | Awaiting Sprint 2 (Command Centre + Org Chart frontend) to begin implementing component styling | UI/UX Lead (design spec -- received; competitive research findings pending) | Senior Engineer + Engineer (styled components for frontend pages) | **Not yet started** |

### Operations and Support Roles

| Agent | Workstream | Current Task | Depends On | Depended On By | Status |
|---|---|---|---|---|---|
| Producer | Sprint tracking | Tracking Sprint 1 milestones. Preparing status reports on task completion across the 7 Sprint 1 tasks | VP Engineering (task status updates), all engineers (progress reports) | COO (sprint health reports), CEO (milestone summaries) | **Active** |
| Data Analyst | Analytics requirements | Must define analytics metrics for the NBIAI App: agent performance tracking, task throughput, budget utilisation dashboards. Not yet started | VP Product (feature spec for metric context), CTO (data model for what is measurable) | VP Engineering (analytics requirements feed into Sprint 4 Finance/Dashboard APIs), Engineer (data queries) | **Not yet started** |
| CMO / Head of BD | BD pipeline input | Awaiting Sprint 4 (Leads & Clients module) to validate BD pipeline data model and workflow | VP Product (Leads & Clients spec -- Section 9 of feature spec), CTO (pipeline data model) | VP Product (pipeline validation feedback), Engineer (implementation feedback) | **Not yet started** |
| Head of People | Role validation | Available to validate that the 18 seed roles match the org chart and role definitions in `roles/` | VP Engineering (seed script for review) | Engineer (confirmation that role data is correct) | **Waiting** |
| Tech Writer | Documentation | Must review and update SETUP.md for accuracy as Sprint 1 completes. Will own API documentation in later sprints | DevOps (deployment docs), Senior Engineer (API implementation details) | Glen (accurate setup instructions), new contributors (onboarding docs) | **Not yet started** |

---

## 3. Cross-Functional Communication Protocol

### 3.1 Milestone Sync Requirements

Before any milestone is marked complete, the following agents must sync and confirm alignment:

| Milestone | Required Sync Participants | Gate Owner |
|---|---|---|
| Sprint completion | VP Engineering + QA Lead + VP Product | CEO |
| Feature marked "done" | VP Product + QA Lead | VP Product |
| Design implementation approved | UI/UX Lead + VP Product | UI/UX Lead |
| Deployment to production | DevOps + VP Engineering + QA Lead | VP Engineering |
| Cost model approved | CFO + CTO + CEO | CEO (routes to Glen for final approval) |
| Agent execution go-live | CTO + VP Engineering + QA Lead + CFO (budget caps set) | CTO |

### 3.2 Bug Flow

```
QA Engineer finds bug
    |
    v
QA Engineer logs bug with reproduction steps, severity, and affected test case ID
    |
    v
QA Lead triages: confirms severity (Critical / High / Medium / Low), assigns priority
    |
    v
QA Lead routes to VP Engineering with severity and priority
    |
    v
VP Engineering assigns to Senior Engineer or Engineer based on complexity and current workload
    |
    v
Engineer fixes the bug, writes regression test, marks fix complete
    |
    v
QA Engineer re-tests the fix against the original reproduction steps
    |
    v
If pass: QA Lead closes the bug and notifies VP Engineering
If fail: QA Lead returns to VP Engineering with failure details; loop repeats
```

**Severity definitions for this project:**
- **Critical:** App cannot start, data loss, security vulnerability, authentication bypass. Fix immediately; blocks all other work
- **Critical:** Added -- agent execution produces incorrect output or hallucinates due to context loading error
- **High:** Feature does not work as specified, user-facing error not handled, data displayed incorrectly. Fix within current sprint
- **Medium:** Feature works but with minor deviation from spec, cosmetic issue, non-blocking UX problem. Fix in next sprint
- **Low:** Enhancement, optimisation, or polish item. Backlogged

### 3.3 Design Change Flow

```
UI/UX Designer proposes a design change (new pattern, component modification, layout adjustment)
    |
    v
UI/UX Lead reviews against the design system and design spec
    - Approved: proceeds to VP Product for product validation
    - Rejected: returns to UI/UX Designer with rationale
    |
    v
VP Product validates against the feature spec and product goals
    - Approved: VP Product notifies VP Engineering to implement
    - Rejected: returns to UI/UX Lead with product rationale
    |
    v
VP Engineering assigns to the appropriate engineer
    |
    v
Engineer implements; UI/UX Lead reviews the implementation visually
    |
    v
QA Engineer tests the change against acceptance criteria
```

### 3.4 Analytics Requirements Flow

```
Data Analyst defines a metric (what to measure, how to calculate it, where to display it)
    |
    v
VP Product validates: is this metric useful? Does it belong in the app?
    - Approved: passes to CTO for technical feasibility
    - Rejected or deferred: logged in backlog with rationale
    |
    v
CTO reviews technical feasibility: can the data model support this? What queries are needed?
    - Feasible: passes to VP Engineering for implementation assignment
    - Not feasible in current architecture: CTO proposes alternative or defers
    |
    v
VP Engineering assigns to Senior Engineer or Engineer
    |
    v
Engineer implements the metric (database query, API endpoint, frontend widget)
    |
    v
QA Engineer verifies the metric produces correct values against test data
    |
    v
VP Product accepts the metric as implemented
```

### 3.5 Daily Communication During Active Sprints

- **VP Engineering** provides CEO with a daily status update: tasks completed, in progress, blockers, revised estimates
- **Producer** maintains the sprint board and flags any task overdue by more than one day to COO
- **COO** escalates systemic delays (more than 2 tasks behind schedule) to CEO
- **QA Lead** provides a bug summary at the end of each sprint: total found, severity breakdown, closure rate

---

## 4. Closed-Loop Corrective Action Process

### 4.1 Issue Identification

Any agent can raise an issue at any time. Issues are not limited to bugs -- they include specification contradictions, architectural concerns, process failures, resource gaps, and external blockers.

**How to raise:** State the issue clearly with:
- What is wrong
- Where it was discovered (document, code, test, deployment)
- What the impact is if not addressed
- A proposed severity classification

### 4.2 Classification

| Severity | Definition | Response Time | Owner Escalation |
|---|---|---|---|
| Critical | Blocks all work, data integrity risk, security hole, production outage | Immediate. All other work stops until resolved | CEO notified within 1 hour. Glen notified if external-facing |
| High | Blocks a workstream, specification contradiction that prevents implementation, test failure on a core feature | Same sprint. Prioritised above new feature work | VP Engineering or CTO owns resolution. CEO notified in daily report |
| Medium | Does not block current work but will block future work if not addressed. Cosmetic issues, minor spec gaps | Next sprint or current sprint if capacity allows | Relevant function lead owns. Reported to VP Engineering |
| Low | Enhancement, polish, optimisation. No blocking impact | Backlogged. Addressed when sprint capacity allows | Logged in backlog by Producer |

### 4.3 Ownership by Issue Type

| Issue Type | Primary Owner | Secondary Owner |
|---|---|---|
| Code bug | VP Engineering (assigns to engineer) | QA Lead (verifies fix) |
| Specification contradiction | VP Product + CTO (jointly resolve) | CEO (arbitrates if they disagree) |
| Design inconsistency | UI/UX Lead | VP Product (product implications) |
| Infrastructure failure | DevOps | CTO (architectural review) |
| Performance issue | CTO | VP Engineering (implementation fix) |
| Security vulnerability | CTO | VP Engineering (immediate patch) |
| Budget or cost concern | CFO | CEO (approval authority) |
| Missing role or capability | Head of People | CEO (hiring decision -- requires Glen approval) |
| Process failure | COO | CEO |

### 4.4 Verification

Every fix follows the same verification loop:

1. **Owner implements the fix** (code, spec update, process change, configuration)
2. **QA Engineer tests the fix** (for code bugs) or **the relevant function lead reviews** (for non-code issues)
3. **QA Lead confirms** the fix resolves the issue without introducing regressions (for code) or **CEO confirms** (for process/strategic issues)

### 4.5 Closure

An issue is closed only when:
- The fix has been verified by the designated verifier
- The original raiser has been notified that the fix is in place
- Any upstream or downstream agents affected by the issue have been notified of the resolution
- The issue is logged with: date raised, severity, owner, date resolved, resolution summary

The agent who marks the issue resolved is responsible for notifying all affected parties. Issues do not silently close.

---

## 5. Current Open Issues Requiring Cross-Agent Action

### Issue 1: Agent Status Enum Mismatch

| Field | Detail |
|---|---|
| Description | Feature spec defines agent status as `active`, `idle`, `blocked`, `paused`, `error`, `offline`. CTO schema defines `active`, `idle`, `running`, `paused`, `terminated`. Three statuses in the spec do not exist in the database; two in the database do not exist in the spec |
| Raised by | CEO (during Deliverables 1-3 review) |
| Owner | VP Product + CTO (must agree on resolution) |
| Dependency | Must be resolved before any agent-related API or UI work in Sprint 2+ |
| Status | **Open -- awaiting joint resolution** |

### Issue 2: Revenue Currency Inconsistency

| Field | Detail |
|---|---|
| Description | Feature spec uses GBP as primary (`amount_gbp`). CTO schema uses `amount_usd` with a `currency` varchar. CEO directed: GBP primary for revenue/payroll display, USD for agent costs, database stores native currency with code |
| Raised by | CEO (during Deliverables 1-3 review) |
| Owner | CTO (schema update) + VP Product (spec update) |
| Dependency | Must be resolved before Finance APIs are built (Sprint 4, Phase 7) |
| Status | **Open -- CEO direction given, awaiting implementation** |

### Issue 3: Quick Stats Card Count

| Field | Detail |
|---|---|
| Description | Feature spec shows 5 stat cards on Command Centre. Design spec shows 4. CEO leans towards 4 (design spec) but VP Product must confirm whether "Tasks Blocked" card was intentionally dropped |
| Raised by | CEO (during Deliverables 1-3 review) |
| Owner | VP Product + UI/UX Lead |
| Dependency | Must be resolved before Command Centre frontend (Sprint 2, Phase 8) |
| Status | **Open -- awaiting VP Product confirmation** |

### Issue 4: CFO Cost Model Not Yet Produced

| Field | Detail |
|---|---|
| Description | No cost model exists for the NBIAI App. Claude API costs per model tier (Opus, Sonnet, Haiku), Railway hosting costs, and monthly operational budget projections are undefined. Budget caps cannot be set on the agent execution layer without this |
| Raised by | CEO (this charter) |
| Owner | CFO |
| Dependency | Requires CTO architecture doc (received) for infrastructure cost inputs. Requires VP Product feature scope (received) for API call volume estimates. Must be complete before agent execution layer goes live (Sprint 5, Phase 4) |
| Status | **Not yet started** |

### Issue 5: Competitive Research In Progress

| Field | Detail |
|---|---|
| Description | UI/UX Lead is conducting competitive research on control-plane UIs (Paperclip, Linear, Vercel dashboard). Findings may result in High-priority design improvements that affect frontend implementation |
| Raised by | UI/UX Lead |
| Owner | UI/UX Lead |
| Dependency | Findings should be available before Sprint 2 frontend work begins. If findings arrive late, design improvements may need to be backlogged |
| Status | **In progress** |

### Issue 6: PRD Validation In Progress

| Field | Detail |
|---|---|
| Description | VP Product must reconcile 7 contradictions identified in the CEO review and produce a PRD validation report confirming the feature spec is internally consistent and aligned with both the CTO architecture and the design spec |
| Raised by | CEO (CEO review document) |
| Owner | VP Product |
| Dependency | Must coordinate with CTO on agent status enum and currency. Must coordinate with UI/UX Lead on Quick Stats count. VP Engineering needs the reconciled spec for Sprint 2+ implementation |
| Status | **In progress** |

### Issue 7: Missing Data Engineer Role

| Field | Detail |
|---|---|
| Description | The org chart has 18 roles but no Data Engineer. The NBIAI App will have analytics requirements (agent performance, task throughput, budget utilisation) and a PostgreSQL database requiring query optimisation, index management, and data pipeline work. The Data Analyst can define metrics but cannot implement data infrastructure. Currently the Senior Engineer or Engineer would absorb this work |
| Raised by | CEO (this charter) |
| Owner | Head of People (role assessment) + CEO (hiring decision) |
| Dependency | Must assess whether existing engineering capacity can absorb data engineering work or whether a new role is needed. Decision required before Sprint 4 (Finance APIs) where data queries become central |
| Status | **Not yet started -- assessment required** |

### Issue 8: Feature Spec Updates Pending

| Field | Detail |
|---|---|
| Description | The CEO review directed VP Product to update the feature spec in several places: password hashing (bcrypt to Argon2id), accent colour (#3B82F6 to #4F6EF7), sidebar width (256/64 to 240/60). These updates have not been confirmed as applied |
| Raised by | CEO (CEO review) |
| Owner | VP Product |
| Dependency | Must be done before engineers reference the feature spec for frontend implementation |
| Status | **Open -- updates pending** |

### Issue 9: SETUP.md Accuracy

| Field | Detail |
|---|---|
| Description | SETUP.md exists in the app directory but must be validated for accuracy after Sprint 1 completes. Environment variable names, database commands, and deployment steps must match the actual implementation |
| Raised by | CEO (this charter) |
| Owner | Tech Writer |
| Dependency | Sprint 1 must be complete (code finalised, deployment working). DevOps must confirm Railway deployment steps |
| Status | **Not yet started** |

### Issue 10: Test Plan Execution Blocked

| Field | Detail |
|---|---|
| Description | The test plan (v1.0, 14+ auth test cases defined) has been written but no test cases have been executed. QA Engineer is waiting for a deployed, testable environment |
| Raised by | QA Lead |
| Owner | QA Engineer (execution), DevOps (environment) |
| Dependency | Sprint 1 must be deployed on Railway with seed data loaded and auth endpoints functional |
| Status | **Waiting -- blocked on Sprint 1 deployment** |

---

## 6. Definition of Done -- NBIAI App v1

The NBIAI App v1 is complete when every item below is true. No exceptions, no "good enough." Each item has a designated verifier.

### 6.1 Feature Implementation

| Criterion | Verifier |
|---|---|
| Every feature in Sections 1-15 of the feature spec is implemented | VP Product |
| Every screen defined in the design spec is implemented and matches the design system | UI/UX Lead |
| All 11 development phases from the CTO architecture are complete with acceptance criteria met | VP Engineering |
| All 7 contradictions identified in the CEO review are resolved and documented | VP Product + CTO |

### 6.2 Quality

| Criterion | Verifier |
|---|---|
| QA test plan: all Critical test cases passing | QA Lead (Opus final pass) |
| QA test plan: all High test cases passing | QA Lead (Opus final pass) |
| QA test plan: all Medium test cases either passing or formally deferred with documented rationale | QA Lead |
| Zero open Critical or High bugs | QA Lead |
| QA Lead has performed Opus-tier final review on every user-facing screen | QA Lead |

### 6.3 PRD Validation

| Criterion | Verifier |
|---|---|
| PRD validation report produced by VP Product | VP Product |
| All 7 CEO review contradictions resolved with documented decisions | VP Product + CTO |
| Feature spec updated to reflect all binding decisions from CEO review | VP Product |
| PRD validation report status: Approved | CEO |

### 6.4 Financial

| Criterion | Verifier |
|---|---|
| CFO cost model produced: Claude API costs by tier, Railway hosting, monthly operational budget | CFO |
| Budget caps reviewed and set for each agent tier | CFO + CEO |
| Cost model reviewed by Glen and approved | Glen (via CEO) |

### 6.5 Analytics

| Criterion | Verifier |
|---|---|
| Analytics requirements defined by Data Analyst (agent performance, task throughput, budget utilisation) | Data Analyst |
| Requirements either implemented in v1 or formally backlogged with assigned owner and target sprint | VP Product |

### 6.6 Data Engineering Assessment

| Criterion | Verifier |
|---|---|
| Data Engineer role assessed: can existing engineering absorb the work, or is a new role needed? | Head of People + CEO |
| Decision documented with rationale | CEO |

### 6.7 Design

| Criterion | Verifier |
|---|---|
| Competitive research by UI/UX Lead completed | UI/UX Lead |
| High-priority design improvements from competitive research applied or formally backlogged | UI/UX Lead + VP Product |
| All screens pass UI/UX Lead visual review against the design spec | UI/UX Lead |

### 6.8 Deployment

| Criterion | Verifier |
|---|---|
| Application deployed on Railway with a real DATABASE_URL (not local) | DevOps |
| PostgreSQL database provisioned with private networking, automated backups enabled | DevOps |
| SSL configured, public URL accessible | DevOps |
| Health check endpoint returning 200 on production | DevOps |
| Build pipeline triggers on git push and deploys without manual intervention | DevOps |
| WebSocket reconnection logic tested against Railway container replacement | VP Engineering + QA Engineer |

### 6.9 Documentation

| Criterion | Verifier |
|---|---|
| SETUP.md accurate and complete: all prerequisites, environment variables, local dev steps, and deployment steps match the actual implementation | Tech Writer |
| API documentation covers all 47+ endpoints with request/response examples | Tech Writer |
| All project deliverables (feature spec, architecture, design spec, CEO review, test plan) archived and version-tagged | Producer |

### 6.10 Glen Acceptance

| Criterion | Verifier |
|---|---|
| Glen can log in and see the Command Centre in under 3 seconds | Glen |
| Glen can see all 18 agents, their real-time status, and current tasks | Glen |
| Glen can drill into any agent and see their full history and performance | Glen |
| Glen can create a task, assign it to an agent, and watch it move through states | Glen |
| Glen can receive an approval request, review content, and approve or reject | Glen |
| Glen can see NBI's revenue, payroll, cash flow, and pipeline on one screen | Glen |
| Glen can manage the BD pipeline from lead identification through to close | Glen |
| Glen can add or remove users, set agent budgets, and manage API keys | Glen |
| Glen can do all of the above without opening a single markdown file | Glen |

---

## Appendix: Sprint-to-Phase Mapping

| Sprint | Phases | Scope | Key Agents |
|---|---|---|---|
| Sprint 1 | Phases 1-2 | Database + auth + core foundation | Senior Engineer, Engineer, DevOps |
| Sprint 2 | Phases 3, 8 | Core CRUD APIs + Command Centre + Org Chart frontend | Senior Engineer, Engineer, UI/UX Designer |
| Sprint 3 | Phases 4, 9 | Agent execution runner + Projects/Tasks/Approvals frontend | Senior Engineer, Engineer |
| Sprint 4 | Phases 5, 6, 7, 10 | Real-time layer + Approvals workflow + Finance/Pipeline APIs + remaining frontend | Senior Engineer, Engineer, Data Analyst, CFO |
| Sprint 5 | Phase 4 (continued) | Agent execution layer: heartbeat system, agents actually run | Senior Engineer, CTO, QA Lead |
| Sprint 6 | Phase 11 | Integration testing, polish, Railway production deployment, documentation | All agents |

---

## Document History

| Date | Version | Change | Author |
|---|---|---|---|
| 28 Mar 2026 | 1.0 | Initial charter produced | CEO Agent |

---

*This is a living document. It is updated as work progresses, issues are resolved, and new issues are identified. All agents are expected to reference this charter for their assignment, dependencies, and communication obligations on the NBIAI App project.*
