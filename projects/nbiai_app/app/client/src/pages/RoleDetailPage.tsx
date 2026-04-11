import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { agents as agentsApi } from '@/lib/api'
import {
  cn,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getModelTierBadge,
  getStatusColor,
} from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentBudget {
  currentMonthSpend: number
  monthlyBudgetCap: number | null
  note?: string
}

interface TaskHistoryEntry {
  id: string
  title: string
  projectName: string | null
  completedAt: string | null
  durationSeconds: number | null
  outcome: 'done' | 'escalated' | 'blocked'
}

interface ExecutionEntry {
  id: string
  startedAt: string
  taskTitle: string | null
  status: 'completed' | 'error' | 'timed_out'
  model: string
  inputTokens: number
  outputTokens: number
  costGbp: number
  durationSeconds: number
}

interface KnowledgeFile {
  path: string
  updatedAt: string | null
}

interface AgentDetail {
  id: string
  name: string | null
  roleName: string
  roleSlug: string
  modelTier: string
  status: string
  isVacant: boolean
  reportsTo: { id: string; roleName: string } | null
  directReports: { id: string; roleName: string }[]
  currentTask: {
    id: string
    title: string
    projectName: string | null
    status: string
    priority: string
    assignedAt: string
  } | null
  stats: {
    tasksCompleted: number
    avgCompletionSeconds: number | null
    escalationsThisMonth: number
  }
  taskHistory: TaskHistoryEntry[]
  knowledgeTier1: KnowledgeFile[]
  knowledgeTier2: KnowledgeFile[]
  knowledgeTier3: KnowledgeFile[]
  systemPrompt: string | null
  personaConfig: Record<string, unknown> | null
  budget: AgentBudget
}

