/**
 * Shared TypeScript types for the NBIAI Team App.
 *
 * Types are inferred from the Drizzle schema so they stay in sync with the
 * database automatically. Import these types across the application instead
 * of defining local interfaces that might drift from the schema.
 *
 * Naming convention:
 * - `Select*` types: what you get back from a SELECT query
 * - `Insert*` types: what you pass to an INSERT (id, created_at etc. optional)
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type {
  companies,
  users,
  sessions,
  roles,
  agents,
  agentReports,
  projects,
  tasks,
  taskRelations,
  taskComments,
  taskCheckouts,
  agentExecutions,
  agentHeartbeats,
  agentBudgets,
  approvals,
  revenueItems,
  pipelineLeads,
  payrollItems,
  knowledgeFiles,
  apiKeys,
  activityLog,
  clients,
} from '../db/schema.js'

// ---------------------------------------------------------------------------
// Database row types (inferred from Drizzle schema)
// ---------------------------------------------------------------------------

export type SelectCompany = InferSelectModel<typeof companies>
export type InsertCompany = InferInsertModel<typeof companies>

export type SelectUser = InferSelectModel<typeof users>
export type InsertUser = InferInsertModel<typeof users>

export type SelectSession = InferSelectModel<typeof sessions>
export type InsertSession = InferInsertModel<typeof sessions>

export type SelectRole = InferSelectModel<typeof roles>
export type InsertRole = InferInsertModel<typeof roles>

export type SelectAgent = InferSelectModel<typeof agents>
export type InsertAgent = InferInsertModel<typeof agents>

export type SelectAgentReport = InferSelectModel<typeof agentReports>
export type InsertAgentReport = InferInsertModel<typeof agentReports>

export type SelectProject = InferSelectModel<typeof projects>
export type InsertProject = InferInsertModel<typeof projects>

export type SelectTask = InferSelectModel<typeof tasks>
export type InsertTask = InferInsertModel<typeof tasks>

export type SelectTaskRelation = InferSelectModel<typeof taskRelations>
export type InsertTaskRelation = InferInsertModel<typeof taskRelations>

export type SelectTaskComment = InferSelectModel<typeof taskComments>
export type InsertTaskComment = InferInsertModel<typeof taskComments>

export type SelectTaskCheckout = InferSelectModel<typeof taskCheckouts>
export type InsertTaskCheckout = InferInsertModel<typeof taskCheckouts>

export type SelectAgentExecution = InferSelectModel<typeof agentExecutions>
export type InsertAgentExecution = InferInsertModel<typeof agentExecutions>

export type SelectAgentHeartbeat = InferSelectModel<typeof agentHeartbeats>
export type InsertAgentHeartbeat = InferInsertModel<typeof agentHeartbeats>

export type SelectAgentBudget = InferSelectModel<typeof agentBudgets>
export type InsertAgentBudget = InferInsertModel<typeof agentBudgets>

export type SelectApproval = InferSelectModel<typeof approvals>
export type InsertApproval = InferInsertModel<typeof approvals>

export type SelectRevenueItem = InferSelectModel<typeof revenueItems>
export type InsertRevenueItem = InferInsertModel<typeof revenueItems>

export type SelectPipelineLead = InferSelectModel<typeof pipelineLeads>
export type InsertPipelineLead = InferInsertModel<typeof pipelineLeads>

export type SelectPayrollItem = InferSelectModel<typeof payrollItems>
export type InsertPayrollItem = InferInsertModel<typeof payrollItems>

export type SelectKnowledgeFile = InferSelectModel<typeof knowledgeFiles>
export type InsertKnowledgeFile = InferInsertModel<typeof knowledgeFiles>

export type SelectApiKey = InferSelectModel<typeof apiKeys>
export type InsertApiKey = InferInsertModel<typeof apiKeys>

export type SelectActivityLog = InferSelectModel<typeof activityLog>
export type InsertActivityLog = InferInsertModel<typeof activityLog>

export type SelectClient = InferSelectModel<typeof clients>
export type InsertClient = InferInsertModel<typeof clients>

// ---------------------------------------------------------------------------
// Enum value types (extracted from schema for use in route handlers)
// ---------------------------------------------------------------------------

export type UserRole = SelectUser['role']
export type AgentStatus = SelectAgent['status']
export type ModelTier = SelectAgent['modelTier']
export type TaskStatus = SelectTask['status']
export type TaskPriority = SelectTask['priority']
export type TaskRelationType = SelectTaskRelation['relationType']
export type ApprovalStatus = SelectApproval['status']
export type ApprovalType = SelectApproval['approvalType']
export type ExecutionStatus = SelectAgentExecution['status']
export type RevenueType = SelectRevenueItem['revenueType']
export type PipelineStage = SelectPipelineLead['stage']
export type PayrollType = SelectPayrollItem['payrollType']
export type KnowledgeTier = SelectKnowledgeFile['tier']
export type ProjectStatus = SelectProject['status']
export type ProjectHealth = SelectProject['health']
export type CommentType = SelectTaskComment['commentType']

// ---------------------------------------------------------------------------
// API response envelope types
// ---------------------------------------------------------------------------

/**
 * Standard success response wrapper.
 * All API endpoints return data wrapped in this shape.
 */
export interface ApiResponse<T> {
  data: T
}

/**
 * Paginated list response using cursor-based pagination.
 *
 * Cursor-based pagination is used at the API layer (as specified by the CTO).
 * The frontend translates cursor position to page numbers where the UI
 * calls for numbered pagination controls.
 *
 * `cursor` is null on the last page (no more results).
 * `total` is an approximate count for display purposes ("142 results").
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    cursor: string | null
    hasMore: boolean
    total: number
  }
}

/**
 * Standard API error response shape.
 * Matches the error format defined in the technical architecture (Section 2).
 *
 * Error codes: VALIDATION_ERROR (400), UNAUTHORIZED (401), FORBIDDEN (403),
 * NOT_FOUND (404), CONFLICT (409), RATE_LIMITED (429), INTERNAL_ERROR (500).
 */
export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// ---------------------------------------------------------------------------
// JWT payload type
// ---------------------------------------------------------------------------

/**
 * The payload embedded in the JWT access token.
 * Keep this lean -- it is included in every authenticated request.
 */
export interface JwtPayload {
  sub: string        // user UUID
  companyId: string  // company UUID
  role: UserRole     // used for RBAC checks in route handlers
  iat?: number
  exp?: number
}

// ---------------------------------------------------------------------------
// Authenticated request extension
// ---------------------------------------------------------------------------

/**
 * The authenticated user object attached to every verified request.
 * Route handlers access this via `request.user` after the auth middleware runs.
 */
export interface AuthenticatedUser {
  id: string
  companyId: string
  role: UserRole
  email: string
  displayName: string
}
