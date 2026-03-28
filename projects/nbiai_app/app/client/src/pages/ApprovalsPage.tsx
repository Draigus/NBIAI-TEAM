import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck,
  Check,
  X,
  MessageSquare,
  Loader2,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Toast,
  ToastProvider,
  ToastTitle,
  ToastDescription,
  ToastViewport,
} from '@/components/ui/toast'
import { PageHeader } from '@/components/layout/PageHeader'
import { approvals } from '@/lib/api'
import { cn, formatRelativeTime, formatDate } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApprovalItem {
  id: string
  approvalType: string
  requestingAgentId: string
  requestingAgentName: string
  requestingAgentRole: string
  summary: string
  content: Record<string, unknown>
  taskId?: string | null
  taskTitle?: string | null
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested'
  decisionComment?: string | null
  decidedAt?: string | null
  decidedByName?: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Approval type badge
// ---------------------------------------------------------------------------

const APPROVAL_TYPE_CONFIG: Record<
  string,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  external_email: {
    label: 'External Email',
    textClass: 'text-[#60A5FA]',
    bgClass: 'bg-[#60A5FA]/10',
    borderClass: 'border-[#60A5FA]/30',
  },
  financial: {
    label: 'Financial',
    textClass: 'text-status-amber',
    bgClass: 'bg-status-amber/10',
    borderClass: 'border-status-amber/30',
  },
  external_post: {
    label: 'External Post',
    textClass: 'text-purple-400',
    bgClass: 'bg-purple-400/10',
    borderClass: 'border-purple-400/30',
  },
  client_comms: {
    label: 'Client Comms',
    textClass: 'text-teal-400',
    bgClass: 'bg-teal-400/10',
    borderClass: 'border-teal-400/30',
  },
  strategic: {
    label: 'Strategic',
    textClass: 'text-status-red',
    bgClass: 'bg-status-red/10',
    borderClass: 'border-status-red/30',
  },
  hiring: {
    label: 'Hiring',
    textClass: 'text-indigo-400',
    bgClass: 'bg-indigo-400/10',
    borderClass: 'border-indigo-400/30',
  },
}

function getApprovalTypeConfig(type: string) {
  return (
    APPROVAL_TYPE_CONFIG[type] ?? {
      label: type.replace(/_/g, ' '),
      textClass: 'text-secondary',
      bgClass: 'bg-elevated',
      borderClass: 'border-default',
    }
  )
}

function ApprovalTypeBadge({ type, large = false }: { type: string; large?: boolean }) {
  const cfg = getApprovalTypeConfig(type)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border font-semibold uppercase tracking-wider shrink-0',
        cfg.textClass,
        cfg.bgClass,
        cfg.borderClass,
        large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px]',
      )}
    >
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Decision badge
// ---------------------------------------------------------------------------

function DecisionBadge({ decision }: { decision: string }) {
  if (decision === 'approved') return <Badge variant="success">Approved</Badge>
  if (decision === 'rejected') return <Badge variant="error">Rejected</Badge>
  if (decision === 'changes_requested') return <Badge variant="warning">Changes Requested</Badge>
  return <Badge>{decision}</Badge>
}

// ---------------------------------------------------------------------------
// Age with colour
// ---------------------------------------------------------------------------

