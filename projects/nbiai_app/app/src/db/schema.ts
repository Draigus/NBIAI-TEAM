/**
 * Drizzle ORM schema for NBIAI Team App.
 *
 * Source of truth for the PostgreSQL database. All migrations are generated
 * from this file via `drizzle-kit generate`.
 *
 * CEO Review binding decisions applied:
 * - agent_status enum expanded to reconcile CTO schema and feature spec display states
 * - currency stored natively (amount + currency code) for revenue/payroll; GBP primary for display
 * - task project_id is NOT NULL (every task belongs to a project; a "General" project handles orphans)
 * - password hashing: Argon2id (not bcrypt)
 * - refresh tokens: hashed with SHA-256 before storage, raw token never persisted
 * - avatar_url added to users (CEO note: appears in top bar, sidebar, comment threads)
 */

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Enum definitions
// ---------------------------------------------------------------------------

/**
 * User permission levels within a company.
 * board: Glen (single board-level user per company)
 * admin: power users who can manage agents, tasks, and settings
 * viewer: read-only access
 */
export const userRoleEnum = pgEnum('user_role', ['board', 'admin', 'viewer'])

/**
 * Agent lifecycle states.
 * Reconciled per CEO review (Section "Agent status enum must be resolved"):
 * - CTO schema values retained: active, idle, running, paused, terminated
 * - Feature spec display states added: blocked, error, offline
 * The UI maps display states freely; the database stores the canonical stored state.
 */
export const agentStatusEnum = pgEnum('agent_status', [
  'active',
  'idle',
  'running',
  'blocked',
  'paused',
  'error',
  'offline',
  'terminated',
])

/**
 * Claude model tiers. Determines which API model is used for each agent.
 * opus: leadership roles
 * sonnet: IC roles (engineers, analysts, designers)
 * haiku: routine/lightweight tasks
 */
export const modelTierEnum = pgEnum('model_tier', ['opus', 'sonnet', 'haiku'])

/**
 * Task lifecycle states.
 * `queued` added for no-API architecture: tasks move to queued when assembled
 * into a JSON prompt file written to queue/inbox/ for Claude Desktop to pick up.
 * `review` aligns with the CTO schema (the feature spec uses `in_review`; CTO wins on DB naming).
 */
export const taskStatusEnum = pgEnum('task_status', [
  'backlog',
  'assigned',
  'queued',
  'in_progress',
  'blocked',
  'review',
  'done',
  'cancelled',
])

/** Task urgency/importance ranking. */
export const taskPriorityEnum = pgEnum('task_priority', [
  'critical',
  'high',
  'medium',
  'low',
])

/** Directional dependency between tasks. */
export const taskRelationTypeEnum = pgEnum('task_relation_type', [
  'blocking',
  'blocked_by',
  'related',
])

/** Status of a Glen approval request. */
export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'rejected',
  'changes_requested',
])

/**
 * Categories of agent action that require Glen's explicit approval before
 * the agent may proceed. These map to the non-negotiable approval gates
 * defined in CLAUDE.md.
 */
export const approvalTypeEnum = pgEnum('approval_type', [
  'external_email',
  'client_communication',
  'financial_commitment',
  'public_publish',
  'strategic_decision',
  'hiring',
  'other',
])

/** State of a single agent execution run. */
export const executionStatusEnum = pgEnum('execution_status', [
  'running',
  'completed',
  'failed',
  'cancelled',
  'pending_approval',
])

/**
 * Revenue item billing model.
 * CEO resolution: GBP is the primary display currency for revenue/payroll;
 * USD is used for agent costs. The currency column stores the native currency code.
 */
export const revenueTypeEnum = pgEnum('revenue_type', [
  'monthly_retainer',
  'one_off',
  'milestone',
])

/**
 * Sales pipeline stages for the Leads & Clients module.
 * Follows a standard B2B enterprise sales funnel.
 */
export const pipelineStageEnum = pgEnum('pipeline_stage', [
  'identification',
  'qualification',
  'outreach',
  'discovery',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
])

/** Payroll entry type: human headcount or AI agent cost. */
export const payrollTypeEnum = pgEnum('payroll_type', ['human', 'agent'])

