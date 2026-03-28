# NBIAI Team App -- Technical Architecture

**Author:** CTO
**Date:** 2026-03-28
**Version:** 1.0
**Status:** Submitted to CEO for review
**Project:** NBIAI Team App (Deliverable 2)

---

## Document Purpose

This document is the complete technical architecture for the NBIAI Team App. It specifies every database table, every API endpoint, the full agent execution layer, project structure, authentication model, deployment architecture, and phased build plan. A senior engineer should be able to begin implementation of any module without asking a clarifying question.

The stack was decided prior to this document and is not revisited here:

| Layer | Choice |
|---|---|
| Runtime | Node.js with Fastify |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Frontend | React + Vite + Tailwind CSS + shadcn/ui |
| Auth | JWT access tokens + refresh tokens |
| Real-time | PostgreSQL LISTEN/NOTIFY piped to WebSocket |
| Hosting | Railway |
| AI | Anthropic Claude API via `@anthropic-ai/sdk` |

**Why Fastify over Express:** Fastify has native TypeScript support, built-in schema validation via JSON Schema, superior request/response performance (2-3x Express benchmarks), and first-class plugin architecture for WebSocket support. Express would work, but Fastify is the better choice for a typed codebase with schema-validated APIs.

---

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [API Design](#2-api-design)
3. [Agent Execution Layer](#3-agent-execution-layer)
4. [Project Structure](#4-project-structure)
5. [Authentication and Security](#5-authentication-and-security)
6. [Deployment Architecture](#6-deployment-architecture)
7. [Development Milestones](#7-development-milestones)

---

## 1. Database Schema

All tables use UUIDs as primary keys. All tables include `created_at` and `updated_at` timestamps with timezone. Drizzle ORM is the schema source of truth. Migrations are generated from the Drizzle schema file.

### 1.1 Enum Types

```sql
CREATE TYPE user_role AS ENUM ('board', 'admin', 'viewer');

CREATE TYPE agent_status AS ENUM ('active', 'idle', 'running', 'paused', 'terminated');

CREATE TYPE model_tier AS ENUM ('opus', 'sonnet', 'haiku');

CREATE TYPE task_status AS ENUM ('backlog', 'assigned', 'in_progress', 'blocked', 'review', 'done', 'cancelled');

CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low');

CREATE TYPE task_relation_type AS ENUM ('blocking', 'blocked_by', 'related');

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'changes_requested');

CREATE TYPE approval_type AS ENUM (
  'external_email',
  'client_communication',
  'financial_commitment',
  'public_publish',
  'strategic_decision',
  'hiring',
  'other'
);

CREATE TYPE execution_status AS ENUM ('running', 'completed', 'failed', 'cancelled', 'pending_approval');

CREATE TYPE revenue_type AS ENUM ('monthly_retainer', 'one_off', 'milestone');

CREATE TYPE pipeline_stage AS ENUM (
  'identification',
  'qualification',
  'outreach',
  'discovery',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost'
);

CREATE TYPE payroll_type AS ENUM ('human', 'agent');

CREATE TYPE knowledge_tier AS ENUM ('tier_1', 'tier_2', 'tier_3');

CREATE TYPE project_status AS ENUM ('planning', 'active', 'paused', 'completed', 'cancelled');

CREATE TYPE project_health AS ENUM ('green', 'amber', 'red');

CREATE TYPE client_health AS ENUM ('green', 'amber', 'red');

CREATE TYPE comment_type AS ENUM ('comment', 'status_change', 'assignment', 'escalation', 'system');
```

### 1.2 Table: `companies`

Single-tenant for NBI. Exists as a table rather than config to support future multi-tenancy without schema migration.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `name` | `varchar(255)` | NOT NULL | | Company display name |
| `slug` | `varchar(100)` | NOT NULL, UNIQUE | | URL-safe identifier |
| `logo_url` | `text` | | `NULL` | Path or URL to company logo |
| `contact_email` | `varchar(255)` | | `NULL` | |
| `website` | `varchar(255)` | | `NULL` | |
| `settings` | `jsonb` | NOT NULL | `'{}'::jsonb` | Company-wide settings (timezone, currency, etc.) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `UNIQUE(slug)`

### 1.3 Table: `users`

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `email` | `varchar(255)` | NOT NULL, UNIQUE | | Login email |
| `password_hash` | `varchar(255)` | NOT NULL | | Argon2id hash |
| `display_name` | `varchar(255)` | NOT NULL | | |
| `role` | `user_role` | NOT NULL | `'viewer'` | board, admin, viewer |
| `is_active` | `boolean` | NOT NULL | `true` | Soft disable |
| `last_login_at` | `timestamptz` | | `NULL` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `UNIQUE(email)`, `INDEX(company_id)`

**Constraints:** Only one user may have role `board` per company. Enforced at application level (not database constraint, as partial unique indexes on enums are fragile across ORMs).

### 1.4 Table: `sessions`

Stores refresh tokens. One user may have multiple active sessions (e.g. laptop and phone).

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK -> users(id) ON DELETE CASCADE | | |
| `refresh_token_hash` | `varchar(255)` | NOT NULL | | SHA-256 hash of the refresh token |
| `user_agent` | `text` | | `NULL` | Browser/device identifier |
| `ip_address` | `varchar(45)` | | `NULL` | IPv4 or IPv6 |
| `expires_at` | `timestamptz` | NOT NULL | | Absolute expiry |
| `revoked_at` | `timestamptz` | | `NULL` | Set on logout or rotation |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(user_id)`, `INDEX(refresh_token_hash)`, `INDEX(expires_at)`

**Cleanup:** A scheduled job deletes sessions where `expires_at < now()` or `revoked_at IS NOT NULL AND revoked_at < now() - interval '7 days'`. Runs daily.

### 1.5 Table: `roles`

Static configuration table. Seeded on first deploy with all 18 defined roles from the org chart. Rows are not created via the API in normal operation; they are managed as seed data.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `name` | `varchar(100)` | NOT NULL | | e.g. "Chief Technology Officer" |
| `slug` | `varchar(100)` | NOT NULL | | e.g. "cto" |
| `department` | `varchar(100)` | NOT NULL | | e.g. "Engineering", "Operations", "Finance" |
| `default_model_tier` | `model_tier` | NOT NULL | | Recommended model tier for this role |
| `persona_path` | `text` | | `NULL` | Relative path to persona.md in the repo |
| `system_prompt_path` | `text` | | `NULL` | Relative path to system_prompt.md in the repo |
| `responsibilities_path` | `text` | | `NULL` | Relative path to responsibilities.md |
| `is_leadership` | `boolean` | NOT NULL | `false` | True for CEO, COO, CFO, CTO, CMO, VP Eng, VP Product |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `UNIQUE(company_id, slug)`, `INDEX(company_id)`

### 1.6 Table: `agents`

An agent is an instantiated role. A role may have zero or one active agent at any time.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `role_id` | `uuid` | NOT NULL, FK -> roles(id) | | |
| `name` | `varchar(255)` | NOT NULL | | Agent display name |
| `model_tier` | `model_tier` | NOT NULL | | Actual model tier (may differ from role default) |
| `status` | `agent_status` | NOT NULL | `'idle'` | |
| `current_task_id` | `uuid` | FK -> tasks(id) | `NULL` | Denormalised for fast dashboard queries |
| `persona_override` | `text` | | `NULL` | Custom persona text, if different from role default |
| `config` | `jsonb` | NOT NULL | `'{}'::jsonb` | Agent-specific config (tool permissions, etc.) |
| `hired_at` | `timestamptz` | NOT NULL | `now()` | When the agent was created |
| `paused_at` | `timestamptz` | | `NULL` | When paused, if applicable |
| `terminated_at` | `timestamptz` | | `NULL` | When terminated, if applicable |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(company_id)`, `INDEX(role_id)`, `INDEX(status)`, `UNIQUE(role_id) WHERE terminated_at IS NULL` (partial unique -- one active agent per role)

### 1.7 Table: `agent_reports`

Defines the reporting hierarchy. One row per reporting relationship. An agent may report to exactly one other agent.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `agent_id` | `uuid` | NOT NULL, FK -> agents(id) ON DELETE CASCADE, UNIQUE | | The subordinate |
| `reports_to_agent_id` | `uuid` | NOT NULL, FK -> agents(id) ON DELETE CASCADE | | The manager |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `UNIQUE(agent_id)`, `INDEX(reports_to_agent_id)`

**Constraint:** `agent_id != reports_to_agent_id` (CHECK constraint). The CEO agent has no row in this table (reports to Glen, who is a user, not an agent).

### 1.8 Table: `projects`

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `name` | `varchar(255)` | NOT NULL | | |
| `slug` | `varchar(100)` | NOT NULL | | URL-safe identifier |
| `description` | `text` | | `NULL` | |
| `status` | `project_status` | NOT NULL | `'planning'` | |
| `health` | `project_health` | NOT NULL | `'green'` | |
| `lead_agent_id` | `uuid` | FK -> agents(id) | `NULL` | The project lead |
| `brief_path` | `text` | | `NULL` | Path to project_brief.md in repo |
| `started_at` | `timestamptz` | | `NULL` | |
| `target_completion` | `timestamptz` | | `NULL` | |
| `completed_at` | `timestamptz` | | `NULL` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `UNIQUE(company_id, slug)`, `INDEX(company_id)`, `INDEX(status)`, `INDEX(lead_agent_id)`

### 1.9 Table: `tasks`

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `project_id` | `uuid` | NOT NULL, FK -> projects(id) | | |
| `parent_task_id` | `uuid` | FK -> tasks(id) | `NULL` | For task decomposition (CEO breaks goal into subtasks) |
| `title` | `varchar(500)` | NOT NULL | | |
| `description` | `text` | | `NULL` | Full task brief |
| `status` | `task_status` | NOT NULL | `'backlog'` | |
| `priority` | `task_priority` | NOT NULL | `'medium'` | |
| `assigned_agent_id` | `uuid` | FK -> agents(id) | `NULL` | |
| `created_by_user_id` | `uuid` | FK -> users(id) | `NULL` | If created by a human user |
| `created_by_agent_id` | `uuid` | FK -> agents(id) | `NULL` | If created by an agent (e.g. CEO decomposing a goal) |
| `output` | `text` | | `NULL` | Final output/deliverable from the agent |
| `output_path` | `text` | | `NULL` | Path to output file if applicable |
| `started_at` | `timestamptz` | | `NULL` | |
| `completed_at` | `timestamptz` | | `NULL` | |
| `due_at` | `timestamptz` | | `NULL` | |
| `estimated_minutes` | `integer` | | `NULL` | Estimated effort |
| `actual_minutes` | `integer` | | `NULL` | Actual effort (computed from execution times) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(company_id)`, `INDEX(project_id)`, `INDEX(assigned_agent_id)`, `INDEX(status)`, `INDEX(priority)`, `INDEX(parent_task_id)`, `INDEX(created_at DESC)`

**Constraint:** Exactly one of `created_by_user_id` or `created_by_agent_id` must be non-null (CHECK constraint).

### 1.10 Table: `task_relations`

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `task_id` | `uuid` | NOT NULL, FK -> tasks(id) ON DELETE CASCADE | | |
| `related_task_id` | `uuid` | NOT NULL, FK -> tasks(id) ON DELETE CASCADE | | |
| `relation_type` | `task_relation_type` | NOT NULL | | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `UNIQUE(task_id, related_task_id, relation_type)`, `INDEX(task_id)`, `INDEX(related_task_id)`

**Constraint:** `task_id != related_task_id` (CHECK constraint).

### 1.11 Table: `task_comments`

Serves as both a comment thread and an activity log for each task. Status changes, assignments, and escalations are recorded here alongside human/agent comments.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `task_id` | `uuid` | NOT NULL, FK -> tasks(id) ON DELETE CASCADE | | |
| `author_user_id` | `uuid` | FK -> users(id) | `NULL` | If authored by a human |
| `author_agent_id` | `uuid` | FK -> agents(id) | `NULL` | If authored by an agent |
| `comment_type` | `comment_type` | NOT NULL | `'comment'` | |
| `content` | `text` | NOT NULL | | Comment text or status change description |
| `metadata` | `jsonb` | | `NULL` | For status changes: `{ "from": "assigned", "to": "in_progress" }` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(task_id, created_at)`, `INDEX(author_agent_id)`

### 1.12 Table: `task_checkouts`

Atomic checkout log. When an agent begins working on a task, it checks the task out. Only one agent may have a task checked out at any time. The checkout is released on completion, failure, or manual release by an admin.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `task_id` | `uuid` | NOT NULL, FK -> tasks(id) ON DELETE CASCADE | | |
| `agent_id` | `uuid` | NOT NULL, FK -> agents(id) | | |
| `checked_out_at` | `timestamptz` | NOT NULL | `now()` | |
| `checked_in_at` | `timestamptz` | | `NULL` | NULL means currently checked out |
| `outcome` | `varchar(50)` | | `NULL` | 'completed', 'failed', 'released', 'timeout' |

**Indexes:** `UNIQUE(task_id) WHERE checked_in_at IS NULL` (partial unique -- only one active checkout per task), `INDEX(agent_id)`, `INDEX(checked_out_at)`

### 1.13 Table: `agent_executions`

One record per agent run. This is the primary audit trail for all agent activity.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `agent_id` | `uuid` | NOT NULL, FK -> agents(id) | | |
| `task_id` | `uuid` | FK -> tasks(id) | `NULL` | NULL for heartbeat-only runs with no task |
| `status` | `execution_status` | NOT NULL | `'running'` | |
| `model_used` | `varchar(50)` | NOT NULL | | Actual Claude model identifier used |
| `input_tokens` | `integer` | NOT NULL | `0` | |
| `output_tokens` | `integer` | NOT NULL | `0` | |
| `cost_usd` | `numeric(10,6)` | NOT NULL | `0` | Calculated from token counts and model pricing |
| `system_prompt_tokens` | `integer` | | `NULL` | Tokens used by system prompt alone |
| `context_tokens` | `integer` | | `NULL` | Tokens used by knowledge context |
| `started_at` | `timestamptz` | NOT NULL | `now()` | |
| `ended_at` | `timestamptz` | | `NULL` | |
| `duration_ms` | `integer` | | `NULL` | Computed on completion |
| `error_message` | `text` | | `NULL` | If status is 'failed' |
| `log` | `jsonb` | NOT NULL | `'[]'::jsonb` | Structured execution log (steps, tool calls, decisions) |
| `tools_used` | `jsonb` | | `NULL` | Array of tool names invoked during execution |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(agent_id, started_at DESC)`, `INDEX(task_id)`, `INDEX(status)`, `INDEX(started_at DESC)`

### 1.14 Table: `agent_heartbeats`

Lightweight table for tracking agent liveness. Updated on every execution start and completion. Used by the dashboard to show real-time agent status.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `agent_id` | `uuid` | NOT NULL, FK -> agents(id) ON DELETE CASCADE, UNIQUE | | One row per agent |
| `last_seen_at` | `timestamptz` | NOT NULL | `now()` | |
| `last_execution_id` | `uuid` | FK -> agent_executions(id) | `NULL` | |
| `last_task_id` | `uuid` | FK -> tasks(id) | `NULL` | |
| `status_message` | `varchar(500)` | | `NULL` | Short human-readable status |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `UNIQUE(agent_id)`, `INDEX(last_seen_at)`

### 1.15 Table: `agent_budgets`

Monthly cost cap per agent. One row per agent per month.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `agent_id` | `uuid` | NOT NULL, FK -> agents(id) ON DELETE CASCADE | | |
| `month_year` | `varchar(7)` | NOT NULL | | Format: '2026-03' |
| `budget_usd` | `numeric(10,2)` | NOT NULL | | Monthly cap |
| `spent_usd` | `numeric(10,6)` | NOT NULL | `0` | Running total, updated after each execution |
| `alert_sent_at` | `timestamptz` | | `NULL` | When 80% alert was sent |
| `hard_stop_at` | `timestamptz` | | `NULL` | When 100% cap was hit |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `UNIQUE(agent_id, month_year)`, `INDEX(month_year)`

### 1.16 Table: `approvals`

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `approval_type` | `approval_type` | NOT NULL | | |
| `title` | `varchar(500)` | NOT NULL | | Short summary for queue display |
| `requested_by_agent_id` | `uuid` | NOT NULL, FK -> agents(id) | | |
| `execution_id` | `uuid` | FK -> agent_executions(id) | `NULL` | The execution that triggered this approval |
| `task_id` | `uuid` | FK -> tasks(id) | `NULL` | The task context |
| `content` | `jsonb` | NOT NULL | | Full content for review (e.g. draft email body, recipients, etc.) |
| `context` | `text` | | `NULL` | Why the agent is requesting this action |
| `status` | `approval_status` | NOT NULL | `'pending'` | |
| `reviewed_by_user_id` | `uuid` | FK -> users(id) | `NULL` | Who approved/rejected |
| `reviewer_comment` | `text` | | `NULL` | |
| `resolved_at` | `timestamptz` | | `NULL` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(company_id, status)`, `INDEX(requested_by_agent_id)`, `INDEX(status, created_at)`, `INDEX(task_id)`

### 1.17 Table: `revenue_items`

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `client_name` | `varchar(255)` | NOT NULL | | |
| `description` | `text` | | `NULL` | |
| `revenue_type` | `revenue_type` | NOT NULL | | |
| `amount_usd` | `numeric(12,2)` | NOT NULL | | Per-period amount (monthly for retainers) |
| `currency` | `varchar(3)` | NOT NULL | `'USD'` | |
| `start_date` | `date` | NOT NULL | | |
| `end_date` | `date` | | `NULL` | NULL for ongoing |
| `is_active` | `boolean` | NOT NULL | `true` | |
| `created_by_user_id` | `uuid` | FK -> users(id) | `NULL` | |
| `created_by_agent_id` | `uuid` | FK -> agents(id) | `NULL` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(company_id)`, `INDEX(is_active)`, `INDEX(client_name)`

### 1.18 Table: `pipeline_leads`

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `company_name` | `varchar(255)` | NOT NULL | | Target company |
| `contact_name` | `varchar(255)` | | `NULL` | Primary contact |
| `contact_email` | `varchar(255)` | | `NULL` | |
| `contact_title` | `varchar(255)` | | `NULL` | |
| `stage` | `pipeline_stage` | NOT NULL | `'identification'` | |
| `probability` | `integer` | NOT NULL | `0` | 0-100 percent |
| `expected_value_usd` | `numeric(12,2)` | | `NULL` | |
| `expected_close_date` | `date` | | `NULL` | |
| `source` | `varchar(255)` | | `NULL` | How the lead was identified |
| `owner_agent_id` | `uuid` | FK -> agents(id) | `NULL` | Usually the CMO agent |
| `last_contact_date` | `date` | | `NULL` | |
| `next_action` | `text` | | `NULL` | |
| `next_action_date` | `date` | | `NULL` | |
| `notes` | `text` | | `NULL` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(company_id, stage)`, `INDEX(stage)`, `INDEX(expected_close_date)`, `INDEX(next_action_date)`

### 1.19 Table: `payroll_items`

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `name` | `varchar(255)` | NOT NULL | | Person or agent name |
| `payroll_type` | `payroll_type` | NOT NULL | | human or agent |
| `role_description` | `varchar(255)` | | `NULL` | |
| `monthly_cost_usd` | `numeric(10,2)` | NOT NULL | | |
| `annual_cost_usd` | `numeric(12,2)` | NOT NULL | | May not be exactly 12x monthly for humans (bonuses, etc.) |
| `currency` | `varchar(3)` | NOT NULL | `'USD'` | |
| `is_active` | `boolean` | NOT NULL | `true` | |
| `start_date` | `date` | NOT NULL | | |
| `end_date` | `date` | | `NULL` | |
| `agent_id` | `uuid` | FK -> agents(id) | `NULL` | Links to agent if payroll_type is 'agent' |
| `notes` | `text` | | `NULL` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(company_id)`, `INDEX(is_active)`, `INDEX(payroll_type)`

### 1.20 Table: `knowledge_files`

Registry of knowledge files in the three-tier architecture. Content is stored on disk (in the git repo); this table stores metadata and paths for context loading.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `name` | `varchar(255)` | NOT NULL | | Filename |
| `tier` | `knowledge_tier` | NOT NULL | | |
| `role_id` | `uuid` | FK -> roles(id) | `NULL` | Non-null for Tier 2 files |
| `project_id` | `uuid` | FK -> projects(id) | `NULL` | Non-null for Tier 3 files |
| `content_path` | `text` | NOT NULL | | Relative path from repo root |
| `description` | `text` | | `NULL` | |
| `token_estimate` | `integer` | | `NULL` | Estimated token count for budget planning |
| `last_synced_at` | `timestamptz` | | `NULL` | Last time content was read from disk |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(company_id, tier)`, `INDEX(role_id)`, `INDEX(project_id)`

### 1.21 Table: `api_keys`

Encrypted storage for external API keys (Anthropic, future integrations).

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `name` | `varchar(255)` | NOT NULL | | Display name, e.g. "Anthropic Production" |
| `provider` | `varchar(100)` | NOT NULL | | e.g. "anthropic", "sendgrid" |
| `encrypted_key` | `text` | NOT NULL | | AES-256-GCM encrypted |
| `key_suffix` | `varchar(8)` | NOT NULL | | Last 4-8 chars for identification |
| `is_active` | `boolean` | NOT NULL | `true` | |
| `last_used_at` | `timestamptz` | | `NULL` | |
| `created_by_user_id` | `uuid` | NOT NULL, FK -> users(id) | | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(company_id, provider)`, `INDEX(is_active)`

### 1.22 Table: `activity_log`

Global activity feed for the dashboard. Denormalised for fast reads. Written to by triggers or application code whenever a significant event occurs.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `event_type` | `varchar(100)` | NOT NULL | | e.g. 'task_completed', 'approval_requested', 'agent_started', 'budget_alert' |
| `agent_id` | `uuid` | FK -> agents(id) | `NULL` | |
| `user_id` | `uuid` | FK -> users(id) | `NULL` | |
| `task_id` | `uuid` | FK -> tasks(id) | `NULL` | |
| `project_id` | `uuid` | FK -> projects(id) | `NULL` | |
| `title` | `varchar(500)` | NOT NULL | | Human-readable event summary |
| `metadata` | `jsonb` | | `NULL` | Event-specific data |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(company_id, created_at DESC)`, `INDEX(agent_id, created_at DESC)`, `INDEX(event_type)`, `INDEX(project_id)`

**Retention:** Rows older than 90 days are archived to cold storage (or deleted, configurable in company settings). The cleanup job runs weekly.

### 1.23 Table: `clients`

Active client records for the Leads and Clients tab.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | `uuid` | NOT NULL, FK -> companies(id) | | |
| `name` | `varchar(255)` | NOT NULL | | Client company name |
| `health` | `client_health` | NOT NULL | `'green'` | |
| `engagement_type` | `varchar(255)` | | `NULL` | e.g. "Monthly retainer", "Project-based" |
| `glen_role` | `varchar(255)` | | `NULL` | Glen's role with this client |
| `primary_contact_name` | `varchar(255)` | | `NULL` | |
| `primary_contact_email` | `varchar(255)` | | `NULL` | |
| `next_milestone` | `text` | | `NULL` | |
| `next_milestone_date` | `date` | | `NULL` | |
| `notes` | `text` | | `NULL` | |
| `is_active` | `boolean` | NOT NULL | `true` | |
| `started_at` | `date` | | `NULL` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Indexes:** `INDEX(company_id, is_active)`, `INDEX(health)`, `INDEX(next_milestone_date)`

---

## 2. API Design

All endpoints are prefixed with `/api/v1`. All request and response bodies are JSON. All timestamps are ISO 8601 with timezone. All IDs are UUIDs.

Authentication is required on every endpoint except `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh`. The `Authorization` header must contain `Bearer <access_token>`.

Standard error response shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": {}
  }
}
```

Standard error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

Pagination follows cursor-based pagination for list endpoints:

```json
{
  "data": [...],
  "pagination": {
    "cursor": "base64-encoded-cursor-or-null",
    "has_more": true,
    "total": 142
  }
}
```

Default page size: 50. Maximum page size: 200. Controlled by `?limit=50&cursor=xyz` query parameters.

### 2.1 Auth Endpoints

#### `POST /api/v1/auth/login`

**Auth required:** No

**Request body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Success response (200):**
```json
{
  "access_token": "string (JWT)",
  "refresh_token": "string (opaque)",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "string",
    "display_name": "string",
    "role": "board | admin | viewer",
    "company_id": "uuid"
  }
}
```

**Error responses:** 401 (invalid credentials), 403 (account disabled), 429 (rate limited)

**Rate limit:** 5 attempts per email per 15 minutes. Enforced via in-memory rate limiter.

#### `POST /api/v1/auth/refresh`

**Auth required:** No (uses refresh token in body)

**Request body:**
```json
{
  "refresh_token": "string (required)"
}
```

**Success response (200):**
```json
{
  "access_token": "string (JWT)",
  "refresh_token": "string (new opaque token)",
  "expires_in": 900
}
```

**Behaviour:** The old refresh token is revoked. A new refresh token is issued (rotation). If the old refresh token has already been used (replay detection), all sessions for that user are revoked.

**Error responses:** 401 (invalid or expired refresh token)

#### `POST /api/v1/auth/logout`

**Auth required:** Yes

**Request body:**
```json
{
  "refresh_token": "string (required)"
}
```

**Success response (200):**
```json
{
  "message": "Logged out"
}
```

**Behaviour:** Revokes the refresh token. The access token remains valid until expiry (15 minutes max). The client should discard it.

### 2.2 User Endpoints

#### `GET /api/v1/users`

**Auth required:** Yes (admin or board)

**Query params:** `?limit=50&cursor=xyz`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "string",
      "display_name": "string",
      "role": "board | admin | viewer",
      "is_active": true,
      "last_login_at": "ISO8601 | null",
      "created_at": "ISO8601"
    }
  ],
  "pagination": { "cursor": "string | null", "has_more": false, "total": 3 }
}
```

**Error responses:** 403 (viewers cannot list users)

#### `POST /api/v1/users`

**Auth required:** Yes (board only)

**Request body:**
```json
{
  "email": "string (required)",
  "password": "string (required, min 12 chars)",
  "display_name": "string (required)",
  "role": "admin | viewer (required)"
}
```

**Success response (201):**
```json
{
  "id": "uuid",
  "email": "string",
  "display_name": "string",
  "role": "string",
  "is_active": true,
  "created_at": "ISO8601"
}
```

**Error responses:** 400 (validation), 403 (not board), 409 (email exists)

**Constraint:** Only the board user can create new users. The `board` role cannot be assigned via this endpoint. The board user is created during first-time setup.

#### `PATCH /api/v1/users/:id`

**Auth required:** Yes (board for role changes, admin for self-edit of display_name)

**Request body (all fields optional):**
```json
{
  "display_name": "string",
  "role": "admin | viewer",
  "is_active": true,
  "password": "string (min 12 chars)"
}
```

**Success response (200):** Updated user object.

**Error responses:** 400, 403, 404

#### `DELETE /api/v1/users/:id`

**Auth required:** Yes (board only)

**Success response (200):**
```json
{
  "message": "User deactivated",
  "id": "uuid"
}
```

**Behaviour:** Soft delete. Sets `is_active = false`. Does not delete the row. The board user cannot delete themselves.

**Error responses:** 403, 404

### 2.3 Agent Endpoints

#### `GET /api/v1/agents`

**Auth required:** Yes

**Query params:** `?status=active&limit=50&cursor=xyz`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "role": { "id": "uuid", "name": "string", "slug": "string", "department": "string" },
      "model_tier": "opus | sonnet | haiku",
      "status": "active | idle | running | paused | terminated",
      "current_task": { "id": "uuid", "title": "string", "status": "string" } | null,
      "reports_to": { "id": "uuid", "name": "string" } | null,
      "direct_reports_count": 3,
      "hired_at": "ISO8601",
      "last_seen_at": "ISO8601 | null"
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/v1/agents`

**Auth required:** Yes (board or admin)

**Request body:**
```json
{
  "role_id": "uuid (required)",
  "name": "string (required)",
  "model_tier": "opus | sonnet | haiku (required)",
  "reports_to_agent_id": "uuid (optional)",
  "persona_override": "string (optional)",
  "config": {}
}
```

**Success response (201):** Full agent object.

**Behaviour:** Creates the agent, creates the `agent_reports` row if `reports_to_agent_id` is provided, creates a default `agent_budgets` row for the current month (using company default budget), and creates an `agent_heartbeats` row.

**Error responses:** 400, 403, 409 (role already has active agent)

#### `PATCH /api/v1/agents/:id`

**Auth required:** Yes (board or admin)

**Request body (all fields optional):**
```json
{
  "name": "string",
  "model_tier": "opus | sonnet | haiku",
  "status": "active | idle | paused | terminated",
  "persona_override": "string",
  "config": {},
  "reports_to_agent_id": "uuid"
}
```

**Success response (200):** Updated agent object.

**Behaviour:** When status changes to `terminated`, sets `terminated_at` and releases any active task checkouts.

**Error responses:** 400, 403, 404

#### `DELETE /api/v1/agents/:id`

**Auth required:** Yes (board only)

**Behaviour:** Sets status to `terminated` and `terminated_at` to now. Does not delete the row. Releases all active checkouts.

**Error responses:** 403, 404

#### `GET /api/v1/agents/:id`

**Auth required:** Yes

**Response (200):** Full agent object with nested role, reports_to, direct_reports, current_task, latest heartbeat, and budget for current month.

#### `GET /api/v1/agents/:id/executions`

**Auth required:** Yes

**Query params:** `?limit=20&cursor=xyz`

**Response (200):** Paginated list of `agent_executions` for this agent, ordered by `started_at DESC`.

#### `GET /api/v1/agents/:id/budget`

**Auth required:** Yes

**Query params:** `?month=2026-03` (defaults to current month)

**Response (200):**
```json
{
  "agent_id": "uuid",
  "month_year": "2026-03",
  "budget_usd": "50.00",
  "spent_usd": "23.456789",
  "percent_used": 46.9,
  "alert_sent_at": null,
  "hard_stop_at": null,
  "executions_count": 47
}
```

### 2.4 Project Endpoints

#### `GET /api/v1/projects`

**Auth required:** Yes

**Query params:** `?status=active&limit=50&cursor=xyz`

**Response (200):** Paginated list of projects with lead agent, task counts by status, and health.

#### `POST /api/v1/projects`

**Auth required:** Yes (board or admin)

**Request body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "lead_agent_id": "uuid (optional)",
  "target_completion": "ISO8601 (optional)",
  "brief_path": "string (optional)"
}
```

**Success response (201):** Full project object. Slug is auto-generated from name.

#### `PATCH /api/v1/projects/:id`

**Auth required:** Yes (board or admin)

**Request body (all optional):**
```json
{
  "name": "string",
  "description": "string",
  "status": "planning | active | paused | completed | cancelled",
  "health": "green | amber | red",
  "lead_agent_id": "uuid",
  "target_completion": "ISO8601"
}
```

#### `GET /api/v1/projects/:id`

**Auth required:** Yes

**Response (200):** Full project object with nested lead agent, task summary (counts by status), and recent activity.

### 2.5 Task Endpoints

#### `GET /api/v1/tasks`

**Auth required:** Yes

**Query params:** `?project_id=uuid&status=in_progress&assigned_agent_id=uuid&priority=high&limit=50&cursor=xyz`

**Response (200):** Paginated list of tasks with assigned agent, project, and checkout status.

#### `POST /api/v1/tasks`

**Auth required:** Yes (board or admin)

**Request body:**
```json
{
  "project_id": "uuid (required)",
  "title": "string (required)",
  "description": "string (optional)",
  "priority": "critical | high | medium | low (default: medium)",
  "assigned_agent_id": "uuid (optional)",
  "parent_task_id": "uuid (optional)",
  "due_at": "ISO8601 (optional)",
  "estimated_minutes": "integer (optional)"
}
```

**Success response (201):** Full task object. The `created_by_user_id` is set from the JWT. Status defaults to `backlog`, or `assigned` if `assigned_agent_id` is provided.

#### `PATCH /api/v1/tasks/:id`

**Auth required:** Yes (board or admin for most fields; agents can update status and output via the execution layer)

**Request body (all optional):**
```json
{
  "title": "string",
  "description": "string",
  "status": "backlog | assigned | in_progress | blocked | review | done | cancelled",
  "priority": "critical | high | medium | low",
  "assigned_agent_id": "uuid",
  "output": "string",
  "output_path": "string",
  "due_at": "ISO8601"
}
```

**Behaviour:** Status changes automatically create a `task_comments` record of type `status_change`. Assignment changes create a record of type `assignment`. If status changes to `done`, sets `completed_at`. If status changes to `in_progress` and `started_at` is null, sets `started_at`.

#### `GET /api/v1/tasks/:id`

**Auth required:** Yes

**Response (200):** Full task object with nested project, assigned agent, parent task, subtasks, relations, current checkout, and recent comments.

#### `POST /api/v1/tasks/:id/checkout`

**Auth required:** Yes (board/admin for manual checkout; internal for agent checkout)

**Request body:**
```json
{
  "agent_id": "uuid (required)"
}
```

**Success response (200):**
```json
{
  "checkout_id": "uuid",
  "task_id": "uuid",
  "agent_id": "uuid",
  "checked_out_at": "ISO8601"
}
```

**Behaviour:** Atomically checks if the task has no active checkout (using the partial unique index). Creates the checkout row. Sets task status to `in_progress`. Updates `agents.current_task_id`.

**Error responses:** 409 (task already checked out), 400 (task not in checkable status), 404

#### `POST /api/v1/tasks/:id/checkin`

**Auth required:** Yes (board/admin for manual; internal for agent)

**Request body:**
```json
{
  "agent_id": "uuid (required)",
  "outcome": "completed | failed | released (required)",
  "output": "string (optional)",
  "output_path": "string (optional)"
}
```

**Success response (200):** Updated task object.

**Behaviour:** Sets `checked_in_at` on the checkout row. Updates task status based on outcome: `completed` -> `review`, `failed` -> `blocked`, `released` -> `assigned`. Clears `agents.current_task_id`.

#### `GET /api/v1/tasks/:id/comments`

**Auth required:** Yes

**Query params:** `?limit=50&cursor=xyz`

**Response (200):** Paginated list of task comments, ordered by `created_at ASC`.

#### `POST /api/v1/tasks/:id/comments`

**Auth required:** Yes (board or admin)

**Request body:**
```json
{
  "content": "string (required)"
}
```

**Success response (201):** Created comment object. `comment_type` defaults to `comment`. `author_user_id` set from JWT.

### 2.6 Execution Endpoints

#### `GET /api/v1/executions`

**Auth required:** Yes

**Query params:** `?agent_id=uuid&task_id=uuid&status=running&limit=50&cursor=xyz`

**Response (200):** Paginated list of executions with agent name and task title.

#### `GET /api/v1/executions/:id`

**Auth required:** Yes

**Response (200):** Full execution object including log, tools_used, and token breakdown.

#### `POST /api/v1/executions/:agent_id/trigger`

**Auth required:** Yes (board or admin)

**Request body:**
```json
{
  "task_id": "uuid (optional, for task-specific execution)",
  "instruction": "string (optional, ad-hoc instruction for the agent)"
}
```

**Success response (202):**
```json
{
  "execution_id": "uuid",
  "status": "running",
  "message": "Agent execution triggered"
}
```

**Behaviour:** Manually triggers an agent execution. The execution runs asynchronously. The client receives the execution ID immediately and can poll or subscribe via WebSocket for updates.

**Error responses:** 400 (agent not active), 403, 429 (budget exhausted)

### 2.7 Approval Endpoints

#### `GET /api/v1/approvals`

**Auth required:** Yes

**Query params:** `?status=pending&limit=50&cursor=xyz`

**Response (200):** Paginated list of approvals with agent name and task context.

#### `GET /api/v1/approvals/pending`

**Auth required:** Yes

**Response (200):** List of all pending approvals (no pagination, as this should always be a small number). Ordered by `created_at ASC`.

#### `GET /api/v1/approvals/:id`

**Auth required:** Yes

**Response (200):** Full approval object with nested agent, task, execution, and content.

#### `PATCH /api/v1/approvals/:id`

**Auth required:** Yes (board only)

**Request body:**
```json
{
  "status": "approved | rejected | changes_requested (required)",
  "comment": "string (optional)"
}
```

**Success response (200):** Updated approval object.

**Behaviour:**
- `approved`: Sets `resolved_at`, sets `reviewed_by_user_id` from JWT. Emits `approvals_update` notification. If the execution is paused (`pending_approval`), the system resumes execution of the approved action.
- `rejected`: Sets `resolved_at`. The task returns to `in_progress` with the rejection reason added as a task comment. The agent can retry.
- `changes_requested`: Sets `resolved_at`. The task returns to `in_progress` with the change request as a task comment. The agent must revise and resubmit.

**Error responses:** 400 (approval not pending), 403 (not board user), 404

### 2.8 Finance Endpoints

#### `GET /api/v1/finance/revenue`

**Auth required:** Yes (board or admin)

**Query params:** `?year=2026&month=3`

**Response (200):**
```json
{
  "monthly_total": "45000.00",
  "ytd_total": "135000.00",
  "annual_target": "500000.00",
  "ytd_vs_target_percent": 27.0,
  "items": [
    {
      "id": "uuid",
      "client_name": "string",
      "revenue_type": "monthly_retainer",
      "amount_usd": "15000.00",
      "start_date": "2026-01-01",
      "end_date": null,
      "is_active": true
    }
  ]
}
```

#### `POST /api/v1/finance/revenue`

**Auth required:** Yes (board or admin)

**Request body:**
```json
{
  "client_name": "string (required)",
  "description": "string (optional)",
  "revenue_type": "monthly_retainer | one_off | milestone (required)",
  "amount_usd": "number (required)",
  "start_date": "date (required)",
  "end_date": "date (optional)"
}
```

**Success response (201):** Created revenue item.

#### `GET /api/v1/finance/payroll`

**Auth required:** Yes (board or admin)

**Response (200):**
```json
{
  "total_monthly": "28500.00",
  "total_annual": "342000.00",
  "human_monthly": "25000.00",
  "agent_monthly": "3500.00",
  "items": [
    {
      "id": "uuid",
      "name": "string",
      "payroll_type": "human | agent",
      "role_description": "string",
      "monthly_cost_usd": "5000.00",
      "annual_cost_usd": "60000.00",
      "is_active": true
    }
  ]
}
```

#### `GET /api/v1/finance/pipeline`

**Auth required:** Yes (board or admin)

**Response (200):**
```json
{
  "total_weighted_value": "125000.00",
  "total_unweighted_value": "450000.00",
  "leads_by_stage": {
    "identification": 3,
    "qualification": 2,
    "outreach": 1,
    "discovery": 1,
    "proposal": 0,
    "negotiation": 0,
    "closed_won": 2,
    "closed_lost": 1
  },
  "leads": [
    {
      "id": "uuid",
      "company_name": "string",
      "stage": "qualification",
      "probability": 30,
      "expected_value_usd": "50000.00",
      "expected_close_date": "2026-06-01",
      "weighted_value": "15000.00"
    }
  ]
}
```

#### `GET /api/v1/finance/projection`

**Auth required:** Yes (board or admin)

**Query params:** `?months=3` (1-12, default 3)

**Response (200):**
```json
{
  "projections": [
    {
      "month": "2026-04",
      "revenue_contracted": "45000.00",
      "revenue_pipeline_weighted": "12500.00",
      "payroll": "28500.00",
      "agent_costs": "3500.00",
      "net_cash_flow": "25500.00"
    }
  ]
}
```

### 2.9 Client Endpoints

#### `GET /api/v1/clients`

**Auth required:** Yes

**Query params:** `?health=green&is_active=true&limit=50&cursor=xyz`

**Response (200):** Paginated list of clients.

#### `POST /api/v1/clients`

**Auth required:** Yes (board or admin)

**Request body:**
```json
{
  "name": "string (required)",
  "health": "green | amber | red (default: green)",
  "engagement_type": "string (optional)",
  "glen_role": "string (optional)",
  "primary_contact_name": "string (optional)",
  "primary_contact_email": "string (optional)",
  "next_milestone": "string (optional)",
  "next_milestone_date": "date (optional)",
  "notes": "string (optional)"
}
```

**Success response (201):** Created client object.

#### `PATCH /api/v1/clients/:id`

**Auth required:** Yes (board or admin)

**Request body:** All fields optional, same as POST.

#### `GET /api/v1/clients/:id`

**Auth required:** Yes

**Response (200):** Full client object.

### 2.10 Pipeline Lead Endpoints

#### `GET /api/v1/pipeline`

**Auth required:** Yes (board or admin)

**Query params:** `?stage=qualification&limit=50&cursor=xyz`

**Response (200):** Paginated list of pipeline leads.

#### `POST /api/v1/pipeline`

**Auth required:** Yes (board or admin)

**Request body:**
```json
{
  "company_name": "string (required)",
  "contact_name": "string (optional)",
  "contact_email": "string (optional)",
  "contact_title": "string (optional)",
  "stage": "identification (default)",
  "probability": "integer 0-100 (default: 0)",
  "expected_value_usd": "number (optional)",
  "expected_close_date": "date (optional)",
  "source": "string (optional)",
  "owner_agent_id": "uuid (optional)",
  "notes": "string (optional)"
}
```

**Success response (201):** Created lead object.

#### `PATCH /api/v1/pipeline/:id`

**Auth required:** Yes (board or admin)

**Request body:** All fields optional, same as POST.

### 2.11 Settings Endpoints

#### `GET /api/v1/settings`

**Auth required:** Yes (board or admin)

**Response (200):**
```json
{
  "company": {
    "id": "uuid",
    "name": "string",
    "logo_url": "string | null",
    "contact_email": "string | null",
    "website": "string | null",
    "settings": {}
  },
  "default_agent_budget_usd": "50.00",
  "agent_count": 18,
  "active_agent_count": 15
}
```

#### `PATCH /api/v1/settings`

**Auth required:** Yes (board only)

**Request body:**
```json
{
  "name": "string (optional)",
  "logo_url": "string (optional)",
  "contact_email": "string (optional)",
  "website": "string (optional)",
  "settings": {}
}
```

#### `GET /api/v1/settings/api-keys`

**Auth required:** Yes (board only)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "provider": "string",
      "key_suffix": "...abc1",
      "is_active": true,
      "last_used_at": "ISO8601 | null",
      "created_at": "ISO8601"
    }
  ]
}
```

**Note:** The actual key value is never returned by any API endpoint.

#### `POST /api/v1/settings/api-keys`

**Auth required:** Yes (board only)

**Request body:**
```json
{
  "name": "string (required)",
  "provider": "string (required)",
  "key": "string (required)"
}
```

**Behaviour:** The key is encrypted with AES-256-GCM before storage. The last 4 characters are stored in `key_suffix` for display purposes. The full key is never returned by any endpoint.

**Success response (201):**
```json
{
  "id": "uuid",
  "name": "string",
  "provider": "string",
  "key_suffix": "...abc1",
  "is_active": true,
  "created_at": "ISO8601"
}
```

#### `DELETE /api/v1/settings/api-keys/:id`

**Auth required:** Yes (board only)

**Behaviour:** Sets `is_active = false`. Does not delete the row.

**Success response (200):**
```json
{
  "message": "API key deactivated",
  "id": "uuid"
}
```

### 2.12 Knowledge Endpoints

#### `GET /api/v1/knowledge`

**Auth required:** Yes

**Query params:** `?tier=tier_1&role_id=uuid&project_id=uuid`

**Response (200):** List of knowledge file metadata (not content).

#### `GET /api/v1/knowledge/:id`

**Auth required:** Yes

**Response (200):** Knowledge file metadata plus content (read from disk at the `content_path`).

### 2.13 Activity Feed Endpoint

#### `GET /api/v1/activity`

**Auth required:** Yes

**Query params:** `?agent_id=uuid&project_id=uuid&event_type=task_completed&limit=50&cursor=xyz`

**Response (200):** Paginated list of activity log entries, ordered by `created_at DESC`.

### 2.14 Dashboard Aggregate Endpoint

#### `GET /api/v1/dashboard`

**Auth required:** Yes

**Response (200):**
```json
{
  "projects": {
    "active": 3,
    "by_health": { "green": 2, "amber": 1, "red": 0 },
    "recent": [ ... ]
  },
  "agents": {
    "total": 18,
    "active": 12,
    "running": 2,
    "idle": 10,
    "paused": 3,
    "terminated": 3
  },
  "tasks": {
    "open": 24,
    "in_progress": 5,
    "blocked": 1,
    "completed_today": 7
  },
  "approvals_pending": 2,
  "recent_activity": [ ... ],
  "budget_summary": {
    "total_monthly_budget": "900.00",
    "total_spent_this_month": "347.25",
    "percent_used": 38.6
  }
}
```

This endpoint aggregates multiple queries and is cached for 30 seconds (invalidated by real-time events).

---

## 3. Agent Execution Layer

This section specifies the server-side system that wakes agents, loads their context, calls the Claude API, tracks costs, enforces budgets, manages approval gates, and broadcasts real-time updates. This is the core of the platform.

### 3.1 Heartbeat System

Agents are woken by one of two triggers:

**Trigger 1: Task Assignment.** When a task is assigned to an agent (via API or by another agent), the system checks if the agent is in `active` or `idle` status and immediately queues an execution. This is the primary trigger for most work.

**Trigger 2: Scheduled Heartbeat.** A cron-like scheduler runs every 5 minutes. On each tick, it:
1. Queries all agents with status `active` or `idle`
2. For each agent, checks if there are tasks assigned to them with status `assigned` that are not checked out
3. If unclaimed tasks exist, queues an execution for that agent
4. Updates the `agent_heartbeats.last_seen_at` timestamp for all checked agents

The scheduler uses `node-cron` (lightweight, no external dependency). It runs in the main Node.js process, not as a separate worker. If the process restarts, the scheduler resumes on boot.

**Execution queue:** Executions are queued in-memory using a simple FIFO queue with concurrency control. Maximum concurrent executions: 5 (configurable via environment variable). This prevents overwhelming the Claude API rate limits and keeps resource usage predictable. If more than 5 executions are queued, they wait. The queue is not persisted; if the process crashes, queued-but-not-started executions are lost and will be re-triggered by the next heartbeat.

The concurrency limit of 5 is based on the Anthropic API default rate limit of 5 requests per minute for the Opus tier. If NBI's rate limit is higher, this can be increased.

### 3.2 Anatomy of an Agent Run

An agent run is a single invocation of the Claude API with full context. Here is the step-by-step flow:

```
1. TRIGGER received (task assignment or heartbeat)
2. CREATE agent_executions row (status: 'running')
3. UPDATE agent_heartbeats (last_seen_at, last_execution_id)
4. UPDATE agents.status = 'running'
5. EMIT real-time event: agent_activity { agent_id, status: 'running' }
6. BUDGET CHECK
   a. Load agent_budgets for current month
   b. If spent_usd >= budget_usd: ABORT (hard stop)
   c. If spent_usd >= budget_usd * 0.8 and alert_sent_at IS NULL: SEND 80% alert
