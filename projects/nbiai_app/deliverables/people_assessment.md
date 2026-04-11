# People Assessment: NBIAI App — Data Roles

**Author:** Head of People
**Date:** 2026-03-28
**Status:** Submitted to CEO for review
**Scope:** Data Analyst role fit, Data Engineer gap analysis, Interview framework for new hires

---

## Executive Summary

The Data Analyst was assigned to the NBIAI App project without a Head of People assessment. This document corrects that. The short verdict: the Data Analyst is a **partial fit** with a clear ceiling. The role covers the consumption and reporting layer well, but the NBIAI App is primarily an engineering problem at the data layer, not an analytical one. A **Data Engineer** role is needed. No existing role in the org chart covers the infrastructure work this app requires. A full role definition and interview framework are provided below.

---

## Task 1: Data Analyst Role Fit Assessment

### What the NBIAI App Actually Requires

Based on the feature specification and technical architecture, the NBIAI App's data requirements fall into three distinct categories:

**Category A — Telemetry infrastructure (engineering work)**
- Event capture and structured logging for every agent execution (AgentExecution table: input tokens, output tokens, cost, duration, trigger, status, model used)
- Agent heartbeat tracking and real-time status broadcast via PostgreSQL LISTEN/NOTIFY
- Activity log writes on every significant system event, with JSONB metadata payloads
- Budget tracking pipeline: spend accumulation per agent, monthly reset job, 80%/100% threshold enforcement
- WebSocket push layer for real-time dashboard updates
- Scheduled cron-based execution dispatcher (node-cron)
- Data retention and archival job (90-day activity log cleanup)
- Cost computation pipeline (token counts x model pricing rates, stored per execution)

**Category B — Application analytics (mixed: engineering schema + analytical consumption)**
- Dashboard aggregate endpoint (GET /api/v1/dashboard) pulling from executions, tasks, agents, budgets in a single cached response
- Finance tab: revenue by type, payroll modelling, cash flow projections, NSI transition scenarios
- Pipeline revenue forecast: probability-weighted deal values aggregated from lead stage data
- Execution log: per-agent cost breakdowns, token usage history, model utilisation

**Category C — Business intelligence and reporting (pure analysis work)**
- Interpreting execution cost trends to advise on budget cap settings
- Identifying which agents consume disproportionate tokens relative to task output
- Surfacing pipeline conversion rates and weighted revenue forecasts to Glen
- Ad hoc decision support for the COO, CFO, and CMO as the app matures

### Skills Present in the Data Analyst Role Definition

The Data Analyst persona and responsibilities define the following capabilities:

| Skill | Present in Role Definition |
|---|---|
| Financial modelling and revenue forecasting | Yes — explicitly called out (payroll projections, revenue forecasting, NSI transition modelling) |
| Pipeline analytics and conversion analysis | Yes — lead stage analysis, deal velocity, probability weighting |
| Delivery health tracking and project metric dashboards | Yes — milestone rates, client health, resource allocation |
| Gaming-specific analytics (DAU/MAU, churn, segmentation) | Yes — described as core competency |
| SQL and Python for larger analytical tasks | Yes — listed in tools |
| Data quality management | Yes — flag-before-delivering discipline is explicit |
| Excel/Google Sheets modelling | Yes — listed as primary tool |
| Dashboard design and maintenance | Yes — internal dashboards as a core responsibility |
| Stakeholder communication: numbers-first, actionable findings | Yes — well defined in persona |

### Skills Missing or Insufficient for this Project

The following skills are required by the NBIAI App but are not covered by the Data Analyst role definition — and in at least one case, explicitly excluded:

