/**
 * TaskDetailPage — /tasks/:taskId
 *
 * Two-column layout: main content left (col-span-8), metadata sidebar right (col-span-4).
 * Stacks to single column below 1024px.
 */

import { useState, useRef } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  Pencil,
  Loader2,
  UserCheck,
  Link as LinkIcon,
  Plus,
  FolderKanban,
  AlertCircle,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { tasks, agents } from '@/lib/api'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Agent {
  id: string
  name: string
  roleName: string
  roleSlug: string
}

interface Project {
  id: string
  name: string
}

interface CheckoutStatus {
  checkedOut: boolean
  agentId?: string
  agentName?: string
  checkedOutAt?: string
}

interface TaskRelation {
  id: string
  relatedTaskId: string
  relatedTaskTitle: string
  type: 'blocks' | 'blocked_by' | 'related'
}

interface ActivityEntry {
  id: string
  type: 'status_change' | 'assignment' | 'comment' | 'relation_added'
  actorName: string
  actorType: 'agent' | 'user'
  actorRoleSlug?: string
  oldStatus?: string
  newStatus?: string
  assignedAgentName?: string
  content?: string
  relatedTaskTitle?: string
  createdAt: string
}

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  project: Project
  assignedAgent?: Agent | null
  createdByName?: string
  createdAt: string
  dueDate?: string | null
  checkoutStatus?: CheckoutStatus
  relations?: TaskRelation[]
  activity?: ActivityEntry[]
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const TASK_STATUS_CONFIG: Record<
  string,
  { label: string; text: string; bg: string; border: string }
> = {
  backlog: {
    label: 'Backlog',
    text: 'text-[#9494A8]',
    bg: 'bg-[#9494A8]/10',
    border: 'border-[#9494A8]/30',
  },
  assigned: {
    label: 'Assigned',
    text: 'text-[#4F6EF7]',
    bg: 'bg-[#4F6EF7]/10',
    border: 'border-[#4F6EF7]/30',
  },
  in_progress: {
    label: 'In Progress',
    text: 'text-[#F59E0B]',
    bg: 'bg-[#F59E0B]/10',
    border: 'border-[#F59E0B]/30',
  },
  blocked: {
    label: 'Blocked',
    text: 'text-[#EF4444]',
    bg: 'bg-[#EF4444]/10',
    border: 'border-[#EF4444]/30',
  },
  in_review: {
    label: 'In Review',
    text: 'text-[#4F6EF7]',
    bg: 'bg-[#4F6EF7]/10',
    border: 'border-[#4F6EF7]/30',
  },
  done: {
    label: 'Done',
    text: 'text-[#22C55E]',
    bg: 'bg-[#22C55E]/10',
    border: 'border-[#22C55E]/30',
  },
  cancelled: {
    label: 'Cancelled',
    text: 'text-[#5C5C72]',
    bg: 'bg-[#5C5C72]/10',
    border: 'border-[#5C5C72]/30',
  },
}

const PRIORITY_CONFIG: Record<
  string,
  { label: string; text: string; bg: string; border: string }
> = {
  low: {
    label: 'Low',
    text: 'text-[#9494A8]',
    bg: 'bg-[#9494A8]/10',
    border: 'border-[#9494A8]/30',
  },
  medium: {
    label: 'Medium',
    text: 'text-[#F59E0B]',
    bg: 'bg-[#F59E0B]/10',
    border: 'border-[#F59E0B]/30',
  },
  high: {
    label: 'High',
    text: 'text-[#EF4444]',
    bg: 'bg-[#EF4444]/10',
    border: 'border-[#EF4444]/30',
  },
  critical: {
    label: 'Critical',
    text: 'text-[#EF4444]',
    bg: 'bg-[#EF4444]/20',
    border: 'border-[#EF4444]/50',
  },
}