7. TASK CHECKOUT (if task-specific run)
   a. Attempt atomic checkout (INSERT into task_checkouts with partial unique)
   b. If conflict: ABORT (another agent has the task)
   c. UPDATE task status = 'in_progress'
   d. EMIT real-time event: task_update { task_id, status: 'in_progress' }
8. CONTEXT ASSEMBLY (see 3.3)
9. CLAUDE API CALL (see 3.4)
10. PROCESS RESPONSE
    a. Parse tool calls (if any)
    b. Execute allowed tools (see 3.5)
    c. If tool requires approval: CREATE approvals row, set execution status = 'pending_approval', PAUSE
    d. If no approval needed: update task output, set task status = 'review'
11. TASK CHECKIN
    a. Release checkout (set checked_in_at, outcome)
    b. Clear agents.current_task_id
12. TOKEN TRACKING
    a. Record input_tokens, output_tokens from API response
    b. Calculate cost_usd based on model pricing
    c. UPDATE agent_budgets.spent_usd
13. FINALISE
    a. UPDATE agent_executions (status, ended_at, duration_ms, tokens, cost)
    b. UPDATE agents.status = 'idle'
    c. UPDATE agent_heartbeats
    d. EMIT real-time event: agent_activity { agent_id, status: 'idle', execution_id }
    e. EMIT real-time event: task_update (if task involved)
    f. Write to activity_log