/**
 * Three-tier knowledge architecture:
 * tier_1: company-wide knowledge, loaded by all agents
 * tier_2: role-specific knowledge, loaded per role
 * tier_3: project-specific knowledge, loaded per active assignment
 */
export const knowledgeTierEnum = pgEnum('knowledge_tier', [
  'tier_1',
  'tier_2',
  'tier_3',
])

/** Project lifecycle state. */
export const projectStatusEnum = pgEnum('project_status', [
  'planning',
  'active',
  'paused',
  'completed',
  'cancelled',
])

/** RAG-style health indicator for projects and clients. */
export const healthEnum = pgEnum('health', ['green', 'amber', 'red'])

/**
 * Task comment / activity record type.
 * Comments and automated status-change records share this table to provide
 * a single chronological thread per task.
 */
export const commentTypeEnum = pgEnum('comment_type', [
  'comment',
  'status_change',
  'assignment',
  'escalation',
  'system',
])

/**
 * Claude Desktop session lifecycle states.
 * pending: session created, not yet started
 * in_progress: Claude Desktop is actively running the session
 * completed: session finished successfully, results posted back
 * failed: session ended with an error; see failed/ queue folder
 */
export const claudeSessionStatusEnum = pgEnum('claude_session_status', [
  'pending',
  'in_progress',
  'completed',
  'failed',
])

/**
 * How a Claude Desktop session was triggered.
 * manual: Glen copied a prompt and ran it manually
 * scheduled: Windows Task Scheduler fired an automated session
 */
export const sessionTriggerEnum = pgEnum('session_trigger', [
  'manual',
  'scheduled',
])

// ---------------------------------------------------------------------------
// Table: companies
// ---------------------------------------------------------------------------

/**
 * Single-tenant for NBI. Modelled as a table (not config) so multi-tenancy
 * can be added later without a schema migration.
 */
export const companies = pgTable(
  'companies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    logoUrl: text('logo_url'),
    contactEmail: varchar('contact_email', { length: 255 }),
    website: varchar('website', { length: 255 }),
    /** Company-wide settings: timezone, currency display preference, etc. */
    settings: jsonb('settings').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('companies_slug_unique').on(t.slug)],
)

// ---------------------------------------------------------------------------
// Table: users
// ---------------------------------------------------------------------------

/**
 * Human users who log into the NBIAI Team App.
 * CEO note: avatar_url is required (appears in top bar, sidebar, comment threads).
 * Constraint: only one user per company may hold the `board` role.
 * Enforced at application level (partial unique indexes on enum values are
 * fragile across ORMs; application enforcement is more reliable).
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    email: varchar('email', { length: 255 }).notNull().unique(),
    /** bcrypt hash (12 rounds). */
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    /** Path or URL to the user's avatar image. Added per CEO review note. */
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').notNull().default('viewer'),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    index('users_company_id_idx').on(t.companyId),
  ],
)

// ---------------------------------------------------------------------------
// Table: sessions
// ---------------------------------------------------------------------------

/**
 * Stores refresh tokens. One user may have multiple active sessions
 * (e.g. laptop and phone).
 *
 * CEO review (binding): refresh token is hashed with SHA-256 before storage.
 * The raw token is issued to the client and never persisted. On token use,
 * the hash is recomputed and matched. Replay detection: if a used token hash
 * is presented again, all sessions for that user are revoked.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 hash of the raw refresh token. Raw token is never stored. */
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 45 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Set on logout or token rotation. Non-null means the session is invalid. */
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_refresh_token_hash_idx').on(t.refreshTokenHash),
    index('sessions_expires_at_idx').on(t.expiresAt),
  ],
)

// ---------------------------------------------------------------------------
// Table: roles
// ---------------------------------------------------------------------------

