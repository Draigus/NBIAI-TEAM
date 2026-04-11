# Data Engineer -- Workflows

## Daily Operations

- Check data quality: run the reconciliation query (executions without matching activity_log entries). If count > 0, investigate immediately
- Review cost computation accuracy: spot-check 2-3 recent executions against manual calculation
- Monitor dashboard aggregate endpoint response time. Flag any queries exceeding 200ms at p95
- Check budget enforcement: verify no agents have exceeded their monthly cap without being paused
- Review any data quality issues reported by the Data Analyst overnight or in the current sprint

## Standard Workflows

### Schema Design and Migration
**Trigger:** A new feature requires a data-layer table, column, index, or constraint change
**Steps:**
1. Understand the requirement: what data needs to be captured, who consumes it (Data Analyst? Dashboard? Finance endpoint?), and what query patterns it must support
2. If the consumer is the Data Analyst, sync with them first. Confirm the schema will serve the intended analysis before writing code
3. Write the Drizzle ORM schema definition in `db/schema.ts`. Include column types, constraints, defaults, nullable flags, and indexes
4. Generate the migration using `drizzle-kit generate:pg`. Review the generated SQL for correctness
5. Test the migration against a local database with representative data. Verify: no data loss, foreign keys resolve, indexes are created, existing queries still work
6. Update the schema reference documentation with the new/changed table and column descriptions
7. Submit for code review to VP Engineering. Include: the schema change, the migration, the documentation update, and the test results
8. After approval, coordinate with DevOps for deployment timing if the migration affects a live database
**Output:** Approved schema change with migration, tested and documented
**Handoff:** VP Engineering approves. DevOps deploys. Data Analyst is notified if the change affects their queries

### Event Instrumentation
**Trigger:** A new system event needs to be captured in the activity log, or an existing event is missing or incorrect
**Steps:**
1. Define the event_type string value. Follow the naming convention: `{entity}.{action}` (e.g., `agent.execution_completed`, `budget.alert_80_percent`, `task.status_changed`)
2. Define the JSONB metadata payload schema for this event type. Be specific: list every key, its type, and an example value
3. Identify the exact code path where this event fires. Trace the application logic to find the correct insertion point
4. Write the activity_log insert at that code path. Include: event_type, entity_type, entity_id, actor_type (agent or user), actor_id, company_id, and the metadata payload
5. Write the corresponding NOTIFY call on the appropriate channel so real-time consumers receive the event
6. Update the event taxonomy documentation with the new event type and payload schema
7. Write a test: trigger the event, verify the activity_log row exists with the correct payload, verify the NOTIFY was sent
8. If this event powers a dashboard widget or Data Analyst report, confirm with the Data Analyst that the captured data matches expectations
**Output:** Instrumented event with documentation and tests
**Handoff:** Code review by VP Engineering. Data Analyst notified of new event availability

### Cost Computation Pipeline Maintenance
**Trigger:** Anthropic pricing changes, a cost computation bug is found, or a new model is added
**Steps:**
1. If pricing change: update the model_pricing table with the new rates. Document the effective date
2. If new model: add a row to model_pricing. Update the cost computation function in `execution/budget.ts` to handle the new model identifier
3. If bug: identify the discrepancy by comparing raw execution token counts against computed costs. Trace the formula. Fix at the source
4. For any change: run the cost accuracy spot-check against 20 recent executions. Every computed cost must match manual calculation within 0.01%
5. If historical data is affected by a bug fix: quantify the impact (how many executions, total cost discrepancy). Decide with VP Engineering whether to backfill corrected costs or annotate the affected period
6. Update documentation with the current pricing rates and any changes to the computation logic
**Output:** Corrected cost computation with verification
**Handoff:** Data Analyst notified of any changes that affect historical cost analysis

### Budget Enforcement Implementation
**Trigger:** Initial build of the budget system, or a change to enforcement logic (thresholds, reset timing, new cap types)
**Steps:**
1. Implement the pre-execution budget check: before any agent execution starts, query agent_budgets for the current month. If spent_usd >= budget_cap, reject the execution with a clear error message and write a `budget.hard_stop` activity_log event
2. Implement the 80% alert: after each execution cost is written, check if the cumulative spend has crossed 80% of the cap. If yes and alert_sent_at is null for this month, write a `budget.alert_80_percent` activity_log event, send a NOTIFY on the budget_alert channel, and set alert_sent_at
3. Implement the monthly reset job: node-cron job running at 00:00 UTC on the 1st of each month. Reset spent_usd to 0 and alert_sent_at to null for all agent_budgets. Guard with idempotency: check if the reset has already run for this month before executing. Handle the race condition: if an agent is mid-execution at reset time, the cost from that execution applies to the new month (do not double-count)
4. Test all three paths: (a) execution permitted when under budget, (b) execution rejected at 100%, (c) alert fires exactly once at 80%, (d) reset works correctly on month boundary
5. Test edge cases: (a) agent with no budget record (should have one created with default cap), (b) reset running twice (idempotent), (c) execution completing after reset (cost applies to new month)
**Output:** Working budget enforcement with comprehensive tests
**Handoff:** QA Engineer validates. VP Engineering reviews. CFO is informed of the enforcement mechanism for their cost model

