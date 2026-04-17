/**
 * DashboardPage — Command Centre
 *
 * Data fetching uses react-query with 30-second refetch intervals.
 *
 * WebSocket integration point:
 * TODO(ws): Replace the agentStatus polling with a WebSocket subscription.
 * When the WS connection is established, call:
 *   queryClient.setQueryData(['agentStatus'], updatedData)
 * to push live updates into the cache. Once WS is live, set refetchInterval
 * to Infinity on the agentStatus query. Flash animation on status change
 * should track previous statuses in a ref and apply a brief CSS highlight.
 */

import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CheckSquare2,
  Bot,
  Bell,
  FolderOpen,
  ShieldCheck,
  Zap,
  Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { dashboard, approvals } from '@/lib/api'
import { formatDate, formatRelativeTime, getModelTierBadge, cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

interface DashboardSummary {
  openTasksCount: number
  activeAgentsCount: number
  pendingApprovalsCount: number
  projectsCount: number
  queuedCount: number
  inProgressCount: number
  reviewCount: number
}

interface AgentStatusRow {
  id: string
  name: string
  roleName: string
  roleSlug: string
  modelTier: string
  status: string
  currentTaskTitle?: string | null
}

interface ActivityEntry {
  id: string
  actorName: string
  actorType: 'agent' | 'user'
  action: string
  createdAt: string
}

interface ApprovalItem {
  id: string
  approvalType: string
  requestingAgentName: string
  summary: string
  createdAt: string
}

// API wrappers cast to typed shapes
function fetchSummary() {
  return dashboard.summary() as Promise<{ data: DashboardSummary }>
}
function fetchAgentStatus() {
  return dashboard.agentStatus() as Promise<{ data: AgentStatusRow[] }>
}
function fetchActivity() {
  return dashboard.activity() as Promise<{ data: ActivityEntry[] }>
}
function fetchPendingApprovals() {
  return approvals.pending() as Promise<{ data: ApprovalItem[] }>
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { label: string; text: string; bg: string; border: string; pulse?: boolean }
> = {
  active: {
    label: 'ACTIVE',
    text: 'text-status-green',
    bg: 'bg-status-green/10',
    border: 'border-status-green/30',
  },
  running: {
    label: 'RUNNING',
    text: 'text-status-green',
    bg: 'bg-status-green/10',
    border: 'border-status-green/30',
    pulse: true,
  },
  idle: {
    label: 'IDLE',
    text: 'text-status-grey',
    bg: 'bg-status-grey/10',
    border: 'border-status-grey/30',
  },
  blocked: {
    label: 'BLOCKED',
    text: 'text-status-red',
    bg: 'bg-status-red/10',
    border: 'border-status-red/30',
  },
  paused: {
    label: 'PAUSED',
    text: 'text-status-amber',
    bg: 'bg-status-amber/10',
    border: 'border-status-amber/30',
  },
  terminated: {
    label: 'TERMINATED',
    text: 'text-status-red',
    bg: 'bg-status-red/10',
    border: 'border-status-red/30',
  },
}

function AgentStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border shrink-0',
        config.text,
        config.bg,
        config.border,
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          config.text.replace('text-', 'bg-'),
          config.pulse && 'animate-pulse',
        )}
      />
      {config.label}
    </span>
  )
}

// Keys match the server's approval_type enum exactly
// (see src/db/schema.ts approvalTypeEnum).
const APPROVAL_TYPE_CONFIG: Record<
  string,
  { label: string; text: string; bg: string; border: string }
