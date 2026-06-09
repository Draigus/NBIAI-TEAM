# Data Engineer -- Tier 2 Knowledge

## NBIAI App Data Architecture

The NBIAI App is a full-stack application that manages NBI's AI agent company. It is built on Node.js + Fastify + PostgreSQL + Drizzle ORM (backend) and React + Vite + Tailwind + shadcn/ui (frontend). The Data Engineer owns the data infrastructure layer within this stack.

## Schema Ownership Boundaries

The NBIAI App schema has 22+ tables. The Data Engineer owns the data-layer tables. Application tables are owned by the application engineers (Senior Engineer, Engineer). The boundary is critical to understand:

### Data Engineer Owns
| Table | Purpose |
|---|---|
| agent_executions | Every AI agent run: tokens, cost, duration, model, status |
| agent_heartbeats | Real-time agent status for dashboard |
| activity_log | Structured event log with JSONB metadata |
| agent_budgets | Per-agent monthly spend tracking |
| model_pricing | Per-model token pricing rates |
| pipeline_lead_stage_history | Stage transition history for funnel analytics (to be created) |

### Application Engineers Own (Data Engineer Does Not Modify)
| Table | Owner |
|---|---|
| companies, users, sessions | Auth engineers |
| roles, agents | Agent management engineers |
| projects, tasks, task_comments | Project/task engineers |
| approval_requests | Approval flow engineers |
| revenue_items, payroll_items, cash_flow_projections | Finance engineers |
| clients, pipeline_leads | Client/pipeline engineers |
| knowledge_files | Knowledge management engineers |
| api_keys, settings | Settings engineers |

When the Data Engineer needs to add a foreign key referencing an application table (e.g., agent_executions.agent_id references agents.id), coordinate with the owning engineer through VP Engineering.

## Drizzle ORM Quick Reference

The NBIAI App uses Drizzle ORM in schema-first mode. All data-layer tables are defined in `db/schema.ts`. Migrations are generated from the schema using `drizzle-kit generate:pg`.

### Key API Patterns

**Table definition:**
```typescript
import { pgTable, uuid, varchar, integer, numeric, timestamp, jsonb, text, index, pgEnum } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Enum definition
export const executionStatusEnum = pgEnum('execution_status', [
  'running', 'completed', 'failed', 'timed_out', 'cancelled'
])

// Table definition
export const agentExecutions = pgTable(
  'agent_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id').notNull().references(() => agents.id),
    status: executionStatusEnum('status').notNull().default('running'),
    costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
    inputTokens: integer('input_tokens').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  },
  (t) => [
    index('agent_executions_agent_id_started_at_idx').on(t.agentId, t.startedAt),
  ],
)
```

**Column type helpers:**
- `uuid('col_name')` -- UUID column, use `.defaultRandom()` for auto-generated IDs
- `varchar('col_name', { length: N })` -- variable-length string
- `text('col_name')` -- unlimited text
- `integer('col_name')` -- 32-bit integer
- `numeric('col_name', { precision: P, scale: S })` -- exact decimal (use for money)
- `timestamp('col_name', { withTimezone: true })` -- timestamp with timezone
- `jsonb('col_name')` -- JSONB column (indexable, queryable)
- `boolean('col_name')` -- boolean

**Column modifiers:**
- `.notNull()` -- NOT NULL constraint
- `.default(value)` -- default value
- `.defaultRandom()` -- UUID default
- `.defaultNow()` -- timestamp default to now()
- `.references(() => otherTable.column)` -- foreign key (use arrow function)
- `.primaryKey()` -- primary key

**Indexes** are defined in the second argument to `pgTable` as a callback receiving the table columns:
```typescript
(t) => [
  index('index_name').on(t.column1, t.column2),  // composite index
  index('unique_index').on(t.column).unique(),     // unique index
]
```

**Enums** are created with `pgEnum` and used as column types.

**Migration commands:**
- `npx drizzle-kit generate:pg` -- generate migration from schema changes
- Migrations are placed in `db/migrations/` as numbered SQL files
- Always review generated SQL before deploying

## Current Tech Stack

| Component | Technology | Version/Notes |
|---|---|---|
| Runtime | Node.js | LTS |
| Framework | Fastify | HTTP server, JSON Schema validation |
| Database | PostgreSQL | Primary data store |
| ORM | Drizzle ORM | Schema-first, TypeScript-native, migration generation |
| Scheduling | node-cron | Budget resets, retention jobs, heartbeat |
| Real-time | PostgreSQL LISTEN/NOTIFY + WebSocket | Event broadcast to frontend |
| Auth | JWT (15-min access, 30-day refresh) | bcryptjs for passwords, AES-256-GCM for API keys |
| AI SDK | @anthropic-ai/sdk | Server-side only |
| Hosting | Railway | Recommended deployment target |

## Anthropic Model Pricing (as of March 2026)

These rates must be maintained in the model_pricing table. Update when Anthropic changes pricing.

| Model ID | Display Name | Input (per 1M tokens) | Output (per 1M tokens) |
|---|---|---|---|
| claude-opus-4-6 | Opus 4.6 | $15.00 | $75.00 |
| claude-sonnet-4-6 | Sonnet 4.6 | $3.00 | $15.00 |
| claude-haiku-4-5-20251001 | Haiku 4.5 | $0.80 | $4.00 |

**Cost formula per execution:**
```
cost_usd = (input_tokens / 1,000,000 * input_price) + (output_tokens / 1,000,000 * output_price)
```

Store as numeric(10,6) for precision. Display rounded to 2 decimal places in the UI.

## Event Taxonomy (Baseline)

The activity_log uses event_type strings following the convention `{entity}.{action}`. The metadata column is JSONB. Each event type has a defined payload schema.

