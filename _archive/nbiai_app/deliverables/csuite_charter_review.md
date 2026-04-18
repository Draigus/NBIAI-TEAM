# C-Suite Charter Review -- NBIAI Team App

**Document type:** Formal leadership review of the Project Charter v1.0
**Review date:** 28 March 2026
**Charter under review:** `projects/nbiai_app/project_charter.md` (v1.0, authored by CEO Agent)
**Supporting documents reviewed:**
- CFO Cost Model v1.0
- PRD Validation Report v1.0
- Test Plan v1.0
- Bug Report (24 defects)
- People Assessment (Data Roles)
- Org Chart

---

## 1. CEO Review -- Programme Assessment

### Overall Assessment

The charter is a strong governance document. It does what a charter should do: it names every role, assigns every accountability, defines every communication pathway, and creates a closed-loop corrective action process that is unambiguous about who owns what. The Definition of Done is thorough and, critically, verifiable -- every criterion has a named verifier. That is rare in a project charter and it is exactly right.

However, the charter was written at the same point in time as the first sprint delivery, and the evidence from the PRD validation report and the bug report reveals that the programme is carrying more risk into Sprint 2 than the charter's optimistic tone suggests.

**The facts:**
- Implementation fidelity stands at approximately 65%. That means more than a third of the feature spec has not been built to standard.
- There are 2 Critical and 8 High severity bugs. Two of the Criticals are security vulnerabilities (token storage in localStorage). Several Highs would render core workflows non-functional in production (approval decisions 404, logout broken, token refresh broken).
- 10 open issues are tracked in the charter. None are resolved. Issue 4 (CFO cost model) has been delivered since the charter was drafted. The remaining 9 are still open.
- The agent status enum -- the single most cross-cutting data model decision in the app -- remains unresolved.
- The Data Engineer role gap has been confirmed by the Head of People assessment but no decision has been made.

### Governance Structure Assessment

The governance structure is correct. The four-gate model (VP Product for product, CTO for architecture, QA Lead for quality, CEO for programme) creates proper separation of concerns without creating bureaucratic gridlock. The milestone sync requirements in Section 3.1 ensure no gate is bypassed.

One concern: the charter assigns the CEO as gate owner for sprint completion, cost model approval, and agent execution go-live. That is three of six milestone gates. This is acceptable for a project of this size with a flat leadership structure, but if the NBIAI app scales to multiple concurrent projects, the CEO becomes a bottleneck. For now, this is fine.

### People Assessment

The right people are in the right roles for this project, with one critical exception: the Data Engineer gap. The Head of People's assessment is thorough and convincing. The Data Analyst is correctly scoped to the BI and reporting layer. The infrastructure layer -- schema ownership, event instrumentation, execution metrics pipeline, budget enforcement, real-time broadcast -- has no owner. The Senior Engineer and Engineer could absorb individual tasks, but that fragments ownership and displaces product work.

**CEO recommendation:** Create the Data Engineer role. Assign to VP Engineering's reporting line. Sonnet tier. This is not a speculative hire; it is a gap that will block Sprint 4 (Finance APIs) and Sprint 5 (Agent Execution Layer) if unfilled. Decision requires Glen's approval as it changes headcount.

### Top Concern Going Into Sprint 2

The security bugs. BUG-001 and BUG-002 (access and refresh tokens stored in localStorage) are not Sprint 2 issues -- they are Sprint 1 remediation issues. If these are carried forward as "we will fix them later," they will compound. Every frontend feature built on top of the broken token handling will need to be reworked when the fix lands. These must be resolved before Sprint 2 begins, not during it.

Secondary concern: the 65% implementation fidelity figure. Sprint 2 is scoped as "Core CRUD APIs + Command Centre + Org Chart frontend" -- but the PRD validation shows these areas already have significant gaps (no Active Projects widget, no List View, incomplete Hire Agent dialog). Sprint 2 will be building on top of Sprint 1 gaps unless the must-fix items from the PRD validation are addressed first.