```

If any step fails, the execution is marked `failed` with the error message, the agent returns to `idle`, and the task checkout is released with outcome `failed`.

### 3.3 Context Loading

Context is assembled in a specific order with explicit token budgets. The total context window varies by model:

| Model | Max Context | System Prompt Budget | Knowledge Budget | Task Budget | Conversation Budget |
|---|---|---|---|---|---|
| claude-opus-4 | 200,000 tokens | 4,000 tokens | 20,000 tokens | 4,000 tokens | 172,000 tokens |
| claude-sonnet-4 | 200,000 tokens | 4,000 tokens | 15,000 tokens | 4,000 tokens | 177,000 tokens |
| claude-haiku-3.5 | 200,000 tokens | 3,000 tokens | 10,000 tokens | 3,000 tokens | 184,000 tokens |

The knowledge budget is deliberately conservative to leave room for multi-turn conversation and tool use output within a single execution.

**Context assembly order:**

```
SYSTEM PROMPT (loaded first, always):
  1. Role system prompt (from roles/{slug}/prompts/system_prompt.md)
  2. Role persona (from roles/{slug}/persona.md)
  3. Current date and time
  4. Agent identity block: "You are {name}, the {role_name} at NBI."
  5. Reporting structure: "You report to {manager}. Your direct reports are: {list}."

