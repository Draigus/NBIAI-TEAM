import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Terminal,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/layout/PageHeader'
import { sessions } from '@/lib/api'
import { cn, formatRelativeTime, formatDateTime } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionItem {
  id: string
  label: string
  status: string
  trigger: string
  agentId: string | null
  agentName: string | null
  roleSlug: string | null
  scheduledFor: string | null
  startedAt: string | null
  completedAt: string | null
  notes: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { icon: typeof Clock; colour: string; bgColour: string }> = {
  pending: { icon: Clock, colour: 'text-status-amber', bgColour: 'bg-status-amber/10' },
  in_progress: { icon: Loader2, colour: 'text-[#60A5FA]', bgColour: 'bg-[#60A5FA]/10' },
  completed: { icon: CheckCircle2, colour: 'text-status-green', bgColour: 'bg-status-green/10' },
  failed: { icon: XCircle, colour: 'text-status-red', bgColour: 'bg-status-red/10' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const Icon = cfg.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider',
        cfg.colour,
        cfg.bgColour,
      )}
    >
      <Icon size={12} className={status === 'in_progress' ? 'animate-spin' : ''} />
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Trigger badge
// ---------------------------------------------------------------------------

function TriggerBadge({ trigger }: { trigger: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold uppercase tracking-wider',
        trigger === 'scheduled'
          ? 'text-purple-400 bg-purple-400/10 border-purple-400/30'
          : 'text-secondary bg-elevated border-subtle',
      )}
    >
      {trigger}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Expandable row
// ---------------------------------------------------------------------------

function SessionRow({ item }: { item: SessionItem }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-subtle rounded-lg overflow-hidden hover:border-strong transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-muted shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-muted shrink-0" />
        )}

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary truncate">{item.label}</p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
            {item.agentName && <span>{item.agentName}</span>}
            <span>{formatRelativeTime(item.createdAt)}</span>
          </div>
        </div>

        {/* Badges */}
        <TriggerBadge trigger={item.trigger} />
        <StatusBadge status={item.status} />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-subtle bg-elevated/30">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-muted font-semibold uppercase tracking-wider mb-1">Agent</p>
              <p className="text-secondary">
                {item.agentName ?? 'None'}
                {item.roleSlug && (
                  <span className="text-muted ml-1">({item.roleSlug.replace(/_/g, ' ')})</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted font-semibold uppercase tracking-wider mb-1">Started</p>
              <p className="text-secondary">
                {item.startedAt ? formatDateTime(item.startedAt) : 'Not started'}
              </p>
            </div>
            <div>
              <p className="text-muted font-semibold uppercase tracking-wider mb-1">Completed</p>
              <p className="text-secondary">
                {item.completedAt ? formatDateTime(item.completedAt) : 'In progress'}
              </p>
            </div>
            <div>
              <p className="text-muted font-semibold uppercase tracking-wider mb-1">Scheduled For</p>
              <p className="text-secondary">
                {item.scheduledFor ? formatDateTime(item.scheduledFor) : 'N/A'}
              </p>
            </div>
          </div>

          {item.notes && (
            <div className="mt-4">
              <p className="text-[11px] text-muted font-semibold uppercase tracking-wider mb-1">
                Notes
              </p>
              <div className="bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg p-3">
                <p className="text-sm text-secondary whitespace-pre-wrap leading-relaxed">
                  {item.notes}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SessionsPage
// ---------------------------------------------------------------------------

export default function SessionsPage() {
  const { data: sessionsRes, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () =>
      sessions.list() as Promise<{
        data: SessionItem[]
        pagination: { hasMore: boolean; nextCursor?: string }
      }>,
    refetchInterval: 30_000,
  })

  const items = sessionsRes?.data ?? []

  return (
    <div className="p-6">
      <PageHeader
        title="Session Log"
        subtitle="Claude Desktop session history and outcomes"
      />

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-subtle rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Terminal size={40} className="text-muted mb-3" />
          <p className="text-sm font-medium text-muted">No sessions yet.</p>
          <p className="text-xs text-muted mt-1">
            Sessions are created when tasks are queued for Claude Desktop execution.
          </p>
        </div>
      )}

      {/* Session list */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <SessionRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