### CEO Sign-Off

**Approved with conditions.**

Conditions:
1. BUG-001 and BUG-002 must be fixed before Sprint 2 commences.
2. The agent status enum must be resolved jointly by VP Product and CTO, with a binding decision document, before any Sprint 2 agent-related work begins.
3. The Data Engineer role decision must be escalated to Glen within the first week of Sprint 2.
4. The 5 must-fix items from the PRD validation report (G-17, G-18, G-04, G-13/G-14, G-19) must be included in the Sprint 2 scope, not deferred.

---

## 2. COO Review -- Operational Assessment

### Operational Cadence

The charter defines a sensible operational cadence: daily status updates from VP Engineering, Producer tracking with same-day escalation on overdue items, COO escalating systemic delays (2+ tasks behind) to CEO, QA Lead providing end-of-sprint bug summaries.

However, the cadence assumes a steady-state sprint rhythm. Sprint 1 has produced a charter, a cost model, a PRD validation report, a test plan, a bug report, and a people assessment -- all in the same delivery window. That is a lot of governance output. The question is whether Sprint 2 can shift the balance toward execution while maintaining governance discipline. If the leadership team spends Sprint 2 producing more documents and fewer resolved bugs, the operational cadence is not working.

**Assessment: The cadence is realistic but untested.** It looks right on paper. It will be validated in Sprint 2.

### Agent Workload Balance

The role assignment matrix reveals imbalanced workloads:

**Overloaded:**
- **VP Product.** Currently owns: PRD validation, 7 contradiction reconciliations (3 jointly with CTO, 1 with UI/UX Lead), feature spec updates (P-01 through P-11), and ongoing product validation for Sprint 2. VP Product is the bottleneck for Sprint 2 commencement -- engineering cannot build to a reconciled spec until VP Product delivers it.
- **Senior Engineer.** Assigned Sprint 1 Tasks 1, 2, and 5 (scaffold, schema, auth endpoints). In Sprint 2, carries forward the 5 must-fix items from the PRD validation plus new Phase 3/8 work. This agent will have the highest continuous workload across both sprints.

**Underutilised:**
- **CMO / Head of BD.** Not contributing until Sprint 4. Four sprints of idle capacity.
- **Head of People.** Assessment delivered. Now waiting. Available but unassigned.
- **Data Analyst.** Not yet started on analytics requirements. Blocked until data infrastructure exists (which itself is blocked on the Data Engineer decision).
- **Tech Writer.** Waiting for Sprint 1 to stabilise before documentation review.

**Recommendation:** Reassign underutilised agents to Sprint 2 support tasks. The Head of People should begin the Data Engineer role definition (draft complete -- needs CEO/Glen approval and activation assessment). The Tech Writer should begin API documentation against the existing route implementations rather than waiting for full stabilisation. The CMO / Head of BD should review Section 9 (Leads & Clients) gaps and provide feedback on the data model to VP Product, rather than waiting passively for Sprint 4.

### Communication Protocol

The protocol is workable. The bug flow (Section 3.2) is clear: QA Engineer logs, QA Lead triages, VP Engineering assigns, engineer fixes, QA re-tests, QA Lead closes. No gaps.

The design change flow (Section 3.3) and analytics requirements flow (Section 3.4) have not been tested because no design changes or analytics requirements have been processed yet. They look correct structurally but cannot be confirmed operationally.

**One gap in the protocol:** There is no defined communication pathway for cross-cutting specification contradictions. The charter tracks them as "open issues" but does not define a resolution deadline or escalation trigger. Issue 1 (agent status enum) has been open since the CEO review with no resolution date. A contradiction that blocks engineering should have a resolution SLA -- I would recommend 3 working days for High severity contradictions and 1 working day for Critical.

### Definition of Done -- Operational Achievability