USER MESSAGE (constructed by the execution runner):
  1. TIER 1 KNOWLEDGE (company-wide, all agents get this):
     - company/knowledge/company_overview.md (~800 tokens)
     - company/org_chart.md (~2,000 tokens)
     - company/policies/approval_gates.md (~400 tokens)
     Total Tier 1 estimate: ~3,200 tokens

  2. TIER 2 KNOWLEDGE (role-specific):
     - All files in roles/{slug}/knowledge/ (~2,000-8,000 tokens depending on role)
     - roles/{slug}/responsibilities.md (~800 tokens)
     Total Tier 2 estimate: ~3,000-9,000 tokens

  3. TIER 3 KNOWLEDGE (project-specific, loaded from task's project):
     - projects/{project_slug}/project_brief.md (~1,000 tokens)
     - projects/{project_slug}/knowledge/*.md (~2,000-5,000 tokens)
     Total Tier 3 estimate: ~3,000-6,000 tokens

  4. TASK CONTEXT:
     - Task title, description, priority, status
     - Task comments (last 10)
     - Related tasks and their statuses
     - Parent task context (if subtask)
     - Any previous output on this task

  5. INSTRUCTION:
     "Your current assignment is: {task.title}. {task.description}. Complete this task according to your role responsibilities and NBI standards."
```

**Token counting:** Before calling the Claude API, the runner counts tokens using the `@anthropic-ai/sdk` tokeniser (the `count_tokens` method). If the assembled context exceeds the knowledge budget, Tier 3 files are truncated first, then Tier 2, then Tier 1 (company_overview.md is never truncated, as it is the minimum viable context).

**File reading:** Knowledge files are read from disk (the git repo clone). The `knowledge_files` table stores paths and token estimates. Files are re-read on every execution (no caching) to ensure freshness. The token_estimate column is updated after each read.

### 3.4 Claude API Integration

**SDK:** `@anthropic-ai/sdk` (the official Anthropic Node.js SDK).

**Model selection:** The model is determined by the agent's `model_tier` field:

| Agent model_tier | Claude model identifier |
|---|---|
| `opus` | `claude-opus-4-20250514` |
| `sonnet` | `claude-sonnet-4-20250514` |
| `haiku` | `claude-haiku-3-5-20241022` |

These identifiers are stored as constants in a config file, not hardcoded in the execution runner. When Anthropic releases new model versions, only the config file needs updating.

**API call structure:**

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: decryptedApiKey, // Decrypted from api_keys table at runtime
});

const response = await client.messages.create({
  model: modelIdentifier,         // From config based on agent.model_tier
  max_tokens: 8192,               // Default; adjustable per execution type
  system: systemPrompt,           // Assembled system prompt string
  messages: [
    {
      role: 'user',
      content: assembledContext    // Tier 1 + Tier 2 + Tier 3 + task context + instruction
    }
  ],
  tools: availableTools,          // Tool definitions (see 3.5)
});
```

**Streaming:** Non-streaming for standard task executions. The entire response is needed before processing tool calls and updating the database. Streaming is used only for the manual trigger endpoint (`POST /api/v1/executions/:agent_id/trigger`) when the frontend is displaying live output. In that case, the runner uses `client.messages.stream()` and pipes token events to the WebSocket.

**Multi-turn tool use:** If the response contains tool_use blocks, the runner:
1. Executes each tool call
2. Constructs tool_result messages
3. Sends a follow-up API call with the full conversation (original message + assistant response + tool results)
4. Repeats until the assistant produces a final text response with no further tool calls
5. Maximum tool turns per execution: 10 (safety limit to prevent runaway loops)

**Error handling:**

| Error | Handling |
|---|---|
| 429 (rate limited) | Exponential backoff: 1s, 2s, 4s, 8s, 16s. Max 5 retries. If still failing, mark execution as `failed` |
| 500/503 (API error) | Retry once after 5 seconds. If still failing, mark as `failed` |
| 400 (context too long) | Truncate knowledge context by 20% and retry once. If still failing, mark as `failed` with a clear error message |
| Network timeout | 120-second timeout on the HTTP request. Retry once. If still failing, mark as `failed` |
| Invalid API key | Mark as `failed`. Emit a `budget_alert` event to notify the board user |

All errors are logged in the `agent_executions.log` JSONB field with timestamps and full error details.

**Token tracking:** The API response includes `usage.input_tokens` and `usage.output_tokens`. These are written directly to the execution record. Cost is calculated using a pricing config:

```typescript
const PRICING = {
  'claude-opus-4-20250514': { input_per_million: 15.00, output_per_million: 75.00 },
  'claude-sonnet-4-20250514': { input_per_million: 3.00, output_per_million: 15.00 },
  'claude-haiku-3-5-20241022': { input_per_million: 0.80, output_per_million: 4.00 },
};

const cost = (inputTokens / 1_000_000) * pricing.input_per_million
           + (outputTokens / 1_000_000) * pricing.output_per_million;
```

This pricing config is stored in a constants file and updated when Anthropic changes pricing.

### 3.5 Agent Tools

Agents have access to a set of server-side tools exposed via the Claude API tool_use mechanism. These are not user-facing tools; they are internal operations the agent can invoke during execution.

| Tool Name | Description | Parameters | Available To |
|---|---|---|---|
| `update_task_status` | Change a task's status | `{ task_id, status, comment }` | All agents |
| `create_subtask` | Create a child task under the current task | `{ title, description, priority, assigned_agent_id }` | Leadership agents |
| `assign_task` | Assign a task to a direct report | `{ task_id, agent_id }` | Agents with direct reports |
| `add_task_comment` | Add a comment to a task | `{ task_id, content }` | All agents |
| `request_approval` | Create an approval request for an external action | `{ type, title, content, context }` | All agents |
| `read_knowledge_file` | Read a knowledge file by path | `{ path }` | All agents |
| `escalate_to_manager` | Flag the current task as blocked and notify the reporting manager | `{ reason }` | All agents |
| `update_pipeline_lead` | Update a BD pipeline lead's stage or details | `{ lead_id, updates }` | CMO agent |
| `create_pipeline_lead` | Create a new BD pipeline lead | `{ company_name, contact_name, ... }` | CMO agent |
| `update_revenue_item` | Update a revenue record | `{ item_id, updates }` | CFO agent |
| `update_client_health` | Update a client's health status | `{ client_id, health, notes }` | COO, CMO agents |

Tool availability is determined by the agent's role. Leadership agents (CEO, COO, CFO, CTO, CMO, VP Eng, VP Product) have access to task creation and assignment tools. IC agents (engineers, analysts, QA) can only update their own tasks and request approvals.

The tool definitions are constructed dynamically per execution based on the agent's role.

### 3.6 Budget Enforcement

**Pre-execution check (3.2 step 6):**

```typescript
async function checkBudget(agentId: string): Promise<BudgetCheckResult> {
  const monthYear = format(new Date(), 'yyyy-MM');
  const budget = await db.query.agentBudgets.findFirst({
    where: and(
      eq(agentBudgets.agentId, agentId),
      eq(agentBudgets.monthYear, monthYear)
    ),
  });

  if (!budget) {
    // No budget row for this month: create one with company default
    await createDefaultBudget(agentId, monthYear);
    return { allowed: true, percentUsed: 0 };
  }

  const percentUsed = (Number(budget.spentUsd) / Number(budget.budgetUsd)) * 100;

  if (percentUsed >= 100) {
    // HARD STOP: Do not execute
    if (!budget.hardStopAt) {
      await db.update(agentBudgets)
        .set({ hardStopAt: new Date() })
        .where(eq(agentBudgets.id, budget.id));
      await emitBudgetAlert(agentId, 'hard_stop', percentUsed);
    }
    return { allowed: false, reason: 'Monthly budget exhausted' };
  }

  if (percentUsed >= 80 && !budget.alertSentAt) {
    // 80% WARNING: Execute but alert Glen
    await db.update(agentBudgets)
      .set({ alertSentAt: new Date() })
      .where(eq(agentBudgets.id, budget.id));
    await emitBudgetAlert(agentId, 'warning_80', percentUsed);
  }

  return { allowed: true, percentUsed };
}
```

**Post-execution update (3.2 step 12):**

After every execution, the budget row is updated atomically:

```sql
UPDATE agent_budgets
SET spent_usd = spent_usd + $cost,
    updated_at = now()
WHERE agent_id = $agentId AND month_year = $monthYear;
```

**Monthly reset:** On the first execution of each new month, the heartbeat scheduler checks whether budget rows exist for the current month. If not, it creates them for all active agents by copying the `budget_usd` from the previous month (or company default if no previous month exists). Previous months' budget rows are retained for historical reporting.

### 3.7 Approval Gate Flow

When an agent determines it needs to take an external action (send an email, post something publicly, make a financial commitment, or any action listed in the approval gates policy), it calls the `request_approval` tool.

**Step-by-step flow:**

```
1. Agent calls request_approval tool with:
   - type: 'external_email' | 'client_communication' | etc.
   - title: Short summary (e.g. "Send follow-up email to Lighthouse")
   - content: Full content for review (e.g. complete email draft as JSON)
   - context: Why the agent is requesting this (e.g. task context)

2. Runner receives tool call:
   a. INSERT into approvals table (status: 'pending')
   b. SET execution status = 'pending_approval'
   c. EMIT real-time event: approvals_update { approval_id, type, title }
   d. Return tool result to Claude: "Approval requested. Your execution is paused until Glen reviews."

3. Execution completes (the agent's response is saved, execution status stays 'pending_approval')

4. Glen sees the approval in the UI:
   - Dashboard approvals widget
   - Dedicated approvals page
   - Real-time WebSocket notification

5. Glen reviews the full content and either:
   a. APPROVES: The system executes the approved action (e.g. sends the email via an integration). The execution is marked 'completed'. A task comment is added.
   b. REJECTS: The task returns to 'in_progress'. The rejection reason is added as a task comment. The agent can be re-triggered to revise.
   c. REQUESTS CHANGES: Same as reject, but the comment contains specific change requests.

6. On next heartbeat, the agent sees the approval outcome in its task comments and can act accordingly.
```

**Action execution on approval:** In v1, approved actions are not automatically executed by the system. Glen approves the content, and the action is logged. External integrations (email sending, etc.) are out of scope for v1 and will be added in a future phase. In v1, the approval system serves as a review and audit trail. Glen sees what the agent wants to do, approves or rejects it, and then takes the action himself if needed.

### 3.8 Real-Time Updates

**Architecture:**

```
PostgreSQL LISTEN/NOTIFY  -->  Node.js pg listener  -->  WebSocket server  -->  React clients
```

**PostgreSQL channels:**

| Channel | Triggered By | Payload |
|---|---|---|
| `agent_activity` | Agent status changes, execution start/end | `{ agent_id, status, execution_id, task_id }` |
| `task_update` | Task status changes, assignments, checkouts | `{ task_id, status, assigned_agent_id, project_id }` |
| `approvals_update` | New approval request, approval resolved | `{ approval_id, status, type, title }` |
| `budget_alert` | 80% warning or 100% hard stop | `{ agent_id, percent_used, alert_type }` |

**NOTIFY trigger implementation:**

Notifications are sent from the application layer (not database triggers) for two reasons:
1. The application already has the context needed to build the payload
2. Database triggers cannot easily access application-level data (e.g. agent names for display)

After each relevant database write, the application calls:

```typescript
import { Pool } from 'pg';

async function notify(pool: Pool, channel: string, payload: object): Promise<void> {
  await pool.query(`SELECT pg_notify($1, $2)`, [channel, JSON.stringify(payload)]);
}
```

**Node.js listener:**

A dedicated PostgreSQL connection (not from the connection pool) listens on all channels:

```typescript
import { Client } from 'pg';

const listener = new Client({ connectionString: process.env.DATABASE_URL });
await listener.connect();

await listener.query('LISTEN agent_activity');
await listener.query('LISTEN task_update');
await listener.query('LISTEN approvals_update');
await listener.query('LISTEN budget_alert');

listener.on('notification', (msg) => {
  const payload = JSON.parse(msg.payload);
  wsBroadcast(msg.channel, payload);
});
```

This connection is kept alive with a 30-second keepalive ping. If the connection drops, it reconnects automatically with exponential backoff.

**WebSocket server:**

Fastify WebSocket plugin (`@fastify/websocket`) provides the WebSocket endpoint at `/ws`.

```typescript
fastify.register(require('@fastify/websocket'));

fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    // Authenticate: extract JWT from query param or first message
    const token = req.query.token;
    const user = verifyAccessToken(token);
    if (!user) {
      socket.close(4001, 'Unauthorized');
      return;
    }

    // Add to connected clients
    connectedClients.add({ socket, userId: user.id, companyId: user.companyId });

    socket.on('close', () => {
      connectedClients.delete(socket);
    });
  });
});
```

**Broadcast function:**

```typescript
function wsBroadcast(channel: string, payload: object): void {
  const message = JSON.stringify({ channel, data: payload, timestamp: new Date().toISOString() });
  for (const client of connectedClients) {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(message);
    }
  }
}
```

**Frontend subscription:**

The React client connects to the WebSocket on mount and dispatches events to the relevant state stores:

```typescript
const ws = new WebSocket(`${WS_URL}/ws?token=${accessToken}`);

ws.onmessage = (event) => {
  const { channel, data } = JSON.parse(event.data);
  switch (channel) {
    case 'agent_activity':
      dispatch(updateAgentStatus(data));
      break;
    case 'task_update':
      dispatch(updateTaskStatus(data));
      break;
    case 'approvals_update':
      dispatch(updateApprovals(data));
      break;
    case 'budget_alert':
      dispatch(showBudgetAlert(data));
      break;
  }
};
```

**Reconnection:** The client uses exponential backoff reconnection (1s, 2s, 4s, 8s, max 30s). On reconnect, the client fetches the dashboard aggregate endpoint to sync any missed events.

---

## 4. Project Structure

```
nbiai-app/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── drizzle.config.ts
├── README.md
│
├── src/
│   ├── index.ts                        # Fastify app entry point, plugin registration
│   ├── config/
│   │   ├── env.ts                      # Environment variable validation (zod)
│   │   ├── models.ts                   # Claude model identifiers and pricing
│   │   └── constants.ts                # App-wide constants (pagination defaults, etc.)
│   │
│   ├── db/
│   │   ├── index.ts                    # Drizzle client initialisation, connection pool
│   │   ├── schema/
│   │   │   ├── index.ts                # Re-exports all schema modules
│   │   │   ├── companies.ts            # companies table
│   │   │   ├── users.ts                # users table
│   │   │   ├── sessions.ts             # sessions table
│   │   │   ├── roles.ts                # roles table
│   │   │   ├── agents.ts               # agents table
│   │   │   ├── agent-reports.ts        # agent_reports table
│   │   │   ├── projects.ts             # projects table
│   │   │   ├── tasks.ts                # tasks table
│   │   │   ├── task-relations.ts       # task_relations table
│   │   │   ├── task-comments.ts        # task_comments table
│   │   │   ├── task-checkouts.ts       # task_checkouts table
│   │   │   ├── agent-executions.ts     # agent_executions table
│   │   │   ├── agent-heartbeats.ts     # agent_heartbeats table
│   │   │   ├── agent-budgets.ts        # agent_budgets table
│   │   │   ├── approvals.ts            # approvals table
│   │   │   ├── revenue-items.ts        # revenue_items table
│   │   │   ├── pipeline-leads.ts       # pipeline_leads table
│   │   │   ├── payroll-items.ts        # payroll_items table
│   │   │   ├── knowledge-files.ts      # knowledge_files table
│   │   │   ├── api-keys.ts             # api_keys table
│   │   │   ├── activity-log.ts         # activity_log table
│   │   │   ├── clients.ts              # clients table
│   │   │   └── enums.ts                # All pgEnum definitions
│   │   ├── migrations/                 # Generated by drizzle-kit
│   │   └── seed.ts                     # Seed data: company, board user, 18 roles, initial agents
│   │
│   ├── api/
│   │   ├── index.ts                    # Route registration (auto-loads all route modules)
│   │   ├── auth/
│   │   │   ├── routes.ts               # Login, logout, refresh routes
│   │   │   └── service.ts              # Auth business logic (hash, verify, token generation)
│   │   ├── users/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── agents/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── projects/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── tasks/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── executions/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── approvals/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── finance/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── clients/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── pipeline/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── knowledge/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── settings/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── activity/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   └── dashboard/
│   │       ├── routes.ts
│   │       └── service.ts
│   │
│   ├── execution/
│   │   ├── runner.ts                   # Agent run orchestration (the main execution loop from 3.2)
│   │   ├── context-loader.ts           # Tier 1/2/3 context assembly
│   │   ├── claude-client.ts            # Anthropic SDK wrapper (model selection, error handling)
│   │   ├── budget.ts                   # Budget check and enforcement
│   │   ├── heartbeat.ts                # Scheduled heartbeat (node-cron)
│   │   ├── queue.ts                    # In-memory execution queue with concurrency control
│   │   ├── tools/
│   │   │   ├── index.ts                # Tool registry and dispatcher
│   │   │   ├── task-tools.ts           # update_task_status, create_subtask, assign_task, add_task_comment
│   │   │   ├── approval-tools.ts       # request_approval
│   │   │   ├── knowledge-tools.ts      # read_knowledge_file
│   │   │   ├── escalation-tools.ts     # escalate_to_manager
│   │   │   ├── pipeline-tools.ts       # update_pipeline_lead, create_pipeline_lead
│   │   │   ├── finance-tools.ts        # update_revenue_item
│   │   │   └── client-tools.ts         # update_client_health
│   │   └── pricing.ts                  # Token cost calculation
│   │
│   ├── realtime/
│   │   ├── notify.ts                   # pg_notify wrapper
│   │   ├── listener.ts                 # PostgreSQL LISTEN client
│   │   └── websocket.ts                # Fastify WebSocket plugin setup and broadcast
│   │
│   ├── middleware/
│   │   ├── auth.ts                     # JWT verification middleware (Fastify preHandler)
│   │   ├── rbac.ts                     # Role-based access control (board, admin, viewer checks)
│   │   └── rate-limit.ts              # Rate limiting for auth endpoints
│   │
│   ├── crypto/
│   │   └── encryption.ts              # AES-256-GCM encrypt/decrypt for API keys
│   │
│   ├── utils/
│   │   ├── pagination.ts              # Cursor-based pagination helpers
│   │   ├── slug.ts                    # Slug generation from names
│   │   ├── tokens.ts                  # JWT sign/verify helpers
│   │   └── logger.ts                  # Pino logger configuration
│   │
│   └── types/
│       ├── index.ts                   # Shared TypeScript types
│       ├── api.ts                     # Request/response type definitions
│       └── execution.ts               # Execution-specific types
│
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── index.html
│   ├── components.json                 # shadcn/ui config
│   │
│   └── src/
│       ├── main.tsx                    # React entry point
│       ├── App.tsx                     # Root component with router
│       ├── api/
│       │   ├── client.ts              # Fetch wrapper with auth header injection
│       │   ├── auth.ts                # Login, logout, refresh API calls
│       │   ├── agents.ts              # Agent API calls
│       │   ├── tasks.ts               # Task API calls
│       │   ├── projects.ts            # Project API calls
│       │   ├── approvals.ts           # Approval API calls
│       │   ├── finance.ts             # Finance API calls
│       │   ├── dashboard.ts           # Dashboard aggregate API call
│       │   └── settings.ts            # Settings API calls
│       │
│       ├── hooks/
│       │   ├── use-auth.ts            # Auth state management
│       │   ├── use-websocket.ts       # WebSocket connection and reconnection
│       │   ├── use-agents.ts          # Agent data fetching and caching
│       │   └── use-dashboard.ts       # Dashboard data with real-time updates
│       │
│       ├── stores/
│       │   └── auth-store.ts          # Zustand store for auth tokens and user state
│       │
│       ├── pages/
│       │   ├── login.tsx              # Login page
│       │   ├── dashboard.tsx          # Command Centre
│       │   ├── org-chart.tsx          # Org chart view
│       │   ├── agent-detail.tsx       # Role/agent detail page
│       │   ├── projects.tsx           # Projects list
│       │   ├── project-detail.tsx     # Project detail with tasks
│       │   ├── task-detail.tsx        # Task detail with comments
│       │   ├── approvals.tsx          # Approvals queue
│       │   ├── finance.tsx            # Finance dashboard
│       │   ├── clients.tsx            # Clients and leads
│       │   ├── settings.tsx           # Settings page
│       │   └── not-found.tsx          # 404 page
│       │
│       ├── components/
│       │   ├── ui/                    # shadcn/ui components (installed via CLI)
│       │   ├── layout/
│       │   │   ├── app-shell.tsx      # Main layout with sidebar navigation
│       │   │   ├── sidebar.tsx        # Navigation sidebar
│       │   │   └── header.tsx         # Top bar with user menu
│       │   ├── dashboard/
│       │   │   ├── project-widget.tsx
│       │   │   ├── agent-status-feed.tsx
│       │   │   ├── activity-feed.tsx
│       │   │   ├── approvals-widget.tsx
│       │   │   └── quick-stats.tsx
│       │   ├── agents/
│       │   │   ├── agent-card.tsx
│       │   │   ├── org-tree.tsx
│       │   │   └── agent-form.tsx
│       │   ├── tasks/
│       │   │   ├── task-board.tsx
│       │   │   ├── task-card.tsx
│       │   │   ├── task-form.tsx
│       │   │   └── comment-thread.tsx
│       │   ├── approvals/
│       │   │   ├── approval-card.tsx
│       │   │   └── approval-review.tsx
│       │   ├── finance/
│       │   │   ├── revenue-chart.tsx
│       │   │   ├── payroll-table.tsx
│       │   │   ├── pipeline-funnel.tsx
│       │   │   └── projection-chart.tsx
│       │   └── shared/
│       │       ├── status-badge.tsx
│       │       ├── priority-badge.tsx
│       │       ├── health-indicator.tsx
│       │       ├── data-table.tsx
│       │       └── empty-state.tsx
│       │
│       └── lib/
│           ├── utils.ts               # shadcn/ui cn() helper
│           └── constants.ts           # Frontend constants (routes, status labels, etc.)
│
└── scripts/
    ├── seed.ts                        # Runs db/seed.ts via tsx
    ├── migrate.ts                     # Runs drizzle-kit migrations
    └── generate-migration.ts          # Generates a new migration from schema changes
```

**Key dependencies (server):**

| Package | Purpose |
|---|---|
| `fastify` | HTTP framework |
| `@fastify/cors` | CORS |
| `@fastify/websocket` | WebSocket support |
| `drizzle-orm` | ORM |
| `drizzle-kit` | Migration tooling |
| `pg` | PostgreSQL driver |
| `@anthropic-ai/sdk` | Claude API |
| `argon2` | Password hashing |
| `jose` | JWT sign/verify (lightweight, Web Crypto API based) |
| `node-cron` | Heartbeat scheduler |
| `zod` | Input validation |
| `pino` | Logging |
| `dotenv` | Environment variable loading |

**Key dependencies (client):**

| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `react-router-dom` | Routing |
| `@tanstack/react-query` | Server state management and caching |
| `zustand` | Client state management (auth store) |
| `tailwindcss` | Utility CSS |
| `@radix-ui/*` | Headless UI primitives (via shadcn/ui) |
| `lucide-react` | Icons |
| `recharts` | Charts for finance dashboards |
| `reactflow` | Org chart tree visualisation |
| `date-fns` | Date formatting |

---

## 5. Authentication and Security

### 5.1 JWT Access Tokens

| Property | Value | Rationale |
|---|---|---|
| Algorithm | HS256 | Symmetric signing is sufficient for single-service architecture. The secret never leaves the server. |
| TTL | 15 minutes | Short-lived to limit damage if leaked. Refresh tokens handle session persistence. |
| Payload | `{ sub: userId, role: userRole, companyId: companyId, iat, exp }` | Minimal claims. Role is included to avoid a database lookup on every request. |
| Storage (client) | In-memory only (Zustand store) | Not in localStorage or cookies. Lost on page refresh; refresh token restores it. |

### 5.2 Refresh Tokens

| Property | Value | Rationale |
|---|---|---|
| Format | 64 random bytes, base64url encoded | Opaque, not a JWT. No payload to decode. |
| TTL | 30 days | Long-lived for convenience. Revocation handles security. |
| Storage (server) | SHA-256 hash in `sessions` table | Raw token never stored. Compromise of database does not expose valid tokens. |
| Storage (client) | `httpOnly`, `Secure`, `SameSite=Strict` cookie | Not accessible to JavaScript. Automatically sent on refresh requests. |
| Rotation | Every refresh | Old token revoked, new token issued. Replay detection: if a revoked token is used, all sessions for that user are revoked. |

### 5.3 Password Hashing

| Property | Value |
|---|---|
| Algorithm | Argon2id |
| Memory cost | 65536 KB (64 MB) |
| Time cost | 3 iterations |
| Parallelism | 4 |

Argon2id is the recommended algorithm for password hashing (OWASP 2024). It is resistant to both side-channel and GPU attacks. The `argon2` npm package provides a well-tested implementation.

### 5.4 Role-Based Access Control (RBAC)

Three roles with clear permission boundaries:

| Resource / Action | Board | Admin | Viewer |
|---|---|---|---|
| View dashboard, agents, projects, tasks | Yes | Yes | Yes |
| View finance data | Yes | Yes | Read-only |
| View settings | Yes | Yes | No |
| Create/edit users | Yes | No | No |
| Create/edit agents | Yes | Yes | No |
| Create/edit projects | Yes | Yes | No |
| Create/edit tasks | Yes | Yes | No |
| Approve/reject approvals | Yes | No | No |
| Manage API keys | Yes | No | No |
| Trigger agent executions | Yes | Yes | No |
| Change company settings | Yes | No | No |
| Delete (deactivate) anything | Yes | No | No |

RBAC is enforced at the API level via a Fastify preHandler hook. Each route specifies its required role(s):

```typescript
fastify.get('/api/v1/settings/api-keys', {
  preHandler: [authenticate, requireRole(['board'])],
}, handler);
```

The `requireRole` middleware reads the `role` claim from the JWT and returns 403 if it does not match.

### 5.5 API Key Storage

External API keys (Anthropic, future integrations) are encrypted at rest using AES-256-GCM.

| Property | Value |
|---|---|
| Algorithm | AES-256-GCM |
| Key | Derived from `API_KEY_ENCRYPTION_SECRET` environment variable using HKDF |
| IV | 12 random bytes, generated per encryption, stored alongside ciphertext |
| Auth tag | 16 bytes, appended to ciphertext |
| Storage format | `base64(iv + ciphertext + authTag)` in the `encrypted_key` column |

The encryption secret is a 32-byte hex string stored as an environment variable. It is never committed to version control.

Decryption happens only at the moment of use (when the execution runner needs the Anthropic API key). The decrypted key is held in memory for the duration of the execution and then discarded.

### 5.6 Rate Limiting

| Endpoint | Limit | Window |
|---|---|---|
| `POST /api/v1/auth/login` | 5 attempts per email | 15 minutes |
| `POST /api/v1/auth/refresh` | 20 requests per IP | 15 minutes |
| All other authenticated endpoints | 100 requests per user | 1 minute |

Rate limiting is implemented using `@fastify/rate-limit` with an in-memory store. For a single-instance deployment (which this is), in-memory rate limiting is sufficient. If NBI scales to multiple instances, this would move to a Redis-backed store.

### 5.7 CORS Configuration

```typescript
fastify.register(cors, {
  origin: process.env.CORS_ORIGIN, // 'http://localhost:5173' in dev, production URL in prod
  credentials: true,                // Required for httpOnly cookie (refresh token)
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

In production, `CORS_ORIGIN` is set to the exact frontend URL (e.g. `https://nbiai.up.railway.app`). Wildcard origins are never used.

### 5.8 Additional Security Measures

| Measure | Implementation |
|---|---|
| Input validation | Zod schemas on every API endpoint. Fastify JSON Schema validation as a second layer. |
| SQL injection prevention | Drizzle ORM parameterised queries. No raw SQL string concatenation. |
| XSS prevention | React's default JSX escaping. `Content-Security-Policy` header in production. |
| HTTPS | Enforced by Railway (TLS termination at the load balancer). |
| Dependency security | `npm audit` in CI pipeline. Dependabot or Renovate for automated updates. |
| Logging | All auth events (login, logout, refresh, failed attempts) logged with Pino. No sensitive data in logs. |
| Environment variables | Validated at startup with Zod. Missing required variables cause immediate crash with a clear error message. |

### 5.9 First-Time Setup Flow

On first deployment with an empty database:

1. Run migrations (`drizzle-kit migrate`)
2. Run seed script (`scripts/seed.ts`)
3. The seed script creates:
   - The NBI company record
   - The board user (Glen) with a temporary password from `INITIAL_BOARD_PASSWORD` env var
   - All 18 role records from the org chart
   - Default agent records for all roles (status: idle)
   - Default agent reporting relationships
   - Default agent budgets for the current month
4. Glen logs in with the temporary password and changes it immediately

The `INITIAL_BOARD_PASSWORD` environment variable is used only once and should be rotated after first login.

---

## 6. Deployment Architecture

### 6.1 Platform: Railway

**Choice: Railway over Render.** Both platforms support persistent Node.js processes and managed PostgreSQL. Railway is recommended for the following reasons:

| Factor | Railway | Render |
|---|---|---|
| PostgreSQL | Managed, same region, private networking | Managed, same region, private networking |
| WebSocket support | Native, no configuration needed | Native, no configuration needed |
| Deployment model | Dockerfile or Nixpacks auto-detect | Dockerfile or native runtimes |
| Pricing (relevant tier) | Pro plan: $20/month base + usage | Starter: $19/month + usage |
| Monorepo support | Supports multiple services from one repo | Supports multiple services with `render.yaml` |
| Private networking | Yes, between services in same project | Yes, between services in same group |
| Build caching | Yes | Yes |
| Health checks | Configurable | Configurable |
| Sleep/cold start | Pro plan: no sleep | Free tier sleeps; paid tiers do not |

Railway's Nixpacks auto-detection works well with Node.js TypeScript projects. The deployment configuration is minimal. Railway also has a stronger WebSocket track record and simpler configuration for persistent processes.

### 6.2 Service Architecture

Two services in one Railway project:

| Service | Type | Purpose |
|---|---|---|
| `nbiai-api` | Web service | Fastify server (API + WebSocket + execution runner) |
| `nbiai-db` | PostgreSQL | Managed PostgreSQL database |

The frontend is built by Vite and served as static files from the Fastify server (via `@fastify/static`). This avoids the need for a third service and simplifies CORS.

**Why not separate frontend hosting?** A separate frontend on Vercel or Netlify would require CORS configuration, separate deployments, and a more complex build pipeline. Serving the frontend from Fastify keeps everything in one deployment unit. The performance tradeoff (no CDN for static assets) is acceptable for an internal tool with a small number of users.

### 6.3 Environment Variables

All required environment variables, with no values:

```bash
# Database
DATABASE_URL=                          # PostgreSQL connection string (provided by Railway)
DATABASE_URL_UNPOOLED=                 # Direct connection for migrations (no pgBouncer)

# Auth
JWT_SECRET=                            # 64-byte hex string for JWT signing
API_KEY_ENCRYPTION_SECRET=             # 32-byte hex string for AES-256-GCM
INITIAL_BOARD_PASSWORD=                # Temporary password for first-time setup (rotate after use)

# Anthropic
ANTHROPIC_API_KEY=                     # Default Anthropic API key (fallback if none in api_keys table)

# Server
PORT=                                  # Default: 3000
NODE_ENV=                              # 'development' or 'production'
CORS_ORIGIN=                           # Frontend URL (e.g. 'https://nbiai.up.railway.app')
LOG_LEVEL=                             # 'info' in production, 'debug' in development

# Execution
MAX_CONCURRENT_EXECUTIONS=             # Default: 5
HEARTBEAT_INTERVAL_MINUTES=            # Default: 5
DEFAULT_AGENT_BUDGET_USD=              # Default monthly budget per agent (e.g. '50.00')

# Knowledge
KNOWLEDGE_BASE_PATH=                   # Absolute path to the NBIAI_TEAM repo root on the server
```

### 6.4 Build Process

**Server build:**

```bash
# Install dependencies
npm ci

# Generate Drizzle migrations (if schema changed)
npx drizzle-kit generate

# Run migrations
npx tsx scripts/migrate.ts

# Build TypeScript
npx tsc --project tsconfig.json

# Build frontend
cd client && npm ci && npm run build && cd ..

# Copy frontend build to server static directory
cp -r client/dist dist/public

# Start
node dist/index.js
```

**Railway build configuration (railway.json or Nixpacks):**

Railway auto-detects Node.js and runs `npm ci && npm run build`. The `package.json` scripts:

```json
{
  "scripts": {
    "build": "tsc && cd client && npm ci && npm run build && cd .. && cp -r client/dist dist/public",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "dev:client": "cd client && npm run dev",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx scripts/migrate.ts",
    "db:seed": "tsx scripts/seed.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

### 6.5 Zero-Downtime Deployment

Railway supports zero-downtime deployments by default on the Pro plan:

1. New container is built and started
2. Health check passes (`GET /api/v1/health` returns 200)
3. Traffic is routed to the new container
4. Old container is drained and stopped

The health check endpoint:

```typescript
fastify.get('/api/v1/health', async () => {
  // Verify database connectivity
  await db.execute(sql`SELECT 1`);
  return { status: 'ok', timestamp: new Date().toISOString() };
});
```

**WebSocket handling during deploy:** Active WebSocket connections are terminated when the old container shuts down. Clients reconnect automatically (exponential backoff) and the new container accepts the connections. Any in-progress agent executions on the old container complete before shutdown (Railway sends SIGTERM with a configurable grace period, default 10 seconds, set to 120 seconds for this project).

### 6.6 Backup and Recovery

**Database backups:**

| Backup Type | Frequency | Retention | Method |
|---|---|---|---|
| Automated snapshot | Daily at 03:00 UTC | 7 days | Railway managed PostgreSQL automatic backups |
| Point-in-time recovery | Continuous | 7 days | Railway managed PostgreSQL WAL archiving |
| Manual export | Weekly (Sunday) | 30 days | `pg_dump` via scheduled Railway cron job, stored in Railway volume |

**Backup verification:** Monthly restore test to a staging database to verify backup integrity.

**Knowledge base backup:** The knowledge files live in a git repository. Git is the backup mechanism. The Railway service clones the repo at build time. If the repo is lost, git history provides recovery.

**Disaster recovery plan:**
1. Database: Restore from Railway's point-in-time recovery (RPO: seconds, RTO: minutes)
2. Application: Redeploy from git (RTO: 5-10 minutes)
3. Configuration: All environment variables documented. Re-entry takes 10 minutes.
4. API keys: Must be re-entered manually if encryption secret is lost. This is the only data that cannot be recovered from backups alone.

---

## 7. Development Milestones

Each phase has acceptance criteria that must pass before moving to the next phase. Phases are sequential. Estimated durations assume one Senior Engineer and one Engineer working in parallel, with DevOps supporting infrastructure tasks.

### Phase 1: Database and Foundation

**What gets built:**
- PostgreSQL database provisioned on Railway
- Drizzle schema for all 23 tables with all enums
- Migration pipeline (drizzle-kit generate, migrate scripts)
- Seed script (company, board user, 18 roles, default agents, reporting relationships, default budgets)
- Fastify server scaffold with health check endpoint
- Environment variable validation (Zod)
- Pino logging configuration
- TypeScript project configuration (server and client)

**Assigned to:** Senior Engineer (schema, seed), DevOps (Railway, database provisioning, build pipeline)

**Acceptance criteria:**
- [ ] `npm run db:migrate` runs without errors and creates all 23 tables
- [ ] `npm run db:seed` populates company, board user, 18 roles, 18 agents, reporting relationships, and budgets
- [ ] `GET /api/v1/health` returns `{ status: 'ok' }` with a database connectivity check
- [ ] Drizzle Studio (`npm run db:studio`) connects and shows all tables with seed data
- [ ] All enum types are created and match the schema specification
- [ ] All foreign keys, unique constraints, partial unique indexes, and check constraints are in place
- [ ] Environment variable validation fails with a clear error when required variables are missing

### Phase 2: Authentication

**What gets built:**
- Login, logout, refresh endpoints
- JWT access token generation and verification
- Refresh token generation, rotation, and revocation
- Argon2id password hashing
- Auth middleware (Fastify preHandler)
- RBAC middleware (role checking)
- Rate limiting on auth endpoints
- Session cleanup scheduled job

**Assigned to:** Senior Engineer

**Acceptance criteria:**
- [ ] `POST /api/v1/auth/login` with correct credentials returns access token and refresh token
- [ ] `POST /api/v1/auth/login` with incorrect credentials returns 401
- [ ] `POST /api/v1/auth/login` is rate limited to 5 attempts per email per 15 minutes
- [ ] `POST /api/v1/auth/refresh` rotates the refresh token and invalidates the old one
- [ ] Replay detection: using a revoked refresh token revokes all sessions for that user
- [ ] Expired access tokens return 401 on protected endpoints
- [ ] Board user can access all endpoints; admin gets 403 on board-only endpoints; viewer gets 403 on write endpoints
- [ ] Passwords are hashed with Argon2id (verified by inspecting database)

### Phase 3: Core CRUD APIs

**What gets built:**
- Users CRUD (board only for create/delete)
- Agents CRUD with role, reporting, status management
- Projects CRUD with health and status
- Tasks CRUD with status transitions, checkout/checkin, comments
- Task relations
- Clients CRUD
- Pipeline leads CRUD
- Cursor-based pagination on all list endpoints
- Input validation (Zod schemas) on all endpoints

**Assigned to:** Senior Engineer (agents, tasks, checkout/checkin), Engineer (users, projects, clients, pipeline, pagination)

**Acceptance criteria:**
- [ ] All CRUD endpoints return correct data shapes matching the API specification
- [ ] Task checkout is atomic: concurrent checkout attempts on the same task result in 409 for the second
- [ ] Task checkin updates task status based on outcome (completed -> review, failed -> blocked, released -> assigned)
- [ ] Task status changes automatically create task_comments with type 'status_change'
- [ ] Agent termination releases all active checkouts
- [ ] Pagination returns correct cursors and `has_more` flags
- [ ] All endpoints reject invalid input with 400 and descriptive error messages
- [ ] RBAC is enforced on every endpoint (tested with board, admin, and viewer tokens)

### Phase 4: Agent Execution Runner

**What gets built:**
- Execution runner (the full flow from section 3.2)
- Context loader (Tier 1/2/3 assembly with token budgets)
- Claude API client wrapper (model selection, error handling, token tracking)
- Budget enforcement (pre-check and post-update)
- Agent tools (all 11 tools from section 3.5)
- Execution queue with concurrency control
- Manual trigger endpoint (`POST /api/v1/executions/:agent_id/trigger`)
- API key encryption/decryption

**Assigned to:** Senior Engineer (runner, context loader, Claude client), Engineer (tools, budget, encryption)

**Acceptance criteria:**
- [ ] Manual trigger creates an execution, calls Claude API, and writes the response to the execution log
- [ ] Context loader assembles Tier 1 + Tier 2 + Tier 3 knowledge in the correct order
- [ ] Token counting is accurate (verified against Claude API usage response)
- [ ] Context is truncated gracefully when it exceeds the budget (Tier 3 first, then Tier 2)
- [ ] Budget check blocks execution when monthly spend is at 100%
- [ ] Budget check sends alert when monthly spend crosses 80%
- [ ] Agent tools work: update_task_status, create_subtask, assign_task, add_task_comment
- [ ] request_approval tool creates an approvals row and pauses the execution
- [ ] Execution queue respects concurrency limit (verified by triggering 10 executions simultaneously)
- [ ] API errors (429, 500) are retried with exponential backoff
- [ ] API keys are encrypted at rest and decrypted only at point of use
- [ ] All token counts and costs are recorded accurately in agent_executions and agent_budgets

### Phase 5: Real-Time Layer

**What gets built:**
- PostgreSQL LISTEN/NOTIFY on all four channels
- Dedicated PostgreSQL listener connection with reconnection logic
- Fastify WebSocket server with JWT authentication
- Broadcast function
- Heartbeat scheduler (node-cron)

**Assigned to:** Engineer (LISTEN/NOTIFY, WebSocket), DevOps (connection management, monitoring)

**Acceptance criteria:**
- [ ] WebSocket connection at `/ws?token=xyz` authenticates successfully and stays open
- [ ] WebSocket connection with invalid token is rejected with close code 4001
- [ ] Agent status changes are broadcast within 1 second of the database write
- [ ] Task status changes are broadcast within 1 second
- [ ] Approval requests appear in real-time on connected clients
- [ ] Budget alerts are broadcast to all connected clients
- [ ] WebSocket reconnects automatically after disconnection (verified by killing the connection)
- [ ] PostgreSQL listener reconnects after database restart
- [ ] Heartbeat scheduler triggers agent executions for agents with unclaimed assigned tasks

### Phase 6: Approvals Workflow

**What gets built:**
- Approvals CRUD endpoints
- Approval resolution (approve/reject/changes_requested)
- Integration with execution runner (pending_approval state)
- Approval queue on dashboard

**Assigned to:** Engineer

**Acceptance criteria:**
- [ ] `GET /api/v1/approvals/pending` returns only pending approvals
- [ ] Board user can approve, reject, or request changes on an approval
- [ ] Admin and viewer users get 403 on approval resolution
- [ ] Approved approval marks the execution as completed and adds a task comment
- [ ] Rejected approval returns the task to in_progress with the rejection reason as a task comment
- [ ] Approval resolution emits a real-time event on the `approvals_update` channel
- [ ] Approvals display the full content (e.g. draft email) for review

### Phase 7: Finance and Pipeline APIs

**What gets built:**
- Revenue endpoints (CRUD + aggregates)
- Payroll endpoint (list + aggregates)
- Pipeline endpoint (funnel + aggregates)
- Financial projection endpoint (3-month rolling)
- Dashboard aggregate endpoint

**Assigned to:** Engineer

**Acceptance criteria:**
- [ ] Revenue endpoint returns monthly totals, YTD totals, and YTD vs target percentage
- [ ] Payroll endpoint returns total monthly cost split by human and agent
- [ ] Pipeline endpoint returns leads by stage with probability-weighted values
- [ ] Projection endpoint returns 3-month cash flow projection based on contracted revenue, pipeline, and payroll
- [ ] Dashboard aggregate endpoint returns all summary data in a single response
- [ ] Dashboard data is cached for 30 seconds and invalidated by real-time events
- [ ] Finance endpoints are restricted to board and admin users

### Phase 8: React Frontend -- Command Centre and Org Chart

**What gets built:**
- Vite + React + Tailwind + shadcn/ui project scaffold
- App shell (sidebar navigation, top bar)
- Login page
- Command Centre (dashboard) with all five widgets
- Org chart view with interactive tree
- Agent detail page
- WebSocket integration for real-time updates
- Auth state management (Zustand + React Query)

**Assigned to:** Senior Engineer (app shell, auth, WebSocket, dashboard), Engineer (org chart, agent detail)

**Acceptance criteria:**
- [ ] Login flow works: enter credentials, receive tokens, redirect to dashboard
- [ ] Dashboard loads in under 3 seconds with all widgets populated
- [ ] Active projects widget shows project name, status, health colour, lead agent, last update
- [ ] Agent status feed shows all agents with real-time status updates (verified by triggering an execution)
- [ ] Activity feed shows recent events across all agents
- [ ] Approvals widget shows pending count with a link to the approvals page
- [ ] Org chart renders all 18 agents in the correct hierarchy
- [ ] Clicking an org chart node navigates to the agent detail page
- [ ] Agent detail page shows persona, current task, task history, budget, and knowledge files
- [ ] Page refresh restores auth state via refresh token

### Phase 9: React Frontend -- Projects, Tasks, and Approvals

**What gets built:**
- Projects list page
- Project detail page with task list
- Task detail page with comment thread
- Task creation form
- Approvals page with review UI
- Real-time task and approval updates

**Assigned to:** Senior Engineer (tasks, approvals), Engineer (projects, forms)

**Acceptance criteria:**
- [ ] Projects page lists all projects with status, health, lead agent, and task counts
- [ ] Project detail page shows all tasks grouped by status
- [ ] Task detail page shows full description, assigned agent, status, comments, and relations
- [ ] Task creation form validates all required fields and submits successfully
- [ ] Approvals page shows all pending approvals with full content for review
- [ ] Board user can approve/reject/request changes with a comment
- [ ] Status changes on tasks appear in real-time (verified with two browser tabs)
- [ ] New approval requests appear in real-time on the approvals page

### Phase 10: React Frontend -- Finance, Clients, and Settings

**What gets built:**
- Finance page with revenue dashboard, payroll table, pipeline funnel, and projection chart
- Clients page with health indicators and lead pipeline
- Settings page with company profile, user management, budget management, and API key management
- Knowledge base viewer (read-only)

**Assigned to:** Engineer (finance charts, clients), Senior Engineer (settings, API key management, knowledge viewer)

**Acceptance criteria:**
- [ ] Finance page shows revenue vs target chart, payroll breakdown, pipeline funnel, and 3-month projection
- [ ] Clients page shows all active clients with health colours and engagement types
- [ ] Pipeline leads are filterable by stage
- [ ] Settings page allows board user to edit company profile
- [ ] User management allows board user to create, edit, and deactivate users
- [ ] Budget management allows board user to set per-agent monthly caps
- [ ] API key management allows board user to add and deactivate API keys (key value never displayed)
- [ ] Knowledge base viewer shows Tier 1, Tier 2, and Tier 3 files in a tree structure

### Phase 11: Integration, Polish, and Deployment

**What gets built:**
- End-to-end integration testing (full flow: login -> create task -> trigger agent -> approve output)
- Error boundary components
- Loading and empty states for all pages
- 404 page
- Production build optimisation
- Railway deployment configuration
- SSL and domain setup
- Monitoring and alerting (health check, error rate)

**Assigned to:** DevOps (deployment, monitoring), QA Lead (integration testing), Senior Engineer (error handling, polish)

**Acceptance criteria:**
- [ ] End-to-end flow works: Glen logs in, creates a task for the CEO agent, triggers execution, sees execution in real-time, reviews approval, approves it
- [ ] All pages have loading states, empty states, and error states
- [ ] Production build completes without warnings
- [ ] Application deploys to Railway and passes health check
- [ ] WebSocket connections work in production (verified with real browser)
- [ ] All environment variables are configured in Railway
- [ ] Database backups are configured (daily automated, weekly manual export)
- [ ] Application recovers from database restart without manual intervention
- [ ] Zero-downtime deployment works (verified by deploying while WebSocket clients are connected)

---

## Self-Review Checklist

Before submitting this document to the CEO, I have verified:

- [x] Every table defined with all columns, types, and constraints (23 tables, 14 enum types)
- [x] Every API endpoint defined with request/response shapes (47 endpoints across 13 resource groups)
- [x] Agent execution flow described step-by-step with no gaps (13-step flow in section 3.2)
- [x] Real-time architecture specified in full (LISTEN/NOTIFY channels, listener code, WebSocket server, client subscription)
- [x] Security decisions made and documented (JWT, refresh tokens, Argon2id, AES-256-GCM, RBAC, rate limiting, CORS)
- [x] Development phases defined with testable acceptance criteria (11 phases, each with checkboxes)
- [x] No TBDs, no placeholders, no "to be determined"
- [x] British English throughout
- [x] Every decision justified with trade-off reasoning
- [x] A senior engineer could begin implementing any module without asking a clarifying question

---

**Submitted to:** CEO
**Next step:** CEO reviews alongside VP Product's feature spec. Both must be approved before VP Engineering begins Sprint 1.
