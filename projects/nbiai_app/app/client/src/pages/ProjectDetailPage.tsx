import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  Plus,
  Pencil,
  CheckSquare,
  AlertTriangle,
  Loader2,
  FolderKanban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { projects as projectsApi, tasks as tasksApi, agents as agentsApi } from '@/lib/api'
import {
  cn,
  formatDate,
  formatRelativeTime,
  getStatusColor,
} from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentRef {
  id: string
  roleName: string
  name: string | null
}

interface TaskItem {
  id: string
  title: string
  status: 'backlog' | 'assigned' | 'in_progress' | 'blocked' | 'review' | 'done' | 'cancelled' | string
  priority: 'critical' | 'high' | 'medium' | 'low' | string
  assignedAgent: AgentRef | null
  updatedAt: string
}

interface ProjectDetail {
  id: string
  name: string
  description: string
  status: string
  health: 'green' | 'amber' | 'red' | string
  leadAgent: AgentRef | null
  createdAt: string
  updatedAt: string
  tasks: TaskItem[]
}

interface AgentOption {
  id: string
  roleName: string
  name: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function projectStatusVariant(
  status: string,
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const s = status.toLowerCase()
  if (s === 'active') return 'success'
  if (s === 'on_hold' || s === 'stalled' || s === 'at_risk') return 'warning'
  if (s === 'blocked') return 'error'
  if (s === 'completed' || s === 'complete') return 'info'
  return 'default'
}

function priorityVariant(priority: string): 'error' | 'warning' | 'info' | 'default' {
  const p = priority.toLowerCase()
  if (p === 'critical') return 'error'
  if (p === 'high') return 'warning'
  if (p === 'medium') return 'info'
  return 'default'
}

function taskStatusVariant(
  status: string,
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const s = status.toLowerCase()
  if (s === 'done') return 'success'
  if (s === 'in_progress' || s === 'review') return 'warning'
  if (s === 'blocked') return 'error'
  if (s === 'assigned') return 'info'
  return 'default'
}

function healthDotColor(health: string): string {
  if (health === 'green') return 'bg-status-green'
  if (health === 'amber') return 'bg-status-amber'
  if (health === 'red') return 'bg-status-red'
  return 'bg-muted'
}

const TASK_STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
]

const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low']
const TASK_STATUS_OPTIONS = ['backlog', 'assigned', 'in_progress', 'blocked', 'review', 'done']
const PROJECT_STATUS_OPTIONS = ['active', 'on_hold', 'completed', 'cancelled']

function labelForStatus(status: string): string {
  const map: Record<string, string> = {
    active: 'Active',
    on_hold: 'On Hold',
    completed: 'Complete',
    cancelled: 'Archived',
    backlog: 'Backlog',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    blocked: 'Blocked',
    review: 'Review',
    done: 'Done',
  }
  return map[status] ?? status.replace(/_/g, ' ')
}

// ---------------------------------------------------------------------------
// New Task Modal
// ---------------------------------------------------------------------------

interface NewTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  agents: AgentOption[]
}