The Definition of Done (Section 6) is comprehensive -- 10 subsections, each with named verifiers. It is also, frankly, ambitious for a v1.

Two concerns:

1. **Section 6.9 (Documentation):** "API documentation covers all 47+ endpoints with request/response examples." This is a significant body of work that the Tech Writer has not started. If documentation is genuinely a blocker for v1 completion, it must be scheduled, not assumed.

2. **Section 6.10 (Glen Acceptance):** "Glen can do all of the above without opening a single markdown file." This is the correct north star, but it encompasses every feature in the app working end-to-end. At 65% implementation fidelity, this is not close.

**Assessment: The Definition of Done is operationally achievable but not within the current sprint cadence without prioritisation.** The team cannot fix 24 bugs, close 48 PRD gaps, build Sprint 2-6 scope, and produce full API documentation simultaneously. The DoD must be staged: what is required for internal demo (Sprint 3), what is required for Glen acceptance testing (Sprint 5), and what is required for production (Sprint 6).

### Operational Risk Not In The Charter

**Scope creep through the corrective action process.** The charter's closed-loop process (Section 4) means every bug, contradiction, and gap generates work. The PRD validation alone has produced 48 gaps and 11 PRD corrections. The bug report adds 24 defects. That is 83 items of remediation work on top of the forward-looking Sprint 2-6 scope. If these are not triaged, prioritised, and some formally deferred, the sprint cadence will collapse under the weight of accumulated corrective actions.

### COO Sign-Off

**Approved with conditions.**

Conditions:
1. VP Product workload must be addressed. Either extend the reconciliation deadline or assign a support resource. VP Product is a single point of failure for Sprint 2 readiness.
2. Underutilised agents (CMO, Head of People, Tech Writer, Data Analyst) must be given Sprint 2 assignments, even if supporting or preparatory.
3. A contradiction resolution SLA must be added to Section 3 of the charter: 3 working days for High, 1 working day for Critical.
4. The 83 remediation items (48 PRD gaps + 11 PRD corrections + 24 bugs) must be triaged into Sprint 2 must-do, Sprint 3 should-do, and backlog. The Producer should own this triage board.

---

## 3. CFO Review -- Financial Assessment

### Budget Caps in the Charter

The charter (Section 6.4) correctly identifies that the CFO cost model must be produced and that budget caps must be set before agent execution goes live. The cost model has now been delivered (v1.0, submitted to CEO for review).

The cost model recommends:
- $75/month per Opus agent (8 agents = $600)
- $25/month per Sonnet agent (10 agents = $250)
- $20 Haiku reserve
- 15% contingency ($130.50)
- **Total recommended monthly budget: $1,000 (4.75% of monthly revenue)**

The charter references the cost model in four places (Issue 4, Section 6.4, the role assignment matrix, and the agent execution go-live gate). All four are consistent. The charter correctly states that budget caps must be set before the agent execution layer goes live (Sprint 5, Phase 4).

**Assessment: The budget caps from the cost model are reflected in the charter's governance requirements.** The charter does not contradict the cost model. However, the charter does not yet include the specific dollar figures -- it references the cost model as a dependency. Once Glen approves the $1,000/month budget, the charter should be updated to include the approved figures directly.

### Financial Risk Management

The cost model identifies four financial risks:
1. Runaway token spend (agent loops) -- HIGH severity, MEDIUM likelihood
2. Budget exhaustion mid-project -- HIGH severity, LOW likelihood
3. Anthropic API dependency (outage, price increase, model deprecation) -- HIGH severity, variable likelihood
4. Cost opacity -- MEDIUM severity, HIGH likelihood without controls

The charter's Section 4 (corrective action process) covers budget and cost concerns (assigned to CFO as primary owner, CEO as secondary). The charter's Issue 4 explicitly tracks the cost model as an open item.