/**
 * Static configuration table. Seeded on first deploy with all defined roles
 * from the NBI org chart. Rows are not created via the UI in normal operation.
 *
 * A role is a job description. An agent is an instantiated role.
 */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    department: varchar('department', { length: 100 }).notNull(),
    defaultModelTier: modelTierEnum('default_model_tier').notNull(),
    /** Relative path to persona.md in the repo. */
    personaPath: text('persona_path'),
    /** Relative path to system_prompt.md in the repo. */
    systemPromptPath: text('system_prompt_path'),
    /** Relative path to responsibilities.md in the repo. */
    responsibilitiesPath: text('responsibilities_path'),
    isLeadership: boolean('is_leadership').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('roles_company_slug_unique').on(t.companyId, t.slug),
    index('roles_company_id_idx').on(t.companyId),
  ],
)

// ---------------------------------------------------------------------------
// Table: agents
// ---------------------------------------------------------------------------

/**
 * An agent is an instantiated role. A role may have zero or one active agent
 * at any time (enforced by a partial unique index: UNIQUE(role_id) WHERE
 * terminated_at IS NULL).
 *
 * Agent status enum is expanded per CEO review to cover both stored states
 * (active, idle, running, paused, terminated) and UI display states
 * (blocked, error, offline).
 */
export const agents = pgTable(
  'agents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    name: varchar('name', { length: 255 }).notNull(),
    modelTier: modelTierEnum('model_tier').notNull(),
    status: agentStatusEnum('status').notNull().default('idle'),
    /**
     * Denormalised FK to the task currently being worked on.
     * Kept for fast dashboard queries without a JOIN on agent_heartbeats.
     * Note: forward reference -- tasks table is defined later. Drizzle handles this.
     */
    currentTaskId: uuid('current_task_id'),
    /** Custom persona text, if different from the role default. */
    personaOverride: text('persona_override'),
    /** Agent-specific config: tool permissions, budget limits, context overrides. */
    config: jsonb('config').notNull().default(sql`'{}'::jsonb`),
    hiredAt: timestamp('hired_at', { withTimezone: true }).defaultNow().notNull(),
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    terminatedAt: timestamp('terminated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('agents_company_id_idx').on(t.companyId),
    index('agents_role_id_idx').on(t.roleId),
    index('agents_status_idx').on(t.status),
    index('agents_current_task_id_idx').on(t.currentTaskId),
    // Partial unique: only one active (non-terminated) agent per role
    uniqueIndex('agents_role_id_active_unique')
      .on(t.roleId)
      .where(sql`terminated_at IS NULL`),
  ],
)

// ---------------------------------------------------------------------------
// Table: agent_reports
// ---------------------------------------------------------------------------

/**
 * Defines the reporting hierarchy between agents.
 * One row per reporting relationship. An agent reports to exactly one other agent.
 * The CEO agent has no row (reports to Glen, a human user, not an agent).
 */
export const agentReports = pgTable(
  'agent_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** The subordinate agent. */
    agentId: uuid('agent_id')
      .notNull()
      .unique()
      .references(() => agents.id, { onDelete: 'cascade' }),
    /** The manager agent. */
    reportsToAgentId: uuid('reports_to_agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('agent_reports_agent_id_unique').on(t.agentId),
    index('agent_reports_reports_to_agent_id_idx').on(t.reportsToAgentId),
    // An agent cannot report to itself
    check('agent_reports_no_self_reference', sql`agent_id != reports_to_agent_id`),
  ],
)

// ---------------------------------------------------------------------------
// Table: projects
// ---------------------------------------------------------------------------

/**
 * A project groups related tasks. Every task must belong to a project.
 *
 * CEO binding decision: task project_id is NOT NULL. A "General" project
 * is created during seed to hold tasks that Glen creates without a project
 * context.
 */
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    status: projectStatusEnum('status').notNull().default('planning'),
    health: healthEnum('health').notNull().default('green'),
    leadAgentId: uuid('lead_agent_id').references(() => agents.id),
    briefPath: text('brief_path'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    targetCompletion: timestamp('target_completion', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('projects_company_slug_unique').on(t.companyId, t.slug),
    index('projects_company_id_idx').on(t.companyId),
    index('projects_status_idx').on(t.status),
    index('projects_lead_agent_id_idx').on(t.leadAgentId),
  ],
)

// ---------------------------------------------------------------------------
// Table: tasks
// ---------------------------------------------------------------------------

