import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderKanban,
  Plus,
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
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
import { PageHeader } from '@/components/layout/PageHeader'
import { projects as projectsApi, agents as agentsApi } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectListItem {
  id: string
  name: string
  status: 'active' | 'on_hold' | 'completed' | 'cancelled' | string
  leadAgent: {
    id: string
    roleName: string
    name: string | null
  } | null
  taskSummary: {
    total: number
    inProgress: number
    blocked: number
    done: number
  }
  updatedAt: string
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
  if (s === 'on_hold' || s === 'stalled') return 'warning'
  if (s === 'completed' || s === 'complete') return 'info'
  if (s === 'cancelled') return 'default'
  return 'default'
}

function projectStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Active',
    on_hold: 'On Hold',
    stalled: 'Stalled',
    completed: 'Complete',
    cancelled: 'Archived',
  }
  return map[status.toLowerCase()] ?? status
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Complete' },
  { value: 'cancelled', label: 'Archived' },
]

// ---------------------------------------------------------------------------
// New Project Modal
// ---------------------------------------------------------------------------

interface NewProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: AgentOption[]
}

function NewProjectModal({ open, onOpenChange, agents }: NewProjectModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [leadAgentId, setLeadAgentId] = useState('')
  const [status, setStatus] = useState<'active' | 'on_hold'>('active')
  const [nameError, setNameError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => projectsApi.create(data),
    onSuccess: (res) => {
      const data = (res as { data: { id: string } }).data
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onOpenChange(false)
      navigate(`/projects/${data.id}`)
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'Failed to create project.'
      if (msg.toLowerCase().includes('name')) {
        setNameError(msg)
      }
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNameError('')

    if (!name.trim()) {
      setNameError('Project name is required.')
      return
    }

    mutation.mutate({
      name: name.trim(),
      description: description.trim(),
      leadAgentId: leadAgentId || null,
      status,
    })
  }

  function handleClose() {
    setName('')
    setDescription('')
    setLeadAgentId('')
    setStatus('active')
    setNameError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[520px] bg-elevated border-default">
        <DialogHeader>
          <DialogTitle className="text-primary">New Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-secondary mb-1.5 block">
              Project Name <span className="text-status-red">*</span>
            </label>
            <Input
              className="bg-input border-default text-primary placeholder:text-muted focus:border-strong focus:ring-1 focus:ring-accent"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError('') }}
              placeholder="e.g. NBIAI App"
            />
            {nameError && (
              <p className="text-xs text-status-red mt-1">{nameError}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-secondary mb-1.5 block">
              Description
            </label>
            <textarea
              className="w-full bg-input border border-default text-primary placeholder:text-muted rounded-md px-3 py-2 text-sm focus:outline-none focus:border-strong focus:ring-1 focus:ring-accent min-h-[80px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project for?"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-secondary mb-1.5 block">
              Lead Agent
            </label>
            <Select value={leadAgentId} onValueChange={setLeadAgentId}>
              <SelectTrigger className="bg-input border-default text-primary">
                <SelectValue placeholder="Select a lead agent (optional)" />
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

          <div>
            <label className="text-xs font-medium text-secondary mb-1.5 block">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as 'active' | 'on_hold')}>
              <SelectTrigger className="bg-input border-default text-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-elevated border-default">
                <SelectItem value="active" className="text-secondary">Active</SelectItem>
                <SelectItem value="on_hold" className="text-secondary">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mutation.error && !nameError && (
            <p className="text-xs text-status-red">Failed to create project. Please try again.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Create Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function fetchProjects() {
  return (projectsApi.list() as Promise<{ data: ProjectListItem[] }>).then((r) => r.data)
}

function fetchAgents() {
  return (agentsApi.list() as Promise<{ data: AgentOption[] }>).then((r) => r.data)
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const isBoardOrAdmin = user?.role === 'board' || user?.role === 'admin'

  const {
    data: projects = [],
    isLoading,
    isError,
  } = useQuery<ProjectListItem[]>({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 30_000,
  })

  const { data: agents = [] } = useQuery<AgentOption[]>({
    queryKey: ['agents-list'],
    queryFn: fetchAgents,
    staleTime: 60_000,
    enabled: newProjectOpen,
  })

  // Client-side filter
  const filtered = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' || p.status.toLowerCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <>
      <NewProjectModal open={newProjectOpen} onOpenChange={setNewProjectOpen} agents={agents} />

      <PageHeader
        title="Projects"
        actions={
          isBoardOrAdmin ? (
            <Button onClick={() => setNewProjectOpen(true)}>
              <Plus className="size-3.5 mr-1.5" />
              New Project
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
          <Input
            className="w-[280px] h-9 pl-8 bg-input border-default text-primary placeholder:text-muted focus:border-strong focus:ring-1 focus:ring-accent"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px] bg-input border-default text-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-elevated border-default">
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-secondary">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-4 border-b border-subtle last:border-0">
              <Skeleton className="h-4 w-64 bg-elevated" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="py-8 text-center">
          <p className="text-xs text-status-red">Failed to load projects. Refresh to try again.</p>
        </div>
      )}

      {/* Empty state — no projects at all */}
      {!isLoading && !isError && projects.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-4">
          <FolderKanban className="size-12 text-muted" />
          <h2 className="text-lg font-semibold text-secondary text-center">No projects yet.</h2>
          <p className="text-sm text-muted text-center max-w-sm">
            Create your first project to start assigning work to agents.
          </p>
          {isBoardOrAdmin && (
            <Button onClick={() => setNewProjectOpen(true)}>
              <Plus className="size-3.5 mr-1.5" />
              Create your first project
            </Button>
          )}
        </div>
      )}

      {/* Empty state — no filter results */}
      {!isLoading && !isError && projects.length > 0 && filtered.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-3">
          <FolderKanban className="size-10 text-muted" />
          <p className="text-sm text-muted">No projects match your filters.</p>
          <Button variant="outline" onClick={() => { setSearch(''); setStatusFilter('all') }}>
            Clear filters
          </Button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-elevated hover:bg-elevated border-subtle">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2 w-[35%]">
                  Project
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2 w-[12%]">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2 w-[18%]">
                  Lead Agent
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2 w-[25%]">
                  Tasks
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2 w-[10%]">
                  Last Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((project) => (
                <TableRow
                  key={project.id}
                  className="border-b border-subtle last:border-0 hover:bg-elevated cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <TableCell className="px-5 py-3.5">
                    <span className="text-sm font-medium text-primary hover:text-accent transition-colors">
                      {project.name}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3.5">
                    <Badge variant={projectStatusVariant(project.status)}>
                      {projectStatusLabel(project.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-3.5">
                    {project.leadAgent ? (
                      <Link
                        to={`/org/${project.leadAgent.id}`}
                        className="text-xs text-accent hover:text-accent-hover transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.leadAgent.roleName}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3.5">
                    <span className="text-xs text-muted">
                      {project.taskSummary.total} total
                      {project.taskSummary.inProgress > 0 && (
                        <>
                          {' · '}
                          <span className="text-status-amber">
                            {project.taskSummary.inProgress} in progress
                          </span>
                        </>
                      )}
                      {project.taskSummary.blocked > 0 && (
                        <>
                          {' · '}
                          <span className="text-status-red">
                            {project.taskSummary.blocked} blocked
                          </span>
                        </>
                      )}
                      {project.taskSummary.done > 0 && (
                        <>
                          {' · '}
                          {project.taskSummary.done} done
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-xs text-muted whitespace-nowrap">
                    {formatRelativeTime(project.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}