**Gap:** The charter does not include the circuit breaker and iteration cap requirements from the cost model. Section 2.4.1 of the cost model recommends a hard 5-round iteration cap on agent-to-agent exchanges and a per-run cost flag at 100,000 input tokens. These are operational controls that belong in the charter's agent execution go-live gate (Section 3.1), not just in the cost model.

**Recommendation:** Add the following to the agent execution go-live milestone in Section 3.1:
- Per-execution cost logging implemented and verified
- Agent-to-agent iteration cap (5 rounds) implemented
- Per-agent budget cap enforcement (hard stop at 100%) implemented
- Circuit breaker (3x daily average spend rate) implemented

### Build vs Buy Decision

The cost model's build-vs-buy analysis is sound. The app's build cost of approximately $330 in API tokens versus $6,600-13,300/year for SaaS alternatives makes the build decision financially unassailable. The app is being built by the AI agents it will manage -- the recursive economics are uniquely favourable.

One caveat: the $330 build cost is based on single-turn, short-context runs. The actual build cost will be higher because the specification, architecture, review, and testing work involves complex multi-turn conversations. A more realistic estimate is $500-1,000 for the full build. This is still trivially small compared to alternatives.

**Assessment: The build decision was correct and the financial case is strong.**

### Financial Conditions Before Production Deployment

The following financial conditions must be met before the NBIAI app goes into production:

1. **Glen must approve the $1,000/month AI budget.** This is a real recurring expense against NBI revenue.
2. **Per-execution cost tracking must be implemented and verified.** Without it, cost opacity (Risk 4) is unmitigated.
3. **Budget enforcement must be live and tested.** The 80% alert and 100% hard stop must function correctly before agents run autonomously.
4. **The first month of live operation must be treated as a calibration period.** Daily spend reviews, weekly CFO reports, no reliance on the baseline projections until real usage data validates them.
5. **Monthly reconciliation process must be established.** CFO reconciles tracked spend against Anthropic's actual invoice. Any discrepancy is investigated.

### CFO Sign-Off

**Approved with conditions.**

Conditions:
1. The $1,000/month budget must be approved by Glen before agent execution goes live. This is an escalation, not a CFO decision.
2. The charter's agent execution go-live gate must be updated to include the four cost model operational controls (cost logging, iteration cap, budget enforcement, circuit breaker).
3. The charter should include the approved budget figures directly once Glen signs off, not just reference the cost model as an external document.

---

## 4. CTO Review -- Technical Assessment

### Technical Architecture Soundness

The charter promises a Node.js + PostgreSQL + React application deployed on Railway. The technical architecture document (delivered and approved) specifies: Fastify for the API layer, Drizzle ORM for database access, Argon2id for password hashing, JWT + refresh token rotation for auth, PostgreSQL LISTEN/NOTIFY for real-time updates, and WebSocket for frontend push.

This stack is sound for what the charter promises. It is a conventional, well-understood architecture with no exotic dependencies. The choice of Railway for hosting is pragmatic -- managed PostgreSQL, automatic deployments, simple environment configuration.

However, the bug report raises concerns about the implementation quality against this architecture:

- **BUG-001 and BUG-002 (Critical):** Access and refresh tokens in localStorage violates the architecture's security model. The architecture specifies memory storage for access tokens and httpOnly cookies for refresh tokens. This is not a missing feature; it is a security vulnerability in the delivered code.
- **BUG-015 and BUG-020 (High/Medium):** API path prefix mismatch between client and server. If the server mounts at `/api/v1/` and the client calls `/api/`, the entire frontend is non-functional. This is a wiring issue that should have been caught in basic integration testing.
- **BUG-021 (High):** Token refresh reads from `json.data` but the server returns a flat object. This means silent auth failure after 15 minutes. Every user session effectively has a 15-minute maximum.
- **BUG-009 (High):** Approval decisions 404 because the client POSTs to `/api/approvals/:id/decide` but the server exposes `PATCH /api/approvals/:id`. The core governance workflow -- the reason this app exists for Glen -- does not function.