/**
 * A unit of work assigned to an agent. Every task must belong to a project
 * (project_id is NOT NULL per CEO binding decision).
 *
 * Tasks may be decomposed: a CEO agent breaks a goal into subtasks using
 * the parent_task_id self-reference.
 *
 * Constraint: exactly one of created_by_user_id or created_by_agent_id must
 * be non-null (a task is always created by someone). Enforced with a CHECK
 * constraint.
 */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    /** NOT NULL: every task must belong to a project. */
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    /** Self-reference for task decomposition. CEO breaks a goal into subtasks. */
    parentTaskId: uuid('parent_task_id'),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    status: taskStatusEnum('status').notNull().default('backlog'),
    priority: taskPriorityEnum('priority').notNull().default('medium'),
    assignedAgentId: uuid('assigned_agent_id').references(() => agents.id),
    /** Non-null if the task was created by a human via the UI. */
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    /** Non-null if the task was created by an agent (e.g. CEO decomposing a goal). */
    createdByAgentId: uuid('created_by_agent_id').references(() => agents.id),
    /** Text output/deliverable produced by the agent on completion. */
    output: text('output'),
    /** Path to an output file in the repo, if the deliverable is a file. */
    outputPath: text('output_path'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    estimatedMinutes: integer('estimated_minutes'),
    actualMinutes: integer('actual_minutes'),
    /**
     * No-API queue columns (added 2026-03-28):
     * When a task moves to 'queued' status, the app writes a JSON prompt file
     * to queue/inbox/ and records the timestamp here.
     */
    queuedAt: timestamp('queued_at', { withTimezone: true }),
    /** FK to the claude_desktop_session that executed (or is executing) this task. */
    sessionId: uuid('session_id').references(() => claudeDesktopSessions.id),
    /** Full assembled prompt ready to paste into Claude Desktop. Stored for audit. */
    sessionPrompt: text('session_prompt'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('tasks_company_id_idx').on(t.companyId),
    index('tasks_project_id_idx').on(t.projectId),
    index('tasks_assigned_agent_id_idx').on(t.assignedAgentId),
    index('tasks_status_idx').on(t.status),
    index('tasks_priority_idx').on(t.priority),
    index('tasks_parent_task_id_idx').on(t.parentTaskId),
    index('tasks_created_at_desc_idx').on(t.createdAt),
    // Exactly one of created_by_user_id or created_by_agent_id must be non-null
    check(
      'tasks_created_by_check',
      sql`(created_by_user_id IS NOT NULL AND created_by_agent_id IS NULL)
          OR (created_by_user_id IS NULL AND created_by_agent_id IS NOT NULL)`,
    ),
  ],
)

// Self-reference for tasks.parent_task_id — added after tasks table is defined
// (Drizzle resolves forward references at query time, not schema time)

// ---------------------------------------------------------------------------
// Table: task_relations
// ---------------------------------------------------------------------------

/**
 * Directed dependency graph between tasks.
 * Rows are inserted in pairs to maintain bidirectional queries: if task A
 * blocks task B, two rows are inserted: (A, B, 'blocking') and (B, A, 'blocked_by').
 */
export const taskRelations = pgTable(
  'task_relations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    relatedTaskId: uuid('related_task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    relationType: taskRelationTypeEnum('relation_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('task_relations_unique').on(t.taskId, t.relatedTaskId, t.relationType),
    index('task_relations_task_id_idx').on(t.taskId),
    index('task_relations_related_task_id_idx').on(t.relatedTaskId),
    check('task_relations_no_self_reference', sql`task_id != related_task_id`),
  ],
)

// ---------------------------------------------------------------------------
// Table: task_comments
// ---------------------------------------------------------------------------

/**
 * Combined comment thread and activity log for each task.
 * Status changes, assignments, escalations, and agent/human comments all
 * appear here in chronological order.
 *
 * Exactly one of author_user_id or author_agent_id should be non-null for
 * 'comment' type entries. System-generated entries (type: 'system',
 * 'status_change') may have both null.
 */
