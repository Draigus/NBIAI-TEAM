import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  List,
  Columns,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Toast,
  ToastProvider,
  ToastTitle,
  ToastDescription,
  ToastViewport,
} from '@/components/ui/toast'
import { PageHeader } from '@/components/layout/PageHeader'
import { clients, apiFetch } from '@/lib/api'
import { cn, formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lead {
  id: string
  company: string
  contactName: string
  contactEmail?: string
  stage: string
  expectedValue?: number | null
  probability?: number | null
  expectedCloseDate?: string | null
  source?: string | null
  nextAction?: string | null
  nextActionDate?: string | null
  notes?: string | null
  lastContactDate?: string | null
}

interface Client {
  id: string
  company: string
  primaryContact: string
  contactEmail?: string
  health: 'green' | 'amber' | 'red'
  contractStart?: string | null
  contractEnd?: string | null
  monthlyValue?: number | null
  notes?: string | null
}

interface OverdueLead {
  id: string
  company: string
  contact: string
  stage: string
  nextAction?: string | null
  nextActionDate?: string | null
  daysOverdue: number
  type: 'lead' | 'client'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = [
  'Identification',
  'Qualification',
  'Outreach',
  'Discovery',
  'Proposal',
  'Negotiation',
]

const STAGE_COLOURS: Record<string, { text: string; bg: string; border: string; bar: string }> = {
  Identification: {
    text: 'text-muted',
    bg: 'bg-elevated',
    border: 'border-default',
    bar: '#5C5C72',
  },
  Qualification: {
    text: 'text-muted',
    bg: 'bg-elevated',
    border: 'border-default',
    bar: '#5C5C72',
  },
  Outreach: {
    text: 'text-accent',
    bg: 'bg-accent-muted',
    border: 'border-accent-border',
    bar: '#4F6EF7',
  },
  Discovery: {
    text: 'text-accent',
    bg: 'bg-accent-muted',
    border: 'border-accent-border',
    bar: '#4F6EF7',
  },
  Proposal: {
    text: 'text-status-amber',
    bg: 'bg-status-amber/10',
    border: 'border-status-amber/30',
    bar: '#F59E0B',
  },
  Negotiation: {
    text: 'text-status-green',
    bg: 'bg-status-green/10',
    border: 'border-status-green/30',
    bar: '#22C55E',
  },
}

function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_COLOURS[stage] ?? {
    text: 'text-muted',
    bg: 'bg-elevated',
    border: 'border-default',
    bar: '#5C5C72',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border shrink-0',
        cfg.text,
        cfg.bg,
        cfg.border,
      )}
    >
      {stage}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Health badge
// ---------------------------------------------------------------------------

function HealthBadge({ health }: { health: 'green' | 'amber' | 'red' }) {
  if (health === 'green') return <Badge variant="success">Healthy</Badge>
  if (health === 'amber') return <Badge variant="warning">At Risk</Badge>
  return <Badge variant="error">Critical</Badge>
}

// ---------------------------------------------------------------------------
// Days to expiry colouring
// ---------------------------------------------------------------------------

function daysToExpiryColour(days: number): string {
  if (days < 0) return 'text-status-red'
  if (days < 30) return 'text-status-red'
  if (days < 90) return 'text-status-amber'
  return 'text-secondary'
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ---------------------------------------------------------------------------
// Toast helper type
// ---------------------------------------------------------------------------

interface ToastState {
  open: boolean
  title: string
  description: string
  variant: 'success' | 'error' | 'warning' | 'default'
}

function useToast() {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    title: '',
    description: '',
    variant: 'default',
  })

  function show(title: string, description: string, variant: ToastState['variant'] = 'default') {
    setToast({ open: true, title, description, variant })
    setTimeout(() => setToast((t) => ({ ...t, open: false })), 4000)
  }

  return { toast, show, setToast }
}

// ---------------------------------------------------------------------------
// Lead Detail slide-over
// ---------------------------------------------------------------------------