**Assessment: The architecture is sound. The implementation has critical gaps that must be addressed before the architecture's security and correctness guarantees can be claimed.**

### Engineering Phase Sequencing

The sprint-to-phase mapping in the charter appendix is correctly sequenced:

- Sprint 1 (Phases 1-2): Foundation. Database, auth, core scaffold. Correct.
- Sprint 2 (Phases 3, 8): CRUD APIs + frontend. Builds on the foundation. Correct.
- Sprint 3 (Phases 4, 9): Agent execution + more frontend. Correct dependency chain.
- Sprint 4 (Phases 5, 6, 7, 10): Real-time layer, approvals, finance, pipeline. This is the heaviest sprint. Four phases in one sprint is aggressive.
- Sprint 5 (Phase 4 continued): Agent execution hardening. Correct.
- Sprint 6 (Phase 11): Integration testing, polish, production deployment. Correct.

**Concern: Sprint 4 is overloaded.** Phases 5 (real-time layer), 6 (approvals workflow), 7 (Finance/Pipeline APIs), and 10 (remaining frontend) are all substantial. The real-time layer alone (WebSocket, LISTEN/NOTIFY, reconnection logic) is architecturally significant work. Combining it with finance APIs, approval workflow completion, and remaining frontend is a risk. I would recommend splitting Sprint 4 into 4a (real-time + approvals) and 4b (finance + pipeline + remaining frontend).

### Data Engineer Gap

The Head of People assessment confirms what the charter flagged in Issue 7: no existing role covers the data infrastructure work this app requires. The assessment is thorough and correct.

From a technical perspective, the Data Engineer gap manifests in the following areas:
- **Schema ownership.** The database schema is currently defined in the Drizzle ORM schema file. Nobody owns its evolution beyond the initial design. Index management, migration strategy, and query optimisation need a dedicated owner.
- **Event instrumentation.** The activity log, execution records, and heartbeat tables must be written to at precise points in the application lifecycle. This is backend engineering with data engineering discipline.
- **Budget enforcement pipeline.** The monthly spend accumulation, reset job, and threshold alerts are continuous server-side jobs. They are not CRUD features.
- **Dashboard aggregation queries.** The GET /dashboard endpoint must run 5-6 database aggregations on every request. These queries must be fast, correct, and cached. Query performance tuning is a data engineering concern.

**Assessment: The Data Engineer role is technically justified.** Without it, these responsibilities will fragment across the Senior Engineer and Engineer, neither of whom are scoped for continuous data infrastructure ownership. The Senior Engineer is already the most loaded agent on the project.

### Technical Debt Carried Into Sprint 2

The following technical debt is being carried forward:

1. **Token storage security debt (BUG-001, BUG-002).** Every frontend component that touches auth is built on a broken foundation. The longer this persists, the more rework is needed.
2. **API path prefix uncertainty (BUG-015, BUG-020).** Until someone verifies the actual mount point in `index.ts` and aligns client and server, no frontend-to-backend integration can be trusted.
3. **Token refresh failure (BUG-021).** The auth flow is architecturally sound but the implementation wiring is wrong. Users will be forced to re-login every 15 minutes.
4. **Status enum mismatch (Charter Issue 1).** The database stores one set of values, the spec defines another, and the frontend renders a third hybrid. This affects agents, tasks, and any future filtering or reporting.
5. **Incomplete status transition matrix (G-17).** Tasks can be put into invalid states. This is data integrity debt.
6. **Hardcoded exchange rate (BUG-019).** Minor now, but it will produce incorrect financial reports over time.
7. **bcrypt dummy hash in timing-safe comparison (BUG-003).** The timing protection for email enumeration is defeated. This is a security debt.

