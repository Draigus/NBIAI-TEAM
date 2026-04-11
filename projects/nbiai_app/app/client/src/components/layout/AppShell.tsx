import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Network,
  FolderKanban,
  ShieldCheck,
  BarChart2,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Inbox,
  Terminal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  badgeKey?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Command Centre', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Org Chart', to: '/org', icon: Network },
  { label: 'Projects', to: '/projects', icon: FolderKanban },
  { label: 'Queue', to: '/queue', icon: Inbox },
  { label: 'Sessions', to: '/sessions', icon: Terminal },
  { label: 'Finance', to: '/finance', icon: BarChart2 },
  { label: 'Leads & Clients', to: '/clients', icon: Users },
  { label: 'Approvals', to: '/approvals', icon: ShieldCheck, badgeKey: 'approvals' },
  { label: 'Settings', to: '/settings', icon: Settings },
]

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  pendingApprovals: number
}

function Sidebar({ collapsed, onToggle, pendingApprovals }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuth()

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?'

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-base border-r border-subtle',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[60px]' : 'w-[240px]',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-12 border-b border-subtle shrink-0',
          collapsed ? 'justify-center px-0' : 'px-4 gap-3',
        )}
      >
        <span className="text-accent font-bold text-lg leading-none shrink-0">NBI</span>
        {!collapsed && (
          <span className="text-primary font-semibold text-sm truncate">AI</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            item.to === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.to)
          const badge =
            item.badgeKey === 'approvals' && pendingApprovals > 0
              ? pendingApprovals
              : null

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-2',
                'text-[13px] font-medium tracking-wide',
                'transition-colors duration-100 ease-out',
                'group relative',
                isActive
                  ? 'bg-highlight text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-r before:bg-accent'
                  : 'text-muted hover:bg-elevated hover:text-secondary',
                collapsed && 'justify-center px-0',
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  'size-4 shrink-0',
                  isActive ? 'text-accent' : 'text-muted group-hover:text-secondary',
                )}
              />
              {!collapsed && (
                <span className="truncate flex-1">{item.label}</span>
              )}
              {!collapsed && badge !== null && (
                <Badge variant="error" className="ml-auto text-[10px] px-1.5 py-0">
                  {badge}
                </Badge>
              )}
              {collapsed && badge !== null && (
                <span className="absolute top-1 right-1 size-1.5 rounded-full bg-status-red" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User info */}
      <div className={cn('border-t border-subtle p-3 shrink-0')}>
        <div
          className={cn(
            'flex items-center gap-2.5',
            collapsed && 'justify-center',
          )}
        >
          {/* Avatar */}
          <div className="size-7 rounded-full bg-accent-muted flex items-center justify-center shrink-0">
            <span className="text-accent text-[11px] font-semibold">{initials}</span>
          </div>

          {!collapsed && user && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-primary truncate">
                {user.displayName}
              </p>
              <p className="text-[11px] text-muted capitalize">{user.role}</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center justify-center h-10 border-t border-subtle',
          'text-muted hover:text-secondary hover:bg-elevated',
          'transition-colors duration-100',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <PanelLeftClose className="size-4" />
        )}
      </button>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------

const COLLAPSED_KEY = 'nbiai:sidebar:collapsed'

export default function AppShell() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })

  // Placeholder — real pending count will come from react-query in ApprovalsPage
  const pendingApprovals = 0

  function handleToggle() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base">
      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        pendingApprovals={pendingApprovals}
      />
      <main className="flex-1 overflow-auto bg-base p-6">
        <Outlet />
      </main>
    </div>
  )
}