> = {
  external_email: {
    label: 'EMAIL',
    text: 'text-status-blue',
    bg: 'bg-status-blue/10',
    border: 'border-status-blue/30',
  },
  client_communication: {
    label: 'CLIENT',
    text: 'text-status-blue',
    bg: 'bg-status-blue/10',
    border: 'border-status-blue/30',
  },
  financial_commitment: {
    label: 'FINANCIAL',
    text: 'text-status-amber',
    bg: 'bg-status-amber/10',
    border: 'border-status-amber/30',
  },
  public_publish: {
    label: 'PUBLISH',
    text: 'text-status-amber',
    bg: 'bg-status-amber/10',
    border: 'border-status-amber/30',
  },
  strategic_decision: {
    label: 'STRATEGIC',
    text: 'text-status-red',
    bg: 'bg-status-red/10',
    border: 'border-status-red/30',
  },
  hiring: {
    label: 'HIRING',
    text: 'text-status-red',
    bg: 'bg-status-red/10',
    border: 'border-status-red/30',
  },
  other: {
    label: 'ACTION',
    text: 'text-status-grey',
    bg: 'bg-status-grey/10',
    border: 'border-status-grey/30',
  },
}

function ApprovalTypeBadge({ type }: { type: string }) {
  const config = APPROVAL_TYPE_CONFIG[type] ?? APPROVAL_TYPE_CONFIG.other
  return (
    <span
      className={cn(
        'flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border shrink-0',
        config.text,
        config.bg,
        config.border,
      )}
    >
      {config.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Model tier badge (inline)
// ---------------------------------------------------------------------------

function ModelTierBadge({ tier }: { tier: string }) {
  const { label, className } = getModelTierBadge(tier)
  return <span className={className}>{label}</span>
}

// ---------------------------------------------------------------------------
// Agent avatar initials
// ---------------------------------------------------------------------------

function AgentAvatarSmall({ roleSlug }: { roleSlug: string }) {
  const initials = roleSlug
    .split('_')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')

  return (
    <div className="w-7 h-7 rounded-full bg-accent-muted flex items-center justify-center text-accent text-[11px] font-semibold shrink-0">
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: number | null | undefined
  icon: React.ReactNode
  isLoading: boolean
  hasError: boolean
  isAlert?: boolean
}

function StatCard({ label, value, icon, isLoading, hasError, isAlert }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="bg-surface border border-subtle rounded-lg p-4 flex flex-col gap-1">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-8 w-10 rounded mt-2" />
      </div>
    )
  }

  const showAlert = isAlert && typeof value === 'number' && value > 0

  return (
    <div
      className={cn(
        'bg-surface border rounded-lg p-4 flex flex-col gap-1',
        showAlert ? 'border-status-red/30' : 'border-subtle',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>
        <span className={cn('transition-colors', showAlert ? 'text-status-red' : 'text-accent')}>
          {icon}
        </span>
      </div>
      {hasError ? (
        <>
          <p className="text-sm font-bold text-status-red">—</p>
          <span className="text-xs text-status-red">Failed to load</span>
        </>
      ) : (
        <p
          className={cn(
            'text-[22px] font-bold tracking-tight font-mono',
            showAlert ? 'text-status-red' : 'text-primary',
          )}
        >
          {value ?? 0}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget: Agent Status Feed
// ---------------------------------------------------------------------------

function AgentStatusWidget() {
  const navigate = useNavigate()

  // WebSocket integration point: see file-level comment
  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['agentStatus'],
    queryFn: fetchAgentStatus,
    refetchInterval: 30_000,
  })

  const agents = res?.data ?? []
  const hasRunning = agents.some((a) => a.status === 'running' || a.status === 'active')

  return (
    <div className="bg-surface border border-subtle rounded-lg flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-primary">Agent Status</h3>
          {hasRunning && (
            <span className="w-2 h-2 rounded-full bg-status-green animate-pulse" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="overflow-y-auto max-h-[340px]">
        {isLoading && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-subtle last:border-0"
              >
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-28 rounded" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
                <Skeleton className="h-5 w-14 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </>
        )}

        {isError && (
          <p className="text-xs text-status-red text-center py-6">
            Failed to load agent status.
          </p>
        )}

        {!isLoading && !isError && agents.length === 0 && (
          <div className="py-8 px-4 flex flex-col items-center gap-3">
            <p className="text-sm text-muted text-center">
              No agents hired yet. Visit Org Chart to hire your team.
            </p>
            <Button variant="ghost" size="sm" onClick={() => navigate('/org')}>
              Go to Org Chart
            </Button>
          </div>
        )}

        {!isLoading &&
          !isError &&
          agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-subtle last:border-0 hover:bg-elevated cursor-pointer transition-colors duration-75"
              onClick={() => navigate(`/org/${agent.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(`/org/${agent.id}`)
              }}
            >
              <AgentAvatarSmall roleSlug={agent.roleSlug} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{agent.name}</p>
                <p className="text-xs text-muted truncate">{agent.roleName}</p>
              </div>
              <ModelTierBadge tier={agent.modelTier} />
              <AgentStatusBadge status={agent.status} />
              {agent.currentTaskTitle && (
                <span className="text-xs text-muted truncate max-w-[140px] hidden 2xl:block">
                  {agent.currentTaskTitle.length > 40
                    ? agent.currentTaskTitle.slice(0, 40) + '…'
                    : agent.currentTaskTitle}
                </span>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget: Approvals Queue
// ---------------------------------------------------------------------------

function ApprovalsWidget() {
  const navigate = useNavigate()

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: fetchPendingApprovals,
    refetchInterval: 30_000,
  })

  const items = res?.data ?? []

  return (
    <div className="bg-surface border border-subtle rounded-lg flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-primary">Approvals</h3>
          {items.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-status-red text-inverse text-[10px] font-bold">
              {items.length}
            </span>
          )}
        </div>
        <Link
          to="/approvals"
          className="text-accent text-[13px] font-medium hover:text-accent-hover transition-colors"
        >
          View all
        </Link>
      </div>

      <div className="flex-1">
        {isLoading && (
          <>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b border-subtle last:border-0"
              >
                <Skeleton className="h-5 w-16 rounded shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-3 w-36 rounded" />
                </div>
                <Skeleton className="h-7 w-16 rounded" />
              </div>
            ))}
          </>
        )}

        {isError && (
          <p className="text-xs text-status-red text-center py-6">Failed to load approvals.</p>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="py-10 flex flex-col items-center gap-3">
            <ShieldCheck size={32} className="text-muted" />
            <div className="text-center">
              <p className="text-sm font-medium text-secondary">No pending approvals</p>
              <p className="text-xs text-muted mt-0.5">You're all clear.</p>
            </div>
          </div>
        )}

        {!isLoading &&
          !isError &&
          items.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-subtle last:border-0"
            >
              <ApprovalTypeBadge type={item.approvalType} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-secondary">{item.requestingAgentName}</p>
                <p className="text-sm font-medium text-primary truncate">{item.summary}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/approvals')}
                className="shrink-0"
              >
                Review
              </Button>
            </div>
          ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget: Queue Pipeline
// ---------------------------------------------------------------------------

function QueueWidget({ summary }: { summary: DashboardSummary | undefined }) {
  const navigate = useNavigate()

  const stages = [
    { key: 'queued', label: 'Inbox', count: summary?.queuedCount ?? 0, colour: 'bg-status-amber' },
    { key: 'in_progress', label: 'Active', count: summary?.inProgressCount ?? 0, colour: 'bg-[#60A5FA]' },
    { key: 'review', label: 'Review', count: summary?.reviewCount ?? 0, colour: 'bg-purple-400' },
  ]

  const total = stages.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="bg-surface border border-subtle rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-primary">Task Queue</h3>
          {total > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-inverse text-[10px] font-bold">
              {total}
            </span>
          )}
        </div>
        <Link
          to="/queue"
          className="text-accent text-[13px] font-medium hover:text-accent-hover transition-colors"
        >
          View queue
        </Link>
      </div>

      <div className="p-4">
        {total === 0 ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <Inbox size={28} className="text-muted" />
            <p className="text-sm text-muted">Queue is empty</p>
            <Button variant="ghost" size="sm" onClick={() => navigate('/queue')}>
              Go to Queue
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            {stages.map((stage) => (
              <button
                key={stage.key}
                onClick={() => navigate(`/queue?tab=${stage.key}`)}
                className="flex-1 bg-elevated border border-subtle rounded-lg p-3 hover:border-strong transition-colors text-center"
              >
                <p className="text-[22px] font-bold font-mono text-primary">{stage.count}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className={cn('w-2 h-2 rounded-full', stage.colour)} />
                  <span className="text-xs font-medium text-muted">{stage.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget: Activity Feed
// ---------------------------------------------------------------------------

function ActivityFeedWidget() {
  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['activityFeed'],
    queryFn: fetchActivity,
    refetchInterval: 30_000,
  })

  const entries = res?.data ?? []

  return (
    <div className="bg-surface border border-subtle rounded-lg flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle shrink-0">
        <h3 className="text-[15px] font-semibold text-primary">Activity</h3>
        <span className="text-xs text-muted">Last 24 hours</span>
      </div>

      <div className="overflow-y-auto max-h-[320px] divide-y divide-subtle">
        {isLoading && (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-3 px-4">
                <Skeleton className="w-2 h-2 rounded-full mt-2 shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-52 rounded" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
              </div>
            ))}
          </>
        )}

        {isError && (
          <p className="text-xs text-status-red text-center py-6">Failed to load activity.</p>
        )}

        {!isLoading && !isError && entries.length === 0 && (
          <div className="py-10 flex flex-col items-center gap-3">
            <Zap size={32} className="text-muted" />
            <p className="text-sm text-muted text-center">No activity yet.</p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          entries.slice(0, 20).map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 py-3 px-4">
              <div
                className={cn(
                  'w-2 h-2 rounded-full mt-2 shrink-0',
                  entry.actorType === 'user' ? 'bg-accent' : 'bg-status-green',
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-secondary leading-snug">
                  <span className="font-medium text-primary">{entry.actorName}</span>{' '}
                  {entry.action}
                </p>
                <p className="text-xs text-muted mt-0.5">{formatRelativeTime(entry.createdAt)}</p>
              </div>
            </div>
          ))}
      </div>

      {entries.length > 0 && (
        <div className="px-4 py-2 border-t border-subtle">
          {/* View all: placeholder — full activity page not yet built */}
          <button className="text-xs text-accent hover:text-accent-hover transition-colors">
            View all activity
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const {
    data: summaryRes,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: fetchSummary,
    refetchInterval: 30_000,
  })

  const summary = summaryRes?.data

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-primary">Command Centre</h1>
        <p className="text-sm text-muted mt-0.5">{formatDate(new Date())}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Open Tasks"
          value={summary?.openTasksCount}
          icon={<CheckSquare2 size={16} />}
          isLoading={summaryLoading}
          hasError={summaryError}
        />
        <StatCard
          label="Active Agents"
          value={summary?.activeAgentsCount}
          icon={<Bot size={16} />}
          isLoading={summaryLoading}
          hasError={summaryError}
        />
        <StatCard
          label="Pending Approvals"
          value={summary?.pendingApprovalsCount}
          icon={<Bell size={16} />}
          isLoading={summaryLoading}
          hasError={summaryError}
          isAlert
        />
        <StatCard
          label="Active Projects"
          value={summary?.projectsCount}
          icon={<FolderOpen size={16} />}
          isLoading={summaryLoading}
          hasError={summaryError}
        />
      </div>

      {/* Agent status + approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <AgentStatusWidget />
        </div>
        <div className="lg:col-span-5">
          <ApprovalsWidget />
        </div>
      </div>

      {/* Queue pipeline */}
      <QueueWidget summary={summary} />

      {/* Activity feed */}
      <ActivityFeedWidget />
    </div>
  )
}
