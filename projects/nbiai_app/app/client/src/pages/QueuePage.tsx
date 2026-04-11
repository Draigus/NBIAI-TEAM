import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Inbox,
  Play,
  Eye,
  CheckCircle2,
  Copy,
  Check,
  X,
  Loader2,
  AlertCircle,
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
import { queue } from '@/lib/api'
import { cn, formatRelativeTime, getStatusColor } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueueItem {
  id: string
  title: string
  status: string
  priority: string
  projectId: string
  projectName: string | null
  agentId: string | null
  agentName: string | null
  roleSlug: string | null
  queuedAt: string | null
  completedAt: string | null
  sessionId: string | null
}

interface PromptData {
  taskId: string
  title: string
  status: string
  sessionId: string | null
  sessionPrompt: string
}

type QueueTab = 'queued' | 'in_progress' | 'review' | 'done'

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const TABS: { key: QueueTab; label: string; icon: typeof Inbox }[] = [
  { key: 'queued', label: 'Inbox', icon: Inbox },
  { key: 'in_progress', label: 'Active', icon: Play },
  { key: 'review', label: 'Review', icon: Eye },
  { key: 'done', label: 'Done', icon: CheckCircle2 },
]

// ---------------------------------------------------------------------------
// Priority badge
// ---------------------------------------------------------------------------

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: {
    label: 'Critical',
    className: 'text-status-red bg-status-red/10 border-status-red/30',
  },
  high: {
    label: 'High',
    className: 'text-status-amber bg-status-amber/10 border-status-amber/30',
  },
  medium: {
    label: 'Medium',
    className: 'text-secondary bg-elevated border-subtle',
  },
  low: {
    label: 'Low',
    className: 'text-muted bg-elevated border-subtle',
  },
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold uppercase tracking-wider',
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Agent avatar
// ---------------------------------------------------------------------------

function AgentAvatar({ name, size = 28 }: { name: string; size?: number }) {
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
// Prompt modal
// ---------------------------------------------------------------------------

function PromptModal({
  data,
  onClose,
}: {
  data: PromptData
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(data.sessionPrompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-base border border-subtle rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-primary truncate">
              {data.title}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Session prompt for Claude Desktop
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handleCopy}>
              {copied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
              {copied ? 'Copied' : 'Copy to Clipboard'}
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-elevated text-muted hover:text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <pre className="font-mono text-xs text-secondary whitespace-pre-wrap leading-relaxed">
            {data.sessionPrompt}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toast state
// ---------------------------------------------------------------------------

interface ToastState {
  open: boolean
  title: string
  description: string
  variant: 'success' | 'warning' | 'error' | 'default'
}

// ---------------------------------------------------------------------------
// QueuePage
// ---------------------------------------------------------------------------

export default function QueuePage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<QueueTab>('queued')
  const [promptModal, setPromptModal] = useState<PromptData | null>(null)
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

  // Fetch queue items for active tab
  const { data: queueRes, isLoading } = useQuery({
    queryKey: ['queue', activeTab],
    queryFn: () =>
      queue.list({ status: activeTab }) as Promise<{
        data: QueueItem[]
        pagination: { hasMore: boolean; nextCursor?: string }
      }>,
    refetchInterval: 15_000,
  })

  const items = queueRes?.data ?? []

  // Mark done mutation (for review tab)
  const { mutateAsync: markDone, isPending: isMarking } = useMutation({
    mutationFn: (taskId: string) =>
      queue.postResults({
        taskId,
        status: 'done',
        output: 'Marked as done by Glen via Queue screen.',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] })
      showToast('Task completed', 'Moved to Done.', 'success')
    },
    onError: () => {
      showToast('Error', 'Failed to mark task as done.', 'error')
    },
  })

  // View prompt handler
  async function handleViewPrompt(taskId: string) {
    try {
      const res = (await queue.getPrompt(taskId)) as { data: PromptData }
      setPromptModal(res.data)
    } catch {
      showToast('Error', 'Failed to load session prompt.', 'error')
    }
  }

  return (
    <ToastProvider>
      <div className="p-6">
        <PageHeader
          title="Task Queue"
          subtitle="File-based queue bridging the app and Claude Desktop"
        />

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-subtle">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                  activeTab === tab.key
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted hover:text-secondary',
                )}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border border-subtle rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/5" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox size={40} className="text-muted mb-3" />
            <p className="text-sm font-medium text-muted">
              No tasks in {TABS.find((t) => t.key === activeTab)?.label ?? activeTab}.
            </p>
            <p className="text-xs text-muted mt-1">
              {activeTab === 'queued'
                ? 'Queue a task from the Tasks page to get started.'
                : 'Tasks will appear here as they move through the queue.'}
            </p>
          </div>
        )}

        {/* Task list */}
        {!isLoading && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="border border-subtle rounded-lg p-4 hover:border-strong transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Agent avatar */}
                  {item.agentName ? (
                    <AgentAvatar name={item.agentName} />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-elevated flex items-center justify-center">
                      <AlertCircle size={14} className="text-muted" />
                    </div>
                  )}

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-primary truncate">
                        {item.title}
                      </p>
                      <PriorityBadge priority={item.priority} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      {item.agentName && (
                        <span>
                          {item.agentName}
                          {item.roleSlug && (
                            <span className="text-muted/60 ml-1">
                              ({item.roleSlug.replace(/_/g, ' ')})
                            </span>
                          )}
                        </span>
                      )}
                      {item.projectName && (
                        <span className="text-muted/80">{item.projectName}</span>
                      )}
                      {item.queuedAt && (
                        <span>{formatRelativeTime(item.queuedAt)}</span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <Badge className={cn(getStatusColor(item.status))}>
                    {item.status.replace(/_/g, ' ')}
                  </Badge>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPrompt(item.id)}
                    >
                      <Copy size={13} className="mr-1.5" />
                      View Prompt
                    </Button>

                    {activeTab === 'review' && (
                      <Button
                        size="sm"
                        disabled={isMarking}
                        onClick={() => markDone(item.id)}
                      >
                        {isMarking ? (
                          <Loader2 size={13} className="animate-spin mr-1.5" />
                        ) : (
                          <CheckCircle2 size={13} className="mr-1.5" />
                        )}
                        Mark Done
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt modal */}
      {promptModal && (
        <PromptModal data={promptModal} onClose={() => setPromptModal(null)} />
      )}

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