export const taskComments = pgTable(
  'task_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    authorUserId: uuid('author_user_id').references(() => users.id),
    authorAgentId: uuid('author_agent_id').references(() => agents.id),
    commentType: commentTypeEnum('comment_type').notNull().default('comment'),
    content: text('content').notNull(),
    /** For status_change type: { "from": "assigned", "to": "in_progress" } */
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('task_comments_task_id_created_at_idx').on(t.taskId, t.createdAt),
    index('task_comments_author_agent_id_idx').on(t.authorAgentId),
  ],
)

// ---------------------------------------------------------------------------
// Table: task_checkouts
// ---------------------------------------------------------------------------

/**
 * Atomic checkout mechanism. When an agent begins working on a task, it
 * creates a checkout row. The partial unique index enforces that only one
 * agent may have a task checked out at any time.
 *
 * A checkout is released (checked_in_at set) on completion, failure,
 * timeout, or manual admin release.
 */
export const taskCheckouts = pgTable(
  'task_checkouts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id),
    checkedOutAt: timestamp('checked_out_at', { withTimezone: true }).defaultNow().notNull(),
    /** NULL means the task is currently checked out. Non-null means it has been returned. */
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    /** Outcome string on check-in: 'completed' | 'failed' | 'released' | 'timeout' */
    outcome: varchar('outcome', { length: 50 }),
  },
  (t) => [
    // Only one active checkout (where not yet checked in) per task
    uniqueIndex('task_checkouts_active_unique')
      .on(t.taskId)
      .where(sql`checked_in_at IS NULL`),
    index('task_checkouts_agent_id_idx').on(t.agentId),
    index('task_checkouts_checked_out_at_idx').on(t.checkedOutAt),
  ],
)

// ---------------------------------------------------------------------------
// Table: agent_executions
// ---------------------------------------------------------------------------

/**
 * Primary audit trail for all agent activity. One record per agent Claude Desktop session.
 *
 * No-API architecture (2026-03-28): token counts and USD cost columns removed.
 * Execution runs through Claude Desktop on Glen's Max subscription (flat £180/month).
 * Token tracking is done via manual cost logs and the claude_desktop_sessions table.
 */