**Assessment: The technical debt is manageable if the Critical and High items are resolved before Sprint 2.** If they are carried forward, the debt compounds -- Sprint 2 builds on Sprint 1's code, and building on broken foundations multiplies rework.

### CTO Sign-Off

**Approved with conditions.**

Conditions:
1. BUG-001, BUG-002, BUG-003, BUG-009, BUG-015, BUG-020, and BUG-021 must be resolved before Sprint 2 begins. These are not feature gaps; they are implementation defects that undermine the architecture's integrity.
2. The agent status enum must be resolved. I will issue a technical specification for the canonical enum with a display mapping layer. VP Product must confirm the product-side values within 3 working days.
3. Sprint 4 should be split into 4a and 4b to reduce delivery risk on the heaviest sprint.
4. The Data Engineer role must be created. I endorse the Head of People's recommendation. Reporting to VP Engineering, Sonnet tier.

---

## 5. VP Product Review -- Quality and Delivery Assessment

### 65% Implementation Fidelity

The 65% figure is not acceptable for a production release. It is acceptable as a Sprint 1 delivery with the explicit understanding that the remaining 35% is tracked, prioritised, and scheduled.

The 65% breaks down as follows:
- Authentication: approximately 75% (solid backend, missing rate limiting and soft deactivation)
- Command Centre: approximately 50% (missing Active Projects widget, wrong stat cards, no filters)
- Org Chart: approximately 70% (excellent tree view, missing List View and full dialogs)
- Task System: approximately 65% (good CRUD, incomplete transitions, no PM review gate)
- Projects: approximately 55% (basic CRUD, no Kanban, no date fields)
- Agent Execution: approximately 30% (schema exists, no execution engine or budget enforcement)
- Finance: approximately 40% (CRUD exists, data model diverges, no charts, no cash flow, no scenarios)
- Leads & Clients: approximately 45% (basic CRUD, no detail pages, no Kanban, no conversion flow)
- Approvals: approximately 65% (good backend, wrong sort order, unverified slide-over)
- Settings: approximately 60% (core sections done, Model Pricing and Notifications missing)

The areas of lowest fidelity (Agent Execution at 30%, Finance at 40%, Leads & Clients at 45%) are all Sprint 4+ scope. That is expected. The areas that should be higher (Command Centre at 50%, Projects at 55%) are Sprint 2 scope and will receive attention.

**Assessment: The 65% is accepted as a Sprint 1 baseline, not as a quality target.** Sprint 2 must demonstrably raise fidelity in its targeted areas to 80%+ or the trajectory is wrong.

### Critical and High PRD Gaps

The PRD validation identified 2 Critical and 13 High severity gaps. The Criticals are:

- **G-17 (Critical):** Status transition matrix incomplete. The task system's integrity depends on this. Without correct transitions, the entire task workflow is unreliable.
- **G-18 (Critical):** PM review gate not enforced. This is a core product feature. Tasks can skip review and go directly to "done" -- which means the quality gate that justifies the VP Product role is not functional.

The 13 Highs include: user hard delete (G-04), missing Active Projects widget (G-06), incomplete Hire/Edit Agent dialogs (G-13, G-14), task type missing (G-19), no Kanban board (G-25), revenue data model divergence (G-27), missing cash flow and transition scenarios (G-29, G-30), missing Lead and Client Detail pages (G-33, G-34), and missing escalating rate limit (G-01).

**Priority assessment:**
- G-17 and G-18 must be fixed before Sprint 2. They are data integrity and product integrity issues.
- G-04 (hard delete) must be fixed before Sprint 2. Deleting user records is irreversible and destroys audit history.
- G-13 and G-14 (agent dialogs) should be fixed in Sprint 2 as they are Sprint 2 scope (Org Chart frontend).
- G-19 (task type) should be fixed in Sprint 2 as it affects task decomposition workflows.
- G-06, G-25, G-27, G-29, G-30, G-33, G-34 are Sprint 2 and Sprint 3 scope and should be scheduled accordingly.
- G-01 (rate limiting) is a security gap and should be fixed in Sprint 2.