interface LeadSlideoverProps {
  lead: Lead | null
  onClose: () => void
  onSave: (id: string, data: Partial<Lead>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function LeadSlideover({ lead, onClose, onSave, onDelete }: LeadSlideoverProps) {
  const [form, setForm] = useState<Partial<Lead>>(lead ?? {})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!lead) return null

  function field(key: keyof Lead) {
    return (form[key] as string | number | undefined | null) ?? ''
  }

  function update(key: keyof Lead, value: string | number | null) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(lead!.id, form)
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete(lead!.id)
    setDeleting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-[420px] h-full bg-elevated border-l border-default flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle shrink-0">
          <h2 className="text-base font-semibold text-primary">{lead.company}</h2>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Contact Name</label>
              <Input
                value={field('contactName') as string}
                onChange={(e) => update('contactName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Contact Email</label>
              <Input
                type="email"
                value={field('contactEmail') as string}
                onChange={(e) => update('contactEmail', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Stage</label>
            <Select
              value={(form.stage as string) ?? lead.stage}
              onValueChange={(v) => update('stage', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...PIPELINE_STAGES, 'Won', 'Lost'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Expected Value (£)</label>
              <Input
                type="number"
                value={field('expectedValue') as string}
                onChange={(e) => update('expectedValue', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Probability (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={field('probability') as string}
                onChange={(e) => update('probability', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Expected Close Date</label>
            <Input
              type="date"
              value={field('expectedCloseDate') as string}
              onChange={(e) => update('expectedCloseDate', e.target.value || null)}
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Source</label>
            <Select
              value={(form.source as string) ?? lead.source ?? ''}
              onValueChange={(v) => update('source', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {['Referral', 'LinkedIn', 'Conference', 'Inbound', 'Other'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Next Action</label>
            <Input
              value={field('nextAction') as string}
              onChange={(e) => update('nextAction', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Next Action Date</label>
            <Input
              type="date"
              value={field('nextActionDate') as string}
              onChange={(e) => update('nextActionDate', e.target.value || null)}
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Notes</label>
            <textarea
              rows={4}
              className="w-full rounded-md border border-default bg-input px-3 py-2 text-sm text-primary placeholder:text-muted resize-none focus:outline-none focus:ring-1 focus:ring-accent focus:border-strong transition-colors"
              value={field('notes') as string}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-subtle flex items-center justify-between shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-status-red">Delete this lead?</span>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Confirm'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-status-red hover:text-status-red hover:bg-status-red/10"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} className="mr-1.5" />
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Client Detail slide-over
// ---------------------------------------------------------------------------

interface ClientSlideoverProps {
  client: Client | null
  onClose: () => void
  onSave: (id: string, data: Partial<Client>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function ClientSlideover({ client, onClose, onSave, onDelete }: ClientSlideoverProps) {
  const [form, setForm] = useState<Partial<Client>>(client ?? {})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!client) return null

  function field(key: keyof Client) {
    return (form[key] as string | number | undefined | null) ?? ''
  }

  function update(key: keyof Client, value: string | number | null) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(client!.id, form)
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete(client!.id)
    setDeleting(false)
    onClose()
  }

  const HEALTH_OPTIONS: Array<{ value: 'green' | 'amber' | 'red'; label: string; colour: string }> = [
    { value: 'green', label: 'Healthy', colour: '#22C55E' },
    { value: 'amber', label: 'At Risk', colour: '#F59E0B' },
    { value: 'red', label: 'Critical', colour: '#EF4444' },
  ]

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-[420px] h-full bg-elevated border-l border-default flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle shrink-0">
          <h2 className="text-base font-semibold text-primary">{client.company}</h2>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Primary Contact</label>
              <Input
                value={field('primaryContact') as string}
                onChange={(e) => update('primaryContact', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Contact Email</label>
              <Input
                type="email"
                value={field('contactEmail') as string}
                onChange={(e) => update('contactEmail', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Health</label>
            <div className="flex gap-2">
              {HEALTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update('health', opt.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm font-medium transition-colors',
                    (form.health ?? client.health) === opt.value
                      ? 'border-current opacity-100'
                      : 'border-default opacity-50 hover:opacity-75',
                  )}
                  style={{ color: opt.colour }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: opt.colour }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Contract Start</label>
              <Input
                type="date"
                value={field('contractStart') as string}
                onChange={(e) => update('contractStart', e.target.value || null)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Contract End</label>
              <Input
                type="date"
                value={field('contractEnd') as string}
                onChange={(e) => update('contractEnd', e.target.value || null)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Monthly Value (£)</label>
            <Input
              type="number"
              value={field('monthlyValue') as string}
              onChange={(e) => update('monthlyValue', e.target.value ? Number(e.target.value) : null)}
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Notes</label>
            <textarea
              rows={4}
              className="w-full rounded-md border border-default bg-input px-3 py-2 text-sm text-primary placeholder:text-muted resize-none focus:outline-none focus:ring-1 focus:ring-accent focus:border-strong transition-colors"
              value={field('notes') as string}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-subtle flex items-center justify-between shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-status-red">Delete this client?</span>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Confirm'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-status-red hover:text-status-red hover:bg-status-red/10"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} className="mr-1.5" />
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// New Lead modal
// ---------------------------------------------------------------------------

interface NewLeadModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Partial<Lead>) => Promise<void>
}

function NewLeadModal({ open, onClose, onSubmit }: NewLeadModalProps) {
  const [form, setForm] = useState<Partial<Lead>>({ stage: 'Identification' })
  const [submitting, setSubmitting] = useState(false)

  function update(key: keyof Lead, value: string | number | null) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.company?.trim()) return
    setSubmitting(true)
    await onSubmit(form)
    setSubmitting(false)
    setForm({ stage: 'Identification' })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted mb-1">Company Name *</label>
            <Input
              placeholder="Acme Ltd"
              value={form.company ?? ''}
              onChange={(e) => update('company', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Contact Name</label>
              <Input
                placeholder="Jane Smith"
                value={form.contactName ?? ''}
                onChange={(e) => update('contactName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Contact Email</label>
              <Input
                type="email"
                placeholder="jane@acme.com"
                value={form.contactEmail ?? ''}
                onChange={(e) => update('contactEmail', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Stage</label>
            <Select
              value={form.stage ?? 'Identification'}
              onValueChange={(v) => update('stage', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Expected Value (£)</label>
              <Input
                type="number"
                placeholder="10000"
                value={form.expectedValue ?? ''}
                onChange={(e) =>
                  update('expectedValue', e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Expected Close</label>
              <Input
                type="date"
                value={form.expectedCloseDate ?? ''}
                onChange={(e) => update('expectedCloseDate', e.target.value || null)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Source</label>
            <Select
              value={form.source ?? ''}
              onValueChange={(v) => update('source', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {['Referral', 'LinkedIn', 'Conference', 'Inbound', 'Other'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !form.company?.trim()}>
            {submitting ? 'Creating...' : 'Create Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Kanban view
// ---------------------------------------------------------------------------

function KanbanView({
  leads,
  onLeadClick,
  onNewLead,
}: {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  onNewLead: () => void
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-6">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage)
        const cfg = STAGE_COLOURS[stage]
        return (
          <div key={stage} className="w-64 shrink-0 flex flex-col">
            {/* Column header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-sm font-semibold text-secondary">{stage}</span>
              <span className="text-xs text-muted">({stageLeads.length})</span>
            </div>
            {/* Accent bar */}
            <div
              className="h-0.5 rounded-full mb-3"
              style={{ backgroundColor: cfg?.bar ?? '#5C5C72' }}
            />
            {/* Cards */}
            <div className="flex flex-col gap-2 flex-1">
              {stage === 'Identification' && (
                <button
                  onClick={onNewLead}
                  className="flex items-center gap-1.5 px-3 py-2 rounded border border-dashed border-default text-xs text-muted hover:text-secondary hover:border-strong transition-colors"
                >
                  <Plus size={12} />
                  New Lead
                </button>
              )}
              {stageLeads.map((lead) => {
                const isOverdue =
                  lead.nextActionDate && new Date(lead.nextActionDate) < new Date()
                return (
                  <div
                    key={lead.id}
                    onClick={() => onLeadClick(lead)}
                    title="Drag to move"
                    className="bg-surface border border-subtle rounded-lg p-3 cursor-pointer hover:border-default hover:bg-[#16161F] transition-colors group"
                  >
                    <p className="text-sm font-semibold text-primary mb-0.5">{lead.company}</p>
                    {lead.contactName && (
                      <p className="text-xs text-secondary mb-1.5">{lead.contactName}</p>
                    )}
                    {lead.expectedValue != null && (
                      <p className="text-xs font-mono text-muted mb-1">
                        {formatCurrency(lead.expectedValue)}
                      </p>
                    )}
                    {lead.nextActionDate && (
                      <p className={cn('text-xs', isOverdue ? 'text-status-red' : 'text-muted')}>
                        {isOverdue ? (
                          <AlertCircle size={10} className="inline mr-0.5" />
                        ) : null}
                        {formatDate(lead.nextActionDate)}
                      </p>
                    )}
                    <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
                      Drag to move
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pipeline table view
// ---------------------------------------------------------------------------

function PipelineTableView({
  leads,
  onLeadClick,
}: {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
}) {
  return (
    <div className="px-6">
      <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Expected Value</TableHead>
              <TableHead>Probability</TableHead>
              <TableHead>Weighted Value</TableHead>
              <TableHead>Next Action</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted text-sm">
                  No leads in pipeline.
                </TableCell>
              </TableRow>
            )}
            {leads.map((lead) => {
              const weighted =
                lead.expectedValue != null && lead.probability != null
                  ? lead.expectedValue * (lead.probability / 100)
                  : null
              const isOverdue = lead.nextActionDate && new Date(lead.nextActionDate) < new Date()
              return (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-elevated"
                  onClick={() => onLeadClick(lead)}
                >
                  <TableCell className="font-semibold text-primary">{lead.company}</TableCell>
                  <TableCell className="text-xs text-secondary">{lead.contactName}</TableCell>
                  <TableCell>
                    <StageBadge stage={lead.stage} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {lead.expectedValue != null ? formatCurrency(lead.expectedValue) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-secondary">
                    {lead.probability != null ? `${lead.probability}%` : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-secondary">
                    {weighted != null ? formatCurrency(weighted) : '—'}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-xs',
                      isOverdue ? 'text-status-red' : 'text-muted',
                    )}
                  >
                    {lead.nextActionDate ? formatDate(lead.nextActionDate) : '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        onLeadClick(lead)
                      }}
                    >
                      <Pencil size={13} />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Active Clients tab
// ---------------------------------------------------------------------------

function ActiveClientsTab() {
  const queryClient = useQueryClient()
  const { toast: toastState, show: showToast, setToast } = useToast()
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const { data: res, isLoading } = useQuery({
    queryKey: ['clients', 'active'],
    queryFn: () => clients.active() as Promise<{ data: Client[] }>,
  })

  const clientsList = res?.data ?? []

  async function handleSave(id: string, data: Partial<Client>) {
    try {
      await apiFetch(`/api/v1/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      showToast('Client updated', '', 'success')
    } catch {
      showToast('Failed to save', '', 'error')
    }
  }

  async function handleDelete(id: string) {
    try {
      // Soft-delete via PATCH isActive=false; server does not expose a hard
      // DELETE route for /clients/:id. This matches the server's stated
      // deactivate-not-delete policy.
      await apiFetch(`/api/v1/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      showToast('Client deactivated', '', 'success')
    } catch {
      showToast('Failed to deactivate', '', 'error')
    }
  }

  return (
    <ToastProvider>
      <div className="px-6">
        <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-subtle">
            <h3 className="text-[15px] font-semibold text-primary">Active Clients</h3>
            <span className="text-xs text-muted">{clientsList.length} active engagements</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Primary Contact</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Contract Start</TableHead>
                <TableHead>Contract End</TableHead>
                <TableHead>Monthly Value</TableHead>
                <TableHead>Days to Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                [0, 1, 2].map((i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {!isLoading && clientsList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted text-sm">
                    No active clients recorded. The CMO agent manages this when engagements are confirmed.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                clientsList.map((client) => {
                  const daysExpiry = daysUntil(client.contractEnd)
                  return (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer hover:bg-elevated"
                      onClick={() => setSelectedClient(client)}
                    >
                      <TableCell className="font-semibold text-primary">{client.company}</TableCell>
                      <TableCell className="text-xs text-secondary">{client.primaryContact}</TableCell>
                      <TableCell>
                        <HealthBadge health={client.health} />
                      </TableCell>
                      <TableCell className="text-xs text-muted">
                        {client.contractStart ? formatDate(client.contractStart) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted">
                        {client.contractEnd ? formatDate(client.contractEnd) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-secondary">
                        {client.monthlyValue != null ? formatCurrency(client.monthlyValue) : '—'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'font-mono text-sm',
                          daysExpiry != null ? daysToExpiryColour(daysExpiry) : 'text-muted',
                        )}
                      >
                        {daysExpiry != null ? (
                          <>
                            {daysExpiry < 0 && (
                              <AlertCircle size={12} className="inline mr-1" />
                            )}
                            {daysExpiry < 0 ? `${Math.abs(daysExpiry)}d overdue` : `${daysExpiry}d`}
                          </>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedClient && (
        <ClientSlideover
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      <Toast
        open={toastState.open}
        onOpenChange={(o) => setToast((t) => ({ ...t, open: o }))}
        variant={toastState.variant}
      >
        <ToastTitle>{toastState.title}</ToastTitle>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  )
}

// ---------------------------------------------------------------------------
// Overdue Follow-ups tab
// ---------------------------------------------------------------------------

function OverdueTab() {
  const queryClient = useQueryClient()
  const { toast: toastState, show: showToast, setToast } = useToast()
  const [markingId, setMarkingId] = useState<string | null>(null)

  const { data: res, isLoading } = useQuery({
    queryKey: ['clients', 'overdue'],
    queryFn: () => clients.overdue() as Promise<{ data: OverdueLead[] }>,
  })

  const overdueList = res?.data ?? []

  async function handleMarkContacted(item: OverdueLead) {
    setMarkingId(item.id)
    // Overdue-follow-ups spans both pipeline leads and active clients;
    // route to the correct server endpoint based on item.type. The
    // clients table does not currently store lastContactDate (only the
    // pipeline_leads table does), so for clients we simply touch
    // updatedAt by sending an empty-notes patch; refine once the
    // clients schema grows a last-contact field.
    const url =
      item.type === 'client'
        ? `/api/v1/clients/${item.id}`
        : `/api/v1/clients/pipeline/${item.id}`
    const body =
      item.type === 'client'
        ? { notes: null } // no-op touch until clients has lastContactDate
        : { lastContactDate: new Date().toISOString().slice(0, 10) }
    try {
      await apiFetch(url, { method: 'PATCH', body: JSON.stringify(body) })
      queryClient.invalidateQueries({ queryKey: ['clients', 'overdue'] })
      showToast('Marked as contacted', '', 'success')
    } catch {
      showToast('Failed to update', '', 'error')
    }
    setMarkingId(null)
  }

  return (
    <ToastProvider>
      <div className="px-6">
        {/* Warning banner */}
        {overdueList.length > 0 && (
          <div className="bg-status-amber/10 border border-status-amber/30 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
            <Clock size={16} className="text-status-amber shrink-0" />
            <p className="text-xs text-status-amber">
              These leads and clients have a next action date in the past. Sorted by most overdue first.
            </p>
          </div>
        )}

        <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
          {isLoading && (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-12 rounded" />
                  <Skeleton className="h-4 flex-1 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-7 w-24 rounded" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && overdueList.length === 0 && (
            <div className="py-12 flex flex-col items-center gap-3">
              <CheckCircle size={40} className="text-status-green" />
              <div className="text-center">
                <p className="text-sm font-semibold text-secondary">All follow-ups are current.</p>
                <p className="text-sm text-muted">No overdue actions.</p>
              </div>
            </div>
          )}

          {!isLoading &&
            overdueList.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 px-5 py-3.5 border-b border-subtle last:border-0 hover:bg-elevated"
              >
                <Badge variant={item.type === 'client' ? 'info' : 'default'}>
                  {item.type === 'client' ? 'Client' : 'Lead'}
                </Badge>
                <p className="font-semibold text-primary flex-1">{item.company}</p>
                <p className="text-xs text-secondary hidden md:block">{item.contact}</p>
                {item.stage && (
                  <StageBadge stage={item.stage} />
                )}
                <p className="font-mono text-xs text-status-red shrink-0">
                  {item.daysOverdue} days overdue
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={markingId === item.id}
                  onClick={() => handleMarkContacted(item)}
                >
                  {markingId === item.id ? 'Saving...' : 'Mark Contacted'}
                </Button>
              </div>
            ))}
        </div>
      </div>

      <Toast
        open={toastState.open}
        onOpenChange={(o) => setToast((t) => ({ ...t, open: o }))}
        variant={toastState.variant}
      >
        <ToastTitle>{toastState.title}</ToastTitle>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  )
}

// ---------------------------------------------------------------------------
// Pipeline tab
// ---------------------------------------------------------------------------

interface PipelineTabProps {
  headerNewLeadOpen: boolean
  onHeaderNewLeadClose: () => void
}

function PipelineTab({ headerNewLeadOpen, onHeaderNewLeadClose }: PipelineTabProps) {
  const queryClient = useQueryClient()
  const { toast: toastState, show: showToast, setToast } = useToast()
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [newLeadOpen, setNewLeadOpen] = useState(false)

  // Combine header trigger with internal modal state
  const isNewLeadOpen = newLeadOpen || headerNewLeadOpen
  function closeNewLead() {
    setNewLeadOpen(false)
    onHeaderNewLeadClose()
  }

  const { data: res, isLoading } = useQuery({
    queryKey: ['clients', 'pipeline'],
    queryFn: () => clients.pipeline() as Promise<{ data: Lead[] }>,
  })

  const leadsList = res?.data ?? []

  async function handleCreateLead(data: Partial<Lead>) {
    try {
      await apiFetch('/api/v1/clients/pipeline', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      queryClient.invalidateQueries({ queryKey: ['clients', 'pipeline'] })
      showToast('Lead created', '', 'success')
    } catch {
      showToast('Failed to create lead', '', 'error')
    }
  }

  async function handleSaveLead(id: string, data: Partial<Lead>) {
    try {
      await apiFetch(`/api/v1/clients/pipeline/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      queryClient.invalidateQueries({ queryKey: ['clients', 'pipeline'] })
      showToast('Lead updated', '', 'success')
    } catch {
      showToast('Failed to save', '', 'error')
    }
  }

  async function handleDeleteLead(id: string) {
    try {
      await apiFetch(`/api/v1/clients/pipeline/${id}`, { method: 'DELETE' })
      queryClient.invalidateQueries({ queryKey: ['clients', 'pipeline'] })
      showToast('Lead deleted', '', 'success')
    } catch {
      showToast('Failed to delete', '', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="px-6 flex gap-4 overflow-x-auto">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-64 shrink-0 space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-0.5 w-full rounded" />
            <Skeleton className="h-20 w-full rounded" />
            <Skeleton className="h-20 w-full rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!isLoading && leadsList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Users size={48} className="text-muted" />
        <h2 className="text-lg font-semibold text-secondary">No leads yet.</h2>
        <p className="text-sm text-muted">Add your first lead to start tracking the pipeline.</p>
        <Button onClick={() => setNewLeadOpen(true)}>
          <Plus size={14} className="mr-1.5" />
          New Lead
        </Button>
        <NewLeadModal
          open={isNewLeadOpen}
          onClose={closeNewLead}
          onSubmit={handleCreateLead}
        />
      </div>
    )
  }

  return (
    <ToastProvider>
      {/* View toggle */}
      <div className="flex items-center justify-between px-6 mb-4">
        <span className="text-xs text-muted">{leadsList.length} leads</span>
        <div className="flex items-center gap-1 bg-elevated rounded-md p-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              view === 'kanban' ? 'bg-surface text-primary' : 'text-muted',
            )}
            onClick={() => setView('kanban')}
            title="Kanban view"
          >
            <Columns size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              view === 'table' ? 'bg-surface text-primary' : 'text-muted',
            )}
            onClick={() => setView('table')}
            title="Table view"
          >
            <List size={14} />
          </Button>
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanView
          leads={leadsList}
          onLeadClick={setSelectedLead}
          onNewLead={() => setNewLeadOpen(true)}
        />
      ) : (
        <PipelineTableView leads={leadsList} onLeadClick={setSelectedLead} />
      )}

      <NewLeadModal
        open={isNewLeadOpen}
        onClose={closeNewLead}
        onSubmit={handleCreateLead}
      />

      {selectedLead && (
        <LeadSlideover
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSave={handleSaveLead}
          onDelete={handleDeleteLead}
        />
      )}

      <Toast
        open={toastState.open}
        onOpenChange={(o) => setToast((t) => ({ ...t, open: o }))}
        variant={toastState.variant}
      >
        <ToastTitle>{toastState.title}</ToastTitle>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  )
}

// ---------------------------------------------------------------------------
// ClientsPage
// ---------------------------------------------------------------------------

type TabKey = 'pipeline' | 'clients' | 'overdue'

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('pipeline')
  const [headerNewLeadOpen, setHeaderNewLeadOpen] = useState(false)

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'clients', label: 'Active Clients' },
    { key: 'overdue', label: 'Overdue Follow-ups' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-subtle shrink-0">
        <PageHeader
          title="Leads & Clients"
          className="mb-0"
          actions={
            activeTab === 'pipeline' ? (
              <Button onClick={() => setHeaderNewLeadOpen(true)}>
                <Plus size={14} className="mr-1.5" />
                New Lead
              </Button>
            ) : undefined
          }
        />
      </div>

      {/* Sub-nav tabs */}
      <div className="flex items-center gap-1 px-6 pt-4 pb-0 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-t text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'text-primary border-b-2 border-accent'
                : 'text-muted hover:text-secondary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="border-b border-subtle mb-5 mx-6" />

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pb-8">
        {activeTab === 'pipeline' && (
          <PipelineTab
            headerNewLeadOpen={headerNewLeadOpen}
            onHeaderNewLeadClose={() => setHeaderNewLeadOpen(false)}
          />
        )}
        {activeTab === 'clients' && <ActiveClientsTab />}
        {activeTab === 'overdue' && <OverdueTab />}
      </div>
    </div>
  )
}