export const agentExecutions = pgTable(
  'agent_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id),
    /** NULL if the execution spans multiple tasks (e.g. a batch session). */
    taskId: uuid('task_id').references(() => tasks.id),
    status: executionStatusEnum('status').notNull().default('running'),
    /** Claude model identifier used (e.g. "claude-opus-4-5"). Recorded for audit. */
    modelUsed: varchar('model_used', { length: 50 }).notNull(),
    /** Tokens used by the system prompt alone, for context budget analysis. */
    systemPromptTokens: integer('system_prompt_tokens'),
    /** Tokens used by the assembled knowledge context (Tier 1 + 2 + 3). */
    contextTokens: integer('context_tokens'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    /** Wall-clock duration in milliseconds, computed on completion. */
    durationMs: integer('duration_ms'),
    /** Error detail if status is 'failed'. */
    errorMessage: text('error_message'),
    /** Structured execution log: steps, tool calls, decisions, context loads. */
    log: jsonb('log').notNull().default(sql`'[]'::jsonb`),
    /** Array of tool names invoked during this execution. */
    toolsUsed: jsonb('tools_used'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('agent_executions_agent_id_started_at_idx').on(t.agentId, t.startedAt),
    index('agent_executions_task_id_idx').on(t.taskId),
    index('agent_executions_status_idx').on(t.status),
    index('agent_executions_started_at_desc_idx').on(t.startedAt),
  ],
)

// ---------------------------------------------------------------------------
// Table: claude_desktop_sessions
// ---------------------------------------------------------------------------

/**
 * Records each Claude Desktop session used to execute tasks.
 *
 * No-API architecture: Claude Desktop (on Glen's Max plan) is the execution
 * engine. Each session corresponds to one or more tasks processed in a single
 * Claude Desktop run. The app writes task files to queue/inbox/ and the session
 * records the outcome after Glen pastes results back (or Task Scheduler fires
 * an automated session).
 */
export const claudeDesktopSessions = pgTable(
  'claude_desktop_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** Human-readable session label, e.g. "CEO morning review 2026-03-28". */
    label: varchar('label', { length: 200 }).notNull(),
    /** The primary agent that ran in this session. Nullable for multi-agent sessions. */
    agentId: uuid('agent_id').references(() => agents.id),
    status: claudeSessionStatusEnum('status').notNull().default('pending'),
    trigger: sessionTriggerEnum('trigger').notNull(),
    /** For scheduled sessions: when the Task Scheduler was set to fire. */
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /** Free-text notes: Glen can annotate what the session produced. */
    notes: text('notes'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('claude_desktop_sessions_agent_id_idx').on(t.agentId),
    index('claude_desktop_sessions_status_idx').on(t.status),
    index('claude_desktop_sessions_created_at_desc_idx').on(t.createdAt),
  ],
)

// ---------------------------------------------------------------------------
// Table: cost_logs
// ---------------------------------------------------------------------------

/**
 * Manually logged session costs for the Finance module.
 *
 * No-API architecture: there is no per-token billing. Glen pays £180/month
 * flat for Claude Max. This table lets Glen optionally annotate sessions
 * with estimated token usage (as a % of the monthly plan cap) for capacity
 * planning. Dollar cost fields retained for future flexibility if pricing
 * model changes.
 */
export const costLogs = pgTable(
  'cost_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => claudeDesktopSessions.id),
    agentId: uuid('agent_id').references(() => agents.id),
    /** First day of the month this cost belongs to (e.g. 2026-03-01). */
    periodMonth: date('period_month').notNull(),
    /**
     * Estimated cost in USD for the session.
     * For Max plan: this is Glen's manual estimate based on subscription fraction.
     * (£180/month / ~30 sessions = ~£6 per session as a rough guide)
     */
    costUsd: numeric('cost_usd', { precision: 10, scale: 2 }).notNull(),
    notes: varchar('notes', { length: 500 }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('cost_logs_session_id_idx').on(t.sessionId),
    index('cost_logs_period_month_idx').on(t.periodMonth),
    index('cost_logs_agent_id_idx').on(t.agentId),
  ],
)

// ---------------------------------------------------------------------------
// Table: approvals
// ---------------------------------------------------------------------------

/**
 * Approval queue for agent actions that require Glen's explicit authorisation
 * before proceeding. Maps directly to the approval gates defined in CLAUDE.md.
 *
 * When an approval is requested, the associated execution is paused
 * (status: 'pending_approval'). On Glen's decision, the execution resumes
 * or is cancelled.
 */
export const approvals = pgTable(
  'approvals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    approvalType: approvalTypeEnum('approval_type').notNull(),
    /** Short summary for the approval queue list view. */
    title: varchar('title', { length: 500 }).notNull(),
    requestedByAgentId: uuid('requested_by_agent_id')
      .notNull()
      .references(() => agents.id),
    /** The execution that triggered this approval request. */
    executionId: uuid('execution_id').references(() => agentExecutions.id),
    /** The task context in which the action was requested. */
    taskId: uuid('task_id').references(() => tasks.id),
    /** Full content for Glen to review (draft email body, recipients, financial details, etc.). */
    content: jsonb('content').notNull(),
    /** Agent's explanation of why this action is needed. */
    context: text('context'),
    status: approvalStatusEnum('status').notNull().default('pending'),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id),
    reviewerComment: text('reviewer_comment'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('approvals_company_id_status_idx').on(t.companyId, t.status),
    index('approvals_requested_by_agent_id_idx').on(t.requestedByAgentId),
    index('approvals_status_created_at_idx').on(t.status, t.createdAt),
    index('approvals_task_id_idx').on(t.taskId),
  ],
)

// ---------------------------------------------------------------------------
// Table: revenue_items
// ---------------------------------------------------------------------------

/**
 * Revenue line items for the Finance module.
 *
 * CEO binding decision on currency:
 * - GBP is the primary display currency for revenue and payroll in the UI.
 * - The database stores amounts in their native currency with the currency
 *   code alongside. The frontend converts for display using the stored currency.
 * - NBI's business is primarily GBP, so most rows will have currency = 'GBP'.
 *
 * The amount column is named `amount` and the `currency` column holds the
 * ISO 4217 code (e.g. 'GBP', 'USD').
 */