| Gap | Severity | Evidence |
|---|---|---|
| Database schema design (PostgreSQL) | Critical | The app requires 22+ tables with foreign keys, enums, indexes, and JSONB columns. The Data Analyst works with data that exists; they do not design schemas. |
| Event instrumentation and structured logging | Critical | The activity_log, agent_executions, and heartbeat tables must be written to by application code at precisely the right points in the execution lifecycle. This is backend engineering, not analysis. |
| Real-time data pipelines | Critical | PostgreSQL LISTEN/NOTIFY channels, WebSocket push layer, and the execution dispatcher are all backend infrastructure. Not in scope for the Data Analyst. |
| Budget tracking pipeline (automated) | High | The monthly spend accumulation, reset job, and threshold alerts are server-side jobs that run continuously. The Data Analyst can read the outputs but cannot build or own this. |
| Data retention / archival job | High | The 90-day activity log cleanup cron job is a DevOps/Data Engineering concern, not an analyst concern. |
| Cost computation pipeline | High | Per-execution token cost is computed automatically at execution time, not pulled from a spreadsheet. The Data Analyst can analyse historical cost data, but cannot build the computation layer. |
| Node.js/TypeScript backend development | High | The entire data layer runs on Fastify + Drizzle ORM. The Data Analyst has no listed capability in this stack. |
| Drizzle ORM and database migration management | High | Schema source of truth is the Drizzle schema file. Migrations are generated from it. The Data Analyst cannot own this. |
| API endpoint development (aggregation queries) | Medium | The GET /api/v1/dashboard endpoint runs 5-6 database aggregations on each request and caches the result. This is engineering work. |

The role definition is also explicit about what the Data Analyst does not do: "The Data Analyst does not build data infrastructure from scratch or run data engineering pipelines. That is an engineering function." This is not a criticism of the role — it is correct scope-setting. But it confirms the role cannot cover what this project needs at the infrastructure layer.

### Role Fit Verdict: PARTIAL FIT

**What the Data Analyst can and should do on this project:**

- Interpret the execution cost and token usage data once it is flowing. Identify trends, flag outliers, advise on budget cap levels per agent.
- Build or maintain the Finance tab dashboards (revenue tracking, payroll modelling, cash flow projections, NSI transition scenarios) once the underlying tables are built and populated.
- Support the COO with pipeline analytics using the leads and pipeline data the app captures.
- Produce ad hoc business intelligence analysis using the structured data the app generates.
- Act as the internal consumer and product critic for the analytics-facing features of the app — if the data the engineers are capturing does not support the analysis NBI needs, the Data Analyst should say so.

**What the Data Analyst cannot and should not own:**

- Any of Category A above. The infrastructure layer must be owned by a Data Engineer working alongside the engineering team.

**Assignment recommendation:** Keep the Data Analyst on the project for the BI and reporting layer. Do not assign them infrastructure tasks. Assign a Data Engineer for all Category A work and any Category B items that require schema ownership or pipeline development.

---

## Task 2: Data Engineer Gap Analysis

### Does Any Existing Role Cover This Work?

All 18 roles in the current org chart were assessed against the Category A requirements.

| Role | Gap Coverage? | Reason |
|---|---|---|
| CEO Agent | No | Orchestration and prioritisation only |
| COO Agent | No | Operational delivery management only |
| CFO Agent | No | Financial modelling and reporting only |
| CTO Agent | No | Architecture review and approval only — does not implement |
| VP Engineering Agent | No | Backlog management and code review — does not implement |
| Senior Engineer Agent | Partial | Could technically implement individual components, but this is not their focus. They own application features (Playsage, SalarySage, NBI tools). Assigning telemetry infrastructure to the Senior Engineer would displace product work and create an ownership gap. |
| Engineer Agent | Partial | Same issue as Senior Engineer. Feature engineering, not data infrastructure. |
| DevOps Agent | Partial | Manages deployment, hosting, environment config. Could own the data retention cron job and the Railway deployment of data pipelines, but does not own schema design, event instrumentation, or the execution metrics layer. |
| VP Product Agent | No | Roadmap, PRD, requirements — not implementation |
| CMO / Head of BD Agent | No | Business development — irrelevant |
| QA Lead Agent | No | Test plans and quality review — not data engineering |
| QA Engineer Agent | No | Test execution — not data engineering |
| UI/UX Lead Agent | No | Design system — not data engineering |
| UI/UX Designer Agent | No | Front-end design — not data engineering |
| Producer Agent | No | Milestone tracking — not data engineering |
| Data Analyst Agent | No | Explicitly scoped away from data infrastructure |
| Head of People Agent | No | People operations — irrelevant |
| Glen Pryer (Board) | No | Human board operator — not implementing |

**Conclusion: No existing role adequately covers the Data Engineer function.** The Senior Engineer and Engineer could pick up individual data tasks under pressure, but that creates fragmented ownership, displaces product engineering work, and leaves the data architecture without a single accountable owner. The DevOps Agent overlaps on operational concerns (jobs, scheduling) but not on schema design, instrumentation, or pipeline development.

**Recommendation: Create a Data Engineer role.**