// Transition matrix
const TRANSITIONS: Record<string, Array<{ to: string; label: string; requiresComment?: boolean }>> = {
  backlog: [
    { to: 'assigned', label: 'Assign' },
    { to: 'in_progress', label: 'Start' },
  ],
  assigned: [
    { to: 'in_progress', label: 'Start' },
    { to: 'backlog', label: 'Move to Backlog' },
  ],
  in_progress: [
    { to: 'in_review', label: 'Submit for Review', requiresComment: true },
    { to: 'blocked', label: 'Mark Blocked', requiresComment: true },
    { to: 'done', label: 'Complete' },
  ],
  in_review: [
    { to: 'done', label: 'Approve & Complete' },
    { to: 'in_progress', label: 'Request Changes' },
  ],
  blocked: [
    { to: 'in_progress', label: 'Unblock' },
  ],
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const config = TASK_STATUS_CONFIG[status] ?? TASK_STATUS_CONFIG.backlog
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-[12px]',
        config.text,
        config.bg,
        config.border,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.text.replace('text-', 'bg-'))} />
      {config.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
        config.text,
        config.bg,
        config.border,
      )}
    >
      {config.label}
    </span>
  )
}

function AgentAvatar({
  roleSlug,
  name,
  size = 24,
}: {
  roleSlug?: string
  name?: string
  size?: number
}) {
  const initials = roleSlug
    ? roleSlug
        .split('_')
        .map((w) => w[0]?.toUpperCase() ?? '')
        .slice(0, 2)
        .join('')
    : name
    ? name
        .split(' ')
        .map((w) => w[0]?.toUpperCase() ?? '')
        .slice(0, 2)
        .join('')
    : '?'

  const sizeClass = size <= 20 ? 'w-5 h-5 text-[9px]' : size <= 24 ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-[11px]'

  return (
    <div
      className={cn(
        'rounded-full bg-[#4F6EF7]/15 flex items-center justify-center text-[#4F6EF7] font-semibold shrink-0',
        sizeClass,
      )}
    >
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Activity log entry
// ---------------------------------------------------------------------------

function ActivityEntry({ entry }: { entry: ActivityEntry }) {
  if (entry.type === 'status_change') {
    const oldCfg = TASK_STATUS_CONFIG[entry.oldStatus ?? ''] ?? TASK_STATUS_CONFIG.backlog
    const newCfg = TASK_STATUS_CONFIG[entry.newStatus ?? ''] ?? TASK_STATUS_CONFIG.backlog
    return (
      <div className="flex items-start gap-3 py-3 border-b border-[#1E1E2C] last:border-0">
        <AgentAvatar roleSlug={entry.actorRoleSlug} name={entry.actorName} size={24} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#9494A8] leading-snug">
            <span className="font-medium text-[#F1F1F3]">{entry.actorName}</span> changed status{' '}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold border',
                oldCfg.text,
                oldCfg.bg,
                oldCfg.border,
              )}
            >
              {oldCfg.label}
            </span>{' '}
            <span className="text-[#5C5C72]">→</span>{' '}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold border',
                newCfg.text,
                newCfg.bg,
                newCfg.border,
              )}
            >
              {newCfg.label}
            </span>
          </p>
          <p className="text-xs text-[#5C5C72] mt-0.5">{formatRelativeTime(entry.createdAt)}</p>
        </div>
      </div>
    )
  }

  if (entry.type === 'assignment') {
    return (
      <div className="flex items-start gap-3 py-3 border-b border-[#1E1E2C] last:border-0">
        <div className="w-6 h-6 flex items-center justify-center shrink-0">
          <UserCheck size={14} className="text-[#5C5C72]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#9494A8] leading-snug">
            Assigned to{' '}
            <span className="text-[#4F6EF7] font-medium">{entry.assignedAgentName}</span>
          </p>
          <p className="text-xs text-[#5C5C72] mt-0.5">{formatRelativeTime(entry.createdAt)}</p>
        </div>
      </div>
    )
  }

  if (entry.type === 'relation_added') {
    return (
      <div className="flex items-start gap-3 py-3 border-b border-[#1E1E2C] last:border-0">
        <div className="w-6 h-6 flex items-center justify-center shrink-0">
          <LinkIcon size={14} className="text-[#5C5C72]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#9494A8] leading-snug">
            Linked to{' '}
            <span className="text-[#4F6EF7] font-medium">{entry.relatedTaskTitle}</span>
          </p>
          <p className="text-xs text-[#5C5C72] mt-0.5">{formatRelativeTime(entry.createdAt)}</p>
        </div>
      </div>
    )
  }

  // comment
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#1E1E2C] last:border-0">
      <AgentAvatar roleSlug={entry.actorRoleSlug} name={entry.actorName} size={24} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-[#F1F1F3]">{entry.actorName}</span>
          <span className="text-xs text-[#5C5C72]">{formatRelativeTime(entry.createdAt)}</span>
        </div>
        <p className="text-sm text-[#9494A8] whitespace-pre-wrap leading-relaxed">{entry.content}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Relation Modal
// ---------------------------------------------------------------------------

interface AddRelationModalProps {
  open: boolean
  onClose: () => void
  currentTaskId: string
  onRelationAdded: () => void
}

function AddRelationModal({ open, onClose, currentTaskId, onRelationAdded }: AddRelationModalProps) {
  const [search, setSearch] = useState('')
  const [relationType, setRelationType] = useState<'blocks' | 'blocked_by' | 'related'>('related')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedTaskTitle, setSelectedTaskTitle] = useState('')

  const { data: searchRes, isLoading: searchLoading } = useQuery({
    queryKey: ['taskSearch', search],
    queryFn: () =>
      tasks.list({ search, limit: '10' }) as Promise<{ data: Array<{ id: string; title: string }> }>,
    enabled: search.length >= 2,
  })

  const searchResults = (searchRes?.data ?? []).filter((t) => t.id !== currentTaskId)

  const addMutation = useMutation({
    mutationFn: () =>
      tasks.update(currentTaskId, {
        addRelation: { relatedTaskId: selectedTaskId, type: relationType },
      }),
    onSuccess: () => {
      onRelationAdded()
      onClose()
    },
  })

  function handleClose() {
    setSearch('')
    setSelectedTaskId(null)
    setSelectedTaskTitle('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Task Relation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
              Relation type
            </label>
            <Select
              value={relationType}
              onValueChange={(v) => setRelationType(v as typeof relationType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blocks">Blocks</SelectItem>
                <SelectItem value="blocked_by">Blocked by</SelectItem>
                <SelectItem value="related">Related</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
              Search task
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSelectedTaskId(null)
              }}
              placeholder="Type to search tasks..."
              className="w-full h-9 px-3 rounded-md bg-[#16161F] border border-[#2A2A3C] text-sm text-[#F1F1F3] placeholder:text-[#5C5C72] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/40"
            />
            {selectedTaskTitle && (
              <p className="text-xs text-[#4F6EF7] mt-1">Selected: {selectedTaskTitle}</p>
            )}
            {search.length >= 2 && !selectedTaskId && (
              <div className="mt-1 bg-[#1C1C27] border border-[#2A2A3C] rounded-md overflow-hidden max-h-48 overflow-y-auto">
                {searchLoading && (
                  <p className="text-xs text-[#5C5C72] text-center py-3">Searching...</p>
                )}
                {!searchLoading && searchResults.length === 0 && (
                  <p className="text-xs text-[#5C5C72] text-center py-3">No tasks found.</p>
                )}
                {!searchLoading &&
                  searchResults.map((t) => (
                    <button
                      key={t.id}
                      className="w-full text-left px-3 py-2 text-sm text-[#9494A8] hover:bg-[#2A2A3C] hover:text-[#F1F1F3] transition-colors"
                      onClick={() => {
                        setSelectedTaskId(t.id)
                        setSelectedTaskTitle(t.title)
                        setSearch('')
                      }}
                    >
                      {t.title}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selectedTaskId || addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending ? (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            ) : null}
            Add Relation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Edit Task Modal
// ---------------------------------------------------------------------------

interface EditTaskModalProps {
  open: boolean
  onClose: () => void
  task: Task
  onSaved: () => void
}

function EditTaskModal({ open, onClose, task, onSaved }: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')

  const mutation = useMutation({
    mutationFn: () =>
      tasks.update(task.id, { title, description, priority, dueDate: dueDate || null }),
    onSuccess: () => {
      onSaved()
      onClose()
    },
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-[#16161F] border border-[#2A2A3C] text-sm text-[#F1F1F3] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
              Description
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[#16161F] border border-[#2A2A3C] text-sm text-[#F1F1F3] placeholder:text-[#5C5C72] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/40 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-[#16161F] border border-[#2A2A3C] text-sm text-[#F1F1F3] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/40"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!title.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin mr-1.5" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Reassign Modal
// ---------------------------------------------------------------------------

interface ReassignModalProps {
  open: boolean
  onClose: () => void
  taskId: string
  currentAgentId?: string
  onReassigned: () => void
}

function ReassignModal({ open, onClose, taskId, onReassigned }: ReassignModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState('')

  const { data: agentsRes, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agents.list() as Promise<{ data: Agent[] }>,
  })

  const agentList = agentsRes?.data ?? []

  const mutation = useMutation({
    mutationFn: () =>
      tasks.update(taskId, { assignedAgentId: selectedAgentId || null }),
    onSuccess: () => {
      onReassigned()
      onClose()
    },
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Task</DialogTitle>
        </DialogHeader>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
            Assign to agent
          </label>
          {isLoading ? (
            <Skeleton className="h-9 w-full rounded-md" />
          ) : (
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {agentList.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {a.roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin mr-1.5" />}
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Metadata row
// ---------------------------------------------------------------------------

function MetaRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1E1E2C] last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72]">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function TaskDetailSkeleton() {
  return (
    <div className="px-6 py-6 grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <div className="bg-[#111118] border border-[#1E1E2C] rounded-lg p-5 space-y-3">
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
        </div>
        <div className="bg-[#111118] border border-[#1E1E2C] rounded-lg p-5 space-y-3">
          <Skeleton className="h-4 w-32 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-4">
        <div className="bg-[#111118] border border-[#1E1E2C] rounded-lg p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-[#1E1E2C] last:border-0">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const isBoardOrAdmin =
    user &&
    ((user as { role?: string }).role === 'board' ||
      (user as { role?: string }).role === 'admin')

  // UI state
  const [editOpen, setEditOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [addRelationOpen, setAddRelationOpen] = useState(false)
  const [pendingTransition, setPendingTransition] = useState<{
    to: string
    label: string
  } | null>(null)
  const [transitionComment, setTransitionComment] = useState('')
  const [transitionLoading, setTransitionLoading] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Data fetch
  const {
    data: res,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasks.get(taskId!) as Promise<{ data: Task }>,
    enabled: !!taskId,
  })

  const task = res?.data

  // Back navigation — context-aware
  const fromProject = (location.state as { projectId?: string; projectName?: string } | null)
  const backHref = fromProject?.projectId ? `/projects/${fromProject.projectId}` : '/projects'
  const backLabel = fromProject?.projectName ?? 'Projects'

  // Status transitions
  async function handleTransition(to: string, commentText?: string) {
    if (!task) return
    setTransitionLoading(to)
    try {
      await tasks.update(task.id, { status: to })
      if (commentText) {
        await tasks.comment(task.id, commentText)
      }
      await refetch()
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setPendingTransition(null)
      setTransitionComment('')
    } finally {
      setTransitionLoading(null)
    }
  }

  // Post comment
  const commentMutation = useMutation({
    mutationFn: () => tasks.comment(taskId!, comment),
    onSuccess: async () => {
      setComment('')
      await refetch()
    },
  })

  // Check if due date is overdue
  function isDueDateOverdue(dueDate: string | null | undefined): boolean {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && task?.status !== 'done' && task?.status !== 'cancelled'
  }

  if (isLoading) return <TaskDetailSkeleton />

  if (isError || !task) {
    return (
      <div className="px-6 py-16 flex flex-col items-center gap-3">
        <AlertCircle size={32} className="text-[#EF4444]" />
        <p className="text-sm text-[#9494A8]">Failed to load task. It may have been deleted.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate(backHref)}>
          Back to {backLabel}
        </Button>
      </div>
    )
  }

  const transitions = TRANSITIONS[task.status] ?? []
  const isTerminal = task.status === 'done' || task.status === 'cancelled'
  const activity = task.activity ?? []
  const relations = task.relations ?? []

  const blockingRelations = relations.filter((r) => r.type === 'blocks')
  const blockedByRelations = relations.filter((r) => r.type === 'blocked_by')
  const relatedRelations = relations.filter((r) => r.type === 'related')

  return (
    <div className="px-6 py-6">
      {/* Page header */}
      <div className="flex items-start gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(backHref)}
          className="shrink-0 -ml-1"
        >
          <ChevronLeft size={16} className="mr-1" />
          {backLabel}
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-bold tracking-tight text-[#F1F1F3] leading-tight">
            {task.title}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={task.status} size="md" />
            <PriorityBadge priority={task.priority} />
            <Link
              to={`/projects/${task.project.id}`}
              className="flex items-center gap-1 text-xs text-[#4F6EF7] hover:text-[#6B87FF] transition-colors"
            >
              <FolderKanban size={13} />
              {task.project.name}
            </Link>
          </div>
        </div>
        {isBoardOrAdmin && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="shrink-0">
            <Pencil size={13} className="mr-1.5" />
            Edit
          </Button>
        )}
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* ---- LEFT COLUMN ---- */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Description */}
          <div className="bg-[#111118] border border-[#1E1E2C] rounded-lg p-5">
            <h3 className="text-[15px] font-semibold text-[#F1F1F3] mb-3">Description</h3>
            {task.description ? (
              <pre className="text-sm text-[#9494A8] whitespace-pre-wrap leading-relaxed font-sans">
                {task.description}
              </pre>
            ) : (
              <p className="text-sm text-[#5C5C72] italic">No description provided.</p>
            )}
          </div>

          {/* Status transitions */}
          <div className="bg-[#111118] border border-[#1E1E2C] rounded-lg p-5">
            <h3 className="text-[15px] font-semibold text-[#F1F1F3] mb-3">Change Status</h3>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-[#5C5C72]">Current:</span>
              <StatusBadge status={task.status} size="md" />
            </div>

            {isTerminal ? (
              <p className="text-xs text-[#5C5C72] italic">
                {task.status === 'done'
                  ? 'This task is complete.'
                  : 'This task was cancelled.'}
              </p>
            ) : (
              <>
                {transitions.length > 0 && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-2">
                    Transition to:
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {transitions.map((t) => {
                    const isLoading = transitionLoading === t.to
                    const isPending = pendingTransition?.to === t.to
                    return (
                      <Button
                        key={t.to}
                        variant="outline"
                        size="sm"
                        disabled={isLoading || transitionLoading !== null}
                        onClick={() => {
                          if (t.requiresComment) {
                            setPendingTransition(isPending ? null : t)
                            setTransitionComment('')
                          } else {
                            handleTransition(t.to)
                          }
                        }}
                        className={cn(isPending && 'border-[#4F6EF7]/50 text-[#4F6EF7]')}
                      >
                        {isLoading ? (
                          <Loader2 size={12} className="animate-spin mr-1.5" />
                        ) : null}
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full mr-1.5',
                            TASK_STATUS_CONFIG[t.to]?.text.replace('text-', 'bg-') ?? 'bg-muted',
                          )}
                        />
                        {t.label}
                      </Button>
                    )
                  })}
                </div>

                {/* Inline comment field for required-comment transitions */}
                {pendingTransition && (
                  <div className="mt-4 rounded-lg bg-[#16161F] border border-[#2A2A3C] p-4 space-y-3">
                    <label className="text-xs font-semibold text-[#9494A8] block">
                      {pendingTransition.to === 'blocked'
                        ? 'Reason for blocking (required)'
                        : 'Comment (required)'}
                    </label>
                    <textarea
                      rows={3}
                      value={transitionComment}
                      onChange={(e) => setTransitionComment(e.target.value)}
                      placeholder="Add a note..."
                      className="w-full px-3 py-2 rounded-md bg-[#0A0A0F] border border-[#2A2A3C] text-sm text-[#F1F1F3] placeholder:text-[#5C5C72] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/40 resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={
                          transitionComment.trim().length < 10 ||
                          transitionLoading !== null
                        }
                        onClick={() => handleTransition(pendingTransition.to, transitionComment)}
                      >
                        {transitionLoading === pendingTransition.to ? (
                          <Loader2 size={12} className="animate-spin mr-1.5" />
                        ) : null}
                        Confirm {TASK_STATUS_CONFIG[pendingTransition.to]?.label ?? pendingTransition.label}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPendingTransition(null)
                          setTransitionComment('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Relations */}
          <div className="bg-[#111118] border border-[#1E1E2C] rounded-lg p-5">
            <h3 className="text-[15px] font-semibold text-[#F1F1F3] mb-4">Relations</h3>

            <div className="space-y-4">
              {/* Blocking */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-2">
                  Blocking
                </p>
                {blockingRelations.length === 0 ? (
                  <p className="text-xs text-[#5C5C72] italic">None.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {blockingRelations.map((r) => (
                      <Link
                        key={r.id}
                        to={`/tasks/${r.relatedTaskId}`}
                        className="flex items-center gap-1.5 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] rounded-full px-3 py-1 text-xs font-medium hover:border-[#EF4444]/60 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                        {r.relatedTaskTitle}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Blocked by */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-2">
                  Blocked by
                </p>
                {blockedByRelations.length === 0 ? (
                  <p className="text-xs text-[#5C5C72] italic">None.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {blockedByRelations.map((r) => (
                      <Link
                        key={r.id}
                        to={`/tasks/${r.relatedTaskId}`}
                        className="flex items-center gap-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] rounded-full px-3 py-1 text-xs font-medium hover:border-[#F59E0B]/60 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                        {r.relatedTaskTitle}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Related */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-2">
                  Related
                </p>
                {relatedRelations.length === 0 ? (
                  <p className="text-xs text-[#5C5C72] italic">None.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {relatedRelations.map((r) => (
                      <Link
                        key={r.id}
                        to={`/tasks/${r.relatedTaskId}`}
                        className="flex items-center gap-1.5 bg-[#1C1C27] border border-[#2A2A3C] text-[#9494A8] rounded-full px-3 py-1 text-xs font-medium hover:border-[#4F6EF7]/40 hover:text-[#F1F1F3] transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#9494A8]" />
                        {r.relatedTaskTitle}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="mt-4 -ml-1"
              onClick={() => setAddRelationOpen(true)}
            >
              <Plus size={13} className="mr-1" />
              Add relation
            </Button>
          </div>

          {/* Activity log */}
          <div className="bg-[#111118] border border-[#1E1E2C] rounded-lg p-5">
            <h3 className="text-[15px] font-semibold text-[#F1F1F3] mb-1">Activity</h3>

            <div className="mt-2">
              {activity.length === 0 ? (
                <p className="text-sm text-[#5C5C72] italic py-4">No activity yet.</p>
              ) : (
                [...activity].reverse().map((entry) => (
                  <ActivityEntry key={entry.id} entry={entry} />
                ))
              )}
            </div>

            {/* Add comment */}
            <div className="mt-4 pt-4 border-t border-[#1E1E2C] space-y-3">
              <textarea
                ref={commentTextareaRef}
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-3 py-2 rounded-md bg-[#16161F] border border-[#2A2A3C] text-sm text-[#F1F1F3] placeholder:text-[#5C5C72] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/40 resize-none"
              />
              <Button
                size="sm"
                disabled={!comment.trim() || commentMutation.isPending}
                onClick={() => commentMutation.mutate()}
              >
                {commentMutation.isPending && (
                  <Loader2 size={12} className="animate-spin mr-1.5" />
                )}
                Post comment
              </Button>
            </div>
          </div>
        </div>

        {/* ---- RIGHT COLUMN (SIDEBAR) ---- */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-[#111118] border border-[#1E1E2C] rounded-lg p-5">
            {/* Checkout status */}
            <div className="mb-4 pb-4 border-b border-[#1E1E2C]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5C5C72] mb-2">
                Checkout status
              </p>
              {task.checkoutStatus?.checkedOut ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-[11px] font-semibold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                    Checked out
                  </span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-[11px] font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  Available
                </span>
              )}
              {task.checkoutStatus?.checkedOut && task.checkoutStatus.agentName && (
                <p className="text-xs text-[#9494A8] mt-1.5">
                  By{' '}
                  <span className="text-[#F1F1F3] font-medium">
                    {task.checkoutStatus.agentName}
                  </span>
                  {task.checkoutStatus.checkedOutAt && (
                    <> since {formatRelativeTime(task.checkoutStatus.checkedOutAt)}</>
                  )}
                </p>
              )}
            </div>

            {/* Metadata rows */}
            <MetaRow label="Assigned to">
              {task.assignedAgent ? (
                <Link
                  to={`/org/${task.assignedAgent.id}`}
                  className="flex items-center gap-1.5 text-[#4F6EF7] hover:text-[#6B87FF] transition-colors text-sm font-medium"
                >
                  <AgentAvatar roleSlug={task.assignedAgent.roleSlug} size={20} />
                  {task.assignedAgent.name}
                </Link>
              ) : (
                <span className="text-xs text-[#5C5C72] italic">Unassigned</span>
              )}
            </MetaRow>

            <MetaRow label="Created by">
              <span className="text-sm text-[#9494A8]">{task.createdByName ?? '—'}</span>
            </MetaRow>

            <MetaRow label="Project">
              <Link
                to={`/projects/${task.project.id}`}
                className="flex items-center gap-1 text-[#4F6EF7] hover:text-[#6B87FF] transition-colors text-sm"
              >
                <FolderKanban size={13} />
                {task.project.name}
              </Link>
            </MetaRow>

            <MetaRow label="Created">
              <span className="text-sm text-[#9494A8]">{formatDate(task.createdAt)}</span>
            </MetaRow>

            <MetaRow label="Due date">
              {task.dueDate ? (
                <span
                  className={cn(
                    'text-sm font-medium',
                    isDueDateOverdue(task.dueDate) ? 'text-[#EF4444]' : 'text-[#9494A8]',
                  )}
                >
                  {isDueDateOverdue(task.dueDate) && (
                    <AlertCircle size={12} className="inline mr-1" />
                  )}
                  {formatDate(task.dueDate)}
                </span>
              ) : (
                <span className="text-sm text-[#5C5C72]">None</span>
              )}
            </MetaRow>

            {/* Reassign button */}
            {isBoardOrAdmin && (
              <div className="pt-4 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setReassignOpen(true)}
                >
                  Reassign
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {editOpen && task && (
        <EditTaskModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          task={task}
          onSaved={() => refetch()}
        />
      )}

      <ReassignModal
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        taskId={task.id}
        currentAgentId={task.assignedAgent?.id}
        onReassigned={() => refetch()}
      />

      <AddRelationModal
        open={addRelationOpen}
        onClose={() => setAddRelationOpen(false)}
        currentTaskId={task.id}
        onRelationAdded={() => refetch()}
      />
    </div>
  )
}