export const revenueItems = pgTable(
  'revenue_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    clientName: varchar('client_name', { length: 255 }).notNull(),
    description: text('description'),
    revenueType: revenueTypeEnum('revenue_type').notNull(),
    /** Per-period amount (monthly for retainers, total for one-off/milestone). */
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    /** ISO 4217 currency code. GBP is the primary display currency per CEO decision. */
    currency: varchar('currency', { length: 3 }).notNull().default('GBP'),
    startDate: date('start_date').notNull(),
    /** Null for ongoing retainers. */
    endDate: date('end_date'),
    isActive: boolean('is_active').notNull().default(true),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdByAgentId: uuid('created_by_agent_id').references(() => agents.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('revenue_items_company_id_idx').on(t.companyId),
    index('revenue_items_is_active_idx').on(t.isActive),
    index('revenue_items_client_name_idx').on(t.clientName),
  ],
)

// ---------------------------------------------------------------------------
// Table: pipeline_leads
// ---------------------------------------------------------------------------

/**
 * Sales pipeline records for the Leads & Clients module.
 * Managed primarily by the CMO agent (owner_agent_id).
 */
export const pipelineLeads = pgTable(
  'pipeline_leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    contactName: varchar('contact_name', { length: 255 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactTitle: varchar('contact_title', { length: 255 }),
    stage: pipelineStageEnum('stage').notNull().default('identification'),
    /** Win probability, 0-100. */
    probability: integer('probability').notNull().default(0),
    /** Expected contract value in the lead's native currency. */
    expectedValue: numeric('expected_value', { precision: 12, scale: 2 }),
    /** ISO 4217 currency code for expected_value. */
    expectedValueCurrency: varchar('expected_value_currency', { length: 3 }).default('GBP'),
    expectedCloseDate: date('expected_close_date'),
    source: varchar('source', { length: 255 }),
    /** Usually the CMO agent. */
    ownerAgentId: uuid('owner_agent_id').references(() => agents.id),
    lastContactDate: date('last_contact_date'),
    nextAction: text('next_action'),
    nextActionDate: date('next_action_date'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('pipeline_leads_company_id_stage_idx').on(t.companyId, t.stage),
    index('pipeline_leads_stage_idx').on(t.stage),
    index('pipeline_leads_expected_close_date_idx').on(t.expectedCloseDate),
    index('pipeline_leads_next_action_date_idx').on(t.nextActionDate),
  ],
)

// ---------------------------------------------------------------------------
// Table: payroll_items
// ---------------------------------------------------------------------------

/**
 * Cost base records: human headcount and agent API costs.
 *
 * CEO binding decision on currency:
 * - GBP is the primary display currency for payroll in the UI.
 * - USD is used for agent API costs.
 * - The database stores amounts in native currency with the currency code.
 *
 * Human rows typically have currency = 'GBP'.
 * Agent rows typically have currency = 'USD' (Anthropic billing is in USD).
 */
export const payrollItems = pgTable(
  'payroll_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    payrollType: payrollTypeEnum('payroll_type').notNull(),
    roleDescription: varchar('role_description', { length: 255 }),
    /** Per-month cost in the native currency. */
    monthlyCost: numeric('monthly_cost', { precision: 10, scale: 2 }).notNull(),
    /** Annual cost. May differ from 12x monthly for humans (bonuses, etc.). */
    annualCost: numeric('annual_cost', { precision: 12, scale: 2 }).notNull(),
    /** ISO 4217 currency code. GBP for humans, USD for agent API costs. */
    currency: varchar('currency', { length: 3 }).notNull().default('GBP'),
    isActive: boolean('is_active').notNull().default(true),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    /** Links to the agent record if payroll_type is 'agent'. */
    agentId: uuid('agent_id').references(() => agents.id),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('payroll_items_company_id_idx').on(t.companyId),
    index('payroll_items_is_active_idx').on(t.isActive),
    index('payroll_items_payroll_type_idx').on(t.payrollType),
  ],
)

// ---------------------------------------------------------------------------
// Table: knowledge_files
// ---------------------------------------------------------------------------