### Execution Status Enum Values
The `execution_status` enum defines the lifecycle states for agent executions:
- `running` -- execution is in progress
- `completed` -- execution finished successfully
- `failed` -- execution encountered an error
- `timed_out` -- execution exceeded its time limit
- `cancelled` -- execution was cancelled by a user or system action

### Execution Events
| event_type | Trigger | Metadata Keys |
|---|---|---|
| agent.execution_started | Execution runner begins | execution_id, agent_id, model, trigger_type |
| agent.execution_completed | Execution succeeds | execution_id, agent_id, input_tokens, output_tokens, cost_usd, duration_ms |
| agent.execution_failed | Execution errors | execution_id, agent_id, error_message, error_code |
| agent.execution_timed_out | Execution exceeds time limit | execution_id, agent_id, timeout_ms |
| agent.execution_cancelled | User or system cancels | execution_id, agent_id, cancelled_by |

### Budget Events
| event_type | Trigger | Metadata Keys |
|---|---|---|
| budget.alert_80_percent | Spend crosses 80% threshold | agent_id, spent_usd, budget_cap_usd, percent_used |
| budget.hard_stop | Spend reaches 100%, execution blocked | agent_id, spent_usd, budget_cap_usd, blocked_execution_id |
| budget.monthly_reset | First of month reset job | month_year, agents_reset_count, previous_month_total_spend |

### Agent Lifecycle Events
| event_type | Trigger | Metadata Keys |
|---|---|---|
| agent.status_changed | Agent status transitions | agent_id, old_status, new_status, changed_by |
| agent.hired | New agent activated | agent_id, role_id, model_tier |
| agent.terminated | Agent deactivated | agent_id, terminated_by, reason |

### Task Events
| event_type | Trigger | Metadata Keys |
|---|---|---|
| task.created | New task created | task_id, project_id, created_by |
| task.status_changed | Task status transitions | task_id, old_status, new_status, changed_by |
| task.checked_out | Agent begins work on task | task_id, agent_id |
| task.checked_in | Agent completes/fails/releases task | task_id, agent_id, outcome |

### Approval Events
| event_type | Trigger | Metadata Keys |
|---|---|---|
| approval.requested | Approval created | approval_id, requested_by, approval_type |
| approval.decided | Approval approved/rejected/changes_requested | approval_id, decided_by, decision, comment |

### System Events
| event_type | Trigger | Metadata Keys |
|---|---|---|
| system.heartbeat_failure | Agent heartbeat missed | agent_id, last_heartbeat_at, gap_seconds |
| system.websocket_reconnected | LISTEN connection restored | gap_start, gap_end, gap_duration_ms |
| user.login | User authenticates | user_id, ip_address |
| user.logout | User logs out | user_id |

## LISTEN/NOTIFY Channels

| Channel | Purpose | Payload Schema |
|---|---|---|
| agent_activity | Agent status changes, hires, terminations | { event_type, agent_id, data: {...} } |
| task_update | Task status changes, assignments | { event_type, task_id, data: {...} } |
| approvals_update | Approval requests and decisions | { event_type, approval_id, data: {...} } |
| budget_alert | 80% and 100% budget events | { event_type, agent_id, data: {...} } |
| heartbeat | Agent heartbeat pulses | { agent_id, status, timestamp } |
| execution_update | Execution start, complete, fail | { event_type, execution_id, agent_id, data: {...} } |
| system_event | System-level events (reconnections, failures) | { event_type, data: {...} } |

All payloads include company_id at the top level for WebSocket routing.

## Known Technical Debt (Data Layer)

| Item | Impact | Priority |
|---|---|---|
| pipeline_lead_stage_history table missing | Funnel analytics impossible -- CMO cannot track pipeline conversion rates | High -- must create before Sprint 2 analytics work |
| finance.agentCosts() mapped to temp endpoint | CFO cost attribution by agent is incomplete | Medium -- requires proper /finance/agent-costs endpoint design |
| No data quality monitoring | Silent instrumentation failures go undetected | High -- must build reconciliation checks |
| model_pricing table needs seeding | Cost computation returns 0 without pricing data | Critical -- must seed with current Anthropic rates on first deploy |
| 90-day retention job not implemented | activity_log will grow unbounded | Medium -- implement before production traffic |

## Working with the Data Analyst

The Data Analyst is your primary internal customer. They consume the data you build and produce business intelligence, cost analysis, and operational reporting for the COO, CFO, and CMO.

**Ground rules:**
1. Before building new instrumentation, ask the Data Analyst what question they are trying to answer. Design the schema to serve the analysis
2. When the Data Analyst reports a data quality issue, own it. Investigate immediately. Do not push back with "the data looks right to me" without running the exact query they ran
3. Document everything in a way that the Data Analyst can write queries without reverse-engineering your code. The event taxonomy and schema reference are your contract with them
4. When you change a schema or event payload, notify the Data Analyst proactively. They may have queries or dashboards that depend on the old structure
5. If you and the Data Analyst disagree on what "correct" means for a metric, escalate to the COO (who manages both of you operationally) or VP Engineering (your direct manager) for resolution. Do not let ambiguity persist -- it will produce conflicting reports

## NBI-Specific Context

- NBI is a gaming industry consultancy. The AI agent platform manages a company of AI agents that augment NBI's real human team
- The platform tracks real money: agent execution costs are paid by NBI to Anthropic. Cost computation accuracy directly affects NBI's financial reporting
- Glen Pryer (NBI Managing Director) uses the Finance tab and Dashboard daily. If cost figures are wrong or the dashboard is slow, he notices immediately
- The Data Analyst supports Glen with financial modelling, pipeline analytics, and operational reporting. Bad data from the Data Engineer corrupts everything downstream
- British English only. No em dashes. Be direct. Be thorough. No padding
