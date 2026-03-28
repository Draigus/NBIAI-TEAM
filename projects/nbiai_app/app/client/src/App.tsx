import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy-loaded pages
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const SetupPage = lazy(() => import('@/pages/SetupPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const OrgChartPage = lazy(() => import('@/pages/OrgChartPage'))
const RoleDetailPage = lazy(() => import('@/pages/RoleDetailPage'))
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'))
const TaskDetailPage = lazy(() => import('@/pages/TaskDetailPage'))
const FinancePage = lazy(() => import('@/pages/FinancePage'))
const ClientsPage = lazy(() => import('@/pages/ClientsPage'))
const ApprovalsPage = lazy(() => import('@/pages/ApprovalsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

const AppShell = lazy(() => import('@/components/layout/AppShell'))

function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-base">
      <div className="flex flex-col gap-3 w-64">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

function ProtectedLayout() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <PageLoader />

  if (!user) return <Navigate to="/login" replace />

  return (
    <Suspense fallback={<PageLoader />}>
      <AppShell />
    </Suspense>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/*" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="org" element={<OrgChartPage />} />
          <Route path="org/:agentId" element={<RoleDetailPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="finance/:tab" element={<FinancePage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/:tab" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