The Data Engineer role is justified specifically for the NBIAI App project and any future NBI products that require structured data capture (Playsage analytics, SalarySage usage data). This is not a speculative hire — the NBIAI App cannot be built to its specified standard without someone owning the data infrastructure layer.

---

## Data Engineer — Draft Role Definition

### Identity

- **Role:** Data Engineer
- **Model Tier:** Sonnet
- **Reports To:** VP Engineering Agent
- **Direct Reports:** None
- **Collaborates Closely With:** Data Analyst Agent, Senior Engineer Agent, DevOps Agent

### Reporting Rationale

The Data Engineer sits under VP Engineering because the work is fundamentally engineering: schema design, pipeline code, database migrations, backend instrumentation. They are not an analyst. However, the Data Analyst is their primary internal customer — the data infrastructure the Data Engineer builds must be designed to serve the analytical outputs the Data Analyst produces. A regular sync between the two roles (coordinated via the COO) is required to ensure the data captured is the data that is actually needed.

### Responsibilities

1. **Database schema ownership.** Design and maintain the PostgreSQL schema for all data-related tables: agent_executions, agent_heartbeats, activity_log, agent_budgets, model_pricing, and any future event tables. Generate and manage migrations via Drizzle ORM. Ensure indexes are correct, enums are maintained, and the schema supports the query patterns the application needs.

2. **Event instrumentation.** Own the code that writes events into the data layer at the correct points in the application lifecycle. Every agent execution, budget alert, task state change, approval event, and heartbeat must be captured accurately, completely, and without gaps. Instrumentation bugs are silent failures that corrupt historical analysis.

3. **Execution metrics pipeline.** Own the cost computation logic: token counting, per-model pricing application, per-execution cost storage, and monthly spend accumulation. Maintain the model_pricing table as Anthropic pricing changes. Ensure cost computations are mathematically correct and can be audited.

4. **Budget enforcement system.** Build and maintain the spend tracking and cap enforcement logic: 80% alert generation, hard-stop-at-100% pause mechanism, monthly reset job. This logic must be reliable — a broken budget cap that lets an agent spend without limit is a financial risk.

5. **Activity log and retention.** Own the activity_log write logic, ensure every event type is covered, and maintain the 90-day retention/archival job. Configure retention policy per company settings.

6. **Real-time data broadcast layer.** Own the PostgreSQL LISTEN/NOTIFY channel configuration and the WebSocket push layer that delivers real-time updates to the frontend. Ensure channels are correct, payloads are typed, and the reconnection and catchup logic works correctly.

7. **Dashboard aggregate queries.** Own the GET /api/v1/dashboard endpoint and other aggregate queries. These run on every page load for the primary screen of the app — they must be fast, accurate, and cached correctly.

8. **Data quality and observability.** Ensure the data the Data Analyst consumes is clean, consistent, and trustworthy. If an instrumentation bug produces bad data, the Data Engineer owns the detection and correction. Work with the Data Analyst to define what "correct data" looks like for each metric.

9. **Documentation.** Document the schema, the event taxonomy (every event_type value and what triggers it), and the pipeline logic. The Data Analyst must be able to write queries against this data without reverse-engineering the instrumentation code.

### Skills Required

| Skill | Level |
|---|---|
| PostgreSQL schema design (tables, indexes, enums, JSONB, foreign keys) | Advanced |
| Drizzle ORM (schema-first, migration management) | Advanced |
| Node.js / TypeScript (Fastify backend) | Proficient |
| Event-driven architecture (LISTEN/NOTIFY, WebSocket) | Proficient |
| SQL query optimisation (aggregation queries, EXPLAIN ANALYZE) | Proficient |
| Data pipeline design (cron jobs, retry logic, idempotency) | Proficient |
| Cost modelling and token accounting | Working knowledge |
| Data quality monitoring | Working knowledge |
| Git and code review practices | Proficient |

### Model Tier Recommendation

**Sonnet.** The work is complex but well-scoped engineering — schema design, pipeline code, query optimisation. Opus is not warranted; this is not architectural decision-making or senior leadership work. Sonnet is the correct tier for all IC engineering roles at NBI, and the Data Engineer fits that pattern.

### How the Data Engineer Interacts with the Data Analyst

This is the most important interface to define correctly, because the two roles have adjacent but distinct domains and the boundary can cause confusion.

