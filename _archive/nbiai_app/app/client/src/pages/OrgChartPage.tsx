import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  UserPlus,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { agents as agentsApi } from '@/lib/api'
import { getModelTierBadge, cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentRow {
  id: string
  name: string
  roleSlug: string
  roleName: string
  modelTier: string
  status: string
  currentTaskTitle?: string | null
}

// ---------------------------------------------------------------------------
// Org tree definition (hardcoded from company/org_chart.md)
// ---------------------------------------------------------------------------

interface OrgNode {
  id: string
  label?: string
  subtitle?: string
  roleSlug?: string
  children: OrgNode[]
}

const ORG_TREE: OrgNode = {
  id: 'board',
  label: 'Glen Pryer',
  subtitle: 'Managing Director / Board',
  children: [
    {
      id: 'ceo',
      roleSlug: 'ceo',
      children: [
        {
          id: 'coo',
          roleSlug: 'coo',
          children: [
            { id: 'head_of_people', roleSlug: 'head_of_people', children: [] },
            { id: 'devops', roleSlug: 'devops', children: [] },
            { id: 'producer', roleSlug: 'producer', children: [] },
          ],
        },
        { id: 'cfo', roleSlug: 'cfo', children: [] },
        {
          id: 'cto',
          roleSlug: 'cto',
          children: [
            {
              id: 'vp_engineering',
              roleSlug: 'vp_engineering',
              children: [
                { id: 'senior_engineer', roleSlug: 'senior_engineer', children: [] },
                { id: 'engineer', roleSlug: 'engineer', children: [] },
                {
                  id: 'qa_lead',
                  roleSlug: 'qa_lead',
                  children: [
                    { id: 'qa_engineer', roleSlug: 'qa_engineer', children: [] },
                  ],
                },
              ],
            },
          ],
        },
        { id: 'cmo', roleSlug: 'cmo', children: [] },
        {
          id: 'vp_product',
          roleSlug: 'vp_product',
          children: [
            { id: 'tech_writer', roleSlug: 'tech_writer', children: [] },
            {
              id: 'ui_ux_lead',
              roleSlug: 'ui_ux_lead',
              children: [
                { id: 'ui_ux_designer', roleSlug: 'ui_ux_designer', children: [] },
              ],
            },
          ],
        },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Role display names
// ---------------------------------------------------------------------------

const ROLE_NAMES: Record<string, string> = {
  ceo: 'CEO',
  coo: 'COO',
  cfo: 'CFO',
  cto: 'CTO',
  cmo: 'CMO / Head of BD',
  vp_engineering: 'VP Engineering',
  vp_product: 'VP Product',
  head_of_people: 'Head of People',
  senior_engineer: 'Senior Engineer',
  engineer: 'Engineer',
  qa_lead: 'QA Lead',
  qa_engineer: 'QA Engineer',
  devops: 'DevOps',
  producer: 'Producer',
  tech_writer: 'Tech Writer',
  ui_ux_lead: 'UI/UX Lead',
  ui_ux_designer: 'UI/UX Designer',
  data_analyst: 'Data Analyst',
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { label: string; text: string; bg: string; border: string; pulse?: boolean }
> = {
  active: { label: 'ACTIVE', text: 'text-status-green', bg: 'bg-status-green/10', border: 'border-status-green/30' },
  running: { label: 'RUNNING', text: 'text-status-green', bg: 'bg-status-green/10', border: 'border-status-green/30', pulse: true },
  idle: { label: 'IDLE', text: 'text-status-grey', bg: 'bg-status-grey/10', border: 'border-status-grey/30' },
  blocked: { label: 'BLOCKED', text: 'text-status-red', bg: 'bg-status-red/10', border: 'border-status-red/30' },
  paused: { label: 'PAUSED', text: 'text-status-amber', bg: 'bg-status-amber/10', border: 'border-status-amber/30' },
  terminated: { label: 'TERMINATED', text: 'text-status-red', bg: 'bg-status-red/10', border: 'border-status-red/30' },
}

function AgentStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle
  return (
    <span
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border shrink-0',
        config.text, config.bg, config.border,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.text.replace('text-', 'bg-'), config.pulse && 'animate-pulse')} />
      {config.label}
    </span>
  )
}

function ModelTierBadge({ tier }: { tier: string }) {
  const { label, className } = getModelTierBadge(tier)
  return <span className={className}>{label}</span>
}

// ---------------------------------------------------------------------------
// Tree layout
// ---------------------------------------------------------------------------

const NODE_W = 192 // w-48
const NODE_H = 80
const H_GAP = 24
const V_GAP = 64

function subtreeWidth(node: OrgNode): number {
  if (node.children.length === 0) return NODE_W
  const childSum = node.children.reduce(
    (sum, child, i) => sum + subtreeWidth(child) + (i < node.children.length - 1 ? H_GAP : 0),
    0,
  )
  return Math.max(NODE_W, childSum)
}

interface PositionedNode {
  node: OrgNode
  x: number
  y: number
}

function layoutTree(node: OrgNode, depth: number, left: number): PositionedNode[] {
  const sw = subtreeWidth(node)
  const cx = left + sw / 2
  const x = cx - NODE_W / 2
  const y = depth * (NODE_H + V_GAP)
  const result: PositionedNode[] = [{ node, x, y }]
  let childLeft = left
  for (const child of node.children) {
    result.push(...layoutTree(child, depth + 1, childLeft))
    childLeft += subtreeWidth(child) + H_GAP
  }
  return result
}

// ---------------------------------------------------------------------------
// SVG connector
// ---------------------------------------------------------------------------

function Connector({
  parentX, parentY, childX, childY,
}: {
  parentX: number; parentY: number; childX: number; childY: number
}) {
  const x1 = parentX + NODE_W / 2
  const y1 = parentY + NODE_H
  const x2 = childX + NODE_W / 2
  const y2 = childY
  const midY = (y1 + y2) / 2
  const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
  return <path d={d} stroke="rgba(255,255,255,0.10)" strokeWidth={1.5} fill="none" />
}

// ---------------------------------------------------------------------------
// Tree node card
// ---------------------------------------------------------------------------

interface TreeNodeCardProps {
  node: OrgNode
  agent: AgentRow | undefined
  roleName: string
  dimmed: boolean
  onHire: (roleSlug: string) => void
  onClick: (agentId: string) => void
}

function TreeNodeCard({ node, agent, roleName, dimmed, onHire, onClick }: TreeNodeCardProps) {
  const isRoot = node.id === 'board'
  const isVacant = !agent && !!node.roleSlug

  if (isRoot) {
    return (
      <div
        className={cn(
          'w-48 rounded-lg p-3 bg-elevated border-2 border-accent/50 transition-opacity',
          dimmed && 'opacity-30',
        )}
        title="Human operator — no agent detail page."
      >
        <p className="text-sm font-medium text-primary truncate">{node.label}</p>
        <p className="text-xs text-muted mt-0.5 truncate">{node.subtitle}</p>
      </div>
    )
  }

  if (isVacant) {
    return (
      <div
        className={cn(
          'w-48 rounded-lg p-3 cursor-pointer transition-all',
          'bg-surface border-2 border-dashed border-default hover:border-accent-muted',
          dimmed && 'opacity-30',
        )}
        style={{ minHeight: NODE_H }}
        onClick={() => onHire(node.roleSlug!)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onHire(node.roleSlug!) }}
        aria-label={`Hire ${roleName}`}
      >
        <p className="text-sm font-medium text-muted truncate">{roleName}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <UserPlus size={13} className="text-muted" />
          <span className="text-xs text-muted">Vacant · Hire</span>
        </div>
      </div>
    )
  }

  const isBlocked = agent?.status === 'blocked'
  const isPaused = agent?.status === 'paused'

  return (
    <div
      className={cn(
        'w-48 rounded-lg p-3 cursor-pointer transition-all',
        'bg-surface border hover:bg-elevated',
        isBlocked ? 'border-status-red/40 bg-status-red/5 hover:bg-status-red/10'
          : isPaused ? 'border-status-amber/40'
          : 'border-subtle hover:border-accent-muted',
        dimmed && 'opacity-30',
      )}
      style={{ minHeight: NODE_H }}
      onClick={() => agent && onClick(agent.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && agent) onClick(agent.id) }}
      aria-label={`${roleName} — ${agent?.name ?? 'Unknown'}`}
    >
      {/* Row 1: role title */}
      <p className="text-sm font-medium text-primary truncate">{roleName}</p>
      {/* Row 2: agent name + model tier */}
      {agent && (
        <div className="flex items-center gap-1.5 mt-1">
          <p className="text-xs text-muted truncate flex-1">{agent.name}</p>
          <ModelTierBadge tier={agent.modelTier} />
        </div>
      )}
      {/* Row 3: status + task snippet */}
      {agent && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <AgentStatusBadge status={agent.status} />
          {agent.currentTaskTitle && (
            <span className="text-[10px] text-muted truncate max-w-[100px]">
              {agent.currentTaskTitle.length > 22
                ? agent.currentTaskTitle.slice(0, 22) + '…'
                : agent.currentTaskTitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hire Agent Modal
// ---------------------------------------------------------------------------

interface HireModalProps {
  initialRoleSlug: string
  vacantRoles: Array<{ slug: string; title: string }>
  onClose: () => void
  onSuccess: () => void
}

function HireAgentModal({ initialRoleSlug, vacantRoles, onClose, onSuccess }: HireModalProps) {
  const [roleSlug, setRoleSlug] = useState(initialRoleSlug)
  const [agentName, setAgentName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roleSlug) { setError('Please select a role.'); return }
    if (!agentName.trim()) { setError('Please enter an agent name.'); return }
    setError('')
    setIsLoading(true)
    try {
      await agentsApi.create({ name: agentName.trim(), roleSlug })
      onSuccess()
      onClose()
    } catch {
      setError('Failed to create agent. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-elevated border border-default rounded-xl p-6 w-[400px] shadow-lg z-10 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-primary">Hire Agent</h2>
          <button onClick={onClose} className="text-muted hover:text-secondary transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="hire-role" className="text-xs font-medium text-secondary mb-1.5 block">
              Role <span className="text-status-red">*</span>
            </label>
            <select
              id="hire-role"
              value={roleSlug}
              onChange={(e) => setRoleSlug(e.target.value)}
              className={cn(
                'w-full h-9 rounded-md border border-default bg-input px-3',
                'text-sm text-primary focus:outline-none focus:border-strong focus:ring-1 focus:ring-accent',
              )}
            >
              <option value="">Select a role…</option>
              {vacantRoles.map((r) => (
                <option key={r.slug} value={r.slug}>{r.title}</option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="hire-name" className="text-xs font-medium text-secondary mb-1.5 block">
              Agent name <span className="text-status-red">*</span>
            </label>
            <Input
              id="hire-name"
              placeholder="e.g. Claude Sonnet 4.5"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              autoFocus
            />
          </div>

          {error && (
            <div
              className="flex items-start gap-2 rounded-md p-3 mt-4 text-sm bg-status-red/10 border border-status-red/30 text-status-red"
              role="alert"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 size={14} className="animate-spin" /> Hiring…</>
              ) : (
                'Hire agent'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile accordion
// ---------------------------------------------------------------------------

interface AccordionNodeProps {
  node: OrgNode
  agentsBySlug: Map<string, AgentRow>
  depth: number
  searchQuery: string
  statusFilter: string
  onNavigate: (id: string) => void
  onHire: (slug: string) => void
}

function AccordionNode({ node, agentsBySlug, depth, searchQuery, statusFilter, onNavigate, onHire }: AccordionNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const agent = node.roleSlug ? agentsBySlug.get(node.roleSlug) : undefined
  const roleName = node.roleSlug ? (ROLE_NAMES[node.roleSlug] ?? node.roleSlug) : (node.label ?? '')
  const hasChildren = node.children.length > 0
  const isVacant = !agent && !!node.roleSlug

  const matchesSearch = !searchQuery || roleName.toLowerCase().includes(searchQuery.toLowerCase())
  const matchesStatus =
    !statusFilter || statusFilter === 'all' ||
    (statusFilter === 'vacant' && isVacant) ||
    (!isVacant && agent?.status === statusFilter)

  if (node.id === 'board') {
    return (
      <div>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-subtle bg-elevated/50">
          <p className="text-sm font-medium text-primary">{node.label}</p>
          <p className="text-xs text-muted">{node.subtitle}</p>
        </div>
        {node.children.map((child) => (
          <AccordionNode
            key={child.id}
            node={child}
            agentsBySlug={agentsBySlug}
            depth={depth + 1}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onNavigate={onNavigate}
            onHire={onHire}
          />
        ))}
      </div>
    )
  }

  if (!matchesSearch && !matchesStatus && !hasChildren) return null

  return (
    <div style={{ paddingLeft: Math.max(0, (depth - 1) * 16) }}>
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-subtle hover:bg-elevated cursor-pointer transition-colors"
        onClick={() => {
          if (hasChildren) setExpanded((v) => !v)
          else if (agent) onNavigate(agent.id)
          else if (node.roleSlug) onHire(node.roleSlug)
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (hasChildren) setExpanded((v) => !v)
            else if (agent) onNavigate(agent.id)
            else if (node.roleSlug) onHire(node.roleSlug)
          }
        }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={14} className="text-muted shrink-0" /> : <ChevronRight size={14} className="text-muted shrink-0" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <p className="text-sm font-medium text-primary flex-1 truncate">{roleName}</p>
        {agent && <AgentStatusBadge status={agent.status} />}
        {agent && <ModelTierBadge tier={agent.modelTier} />}
        {isVacant && (
          <span className="text-xs text-muted border border-dashed border-default rounded px-1.5 py-0.5">
            Vacant
          </span>
        )}
      </div>

      {hasChildren && expanded && node.children.map((child) => (
        <AccordionNode
          key={child.id}
          node={child}
          agentsBySlug={agentsBySlug}
          depth={depth + 1}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onNavigate={onNavigate}
          onHire={onHire}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// OrgChartPage
// ---------------------------------------------------------------------------

export default function OrgChartPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hireModal, setHireModal] = useState<{ open: boolean; roleSlug: string }>({ open: false, roleSlug: '' })
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Fetch agents
  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list({ limit: '100' }) as Promise<{ data: AgentRow[] }>,
    refetchInterval: 30_000,
  })

  const agentsList: AgentRow[] = res?.data ?? []

  // Build slug→agent map
  const agentsBySlug = new Map(agentsList.map((a) => [a.roleSlug, a]))

  // Zoom / pan
  function handleZoomIn() { setZoom((z) => Math.min(150, z + 10)) }
  function handleZoomOut() { setZoom((z) => Math.max(50, z - 10)) }
  function handleReset() { setZoom(100); setPan({ x: 0, y: 0 }) }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-node]')) return
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      e.preventDefault()
    },
    [pan],
  )
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    },
    [isDragging, dragStart],
  )
  const handleMouseUp = useCallback(() => { setIsDragging(false) }, [])

  // Tree layout
  const positions = layoutTree(ORG_TREE, 0, 0)
  const posMap = new Map(positions.map((p) => [p.node.id, p]))
  const totalW = subtreeWidth(ORG_TREE) + NODE_W
  const maxY = positions.reduce((m, p) => Math.max(m, p.y), 0)
  const totalH = maxY + NODE_H + V_GAP

  // Hire modal helpers
  function openHireModal(slug: string) { setHireModal({ open: true, roleSlug: slug }) }
  function closeHireModal() { setHireModal({ open: false, roleSlug: '' }) }
  function onHireSuccess() { queryClient.invalidateQueries({ queryKey: ['agents'] }) }

  // Determine vacant roles for the hire modal dropdown
  const hiredSlugs = new Set(agentsList.map((a) => a.roleSlug))
  const vacantRoles = Object.entries(ROLE_NAMES)
    .filter(([slug]) => !hiredSlugs.has(slug))
    .map(([slug, title]) => ({ slug, title }))

  // Node filter helper for desktop tree
  function isNodeDimmed(node: OrgNode): boolean {
    const agent = node.roleSlug ? agentsBySlug.get(node.roleSlug) : undefined
    const roleName = node.roleSlug ? (ROLE_NAMES[node.roleSlug] ?? '') : (node.label ?? '')
    const isVacant = !agent && !!node.roleSlug

    const matchesSearch = !searchQuery || roleName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      !statusFilter || statusFilter === 'all' ||
      (statusFilter === 'vacant' && isVacant) ||
      (!isVacant && agent?.status === statusFilter)

    return !matchesSearch || !matchesStatus
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="sticky top-0 z-10 h-12 flex items-center justify-between px-6 bg-base border-b border-subtle shrink-0">
        <h2 className="text-lg font-semibold text-primary">Organisation</h2>
        <Button size="sm" onClick={() => openHireModal('')}>
          <UserPlus size={14} />
          Hire Agent
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-subtle bg-base shrink-0 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <Input
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-60 h-8 text-sm pl-8"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className={cn(
            'h-8 rounded-md border border-default bg-input px-3',
            'text-sm text-primary focus:outline-none focus:border-strong focus:ring-1 focus:ring-accent',
          )}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="idle">Idle</option>
          <option value="paused">Paused</option>
          <option value="blocked">Blocked</option>
          <option value="vacant">Vacant</option>
        </select>

        {/* Zoom (desktop only) */}
        {!isMobile && (
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomOut} disabled={zoom <= 50} aria-label="Zoom out">
              <ZoomOut size={16} />
            </Button>
            <span className="text-xs text-muted w-12 text-center font-mono">{zoom}%</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomIn} disabled={zoom >= 150} aria-label="Zoom in">
              <ZoomIn size={16} />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-sm ml-1" onClick={handleReset}>
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-muted" />
            <p className="text-sm text-muted">Loading org chart…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-status-red">Failed to load agents. Please refresh.</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <>
          {/* Mobile: accordion */}
          {isMobile && (
            <div className="flex-1 overflow-y-auto">
              <AccordionNode
                node={ORG_TREE}
                agentsBySlug={agentsBySlug}
                depth={0}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onNavigate={(id) => navigate(`/org/${id}`)}
                onHire={openHireModal}
              />
            </div>
          )}

          {/* Desktop: pannable/zoomable tree canvas */}
          {!isMobile && (
            <div
              className={cn('flex-1 overflow-hidden relative bg-base min-h-0', isDragging ? 'cursor-grabbing' : 'cursor-grab')}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                style={{
                  transform: `translate(${pan.x + 40}px, ${pan.y + 40}px) scale(${zoom / 100})`,
                  transformOrigin: '0 0',
                  position: 'absolute',
                  width: totalW,
                  height: totalH,
                }}
              >
                {/* Connector lines */}
                <svg
                  style={{ position: 'absolute', top: 0, left: 0, width: totalW, height: totalH, pointerEvents: 'none', overflow: 'visible' }}
                  aria-hidden="true"
                >
                  {positions.map(({ node: pn, x: px, y: py }) =>
                    pn.children.map((child) => {
                      const cp = posMap.get(child.id)
                      if (!cp) return null
                      return (
                        <Connector key={`${pn.id}-${child.id}`} parentX={px} parentY={py} childX={cp.x} childY={cp.y} />
                      )
                    }),
                  )}
                </svg>

                {/* Node cards */}
                {positions.map(({ node: pn, x, y }) => {
                  const agent = pn.roleSlug ? agentsBySlug.get(pn.roleSlug) : undefined
                  const roleName = pn.roleSlug ? (ROLE_NAMES[pn.roleSlug] ?? pn.roleSlug) : (pn.label ?? '')
                  const dimmed = pn.id !== 'board' && isNodeDimmed(pn)

                  return (
                    <div
                      key={pn.id}
                      data-node
                      style={{ position: 'absolute', left: x, top: y }}
                    >
                      <TreeNodeCard
                        node={pn}
                        agent={agent}
                        roleName={roleName}
                        dimmed={dimmed}
                        onHire={openHireModal}
                        onClick={(id) => navigate(`/org/${id}`)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Hire modal */}
      {hireModal.open && (
        <HireAgentModal
          initialRoleSlug={hireModal.roleSlug}
          vacantRoles={vacantRoles}
          onClose={closeHireModal}
          onSuccess={onHireSuccess}
        />
      )}
    </div>
  )
}