function NewTaskModal({ open, onOpenChange, projectId, agents }: NewTaskModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [assignedAgentId, setAssignedAgentId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [titleError, setTitleError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => tasksApi.create(data),
    onSuccess: (res: unknown) => {
      const data = (res as { data: { id: string } }).data
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      onOpenChange(false)
      navigate(`/tasks/${data.id}`)
    },
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTitleError('')

    if (!title.trim() || title.trim().length < 5) {
      setTitleError('Task title must be at least 5 characters.')
      return
    }

    mutation.mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      assignedAgentId: assignedAgentId || null,
      dueDate: dueDate || null,
    })
  }

  function handleClose() {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setAssignedAgentId('')
    setDueDate('')
    setTitleError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[520px] bg-elevated border-default">
        <DialogHeader>
          <DialogTitle className="text-primary">New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-secondary mb-1.5 block">
              Title <span className="text-status-red">*</span>
            </label>
            <input
              className="w-full bg-input border border-default text-primary placeholder:text-muted rounded-md px-3 py-2 text-sm focus:outline-none focus:border-strong focus:ring-1 focus:ring-accent"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError('') }}
              placeholder="e.g. Draft Q2 BD strategy"
            />
            {titleError && (
              <p className="text-xs text-status-red mt-1">{titleError}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-secondary mb-1.5 block">Description</label>
            <textarea
              className="w-full bg-input border border-default text-primary placeholder:text-muted rounded-md px-3 py-2 text-sm focus:outline-none focus:border-strong focus:ring-1 focus:ring-accent min-h-[80px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-secondary mb-1.5 block">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-input border-default text-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-elevated border-default">
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p} className="text-secondary capitalize">
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-secondary mb-1.5 block">Due Date</label>
              <input
                type="date"
                className="w-full bg-input border border-default text-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:border-strong focus:ring-1 focus:ring-accent"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-secondary mb-1.5 block">
              Assign to Agent
            </label>
            <Select value={assignedAgentId} onValueChange={setAssignedAgentId}>
              <SelectTrigger className="bg-input border-default text-primary">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent className="bg-elevated border-default">
                <SelectItem value="" className="text-muted">
                  Unassigned
                </SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-secondary">
                    {a.roleName}
                    {a.name ? ` (${a.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mutation.error && (
            <p className="text-xs text-status-red">Failed to create task. Please try again.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Edit Project Modal
// ---------------------------------------------------------------------------

interface EditProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectDetail
  agents: AgentOption[]
}

function EditProjectModal({ open, onOpenChange, project, agents }: EditProjectModalProps) {
  const queryClient = useQueryClient()

  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [status, setStatus] = useState(project.status)
  const [leadAgentId, setLeadAgentId] = useState(project.leadAgent?.id ?? '')

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => projectsApi.update(project.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] })
      onOpenChange(false)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate({
      name: name.trim(),
      description: description.trim(),
      status,
      leadAgentId: leadAgentId || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] bg-elevated border-default">
        <DialogHeader>
          <DialogTitle className="text-primary">Edit Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-secondary mb-1.5 block">
              Project Name <span className="text-status-red">*</span>
            </label>
            <input
              className="w-full bg-input border border-default text-primary placeholder:text-muted rounded-md px-3 py-2 text-sm focus:outline-none focus:border-strong focus:ring-1 focus:ring-accent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-secondary mb-1.5 block">Description</label>
            <textarea
              className="w-full bg-input border border-default text-primary placeholder:text-muted rounded-md px-3 py-2 text-sm focus:outline-none focus:border-strong focus:ring-1 focus:ring-accent min-h-[80px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-secondary mb-1.5 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-input border-default text-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-elevated border-default">
                  {PROJECT_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-secondary">
                      {labelForStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-secondary mb-1.5 block">Lead Agent</label>
              <Select value={leadAgentId} onValueChange={setLeadAgentId}>
                <SelectTrigger className="bg-input border-default text-primary">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="bg-elevated border-default">
                  <SelectItem value="" className="text-muted">
                    Unassigned
                  </SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-secondary">
                      {a.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mutation.error && (
            <p className="text-xs text-status-red">Failed to save changes. Please try again.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Task table
// ---------------------------------------------------------------------------

interface TaskTableProps {
  tasks: TaskItem[]
  statusFilter: string
}

function TaskTable({ tasks, statusFilter }: TaskTableProps) {
  const filtered =
    statusFilter === 'all'
      ? tasks
      : tasks.filter((t) => t.status.toLowerCase() === statusFilter)

  if (filtered.length === 0) {
    const label =
      statusFilter === 'all'
        ? 'tasks'
        : labelForStatus(statusFilter).toLowerCase() + ' tasks'

    return (
      <div className="py-10 text-center">
        <CheckSquare className="size-8 text-muted mx-auto mb-3" />
        <p className="text-sm text-muted">
          No {label}.{statusFilter === 'all' ? ' Create the first task for this project.' : ''}
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-elevated hover:bg-elevated border-subtle">
          <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2">
            Task
          </TableHead>
          <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2">
            Assigned To
          </TableHead>
          <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2">
            Priority
          </TableHead>
          <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2">
            Status
          </TableHead>
          <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2">
            Last Updated
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((task) => (
          <TableRow
            key={task.id}
            className="border-b border-subtle last:border-0 hover:bg-elevated cursor-pointer"
            onClick={() => (window.location.href = `/tasks/${task.id}`)}
          >
            <TableCell className="px-5 py-3">
              <Link
                to={`/tasks/${task.id}`}
                className="text-sm font-medium text-primary hover:text-accent transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {task.title}
              </Link>
            </TableCell>
            <TableCell className="px-5 py-3">
              {task.assignedAgent ? (
                <div className="flex items-center gap-2">
                  <Link
                    to={`/org/${task.assignedAgent.id}`}
                    className="text-xs text-accent hover:text-accent-hover"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {task.assignedAgent.roleName}
                  </Link>
                  <Badge variant="default" className="text-[10px] py-0 px-1.5">
                    {task.assignedAgent.roleName.split(' ').map((w) => w[0]).join('').slice(0, 3)}
                  </Badge>
                </div>
              ) : (
                <span className="text-xs text-muted">Unassigned</span>
              )}
            </TableCell>
            <TableCell className="px-5 py-3">
              <Badge variant={priorityVariant(task.priority)}>
                {task.priority}
              </Badge>
            </TableCell>
            <TableCell className="px-5 py-3">
              <Badge variant={taskStatusVariant(task.status)}>
                {labelForStatus(task.status)}
              </Badge>
            </TableCell>
            <TableCell className="px-5 py-3 text-xs text-muted whitespace-nowrap">
              {formatRelativeTime(task.updatedAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function fetchProjectDetail(id: string) {
  return (projectsApi.get(id) as Promise<{ data: ProjectDetail }>).then((r) => r.data)
}

function fetchAgents() {
  return (agentsApi.list() as Promise<{ data: AgentOption[] }>).then((r) => r.data)
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [editOpen, setEditOpen] = useState(false)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const isBoardOrAdmin = user?.role === 'board' || user?.role === 'admin'

  const {
    data: project,
    isLoading,
    isError,
  } = useQuery<ProjectDetail>({
    queryKey: ['project', projectId],
    queryFn: () => fetchProjectDetail(projectId!),
    enabled: !!projectId,
    staleTime: 30_000,
  })

  const { data: agents = [] } = useQuery<AgentOption[]>({
    queryKey: ['agents-list'],
    queryFn: fetchAgents,
    staleTime: 60_000,
    enabled: editOpen || newTaskOpen,
  })

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32 bg-elevated" />
        <Skeleton className="h-28 w-full bg-elevated" />
        <Skeleton className="h-10 w-full bg-elevated" />
        <Skeleton className="h-48 w-full bg-elevated" />
      </div>
    )
  }

  // ---- Error ----
  if (isError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="size-10 text-status-red" />
        <p className="text-sm text-secondary">Failed to load project.</p>
        <Button variant="outline" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    )
  }

  // ---- Derived stats ----
  const tasks = project.tasks ?? []
  const totalTasks = tasks.length
  const openTasks = tasks.filter((t) => !['done', 'cancelled'].includes(t.status)).length
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length

  const descTruncated = project.description.length > 200 && !descExpanded
  const displayedDesc = descTruncated
    ? project.description.slice(0, 200) + '…'
    : project.description

  return (
    <>
      {/* ---- Modals ---- */}
      {project && (
        <>
          <EditProjectModal
            open={editOpen}
            onOpenChange={setEditOpen}
            project={project}
            agents={agents}
          />
          <NewTaskModal
            open={newTaskOpen}
            onOpenChange={setNewTaskOpen}
            projectId={project.id}
            agents={agents}
          />
        </>
      )}

      {/* ---- Back nav ---- */}
      <button
        onClick={() => navigate('/projects')}
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-secondary mb-5 transition-colors"
      >
        <ChevronLeft className="size-4" />
        Projects
      </button>

      {/* ---- Header block ---- */}
      <div className="bg-surface border border-subtle rounded-lg p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cn(
                  'size-2.5 rounded-full shrink-0',
                  healthDotColor(project.health),
                )}
              />
              <h1 className="text-[22px] font-bold tracking-tight text-primary leading-tight truncate">
                {project.name}
              </h1>
              <Badge variant={projectStatusVariant(project.status)}>
                {labelForStatus(project.status)}
              </Badge>
            </div>

            {/* Lead agent */}
            {project.leadAgent && (
              <div className="flex items-center gap-2 mb-3">
                <div className="size-6 rounded-full bg-accent-muted text-accent flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {project.leadAgent.roleName
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <Link
                  to={`/org/${project.leadAgent.id}`}
                  className="text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  {project.leadAgent.roleName}
                </Link>
                {project.leadAgent.name && (
                  <span className="text-xs text-muted">({project.leadAgent.name})</span>
                )}
              </div>
            )}

            {/* Description */}
            <p className="text-sm text-secondary leading-relaxed">
              {displayedDesc}
              {project.description.length > 200 && (
                <button
                  className="ml-1 text-accent hover:text-accent-hover text-xs"
                  onClick={() => setDescExpanded((v) => !v)}
                >
                  {descExpanded ? 'show less' : 'show more'}
                </button>
              )}
            </p>
          </div>

          {/* Right side — dates and actions */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="flex items-center gap-2">
              {isBoardOrAdmin && (
                <>
                  <Button variant="outline" onClick={() => setEditOpen(true)}>
                    <Pencil className="size-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button onClick={() => setNewTaskOpen(true)}>
                    <Plus className="size-3.5 mr-1.5" />
                    New Task
                  </Button>
                </>
              )}
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs text-muted">Created {formatDate(project.createdAt)}</p>
              <p className="text-xs text-muted">Updated {formatRelativeTime(project.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-subtle">
          {[
            { label: 'Total Tasks', value: totalTasks },
            {
              label: 'In Progress',
              value: inProgressTasks,
              valueClass: inProgressTasks > 0 ? 'text-status-amber' : undefined,
            },
            {
              label: 'Blocked',
              value: blockedTasks,
              valueClass: blockedTasks > 0 ? 'text-status-red' : undefined,
            },
            {
              label: 'Done',
              value: doneTasks,
              valueClass: doneTasks > 0 ? 'text-status-green' : undefined,
            },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p
                className={cn(
                  'text-[22px] font-bold tracking-tight',
                  stat.valueClass ?? 'text-primary',
                )}
              >
                {stat.value}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Task board ---- */}
      <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-subtle">
          <h3 className="text-[15px] font-semibold text-primary">Tasks</h3>
          {isBoardOrAdmin && (
            <Button variant="ghost" className="h-8 text-xs gap-1.5" onClick={() => setNewTaskOpen(true)}>
              <Plus className="size-3.5" />
              Add Task
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-5 pt-3 border-b border-subtle">
            <TabsList className="bg-transparent p-0 h-auto gap-1">
              {TASK_STATUS_TABS.map((tab) => {
                const count =
                  tab.value === 'all'
                    ? tasks.length
                    : tasks.filter((t) => t.status.toLowerCase() === tab.value).length
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-xs px-3 py-1.5 rounded-t-sm border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:text-primary data-[state=active]:bg-transparent text-muted hover:text-secondary"
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className="ml-1.5 text-[10px] bg-elevated px-1.5 py-0.5 rounded-full text-muted">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {TASK_STATUS_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              <TaskTable tasks={tasks} statusFilter={tab.value} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  )
}