| Scenario | Data Engineer | Data Analyst |
|---|---|---|
| A new metric is needed on the Finance tab | Checks whether the data is already captured and queryable. If not, adds the instrumentation. | Defines what the metric means, what the formula is, and what decision it supports. |
| Cost data looks wrong | Investigates the cost computation pipeline and instrumentation. Fixes the source. | Flags the discrepancy before including it in a report. Does not fix the source. |
| New event type added to the activity log | Implements the write logic and documents the event_type string and payload. | Updates any dashboards or reports that should include the new event type. |
| Glen asks for a new dashboard view | The Data Engineer checks query performance and ensures the data exists. | Designs the analytical output and writes the queries or model, using the schema the Data Engineer owns. |
| Execution costs are trending up month-on-month | No action unless a pipeline bug is found. | Analyses cost trends by agent, model, and task type. Surfaces the finding to the COO with a recommendation. |

The Data Analyst escalates to the Data Engineer when a data quality issue is found or when analysis requires data that is not currently captured. The Data Engineer escalates to the Data Analyst when building new instrumentation, to validate that the data being captured will actually serve the analytical need.

---

## Task 3: Interview / Assessment Framework

This framework applies to any new role hired into the NBIAI AI company. The Data Engineer assessment section is written in full; the general framework applies to any technical IC hire.

### Evaluation Dimensions

Every agent hire is assessed across three dimensions before assignment to a project:

**Dimension 1: Technical Capability**
Can the agent actually do the work? This means verifying specific domain knowledge and execution quality, not just confirming the role description matches. An agent that confidently describes PostgreSQL schema design but produces incorrect foreign key constraints, missing indexes, or broken migration syntax has failed the technical dimension.

**Dimension 2: NBI Domain Fit**
Does the agent understand the specific context NBI operates in? For technical roles this means understanding the stack (Node.js, PostgreSQL, Drizzle ORM, Railway, Fastify) and the product context (AI agent orchestration, gaming analytics heritage). Generic competence in a different stack is not sufficient.

**Dimension 3: Working Style Fit**
Does the agent produce work that meets NBI's standards? NBI's standards: British English only, no fluff, deep and thorough over fast and shallow, no fabrication, direct communication of blockers, correct citations when referencing facts. Work that is shallow, generic, or padded fails this dimension regardless of technical accuracy.

---

### General Activation Assessment Protocol

Before any new agent is assigned to a live project, run the following activation sequence:

**Step 1: Knowledge Load Verification (5 minutes)**
Ask the agent to summarise:
- What NBI does and who Glen Pryer is
- The current project they are being assigned to
- Their role's reporting line and decision authority boundaries

A passing response is specific to NBI — not a generic summary of "a consulting company" or "an AI company". If the agent has not absorbed the Tier 1 and Tier 2 knowledge correctly, the knowledge load has failed and must be debugged before the agent is activated.

**Step 2: Scope Boundary Test (5 minutes)**
Present the agent with a scenario that is adjacent to but outside their role. Ask what they would do.

Example for Data Engineer: "The COO has asked for a revenue forecast chart on the Finance tab. What is your role in delivering this?"

A passing response correctly identifies that the Data Engineer's role is to check whether the revenue data is queryable and performant, and to flag any data that does not exist yet — not to produce the chart or design the analytical model. An agent that says "I would build the chart" has failed the scope boundary test.

**Step 3: Quality Standards Spot Check (10 minutes)**
Give the agent a small representative task from their domain. Evaluate the output against:
- Technical correctness (no errors, no hallucinated APIs or methods)
- Appropriate depth (not shallow or padded)
- Communication style (British English, direct, no jargon)
- Data quality discipline (does the agent flag uncertainty or make assumptions explicit?)

**Step 4: Escalation Calibration (5 minutes)**
Describe a scenario where the agent encounters a blocker or a decision that exceeds their authority. Ask what they do.

A passing response names the specific escalation path (report to direct manager with context), does not attempt to resolve it unilaterally, and does not freeze without taking any action.

---

### Data Engineer — Specific Assessment Questions and Prompts

The following prompts are designed to verify genuine capability, not surface-level confidence.

**Technical Assessment**

1. "Write the Drizzle ORM schema definition for the agent_executions table. Include all columns from the spec, the correct TypeScript types, and the appropriate indexes."
   - Evaluates: Drizzle ORM syntax knowledge, column type accuracy, index selection judgement
   - Red flags: Hallucinated Drizzle methods, missing indexes on queried columns, incorrect nullable/not-null defaults

