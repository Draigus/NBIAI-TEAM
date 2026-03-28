/**
 * FinancePage — /finance
 *
 * 5 tabs: Revenue | Payroll | Cash Flow | NSI Scenarios | Agent Costs
 * All financial figures rendered in font-mono. GBP throughout.
 * Agent Costs USD → GBP conversion at 1.27.
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Info,
  BarChart2,
  AlertTriangle,
  Ban,
  Loader2,
  TrendingUp,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
import { PageHeader } from '@/components/layout/PageHeader'
import { finance, settings } from '@/lib/api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RevenueItem {
  id: string
  clientName: string
  type: 'monthly' | 'one_off'
  amount: number
  startDate: string
  endDate?: string | null
  status: 'active' | 'paused' | 'ended'
  notes?: string | null
}

interface RevenueSummary {
  items: RevenueItem[]
  monthlyTotal: number
  annualTotal: number
}

interface PayrollEntry {
  id: string
  name: string
  type: 'human' | 'agent'
  roleDescription: string
  monthlyCost: number
  annualCost: number
  status: 'active' | 'inactive'
}

interface PayrollSummary {
  entries: PayrollEntry[]
  totalMonthly: number
  totalAnnual: number
  humanCount: number
  agentCount: number
}

interface FinanceSummary {
  monthlyRevenue: number
  monthlyTarget: number
  ytdRevenue: number
  ytdTarget: number
  monthlyPayroll: number
  monthlyAgentCosts: number
  monthlyOperatingCosts: number
}

interface AgentCostEntry {
  id: string
  agentName: string
  roleName: string
  modelTier: string
  budgetUsd: number
  spentUsd: number
}

interface AgentCostsSummary {
  entries: AgentCostEntry[]
  totalSpentUsd: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USD_TO_GBP = 1.27
const MONTHLY_TARGET = 50_000

// NSI scenario data (static, based on NBI Brain)
const NSI_SCENARIOS = [
  {
    id: 'current',
    name: 'Current — NSI Full',
    description: 'NSI full contract maintained. All engagement fees active.',
    monthlyRevenue: 16_650,
    nsiRevenue: 8_500,
    otherRevenue: 8_150,
    aiAgentCosts: 1_200,
    payroll: 8_000,
    isCurrent: true,
    notes: 'Baseline scenario. Reflects contracted revenue as of March 2026.',
  },
  {
    id: 'partial',
    name: 'Partial Transition',
    description: 'NSI engagement reduced by 50%. Retainer partially retained.',
    monthlyRevenue: 12_475,
    nsiRevenue: 4_325,
    otherRevenue: 8_150,
    aiAgentCosts: 1_200,
    payroll: 8_000,
    isCurrent: false,
    notes: 'Assumes 50% reduction in NSI fees. Other revenue unchanged.',
  },
  {
    id: 'full_transition',
    name: 'Full Transition',
    description: 'NSI contract ended. Remaining revenue from other clients.',
    monthlyRevenue: 8_150,
    nsiRevenue: 0,
    otherRevenue: 8_150,
    aiAgentCosts: 1_200,
    payroll: 8_000,
    isCurrent: false,
    notes: 'Worst-case scenario. Assumes full NSI withdrawal.',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usdToGbp(usd: number): number {
  return usd / USD_TO_GBP
}

function pct(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

function targetColour(percentage: number): string {
  if (percentage >= 100) return 'text-[#22C55E]'
  if (percentage >= 80) return 'text-[#22C55E]'
  if (percentage >= 60) return 'text-[#F59E0B]'
  return 'text-[#EF4444]'
}

function netColour(net: number): string {
  return net >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
}

// ---------------------------------------------------------------------------
// Common sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('bg-[#111118] border border-[#1E1E2C] rounded-lg', className)}>
      {children}
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  valueClassName?: string
}

function KpiCard({ label, value, sub, valueClassName }: KpiCardProps) {
  return (
    <SectionCard className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#5C5C72] mb-2">
        {label}
      </p>
      <p className={cn('text-[26px] font-bold tracking-tight font-mono', valueClassName ?? 'text-[#F1F1F3]')}>
        {value}
      </p>
      {sub && <p className="text-xs text-[#5C5C72] mt-0.5">{sub}</p>}
    </SectionCard>
  )
}

function StatusBadgeSmall({
  status,
}: {
  status: 'active' | 'paused' | 'ended' | 'inactive'
}) {
  const map = {
    active: {
      text: 'text-[#22C55E]',
      bg: 'bg-[#22C55E]/10',
      border: 'border-[#22C55E]/30',
      label: 'Active',
    },
    paused: {
      text: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/30',
      label: 'Paused',
    },
    ended: {
      text: 'text-[#5C5C72]',
      bg: 'bg-[#5C5C72]/10',
      border: 'border-[#5C5C72]/30',
      label: 'Ended',
    },
    inactive: {
      text: 'text-[#5C5C72]',
      bg: 'bg-[#5C5C72]/10',
      border: 'border-[#5C5C72]/30',
      label: 'Inactive',
    },
  }
  const cfg = map[status] ?? map.inactive
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
        cfg.text,
        cfg.bg,
        cfg.border,
      )}
    >
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Add Revenue Modal
// ---------------------------------------------------------------------------

function AddRevenueModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const [clientName, setClientName] = useState('')
  const [type, setType] = useState<'monthly' | 'one_off'>('monthly')
  const [amount, setAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      finance.revenueSummary(), // placeholder — real API would POST /api/finance/revenue
    onSuccess: () => {
      onAdded()
      onClose()
    },
  })

  function handleClose() {
    setClientName('')
    setType('monthly')
    setAmount('')
    setStartDate('')
    setEndDate('')
    setNotes('')
    onClose()
  }

  const canSubmit = clientName.trim() && amount && startDate && !mutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Revenue Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
              Client name
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-[#16161F] border border-[#2A2A3C] text-sm text-[#F1F1F3] placeholder:text-[#5C5C72] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
                Type
              </label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="one_off">One-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
                Amount (£)
              </label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 px-3 rounded-md bg-[#16161F] border border-[#2A2A3C] text-sm text-[#F1F1F3] placeholder:text-[#5C5C72] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/40 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-[#16161F] border border-[#2A2A3C] text-sm text-[#F1F1F3] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/40"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-[#16161F] border border-[#2A2A3C] text-sm text-[#F1F1F3] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/40"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C72] mb-1.5 block">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[#16161F] border border-[#2A2A3C] text-sm text-[#F1F1F3] placeholder:text-[#5C5C72] focus:outline-none focus:border-[#4F6EF7]/60 focus:ring-1 focus:ring-[#4F6EF7]/40 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 size={12} className="animate-spin mr-1.5" />}
            Add Revenue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Tab 1: Revenue
// ---------------------------------------------------------------------------

function RevenueTab({ isBoardOrAdmin }: { isBoardOrAdmin: boolean }) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'monthly' | 'one_off'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: revenueRes, isLoading: revenueLoading } = useQuery({
    queryKey: ['financeRevenue'],
    queryFn: () => finance.revenueSummary() as Promise<{ data: RevenueSummary }>,
  })

  const { data: summaryRes, isLoading: summaryLoading } = useQuery({
    queryKey: ['financeSummary'],
    queryFn: () => finance.summary() as Promise<{ data: FinanceSummary }>,
  })

  const revenue = revenueRes?.data
  const summary = summaryRes?.data

  const monthlyTotal = revenue?.monthlyTotal ?? 0
  const annualTotal = revenue?.annualTotal ?? 0
  const ytdRevenue = summary?.ytdRevenue ?? 0
  const ytdTarget = summary?.ytdTarget ?? (MONTHLY_TARGET * 3) // rough ytd target
  const monthlyPct = pct(monthlyTotal, MONTHLY_TARGET)
  const ytdPct = pct(ytdRevenue, ytdTarget)

  const filteredItems = (revenue?.items ?? []).filter((item) =>
    typeFilter === 'all' ? true : item.type === typeFilter,
  )

  const isLoading = revenueLoading || summaryLoading

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SectionCard key={i} className="p-5">
              <Skeleton className="h-3 w-20 rounded mb-3" />
              <Skeleton className="h-8 w-28 rounded" />
            </SectionCard>
          ))
        ) : (
          <>
            <KpiCard
              label="Monthly contracted"
              value={formatCurrency(monthlyTotal)}
              sub="current month"
            />
            <KpiCard
              label="Annual run rate"
              value={formatCurrency(annualTotal)}
              sub="ARR"
            />
            <KpiCard
              label="Monthly target"
              value={formatCurrency(MONTHLY_TARGET)}
              sub="Glen's revenue target"
            />
            <KpiCard
              label="vs target (YTD)"
              value={`${ytdPct}%`}
              sub="year to date"
              valueClassName={targetColour(ytdPct)}
            />
          </>
        )}
      </div>

      {/* Progress bars */}
      <SectionCard className="p-5">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#9494A8]">
                Monthly contracted vs target
              </span>
              <span className="text-xs text-[#5C5C72] font-mono">
                {formatCurrency(monthlyTotal)} / {formatCurrency(MONTHLY_TARGET)}
              </span>
            </div>
            <Progress value={monthlyPct} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#9494A8]">
                YTD contracted vs target
              </span>
              <span className="text-xs text-[#5C5C72] font-mono">
                {formatCurrency(ytdRevenue)} / {formatCurrency(ytdTarget)}
              </span>
            </div>
            <Progress value={ytdPct} className="h-2" />
          </div>
        </div>
      </SectionCard>

      {/* Revenue table */}
      <SectionCard className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E1E2C]">
          <h3 className="text-[15px] font-semibold text-[#F1F1F3]">Revenue Items</h3>
          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
            >
              <SelectTrigger className="h-8 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="one_off">One-off</SelectItem>
              </SelectContent>
            </Select>
            {isBoardOrAdmin && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus size={13} className="mr-1" />
                Add Revenue
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center">
            <BarChart2 size={40} className="text-[#5C5C72] mx-auto mb-3" />
            <p className="text-sm text-[#5C5C72]">
              No revenue items recorded. The CFO agent will populate this when contracts are active.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E2C]">
                  {['Client', 'Type', 'Amount', 'Start Date', 'End Date', 'Status'].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#5C5C72]"
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#1E1E2C] last:border-0 hover:bg-[#1C1C27] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[#F1F1F3]">{item.clientName}</td>
                    <td className="px-4 py-3">
                      {item.type === 'monthly' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#4F6EF7]/10 border border-[#4F6EF7]/30 text-[#4F6EF7]">
                          Monthly
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1C1C27] border border-[#2A2A3C] text-[#5C5C72]">
                          One-off
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-[#F1F1F3] text-right">
                      {formatCurrency(item.amount)}
                      {item.type === 'monthly' && (
                        <span className="text-[#5C5C72] font-normal">/mo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#5C5C72]">{formatDate(item.startDate)}</td>
                    <td className="px-4 py-3">
                      {item.endDate ? (
                        <span className="text-[#5C5C72]">{formatDate(item.endDate)}</span>
                      ) : (
                        <span className="text-[#22C55E]">Ongoing</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadgeSmall status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#1C1C27] border-t border-[#1E1E2C]">
                  <td colSpan={2} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#5C5C72]">
                    Total monthly contracted
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-[#F1F1F3] text-right">
                    {formatCurrency(monthlyTotal)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>

      <AddRevenueModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ['financeRevenue'] })}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 2: Payroll
// ---------------------------------------------------------------------------

function PayrollTab({ isBoardOrAdmin }: { isBoardOrAdmin: boolean }) {
  const { data: res, isLoading } = useQuery({
    queryKey: ['financePayroll'],
    queryFn: () => finance.payrollSummary() as Promise<{ data: PayrollSummary }>,
  })

  const payroll = res?.data
  const entries = payroll?.entries ?? []

  return (
    <div className="space-y-6">
      {/* Info note */}
      <div className="bg-[#1C1C27] border border-[#1E1E2C] rounded-lg px-4 py-3 flex items-start gap-3">
        <Info size={15} className="text-[#5C5C72] mt-0.5 shrink-0" />
        <p className="text-xs text-[#5C5C72]">
          Payroll data is maintained by the CFO agent and Glen. Changes to real staff must be approved by Glen.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SectionCard key={i} className="p-5">
              <Skeleton className="h-3 w-20 rounded mb-3" />
              <Skeleton className="h-8 w-24 rounded" />
            </SectionCard>
          ))
        ) : (
          <>
            <KpiCard
              label="Total monthly"
              value={formatCurrency(payroll?.totalMonthly ?? 0)}
              sub="payroll costs"
            />
            <KpiCard
              label="Total annual"
              value={formatCurrency(payroll?.totalAnnual ?? 0)}
              sub="annualised"
            />
            <KpiCard
              label="Human staff"
              value={String(payroll?.humanCount ?? 0)}
              sub="employees"
            />
            <KpiCard
              label="AI agents"
              value={String(payroll?.agentCount ?? 0)}
              sub="agent headcount"
            />
          </>
        )}
      </div>

      {/* Payroll table */}
      <SectionCard className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E1E2C]">
          <h3 className="text-[15px] font-semibold text-[#F1F1F3]">Payroll Entries</h3>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#5C5C72]">No payroll entries recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E2C]">
                  {['Name', 'Type', 'Role / Description', 'Monthly', 'Annual', 'Status', isBoardOrAdmin ? 'Actions' : ''].filter(Boolean).map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#5C5C72]"
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-[#1E1E2C] last:border-0 hover:bg-[#1C1C27] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[#F1F1F3]">{entry.name}</td>
                    <td className="px-4 py-3">
                      {entry.type === 'human' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1C1C27] border border-[#2A2A3C] text-[#5C5C72]">
                          Human
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#4F6EF7]/10 border border-[#4F6EF7]/20 text-[#4F6EF7]">
                          Agent
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#9494A8] text-xs">{entry.roleDescription}</td>
                    <td className="px-4 py-3 font-mono font-medium text-[#F1F1F3] text-right">
                      {formatCurrency(entry.monthlyCost)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#5C5C72] text-xs text-right">
                      {formatCurrency(entry.annualCost)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadgeSmall status={entry.status} />
                    </td>
                    {isBoardOrAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#2A2A3C] text-[#5C5C72] hover:text-[#F1F1F3] transition-colors"
                            title="Toggle active"
                          >
                            <span className="text-[11px]">⏻</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#1C1C27] border-t border-[#1E1E2C]">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#5C5C72]">
                    Total monthly payroll
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-[#F1F1F3] text-right">
                    {formatCurrency(payroll?.totalMonthly ?? 0)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#5C5C72] text-right">
                    {formatCurrency(payroll?.totalAnnual ?? 0)}
                  </td>
                  {isBoardOrAdmin ? <td colSpan={2} /> : <td colSpan={1} />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 3: Cash Flow
// ---------------------------------------------------------------------------

function CashFlowTab() {
  const { data: res, isLoading } = useQuery({
    queryKey: ['financeSummary'],
    queryFn: () => finance.summary() as Promise<{ data: FinanceSummary }>,
  })

  const summary = res?.data

  // Build 3-month projection from summary data
  const now = new Date()
  const months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return {
      label: d.toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
      shortLabel: d.toLocaleString('en-GB', { month: 'short' }),
      isFuture: i > 0,
      revenue: summary?.monthlyRevenue ?? 0,
      payroll: summary?.monthlyPayroll ?? 0,
      agentCosts: summary?.monthlyAgentCosts ?? 0,
      operatingCosts: summary?.monthlyOperatingCosts ?? 0,
    }
  })

  const monthsWithNet = months.map((m) => ({
    ...m,
    totalIncome: m.revenue,
    totalCosts: m.payroll + m.agentCosts + m.operatingCosts,
    net: m.revenue - (m.payroll + m.agentCosts + m.operatingCosts),
  }))

  const maxAbsNet = Math.max(...monthsWithNet.map((m) => Math.abs(m.net)), 1)
  const currentNet = monthsWithNet[0]?.net ?? 0

  return (
    <div className="space-y-6">
      {/* 3-month table */}
      <SectionCard className="overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1E1E2C]">
          <h3 className="text-[15px] font-semibold text-[#F1F1F3]">Cash Flow Projection</h3>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E2C]">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#5C5C72] w-40">
                    Category
                  </th>
                  {monthsWithNet.map((m) => (
                    <th
                      key={m.label}
                      className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[#5C5C72]"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {m.label}
                        {m.isFuture && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#4F6EF7]/10 border border-[#4F6EF7]/20 text-[#4F6EF7]">
                            Projected
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Income rows */}
                <tr className="border-b border-[#1E1E2C]">
                  <td className="px-5 py-2.5 font-semibold text-[#F1F1F3]">Contracted Revenue</td>
                  {monthsWithNet.map((m, i) => (
                    <td key={i} className="px-4 py-2.5 font-mono text-[#9494A8] text-right">
                      {formatCurrency(m.revenue)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[#1E1E2C]">
                  <td className="px-5 py-2.5 font-semibold text-[#F1F1F3] border-t border-[#1E1E2C]">
                    Total Income
                  </td>
                  {monthsWithNet.map((m, i) => (
                    <td key={i} className="px-4 py-2.5 font-mono font-semibold text-[#F1F1F3] text-right border-t border-[#1E1E2C]">
                      {formatCurrency(m.totalIncome)}
                    </td>
                  ))}
                </tr>

                {/* Spacer */}
                <tr className="h-2" />

                {/* Cost rows */}
                <tr className="border-b border-[#1E1E2C]">
                  <td className="px-5 py-2.5 text-[#9494A8]">Staff Payroll</td>
                  {monthsWithNet.map((m, i) => (
                    <td key={i} className="px-4 py-2.5 font-mono text-[#9494A8] text-right">
                      {formatCurrency(m.payroll)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[#1E1E2C]">
                  <td className="px-5 py-2.5 text-[#9494A8]">Agent Costs</td>
                  {monthsWithNet.map((m, i) => (
                    <td key={i} className="px-4 py-2.5 font-mono text-[#9494A8] text-right">
                      {formatCurrency(m.agentCosts)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[#1E1E2C]">
                  <td className="px-5 py-2.5 text-[#9494A8]">Operating Costs</td>
                  {monthsWithNet.map((m, i) => (
                    <td key={i} className="px-4 py-2.5 font-mono text-[#9494A8] text-right">
                      {formatCurrency(m.operatingCosts)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[#1E1E2C]">
                  <td className="px-5 py-2.5 font-semibold text-[#F1F1F3] border-t border-[#1E1E2C]">
                    Total Costs
                  </td>
                  {monthsWithNet.map((m, i) => (
                    <td key={i} className="px-4 py-2.5 font-mono font-semibold text-[#F1F1F3] text-right border-t border-[#1E1E2C]">
                      {formatCurrency(m.totalCosts)}
                    </td>
                  ))}
                </tr>

                {/* Spacer */}
                <tr className="h-2" />

                {/* Net row */}
                <tr>
                  <td className="px-5 py-3 font-bold text-[#F1F1F3]">Net Position</td>
                  {monthsWithNet.map((m, i) => (
                    <td
                      key={i}
                      className={cn(
                        'px-4 py-3 font-mono font-bold text-right',
                        netColour(m.net),
                      )}
                    >
                      {m.net >= 0 ? '+' : ''}
                      {formatCurrency(m.net)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Bar chart */}
      <SectionCard className="p-5">
        <h3 className="text-[15px] font-semibold text-[#F1F1F3] mb-4">Monthly Net Position</h3>

        {isLoading ? (
          <div className="flex items-end gap-6 h-[140px]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <Skeleton className="w-full rounded-t" style={{ height: `${60 + i * 20}px` }} />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            ))}
          </div>
        ) : !summary ? (
          <div className="py-10 text-center">
            <p className="text-sm text-[#5C5C72]">
              Insufficient data for projection. Ensure revenue and payroll data are entered.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-6 h-[140px] mb-1">
              {monthsWithNet.map((m, i) => {
                const barHeight = Math.max(
                  8,
                  Math.round((Math.abs(m.net) / maxAbsNet) * 120),
                )
                const isPositive = m.net >= 0
                return (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1">
                    <div className="flex-1 flex items-end w-full">
                      <div
                        className={cn(
                          'w-full rounded-t transition-all duration-500',
                          isPositive ? 'bg-[#22C55E]' : 'bg-[#EF4444]',
                        )}
                        style={{ height: `${barHeight}px` }}
                      />
                    </div>
                    <span className="text-xs text-[#5C5C72]">{m.shortLabel}</span>
                    <span className={cn('text-xs font-mono', netColour(m.net))}>
                      {m.net >= 0 ? '+' : ''}
                      {formatCurrency(m.net)}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-[#1E1E2C] w-full" />
          </>
        )}
      </SectionCard>

      {/* Current net summary */}
      {!isLoading && summary && (
        <div className="text-center py-4">
          <p className="text-sm text-[#5C5C72] mb-1">Current monthly net</p>
          <p className={cn('text-[32px] font-bold font-mono tracking-tight', netColour(currentNet))}>
            {currentNet >= 0 ? '+' : ''}
            {formatCurrency(currentNet)}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 4: NSI Scenarios
// ---------------------------------------------------------------------------

function NSIScenariosTab() {
  const COMPARISON_ROWS = [
    {
      label: 'Monthly Revenue',
      key: 'monthlyRevenue' as const,
    },
    {
      label: 'AI Agent Costs',
      key: 'aiAgentCosts' as const,
    },
    {
      label: 'Payroll',
      key: 'payroll' as const,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header note */}
      <div className="bg-[#1C1C27] border border-[#1E1E2C] rounded-lg px-4 py-3">
        <p className="text-xs text-[#5C5C72]">
          These scenarios model the revenue impact of NBI's NSI engagement at different transition stages.
          Data is maintained by the CFO agent. Values are indicative — refer to NBI Brain for full context.
        </p>
      </div>

      {/* Three scenario cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {NSI_SCENARIOS.map((scenario) => {
          const net = scenario.monthlyRevenue - scenario.aiAgentCosts - scenario.payroll
          return (
            <div
              key={scenario.id}
              className={cn(
                'rounded-lg p-5 border relative',
                scenario.isCurrent
                  ? 'border-[#4F6EF7]/50 bg-[#4F6EF7]/5'
                  : 'border-[#1E1E2C] bg-[#111118]',
              )}
            >
              {scenario.isCurrent && (
                <span className="absolute top-4 right-4 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#4F6EF7]/15 border border-[#4F6EF7]/30 text-[#4F6EF7]">
                  CURRENT
                </span>
              )}

              <h3 className="text-[15px] font-semibold text-[#F1F1F3] mb-1 pr-16">
                {scenario.name}
              </h3>
              <p className="text-xs text-[#5C5C72] mb-5">{scenario.description}</p>

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5C5C72] mb-0.5">
                    Monthly Revenue
                  </p>
                  <p className="text-[24px] font-bold font-mono text-[#F1F1F3]">
                    {formatCurrency(scenario.monthlyRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5C5C72] mb-0.5">
                    Total Costs
                  </p>
                  <p className="text-sm font-semibold font-mono text-[#9494A8]">
                    {formatCurrency(scenario.aiAgentCosts + scenario.payroll)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5C5C72] mb-0.5">
                    Net Position
                  </p>
                  <p className={cn('text-[18px] font-bold font-mono', netColour(net))}>
                    {net >= 0 ? '+' : ''}
                    {formatCurrency(net)}
                  </p>
                </div>
              </div>

              {scenario.notes && (
                <p className="text-[11px] text-[#5C5C72] mt-4 leading-relaxed">{scenario.notes}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Comparison table */}
      <SectionCard className="overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1E1E2C]">
          <h3 className="text-[15px] font-semibold text-[#F1F1F3]">Scenario Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E1E2C]">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#5C5C72] w-36">
                  Metric
                </th>
                {NSI_SCENARIOS.map((s) => (
                  <th
                    key={s.id}
                    className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[#5C5C72]"
                  >
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-[#1E1E2C] last:border-0">
                  <td className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#5C5C72]">
                    {row.label}
                  </td>
                  {NSI_SCENARIOS.map((s) => (
                    <td key={s.id} className="px-4 py-2.5 font-mono text-[#9494A8] text-right">
                      {formatCurrency(s[row.key])}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Net row */}
              <tr className="bg-[#1C1C27] border-t border-[#1E1E2C]">
                <td className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#5C5C72]">
                  Net
                </td>
                {NSI_SCENARIOS.map((s) => {
                  const net = s.monthlyRevenue - s.aiAgentCosts - s.payroll
                  return (
                    <td
                      key={s.id}
                      className={cn('px-4 py-2.5 font-mono font-semibold text-right', netColour(net))}
                    >
                      {net >= 0 ? '+' : ''}
                      {formatCurrency(net)}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 5: Agent Costs
// ---------------------------------------------------------------------------

function AgentCostsTab({ isBoardOrAdmin }: { isBoardOrAdmin: boolean }) {
  const queryClient = useQueryClient()
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null)
  const [editingBudgetValue, setEditingBudgetValue] = useState('')

  const { data: res, isLoading } = useQuery({
    queryKey: ['financeAgentCosts'],
    queryFn: () => finance.agentCosts() as Promise<{ data: AgentCostsSummary }>,
  })

  const costData = res?.data
  const entries = costData?.entries ?? []
  const totalSpentGbp = usdToGbp(costData?.totalSpentUsd ?? 0)

  const saveBudgetMutation = useMutation({
    mutationFn: ({ id, budget }: { id: string; budget: number }) =>
      settings.budgets(), // placeholder — real API would PATCH /api/settings/budgets/:id
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeAgentCosts'] })
      setEditingBudgetId(null)
    },
  })

  function startEditBudget(entry: AgentCostEntry) {
    setEditingBudgetId(entry.id)
    setEditingBudgetValue(String(usdToGbp(entry.budgetUsd).toFixed(2)))
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <SectionCard className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#5C5C72] mb-2">
          Total AI spend this month
        </p>
        <p className="text-[32px] font-bold font-mono text-[#F1F1F3]">
          {formatCurrency(totalSpentGbp)}
        </p>
        <p className="text-xs text-[#5C5C72] mt-0.5">
          USD converted to GBP at 1.27. Actual exchange rate may vary.
        </p>
      </SectionCard>

      {/* Agent costs table */}
      <SectionCard className="overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1E1E2C]">
          <h3 className="text-[15px] font-semibold text-[#F1F1F3]">Agent Budget Usage</h3>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center">
            <TrendingUp size={40} className="text-[#5C5C72] mx-auto mb-3" />
            <p className="text-sm text-[#5C5C72]">No agent cost data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E2C]">
                  {['Agent', 'Role', 'Model Tier', 'Budget (£)', 'Spent (£)', '% Used', 'Alert'].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#5C5C72]"
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const budgetGbp = usdToGbp(entry.budgetUsd)
                  const spentGbp = usdToGbp(entry.spentUsd)
                  const usedPct = pct(entry.spentUsd, entry.budgetUsd)
                  const isOver100 = usedPct >= 100
                  const isOver80 = usedPct >= 80

                  const isEditing = editingBudgetId === entry.id

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-[#1E1E2C] last:border-0 hover:bg-[#1C1C27] transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-[#F1F1F3]">{entry.agentName}</td>
                      <td className="px-4 py-3 text-xs text-[#9494A8]">{entry.roleName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold uppercase',
                            entry.modelTier.toLowerCase() === 'opus'
                              ? 'bg-[#4F6EF7]/10 border-[#4F6EF7]/30 text-[#4F6EF7]'
                              : 'bg-[#1C1C27] border-[#2A2A3C] text-[#5C5C72]',
                          )}
                        >
                          {entry.modelTier}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#F1F1F3]">
                        {isBoardOrAdmin ? (
                          isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[#5C5C72]">£</span>
                              <input
                                type="number"
                                value={editingBudgetValue}
                                onChange={(e) => setEditingBudgetValue(e.target.value)}
                                className="w-24 h-7 px-2 rounded bg-[#0A0A0F] border border-[#4F6EF7]/50 text-sm text-[#F1F1F3] font-mono focus:outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveBudgetMutation.mutate({
                                      id: entry.id,
                                      budget: parseFloat(editingBudgetValue) * USD_TO_GBP,
                                    })
                                  }
                                  if (e.key === 'Escape') setEditingBudgetId(null)
                                }}
                              />
                              <button
                                className="text-xs text-[#4F6EF7] hover:text-[#6B87FF]"
                                onClick={() =>
                                  saveBudgetMutation.mutate({
                                    id: entry.id,
                                    budget: parseFloat(editingBudgetValue) * USD_TO_GBP,
                                  })
                                }
                              >
                                Save
                              </button>
                              <button
                                className="text-xs text-[#5C5C72] hover:text-[#9494A8]"
                                onClick={() => setEditingBudgetId(null)}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              className="hover:text-[#4F6EF7] transition-colors cursor-pointer underline decoration-dotted decoration-[#5C5C72]"
                              onClick={() => startEditBudget(entry)}
                              title="Click to edit budget"
                            >
                              {formatCurrency(budgetGbp)}
                            </button>
                          )
                        ) : (
                          formatCurrency(budgetGbp)
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#F1F1F3]">
                        {formatCurrency(spentGbp)}
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'text-xs font-mono font-medium',
                                isOver100
                                  ? 'text-[#EF4444]'
                                  : isOver80
                                  ? 'text-[#F59E0B]'
                                  : 'text-[#22C55E]',
                              )}
                            >
                              {usedPct}%
                            </span>
                          </div>
                          <Progress value={usedPct} className="h-1.5 w-full" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isOver100 ? (
                          <Ban
                            size={15}
                            className="text-[#EF4444]"
                            title="Budget exceeded"
                          />
                        ) : isOver80 ? (
                          <AlertTriangle
                            size={15}
                            className="text-[#F59E0B]"
                            title="Approaching budget limit"
                          />
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FinancePage
// ---------------------------------------------------------------------------

const VALID_TABS = ['revenue', 'payroll', 'cashflow', 'nsi', 'agent-costs'] as const
type TabId = (typeof VALID_TABS)[number]

export default function FinancePage() {
  const { tab: tabParam } = useParams<{ tab?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isBoardOrAdmin =
    user &&
    ((user as { role?: string }).role === 'board' ||
      (user as { role?: string }).role === 'admin')

  const activeTab: TabId =
    VALID_TABS.includes(tabParam as TabId) ? (tabParam as TabId) : 'revenue'

  function handleTabChange(value: string) {
    navigate(`/finance/${value}`, { replace: true })
  }

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="Finance"
        subtitle="Financial overview and projections"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6 -mx-0">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="nsi">NSI Scenarios</TabsTrigger>
          <TabsTrigger value="agent-costs">Agent Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <RevenueTab isBoardOrAdmin={!!isBoardOrAdmin} />
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollTab isBoardOrAdmin={!!isBoardOrAdmin} />
        </TabsContent>

        <TabsContent value="cashflow">
          <CashFlowTab />
        </TabsContent>

        <TabsContent value="nsi">
          <NSIScenariosTab />
        </TabsContent>

        <TabsContent value="agent-costs">
          <AgentCostsTab isBoardOrAdmin={!!isBoardOrAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