function ApprovalAge({ createdAt }: { createdAt: string }) {
  const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
  return (
    <span
      className={cn(
        'text-[11px] shrink-0',
        hours > 72 ? 'text-status-red' : hours > 24 ? 'text-status-amber' : 'text-muted',
      )}
    >
      {formatRelativeTime(createdAt)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Agent avatar
// ---------------------------------------------------------------------------

function AgentAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const initials = name
    .split(/[\s_]+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
  return (
    <div
      className="rounded-full bg-accent-muted flex items-center justify-center text-accent font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: Math.floor(size * 0.42) }}
    >
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Email mockup
// ---------------------------------------------------------------------------

interface EmailContent {
  to?: string
  subject?: string
  body?: string
  [key: string]: unknown
}

function EmailMockup({ content }: { content: EmailContent }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const text = [`To: ${content.to ?? ''}`, `Subject: ${content.subject ?? ''}`, '', content.body ?? ''].join(
      '\n',
    )
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg p-4 relative">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 flex items-center gap-1 text-[11px] text-muted hover:text-primary transition-colors"
      >
        <Copy size={12} />
        {copied ? 'Copied' : 'Copy'}
      </button>
      <div className="space-y-1 mb-3 pr-16">
        <div className="flex gap-2">
          <span className="text-xs font-semibold text-muted w-14 shrink-0">To:</span>
          <span className="text-xs text-secondary">{content.to ?? '—'}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-xs font-semibold text-muted w-14 shrink-0">Subject:</span>
          <span className="text-sm font-semibold text-primary">{content.subject ?? '—'}</span>
        </div>
      </div>
      <div className="border-t border-[#2A2A3C] pt-3">
        <p className="text-sm text-secondary whitespace-pre-wrap leading-relaxed">
          {content.body ?? ''}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// JSON block
// ---------------------------------------------------------------------------

function JsonBlock({ content }: { content: Record<string, unknown> }) {
  return (
    <pre className="font-mono text-xs text-secondary bg-[#0A0A0F] border border-[#2A2A3C] p-4 rounded-lg overflow-auto max-h-72 whitespace-pre-wrap">
      {JSON.stringify(content, null, 2)}
    </pre>
  )
}

// ---------------------------------------------------------------------------
// Left panel list item
// ---------------------------------------------------------------------------

interface ListItemProps {
  item: ApprovalItem
  selected: boolean
  mode: 'pending' | 'history'
  onClick: () => void
}

function ApprovalListItem({ item, selected, mode, onClick }: ListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 border-b border-subtle hover:bg-[#111118] transition-colors duration-75',
        selected && 'bg-[#16161F] border-l-2 border-l-accent -ml-px',
      )}
      style={selected ? { paddingLeft: 'calc(1rem + 1px)' } : undefined}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        {mode === 'pending' ? (
          <ApprovalTypeBadge type={item.approvalType} />
        ) : (
          <DecisionBadge decision={item.status} />
        )}
        {mode === 'pending' ? (
          <ApprovalAge createdAt={item.createdAt} />
        ) : (
          <span className="text-[11px] text-muted shrink-0">
            {item.decidedAt ? formatRelativeTime(item.decidedAt) : '—'}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-primary mb-0.5">
        Requested by {item.requestingAgentName}
      </p>
      <p className="text-sm text-secondary line-clamp-2 leading-snug">{item.summary}</p>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

type ActionType = 'approve' | 'reject' | 'changes_requested'

interface DetailPanelProps {
  item: ApprovalItem
  onDecide: (id: string, decision: 'approve' | 'reject', comment?: string) => Promise<void>
  isDeciding: boolean
}

function DetailPanel({ item, onDecide, isDeciding }: DetailPanelProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const isPending = item.status === 'pending'
  const commentRequired = selectedAction === 'reject' || selectedAction === 'changes_requested'

  function handleActionSelect(action: ActionType) {
    setSelectedAction(action)
    setCommentError(false)
  }

  async function handleConfirm() {
    if (!selectedAction) return
    if (commentRequired && !comment.trim()) {
      setCommentError(true)
      return
    }
    setConfirming(true)
    const apiDecision: 'approve' | 'reject' = selectedAction === 'approve' ? 'approve' : 'reject'
    await onDecide(item.id, apiDecision, comment.trim() || undefined)
    setConfirming(false)
    setSelectedAction(null)
    setComment('')
    setCommentError(false)
  }

  const commentPlaceholder =
    selectedAction === 'approve'
      ? "Optional note (e.g. 'Approved — send by EOD')"
      : selectedAction === 'changes_requested'
        ? 'Required — explain what needs to change'
        : selectedAction === 'reject'
          ? 'Required — explain why this was rejected'
          : 'Select an action above'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-subtle shrink-0">
        <ApprovalTypeBadge type={item.approvalType} large />
        <h2 className="text-[18px] font-bold text-primary mt-2 leading-tight">{item.summary}</h2>
        <div className="flex items-center gap-2 mt-2">
          <AgentAvatar name={item.requestingAgentName} size={24} />
          <Link
            to={`/org/${item.requestingAgentId}`}
            className="text-sm text-accent hover:text-accent-hover transition-colors"
          >
            {item.requestingAgentName}
          </Link>
          {item.requestingAgentRole && (
            <span className="text-xs text-muted">{item.requestingAgentRole}</span>
          )}
        </div>
        <p className="text-xs text-muted mt-1">
          Requested {formatDate(item.createdAt)} at{' '}
          {new Date(item.createdAt).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        {item.taskId && item.taskTitle && (
          <p className="text-xs text-muted mt-0.5">
            From task:{' '}
            <Link to={`/tasks/${item.taskId}`} className="text-accent hover:text-accent-hover">
              {item.taskTitle}
            </Link>
          </p>
        )}
      </div>

      {/* Resolved banner */}
      {!isPending && (
        <div
          className={cn(
            'mx-6 mt-5 rounded-lg border px-4 py-3',
            item.status === 'approved'
              ? 'bg-status-green/10 border-status-green/30'
              : item.status === 'rejected'
                ? 'bg-status-red/10 border-status-red/30'
                : 'bg-status-amber/10 border-status-amber/30',
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <DecisionBadge decision={item.status} />
            <span className="text-xs text-muted">
              by {item.decidedByName ?? 'Glen'} on{' '}
              {item.decidedAt ? formatDate(item.decidedAt) : '—'}
            </span>
          </div>
          {item.decisionComment && (
            <p className="text-sm text-secondary mt-1">{item.decisionComment}</p>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 border-b border-subtle">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">
            Full Content
          </p>
          {item.approvalType === 'external_email' ? (
            <EmailMockup content={item.content as EmailContent} />
          ) : (
            <JsonBlock content={item.content} />
          )}
        </div>
      </div>

      {/* Action area — pending only */}
      {isPending && (
        <div className="px-6 py-5 bg-elevated border-t border-subtle shrink-0">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">
            Your Decision
          </p>

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => handleActionSelect('approve')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors border',
                selectedAction === 'approve'
                  ? 'bg-[#22C55E] border-[#22C55E] text-[#0A0A0F]'
                  : 'bg-[#22C55E1A] border-[#22C55E33] text-status-green hover:bg-[#22C55E]/20',
              )}
            >
              <Check size={14} />
              Approve
            </button>
            <button
              onClick={() => handleActionSelect('changes_requested')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors border',
                selectedAction === 'changes_requested'
                  ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0A0A0F]'
                  : 'bg-[#F59E0B1A] border-[#F59E0B33] text-status-amber hover:bg-[#F59E0B]/20',
              )}
            >
              <MessageSquare size={14} />
              Request Changes
            </button>
            <button
              onClick={() => handleActionSelect('reject')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors border',
                selectedAction === 'reject'
                  ? 'bg-[#EF4444] border-[#EF4444] text-[#0A0A0F]'
                  : 'bg-[#EF44441A] border-[#EF444433] text-status-red hover:bg-[#EF4444]/20',
              )}
            >
              <X size={14} />
              Reject
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-muted mb-1.5">
              Comment
              {commentRequired && <span className="text-status-red ml-0.5">*</span>}
            </label>
            <textarea
              rows={3}
              className={cn(
                'w-full rounded-md border bg-[#16161F] px-3 py-2 text-sm text-primary placeholder:text-muted resize-none',
                'focus:outline-none focus:ring-1 focus:ring-accent focus:border-strong transition-colors',
                commentError ? 'border-status-red' : 'border-default',
              )}
              placeholder={commentPlaceholder}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value)
                if (commentError && e.target.value.trim()) setCommentError(false)
              }}
              disabled={!selectedAction}
            />
            {commentError && (
              <p className="text-xs text-status-red mt-1">A reason is required.</p>
            )}
          </div>

          <Button
            className="w-full h-10"
            disabled={!selectedAction || isDeciding || confirming}
            onClick={handleConfirm}
          >
            {(isDeciding || confirming) && <Loader2 size={16} className="animate-spin mr-2" />}
            {selectedAction
              ? `Confirm ${
                  selectedAction === 'approve'
                    ? 'Approve'
                    : selectedAction === 'changes_requested'
                      ? 'Request Changes'
                      : 'Reject'
                }`
              : 'Select an action'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ApprovalsPage
// ---------------------------------------------------------------------------

interface ToastState {
  open: boolean
  title: string
  description: string
  variant: 'success' | 'warning' | 'error' | 'default'
}

export default function ApprovalsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>({
    open: false,
    title: '',
    description: '',
    variant: 'default',
  })

  function showToast(title: string, description: string, variant: ToastState['variant']) {
    setToast({ open: true, title, description, variant })
    setTimeout(() => setToast((t) => ({ ...t, open: false })), 4000)
  }

  const { data: pendingRes, isLoading: pendingLoading } = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => approvals.pending() as Promise<{ data: ApprovalItem[] }>,
    refetchInterval: 30_000,
  })

  const { data: historyRes, isLoading: historyLoading } = useQuery({
    queryKey: ['approvals', 'history'],
    queryFn: () =>
      (approvals.list({ status: 'resolved' }) as Promise<{ data: ApprovalItem[] }>),
    refetchInterval: 60_000,
  })

  const pendingItems = pendingRes?.data ?? []
  const historyItems = historyRes?.data ?? []
  const activeList = activeTab === 'pending' ? pendingItems : historyItems
  const isLoading = activeTab === 'pending' ? pendingLoading : historyLoading

  // Auto-select first item when list first populates
  useEffect(() => {
    if (activeList.length > 0 && !selectedId) {
      setSelectedId(activeList[0].id)
    }
  }, [activeList, selectedId])

  // When switching tabs, reset selection to first item
  useEffect(() => {
    setSelectedId(activeList.length > 0 ? activeList[0].id : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const selectedItem = activeList.find((i) => i.id === selectedId) ?? null

  const { mutateAsync: decide, isPending: isDeciding } = useMutation({
    mutationFn: ({
      id,
      decision,
      comment,
    }: {
      id: string
      decision: 'approve' | 'reject'
      comment?: string
    }) => approvals.decide(id, decision, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] })
    },
  })

  async function handleDecide(id: string, decision: 'approve' | 'reject', comment?: string) {
    await decide({ id, decision, comment })
    if (decision === 'approve') {
      showToast('Approval confirmed', 'Agent will proceed.', 'success')
    } else {
      showToast('Request rejected', 'Agent notified.', 'error')
    }
    const remaining = pendingItems.filter((i) => i.id !== id)
    setSelectedId(remaining.length > 0 ? remaining[0].id : null)
  }

  return (
    <ToastProvider>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
        {/* Page header */}
        <div className="px-6 py-4 border-b border-subtle shrink-0">
          <PageHeader
            title="Approvals"
            className="mb-0"
            actions={
              <div className="flex items-center gap-3">
                {pendingItems.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-status-red text-[#0A0A0F] text-[11px] font-bold">
                    {pendingItems.length}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    variant={activeTab === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('pending')}
                  >
                    Pending
                  </Button>
                  <Button
                    variant={activeTab === 'history' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('history')}
                  >
                    History
                  </Button>
                </div>
              </div>
            }
          />
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className="w-80 lg:w-96 shrink-0 border-r border-subtle flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-subtle shrink-0">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                {activeTab === 'pending' ? 'Pending Approvals' : 'Resolved Approvals'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="p-4 space-y-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-24 rounded" />
                        <Skeleton className="h-3 w-10 rounded" />
                      </div>
                      <Skeleton className="h-3 w-32 rounded" />
                      <Skeleton className="h-3 w-full rounded" />
                      <Skeleton className="h-3 w-3/4 rounded" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && activeList.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-16 px-6">
                  <ShieldCheck size={32} className="text-muted mb-3" />
                  <p className="text-sm text-muted text-center font-medium">
                    {activeTab === 'pending' ? 'No pending approvals.' : 'No resolved approvals yet.'}
                  </p>
                  {activeTab === 'pending' && (
                    <p className="text-xs text-muted text-center mt-1 px-4">
                      Agents will request approval here before taking external actions.
                    </p>
                  )}
                </div>
              )}

              {!isLoading &&
                activeList.map((item) => (
                  <ApprovalListItem
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    mode={activeTab === 'pending' ? 'pending' : 'history'}
                    onClick={() => setSelectedId(item.id)}
                  />
                ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 overflow-hidden">
            {!selectedItem ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <ShieldCheck size={48} className="text-muted" />
                <p className="text-sm text-muted">Select an approval to review</p>
              </div>
            ) : (
              <DetailPanel
                key={selectedItem.id}
                item={selectedItem}
                onDecide={handleDecide}
                isDeciding={isDeciding}
              />
            )}
          </div>
        </div>
      </div>

      <Toast
        open={toast.open}
        onOpenChange={(open) => setToast((t) => ({ ...t, open }))}
        variant={toast.variant}
      >
        <ToastTitle>{toast.title}</ToastTitle>
        {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
      </Toast>
      <ToastViewport />
    </ToastProvider>
  )
}