/**
 * Registry of knowledge files in the three-tier architecture.
 * File content lives on disk (in the git repo). This table stores metadata
 * and paths so the agent execution layer can assemble context efficiently.
 *
 * The execution layer loads: Tier 1 (all agents) + Tier 2 (their role) +
 * Tier 3 (their assigned project). Token estimates guide context budget planning.
 */
export const knowledgeFiles = pgTable(
  'knowledge_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    tier: knowledgeTierEnum('tier').notNull(),
    /** Non-null for Tier 2 files. Links the file to its role. */
    roleId: uuid('role_id').references(() => roles.id),
    /** Non-null for Tier 3 files. Links the file to its project. */
    projectId: uuid('project_id').references(() => projects.id),
    /** Relative path from the repo root to the knowledge file. */
    contentPath: text('content_path').notNull(),
    description: text('description'),
    /** Estimated token count, used by the execution layer for budget planning. */
    tokenEstimate: integer('token_estimate'),
    /** Last time this file's content was read from disk and token count updated. */
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('knowledge_files_company_id_tier_idx').on(t.companyId, t.tier),
    index('knowledge_files_role_id_idx').on(t.roleId),
    index('knowledge_files_project_id_idx').on(t.projectId),
  ],
)

// api_keys table REMOVED (2026-03-28).
// No Anthropic API key is required. The NBIAI App makes zero calls to the
// Anthropic API. Claude Desktop on Glen's Max plan is the execution engine.
// See: company/knowledge/strategic_decisions.md -- "NBIAI App: zero Anthropic API"

// ---------------------------------------------------------------------------
// Table: activity_log
// ---------------------------------------------------------------------------

/**
 * Global activity feed for the dashboard Command Centre.
 * Denormalised for fast reads. Written by application code whenever a
 * significant event occurs (task completed, approval requested, agent started,
 * budget alert triggered, etc.).
 *
 * Retention: rows older than 90 days are archived or deleted (configurable
 * in company settings). A weekly cleanup job handles this. Glen should be
 * aware that activity older than 90 days will not appear in the app without
 * a separate archive viewer (out of scope for v1).
 */
export const activityLog = pgTable(
  'activity_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    /** Machine-readable event category, e.g. 'task_completed', 'approval_requested'. */
    eventType: varchar('event_type', { length: 100 }).notNull(),
    agentId: uuid('agent_id').references(() => agents.id),
    userId: uuid('user_id').references(() => users.id),
    taskId: uuid('task_id').references(() => tasks.id),
    projectId: uuid('project_id').references(() => projects.id),
    /** Human-readable event summary for display in the activity feed. */
    title: varchar('title', { length: 500 }).notNull(),
    /** Event-specific structured data (before/after values, affected IDs, etc.). */
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('activity_log_company_id_created_at_idx').on(t.companyId, t.createdAt),
    index('activity_log_agent_id_created_at_idx').on(t.agentId, t.createdAt),
    index('activity_log_event_type_idx').on(t.eventType),
    index('activity_log_project_id_idx').on(t.projectId),
  ],
)

// ---------------------------------------------------------------------------
// Table: clients
// ---------------------------------------------------------------------------

/**
 * Active client records. A pipeline lead moves here when it reaches
 * 'closed_won'. Tracks engagement health, key contacts, and upcoming
 * milestones for the Leads & Clients module.
 */
export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    health: healthEnum('health').notNull().default('green'),
    /** e.g. "Monthly retainer", "Project-based" */
    engagementType: varchar('engagement_type', { length: 255 }),
    /** Glen's role with this client, e.g. "Fractional CMO", "Strategic Advisor" */
    glenRole: varchar('glen_role', { length: 255 }),
    primaryContactName: varchar('primary_contact_name', { length: 255 }),
    primaryContactEmail: varchar('primary_contact_email', { length: 255 }),
    nextMilestone: text('next_milestone'),
    nextMilestoneDate: date('next_milestone_date'),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    startedAt: date('started_at'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('clients_company_id_is_active_idx').on(t.companyId, t.isActive),
    index('clients_health_idx').on(t.health),
    index('clients_next_milestone_date_idx').on(t.nextMilestoneDate),
  ],
)