### Test Plan Comprehensiveness

The test plan (v1.0) is well-structured. It traces every test case to a specific spec requirement. The auth section alone defines 16+ test cases covering login, logout, token refresh, setup, and security verification.

However:
- **No test cases have been executed.** The test plan exists but has produced zero results. QA Engineer is blocked on a deployed, testable environment.
- **The test plan covers auth thoroughly but the remainder of the app is not validated.** The test plan must be extended for Sprint 2 scope: Command Centre, Org Chart, Projects, Tasks.
- **The bug report identified 24 defects through code review, not test execution.** These are specification-vs-code comparison findings. They are valid defects, but they were found by reading code, not by running the app. The QA process for Sprint 2 must include actual execution testing against the deployed Railway environment.

**Assessment: The test plan is a good foundation but must grow to cover Sprint 2 scope. More critically, test execution must begin -- a test plan that is never run provides no quality assurance.**

### Definition of Done -- Product Completeness

The Definition of Done (Section 6) is product-complete in the sense that it covers all the right dimensions: feature implementation, quality, PRD validation, financial, analytics, data engineering, design, deployment, documentation, and Glen acceptance.

Two items I want to flag:

1. **Section 6.1:** "Every feature in Sections 1-15 of the feature spec is implemented." This is the right target but at 65% fidelity it is a long way from being met. The gap log has 48 items. Each must be tracked to resolution.

2. **Section 6.3:** "All 7 CEO review contradictions resolved with documented decisions." I have begun this work (the PRD validation report identifies 11 PRD corrections needed), but the most complex contradiction -- the agent status enum -- requires CTO coordination. I commit to delivering the reconciled feature spec with all binding decisions applied and the status enum mapping document within the first 3 working days of Sprint 2.

### VP Product Sign-Off

**Approved with conditions.**

Conditions:
1. G-17 (status transitions) and G-18 (PM review gate) must be fixed before Sprint 2 commences. These are Critical severity and affect product integrity.
2. The reconciled feature spec (all 11 PRD corrections applied) will be delivered within the first 3 working days of Sprint 2.
3. The agent status enum mapping document will be jointly issued by VP Product and CTO within 3 working days.
4. The test plan must be extended to cover Sprint 2 scope before Sprint 2 QA begins.
5. Test execution must commence in Sprint 2. A test plan without results is not quality assurance.

---

## 6. Consolidated C-Suite Decision

### Overall Decision

**Approved to proceed to Sprint 2 -- with binding conditions.**

The charter is a sound governance document. The project has delivered a credible Sprint 1 foundation with real, working code across all major modules. The governance artefacts (cost model, PRD validation, test plan, bug report, people assessment) demonstrate that the leadership team is doing its job: identifying gaps, quantifying risks, and assigning ownership.

However, Sprint 1 has produced artefacts that reveal more work than the charter's forward-looking sprint plan anticipated. The 24 bugs, 48 PRD gaps, 11 PRD corrections, and 10 open charter issues represent a significant remediation backlog that must be integrated into the Sprint 2 plan, not treated as separate from it.

### Binding Conditions for Sprint 2 Commencement

