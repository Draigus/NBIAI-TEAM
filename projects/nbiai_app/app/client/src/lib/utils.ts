import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'

// ---------------------------------------------------------------------------
// Class name helper
// ---------------------------------------------------------------------------

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'd MMM yyyy')
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'd MMM yyyy, HH:mm')
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// ---------------------------------------------------------------------------
// Status colours
// ---------------------------------------------------------------------------

type StatusColourMap = Record<string, string>

const TASK_STATUS_COLOURS: StatusColourMap = {
  backlog: 'text-status-grey',
  assigned: 'text-status-blue',
  in_progress: 'text-status-amber',
  blocked: 'text-status-red',
  review: 'text-status-blue',
  done: 'text-status-green',
}

const AGENT_STATUS_COLOURS: StatusColourMap = {
  active: 'text-status-green',
  running: 'text-status-green',
  idle: 'text-status-grey',
  paused: 'text-status-amber',
  blocked: 'text-status-red',
  vacant: 'text-status-grey',
}

const PROJECT_STATUS_COLOURS: StatusColourMap = {
  on_track: 'text-status-green',
  at_risk: 'text-status-amber',
  blocked: 'text-status-red',
  complete: 'text-status-grey',
}

export function getStatusColor(status: string): string {
  const normalised = status.toLowerCase().replace(/[\s-]/g, '_')
  return (
    TASK_STATUS_COLOURS[normalised] ??
    AGENT_STATUS_COLOURS[normalised] ??
    PROJECT_STATUS_COLOURS[normalised] ??
    'text-muted'
  )
}

// ---------------------------------------------------------------------------
// Model tier badge
// ---------------------------------------------------------------------------

export type ModelTier = 'opus' | 'sonnet' | 'haiku'

interface TierBadge {
  label: string
  className: string
}

export function getModelTierBadge(tier: ModelTier | string): TierBadge {
  switch (tier.toLowerCase()) {
    case 'opus':
      return {
        label: 'OPUS',
        className:
          'border border-accent-border text-accent bg-accent-muted px-2 py-0.5 rounded text-[11px] font-semibold',
      }
    case 'sonnet':
      return {
        label: 'SONNET',
        className:
          'border border-subtle text-muted bg-elevated px-2 py-0.5 rounded text-[11px] font-semibold',
      }
    case 'haiku':
      return {
        label: 'HAIKU',
        className:
          'border border-subtle text-muted bg-elevated px-2 py-0.5 rounded text-[11px] font-semibold',
      }
    default:
      return {
        label: tier.toUpperCase(),
        className:
          'border border-subtle text-muted bg-elevated px-2 py-0.5 rounded text-[11px] font-semibold',
      }
  }
}