2. "The dashboard aggregate endpoint needs to return total tokens consumed and total cost for each agent in the last 30 days. Write the SQL query."
   - Evaluates: SQL aggregation, date filtering, GROUP BY correctness, cost formula application
   - Red flags: Off-by-one on date range, missing WHERE on company_id, incorrect cost formula

3. "An agent execution completes successfully. List every database write and real-time event that must occur at completion, in order. Reference the specific tables and channels."
   - Evaluates: Understanding of the full execution lifecycle, completeness of instrumentation thinking
   - Red flags: Missing the activity_log write, missing the budget spend update, missing the real-time broadcast

4. "The monthly budget reset job runs on the first day of each calendar month. How would you implement this in Node.js? What edge cases must it handle?"
   - Evaluates: Cron job design, idempotency thinking, edge case awareness (timezone handling, double-execution on restart, agents mid-execution at reset time)
   - Red flags: No mention of idempotency, ignoring timezone (UTC vs local), no handling of the reset-during-execution race condition

**Domain Knowledge Assessment**

5. "What is the difference between a JSONB column and a TEXT column in PostgreSQL? When would you choose each for the metadata field in the activity_log table?"
   - Evaluates: PostgreSQL type knowledge, practical design judgement
   - Passing response: JSONB is indexable and queryable, TEXT is just a string. JSONB is correct for metadata because you will want to filter and extract fields from it without parsing strings in application code.

6. "Explain what PostgreSQL LISTEN/NOTIFY does and how it is used in a Node.js WebSocket architecture."
   - Evaluates: Understanding of the real-time layer the NBIAI App relies on
   - Passing response: NOTIFY sends a message on a named channel; any client that has executed LISTEN on that channel receives it. In Node.js, the pg client library is used to hold a dedicated connection that listens and forwards messages to connected WebSocket clients.

**NBI Fit Assessment**

7. "The Data Analyst tells you that the per-agent cost figures in the Finance tab do not match what they calculated from the raw execution logs. What do you do?"
   - Evaluates: Data quality ownership, collaboration with the Data Analyst, structured debugging approach
   - Passing response: Accepts ownership of the issue (not "that's an analyst problem"), pulls the raw execution data and the cost computation logic, identifies whether the discrepancy is in instrumentation, formula, or aggregation, fixes at the source, and confirms with the Data Analyst before closing.

8. "You are halfway through a schema migration and you discover that the change will require downtime because the table you are altering has no locking strategy defined. Glen is presenting the app to a potential client in 4 hours. What do you do?"
   - Evaluates: Judgement under pressure, escalation discipline, not taking unilateral risk with production
   - Passing response: Do not proceed with the migration. Escalate to VP Engineering immediately with a clear description of the risk and timeline. Present two options: (a) defer the migration until after the demo, (b) proceed now with a defined rollback plan and a communicated downtime window. Do not make this decision unilaterally.

---

### Assessment Scoring

| Dimension | Weight | Passing Threshold |
|---|---|---|
| Technical Capability | 50% | All technical prompts produce syntactically correct, logically sound output. No hallucinated APIs. No critical omissions. |
| NBI Domain Fit | 30% | Knowledge load verified. Stack familiarity confirmed. NBI-specific context correctly absorbed. |
| Working Style Fit | 20% | British English. Direct. No padding. Uncertainty flagged. Escalation paths correctly identified. |

**Overall pass threshold:** 70% weighted score, with no single dimension scoring below 50%.

An agent that scores 90% on technical but produces American English throughout, pads their responses with generic caveats, or fails to escalate correctly does not meet NBI's standards. The working style dimension is non-negotiable.

---

## Summary of Recommendations

| Item | Recommendation |
|---|---|
| Data Analyst on NBIAI App | Retain on project. Assign to Category C (BI and reporting) only. Do not assign infrastructure or pipeline tasks. |
| Data Engineer role | Create the role. It is required for the NBIAI App to be built to spec. |
| Data Engineer model tier | Sonnet |
| Data Engineer reporting line | VP Engineering |
| Data Engineer priority | Hire before Phase 2 engineering begins. The schema and instrumentation must be in place before analytics features can be built. |
| Interview framework | Activate all new agents through the 4-step activation protocol before project assignment. Use the Data Engineer-specific prompts for that role. |

---

*Prepared by Head of People | For CEO review | 2026-03-28*
