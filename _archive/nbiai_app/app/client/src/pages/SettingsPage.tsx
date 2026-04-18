import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Trash2,
  Info,
  FileText,
  ChevronDown,
  ChevronRight,
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
import { settings, agents, apiFetch } from '@/lib/api'
import { cn, formatDate, formatRelativeTime, getModelTierBadge } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompanySettings {
  id: string
  name: string
  tagline?: string
  logoUrl?: string
  country?: string
  contactEmail?: string
}

interface UserRow {
  id: string
  displayName: string
  email: string
  role: 'board' | 'admin' | 'viewer'
  lastLoginAt?: string | null
  status: 'active' | 'invited' | 'deactivated'
}

interface AgentLibraryRow {
  id?: string
  roleSlug: string
  roleName: string
  department: string
  modelTier: string
  reportsTo?: string | null
  assignedAgent?: { id: string; name: string } | null
}

interface KnowledgeFile {
  name: string
  path: string
  lastUpdated?: string | null
  size?: string | null
}

interface KnowledgeTier {
  tier1: KnowledgeFile[]
  tier2: Record<string, KnowledgeFile[]>
  tier3: Record<string, KnowledgeFile[]>
}

// ---------------------------------------------------------------------------
// Toast helper
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
  function show(title: string, description = '', variant: ToastState['variant'] = 'default') {
    setToast({ open: true, title, description, variant })
    setTimeout(() => setToast((t) => ({ ...t, open: false })), 4000)
  }
  return { toast, show, setToast }
}