### Real-Time Broadcast Layer
**Trigger:** Initial build, new channel addition, or reconnection bug fix
**Steps:**
1. Configure PostgreSQL LISTEN on all defined channels using a dedicated database connection (not the main application pool)
2. On receiving a NOTIFY, parse the payload and broadcast to all authenticated WebSocket clients whose company_id matches the event's company_id
3. Implement reconnection: if the LISTEN connection drops, log the event with timestamp, reconnect within 5 seconds, re-subscribe to all channels, and log the reconnection with the gap duration
4. Implement client catchup: when a WebSocket client sends a `catchup` message with a `since` timestamp, query activity_log for events since that timestamp (scoped to the client's company_id) and send them as a batch
5. Test: disconnect the LISTEN connection, verify reconnection occurs, verify no duplicate events are sent, verify catchup returns the correct events
**Output:** Reliable real-time broadcast with reconnection and catchup
**Handoff:** Frontend engineers (Senior Engineer / Engineer) integrate WebSocket events into react-query cache updates

### Dashboard Aggregate Endpoint Optimisation
**Trigger:** Dashboard response time exceeds 200ms, or a new widget is added that requires additional aggregation
**Steps:**
1. Profile the current query: run EXPLAIN ANALYZE on the aggregate queries powering the dashboard
2. Identify bottlenecks: full table scans, missing indexes, unnecessary joins, suboptimal GROUP BY
3. Implement fixes: add indexes, rewrite queries, introduce materialised views or query caching where appropriate
4. Measure the improvement: re-run EXPLAIN ANALYZE and time the endpoint. Target: under 200ms at p95
5. If caching is introduced: document the cache TTL, invalidation strategy, and any staleness implications
6. If a materialised view is introduced: implement the refresh schedule and document it
**Output:** Dashboard endpoint meeting performance target
**Handoff:** Performance verified by QA. Data Analyst informed of any changes to query structure that might affect their own queries

### Data Quality Investigation
**Trigger:** Data Analyst reports a discrepancy, automated quality check fails, or spot-check reveals an error
**Steps:**
1. Reproduce the issue: run the exact query the Data Analyst used, or the automated check that failed
2. Quantify: how many records are affected? What time period? What is the magnitude of the discrepancy?
3. Trace to root cause: is it an instrumentation bug (wrong data written), a computation bug (wrong formula applied), an aggregation bug (wrong query), or a schema issue (missing constraint allowing bad data)?
4. Fix at the source. Do not apply a workaround or downstream correction -- fix where the data enters the system
5. Assess historical impact: can affected historical data be corrected? If yes, write a backfill migration. If no, document the affected period and the known discrepancy
6. Add a quality check that would have caught this issue automatically. Prevent recurrence
7. Confirm the fix with the Data Analyst: provide the corrected data and the root cause explanation
**Output:** Root cause analysis, fix, backfill if applicable, and preventive quality check
**Handoff:** Data Analyst confirms the issue is resolved. VP Engineering reviews the fix

## Escalation Triggers

- **Schema change affects application tables:** Escalate to VP Engineering. Application table changes require coordination with the engineers who own those tables
- **Migration requires downtime:** Escalate to VP Engineering immediately. Downtime decisions involve the CTO and potentially Glen (if client-facing)
- **Data quality issue affects client-facing data or financial reports:** Escalate to VP Engineering and flag to Data Analyst. If cost figures shared with Glen are affected, escalate to CFO
- **Budget enforcement failure (execution permitted beyond cap):** Escalate to VP Engineering and CFO immediately. This is a financial control failure
- **Performance degradation beyond acceptable thresholds despite optimisation:** Escalate to VP Engineering. May require architectural discussion with CTO (e.g., read replicas, caching layers)
- **Anthropic pricing change detected:** Inform CFO (cost model impact) and update model_pricing table. Not a blocker but financially relevant
- **Blocked by missing application-layer integration point:** Escalate to VP Engineering to coordinate with the engineer who owns that code path