| # | Condition | Owner | Deadline | Blocker? |
|---|---|---|---|---|
| C-01 | Fix BUG-001 and BUG-002 (token storage in localStorage). Security vulnerability. | VP Engineering (assigns to Senior Engineer) | Before Sprint 2 starts | Yes -- blocks Sprint 2 |
| C-02 | Fix BUG-003 (bcrypt dummy hash defeats timing-safe comparison) | VP Engineering (assigns to Engineer) | Before Sprint 2 starts | Yes -- blocks Sprint 2 |
| C-03 | Fix BUG-009 (approval decision endpoint 404) | VP Engineering (assigns to Engineer) | Before Sprint 2 starts | Yes -- blocks Sprint 2 |
| C-04 | Fix BUG-021 (token refresh reads from wrong JSON path) | VP Engineering (assigns to Engineer) | Before Sprint 2 starts | Yes -- blocks Sprint 2 |
| C-05 | Verify and resolve BUG-015/BUG-020 (API path prefix mismatch) | VP Engineering (assigns to DevOps) | Before Sprint 2 starts | Yes -- blocks Sprint 2 |
| C-06 | Fix G-17 (complete status transition matrix) | VP Engineering (assigns to Senior Engineer) | Before Sprint 2 starts | Yes -- blocks Sprint 2 |
| C-07 | Fix G-18 (implement PM review gate enforcement) | VP Engineering (assigns to Senior Engineer) | Before Sprint 2 starts | Yes -- blocks Sprint 2 |
| C-08 | Fix G-04 / BUG-012 (change user delete to soft deactivation) | VP Engineering (assigns to Engineer) | Before Sprint 2 starts | Yes -- blocks Sprint 2 |
| C-09 | Resolve agent status enum (Issue 1). Joint decision document. | VP Product + CTO | Within 3 working days | Yes -- blocks Sprint 2 agent work |
| C-10 | Deliver reconciled feature spec (all 11 PRD corrections applied) | VP Product | Within 3 working days of Sprint 2 start | No -- Sprint 2 can begin on non-affected modules |
| C-11 | Escalate Data Engineer role creation to Glen for approval | CEO | First week of Sprint 2 | No -- but blocks Sprint 4 if not resolved |
| C-12 | Update charter Section 3.1 to include cost model operational controls at agent execution go-live gate | CEO | First week of Sprint 2 | No |
| C-13 | Glen approval of $1,000/month AI budget | CEO (escalates to Glen) | Before agent execution go live (Sprint 5) | Yes -- blocks Sprint 5 |
| C-14 | Triage all 83 remediation items into Sprint 2 must-do, Sprint 3 should-do, and backlog | Producer + VP Engineering | Before Sprint 2 planning completes | No -- but failure to triage will overload Sprint 2 |
| C-15 | Assign Sprint 2 tasks to underutilised agents (CMO, Head of People, Tech Writer, Data Analyst) | COO | Sprint 2 planning | No |
| C-16 | Evaluate splitting Sprint 4 into 4a/4b | VP Engineering + CTO | Sprint 3 planning | No |

### Sprint 2 Commencement Gate

Sprint 2 may begin when conditions C-01 through C-08 are verified as resolved. C-09 blocks agent-related Sprint 2 work specifically but does not block all Sprint 2 work. The remaining conditions are tracked and must be completed within their stated deadlines.

### Next C-Suite Review

**Trigger:** Sprint 2 completion, or any Critical severity issue raised during Sprint 2, whichever comes first.

**Expected Sprint 2 review content:**
- Sprint 2 delivery assessment against the must-fix and should-fix items
- Implementation fidelity re-measurement (target: 75%+ overall, 80%+ in Sprint 2 scope areas)
- Bug closure rate (24 open; target: 10 Critical and High bugs closed)
- Agent status enum resolution confirmed
- Data Engineer role decision confirmed
- Test execution results (first actual QA pass)
- Updated cost projections from CFO based on Sprint 1-2 actual token consumption

---

*This document constitutes the formal C-Suite review of the NBIAI App Project Charter v1.0. All conditions are binding. Assigned owners are accountable for their conditions by the stated deadlines. The CEO will track condition resolution and convene the next review at the stated trigger.*

**Review participants:**
- CEO Agent -- Programme assessment and sign-off
- COO Agent -- Operational assessment and sign-off
- CFO Agent -- Financial assessment and sign-off
- CTO Agent -- Technical assessment and sign-off
- VP Product Agent -- Quality and delivery assessment and sign-off

**Date:** 28 March 2026