interface ExecutionsResponse {
  data: ExecutionEntry[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'N/A'
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatTimeElapsed(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getAgentInitials(roleName: string): string {
  return roleName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function statusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'default' | 'info' {
  const s = status.toLowerCase()
  if (s === 'active' || s === 'running' || s === 'done') return 'success'
  if (s === 'paused' || s === 'in_progress' || s === 'review' || s === 'escalated') return 'warning'
  if (s === 'blocked' || s === 'terminated' || s === 'error') return 'error'
  if (s === 'assigned') return 'info'
  return 'default'
}

function outcomeVariant(outcome: string): 'success' | 'warning' | 'error' | 'default' {
  if (outcome === 'done') return 'success'
  if (outcome === 'escalated') return 'warning'
  if (outcome === 'blocked') return 'error'
  return 'default'
}

function executionStatusVariant(status: string): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'completed') return 'success'
  if (status === 'error') return 'error'
  if (status === 'timed_out') return 'warning'
  return 'default'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  valueClassName?: string
  children?: React.ReactNode
}

function StatCard({ label, value, sub, valueClassName, children }: StatCardProps) {
  return (
    <Card className="bg-surface border-subtle">
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-2">
          {label}
        </p>
        <p className={cn('text-[22px] font-bold tracking-tight text-primary', valueClassName)}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
        {children}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Edit Agent Modal
// ---------------------------------------------------------------------------

interface EditAgentModalProps {
  agent: AgentDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

function EditAgentModal({ agent, open, onOpenChange }: EditAgentModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(agent.name ?? '')
  const [personaConfig, setPersonaConfig] = useState(
    agent.personaConfig ? JSON.stringify(agent.personaConfig, null, 2) : '',
  )
  const [configError, setConfigError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => agentsApi.update(agent.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agent.id] })
      onOpenChange(false)
    },
  })

  function handleSave() {
    setConfigError('')
    let parsedConfig: Record<string, unknown> | null = null
    if (personaConfig.trim()) {
      try {
        parsedConfig = JSON.parse(personaConfig)
      } catch {
        setConfigError('Invalid JSON — please check your syntax.')
        return
      }
    }
    mutation.mutate({ name: name.trim() || null, personaConfig: parsedConfig })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] bg-elevated border-default">
        <DialogHeader>
          <DialogTitle className="text-primary">Edit Agent — {agent.roleName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-secondary mb-1.5 block">Agent Name</label>
            <input
              className="w-full bg-input border border-default text-primary placeholder:text-muted rounded-md px-3 py-2 text-sm focus:outline-none focus:border-strong focus:ring-1 focus:ring-accent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={agent.roleName}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-secondary mb-1.5 block">
              Persona Config (JSON)
            </label>
            <textarea
              className="w-full bg-input border border-default text-primary placeholder:text-muted rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-strong focus:ring-1 focus:ring-accent min-h-[120px] resize-y"
              value={personaConfig}
              onChange={(e) => setPersonaConfig(e.target.value)}
              placeholder="{}"
            />
            {configError && <p className="text-xs text-status-red mt-1">{configError}</p>}
          </div>

          {mutation.error && (
            <p className="text-xs text-status-red">Failed to save changes. Please try again.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Terminate Confirm Dialog
// ---------------------------------------------------------------------------

interface TerminateDialogProps {
  agentId: string
  roleName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function TerminateDialog({ agentId, roleName, open, onOpenChange }: TerminateDialogProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => agentsApi.update(agentId, { status: 'terminated' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] })
      onOpenChange(false)
      navigate('/org')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] bg-elevated border-default">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <AlertTriangle className="size-4 text-status-red" />
            Terminate Agent
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-secondary">
            This will permanently stop <span className="text-primary font-medium">{roleName}</span>.
            This action is irreversible — the agent cannot be restarted once terminated.
          </p>
          <p className="text-xs text-muted">
            Any tasks currently assigned to this agent will remain in their current state.
          </p>

          {mutation.error && (
            <p className="text-xs text-status-red">Failed to terminate agent. Please try again.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Terminate Agent
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Pause Confirm Dialog
// ---------------------------------------------------------------------------

interface PauseDialogProps {
  agentId: string
  roleName: string
  isPaused: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

function PauseDialog({ agentId, roleName, isPaused, open, onOpenChange }: PauseDialogProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      agentsApi.update(agentId, { status: isPaused ? 'idle' : 'paused' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] })
      onOpenChange(false)
    },
  })

  const action = isPaused ? 'Resume' : 'Pause'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] bg-elevated border-default">
        <DialogHeader>
          <DialogTitle className="text-primary">{action} Agent</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-secondary">
            {isPaused
              ? `Resume ${roleName}? The agent will return to an active state and pick up any assigned tasks.`
              : `Pause ${roleName}? The agent will stop processing tasks until resumed.`}
          </p>

          {mutation.error && (
            <p className="text-xs text-status-red">Action failed. Please try again.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {action} Agent
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({ agent }: { agent: AgentDetail }) {
  const { stats, currentTask, budget } = agent
  const budgetPct = budget.monthlyBudgetCap
    ? Math.round((budget.currentMonthSpend / budget.monthlyBudgetCap) * 100)
    : null
  const budgetBarColor =
    budgetPct === null
      ? 'bg-accent'
      : budgetPct >= 100
      ? 'bg-status-red'
      : budgetPct >= 80
      ? 'bg-status-amber'
      : 'bg-status-green'

  return (
    <div className="space-y-6">
      {/* Current Assignment */}
      <div className="bg-surface border border-subtle rounded-lg p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-4">
          Current Assignment
        </p>

        {currentTask ? (
          <div>
            <Link
              to={`/tasks/${currentTask.id}`}
              className="text-[15px] font-semibold text-primary hover:text-accent transition-colors"
            >
              {currentTask.title}
            </Link>

            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {currentTask.projectName && (
                <span className="text-xs text-muted">{currentTask.projectName}</span>
              )}
              <Badge variant={statusBadgeVariant(currentTask.status)}>
                {currentTask.status.replace(/_/g, ' ')}
              </Badge>
              <Badge variant={statusBadgeVariant(currentTask.priority)}>
                {currentTask.priority}
              </Badge>
              <span className="text-xs text-muted">
                In progress for {formatTimeElapsed(currentTask.assignedAt)}
              </span>
            </div>

            <div className="mt-3">
              <Progress value={undefined} className="h-1" />
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-muted">No current assignment — agent is idle.</p>
          </div>
        )}
      </div>

      {/* Performance stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Tasks Completed"
          value={stats.tasksCompleted}
          sub="all time"
        />
        <StatCard
          label="Avg Completion"
          value={
            stats.avgCompletionSeconds !== null
              ? formatDuration(stats.avgCompletionSeconds)
              : 'N/A'
          }
          sub="per task (last 30 days)"
        />
        <StatCard
          label="Escalations"
          value={stats.escalationsThisMonth}
          sub="this month"
          valueClassName={stats.escalationsThisMonth > 3 ? 'text-status-amber' : undefined}
        />
        <StatCard
          label="Budget Used"
          value={`£${budget.currentMonthSpend.toFixed(2)}`}
          sub={
            budget.monthlyBudgetCap
              ? `of £${budget.monthlyBudgetCap.toFixed(2)} this month`
              : 'this month (no cap set)'
          }
        >
          {budgetPct !== null && (
            <div className="mt-2">
              <div className="w-full h-1 bg-elevated rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', budgetBarColor)}
                  style={{ width: `${Math.min(budgetPct, 100)}%` }}
                />
              </div>
            </div>
          )}
        </StatCard>
      </div>

      {/* Persona summary */}
      {agent.personaConfig && (
        <div className="bg-surface border border-subtle rounded-lg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-3">
            Persona
          </p>
          <p className="text-sm text-secondary leading-relaxed">
            {typeof agent.personaConfig === 'object' && 'summary' in agent.personaConfig
              ? String(agent.personaConfig.summary)
              : JSON.stringify(agent.personaConfig)}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Task History Tab
// ---------------------------------------------------------------------------

function TaskHistoryTab({ tasks }: { tasks: TaskHistoryEntry[] }) {
  if (tasks.length === 0) {
    return (
      <div className="bg-surface border border-subtle rounded-lg py-10 text-center">
        <p className="text-sm text-muted">No completed tasks yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-elevated border-subtle hover:bg-elevated">
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2">
              Task
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2">
              Project
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2">
              Completed
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2">
              Duration
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted px-5 py-2">
              Outcome
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.slice(0, 10).map((task) => (
            <TableRow
              key={task.id}
              className="border-b border-subtle last:border-0 hover:bg-elevated cursor-pointer px-5 py-3"
              onClick={() => (window.location.href = `/tasks/${task.id}`)}
            >
              <TableCell className="px-5 py-3">
                <Link
                  to={`/tasks/${task.id}`}
                  className="text-sm font-medium text-accent hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {task.title}
                </Link>
              </TableCell>
              <TableCell className="px-5 py-3 text-xs text-muted">
                {task.projectName ?? '—'}
              </TableCell>
              <TableCell className="px-5 py-3 text-xs text-muted">
                {task.completedAt ? formatDate(task.completedAt) : '—'}
              </TableCell>
              <TableCell className="px-5 py-3 text-xs text-muted">
                {formatDuration(task.durationSeconds)}
              </TableCell>
              <TableCell className="px-5 py-3">
                <Badge variant={outcomeVariant(task.outcome)}>
                  {task.outcome}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Knowledge Tab
// ---------------------------------------------------------------------------

interface KnowledgeSectionProps {
  label: string
  files: KnowledgeFile[]
  fallbackPaths: string[]
}

function KnowledgeSection({ label, files, fallbackPaths }: KnowledgeSectionProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-secondary mb-3">{label}</h3>
      {files.length > 0 ? (
        <ul className="space-y-0.5">
          {files.map((f) => (
            <li key={f.path} className="flex items-center gap-2 py-1.5">
              <FileText className="size-3.5 text-muted shrink-0" />
              <span className="text-sm text-secondary flex-1 font-mono text-[13px]">{f.path}</span>
              {f.updatedAt && (
                <span className="text-xs text-muted ml-auto shrink-0">
                  {formatRelativeTime(f.updatedAt)}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div>
          <ul className="space-y-0.5 mb-2">
            {fallbackPaths.map((p) => (
              <li key={p} className="flex items-center gap-2 py-1.5">
                <FileText className="size-3.5 text-muted shrink-0" />
                <span className="text-[13px] font-mono text-muted">{p}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted italic">Knowledge loaded at runtime</p>
        </div>
      )}
    </div>
  )
}

function KnowledgeTab({ agent }: { agent: AgentDetail }) {
  const slug = agent.roleSlug

  return (
    <div className="bg-surface border border-subtle rounded-lg p-5">
      <KnowledgeSection
        label="Tier 1 — Company Knowledge"
        files={agent.knowledgeTier1}
        fallbackPaths={[
          'company/knowledge/nbi_overview.md',
          'company/knowledge/clients.md',
          'company/knowledge/strategy.md',
          'company/org_chart.md',
        ]}
      />
      <div className="border-t border-subtle my-4" />
      <KnowledgeSection
        label="Tier 2 — Role Knowledge"
        files={agent.knowledgeTier2}
        fallbackPaths={[
          `roles/${slug}/persona.md`,
          `roles/${slug}/responsibilities.md`,
          `roles/${slug}/workflows.md`,
          `roles/${slug}/knowledge/`,
        ]}
      />
      <div className="border-t border-subtle my-4" />
      {agent.currentTask?.projectName ? (
        <KnowledgeSection
          label="Tier 3 — Project Knowledge"
          files={agent.knowledgeTier3}
          fallbackPaths={[
            `projects/${agent.currentTask.projectName.toLowerCase().replace(/\s+/g, '_')}/knowledge/`,
          ]}
        />
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-secondary mb-2">Tier 3 — Project Knowledge</h3>
          <p className="text-xs text-muted italic">No project assigned.</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// System Prompt Tab
// ---------------------------------------------------------------------------

function SystemPromptTab({ agent }: { agent: AgentDetail }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const promptText =
    agent.systemPrompt ??
    `System prompt loaded at runtime from roles/${agent.roleSlug}/prompts/system_prompt.md`

  function handleCopy() {
    navigator.clipboard.writeText(promptText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-surface border border-subtle rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            System Prompt
          </p>
          <Button
            variant="ghost"
            className="h-6 px-2 text-xs text-muted hover:text-secondary"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronDown className="size-3 mr-1" />
            ) : (
              <ChevronRight className="size-3 mr-1" />
            )}
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
        <Button variant="ghost" className="h-7 px-2 text-xs gap-1.5 text-muted hover:text-secondary" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="size-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3" />
              Copy
            </>
          )}
        </Button>
      </div>

      {expanded ? (
        <pre className="bg-[#0A0A0F] text-[#9494A8] font-mono text-[13px] p-4 rounded overflow-auto max-h-96 leading-relaxed whitespace-pre-wrap">
          {promptText}
        </pre>
      ) : (
        <p className="text-xs text-muted italic">
          Click Expand to view the system prompt. Character count: {promptText.length.toLocaleString()}.
        </p>
      )}

      {expanded && (
        <p className="text-xs text-muted mt-2">{promptText.length.toLocaleString()} characters</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Execution Log Tab
// ---------------------------------------------------------------------------

function ExecutionLogTab({ agentId }: { agentId: string }) {
  const { data, isLoading, isError } = useQuery<ExecutionsResponse>({
    queryKey: ['agent-executions', agentId],
    queryFn: () =>
      agentsApi.executions(agentId) as Promise<ExecutionsResponse>,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full bg-elevated" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-surface border border-subtle rounded-lg py-8 text-center">
        <p className="text-xs text-status-red">Failed to load execution log.</p>
      </div>
    )
  }

  const executions = data?.data ?? []

  if (executions.length === 0) {
    return (
      <div className="bg-surface border border-subtle rounded-lg py-8 text-center">
        <p className="text-sm text-muted">No executions yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-elevated border-subtle hover:bg-elevated">
            {['Started', 'Task', 'Status', 'Model', 'Input Tok', 'Output Tok', 'Cost (£)', 'Duration'].map(
              (h) => (
                <TableHead
                  key={h}
                  className="text-[11px] font-semibold uppercase tracking-wider text-muted px-4 py-2 whitespace-nowrap"
                >
                  {h}
                </TableHead>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {executions.map((ex) => (
            <TableRow
              key={ex.id}
              className="border-b border-subtle last:border-0 hover:bg-elevated"
            >
              <TableCell className="px-4 py-3 text-xs font-mono text-muted whitespace-nowrap">
                {formatDateTime(ex.startedAt)}
              </TableCell>
              <TableCell className="px-4 py-3 text-xs text-secondary max-w-[180px] truncate">
                {ex.taskTitle ?? '—'}
              </TableCell>
              <TableCell className="px-4 py-3">
                <Badge variant={executionStatusVariant(ex.status)}>
                  {ex.status.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3 text-xs text-muted font-mono">
                {ex.model}
              </TableCell>
              <TableCell className="px-4 py-3 text-xs font-mono text-muted">
                {ex.inputTokens.toLocaleString()}
              </TableCell>
              <TableCell className="px-4 py-3 text-xs font-mono text-muted">
                {ex.outputTokens.toLocaleString()}
              </TableCell>
              <TableCell className="px-4 py-3 text-xs font-mono text-accent">
                £{ex.costGbp.toFixed(4)}
              </TableCell>
              <TableCell className="px-4 py-3 text-xs font-mono text-muted">
                {formatDuration(ex.durationSeconds)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function fetchAgentDetail(id: string) {
  return (agentsApi.get(id) as Promise<{ data: AgentDetail }>).then((r) => r.data)
}

export default function RoleDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [editOpen, setEditOpen] = useState(false)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [terminateOpen, setTerminateOpen] = useState(false)

  const { data: agent, isLoading, isError } = useQuery<AgentDetail>({
    queryKey: ['agent', agentId],
    queryFn: () => fetchAgentDetail(agentId!),
    enabled: !!agentId,
    staleTime: 30_000,
  })

  const isBoardOrAdmin = user?.role === 'board' || user?.role === 'admin'

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-elevated" />
        <Skeleton className="h-32 w-full bg-elevated" />
        <Skeleton className="h-24 w-full bg-elevated" />
      </div>
    )
  }

  // ---- Error ----
  if (isError || !agent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="size-10 text-status-red" />
        <p className="text-sm text-secondary">Failed to load agent details.</p>
        <Button variant="outline" onClick={() => navigate('/org')}>
          Back to Org Chart
        </Button>
      </div>
    )
  }

  const isPaused = agent.status === 'paused'
  const tierBadge = getModelTierBadge(agent.modelTier)

  return (
    <>
      {/* ---- Modals ---- */}
      <EditAgentModal agent={agent} open={editOpen} onOpenChange={setEditOpen} />
      <PauseDialog
        agentId={agent.id}
        roleName={agent.roleName}
        isPaused={isPaused}
        open={pauseOpen}
        onOpenChange={setPauseOpen}
      />
      <TerminateDialog
        agentId={agent.id}
        roleName={agent.roleName}
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
      />

      {/* ---- Back nav ---- */}
      <button
        onClick={() => navigate('/org')}
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-secondary mb-5 transition-colors"
      >
        <ChevronLeft className="size-4" />
        Back to Org Chart
      </button>

      {/* ---- Header block ---- */}
      <div
        className={cn(
          'bg-surface border border-subtle rounded-lg p-6 mb-6',
          agent.isVacant && 'border-dashed',
        )}
      >
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div
            className={cn(
              'size-14 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold',
              agent.isVacant
                ? 'border-2 border-dashed border-subtle text-muted'
                : 'bg-accent-muted text-accent',
            )}
          >
            {agent.isVacant ? '+' : getAgentInitials(agent.roleName)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold tracking-tight text-primary leading-tight">
                  {agent.roleName}
                </h1>
                <p className="text-[15px] font-semibold text-secondary mt-0.5">
                  {agent.isVacant ? (
                    <span className="text-muted">Vacant</span>
                  ) : (
                    agent.name ?? agent.roleName
                  )}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {agent.isVacant ? (
                  <Button>Hire Agent</Button>
                ) : isBoardOrAdmin ? (
                  <>
                    <Button variant="outline" onClick={() => setEditOpen(true)}>
                      Edit Agent
                    </Button>
                    <Button variant="outline" onClick={() => setPauseOpen(true)}>
                      {isPaused ? 'Resume Agent' : 'Pause Agent'}
                    </Button>
                    <Button variant="destructive" onClick={() => setTerminateOpen(true)}>
                      Terminate
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className={tierBadge.className}>{tierBadge.label}</span>
              <Badge variant={statusBadgeVariant(agent.status)}>
                {agent.status}
              </Badge>
            </div>

            {/* Reporting */}
            <div className="flex items-center gap-4 mt-3 flex-wrap text-xs text-muted">
              {agent.reportsTo && (
                <span>
                  Reports to:{' '}
                  <Link
                    to={`/org/${agent.reportsTo.id}`}
                    className="text-accent hover:text-accent-hover"
                  >
                    {agent.reportsTo.roleName}
                  </Link>
                </span>
              )}
              <span>
                Direct reports:{' '}
                {agent.directReports.length > 0 ? (
                  agent.directReports.map((dr, i) => (
                    <span key={dr.id}>
                      {i > 0 && ', '}
                      <Link
                        to={`/org/${dr.id}`}
                        className="text-accent hover:text-accent-hover"
                      >
                        {dr.roleName}
                      </Link>
                    </span>
                  ))
                ) : (
                  'None'
                )}
              </span>
            </div>

            {/* Vacant notice */}
            {agent.isVacant && (
              <div className="mt-4 border border-dashed border-subtle rounded-md px-4 py-3 text-sm text-muted">
                No agent assigned to this role.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-elevated mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Task History</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="prompt">System Prompt</TabsTrigger>
          <TabsTrigger value="executions">Execution Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab agent={agent} />
        </TabsContent>

        <TabsContent value="history">
          <TaskHistoryTab tasks={agent.taskHistory} />
        </TabsContent>

        <TabsContent value="performance">
          <div className="bg-surface border border-subtle rounded-lg py-24 text-center">
            <p className="text-sm text-muted">Performance analytics coming soon.</p>
          </div>
        </TabsContent>

        <TabsContent value="knowledge">
          <KnowledgeTab agent={agent} />
        </TabsContent>

        <TabsContent value="prompt">
          <SystemPromptTab agent={agent} />
        </TabsContent>

        <TabsContent value="executions">
          <ExecutionLogTab agentId={agent.id} />
        </TabsContent>
      </Tabs>
    </>
  )
}