// ---------------------------------------------------------------------------
// Shared section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
  className,
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-8', className)}>
      {title && (
        <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-4">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Info banner
// ---------------------------------------------------------------------------

function InfoBanner({ children, icon: Icon = Info, className }: { children: React.ReactNode; icon?: React.ElementType; className?: string }) {
  return (
    <div className={cn('bg-elevated border border-subtle rounded-lg px-4 py-3 mb-4 flex items-start gap-3', className)}>
      <Icon size={16} className="text-muted mt-0.5 shrink-0" />
      <p className="text-xs text-muted">{children}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 1 — Company
// ---------------------------------------------------------------------------

function CompanyTab() {
  const queryClient = useQueryClient()
  const { toast, show: showToast, setToast } = useToast()
  const { user } = useAuth()
  const isBoard = user?.role === 'board'

  const { data: res, isLoading } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: () => settings.company() as Promise<{ data: CompanySettings }>,
  })

  const company = res?.data

  const [form, setForm] = useState<Partial<CompanySettings>>({})
  const [saving, setSaving] = useState(false)
  const [logoError, setLogoError] = useState(false)

  function update(key: keyof CompanySettings, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function val(key: keyof CompanySettings): string {
    return ((form[key] ?? company?.[key]) as string | undefined) ?? ''
  }

  async function handleSave() {
    setSaving(true)
    try {
      await settings.updateCompany(form)
      queryClient.invalidateQueries({ queryKey: ['settings', 'company'] })
      showToast('Company profile updated.', '', 'success')
      setForm({})
    } catch {
      showToast('Failed to save. Please try again.', '', 'error')
    }
    setSaving(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-lg">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="h-3 w-24 rounded mb-2" />
            <Skeleton className="h-9 w-full rounded" />
          </div>
        ))}
      </div>
    )
  }

  const logoUrl = val('logoUrl')
  const showPreview = logoUrl.length > 0 && !logoError

  return (
    <ToastProvider>
      <div className="max-w-xl">
        <h3 className="text-[17px] font-semibold text-primary mb-6">Company Profile</h3>

        <div className="space-y-5">
          <div>
            <label className="block text-sm text-secondary mb-1.5">Company Name</label>
            <Input
              className="w-full max-w-[480px]"
              value={val('name')}
              onChange={(e) => update('name', e.target.value)}
              disabled={!isBoard}
            />
          </div>

          <div>
            <label className="block text-sm text-secondary mb-1.5">Tagline</label>
            <Input
              className="w-full max-w-[480px]"
              value={val('tagline')}
              onChange={(e) => update('tagline', e.target.value)}
              disabled={!isBoard}
            />
            <p className="text-xs text-muted mt-1">Shown in the app header and login screen.</p>
          </div>

          <div>
            <label className="block text-sm text-secondary mb-1.5">Logo URL</label>
            <Input
              className="w-full max-w-[480px]"
              placeholder="https://example.com/logo.png"
              value={val('logoUrl')}
              onChange={(e) => {
                update('logoUrl', e.target.value)
                setLogoError(false)
              }}
              disabled={!isBoard}
            />
            {showPreview && (
              <div className="mt-2">
                <img
                  src={logoUrl}
                  alt="Company logo preview"
                  className="w-16 h-16 rounded-lg border border-subtle object-contain bg-elevated"
                  onError={() => setLogoError(true)}
                />
                <p className="text-xs text-muted mt-1">Current logo.</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-secondary mb-1.5">Contact Email</label>
            <Input
              type="email"
              className="w-full max-w-[480px]"
              value={val('contactEmail')}
              onChange={(e) => update('contactEmail', e.target.value)}
              disabled={!isBoard}
            />
            <p className="text-xs text-muted mt-1">Used for system notifications.</p>
          </div>
        </div>

        {isBoard && (
          <Button className="mt-8" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}

        {company?.id && (
          <p className="text-xs text-muted mt-4 font-mono">Company ID: {company.id}</p>
        )}

        {/* Danger zone */}
        {isBoard && (
          <div className="mt-12 pt-8 border-t border-subtle">
            <h3 className="text-[17px] font-semibold text-status-red mb-4">Danger Zone</h3>
            <p className="text-sm text-secondary mb-4">
              These actions are irreversible. Proceed with caution.
            </p>
            <Button variant="destructive">Reset application data</Button>
          </div>
        )}
      </div>

      <Toast
        open={toast.open}
        onOpenChange={(o) => setToast((t) => ({ ...t, open: o }))}
        variant={toast.variant}
      >
        <ToastTitle>{toast.title}</ToastTitle>
        {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
      </Toast>
      <ToastViewport />
    </ToastProvider>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — Users
// ---------------------------------------------------------------------------

function InviteUserModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: { email: string; displayName: string; role: string; password: string }) => Promise<void>
}) {
  const [form, setForm] = useState({ email: '', displayName: '', role: 'viewer', password: '' })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!form.email.trim() || !form.displayName.trim()) return
    setSubmitting(true)
    await onSubmit(form)
    setSubmitting(false)
    setForm({ email: '', displayName: '', role: 'viewer', password: '' })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted mb-1">Display Name *</label>
            <Input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Email *</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Role</label>
            {/* Board role cannot be assigned via invite; it is fixed at
                first-time setup (see POST /api/v1/auth/setup) and the
                createUserSchema on the server accepts only admin/viewer. */}
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Password</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !form.email.trim() || !form.displayName.trim()}
          >
            {submitting ? 'Inviting...' : 'Invite User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UsersTab() {
  const queryClient = useQueryClient()
  const { toast, show: showToast, setToast } = useToast()
  const { user: currentUser } = useAuth()
  const isBoard = currentUser?.role === 'board'
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const { data: res, isLoading } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: () => settings.users() as Promise<{ data: UserRow[] }>,
  })

  const usersList = res?.data ?? []

  async function handleInvite(data: { email: string; displayName: string; role: string; password: string }) {
    try {
      await apiFetch('/api/v1/settings/users', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] })
      showToast('User invited.', '', 'success')
    } catch {
      showToast('Failed to invite user.', '', 'error')
    }
  }

  async function handleRoleChange(id: string, role: string) {
    try {
      await apiFetch(`/api/v1/settings/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] })
    } catch {
      showToast('Failed to update role.', '', 'error')
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id)
    try {
      await apiFetch(`/api/v1/settings/users/${id}`, { method: 'DELETE' })
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] })
      showToast('User removed.', '', 'success')
    } catch {
      showToast('Failed to remove user.', '', 'error')
    }
    setRemovingId(null)
    setConfirmRemoveId(null)
  }

  function statusBadge(status: UserRow['status']) {
    if (status === 'active') return <Badge variant="success">Active</Badge>
    if (status === 'invited') return <Badge variant="warning">Invited</Badge>
    return <Badge>Deactivated</Badge>
  }

  return (
    <ToastProvider>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[17px] font-semibold text-primary">Users</h3>
        {isBoard && (
          <Button onClick={() => setInviteOpen(true)}>
            <Plus size={14} className="mr-1.5" />
            Invite User
          </Button>
        )}
      </div>

      <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Status</TableHead>
              {isBoard && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              [0, 1, 2].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3, 4].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && usersList.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-xs text-muted">
                  You are the only user.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              usersList.map((u) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold text-primary">{u.displayName}</TableCell>
                    <TableCell className="text-xs text-secondary">{u.email}</TableCell>
                    <TableCell>
                      {isBoard && !isSelf ? (
                        <Select
                          value={u.role}
                          onValueChange={(v) => handleRoleChange(u.id, v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="board">Board</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={u.role === 'board' ? 'info' : 'default'}>
                          {u.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted">
                      {u.lastLoginAt ? formatRelativeTime(u.lastLoginAt) : '—'}
                    </TableCell>
                    <TableCell>{statusBadge(u.status)}</TableCell>
                    {isBoard && (
                      <TableCell>
                        {!isSelf && (
                          confirmRemoveId === u.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                className="text-xs text-status-red hover:underline"
                                onClick={() => handleRemove(u.id)}
                                disabled={removingId === u.id}
                              >
                                {removingId === u.id ? '...' : 'Confirm'}
                              </button>
                              <button
                                className="text-xs text-muted hover:text-secondary"
                                onClick={() => setConfirmRemoveId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted hover:text-status-red"
                              onClick={() => setConfirmRemoveId(u.id)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          )
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={handleInvite}
      />

      <Toast
        open={toast.open}
        onOpenChange={(o) => setToast((t) => ({ ...t, open: o }))}
        variant={toast.variant}
      >
        <ToastTitle>{toast.title}</ToastTitle>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  )
}

// ---------------------------------------------------------------------------
// Tab 3 — Agent Library
// ---------------------------------------------------------------------------

function AgentLibraryTab() {
  const navigate = useNavigate()

  const { data: res, isLoading } = useQuery({
    queryKey: ['agents', 'library'],
    queryFn: () => agents.list({ limit: '100' }) as Promise<{ data: AgentLibraryRow[] }>,
  })

  const agentList = res?.data ?? []

  function ModelTierBadge({ tier }: { tier: string }) {
    const { label, className } = getModelTierBadge(tier)
    return <span className={className}>{label}</span>
  }

  return (
    <div>
      <InfoBanner>
        This is a read-only reference of all 18 defined roles in the NBI agent org chart. To hire or edit an agent, go to the Org Chart.
      </InfoBanner>

      <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Model Tier</TableHead>
              <TableHead>Reports To</TableHead>
              <TableHead>Assigned Agent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              [0, 1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading &&
              agentList.map((row, i) => (
                <TableRow key={row.roleSlug ?? i}>
                  <TableCell className="font-semibold text-primary">{row.roleName}</TableCell>
                  <TableCell>
                    <ModelTierBadge tier={row.modelTier} />
                  </TableCell>
                  <TableCell className="text-xs text-secondary">{row.reportsTo ?? '—'}</TableCell>
                  <TableCell>
                    {row.assignedAgent ? (
                      <span className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent-muted flex items-center justify-center text-accent text-[10px] font-semibold shrink-0">
                          {row.assignedAgent.name
                            .split(/[\s_]+/)
                            .map((w) => w[0]?.toUpperCase() ?? '')
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <span className="text-xs text-secondary">{row.assignedAgent.name}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => navigate('/org')}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border bg-elevated border-default text-muted hover:text-secondary hover:border-strong transition-colors"
                      >
                        Vacant
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted mt-4">
        To add or modify role definitions, update the source files in the NBIAI_TEAM repository.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 4 — Knowledge Base
// ---------------------------------------------------------------------------

function KnowledgeFileRow({ file }: { file: KnowledgeFile }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-subtle last:border-0">
      <FileText size={16} className="text-muted shrink-0" />
      <span className="text-sm text-primary flex-1">{file.name}</span>
      {file.lastUpdated && (
        <span className="text-xs text-muted">{formatDate(file.lastUpdated)}</span>
      )}
      <span className="font-mono text-xs text-muted">{file.path}</span>
    </div>
  )
}

function AccordionGroup({
  title,
  files,
}: {
  title: string
  files: KnowledgeFile[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-subtle last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full py-3 text-sm font-semibold text-secondary hover:text-primary transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
      </button>
      {open && (
        <div className="pb-2 pl-4">
          {files.length === 0 ? (
            <p className="text-xs text-muted italic py-3">No files in this group.</p>
          ) : (
            files.map((f) => <KnowledgeFileRow key={f.path} file={f} />)
          )}
        </div>
      )}
    </div>
  )
}

type KBTab = 'tier1' | 'tier2' | 'tier3'

function KnowledgeBaseTab() {
  const [kbTab, setKbTab] = useState<KBTab>('tier1')

  const { data: res, isLoading } = useQuery({
    queryKey: ['settings', 'knowledge'],
    queryFn: () => settings.knowledge() as Promise<{ data: KnowledgeTier }>,
  })

  const kb = res?.data

  const kbTabs: Array<{ key: KBTab; label: string }> = [
    { key: 'tier1', label: 'Tier 1' },
    { key: 'tier2', label: 'Tier 2' },
    { key: 'tier3', label: 'Tier 3' },
  ]

  return (
    <div>
      <p className="text-xs text-muted mb-4">
        Knowledge files are read-only here. To update them, edit the source files in the repository and redeploy.
      </p>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 mb-4">
        {kbTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setKbTab(t.key)}
            className={cn(
              'px-3 py-1.5 rounded text-sm font-medium transition-colors',
              kbTab === t.key
                ? 'bg-accent-muted text-accent'
                : 'text-muted hover:text-secondary',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      )}

      {!isLoading && kbTab === 'tier1' && (
        <div>
          {(!kb?.tier1 || kb.tier1.length === 0) ? (
            <p className="text-xs text-muted italic py-6 text-center">No files in this tier.</p>
          ) : (
            kb.tier1.map((f) => <KnowledgeFileRow key={f.path} file={f} />)
          )}
        </div>
      )}

      {!isLoading && kbTab === 'tier2' && (
        <div>
          {!kb?.tier2 || Object.keys(kb.tier2).length === 0 ? (
            <p className="text-xs text-muted italic py-6 text-center">No files in this tier.</p>
          ) : (
            Object.entries(kb.tier2).map(([role, files]) => (
              <AccordionGroup key={role} title={role} files={files} />
            ))
          )}
        </div>
      )}

      {!isLoading && kbTab === 'tier3' && (
        <div>
          {!kb?.tier3 || Object.keys(kb.tier3).length === 0 ? (
            <p className="text-xs text-muted italic py-6 text-center">No files in this tier.</p>
          ) : (
            Object.entries(kb.tier3).map(([project, files]) => (
              <AccordionGroup key={project} title={project} files={files} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SettingsPage
// ---------------------------------------------------------------------------

type SettingsTab = 'company' | 'users' | 'agents' | 'knowledge'

const SETTINGS_TABS: Array<{ key: SettingsTab; label: string }> = [
  { key: 'company', label: 'Company' },
  { key: 'users', label: 'Users' },
  { key: 'agents', label: 'Agent Library' },
  { key: 'knowledge', label: 'Knowledge Base' },
]

export default function SettingsPage() {
  const { tab } = useParams<{ tab?: SettingsTab }>()
  const navigate = useNavigate()

  const activeTab: SettingsTab = tab ?? 'company'

  function setTab(t: SettingsTab) {
    navigate(`/settings/${t}`)
  }

  function renderContent() {
    switch (activeTab) {
      case 'company':
        return <CompanyTab />
      case 'users':
        return <UsersTab />
      case 'agents':
        return <AgentLibraryTab />
      case 'knowledge':
        return <KnowledgeBaseTab />
      default:
        return <CompanyTab />
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-subtle shrink-0">
        <PageHeader title="Settings" className="mb-0" />
      </div>

      {/* Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Vertical tab list — desktop */}
        <div className="hidden md:flex w-[180px] shrink-0 border-r border-subtle flex-col gap-1 pt-5 px-4 overflow-y-auto">
          {SETTINGS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'text-left px-3 py-2 rounded text-sm font-medium transition-colors',
                activeTab === t.key
                  ? 'bg-accent-muted text-accent'
                  : 'text-muted hover:text-secondary hover:bg-elevated',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Mobile horizontal tab bar */}
        <div className="md:hidden flex items-center gap-1 px-6 py-3 border-b border-subtle overflow-x-auto shrink-0">
          {SETTINGS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === t.key
                  ? 'bg-accent-muted text-accent'
                  : 'text-muted hover:text-secondary',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
